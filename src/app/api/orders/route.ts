import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { products, customerName, customerPhone, city, address, notes } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (!customerName || !customerPhone) {
      return NextResponse.json({ error: "Customer name and phone are required." }, { status: 400 });
    }

    const total = products.reduce((sum: number, item: any) => {
      const price = Number(item?.product?.price ?? 0);
      const quantity = Number(item?.quantity ?? 0);
      return sum + price * quantity;
    }, 0);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        city: city || null,
        address: address || null,
        notes: notes || null,
        total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    const orderItems = products.map((item: any) => ({
      order_id: order.id,
      product_id: item?.product?.id ?? null,
      product_name: item?.product?.name ?? "Unknown product",
      quantity: Number(item?.quantity ?? 0),
      unit_price: Number(item?.product?.price ?? 0),
    }));

    const { error: itemError } = await supabaseAdmin.from("order_items").insert(orderItems);

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, orderId: order.id, total });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
