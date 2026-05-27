# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-05-27 (refactor: Compromisos - chooser entidad/personal, lista única reordenable - Tarea 3 cerrada)

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
| Tests unitarios + integración | 926/926 verdes |
| Tests E2E | 18/18 humo + suite completa |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### refactor(compromisos) - Chooser entidad/personal + lista única reordenable · 2026-05-27
Rediseño del flujo "Nueva deuda" y eliminación de la lista duplicada en la card de estrategia. Responde a 4 puntos de feedback del usuario.

**Cambios clave:**
- **Modal 2 pasos:** click "+ Nueva deuda" → chooser (🏦 Entidad / 🤝 Personal con descripción de cada tipo). Click en uno → form tailored con campos y labels específicos. Botón "← Volver" regresa al chooser. Título del modal se actualiza dinámicamente.
- **Forms tailored:** Entidad muestra tasa EA obligatoria con referencia a la usura vigente. Personal muestra tasa mensual opcional con hint de gota a gota. Ambos tienen `tipo` en hidden field (sin select visible al usuario).
- **Lista única:** eliminado el `<ol class="estrategia-card__orden">` de dentro de la card de estrategia. Solo existe `#lista-compromisos` con badges 1°, 2°, 3°. Clickear Avalancha/Bola de nieve reordena esa lista de forma visible.
- **El "bug" de estrategia era percepción:** la lógica de reordenamiento siempre funcionó. Con la lista duplicada el cambio era confuso; ahora con lista única el efecto es obvio.
- **`service-worker.js`:** v62 → v63.

**Archivos:** `compromisos/view.js` (nuevo `renderChooserCompromiso`, `renderFormDeuda(tipo)`, `renderEstrategiaPago` sin ol), `compromisos/index.js` (handlers chooser: `_mostrarChooser`, `_elegirTipoDeuda`, `_volverChooser`; acciones `comp-elegir-tipo`, `comp-volver-chooser`), `styles/components.css` (`.comp-chooser`, `.comp-chooser__btn`, `.comp-chooser__label`, `.comp-chooser__desc`).

**Tests:** 926/926 verdes (sin tests nuevos: UI pura, sin lógica de negocio nueva).

### feat(agenda) - Botón "+ Agregar gasto fijo" en Agenda · 2026-05-27
Cierre de Tarea 2 después del rediseño v6 de Compromisos. La sección Agenda recibe el punto de entrada para crear `tipo='fijo'`.

**Cambios clave:**
- **`index.html`:** botón "+ Agregar gasto fijo" en header de `#sec-agenda` + nuevo `#modal-gasto-fijo`. Modal de Compromisos renombrado a "Nueva deuda" (alineado con v6).
- **`modules/dominio/agenda/view.js`:** nueva función `renderFormGastoFijo()` con 4 campos visibles (descripcion, monto, frecuencia, día) + hidden `tipo=fijo`.
- **`modules/dominio/agenda/index.js`:** handlers `_nuevoGastoFijo` / `_guardarGastoFijo`. Reusa `validarCompromiso` y `normalizarCompromiso` de `compromisos/logic.js` (puras). Reinyecta el form en cada apertura para evitar bug de `resetModal` con hidden + `<select selected>`.
- **`service-worker.js`:** v61 → v62.

**Bug encontrado:** `resetModal` vacía el hidden `tipo` y el `selected` de Mensual. Workaround local: reinyectar el form al abrir, sin tocar `modales.js`.

**Tests:** 926/926 verdes (lógica reusada ya cubierta).

**Próxima sesión:** rediseño de **Compromisos** según feedback del usuario (4 puntos):
1. Modal "+ Nueva deuda" → primero chooser (🏦 Entidad / 🤝 Personal), luego form específico por tipo.
2. Forms separados con campos y ayuda tailored.
3. Eliminar lista duplicada (`<ol>` interno de estrategia + `#lista-compromisos`): que quede una sola que se reordene al clickear avalancha/bola de nieve.
4. Verificar bug reportado de avalancha/bola de nieve con caso "1 deuda con interés + 1 sin interés".

### refactor(compromisos) - Rediseño v6: solo deudas (entidad / personal) + estrategia arriba · 2026-05-27
Rediseño completo del dominio Compromisos a partir del feedback del usuario.

