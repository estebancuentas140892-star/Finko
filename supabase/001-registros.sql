-- NUBE.2 (ADR 096 D4): un registro por fila, gana el cambio más reciente.
-- Aplicado el 2026-10-27 en finko-prueba. Reemplazó a la tabla `respaldos`
-- de NUBE.1, que se retiró vacía.

create table public.registros (
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coleccion text not null,
  id text not null,
  datos jsonb,
  borrado boolean not null default false,
  cambiado bigint not null,
  version_schema integer not null,
  dispositivo text,
  actualizado timestamptz not null default clock_timestamp(),
  primary key (usuario, coleccion, id)
);

create index registros_usuario_actualizado on public.registros (usuario, actualizado);

-- La hora la pone el servidor: es el cursor con que cada dispositivo baja lo nuevo.
create or replace function public.registros_marcar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := clock_timestamp();
  return new;
end;
$$;

create trigger registros_actualizado before insert or update on public.registros
  for each row execute function public.registros_marcar_actualizado();

alter table public.registros enable row level security;

create policy "registros propios: leer" on public.registros
  for select to authenticated using (usuario = (select auth.uid()));
create policy "registros propios: crear" on public.registros
  for insert to authenticated with check (usuario = (select auth.uid()));
create policy "registros propios: cambiar" on public.registros
  for update to authenticated
  using (usuario = (select auth.uid())) with check (usuario = (select auth.uid()));
create policy "registros propios: borrar" on public.registros
  for delete to authenticated using (usuario = (select auth.uid()));

revoke all on public.registros from anon;
grant select, insert, update, delete on public.registros to authenticated;
