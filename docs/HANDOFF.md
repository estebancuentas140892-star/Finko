# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-02. Última tarea cerrada: EDIT.1 (rebanada Inversión), editar sin destruir una inversión.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3621/3621 verdes |
| Tests E2E | 252/253 + 1 flaky (retry verde), corrida del 2026-08-02, sello del commit `886c5b7`. **Es compuerta** desde el 2026-07-30: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. La huella se calcula sobre el **índice** (`git ls-files -s`), no sobre el árbol: hay que `git add` **antes** de sellar, o el propio `add` invalida el sello. **Ojo con sesiones paralelas sobre el mismo worktree**: el índice compartido puede invalidar el sello entre que se corre la suite y se commitea; `git add -p` para separar hunks propios de ajenos cuando el mismo archivo cambia por dos sesiones a la vez. **Ojo también con el navegador de verificación**: el HTTP cache del `python -m http.server` puede servir una copia vieja de un módulo justo editado por otra sesión (visto el 2026-08-02, `infra/bolsas.js`); `fetch(url, {cache:'reload'})` seguido de una navegación real lo repara, no es bug de código |
| Schema version (`localStorage`) | v32 (`config.ultimaVersionVista`, UPD.1; migración backfill al catálogo vigente) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-018 es el único con impacto en el uso diario |

---

## 2. Últimas 5 tareas cerradas

**EDIT.1 (rebanada Inversión) - editar sin destruir una inversión, 2026-08-02**
Botón "Editar" por holding; `normalizarInversion(datos, inversionExistente)` preserva `cuentaId` (el origen no se vuelve a preguntar, ADR 053). Con cuenta de origen, editar el monto ajusta el saldo por delta (ADR 053 I3): confirma solo si el aumento deja la cuenta en negativo. Me deben es la última rebanada pendiente de EDIT.1.

**ARQ.2 - consolidar los cálculos duplicados que quedan (puntos 1 y 2), 2026-08-02**
`FACTOR_MENSUAL` con fuente única en `infra/financiero.js` (`tesoreria/logic/ingresos.js` reexporta en vez de duplicar). `infra/pago-compromiso.js` nuevo (`gastoDePagoCompromiso()` + `bajarSaldoDeuda()`) sustituye las 4 copias reales de "registrar pago de compromiso" (el hallazgo original solo nombraba 3). Punto 3 (totales de Agenda vs. motor de vencimientos) analizado y dejado sin tocar por decisión de Esteban: ya divergieron en comportamiento, consolidarlos sería cambiar lo que muestra el hero de Agenda, no un refactor mecánico.

**UPD.1 - aviso de versión nueva + resumen de novedades, 2026-08-02**
Aviso discreto con botón "Actualizar ahora" cuando el SW aplica una versión nueva pero `sw-register.js` no pudo recargar solo (modal abierto o input con foco); el caso seguro sigue recargando en silencio, sin cambios. Resumen de novedades una sola vez tras actualizar: catálogo `NOVEDADES_POR_VERSION` (vacío por ahora) comparado contra `config.ultimaVersionVista` (schema v32). Ambos mecanismos son independientes entre sí.

**EDIT.1 (rebanada Apartados) - editar sin destruir una reserva, 2026-08-02**
Botón "Editar" en la tarjeta; `normalizarApartado(datos, apartadoExistente)` preserva `montoActual`/`recurrente`/`periodoMeses` y recalcula `completado` contra el objetivo nuevo. Mismo patrón que EDIT.1a validó en Metas. Inversión y Me deben siguen pendientes de la misma tarjeta.

**PERF.7c - warm-up de derivaciones pesadas en idle, 2026-08-01**
Cierra **PERF.7** completo. `bootstrap.js`, tras `renderAll()`, agenda un `requestIdleCallback` (fallback `setTimeout`) que precalienta el bundle memoizado de Análisis y el historial completo de Movimientos (`precalentarAnalisis()`, `precalentarMovimientos()`), sin tocar el DOM. Reusa los memos ya existentes de PERF.2, sin infra nueva. Detalle: [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
