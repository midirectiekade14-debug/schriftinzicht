// Mollie donation-status edge function.
// Returns the current Mollie payment status (used on /doneren/bedankt).
//
// Deploy: supabase functions deploy donation-status --no-verify-jwt

// @ts-ignore - deno
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// @ts-ignore - deno globals
declare const Deno: { env: { get(key: string): string | undefined } };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const mollieKey = Deno.env.get('MOLLIE_API_KEY');
  if (!mollieKey) return json({ error: 'not_configured' }, 500);

  let paymentId: string | undefined;
  try {
    const body = await req.json();
    paymentId = body?.paymentId;
  } catch { return json({ error: 'invalid_json' }, 400); }

  if (!paymentId || typeof paymentId !== 'string' || !/^tr_[a-zA-Z0-9]+$/.test(paymentId)) {
    return json({ error: 'invalid_payment_id' }, 400);
  }

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
