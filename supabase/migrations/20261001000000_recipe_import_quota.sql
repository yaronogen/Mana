create table if not exists public.recipe_import_usage (
  user_id uuid not null,
  usage_date date not null default (now() at time zone 'utc')::date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);

alter table public.recipe_import_usage enable row level security;

create or replace function public.consume_recipe_import(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  quota_row public.recipe_import_usage;
begin
  insert into public.recipe_import_usage (user_id, usage_date, request_count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date)
  do update set request_count = public.recipe_import_usage.request_count + 1
  where public.recipe_import_usage.request_count < 30
  returning * into quota_row;

  return found;
end;
$$;

revoke all on function public.consume_recipe_import(uuid) from public, anon, authenticated;
grant execute on function public.consume_recipe_import(uuid) to service_role;
revoke all on table public.recipe_import_usage from public, anon, authenticated;
grant all on table public.recipe_import_usage to service_role;
