# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-07-12 (IN.8a e IN.8b cerradas, ver CHANGELOG; sigue IN.8c).

---

## En proceso

_(**Iniciativa Inicio v2 en implementación** (una rebanada a la vez, regla de oro de `/CLAUDE.md` sección 2.1). **IN.8a e IN.8b cerradas el 2026-07-12** (reorden + labels de grupo + aire; hero protagonista con ojo estable y piloto visual, ver CHANGELOG); la siguiente rebanada es **IN.8c** (detalle por cuenta expandible). El [ADR 033](DECISIONS/033-direccion-visual-premium.md) sigue en "Propuesta con estreno parcial autorizado" (D1/D2 acotados a Inicio); **DV.2a** (despliegue global) sigue bloqueada hasta la validación completa de P1-P5. **MC.15a cerrada el 2026-07-11**; quedan MC.15b/c/d.)_

---

## Cómo usar este tablero

1. Elegir **una** tarjeta de "Pendientes" (o del backlog del usuario si hay una nueva).
2. Abrir la ficha de su sección en [`contexto/`](contexto/README.md): si el bloque de la funcionalidad existe y está vigente, trabajar desde ahí sin re-explorar el proyecto; si no existe, el primer paso de la tarea es el análisis profundo + escribir el bloque (`/CLAUDE.md` sección 2.6).
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
- Modelo     : combinación sugerida (ver `/CLAUDE.md` sección 2.3)
```

Reglas de las tarjetas (`/CLAUDE.md` secciones 2.1 y 2.7):

- **Sin duplicados:** antes de crear una tarjeta, buscar otras sobre la misma funcionalidad, sección o componente; si comparten objetivo o tocan la misma parte del sistema, consolidarlas en una sola (la más completa absorbe a las demás).
- **Dividir lo grande:** una tarjeta que toque varios dominios o varias capas (lógica, vista, estilos, datos, accesibilidad, tests) se parte en subtareas verificables de forma independiente (sufijos `a`/`b` o slices), encadenadas con "Depende de".
- **Triaje antes de ejecutar (2.7):** toda tarea nueva del usuario pasa primero por triaje contra este tablero, los ADRs y las fichas de contexto (¿existe parcial?, ¿modifica algo aprobado?, ¿se integra a una iniciativa?, ¿depende de algo?, ¿se difiere?). La tarjeta "En proceso" no se abandona por ideas nuevas; cada funcionalidad tiene UNA sola entrada canónica (tarjeta o iniciativa) y las mejoras relacionadas se integran ahí.

---

## Pendientes por sección

### Inicio (dashboard)

> Iniciativa "Inicio como centro de control" ([ADR 028](DECISIONS/028-inicio-centro-de-control.md), aprobada el 2026-07-05): IN.6a, CAL.1, TX.8a, TX.8b e IN.4a cerradas. **Superada parcialmente por la iniciativa "Inicio v2" de abajo** (triaje del 2026-07-08): el principio "rol único por bloque" sigue vigente; el orden vertical y varias decisiones puntuales entran en revisión formal.

> **Iniciativa "Inicio v2"** (brief de Esteban del 2026-07-08 + diseño hifi entregado el 2026-07-12). **Fase de análisis/ADR cerrada el 2026-07-12:** la revisión formal del ADR 028 quedó escrita y aceptada en el **[ADR 034](DECISIONS/034-inicio-v2.md)** (orden nuevo con alertas primero, hero centrado con ojo estable y detalle por cuenta expandible colapsado por defecto, Pendientes del mes sin línea roja + "Gestionar" → Calendario, resumen semanal visual con serie diaria nueva, fusión accesos+actividad como último bloque, avatar de iniciales sin foto). Consume el ADR 033 D1/D2 como **piloto acotado a Inicio** (estreno parcial autorizado; el despliegue global sigue siendo DV.2a). El bundle de diseño (mockup interactivo + decisiones) vive en `Iteración de specimen/design_handoff_inicio_v2/`. Absorbió IN.6b (resuelta: iniciales, set ilustrado opcional a futuro) e IN.4b (sigue pospuesta: se decide tras convivir con el bloque fusionado). **No incluye** (fuentes únicas externas): copy de alertas de límites → LIM.1 (el panel `#panel-limites` se conserva dentro de "Atención hoy" sin rediseño). Implementación por las rebanadas de abajo: cada una se verifica en la app, commitea, pushea y bumpea el SW por separado.

#### IN.8c - Inicio v2: detalle por cuenta expandible con máscara de privacidad
- Prioridad  : alta
- Estado     : pendiente (siguiente rebanada recomendada de la iniciativa)
- Objetivo   : ADR 034 D4: pill "Ver detalle por cuenta" ↔ "Ocultar detalle" bajo el monto; al expandir, una fila por cuenta (teja de banco + nombre + saldo, efectivo incluido); la máscara del ojo cubre total Y detalle (extensión IN.2); "efectivo + N cuentas" solo colapsado; estado de UI en memoria (no persistido, decisión del ADR); fade/slide 150-200 ms solo `opacity`+`transform`.
- Secciones  : Inicio
- Archivos   : `index.html`, `modules/infra/render.js` (`updSaldo()` + render del detalle), acción `data-action` nueva, `modules/infra/bancos.js` (solo consumo de tejas), styles, tests unitarios
- Depende de : nada (IN.8b cerró el 2026-07-12)
- Modelo     : Sonnet 5 - Alto

#### IN.8d - Inicio v2: header de perfil (avatar de iniciales + saludo en dos líneas + ajustes)
- Prioridad  : media-alta
- Estado     : pendiente
- Objetivo   : ADR 034 D8: teja de iniciales 46px con gradiente del acento (patrón de tejas ADR 025); `updSaludo()` reubicado en dos líneas (franja horaria 13px arriba, nombre 19px/700 abajo, misma lógica de franjas); botón de ajustes 40px → `#config`; resolver el encabezado accesible de la sección sin perder la región para lectores de pantalla (`#title-dash`); definir fallback del avatar cuando no hay nombre (sin dato nuevo).
- Secciones  : Inicio
- Archivos   : `index.html` (header de `#sec-dash`), `modules/infra/render.js` (`updSaludo()`), styles
- Depende de : nada (IN.8a cerró el 2026-07-12)
- Modelo     : Sonnet 5 - Medio

#### IN.8e - Inicio v2: Pendientes del mes con jerarquía real + Gestionar → Calendario
- Prioridad  : alta
- Estado     : pendiente
- Objetivo   : ADR 034 D5: quitar el `border-left` rojo; jerarquía por teja de dominio + badge de tipo (`.dom-badge` de IV.2c) + estado temporal en color semántico solo en el texto ("Venció hace 2 días" danger suavizado, "Vence hoy" warning; el color nunca tiñe la tarjeta completa, ADR 019); monto 15px/700 tabular; contador en badge circular rojo suave en el header; **"Gestionar" pasa de `#compromisos` a `#agenda`** (ampliación 3.er lote; el mockup no dibuja el botón pero la función se conserva); "Próxima prioridad" como tarjeta única destacada cuando son pocas.
- Secciones  : Inicio (render en dominio `compromisos`)
- Archivos   : `modules/dominio/compromisos/views/dashboard.js` (`renderPanelVencidos()`, `renderPanelPrioridades()`), `styles/components/domain.css` (`vencidos-card*`, `prioridades-card*`), tests unitarios
- Depende de : nada (IN.8a cerró el 2026-07-12)
- Modelo     : Sonnet 5 - Alto

#### IN.8f - Inicio v2: resumen semanal visual (serie diaria + barras + chip comparativo)
- Prioridad  : alta
- Estado     : pendiente
- Objetivo   : ADR 034 D6: extender `resumenSemanal()` con la serie diaria de 7 totales (verificado 2026-07-12: hoy solo expone agregados; cálculo puro dentro del mismo bundle memoizado de PERF.2/7b, sin memo nueva); rediseñar `renderPanelResumen()`: monto 28px/800 + chip comparativo (verde si el gasto bajó, neutro/ámbar si subió, nunca rojo: ADR 019/IV.3) + barras de 7 días estáticas (pico al 100% de `--fk-accent`, resto ~28%) + fila de categoría top con teja, días activos y mensaje interpretativo.
- Secciones  : Inicio (dominio `resumen`)
- Archivos   : `modules/dominio/resumen/logic.js` (`resumenSemanal()` + serie diaria), `modules/dominio/resumen/view.js` (`renderPanelResumen()`), styles, tests unitarios
- Depende de : nada (IN.8a cerró el 2026-07-12)
- Modelo     : Sonnet 5 - Alto

#### IN.8g - Inicio v2: fusión accesos rápidos + actividad reciente
- Prioridad  : media-alta
- Estado     : pendiente
- Objetivo   : ADR 034 D7: un solo `bento__cell` al final de la pantalla con dos secciones separadas por `border-top`: accesos arriba (label + "Personalizar" + grilla de 4 columnas, `accesosVisibles()` intacta) y actividad abajo (label + "Ver todo" + 5 movimientos, `movimientosRecientes()` intacta). Solo cambia contenedor/posición; cero cambios en los `logic.js` de ambos dominios.
- Secciones  : Inicio (dominios `accesos` y `movimientos`, solo vista)
- Archivos   : `index.html`, `modules/dominio/accesos/view.js`, `modules/dominio/movimientos/view.js`, styles
- Depende de : nada (IN.8a cerró el 2026-07-12)
- Modelo     : Sonnet 5 - Medio

_(**IN.7 cerrada** el 2026-07-05: la duplicación puntual que reportó el usuario, un compromiso que vence hoy apareciendo a la vez en "Pendientes del mes" y en "Próximas prioridades", está resuelta, ver CHANGELOG. Queda pendiente, sin tarjeta propia porque ya vive dentro de **LIM.1** y del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) (que absorbió TX.10; CAL.1 ya cerró su parte), la parte más grande de la idea original: reservar "Próximas prioridades" para recomendaciones anticipadas (distribuir ingreso, crear límite, aportar a fondo/meta, gasto hormiga) en vez de solo vencimientos cercanos.)_

