# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-07-24 (Fase 2 de la reorganización documental: purga de narrativa cerrada, ver [`MIGRACION.md`](MIGRACION.md)). La historia de lo ya cerrado vive en [`CHANGELOG.md`](CHANGELOG.md) y en las fichas de [`contexto/`](contexto/README.md), no aquí.

---

## En proceso

_(vacío: elegir la siguiente tarjeta de "Pendientes")_

---

## Cómo usar este tablero

1. Elegir **una** tarjeta de "Pendientes" (o del backlog del usuario si hay una nueva).
2. Abrir la ficha de su sección en [`contexto/`](contexto/README.md): si el bloque de la funcionalidad existe y está vigente, trabajar desde ahí sin re-explorar el proyecto; si no existe, el primer paso de la tarea es el análisis profundo + escribir el bloque (`/CLAUDE.md` sección 3).
3. Moverla a "En proceso" con la fecha de inicio.
4. Trabajarla en una sola sesión cuando sea posible; verificar en la app + tests verdes.
5. Al cerrar: commit → actualizar la ficha de [`contexto/`](contexto/README.md) → **borrar la tarjeta de este archivo** → agregar entrada en [`CHANGELOG.md`](CHANGELOG.md) → actualizar [`HANDOFF.md`](HANDOFF.md) (últimas 5) → si cerró un error, borrarlo de [`BUGS.md`](BUGS.md).

Campos de una tarjeta:

```markdown
### <ID> - <título corto>
- Prioridad  : alta | media | baja
- Estado     : pendiente | opcional | requiere ADR
- Objetivo   : qué resuelve, en una frase
- Secciones  : secciones de la app afectadas
- Archivos   : rutas relativas involucradas
- Depende de : otra tarjeta o "nada"
- Modelo     : capacidad + nivel sugeridos (ver la skill `elegir-modelo`)
```

Reglas de las tarjetas (ver la skill `triaje-tarea`):

- **Sin duplicados:** antes de crear una tarjeta, buscar otras sobre la misma funcionalidad, sección o componente; si comparten objetivo o tocan la misma parte del sistema, consolidarlas en una sola (la más completa absorbe a las demás).
- **Dividir lo grande:** una tarjeta que toque varios dominios o varias capas (lógica, vista, estilos, datos, accesibilidad, tests) se parte en subtareas verificables de forma independiente (sufijos `a`/`b` o slices), encadenadas con "Depende de".
- **Triaje antes de ejecutar:** toda tarea nueva del usuario pasa primero por triaje contra este tablero, los ADRs y las fichas de contexto (¿existe parcial?, ¿modifica algo aprobado?, ¿se integra a una iniciativa?, ¿depende de algo?, ¿se difiere?). La tarjeta "En proceso" no se abandona por ideas nuevas; cada funcionalidad tiene UNA sola entrada canónica (tarjeta o iniciativa) y las mejoras relacionadas se integran ahí.

---

## Índice de pendientes

Las 50 tarjetas del tablero, para elegir la próxima sin cargar el archivo completo (principio 9). "Depende de" va acortado a la referencia clave; el texto completo vive en la tarjeta, más abajo por sección.

| ID | Título | Sección | Prioridad | Depende de |
|---|---|---|---|---|
| CAL.5b | El lote también cubre deudas, y se ofrece desde Inicio | Calendario | media | ARQ.2 (deudas); Inicio no depende de nada |
| MC.13 | Distribución v2: contextual por fecha, guiada y con origen real | Mis cuentas | alta | nada |
| MC.13e-2b | Quitar "Abonar extra a deudas" del asistente | Mis cuentas | media | conviene antes de MC.13e-2f |
| MC.13e-2c | Identidad visual por fila: logo/ícono + nombre + nota | Mis cuentas | media | verificar notas ya existentes en el análisis |
| MC.13e-2d | Cuota del período en las filas de ahorro, no el objetivo total | Mis cuentas | media | nada (el motor ya existe) |
| MC.13e-2e | Completar con saldo de otras cuentas si el ingreso no alcanza | Mis cuentas | media-alta | conviene después de MC.13e-2b |
| MC.13e-2f | Integración con la cuenta del ingreso fijo + decisión del remanente | Mis cuentas | alta | conviene después de MC.13e-2b; bloqueada por UX |
| MC.13e-2g | Rediseño en 2 pasos con educación financiera | Mis cuentas | media | última; depende del handoff de diseño |
| MC.13c-3 | Datar el cobro de todas las frecuencias | Mis cuentas | baja | nada |
| MC.16 | Tarjeta de crédito como producto integrado [requiere ADR] | Mis cuentas | alta | ADR propio; coordinar ADR 029 D3 |
| MC.17f | Deshacer o editar una transferencia | Mis cuentas | media | coordinar con MOV.1 |
| AP.5 | Apartados v2: formulario consistente, recurrencia como toggle | Apartados | media | CAT.1 (catálogo) |
| MT.6 | Metas v2: subcategorías inteligentes + plan de aportes | Metas | media-alta | MC.13 (motor); ADR 029 D3 |
| AH.5 | Fondo v2: rediseño UX educativo + aportes por distribución | Ahorro | media | motor de MC.13; rediseño conviene tras IV.2 |
| LIM.1 | Límites v2: asistente preventivo de estilo de vida | Límites | sin definir | ADR 045 (base de cálculo); ADR 044 (sugerencias) |
| PE.6 | Me deben v2: intereses, historial de abonos y confianza | Me deben | media-alta | nada duro |
| ANL.1 | Análisis como centro de interpretación financiera | Análisis | sin definir | ADR 046 (criterio y lenguaje); ADR 044 (recomendaciones) |
| CFG.2c | Reubicar lo fiscal: asistente en Ajustes + Análisis | Configuración | sin definir | CFG.2a y CFG.2b |
| CFG.2a | Auto-derivar ingresos brutos al monitor de renta | Configuración | sin definir | CFG.1a (cerrada) |
| CFG.2b | Inferir el estado de declarante, con encuadre laboral | Configuración | sin definir | CFG.2a |
| CFG.3 | Notificaciones inteligentes anticipatorias | Configuración | sin definir | nada; riesgo técnico a evaluar primero |
| CFG.4 | Respaldo, cuentas y sincronización [DECISIÓN DE ADN] | Configuración | sin definir | ADR 043 resuelto |
| CFG.5 | Seguridad de acceso: PIN, patrón, biometría | Configuración | sin definir | nada para PIN local; cuenta depende de CFG.4 |
| CFG.6 | Revisión general de la sección Ajustes | Configuración | sin definir | CFG.1 a CFG.5 |
| CFG.7 | Transición de tema claro/oscuro más fluida | Configuración | baja | verificación en dispositivo real primero |
| PERF.5 | Migrar la persistencia a IndexedDB (futura, no iniciar) | Transversal | sin definir | un disparador del ADR 030 D4 |
| PERF.6 | Coalescer de renders por microtask | Transversal | baja | decidir si el beneficio lo justifica |
| DV.2a | Tokens de superficie/elevación + degradado de identidad | Transversal | alta | ADR 033 aprobado |
| DV.2b | Riqueza visual piloto: formas orgánicas + patrón | Transversal | media-alta | DV.2a |
| DV.2c | Catálogo de movimiento con propósito | Transversal | media-alta | ADR 033 aprobado |
| DV.2d | Ilustraciones como clase nueva de asset | Transversal | media | DV.2b; diseños o drafts aprobados |
| IV.4 | Iconografía dirigida post-color | Transversal | tras IV.2 | IV.2 en producción + revisión visual |
| PERF.7c | Warm-up de derivaciones pesadas en idle | Transversal | media | conviene después de PERF.7b |
| PERF.8 | Columna "arranque" en el harness + limpieza de CSS muerto | Transversal | media | nada |
| CAT.1 | Taxonomía global de categorías: Gastos↔Fijos y Apartados↔Metas | Transversal | alta | nada (validación ya hecha) |
| CAT.3 | Categorías personalizadas globales | Transversal | media | CAT.1 y CAT.2 |
| CAT.4 | Auditoría de consistencia de formularios | Transversal | media | nada; coordinar con Deudas v2 y MC.15d |
| EDIT.1 | Editar sin destruir: Apartados, Inversión y Me deben | Transversal | media-alta | nada duro; coordina con ARQ.1 |
| ARQ.1 | `infra/bolsas.js`: un solo modelo para las cuatro bolsas | Transversal | baja | nada |
| ARQ.2 | Consolidar los cálculos duplicados que quedan | Transversal | baja | nada; conviene antes de CAL.5b |
| UPD.1 | Aviso de actualización disponible + novedades | Transversal | media | nada |
| GU.1a | Auditoría del sistema de guía + revisión del ADR 016 | Transversal | media | recomendado tras IV.2 + las v2 grandes |
| LEG.2 | Aceptación obligatoria versionada | Transversal | alta | checklist de `docs/legal/README.md` |
| LG.2d | Mudanza de la vitrina a Análisis + tarjeta en Inicio | Transversal | baja (bloqueada) | ANL.1 (layout) |
| LG.2e | Familia comportamiento (interpretación de hábitos) | Transversal | baja | LG.2c; `ahorro-creciente` además depende de ANL.1 |
| PA.1 | ADR + diseño de pagos automáticos | Transversal | media-alta | motor de MC.13; ADR propio |
| DOC.1 | Reorganización documental, fases 3 a 5 | Mantenimiento | media | nada |
| A.5 | Dominio custom en Vercel | Mantenimiento | baja | que el usuario tenga el dominio registrado |
| E.2-2027 | Actualizar SMMLV + UVT a valores 2027 | Mantenimiento | alta (enero 2027) | publicación oficial de los decretos 2027 |
| E.3 | Verificar GMF y otras tasas si hay reforma tributaria | Mantenimiento | baja | que ocurra una reforma |

---

## Pendientes por sección

> **Lente de la auditoría de UX/producto (2026-07-21).** Recorrido de toda la app simulando a un usuario colombiano real. Sus 7 patrones son criterio de priorización, no tareas, y explican casi toda la lista de abajo. **Cerrados:** P2 (trabajo manual uno por uno), P4 (ledger de solo lectura) y P5 (módulos que no comparten datos con el saldo). **Abiertos:** P1 datos que la app ya tiene y vuelve a pedir (LIM.1, CFG.2a, MC.13e-2f), P3 no se puede editar (EDIT.1, MC.17f), P6 se informa pero no se acciona (motor único de sugerencia por categoría: LIM.1 / ANL.1 / [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md)), P7 un concepto con cuatro implementaciones (ARQ.1, ARQ.2).
>
> **Dos hallazgos siguen cuestionando una decisión vigente y no se ejecutan sin la palabra de Esteban** (regla 2.7: un ADR no se revierte en silencio): la propuesta de distribución de un toque frente a MC.13e-2g, y MC.17f frente al cierre de MC.17 como "completa". Cada tarjeta lo dice en su Estado.
>
> **Alcance honesto del triaje:** se trió todo lo que el informe entregó enumerado. Su tabla "hallazgos por módulo" vino como vista filtrable y las fichas individuales no llegaron en texto: si Esteban quiere ese detalle triado uno por uno, hay que recuperarlo de la fuente.

### Calendario (dominio `agenda`)

