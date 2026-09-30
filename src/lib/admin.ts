export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "alraedsportsuae@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};
