# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-12

---

## Estado actual

**App estable, 1381/1381 tests verdes, lint limpio.** Último cambio: **rediseño V.7, empty states ilustrados + nav con indicador** (helper `emptyArt()`, 10 empty states migrados, indicador de sección activa en sidebar y bottom nav, fix: icons.js faltaba en el SW). Con esto cierran las 7 fases de UI del rediseño 2026; queda V.8 (decisión de producto). Antes: V.6 microinteracciones, V.5 anillos de progreso, V.4 bento dashboard.

**Workflow vigente desde 2026-06-12: deploy continuo.** Cada tarea cerrada se verifica (tests + desktop + móvil), se commitea y se pushea a producción de inmediato (Vercel auto-redeploya: https://finko-brown.vercel.app). El usuario valida cada cambio desde su celular.

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

**V.8 - Mecánicas de hábito (racha de registro, resumen semanal).** Requiere decisión de producto con el usuario antes de codear: qué mecánicas sí, cuáles no, y cómo evitar presión tipo juego en una app financiera. Plan en [`REDESIGN_2026.md`](REDESIGN_2026.md). Modelo: Opus 4.8 - Medio (cuando se decida).

Otras pendientes (no urgentes):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.
