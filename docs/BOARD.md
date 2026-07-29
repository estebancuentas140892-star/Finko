# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-07-27 (CAT.1 cierra: la taxonomía global queda implementada en las tres secciones y su tarjeta sale del tablero). Antes: MC.16 deja de estar bloqueada, el ADR 051 se acepta y la tarjeta se re-corta en MC.16a a MC.16e. Antes: Fase 2 de la reorganización documental, purga de narrativa cerrada, ver [`MIGRACION.md`](MIGRACION.md). La historia de lo ya cerrado vive en [`CHANGELOG.md`](CHANGELOG.md) y en las fichas de [`contexto/`](contexto/README.md), no aquí.

---

## En proceso

_(vacío: elegir la siguiente tarjeta de "Pendientes")_

---

## Cómo usar este tablero

1. Elegir **una** tarjeta de "Pendientes" (o del backlog del usuario si hay una nueva).
2. Abrir la ficha de su sección en [`contexto/`](contexto/README.md): si el bloque de la funcionalidad existe y está vigente, trabajar desde ahí sin re-explorar el proyecto; si no existe, el primer paso de la tarea es el análisis profundo + escribir el bloque (`/CLAUDE.md` sección 3).
3. Moverla a "En proceso" con la fecha de inicio.
4. Trabajarla en una sola sesión cuando sea posible; verificar en la app + tests verdes.
5. Al cerrar: ejecutar la skill `cerrar-tarea`, que es dueña de la secuencia completa (compuertas, orden de documentos, techos). De esa secuencia, lo que toca a este archivo es **borrar la tarjeta**.

Campos de una tarjeta:

```markdown
### <ID> - <título corto>
- Prioridad  : alta | media | baja
- Estado     : pendiente | opcional | requiere ADR
- Área       : design | code | ambos (plantilla completa: skill `triaje-tarea`)
- Objetivo   : qué resuelve, en una frase
- Secciones  : secciones de la app afectadas
- Archivos   : rutas relativas involucradas
- Depende de : otra tarjeta o "nada"
- Modelo     : capacidad + nivel sugeridos (ver la skill `elegir-modelo`)
```

Antes de crear una tarjeta nueva: skill `triaje-tarea`, dueña de las reglas (sin duplicados, dividir lo grande, fuente única por funcionalidad, continuidad de la tarea activa).

---

## Índice de pendientes

Las 54 tarjetas del tablero, para elegir la próxima sin cargar el archivo completo (principio 9). "Depende de" va acortado a la referencia clave; el texto completo vive en la tarjeta, más abajo por sección.

| ID | Título | Sección | Prioridad | Depende de |
|---|---|---|---|---|
| INV.1 | Origen del dinero al registrar una inversión | Inversión | alta | ADR 053 (aceptado) |
| CAL.5b | El lote también cubre deudas, y se ofrece desde Inicio | Calendario | media | ARQ.2 (deudas); Inicio no depende de nada |
| MC.13 | Distribución v2: contextual por fecha, guiada y con origen real | Mis cuentas | alta | nada |
| MC.13e-2b | Quitar "Abonar extra a deudas" del asistente | Mis cuentas | media | conviene antes de MC.13e-2f |
| MC.13e-2c | Identidad visual por fila: logo/ícono + nombre + nota | Mis cuentas | media | verificar notas ya existentes en el análisis |
| MC.13e-2d | Cuota del período en las filas de ahorro, no el objetivo total | Mis cuentas | media | nada (el motor ya existe) |
| MC.13e-2e | Completar con saldo de otras cuentas si el ingreso no alcanza | Mis cuentas | media-alta | conviene después de MC.13e-2b |
| MC.13e-2f | Integración con la cuenta del ingreso fijo + decisión del remanente | Mis cuentas | alta | conviene después de MC.13e-2b; bloqueada por UX |
| MC.13e-2g | Rediseño en 2 pasos con educación financiera | Mis cuentas | media | última; depende del handoff de diseño |
| MC.13c-3 | Datar el cobro de todas las frecuencias | Mis cuentas | baja | nada |
| MC.16a | Cupo de la tarjeta de crédito (`cupoTotal`) | Mis cuentas | alta | ADR 051 D1 (aceptado) |
| MC.16b | Pagar con la tarjeta: el consumo sube la deuda | Mis cuentas | alta | MC.16a |
| MC.16c | Bloque de tarjetas en Mis cuentas | Mis cuentas | media | MC.16b |
| MC.16d | "¿A cuántas cuotas?" al registrar el consumo | Mis cuentas | media | MC.16b |
| MC.16e | Nudges de costo: avance, otra red, pago mínimo | Mis cuentas | media | MC.16b |
| MC.17f | Deshacer o editar una transferencia | Mis cuentas | media | coordinar con MOV.1 |
| AP.5 | Apartados v2: formulario consistente, recurrencia como toggle | Apartados | media | nada (CAT.1 cerró) |
| MT.6 | Metas v2: subcategorías inteligentes + plan de aportes | Metas | media-alta | MC.13 (motor); ADR 029 D3 |
| AH.5 | Fondo v2: rediseño UX educativo + aportes por distribución | Ahorro | media | motor de MC.13; rediseño conviene tras IV.2 |
| LIM.1 | Límites v2: asistente preventivo de estilo de vida | Límites | sin definir | ADR 045 (base de cálculo); ADR 044 (sugerencias) |
| PE.6 | Me deben v2: intereses, historial de abonos y confianza | Me deben | media-alta | nada duro |
| ANL.1 | Análisis como centro de interpretación financiera | Análisis | sin definir | ADR 046 (criterio y lenguaje); ADR 044 (recomendaciones) |
| CFG.2c | Reubicar lo fiscal: asistente en Ajustes + Análisis | Configuración | sin definir | CFG.2a y CFG.2b |
| CFG.2a | Auto-derivar ingresos brutos al monitor de renta | Configuración | sin definir | CFG.1a (cerrada) |
| CFG.2b | Inferir el estado de declarante, con encuadre laboral | Configuración | sin definir | CFG.2a; ADR 050 D2 (framing, Abierta) |
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
| CAT.3 | Categorías personalizadas globales | Transversal | media | CAT.2 (el picker) |
| CAT.4 | Auditoría de consistencia de formularios | Transversal | media | nada; coordinar con Deudas v2 y MC.15d |
| EDIT.1 | Editar sin destruir: Apartados, Inversión y Me deben | Transversal | media-alta | nada duro; coordina con ARQ.1 |
| ARQ.1 | `infra/bolsas.js`: un solo modelo para las cuatro bolsas | Transversal | baja | nada |
| ARQ.2 | Consolidar los cálculos duplicados que quedan | Transversal | baja | nada; conviene antes de CAL.5b |
| UPD.1 | Aviso de actualización disponible + novedades | Transversal | media | nada |
| GU.1a | Auditoría del sistema de guía + revisión del ADR 016 | Transversal | media | recomendado tras IV.2 + las v2 grandes |
| LEG.2 | Aceptación obligatoria versionada | Transversal | alta | checklist de `docs/legal/README.md` |
| LG.2d | Mudanza de la vitrina a Análisis + tarjeta en Inicio | Transversal | baja (bloqueada) | ANL.1 (layout) |
| LG.2e | Familia comportamiento (interpretación de hábitos) | Transversal | baja | LG.2c; `ahorro-creciente` además depende de ANL.1 |
| PA.1 | Pagos y créditos automáticos (débito automático simulado) | Transversal | media-alta | ADR 041 (motor); ADR 052 (Abierta) |
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
- Estado     : pendiente. Continúa **CAL.5a** (cerrada, ver CHANGELOG). Secuencia "lote manual antes que PA.1" ya decidida por Esteban.
- Objetivo   : dos ampliaciones del mismo flujo, no un mecanismo nuevo: (1) sumar deudas al lote y (2) ofrecer el lote desde el bloque de vencidos de Inicio sin navegar. Detalle técnico (por qué el filtro actual, qué reusar) en la ficha [`contexto/calendario.md`](contexto/calendario.md).
- Secciones  : Calendario, Inicio (vencidos), Deudas, Mis cuentas (descuento)
- Archivos   : `modules/dominio/agenda/logic.js` + `index.js`, `modules/dominio/compromisos/views/dashboard.js`, `modules/infra/distribuir-pago.js`
- Depende de : **ARQ.2** punto 2 para la parte de deudas (la parte de Inicio no depende de nada)
- Modelo     : Alta capacidad - Alto (el abono a deuda mueve saldo y patrimonio: el borde de "abono parcial dentro de un lote" hay que decidirlo explícitamente)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2: centro de administración del dinero"** (briefs de Esteban del 2026-07-08). Fuente única de la sección. De sus 4 frentes siguen abiertos **MC.13** (Distribución v2) y **MC.16** (tarjeta de crédito, [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) aceptado el 2026-07-27, alternativa B, re-cortado en MC.16a a MC.16e); **MC.17** (transferencias) y **MC.18** (rediseño visual, [ADR 035](DECISIONS/035-mis-cuentas-v2.md)) están cerrados. **Conflicto (b) del brief, abierto:** "el dinero del ingreso fijo se abona solo a la cuenta en la fecha de pago" es un movimiento automático sin confirmación, exactamente el problema de filosofía de PA.1, así que se decide en el MISMO ADR de pagos automáticos y no por separado. El conflicto (a) quedó resuelto el 2026-07-15.

