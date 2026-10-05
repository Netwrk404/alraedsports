export type StoreProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
};

export type CartLine = { product: StoreProduct; quantity: number };

export function mapStoreProduct(row: Record<string, unknown>): StoreProduct {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    brand: String(row.brand ?? ""),
    category: String(row.category ?? ""),
    price: Number(row.price ?? 0),
    image: String(row.image_url ?? ""),
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews ?? 0),
    stock: Math.max(0, Number(row.stock ?? 0)),
  };
}
