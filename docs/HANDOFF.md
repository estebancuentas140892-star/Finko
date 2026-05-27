# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-27 (v7.14: abono a deudas, sub-tarea 2: modal + botón en card + glue code)

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
| Tests unitarios + integración | 932/932 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(compromisos) - v7.14: abono a deudas, sub-tarea 2 (modal + botón + glue code) · 2026-05-27
Feature "Abonar deuda" completa en UI. Segunda de 3 sub-tareas: todo lo visible y el glue code de sincronización.

**Cambios clave:**
- **Botón "Abonar" en cada card de deuda** (`compromisos/view.js`): aparece cuando `saldoTotal > 0`. Cuando `saldoTotal = 0`, se reemplaza por un chip "Saldada" (verde) y un botón "✓ Archivar".
- **Modal `#modal-abono`** (`index.html`): nuevo modal con form de abono. Campos: monto, cuenta (selector con saldo disponible en tiempo real), fecha (pre-rellena hoy), nota. Hint "Máximo $X. Si abonás más, se ajusta al saldo pendiente."
- **`renderFormAbono(deuda)`** (`compromisos/view.js`): genera el form; muestra estado vacío si no hay cuentas activas.
- **Handlers en `compromisos/index.js`**: `_abrirAbono`, `_guardarAbono`, `_archivarCompromiso`, `_actualizarSaldoDisponibleAbono`. El guardar: crea Gasto con `compromisoId`, descuenta de la cuenta, reduce `saldoTotal` de la deuda.
- **`gastos/logic.js`**: `normalizarGasto` ahora incluye `compromisoId: datos.compromisoId || null`.
- **`gastos/index.js`**: glue code de sincronización: cuando se edita o elimina un gasto-abono, `_ajustarSaldoDeuda` revierte/ajusta el `saldoTotal` de la deuda. El compromisoId se preserva al editar (no se expone en el form).
- **3 tests de integración** en `compromisos.test.js`: flujo completo abono parcial, abono que salda, y revertir abono.
- **`service-worker.js`:** v81 → v82.

**Sigue:** Sub-tarea 3 (badge "Ya abonaste este mes" en agenda + tip proyección + smoke E2E).

**Archivos:** `index.html`, `styles/components.css`, `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/index.js`, `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`, `service-worker.js`, `tests/unit/compromisos.test.js`.

**Tests:** 974/974 verdes (3 nuevos de integración).

### feat(compromisos) - v7.13: abono a deudas, sub-tarea 1 (modelo + lógica + tests) · 2026-05-27
Decisión documentada en [`docs/DECISIONS/002-abono-deudas.md`](DECISIONS/002-abono-deudas.md). Esta es la primera de 3 sub-tareas de la feature "Abonar deuda" (botón en card que abre un modal con selector de cuenta y reduce el saldo de la deuda). Sub-tarea 1 introduce el modelo y la lógica pura sin tocar UI: nada visible aún.

**Cambios clave:**
- **Schema:** `Gasto.compromisoId?: string` (campo opcional en typedef). Backwards-compatible, sin migración. Vincula un Gasto a una Deuda como abono.
- **5 funciones puras nuevas en `compromisos/logic.js`** (al final del archivo, bajo el comentario "ABONOS A DEUDAS (ADR 002)"):
  - `aplicarAbonoASaldo(saldoActual, monto)`: resta sin permitir negativos.
  - `revertirAbonoDeSaldo(saldoActual, monto)`: suma de vuelta al revertir un gasto-abono.
  - `ajustarMontoAbono(monto, saldoActual)`: caps el abono al saldo; devuelve `{ montoAjustado, saldaDeuda }`.
  - `validarAbono(datos, deuda)`: 11 reglas (monto > 0, cuentaId, fecha YYYY-MM-DD, deuda activa con saldo > 0, tipo de deuda válido).
  - `deltasSaldoCompromisoPorEdicionGasto(antes, despues)`: cuando un gasto con compromisoId se crea, edita o elimina, devuelve mapa `{ compromisoId → delta }` para sincronizar `saldoTotal`. Maneja cambios de monto, cambios de compromiso, vincular/desvincular.
- **Tests:** 39 tests nuevos (6 + 4 + 7 + 12 + 10) cubriendo cada función con caso normal, edge (NaN, monto > saldo, vacíos) y multi-error.
- **`service-worker.js`:** v80 → v81.

**Sigue:** Sub-tarea 3 (badge "Ya abonaste este mes" en Agenda + tip proyección + smoke E2E).

**Archivos:** `modules/core/state.js`, `modules/dominio/compromisos/logic.js`, `tests/unit/compromisos.test.js`, `service-worker.js`, `docs/DECISIONS/002-abono-deudas.md` (creado en commit previo del ADR).

**Tests:** 971/971 verdes (39 nuevos).

### fix(compromisos) - v7.12: tasa de interés sin decimales + sin "% EA" en cards de deudas · 2026-05-27
Feedback del usuario: las cards de deuda mostraban la tasa con decimales y con el sufijo "% EA", lo que se veía técnico. Pidió enteros sin etiqueta.

