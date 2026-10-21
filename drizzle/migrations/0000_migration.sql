create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

-- first account to sign up becomes admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_first_admin after insert on auth.users
for each row execute function public.handle_first_admin();

create table public.players (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  mc_uuid text,
  region text not null default 'EU',
  created_at timestamptz not null default now()
);
grant select on public.players to anon, authenticated;
grant insert, update, delete on public.players to authenticated;
grant all on public.players to service_role;
alter table public.players enable row level security;
create policy "players public read" on public.players for select to anon, authenticated using (true);
create policy "admins insert players" on public.players for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update players" on public.players for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete players" on public.players for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.player_tiers (
  player_id uuid not null references public.players(id) on delete cascade,
  kit text not null,
  tier text not null check (tier in ('HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5')),
  updated_at timestamptz not null default now(),
  primary key (player_id, kit)
);
grant select on public.player_tiers to anon, authenticated;
grant insert, update, delete on public.player_tiers to authenticated;
grant all on public.player_tiers to service_role;
alter table public.player_tiers enable row level security;
create policy "tiers public read" on public.player_tiers for select to anon, authenticated using (true);
create policy "admins insert tiers" on public.player_tiers for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update tiers" on public.player_tiers for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete tiers" on public.player_tiers for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.players (username, region) values
('Technoblade','NA'),('Dream','NA'),('Marlowww','EU'),('relaxed17','EU'),('Yamine','AS'),('GentlePerry','EU'),('q1vs','EU'),('Rompsik_','EU');

insert into public.player_tiers (player_id, kit, tier)
select p.id, k.kit, (array['HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5'])[1 + floor(random()*10)::int]
from public.players p cross join (values ('sword'),('axe'),('mace'),('spearmace'),('uhc'),('smp'),('diasmp'),('diapot'),('nethop'),('bowcart'),('xbowcart')) k(kit)
where random() < 0.75;