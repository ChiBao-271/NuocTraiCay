create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('fresh-fruit', 'juice', 'combo')),
  price integer not null check (price >= 0),
  unit text not null,
  badge text,
  image text,
  fruit text,
  accent text,
  gradient text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  note text,
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipping', 'completed', 'cancelled')),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products for select
using (is_active = true);

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders"
on public.orders for insert
with check (true);

insert into public.products (id, name, category, price, unit, badge, image, fruit, accent, gradient, description, sort_order)
values
  ('orange-juice-01', 'Citrus Punch', 'juice', 35000, '350ml', 'Bán chạy', '🍊', '🍋', '#ffd782', 'linear-gradient(155deg, #fff8dc 0%, #ffe5a8 45%, #ffd16f 100%)', 'Cam vàng, chanh mật ong và bạc hà ép lạnh, vị chua ngọt bừng tỉnh.', 1),
  ('apple-juice-01', 'Green Glow Detox', 'juice', 39000, '350ml', 'Mới', '🍏', '🥝', '#bff59b', 'linear-gradient(155deg, #f8fff0 0%, #dfffd2 45%, #9af09c 100%)', 'Táo xanh, cần tây, rau bina và lê cho buổi sáng detox nhẹ nhàng.', 2),
  ('mango-juice-01', 'Mango Sunrise', 'juice', 42000, '350ml', 'Ngọt dịu', '🥭', '🍍', '#ffb55e', 'linear-gradient(155deg, #fff6d6 0%, #ffd28d 48%, #ff9d68 100%)', 'Xoài chín, dứa vàng và cam ép tạo lớp vị nhiệt đới thơm mượt.', 3),
  ('strawberry-01', 'Sparkling Strawberry Orchard', 'fresh-fruit', 109000, 'combo', 'Tươi trong ngày', '🍓', '🌿', '#ff7d7d', 'linear-gradient(155deg, #fff9dc 0%, #ffc9a8 46%, #ff7a76 100%)', 'Dâu tây Đà Lạt tuyển chọn kèm sparkling juice vị ngọt thanh.', 4),
  ('banana-01', 'Ruby Guava Sparkle', 'fresh-fruit', 69000, 'set', 'Giá tốt', '🍐', '🍃', '#97f4ac', 'linear-gradient(155deg, #ffffed 0%, #dbffc8 48%, #87ef9d 100%)', 'Ổi ruby ruột hồng kết hợp nước ép xanh, hậu vị mát và giàu vitamin C.', 5),
  ('watermelon-01', 'Royal Mangosteen Sparkle', 'fresh-fruit', 119000, 'combo', 'Mọng nước', '🟣', '🍃', '#c7b9ff', 'linear-gradient(155deg, #fffced 0%, #eadfff 48%, #b9aceb 100%)', 'Măng cụt chín mọng, nước ép tím dịu và lớp hương kem trái cây sang nhẹ.', 6),
  ('family-combo-01', 'Family Fresh Box', 'combo', 159000, 'set', 'Tiết kiệm', '🧺', '🍇', '#ffe087', 'linear-gradient(155deg, #fff8e7 0%, #ffe49f 48%, #ffc778 100%)', 'Trái cây theo mùa, 2 chai nước ép và voucher giảm 30% cho đơn sau.', 7),
  ('office-combo-01', 'Office Juice Party', 'combo', 229000, 'set', 'Đặt nhóm', '🥤', '🍒', '#a6e9ff', 'linear-gradient(155deg, #f4fdff 0%, #c7f3ff 48%, #9dddf9 100%)', '6 chai nước ép mix vị, giao lạnh tận văn phòng và tặng điểm Rewards.', 8)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  unit = excluded.unit,
  badge = excluded.badge,
  image = excluded.image,
  fruit = excluded.fruit,
  accent = excluded.accent,
  gradient = excluded.gradient,
  description = excluded.description,
  sort_order = excluded.sort_order;