---

### Calendario (dominio `agenda`)

_(Triaje 2026-07-08, brief "Auditoría UX/UI Calendario": sus tres partes ya tienen fuente única y NO generan tarjeta propia aquí. (1) Color de sección en las tarjetas de evento con tinte de baja opacidad (Esteban pide 5-10%; el sistema usa 12% en `-bg`, calibrar en implementación con contraste medido) → vive en **IV.2c**. (2) Logos oficiales de marcas en eventos (Netflix, Nequi...) → ya existe la base (MK.2 detecta marca en fijos/suscripciones/deudas, `tejaMarca` en el detalle del día) y su evolución "seleccionar en vez de escribir" es el **[ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md)**. (3) Picker de icono en "Otra categoría" de fijos + categorías personalizadas reutilizables en toda la app → iniciativa **CAT** en Transversal, que absorbió la observación que vivía aquí sobre ícono personalizado para la categoría "Otro" de AG.4.)_

_(**CAL.1 cerrada** el 2026-07-05: nudge de distribución del ingreso en Inicio, ver CHANGELOG. **CAL.2 cerrada** el 2026-07-06: leyenda del calendario dinámica, ver CHANGELOG y [`contexto/calendario.md`](contexto/calendario.md), primera ficha de esta sección. **CAL.3 cerrada** el 2026-07-10: selección automática del día actual al navegar hacia Calendario + mensaje explícito al seleccionar un día vacío, ver CHANGELOG y [`contexto/calendario.md`](contexto/calendario.md).)_

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2: centro de administración del dinero"** (briefs de Esteban del 2026-07-08: el primero de 21 puntos + la integración del ingreso fijo con cuenta de destino, sumados al brief de distribución del lote anterior). Fuente única de la sección. Se organiza en 3 tarjetas: **MC.13** (Distribución v2, ampliada abajo), **MC.15** (UI de cuentas e ingresos) y **MC.16** (tarjeta de crédito integrada, requiere ADR). **MC.14 cerrada el 2026-07-11** (datos de transferencia por cuenta, ver CHANGELOG y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md)): fue la rebanada independiente que ya podía ejecutarse sin esperar el resto de la iniciativa. **Dos conflictos con decisiones aprobadas, señalados explícitamente (regla 2.7):** (a) el punto "los ingresos esporádicos NO deben ofrecer distribución" **revierte parcialmente NAV.A2b slice 2 del ADR 024** (que hoy ofrece distribuir tras un ingreso puntual): decidirlo formalmente al iniciar MC.13, no revertirlo en silencio; (b) "el dinero del ingreso fijo se abona automáticamente a la cuenta en la fecha de pago" es un **movimiento automático sin confirmación**, exactamente el problema de filosofía de PA.1: se decide en el MISMO ADR de pagos automáticos (un solo criterio para débitos y créditos automáticos), no por separado.

#### MC.13 - Distribución v2: contextual por fecha, guiada y con origen real del dinero
- Prioridad  : alta
- Estado     : pendiente de análisis (no iniciar sin diseñar primero el motor de vencimientos compartido, ver abajo)
- Objetivo   : el asistente "Distribuir mi ingreso" (épica MC.7, cerrada) hoy muestra TODAS las necesidades/ahorros/obligaciones registradas; con muchos registros satura. Nueva lógica: al recibir un ingreso, Finko analiza la fecha del ingreso, la frecuencia de ingresos del usuario, las obligaciones vencidas, las que vencen en la ventana de ese ingreso y los aportes de ahorro (fondo/metas/apartados/inversión) programados para esa fecha, y solo sugiere lo que corresponde pagar/apartar en ese momento. Responde "¿qué debo hacer HOY con este dinero?", no "todo lo del mes". Reutilizar la lógica existente de recordatorio de día de ingreso (ADR 021, AP.4/MT.2/AH.4) para "qué toca aportar hoy".
- **Ampliación del brief 2026-07-08 (21 puntos + ingreso fijo→cuenta):** (9) rediseño en 2 pasos: primero recomendaciones visuales de cómo distribuyen los expertos (educación financiera con barras/gráficos/porcentajes; candidato a logro por distribución saludable sostenida), después la distribución personalizada por prioridad; (10) cada recomendación aparece SOLO en el paso de su categoría, no todas juntas al inicio; (11) quitar los accesos "Ver progreso del fondo / estrategias / límites" del asistente; (12) el aviso "recibiste tu ingreso" y el asistente son dos bloques visualmente independientes; (13) revisar el texto "Reparte hacia tus necesidades..."; (14) si el ingreso no alcanza, ofrecer completar con saldo disponible de otras cuentas (detección automática + pregunta explícita); (15) en cada fila de la distribución: logo de entidad o icono personalizado + nombre + nota (diferenciar dos "Arriendo" por icono/nota); (16) quitar "Abonar extra a deudas" del paso de ahorro (un abono es un pago, vive en Deudas); (17) navegación Atrás/Siguiente modernizada (coherente con IV); (18) el dinero restante exige decisión explícita (dejarlo en la cuenta, ahorro, meta) antes de finalizar; (21) metas/fondo/apartados muestran la **cuota del período** según la frecuencia del ingreso, no el objetivo total; **(integración ingreso fijo)** el ingreso fijo registra en qué cuenta se recibe, el asistente parte de esa cuenta, los pagos aprobados se descuentan de ahí, y el paso final "Estilo de vida" desaparece: lo no distribuido simplemente se queda en la cuenta (refleja la realidad; revisa el cierre del asistente MC.7e); **(7+19)** separación clara ingreso fijo (periódico, dispara distribución) vs ingreso esporádico (solo acredita y registra, SIN ofrecer distribución: conflicto (a) del bloque de arriba).
- **Absorbe MC.7g** (fijos Quincenal/Semanal/Diario en la checklist de Necesidades): modelar ocurrencias dentro del periodo es EL MISMO problema, y ambos se resuelven con la pieza compartida.
- **Pieza de infraestructura compartida (regla de arquitecto 2.7):** un "motor de vencimientos y aportes recomendados" (qué obligaciones y aportes corresponden a una fecha/ventana dada, y cuánto tocaría aportar según frecuencia real de ingresos) que consuman: este asistente, la checklist de Necesidades (ex MC.7g), los pagos automáticos (PA.1, Transversal), la cuota por período del punto 21, el **plan de aportes de Metas v2** (MT.6, 4.º lote), el **prellenado del botón Aportar de Apartados** (AP.5, 4.º lote; patrón que AH.2 ya cerró para el fondo) y el **aporte del fondo de emergencia en la distribución** (AH.5, 5.º lote; AH.2 ya calcula el valor). `eventosDelMes` de Agenda ya resuelve la mitad (ocurrencias por frecuencia): evaluar extraerlo/generalizarlo a `infra/` en vez de construir motores paralelos (mismo criterio que la fusión TX.10/LIM.1/ANL.1).
- Secciones  : Mis cuentas (`tesoreria/logic/distribucion.js`, `ingresos.js`), transversal por el motor
- Depende de : diseño del motor de vencimientos (primera rebanada de esta misma tarjeta); coordinar con PA.1 (conflicto (b)); decisión del conflicto (a) sobre NAV.A2b
- Modelo     : Opus 4.8 - Extra para el análisis/re-corte (redefine el asistente completo + decisión que toca ADR 024); rebanadas después con el modelo que corresponda

> **MC.15 - UI de cuentas e ingresos: menos redundancia, logos legibles, avisos útiles** (re-cortada en rebanadas verificables, regla 2.1: tocaba texto duplicado, CSS de logos, un aviso nuevo y orden de formulario, cuatro concerns independientes). **MC.15a cerrada el 2026-07-11** (puntos 1+20: sin subtítulo redundante en la tarjeta de cuenta ni en la de ingreso fijo, ver CHANGELOG y [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md)). Quedan MC.15b, MC.15c y MC.15d abajo.

#### MC.15b - Legibilidad de logos en la tarjeta de cuenta (solo contenedor)
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (2) revisar legibilidad de los logos de Davivienda, BBVA, DaviPlata y Nubank en la teja de la lista de cuentas, ajustando SOLO el contenedor (tamaño óptico, espacio interno, márgenes): la regla de fidelidad del ADR 026/027 prohíbe tocar los SVG oficiales. Requiere capturas en ambos temas antes/después (el preview local de este entorno no siempre carga; usar E2E + captura en Chromium real cuando el navegador esté disponible).
- Secciones  : Mis cuentas
- Archivos   : `styles/components/*.css` (`.bank-avatar` y clases relacionadas), `modules/infra/bancos.js` (`bancoAvatar`, solo si el contenedor necesita una clase nueva, sin tocar los `<symbol>` del sprite)
- Depende de : nada
- Modelo     : Sonnet 5 - Bajo (CSS aislado con verificación visual)

#### MC.15c - Aviso al crear cuenta: ¿seguro que no cobra costos periódicos?
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (4) al crear una cuenta sin marcar "cobra cuota de manejo mensual", mostrar un hint breve invitando a confirmar ("¿Seguro que esta cuenta no cobra cuota de manejo, seguros u otros costos periódicos?"), conectando con el `cuotaManejo` ya existente (v5): no bloquea el guardado, solo reduce el olvido de un costo recurrente real.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/cuentas.js` (`renderFormCuenta()`), posible wiring en `acciones/cuentas.js` si el hint reacciona al toggle
- Depende de : nada
- Modelo     : Sonnet 5 - Bajo

#### MC.15d - Orden categoría→descripción en el formulario de ingreso puntual
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : (8) `renderFormIngreso()` (ingresos fijos) ya cumple el orden categoría→descripción; `renderFormIngresoPuntual()` no (hoy: monto → cuenta → descripción → categoría → fecha). Reordenar para que categoría preceda a descripción, coordinando con la auditoría transversal **CAT.4** (mismo criterio, no dos pasadas del mismo formulario).
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/views/ingresos.js` (`renderFormIngresoPuntual()`)
- Depende de : nada técnico; coordinar con CAT.4 para no tocar el mismo form dos veces
- Modelo     : Sonnet 5 - Bajo

