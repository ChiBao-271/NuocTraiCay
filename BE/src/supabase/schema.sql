-- ═══════════════════════════════════════════════════════════════════
--  FRUIT ONLINE SHOP — Database Schema
--  Supabase (PostgreSQL)
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
--  1. CATEGORIES & PRODUCTS
-- ──────────────────────────────────────────────────────
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  icon text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.categories (id, name, slug, icon, display_order) values
  ('fresh-fruit', 'Trái cây tươi', 'trai-cay-tuoi', '🍎', 1),
  ('juice', 'Nước ép', 'nuoc-ep-nguyen-chat', '🧃', 2),
  ('smoothie', 'Sinh tố', 'sinh-to-smoothie', '🥤', 3),
  ('combo', 'Combo', 'combo', '🧺', 4)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, icon = excluded.icon, display_order = excluded.display_order;

create table if not exists public.products (
  id           text        primary key,
  name         text        not null,
  category_id  text        references public.categories(id) on delete set null,
  category     text        check (category in ('fresh-fruit', 'juice', 'combo')),
  price        integer     not null check (price >= 0),
  unit         text        not null,
  badge        text,
  image        text,
  fruit        text,
  accent       text,
  gradient     text,
  description  text,
  is_active    boolean     not null default true,
  is_available boolean     not null default true,
  is_bestseller boolean    not null default false,
  image_url    text,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  origin       text,
  farming_standard text,
  rating_avg   numeric(3,2) check (rating_avg is null or rating_avg between 0 and 5),
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- Add fields to databases created from the original version of this schema.
alter table public.products add column if not exists category_id text references public.categories(id) on delete set null;
alter table public.products alter column category drop not null;
alter table public.products add column if not exists is_available boolean not null default true;
alter table public.products add column if not exists is_bestseller boolean not null default false;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists stock_quantity integer check (stock_quantity is null or stock_quantity >= 0);
alter table public.products add column if not exists origin text;
alter table public.products add column if not exists farming_standard text;
alter table public.products add column if not exists rating_avg numeric(3,2) check (rating_avg is null or rating_avg between 0 and 5);
alter table public.products add column if not exists created_at timestamptz not null default now();

update public.products set category_id = category where category_id is null;
create index if not exists idx_products_category_available on public.products(category_id, is_available);
create index if not exists idx_products_created_at on public.products(created_at desc);

-- ──────────────────────────────────────────────────────
--  2. PROFILES (sync từ Supabase Auth)
-- ──────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  avatar_url text,
  role       text        not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Keep profile records in sync with Supabase Auth. Existing users are backfilled
-- without overwriting any assigned role or profile data.
insert into public.profiles (id, full_name)
select id, raw_user_meta_data ->> 'full_name' from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ──────────────────────────────────────────────────────
--  3. ORDERS
-- ──────────────────────────────────────────────────────
create table if not exists public.orders (
  id               uuid        primary key default gen_random_uuid(),
  order_code       text        not null unique,
  user_id          uuid        references auth.users(id) on delete set null,
  recipient_name   text        not null,
  recipient_phone  text        not null,
  shipping_address text        not null,
  note             text,

  -- Giá tiền
  subtotal         integer     not null default 0,
  shipping_fee     integer     not null default 0,
  discount_amount  integer     not null default 0,
  total_amount     integer     not null check (total_amount >= 0),

  -- Loyalty coins
  coins_used       integer     not null default 0,
  coins_earned     integer     not null default 0,

  -- Trạng thái
  order_status     text        not null default 'pending'
                                check (order_status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  payment_method   text        not null default 'cod'
                                check (payment_method in ('cod', 'vnpay', 'momo', 'bank_transfer', 'sepay')),
  payment_status   text        not null default 'unpaid'
                                check (payment_status in ('unpaid', 'paid', 'refunded')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

-- ──────────────────────────────────────────────────────
--  4. ORDER_ITEMS
-- ──────────────────────────────────────────────────────
create table if not exists public.order_items (
  id            bigserial   primary key,
  order_id      uuid        not null references public.orders(id) on delete cascade,
  product_id    text        references public.products(id) on delete set null,
  product_name  text        not null,
  unit_price    integer     not null check (unit_price >= 0),
  quantity      integer     not null check (quantity > 0),
  item_subtotal integer     not null check (item_subtotal >= 0)
);

-- ──────────────────────────────────────────────────────
--  5. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────
alter table public.products    enable row level security;
alter table public.categories  enable row level security;
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Products: ai cũng đọc được sản phẩm active
drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
  on public.products for select
  using (is_active = true);

drop policy if exists "Anyone can read active categories" on public.categories;
create policy "Anyone can read active categories"
  on public.categories for select
  using (is_active = true);

-- Orders: ai cũng tạo được đơn; chỉ chủ đơn mới xem/sửa được
drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
  on public.orders for insert
  with check (true);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders for select
  using (user_id = auth.uid() or user_id is null);

drop policy if exists "Users can cancel own orders" on public.orders;
create policy "Users can cancel own orders"
  on public.orders for update
  using (user_id = auth.uid())
  with check (order_status = 'cancelled');

-- Order items: xem được nếu xem được đơn chứa nó
drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items"
  on public.order_items for insert
  with check (true);

-- ──────────────────────────────────────────────────────
--  6. INDEX
-- ──────────────────────────────────────────────────────
create index if not exists idx_orders_user_id     on public.orders(user_id);
create index if not exists idx_orders_status      on public.orders(order_status);
create index if not exists idx_orders_created_at  on public.orders(created_at desc);
create index if not exists idx_order_items_order  on public.order_items(order_id);

-- ──────────────────────────────────────────────────────
--  7. SEED PRODUCTS
-- ──────────────────────────────────────────────────────
insert into public.products (id, name, category_id, category, price, unit, badge, image, fruit, accent, gradient, description, is_bestseller, is_available, sort_order)
values
  ('orange-juice-01', 'Citrus Punch', 'juice', 'juice', 35000, '350ml', 'Bán chạy', '🍊', '🍋', '#ffd782', 'linear-gradient(155deg, #fff8dc 0%, #ffe5a8 45%, #ffd16f 100%)', 'Cam vàng, chanh mật ong và bạc hà ép lạnh, vị chua ngọt bừng tỉnh.', true, true, 1),
  ('apple-juice-01', 'Green Glow Detox', 'juice', 'juice', 39000, '350ml', 'Mới', '🍏', '🥝', '#bff59b', 'linear-gradient(155deg, #f8fff0 0%, #dfffd2 45%, #9af09c 100%)', 'Táo xanh, cần tây, rau bina và lê cho buổi sáng detox nhẹ nhàng.', false, true, 2),
  ('mango-juice-01', 'Mango Sunrise', 'juice', 'juice', 42000, '350ml', 'Ngọt dịu', '🥭', '🍍', '#ffb55e', 'linear-gradient(155deg, #fff6d6 0%, #ffd28d 48%, #ff9d68 100%)', 'Xoài chín, dứa vàng và cam ép tạo lớp vị nhiệt đới thơm mượt.', false, true, 3),
  ('strawberry-01', 'Dâu Tây Đà Lạt Premium', 'fresh-fruit', 'fresh-fruit', 99000, '500g', 'Tươi trong ngày', '🍓', '🌿', '#ff7d7d', 'linear-gradient(155deg, #fff9dc 0%, #ffc9a8 46%, #ff7a76 100%)', 'Dâu tây Đà Lạt tuyển chọn, vị ngọt dịu, giao tươi trong ngày.', false, true, 4),
  ('banana-01', 'Ổi Ruby Ruột Hồng', 'fresh-fruit', 'fresh-fruit', 69000, 'kg', 'Giá tốt', '🍐', '🍃', '#97f4ac', 'linear-gradient(155deg, #ffffed 0%, #dbffc8 48%, #87ef9d 100%)', 'Ổi ruby ruột hồng giòn thơm, giàu vitamin C.', false, true, 5),
  ('watermelon-01', 'Măng Cụt Chín Mọng', 'fresh-fruit', 'fresh-fruit', 119000, 'kg', 'Mọng nước', '🟣', '🍃', '#c7b9ff', 'linear-gradient(155deg, #fffced 0%, #eadfff 48%, #b9aceb 100%)', 'Măng cụt tuyển chọn chín mọng, vị ngọt thanh tự nhiên.', false, true, 6),
  ('family-combo-01', 'Family Fresh Box', 'combo', 'combo', 159000, 'set', 'Tiết kiệm', '🧺', '🍇', '#ffe087', 'linear-gradient(155deg, #fff8e7 0%, #ffe49f 48%, #ffc778 100%)', 'Trái cây theo mùa và 2 chai nước ép cho cả gia đình.', false, true, 7),
  ('office-combo-01', 'Office Juice Party', 'combo', 'combo', 229000, 'set', 'Đặt nhóm', '🥤', '🍒', '#a6e9ff', 'linear-gradient(155deg, #f4fdff 0%, #c7f3ff 48%, #9dddf9 100%)', '6 chai nước ép mix vị, phù hợp tiệc nhẹ tại văn phòng.', false, true, 8)
on conflict (id) do update set
  name = excluded.name, category_id = excluded.category_id, category = excluded.category,
  price = excluded.price, unit = excluded.unit, badge = excluded.badge, image = excluded.image,
  fruit = excluded.fruit, accent = excluded.accent, gradient = excluded.gradient,
  description = excluded.description, is_bestseller = excluded.is_bestseller,
  is_available = excluded.is_available, is_active = true, sort_order = excluded.sort_order;

-- Backfill existing legacy products after categories are available.
update public.products set category_id = category where category_id is null;


-- Mark only the designated sample product as a bestseller.
update public.products set is_bestseller = (id = 'orange-juice-01') where id in ('orange-juice-01','apple-juice-01','mango-juice-01','strawberry-01','banana-01','watermelon-01','family-combo-01','office-combo-01');
