// Mollie donation-create edge function.
// Creates a Mollie payment and returns the checkout URL.
// Required Supabase secrets: MOLLIE_API_KEY, SITE_URL
//
// Deploy: supabase functions deploy donation-create --no-verify-jwt

// @ts-ignore - deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore - deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// @ts-ignore - deno globals
declare const Deno: { env: { get(key: string): string | undefined } };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateBody {
  amount?: string;
  name?: string | null;
  message?: string | null;
  captchaToken?: string | null;
}

// Cloudflare Turnstile verify (security audit M-4 captcha). Skipped silently
// when no TURNSTILE_SECRET is configured so the function still works pre-
// signup; once the secret is set, every request must carry a valid token.
async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) return true;
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token, remoteip: ip });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) return false;
  const json = await res.json();
  return json?.success === true;
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const mollieKey = Deno.env.get('MOLLIE_API_KEY');
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://schriftinzicht.nl';
  if (!mollieKey) return json({ error: 'mollie_not_configured' }, 500);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Per-IP rate limit (security audit M-4): no captcha vendor wired up yet,
  // so this is the only thing standing between us and a bot flooding the
  // Mollie API and filling the donations table. Tight by design — a real
  // user only triggers donation-create once or twice per page visit.
  const ip = clientIp(req);
  const { data: allowed, error: rateError } = await supabase.rpc('check_rate_limit', {
    p_key: `donation-create:${ip}`,
    p_limit: 5,
    p_window_seconds: 60,
  });
  if (rateError) {
    console.error('check_rate_limit failed (allowing to avoid lock-out):', rateError);
  } else if (allowed === false) {
    return json({ error: 'rate_limited', retryAfter: 60 }, 429);
  }

  let body: CreateBody;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  // Verify Turnstile token before doing any further work / hitting Mollie.
  if (!(await verifyTurnstile(body.captchaToken, ip))) {
    return json({ error: 'captcha_failed' }, 403);
  }

  const amountNum = parseFloat(String(body.amount ?? '').replace(',', '.'));
  if (!Number.isFinite(amountNum) || amountNum < 1 || amountNum > 5000) {
    return json({ error: 'invalid_amount' }, 400);
  }
  const amount = amountNum.toFixed(2);

  const donorName = (body.name ?? '').toString().slice(0, 80) || null;
  const donorMessage = (body.message ?? '').toString().slice(0, 500) || null;

  const webhookUrl = `${supabaseUrl}/functions/v1/donation-webhook`;
  const redirectUrl = `${siteUrl}/doneren/bedankt`;

  const mollieRes = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mollieKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: amount },
      description: 'Donatie SchriftInzicht',
      redirectUrl,
      webhookUrl,
      metadata: { type: 'donation' },
    }),
  });

  if (!mollieRes.ok) {
    const text = await mollieRes.text();
    console.error('Mollie API error:', mollieRes.status, text);
    return json({ error: 'mollie_error', status: mollieRes.status }, 502);
  }

  const payment = await mollieRes.json();
  const checkoutUrl: string | undefined = payment?._links?.checkout?.href;
  const paymentId: string | undefined = payment?.id;
  if (!checkoutUrl || !paymentId) {
    return json({ error: 'mollie_invalid_response' }, 502);
  }

  const { error: insertError } = await supabase.from('donations').insert({
    mollie_id: paymentId,
    amount: amountNum,
    currency: 'EUR',
    status: payment.status ?? 'open',
    donor_name: donorName,
    donor_message: donorMessage,
  });
  if (insertError) {
    // Hard fail: zonder DB-record kan de webhook geen status bijwerken en is de donatie onzichtbaar.
    // Beter de gebruiker op opnieuw-proberen dan een betaling die we nooit zien.
    console.error('Donations insert error:', insertError);
    return json({ error: 'db_insert_failed' }, 500);
  }

  return json({ checkoutUrl, paymentId });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
