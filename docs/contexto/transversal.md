# Ficha de contexto: Transversal

> Revisado: 2026-08-14.

> Infraestructura que atraviesa varias secciones y no es visual: persistencia y cuota, el pipeline de render, el CTA de cuenta, el motor único de avisos, la infra compartida, el aviso de versión nueva, la guía por navegación y la aceptación legal. Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá.** Partido el 2026-07-24: el lenguaje de formularios y el selector de ícono están en [`captura.md`](captura.md); la identidad de color, las tejas de marca y la navegación, en [`sistema-visual.md`](sistema-visual.md). Partido de nuevo el 2026-08-14 (DOC.3, por techo): la taxonomía de categorías y las personalizadas del usuario están en [`categorias.md`](categorias.md); el sistema de logros, en [`logros.md`](logros.md); el shell de escritorio (INT.1), en [`escritorio.md`](escritorio.md).

---

## Persistencia y salvaguarda de cuota (localStorage)

- **Objetivo**          : todo el estado vive en `localStorage` bajo la clave única `fk_v1` (ADN 3). `save()` está debounced 200 ms; `_flush()` serializa `S` entero y escribe. Una salvaguarda avisa antes de llenar la cuota y evita que un guardado fallido se pierda en silencio (ADR 030).
- **Estado actual**     : estable. **PERF.4** ([ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), 2026-07-06) decidió **no** reescribir la persistencia y en su lugar agregó la salvaguarda de cuota. **IndexedDB** sigue siendo la dirección futura y desde el [ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md) (2026-08-14) **ya no es tarjeta del tablero**: ese ADR es su fuente única, fija el alcance (el mismo blob JSON en un registro de IndexedDB, **no** un store por colección) y reemplaza los tres disparadores del D4 por dos verificables (**T1** cuota medida, **T2** decisión de producto). Partir `localStorage` por clave sigue **rechazado**. Desde **PERF.8** el harness mide también el arranque: **0,6 / 2,6 / 5,1 ms** de mediana a 1.000 / 5.000 / 10.000 gastos, lineal. **PERF.9 (2026-08-14) cierra**: el harness ya mide el peso serializado real, con la semilla corregida a la forma real de un gasto (`id` UUID, `fechaCreacion` ISO, más los campos que `normalizarGasto()` siempre deja presentes). ~255,9 caracteres por gasto; el 80 % de `LIMITE_LOCALSTORAGE_CHARS` se cruza en ~14.032 gastos reales (no en los ~47.000 que sugería la semilla vieja), el dato que hace verificable a **T1** del ADR 068. Sigue sin medir el `setItem` real: en happy-dom `localStorage` es un Map en memoria. **PERF.10 cierra completa el 2026-08-14** en dos rebanadas: **PERF.10a** (fachada `restaurarBlob()` / `borrarTodo()` en `storage.js`, sus tres call sites en [`configuracion.md`](configuracion.md)) y **PERF.10b** (helper único de los tests). La clave se nombra ahora en **dos** sitios en todo el repo: `storage.js` (runtime) y `tests/e2e/helpers/estado.js` (tests, que la importa de ahí).
- **Verificado contra** : `<pendiente del commit de PERF.9>` (2026-08-14, PERF.9).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guardado debounced + flush | `modules/core/storage.js` | `save()`, `_flush()`, `_flushNow()` | ~430 |
| Evaluación de cuota (pura) | `modules/core/storage.js` | `evaluarCuota()`, `LIMITE_LOCALSTORAGE_CHARS` | |
| Estado de cuota actual (mide S) | `modules/core/storage.js` | `estadoCuota()` | |
| Aviso en Ajustes | `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` (en `_renderDatos`) | |
| Escucha de eventos + anuncio | `modules/dominio/config/index.js` | `EventBus.on('storage:error')`, `on('storage:cuota')` | |
| Fachada de escrituras que no pasan por `save()` (PERF.10a) | `modules/core/storage.js` | `restaurarBlob()`, `borrarTodo()`, `_cancelarPendiente()` | ~736 |
| Siembra y lectura del estado en los tests E2E (PERF.10b) | `tests/e2e/helpers/estado.js` | `sembrar()`, `sembrarSiVacio()`, `parchar()`, `leerEstado()`, `estadoBase()` | |
| Medición de escritura y arranque | `scripts/perf/bench.perf.js` | columnas `stringify ms`, `save ms`, `arranque ms` | |

**Dependencias y relaciones**: `_flush()` emite `state:save` (éxito), `storage:cuota` (al cruzar de nivel de uso) y `storage:error` (guardado rechazado). `config/` los escucha para avisar. `infra/memo.js` (PERF.2) escucha `state:change`, no estos. Exportar backup (`config/_exportarDatos`) usa `JSON.stringify(S)` en memoria: es independiente del layout de storage.