#### CAL.5b - El lote también cubre deudas, y se ofrece desde Inicio
- Prioridad  : media
- Estado     : pendiente. Continúa **CAL.5a** (cerrada el 2026-07-23, ver CHANGELOG), que dejó funcionando el lote de gastos fijos desde el Calendario. La secuencia "lote manual antes que PA.1" ya está decidida por Esteban.
- Objetivo   : dos ampliaciones del mismo flujo, no un mecanismo nuevo. (1) **Deudas en el lote**: hoy `pendientesDePagoDelMes()` filtra `tipo === 'fijo'` a propósito, porque abonar a una deuda además baja su `saldoTotal` y esa aritmética vive en Compromisos. Sumarlas implica que Agenda deje de poder escribir el pago por su cuenta: es el caso que justifica el helper compartido de **ARQ.2** punto 2, así que conviene hacerlo después o junto con él. (2) **Punto de entrada desde Inicio**: el bloque "N pendientes del mes" (`#panel-vencidos`, `compromisos/views/dashboard.js`) muestra exactamente los mismos vencidos y hoy solo enlaza al Calendario; debería poder disparar el lote sin navegar. Reusa `renderFormPagoLote()` y los handlers ya registrados; el modal `#modal-pago-lote` ya existe.
- Secciones  : Calendario, Inicio (vencidos), Deudas, Mis cuentas (descuento)
- Archivos   : `modules/dominio/agenda/logic.js` + `index.js`, `modules/dominio/compromisos/views/dashboard.js`, `modules/infra/distribuir-pago.js`
- Depende de : **ARQ.2** punto 2 para la parte de deudas (la parte de Inicio no depende de nada)
- Modelo     : Opus 4.8 - Alto (el abono a deuda mueve saldo y patrimonio: el borde de "abono parcial dentro de un lote" hay que decidirlo explícitamente)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2: centro de administración del dinero"** (briefs de Esteban del 2026-07-08). Fuente única de la sección. De sus 4 frentes siguen abiertos **MC.13** (Distribución v2) y **MC.16** (tarjeta de crédito, requiere ADR); **MC.17** (transferencias) y **MC.18** (rediseño visual, [ADR 035](DECISIONS/035-mis-cuentas-v2.md)) están cerrados. **Conflicto (b) del brief, abierto:** "el dinero del ingreso fijo se abona solo a la cuenta en la fecha de pago" es un movimiento automático sin confirmación, exactamente el problema de filosofía de PA.1, así que se decide en el MISMO ADR de pagos automáticos y no por separado. El conflicto (a) quedó resuelto el 2026-07-15.

#### MC.13 - Distribución v2: contextual por fecha, guiada y con origen real del dinero
- Prioridad  : alta
- Estado     : **el motor está completo y en producción** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md), aceptado parcialmente, con su diseño completo dentro); el asistente está a mitad de rediseño. Siguen abiertas **MC.13e-2b a MC.13e-2g**, abajo.
- Objetivo   : el asistente "Distribuir mi ingreso" (épica MC.7, cerrada) hoy muestra TODAS las necesidades/ahorros/obligaciones registradas; con muchos registros satura. Nueva lógica: al recibir un ingreso, Finko analiza la fecha del ingreso, la frecuencia de ingresos del usuario, las obligaciones vencidas, las que vencen en la ventana de ese ingreso y los aportes de ahorro (fondo/metas/apartados/inversión) programados para esa fecha, y solo sugiere lo que corresponde pagar/apartar en ese momento. Responde "¿qué debo hacer HOY con este dinero?", no "todo lo del mes". Reutilizar la lógica existente de recordatorio de día de ingreso (ADR 021, AP.4/MT.2/AH.4) para "qué toca aportar hoy".
- **Regla vigente que dejó el motor:** `modules/infra/vencimientos.js` es la única tabla de frecuencias y el único reparto por período del proyecto; ningún dominio vuelve a escribir la suya. Lo consumen Agenda, Metas, Apartados y el prellenado de aportes de AP.5a/AH.5a; lo consumirán PA.1 y el plan de aportes de **MT.6**, importando en vez de copiar.
- Secciones  : Mis cuentas (`tesoreria/logic/distribucion.js`, `views/distribucion.js`, `acciones/distribucion.js`)
- Depende de : nada (la decisión (a) ya está resuelta); coordinar con PA.1 (conflicto (b), independiente)
- Modelo     : cada rebanada MC.13e-2 lleva el suyo (ver abajo)

> **Análisis de MC.13e-2 (2026-07-15): mapa del asistente actual antes de re-cortar.** El asistente vive en `tesoreria/views/distribucion.js` (`_renderTarjetaDistribuir` = tarjeta compacta de entrada; `_renderContenidoAsistente` = contenido del modal: chips de preset + editor personalizado + `_renderPanelDistribuir`) y `acciones/distribucion.js` (apertura, navegación entre pasos, recálculo en vivo, `_confirmarDistribucion` = apply). Hoy tiene hasta 3 pasos dinámicos (Necesidades → Ahorro/deudas/inversiones → Estilo de vida, solo se crean los que tienen contenido). Los "accesos cruzados" del punto 11 son el array `ctas` de `sugerirDistribucionIngreso()` (`logic/distribucion.js` líneas 699-718: "Activar/Ver progreso del fondo", "Explorar/Aportar a inversiones", "Ver estrategia de deudas", "Ver tu seguimiento en Límites de gasto"), hoy renderizado solo en la tarjeta compacta (`_renderTarjetaDistribuir`), no dentro del modal. Re-cortado en 7 rebanadas por riesgo e independencia (regla 2.1):

#### MC.13e-2b - Quitar "Abonar extra a deudas" del asistente
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : punto 16 del brief: un abono es un pago, vive en Deudas, no en el asistente de distribución. Quitar la sección `seccionDeudas` de `_renderPanelDistribuir`, la fila `destinosDeudas`/`construirPlanDeudas` de `_construirDatosDistribucion`, y la parte de `_confirmarDistribucion`/`distribucion:aplicar` que hoy aplica abonos a deuda (`compromisos` escucha ese evento por EventBus, ADN 10: revisar su handler para no dejar código muerto del lado de compromisos también).
- **Ojo al hacerla**: `destinosDeudas` también entra en `descontable` (el cálculo de cuánto sale de la cuenta) y en `hayDestinos` (si mostrar el botón "Distribuir mi ingreso" en la tarjeta); quitarlo sin ajustar esas dos cuentas rompería el balance o escondería el botón de más.
- Secciones  : Mis cuentas, Deudas (el consumidor de `distribucion:aplicar` para abonos)
- Archivos   : `modules/dominio/tesoreria/logic/distribucion.js` (`construirPlanDeudas`, uso en `_construirDatosDistribucion`), `views/distribucion.js` (`seccionDeudas`), `acciones/distribucion.js` (`_confirmarDistribucion`), `modules/dominio/compromisos/index.js` (handler de `distribucion:aplicar`)
- Depende de : conviene antes de MC.13e-2f (simplifica el paso final que esa rebanada rediseña)
- Modelo     : Sonnet 5 - Alto (toca apply + un consumidor por EventBus en otro dominio)

#### MC.13e-2c - Identidad visual por fila: logo/ícono + nombre + nota
- Prioridad  : media
- Objetivo   : punto 15 del brief: cada fila de destino (`_filaDistribuir`/`_filaNecesidad`) gana el logo de la entidad (`bancoAvatar`, ya usado en Mis cuentas) o el ícono personalizado de la categoría/marca (`tejaCategoria`/`resolverMarca`, ya usados en Agenda y Deudas), más un campo "nota" opcional para diferenciar dos destinos con el mismo nombre (ej. dos "Arriendo": apartamento vs local). Reutiliza infraestructura ya construida (BR.1-BR.5, MK.1-MK.2, CAT.2), no crea íconos nuevos.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/distribucion.js` (`_filaDistribuir`, `_filaNecesidad`, `_iconoNecesidad`), posible campo `nota` en compromisos/metas/apartados si no existe ya
- Depende de : verificar en el análisis de la rebanada si `compromiso.nota`/`meta.nota`/`apartado.nota` ya existen (AG.4 ya usa `nota` en gastos fijos) o hace falta agregarlos
- Modelo     : Sonnet 5 - Alto (reuso de infra existente en varias filas, revisar shape de datos por tipo)

#### MC.13e-2d - Cuota del período en las filas de ahorro, no el objetivo total
- Prioridad  : media
- Objetivo   : punto 21 del brief: las filas de metas/fondo/apartados en el asistente (`destinosAhorro`) deben mostrar cuánto aportar EN ESTE período según la frecuencia real de ingresos (motor `aportePorPeriodo`, MC.13b, ya calcula esto para Metas y Apartados), no el objetivo total de la meta/fondo. Verificar si `construirDesgloseAhorroPorObjetivo` ya usa el motor (parcialmente sí, vía AH.2/MT.2/AP.4) o todavía mezcla el total; si ya lo usa, esto puede ser solo una rebanada de verificación + copy (mostrar la etiqueta del período junto al monto).
- Secciones  : Mis cuentas, transversal por el motor (`infra/vencimientos.js`)
- Archivos   : `modules/dominio/tesoreria/logic/distribucion.js` (`construirDesgloseAhorroPorObjetivo`), `views/distribucion.js` (`_filaDistribuir`)
- Depende de : nada (el motor ya existe, MC.13b)
- Modelo     : Sonnet 5 - Alto (verificar el dato correcto antes de tocar la vista)

#### MC.13e-2e - Completar con saldo de otras cuentas si el ingreso no alcanza
- Prioridad  : media-alta
- Objetivo   : punto 14 del brief: si lo marcado (Necesidades + Ahorro + Inversiones) excede el monto a distribuir, detectar el déficit y ofrecer explícitamente completar con saldo disponible de otra cuenta activa (no automático: pregunta explícita, patrón ya usado en abonos/pagos con sobregiro). Toca el cálculo de `excede`/`asignado` en `resumirPlanDistribucion` y el apply en `_confirmarDistribucion` (de dónde sale el complemento, cómo se registra el descuento en la segunda cuenta).
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic/distribucion.js` (`resumirPlanDistribucion`), `acciones/distribucion.js` (`_confirmarDistribucion`), `views/distribucion.js` (mensaje de déficit)
- Depende de : conviene después de MC.13e-2b (menos destinos que balancear)
- Modelo     : Opus 4.8 - Alto (lógica financiera nueva con casos borde: qué cuenta, cuánto, no dejar ninguna en negativo sin confirmar)

#### MC.13e-2f - Integración con la cuenta del ingreso fijo + decisión explícita del remanente
- Prioridad  : alta
- Estado     : pendiente de análisis. **Necesita la palabra de Esteban antes de codificar (regla 2.7)**: hoy el paso final "Estilo de vida" es puramente informativo (el remanente se queda donde está, sin pedir confirmación); el punto 18 quiere una decisión EXPLÍCITA (dejarlo en la cuenta / ahorro / meta) y la integración del ingreso fijo quiere que el paso desaparezca del todo. Ambas cosas juntas cambian la UX del cierre del asistente (MC.7e): preguntar antes de decidir el diseño exacto (¿un selector "¿qué haces con los $X que sobran?" con 3 opciones? ¿un cuarto paso?).
- Objetivo   : (integración ingreso fijo) el asistente parte de `Ingreso.cuentaId` (MC.13d) en vez de siempre llamar `resolverCuenta()`; los pagos aprobados se descuentan de ahí. (18) el remanente ya no es solo informativo: exige una decisión explícita antes de poder confirmar.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/acciones/distribucion.js` (`_confirmarDistribucion`, resolución de cuenta), `views/distribucion.js` (`seccionInfo`, paso "Estilo de vida")
- **Desbloqueo parcial propuesto por el triaje de la auditoría (2026-07-21), patrón P1:** esta tarjeta mezcla dos cosas de dificultad muy distinta, y la mitad fácil está presa de la difícil. Usar `Ingreso.cuentaId` (MC.13d) como punto de partida en vez de llamar siempre a `resolverCuenta()` **no necesita diseño nuevo**: el dato ya se captura desde MC.13d y hoy se ignora, así que el usuario vuelve a elegir la misma cuenta cada quincena. La decisión explícita del remanente (punto 18) sí necesita la palabra de Esteban. Recomendación: partir en **MC.13e-2f-1** (usar el `cuentaId` del ingreso, desbloqueada, ejecutable ya) y **MC.13e-2f-2** (decisión del remanente, sigue bloqueada).
- Depende de : conviene después de MC.13e-2b (menos ruido en el paso final); **bloqueada por la decisión de UX de Esteban** (solo la mitad del remanente, ver desbloqueo parcial arriba)
- Modelo     : Opus 4.8 - Alto (lógica financiera + decisión de producto no trivial); la mitad del `cuentaId` baja a Sonnet 5 - Alto

#### MC.13e-2g - Rediseño en 2 pasos con educación financiera
- Prioridad  : media
- Estado     : pendiente de análisis. **Necesita la palabra de Esteban antes de codificar**: ¿handoff de diseño de Claude Design (mismo patrón que las 8 pantallas v2 anteriores: Inicio, Mis cuentas, Deudas, Calendario, Análisis, Gastos, Navegación, Formularios) o Sonnet/Opus lo diseña sin mockup, como el resto de MC.13e-2?
- Objetivo   : (9) el asistente pasa de un flujo directo a 2 pasos: primero educación financiera (cómo distribuyen los expertos, con barras/gráficos/porcentajes; candidato a logro por distribución saludable sostenida, **derivado a una tarjeta de Logros si Esteban lo confirma**, no parte de esta rebanada), después la distribución personalizada por prioridad (el flujo actual, reubicado). (10) cada recomendación (hoy el array `ctas`, si sobrevive a MC.13e-2a) aparece solo en el paso de su categoría, nunca todas juntas al inicio.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/distribucion.js` (reestructura mayor de `_renderContenidoAsistente`/`_renderPanelDistribuir`), CSS nuevo si hay mockup
- **Tensión señalada por el triaje de la auditoría (2026-07-21), pendiente de la decisión de Esteban:** esta rebanada quiere **más** pasos (educación financiera antes de repartir), mientras que la auditoría propone lo contrario para el mismo asistente: una **propuesta pre-armada de un toque** (todo calculado y marcado por defecto, el usuario solo confirma) para bajar la fricción del flujo más repetido de la app. No son necesariamente incompatibles (la educación puede ser opcional, colapsable o de primera vez), pero el orden importa y decide el diseño: **¿la educación va al frente o detrás de la acción?** Resolverlo antes de encargar el handoff, o el mockup fijará la respuesta sin que nadie la haya decidido.
- Depende de : conviene última (reestructura el contenedor donde viven las demás rebanadas); depende de la decisión de handoff de diseño y de la tensión de arriba
- Modelo     : si hay handoff, Sonnet 5 - Alto (implementación de mockup, mismo patrón que FORM.1/CAL.4/GAS.1); si no, Opus 4.8 - Alto (diseño + implementación sin mockup)