**Cambios clave:**
- **`tasaMostrada`** en `view.js:220`: `${tasaEA.toFixed(1)}% EA` → `${Math.round(tasaEA)}%`; para tasa mensual `${(tasa * 100).toFixed(2)}% mensual (~X% EA)` → `${Math.round(tasa * 100)}% mensual` (elimina el equivalente EA). `sin interés` sin cambios.
- **Label del form** `tasaLabel`: `'Tasa de interés EA (%)'` → `'Tasa de interés (%)'`.
- **Hint de usura** en el form: `~28.17% EA` → `~28% anual`.
- **`service-worker.js`:** v79 → v80.

**Archivos:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 932/932 verdes (cambio puramente presentacional).

### fix(calculadoras) - v7.11: remover tasa EA + usura de calculadora de crédito · 2026-05-27
Feedback del usuario: la calculadora de crédito mostraba tres elementos derivados (fila "Tasa mensual efectiva", alerta de usura cuando la tasa supera el tope SFC, y badge clasificador "razonable/estándar/alta/usura") que agregaban ruido y desviaban el foco de las métricas centrales (cuota, total pagado, intereses). Pidió ocultar los tres.

**Cambios clave:**
- **`renderResultCredito`** (view.js) ya no incluye "Tasa mensual efectiva". Quedan tres filas: Cuota mensual fija, Total pagado, Total intereses.
- **`_onSubmitCredito`** (index.js) simplificado: removida la clasificación de tasa, la inyección del nudge de usura y el badge. Imports muertos limpiados (`tasaUsuraVigente`, `clasificarTasaCredito`, `renderBadgeTasa`, `renderAlertaUsura`).
- **Funciones puras intactas:** `clasificarTasaCredito`, `renderBadgeTasa`, `renderAlertaUsura` siguen exportadas (sus tests siguen pasando); basta re-importarlas si se decide reactivar la advertencia más adelante.
- **`service-worker.js`:** v78 → v79.

**Archivos:** `modules/dominio/calculadoras/view.js`, `modules/dominio/calculadoras/index.js`, `service-worker.js`.

**Tests:** 932/932 verdes (cambio puramente presentacional).

### fix(compromisos) - v7.10: comparativa Avalancha vs BN siempre visible + remover "Libre de deudas en" · 2026-05-27
Feedback del usuario: faltaba mostrar el impacto financiero comparativo entre estrategias en la card de Avalancha. Lo que hoy había (fila "Te ahorrás respecto a Bola de nieve") solo aparecía cuando `extraMensual > 0 && ahorro > 0`, así que en el caso del usuario (deudas con tasa 0 mezcladas, sin extra) nunca se mostraba ningún mensaje. Además pidió eliminar "Libre de deudas en" porque "el cambio no es que sea muy notorio" (suele coincidir entre estrategias).

**Cambios clave:**
- **Nueva métrica comparativa siempre visible en Avalancha**, cubriendo 3 escenarios:
  - **Hay ahorro real** (≥ $1 o ≥ 1 mes): banner verde success "💰 Con Avalancha te ahorrarías **$X** en intereses [y **Y** de tiempo] frente a Bola de nieve".
  - **Empate sin extra** (extra = 0): banner azul info "ℹ️ Con tus deudas actuales, Avalancha y Bola de nieve dan el mismo costo. Probá agregar un pago extra mensual abajo..." (CTA al acordeón).
  - **Empate con extra** (extra > 0): banner azul info "ℹ️ Con este pago extra, ambas estrategias terminan en el mismo costo. Podés elegir por preferencia: orden financiero o impulso psicológico".
- **"Libre de deudas en" removida** de Avalancha y de Bola de nieve. La info de tiempo total se mueve al banner comparativo cuando es relevante (cuando difiere entre estrategias).
- **Nuevo helper** `_renderComparativa(resultado, extraMensual)` en `compromisos/view.js`. Reemplaza al muerto `_renderComparacionAhorro`.
- **CSS:** nueva variante `.estrategia-card__ahorro--info` para el banner azul (empate), reusando `--fk-info`.
- **`service-worker.js`:** v77 → v78.

**Archivos:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 932/932 verdes (cambio puramente presentacional).

> Para tareas anteriores (v7.9 y previas), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Estado actual:** App completa, en producción estable (`https://finko-brown.vercel.app`). Todas las features v1.0 + post-v1.0 están implementadas. **Modo mantenimiento.**

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

### ⏰ Recordatorio enero 2027 - E.2

**Qué hacer:**
1. 👉 Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores vigentes para 2027
3. Actualiza en `modules/core/constants.js`:
   ```javascript
   export const SMMLV_2027 = <nuevo_valor>;
   export const UVT_2027 = <nuevo_valor>;
   ```
4. Cambia las referencias de `_2026` a `_2027` en `constants.js`
5. Tests (`npm test` → 596/596 verdes)
6. Commit: `feat(E.2): actualizar SMMLV 2027 + UVT 2027`
7. Push a main → auto-deploy a producción

**Archivo:** Escribe tu `Próximo paso` con modelo **Haiku 4.5** (búsqueda + cambio mecánico).

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
tests/e2e/   → smoke tests (Playwright) - 18 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 596 tests unitarios + integración
pnpm run test:e2e             # 18 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
