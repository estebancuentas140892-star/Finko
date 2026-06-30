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
| S4 | "Renegociar tasa" interactivo **+ aplicar** (= D.3a, hecho; ver Revisión D.3) | `simularRenegociacion` + tests |
| S5 | "Consolidar deudas" interactivo **+ aplicar** (= D.3b, hecho; ver Revisión D.3) | `simularConsolidacion` + tests |

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

---

## Revisión D.3 (2026-06-29): la simulación puede convertirse en acción

**Estado de la revisión:** Aceptada
**Motiva:** backlog del usuario "Visión de Deudas" (D.3).
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño + implementación).

### Qué cambia respecto a la decisión original

La decisión original (punto 4) fijó que las herramientas interactivas son **"what-if": nunca modifican `S`**. D.3 matiza ese principio: la **simulación sigue siendo what-if** (escribir una tasa nueva y ver el impacto no toca los datos), pero se añade una **acción explícita de "Aplicar"** que sí escribe el cambio sobre la deuda en un paso, para no obligar al usuario a reeditarla a mano.

El principio se reformula así: **la simulación nunca muta `S`; solo un botón "Aplicar" explícito, con confirmación, lo hace.** La mutación deja de ser un efecto colateral de simular y pasa a ser una decisión deliberada del usuario.

### Corte por herramienta (acordado con el usuario)

D.3 se implementa **vertical por herramienta** (cada una simula y aplica de punta a punta), no horizontal:

- **D.3a (renegociar tasa):** `simularRenegociacion(deuda, nuevaTasaEA)` (puro, reusa `simularPagoDeuda`, que ahora expone `completo`). La herramienta vive en el bloque "Tu plan no se sostiene": el usuario elige una deuda con tasa conocida, escribe la tasa que cree poder conseguir (en la unidad nativa de la deuda: EA para entidad, mensual para personal) y ve la comparación en vivo. El botón "Aplicar nueva tasa" se habilita solo si la nueva tasa mejora el plan, pide confirmación y escribe `tasa` + `tasaUnidad` sobre la deuda. Cubre el caso inviable→viable sin restar cifras divergentes (hereda el patrón de D.1).
- **D.3b (consolidar deudas):** `simularConsolidacion(deudas, { tasaEA, cuota })` (puro). Junta **todas** las deudas pagables en un crédito nuevo único (saldo = suma) y compara el plan actual (Avalancha, sin extra) contra el crédito nuevo. El "Aplicar" muta más de un registro: **crea** la deuda de consolidación (`guardar`, tipo `deuda-entidad`, EA) y **archiva** (`activo:false`) las consolidadas; por eso la confirmación nombra el monto, la tasa y cuántas deudas se archivan. El botón se habilita solo si consolidar reduce los intereses o vuelve pagable un plan inviable (bajar solo la cuota, a más interés total, no cuenta como mejora). El ahorro de meses se muestra con signo (consolidar a una cuota menor puede alargar el plazo aunque baje el interés). Alcance v1: consolida todas las deudas; la selección parcial queda como mejora futura.

### Consecuencias

- `simularPagoDeuda` ahora devuelve `completo` (sin romper a sus consumidores; no tenía ninguno en producción). `filtrarDeudasPagables` expone `tasaUnidad` para que la herramienta pregunte y aplique en la unidad correcta.
- La verificación del cableado de eventos (input/change/click) se hace por **E2E (Playwright)**, no por el preview: el dev-server cachea los módulos de forma agresiva y no refleja los cambios (ver memoria "preview envenenado").
- La a11y de los flujos de aplicar reusa el modal `confirmar()` existente; los botones "Aplicar" / "Consolidar" arrancan `disabled` mientras no haya un cambio que mejore.

**Con D.3a + D.3b, S4 y S5 quedan cerrados: ADR 011 está completamente implementado** (S1 sustituido por la Revisión D.2; S2/S3 hechos; S4/S5 hechos como D.3a/D.3b).

---

## Revisión D.7 (2026-06-29): el bloque inviable pasa de tres remedios simultáneos a un botón único que abre un panel con selector

**Estado de la revisión:** Aceptada
**Motiva:** backlog del usuario "Visión de Deudas, jornada 2" (D.7). Objetivo común de esa jornada: que la sección se sienta **limpia**, con Avalancha y Bola de nieve siempre de protagonistas, y que las herramientas de ayuda aparezcan **solo cuando hacen falta, una a la vez**.
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño).