#### MC.13c-3 - Datar el cobro de todas las frecuencias (`ultimoPagoHasta`)
- Prioridad  : baja
- Estado     : pendiente, **no bloquea nada**. Se separó al cerrar MC.13c-2, que descubrió que no la necesitaba.
- Objetivo   : `ultimoPagoHasta` (`tesoreria/logic/ingresos.js:199`) devuelve `null` para todo lo que no sea Mensual o Quincenal, así que un usuario con ingreso Bimestral/Trimestral/Semestral/Anual no tiene cobro datable: `estadoDistribucion` le da 'sin-fecha' y se queda sin el guard de de-duplicación ("ya distribuiste este periodo"). El asistente igual le funciona.
- **Por qué NO se hizo en MC.13c-2:** la checklist no lo necesita (sin fecha datable el motor asume que el cobro es hoy, que es exactamente cuando el usuario está repartiendo), y `ultimoPagoHasta` alimenta `periodoISO`, la **clave de de-duplicación** del asistente: tocarla es riesgo de regresión sobre su guard central a cambio de un beneficio pequeño y para un caso poco común. Mejor su propia rebanada, con su propia verificación.
- **Ojo al hacerla (dos trampas encontradas):** (1) Diario y Semanal **no tienen `diaPago`** (`FRECUENCIAS_CON_DIA` no los incluye: el form nunca lo captura), así que no se pueden datar por esta vía; Diario podría resolverse como "el último cobro es hoy", pero Semanal necesitaría capturar el día de la semana, que es una feature aparte. (2) El modelo Quincenal del motor (`diaPago` y `diaPago + 15` dentro del MISMO mes) **pierde el segundo cobro cuando `diaPago > 16`**: un quincenal del día 20 cae una sola vez al mes. Es un error heredado de Agenda (`_diasParaCompromiso`, hoy `ocurrenciasEnMes`) que afecta también al Calendario, y merece decidirse aparte: ver la nota de abajo.
- Secciones  : Mis cuentas (asistente), Calendario (si se corrige el modelo quincenal)
- Archivos   : `tesoreria/logic/ingresos.js` (`ultimoPagoHasta`), `modules/infra/vencimientos.js` (`ocurrenciasEnMes`, caso Quincenal)
- Depende de : nada
- Modelo     : Opus 4.8 - Alto (toca la clave de de-duplicación y, si se corrige el quincenal, el Calendario)

> **Nota transversal (hallazgo de MC.13c-2, 2026-07-14): el modelo Quincenal cae una sola vez al mes si `diaPago > 16`.** `ocurrenciasEnMes` resuelve Quincenal como `[diaPago, diaPago + 15]` **dentro del mismo mes** y descarta el segundo si no cabe. Con `diaPago = 20`, el segundo sería el 35 → se descarta, así que un compromiso o ingreso quincenal del día 20 aparece **una vez al mes** en el Calendario, en la checklist y en el motor. Lo correcto sería que el segundo cobro pase al mes siguiente (día 5). Es **preexistente**: viene de `_diasParaCompromiso` de Agenda y MC.13a lo extrajo tal cual (sus 139 tests lo fijan). Afecta a Calendario y a todo consumidor del motor. Requiere decisión de Esteban antes de tocarlo, porque cambia lo que hoy ve el Calendario.

#### MC.16 - Tarjeta de crédito como producto integrado (cuentas ↔ deudas) [requiere ADR]
- Prioridad  : alta (concepto nuevo de dominio)
- Estado     : pendiente de análisis, **requiere ADR** (no iniciar)
- Objetivo   : ampliar los tipos de cuenta (ahorros, corriente, tarjeta débito, **tarjeta crédito**, billetera digital, efectivo, otro) y modelar la tarjeta de crédito como lo que es: no es dinero disponible, es cupo+deuda. Al pagar con ella, preguntar "¿a cuántas cuotas?", crear automáticamente la deuda con su tasa registrada, calcular cuotas, actualizar calendario/análisis/pendientes; el pago anticipado recalcula cuotas restantes. Incluye los nudges educativos de costos bancarios (avances en efectivo, retiros en otras redes, pago mínimo: intervenir solo cuando previene un mal hábito, punto 5 del brief). **Cuidados del ADR:** el tipo de cuenta 'Inversión' se ELIMINÓ en la migración v11 justamente para separar dominios: reintroducir un tipo que cruza dominios (cuenta que genera deudas) necesita diseño explícito, no un valor más en el catálogo. **Desbloquea CFG.2a/K.3:** con TC modelada, `consumosTC` del monitor de renta deja de ser dato manual. **Comparte modelo de datos** con el nivel "producto por entidad" del brief de Deudas (Visa Platinum del Banco de Bogotá): decidir juntos en la validación D3 del ADR 029.
- Secciones  : Mis cuentas, Deudas, Calendario, Análisis (transversal vía EventBus, ADN 10)
- Depende de : ADR propio; coordinar con ADR 029 D3 y con la iniciativa Deudas v2
- Modelo     : Fable 5 - Alto para el ADR (concepto de dominio nuevo multidominio); implementación por rebanadas

#### MC.17f - Deshacer o editar una transferencia (hueco de integridad)
- Prioridad  : media
- Estado     : pendiente de análisis. **Revisa el cierre de MC.17 como "completa"** (regla 2.7: decirlo, no corregirlo en silencio). Hallazgo de la auditoría de UX/producto (2026-07-21).
- Objetivo   : una transferencia mueve dinero real entre dos cuentas y, desde MC.17d, puede además cobrar el 4x1000, pero **no se puede editar ni revertir**: si el usuario se equivoca de cuenta o de monto, no tiene salida dentro de la app y los dos saldos quedan mal. Es el mismo patrón P3 del resto de la auditoría, agravado porque aquí el error descuadra dos cuentas a la vez. Diseñar la reversa (recomendado: "deshacer" que aplica el movimiento inverso y deja rastro, en vez de borrado silencioso, coherente con el ledger de MC.17c) y decidir si la edición se permite o se resuelve como deshacer + volver a crear. **Ojo:** revertir debe devolver también el `costoGMF` cobrado, o el patrimonio queda mal por el gravamen.
- Secciones  : Mis cuentas, Movimientos (rastro)
- Archivos   : `modules/dominio/tesoreria/logic/transferencias.js` (`calcularTransferencia` ya es apply atómico puro: la reversa es su espejo), `acciones/transferencias.js`, `modules/dominio/movimientos/`
- Depende de : coordinar con **MOV.1** (si el ledger gana acciones por fila, "deshacer transferencia" es una de ellas y no necesita UI propia en Mis cuentas)
- Modelo     : Opus 4.8 - Alto (dinero en dos cuentas + GMF; una reversa mal hecha descuadra el patrimonio)

---

### Apartados (dominio `apartados`)

> **Iniciativa "Apartados v2: colchón para gastos esporádicos"** (brief de Esteban del 2026-07-08, 6 puntos). Filosofía redefinida por Esteban: Apartados NO es "ahorrar para objetivos grandes" (eso es Metas), es preparar los gastos esporádicos que se olvidan presupuestar (SOAT, regalos, Navidad, veterinario, mantenimientos, impuestos...) para que al llegar la fecha el dinero ya esté reservado. **Derivados a fuentes únicas:** las categorías que realmente son Metas (Vacaciones, Semestre, Computador, Viajes) → **CAT.1 ampliada** (la taxonomía Apartados↔Metas es la misma clase de decisión que Gastos↔Fijos, una sola pasada); el picker de icono (hoy depende del selector de emojis del SO, Win+.) → **CAT.2** (consumidor n.º 5; nota: el `icono` de apartados hoy es emoji como dato del usuario, exento de TX.4, y pasaría a símbolo del sprite: decidir la migración en CAT.3); "Otro" con nombre+icono → **CAT.3**.

#### AP.5 - Apartados v2: formulario consistente, recurrencia como toggle
- Prioridad  : media
- Estado     : pendiente de análisis (no iniciar). **AP.5a cerrada el 2026-07-22** (ver abajo): el punto (6) del alcance original ya no es parte de esta tarjeta.
- Objetivo   : (1) el form de nuevo apartado adopta el patrón estándar de captura. **Ojo (triaje 2026-07-15):** el brief pedía dropdown "Seleccionar categoría..." que autocompleta, pero el [ADR 042](DECISIONS/042-formularios-v2-visual.md) (Formularios v2, D9) fijó después los **chips de ícono** como lenguaje de la app; decidir con Esteban al iniciar (recomendación: chips, por consistencia); (4) la pregunta "¿este gasto se repite?" sale del registro inicial y pasa a ser un **toggle "Recurrente"** en el apartado ya creado (activa/desactiva la recurrencia v14 existente; el form inicial queda más simple).
- Secciones  : Apartados
- Archivos   : `modules/dominio/apartados/` (form, view, logic)
- Depende de : CAT.1 (categorías nuevas de la filosofía redefinida) para el catálogo; el toggle y el form pueden ir antes
- Modelo     : Sonnet 5 - Alto (re-corte en rebanadas al iniciar)

---

### Metas (dominio `metas`)

> **Iniciativa "Metas v2: planificador inteligente de objetivos"** (brief de Esteban del 2026-07-08, 7 puntos). El usuario dice QUÉ quiere y PARA CUÁNDO; Finko calcula, genera y sincroniza. **Derivados a fuentes únicas:** orden del form → **CAT.4**; "Otro" con icono+nombre → **CAT.2/CAT.3** (consumidor n.º 6); el cálculo de cuota por frecuencia real integrado a "Distribuir mi ingreso" → **MC.13** (era exactamente su punto 21; metas añadido como consumidor explícito del motor); la sincronización total entre secciones (punto 7) ya es el ADN (EventBus + motores compartidos), principio, no tarea.

#### MT.6 - Metas v2: subcategorías inteligentes + plan de aportes generado automáticamente
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : (2) **subcategorías por categoría** (Tecnología → Laptop/Celular/Tablet...; Vehículo → Carro/Moto/Bicicleta...; Vivienda, Educación, Viajes...): el usuario escribe lo mínimo y Finko reconoce el tipo de meta para automatizaciones/estadísticas. **Patrón compartido detectado en el triaje:** categoría→subcategoría es el MISMO patrón de dos niveles que entidad→producto (MC.16/Deudas v2): decidir la estructura de datos UNA vez en la validación D3 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md), no dos. (5) El cálculo de cuota usa la **frecuencia real de ingresos** del usuario registrada en Mis cuentas (diaria, semanal, quincenal, mensual, personalizada), nunca asume quincenal (la base ya existe: metas calcula cuota y el ADR 021 ya lee el día de ingreso). (6) **Generar automáticamente el plan de aportes** (un registro por fecha de ingreso hasta la fecha objetivo) y **recalcular todo el plan** si cambia la frecuencia del ingreso o la fecha/monto de la meta. Ojo: si esos aportes se ejecutaran solos serían movimientos automáticos → esa variante pertenece al ADR de PA; como plan visible/recordatorio no lo necesita.
- Secciones  : Metas, Calendario (plan visible), transversal por el motor de MC.13
- Archivos   : `modules/dominio/metas/logic.js` (cálculo existente), motor compartido de MC.13, `agenda` (visualización del plan)
- Depende de : MC.13 (motor); validación D3 del ADR 029 para las subcategorías; coordinar con PA si el plan se automatiza
- Modelo     : Opus 4.8 - Alto (modelo de datos de subcategorías + generación/recalculo del plan de aportes)

