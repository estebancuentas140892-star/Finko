# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-07)

### fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity (BUG-007, BUG-008) · 2026-07-03

Cierra los dos bugs de baja prioridad de la revisión de Mis cuentas, dejando la sección sin bugs pendientes salvo BUG-009 (media, requiere una decisión de diseño).

**BUG-007:** el formulario de cuenta, al activar la cuota de manejo, decía "Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Calendario y en Deudas." La sección Deudas solo lista deudas desde la reestructuración v6 (los gastos fijos, incluida la cuota de manejo, se gestionan en Calendario); el copy quedó desactualizado desde entonces. Fix de una línea en [tesoreria/view.js](../modules/dominio/tesoreria/view.js): "Lo verás en Calendario."

**BUG-008:** `validarIngreso()` y `validarCuenta()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaban `isNaN(x) || x <= 0` (o `< 0`) para validar montos. `isNaN(Infinity)` es `false`, así que un monto como `'1e999'` (que `Number()` convierte a `Infinity`) pasaba la validación: un ingreso o saldo Infinity contaminaba la distribución sugerida con montos no representables en pantalla, y al persistir `JSON.stringify` lo serializaba silenciosamente como `null`, dejando un dato corrupto en `localStorage`. Fix: los tres guards (`monto` de ingreso, `saldo` de cuenta, `cuotaManejoMonto`) cambian a `!Number.isFinite(x)`, que rechaza `NaN`, `Infinity` y `-Infinity` por igual. El guard de `cuotaManejoDia` ya usaba `Number.isInteger`, que también excluye `Infinity`; se simplificó quitando el `isNaN` redundante que llevaba delante.

El alcance de BUG-008 se mantuvo en tesorería, como quedó registrado originalmente ("el patrón probablemente se repite en otros dominios: confirmarlo al revisar cada sección"); extenderlo ahora a otros dominios habría sido un cambio de alcance no pedido.

Verificado con 4 tests unitarios nuevos (`validarIngreso` rechaza monto Infinity; `validarCuenta` rechaza saldo Infinity y -Infinity; la cuota de manejo rechaza monto Infinity). Sin E2E nuevo: el copy no tenía ninguna aserción existente que actualizar y el cambio de validación ya está cubierto a nivel de lógica pura. 1866/1866 → 1870/1870 unit; 106/106 E2E sin cambios (sin regresiones). Lint limpio. SW v267 → v268.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Copy de la cuota de manejo: "Lo vas a ver en Calendario y en Deudas." → "Lo verás en Calendario." |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso()`, `validarCuenta()`: `isNaN` → `!Number.isFinite` en los 3 guards de monto/saldo; guard de `cuotaManejoDia` simplificado. |
| `tests/unit/tesoreria.test.js` | 4 tests nuevos (BUG-008): rechazo de Infinity en monto de ingreso, saldo de cuenta (positivo y negativo) y monto de cuota de manejo. |
| `service-worker.js` | v267 → v268. |
| `docs/BUGS.md` | BUG-007 y BUG-008 resueltos (eliminados). |

---

### fix(compromisos): el abono extra a deudas desde "Distribuir mi ingreso" registra el gasto (BUG-006); nuevo BUG-009 · 2026-07-03

Cuarto bug de la revisión de Mis cuentas, ya de prioridad media. El panel "Distribuir mi ingreso" permite abonar un extra a cada deuda pendiente (sección "Abonar extra a deudas", aparte de la cuota del checklist de Necesidades). Al confirmar, el abono extra bajaba el `saldoTotal` de la deuda y descontaba la cuenta de origen, pero no dejaba ningún registro de gasto: el handler de `distribucion:aplicar` en [compromisos/index.js](../modules/dominio/compromisos/index.js) solo hacía `editar('compromisos', ...)` con el nuevo saldo. El abono quedaba invisible para Análisis (que lee los gastos del mes), para el ejecutado por grupo de Límites (ADR 017) y para el guard "ya pagado este periodo" del propio checklist. El flujo de abono individual (`_guardarAbono`) y el pago de cuota del checklist (`_aplicarNecesidad`) sí registran ese gasto; el abono extra era el único de los tres que no lo hacía.

El fix agrega al handler la creación del gasto-abono con el mismo shape que los otros dos flujos (`descripcion: 'Abono: <deuda>'`, categoría "Deudas", `compromisoId`, `cuentaId`), leyendo `cuentaOrigenId` del payload del evento (ya viajaba, el handler no lo destructuraba). El handler sigue sin tocar la cuenta: el descuento del saldo lo centraliza tesorería en `_confirmarDistribucion` (el monto ya está en `descontable`), así que no hay doble descuento. La slice `gastos` ya estaba en `_SLICES_DISTRIBUCION` (agregada en MC.7d slice 1), de modo que "Deshacer" revierte también el nuevo gasto sin cambios extra.

**BUG-009 detectado al implementar este fix (registrado, no corregido aquí):** una misma deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra" (input en 0). Si el usuario marca la cuota y además escribe un extra para esa deuda, ambos se aplican y la cuenta se debita `cuota + extra` mientras la deuda solo puede bajar hasta 0; con montos cercanos al saldo se sobrepaga. Es preexistente en la matemática de la cuenta (el `descontable` ya debitaba ambos); este fix solo lo hizo visible al crear el segundo gasto. Requiere una decisión de diseño (¿se permite pagar cuota + extra en un mismo movimiento, o una deuda ya en el checklist no debe ofrecerse también como extra?), por eso se registró como BUG-009 en vez de ampliar el alcance de esta tarea.

Verificado con 2 E2E nuevos en Chromium real: una deuda con `cuotaMensual: 0` (para que aparezca solo en "Abonar extra", aislando la ruta) recibe un abono extra de $500.000, y al confirmar se crea el gasto con el shape correcto, la deuda baja a $1.500.000 y la cuenta se descuenta una sola vez; el segundo test confirma que "Deshacer" borra el gasto y restaura saldo de deuda y cuenta. El fix vive en el handler de EventBus (capa `index.js`, no cubierta por unit tests, excluida de coverage por diseño), de ahí que la verificación sea E2E. La verificación en el preview interactivo mostró el módulo `compromisos/index.js` cacheado de una sesión anterior (el servidor sí sirve el código nuevo, confirmado por fetch; `location.reload()` no invalida la caché heurística de módulos ES de `python -m http.server`), comportamiento ya documentado en la memoria del entorno; la E2E en Chromium fresco (contexto nuevo por test) es la verificación autoritativa. 1866/1866 unit; 104/104 → 106/106 E2E. Lint limpio. SW v266 → v267.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | El handler de `distribucion:aplicar` crea el gasto-abono (mismo shape que el abono individual) y lee `cuentaOrigenId` del evento; importa `hoy` de utils. |
| `tests/e2e/smoke.test.js` | Suite nueva "abono extra a deudas (BUG-006)", 2 tests (registro del gasto + Deshacer). |
| `service-worker.js` | v266 → v267. |
| `docs/BUGS.md` | BUG-006 resuelto (eliminado); BUG-009 nuevo. |

---

### fix(tesoreria): la cuota de manejo cuenta como gasto fijo mensual (BUG-005) · 2026-07-03

Tercer bug de prioridad alta de la revisión exhaustiva de Mis cuentas. Cuando el usuario marca "esta cuenta cobra cuota de manejo mensual" en el formulario de cuenta, Finko crea un compromiso fijo vinculado (`esCuotaManejo: true`) que representa ese cobro recurrente. Ese compromiso nacía con `frecuencia: 'mensual'` en minúscula, pero todo el resto de la app compara contra `'Mensual'` capitalizado: el catálogo `FRECUENCIAS`, la tabla `_FACTOR_MENSUAL` de tesorería y la `FACTOR_MENSUAL` de compromisos. El resultado era una cuota fantasma: no sumaba en `calcularGastosFijosMensuales` (factor `undefined → 0`), así que no entraba en las Necesidades del modelo de distribución (`construirContextoDistribucion` → `sugerirDistribucionIngreso`), no inflaba el objetivo del fondo de emergencia (gastos fijos × meses de respaldo), no aparecía en el checklist de Necesidades de "Distribuir mi ingreso" (que filtra por `frecuencia === 'Mensual'`) y proyectaba $0 como equivalente mensual en la lógica de Deudas. Solo se veía en Calendario, y por casualidad: `_diasParaCompromiso` de Agenda trata cualquier frecuencia no reconocida como mensual (fallback conservador de su `default`).

El fix tiene dos partes, porque hay dos poblaciones de datos. Para las cuotas que se creen de ahora en adelante, `compromisoDesdeCuotaManejo()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) escribe `'Mensual'`. Para las cuotas ya guardadas en los dispositivos de los usuarios, una migración idempotente v19 → v20 en [storage.js](../modules/core/storage.js) capitaliza la `frecuencia` de los compromisos con `esCuotaManejo === true` que tengan exactamente `'mensual'` (los que ya están en `'Mensual'`, o cualquier otro valor, se dejan igual; sin `esCuotaManejo` no se tocan). Como todas las migraciones del proyecto, corre en memoria (`S`) en cada `loadData()` y se persiste en el siguiente `save()`, no fuerza una escritura al cargar; el efecto es visible de inmediato porque la UI lee de `S`.

Este cambio hace, por diseño, que la cuota de manejo aparezca ahora como una Necesidad marcable en "Distribuir mi ingreso": es una obligación mensual real, coherente con que el usuario pueda registrar su pago desde ahí igual que cualquier otro fijo (mismo `_pagadoEstePeriodo` compartido, sin doble registro con Calendario). Observación menor detectada al verificar en el navegador, no corregida aquí (es preexistente y ortogonal): el resumen de la tarjeta de distribución redondea a porcentaje entero, así que una necesidad de $15.000 sobre un ingreso de $3.000.000 (0,5%) se muestra como 1% · $30.000 en el resumen agregado, aunque el checklist muestra el monto exacto; afecta a cualquier necesidad pequeña, no solo a la cuota de manejo.

Verificado con 6 tests unitarios nuevos (4 de la migración v19→v20: capitaliza la cuota, no toca un fijo normal, idempotente sobre 'Mensual', no-op sin compromisos; 2 de integración: la cuota generada cuenta en `calcularGastosFijosMensuales` y aparece en `construirDesgloseNecesidades`), el shape esperado de `compromisoDesdeCuotaManejo` actualizado a `'Mensual'` (el test afirmaba el valor buggy y lo entrenaba), más 1 E2E en Chromium real que carga un estado v19 con la cuota en minúscula, comprueba que aparece en el checklist tras la migración y que confirmar la distribución persiste `'Mensual'`. Verificación adicional en el preview interactivo (cargó bien): una cuota de manejo de $15.000 aparece en el checklist con su monto exacto y contribuye al cálculo de Necesidades del modelo de distribución. 1861/1861 → 1866/1866 unit; 103/103 → 104/104 E2E. Lint limpio. SW v265 → v266.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'Mensual'` (era `'mensual'`). |
| `modules/core/storage.js` | Migración v19 → v20: capitaliza la frecuencia de las cuotas de manejo ya guardadas; `SCHEMA_VERSION` 19 → 20. |
| `tests/unit/storage.test.js` | 4 tests nuevos de la migración v19 → v20. |
| `tests/unit/tesoreria.test.js` | Shape de `compromisoDesdeCuotaManejo` a `'Mensual'`; 1 test de integración (la cuota cuenta en cálculos mensuales y checklist). |
| `tests/e2e/smoke.test.js` | 1 test nuevo: migración + aparición en el checklist + persistencia en Chromium real. |
| `service-worker.js` | v265 → v266. |

---

### fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas (BUG-003, BUG-004) · 2026-07-03

Corrige los dos bugs de prioridad alta encontrados en la revisión exhaustiva de Mis cuentas del mismo día (ver la entrada de abajo). Ambos vivían en el checklist accionable de Necesidades del panel "Distribuir mi ingreso" (MC.7d, ADR 018).

**BUG-003:** una fila del checklist ya pagada este periodo nace `checked disabled` para comunicar "esto ya está cubierto", pero un checkbox deshabilitado sigue reportando `.checked === true` en el DOM. `_leerNecesidadesMarcadas()` en [tesoreria/index.js](../modules/dominio/tesoreria/index.js) filtraba solo por `.checked`, así que confirmar la distribución con esa fila presente volvía a pagar un gasto o abono ya registrado: segundo gasto vinculado al mismo compromiso, segundo descuento de la cuenta. Fix de una línea: el filtro exige además `!chk.disabled`. Esto también corrige el resumen en vivo ("Asignado: $X"), que antes sumaba el monto de las filas ya pagadas.

