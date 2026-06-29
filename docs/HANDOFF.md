# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (feat(tesoreria): filas informativas Necesidades/Estilo de vida en el panel, ADR 012 MC.4c)

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

### feat(tesoreria): filas informativas Necesidades/Estilo de vida en el panel (ADR 012, MC.4c) · 2026-06-29

Tercer slice de la auto-distribución, de cierre del panel base. El panel "Distribuir mi ingreso" ahora muestra, bajo "Esto queda en tu cuenta (no se mueve)", dos filas de referencia: Necesidades y Estilo de vida con su % y su monto. No son editables ni mueven dinero (las obligaciones se pagan al vencer; el estilo de vida se gasta a lo largo del mes); solo completan la foto de los 3 grupos para que el usuario entienda a dónde va todo su ingreso. Los montos se recalculan en vivo al cambiar el "Monto a distribuir" (son % del ingreso, leídos de `data-dist-pct`). Cambio solo de UI (view + index + CSS), sin lógica financiera nueva ni cross-domain. Verificado: 1473/1473, lint limpio, y un test desechable en happy-dom (las filas muestran 50%→$1.5M y 30%→$900k sobre 3M, y recalculan a $1M/$600k al bajar el monto a 2M). SW v204 → v205. **Pendientes de MC.4:** MC.4d (habilitar solo al llegar el ingreso + nudge "Hoy recibes tu ingreso, ¿distribuir?" + de-duplicación), MC.4e (inversiones). Backlog nuevo del usuario: MC.6 (Automático inteligente, no 50/30/20 fijo + quitar duplicidad) y MC.7 (asistente guiado de 3 pasos con obligaciones itemizadas y aportes auto-calculados); ambas épicas, requieren ADR.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Bloque informativo Necesidades/Estilo de vida en el panel; pasa `necesidadesPct`/`estiloVidaPct`. |
| `modules/dominio/tesoreria/index.js` | `_recalcularDistribucion` recalcula los montos informativos en vivo. |
| `styles/components/forms.css` | `.distribuir__info` + `.distribuir__info-fila`. |
| `service-worker.js` | `CACHE_NAME` v204 → v205. |

---

### feat(tesoreria): "Distribuir mi ingreso" suma Deudas como destino (ADR 012, MC.4b) · 2026-06-29

Segundo slice de la auto-distribución. El panel ahora reparte también hacia las deudas pendientes como abono real. Bajo una subsección "Abonar a deudas (ordenadas por prioridad de pago)" aparece una fila por deuda con saldo > 0, ordenadas estilo Avalancha (mayor interés efectivo anual primero, la estrategia óptima recomendada), cada una con su saldo como contexto. El abono se topa al saldo (no se paga de más; el excedente se queda en la cuenta) en `_leerItemsDistribucion`, así el resumen y el apply usan el mismo monto efectivo. Al confirmar, la deuda se aplica por el mismo EventBus `distribucion:aplicar`: el suscriptor en `compromisos/index.js` baja `saldoTotal` (topado en 0) con su propia lógica; tesorería centraliza el descuento de la cuenta (las deudas, como metas/apartados, sí salen de la cuenta). Se agregó `compromisos` al snapshot de undo. Lógica pura nueva `construirPlanDeudas` (ordena por EA desc replicando localmente `tasaEADe` con comentario, ADN #10). El botón "Distribuir mi ingreso" ahora también aparece cuando solo hay deudas (sin destinos de ahorro). Verificado: 5 tests de lógica nuevos (1473 total), test de integración desechable en happy-dom (orden por prioridad, tope al saldo, descuento de cuenta, undo), 57/57 E2E. El navegador local cargó módulos cacheados de la sesión anterior en :8080 y no mostró las filas de deuda; se confirmó que los archivos servidos sí contienen el código nuevo, y la verificación quedó en el test de integración (el SW v204 fuerza assets frescos en producción). SW v203 → v204. **Pendientes:** MC.4c (filas informativas necesidades/estilo de vida), MC.4d (de-duplicación + mapeo), MC.4e (inversiones).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirPlanDeudas` (orden Avalancha) + `_tasaEADeuda` (replicado, ADN). |
| `modules/dominio/tesoreria/view.js` | Subsección de deudas en el panel + `_filaDistribuir` (muestra saldo). |
| `modules/dominio/tesoreria/index.js` | Tope del abono al saldo; `compromisos` en el snapshot; copy del resumen. |
| `modules/dominio/compromisos/index.js` | Suscriptor `distribucion:aplicar`: baja `saldoTotal` de la deuda. |
| `styles/components/forms.css` | `.distribuir__subtitulo` + `.distribuir__saldo`. |
| `tests/unit/tesoreria.test.js` | 5 tests de `construirPlanDeudas`. |
| `service-worker.js` | `CACHE_NAME` v203 → v204. |

---

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
