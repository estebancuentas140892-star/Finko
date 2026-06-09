# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-09

---

## Estado actual

**App estable, 1147/1147 tests verdes, lint limpio.** Último cambio: **M.2** (gasto rápido con cuenta de origen: autoselección/selector/empty state guiado, descuenta saldo). Antes: M.1b (Editar/Eliminar/"Marcar pagado este mes" en gastos fijos + helper `cuenta-helper.js`).

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

**M.3 (Fase 3)** - Revisión transversal de flujos de captura. Mapear gasto, gasto rápido, ingreso, cuenta, deuda y meta; verificar que cada dato se pida en el momento correcto y documentar/cerrar los huecos. Modelo: Sonnet 4.6 - Alto.

**O bien A.5** - Deploy en dominio custom. Usuario ya tiene dominio registrado. No requiere cambios de código. Seguir guía en `docs/SETUP_DOMINIO.md`. ~5-15 min.
