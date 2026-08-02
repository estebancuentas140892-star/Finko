# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver la skill `cerrar-tarea`).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Contexto técnico por sección (dónde vive cada funcionalidad): ver [`contexto/`](contexto/README.md).
> Última actualización: 2026-08-02 (IN.9e cierra: pieza de escritorio de tres pasos para el estado vacío del hero, `.hero-guia__escritorio`, junto a la guía móvil intacta; copy provisional, PI5; cierra la iniciativa **IN.9** completa; el código ya estaba en el árbol desde el commit `ab8c9a1`, este cierre solo pone el tablero al día). Antes: 2026-08-02 (MC.13c-3 cierra: `ultimoVencimientoHasta` en el motor data el ultimo cobro de las seis frecuencias con dia del mes, y un ingreso Bimestral a Anual gana su guard de de-duplicacion; Semanal y Diario quedan fuera por modelo de datos, ver el ADR 041 D2; su tarjeta sale del tablero). Antes: 2026-08-02 (EDIT.1 cierra la rebanada Inversión: tipo, nombre, monto, tasa, plazo y fecha se editan sin recrear la inversión; con cuenta de origen, el monto editado ajusta el saldo por delta, ADR 053 I3; Me deben es la última rebanada pendiente de la misma tarjeta, que no sale del tablero). Antes: 2026-08-02 (ARQ.2 cierra puntos 1 y 2: `FACTOR_MENSUAL` con fuente única en `infra/financiero.js` y el helper `infra/pago-compromiso.js` que sustituye las 4 copias de "registrar pago de compromiso"; punto 3 se deja documentado sin tocar por decisión de Esteban, ver `contexto/transversal.md`; su tarjeta sale del tablero). Antes: 2026-08-02 (UPD.1 cierra: aviso discreto + botón cuando el SW no pudo recargar solo, y resumen de novedades una sola vez tras actualizar; su tarjeta sale del tablero). Antes: 2026-08-02 (EDIT.1 cierra la rebanada Apartados: nombre, ícono, monto objetivo, fecha y nota se editan sin recrear el apartado; Inversión y Me deben siguen pendientes de la misma tarjeta, que no sale del tablero). Antes: 2026-08-01 (PERF.7c cierra: warm-up en `requestIdleCallback` del bundle memoizado de Análisis y de `movimientosCompletos`; cierra **PERF.7** completo). Antes: 2026-08-01 (DV.2c cierra: cascada acotada de listas, resaltado de fila nueva y retiro de `empty-orbit`/`empty-float`; su tarjeta sale del tablero). Antes: 2026-08-01 (DV.2b cierra: pipeline de sprite extendido a `assets/svg/decoracion/`, clase `.decor` + patrón `.pattern-dots`, piloto en 2 heroes y 2 empty states; su tarjeta sale del tablero). Antes: 2026-08-01 (DV.2a cierra: escala de elevación de 4 niveles y `--fk-grad-identity` consolidado en los 6 heroes que lo copiaban a mano; el código ya estaba en el árbol desde el commit `d8a7d53` del 2026-07-31, este cierre solo pone el tablero al día; DV.2b queda desbloqueada sin depender de nada). Antes: 2026-08-01 (MC.13e-2f-2 cierra: el remanente del asistente exige decisión explícita antes de confirmar, punto 18 del brief; con ella cierra **MC.13e-2f** completa y del rediseño del asistente solo queda MC.13e-2g). Antes: 2026-08-01 (IN.9d cierra: Accesos rápidos gana fila propia y Actividad reciente se empareja con Resumen semanal en la fila final 6+6, ADR 057 D4; cierra la iniciativa IN.9 salvo IN.9e). Antes: 2026-08-01 (MC.13e-2c cierra: logo/ícono + nota por fila en el asistente de distribución; la nota de una deuda es lo único que faltaba, el resto ya estaba en el árbol desde `132b0b5`; su tarjeta sale del tablero). Antes: 2026-08-01 (IN.9d corrige estado: el ADR 057 D4 ya cubre su decisión, dejaba de estar "requiere ADR" desde el 2026-07-31 y el tablero no lo reflejaba). Antes: 2026-08-01 (IN.9c cierra: la columna propia del detalle por cuenta en escritorio, ADR 057 D3; el código ya estaba en el árbol desde el commit `ab8c9a1`, este cierre solo pone el tablero al día). Antes: 2026-07-31 (MC.16e cierra: la tarjeta avisa su costo en avance, sobrecupo y abono parcial; con ella cierra **MC.16** completa y el ADR 051 queda ejecutado). Antes: 2026-07-31 (IN.9b cierra: 8 filas de actividad en escritorio y 5 en móvil; su tarjeta sale del tablero). Antes: 2026-07-31 (IN.9a cierra: los dos avisos de "Atención hoy" comparten fila y su tarjeta sale del tablero). Antes: 2026-07-31 (handoff de la auditoría de navegación global: nace la iniciativa **IN.9 "Inicio en escritorio"** con cinco rebanadas, e **INT.1** registra la barra superior de escritorio, que bloquea ID4 e ID7. Inicio sale de "Secciones sin tarjetas pendientes"). Antes: 2026-07-30 (MC.16c cierra: bloque de tarjetas de crédito en Mis cuentas, solo lectura; su tarjeta sale del tablero). Antes: 2026-07-30 (MC.16d cierra: el consumo con tarjeta pregunta a cuántas cuotas y sube `cuotaMensual`; su tarjeta sale del tablero). Antes: 2026-07-30 (ADR 033 aceptado en P1, P2, P3 y P5: DV.2a, DV.2b y DV.2c quedan desbloqueadas, DV.2d sigue bloqueada por P4 y por la cola de diseño). Antes: 2026-07-30 (MC.16a cierra: la tarjeta de crédito gana su cupo y su tarjeta sale del tablero; MC.16b queda desbloqueada). Antes: 2026-07-29 (INV.1 cierra: el dinero sale de una cuenta al registrar una inversión, y su tarjeta sale del tablero). Antes: DIS.19 cierra el frente de Ahorro y deja dos piezas de ARQ.1 ya en `infra/`; no tenía tarjeta propia, entró por handoff de diseño. Antes: 2026-07-27 (CAT.1 cierra: la taxonomía global queda implementada en las tres secciones y su tarjeta sale del tablero). Antes: MC.16 deja de estar bloqueada, el ADR 051 se acepta y la tarjeta se re-corta en MC.16a a MC.16e. La historia de lo ya cerrado vive en [`CHANGELOG.md`](CHANGELOG.md) y en las fichas de [`contexto/`](contexto/README.md), no aquí.