#### MC.16 - Tarjeta de crédito como producto integrado (cuentas ↔ deudas) [requiere ADR]
- Prioridad  : alta (concepto nuevo de dominio)
- Estado     : pendiente de análisis, **requiere ADR** (no iniciar)
- Objetivo   : ampliar los tipos de cuenta (ahorros, corriente, tarjeta débito, **tarjeta crédito**, billetera digital, efectivo, otro) y modelar la tarjeta de crédito como lo que es: no es dinero disponible, es cupo+deuda. Al pagar con ella, preguntar "¿a cuántas cuotas?", crear automáticamente la deuda con su tasa registrada, calcular cuotas, actualizar calendario/análisis/pendientes; el pago anticipado recalcula cuotas restantes. Incluye los nudges educativos de costos bancarios (avances en efectivo, retiros en otras redes, pago mínimo: intervenir solo cuando previene un mal hábito, punto 5 del brief). **Cuidados del ADR:** el tipo de cuenta 'Inversión' se ELIMINÓ en la migración v11 justamente para separar dominios: reintroducir un tipo que cruza dominios (cuenta que genera deudas) necesita diseño explícito, no un valor más en el catálogo. **Desbloquea CFG.2a/K.3:** con TC modelada, `consumosTC` del monitor de renta deja de ser dato manual. **Comparte modelo de datos** con el nivel "producto por entidad" del brief de Deudas (Visa Platinum del Banco de Bogotá): decidir juntos en la validación D3 del ADR 029.
- Secciones  : Mis cuentas, Deudas, Calendario, Análisis (transversal vía EventBus, ADN 10)
- Depende de : ADR propio; coordinar con ADR 029 D3 y con la iniciativa Deudas v2
- Modelo     : Fable 5 - Alto para el ADR (concepto de dominio nuevo multidominio); implementación por rebanadas

#### MC.17 - Transferencias entre cuentas propias (con historial y automatización)
- Prioridad  : alta (hoy mover dinero entre cuentas exige editar dos saldos a mano: propenso a error y sin rastro)
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : (6.º lote, brief General puntos 6-8) función "Transferir dinero": origen, destino, monto, nota opcional; ambas cuentas se actualizan solas. **Automatización por conteo de cuentas** (extensión natural de la regla de cuenta única 0/1/varias): con exactamente 2 cuentas activas se pregunta solo dirección y monto (o solo monto si el origen es evidente por contexto); con 3 o más, selector completo. **Historial:** cada transferencia queda registrada (fecha, origen, destino, monto, nota) y aparece en Movimientos como tipo propio "transferencia", **sin contar jamás como ingreso ni gasto** (es traslado interno): requiere colección/tipo nuevo en el schema (bump + migración) y sumar la fuente al ledger derivado de `movimientos/logic.js`. **Detalle financiero CO para el análisis:** las cuentas ya modelan `aplica4x1000`; decidir si la transferencia ofrece registrar el GMF del retiro cuando la cuenta origen no está exenta (costo real que hoy se perdería), sin complicar el flujo simple.
- Secciones  : Mis cuentas (`tesoreria`), Movimientos (ledger), transversal por schema
- Archivos   : `tesoreria` (acción + form), `modules/core/state.js`/`storage.js` (colección nueva), `modules/dominio/movimientos/logic.js` (fuente nueva), hoja "Registrar" (candidata a tile nuevo)
- Depende de : nada duro; coordinar el tile de "Registrar" con la iniciativa Inicio v2 si coinciden en el tiempo
- Modelo     : Opus 4.8 - Alto (schema + ledger + decisión GMF; la UI después puede bajar a Sonnet)

---

### Gastos (dominio `gastos`)

_(**TX.8b cerrada** el 2026-07-05: vista completa de Movimientos en ruta propia + Gastos deja de listar categorías internas, ver CHANGELOG. Cierra la iniciativa TX.8 completa.)_

_(**TX.9 completa** el 2026-07-05: TX.9a (categoría primero + descripción deja de ser obligatoria) y TX.9b (categorías personalizadas), ver CHANGELOG y [`contexto/gastos.md`](contexto/gastos.md).)_

_(Triaje 2026-07-08, brief "Auditoría UX/UI Gastos": vive completo en la iniciativa **CAT** de Transversal (taxonomía Gastos↔Gastos fijos, categorías contextuales, deduplicación entre secciones, y el rediseño del picker de icono de "Otra categoría" que hoy llena la pantalla con el grid de TX.9b). No genera tarjeta en esta sección para no duplicar la fuente única.)_

_(**TX.10 absorbida** el 2026-07-08 por el [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) "Catálogo de marcas por categoría", que lo declara explícitamente en su encabezado: la pieza de infraestructura de datos que TX.10 pedía (categoría como eje del que Finko deriva automatizaciones: límites, hormiga/fantasma, recomendaciones) es la fundación de ese ADR. El ADR 029 sigue en estado **Propuesta**, pendiente de que Esteban valide la taxonomía de su sección D3: nada de esto se inicia sin esa validación. El solape con **LIM.1** (recomendaciones de límite por categoría) y **ANL.1** (recomendaciones accionables en Análisis) que la tarjeta original documentaba se conserva como regla: al iniciar cualquiera de las tres, diseñar UN solo motor de "sugerencia por categoría" compartido, nunca tres. Fusión hecha bajo la regla 2.7 de CLAUDE.md, primer caso aplicado.)_

---

### Deudas (dominio `compromisos`, deuda)

_(Verificación del triaje 2026-07-08: la mitad del brief "pagos de deuda descuentan de la cuenta" **ya existe** desde el ADR 002 y la regla de cuenta única: el abono pide cuenta de origen, descuenta el saldo, sincroniza `saldoTotal` del compromiso y registra el gasto-abono en el historial. No genera tarjeta; si Esteban detecta un caso donde NO ocurra, es un bug para BUGS.md, no una feature.)_

> **Iniciativa "Deudas v2: de registro a asesor"** (brief de Esteban del 2026-07-08, 15 puntos). Fuente única de todo lo de esta sección. Alcance que absorbe: (1) alerta "tu plan no se sostiene" en rojo solo en el encabezado, panel interior en neutros y el beneficio de cada solución en positivo (aplica la arquitectura de 2 capas del ADR 031: la alarma señala, la solución calma); (2+3) intro breve a las 3 estrategias + **Finko recomienda la principal según la situación** (capacidad según ingresos → aumentar cuota; sin capacidad → renegociar; varias deudas costosas → consolidar), con pesos visuales distintos, no 3 botones iguales; (4+6) copy motivador y explicativo en simulaciones, Avalancha y Bola de nieve (qué beneficio, cuándo conviene, qué impacto), tono ADR 003/008; (5) simulaciones libres y comparables que NUNCA se aplican sin "Aplicar estrategia" (**BUG-011 corregido el 2026-07-11**, ver CHANGELOG: la card ya no presenta la simulación como aplicada y la ficha [`contexto/deudas.md`](contexto/deudas.md) documenta la regla "el estado UI simulado nunca decide estructura"; a esta iniciativa le queda solo la capa de copy/UX de las simulaciones); (7) menos texto en el registro (quitar los hints de bajo valor tipo "si es una tienda que te fía..."), conservando y dando protagonismo a los que sí ayudan como el de tasa desconocida de D.12 (punto 15 del brief); (8) formulario reordenado: tipo de deuda primero, entidad/persona después; (9) copy de refuerzo psicológico en Abonar; (10) **editar deuda** (hoy solo se elimina: cuota, fecha, tasa, entidad, notas; candidata a rebanada temprana por valor/tamaño); (11) tarjeta de deuda con jerarquía visual (con quién, cuánto, cuándo, cuota, tipo, estado de un vistazo; coordina con IV.2); (12) botón "Aplicar" en el simulador de pago extra de Avalancha/Bola de nieve (convierte la simulación en cuota nueva sin editar a mano). **No incluye** (fuentes únicas externas): iconos nuevos de Avalancha/Bola de nieve → IV.4 (spec añadida); "Otro" con icono+nombre personalizado en el form → CAT.2/CAT.3; catálogo entidad → producto (Visa Platinum, etc.) con logos y automatizaciones → validación D3 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md), que este brief amplía con el nivel "producto" y que comparte modelo de datos con MC.16 (tarjeta de crédito). **D.14 cerrada el 2026-07-10** (acreditar la cuenta de origen al crear una deuda, ver CHANGELOG y [`contexto/deudas.md`](contexto/deudas.md)): fue la primera rebanada ya triada de esta iniciativa.

#### D.15 - Deudas v2: análisis + re-corte en rebanadas (primera fase de la iniciativa)
- Prioridad  : alta
- Estado     : pendiente de análisis. Su bloqueo por IV.2 quedó levantado (IV.2 completa el 2026-07-10): ya puede iniciarse.
- Objetivo   : análisis de la sección (ficha `contexto/` correspondiente) + diseño del motor de recomendación de estrategia (punto 3: reglas de capacidad según ingresos; lógica financiera CO) + re-corte del alcance de la iniciativa en rebanadas verificables (D.15a copy/alerta, D.15b editar deuda, D.15c tarjetas, D.15d recomendación inteligente, D.15e aplicar pago extra...), cada una con su verificación en la app.
- Secciones  : Deudas (`compromisos`), Análisis (lee capacidad de ingresos vía datos, no imports, ADN 10)
- Depende de : nada (IV.2 cerró el 2026-07-10; BUG-011 se corrigió aparte el 2026-07-11)
- Modelo     : Opus 4.8 - Alto (lógica financiera de recomendación + UX; sube a Fable 5 - Alto si el motor de recomendación resulta multidominio)