#### MC.13 - Distribución v2: contextual por fecha, guiada y con origen real del dinero
- Prioridad  : alta
- Estado     : **el motor está completo y en producción** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md), aceptado parcialmente, con su diseño completo dentro); el asistente está a mitad de rediseño. Siguen abiertas **MC.13e-2b a MC.13e-2g**, abajo.
- Objetivo   : responder "¿qué debo hacer HOY con este dinero?" en vez de mostrar todo el mes. Diseño completo y regla vigente del motor (`infra/vencimientos.js`, única tabla de frecuencias del proyecto) en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md), sección "Distribución v2".
- Secciones  : Mis cuentas (`tesoreria/logic/distribucion.js`, `views/distribucion.js`, `acciones/distribucion.js`)
- Depende de : nada (la decisión (a) ya está resuelta); coordinar con PA.1 (conflicto (b), independiente)
- Modelo     : cada rebanada MC.13e-2 lleva el suyo (ver abajo)

> **Rebanadas de MC.13e-2**, re-cortadas por riesgo e independencia (regla 2.1). El mapa del asistente (qué función vive en qué archivo, con líneas) es la tabla de anclas de [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md): leerla antes de iniciar cualquiera de estas rebanadas.

#### MC.13e-2b - Quitar "Abonar extra a deudas" del asistente
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : un abono es un pago, vive en Deudas, no en el asistente de distribución: quitar `seccionDeudas`/`destinosDeudas` del asistente y del apply. Archivos, funciones y la trampa de `descontable`/`hayDestinos` en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, Deudas (el consumidor de `distribucion:aplicar` para abonos)
- Depende de : conviene antes de MC.13e-2f (simplifica el paso final que esa rebanada rediseña)
- Modelo     : Equilibrado - Alto (toca apply + un consumidor por EventBus en otro dominio)

#### MC.13e-2c - Identidad visual por fila: logo/ícono + nombre + nota
- Prioridad  : media
- Objetivo   : cada fila del asistente gana logo/ícono de marca + campo "nota" opcional, reusando infraestructura ya construida (BR/MK/CAT.2), no crea íconos nuevos. Detalle y verificación de `nota` pendiente en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas
- Depende de : verificar en el análisis si `compromiso.nota`/`meta.nota`/`apartado.nota` ya existen o hace falta agregarlos
- Modelo     : Equilibrado - Alto (reuso de infra existente en varias filas, revisar shape de datos por tipo)

#### MC.13e-2d - Cuota del período en las filas de ahorro, no el objetivo total
- Prioridad  : media
- Objetivo   : las filas de ahorro del asistente muestran la cuota del período (motor `aportePorPeriodo`, MC.13b), no el objetivo total. Verificar si `construirDesgloseAhorroPorObjetivo` ya usa el motor: detalle en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, transversal por el motor (`infra/vencimientos.js`)
- Depende de : nada (el motor ya existe, MC.13b)
- Modelo     : Equilibrado - Alto (verificar el dato correcto antes de tocar la vista)

#### MC.13e-2e - Completar con saldo de otras cuentas si el ingreso no alcanza
- Prioridad  : media-alta
- Objetivo   : punto 14 del brief: si lo marcado (Necesidades + Ahorro + Inversiones) excede el monto a distribuir, detectar el déficit y ofrecer explícitamente completar con saldo disponible de otra cuenta activa (no automático: pregunta explícita, patrón ya usado en abonos/pagos con sobregiro). Toca el cálculo de `excede`/`asignado` en `resumirPlanDistribucion` y el apply en `_confirmarDistribucion` (de dónde sale el complemento, cómo se registra el descuento en la segunda cuenta).
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic/distribucion.js` (`resumirPlanDistribucion`), `acciones/distribucion.js` (`_confirmarDistribucion`), `views/distribucion.js` (mensaje de déficit)
- Depende de : conviene después de MC.13e-2b (menos destinos que balancear)
- Modelo     : Alta capacidad - Alto (lógica financiera nueva con casos borde: qué cuenta, cuánto, no dejar ninguna en negativo sin confirmar)

#### MC.13e-2f - Integración con la cuenta del ingreso fijo + decisión explícita del remanente
- Prioridad  : alta
- Estado     : pendiente de análisis. **Necesita la palabra de Esteban antes de codificar (regla 2.7)**: hoy el paso final "Estilo de vida" es puramente informativo (el remanente se queda donde está, sin pedir confirmación); el punto 18 quiere una decisión EXPLÍCITA (dejarlo en la cuenta / ahorro / meta) y la integración del ingreso fijo quiere que el paso desaparezca del todo. Ambas cosas juntas cambian la UX del cierre del asistente (MC.7e): preguntar antes de decidir el diseño exacto (¿un selector "¿qué haces con los $X que sobran?" con 3 opciones? ¿un cuarto paso?).
- Objetivo   : (integración ingreso fijo) el asistente parte de `Ingreso.cuentaId` (MC.13d) en vez de siempre llamar `resolverCuenta()`; los pagos aprobados se descuentan de ahí. (18) el remanente ya no es solo informativo: exige una decisión explícita antes de poder confirmar.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/acciones/distribucion.js` (`_confirmarDistribucion`, resolución de cuenta), `views/distribucion.js` (`seccionInfo`, paso "Estilo de vida")
- **Desbloqueo parcial propuesto por el triaje de la auditoría (2026-07-21), patrón P1:** esta tarjeta mezcla dos cosas de dificultad muy distinta, y la mitad fácil está presa de la difícil. Usar `Ingreso.cuentaId` (MC.13d) como punto de partida en vez de llamar siempre a `resolverCuenta()` **no necesita diseño nuevo**: el dato ya se captura desde MC.13d y hoy se ignora, así que el usuario vuelve a elegir la misma cuenta cada quincena. La decisión explícita del remanente (punto 18) sí necesita la palabra de Esteban. Recomendación: partir en **MC.13e-2f-1** (usar el `cuentaId` del ingreso, desbloqueada, ejecutable ya) y **MC.13e-2f-2** (decisión del remanente, sigue bloqueada).
- Depende de : conviene después de MC.13e-2b (menos ruido en el paso final); **bloqueada por la decisión de UX de Esteban** (solo la mitad del remanente, ver desbloqueo parcial arriba)
- Modelo     : Alta capacidad - Alto (lógica financiera + decisión de producto no trivial); la mitad del `cuentaId` baja a Equilibrado - Alto

