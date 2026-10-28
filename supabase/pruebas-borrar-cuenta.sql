-- Prueba de NUBE.2b: borrar_mi_cuenta() borra solo a quien la llama, con
-- todo lo suyo, y nadie sin sesión la puede llamar. Se pega en el editor SQL
-- de Supabase y se corre completa: todo pasa dentro de una transacción que
-- termina en ROLLBACK, con dos personas inventadas, así que no deja nada. Si
-- algo falla, el editor muestra el ASSERT que no se cumplió. Al final debe
-- decir "Success".

begin;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'sofi@finko.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'otra@finko.test');

insert into public.registros (usuario, coleccion, id, datos, cambiado, version_schema) values
  ('00000000-0000-4000-8000-0000000000a1', 'cuentas', 'c-1',    '{"id":"c-1","nombre":"Banco"}', 1, 48),
  ('00000000-0000-4000-8000-0000000000a1', '_raiz',   'perfil', '{"nombre":"Sofía"}',            1, 48),
  ('00000000-0000-4000-8000-0000000000b2', 'cuentas', 'c-9',    '{"id":"c-9"}',                  1, 48);

do $$
begin
  assert not has_function_privilege('anon', 'public.borrar_mi_cuenta()', 'execute'), 'sin sesión no se puede llamar';
  assert has_function_privilege('authenticated', 'public.borrar_mi_cuenta()', 'execute'), 'con sesión sí';
end $$;

-- ── Sin sesión ────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform public.borrar_mi_cuenta();
    raise exception 'debía fallar';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ── Un token sin usuario no borra nada ────────────────────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);

do $$
begin
  begin
    perform public.borrar_mi_cuenta();
    raise exception 'debía fallar';
  exception when insufficient_privilege then
    assert sqlerrm = 'sin-sesion', 'sin usuario en el token: ' || sqlerrm;
  end;
end $$;

-- ── Sofía borra su cuenta ─────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select public.borrar_mi_cuenta();

-- Otra vez, con el mismo token: ya no hay nada que borrar y no falla.
select public.borrar_mi_cuenta();

reset role;

do $$
begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000a1'), 'Sofía ya no está';
  assert not exists (select 1 from public.registros where usuario = '00000000-0000-4000-8000-0000000000a1'), 'sus registros se fueron con ella';
  assert exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000b2'), 'la otra persona sigue';
  assert (select count(*) from public.registros where usuario = '00000000-0000-4000-8000-0000000000b2') = 1, 'y sus registros también';
end $$;

rollback;
