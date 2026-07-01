# ADR 019 - Límites de gasto con tratamiento asimétrico por rol

**Estado:** Propuesta (diseño). Decisiones de modelo cerradas con el usuario; el detalle de cada slice se afina al implementarlo.
**Fecha:** 2026-07-01
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)
**Relación:** **revisa las decisiones 1, 4 y 5 del [ADR 017](017-limites-centro-de-control.md)** (Límites como centro de control de los 3 grupos). No revierte el ADR 017: mantiene su núcleo (presupuesto por grupo desde la distribución, sin schema nuevo) y corrige cómo se presenta cada grupo. Reusa la distribución de [ADR 013](013-distribucion-automatica-inteligente.md) y el mapeo de [ADR 014](014-taxonomia-categorias-transversal.md).

---

## Contexto

El ADR 017 dejó Límites de gasto organizado en los tres grupos financieros (Necesidades / Estilo de vida / Ahorro), cada uno con la **misma** tarjeta: asignado, ejecutado, restante, porcentaje y estado (`ok` / `alerta` / `excedido`) con los mismos umbrales (75% / 100%). Los topes por categoría (envelope budgeting sobre `S.presupuestos`) quedaron como un **bloque aparte** debajo, titulado "Estilo de vida: topes por categoría".

Al usarlo, el usuario detectó que ese tratamiento **simétrico** es sutilmente incorrecto, porque los tres grupos no tienen la misma naturaleza:

- Las **Necesidades** (arriendo, servicios, cuotas de deuda, alimentación básica) son gastos esenciales que se pagan sí o sí. Advertir "te estás pasando" cuando suben no ayuda: lo honesto es informar que las necesidades están consumiendo más del ingreso y sugerir revisar el plan general o reducir otros gastos. Se monitorean, no se limitan.
- El **Ahorro** es un buen hábito. Ahorrar **más** de lo planeado no es una desviación de presupuesto: es una victoria. Debe reforzarse, nunca alertarse como problema.
- El **Estilo de vida** es donde el usuario tiene control real sobre sus decisiones de consumo. Es el único grupo donde tiene sentido poner topes y avisar **antes** de excederse.

Además hay una **redundancia de arquitectura de la información**: Estilo de vida aparece en dos sitios (su tarjeta en el resumen y el bloque suelto de topes), lo que fragmenta el relato.

Punto de partida importante (para dimensionar el trabajo): hoy Necesidades y Ahorro **ya no tienen** límites configurables (los topes solo se pueden poner sobre gastos variables, que el modelo cuenta como Estilo de vida), y el refuerzo positivo del Ahorro **ya existe** (ADR 017 decisión 5, implementado en MC.5d). O sea, este ADR es sobre todo una **reorganización de la información y del copy**, no una reescritura del motor. El riesgo es bajo y no requiere schema nuevo.

---

## Decisión

### 1. Tratamiento asimétrico por rol (revisa ADR 017 decisión 1)

Cada tarjeta de grupo refleja el **rol financiero** del grupo, no una plantilla común:

| Grupo | Rol | Qué muestra | Qué NO hace |
|---|---|---|---|
| Necesidades | **Monitorear** | Ejecutado, % del ingreso, barra de progreso | No ofrece límites; no alarma por "exceso" |
| Ahorro | **Celebrar** | Avance del ahorro, refuerzo al cumplir o superar | No trata superar la meta como problema |
| Estilo de vida | **Controlar** | Límites por categoría, alertas preventivas | (es el único con controles de tope) |

El estado con umbrales 75% / 100% (`calcularProgreso` / `resumenGrupos`) **se conserva solo para Estilo de vida**, que es donde "acercarse al límite" tiene sentido. Para Necesidades el porcentaje es informativo (cuánto del ingreso consumen), no un umbral de peligro. Para Ahorro, superar el 100% dispara refuerzo, nunca alerta (ya es así desde MC.5d).

### 2. Estilo de vida es el único centro de control, con límites bajo demanda (revisa ADR 017 decisión 4)

Los topes por categoría **se fusionan dentro de la tarjeta de Estilo de vida**; desaparece el bloque suelto "Estilo de vida: topes por categoría". Un solo relato por grupo.