---

### Ahorro (dominio `ahorro`, fondo de emergencia)

> **Iniciativa "Fondo de emergencia v2"** (brief de Esteban del 2026-07-08, 3 puntos). La base automatizada ya existe en gran parte: AH.2 (cerrada) calcula el aporte recomendado con datos reales, AH.4/ADR 021 recuerda el día de ingreso, y el punto 21 de MC.13 ya contempla que el fondo muestre su cuota del período en la distribución. **Derivados:** el punto 1 ("Empty State" literal visible al desactivar el fondo) era un bug de copy, **corregido el 2026-07-11 (BUG-012, ver CHANGELOG)**; el cálculo e integración del aporte con "Distribuir mi ingreso" → **MC.13** (el fondo ya era consumidor del motor).

#### AH.5 - Fondo v2: rediseño UX educativo + aportes por el flujo de distribución
- Prioridad  : media
- Estado     : pendiente de análisis (no iniciar). **AH.5a cerrada el 2026-07-22** (ver abajo): la mitad de prellenado ya no es parte del alcance restante.
- Objetivo   : (2) rediseño de la experiencia de la sección: comunicar de inmediato qué es el fondo, por qué importa, cuándo usarlo y cómo protege (tranquilidad/seguridad/prevención, no solo números), aplicando el sistema visual vigente (jerarquía, tokens del ADR 031, Finko Icons v2, lenguaje ADR 003, accesibilidad). (3) El flujo de aporte principal pasa a ser la distribución del ingreso (el valor calculado por AH.2 aparece sugerido ahí vía el motor de MC.13); el bloque "Aportes al fondo → Registrar" de la sección **no se elimina del todo**: se conserva como vía secundaria para aportes fuera de ciclo (ej. apartar parte de un ingreso esporádico), decidir su peso visual en el análisis. Configuración del fondo con las preguntas necesarias en la creación/edición (meta en meses, compromiso por período según frecuencia real de ingresos).
- Secciones  : Ahorro (fondo), transversal por el motor de MC.13
- Archivos   : `modules/dominio/ahorro/` (view, logic con AH.2 ya hecho), motor compartido en MC.13
- Depende de : el punto 3 depende del motor de MC.13; el rediseño (2) conviene tras IV.2 (BUG-012 ya se corrigió el 2026-07-11, aparte)
- Modelo     : Sonnet 5 - Alto (rediseño de una sección con lógica ya existente; re-cortar en rebanadas al iniciar)

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

