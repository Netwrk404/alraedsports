import { auth } from "@/lib/firebase";
import type { CartLine } from "@/lib/store-products";

export async function startStripeCheckout(cart: CartLine[]) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in to your account and save your delivery details before checkout.");

  const token = await user.getIdToken();
  const response = await fetch("/api/checkout/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: cart.map(({ product, quantity }) => ({ product: { id: product.id }, quantity })),
    }),
  });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok) throw new Error(result.error || "Unable to start secure checkout.");
  if (!result.url) throw new Error("Secure checkout did not return a payment link.");

  window.location.assign(result.url);
}
