# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-29 (docs(deudas): D.5 - ADR 015, categorías de deuda en dos dimensiones (quién = Entidad/Personal, qué = Tipo de deuda curado))

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
| Tests unitarios + integración | 1645/1645 verdes |
| Tests E2E | 64/64 verde. Suites: `smoke` 28 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(deudas): ADR 015 - categorías de deuda en dos dimensiones (D.5) · 2026-06-29

Tarea de **diseño** (sin código de producción). [ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md) resuelve las dos preguntas abiertas del backlog D.5. Decisión con el usuario: el modelo de dos dimensiones ya existe en parte (**quién** = Entidad/Personal, que define la unidad de tasa; **qué** = `categoria`). D.5 refina el eje "qué" y deja "quién" intacto. (1) "Tipo de deuda" **reemplaza** "Tipo de obligación": se cura `CATEGORIAS_DEUDA` de 12 a 7 valores orientados al propósito (Tarjeta de crédito, Libre inversión, Vivienda, Vehículo, Educativo, Compra a cuotas, Otra) + migración v18 → v19. (2) **No** se agrega campo "Acreedor": el usuario lo encontró confuso (jerga) y Entidad/Personal ya separa el "quién"; los acreedores granulares siguen como texto de ayuda en el chooser. Un solo slice de implementación: **D.5a** (Opus 4.8 - Medio). El usuario revisa la lista curada + el mapeo de migración antes de codear.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/015-categorias-de-deuda-dos-dimensiones.md` | ADR nuevo: dos dimensiones (quién/qué), no agregar Acreedor, lista curada + mapeo de migración v18→v19, slice D.5a, alternativas y consecuencias. |

---

### feat(deudas): "Aumentar la cuota" como acción aplicable real (D.9, ADR 011 rev. D.7) · 2026-06-29

Cierra la jornada 2 de "Visión de Deudas". El pago extra de "Aumentar la cuota" deja de ser solo what-if: ahora se puede **Aplicar**. Nueva función pura `repartirExtraEnCuotas(deudas, extra)` que traduce el extra (un monto que la simulación vuelca dinámicamente) a incrementos concretos de `cuotaMensual` por deuda, con el criterio decidido en la Revisión D.7: **automático, sin preguntar a qué deuda** (1) cubre el déficit de las que más rápido crecen para frenar el crecimiento, (2) el remanente a la deuda de mayor tasa (Avalancha). El botón "Aplicar este aumento" pide confirmación que nombra cada deuda y su nueva cuota, y escribe `cuotaMensual` vía EventBus. Ese valor alimenta los pagos programados (`calcularCompromisoMensual`) y la distribución automática (`cuotasDeudaMensuales` en MC.6a) sin lógica nueva. El input usa su propia acción (`cambiar-extra-remedio`) que commitea en vivo sin re-render, para no perder el clic en "Aplicar". 8 unit nuevos (`repartirExtraEnCuotas` + estado del botón) + 1 E2E nuevo. 1637 → 1645 verdes; 63 → 64 E2E. SW v224 → v225.

**Limitación v1 (documentada en el ADR):** `cuotaMensual` es estático; no replica el volcado dinámico. Si una deuda cierra, su cuota liberada no se reasigna sola: el usuario re-aplica.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `repartirExtraEnCuotas` (función pura nueva: cubre déficits + remanente a la mayor tasa). |
| `modules/dominio/compromisos/views/estrategia.js` | `_renderRemedioExtra` suma el botón "Aplicar este aumento"; el input usa `cambiar-extra-remedio`. |
| `modules/dominio/compromisos/index.js` | `_aplicarAumentoCuota` (confirmación + escribe `cuotaMensual`), `_actualizarRemedioExtraEnVivo`; `_actualizarResumenEnVivo` togglea el botón; registro + cableado del input. |
| `styles/components/charts.css` | `.estrategia-card__aumentar-aplicar`. |
| `tests/unit/compromisos.test.js` | Describe `repartirExtraEnCuotas` (6) + 2 tests del estado del botón. |
| `tests/e2e/estrategia-pago.test.js` | Suite "Aumentar la cuota (D.9)" (1 test de aplicar). |
| `service-worker.js` | v224 → v225. |

---

### feat(deudas): panel de alternativas con selector (D.8, ADR 011 rev. D.7) · 2026-06-29

Implementa la jerarquía de la Revisión D.7 de [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md). El bloque inviable deja de mostrar diagnóstico + pago extra + renegociar + consolidar todo a la vez: ahora, debajo del detalle de la estrategia, aparece **un solo botón de alerta** ("🚨 Cuidado: tu plan de pago no se sostiene. Veamos cómo resolverlo") que abre **un panel** con el diagnóstico y un **selector** de 3 alternativas (💪 Aumentar la cuota · 🤝 Renegociar la tasa · 🏦 Consolidar) que muestra **solo la elegida**. Default: "Aumentar la cuota". El selector solo ofrece las alternativas que aplican (renegociar exige tasa > 0, consolidar exige >= 2 deudas). Estado del panel en `_uiEstrategia` (`panelAlternativasAbierto`, `alternativaActiva`), no `<details>`, porque la card se re-renderiza por cada tecla. `renderRenegociar` y `renderConsolidar` (D.3a/D.3b) se reubican sin tocar su lógica. 2 data-actions nuevos (`abrir-panel-alternativas`, `elegir-alternativa`). 8 tests unitarios nuevos + 2 E2E nuevos (cableado verificado por E2E, no por preview). SW v223 → v224.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/estrategia.js` | `_renderBloqueInviable`, `_renderBotonAlerta`, `_renderPanelAlternativas`, `_renderContenidoAlternativa`, `_renderRemedioExtra`, `_renderDiagnosticoTexto`; reemplazan `_renderDiagnosticoInviable`. Bloque inviable se mueve debajo del detalle. Estado UI `panelAlternativasAbierto` + `alternativaActiva`. |
| `modules/dominio/compromisos/index.js` | Handlers `_abrirPanelAlternativas`, `_elegirAlternativa` + registro de las 2 acciones nuevas. |
| `styles/components/charts.css` | `.estrategia-card__alerta-boton`, `.estrategia-card__selector(-opcion)`, `.estrategia-card__diagnostico`; `.estrategia-card__alerta` ahora condicional (solo con el panel abierto). |
| `tests/unit/compromisos.test.js` | Describe D.8 reescrito (8 tests); `beforeEach` de renegociar/consolidar abren el panel y eligen la alternativa. |
| `tests/e2e/estrategia-pago.test.js` | Suite "Panel de alternativas (D.8)" (2 tests nuevos) + helper `abrirAlternativa`; suites de renegociar/consolidar actualizadas para pasar por el selector. |
| `service-worker.js` | v223 → v224. |

