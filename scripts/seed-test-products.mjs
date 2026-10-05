import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import testProductDetails from "../src/lib/test-product-details.json" with { type: "json" };

nextEnv.loadEnvConfig(process.cwd());

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;

const testProducts = [
  { name: "[TEST] Astrox 100 ZZ Tour", brand: "YONEX", category: "Badminton", price: 1099, stock: 12, image_url: image("photo-1708312604109-16c0be9326cd") },
  { name: "[TEST] Nanoflare 800 Pro", brand: "YONEX", category: "Badminton", price: 899, stock: 16, image_url: image("photo-1721760886982-3c643f05813d") },
  { name: "[TEST] Arcsaber 11 Pro", brand: "YONEX", category: "Badminton", price: 849, stock: 8, image_url: image("photo-1716155249759-b5f068f74e63") },
  { name: "[TEST] Auraspeed 100X", brand: "VICTOR", category: "Badminton", price: 869, stock: 11, image_url: image("photo-1559309106-ed14040fd35d") },
  { name: "[TEST] Thruster Ryuga II Pro", brand: "VICTOR", category: "Badminton", price: 929, stock: 7, image_url: image("photo-1696250530563-70f39e532e10") },
  { name: "[TEST] DriveX 9X", brand: "VICTOR", category: "Badminton", price: 749, stock: 15, image_url: image("photo-1722087642932-9b070e9a066e") },
  { name: "[TEST] Aerosensa 50 Feather Shuttlecocks", brand: "YONEX", category: "Badminton", price: 189, stock: 28, image_url: image("photo-1765544581327-b5e9055d986c") },
  { name: "[TEST] Power Cushion Aerus Z Court Shoes", brand: "YONEX", category: "Badminton", price: 529, stock: 9, image_url: image("photo-1617696618050-b0fef0c666af") },
  { name: "[TEST] Team Match Court Shoes", brand: "VICTOR", category: "Badminton", price: 449, stock: 13, image_url: image("photo-1600185365926-3a2ce3cdb9eb") },
  { name: "[TEST] Performance Racquet Backpack", brand: "YONEX", category: "Badminton", price: 259, stock: 10, image_url: image("photo-1553062407-98eeb64c6a62") },

  { name: "[TEST] Pure Aero 2026", brand: "BABOLAT", category: "Tennis", price: 1199, stock: 8, image_url: image("photo-1622163642998-1ea32b0bbc67") },
  { name: "[TEST] Blade 98 v9 16x19", brand: "WILSON", category: "Tennis", price: 1099, stock: 6, image_url: image("photo-1632755898125-36cd72575dde") },
  { name: "[TEST] Speed MP 2026", brand: "HEAD", category: "Tennis", price: 999, stock: 9, image_url: image("photo-1684443726782-1d5bb1aecbd5") },
  { name: "[TEST] Ezone 100", brand: "YONEX", category: "Tennis", price: 899, stock: 12, image_url: image("photo-1723980839948-95ccbffd3cb4") },
  { name: "[TEST] Clash 100 v3", brand: "WILSON", category: "Tennis", price: 999, stock: 7, image_url: image("photo-1635873021329-c0af04695c9d") },
  { name: "[TEST] CX 200 Tour", brand: "DUNLOP", category: "Tennis", price: 849, stock: 10, image_url: image("photo-1560012057-4372e14c5085") },
  { name: "[TEST] US Open Extra Duty Balls", brand: "WILSON", category: "Tennis", price: 39, stock: 30, image_url: image("photo-1714508969012-7ac9c063b39a") },
  { name: "[TEST] Pro Court Tennis Shoes", brand: "ASICS", category: "Tennis", price: 499, stock: 14, image_url: image("photo-1599586120429-48281b6f0ece") },
  { name: "[TEST] Match Day Racket Bag 6R", brand: "BABOLAT", category: "Tennis", price: 379, stock: 6, image_url: image("photo-1672223303533-05fddcbf6e6c") },
  { name: "[TEST] Pro Tour Racket Cover", brand: "HEAD", category: "Tennis", price: 119, stock: 18, image_url: image("photo-1734459553318-1cde555f3c17") },

  { name: "[TEST] Carboflex X-Top V2", brand: "TECNIFIBRE", category: "Squash", price: 829, stock: 8, image_url: image("photo-1551129614-f184164e7b56") },
  { name: "[TEST] Sonic Core Revelation 125", brand: "DUNLOP", category: "Squash", price: 629, stock: 10, image_url: image("photo-1599280174407-fdc3e8c47856") },
  { name: "[TEST] Raw 120 Squash Racket", brand: "KARAKAL", category: "Squash", price: 749, stock: 7, image_url: image("photo-1574755892856-cdab0593100c") },
  { name: "[TEST] Speed 135 SB", brand: "HEAD", category: "Squash", price: 599, stock: 12, image_url: image("photo-1736890317824-58108f58b660") },
  { name: "[TEST] Carboflex 125 X-Speed", brand: "TECNIFIBRE", category: "Squash", price: 729, stock: 9, image_url: image("photo-1773452549582-dafdc3a3039a") },
  { name: "[TEST] Hyperfibre+ Evolution Pro", brand: "DUNLOP", category: "Squash", price: 749, stock: 6, image_url: image("photo-1574755883888-0c24aa651edb") },
  { name: "[TEST] Pro XX Squash Balls", brand: "DUNLOP", category: "Squash", price: 49, stock: 32, image_url: image("photo-1562589132-e0a4d095b15c") },
  { name: "[TEST] PU Super Grip", brand: "KARAKAL", category: "Squash", price: 29, stock: 24, image_url: image("photo-1676701495925-aca08e3b8316") },
  { name: "[TEST] X.Lite 115 Racket", brand: "EYE", category: "Squash", price: 549, stock: 11, image_url: image("photo-1699117686612-ece525e4f91a") },
  { name: "[TEST] Match Racket Cover", brand: "DUNLOP", category: "Squash", price: 119, stock: 14, image_url: image("photo-1633313236093-beebdd1a5e80") },

  { name: "[TEST] Tournament Feather Shuttlecocks", brand: "YONEX", category: "Accessories", price: 179, stock: 26, image_url: image("photo-1661020812032-90582fe13ca6") },
  { name: "[TEST] Championship Squash Balls", brand: "DUNLOP", category: "Accessories", price: 49, stock: 32, image_url: image("photo-1670898839060-8b0a8902ee1e") },
  { name: "[TEST] Championship Tennis Balls", brand: "WILSON", category: "Accessories", price: 42, stock: 30, image_url: image("photo-1558365849-6ebd8b0454b2") },
  { name: "[TEST] Pro Grip Overwrap 12-Pack", brand: "WILSON", category: "Accessories", price: 69, stock: 20, image_url: image("photo-1569597773156-9e38923c0043") },
  { name: "[TEST] Court Crew Cushioned Socks", brand: "YONEX", category: "Accessories", price: 59, stock: 18, image_url: image("photo-1615486364462-ef6363adbc18") },
  { name: "[TEST] Training Wristbands 2-Pack", brand: "YONEX", category: "Accessories", price: 35, stock: 22, image_url: image("photo-1578339094872-b03e321a1821") },
  { name: "[TEST] Insulated Court Bottle 750ml", brand: "NIKE", category: "Accessories", price: 79, stock: 15, image_url: image("photo-1664714628878-9d2aa898b9e3") },
  { name: "[TEST] Tournament Racket Bag 6-Pack", brand: "YONEX", category: "Accessories", price: 299, stock: 7, image_url: image("photo-1722003184213-b5dfa47e2476") },
  { name: "[TEST] Essential Kit Duffel", brand: "VICTOR", category: "Accessories", price: 219, stock: 9, image_url: image("photo-1692506530242-c12d6c3ae2e2") },
  { name: "[TEST] Microfibre Court Towel", brand: "ASICS", category: "Accessories", price: 39, stock: 25, image_url: image("photo-1635353059173-461b9c459f2a") },
];