**BUG-004:** `construirDesgloseNecesidades()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaba `cuotaMensual` de una deuda sin toparla contra su `saldoTotal` pendiente ni excluir las deudas ya saldadas (`saldoTotal <= 0`). Una deuda con cuota de $200.000 y saldo pendiente de solo $50.000 ofrecía y registraba el abono completo de $200.000: la deuda quedaba en $0 correctamente, pero $150.000 de más salían de la cuenta como gasto real, sin ningún lugar a donde ir. Una deuda ya saldada pero sin archivar seguía apareciendo como pendiente, algo que el formulario de abono individual ya rechazaba ("Esta deuda ya está saldada"). Fix: `monto = Math.min(cuotaMensual, saldoTotal)` y el filtro de entrada exige `saldoTotal > 0`, mismo criterio que ya usa `deudasPendientes` en `view.js` para las filas de "Abonar extra a deudas".

Verificado con 4 tests unitarios nuevos en `construirDesgloseNecesidades` (tope activo, tope no interfiere cuando el saldo alcanza, exclusión de deuda saldada, exclusión de saldo negativo) más 2 E2E nuevos en Chromium real que reproducen exactamente los escenarios de los bugs: confirmar con una Necesidad ya pagada presente no la duplica y el resumen en vivo la excluye; el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada, con el abono real registrado por el monto correcto. Verificación adicional en el preview interactivo (que esta vez sí cargó la app): confirmé la distribución en vivo con las tres condiciones a la vez (fijo ya pagado + deuda con cuota mayor al saldo + deuda saldada) y el saldo final de la cuenta, el conteo de gastos y el saldo de la deuda coincidieron con lo esperado. 1857/1857 → 1861/1861 unit; 101/101 → 103/103 E2E. Lint limpio. SW v264 → v265.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_leerNecesidadesMarcadas()` agrega `&& !chk.disabled` al filtro. |
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` topa el monto de deuda a `saldoTotal` y excluye deudas con `saldoTotal <= 0`. |
| `tests/unit/tesoreria.test.js` | `compDeudaBase()` gana `saldoTotal` por defecto; 4 tests nuevos de BUG-004. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos: BUG-003 (confirmar sin duplicar una fila ya pagada) y BUG-004 (tope de cuota + exclusión de deuda saldada). |
| `service-worker.js` | v264 → v265. |

---

### docs(revision): revisión exhaustiva de Mis cuentas, 6 bugs registrados (BUG-003 a BUG-008) · 2026-07-03

Arranque del plan de validación sección por sección acordado con el usuario (orden: seguir el flujo del dinero, empezando por Mis cuentas como base de todo y dominio con el cambio más reciente). La revisión cubrió el dominio completo (`tesoreria/logic.js`, `view.js`, `index.js`, 3.208 líneas), sus integraciones (crud, cuenta-helper, EventBus `distribucion:aplicar` en los 5 dominios consumidores, Agenda "Marcar pagado", abono individual de Deudas), los ADR que lo gobiernan (012, 013, 017, 018) y todo el copy de la sección. Cada sospecha se confirmó empíricamente antes de registrarse: 13 sondas unitarias (happy-dom) y 3 sondas E2E (Chromium real), temporales y no commiteadas; el fix de cada bug debe traer sus propios tests.

**Hallazgos registrados en [BUGS.md](BUGS.md):** BUG-003 (alta: una Necesidad "Ya pagado" se vuelve a pagar al confirmar la distribución, porque un checkbox `checked disabled` sigue estando checked), BUG-004 (alta: el checklist ofrece y registra la cuota completa de una deuda aunque el saldo pendiente sea menor, e incluye deudas ya saldadas sin archivar), BUG-005 (alta: la cuota de manejo nace con frecuencia 'mensual' en minúscula y queda fuera de gastos fijos mensuales, checklist, objetivo del fondo y equivalente mensual de Deudas; solo se ve en Calendario por un fallback), BUG-006 (media: el abono extra a deudas desde el panel baja deuda y cuenta pero no crea el gasto, invisible para Análisis y Límites), BUG-007 (baja: copy que promete ver la cuota de manejo "en Deudas") y BUG-008 (baja: las validaciones aceptan Infinity vía '1e999').

**Observaciones sin registro de bug (decisión del usuario pendiente):** el monto por defecto del panel para ingresos Quincenales es el mensual estimado (el doble del cobro real); sin día de pago no hay guard de periodo y una segunda confirmación acreditaría el ingreso dos veces; el copy del panel no avisa que el ingreso se acreditará a la cuenta (riesgo de doble conteo si el usuario ya actualizó su saldo a mano); la línea "Sugerencia: $X a ahorro" aparece aunque no haya destinos de ahorro; y la regla ADN #10 ("ningún dominio importa a otro") convive con 8+ imports cruzados de `logic.js` puro (analisis importa de 5 dominios, agenda de compromisos incluso en `index.js`, presupuesto de tesorería y gastos, config de export) mientras otros sitios duplican código citando esa misma regla: conviene un ADR que legalice el patrón "import de logic.js puro, solo lectura" o un refactor, pero no ambos criterios a la vez.

Sin cambios de código ni de service worker. Suites verificadas antes y después: 1857/1857 unit, línea base intacta.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | 6 entradas nuevas (BUG-003 a BUG-008) con causa, archivo, función y líneas. |
| `docs/HANDOFF.md` | Entrada de la revisión en "Qué se hizo recientemente". |

---

### feat(tesoreria): Necesidades pasa a checklist accionable en Distribuir mi ingreso (MC.7d, slice 1) · 2026-07-03

Primer slice de MC.7d: implementa las decisiones R1, R4 y R5 de la revisión 2026-07-02 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md). El desglose de Necesidades del panel "Distribuir mi ingreso" (un `<details>` de solo lectura desde MC.7c) pasa a ser una checklist accionable: el usuario marca los gastos fijos mensuales y las cuotas de deuda que cubre con este ingreso, y al confirmar, cada marca genera exactamente el mismo registro que su flujo individual existente, sin inventar un tipo de movimiento nuevo.

**Alcance decidido con el usuario antes de codear:** solo entran a la checklist los fijos con frecuencia Mensual y las deudas. Un fijo Quincenal, Semanal o Diario tiene más de una ocurrencia dentro del periodo del ingreso; como esta checklist modela una fila = un pago completo, incluirlo con su monto por ocurrencia habría dejado al usuario marcando como "cubierto todo el periodo" algo que en realidad solo cubre una fracción, ensuciando el badge "Ya pagaste este mes" de Agenda y registrando un gasto de menos. Modelar sus múltiples vencimientos (como ya hace `eventosDelMes` de Agenda) queda para una tarea futura. El shell de asistente paginado (avanzar/atrás entre pasos) y el recálculo del presupuesto de Ahorro sobre el remanente real tras las Necesidades marcadas (R3 del ADR) tampoco entran en este slice: quedan como tarjetas separadas en el BOARD para no mezclar tres decisiones de UI/producto distintas en un solo cambio.

En [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js), `construirDesgloseNecesidades(compromisos, gastos, hoy)` gana dos parámetros nuevos y cambia de comportamiento: antes mensualizaba cualquier frecuencia con `_FACTOR_MENSUAL` (un Mercado Quincenal de $150.000 se mostraba como $300.000/mes); ahora filtra directamente por `frecuencia === 'Mensual'` para fijos (las deudas no tienen este problema porque `cuotaMensual` ya es, por definición, la obligación completa del mes) y cada fila trae su `diaPago` y si ya está `pagado` este periodo. Dos privadas nuevas, `_prefijoMes()` y `_pagadoEstePeriodo()`, duplican el criterio de `estadoPagoMes()` de compromisos/logic.js (el mismo guard que usa el badge "Ya pagaste este mes" de Agenda: para un fijo, cualquier gasto vinculado el mes en curso cuenta como pagado; para una deuda, la suma de abonos del periodo debe alcanzar `cuotaMensual`). Es un duplicado intencional, no una importación cruzada: tesorería no puede importar de Compromisos (ADN #10). El orden de la lista pone primero los no pagados, de mayor a menor monto, y deja los ya pagados al final.

En [tesoreria/view.js](../modules/dominio/tesoreria/view.js), `_renderDesgloseNecesidades()` (el `<details>` de solo lectura) se elimina y su lugar lo toma `_filaNecesidad()`: checkbox, nombre, categoría, día de pago y monto. El monto no es editable a propósito, a diferencia de las filas de Ahorro/Deudas/Inversiones: es la cuota real de una obligación, no una asignación libre que el usuario deba calcular. Una fila ya pagada nace marcada y deshabilitada, con "Ya pagado" en vez del monto, para que no se pueda registrar el mismo pago dos veces. `_renderPanelDistribuir()` saca a Necesidades del bloque "Esto queda en tu cuenta (no se mueve)" (ya no aplica: ahora sí se mueve dinero) y la ubica como la primera sección accionable del panel, antes de Ahorro/Deudas/Inversiones, reflejando el orden de pasos del ADR. El panel completo ahora también se muestra cuando la única fuente de contenido son las Necesidades (antes exigía al menos un destino de ahorro, deuda o inversión para aparecer).

En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerNecesidadesMarcadas()` lee los checkboxes de la nueva checklist (monto fijo en `data-nec-monto`, no un input) y se combina con `_leerItemsDistribucion()` dentro de `_recalcularDistribucion()`, así el resumen en vivo ("Asignado: $X. Queda disponible: $Y") ya suma ambos grupos sin distinguir su origen. `_aplicarNecesidad()` escribe el pago directo en la colección `'gastos'` (para un fijo: mismo shape que "Marcar pagado este mes" de Agenda, categoría "Gastos fijos"; para una deuda: mismo shape que un abono, categoría "Deudas", más el descuento de `saldoTotal` topado en 0). Escribir `gastos`/`cuentas` directo desde tesorería no es una violación de ADN #10: es el mismo patrón que ya usan Agenda y Compromisos, un ledger compartido que cualquier dominio edita con `guardar`/`editar` de crud.js. `_confirmarDistribucion()` aplica cada Necesidad marcada dentro de la misma confirmación única que ya aplicaba Ahorro/Deudas/Inversiones (un solo `resolverCuenta`, ninguna pregunta adicional). **Hallazgo de R4 del ADR aplicado en este slice:** `_SLICES_DISTRIBUCION` (el snapshot para "Deshacer") no incluía la colección `'gastos'`; como este cambio hace que el Paso 1 cree gastos reales, se agregó esa slice, evitando que "Deshacer" dejara pagos huérfanos sin revertir.

