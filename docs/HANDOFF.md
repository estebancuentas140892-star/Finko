# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-30 (fix(a11y): A11Y.1 - role="listitem" en enlaces de nav)

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
| Tests unitarios + integración | 1658/1658 verdes |
| Tests E2E | 64/64 verde. Suites: `smoke` 28 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

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

### feat(proposito): banners de propósito en Metas, Ahorro e Inversión (EP.3) · 2026-06-30

Mismo patrón que EP.2. Agrega 3 entradas a `PROPOSITOS_SECCION` (`metas`, `ahorro`, `inversion`), 3 slots en `index.html` y calls en los 3 dominios. CSS: púrpura para Metas, verde menta para Ahorro, azul cian para Inversión. Sin tests nuevos. 1658/1658 verdes. SW v229 → v230.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | 3 entradas nuevas en `PROPOSITOS_SECCION`: `metas`, `ahorro`, `inversion`. |
| `index.html` | Slots `proposito-metas`, `proposito-ahorro`, `proposito-inversion`. |
| `modules/dominio/metas/index.js` | Import + calls de `renderBannerProposito('metas')`. |
| `modules/dominio/ahorro/index.js` | Import + calls de `renderBannerProposito('ahorro')`. |
| `modules/dominio/inversiones/index.js` | Import + calls de `renderBannerProposito('inversion')`. |
| `styles/components/domain.css` | Variantes de color para metas, ahorro, inversion (expandido + colapsado). |
| `service-worker.js` | v229 → v230. |

---

### feat(proposito): banners de propósito en Gastos, Deudas, Agenda y Límites de gasto (EP.2) · 2026-06-30

Reutiliza el helper de EP.1. Agrega 4 entradas a `PROPOSITOS_SECCION` (copy aprobado en ADR 016), 4 slots en `index.html` y llama `renderBannerProposito` en el init y hashchange de cada dominio. CSS: variantes de color por sección (gastos naranja, compromisos rojo, presupuesto amarillo; agenda usa el acento por defecto). Sin tests nuevos: la lógica de `htmlBannerProposito` ya tiene cobertura completa en EP.1. 1658/1658 verdes. SW v228 → v229.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | 4 entradas nuevas en `PROPOSITOS_SECCION`: `gast`, `compromisos`, `agenda`, `presupuesto`. |
| `index.html` | Slots `proposito-gast`, `proposito-compromisos`, `proposito-agenda`, `proposito-presupuesto`. |
| `modules/dominio/gastos/index.js` | Import + calls de `renderBannerProposito('gast')`. |
| `modules/dominio/compromisos/index.js` | Import + calls de `renderBannerProposito('compromisos')`. |
| `modules/dominio/agenda/index.js` | Import + calls de `renderBannerProposito('agenda')`. |
| `modules/dominio/presupuesto/index.js` | Import + calls de `renderBannerProposito('presupuesto')`. |
| `styles/components/domain.css` | Variantes de color para gast, compromisos y presupuesto (expandido + colapsado). |
| `service-worker.js` | v228 → v229. |

---

### feat(proposito): piloto del banner de propósito en Apartados (EP.1) · 2026-06-30

Implementa el patrón definido en [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md). Crea el helper reutilizable `modules/ui/proposito.js` con: `PROPOSITOS_SECCION` (mapa de copy; Apartados en este slice), `htmlBannerProposito(seccion, config)` (función pura: devuelve HTML expandido o colapsado según `S.config.propositoColapsado[seccion]`), `renderBannerProposito(seccion)` (inyecta en `#proposito-{seccion}`), `initBannersProposito()` (registra `colapsar-proposito` y `expandir-proposito`) y `reactivarPropositos()` (restablece todos los banners desde Ajustes). En Apartados: el banner aparece arriba de los nudges con el copy aprobado en EP.0; pulsar "Entendido, ocultar" lo colapsa a una sola línea re-abrible con el título de la sección. La preferencia se persiste en `S.config.propositoColapsado` sin migración (lectura defensiva). Ajustes suma una sección "Mensajes de ayuda" con botón "Mostrar todos los mensajes de ayuda" que solo aparece si al menos un banner está colapsado. 9 unit tests nuevos. 1649 → 1658 verdes. SW v227 → v228.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | Nuevo: `PROPOSITOS_SECCION`, `htmlBannerProposito` (pura), `renderBannerProposito`, `initBannersProposito`, `reactivarPropositos`. |
| `index.html` | `<div id="proposito-apartados">` en `#sec-apartados`, entre el header y `#apartados-nudge-proximos`. |
| `modules/dominio/apartados/index.js` | Import + call de `renderBannerProposito('apartados')` en init y hashchange. |
| `modules/dominio/config/view.js` | `_renderPropositos()`: sección "Mensajes de ayuda" en el panel de Ajustes. |
| `modules/dominio/config/index.js` | Import de `reactivarPropositos` + registro de `reactivar-propositos`. |
| `modules/ui/bootstrap.js` | Import + call de `initBannersProposito()` antes de `initTesoreria`. |
| `styles/components/domain.css` | `.banner-proposito` + `.banner-proposito--colapsado` + variante de color por sección. |
| `tests/unit/proposito.test.js` | 9 unit tests de `htmlBannerProposito` (expandido, colapsado, sección desconocida, edge cases). |
| `service-worker.js` | `proposito.js` en `CORE_ASSETS`; v227 → v228. |

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
