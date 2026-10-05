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
  addresses jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  brand text,
  category text check (category in ('Badminton', 'Tennis', 'Squash', 'Accessories')),
  price numeric(10,2) not null,
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

## 4) Start with an empty storefront

The storefront reads active products from the `products` table. To hide existing products while keeping their records and order history, run this once in SQL Editor:

```sql
update products set is_active = false where is_active = true;
```

Hidden products remain in admin and can be published again. New products are published automatically after saving.

## 5) Product images

The admin upload accepts JPG, PNG, and WebP files up to 5 MB. Images are stored in the public Supabase Storage bucket `product-images`; the `products.image_url` column stores only the image URL. The bucket is created automatically on the first authenticated admin upload.

This keeps image bytes out of Postgres, avoids inflating database backups, and lets the browser fetch images from object storage. Compress images before upload for faster storefront loading.

## 6) Add row-level security policies

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

## 7) Apply existing-project migrations

For an existing database, run these files in the Supabase SQL Editor, in order:

1. `SUPABASE_ACCOUNT_MIGRATION.sql`
2. `SUPABASE_ORDER_SAFETY_MIGRATION.sql`

The first migration adds saved customer addresses. The second adds server-only database functions that create orders using current Supabase product names/prices and atomically mark paid orders while deducting inventory. Checkout and payment processing will return an error until the second migration has been applied.

Do not use a client-provided price to create orders. The existing `/api/orders` route sends only product IDs and quantities to the database function. The service role key must remain server-only.

## 8) Seed test catalog

To add 10 clearly labeled test products per category, set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then run:

```sh
npm run seed:test-products
```

The script checks that all 40 Unsplash stock images are available, skips products already seeded by name, and verifies the active count in each category. Products are marked `[TEST]`, have working stock quantities, and are active and orderable; use a non-production Supabase project when testing.

## 9) Production readiness checks

Before launch, test these flows against the intended Supabase project:

1. Publish a product with a known stock quantity and confirm it appears on the storefront.
2. Place an order and confirm the database total uses the product's current database price.
3. Mark the order paid and confirm each product stock is deducted once.
4. Repeat the paid update and confirm stock does not change a second time.
5. Try an order with insufficient stock and confirm it is rejected without changing the order or inventory.
6. Cancel an order and verify the agreed manual stock-restock process.

The current manual-payment flow sends the order request to WhatsApp, where the customer and store agree on payment and fulfilment. Stock is deducted only when the admin confirms the order as paid. Unpaid orders do not reserve inventory, so check availability before confirming payment if inventory is limited.

The service role key must be configured as a server-only environment variable in the production host. Never prefix it with `NEXT_PUBLIC_` or include it in browser code.

## Summary

- Firebase Auth handles Google sign-in.
- Supabase stores products, customer profiles, and orders.
- Supabase Storage stores uploaded product images.
- The Next.js server creates orders from database prices and validates stock.
- WhatsApp is used to coordinate payment manually.
