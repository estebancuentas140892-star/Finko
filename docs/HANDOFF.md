# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-23 (feat(agenda): CAL.5a, pago en lote de los gastos fijos vencidos desde el Calendario; primera pieza del patrón P2 de la auditoría)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 2942/2942 verdes |
| Tests E2E | 225/225 verde. Suites: `smoke` 146 tests, `estrategia-pago` 21 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 8 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(agenda): CAL.5a pagar en lote lo que ya venció · 2026-07-23

Primera pieza del patrón **P2** de la auditoría (trabajo uno por uno, sin lote). Pagar 6 gastos fijos eran ~30 toques porque cada uno pedía la cuenta por separado; ahora el Calendario ofrece registrarlos juntos **resolviendo la cuenta una sola vez**. **Decisión de secuencia de Esteban (regla 2.7):** el lote manual va antes que PA.1 (pagos automáticos), que conserva su tarjeta y no fue absorbida. **Rebanada `a`:** solo gastos fijos y solo desde el Calendario; deudas y el punto de entrada desde el bloque de vencidos de Inicio quedan como **CAL.5b**. `pendientesDePagoDelMes()` (nueva, pura) aplica la MISMA regla temporal que el botón individual (BUG-015): mes en curso hasta hoy inclusive, mes pasado todo, mes futuro nada; un fijo quincenal aparece una sola vez, porque el estado de pago de un fijo es por mes y listarlo dos veces sería un doble cobro. La tarjeta solo aparece con **dos o más** pendientes (con uno, el CTA del detalle del día ya lo resuelve). **El punto financiero:** la cuenta se pide para el grupo con el `resolverPagoConSelector` de siempre y `asignarSplitsPorItem()` (nueva en `infra/distribuir-pago.js`) reparte esos splits entre los items, de modo que **cada compromiso conserva su propio gasto vinculado**: eso es lo que hace funcionar el badge "Ya pagaste este mes" y el progreso del hero. **No agrega la cuarta copia de la aritmética de pago que el BOARD temía**: `_registrarPagosFijos()` es la única dentro de Agenda, compartida con el pago individual (la extracción cross-dominio sigue siendo ARQ.2). 24 unit + 2 E2E nuevos. 2942/2942 unit + 225/225 E2E + lint verdes. SW v412→v413. Verificado en la app real con reparto entre dos cuentas ($900.000 de una que queda en 0 + $164.900 de la otra).

---

### feat(movimientos): MOV.2 búsqueda y filtros en el ledger · 2026-07-22

Cierra el patrón **P4** de la auditoría de UX/producto por completo (junto con MOV.1, cerrada el mismo día). Encontrar "ese pago de hace 4 meses" era scroll ciego, agravado porque PERF.1 pagina por lotes. `logic.js` gana `descripcionMovimiento(m, cuentas)` (extraída de `view.js`, resuelve "Origen → Destino" de una transferencia) y `filtrarMovimientos()` puro; `view.js` pinta el buscador + chips por **dominio** (no `tipo`: acá el dominio SÍ es el filtro correcto porque el usuario quiere aislar "solo Deudas" de "solo gasto cotidiano") + rango de fechas, reusando `.filtros-bar`/`.chip` de Gastos, cero componente nuevo. El filtro se aplica sobre la fuente derivada ANTES de agrupar/paginar (nunca sobre el DOM de PERF.1). **Bug real detectado al verificar en la app y corregido en la misma rebanada:** los handlers de texto/fecha no repintan la barra completa (perderían el foco a mitad de palabra), así que "Limpiar filtros" se quedaba sin aparecer con esos dos filtros; se resolvió con un slot dedicado (`actualizarBotonLimpiarFiltros()`). 41 unit + 6 E2E nuevos. 2918/2918 unit + 223/223 E2E + lint verdes. SW v411→v412. Verificado en la app real: buscar, filtrar por dominio, rango de fechas y limpiar, todo funcionando sin perder foco ni errores de consola.

---

### feat(movimientos): MOV.1 el ledger deja de ser solo lectura · 2026-07-22

