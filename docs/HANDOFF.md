# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-08 (fix(nav): "Ir a Mis cuentas" ahora navega + card de "gastos por organizar"; 1132/1132 verde)

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
| Tests unitarios + integración | 1132/1132 verdes (+9 tests de pendientes por organizar) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(nav): el botón "Ir a Mis cuentas" del modal de gasto ahora navega · 2026-06-08

Primera corrección de un paquete de mejoras de navegación + gestión de gastos fijos pedido por el usuario. En Gastos, al abrir el modal de gasto sin cuentas, el botón "Ir a Mis cuentas" solo cerraba el modal sin navegar. Causa: `dispatch()` en `actions.js` hace `e.preventDefault()` para toda `data-action`, cancelando la navegación del `<a href="#tesoreria" data-action="modal-close">`. Fix: acción reutilizable `ir-a-seccion` (cierra modal + navega), que servirá para los CTA "redirigir a Mis cuentas" de los próximos flujos. SW v122 → v123. 1132/1132 verdes. **Pendiente del paquete:** gestión de gastos fijos (Editar/Eliminar/"Marcar pagado este mes") + helper de selección inteligente de cuenta (0→Mis cuentas, 1→automática, varias→selector), a aplicar en todos los flujos que descuentan dinero.

| Archivo | Cambio |
|---|---|
| `modules/ui/actions.js` | Nueva acción `ir-a-seccion`: cierra el modal abierto y `navigate(destino)` (de `data-target` o del hash del `href`). Import de `navigate`. |
| `modules/dominio/gastos/view.js` | El botón "Ir a Mis cuentas" del empty state usa `data-action="ir-a-seccion"`. |
| `service-worker.js` | v122 → v123. |

---

### feat(gastos): card de "gastos por organizar" en el dashboard (Fase 1) · 2026-06-08

