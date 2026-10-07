-- Testers: 20 imports per calendar month (UTC) instead of the free 3, unlocked in Settings with a tester code.
-- The code itself is a server secret (TESTER_CODE) checked by the recipe-process Edge Function; this migration
-- only stores who redeemed it. Wrong codes are limited to 10 attempts per user per day.

alter table public.account_plans drop constraint if exists account_plans_plan_check;
alter table public.account_plans add constraint account_plans_plan_check check (plan in ('free', 'premium', 'tester'));

create or replace function public.recipe_import_limit(p_user_id uuid)
returns table (plan text, monthly_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when ap.plan = 'premium' and ap.premium_until > now() then 'premium' when ap.plan = 'tester' then 'tester' else 'free' end,
    case when ap.plan = 'premium' and ap.premium_until > now() then 50 when ap.plan = 'tester' then 20 else 3 end
  from (select 1) as one
  left join public.account_plans ap on ap.user_id = p_user_id;
$$;

create table if not exists public.tester_code_attempts (
  user_id uuid not null,
  attempt_day date not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (user_id, attempt_day)
);

alter table public.tester_code_attempts enable row level security;
revoke all on table public.tester_code_attempts from public, anon, authenticated;
grant all on table public.tester_code_attempts to service_role;

-- Records one attempt and, when the Edge Function found the code valid, makes the user a tester.
-- Returns 'ok', 'invalid' or 'limit'. An active Premium plan is never downgraded.
create or replace function public.redeem_tester_code(p_user_id uuid, p_valid boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  insert into public.tester_code_attempts (user_id, attempt_day, attempt_count)
  values (p_user_id, today, 1)
  on conflict (user_id, attempt_day)
  do update set attempt_count = public.tester_code_attempts.attempt_count + 1
  where public.tester_code_attempts.attempt_count < 10;
  if not found then
    return 'limit';
  end if;
  if not p_valid then
    return 'invalid';
  end if;
  insert into public.account_plans (user_id, plan, updated_at)
  values (p_user_id, 'tester', now())
  on conflict (user_id) do update
    set plan = case when public.account_plans.plan = 'premium' and public.account_plans.premium_until > now() then 'premium' else 'tester' end,
        updated_at = now();
  return 'ok';
end;
$$;

revoke all on function public.redeem_tester_code(uuid, boolean) from public, anon, authenticated;
grant execute on function public.redeem_tester_code(uuid, boolean) to service_role;
