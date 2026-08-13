# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-12. Última tarea cerrada: ANL.1c, lectura de la card "Vs mes anterior".

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4011/4011 verdes (5 de ANL.1c ya venían contados: su código estaba en el árbol cuando LIM.1b midió). Las 5 fallas que los cierres anteriores reportaban como "ajenas, patrón de reloj fijo" eran una fuga de `process.env.TZ` en `compromisos.test.js` y se arreglaron en LIM.1b |
| Tests E2E | 264/264 verdes, sello escrito sobre el runtime de ANL.1c. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v38 (`metas[].planAportes`, MT.6c; default `[]`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**ANL.1c - lectura de la card "Vs mes anterior" (Análisis), 2026-08-12**
Cierra **ANL.1 (Análisis interpreta) completa**, [ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md) D3. `lecturaComparacion()` responde lo que deltas y highlights no decían: si el mes en conjunto subió o bajó, con el mismo margen de ruido del 10 % de `lecturaTendencia()`. Reusa `totalActual`/`totalAnterior` que la comparación ya devolvía: sin barridos nuevos y dentro del memo diferido de PERF.3. Patrón semanal y hormigas se revisaron contra D3 y no se tocaron. SW v518 → v519.

**LIM.1b - los fijos no esenciales cuentan contra Estilo de vida (Límites / Mis cuentas), 2026-08-12**
Ejecuta el punto 8 de LIM.1 con el catálogo del [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md): Streaming y Suscripciones dejan de pesar como el arriendo. `CATEGORIAS_AGENDA_NO_ESENCIALES` es la fuente única; el ejecutado se reclasifica por `compromisoId` (el gasto se guarda como `'Gastos fijos'`, no con la categoría del compromiso) y el asignado resta `calcularFijosNoEsencialesMensuales()` del piso de Necesidades. **Estilo de vida es el residuo, así que absorbe la diferencia sin aritmética nueva.** `calcularGastosFijosMensuales` no cambia a propósito: de ella sale el objetivo del fondo de emergencia. SW v517 → v518.

**PE.6d - los cinco estados de Me deben se distinguen de un vistazo (Me deben), 2026-08-12**
Cierra **PE.6 (Me deben v2) completa**, D6 del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md). `chip-info` (ya existía en `atoms.css`) distingue "pago parcial" de "al día", que antes compartían el mismo `chip` neutro. `labelEstado()` acorta el copy ("Vence en N días"/"Vence hoy", simétrico con "Venció"; "Abono hoy"/"Abono..."). Solo `view.js` y `logic.js`, sin schema. Commit pendiente de hash en este cierre.

**MT.6d - el plan de aportes de meta se ve en Calendario (Metas/Agenda), 2026-08-12**
Cierra **MT.6 (Metas v2) completa**. `eventosMetasDelMes()` (`agenda/logic.js`) filtra `Meta.planAportes` a los días del mes visible, sin recalcular ocurrencias. Tipo `'meta'` nuevo en grilla/leyenda/detalle, color `--fk-dom-metas`, excluido de `totalDia`/`totalesDelMes` (recordatorio, no obligación). El CTA "Aportar" reutiliza `data-action="abonar-meta"` sin importar Metas (ADN 10). Commit `3e75151`.

**MT.6c - plan de aportes generado y recalculado (Metas), 2026-08-12**
Tercera decisión del ADR 048 (D3). `fechasAportePlan()` (`infra/vencimientos.js`) ancla el plan en las fechas reales del ingreso con día de pago datable, o cae a fechas espaciadas uniformemente. `generarPlanAportes()` elige el ingreso ancla. El plan se regenera completo (nunca se parcha) al crear/editar la meta, al aportar, y al cambiar la frecuencia de ingresos. `Meta.planAportes`, schema v38. Commit `d0f2f6c`.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **MT.6 (Metas v2) completa**, sus 4 rebanadas cerradas. **PE.6 (Me deben v2) completa**, sus 5 rebanadas cerradas. **ANL.1 (Análisis interpreta) completa**, sus 3 rebanadas cerradas. De LIM.1 queda **LIM.1c** (espera el ADR 044). **LG.2d desbloqueada** por el ADR 046 D4 y ya sin ninguna rebanada de ANL.1 por delante. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
