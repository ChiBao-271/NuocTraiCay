-- Atomic COD order placement for the live UUID-based Supabase schema.
-- Apply this migration in Supabase SQL Editor before enabling checkout.
create or replace function public.create_order_atomic(
  p_order_code text,
  p_customer jsonb,
  p_items jsonb,
  p_note text default null,
  p_voucher_code text default null,
  p_payment_method text default 'cod',
  p_expected_total bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_line jsonb;
  v_product record;
  v_quantity integer;
  v_lines jsonb := '[]'::jsonb;
  v_return_items jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_shipping_fee bigint;
  v_discount bigint := 0;
  v_total bigint;
  v_voucher text := upper(trim(coalesce(p_voucher_code, '')));
  v_type text := null;
  v_value integer := 0;
  v_order_id uuid;
  v_order jsonb;
  v_existing_order_code text;
  v_duplicate_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payment_method is null or p_payment_method not in ('cod', 'sepay') then
    raise exception 'UNSUPPORTED_PAYMENT_METHOD';
  end if;
  if p_order_code is null or length(trim(p_order_code)) < 8 then raise exception 'INVALID_ORDER_CODE'; end if;
  if p_expected_total is not null and p_expected_total < 0 then raise exception 'INVALID_EXPECTED_TOTAL'; end if;
  select order_code into v_existing_order_code from public.orders where order_code = trim(p_order_code);
  if found then raise exception 'DUPLICATE_ORDER_CODE'; end if;
  if jsonb_typeof(p_customer) is distinct from 'object' then raise exception 'INVALID_CUSTOMER'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'INVALID_ITEMS';
  end if;
  select count(*) into v_duplicate_count from (select value->>'id' as product_id from jsonb_array_elements(p_items) x(value) group by value->>'id' having count(*) > 1) d;
  if v_duplicate_count > 0 then raise exception 'DUPLICATE_PRODUCT_ID'; end if;
  if length(trim(coalesce(p_customer->>'fullName',''))) not between 2 and 120 then raise exception 'INVALID_CUSTOMER_NAME'; end if;
  if length(trim(coalesce(p_customer->>'address',''))) not between 5 and 300 then raise exception 'INVALID_ADDRESS'; end if;
  if not regexp_replace(coalesce(p_customer->>'phone',''), '[[:space:]().-]', '', 'g') ~ '^(0|\+84)[0-9]{8,10}$' then raise exception 'INVALID_PHONE'; end if;
  if length(coalesce(p_note,'')) > 1000 then raise exception 'INVALID_NOTE'; end if;

  -- Lock products in a stable order to prevent overselling and reduce deadlocks.
  for v_line in
    select value from jsonb_array_elements(p_items) as x(value) order by value->>'id'
  loop
    if (v_line->>'id') is null then raise exception 'INVALID_PRODUCT_ID'; end if;
    if (v_line->>'quantity') !~ '^[0-9]+$' then raise exception 'INVALID_QUANTITY'; end if;
    v_quantity := (v_line->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then raise exception 'INVALID_QUANTITY'; end if;
    select p.id, p.name, p.price, p.is_available, p.stock_quantity
      into v_product
      from public.products p
      where p.id::text = v_line->>'id'
      for update;
    if not found or v_product.is_available is not true then raise exception 'PRODUCT_UNAVAILABLE:%', v_line->>'id'; end if;
    if v_product.stock_quantity is not null and v_product.stock_quantity < v_quantity then raise exception 'INSUFFICIENT_STOCK:%', v_product.name; end if;
    v_subtotal := v_subtotal + v_product.price::bigint * v_quantity;
    if v_subtotal > 2000000000 then raise exception 'ORDER_TOTAL_TOO_LARGE'; end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'product_name', v_product.name,
      'unit_price', v_product.price, 'quantity', v_quantity,
      'item_subtotal', v_product.price::bigint * v_quantity,
      'stock_quantity', v_product.stock_quantity
    ));
  end loop;

  if v_voucher <> '' then
    case v_voucher
      when 'FRESH10' then v_type := 'percent'; v_value := 10;
      when 'FREESHIP30' then v_type := 'shipping'; v_value := 30000;
      else raise exception 'INVALID_VOUCHER';
    end case;
  end if;

  v_shipping_fee := case when v_subtotal >= 200000 then 0 else 20000 end;
  if v_type = 'percent' then v_discount := least(v_subtotal, round(v_subtotal * v_value / 100.0)::bigint); end if;
  if v_type = 'shipping' then v_shipping_fee := greatest(0, v_shipping_fee - v_value); end if;
  v_total := greatest(0, v_subtotal + v_shipping_fee - v_discount);
  if v_total > 2000000000 then raise exception 'ORDER_TOTAL_TOO_LARGE'; end if;
  if p_expected_total is not null and p_expected_total <> v_total then raise exception 'ORDER_TOTAL_CHANGED:%', v_total; end if;

  insert into public.orders (
    order_code, user_id, recipient_name, recipient_phone, shipping_address, note,
    subtotal, shipping_fee, discount_amount, total_amount, coins_used, coins_earned,
    order_status, payment_method, payment_status
  ) values (
    trim(p_order_code), v_user_id, trim(p_customer->>'fullName'),
    regexp_replace(trim(p_customer->>'phone'), '[[:space:]().-]', '', 'g'),
    trim(p_customer->>'address'), nullif(trim(coalesce(p_customer->>'note', p_note, '')), ''),
    v_subtotal, v_shipping_fee, v_discount, v_total, 0, floor(v_total / 1000),
    'pending', p_payment_method, 'unpaid'
  ) returning id into v_order_id;

  for v_line in select value from jsonb_array_elements(v_lines) as x(value) loop
    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, item_subtotal)
    values (v_order_id, (v_line->>'product_id')::uuid, v_line->>'product_name',
      (v_line->>'unit_price')::numeric::integer, (v_line->>'quantity')::integer,
      (v_line->>'item_subtotal')::numeric::integer);
    if v_line->'stock_quantity' <> 'null'::jsonb then
      update public.products set stock_quantity = stock_quantity - (v_line->>'quantity')::integer where id = (v_line->>'product_id')::uuid;
    end if;
  end loop;

  select to_jsonb(o) into v_order from public.orders o where o.id = v_order_id;
  select coalesce(jsonb_agg(to_jsonb(oi) order by oi.id), '[]'::jsonb) into v_return_items
    from public.order_items oi where oi.order_id = v_order_id;
  return jsonb_build_object('order', v_order, 'items', v_return_items);
end;
$$;

revoke all on function public.create_order_atomic(text, jsonb, jsonb, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.create_order_atomic(text, jsonb, jsonb, text, text, text, bigint) to authenticated;

-- Ensure authenticated sessions can call the safe RPC without giving clients
-- direct write access to order tables. Row policies still constrain reads.
grant usage on schema public to authenticated;
grant select on table public.products, public.categories to authenticated;

-- Tell PostgREST to refresh its RPC schema cache after applying this script.
notify pgrst, 'reload schema';
