# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-07-05.

---

## En proceso

_(sin tarea activa. Máximo 1 tarjeta aquí a la vez, regla de oro de `/CLAUDE.md` sección 2.1.)_

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

_(Filosofía general del Inicio, brief del usuario 2026-07-05: en menos de 5 segundos el usuario debe saber qué debe hacer hoy, qué puede olvidar si no actúa, qué está haciendo bien, qué requiere atención y qué recomendaciones tiene Finko; toda la información debe orientarse a la acción y priorizarse por importancia, no solo mostrar datos. Esta filosofía atraviesa **IN.4** (accesos personalizables), **IN.5** a **IN.7** de abajo, y también **CAL.1** (aviso de ingreso) y **TX.8** (apartado Movimientos), todas pendientes de análisis conjunto por tocar el mismo espacio.)_

#### IN.4 - Dashboard personalizable: accesos rápidos según prioridades del usuario
- Prioridad  : sin definir (registrada para más adelante, no empezar aún)
- Estado     : pendiente de análisis (no iniciar sin luz verde explícita del usuario)
- Objetivo   : el Inicio hoy impone 3 accesos rápidos fijos elegidos por diseño inicial; el usuario observó que la prioridad real varía por persona (quien paga deudas quiere Deudas primero, quien ahorra quiere Metas/Ahorro, quien registra gasto a diario quiere Gastos, quien administra negocio quiere Mis cuentas). Brief completo del usuario (verbatim, 2026-07-05):
  1. **Inicio fijo, accesos personalizables**: la pantalla Inicio nunca se mueve ni se quita; solo los accesos rápidos (hoy 3 fijos) pasan a ser elegibles por el usuario.
  2. **Personalización sencilla**: mantener presionado para reordenar, botón "Personalizar Inicio", arrastrar y soltar, elegir de una lista. Sin configuración compleja, análogo a organizar iconos de un teléfono.
  3. **Priorizar según el uso (opcional, fase posterior)**: Finko podría detectar qué secciones abre más el usuario y sugerir agregarlas a accesos rápidos ("Hemos notado que consultas frecuentemente Deudas. ¿Quieres agregarla a tus accesos rápidos?"), pero la decisión final siempre es manual del usuario. Requiere trackear frecuencia de navegación, algo que hoy no existe en `state.js`.
  4. **Consistencia**: la navegación general (bottom nav, rutas) no cambia; solo se personalizan accesos rápidos y algunos elementos del Dashboard.
  5. **Escalabilidad**: el diseño debe soportar secciones/módulos nuevos a futuro sin rediseñar el mecanismo de personalización.
  El usuario pidió explícitamente: analizar la mejor forma de implementarlo con buenas prácticas de UX/UI, sin aumentar la complejidad percibida, y proponer una solución mejor si existe una más efectiva que la descrita.
- Secciones  : Inicio (dashboard), transversal (posible campo nuevo en `state.js` para preferencias de accesos rápidos y, si se hace la fase de aprendizaje, contadores de uso por sección)
- Archivos   : sin explorar todavía; candidatos previsibles `modules/dominio/resumen/` (o donde viva hoy Inicio, confirmar en `docs/MAPA.md`), `modules/core/state.js` (nuevo campo + migración de schema), `modules/ui/shell.js` o similar (render de accesos rápidos), CSS de layout de Inicio
- Depende de : nada. **No iniciar sin instrucción explícita**: el usuario pidió solo registrar la idea por ahora.
- Modelo     : primer paso (análisis + ficha de contexto de Inicio si no existe + propuesta de diseño/ADR) con **Fable 5 - Alto** (feature multidominio con trade offs no obvios: personalización manual vs. sugerencia por uso, migración de schema, invariante "Inicio fijo" que no puede romperse); implementación posterior, ya con decisión tomada, puede bajar a Sonnet 5 - Alto por subtarea siguiendo el patrón de división de 2.1 (ej. IN.4a estructura de datos + reorder manual, IN.4b UI de arrastrar/soltar, IN.4c sugerencia por uso como fase opcional)

