alter table public.orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_payment_method text,
  add column if not exists stripe_paid_at timestamptz,
  add column if not exists stripe_stock_reserved boolean not null default false;

alter table public.products
  add column if not exists stripe_sales_synced_at timestamptz not null default now();

create unique index if not exists orders_stripe_checkout_session_id_key
  on public.orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists orders_stripe_payment_intent_id_key
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.stripe_order_stock_reservations (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id),
  quantity integer not null check (quantity > 0),
  primary key (order_id, product_id)
);

create index if not exists stripe_order_stock_reservations_product_id_idx
  on public.stripe_order_stock_reservations (product_id);

create index if not exists orders_stripe_paid_at_idx
  on public.orders (stripe_paid_at)
  where stripe_paid_at is not null;

create index if not exists order_items_product_order_idx
  on public.order_items (product_id, order_id)
  where product_id is not null;

revoke all on table public.stripe_order_stock_reservations from public, anon, authenticated;

create or replace function public.create_stripe_checkout_order(
  p_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_city text,
  p_address text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_saved_item jsonb;
  v_product public.products%rowtype;
  v_order public.orders%rowtype;
  v_order_items jsonb := '[]'::jsonb;
  v_product_id bigint;
  v_quantity integer;
  v_reserved_quantity integer;
  v_total numeric(10, 2) := 0;
begin
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception using message = 'INVALID_ORDER_ITEMS', errcode = '22023';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception using message = 'INVALID_ORDER_ITEMS', errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'product_id')::bigint;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception using message = 'INVALID_ORDER_ITEMS', errcode = '22023';
    end;

    if v_product_id <= 0 or v_quantity < 1 or v_quantity > 50 then
      raise exception using message = 'INVALID_ORDER_ITEMS', errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id and is_active = true
    for update;

    if not found then
      raise exception using message = 'PRODUCT_UNAVAILABLE:' || v_product_id, errcode = 'P0001';
    end if;

    select coalesce(sum(quantity), 0)::integer into v_reserved_quantity
    from public.stripe_order_stock_reservations
    where product_id = v_product_id;

    if coalesce(v_product.stock, 0) - v_reserved_quantity < v_quantity then
      raise exception using message = 'INSUFFICIENT_STOCK:' || v_product_id, errcode = 'P0001';
    end if;

    v_total := v_total + (v_product.price * v_quantity);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', v_quantity,
      'unit_price', v_product.price
    ));
  end loop;

  insert into public.orders (
    user_id, customer_name, customer_phone, city, address, notes, total, status, stripe_stock_reserved
  ) values (
    p_user_id, p_customer_name, p_customer_phone, p_city, p_address,
    nullif(p_notes, ''), v_total, 'awaiting_payment', true
  ) returning * into v_order;

  for v_saved_item in select value from jsonb_array_elements(v_order_items)
  loop
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (
      v_order.id,
      (v_saved_item ->> 'product_id')::bigint,
      v_saved_item ->> 'product_name',
      (v_saved_item ->> 'quantity')::integer,
      (v_saved_item ->> 'unit_price')::numeric
    );
    insert into public.stripe_order_stock_reservations (order_id, product_id, quantity)
    values (
      v_order.id,
      (v_saved_item ->> 'product_id')::bigint,
      (v_saved_item ->> 'quantity')::integer
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order.id,
    'total', v_total,
    'items', v_order_items
  );
end;
$$;

