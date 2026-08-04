# ADR 050 - Perfil fiscal: ubicación bajo demanda y framing de la obligación de declarar

**Estado:** **Aceptada.** D1 (ubicación) decidida por Esteban el 2026-07-08, pendiente de ejecución en la tarjeta **CFG.2c**. **D2 (framing legal) decidida el 2026-08-03** por delegación explícita de Esteban ("toma tú las decisiones que sean mejor para la app"): alternativa **C acotada**, implementada y en producción con CFG.2b.
**Fecha:** 2026-07-24. Revisado: 2026-08-03.
**Autores:** Esteban (producto, decisión del 2026-07-06 y brief de Ajustes del 2026-07-08), Claude Opus 5 (triaje y redacción)
**Relación:** el tono lo restringe el [ADR 003](003-tono-neutral-profesional.md) (Finko orienta, no dictamina). Las constantes anuales que alimentan los topes son ADN regla 12 y el [ADR 004](004-eliminar-tasa-usura.md) fija qué indicadores quedan fuera por costo de mantenimiento. La ubicación de la interpretación en Análisis coordina con el layout de ANL.1 / [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md). Ficha de la sección: [`contexto/configuracion.md`](../contexto/configuracion.md).

---

## Contexto

La iniciativa CFG.1 + CFG.2 ("perfil fiscal/financiero en Ajustes") se fusionó por decisión de Esteban el 2026-07-06. Su primera parte, **CFG.1a** (situación laboral, schema v25), ya cerró.

El monitor de renta que K.3 dejó en producción (`calcularEstadoRenta`) resuelve la mayor parte de lo que la iniciativa pedía: evalúa los criterios de la DIAN y comunica el resultado. Quedan dos huecos concretos, y son de naturaleza distinta.

El primero es de **captura**: el criterio "Ingresos brutos" exige que el usuario lo teclee a mano, aunque la app ya conoce sus ingresos. Es un problema de implementación con solución conocida, y su dueño es la tarjeta CFG.2a; este ADR no lo decide.

El segundo es de **producto y de riesgo legal**: hoy la app pregunta con un checkbox "La DIAN me notificó como declarante", es decir, le pide al usuario un dato que él mismo puede no saber. Inferirlo de los cinco criterios es técnicamente posible, pero abre una pregunta que no es técnica: **cuánto se afirma**. Esa es la decisión abierta de este documento.

A eso se sumó, en el brief de Ajustes del 2026-07-08, una decisión sobre dónde vive todo esto.

---

## D1. Ubicación: lo fiscal sale de Ajustes permanente (decidida)

Los bloques "Perfil fiscal" y "Datos de renta" **dejan de renderizarse de forma permanente** en Ajustes. Pasan a un asistente que se abre tras un botón explícito ("Completar perfil fiscal"), con solo las preguntas que no se puedan derivar.

Toda la **interpretación y las recomendaciones se consultan en Análisis**, que queda como único lugar donde el estado de renta se explica. Ajustes queda para configuración de la app y nada más.

**Por qué:** un formulario fiscal permanente en Ajustes cobra un costo visual a todos los usuarios en todas las visitas, para un dato que se toca una o dos veces al año. Y tener el dato en Ajustes y su interpretación en Análisis partiría la lectura en dos pantallas.

**Consecuencia:** la ejecución es la tarjeta CFG.2c, y conviene después de CFG.2a y CFG.2b porque esas dos reducen cuántas preguntas quedan vivas en el asistente. El layout del bloque en Análisis se coordina con ANL.1.

---

## D2. Framing de la obligación de declarar (decidida: C acotada)

**La decisión: Finko afirma la regla general y ubica al usuario dentro de ella, pero nunca afirma su obligación como hecho personal.**

Lo que estaba fijado de antemano, porque es ADN y no se negociaba acá: **nunca afirmar certeza legal**. Finko orienta, no dictamina (ADR 003).

### Qué significa "C acotada" en el texto que ve el usuario

La afirmación recae sobre la norma, no sobre la persona: *"Superas el tope de Compras y consumos totales. Superar cualquiera de los 5 criterios de la DIAN normalmente obliga a declarar. Finko no puede confirmarlo por ti: verifícalo con un contador."*

Tres reglas de redacción que salen de esa distinción y que cualquier texto futuro del monitor debe respetar:

1. **El sujeto de la obligación es la regla, no el usuario.** "Superar el tope normalmente obliga", nunca "debes declarar".
2. **El título usa probabilidad, no certeza:** "Es probable que debas declarar renta por 2026".
3. **La derivación al contador viaja con la conclusión**, no en una nota al pie que se puede saltar.

### Por qué C y no A ni B

**A (condicional puro)** era la formulación del brief y la que menos promete, pero su propio contra la hundió: un "podrías" sobre un tope ya superado se lee como "no pasa nada", y el costo de ese malentendido es una declaración perdida. **B (solo criterios)** era el estado que ya existía: cinco barras y ninguna conclusión. Devolvía al usuario el trabajo de interpretar, que es exactamente lo que Análisis existe para evitar, así que no cerraba nada.

C llega tan lejos como se puede sin dar asesoría tributaria, porque **la afirmación que hace es verificable y general** ("superar un tope normalmente obliga a declarar" es la norma, no un dictamen sobre este usuario). El riesgo que preocupaba de C (sonar a contador) se acota con las tres reglas de arriba.

### El encuadre por situación laboral

`perfil.situacionLaboral` (capturado por CFG.1a) cambia el mensaje aunque no cambie la conclusión: a un empleado le corresponde saber que su empleador reporta sus ingresos y que la retención en nómina no reemplaza la declaración; a un independiente, que el reporte es suyo. Va en un párrafo aparte del veredicto: la conclusión responde "¿me toca?" y el encuadre "¿y eso qué significa en mi caso?". Sin situación laboral registrada, el encuadre invita a registrarla.

### Quién decidió y con qué mandato

Esteban delegó la decisión de forma explícita el 2026-08-03 al abrir CFG.2b ("no preguntes nada, toma tú las decisiones que sean mejor para la app"). Queda anotado porque el ADR original reservaba esta decisión para él: el costo de equivocarse no es un bug, es un usuario que no declara porque la app lo tranquilizó, o que paga un contador que no necesitaba porque la app lo asustó. **Si el criterio no es el que Esteban quiere, se cambia con un ADR nuevo que supersede este, no editando el texto de la UI.**

---

## Consecuencias

**El orden de las tarjetas queda fijado por D1.** CFG.2c ejecuta la reubicación y conviene al final, porque CFG.2a y CFG.2b determinan cuántas preguntas sobreviven en el asistente.

**CFG.2b cerró el 2026-08-03 con D2 resuelta.** CFG.2a sigue abierta y no dependía del framing: la derivación automática de ingresos brutos es independiente. Mientras no cierre, el veredicto que ve un usuario sin datos manuales es el estado `sin-conclusion` ("faltan 3 de los 5 criterios"), que es honesto pero no es el objetivo final.

**El checkbox "La DIAN me notificó como declarante" sobrevive, pero solo como override positivo.** Marcarlo fuerza el veredicto a `probable`; dejarlo en blanco no niega nada, porque la conclusión la calculan los criterios. Se conserva porque la DIAN notifica con datos que Finko no ve (rentas de terceros, reportes de exógena), así que es información que la app no puede derivar. Lo que cambió es el encuadre: su ayuda dice que dejarlo en blanco es lo correcto si no se sabe, y ya no aparece en la lista de "situaciones que pueden requerir atención" del perfil fiscal, porque decir lo mismo dos veces en la misma card era ruido.

---

## Fuera de alcance

- **La anualización de `S.ingresos` y la suma de `S.ingresosPuntuales`** para estimar ingresos brutos. Es plan de implementación de CFG.2a, no una decisión: se queda en el tablero.
- **`consumosTC` y `consignaciones`.** Siguen siendo captura manual porque no hay de dónde derivarlos. `consumosTC` pasaría a derivable si se implementa la tarjeta de crédito integrada (MC.16 / [ADR 051](051-tarjeta-de-credito-producto-integrado.md)); revisar en ese momento.
- **El layout del bloque de renta dentro de Análisis.** Es de ANL.1 / [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md).
- **Los valores de los topes.** Son constantes legales con fecha de revisión (ADN regla 12), se actualizan cada enero.

---

## Qué falta para cerrarlo

Nada de este ADR: las dos decisiones están tomadas. Falta **ejecutar D1**, que es la tarjeta CFG.2c del tablero.