#### IN.5 - Eliminar "Gasto rápido" (o transformarlo si aporta algo real)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : con las mejoras ya pensadas para el formulario de registrar gasto (categoría primero, categorías inteligentes, ver **TX.9**), el usuario considera que "Gasto rápido" dejó de tener utilidad: mantener dos flujos distintos para prácticamente lo mismo solo añade complejidad. Propone eliminarlo y concentrar todo en un único flujo. Pidió explícitamente analizar antes si existe un beneficio real en conservarlo o si puede transformarse en algo que aporte más valor, en vez de eliminarlo sin más.
- Secciones  : Inicio (dashboard, de donde se accede a Gasto rápido hoy), Gastos (`gastos`)
- Archivos   : sin explorar todavía; ubicar el acceso y el flujo de "Gasto rápido" en el código antes de decidir
- Depende de : **TX.9** (rediseño del formulario de gasto): la decisión de eliminar Gasto rápido tiene más sentido una vez el formulario completo ya sea así de ágil; evaluarlas en el mismo momento, no por separado.
- Modelo     : Sonnet 5 - Bajo (decisión acotada, una vez tomada es sobre todo remover una ruta/acceso y sus tests; el análisis de "vale la pena conservarlo" es la parte que requiere criterio, no volumen de código)

#### IN.6 - Personalizar el Inicio: saludo dinámico + foto/avatar del usuario
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario quiere que Inicio se sienta más personal: nombre del usuario arriba con saludo dinámico según la hora ("Buenos días/tardes/noches, [nombre]"), y la posibilidad de personalizar el perfil con una fotografía, un avatar, un personaje ilustrado, una mascota virtual o cualquier elemento con el que el usuario se identifique, para generar conexión emocional con la app.
- Secciones  : Inicio (dashboard)
- Archivos   : sin explorar todavía; candidato previsible el encabezado de Inicio y el dato de nombre del usuario ya existente en `state.js` (revisar si ya hay algo de perfil, y si CFG.1 termina generando un bloque de "perfil" compartido con Ajustes)
- Depende de : nada directo, pero revisar junto con **CFG.1** (perfil financiero en Ajustes) si ambas terminan tocando un mismo concepto de "perfil del usuario", para no duplicar dónde vive esa información.
- Modelo     : Sonnet 5 - Medio (saludo dinámico es trivial; la selección de avatar/foto añade decisiones de UX y de almacenamiento, ej. cuánto pesa una foto en `localStorage`, pero sigue siendo un dominio acotado)

#### IN.7 - Evitar información duplicada entre "Pendientes del mes" y "Próximas prioridades"
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario detectó que un mismo gasto fijo que vence hoy aparece a la vez en "Pendientes del mes" y en "Próximas prioridades", duplicando la información. Propone que cada bloque tenga una función claramente diferenciada: "Pendientes del mes" para obligaciones próximas a vencer (donde el usuario ya espera encontrarlas), y "Próximas prioridades" reservado para acciones que aún no son urgentes pero conviene preparar con anticipación (distribuir el ingreso cuando llegue la quincena, crear un límite donde se gasta mucho, aumentar el aporte al fondo de emergencia, revisar una meta atrasada, detectar un gasto hormiga, recomendaciones inteligentes de Finko).
- Secciones  : Inicio (dashboard)
- Archivos   : sin explorar todavía; candidato previsible el módulo que arma ambos bloques del Inicio (probablemente `modules/dominio/resumen/`), revisar el criterio actual de qué entra en cada uno
- Depende de : nada directo, pero el rediseño de "Próximas prioridades" con recomendaciones inteligentes se solapa con **LIM.1** (sugerir límite por categoría), **TX.10** (categoría como eje de recomendaciones) y **CAL.1** (aviso de ingreso); revisar juntas al iniciar para no repetir el mismo criterio de "qué es una prioridad" en varios sitios.
- Modelo     : Sonnet 5 - Medio (separar un criterio de pertenencia entre dos bloques ya existentes; sube a Alto si al implementarla se decide sumar ya las recomendaciones inteligentes de la lista de ejemplos, en vez de solo des-duplicar)

---

### Calendario (dominio `agenda`)

_(Posible ampliación futura sin tarea formal: con AG.4 cerrada, la categoría "Otro" podría ofrecer un ícono personalizado propio además del nombre libre; solo tiene sentido si el usuario lo pide, requeriría un campo `icono` nuevo en el compromiso fijo.)_