---

## En proceso

### CFG.6 - Revision general de la seccion Ajustes (alcance acotado: 2 y 3)
- Inicio: 2026-08-02
- Alcance de esta pasada: pase de escritorio/tablet (punto 2) + verificacion tema claro (punto 3). El inventario de configs faltantes (punto 1) queda fuera, depende de CFG.1 a CFG.5 sin cerrar.

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

Las 35 tarjetas del tablero, para elegir la próxima sin cargar el archivo completo (principio 9). "Depende de" va acortado a la referencia clave; el texto completo vive en la tarjeta, más abajo por sección.

| ID | Título | Sección | Prioridad | Depende de |
|---|---|---|---|---|
| INT.1 | Barra superior de escritorio y carril de urgencias | Transversal | media | requiere ADR; bloquea ID4 e ID7 de Inicio |
| MC.13 | Distribución v2: contextual por fecha, guiada y con origen real | Mis cuentas | alta | nada |
| MC.13e-2g | Rediseño en 2 pasos con educación financiera | Mis cuentas | media | última; depende del handoff de diseño |
| MC.17f | Deshacer o editar una transferencia | Mis cuentas | media | coordinar con MOV.1 |
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
| DV.2d | Ilustraciones como clase nueva de asset | Transversal | media | P4 del ADR 033 + cola de diseño |
| IV.4 | Iconografía dirigida post-color | Transversal | tras IV.2 | IV.2 en producción + revisión visual |
| CAT.3 | Categorías personalizadas globales (4 rebanadas, ADR 058) | Transversal | media | nada; decidida el 2026-07-31 |
| EDIT.1 | Editar sin destruir: Me deben | Transversal | media-alta | nada |
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

