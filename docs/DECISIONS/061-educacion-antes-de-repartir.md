# ADR 061 - La educación va delante de repartir, pero no cobra un paso

**Estado:** Aceptado
**Fecha:** 2026-08-05
**Autores:** Esteban (delegación explícita: "toma tú lo que creas que son las mejores decisiones"), Claude Opus 5 (diseño e implementación)
**Relación:** cierra la última rebanada del asistente de Distribución v2, **MC.13e-2g** (puntos 9 y 10 del brief del 2026-07-08). Concreta la dirección de **[ADR 041](041-motor-vencimientos-y-distribucion-v2.md) D4** ("Paso 0 educativo"), que dejó a propósito las pantallas para las rebanadas de UI. Resuelve la tensión que el triaje de la auditoría de UX/producto del 2026-07-21 dejó abierta. No revierte ningún ADR.

---

## Contexto

MC.13e-2g llegó al cierre con **dos decisiones sin tomar**, ambas anotadas en su tarjeta:

1. **¿Handoff de diseño de Claude Design o diseño sin mockup?** Las 8 pantallas v2 anteriores (Inicio, Mis cuentas, Deudas, Calendario, Análisis, Gastos, Navegación, Formularios) entraron con mockup aprobado.
2. **¿La educación va delante o detrás de la acción?** Acá había un choque real de dos fuentes vivas:
   - El **punto 9 del brief** pide que el asistente pase de flujo directo a dos pasos, con la educación financiera primero (cómo reparten los expertos, con barras y porcentajes) y el reparto personalizado después.
   - La **auditoría de UX/producto** pide lo contrario para el mismo asistente: una propuesta pre-armada de un toque, porque es el flujo más repetido de la app y cada interacción extra se paga en cada cobro.

La tarjeta lo dejó escrito: "el orden importa y decide el diseño... resolverlo antes de encargar el handoff, o el mockup fijará la respuesta sin que nadie la haya decidido".

Un dato más del código, que es el que desempata: los pasos del asistente **ya llegan prellenados y marcados** (checklist de Necesidades marcada por defecto, fila del fondo siguiendo la sugerencia automática, montos calculados sobre el remanente real). La fricción que la auditoría señala no está en "hay que llenar cosas": está en cuántas pantallas hay que atravesar para confirmar.

---

## Decisión

### D1. Sin handoff de diseño

Se diseña e implementa en una sola pasada, siguiendo las convenciones ya escritas en `views/distribucion.js`, `domain.css` y `forms.css`. Mismo criterio que el resto de las rebanadas MC.13e-2 y que AH.5 (2026-08-04).

Razón: lo que esta rebanada agrega no es una pantalla nueva, es un bloque de contenido dentro de un modal que ya tiene su lenguaje visual definido (la barra de tres segmentos con `dist-color-*`, la leyenda con punto + etiqueta + cifra, los tintes de dominio). Un mockup habría replicado componentes existentes.

### D2. La educación es la cabecera del asistente, no un paso paginado

El modal `#modal-distribuir` queda en **dos bloques del mismo scroll**:

1. **Educación** (`_renderBloqueEducativo`): "Así reparten los expertos", la barra 50/30/20, y por cada grupo su porcentaje de referencia, el porcentaje real del usuario al lado ("50% · tú 62%") y una línea de qué entra en el grupo. Cierra con la razón del cálculo propio, que antes vivía suelta más abajo. Enseguida, cómo elegir el método (chips de preset, métodos clásicos, editor personalizado).
2. **Reparto** (`_renderPanelDistribuir`): el flujo por pasos de siempre, intacto y prellenado.

**El punto 9 se cumple en el orden, no en la paginación.** La educación va delante y es lo primero que se lee al abrir; lo que no hace es cobrar un clic. Con eso la auditoría también queda servida: el número de interacciones para confirmar una distribución **no cambia** respecto a antes de esta rebanada.

Costo declarado y medido: el bloque mide 299px a 320px de ancho, así que el campo "Monto a distribuir" pasa de nacer a ~278px del tope del cuerpo del modal a nacer a ~547px. En el peor caso soportado (320x720) el usuario hace **un gesto de scroll** para llegar al checklist, que ya está marcado. No hay desborde horizontal a 320px.

### D3. Los tres porcentajes de referencia salen del preset, no de la vista

`_REFERENCIA_EXPERTOS` toma sus cifras del preset `50-30-20` de `PRESETS_DISTRIBUCION` (`logic/distribucion.js`). El chip "50/30/20" del mismo modal y la referencia educativa no pueden divergir. El ancho de los segmentos de la barra se escribe como propiedad JS tras el `innerHTML`, igual que la barra de la tarjeta de entrada: cero `style=""` en el HTML generado y cero porcentajes duplicados en CSS.

### D4. Cada acceso cruzado vive en el paso de su categoría; el que no tiene paso se descarta