El mecanismo para fijar topes es **agregar bajo demanda** (la "Opción 2" del usuario, que además es como ya funciona hoy): un botón "Agregar límite" y la lista de categorías con gasto pero sin tope que sugiere dónde poner uno. No se muestran las 13 categorías de golpe.

Se le suma la **conciencia de "olla finita"**, la única buena idea de la propuesta de porcentajes: una línea que indica cuánto del presupuesto de Estilo de vida (que sale de la distribución) cubren los límites actuales, por ejemplo "Tus límites cubren $700.000 de los $900.000. Te quedan $200.000 sin tope". Da la noción de presupuesto acotado **sin** forzar a asignar el 100% ni a opinar sobre cada categoría. La infraestructura ya existe a medias: `sugerirDistribucionIngreso` calcula una alerta cuando los límites superan el Estilo de vida sugerido.

### 3. Reencuadre del copy (revisa ADR 017 decisión 5)

- **Necesidades: informar, no regañar.** Se elimina la palabra "límite" del copy de Necesidades. En vez de "estás cerca del límite" / "superaste lo que planeaste", los mensajes dicen algo como "Tus necesidades usan el X% de tu ingreso este mes" y, cuando el peso es alto, "considera revisar tu plan general o dónde puedes reducir otros gastos". Nunca "te estás pasando".
- **Ahorro: celebrar con calidez.** Se enriquece el refuerzo con mensajes más cálidos y variados: "¡Excelente! Este mes estás ahorrando más de lo planeado", "Estás fortaleciendo tu futuro financiero", "Cada peso que ahorras hoy es tranquilidad mañana".
- **Estilo de vida:** el copy actual de alerta preventiva por categoría se conserva ("Ya usaste el X% de tu presupuesto para {categoría}...").

Tono obligatorio (ADN regla 11, estilo regla 7.1): voz "tú", "dinero" (no "plata"), cero guion largo, orientativo nunca prescriptivo.

### 4. Layout: fusión y jerarquía visual por peso

- Se elimina la sección independiente de topes; su contenido vive dentro de la tarjeta de Estilo de vida.
- En **desktop**, Necesidades y Ahorro van en **dos columnas compactas** (requieren poca información) y Estilo de vida ocupa una **fila completa** (necesita más espacio para categorías, controles y alertas). El peso visual comunica dónde está la acción.
- En **móvil** las tres tarjetas se apilan (una columna); la diferenciación la lleva la **cantidad de contenido** de cada tarjeta, no el número de columnas. Coherente con la validación del usuario en su celular.

### 5. Todas las categorías de gasto siguen siendo limitables (camino pragmático)

Hoy un usuario puede poner un tope sobre categorías de gasto que suenan a Necesidad (Vivienda, Salud, Servicios públicos, Transporte, Mercado), pero el modelo cuenta **todos** los gastos como Estilo de vida. Esa inconsistencia se resuelve en v1 por el camino **pragmático**: se dejan todas las categorías limitables, con copy que deja claro que un "límite" es un tope a tu gasto discrecional. El camino **purista** (clasificar cada categoría de gasto por grupo, para que el selector solo ofrezca las discrecionales y el ejecutado del grupo se reparta bien) tocaría `ejecutadoPorGrupoDelMes` y el modelo gasto → grupo, así que queda anotado como evolución futura con su propio ADR. No se bloquea un rediseño mayormente visual por una reclasificación de datos.

### 6. Sin schema nuevo

Como en el ADR 017, todo es derivado (asignado desde la distribución, ejecutado desde los flujos del mes) más el reuso de `S.presupuestos`. No se bumpea `SCHEMA_VERSION`.

---

## Alternativas consideradas

