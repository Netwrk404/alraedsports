import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/server-auth";

export async function GET() {
  const supabase = createAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Product catalog is not configured." }, { status: 500 });

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, brand, category, price, image_url, description, rating, reviews, stock")
    .eq("is_active", true)
    .in("category", ["Badminton", "Tennis", "Squash", "Accessories"])
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productRows = products ?? [];
  if (productRows.length === 0) {
    return NextResponse.json({ products: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: reservations, error: reservationError } = await supabase
    .from("stripe_order_stock_reservations")
    .select("product_id, quantity")
    .in("product_id", productRows.map((product) => product.id));
  if (reservationError?.code === "42P01") {
    return NextResponse.json({ error: "Run SUPABASE_STRIPE_CHECKOUT_MIGRATION.sql in Supabase to enable checkout inventory reservations." }, { status: 503 });
  }
  if (reservationError) return NextResponse.json({ error: "Unable to calculate available product stock." }, { status: 500 });

  const reservedByProduct = new Map<number, number>();
  for (const reservation of reservations ?? []) {
    reservedByProduct.set(
      Number(reservation.product_id),
      (reservedByProduct.get(Number(reservation.product_id)) ?? 0) + Number(reservation.quantity),
    );
  }
  const productsWithAvailableStock = productRows.map((product) => ({
    ...product,
    stock: Math.max(0, Number(product.stock ?? 0) - (reservedByProduct.get(Number(product.id)) ?? 0)),
  }));

  return NextResponse.json({ products: productsWithAvailableStock }, { headers: { "Cache-Control": "no-store" } });
}