---

### Apartados (dominio `apartados`)

> **Iniciativa "Apartados v2: colchón para gastos esporádicos"** (brief de Esteban del 2026-07-08, 6 puntos). Filosofía redefinida por Esteban: Apartados NO es "ahorrar para objetivos grandes" (eso es Metas), es preparar los gastos esporádicos que se olvidan presupuestar (SOAT, regalos, Navidad, veterinario, mantenimientos, impuestos...) para que al llegar la fecha el dinero ya esté reservado. **Derivados a fuentes únicas:** las categorías que realmente son Metas (Vacaciones, Semestre, Computador, Viajes) → **CAT.1 ampliada** (la taxonomía Apartados↔Metas es la misma clase de decisión que Gastos↔Fijos, una sola pasada); el picker de icono (hoy depende del selector de emojis del SO, Win+.) → **CAT.2** (consumidor n.º 5; nota: el `icono` de apartados hoy es emoji como dato del usuario, exento de TX.4, y pasaría a símbolo del sprite: decidir la migración en CAT.3); "Otro" con nombre+icono → **CAT.3**.

#### AP.5 - Apartados v2: formulario consistente, recurrencia como toggle, aporte sugerido
- Prioridad  : media
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : (1) el form de nuevo apartado adopta el patrón estándar (dropdown "Seleccionar categoría..." que autocompleta, en vez de la parrilla de categorías visibles a la vez); (4) la pregunta "¿este gasto se repite?" sale del registro inicial y pasa a ser un **toggle "Recurrente"** en el apartado ya creado (activa/desactiva la recurrencia v14 existente; el form inicial queda más simple); (6) al pulsar **Aportar**, prellenar el monto sugerido calculado con objetivo + fecha límite + frecuencia de ingresos del usuario (editable siempre; consume el motor de aportes/vencimientos de MC.13, mismo patrón que AH.2 ya cerró para el fondo). La regla general de Esteban ("todo aporte/abono/distribución sugiere un valor calculado") queda como principio del motor, no de esta tarjeta.
- Secciones  : Apartados
- Archivos   : `modules/dominio/apartados/` (form, view, logic), motor compartido en MC.13
- Depende de : CAT.1 (categorías nuevas de la filosofía redefinida) para el catálogo; el prellenado depende del motor de MC.13; el toggle y el form pueden ir antes
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
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : (2) rediseño de la experiencia de la sección: comunicar de inmediato qué es el fondo, por qué importa, cuándo usarlo y cómo protege (tranquilidad/seguridad/prevención, no solo números), aplicando el sistema visual vigente (jerarquía, tokens del ADR 031, Finko Icons v2, lenguaje ADR 003, accesibilidad). (3) El flujo de aporte principal pasa a ser la distribución del ingreso (el valor calculado por AH.2 aparece sugerido ahí vía el motor de MC.13); el bloque "Aportes al fondo → Registrar" de la sección **no se elimina del todo**: se conserva como vía secundaria para aportes fuera de ciclo (ej. apartar parte de un ingreso esporádico), decidir su peso visual en el análisis. Configuración del fondo con las preguntas necesarias en la creación/edición (meta en meses, compromiso por período según frecuencia real de ingresos).
- Secciones  : Ahorro (fondo), transversal por el motor de MC.13
- Archivos   : `modules/dominio/ahorro/` (view, logic con AH.2 ya hecho), motor compartido en MC.13
- Depende de : el punto 3 depende del motor de MC.13; el rediseño (2) conviene tras IV.2 (BUG-012 ya se corrigió el 2026-07-11, aparte)
- Modelo     : Sonnet 5 - Alto (rediseño de una sección con lógica ya existente; re-cortar en rebanadas al iniciar)

---

### Inversión (dominio `inversiones`)

_(sin pendientes activos.)_

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

#### LIM.1 - Límites v2: asistente preventivo de estilo de vida (iniciativa, fusión de 2 briefs)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar). **El brief del 5.º lote (2026-07-08) se FUSIONÓ aquí** (regla 2.7: la tarjeta más completa absorbe): sus puntos 2, 3, 5 y 6 coincidían casi 1:1 con los puntos 1, 3 y 5 ya registrados; los genuinamente nuevos quedaron como puntos 7 a 10 abajo.
- Objetivo   : el usuario concluyó, tras analizar la sección, que Necesidades y Ahorro no deberían tener límite de gasto (Necesidades son obligatorias, no tiene sentido limitarlas; Ahorro por encima de lo previsto es positivo y merece reconocimiento, no advertencia). Propone que Límites se enfoque solo en Estilo de vida. **Nota de triaje (2026-07-08): sacar Necesidades y Ahorro de la sección revisa parcialmente el [ADR 019](DECISIONS/019-limites-por-rol.md)** (roles por grupo con mensajes por rol, épica MC.8): el análisis de esta iniciativa debe decidirlo formalmente, no desmontarlo en silencio. Brief completo del usuario (verbatim, 2026-07-05):
  1. **Limitar únicamente Estilo de vida**: restaurantes, café, domicilios, streaming, compras impulsivas, ropa, tecnología, entretenimiento, viajes, salidas, transporte no esencial, belleza, hobbies y cualquier gasto no básico. Pidió explícitamente evaluar esta propuesta desde UX/UI y comportamiento financiero, y proponer alternativa si hay una mejor. _(Reafirmado verbatim en el brief del 2026-07-08, punto 2.)_
  2. **Solo categorías que el usuario ya usa**: al crear un límite, mostrar únicamente categorías donde ya registró al menos un gasto (no las ~40 categorías del catálogo completo), para no aumentar la carga visual con opciones nunca usadas.
  3. **Recomendaciones inteligentes proactivas**: si detecta gasto frecuente o creciente en una categoría de Estilo de vida sin límite (ej. varios gastos en restaurantes este mes), sugerir crear un límite ("Hemos notado que... ¿te gustaría crear un límite?").
  4. **Integración con el Dashboard (Inicio)**: mostrar ahí mismo sugerencias discretas y oportunas (ej. "Aún no has definido un límite para restaurantes", "Este mes gastaste más de lo habitual en entretenimiento"); nunca invasivas ni constantes.
  5. **Seguimiento y retroalimentación durante el mes**: porcentaje usado del límite, cuánto queda disponible, comparación con meses anteriores, si va bien o debería moderar; y mensajes positivos de refuerzo cuando el usuario se mantiene dentro del límite (no solo advertencias cuando se excede).
  El usuario pidió explícitamente analizar si esta propuesta es la mejor solución de UX/UI y finanzas personales, con libertad de proponer una alternativa mejor y justificarla.
  6. **(Integrado por triaje 2026-07-08, del brief de Inicio)** Copy de las alertas de límite cercano y orientado a la acción, no técnico: en vez de "Gastaste $150.000 de $100.000 ($50.000 extra)", algo como "Has gastado $50.000 más de lo que habías planeado para restaurantes. Si continúas a este ritmo podrías afectar el dinero destinado para otras prioridades". Finko como consejero, no solo informador. Aplica en la alerta del Dashboard y en la propia sección.
  7. **(5.º lote, 2026-07-08) Base de cálculo: dinero realmente disponible, no solo ingresos fijos.** Hoy el asignado por grupo sale de los ingresos fijos; el usuario puede vender algo o recibir un pago extraordinario y ese dinero también es capacidad real de gasto. Esteban pide analizar la metodología (ingresos fijos + esporádicos + saldos disponibles) **sin generar recomendaciones erróneas**: ojo del análisis, un saldo alto no siempre es gastable (puede estar comprometido con obligaciones futuras); conecta con la nota vigente de MC.10/MC.11 (piso de ahorro + déficit real) y con el motor de vencimientos de MC.13 (lo comprometido a la fecha).
  8. **(5.º lote) Gastos fijos no esenciales participan en los límites.** Netflix, Spotify, IA por suscripción y similares son recurrentes pero son estilo de vida: deben contar contra el límite correspondiente, diferenciados de los fijos esenciales (arriendo, servicios, salud). La dimensión "esencial vs no esencial" se decide en la taxonomía de **CAT.1/ADR 029 D3** (misma pasada), no aquí.
  9. **(5.º lote) Detección de gastos hormiga y fantasma sobre suscripciones.** Ej.: "Estás destinando $120.000/mes en streaming (Netflix + Prime + HBO). Revisa cuáles usas realmente"; suscripciones sin uso frecuente como candidatas a gasto fantasma. Reflexión, nunca prohibición. Depende del catálogo de marcas/suscripciones (ADR 029) y alimenta el **motor único de "sugerencia por categoría"** (regla de la fusión TX.10/LIM.1/ANL.1: un motor, no tres).
  10. **(5.º lote) Límites sugeridos automáticamente y adaptativos**: propuestos por Finko según ingresos, disponible, histórico, frecuencia de compra, % de estilo de vida, metas, deudas y fondo; el usuario siempre puede modificarlos. Extiende la recomendación 3 de sugerir "que exista un límite" a sugerir "el monto".
