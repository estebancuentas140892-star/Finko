# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-27 (fix personales: la antigüedad de "Me deben" se reinicia tras un abono)

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
| Tests unitarios + integración | 1402/1402 verdes (+21: resumen/logic.js) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(personales): la antigüedad se reinicia tras un abono · 2026-06-27

En "Me deben", tras un abono parcial el chip de antigüedad seguia contando desde la fecha del prestamo original (ej. "177 dias, ya toca cobrar") aunque la persona acabara de pagar. Causa: `aplicarPago()` no guardaba la fecha del abono y `calcularDias()` contaba siempre desde `fecha`/`fechaLimite`. Fix: campo opcional `ultimoPago`; `calcularDias()` cuenta desde el evento mas reciente {fecha, fechaLimite, ultimoPago}. Aditivo, sin migracion. Verificado: 177d "viejo" → 2d "reciente"; pago rechazado no reinicia. SW v157 → v158. Tests 1407/1407 verdes (+5).

| Archivo | Cambio |
|---|---|
| `modules/dominio/personales/logic.js` | `aplicarPago` registra `ultimoPago` si entro dinero; `calcularDias` toma la fecha mas reciente. |
| `modules/dominio/personales/index.js` | Persiste `ultimoPago` via `editar()`. |
| `modules/dominio/personales/view.js` | Hint "Último abono: <fecha>". |
| `tests/unit/personales.test.js` | +5 tests. |
| `service-worker.js` | v157 → v158. |

---

### fix(tesoreria): limpiar diaPago al cambiar a Quincenal · 2026-06-27

Al cambiar la frecuencia de Mensual a Quincenal en el form de ingreso, el valor previo (ej. 30) no se limpiaba y llegaba al submit causando un error de validacion confuso. Fix: `_sync()` en `_attachDiaPagoToggle` limpia el campo si supera el nuevo max y actualiza el hint dinamicamente para explicar el calculo del segundo dia. SW v156 → v157.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_sync()` limpia value > 15 al cambiar a Quincenal; hint dinamico. |
| `service-worker.js` | v156 → v157. |

---

### fix(dashboard): doble borde rojo en "Pendientes del mes" · 2026-06-27

Cada `.vencidos-card__item` tenia un `border-left: 2px solid` de severidad que, junto al `border-left: 3px` rojo de la card y el hover de la bento cell, creaba dos capas visuales superpuestas. Fix: se eliminan el borde del item y las reglas de modificador de severidad (leve/moderada/urgente). La linea roja de la card es el unico delimitador. Verificado: `borderLeftWidth: 0px` en items, `2.5px` (3px) rojo en card. SW v155 → v156. Tests 1402/1402 verdes.

| Archivo | Cambio |
|---|---|
| `styles/components/domain.css` | Elimina `border-left` del item y las 3 reglas de modificador de severidad. |
| `service-worker.js` | v155 → v156. |

---

### fix(tokens): aliases CSS faltantes - corrige padding y tipografia en Limites, Ahorro e Inversion · 2026-06-27

`analysis.css` usaba `--fk-fs-*`, `--fk-fw-*` y `--fk-space-xs/sm/md/lg/xl` que nunca se definieron en `tokens.css`. Las variables indefinidas hacen que CSS use el valor inicial (0 para espaciado), dejando las cards de Limites de gasto, Ahorro e Inversion sin padding ni separacion interna. Fix: 15 aliases nuevos en `tokens.css` que apuntan a los tokens numericos canonicos. Verificado: `padding: 16px`, `gap: 12px`, `marginBottom: 24px`. SW v154 → v155. Tests 1402/1402 verdes.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | 15 aliases nuevos: `--fk-fs-xs/sm/base/lg/xl`, `--fk-fw-light/regular/medium/semibold/bold`, `--fk-space-xs/sm/md/lg/xl`. |
| `service-worker.js` | v154 → v155. |

---

### feat(presupuesto): renombrar "Presupuesto" a "Límites de gasto" y diferenciar de Apartados · 2026-06-13

El usuario volvió a sentir que Presupuesto y Apartados se parecían (ya se había tocado copy el 2026-06-11). Análisis: no son duplicados, son opuestos (tope que vigila el gasto vs dinero que se guarda para un gasto futuro); la confusión venía del nombre abstracto + el mismo dibujo de progreso para significados inversos + la adyacencia. Decisión con el usuario: NO fusionar (modo dual sería peor), diferenciar fuerte. Se renombró la sección a **"Límites de gasto"** solo de cara al usuario (el dominio interno sigue siendo `presupuesto`/`S.presupuestos`, sin migración) y se agregaron cross-links de desambiguación en ambos empty states. SW v153 → v154. Tests 1402/1402 verdes.

| Archivo | Cambio |
|---|---|
| `index.html` | Nav (sidebar + menú "Más"), título, subtítulo nuevo, modal y botón → "Límites de gasto" / "+ Límite". |
| `modules/dominio/presupuesto/view.js` | Empty state, form, hero y aria-labels renombrados; cross-link a Apartados. |
| `modules/dominio/presupuesto/index.js` | Toasts y confirmación de borrado renombrados. |
| `modules/dominio/presupuesto/logic.js` | Mensaje de duplicado renombrado; "Editá" → "Edita" (tuteo). |
| `modules/dominio/apartados/view.js` | Cross-link a "Límites de gasto" en el empty state. |
| `modules/dominio/logros/logic.js` | Descripción del logro "Planificador" actualizada. |
| `styles/components/atoms.css` | Variante `.empty-state__tip--muted` para cross-links secundarios. |
| `service-worker.js` | v153 → v154. |

---

> Para tareas anteriores, ver [`docs/CHANGELOG.md`](CHANGELOG.md).

---

> Para tareas anteriores (motor recomendación deudas, tasa opcional, motor distribución ingresos, Apartados Fase 1, ADR 005), ver [`docs/CHANGELOG.md`](CHANGELOG.md).

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
