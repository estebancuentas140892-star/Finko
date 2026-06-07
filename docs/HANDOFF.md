# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-07 (feat(K.4): datos de renta manuales; config.datosFiscales por año; schema v9 → v10; 1129/1129 verde)

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
| Tests unitarios + integración | 1129/1129 verdes (16 nuevos en K.4: datos de renta manuales) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(K.4): datos de renta manuales (3 criterios medibles) · 2026-06-07

Registro manual opcional en Configuración para los 3 criterios de renta que el monitor de K.3 no puede derivar (ingresos brutos, consumos con tarjeta de crédito, consignaciones). Al registrarlos, el monitor de Análisis los mide y deja de mostrar "Sin datos". Valores keados por año (`config.datosFiscales[anio]`): no quedan obsoletos al cambiar de año. Campo vacío = no provisto; un 0 escrito = cero medido. Schema v9 → v10. 1129/1129 tests verdes (16 nuevos).

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | Typedef `DatosFiscalesAnio` + `Config.datosFiscales` (Record por año) + default `{}`. `_version` 9 → 10. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 9 → 10. Migración v9 → v10: añade `config.datosFiscales = {}`, normaliza array corrupto, preserva config previo. |
| `modules/dominio/analisis/logic.js` | `calcularEstadoRenta` lee `config.datosFiscales[anio]`; helpers `provisto`/`valorManual`/`tipManual`; los 3 criterios pasan a medible si hay valor registrado. |
| `modules/dominio/config/view.js` | `_renderDatosRenta()` nueva: sección con 3 inputs numéricos del año. Import de `hoy`. Insertada tras Perfil fiscal. |
| `modules/dominio/config/index.js` | Handler `submit` de `#form-datos-fiscales`: guarda campos no vacíos en `datosFiscales[anio]`, borra la entrada si todos vacíos. Import de `hoy`. |
| `service-worker.js` | v113 → v114. |
| `tests/unit/storage.test.js` | 5 tests de migración v9 → v10. |
| `tests/unit/analisis.test.js` | 11 tests de datos manuales. |
| `tests/unit/state.test.js` | Test de `_version` actualizado de 9 a 10. |

---

### feat(K.3): monitor de topes de renta en Análisis · 2026-06-07

Card "Estado de tu renta" en Análisis: los 5 criterios de obligación de declarar renta con su tope calculado en vivo (`N × UVT`) y el valor actual cuando Finko puede medirlo. Nudges al 80% (cerca) y 100% (supera). Decisión del gap de datos: Opción A (honestidad explícita): solo 2 de 5 criterios son medibles (patrimonio bruto, consumos totales); los otros 3 (ingresos, tarjeta de crédito, consignaciones) muestran tope + badge "Sin datos en Finko". Sin schema changes. 1113/1113 tests verdes (25 nuevos). Sección K completa.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `TOPES_RENTA_UVT` (5 criterios en múltiplos de UVT) + `UMBRAL_ALERTA_RENTA` (0,80). Topes en pesos derivados en vivo de `UVT`. |
| `modules/dominio/analisis/logic.js` | 4 funciones puras: `patrimonioBruto`, `totalGastosAnio`, `calcularEstadoRenta`, `detectarNudgesRenta`. Imports de `calcularTotalInvertido` + constantes. |
| `modules/dominio/analisis/view.js` | `_renderEstadoRenta` + `_renderCriterioRenta` + `_renderNudgeRenta`. Card entre recomendación fiscal y patrimonio. Reusa `.nudge`/`.progress`. |
| `styles/components/analysis.css` | Bloque `.renta-criterios` + `.renta-criterio*` (grid responsive, badges por estado). Solo tokens `--fk-*`. |
| `service-worker.js` | v112 → v113. |
| `tests/unit/analisis.test.js` | 25 tests nuevos (3 patrimonioBruto + 4 totalGastosAnio + 11 calcularEstadoRenta + 7 detectarNudgesRenta). |

---

### feat(K.2): perfil fiscal en Configuración + recomendación en Análisis · 2026-06-07

Schema v8 → v9. Sección "Perfil fiscal" en Configuración con 3 checkboxes opcionales (IVA, contabilidad obligatoria, declarante DIAN). Si alguno está activo: nudge-info permanente en Análisis con enlace a `#config`. Migración idempotente añade `config.perfilFiscal` con todos los flags en false. 1088/1088 tests verdes (4 nuevos).

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | Typedef `PerfilFiscal` + `Config.perfilFiscal` + defaults en `createInitialState()`. `_version` 8 → 9. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 8 → 9. Migración v8 → v9: añade `config.perfilFiscal` preservando datos existentes. |
| `modules/dominio/config/view.js` | `_renderPerfilFiscal()` nueva: sección con 3 checkboxes + botón guardar. Se inserta entre "Tu perfil" y "Apariencia". |
| `modules/dominio/config/index.js` | Handler `submit` para `#form-perfil-fiscal`: actualiza `S.config.perfilFiscal.*` + `save()` + `renderPanelConfig()`. |
| `modules/dominio/analisis/view.js` | `_renderRecomendacionFiscal()` nueva: nudge-info con motivos fiscales + link a Config. Insertada entre Score y Patrimonio. |
| `service-worker.js` | v111 → v112. |
| `tests/unit/storage.test.js` | 4 tests nuevos: migración v8 → v9. |
| `tests/unit/state.test.js` | Test de `_version` actualizado de 8 a 9. |

