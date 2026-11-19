# ADR 182 - Gastos en el teléfono: cada cosa con su forma y su color

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (tablero "Gastos de Finko · Rediseño móvil"; pedido: "vamos a realizar los cambios propuestos en este HTML"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 179](179-gastos-en-cuatro-pestanas.md) D1 (la pestaña Fijos y las pastillas de las pestañas), D2 (el ojo en la tarjeta), D3 (los chips con su total y el comparativo en porcentaje), D4 (Fijos), D5 (Deudas), D6 (Límites por grupos) y D7 (los tres caminos de la primera vez); el [ADR 127](127-identidad-bosque-y-sol.md) D5 (la tarjeta de cada lente en el tono de su sección, solo en el bloque Gastos del teléfono) y el [ADR 157](157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D4 (el "$" chico). Todo bajo 1024 px. Escritorio no cambia.

---

## Contexto

El tablero trae 14 páginas: un sistema de color, tres de Día a día (con movimientos, con un filtro y muchos registros, usuario nuevo), tres de Deudas (con entidades, con personas, sin deudas), tres de Límites (con límites, primer uso, nuevo límite por subcategoría), tres de Agregar cuenta (tipo, cuenta de ahorros, tarjeta de crédito) y una de Tino, cada pantalla en los dos temas.

El diagnóstico de la primera página: hoy la tarjeta del mes, los vencidos, el filtro elegido y los íconos de gasto comparten la familia vino y rosa del coral y se leen como una sola cosa. La propuesta reparte la paleta del isotipo por trabajo: **bosque resume, rojo avisa, girasol sugiere, el neutro filtra y cada categoría tiene su tono**. Si algo se ve rojo, es porque necesita atención.

La última página es de Tino: aparece cuando hay algo que contar (un hallazgo, una sugerencia, una alerta, un vacío por estrenar, un logro) y nunca donde solo hay datos. Pide cinco poses nuevas que Esteban entrega después.

## Decisión

### D1. Los roles de color y el encabezado (GAS.8a)

| Rol | Pregunta | Color | Dónde |
|---|---|---|---|
| Resumen | ¿Cuánto llevo? | Bosque `#184e40`, igual en los dos temas, cifra blanca (9,5:1) | La tarjeta de arriba de cada pestaña, con dos anillos del isotipo arriba a la derecha. Adentro solo el dato, su comparación y, si aplica, la barra por categoría. Nunca alertas ni botones de acción. |
| Alerta | ¿Qué necesita mi atención ya? | Rojo (vencido o te pasaste) y ámbar (te estás acercando) | Una franja con el ícono sólido en un círculo, el dato y un verbo. Solo aparece cuando hay algo que hacer. El rojo no se usa para nada más en Gastos. |
| Sugerencia | ¿Qué me propone Finko? | Girasol del isotipo al 8 % | Tino y una acción; siempre se puede descartar. |
| Filtro | ¿Cómo busco, filtro u oculto? | Sin color: contorno neutro | La opción elegida se invierte (fondo del color del texto), así un filtro nunca se confunde con un dato. |
| Categoría | ¿En qué se fue el dinero? | Un tono por categoría | Solo en su teja y en la barra del resumen; el monto y el texto van en el color del texto. |
| Sección | ¿Dónde estoy? | Coral de Gastos | La teja del encabezado y la barra de abajo; no pinta cifras, filtros ni íconos de gasto. |

Los nueve tonos del tablero (Mercado, Restaurantes, Transporte, Ropa, Café, Salud, Hogar, Entretenimiento, Servicios) son tokens `--fk-cat-*`, con su par oscuro en el tema claro. Las demás categorías toman el tono de su pariente (Mecato y Gastos hormiga el de Café, Alimentación el de Mercado, Vivienda y Mascotas el de Hogar, Servicios públicos el de Servicios) o uno de tres nuevos en la misma familia (Educación índigo, Cuidado personal y Familia rosa); Otros, las internas y las propias, el de Servicios.

**Encabezado:** la teja coral con el recibo, "Gastos", y la lupa y el ojo en círculos. El ojo vuelve a la fila del nombre y tapa la lente de su encabezado (ADR 166): Día a día, Por pagar y Deudas (comparten el suyo) o Límites. Las pestañas no llevan pastillas: lo vencido lo avisa Día a día y encabeza Por pagar.

### D2. Día a día (GAS.8b)

- **Tarjeta:** "Gastaste en **noviembre ⌄**", la cifra, la comparación en pesos a la misma altura del mes anterior ("$48.000 menos que octubre a esta altura del mes"; en un mes cerrado, contra el mes entero), la barra por categoría (cada una en su tono, de más a menos) con la leyenda de las dos primeras y "Categorías ›", que lleva a Análisis.
- **Aviso de lo vencido:** la franja roja con el pago más antiguo ("1 pago vencido", "Netflix · $44.900 · venció hace 16 días", "Pagar ›"); con varios, cuántos y cuánto suman. Lleva a Por pagar.
- **Filtros:** el embudo ("Más filtros: cuenta y fechas", abre el historial de Gastos) y los chips neutros, sin total.
- **Días:** "Hoy · jue 19" con su total; la semana en curso va día por día y las anteriores del mes se pliegan bajo "Semanas anteriores · Toca para abrir" ("Del 9 al 15 de noviembre", cuántos gastos, cuánto).
- **Con un chip:** "Restaurantes en noviembre", la cifra, "6 gastos · el 22 % de lo que gastaste este mes" y, si la categoría tiene límite, una ficha adentro: "Límite de Restaurantes", "Quedan $15.500" (o "Te pasaste $X"), la barra y "91 % de $170.000 · faltan 11 días".

### D3. Gastos fantasma y la primera vez (GAS.8c)

- **Gastos fantasma:** la sugerencia girasol que reemplaza el aviso de gastos hormiga (ADR 146): Tino, "Gastos fantasma", "9 cafés y antojos pequeños ya suman $86.500 este mes.", "Ver cuáles" y la equis para descartarla en el mes. Va después del primer día.
- **Primera vez:** una tarjeta con Tino explica, "Aquí verás en qué se va tu dinero", "Cada gasto que registres aparece aquí, ordenado por día. Con unos pocos, te muestro en qué categorías se te va más." y "Registrar mi primer gasto"; debajo "¿En qué gastaste hoy?" con cuatro tejas (Mercado, Comida, Transporte, Café) que abren el gasto con su categoría, y la pista "¿Pagas algo cada mes, como el arriendo o Netflix? Agrégalo en Por pagar y te lo recuerdo."

### D4. Por pagar (GAS.8d)

La segunda pestaña vuelve a llamarse **Por pagar** (`#fijos` sigue siendo su hash): la lista del mes junta los gastos fijos y las cuotas de las deudas, lo vencido primero, con los grupos y la tarjeta "Te falta pagar en {mes}" de Fijos (ADR 179 D4). Deudas sale de Por pagar para que el inventario de lo que debes no se mezcle con la lista del mes.

### D5. Deudas (GAS.8e)

- **Tarjeta:** "Debes en total", la cifra, "Este mes pagas $1.230.000 en cuotas" y una barra partida en entidades y personas, con su leyenda.
- **Dos puertas:** "Con entidades" y "Con personas", con cuántas deudas tiene cada una; la elegida lleva el borde del color del texto. Debajo, una frase de qué va en cada una.
- **La fila:** la teja de la marca (o las iniciales de la persona), el nombre, "Davivienda · cuota $610.000" ("Le pagas $200.000 cada mes · el 15" o "Sin fecha fija" en una persona), "te falta" con su monto, y la barra: "42 % pagado" o, en la tarjeta, "68 % del cupo" en gris. Una cuota vencida suma la pastilla roja "Cuota vencida hace 9 días · Pagar".
- **Al pie:** en entidades, "¿Cómo salir más rápido?" (la simulación, con Tino pensando) y "+ Agregar deuda con una entidad"; en personas, la pista de Me deben y "+ Agregar deuda con una persona".
- **Vacío:** Tino separando en dos grupos, "¿Le debes dinero a alguien?", la frase, las dos puertas ("A un banco o entidad", "A una persona") y Tino tranquilo: "Si no le debes a nadie, no tienes que hacer nada aquí. Así se está bien."

### D6. Límites (GAS.8f)

- **Tarjeta:** "Te queda para gastar en {mes ⌄}", la cifra, "Usaste $700.100 de $920.000 en tus 3 límites", la barra y "76 % usado · Faltan 11 días para cerrar el mes".
- **Una alerta:** la del límite más cerca de pasarse, en ámbar, con Tino sorprendido ("Restaurantes va en 91 %", "Te quedan $15.500 para 11 días", "Ver"); si no hay uno cerca y sí uno pasado, la roja.
- **Tus límites:** una lista, con "· 3 activos" y "+ Nuevo". Cada fila: la teja de su tono, "Usaste $154.500 de $170.000", lo que queda (o "por encima") y la barra con su pastilla: "Te pasaste" (rojo), "Cerca" (ámbar), "Vas bien" (verde).
- **La sugerencia:** con Tino pensando, la categoría sin tope con más gastos ("Has hecho 9 gastos en Café este mes"), "Poner límite a Café" y "Ahora no". Debajo, "Otras categorías sin límite"; "Tu plan" y lo demás siguen al final.
- **Primer uso:** "¿Qué es un límite?" con Tino atajando una moneda y los tres pasos (eliges una categoría, pones el monto del mes, te aviso al llegar al 80 %); "Empieza por {la categoría que más usas}" con su botón, y "Otras categorías sin límite" con "+ Límite".

### D7. Nuevo límite en dos pasos (GAS.8g)

En el teléfono, "Nuevo límite" es una hoja de dos pasos con su barra de avance. **Paso 1, dónde:** la categoría con "Cambiar", "Toda la categoría" o "Solo una parte" (ADR 164) y, en la segunda, una opción por subcategoría con lo que llevas este mes; una nota girasol cuando la subcategoría tiene algo que contar. **Paso 2, cuánto:** el monto, con "Siguiente: ¿cuánto? →" como paso entre los dos.

### D8. Agregar cuenta (GAS.8h)

Una hoja de tres pasos. **Paso 1:** "¿Qué quieres agregar?" en dos grupos: **Dinero tuyo** (Efectivo, Cuenta de ahorros, Cuenta corriente) y **Dinero prestado** (Tarjeta de crédito, "También aparece en Deudas"); con la primera cuenta, Tino saluda: "Empieza por la que usas más, como la de tu sueldo." **Paso 2:** el buscador y la grilla de bancos y billeteras con su logo, y "¿No está tu entidad? Escríbela"; en la tarjeta, la tarjeta dibujada con el banco elegido y "Lo que uses aparecerá en Deudas · Con entidades". **Paso 3:** los datos de siempre.

### D9. Tino en Gastos

Tino deja el encabezado y entra solo en los momentos con historia. Ya existen siete poses (explica, pensando, tranquilo, celebra grande, saluda, hamaca). Las cinco nuevas (fantasma, atajando una moneda, sorprendido, sorprendido solo cabeza, separando en dos grupos) las dibuja Esteban; mientras llegan, cada momento usa la pose existente más cercana (`POSE_TINO_INTERINA` en `infra/ilustraciones.js`): fantasma con lupa, atajando y separando explica, sorprendido pensando. Al llegar cada SVG basta con sumarlo a `TINO_ORIGINAL`, a `assets/tino/` y al SW, y quitar su línea de la tabla.

### D10. Lo que cambia de ADR anteriores

- **ADR 179 D1 y D4:** la pestaña Fijos vuelve a ser Por pagar, con fijos y cuotas; las pestañas dejan sus pastillas.
- **ADR 179 D2:** el mes sigue en el rótulo de cada tarjeta; el ojo vuelve a la fila del nombre.
- **ADR 179 D3:** los chips pierden su total y el comparativo pasa de porcentaje a pesos a la misma altura del mes.
- **ADR 179 D5:** Deudas deja de ser la lista de cuotas del mes y pasa a ser el inventario de lo que debes.
- **ADR 179 D6:** los grupos de Límites por estado pasan a una lista con su pastilla.
- **ADR 179 D7:** la primera vez de Día a día cambia los tres caminos por el registro y las cuatro tejas.
- **ADR 127 D5:** en el bloque Gastos del teléfono la tarjeta es bosque en las cuatro pestañas; las demás secciones conservan su tono.
- **ADR 157 D4:** la cifra lleva el "$" del mismo tamaño.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar cada tarjeta en el tono de su pestaña | Es lo que el diagnóstico señala: el resumen, el aviso y el filtro en la misma familia se leen como una sola cosa. |
| Mostrar el círculo punteado con el nombre mientras llegan las poses | Es una convención del lienzo, no de la app: en producción se leería como algo roto. La pose existente más cercana sostiene el momento. |
| Pestaña Deudas con las cuotas y Por pagar solo con fijos (ADR 179) | El tablero separa las preguntas: qué pago este mes (Por pagar) y cuánto debo y a quién (Deudas). |
| Una alerta por cada límite cerca | El tablero pide una sola, la principal: varias seguidas vuelven ruido el rojo y el ámbar. |
