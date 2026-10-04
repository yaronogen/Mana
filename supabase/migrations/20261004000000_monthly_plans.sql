-- Monthly import limits by plan: Free = 3 imports per calendar month (UTC), Premium = 50.
-- Replaces the earlier 30-per-day quota. Each recipe imported from a link or pasted text counts as one import.

create table if not exists public.account_plans (
  user_id uuid primary key,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  -- Premium is active while premium_until is in the future (set by the App Store purchase webhook).
  premium_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_import_monthly (
  user_id uuid not null,
  usage_month date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_month)
);

alter table public.account_plans enable row level security;
alter table public.recipe_import_monthly enable row level security;
revoke all on table public.account_plans from public, anon, authenticated;
revoke all on table public.recipe_import_monthly from public, anon, authenticated;
grant all on table public.account_plans to service_role;
grant all on table public.recipe_import_monthly to service_role;

create or replace function public.recipe_import_limit(p_user_id uuid)
returns table (plan text, monthly_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when ap.plan = 'premium' and ap.premium_until > now() then 'premium' else 'free' end,
    case when ap.plan = 'premium' and ap.premium_until > now() then 50 else 3 end
  from (select 1) as one
  left join public.account_plans ap on ap.user_id = p_user_id;
$$;

-- Current plan and this month's usage, without consuming an import.
create or replace function public.recipe_import_status(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', now() at time zone 'utc')::date;
  limits record;
  used integer;
begin
  select * into limits from public.recipe_import_limit(p_user_id);
  select coalesce(sum(request_count), 0) into used
    from public.recipe_import_monthly where user_id = p_user_id and usage_month = current_month;
  return jsonb_build_object(
    'plan', limits.plan,
    'used', used,
    'limit', limits.monthly_limit,
    'resetsAt', (current_month + interval '1 month')::date
  );
end;
$$;

-- Consumes one import if the monthly limit allows it. Same name and boolean result as before.
create or replace function public.consume_recipe_import(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', now() at time zone 'utc')::date;
  allowed_limit integer;
begin
  select monthly_limit into allowed_limit from public.recipe_import_limit(p_user_id);
  insert into public.recipe_import_monthly (user_id, usage_month, request_count)
  values (p_user_id, current_month, 1)
  on conflict (user_id, usage_month)
  do update set request_count = public.recipe_import_monthly.request_count + 1
  where public.recipe_import_monthly.request_count < allowed_limit;
  return found;
end;
$$;

revoke all on function public.recipe_import_limit(uuid) from public, anon, authenticated;
revoke all on function public.recipe_import_status(uuid) from public, anon, authenticated;
revoke all on function public.consume_recipe_import(uuid) from public, anon, authenticated;
grant execute on function public.recipe_import_limit(uuid) to service_role;
grant execute on function public.recipe_import_status(uuid) to service_role;
grant execute on function public.consume_recipe_import(uuid) to service_role;
