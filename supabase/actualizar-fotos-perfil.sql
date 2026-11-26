-- Fotos de perfil. Ejecutar después del esquema base de la galería.
-- Repetible: conserva las cuentas, los perfiles y sus obras.
begin;

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
