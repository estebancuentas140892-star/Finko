# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-09 (M.3 revisión transversal de captura: UI de ingresos recurrentes + cuenta de origen en abonos a metas; 1164/1164 verde)

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
| Tests unitarios + integración | 1164/1164 verdes (+17 tests M.3: 13 ingresos tesorería, 4 selector de cuenta en abono a meta) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(M.3): revisión transversal de flujos de captura (ingresos recurrentes + cuenta en abono a meta) · 2026-06-09

Tercera fase del plan de captura de datos. Se mapearon los seis flujos de captura (gasto completo, gasto rápido, ingreso, cuenta, deuda, meta) y se cerraron las dos brechas detectadas:

1. **No existía UI para fuentes de ingreso recurrentes.** `S.ingresos[]` nunca se poblaba: el array siempre estaba vacío, `estimarSalarioMensual()` devolvía 0 y el nudge de tasa de ahorro en Ahorro nunca aparecía. Ahora la sección "Mis cuentas" tiene una subsección **"Mis ingresos"** con su propio botón "+ Ingreso", lista de fuentes activas (descripción, frecuencia, monto) y modal de alta/edición (descripción, monto, frecuencia). CRUD completo sobre `S.ingresos` con validación.
2. **El abono a una meta no pedía cuenta de origen.** El dinero "aparecía" en la meta sin salir de ninguna cuenta. Ahora el modal de abono incluye selector de cuenta con el mismo patrón de M.2 (0 cuentas → sin selector, el abono sigue válido como seguimiento; 1 cuenta → autoselección con hint; varias → selector obligatorio). Al confirmar, el monto se descuenta del saldo de la cuenta elegida.

SW v125 → v126. 1164/1164 tests verdes (+17).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `validarIngreso(datos)` y `normalizarIngreso(datos)` nuevas (puras). Import de `FRECUENCIAS`. |
| `modules/dominio/tesoreria/view.js` | `renderListaIngresos()`, `renderFormIngreso(ingreso?)` y helpers de item/empty-state nuevos. Import de `FRECUENCIAS`. |
| `modules/dominio/tesoreria/index.js` | Handlers `_nuevoIngreso`/`_guardarIngreso`/`_editarIngreso`/`_eliminarIngreso`. 3 acciones registradas. `_renderTodo` llama `renderListaIngresos`. EventBus escucha `section === 'ingresos'`. |
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta` inyecta selector de cuenta (`_renderCuentaSelectorAbono`: 0/1/varias). Import de `S`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta` valida cuenta (obligatoria si hay varias) y descuenta saldo via `_ajustarSaldoCuenta` local. |
| `index.html` | Subsección "Mis ingresos" (`#lista-ingresos` + botón) en `#sec-tesoreria`. Nuevo `#modal-ingreso`. |
| `styles/layout.css` | `.section__sub-header`: separador con border-top para subsecciones dentro de una sección. |
| `tests/unit/tesoreria.test.js` | 13 tests: `validarIngreso` (9), `normalizarIngreso` (4). |
| `tests/unit/metas.test.js` | 4 tests: selector de cuenta en `renderFormAbonoMeta` (0/1/inactiva/varias). |
| `service-worker.js` | v125 → v126. |

---

### feat(gastos): M.2 - Gasto rápido con cuenta de origen y descuento de saldo · 2026-06-09

