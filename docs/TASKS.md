# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-08

---

## Estado actual

**Auditoría integral completada** (P1 a P4) + **fix de recarga del onboarding en móvil**. App 100% lint verde, 1123/1123 tests verdes. Último cambio: el service worker ya no recarga la página en caliente (eliminado `skipWaiting` + reload-on-controllerchange); las actualizaciones se aplican en la próxima apertura, sin interrumpir formularios ni el onboarding.

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

**A.5** - Deploy en dominio custom. Usuario ya tiene dominio registrado. No requiere cambios de código (la app usa rutas relativas en todos lados). Seguir guía en `docs/SETUP_DOMINIO.md`: comprar dominio vía Vercel, o apuntar nameservers de dominio externo a Vercel, o configurar DNS CNAME manualmente. ~5-15 min según la opción.

**O bien E.2** - SMMLV + UVT 2027 (enero 2027). Búsqueda de valores oficiales (Mintrabajo y DIAN) e inserción en `LEGAL_POR_ANIO` en `constants.js`. Trabajo mecánico, ~15 min. Modelo: Haiku 4.5.
