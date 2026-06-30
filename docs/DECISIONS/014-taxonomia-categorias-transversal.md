# ADR 014 - Taxonomía de categorías transversal (identidad por sección + categoría por contexto)

**Estado:** Propuesta (diseño). Pendiente de validar la curación de catálogos con el usuario antes de codear slices.
**Fecha:** 2026-06-29
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)
**Absorbe:** AP.5 (taxonomía de categorías de toda la app) y AG.3 (categorías de Agenda). Las tres se unifican en este ADR.

---

## Contexto

Las categorías son la base de muchas funciones de Finko: el análisis de gasto, los límites por categoría (MC.5), las recomendaciones, los nudges y la distribución inteligente del ingreso (MC.6). Hoy cada sección tiene su propio catálogo de categorías, definido por separado y sin una regla escrita que diga **qué va en cada sección** ni **qué hacer cuando un mismo concepto cabe en varias**.

El usuario lo resume así: el objetivo no es solo organizar la información, sino que **el usuario entienda de forma natural dónde registrar cada movimiento sin pensarlo dos veces**, y que una misma categoría no aparezca en varias secciones sin una razón clara.

### Estado actual del código (catálogos por sección)

Todos viven en `modules/core/constants.js` (salvo Apartados, en `apartados/logic.js`). Cada uno es una lista cerrada con su mapa de emoji:

| Constante | Sección | Qué es | Nº |
|---|---|---|---|
| `CATEGORIAS_GASTO` / `CATEGORIA_EMOJI` | Gastos | Gasto variable (incluye internas `Deudas`/`Ahorro`) | 16 (13 visibles) |
| `CATEGORIAS_AGENDA` / `CATEGORIA_AGENDA_EMOJI` | Agenda | Gasto fijo recurrente (`tipo='fijo'`) | 13 |
| `PLANTILLAS_APARTADO` | Apartados | Plantillas (nombre + icono), lista abierta | 15 |
| `CATEGORIAS_DEUDA` / `CATEGORIA_DEUDA_EMOJI` | Deudas | Tipo de obligación | 12 |
| `CATEGORIAS_INGRESO` / `CATEGORIA_INGRESO_EMOJI` | Ingresos | Fuente del ingreso | 12 |
| (sin catálogo) | Metas | Texto libre (nombre del objetivo) | - |

### Solapamientos reales hoy (sin regla que los gobierne)

- **Mercado**: en Gastos (variable) y en Apartados (plantilla). El usuario además lo quiere en Agenda (compra mensual recurrente).
- **Transporte**, **Servicios públicos**, **Educación**: en Gastos y en Agenda.
- **Arriendo**: en Agenda (gasto fijo), en Ingresos (quien recibe un arriendo) y en Apartados (plantilla).
- **Mascotas**: en Gastos y Agenda; en Apartados como "Alimento para mascotas" / "Arena para gatos".

Estos cruces no son un error: muchos conceptos tienen de verdad dos caras (una recurrente y una variable, o una presente y una futura). El problema es que **no hay regla escrita** que diga cuándo usar cada sección, así que el usuario duda y las funciones que dependen de la categoría (análisis, límites, distribución) no pueden razonar de forma consistente.

### Precedente

La revisión UX de junio 2026 ya cerró que **las secciones no se fusionan: la diferenciación es por copy** (ver memoria de proyecto y revisión UX). Este ADR extiende esa decisión: la diferenciación es por **identidad de sección + catálogo curado + regla de contexto**, no solo por copy.

---

## Decisión

### 1. La sección define la intención; la categoría la refina

El eje primario de significado de un movimiento es **la sección donde se registra**, no la categoría. La categoría es un refinamiento dentro de esa intención. Cada sección responde **una pregunta distinta**:

| Sección | Pregunta que responde | Naturaleza | Eje temporal | Ejemplos |
|---|---|---|---|---|
| **Agenda** | ¿Qué pago periódico tengo en fecha? | Obligación recurrente de la rutina | Se repite en calendario (mensual, quincenal) | Arriendo, servicios, internet, gimnasio, suscripciones, mercado mensual |
| **Gastos** | ¿En qué se me fue el dinero? | Consumo variable del día a día | Puntual, ya ocurrió | Restaurantes, café, transporte, ropa, cine, gasto hormiga |
| **Apartados** | ¿Qué gasto grande sé que llega? | Ahorro para gasto previsible espaciado | Futuro, no todos los meses (anual, semestral) | SOAT, predial, matrícula, navidad, vacaciones |
| **Deudas** | ¿A quién le debo y cuánto? | Obligación con un tercero | Saldo que se amortiza | Tarjeta, libre inversión, hipotecario, gota a gota |
| **Metas** | ¿Qué quiero lograr? | Ahorro con propósito | Futuro, mediano/largo plazo | Viaje, casa, carro, negocio |

Secciones de soporte (mismo principio, fuera del foco de gasto):

| Sección | Pregunta | Naturaleza |
|---|---|---|
| **Ingresos (Mis cuentas)** | ¿De dónde viene el dinero? | Entrada recurrente u ocasional |
| **Ahorro / Inversión (Crecer)** | ¿Cómo construyo respaldo y patrimonio? | Ahorro libre y activos a largo plazo |

**Regla de oro de registro:** primero eliges la **sección** (la intención), y solo dentro de ella eliges la **categoría**. Si dudas en qué sección registrar algo, la pregunta de la sección lo resuelve: "¿es un pago periódico en fecha?" → Agenda; "¿ya gasté esto hoy?" → Gastos; "¿ahorro de a poco para algo que llega después?" → Apartados.

### 2. Una categoría puede vivir en varias secciones: la sección es el desambiguador

No se prohíben los solapamientos. Una misma etiqueta (ej. **Mercado**) puede existir en varias secciones porque **significa cosas distintas según dónde se registra**, y eso es intencional:

- **Mercado en Agenda** = el mercado mensual planeado, parte fija de las necesidades del hogar.
- **Mercado en Gastos** = la compra suelta e imprevista (se acabó algo, toca reponer hoy).
- **Mercado en Apartados** = ahorrar para un mercado grande estacional (ej. diciembre).

El significado de un movimiento es el par **(sección, categoría)**, no la categoría sola. Documentar el contexto por sección (en el copy y en este ADR) es lo que evita la confusión, no eliminar la categoría de una de las secciones.

### 3. Consistencia: mismo concepto ⇒ misma etiqueta y mismo emoji en todas las secciones

Si un concepto aparece en dos secciones, debe usar **exactamente la misma etiqueta y el mismo emoji** en ambas. Así el usuario reconoce "Transporte 🚗" como el mismo concepto esté donde esté, y el análisis puede agruparlo cuando tenga sentido. Guardarraíl de implementación: ante cualquier catálogo nuevo o editado, verificar que las etiquetas compartidas no diverjan en texto ni en emoji.

Auditoría rápida del estado actual: ya son consistentes Transporte 🚗, Servicios públicos 💡, Mascotas 🐾, Mercado 🛒. El desajuste a corregir: Apartados usa nombres específicos ("Alimento para mascotas") donde Gastos/Agenda usan el genérico ("Mascotas 🐾"); se mantiene la especificidad de la plantilla pero compartiendo el emoji de familia.

### 4. Cada catálogo se cura a la identidad de su sección (no volcar todo en todas)

Una categoría aparece en una sección **solo si tiene un uso genuino bajo la intención de esa sección**. No se ofrecen categorías que contradigan la identidad:

- Agenda no ofrece "Restaurantes" (consumo variable → Gastos).
- Gastos no ofrece "Arriendo" (siempre recurrente → Agenda).
- Sí se permite el solapamiento cuando el concepto tiene de verdad dos caras (Mercado, Transporte, Servicios públicos).

