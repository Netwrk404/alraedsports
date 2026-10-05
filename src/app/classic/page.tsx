"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Heart,
  Menu,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Star,
  UserRound,
  X,
} from "lucide-react";
import AthleteShowcase from "../AthleteShowcase";
import { auth, firebaseEnabled, signInWithGoogle, subscribeToAuth } from "@/lib/firebase";

type CustomerAddress = { id: string; label: string; city: string; address: string; is_default: boolean };
type CustomerProfile = { full_name: string | null; email: string | null; phone: string | null; addresses: CustomerAddress[] | null };

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add("is-visible");
        observer.unobserve(element);
      }
    }, { threshold: 0.14 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={elementRef} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}>{children}</div>;
}

function ScrollVideo({ src, eyebrow, title, description, align = "left" }: { src: string; eyebrow: string; title: string; description: string; align?: "left" | "right" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const isMobile = window.matchMedia("(max-width: 700px)").matches;

    if (isMobile) {
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => undefined);
      return;
    }

    const updateVideoFrame = () => {
      frameRef.current = null;
      if (!video.duration || !Number.isFinite(video.duration)) return;
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const rawProgress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / range));
      const progress = 1 - Math.pow(1 - rawProgress, 3);
      const nextTime = progress * video.duration;
      if (Math.abs(video.currentTime - nextTime) > 0.01) video.currentTime = nextTime;
    };
    const handleScroll = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(updateVideoFrame);
    };

    const preventAutoplay = () => video.pause();
    video.pause();
    video.addEventListener("play", preventAutoplay);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    video.addEventListener("loadedmetadata", handleScroll);
    if (video.readyState >= 1) updateVideoFrame();

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      video.removeEventListener("loadedmetadata", handleScroll);
      video.removeEventListener("play", preventAutoplay);
    };
  }, []);

  return (
    <section ref={sectionRef} className={`scroll-video-section scroll-video-${align}`}>
      <div className="scroll-video-stage">
        <video ref={videoRef} className="scroll-video" src={src} muted playsInline preload="metadata" aria-label={title} />
        <div className="scroll-video-shade" />
        <div className="scroll-video-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
          <span className="scroll-video-hint">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></span>
        </div>
      </div>
    </section>
  );
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