#### LIM.1 - Límites v2: asistente preventivo de estilo de vida (iniciativa, fusión de 2 briefs)
- Prioridad  : sin definir
- Estado     : mayormente decidido, repartido entre 3 ADRs. Solo la base de cálculo (punto 7) sigue sin dueño: **[ADR 045](DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)** (Abierta). No iniciar esa parte sin ese ADR resuelto.
- Objetivo   : que Límites se enfoque en Estilo de vida (el único grupo con control real), con solo categorías ya usadas, seguimiento durante el mes y sugerencias de dónde y cuánto poner tope.
- Motivo     : el usuario concluyó, tras analizar la sección, que Necesidades y Ahorro no deberían tener límite de gasto (Necesidades son obligatorias; Ahorro por encima de lo previsto es positivo, no una desviación).
- Decidido ya: tratamiento asimétrico por rol, mecanismo bajo demanda, copy y layout → **[ADR 019](DECISIONS/019-limites-por-rol.md)** (el brief lo confirma, no lo revisa, pese a lo que decía la nota anterior de esta tarjeta). Dimensión esencial/no esencial de fijos → **[ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)**. Detección de patrones y sugerencia de monto + acción (puntos 3, 9, 10 y el refuerzo P1/P6 de la auditoría) → **[ADR 044](DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, motor compartido con Análisis e Inicio.
- Secciones  : Límites de gasto (`presupuesto`), transversal (motor de sugerencia compartido con `analisis` e `inicio`)
- Depende de : ADR 045 resuelto para la base de cálculo; ADR 044 resuelto para las sugerencias; el resto ya puede implementarse
- Modelo     : ver el ADR correspondiente a cada parte antes de iniciar

---

### Me deben (dominio `personales`)

> **Iniciativa "Me deben v2: seguimiento inteligente"** (brief de Esteban del 2026-07-08, 8 puntos). Fuente única de la sección. La base ya existe: PE.1 (cerrada) introdujo la tasa opcional y el reparto capital/interés (`tasa`, `capitalPagado`, `interesPagado`, `interesPendiente`, schema v21); PE.2 a PE.5 (cerradas) los estados humanizados. Esta iniciativa los evoluciona. **Derivados a fuentes externas:** los recordatorios de vencimiento ("mañana vence el préstamo de Juan") → **CFG.3** (motor único de notificaciones anticipatorias; `personales` añadido como fuente); la fecha por defecto = hoy en el form → **CAT.4** (auditoría transversal de formularios, ampliada con defaults de fecha para toda la app).

#### PE.6 - Me deben v2: intereses acumulados, historial de abonos, rendimiento y confianza
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : (2+3) al pulsar "Me pagaron" en un préstamo con tasa pactada, calcular el **total sugerido = capital pendiente + intereses acumulados a la fecha** y mostrar el desglose (capital / intereses / total); el usuario decide libremente (cobrar todo, parte, perdonar intereses): Finko sugiere, nunca impone. Lógica financiera de acumulación sobre saldo con pagos parciales entre fechas: extiende el reparto de PE.1, no lo reemplaza. (4) **Historial de abonos por préstamo** (hoy solo existe el acumulado `pagado`): array de abonos con fecha y monto, bump de schema con migración idempotente (los préstamos existentes conservan su acumulado; historial vacío o abono sintético inicial, decidir en el análisis). (5) Rendimiento del préstamo (intereses ganados, capital recuperado, % recuperado, rentabilidad), derivado de 2+4. (7) Estado visual identificable de un vistazo (al día / próximo a vencer / pago parcial / vencido / finalizado): evolución VISUAL de los estados PE.2-PE.5 usando los semánticos del ADR 031 (success/warning/danger + neutro), sin colores nuevos; coordina con IV.2. (8) **Estadísticas de confianza por persona** (préstamos realizados, pagados a tiempo, retrasos, tiempo promedio, total prestado/recuperado), derivadas del historial del punto 4; copy con el cuidado del brief: es historial informativo, no calificación de personas (tono ADR 003).
- Secciones  : Me deben (`personales`), transversal solo por CFG.3/CAT.4 ya derivados
- Archivos   : `modules/dominio/personales/logic.js` (acumulación de intereses, ya tiene la base de PE.1), `state.js`/`storage.js` (historial, bump), `personales/view.js`
- Depende de : nada duro; el punto 7 conviene tras IV.2; re-cortar en rebanadas al iniciar (PE.6a intereses+desglose, PE.6b historial+schema, PE.6c rendimiento, PE.6d estados visuales, PE.6e confianza)
- Modelo     : Opus 4.8 - Alto (lógica financiera de intereses acumulados con pagos parciales; el resto de rebanadas puede bajar de modelo)

---

### Análisis (dominio `analisis`)

> Iniciativa "Análisis v2: rediseño visual" completa ([ADR 038](DECISIONS/038-analisis-v2-visual.md)): avanzó los puntos 4, 5, 7 y 8 del brief de ANL.1 (reorganización, jerarquía, carga cognitiva, coherencia visual). **ANL.1 hereda el lienzo v2 ya montado:** cuando se inicie, escribe copy y recomendaciones sobre esas cards, no rediseña de cero.

#### ANL.1 - Análisis como centro de interpretación financiera (no solo panel de estadísticas)
- Prioridad  : sin definir
- Estado     : criterio y lenguaje sin decidir. Ver **[ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md)** (Abierta). No implementar el criterio de permanencia ni el nivel de traducción sin ese ADR resuelto.
- Objetivo   : el usuario considera que Análisis hoy es una gran cantidad de gráficos e indicadores que puede resultar abrumadora para alguien sin conocimientos financieros; pide que Finko explique e interprete, no solo muestre datos.
- Motivo     : pidió analizar la sección completa antes de implementar cualquier cambio, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.
- Decidido ya: jerarquía de lectura y colapsables → **[ADR 010](DECISIONS/010-simplificacion-analisis.md)**. Reorganización visual v2 → **[ADR 038](DECISIONS/038-analisis-v2-visual.md)** (ANL.1 hereda el lienzo ya montado). Motor de recomendaciones accionables (punto 6, punto 10 y el refuerzo P6 de la auditoría) → **[ADR 044](DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, motor compartido con Límites e Inicio.
- Secciones  : Análisis (dominio `analisis`); transversal por el motor de recomendaciones (ADR 044) y coordinación con CFG.2c (interpretación fiscal) y LG.2 (logros)
- Depende de : ADR 046 resuelto para el criterio de permanencia y el lenguaje; ADR 044 resuelto para las recomendaciones accionables
- Modelo     : ver el ADR correspondiente a cada parte antes de iniciar

---

### Configuración (dominio `config`)

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes", decisión de Esteban 2026-07-06). **No iniciar ninguna sin instrucción explícita.** Ficha: [`contexto/configuracion.md`](contexto/configuracion.md). Criba de las 8 preguntas del brief y cierre de **CFG.1a** (situación laboral, schema v25): ver [CHANGELOG](CHANGELOG.md). El monitor de renta (K.3, `calcularEstadoRenta`) ya hace gran parte de CFG.2: los huecos que CFG.2a/CFG.2b resuelven son auto-derivar `ingresosBrutos` e inferir el estado de declarante. **Ampliación del 4.º lote (2026-07-08, brief de Ajustes punto 1), decisión de UBICACIÓN vigente:** los formularios fiscales dejan de vivir permanentes en Ajustes y pasan a un asistente tras un botón ("Completar perfil fiscal"); toda la interpretación y recomendaciones se consultan en **Análisis**. Ajustes queda solo para configuración de la app (CFG.2c ejecuta esta reubicación).

#### CFG.2c - Reubicar lo fiscal: asistente bajo demanda en Ajustes + interpretación en Análisis
- Prioridad  : sin definir
- Estado     : pendiente (parte 4 de la iniciativa fusionada; conviene DESPUÉS de CFG.2a/2b, que reducen cuántas preguntas quedan en el asistente)
- Objetivo   : los bloques "Perfil fiscal" y "Datos de renta" dejan de renderizarse permanentes en Ajustes; un botón "Completar perfil fiscal" abre un asistente (modal/pasos) solo con los datos no deducibles que queden tras CFG.2a/2b. "Estado de tu renta" y sus nudges se consolidan en Análisis como único lugar de interpretación (coordinar con el layout de ANL.1 punto 9).
- Secciones  : Configuración (Ajustes), Análisis
- Archivos   : `modules/dominio/config/view.js`/`index.js` (los 2 forms actuales), `modules/dominio/analisis/view.js`
- Depende de : CFG.2a y CFG.2b; coordinar con ANL.1
- Modelo     : Sonnet 5 - Alto (reubicación de UX sin lógica fiscal nueva)

#### CFG.2a - Auto-derivar ingresos brutos del año al monitor de renta
- Prioridad  : sin definir
- Estado     : pendiente (parte 2 de la iniciativa fusionada; depende de CFG.1a, cerrada)
- Objetivo   : el criterio "Ingresos brutos" del monitor de renta (K.3) hoy exige que el usuario lo teclee a mano en Datos de renta. Anualizar `S.ingresos` (recurrentes, por `frecuencia`) + sumar `S.ingresosPuntuales` del año para estimarlo automáticamente, de modo que pase de "Sin datos" a medible sin captura manual. Mantener el override manual si el usuario prefiere. `consumosTC` y `consignaciones` siguen manuales (no derivables: no hay tipo de cuenta "tarjeta de crédito", ni movimientos bancarios crudos). _(Nota de triaje 2026-07-08: si **MC.16** (tarjeta de crédito como producto integrado) se implementa, `consumosTC` pasaría a ser derivable automáticamente; revisar esta tarjeta en ese momento.)_
- Secciones  : Configuración (Ajustes), Análisis (monitor de renta), transversal (lee ingresos)
- Archivos   : `modules/dominio/analisis/logic.js` (`calcularEstadoRenta`, nueva `estimarIngresosBrutosAnio`), `modules/dominio/tesoreria/logic/ingresos.js` (helper de anualización si aplica)
- Depende de : CFG.1a (cerrada)
- Modelo     : Opus 4.8 - Alto (lógica financiera CO no trivial: anualización de ingresos + interpretación de "ingresos brutos" DIAN)

#### CFG.2b - Inferir el estado de declarante + mensaje del motivo, con encuadre por situación laboral
- Prioridad  : sin definir
- Estado     : pendiente (parte 3 de la iniciativa fusionada; depende de CFG.2a). **Decisión de framing legal: consultar a Esteban al iniciar** (cuán fuerte se afirma la obligación; Finko orienta, no dictamina).
- Objetivo   : reemplazar el checkbox manual "La DIAN me notificó como declarante" por un estado **inferido** de los 5 criterios (si alguno supera el tope, mostrar "podrías estar obligado por X, confirma con un contador"), usando `perfil.situacionLaboral` para el encuadre (empleado: tu empleador reporta; independiente: autorreporte). Nunca afirmar certeza legal.
- Secciones  : Configuración (Ajustes), Análisis (monitor de renta)
- Archivos   : `modules/dominio/analisis/logic.js` (`detectarNudgesRenta` y/o nueva lógica de inferencia), `modules/dominio/config/view.js` (perfil fiscal)
- Depende de : CFG.2a
- Modelo     : Opus 4.8 - Alto (producto + framing legal; roza filosofía de producto)

#### CFG.3 - Notificaciones inteligentes anticipatorias
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy el recordatorio existente solo avisa al abrir la app; el usuario quiere alertas que se anticipen a eventos (día de pago hoy, deuda vence mañana, pago con 2 días de atraso, cerca de superar presupuesto de una categoría, meta de ahorro alcanzada, aporte recomendado de la semana, apartado próximo a vencer). Pidió explícitamente que sean útiles y no invasivas: solo cuando realmente ayuden a decidir mejor. **Fuente añadida por triaje del 3.er lote (2026-07-08, brief Me deben punto 6):** vencimientos de préstamos personales ("mañana vence el préstamo de Juan", "han pasado 5 días desde el vencimiento"), con lenguaje amable orientado a recordar, nunca a presionar; `Personal.fechaLimite` ya existe como dato. Un solo motor de recordatorios para todas las fuentes, no uno por sección.
- Secciones  : Configuración (Ajustes, activación), transversal (agenda, presupuesto, metas, apartados, compromisos, personales como fuentes de los eventos)
- Archivos   : sin explorar; depende de si Finko ya usa alguna API de notificaciones del navegador/PWA (revisar `modules/infra/notificaciones.js` y el service worker) o si hay que incorporar Push API / Notification API, lo cual tiene restricciones de permisos y de plataforma (iOS Safari limita notificaciones push de PWA)
- Depende de : nada. Riesgo técnico a evaluar primero: viabilidad real de notificaciones push offline-first sin servidor (ADN 2 y 3); puede requerir ADR si la solución técnica choca con "sin servidor".
- Modelo     : Fable 5 - Alto (multidominio, con una restricción técnica de plataforma no trivial que hay que investigar antes de diseñar)

#### CFG.4 - Respaldo, cuentas de usuario y sincronización multi-dispositivo [DECISIÓN DE ADN]
- Prioridad  : sin definir (la decisión es la de mayor alcance del proyecto)
- Estado     : decisión sin tomar. Ver **[ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)** (Abierta, ninguna dirección elegida). No implementar nada de este alcance sin ese ADR resuelto.
- Objetivo   : hoy solo existe exportar a JSON/CSV manual; el usuario teme perder todo el historial si pierde el teléfono, cambia de equipo, desinstala o formatea.
- Motivo     : toca el ADN del proyecto de frente (reglas 2 y 3: offline-first, sin servidor, sin cuenta, sin sync). Por instrucción directa de CLAUDE.md sección 4, requiere ADR y discusión explícita antes de cualquier código.
- Secciones  : Configuración (Ajustes), transversal (afecta el modelo entero de datos y la identidad del producto)
- Depende de : el ADR 043 resuelto. Ese ADR trae, si avanza, sus propios avisos: activar el disparador D4 del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) y avisar a la iniciativa LEG antes de que redacte
- Modelo     : ver el ADR 043 antes de iniciar cualquier cosa

#### CFG.5 - Seguridad de acceso a la app (PIN, patrón, biometría) + re-autenticación en acciones críticas
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : agregar un método de bloqueo elegible por el usuario (PIN numérico, patrón, contraseña, huella o reconocimiento facial si el dispositivo lo permite) para proteger la información financiera si el dispositivo se pierde o lo roban. **Ampliado por el 6.º lote (2026-07-08, brief General punto 3):** las **acciones críticas exigen re-autenticación** aunque la app ya esté desbloqueada: restablecer la aplicación (hoy solo pide un `confirmar()` de texto), eliminar toda la información, exportar datos sensibles y, si CFG.4 se aprueba, cerrar cuenta / cambiar contraseña. La parte "usuario y contraseña" del brief pertenece a CFG.4 (no hay cuenta que autenticar sin esa decisión); un PIN/patrón local NO la necesita y puede implementarse antes.
- Secciones  : Configuración (Ajustes), transversal (el guard de re-autenticación envuelve acciones de varios lugares)
- Archivos   : sin explorar; biometría real depende de WebAuthn/Credential Management API (soporte y UX varían por navegador/SO); un PIN/patrón simple se puede resolver 100% client side sin APIs nuevas
- Depende de : nada para PIN/patrón local + re-auth de acciones críticas; la credencial de cuenta depende de CFG.4. Viabilidad de biometría en PWA hay que verificarla antes de prometerla en el diseño.
- Modelo     : Opus 4.8 - Alto (decisión de qué mecanismos son viables en PWA vs. cuáles prometer a futuro; UX de bloqueo con riesgo de dejar al usuario fuera de sus propios datos si algo falla)

#### CFG.6 - Revisión general de la sección Ajustes
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario pidió revisar si faltan configuraciones que deberían vivir en Ajustes, con el objetivo de que la sección se convierta en el centro de configuración de Finko (seguridad, personalización, notificaciones, respaldo y cualquier otra opción relevante), con interfaz clara y organizada. **Ampliado por triaje del 4.º lote (2026-07-08, brief de Ajustes punto 2):** rediseño visual de la sección con tarjetas de tamaño uniforme, Bento Grid donde aporte, bloques compactos y alineados, sin botones que ocupen todo el ancho en desktop (hoy: "Instalar aplicación", "Recordatorios"); misma sensación de orden que el resto de la app (coordina con IV.2). **7.º lote:** el layout debe reservar el bloque del **Centro Legal** (iniciativa LEG, Transversal).
- Secciones  : Configuración (Ajustes)
- Archivos   : `modules/dominio/config/view.js`, `styles/components/config.css`
- Depende de : CFG.1 a CFG.5 (esta es la pasada de auditoría/orden final, tiene sentido hacerla después o junto con las demás, no antes)
- Modelo     : Sonnet 5 - Alto (auditoría de una sección existente con criterio de UX, sin lógica financiera nueva)

#### CFG.7 - Transición de tema claro/oscuro más fluida [con advertencia técnica]
- Prioridad  : baja
- Estado     : pendiente de análisis (no iniciar sin leer la advertencia)
- Objetivo   : Esteban percibe el cambio de tema como brusco ("parece que la página recarga"). **Advertencia del triaje: la transición suave YA existe y su estado actual es una decisión deliberada de rendimiento**, documentada en `styles/themes.css`: la técnica `theme-transitioning` (280 ms) se restringió a ~30 contenedores porque animar `*` causaba lag perceptible en móvil (cientos de elementos × 5 propiedades), y bajo `prefers-reduced-motion` el cambio es instantáneo a propósito. Antes de tocar nada: (1) reproducir la brusquedad en el dispositivo real de Esteban y descartar que sea reduced-motion activo; (2) la dirección técnica recomendada NO es "más transiciones CSS" (ya se probó y se revirtió) sino la **View Transitions API** (`document.startViewTransition()`): el navegador compone un crossfade de snapshot en un solo paint, sin animar elementos individuales, como mejora progresiva (Chrome/Edge/Safari 18+; Firefox cae al comportamiento actual). Cumple la restricción de rendimiento del ADR 031 D6.
- Secciones  : Transversal (shell/tema), visible desde Ajustes
- Archivos   : `modules/ui/shell.js` (`toggleTheme`), `styles/themes.css`
- Depende de : verificación en dispositivo real primero (mismo criterio de evidencia del ADR 030 D4)
- Modelo     : Sonnet 5 - Alto (mejora progresiva acotada con verificación de rendimiento antes/después)

---

## Transversal (afecta varias secciones)

> **Auditoría de rendimiento 2026-07 completa** (PERF.0 a PERF.4 cerradas, ver [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md)). Los dos hallazgos que siguen mandando: `renderSmart()` ya evita el recálculo cruzado, y guardar cuesta ~5 ms debounced, así que la persistencia NO se reescribió ([ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), disparadores en su D4). **Disciplina obligatoria de toda tarjeta PERF: correr `pnpm perf` antes y después y comparar contra BASELINE.md.**

#### PERF.5 (futura, no iniciar) - Migrar la persistencia a IndexedDB
- Prioridad  : sin definir (se retoma solo si se dispara un criterio del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4)
- Estado     : diferida por decisión del ADR 030. **NO iniciar** sin uno de sus disparadores: jank de guardado medido en dispositivo real, usuarios reales acercándose a la cuota (el aviso de PERF.4 disparándose en la práctica), o una feature que necesite persistencia asíncrona / mayor cupo (ej. CFG.4).
- Objetivo   : mover de la clave única `fk_v1` en `localStorage` a IndexedDB (cupo mucho mayor + escritura por registro), resolviendo cuota y costo de `JSON.stringify(S)` completo. El ADR 030 D3 rechaza explícitamente partir `localStorage` por clave (no sube la cuota).
- Secciones  : Transversal (`core/storage.js`, `bootstrap.js` pasa a async, sembrado E2E)
- Archivos   : `modules/core/storage.js` (motor async), `modules/ui/bootstrap.js` (loadData async), migración de datos localStorage → IDB sin pérdida, reescritura del sembrado de las 11 suites E2E
- Depende de : un disparador del ADR 030 D4
- Modelo     : Opus 4.8 - Extra o Fable 5 - Alto (cambio de mayor riesgo del proyecto: ruta de arranque async + migración de datos reales de años)

---

#### PERF.6 - Coalescer de renders por microtask (alcance revisado a la baja)
- Prioridad  : baja
- Estado     : pendiente de decisión. **Hallazgo del 2026-07-07:** `renderSmart()` corta por hash, así que una vista solo se pinta cuando es la sección activa. El doble-render caro que motivó la tarjeta (Análisis, 5 observadores, ~11 ms) NO ocurre en la práctica: Análisis es solo-lectura, no se muta desde ahí, y renderSmart bloquea su pintado desde cualquier otra sección. La exposición real queda en los paneles de Inicio (actividad reciente, resumen) que se repintan 2-3 veces durante una acción multi-sección lanzada desde Inicio (ej. distribución del ingreso): costo bajo.
- Objetivo   : `programarRender(fn)` en `infra/render.js`, cola dedupada por identidad, vaciada en microtask; los listeners de `state:change` agendan en vez de pintar directo, colapsando repintados del mismo tick a uno. Renders directos (navegación, arranque, `renderAll`) siguen síncronos.
- Riesgo     : cambia el timing de los renders reactivos de síncrono a microtask. Blast radius de tests medido chico (los tests de vista llaman la view directo, no vía bus; E2E auto-espera). Cerca del pipeline de render: si se hace, medir el doble-render real con un escenario nuevo del harness antes/después (disciplina ADR 030).
- Secciones  : Transversal (`infra/render.js` + listeners `state:change` de los dominios multi-observador)
- Depende de : decidir si el beneficio (situacional, Inicio) justifica el cambio de timing. Alternativa recomendada: PERF.7 primero (ganancia medida e incondicional).
- Modelo     : Opus 4.8 - Alto (si se hace)

> **Iniciativa Dirección Visual premium** ([ADR 033](DECISIONS/033-direccion-visual-premium.md), estado **Propuesta**), evolución de la identidad de color por sección ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), IV.1 e IV.2 cerradas). **Nada de esto se implementa sin la validación de Esteban:** el ADR espera 5 respuestas (P1 alcance del degradado, P2 formas compartidas vs por sección, P3 ratificar el lenguaje único de iconos, P4 lote inicial de ilustraciones, P5 sombra en reposo en ambos temas), todas con recomendación escrita. Las rebanadas DV.2a-d están abajo.

