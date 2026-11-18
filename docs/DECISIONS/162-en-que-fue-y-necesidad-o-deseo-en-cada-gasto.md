# ADR 162 - "¿En qué fue?" es un paso y cada gasto dice si fue necesidad o deseo

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", punto 3, y sus respuestas en chat), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Cambia** el [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md): D1 (lo contestado ya no se aprende por concepto para los gastos que vienen), D4 (la pregunta es obligatoria al registrar y aparece también en las subcategorías que dependen del día) y D5 (en el teléfono la subcategoría deja de ser una fila opcional del recibo). **Cambia** el [ADR 142](142-formularios-por-tarea.md) D4 en el gasto: tocar una categoría ya no lleva directo al recibo. Conserva la regla de hormiga del ADR 147 D6 y el dato `caracter` (schema v52).

---

## Contexto

Esteban (2026-11-17): un taxi puede ser un deseo (pereza de tomar el bus) o una necesidad (llevar a un familiar a urgencias). Con SUS.2c, contestar una vez "Taxi es un gusto" lo dejaba así para todos los taxis que vinieran. Además la clasificación vivía en una fila opcional del recibo o se preguntaba después, al tocar el gasto: mucha gente la pasa por alto. Y no todo gasto necesita la pregunta: un medicamento siempre es una necesidad.

Pidió que cada categoría ofrezca sus opciones habituales (como en Gastos fijos) y que Finko pregunte necesidad o deseo solo cuando haga falta. En chat eligió: un paso propio, la pregunta obligatoria en cada gasto y las palabras "Necesidad" y "Deseo".

## Decisión

### D1. "¿En qué fue?" es una etapa del teléfono

Monto · Categoría · **Detalle** · Revisar. Tras la categoría, sus subcategorías en una lista con su círculo (como "¿Con qué pagaste?") y "Otra cosa" al final. Tocar una opción avanza al recibo; si la opción pide la pregunta, se queda y la muestra debajo. Sin subcategorías (Otros, una categoría propia), el título de la etapa es la pregunta. Una categoría propia que ya lo dice salta al recibo. La fila "¿En qué fue?" del recibo dice lo elegido y la respuesta ("Taxi · Deseo") y vuelve a la etapa. Medido sin desplazar a 390 x 844 y 375 x 667 con la categoría más larga (Transporte, 7 opciones, más la pregunta).

En escritorio no hay etapas: los mismos grupos van debajo de las categorías ("¿En qué fue?", opcional) y la pregunta aparece al elegir una opción que la pide.

### D2. La pregunta va en cada gasto que la necesita, y es obligatoria al registrar

- **Cuándo** (`preguntaNecesidadODeseo`): cuando lo elegido deja el carácter en "depende". Preguntan Taxi, App de transporte, Domicilio, Restaurante, Ropa, Cine, Otros, Decoración, Regalos... No preguntan Medicamentos, Mercado, Transporte público, Mecato o Café, ni el pago de un fijo o una deuda.
- **Obligatoria al registrar**, en los dos anchos ("Elige si fue una necesidad o un deseo."). Al editar no: un gasto viejo sin respuesta se sigue pudiendo corregir.
- **Vale solo para ese gasto.** Finko deja de aprender por concepto: el próximo taxi se pregunta otra vez. "Repetir" copia la subcategoría pero no la respuesta. Lo que el usuario ya había contestado por concepto antes de esta decisión sigue valiendo para sus gastos viejos sin respuesta.
- **Desde la lista e Inicio** (la pregunta de SUS.2c para un concepto que se repite sin respuesta): la respuesta se escribe en esos gastos, no en lo aprendido. **Desde la ficha** (SUS.2d): corrige solo ese gasto. Las dos con "Deshacer".
- Una categoría propia sigue contestándose una vez, en la categoría (ADR 147 D4).

### D3. El catálogo con las palabras del pedido

Transporte: Transporte público, Taxi, App de transporte (las dos "depende"), Gasolina, Parqueadero, Peajes. Restaurantes: Almuerzo de trabajo (necesidad), Comida rápida (deseo), Restaurante, Domicilio. Los ids no cambian; `transp-app` es nuevo.

### D4. Las palabras: Necesidad y Deseo

La pregunta es "¿Fue una necesidad o un deseo?" con "Necesidad" y "Deseo", en el formulario, la ficha, la lista, Inicio y Límites; "gustos pequeños" pasa a "deseos pequeños" en Gastos, Análisis, Límites y los logros. El dato de "Deseo" sigue siendo `gusto`, sin migración. Aprende no cambia: enseña la regla 50/30/20 con "tus gustos".

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Fila opcional del recibo (como SUS.2a) | Es lo que el pedido señala: se pasa por alto. |
| Pregunta con "Omitir" | Esteban la eligió obligatoria; un toque más solo en lo que depende del día. |
| Sugerir la última respuesta de esa subcategoría | Vuelve a decidir por la persona lo que depende de la situación. |
| Preguntar en todo gasto | Un medicamento o el mercado no dependen del día: sería ruido. |
| Borrar lo aprendido por concepto | Sin migración, los gastos viejos perderían su clasificación; se conserva para ellos. |

## Consecuencias

- Un toque más al registrar en el teléfono (la subcategoría) y otro solo cuando la opción depende del día.
- El número de deseos pequeños se vuelve más fiel: cada taxi cuenta según lo que el usuario dijo de ese taxi.
- Límites conserva "Lo que le contaste a Finko" para corregir lo aprendido antes de esta decisión; ya no crece.
