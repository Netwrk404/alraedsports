# Supabase setup for Al Raed Sports ecommerce

## 1) Create the Supabase project

1. Open https://supabase.com
2. Sign in
3. Click New project
4. Choose project name: `alraed-sports`
5. Choose region: `South Asia (Mumbai)`
6. Create a strong database password
7. Wait for deployment to complete

## 2) Get your keys

1. Open your project dashboard
2. Go to Settings -> API
3. Copy these values:
   - Project URL
   - Publishable key (anon key)
   - Secret key (service role key)

### Add them to your local env file

Add these to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Important:
- use the anon key in frontend code
- use the service role key only on the server
- do not expose the service role key in browser code

## 3) Create the tables in Supabase SQL editor

Open SQL Editor in Supabase and paste this:

```sql
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text unique,
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  brand text,
  category text,
  price numeric(10,2) not null,
  old_price numeric(10,2),
  image_url text,
  rating numeric(3,2) default 0,
  reviews integer default 0,
  stock integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  customer_name text not null,
  customer_phone text not null,
  city text,
  address text,
  notes text,
  total numeric(10,2) not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id uuid references orders(id) on delete cascade,
  product_id bigint references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  created_at timestamptz default now()
);
```

## 4) Add sample products

Paste this into SQL editor:

```sql
insert into products (
  name, brand, category, price, old_price, image_url, rating, reviews, stock, is_active
)
values
  ('Astrox 100 Tour', 'YONEX', 'Badminton', 649, 729, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=900&q=85', 4.9, 28, 12, true),
  ('Blade 98 v9', 'WILSON', 'Tennis', 799, null, 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=900&q=85', 4.8, 16, 8, true),
  ('Power Cushion 65 Z3', 'YONEX', 'Shoes', 529, null, 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85', 4.8, 18, 15, true);
```

## 5) Add row-level security policies

For public product browsing:

```sql
alter table products enable row level security;

create policy "Products are viewable by everyone"
on products for select
using (true);
```

For order tables, keep this server-only:

```sql
alter table orders enable row level security;
alter table order_items enable row level security;
```

Then define server-side insertion logic in API routes; do not allow public insert from browser anon key.

## 6) Create a server order API route

In Next.js, create a route such as:

`src/app/api/orders/route.ts`

Example:

```ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const { products, customerName, customerPhone, city, address, notes } = body;

  const total = products.reduce((sum: number, item: any) => {
    return sum + Number(item.product.price) * Number(item.quantity);
  }, 0);

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      city,
      address,
      notes,
      total,
      status: "pending",
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const orderItems = products.map((item: any) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.product.price,
  }));

  const { error: itemError } = await supabaseAdmin.from("order_items").insert(orderItems);

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, orderId: order.id });
}
```

## 7) Connect your checkout form to the API

In the frontend checkout flow, before opening WhatsApp, call the API:

```ts
const response = await fetch("/api/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    products: cart,
    customerName: checkoutForm.fullName,
    customerPhone: checkoutForm.phone,
    city: checkoutForm.city,
    address: checkoutForm.address,
    notes: checkoutForm.notes,
  }),
});

const result = await response.json();
```

Then open WhatsApp to the company number `0504848236` with the order details.

## 8) Test the flow

1. Add a product to cart
2. Login with Google
3. Proceed to checkout
4. Fill in name, phone, address, city
5. Click send via WhatsApp
6. Confirm order payload is created in Supabase
7. Confirm a new row exists in `orders`
8. Confirm matching rows exist in `order_items`

## 9) Optional later: admin page

Later you can create a dashboard page to view orders:

- `/admin/orders`
- read from `orders`
- join with `order_items`
- show status, total, customer, created date

## 10) When you are ready for real ecommerce

Future upgrades:
- stock checking
- inventory updates
- order status management
- admin approval dashboard
- Stripe or other payment integration

## Summary

Your exact stack is:
- Firebase Auth = Google login
- Supabase = product and order database
- WhatsApp = confirmation to business number
- Next.js API = secure order insertion

This is the correct setup for your current business flow.
