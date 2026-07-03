# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-02 (feat(calendario): total a pagar por día, AG.5)

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
| Tests unitarios + integración | 1829/1829 verdes |
| Tests E2E | 90/90 verde. Suites: `smoke` 54 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

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

### feat(metas): unificar el flujo de abono con el selector de cuentas compartido (MT.5) · 2026-07-02

El abono a una meta tenía su propio selector de cuenta (`<select>` de texto plano, obligatorio con 2+ cuentas) y su propia lógica de descuento: solo restaba de una cuenta, sin repartir si no alcanzaba y sin confirmar el sobregiro. Apartados ya había resuelto esto en AP.1 con `renderSelectorCuenta` (tarjetas seleccionables, preselecciona la de mayor saldo) + `resolverPagoConPreferida` (usa la elegida si cubre; si no alcanza y hay más cuentas, reparte sin dejar ninguna en negativo; con una sola cuenta, pide confirmar el sobregiro). MT.5 portó ese mismo patrón a Metas: [metas/view.js](../modules/dominio/metas/view.js) reemplaza `_renderCuentaSelectorAbono` (eliminada) por `renderSelectorCuenta`; `_guardarAbonoMeta()` en [metas/index.js](../modules/dominio/metas/index.js) se reescribió como async siguiendo exactamente el mismo flujo que `_guardarAporte` de Apartados: resuelve los splits con `resolverPagoConPreferida`, confirma el sobregiro cuando una sola cuenta no alcanza, y aplica el descuento a cada cuenta del reparto. De paso corrigió un vacío que Metas nunca tuvo resuelto: ahora llama a `updSaldo()` tras el abono, así el hero de Inicio refleja el nuevo saldo sin esperar a un `renderAll()` completo (Apartados ya lo hacía). El "select obligatorio con 2+ cuentas" desaparece: como el selector de tarjetas siempre preselecciona una cuenta, ya no hace falta forzar la elección. Verificado con 2 E2E nuevos en Chromium real (abono con una cuenta descuenta el saldo correcto en Tesorería; abono que no alcanza pide confirmar el sobregiro y deja el saldo en negativo tras confirmar), más los tests unitarios de `renderFormAbonoMeta` reescritos contra el nuevo markup (mismo patrón que los de Apartados). 1804/1804 unit; 86/86 → 88/88 E2E. Lint limpio. SW v257 → v258.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta()` usa `renderSelectorCuenta` de `cuenta-helper.js`; eliminada `_renderCuentaSelectorAbono`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta()` async: resuelve cuenta(s) con `resolverPagoConPreferida`, confirma sobregiro con una sola cuenta, aplica el reparto, llama `updSaldo()`. |
| `tests/unit/metas.test.js` | Describe "selector de cuenta" reescrito contra el markup de tarjetas (mismo patrón que `apartados.test.js`). |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - abono con selector de cuenta compartido (MT.5)", 2 tests. |
| `service-worker.js` | v257 → v258. |

---

### feat(metas): simplificar la selección de emoji (MT.3) · 2026-07-02