create or replace function public.set_stripe_checkout_session(
  p_order_id uuid,
  p_session_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.orders
  set stripe_checkout_session_id = p_session_id
  where id = p_order_id
    and status = 'awaiting_payment'
    and stripe_stock_reserved = true
    and stripe_checkout_session_id is null;

  if not found then
    raise exception using message = 'CHECKOUT_ORDER_NOT_READY', errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.set_product_stock_with_reservations(
  p_product_id bigint,
  p_stock integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_reserved_stock integer;
begin
  if p_stock < 0 then
    raise exception using message = 'INVALID_STOCK', errcode = '22023';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception using message = 'PRODUCT_NOT_FOUND', errcode = 'P0002';
  end if;

  select coalesce(sum(quantity), 0)::integer into v_reserved_stock
  from public.stripe_order_stock_reservations
  where product_id = p_product_id;

  if p_stock < v_reserved_stock then
    raise exception using message = 'STOCK_BELOW_CHECKOUT_RESERVATIONS:' || v_reserved_stock, errcode = 'P0001';
  end if;

  update public.products set stock = p_stock where id = p_product_id;
end;
$$;

create or replace function public.mark_stripe_order_paid(
  p_order_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_payment_method text,
  p_amount_total bigint,
  p_currency text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_reservation record;
  v_updated_product_id bigint;
begin
  if p_session_id is null or p_payment_intent_id is null then
    raise exception using message = 'STRIPE_PAYMENT_REFERENCE_MISSING', errcode = 'P0001';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using message = 'ORDER_NOT_FOUND', errcode = 'P0002';
  end if;

  if v_order.stripe_paid_at is not null or v_order.stripe_payment_intent_id is not null then
    if v_order.stripe_checkout_session_id is distinct from p_session_id
      or v_order.stripe_payment_intent_id is distinct from p_payment_intent_id then
      raise exception using message = 'STRIPE_PAYMENT_MISMATCH', errcode = 'P0001';
    end if;
    return jsonb_build_object('order_id', p_order_id, 'already_paid', true);
  end if;

  if v_order.status <> 'awaiting_payment'
    or v_order.stripe_checkout_session_id <> p_session_id
    or v_order.stripe_stock_reserved is distinct from true then
    raise exception using message = 'STRIPE_ORDER_NOT_PAYABLE', errcode = 'P0001';
  end if;

  if p_currency is distinct from 'aed'
    or p_amount_total is distinct from round(v_order.total * 100)::bigint then
    raise exception using message = 'STRIPE_AMOUNT_MISMATCH', errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.stripe_order_stock_reservations
    where order_id = p_order_id
  ) or exists (
    select 1
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) as order_items
    full join (
      select product_id, sum(quantity)::integer as quantity
      from public.stripe_order_stock_reservations
      where order_id = p_order_id
      group by product_id
    ) as reservations using (product_id)
    where order_items.quantity is distinct from reservations.quantity
  ) then
    raise exception using message = 'STRIPE_ORDER_RESERVATION_MISMATCH', errcode = 'P0001';
  end if;

  for v_reservation in
    select product_id, quantity
    from public.stripe_order_stock_reservations
    where order_id = p_order_id
    order by product_id
  loop
    update public.products
    set stock = coalesce(stock, 0) - v_reservation.quantity
    where id = v_reservation.product_id
      and coalesce(stock, 0) >= v_reservation.quantity
    returning id into v_updated_product_id;

    if not found then
      raise exception using message = 'INSUFFICIENT_STOCK:' || v_reservation.product_id, errcode = 'P0001';
    end if;
  end loop;

  delete from public.stripe_order_stock_reservations where order_id = p_order_id;

  update public.orders
  set status = 'paid',
      stripe_payment_intent_id = p_payment_intent_id,
      stripe_payment_method = left(p_payment_method, 120),
      stripe_paid_at = now(),
      stripe_stock_reserved = false
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'already_paid', false);
end;
$$;

create or replace function public.release_stripe_checkout_order(
  p_order_id uuid,
  p_session_id text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using message = 'ORDER_NOT_FOUND', errcode = 'P0002';
  end if;

  if v_order.status = 'cancelled' and v_order.stripe_stock_reserved = false then
    return jsonb_build_object('order_id', p_order_id, 'already_released', true);
  end if;

  if v_order.status <> 'awaiting_payment'
    or v_order.stripe_stock_reserved is distinct from true
    or (p_session_id is null and v_order.stripe_checkout_session_id is not null)
    or (p_session_id is not null and v_order.stripe_checkout_session_id is distinct from p_session_id) then
    raise exception using message = 'STRIPE_ORDER_NOT_RELEASABLE', errcode = 'P0001';
  end if;

  delete from public.stripe_order_stock_reservations where order_id = p_order_id;

  update public.orders
  set status = 'cancelled', stripe_stock_reserved = false
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'already_released', false);
end;
$$;