> **Lente de la auditoría de UX/producto (2026-07-21).** Recorrido de toda la app simulando a un usuario colombiano real. Sus 7 patrones son criterio de priorización, no tareas, y explican casi toda la lista de abajo. **Cerrados:** P2 (trabajo manual uno por uno), P4 (ledger de solo lectura) y P5 (módulos que no comparten datos con el saldo). **Abiertos:** P1 datos que la app ya tiene y vuelve a pedir (LIM.1, CFG.2a; la mitad `cuentaId` de MC.13e-2f ya cerró), P3 no se puede editar (EDIT.1, MC.17f), P6 se informa pero no se acciona (motor único de sugerencia por categoría: LIM.1 / ANL.1 / [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md)), P7 un concepto con cuatro implementaciones (ARQ.1 y ARQ.2 cerradas el 2026-08-02, ver `contexto/transversal.md`).
>
> **Dos hallazgos siguen cuestionando una decisión vigente y no se ejecutan sin la palabra de Esteban** (regla 2.7: un ADR no se revierte en silencio): la propuesta de distribución de un toque frente a MC.13e-2g, y MC.17f frente al cierre de MC.17 como "completa". Cada tarjeta lo dice en su Estado.
>
> **Alcance honesto del triaje:** se trió todo lo que el informe entregó enumerado. Su tabla "hallazgos por módulo" vino como vista filtrable y las fichas individuales no llegaron en texto: si Esteban quiere ese detalle triado uno por uno, hay que recuperarlo de la fuente.

### Inicio (dominio `resumen`)

> **Iniciativa "IN.9 - Inicio en escritorio", cerrada** (auditoría de navegación global de Claude Design, 2026-07-31; handoff en `Auditoría navegación global Finko-handoff/`). Sus cinco rebanadas (IN.9a a IN.9e) cerraron el 2026-08-02. **ID4 e ID7 salen a INT.1**, porque dependen de una barra superior de escritorio que no existe en el repo; **ID8 fue un no-op** (decide *no* agregar un botón de registrar, ya cubierto por ADR 024). El informe deja tres reglas para el design system (R78 ancho completo que se gana, R79 gráfico dimensionado por su dato, R80 acordeón/estado como respuesta al ancho escaso) y dos decisiones abiertas que viajan con INT.1: `--fk-bg-glass` sin valor en tema claro (PI7) y el contraste de los tokens `--fk-dom-*` (PI8, medido: 3,23:1 y 2,65:1, bajo el mínimo 3:1 de WCAG 1.4.11). **Móvil no cambia salvo lo que IN.9a decidió** (orden de las alertas de límites). Detalle completo: [`contexto/inicio.md`](contexto/inicio.md).

### Calendario (dominio `agenda`)

_(Anti-duplicado, triaje 2026-07-08: las tres partes del brief "Auditoría UX/UI Calendario" ya tienen fuente única y no generan tarjeta aquí. Tinte de color en las tarjetas de evento → **IV.2c**; logos de marca en eventos → [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md); picker de icono y categorías personalizadas reutilizables → iniciativa **CAT** en Transversal.)_

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2: centro de administración del dinero"** (briefs de Esteban del 2026-07-08). Fuente única de la sección. De sus 4 frentes solo sigue abierto **MC.13** (Distribución v2); **MC.16** (tarjeta de crédito, [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) ejecutado completo), **MC.17** (transferencias) y **MC.18** (rediseño visual, [ADR 035](DECISIONS/035-mis-cuentas-v2.md)) están cerrados. **Conflicto (b) del brief, abierto:** "el dinero del ingreso fijo se abona solo a la cuenta en la fecha de pago" es un movimiento automático sin confirmación, exactamente el problema de filosofía de PA.1, así que se decide en el MISMO ADR de pagos automáticos y no por separado. El conflicto (a) quedó resuelto el 2026-07-15.

#### MC.13 - Distribución v2: contextual por fecha, guiada y con origen real del dinero
- Prioridad  : alta
- Estado     : **el motor está completo y en producción** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md), aceptado parcialmente, con su diseño completo dentro); el asistente está a mitad de rediseño. Sigue abierta **MC.13e-2g**, abajo, la última del rediseño. **MC.13e-2c, MC.13e-2d y MC.13e-2f (sus dos mitades) cerradas** (ver CHANGELOG).
- Objetivo   : responder "¿qué debo hacer HOY con este dinero?" en vez de mostrar todo el mes. Diseño completo y regla vigente del motor (`infra/vencimientos.js`, única tabla de frecuencias del proyecto) en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md), sección "Distribución v2".
- Secciones  : Mis cuentas (`tesoreria/logic/distribucion.js`, `views/distribucion.js`, `acciones/distribucion.js`)
- Depende de : nada (la decisión (a) ya está resuelta); coordinar con PA.1 (conflicto (b), independiente)
- Modelo     : cada rebanada MC.13e-2 lleva el suyo (ver abajo)