#### DV.2a - Tokens de superficie/elevación + degradado de identidad (D1+D2 del ADR 033)
- Prioridad  : alta (primera rebanada de la dirección visual; DV.2b/c/d y las iniciativas v2 construyen encima)
- Estado     : **no iniciar sin validación del [ADR 033](DECISIONS/033-direccion-visual-premium.md)** (P1 y P5 la afectan directo)
- Objetivo   : escala de elevación de 4 niveles: `.card`/`.bento__cell`/`.list-item` ganan sombra en reposo (`--fk-shadow-sm`), sombras de doble capa tintadas en tema claro (`themes.css`), y regla de aire entre bloques (space-6 móvil / space-8 escritorio) documentada para las v2. Variable nueva `--fk-section-color` (token crudo) en el mapeo `[data-dom]`/`[data-section]` + token `--fk-grad-identity` (degradado de identidad, 2 paradas), con piloto en los heroes existentes (Inicio, Fondo, Inversión). DESIGN_SYSTEM.md gana la sección "Elevación" y actualiza "Sombras". Verificación: capturas ambos temas, contraste medido contra la parada fuerte del degradado (método IV.1), Lighthouse 100, `pnpm perf` sin regresión.
- Secciones  : Transversal (`styles/tokens.css`, `styles/themes.css`, `styles/components/buttons.css` `.card`, `styles/layout.css` `.bento__cell` + mapeo, `styles/components/atoms.css` `.list-item`)
- Depende de : ADR 033 aprobado
- Modelo     : Sonnet 5 - Alto (cambio transversal de CSS con verificación de contraste y perf en cada tema)

#### DV.2b - Riqueza visual piloto: formas orgánicas + patrón (D3 del ADR 033)
- Prioridad  : media-alta
- Estado     : no iniciar sin validación del ADR 033 (P2)
- Objetivo   : extensión de `scripts/sync-sprite.py` a la carpeta `assets/svg/decoracion/` (prefijo `d-*`, validación propia: no aplican las reglas de icono 24px); clase `.decor` (posición absoluta en esquinas, `aria-hidden`, `pointer-events: none`, opacidad 4-8%); 3-5 formas neutras draft (plantillas que Esteban sobrescribe en Illustrator, ADR 026) teñidas por dominio vía `currentColor`; patrón de puntos CSS tokenizado (`--fk-pattern-dots`, solo empty states/onboarding). Piloto acotado: 2 heroes + 2 empty states. Presupuesto D3/D6 del ADR (máx 1 forma por pantalla, texto nunca sobre decoración sin re-medir contraste).
- Secciones  : Transversal (sprite, `styles/components/atoms.css`, heroes piloto)
- Depende de : DV.2a (usa `--fk-section-color`)
- Modelo     : Sonnet 5 - Alto (pipeline + criterio visual con guardarraíles medibles)

#### DV.2c - Catálogo de movimiento con propósito (D4 del ADR 033)
- Prioridad  : media-alta
- Estado     : no iniciar sin validación del ADR 033
- Objetivo   : (1) cascada acotada en listas (`cardIn` escalonado solo en los primeros 6 items, paso 35 ms); (2) resaltado de fila recién guardada vía pseudo-elemento con `--fk-dom-X-bg` desvaneciendo por `opacity` (no se anima `background-color`); (3) **retiro de `empty-orbit`/`empty-float`** (bucles infinitos, contra el veto del brief) + auditoría de `animation-iteration-count: infinite` en todo `styles/`; (4) doctrina del catálogo cerrado escrita en DESIGN_SYSTEM.md (toda animación nueva se registra ahí con su propósito). No toca celebraciones (LG.2/ADR 032) ni el cambio de tema (CFG.7). Verificación en móvil real o E2E de timing + `pnpm perf`.
- Secciones  : Transversal (`styles/base.css`, `styles/components/atoms.css`, `docs/DESIGN_SYSTEM.md`; JS solo si un helper entra a `infra/animate.js`)
- Depende de : ADR 033 aprobado; independiente de DV.2a/b
- Modelo     : Sonnet 5 - Alto (timing/stagger con disciplina de rendimiento)

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Estado     : no iniciar sin validación del ADR 033 (P4); **bloqueada por la cola de diseño de Esteban** (los drafts de Claude entran como plantillas que él sobrescribe, principio ADR 026)
- Objetivo   : carpeta `assets/svg/ilustraciones/` (prefijo `il-*`) + spec (retícula 120, trazo del lenguaje v2 escalado, paleta limitada a tokens, ambos temas) + extensión del sync; los empty states del lote P4 (recomendado: las 6 superficies más visitadas) reemplazan el arte geométrico de `emptyArt()`. Presupuesto de sprite ≤ ~25 KB fuente por lote; Lighthouse 100 como gate.
- Secciones  : Transversal (sprite, `infra/icons.js` `emptyArt()`, empty states de las vistas del lote)
- Depende de : DV.2b (pipeline de decoración ya extendido); diseños o drafts aprobados
- Modelo     : Sonnet 5 - Alto (spec + integración; el diseño es de Esteban)

#### IV.4 - Iconografía dirigida post-color
- Prioridad  : decidir tras IV.2
- Estado     : bloqueada por revisión visual con capturas después de IV.2
- Objetivo   : si tras el despliegue del color la app aún se percibe fría/genérica, definir la spec por dominio y redibujar en lotes dirigidos (Esteban en Illustrator, pipeline ADR 026 + `sync-sprite.py`, revisión de legibilidad 16/22/48px en ambos temas). NO es un redibujo global del sprite.
- **Spec integrada por triaje 2026-07-08 (brief de Deudas, punto 13):** los iconos de **Avalancha** y **Bola de nieve** no representan el concepto de cada estrategia; rediseñarlos con metáfora clara (regla 5 del ADR 023: metáfora primero) manteniendo el lenguaje v2. Nota: `i-mountain` conserva sus picos agudos a propósito (decisión de ID.7); el problema reportado es de metáfora, no de estilo. Primer lote candidato de esta tarjeta.
- Secciones  : `assets/svg/`, sprite de `index.html`
- Depende de : IV.2 en producción + revisión visual + diseños de Esteban
- Modelo     : Sonnet 5 - Alto (revisión de assets contra spec; el diseño es de Esteban)

---

#### PERF.7c - Warm-up de derivaciones pesadas en idle
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : tras el primer render, un `requestIdleCallback` (con fallback `setTimeout` para navegadores sin soporte) que precaliente el bundle memoizado de Análisis y `movimientosCompletos`, para que la primera navegación a esas secciones caiga en caché en vez de pagar el cómputo frío (11-48 ms a 10k). Es el "proceso en segundo plano" que pidió Esteban, sin Web Workers (clonar el estado costaría más que estos cómputos de milisegundos).
- Secciones  : Transversal (`ui/bootstrap.js`, hooks de warm-up exportados por `analisis/view.js` y `movimientos/view.js`)
- Depende de : conviene después de 7b (así el warm-up calienta el bundle ya completo).
- Modelo     : Sonnet 5 - Alto

#### PERF.8 - Columna "arranque" en el harness + limpieza de CSS muerto
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (1) `pnpm perf` no mide `loadData()` (JSON.parse + migraciones + primer render), lo único que crece lineal con el estado total y no se puede memoizar bajo el ADN actual: es el muro real de largo plazo junto con la cuota. Agregar la columna "arranque" a `bench.perf.js` da el dato que el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4 exige para disparar PERF.5 (IndexedDB) con evidencia y no con intuición. (2) Borrar CSS sin referencias: `.bento__cell--glass` (con su `backdrop-filter`), `.skeleton`, `.spinner` (verificado sin uso en index.html ni JS el 2026-07-07).
- Secciones  : Transversal (`scripts/perf/bench.perf.js`, `styles/components/atoms.css`, `styles/layout.css`)
- Depende de : nada.
- Modelo     : Sonnet 5 - Medio

---

> **Iniciativa CAT: taxonomía de categorías Gastos↔Gastos fijos + picker de icono compartido** (triaje 2026-07-08, briefs "Auditoría Gastos" y parte de "Auditoría Calendario"). Fuente única para todo lo de categorías entre secciones. Relación fuerte con el [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md): la taxonomía D3 que ese ADR espera validar de Esteban debe decidirse JUNTO con CAT.1 (una sola clasificación de categorías, no dos).

#### CAT.1 - Taxonomía global de categorías: Gastos↔Fijos y Apartados↔Metas
- Prioridad  : alta
- Estado     : taxonomía **validada y decidida**, registrada íntegra en el [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) (Aceptada, sección "Validación 2026-07-13") y el [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) D3. Solo queda pendiente **CAT.1c** (Metas: sale Cumpleaños, fusión Vacaciones/Viajes, render legado vía `CATEGORIA_META_ICONO`, tests); CAT.1a y CAT.1b ya cerradas, ver [CHANGELOG](CHANGELOG.md). Ficha: bloque "Taxonomía global de categorías" en [`contexto/transversal.md`](contexto/transversal.md).
- Objetivo   : implementar CAT.1c con las decisiones ya registradas en el ADR 014, sin reabrir ninguna.
- Secciones  : Metas
- Depende de : nada (la validación ya está hecha)
- Modelo     : Sonnet 5 - Medio (curación de constantes + tests, sin schema ni migración)

#### CAT.3 - Categorías personalizadas globales (mismo estatus que las nativas, en toda la app)
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : las categorías personalizadas de TX.9b existen solo para Gastos; el brief pide que una categoría creada por el usuario (nombre + icono) valga también para Gastos fijos y aparezca con su icono y el color de su sección en TODAS las superficies donde aparezca (Calendario, Inicio, Movimientos, Pendientes, Prioridades, Análisis, filtros, gráficos), con las mismas automatizaciones que una nativa. Decidir el modelo de datos: catálogo global vs por sección (probable bump de schema).
- Secciones  : transversal
- Depende de : CAT.1 (la taxonomía define a qué sección pertenece una personalizada) y CAT.2 (el picker es cómo se crea)
- Modelo     : Opus 4.8 - Alto (modelo de datos + propagación transversal)

#### CAT.4 - Auditoría de consistencia de formularios: orden de campos + fecha por defecto
- Prioridad  : media
- Estado     : pendiente. **Nota FORM.1a (2026-07-15):** los formularios que migren al lenguaje v2 cumplen "fecha por defecto = hoy" por diseño (chip "Hoy" preseleccionado); Registrar gasto ya quedó cubierto. La auditoría sigue vigente para los formularios no migrados.
- Objetivo   : dos reglas transversales de los briefs 2026-07-08 aplicadas en UNA pasada por todos los formularios. (1) **Orden** (brief Mis Cuentas punto 8): la categoría/tipo va primero y la descripción después, nunca al contrario; Gastos ya lo cumple (TX.9a) y el form de Deudas lo adoptará en su reordenamiento (Deudas v2). (2) **Fecha por defecto = hoy** (brief Me deben punto 1, elevado por Esteban a regla de toda la app): todo campo de fecha de un movimiento nuevo viene precargado con la fecha actual, editable; auditar cuáles forms ya lo hacen y corregir los que no (el de Me deben reportado explícitamente).
- Secciones  : transversal (solo views de formularios, sin lógica de negocio)
- Depende de : nada; coordinar con los reordenamientos ya previstos en Deudas v2 y MC.15d para no tocar el mismo form dos veces
- Modelo     : Sonnet 5 - Medio (una pasada por ~8 formularios con tests de ambas reglas)

