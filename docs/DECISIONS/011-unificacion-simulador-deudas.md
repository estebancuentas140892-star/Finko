# ADR 011 - Unificación del simulador de deudas

**Estado:** Aceptada
**Fecha:** 2026-06-28
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño), Claude Sonnet 4.6 (implementación)

> **Revisada el 2026-06-29 (D.2).** El slice S1 (pago extra como control protagonista siempre visible arriba) fue sustituido: el eje principal vuelve a ser elegir Avalancha vs Bola de nieve, y el pago extra pasa a ser acelerador plegable (plan viable) o remedio (plan inviable). Ver la sección **«Revisión D.2»** al final. El resto de la decisión (S2 a S5) sigue vigente.

---

## Contexto

La simulación de pago de deudas hoy vive en **tres superficies dispersas** que no se hablan entre sí:

1. **Acordeón "Paga un extra cada mes"** (dentro de la card de estrategia, colapsado por defecto): recalcula al salir del campo (`change`), pero el impacto se ve escondido dentro del detalle de la estrategia que el usuario haya elegido (Avalancha o Bola de nieve). Si no eligió ninguna, parece que "no pasa nada" al escribir un monto.

2. **Botón "Simular" por deuda** (en cada fila de la lista de deudas): abre un modal con su propia simulación individual (meses/intereses ahorrados). Solo muestra resultado si el usuario escribe un valor. No se conecta con el panel de estrategia.

3. **Diagnóstico "no se terminan de pagar"** (banner cuando el plan es inviable): lista las deudas que crecen y sugiere renegociar la tasa, consolidar las deudas o aumentar la cuota. Son texto plano: el usuario lee la recomendación pero no puede actuar sobre ella desde ahí.

**El usuario reportó** que tanto el extra como el botón "Simular" parecen no hacer nada, y que las recomendaciones deberían ser herramientas interactivas que muestren el impacto en tiempo real.

---

## Decisión

### Principio central

**Una sola superficie de simulación** dentro de la sección de Deudas, inline (no en modal), con resultados en vivo que el usuario puede ver sin buscar.

### Cambios concretos

1. **El extra mensual se sube arriba de la card de estrategia**, como un control prominente (no un acordeón colapsado), con un **resumen de impacto siempre visible** que compara "sin extra" vs "con extra": nueva fecha de fin, meses menos, intereses ahorrados. Se calcula con `compararEstrategias` (ya existe). Esto arregla "no pasa nada al escribir un valor".

2. **El botón "Simular" por deuda se elimina.** La simulación individual se absorbe en el panel unificado: con el extra mensual y las estrategias visibles, el usuario ya ve el impacto sobre todo el portafolio de deudas. Un simulador por-deuda aporta un dato parcial que no refleja cómo interactúan las deudas entre sí (cuotas liberadas, volcamiento).

3. **Las recomendaciones pasan de texto a herramientas interactivas**, como controles adicionales dentro del panel de estrategia. Cada una tiene su propio input y muestra una comparación en vivo:
   - **Renegociar tasa**: el usuario elige una deuda e ingresa una nueva tasa; se compara el plan actual vs la nueva tasa (reusa `simularPagoDeuda`).
   - **Consolidar deudas**: el usuario ingresa condiciones de un nuevo crédito (tasa, cuota o plazo); se compara la consolidación vs la mejor estrategia actual.
   - **Aumentar cuota**: es el extra mensual ya expuesto arriba. No necesita tratamiento separado.

4. **Las herramientas interactivas son "what-if"**: nunca modifican `S`. Son comparaciones que ayudan al usuario a decidir antes de actuar. Cada resultado incluye el disclaimer orientativo del ADN: "según lo que registras en Finko; confirma con tu entidad financiera".

### Slices de implementación (smallest-first)

| Slice | Qué | Lógica nueva |
|---|---|---|
| S1 | ~~Extra mensual como control principal + resumen de impacto siempre visible~~ **Sustituido por la Revisión D.2** (ver abajo) | No (reusa `compararEstrategias`) |
| S2 | Eliminar botón "Simular" por deuda y su modal | No (solo eliminación) |
| S3 | Reorganizar el acordeón (ya absorbido en S1, limpiar el dead code) | No |
| S4 | "Renegociar tasa" interactivo | `simularRenegociacion` + tests |
| S5 | "Consolidar deudas" interactivo | `simularConsolidacion` + tests |

---

## Alternativas consideradas

- **Mantener las 3 superficies y mejorar cada una por separado:** el usuario describió explícitamente la confusión de tener la simulación fragmentada. Mantener la fragmentación solo reduciría el síntoma, no la causa.
- **Modal unificado de simulación (en vez de inline):** agrega un paso (abrir el modal) que desconecta al usuario de su lista de deudas. Inline es mejor.

---

## Consecuencias

- La card de estrategia se vuelve **el centro de control** de deudas: estrategia + extra + impacto + herramientas what-if.
- El botón "Simular" por deuda desaparece de la lista. Habrá 2 tests E2E (de `estrategia-pago`) y potencialmente tests unitarios que referencien `simular-abono` o `renderSimulacion`: se actualizan o eliminan en S2.
- Las herramientas interactivas (S4, S5) requieren funciones puras nuevas con tests de lógica financiera. La implementación es posterior a S1-S3 y se revisa en sesiones dedicadas.

---

