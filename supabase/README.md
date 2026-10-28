# Supabase: lo que vive en la nube de Finko

> Revisado: 2026-10-28. Decisión: [ADR 096](../docs/DECISIONS/096-finko-en-la-nube-con-supabase.md). Reglas: [SECURITY.md](../docs/SECURITY.md) sección 8. Ficha: [`docs/contexto/nube.md`](../docs/contexto/nube.md).

El proyecto es `finko-prueba` (São Paulo). Estos archivos son la fuente de verdad de su base: se pegan en el editor SQL del proyecto, en orden, y no se edita la base a mano sin dejar el cambio acá.

| Archivo | Qué crea | Aplicado |
|---|---|---|
| [`001-registros.sql`](001-registros.sql) | tabla `registros` (NUBE.2): una fila por registro, hora del servidor, RLS por usuario | 2026-10-27 |
| [`002-familia.sql`](002-familia.sql) | códigos y vínculos del teléfono del niño, y sus funciones (NUBE.3) | 2026-10-27 |
| [`003-borrar-cuenta.sql`](003-borrar-cuenta.sql) | función `borrar_mi_cuenta()`: el usuario y, en cascada, todo lo suyo (NUBE.2b) | 2026-10-28 |
| [`pruebas-seguridad.sql`](pruebas-seguridad.sql) | pruebas de las reglas de acceso; corre en una transacción que se deshace | cada cambio de reglas |
| [`pruebas-borrar-cuenta.sql`](pruebas-borrar-cuenta.sql) | prueba de `borrar_mi_cuenta()`; transacción que se deshace | cada cambio de la función |

**Las pruebas son la compuerta**: cualquier cambio a una tabla, una política o una función de la nube se aplica y enseguida se corre `pruebas-seguridad.sql`, que debe terminar en "Success". Si una regla falla, el editor muestra el `ASSERT` que no se cumplió.