- Secciones  : Límites de gasto (`presupuesto`), transversal (categorías con gasto real vienen de `gastos`; sugerencias en Dashboard tocan Inicio; suscripciones/marcas vienen del ADR 029)
- Archivos   : sin explorar todavía; candidatos previsibles `modules/dominio/presupuesto/logic.js` (regla actual de qué grupos entran a Límites y asignado por ingresos fijos) y el picker de categorías al crear un límite
- Depende de : la dimensión esencial/no-esencial y las suscripciones dependen de la validación D3 del ADR 029 + CAT.1; los puntos 1-6 pueden analizarse antes; revisar junto con la revisión del ADR 019 (arriba) y coordinar el mecanismo de sugerencias en Inicio con la iniciativa Inicio v2
- Modelo     : el análisis inicial (puntos 1, 7 y la revisión del ADR 019) sube a **Opus 4.8 - Alto** (la base de cálculo es lógica financiera con riesgo real de recomendaciones erróneas); las rebanadas de UI/copy pueden bajar a Sonnet 5 - Alto

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

#### ANL.1 - Análisis como centro de interpretación financiera (no solo panel de estadísticas)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario considera que Análisis hoy es una gran cantidad de gráficos e indicadores que puede resultar abrumadora para alguien sin conocimientos financieros; pide una revisión completa desde UX/UI antes de tocar código, con la filosofía de que Finko debe explicar e interpretar, no solo mostrar datos. Brief completo del usuario (verbatim, 2026-07-05):
  1. **Priorizar comprensión sobre cantidad**: cada gráfico debe responder una pregunta concreta del usuario (¿en qué gasto más?, ¿ahorro lo suficiente?, ¿mis deudas mejoran o empeoran?, ¿cómo cambió mi situación vs. el mes anterior?, ¿qué gasto debería reducir primero?); si un gráfico no responde una pregunta importante ni genera una acción útil, evaluar si sigue siendo necesario.
  2. **Lenguaje sencillo para términos financieros**: activos, pasivos, liquidez, patrimonio, flujo de caja, etc. acompañados de una traducción simple entre paréntesis (ej. "Activos (lo que tienes)", "Pasivos (lo que debes)"), sin necesariamente eliminar el término técnico.
  3. **Explicar cada gráfico con 3 preguntas**: qué estoy viendo, por qué es importante, qué debería hacer con esta información; acompañado de recomendación personalizada cuando sea posible (ej. "Este mes aumentaste un 18% tus gastos en restaurantes...").
  4. **Reorganizar la distribución**: evaluar Bento Grid (bloques por análisis específico), estructura por secciones con scroll agrupando por tema, o una combinación; prioridad es que el usuario ubique rápido dónde está cada tipo de información.
  5. **Jerarquía visual**: info crítica primero (estado general, gastos más altos, progreso de ahorro, evolución de deudas, cumplimiento de presupuesto); análisis avanzados después o en desplegables.
  6. **Convertir datos en recomendaciones accionables**: no solo estadísticas, sino mensajes tipo "estás gastando demasiado en X", "tu fondo de emergencia cubre 2 meses", "vas atrasado en tu meta de viaje", "detectamos varios gastos hormiga", etc.
  7. **Reducir carga cognitiva**: tarjetas plegables, bloques expandibles, pestañas, filtros, resúmenes con "ver más detalle"; descubrimiento progresivo, no todo de una vez.
  8. **Coherencia visual con el resto de Finko**: mismos colores por sección, iconos propios (Finko Icons v2), tipografía, espaciados, jerarquía, animaciones y componentes reutilizables (nada nuevo que rompa el sistema de diseño existente). _(Nota de triaje 2026-07-08: este punto lo resuelve la iniciativa de color del [ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md) (IV.1 cerrada, IV.2 pendiente); al iniciar ANL.1, consumir esos tokens, no diseñar un sistema paralelo.)_
  9. **(Integrado por triaje del 4.º lote, 2026-07-08, brief de Análisis puntos 6-8, que refuerzan casi 1:1 los puntos 1-5 y 7 de arriba con ejemplos concretos de copy)**: "Estado de tu dinero" en vez de "Score financiero", "Dinero disponible" en vez de "Liquidez", "Lo que tienes" / "Lo que debes" en vez de "Activos" / "Pasivos" (término técnico como secundario o entre paréntesis); cada gráfico con título claro + explicación sencilla + interpretación automática + recomendación ("Este mes destinaste el 58% de tu dinero a necesidades. Vas por buen camino, aunque aún podrías aumentar un poco tu ahorro."); reorganización Bento en desktop y tarjetas secuenciales en móvil, con las conclusiones primero y el detalle después. El mismo brief también pidió recibir aquí toda la interpretación fiscal (ver CFG.2c) y albergar el progreso/logros (ver iniciativa LG.2 en Transversal): coordinar las tres al diseñar el layout.
  El usuario pidió explícitamente analizar la sección completa antes de implementar cualquier cambio, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.
- Secciones  : Análisis (dominio `analisis`); probable relación con Presupuesto (límites), Ahorro (fondo/metas), Compromisos (deudas) y Gastos, ya que las recomendaciones cruzan esos dominios (vía datos ya calculados, no importando entre dominios, ADN 10)
- Archivos   : sin explorar todavía en profundidad; punto de partida `modules/dominio/analisis/` (lógica y vista) y estilos ya mencionados en memoria (paleta unificada dona/barras, `style(analisis)` en el historial); requiere ficha de contexto nueva en `docs/contexto/` si no existe
- Depende de : nada. Alcance grande y multicapa (lógica, copy, layout, jerarquía visual, posible engine de recomendaciones): al iniciar, dividir en subtareas verificables por separado (regla 2.1), por ejemplo ANL.1a auditoría de qué gráficos se quedan/simplifican/eliminan, ANL.1b glosario en lenguaje simple + explicación de 3 preguntas por gráfico, ANL.1c reestructura de layout (Bento/scroll), ANL.1d motor de recomendaciones accionables, ANL.1e progressive disclosure (plegables/pestañas/filtros)
- Modelo     : primer paso (auditoría UX completa de la sección + propuesta de qué se simplifica/reorganiza/elimina) con **Fable 5 - Alto** (revisión de UX/UI de una sección entera con trade offs no obvios entre profundidad analítica y simplicidad, riesgo real de regresión si se elimina algo que el usuario sí usaba); subtareas de implementación posteriores pueden bajar a Sonnet 5 - Alto una vez la decisión esté tomada

---

### Configuración (dominio `config`)

_(Brief completo del usuario sobre Ajustes, 2026-07-05: 6 ideas registradas abajo. **No iniciar ninguna sin instrucción explícita.** CFG.1 y CFG.2 se **fusionaron** (decisión de Esteban, 2026-07-06) en una sola iniciativa "Perfil fiscal/financiero en Ajustes", partida en subtareas verificables. Ficha: [`contexto/configuracion.md`](contexto/configuracion.md).)_

> Iniciativa fusionada CFG.1 + CFG.2 ("Perfil fiscal/financiero en Ajustes", 2026-07-06). Criba de las 8 preguntas propuestas por Esteban: solo **situación laboral** tiene consumidor real y no es derivable; el resto Finko ya lo sabe (ingresos/frecuencia vía `S.ingresos`) o no lo consume nada (aplazadas). Hallazgo clave: el monitor de renta (K.3, `calcularEstadoRenta` en Análisis) **ya hace gran parte de CFG.2**; los huecos son auto-derivar `ingresosBrutos` (los otros 2 manuales no son derivables: no hay tipo de cuenta "tarjeta de crédito"; ver nota MC.16 en CFG.2a) e inferir el estado de declarante. **CFG.1a cerrada** el 2026-07-06 (quitar SMMLV muerto + situación laboral, schema v25). Quedan CFG.2a, CFG.2b y CFG.2c. **Ampliación del 4.º lote (2026-07-08, brief de Ajustes punto 1):** Esteban confirma la dirección de la iniciativa (Finko deduce automáticamente lo que ya sabe y solo pregunta lo indispensable) y añade la decisión de UBICACIÓN: los formularios fiscales dejan de vivir permanentes en Ajustes y pasan a un asistente tras un botón ("Completar perfil fiscal"); toda la interpretación y recomendaciones se consultan en **Análisis** (donde ya vive "Estado de tu renta"). Ajustes queda solo para configuración de la app. Nueva tarjeta CFG.2c abajo.

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
- Estado     : pendiente de análisis (no iniciar). **Toca el ADN del proyecto de frente** (reglas 2 y 3: offline-first, sin servidor, sin cuenta, sin sync): requiere ADR y discusión explícita antes de cualquier código, por instrucción directa de CLAUDE.md sección 3. **Nada de este alcance se implementa por triaje: se registra y se difiere a esa decisión.**
- Objetivo   : hoy solo existe exportar a JSON/CSV manual; el usuario teme perder todo el historial si pierde el teléfono, cambia de equipo, desinstala o formatea. Pidió analizar alternativas (copias de seguridad automáticas, sincronización con cuenta de usuario, respaldo cifrado en la nube, restauración desde archivo, u otra) que sean seguras, sencillas y transparentes, sin comprometer la privacidad. **Ampliado por el 6.º lote (2026-07-08, brief General punto 2, FUSIONADO aquí):** Esteban plantea ahora la versión completa: crear cuenta, iniciar sesión desde cualquier dispositivo, sincronización automática, recuperación ante pérdida y "continuar donde quedó", con autenticación segura. **Lo que el ADR debe poner sobre la mesa, sin rodeos:** (a) esto redefine Finko: "Sin servidor. Sin cuenta. Sin sync." dejaría de ser cierto, y la promesa actual de privacidad del onboarding ("Tus datos se guardan solo en tu dispositivo. Sin cuentas. Sin servidores.") tendría que reescribirse; (b) implica backend u servicio gestionado, costos de operación recurrentes, modelo de amenazas nuevo y responsabilidad sobre datos financieros de terceros; (c) existen puntos intermedios que el ADR debe evaluar contra la versión completa: local-first con sync cifrado de extremo a extremo, respaldo cifrado automático a almacenamiento del propio usuario (Drive/iCloud/archivo), o export/import cifrado mejorado; (d) **PERF.5 (IndexedDB) es precondición práctica** de cualquier sync serio (persistencia async + más cupo), y CFG.5 (bloqueo local) se vuelve capa complementaria de la autenticación. El disparador D4 del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) ("una feature que necesite persistencia asíncrona o mayor cupo, ej. CFG.4") quedaría activado si esto se aprueba.
- Secciones  : Configuración (Ajustes), transversal (afecta el modelo entero de datos y la identidad del producto)
- Archivos   : el punto de partida es la decisión arquitectónica, no el código
- Depende de : ADR de ADN aprobado por Esteban tras discusión explícita; PERF.5 como precondición técnica probable. **Su resultado reescribe el paquete legal de la iniciativa LEG** (privacidad/datos personales cambian por completo entre local-only y cuentas/sync): avisar a LEG al decidir.
- Modelo     : Fable 5 - Extra para el ADR (decisión arquitectónica que redefine el producto; exige el análisis más alto: opciones, costos, privacidad, riesgos y plan de migración)

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