#### MC.13e-2g - Rediseño en 2 pasos con educación financiera
- Prioridad  : media
- Área       : ambos (secuencia y contenido educativo son decisión de producto/design; la reestructura del panel es code)
- Estado     : pendiente de análisis. **Necesita la palabra de Esteban antes de codificar**: ¿handoff de diseño de Claude Design (mismo patrón que las 8 pantallas v2 anteriores: Inicio, Mis cuentas, Deudas, Calendario, Análisis, Gastos, Navegación, Formularios) o Sonnet/Opus lo diseña sin mockup, como el resto de MC.13e-2?
- Objetivo   : (9) el asistente pasa de un flujo directo a 2 pasos: primero educación financiera (cómo distribuyen los expertos, con barras/gráficos/porcentajes; candidato a logro por distribución saludable sostenida, **derivado a una tarjeta de Logros si Esteban lo confirma**, no parte de esta rebanada), después la distribución personalizada por prioridad (el flujo actual, reubicado). (10) cada recomendación (hoy el array `ctas`, si sobrevive a MC.13e-2a) aparece solo en el paso de su categoría, nunca todas juntas al inicio.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/distribucion.js` (reestructura mayor de `_renderContenidoAsistente`/`_renderPanelDistribuir`), CSS nuevo si hay mockup
- **Tensión señalada por el triaje de la auditoría (2026-07-21), pendiente de la decisión de Esteban:** esta rebanada quiere **más** pasos (educación financiera antes de repartir), mientras que la auditoría propone lo contrario para el mismo asistente: una **propuesta pre-armada de un toque** (todo calculado y marcado por defecto, el usuario solo confirma) para bajar la fricción del flujo más repetido de la app. No son necesariamente incompatibles (la educación puede ser opcional, colapsable o de primera vez), pero el orden importa y decide el diseño: **¿la educación va al frente o detrás de la acción?** Resolverlo antes de encargar el handoff, o el mockup fijará la respuesta sin que nadie la haya decidido.
- Depende de : conviene última (reestructura el contenedor donde viven las demás rebanadas); depende de la decisión de handoff de diseño y de la tensión de arriba
- Modelo     : si hay handoff, Equilibrado - Alto (implementación de mockup, mismo patrón que FORM.1/CAL.4/GAS.1); si no, Alta capacidad - Alto (diseño + implementación sin mockup)

#### MC.13c-3 - Datar el cobro de todas las frecuencias (`ultimoPagoHasta`)
- Prioridad  : baja
- Estado     : pendiente, **no bloquea nada** (separada de MC.13c-2 al cerrarla, que descubrió que no la necesitaba).
- Objetivo   : `ultimoPagoHasta` no data frecuencias largas (Bimestral/Trimestral/Semestral/Anual), que quedan sin guard de de-duplicación. No bloquea nada; el asistente igual funciona. Por qué no se hizo antes y las 2 trampas (Diario/Semanal sin `diaPago`; Quincenal ver **[BUG-017](BUGS.md)**) en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas (asistente), Calendario (si se corrige el modelo quincenal)
- Depende de : nada
- Modelo     : Alta capacidad - Alto (toca la clave de de-duplicación y, si se corrige el quincenal, el Calendario)

> **MC.16 - Tarjeta de crédito como producto integrado.** El ADR quedó **aceptado el 2026-07-27**: la tarjeta es un producto de Deudas (alternativa B), con saldo revolvente y una sola deuda por tarjeta. Diseño completo, invariantes y las 4 alternativas rechazadas en **[ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md)**, su dueño: leerlo antes de iniciar cualquier rebanada. **Ninguna rebanada crea un tipo de cuenta ni una `Cuenta` para la tarjeta** (D5, I5 del [ADR 053](DECISIONS/053-invariante-de-patrimonio.md)). Desbloquea `consumosTC` del monitor de renta (CFG.2a) en cuanto MC.16b esté en producción.

#### MC.16a - Cupo de la tarjeta de crédito (`cupoTotal`)
- Prioridad  : alta
- Área       : code
- Estado     : pendiente, ejecutable ya. Es el dato base: sin cupo no hay producto operable.
- Objetivo   : el formulario de deuda con categoría 'Tarjeta de crédito' gana el campo `cupoTotal`, y la fila de Deudas muestra el disponible (`cupoTotal - saldoTotal`), derivado, nunca almacenado. `cupoTotal` es además el discriminador de "tarjeta operable" (ADR 051 D1).
- Secciones  : Deudas
- Archivos   : `modules/dominio/compromisos/views/formularios.js` (campo condicionado a la categoría, patrón `_wireToggleFiado`), `logic.js` (validación/normalización), `views/lista.js`, `modules/core/state.js` (typedef), `modules/core/storage.js` (bump a v28, migración no-op, precedente v26 → v27)
- Depende de : nada (ADR 051 aceptado)
- Modelo     : Equilibrado - Alto (campo nuevo + bump; sin dinero en movimiento)

#### MC.16b - Pagar con la tarjeta: el consumo sube la deuda
- Prioridad  : alta
- Área       : code
- Estado     : pendiente. **Indivisible** por la I3 del ADR 053: el alta, la edición y la eliminación del consumo entran juntas o no entra ninguna.
- Objetivo   : el corazón del ADR (D3 y D4). Un gasto pagado con tarjeta no descuenta cuenta, apunta a la tarjeta (`compromisoId`) y sube su `saldoTotal`; `Gasto.consumoTC` fija el sentido, porque el abono a la propia tarjeta lleva el mismo `compromisoId`. `_ajustarSaldoDeuda` ya sincroniza al editar y eliminar: solo cambia el signo.
- Secciones  : Gastos, Deudas (saldo), Análisis y Límites (los reciben gratis: un consumo es un gasto normal)
- Archivos   : `modules/dominio/gastos/index.js` (`_ajustarSaldoDeuda`, alta/edición/eliminación), `gastos/view.js`, `modules/infra/cuenta-helper.js` (`renderSelectorCuenta` acepta tarjetas por parámetro, nunca lee `S.compromisos`), `modules/core/state.js` (typedef de Gasto)
- Riesgo     : el signo invertido en la edición descuadra la deuda en silencio. La tarjeta solo se ofrece en Gastos: no se ahorra ni se transfiere con cupo (D4)
- Depende de : MC.16a
- Modelo     : Alta capacidad - Alto (mueve saldo de deuda con reversa exacta en tres operaciones)

#### MC.16c - Bloque de tarjetas en Mis cuentas
- Prioridad  : media
- Área       : ambos
- Estado     : pendiente
- Objetivo   : Mis cuentas muestra las tarjetas en un bloque propio, **fuera** del total de dinero disponible, con cupo usado y disponible, y enlace a Deudas para operar. Solo lectura: la dueña es Deudas (D6).
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/cuentas.js` (lee `S.compromisos`, como ya hacen `views/distribucion.js` y `acciones/cuentas.js`; nunca importa el dominio), CSS del bloque
- Depende de : MC.16b (que exista una tarjeta con consumos que mostrar)
- Modelo     : Equilibrado - Alto (vista de solo lectura sobre datos ya existentes)

#### MC.16d - "¿A cuántas cuotas?" al registrar el consumo
- Prioridad  : media
- Área       : code
- Estado     : pendiente. Refina MC.16b; sin ella el consumo ya funciona.
- Objetivo   : al registrar un consumo, preguntar el número de cuotas y subir `cuotaMensual` en `monto / N`. **No crea un plan por compra** (D2): el saldo es revolvente y el pago anticipado opera sobre el total de la tarjeta.
- Secciones  : Gastos, Deudas
- Archivos   : `modules/dominio/gastos/view.js` (campo condicionado a que el pago sea con tarjeta), `gastos/index.js`
- Depende de : MC.16b
- Modelo     : Equilibrado - Alto (un cálculo simple sobre un flujo ya construido)

#### MC.16e - Nudges de costo: avance en efectivo, retiro en otra red, pago mínimo
- Prioridad  : media
- Área       : ambos
- Estado     : pendiente, última. Educa sobre un flujo que ya debe existir y funcionar.
- Objetivo   : avisar el costo real en esas tres situaciones concretas y en el momento de la operación (D7). Prohibido comentar cada consumo o calificar la compra: el aviso explica el costo, no juzga ([ADR 003](DECISIONS/003-tono-neutral-profesional.md), ADN 11).
- Secciones  : Gastos, Deudas
- Depende de : MC.16b
- Modelo     : Alta capacidad - Alto (el contenido es producto y tono, no cálculo)

#### MC.17f - Deshacer o editar una transferencia (hueco de integridad)
- Prioridad  : media
- Estado     : pendiente de análisis. **Revisa el cierre de MC.17 como "completa"** (regla 2.7: decirlo, no corregirlo en silencio). Hallazgo de la auditoría de UX/producto.
- Objetivo   : una transferencia no se puede editar ni revertir hoy; un error de cuenta o monto descuadra dos saldos a la vez sin salida dentro de la app (patrón P3, agravado). Diseño recomendado (deshacer con rastro, no borrado silencioso) y el cuidado del GMF en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, Movimientos (rastro)
- Depende de : coordinar con **MOV.1** (si el ledger gana acciones por fila, "deshacer transferencia" es una de ellas y no necesita UI propia en Mis cuentas)
- Modelo     : Alta capacidad - Alto (dinero en dos cuentas + GMF; una reversa mal hecha descuadra el patrimonio)

---

### Apartados (dominio `apartados`)

> **Iniciativa "Apartados v2: colchón para gastos esporádicos"** (brief de Esteban del 2026-07-08, 6 puntos). El criterio Apartados vs Metas (un apartado es una obligación previsible, una meta es un deseo) es del [ADR 007](DECISIONS/007-dominio-apartados.md); su aplicación al catálogo, del [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md). **Derivados a fuentes únicas:** categorías que en realidad son Metas y picker de icono ya los resolvieron **CAT.1** y **CAT.2** (cerradas; el `icono` de apartados sigue siendo emoji como dato del usuario, exento de TX.4, y su paso a símbolo del sprite se decide en CAT.3); "Otro" con nombre+icono → **CAT.3**.

