# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-27 (v7.8: "Apuntás primero a" en BN + tip de Avalancha más humano)

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

### fix(compromisos) - v7.8: "Apuntás primero a" en BN + tip de Avalancha más humano · 2026-05-27
Dos iteraciones consecutivas tras v7.7:
1. El usuario pidió la misma métrica "Apuntás primero a" en Bola de nieve (en v7.7 quedó solo en Avalancha), con misma lógica visual y estructural para que ambas estrategias se sientan consistentes y comparables.
2. Luego pidió ajustar el tip de Avalancha: el original "la deuda con tasa más alta" era técnico y no comunicaba el *por qué* (impacto en finanzas).

**Cambios clave:**
- **Nueva métrica en Bola de nieve** (`_renderImpactoBolaNieve`): "Apuntás primero a: <nombre>" con tip "la deuda más chica" (azul info), ubicada justo después de "Libre de deudas en" para espejar exactamente la posición que tiene en Avalancha. Usa `resultado.bolaNieve.orden[0]` (saldo ascendente).
- **Tip de "Cerrás tu primera deuda en"** (BN): ahora se omite cuando la primera deuda en cerrarse coincide con la priorizada (caso habitual en BN), para no repetir el nombre en filas contiguas. Solo se muestra cuando difieren (edge case con saldos/cuotas raras).
- **Tip de "Apuntás primero a" en Avalancha** más humano: "la deuda con tasa más alta" → "la deuda que más intereses te genera". Comunica el impacto (intereses sobre las finanzas) y no solo el dato técnico (la tasa).
- **`service-worker.js`:** v74 → v76.

**Archivos:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** sin cambios de lógica (cambio puramente presentacional); suite previa 932/932 verdes.

### fix(compromisos) - v7.7: "Apuntás primero a" en Avalancha + copy más claro · 2026-05-27
Feedback v7.6: el usuario no veía diferencia entre estrategias porque "Libre de deudas en" coincidía (1 año 7 meses en ambas). Revisé `simularEstrategiaPago`: el cálculo no tiene bug, el efecto cascada está implementado (línea 681 suma TODAS las cuotas incluyendo las pagadas; línea 700 vuelca el restante en la prioritaria). Con las deudas específicas del usuario, Préstamo Mamá (tasa 0%) cierra a los 6 meses en AMBAS estrategias y luego coinciden.

**Cambios clave:**
- **Nueva métrica en Avalancha**: "Apuntás primero a: <nombre>" con tip "la deuda con tasa más alta" (azul info). Usa `resultado.avalancha.orden[0]` que es la deuda prioritaria de la estrategia (mayor tasaEA). NO usamos "Cerrás tu primera deuda en" en Avalancha porque con deudas tasa 0 mezcladas, la primera en cerrarse puede ser la misma que en BN (no comunicaría diferencia).
- **Diferencia visual ahora clara**: Avalancha → "Apuntás primero a: Tarjeta Visa" (la cara) | BN → "Cerrás tu primera deuda en 6 meses (Préstamo mama)" (la chica). Cada estrategia muestra una deuda distinta como foco.
- **Copy Avalancha más directo**: "Puede que la primera deuda tarde un poco más en cerrarse, pero a la larga ahorrás más dinero." (antes: "...aguantás que la primera deuda cerrada tarde un poco más").
- **`service-worker.js`:** v73 → v74.

**Archivos:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 932/932 verdes.

### fix(compromisos) - v7.6: orden consistente de métricas + estado "1 sola deuda" · 2026-05-27
Dos correcciones tras feedback v7.5: la sección "Estrategia de pago" mostraba cards sin recomendación cuando había 1 sola deuda (recomendación necesita ≥2); y al poner "Cerrás tu primera deuda en" como primera métrica en BN rompimos la consistencia visual con Avalancha.

**Cambios clave:**
- **Orden consistente:** "Libre de deudas en" (azul info) ahora es la **primera métrica en ambas** estrategias. La métrica única de cada una va al final con color distintivo: Avalancha → "Total en intereses" (rojo) + (si extra > 0) "Te ahorrás" (verde); BN → "Cerrás tu primera deuda en" (verde). Razón: la consistencia visual prima cuando el usuario compara; la diferenciación de enfoque queda en el copy + el color de la métrica única.
- **Caso "1 deuda":** si `deudas.length === 1`, ahora se reemplaza el comparador por un mensaje útil ("Tenés una sola deuda activa (<nombre>). Cuando tengas dos o más, Finko te recomendará la mejor estrategia..."). Evita mostrar cards sin guía cuando matemáticamente no hay nada que comparar.
- **`service-worker.js`:** v72 → v73.