### Qué cambia respecto a la Revisión D.2

La Revisión D.2 (D.2b) consolidó los remedios del plan inviable en un único bloque "Tu plan no se sostiene" (`_renderDiagnosticoInviable`). Con D.3a y D.3b ese bloque creció: hoy muestra **a la vez** el diagnóstico, el remedio de pago extra ("💪 Aumenta tu cuota"), la herramienta de renegociar tasa ("🤝", `renderRenegociar`) y la de consolidar ("🏦", `renderConsolidar`). En uso real se siente **saturado**: tres remedios completos abiertos al mismo tiempo, cada uno con sus inputs y su comparativa, compiten entre sí y tapan la decisión principal (qué estrategia seguir).

D.7 no cambia la lógica financiera ni los principios de D.2/D.3 (estrategia protagonista, simulación what-if, "Aplicar" explícito con confirmación). Cambia **cómo se presentan los remedios cuando el plan es inviable**: dejan de mostrarse los tres a la vez y pasan a vivir detrás de **un solo botón destacado** que abre **un panel** con un **selector** que muestra **una alternativa a la vez**.

### Nueva jerarquía de la card en estado inviable

De arriba hacia abajo, cuando `recomendarEstrategia(...).viable === false`:

1. **Encabezado** y, si aplica, el aviso de tasa desconocida (`_renderAvisoTasaDesconocida`). Sin cambios.
2. **Elegir estrategia: Avalancha vs Bola de nieve.** Protagonista, igual que en el plan viable. El picker no se mueve ni se opaca por estar el plan inviable.
3. **Detalle de la estrategia elegida.** Sin cambios: "Tu impacto" ya comunica honestamente "No se termina de pagar" cuando la cuota no cubre el interés (patrón D.1).
4. **Botón único de alerta + acción** (reemplaza al bloque "Tu plan no se sostiene" abierto de hoy, y ocupa el lugar que el acelerador plegable ocupa en el plan viable: **debajo del detalle**). El botón es la única superficie visible del remedio mientras está colapsado.
5. **Panel de alternativas** (solo cuando el botón está activado): diagnóstico + selector de 3 alternativas + el contenido de la alternativa elegida.

Con esto el bloque inviable deja de competir con la elección de estrategia. La elección Avalancha vs Bola de nieve mantiene el centro de la card; el remedio se ofrece como una llamada de atención clara pero contenida, debajo, igual que el acelerador en el plan sano. Esto **corrige la deriva** del código actual, donde `_renderDiagnosticoInviable` se renderiza **arriba** del picker (`estrategia.js`): D.2 ya pretendía que el bloque inviable "reemplazara al acelerador" (debajo del detalle), y D.7 lo concreta ahora que cabe detrás de un botón.

### El botón único

Mientras el panel está cerrado, el estado inviable se resume en **un botón destacado** que (a) **alerta** al usuario de que tiene un problema real con sus deudas y (b) lo **lleva a actuar**. Copy aprobado con el usuario (tono de alerta + acción, voz "tú", sin jerga, sin guion largo):

> **🚨 Cuidado: tu plan de pago no se sostiene. Veamos cómo resolverlo**

El detalle del diagnóstico (qué deudas crecen y por qué, cuánto extra mínimo haría falta) **se mueve adentro del panel**: en estado colapsado basta la alerta del botón, para no recargar la card. El botón usa un estilo de alerta (no el `--primary` neutro) con tokens `--fk-*`; nunca arranca `disabled` (siempre se puede explorar las alternativas).

### El panel y el selector

Al activar el botón se despliega el panel, con esta estructura de arriba hacia abajo:

1. **Diagnóstico** (texto): las deudas que crecen y por qué (lista de `deudasCrecientes`), y el pago extra mínimo estimado (`extraMinimo`) si existe. Es el contexto que justifica las alternativas. Es lo que hoy abre `_renderDiagnosticoInviable`, ahora dentro del panel.
2. **Selector de alternativas** (control segmentado de 3 opciones, tipo pestañas): **💪 Aumentar la cuota · 🤝 Renegociar la tasa · 🏦 Consolidar**. Cada opción que no aplica al portafolio actual no se ofrece (igual que hoy: renegociar exige al menos una deuda con tasa > 0; consolidar exige >= 2 deudas pagables).
3. **Contenido de la alternativa elegida, y solo esa.** No se muestran las tres a la vez: el selector intercambia el cuerpo. "Aumentar la cuota" reusa el input de extra + `renderResumenExtra`; "Renegociar" reusa `renderRenegociar`; "Consolidar" reusa `renderConsolidar`. Cada una conserva su Simular + Aplicar de D.3.

