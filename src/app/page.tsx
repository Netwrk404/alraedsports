"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductDetailDialog from "@/components/storefront/ProductDetailDialog";
import { mapStoreProduct, type CartLine, type StoreProduct } from "@/lib/store-products";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  const product = line.product;
  if (typeof product !== "object" || product === null || Array.isArray(product)) return false;
  const item = product as Record<string, unknown>;
  return typeof line.quantity === "number"
    && Number.isSafeInteger(line.quantity)
    && line.quantity > 0
    && typeof item.id === "number"
    && Number.isSafeInteger(item.id)
    && typeof item.name === "string"
    && typeof item.brand === "string"
    && typeof item.category === "string"
    && typeof item.price === "number"
    && Number.isFinite(item.price)
    && typeof item.image === "string"
    && typeof item.rating === "number"
    && Number.isFinite(item.rating)
    && typeof item.reviews === "number"
    && Number.isSafeInteger(item.reviews)
    && typeof item.stock === "number"
    && Number.isSafeInteger(item.stock);
}

const categories = [
  { name: "Badminton", note: "Find your flight", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=85" },
  { name: "Tennis", note: "Own the court", image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=85" },
  { name: "Squash", note: "Play at pace", image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=85" },
  { name: "Accessories", note: "The little things", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85" },
];

const campaigns = [
  {
    eyebrow: "THE COURT IS YOURS",
    title: <>Find your<br /><em>next level.</em></>,
    description: "Good gear changes the game. Find the kit that feels like it was made for yours.",
    cta: "SHOP THE COLLECTION",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=2200&q=90",
    label: "BUILT FOR YOUR GAME",
  },
  {
    eyebrow: "MADE TO MOVE",
    title: <>Play with<br /><em>purpose.</em></>,
    description: "Meet the latest court-ready arrivals, selected for players who never stand still.",
    cta: "DISCOVER WHAT'S NEW",
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=2200&q=90",
    label: "NEW SEASON · NEW ENERGY",
  },
  {
    eyebrow: "YOUR GAME. YOUR RULES.",
    title: <>Better days<br /><em>start here.</em></>,
    description: "From first serve to match point, get everything you need to make it count.",
    cta: "FIND YOUR SPORT",
    image: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=2200&q=90",
    label: "MADE FOR UAE COURTS",
  },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(amount);

function ProductTile({
  product,
  liked,
  onLike,
  onAdd,
  onView,
  added,
}: {
  product: StoreProduct;
  liked: boolean;
  onLike: (id: number) => void;
  onAdd: (product: StoreProduct) => void;
  onView: (product: StoreProduct) => void;
  added: boolean;
}) {
  return (
    <article className="ar-product">
      <div className="ar-product-image">
        {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span className="ar-product-placeholder">AL RAED<br />SPORTS</span>}
        <button className="ar-product-open" type="button" onClick={() => onView(product)} aria-label={`View details for ${product.name}`} />
        {product.stock <= 3 && product.stock > 0 && <span className="ar-product-badge">LOW STOCK</span>}
        <button className={`ar-wishlist ${liked ? "is-liked" : ""}`} type="button" onClick={() => onLike(product.id)} aria-label={`${liked ? "Remove" : "Add"} ${product.name} ${liked ? "from" : "to"} wishlist`}>
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <button className="ar-quick-add" type="button" onClick={() => onAdd(product)} disabled={product.stock <= 0} aria-label={`Add ${product.name} to bag`}>
          {product.stock <= 0 ? "SOLD OUT" : added ? <><Check size={15} /> ADDED</> : <>ADD TO BAG <Plus size={15} /></>}
        </button>
      </div>
      <div className="ar-product-copy">
        <div className="ar-product-kicker"><span>{product.brand || "AL RAED"}</span>{product.rating > 0 && <span>★ {product.rating.toFixed(1)}</span>}</div>
        <h3><button className="ar-product-title-button" type="button" onClick={() => onView(product)}>{product.name}</button></h3>
        <button className="ar-product-details-link" type="button" onClick={() => onView(product)}>VIEW DETAILS <ArrowUpRight size={12} /></button>
        <div className="ar-product-bottom"><strong>{money(product.price)}</strong>{product.stock > 0 && <small>{product.stock < 4 ? `Only ${product.stock} left` : "In stock"}</small>}</div>
      </div>
    </article>
  );
}

function ScrollFilm() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;

    if (reduceMotion) {
      video.pause();
      return;
    }

    if (mobile) {
      video.loop = true;
      video.play().catch(() => undefined);
      return;
    }

    const updateFrame = () => {
      frameRef.current = null;
      if (!video.duration || !Number.isFinite(video.duration)) return;
      const scrollRange = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrollProgress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / scrollRange));
      const easedProgress = 1 - Math.pow(1 - scrollProgress, 3);
      const targetTime = easedProgress * video.duration;
      if (Math.abs(video.currentTime - targetTime) > 0.02) video.currentTime = targetTime;
    };
    const scheduleFrame = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(updateFrame);
    };
    const pausePlayback = () => video.pause();

    video.pause();
    video.addEventListener("play", pausePlayback);
    video.addEventListener("loadedmetadata", scheduleFrame);
    window.addEventListener("scroll", scheduleFrame, { passive: true });
    window.addEventListener("resize", scheduleFrame);
    if (video.readyState >= 1) updateFrame();

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      video.removeEventListener("play", pausePlayback);
      video.removeEventListener("loadedmetadata", scheduleFrame);
      window.removeEventListener("scroll", scheduleFrame);
      window.removeEventListener("resize", scheduleFrame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="ar-scroll-film" aria-label="Choose your equipment">
      <div className="ar-scroll-film-stage">
        <video ref={videoRef} className="ar-scroll-film-video" src="/animation3.mp4" muted playsInline preload="metadata" aria-label="Racquet sports equipment in motion" />
        <div className="ar-scroll-film-shade" />
        <div className="ar-scroll-film-copy">
          <p className="ar-eyebrow"><span /> VICTOR · YONEX · MADE FOR YOUR GAME</p>
          <h2>Choose your<br /><em>weapon.</em></h2>
          <p>Every rally starts somewhere. Explore performance racquets and court shoes from the brands players trust.</p>
          <Link className="ar-button ar-button-light" href="/shop?category=Badminton">FIND YOUR NEXT RACQUET <ArrowRight size={16} /></Link>
          <span className="ar-scroll-film-hint"><span /> SCROLL TO FEEL THE DIFFERENCE</span>
        </div>
        <div className="ar-scroll-film-index"><span>01</span><i /><span>03</span><small>BUILT FOR THE NEXT POINT</small></div>
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [wishlistReady, setWishlistReady] = useState(false);
  const [campaignIndex, setCampaignIndex] = useState(0);
  const [justAdded, setJustAdded] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        const result: { products?: Array<Record<string, unknown>>; error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error || "The product catalog could not be loaded.");
        return result.products ?? [];
      })
      .then((rows) => {
        if (!active) return;
        setProducts(rows.map(mapStoreProduct));
        setCatalogState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCatalogError(error instanceof Error ? error.message : "The product catalog could not be loaded.");
        setCatalogState("error");
      });

    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("alraed-storefront-cart");
        if (saved) {
          const parsedCart: unknown = JSON.parse(saved);
          if (Array.isArray(parsedCart)) setCart(parsedCart.filter(isCartLine));
        }
        const savedWishlist = localStorage.getItem("alraed-storefront-wishlist");
        if (savedWishlist) {
          const parsedWishlist: unknown = JSON.parse(savedWishlist);
          if (Array.isArray(parsedWishlist)) setWishlist(parsedWishlist.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0));
        }
      } catch {
        localStorage.removeItem("alraed-storefront-cart");
        localStorage.removeItem("alraed-storefront-wishlist");
      }
      setCartReady(true);
      setWishlistReady(true);
    });

    return () => {
      active = false;
      window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    if (catalogState !== "ready") return;
    const match = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (match.matches) return;
    const timer = window.setInterval(() => setCampaignIndex((index) => (index + 1) % campaigns.length), 6500);
    return () => window.clearInterval(timer);
  }, [catalogState]);

  useEffect(() => {
    const timer = window.setInterval(() => setAnnouncementIndex((index) => (index + 1) % 3), 4500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (cartReady) localStorage.setItem("alraed-storefront-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    if (wishlistReady) localStorage.setItem("alraed-storefront-wishlist", JSON.stringify(wishlist));
  }, [wishlist, wishlistReady]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!cartOpen && !menuOpen && !selectedProduct) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCartOpen(false);
        setMenuOpen(false);
        setSelectedProduct(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [cartOpen, menuOpen, selectedProduct]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [products, activeCategory, query]);

  const newArrivals = products.slice(0, 10);
  const bestSellers = [...products].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 10);
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const suggestions = query ? products.filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

  const addToCart = useCallback((product: StoreProduct, requestedQuantity = 1) => {
    if (product.stock < 1) return;
    setCart((items) => {
      const existing = items.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.quantity >= Math.min(product.stock, 50)) return items;
        return items.map((line) => line.product.id === product.id ? { ...line, product, quantity: Math.min(line.quantity + requestedQuantity, product.stock, 50) } : line);
      }
      return [...items, { product, quantity: Math.min(requestedQuantity, product.stock, 50) }];
    });
    setJustAdded((items) => [...items.filter((id) => id !== product.id), product.id]);
    window.setTimeout(() => setJustAdded((items) => items.filter((id) => id !== product.id)), 1500);
  }, []);

  const changeQuantity = (id: number, delta: number) => setCart((items) => items.flatMap((line) => {
    if (line.product.id !== id) return [line];
    const next = line.quantity + delta;
    return next > 0 ? [{ ...line, quantity: Math.min(next, Math.min(line.product.stock, 50)) }] : [];
  }));

  const toggleWishlist = (id: number) => setWishlist((items) => {
    const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    return next;
  });

  const scrollRail = (direction: "left" | "right") => railRef.current?.scrollBy({ left: direction === "right" ? 520 : -520, behavior: "smooth" });
  const selectCategory = (name: string) => {
    setMenuOpen(false);
    navRef.current?.querySelectorAll("details").forEach((details) => { details.open = false; });
    router.push(name === "All" ? "/shop" : `/shop?category=${encodeURIComponent(name)}`);
  };
  const closeNavDropdowns = () => navRef.current?.querySelectorAll("details").forEach((details) => { details.open = false; });
  const viewProduct = (product: StoreProduct) => {
    closeNavDropdowns();
    setMenuOpen(false);
    setSearchOpen(false);
    setSelectedProduct(product);
  };
  const addProductDetailsToCart = (product: StoreProduct, quantity: number) => {
    addToCart(product, quantity);
    setSelectedProduct(null);
    setCartOpen(true);
  };
  const openFavourites = () => {
    closeNavDropdowns();
    setMenuOpen(false);
    document.getElementById("player-favourites")?.scrollIntoView({ behavior: "smooth" });
  };
  const menuProducts = (categoryName?: string) => {
    const matchingProducts = categoryName
      ? products.filter((product) => product.category.toLowerCase() === categoryName.toLowerCase())
      : products;
    return matchingProducts.slice(0, 3);
  };
  const renderMenuProducts = (categoryName?: string) => {
    const picks = menuProducts(categoryName);
    if (picks.length === 0) {
      const category = categories.find((item) => item.name === categoryName);
      return (
        <div className="ar-mega-empty-card">
          <img src={category?.image ?? categories[0].image} alt="" />
          <span>{categoryName ? `MADE FOR ${categoryName.toUpperCase()}` : "MADE FOR YOUR GAME"}</span>
          <strong>Find your next favourite.</strong>
          <button type="button" onClick={() => { closeNavDropdowns(); setMenuOpen(false); document.querySelector(".ar-categories")?.scrollIntoView({ behavior: "smooth" }); }}>EXPLORE THE SPORTS <ArrowRight size={13} /></button>
        </div>
      );
    }

    return (
      <div className="ar-mega-product-grid">
        {picks.map((product) => (
          <article className="ar-mega-product" key={product.id}>
            <button className="ar-mega-product-image" type="button" onClick={() => viewProduct(product)} aria-label={`View details for ${product.name}`}>
              {product.image ? <img src={product.image} alt={product.name} /> : <span>AL RAED</span>}
              <span className={`ar-mega-stock ${product.stock > 0 ? "is-available" : ""}`}>{product.stock > 0 ? (product.stock < 4 ? `ONLY ${product.stock} LEFT` : "IN STOCK") : "SOLD OUT"}</span>
            </button>
            <small>{product.brand || "AL RAED SPORTS"}</small>
            <strong>{product.name}</strong>
            <div><span>{money(product.price)}</span><button type="button" onClick={() => addToCart(product)} disabled={product.stock < 1} aria-label={`Add ${product.name} to bag`}><Plus size={14} /></button></div>
          </article>
        ))}
      </div>
    );
  };

  const handleWhatsAppCheckout = () => {
    const lines = cart.map(({ product, quantity }) => `• ${product.name} × ${quantity} — ${money(product.price * quantity)}`).join("\n");
    const message = encodeURIComponent(`Hello Al Raed Sports, I'd like to place an order:\n\n${lines}\n\nTotal: ${money(cartTotal)}`);
    const configuredNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
    window.open(configuredNumber ? `https://wa.me/${configuredNumber}?text=${message}` : `https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const campaign = campaigns[campaignIndex];
  const productList = query || activeCategory !== "All" ? filteredProducts : newArrivals;
  const productHeading = query ? "Search results" : activeCategory === "All" ? "Just landed" : `${activeCategory} essentials`;

  return (
    <main className="ar-store">
      <div className="ar-announcement" aria-live="polite">
        <button type="button" aria-label="Previous announcement" onClick={() => setAnnouncementIndex((index) => (index + 2) % 3)}><ArrowLeft size={14} /></button>
        <p>{[
          <>MADE FOR THE UAE <span>·</span> FREE DELIVERY ON ORDERS OVER AED 200</>,
          <>YOUR GAME, DELIVERED <span>·</span> QUICK UAE-WIDE SHIPPING</>,
          <>NEED A HAND? <span>·</span> OUR TEAM KNOWS THEIR RACQUETS</>,
        ][announcementIndex]}</p>
        <button type="button" aria-label="Next announcement" onClick={() => setAnnouncementIndex((index) => (index + 1) % 3)}><ArrowRight size={14} /></button>
      </div>

      <header className="ar-header">
        <button className="ar-mobile-menu" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <Link className="ar-wordmark" href="/" aria-label="Al Raed Sports home"><span className="ar-mark">AR</span><span>AL RAED<small>SPORTS</small></span></Link>
        <nav className={`ar-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation" ref={navRef}>
          <details className="ar-nav-dropdown ar-shop-dropdown">
            <summary>SHOP <ChevronDown size={13} /></summary>
            <div className="ar-mega-menu ar-shop-mega">
              <div className="ar-mega-links"><small>FIND YOUR GAME</small><button type="button" onClick={() => selectCategory("All")}>Shop everything <ArrowRight size={14} /></button>{categories.map((category) => <button type="button" key={category.name} onClick={() => selectCategory(category.name)}>{category.name}<ArrowRight size={14} /></button>)}<span>PLAYER-APPROVED PICKS, RIGHT HERE IN THE UAE.</span></div>
              <div className="ar-mega-showcase"><div className="ar-mega-showcase-heading"><Sparkles size={15} /><span>{products.length ? "IN THE SHOP RIGHT NOW" : "CURATED FOR THE COURT"}</span></div>{renderMenuProducts()}</div>
            </div>
          </details>
          {categories.map((category) => <details className="ar-nav-dropdown ar-category-dropdown" key={category.name}>
            <summary>{category.name.toUpperCase()}<ChevronDown size={12} /></summary>
            <div className="ar-mega-menu ar-category-mega">
              <div className="ar-mega-links"><small>EXPLORE {category.name.toUpperCase()}</small><button type="button" onClick={() => selectCategory(category.name)}>Shop all {category.name.toLowerCase()} <ArrowRight size={14} /></button><button type="button" onClick={openFavourites}>Player favourites <ArrowRight size={14} /></button><button type="button" onClick={() => { closeNavDropdowns(); setMenuOpen(false); document.querySelector(".ar-categories")?.scrollIntoView({ behavior: "smooth" }); }}>Explore every sport <ArrowRight size={14} /></button><span>{category.note.toUpperCase()} · SELECTED FOR YOUR GAME</span></div>
              <div className="ar-mega-showcase"><div className="ar-mega-showcase-heading"><Sparkles size={15} /><span>{menuProducts(category.name).length ? "IN STOCK & READY TO PLAY" : "A FEW COURT-SIDE IDEAS"}</span></div>{renderMenuProducts(category.name)}</div>
            </div>
          </details>)}
          <a href="#new-season" onClick={() => setMenuOpen(false)}>OUR STORY</a>
        </nav>
        <div className="ar-header-actions">
          <form className={`ar-search ${searchOpen ? "is-open" : ""}`} role="search" onSubmit={(event) => { event.preventDefault(); setSearchOpen(false); router.push(query.trim() ? `/shop?q=${encodeURIComponent(query.trim())}` : "/shop"); }}>
            <button className="ar-search-trigger" type="button" aria-label="Search products" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search size={17} /></button>
            <input ref={searchRef} type="search" placeholder="Find your next favourite" aria-label="Search products" value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} />
            {query && <button className="ar-clear-search" type="button" aria-label="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={14} /></button>}
            {searchOpen && suggestions.length > 0 && <div className="ar-search-results">{suggestions.map((product) => <button type="button" key={product.id} onClick={() => viewProduct(product)}><span>{product.name}</span><small>{product.brand} · VIEW DETAILS</small></button>)}</div>}
          </form>
          <Link className="ar-account" href="/account" aria-label="My account"><span>MY ACCOUNT</span><ArrowUpRight size={17} /></Link>
          <button className="ar-bag-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${cartCount} items`}><ShoppingBag size={19} /><span>BAG</span><b>{cartCount}</b></button>
        </div>
      </header>

      <div className="ar-subnav" aria-label="Shop links"><Link href="/classic">← BACK TO CURRENT SITE</Link><span>THE UAE&apos;S HOME FOR RACQUET SPORTS</span><a href="#service">SHOP WITH CONFIDENCE <ArrowUpRight size={12} /></a></div>

      <section className="ar-hero" aria-label="Featured campaign">
        <img key={campaign.image} className="ar-hero-image" src={campaign.image} alt="" />
        <div className="ar-hero-shade" />
        <div className="ar-hero-copy" key={campaignIndex}>
          <p className="ar-eyebrow"><span /> {campaign.eyebrow}</p>
          <h1>{campaign.title}</h1>
          <p className="ar-hero-description">{campaign.description}</p>
          <Link className="ar-button ar-button-light" href="/shop">{campaign.cta}<ArrowRight size={16} /></Link>
        </div>
        <div className="ar-hero-aside"><span>01</span><i /><span>03</span><small>{campaign.label}</small></div>
        <div className="ar-hero-controls" aria-label="Campaign slides">{campaigns.map((item, index) => <button className={index === campaignIndex ? "is-active" : ""} type="button" key={item.eyebrow} aria-label={`Show campaign ${index + 1}`} aria-pressed={index === campaignIndex} onClick={() => setCampaignIndex(index)} />)}</div>
        <a className="ar-hero-scroll" href="#service"><ArrowDown size={14} /> SCROLL TO EXPLORE</a>
      </section>

      <section className="ar-service-strip" id="service" aria-label="Shopping benefits">
        <div><span>01</span><div><strong>MADE FOR THE UAE</strong><small>Local know-how, local support</small></div></div>
        <div><span>02</span><div><strong>REAL PLAYER ADVICE</strong><small>We play. We get it.</small></div></div>
        <div><span>03</span><div><strong>SECURE CHECKOUT</strong><small>Shop with confidence</small></div></div>
        <div><span>04</span><div><strong>READY WHEN YOU ARE</strong><small>Fast delivery across the UAE</small></div></div>
      </section>

      <section className="ar-categories ar-section">
        <div className="ar-section-heading"><div><p className="ar-eyebrow">PICK YOUR PLAY</p><h2>Every game<br />has its <em>gear.</em></h2></div><p className="ar-section-note">Whether it&apos;s your first rally or your thousandth, start with the good stuff.</p></div>
        <div className="ar-category-grid">{categories.map((category, index) => <button className="ar-category-card" type="button" key={category.name} onClick={() => selectCategory(category.name)}>
          <img src={category.image} alt="" loading="lazy" /><span className="ar-category-index">0{index + 1}</span><span className="ar-category-copy"><small>{category.note}</small><strong>{category.name}</strong></span><span className="ar-category-arrow"><ArrowUpRight size={18} /></span>
        </button>)}</div>
      </section>

      <ScrollFilm />

      <section className="ar-products-section ar-section" id="shop-the-game">
        <div className="ar-products-top">
          <div><p className="ar-eyebrow">{query ? "A GOOD PLACE TO START" : "FRESH FROM THE COURT"}</p><h2>{productHeading}<span className="ar-heading-star">✳</span></h2></div>
          <div className="ar-product-controls"><div className="ar-filter-tabs" aria-label="Filter products by sport">{["All", "Badminton", "Tennis", "Squash", "Accessories"].map((category) => <button className={activeCategory === category ? "is-active" : ""} key={category} type="button" aria-pressed={activeCategory === category} onClick={() => { setActiveCategory(category); setQuery(""); }}>{category}</button>)}</div><div className="ar-rail-buttons"><button type="button" aria-label="Scroll products left" onClick={() => scrollRail("left")}><ChevronLeft size={18} /></button><button type="button" aria-label="Scroll products right" onClick={() => scrollRail("right")}><ChevronRight size={18} /></button></div></div>
        </div>
        {catalogState === "loading" ? <div className="ar-status"><span className="ar-loader" />Finding your next favourite…</div> : catalogState === "error" ? <div className="ar-status ar-status-error" role="alert"><strong>We couldn&apos;t reach the shop right now.</strong><span>{catalogError}</span><button type="button" onClick={() => window.location.reload()}>TRY AGAIN <ArrowRight size={14} /></button></div> : productList.length === 0 ? <div className="ar-status">No products match this search just yet. Try another sport or search term.</div> : <div className="ar-product-rail" ref={railRef}>{productList.map((product) => <ProductTile key={product.id} product={product} liked={wishlist.includes(product.id)} onLike={toggleWishlist} onAdd={addToCart} onView={viewProduct} added={justAdded.includes(product.id)} />)}</div>}
        <div className="ar-products-foot"><span>MADE FOR THE MATCH. AND EVERYTHING BEFORE IT.</span><span>{productList.length} {productList.length === 1 ? "PICK" : "PICKS"} TO EXPLORE</span></div>
      </section>

      <section className="ar-editorial" id="new-season">
        <div className="ar-editorial-photo"><img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1800&q=90" alt="A badminton player reaching for a shot on court" loading="lazy" /><span>YOUR GAME<br />IS A GOOD<br />PLACE TO BE.</span></div>
        <div className="ar-editorial-copy"><p className="ar-eyebrow">MORE THAN A SHOP</p><h2>We know<br />that <em>feeling.</em></h2><p>That first clean hit. One more game after the sun goes down. The kit that just feels right. Al Raed is here for the love of the rally—wherever you&apos;re starting, and wherever you&apos;re headed.</p><Link className="ar-button ar-button-outline" href="/classic">MEET AL RAED <ArrowUpRight size={16} /></Link><span className="ar-editorial-mark">SINCE DAY ONE <i>✳</i></span></div>
      </section>

      <section className="ar-bestsellers ar-section" id="player-favourites">
        <div className="ar-section-heading"><div><p className="ar-eyebrow">THE COURT&apos;S FAVOURITES</p><h2>Player <em>approved.</em></h2></div><Link className="ar-text-link" href="/shop">SHOP ALL GEAR <ArrowRight size={16} /></Link></div>
        <div className="ar-best-grid">{bestSellers.slice(0, 4).map((product) => <ProductTile key={product.id} product={product} liked={wishlist.includes(product.id)} onLike={toggleWishlist} onAdd={addToCart} onView={viewProduct} added={justAdded.includes(product.id)} />)}</div>
      </section>

      <footer className="ar-footer">
        <Link className="ar-wordmark ar-footer-logo" href="/" aria-label="Al Raed Sports home"><span className="ar-mark">AR</span><span>AL RAED<small>SPORTS</small></span></Link>
        <p>For the love of the rally.<br /><span>Made for players across the UAE.</span></p>
        <div className="ar-footer-links"><Link href="/shop">SHOP THE COLLECTION</Link><Link href="/account">YOUR ACCOUNT</Link><Link href="/classic">BACK TO CURRENT SITE</Link></div>
        <small className="ar-copyright">© {new Date().getFullYear()} AL RAED SPORTS · UNITED ARAB EMIRATES</small>
      </footer>

      <ProductDetailDialog key={selectedProduct?.id ?? "closed"} product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addProductDetailsToCart} />

      {cartOpen && <div className="ar-drawer-backdrop" onClick={() => setCartOpen(false)}>
        <aside className="ar-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="ar-cart-title" onClick={(event) => event.stopPropagation()}>
          <div className="ar-cart-heading"><div><p className="ar-eyebrow">YOUR GAME, GATHERED</p><h2 id="ar-cart-title">Your bag <span>({cartCount})</span></h2></div><button type="button" aria-label="Close bag" onClick={() => setCartOpen(false)}><X /></button></div>
          {cart.length === 0 ? <div className="ar-empty-cart"><ShoppingBag size={30} /><strong>A little room for something good.</strong><p>Your bag is waiting for its first match-ready pick.</p><Link className="ar-button ar-button-light" href="/shop" onClick={() => setCartOpen(false)}>FIND YOUR GEAR <ArrowRight size={15} /></Link></div> : <>
            <div className="ar-cart-items">{cart.map(({ product, quantity }) => <article className="ar-cart-line" key={product.id}><div className="ar-cart-image">{product.image && <img src={product.image} alt="" />}</div><div className="ar-cart-line-copy"><small>{product.brand}</small><strong>{product.name}</strong><span>{money(product.price)}</span><div className="ar-quantity"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}><Minus size={13} /></button><span>{quantity}</span><button type="button" aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= Math.min(product.stock, 50)}><Plus size={13} /></button></div></div><button className="ar-remove-line" type="button" aria-label={`Remove ${product.name}`} onClick={() => setCart((items) => items.filter((line) => line.product.id !== product.id))}><X size={16} /></button></article>)}</div>
            <div className="ar-cart-bottom"><div><span>SUBTOTAL</span><strong>{money(cartTotal)}</strong></div><small>Delivery and any applicable fees are confirmed when your order is placed.</small><button className="ar-button ar-button-light ar-checkout" type="button" onClick={handleWhatsAppCheckout}>CONTINUE ON WHATSAPP <ArrowRight size={16} /></button></div>
          </>}
        </aside>
      </div>}
    </main>
  );
}
