# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-24 (correcciones de veracidad de la Fase 2 de la reorganización documental, ver [`MIGRACION.md`](MIGRACION.md)). Última tarea cerrada: EDIT.1a, editar una meta sin destruir el progreso.

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 2981/2981 verdes |
| Tests E2E | 231/231 verdes en 11 suites (verificado el 2026-07-24 corriendo `pnpm run test:e2e`). El desglose por suite no se transcribe acá: lo reporta la propia corrida, y el que estaba escrito sumaba 227. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(metas): EDIT.1a editar sin destruir el progreso · 2026-07-23

Primera de cuatro rebanadas del patrón **P3** de la auditoría (no se puede editar, corregir obliga a destruir). Metas solo permitía crear, abonar y eliminar; corregir un nombre o un objetivo mal escrito obligaba a eliminar y recrear la meta, perdiendo el progreso acumulado. Apartados, Inversión y Me deben quedan como las tres rebanadas siguientes en **EDIT.1**. Botón "Editar" junto a Abonar/Eliminar, mismo formulario prellenado. **El punto financiero:** `normalizarMeta(datos, metaExistente = null)` conserva `montoActual` tal cual al editar (no se resetea ni se toca el histórico de aportes) y recalcula `completada` contra el nuevo objetivo, porque cambiarlo puede cruzar el umbral de cumplimiento en cualquier dirección. De paso, el formulario dejó de ser un singleton reusado (necesitaba resetear el picker de ícono a mano) y pasó a reinyectarse completo en cada apertura, mismo patrón que Gastos/Agenda/Compromisos. Ficha de contexto nueva `docs/contexto/metas.md` (primera vez que se analiza la sección a fondo). 16 unit + 4 E2E nuevos. 2981/2981 unit + 231/231 E2E + lint verdes. SW v414→v415.

---

### feat(gastos): TX.12 gastos frecuentes y "Repetir" · 2026-07-23

Segunda pieza del patrón **P2** de la auditoría (la primera fue CAL.5a, la misma tarde): cierra el patrón por completo. El gasto cotidiano (almuerzo, café, Uber) se teclea entero cada vez; ahora dos atajos, sin dato nuevo. **Chips de un toque en "Nuevo gasto":** `gastosFrecuentes()` (nueva, pura, `gastos/logic.js`) agrupa el historial por categoría + monto redondeado a $1.000 + descripción normalizada, y ofrece los patrones que se repiten 3+ veces en 60 días; un click prellena monto/categoría/cuenta y deja el foco en "Guardar". Solo al crear, nunca al editar. **"Repetir" en cada fila de la lista:** abre el modal en modo creación con los datos de esa fila exacta (incluida la nota), fechado hoy. **Excluye gastos con `compromisoId`** (pagos de fijo/abono): esos los repite su propio dominio dueño. **Decisión de diseño:** el chip de frecuente NO prellena la nota (sintetiza de varios registros, sería ambigua); "Repetir" de una fila SÍ (apunta a un registro concreto y conocido). Ambos comparten `_prellenarCamposGasto()` en `gastos/index.js`. 23 unit + 2 E2E nuevos. 2965/2965 unit + 227/227 E2E + lint verdes. SW v413→v414.

---

### feat(agenda): CAL.5a pagar en lote lo que ya venció · 2026-07-23

Primera pieza del patrón **P2** de la auditoría (trabajo uno por uno, sin lote). Pagar 6 gastos fijos eran ~30 toques porque cada uno pedía la cuenta por separado; ahora el Calendario ofrece registrarlos juntos **resolviendo la cuenta una sola vez**. **Decisión de secuencia de Esteban (regla 2.7):** el lote manual va antes que PA.1 (pagos automáticos), que conserva su tarjeta y no fue absorbida. **Rebanada `a`:** solo gastos fijos y solo desde el Calendario; deudas y el punto de entrada desde el bloque de vencidos de Inicio quedan como **CAL.5b**. `pendientesDePagoDelMes()` (nueva, pura) aplica la MISMA regla temporal que el botón individual (BUG-015): mes en curso hasta hoy inclusive, mes pasado todo, mes futuro nada; un fijo quincenal aparece una sola vez, porque el estado de pago de un fijo es por mes y listarlo dos veces sería un doble cobro. La tarjeta solo aparece con **dos o más** pendientes (con uno, el CTA del detalle del día ya lo resuelve). **El punto financiero:** la cuenta se pide para el grupo con el `resolverPagoConSelector` de siempre y `asignarSplitsPorItem()` (nueva en `infra/distribuir-pago.js`) reparte esos splits entre los items, de modo que **cada compromiso conserva su propio gasto vinculado**: eso es lo que hace funcionar el badge "Ya pagaste este mes" y el progreso del hero. **No agrega la cuarta copia de la aritmética de pago que el BOARD temía**: `_registrarPagosFijos()` es la única dentro de Agenda, compartida con el pago individual (la extracción cross-dominio sigue siendo ARQ.2). 24 unit + 2 E2E nuevos. 2942/2942 unit + 225/225 E2E + lint verdes. SW v412→v413. Verificado en la app real con reparto entre dos cuentas ($900.000 de una que queda en 0 + $164.900 de la otra).