**Bug de timing encontrado y corregido durante la verificación E2E (no era un bug de lógica):** los primeros intentos de los tests de confirmar/deshacer fallaban con el saldo y el gasto sin persistir, aunque el código corría sin lanzar ningún error (se confirmó agregando logging temporal directo en el código fuente, luego removido). La causa real: `save()` está debounced 200ms (ADN #5, "nunca escribir a `localStorage` directo") y los tests leían `localStorage` inmediatamente después del click de confirmar, antes de que el debounce hiciera el flush real a disco. Se corrigió agregando `page.waitForTimeout(400)` antes de leer `localStorage` en ambos tests, el mismo patrón que ya usan otros E2E del proyecto que verifican persistencia entre sesiones.

Verificado con 13 tests unitarios nuevos/reescritos en `construirDesgloseNecesidades` (fijos Mensuales con su monto tal cual; exclusión de Quincenal/Semanal/Diario; estado `pagado` según gasto/abono del periodo, incluyendo el caso de abono parcial que no cuenta como pagado; orden con los pagados al final aunque su monto sea mayor) más 4 E2E en Chromium real: la checklist lista fijos mensuales y deudas con su día de pago y excluye un fijo Quincenal; una Necesidad ya pagada aparece marcada y deshabilitada con "Ya pagado"; confirmar con una Necesidad marcada registra el mismo gasto que su flujo individual y descuenta la cuenta correctamente; "Deshacer" restaura el saldo y borra el gasto creado. El preview interactivo de este entorno no cargó la app (`chrome-error://chromewebdata/`, problema ya conocido de este entorno de trabajo); la verificación se apoyó en la suite E2E con Chromium real, que sí es una verificación de navegador genuina. 1851/1851 → 1857/1857 unit; 98/98 → 101/101 E2E. Lint limpio. SW v263 → v264.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` gana parámetros `gastos`/`hoy`, filtra solo fijos Mensuales (ya no mensualiza), agrega `diaPago` y `pagado` por fila; nuevas privadas `_prefijoMes()`, `_pagadoEstePeriodo()`. |
| `modules/dominio/tesoreria/view.js` | `_renderDesgloseNecesidades()` eliminada; nueva `_filaNecesidad()` (checklist accionable); `_renderPanelDistribuir()` mueve Necesidades a una sección accionable propia, primero en el panel. |
| `modules/dominio/tesoreria/index.js` | Nuevas `_leerNecesidadesMarcadas()`, `_aplicarNecesidad()`; `_confirmarDistribucion()` aplica los pagos de Necesidades marcadas; `_SLICES_DISTRIBUCION` suma `'gastos'`; listener de `change` para `[data-nec-toggle]`. |
| `styles/components/forms.css` | Nuevas `.distribuir__fila--pagado`, `.distribuir__nec-monto`; clases del `<details>` retirado eliminadas. |
| `tests/unit/tesoreria.test.js` | `construirDesgloseNecesidades`: 13 tests (exclusión por frecuencia, `pagado`, `diaPago`, orden). |
| `tests/e2e/smoke.test.js` | Suite "Distribuir mi ingreso: checklist de Necesidades" reemplaza el test de solo lectura de MC.7c; 4 tests nuevos. |
| `service-worker.js` | v263 → v264. |

---

### docs(adr): revisión de ADR 018, el Paso 1 del asistente pasa a checklist accionable · 2026-07-02

Prerequisito de MC.7d, sin cambios de código. Tras validar en la app el desglose read-only de Necesidades (MC.7c), el usuario dio la dirección nueva del 2026-07-02: cada grupo del asistente "Distribuir mi ingreso" debe mostrar sus registros como **checklist seleccionable que registra pagos reales**, no como lista informativa. Eso contradice la decisión 2 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md) (Paso 1 read-only, sin mover dinero), así que, siguiendo la regla del proyecto (tocar una decisión de un ADR requiere actualizarlo antes de codear), se revisó el ADR como tarea propia.

Se agregó la sección "Revisión 2026-07-02" con cinco decisiones nuevas, ancladas en el código que ya existe:

- **R1 (reemplaza la decisión 2):** la checklist de Necesidades muestra nombre, cuota del periodo actual (fijo: su `monto` por ocurrencia según su frecuencia; deuda: su `cuotaMensual`; nunca el saldo total ni el equivalente mensual normalizado) y día de pago. Los items marcados generan al confirmar exactamente los mismos registros que sus flujos individuales existentes: pago de fijo como "Marcar pagado este mes" de Agenda (gasto con `compromisoId`, categoría "Gastos fijos"), cuota de deuda como abono (baja `saldoTotal`, gasto de categoría "Deudas"). El guard "ya pagado este periodo" se comparte con el badge de Agenda (gasto del mes con `compromisoId`), lo que elimina el doble registro entre ambos flujos. Lo no marcado se comporta como hoy: queda en la cuenta y se paga al vencer.
- **R2:** una sola pregunta de cuenta al confirmar todo el asistente, con el patrón `cuenta-helper` (con una sola cuenta activa no se pregunta, regla de cuenta única). Se descartó preguntar cuenta por cada item: fricción multiplicada para el caso común.
- **R3:** los pasos se encadenan sobre el remanente real: el Paso 2 (Ahorro) sugiere sus aportes sobre el cobro menos las Necesidades marcadas, no sobre el porcentaje teórico del split; la validación total asignado ≤ monto del cobro es una sola para todo el asistente (generaliza `resumirPlanDistribucion`).
- **R4 (ajusta la decisión 6):** la confirmación única aplica también los pagos del Paso 1, con el mismo apply-plan por EventBus y snapshot de undo. Nota de implementación obligatoria: `_SLICES_DISTRIBUCION` en `tesoreria/index.js` hoy no incluye la slice `gastos`; como el Paso 1 crea gastos, hay que agregarla o el "Deshacer" dejaría pagos huérfanos.
- **R5 (confirma la decisión 7):** sin schema nuevo: los pagos son gastos normales con `compromisoId` y los abonos actualizan `saldoTotal`.

Las decisiones 2, 5 y 6 originales quedan marcadas con notas de revisión y su texto se conserva como historia. La tabla de slices refleja MC.7a/b/c entregados y amplía MC.7d (extender `construirDesgloseNecesidades` con cuota del periodo, día de pago y estado pagado; sumar `gastos` al snapshot); la nota de modelos de los slices restantes pasa a la escala Claude 5. El desglose construido en MC.7c no se tira: evoluciona a checklist en MC.7d.

En [BOARD.md](BOARD.md), la tarjeta MC.7d pasó de "requiere revisión de ADR 018 antes de codear" a "pendiente (diseño cerrado)", con el objetivo alineado a R1-R5, los archivos afectados precisados (`construirDesgloseNecesidades`, `_SLICES_DISTRIBUCION`, `_confirmarDistribucion`) y modelo de implementación `Sonnet 5 - Alto`.

Tarea solo de documentación: sin tests nuevos ni bump de service worker. Suites verificadas verdes antes del commit (1851/1851 unit).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/018-asistente-distribuir-ingreso.md` | Sección "Revisión 2026-07-02" (R1-R5, alternativas y consecuencias de la revisión); notas en las decisiones 2, 5 y 6; estado y autores actualizados; tabla de slices y modelos al día. |
| `docs/BOARD.md` | Tarjeta MC.7d actualizada: estado, objetivo R1-R5, archivos y modelo. |
| `docs/HANDOFF.md` | Entrada nueva en "últimas 5 tareas" (sale AG.5 del listado detallado). |

---

### feat(calendario): nombre automático según la categoría en el gasto fijo (AG.4) · 2026-07-02

El form de "Nuevo gasto fijo" pedía descripción y categoría como dos campos independientes y ambos obligatorios de hecho, pero para las 13 categorías predefinidas (Mercado, Arriendo, Servicios públicos, Internet...) esa pregunta doble es redundante: si el usuario elige "Mercado" como categoría, escribir "Mercado" otra vez como nombre no aporta nada. AG.4 resuelve esto haciendo que, al elegir una categoría predefinida, el nombre del registro sea la propia categoría, y el campo de texto libere su rol original para convertirse en una nota opcional (por ejemplo, con categoría "Mercado" el usuario puede anotar "Éxito de la esquina" o "unidad 302"). Solo con la categoría "Otro" (o sin categoría elegida) el campo de texto vuelve a ser el nombre obligatorio del gasto, exactamente como funcionaba antes.

En [compromisos/logic.js](../modules/dominio/compromisos/logic.js) se agregó `_categoriaFijoConNombreAuto(datos)`, un helper privado que evalúa si el tipo es `fijo`, la categoría pertenece al catálogo `CATEGORIAS_AGENDA` y es distinta de `'Otro'`. `validarCompromiso()` usa este helper para dejar de exigir `descripcion` cuando aplica (antes el chequeo de descripción vacía era incondicional para los tres tipos de compromiso). `normalizarCompromiso()` lo usa para decidir el shape final: con nombre automático, `descripcion = categoria` y lo que el usuario escribió se guarda en un campo nuevo `nota` (cadena vacía si no escribió nada); sin nombre automático, `descripcion` es el texto del usuario y `nota` queda `''`. El campo `nota` es nuevo en el schema de compromisos tipo fijo, pero es opcional, con valor por defecto `''`, y se lee de forma defensiva (`c.nota ?? ''` en el render); siguiendo el mismo criterio que ya usó la adición de `categoria` en MC.9-Agenda, no hace falta una migración de schema para los compromisos ya guardados.

En [agenda/view.js](../modules/dominio/agenda/view.js), `renderFormGastoFijo()` reordena los campos: la categoría pasa a ir primero y el nombre/nota después, para que la relación causa-efecto sea clara en la interfaz (elegís la categoría, el campo de abajo reacciona). El label del campo de nombre ahora tiene un id propio (`gfijo-descripcion-label`) para que JS pueda alternar su texto. En `_renderDetalleItem()`, el subtítulo deja de repetir la categoría cuando coincide exactamente con el nombre del registro (el caso de nombre automático, donde mostrarla de nuevo sería ruido: el título ya dice "Mercado"), pero la sigue mostrando cuando difieren (categoría "Otro" con un nombre propio, por ejemplo "Suscripción Xbox" con categoría "Otro"); además, cuando el registro tiene una nota, se agrega al final del subtítulo.

En [agenda/index.js](../modules/dominio/agenda/index.js) se agregó `_syncCategoriaGastoFijo(form)`, calcada del patrón que ya usó `_syncCategoriaMeta` en MT.3 para Metas: alterna el label ("Descripción" ↔ "Nota (opcional)"), el placeholder y el atributo `required`/`aria-required` del campo de texto según la categoría elegida en el `<select>`, enganchada al evento `change` del selector. Se llama también al (re)inyectar el formulario, tanto al crear un gasto nuevo (estado por defecto: sin categoría, campo requerido) como al editar uno existente. El prefill de edición ahora distingue: si el compromiso tiene nombre automático (categoría predefinida), el campo de texto se rellena con `compromiso.nota`, no con `compromiso.descripcion` (que sería igual a la categoría y no aportaría nada al reabrir el form).

Verificado con 10 tests unitarios nuevos (`validarCompromiso` y `normalizarCompromiso` con categoría predefinida, con "Otro" y sin categoría; el nuevo orden de campos del formulario y su estado por defecto; la supresión de la categoría duplicada en el subtítulo y el render de la nota) más 4 E2E en Chromium real: el label y el `required` cambian al elegir una categoría predefinida y vuelven al elegir "Otro"; guardar con una categoría predefinida y sin texto usa la categoría como nombre del registro; guardar con una categoría predefinida y una nota la muestra en el subtítulo del detalle del día. 1838/1838 → 1851/1851 unit; 94/94 → 98/98 E2E. Lint limpio. SW v262 → v263.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `_categoriaFijoConNombreAuto()`; `validarCompromiso()` deja de exigir descripción con nombre automático; `normalizarCompromiso()` deriva `descripcion`/`nota` para tipo fijo según la categoría. |
| `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` reordena categoría antes del nombre y agrega `#gfijo-descripcion-label`; `_renderDetalleItem()` suprime la categoría duplicada en el subtítulo y muestra la nota cuando existe. |
| `modules/dominio/agenda/index.js` | Nueva `_syncCategoriaGastoFijo(form)` (mismo patrón que `_syncCategoriaMeta` de MT.3); el prefill de edición usa `nota` en vez de `descripcion` cuando el nombre es automático. |
| `tests/unit/compromisos.test.js` | 6 tests nuevos: `validarCompromiso`/`normalizarCompromiso` con categoría predefinida, "Otro" y sin categoría. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: orden de campos y estado por defecto del formulario, supresión de la categoría duplicada, render de la nota en el subtítulo. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - nombre automático según la categoría", 4 tests. |
| `service-worker.js` | v262 → v263. |

---

### feat(calendario): emoji de categoría como ícono principal (AG.2) · 2026-07-02

En el detalle del día, un gasto fijo con categoría (Mercado, Internet, Arriendo, Servicios públicos...) mostraba el emoji de su categoría (`CATEGORIA_AGENDA_EMOJI`) únicamente dentro del subtítulo pequeño (` · 🌐 Internet`), mientras el ícono principal a la izquierda del registro seguía siendo el genérico por tipo, el mismo círculo para todos los gastos fijos sin distinción. Gastos ya había resuelto exactamente este problema (`CATEGORIA_EMOJI[catKey] ?? icon('gastos')` como ícono principal, con el emoji retirado del subtítulo para no repetirse): AG.2 porta ese mismo patrón a Agenda.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` calcula `emojiCategoria` (el emoji de la categoría cuando `tipo === 'fijo'` y el registro tiene `categoria`) y lo usa como ícono principal con `emojiCategoria ?? icon(ICONO_TIPO[tipo] ?? 'recurring')`: con emoji disponible, se muestra ese carácter directamente; sin categoría, o en deudas (`categoria` es un campo exclusivo de gastos fijos), cae al ícono SVG genérico de siempre, sin cambio de comportamiento. El subtítulo deja de repetir el emoji: pasa de ` · 🌐 Internet` a ` · Internet`, ya que el emoji ahora vive en el ícono principal y repetirlo sería ruido visual, igual que ya evita Gastos en `list-item__subtitle`.

En [config.css](../styles/components/config.css) se agregó `.cal-detail__icon--emoji`, aplicada solo cuando el ícono muestra un emoji de categoría, con un `font-size` de 1.375rem (más grande que el 1rem base del ícono con SVG) para que el emoji se lea con presencia como protagonista del registro, mismo criterio de tamaño que ya usa `.list-item__icon--cat` de Gastos (1.5rem, "emoji grande, protagonista", documentado en `atoms.css`).

**Corrección de un descuido de la tarea anterior (AG.7):** el commit de AG.7 documentaba el bump de `service-worker.js` de v261 a v262 tanto en el mensaje de commit como en HANDOFF y este mismo CHANGELOG, pero el archivo nunca se tocó: `CACHE_NAME` seguía en `finko-v261` después de ese push. Eso significa que los cambios de AG.7 (franja de color por tipo en el detalle del día) se desplegaron a producción sin invalidar el caché del service worker, así que los usuarios con una instalación PWA activa podían seguir viendo la versión sin la franja de color hasta que algún otro cambio bumpeara la caché. Este commit hace el bump real a v262, cubriendo retroactivamente AG.7 junto con AG.2.

Verificado con 5 tests unitarios (2 reescritos de una tarea anterior que asumían el emoji pegado al texto del subtítulo, un markup que este cambio reemplaza; 3 nuevos para el fallback sin categoría, el emoji sin `<svg>` con categoría, y que las deudas conservan el ícono genérico) más 2 E2E en Chromium real (con categoría, el ícono no contiene ningún `<svg>` y sí el carácter emoji; sin categoría, el ícono sí contiene un `<svg>`). 1835/1835 → 1838/1838 unit; 92/92 → 94/94 E2E. Lint limpio. SW v261 → v262 (bump real, corrige también el vacío dejado por AG.7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()`: el emoji de categoría pasa a ser el ícono principal (`emojiCategoria ?? icon(...)`); el subtítulo ya no repite el emoji, solo el nombre de la categoría. |
| `styles/components/config.css` | Nueva `.cal-detail__icon--emoji` (tamaño mayor para el emoji protagonista, mismo criterio que Gastos). |
| `tests/unit/agenda.test.js` | 2 tests reescritos (emoji ahora en el ícono principal, no en el subtítulo) + 3 tests nuevos (fallback sin categoría, sin `<svg>` con categoría, deuda con ícono genérico). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - emoji de categoría como ícono principal", 2 tests. |
| `service-worker.js` | v261 → v262 (bump real; corrige el vacío dejado por el commit de AG.7). |

---

### feat(calendario): identificación visual por color en los registros del día (AG.7) · 2026-07-02

En fechas cargadas (una quincena, el fin de mes) el detalle del día en Calendario mostraba todos los registros con el mismo aspecto visual: la única forma de distinguir un gasto fijo de una deuda con entidad o una deuda personal era leer su etiqueta de texto. AG.7 suma una identificación de color a cada item de la lista, reusando la misma paleta que AG.6 ya había fijado para los dots del mini calendario, así el significado de cada color es el mismo en toda la tarjeta.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` agrega la clase `cal-detail__item--${tipo}` al `<li>` de cada registro (el ícono ya tenía su propia clase `cal-detail__icon--${tipo}`, heredada de una tarea anterior, pero sin ningún CSS de color asociado hasta ahora). En [config.css](../styles/components/config.css), `.cal-detail__item` gana una franja lateral (`border-left: 3px solid`) que cada tipo colorea con su `--fk-dom-*` correspondiente: `--fk-dom-presupuesto` (amarillo) para fijo, `--fk-dom-compromisos` (rojo) para deuda entidad, `--fk-dom-personales` (rosa) para deuda personal. El padding izquierdo del item se recalcula con `calc(var(--fk-space-N) - 3px)` para que la franja no desplace el contenido ni el ícono; el ajuste se repite en el media query mobile porque ahí el padding base es más chico (`--fk-space-2` en vez de `--fk-space-3`). El ícono circular de cada registro también toma el color de su tipo (texto + un fondo tenue con `color-mix(in srgb, var(--fk-dom-*) 14%, var(--fk-bg-surface))`), mismo criterio de intensidad que ya usan los `dom-badge--*` de `nudges.css` para no saturar la tarjeta.

No hubo que decidir nuevos colores: como el calendario solo mapea `S.compromisos` (los mismos 3 tipos que ya cubría la leyenda de AG.6), la paleta ya estaba resuelta y consistente con el resto de la app. Cuando el ADR de recordatorios de aporte (AP.4/MT.2/AH.4) sume tipos nuevos al calendario, sumarán aquí su propia clase `cal-detail__item--<tipo>` con el mismo patrón.

Verificado con 4 tests unitarios nuevos (`cal-detail__item--fijo` en un gasto fijo, `--deuda-entidad` en una deuda con entidad, `--deuda-personal` en una deuda personal, y los tres tipos combinados el mismo día cada uno con su propia clase) más 1 E2E en Chromium real que siembra un fijo y una deuda entidad el mismo día y compara el `border-left-color` computado de ambos: deben ser colores distintos entre sí y ninguno debe quedar transparente (regresión que ocurriría si un tipo no matcheara ninguna clase CSS). 1831/1831 → 1835/1835 unit; 91/91 → 92/92 E2E. Lint limpio. SW v261 → v262.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()` agrega `cal-detail__item--${tipo}` al `<li>` del detalle. |
| `styles/components/config.css` | `.cal-detail__item--fijo/deuda-entidad/deuda-personal` (franja lateral + padding compensado, también en el media query mobile); `.cal-detail__icon--*` con color de texto y fondo tenue por tipo. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: clase por tipo (fijo, deuda entidad, deuda personal) y los 3 tipos combinados el mismo día. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - marca de color por tipo", 1 test que compara colores computados en Chromium real. |
| `service-worker.js` | v261 → v262. |

---

### feat(calendario): leyenda completa, con colores consistentes y siempre visible (AG.6) · 2026-07-02

La leyenda del calendario (qué significa cada dot de color en los días) se renderizaba al final del panel, después del detalle del día. Con un día cargado de registros (una quincena, un fin de mes), el detalle empujaba la leyenda fuera de la pantalla justo cuando más ayudaba tenerla a mano: había que desplazarse hasta el fondo para consultarla.

AG.6 la reubica y la fija. En [agenda/view.js](../modules/dominio/agenda/view.js) la leyenda pasa a renderizarse entre el calendario y el detalle del día (justo debajo del calendario, como pedía la tarjeta), y `.cal-legend` en [config.css](../styles/components/config.css) es ahora `position: sticky` con un pequeño offset superior y fondo, borde y radio propios: al quedar pegada durante el scroll, el contenido del detalle pasa por debajo y no debe transparentarse. El obstáculo real estaba en el shell: `.main-content` tenía `overflow-x: hidden`, y un ancestro con overflow distinto de `visible` se convierte en scroll container, lo que anula el `position: sticky` de todos sus descendientes (el sticky pasa a calcularse contra un contenedor que nunca scrollea, no contra la ventana). Se cambió a `overflow-x: clip` en [layout.css](../styles/layout.css): recorta el desborde horizontal exactamente igual, pero sin crear scroll container. El comentario en el CSS deja el porqué para que nadie lo regrese a `hidden` por accidente.

Sobre la parte de colores de la tarjeta: el calendario hoy solo mapea `S.compromisos` (`eventosDelMes`), así que los 3 tipos que la leyenda ya listaba (gasto fijo, deuda entidad, deuda personal) cubren todos los eventos posibles, cada uno con su color único y consistente con el resto de la app: `--fk-dom-presupuesto` (amarillo), `--fk-dom-compromisos` (rojo) y `--fk-dom-personales` (rosa). No hubo que tocar colores. Los tipos futuros (metas, apartados, aportes al fondo) entrarán a la leyenda cuando el ADR de recordatorios de aporte (AP.4 + MT.2 + AH.4) los sume al calendario; el doc de `_renderLeyenda` deja la guía (una entrada nueva con su `cal-dot--<tipo>`). AG.7 (marca de color por registro en el detalle del día) reusa esta misma paleta.

Verificado con 2 tests unitarios nuevos (la leyenda trae los dots de los 3 tipos; con un día abierto la leyenda queda antes del detalle en el DOM) y 1 E2E en Chromium real que siembra 10 compromisos el mismo día, abre el detalle, scrollea al fondo del documento (con guard de `scrollY > 0` para que el test no pase trivialmente si el contenido no desborda) y verifica que la leyenda sigue completa dentro del viewport. El preview del entorno sigue sin cargar (servidor levantado pero sin respuesta); la verificación visual queda cubierta por el E2E. 1829/1829 → 1831/1831 unit; 90/90 → 91/91 E2E. Lint limpio. SW v260 → v261.

**Podría afectar / validación pendiente:** el cambio de `overflow-x` en `.main-content` es global (todas las secciones). `clip` recorta igual que `hidden`, así que no debería notarse; validar en el celular que la leyenda queda pegada arriba al recorrer un día cargado y que ninguna sección muestra scroll horizontal nuevo.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | La leyenda se renderiza entre el calendario y el detalle del día; doc de `_renderLeyenda` con la guía para tipos futuros. |
| `styles/components/config.css` | `.cal-legend` sticky (top), con fondo, borde y radio propios. |
| `styles/layout.css` | `.main-content` pasa de `overflow-x: hidden` a `clip`: hidden creaba un scroll container que anulaba el sticky. |
| `tests/unit/agenda.test.js` | 2 tests nuevos: dots de los 3 tipos en la leyenda, orden leyenda → detalle. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - leyenda sticky", 1 test con scroll real. |
| `service-worker.js` | v260 → v261. |

---

### feat(calendario): total a pagar por día (AG.5) · 2026-07-02

El panel de detalle de un día en Calendario listaba cada compromiso por separado (nombre, frecuencia, monto individual) pero nunca los sumaba: para saber cuánto dinero necesitaba tener disponible ese día, el usuario tenía que sumar a mano cada monto de la lista. La sumatoria ya existía como código, pero solo como función privada `_totalDia` dentro de [agenda/view.js](../modules/dominio/agenda/view.js), sin exportar y sin un solo test, y su resultado se mostraba pegado al subtítulo pequeño y gris ("3 compromisos · $450.000"), fácil de pasar por alto.

AG.5 extrae esa suma a `totalDia(evs)`, función pura y exportada en [agenda/logic.js](../modules/dominio/agenda/logic.js): mismo criterio que ya usa el render de cada item individual (`monto` para gastos fijos, `cuotaMensual` para deudas, nunca `saldoTotal`) y que `sumarMontos` de `compromisos/logic.js` (IN.1). Es una duplicación intencional, no una importación cruzada: Agenda no puede importar de Compromisos porque el ADN #10 prohíbe que un dominio importe a otro (aunque `agenda/view.js` ya importa varias funciones de `compromisos/logic.js` para el render de cada item, un acoplamiento existente que este cambio no extiende ni corrige, fuera del alcance de esta tarea). `_renderDetalleDia()` ahora muestra una línea propia, con más peso visual, justo bajo el título del panel: "Total a pagar: **$X**" (`.cal-detail__total`), visible de inmediato sin tener que desplazarse por la lista de items, en vez del monto perdido dentro del subtítulo. Color neutro (`--fk-text-primary`), no rojo: un compromiso programado para ese día no es un incumplimiento, mismo criterio de AUD.4/ADR 019 que ya gobierna el resto de la app. La línea solo aparece cuando la suma es mayor a 0 (compromisos sin monto capturado, como una deuda a la que aún no se le puso cuota, no generan una línea "Total a pagar: $0" vacía de sentido).

Verificado con 9 tests unitarios nuevos (`totalDia` con fijos, deudas, mezcla de ambos, montos no numéricos y entradas nulas; render real del panel con uno y con varios compromisos, con y sin monto, y sin día seleccionado) más 1 E2E en Chromium real (un gasto fijo de $900.000 y una deuda con cuota de $150.000 el mismo día 20, el panel muestra "Total a pagar: $1.050.000"). 1819/1819 → 1829/1829 unit; 89/89 → 90/90 E2E. Lint limpio. SW v259 → v260.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | Nueva `totalDia(evs)`, función pura y exportada (antes privada en `view.js`, sin tests). |
| `modules/dominio/agenda/view.js` | Eliminada `_totalDia`; `_renderDetalleDia` usa `totalDia` de `logic.js` y muestra una línea propia "Total a pagar" en vez de anexarlo al subtítulo. |
| `styles/components/config.css` | Nueva `.cal-detail__total` (color neutro, monto en negrita). |
| `tests/unit/agenda.test.js` | 9 tests nuevos: `totalDia` (5) + render del total en el panel de detalle (4). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - total a pagar por día", 1 test. |
| `service-worker.js` | v259 → v260. |

---

### feat(metas): ahorro sugerido según la frecuencia de ingreso, no "por día" (MT.4) · 2026-07-02

La lista de Metas siempre mostraba "$X/día" como ritmo sugerido de ahorro, sin importar cómo cobra el usuario en la realidad. Para alguien que recibe su sueldo cada quincena, pensar en "cuánto por día" no ayuda a planear: el gesto natural es "cuánto aparto en cada quincena". MT.4 reemplaza ese cálculo fijo por uno que reparte el faltante entre los periodos de la frecuencia real de ingreso del usuario, mismo espíritu que ya resolvió Apartados (AP.1) para sus propios aportes sugeridos.

Nueva `calcularAhorroPorPeriodo(meta, frecuenciaIngresos)` en [metas/logic.js](../modules/dominio/metas/logic.js) reemplaza a `calcularAhorroDiario` (eliminada): calcula cuántos periodos completos quedan hasta la fecha límite según la frecuencia (Diario = 1 día, Semanal = 7, Quincenal = 15, Mensual = 30; las frecuencias más largas como Trimestral o Anual se asimilan a Mensual, la unidad de planificación más cercana) y reparte el faltante entre esos periodos, redondeando hacia arriba (mejor pasarse un poco que llegar corto, mismo criterio que Apartados). La frecuencia no es un campo por meta (a diferencia de Apartados, que sí tiene `frecuenciaAporte` seleccionable por ítem): se deriva una sola vez de los ingresos activos del usuario con `frecuenciaPrincipalIngresos(S.ingresos)`, la frecuencia más común entre ellos.

Esta función es una copia intencional de la homónima de `apartados/logic.js`: Metas no puede importar de Apartados porque ambos son dominios y el ADN #10 prohíbe que un dominio importe a otro. La duplicación de esta idea (mapeo de frecuencia + conteo de la más común) ya es el patrón establecido en el código: tesorería tiene su propio `_FACTOR_MENSUAL`, independiente del `DIAS_POR_PERIODO` de Apartados. `renderListaMetas()` en [metas/view.js](../modules/dominio/metas/view.js) calcula la frecuencia una sola vez para toda la lista (es la misma para todas las metas, no cambia por ítem) y la pasa a `_renderMetaItem`, que ahora muestra "$X por quincena", "$X por semana", "$X al mes" o "$X por día" según corresponda, con exactamente la misma redacción que ya usa Apartados en `etiquetaPeriodo` (consistencia de vocabulario entre secciones, mismo espíritu que el guardarraíl de emojis de TX.4/ADR 014, aunque aquí no hay un test automático que lo fuerce).

Los tests con fechas relativas (`new Date(); setDate(...)`) usaban antes `toISOString().slice(0,10)`, que puede desplazar un día en zonas horarias UTC negativas como Colombia según la hora exacta en que corre el test (el mismo problema que ya resolvió `hoyLocal()` en los E2E). Se agregó un helper local `isoEnDias(dias)` en `metas.test.js` que construye la fecha con los getters locales de `Date`, evitando el off-by-one; dos aserciones de conteo exacto de periodos fallaban intermitentemente antes de este ajuste y quedaron estables después. Verificado con 22 tests unitarios nuevos (`frecuenciaPrincipalIngresos`, `etiquetaPeriodoAhorro`, `calcularAhorroPorPeriodo`, y el render real de `renderListaMetas` con distintas frecuencias) más 1 E2E en Chromium real (ingreso Quincenal sembrado, meta con fecha límite a 90 días muestra "por quincena" y nunca "/día"). 1804/1804 → 1819/1819 unit; 88/88 → 89/89 E2E. Lint limpio. SW v258 → v259.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/logic.js` | Nuevas `frecuenciaPrincipalIngresos()`, `etiquetaPeriodoAhorro()`, `calcularAhorroPorPeriodo()`; eliminada `calcularAhorroDiario()`. |
| `modules/dominio/metas/view.js` | `renderListaMetas()` calcula la frecuencia de ingreso una sola vez; `_renderMetaItem` recibe la frecuencia y muestra el monto por periodo con su etiqueta. |
| `tests/unit/metas.test.js` | 22 tests nuevos; helper `isoEnDias()` para fechas relativas sin drift de zona horaria. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - ritmo de ahorro según frecuencia (MT.4)", 1 test. |
| `service-worker.js` | v258 → v259. |

---

### feat(metas): unificar el flujo de abono con el selector de cuentas compartido (MT.5) · 2026-07-02

El abono a una meta tenía su propia implementación de selector de cuenta, separada del resto de la app: un `<select>` de texto plano, obligatorio elegir cuando había 2 o más cuentas, y una lógica de descuento que solo restaba de una cuenta sin repartir ni confirmar sobregiros. Apartados ya había resuelto exactamente este problema en AP.1 con dos piezas de [infra/cuenta-helper.js](../modules/infra/cuenta-helper.js): `renderSelectorCuenta` (tarjetas seleccionables con avatar de banco, nombre y saldo, preselecciona la de mayor saldo) y `resolverPagoConPreferida` (usa la cuenta elegida si cubre el monto; si no alcanza y hay más cuentas, abre un picker de reparto que no deja ninguna en negativo; con una sola cuenta que no alcanza, pide confirmar el sobregiro). MT.5 es el port directo de ese patrón a Metas.

En [metas/view.js](../modules/dominio/metas/view.js), `renderFormAbonoMeta()` cambia `_renderCuentaSelectorAbono` (función eliminada, 24 líneas de lógica 0/1/varias cuentas duplicada) por una llamada a `renderSelectorCuenta`. En [metas/index.js](../modules/dominio/metas/index.js), `_guardarAbonoMeta()` pasa a ser async y sigue el mismo esqueleto que `_guardarAporte` de Apartados: valida el monto, resuelve los splits con `resolverPagoConPreferida` (si hay cuentas activas), confirma el sobregiro cuando la única cuenta no alcanza (mismo texto y `peligroso: true` que Apartados, adaptado a "abono"), aplica el descuento a cada cuenta del reparto, y llama a `updSaldo()` tras guardar, algo que la implementación anterior nunca hacía (el hero de Inicio quedaba con el saldo viejo hasta el siguiente `renderAll()` completo). El chequeo manual "debes elegir cuenta si hay varias" desaparece: como el selector de tarjetas siempre trae una preselección, ya no hace falta forzar la elección a mano.

Los tests de `renderFormAbonoMeta` que verificaban el `<select>` viejo se reescribieron contra el markup de tarjetas, calcados de los que ya existían para `renderFormAporteApartado` en `apartados.test.js` (mismo patrón: sin cuentas no hay selector, una cuenta trae una tarjeta preseleccionada, varias cuentas preseleccionan la de mayor saldo, ya no queda el `<select>` viejo). Se sumaron 2 E2E en Chromium real que ejercitan el flujo completo con una cuenta real: uno de abono normal que descuenta el saldo correcto (verificado en Tesorería, mismo patrón que la suite Gastos-Cuenta), y uno de abono que no alcanza, que confirma el diálogo de sobregiro y deja el saldo en negativo tras aceptar. 1804/1804 unit; 86/86 → 88/88 E2E. Lint limpio. SW v257 → v258.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta()` usa `renderSelectorCuenta` de `cuenta-helper.js`; eliminada `_renderCuentaSelectorAbono`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta()` async: `resolverPagoConPreferida`, confirmación de sobregiro con una sola cuenta, reparto aplicado a cada split, `updSaldo()` tras guardar. |
| `tests/unit/metas.test.js` | Describe "selector de cuenta" reescrito contra el nuevo markup, mismo patrón que `apartados.test.js`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - abono con selector de cuenta compartido (MT.5)", 2 tests. |
| `service-worker.js` | v257 → v258. |

---

### feat(metas): simplificar la selección de emoji (MT.3) · 2026-07-02

MT.1 agregó categorías con emoji a Metas, pero dejó el campo "Emoji (opcional)" suelto: visible siempre, sin relación con la categoría elegida. Un usuario podía escribir un emoji, cambiar de categoría, y el emoji manual seguía ganando (por la prioridad de `normalizarMeta`) sin que la UI diera ninguna pista de por qué. MT.3 simplifica: el campo vive oculto por defecto (`#form-group-meta-icono` en [metas/view.js](../modules/dominio/metas/view.js)) y solo aparece cuando la categoría elegida es "Otra", la válvula de escape del catálogo (ADR 014, principio 7); el resto de las categorías ya trae su propio emoji, así que no hay nada que decidir.

La pieza no trivial es evitar un emoji manual "fantasma": `_syncCategoriaMeta(form)`, nueva en [metas/index.js](../modules/dominio/metas/index.js) y enganchada al `change` del selector de categoría, alterna el `hidden` del campo y **limpia su valor al ocultarlo**. Sin esto, un usuario que prueba "Otra", escribe un emoji, y luego elige "Vivienda" antes de guardar, terminaría con el emoji viejo en la meta: `FormData` sigue enviando campos ocultos, y `normalizarMeta` prioriza el emoji explícito sobre el de la categoría (decisión de MT.1, sigue siendo correcta como contrato de la función). También se llama tras `resetModal()` en `_nuevaMeta()`, porque `resetModal` limpia valores de input pero no el atributo `hidden` que dejó una apertura anterior del modal.

La segunda mitad de la tarjeta ("eliminar el emoji emocional de la parte inferior del form/card de meta") ya estaba resuelta: el changelog de junio 2026 registra que ese emoji se movió al título de la card en el rediseño de la lista (anillo de progreso + emoji junto al nombre), no queda ningún emoji suelto en la parte inferior del form ni de la card hoy.

Verificado con 5 tests E2E en Chromium real (el preview del entorno sigue sin cargar, nota ya conocida): el campo nace oculto, se muestra solo con "Otra", el emoji manual se guarda con "Otra", y el caso crítico, cambiar de "Otra" a otra categoría antes de guardar usa el emoji de la categoría nueva y no el manual. Se reescribió un E2E de MT.1 que ya no aplicaba (asumía el campo siempre visible). Sin tests unitarios nuevos: el comportamiento de mostrar/ocultar y limpiar el campo vive en `index.js` (DOM + eventos), fuera del alcance de happy-dom por convención del proyecto (igual que los demás toggles condicionales de formulario); se ajustó el test existente de `renderFormMeta` para reflejar el nuevo markup. 1803/1803 unit; 84/84 → 86/86 E2E. Lint limpio. SW v256 → v257.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | El form-group del emoji nace `hidden`; label cambiado a "Elige un emoji para tu meta". |
| `modules/dominio/metas/index.js` | Nueva `_syncCategoriaMeta(form)`: alterna `hidden` según la categoría y limpia el emoji al ocultarlo; enganchada al `change` del selector y llamada tras `resetModal` en `_nuevaMeta`. |
| `modules/dominio/metas/logic.js` | Comentario de `normalizarMeta` actualizado para reflejar la nueva UI (la función en sí no cambió). |
| `tests/unit/metas.test.js` | Test de `renderFormMeta` actualizado: el form-group del emoji nace `hidden`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (visibilidad condicional, guardado con "Otra", limpieza al cambiar de categoría); 1 test de MT.1 reescrito. |
| `service-worker.js` | v256 → v257. |

---

### feat(metas): categorías con emoji (MT.1) · 2026-07-02

Metas de ahorro tenía nombre libre y un campo de emoji suelto (sin catálogo). Nuevo `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en [core/constants.js](../modules/core/constants.js), mismo patrón que los catálogos ya existentes (`CATEGORIA_EMOJI` de Gastos, `CATEGORIA_AGENDA_EMOJI`, `CATEGORIA_DEUDA_EMOJI`): 12 categorías con foco en objetivos de alto costo, priorizadas por el usuario el 2026-07-02 (Viajes, Cumpleaños, Boda, Vivienda, Vehículo, Computador, Celular, Educación, Hijo(s), Vacaciones, Emprendimiento, Otra).

Selector "Categoría (opcional)" nuevo en `renderFormMeta()` ([metas/view.js](../modules/dominio/metas/view.js)), con las opciones ya mostrando su emoji. `normalizarMeta()` ([metas/logic.js](../modules/dominio/metas/logic.js)) resuelve el emoji final con esta prioridad: emoji escrito a mano en el campo "Emoji (opcional)" (que se conserva, no se elimina en esta tarea) > emoji de la categoría elegida > 🎯 por defecto. Así una meta sin categoría se comporta exactamente igual que antes, y elegir una categoría predefinida trae su emoji sin que el usuario tenga que escribirlo. El emoji resuelto queda guardado en `meta.icono` como siempre; `_renderMetaItem` no cambió porque ya leía ese campo. Campo `categoria` nuevo y opcional en el shape de `Meta`, lectura defensiva, sin migración de schema.

Reconciliación de emoji contra el guardarraíl de consistencia entre catálogos (ADR 014, TX.4, "mismo concepto ⇒ misma etiqueta y mismo emoji en todas las secciones"): la lista original de la tarjeta pedía 🎓 para "Educación" y 🏖️ para "Vacaciones", pero esas etiquetas ya existían con otro emoji en otros catálogos (Educación 📚 en Gastos/Agenda; Vacaciones ✈️ en Apartados). Se usaron los emojis ya establecidos en vez de introducir un desajuste, y el catálogo de Metas se sumó a la lista de fuentes del test de guardarraíl `TX.4` (antes cubría Gastos, Agenda, Ingresos, Deudas y Apartados) para que una edición futura de cualquiera de estos catálogos no vuelva a divergir sin que un test lo marque.

El preview del entorno sigue sin cargar la app (nota ya conocida en la memoria del proyecto); verificado con 22 tests unitarios nuevos (forma del catálogo, prioridad del emoji en `normalizarMeta`, contenido del selector, emoji real en `renderListaMetas`) más 2 tests E2E nuevos en Chromium real: crear una meta con categoría "Boda" muestra 💍 en la lista, y un emoji escrito a mano gana sobre el de la categoría. 1787/1787 → 1803/1803 unit; 82/82 → 84/84 E2E. Lint limpio. SW v255 → v256.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_META` (12 categorías) + `CATEGORIA_META_EMOJI`, con la reconciliación de Educación y Vacaciones documentada en el comentario. |
| `modules/dominio/metas/logic.js` | `normalizarMeta()`: nuevo campo `categoria`; `icono` se resuelve con prioridad manual > categoría > default. |
| `modules/dominio/metas/view.js` | `renderFormMeta()` agrega el selector `#meta-categoria`; nuevo helper `_renderOpcionesCategoria()`. |
| `tests/unit/constants.test.js` | Describe nuevo con 4 tests de forma del catálogo; `CATEGORIA_META_EMOJI` sumado a las fuentes del guardarraíl TX.4. |
| `tests/unit/metas.test.js` | 15 tests nuevos: `normalizarMeta` con categoría (6), selector en `renderFormMeta` (4), emoji real en `renderListaMetas` (2), más los describe wrappers. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - categorías con emoji (MT.1)" con 2 tests. |
| `service-worker.js` | v255 → v256. |

---

### feat(inicio): ojo para ocultar/mostrar el dinero disponible (IN.2) · 2026-07-02

Icono de ojo junto al saldo del hero de Inicio ("Tu dinero disponible hoy"), estilo app bancaria, para usar Finko en lugares públicos: alterna entre el monto visible y la máscara `$••••••` (largo fijo, para no revelar la magnitud del monto real). La preferencia persiste entre sesiones en `S.config.ocultarSaldo` con lectura defensiva (`=== true`; cualquier otro valor muestra el monto), sin migración de schema, como pedía la tarjeta.

Detalles de implementación: `updSaldo()` ([infra/render.js](../modules/infra/render.js)) es el único punto que escribe `#saldo-total`, así que la máscara vive ahí; exporta la constante `SALDO_MASCARA` y sincroniza el botón `#saldo-ojo` (icono ojo/ojo tachado vía swap del `href` del `<use>`, `aria-pressed`, oculto sin cuentas junto con el valor). Mientras el saldo está oculto el monto real nunca toca el DOM, y la nueva `stopCount(el)` ([infra/animate.js](../modules/infra/animate.js)) cancela un countUp en vuelo que de otro modo sobreescribiría la máscara frames después. La acción `saldo-visibilidad` se registra como built-in del shell en [ui/actions.js](../modules/ui/actions.js) (flip defensivo `!== true` + `save()` + `updSaldo()`). CSS en [styles/components/domain.css](../styles/components/domain.css) (capa `components`, para que el refuerzo `.hero-saldo__ojo[hidden]` gane a `display:inline-flex` de `.btn`); el botón reusa `btn btn-ghost btn-icon`. Sprite: símbolos `i-eye` / `i-eye-off` (geometría estilo Lucide, coherente con el resto).

Alcance decidido (la tarjeta lo dejaba abierto): solo el hero, el dato más sensible y el subset más pequeño con sentido; extender la máscara a los demás montos de Inicio (totales de vencidos/prioridades, resumen semanal) quedó como observación en [BOARD.md](BOARD.md). Verificación: el preview del entorno sigue sin cargar (nota en memoria del proyecto), así que la evidencia es 13 tests unit nuevos en `tests/unit/render.test.js` (máscara, defensiva, sync del botón, empty state, acción vía `dispatch`) + 1 E2E nuevo en Chromium real (click → máscara, recarga → persiste, click → monto de vuelta). 1774/1774 → 1787/1787 unit; 81/81 → 82/82 E2E. Lint limpio. SW v254 → v255.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolos `i-eye`/`i-eye-off` en el sprite; fila `.hero-saldo` con el botón `#saldo-ojo` (`data-action="saldo-visibilidad"`, `aria-pressed`). |
| `modules/infra/render.js` | `SALDO_MASCARA` exportada; `updSaldo()` enmascara cuando `S.config.ocultarSaldo === true` y sincroniza el botón del ojo. |
| `modules/infra/animate.js` | Nueva `stopCount(el)`: cancela el RAF del countUp activo de un elemento. |
| `modules/ui/actions.js` | Acción built-in `saldo-visibilidad`: flip defensivo + `save()` + `updSaldo()`. |
| `styles/components/domain.css` | Sección HERO-SALDO: fila monto + ojo, refuerzo `[hidden]`, icono a 1.375rem. |
| `tests/unit/render.test.js` | Nuevo archivo: 13 tests de `updSaldo` + acción `saldo-visibilidad`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Ocultar/mostrar el dinero disponible (IN.2)" con seed condicional (el reload no pisa la preferencia guardada). |
| `service-worker.js` | v254 → v255. |

---

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)) listaban items sin sumatoria: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en los próximos 7 días. Nueva función pura `sumarMontos(items)` en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` que ya usa el render de cada item individual, AUD.1), consumida por `renderPanelVencidos` ("Total de gastos vencidos") y `renderPanelPrioridades` ("Total de próximas prioridades", solo cuando hay algo que mostrar; el estado "Todo al día" no lleva total). Nuevas clases `.vencidos-card__total` / `.prioridades-card__total` en [styles/components/domain.css](../styles/components/domain.css), fila con borde superior sutil y monto en negrita, coherente con el resto de las cards del dashboard. Verificación en el navegador bloqueada por caché HTTP agresiva del entorno de preview (`fetch` con `cache:'no-store'` sí traía el código nuevo, pero la navegación normal servía JS viejo); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real sin ese problema. 6 tests nuevos (4 `sumarMontos` + 2 de render por panel). 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`, función pura. |
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos` y `renderPanelPrioridades` agregan el total al pie. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total` + variantes `-amount`. |
| `tests/unit/compromisos.test.js` | 4 tests de `sumarMontos` + 2 de render (total presente/ausente según estado). |
| `service-worker.js` | v253 → v254. |