const categories = ["Badminton", "Tennis", "Squash", "Accessories"];
const expectedByCategory = Object.fromEntries(categories.map((category) => [
  category,
  testProducts.filter((product) => product.category === category).length,
]));

if (testProducts.length !== 40 || Object.values(expectedByCategory).some((count) => count !== 10)) {
  throw new Error("The test catalog must contain exactly 10 products per category.");
}

for (const product of testProducts) {
  const details = testProductDetails[product.name];
  if (!details?.description?.trim() || details.specifications.length < 4) {
    throw new Error(`Add a description and at least four specifications for ${product.name}.`);
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const imageUrls = [...new Set(testProducts.map((product) => product.image_url))];
const imageChecks = await Promise.all(imageUrls.map(async (imageUrl) => {
  const response = await fetch(imageUrl, { method: "HEAD" });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    return `${imageUrl} (HTTP ${response.status})`;
  }
  return null;
}));
const invalidImages = imageChecks.filter((result) => result !== null);
if (invalidImages.length > 0) {
  throw new Error(`Cannot seed products with unavailable images:\n${invalidImages.join("\n")}`);
}

const { data: existingProducts, error: lookupError } = await supabase
  .from("products")
  .select("name, category, image_url, is_active")
  .in("name", testProducts.map((product) => product.name));

if (lookupError) throw new Error(`Unable to check for existing test products: ${lookupError.message}`);

const existingKeys = new Set((existingProducts ?? []).map((product) => `${product.category}:${product.name}`));
const existingByKey = new Map((existingProducts ?? []).map((product) => [`${product.category}:${product.name}`, product]));
const recordsToInsert = testProducts
  .filter((product) => !existingKeys.has(`${product.category}:${product.name}`))
  .map((product) => ({ ...product, is_active: true }));

if (recordsToInsert.length > 0) {
  const { error: insertError } = await supabase.from("products").insert(recordsToInsert);
  if (insertError) throw new Error(`Unable to insert test products: ${insertError.message}`);
}

let updatedProductPhotos = 0;
for (const product of testProducts) {
  const existing = existingByKey.get(`${product.category}:${product.name}`);
  if (!existing || existing.image_url === product.image_url) continue;
  const { error: imageUpdateError } = await supabase
    .from("products")
    .update({ image_url: product.image_url })
    .eq("name", product.name)
    .eq("category", product.category);
  if (imageUpdateError) throw new Error(`Unable to update test product photo for ${product.name}: ${imageUpdateError.message}`);
  updatedProductPhotos += 1;
}

const { data: seededRows, error: verifyError } = await supabase
  .from("products")
  .select("name, category, is_active")
  .in("name", testProducts.map((product) => product.name));
if (verifyError) throw new Error(`Unable to verify seeded products: ${verifyError.message}`);

for (const category of categories) {
  const activeCount = (seededRows ?? []).filter((product) => product.category === category && product.is_active).length;
  if (activeCount !== expectedByCategory[category]) {
    throw new Error(`${category} has ${activeCount} active test products; expected ${expectedByCategory[category]}.`);
  }
}

console.log(`Added ${recordsToInsert.length} test products; ${testProducts.length - recordsToInsert.length} already existed.`);
if (updatedProductPhotos > 0) console.log(`Updated ${updatedProductPhotos} test product photo(s).`);
console.log(`${Object.keys(testProductDetails).length} test products have descriptions and specifications.`);
for (const category of categories) {
  console.log(`${category}: ${(seededRows ?? []).filter((product) => product.category === category && product.is_active).length} active test products verified`);
}
