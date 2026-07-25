# ADR 046 - Análisis interpreta: criterio de permanencia y lenguaje

**Estado:** Abierta (decisión sin tomar). No implementar nada de este ADR.
**Fecha:** 2026-07-24
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

## La decisión pendiente

**Dos decisiones encadenadas, ninguna tomada:**

1. **Criterio de permanencia.** ¿Se eleva a regla general el criterio que el ADR 010 aplicó a una card, y se pasa cada gráfico de Análisis por él? En caso afirmativo, cuál es la formulación exacta del criterio y quién decide los casos límite.
2. **Nivel de traducción del lenguaje.** ¿El término técnico se sustituye, se acompaña entre paréntesis, o se relega a secundario? Aplica a activos, pasivos, liquidez, patrimonio neto, flujo de caja y score financiero.

---

## Alternativas sobre la mesa

Ninguna está elegida ni descartada.

### A. Conservar todo, añadir explicación

Ningún gráfico se elimina; cada uno gana título claro, explicación sencilla e interpretación. A favor: riesgo cero de quitarte algo que usas; es puramente aditivo. En contra: no resuelve el problema que abriste. La sección seguiría siendo un muro, solo que con más texto: más contenido, no menos carga.

### B. Aplicar el criterio del ADR 010 a cada card

Cada gráfico se somete a "¿qué pregunta responde? ¿qué acción habilita?" y el que no pase, sale o se relega a un colapsable. A favor: es la lectura literal de tu punto 1 y usa un criterio ya validado en este proyecto. En contra: **riesgo de regresión declarado en la propia tarjeta**, eliminar algo que sí usabas. Un gráfico puede no responder ninguna pregunta accionable y aun así ser el que tú abres cada mes.

### C. Desdoblar en vista simple y vista avanzada

La sección abre en modo simple con lo esencial interpretado; el resto vive tras un cambio de vista. A favor: sirve a las dos audiencias sin eliminar nada, y encaja con el descubrimiento progresivo de tu punto 7. En contra: duplica superficie de mantenimiento y traslada al usuario una decisión ("¿cuál vista es para mí?") que quizá no sepa responder. Los colapsables del ADR 010 ya son una forma más barata de lo mismo.

### Sobre el lenguaje, tres variantes independientes de lo anterior

Sustituir el término técnico ("Lo que tienes") · acompañarlo entre paréntesis ("Activos (lo que tienes)") · dejar el término simple como titular y el técnico como secundario. Tu brief se inclinó por la tercera al pedir "Estado de tu dinero" en vez de "Score financiero" y "Dinero disponible" en vez de "Liquidez", pero también dijo "sin necesariamente eliminar el término técnico". No está cerrado.

---

## Consecuencias esperadas

**El riesgo de la opción B es real y asimétrico.** Añadir un gráfico que sobra cuesta ruido visual; quitar uno que usabas cuesta una funcionalidad y la confianza en que la app no te va a mover el piso. La propia tarjeta lo anota como riesgo de regresión. Cualquier eliminación debería exigir evidencia, no juicio estético.

**Un criterio general es más peligroso que una aplicación puntual.** El ADR 010 eliminó una card con una justificación concreta y verificable ("ya visibles en otras secciones"). Convertirlo en regla general habilita eliminaciones futuras por interpretación de un criterio abstracto. Si se elige B, el criterio debería incluir un requisito de evidencia y una lista explícita de qué sale, no una regla que cualquiera aplique después.

**El lenguaje es ADN, no preferencia.** El [ADR 003](003-tono-neutral-profesional.md) ya fija voz "tú", "dinero" y no "plata", y lenguaje claro sin jerga pero serio. Cualquier variante elegida vive dentro de ese marco: este ADR decide el grado de traducción, no el tono.

**Coordinación con dos iniciativas vivas.** Tu brief pidió que Análisis albergue también la interpretación fiscal (tarjeta CFG.2c) y el progreso de logros (iniciativa LG.2). Ambas suman contenido a la misma sección que este ADR quiere aligerar. Decidir el criterio sin contarlas produce una sección que se limpia y se vuelve a llenar.

**Sin impacto en datos.** Ninguna alternativa toca `logic.js`, el schema ni los tests de cálculo. Es el mismo perfil de riesgo bajo que tuvo el ADR 010, que se aplicó con 1411 tests verdes sin tocar ninguno.

---

## Fuera de alcance

- **El motor de recomendaciones accionables.** Es del [ADR 044](044-motor-unico-de-sugerencia-por-categoria.md). Tu punto 6 y tu punto 10 (convertir el hallazgo en acción sin salir de Análisis) pertenecen allí. Este ADR decide qué se muestra y cómo se nombra, no cómo se convierte en acción.
- **La reorganización visual, el Bento y las cards.** Cerrado en el [ADR 038](038-analisis-v2-visual.md).
- **La jerarquía de lectura y los colapsables.** Cerrado en el [ADR 010](010-simplificacion-analisis.md), que no se reescribe.
- **El tono, la voz y el vocabulario base.** Fijados por el [ADR 003](003-tono-neutral-profesional.md), que es ADN.
- **La interpretación fiscal en Análisis.** Es la tarjeta CFG.2c; se coordina al diseñar el layout, no se absorbe.
- **El progreso y los logros dentro de Análisis.** Es la iniciativa LG.2 y el [ADR 032](032-logros-v2-niveles-y-habitos.md).
- **Mover lo fiscal a Configuración.** El ADR 010 ya lo evaluó y lo descartó para su iteración, dejándolo como opción futura. Sigue abierto en esos términos y no se decide acá.

---

## No duplica

| ADR | Qué decide | Frontera con este |
|---|---|---|
| [010](010-simplificacion-analisis.md) | Jerarquía de lectura, colapsables, eliminación de "Resumen del mes" | Aplicó el criterio **una vez, a una card**. Este decide si se eleva a regla general. No reescribe nada del 010 |
| [038](038-analisis-v2-visual.md) | Reorganización visual v2 de la sección | Capa visual, ya cerrada. Este trabaja sobre ese lienzo |
| [003](003-tono-neutral-profesional.md) | Tono, voz y vocabulario de toda la app | Marco ADN. Este decide el grado de traducción de términos financieros dentro de ese marco |
| [044](044-motor-unico-de-sugerencia-por-categoria.md) | Motor de sugerencia por categoría | Este ADR es **consumidor**, no dueño |

Ningún ADR existente fija un criterio general de permanencia de gráficos ni el grado de traducción del vocabulario financiero. Verificado antes de escribir este documento.

---

## Qué falta para cerrarlo

1. Elegir entre A, B y C, y la variante de lenguaje.
2. Si se elige B, definir el requisito de evidencia y la lista explícita de qué sale, en vez de una regla abstracta.
3. Coordinar con CFG.2c y LG.2 el contenido que sumarán a la sección.
4. Inventariar los gráficos actuales y la pregunta que responde cada uno, como insumo de la decisión.
