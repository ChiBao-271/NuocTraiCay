-- Migration 006: điểm danh hằng ngày cộng xu thật.
-- Chạy trong Supabase SQL Editor (một lần).

create table if not exists public.reward_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  coins_awarded integer not null default 5,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.reward_checkins enable row level security;

drop policy if exists "Reward checkins own" on public.reward_checkins;
create policy "Reward checkins own" on public.reward_checkins
  for select using (auth.uid() = user_id or public.is_admin());

grant usage on schema public to service_role;
grant select, insert on table public.reward_checkins to service_role;

create or replace function public.claim_daily_checkin(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_coins integer;
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  begin
    insert into public.reward_checkins (user_id, checkin_date, coins_awarded)
    values (p_user_id, v_date, 5);
  exception when unique_violation then
    raise exception 'ALREADY_CHECKED_IN';
  end;

  update public.profiles
     set coins = coalesce(coins, 0) + 5
   where id = p_user_id
   returning coins into v_coins;

  return coalesce(v_coins, 0);
end;
$$;

revoke all on function public.claim_daily_checkin(uuid) from public, anon, authenticated;
grant execute on function public.claim_daily_checkin(uuid) to service_role;

notify pgrst, 'reload schema';