> Auditoría de rendimiento 2026-07 (pedida por Esteban): **PERF.0** (harness `pnpm perf`, ver [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md)), **PERF.1** (windowing de Movimientos, hasta 81x más rápido), **PERF.2** (memoización de Inicio/Análisis vía `infra/memo.js`, ver [`contexto/analisis.md`](contexto/analisis.md)), **PERF.3** (cómputo del grupo colapsable de Análisis diferido al `toggle`) y **PERF.4** (persistencia: [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md), salvaguarda de cuota, se difiere el rewrite) cerradas el 2026-07-06. Confirmado por medición: `renderSmart()` ya evita el recálculo cruzado que temía Esteban, y el costo de guardar es bajo (~5 ms debounced), así que no se reescribió la persistencia. Iniciativa cerrada salvo la tarjeta futura de IndexedDB (**PERF.5**, disparadores en el ADR 030). Cada fase corre `pnpm perf` antes/después y compara contra BASELINE.md.

#### PERF.5 (futura, no iniciar) - Migrar la persistencia a IndexedDB
- Prioridad  : sin definir (se retoma solo si se dispara un criterio del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D4)
- Estado     : diferida por decisión del ADR 030. **NO iniciar** sin uno de sus disparadores: jank de guardado medido en dispositivo real, usuarios reales acercándose a la cuota (el aviso de PERF.4 disparándose en la práctica), o una feature que necesite persistencia asíncrona / mayor cupo (ej. CFG.4).
- Objetivo   : mover de la clave única `fk_v1` en `localStorage` a IndexedDB (cupo mucho mayor + escritura por registro), resolviendo cuota y costo de `JSON.stringify(S)` completo. El ADR 030 D3 rechaza explícitamente partir `localStorage` por clave (no sube la cuota).
- Secciones  : Transversal (`core/storage.js`, `bootstrap.js` pasa a async, sembrado E2E)
- Archivos   : `modules/core/storage.js` (motor async), `modules/ui/bootstrap.js` (loadData async), migración de datos localStorage → IDB sin pérdida, reescritura del sembrado de las 11 suites E2E
- Depende de : un disparador del ADR 030 D4
- Modelo     : Opus 4.8 - Extra o Fable 5 - Alto (cambio de mayor riesgo del proyecto: ruta de arranque async + migración de datos reales de años)

---

> Segunda pasada de la auditoría de rendimiento (2026-07-07, Fable 5): confirmó que lo grueso ya está resuelto (eventos por sección, `renderSmart` hash-gate, `infra/memo.js`, windowing). Hallazgos nuevos registrados abajo como PERF.6, PERF.7, PERF.8. Cada fase corre `pnpm perf` antes/después contra [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

#### PERF.6 - Coalescer de renders por microtask (alcance revisado a la baja)
- Prioridad  : baja
- Estado     : pendiente de decisión. **Hallazgo del 2026-07-07:** `renderSmart()` corta por hash, así que una vista solo se pinta cuando es la sección activa. El doble-render caro que motivó la tarjeta (Análisis, 5 observadores, ~11 ms) NO ocurre en la práctica: Análisis es solo-lectura, no se muta desde ahí, y renderSmart bloquea su pintado desde cualquier otra sección. La exposición real queda en los paneles de Inicio (actividad reciente, resumen) que se repintan 2-3 veces durante una acción multi-sección lanzada desde Inicio (ej. distribución del ingreso): costo bajo.
- Objetivo   : `programarRender(fn)` en `infra/render.js`, cola dedupada por identidad, vaciada en microtask; los listeners de `state:change` agendan en vez de pintar directo, colapsando repintados del mismo tick a uno. Renders directos (navegación, arranque, `renderAll`) siguen síncronos.
- Riesgo     : cambia el timing de los renders reactivos de síncrono a microtask. Blast radius de tests medido chico (los tests de vista llaman la view directo, no vía bus; E2E auto-espera). Cerca del pipeline de render: si se hace, medir el doble-render real con un escenario nuevo del harness antes/después (disciplina ADR 030).
- Secciones  : Transversal (`infra/render.js` + listeners `state:change` de los dominios multi-observador)
- Depende de : decidir si el beneficio (situacional, Inicio) justifica el cambio de timing. Alternativa recomendada: PERF.7 primero (ganancia medida e incondicional).
- Modelo     : Opus 4.8 - Alto (si se hace)

_(**PERF.7a cerrada** el 2026-07-07: `Intl.DateTimeFormat` cacheado por firma en `formateadorFecha()` (`infra/utils.js`), usado en `fechaLegible`, `_mesAnioLabel` y `fechaCorta`. Medido: "Movs 1er lote" pasa de 24-48 ms a **~8,2 ms planos**. Verificado: 2257 unit + 155 E2E + `pnpm perf`. Ver [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md) y CHANGELOG.)_

_(**PERF.7b cerrada** el 2026-07-07, solo la mitad segura: `renderPanelResumen()` llamaba a `hayResumen()` (barrido propio, sin memoizar) antes de `_resumenSemanalMemo()`; ahora se deriva la condición de "sin actividad" del campo `registros` que `resumenSemanal()` ya calcula, una sola llamada memoizada. Medido: ruta caché de "Inicio" queda plana en ~0,8 ms a cualquier volumen (antes 2,1-15,2 ms); ruta fría mejora ~15 % a 5.000/10.000 gastos, con una regresión aceptada de ~4 ms a 1.000 gastos (dato disperso: antes se ocultaba el panel sin llegar a calcular el bundle completo). Detalle honesto en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md). La mitad de `calcularEstadoRenta` quedó para PERF.7d, resuelta con un enfoque más chico de lo planteado acá.)_

_(**PERF.7d cerrada** el 2026-07-07, con un alcance más chico que el planteado originalmente (esa primera versión de la tarjeta decía que hacía falta tocar `config/index.js`; el análisis mostró que no). `_renderEstadoRenta()` llamaba a `calcularEstadoRenta(S, anio)` sin memoizar; ahora usa `_calcularEstadoRentaMemo` (`analisis/view.js`), memoizada contra `['gastos', 'cuentas', 'inversiones']` con un `extraerClave` que lee `state.config?.datosFiscales?.[anio]` directo. Es seguro sin tocar `config/index.js` porque el handler de "Datos de renta" siempre **reemplaza** esa entrada por un objeto nuevo (nunca la muta en el lugar): su identidad cambia en cada guardado real y la comparación por referencia de `memoizar()` la detecta sola. 4 tests nuevos en `analisis.test.js` prueban explícitamente que dos renders con un dato fiscal editado entre medio NO sirven el resultado obsoleto (con memoización ingenua, ese test habría fallado). Medido: el efecto en "Análisis caché" es pequeño, dentro del ruido (`calcularEstadoRenta` ya era barata frente al resto del bundle con los datos de este harness); el valor es de corrección de cobertura de caché, no de velocidad medible acá. Verificado: 2265 unit + 155 E2E + `pnpm perf`. SW v339. Detalle en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).)_

