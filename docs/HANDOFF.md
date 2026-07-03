# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-02 (feat(calendario): emoji de categoría como ícono principal, AG.2)

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
| Tests unitarios + integración | 1838/1838 verdes |
| Tests E2E | 94/94 verde. Suites: `smoke` 58 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(calendario): emoji de categoría como ícono principal (AG.2) · 2026-07-02

En el detalle del día, un gasto fijo con categoría (Mercado, Internet, Arriendo...) mostraba el emoji de esa categoría solo como decoración dentro del subtítulo (` · 🌐 Internet`), mientras el ícono principal a la izquierda seguía siendo el genérico por tipo (el mismo para todos los gastos fijos). En Gastos ese problema ya estaba resuelto: el emoji de categoría es el ícono principal, y AG.2 porta ese mismo patrón a Agenda.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` calcula `emojiCategoria` (el emoji de `CATEGORIA_AGENDA_EMOJI` cuando el tipo es fijo y tiene categoría) y lo usa como ícono principal en vez de `icon(ICONO_TIPO[tipo])`; sin categoría (o en deudas, campo exclusivo de tipo fijo), cae al ícono genérico de siempre. El subtítulo ya no repite el emoji: ahora solo dice el nombre de la categoría (` · Internet`), igual que Gastos evita el emoji duplicado en `list-item__subtitle`. En [config.css](../styles/components/config.css) se sumó `.cal-detail__icon--emoji` con un `font-size` mayor (1.375rem) para que el emoji se lea con presencia, mismo criterio que `.list-item__icon--cat` de Gastos (1.5rem, "emoji grande, protagonista").

De paso se corrigió un descuido de la tarea anterior (AG.7): el commit de esa tarea documentaba el bump de `service-worker.js` a v262, pero el archivo nunca se tocó y quedó en v261, así que ese cambio se desplegó sin invalidar el caché de los usuarios. Este commit hace el bump real a v262, cubriendo tanto AG.7 (retroactivo) como AG.2.

Verificado con 5 tests unitarios nuevos (emoji en el ícono sin duplicarse en el subtítulo; fallback al ícono genérico sin categoría; emoji sin `<svg>` con categoría; deudas siguen con el ícono genérico) más 2 E2E en Chromium real (con categoría el ícono no tiene `<svg>` y contiene el emoji; sin categoría sí tiene `<svg>`). Se reescribieron 2 tests existentes de AG.6/categoría que asumían el emoji pegado al texto del subtítulo (markup que este cambio reemplaza). 1835/1835 → 1838/1838 unit; 92/92 → 94/94 E2E. Lint limpio. SW v261 → v262 (bump real, cubre también AG.7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()`: el emoji de categoría pasa a ser el ícono principal (`emojiCategoria ?? icon(...)`); el subtítulo ya no repite el emoji. |
| `styles/components/config.css` | Nueva `.cal-detail__icon--emoji` (tamaño mayor para el emoji protagonista). |
| `tests/unit/agenda.test.js` | 2 tests reescritos (emoji en el ícono, no en el subtítulo) + 3 tests nuevos (fallback sin categoría, sin `<svg>` con categoría, deuda con ícono genérico). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - emoji de categoría como ícono principal", 2 tests. |
| `service-worker.js` | v261 → v262 (bump que faltaba de AG.7, corregido aquí). |

---

### feat(calendario): marca de color por tipo en el detalle del día (AG.7) · 2026-07-02

