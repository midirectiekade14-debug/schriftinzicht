// Mollie donation-webhook edge function.
// Mollie pings this URL when payment status changes.
// Required Supabase secrets: MOLLIE_API_KEY
//
// Deploy: supabase functions deploy donation-webhook --no-verify-jwt
//
// Authentication model (security audit M-3):
//   Mollie does NOT sign webhooks and explicitly recommends AGAINST
//   whitelisting their IP addresses, since they change. The canonical
//   mitigation is what we already do:
//     1. Validate the body has a tr_-formatted id
//     2. Confirm the id maps to a row we created (DB gate)
//     3. Re-fetch the actual status from api.mollie.com using our key
//        (the body itself is never trusted for state)
//     4. Per-IP rate limit on this function so flooding tr_-IDs cannot
//        burn Mollie API quota.
//   See docs.mollie.com/payments/status-changes — "do not whitelist".

// @ts-ignore - deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-ignore - deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// @ts-ignore - deno globals
declare const Deno: { env: { get(key: string): string | undefined } };

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  const mollieKey = Deno.env.get('MOLLIE_API_KEY');
  if (!mollieKey) return new Response('not_configured', { status: 500 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Per-IP rate limit (security audit M-3 partial / M-4): Mollie webhooks
  // arrive in bursts but never thousands per minute from a single source.
  // 60/min/IP gives plenty of headroom for legitimate Mollie infra and shuts
  // down random-tr_-flooding (which would burn quota via the per-id Mollie
  // GET below) immediately.
  const ip = clientIp(req);
  const { data: allowed, error: rateError } = await supabase.rpc('check_rate_limit', {
    p_key: `donation-webhook:${ip}`,
    p_limit: 60,
    p_window_seconds: 60,
  });
  if (rateError) {
    console.error('check_rate_limit failed (allowing to avoid lock-out):', rateError);
  } else if (allowed === false) {
    return new Response('rate_limited', { status: 429, headers: { 'Retry-After': '60' } });
  }

  let paymentId: string | null = null;
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    paymentId = String(form.get('id') ?? '') || null;
  } else if (ct.includes('application/json')) {
    try {
      const body = await req.json();
      paymentId = body?.id ?? null;
    } catch { /* ignore */ }
  }
  if (!paymentId || !/^tr_[a-zA-Z0-9]+$/.test(paymentId)) return new Response('invalid_id', { status: 400 });

  // Gate: alleen processen voor donaties die we zelf hebben aangemaakt — voorkomt mass-fetch DoS
  // door random tr_-IDs naar onze webhook te sturen.
  const { data: row } = await supabase.from('donations').select('mollie_id').eq('mollie_id', paymentId).maybeSingle();
  if (!row) return new Response('not_found', { status: 404 });

  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${mollieKey}` },
  });
  if (!mollieRes.ok) {
    console.error('Mollie GET error:', mollieRes.status);
    return new Response('mollie_error', { status: 502 });
  }
  const payment = await mollieRes.json();

  const update: Record<string, unknown> = { status: payment.status };
  if (payment.status === 'paid' && payment.paidAt) {
    update.paid_at = payment.paidAt;
  }

  const { error } = await supabase
    .from('donations')
    .update(update)
    .eq('mollie_id', paymentId);

  if (error) {
    console.error('Donations update error:', error);
    return new Response('db_error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