create or replace function public.sync_zoho_product_stock(p_updates jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_update record;
  v_product public.products%rowtype;
  v_external_stock integer;
  v_site_sales integer;
  v_reserved_stock integer;
  v_updated_count integer := 0;
  v_sync_time timestamptz;
begin
  if jsonb_typeof(p_updates) is distinct from 'array' then
    raise exception using message = 'Inventory updates must be a JSON array.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_updates) as updates(update_row)
    where jsonb_typeof(update_row) is distinct from 'object'
      or nullif(btrim(update_row->>'sku'), '') is null
      or coalesce(update_row->>'stock', '') !~ '^[0-9]+$'
  ) then
    raise exception using message = 'Every inventory update must have a SKU and a non-negative whole-number stock value.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_updates) as updates(update_row)
    group by upper(btrim(update_row->>'sku'))
    having count(*) > 1
  ) then
    raise exception using message = 'Inventory updates contain duplicate SKUs.';
  end if;

  for v_update in
    select product.id, updates.update_row
    from jsonb_array_elements(p_updates) as updates(update_row)
    join public.products as product
      on upper(btrim(product.sku)) = upper(btrim(updates.update_row->>'sku'))
    order by product.id
  loop
    select * into v_product
    from public.products
    where id = v_update.id
    for update;

    v_external_stock := (v_update.update_row->>'stock')::integer;

    select coalesce(sum(item.quantity), 0)::integer into v_site_sales
    from public.orders as customer_order
    join public.order_items as item on item.order_id = customer_order.id
    where item.product_id = v_product.id
      and customer_order.stripe_payment_intent_id is not null
      and customer_order.stripe_paid_at > v_product.stripe_sales_synced_at;

    if v_external_stock < v_site_sales then
      raise exception using message = 'ZOHO_STOCK_BELOW_UNSYNCED_STRIPE_SALES:' || v_product.sku;
    end if;

    select coalesce(sum(quantity), 0)::integer into v_reserved_stock
    from public.stripe_order_stock_reservations
    where product_id = v_product.id;

    if v_external_stock - v_site_sales < v_reserved_stock then
      raise exception using message = 'ZOHO_STOCK_BELOW_ACTIVE_CHECKOUT_RESERVATIONS:' || v_product.sku;
    end if;

    v_sync_time := clock_timestamp();
    update public.products
    set stock = v_external_stock - v_site_sales,
        zoho_stock_synced_at = v_sync_time,
        stripe_sales_synced_at = v_sync_time
    where id = v_product.id;

    v_updated_count := v_updated_count + 1;
  end loop;

  if v_updated_count <> jsonb_array_length(p_updates) then
    raise exception using message = 'One or more Zoho SKUs no longer match a website product.';
  end if;

  return v_updated_count;
end;
$$;

revoke all on function public.create_stripe_checkout_order(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.set_stripe_checkout_session(uuid, text) from public, anon, authenticated;
revoke all on function public.set_product_stock_with_reservations(bigint, integer) from public, anon, authenticated;
revoke all on function public.mark_stripe_order_paid(uuid, text, text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.release_stripe_checkout_order(uuid, text) from public, anon, authenticated;
grant execute on function public.create_stripe_checkout_order(uuid, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.set_stripe_checkout_session(uuid, text) to service_role;
grant execute on function public.set_product_stock_with_reservations(bigint, integer) to service_role;
grant execute on function public.mark_stripe_order_paid(uuid, text, text, text, bigint, text) to service_role;
grant execute on function public.release_stripe_checkout_order(uuid, text) to service_role;
revoke all on function public.sync_zoho_product_stock(jsonb) from public, anon, authenticated;
grant execute on function public.sync_zoho_product_stock(jsonb) to service_role;
