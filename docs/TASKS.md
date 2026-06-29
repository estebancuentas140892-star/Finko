# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-28

---

## Estado actual

**App estable, 1402/1402 tests verdes, lint limpio.** Último cambio: **renombre "Presupuesto" → "Límites de gasto"** y diferenciación de Apartados (cross-links + subtítulo; sin fusionar, sin migración). Antes: fix de íconos en Agenda, V.8 card de resumen semanal (ADR 008). **Rediseño visual 2026 completo: las 8 fases cerradas.**

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

**ADR 011 en curso: rediseño de simulación de deudas.** S1, S2 y S3 cerrados (extra mensual siempre visible + resumen de impacto en vivo; eliminado el botón "Simular" por deuda; barrido de dead code del acordeón). Pendientes:
- **S4** - "Renegociar tasa" interactivo (`simularRenegociacion` + tests).
- **S5** - "Consolidar deudas" interactivo (`simularConsolidacion` + tests).

### Backlog del usuario "Mis cuentas + distribución" (2026-06-28)

Observaciones nuevas del usuario, de menor a mayor alcance. Arrancar por la más pequeña.

✅ **MC.1** - Simplificados los textos de ayuda del form de nueva cuenta (eliminada la descripción del 4x1000 y el "Opcional..." de la cuota de manejo) - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

- **MC.2 (UI, mediano)** - Distribución del dinero: suavizar con animación el cambio entre presets (50/30/20 ↔ 70/20/10) y permitir que el usuario cree su propia distribución de porcentajes (ej. 80/10/10). **Siguiente sugerido.**
- **MC.3 (copy + lógica menor)** - Reformular el nudge de deudas en la distribución: en vez de "considera destinar parte del ahorro al pago de deudas", invitar a recortar primero Estilo de vida antes que el ahorro (mensaje educativo).
- **MC.4 (épica, requiere ADR)** - Auto-distribución de ingresos: al recibir quincena/salario, botón "Distribuir mi ingreso" que reparte los porcentajes a cuentas/ahorro/apartados/metas/inversiones/deudas para confirmar de una, sin recorrer la app a mano.
- **MC.5 (épica mayor, requiere ADR + posible schema)** - Límites de gastos como centro de control de los 3 grupos (Necesidades / Estilo de vida / Ahorro): clasificar cada categoría en un grupo, fijar límites por categoría, y mostrar % consumido + disponible + alertas al acercarse/superar. Toca Gastos, Deudas, Agenda, Apartados y Mis cuentas; depende de definir bien las categorías transversales.

Pendientes previos del backlog (2026-06-28), independientes de lo anterior:
- Categorías predefinidas para Agenda (13 categorías de gastos fijos).
- Categorías predefinidas para Deudas (12 tipos de obligación).

Pendientes no urgentes (mantenimiento):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.

**Mejora candidata (resumen V.8):** retroalimentación del usuario en el celular puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas (mencionado como opcional en ADR 008). Esperar feedback antes de iterar.