> **Rebanadas de MC.13e-2**, re-cortadas por riesgo e independencia (regla 2.1). El mapa del asistente (qué función vive en qué archivo, con líneas) es la tabla de anclas de [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md): leerla antes de iniciar cualquiera de estas rebanadas.

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
- Objetivo   : una transferencia no se puede editar ni revertir hoy; un error de cuenta o monto descuadra dos saldos a la vez sin salida dentro de la app (patrón P3, agravado). Diseño recomendado (deshacer con rastro, no borrado silencioso) y el cuidado del GMF en [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, Movimientos (rastro)
- Depende de : coordinar con **MOV.1** (si el ledger gana acciones por fila, "deshacer transferencia" es una de ellas y no necesita UI propia en Mis cuentas)
- Modelo     : Alta capacidad - Alto (dinero en dos cuentas + GMF; una reversa mal hecha descuadra el patrimonio)

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

#### AH.7a - Ahorro sube a la barra inferior, Calendario baja a "Más"
- Prioridad  : media
- Estado     : requiere ADR nuevo (**supersede el D1 del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md)**, decisión de Esteban tomada el 2026-07-31 tras el triaje de AH.7)
- Área       : ambos
- Objetivo   : la barra inferior pasa de `Inicio · Gastos · [+] · Calendario · Más` a `Inicio · Gastos · [+] · Ahorro · Más`; Calendario se muda a teja dentro de "Más".
- Riesgo     : toca la navegación global; coordinar con **INT.1** (barra superior de escritorio) e **IN.9** (Inicio en escritorio), en curso sobre la misma franja aunque en otra plataforma, para no pisarse
- Secciones  : Navegación (bottom nav), Ahorro, Calendario, Más
- Archivos   : `index.html` (nav), ruteo en `modules/infra/`, `styles/components/` (nav), `tests/e2e/`
- Depende de : nada duro; coordinar con INT.1/IN.9
- Aceptación : captura móvil con Ahorro en la barra + Calendario dentro de "Más" + E2E de navegación verde
- Modelo     : Alta capacidad - Alto (nav global, revierte un ADR vigente)

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

#### INT.1 - Barra superior de escritorio y carril de urgencias
- Prioridad  : media
- Estado     : **requiere ADR y la palabra de Esteban antes de codificar.** Nace del handoff de la auditoría de navegación global (2026-07-31, archivos `Interfaz 1-4` de `Auditoría navegación global Finko-handoff/`), que todavía no se trió decisión por decisión: esta tarjeta la registra como fuente única, no la aprueba. Verificado el 2026-07-31: la barra no existe en el repo (cero `topbar` en `styles/`; el sidebar de `layout.css` sí está).
- Área       : ambos
- Objetivo   : la barra superior permanente de escritorio (título de sección, botón "Registrar" y avatar con acceso a Ajustes) y el carril de 320px a partir de 1.680px. **Bloquea ID4 e ID7 de la iniciativa IN.9**: hoy `.perfil-inicio` es el único encabezado de Inicio en las dos plataformas, así que ocultarlo en escritorio dejaría la pantalla sin saludo, sin marca y sin acceso a Ajustes.
- Riesgo     : cambia el chrome de las 13 secciones a la vez, no solo Inicio. Arrastra además las dos decisiones abiertas del informe de Inicio: PI7 (`--fk-bg-glass` no tiene valor propio en tema claro y pinta una banda negra sobre página blanca: gana valor claro en `themes.css` o se retira del design system) y PI8 (contraste de los tokens `--fk-dom-*`, medido en 3,23:1 y 2,65:1 contra el mínimo 3:1 de WCAG 1.4.11, hallazgo IT12).
- Secciones  : Transversal (`ui/shell.js`, las 13 secciones)
- Archivos   : `index.html`, `modules/ui/shell.js`, `styles/layout.css`, `styles/responsive.css`, `styles/themes.css`
- Depende de : triaje de la auditoría Interfaz + ADR propio
- Aceptación : capturas de las 13 secciones en ambos temas + contraste medido de los tokens que toque
- Modelo     : alto (chrome global, 13 secciones, dos decisiones de token abiertas)

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