**Alternativa activa por defecto:** "Aumentar la cuota". Es el remedio más universal (sirve aunque no haya tasa conocida ni varias deudas), y el diagnóstico ya calcula el `extraMinimo` que la alimenta. Si "Aumentar la cuota" no estuviera disponible en algún caso futuro, el default cae a la primera alternativa ofrecida.

### Estado UI del panel (por qué no `<details>`)

La card se **re-renderiza completa en cada pulsación** de los inputs de extra, renegociar y consolidar (los handlers de `index.js` hacen `setEstrategiaUI(...)` + re-render). Un `<details>` nativo perdería su estado `open` y el selector volvería a su default en cada tecla. Por eso, igual que el resto del estado de la card, el panel vive en el singleton UI `_uiEstrategia` (`estrategia.js`), con dos campos nuevos:

- `panelAlternativasAbierto: boolean` (default `false`): si el botón está activado.
- `alternativaActiva: 'aumentar' | 'renegociar' | 'consolidar'` (default `'aumentar'`): la opción del selector visible.

Dos data-actions nuevos, delegados en `index.js` (cero `onclick`): `abrir-panel-alternativas` (alterna `panelAlternativasAbierto`) y `elegir-alternativa` (`data-alternativa="..."`, fija `alternativaActiva`). Ambos solo mutan estado UI + re-render; no tocan `S`.

### Decisión D.9: "Aplicar" en "Aumentar la cuota" es automático y siempre conviene al usuario

La pregunta abierta que el backlog dejó para este ADR fue: al **aplicar** el aumento de cuota, ¿el extra se reparte entre deudas según la estrategia o sube la cuota de una deuda concreta? Y, en cualquier caso, ¿quién elige la deuda?

**Decisión (acordada con el usuario): Finko reparte el aumento automáticamente, sin preguntarle al usuario a qué deuda aplicarlo.** El motivo es de producto: si el usuario elige mal la deuda, se pierde la intención de Finko (acompañar a la mejor decisión). El reparto automático sigue un criterio fijo que **siempre beneficia al usuario**:

1. **Primero, que ninguna deuda siga creciendo.** El extra cubre el déficit mensual (`interesMensual - cuota`) de cada deuda que crece, en el orden de las que más rápido crecen, hasta que todas dejen de crecer. Esto es lo que vuelve viable el plan.
2. **El remanente, a la deuda de mayor tasa** (criterio Avalancha), donde cada peso adicional ahorra más intereses. Es el reparto óptimo en costo, independiente de la card que el usuario esté mirando: aplicar "siempre beneficiando al usuario" significa minimizar el interés total.

El "Aplicar" **escribe la nueva `cuotaMensual`** sobre cada deuda afectada (vía EventBus + `guardar`, patrón de D.3), con una **confirmación** que nombra cada deuda y su nueva cuota, para que la mutación sea una decisión deliberada y transparente (no un efecto colateral de simular). Ese nuevo `cuotaMensual` alimenta de forma natural:

- los **pagos programados** (que leen `cuotaMensual` por deuda), y
- las **próximas distribuciones de ingreso** (MC.4b ya abona a deudas ordenadas por prioridad Avalancha y topa al saldo; una cuota mayor en la deuda prioritaria se respeta sin lógica nueva).

**Limitación v1 (honesta, hereda el límite del modelo estático):** `cuotaMensual` es un valor fijo por deuda; no replica el "volcado" dinámico de la simulación (cuando una deuda cierra, su cuota liberada no se reasigna sola a la siguiente). Cuando una deuda se salda, el usuario puede **re-aplicar** para volcar el extra a la siguiente. El volcado automático queda como mejora futura (requeriría un plan de pago persistente, fuera del alcance de D.9).

Esto introduce **una función pura nueva** en `logic.js` (repartir un extra mensual en incrementos de `cuotaMensual` por deuda, cubriendo déficits y concentrando el remanente en la mayor tasa), con sus tests de lógica financiera. Por eso D.9 es Opus 4.8 - Alto: muta `S`, cruza con distribución y pagos, y suma lógica financiera testeable.

### Qué reemplaza / mantiene