---

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js), `categoriaTopSemana`) sumaba todos los `S.gastos` de la semana, incluidos los generados automáticamente por un gasto fijo o un abono a deuda (que llevan `compromisoId`, ver [ADR 002](DECISIONS/002-abono-deudas.md)). Con un arriendo de $900.000 y un mercado de $50.000, el indicador mostraba "Vivienda" cuando el hábito de consumo real del usuario era Alimentación. Fix: `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen visible en la lista de Gastos (obligación vs. consumo variable). Las demás cifras del resumen (total de 7 días, comparación semanal, registros, días activos) no cambian: siguen contando todos los gastos, porque miden actividad total, no hábitos de categoría. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados (arriendo con `compromisoId` + mercado sin él → "🛒 Alimentación $50.000"). SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId` antes de agrupar por categoría. |
| `tests/unit/resumen.test.js` | 2 tests: excluye `compromisoId`, y devuelve `null` si toda la semana fue solo fijos/deudas. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto y último slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Tres ajustes independientes de descubribilidad y robustez:

1. **Sidebar con pliegue**: en alturas de ventana <= 800px (solo escritorio; la regla exige `min-width: 1024px` para no chocar con el bottom nav móvil, que ya aplana el nav a fila) el grupo Herramientas quedaba bajo el scroll interno del `.sidebar__nav` sin ningún indicio visual de que había más contenido. [styles/layout.css](../styles/layout.css) compacta el `margin-top` de `.nav-group` y el `padding-bottom` de `.nav-group__label`, y agrega un `::after` `position: sticky; bottom: 0` con gradiente hacia el color de fondo del sidebar, que insinúa el scroll sin robar espacio de layout (compensado con `margin-top` negativo).
2. **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV con muchas categorías nuevas) se encadenaba un toast con confetti cada 1.4s ([logros/index.js](../modules/dominio/logros/index.js)) que tapaba contenido por varios segundos. `_checkYMostrar` ahora corta a un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un segundo parámetro `label` opcional (antes fijo en "Logro desbloqueado"). Verificado con un script Playwright temporal (no comiteado, borrado tras confirmar): sembrando datos que desbloquean 6 logros de golpe, aparece exactamente 1 `.logro-toast` con el texto "Logros desbloqueados" / "6 logros nuevos".
3. **`save()` sin flush al cerrar**: el debounce de 200ms en [core/storage.js](../modules/core/storage.js) puede perder el último cambio si el usuario cierra la pestaña o el sistema mata la PWA en segundo plano en móvil antes de que el timer corra. Nueva `initFlushOnHide()` (exportada desde `storage.js`) escucha `visibilitychange` (solo cuando `document.visibilityState === 'hidden'`) y `pagehide`, y llama a `_flushNow()` únicamente si hay un guardado pendiente (`_saveTimer` activo), para no escribir a `localStorage` sin necesidad. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`, antes de cualquier interacción del usuario. El doc comment de `_flushNow` (antes "no usar en producción") se actualizó para reflejar este segundo uso legítimo.

Sin tests unitarios nuevos: los dos primeros son CSS/DOM puro sin lógica que aislar en happy-dom, y el toast de logros está explícitamente fuera del alcance de los tests unitarios por decisión ya documentada en `tests/unit/logros.test.js` ("el toast y confetti requieren DOM completo y se verifican manualmente en la app"). El flush en `visibilitychange`/`pagehide` tampoco es testeable en happy-dom (no hay pestaña real que ocultar). 1764/1764 unit + 81/81 E2E verdes (sin regresiones). SW v251 → v252.

- **`styles/layout.css`**: media query `(max-height: 800px) and (min-width: 1024px)` con espaciado compacto de `.nav-group` + fade sticky en `.sidebar__nav`.
- **`modules/dominio/logros/index.js`**: `_checkYMostrar` muestra un toast resumen si `nuevos.length > 2`; `_mostrarToast(logro, label)` acepta label opcional.
- **`modules/core/storage.js`**: nueva `initFlushOnHide()`; doc comment de `_flushNow` actualizado.
- **`modules/ui/bootstrap.js`**: registra `initFlushOnHide()` tras `loadData()`.
- **`service-worker.js`**: v251 → v252.

---

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio consolidado de [ADR 019](DECISIONS/019-limites-por-rol.md) (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de [ADR 008](DECISIONS/008-mecanicas-de-habito.md) (resumen semanal como reflexión sin castigo): gastar no es incumplir.

1. **Total de "Resumen de la semana"** en Inicio y **"Pendiente"** en Préstamos ([styles/components/domain.css](../styles/components/domain.css)), ambos usando la clase compartida `.resumen-card__stat--primary`, coloreaban el monto con `--fk-danger-text`. Cambiado a `--fk-text-primary` (neutro). Ninguno de los dos casos es un incumplimiento: uno es cuánto gastaste (información), el otro es dinero que te deben (positivo para ti).
2. **Variación al alza del gasto mensual** en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`. Se eliminó la regla de color (el default de `.chart-stat__valor` ya es neutro) y se quitó la asignación de la clase en `_renderTendencia` ([analisis/view.js](../modules/dominio/analisis/view.js)).

