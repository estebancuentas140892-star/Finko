# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-05-29

---

## Estado actual

**Fase H (Rediseño de Tesorería) cerrada en v8.9.** No hay tarea de código activa. App estable en producción.

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

**Cerrar deuda técnica de `updateBadge` y `renderResumenGastos`** (refactor cross-domain acotado). Ambas funciones son no-ops sobre IDs que no existen tras el rediseño previo del dashboard. Quedan cableadas desde 4 dominios (`compromisos`, `agenda`, `import`, `gastos`). Eliminarlas: quitar el export en `render.js` / `gastos/view.js`, quitar los imports y las 7+ llamadas, ajustar docstrings de `updSaldo` y comentarios stale. Sin riesgo funcional (ya no hacen nada).

**Modelo sugerido:** Sonnet 4.6 - Medio. **Esfuerzo:** Bajo a Medio.
