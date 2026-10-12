import { NextResponse } from "next/server";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const identity = await getFirebaseIdentity(request);
    if (!identity) return NextResponse.json({ error: "Sign in to manage this checkout." }, { status: 401 });

    const body = await request.json() as { orderId?: unknown };
    if (typeof body.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.orderId)) {
      return NextResponse.json({ error: "The order reference is invalid." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", identity.uid)
      .single();
    if (profileError || !profile) return NextResponse.json({ error: "Your customer account could not be found." }, { status: 404 });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_paid_at")
      .eq("id", body.orderId)
      .eq("user_id", profile.id)
      .single();
    if (orderError || !order) return NextResponse.json({ error: "This order could not be found." }, { status: 404 });
    if (order.status === "paid" || order.stripe_payment_intent_id || order.stripe_paid_at) {
      return NextResponse.json({ status: "paid" });
    }
    if (!order.stripe_checkout_session_id) return NextResponse.json({ status: order.status });

    const stripe = getStripe();
    let session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (session.status === "open") {
      session = await stripe.checkout.sessions.expire(session.id);
    }
    if (session.status === "expired") {
      const { error: releaseError } = await supabase.rpc("release_stripe_checkout_order", {
        p_order_id: order.id,
        p_session_id: session.id,
      });
      if (releaseError && !releaseError.message.includes("STRIPE_ORDER_NOT_RELEASABLE")) {
        console.error("Unable to release cancelled Stripe checkout inventory.", releaseError.message);
        return NextResponse.json({ error: "Unable to release your reserved items right now." }, { status: 500 });
      }
      return NextResponse.json({ status: "cancelled" });
    }

    return NextResponse.json({ status: session.payment_status === "paid" ? "paid" : "processing" });
  } catch (error) {
    console.error("Unable to cancel Stripe checkout.", error);
    return NextResponse.json({ error: "Unable to cancel your checkout right now." }, { status: 500 });
  }
}
