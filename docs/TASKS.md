# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-05-17

---

## Estado actual

**Versión vigente:** `v1.0.0` - proyecto completo, sin tareas activas.

No hay ninguna tarea en curso. El próximo trabajo se elige del [ROADMAP.md](ROADMAP.md) → sección "Post-v1.0".

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

_(vacío)_

---

## Próxima tarea sugerida

Ver [`ROADMAP.md`](ROADMAP.md) - la sección **A. Deploy a producción** es el siguiente paso natural.
