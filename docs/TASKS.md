# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-09

---

## Estado actual

**App estable, 1164/1164 tests verdes, lint limpio.** Último cambio: **M.3** (revisión transversal de captura: UI de ingresos recurrentes + cuenta de origen en abono a metas con descuento de saldo). Antes: M.2 (gasto rápido con cuenta de origen). Con M.3 la sección M queda cerrada.

---

## Cómo se trabaja una tarea

1. Elegir **una** tarea del ROADMAP (sección Post-v1.0) o del backlog del usuario.
2. Moverla a "En curso" abajo con la fecha de inicio.
3. Hacer el trabajo en una sola sesión cuando sea posible.
4. Al terminar:
   - Verificar en la app (servir + probar manualmente).
   - Correr `npm test` (debe quedar verde).
   - Commit con prefijo (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
   - **Eliminar** la entrada de este archivo.
   - **Agregar** entrada en [`CHANGELOG.md`](CHANGELOG.md) con fecha y archivos tocados.

Ver [`/CLAUDE.md`](../CLAUDE.md) → sección 2 para el workflow completo (cierre con modelo+esfuerzo, supervisión visual, etc.).

---

## En curso

_(sin tarea activa)_

---

## Próxima tarea sugerida

**A.5** - Deploy en dominio custom. Usuario ya tiene dominio registrado. No requiere cambios de código. Seguir guía en `docs/SETUP_DOMINIO.md`. ~5-15 min.

**O bien E.2-2027** - Actualizar SMMLV, auxilio de transporte y UVT a valores 2027 cuando se publiquen (dic 2026 / enero 2027). Cambio mecánico de una entrada en `LEGAL_POR_ANIO`. Modelo: Haiku 4.5.
