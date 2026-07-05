# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-07-05.

---

## En proceso

_(sin tarea activa. Máximo 1 tarjeta aquí a la vez, regla de oro de `/CLAUDE.md` sección 2.1. El [ADR 028](DECISIONS/028-inicio-centro-de-control.md) fue **aprobado por Esteban el 2026-07-05**: la siguiente tarjeta natural es **IN.6a** (saludo dinámico), primera fase del orden recomendado.)_

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

Reglas de las tarjetas (`/CLAUDE.md` sección 2.1):

- **Sin duplicados:** antes de crear una tarjeta, buscar otras sobre la misma funcionalidad, sección o componente; si comparten objetivo o tocan la misma parte del sistema, consolidarlas en una sola (la más completa absorbe a las demás).
- **Dividir lo grande:** una tarjeta que toque varios dominios o varias capas (lógica, vista, estilos, datos, accesibilidad, tests) se parte en subtareas verificables de forma independiente (sufijos `a`/`b` o slices), encadenadas con "Depende de".

---

## Pendientes por sección

### Inicio (dashboard)

_(Observación sin tarea formal: IN.2 cerró con el ojo solo en el hero, el monto más sensible. Si el usuario lo pide, extender la máscara a los demás montos de Inicio: totales de vencidos/prioridades y cifras del resumen semanal.)_

_(Observación sin tarea formal: retroalimentación del usuario en el celular sobre el resumen semanal puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas. Esperar feedback antes de iterar.)_

> Iniciativa "Inicio como centro de control" ([ADR 028](DECISIONS/028-inicio-centro-de-control.md), **aprobada el 2026-07-05**): análisis en la ficha [`contexto/inicio.md`](contexto/inicio.md); IN.7 cerrada como paso previo. El ADR define un rol único por bloque y el orden vertical (saludo, hero, accesos, atención hoy, próximas prioridades, actividad reciente, resumen semanal), y re-corta los briefs en las fases de abajo. Orden recomendado: IN.6a → CAL.1 → TX.8a → TX.8b → IN.4a → IN.6b, una fase por sesión, verificada y pusheada antes de la siguiente. Los briefs originales completos quedaron capturados en el contexto del ADR.

_(**IN.6a cerrada** el 2026-07-05: saludo dinámico con nombre en Inicio, ver CHANGELOG. Siguiente fase del orden recomendado: **CAL.1**.)_

#### IN.4a - Accesos rápidos personalizables (catálogo + tiles + modal por lista)
- Prioridad  : media dentro de la iniciativa (después de TX.8, cuando el set de paneles esté estable)
- Estado     : pendiente (ADR 028 aprobado)
- Objetivo   : catálogo `ACCESOS_INICIO` en `constants.js`, `S.config.accesosInicio` (3 por defecto, bump de schema v23 con migración idempotente), fila de tiles data-driven bajo el hero, y modal "Personalizar" con selección por lista (sin drag & drop en v1, ADR 028 D2). Complementa el bottom nav: 1 tap a las secciones que hoy quedan detrás de "Más". Default exacto a confirmar con Esteban.
- Secciones  : Inicio, `core` (schema v23)
- Archivos   : `modules/core/constants.js`, `modules/core/state.js` + `storage.js` (migración), render de Inicio, CSS de tiles
- Depende de : idealmente después de TX.8a/TX.8b
- Modelo     : Sonnet 5 - Alto

#### IN.4b (opcional, pospuesta) - Sugerencia de accesos por frecuencia de uso
- Prioridad  : baja
- Estado     : pospuesta por decisión del ADR 028 D2 (decidir tras convivir con la personalización manual)
- Objetivo   : contadores locales de navegación por sección + sugerencia discreta de agregar una sección muy usada a los accesos. Todo local, sin telemetría (ADN 3).
- Depende de : IN.4a en producción y feedback de Esteban
- Modelo     : decidir al llegar

