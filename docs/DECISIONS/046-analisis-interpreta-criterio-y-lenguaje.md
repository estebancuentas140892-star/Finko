# ADR 046 - Análisis interpreta: criterio de permanencia y lenguaje

**Estado:** Aceptada el 2026-08-12. Esteban pidió trabajar ANL.1 y delegó explícitamente la elección ("tú decides el enfoque"), igual que en el [ADR 063](063-candado-de-acceso-local.md). Los nombres visibles que fija D2 son los únicos puntos revisables sin reabrir el ADR: cambiarlos es editar strings, no estructura.
**Fecha:** 2026-07-24 (abierta), 2026-08-12 (decidida)
**Autores:** Esteban (producto), Claude Opus 5 (análisis)
**Relación:** extiende el criterio de permanencia que el [ADR 010](010-simplificacion-analisis.md) aplicó una sola vez, **sin reescribirlo**. El [ADR 038](038-analisis-v2-visual.md) ya cerró la capa visual. El lenguaje queda acotado por el [ADR 003](003-tono-neutral-profesional.md), que es ADN. El motor de recomendaciones es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md).

---

## Contexto

Tu planteamiento sobre Análisis fue que hoy es una gran cantidad de gráficos e indicadores que puede resultar abrumadora para alguien sin conocimientos financieros, y que Finko debería **explicar e interpretar, no solo mostrar datos**. Pediste explícitamente revisar la sección completa antes de tocar código, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.

Parte de ese planteamiento ya se resolvió, y conviene tenerlo claro para no volver a decidirlo:

- **La jerarquía y la carga cognitiva** las resolvió el [ADR 010](010-simplificacion-analisis.md) (Aceptada, 2026-06-27): reordenó la sección de mayor a menor relevancia y metió el detalle fino y lo fiscal en colapsables.
- **La reorganización visual** la cerró el [ADR 038](038-analisis-v2-visual.md) (Aceptado, 2026-07-13), que avanzó los puntos 4, 5, 7 y 8 de tu brief. Análisis hereda un lienzo v2 ya montado: lo que venga escribe sobre esas cards, no rediseña de cero.

Lo que queda abierto es lo que ninguno de los dos tocó: **si Análisis interpreta**, con qué criterio sobrevive cada gráfico, y cuánto se traduce el vocabulario técnico.

Hay un precedente que importa mucho, porque significa que el criterio no nace de cero. El ADR 010 **ya eliminó una card**, "Resumen del mes", con esta justificación textual: *tres cifras crudas, sin interpretación, ya visibles en otras secciones*. Es decir, el proyecto ya aplicó una vez la regla "si no interpreta y se ve en otro lado, sale". Lo aplicó a una sola card y de forma puntual, no como criterio general.

Tu punto 1 pide justamente elevarlo a criterio: *cada gráfico debe responder una pregunta concreta; si no responde una pregunta importante ni genera una acción útil, evaluar si sigue siendo necesario*.

Y tu punto 2 pide traducir el vocabulario: activos, pasivos, liquidez, patrimonio, flujo de caja, acompañados de una explicación simple, sin necesariamente eliminar el término técnico.

---

## Inventario: qué hay hoy y qué pregunta responde

Insumo obligatorio de la decisión (punto 4 del cierre original). Verificado contra `modules/dominio/analisis/view.js` el 2026-08-12. Ocho unidades visibles, en orden de render, más una pieza de lógica que nunca llega a pantalla.

