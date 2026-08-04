# Tablero - Mis cuentas

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2"** (briefs 2026-07-08). Fuente única de la sección. Solo sigue abierto **MC.13** (Distribución v2); MC.16/17/18 cerrados. **Conflicto (b) del brief, abierto:** "el ingreso fijo se abona solo sin confirmación" es el mismo problema de filosofía de PA.1, se decide en ESE ADR y no por separado.

#### MC.13 - Distribución v2: contextual por fecha, guiada y con origen real del dinero
- Prioridad  : alta
- Estado     : **el motor está completo y en producción** ([ADR 041](../DECISIONS/041-motor-vencimientos-y-distribucion-v2.md), aceptado parcialmente, con su diseño completo dentro); el asistente está a mitad de rediseño. Sigue abierta **MC.13e-2g**, abajo, la última del rediseño. **MC.13e-2c, MC.13e-2d y MC.13e-2f (sus dos mitades) cerradas** (ver CHANGELOG).
- Objetivo   : responder "¿qué debo hacer HOY con este dinero?" en vez de mostrar todo el mes. Diseño completo y regla vigente del motor (`infra/vencimientos.js`, única tabla de frecuencias del proyecto) en [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md), sección "Distribución v2".
- Secciones  : Mis cuentas (`tesoreria/logic/distribucion.js`, `views/distribucion.js`, `acciones/distribucion.js`)
- Depende de : nada (la decisión (a) ya está resuelta); coordinar con PA.1 (conflicto (b), independiente)
- Modelo     : cada rebanada MC.13e-2 lleva el suyo (ver abajo)

> **Rebanadas de MC.13e-2**, re-cortadas por riesgo e independencia (regla 2.1). El mapa del asistente (qué función vive en qué archivo, con líneas) es la tabla de anclas de [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md): leerla antes de iniciar cualquiera de estas rebanadas.

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

#### MC.17f - Deshacer o editar una transferencia (hueco de integridad)
- Prioridad  : media
- Estado     : pendiente de análisis. **Revisa el cierre de MC.17 como "completa"** (regla 2.7: decirlo, no corregirlo en silencio). Hallazgo de la auditoría de UX/producto.
- Objetivo   : una transferencia no se puede editar ni revertir hoy; un error de cuenta o monto descuadra dos saldos a la vez sin salida dentro de la app (patrón P3, agravado). Diseño recomendado (deshacer con rastro, no borrado silencioso) y el cuidado del GMF en [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, Movimientos (rastro)
- Depende de : coordinar con **MOV.1** (si el ledger gana acciones por fila, "deshacer transferencia" es una de ellas y no necesita UI propia en Mis cuentas)
- Modelo     : Alta capacidad - Alto (dinero en dos cuentas + GMF; una reversa mal hecha descuadra el patrimonio)