Cierra el patrón **P4** de la auditoría de UX/producto y la mitad de P3 que le toca. **Amplía deliberadamente la decisión de TX.8b** (ledger solo-lectura), con aprobación explícita de Esteban tras señalárselo: registrado en BOARD y CHANGELOG, no revertido en silencio (regla 2.7). Cada fila de `#movimientos` ofrece ahora los mismos `data-action` que su dominio dueño **ya registraba** (`editar-gasto`/`eliminar-gasto`, `eliminar-ingreso-puntual`, `ahorro-eliminar-aporte`). **Ese es el punto financiero del diseño:** al delegar en vez de reimplementar, borrar un gasto desde el ledger devuelve el monto a la cuenta y revierte el abono de la deuda, porque lo ejecuta el handler de Gastos; reimplementarlo habría perdido esas reversas en silencio. **Alcance honesto:** expone capacidades existentes, no las inventa (transferencia todavía no ofrece nada: es MC.17f; editar donde el dueño no sabe es EDIT.1; al cerrarse, basta sumar su entrada en `_ACCIONES_POR_TIPO`). **Corrección al plan de la tarjeta:** el enrutador es **`m.tipo`**, no `m.dominio` como proponía el BOARD, porque `dominio` es una etiqueta visual (un gasto "Gastos fijos" la lleva en `compromisos` pero vive en `S.gastos`) y habría mandado la acción al dominio equivocado; hay test dedicado. **Cero infraestructura nueva:** no cambió `logic.js`, `index.js` ni CSS. **Ficha nueva `docs/contexto/movimientos.md`.** 8 unit + 3 E2E nuevos. 2877/2877 unit + 216/216 E2E + lint verdes. SW v410→v411.

---

### feat(personales,analisis): PE.7 "Me deben" conectado a cuentas y patrimonio · 2026-07-22

Cierra el patrón **P5** de la auditoría de UX/producto, y era el único módulo que lo sufría: "Me deben" vivía en paralelo, prestar no descontaba ninguna cuenta, cobrar no acreditaba y el capital pendiente no contaba como activo, así que el usuario registraba un gasto "espejo" a mano para cuadrar el saldo. Ahora `Personal` tiene `cuentaId` opcional (patrón 0/1/varias del selector compartido; con 0 cuentas el préstamo se registra igual como seguimiento), prestar descuenta, cobrar acredita `desglose.aplicado` (escribir de más no infla el saldo) y `calcularActivos` suma el bucket **"Por cobrar"**. **Invariante clave, verificado en la app: prestar NO mueve el patrimonio neto** (la cuenta baja $X, "Por cobrar" sube $X), porque prestar convierte efectivo en un derecho de cobro. **Decisión financiera del corte:** solo cuentan los préstamos **con `cuentaId`**; los que no movieron saldo siguen contados dentro de `cuentas` y sumarlos los duplicaría, exactamente el criterio que ya excluye al fondo de emergencia (por lo mismo, no hay backfill). El interés pendiente no entra (no se ha ganado ni cobrado). Borrar un préstamo no revierte movimientos, divergencia deliberada de D.14 explicada en la ficha, a reevaluar con PE.6b. **Dos defectos corregidos de paso:** el form se inyectaba una sola vez en el init (crear una cuenta después dejaba el selector invisible hasta recargar) y `resetModal()` borraba la cuenta preseleccionada y la fecha del préstamo. **Ficha nueva `docs/contexto/me-deben.md`** (la sección no tenía). 14 unit + 4 E2E nuevos (la sección no tenía cobertura E2E). 2869/2869 unit + 213/213 E2E + lint verdes. SW v409→v410.

---

### feat(apartados,ahorro): AP.5a + AH.5a el monto de un aporte llega prellenado · 2026-07-22

El quick win de mejor relación impacto/esfuerzo de la **auditoría de UX/producto** (patrón P1). En Apartados y en el Fondo de emergencia, la app ya calculaba y mostraba cuánto convenía aportar, pero al pulsar el botón de aportar el campo se abría vacío y pedía volver a teclear ese mismo número. `_abrirAporte()` (Apartados) y `_nuevoAporte()` (Ahorro) ahora calculan la sugerencia con los mismos motores que ya existían (`calcularAporteSugerido` de AP y `_construirSugerenciaAporte`/AH.2 del fondo) y la pasan a la vista, que prellena el `value` del campo (siempre editable, nunca readonly) con un hint explicando el prellenado. Sin fecha objetivo, apartado ya cubierto, o fondo sin gastos fijos registrados, el campo sigue vacío como antes: sin regresión. **Ficha de contexto nueva `docs/contexto/apartados.md`** (la sección no tenía ninguna, regla 2.6). 11 tests unitarios nuevos. 2856/2856 unit + lint verdes. SW v408→v409. Verificado en la app real (SOAT con $300.000 faltantes → $50.000/quincena prellenado; fondo con $800.000/mes en fijos → $184.000 prellenado).

---
---

> Para tareas anteriores (fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas dos), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, cero deuda técnica conocida).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

---

## 5. Cómo trabajamos (workflow)

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → agenda, ahorro, analisis, apartados, calculadoras, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               movimientos, personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
pnpm perf                     # harness de rendimiento (scripts/perf/), no toca pnpm test
```
