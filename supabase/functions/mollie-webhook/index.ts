// SchriftInzicht — Mollie Webhook Edge Function
// POST /functions/v1/mollie-webhook
// Mollie stuurt: { id: "tr_xxx" } (payment ID)
// Handles: payment.paid → premium_until +1 maand
//          subscription.canceled → premium_until = null

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  // Mollie stuurt POST met form-encoded body
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      console.error("Webhook: geen payment ID ontvangen");
      return new Response("OK", { status: 200 }); // Altijd 200 teruggeven aan Mollie
    }

    console.log(`Webhook ontvangen voor payment: ${paymentId}`);

    // Haal payment details op bij Mollie
    const paymentRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MOLLIE_API_KEY}` },
    });

    if (!paymentRes.ok) {
      console.error(`Mollie API fout: ${paymentRes.status}`);
      return new Response("OK", { status: 200 });
    }

    const payment = await paymentRes.json();
    const userId = payment.metadata?.supabase_user_id;

    if (!userId) {
      console.error("Geen supabase_user_id in payment metadata");
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (payment.status === "paid") {
      console.log(`Payment ${paymentId} betaald voor user ${userId}`);

      // Zet premium_until +1 maand vanaf nu
      const premiumUntil = new Date();
      premiumUntil.setMonth(premiumUntil.getMonth() + 1);

      await supabase
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            premium_until: premiumUntil.toISOString(),
            mollie_customer_id: payment.customerId,
          },
          { onConflict: "id" }
        );

      // Als dit een first payment was, maak subscription aan
      if (payment.sequenceType === "first" && payment.mandateId) {
        console.log(`Eerste betaling geslaagd, subscription aanmaken voor ${userId}`);

        const subRes = await fetch(
          `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${MOLLIE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: { currency: "EUR", value: "4.99" },
              interval: "1 month",
              description: "SchriftInzicht Premium",
              webhookUrl: `${SUPABASE_URL}/functions/v1/mollie-webhook`,
              metadata: { supabase_user_id: userId },
            }),
          }
        );

        if (!subRes.ok) {
          const err = await subRes.text();
          console.error(`Subscription aanmaken mislukt: ${err}`);
        } else {
          console.log(`Subscription aangemaakt voor ${userId}`);
        }
      }
    } else if (payment.status === "failed" || payment.status === "canceled" || payment.status === "expired") {
      console.log(`Payment ${paymentId} status: ${payment.status} voor user ${userId}`);
      // Niet direct premium verwijderen — wacht tot subscription.canceled
    }

    // Check of het een subscription-gerelateerd event is
    if (payment.subscriptionId) {
      const subRes = await fetch(
        `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions/${payment.subscriptionId}`,
        {
          headers: { "Authorization": `Bearer ${MOLLIE_API_KEY}` },
        }
      );

      if (subRes.ok) {
        const subscription = await subRes.json();
        if (subscription.status === "canceled" || subscription.status === "suspended") {
          console.log(`Subscription ${payment.subscriptionId} geannuleerd voor user ${userId}`);
          await supabase
            .from("user_profiles")
            .update({ premium_until: null })
            .eq("id", userId);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook fout:", err);
    return new Response("OK", { status: 200 }); // Altijd 200 teruggeven
  }
});