El campo "Emoji (opcional)" del form de meta era suelto: aparecía siempre, sin relación con la categoría elegida (MT.1), y un usuario podía dejarlo con un emoji que ya no correspondía a la categoría final. Ahora el campo vive oculto por defecto (`#form-group-meta-icono`, [metas/view.js](../modules/dominio/metas/view.js)) y solo se muestra cuando la categoría elegida es "Otra": el resto de las categorías ya trae su emoji (MT.1), así que no hay nada que elegir. `_syncCategoriaMeta()` nueva en [metas/index.js](../modules/dominio/metas/index.js), enganchada al `change` del selector de categoría, alterna el `hidden` y **limpia el valor del input al ocultarlo**: sin esto, un emoji tecleado con "Otra" sobrevivía si el usuario cambiaba de opinión y elegía otra categoría antes de guardar (`FormData` sigue mandando campos ocultos, y `normalizarMeta` prioriza el emoji explícito sobre el de la categoría). También se llama al abrir el modal (`_nuevaMeta`, después de `resetModal`) para que el campo empiece siempre oculto, sin depender de un estado que `resetModal` no toca (limpia valores de input pero no atributos `hidden`). La nota de la tarjeta sobre un "emoji emocional en la parte inferior del form/card" ya no aplica: el changelog de junio 2026 muestra que ese emoji se movió al título de la card, no queda ningún emoji suelto por eliminar. Verificado con 5 E2E en Chromium real (campo oculto por defecto, se muestra solo con "Otra", se guarda el emoji manual, y el caso crítico: cambiar de "Otra" a otra categoría limpia el emoji y usa el de la categoría nueva). 1803/1803 unit; 84/84 → 86/86 E2E. Lint limpio. SW v256 → v257.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | El form-group del emoji queda `hidden` por defecto; label actualizado ("Elige un emoji para tu meta"). |
| `modules/dominio/metas/index.js` | Nueva `_syncCategoriaMeta(form)`: alterna `hidden` según la categoría y limpia el emoji al ocultarlo; enganchada al `change` del selector y llamada tras `resetModal` en `_nuevaMeta`. |
| `modules/dominio/metas/logic.js` | Comentario de `normalizarMeta` actualizado para reflejar el nuevo comportamiento del form. |
| `tests/unit/metas.test.js` | Test de `renderFormMeta` actualizado: el form-group del emoji nace `hidden`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (campo oculto/visible según categoría, guardado del emoji manual, limpieza al cambiar de categoría); 1 test viejo reescrito porque ya no aplicaba con el campo siempre visible. |
| `service-worker.js` | v256 → v257. |

---

### feat(metas): categorías con emoji (MT.1) · 2026-07-02

Nuevo catálogo `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en [core/constants.js](../modules/core/constants.js) (mismo patrón que MC.9/TX.1/D.5a), foco en objetivos de alto costo (Viajes, Cumpleaños, Boda, Vivienda, Vehículo, Computador, Celular, Educación, Hijo(s), Vacaciones, Emprendimiento, Otra). Selector "Categoría (opcional)" nuevo en el form de meta ([metas/view.js](../modules/dominio/metas/view.js)); `normalizarMeta()` ([metas/logic.js](../modules/dominio/metas/logic.js)) resuelve el emoji con prioridad emoji escrito a mano > emoji de la categoría > 🎯 por defecto, así el campo "Emoji (opcional)" existente sigue funcionando como override sin romper metas ya creadas (campo `categoria` opcional, lectura defensiva, sin migración). Dos reconciliaciones de emoji contra el guardarraíl de consistencia entre catálogos (ADR 014, TX.4): "Educación" usa 📚 (no 🎓, ya en uso en Gastos/Agenda) y "Vacaciones" usa ✈️ (no 🏖️, ya en uso en Apartados); el catálogo de Metas se sumó al test de guardarraíl TX.4 para que futuras ediciones no reintroduzcan el desajuste. El preview del entorno sigue sin cargar; verificado con 2 E2E nuevos en Chromium real (categoría con emoji en la lista, emoji manual gana sobre el de categoría). 22 tests unit nuevos. 1787/1787 → 1803/1803 unit; 82/82 → 84/84 E2E. SW v255 → v256.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` (12 categorías). |
| `modules/dominio/metas/logic.js` | `normalizarMeta()` resuelve `categoria` e `icono` con la prioridad emoji manual > categoría > default. |
| `modules/dominio/metas/view.js` | Selector de categoría en `renderFormMeta()`; helper `_renderOpcionesCategoria()`. |
| `tests/unit/constants.test.js` | 4 tests de forma del catálogo + Metas sumado al guardarraíl TX.4. |
| `tests/unit/metas.test.js` | 15 tests: `normalizarMeta` con categoría, selector en el form, emoji en la lista. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - categorías con emoji (MT.1)", 2 tests. |
| `service-worker.js` | v255 → v256. |

---

> Para tareas anteriores (IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
