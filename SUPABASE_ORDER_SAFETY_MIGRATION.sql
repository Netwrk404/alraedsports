create or replace function public.create_customer_order(
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
    if coalesce(v_product.stock, 0) < v_quantity then
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
    user_id, customer_name, customer_phone, city, address, notes, total, status
  ) values (
    p_user_id, p_customer_name, p_customer_phone, p_city, p_address,
    nullif(p_notes, ''), v_total, 'awaiting_payment'
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
  end loop;

  return jsonb_build_object(
    'order_id', v_order.id,
    'total', v_total,
    'items', v_order_items
  );
end;
$$;

create or replace function public.mark_order_paid_and_deduct_inventory(
  p_order_id uuid,
  p_notes text default null,
  p_update_notes boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_product_id bigint;
  v_updated_product_id bigint;
  v_item_count integer := 0;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using message = 'ORDER_NOT_FOUND', errcode = 'P0002';
  end if;

  if v_order.status = 'paid' then
    if p_update_notes then
      update public.orders set notes = p_notes where id = p_order_id;
    end if;
    return jsonb_build_object('order_id', p_order_id, 'already_paid', true);
  end if;

  if v_order.status not in ('awaiting_payment', 'pending') then
    raise exception using message = 'INVALID_ORDER_STATUS', errcode = 'P0001';
  end if;

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = p_order_id
    group by product_id
    order by product_id nulls first
  loop
    v_item_count := v_item_count + 1;
    if v_item.product_id is null then
      raise exception using message = 'ORDER_ITEM_MISSING_PRODUCT_ID', errcode = 'P0001';
    end if;

    v_product_id := v_item.product_id;
    update public.products
    set stock = coalesce(stock, 0) - v_item.quantity
    where id = v_product_id and coalesce(stock, 0) >= v_item.quantity
    returning id into v_updated_product_id;

    if not found then
      raise exception using message = 'INSUFFICIENT_STOCK:' || v_product_id, errcode = 'P0001';
    end if;
  end loop;

  if v_item_count = 0 then
    raise exception using message = 'ORDER_HAS_NO_ITEMS', errcode = 'P0001';
  end if;

  update public.orders
  set status = 'paid', notes = case when p_update_notes then p_notes else notes end
  where id = p_order_id;

  return jsonb_build_object('order_id', p_order_id, 'already_paid', false);
end;
$$;

revoke all on function public.create_customer_order(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_paid_and_deduct_inventory(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.create_customer_order(uuid, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.mark_order_paid_and_deduct_inventory(uuid, text, boolean) to service_role;