---

### feat(movimientos): MOV.2 búsqueda y filtros en el ledger · 2026-07-22

Cierra el patrón **P4** de la auditoría de UX/producto por completo (junto con MOV.1, cerrada el mismo día). Encontrar "ese pago de hace 4 meses" era scroll ciego, agravado porque PERF.1 pagina por lotes. `logic.js` gana `descripcionMovimiento(m, cuentas)` (extraída de `view.js`, resuelve "Origen → Destino" de una transferencia) y `filtrarMovimientos()` puro; `view.js` pinta el buscador + chips por **dominio** (no `tipo`: acá el dominio SÍ es el filtro correcto porque el usuario quiere aislar "solo Deudas" de "solo gasto cotidiano") + rango de fechas, reusando `.filtros-bar`/`.chip` de Gastos, cero componente nuevo. El filtro se aplica sobre la fuente derivada ANTES de agrupar/paginar (nunca sobre el DOM de PERF.1). **Bug real detectado al verificar en la app y corregido en la misma rebanada:** los handlers de texto/fecha no repintan la barra completa (perderían el foco a mitad de palabra), así que "Limpiar filtros" se quedaba sin aparecer con esos dos filtros; se resolvió con un slot dedicado (`actualizarBotonLimpiarFiltros()`). 41 unit + 6 E2E nuevos. 2918/2918 unit + 223/223 E2E + lint verdes. SW v411→v412. Verificado en la app real: buscar, filtrar por dominio, rango de fechas y limpiar, todo funcionando sin perder foco ni errores de consola.

---

### feat(movimientos): MOV.1 el ledger deja de ser solo lectura · 2026-07-22

Cierra el patrón **P4** de la auditoría de UX/producto y la mitad de P3 que le toca. **Amplía deliberadamente la decisión de TX.8b** (ledger solo-lectura), con aprobación explícita de Esteban tras señalárselo: registrado en BOARD y CHANGELOG, no revertido en silencio (regla 2.7). Cada fila de `#movimientos` ofrece ahora los mismos `data-action` que su dominio dueño **ya registraba** (`editar-gasto`/`eliminar-gasto`, `eliminar-ingreso-puntual`, `ahorro-eliminar-aporte`). **Ese es el punto financiero del diseño:** al delegar en vez de reimplementar, borrar un gasto desde el ledger devuelve el monto a la cuenta y revierte el abono de la deuda, porque lo ejecuta el handler de Gastos; reimplementarlo habría perdido esas reversas en silencio. **Alcance honesto:** expone capacidades existentes, no las inventa (transferencia todavía no ofrece nada: es MC.17f; editar donde el dueño no sabe es EDIT.1; al cerrarse, basta sumar su entrada en `_ACCIONES_POR_TIPO`). **Corrección al plan de la tarjeta:** el enrutador es **`m.tipo`**, no `m.dominio` como proponía el BOARD, porque `dominio` es una etiqueta visual (un gasto "Gastos fijos" la lleva en `compromisos` pero vive en `S.gastos`) y habría mandado la acción al dominio equivocado; hay test dedicado. **Cero infraestructura nueva:** no cambió `logic.js`, `index.js` ni CSS. **Ficha nueva `docs/contexto/movimientos.md`.** 8 unit + 3 E2E nuevos. 2877/2877 unit + 216/216 E2E + lint verdes. SW v410→v411.

---

> Para tareas anteriores (feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas dos), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100). **Deuda técnica conocida: 2 errores abiertos**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [`docs/BUGS.md`](BUGS.md).

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
dominio/     → accesos, agenda, ahorro, analisis, apartados, compromisos,
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
