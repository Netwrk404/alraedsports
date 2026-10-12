import { NextResponse } from "next/server";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const identity = await getFirebaseIdentity(request);
    if (!identity) return NextResponse.json({ error: "Sign in to view your payment confirmation." }, { status: 401 });

    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ error: "The Checkout Session reference is invalid." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", identity.uid)
      .single();
    if (profileError || !profile) return NextResponse.json({ error: "Your customer account could not be found." }, { status: 404 });

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total, status, city, address, created_at, stripe_payment_intent_id, stripe_payment_method, stripe_paid_at, order_items(id, product_name, quantity, unit_price)")
      .eq("user_id", profile.id)
      .eq("stripe_checkout_session_id", sessionId)
      .single();

    if (error?.code === "42703") {
      return NextResponse.json({ error: "Run SUPABASE_STRIPE_CHECKOUT_MIGRATION.sql in Supabase to enable payment confirmation." }, { status: 503 });
    }
    if (error || !order) return NextResponse.json({ error: "No order was found for this Checkout Session." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Unable to check Stripe checkout status.", error);
    return NextResponse.json({ error: "Unable to check your payment status right now." }, { status: 500 });
  }
}
