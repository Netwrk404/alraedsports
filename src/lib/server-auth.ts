import { createClient } from "@supabase/supabase-js";

export type FirebaseIdentity = {
  uid: string;
  email: string | null;
  name: string | null;
};

export const getFirebaseIdentity = async (request: Request): Promise<FirebaseIdentity | null> => {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !apiKey) return null;

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const result = await response.json() as { users?: Array<{ localId?: string; email?: string; displayName?: string }> };
  const user = result.users?.[0];
  if (!user?.localId) return null;

  return {
    uid: user.localId,
    email: user.email ?? null,
    name: user.displayName ?? null,
  };
};

export const createAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};