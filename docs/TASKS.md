# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-11

---

## Estado actual

**App estable, 1373/1373 tests verdes, lint limpio.** Último cambio: **rediseño V.4, dashboard bento** (grid 12 cols, hero 8 cols + accesos rápidos 4 cols, paneles dinámicos con hidden, count-up del saldo). Antes: V.3 componentes núcleo v2, V.2 iconos SVG, V.1 tokens v2.

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

**V.5 - Rediseño visual, Fase 5: secciones de progreso.** Metas, Apartados y Ahorro con anillo/barra protagonista, hitos y jerarquía nueva. Score de salud de Análisis con gauge mejorado. Usar `progressRing()` (listo en `infra/svg.js`). Plan en [`REDESIGN_2026.md`](REDESIGN_2026.md). Modelo: Sonnet 4.6 - Medio.

Otras pendientes (no urgentes):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.