#### EDIT.1 - Editar sin destruir: Apartados, Inversión y Me deben
- Prioridad  : media-alta
- Estado     : pendiente, patrón P3 de la auditoría. La rebanada de Metas (EDIT.1a) ya cerró y dejó el patrón validado; quedan las tres rebanadas de abajo, ninguna iniciada.
- Objetivo   : tres secciones todavía no permiten **editar** lo ya creado: corregir un nombre mal escrito, un objetivo, una fecha o una tasa obliga a **eliminar y recrear**, perdiendo en el camino el progreso, los aportes y los intereses acumulados. Es destrucción de datos como precio de una corrección tipográfica. Aplicar el mismo patrón que **EDIT.1a** ya validó para Metas (formulario reinyectado con `meta = null` para crear y con el registro existente para editar; `normalizarX(datos, existente = null)` conserva el histórico acumulado y recalcula solo lo que depende del campo editado) a Apartados, Inversión y Me deben, en una rebanada por sección. **Decisión ya tomada en EDIT.1a, válida para las tres que faltan:** se conserva el histórico tal cual (no se recalcula ni se toca), y el estado derivado (completada/vencida/lo que aplique) se recalcula contra el dato nuevo.
- Secciones  : Apartados, Inversión, Me deben
- Archivos   : `apartados/`, `inversiones/`, `personales/` (form + acciones de cada uno), patrón de referencia ahora en `metas/` (EDIT.1a) y en `compromisos` (D.15b, para Deudas)
- Depende de : nada duro. Coordina con **ARQ.1** (si las 4 bolsas comparten componente, el formulario de edición se simplifica): decidir si conviene antes de las 3 rebanadas que faltan, aunque EDIT.1a ya demostró que escribir la rebanada de un dominio no es tan costoso como se temía (Metas no comparte prácticamente nada de formulario con Apartados/Inversión/Personales, los campos difieren)
- Modelo     : Sonnet 5 - Alto por rebanada (patrón ya probado en D.15b y EDIT.1a; sin lógica financiera nueva salvo la decisión de progreso, ya resuelta)

#### ARQ.1 - `infra/bolsas.js`: un solo modelo para las cuatro bolsas
- Prioridad  : baja
- Estado     : pendiente de análisis. Hallazgo de la auditoría de UX/producto (2026-07-21), patrón P7. **No es un rediseño de pantallas.**
- Objetivo   : fondo de emergencia, metas, apartados e inversión son cuatro implementaciones del mismo concepto ("una bolsa con objetivo, acumulado, progreso y aportes"). La auditoría midió la duplicación: `calcularProgreso` escrito 3 veces, `diasHastaFecha` 2 veces **con redondeos distintos**, y los handlers de "aportar" copiados casi carácter por carácter entre Metas y Apartados (incluido `_ajustarSaldoCuenta`). Extraer a `infra/` las funciones puras compartidas (progreso, días hasta fecha) y el handler común de "aportar a una bolsa que descuenta cuenta", más un componente de fila de progreso. **Precedente exacto y reciente: `infra/vencimientos.js`** (MC.13a/b), que hizo esto mismo con las frecuencias que Metas y Apartados duplicaban "intencionalmente". Mantiene ADN 10 intacto: ningún dominio importa a otro, todos importan infra. **Recomendación de la auditoría, importante: NO fusionar las pantallas.** Las cuatro secciones responden a mentalidades distintas del usuario y su separación es útil; lo que se unifica es la infraestructura, no la UX.
- Secciones  : Transversal (`infra/`), consumidores en Ahorro, Metas, Apartados, Inversión
- Archivos   : `modules/infra/` (módulo nuevo), `modules/dominio/metas/logic.js`, `apartados/logic.js`, `ahorro/logic.js`, `inversiones/logic.js`
- Depende de : nada. **EDIT.1a (Metas, cerrada el 2026-07-23) demostró que el temor de "escribir cuatro editores y luego unificarlos" era menor al esperado**: el formulario de edición es específico de cada dominio (campos distintos), así que ARQ.1 no bloquea las 3 rebanadas de EDIT.1 que faltan. Sigue conviniendo antes de que las iniciativas v2 de esas secciones rehagan sus vistas, para no duplicar el cálculo compartido en el nuevo diseño
- Modelo     : Opus 4.8 - Extra (refactor cross-dominio con red de regresión en 4 suites; el riesgo real es el redondeo distinto de `diasHastaFecha`, que hoy da resultados diferentes por sección)

#### ARQ.2 - Consolidar los cálculos duplicados que quedan
- Prioridad  : baja
- Estado     : pendiente. Hallazgo de la auditoría de UX/producto (2026-07-21), patrón P7.
- Objetivo   : tres duplicaciones concretas, cada una con una copia ya identificada. (1) **`FACTOR_MENSUAL` vive en más de un archivo** (`infra/financiero.js` como `FACTOR_MENSUAL_INGRESO`, `tesoreria/logic/ingresos.js` como `FACTOR_MENSUAL`): una sola tabla, o el próximo cambio de frecuencias sale mal en una de las dos. (2) **Helper "registrar pago de compromiso"**: la aritmética "registrar gasto-abono + bajar saldo + descontar cuenta" está escrita tres veces (`compromisos/_guardarAbono`, el apply de `acciones/distribucion.js`, `agenda/_marcarPagadoGastoFijo`); centralizarla reduce la superficie donde vuelven a aparecer bugs como BUG-015. (3) Totales de Agenda que recalculan lo que el motor de vencimientos ya da. **Disciplina obligatoria:** refactor sin cambio de comportamiento, con las suites existentes como red de regresión, mismo criterio con que MC.13b movió las frecuencias sin tocar un solo test.
- Secciones  : Transversal (`infra/`), Compromisos, Agenda, Tesorería
- Archivos   : `modules/infra/financiero.js`, `modules/dominio/tesoreria/logic/ingresos.js`, `modules/dominio/compromisos/logic/abonos.js`, `modules/dominio/agenda/index.js`, `modules/dominio/tesoreria/acciones/distribucion.js`
- Depende de : nada; el helper de pago (2) conviene **antes** de **CAL.5b**, que suma deudas al lote y ahí sí necesita mover `saldoTotal`. CAL.5a (cerrada) evitó la cuarta copia sin este refactor: comparte una única función privada dentro de Agenda entre el pago individual y el lote
- Modelo     : Sonnet 5 - Alto (refactor mecánico con tests existentes como red; sin decisiones de producto)

#### UPD.1 - Aviso de actualización disponible + novedades mostradas una sola vez
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (6.º lote, brief General punto 1) cuando el service worker detecte una versión nueva (`updatefound`), mostrar un aviso discreto ("Hay una nueva actualización disponible") con botón que aplica la actualización (skipWaiting + recarga controlada) en vez de esperar a la próxima recarga casual. Tras actualizar, mostrar **una única vez** un resumen breve de las novedades que le importan al usuario (no un changelog técnico): catálogo `NOVEDADES_POR_VERSION` en `constants.js`, comparando contra la última versión vista persistida. Los datos financieros no se tocan (las migraciones idempotentes ya garantizan eso, ADN 6); cero servidor: el SW ya versiona con `CACHE_NAME`.
- Secciones  : Transversal (`infra/sw-register.js`, `service-worker.js`, aviso en shell)
- Archivos   : `modules/infra/sw-register.js`, `service-worker.js`, `modules/core/constants.js`, `modules/ui/shell.js`
- Depende de : nada
- Modelo     : Sonnet 5 - Alto (ciclo de vida del SW tiene esquinas: waiting/controllerchange/doble recarga)

---

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5, fusionados: son la misma auditoría vista desde dos lados). **Revisa el [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md)** (banner de propósito por sección, base de la divulgación progresiva EP.7): decirlo formalmente al iniciar. La filosofía pedida ya existe en varios puntos y se adopta como principio transversal: el CTA "necesitas una cuenta" lleva a crearla, CAL.1 ofrece distribuir al llegar el ingreso, "Gestionar" llevará al Calendario (Inicio v2), el fondo recomendará su aporte en la distribución (AH.5/MC.13), Deudas ya enlaza a Estrategias. Alcance: (4) auditar TODOS los caminos de "sección conduce a la siguiente cuando hace falta" y completar los que falten (Gastos→Límites al detectar excesos ya está previsto en LIM.1 punto 4; Metas→Distribuir en MT.6); (5) auditoría de la información inicial de cada sección (banner de propósito + hints + empty states + botones "comenzar"): qué aporta, qué se repite, qué se elimina, qué se fusiona. **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners `renderBannerProposito`, hints); los rediseños internos de cada sección viven en sus iniciativas v2 (Inicio v2, Deudas v2, Mis Cuentas v2, Fondo v2, ANL.1...), que deben aplicar este principio, no duplicarlo.

#### GU.1a - Auditoría del sistema de guía + revisión del ADR 016
- Prioridad  : media
- Estado     : pendiente de análisis (no iniciar; conviene DESPUÉS de que las iniciativas v2 grandes definan sus pantallas, o la auditoría se hace dos veces)
- Objetivo   : inventario de todos los banners/hints/CTAs de arranque por sección; propuesta de qué se elimina, fusiona o convierte en guía contextual (nudge en el momento del error/necesidad, no texto permanente); revisión formal del ADR 016; re-corte en rebanadas por sección.
- Secciones  : Transversal (`ui/proposito.js`, empty states de todas las vistas)
- Depende de : recomendado tras IV.2 + las primeras iniciativas v2; coordina con cada una
- Modelo     : Sonnet 5 - Alto (auditoría de UX con criterio, sin lógica nueva)

---

> **Iniciativa LEG: Centro Legal y cumplimiento** (7.º lote, 2026-07-08, brief General de 9 puntos). **Hueco real hoy: la app está en producción sin ningún documento legal** (verificado: cero términos, privacidad o disclaimers formales; solo existen los avisos puntuales tipo "confirma con un contador" del monitor de renta). **Acoplamiento señalado con CFG.4:** el contenido del paquete depende de esa decisión de ADN. Con el modelo actual local-only, la política de privacidad es la fortaleza del producto ("tus datos se guardan solo en tu dispositivo, Finko no recolecta nada") y la Ley 1581/Habeas Data aplica de forma mínima; si CFG.4 aprueba cuentas/sync, el paquete se reescribe (responsable del tratamiento, canales de derechos, evidencia de consentimiento verificable). **Decisión de secuencia recomendada: redactar YA para el modelo local-only vigente** (cubre la producción actual) con cláusula de versionado, y revisar si CFG.4 cambia el ADN. **Gate final (punto 9 del brief): la revisión de todo el paquete por un abogado colombiano antes del lanzamiento oficial es trabajo profesional externo, no una tarea de código ni de IA**: las tarjetas de abajo producen borradores informados y el inventario de funciones sensibles PARA esa revisión (el mismo principio que Finko aplica a sus usuarios: orienta, no dictamina). Los documentos legales siguen el ADN 11: resumen en lenguaje claro por sección + texto formal.

#### LEG.2 - Aceptación obligatoria versionada (onboarding + re-aceptación en cambios)
- Prioridad  : alta
- Estado     : pendiente. LEG.1 (Centro Legal, borradores + UI) ya está cerrada: el bloqueo real que queda es de **contenido**, no de código. Antes de pedirle al usuario que "acepte" estos documentos hace falta resolver el checklist de `docs/legal/README.md` (responsable, correo de contacto, licencia del código) y pasar el paquete de v0.1 a v1.0 (revisión por abogado colombiano, gate del punto 9 del brief). El criterio de re-aceptación (cambio importante vs menor) ya quedó definido en `docs/legal/historial-de-cambios.md`.
- Objetivo   : primera apertura: aceptación expresa de términos + privacidad + datos personales antes de usar la app (paso nuevo del onboarding); cambios importantes de políticas: re-aceptación antes de continuar (comparar versión aceptada vs vigente). Registro local de aceptación (versión + fecha, bump de schema en `S.config`). **Limitación honesta a documentar:** sin servidor, la "evidencia" de aceptación vive solo en el dispositivo del usuario; una evidencia verificable por Finko requiere CFG.4.
- Secciones  : Onboarding, Configuración, `core/state.js`/`storage.js` (registro versionado)
- Archivos   : `modules/ui/onboarding.js`, `modules/core/state.js`, `modules/core/storage.js`
- Depende de : el checklist de `docs/legal/README.md` resuelto y el paquete en v1.0
- Modelo     : Sonnet 5 - Alto (flujo de onboarding + versionado persistido + migración)