> Iniciativa Identidad de color por sección 2026-07 ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), **aceptada por Esteban el 2026-07-07**): brief del 2026-07-07 (color característico por sección en toda la experiencia + números que comunican + replanteo de iconos). El análisis encontró que los tokens `--fk-dom-*` ya existen pero están sub-desplegados, sin rampa de tema claro (hueco WCAG real), con dominios faltantes (`agenda`, `apartados`) y con la colisión deudas = danger. Las 5 decisiones abiertas (P1 a P5) se resolvieron todas con la opción recomendada: gastos/egresos se quedan cálidos y neutros (ADR 019 sin cambios), Deudas se separa del danger en frambuesa, Límites se queda en amarillo, hub Ahorros en familia de colores (no 4 matices únicos). Iconografía dirigida DESPUÉS del color (no un 4.º redibujo global), condicionada a revisión visual tras IV.2.
>
> **Ampliación del 8.º lote (2026-07-09, brief "Nueva dirección de diseño" + 2 imágenes de referencia): la iniciativa evoluciona a "Dirección Visual premium".** El brief pide una identidad no minimalista ni plana, cálida y tecnológica a la vez, sin sacrificar rendimiento. Triaje contra lo existente: (a) el **color con significado por sección** YA está decidido y fundado (ADR 031/IV.1; los emojis 🔴🟢🟠🔵🟣🟡 del brief son ilustrativos, mandan los tokens aprobados; "color secundario por módulo" es extensión nueva); (b) **iconografía protagonista + logos oficiales intactos** YA es doctrina (ADR 023 v2 chispa, 025 tejas/marcas, 026 Esteban diseña, 027 fullcolor); la frase "una familia de iconos propia por sección" TENSIONA el lenguaje único del ADR 023 y el ADR nuevo debe resolverla formalmente (recomendación preliminar: un solo lenguaje con acento de color+detalle por dominio, no 13 familias); (c) **cards con profundidad, degradados suaves, formas orgánicas, patrones, ilustraciones y fondos con personalidad** son lo genuinamente NUEVO (sistema de superficie/elevación + riqueza visual): eso es DV.1; (d) **animaciones 150-250 ms con propósito** extienden `infra/animate.js` y coordinan con CFG.7 (cuya advertencia de lag móvil medido sigue vigente) y con el diseño emocional que ya vive en LG.2 (logros/celebraciones); (e) **jerarquía y pantallas menos vacías** se ejecutan en las iniciativas v2 por sección (Inicio v2/IN.8, ANL.1, Deudas v2, Mis Cuentas v2, GU.1...): DV define el sistema transversal, las secciones lo aplican (regla anti-doble-trabajo); (f) **rendimiento y accesibilidad como techo** son innegociables del propio brief y del ADN: Lighthouse 100 y AA se mantienen, con lista explícita de efectos prohibidos. Las 2 imágenes de referencia son inspiración de tono (profundidad suave, calidez, personalidad), NO se copian: identidad propia. **Secuencia: IV.2 NO espera al ADR nuevo** (su contenido ya está aprobado y es fundación de todo lo demás); DV.1 puede ir en paralelo o después.
>
> **DV.1 cerrada el 2026-07-10:** el [ADR 033](DECISIONS/033-direccion-visual-premium.md) "Dirección Visual premium" quedó escrito en estado **Propuesta**, con 5 preguntas para Esteban (P1 alcance del degradado, P2 formas compartidas vs por sección, P3 ratificar lenguaje único de iconos, P4 lote inicial de ilustraciones, P5 sombra en reposo en ambos temas), todas con recomendación. Decisiones clave: elevación en 4 niveles con sombra en reposo (hoy las cards reposan planas); el color secundario es rampa derivada del mismo matiz (no un 2.º hue por sección) materializada en `--fk-section-color` + `--fk-grad-identity` (2 paradas máx); decoración con presupuesto (formas `d-*` neutras teñidas por dominio, patrón CSS, ilustraciones `il-*` como clase nueva del pipeline ADR 026); catálogo de movimiento CERRADO (150-250 ms, una vez, solo transform/opacity) con retiro de los 2 bucles infinitos existentes (`empty-orbit`/`empty-float`); la tensión de iconografía se resuelve ratificando el lenguaje único del ADR 023 (D5). **Nada de esto se implementa sin la validación de Esteban**; las rebanadas DV.2a-d abajo.

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

_(**IV.1 cerrada** el 2026-07-07: `--fk-dom-agenda` nuevo (índigo `#7d8cf0`); `--fk-dom-compromisos` de `#ff4757` a frambuesa `#ea5385`; `--fk-dom-analisis` a pizarra neutra `#8f9bb3`; `--fk-dom-inversion` hereda el turquesa `#2fd2bf`. Cada uno de los 11 dominios ganó `-bg` (`color-mix` 12%, mismo valor en ambos temas) y `-text` (variante segura como texto/UI, con override en `body.light-theme`). **Hallazgo corregido antes de implementar:** la frambuesa que proponía el ADR quedaba a solo 7° de matiz del rojo de `--fk-danger` (verificado con cálculo real de HSL, no a ojo): casi indistinguible con daltonismo protán. Se ajustó a `#ea5385` (antes `#ef5777` en el texto del ADR), separada 14-19° de matiz Y con luminosidad propia, sin perder contraste (verificado con WCAG real: los 11 dominios pasan ≥4.98:1 en oscuro y los 11 `-text` pasan ≥4.5:1 en claro contra `#fff` y `#f6f7fa`, cálculo en `/tmp/summary.mjs` de la sesión, no reproducido en el repo). Verificado en el navegador: la teja de "Deudas" en el menú "Más" resuelve a `rgb(234,83,133)` (=`#ea5385`) exacto, "Análisis" a `rgb(143,155,179)` (=`#8f9bb3`) exacto. **Hueco real encontrado para IV.2 (no introducido por esta tarea, preexistente):** varios usos ya desplegados leen el token base `--fk-dom-X` directo como color de texto (ej. `.inversion-hero__tipo-pct` en `analysis.css`, badges en `nudges.css`) en vez de `-text`; en tema claro esto falla contraste (verificado: el "100%" de Inversión da 1.89:1 contra blanco). Es el gap que ya documentaba el ADR 031 (hallazgo 2); IV.2 debe auditar y migrar cada uso de `color: var(--fk-dom-X)` a `var(--fk-dom-X-text)`, empezando por `.inversion-hero__tipo-pct` y `.dom-badge--*`. Validado: 2265 unit + 155 E2E + verificación manual de contraste en Chromium real (axe-core no cubre `color-contrast` en happy-dom). SW v339 → v340.)_

_(**IV.2 completa** (2026-07-09 a 2026-07-10): **IV.2a** (nav+encabezados, 2026-07-09); **IV.2b** (franja de modales + barras/anillos de progreso por dominio en Metas/Ahorro/Apartados/Me deben/3 factores del score de Análisis, vía `--fk-section-accent`; Presupuesto/Límites quedó fuera a propósito por su esquema de color ADR 019, coincide con LIM.1); **IV.2c** (Calendario: "fijo" de amarillo a índigo propio, tarjetas de evento con fondo teñido 8% en vez de franja lateral; Inicio: etiqueta de tipo `.dom-badge` en Pendientes/Prioridades + fix de un bug real donde un apartado heredaba el color de "fijo"); **IV.2d** (migración general `color: var(--fk-dom-X)` → `-text`). Detalle completo en CHANGELOG y [`contexto/transversal.md`](contexto/transversal.md). SW v340 → v344.)_

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
- Estado     : pendiente de análisis (no iniciar). Coordinar con la validación D3 del ADR 029.
- Objetivo   : hoy hay categorías en Gastos que muestran el hint "normalmente pertenece a fijos" (`hint-categoria-fija`): el brief pide eliminarlas del catálogo de Gastos en vez de avisar (Finko decide, el usuario no corrige). Criterios acordados: **fijo** = recurrente con frecuencia definida, estable, parte de la rutina (arriendo, servicios, internet, plan móvil, suscripciones, gimnasio, seguros, cuotas); **gasto** = día a día sin fecha fija, variable, estilo de vida (restaurante, transporte, ropa, café, regalos). Las **contextuales** (ej. alimento de mascotas: fijo si se compra con periodicidad, gasto si es "cuando se acaba") tienen un default por comportamiento común + personalización del usuario. Deduplicar catálogos (`CATEGORIAS_GASTO` vs `CATEGORIAS_AGENDA` en `constants.js`): cada categoría con UNA ubicación predeterminada. Requiere migración idempotente si se mueven categorías con datos existentes. **Ampliado por el 4.º lote (2026-07-08, brief de Apartados punto 5):** la MISMA pasada decide **Apartados↔Metas**: salen de Apartados las categorías que son objetivos grandes de largo plazo (Vacaciones, Semestre universitario, Computador, Viajes → Metas) y entra el catálogo de gastos esporádicos olvidables que definió Esteban (regalos y fechas especiales, SOAT/tecnomecánica/mantenimientos del vehículo, veterinario/alimento de mascotas, útiles y uniformes, impuestos, documentos, mantenimiento y seguro del hogar, reparaciones inesperadas, aseo personal). Una sola taxonomía global, validada con Esteban en el mismo movimiento que ADR 029 D3.
- Secciones  : Gastos, Calendario (fijos), Apartados, Metas, transversal (`constants.js`, forms)
- Depende de : nada técnico; validación de taxonomía con Esteban como primer paso (mismo movimiento que ADR 029 D3). **Hallazgo del triaje (2026-07-08): el [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) "Taxonomía de categorías transversal" ya existe en estado Propuesta desde junio**, pendiente de validar la curación de catálogos con Esteban, y cubre exactamente esta pregunta ("qué va en cada sección y qué hacer cuando un concepto cabe en varias"). La sesión de taxonomía debe validar/actualizar ADR 014 + ADR 029 D3 + los criterios de CAT.1 como UNA sola decisión, no tres documentos rivales. (Desambiguación: el "AP.5" que el ADR 014 dice absorber es un ID histórico pre-BOARD, tarea distinta de la tarjeta AP.5 "Apartados v2" actual.)
- Modelo     : Opus 4.8 - Extra si trae bump de schema con migración; el análisis de taxonomía previo, Fable 5 - Alto junto con ADR 029

#### CAT.2 - Picker de icono compartido para "Otra categoría / Otra entidad" (6 consumidores)
- Prioridad  : alta (seis briefs lo piden por separado; es UN componente)
- Estado     : pendiente
- Objetivo   : reemplazar el grid de iconos de TX.9b (invasivo: llena la pantalla) por la interacción nueva: al elegir "+ Otra categoría" aparecen solo un recuadro de icono (vacío) + campo de nombre; tocar el recuadro abre un selector (modal/panel) y el icono elegido queda en el recuadro. **Un solo componente reutilizable en `ui/` o `infra/`** consumido por: el form de Gastos, el de Gasto fijo (que hoy ni siquiera ofrece icono en "Otra": solo texto), el de Deudas ("Otro" en entidad/persona), el de Cuentas ("Otra entidad"), el de **Apartados** (que hoy depende del selector de emojis del SO, Win+., nada intuitivo; 4.º lote) y el de **Metas** ("Otro" con icono opcional, recuadro vacío permitido; 4.º lote). Cruce interno de los lotes detectado en el triaje: seis briefs pidieron esta misma interacción; construirla una vez.
- Secciones  : Gastos, Calendario, Deudas, Mis cuentas, Apartados, Metas, `ui/` (componente)
- Archivos   : `gastos/view.js` (`icono-picker` actual), forms de fijos/deudas/cuentas/apartados/metas, modal nuevo
- Depende de : nada (puede ir antes o después de CAT.1)
- Modelo     : Sonnet 5 - Alto (componente de UI nuevo consumido por 6 dominios)

