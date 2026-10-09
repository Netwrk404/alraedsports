import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { randomInt } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());

const productImageUrls = [
  "https://images.openai.com/static-rsc-4/2jC6VLtFKMcRecHcs0GMqKufOuBoYPyi79bHCS2Uz8GSobxmVKtuvQFVn2353Y8rpmknI9EfVe0OWrhx2u53v12iAifOgLUg8Zea1QyDXr9X8B3tmi14xqidaPEmkyOaUf9FdRgluSatywpGDdH73qnN2D4iYLDSHRUVYvejDEw?purpose=inline",
  "https://images.openai.com/static-rsc-4/9G5z2aWpulEUQDfFnSotoy7vxVnyXS8RJ53BJAsulfM5pnep6OC5I7xhallayhVGuPsTo3xChxWKASrUvyxCu6-FvLyAxEH_JC6-_gFvKp3jnMlBNuU5DEFMFEo-AWixyWRCxlggGvTVR7vj3kMIXUU3kfy1Be8dgygEb3dW8Gw?purpose=inline",
  "https://images.openai.com/static-rsc-4/BXaGwlKuzAurJcc2wB8Y4DeuGXXK_EvDGILkpI0efdpVA1Srccy3JAAmEYv3rUeS_oY2Zm-BWRSf264Gm7QYi-DaYKelaxNp4DemzTlNRMfTz4sn7MnwWNqRE_wZQ2UXf7J_Tckikcj6z_0uA9whXtGpfLZTrbI4Ma326njQFhU?purpose=inline",
  "https://images.openai.com/static-rsc-4/dZX1W06TzoeQOq0xW4rxQO0dfRMv7IW1RbE-qnRnMhtxajsuxEIPCvUG4StIHN23R06-muCtXGD8L7sCyixmKHllmHwAJgr0k1vpIkNdJIMTqv2P8fFgAyaJoZQz2jefswgnPfljuiwewwBGE0TLRP-xPTTcBVeRrcl0cOjE24I?purpose=inline",
  "https://images.openai.com/static-rsc-4/9vwBQYZF2Tsz1Ao4GSzJl4Fjpi5Dmft6iJigZenoafExPaL7RmfOKLEZ2CLixoR2cFvE9qWQz1wpVAFgFELvlxti-YhEmWfWpzrIAVOb2TB4JF08CRwigoaPLEtkQpv5fVGpsFcDWymHMkblijIly_04GVBAagUNL_GFsLM6VhE?purpose=inline",
  "https://images.openai.com/static-rsc-4/mqPABEOZaFaLI6BU0y_VNdGAz1_jWWioVzePniEdpJTHak8LNTfOQh-AJm6Ibm_z8s61GJMrxQCelwnR2gLTnJjrsxLHvgofqE-vBDPuYjB7jZ1YV9HzEdLyGz_NDbICj7luzaSW72ug6b8b6vSgvtW9VXuqY09RWhzjknTG5yA?purpose=inline",
  "https://images.openai.com/static-rsc-4/QCv33F_KMNohzBJ80Gm3CjxCJKIRewjfqenN7j0sA1_VwkLUnMwtRSxdUau8bMwiNBJExi73ZFn7p83r4twZZNAopTo1wy1uH0k4-O2PU2kSq8ZmTumk7AXihGpS_Q6YvvZJMVRzPzjBMY0d_08jY10RwCdY2hqNmGyC3z7LrQI?purpose=inline",
  "https://images.openai.com/static-rsc-4/7UXoskDa5Ph6vb-zwR4ZOMvIfnH7D9Px2h2EUEaQ7FEqxDsl0CrpDpArBnkwQFNJUhi_1qAWLPOxMa4pkISCseUUos39GhfggFk4BZDnrT97HsColM-_rqHrSsvP9dTkWG0gFkqjO7mUG6REuFt3ymJTT3llrDZqk2vpFxH5IoY?purpose=inline",
  "https://images.openai.com/static-rsc-4/rUzSdSbt4qx84sJH9_AMoDxcxBo8Kx0VKJSRveQfMucNzpiEERertqIOgXB3SvZwQNUTNqNJdFi4IbGY0bbJ8SacGBfaVmjL5Tgw1l9JbaE1lLIE12dBkZ4yrChzjr2ETy9TJw3Uj3C0sD9GM6yAG_oaYhQbG-AG0xcuGpIoszs?purpose=inline",
  "https://images.openai.com/static-rsc-4/flbw0aC8G1fDBRBbJYmeA_HsCouttfmejA2LItg6WEKkuTlB47b0GDrHjxfQNUvrmZlerDyoaP0WmkSAqHkO0h1V6ucAAJGRMNCcNqmW0qRB5dwD2pTWorB1s1C9k6hgJL2_LPSMcfZG1JDr4fwVA0-ItilTiSbUWC30IRy705o?purpose=inline",
  "https://images.openai.com/static-rsc-4/9gV7KJcbpmhTNax7f5IRuCFhzoJInYvGwlIuNwEkpyc3z11GD_6UWFEX8atRP30aWiUYBejEaWF_YLuGpGyKDx6nXeUdIT7C0YCubv8SnxSPsE9Vkk2Ro5m3BkcbcB0P0iO2Jo3BguYaeovzmIGqk8QTk5J6sTzBFx6zWC0NC9U?purpose=inline",
  "https://images.openai.com/static-rsc-4/iAPF9dG9Lk3q7iV7RiGM3Mu3wak2bp3Hcf1z08yO1BpCjvVaYQU_vjQ_lbi0d7E4qhdR9R7DsH8V4BDMBx_GBxqqNlbwjpcyYP5UNWrOuRiBokehKr6Xj4Y8Cp_F2th9nKcjbj3c6tNmo6x_Z4t_359BVG7O2b4bJGpkW9ZUBpE?purpose=inline",
  "https://images.openai.com/static-rsc-4/l3XH9DClDF65pBOIXZ74TqGyg9BzZl_iG_F3ZSFWhuaNnrhMtt-H4pv07_mETNLnXm_EHYPwuRQz5gUeq2SVseAvHqLzKd9o17TWyJ3x3NMK4Y0EWYOjIfPo675C0o2mEn9IVa5kXQIOOOXhQJBgLboQOlL8fR-_uE-GlPFwMVY?purpose=inline",
  "https://images.openai.com/static-rsc-4/khpPJ6-vUoqEFCZktrb46UfzSkmB11V_T2dYuUcYhegflm2VXuwg4fL0C1yfdw4chme_BSO1jRgDIUWP2pFpVwF_JzV1gDb4kca1mKLEtjlEg_OTzCoEncBkm-FeIpLxeWWEBl40bH8SdQ6YNY-gqbzQmqqbwJ2rwoqqgia3p6w?purpose=inline",
  "https://images.openai.com/static-rsc-4/MYs97VV87D_bEHVXiwZIimk6aW0Wnt6i1Kn0cfj43ZcT66UA4M_QUg_u4tiATZ0SHrCL9surikRo-PImxGjW6yQV88sfa82hYZXZS2FXN7PLPCOYaHJ9KAVh_UM8Z7EmOnWO0aRQhFh5n_9jv7RiJAtcmTMifIUcO-gSbyRPw7I?purpose=inline",
  "https://images.openai.com/static-rsc-4/eSp0k5tHgLdLcwUvN2lWZHUNTQhyg56I2hp3roOIV2dH4DX5BkgZXnMH_zZ-MNCO3-CcmRVGrOPRwlh2VhmF_e11DiXW1dOJPEpFnjYkcBDYTlgejM8zz52o9CHncTBwwVxzdxspqBrXtZHmPS2Bq0B7tBX11BAxcwYBZLINwGo?purpose=inline",
  "https://images.openai.com/static-rsc-4/m36Mj6u0d5Q0o2o9i0xXSXuUXHP0gzTW4zKQmhr9nWwuuV8yJZP1WotJpmZaef7OVs86ofU12j02Gwb_An1fps8PuSioy2hZaF_JRBCCjLbFNomeASkA9nVtY_2UWYA1tJBo1rj-n6W53znTA-oKozIxzbVimKHJ0Ac6l3lLOLk?purpose=inline",
  "https://images.openai.com/static-rsc-4/ITJGfm87vNIjZHHRRK4OZMsJ8H69B8dUPfkguxaSSFl92SEMLZaRBU13REia2OZLkPTDgEBmMA3aYz7ePpqmbiVItEJDg2GRJPrBVbzVXPM0BUiAdo6XWcIiGtUw0dxwPK1Iha_Gc82jJO1-umdgmbKS8TOVPNOr1wq1e12JAkk?purpose=inline",
  "https://images.openai.com/static-rsc-4/TDiXg7MWyoxljBNl3uPHRennCihlIbtYyLExPrAmowhBKs3gSjAtaTnDeB_OdJYMr0SOYMbJ3v3qMglP3tH7pR9abcF1x4mPX3VMhHs4TzQEOsuj55geYuuh7zbgRaHocWsYKeQHtJzn6xWatTfTOyNkWI6qR6Oq38mQ-iHGTGE?purpose=inline",
  "https://images.openai.com/static-rsc-4/Wn1vNI1xB9CBPq1libuvefsRSnTMUrTnnfm2XVtxSUEkju4p954K89OUdF9c7r2SSR5PVacErln1kq66FLqf94ophFbJ3Iwp4Cboiyz9z_4EJUpKedHmNySTbpGk2wngzpbWwSvHDxV9Lbpr0v7mvbZhHI8iqoDQoxblfZw72is?purpose=inline",
  "https://images.openai.com/static-rsc-4/o8NdnCSXV60WX-QSqu-xLkou9Y_TQaAFNyn4-woVk5DMGkmFL-gSTmpSVCvXnGIfR-24pEhIPIuaPfZ-WcwEEfwVCum5TW7QU6cVRFA2MaY7yNoA1lj1dMdIHWPjg2ctd_uLlTldkXdEM1FyE7Byu9jlRsuNWU7e1HiM93WOUEU?purpose=inline",
  "https://images.openai.com/static-rsc-4/KPFw9hw6Q9IJTLCFzMLc3hNk5oy9SifBq25cGTN31ZoSxmJetZeiMVKu2ssTNxL1IVnmOyUqGtPL5Wx171tQ1rz8UjjMjBjT849qyErCVoLsTTw2TrMcKZmBkdAdfMPekaTzyzjqbY36PzXTX8akI7hFJ7V1Jrc1hJoY9YQhzoo?purpose=inline",
  "https://images.openai.com/static-rsc-4/K4_u9ohhSghHYmnwKBwI0kOy1d7xLFDCyujjtbNA8YL1wCmNYFP15vl1RqJYYYfPJ8kBBR73hG1OAKwhLAM4ePL8_jwU700TRyD0wKOdCwgBEdp4lVjQsKaMMjK5REGNYIDRD-PFKCoV7V7XTno1PR9YyNnpskEJ2toV2PQI6e0?purpose=inline",
  "https://images.openai.com/static-rsc-4/NIBUlzOfioh6D0g3R6bBgXJ190fdN37X5oSaZje5WVukJfyZ0HYiSI9utrTejYjcu0LTVH4TeJ8NvG0-531r6IWdO8aUJzoFXRf9FaYSdELib4ayw93F19MJTkdgxcvd7UHtmpqhtpkUbcSCzUt7BETn4kD-CRhdoXjSmu_EpC8?purpose=inline",
  "https://images.openai.com/static-rsc-4/eygdNlh27TGzYBW6_-lUYUpYAFqWYRadp_E8yw7jOWMwiVpBgL2CwkziplSHbrsS-64W6uin8pQK6uNWNVx32MYpekKzdiypzWVrSng_ce6Y8021mxssFYTWnR41NETLTx6S2wXCnaIc_7B0sg1FfXnylqlixnXp2-Xc4wgBRIY?purpose=inline",
  "https://images.openai.com/static-rsc-4/TdZ22B1Pr6tpEq1mUWoAkXewapKdt4VIxxiFf-YI4eb_FQ0Vm_l7jfcZwDn-dKCT3ZwoPLNPZbtDsQSRW963Ffo7IoCNQZ2R_QTndaffM8nQDF26yZ3K1oeu34swVLR1eZyZEAovuAGkZ18jy6wsD6uj_RAGfacsluEEaE8STXI?purpose=inline",
  "https://images.openai.com/static-rsc-4/HIlr6JHCm_M8VnSBbgTbgeB3e_7hUACnA3g9_8MP9SbVaSaxYjPAmXcGTNgjqKkCjy8SxisiVSC5zmn2ZQCcUbYihMW1_0i13HzCI8Jy516Ul0FKDdJsqFgIq_XV9KCtuN4RNIFtsX4Ojq7pGQcYBx6gg4QeMLzbzYQltC_A0Sc?purpose=inline",
  "https://images.openai.com/static-rsc-4/hlvCv0R7sTB4QjQ5MoI6IOQs9XfsqDPRg7KiDUlIj2DSlJmRoDmnN2QH-IUahI83FyeKaTa6FkAEOeCvKblfod8B2a32Uv2rupmMxch_g40Pn2kTqfbpTg-pDbegPIEoWb-DhRGKS1iIcKAoKNT9iZZxcQJMbj2IeBC7jdTsL28?purpose=inline",
  "https://images.openai.com/static-rsc-4/b6oCU7gZRXFVA64odIh_6bQxr5vD3hbg13xGY9VVQ1awFCjl5jIVGwtAT9WRrcLAKvzlgYJ48doiqpEThaUu2I4a-P2rCn-oydfKrjc4le9Pb677VGTA4CiwkL1GE6kp4JqE4dG8wjCBaXChjas8KBjYgtYDWnMKsAUU02iJiTk?purpose=inline",
  "https://images.openai.com/static-rsc-4/EGz0W4uCdi8VO728M0G006GIEJNs3KQhw8zgKWRwYo2Ub1vaeZLWL4sKvQQdH4hdBj1i4OCTWPlrBYvFnw6pr9SsT2A3nuQkxOsgfSJScVqZ5pGAZrIV1zO1kXMErAn1JYcITbOq0gUwGufb5sRQofh_eCEnoFK7C6XqjxkQl54?purpose=inline",
];

