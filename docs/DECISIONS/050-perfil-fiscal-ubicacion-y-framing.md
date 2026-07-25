# ADR 050 - Perfil fiscal: ubicación bajo demanda y framing de la obligación de declarar

**Estado:** **Parcialmente aceptada.** D1 (ubicación) decidida por Esteban el 2026-07-08 y pendiente de ejecución en la tarjeta **CFG.2c**. **D2 (framing legal) está Abierta**: no implementar la inferencia de declarante sin resolverla con Esteban.
**Fecha:** 2026-07-24
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

## D2. Framing de la obligación de declarar (ABIERTA)

**La decisión pendiente: con cuánta fuerza afirma Finko que el usuario está obligado a declarar renta.**

Lo que sí está fijado de antemano, porque es ADN y no se negocia acá: **nunca afirmar certeza legal**. Finko orienta, no dictamina (ADR 003). Dentro de ese límite siguen cabiendo varias posturas, y la diferencia entre ellas es real.

### Alternativas sobre la mesa

Ninguna está elegida.

**A. Condicional con derivación a un profesional.** Mostrar "podrías estar obligado por X, confirma con un contador" cuando un criterio supere el tope. A favor: es la formulación que el brief traía escrita y la que menos promete. En contra: si el usuario efectivamente está obligado, un condicional débil puede leerse como "no pasa nada" y hacerle perder el plazo.

**B. Solo exponer los criterios, sin conclusión.** Mostrar cada tope y dónde está el usuario respecto de él, sin decir si está obligado. A favor: riesgo legal mínimo. En contra: devuelve al usuario el trabajo de interpretar, que es justo lo que la sección Análisis existe para evitar; deja el hueco que la iniciativa quería cerrar.

**C. Afirmación con matiz por criterio.** Decir "superas el tope de X, esto normalmente implica declarar" y explicar el criterio. A favor: es útil de verdad. En contra: se acerca peligrosamente a asesoría tributaria, que Finko no está en posición de dar.

### El encuadre por situación laboral, que aplica a cualquiera de las tres

`perfil.situacionLaboral` (ya capturado por CFG.1a) cambia el mensaje aunque no cambie la conclusión: a un empleado le corresponde saber que su empleador reporta sus ingresos; a un independiente, que el reporte es suyo. Esto no está en discusión, se da por parte de la decisión cualquiera sea la alternativa elegida.

### Por qué no se cierra acá

Es una decisión de Esteban, no una interpretación técnica. El costo de equivocarse no es un bug: es un usuario que no declara porque la app lo tranquilizó, o que paga un contador que no necesitaba porque la app lo asustó.

---

## Consecuencias

**El orden de las tarjetas queda fijado por D1.** CFG.2c ejecuta la reubicación y conviene al final, porque CFG.2a y CFG.2b determinan cuántas preguntas sobreviven en el asistente.

**D2 bloquea la implementación de CFG.2b, no la de CFG.2a.** La derivación automática de ingresos brutos no depende del framing: se puede hacer antes.

**El estado inferido reemplaza un checkbox que hoy existe.** Cuando D2 se resuelva, el campo manual "La DIAN me notificó como declarante" deja de tener sentido como captura y hay que decidir si se conserva como override, igual que CFG.2a conserva el override de ingresos brutos.

---

## Fuera de alcance

- **La anualización de `S.ingresos` y la suma de `S.ingresosPuntuales`** para estimar ingresos brutos. Es plan de implementación de CFG.2a, no una decisión: se queda en el tablero.
- **`consumosTC` y `consignaciones`.** Siguen siendo captura manual porque no hay de dónde derivarlos. `consumosTC` pasaría a derivable si se implementa la tarjeta de crédito integrada (MC.16 / [ADR 051](051-tarjeta-de-credito-producto-integrado.md)); revisar en ese momento.
- **El layout del bloque de renta dentro de Análisis.** Es de ANL.1 / [ADR 046](046-analisis-interpreta-criterio-y-lenguaje.md).
- **Los valores de los topes.** Son constantes legales con fecha de revisión (ADN regla 12), se actualizan cada enero.

---

## Qué falta para cerrarlo

1. **Esteban elige entre A, B y C** para el framing de D2.
2. Decidir si el checkbox manual actual sobrevive como override cuando la inferencia entre.
