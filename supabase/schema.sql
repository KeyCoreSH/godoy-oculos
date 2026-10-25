-- Godoy | Óculos Premium — banco da coleção e do painel admin.
-- Pode ser rodado mais de uma vez (idempotente).

-- ---------- Quem pode editar ----------
-- O admin é o usuário com app_metadata.role = 'admin' (só a chave secreta consegue definir isso).
create or replace function public.is_admin()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Tabelas ----------
create table if not exists public.categories (
  id         text primary key check (id ~ '^[a-z0-9-]+$'),
  label      text not null,
  position   int  not null default 0
);

create table if not exists public.frame_colors (
  key        text primary key check (key ~ '^[a-z0-9-]+$'),
  label      text not null,
  color      text,
  swatch     text,
  pattern    text check (pattern in ('tortoise', 'wood')),
  position   int  not null default 0
);

create table if not exists public.lens_colors (
  key          text primary key check (key ~ '^[a-z0-9-]+$'),
  label        text not null,
  top_color    text not null,
  bottom_color text not null,
  opacity      numeric(3,2) not null default .9 check (opacity between .3 and 1),
  position     int not null default 0
);

create table if not exists public.products (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  name        text not null,
  shape       text not null check (shape in ('redondo','wayfarer','quadrado','clubmaster','aviador','gatinho','hexagonal')),
  category    text references public.categories(id) on update cascade on delete set null,
  type_label  text not null default '',
  badge       text,
  badge_short text,
  badge_gold  boolean not null default false,
  description text not null default '',
  material    text not null default '',
  faces       text not null default '',
  frames      text[] not null default '{}',
  lenses      text[] not null default '{}',
  temple      text,
  -- [{ "path": "roma/abc.webp", "url": "https://…", "frame": "preto" | null }]
  images      jsonb not null default '[]'::jsonb,
  position    int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.settings (
  id           int primary key default 1 check (id = 1),
  whatsapp     text not null default '5581982888904',
  instagram    text not null default 'godoy_oculos',
  hero_product text,
  updated_at   timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

create index if not exists products_position_idx on public.products (position);

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------- Permissões (RLS) ----------
alter table public.categories   enable row level security;
alter table public.frame_colors enable row level security;
alter table public.lens_colors  enable row level security;
alter table public.products     enable row level security;
alter table public.settings     enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.frame_colors, public.lens_colors, public.products, public.settings to anon, authenticated;
grant insert, update, delete on public.categories, public.frame_colors, public.lens_colors, public.products, public.settings to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['categories','frame_colors','lens_colors','settings'] loop
    execute format('drop policy if exists "leitura publica" on public.%I', t);
    execute format('create policy "leitura publica" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin edita" on public.%I', t);
    execute format('create policy "admin edita" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "leitura publica" on public.products;
create policy "leitura publica" on public.products for select using (published or public.is_admin());
drop policy if exists "admin edita" on public.products;
create policy "admin edita" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "godoy admin le fotos" on storage.objects;
create policy "godoy admin le fotos" on storage.objects for select to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "godoy admin envia fotos" on storage.objects;
create policy "godoy admin envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "godoy admin troca fotos" on storage.objects;
create policy "godoy admin troca fotos" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
drop policy if exists "godoy admin apaga fotos" on storage.objects;
create policy "godoy admin apaga fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
