# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-25. Última tarea cerrada: DIS.2, las 8 correcciones aplicables de la auditoría de diseño de Deudas (VD1 y D10 esperan una decisión de Esteban; ver [`contexto/deudas.md`](contexto/deudas.md)).

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3028/3028 verdes |
| Tests E2E | 231/231 verdes en 11 suites (verificado el 2026-07-25 corriendo `npx playwright test`). El desglose por suite no se transcribe acá: lo reporta la propia corrida. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### fix(deudas): DIS.2, 8 correcciones de la auditoría de diseño sobre Deudas · 2026-07-25

Auditoría de diseño de la sección (10 hallazgos): se aplican las 7 correcciones listas más D9. Lo grande: una deuda **saldada** dejaba su chip "Vence hoy" en rojo junto al "Saldada" en verde, porque el chip se calculaba antes de saber si la deuda seguía viva; ahora se apaga y el subtítulo se fecha con el último abono ("Saldada el 22 de julio"). Los tres "Aplicar" del simulador dejan `.btn-primary` y visten frambuesa como Abonar, así que queda **un solo verde por sección** (extiende el ADR 036 D6 a todo confirmador). El chip de vencimiento baja del nombre a la fila de chips (nombre de 62px a 36px), Abonar sube a 44px, el estado vacío y el encabezado comparten un solo verbo y un solo botón, y el hero explicita "en 3 deudas por pagar · 1 saldada". `DESIGN_SYSTEM.md` gana R7 (estado terminal) y R8 (una acción principal). **Sin aplicar, esperan tu decisión:** VD1 (plegar el detalle del plan, revisa el ADR 011 rev D.7) y D10 (el CSS muerto que VD1 reutilizaría). 3028/3028 unit + 231/231 E2E verdes. SW v417→v418.

---

### fix(inicio): V1, el acento de marca deja de medir el gasto semanal · 2026-07-25

Cierra la auditoría de diseño de Inicio: era la única pieza que quedaba abierta porque revisaba un ADR aceptado. El mini gráfico semanal pintaba el día de **mayor gasto** con el esmeralda que el principio 7 reserva para dinero disponible y logro; pasa a familia Gastos (barras 28 %, pico 100 %, etiqueta en `--fk-dom-gastos-text`, que en tema claro baja a `#d13b00` para pasar AA). El chip "12 % menos" sigue verde: bajar el gasto sí es logro (ADR 019). Formalizado en el [ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md) porque revisa el ADR 034 D6 (regla 2.7). `DESIGN_SYSTEM.md` recibe además las 6 reglas repetibles de la auditoría (R1 a R6) y la de radios del H12. Solo CSS y documentación. 3007/3007 unit verdes. SW v416→v417.

---

### docs(reorg): Fases 1 y 2 de la reorganización documental · 2026-07-24

Auditoría de los 89 `.md` con 7 subagentes y ejecución de la consolidación: tablero purgado de narrativa cerrada (**-32,2 %**, con las 49 tarjetas vivas verificadas una por una), `AGENTS.md` reducido a stub trackeado, `CLAUDE_DESIGNS_PROMPT.md` archivado, y 11 correcciones de veracidad (deuda técnica, conteo de dominios, 9 eventos del EventBus, ADR 002, rutas muertas, sección 7 de CLAUDE.md que era inverificable). Contrato y fases 3 a 5 en [`MIGRACION.md`](MIGRACION.md) y en la tarjeta DOC.1 del tablero. Sin tocar `modules/`.

_(Entrada escrita ya con la disciplina nueva: 3 líneas, no 15. El detalle vive en el CHANGELOG y el porqué en MIGRACION.md.)_

---

### feat(metas): EDIT.1a editar sin destruir el progreso · 2026-07-23

Primera de cuatro rebanadas del patrón **P3** de la auditoría (no se puede editar, corregir obliga a destruir). Metas solo permitía crear, abonar y eliminar; corregir un nombre o un objetivo mal escrito obligaba a eliminar y recrear la meta, perdiendo el progreso acumulado. Apartados, Inversión y Me deben quedan como las tres rebanadas siguientes en **EDIT.1**. Botón "Editar" junto a Abonar/Eliminar, mismo formulario prellenado. **El punto financiero:** `normalizarMeta(datos, metaExistente = null)` conserva `montoActual` tal cual al editar (no se resetea ni se toca el histórico de aportes) y recalcula `completada` contra el nuevo objetivo, porque cambiarlo puede cruzar el umbral de cumplimiento en cualquier dirección. De paso, el formulario dejó de ser un singleton reusado (necesitaba resetear el picker de ícono a mano) y pasó a reinyectarse completo en cada apertura, mismo patrón que Gastos/Agenda/Compromisos. Ficha de contexto nueva `docs/contexto/metas.md` (primera vez que se analiza la sección a fondo). 16 unit + 4 E2E nuevos. 2981/2981 unit + 231/231 E2E + lint verdes. SW v414→v415.

---

### feat(gastos): TX.12 gastos frecuentes y "Repetir" · 2026-07-23

Segunda pieza del patrón **P2** de la auditoría (la primera fue CAL.5a, la misma tarde): cierra el patrón por completo. El gasto cotidiano (almuerzo, café, Uber) se teclea entero cada vez; ahora dos atajos, sin dato nuevo. **Chips de un toque en "Nuevo gasto":** `gastosFrecuentes()` (nueva, pura, `gastos/logic.js`) agrupa el historial por categoría + monto redondeado a $1.000 + descripción normalizada, y ofrece los patrones que se repiten 3+ veces en 60 días; un click prellena monto/categoría/cuenta y deja el foco en "Guardar". Solo al crear, nunca al editar. **"Repetir" en cada fila de la lista:** abre el modal en modo creación con los datos de esa fila exacta (incluida la nota), fechado hoy. **Excluye gastos con `compromisoId`** (pagos de fijo/abono): esos los repite su propio dominio dueño. **Decisión de diseño:** el chip de frecuente NO prellena la nota (sintetiza de varios registros, sería ambigua); "Repetir" de una fila SÍ (apunta a un registro concreto y conocido). Ambos comparten `_prellenarCamposGasto()` en `gastos/index.js`. 23 unit + 2 E2E nuevos. 2965/2965 unit + 227/227 E2E + lint verdes. SW v413→v414.

---

> Para tareas anteriores (feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100). **Deuda técnica conocida: 2 errores abiertos**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [`docs/BUGS.md`](BUGS.md).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

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

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → accesos, agenda, ahorro, analisis, apartados, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               movimientos, personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
pnpm perf                     # harness de rendimiento (scripts/perf/), no toca pnpm test
```