Punto 10. Los `ctas` que `sugerirDistribucionIngreso()` calcula desde MC.5e (y que MC.13e-2a retiró de la tarjeta de entrada) vuelven, repartidos:

| Acceso | Sección | Paso |
|---|---|---|
| Ver estrategia de deudas | `compromisos` | Necesidades (sus cuotas se pagan ahí) |
| Activar fondo / Ver progreso del fondo | `ahorro` | Ahorro, deudas e inversiones |
| Explorar / Aportar a inversiones | `inversion` | Ahorro, deudas e inversiones |
| Ver tu seguimiento en Límites de gasto | `presupuesto` | Estilo de vida |

Un acceso cuyo paso no existe en ese asistente **se descarta, no se reubica**: mostrar "Ver estrategia de deudas" en el paso de Estilo de vida sería exactamente lo que el punto 10 prohíbe, y la sección sigue a un toque desde la navegación. El paso de Estilo de vida siempre existe, así que el acceso a Límites de gasto (el único siempre presente) nunca se pierde.

Los enlaces usan la acción built-in `ir-a-seccion` del shell, que cierra el modal antes de navegar. El hint "Ponle una fecha en Metas" de las filas sin fecha pasa a usarla también: era un `<a>` pelado que navegaba dejando el asistente abierto encima de la sección nueva.

### D5. El foco de apertura deja de ser el monto a distribuir

Con el bloque educativo delante, el campo de monto queda fuera de la vista al abrir. Enfocarlo con `preventScroll: true` (lo que hacía `abrirAsistenteDistribucion`) habría dejado el foco en un control invisible. El foco de entrada pasa a ser el que fija `abrirModal` (primer focusable del panel: el botón de cerrar), que además deja que la educación se lea primero, sin scroll automático que la salte.

---

## Alternativas consideradas

- **Un "Paso 0" educativo dentro del shell paginado** (la lectura literal del punto 9). **Descartada:** convierte 3 pasos en 4 y cobra un clic en cada cobro, en el flujo más repetido de la app. Es exactamente lo que la auditoría pide evitar, y el punto 9 se satisface igual poniendo la educación delante.
- **Bloque colapsable con estado persistido** (expandido la primera vez, colapsado después). **Descartada:** el recuerdo exige un campo nuevo en `S.config`, y el beneficio es ~300px de scroll una vez por cobro. Un `<details>` cerrado por defecto, sin persistencia, enterraría la educación que el punto 9 pide.
- **La educación detrás de la acción** (después de confirmar, como refuerzo). **Descartada:** el punto 9 es explícito en el orden, y enseñar cómo reparten los expertos cuando el reparto ya se aplicó llega tarde para cambiarlo.
- **Reducir el asistente a una propuesta de un toque** (todo calculado y marcado, una sola pantalla con "Confirmar"), la propuesta completa de la auditoría. **Descartada en esta rebanada, no rechazada como idea:** los pasos no son un formulario que rellenar, son tres decisiones distintas (qué obligaciones cubro, cuánto ahorro, qué hago con lo que sobra) y la tercera es obligatoria por decisión propia de MC.13e-2f-2 (punto 18). Colapsarlas en una pantalla es rediseñar esas tres decisiones, no reordenar contenido: eso es una tarjeta propia, con su triaje.
- **Dos barras, la de referencia y la del usuario.** **Descartada:** la tarjeta de entrada, justo detrás del modal, ya muestra la barra del usuario. En el bloque educativo la comparación se lee mejor en números por fila ("50% · tú 62%") que en dos barras que hay que medir a ojo.

---

## Consecuencias

### Positivas

- El punto 9 y la auditoría quedan servidos a la vez: la educación va delante y el número de interacciones para confirmar no sube.
- Los accesos cruzados vuelven a existir sin saturar: uno por paso, en el paso donde su sección importa.
- Un enlace roto de menos: el hint "Ponle una fecha" ya no deja el modal abierto encima de otra sección.
- Cero CSS nuevo hardcodeado: la referencia sale del preset y los colores de los tokens de dominio que ya usa la tarjeta de entrada.

### Negativas / Restricciones

- **299px de scroll delante de la acción** a 320px de ancho. Es el precio declarado de D2. Si una auditoría futura mide que ese scroll cuesta más que un clic, la salida no es paginar la educación: es acortarla.
- El bloque educativo **no se puede ocultar**. Un usuario que ya sabe la regla 50/30/20 la ve en cada cobro. Se aceptó a cambio de no gastar un campo de schema; revisarlo si aparece la queja.
- El foco de apertura cambió, y con él un test E2E de MC.7f que fijaba el monto como foco inicial. Se reescribió, no se borró.
- La barra 50/30/20 asume que ese preset existe en `PRESETS_DISTRIBUCION`. Si se retira del catálogo, el objeto de respaldo del módulo evita el error de import, pero la referencia dejaría de estar respaldada por una sola fuente.