**Riesgos**: `LIMITE_LOCALSTORAGE_CHARS` (4.5 M chars) es un piso conservador, no el cupo exacto (varía por navegador); por eso `falloUltimoGuardado` (fallo real) manda sobre la estimación. Si algún día se migra a IndexedDB (ADR 068), `loadData()` pasa a async y el bootstrap con él: sigue siendo el cambio de mayor riesgo del proyecto, pero **PERF.10 le quitó la parte más cara**, que era reescribir el sembrado a mano de 13 suites; ahora el sembrado se cambia en un archivo. Riesgo nuevo de esa concentración: **`page.addInitScript()` serializa su función y la corre en el navegador**, así que el helper no puede cerrar sobre nada de Node y la clave tiene que viajar como argumento. Cualquier función nueva del helper que teclee la clave adentro del closure vuelve a abrir la fuga. Y una función local de una suite que se llame igual que una exportación del helper la sombrea en silencio: pasó con `sembrar` en TX.12 y se manifestó como `RangeError: Maximum call stack size exceeded`, no como un error de nombre.

**Cambios realizados**: `2026-07-06 (PERF.4, ADR 030)`: salvaguarda de cuota + guardado que ya no falla en silencio (detalle en CHANGELOG). `2026-07-31 (PERF.8)`: columna "arranque" en el harness, el dato que el D4 pedía. `2026-08-13 (PERF.5)`: pedido de ejecución evaluado y **rechazado**, los tres disparadores del D4 siguen cerrados; sin cambios de código. `2026-08-14 (ADR 068)`: PERF.5 sale del tablero, el alcance queda fijado en blob-en-IndexedDB y los disparadores pasan a dos verificables; nacen PERF.9 y PERF.10; sin cambios de código. `2026-08-14 (PERF.10a)`: fachada `restaurarBlob()` / `borrarTodo()`, y el `QuotaExceededError` al restaurar respaldo deja de reportarse como archivo corrupto. `2026-08-14 (PERF.10b, cierra PERF.10)`: helper único de los tests, de 13 archivos con la clave a 1. `2026-08-14 (PERF.9)`: columna "caracteres" + "% cupo" en el harness, semilla de gastos corregida a la forma real de un registro, T1 del ADR 068 ya tiene instrumento.

---

## Pipeline de render: directo vs. agendado (PERF.6)

- **Objetivo**          : hay dos rutas de render y la diferencia importa. **Directo y síncrono**: `renderAll()` (arranque), los listeners de `hashchange` (navegación) y los handlers que pintan su propia vista tras una acción. **Reactivo y agendado**: los listeners de `state:change` que repintan paneles pasan por `programarRender(fn)`, que los colapsa a un solo pintado por tick.
- **Estado actual**     : estable. `infra/crud.js` emite **un `state:change` por mutación**, así que una acción multi-sección emite muchas veces en un solo tick (una distribución del ingreso: 12). Antes de PERF.6 cada emisión repintaba: **~398 ms** de JavaScript con 10.000 gastos estando en Inicio. Con la cola, **~94,5 ms**, que es exactamente el costo de un render único (4,2x, medido a 3 volúmenes en [`BASELINE.md`](../../scripts/perf/BASELINE.md)). Ocho listeners agendan; los que no pintan paneles (logros evalúa, gastos actualiza el saldo, metas regenera planes) siguen directos a propósito.
- **Verificado contra** : `9d40e00` (2026-08-13, PERF.6).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Cola, dedup y vaciado en microtask | `modules/infra/render.js` | `programarRender()`, `vaciarRendersProgramados()` | ~78 |
| Render condicional por sección visible | `modules/infra/render.js` | `renderSmart()` | ~74 |
| Orquestador síncrono del arranque | `modules/infra/render.js` | `renderAll()`, `registrarRender()` | ~415 |
| Los 8 listeners que agendan | `modules/dominio/{resumen,movimientos,compromisos,presupuesto,ahorro,tesoreria,analisis,agenda}/index.js` | `_renderReactivo` / `_renderTodo` / `_renderSegunSeccion` | |
| Medición de la ráfaga | `scripts/perf/bench.perf.js` | bloque "ráfaga de una acción multi-sección" | |

**Dependencias y relaciones**: el dedup es **por identidad de la función**, así que un listener que agende una flecha creada en el propio callback no se deduplica nunca (pinta una vez por emisión, como antes). De ahí la regla: agendar siempre una función de módulo. La cola es independiente de `infra/memo.js`: memo evita **recalcular** lo mismo, la cola evita **pintar** lo mismo, y se necesitan las dos (dentro de una ráfaga cada emisión invalida el memo de su sección, así que sin la cola cada repintado era un recálculo genuino).

**Riesgos**: un `state:change` ya no deja el DOM actualizado en la línea siguiente. Cualquier código nuevo que emita y después lea el DOM que ese render produce tiene que agendar su lectura igual, o pintar directo. Los renders de navegación y arranque quedaron síncronos justamente para no arrastrar ese contrato a las rutas donde el usuario espera ver el resultado ya. En tests, `vaciarRendersProgramados()` da un punto de vaciado síncrono; en E2E no hace falta (Playwright auto-espera y el microtask corre antes del paint).

**Cambios realizados**: `2026-08-13 (PERF.6)`: cola de renders reactivos, 8 listeners migrados y escenario de ráfaga en el harness (cifras en `BASELINE.md`).

