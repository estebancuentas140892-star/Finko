# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-06-28 (feat(deudas): iconos de cuenta en el abono)

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
| Tests unitarios + integración | 1418/1418 verdes |
| Tests E2E | 57/57 verde. Suites: `smoke` 28 tests, `estrategia-pago` 8 tests, `ahorro-inversion` 9 tests, `navegacion-render` 12 tests. |
| Lighthouse Performance | 99 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(deudas): iconos de cuenta en el abono · 2026-06-28

Mismo patrón de iconos de cuenta aplicado al modal de abono a deudas: avatar con color de la cuenta elegida en el hint de saldo + emoji por tipo de entidad (🏦/📱/💵) en las opciones del select. Reusa `infra/bancos.js`. Verificado en la app (Nequi morado "Nq"). SW v179 → v180. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/formularios.js` | Hint de cuenta única con avatar; opciones del select con emoji por tipo. |
| `modules/dominio/compromisos/index.js` | `_actualizarSaldoDisponibleAbono` muestra el avatar de la cuenta elegida. |

---

### feat(cuentas): iconos de entidad en selección de cuenta · 2026-06-28

Las entidades bancarias y el efectivo ahora se muestran con su icono (avatar con color corporativo) al elegir cuenta. Helper compartido `bancoAvatar`/`bancoClaseEmoji` en infra. Picker de Agenda: avatar por cuenta. Gastos: avatar de la cuenta en el hint de saldo + emoji por tipo (🏦/📱/💵) en cada opción del select (un `<option>` nativo no admite avatar con color). Tesorería refactorizada para reusar el helper. SW v178 → v179. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `modules/infra/bancos.js` | Nuevo. `bancoAvatar(bancoId)` + `bancoClaseEmoji(bancoId)`. |
| `modules/infra/cuenta-helper.js` | Picker de cuenta: avatar con color por botón. |
| `modules/dominio/gastos/view.js` | Hint de cuenta única con avatar; opciones del select con emoji por tipo. |
| `modules/dominio/gastos/index.js` | Display de saldo con avatar de la cuenta elegida. |
| `modules/dominio/tesoreria/view.js` | `_bankAvatarHtml` delega en el helper compartido. |
| `styles/components/nudges.css`, `styles/components/domain.css` | Variante inline del avatar + grupo en cuenta-picker. |

---

### refactor(gastos): reestructura de categorías v14→v15 · 2026-06-28

Dividir "Alimentación" en "Mercado" y "Restaurantes" + agregar Hogar, Mascotas, Cuidado personal. Ocultar "Deudas" y "Ahorro" del formulario (quedan internas para sistema). Migración v14→v15 renombra gastos/presupuestos existentes: "Alimentación" → "Mercado". Schema CATEGORIAS_GASTO (16 total) + CATEGORIAS_GASTO_USUARIO (13 visibles). SW v177 → v178. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | CATEGORIAS_GASTO: +5 categorías; CATEGORIAS_GASTO_USUARIO: nueva constante con visible-user-facing. |
| `modules/core/storage.js` | v14→v15: renombra "Alimentación" en gastos y presupuestos a "Mercado". SCHEMA_VERSION 15. |
| `modules/dominio/gastos/view.js` | Select de categoría usa CATEGORIAS_GASTO_USUARIO. |
| `modules/dominio/presupuesto/view.js` | Select de categoría usa CATEGORIAS_GASTO_USUARIO. |
| `tests/integration/flujos.test.js` | Test de migración: espera "Mercado" en presupuestos. |

---

### style(ui): mejorar visual y copy en dashboard, gastos, agenda y deudas · 2026-06-28

Pulido visual y de experiencia: (1) gasto semanal en dashboard ahora en rojo (color de salida) en vez de verde (positivo); (2) lista de gastos muestra emoji de categoría en lugar de icono genérico; (3) Dashboard: eliminada sección "Accesos rápidos" innecesaria; (4) Agenda y Deudas: removidos hints redundantes ("Finko lo incluye en tu resumen..."), lenguaje de deudas mejorado ("cooperativa, fondo de empleados" en lugar de "fintech"). SW v176 → v177. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/view.js` | Import `CATEGORIA_EMOJI` + emoji en categoría top. |
| `styles/components/domain.css` | `.resumen-card__stat--primary .resumen-card__value`: `--fk-text-accent` → `--fk-danger-text`. |
| `modules/dominio/gastos/view.js` | `list-item__icon`: emoji de categoría con fallback a icono genérico. |
| `index.html` | Eliminado nav `.bento__cell--accesos` (Accesos rápidos). |
| `modules/dominio/agenda/view.js` | Removido hint innecesario de `gasto fijo`. |
| `modules/dominio/compromisos/views/formularios.js` | Cambio de copy: "fintech" → "cooperativa, fondo de empleados"; removidos 2 hints redundantes. |

---

### style(personales): fecha legible en Me deben (UX C) · 2026-06-28

Las fechas ISO en Me deben ("Pactó devolver: 2026-08-15", "Último abono: 2026-06-20") eran las últimas vistas sin `fechaLegible`. Ahora muestran formato largo, consistente con el resto. SW v175 → v176. Tests 1418/1418.

| Archivo | Cambio |
|---|---|
| `modules/dominio/personales/view.js` | Import `fechaLegible` + reemplazo en `fechaLimite` y `ultimoPago`. |
| `service-worker.js` | v175 → v176. |

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
