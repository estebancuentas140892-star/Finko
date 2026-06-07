# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-07

---

## Estado actual

**Sin fase activa.** Fase H cerrada en v8.9. Deuda técnica `updateBadge`/`renderResumenGastos` cerrada en 2026-06-01. App estable en producción.

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

Sección K cerrada completa (K.1 4x1000, K.2 perfil fiscal, K.3 monitor de renta, K.4 datos de renta manuales). Sin fase activa. Próximas opciones:

- **A.5** - Agregar dominio custom (cuando el usuario tenga dominio registrado).
- **E.2-2027** - Actualizar SMMLV y UVT a valores 2027 (diciembre 2026 / enero 2027).

**Modelo sugerido:** Haiku 4.5 para E.2. Sonnet 4.6 - Bajo para A.5.
