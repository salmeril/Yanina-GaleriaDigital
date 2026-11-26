-- Ejecutar después de las migraciones anteriores o de schema.sql. Repetible.
begin;
-- Perfiles públicos y fichas de obra. No modifica datos privados ni habilitaciones.
alter table public.gallery_profiles add column if not exists public_location text not null default '';
alter table public.gallery_profiles add column if not exists website text not null default '';
alter table public.gallery_profiles add column if not exists instagram text not null default '';

alter table public.gallery_profiles drop constraint if exists gallery_public_links;
alter table public.gallery_profiles add constraint gallery_public_links check (
  char_length(public_location)<=120 and char_length(website)<=300 and char_length(instagram)<=300
  and (website='' or website ~ '^https://[^/[:space:]@]+([/?#][^[:space:]]*)?$')
  and (instagram='' or instagram ~ '^https://(www\.)?instagram\.com/[^[:space:]]*$')
);
grant update(public_location,website,instagram) on public.gallery_profiles to authenticated;

alter table public.gallery_works add column if not exists year integer;
alter table public.gallery_works add column if not exists dimensions text not null default '';
alter table public.gallery_works add column if not exists framing text not null default '';
alter table public.gallery_works add column if not exists delivery text not null default 'coordinar';
alter table public.gallery_works add column if not exists file_format text not null default '';
alter table public.gallery_works add column if not exists resolution text not null default '';
alter table public.gallery_works add column if not exists license text not null default '';
alter table public.gallery_works add column if not exists deliverables text not null default '';
alter table public.gallery_works add column if not exists duration_seconds integer;
alter table public.gallery_works add column if not exists availability text not null default 'disponible';
alter table public.gallery_works add column if not exists gallery_images jsonb not null default '[]'::jsonb;
alter table public.gallery_works drop constraint if exists gallery_work_facts;
alter table public.gallery_works add constraint gallery_work_facts check (
  (year is null or year between 1 and 9999) and char_length(dimensions)<=120
  and framing in ('','sin_marco','con_marco','no_aplica')
  and delivery in ('coordinar','retiro','envio','ambos')
  and char_length(file_format)<=120 and char_length(resolution)<=120
  and char_length(license)<=1000 and char_length(deliverables)<=1000
  and (duration_seconds is null or duration_seconds between 1 and 86400)
  and availability in ('disponible','reservada','vendida','exposicion')
);
-- Solo se aceptan hasta cinco imágenes, con descripción y dentro de la carpeta del autor.
create or replace function public.gallery_valid_images(images jsonb, artist uuid)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(images) is distinct from 'array' then return false; end if;
  if jsonb_array_length(images)>5 then return false; end if;
  for item in select value from jsonb_array_elements(images) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    if (item - 'path' - 'alt') <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(item->'path') is distinct from 'string' or jsonb_typeof(item->'alt') is distinct from 'string' then return false; end if;
    if char_length(item->>'path') not between 1 and 240 or split_part(item->>'path','/',1)<>artist::text
      or char_length(btrim(item->>'alt')) not between 1 and 250 then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.gallery_valid_images(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.gallery_valid_images(jsonb,uuid) to anon,authenticated;
alter table public.gallery_works drop constraint if exists gallery_work_images;
alter table public.gallery_works add constraint gallery_work_images check (public.gallery_valid_images(gallery_images,artist_id));
grant insert(year,dimensions,framing,delivery,file_format,resolution,license,deliverables,duration_seconds,availability,gallery_images)
  on public.gallery_works to authenticated;
grant update(year,dimensions,framing,delivery,file_format,resolution,license,deliverables,duration_seconds,availability,gallery_images)
  on public.gallery_works to authenticated;

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
      if (new.title,new.type,new.medium,new.details,new.price,new.cover_path,new.audio_path,new.alt,new.year,new.dimensions,new.framing,new.delivery,new.file_format,new.resolution,new.license,new.deliverables,new.duration_seconds,new.availability,new.gallery_images)
        is distinct from (old.title,old.type,old.medium,old.details,old.price,old.cover_path,old.audio_path,old.alt,old.year,old.dimensions,old.framing,old.delivery,old.file_format,old.resolution,old.license,old.deliverables,old.duration_seconds,old.availability,old.gallery_images) then
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


create or replace function public.gallery_check_preview()
returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
  if new.status in ('revision','publicada') then
    if not exists(select 1 from storage.objects where bucket_id='gallery-previews' and name=new.cover_path) then
      raise exception 'La portada todavía no está disponible.';
    end if;
    if new.audio_path is not null and not exists(select 1 from storage.objects where bucket_id='gallery-previews' and name=new.audio_path) then
      raise exception 'El audio todavía no está disponible.';
    end if;
    -- La estructura se valida antes de recorrer el JSON, incluso si se altera por API.
    if not public.gallery_valid_images(new.gallery_images,new.artist_id) then
      raise exception 'Revisá las imágenes adicionales y sus descripciones.';
    end if;
    for item in select value from jsonb_array_elements(new.gallery_images) loop
      if not exists(select 1 from storage.objects where bucket_id='gallery-previews' and name=item->>'path') then
        raise exception 'Una imagen adicional todavía no está disponible.';
      end if;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.gallery_check_preview() from public,anon,authenticated;

drop policy if exists gallery_preview_read on storage.objects;
create policy gallery_preview_read on storage.objects for select to anon,authenticated
using(bucket_id='gallery-previews' and (
  (storage.foldername(name))[1]=(select auth.uid()::text) or exists(
    select 1 from public.gallery_works w where
    (w.cover_path=storage.objects.name or w.audio_path=storage.objects.name or exists(
      select 1 from jsonb_array_elements(w.gallery_images) item where item->>'path'=storage.objects.name))
    and ((select public.gallery_is_admin()) or (w.status='publicada' and public.gallery_artist_enabled(w.artist_id)
      and exists(select 1 from public.gallery_profiles p where p.id=w.artist_id and p.is_public)))
  )
));
drop policy if exists gallery_preview_delete on storage.objects;
create policy gallery_preview_delete on storage.objects for delete to authenticated
using(bucket_id='gallery-previews' and (storage.foldername(name))[1]=(select auth.uid()::text)
  and not exists(select 1 from public.gallery_works w where w.cover_path=storage.objects.name or w.audio_path=storage.objects.name
    or exists(select 1 from jsonb_array_elements(w.gallery_images) item where item->>'path'=storage.objects.name)));

create or replace view public.gallery_public_profiles with (security_invoker=true) as
select id,name,discipline,bio,created_at,avatar_path,public_location,website,instagram from public.gallery_profiles
where is_public and public.gallery_artist_enabled(id);
create or replace view public.gallery_public_works with (security_invoker=true) as
select w.* from public.gallery_works w join public.gallery_profiles p on p.id=w.artist_id
where w.status='publicada' and p.is_public and public.gallery_artist_enabled(w.artist_id);
grant select on public.gallery_public_profiles,public.gallery_public_works to anon,authenticated;

notify pgrst, 'reload schema';
commit;
