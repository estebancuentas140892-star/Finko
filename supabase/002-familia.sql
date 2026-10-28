-- NUBE.3 (ADR 096 D5): el teléfono del niño se vincula con un código que
-- genera su padre. El niño no tiene correo ni contraseña: su teléfono
-- guarda un token que solo abre lo suyo, a través de las funciones de abajo.
-- Requiere 001-registros.sql.

create table public.codigos_nino (
  codigo text primary key,
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nino_id text not null,
  autorizacion jsonb not null,
  vence timestamptz not null default now() + interval '10 minutes'
);

create table public.vinculos_nino (
  token_hash text primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  nino_id text not null,
  autorizacion jsonb not null,
  dispositivo text,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz
);

alter table public.codigos_nino enable row level security;
alter table public.vinculos_nino enable row level security;

-- El padre ve y revoca lo suyo. Crear y canjear códigos va por funciones.
create policy "codigos propios: leer" on public.codigos_nino
  for select to authenticated using (usuario = (select auth.uid()));
create policy "codigos propios: borrar" on public.codigos_nino
  for delete to authenticated using (usuario = (select auth.uid()));
create policy "vinculos propios: leer" on public.vinculos_nino
  for select to authenticated using (usuario = (select auth.uid()));
create policy "vinculos propios: borrar" on public.vinculos_nino
  for delete to authenticated using (usuario = (select auth.uid()));

revoke all on public.codigos_nino, public.vinculos_nino from anon, authenticated;
grant select, delete on public.codigos_nino, public.vinculos_nino to authenticated;

-- ¿El registro es del niño? Su perfil base ("perfiles") lo fija el padre y
-- el niño solo lo lee; lo suyo es su progreso, sus movimientos y sus metas.
create or replace function public._es_del_nino(p_coleccion text, p_id text, p_nino text)
returns boolean language sql immutable set search_path = '' as $$
  select (p_coleccion = 'nino-aprende' and p_id = p_nino)
      or (p_coleccion in ('nino-mov', 'nino-metas') and left(p_id, length(p_nino) + 1) = p_nino || '~');
$$;

create or replace function public._vinculo(p_token text)
returns public.vinculos_nino language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_nino;
begin
  select * into v from public.vinculos_nino
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if not found then
    raise exception 'vinculo-invalido' using errcode = 'P0001';
  end if;
  update public.vinculos_nino set ultimo_uso = now() where token_hash = v.token_hash;
  return v;
end;
$$;

-- El padre pide un código de 8 letras para un niño que ya está en su nube.
-- Un solo código vivo por niño; vence en 10 minutos.
create or replace function public.crear_codigo_nino(p_nino_id text, p_autorizacion jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  semilla text := replace(gen_random_uuid()::text, '-', '');
  v_codigo text := '';
  i int;
begin
  if auth.uid() is null then
    raise exception 'sin-sesion' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.registros
                  where usuario = auth.uid() and coleccion = 'perfiles' and id = p_nino_id and not borrado) then
    raise exception 'nino-sin-sincronizar' using errcode = 'P0001';
  end if;
  for i in 0..7 loop
    v_codigo := v_codigo || substr(alfabeto,
      (('x' || substr(semilla, i * 4 + 1, 4))::bit(16)::int % length(alfabeto)) + 1, 1);
  end loop;
  delete from public.codigos_nino where usuario = auth.uid() and (nino_id = p_nino_id or vence < now());
  insert into public.codigos_nino (codigo, usuario, nino_id, autorizacion)
  values (v_codigo, auth.uid(), p_nino_id, coalesce(p_autorizacion, '{}'::jsonb));
  return v_codigo;
end;
$$;

-- El teléfono del niño canjea el código (una sola vez) por su token.
create or replace function public.canjear_codigo_nino(p_codigo text, p_dispositivo text default null)
returns table (token text, nino text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  c public.codigos_nino;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  delete from public.codigos_nino
   where codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')) and vence > now()
   returning * into c;
  if c.codigo is null then
    raise exception 'codigo-invalido' using errcode = 'P0001';
  end if;
  insert into public.vinculos_nino (token_hash, usuario, nino_id, autorizacion, dispositivo)
  values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), c.usuario, c.nino_id, c.autorizacion, left(p_dispositivo, 60));
  return query select v_token, c.nino_id;
end;
$$;

-- Lo que el teléfono del niño baja: su perfil base y lo suyo, nada más.
create or replace function public.nino_bajar(p_token text, p_desde timestamptz default null, p_offset integer default 0)
returns setof public.registros language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_nino := public._vinculo(p_token);
begin
  return query
    select * from public.registros r
     where r.usuario = v.usuario
       and ((r.coleccion = 'perfiles' and r.id = v.nino_id) or public._es_del_nino(r.coleccion, r.id, v.nino_id))
       and (p_desde is null or r.actualizado > p_desde)
     order by r.actualizado
     limit 500 offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Lo que el teléfono del niño sube: solo lo suyo. Cualquier otra fila
-- rechaza el lote entero.
create or replace function public.nino_subir(p_token text, p_filas jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v public.vinculos_nino := public._vinculo(p_token);
  f jsonb;
  n int := 0;
begin
  for f in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) loop
    if not public._es_del_nino(f->>'coleccion', f->>'id', v.nino_id) then
      raise exception 'fuera-del-nino' using errcode = 'P0001';
    end if;
    insert into public.registros (usuario, coleccion, id, datos, borrado, cambiado, version_schema, dispositivo)
    values (v.usuario, f->>'coleccion', f->>'id', f->'datos', coalesce((f->>'borrado')::boolean, false),
            (f->>'cambiado')::bigint, (f->>'version_schema')::integer, left(f->>'dispositivo', 60))
    on conflict (usuario, coleccion, id) do update
      set datos = excluded.datos, borrado = excluded.borrado, cambiado = excluded.cambiado,
          version_schema = excluded.version_schema, dispositivo = excluded.dispositivo;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public._es_del_nino(text, text, text), public._vinculo(text),
  public.crear_codigo_nino(text, jsonb), public.canjear_codigo_nino(text, text),
  public.nino_bajar(text, timestamptz, integer), public.nino_subir(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.crear_codigo_nino(text, jsonb) to authenticated;
grant execute on function public.canjear_codigo_nino(text, text), public.nino_bajar(text, timestamptz, integer),
  public.nino_subir(text, jsonb) to anon, authenticated;