**Archivos:** `modules/dominio/compromisos/view.js`, `service-worker.js`.

**Tests:** 932/932 verdes.

### refactor(compromisos) - v7.5: métricas diferenciadas por enfoque + copy humano · 2026-05-27
Tres mejoras tras feedback v7.4: el "Total en intereses" en Bola de nieve sugería que esa estrategia cobraba algo extra; "Libre de deudas en" daba el mismo tiempo en ambas (correcto matemáticamente sin extra mensual, pero confuso); y el copy de "Por qué te conviene" mostraba números técnicos como "tasas (0.0% y 213.8% EA)".

**Cambios clave:**
- **Métricas por enfoque** (cada estrategia muestra solo lo que optimiza):
  - **Avalancha (financiero):** Libre de deudas en + Total en intereses + (si extra > 0) Te ahorrás.
  - **Bola de nieve (psicológico):** **Cerrás tu primera deuda en X meses** (verde, métrica principal) + Libre de deudas en (azul, secundaria). Removido el "Total en intereses" agregado en v7.4.
- **Copy de `recomendarEstrategia` sin números técnicos:** las 3 razones (sin intereses / diferencia grande / tasas parecidas) reescritas con lenguaje humano, sin porcentajes ni "EA". Ejemplo: "Tenés una deuda con tasa de interés mucho más alta que las otras. Atacarla primero reduce el peso de los intereses en tus finanzas y te hace ahorrar más a largo plazo."
- **Test regex actualizado** en `tests/unit/compromisos.test.js` para tolerar la nueva redacción (`/m[aá]s alta|intereses/i`, `/no cobran inter[eé]s(es)?/i`).
- **`service-worker.js`:** v71 → v72.

**Por qué "Libre de deudas en" da igual sin extra:** matemáticamente, sin extra cada deuda se paga al ritmo de su cuota mínima y la deuda más larga (ej. ICETEX $8M/$300k ≈ 27 meses) domina el tiempo total. Solo cambia el ORDEN de cierre. Con extra, Avalancha lo manda a la tasa más alta y termina antes. Ahora la métrica principal de cada estrategia es DISTINTA para que se perciban como diferentes incluso cuando el tiempo total coincide.

**Archivos:** `modules/dominio/compromisos/view.js`, `modules/dominio/compromisos/logic.js`, `tests/unit/compromisos.test.js`, `service-worker.js`.

**Tests:** 932/932 verdes.

### refactor(compromisos) - v7.4: detalle compacto + "no aplica" + métricas consistentes · 2026-05-27
Feedback del usuario sobre v7.3 (3 puntos): el detalle saturaba mobile (3 bloques), tocar una estrategia desactivada no daba feedback, y las métricas estaban en distinto orden entre Avalancha y Bola de nieve.

**Cambios clave (solo `compromisos/view.js` + `components.css`):**
- **3 bloques → 2:** el primero ("✨ Por qué te conviene" si recomendada, "ℹ️ Cómo funciona" si no) integra razón + mecanismo + ideal en 1 párrafo. `_RESUMEN_ESTRATEGIA` reemplaza a `beneficio`/`ideal` del meta. ~180px menos de scroll en mobile.
- **Cards inactivas siguen clicables:** clase `.estrategia-card-pick--inactiva` (opacidad 0.6) en lugar de `[disabled]`. Al click, el detalle se reemplaza por `_renderNoAplica('avalancha')` con bloque warning explicando "Avalancha solo tiene sentido si hay al menos una deuda con tasa > 0" + sugerencia. Removido el cambio silencioso a Bola de nieve.
- **Métricas consistentes:** ambas estrategias muestran ahora el mismo orden: 1) "Libre de deudas en" en azul (`--info`), 2) "Total en intereses" en rojo (`--danger`, **Bola de nieve también** revertiendo v7.1 por consistencia), 3) métrica única en verde (`--success`): "Te ahorrás $X" para Avalancha o "Cerrás tu primera deuda en X" para Bola de nieve.
- **CSS nuevo:** `--inactiva`, `--info`, `--danger`, `__no-aplica` (con fondo `--fk-warning-bg` y borde sutil).
- **`service-worker.js`:** v70 → v71.

**Archivos:** `modules/dominio/compromisos/view.js`, `styles/components.css`, `service-worker.js`.

**Tests:** 932/932 verdes (UI pura).

> Para tareas anteriores (v7.3 y previas), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
