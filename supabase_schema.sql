-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Transactions Table (General Ledger)
-- Simplified: no categories table, direct text for subcategories
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  date date not null default current_date,
  main_category text not null check (main_category in ('expense', 'income')),
  subcategory text not null,
  description text,
  amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchases Table (Detailed Ingredients)
create table if not exists public.purchases (
  id uuid default uuid_generate_v4() primary key,
  date date not null default current_date,
  item_name text not null,
  quantity numeric not null,
  unit text not null default 'kg',
  unit_price numeric not null,
  total_price numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Revenue Entries Table (Detailed Sales)
-- Simplified: period indicates category, subcategory is the product
create table if not exists public.revenue_entries (
  id uuid default uuid_generate_v4() primary key,
  date date not null default current_date,
  period text not null check (period in ('morning', 'evening')),
  subcategory text not null,
  amount numeric not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.transactions enable row level security;
alter table public.purchases enable row level security;
alter table public.revenue_entries enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow all access for authenticated users" on public.transactions;
drop policy if exists "Allow all access for authenticated users" on public.purchases;
drop policy if exists "Allow all access for authenticated users" on public.revenue_entries;

-- Create policies to allow all access for authenticated users
create policy "Allow all access for authenticated users" on public.transactions for all using (auth.role() = 'authenticated');
create policy "Allow all access for authenticated users" on public.purchases for all using (auth.role() = 'authenticated');
create policy "Allow all access for authenticated users" on public.revenue_entries for all using (auth.role() = 'authenticated');

-- Note: The categories table is no longer needed for this simplified approach
-- If you have an existing categories table, you can drop it:
-- drop table if exists public.categories cascade;