#### AP.5 - Apartados v2: formulario consistente, recurrencia como toggle
- Prioridad  : media
- Estado     : pendiente de análisis (no iniciar). **AP.5a cerrada** (ver CHANGELOG): el punto (6) del alcance original ya no es parte de esta tarjeta.
- Objetivo   : (1) el form de nuevo apartado adopta el patrón estándar de captura. **Ojo (triaje 2026-07-15):** el brief pedía dropdown "Seleccionar categoría..." que autocompleta, pero el [ADR 042](DECISIONS/042-formularios-v2-visual.md) (Formularios v2, D9) fijó después los **chips de ícono** como lenguaje de la app; decidir con Esteban al iniciar (recomendación: chips, por consistencia); (4) la pregunta "¿este gasto se repite?" sale del registro inicial y pasa a ser un **toggle "Recurrente"** en el apartado ya creado (activa/desactiva la recurrencia v14 existente; el form inicial queda más simple).
- Secciones  : Apartados
- Archivos   : `modules/dominio/apartados/` (form, view, logic)
- Depende de : nada. CAT.1 cerró, así que el catálogo de la filosofía redefinida ya está en `PLANTILLAS_APARTADO`
- Modelo     : Equilibrado - Alto (re-corte en rebanadas al iniciar)

---

### Metas (dominio `metas`)

#### MT.6 - Metas v2: subcategorías inteligentes + plan de aportes generado automáticamente
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar). Alcance y las 3 decisiones: **[ADR 048](DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md)**, su dueño.
- Objetivo   : el usuario dice qué quiere y para cuándo; Finko reconoce el tipo de meta (subcategorías), calcula la cuota con la frecuencia real de ingresos y genera el plan de aportes.
- Secciones  : Metas, Calendario (plan visible), transversal por el motor de MC.13
- Archivos   : `modules/dominio/metas/logic.js` (cálculo existente), motor compartido de MC.13, `agenda` (visualización del plan)
- Depende de : MC.13 (motor); validación D3 del ADR 029 para las subcategorías; coordinar con PA si el plan se automatiza
- Riesgo     : la estructura de dos niveles se comparte con entidad→producto (MC.16, Deudas v2): modelarla acá por separado la duplica (ADR 048 D1)
- Modelo     : Alta capacidad - Alto (modelo de datos de subcategorías + generación/recalculo del plan de aportes)

---

### Ahorro (dominio `ahorro`, casa de Ahorro + fondo de emergencia)

#### AH.7 - Los dos temas que DIS.18 señaló y no resolvió
- Prioridad  : baja
- Área       : design (los dos son de arquitectura y lenguaje de producto, no de lógica)
- Estado     : registrado, sin analizar. Origen: informe "Arquitectura Tu ahorro total", pendientes 1 y 3 ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)).
- Objetivo   : (1) decidir si **"Ahorro" sube a la barra inferior**, lo que implica desplazar Calendario: es una decisión de la barra completa y no se toma desde una sección. (2) el nombre **"Apartados"** colisiona con "apartar", el verbo genérico de ahorrar en toda la app: renombrarlo toca varias pantallas, microcopy y la ficha de su dominio.
- Secciones  : Ahorro (casa), Apartados, Barra de navegación
- Depende de : nada duro. El punto 1 conviene decidirlo junto a cualquier revisión futura de la barra inferior; el punto 2, antes de escribir más copy que use la palabra.
- Modelo     : Equilibrado - Medio (dos decisiones de producto con barrido de copy acotado)

#### AH.5 - Fondo v2: rediseño UX educativo + aportes por el flujo de distribución
- Prioridad  : media
- Área       : ambos (el rediseño es design; el cambio de flujo de aporte es code)
- Estado     : pendiente de análisis (no iniciar). Alcance y las 4 decisiones: **[ADR 049](DECISIONS/049-fondo-de-emergencia-v2.md)**, su dueño. **AH.5a cerrada** (ver CHANGELOG).
- Objetivo   : el aporte principal pasa al asistente de distribución y la sección comunica protección (qué es, por qué importa, cuándo se usa) antes que cifras.
- Secciones  : Ahorro (fondo), transversal por el motor de MC.13
- Archivos   : `modules/dominio/ahorro/` (view, logic con AH.2 ya hecho), motor compartido en MC.13
- Depende de : el aporte por distribución depende del motor de MC.13; el rediseño conviene tras IV.2
- Riesgo     : las 2 vías de aporte (asistente y registro directo) deben terminar en la misma función del dominio, o el saldo se calcula distinto según por dónde entró (ADR 049 D2)
- Modelo     : Equilibrado - Alto (rediseño de una sección con lógica ya existente; re-cortar en rebanadas al iniciar)

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

#### PE.6 - Me deben v2: intereses acumulados, historial de abonos, rendimiento y confianza
- Prioridad  : media-alta
- Estado     : pendiente de análisis (no iniciar). Alcance y las 6 decisiones: **[ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md)**, su dueño.
- Objetivo   : que la sección deje de ser un registro y pase a seguimiento: total sugerido con intereses al cobrar, historial de abonos, rendimiento y estadísticas por persona.
- Secciones  : Me deben (`personales`)
- Archivos   : `modules/dominio/personales/logic.js`, `state.js`/`storage.js` (historial, bump), `personales/view.js`
- Depende de : nada duro; el punto 7 conviene tras IV.2
- Riesgo     : el bump de schema toca préstamos ya existentes en dispositivos reales; la migración debe conservar el acumulado `pagado` (ADR 047 D3)
- Modelo     : Alta capacidad - Alto (intereses acumulados con pagos parciales; el resto de rebanadas puede bajar)
- Rebanadas  : PE.6a intereses+desglose, PE.6b historial+schema, PE.6c rendimiento, PE.6d estados visuales, PE.6e confianza

---

### Inversión (dominio `inversiones`)

#### INV.1 - Origen del dinero al registrar una inversión
- Prioridad  : alta
- Estado     : pendiente. Ejecuta la consecuencia inmediata del **[ADR 053](DECISIONS/053-invariante-de-patrimonio.md)** (Aceptada). Hallazgo H5 de la auditoría integral del 2026-07-25.
- Área       : code
- Objetivo   : hoy `inversiones` no toca cuentas, mientras `analisis` asume que ese dinero ya salió de ellas: comprar un CDT con saldo de una cuenta registrada infla patrimonio y Score de forma permanente. Preguntar el origen con dos ramas explícitas (cuenta propia / preexistente o externa), descontar cuando aplique y persistir `cuentaId`. Default sugerido según `fecha de inicio` (hoy o reciente sugiere cuenta; pasada sugiere preexistente).
- Alcance    : **indivisible**: alta con descuento + reversa al eliminar + regla de cuenta origen ya borrada. I3 del ADR prohíbe entregar solo el alta.
- Secciones  : Inversión, Mis cuentas (saldo)
- Archivos   : `modules/dominio/inversiones/` (index, logic, view), `modules/core/state.js` (`cuentaId` opcional en el typedef de Inversion)
- Riesgo     : `inversiones` pasa a mover dinero real; debe hacerlo vía `editar('cuentas', ...)` de `infra/crud.js`, nunca importando tesorería (ADN 10, precedente PE.7). Definir antes de codificar qué pasa al eliminar una inversión cuya cuenta origen ya no existe (recomendación del análisis: no revertir y avisar, nunca revertir a una cuenta arbitraria).
- No hacer   : no se toca `calcularActivos()` (I4 del ADR: cambiar la regla de suma borraría del patrimonio las inversiones ya registradas). Sin bump de `SCHEMA_VERSION`: campo opcional `undefined`-safe.
- Depende de : ADR 053 (aceptado). **Precede** a la rebanada de Inversión de EDIT.1
- Modelo     : Alta capacidad - Alto (un dominio empieza a mover saldo; la reversa mal hecha descuadra el patrimonio)

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

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"). **No iniciar ninguna sin instrucción explícita.** Alcance, la decisión de ubicación ya tomada y el framing legal aún abierto: **[ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**, su dueño. Ficha: [`contexto/configuracion.md`](contexto/configuracion.md). El monitor de renta (K.3, `calcularEstadoRenta`) ya hace gran parte de CFG.2: los huecos que quedan son los de CFG.2a y CFG.2b, abajo.

#### CFG.2c - Reubicar lo fiscal: asistente bajo demanda en Ajustes + interpretación en Análisis
- Prioridad  : sin definir
- Estado     : pendiente. Ejecuta la decisión D1 del **[ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)** (ya tomada). Conviene DESPUÉS de CFG.2a/2b, que reducen cuántas preguntas quedan en el asistente.
- Objetivo   : los 2 bloques fiscales dejan de renderizarse permanentes en Ajustes y pasan a un asistente tras botón; la interpretación se consolida en Análisis (coordinar con el layout de ANL.1).
- Secciones  : Configuración (Ajustes), Análisis
- Archivos   : `modules/dominio/config/view.js`/`index.js` (los 2 forms actuales), `modules/dominio/analisis/view.js`
- Depende de : CFG.2a y CFG.2b; coordinar con ANL.1
- Modelo     : Equilibrado - Alto (reubicación de UX sin lógica fiscal nueva)

