-- Create enum for user roles
create type public.app_role as enum ('user', 'premium');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create user_subscriptions table
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  plan_type text check (plan_type in ('free', 'monthly', 'yearly')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_subscriptions enable row level security;

-- RLS policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS policies for user_subscriptions
create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own subscription"
  on public.user_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on public.user_subscriptions for update
  to authenticated
  using (auth.uid() = user_id);

-- Function to automatically create user role on signup
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  insert into public.user_subscriptions (user_id, plan_type, subscription_status)
  values (new.id, 'free', 'active');
  
  return new;
end;
$$;

-- Trigger to create user role on signup
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for user_subscriptions updated_at
create trigger on_user_subscription_updated
  before update on public.user_subscriptions
  for each row execute procedure public.handle_updated_at();