El modal "Gasto rápido" ahora solicita la cuenta de origen desde el inicio (M.2, segunda fase del plan de captura de datos). Tres comportamientos: **0 cuentas activas** → muestra empty state guiado "Primero necesitás una cuenta" con botón "Ir a Mis Cuentas" (igual que el form completo); **1 cuenta activa** → autoselecciona silenciosamente (hint "💳 Sale de: {nombre} · Disponible: {saldo}"); **varias cuentas** → selector visible "¿Desde qué cuenta?". Al confirmar, el monto se descuenta del saldo de la cuenta elegida. El form se inyecta en `#modal-gasto-rapido-body` en cada apertura del modal (como los demás modales del proyecto) para reflejar cambios en S.cuentas. SW v124 → v125. 1147/1147 tests verdes (+5).

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | `normalizarGastoRapido(monto, fecha, cuentaId?)`: tercer parámetro opcional. `validarGastoRapido(monto, cuentaId?, requiereCuenta?)`: valida la cuenta cuando hay varias. |
| `modules/dominio/gastos/view.js` | `renderFormGastoRapido()` nueva: 0 cuentas → empty state; 1 cuenta → hidden input + hint; varias → select visible. |
| `modules/dominio/gastos/index.js` | `_inyectarFormGastoRapido()` nueva (on-demand en cada apertura). `_abrirGastoRapido` llama `_inyectarFormGastoRapido`. `_guardarGastoRapido` toma `cuentaId` del form, valida y descuenta saldo via `_ajustarSaldoCuenta`. Eliminado `_attacharGastoRapido` (form ya no es estático). |
| `index.html` | Body del modal gasto rápido: de estático a `<div id="modal-gasto-rapido-body">` vacío (inyectado por JS). |
| `styles/components/forms.css` | `.quick-add__cuenta-hint`: hint de cuenta auto-seleccionada (fondo elevated, texto xs). |
| `tests/unit/gastos.test.js` | 5 tests nuevos: `validarGastoRapido` con `requiereCuenta` (3), `normalizarGastoRapido` con `cuentaId` (2). |
| `service-worker.js` | v124 → v125. |

---

### feat(agenda): Editar/Eliminar/"Marcar pagado este mes" en gastos fijos + helper de cuenta inteligente · 2026-06-09

Tres acciones nuevas en el detalle del día de la Agenda para gastos fijos (`tipo='fijo'`): **Editar** (abre `modal-gasto-fijo` pre-rellenado, botón "Actualizar"), **Eliminar** (confirmación + elimina el compromiso), y **Marcar pagado este mes** (flujo inteligente de cuenta: 0 cuentas → diálogo guiado + "Ir a Mis Cuentas"; 1 cuenta → autoselección; varias cuentas → picker). Al marcar pagado crea un gasto con `compromisoId` para que el badge "Ya pagaste este mes" aparezca automáticamente. El botón "Marcar pagado" se oculta si ya hay un gasto vinculado este mes (defensa anti-doble clic). El helper `cuenta-helper.js` es reutilizable: se usará en M.2 (gasto rápido) y M.3 (todos los flujos de captura). SW v123 → v124. 1142/1142 tests verdes (+10).

| Archivo | Cambio |
|---|---|
| `modules/infra/cuenta-helper.js` | Nuevo: `resolverCuenta(cuentas, contexto)`: 0→diálogo guiado+navigate, 1→id automático, varias→picker Promise. |
| `modules/dominio/agenda/view.js` | `_renderDetalleItem`: botones Editar/Eliminar/"Marcar pagado" para `tipo='fijo'`; badge "Ya pagaste este mes" (antes decía "abonaste"). |
| `modules/dominio/agenda/index.js` | Handlers: `_editarGastoFijo`, `_eliminarGastoFijo`, `_marcarPagadoGastoFijo`. `_inyectarFormGastoFijo` acepta `compromiso` opcional (modo edición). `_guardarGastoFijo` con rama `editar`/`guardar`. Imports: `editar`, `eliminar`, `hoy`, `f`, `confirmar`, `resolverCuenta`, `updSaldo`. |
| `styles/components/domain.css` | `.cal-detail__actions` (fila de botones en grid-full-width) + `.cuenta-picker__*` (lista de cuentas del picker). |
| `tests/unit/cuenta-helper.test.js` | Nuevo: 10 tests de `resolverCuenta` (0/1/varias cuentas, auto-retorno, picker DOM, Escape). |
| `vitest.config.js` | `cuenta-helper.js` excluido de coverage (DOM-bound, como `a11y.js`). |
| `eslint.config.js` | `KeyboardEvent` agregado a globals (nuevo constructor en tests). |
| `service-worker.js` | v123 → v124. |

---

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

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Fase activa:** Sección M (Captura de datos precisa). M.1, M.1b, M.2 y M.3 completadas. App 1164/1164 tests verdes, lint limpio.

**Próxima tarea natural:** verificar M.3 en la app y, si todo está bien, evaluar la siguiente prioridad del roadmap. Opciones abiertas abajo (A.5 dominio custom, E.2 SMMLV 2027). Si surge una mejora de UX concreta del uso real de ingresos/abonos, priorizarla.

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
pnpm test                     # 1164 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
