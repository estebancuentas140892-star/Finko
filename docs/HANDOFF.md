# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-09 (motor distribución adaptativa Fase 3; 1235/1235 verde)

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
| Tests unitarios + integración | 1235/1235 verdes (+14: sugerirDistribucionIngreso) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(ingresos): motor de distribución adaptativa del ingreso (Fase 3) · 2026-06-09

Tarjeta "¿Cómo distribuir $X?" en Mis ingresos, debajo del nudge de próximo cobro. Split 50/30/20 adaptado al peso real de gastos fijos. Alertas y CTAs según contexto: fondo de emergencia, deudas, inversiones. Sin nuevo schema ni CSS. SW v130 → v131. 1235/1235 tests verdes (+14).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `sugerirDistribucionIngreso(ingresoMensual, contexto)`: pura, 3 escenarios (<=50%, 51-70%, >70% fijos), CTAs dinámicos. |
| `modules/dominio/tesoreria/view.js` | `renderDistribucionIngreso()` + `_renderDistribucion()`. Lee S directamente sin importar otros dominios. |
| `modules/dominio/tesoreria/index.js` | Importa y llama en `_renderTodo`. EventBus extendido: ahora reacciona a `ahorro` e `inversiones`. |
| `index.html` | `<div id="ingresos-distribucion">` entre nudge y lista de ingresos. |
| `tests/unit/tesoreria.test.js` | +14 tests: split suma 100 para 8 valores de pctFijos, alertas/CTAs por contexto, coherencia de montos. |
| `service-worker.js` | `CACHE_NAME` v130 → v131. |

---

### feat(ingresos): alerta proactiva de próximo cobro en Mis ingresos (Fase 2) · 2026-06-09

Nudge "Recibes X en N días" encima de la lista de ingresos. Dos funciones puras nuevas (`diasParaProximoPago`, `detectarNudgeProximoIngreso`) + render del nudge. Solo soporta Mensual y Quincenal (ciclo exactamente derivable del diaPago). SW v129 → v130. 1221/1221 tests verdes (+20).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `diasParaProximoPago` (Mensual/Quincenal, maneja fin de mes y rollover) + `detectarNudgeProximoIngreso` (más próximo + otros en 7 días). |
| `modules/dominio/tesoreria/view.js` | `renderNudgeProximoIngreso()`: escribe nudge en `#ingresos-nudge-proximo`. Formato: "hoy / mañana / en X días (DD mmm)". |
| `modules/dominio/tesoreria/index.js` | `renderNudgeProximoIngreso` importado y llamado en `_renderTodo`. |
| `index.html` | `<div id="ingresos-nudge-proximo">` antes de `#lista-ingresos`. |
| `tests/unit/tesoreria.test.js` | +11 tests `diasParaProximoPago` + +9 tests `detectarNudgeProximoIngreso`. |
| `service-worker.js` | `CACHE_NAME` v129 → v130. |

---

### feat(ingresos): diaPago en fuentes de ingreso recurrentes (schema v12) · 2026-06-09

Fase 1 de la mejora de "Mis ingresos". Agrega el campo opcional `diaPago` (número 1-31) al shape de `Ingreso`. Desbloquea la Fase 2 (alerta proactiva de pago) y la Fase 3 (motor de distribución adaptativo). Schema v11 → v12. SW v128 → v129. 1201/1201 tests verdes (+18).

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | `diaPago?: number\|null` en `@typedef Ingreso`. `_version` 11 → 12. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 11 → 12. Migración v11 → v12: agrega `diaPago: null` a ingresos existentes. |
| `modules/dominio/tesoreria/logic.js` | Exporta `FRECUENCIAS_CON_DIA`. `validarIngreso` y `normalizarIngreso` con soporte de `diaPago`. |
| `modules/dominio/tesoreria/view.js` | Campo `diaPago` en el form (oculto/visible según frecuencia). Hint en item de lista cuando diaPago está seteado. |
| `modules/dominio/tesoreria/index.js` | `_attachDiaPagoToggle(form)`: toggle de visibilidad + max/label dinámicos por frecuencia. |
| `tests/unit/tesoreria.test.js` | +14 tests: `validarIngreso` (9) y `normalizarIngreso` (5) con diaPago. |
| `tests/unit/storage.test.js` | +4 tests: migración v11 → v12. |
| `tests/unit/state.test.js` | Assert `_version` 11 → 12. |
| `service-worker.js` | `CACHE_NAME` v128 → v129. |

---

### fix(a11y): agregar skip link "Saltar al contenido principal" (WCAG 2.4.1) · 2026-06-09

