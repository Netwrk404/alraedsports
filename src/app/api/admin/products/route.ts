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

const allowedCategories = ["Badminton", "Tennis", "Squash", "Accessories"];
const normalizeSku = (sku: string | null | undefined) => sku?.trim().toUpperCase() || null;
const databaseErrorResponse = (error: { code?: string; message: string }) => {
  if (error.code === "23505") {
    return NextResponse.json({ error: "That SKU or Zoho product ID is already assigned to another product." }, { status: 409 });
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
};
const normalizeZohoProductId = (value: string | null | undefined) => value?.trim() || null;

export async function GET(request: Request) {
  try {
    await ensureAdmin(request);
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Product storage is not configured." }, { status: 500 });

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: products ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Access denied" ? 403 : 401 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureAdmin(request);
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Product storage is not configured." }, { status: 500 });

    const body = await request.json() as {
      name?: string;
      brand?: string;
      category?: string;
      price?: string | number;
      image_url?: string;
      stock?: string | number;
      is_active?: boolean;
      sku?: string | null;
      zoho_product_id?: string | null;
    };

    if (!body.name?.trim() || !body.brand?.trim() || !body.category || !allowedCategories.includes(body.category)) {
      return NextResponse.json({ error: "Name, brand, and a valid category are required." }, { status: 400 });
    }
    if (body.sku !== undefined && body.sku !== null && typeof body.sku !== "string") {
      return NextResponse.json({ error: "Enter a valid SKU." }, { status: 400 });
    }
    if (body.zoho_product_id !== undefined && body.zoho_product_id !== null && typeof body.zoho_product_id !== "string") {
      return NextResponse.json({ error: "Enter a valid Zoho product ID." }, { status: 400 });
    }
    if (typeof body.zoho_product_id === "string" && body.zoho_product_id.trim().length > 128) {
      return NextResponse.json({ error: "Zoho product ID must be 128 characters or fewer." }, { status: 400 });
    }

    const numericPrice = Number(body.price ?? 0);
    const numericStock = Number(body.stock ?? 0);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || !Number.isInteger(numericStock) || numericStock < 0) {
      return NextResponse.json({ error: "Enter a valid price and stock quantity." }, { status: 400 });
    }
    if (!body.image_url?.trim()) {
      return NextResponse.json({ error: "Upload a product image before saving." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: body.name.trim(),
        brand: body.brand.trim(),
        category: body.category.trim(),
        price: numericPrice,
        image_url: body.image_url.trim(),
        stock: numericStock,
        sku: normalizeSku(body.sku),
        zoho_product_id: normalizeZohoProductId(body.zoho_product_id),
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) return databaseErrorResponse(error);
    return NextResponse.json({ product: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Access denied" ? 403 : 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureAdmin(request);
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: "Product storage is not configured." }, { status: 500 });

    const body = await request.json() as {
      id?: number;
      stock?: string | number;
      price?: string | number;
      is_active?: boolean;
      image_url?: string;
      brand?: string;
      category?: string;
      name?: string;
      sku?: string | null;
      zoho_product_id?: string | null;
    };

    if (!body.id) return NextResponse.json({ error: "Product id is required." }, { status: 400 });

    const updatePayload: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) return NextResponse.json({ error: "Product name cannot be empty." }, { status: 400 });
      updatePayload.name = body.name.trim();
    }
    if (body.brand) updatePayload.brand = body.brand.trim();
    if (body.category !== undefined) {
      if (!allowedCategories.includes(body.category)) return NextResponse.json({ error: "Invalid product category." }, { status: 400 });
      updatePayload.category = body.category;
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
      updatePayload.price = price;
    }
    if (body.stock !== undefined) {
      const stock = Number(body.stock);
      if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "Enter a valid stock quantity." }, { status: 400 });
      updatePayload.stock = stock;
    }
    if (body.sku !== undefined) {
      if (body.sku !== null && typeof body.sku !== "string") {
        return NextResponse.json({ error: "Enter a valid SKU." }, { status: 400 });
      }
      updatePayload.sku = normalizeSku(body.sku);
    }
    if (body.zoho_product_id !== undefined) {
      if (body.zoho_product_id !== null && typeof body.zoho_product_id !== "string") {
        return NextResponse.json({ error: "Enter a valid Zoho product ID." }, { status: 400 });
      }
      if (typeof body.zoho_product_id === "string" && body.zoho_product_id.trim().length > 128) {
        return NextResponse.json({ error: "Zoho product ID must be 128 characters or fewer." }, { status: 400 });
      }
      updatePayload.zoho_product_id = normalizeZohoProductId(body.zoho_product_id);
    }
    if (body.image_url !== undefined) updatePayload.image_url = body.image_url.trim();
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active;

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", body.id)
      .select()
      .single();

    if (error) return databaseErrorResponse(error);
    return NextResponse.json({ product: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Access denied" ? 403 : 401 });
  }
}