#### IN.5 - Eliminar "Gasto rápido" (o transformarlo si aporta algo real)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : con las mejoras ya pensadas para el formulario de registrar gasto (categoría primero, categorías inteligentes, ver **TX.9**), el usuario considera que "Gasto rápido" dejó de tener utilidad: mantener dos flujos distintos para prácticamente lo mismo solo añade complejidad. Propone eliminarlo y concentrar todo en un único flujo. Pidió explícitamente analizar antes si existe un beneficio real en conservarlo o si puede transformarse en algo que aporte más valor, en vez de eliminarlo sin más.
- Secciones  : Inicio (dashboard, de donde se accede a Gasto rápido hoy), Gastos (`gastos`)
- Archivos   : sin explorar todavía; ubicar el acceso y el flujo de "Gasto rápido" en el código antes de decidir
- Depende de : **TX.9** (rediseño del formulario de gasto): la decisión de eliminar Gasto rápido tiene más sentido una vez el formulario completo ya sea así de ágil; evaluarlas en el mismo momento, no por separado.
- Modelo     : Sonnet 5 - Bajo (decisión acotada, una vez tomada es sobre todo remover una ruta/acceso y sus tests; el análisis de "vale la pena conservarlo" es la parte que requiere criterio, no volumen de código)

#### IN.6b - Avatar ilustrado del usuario (teja de iniciales + set propio)
- Prioridad  : baja dentro de la iniciativa (última fase)
- Estado     : pendiente (ADR 028 aprobado); bloqueada por diseños de Esteban
- Objetivo   : teja de iniciales por defecto y set de avatares ilustrados propios como `<symbol>` del sprite (Esteban los diseña en Illustrator vía la biblioteca del ADR 026); `S.perfil.avatar` entra en el bump v23. Fotografía descartada en v1 (cupo de `localStorage` compartido con los datos financieros, ADR 028 D3); mascota virtual fuera de alcance. Revisar junto con **CFG.1** si ambas terminan tocando el mismo concepto de "perfil del usuario".
- Secciones  : Inicio, `assets/svg/` (avatares nuevos)
- Archivos   : encabezado de Inicio, `modules/core/state.js` (campo `perfil.avatar`), sprite
- Depende de : diseños de avatares entregados por Esteban
- Modelo     : Sonnet 5 - Medio

_(**IN.7 cerrada** el 2026-07-05: la duplicación puntual que reportó el usuario, un compromiso que vence hoy apareciendo a la vez en "Pendientes del mes" y en "Próximas prioridades", está resuelta, ver CHANGELOG. Queda pendiente, sin tarjeta propia porque ya vive dentro de **CAL.1**/**LIM.1**/**TX.10**, la parte más grande de la idea original: reservar "Próximas prioridades" para recomendaciones anticipadas (distribuir ingreso, crear límite, aportar a fondo/meta, gasto hormiga) en vez de solo vencimientos cercanos.)_

---

### Calendario (dominio `agenda`)

_(Posible ampliación futura sin tarea formal: con AG.4 cerrada, la categoría "Otro" podría ofrecer un ícono personalizado propio además del nombre libre; solo tiene sentido si el usuario lo pide, requeriría un campo `icono` nuevo en el compromiso fijo.)_

_(**CAL.1 cerrada** el 2026-07-05: nudge de distribución del ingreso en Inicio, ver CHANGELOG. Siguiente fase del orden recomendado: **TX.8a**.)_

#### CAL.2 - Leyenda del calendario dinámica (solo tipos de evento que el usuario ya usa)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : la leyenda fija bajo el calendario (día de ingreso, gasto fijo, deuda con entidad, deuda personal...) muestra siempre todas las categorías aunque el usuario no tenga registros de varias de ellas, lo que ocupa espacio innecesario. Propone que la leyenda sea dinámica: solo listar los tipos de evento que el usuario ya registró y que aparecen en su calendario; si más adelante registra un tipo nuevo (deuda personal, meta, apartado), la leyenda se actualiza sola. Mantener color, ícono, estilo y nomenclatura oficiales de cada tipo (coherencia visual con el resto de Finko), sin inventar una presentación nueva.
- Secciones  : Calendario (`agenda`)
- Archivos   : sin explorar todavía; candidato previsible el componente de leyenda del calendario dentro del dominio `agenda` (vista) y la función que ya calcula `eventosDelMes` (mencionada en el historial como base para derivar qué tipos existen en el mes visible)
- Depende de : nada
- Modelo     : Sonnet 5 - Medio (filtrar una leyenda existente contra los eventos ya calculados del mes, sin lógica financiera nueva ni decisión de UX mayor)

