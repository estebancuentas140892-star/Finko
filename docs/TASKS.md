# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-08

---

## Estado actual

**App estable, 1132/1132 tests verdes, lint limpio.** Último cambio: **Fase 1 de la mejora de captura de datos** (sección M del ROADMAP): el dashboard muestra una card "Tienes N gastos por organizar" que cuenta los gastos rápidos sin describir y lleva a Gastos. Antes: fix de recarga del onboarding en móvil (SW ya no recarga en caliente) + auditoría integral P1-P4.

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

**M.2 (Fase 2)** - Cuenta de origen en el gasto rápido (sección M del ROADMAP). Selector de cuenta en el modal de gasto rápido: autoselección si hay 1 cuenta, picker compacto si hay varias, bloqueo guiado si no hay cuentas, y que el rápido descuente saldo. Toca el flujo estrella + cambia el comportamiento de saldos. Modelo: Sonnet 4.6 - Alto.

**O bien A.5** - Deploy en dominio custom. Usuario ya tiene dominio registrado. No requiere cambios de código. Seguir guía en `docs/SETUP_DOMINIO.md`. ~5-15 min.