#### CFG.2a - Auto-derivar ingresos brutos del año al monitor de renta
- Prioridad  : sin definir
- Estado     : pendiente (parte 2 de la iniciativa fusionada; depende de CFG.1a, cerrada)
- Objetivo   : el criterio "Ingresos brutos" del monitor de renta (K.3) hoy exige que el usuario lo teclee a mano en Datos de renta. Anualizar `S.ingresos` (recurrentes, por `frecuencia`) + sumar `S.ingresosPuntuales` del año para estimarlo automáticamente, de modo que pase de "Sin datos" a medible sin captura manual. Mantener el override manual si el usuario prefiere. `consumosTC` y `consignaciones` siguen manuales (no derivables: no hay tipo de cuenta "tarjeta de crédito", ni movimientos bancarios crudos). _(Nota de triaje 2026-07-08: si **MC.16** (tarjeta de crédito como producto integrado) se implementa, `consumosTC` pasaría a ser derivable automáticamente; revisar esta tarjeta en ese momento.)_
- Secciones  : Configuración (Ajustes), Análisis (monitor de renta), transversal (lee ingresos)
- Archivos   : `modules/dominio/analisis/logic.js` (`calcularEstadoRenta`, nueva `estimarIngresosBrutosAnio`), `modules/dominio/tesoreria/logic/ingresos.js` (helper de anualización si aplica)
- Depende de : CFG.1a (cerrada)
- Modelo     : Alta capacidad - Alto (lógica financiera CO no trivial: anualización de ingresos + interpretación de "ingresos brutos" DIAN)

#### CFG.2b - Inferir el estado de declarante + mensaje del motivo, con encuadre por situación laboral
- Prioridad  : sin definir
- Estado     : **bloqueada**: el framing legal es la decisión D2 del **[ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)** (Abierta, 3 alternativas descritas). No codificar la inferencia sin resolverla con Esteban.
- Objetivo   : reemplazar el checkbox manual "La DIAN me notificó como declarante" por un estado **inferido** de los 5 criterios, con el encuadre por situación laboral. Nunca afirmar certeza legal.
- Secciones  : Configuración (Ajustes), Análisis (monitor de renta)
- Archivos   : `modules/dominio/analisis/logic.js` (`detectarNudgesRenta` y/o nueva lógica de inferencia), `modules/dominio/config/view.js` (perfil fiscal)
- Depende de : CFG.2a; ADR 050 D2 resuelto
- Modelo     : Alta capacidad - Alto (producto + framing legal; roza filosofía de producto)

#### CFG.3 - Notificaciones inteligentes anticipatorias
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy el recordatorio existente solo avisa al abrir la app; el usuario quiere alertas que se anticipen a eventos (día de pago hoy, deuda vence mañana, pago con 2 días de atraso, cerca de superar presupuesto de una categoría, meta de ahorro alcanzada, aporte recomendado de la semana, apartado próximo a vencer). Pidió explícitamente que sean útiles y no invasivas: solo cuando realmente ayuden a decidir mejor. **Fuente añadida por triaje del 3.er lote (2026-07-08, brief Me deben punto 6):** vencimientos de préstamos personales ("mañana vence el préstamo de Juan", "han pasado 5 días desde el vencimiento"), con lenguaje amable orientado a recordar, nunca a presionar; `Personal.fechaLimite` ya existe como dato. Un solo motor de recordatorios para todas las fuentes, no uno por sección.
- Secciones  : Configuración (Ajustes, activación), transversal (agenda, presupuesto, metas, apartados, compromisos, personales como fuentes de los eventos)
- Archivos   : sin explorar; depende de si Finko ya usa alguna API de notificaciones del navegador/PWA (revisar `modules/infra/notificaciones.js` y el service worker) o si hay que incorporar Push API / Notification API, lo cual tiene restricciones de permisos y de plataforma (iOS Safari limita notificaciones push de PWA)
- Depende de : nada. Riesgo técnico a evaluar primero: viabilidad real de notificaciones push offline-first sin servidor (ADN 2 y 3); puede requerir ADR si la solución técnica choca con "sin servidor".
- Modelo     : Máxima capacidad - Alto (multidominio, con una restricción técnica de plataforma no trivial que hay que investigar antes de diseñar)

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
- Modelo     : Alta capacidad - Alto (decisión de qué mecanismos son viables en PWA vs. cuáles prometer a futuro; UX de bloqueo con riesgo de dejar al usuario fuera de sus propios datos si algo falla)

#### CFG.6 - Revisión general de la sección Ajustes
- Prioridad  : sin definir
- Área       : design (auditoría visual y de layout, sin lógica nueva)
- Estado     : **parcialmente ejecutada (2026-07-25).** La auditoría de diseño de la sección entregó 13 hallazgos y se aplicaron los 11 que no dependen de otra sección: agrupación y reorden del panel, un solo primario, confirmación visible al guardar, importador accesible, pesos con separador de miles, botones de datos por ámbito, instrucción ramificada por PWA, Centro Legal con jerarquía, "Acerca de" sin jerga y teja + sprite en el encabezado (ver CHANGELOG 2026-07-25). **Lo que sigue abierto en esta tarjeta:** (1) el inventario de qué configuraciones *faltan* en Ajustes, que es lo que la ata a CFG.1 a CFG.5; (2) el pase de **escritorio y tablet**, que la auditoría no revisó (solo móvil 390px, solo tema oscuro), incluidos el Bento Grid y los botones que hoy ocupan todo el ancho; (3) tema claro, sin verificar.
- Objetivo   : el usuario pidió revisar si faltan configuraciones que deberían vivir en Ajustes, con el objetivo de que la sección se convierta en el centro de configuración de Finko (seguridad, personalización, notificaciones, respaldo y cualquier otra opción relevante), con interfaz clara y organizada. **Ampliado por triaje del 4.º lote (2026-07-08, brief de Ajustes punto 2):** rediseño visual de la sección con tarjetas de tamaño uniforme, Bento Grid donde aporte, bloques compactos y alineados, sin botones que ocupen todo el ancho en desktop (hoy: "Instalar aplicación", "Recordatorios"); misma sensación de orden que el resto de la app (coordina con IV.2). **7.º lote:** el layout debe reservar el bloque del **Centro Legal** (iniciativa LEG, Transversal).
- Secciones  : Configuración (Ajustes)
- Archivos   : `modules/dominio/config/view.js`, `styles/components/config.css`
- Depende de : CFG.1 a CFG.5 (esta es la pasada de auditoría/orden final, tiene sentido hacerla después o junto con las demás, no antes)
- Modelo     : Equilibrado - Alto (auditoría de una sección existente con criterio de UX, sin lógica financiera nueva)

#### CFG.7 - Transición de tema claro/oscuro más fluida [con advertencia técnica]
- Prioridad  : baja
- Área       : design (mejora visual; la advertencia técnica es de rendimiento, no de lógica de negocio)
- Estado     : pendiente de análisis (no iniciar sin leer la advertencia)
- Objetivo   : el cambio de tema se percibe brusco. **Advertencia: la transición suave ya existe y su alcance actual es rendimiento deliberado**, no un olvido. Detalle e investigación ya hecha en [`contexto/sistema-visual.md`](contexto/sistema-visual.md).
- Secciones  : Transversal (shell/tema), visible desde Ajustes
- Depende de : verificación en dispositivo real primero (mismo criterio de evidencia del ADR 030 D4)
- Modelo     : Equilibrado - Alto (mejora progresiva acotada con verificación de rendimiento antes/después)

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
- Modelo     : Alta capacidad - Extra o Máxima capacidad - Alto (cambio de mayor riesgo del proyecto: ruta de arranque async + migración de datos reales de años)

---

#### PERF.6 - Coalescer de renders por microtask (alcance revisado a la baja)
- Prioridad  : baja
- Estado     : pendiente de decisión. **Hallazgo del 2026-07-07:** `renderSmart()` corta por hash, así que una vista solo se pinta cuando es la sección activa. El doble-render caro que motivó la tarjeta (Análisis, 5 observadores, ~11 ms) NO ocurre en la práctica: Análisis es solo-lectura, no se muta desde ahí, y renderSmart bloquea su pintado desde cualquier otra sección. La exposición real queda en los paneles de Inicio (actividad reciente, resumen) que se repintan 2-3 veces durante una acción multi-sección lanzada desde Inicio (ej. distribución del ingreso): costo bajo.
- Objetivo   : `programarRender(fn)` en `infra/render.js`, cola dedupada por identidad, vaciada en microtask; los listeners de `state:change` agendan en vez de pintar directo, colapsando repintados del mismo tick a uno. Renders directos (navegación, arranque, `renderAll`) siguen síncronos.
- Riesgo     : cambia el timing de los renders reactivos de síncrono a microtask. Blast radius de tests medido chico (los tests de vista llaman la view directo, no vía bus; E2E auto-espera). Cerca del pipeline de render: si se hace, medir el doble-render real con un escenario nuevo del harness antes/después (disciplina ADR 030).
- Secciones  : Transversal (`infra/render.js` + listeners `state:change` de los dominios multi-observador)
- Depende de : decidir si el beneficio (situacional, Inicio) justifica el cambio de timing. Alternativa recomendada: PERF.7 primero (ganancia medida e incondicional).
- Modelo     : Alta capacidad - Alto (si se hace)