#### CAL.1 - Mover el aviso de distribución del ingreso a Inicio (centro de prioridades)
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : el usuario concluyó que el aviso de distribuir el ingreso (hoy en Calendario) no está en el lugar correcto: la distribución del ingreso es de las acciones más importantes de Finko y debería vivir en Inicio, que debe convertirse en un verdadero centro de prioridades y acciones inmediatas (no solo el aviso de ingreso, sino cualquier cosa que requiera atención: deuda que vence hoy/mañana, gasto fijo por vencer, cerca de superar un límite, aporte pendiente a meta/fondo, gastos rápidos por organizar, apartado próximo a vencer). Calendario, en cambio, pasa a enfocarse solo en la planificación temporal (cuándo ocurren los eventos), sin concentrar las alertas más importantes. El usuario pidió explícitamente evaluar si hay una forma más intuitiva de repartir responsabilidades entre Inicio y Calendario, y proponerla si existe.
- Secciones  : Calendario (`agenda`, retira el aviso), Inicio (recibe el aviso y se convierte en centro de prioridades más amplio)
- Archivos   : sin explorar todavía; candidatos previsibles el recordatorio de día de ingreso (ADR 021, `AP.4`/`MT.2`/`AH.4` en el historial) hoy renderizado en Calendario, y el módulo de Inicio que tendría que absorber esta y otras alertas
- Depende de : relación directa con **IN.4** (dashboard personalizable): si Inicio pasa a mostrar múltiples tipos de aviso (ingreso, deudas, límites, metas, apartados), conviene decidir junto con IN.4 cómo conviven las alertas fijas de "centro de prioridades" con los accesos rápidos personalizables, para no diseñar dos sistemas de tarjetas de Inicio por separado
- Modelo     : Opus 4.8 - Alto (mover una pieza central de la app entre dos secciones y redefinir el rol de Inicio como centro de prioridades es una decisión de arquitectura de información, no un cambio cosmético; conviene revisarla junto con IN.4)

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

#### TX.8 - Gastos muestra solo sus propios movimientos; nuevo "Movimientos" en Inicio
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy Gastos mezcla sus propios registros con movimientos de otras secciones (deudas, ahorro, metas, apartados, calendario, ingresos), lo que dificulta encontrar lo que se busca. Propone que Gastos muestre únicamente los gastos registrados desde esa sección, y que todo lo demás (pagar una deuda, aportar a una meta, recibir un ingreso, aportar a un apartado, pagar un fijo, recuperar un préstamo, distribuir el ingreso) viva en un apartado nuevo del **Inicio** llamado "Movimientos": un historial cronológico general de toda la actividad de la app. El usuario pidió explícitamente evaluar si esta separación mejora la experiencia o si hay una alternativa más eficiente.
  **Detalle ampliado (brief de Inicio, 2026-07-05):** cada movimiento debe indicar tipo, fecha y hora, categoría, ícono asociado, monto, cuenta/entidad involucrada y si es ingreso o egreso; diferenciados visualmente con los colores e íconos ya definidos por sección para identificarse de un vistazo. Además, propone (a evaluar, no decidido) un pequeño resumen financiero junto al historial: total de ingresos, total de egresos, total ahorrado, total destinado a deudas, variación respecto al período anterior. El usuario pidió explícitamente analizar si ese resumen aporta valor en Inicio o si debería quedarse solo en Análisis, priorizando no sobrecargar la pantalla (posible solape con **ANL.1**).
- Secciones  : Gastos (`gastos`, se acota su lista), Inicio (nuevo apartado "Movimientos" que agrega actividad de todos los dominios, con resumen financiero opcional a decidir)
- Archivos   : sin explorar todavía; probablemente hoy Gastos ya lee/combina registros de varios dominios en su vista, revisar `modules/dominio/gastos/` (vista y lógica) y qué helper (si existe) ya consolida "todo lo que pasó" para no duplicar esa función
- Depende de : relación directa con **IN.4** (dashboard personalizable) y **CAL.1** (aviso de distribución de ingreso a Inicio): las tres tocan qué vive en Inicio y podrían compartir el mismo bloque de "actividad reciente"; conviene revisarlas juntas para no diseñar tres mecanismos de tarjetas de Inicio por separado. El resumen financiero se solapa con **ANL.1** (evitar decidir dos veces dónde vive cada indicador). Ningún dominio importa a otro (ADN 10): un historial cruzando todos los dominios necesita EventBus o agregación en un dominio propio (`resumen`, que ya centraliza el Inicio hoy).
- Modelo     : Opus 4.8 - Alto (reorganizar de dónde vive la información entre dos secciones es una decisión de arquitectura de información con riesgo real de regresión si algún flujo hoy depende de ver esos movimientos mezclados en Gastos)

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
