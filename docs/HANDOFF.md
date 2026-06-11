# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-11 (subtítulos permanentes + urgencia visual en Apartados; 1359/1359 verde)

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
| Tests unitarios + integración | 1359/1359 verdes (+8: calcularGastosFijosMensuales + estimarSalarioMensual multifrecuencia) |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(rediseno-v2): sistema de iconos SVG propio (reemplaza emojis de UI chrome) · 2026-06-11

Segunda fase del rediseño visual 2026. Crea `infra/icons.js` con helper `icon(id, cls)` que referencia el sprite SVG de `index.html`. Agrega 11 nuevos symbols al sprite. Reemplaza todos los emojis de UI chrome por SVG: empty states (10 vistas), list-item icons, nudge icons, iconos de estrategia, quick-add, modal y toggle de tema. `ICONO_TIPO` en compromisos pasa a IDs de icono. SW v145 → v146. Tests 1359/1359 verdes.

| Archivo | Cambio |
|---|---|
| `modules/infra/icons.js` | Nuevo: `icon(id, cls)` devuelve `<svg><use href="#i-id"/></svg>`. |
| `index.html` | 11 nuevos `<symbol>` en el sprite (recurring, search, lightbulb, alert, moon, sun, bolt, trophy, mountain, circle, check-circle). Quick-add y modal gasto rápido usan `#i-bolt`. Hero guide usa `#i-cuentas`. |
| `styles/components/forms.css` | `.icon--lg` (3rem, stroke-width 1.5): modificador para empty states. |
| `styles/components/atoms.css` | `.empty-state__icon .icon--lg`: color acento + 3.5rem. |
| `styles/components/config.css` | `.cal-dot--*`: agrega `color:` junto a `background:` para colorear iconos SVG inline. |
| `modules/dominio/compromisos/logic.js` | `ICONO_TIPO` pasa de emoji a IDs: `'recurring'`, `'cuentas'`, `'personales'`. |
| Views de 10 dominios | Empty states: `<div class="empty-state__icon">icon(...)</div>`. List-item icons. Nudge icons. |
| `modules/dominio/tesoreria/logic.js` | `icono: 'gastos'` (era `'💸'`). |
| `tests/unit/tesoreria.test.js` | Actualiza expect `icono` de `'💸'` a `'gastos'`. |
| `service-worker.js` | v145 → v146. |

---

### feat(rediseno-v1): tokens v2 + tipografía: Inter tnum, sin glow, sin DM Mono · 2026-06-11

Primera fase del rediseño visual 2026. Los montos de toda la app ahora usan Inter (igual que el resto del texto) con `tabular-nums` para alineación numérica. Eliminada la fuente DM Mono y sus dos archivos `@font-face`. El "glow" neón reemplazado por un sistema de elevación con ring sutil de acento. SW v144 → v145. Tests 1359/1359 verdes.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | `--fk-font-mono` apunta a `var(--fk-font-sans)`. `--fk-shadow-glow` reemplazado: ring 1.5px acento + sombra de elevación. `--fk-accent-glow` reducido a 0.08 alpha (sin brillo neón). |
| `styles/themes.css` | `--fk-shadow-glow` light mode: ring acento + elevación azul-tinta. |
| `styles/main.css` | Eliminados los dos bloques `@font-face` de DM Mono (400 y 500). |
| `styles/base.css` | Bloque tnum centralizado: 14 selectores de valores financieros reciben `font-variant-numeric: tabular-nums`. |
| `styles/components/config.css` | `install-banner`: removido `0 0 32px var(--fk-accent-glow)` inline. |
| `styles/components/nudges.css` | `logro-toast`: removido `0 0 32px var(--fk-accent-glow)` inline. |
| `styles/components/charts.css` | `comp-chooser__btn:hover`: simplificado a `var(--fk-shadow-glow)`. |
| `service-worker.js` | v144 → v145. |

---

### docs(redesign): plan maestro de modernización visual 2026 · 2026-06-11

Auditoría visual de toda la app con datos de demostración (desktop y móvil, dark y light) y plan del rediseño en fases. Diagnóstico: emojis como iconografía, montos en DM Mono "estilo terminal", estética neón sobre negro, desktop de una columna, progreso visualmente tímido, jerarquía débil en cards, microinteracciones ausentes. Plan en [`REDESIGN_2026.md`](REDESIGN_2026.md): 7 fases de UI (V.1 a V.7 en ROADMAP) + 1 opcional de producto (V.8, mecánicas de hábito).

| Archivo | Cambio |
|---|---|
| `docs/REDESIGN_2026.md` | Nuevo: diagnóstico, dirección "calma con energía", fases, restricciones. |
| `docs/ROADMAP.md` | Serie V (Rediseño visual 2026) con V.1-V.8. |

---

### feat(ux): subtítulos permanentes + urgencia visual en Apartados · 2026-06-11

Tres mejoras visuales sin cambios de lógica o tests. Subtítulos de sección permanentes para Ahorro, Metas y Apartados (visibles siempre, no solo en el empty state). Badge de urgencia inline en el subtitle de cada apartado: rojo si vence en ≤7 días, ámbar en 8-30 días. Estado "Listo para usar" en apartados recurrentes que ya reunieron el dinero: borde y fondo verde en el card. SW v143 → v144.

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos permanentes: Ahorro ("Tu colchón..."), Metas ("Objetivos aspiracionales..."), Apartados ("Reservas para gastos previsibles..."). |
| `modules/dominio/apartados/view.js` | `list-item--listo` cuando está listo para reiniciar; badge `badge--danger`/`badge--warn` por días restantes. |
| `styles/components/forms.css` | `.badge--danger` (rojo, mismo patrón que `.badge--warn`). |
| `styles/components/domain.css` | `.list-item--listo` + `:hover`. |
| `service-worker.js` | v143 → v144. |

---

### fix(metas): copy del empty state desambigua Metas vs Ahorro vs Apartados · 2026-06-11

El empty state de Metas mencionaba "fondo de emergencia" como meta sugerida, compitiendo directamente con la sección Ahorro. Se reescribió descripción y tip para guiar al usuario al dominio correcto. SW v142 → v143.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | Desc y tip del empty state reescritos: Metas = objetivos aspiracionales; fondo de emergencia → Ahorro; gastos previsibles (SOAT, impuestos) → Apartados. |
| `service-worker.js` | v142 → v143. |

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
