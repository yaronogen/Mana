-- Translating recipes the user already saved (shown after changing the app language) does not count as an
-- import. It has its own monthly allowance per user as abuse protection: 300 translations per calendar month (UTC).

create table if not exists public.recipe_translation_monthly (
  user_id uuid not null,
  usage_month date not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_month)
);

alter table public.recipe_translation_monthly enable row level security;
revoke all on table public.recipe_translation_monthly from public, anon, authenticated;
grant all on table public.recipe_translation_monthly to service_role;

create or replace function public.consume_recipe_translation(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  insert into public.recipe_translation_monthly (user_id, usage_month, request_count)
  values (p_user_id, current_month, 1)
  on conflict (user_id, usage_month)
  do update set request_count = public.recipe_translation_monthly.request_count + 1
  where public.recipe_translation_monthly.request_count < 300;
  return found;
end;
$$;

revoke all on function public.consume_recipe_translation(uuid) from public, anon, authenticated;
grant execute on function public.consume_recipe_translation(uuid) to service_role;
