"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import testProductDetails from "@/lib/test-product-details.json";
import type { StoreProduct } from "@/lib/store-products";

type ProductDetails = { description: string; specifications: Record<string, string> };

const demoProductDetails: Record<string, { description: string; specifications: string[][] }> = testProductDetails;

function getProductDetails(product: StoreProduct): ProductDetails {
  const demoDetails = demoProductDetails[product.name];
  if (demoDetails) {
    return {
      description: demoDetails.description,
      specifications: Object.fromEntries(demoDetails.specifications),
    };
  }

  const categoryDetails: Record<string, string> = {
    Badminton: "Selected for fast footwork, sharp reactions and the rhythm of the rally. A dependable choice for your next training session or match.",
    Tennis: "Court-ready equipment selected to help you find your rhythm from first serve through match point.",
    Squash: "Built for quick movement and close-quarters control. A practical pick for training days and competitive rallies.",
    Accessories: "A considered court-side essential, selected to keep your kit organised and your next session running smoothly.",
  };

  return {
    description: `${product.name} by ${product.brand || "Al Raed Sports"}. ${categoryDetails[product.category] ?? "A court-ready essential, selected for your next session."}`,
    specifications: {
      Brand: product.brand || "Al Raed Sports",
      Category: product.category,
      Inventory: product.stock > 0 ? `${product.stock} in stock` : "Currently unavailable",
      "Technical specifications": "Contact us to confirm product-specific details",
    },
  };
}

const money = (amount: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(amount);

export default function ProductDetailDialog({
  product,
  onClose,
  onAdd,
}: {
  product: StoreProduct | null;
  onClose: () => void;
  onAdd: (product: StoreProduct, quantity: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  const details = product ? getProductDetails(product) : null;
  const isDemoProduct = product?.name.startsWith("[TEST]") ?? false;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  return (
    <dialog
      ref={dialogRef}
      className="ar-product-dialog"
      aria-labelledby="ar-product-detail-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      {product && details && (
        <>
          <div className="ar-product-detail-visual">
            {product.image ? <img src={product.image} alt={product.name} /> : <span className="ar-product-placeholder">AL RAED<br />SPORTS</span>}
            <span className="ar-product-detail-category">{product.category}</span>
            {isDemoProduct && <span className="ar-product-demo-badge">TEST PRODUCT</span>}
          </div>
          <section className="ar-product-detail-content">
            <button className="ar-product-detail-close" type="button" aria-label="Close product details" onClick={() => dialogRef.current?.close()}><X size={20} /></button>
            <p className="ar-eyebrow">{product.brand || "AL RAED SPORTS"} · {product.category.toUpperCase()}</p>
            <h2 id="ar-product-detail-title">{product.name.replace(/^\[TEST\]\s*/, "")}</h2>
            <p className="ar-product-detail-description">{details.description}</p>
            <div className="ar-product-detail-price">
              <strong>{money(product.price)}</strong>
              <span className={product.stock > 0 ? "is-in-stock" : "is-out-of-stock"}>{product.stock > 0 ? `${product.stock} IN STOCK` : "CURRENTLY UNAVAILABLE"}</span>
            </div>
            <div className="ar-product-specs">
              <div className="ar-product-specs-heading"><h3>Product details</h3><span>{Object.keys(details.specifications).length} DETAILS</span></div>
              {Object.entries(details.specifications).map(([label, value]) => (
                <div className="ar-product-spec-row" key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            {isDemoProduct && <p className="ar-product-demo-note">This is a test listing. Specifications are illustrative demo content, not manufacturer-verified product data.</p>}
            <div className="ar-product-detail-buy">
              <div className="ar-detail-quantity" aria-label="Choose quantity">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1}><Minus size={15} /></button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(Math.min(product.stock, 50), value + 1))} disabled={quantity >= Math.min(product.stock, 50)}><Plus size={15} /></button>
              </div>
              <button className="ar-button ar-button-light ar-product-detail-add" type="button" onClick={() => onAdd(product, quantity)} disabled={product.stock < 1}>
                {product.stock < 1 ? "SOLD OUT" : <>ADD TO BAG · {money(product.price * quantity)} <ShoppingBag size={16} /></>}
              </button>
            </div>
            <p className="ar-product-detail-footnote">UAE-wide delivery · Availability shown from current stock</p>
          </section>
        </>
      )}
    </dialog>
  );
}
