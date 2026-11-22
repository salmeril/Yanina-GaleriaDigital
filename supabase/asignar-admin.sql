-- Ejecutar en SQL Editor después de schema.sql y de crear la cuenta desde la web.
-- Reemplazá EMAIL_DEL_ADMIN por el correo exacto de la cuenta que administrará.
-- Se puede repetir para la cuenta de Yanina y para la de Lucas.
do $$
declare target_user uuid;
begin
  select id into target_user from auth.users where lower(email) = lower('EMAIL_DEL_ADMIN');
  if target_user is null then
    raise exception 'Primero creá la cuenta desde la web y reemplazá EMAIL_DEL_ADMIN por su correo.';
  end if;
  insert into public.gallery_admins(user_id) values(target_user)
  on conflict(user_id) do nothing;
end;
$$;
