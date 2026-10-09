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
  return NextResponse.json({ products: products ?? [] }, { headers: { "Cache-Control": "no-store" } });
}