Decisión sobre el punto pendiente del backlog (neutro vs ámbar para la variación al alza): **neutro**, por dos razones. Primero, consistencia: el texto de tendencia semanal en Inicio ya es neutro desde F8 ("Gastaste X% más que la semana pasada" en `--fk-text-secondary`), así que el número no debía quedar en otro tono que su propio texto. Segundo, no hay un umbral incumplido que justifique una advertencia (ámbar): es solo una comparación mes a mes, no un límite superado. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): eso sí es un logro digno de refuerzo positivo.

Sin tests nuevos: cambio de color puro sin lógica nueva; ningún test existente referenciaba las clases o colores tocados (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v250 → v251.

- **`styles/components/domain.css`**: `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`.
- **`styles/components/charts.css`**: eliminada `.chart-stat--negativo` (color danger); queda el neutro por defecto de `.chart-stat__valor`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` ya no asigna `chart-stat--negativo` cuando sube el gasto.
- **`service-worker.js`**: v250 → v251.

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Cinco correcciones puntuales de copy que violaban la regla ADN 11 (tuteo, español neutro, sin términos internos):

1. **[logros/logic.js](../modules/dominio/logros/logic.js)**: 4 descripciones de logros en voseo o sin tildes ("Tenes 3 o mas", "un prestamo que vos le diste", "configuracion", "esta lista"). Corregidas a tuteo con tildes correctas.
2. **"Ver agenda"** en el panel de "Próximas prioridades" de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)): quedó desactualizado desde que la sección se renombró a Calendario (AG.1, 2026-06-30). Ahora dice "Ver calendario".
3. **"el dashboard"** en los empty states de Gastos ([gastos/view.js](../modules/dominio/gastos/view.js)) y Mis cuentas ([tesoreria/view.js](../modules/dominio/tesoreria/view.js)): término interno que la app ya no usa desde el renombre a Inicio. Corregido a "Inicio".
4. **`APP_VERSION`** en [core/constants.js](../modules/core/constants.js): decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, desincronizado de `package.json` (`1.0.0`). Sincronizado.
5. **"Toca una estrategia"** en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)): se lee raro en desktop (no hay "toque" con mouse). Cambiado a "Elige una estrategia".

Sin tests nuevos: es copy sin lógica asociada y ningún test existente referenciaba estos textos (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v249 → v250.

- **`modules/dominio/logros/logic.js`**: 4 descripciones de logros con tuteo y tildes correctas.
- **`modules/dominio/compromisos/views/dashboard.js`**: "Ver agenda" → "Ver calendario" (+ `aria-label`).
- **`modules/dominio/gastos/view.js`**, **`modules/dominio/tesoreria/view.js`**: "el dashboard" → "Inicio" en empty states.
- **`modules/core/constants.js`**: `APP_VERSION` `'0.1.0'` → `'1.0.0'`.
- **`modules/dominio/compromisos/views/estrategia.js`**: "Toca una estrategia" → "Elige una estrategia".
- **`service-worker.js`**: v249 → v250.

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` referenciaban 15 variables `--fk-*` nunca definidas en `tokens.css` (~52 usos): al no existir, el navegador usa el valor inicial en vez del token de diseño, lo que rompía en silencio el `accent-color` de radios/checkboxes (verde de marca → azul del navegador), los bordes de tarjetas (caían a `currentColor`, invisibles) y los fondos de gráficos (transparentes).

Mapeo aplicado siguiendo el patrón ya dominante en el resto del código:

- `--fk-primary` → `--fk-accent` (color de marca).
- `--fk-border` → `--fk-border-subtle` (convención mayoritaria para bordes de tarjeta: 35 usos reales contra 15 de `border-default`).
- `--fk-bg`, `--fk-surface`, `--fk-surface-subtle` → `--fk-bg-surface` / `--fk-bg-elevated` según la jerarquía visual del elemento (dos usos como `color:` sobre círculos de acento van a `--fk-text-on-accent`, no a un fondo).
- `--fk-text` → `--fk-text-primary`.
- `--fk-weight-bold/medium/semibold/regular` y `--fk-font-normal` → `--fk-font-bold/medium/semibold/regular`.
- `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`.
- `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala tipográfica, xs es el valor real más cercano).

Se aprovechó para quitar los fallbacks inline (`var(--x, valor)`) que compensaban las variables fantasma: ya no hacen falta porque el token real siempre está definido. Cero cambios de lógica, HTML o comportamiento: es puramente resolución de tokens. Verificado en navegador (datos sembrados): Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) muestran bordes y fondos reales. 1764/1764 unit verdes (sin tests nuevos: no hay lógica que cubrir, solo CSS). SW v248 → v249.

- **`styles/components/charts.css`**: 15 usos (sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda).
- **`styles/components/domain.css`**: 11 usos (selector de cuenta radio/checkbox, tarjeta de límites, consolidado de ahorro).
- **`styles/components/analysis.css`**: 14 usos (tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa).
- **`styles/components/forms.css`**: 2 usos (badge genérico, placeholder de gasto sin completar).
- **`styles/components/config.css`**: 2 usos (título y emoji del detalle de calendario).
- **`styles/layout.css`**: 1 uso (separador de sub-header de sección).
- **`service-worker.js`**: v248 → v249.

---

### fix(dashboard/analisis): montos reales de deudas en los paneles de Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Corrige los 4 bugs funcionales visibles que detectó la auditoría:

1. **"$NaN pendiente" en el nudge "deudas llevan tiempo sin actividad"** (sección Deudas): la vista leía `d.saldoPendiente`, campo que no existe; la lógica (`detectarDeudasDurmiendo`) devuelve `saldoTotal`. Ahora muestra el saldo formateado ("$5.800.000 pendiente").
2. **Deudas vencidas con "$0" en el panel "N pendientes del mes"** (Inicio): `detectarVencidosCompletos` exponía `Number(c.monto) || 0`, pero las deudas no tienen `monto` desde la migración v6 (su cuota vive en `cuotaMensual`). Ahora expone la cuota mensual para deudas y conserva `monto` para fijos.
3. **"Próximas prioridades" (Inicio) omitía la cifra de las deudas**: el render leía `c.monto`; ahora cae a `cuotaMensual` cuando no hay `monto` (fijos, préstamos personales y apartados siguen igual).
4. **Variación "↑ 0%" en rojo en la tendencia de Análisis** cuando el mes anterior cerró en $0: sin base de comparación no hay porcentaje que mostrar; ahora dice "Sin gastos el mes anterior para comparar" en tono neutro (mismo criterio que el resumen semanal de F8).

6 tests de regresión nuevos (1 de lógica + 5 de render en happy-dom). 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real (Playwright, datos sembrados): Inicio, Deudas y Análisis muestran los montos y textos correctos. SW v247 → v248.

- **`modules/dominio/compromisos/views/alertas.js`**: `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes `d.saldoPendiente`, undefined, que formateaba NaN).
- **`modules/dominio/compromisos/logic.js`**: `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas.
- **`modules/dominio/compromisos/views/dashboard.js`**: el panel de prioridades usa `c.monto ?? c.cuotaMensual`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` maneja el caso sin base (mes anterior en $0) con aviso neutro.
- **`tests/unit/compromisos.test.js`**, **`tests/unit/analisis.test.js`**: 6 tests de regresión.
- **`service-worker.js`**: v247 → v248.

