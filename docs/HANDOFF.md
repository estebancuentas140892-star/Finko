# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-12. Última tarea cerrada: MT.6d, el plan de aportes de meta se ve en Calendario (cierra MT.6 completa).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3980/3985 verdes (12 nuevos de MT.6d; 5 fallas preexistentes en `compromisos.test.js`, ajenas) |
| Tests E2E | 264/264 verdes, sello escrito sobre el runtime de MT.6d. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v38 (`metas[].planAportes`, MT.6c; default `[]`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**MT.6d - el plan de aportes de meta se ve en Calendario (Metas/Agenda), 2026-08-12**
Cierra **MT.6 (Metas v2) completa**. `eventosMetasDelMes()` (`agenda/logic.js`) filtra `Meta.planAportes` a los días del mes visible, sin recalcular ocurrencias. Tipo `'meta'` nuevo en grilla/leyenda/detalle, color `--fk-dom-metas`, excluido de `totalDia`/`totalesDelMes` (recordatorio, no obligación). El CTA "Aportar" reutiliza `data-action="abonar-meta"` sin importar Metas (ADN 10). Commit `3e75151`.

**MT.6c - plan de aportes generado y recalculado (Metas), 2026-08-12**
Tercera decisión del ADR 048 (D3). `fechasAportePlan()` (`infra/vencimientos.js`) ancla el plan en las fechas reales del ingreso con día de pago datable, o cae a fechas espaciadas uniformemente. `generarPlanAportes()` elige el ingreso ancla. El plan se regenera completo (nunca se parcha) al crear/editar la meta, al aportar, y al cambiar la frecuencia de ingresos. `Meta.planAportes`, schema v38. Commit `d0f2f6c`.

**LIM.1a - el dinero extra del mes informado sin repartir (Límites de gasto), 2026-08-12**
Primera rebanada de LIM.1, ejecuta el [ADR 045](DECISIONS/045-base-de-calculo-del-disponible-para-limites.md) D3. `extraordinarioDelMes()` (pura) suma `S.ingresosPuntuales` del mes y `_renderExtraordinario()` lo dice en la tarjeta de Estilo de vida con salida a Mis cuentas. **La cifra no entra en el plan:** presupuesto del grupo, olla finita y topes quedan idénticos con prima y sin ella, y un test lo fija como regresión. Solo se dibuja con plan del mes. `ingresosPuntuales` entra al observador de la sección. `.estilo-olla--extra` sin par de color nuevo (7,99 texto / 9,45 enlace en oscuro). SW v510 → v511.

**ANL.1b - titulares de Análisis en lenguaje corriente (Análisis), 2026-08-12**
Ejecuta el ADR 046 D2: los 5 titulares de la tabla de equivalencias pasan a lenguaje corriente y el término técnico baja a secundario, sin desaparecer. "Score de salud" → "Salud de tu dinero", "Patrimonio neto" → "Lo que realmente tienes", "Activos"/"Pasivos" → "Lo que tienes"/"Lo que debes", "Tendencia de gastos" → "Cómo cambia tu gasto", "Por categoría" → "En qué gastas". Puro texto y CSS, sin lógica nueva. SW v509 → v510.

**MT.6b - la subcategoría entra al formulario y al dato (Metas), 2026-08-12**
Segunda rebanada de MT.6. El `select` de categoría pasa a chips (ADR 042 D6: ningún form nuevo usa un select), y suma un `<fieldset>` de subcategoría por categoría con hijos en `SUBCATEGORIAS_META`. Solo el grupo elegido queda habilitado; el resto llega `hidden` **y** `disabled`, así que un `subcategoriaId` de otro padre nunca llega a `FormData`. `normalizarMeta()` valida igual con `hijosDeCategoria()`. Schema v36 → v37.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **MT.6 (Metas v2) completa**, sus 4 rebanadas cerradas. De LIM.1 quedan **LIM.1b** (lista) y **LIM.1c** (espera el ADR 044). De ANL.1 queda **ANL.1c**, sin bloqueos; **LG.2d desbloqueada** por el ADR 046 D4. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
