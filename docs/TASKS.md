# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-09

---

## Estado actual

**App estable, 1183/1183 tests verdes, lint limpio.** Último cambio: **skip link WCAG 2.4.1** (`index.html` + test). Antes: formulario de cuentas dinámico (schema v11). ADR 005 cerrado (no desglozar IVA/propina).

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

Verificar el formulario de cuentas en la app (`python -m http.server 8080`): crear un banco (tipos: Corriente/Ahorros), crear una billetera (Nequi: tipo oculto), crear Efectivo (4x1000 y cuota ocultos), editar cada una. Si todo funciona, commitear docs y decidir qué sigue:

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**O bien E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.
