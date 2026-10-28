-- Pruebas de las reglas de acceso de la nube (SECURITY.md sección 8, regla 1).
-- Se pegan en el editor SQL de Supabase y se corren completas: todo pasa
-- dentro de una transacción que termina en ROLLBACK, con dos familias
-- inventadas, así que no deja nada. Si una regla falla, el editor muestra el
-- ASSERT que no se cumplió. Al final debe decir "Success".

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'padre@finko.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'otra-familia@finko.test');

insert into public.registros (usuario, coleccion, id, datos, cambiado, version_schema) values
  ('00000000-0000-4000-8000-0000000000a1', 'perfiles',     'n-sofi',     '{"id":"n-sofi","nombre":"Sofía"}', 1, 48),
  ('00000000-0000-4000-8000-0000000000a1', 'nino-aprende', 'n-sofi',     '{"hechas":{}}',                   1, 48),
  ('00000000-0000-4000-8000-0000000000a1', 'nino-mov',     'n-sofi~m1',  '{"id":"m1","monto":5000}',        1, 48),
  ('00000000-0000-4000-8000-0000000000a1', 'cuentas',      'c-1',        '{"id":"c-1","nombre":"Banco"}',   1, 48),
  ('00000000-0000-4000-8000-0000000000a1', 'perfiles',     'n-tomi',     '{"id":"n-tomi","nombre":"Tomi"}', 1, 48),
  ('00000000-0000-4000-8000-0000000000a1', 'nino-mov',     'n-tomi~m9',  '{"id":"m9"}',                     1, 48),
  ('00000000-0000-4000-8000-0000000000b2', 'cuentas',      'c-9',        '{"id":"c-9"}',                    1, 48);

-- ── El padre ──────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.registros) = 6, 'el padre ve solo sus 6 registros';
  begin
    perform public.crear_codigo_nino('n-nadie', '{}');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'nino-sin-sincronizar', 'un niño que no está en su nube no recibe código: ' || sqlerrm;
  end;
  perform set_config('prueba.codigo', public.crear_codigo_nino('n-sofi', '{"version":"0.2"}'), true);
  assert current_setting('prueba.codigo') ~ '^[A-HJ-KM-NP-Z2-9]{8}$', 'código de 8 letras sin ambiguas: ' || current_setting('prueba.codigo');
  assert (select count(*) from public.codigos_nino) = 1, 'el padre ve su código';
end $$;

-- ── El teléfono del niño, sin sesión ──────────────────────────────
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare
  t text;
begin
  begin
    perform count(*) from public.registros;
    raise exception 'debía fallar';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.vinculos_nino;
    raise exception 'debía fallar';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.canjear_codigo_nino('ZZZZZZZZ');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'codigo-invalido', 'un código inventado no entra: ' || sqlerrm;
  end;
  -- El código se escribe como sea: con guion, espacio o minúsculas.
  select c.token into t from public.canjear_codigo_nino(
    lower(substr(current_setting('prueba.codigo'), 1, 4)) || '-' || substr(current_setting('prueba.codigo'), 5), 'Prueba') c;
  assert length(t) = 64, 'el canje entrega un token largo';
  perform set_config('prueba.token', t, true);
  begin
    perform public.canjear_codigo_nino(current_setting('prueba.codigo'));
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'codigo-invalido', 'el código sirve una sola vez: ' || sqlerrm;
  end;

  assert (select count(*) from public.nino_bajar(t)) = 3, 'el niño baja su perfil, su progreso y su movimiento';
  assert not exists (select 1 from public.nino_bajar(t) r where r.coleccion = 'cuentas' or r.id like 'n-tomi%'),
    'el niño no ve las cuentas del padre ni a su hermano';

  assert public.nino_subir(t, '[{"coleccion":"nino-mov","id":"n-sofi~m2","datos":{"id":"m2"},"cambiado":2,"version_schema":48}]') = 1,
    'el niño sube su movimiento';
  assert (select count(*) from public.nino_bajar(t)) = 4, 'y lo vuelve a bajar';
  begin
    perform public.nino_subir(t, '[{"coleccion":"cuentas","id":"c-1","datos":{},"cambiado":3,"version_schema":48}]');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'fuera-del-nino', 'el niño no escribe las cuentas del padre: ' || sqlerrm;
  end;
  begin
    perform public.nino_subir(t, '[{"coleccion":"perfiles","id":"n-sofi","datos":{"mesada":null},"cambiado":3,"version_schema":48}]');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'fuera-del-nino', 'el niño no cambia lo que fija el padre: ' || sqlerrm;
  end;
  begin
    perform public.nino_subir(t, '[{"coleccion":"nino-mov","id":"n-tomi~x","datos":{},"cambiado":3,"version_schema":48}]');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'fuera-del-nino', 'el niño no escribe en su hermano: ' || sqlerrm;
  end;
  begin
    perform public.nino_bajar('token-inventado');
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'vinculo-invalido', 'un token inventado no abre nada: ' || sqlerrm;
  end;
  begin
    perform public.crear_codigo_nino('n-sofi', '{}');
    raise exception 'debía fallar';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ── La otra familia ───────────────────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.registros) = 1, 'otra familia ve solo lo suyo';
  assert (select count(*) from public.vinculos_nino) = 0, 'otra familia no ve los teléfonos vinculados ajenos';
  delete from public.vinculos_nino;
end $$;

-- ── El padre revoca el teléfono ───────────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
begin
  assert (select count(*) from public.vinculos_nino) = 1, 'el padre ve el teléfono vinculado (la otra familia no pudo borrarlo)';
  assert (select count(*) from public.registros where coleccion = 'nino-mov' and id = 'n-sofi~m2') = 1, 'y lo que subió el niño';
  delete from public.vinculos_nino where nino_id = 'n-sofi';
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform public.nino_bajar(current_setting('prueba.token'));
    raise exception 'debía fallar';
  exception when others then
    assert sqlerrm = 'vinculo-invalido', 'un teléfono desvinculado ya no baja nada: ' || sqlerrm;
  end;
end $$;

rollback;
