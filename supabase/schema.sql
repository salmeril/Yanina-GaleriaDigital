-- Ejecutar una vez en SQL Editor de un proyecto Supabase propio.
-- Puede ejecutarse de nuevo sin borrar perfiles, obras ni archivos.
begin;

create table if not exists public.gallery_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  discipline text not null default '' check (char_length(discipline) <= 120),
  bio text not null default '' check (char_length(bio) <= 1500),
  is_public boolean not null default false,
  avatar_path text,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.gallery_profiles add column if not exists avatar_path text;

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
-- Roles, habilitación de participantes y revisión editorial.
create table if not exists public.gallery_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.gallery_memberships (
  artist_id uuid primary key references public.gallery_profiles(id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente','habilitada','suspendida')),
  -- Reservado para planes comerciales futuros. No otorga acceso por sí mismo.
  plan_code text not null default 'por_definir' check (plan_code ~ '^[a-z0-9_-]{1,48}$'),
  valid_until timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.gallery_reviews (
  id bigint generated always as identity primary key,
  work_id uuid not null references public.gallery_works(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('publicada','cambios')),
  note text not null default '' check (char_length(note) <= 1500),
  created_at timestamptz not null default now()
);
create index if not exists gallery_reviews_work_idx on public.gallery_reviews(work_id, id desc);

alter table public.gallery_works drop constraint if exists gallery_works_status_check;
alter table public.gallery_works add constraint gallery_works_status_check
  check (status in ('borrador','revision','cambios','publicada'));
insert into public.gallery_memberships(artist_id)
select id from public.gallery_profiles on conflict(artist_id) do nothing;
drop trigger if exists gallery_membership_version on public.gallery_memberships;
create trigger gallery_membership_version before update on public.gallery_memberships
for each row execute function public.gallery_bump_version();

create or replace function public.gallery_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gallery_profiles(id, name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'),100),''), 'Artista'))
  on conflict(id) do nothing;
  insert into public.gallery_memberships(artist_id) values(new.id)
  on conflict(artist_id) do nothing;
  return new;
end;
$$;
revoke all on function public.gallery_new_user() from public, anon, authenticated;

create or replace function public.gallery_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gallery_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.gallery_is_admin() from public, anon, authenticated;
grant execute on function public.gallery_is_admin() to anon, authenticated;

create or replace function public.gallery_artist_enabled(artist uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.gallery_memberships
    where artist_id = artist and status = 'habilitada'
    and (valid_until is null or valid_until > now()));
$$;
revoke all on function public.gallery_artist_enabled(uuid) from public, anon, authenticated;
grant execute on function public.gallery_artist_enabled(uuid) to anon, authenticated;

alter table public.gallery_admins enable row level security;
alter table public.gallery_memberships enable row level security;
alter table public.gallery_reviews enable row level security;
revoke all on public.gallery_admins, public.gallery_memberships, public.gallery_reviews from anon, authenticated;
grant select on public.gallery_admins, public.gallery_memberships, public.gallery_reviews to authenticated;
drop policy if exists gallery_admin_self on public.gallery_admins;
create policy gallery_admin_self on public.gallery_admins for select to authenticated
using(user_id = (select auth.uid()));
drop policy if exists gallery_membership_read on public.gallery_memberships;
create policy gallery_membership_read on public.gallery_memberships for select to authenticated
using(artist_id = (select auth.uid()) or (select public.gallery_is_admin()));
drop policy if exists gallery_review_read on public.gallery_reviews;
create policy gallery_review_read on public.gallery_reviews for select to authenticated
using((select public.gallery_is_admin()) or exists(
  select 1 from public.gallery_works w where w.id = work_id and w.artist_id = (select auth.uid())
));

-- Las observaciones editoriales se guardan en una tabla privada, fuera del catálogo.
drop policy if exists gallery_profile_read on public.gallery_profiles;
create policy gallery_profile_read on public.gallery_profiles for select to anon, authenticated
using((is_public and public.gallery_artist_enabled(id)) or id = (select auth.uid()) or (select public.gallery_is_admin()));
drop policy if exists gallery_work_read on public.gallery_works;
create policy gallery_work_read on public.gallery_works for select to anon, authenticated
using(artist_id = (select auth.uid()) or (select public.gallery_is_admin()) or (
  status = 'publicada' and public.gallery_artist_enabled(artist_id) and exists(
    select 1 from public.gallery_profiles p where p.id = artist_id and p.is_public
  )
));
drop policy if exists gallery_work_insert on public.gallery_works;
create policy gallery_work_insert on public.gallery_works for insert to authenticated
with check(artist_id = (select auth.uid()) and status = 'borrador');
drop policy if exists gallery_work_update on public.gallery_works;
create policy gallery_work_update on public.gallery_works for update to authenticated
using(artist_id = (select auth.uid()))
with check(artist_id = (select auth.uid()));

create or replace function public.gallery_guard_editorial()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Los clientes solo guardan borradores y envían a revisión.
  -- La aprobación se ejecuta desde una función privilegiada que comprueba el rol.
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' and new.status <> 'borrador' then
      raise exception 'La obra debe empezar en borrador.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      if (new.title,new.type,new.medium,new.details,new.price,new.cover_path,new.audio_path,new.alt)
        is distinct from (old.title,old.type,old.medium,old.details,old.price,old.cover_path,old.audio_path,old.alt) then
        new.status := 'borrador';
      elsif new.status in ('publicada','cambios') and new.status is distinct from old.status then
        raise exception 'La aprobación corresponde a la administración.' using errcode = '42501';
      end if;
    end if;
  end if;
  if new.status in ('revision','publicada') then
    if not public.gallery_artist_enabled(new.artist_id) then
      raise exception 'La participación debe estar habilitada para enviar o publicar obras.' using errcode = '42501';
    end if;
    if not exists(select 1 from public.gallery_profiles where id = new.artist_id and is_public) then
      raise exception 'Activá tu perfil público antes de enviar una obra.' using errcode = '42501';
    end if;
    if new.cover_path is null then
      raise exception 'Agregá una portada antes de enviar la obra.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.gallery_guard_editorial() from public, anon, authenticated;
drop trigger if exists gallery_work_editorial on public.gallery_works;
create trigger gallery_work_editorial before insert or update on public.gallery_works
for each row execute function public.gallery_guard_editorial();

-- La misma validación de archivos se aplica al envío a revisión.
create or replace function public.gallery_check_preview()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('revision','publicada') then
    if not exists(select 1 from storage.objects where bucket_id = 'gallery-previews' and name = new.cover_path) then
      raise exception 'La portada todavía no está disponible.';
    end if;
    if new.audio_path is not null and not exists(
      select 1 from storage.objects where bucket_id = 'gallery-previews' and name = new.audio_path
    ) then raise exception 'El audio todavía no está disponible.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.gallery_check_preview() from public, anon, authenticated;

drop policy if exists gallery_preview_insert on storage.objects;
create policy gallery_preview_insert on storage.objects for insert to authenticated
with check(bucket_id = 'gallery-previews' and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists(select 1 from public.gallery_memberships where artist_id = (select auth.uid()) and status <> 'suspendida'));
drop policy if exists gallery_preview_read on storage.objects;
create policy gallery_preview_read on storage.objects for select to anon, authenticated
using(bucket_id = 'gallery-previews' and (
  (storage.foldername(name))[1] = (select auth.uid()::text)
  or exists(select 1 from public.gallery_works w where (w.cover_path = storage.objects.name or w.audio_path = storage.objects.name)
    and ((select public.gallery_is_admin()) or (w.status = 'publicada' and public.gallery_artist_enabled(w.artist_id)
      and exists(select 1 from public.gallery_profiles p where p.id = w.artist_id and p.is_public))))
));

create or replace function public.gallery_review_work(p_work_id uuid, p_version integer, p_decision text, p_note text default '')
returns public.gallery_works language plpgsql security definer set search_path = '' as $$
declare
  work public.gallery_works;
begin
  if not public.gallery_is_admin() then
    raise exception 'Acceso exclusivo de administración.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('publicada','cambios') then
    raise exception 'Decisión inválida.';
  end if;
  if p_note is null or char_length(p_note) > 1500 or (p_decision = 'cambios' and char_length(btrim(p_note)) = 0) then
    raise exception 'Indicá una observación de hasta 1500 caracteres para devolver la obra.';
  end if;
  select * into work from public.gallery_works where id = p_work_id for update;
  if not found or work.version is distinct from p_version then
    raise exception 'La obra cambió. Actualizá el panel antes de decidir.';
  end if;
  if (p_decision = 'publicada' and work.status <> 'revision')
    or (p_decision = 'cambios' and work.status not in ('revision','publicada')) then
    raise exception 'Esta obra ya no está disponible para esa revisión.';
  end if;
  -- Serializar habilitación y publicación sobre la misma participación.
  perform 1 from public.gallery_memberships where artist_id = work.artist_id for update;
  update public.gallery_works set status = p_decision where id = p_work_id returning * into work;
  insert into public.gallery_reviews(work_id,reviewer_id,decision,note)
    values(p_work_id,auth.uid(),p_decision,btrim(p_note));
  return work;
end;
$$;
revoke all on function public.gallery_review_work(uuid,integer,text,text) from public, anon, authenticated;
grant execute on function public.gallery_review_work(uuid,integer,text,text) to authenticated;

create or replace function public.gallery_set_membership(p_artist_id uuid, p_version integer, p_status text)
returns public.gallery_memberships language plpgsql security definer set search_path = '' as $$
declare
  membership public.gallery_memberships;
begin
  if not public.gallery_is_admin() then
    raise exception 'Acceso exclusivo de administración.' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('pendiente','habilitada','suspendida') then
    raise exception 'Estado de participación inválido.';
  end if;
  update public.gallery_memberships set status = p_status
    where artist_id = p_artist_id and version = p_version returning * into membership;
  if not found then raise exception 'La participación cambió. Actualizá el panel.'; end if;
  return membership;
end;
$$;
revoke all on function public.gallery_set_membership(uuid,integer,text) from public, anon, authenticated;
grant execute on function public.gallery_set_membership(uuid,integer,text) to authenticated;


-- Vistas explícitas para que la portada pública muestre el mismo catálogo
-- incluso cuando quien navega es un administrador.
create or replace view public.gallery_public_profiles with (security_invoker = true) as
select id,name,discipline,bio,created_at,avatar_path from public.gallery_profiles
where is_public and public.gallery_artist_enabled(id);
create or replace view public.gallery_public_works with (security_invoker = true) as
select w.* from public.gallery_works w join public.gallery_profiles p on p.id = w.artist_id
where w.status = 'publicada' and p.is_public and public.gallery_artist_enabled(w.artist_id);
grant select on public.gallery_public_profiles, public.gallery_public_works to anon, authenticated;


-- Ficha privada de participantes.

create table if not exists public.gallery_account_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 150),
  birth_date date check (birth_date >= date '1900-01-01' and birth_date <= current_date),
  phone text not null default '' check (char_length(phone) <= 30),
  country text not null default '' check (char_length(country) <= 80),
  region text not null default '' check (char_length(region) <= 100),
  city text not null default '' check (char_length(city) <= 100),
  postal_code text not null default '' check (char_length(postal_code) <= 20),
  address_line1 text not null default '' check (char_length(address_line1) <= 180),
  address_line2 text not null default '' check (char_length(address_line2) <= 180),
  physical_works boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  constraint gallery_physical_address check (not physical_works or (
    char_length(btrim(country)) > 0 and char_length(btrim(region)) > 0 and
    char_length(btrim(city)) > 0 and char_length(btrim(postal_code)) > 0 and
    char_length(btrim(address_line1)) > 0
  ))
);

alter table public.gallery_account_details enable row level security;
revoke all on public.gallery_account_details from public, anon, authenticated;
grant select on public.gallery_account_details to authenticated;
grant insert(user_id, full_name, birth_date, phone, country, region, city,
  postal_code, address_line1, address_line2, physical_works)
  on public.gallery_account_details to authenticated;
grant update(full_name, birth_date, phone, country, region, city,
  postal_code, address_line1, address_line2, physical_works)
  on public.gallery_account_details to authenticated;

drop policy if exists gallery_details_read on public.gallery_account_details;
create policy gallery_details_read on public.gallery_account_details for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists gallery_details_insert on public.gallery_account_details;
create policy gallery_details_insert on public.gallery_account_details for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists gallery_details_update on public.gallery_account_details;
create policy gallery_details_update on public.gallery_account_details for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop trigger if exists gallery_details_version on public.gallery_account_details;
create trigger gallery_details_version before update on public.gallery_account_details
  for each row execute function public.gallery_bump_version();

-- La entrada de metadata nunca concede roles ni bloquea un alta por una fecha mal formada.
create or replace function public.gallery_parse_birth_date(value text)
returns date language plpgsql set search_path = '' as $$
declare parsed date;
begin
  if value is null or value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  parsed := value::date;
  if parsed < date '1900-01-01' or parsed > current_date then return null; end if;
  return parsed;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end;
$$;
revoke all on function public.gallery_parse_birth_date(text) from public, anon, authenticated;

create or replace function public.gallery_new_account_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gallery_account_details(user_id, birth_date, phone)
  values (new.id, public.gallery_parse_birth_date(new.raw_user_meta_data->>'birth_date'),
    left(coalesce(new.raw_user_meta_data->>'phone',''),30))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.gallery_new_account_details() from public, anon, authenticated;
drop trigger if exists gallery_account_details_created on auth.users;
create trigger gallery_account_details_created after insert on auth.users
  for each row execute function public.gallery_new_account_details();

insert into public.gallery_account_details(user_id, birth_date, phone)
select id, public.gallery_parse_birth_date(raw_user_meta_data->>'birth_date'),
  left(coalesce(raw_user_meta_data->>'phone',''),30)
from auth.users on conflict(user_id) do nothing;

-- No se incluyen estos campos en las vistas públicas ni en el directorio de artistas.

-- Fotos de perfil.

alter table public.gallery_profiles add column if not exists avatar_path text;
alter table public.gallery_profiles drop constraint if exists gallery_avatar_owner;
alter table public.gallery_profiles add constraint gallery_avatar_owner check (
  avatar_path is null or (char_length(avatar_path) between 1 and 240 and split_part(avatar_path,'/',1) = id::text)
);
grant update(avatar_path) on public.gallery_profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gallery-avatars','gallery-avatars',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists gallery_avatar_insert on storage.objects;
create policy gallery_avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='gallery-avatars' and (storage.foldername(name))[1]=(select auth.uid()::text));