## Revisión D.2 (2026-06-29): el eje principal vuelve a ser la estrategia

**Estado de la revisión:** Aceptada
**Motiva:** backlog del usuario "Visión de Deudas" (D.2).
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño).

### Qué cambia respecto a la decisión original

El punto 1 de la Decisión (slice S1) subió el pago extra mensual **arriba** de las cards de estrategia, como control protagonista con un resumen de impacto siempre visible. En uso real eso invirtió la jerarquía: lo primero que ve el usuario es "¿puedes pagar algo extra?" antes de haber elegido **cómo** va a pagar. La decisión de fondo en Deudas no es cuánto extra aportar, sino **qué estrategia seguir**: Avalancha (ahorrar intereses) vs Bola de nieve (impulso psicológico). El pago extra es un acelerador de esa estrategia, no el punto de partida.

Además, agrupar el pago extra con renegociar y consolidar como herramientas "what-if" siempre presentes mezcló dos cosas distintas: el pago extra sirve para **cualquier** plan (lo acelera), mientras que renegociar y consolidar son **remedios** que solo tienen sentido cuando el plan no se sostiene (las deudas crecen porque la cuota no cubre el interés).

### Nueva jerarquía de la card de estrategia

De arriba hacia abajo:

1. **Encabezado** (título + subtítulo) y, si aplica, el aviso de tasa desconocida.
2. **Elegir estrategia: Avalancha vs Bola de nieve.** Protagonista. Es lo primero accionable, sube por encima de todo lo demás.
3. **Detalle de la estrategia elegida:** "Por qué te conviene / Cómo funciona" + "📊 Tu impacto" + comparativa Avalancha vs Bola de nieve. Sin cambios respecto a hoy.
4. **Acelerador plegable "¿Puedes pagar más rápido?"** (solo cuando el plan es viable): bloque colapsado bajo el detalle. Al abrirlo, el usuario escribe un pago extra mensual y ve el impacto en vivo (meses menos, intereses menos). Reusa el input y el resumen que hoy viven arriba: solo cambian de lugar y dejan de estar siempre expandidos. No es protagonista. Un plan sano no necesita que el extra grite, pero la palanca sigue ahí para quien pueda acelerar.
5. **Bloque "Tu plan no se sostiene"** (solo cuando Finko detecta deudas que crecen, `recomendacion.viable === false`): reemplaza al acelerador. Aquí el pago extra deja de ser opcional y se vuelve el **primer remedio** ("aumenta la cuota"), con su input y su impacto en vivo (mismo resumen, que D.1 ya enseñó a manejar planes inviables sin cifras absurdas). Junto a él, las otras dos salidas: renegociar la tasa y consolidar las deudas.

El pago extra nunca vuelve a estar por encima de la elección de estrategia. Su prominencia es **contextual**: secundaria (plegada) en un plan sano, primaria (remedio) en un plan inviable. Como viabilidad e inviabilidad son estados excluyentes, el input de extra se renderiza en un solo lugar a la vez (no hay duplicación en pantalla).

### Qué reemplaza esto de la decisión original

- **Sustituye el slice S1.** El pago extra ya no es un control siempre visible arriba con resumen permanente. Pasa a ser acelerador plegable (plan viable) o remedio (plan inviable).
- **Mantiene S2 y S3** (botón "Simular" por deuda eliminado, dead code del acordeón barrido): siguen vigentes, ya cerrados.
- **Mantiene S4 y S5** (renegociar tasa y consolidar interactivos): siguen pendientes y ahora tienen un hogar claro, dentro del bloque "Tu plan no se sostiene". Mientras no se construyan, esas dos salidas permanecen como texto orientativo (lo que hoy hace `_renderDiagnosticoInviable`).
- **Mantiene el principio "what-if":** nada de esto muta `S`. Convertir la simulación en acción (aplicar el cambio sobre la deuda) es D.3, posterior.

### Slices de implementación de esta revisión (smallest-first)

| Slice | Qué | Lógica nueva |
|---|---|---|
| D.2a | Reordenar la card: picker arriba; mover el pago extra a un acelerador plegable bajo el detalle (solo plan viable); quitar el input + resumen siempre visibles del tope. | No (reubica `_renderExtraMensual` + `renderResumenExtra`). |
| D.2b | Plan inviable: el pago extra sube como primer remedio dentro de "Tu plan no se sostiene" (input + impacto en vivo); renegociar y consolidar quedan como texto hasta D.3. | No (reusa el resumen; integra con `_renderDiagnosticoInviable`). |

S4 y S5 de la decisión original equivalen a **D.3**: convierten renegociar y consolidar de texto a herramientas interactivas y, además, permiten **aplicar** el cambio sobre la deuda (actualizar `cuotaMensual` o `tasa` sin reeditarla a mano).

### Consecuencias

- La elección Avalancha vs Bola de nieve recupera el centro de la card. El pago extra deja de competir por la atención antes de que exista una estrategia elegida.
- El acelerador plegable mantiene accesible la palanca de "pagar más rápido" sin imponerla. Hay que cuidar la a11y del disclosure: botón con `aria-expanded`, foco visible, tokens `--fk-*`.
- Tests de render que asuman el input de extra arriba de las cards se actualizan en D.2a. La lógica financiera (`compararEstrategias`, `recomendarEstrategia`, `simularEstrategiaPago`) no se toca.
