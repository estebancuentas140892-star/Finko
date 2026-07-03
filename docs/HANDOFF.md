# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-02 (feat(metas): unificar el flujo de abono con el selector de cuentas compartido, MT.5)

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
| Tests unitarios + integración | 1804/1804 verdes |
| Tests E2E | 88/88 verde. Suites: `smoke` 52 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 6 tests, `install-prompt` 6 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

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

### feat(inicio): ojo para ocultar/mostrar el dinero disponible (IN.2) · 2026-07-02

Icono de ojo junto al saldo del hero de Inicio, estilo app bancaria, para usar Finko en lugares públicos: alterna entre el monto visible y la máscara `$••••••` (largo fijo, no revela la magnitud). La preferencia vive en `S.config.ocultarSaldo` y persiste entre sesiones (lectura defensiva `=== true`, sin migración). `updSaldo()` en [infra/render.js](../modules/infra/render.js) aplica la máscara y sincroniza el botón (`aria-pressed` + swap ojo/ojo tachado); mientras está oculto, el monto real nunca toca el DOM y `stopCount()` (nueva en [infra/animate.js](../modules/infra/animate.js)) cancela cualquier countUp en vuelo que fuera a sobreescribir la máscara. Acción `saldo-visibilidad` registrada como built-in en [ui/actions.js](../modules/ui/actions.js). Sin cuentas registradas el ojo se oculta junto con el valor (empty state manda). Alcance decidido: solo el hero (el dato más sensible); extender a los demás montos de Inicio quedó como observación en el BOARD. El preview del entorno sigue sin cargar (nota en memoria del proyecto); verificado con 13 tests unit nuevos (happy-dom) + 1 E2E en Chromium real que cubre click, persistencia tras recarga y reversa. 1774/1774 → 1787/1787 unit; 81/81 → 82/82 E2E. SW v254 → v255.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolos `i-eye`/`i-eye-off` en el sprite; botón `#saldo-ojo` en el hero. |
| `modules/infra/render.js` | `updSaldo()` enmascara con `SALDO_MASCARA` y sincroniza el botón. |
| `modules/infra/animate.js` | Nueva `stopCount(el)`: cancela el countUp activo de un elemento. |
| `modules/ui/actions.js` | Acción built-in `saldo-visibilidad`: flip + `save()` + `updSaldo()`. |
| `styles/components/domain.css` | `.hero-saldo` (fila monto + ojo) y refuerzo `[hidden]` del botón. |
| `tests/unit/render.test.js` | Nuevo: 13 tests de máscara, defensiva, botón, empty state y acción. |
| `tests/e2e/smoke.test.js` | 1 test: ocultar, persistir tras recarga, mostrar. |
| `service-worker.js` | v254 → v255. |

---

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard no sumaban sus listas: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en 7 días. Nueva `sumarMontos(items)` pura en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` de AUD.1), consumida por ambos paneles en [dashboard.js](../modules/dominio/compromisos/views/dashboard.js): "Total de gastos vencidos" y "Total de próximas prioridades" (este último solo cuando hay algo que mostrar, no en el estado "Todo al día"). El preview del entorno sirvió JS viejo por caché HTTP agresiva (ver nota en memoria del proyecto); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real. 6 tests nuevos. 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`. |
| `modules/dominio/compromisos/views/dashboard.js` | Total al pie en ambos paneles. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total`. |
| `tests/unit/compromisos.test.js` | 6 tests (4 lógica + 2 render). |
| `service-worker.js` | v253 → v254. |

---

> Para tareas anteriores (IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