drop policy if exists gallery_avatar_read on storage.objects;
create policy gallery_avatar_read on storage.objects for select to anon,authenticated
using(bucket_id='gallery-avatars' and (
  (storage.foldername(name))[1]=(select auth.uid()::text) or exists (
    select 1 from public.gallery_profiles p where p.avatar_path=storage.objects.name
    and p.is_public and public.gallery_artist_enabled(p.id)
  )
));

drop policy if exists gallery_avatar_delete on storage.objects;
create policy gallery_avatar_delete on storage.objects for delete to authenticated
using(bucket_id='gallery-avatars' and (storage.foldername(name))[1]=(select auth.uid()::text)
  and not exists(select 1 from public.gallery_profiles p where p.avatar_path=storage.objects.name));

create or replace function public.gallery_check_avatar()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.avatar_path is not null and new.avatar_path is distinct from old.avatar_path then
    if split_part(new.avatar_path,'/',1) <> new.id::text then
      raise exception 'La foto debe pertenecer a tu propia cuenta.' using errcode='42501';
    end if;
    if not exists(select 1 from storage.objects where bucket_id='gallery-avatars' and name=new.avatar_path) then
      raise exception 'Primero cargá la foto de perfil.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.gallery_check_avatar() from public,anon,authenticated;
drop trigger if exists gallery_profile_avatar on public.gallery_profiles;
create trigger gallery_profile_avatar before update of avatar_path on public.gallery_profiles
for each row execute function public.gallery_check_avatar();

create or replace view public.gallery_public_profiles with (security_invoker=true) as
select id,name,discipline,bio,created_at,avatar_path from public.gallery_profiles
where is_public and public.gallery_artist_enabled(id);
grant select on public.gallery_public_profiles to anon,authenticated;

commit;