---

### Mis cuentas (dominio `tesoreria`)

#### MC.7g (opcional) - Fijos Quincenal/Semanal/Diario en la checklist de Necesidades
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : la checklist de Necesidades (MC.7d, slice 1) solo incluye fijos con frecuencia Mensual: un Quincenal/Semanal/Diario tiene más de una ocurrencia por periodo y una sola fila no puede representarlas sin pagar de más o de menos. Modelar sus vencimientos dentro del periodo (mismo problema que ya resolvió `eventosDelMes` de Agenda) para poder incluirlos.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js` (`construirDesgloseNecesidades`)
- Depende de : nada. Solo tiene sentido si el usuario lo pide: la mayoría de fijos recurrentes de uso diario (arriendo, servicios, suscripciones) ya son Mensuales.
- Modelo     : sin definir

---

### Gastos (dominio `gastos`)

#### TX.8a - Dominio `movimientos` + panel "Actividad reciente" en Inicio
- Prioridad  : media dentro de la iniciativa [ADR 028](DECISIONS/028-inicio-centro-de-control.md) (tercera fase)
- Estado     : pendiente (ADR 028 aprobado)
- Objetivo   : historial general **derivado** de los registros existentes (decisión ADR 028 D5, sin log paralelo): `S.gastos` (los internos `'Deudas'`/`'Gastos fijos'` revelan su origen), `S.ingresosPuntuales` y `S.ahorro.aportes`, normalizados a un shape común por un dominio nuevo `modules/dominio/movimientos/` (`logic.js` puro, testeable; lee `S` sin importar otros dominios, ADN 10 intacto). En Inicio: panel "Actividad reciente" con los últimos 3 a 5 movimientos y enlace "Ver todos". Limitación aceptada v1: metas y apartados no aparecen (sin registros fechados, solo acumuladores); extensión posterior con schema propio. Test guardarraíl que inventaríe las fuentes (mitiga el riesgo de un flujo futuro que cree gastos automáticos sin categoría interna).
- Secciones  : Inicio, dominio nuevo `movimientos`
- Archivos   : `modules/dominio/movimientos/{logic,view,index}.js` (nuevos), `index.html` (contenedor), tests nuevos
- Depende de : recomendada después de CAL.1
- Modelo     : Sonnet 5 - Alto (subir a Opus 4.8 - Alto si al abrir aparecen más fuentes o casos borde que los inventariados en la ficha)

#### TX.8b - Vista completa de Movimientos + Gastos deja de listar categorías internas
- Prioridad  : media dentro de la iniciativa ADR 028 (cuarta fase)
- Estado     : pendiente (ADR 028 aprobado)
- Objetivo   : vista completa del historial en ruta propia (cronológico, con tipo, fecha, ícono, monto, cuenta y dirección ingreso/egreso, colores por sección); `renderListaGastos()` deja de mostrar las categorías internas (`'Deudas'`, `'Gastos fijos'`) para que Gastos quede enfocada en gasto cotidiano (los registros no se tocan: Análisis y Límites siguen leyendo `S.gastos` igual). El resumen financiero (totales ingresos/egresos/variación) **no va en Inicio** (ADR 028 D5, Análisis es el dueño); un encabezado compacto del mes dentro de esta vista se decide aquí.
- Secciones  : Inicio/Movimientos, Gastos
- Archivos   : `modules/dominio/movimientos/` (vista completa + ruta), `modules/dominio/gastos/view.js` (filtro de internas), tests
- Depende de : TX.8a
- Modelo     : Sonnet 5 - Alto

#### TX.9 - Formulario de gasto: categoría primero, categorías personalizadas, sin descripción redundante
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : rediseñar el formulario de registrar gasto para que sea más rápido e intuitivo. Brief completo del usuario (verbatim, 2026-07-05):
  1. **Categoría primero**: hoy aparece después de otros campos; debería ser el primer dato, porque de ella depende el ícono, reglas específicas, detección de estilo de vida/gasto hormiga/gasto fantasma, y el resto del formulario debería adaptarse según la categoría elegida.
  2. **Categorías personalizadas ("Otra categoría")**: al elegirla, aparecen un selector de ícono y un campo de nombre; una vez creada, se guarda para usos futuros y se comporta exactamente igual que una categoría nativa.
  3. **Eliminar la descripción redundante**: si la categoría ya representa el concepto (ej. "Gimnasio" con descripción "Gimnasio"), pedir descripción duplica esfuerzo sin valor. Propone que la categoría sea el concepto principal y que exista un campo **Nota** opcional al final del formulario para detalle adicional (ej. categoría "Restaurante", nota opcional "Cena con mi familia").
- Secciones  : Gastos (`gastos`)
- Archivos   : sin explorar todavía; candidato previsible el formulario de registrar gasto en `modules/dominio/gastos/` (vista) y el catálogo `CATEGORIA_*_ICONO`/`CATEGORIA_*_EMOJI` en `modules/core/constants.js` para la categoría personalizada (nueva entrada por usuario, no solo del catálogo fijo: revisar si el modelo de datos soporta categorías creadas por el usuario o hay que agregarlo con migración de schema)
- Depende de : nada. Las categorías personalizadas son dato nuevo del usuario (persistido en `localStorage`): requiere bump de schema (regla ADN 6, migraciones idempotentes) si no existe ya un slot para eso.
- Modelo     : Sonnet 5 - Alto (rediseño de formulario acotado a un dominio, con una pieza de dato nuevo (categoría personalizada) que exige migración de schema cuidadosa, pero sin lógica financiera compleja)

#### TX.10 - Categoría como eje de automatización (límites, gastos hormiga/fantasma, recomendaciones)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario quiere que la categoría deje de ser solo organización visual y se convierta en la base de la que Finko deriva automatizaciones: clasificar el gasto, relacionarlo con Límites de gasto, detectar gastos hormiga/fantasma, alimentar Análisis, generar recomendaciones y sugerir acciones, integrándose con Dashboard, Calendario y el resto de módulos.
- Secciones  : Gastos (`gastos`), transversal (toca Límites/`presupuesto`, Análisis/`analisis`, Inicio)
- Archivos   : sin explorar todavía
- Depende de : es más un principio transversal que una tarea única; se solapa fuerte con **LIM.1** (recomendaciones de límite por categoría) y **ANL.1** (recomendaciones accionables en Análisis). Al iniciar cualquiera de las tres, revisar juntas para no construir 3 motores de "sugerencia por categoría" distintos (regla de "sin duplicados" de 2.1); probablemente conviene resolver esta como una pieza de infraestructura compartida (ej. un helper en `infra` que analiza patrones de gasto por categoría) que las demás consumen.
- Modelo     : Fable 5 - Alto (pieza de infraestructura transversal que varias iniciativas van a consumir; decidir mal el diseño aquí se replica en LIM.1, ANL.1 y futuras)

---

### Deudas (dominio `compromisos`, deuda)

_(sin pendientes activos.)_

---

### Apartados (dominio `apartados`)

_(sin pendientes activos.)_

---

### Metas (dominio `metas`)

_(sin pendientes activos.)_

---

### Ahorro (dominio `ahorro`, fondo de emergencia)

_(sin pendientes activos.)_

---

### Inversión (dominio `inversiones`)

_(sin pendientes activos.)_

---

### Límites de gasto (dominio `presupuesto`)

_(Nota vigente: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

#### LIM.1 - Límites solo para Estilo de vida + recomendaciones inteligentes + seguimiento motivador
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario concluyó, tras analizar la sección, que Necesidades y Ahorro no deberían tener límite de gasto (Necesidades son obligatorias, no tiene sentido limitarlas; Ahorro por encima de lo previsto es positivo y merece reconocimiento, no advertencia). Propone que Límites se enfoque solo en Estilo de vida. Brief completo del usuario (verbatim, 2026-07-05):
  1. **Limitar únicamente Estilo de vida**: restaurantes, café, domicilios, streaming, compras impulsivas, ropa, tecnología, entretenimiento, viajes, salidas, transporte no esencial, belleza, hobbies y cualquier gasto no básico. Pidió explícitamente evaluar esta propuesta desde UX/UI y comportamiento financiero, y proponer alternativa si hay una mejor.
  2. **Solo categorías que el usuario ya usa**: al crear un límite, mostrar únicamente categorías donde ya registró al menos un gasto (no las ~40 categorías del catálogo completo), para no aumentar la carga visual con opciones nunca usadas.
  3. **Recomendaciones inteligentes proactivas**: si detecta gasto frecuente o creciente en una categoría de Estilo de vida sin límite (ej. varios gastos en restaurantes este mes), sugerir crear un límite ("Hemos notado que... ¿te gustaría crear un límite?").
  4. **Integración con el Dashboard (Inicio)**: mostrar ahí mismo sugerencias discretas y oportunas (ej. "Aún no has definido un límite para restaurantes", "Este mes gastaste más de lo habitual en entretenimiento"); nunca invasivas ni constantes.
  5. **Seguimiento y retroalimentación durante el mes**: porcentaje usado del límite, cuánto queda disponible, comparación con meses anteriores, si va bien o debería moderar; y mensajes positivos de refuerzo cuando el usuario se mantiene dentro del límite (no solo advertencias cuando se excede).
  El usuario pidió explícitamente analizar si esta propuesta es la mejor solución de UX/UI y finanzas personales, con libertad de proponer una alternativa mejor y justificarla.
- Secciones  : Límites de gasto (`presupuesto`), transversal (categorías con gasto real vienen de `gastos`; sugerencias en Dashboard tocan Inicio, posible relación con IN.4 si esa personalización de accesos ya existe cuando se trabaje esto)
- Archivos   : sin explorar todavía; candidatos previsibles `modules/dominio/presupuesto/logic.js` (regla actual de qué grupos entran a Límites, hoy probablemente incluye Necesidades/Ahorro/Estilo de vida los 3) y el picker de categorías al crear un límite
- Depende de : nada directo, pero conviene revisar junto con IN.4 (accesos personalizables del Dashboard) si ambas están activas a la vez, ya que las sugerencias de LIM.1 en Inicio comparten espacio con esa iniciativa (evitar diseñar dos mecanismos de "sugerencia en Dashboard" por separado)
- Modelo     : primer paso (análisis de la propuesta de restringir a Estilo de vida + diseño del picker de categorías usadas + mecánica de sugerencias) con **Sonnet 5 - Alto** (cambio de alcance acotado a un dominio ya maduro, con patrón de recomendación ya usado en la app, ej. MC.6c "señales más ricas para la distribución automática"); el motor de detección proactiva (recomendación 3) y su integración con Inicio (recomendación 4), si resultan multidominio, podrían justificar subir a Opus 4.8 - Alto al iniciar, evaluar entonces

---

### Me deben (dominio `personales`)

_(sin pendientes activos.)_

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
  8. **Coherencia visual con el resto de Finko**: mismos colores por sección, iconos propios (Finko Icons v2), tipografía, espaciados, jerarquía, animaciones y componentes reutilizables (nada nuevo que rompa el sistema de diseño existente).
  El usuario pidió explícitamente analizar la sección completa antes de implementar cualquier cambio, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.
- Secciones  : Análisis (dominio `analisis`); probable relación con Presupuesto (límites), Ahorro (fondo/metas), Compromisos (deudas) y Gastos, ya que las recomendaciones cruzan esos dominios (vía datos ya calculados, no importando entre dominios, ADN 10)
- Archivos   : sin explorar todavía en profundidad; punto de partida `modules/dominio/analisis/` (lógica y vista) y estilos ya mencionados en memoria (paleta unificada dona/barras, `style(analisis)` en el historial); requiere ficha de contexto nueva en `docs/contexto/` si no existe
- Depende de : nada. Alcance grande y multicapa (lógica, copy, layout, jerarquía visual, posible engine de recomendaciones): al iniciar, dividir en subtareas verificables por separado (regla 2.1), por ejemplo ANL.1a auditoría de qué gráficos se quedan/simplifican/eliminan, ANL.1b glosario en lenguaje simple + explicación de 3 preguntas por gráfico, ANL.1c reestructura de layout (Bento/scroll), ANL.1d motor de recomendaciones accionables, ANL.1e progressive disclosure (plegables/pestañas/filtros)
- Modelo     : primer paso (auditoría UX completa de la sección + propuesta de qué se simplifica/reorganiza/elimina) con **Fable 5 - Alto** (revisión de UX/UI de una sección entera con trade offs no obvios entre profundidad analítica y simplicidad, riesgo real de regresión si se elimina algo que el usuario sí usaba); subtareas de implementación posteriores pueden bajar a Sonnet 5 - Alto una vez la decisión esté tomada

---

### Configuración (dominio `config`)

_(Brief completo del usuario sobre Ajustes, 2026-07-05: 6 ideas registradas abajo (CFG.1 a CFG.6). **No iniciar ninguna sin instrucción explícita**: solo quedan anotadas para retomar más adelante. Cuando se trabajen, revisar primero si comparten piezas (ej. CFG.1 y CFG.2 tocan el mismo bloque de perfil del usuario en Ajustes; podrían consolidarse en una sola pasada de diseño aunque se implementen por separado, regla de "sin duplicados" de 2.1).)_

#### CFG.1 - Perfil financiero en vez de mostrar el salario
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy el encabezado de Ajustes muestra nombre + salario registrado; el usuario considera que el salario ahí no aporta valor. Propone reemplazar ese espacio por una configuración de perfil financiero vía preguntas (situación laboral, tipo de ingresos, frecuencia de pago, responsabilidades económicas, personas a cargo, objetivos financieros, nivel de conocimiento financiero, tolerancia al riesgo para inversiones, entre otras). Pidió explícitamente analizar qué información aporta valor real y evitar pedir datos innecesarios: no implementar la lista tal cual sin criba.
- Secciones  : Configuración (Ajustes)
- Archivos   : sin explorar; candidatos previsibles el módulo `config` (encabezado de perfil) y `modules/core/state.js` (campos nuevos + migración de schema)
- Depende de : nada. Posible solape con CFG.2 (ambas tocan el bloque de perfil de Ajustes): revisar juntas al iniciar.
- Modelo     : Opus 4.8 - Alto (decisión de qué preguntas aportan valor sin sobrecargar el onboarding; roza filosofía de producto, no es solo CRUD)

#### CFG.2 - Perfil fiscal inteligente (detección automática de obligación de declarar renta)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : reemplazar la indicación manual de "debo declarar renta" por un análisis automático de los datos ya registrados en Finko (ingresos, patrimonio, consumos, movimientos, compras, transferencias) contra los topes vigentes (UVT, `constants.js`), mostrando un mensaje explicando el motivo concreto (tope de ingresos superado, tope de patrimonio, tope de consumos, u otro criterio aplicable) y actualizándose solo conforme cambian las finanzas del usuario.
- Secciones  : Configuración (Ajustes), transversal (lee datos de varios dominios: tesorería, gastos, inversiones)
- Archivos   : sin explorar; probablemente nueva lógica en un `logic.js` de `config` o `analisis`, constantes de topes de renta en `modules/core/constants.js` (revisar si ya existen o hay que agregarlas con fecha de revisión, regla ADN 12)
- Depende de : nada. Ojo: ningún dominio importa a otro (ADN 10); si necesita datos de tesorería/gastos/inversiones tiene que ser vía EventBus o agregando en el propio dominio `config`, no importando directo.
- Modelo     : Opus 4.8 - Alto (lógica financiera CO no trivial: topes de renta por UVT/ingresos/patrimonio, exactamente el tipo de caso que CLAUDE.md 2.3 reserva para Opus)

#### CFG.3 - Notificaciones inteligentes anticipatorias
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy el recordatorio existente solo avisa al abrir la app; el usuario quiere alertas que se anticipen a eventos (día de pago hoy, deuda vence mañana, pago con 2 días de atraso, cerca de superar presupuesto de una categoría, meta de ahorro alcanzada, aporte recomendado de la semana, apartado próximo a vencer). Pidió explícitamente que sean útiles y no invasivas: solo cuando realmente ayuden a decidir mejor.
- Secciones  : Configuración (Ajustes, activación), transversal (agenda, presupuesto, metas, apartados, compromisos como fuentes de los eventos)
- Archivos   : sin explorar; depende de si Finko ya usa alguna API de notificaciones del navegador/PWA (revisar `modules/infra/notificaciones.js` y el service worker) o si hay que incorporar Push API / Notification API, lo cual tiene restricciones de permisos y de plataforma (iOS Safari limita notificaciones push de PWA)
- Depende de : nada. Riesgo técnico a evaluar primero: viabilidad real de notificaciones push offline-first sin servidor (ADN 2 y 3); puede requerir ADR si la solución técnica choca con "sin servidor".
- Modelo     : Fable 5 - Alto (multidominio, con una restricción técnica de plataforma no trivial que hay que investigar antes de diseñar)

#### CFG.4 - Respaldo y recuperación de la información
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar). **Toca potencialmente el ADN del proyecto** (reglas 2 y 3: offline-first, sin servidor): requiere ADR y discusión explícita antes de cualquier código, por instrucción directa de CLAUDE.md sección 3.
- Objetivo   : hoy solo existe exportar a JSON/CSV manual; el usuario teme perder todo el historial si pierde el teléfono, cambia de equipo, desinstala o formatea. Pidió analizar alternativas (copias de seguridad automáticas, sincronización con cuenta de usuario, respaldo cifrado en la nube, restauración desde archivo, u otra) que sean seguras, sencillas y transparentes, sin comprometer la privacidad.
- Secciones  : Configuración (Ajustes), transversal (afecta el modelo entero de datos en `localStorage`)
- Archivos   : sin explorar; el punto de partida real es la decisión arquitectónica, no el código
- Depende de : nada. Explícitamente en tensión con ADN 2/3 (sin servidor, offline-first): cualquier opción con nube o cuenta de usuario es un cambio de ADN y necesita ADR propio antes de tocar una sola línea; una opción como "exportar/restaurar archivo cifrado local" sí calzaría sin tocar el ADN.
- Modelo     : Fable 5 - Extra (decisión arquitectónica que puede rozar el ADN del proyecto; exige el nivel de análisis más alto antes de proponer nada)

#### CFG.5 - Seguridad de acceso a la app (PIN, patrón, contraseña, biometría)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : agregar un método de bloqueo elegible por el usuario (PIN numérico, patrón, contraseña, huella o reconocimiento facial si el dispositivo lo permite) para proteger la información financiera si el dispositivo se pierde o lo roban.
- Secciones  : Configuración (Ajustes)
- Archivos   : sin explorar; biometría real depende de WebAuthn/Credential Management API (soporte y UX varían por navegador/SO); un PIN/patrón simple se puede resolver 100% client side sin APIs nuevas
- Depende de : nada. Viabilidad técnica de biometría en PWA (no app nativa) hay que verificarla antes de prometerla en el diseño.
- Modelo     : Opus 4.8 - Alto (decisión de qué mecanismos son viables en PWA vs. cuáles prometer a futuro; UX de bloqueo con riesgo de dejar al usuario fuera de sus propios datos si algo falla)

#### CFG.6 - Revisión general de la sección Ajustes
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario pidió revisar si faltan configuraciones que deberían vivir en Ajustes, con el objetivo de que la sección se convierta en el centro de configuración de Finko (seguridad, personalización, notificaciones, respaldo y cualquier otra opción relevante), con interfaz clara y organizada.
- Secciones  : Configuración (Ajustes)
- Archivos   : sin explorar
- Depende de : CFG.1 a CFG.5 (esta es la pasada de auditoría/orden final, tiene sentido hacerla después o junto con las demás, no antes)
- Modelo     : Sonnet 5 - Alto (auditoría de una sección existente con criterio de UX, sin lógica financiera nueva)

---

## Transversal (afecta varias secciones)

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
