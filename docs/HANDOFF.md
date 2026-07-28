# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-27. Última tarea cerrada: MC.16, la tarjeta de crédito queda decidida como producto de Deudas ([ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) aceptado, alternativa B) y re-cortada en 5 rebanadas.

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
| Tests unitarios + integración | 3201/3201 verdes |
| Tests E2E | 235/235 verdes en las 11 suites, corrida completa el 2026-07-27. El desglose no se transcribe acá: lo reporta la propia corrida. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(tesoreria): MC.16, la tarjeta de crédito se decide como producto de Deudas · 2026-07-27

[ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) pasa de Abierta a **Aceptada** con la alternativa **B**: la tarjeta es un producto de Deudas con `cupoTotal`, no un tipo de cuenta. Lo decidió el análisis del modelo actual: la deuda de tarjeta ya existe en `CATEGORIAS_DEUDA` con su tasa EA, `Gasto.compromisoId` ya mueve el saldo de una deuda y lo sincroniza al editar y eliminar, y `calcularActivos()` no lee `compromisos`, así que la I5 del ADR 053 (el cupo nunca es un activo) se cumple sin tocar Análisis. El consumo con tarjeta es un gasto sin cuenta, con `consumoTC` fijando el signo. Saldo revolvente, una deuda por tarjeta. MC.16 queda re-cortada en 5 rebanadas (MC.16a a MC.16e). Sin código: es el paso que el ADR exigía antes de escribir la primera línea. Sin tocar `modules/`, no hay tests que correr ni SW que bumpear.

---

### fix(tesoreria): MC.13f, confirmar el cobro que Finko no puede datar · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `estadoDistribucion` descarta los cobros anteriores a la creación del ingreso (bien: evita un falso "ya recibiste"), pero eso dejaba a quien registra un ingreso **a mitad de periodo**, con la quincena ya cobrada, sin poder distribuir hasta el cobro siguiente; y el CTA "Distribuir" del detalle del día de Calendario abría un asistente que no dejaba avanzar. **El estado `'pendiente'` ya era exactamente ese caso** (no había otro camino a esa rama), así que en vez de un quinto estado se renombró a `'por-confirmar'` y ahora devuelve la fecha candidata en vez de `null`: la tarjeta pregunta "Registraste este ingreso después del 5 de jul, así que no sabemos si ese pago te llegó" con el botón "Sí, recibí el pago del 5 de jul". **La fecha no es cosmética:** es el `periodoISO` que el guard de de-duplicación sella al confirmar, así que limitarse a habilitar el botón habría permitido distribuir el mismo periodo dos veces. La respuesta vive en `S.config.cobroConfirmadoPeriodo`, campo opcional sin declarar ni migrar como los dos que ya conviven ahí, **sin bump de schema**. Calendario no se toca: el guard del asistente ya cubría a sus callers externos, así que su CTA ahora encuentra la pregunta. Cero CSS nuevo. **Sin aplicar:** BUG-017 (el Quincenal que pierde un cobro), que se revisó como pedía la tarjeta y resultó vivir en otro archivo (`ocurrenciasEnMes`) y necesitar tu decisión porque cambia lo que muestra el Calendario. 8 tests nuevos. 3201/3201 unit + 235/235 E2E + lint verdes. SW v433 → v434.

---

### fix(gastos): TX.12b, el chip de gasto frecuente ofrece el monto real · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `gastosFrecuentes()` agrupa por monto redondeado a $1.000 para detectar el patrón (6 cafés de $6.500 son "el mismo café"), pero el chip prellenaba ese monto redondeado en vez del real: tocar "Café $7.000" escribía $7.000 para un gasto de $6.500. El redondeo sigue siendo la clave de agrupación; el grupo ahora expone el monto del registro más reciente, sin redondear, en el mismo bloque que ya actualizaba la cuenta con ese criterio. 3 tests nuevos, separados de los que fijan la agrupación. 3193/3193 unit + lint verdes. SW v432 → v433.

---

### fix(metas): MT.7, prellenar el monto del abono con la cuota del período · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. La tarjeta de la meta ya mostraba "$X por quincena/mes" (motor MC.13b), pero el formulario de abono abría el campo de monto vacío; Apartados y Fondo ya prellenaban con ese mismo criterio. `renderFormAbonoMeta` ahora calcula la cuota del período y, si hay fecha límite (el motor la necesita para sugerir un ritmo), prellena el campo con ese monto. Sin fecha límite el campo sigue vacío, igual que antes. 2 tests nuevos. 3190/3190 unit + lint verdes. SW v431 → v432.

---

### fix(metas): DIS.13, 6 correcciones de la auditoría de diseño sobre Metas · 2026-07-27

Auditoría de diseño de una sección bien pensada y mal armada en móvil (8 hallazgos): se aplican 6. Lo grande: **la fila de una meta se rompía y el arreglo ya estaba escrito**. `responsive.css` tiene un grid móvil de dos renglones cuyo comentario dice desde siempre que cubre Metas, pero su guarda es `:has(.list-item__meta)` y la vista nunca emitía esa clase: metía el monto en el subtítulo y los tres botones en la columna de acciones. Medido a 390px, el cuerpo recibía 60px, el nombre se partía a mitad de palabra en 4 líneas y la fila medía 426px de alto; ahora el cuerpo pasa a 148px, el nombre a 2 líneas y la fila a 263px (-38%), con **una línea** de CSS nuevo, la que sube la columna del ícono de 40 a los 56px que mide el anillo (R56 nueva). El monto sube a su columna con el objetivo debajo y "+ Abonar" se muda con ellos, y el subtítulo baja de cuatro datos a dos: el progreso se decía tres veces en la misma fila (el anillo, el subtítulo y la línea de abajo) y el ritmo de ahorro, que es el consejo, pasa a su propia línea. **Una meta cumplida ya no desaparece de la app**: hasta hoy salía de la lista y no había ninguna pantalla donde verla, editarla ni borrarla, porque su DOM ni se pintaba; ahora baja a un bloque "Metas cumplidas", apagada pero presente y editable. **El ojo de privacidad por fin rige en Metas** (el porcentaje se conserva: el ojo esconde pesos, no progreso) y el `aria-hidden` del contenedor del anillo se va, que borraba la etiqueta del único sitio donde vive el porcentaje. De paso, `#lista-metas` recupera la separación entre filas: no tenía una sola regla en `styles/`. `DESIGN_SYSTEM.md` gana R56. **Sin aplicar:** la máscara del ojo en el consolidado "Tu ahorro total" y los emoji de ese bloque (lo renderiza `ahorro/view.js` y lo comparten las cuatro secciones del hub; los emoji ya los arregló DIS.12), el `btn-sm` a 36px contra la R4 (misma decisión abierta desde el Fondo, cuarta sección que la reporta) y el selector de categoría, que el propio informe pide dejar para MT.6 porque el ADR 048 va a tocar ese control. 3188/3188 unit + lint verdes; 235/235 E2E. SW v430 a v431.

---

> Para tareas anteriores (fix(fondo) DIS.12 las 9 correcciones de la auditoria de diseno sobre Fondo de emergencia, fix(calendario) DIS.11 las 11 correcciones de la auditoria de diseno sobre Calendario, fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

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
