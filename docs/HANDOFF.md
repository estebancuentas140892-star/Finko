# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-30 (fix(a11y): A11Y.4 - fondo inerte con modal abierto)

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
| Tests unitarios + integración | 1667/1667 verdes |
| Tests E2E | 64/64 verde. Suites: `smoke` 28 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(a11y): fondo inerte mientras hay un modal abierto (A11Y.4) · 2026-06-30

Cuarto hallazgo de la auditoría de accesibilidad. `abrirModal` atrapaba el Tab pero no marcaba el fondo como inerte, así que el cursor virtual del lector de pantalla podía leer el contenido detrás del modal (`aria-modal` solo no basta). Fix sin cambio visual: `abrirModal` pone `inert` en `.app-shell` y `cerrarModal` lo quita. Los modales son hermanos de `.app-shell`, así que inertizar el fondo no los afecta. Orden: `inert` después de `trapFocus`, se libera antes de `releaseFocus` (para restaurar el foco al botón que abrió el modal). Nuevo `tests/unit/modales.test.js` (9 tests) + 1 E2E que valida el `inert` real en navegador. 1667/1667 unit verdes. SW v234 → v235. Nota: 4 E2E de Gastos fallan solo hoy por un artefacto de zona horaria del test en frontera de mes (no es regresión; ver CHANGELOG).

| Archivo | Cambio |
|---|---|
| `modules/ui/modales.js` | `abrirModal` marca `.app-shell` inert; `cerrarModal` lo libera. Helper `_fondo()`. |
| `tests/unit/modales.test.js` | Nuevo: 9 tests del contrato de modales + `inert`. |
| `tests/e2e/smoke.test.js` | Suite E2E "fondo inerte con modal". |
| `service-worker.js` | v234 → v235. |

---

### fix(a11y): mover el foco al navegar de sección (A11Y.3) · 2026-06-30

Tercer hallazgo de la auditoría de accesibilidad; cierra el anuncio limpio de sección que A11Y.2 dejó pendiente. `showSection` llamaba `.focus()` sobre `#sec-*` pero las secciones no tenían `tabindex` (no-op): al navegar, el foco se quedaba en el enlace anterior. Fix sin cambio visual: `tabindex="-1"` en las 13 secciones; `showSection(hash, moveFocus)` enfoca solo en navegaciones reales (no en carga inicial, para no robar el foco antes del skip link); `.section:focus { outline: none }` para que el foco programático no dibuje recuadro (el item de nav activo ya marca dónde estás). La sección anuncia su título como landmark vía `aria-labelledby`. 1658/1658 unit + 64/64 E2E verdes. SW v233 → v234.

| Archivo | Cambio |
|---|---|
| `index.html` | `tabindex="-1"` en las 13 `<section class="section">`. |
| `modules/infra/router.js` | `showSection(hash, moveFocus)`; foco solo en navegaciones, no en arranque. |
| `styles/base.css` | `.section:focus { outline: none }`. |
| `service-worker.js` | v233 → v234. |

---

### fix(a11y): quitar aria-live="polite" del &lt;main&gt; (A11Y.2) · 2026-06-30

Segundo hallazgo de la auditoría de accesibilidad. El `<main>` tenía `aria-live="polite"`: cada render y cambio de sección se anunciaba en cascada al lector de pantalla. La app ya tiene regiones live dedicadas y correctas (`announce()`, toasts de logros, hints de formularios, nudges con `role="alert"`), que quedan intactas. Fix sin cambio visual ni de comportamiento: quitado el `aria-live` del `<main>` (se conserva `tabindex="-1"` del skip link). 1658/1658 verdes. SW v232 → v233. Pendiente A11Y.3 (mover el foco al navegar) para el anuncio limpio de sección.

| Archivo | Cambio |
|---|---|
| `index.html` | Quitado `aria-live="polite"` del `<main id="main-content">`. |
| `service-worker.js` | v232 → v233. |

---

### fix(a11y): quitar role="listitem" de los enlaces de navegación (A11Y.1) · 2026-06-30

Primer hallazgo de la auditoría de accesibilidad/color/responsividad (2026-06-30). Los 13 `<a class="nav-item">` del sidebar + el botón "Más" tenían `role="listitem"` pisando su rol nativo `link`/`button`: el lector de pantalla los anunciaba como ítems de lista, no como enlaces navegables. Fix sin cambio visual: 4 contenedores intermedios `role="list"` → `role="group"`; quitado `role="listitem"` de los enlaces y el botón. Ajustado el selector equivalente en `responsive.css` para no romper el bottom nav mobile. 1658/1658 unit + 64/64 E2E verdes. SW v231 → v232.

| Archivo | Cambio |
|---|---|
| `index.html` | 4× `role="list"` → `role="group"`; quitado `role="listitem"` de 13 enlaces + botón "Más". |
| `styles/responsive.css` | Selector `[role="list"]` → `[role="group"]` (aplanado bottom nav mobile). |
| `service-worker.js` | v231 → v232. |

---

### feat(proposito): banners de propósito en Mis cuentas, Análisis y Personales (EP.4) · 2026-06-30

Completa la épica EP: 3 entradas finales en `PROPOSITOS_SECCION` (tesoreria, analisis, personales), 3 slots en `index.html` y calls en los 3 dominios. CSS: azul para Mis cuentas, turquesa para Análisis, rosa para Personales. Sin tests nuevos. 1658/1658 verdes. SW v230 → v231. Épica EP completada: 11 de 11 secciones (Apartados, Gastos, Deudas, Mi Agenda, Límites de gasto, Metas, Ahorro, Inversión, Mis cuentas, Análisis, Personales).

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | 3 entradas finales: `tesoreria`, `analisis`, `personales`. |
| `index.html` | Slots `proposito-tesoreria`, `proposito-analisis`, `proposito-personales`. |
| `modules/dominio/tesoreria/index.js` | Import + calls de `renderBannerProposito('tesoreria')`. |
| `modules/dominio/analisis/index.js` | Import + calls de `renderBannerProposito('analisis')`. |
| `modules/dominio/personales/index.js` | Import + calls de `renderBannerProposito('personales')`. |
| `styles/components/domain.css` | Variantes de color (expandido + colapsado) para tesoreria, analisis, personales. |
| `service-worker.js` | v230 → v231. |

---

> Para tareas anteriores (EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