const products = [
  { name: "Yonex SHB 39EX", brand: "YONEX", price: 285, description: "Indoor grip, supportive fit and classic white/orange styling." },
  { name: "Yonex Power Cushion 65 Z3", brand: "YONEX", price: 500, description: "Cushioned court shoe designed for stability and quick movement." },
  { name: "Yonex Power Cushion Eclipsion Z", brand: "YONEX", price: 550, description: "Stability-focused design for demanding court footwork." },
  { name: "Yonex Power Cushion Aerus Z", brand: "YONEX", price: 625, description: "Lightweight performance footwear for fast court movement." },
  { name: "Apacs Graphite 999 Court Shoes", brand: "APACS", price: 140, description: "Suggested budget catalogue item. The exact model name is unverified; confirm the product model before sale." },
  { name: "Apacs Black/Red Court Shoes", brand: "APACS", price: 140, description: "Sporty black upper with red accents for a bold product listing. The exact model name is unverified; confirm before sale." },
  { name: "Apacs White/Blue Court Shoes", brand: "APACS", price: 160, description: "White upper with blue detailing for a clean catalogue appearance. The exact model name is unverified; confirm before sale." },
  { name: "Apacs Navy/Orange Court Shoes", brand: "APACS", price: 200, description: "Contrasting navy and orange styling for a colourful product selection. The exact model name is unverified; confirm before sale." },
  { name: "Victor AS-12W", brand: "VICTOR", price: 185, description: "Entry-level court shoe option with a clean sporty design." },
  { name: "Victor A170", brand: "VICTOR", price: 215, description: "U-shaped fit option, including versions designed for wider feet." },
  { name: "Victor A530W", brand: "VICTOR", price: 290, description: "Court footwear in a light, white-led colour scheme." },
  { name: "Victor A770", brand: "VICTOR", price: 400, description: "Performance court-shoe option for a higher-priced catalogue tier." },
  { name: "Victor A970C ADV", brand: "VICTOR", price: 600, description: "Advanced court-shoe range for players seeking stability and support." },
  { name: "Li-Ning Aero Flow", brand: "LI-NING", price: 239, description: "Indoor-court shoe designed for agility and everyday training." },
  { name: "Li-Ning Aero Lite II", brand: "LI-NING", price: 259, description: "Lightweight-looking design for quick movement around the court." },
  { name: "Li-Ning Hypersonic IV", brand: "LI-NING", price: 329, description: "Performance-oriented shoe with a bold multicolour design." },
  { name: "Li-Ning Blade Pro", brand: "LI-NING", price: 549, description: "Premium court footwear with a clean white colourway." },
  { name: "Nivia Powerstrike 4.0", brand: "NIVIA", price: 139, description: "Affordable indoor-court option for an entry-level product category." },
  { name: "Hundred Raze Elite", brand: "HUNDRED", price: 160, description: "An indoor-sports shoe option for a value-focused catalogue." },
  { name: "Adidas Novaflight 2", brand: "ADIDAS", price: 249.5, description: "Indoor-sports shoe with Lightstrike cushioning and a non-marking outsole; suitable for indoor court sports, though not badminton-specific." },
  { name: "Yonex AC102EX Super Grap Overgrip", brand: "YONEX", price: 12.5, description: "Tacky overgrip for improved racket-handle feel." },
  { name: "Yonex AC402EX Towel Grip", brand: "YONEX", price: 20, description: "Absorbent cotton-style grip for sweaty hands." },
  { name: "Victor GR254 Overgrip", brand: "VICTOR", price: 30, description: "Replacement grip tape in a compact retail pack." },
  { name: "Li-Ning GC001 Towel Grip", brand: "LI-NING", price: 12.5, description: "Double-layer towel-style grip for sweat absorption." },
  { name: "Yonex AC489EX Wristband", brand: "YONEX", price: 28.5, description: "Helps absorb sweat during badminton sessions." },
  { name: "Yonex AC259EX Headband", brand: "YONEX", price: 25, description: "Lightweight headband for sweat management." },
  { name: "Microfiber Sports Towel", brand: "GENERIC", price: 25, description: "Quick-drying towel for training and match breaks." },
  { name: "FORZA Resistance Bands Set", brand: "FORZA", price: 65, description: "For leg strength, mobility, warm-ups and injury-prevention exercises." },
  { name: "FORZA Speed & Agility Ladder", brand: "FORZA", price: 67.5, description: "Useful for footwork drills, coordination and quick directional changes." },
  { name: "FORZA Training Marker Cones", brand: "FORZA", price: 105, description: "For court positioning, shuttle-run drills and movement training." },
];

