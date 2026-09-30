"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronDown, ChevronUp, Filter, ImagePlus, LogOut, PackageCheck, Plus, Save, Search, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import type { User } from "firebase/auth";
import { firebaseEnabled, logoutFirebase, signInWithGoogle, subscribeToAuth } from "@/lib/firebase";

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  image_url?: string | null;
  stock: number;
  is_active?: boolean;
  description?: string | null;
  created_at?: string;
};

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  address: string | null;
  total: number;
  status: string;
  notes?: string | null;
  created_at: string;
  order_items?: Array<{ id: number; product_name: string; quantity: number; unit_price: number }>;
};

const statusOptions = ["awaiting_payment", "paid", "processing", "shipped", "delivered", "cancelled"];
const productCategories = ["Badminton", "Tennis", "Squash", "Accessories"];

const money = (value: number) => `AED ${Number(value).toLocaleString()}`;
const statusLabel = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingProductName, setEditingProductName] = useState("");
  const [editingProductCategory, setEditingProductCategory] = useState("Badminton");
  const [editingProductStock, setEditingProductStock] = useState("0");
  const [savingEditedProductId, setSavingEditedProductId] = useState<number | null>(null);
  const [productNotice, setProductNotice] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "",
    category: "Badminton",
    price: "",
    stock: "10",
    image_url: "",
  });
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const visibleOrders = orders.filter((order) => {
    const matchesName = order.customer_name.toLowerCase().includes(orderSearch.trim().toLowerCase());
    const matchesStatus = !orderStatusFilter || order.status === orderStatusFilter;
    const matchesDate = !orderDateFilter || new Date(order.created_at).toISOString().slice(0, 10) === orderDateFilter;
    return matchesName && matchesStatus && matchesDate;
  });

  const loadOrders = async (token: string) => {
    const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load orders.");
    setOrders(result.orders ?? []);
  };

  const loadProducts = async (token: string) => {
    const response = await fetch("/api/admin/products", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load products.");
    setProducts(result.products ?? []);
  };

  useEffect(() => {
    return subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/admin/session", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const result = await response.json();

        if (!response.ok || !result.admin) {
          setIsAdmin(false);
          setAuthError(result.error || "Access denied.");
          setLoading(false);
          return;
        }

        setIsAdmin(true);
        setAuthError(null);
        await Promise.all([loadOrders(token), loadProducts(token)]);
      } catch (error) {
        setIsAdmin(false);
        setAuthError(error instanceof Error ? error.message : "Unable to verify admin access.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const handleGoogleAdminLogin = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in with Google.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutFirebase();
    setIsAdmin(false);
    setUser(null);
    router.push("/");
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!user) return;
    setBusyOrderId(orderId);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update order.");
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to update order.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const saveProduct = async () => {
    if (!user) return;
    setSavingProduct(true);
    setAuthError(null);

    try {
      const token = await user.getIdToken();
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      };

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");

      setProducts((current) => [result.product, ...current]);
      setProductForm({
        name: "",
        brand: "",
        category: "Badminton",
        price: "",
        stock: "10",
        image_url: "",
      });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to save product.");
    } finally {
      setSavingProduct(false);
    }
  };

  const uploadProductImage = async (file?: File) => {
    if (!user || !file) return;
    setUploadingImage(true);
    setAuthError(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("image", file);
      const response = await fetch("/api/admin/product-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload product image.");
      setProductForm((current) => ({ ...current, image_url: result.imageUrl }));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to upload product image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleProductEditor = (product: Product) => {
    if (editingProductId === product.id) {
      setEditingProductId(null);
      return;
    }
    setEditingProductId(product.id);
    setEditingProductName(product.name);
    setEditingProductCategory(productCategories.includes(product.category) ? product.category : "Accessories");
    setEditingProductStock(String(product.stock));
  };

  const saveProductEditor = async (product: Product, isActive = Boolean(product.is_active)) => {
    if (!user) return;
    const name = editingProductName.trim();
    const stock = Number(editingProductStock);
    if (!name || !productCategories.includes(editingProductCategory) || !Number.isInteger(stock) || stock < 0) {
      setAuthError("Enter a product name, valid category, and whole-number stock quantity of zero or more.");
      return;
    }

    setSavingEditedProductId(product.id);
    setAuthError(null);
    setProductNotice(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, name, category: editingProductCategory, stock, is_active: isActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product changes.");
      setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
      setProductNotice(`${name} ${isActive ? "is now published" : "has been hidden"}.`);
      setEditingProductId(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to save product changes.");
    } finally {
      setSavingEditedProductId(null);
    }
  };

  if (!user && !loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Admin access required</p>
          <h1 className="text-4xl font-black tracking-tight mb-4">Al Raed Sports Commerce</h1>
          <p className="mb-6 text-sm text-slate-300">Only the approved admin account can access this dashboard.</p>
          {authError && <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{authError}</div>}
          <button
            type="button"
            onClick={() => void handleGoogleAdminLogin()}
            className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200 disabled:opacity-60"
            disabled={!firebaseEnabled || signingIn}
          >
            {signingIn ? "Connecting..." : "Continue with Google"}
          </button>
          <div className="mt-6 text-xs text-slate-400">Authorized admin email: alraedsportsuae@gmail.com</div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-sky-200">Checking admin access...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-rose-500/30 bg-slate-900 p-8">
          <ShieldCheck className="mb-4 text-rose-400" />
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-300">Access denied</p>
          <h1 className="text-3xl font-black mb-4">This account is not authorized.</h1>
          <p className="mb-6 text-slate-300">Use the approved admin Google account to continue.</p>
          <div className="flex gap-3">
            <Link href="/" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-white">Back to store</Link>
            <button type="button" onClick={() => void handleLogout()} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Admin dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Al Raed Sports Commerce</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200">Storefront <ArrowRight size={14} /></Link>
            <button type="button" onClick={() => void handleLogout()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        {authError && <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{authError}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between text-slate-400"><ShoppingBag size={18} /> Orders</div>
            <div className="mt-4 text-3xl font-black">{orders.length}</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between text-slate-400"><PackageCheck size={18} /> Products</div>
            <div className="mt-4 text-3xl font-black">{products.length}</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between text-slate-400"><UserRound size={18} /> Admin</div>
            <div className="mt-4 text-sm font-semibold text-sky-200">{user?.email ?? "Signed in"}</div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add new product</h2>
              <Plus size={18} className="text-sky-300" />
            </div>
            <div className="space-y-3">
              <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Product name" />
              <input value={productForm.brand} onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Brand" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm">
                  {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} type="number" min="0" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Stock" />
              </div>
              <input value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} type="number" min="0" step="0.01" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Price (AED)" />
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 hover:border-sky-400">
                <ImagePlus size={18} className="shrink-0 text-sky-300" />
                <span className="min-w-0 flex-1 truncate">{uploadingImage ? "Uploading image..." : productForm.image_url ? "Image uploaded. Choose another" : "Upload product image (JPG, PNG, WebP, max 5 MB)"}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingImage} onChange={(event) => void uploadProductImage(event.target.files?.[0])} />
              </label>
              {productForm.image_url && <img src={productForm.image_url} alt="Product preview" className="h-36 w-full rounded-xl border border-slate-800 bg-slate-950 object-contain" />}
              <button type="button" onClick={() => void saveProduct()} disabled={savingProduct || uploadingImage || !productForm.image_url} className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60">
                {savingProduct ? "Saving product..." : "Save product"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Current products</h2>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{products.length} items</span>
            </div>
            {productNotice && <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="status">{productNotice}</div>}
            <div className="space-y-3">
              {products.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No products yet.</div> : products.map((product) => (
                <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <button type="button" onClick={() => toggleProductEditor(product)} aria-expanded={editingProductId === product.id} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-900">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                      {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">IMG</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white">{product.name}</div>
                      <div className="text-xs text-slate-400">{product.brand} · {product.category} · {product.is_active ? "Live" : "Hidden"}</div>
                      <div className="mt-1 text-xs text-sky-200">{money(product.price)} · Stock: {product.stock}</div>
                    </div>
                    {editingProductId === product.id ? <ChevronUp size={18} className="shrink-0 text-slate-400" /> : <ChevronDown size={18} className="shrink-0 text-slate-400" />}
                  </button>
                  {editingProductId === product.id && (
                    <div className="grid gap-4 border-t border-slate-800 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.7fr)]">
                      <label className="grid gap-2 text-xs font-semibold text-slate-400">
                        Product name
                        <input value={editingProductName} onChange={(event) => setEditingProductName(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400" />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-slate-400">
                        Category
                        <select value={editingProductCategory} onChange={(event) => setEditingProductCategory(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400">
                          {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <div className="grid gap-2 text-xs font-semibold text-slate-400">
                        <label htmlFor={`stock-${product.id}`}>Stock quantity</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setEditingProductStock((stock) => String(Math.max(0, Number(stock || 0) - 1)))} disabled={Number(editingProductStock) <= 0} aria-label="Decrease stock by one" className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900 text-lg text-white disabled:opacity-40">-</button>
                          <input id={`stock-${product.id}`} value={editingProductStock} onChange={(event) => setEditingProductStock(event.target.value)} type="number" min="0" step="1" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-center text-sm text-white outline-none focus:border-sky-400" />
                          <button type="button" onClick={() => setEditingProductStock((stock) => String(Number(stock || 0) + 1))} aria-label="Increase stock by one" className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900 text-lg text-white">+</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button type="button" onClick={() => void saveProductEditor(product)} disabled={savingEditedProductId === product.id} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"><Save size={15} /> Save changes</button>
                        <button type="button" onClick={() => void saveProductEditor(product, !product.is_active)} disabled={savingEditedProductId === product.id} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{savingEditedProductId === product.id ? "Saving..." : product.is_active ? "Save & hide" : "Save & publish"}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Customer orders</h2>
            <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">{visibleOrders.length} of {orders.length}</span>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(170px,220px)_minmax(170px,220px)]">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-400">
              <Search size={16} />
              <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} className="w-full bg-transparent py-2.5 text-sm text-white outline-none" placeholder="Search customer name" aria-label="Search customer by name" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-400">
              <Filter size={16} />
              <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="w-full bg-transparent py-2.5 text-sm text-white outline-none" aria-label="Filter orders by status">
                <option value="">All statuses</option>
                {statusOptions.map((option) => <option key={option} value={option}>{option === "awaiting_payment" ? "Unpaid" : statusLabel(option)}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-400">
              <CalendarDays size={16} />
              <input type="date" value={orderDateFilter} onChange={(event) => setOrderDateFilter(event.target.value)} className="w-full bg-transparent py-2.5 text-sm text-white outline-none" aria-label="Filter orders by date" />
            </label>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No orders yet.</div> : visibleOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">No orders match these filters.</div> : visibleOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Order #{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="mt-1 text-lg font-bold text-white">{order.customer_name}</div>
                    <div className="text-sm text-slate-400">{order.customer_phone} · {order.city || "City not set"}</div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total</div>
                      <div className="text-lg font-bold text-white">{money(order.total)}</div>
                    </div>
                    <select
                      value={order.status}
                      onChange={(event) => void updateOrderStatus(order.id, event.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                      disabled={busyOrderId === order.id}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>{statusLabel(option)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(order.address || order.notes) && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                    {order.address && <div>{order.address}</div>}
                    {order.notes && <div className="mt-1 text-slate-400">Note: {order.notes}</div>}
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {(order.order_items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-t border-slate-800 pt-2 text-sm text-slate-300">
                      <span>{item.product_name} × {item.quantity}</span>
                      <span>{money(Number(item.unit_price) * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
