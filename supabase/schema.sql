-- Ejecutar una vez en SQL Editor de un proyecto Supabase propio.
-- Puede ejecutarse de nuevo sin borrar perfiles, obras ni archivos.
begin;

create table if not exists public.gallery_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  discipline text not null default '' check (char_length(discipline) <= 120),
  bio text not null default '' check (char_length(bio) <= 1500),
  is_public boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_works (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.gallery_profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  type text not null check (type in ('fisica', 'digital', 'musica')),
  medium text not null check (char_length(btrim(medium)) between 1 and 100),
  details text not null check (char_length(btrim(details)) between 1 and 1500),
  price numeric(12,2) not null check (price > 0 and price <= 999999999),
  cover_path text,
  audio_path text,
  alt text not null default '' check (char_length(alt) <= 250),
  status text not null default 'borrador' check (status in ('borrador', 'publicada')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint gallery_cover_owner check (cover_path is null or split_part(cover_path, '/', 1) = artist_id::text),
  constraint gallery_audio_owner check (audio_path is null or split_part(audio_path, '/', 1) = artist_id::text),
  constraint gallery_cover_alt check (cover_path is null or char_length(btrim(alt)) > 0),
  constraint gallery_published_cover check (status <> 'publicada' or cover_path is not null)
);
create index if not exists gallery_works_artist_idx on public.gallery_works(artist_id);
create index if not exists gallery_works_status_idx on public.gallery_works(status);

create or replace function public.gallery_bump_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;
drop trigger if exists gallery_profile_version on public.gallery_profiles;
create trigger gallery_profile_version before update on public.gallery_profiles
for each row execute function public.gallery_bump_version();
drop trigger if exists gallery_work_version on public.gallery_works;
create trigger gallery_work_version before update on public.gallery_works
for each row execute function public.gallery_bump_version();

create or replace function public.gallery_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gallery_profiles(id, name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'),100),''), 'Artista'))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.gallery_new_user() from public;
drop trigger if exists gallery_user_created on auth.users;
create trigger gallery_user_created after insert on auth.users
for each row execute function public.gallery_new_user();
insert into public.gallery_profiles(id, name)
select id, coalesce(nullif(left(btrim(raw_user_meta_data->>'name'),100),''), 'Artista')
from auth.users on conflict(id) do nothing;

alter table public.gallery_profiles enable row level security;
alter table public.gallery_works enable row level security;
revoke all on public.gallery_profiles, public.gallery_works from anon, authenticated;
grant select on public.gallery_profiles, public.gallery_works to anon, authenticated;
grant update(name, discipline, bio, is_public) on public.gallery_profiles to authenticated;
grant insert(id, artist_id, title, type, medium, details, price, cover_path, audio_path, alt, status)
  on public.gallery_works to authenticated;
grant update(title, type, medium, details, price, cover_path, audio_path, alt, status)
  on public.gallery_works to authenticated;

-- Perfiles privados visibles únicamente para su titular.
drop policy if exists gallery_profile_read on public.gallery_profiles;
create policy gallery_profile_read on public.gallery_profiles for select to anon, authenticated
using (is_public or id = (select auth.uid()));
drop policy if exists gallery_profile_update on public.gallery_profiles;
create policy gallery_profile_update on public.gallery_profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Solo el autor puede crear o editar. El navegador no determina los permisos.
drop policy if exists gallery_work_read on public.gallery_works;
create policy gallery_work_read on public.gallery_works for select to anon, authenticated
using (artist_id = (select auth.uid()) or (
  status = 'publicada' and exists (
    select 1 from public.gallery_profiles p where p.id = artist_id and p.is_public
  )
));
drop policy if exists gallery_work_insert on public.gallery_works;
create policy gallery_work_insert on public.gallery_works for insert to authenticated
with check (artist_id = (select auth.uid()) and (
  status = 'borrador' or exists (
    select 1 from public.gallery_profiles p where p.id = artist_id and p.is_public
  )
));
drop policy if exists gallery_work_update on public.gallery_works;
create policy gallery_work_update on public.gallery_works for update to authenticated
using (artist_id = (select auth.uid()))
with check (artist_id = (select auth.uid()) and (
  status = 'borrador' or exists (
    select 1 from public.gallery_profiles p where p.id = artist_id and p.is_public
  )
));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-previews', 'gallery-previews', false, 10485760,
  array['image/jpeg','image/png','image/webp','audio/mpeg','audio/wav','audio/x-wav','audio/ogg'])
on conflict(id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- El bucket almacena portadas y audio de muestra, nunca el archivo digital vendido.
drop policy if exists gallery_preview_insert on storage.objects;
create policy gallery_preview_insert on storage.objects for insert to authenticated
with check (bucket_id = 'gallery-previews' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists gallery_preview_read on storage.objects;
create policy gallery_preview_read on storage.objects for select to anon, authenticated
using (bucket_id = 'gallery-previews' and (
  (storage.foldername(name))[1] = (select auth.uid()::text)
  or exists (
    select 1 from public.gallery_works w join public.gallery_profiles p on p.id = w.artist_id
    where w.status = 'publicada' and p.is_public and (w.cover_path = storage.objects.name or w.audio_path = storage.objects.name)
  )
));
-- Borrar solo archivos propios que ya no estén referenciados por una obra.
-- Esto protege archivos ante una respuesta perdida después de guardar la fila.
drop policy if exists gallery_preview_delete on storage.objects;
create policy gallery_preview_delete on storage.objects for delete to authenticated
using (bucket_id = 'gallery-previews' and (storage.foldername(name))[1] = (select auth.uid()::text)
  and not exists (select 1 from public.gallery_works w where w.cover_path = storage.objects.name or w.audio_path = storage.objects.name));

-- Antes de publicar, comprobar que los archivos existen en el bucket privado.
create or replace function public.gallery_check_preview()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicada' then
    if not exists (select 1 from storage.objects where bucket_id = 'gallery-previews' and name = new.cover_path) then
      raise exception 'La portada todavía no está disponible. Guardá la obra y volvé a intentar.';
    end if;
    if new.audio_path is not null and not exists (
      select 1 from storage.objects where bucket_id = 'gallery-previews' and name = new.audio_path
    ) then
      raise exception 'El audio todavía no está disponible.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.gallery_check_preview() from public;
drop trigger if exists gallery_work_preview on public.gallery_works;
create trigger gallery_work_preview before insert or update on public.gallery_works
for each row execute function public.gallery_check_preview();
commit;
