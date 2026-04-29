// Mollie donation-status edge function.
// Returns the current Mollie payment status (used on /doneren/bedankt).
// DB-gated: only returns status for payments we initiated ourselves
// (prevents enumeration of other Mollie merchants' payments).

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
  if (!mollieKey) return json({ error: 'not_configured' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Per-IP rate limit (security audit M-4): donation-status hits Mollie's API
  // so an enumeration on tr_* IDs would burn quota. 30/min/IP is generous for
  // the bedankt-page polling (one user refreshing 5x is well within budget).
  const ip = clientIp(req);
  const { data: allowed, error: rateError } = await supabase.rpc('check_rate_limit', {
    p_key: `donation-status:${ip}`,
    p_limit: 30,
    p_window_seconds: 60,
  });
  if (rateError) {
    console.error('check_rate_limit failed (allowing to avoid lock-out):', rateError);
  } else if (allowed === false) {
    return json({ error: 'rate_limited', retryAfter: 60 }, 429);
  }

  let paymentId: string | undefined;
  try {
    const body = await req.json();
    paymentId = body?.paymentId;
  } catch { return json({ error: 'invalid_json' }, 400); }

  if (!paymentId || typeof paymentId !== 'string' || !/^tr_[a-zA-Z0-9]+$/.test(paymentId)) {
    return json({ error: 'invalid_payment_id' }, 400);
  }

  // Gate 1: alleen status teruggeven voor donaties die we zelf hebben aangemaakt.
  const { data: row } = await supabase.from('donations').select('mollie_id').eq('mollie_id', paymentId).maybeSingle();
  if (!row) return json({ error: 'not_found' }, 404);

  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${mollieKey}` },
  });
  if (!mollieRes.ok) return json({ error: 'mollie_error' }, 502);

  const payment = await mollieRes.json();
  return json({
    status: payment.status,
    amount: payment.amount?.value,
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