---

### feat(presupuesto): los topes por categoría se fusionan dentro de la tarjeta de Estilo de vida (MC.8b, ADR 019) · 2026-07-01

Segundo slice grande de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Elimina la **redundancia de arquitectura de la información**: Estilo de vida dejaba de aparecer en dos sitios (su tarjeta en el resumen y el bloque suelto "Estilo de vida: topes por categoría" debajo, con su hero de totales). Ahora hay **un solo relato por grupo**.

Los topes por categoría (envelope budgeting sobre `S.presupuestos`) viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida` en `presupuesto/view.js`), con tres piezas:

- **Olla finita** (`_renderOllaFinita`): una línea que dice cuánto del presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas) cubren los límites y cuánto queda sin tope, por ejemplo "Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope." Da la noción de presupuesto acotado sin forzar a asignar el 100% (usa `coberturaLimitesEstiloVida`, MC.8a). Maneja los bordes: sin presupuesto, sin límites, cobertura total y exceso (este último en ámbar).
- **Envelopes por categoría** con sus alertas ámbar/roja (Estilo de vida es el grupo que sí se controla), o un mensaje breve si aún no hay ninguno.
- **Botón "Agregar límite"** (topes bajo demanda) más las categorías con gasto pero sin tope (sugerencia de dónde poner uno).

`_renderGrupoCard` pasa a ser **consciente del rol** (ADR 019 decisión 1): **Necesidades = monitorear** (estado neutro `monitor`, sin barra ámbar ni roja; la tercera cifra informa el exceso como "Sobre lo previsto", nunca "Excedido" en rojo, porque son gastos esenciales que se pagan sí o sí); **Ahorro = celebrar** (verde, ya venía de MC.8); **Estilo de vida = controlar** (conserva su estado de gasto alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin la olla finita, que necesita el presupuesto del grupo), para no perder la capacidad de ponerle un tope al gasto antes de registrar ingresos.

Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión) y su CSS (`.presupuesto-hero*`, `.estilo-detalle*`, y la regla móvil asociada en `responsive.css`). **Pendiente MC.8c:** el layout (Necesidades + Ahorro en dos columnas compactas, Estilo de vida en fila completa); por ahora las tres tarjetas siguen en el grid de 3 columnas.

3 E2E nuevos (fusión de topes + botón "Agregar límite", olla finita con la cobertura exacta, Necesidades sin alarma aunque supere lo previsto). 1758/1758 unit; 42/42 → 45/45 smoke E2E. Lint limpio. SW v246 → v247.

- **`modules/dominio/presupuesto/view.js`**: topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol (Necesidades neutro); `_renderResumenGruposVacio` conserva los topes sin ingreso; `_renderHero`/`_renderEmptyState` eliminados.
- **`styles/components/analysis.css`**: `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`.
- **`styles/responsive.css`**: se quitó la regla móvil de `.presupuesto-hero__totales`.
- **`tests/e2e/smoke.test.js`**: 3 tests nuevos.
- **`service-worker.js`**: v246 → v247.

---

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo (MC.8, ADR 019) · 2026-07-01

Petición del usuario sobre la retroalimentación visual del Ahorro: superar la meta se pintaba de **rojo** (barra `progress-bar--danger`, borde/fondo de peligro, "Excedido" en rojo), lo que transmite error cuando en realidad es un buen hábito. Se hace `_renderGrupoCard` (`presupuesto/view.js`) consciente del rol para el grupo **Ahorro**: cumplir o superar la meta (`pct >= 100`) usa la **paleta positiva** (verde), nunca ámbar ni rojo.

- Barra `progress-bar--complete` (verde) al llegar al 100%; por debajo, el color de progreso neutro. Nunca `--warn` ni `--danger` para Ahorro.
- Estado visual nuevo `logro` (borde y fondo verdes) en vez de `excedido` (rojo).
- Tercera cifra: superar la meta es "Ahorrado de más" en verde (`is-positive`), no "Excedido" en rojo; no llegar aún es "Te falta" (neutro), en vez del "Disponible" que no aplicaba a ahorro.

Consolida la regla de color de Finko: verde = logros/ahorro/metas cumplidas, ámbar = advertencias, rojo = incumplimientos reales. Necesidades y Estilo de vida conservan su chrome actual (el reencuadre de Necesidades es MC.8b). 1 E2E nuevo (en navegador limpio, autoritativo). 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador: la tarjeta de Ahorro al 150% muestra barra verde, "Ahorrado de más $300.000" en verde y borde verde. Lint limpio. SW v245 → v246.

- **`modules/dominio/presupuesto/view.js`**: `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`).
- **`styles/components/analysis.css`**: `.grupo-card[data-estado="logro"]` (verde) + `.grupo-card__fig dd.is-positive`.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo (Ahorro superado se ve en verde, nunca en rojo).
- **`service-worker.js`**: v245 → v246.

---

### feat(presupuesto): mensajes de Límites por rol, Necesidades informativo y Ahorro más cálido (MC.8a, ADR 019) · 2026-07-01

Primer slice de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 1, 3 y 2). Reencuadra `generarMensajesLimites` (`presupuesto/logic.js`) para que cada grupo hable según su **rol**, no con una plantilla común:

- **Necesidades = monitorear.** Deja de emitir una alerta con lenguaje de "límite". Cuando el gasto en necesidades supera lo que la distribución les asignó, genera un mensaje **informativo** (`tipo: 'info'`, nuevo): "Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos." Estar cerca del presupuesto (estado 'alerta') ya no genera nada: es normal.
- **Ahorro = celebrar.** El refuerzo distingue cumplir de superar: si aportaste justo lo planeado, "Vas por buen camino. Cumpliste con el ahorro que planeaste este mes"; si aportaste de más (`ejecutado > asignado`), un mensaje más cálido: "¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana."
- **Estilo de vida = controlar.** Sin cambios: sigue siendo el único grupo con alertas preventivas por categoría y por grupo.

Nueva función pura **`coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida)`** (la "olla finita"): devuelve `{limites, presupuesto, sinTope, excede}`, cuánto del presupuesto de Estilo de vida cubren los topes y cuánto queda sin tope, para dar noción de presupuesto acotado sin forzar el 100%. Reusa `totalAsignadoMensual`. La usará MC.8b en la vista.

Como `generarMensajesLimites` ya está en uso, se ajustó el render de nudges (`presupuesto/view.js`): `_nivelNudge` resuelve el nivel visual y se agregó el nivel `info` → `nudge-info` (azul calmado), además de los existentes. **Nota:** el chrome de las tarjetas (barra roja, etiqueta "Excedido") todavía sigue el modelo simétrico de MC.5b; su reencuadre por rol es MC.8b. Este slice solo cambia los mensajes.

6 unit netos + 1 E2E nuevo. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador: la tarjeta de Necesidades excedidas muestra un nudge azul informativo (sin "límite") y la de Ahorro que supera lo planeado, el refuerzo cálido en verde. Lint limpio. SW v244 → v245.

- **`modules/dominio/presupuesto/logic.js`**: `generarMensajesLimites` reencuadrada por rol; `coberturaLimitesEstiloVida` nueva.
- **`modules/dominio/presupuesto/view.js`**: `_nivelNudge` + soporte del nivel `nudge-info`.
- **`tests/unit/presupuesto.test.js`**: tests de Necesidades/Ahorro actualizados + 6 de `coberturaLimitesEstiloVida`.
- **`tests/e2e/smoke.test.js`**: E2E de refuerzo de Ahorro actualizado (cumplir) + nuevo (superar).
- **`service-worker.js`**: v244 → v245.

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica **MC.8**, que **revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md)** sin revertir su núcleo (presupuesto por grupo desde la distribución, sin schema). Nace de una observación del usuario: tratar los tres grupos de Límites con la misma tarjeta y los mismos umbrales es sutilmente incorrecto, porque no tienen la misma naturaleza. La sección pasa a un **tratamiento asimétrico por rol**:

1. **Necesidades = monitorear.** Gastos esenciales que se pagan sí o sí; no se limitan. El copy se reencuadra: informa cuánto del ingreso consumen ("usan el X%") y, si suben, sugiere revisar el plan general, nunca "te estás pasando". Se elimina la palabra "límite" de su copy.
2. **Ahorro = celebrar.** Ahorrar más de lo planeado es una victoria, no una desviación. Refuerzo cálido y variado al cumplir o superar la meta (ya existía desde MC.5d; se enriquece), nunca alerta.
3. **Estilo de vida = controlar.** Único grupo con topes por categoría y alertas preventivas. Los topes se **fusionan dentro de su tarjeta** (desaparece el bloque suelto "Estilo de vida: topes por categoría"), con el modelo de "agregar límite bajo demanda" (ya existente) más una línea de conciencia de "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites actuales). Se rechaza la alternativa de porcentajes que sumen 100% por la misma rigidez que MC.6b ya descartó.

Layout: en desktop, Necesidades y Ahorro en dos columnas compactas y Estilo de vida en fila completa (el peso visual comunica dónde está la acción); en móvil se apilan. Decisión pragmática: todas las categorías de gasto siguen siendo limitables en v1 (reclasificarlas por grupo tocaría `ejecutadoPorGrupoDelMes` y se difiere a un ADR futuro). Sin schema nuevo. Implementación en 4 slices (MC.8a a MC.8d). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

- **`docs/DECISIONS/019-limites-por-rol.md`**: nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa.

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c, ADR 018) · 2026-07-01

Tercer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva función pura **`construirDesgloseNecesidades(compromisos)`** en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual equivalente), ordenadas de mayor a menor. Es una vista de **solo lectura**: no mueve dinero, no crea schema; cada obligación se sigue pagando al vencer, exactamente como hoy.

El monto de cada fila usa la misma normalización mensual que ya usa el modelo de distribución (fijo = `monto * factor de frecuencia`, igual que `calcularGastosFijosMensuales`; deuda = `cuotaMensual`, ya mensual), para que el desglose sea coherente con el "Necesidades" agregado que el panel ya mostraba. Los compromisos de baja periodicidad (Anual, Bimestral, etc.) se excluyen, igual que en el agregado.

En la vista, el desglose aparece como un `<details>` colapsable ("Ver detalle (N)") bajo la fila "📦 Necesidades" existente, reusando el patrón visual `.analisis-grupo` (ya usado en Análisis y Límites de gasto) con clases propias (`.distribuir__nec-*`) para no acoplar Mis cuentas al markup de Límites. Cada fila muestra un emoji por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI` de `constants.js`), con fallback genérico por tipo.