> **Iniciativa Dirección Visual premium** ([ADR 033](DECISIONS/033-direccion-visual-premium.md), estado **Propuesta**), evolución de la identidad de color por sección ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), IV.1 e IV.2 cerradas). **Nada de esto se implementa sin la validación de Esteban:** el ADR espera 5 respuestas (sección "Preguntas abiertas P1 a P5", cada una con su recomendación escrita). Las rebanadas DV.2a-d están abajo.

#### DV.2a - Tokens de superficie/elevación + degradado de identidad (D1+D2 del ADR 033)
- Prioridad  : alta (primera rebanada de la dirección visual; DV.2b/c/d y las iniciativas v2 construyen encima)
- Área       : design
- Estado     : **no iniciar sin validación del [ADR 033](DECISIONS/033-direccion-visual-premium.md)** (P1 y P5 la afectan directo)
- Objetivo   : escala de elevación de 4 niveles: `.card`/`.bento__cell`/`.list-item` ganan sombra en reposo (`--fk-shadow-sm`), sombras de doble capa tintadas en tema claro (`themes.css`), y regla de aire entre bloques (space-6 móvil / space-8 escritorio) documentada para las v2. Variable nueva `--fk-section-color` (token crudo) en el mapeo `[data-dom]`/`[data-section]` + token `--fk-grad-identity` (degradado de identidad, 2 paradas), con piloto en los heroes existentes (Inicio, Fondo, Inversión). DESIGN_SYSTEM.md gana la sección "Elevación" y actualiza "Sombras". Verificación: capturas ambos temas, contraste medido contra la parada fuerte del degradado (método IV.1), Lighthouse 100, `pnpm perf` sin regresión.
- Secciones  : Transversal (`styles/tokens.css`, `styles/themes.css`, `styles/components/buttons.css` `.card`, `styles/layout.css` `.bento__cell` + mapeo, `styles/components/atoms.css` `.list-item`)
- Depende de : ADR 033 aprobado
- Modelo     : Equilibrado - Alto (cambio transversal de CSS con verificación de contraste y perf en cada tema)

#### DV.2b - Riqueza visual piloto: formas orgánicas + patrón (D3 del ADR 033)
- Prioridad  : media-alta
- Área       : design
- Estado     : no iniciar sin validación del ADR 033 (P2)
- Objetivo   : extensión de `scripts/sync-sprite.py` a la carpeta `assets/svg/decoracion/` (prefijo `d-*`, validación propia: no aplican las reglas de icono 24px); clase `.decor` (posición absoluta en esquinas, `aria-hidden`, `pointer-events: none`, opacidad 4-8%); 3-5 formas neutras draft (plantillas que Esteban sobrescribe en Illustrator, ADR 026) teñidas por dominio vía `currentColor`; patrón de puntos CSS tokenizado (`--fk-pattern-dots`, solo empty states/onboarding). Piloto acotado: 2 heroes + 2 empty states. Presupuesto D3/D6 del ADR (máx 1 forma por pantalla, texto nunca sobre decoración sin re-medir contraste).
- Secciones  : Transversal (sprite, `styles/components/atoms.css`, heroes piloto)
- Depende de : DV.2a (usa `--fk-section-color`)
- Modelo     : Equilibrado - Alto (pipeline + criterio visual con guardarraíles medibles)

#### DV.2c - Catálogo de movimiento con propósito (D4 del ADR 033)
- Prioridad  : media-alta
- Área       : design
- Estado     : no iniciar sin validación del ADR 033
- Objetivo   : (1) cascada acotada en listas (`cardIn` escalonado solo en los primeros 6 items, paso 35 ms); (2) resaltado de fila recién guardada vía pseudo-elemento con `--fk-dom-X-bg` desvaneciendo por `opacity` (no se anima `background-color`); (3) **retiro de `empty-orbit`/`empty-float`** (bucles infinitos, contra el veto del brief) + auditoría de `animation-iteration-count: infinite` en todo `styles/`; (4) doctrina del catálogo cerrado escrita en DESIGN_SYSTEM.md (toda animación nueva se registra ahí con su propósito). No toca celebraciones (LG.2/ADR 032) ni el cambio de tema (CFG.7). Verificación en móvil real o E2E de timing + `pnpm perf`.
- Secciones  : Transversal (`styles/base.css`, `styles/components/atoms.css`, `docs/DESIGN_SYSTEM.md`; JS solo si un helper entra a `infra/animate.js`)
- Depende de : ADR 033 aprobado; independiente de DV.2a/b
- Modelo     : Equilibrado - Alto (timing/stagger con disciplina de rendimiento)

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Área       : design
- Estado     : no iniciar sin validación del ADR 033 (P4); **bloqueada por la cola de diseño de Esteban** (los drafts de Claude entran como plantillas que él sobrescribe, principio ADR 026)
- Objetivo   : carpeta `assets/svg/ilustraciones/` (prefijo `il-*`) + spec (retícula 120, trazo del lenguaje v2 escalado, paleta limitada a tokens, ambos temas) + extensión del sync; los empty states del lote P4 (recomendado: las 6 superficies más visitadas) reemplazan el arte geométrico de `emptyArt()`. Presupuesto de sprite ≤ ~25 KB fuente por lote; Lighthouse 100 como gate.
- Secciones  : Transversal (sprite, `infra/icons.js` `emptyArt()`, empty states de las vistas del lote)
- Depende de : DV.2b (pipeline de decoración ya extendido); diseños o drafts aprobados
- Modelo     : Equilibrado - Alto (spec + integración; el diseño es de Esteban)

#### IV.4 - Iconografía dirigida post-color
- Prioridad  : decidir tras IV.2
- Área       : design (el diseño de los assets es de Esteban; Code solo integra)
- Estado     : bloqueada por revisión visual con capturas después de IV.2
- Objetivo   : si tras el despliegue del color la app aún se percibe fría/genérica, definir la spec por dominio y redibujar en lotes dirigidos (Esteban en Illustrator, pipeline ADR 026 + `sync-sprite.py`, revisión de legibilidad 16/22/48px en ambos temas). NO es un redibujo global del sprite.
- **Spec integrada por triaje 2026-07-08 (brief de Deudas, punto 13):** los iconos de **Avalancha** y **Bola de nieve** no representan el concepto de cada estrategia; rediseñarlos con metáfora clara (regla 5 del ADR 023: metáfora primero) manteniendo el lenguaje v2. Nota: `i-mountain` conserva sus picos agudos a propósito (decisión de ID.7); el problema reportado es de metáfora, no de estilo. Primer lote candidato de esta tarjeta.
- Secciones  : `assets/svg/`, sprite de `index.html`
- Depende de : IV.2 en producción + revisión visual + diseños de Esteban
- Modelo     : Equilibrado - Alto (revisión de assets contra spec; el diseño es de Esteban)

---

#### PERF.7c - Warm-up de derivaciones pesadas en idle
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : tras el primer render, un `requestIdleCallback` (con fallback `setTimeout` para navegadores sin soporte) que precaliente el bundle memoizado de Análisis y `movimientosCompletos`, para que la primera navegación a esas secciones caiga en caché en vez de pagar el cómputo frío (11-48 ms a 10k). Es el "proceso en segundo plano" que pidió Esteban, sin Web Workers (clonar el estado costaría más que estos cómputos de milisegundos).
- Secciones  : Transversal (`ui/bootstrap.js`, hooks de warm-up exportados por `analisis/view.js` y `movimientos/view.js`)
- Depende de : conviene después de 7b (así el warm-up calienta el bundle ya completo).
- Modelo     : Equilibrado - Alto

#### PERF.8 - Columna "arranque" en el harness + limpieza de CSS muerto
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (1) `pnpm perf` no mide `loadData()` (JSON.parse + migraciones + primer render), lo único que crece lineal con el estado total y no se puede memoizar bajo el ADN actual: es el muro real de largo plazo junto con la cuota. Agregar la columna "arranque" a `bench.perf.js` da el dato que el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4 exige para disparar PERF.5 (IndexedDB) con evidencia y no con intuición. (2) Borrar CSS sin referencias: `.bento__cell--glass` (con su `backdrop-filter`), `.skeleton`, `.spinner` (verificado sin uso en index.html ni JS el 2026-07-07).
- Secciones  : Transversal (`scripts/perf/bench.perf.js`, `styles/components/atoms.css`, `styles/layout.css`)
- Depende de : nada.
- Modelo     : Equilibrado - Medio

---

