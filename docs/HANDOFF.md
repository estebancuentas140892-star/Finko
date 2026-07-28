# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-27. Última tarea cerrada: TX.12b, el chip de gasto frecuente ofrece el monto real y no el redondeado que sirve de clave de agrupación (ver [`contexto/gastos.md`](contexto/gastos.md)).

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
| Tests unitarios + integración | 3193/3193 verdes |
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

### fix(gastos): TX.12b, el chip de gasto frecuente ofrece el monto real · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `gastosFrecuentes()` agrupa por monto redondeado a $1.000 para detectar el patrón (6 cafés de $6.500 son "el mismo café"), pero el chip prellenaba ese monto redondeado en vez del real: tocar "Café $7.000" escribía $7.000 para un gasto de $6.500. El redondeo sigue siendo la clave de agrupación; el grupo ahora expone el monto del registro más reciente, sin redondear, en el mismo bloque que ya actualizaba la cuenta con ese criterio. 3 tests nuevos, separados de los que fijan la agrupación. 3193/3193 unit + lint verdes. SW v432 → v433.

---

### fix(metas): MT.7, prellenar el monto del abono con la cuota del período · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. La tarjeta de la meta ya mostraba "$X por quincena/mes" (motor MC.13b), pero el formulario de abono abría el campo de monto vacío; Apartados y Fondo ya prellenaban con ese mismo criterio. `renderFormAbonoMeta` ahora calcula la cuota del período y, si hay fecha límite (el motor la necesita para sugerir un ritmo), prellena el campo con ese monto. Sin fecha límite el campo sigue vacío, igual que antes. 2 tests nuevos. 3190/3190 unit + lint verdes. SW v431 → v432.

---

### fix(metas): DIS.13, 6 correcciones de la auditoría de diseño sobre Metas · 2026-07-27

Auditoría de diseño de una sección bien pensada y mal armada en móvil (8 hallazgos): se aplican 6. Lo grande: **la fila de una meta se rompía y el arreglo ya estaba escrito**. `responsive.css` tiene un grid móvil de dos renglones cuyo comentario dice desde siempre que cubre Metas, pero su guarda es `:has(.list-item__meta)` y la vista nunca emitía esa clase: metía el monto en el subtítulo y los tres botones en la columna de acciones. Medido a 390px, el cuerpo recibía 60px, el nombre se partía a mitad de palabra en 4 líneas y la fila medía 426px de alto; ahora el cuerpo pasa a 148px, el nombre a 2 líneas y la fila a 263px (-38%), con **una línea** de CSS nuevo, la que sube la columna del ícono de 40 a los 56px que mide el anillo (R56 nueva). El monto sube a su columna con el objetivo debajo y "+ Abonar" se muda con ellos, y el subtítulo baja de cuatro datos a dos: el progreso se decía tres veces en la misma fila (el anillo, el subtítulo y la línea de abajo) y el ritmo de ahorro, que es el consejo, pasa a su propia línea. **Una meta cumplida ya no desaparece de la app**: hasta hoy salía de la lista y no había ninguna pantalla donde verla, editarla ni borrarla, porque su DOM ni se pintaba; ahora baja a un bloque "Metas cumplidas", apagada pero presente y editable. **El ojo de privacidad por fin rige en Metas** (el porcentaje se conserva: el ojo esconde pesos, no progreso) y el `aria-hidden` del contenedor del anillo se va, que borraba la etiqueta del único sitio donde vive el porcentaje. De paso, `#lista-metas` recupera la separación entre filas: no tenía una sola regla en `styles/`. `DESIGN_SYSTEM.md` gana R56. **Sin aplicar:** la máscara del ojo en el consolidado "Tu ahorro total" y los emoji de ese bloque (lo renderiza `ahorro/view.js` y lo comparten las cuatro secciones del hub; los emoji ya los arregló DIS.12), el `btn-sm` a 36px contra la R4 (misma decisión abierta desde el Fondo, cuarta sección que la reporta) y el selector de categoría, que el propio informe pide dejar para MT.6 porque el ADR 048 va a tocar ese control. 3188/3188 unit + lint verdes; 235/235 E2E. SW v430 a v431.

---

### fix(fondo): DIS.12, 9 correcciones de la auditoría de diseño sobre Fondo de emergencia · 2026-07-27