#### CAT.3 - Categorías personalizadas globales (mismo estatus que las nativas, en toda la app)
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : las categorías personalizadas de TX.9b existen solo para Gastos; el brief pide que una categoría creada por el usuario (nombre + icono) valga también para Gastos fijos y aparezca con su icono y el color de su sección en TODAS las superficies donde aparezca (Calendario, Inicio, Movimientos, Pendientes, Prioridades, Análisis, filtros, gráficos), con las mismas automatizaciones que una nativa. Decidir el modelo de datos: catálogo global vs por sección (probable bump de schema).
- Secciones  : transversal
- Depende de : CAT.1 (la taxonomía define a qué sección pertenece una personalizada) y CAT.2 (el picker es cómo se crea)
- Modelo     : Opus 4.8 - Alto (modelo de datos + propagación transversal)

#### CAT.4 - Auditoría de consistencia de formularios: orden de campos + fecha por defecto
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : dos reglas transversales de los briefs 2026-07-08 aplicadas en UNA pasada por todos los formularios. (1) **Orden** (brief Mis Cuentas punto 8): la categoría/tipo va primero y la descripción después, nunca al contrario; Gastos ya lo cumple (TX.9a) y el form de Deudas lo adoptará en su reordenamiento (Deudas v2). (2) **Fecha por defecto = hoy** (brief Me deben punto 1, elevado por Esteban a regla de toda la app): todo campo de fecha de un movimiento nuevo viene precargado con la fecha actual, editable; auditar cuáles forms ya lo hacen y corregir los que no (el de Me deben reportado explícitamente).
- Secciones  : transversal (solo views de formularios, sin lógica de negocio)
- Depende de : nada; coordinar con los reordenamientos ya previstos en Deudas v2 y MC.15d para no tocar el mismo form dos veces
- Modelo     : Sonnet 5 - Medio (una pasada por ~8 formularios con tests de ambas reglas)

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

> **Iniciativa LG.2: Logros v2, gamificación de hábitos** (triaje del 4.º lote, 2026-07-08, brief de Análisis puntos 1-5). **[ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada (2026-07-09): LG.2a (ADR + catálogo) y LG.2b (fundación de progresión) cerradas; nombres de niveles de usuario provisionales hasta que Esteban entregue los definitivos.** Contexto original: **requería ADR que revise el ADR 022** (la vitrina vive en Ajustes por decisión aprobada; el brief la muda a Análisis + resumen en Inicio: decirlo formalmente, no moverla en silencio). Alcance: (1) reubicación (apartado de progreso en Análisis + tarjeta de logros recientes/próximos en Inicio, coordinada con Inicio v2 y ANL.1); (2) logros con **niveles progresivos** (primer gasto → primer mes completo → 3 meses consecutivos → 6 meses...); (3) **niveles de usuario** que evolucionan con los hábitos (nombres por definir con Esteban; los del brief son ejemplos); (4) **regla de oro anti-gaming, al ADR como principio innegociable:** los logros premian hábitos saludables (constancia de registro, plan de ahorro cumplido, fondo completado, deudas pagadas a tiempo, equilibrio entre grupos), NUNCA la omisión de información (prohibidos "día sin gastos" o "semana gastando menos de X%": incentivarían dejar de registrar, contra el propósito de Finko); (5) logros por **interpretación de comportamiento** (mejoró su % de ahorro varios meses, redujo hormiga, terminó una deuda antes de lo previsto), que dependen de derivaciones de Análisis ya existentes (hormigas, resumen) y futuras. La base actual es simple a propósito (11 logros planos en `logros/logic.js`, evaluadores O(1); mantener esa disciplina de rendimiento: evaluación barata por `state:change`, ADR 022).

#### LG.2c - Constancia de registro: "mes completo" + rachas + familia deudas
- Prioridad  : media
- Estado     : pendiente (LG.2a y LG.2b cerradas el 2026-07-09; [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada)
- Objetivo   : derivación pura "mes completo de registro" (gastos en 3+ semanas del mes, ADR 032 D3) y rachas hacia atrás desde el mes anterior, memoizadas con `infra/memo.js` (nunca O(historial) por `state:change`); niveles 3-6 de la familia registro (`mes-completo`, `tres-meses-seguidos`, `seis-meses-seguidos`, `doce-meses-seguidos`) y familia deudas (`primera-deuda-saldada`, `tres-deudas-saldadas`, excluyendo consolidaciones). Agregar las familias nuevas a `FAMILIAS`.
- Secciones  : Transversal (`logros`)
- Archivos   : `modules/dominio/logros/logic.js` (derivación + catálogo), tests de rachas con casos de borde (mes corriente nunca rompe racha, meses sin datos)
- Depende de : nada (la fundación LG.2b ya está en producción)
- Modelo     : Sonnet 5 - Alto (lógica de fechas/rachas con esquinas + disciplina de memoización)

#### LG.2d - Mudanza de la vitrina: "Tu progreso" en Análisis + tarjeta en Inicio
- Prioridad  : baja (bloqueada)
- Estado     : **bloqueada por ANL.1 e IN.8** (ADR 032 D6: no posicionar dos veces). La vitrina sigue en Ajustes (ADR 022 vigente operativamente) hasta que esas iniciativas definan sus pantallas.
- Objetivo   : mover la vitrina a un apartado "Tu progreso" en Análisis y agregar la tarjeta compacta en Inicio (nivel actual + último logro + próximo objetivo); al cerrar, marcar el ADR 022 como Superada. _(Nota 2026-07-12: la revisión del ADR 028 ya existe, es el [ADR 034](DECISIONS/034-inicio-v2.md); el layout de Inicio v2 no reserva bloque para logros, así que la tarjeta compacta debe proponerse cuando las rebanadas IN.8a-g estén en producción.)_
- Secciones  : Análisis, Inicio, Ajustes (`logros`)
- Depende de : ANL.1 (layout de Análisis) + rebanadas IN.8a-g en producción
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
- Depende de : motor de vencimientos (MC.13, primera rebanada); ADR propio aprobado por Esteban
- Modelo     : Fable 5 - Alto para el ADR (filosofía de producto con riesgo de confianza del usuario); implementación por rebanadas después

---

> Iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md)): auditoría móvil hecha el 2026-07-04; decisión aprobada en el ADR. NAV.A1, NAV.A2a, NAV.B, NAV.A2b (slices 1 y 2) y NAV.C cerradas. Iniciativa completa, sin pendientes.

---

> Iniciativa Biblioteca de recursos gráficos 2026-07 ([ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md) + [ADR 027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)): **COMPLETA**. Esteban diseña los SVG en Illustrator; `assets/svg/` es la fuente de verdad de diseño y el sprite de `index.html` es artefacto generado. BR.1 (estructura + estándar + extracción de los 100 símbolos + 17 plantillas), BR.2 (`scripts/sync-sprite.py` + guardarraíl), BR.3 (los 11 bancos/billeteras de `BANCOS_CO` a color: Bancolombia, Banco de Bogotá, Nequi, Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, Banco de Occidente, AV Villas, DaviPlata, Lulo Bank, Nubank), BR.5 (el sync normaliza exports crudos de Illustrator) y BR.4 (ADR 027, registro formal de la excepción de logo a color `data-fullcolor`) cerradas el 2026-07-05. Único sin glifo: "Otro" (deliberado, no es un banco real).
>
> Regla de fidelidad absoluta (2026-07-05, ampliada el mismo día): todo SVG que Esteban entrega es la versión oficial. Nunca simplificar, restilizar ni reemplazar el diseño (formas, colores, degradados, proporciones) sin que él lo pida explícitamente; **cero elementos agregados** (contornos, bordes, sombras, brillos, efectos, marcos); si un logo necesita contraste con el fondo, se ajusta el **contenedor** (color de teja, espacio), nunca el logo. Solo se permite limpieza técnica (envoltorio de Illustrator, capas de calco, elementos prohibidos) cuando el resultado es visualmente idéntico. Formato de entrega: SVG siempre; PNG 512px de referencia opcional para logos a color (vara de la revisión en pareja). Detalle técnico clave en [`contexto/transversal.md`](contexto/transversal.md) y `assets/svg/README.md` sección 6b (la herencia de `stroke` de `.icon` a través de `<use>`: causa del contorno fantasma corregido en `0f143f9`).

---

> Iniciativa de identidad visual 2026-07 ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md) + [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)): **COMPLETA**. ID.1, ID.4, ID.2, ID.6, MK.1, MK.2, ID.7 e ID.3 cerradas (2026-07-05). Nota de MK.1: Bancolombia, Davivienda, DaviPlata y demás bancos siguen con iniciales (regla de fidelidad ADR 025 D5, sin referencia vectorial confiable); agregar cada glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo` en `BANCOS_CO`. Nota de MK.2: ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox están en `MARCAS` con iniciales (sin glifo en Simple Icons vigente); sumar un glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo` en `MARCAS`. Nota de ID.7: mountain, bolt y star conservan sus vértices agudos a propósito (regla 5 del ADR 023, metáfora primero); i-saldo e i-star no llevan punto de valor (la propia forma ya es la firma). Nota de ID.3: agregar una categoría nueva a cualquier catálogo cuesta 1 entrada en `CATEGORIA_*_ICONO` (y 1 `<symbol>` `c-*` si el glifo no existe); TX.4 avisa si el id no está en el sprite.

---

## Mantenimiento

#### A.5 - Dominio custom en Vercel
- Prioridad  : baja
- Estado     : pendiente (espera a que el usuario registre un dominio)
- Objetivo   : cambiar de `finko-brown.vercel.app` a un dominio propio. No requiere cambios de código.
- Secciones  : Infraestructura
- Archivos   : guía completa en [`SETUP_DOMINIO.md`](SETUP_DOMINIO.md)
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