> **Iniciativa CAT: taxonomía de categorías + picker de icono compartido** (triaje 2026-07-08, briefs "Auditoría Gastos" y parte de "Auditoría Calendario"). Fuente única para todo lo de categorías entre secciones. **CAT.1 (taxonomía) y CAT.2 (picker) están cerradas**, con la D3 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) validada en la misma pasada; el estado y las reglas heredadas viven en [`contexto/transversal.md`](contexto/transversal.md). Quedan CAT.3 y CAT.4.

#### CAT.3 - Categorías personalizadas globales (mismo estatus que las nativas, en toda la app)
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : las categorías personalizadas valen hoy solo para Gastos; extenderlas a Gastos fijos y a TODAS las superficies con el mismo estatus que las nativas. Detalle y modelo de datos a decidir en [`contexto/transversal.md`](contexto/transversal.md).
- Secciones  : transversal
- Depende de : nada: CAT.1 (a qué sección pertenece una categoría) y CAT.2 (cómo se crea) ya cerraron. Hereda de CAT.1c la regla de retiro con edición segura (ficha)
- Modelo     : Alta capacidad - Alto (modelo de datos + propagación transversal)

#### CAT.4 - Auditoría de consistencia de formularios: orden de campos + fecha por defecto
- Prioridad  : media
- Estado     : pendiente. Los formularios ya migrados al lenguaje v2 cumplen "fecha por defecto = hoy" por diseño; la auditoría sigue vigente para los no migrados. Detalle en [`contexto/transversal.md`](contexto/transversal.md).
- Objetivo   : dos reglas transversales en una pasada por todos los formularios: orden categoría/tipo antes que descripción, y fecha por defecto = hoy en todo campo de fecha nuevo.
- Secciones  : transversal (solo views de formularios, sin lógica de negocio)
- Depende de : nada; coordinar con los reordenamientos ya previstos en Deudas v2 y MC.15d para no tocar el mismo form dos veces
- Modelo     : Equilibrado - Medio (una pasada por ~8 formularios con tests de ambas reglas)

#### EDIT.1 - Editar sin destruir: Apartados, Inversión y Me deben
- Prioridad  : media-alta
- Estado     : pendiente, patrón P3 de la auditoría. La rebanada de Metas (EDIT.1a) ya cerró y dejó el patrón validado; quedan las tres rebanadas de abajo, ninguna iniciada.
- Objetivo   : tres secciones todavía no permiten **editar** lo ya creado: corregir un nombre mal escrito, un objetivo, una fecha o una tasa obliga a **eliminar y recrear**, perdiendo en el camino el progreso, los aportes y los intereses acumulados. Es destrucción de datos como precio de una corrección tipográfica. Aplicar el mismo patrón que **EDIT.1a** ya validó para Metas (formulario reinyectado con `meta = null` para crear y con el registro existente para editar; `normalizarX(datos, existente = null)` conserva el histórico acumulado y recalcula solo lo que depende del campo editado) a Apartados, Inversión y Me deben, en una rebanada por sección. **Decisión ya tomada en EDIT.1a, válida para las tres que faltan:** se conserva el histórico tal cual (no se recalcula ni se toca), y el estado derivado (completada/vencida/lo que aplique) se recalcula contra el dato nuevo.
- Secciones  : Apartados, Inversión, Me deben
- Archivos   : `apartados/`, `inversiones/`, `personales/` (form + acciones de cada uno), patrón de referencia ahora en `metas/` (EDIT.1a) y en `compromisos` (D.15b, para Deudas)
- **Rebanada Inversión, condición añadida (ADR 053, 2026-07-25):** debe ir **después de INV.1** y, además de editar los campos, ajustar el **delta de saldo** cuando cambie el monto de una inversión que tiene `cuentaId`. Es la mitad que falta de I3 del [ADR 053](DECISIONS/053-invariante-de-patrimonio.md) (alta y baja las cubre INV.1; la edición, esta). Sin ella, corregir un monto obliga a eliminar y recrear, o sea dos movimientos de saldo que deben cancelarse exactamente.
- Depende de : nada duro. Coordina con **ARQ.1** (si las 4 bolsas comparten componente, el formulario de edición se simplifica): decidir si conviene antes de las 3 rebanadas que faltan, aunque EDIT.1a ya demostró que escribir la rebanada de un dominio no es tan costoso como se temía (Metas no comparte prácticamente nada de formulario con Apartados/Inversión/Personales, los campos difieren)
- Modelo     : Equilibrado - Alto por rebanada (patrón ya probado en D.15b y EDIT.1a; sin lógica financiera nueva salvo la decisión de progreso, ya resuelta)

#### ARQ.1 - `infra/bolsas.js`: un solo modelo para las cuatro bolsas
- Prioridad  : baja
- Estado     : pendiente de análisis. Hallazgo de la auditoría de UX/producto, patrón P7. **No es un rediseño de pantallas.** Duplicación medida y detalle en [`contexto/transversal.md`](contexto/transversal.md).
- Objetivo   : fondo de emergencia, metas, apartados e inversión son 4 implementaciones del mismo concepto (bolsa con objetivo, acumulado, progreso y aportes). Unificar la infraestructura compartida en `infra/`, sin fusionar las pantallas.
- **Añadido por el [ADR 053](DECISIONS/053-invariante-de-patrimonio.md) (2026-07-25):** el modelo unificado debe exponer explícitamente la propiedad **"descuenta saldo sí/no"** por bolsa, hoy folclore de cada dominio (Metas y Apartados siempre descuentan; el Fondo nunca, ADR 020; Inversión tras INV.1 depende del origen). Sumar un test de invariante que calcule los activos por dos caminos y compare: es el test que habría detectado H5 sin auditoría manual.
- **Añadido por DIS.18 (2026-07-28):** la fila de Inversión de la casa de Ahorro muestra un conteo ("2 inversiones") en vez de su etapa ("construyendo"), porque `momentoInversion()` vive en el dominio Inversión: importarlo rompe ADN 10 y replicarlo duplica justo lo que esta tarjeta unifica. Con el modelo en `infra/`, la fila lee la etapa sin duplicar nada. Es un consumidor concreto que antes no existía.
- Secciones  : Transversal (`infra/`), consumidores en Ahorro (casa y fondo), Metas, Apartados, Inversión
- Depende de : nada. EDIT.1a (cerrada) ya demostró que unificar después de escribir los 4 editores es viable
- Modelo     : Alta capacidad - Extra (refactor cross-dominio con red de regresión en 4 suites; el riesgo real es el redondeo distinto de `diasHastaFecha`, que hoy da resultados diferentes por sección)

#### ARQ.2 - Consolidar los cálculos duplicados que quedan
- Prioridad  : baja
- Estado     : pendiente. Hallazgo de la auditoría de UX/producto, patrón P7. Detalle de las 3 duplicaciones en [`contexto/transversal.md`](contexto/transversal.md).
- Objetivo   : consolidar 3 duplicaciones concretas (`FACTOR_MENSUAL`, el helper de "registrar pago de compromiso", totales de Agenda), sin cambio de comportamiento.
- Secciones  : Transversal (`infra/`), Compromisos, Agenda, Tesorería
- Depende de : nada; conviene **antes** de CAL.5b, que suma deudas al lote
- Modelo     : Equilibrado - Alto (refactor mecánico con tests existentes como red; sin decisiones de producto)

#### UPD.1 - Aviso de actualización disponible + novedades mostradas una sola vez
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : aviso discreto cuando el SW detecta versión nueva, con aplicación al toque; tras actualizar, resumen de novedades una única vez. Detalle en [`contexto/transversal.md`](contexto/transversal.md).
- Secciones  : Transversal (`infra/sw-register.js`, `service-worker.js`, aviso en shell)
- Depende de : nada
- Modelo     : Equilibrado - Alto (ciclo de vida del SW tiene esquinas: waiting/controllerchange/doble recarga)

---

> **Iniciativa GU.1: guía por navegación (aprender usando, no leyendo)** (6.º lote, 2026-07-08, brief General puntos 4+5). **Revisa el [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md)** (banner de propósito por sección): decirlo formalmente al iniciar, no desmontarlo en silencio. El principio ya se aplica en varios puntos (el CTA de cuenta lleva a crearla, CAL.1 ofrece distribuir al llegar el ingreso, el fondo recomienda su aporte en la distribución) y se adopta como transversal. **Regla anti-doble-trabajo:** GU.1 define el principio y audita el sistema transversal (banners, hints); los rediseños internos de cada sección viven en sus iniciativas v2, que aplican este principio en vez de duplicarlo.

