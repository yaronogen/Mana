-- Recipes one Mana user sends to another through a share link. Only the recipe itself is stored (no photo
-- from the phone, rating, notes or cook log). Links expire after 90 days. Abuse protection: 50 shares per
-- user per day. The app never reads this table directly; the recipe-process Edge Function does, as service_role.

create table if not exists public.shared_recipes (
  code text primary key check (code ~ '^[A-Za-z0-9]{10}$'),
  recipe jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

create index if not exists shared_recipes_creator_idx on public.shared_recipes (created_by, created_at desc);
create index if not exists shared_recipes_expiry_idx on public.shared_recipes (expires_at);

alter table public.shared_recipes enable row level security;
revoke all on table public.shared_recipes from public, anon, authenticated;
grant all on table public.shared_recipes to service_role;

create or replace function public.create_shared_recipe(p_user_id uuid, p_code text, p_recipe jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Expired links are removed as new ones are made.
  delete from public.shared_recipes where expires_at < now();
  if (select count(*) from public.shared_recipes where created_by = p_user_id and created_at > now() - interval '1 day') >= 50 then
    return false;
  end if;
  insert into public.shared_recipes (code, recipe, created_by) values (p_code, p_recipe, p_user_id);
  return true;
end;
$$;

revoke all on function public.create_shared_recipe(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_shared_recipe(uuid, text, jsonb) to service_role;