El CSS `.skip-link` existía desde la fase inicial pero el elemento `<a>` nunca se había agregado al HTML. Un usuario que navega solo con teclado no podía saltarse los 20+ enlaces de la barra lateral para ir directo al contenido: debía recorrerlos todos en cada carga. Ahora `index.html` tiene `<a class="skip-link" href="#main-content">Saltar al contenido principal</a>` como primer elemento del `<body>`. El destino `#main-content` ya tenía `tabindex="-1"` (correcto). Se agrega test `'tiene skip link apuntando a #main-content (WCAG 2.4.1)'` en `tests/unit/a11y.test.js`. SW v127 → v128.

| Archivo | Cambio |
|---|---|
| `index.html` | Primer elemento del `<body>`: `<a class="skip-link" href="#main-content">Saltar al contenido principal</a>` |
| `tests/unit/a11y.test.js` | +1 test: verifica que el skip link existe, apunta a `#main-content` y que el destino tiene `tabindex="-1"` |
| `service-worker.js` | `CACHE_NAME` v127 → v128 |

---

### refactor(cuentas): formulario dinámico por clase de entidad + schema v11 + ADR IVA · 2026-06-09

Dos mejoras de UX en Mis Cuentas decididas con el usuario, más una decisión de producto documentada:

1. **Formulario dinámico por clase de entidad.** `BANCOS_CO` ahora tiene `clase` ('banco'/'billetera'/'efectivo'/'otro'). El select "Tipo de cuenta" empieza oculto y vacío; al elegir el banco, JS lo puebla con los tipos válidos para esa clase (banco: Corriente/Ahorros; billetera: oculto, saldo único; efectivo: oculto; otro: Ahorros/Otro). La cuota de manejo también se oculta para Efectivo. `_toggleCamposEfectivo` se generaliza a `_toggleCamposPorClase`.
2. **Quitar "Inversión" de los tipos de cuenta.** Las inversiones reales viven en la sección Inversión (J.2). Las cuentas viejas con `tipo='Inversión'` migran a `'Otro'` (schema v10 → v11, migración idempotente). `normalizarCuenta` ahora asigna el tipo correcto por clase: billetera → banco id ('Nequi'); efectivo → 'Efectivo'; banco/otro → lo que eligió el usuario.
3. **ADR 005:** documentada la decisión de no desglozar IVA/servicio en gastos. El total pagado es suficiente para finanzas personales; desglosar no cambia ninguna decisión y añade fricción.

SW v126 → v127. 1182/1182 tests verdes (+18).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `clase` en cada entrada de `BANCOS_CO`. Quitar `'Inversión'` de `TIPOS_CUENTA`. Nuevo `TIPOS_POR_CLASE`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 10 → 11. Migración v10 → v11: `tipo='Inversión'` → `'Otro'`. |
| `modules/core/state.js` | `_version` inicial 10 → 11. |
| `modules/dominio/tesoreria/logic.js` | Importa `BANCOS_CO`. Helper `_claseBanco`. `validarCuenta`: no exige tipo para billeteras. `normalizarCuenta`: tipo por clase. |
| `modules/dominio/tesoreria/view.js` | Tipo select inicia oculto y vacío (JS lo puebla). Quitar `TIPOS_CUENTA` del import. |
| `modules/dominio/tesoreria/index.js` | Importa `BANCOS_CO`, `TIPOS_POR_CLASE`, `esc`. `_toggleCamposPorClase` (4 clases). `_editarCuenta` reordenado. |
| `tests/unit/tesoreria.test.js` | +4 tests: billetera sin tipo válido, normalizar billetera, nombre explícito. |
| `tests/unit/storage.test.js` | +5 tests: migración v11 (reasigna, no toca otros, preserva campos, no-op, idempotente). |
| `tests/unit/constants.test.js` | +10 tests: clase por entidad + TIPOS_CUENTA sin Inversión + consistencia TIPOS_POR_CLASE. |
| `tests/unit/state.test.js` | Assert `_version` 10 → 11. |
| `docs/DECISIONS/005-no-desglose-iva-servicio.md` | Nuevo ADR: por qué no se desgloza IVA/propina en el registro de gastos. |
| `service-worker.js` | v126 → v127. |

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

## 4. Qué sigue (roadmap post-v1.0)

**Serie cerrada:** "Coaching de ingresos" (Fases 1, 2 y 3) completada el 2026-06-09. `diaPago` en ingresos + nudge de próximo cobro + tarjeta de distribución adaptativa. SW v128 → v131. 1235/1235 tests verdes.

**Próxima tarea natural:** ninguna urgente. Opciones disponibles abajo.

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
pnpm test                     # 1182 tests unitarios + integración
pnpm run test:e2e             # 57 smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
```