11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador: con Arriendo ($800.000), Tarjeta ($250.000) e Internet ($100.000), el detalle los lista en ese orden con sus emojis de categoría. Lint limpio. SW v243 → v244.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseNecesidades()` nueva.
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` computa el desglose; `_renderDesgloseNecesidades()` y `_emojiNecesidad()` nuevas; se inserta en `_renderPanelDistribuir`.
- **`styles/components/forms.css`**: `.distribuir__nec-desglose` + `.distribuir__nec-item*`.
- **`tests/unit/tesoreria.test.js`**: 11 tests nuevos.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo.
- **`service-worker.js`**: v243 → v244.

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b, ADR 018) · 2026-07-01

Segundo slice de la épica MC.7. El panel "Distribuir mi ingreso" ya no arranca con "todo al fondo": cada meta y apartado activo aparece con su **aporte sugerido** (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo de emergencia recibe el **excedente** que queda tras esos aportes. Los objetivos sin fecha muestran $0 y un hint bajo su fila: "Ponle una fecha en Metas/Apartados para calcular cuánto aportar", con enlace a la sección correspondiente. Todo sigue siendo editable, como antes.

`construirPlanAhorro` quedó sin llamadores tras el cambio (era solo el default "todo al fondo") y se **eliminó** junto con sus 5 tests, en vez de dejarla como código muerto. `construirDesgloseAhorroPorObjetivo` (MC.7a) suma el campo `sinFecha` por fila para que la vista sepa cuándo mostrar el hint, sin que `view.js` tenga que re-derivar esa lógica leyendo fechas directamente.

3 unit + 2 E2E nuevos (netos: se sumaron 8 y se quitaron 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit (neto); 73/73 → 75/75 E2E. Verificado en el navegador: con una meta a 6 meses y $1.200.000 de faltante, sugiere $200.000; el fondo (presupuesto $600.000) recibe $400.000 de excedente; una meta sin fecha muestra $0 con el hint. Lint limpio. SW v242 → v243.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` ahora expone `sinFecha` por fila; `construirPlanAhorro()` eliminada (sin llamadores).
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` usa `construirDesgloseAhorroPorObjetivo` directamente sobre `S.metas`/`S.apartados`; `_filaDistribuir` agrega el hint de "sin fecha" con enlace a Metas/Apartados.
- **`styles/components/forms.css`**: `.distribuir-ingreso__destinos .distribuir__hint` (sin margin-top propio, ya lo da el `gap` del contenedor).
- **`tests/unit/tesoreria.test.js`**: 3 tests nuevos de `sinFecha`; se eliminó el describe de `construirPlanAhorro` (5 tests).
- **`tests/e2e/smoke.test.js`**: 2 tests nuevos (aporte sugerido + excedente del fondo; hint de meta sin fecha).
- **`service-worker.js`**: v242 → v243.

---

### feat(tesoreria): desglose de aportes de ahorro por objetivo (MC.7a, ADR 018) · 2026-07-01

Primer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). Nueva función pura **`construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro, hoy })`** en `tesoreria/logic.js`: a diferencia de `construirPlanAhorro` (que hoy sugiere todo el presupuesto al fondo), reparte un aporte sugerido **por cada meta y apartado activo** (faltante entre meses restantes, igual fórmula que `calcularAporteMensualObjetivos`), y el **fondo de emergencia recibe el excedente** que quede tras esos aportes (nunca negativo; 0 si ya está completo). Los objetivos sin fecha sugieren 0 en vez de adivinar (decisión del usuario).

Para no duplicar la fórmula, se extrajo el helper privado `_aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy)` y `calcularAporteMensualObjetivos` se refactorizó para consumirlo (extracción sin cambio de comportamiento, verificada por sus 8 tests existentes que siguen en verde). Esta función aún **no está integrada** en el panel "Distribuir mi ingreso" (eso es MC.7b); es solo la lógica de agregación, pura y testeada en aislamiento.

15 tests nuevos. 1728/1728 → 1743/1743 unit. Lint limpio. SW v241 → v242.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` nueva; `_aporteMensualObjetivo()` helper privado extraído; `calcularAporteMensualObjetivos()` refactorizada para reusarlo.
- **`tests/unit/tesoreria.test.js`**: 15 tests nuevos.
- **`service-worker.js`**: v241 → v242.

---

### docs(adr): ADR 018, "Distribuir mi ingreso" como asistente guiado de 3 pasos (MC.7, diseño) · 2026-07-01

Diseño de la épica MC.7. El panel "Distribuir mi ingreso" ([ADR 012](DECISIONS/012-auto-distribucion-ingresos.md), MC.4a-e) evoluciona a un **asistente guiado** que hace el trabajo pesado y deja al usuario solo revisar, ajustar y confirmar. Tres pasos:

1. **Necesidades** itemizada como **preview read-only** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo, con nombre/categoría/valor). El dinero no se mueve: queda en la cuenta y se paga cada obligación al vencer, como hoy. Sin schema.
2. **Ahorro** con aportes **auto-calculados por objetivo**: para metas/apartados con fecha, `faltante / periodos restantes` (reusa la fórmula de `calcularAporteMensualObjetivos`, pero devolviendo el desglose por objetivo, no solo el total); para los que no tienen fecha, sugiere 0 + hint "ponle una fecha"; el fondo de emergencia recibe el excedente si está incompleto. Todo editable.
3. **Estilo de vida** repartido entre las cuentas activas; **omitido con cuenta única** (regla de cuenta única del proyecto).

Decisiones cerradas con el usuario: (a) Paso 1 = preview, no reservar/apartar (evita schema y no toca el ADN); (b) objetivos sin fecha en el Paso 2 = sugerir 0 con invitación a poner fecha (no adivinar); (c) la implementación arranca por el **Paso 2** (auto-cálculo de Ahorro), el valor "inteligente" más tangible. Confirmación única al final; reusa el apply-plan/undo, el gating por fecha de cobro y los abonos avalancha de MC.4. Sin schema nuevo en v1. Implementación en 6 slices (MC.7a a MC.7f). Solo docs.

- **`docs/DECISIONS/018-asistente-distribuir-ingreso.md`**: nuevo ADR (contexto, 7 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.7 diseño cerrado + slices MC.7a a MC.7f.

---

## Meses anteriores

- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
