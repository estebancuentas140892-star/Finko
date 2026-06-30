# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-30 (feat(proposito): EP.2 - banners en Gastos, Deudas, Agenda y Límites de gasto)

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

### docs(propósito): ADR 016 - banner de propósito de sección (EP.0) · 2026-06-30

Tarea de **diseño** (solo ADR, sin código de producción ni SW bump). [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) define el patrón único reutilizable de la épica "explicar el propósito de cada sección". Decisiones cerradas con el usuario: (1) **ubicación** = banner colapsable arriba del contenido, debajo del `section__header`, visible tenga o no datos; (2) **persistencia** = se colapsa a una línea re-abrible, nunca se borra; estado por sección en `S.config.propositoColapsado` (lectura defensiva, **sin migración**), con "reactivar todo" desde Ajustes; (3) **secciones** = las 10 núcleo + Personales (11 en total; Dashboard y Calculadoras quedan fuera); (4) **copy** = tres tiempos (pregunta gancho, nombrar el problema, cómo Finko ayuda), 3-4 frases, tono ADN; (5) **a11y** = patrón disclosure (`aria-expanded` + `aria-controls`, `role="region"`), borde en el color de la sección, contraste AA, respeta `prefers-reduced-motion`. Incluye copy propuesto para las 11 secciones. Define los slices EP.1 (piloto: helper + Apartados) a EP.4.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/016-banner-proposito-de-seccion.md` | ADR nuevo: ubicación, persistencia sin schema, estructura de copy, 11 secciones, a11y, patrón de implementación, copy propuesto por sección, alternativas, consecuencias, slices EP.1-EP.4. |

---

### feat(tesoreria): barra de presets Automático + Personalizar + grupo "Métodos clásicos" (MC.6b) · 2026-06-30

Continúa MC.6a (modelo de pisos). La barra de chips de la tarjeta "¿Cómo distribuir...?" se reestructura: la **fila principal** muestra solo "Automático" y "Personalizar"; los 3 presets fijos (50/30/20, 70/20/10, 60/20/20) pasan a un `<details>` secundario titulado **"Métodos clásicos"**, con un texto de transparencia ("Porcentajes fijos. No consideran tus gastos reales."). El `<details>` queda abierto si algún preset clásico está activo. Sin cambios en lógica ni schema. 1649/1649 verdes. SW v226 → v227.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | `_renderDistribucion`: reemplaza `presetChips` por `autoChip` (fila principal) y `clasicosChips` (en `<details>`). |
| `styles/components/domain.css` | `.distribucion-clasicos` + `.distribucion-clasicos__toggle` (estilos del `<details>`). |
| `service-worker.js` | v226 → v227. |

---

### feat(deudas): categorías de deuda curadas (12 → 7) + migración v18→v19 (D.5a, ADR 015) · 2026-06-29

Implementa [ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md). El eje "qué" (`CATEGORIAS_DEUDA`, antes "Tipo de obligación") se cura de 12 a 7 valores orientados al propósito: Tarjeta de crédito 💳, Libre inversión 💵, Vivienda 🏠, Vehículo 🚗, Educativo 🎓, Compra a cuotas 🛍️, Otra 📦. El label del form pasa a "Tipo de deuda". Migración idempotente v18 → v19 remapea la `categoria` de las deudas existentes (los informales como Gota a gota, Libranza, Préstamo personal, Microcrédito, Sobregiro colapsan en "Libre inversión": su "quién" ya lo captura Entidad/Personal). El eje "quién" (Entidad/Personal) y la lógica financiera no se tocan. No se agregó campo "Acreedor". 4 tests de migración nuevos; tests de catálogo y form actualizados. 1645 → 1649 verdes. SW v225 → v226.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_DEUDA` (12 → 7) + `CATEGORIA_DEUDA_EMOJI` curados. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 18 → 19 + migración v18→v19 (remapeo idempotente de `categoria`). |
| `modules/dominio/compromisos/views/formularios.js` | Label "Tipo de obligación" → "Tipo de deuda". |
| `tests/unit/compromisos.test.js` | Catálogo 12 → 7; valores `Gota a gota` → `Libre inversión` en 2 tests. |
| `tests/unit/storage.test.js` | Describe nuevo "Migración v18 → v19" (4 tests). |
| `service-worker.js` | v225 → v226. |

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
