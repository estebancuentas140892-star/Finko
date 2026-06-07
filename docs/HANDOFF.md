# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente ía o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-06 (test(e2e): realinear suites E2E C2.2+C2.3; 57/57 verde)

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
| Tests unitarios + integración | 1078/1078 verdes (+14 nudges J.2c, +15 proyección J.2b, +43 inversiones J.2a) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### test(e2e): C2.2+C2.3 - realinear suites E2E rotas (smoke + estrategia-pago) · 2026-06-06

Saldada la deuda técnica de 26 tests pre-existentes en rojo. Causa raíz: dos rediseños de UI que nunca se reflejaron en los tests. Cero cambios en código de app.

**`smoke.test.js` (C2.2, 19 tests rotos):** el `beforeEach` de 4 suites esperaba `#saldo-total` visible, pero la guía I.1 lo oculta cuando `cuentas: []`. Fix: `waitForSelector('#saldo-total')` cambiado a `waitForSelector('#sec-dash.active')` en 6 puntos. Dashboard test 1: aserción actualizada a `#sec-dash.active` + `#hero-guia-saldo`. Dashboard test 2: agrega `addInitScript` con una cuenta de saldo 0 antes de re-navegar.

**`estrategia-pago.test.js` (C2.3, 7 tests rotos):** la card de estrategia se rediseñó de "pasos numerados" a "pick cards" con ninguna elegida por defecto. Selectores eliminados: `.estrategia-card__paso`, `.estrategia-card__total-valor`, `.estrategia-card--hint`, `.estrategia-card__orden`, texto "Estrategia de pago de deudas". Reemplazados por: click en pick card, `.estrategia-card__metrica-valor--info` (prioridad), `.estrategia-card__metrica-valor--danger` (intereses totales), `.estrategia-card__placeholder` (1 deuda), `.estrategia-card-pick` (ausencia = 0).

**Resultado:** 57/57 verde (1 worker y 5 workers en paralelo).

### test(e2e): smoke de Ahorro e Inversión (cobertura E2E de la Parte 4) · 2026-06-06

Nueva suite `tests/e2e/ahorro-inversion.test.js` (9 tests) que cubre los 2 dominios de la Parte 4, que tenían cobertura unit + verificación manual pero ningún smoke E2E propio. Solo se agregó el archivo de test: cero cambios en código de app.

**Ahorro (4 tests):** empty state al navegar desde el dashboard, activar el fondo (modal → form → hero con el monto base), registrar un aporte (aparece en el historial y el hero suma base + aporte) y persistencia tras `reload`.

**Inversión (5 tests):** empty state, alta (lista + hero con total invertido), proyección al vencimiento de un CDT en el item (retención 7%: $10.000.000 al 10% EA por 12m → $10.930.000), eliminar (vuelve al empty state al ser la única) y persistencia tras `reload`.

**Detalle técnico clave:** el helper de seed `estadoBaseV8` siembra `fk_v1` solo si aún no existe, porque `addInitScript` corre en CADA carga (incluido `reload`) y, sin esa guarda, re-escribía el estado vacío y borraba lo que el test acababa de crear. Tras `reload` se espera la sección activa (`#sec-ahorro.active`), no `#saldo-total` (que vive en el dashboard, inactivo con ese hash).

**Resultado:** 9/9 verde en aislado y en la corrida completa en paralelo (5 workers).

### feat(inversion): J.2c - nudges educativos de inversión (cierra Parte 4) · 2026-06-06

Tercer y último slice de J.2 (Inversión). Cierra la **Parte 4 (Crecer: Ahorro + Inversión)**. Agrega nudges educativos sobre el portafolio. Sin cambio de schema: todo se deriva del estado.