**Cambios clave:**
- **Schema v5 → v6 con migración:** `deuda` → `deuda-entidad` (preserva tasa EA); `agenda` → `fijo` Única vez. Nuevos campos para deudas: `saldoTotal`, `cuotaMensual`, `tasa`, `tasaUnidad` ('EA' o 'mensual').
- **Sección Compromisos = solo deudas.** El form crea Deuda con entidad (banco/tarjeta, tasa EA obligatoria) o Deuda personal (familiar/gota a gota, tasa opcional en % mensual).
- **Estrategia arriba:** Avalancha / Bola de Nieve define el orden de pago. La lista debajo muestra cada deuda con badge 1°, 2°, 3°… según la estrategia activa.
- **Avalancha se deshabilita** si no hay ninguna deuda con tasa > 0 (no aporta info).
- **Eliminado el nudge superior** "1 pago vence en X días" porque ya vive en el Dashboard (Próximas prioridades + Vencidos).
- **Cross-domain:** `analisis::calcularPasivos`, `tesoreria::distribución prima`, `detectarDeudasDurmiendo` adaptados al nuevo modelo.

**Pendiente próxima sesión (Tarea 2):** mover el botón "+ Agregar gasto fijo" a la sección Agenda con form simplificado. Los `tipo='fijo'` ya conviven en `S.compromisos`; solo falta el punto de entrada en Agenda.

**Archivos principales:** `state.js`, `storage.js`, `compromisos/{logic,view,index}.js`, `analisis/logic.js`, `tesoreria/view.js`, `form-errors.js`, `index.html`, `styles/components.css`, tests de storage/state/compromisos/analisis.

**Tests:** 926/926 verdes (+4 por la migración).
**Service Worker:** v60 → v61.

### fix(dash) - Vencidos no marca recién creados + re-render desde compromisos · 2026-05-26
Dos bugs sobre el dashboard nuevo:

**#1** Compromiso recién creado con día de pago anterior a hoy aparecía como vencido
(ej. hoy 26, diaPago=15 → "venció hace 11 días"). Solución: `detectarVencidosCompletos`
y `detectarFijosSinPagarEsteMes` ahora miran `fechaCreacion` y excluyen los items
creados este mes después de su día de pago. Su próximo ciclo real es el mes siguiente.

**#2** Al crear/editar/eliminar un compromiso desde la sección Compromisos, el dashboard
no se actualizaba (solo se llamaba `_renderTodo`). Solución: `state:change` también
dispara `renderSmart(_renderDashboardPanels, 'dash')`.

**Archivos:**
- `modules/dominio/compromisos/logic.js`: regla anti-falso-positivo con `fechaCreacion`
  en `detectarVencidosCompletos` y `detectarFijosSinPagarEsteMes`.
- `modules/dominio/compromisos/index.js`: re-render de paneles dashboard en `state:change`.
- `tests/unit/compromisos.test.js`: +5 tests.
- `service-worker.js`: v59→v60.

**Tests:** 920/920 verdes (+5).

### refactor(dash) - Dashboard acción-orientado: Vencidos + Próximas Prioridades · 2026-05-26
Rediseño del dashboard para mostrar **solo** información de acción inmediata.

**Eliminado:** bento de Ingresos del mes, Gastos del mes, Metas activas, Compromisos
activos, Me deben (contadores genéricos sin contexto). Card Hoy (fusionada con
Próximas Prioridades para eliminar redundancia).

**Agregado:**
- `#panel-vencidos`: compromisos cuyo día de pago ya pasó (fijos + deudas + agenda).
  Hasta 3 visibles, resto con scroll vertical interno (max-height). Severidad por
  color de borde izquierdo (leve/moderada/urgente).
- `#panel-prioridades`: próximos 7 días agrupados por día (HOY destacado en
  accent, Mañana, En N días). Reemplaza Card Hoy.
- `.balance-tira`: tira simple con Balance del mes (único indicador combinado
  que queda en dashboard). Color por signo.

**Archivos:**
- `modules/dominio/compromisos/logic.js`: + `detectarVencidosCompletos(comp, hoyISO)`
  (los 3 tipos) + `agruparPorDiasRestantes(proximos)`
- `modules/dominio/compromisos/view.js`: + `renderPanelVencidos()` + `renderPanelPrioridades()`
  + `_hoyISOLocal()` (fix de timezone para que "venció hoy" cuente día local, no UTC)
- `modules/dominio/compromisos/index.js`: import de `registrarRender` y los nuevos renders;
  `registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'))`; hashchange a 'dash'
- `modules/dominio/agenda/view.js`: eliminada `renderCardHoy()` y sus imports
- `modules/dominio/agenda/index.js`: removido import de `registrarRender` y `renderCardHoy`
- `index.html`: `#sec-dash` reestructurado (hero solo, panel-vencidos, panel-prioridades,
  balance-tira); eliminados `#panel-hoy` y bento completo (`#bento-dash`)
- `styles/components.css`: + `.vencidos-card`, `.prioridades-card`, `.balance-tira`,
  `.bento__cell--solo`; eliminado `.hoy-card`
- `service-worker.js`: v58→v59
- `tests/unit/compromisos.test.js`: +14 tests (9 para `detectarVencidosCompletos`,
  5 para `agruparPorDiasRestantes`)

**Tests:** 915/915 verdes (+14).

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