| # | Unidad | Pregunta que responde | ¿Interpreta hoy? |
|---|---|---|---|
| 1 | Score de salud (hero) | ¿Qué tan sana está mi situación? | **Sí**: `_fraseScore()` nombra el factor más débil real |
| 2 | Patrimonio neto (card-héroe) | ¿Cuánto tengo de verdad? | **No**: cifra, composición y avisos correctivos. Ninguna línea dice qué significa |
| 3 | Tendencia de gastos (12 meses) | ¿Gasto más o menos que antes? | **Parcial**: el chip da la variación, nadie la lee |
| 4 | Por categoría (dona + filas) | ¿En qué se va mi dinero este mes? | **Parcial**: el centro nombra la categoría top, sin conclusión |
| 5 | Vs mes anterior (colapsable) | ¿Qué categoría cambió y cuánto? | **Parcial**: los highlights ya son frases |
| 6 | Patrón semanal (colapsable) | ¿Qué días gasto más? | **Sí**: etiqueta por día destacado |
| 7 | Gasto hormiga (colapsable) | ¿Qué compras pequeñas suman mucho? | **Sí**: la card entera es una conclusión |
| 8 | Estado de renta (colapsable) | ¿Debo declarar renta? | **Sí**: CFG.2b puso el veredicto al frente ([ADR 050](050-perfil-fiscal-ubicacion-y-framing.md) D2) |
| 9 | `proyectarPatrimonio()` / `proyeccionMultiHorizonte()` | ninguna: **no se renderiza** | n/a: existe en `logic.js` con 8 tests y ningún llamador de vista |

**Lectura del inventario:** el problema no es exceso de gráficos. Son ocho unidades, cinco de ellas ya colapsadas o interpretadas. Lo que falta es la lectura de las tres cards que más pesan visualmente (2, 3 y 4), que son justamente las que muestran números crudos y grandes. La duda del inventario que la ficha de contexto dejó anotada ("nadie averiguó si `proyectarPatrimonio` está desconectada a propósito") queda respondida acá: está desconectada, y sigue así por D4.

---

## Decisión

### D1. El criterio de permanencia es una auditoría única, no una regla general

El criterio del ADR 010 se aplica **una vez** a las ocho unidades del inventario, con tres salidas posibles: **conservar**, **conservar y sumarle lectura**, **relegar a colapsable**. Eliminar no es una salida de esta auditoría.

Una card solo puede salir si cumple **las dos** condiciones textuales que el ADR 010 verificó para "Resumen del mes": no interpreta **y** ya está visible en otra sección. Ese caso se decide con Esteban en el momento, con la evidencia a la vista, y nunca por aplicación posterior de un criterio abstracto.

Lo único que queda como regla permanente es la **compuerta de entrada**: toda card nueva en Análisis declara, en la tarjeta que la propone, qué pregunta responde. Sin esa declaración no entra. La compuerta autoriza a rechazar contenido nuevo, nunca a borrar el existente.

### D2. El titular habla en lenguaje corriente, el término técnico queda como secundario

Variante 3 del brief. Es la única de las tres que cumple sus dos mitades a la vez: pediste "Estado de tu dinero" en vez de "Score financiero", y también "sin necesariamente eliminar el término técnico". El término técnico nunca desaparece: baja al subtítulo o al hint de la misma card, donde sigue enseñando el vocabulario a quien quiera aprenderlo.

| Hoy | Titular | Secundario en la misma card |
|---|---|---|
| `Score de salud` | **Salud de tu dinero** | `Score de salud: 0 a 100` |
| `Patrimonio neto` | **Lo que realmente tienes** | `Patrimonio neto: activos menos pasivos, hoy` |
| `Activos` / `Pasivos` (columnas) | **Lo que tienes** / **Lo que debes** | `Activos` / `Pasivos` |
| `Tendencia de gastos` | **Cómo cambia tu gasto** | `Tendencia, últimos 12 meses` |
| `Por categoría` | **En qué gastas** | `Por categoría, este mes` |

"Liquidez" y "flujo de caja" no aparecen como titular en la sección: el primero es una etiqueta de factor dentro del hero del score (se conserva, con su frase ya traducida en `_FACTORES_SCORE`) y el segundo no existe en el panel. Se listan acá para cerrar el punto 2 del brief sin dejarlo abierto.

### D3. Interpretar es una lectura por card, derivada del dato real

El patrón ya está escrito en el archivo que se va a tocar: `_fraseScore()` genera una línea a partir de los datos reales del usuario, y el ADR 038 descartó a propósito las frases fijas del mockup por ser falsas para un usuario concreto. ANL.1 extiende ese mismo patrón a las cards 2, 3 y 4.

Reglas de la lectura, todas heredadas de ese precedente:

- **Una sola línea por card**, bajo el titular. Si necesita dos, el dato no está listo para interpretarse.
- **Función pura en `logic.js`**, sin DOM, con tests unitarios (ADN 9). La vista solo la imprime.
- **Nunca genérica ni fija**: nombra el hecho concreto del dato (la categoría, el mes, el bucket que domina).
- **Nunca imperativa**: describe, no ordena. Convertir el hallazgo en acción es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md), y ANL.1 no lo espera para escribir la lectura.
- **Verde solo al bajar el gasto**, nunca rojo al subir: la lectura hereda el criterio "gastar no es incumplir" del [ADR 031](031-identidad-de-color-por-seccion.md) D5, que IV.3 aplicó al chip de tendencia y a la comparación de categorías.

### D4. La sección no gana cards, y el hueco de logros queda reservado

ANL.1 es aditiva en texto, no en bloques: ninguna de sus rebanadas agrega una card. Con eso, el layout de Análisis queda **cerrado y declarado** así, de arriba abajo:

1. Salud de tu dinero (hero)
2. Lo que realmente tienes (patrimonio)
3. Grupo "A dónde va tu dinero" (tendencia + categorías)
4. Colapsable "Más detalle de tus gastos"
5. Colapsable "Estado de tu renta"
6. **Bloque reservado: "Tu progreso"** (logros), al final, una sola card compacta

El punto 6 es lo que **desbloquea LG.2d**, que esperaba exactamente esta definición de layout. La interpretación fiscal (CFG.2c) entra dentro del colapsable 5, que ya es su casa, sin abrir bloque propio. `proyectarPatrimonio()` no se conecta: pintarla sería una card nueva, y la proyección a 24 meses sobre un ahorro mensual estimado es la clase de cifra que promete más de lo que el dato sostiene. Se queda en `logic.js` con sus tests, disponible si alguna vez se decide lo contrario.

---

## Alternativas rechazadas

**A. Conservar todo y añadir explicación, sin auditar.** Es lo que la decisión hace en la práctica para las ocho unidades, pero sin la auditoría no habría quedado escrito qué pregunta responde cada card ni existiría la compuerta de entrada de D1. El costo de la auditoría fue una tabla; el beneficio es que la próxima card que alguien quiera meter tiene que justificarse.

**B. Aplicar el criterio a cada card con eliminación como salida.** Rechazada por la asimetría que el propio ADR declaró: añadir un gráfico que sobra cuesta ruido visual, quitar uno que usabas cuesta funcionalidad y confianza. El inventario además le quitó la premisa: con cinco de ocho unidades ya colapsadas o interpretadas, no hay muro que derribar.

**C. Desdoblar en vista simple y vista avanzada.** Rechazada: los colapsables del ADR 010 ya son la versión barata de lo mismo, y un selector de vista traslada al usuario una decisión ("¿cuál es para mí?") que quizá no sepa responder. Duplicaría superficie de mantenimiento para resolver un problema que la lectura por card resuelve sin bifurcar nada.

**Sustituir el término técnico por completo.** Rechazada: contradice la mitad de tu brief que pidió no eliminarlo necesariamente, y le quita a la app la única oportunidad que tiene de enseñar el vocabulario que el usuario va a encontrar afuera, en el banco y en la DIAN.

---

## Consecuencias

**Regresión imposible por eliminación.** Ninguna card sale, así que el riesgo declarado en la tarjeta original queda neutralizado por construcción, no por cuidado al ejecutar.

**Tres funciones puras nuevas en `logic.js`**, con sus tests. Mismo perfil de riesgo del ADR 010 (que se aplicó con 1411 tests verdes sin tocar ninguno), más el costo de los tests nuevos. `view.js` solo imprime lo que la lógica devuelve.

**El memo de PERF.2 no se toca.** Las lecturas derivan de `resumen`, `serieGastos` y `segmentosCat`, que el bundle memoizado ya calcula: no hay barrido nuevo sobre `S.gastos`. Esto responde también el riesgo que la ficha de contexto anotó ("si ANL.1 reestructura qué se calcula, revisar si el bundle sigue teniendo sentido"): no lo reestructura.