> **Iniciativa Dirección Visual premium** ([ADR 033](DECISIONS/033-direccion-visual-premium.md), **Aceptada el 2026-07-30** en P1, P2, P3 y P5), evolución de la identidad de color por sección ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), IV.1 e IV.2 cerradas). **DV.2a cierra el 2026-07-31, DV.2b y DV.2c el 2026-08-01.** Solo **P4** (lote inicial de ilustraciones) sigue abierta y se decide al iniciar DV.2d.

#### DV.2d - Ilustraciones como clase nueva de asset (D3 del ADR 033)
- Prioridad  : media
- Área       : design
- Estado     : **bloqueada.** Es la única rebanada que sigue esperando: **P4 del ADR 033 sin resolver** (lote inicial de ilustraciones; se decide al iniciarla) y **cola de diseño de Esteban** (los drafts de Claude entran como plantillas que él sobrescribe, principio ADR 026)
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

> **Iniciativa CAT: taxonomía de categorías + picker de icono compartido** (triaje 2026-07-08, briefs "Auditoría Gastos" y parte de "Auditoría Calendario"). Fuente única para todo lo de categorías entre secciones. **CAT.1 (taxonomía), CAT.2 (picker) y CAT.4 (auditoría de formularios) están cerradas**, con la D3 del [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) validada en la misma pasada; el estado y las reglas heredadas viven en [`contexto/transversal.md`](contexto/transversal.md). Queda CAT.3.

#### CAT.3 - Categorías personalizadas globales (mismo estatus que las nativas, en toda la app)
- Prioridad  : media
- Estado     : **decidida el 2026-07-31, [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)**, en cuatro rebanadas. **CAT.3a cerrada (2026-08-01)**, quedan tres.
- Objetivo   : las personalizadas de TX.9b valen hoy solo para Gastos; extenderlas a Gastos fijos con la sección como campo del objeto (`seccion: 'gasto' | 'fijo'`), oferta filtrada por sección y resolución de ícono global.
- Secciones  : transversal (Gastos, Gastos fijos, Presupuesto, Inicio, Calendario, Tesorería)
- Depende de : nada. CAT.1 (a qué sección pertenece una categoría) y CAT.2 (cómo se crea) ya cerraron
- **Alcance corregido en el mapeo del 2026-07-31:** gráficos, CSV y 8 de 9 filtros **ya funcionan** con personalizadas (el color viene del dominio y del ranking, no de la categoría; no existe ningún mapa `categoría` a `color` en el repo). El trabajo real son el gate de escritura de fijos y 7 accesos crudos al mapa de íconos, **3 de los cuales ya fallan hoy** sin CAT.3.
- Modelo     : Alta capacidad - Alto (bump de schema + propagación transversal)

##### CAT.3b - los siete accesos crudos pasan por la resolutora
- Estado     : pendiente
- Alcance    : D3 del ADR 058. Los 4 de fijos (`agenda/view.js:716`, `:888`, `gastos/logic.js:585`, `tesoreria/views/distribucion.js:315`) y los 3 que **ya fallan hoy** con una personalizada de Gastos, que la pintan `c-otros` mientras el formulario que la creó muestra el ícono correcto (`presupuesto/view.js:492`, `:742`, `resumen/view.js:119`)

##### CAT.3c - Gastos fijos ofrece y acepta personalizadas
- Estado     : pendiente
- Alcance    : chip de categoría nueva en `renderFormGastoFijo()`, decidiendo cómo convive con `'Otro'` (que es miembro literal del catálogo, no sentinela), y los tres gates de escritura de `compromisos/logic/modelo.js` (`:276` rechaza duro, `:414` descarta a `null` en silencio, `:55`) más sus dos espejos en `agenda/index.js:145` y `:217`

##### CAT.3d - las superficies de fijos resuelven el ícono de una personalizada
- Estado     : pendiente, última rebanada
- Alcance    : detalle del día del calendario, checklist de Necesidades de Tesorería y el gasto nacido de un fijo (`iconoPorOrigen`)

