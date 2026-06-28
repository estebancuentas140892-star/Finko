# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-28 (style(gastos): iconos de categoría con fondo de color vivo por categoría, estilo "app de hábitos")

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
| Tests unitarios + integración | 1438/1438 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### style(gastos): iconos de categoría con fondo de color vivo por categoría · 2026-06-28

Segunda iteración del icono de gastos (la primera, un chip de acento verde tenue, no resaltaba lo suficiente). Por pedido del usuario (referencia: Duolingo y apps similares con iconos muy visibles), cada categoría ahora tiene su propio fondo sólido y vivo (verde Mercado, naranja Restaurantes, azul Transporte, fucsia Entretenimiento, rojo Salud, ámbar Servicios, etc.), con esquinas redondeadas (`--fk-radius-lg`), sombra sutil y emoji más grande. El color identifica la categoría de un vistazo. También se conserva el subtítulo sin el emoji redundante (de la iteración anterior). El realce sigue siendo exclusivo de Gastos vía `list-item__icon--cat` + `data-cat="<slug>"`; el color concreto llega por el token `--fk-cat-<slug>`. No toca el `.list-item__icon` global de otras secciones. Verificado en navegador (tema claro): cada gasto con su color, emoji legible; los `--fk-cat-*` son iguales en ambos temas. SW v189 → v190. Tests 1438/1438.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | 15 tokens `--fk-cat-*` (colores vivos por categoría, consistentes entre temas). |
| `modules/core/constants.js` | `CATEGORIA_SLUG`: categoría → slug de color. |
| `modules/dominio/gastos/view.js` | `_renderGastoItem`: `data-cat="<slug>"` en el icono. |
| `styles/components/atoms.css` | `.list-item__icon--cat` rediseñado: fondo sólido por `data-cat`, radius `lg`, sombra, emoji 1.375rem. |

---

### feat(deudas): selector de tarjetas + reparto-fallback en "Abonar" (4/4 flujos, cierra la serie) · 2026-06-28

Cierra la serie "selector de tarjetas + reparto solo si no alcanza" en los 4 flujos de pago (Gastos, Gasto rápido, Agenda y ahora Deudas). El formulario de abono vuelve a tener el selector de tarjetas (avatar, nombre, saldo); se elige la cuenta y solo si no alcanza se abre el reparto, pre-sembrado y avisando "X no alcanza". `validarAbono` vuelve a exigir `cuentaId`. Verificado en navegador: cubre (Bancolombia $2M, abono $200k) → un solo gasto-abono, sin picker; no cubre (Nequi $100k, abono $500k) → reparto Nequi $100k + Bancolombia $400k, saldo de la deuda baja de $1.500.000 a $1.000.000, saldos de cuentas sin negativos. Tests 1438/1438 (2 actualizados, sin nuevos: la cobertura de `resolverPagoConPreferida` ya existía). SW v187 → v188.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono` con `renderSelectorCuenta` (selector de tarjetas restaurado). |
| `modules/dominio/compromisos/logic.js` | `validarAbono` vuelve a exigir `cuentaId`. |
| `modules/dominio/compromisos/index.js` | `_guardarAbono` usa `resolverPagoConPreferida` en vez de `resolverPagoMultiCuenta`. |
| `tests/unit/compromisos.test.js` | Tests de `validarAbono` y `renderFormAbono` actualizados al nuevo contrato (cuentaId requerido, selector presente). |

---

### feat(agenda): selector de tarjetas + reparto-fallback en "Marcar pagado" (3/4 flujos) · 2026-06-28

Al marcar un gasto fijo como pagado, con varias cuentas ahora aparece el mismo selector de tarjetas (avatar de entidad, nombre y saldo) que en Gastos: se elige la cuenta y solo si no alcanza se abre el reparto, pre-sembrado y avisando "X no alcanza". Con una sola cuenta no pregunta (regla de cuenta única); si esa cuenta no cubre, pide confirmación de sobregiro. Reusa `renderSelectorCuenta` + `resolverPagoConPreferida`. Verificado en navegador: cubre (Bancolombia $2M) → un gasto directo, sin picker; no cubre (Nequi $100k) → Nequi $100k + Bancolombia $400k, total $500k sin negativos. **Pendiente:** 4/4 Deudas (Abonar). SW v186 → v187. Tests 1438/1438.

| Archivo | Cambio |
|---|---|
| `modules/infra/cuenta-helper.js` | Nueva `resolverPagoConSelector` (0/1/varias: selector de tarjetas + reparto-fallback) + `_mostrarSelectorPreferida`. |
| `modules/dominio/agenda/index.js` | `_marcarPagadoGastoFijo` usa `resolverPagoConSelector` en vez de `resolverPagoMultiCuenta`. |
| `tests/unit/cuenta-helper.test.js` | 5 tests de `resolverPagoConSelector` (0/1/varias, cubre, reparto encadenado). |

---

### feat(gastos): selector de tarjetas en Gasto rápido (2/4 flujos) · 2026-06-28

El gasto rápido ahora muestra el mismo selector de tarjetas con avatares de entidad que el gasto completo. Si la cuenta elegida no cubre el monto, abre el picker de reparto con la elegida como prioridad (se cobra primero). Si es la única y no alcanza, pide confirmación de sobregiro. Verificado: cubre → sin picker, directo; no cubre → Nequi $400k + Bancolombia $50k; sin negativos. SW v185 → v186. Tests 1433/1433.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js` | `renderFormGastoRapido` con `renderSelectorCuenta`. |
| `modules/dominio/gastos/index.js` | `_guardarGastoRapido` con `resolverPagoConPreferida` + confirm sobregiro. |

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