**LG.2d se desbloquea.** Su dependencia era el layout de Análisis, que D4 acaba de fijar. Al implementarse, el ADR 022 pasa a Superada, según el ADR 032 D6.

**El lenguaje sigue dentro del ADR 003.** D2 decide el grado de traducción, no el tono: voz "tú", "dinero" y no "plata", claro sin jerga pero serio.

**Cambio de titulares visible en tests E2E.** Los que buscan "Score de salud" o "Patrimonio neto" como texto pasan a buscar el titular nuevo. Se ajustan en la rebanada que cambia el titular, no antes.

---

## Fuera de alcance

- **El motor de recomendaciones accionables.** Es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md). Tu punto 6 y tu punto 10 (convertir el hallazgo en acción sin salir de Análisis) pertenecen allí. Este ADR decide qué se muestra y cómo se nombra, no cómo se convierte en acción.
- **La reorganización visual, el Bento y las cards.** Cerrado en el [ADR 038](038-analisis-v2-visual.md).
- **La jerarquía de lectura y los colapsables.** Cerrado en el [ADR 010](010-simplificacion-analisis.md), que no se reescribe.
- **El tono, la voz y el vocabulario base.** Fijados por el [ADR 003](003-tono-neutral-profesional.md), que es ADN.
- **La interpretación fiscal en Análisis.** Es la tarjeta CFG.2c; D4 le asigna casa (el colapsable de renta) y nada más.
- **El contenido del bloque "Tu progreso".** Es LG.2d y el [ADR 032](032-logros-v2-niveles-y-habitos.md). D4 le reserva el lugar, no diseña la card.
- **El selector de mes real.** Sigue abierto desde DIS.10 (V1): volver interactivo el chip obliga a decidir qué hacen la tendencia de 12 meses y el monitor anual al cambiar de mes. No se decide acá.
- **Mover lo fiscal a Configuración.** El ADR 010 ya lo evaluó y lo descartó para su iteración, dejándolo como opción futura. Sigue abierto en esos términos y no se decide acá.

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [010](010-simplificacion-analisis.md) | Jerarquía de lectura, colapsables, eliminación de "Resumen del mes" | Aplicó el criterio **una vez, a una card**. Este lo aplica una vez más, a las ocho restantes, y decide que no se eleva a regla de eliminación. No reescribe nada del 010 |
| [038](038-analisis-v2-visual.md) | Reorganización visual v2 de la sección | Capa visual, ya cerrada. Este trabaja sobre ese lienzo |
| [003](003-tono-neutral-profesional.md) | Tono, voz y vocabulario de toda la app | Marco ADN. Este decide el grado de traducción de términos financieros dentro de ese marco |
| [044](044-motor-unico-de-sugerencia-por-categoria.md) | Motor de sugerencia por categoría | Este ADR es **consumidor**, no dueño. D3 declara que la lectura describe y no ordena, así que no lo espera |
| [032](032-logros-v2-niveles-y-habitos.md) | Logros v2 y su mudanza a Análisis | Este fija **dónde** cae el bloque de logros (D4). Qué muestra esa card es del 032 |

Ningún ADR existente fija un criterio general de permanencia de gráficos ni el grado de traducción del vocabulario financiero. Verificado antes de escribir este documento.

---

## Implementación

Tres rebanadas, en este orden. Ninguna toca el schema, las migraciones ni el memo de PERF.2.

| Rebanada | Alcance | Decisiones que ejecuta |
|---|---|---|
| **ANL.1a** | Lectura de las tres cards principales: patrimonio, tendencia, categorías. Tres funciones puras en `logic.js` + tests, impresas por `view.js` | D3, y con eso el punto 3 del brief |
| **ANL.1b** | Traducción de titulares de la tabla de D2, con el término técnico como secundario. Ajuste de los E2E que buscan el texto viejo | D2 |
| **ANL.1c** | Lectura del colapsable de detalle donde falte (comparación vs mes anterior). Patrón semanal y hormigas ya interpretan: se revisan, no se reescriben | D3 sobre las unidades 5 a 7 |
