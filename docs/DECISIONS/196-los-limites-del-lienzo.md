# ADR 196 - Los límites del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 9 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 9 ("Límites") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15. **Cambia** el [ADR 182](182-gastos-cada-cosa-con-su-forma-y-su-color.md) D6 en el teléfono (la fila sin pastilla, "Sin límite" con "$X este mes", la tarjeta en una línea) y D7 ("Nuevo límite": la categoría en una lista con "Cambiar" y el alcance en el primer paso pasan a tejas por área y al monto) y el [ADR 188](188-gastos-especificacion-integral.md) D7 (la primera vez: "¿Qué es un límite?" con tres pasos pasa a "Ponle un tope a lo que más gastas"). Conserva la alerta del límite más cerca (ADR 182 D6, ADR 188 D5) y la sugerencia: el lienzo dibuja un mes sin límite cerca y sin sugerencia. Escritorio no cambia.

---

## Contexto

La página 9 trae seis tableros: la pestaña Límites, su primera vez, "Nuevo límite" en dos pasos (Categoría y Monto, con "Toda la categoría" y "Solo una parte") y el monto en tema claro. La app ya tenía la tarjeta, la lista por estado, "Otras categorías sin límite" y el formulario en dos pasos, con otra forma. GAS.15j aplica la pestaña y la primera vez; GAS.15k, "Nuevo límite".

## Decisión

### D1. La pestaña Límites (GAS.15j)

- La tarjeta: "Te queda para gastar en noviembre", la cifra con el ojo y una línea, "Usaste **$563.400** de $1.160.000 · faltan 9 días", con la barra debajo. Sale el pie "74 % usado · Faltan 8 días para cerrar el mes" y "en tus N límites".
- "Tus límites · 4" y "+ Nuevo" en el verde de la acción.
- Cada fila: la teja, el nombre y "$108.000 de $100.000"; a la derecha "Te pasaste $8.000" en rojo o "Quedan **$368.600**"; la barra debajo, alineada con el texto, en el color de su estado (rojo, ámbar cerca, verde). Sin pastilla: el estado lo dice la barra y su nombre accesible.
- "Sin límite": cada categoría con "$159.900 este mes" y "+ Límite".
- En el teléfono sale "Tus límites suman $X. Se pasó 1 de N": la tarjeta ya dice lo usado de todos.

### D2. La primera vez (GAS.15j)

- Una tarjeta con Tino y su paraguas de hoja (`tino-reserva`, el mismo dibujo del lienzo) en un cuadro crema, "Ponle un tope a lo que más gastas" y "Finko te avisa cuando llegues al 75 % del límite.".
- "La que más usas": la categoría con más gastos del mes, "Mercado · $431.400" y "Poner límite"; toda la tarjeta abre el límite de esa categoría.
- "Otras categorías con gastos": un chip por cada una, que abre su límite.

### D3. "Nuevo límite": la categoría (GAS.15k)

- La hoja dice "Nuevo límite" sin teja, con una barra de dos pasos en el ámbar de Límites: "Categoría" y "Monto". Hecho el primero, dice la categoría elegida ("Café") y se toca para volver; en el monto, la flecha de la cabecera también vuelve.
- Las categorías van por área (Comida, Transporte, Personal, Casa y familia) en tejas de dos por fila: la teja, el nombre y "Llevas $10.500" o "Sin gastos". Las que ya tienen límite van apagadas, con borde punteado y "Ya tiene límite".
- Tocar una lleva al monto. "Poner límite" (de "La que más usas", "Sin límite" o la sugerencia) abre la hoja ya en el monto de esa categoría.

### D4. "Nuevo límite": el monto (GAS.15k)

- "Toda la categoría" o "Solo una parte" en un riel, cuando la categoría tiene partes. Con "Solo una parte", una pastilla por parte con lo que lleva ("Tinto $4.500"), la elegida en ámbar.
- "Máximo al mes para Café" sobre la cifra grande, y debajo "Llevas $10.500 en noviembre · $18.000 en octubre" (de una parte: "Este mes llevas $4.500 en Tinto").
- Tres montos para tocar alrededor del sugerido ($20.000, $30.000, $40.000) y el teclado de Finko. "Crear límite" con el chulo.

## Alternativas descartadas

- **Quitar la alerta del límite más cerca porque el tablero no la trae:** el tablero dibuja un mes sin ningún límite cerca (Mercado va en 54 %); la alerta sale solo cuando uno pasa el 75 %, y el texto de la primera vez lo promete.
- **Elegir "Toda la categoría" o "Solo una parte" en el primer paso, como antes:** el lienzo lo pone junto al monto, donde se ve lo que lleva cada parte; el primer paso queda en un toque.
- **Conservar la pastilla "Te pasaste"/"Cerca"/"Vas bien":** repetía lo que dicen la frase de la derecha y el color de la barra.

## Consecuencias

- Las pruebas que buscaban `.limite-fila__pastilla`, "Usaste $X de $Y" en la fila, "por encima", "Otras categorías sin límite", "$X · N gastos", `.hero-limites__pie`, `.estilo-olla` en el teléfono o "¿Qué es un límite?", "Paso 1 de 2 · Dónde", la tarjeta de la categoría elegida o "Siguiente: ¿cuánto?" cambian.
- Sin cambios de datos.

## Ajustes al aplicar

- **D1:** en un mes que ya cerró, la línea de la tarjeta no dice días; el último día dice "hoy cierra el mes". En el ámbar de "cerca", la cifra de "Quedan" va en ámbar.
- **D2:** sin gastos en el mes, en lugar de "La que más usas" va "Crear mi primer límite". "La que más usas" es la de más gastos (y, a igual número, la de más plata), como antes "Empieza por". Bajo 375 px el cuadro de Tino se achica.
- **D3:** editar un límite sigue en su hoja de siempre; sin categorías libres, el primer paso lo dice. Las categorías propias y las que no son de un área van al final del último grupo, como "Otros" en el lienzo.
- **D4:** sin parte elegida, "Solo una parte" marca la que más lleva este mes. Los montos sugeridos salen del tope que ya proponía Finko (LIM.1c) y de un paso redondo de su orden; sin historia, no hay. Como el monto del gasto fijo, la hoja no ofrece "Usar el teclado del teléfono" y las teclas bajan a 52 px para que "Crear límite" quepa. A 360 px "$X de $Y" de la fila puede ir en dos líneas.
