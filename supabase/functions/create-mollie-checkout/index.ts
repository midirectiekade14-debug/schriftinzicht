// SchriftInzicht — Mollie Checkout Edge Function
// POST /functions/v1/create-mollie-checkout
// Body: { userId: string }
// Returns: { checkoutUrl: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://schriftinzicht.nl";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Ongeldige sessie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a Mollie customer ID
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("mollie_customer_id, premium_until")
      .eq("id", user.id)
      .single();

    // Already premium?
    if (profile?.premium_until && new Date(profile.premium_until) > new Date()) {
      return new Response(JSON.stringify({ error: "Je hebt al een actief abonnement" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mollieCustomerId = profile?.mollie_customer_id;

    // Create Mollie customer if needed
    if (!mollieCustomerId) {
      const customerRes = await fetch("https://api.mollie.com/v2/customers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MOLLIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.email,
          email: user.email,
          metadata: { supabase_user_id: user.id },
        }),
      });

      if (!customerRes.ok) {
        const err = await customerRes.text();
        console.error("Mollie customer creation failed:", err);
        return new Response(JSON.stringify({ error: "Kon klant niet aanmaken" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer = await customerRes.json();
      mollieCustomerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("user_profiles")
        .upsert({ id: user.id, mollie_customer_id: mollieCustomerId }, { onConflict: "id" });
    }

    // Create first payment (creates mandate for subscription)
    const paymentRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: "4.99" },
        description: "SchriftInzicht Premium — eerste maand",
        redirectUrl: `${APP_URL}/payment/success`,
        webhookUrl: `${SUPABASE_URL}/functions/v1/mollie-webhook`,
        customerId: mollieCustomerId,
        sequenceType: "first",
        metadata: {
          supabase_user_id: user.id,
          type: "subscription_first_payment",
        },
      }),
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.text();
      console.error("Mollie payment creation failed:", err);
      return new Response(JSON.stringify({ error: "Kon betaling niet starten" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await paymentRes.json();
    const checkoutUrl = payment._links.checkout.href;

    return new Response(JSON.stringify({ checkoutUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Interne fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