---

## CTA "necesitas una cuenta" (registro bloqueado por falta de cuenta)

- **Objetivo**          : cuando el usuario intenta registrar un ingreso, un gasto o un abono sin ninguna cuenta activa, el mensaje no se limita a informar el requisito: ofrece una acción única que lo lleva directo a crear la cuenta (cierra el modal actual, navega a Mis cuentas y abre el formulario de nueva cuenta). Reduce la fricción del onboarding: si falta un requisito, se guía a resolverlo, no solo se avisa.
- **Estado actual**     : unificado (2026-07-06). Un solo mecanismo: `data-action="ir-a-crear-cuenta"` → EventBus `'cuenta:crear'` → `_nuevaCuenta` abre `#modal-cuenta`. Copy común "Crear una cuenta" en las **cuatro superficies** que lo ofrecen hoy: los tres empty states de la tabla más el modal guiado de 0 cuentas (que usa `data-role="ir"`, no la acción, porque vive en `infra/`). El sello viejo decía "5 puntos de entrada": ya no coincide con el código, el conteo verificado es 4. Antes cada surface hacía algo distinto: ingreso puntual solo cerraba el modal (bug: no navegaba), gastos navegaban sin abrir el form, el abono era un callejón sin salida ("Cerrar").
- **Verificado contra** : `7e11afe` (2026-08-14, DOC.3: anclas y comportamiento re-verificados uno por uno; el sello anterior era `9eaeb4d` del 2026-07-06 y sus líneas ya no coincidían).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Acción unificada (cierra modal + navega + emite evento) | `modules/ui/actions.js` | `registrarAccion('ir-a-crear-cuenta', ...)` | ~170 |
| Suscripción que abre el form de nueva cuenta | `modules/dominio/tesoreria/acciones/cuentas.js` | `EventBus.on('cuenta:crear', _nuevaCuenta)` en `initAccionesCuentas()` | ~573 |
| Modal guiado de flujos de un clic (0 cuentas) | `modules/infra/cuenta-helper.js` | `_mostrarGuiadoCero()` (botón `data-role="ir"`), emite `'cuenta:crear'` | ~321, ~366 |
| Empty state Nuevo ingreso | `modules/dominio/tesoreria/views/ingresos.js` | `renderFormIngresoPuntual()` (rama `cuentas.length === 0`) | ~331 |
| Empty state Gasto | `modules/dominio/gastos/view.js` | `renderFormGasto()` (rama `cuentas.length === 0`) | ~584 |
| Empty state Abono a deuda | `modules/dominio/compromisos/views/formularios.js` | `renderFormAbono()` (rama `cuentas.length === 0`) | ~41 |

**Recursos**: ninguno gráfico propio; reusa `#modal-cuenta` (form de nueva cuenta, estático en `index.html`), la clase `.form-empty`/`.empty-state` y los botones estándar.

**Dependencias y relaciones**: `ir-a-crear-cuenta` vive en el shell (`ui/actions.js`), que no importa dominios; se comunica con tesorería por EventBus (ADN 10). `cuenta-helper.js` (infra) emite el mismo evento tras navegar, sin importar `ui` (evita invertir el layering infra→ui). El helper `_mostrarGuiadoCero` lo disparan `resolverCuenta`/`resolverPago*` cuando un flujo de un clic (Marcar pagado, confirmar gasto multi-cuenta, aportar a meta/apartado) detecta 0 cuentas: todos esos flujos heredan la mejora sin tocarlos. La regla de cuenta única (patrón 0/1/varias) sigue viviendo en `cuenta-helper.js`.

**Riesgos**:

- El evento `'cuenta:crear'` abre `#modal-cuenta`, que es estático en `index.html`: funciona aunque la sección tesorería aún no se haya renderizado. Si ese modal se moviera o renombrara, el CTA quedaría mudo (solo navegaría). `_nuevaCuenta` usa guardas `if (el)`, así que con el DOM incompleto no rompe, solo no abre.
- Orden en `ir-a-crear-cuenta`: cerrar el modal actual (libera foco + quita `inert`) ANTES de abrir `#modal-cuenta` (atrapa foco + `inert`), mismo patrón que `registrar-abrir`. El `navigate('tesoreria')` dispara `hashchange` async; su intento de mover el foco a `#sec-tesoreria` es no-op porque el fondo queda `inert` con el modal abierto.
- Los `<a href="#tesoreria">` de los empty states conservan el href como fallback semántico, pero `dispatch()` hace `preventDefault()`: la navegación real la hace la acción, no el href.

**Cambios pendientes**: ninguno.

**Cambios realizados**:

- 2026-08-14 (DOC.3, sin código): sello re-verificado contra el código. Las 6 anclas siguen vivas y el mecanismo no cambió; se corrigieron las 6 líneas orientativas (habían corrido entre 4 y 200 líneas) y el conteo de superficies, que era 5 y hoy es 4.
- 2026-07-06: unificacion del CTA. Accion `ir-a-crear-cuenta` y evento `cuenta:crear` nuevos; los empty states y modales convergen en el mismo copy y comportamiento.

