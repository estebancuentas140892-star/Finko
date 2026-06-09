# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-09

---

## Estado actual

**App estable, 1142/1142 tests verdes, lint limpio.** Último cambio: **M.1b** (Editar/Eliminar/"Marcar pagado este mes" en gastos fijos + helper `cuenta-helper.js` de selección inteligente de cuenta; 0/1/varias cuentas). Antes: M.1 (card "gastos por organizar") + fix de navegación "Ir a Mis cuentas" + fix SW onboarding.

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

**M.2 (Fase 2)** - Cuenta de origen en el gasto rápido. Integrar `resolverCuenta` (ya construido en `cuenta-helper.js`) al modal de gasto rápido para que descuente saldo. Autoselección si hay 1 cuenta, picker si hay varias, bloqueo guiado si hay 0. Modelo: Sonnet 4.6 - Medio (el helper ya existe).

**O bien A.5** - Deploy en dominio custom. Usuario ya tiene dominio registrado. No requiere cambios de código. Seguir guía en `docs/SETUP_DOMINIO.md`. ~5-15 min.
