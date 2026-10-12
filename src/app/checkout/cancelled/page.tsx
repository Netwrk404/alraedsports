"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3 } from "lucide-react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "@/lib/firebase";

export default function CheckoutCancelledPage() {
  const [orderId] = useState<string | null>(() => typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("order_id"));
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "cancelled" | "paid" | "processing" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => subscribeToAuth((currentUser) => {
    setUser(currentUser);
    if (!orderId) {
      setError("The order reference is missing.");
      setStatus("error");
    } else if (!currentUser) {
      setError("Sign in to the same account to release the reserved items.");
      setStatus("error");
    }
  }), [orderId]);

  useEffect(() => {
    if (!user || !orderId) return;

    let active = true;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/checkout/cancel", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const result = await response.json() as { status?: string; error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to update the checkout.");
        if (!active) return;
        setStatus(result.status === "paid" ? "paid" : result.status === "cancelled" ? "cancelled" : "processing");
      } catch (cancelError) {
        if (!active) return;
        setError(cancelError instanceof Error ? cancelError.message : "Unable to update the checkout.");
        setStatus("error");
      }
    })();

    return () => { active = false; };
  }, [user, orderId]);

  const paid = status === "paid";
  return (
    <main className="account-page checkout-result-page">
      <header className="account-header"><Link className="account-brand" href="/"><span className="account-brand-mark">AR</span><span>AL RAED <strong>SPORTS</strong></span></Link><Link className="account-back" href="/shop"><ArrowLeft size={15} /> Continue shopping</Link></header>
      <section className="checkout-result-card">
        <span className={`checkout-result-icon${status === "cancelled" ? " is-success" : ""}`}>{status === "cancelled" ? <Check size={26} /> : <Clock3 size={26} />}</span>
        <p className="account-kicker">{paid ? "PAYMENT RECEIVED" : "CHECKOUT UPDATE"}</p>
        <h1>{paid ? <>Payment<br /><em>is complete.</em></> : status === "processing" ? <>Payment<br /><em>processing.</em></> : status === "loading" ? <>Updating<br /><em>your bag.</em></> : <>Checkout<br /><em>not completed.</em></>}</h1>
        <p className="checkout-result-copy">{paid || status === "processing" ? "Stripe is still verifying this payment. Check My Orders for the final confirmation before trying to pay again." : status === "cancelled" ? "No payment was taken. Your reserved stock has been returned to availability, and your bag is still saved." : status === "error" ? error : "We’re confirming the checkout cancellation with Stripe."}</p>
        <div className="checkout-result-links"><Link className="account-primary-button checkout-result-action" href={paid || status === "processing" ? "/account/orders" : "/shop"}>{paid || status === "processing" ? "CHECK MY ORDERS" : "RETURN TO MY BAG"}</Link><Link className="account-back" href="/account/orders">My orders</Link>{status === "error" && <Link className="account-back" href="/account">Sign in to your account</Link>}</div>
      </section>
    </main>
  );
}