**Observaciones**: el mismo principio ("no informar un requisito sin ofrecer la acción para resolverlo") aplica a futuros bloqueos; si aparece otro requisito duro (ej. registrar un abono sin deudas, aportar sin metas), replicar el patrón antes que dejar un mensaje muerto.

---

## Motor único de avisos (CFG.3, iniciativa transversal)

- **Objetivo**          : responder "de todo lo que le pasa al usuario hoy, qué merece avisarle", mirando todas las secciones a la vez. Los `nudge` de cada sección son la señal en contexto dentro de su pantalla y no se comparan entre sí; este motor es el único que puede decir si va primero un arriendo vencido o un tope excedido.
- **Estado actual**     : **iniciativa CFG.3 completa (2026-08-13)**, las tres rebanadas del **[ADR 066](../DECISIONS/066-motor-unico-de-avisos.md)**. Existe el motor (`infra/avisos.js`, ocho tipos de aviso de siete fuentes), la notificación del sistema al abrir (CFG.3a), el panel "Avisos" en Inicio con lo que ningún otro panel del dashboard ya cubre (CFG.3b, detalle en [`contexto/inicio.md`](inicio.md)) y el interruptor por sección en Ajustes + el sello persistido de "ya avisó hoy" (CFG.3c, schema v40, detalle en [`contexto/configuracion.md`](configuracion.md)).
- **Verificado contra** : CFG.3c (2026-08-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Motor: recolecta, clasifica y ordena | `modules/infra/avisos.js` | `recolectarAvisos()` | ~250 |
| Filtro de lo que justifica interrumpir | `modules/infra/avisos.js` | `avisosQueInterrumpen()`, `SEVERIDADES_QUE_INTERRUMPEN` | ~300, ~60 |
| Umbrales del motor (3 días, 7 días) | `modules/infra/avisos.js` | `DIAS_COMPROMISO_PROXIMO`, `DIAS_APARTADO_PROXIMO`, `DIAS_PRESTAMO_PROXIMO` | ~63 |
| Recolector por fuente (uno por dominio) | `modules/infra/avisos.js` | `_deCompromisosVencidos()` ... `_deDiaDePago()` | ~110 |
| Superficie: notificación del sistema | `modules/infra/notificaciones.js` | `verificarYNotificar()` | ~120 |
| Copy de esa superficie | `modules/infra/notificaciones.js` | `formatearAvisoSistema()`, `_frase()` | ~160, ~190 |
| Disparo al arrancar (detrás del primer render) | `modules/ui/bootstrap.js` | `verificarYNotificar()` | ~116 |
| Superficie: panel "Avisos" en Inicio (CFG.3b) | `modules/dominio/resumen/view.js` | `renderPanelAvisos()`, `_TIPOS_SIN_PANEL_PROPIO` | ~155 |
| Preferencia por sección + sello del día (CFG.3c) | `modules/infra/avisos.js` | `SECCIONES_AVISO`, `LABEL_SECCION_AVISO`, `filtrarPorPreferencia()` | ~78 |
| Interruptor en Ajustes (CFG.3c) | `modules/dominio/config/view.js` / `index.js` | `_renderPreferenciasAvisos()`, `_toggleAvisoSeccion()` | |
| Migración v39 → v40 | `modules/core/storage.js` | bloque `< 40` en `_migrate` | ~592 |

**Las siete fuentes y quién detecta cada una** (el motor no reimplementa ninguna regla de fecha ni de umbral):

| Tipo | Función | Dónde vive |
|---|---|---|
| `compromiso-vencido` | `vencidosSinPagar` (atraso >= 1 día) | `dominio/compromisos/logic.js` |
| `compromiso-proximo` | `compromisosProximos` (0 a 3 días) | `dominio/compromisos/logic.js` |
| `limite-excedido`, `limite-alerta` | `alertasLimites` | `dominio/presupuesto/logic.js` |
| `apartado-proximo`, `apartado-listo` | `apartadosProximos`, `estaListoParaReiniciar` | `dominio/apartados/logic.js` |
| `prestamo-vencido`, `prestamo-proximo` | `estadoPrestamo` | `dominio/personales/logic.js` |
| `dia-de-pago` | `ocurrenciasEnMes` sobre los ingresos activos | `infra/vencimientos.js` |

**Dependencias y relaciones**: `infra/avisos.js` importa cinco `logic.js` de dominios, solo lectura y nunca un `index.js`/`view.js` ([ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md)); el precedente ya existía en `infra/notificaciones.js`. Es puro: no lee `S`, no toca el DOM, la fecha entra como `hoyISO`. Quien lee `S` es `verificarYNotificar()`, que le pasa las seis colecciones. Desbloquea **PA.1c** (aviso de débito sin saldo o crédito sin cuenta, [ADR 052](../DECISIONS/052-pagos-automaticos.md); PA.1a y PA.1b ya cerradas) y los recordatorios de préstamos del [ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md): entran como una fuente más de la tabla de arriba.

**Riesgos**:

- **Con la app cerrada no hay aviso, y no es una limitación temporal**: un service worker no puede leer `localStorage`, donde vive todo `fk_v1`, así que no tiene con qué calcular un vencimiento (ADR 066 D1). El copy de Ajustes no debe prometer lo contrario. Único disparador de revisión: mudar la persistencia a IndexedDB ([ADR 068](../DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), ya no es tarjeta). Resolvería el **acceso al dato**, no la **ejecución**: sin push server (ADN 3) y con `periodicsync` solo en Chromium con PWA instalada, el worker igual no corre con la app cerrada.
- **`DIAS_APARTADO_PROXIMO` es 7, no el `DIAS_PROXIMO` (30) del dominio**: son dos preguntas distintas (listar en la sección contra avisar hoy) y a propósito no comparten constante. Bajarlas a una sola volvería a llenar el aviso todos los días.
- **Lo que vence hoy nunca es `compromiso-vencido`**: el motor le pide a `vencidosSinPagar` un `umbralDiasAtraso: 1` para que el día del vencimiento lo cubra solo `compromiso-proximo` con `dias: 0`. Si alguien baja ese umbral a 0, el mismo compromiso genera dos avisos el mismo día.
- **Los préstamos personales nunca pasan de severidad `media`**, ni con un año de atraso: el [ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md) fija que esa sección recuerda y no presiona, y una notificación del sistema por dinero que le deben al usuario es justo esa presión. Interrumpir queda para lo que él debe.
- **El motor no recorta la lista** (ADR 066 D4): si una superficie nueva muestra solo tres avisos, el `slice` va en la superficie. Recortar en el motor se lo esconde a todas a la vez.
- **`nombre` es dato del usuario, nunca copy**: hay un test que verifica que no contenga palabras como "vence" u "hoy". Meter una frase ahí rompe la separación que hace testeable al motor sin fijar el copy.
- **El sello de "ya avisó hoy" (CFG.3c) reemplazó el flag de sesión, no lo sumó**: `S.config.ultimoAvisoISO` es lo único que decide si `verificarYNotificar()` avisa; ya no existe un flag en memoria ni su reset de test (`_resetNotificadoEstasSesion` se eliminó de `notificaciones.js`). Cualquier test que necesite reabrir el día siguiente debe mutar `S.config.ultimoAvisoISO` directo, no llamar a una función de reset.
- **La preferencia por sección (CFG.3c) es por `SECCIONES_AVISO` (cinco), no por los nueve `TIPOS_AVISO`**: decisión y alternativa rechazada en la nota del 2026-08-13 del ADR 066. Un tipo nuevo que se agregue al motor hereda automáticamente la preferencia de su sección; no hace falta tocar el interruptor de Ajustes.
- **Apagar una sección en Ajustes no repinta el panel de Inicio al instante**: `_toggleAvisoSeccion()` solo re-renderiza `#panel-config` (mismo patrón que el resto de toggles de esa pantalla, ninguno emite `state:change`). El panel de Inicio respeta la preferencia en su próximo render, no en vivo.

**Cambios pendientes**: ninguno. Iniciativa completa.

**Cambios realizados**:

- 2026-08-13 (CFG.3c, cierra la iniciativa, [ADR 066](../DECISIONS/066-motor-unico-de-avisos.md) nota de la misma fecha): interruptor por sección en Ajustes (`filtrarPorPreferencia()` en el motor, consumido por `notificaciones.js` y por el panel de Inicio) + sello persistido `config.ultimoAvisoISO` que reemplaza el flag de sesión. Schema v39 → v40. Detalle completo: [`contexto/configuracion.md`](configuracion.md).

- **CFG.3b (2026-08-13)**: panel "Avisos" en Inicio (`resumen/view.js`, `renderPanelAvisos()`), quinta celda del grupo "Atención hoy". Filtra el motor a los tres tipos sin superficie propia (`apartado-listo`, `dia-de-pago`, `prestamo-vencido`): los demás ya viven en "Pendientes del mes", "Próximas prioridades" y "Alertas de límites", sin tocar esa lógica. Detalle completo: [`contexto/inicio.md`](inicio.md).
- **CFG.3a (2026-08-13)**: motor `infra/avisos.js` (ocho tipos, siete fuentes, severidad y orden) y `infra/notificaciones.js` consumiéndolo; `verificarYNotificar()` pasa a leer `S` completo en vez de recibir `S.compromisos`. Riesgo técnico resuelto y escrito en el ADR 066. Sin schema, sin UI nueva.

---

## Infra compartida: qué se consolidó y qué se dejó duplicado a propósito

- **Objetivo**          : dónde vive el cálculo compartido entre dominios, y **cuáles duplicaciones son decisión, no descuido**. Nace del patrón P7 de la auditoría de UX/producto (2026-07-21).
- **Estado actual**     : **ARQ.1 y ARQ.2 cerradas (2026-08-02).** Ninguna tarjeta viva. El relato de cada rebanada vive en el CHANGELOG; acá queda solo lo que hay que saber para no rehacer el análisis.
- **Verificado contra** : `87b6b04`, `bc25fe9` (ARQ.1a/b) y el cierre de ARQ.2, 2026-08-02.

**Fuentes únicas que dejó ARQ.1/ARQ.2**

| Cálculo | Vive en | Lo consumen |
|---|---|---|
| Progreso, plan y estado de una bolsa | `infra/bolsas.js`: `progresoDeBolsa()`, `diasHastaFecha()`, `planDeReferencia()`, `estadoDeBolsa()` | Fondo, Metas, Apartados, Inversión (cada uno conserva su envoltorio y su vocabulario: `completado` vs. `completada`) |
| Si una bolsa descuenta saldo | `infra/bolsas.js`: `descuentaSaldo()`, tabla del [ADR 053](../DECISIONS/053-invariante-de-patrimonio.md) I2 | Análisis. `calcularActivos()` **no** la llama a propósito (I4: la regla de suma no se toca de forma retroactiva), y un test documenta esa brecha aceptada |
| Etapa del portafolio | `infra/portafolio.js`: `etapaDePortafolio()` (número de etapa, cero copy) | `momentoInversion()` y el carril de la casa de Ahorro |
| "Hoy" en ISO | `infra/utils.js`: `hoy()`, con getters locales de `Date` (correcta en UTC-5) | los 5 sitios que antes usaban `new Date().toISOString().slice(0,10)` y devolvían mañana desde las 7 p.m. (BUG-018) |
| Factor de periodicidad de un ingreso | `infra/financiero.js`: `FACTOR_MENSUAL_INGRESO`; `tesoreria/logic/ingresos.js` lo reexporta como `FACTOR_MENSUAL` | Distribución. Sin cambio de valores ni de callers |
| Registrar el pago o abono de un compromiso | `infra/pago-compromiso.js`: `gastoDePagoCompromiso()`, `bajarSaldoDeuda()` | Compromisos (×2), Agenda y la Distribución v2: cuatro copias, no las tres del hallazgo original |

**Duplicaciones intencionales: no volver a proponerlas sin decisión nueva**

- **Handlers de "aportar"** (`_guardarAbonoMeta` en `metas/index.js`, `_guardarAporte` en `apartados/index.js`) siguen casi idénticos. Decisión de Esteban, 2026-08-02: el cálculo ya está unificado; lo que queda es orquestación de UI (`confirmar()`, DOM, `announce()`), y `infra/bolsas.js` se declara "sin DOM" a propósito. `_ajustarSaldoCuenta` ya se repite igual en 7 dominios: unificarla solo acá sería una excepción arbitraria.
- **Las tablas de periodicidad de 9 entradas** (`compromisos/logic/modelo.js`, `ahorro/index.js`) no se fusionan con `FACTOR_MENSUAL_INGRESO`: son otra tabla (suman Bimestral, Trimestral, Semestral, Anual y Única vez).
- **`totalesDelMes`/`totalDia`** (`agenda/logic.js`) vs. **`_obligacionesEnRango`** (privada, `infra/vencimientos.js`): ya divergieron antes del refactor, porque la segunda topa el monto de una deuda a `saldoTotal` (BUG-004) y Agenda no. Consolidarlas cambiaría lo que el hero de Agenda muestra en una deuda casi saldada: es cambio de comportamiento, no refactor mecánico. Sin tarjeta.
- **El descuento de la cuenta de origen** se queda en cada caller de `pago-compromiso.js`: inmediato por split en Compromisos, acumulado por cuenta en Agenda, fusionado con el crédito del ingreso en la Distribución v2. El helper compartido no toca `cuentas`.
- **`isoFecha(d)`** (`tesoreria/logic/ingresos.js`) y **`_iso(d)`** (privada, `infra/vencimientos.js`) no subieron a `infra/utils.js`: formatean una fecha cualquiera, no "hoy", y ya son locales. `fechaCobertura` (`ahorro/logic.js`) usa `toISOString()` a propósito, sobre un `Date` construido en UTC a mediodía. El defecto que queda es de lectura y es **BUG-025**.

---

## Aviso de actualización del Service Worker + novedades (UPD.1)

- **Objetivo**          : el SW ya recargaba solo, en silencio, cuando detectaba una versión nueva y era seguro hacerlo (sin modal abierto, sin input con foco). El hueco real era el caso contrario: si no era seguro, el usuario se quedaba sin ninguna señal hasta la próxima recarga casual. UPD.1 cubre exactamente ese hueco con un aviso discreto + botón, y agrega un resumen de novedades que se muestra una sola vez tras actualizar.
- **Estado actual**     : **cerrada (2026-08-02)**. Decisión de alcance: el caso seguro sigue recargando solo sin aviso (comportamiento ya en producción, commits `d13b45c`/`cd14689`, 2026-07-27); el aviso visible aparece solo cuando el guard bloquea la recarga automática.
- **Verificado contra** : `fbaeba6` (2026-08-02).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Guard que bloquea la recarga automática | `modules/infra/sw-register.js` | `esSeguroRecargar()`, listener `controllerchange` | ~56, ~67 |
| Puente hacia el aviso (el SW es `<script>` clásico, no importa `EventBus`) | `modules/infra/sw-register.js` | `document.dispatchEvent(new CustomEvent('sw:actualizacion-lista'))` | ~77 |
| Banner + botón "Actualizar ahora" | `modules/ui/sw-aviso.js` | `initSwAviso()`, `_mostrarAviso()` | ~12, ~16 |
| CSS del banner (mismo esqueleto que `.logro-toast`, sin autocierre) | `styles/components/nudges.css` | `.sw-aviso` | ~260 |
| Catálogo de novedades por versión (clave = número de `CACHE_NAME`) | `modules/core/constants.js` | `NOVEDADES_POR_VERSION` | ~901 |
| Última versión conocida del catálogo (usada por el default y la migración) | `modules/core/constants.js` | `ultimaVersionNovedadesConocida()` | ~909 |
| Marca persistida de hasta dónde ya vio el usuario | `modules/core/state.js` | `config.ultimaVersionVista` | ~412 |
| Migración v31 a v32 (backfill al catálogo vigente en ese momento) | `modules/core/storage.js` | `SCHEMA_VERSION = 32`, migración | ~21, ~472 |
| Modal de novedades (reusa `.modal`/`.modal__header` etc., patrón de `confirm.js`) | `modules/ui/novedades.js` | `mostrarNovedadesSiHay()` | ~18 |
| CSS del modal (lista con viñetas dentro de `.modal__body`) | `styles/modals.css` | `.novedades__lista` | ~570 |
| Wiring en el arranque | `modules/ui/bootstrap.js` | `initSwAviso()`, `mostrarNovedadesSiHay()` | ~78 |

**Dependencias y relaciones**: `sw-register.js` (clásico, sin imports) es el único puente entre el ciclo de vida real del SW y el resto de la app; el `CustomEvent` en `document` es el patrón elegido para cruzar esa frontera sin romper ADN 8 (cero `window.X`). El resumen de novedades es independiente del aviso: corre en cada arranque (`bootstrap.js`) sin importar si la versión nueva entró por la recarga silenciosa o por el botón del aviso. `NOVEDADES_POR_VERSION` y `ultimaVersionNovedadesConocida()` desacoplan a propósito el catálogo de `CACHE_NAME`: no todo bump de SW (uno por tarea que toque código, ver `OPERACION.md`) amerita una entrada de novedades, así que el catálogo queda disperso por diseño.

**Riesgos**:

- **El ciclo de vida del SW tiene esquinas** (waiting/controllerchange/doble recarga) y sigue sin cobertura automatizada: `sw-register.js` no corre en localhost (rama `_esDesarrollo`), así que el guard, el `CustomEvent` real y la recarga solo se pueden verificar en producción o con el SW forzado a mano. Lo que sí se verificó de forma aislada: `initSwAviso()` + un `CustomEvent` simulado muestran el banner correcto y el botón recarga; `mostrarNovedadesSiHay()` con un catálogo de prueba abre el modal, lista los puntos y persiste `ultimaVersionVista` al cerrar.
- **`NOVEDADES_POR_VERSION` depende de disciplina manual**: nadie lo llena automáticamente al bumpear `CACHE_NAME`. Si una tarea futura quiere avisar de una novedad, tiene que acordarse de agregar la entrada; no hay guardarraíl que lo fuerce.
- **Catálogo vacío en este cierre**: no había contenido de producto decidido para anunciar (el copy de novedades es decisión de Esteban, mismo criterio que el copy de UX Writing en otras tarjetas). El mecanismo completo queda probado con datos de prueba, listo para la primera entrada real.

**Cambios pendientes**: ninguno de UPD.1 (tarjeta cerrada, sale del BOARD).

**Cambios realizados**:

- **2026-08-02 (UPD.1)**: aviso discreto + botón para el caso bloqueado, resumen de novedades una sola vez, `config.ultimaVersionVista` (schema v32). Detalle completo en el CHANGELOG.

---

## Sistema de guía por navegación (GU.1, auditoría GU.1a cerrada 2026-08-03)

- **Objetivo**          : principio "aprender usando, no leyendo": el usuario descubre la app guiado en el momento de necesidad, no leyendo texto permanente. Ya se aplica en varios puntos (CTA de cuenta lleva a crearla, CAL.1 ofrece distribuir al llegar el ingreso, el fondo recomienda su aporte en la distribución) y se adopta como principio transversal.
- **Estado actual**     : **[ADR 016](../DECISIONS/016-banner-proposito-de-seccion.md) auditado y vigente sin desviaciones.** GU.1a se adelantó a su recomendación original ("después de las v2 grandes") por instrucción directa: alcance acotado a lo ya en producción, con el único hallazgo cruzado marcado para que su sección v2 lo resuelva al rediseñar (no antes).
- **Inventario verificado** (17 secciones de dominio + `index.html` + `shell.js`):
  - Las 11 secciones del ADR (`modules/ui/proposito.js`) tienen su banner, cero código muerto de EP.1-EP.6 (`propositoColapsado`, toggles, bloque de Ajustes: ningún rastro en `modules/`), y sus empty states quedaron recortados sin repetir el banner (verificado contra la tabla de EP.7 más abajo).
  - El único `section__subtitle` que queda en `index.html` (Mis cuentas, "Fuentes de ingreso") es título de sub-bloque, no descripción de propósito: encaja en la excepción que el propio ADR ya declara para "Mis ingresos fijos".
  - Las 6 secciones sin banner (Dashboard, Ajustes, Movimientos, Accesos, Import, Logros) siguen fuera con motivo propio: Dashboard/Ajustes ya excluidas por el ADR; Movimientos y Accesos son autoevidentes (listado/tiles); Import tiene su instrucción funcional fija, no de propósito; Logros ya aplica el principio "aprender usando" en su propio idioma (hint de "cómo conseguirlo" por logro) y no necesita el patrón del banner encima.
  - **Único hallazgo:** Ahorro apila dos preguntas gancho cuando el fondo está vacío (banner + hero, detalle en [`contexto/ahorro.md`](ahorro.md)). Cae dentro de **AH.5 D3** (rediseño del hero), no se toca acá por la regla anti-doble-trabajo.
- **Conclusión formal**: no hace falta re-cortar GU.1a en tarjetas por sección; el sistema transversal está sano y el ADR no se revisa de fondo, solo se confirma.

**Regla anti-doble-trabajo**: esta tarjeta define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus propias iniciativas v2, que aplican el principio en vez de duplicarlo.

---

## Aceptación legal versionada (LEG.2)

- **Objetivo**          : aceptación expresa del paquete legal antes de usar la app (onboarding, usuario nuevo) y re-aceptación cuando la versión vigente cambie (usuario existente). No espera al checklist de contenido de [`legal/README.md`](../legal/README.md) (responsable, contacto, licencia, revisión de abogado): eso bloquea el paso a v1.0, no el mecanismo, que corre sobre `VERSION_LEGAL` vigente (`Borrador v0.1`).
- **Estado actual**     : cerrada (2026-08-04). Onboarding gana paso 2 (checkbox único + 3 enlaces al Centro Legal); gate standalone `#aceptacion-legal` para `S.onboarded === true` con `legalAceptado` ausente o de otra versión, bloqueante (Escape lo ignora vía `data-bloqueante`). Usuario existente con datos ya guardados queda **grandfathered** en la migración v33 (versión histórica `Borrador v0.1`, hardcoded a propósito): no se le exige aceptar retroactivamente el día del despliegue.
- **Verificado contra** : `53becc8` (2026-08-04).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Registro de aceptación en el estado | `modules/core/state.js` | `config.legalAceptado` | ~425 |
| Migración v32 a v33 (grandfather) | `modules/core/storage.js` | `SCHEMA_VERSION = 33` | ~21, ~485 |
| Bloque compartido + gate standalone | `modules/ui/aceptacion-legal.js` | `faltaAceptarLegal()`, `renderBloqueAceptacion()`, `registrarAceptacion()`, `initAceptacionLegal()` | |
| Paso 2 del wizard | `modules/ui/onboarding.js` | `_renderPaso2()`, `_onSubmitPaso2()` | |
| Escape ignora overlays bloqueantes | `modules/ui/actions.js` | `_handleKeydown()`, `data-bloqueante` | ~54 |
| Overlay del gate | `index.html` | `#aceptacion-legal` | |
| Wiring de arranque | `modules/ui/bootstrap.js` | `initAceptacionLegal()`, tras `initOnboarding()` | |

**Dependencias y relaciones**: reusa la acción global `abrir-legal` (registrada por `config/index.js`, LEG.1) para los 3 enlaces del checkbox, sin importar el dominio config desde `ui/`. `bootstrap.js` difiere `mostrarNovedadesSiHay()` mientras el gate esté pendiente, para no abrir dos modales encima (`trapFocus` no apila).

**Riesgos**:

- **El checklist de contenido sigue abierto** (`legal/README.md`): responsable, correo de contacto y licencia del código sin decidir; revisión de abogado colombiano pendiente (trabajo externo). El paquete sigue en v0.1 borrador; cuando suba a v1.0 (o cualquier cambio importante), el gate de re-aceptación se activa solo con el bump de `VERSION_LEGAL`.
- **La versión hardcoded `Borrador v0.1` en la migración v33 no debe seguir a `VERSION_LEGAL`** si ese texto cambia: es un hecho histórico de esa migración, mismo precedente que `REMAPEO_TIPO_DEUDA` (v18 a v19).
- **Evidencia solo local** (limitación honesta ya documentada en `legal/README.md`): sin servidor, `legalAceptado` vive únicamente en el dispositivo del usuario.

**Cambios pendientes**: ninguno de código. El paso a v1.0 depende del checklist de contenido, que es trabajo de Esteban/abogado, no de esta tarjeta.

**Cambios realizados**:

- **2026-08-04 (LEG.2)**: onboarding de 2 pasos, gate de re-aceptación, migración v33 grandfathered. Detalle en el CHANGELOG.

