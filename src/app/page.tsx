"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
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
import AthleteShowcase from "./AthleteShowcase";

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

    const updateVideoFrame = () => {
      frameRef.current = null;
      if (!video.duration || !Number.isFinite(video.duration)) return;
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / range));
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
  badge?: string;
};

const products: Product[] = [
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
  { name: "Badminton", count: "214 products", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=92" },
  { name: "Court Shoes", count: "86 products", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=92" },
  { name: "Rackets & Gear", count: "148 products", image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1400&q=92" },
  { name: "Player Apparel", count: "302 products", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=92" },
];

const featuredProduct = products.find((product) => product.name === "Nanoflare 1000Z") ?? products[0];

const featuredRackets = [
  {
    product: featuredProduct,
    eyebrow: "FEATURED RACKET",
    description: "Engineered for explosive speed and effortless power, the Nanoflare 1000Z is built for players who want to own the next rally.",
    specs: [["FRAME", "AERO+"], ["FLEX", "STIFF"], ["PLAYER LEVEL", "ADVANCED"]],
  },
  {
    product: products.find((product) => product.name === "Astrox 99 Pro") ?? products[0],
    eyebrow: "POWER SERIES",
    description: "A head-heavy attacking racket with a stiff response, designed to transfer maximum power into every decisive smash.",
    specs: [["BALANCE", "HEAD HEAVY"], ["FLEX", "STIFF"], ["PLAYER LEVEL", "ADVANCED"]],
  },
];

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="product-card">
      <div className="product-image" style={{ backgroundColor: product.tone }}>
        <img src={product.image} alt={product.name} />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button className={`heart-button ${liked ? "liked" : ""}`} aria-label={`Add ${product.name} to wishlist`} onClick={() => setLiked(!liked)}>
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
        </button>
        <button className="quick-add" onClick={() => onAdd(product)}>ADD TO BAG <Plus size={15} /></button>
      </div>
      <div className="product-meta">
        <div className="product-brand">{product.brand}</div>
        <h3>{product.name}</h3>
        <div className="rating"><Star size={13} fill="currentColor" /><span>{product.rating}</span><span className="review-count">({product.reviews})</span></div>
        <div className="price-line"><strong>AED {product.price.toLocaleString()}</strong>{product.oldPrice && <del>AED {product.oldPrice}</del>}</div>
      </div>
    </article>
  );
}

export default function Home() {
  const [cart, setCart] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    const handleCategoryShortcut = (event: Event) => {
      const category = (event as CustomEvent<string>).detail;
      setActiveCategory(category);
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("alraed-category", handleCategoryShortcut);
    return () => window.removeEventListener("alraed-category", handleCategoryShortcut);
  }, []);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesQuery = `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [activeCategory, query]);

  const addToCart = (product: Product) => {
    setCart((current) => [...current, product]);
    setCartOpen(true);
  };

  const cartTotal = cart.reduce((total, product) => total + product.price, 0);
  const browseCategory = (category: string) => setActiveCategory(category);

  return (
    <main>
      <header className="site-header">
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu"><Menu size={21} /></button>
        <a className="logo" href="#top" aria-label="Al Raed Sports home"><img src="/IMG_8477.jpg%2010-33-16-710.jpg" alt="" /><span>AL RAED SPORTS</span></a>
        <nav className={menuOpen ? "nav open" : "nav"}>
          {['Shop', 'Badminton', 'Tennis', 'Squash', 'Apparel', 'Brands'].map((item) => <a href={item === 'Shop' ? '#shop' : '#categories'} key={item}>{item}</a>)}
        </nav>
        <div className="header-actions">
          <label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" /></label>
          <button className="icon-button" aria-label="Account"><UserRound size={19} /></button>
          <button className="icon-button" aria-label="Wishlist"><Heart size={19} /></button>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Open shopping bag"><ShoppingBag size={19} /><span>{cart.length}</span></button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow">EQUIPMENT FOR THE DRIVEN</p><h1>PLAY<br /><em>YOUR</em> BEST.</h1><p className="hero-description">Premium equipment and essentials for every rally, match and moment in between.</p><a className="lime-button" href="#shop">SHOP THE COLLECTION <ArrowRight size={17} /></a></div>
        <div className="hero-photo"><div className="hero-overlay" /><img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=2200&q=95" alt="Badminton racket and shuttlecock on a court" /></div>
        <div className="hero-foot"><span>01</span><div className="hero-progress"><i /></div><span>03</span><span className="hero-scroll">SCROLL TO EXPLORE ↓</span></div>
      </section>

      <section className="trust-strip"><div><strong>01</strong><span>AUTHENTIC PRODUCTS<br /><small>Curated from trusted brands</small></span></div><div><strong>02</strong><span>UAE DELIVERY<br /><small>Across all seven emirates</small></span></div><div><strong>03</strong><span>LOCAL SUPPORT<br /><small>Real people, ready to help</small></span></div><div><strong>04</strong><span>SECURE CHECKOUT<br /><small>Pay with total confidence</small></span></div></section>

      <ScrollVideo src="/animation1.MOV" eyebrow="MOTION IN EVERY DETAIL" title="Built to move." description="Follow the flow. Every frame reveals the feeling behind the game." />

      <AthleteShowcase onBrowse={browseCategory} />

      <Reveal><section className="content-section" id="categories"><div className="section-heading"><div><p className="eyebrow">FIND YOUR GAME</p><h2>Shop by <em>sport.</em></h2></div><a className="text-link" href="#shop">VIEW ALL SPORTS <ArrowRight size={16} /></a></div><div className="sport-grid">{sports.map((sport, index) => <a className="sport-card" href="#shop" key={sport.name} style={{ "--card-delay": `${index * 90}ms` } as React.CSSProperties}><img src={sport.image} alt={sport.name} /><div className="sport-shade" /><div className="sport-label"><span>0{index + 1}</span><div><h3>{sport.name}</h3><p>{sport.count}</p></div><ChevronRight size={20} /></div></a>)}</div></section></Reveal>

      <ScrollVideo src="/animation3.mov" eyebrow="YONEX + VICTOR" title="Choose your weapon." description="Explore performance rackets and court shoes from the brands trusted by serious players." align="left" />

      <Reveal><section className="featured-product-slider"><div className="featured-product-track" style={{ transform: `translateX(-${featuredIndex * 100}%)` }}>{featuredRackets.map(({ product, eyebrow, description, specs }) => <article className="featured-product" key={product.id}><div className="featured-product-image"><img src={product.image} alt={product.name} /><span>THE PLAYER&apos;S CHOICE</span></div><div className="featured-product-copy"><p className="eyebrow">{eyebrow}</p><div className="featured-brand">{product.brand}</div><h2>{product.name}</h2><div className="featured-rating"><Star size={14} fill="currentColor" /> {product.rating} <span>({product.reviews} reviews)</span></div><p className="featured-description">{description}</p><div className="featured-specs">{specs.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="featured-buy"><strong>AED {product.price.toLocaleString()}</strong><button className="dark-button" onClick={() => addToCart(product)}>ADD TO BAG <ShoppingBag size={16} /></button></div><button className="featured-next" onClick={() => setFeaturedIndex((current) => (current + 1) % featuredRackets.length)} aria-label={`Show next featured racket`}><span>NEXT RACKET</span><ArrowRight size={18} /></button></div></article>)}</div><div className="featured-dots" aria-label="Featured racket slides">{featuredRackets.map((racket, index) => <button key={racket.product.id} className={featuredIndex === index ? "active" : ""} onClick={() => setFeaturedIndex(index)} aria-label={`Show ${racket.product.name}`} />)}</div></section></Reveal>

      <Reveal><section className="content-section products-section" id="shop"><div className="section-heading"><div><p className="eyebrow">THE EDIT</p><h2>What&apos;s <em>moving.</em></h2></div><div className="category-tabs">{['All', 'Badminton', 'Tennis', 'Squash', 'Shoes', 'Strings', 'Grips', 'Socks', 'Apparel'].map((category) => <button data-category={category} className={activeCategory === category ? 'active' : ''} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}</div></div>{query && <p className="search-note">Showing results for <strong>&ldquo;{query}&rdquo;</strong></p>}<div className="product-grid">{filteredProducts.map((product, index) => <div className="product-reveal" style={{ "--card-delay": `${index * 65}ms` } as React.CSSProperties} key={product.id}><ProductCard product={product} onAdd={addToCart} /></div>)}</div><div className="center-action"><a className="outline-button" href="#categories">EXPLORE ALL PRODUCTS <ArrowRight size={16} /></a></div></section></Reveal>

      <ScrollVideo src="/animation2.MOV" eyebrow="THE NEXT RALLY" title="Find your edge." description="Scroll through the motion and discover equipment made for your most committed moments." align="right" />

      <Reveal><section className="campaign"><div className="campaign-image"><img src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=85" alt="Runner in motion" /></div><div className="campaign-copy"><p className="eyebrow">THE AL RAED STANDARD</p><h2>Made for<br /><em>the next point.</em></h2><p>From first serve to final set, the right kit changes everything. Explore gear selected for players who show up.</p><a className="dark-button" href="#shop">DISCOVER THE EDIT <ArrowRight size={16} /></a></div></section></Reveal>

      <Reveal><section className="store-section"><div className="store-intro"><p className="eyebrow">TRY IT IN PERSON</p><h2>Feel the<br /><em>difference.</em></h2><p>Not sure which racket is right for your game? Visit one of our stores, pick up the latest gear and get closer to your next best match.</p><a className="lime-button" href="#stores">FIND A STORE <ArrowRight size={16} /></a></div><div className="store-list" id="stores"><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Al+Raed+Sports+Madinat+Zayed" target="_blank" rel="noreferrer"><span className="store-number">01</span><div><MapPin size={18} /><h3>Al Raed Sports<br />Madinat Zayed</h3><p>United Arab Emirates <ArrowRight size={14} /></p></div></a><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Alraed+Sports+Shop+UAE" target="_blank" rel="noreferrer"><span className="store-number">02</span><div><MapPin size={18} /><h3>Alraed Sports<br />Shop</h3><p>United Arab Emirates <ArrowRight size={14} /></p></div></a><a className="store-card" href="https://www.google.com/maps/search/?api=1&query=Yonex+Store+Bahrain" target="_blank" rel="noreferrer"><span className="store-number">03</span><div><MapPin size={18} /><h3>Yonex Store<br />Bahrain</h3><p>Kingdom of Bahrain <ArrowRight size={14} /></p></div></a></div></section></Reveal>

      <Reveal><section className="content-section brands-section"><div className="section-heading"><div><p className="eyebrow">TRUSTED BY PLAYERS</p><h2>Brands that<br /><em>move with you.</em></h2></div><a className="text-link" href="#shop">ALL BRANDS <ArrowRight size={16} /></a></div><div className="brand-list"><span>YONEX</span><span>WILSON</span><span>HEAD</span><span>BABOLAT</span><span>VICTOR</span></div><div className="brand-marquee" aria-label="Al Raed Sports product categories"><div><span>RACKETS</span><i>✦</i><span>COURT SHOES</span><i>✦</i><span>STRINGS & GRIPS</span><i>✦</i><span>PLAYER APPAREL</span><i>✦</i><span>RACKETS</span><i>✦</i><span>COURT SHOES</span><i>✦</i></div></div></section></Reveal>

      <div className="quick-rail"><a href="#shop" aria-label="Jump to products"><ShoppingBag size={16} /></a><a href="#categories" aria-label="Jump to sports"><ChevronRight size={16} /></a><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button></div>

      <footer className="footer"><div className="footer-top"><div><a className="logo footer-logo" href="#top"><img src="/IMG_8477.jpg%2010-33-16-710.jpg" alt="" /><span>AL RAED SPORTS</span></a><p>Premium sports equipment<br />for the UAE in motion.</p></div><div className="footer-links"><div><h4>SHOP</h4><a href="#shop">All products</a><a href="#categories">Badminton</a><a href="#categories">Tennis</a><a href="#categories">Squash</a></div><div><h4>ESSENTIALS</h4><a href="#shop">Rackets</a><a href="#shop">Shoes</a><a href="#shop">Strings & grips</a><a href="#shop">Socks & apparel</a></div><div><h4>FOLLOW</h4><a href="#top">Instagram</a><a href="#top">WhatsApp</a><a href="https://alraedgroup.ae">Al Raed Group</a></div></div><div className="newsletter"><h4>STAY IN THE GAME</h4><p>New drops, player edits and store news.</p><div className="email-field"><input placeholder="Your email address" aria-label="Your email address" /><button aria-label="Subscribe"><ArrowRight size={17} /></button></div></div></div><div className="footer-bottom"><span>© 2026 AL RAED SPORTS</span><span>AN AL RAED GROUP OF COMPANIES BUSINESS</span><span>MADE FOR THE UAE</span></div></footer>

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><p className="eyebrow">YOUR SELECTION</p><h2>Shopping bag <span>({cart.length})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close shopping bag"><X size={21} /></button></div>{cart.length === 0 ? <div className="empty-bag"><ShoppingBag size={30} /><p>Your bag is waiting.</p><span>Add something that makes you want to play.</span></div> : <><div className="drawer-items">{cart.map((product, index) => <div className="drawer-item" key={`${product.id}-${index}`}><img src={product.image} alt={product.name} /><div><strong>{product.brand}</strong><p>{product.name}</p><span>AED {product.price.toLocaleString()}</span></div><button aria-label="Remove item" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></div>)}</div><div className="drawer-summary"><div><span>Subtotal</span><strong>AED {cartTotal.toLocaleString()}</strong></div><p>Delivery calculated at checkout.</p><button className="dark-button full-button">CHECKOUT <ArrowRight size={16} /></button></div></>}</aside></div>}
    </main>
  );
}