#### GU.1a - Auditoría del sistema de guía + revisión del ADR 016
- Prioridad  : media
- Área       : design (auditoría de UX; puede derivar en tarjetas `code` al re-cortarse)
- Estado     : pendiente de análisis (no iniciar; conviene DESPUÉS de que las iniciativas v2 grandes definan sus pantallas, o la auditoría se hace dos veces)
- Objetivo   : inventario de banners/hints/CTAs de arranque por sección, propuesta de qué se elimina o convierte en guía contextual, revisión formal del ADR 016. Detalle en [`contexto/transversal.md`](contexto/transversal.md).
- Secciones  : Transversal (`ui/proposito.js`, empty states de todas las vistas)
- Depende de : recomendado tras IV.2 + las primeras iniciativas v2; coordina con cada una
- Modelo     : Equilibrado - Alto (auditoría de UX con criterio, sin lógica nueva)

---

> **Iniciativa LEG: Centro Legal y cumplimiento.** El paquete, su estado por documento, el checklist de datos pendientes y el gate de revisión por abogado colombiano viven en [`legal/README.md`](legal/README.md), su dueño. **Decisión de secuencia vigente: redactar para el modelo local-only actual** con cláusula de versionado, sin esperar a CFG.4; si el [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) aprueba cuentas o sync, el paquete se reescribe. La revisión del abogado es trabajo profesional externo, no una tarea de código: las tarjetas de acá producen borradores e inventario **para** esa revisión.

#### LEG.2 - Aceptación obligatoria versionada (onboarding + re-aceptación en cambios)
- Prioridad  : alta
- Estado     : pendiente. LEG.1 (Centro Legal, borradores + UI) ya está cerrada: el bloqueo real que queda es de **contenido**, no de código. Antes de pedirle al usuario que "acepte" hace falta resolver el checklist de [`legal/README.md`](legal/README.md) (su dueño) y pasar el paquete de v0.1 a v1.0. El criterio de re-aceptación ya quedó definido en `docs/legal/historial-de-cambios.md`.
- Objetivo   : primera apertura: aceptación expresa de términos + privacidad + datos personales antes de usar la app (paso nuevo del onboarding); cambios importantes de políticas: re-aceptación antes de continuar (comparar versión aceptada vs vigente). Registro local de aceptación (versión + fecha, bump de schema en `S.config`). **Limitación honesta a documentar:** sin servidor, la "evidencia" de aceptación vive solo en el dispositivo del usuario; una evidencia verificable por Finko requiere CFG.4.
- Secciones  : Onboarding, Configuración, `core/state.js`/`storage.js` (registro versionado)
- Archivos   : `modules/ui/onboarding.js`, `modules/core/state.js`, `modules/core/storage.js`
- Depende de : el checklist de `legal/README.md` resuelto y el paquete en v1.0
- Modelo     : Equilibrado - Alto (flujo de onboarding + versionado persistido + migración)

---

> **Iniciativa LG.2: Logros v2, gamificación de hábitos.** Alcance, regla anti-gaming y catálogo: **[ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md)** (Aceptada). Quedan LG.2d y LG.2e. **Sin cerrar por el ADR:** nombres de niveles de usuario provisionales hasta que Esteban entregue los definitivos; al cerrar LG.2d, marcar el [ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md) como Superada (la vitrina se muda de Ajustes). Disciplina de ADR 022 vigente: evaluadores O(1), evaluación barata por `state:change`.

#### LG.2d - Mudanza de la vitrina: "Tu progreso" en Análisis + tarjeta en Inicio
- Prioridad  : baja (bloqueada)
- Estado     : **bloqueada por ANL.1** (ADR 032 D6: no posicionar dos veces). El otro bloqueo (IN.8) ya se levantó: "Inicio v2" está completa en producción, pero su layout (ADR 034) no reservó bloque para logros, así que la tarjeta compacta de Inicio es diseño nuevo a proponer al iniciar LG.2d. La vitrina sigue en Ajustes (ADR 022 vigente) hasta que ANL.1 defina el layout de Análisis.
- Objetivo   : mover la vitrina a un apartado "Tu progreso" en Análisis y agregar la tarjeta compacta en Inicio (nivel actual + último logro + próximo objetivo, ubicación a definir dentro del bento de Inicio v2); al cerrar, marcar el ADR 022 como Superada.
- Secciones  : Análisis, Inicio, Ajustes (`logros`)
- Depende de : ANL.1 (layout de Análisis)
- Modelo     : Equilibrado - Alto (reubicación cross-sección con coordinación de layouts)

#### LG.2e - Familia comportamiento (interpretación de hábitos)
- Prioridad  : baja
- Estado     : pendiente; parcialmente bloqueada por datos
- Objetivo   : 3 logros de comportamiento (`hormiga-a-raya` implementable ya, `ahorro-creciente` bloqueado por falta de derivación de ingreso mensual, `pagador-puntual` a verificar). Detalle en [`contexto/transversal.md`](contexto/transversal.md), sección Logros.
- Secciones  : Transversal (`logros`)
- Depende de : LG.2c (usa "mes completo de registro" como guardia); `ahorro-creciente` además de ANL.1
- Modelo     : Alta capacidad - Alto (detectores de comportamiento con riesgo real de incentivos perversos)

---

#### PA.1 - Pagos y créditos automáticos (débito automático simulado)
- Prioridad  : media-alta (caso muy común: suscripciones y cuotas con débito automático)
- Estado     : **no iniciar**: las 2 decisiones de filosofía siguen sin tomar. Ver **[ADR 052](DECISIONS/052-pagos-automaticos.md)** (Abierta), su dueño. La secuencia "lote manual primero" ya se cumplió (CAL.5a cerrada); esta tarjeta sigue viva, no absorbida.
- Objetivo   : pregunta opcional "¿este pago se descuenta automáticamente?" al registrar un gasto fijo, deuda o suscripción, y su procesamiento al llegar la fecha. Cubre también el crédito automático del ingreso fijo: un solo criterio, no dos.
- Secciones  : Deudas, Calendario (fijos), Mis cuentas, Inicio (alertas), transversal
- Riesgo     : registrar un movimiento que el usuario no confirmó rompe la filosofía "Finko refleja la realidad, no la inventa" si el débito real falla o se difiere (ADR 052 D2)
- Depende de : motor de vencimientos (ADR 041, no construir un segundo); ADR 052 resuelto y aprobado por Esteban
- Modelo     : Máxima capacidad - Alto para el ADR (filosofía de producto con riesgo de confianza del usuario); implementación por rebanadas después

---

> **Diferido del [ADR 040](DECISIONS/040-navegacion-v2-visual.md):** badges de notificación en el nav. Es decisión de producto de Esteban (¿qué cuenta el badge?); al retomarse nace como tarjeta nueva.

---

## Secciones sin tarjetas pendientes

Se listan solo para que una idea nueva de estas secciones no vuelva a generar una tarjeta duplicada: su fuente única ya está decidida.

| Sección | Dónde vive su trabajo futuro |
|---|---|
| Inicio | Iniciativa "Inicio v2" completa ([ADR 034](DECISIONS/034-inicio-v2.md)). Las recomendaciones anticipadas de "Próximas prioridades" son el punto 4 de **LIM.1** y del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) |
| Gastos | Iniciativa "Gastos v2" completa ([ADR 039](DECISIONS/039-gastos-v2-visual.md)), con 3 decisiones diferidas anotadas en el ADR: FAB, búsqueda en el header y comparación tangible del insight hormiga. La taxonomía de categorías ya cerró (**CAT.1**, [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)); lo que queda de categorías es **CAT.3** (personalizadas globales) y el motor de sugerencia por categoría, la fusión LIM.1 / ANL.1 / ADR 029 |
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. Los huecos que quedan son **MC.17f** (deshacer transferencia) y **EDIT.1** (editar donde el dominio dueño todavía no sabe) |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. Su "editar sin destruir" es una rebanada de **EDIT.1**; su infraestructura compartida, **ARQ.1** |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). Lo único pendiente es **IV.4** |

---
## Mantenimiento

#### DOC.1 - Reorganización documental, fases 3 a 5
- Prioridad  : media
- Estado     : Fases 1, 2 y 3 cerradas. Fase 4 en curso (Paso 4 de la migración del tablero, en progreso). El plan completo por fases vive en [`MIGRACION.md`](MIGRACION.md) sección 7, que se borra al cerrar la Fase 5.
- Objetivo   : bajar el arranque de una tarea de ~69.400 a ~21.000 tokens sin perder información, moviendo cada bloque a su dueño documental.
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
- Modelo     : Ligero

#### E.3 - Verificar GMF y otras tasas si hay reforma tributaria
- Prioridad  : baja
- Estado     : pendiente (ad-hoc, solo si hay reforma)
- Objetivo   : revisar si una reforma tributaria cambia el GMF (4x1000) u otras constantes.
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : que ocurra una reforma
- Modelo     : Ligero

_(Nota de mantenimiento anual: junto con E.2, cada enero agregar también la entrada del año en `IPC_OBSERVADO_POR_ANIO` con el cierre del DANE, ver E.5 en el CHANGELOG de 2026-07.)_