#### EDIT.1 - Editar sin destruir: Me deben
- Prioridad  : media-alta
- Estado     : pendiente, patrón P3 de la auditoría. **Metas (EDIT.1a), Apartados e Inversión ya cerraron** y dejaron el patrón validado; queda solo Me deben, no iniciada.
- Objetivo   : Me deben todavía no permite **editar** un préstamo ya creado: corregir un nombre, un monto o una fecha obliga a **eliminar y recrear**, perdiendo en el camino el historial de abonos. Aplicar el mismo patrón que **EDIT.1a** (Metas), Apartados e Inversión ya validaron (formulario reinyectado con `registro = null` para crear y con el registro existente para editar; `normalizarX(datos, existente = null)` conserva el histórico acumulado y recalcula solo lo que depende del campo editado).
- Secciones  : Me deben
- Archivos   : `personales/` (form + acciones), patrón de referencia en `metas/` (EDIT.1a), `apartados/`, `inversiones/` y en `compromisos` (D.15b, para Deudas)
- Depende de : nada duro. **ARQ.1 cerrada (2026-08-02): no fusionó componente ni pantalla**, así que este acoplamiento no aplica; las 3 rebanadas ya cerradas demostraron que escribir la rebanada de un dominio no es tan costoso como se temía
- Modelo     : Equilibrado - Alto (patrón ya probado en D.15b, EDIT.1a, Apartados e Inversión; sin lógica financiera nueva)

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
| Gastos | Iniciativa "Gastos v2" completa ([ADR 039](DECISIONS/039-gastos-v2-visual.md)), con 3 decisiones diferidas anotadas en el ADR: FAB, búsqueda en el header y comparación tangible del insight hormiga. La taxonomía de categorías ya cerró (**CAT.1**, [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)); lo que queda de categorías es **CAT.3** (personalizadas globales) y el motor de sugerencia por categoría, la fusión LIM.1 / ANL.1 / ADR 029 |
| Movimientos | Ledger accionable, con búsqueda y filtros, completo. Los huecos que quedan son **MC.17f** (deshacer transferencia) y **EDIT.1** (editar donde el dominio dueño todavía no sabe) |
| Deudas | Iniciativa "Deudas v2" completa ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Que un pago de deuda descuente de la cuenta ya existe desde el [ADR 002](DECISIONS/002-abono-deudas.md): si aparece un caso donde NO ocurra, es un bug para [`BUGS.md`](BUGS.md), no una feature |
| Inversión | Sin pendientes propios. "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); su infraestructura compartida cerró con **ARQ.1** (2026-08-02) |
| Apartados | Iniciativa "Apartados v2" completa (**AP.5** cerrada, 2026-08-01). "Editar sin destruir" ya cerró (**EDIT.1**, 2026-08-02); el catálogo de plantillas queda fuera de **CAT.3** (razón en el [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md)) |
| Biblioteca gráfica e iconografía | Completas ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), [025](DECISIONS/025-logotipos-de-marca-y-tejas.md), [026](DECISIONS/026-biblioteca-de-recursos-graficos.md), [027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md)). La regla de fidelidad de los SVG que entrega Esteban y el costo de agregar un glifo viven en [`assets/svg/README.md`](../assets/svg/README.md). Lo único pendiente es **IV.4** |

---
## Mantenimiento

#### DOC.1 - Reorganización documental, fases 3 a 5
- Prioridad  : media
- Estado     : Fases 1, 2 y 3 cerradas. **Fase 4 a un movimiento de cerrar:** de los 10 de la tabla 11.1 están hechos 8 (el 5, `HANDOFF.md` a 6 KB, cerró el 2026-07-31); falta el **6** (`BOARD.md` en 80 KB contra un techo de 40) y el **9** sigue esperando la decisión de Esteban sobre los comodines amplios de `settings.local.json` (12.2). El plan completo por fases vive en [`MIGRACION.md`](MIGRACION.md) sección 7, que se borra al cerrar la Fase 5.
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
- Objetivo   : reemplazar `2027: null` por la entrada completa en `LEGAL_POR_ANIO` con los valores oficiales de Mintrabajo (SMMLV) y DIAN (UVT). Procedimiento paso a paso: [`OPERACION.md`](OPERACION.md) runbook 2.
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
