import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/server-auth";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature.", error);
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return NextResponse.json({ received: true });

      const orderId = session.metadata?.order_id;
      if (!orderId) {
        console.error("Paid Stripe Checkout Session has no order metadata.", session.id);
        return NextResponse.json({ error: "Checkout Session is missing its order reference." }, { status: 400 });
      }

      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
      let paymentMethod = "Card";
      if (paymentIntentId) {
        const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["payment_method"] });
        const method = paymentIntent.payment_method;
        if (method && typeof method !== "string" && method.type === "card") {
          const card = method.card;
          const brand = card?.brand ? card.brand[0].toUpperCase() + card.brand.slice(1) : "Card";
          paymentMethod = card?.wallet?.type === "apple_pay"
            ? `Apple Pay (${brand}${card.last4 ? ` ending ${card.last4}` : ""})`
            : `${brand}${card?.last4 ? ` ending ${card.last4}` : ""}`;
        }
      }

      const { error } = await supabase.rpc("mark_stripe_order_paid", {
        p_order_id: orderId,
        p_session_id: session.id,
        p_payment_intent_id: paymentIntentId,
        p_payment_method: paymentMethod,
        p_amount_total: session.amount_total,
        p_currency: session.currency,
      });
      if (error) {
        console.error("Unable to confirm paid Stripe order.", error.message);
        return NextResponse.json({ error: "Unable to confirm payment and order inventory." }, { status: 500 });
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (!orderId) return NextResponse.json({ received: true });

      const { error } = await supabase.rpc("release_stripe_checkout_order", {
        p_order_id: orderId,
        p_session_id: session.id,
      });
      if (error && !error.message.includes("STRIPE_ORDER_NOT_RELEASABLE")) {
        console.error("Unable to release expired Stripe checkout inventory.", error.message);
        return NextResponse.json({ error: "Unable to release expired checkout inventory." }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed.", error);
    return NextResponse.json({ error: "Stripe webhook processing failed." }, { status: 500 });
  }
}