if (products.length !== 30 || productImageUrls.length !== products.length) {
  throw new Error("The badminton catalog must contain 30 products with one image each.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingProducts, error: lookupError } = await supabase
  .from("products")
  .select("id, name")
  .eq("category", "Badminton")
  .in("name", products.map((product) => product.name));

if (lookupError) throw new Error(`Unable to check for existing badminton products: ${lookupError.message}`);

const existingByName = new Map();
for (const product of existingProducts ?? []) {
  if (existingByName.has(product.name)) {
    throw new Error(`Multiple Badminton products named "${product.name}" already exist; resolve the duplicate before seeding.`);
  }
  existingByName.set(product.name, product);
}

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) throw new Error(`Unable to check product image storage: ${bucketsError.message}`);
if (!(buckets ?? []).some((bucket) => bucket.name === "product-images")) {
  const { error: bucketError } = await supabase.storage.createBucket("product-images", {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (bucketError) throw new Error(`Unable to create product image storage: ${bucketError.message}`);
}

const toSlug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uploadProductImage = async (product, imageUrl) => {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Unable to download image for ${product.name}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error(`Image for ${product.name} has unsupported type "${contentType}".`);
  }

  const image = new Uint8Array(await response.arrayBuffer());
  if (!image.length || image.length > 5 * 1024 * 1024) {
    throw new Error(`Image for ${product.name} must be smaller than 5 MB.`);
  }

  const path = `badminton/${toSlug(product.name)}.${contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, image, { contentType, cacheControl: "31536000", upsert: true });
  if (uploadError) throw new Error(`Unable to store image for ${product.name}: ${uploadError.message}`);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
};

const savedProducts = [];
for (let start = 0; start < products.length; start += 5) {
  const batch = products.slice(start, start + 5);
  const savedBatch = await Promise.all(batch.map(async (product, index) => ({
    ...product,
    category: "Badminton",
    stock: randomInt(3, 6),
    image_url: await uploadProductImage(product, productImageUrls[start + index]),
    is_active: true,
  })));
  savedProducts.push(...savedBatch);
}

const productsToInsert = savedProducts.filter((product) => !existingByName.has(product.name));
if (productsToInsert.length > 0) {
  const { error: insertError } = await supabase.from("products").insert(productsToInsert);
  if (insertError) throw new Error(`Unable to add badminton products: ${insertError.message}`);
}

for (const product of savedProducts) {
  const existing = existingByName.get(product.name);
  if (!existing) continue;
  const { error: updateError } = await supabase
    .from("products")
    .update(product)
    .eq("id", existing.id);
  if (updateError) throw new Error(`Unable to update ${product.name}: ${updateError.message}`);
}

const { data: verifiedProducts, error: verifyError } = await supabase
  .from("products")
  .select("name, category, is_active, image_url, description, stock")
  .eq("category", "Badminton")
  .in("name", products.map((product) => product.name));

if (verifyError) throw new Error(`Unable to verify badminton products: ${verifyError.message}`);
if ((verifiedProducts ?? []).length !== products.length
  || verifiedProducts.some((product) => !product.is_active || !product.image_url || !product.description || ![3, 4, 5].includes(product.stock))) {
  throw new Error(`Catalog verification failed: expected ${products.length} active products with images, descriptions, and stock of 3, 4, or 5.`);
}

console.log(`Verified ${verifiedProducts.length} Badminton products with descriptions and stored images.`);
console.log(`${productsToInsert.length} added; ${products.length - productsToInsert.length} updated.`);