---

### docs(deudas): revisión D.7 de ADR 011 - botón único → panel con selector para el plan inviable (D.7) · 2026-06-29

Tarea de **diseño** (sin código de producción). El bloque inviable de la card de estrategia hoy muestra **a la vez** el diagnóstico, el pago extra, renegociar y consolidar: se siente saturado. La Revisión D.7 de [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md) replantea la jerarquía: con el plan inviable, Avalancha y Bola de nieve siguen de protagonistas y, **debajo del detalle**, aparece **un solo botón de alerta** ("🚨 Cuidado: tu plan de pago no se sostiene. Veamos cómo resolverlo") que abre **un panel** con un **selector** de 3 alternativas (Aumentar la cuota · Renegociar · Consolidar) que muestra **una a la vez**. El estado del panel vive en `_uiEstrategia` (no `<details>`, porque la card se re-renderiza por tecla). Decisión clave para D.9: "Aplicar" en "Aumentar la cuota" es **automático** (Finko reparte el extra cubriendo déficits y concentrando el remanente en la mayor tasa, sin preguntar a qué deuda), porque una elección manual mal hecha pierde la intención de Finko. Define los slices D.8 (Sonnet 4.6 - Alto, reorg de UI) y D.9 (Opus 4.8 - Alto, acción aplicable + lógica nueva).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/011-unificacion-simulador-deudas.md` | Nueva sección "Revisión D.7" (jerarquía botón → panel → selector, decisión D.9 de reparto automático, slices D.8/D.9, alternativas y consecuencias). |

---

### feat(tesoreria): modelo de pisos para distribución automática (MC.6a, ADR 013) · 2026-06-29

Primer slice del [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md). Reescribe el modo `auto` de `sugerirDistribucionIngreso` con el modelo de pisos: Necesidades (gastos fijos + cuotas de deuda), Ahorro (fondo → objetivos → base sana 20%), Estilo de vida (residual, piso 10%). Nuevo helper puro `calcularAporteMensualObjetivos`. `view.js` computa 4 nuevos inputs desde S (cuotas, faltante fondo, aporte a objetivos, límites). 16 tests nuevos + 4 actualizados. 1617 → 1633 verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularAporteMensualObjetivos` + `sugerirDistribucionIngreso` reescrita. |
| `modules/dominio/tesoreria/view.js` | 4 nuevos inputs computados desde S. |
| `tests/unit/tesoreria.test.js` | 16 tests nuevos + 4 actualizados + import. |

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
