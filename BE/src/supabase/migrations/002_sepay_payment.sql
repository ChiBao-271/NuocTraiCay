-- SePay payment intent tracking and idempotent IPN application.
-- Allow SePay in the existing orders.payment_method CHECK constraint.
do $$
declare v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_method%'
  loop
    execute format('alter table public.orders drop constraint %I', v_constraint.conname);
  end loop;
end;
$$;
alter table public.orders
  add constraint orders_payment_method_check
  check (upper(trim(payment_method)) in ('COD', 'VNPAY', 'MOMO', 'BANK_TRANSFER', 'SEPAY'));

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists payment_paid_at timestamptz;
alter table public.orders add column if not exists payment_meta jsonb not null default '{}'::jsonb;
create unique index if not exists idx_orders_payment_reference_unique on public.orders(payment_reference) where payment_reference is not null;

create table if not exists public.payment_webhook_events (
  id bigserial primary key,
  provider text not null,
  event_key text not null,
  order_id uuid references public.orders(id) on delete set null,
  received_at timestamptz not null default now(),
  unique(provider, event_key)
);
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from anon, authenticated;
grant all on public.payment_webhook_events to service_role;

create or replace function public.apply_sepay_order_paid(
  p_invoice text, p_amount bigint, p_event_key text, p_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_event_id bigint;
begin
  if nullif(trim(coalesce(p_invoice,'')), '') is null or p_amount <= 0 or nullif(trim(coalesce(p_event_key,'')), '') is null then
    raise exception 'INVALID_PAYMENT_EVENT';
  end if;
  select * into v_order from public.orders where order_code = trim(p_invoice) for update;
  if not found then raise exception 'PAYMENT_ORDER_NOT_FOUND'; end if;
  if v_order.payment_method <> 'sepay' then raise exception 'PAYMENT_PROVIDER_MISMATCH'; end if;
  if v_order.total_amount::bigint <> p_amount then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  insert into public.payment_webhook_events(provider,event_key,order_id) values('sepay',trim(p_event_key),v_order.id) on conflict(provider,event_key) do nothing returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('ok',true,'duplicate',true,'order_id',v_order.id); end if;
  if v_order.payment_status='paid' then return jsonb_build_object('ok',true,'duplicate',true,'order_id',v_order.id); end if;
  if v_order.order_status='cancelled' then raise exception 'PAYMENT_ORDER_CANCELLED'; end if;
  update public.orders set payment_status='paid', payment_paid_at=now(), payment_meta=coalesce(p_payload, '{}'::jsonb) where id=v_order.id;
  return jsonb_build_object('ok',true,'duplicate',false,'order_id',v_order.id);
end;
$$;
revoke all on function public.apply_sepay_order_paid(text,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.apply_sepay_order_paid(text,bigint,text,jsonb) to service_role;