**`inversiones/logic.js` (`detectarNudgesInversion`, 14 tests):** función pura que recibe las inversiones + un `contexto` con el estado del fondo de emergencia (el caller lee `S.ahorro`, no se importa el dominio Ahorro: ADN #10). Detecta, por prioridad: (1) "fondo primero" (high si no hay fondo activo, medium si está incompleto), (2) concentración (un tipo >= 70% con 2+ holdings), (3) retorno variable (>= 50% en activos sin tasa/plazo), (4) refuerzo positivo (fondo completo + diversificado). Umbrales exportados (`UMBRAL_CONCENTRACION_PCT`, `UMBRAL_VARIABLE_PCT`).

**`inversiones/view.js`:** `_renderNudges` lee `S.ahorro.fondoEmergencia` y pinta los nudges (el de fondo enlaza a `#ahorro`). `_renderTipHorizonte`: tip educativo evergreen sobre invertir a largo plazo, al pie de la sección.

**`styles/components.css`:** `.inversion-nudges` (contenedor) + `.inversion-tip` (tip con borde punteado). Reutiliza las clases `.nudge*` existentes. **`service-worker.js`:** v106 → v107.

**Verificado en navegador:** con fondo inactivo + Cripto 75% + 88% variable se muestran los 3 nudges en orden (high/medium/info) con el CTA a Ahorro, el desglose por tipo y el tip de horizonte. 1078/1078 tests verdes.

**Cierra la Parte 4.** Inversión completa (J.2a + J.2b + J.2c) y Ahorro completo (J.1a-c).

### feat(inversion): J.2b - proyección al vencimiento + rentabilidad real del portafolio · 2026-06-06

Segunda entrega de J.2 (Inversión). Agrega proyección de valor al vencimiento por holding y rentabilidad real del portafolio. Sin cambio de schema (todo se calcula).

**`inversiones/logic.js` (5 funciones nuevas, 15 tests):** importa de `infra/financiero.js` (capa infra, permitido). `esProyectable` (requiere tasa + plazo + monto), `proyectarInversion` (CDT usa `calcularCDT` con retención 7%; resto crecimiento compuesto EA con `calcularInteresCompuesto`, sin retención), `proyectarPortafolio` (total proyectado: proyectables a su VF, no proyectables a su monto), `tasaPromedioPonderada` (EA ponderada por monto), `calcularRentabilidadRealPortafolio` (Fisher con `calcularRentabilidadReal`).

**`constants.js`:** nueva `INFLACION_OBJETIVO = 0.03` (meta Banco de la República, con fuente + nota de revisión, ADN #12).

**`inversiones/view.js`:** card "Proyección al vencimiento" tras el hero (valor proyectado, ganancia esperada con color de signo, rentabilidad nominal → real con supuesto de inflación visible, nota de holdings de retorno variable). Proyección inline por holding en la lista ("Al vencimiento: $X (+$Y)"). `_fmtTasa` redondea a 2 decimales.

**`styles/components.css`:** estilos `.inversion-proy*` + `.inversion-item__proy*` + signos `.is-pos`/`.is-neg` locales. **`service-worker.js`:** v105 → v106.

**Verificado en navegador:** con CDT (11,5% EA, 12m) + FIC (8% EA, 24m) + Bitcoin (variable): hero $8.000.000, proyección $8.867.550 (+$867.550), nominal 10,5% → real 7,28% (inflación 3%), Bitcoin sin proyección. 1064/1064 tests verdes.

### feat(inversion): J.2a - fundación del dominio Inversión + portafolio real · 2026-06-06

Primera entrega de J.2 (Inversión). Funda un nuevo dominio: registro del portafolio real (CDT, fondos, acciones, cripto) con schema v7→v8, lógica pura, sección con hero de total invertido, lista de holdings y alta. La proyección de valor y rentabilidad real llega en J.2b.

**Schema (state.js + storage.js):** `_version: 7 → 8`. Nueva colección top-level `inversiones: [{id, tipo, nombre, monto, tasaEA, plazoMeses, fechaInicio, fechaCreacion}]`. Migración v7→v8 idempotente (agrega `inversiones: []` si falta). 3 tests de migración.

**`inversiones/logic.js` (puro, 43 tests):** `TIPOS_INVERSION` (CDT, Fondo, Acciones, Cripto, Otro), `calcularTotalInvertido`, `calcularPorTipo` (desglose con %), `ordenarInversionesPorMonto`, validación + normalización de los 6 campos (tasa y plazo opcionales: 0 válido para rentabilidad variable). Respeta ADN #10 (recibe primitivos, no importa de otro dominio).

**`inversiones/view.js`:** empty state con CTA + tip (fondo de emergencia primero), `inversion-hero` (total invertido + conteo + desglose por tipo), lista de holdings con tipo/tasa/plazo/fecha + botón eliminar, `renderFormInversion` (selector de tipo + nombre + monto + tasa/plazo opcionales + fecha).

**`inversiones/index.js`:** usa `crud.js` (`guardar`/`eliminar`) porque inversiones es colección top-level. 2 acciones: `inversion-nueva`, `inversion-eliminar`. Re-render en `state:change` (inversiones) + hashchange.

**HTML/CSS:** sprite SVG `i-inversion` (trending-up Lucide), nav item en grupo "Crecer" (sidebar + menú Más), sección `sec-inversion` + modal `modal-inversion`, router + token `--fk-dom-inversion: #4db8d8` (cian) + estilos `.inversion-hero*` / `.inversion-lista*` / `.label__opt`. Bootstrap importa `initInversiones`. SW v104 → v105.

**Verificado en navegador:** la sección renderiza el empty state; alta vía modal funciona (CDT $5.000.000 → hero "$5.000.000", chip "CDT 100%", item con tasa/plazo/fecha); modal abre/cierra; sin errores de consola. 1049/1049 tests verdes.

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Fase activa:** ninguna. **Parte 4 (Crecer: Ahorro + Inversión) cerrada** (J.1a-c + J.2a-c). La app sigue estable en producción.

**Opciones para la próxima sesión:**
- **Lighthouse + Lighthouse PWA** sobre las secciones nuevas, por si el peso de JS subió.
- **A.5 - Dominio custom** cuando el usuario tenga un dominio registrado.
- **E.2 - SMMLV + UVT 2027** en enero 2027 (~15 min, Haiku).
- Pequeñas mejoras de UX o copy a demanda.

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
pnpm test                     # 596 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
