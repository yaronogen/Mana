-- Calorie estimates for saved recipes (made once per recipe, kept on the phone) do not count as imports.
-- Like translations, they have their own monthly allowance per user as abuse protection: 300 per calendar month (UTC).

create table if not exists public.nutrition_estimate_monthly (
  user_id uuid not null,
  usage_month date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_month)
);

alter table public.nutrition_estimate_monthly enable row level security;
revoke all on table public.nutrition_estimate_monthly from public, anon, authenticated;
grant all on table public.nutrition_estimate_monthly to service_role;

create or replace function public.consume_nutrition_estimate(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  insert into public.nutrition_estimate_monthly (user_id, usage_month, request_count)
  values (p_user_id, current_month, 1)
  on conflict (user_id, usage_month)
  do update set request_count = public.nutrition_estimate_monthly.request_count + 1
  where public.nutrition_estimate_monthly.request_count < 300;
  return found;
end;
$$;

revoke all on function public.consume_nutrition_estimate(uuid) from public, anon, authenticated;
grant execute on function public.consume_nutrition_estimate(uuid) to service_role;