- **Mantener el tratamiento simétrico (statu quo del ADR 017).** Más simple, pero trata mal la naturaleza de cada grupo: implica que puedes controlar el arriendo como controlas las salidas a comer. Descartada por el usuario.
- **Estilo de vida por límites mostrando todas las categorías (Opción 1 del usuario).** Comprensiva, pero satura: son 13 categorías, la mayoría en cero, y obliga a pensar en categorías donde no se gasta. Viola el principio "no saturar de información". Descartada.
- **Estilo de vida por porcentajes que sumen 100% (Opción 3 del usuario).** Enseña que el presupuesto es finito, pero fuerza el 100%: es exactamente la rigidez que el propio usuario descartó en MC.6b (los presets fijos se degradaron a "métodos clásicos" por no considerar el gasto real). Además crea un presupuesto dentro de otro (el total de Estilo de vida ya sale de la distribución). Descartada como mecanismo, pero se rescata su idea de "olla finita" (decisión 2).
- **Eliminar del todo los límites por categoría y dejar solo seguimiento por grupo.** Más simple, pero pierde el control fino por categoría que el usuario ya usa. Descartada.
- **Camino purista: reclasificar las categorías de gasto por grupo desde ya.** Correcto conceptualmente, pero es un cambio de fondo con su propio ADR; no vale la pena bloquear este rediseño por él. Diferido (decisión 5).

---

## Consecuencias

### Positivas

- **La interfaz coincide con el modelo mental real del usuario:** el arriendo y las salidas a comer dejan de tratarse igual. Menos carga cognitiva, no más.
- **Menos redundancia de IA:** un solo relato por grupo; Estilo de vida deja de aparecer en dos sitios.
- **Bajo riesgo:** es sobre todo reorganización visual y copy; reusa el motor de MC.5, sin schema.
- **Estilo de vida gana foco** como el verdadero centro de control, que es donde el usuario puede actuar.
- **Refuerza hábitos:** celebra el ahorro, no regaña las necesidades. Coherente con el propósito de Finko.

### Negativas / Restricciones

- **La inconsistencia "categorías de Necesidad limitables como Estilo de vida" persiste** hasta el camino purista; se mitiga con copy.
- **Hay que recopiar y ajustar `generarMensajesLimites` (MC.5d):** el reencuadre de Necesidades cambia la lógica de mensajes de ese grupo. Es evolución, no borrado.
- **La ventaja de las dos columnas es solo de desktop:** en móvil se apila; la diferenciación depende de la densidad de contenido.

---

## Slices de implementación (smallest-first)

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app (desktop + móvil) con tests. Nueva épica **MC.8** (revisa MC.5). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después: comparten el modelo de distribución, así que cerrar la identidad de Límites primero evita rehacer trabajo.

| Slice | Qué | Capas |
|---|---|---|
| **MC.8a** | `logic.js`: reencuadre de `generarMensajesLimites` por rol. Necesidades pasa de alerta con "límite" a mensaje informativo (% del ingreso, sin alarma); Ahorro enriquece el refuerzo; Estilo de vida se conserva. Helper puro para la "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites) si no existe ya. Tests unitarios. | `presupuesto/logic.js`, tests |
| **MC.8b** | `view.js`: fusionar los topes por categoría **dentro** de la tarjeta de Estilo de vida y eliminar la sección suelta. Necesidades sin controles (solo seguimiento), Ahorro con refuerzo, Estilo de vida con límites + botón "Agregar límite" + línea de "olla finita". Tests de render + E2E. | `presupuesto/view.js`, `index.html`, tests + E2E |
| **MC.8c** | Layout: Necesidades + Ahorro en dos columnas compactas y Estilo de vida en fila completa (desktop); apilado en móvil. CSS + responsive. Verificación visual desktop + móvil. | `styles/`, verificación |
| **MC.8d (opcional)** | Pulido: copy final por grupo, iconos por categoría en los límites, estados vacíos, a11y (roles, foco, `aria`). | `view.js`, `styles`, tests |

> Modelos sugeridos: **MC.8a** Sonnet 4.6 - Medio (lógica de mensajes + copy, con tests). **MC.8b** Sonnet 4.6 - Alto (reorganiza la vista y mueve el envelope UI dentro de la tarjeta). **MC.8c** Sonnet 4.6 - Bajo/Medio (CSS de layout). **MC.8d** Sonnet 4.6 - Bajo. No toca normativa CO ni el motor financiero, así que no requiere Opus.
