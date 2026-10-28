-- NUBE.2b (ADR 096 D7): la persona borra su cuenta completa desde Ajustes.
-- La función corre con los permisos de su dueño (security definer), no
-- recibe parámetros y solo borra a quien la llama: el id sale del token
-- (auth.uid()). Todo lo del usuario en la nube cuelga de auth.users con
-- "on delete cascade" (registros, codigos_nino, vinculos_nino), así que se
-- va con él en la misma transacción. La app la llama con su propio token por
-- /rest/v1/rpc/borrar_mi_cuenta: la clave secreta no hace falta en ningún
-- lado. Toda tabla nueva con datos de un usuario debe colgar de auth.users
-- con "on delete cascade", o esta función la dejaría atrás.
-- Requiere 001-registros.sql. Prueba: pruebas-borrar-cuenta.sql.

create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'sin-sesion' using errcode = '42501';
  end if;
  delete from auth.users where id = yo;
end;
$$;

revoke all on function public.borrar_mi_cuenta() from public, anon, authenticated;
grant execute on function public.borrar_mi_cuenta() to authenticated;
