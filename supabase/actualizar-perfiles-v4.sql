-- Actualización conjunta: ficha privada y fotos de perfil. Conserva datos existentes.
begin;

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
