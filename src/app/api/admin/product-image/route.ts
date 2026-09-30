import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminSupabase, getFirebaseIdentity } from "@/lib/server-auth";

const bucketName = "product-images";
const maxImageSize = 5 * 1024 * 1024;
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const identity = await getFirebaseIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(identity.email)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const supabase = createAdminSupabase();
  if (!supabase) return NextResponse.json({ error: "Image storage is not configured." }, { status: 500 });

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!image || typeof image === "string") {
      return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    }
    if (!extensionByType[image.type]) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    }
    if (image.size <= 0 || image.size > maxImageSize) {
      return NextResponse.json({ error: "Image must be smaller than 5 MB." }, { status: 400 });
    }

    const { data: bucket } = await supabase.storage.getBucket(bucketName);
    if (!bucket) {
      await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: "5MB",
        allowedMimeTypes: Object.keys(extensionByType),
      });
    }

    const path = `${crypto.randomUUID()}.${extensionByType[image.type]}`;
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, new Uint8Array(await image.arrayBuffer()), {
        contentType: image.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return NextResponse.json({ imageUrl: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload the image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}