**El puente entre secciones es un nudge, no un muro.** Ya existe `CATEGORIAS_TIPICAMENTE_FIJAS` (Vivienda, Servicios públicos, Educación): al elegir una de esas en Gastos, un hint no bloqueante sugiere registrarla en Agenda si es recurrente. Este patrón es el mecanismo correcto para guiar sin obligar, y se conserva y extiende.

### 5. Las funciones que dependen de categorías leen el par (sección, categoría)

Las features transversales se anclan primero en la **sección** y luego refinan por categoría:

- **Límites de gasto / 3 grupos (MC.5, MC.6):** el mapeo a Necesidades / Estilo de vida / Ahorro se deriva **de la sección primero**:
  - **Necesidades** ← Agenda (gastos fijos) + Deudas (cuota mensual mínima).
  - **Estilo de vida** ← Gastos (consumo variable).
  - **Ahorro** ← Apartados + Metas + Ahorro (fondo) + Inversión + abono extra a deuda.
  - La categoría refina dentro del grupo (ej. dentro de Estilo de vida, límite por "Restaurantes").
- **Análisis:** puede agrupar por categoría, pero respetando el contexto: no fusiona a ciegas "Mercado de Agenda" con "Mercado de Gastos"; los presenta etiquetados por sección o como series comparables, no como un solo número opaco.
- **Distribución inteligente (MC.6):** ya razona por sección (gastos fijos vs cuotas de deuda vs ahorro). Este ADR formaliza ese criterio como el correcto.

### 6. Sin cambio de schema

La taxonomía es una decisión de **documentación + curación de catálogos**, no de modelo de datos. Cada entidad ya guarda su `categoria` (string) y vive en su sección. Los ajustes a los catálogos por sección (puntos de la sección "Slices") son ediciones de constantes, no migraciones. El único schema que podría tocarse es el de **Deudas** y vive en otro ADR (D.5, segundo eje "acreedor"): este ADR solo fija la **identidad** de Deudas (obligación con un tercero) y deja la doble dimensión a D.5.

Las categorías internas `Deudas` 💳 y `Ahorro` 💰 de `CATEGORIAS_GASTO` son plomería (un abono o un aporte se registra como gasto con esa categoría); no son taxonomía de usuario y siguen excluidas del formulario (`CATEGORIAS_GASTO_USUARIO`). Se mantienen como están.

### 7. "Otro" es la válvula de escape universal

Toda sección conserva su categoría "Otro" (📦). El usuario nunca queda bloqueado si su movimiento no encaja en una etiqueta. La taxonomía orienta, no encierra.

---

## Curación propuesta de catálogos (a confirmar)

Ajustes mínimos para alinear los catálogos con la identidad de cada sección y con la visión del usuario. Son ediciones de constantes (sin migración):

- **Agenda:** agregar **Mercado** 🛒 (mercado mensual recurrente, el ejemplo guía del usuario) y **Suscripciones** (bucket más amplio que Streaming, para apps/servicios pagos). Evaluar **Televisión** 📺 si el usuario la separa de Streaming. El resto del catálogo actual (Arriendo, Administración, Servicios públicos, Internet, Telefonía, Streaming, Seguros, Educación, Gimnasio, Cuota de manejo, Transporte, Mascotas) ya refleja la identidad.
- **Gastos:** mantener el catálogo actual; "Café" y "Cine" caben en Restaurantes / Entretenimiento, y "Belleza" en **Cuidado personal** 💅. Opcional, si el usuario lo quiere explícito: **Café** ☕ y **Gastos hormiga** 🐜 como categorías propias.
- **Apartados:** agregar **Cumpleaños** 🎂 y **Navidad** 🎄 (hoy solo existe "Regalos"). El resto de la lista ampliada (AP.2) ya cubre la visión.
- **Deudas:** sin cambios aquí; la doble dimensión (tipo de deuda + acreedor) es D.5.
- **Metas:** se mantiene **texto libre** (los objetivos son demasiado diversos para una lista cerrada); a lo sumo, chips de arranque sugeridos (Viaje, Casa, Carro, Negocio) sin cerrar la entrada.

