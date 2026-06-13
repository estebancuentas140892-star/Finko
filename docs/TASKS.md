# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-12

---

## Estado actual

**App estable, 1381/1381 tests verdes, lint limpio.** Último cambio: **V.8 decisión de producto** (ADR 008): solo resumen semanal con "días activos del mes" como dato amable; sin racha con castigo. Antes: V.7 empty states ilustrados + nav, V.6 microinteracciones, V.5 anillos de progreso. Las 7 fases de UI del rediseño 2026 están cerradas; falta implementar la card de resumen de V.8.

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

**V.8 (implementación) - Card de resumen semanal en el dashboard.** Decisión ya tomada en [ADR 008](DECISIONS/008-mecanicas-de-habito.md). Construir: `logic.js` de agregación de solo lectura (gasto de 7 días + comparación con la semana previa, categoría top, "días activos del mes" derivado de `gasto.fecha`) con tests, y una card en el dashboard que aparece solo con datos (patrón `[hidden]` del bento de V.4). Sin schema nuevo, sin racha, sin castigo. Modelo: Sonnet 4.6 - Medio.

Otras pendientes (no urgentes):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.