const normalizePhoneNumber = (value: string) => {
  if (!value) return "";

  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";

  if (digitsOnly.startsWith("971") && digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    return `+971${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length >= 9) {
    return `+${digitsOnly}`;
  }

  return "";
};

const createWhatsAppLink = (message: string, recipientNumber?: string) => {
  const encoded = encodeURIComponent(message);
  const normalizedRecipient = normalizePhoneNumber(recipientNumber || WHATSAPP_NUMBER || "");
  const digitsOnly = normalizedRecipient.replace(/\D/g, "");

  return digitsOnly
    ? `https://wa.me/${digitsOnly}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  tone: string;
  stock?: number;
  badge?: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

const addProductWithinStock = (cartItems: CartItem[], product: Product) => {
  const availableStock = Math.max(0, Math.floor(Number(product.stock ?? 0)));
  const existingItem = cartItems.find((item) => item.product.id === product.id);
  const currentQuantity = existingItem?.quantity ?? 0;
  const maximumQuantity = Math.min(availableStock, 50);

  if (maximumQuantity === 0) {
    return { cart: cartItems, error: `${product.name} is out of stock.` };
  }
  if (currentQuantity >= maximumQuantity) {
    const message = availableStock === 1
      ? `Only 1 ${product.name} is in stock.`
      : maximumQuantity === 50 && availableStock > 50
        ? "The maximum quantity per product is 50."
        : `Only ${availableStock} ${product.name} in stock.`;
    return { cart: cartItems, error: message };
  }

  if (existingItem) {
    return {
      cart: cartItems.map((item) => item.product.id === product.id ? { ...item, product, quantity: item.quantity + 1 } : item),
      error: null,
    };
  }

  return { cart: [...cartItems, { product, quantity: 1 }], error: null };
};

export const legacySampleProducts: Product[] = [
  {
    id: 1,
    name: "Astrox 100 Tour",
    brand: "YONEX",
    category: "Badminton",
    price: 649,
    oldPrice: 729,
    rating: 4.9,
    reviews: 28,
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=85",
    tone: "#e2e7ef",
    badge: "BEST SELLER",
  },
  {
    id: 2,
    name: "Blade 98 v9",
    brand: "WILSON",
    category: "Tennis",
    price: 799,
    rating: 4.8,
    reviews: 16,
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=85",
    tone: "#dce9df",
    badge: "NEW ARRIVAL",
  },
  {
    id: 3,
    name: "Dunlop Sonic Core",
    brand: "DUNLOP",
    category: "Squash",
    price: 1_099,
    rating: 4.7,
    reviews: 11,
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=85",
    tone: "#dfe8f4",
  },
  {
    id: 4,
    name: "Aerus Z2",
    brand: "YONEX",
    category: "Shoes",
    price: 489,
    oldPrice: 559,
    rating: 4.9,
    reviews: 34,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    tone: "#f0e4dd",
    badge: "-13%",
  },
  {
    id: 5,
    name: "Pro Staff 97 v14",
    brand: "WILSON",
    category: "Tennis",
    price: 899,
    rating: 4.8,
    reviews: 9,
    image: "https://images.unsplash.com/photo-1617083934555-5b4e2c9b4bb5?auto=format&fit=crop&w=900&q=85",
    tone: "#dfe5e0",
  },
  {
    id: 6,
    name: "Tour Team Backpack",
    brand: "HEAD",
    category: "Accessories",
    price: 279,
    rating: 4.6,
    reviews: 19,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
    tone: "#e8e5dc",
  },
  {
    id: 7,
    name: "Nanoflare 800 Pro",
    brand: "YONEX",
    category: "Badminton",
    price: 899,
    rating: 4.9,
    reviews: 21,
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=85",
    tone: "#e0e9f5",
    badge: "NEW ARRIVAL",
  },
  {
    id: 8,
    name: "Power Cushion 65 Z3",
    brand: "YONEX",
    category: "Shoes",
    price: 529,
    rating: 4.8,
    reviews: 18,
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85",
    tone: "#e5edf7",
  },
  {
    id: 9,
    name: "RPM Blast 1.30 String",
    brand: "BABOLAT",
    category: "Strings",
    price: 89,
    rating: 4.7,
    reviews: 12,
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=85",
    tone: "#e8eef5",
  },
  {
    id: 10,
    name: "Pro Overgrip 3 Pack",
    brand: "WILSON",
    category: "Grips",
    price: 39,
    rating: 4.6,
    reviews: 26,
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=85",
    tone: "#dce8f6",
  },
  {
    id: 11,
    name: "Performance Crew Socks",
    brand: "ASICS",
    category: "Socks",
    price: 69,
    rating: 4.8,
    reviews: 17,
    image: "https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=900&q=85",
    tone: "#e8edf4",
  },
  {
    id: 12,
    name: "Club Match Polo",
    brand: "HEAD",
    category: "Apparel",
    price: 199,
    oldPrice: 249,
    rating: 4.7,
    reviews: 8,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=85",
    tone: "#dce7f3",
    badge: "-20%",
  },
  {
    id: 13,
    name: "Team Indoor Court Shoe",
    brand: "ASICS",
    category: "Shoes",
    price: 379,
    rating: 4.8,
    reviews: 15,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    tone: "#e4ebf5",
  },
  {
    id: 14,
    name: "Championship Squash Ball",
    brand: "DUNLOP",
    category: "Squash",
    price: 45,
    rating: 4.9,
    reviews: 31,
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=85",
    tone: "#e7edf4",
  },
  {
    id: 15,
    name: "Astrox 99 Pro",
    brand: "YONEX",
    category: "Badminton",
    price: 1_049,
    rating: 4.9,
    reviews: 42,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_3ax99-p_530-1.png?quality=90&fit=bounds&width=900",
    tone: "#e7edf5",
    badge: "PRO SERIES",
  },
  {
    id: 16,
    name: "Astrox 88S Pro",
    brand: "YONEX",
    category: "Badminton",
    price: 999,
    rating: 4.9,
    reviews: 36,
    image: "https://www.yonex.com/media/catalog/product/3/a/3ax88s-p_417-1_02.png?quality=90&fit=bounds&width=900",
    tone: "#e2eaf5",
  },
  {
    id: 17,
    name: "Astrox 100 ZZ",
    brand: "YONEX",
    category: "Badminton",
    price: 1_149,
    rating: 4.9,
    reviews: 53,
    image: "https://www.yonex.com/media/catalog/product/a/s/astrox100zz_kurenai.png?quality=90&fit=bounds&width=900",
    tone: "#dce7f6",
    badge: "PLAYER FAVOURITE",
  },
  {
    id: 18,
    name: "Astrox DG",
    brand: "YONEX",
    category: "Badminton",
    price: 349,
    rating: 4.6,
    reviews: 18,
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=90",
    tone: "#e8eef7",
  },
  {
    id: 19,
    name: "Astrox Nextage",
    brand: "YONEX",
    category: "Badminton",
    price: 749,
    rating: 4.8,
    reviews: 24,
    image: "https://www.yonex.com/media/catalog/product/a/x/ax-nx__2223_2.png?quality=90&fit=bounds&width=900",
    tone: "#e4edf8",
  },
  {
    id: 20,
    name: "Astrox 99 Game",
    brand: "YONEX",
    category: "Badminton",
    price: 599,
    rating: 4.8,
    reviews: 29,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_3ax99-g_530-1.png?quality=90&fit=bounds&width=900",
    tone: "#e1eaf6",
  },
  {
    id: 21,
    name: "Nanoflare 1000 Tour",
    brand: "YONEX",
    category: "Badminton",
    price: 849,
    rating: 4.9,
    reviews: 31,
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=90",
    tone: "#e3edf9",
    badge: "NEW ARRIVAL",
  },
  {
    id: 32,
    name: "Nanoflare 1000Z",
    brand: "YONEX",
    category: "Badminton",
    price: 1_199,
    rating: 4.9,
    reviews: 47,
    image: "/astroximg.JPG",
    tone: "#dfeafa",
    badge: "SPEED SERIES",
  },
  {
    id: 22,
    name: "Power Cushion Cascade Accel",
    brand: "YONEX",
    category: "Shoes",
    price: 479,
    rating: 4.8,
    reviews: 20,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_shbca2_002-1.jpg?quality=90&fit=bounds&width=900",
    tone: "#e4edf8",
  },
  {
    id: 23,
    name: "Power Cushion Aerus Z",
    brand: "YONEX",
    category: "Shoes",
    price: 529,
    rating: 4.9,
    reviews: 38,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_shbaz2m_207-1.jpg?quality=90&fit=bounds&width=900",
    tone: "#e8eef7",
    badge: "LIGHTWEIGHT",
  },
  {
    id: 24,
    name: "Power Cushion Eclipsion Z",
    brand: "YONEX",
    category: "Shoes",
    price: 579,
    rating: 4.8,
    reviews: 22,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_shbelz3m_532-1.png?quality=90&fit=bounds&width=900",
    tone: "#e0e8f2",
  },
  {
    id: 25,
    name: "Viktor Axelsen Unisex T-Shirt",
    brand: "YONEX",
    category: "Apparel",
    price: 189,
    rating: 4.7,
    reviews: 14,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_16935_011-1.jpg?quality=90&fit=bounds&width=900",
    tone: "#e6edf7",
  },
  {
    id: 26,
    name: "Viktor Axelsen Unisex Polo Shirt",
    brand: "YONEX",
    category: "Apparel",
    price: 229,
    rating: 4.7,
    reviews: 11,
    image: "https://www.yonex.com/media/catalog/product/a/l/all_10819_011-1.jpg?quality=90&fit=bounds&width=900",
    tone: "#e3ebf6",
  },
  {
    id: 27,
    name: "Auraspeed 100X",
    brand: "VICTOR",
    category: "Badminton",
    price: 899,
    rating: 4.8,
    reviews: 17,
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=90",
    tone: "#e2eaf5",
    badge: "VICTOR SERIES",
  },
  {
    id: 28,
    name: "Thruster Ryuga II Pro",
    brand: "VICTOR",
    category: "Badminton",
    price: 949,
    rating: 4.8,
    reviews: 19,
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=90",
    tone: "#e7edf5",
  },
  {
    id: 29,
    name: "P9200TD Court Shoe",
    brand: "VICTOR",
    category: "Shoes",
    price: 449,
    rating: 4.7,
    reviews: 13,
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=90",
    tone: "#e3eaf3",
  },
  {
    id: 30,
    name: "A970 NitroLite Court Shoe",
    brand: "VICTOR",
    category: "Shoes",
    price: 399,
    rating: 4.7,
    reviews: 10,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=90",
    tone: "#e6edf7",
  },
  {
    id: 31,
    name: "Victor Team Performance T-Shirt",
    brand: "VICTOR",
    category: "Apparel",
    price: 159,
    rating: 4.6,
    reviews: 9,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=90",
    tone: "#e1eaf5",
  },
];

const sports = [
  { name: "Badminton", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=92" },
  { name: "Tennis", image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1400&q=92" },
  { name: "Squash", image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1400&q=92" },
  { name: "Accessories", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=92" },
];

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const [liked, setLiked] = useState(false);
  const stock = Math.max(0, Number(product.stock ?? 0));

  return (
    <article className="product-card">
      <div className="product-image" style={{ backgroundColor: product.tone }}>
        <img src={product.image} alt={product.name} />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button className={`heart-button ${liked ? "liked" : ""}`} aria-label={`Add ${product.name} to wishlist`} onClick={() => setLiked(!liked)}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
        </button>
        <button className="quick-add" onClick={() => onAdd(product)} disabled={stock <= 0}>{stock <= 0 ? "SOLD OUT" : <>ADD TO BAG <Plus size={15} /></>}</button>
      </div>
      <div className="product-meta">
        <div className="product-brand">{product.brand}</div>
        <h3>{product.name}</h3>
        {product.rating > 0 && <div className="rating"><Star size={13} fill="currentColor" /><span>{product.rating}</span><span className="review-count">({product.reviews})</span></div>}
        <div className="price-line"><strong>AED {product.price.toLocaleString()}</strong></div>
        <div className={`product-stock ${stock <= 1 ? "product-stock-alert" : ""}`} role="status">
          {stock === 0 ? "OUT OF STOCK" : stock === 1 ? "Hurry, only 1 left" : `${stock} in stock`}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [cartRestored, setCartRestored] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStore = async (restoreCart = false) => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load products.");
        const rows = result.products as Array<Record<string, unknown>>;
        if (!active) return;
        const currentProducts = rows.map((row) => ({
          id: Number(row.id),
          name: String(row.name ?? ""),
          brand: String(row.brand ?? ""),
          category: String(row.category ?? ""),
          price: Number(row.price ?? 0),
          rating: Number(row.rating ?? 0),
          reviews: Number(row.reviews ?? 0),
          image: String(row.image_url ?? ""),
          tone: "#e8edf4",
          stock: Number(row.stock ?? 0),
        }));
        setProducts(currentProducts);
        if (restoreCart) {
          let savedItems: CartItem[] = [];
          try {
            const savedCart = localStorage.getItem("alraed-cart");
            savedItems = savedCart ? JSON.parse(savedCart) as CartItem[] : [];
          } catch {
            localStorage.removeItem("alraed-cart");
          }
          setCart(Array.isArray(savedItems) ? savedItems.flatMap((item) => {
            const product = currentProducts.find((currentProduct) => currentProduct.id === Number(item?.product?.id));
            const quantity = Number(item?.quantity);
            return product && Number.isInteger(quantity) && quantity > 0 ? [{ product, quantity }] : [];
          }) : []);
        } else {
          setCart((current) => current.flatMap((item) => {
            const product = currentProducts.find((currentProduct) => currentProduct.id === item.product.id);
            return product ? [{ ...item, product }] : [];
          }));
        }
        setCatalogError(null);
      } catch (error) {
        if (active && restoreCart) setCatalogError(error instanceof Error ? error.message : "Unable to load products.");
      } finally {
        if (active && restoreCart) {
          setCatalogLoaded(true);
          setCartRestored(true);
        }
      }
    };
    void loadStore(true);
    const refreshCatalog = () => {
      if (document.visibilityState === "visible") void loadStore();
    };
    const refreshTimer = window.setInterval(refreshCatalog, 30_000);
    window.addEventListener("focus", refreshCatalog);
    document.addEventListener("visibilitychange", refreshCatalog);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshCatalog);
      document.removeEventListener("visibilitychange", refreshCatalog);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuth((user) => {
      const loggedIn = Boolean(user);
      setIsLoggedIn(loggedIn);
      setUserName(user?.displayName ?? user?.email ?? null);
      if (!user) {
        setCustomerProfile(null);
        localStorage.setItem("alraed-login", "false");
        return;
      }

      localStorage.setItem("alraed-login", "true");
      void (async () => {
        try {
          const token = await user.getIdToken();
          const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Unable to load your account.");
          if (!active) return;
          const profile = result.profile as CustomerProfile;
          setCustomerProfile(profile);
          const complete = Boolean(profile.phone && profile.addresses?.length);
          if (!complete && pathname !== "/account") router.replace("/account?setup=1");
        } catch {
          if (active && pathname !== "/account") router.replace("/account?setup=1");
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!catalogLoaded || !cartRestored) return;
    localStorage.setItem("alraed-cart", JSON.stringify(cart));
  }, [cart, catalogLoaded, cartRestored]);

  useEffect(() => {
    const handleCategoryShortcut = (event: Event) => {
      const category = (event as CustomEvent<string>).detail;
      setActiveCategory(["Badminton", "Tennis", "Squash", "Accessories"].includes(category) ? category : "Accessories");
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("alraed-category", handleCategoryShortcut);
    return () => window.removeEventListener("alraed-category", handleCategoryShortcut);
  }, []);

  const searchCatalog = useMemo(() => {
    const categorySuggestions = [
      { label: "Badminton", type: "Category", value: "badminton" },
      { label: "Tennis", type: "Category", value: "tennis" },
      { label: "Squash", type: "Category", value: "squash" },
      { label: "Accessories", type: "Category", value: "accessories" },
    ];

    const brandSuggestions = Array.from(new Set(products.map((product) => product.brand))).map((brand) => ({
      label: brand,
      type: "Brand",
      value: brand.toLowerCase(),
    }));

    const productSuggestions = products.map((product) => ({
      label: `${product.brand} ${product.name} ${product.category}`,
      type: "Product",
      value: `${product.brand} ${product.name} ${product.category} ${product.name.replace(/\s+/g, "").toLowerCase()}`,
    }));

    return [...categorySuggestions, ...brandSuggestions, ...productSuggestions];
  }, [products]);

  const searchSuggestions = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const tokens = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);

    return searchCatalog.filter(({ label, value }) => {
      const searchable = `${label} ${value}`.toLowerCase();
      return tokens.every((token) => searchable.includes(token));
    }).slice(0, 8);
  }, [query, searchCatalog]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesQuery = `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [activeCategory, products, query]);

  const applySearch = (nextValue: string) => {
    const value = nextValue.trim();
    if (!value) {
      setQuery("");
      setSearchFocused(false);
      return;
    }

    setQuery(value);
    setSearchFocused(false);
    const matchedCategory = ["Badminton", "Tennis", "Squash", "Accessories"].find(
      (category) => category.toLowerCase() === value.toLowerCase() || value.toLowerCase().includes(category.toLowerCase())
    );

    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    }

    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };

  const addToCart = (product: Product) => {
    if (!isLoggedIn) {
      setPendingProduct(product);
      setAuthModalOpen(true);
      return;
    }

    const update = addProductWithinStock(cart, product);
    setCartError(update.error);
    if (!update.error) setCart(update.cart);
    setCartOpen(true);
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);

    if (!firebaseEnabled) {
      setAuthError("Firebase is not configured yet. Add your Firebase values in the environment to enable Google login.");
      return;
    }

    try {
      const result = await signInWithGoogle();
      const signedInUser = result.user;
      setUserName(signedInUser.displayName ?? signedInUser.email ?? "Google customer");
      setIsLoggedIn(true);
      setAuthModalOpen(false);

      if (pendingProduct) {
        const update = addProductWithinStock(cart, pendingProduct);
        setCartError(update.error);
        if (!update.error) setCart(update.cart);
        setCartOpen(true);
        setPendingProduct(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in with Google right now.";
      setAuthError(message);
    }
  };

  const handleLogout = async () => {
    router.push("/account");
  };

  const updateQuantity = (productId: number, change: number) => {
    const item = cart.find((cartItem) => cartItem.product.id === productId);
    if (!item) return;

    const nextQuantity = item.quantity + change;
    const availableStock = Math.max(0, Math.floor(Number(item.product.stock ?? 0)));
    const maximumQuantity = Math.min(availableStock, 50);
    if (nextQuantity > maximumQuantity) {
      setCartError(availableStock === 0
        ? `${item.product.name} is out of stock.`
        : availableStock === 1
          ? `Only 1 ${item.product.name} is in stock.`
          : maximumQuantity === 50 && availableStock > 50
            ? "The maximum quantity per product is 50."
            : `Only ${availableStock} ${item.product.name} in stock.`);
      return;
    }

    setCartError(null);
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity + change } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const openCheckout = () => {
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      return;
    }

    const overstockedItem = cart.find((item) => item.quantity > Math.min(Math.max(0, Number(item.product.stock ?? 0)), 50));
    if (overstockedItem) {
      const availableStock = Math.max(0, Number(overstockedItem.product.stock ?? 0));
      setCartError(availableStock === 0
        ? `${overstockedItem.product.name} is out of stock. Remove it from your bag to continue.`
        : `Only ${availableStock} ${overstockedItem.product.name} in stock. Reduce the quantity to continue.`);
      return;
    }

    const savedAddresses = customerProfile?.addresses ?? [];
    if (!customerProfile?.phone || savedAddresses.length === 0) {
      router.push("/account?setup=1");
      return;
    }

    setCartOpen(false);
    setSelectedAddressId(savedAddresses.find((address) => address.is_default)?.id ?? savedAddresses[0].id);
    setCheckoutNotes("");
    setAuthError(null);
    setCheckoutOpen(true);
  };

  const handleCheckoutSubmit = async () => {
    const overstockedItem = cart.find((item) => item.quantity > Math.min(Math.max(0, Number(item.product.stock ?? 0)), 50));
    if (overstockedItem) {
      const availableStock = Math.max(0, Number(overstockedItem.product.stock ?? 0));
      setCheckoutOpen(false);
      setCartOpen(true);
      setCartError(availableStock === 0
        ? `${overstockedItem.product.name} is out of stock. Remove it from your bag to continue.`
        : `Only ${availableStock} ${overstockedItem.product.name} in stock. Reduce the quantity to continue.`);
      return;
    }

    const savedAddresses = customerProfile?.addresses ?? [];
    const shippingAddress = savedAddresses.find((address) => address.id === selectedAddressId) ?? savedAddresses.find((address) => address.is_default);
    const customerPhone = normalizePhoneNumber(customerProfile?.phone || "");
    const businessPhone = normalizePhoneNumber(WHATSAPP_NUMBER || "");

    if (!customerProfile || !shippingAddress || !customerPhone) {
      setCheckoutOpen(false);
      router.push("/account?setup=1");
      return;
    }

    if (!businessPhone) {
      setAuthError("Set NEXT_PUBLIC_WHATSAPP_NUMBER in the environment to enable WhatsApp checkout.");
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");

    if (!whatsappWindow) {
      setAuthError("Your browser blocked the WhatsApp popup. Please allow popups and try again.");
      return;
    }
    setCheckoutBusy(true);
    setAuthError(null);

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) throw new Error("Your sign-in session expired. Please sign in again.");
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: cart,
          addressId: shippingAddress.id,
          notes: checkoutNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        whatsappWindow.close();
        setAuthError(result?.error || "Unable to save the order right now.");
        return;
      }

      const confirmedItems = Array.isArray(result.items) ? result.items as Array<{ product_name: string; quantity: number; unit_price: number }> : [];
      const confirmedTotal = Number(result.total);
      if (confirmedItems.length === 0 || !Number.isFinite(confirmedTotal)) {
        throw new Error("The order was saved, but its confirmed price summary could not be prepared. Contact the store with your order reference.");
      }
      const orderLines = confirmedItems
        .map((item, index) => `${index + 1}. ${item.product_name} x ${item.quantity} - AED ${(Number(item.unit_price) * item.quantity).toLocaleString()}`)
        .join("\n");
      const summary = `Hello Al Raed Sports,\n\nI would like to confirm this order. Please let me know the available payment options and next steps.\n\nCustomer details:\nName: ${customerProfile.full_name || userName || "Customer"}\nEmail: ${customerProfile.email || "Not provided"}\nPhone: ${customerPhone}\nCity: ${shippingAddress.city}\nAddress: ${shippingAddress.address}\nNotes: ${checkoutNotes.trim() || "None"}\n\nOrder details:\n${orderLines}\n\nTotal: AED ${confirmedTotal.toLocaleString()}\n\nPayment: To be arranged manually via WhatsApp.\n\nPlease confirm this order and advise how to complete payment. Thank you.`;

      const orderId = result?.orderId ? String(result.orderId).slice(0, 8).toUpperCase() : "NEW";
      const orderNumberMessage = `Order reference: #${orderId}\n`;
      whatsappWindow.location.href = createWhatsAppLink(
        `${summary}\n${orderNumberMessage}`,
        businessPhone
      );
      setCheckoutOpen(false);
      setCart([]);
      localStorage.setItem("alraed-cart", JSON.stringify([]));
      setCheckoutSuccess("Your order is saved and your payment request has been sent via WhatsApp.");
      window.setTimeout(() => setCheckoutSuccess(null), 8000);
    } catch (error) {
      whatsappWindow.close();
      const message = error instanceof Error ? error.message : "Unable to save the order right now.";
      setAuthError(message);
    } finally {
      setCheckoutBusy(false);
    }
  };

  const browseCategory = (category: string) => setActiveCategory(category);
  const featuredProducts = products.slice(0, 6);

  return (
    <main>
      <header className="site-header">
        <div className="header-group header-group-logo">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu size={21} /></button>
          <img className="brand-mark" src="/IMG_8477.jpg%2010-33-16-710.jpg" alt="Al Raed Sports logo" />
        </div>

        <div className="header-group header-group-brand">
          <a className="logo" href="#top" aria-label="Al Raed Sports home"><span>AL RAED SPORTS</span></a>
        </div>

        <div className="header-group header-group-nav">
          <nav className={menuOpen ? "nav open" : "nav"}>
            {['Shop', 'Badminton', 'Tennis', 'Squash', 'Apparel', 'Brands'].map((item) => <a href={item === 'Shop' ? '#shop' : '#categories'} key={item}>{item}</a>)}
          </nav>
        </div>

        <div className="header-group header-group-search">
          <div className="header-actions">
            <div className="search-wrap">
              <label className="search-box" aria-label="Search products">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                  placeholder="Search products"
                  aria-label="Search products"
                />
              </label>
              {searchFocused && query.trim() && searchSuggestions.length > 0 && (
                <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.type}-${suggestion.label}`}
                      type="button"
                      className="search-suggestion"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applySearch(suggestion.value)}
                    >
                      <span className="search-suggestion-label">{suggestion.label}</span>
                      <small>{suggestion.type}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="search-submit" type="button" aria-label="Search" onClick={() => applySearch(query)}>
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="header-group header-group-profile">
          <button className="icon-button login-indicator" aria-label="Account" onClick={() => (isLoggedIn ? handleLogout() : setAuthModalOpen(true))}>
            <UserRound size={19} />
            <span>{isLoggedIn ? "Account" : "Login"}</span>
          </button>
          <button className="icon-button" aria-label="Wishlist"><Heart size={19} /></button>
        </div>

        <div className="header-group header-group-cart">
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Open shopping bag"><ShoppingBag size={19} /><span>{cartCount}</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow">EQUIPMENT FOR THE DRIVEN</p><h1>PLAY<br /><em>YOUR</em> BEST.</h1><p className="hero-description">Premium equipment and essentials for every rally, match and moment in between.</p><a className="lime-button" href="#shop">SHOP THE COLLECTION <ArrowRight size={17} /></a></div>
        <div className="hero-photo"><div className="hero-overlay" /><img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=2200&q=95" alt="Badminton racket and shuttlecock on a court" /></div>
        <div className="hero-foot"><span>01</span><div className="hero-progress"><i /></div><span>03</span></div>
      </section>

      <section className="trust-strip"><div><strong>01</strong><span>AUTHENTIC PRODUCTS<br /><small>Curated from trusted brands</small></span></div><div><strong>02</strong><span>UAE DELIVERY<br /><small>Across all seven emirates</small></span></div><div><strong>03</strong><span>LOCAL SUPPORT<br /><small>Real people, ready to help</small></span></div><div><strong>04</strong><span>SECURE CHECKOUT<br /><small>Pay with total confidence</small></span></div></section>

      <ScrollVideo src="/animation1.mp4" eyebrow="MOTION IN EVERY DETAIL" title="Built to move." description="Follow the flow. Every frame reveals the feeling behind the game." />

      <AthleteShowcase onBrowse={browseCategory} />

      <Reveal><section className="content-section" id="categories"><div className="section-heading"><div><p className="eyebrow">FIND YOUR GAME</p><h2>Shop by <em>sport.</em></h2></div><a className="text-link" href="#shop">VIEW ALL <ArrowRight size={16} /></a></div><div className="sport-grid">{sports.map((sport, index) => <a className="sport-card" href="#shop" onClick={() => setActiveCategory(sport.name)} key={sport.name} style={{ "--card-delay": `${index * 90}ms` } as React.CSSProperties}><img src={sport.image} alt={sport.name} /><div className="sport-shade" /><div className="sport-label"><span>0{index + 1}</span><div><h3>{sport.name}</h3><p>{products.filter((product) => product.category === sport.name).length} products</p></div><ChevronRight size={20} /></div></a>)}</div></section></Reveal>

      <ScrollVideo src="/animation3.mp4" eyebrow="VICTOR" title="Choose your weapon." description="Explore performance rackets and court shoes from the brands trusted by serious players." align="left" />

      {featuredProducts.length > 0 && <Reveal><section className="featured-product-slider"><div className="featured-product-track" style={{ transform: `translateX(-${featuredIndex * 100}%)` }}>{featuredProducts.map((product) => <article className="featured-product" key={product.id}><div className="featured-product-image">{product.image && <img src={product.image} alt={product.name} />}<span>{product.category.toUpperCase()}</span></div><div className="featured-product-copy"><p className="eyebrow">JUST ADDED</p><div className="featured-brand">{product.brand}</div><h2>{product.name}</h2>{product.rating > 0 && <div className="featured-rating"><Star size={14} fill="currentColor" /> {product.rating} <span>({product.reviews} reviews)</span></div>}<p className="featured-description">Available now in our {product.category.toLowerCase()} collection. Check the current stock before adding it to your bag.</p><div className="featured-specs"><div><small>CATEGORY</small><strong>{product.category}</strong></div><div><small>INVENTORY</small><strong>{product.stock ?? 0} UNITS</strong></div><div><small>BRAND</small><strong>{product.brand}</strong></div></div><div className="featured-buy"><strong>AED {product.price.toLocaleString()}</strong><button className="dark-button" onClick={() => addToCart(product)} disabled={product.stock === 0}>{product.stock === 0 ? "SOLD OUT" : <>ADD TO BAG <ShoppingBag size={16} /></>}</button></div><button className="featured-next" onClick={() => setFeaturedIndex((current) => (current + 1) % featuredProducts.length)} aria-label="Show next featured product"><span>NEXT PRODUCT</span><ArrowRight size={18} /></button></div></article>)}</div><div className="featured-dots" aria-label="Featured products">{featuredProducts.map((product, index) => <button key={product.id} className={featuredIndex === index ? "active" : ""} onClick={() => setFeaturedIndex(index)} aria-label={`Show ${product.name}`} />)}</div></section></Reveal>}

      <Reveal><section className="content-section products-section" id="shop"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Shop <em>equipment.</em></h2></div><div className="category-tabs">{["All", "Badminton", "Tennis", "Squash", "Accessories"].map((category) => <button data-category={category} className={activeCategory === category ? "active" : ""} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}</div></div>{query && <p className="search-note">Showing results for <strong>&ldquo;{query}&rdquo;</strong></p>}<div className="product-grid">{!catalogLoaded ? <div className="catalog-empty">Loading products...</div> : catalogError ? <div className="catalog-empty" role="alert">{catalogError}</div> : filteredProducts.length === 0 ? <div className="catalog-empty">{products.length === 0 ? "No products are listed yet. New items will appear here when published." : "No products match your search or category."}</div> : filteredProducts.map((product, index) => <div className="product-reveal" style={{ "--card-delay": `${index * 65}ms` } as React.CSSProperties} key={product.id}><ProductCard product={product} onAdd={addToCart} /></div>)}</div></section></Reveal>

      <ScrollVideo src="/animation2.mp4" eyebrow="THE NEXT RALLY" title="Find your edge." description="Scroll through the motion and discover equipment made for your most committed moments." align="right" />

      <Reveal><section className="campaign"><div className="campaign-image"><img src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=85" alt="Runner in motion" /></div><div className="campaign-copy"><p className="eyebrow">THE AL RAED STANDARD</p><h2>Made for<br /><em>the next point.</em></h2><p>From first serve to final set, the right kit changes everything. Explore gear selected for players who show up.</p><a className="dark-button" href="#shop">DISCOVER THE EDIT <ArrowRight size={16} /></a></div></section></Reveal>

      <Reveal><section className="store-section"><div className="store-intro"><p className="eyebrow">TRY IT IN PERSON</p><h2>Feel the<br /><em>difference.</em></h2><p>Not sure which racket is right for your game? Visit one of our stores, pick up the latest gear and get closer to your next best match.</p><a className="lime-button" href="#stores">FIND A STORE <ArrowRight size={16} /></a></div><div className="store-list" id="stores"><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Al+Raed+Sports+Madinat+Zayed" target="_blank" rel="noreferrer"><span className="store-number">01</span><div><MapPin size={18} /><h3>Al Raed Sports<br />Madinat Zayed</h3><p>United Arab Emirates <ArrowRight size={14} /></p></div></a><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Alraed+Sports+Shop+UAE" target="_blank" rel="noreferrer"><span className="store-number">02</span><div><MapPin size={18} /><h3>Alraed Sports<br />Shop</h3><p>United Arab Emirates <ArrowRight size={14} /></p></div></a><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Yonex+Store+Bahrain" target="_blank" rel="noreferrer"><span className="store-number">03</span><div><MapPin size={18} /><h3>Yonex Store<br />Bahrain</h3><p>Kingdom of Bahrain <ArrowRight size={14} /></p></div></a></div></section></Reveal>

      <Reveal><section className="content-section brands-section"><div className="section-heading"><div><p className="eyebrow">TRUSTED BY PLAYERS</p><h2>Brands that<br /><em>move with you.</em></h2></div><a className="text-link" href="#shop">ALL BRANDS <ArrowRight size={16} /></a></div><div className="brand-list"><span>YONEX</span><span>WILSON</span><span>HEAD</span><span>BABOLAT</span><span>VICTOR</span></div><div className="brand-marquee" aria-label="Al Raed Sports product categories"><div><span>RACKETS</span><i>✦</i><span>COURT SHOES</span><i>✦</i><span>STRINGS & GRIPS</span><i>✦</i><span>PLAYER APPAREL</span><i>✦</i><span>RACKETS</span><i>✦</i><span>COURT SHOES</span><i>✦</i></div></div></section></Reveal>

      <div className="quick-rail"><a href="#shop" aria-label="Jump to products"><ShoppingBag size={16} /></a><a href="#categories" aria-label="Jump to sports"><ChevronRight size={16} /></a><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button></div>

      <footer className="footer"><div className="footer-top"><div><a className="logo footer-logo" href="#top"><img src="/IMG_8477.jpg%2010-33-16-710.jpg" alt="" /><span>AL RAED SPORTS</span></a><p>Premium sports equipment<br />for the UAE in motion.</p></div><div className="footer-links"><div><h4>SHOP</h4><a href="#shop">All products</a><a href="#categories">Badminton</a><a href="#categories">Tennis</a><a href="#categories">Squash</a></div><div><h4>ESSENTIALS</h4><a href="#shop">Rackets</a><a href="#shop">Shoes</a><a href="#shop">Strings & grips</a><a href="#shop">Socks & apparel</a></div><div><h4>FOLLOW</h4><a href="#top">Instagram</a><a href="#top">WhatsApp</a><a href="https://alraedgroup.ae">Al Raed Group</a></div></div><div className="newsletter"><h4>STAY IN THE GAME</h4><p>New drops, player edits and store news.</p><div className="email-field"><input placeholder="Your email address" aria-label="Your email address" /><button aria-label="Subscribe"><ArrowRight size={17} /></button></div></div></div><div className="footer-bottom"><span>© 2026 AL RAED SPORTS</span><span>AN AL RAED GROUP OF COMPANIES BUSINESS</span><span>MADE FOR THE UAE</span></div></footer>

      {authModalOpen && (
        <div className="drawer-backdrop" onClick={() => setAuthModalOpen(false)}>
          <aside className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal-header">
              <p className="eyebrow">SIGN IN REQUIRED</p>
              <button onClick={() => setAuthModalOpen(false)} aria-label="Close login dialog"><X size={18} /></button>
            </div>

            <h3>Please login to add items to your cart.</h3>
            <p>Use your Google account to continue shopping and place your order.</p>

            {authError && <div className="auth-error">{authError}</div>}

            <button className="auth-login-button" onClick={handleGoogleLogin}>
              <span className="google-mark">G</span>
              Continue with Google
            </button>

            <div className="auth-helpers">
              <span>Secure sign-in</span>
              <span>No payment yet</span>
            </div>
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="drawer-backdrop" onClick={() => setCheckoutOpen(false)}>
          <aside className="checkout-modal" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">ORDER DETAILS</p>
                <h2>Checkout</h2>
              </div>
              <button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout form"><X size={21} /></button>
            </div>

            <div className="checkout-form">
              <div className="checkout-customer"><UserRound size={17} /><div><strong>{customerProfile?.full_name || userName || "Customer"}</strong><span>{customerProfile?.email}</span><span>{customerProfile?.phone}</span></div></div>
              <label>
                <span>Deliver to</span>
                <select className="checkout-address-select" value={selectedAddressId} onChange={(event) => setSelectedAddressId(event.target.value)}>
                  {(customerProfile?.addresses ?? []).map((address) => <option key={address.id} value={address.id}>{address.label} · {address.city}{address.is_default ? " · Default" : ""}</option>)}
                </select>
              </label>
              {(() => {
                const address = customerProfile?.addresses?.find((item) => item.id === selectedAddressId);
                return address ? <div className="checkout-address-summary"><MapPin size={15} /><span>{address.address}<br />{address.city}</span><button onClick={() => { setCheckoutOpen(false); router.push("/account"); }}>Change</button></div> : null;
              })()}
              <label>
                <span>Delivery note <small>Optional</small></span>
                <textarea value={checkoutNotes} onChange={(event) => setCheckoutNotes(event.target.value)} placeholder="Anything the delivery team should know?" rows={2} />
              </label>
            </div>

            <div className="drawer-summary">
              <div>
                <span>Total</span>
                <strong>AED {cartTotal.toLocaleString()}</strong>
              </div>
              <p>Your saved details and order summary will be sent to Al Raed Sports for confirmation.</p>
              {authError && <div className="auth-error" role="alert">{authError}</div>}
              <button className="dark-button full-button" onClick={handleCheckoutSubmit} disabled={checkoutBusy}>{checkoutBusy ? "SAVING YOUR ORDER..." : "CONFIRM & SEND VIA WHATSAPP"} <ArrowRight size={16} /></button>
            </div>
          </aside>
        </div>
      )}

      {checkoutSuccess && <div className="checkout-success-toast" role="status"><span><Check size={16} /></span><div><strong>Order request sent</strong><p>{checkoutSuccess}</p></div><button onClick={() => setCheckoutSuccess(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><p className="eyebrow">YOUR SELECTION</p><h2>Shopping bag <span>({cartCount})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close shopping bag"><X size={21} /></button></div>{cartError && <div className="cart-stock-error" role="alert">{cartError}</div>}{cart.length === 0 ? <div className="empty-bag"><ShoppingBag size={30} /><p>Your bag is waiting.</p><span>Add something that makes you want to play.</span></div> : <><div className="drawer-items">{cart.map((item) => { const availableStock = Math.max(0, Number(item.product.stock ?? 0)); const exceedsStock = item.quantity > availableStock; return <div className="drawer-item" key={item.product.id}><img src={item.product.image} alt={item.product.name} /><div><strong>{item.product.brand}</strong><p>{item.product.name}</p>{exceedsStock ? <span className="cart-stock-error">{availableStock === 0 ? "Out of stock" : `Only ${availableStock} in stock. Reduce quantity.`}</span> : availableStock === 1 ? <span className="cart-stock-low">Hurry, only 1 left</span> : <span>{availableStock} in stock</span>}<span>AED {(item.product.price * item.quantity).toLocaleString()}</span></div><div className="drawer-item-actions"><div className="quantity-stepper"><button aria-label={`Decrease ${item.product.name} quantity`} onClick={() => updateQuantity(item.product.id, -1)}>-</button><span>{item.quantity}</span><button aria-label={`Increase ${item.product.name} quantity`} onClick={() => updateQuantity(item.product.id, 1)}>+</button></div><button aria-label={`Remove ${item.product.name} from bag`} onClick={() => { setCart((current) => current.filter((cartItem) => cartItem.product.id !== item.product.id)); setCartError(null); }}><X size={15} /></button></div></div>; })}</div><div className="drawer-summary"><div><span>Subtotal</span><strong>AED {cartTotal.toLocaleString()}</strong></div><p>Delivery calculated at checkout.</p><button className="dark-button full-button" onClick={openCheckout}>CHECKOUT <ArrowRight size={16} /></button></div></>}</aside></div>}
    </main>
  );
}