Primera fase de una mejora de UX en 3 fases pedida por el usuario. Los gastos creados con "Gasto rápido" quedan con `pendienteCompletar: true` (sin descripción ni categoría). Antes solo se veían como badges por ítem en la lista de Gastos; ahora el dashboard muestra un recordatorio agregado tipo nudge: "Tienes N gastos por organizar", con botón "Organizar" que lleva a Gastos. Cuenta los pendientes de todos los meses (uno sin organizar no debe perderse al cambiar de mes) y, si no hay, no muestra nada (cero ruido). Reutiliza el componente `.nudge nudge-info` existente: sin CSS nuevo. Verificado en la app con el preview (5 pendientes → card visible, CTA navega a #gast). SW v121 → v122. 1132/1132 tests verdes (+9). **Pendientes: Fase 2** (cuenta de origen en el gasto rápido, con autoselección si hay 1 cuenta y picker si hay varias, + bloqueo guiado sin cuentas) **y Fase 3** (revisión transversal de todos los flujos de captura).

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | `esGastoPendiente(gasto)` y `gastosPendientes(gastos)` nuevas (puras): misma regla que el badge "📝 Pendiente" para que conteo y marca coincidan. |
| `modules/dominio/gastos/view.js` | `renderPendientesOrganizar()` nueva: escribe en `#panel-gastos-pendientes` un nudge con el conteo; vacío si no hay pendientes. Import de `gastosPendientes`. |
| `index.html` | Nuevo `<div id="panel-gastos-pendientes">` en el dashboard, tras `#panel-prioridades`. |
| `modules/dominio/gastos/index.js` | Import `registrarRender` + `renderPendientesOrganizar`. Registro en `renderAll` (boot) y llamada en el handler `state:change` de gastos. |
| `tests/unit/gastos.test.js` | 9 tests nuevos: `esGastoPendiente` (5) y `gastosPendientes` (4). |
| `service-worker.js` | v121 → v122. |

---

### fix(sw): eliminar recarga automática que interrumpía el onboarding en móvil · 2026-06-08

Bug reportado en móvil: al ingresar por primera vez y escribir el nombre, la página se recargaba sola a los pocos segundos y se perdía lo escrito. Causa raíz: `sw-register.js` recargaba la página en `controllerchange`, y el SW usaba `skipWaiting()` + `clients.claim()`. En la PRIMERA visita (sin SW previo), cuando el SW recién instalado hacía `clients.claim()`, el controlador pasaba de null a SW y `controllerchange` se disparaba, recargando justo durante el onboarding (los "pocos segundos" = tiempo de cachear `CORE_ASSETS`). Footgun clásico de claim + reload-on-controllerchange. Descartados otros sospechosos: no hay listeners de focus/blur/visibilitychange, `loadData()` solo corre una vez, los re-render son scoped por sección (`renderSmart`) y nunca tocan modales. Fix: quitar `skipWaiting()` del SW (una versión nueva queda en "waiting" y se aplica en la próxima apertura, sin recargar en caliente) y eliminar el listener de `controllerchange → reload()`. Offline-first intacto. SW v120 → v121. 1123/1123 tests verdes.

| Archivo | Cambio |
|---|---|
| `service-worker.js` | Eliminar `self.skipWaiting()` del handler `install` (con comentario explicando por qué). Refinar comentario de `clients.claim()` en `activate`. CACHE_NAME v120 → v121. |
| `modules/infra/sw-register.js` | Eliminar el listener `controllerchange` + `window.location.reload()` + flag `_ya_recargado`. La versión nueva se aplica sola en la próxima apertura limpia. Comentario explicando el bug evitado. |

---

### refactor(P4): eliminar dialogo() muerta · 2026-06-08

Cuarto y último hallazgo de auditoría. Función `dialogo()` en `modules/infra/utils.js` era un wrapper temporal alrededor de `window.confirm()` / `window.alert()`. Fue completamente reemplazada por `confirmar()` modal en `ui/confirm.js`. Nadie la importaba. Eliminada la función (~15 líneas), su docstring, y sus 3 tests en `utils.test.js`. También removidos los imports `vi`, `beforeEach`, `afterEach` que solo se usaban para esos tests. **Auditoría integral completada**: app 100% lint verde, cero inconsistencias de UX, código limpio. SW v120. 1123/1123 tests verdes (-3 tests eliminados, sin cambios en funcionalidad).

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | Eliminar bloque de comentario + función `dialogo()` (~15 líneas). Actualizar docstring: quitar menciones a `dialogo` y "sin DOM". |
| `tests/unit/utils.test.js` | Eliminar import `dialogo`. Eliminar bloque `describe('dialogo()...')` (3 tests, 26 líneas). Eliminar imports `vi`, `beforeEach`, `afterEach` (ahora sin uso). |
| `service-worker.js` | v120 (sin cambio, SW cacheado). |

---

### fix(P3): lint 100% verde (globals, imports sin usar, var→let) · 2026-06-08

Tercera tarea de la auditoría. ESLint mostraba 16 errores: 6 globals faltantes en config, 4 imports sin usar, 3 `var` innecesarios. Todos mecánicos, sin lógica. Agregar a `eslint.config.js`: `queueMicrotask`, `HTMLInputElement`, `CSS`, `Event`, `history`, `caches`. Eliminar imports: `resetModal` en `compromisos/index.js`, `aplicarGastoASaldo`/`revertirGastoDeSaldo` en `gastos/index.js`, `hoy`/`totalGastosMes` en `gastos/view.js`, `f` en `tesoreria/index.js`. Cambiar `var` a `let`/`const` en `sw-register.js` (3 líneas). 1126/1126 tests verdes (sin cambios).

| Archivo | Cambio |
|---|---|
| `eslint.config.js` | Agregar 6 globals: `queueMicrotask`, `HTMLInputElement`, `CSS`, `Event`, `history`, `caches`. |
| `modules/dominio/compromisos/index.js` | Eliminar `resetModal` del import de `modales.js`. |
| `modules/dominio/gastos/index.js` | Eliminar `aplicarGastoASaldo`, `revertirGastoDeSaldo` del import de `logic.js`. |
| `modules/dominio/gastos/view.js` | Eliminar `hoy` del import de `utils.js`; eliminar `totalGastosMes` del import de `logic.js`. |
| `modules/dominio/tesoreria/index.js` | Eliminar `f` del import de `utils.js`. |
| `modules/infra/sw-register.js` | Cambiar `var _hostname` → `const`, `var _esDesarrollo` → `const`, `var _ya_recargado` → `let`. |

---

### refactor(L.4): eliminar "Simular crédito"; alerta automática de cuota insuficiente · 2026-06-07

Fase L.4 de la auditoría. La herramienta manual "Simular un crédito" (formulario en `#sec-compromisos`) se elimina. En su lugar, al guardar una deuda con tasa y cuota, Finko calcula el interés mensual (`saldo * tasaMensual`) y muestra un `confirmar()` si la cuota no cubre ni los intereses (la deuda crecer en vez de bajar). El usuario puede confirmar y registrarla igual (el registro de la realidad es válido). Nueva función pura `detectarDeudaCreciente(datos)` en `logic.js`, 10 tests nuevos. SW v117 → v118. 1105/1105 tests verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | `detectarDeudaCreciente(datos)` nueva: compara cuota vs interés mensual (EA o mensual). Devuelve `{ interesMensual, cuotaMensual, deficit }` o null. |
| `modules/dominio/compromisos/index.js` | Import `calcularCredito, validarCampos` de `financiero.js` eliminado. `detectarDeudaCreciente` agregado al import de `logic.js`. `_guardarCompromiso` hecha async: llama `detectarDeudaCreciente` y `confirmar()` si hay alerta. `_onSubmitHerramientaCredito` + su binding eliminados. |
| `index.html` | Bloque `<details id="herramienta-credito">` y su comentario eliminados (31 líneas). |
| `tests/unit/compromisos.test.js` | `detectarDeudaCreciente` agregado al import. 10 tests nuevos en bloque `describe`. |
| `service-worker.js` | v117 → v118. |

---

### refactor(L.3): Regla del 72 convertida en insight pasivo en Inversión · 2026-06-07

Fase L.3 de la auditoría. La calculadora "¿En cuántos años duplico mi dinero?" se elimina como herramienta de botón. Su insight se convierte en texto pasivo dentro de la card "Proyección al vencimiento" del dominio Inversión: "⚡ A esta tasa, tu dinero se duplica en ~N años." El valor de N se calcula automáticamente con `calcularRegla72(tasaPromedioPonderada)`. Solo aparece cuando hay holdings proyectables (con tasa EA y plazo definidos). SW v116 → v117. 1095/1095 tests verdes.

| Archivo | Cambio |
|---|---|
| `modules/dominio/inversiones/view.js` | Import `calcularRegla72` agregado. Función privada `_renderInsightR72(tasaNominalPct)` nueva. Llamada desde `_renderProyeccion` cuando `real` no es null. |
| `styles/components/analysis.css` | `.inversion-proy__r72` nuevo: texto sm, color secondary, fondo elevated, radius sm. |
| `index.html` | Bloque `<details id="herramienta-r72">` y su comentario eliminados de `#sec-analisis`. |
| `modules/dominio/analisis/index.js` | Import completo de `financiero.js` eliminado. Función `_onSubmitHerramientaR72`, su binding y el bloque `HERRAMIENTAS INLINE` eliminados. Archivo queda limpio: solo re-render reactivo. |
| `service-worker.js` | v116 → v117. |

---

### refactor(L.2): eliminar calculadoras redundantes (CDT, interés compuesto, rentabilidad real) · 2026-06-07

Fase L.2 de la auditoría. Las 3 calculadoras manuales cuyos cálculos ya realiza el dominio Inversión en automático (al registrar un CDT, una inversión o ver el portafolio) se eliminan como herramientas-inline. Las funciones `calcularCDT`, `calcularInteresCompuesto` y `calcularRentabilidadReal` se conservan en `financiero.js`: las usa `inversiones/logic.js`. SW v115 → v116. 1095/1095 tests verdes (sin cambio de count: los tests de las funciones se quedan porque las funciones se quedan).

| Archivo | Cambio |
|---|---|
| `index.html` | 3 bloques `<details>` eliminados: `herramienta-cdt`, `herramienta-ic`, `herramienta-rentabilidad` (~80 líneas). |
| `modules/dominio/metas/index.js` | Imports `calcularCDT`, `calcularInteresCompuesto`, `validarCampos`, `f` eliminados. Funciones `_onSubmitHerramientaCDT`, `_onSubmitHerramientaIC` y sus bindings eliminados. |
| `modules/dominio/analisis/index.js` | Import `calcularRentabilidadReal` y `f` eliminados. Función `_onSubmitHerramientaRentabilidad` y su binding eliminados. Regla 72 intacta (L.3). |
| `service-worker.js` | v115 → v116. |

---

### refactor(L.1): eliminar simulador laboral · 2026-06-07

Fase L.1 de la auditoría de calculadoras: eliminación completa del simulador laboral de la sección Mis cuentas. Razón: fuera del alcance de finanzas personales (es una herramienta de RRHH). También se eliminaron las 4 funciones laborales de `financiero.js` (prima, PILA, aportes empleado, cesantías), las 8 constantes laborales de `constants.js` (FSP_TRAMOS, SALUD_INDEPEND/EMPLEADO, PENSION_INDEPEND/EMPLEADO, INTERESES_CESANTIAS, ARL_CLASE_I, DIAS_PRIMA) y el CSS `sim-gate`. La lógica de otras calculadoras (CDT, interés compuesto, regla 72, rentabilidad real) y las funciones que usa Inversión quedan intactas. SW v114 → v115. 1095/1095 tests verdes (34 removidos).

| Archivo | Cambio |
|---|---|
| `index.html` | Bloque `<details id="simulador-laboral">` eliminado (88 líneas HTML). |
| `modules/dominio/tesoreria/index.js` | 5 imports de `financiero.js` eliminados. 4 funciones laborales + llamada `_initSimuladorLaboral()` eliminadas (~170 líneas). |
| `modules/infra/financiero.js` | Todo el bloque de imports de `constants.js` eliminado. 4 funciones exportadas + helper `_tasaFSP` eliminados (~190 líneas). Docstring actualizado. |
| `modules/core/constants.js` | 8 constantes laborales eliminadas: `DIAS_PRIMA`, `SALUD_INDEPEND`, `PENSION_INDEPEND`, `SALUD_EMPLEADO`, `PENSION_EMPLEADO`, `FSP_TRAMOS`, `INTERESES_CESANTIAS`, `ARL_CLASE_I`. |
| `tests/unit/calculadoras.test.js` | 4 bloques de tests laborales eliminados (34 tests: prima, PILA, aportes empleado, cesantías). Imports de constantes laborales eliminados. |
| `styles/components/domain.css` | Bloque CSS `sim-gate` + `sim-profile-fields` eliminado (~70 líneas). |
| `styles/components.css` | Comentario del barrel actualizado (sim-gate → herramienta-inline). |
| `service-worker.js` | v114 → v115. |


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

**Fase activa:** Auditoría integral completada. 4 hallazgos (P1 a P4) todos cerrados. App 100% lint verde, 1123/1123 tests verdes, cero inconsistencias de UX.

**Próxima tarea natural:** A.5 (dominio custom) o E.2 (SMMLV + UVT 2027, enero 2027). Usuario ya tiene dominio registrado para A.5.

**Otras opciones:**
- **A.5 - Dominio custom** deploy en dominio propio. No requiere código. Ver guía en `docs/SETUP_DOMINIO.md`.
- **E.2 - SMMLV + UVT 2027** en enero 2027 (~15 min, Haiku): búsqueda de valores oficiales y actualización de `LEGAL_POR_ANIO` en `constants.js`.

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
pnpm test                     # 1105 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
