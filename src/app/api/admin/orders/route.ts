import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";

const ensureAdmin = async (request: Request) => {
  const identity = await getFirebaseIdentity(request);
  if (!identity) {
    throw new Error("Unauthorized");
  }
  if (!isAdminEmail(identity.email)) {
    throw new Error("Access denied");
  }
  return identity;
};

export async function GET(request: Request) {
  try {
    await ensureAdmin(request);
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 500 });

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, city, address, total, status, notes, created_at, order_items(id, product_name, quantity, unit_price)")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: orders ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Access denied" ? 403 : 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureAdmin(request);
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 500 });

    const body = await request.json() as { id?: string; status?: string; notes?: string | null };
    if (!body.id) return NextResponse.json({ error: "Order id is required." }, { status: 400 });

    const allowedStatuses = ["awaiting_payment", "paid", "processing", "shipped", "delivered", "cancelled"];
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
    }

    if (body.status === "paid") {
      const { error: paymentError } = await supabase.rpc("mark_order_paid_and_deduct_inventory", {
        p_order_id: body.id,
        p_notes: typeof body.notes === "string" ? body.notes : null,
        p_update_notes: typeof body.notes === "string",
      });

      if (paymentError) {
        const message = paymentError.message;
        if (message.includes("ORDER_NOT_FOUND")) return NextResponse.json({ error: "Order not found." }, { status: 404 });
        if (message.includes("INSUFFICIENT_STOCK:")) return NextResponse.json({ error: "Not enough stock to mark this order as paid. Check inventory and contact the customer before accepting payment." }, { status: 409 });
        if (message.includes("ORDER_ITEM_MISSING_PRODUCT_ID")) return NextResponse.json({ error: "This older order has no product links for automatic stock deduction. Reconcile its inventory manually before marking it paid." }, { status: 409 });
        if (message.includes("ORDER_HAS_NO_ITEMS")) return NextResponse.json({ error: "This order has no items to process." }, { status: 409 });
        if (message.includes("INVALID_ORDER_STATUS")) return NextResponse.json({ error: "Only unpaid orders can be marked as paid." }, { status: 409 });
        return NextResponse.json({ error: "Unable to safely process payment and inventory. No changes were applied." }, { status: 500 });
      }
    }

    const orderSelection = "id, customer_name, customer_phone, city, address, total, status, notes, created_at, order_items(id, product_name, quantity, unit_price)";
    const orderQuery = body.status === "paid"
      ? supabase.from("orders").select(orderSelection).eq("id", body.id)
      : supabase.from("orders").update({
        status: body.status ?? undefined,
        notes: typeof body.notes === "string" ? body.notes : undefined,
      }).eq("id", body.id).select(orderSelection);
    const { data: order, error } = await orderQuery.single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Access denied" ? 403 : 401 });
  }
}
