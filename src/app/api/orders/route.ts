import { NextResponse } from "next/server";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const identity = await getFirebaseIdentity(request);
    if (!identity) return NextResponse.json({ error: "Please sign in to view your order history." }, { status: 401 });

    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 500 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", identity.uid)
      .single();
    if (profileError || !profile) return NextResponse.json({ orders: [] });

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, city, address, total, status, created_at, order_items(id, product_name, quantity, unit_price)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: orders ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load your orders right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await getFirebaseIdentity(request);
    if (!identity) return NextResponse.json({ error: "Please sign in before placing an order." }, { status: 401 });

    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Order storage is not configured." }, { status: 500 });

    const body = await request.json() as { products?: unknown; addressId?: unknown; notes?: unknown };
    if (!Array.isArray(body.products) || body.products.length === 0 || body.products.length > 30) {
      return NextResponse.json({ error: "Your shopping bag is empty or contains too many items." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, addresses")
      .eq("firebase_uid", identity.uid)
      .single();
    if (profileError || !profile?.phone) {
      return NextResponse.json({ error: "Complete your account phone number and delivery address before ordering." }, { status: 400 });
    }

    const addresses = Array.isArray(profile.addresses) ? profile.addresses as Array<{ id: string; city: string; address: string; is_default?: boolean }> : [];
    const shippingAddress = addresses.find((address) => address.id === body.addressId) ?? addresses.find((address) => address.is_default);
    if (!shippingAddress) return NextResponse.json({ error: "Add a delivery address to your account before ordering." }, { status: 400 });

    const itemQuantities = new Map<number, number>();
    for (const item of body.products) {
      const cartItem = item as { product?: { id?: unknown }; quantity?: unknown };
      const productId = Number(cartItem.product?.id);
      const quantity = Number(cartItem.quantity);
      if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return NextResponse.json({ error: "One or more items in your bag are invalid. Please review your bag and try again." }, { status: 400 });
      }

      const combinedQuantity = (itemQuantities.get(productId) ?? 0) + quantity;
      if (combinedQuantity > 50) {
        return NextResponse.json({ error: "The quantity for one product cannot exceed 50." }, { status: 400 });
      }
      itemQuantities.set(productId, combinedQuantity);
    }

    const { data, error: orderError } = await supabase.rpc("create_customer_order", {
      p_user_id: profile.id,
      p_customer_name: profile.full_name || identity.name || identity.email || "Customer",
      p_customer_phone: profile.phone,
      p_city: shippingAddress.city,
      p_address: shippingAddress.address,
      p_notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
      p_items: Array.from(itemQuantities, ([product_id, quantity]) => ({ product_id, quantity })),
    });

    if (orderError) {
      const message = orderError.message;
      if (message.includes("INSUFFICIENT_STOCK:")) return NextResponse.json({ error: "A product no longer has enough stock. Update your bag and try again." }, { status: 409 });
      if (message.includes("PRODUCT_UNAVAILABLE:")) return NextResponse.json({ error: "A product is no longer available. Refresh the store and try again." }, { status: 409 });
      if (message.includes("INVALID_ORDER_ITEMS")) return NextResponse.json({ error: "One or more items in your bag are invalid." }, { status: 400 });
      return NextResponse.json({ error: "Unable to create your order right now." }, { status: 500 });
    }

    const createdOrder = data as { order_id: string; total: number; items: Array<{ product_name: string; quantity: number; unit_price: number }> };
    return NextResponse.json({ success: true, orderId: createdOrder.order_id, total: createdOrder.total, items: createdOrder.items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
