import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getFirebaseIdentity } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const identity = await getFirebaseIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminEmail(identity.email)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      admin: true,
      user: {
        email: identity.email,
        name: identity.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify admin access" }, { status: 500 });
  }
}