- **Reemplaza la presentación del bloque inviable de D.2b/D.3:** los tres remedios dejan de renderizarse abiertos y simultáneos (`_renderDiagnosticoInviable` con extra + `renderRenegociar` + `renderConsolidar` en cascada). Pasan a un botón → panel → selector de una alternativa a la vez.
- **Mantiene toda la lógica financiera de D.2/D.3:** `compararEstrategias`, `recomendarEstrategia`, `simularEstrategiaPago`, `simularRenegociacion`, `simularConsolidacion` no se tocan. Renegociar y Consolidar conservan su Simular + Aplicar tal cual; solo cambian de contenedor (se reubican dentro del selector).
- **Mantiene el principio de jerarquía de D.2:** la elección Avalancha vs Bola de nieve es protagonista; el remedio es contextual y se ofrece debajo del detalle.
- **Mantiene el principio de D.3:** la simulación nunca muta `S`; solo un "Aplicar" explícito y confirmado lo hace. D.9 extiende ese principio a la tercera superficie (aumentar la cuota), que hasta hoy era solo what-if.

### Slices de implementación de esta revisión (smallest-first)

| Slice | Qué | Lógica nueva |
|---|---|---|
| D.8 | Panel de alternativas con selector. Botón único de alerta que alterna `panelAlternativasAbierto`; panel con diagnóstico + selector de 3 alternativas (`alternativaActiva`) que muestra **solo** el contenido de la elegida; reubicar el extra, `renderRenegociar` y `renderConsolidar` dentro del selector. Estado UI en `_uiEstrategia`; 2 data-actions nuevos. Verificar el cableado por E2E (preview envenenado). Modelo: **Sonnet 4.6 - Alto** (reorganización de UI con estado de selector, sin lógica financiera nueva). | No (reubica renderers existentes). |
| D.9 | "Aumentar la cuota" como acción aplicable real. Reparto automático del extra (cubrir déficits, remanente a la mayor tasa) como **función pura nueva** + tests; "Aplicar" con confirmación que escribe `cuotaMensual` sobre las deudas afectadas vía EventBus; el nuevo valor alimenta pagos programados y MC.4/MC.6. Modelo: **Opus 4.8 - Alto** (muta `S`, cruza con distribución y pagos, lógica financiera nueva). | Sí (`repartir` extra en cuotas + tests). |

### Alternativas consideradas

- **Modal en vez de panel inline:** agrega un paso (abrir/cerrar modal) y desconecta al usuario de su lista de deudas y de la estrategia elegida. El ADR original ya rechazó el modal para la simulación; D.7 mantiene inline por coherencia.
- **Acordeón con las 3 alternativas plegables independientes** (cada una abre/cierra por su lado): podrían quedar las tres abiertas a la vez, que es justo el problema que D.7 resuelve. El selector de "una a la vez" lo evita por diseño.
- **Que el usuario elija a qué deuda aplica el aumento de cuota:** descartado por decisión del usuario. Una elección manual mal hecha contradice la intención de Finko de guiar a la mejor decisión; el reparto automático que minimiza intereses es más seguro y siempre conviene.
- **Guardar el extra como un valor de plan (sin tocar `cuotaMensual`):** preservaría el volcado dinámico, pero los pagos programados leen `cuotaMensual` por deuda y no lo verían. Como el objetivo de D.9 es que el aumento alimente pagos programados y distribución, se escribe sobre `cuotaMensual`.

### Consecuencias

- La card en estado inviable queda **limpia**: estrategia + detalle + un botón. El usuario que quiere actuar abre el panel y trabaja una alternativa a la vez; el que solo revisa su plan no recibe tres formularios encima.
- El bloque inviable se mueve **debajo del detalle** (donde D.2 lo había pensado), lo que toca el orden de render en `estrategia.js`. Los tests de render que asuman el diagnóstico arriba del picker se actualizan en D.8.
- D.8 no añade lógica financiera: el riesgo es de estado de UI (que el selector y el panel sobrevivan al re-render por tecla). Se verifica por E2E, no por el preview (memoria "preview envenenado").
- D.9 sí añade lógica financiera (el reparto automático) y es la tercera superficie de "simular → aplicar". Su confirmación reusa el modal `confirmar()` existente y nombra cada deuda afectada con su nueva cuota.

**D.7 deja a ADR 011 con un plan claro de cierre para la jornada 2 de Deudas: D.8 reorganiza la UI del bloque inviable, D.9 convierte "Aumentar la cuota" en acción aplicable.**