Estos ajustes se confirman con el usuario antes de codear (qué agregar, qué dejar igual).

---

## Alternativas consideradas

- **Un catálogo maestro único, global, sin solapamientos.** Forzaría a elegir una sola sección por concepto y rompería los casos reales de doble cara (Mercado recurrente vs imprevisto). Descartada: el usuario pidió explícitamente "definir el contexto, no prohibir la categoría en dos lugares".
- **Prohibir solapamientos curando hasta que cada categoría viva en una sola sección.** Más "limpio" en teoría, pero obliga a registrar mal (¿el mercado imprevisto va en Agenda solo porque "Mercado" se asignó a Agenda?). Descartada por el mismo motivo.
- **Anclar las funciones transversales en la categoría sola (ignorando la sección).** Haría que "Mercado" signifique lo mismo en todos lados y mezclaría recurrente con variable en los límites y el análisis. Descartada: el par (sección, categoría) es el que tiene sentido.
- **Resolver MC.5 (mapeo categoría → grupo) dentro de este ADR.** Agranda el alcance y mezcla la taxonomía (estable) con la mecánica de límites (otra épica). Se deja a MC.5, que consume esta taxonomía.

---

## Consecuencias

### Positivas

- El usuario sabe **dónde registrar cada movimiento** porque cada sección hace una pregunta clara; las dudas se resuelven con la pregunta, no con prueba y error.
- Los solapamientos dejan de ser ambiguos: el contexto de cada sección está documentado (Mercado es el caso canónico).
- Las funciones transversales (límites, análisis, distribución, nudges) tienen un criterio común y estable: razonan por (sección, categoría), no por categoría suelta.
- Sin migración: es documentación + curación de constantes; bajo riesgo, reversible.
- Da base firme a MC.5 (límites como centro de control de los 3 grupos) y consolida lo que MC.6 ya hace.

### Negativas / Restricciones

- Mantener la consistencia "mismo concepto ⇒ misma etiqueta y emoji" es un guardarraíl manual: cada catálogo nuevo o editado hay que revisarlo contra los demás.
- La curación de catálogos toca varias secciones; conviene hacerla en slices pequeños y verificables, no de un golpe.
- La regla de contexto vive sobre todo en el **copy** (el banner de propósito de EP.0/EP.1 es el vehículo natural para enseñarla): si el copy no la comunica, la taxonomía no se percibe.
- Metas como texto libre limita el análisis agregado por tipo de meta; es un trade-off aceptado (los objetivos son demasiado diversos para encerrarlos).

---

## Slices de implementación (smallest-first)

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app:

| Slice | Qué | Capas |
|---|---|---|
| **TX.1** | Curar `CATEGORIAS_AGENDA`: agregar Mercado 🛒 y Suscripciones (y evaluar Televisión). Tests del mapa de emoji. | `constants.js` + tests |
| **TX.2** | Curar `PLANTILLAS_APARTADO`: agregar Cumpleaños 🎂 y Navidad 🎄. Tests. | `apartados/logic.js` + tests |
| **TX.3** (opcional) | Gastos: agregar Café ☕ y Gastos hormiga 🐜 si el usuario los quiere explícitos. | `constants.js` + tests |
| **TX.4** | Guardarraíl de consistencia: un test que verifique que las etiquetas compartidas entre catálogos usan el mismo emoji (falla si alguien introduce un desajuste). | tests |
| **TX.5** | Mapeo sección → grupo (Necesidades / Estilo de vida / Ahorro) como helper puro reutilizable por MC.5 y MC.6. | `infra` o `tesoreria/logic.js` + tests |

> Relación con otras épicas: **EP.0/EP.1** (banner de propósito por sección) es el vehículo para comunicar la regla de contexto al usuario; **MC.5** (límites por los 3 grupos) consume el mapeo de TX.5; **D.5** (segundo eje de Deudas: acreedor) refina la identidad de Deudas fijada aquí. Todas son ADRs/tareas aparte.
