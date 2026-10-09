import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";
import { getZohoStockUpdates, normalizeZohoSku, ZohoInventoryError } from "@/lib/zoho-inventory";

export const runtime = "nodejs";

const isCronAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!secret || !providedSecret) return false;

  const expected = Buffer.from(secret);
  const provided = Buffer.from(providedSecret);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
};

const syncInventory = async (request: Request) => {
  if (!isCronAuthorized(request)) {
    const identity = await getFirebaseIdentity(request);
    if (!identity || !isAdminEmail(identity.email)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Product storage is not configured." }, { status: 500 });
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("sku")
    .not("sku", "is", null)
    .neq("sku", "");

  if (productsError) {
    console.error("Zoho stock sync could not load website SKUs:", productsError.message);
    return NextResponse.json({ error: "Unable to load website product SKUs." }, { status: 500 });
  }

  const websiteSkus = Array.from(new Set(
    (products ?? [])
      .map((product) => product.sku)
      .filter((sku): sku is string => typeof sku === "string" && Boolean(sku.trim()))
      .map(normalizeZohoSku),
  ));

  try {
    const updates = await getZohoStockUpdates(websiteSkus);
    let updatedProductCount = 0;

    if (updates.length > 0) {
      const { data, error } = await supabase.rpc("sync_zoho_product_stock", { p_updates: updates });
      if (error) {
        console.error("Zoho stock sync database update failed:", error.message);
        return NextResponse.json({ error: "Zoho stock was retrieved but could not be saved." }, { status: 500 });
      }
      updatedProductCount = Number(data);
      if (!Number.isInteger(updatedProductCount)) {
        console.error("Zoho stock sync returned an invalid database update count.");
        return NextResponse.json({ error: "Zoho stock update did not return a valid result." }, { status: 500 });
      }
    }

    const matchedSkus = new Set(updates.map((update) => update.sku));
    return NextResponse.json({
      success: true,
      updatedProductCount,
      unmatchedWebsiteSkus: websiteSkus.filter((sku) => !matchedSkus.has(sku)),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof ZohoInventoryError
      ? error.message
      : "Unexpected error while syncing Zoho inventory.";
    console.error("Zoho stock sync failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
};

export async function GET(request: Request) {
  return syncInventory(request);
}

export async function POST(request: Request) {
  return syncInventory(request);
}