Auditoría de diseño de la sección con el mejor motor de consejo de la app y el peor cuidado en los bordes (9 hallazgos): se aplican los 9. Lo grande: **la barra del consolidado contradecía su propio porcentaje**, porque es la columna elástica de un grid y se quedaba con el sobrante de lo que midieran el nombre y el monto: pistas de 13, 35, 48 y 52px a 390px, así que el relleno del 16% se dibujaba más largo que el del 51%; en móvil la fila pasa a dos renglones y las cuatro pistas miden 310,2px con los rellenos ya proporcionales (R54 nueva). **"Desactivar fondo" ocupaba el lugar de Cancelar**, con el mismo `btn-ghost` y el mismo aspecto, y al editar no había Cancelar: ahora la salida vuelve a su sitio y la acción destructiva baja a su propia fila con `.btn-danger`, en la clase nueva `.modal__footer-secundario`, que es la única pieza nueva de la entrega (R53 nueva). **El anillo del hero no se anunciaba**: el `aria-hidden` del contenedor borraba el `role="img"` y la etiqueta que el propio código construía, así que el dato principal del hero era inaccesible; se quita y la etiqueta pasa a "60% de tu objetivo" (R52 nueva). Los cuatro vehículos dejan los emoji del sistema operativo y toman el símbolo del sprite con el color de su dominio, la lista de aportes deja de poner el monto como título y adopta la anatomía del resto de la app, el enlace "Ver →" sube de 18 a 44px, el compromiso mensual deja el ícono de Deudas por el de recurrencia, el aviso de nivel alto pasa a `role="alert"` (R55 nueva) y se borran cuatro reglas de CSS muerto del hero. `DESIGN_SYSTEM.md` gana R52 a R55. **Sin aplicar:** la mitad abierta de A8 (`responsive.css` fija `.btn-sm` en 36px con un comentario deliberado y la R4 pide 44: el sistema dice las dos cosas y es decisión tuya) y la misma corrección del anillo en Metas y Apartados, que entra con sus auditorías. 3171/3171 unit + lint verdes. SW v429 a v430.

---

### fix(calendario): DIS.11, 11 correcciones de la auditoría de diseño sobre Calendario · 2026-07-27

Auditoría de diseño de la sección más completa de la app (13 hallazgos): se aplican 11. Lo grande: **tocar un día no cambiaba nada de lo que se ve**, porque `renderAgenda()` pintaba el panel del día en 911,7px de una pantalla de 844 y ni el scroll ni el foco se movían; ahora el detalle se emite junto a la grilla y el foco va a su título, que es lo que lo trae a pantalla y lo anuncia (R46 nueva). **Lo vencido era lo más tenue del mes**: la opacidad 0,5 de "pasado" cubría también los días con pagos vencidos y hundía el número de 14,46:1 a 4,55:1 y los puntos hasta 2,14:1, mientras la tarjeta de arriba decía "5 pagos ya vencieron"; la atenuación queda solo para los días pasados sin eventos y el día con un fijo vencido toma la familia warning, nunca danger (R47 nueva). **Las filas del modal de lote no tenían borde**: `.lote-row` pedía `var(--fk-border)`, un token que no existe, y una `var()` inválida invalida la declaración entera, así que la pantalla donde se confirma mover dinero no tenía señal de foco por fila. En la fila del día **el monto era el texto más pequeño y más apagado** (12px gris en la segunda línea): vuelve al primer renglón a la derecha, en 14px/700 tabular. La tarjeta que propone pagar N ahora dice cuánto suman antes de abrir el flujo (R50 nueva), el mes en cero deja de decir lo mismo tres veces y con dos primarios (R51 nueva), la nav de mes conserva el foco y anuncia el mes nuevo (R48 nueva), el punto del día de ingreso pasa a anillo para no depender solo del color (R49 nueva), cuatro controles llegan a 44px y el banner de propósito toma por fin el índigo de la sección. **Por decisión tuya:** la leyenda pasa a pie de la tarjeta y deja de ser sticky (revisa AG.6: eran 65,7px de chrome que ni se veían en el primer pantallazo) y la grilla abandona `role="grid"` en vez de simular filas. `DESIGN_SYSTEM.md` gana R46 a R51. **Sin aplicar:** el alto del formulario de gasto fijo (900,4px en una hoja de 776; lo fijó el ADR 042 D3 y se decide junto con la V2 de Gastos) y la marca de vencido en deudas (entra con CAL.5b, que ya va a tocar ese filtro). 3156/3156 unit + lint verdes; 235/235 E2E. SW v428 a v429.

---

> Para tareas anteriores (fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

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
