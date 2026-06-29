# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (feat(tesoreria): "Distribuir mi ingreso" grupo Ahorro + undo, ADR 012 MC.4a)

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
| Tests unitarios + integración | 1450/1450 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(tesoreria): "Distribuir mi ingreso", grupo Ahorro + undo (ADR 012, MC.4a) · 2026-06-29

Primer slice de implementación de la auto-distribución de ingresos. En "¿Cómo distribuir mi dinero?" aparece un botón "💸 Distribuir mi ingreso" (solo si hay destinos de ahorro fondeables) que abre un panel inline editable: monto a distribuir + una fila por destino del grupo Ahorro (Fondo de emergencia, Metas, Apartados) con toggle y monto, más un resumen en vivo ("A tus ahorros / Queda disponible") que bloquea el confirmar si se asigna más que el ingreso. Al confirmar: se elige la cuenta de origen (`resolverCuenta`, patrón 0/1/varias), se toma un **snapshot** de las slices afectadas, se **acredita el ingreso** a la cuenta y se descuenta solo lo que físicamente sale (metas + apartados; el aporte al fondo no descuenta, ADR 009), y cada dominio aplica su porción por **EventBus** (`distribucion:aplicar`): ahorro registra el aporte al fondo, metas/apartados suman a su `montoActual` y recalculan completado con su propia lógica (ADN #10, sin imports cruzados). Un **snackbar "Deshacer"** restaura el snapshot de forma atómica. Pendiente del default "fondo primero": sugiere todo el presupuesto de ahorro al fondo si está incompleto; el usuario redistribuye. Verificado: 8 tests de lógica nuevos (1468 total), test de integración desechable en happy-dom (apply + undo cross-domain), 57/57 E2E, y verificación en el navegador real (panel renderiza con nombres, distribuir deja la cuenta en 8M = 5M+3M sin descontar el fondo, aporte de 600k al fondo, snackbar visible). Se corrigió un bug de layout: el input de monto se estiraba a 100% y aplastaba el nombre del destino; `flex: 0 0 9rem` (flex-basis fija gana sobre `.input{width:100%}` en flexbox). SW v202 → v203. **Pendientes:** MC.4b (deudas), MC.4c (filas informativas necesidades/estilo de vida), MC.4d (de-duplicación + mapeo), MC.4e (inversiones).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirPlanAhorro` (default fondo-first) + `resumirPlanDistribucion` (puras). |
| `modules/dominio/tesoreria/view.js` | Botón "Distribuir mi ingreso" + panel inline (`_renderPanelDistribuir`). |
| `modules/dominio/tesoreria/index.js` | Orquestación: snapshot/credit/decrement, emit `distribucion:aplicar`, recalc en vivo, snackbar undo. |
| `modules/dominio/ahorro/index.js` | Suscriptor `distribucion:aplicar`: aporta al fondo (sin descontar cuenta). |
| `modules/dominio/metas/index.js` | Suscriptor: suma a la meta y recalcula `completada`. |
| `modules/dominio/apartados/index.js` | Suscriptor: suma al apartado y recalcula `completado`. |
| `styles/components/forms.css` | Panel `.distribuir-ingreso` + `.snackbar` (con fix `flex: 0 0 9rem`). |
| `tests/unit/tesoreria.test.js` | 9 tests nuevos. |
| `service-worker.js` | `CACHE_NAME` v202 → v203. |

---

### docs: ADR 012, diseño de auto-distribución de ingresos (MC.4) · 2026-06-29

Tarea de diseño (sin código): se escribió el ADR para "Distribuir mi ingreso" antes de implementar, porque toca el ADN (cross-domain, posible schema). El registro del ingreso reveló el hecho clave: **registrar un ingreso hoy NO acredita saldo a ninguna cuenta** (es solo una definición de flujo), y los destinos son heterogéneos (el fondo de emergencia trackea sin mover dinero; metas/apartados/deudas descuentan una cuenta; inversiones solo crea/elimina holdings, sin aporte incremental; necesidades y estilo de vida no son buckets que se fondeen el día del cobro). Decisiones tomadas con el usuario: (1) comportamiento **híbrido**, mueve dinero real solo a lo fondeable (fondo, metas, apartados, deudas), informa el resto; (2) la acción **acredita el ingreso** a la cuenta de origen y luego reparte (el remanente queda como saldo), para resolver el cobro de un gesto; (3) confirmaciones parciales de primera clase (filas editables con toggle); (4) orquestación por **EventBus** + **undo por snapshot** para respetar el ADN (#10) y dar reversión atómica. 5 slices definidos (MC.4a-e), empezando por el grupo Ahorro. Sin cambios de código ni de tests aún.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/012-auto-distribucion-ingresos.md` | ADR nuevo (diseño completo: hechos del modelo, decisión híbrida, orquestación, 5 slices, alternativas, consecuencias). |

---

### copy(tesoreria): nudge de deudas invita a recortar estilo de vida en vez del ahorro (MC.3) · 2026-06-28

Tercera tarea del backlog "Mis cuentas + distribución". Cuando el usuario tiene deudas activas, "¿Cómo distribuir mi dinero?" mostraba: "Tienes deudas activas: considera destinar parte del ahorro al pago de deudas." El usuario señaló que el ahorro no debería ser el primer sacrificio: es más coherente invitar a recortar primero el presupuesto de Estilo de vida. Se cambió el texto de la alerta en `sugerirDistribucionIngreso` a: "Tienes deudas activas: antes de reducir tu ahorro, intenta recortar primero tu presupuesto de estilo de vida." El CTA ("Ver estrategia de deudas" → sección compromisos) no cambió. Cambio de copy puro, sin lógica nueva. Verificado: 1460/1460 unit + integración (1 test nuevo que confirma la mención a "estilo de vida" y la ausencia del texto viejo; el test existente de la alerta seguía pasando por usar un `includes('deuda')` laxo), lint limpio, y un test desechable en happy-dom que confirmó el render real de `renderDistribucionIngreso()` con el mensaje correctamente escapado. El preview del entorno volvió a fallar (5to intento acumulado, mismo `chrome-error`). SW v201 → v202.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Texto de la alerta de deudas en `sugerirDistribucionIngreso`. |
| `tests/unit/tesoreria.test.js` | 1 test nuevo. |
| `service-worker.js` | `CACHE_NAME` v201 → v202. |

---

### feat(tesoreria): distribución de porcentajes personalizada (MC.2, parte 2) · 2026-06-28

Cierra MC.2. Antes solo se podía elegir entre 3 presets fijos (50/30/20, 70/20/10, 60/20/20) o el modo Automático; el usuario pidió poder definir su propia mezcla (ej. 80/10/10). Se agregó un cuarto chip "Personalizar" en la barra de presets que abre un editor inline (mismo patrón que el fieldset condicional de cuota de manejo: oculto por defecto, un clic lo despliega sin re-renderizar el nudge entero) con 3 campos numéricos (Necesidades, Estilo de vida, Ahorro). Mientras escribe, un mensaje en vivo muestra la suma y el botón "Guardar mi distribución" solo se habilita si suma exactamente 100%. Al guardar, se persiste `S.config.distribucionPersonalizada` + `presetDistribucion: 'personalizado'`, se recalcula todo con `sugerirDistribucionIngreso` (nuevo parámetro `distribucionPersonalizada`, nueva función pura `esDistribucionPersonalizadaValida`), y el chip pasa a mostrar la mezcla real ("80/10/10") en vez de la etiqueta genérica. Si los datos guardados quedaran corruptos o incompletos, cae automáticamente al ajuste automático existente (mismo comportamiento que un `presetId` desconocido). Verificado: 1459/1459 unit + integración (9 tests nuevos: 4 de la rama `personalizado` en `sugerirDistribucionIngreso`, 5 de `esDistribucionPersonalizadaValida`), lint limpio, y un test de integración desechable en happy-dom que simuló el flujo completo (abrir editor, escribir, validar suma en vivo, guardar, reabrir) usando el dispatcher real de `data-action`. El preview del entorno no cargó la app en ningún intento (4 intentos en total entre esta tarea y la anterior, todos en `chrome-error`), así que no hubo captura visual; queda para que el usuario la confirme en su celular. SW v200 → v201.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nueva `esDistribucionPersonalizadaValida(d)`; `sugerirDistribucionIngreso` acepta `distribucionPersonalizada` y resuelve `presetId: 'personalizado'`. |
| `modules/dominio/tesoreria/view.js` | Chip "Personalizar" + fieldset `#distribucion-personalizada-fieldset` con 3 inputs, prellenados con lo guardado o con el split activo. |
| `modules/dominio/tesoreria/index.js` | Handlers `_toggleDistribucionPersonalizada`, `_actualizarSumaDistribucionPersonalizada`, `_guardarDistribucionPersonalizada`; listener `input` delegado. |
| `styles/components/forms.css` | Nueva `.distribucion-personalizada` (mismo patrón que `.cuota-fieldset`). |
| `tests/unit/tesoreria.test.js` | 9 tests nuevos. |
| `service-worker.js` | `CACHE_NAME` v200 → v201. |

---

### style(tesoreria): transición suave al cambiar de preset de distribución (MC.2, parte 1) · 2026-06-28

Segunda tarea del backlog "Mis cuentas + distribución". Al hacer clic en un chip de preset (50/30/20, 70/20/10, 60/20/20) en "¿Cómo distribuir mi dinero?", `renderDistribucionIngreso()` reemplaza por completo el `innerHTML` del bloque: los porcentajes y montos nuevos aparecían de golpe, sin transición, lo que se sentía brusco. Se envolvió el contenido que cambia con el preset (razón + filas de porcentaje/monto + alertas + CTAs) en un nuevo contenedor `.distribucion-rows`, dejando la barra de chips fuera (estable, no se vuelve a animar solo por su propio cambio de estado activo). Se le dio una animación de entrada corta (`distribucion-rows-in`: fade + 4px de desplazamiento vertical, `var(--fk-transition-slow)` = 350ms) siguiendo el patrón ya usado en `progress-fill`/`ring-fill`/`check-pop` (solo `from`, `both`, sin envolver en su propio `@media prefers-reduced-motion`: la app ya anula toda animación globalmente en `a11y.css` bajo esa preferencia). Es la primera mitad de MC.2; la distribución personalizada por porcentajes queda para una sesión aparte. Verificado: 1450/1450 unit + integración, lint limpio, y verificación funcional con un test desechable en happy-dom (el wrapper `.distribucion-rows` existe, el contenido cambia entre presets, la barra de chips queda fuera del bloque animado, y la regla CSS + el keyframe están en `domain.css`). El preview del entorno no cargó la app (mismo artefacto recurrente: ni un servidor reusado ni uno nuevo logran salir de `chrome-error`), así que no hubo captura visual de la animación en este ciclo. SW v199 → v200.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | `_renderDistribucion` envuelve razón + filas + alertas + ctas en `<div class="distribucion-rows">`, fuera de la barra de chips. |
| `styles/components/domain.css` | Nuevas `.distribucion-rows` + `@keyframes distribucion-rows-in`. |
| `service-worker.js` | `CACHE_NAME` v199 → v200. |

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Estado de finalización (v1.0 + post-v1.0)

**🎯 Hito: todas las series pendientes completadas.**

- ✅ **"Coaching de ingresos"** (Fases 1, 2, 3): diaPago + nudge de próximo cobro + distribución adaptativa. SW v128 → v131. 1235/1235 verdes. 2026-06-09.
- ✅ **"Mejoras de deudas"**: tasa opcional + motor de recomendación por simulación. SW v131 → v132. 1256/1256 verdes. Ver [ADR 006](DECISIONS/006-recomendacion-deudas-por-simulacion.md). 2026-06-09.
- ✅ **"Apartados"** (Fases 1, 2, 3): CRUD + recurrencia/ciclo + frecuencia automática + nudge de proximidad. SW v132 → v135. 1333/1333 verdes. Ver [ADR 007](DECISIONS/007-dominio-apartados.md). 2026-06-10.
- ✅ **fix(agenda) abono parcial**: badge de Agenda distingue abono parcial de cuota cubierta. SW v135 → v136. 1351/1351 verdes. 2026-06-10.

**Tareas opcionales / futuras:**
- **E.2-2027**: Enero 2027, actualizar SMMLV/UVT a valores 2027 cuando se publiquen oficialmente (Haiku, ~15 min).
- **E.5**: Agregar IPC como constante anual si se quiere mostrar inflación observada (Haiku, Bajo).
- **A.5**: Setup de dominio custom cuando el usuario tenga URL registrada. No requiere código. Guía lista en `docs/SETUP_DOMINIO.md`.

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, 1333/1333 tests verdes, cero deuda técnica conocida).

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

Tareas opcionales restantes:

| Prioridad | Tarea | Cuándo | Nivel |
|---|---|---|---|
| 1 | **A.5 - Dominio custom** (opcional) | Cuando el usuario tenga dominio registrado | Guía lista en [`docs/SETUP_DOMINIO.md`](SETUP_DOMINIO.md) |
| 2 | **E.2 - SMMLV + UVT** (anual) | **Enero 2027** - buscar nuevos valores Mintrabajo (SMMLV) + DIAN (UVT), actualizar `modules/core/constants.js` | ~15 min, Haiku |
| 3 | **E.3 - GMF + reforma** (demanda) | Si hay reforma tributaria - verificar cambios en GMF | Ad-hoc |

### Recordatorio enero 2027 - E.2

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

- **Una tarea a la vez.** No se empieza la siguiente sin verificar en la app y commitear.
- **Al cerrar cada tarea:** actualizar este archivo (HANDOFF.md) + CHANGELOG.md; eliminar de ROADMAP.md y TASKS.md.
- **Al final de cada respuesta:** bloque `─── Próximo paso ───` con modelo sugerido + nivel.
- **Modelos permitidos:** `Haiku 4.5` (sin nivel) · `Sonnet 4.6 - Bajo/Medio/Alto` · `Opus 4.7 - Bajo/Medio/Alto/Extra Alto/Max`.
- **Regla de oro:** calidad del código primero, ahorro de tokens segundo.
- Workflow completo en [`/CLAUDE.md`](../CLAUDE.md) sección 2.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → ingresos, gastos, compromisos, tesoreria, metas, analisis,
               calculadoras, config, import, export
tests/unit/  → lógica pura (Vitest + happy-dom) - 521 tests
tests/e2e/   → smoke tests (Playwright) - 57 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 1182 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