---

### feat(K.1): asistencia 4x1000 (GMF) · 2026-06-07

Indicador de costo GMF del mes en Tesorería + nudge preventivo con sugerencia de exención. Sin schema changes. El formulario ya tenía el checkbox; se mejoró el hint con contexto de exenciones (nómina, AFC). 1084/1084 tests verdes (12 nuevos).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularCostoGMF(gastos, cuentas, anio, mes)` y `detectarNudgeGMF(gmfData)` exportadas. Import de `GMF` desde `constants.js`. |
| `modules/dominio/tesoreria/view.js` | `renderGMFIndicador()` exportada + `_renderNudgeGMF()` privada. Import de `hoy` y las 2 funciones nuevas de logic.js. Hint del formulario actualizado con mención de cuentas exentas (nómina, AFC). |
| `modules/dominio/tesoreria/index.js` | Import de `renderGMFIndicador`. `_renderTodo()` llama `renderGMFIndicador()` tras `renderListaCuentas()`. |
| `index.html` | `<div id="tesoreria-gmf">` entre `#lista-tesoreria` y el simulador laboral. |
| `service-worker.js` | v110 → v111. |
| `tests/unit/tesoreria.test.js` | 12 tests nuevos: 8 para `calcularCostoGMF` + 4 para `detectarNudgeGMF`. |

---

### docs(roadmap): plan de Asistencias Inteligentes (K.1-K.3) · 2026-06-07

Análisis de los indicadores financieros colombianos disponibles (UVT, SMMLV, GMF, topes de renta) y documentación del plan por fases en `ROADMAP.md`. Sección K con 3 etapas: K.1 (4x1000 con datos ya existentes, sin schema changes), K.2 (perfil fiscal: 3 preguntas opcionales + schema v8→v9), K.3 (monitor de los 5 topes de renta: aggregator YTD + detector + card, requiere K.2 y decisión sobre el gap de tarjetas de crédito). Detecta discrepancia en el CSV de referencia: patrimonio bruto calculado con UVT 2025 ($49.799), no 2026 ($52.374); confirma que derivar de `N × UVT_VIGENTE` en código es más robusto que hardcodear pesos. Test count corregido en ROADMAP y HANDOFF: 1078 → 1072.

**Archivos:** `docs/ROADMAP.md` (sección K nueva + Estado actual + test count + Métricas), `docs/HANDOFF.md`, `docs/CHANGELOG.md`, `docs/TASKS.md`.

---

### refactor(legal): eliminar la tasa de usura (ADR 004) · 2026-06-07

Decisión de producto: dejar de rastrear la tasa de usura (certificación trimestral de la SFC, exigía 4 actualizaciones al año para alimentar un solo hint). Se enfoca el mantenimiento en indicadores anuales (SMMLV, UVT, auxilio) y estables (GMF). Refina el ADN regla #12. 1072/1072 tests verdes (se eliminaron los 6 tests de `clasificarTasaCredito`).

**Archivos:** `docs/DECISIONS/004-eliminar-tasa-usura.md` (ADR nuevo), `modules/core/constants.js` (tabla `USURA_POR_PERIODO`, `tasaUsuraVigente()`, exports `TASA_USURA`/`PERIODO_USURA`/`TASA_USURA_Q2_2026` eliminados), `modules/infra/financiero.js` (`clasificarTasaCredito()` + import eliminados), `modules/dominio/compromisos/views/formularios.js` (hint de entidad reescrito: ya no menciona la usura, orienta dónde encontrar la tasa EA), `tests/unit/calculadoras.test.js` (bloque de 6 tests eliminado), `CLAUDE.md` (regla #12), `service-worker.js` (v109 → v110).

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Fase activa:** ninguna. Sección K (Asistencias Inteligentes) cerrada completa: K.1 4x1000, K.2 perfil fiscal, K.3 monitor de renta, K.4 datos de renta manuales.

**Próxima tarea natural:** sin fase activa. Candidatas opcionales abajo (A.5 dominio custom cuando haya dominio registrado, E.2 SMMLV/UVT 2027 en enero). El monitor de renta ya permite registrar los 3 criterios no derivables; no hay deuda pendiente conocida en la sección K.

**Otras opciones:**
- **A.5 - Dominio custom** cuando el usuario tenga un dominio registrado.
- **E.2 - SMMLV + UVT 2027** en enero 2027 (~15 min, Haiku).

**Estado base:** App en producción estable (`https://finko-brown.vercel.app`).

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

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
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
tests/e2e/   → smoke tests (Playwright) - 57 tests
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # 1129 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