---

> **Iniciativa LG.2: Logros v2, gamificación de hábitos** (triaje del 4.º lote, 2026-07-08, brief de Análisis puntos 1-5). **[ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada: LG.2a, LG.2b y LG.2c cerradas** (ver [CHANGELOG](CHANGELOG.md)); nombres de niveles de usuario provisionales hasta que Esteban entregue los definitivos. Contexto original: **requería ADR que revise el ADR 022** (la vitrina vive en Ajustes por decisión aprobada; el brief la muda a Análisis + resumen en Inicio: decirlo formalmente, no moverla en silencio). Alcance: (1) reubicación (apartado de progreso en Análisis + tarjeta de logros recientes/próximos en Inicio, coordinada con Inicio v2 y ANL.1); (2) logros con **niveles progresivos** (primer gasto → primer mes completo → 3 meses consecutivos → 6 meses...); (3) **niveles de usuario** que evolucionan con los hábitos (nombres por definir con Esteban; los del brief son ejemplos); (4) **regla de oro anti-gaming, al ADR como principio innegociable:** los logros premian hábitos saludables (constancia de registro, plan de ahorro cumplido, fondo completado, deudas pagadas a tiempo, equilibrio entre grupos), NUNCA la omisión de información (prohibidos "día sin gastos" o "semana gastando menos de X%": incentivarían dejar de registrar, contra el propósito de Finko); (5) logros por **interpretación de comportamiento** (mejoró su % de ahorro varios meses, redujo hormiga, terminó una deuda antes de lo previsto), que dependen de derivaciones de Análisis ya existentes (hormigas, resumen) y futuras. La base actual es simple a propósito (11 logros planos en `logros/logic.js`, evaluadores O(1); mantener esa disciplina de rendimiento: evaluación barata por `state:change`, ADR 022).

#### LG.2d - Mudanza de la vitrina: "Tu progreso" en Análisis + tarjeta en Inicio
- Prioridad  : baja (bloqueada)
- Estado     : **bloqueada por ANL.1** (ADR 032 D6: no posicionar dos veces). Su otro bloqueo, IN.8, se levantó el 2026-07-12: la iniciativa "Inicio v2" (IN.8a-g) ya está completa en producción, pero el layout de Inicio v2 (ADR 034) no reservó ningún bloque para logros; la tarjeta compacta de Inicio que pide esta tarjeta es una decisión de diseño nueva a proponer cuando se inicie LG.2d, no algo que IN.8 ya haya resuelto. La vitrina sigue en Ajustes (ADR 022 vigente operativamente) hasta que ANL.1 defina el layout de Análisis.
- Objetivo   : mover la vitrina a un apartado "Tu progreso" en Análisis y agregar la tarjeta compacta en Inicio (nivel actual + último logro + próximo objetivo, ubicación a definir dentro del bento de Inicio v2); al cerrar, marcar el ADR 022 como Superada.
- Secciones  : Análisis, Inicio, Ajustes (`logros`)
- Depende de : ANL.1 (layout de Análisis)
- Modelo     : Sonnet 5 - Alto (reubicación cross-sección con coordinación de layouts)

#### LG.2e - Familia comportamiento (interpretación de hábitos)
- Prioridad  : baja
- Estado     : pendiente; parcialmente bloqueada por datos
- Objetivo   : logros `hormiga-a-raya` (implementable ya: categorías hormiga/café + guardia de mes completo de registro, ADR 032 D2.3), `ahorro-creciente` (**bloqueado**: necesita la derivación canónica de ingreso mensual, probable entregable de ANL.1) y `pagador-puntual` (verificar si el histórico de abonos por fecha alcanza). **Cada logro pasa el test anti-gaming del ADR 032 D2 explícitamente en su PR.**
- Secciones  : Transversal (`logros`)
- Depende de : LG.2c (usa "mes completo de registro" como guardia); `ahorro-creciente` además de ANL.1
- Modelo     : Opus 4.8 - Alto (detectores de comportamiento con riesgo real de incentivos perversos)

---

> **Iniciativa PA: pagos automáticos (débito automático simulado)** (triaje 2026-07-08, brief "Integración Deudas/Cuentas/Pagos automáticos"). **Requiere ADR propio antes de una línea de código**, por dos decisiones de filosofía: (1) en una PWA offline sin servidor no existe "ejecutar a la fecha": el procesamiento sería catch-up al abrir la app (procesar débitos vencidos desde la última apertura), y hay que decidir cómo se comunica eso; (2) Finko registraría movimientos SIN confirmación del usuario, y el débito real en el banco puede fallar o diferir: riesgo de divergencia entre Finko y la realidad que hay que diseñar con cuidado (¿confirmación diferida?, ¿estado "registrado automáticamente, confírmalo"?). No toca el ADN (todo local), pero sí la filosofía "Finko refleja la realidad, no la inventa". **Ampliación del triaje del 2.º lote (2026-07-08):** el mismo ADR debe cubrir también el **crédito automático del ingreso fijo** (brief de Mis Cuentas: "al llegar la fecha de pago, el dinero se abona automáticamente a la cuenta de destino"): débitos y créditos automáticos son el mismo problema de filosofía y comparten el catch-up y el motor de vencimientos de MC.13. Un solo criterio, no dos.

#### PA.1 - ADR + diseño de pagos automáticos
- Prioridad  : media-alta (caso muy común: suscripciones y cuotas con débito automático)
- Estado     : pendiente de análisis (no iniciar sin el ADR)
- Objetivo   : al registrar un gasto fijo, deuda o suscripción, pregunta opcional "¿este pago se descuenta automáticamente?" + cuenta de débito. Al llegar la fecha (catch-up al abrir): con saldo suficiente, descuenta, actualiza la obligación, registra el movimiento y lo saca de pendientes; sin saldo, NO simula el pago y genera una alerta clara y accionable ("No fue posible registrar el pago automático de Netflix: la cuenta Bancolombia no tiene saldo suficiente..."). Consume el **motor de vencimientos compartido de MC.13** (no construir un segundo motor) y sus alertas conectan con CFG.3 (notificaciones anticipatorias) cuando esa exista.
- Secciones  : Deudas, Calendario (fijos), Mis cuentas, Inicio (alertas), transversal
- **Secuencia ya decidida (2026-07-23):** primero el lote manual. **CAL.5a está cerrada** y esta tarjeta sigue viva, no absorbida. El lote captura buena parte del valor percibido de "que se pague solo" con una fracción del riesgo, porque el usuario sigue confirmando y no se toca la filosofía "Finko refleja la realidad, no la inventa". Sirve además de puente: cuando se retome PA.1, su ADR puede llegar con evidencia real de uso del lote en vez de intuición, y con `asignarSplitsPorItem` ya escrito y probado (un pago automático de varios compromisos tiene el mismo problema de reparto).
- Depende de : motor de vencimientos (MC.13, primera rebanada); ADR propio aprobado por Esteban
- Modelo     : Fable 5 - Alto para el ADR (filosofía de producto con riesgo de confianza del usuario); implementación por rebanadas después

---

> **Diferido del [ADR 040](DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.

---

## Secciones sin tarjetas pendientes

Se listan solo para que una idea nueva de estas secciones no vuelva a generar una tarjeta duplicada: su fuente única ya está decidida.

| Sección | Dónde vive su trabajo futuro |
|---|---|
| Inicio | Iniciativa "Inicio v2" completa ([ADR 034](DECISIONS/034-inicio-v2.md)). Las recomendaciones anticipadas de "Próximas prioridades" son el punto 4 de **LIM.1** y del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) |
| Gastos | Iniciativa "Gastos v2" completa ([ADR 039](DECISIONS/039-gastos-v2-visual.md)), con 3 decisiones diferidas anotadas en el ADR: FAB, búsqueda en el header y comparación tangible del insight hormiga. La taxonomía de categorías es **CAT.1**; el motor de sugerencia por categoría, la fusión LIM.1 / ANL.1 / ADR 029 |
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. Los huecos que quedan son **MC.17f** (deshacer transferencia) y **EDIT.1** (editar donde el dominio dueño todavía no sabe) |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. Su "editar sin destruir" es una rebanada de **EDIT.1**; su infraestructura compartida, **ARQ.1** |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). Lo único pendiente es **IV.4** |

---
## Mantenimiento

#### DOC.1 - Reorganización documental, fases 3 a 5
- Prioridad  : media
- Estado     : Fases 1 y 2 cerradas el 2026-07-24. El contrato completo (arquitectura final, 11 principios con techos, trazabilidad de los 89 archivos, plan por fases) vive en [`MIGRACION.md`](MIGRACION.md), que se borra al cerrar la Fase 5.
- Objetivo   : bajar el arranque de una tarea de ~69.400 a ~21.000 tokens sin perder información. **Fase 3** (crear sin borrar): las 3 skills nuevas `cerrar-tarea`, `triaje-tarea` y `elegir-modelo`, adelgazar `auditor-finko`, crear `OPERACION.md` y reescribir CLAUDE.md a ~8 KB con tabla de trazabilidad regla por regla hecha antes de recortar. **Fase 4** (mover y fusionar): MAPA a ARCHITECTURE, SETUP_DOMINIO a OPERACION, los 2 READMEs hijos a `assets/svg/README.md`, reescritura de HANDOFF, índice tabular del tablero, briefs de iniciativa a ADRs, partir `contexto/transversal.md`, purga de `settings.local.json`. **Fase 5**: validación completa y borrado de MIGRACION.md.
- Secciones  : ninguna de la app (solo documentación, `CLAUDE.md` y `.claude/`)
- Archivos   : la tabla de trazabilidad de [`MIGRACION.md`](MIGRACION.md) sección 6 los lista uno por uno
- Depende de : nada. Cada fase es commiteable y verificable por separado; el orden 3 → 4 → 5 importa porque la tabla de documentos de CLAUDE.md debe apuntar a la estructura ya migrada
- Modelo     : la Fase 3 pide criterio de redacción y arquitectura de información (comprimir sin perder reglas); la Fase 4 es mecánica pero con validación de destino en cada borrado

#### A.5 - Dominio custom en Vercel
- Prioridad  : baja
- Estado     : pendiente (espera a que el usuario registre un dominio)
- Objetivo   : cambiar de `finko-brown.vercel.app` a un dominio propio. No requiere cambios de código.
- Secciones  : Infraestructura
- Archivos   : guía completa en [`OPERACION.md`](OPERACION.md) runbook 1
- Depende de : que el usuario tenga el dominio registrado
- Modelo     : sin código, solo config en Vercel

#### E.2-2027 - Actualizar SMMLV + UVT a valores 2027
- Prioridad  : alta (cuando llegue la fecha)
- Estado     : pendiente, programada para enero 2027
- Objetivo   : reemplazar `2027: null` por la entrada completa en `LEGAL_POR_ANIO` con los valores oficiales de Mintrabajo (SMMLV) y DIAN (UVT). Ver instrucciones detalladas en [`HANDOFF.md`](HANDOFF.md) sección "Recordatorio enero 2027".
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : publicación oficial de los decretos/resoluciones 2027
- Modelo     : Haiku 4.5

#### E.3 - Verificar GMF y otras tasas si hay reforma tributaria
- Prioridad  : baja
- Estado     : pendiente (ad-hoc, solo si hay reforma)
- Objetivo   : revisar si una reforma tributaria cambia el GMF (4x1000) u otras constantes.
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : que ocurra una reforma
- Modelo     : Haiku 4.5

_(Nota de mantenimiento anual: junto con E.2, cada enero agregar también la entrada del año en `IPC_OBSERVADO_POR_ANIO` con el cierre del DANE, ver E.5 en el CHANGELOG de 2026-07.)_