En fechas cargadas (quincenas, fin de mes) el detalle del día en Calendario listaba todos los registros con el mismo aspecto: había que leer cada etiqueta de tipo para distinguir un gasto fijo de una deuda. AG.7 suma una franja lateral de color a cada `.cal-detail__item`, reusando exactamente la misma paleta que ya identificaba cada tipo en los dots del calendario (AG.6): `--fk-dom-presupuesto` para fijo, `--fk-dom-compromisos` para deuda entidad, `--fk-dom-personales` para deuda personal. `_renderDetalleItem()` en [agenda/view.js](../modules/dominio/agenda/view.js) agrega la clase `cal-detail__item--${tipo}` al `<li>` (ya traía `cal-detail__icon--${tipo}` en el ícono, sin CSS de color propio hasta ahora). En [config.css](../styles/components/config.css), `.cal-detail__item` gana un `border-left: 3px solid transparent` de base y cada tipo lo colorea; el padding izquierdo se compensa con `calc()` para que la franja no desplace el contenido (recalculado también en el media query mobile, que usa un padding base más chico). El ícono de cada item también toma el color de su tipo, con un fondo tenue vía `color-mix()` (14% del color de dominio sobre `--fk-bg-surface`), coherente con el patrón ya usado en `dom-badge--*` de `nudges.css`. Verificado con 4 tests unitarios nuevos (una clase por tipo, y los tres tipos el mismo día cada uno con la suya) más 1 E2E en Chromium real que compara el `border-left-color` computado de un fijo contra una deuda entidad el mismo día: deben ser colores distintos y ninguno transparente. 1831/1831 → 1835/1835 unit; 91/91 → 92/92 E2E. Lint limpio. SW v261 → v262.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()` agrega `cal-detail__item--${tipo}` al `<li>` del detalle. |
| `styles/components/config.css` | `.cal-detail__item--fijo/deuda-entidad/deuda-personal` (franja lateral + padding compensado); `.cal-detail__icon--*` con color e ícono con fondo tenue por tipo; ajuste del padding compensado en el media query mobile. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: clase por tipo (fijo, deuda entidad, deuda personal) y los 3 tipos combinados el mismo día. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - marca de color por tipo", 1 test que compara colores computados en Chromium real. |
| `service-worker.js` | v261 → v262. |

---

### feat(calendario): leyenda completa, colores consistentes y siempre visible (AG.6) · 2026-07-02

La leyenda del calendario se renderizaba al final del panel, después del detalle del día: con un día cargado de registros quedaba desplazada fuera de vista justo cuando más ayudaba. Ahora [agenda/view.js](../modules/dominio/agenda/view.js) la ubica entre el calendario y el detalle, y `.cal-legend` ([config.css](../styles/components/config.css)) es sticky, con fondo, borde y radio propios (al quedar pegada, el contenido del detalle pasa por debajo y no debe transparentarse). El obstáculo real estaba en el shell: `.main-content` tenía `overflow-x: hidden`, que lo convierte en scroll container y anula el `position: sticky` de cualquier descendiente; pasó a `overflow-x: clip` ([layout.css](../styles/layout.css)), mismo recorte horizontal sin ese efecto secundario. Sobre los colores: el calendario hoy solo mapea `S.compromisos`, así que los 3 tipos de la leyenda (gasto fijo `--fk-dom-presupuesto`, deuda entidad `--fk-dom-compromisos`, deuda personal `--fk-dom-personales`) ya cubren todos los eventos posibles con colores únicos y consistentes; no hubo que tocarlos. Los tipos futuros (metas, apartados, fondo) entrarán cuando el ADR de recordatorios de aporte (AP.4/MT.2/AH.4) los sume, con la guía dejada en el doc de `_renderLeyenda`. Verificado con 2 tests unit nuevos (los 3 dots presentes; la leyenda antes del detalle en el DOM) y 1 E2E en Chromium real que abre un día con 10 registros, scrollea al fondo (guard de `scrollY > 0` para no pasar trivialmente) y verifica la leyenda dentro del viewport. 1829/1829 → 1831/1831 unit; 90/90 → 91/91 E2E. Lint limpio. SW v260 → v261.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | La leyenda se renderiza entre el calendario y el detalle del día; doc de `_renderLeyenda` con la guía para tipos futuros. |
| `styles/components/config.css` | `.cal-legend` sticky (top), con fondo, borde y radio propios. |
| `styles/layout.css` | `.main-content` pasa de `overflow-x: hidden` a `clip`: hidden creaba un scroll container que anulaba el sticky. |
| `tests/unit/agenda.test.js` | 2 tests nuevos: dots de los 3 tipos en la leyenda, orden leyenda → detalle. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - leyenda sticky", 1 test con scroll real. |
| `service-worker.js` | v260 → v261. |

---

### feat(calendario): total a pagar por día (AG.5) · 2026-07-02

El panel de detalle del día en Calendario listaba los compromisos de ese día sin sumarlos: el usuario tenía que sumar a mano cuánto necesitaba tener disponible. Nueva `totalDia(evs)` pura en [agenda/logic.js](../modules/dominio/agenda/logic.js) (mismo criterio `monto` para fijos / `cuotaMensual` para deudas que ya usaba el render de cada item, y que `sumarMontos` de compromisos/logic.js de IN.1; duplicado intencional, no importación cruzada, porque Agenda no puede importar de Compromisos, ADN #10). Antes vivía como función privada `_totalDia` solo en `view.js`, sin tests. `_renderDetalleDia()` en [agenda/view.js](../modules/dominio/agenda/view.js) ahora muestra una línea propia "Total a pagar: **$X**" (`.cal-detail__total`) justo bajo el título, visible de inmediato sin desplazarse por la lista; antes el monto iba pegado en el subtítulo pequeño y gris ("3 compromisos · $450.000"). Color neutro, no rojo (criterio AUD.4/ADR 019: un compromiso programado no es un incumplimiento). Verificado con 1 E2E en Chromium real (un fijo + una deuda el mismo día, el total es la suma exacta) más 9 tests unitarios nuevos (`totalDia` con fijos/deudas/mezcla/entradas inválidas, y el render real del panel). 1819/1819 → 1829/1829 unit; 89/89 → 90/90 E2E. Lint limpio. SW v259 → v260.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | Nueva `totalDia(evs)`, función pura y exportada. |
| `modules/dominio/agenda/view.js` | `_totalDia` privada eliminada; `_renderDetalleDia` usa `totalDia` de logic.js y muestra una línea propia "Total a pagar". |
| `styles/components/config.css` | Nueva `.cal-detail__total` (color neutro, negrita en el monto). |
| `tests/unit/agenda.test.js` | 9 tests nuevos: `totalDia` (5) + render del total en el panel (4). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - total a pagar por día", 1 test. |
| `service-worker.js` | v259 → v260. |

---

### feat(metas): ahorro sugerido según la frecuencia de ingreso, no "por día" (MT.4) · 2026-07-02

La lista de Metas siempre mostraba "$X/día" como ritmo de ahorro sugerido, sin importar cómo cobra el usuario: para alguien que recibe su sueldo quincenal, pensar en días sueltos no ayuda a planear. Nueva `calcularAhorroPorPeriodo(meta, frecuenciaIngresos)` en [metas/logic.js](../modules/dominio/metas/logic.js) reemplaza a `calcularAhorroDiario` (eliminada): reparte el faltante entre los periodos de la frecuencia real de ingreso (Diario/Semanal/Quincenal/Mensual; las más largas como Trimestral o Anual caen a Mensual), no entre días. La frecuencia se deriva de `S.ingresos` con `frecuenciaPrincipalIngresos()`, duplicado intencional de la función homónima de Apartados (AP.1): Metas no puede importar de Apartados (ADN #10, ningún dominio importa a otro), así que cada dominio mantiene su propia copia de esta idea, igual que tesorería tiene su propio `_FACTOR_MENSUAL` independiente. `renderListaMetas()` en [metas/view.js](../modules/dominio/metas/view.js) calcula la frecuencia una sola vez (es la misma para todas las metas) y la pasa a cada `_renderMetaItem`, que ahora muestra "$X por quincena" / "$X por semana" / "$X al mes" / "$X por día" según corresponda, con la misma redacción que ya usa Apartados (consistencia de vocabulario entre secciones). Verificado con 1 E2E en Chromium real (ingreso Quincenal sembrado, meta con fecha límite muestra "por quincena", nunca "/día") más 22 tests unitarios nuevos (`frecuenciaPrincipalIngresos`, `etiquetaPeriodoAhorro`, `calcularAhorroPorPeriodo`, y el render real de la lista). Las fechas de prueba usan un helper `isoEnDias()` en hora local (mismo criterio que `hoyLocal()` de los E2E) para evitar el off-by-one de `toISOString()` en zonas UTC negativas como Colombia. 1804/1804 → 1819/1819 unit; 88/88 → 89/89 E2E. Lint limpio. SW v258 → v259.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/logic.js` | Nuevas `frecuenciaPrincipalIngresos()`, `etiquetaPeriodoAhorro()`, `calcularAhorroPorPeriodo()`; eliminada `calcularAhorroDiario()`. |
| `modules/dominio/metas/view.js` | `renderListaMetas()` calcula la frecuencia una vez; `_renderMetaItem` muestra el monto por periodo con su etiqueta. |
| `tests/unit/metas.test.js` | 22 tests nuevos; helper `isoEnDias()` para fechas relativas sin drift de zona horaria. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - ritmo de ahorro según frecuencia (MT.4)", 1 test. |
| `service-worker.js` | v258 → v259. |

---

> Para tareas anteriores (MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
               personales, presupuesto, resumen, tesoreria
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
```
