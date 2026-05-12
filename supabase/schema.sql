-- Wearly — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- ─────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  city          text default 'Singapore',
  style_prefs   text[] default '{}',
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users see own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- Clothing Items
-- ─────────────────────────────────────────
create table if not exists clothing_items (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references profiles(id) on delete cascade,
  name                  text not null,
  category              text not null,
  color_hex             text not null,
  color_name            text not null,
  image_url             text not null,
  image_bg_removed_url  text,
  brand                 text,
  tags                  text[] default '{}',
  times_worn            integer default 0,
  last_worn             date,
  created_at            timestamptz default now()
);

alter table clothing_items enable row level security;

create policy "Users manage own clothing"
  on clothing_items for all using (auth.uid() = user_id);

create index idx_clothing_user on clothing_items(user_id);
create index idx_clothing_category on clothing_items(category);

-- ─────────────────────────────────────────
-- Outfits
-- ─────────────────────────────────────────
create table if not exists outfits (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  occasion    text not null,
  item_ids    uuid[] not null,
  ai_reason   text,
  worn_date   date,
  created_at  timestamptz default now()
);

alter table outfits enable row level security;

create policy "Users manage own outfits"
  on outfits for all using (auth.uid() = user_id);

create index idx_outfits_user on outfits(user_id);
create index idx_outfits_worn_date on outfits(worn_date desc);

-- ─────────────────────────────────────────
-- Calendar Entries
-- ─────────────────────────────────────────
create table if not exists calendar_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  date        date not null,
  event_type  text,
  outfit_id   uuid references outfits(id) on delete set null,
  created_at  timestamptz default now(),
  unique(user_id, date)
);

alter table calendar_entries enable row level security;

create policy "Users manage own calendar"
  on calendar_entries for all using (auth.uid() = user_id);

create index idx_calendar_user_date on calendar_entries(user_id, date);

-- ─────────────────────────────────────────
-- Function: increment_worn_count
-- ─────────────────────────────────────────
create or replace function increment_worn_count(item_ids uuid[])
returns void language plpgsql security definer as $$
begin
  update clothing_items
  set
    times_worn = times_worn + 1,
    last_worn  = current_date
  where id = any(item_ids)
    and user_id = auth.uid();
end;
$$;
