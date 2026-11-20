# ADR 186 - Movimientos encuentra, hormiga es lo que se repite y lo importante cabe en cualquier teléfono

**Estado:** Aceptada (2026-11-20).
**Fecha:** 2026-11-20
**Autores:** Esteban (pedido "Implementación y correcciones funcionales de Gastos", 2026-11-20), Claude Opus 5.5 (implementación)
**Relación:** Completa el [ADR 185](185-gastos-movil-cada-lugar-con-una-funcion.md), que aplicó el tablero de Claude Design hecho con este mismo pedido. **Cambia** el [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1 y D6 (hormiga ya no depende del carácter y un gusto suelto no cuenta) y su D3 en el carácter de Café; el [ADR 137](137-revision-del-13-de-noviembre-tanda-1.md) D5 en la categoría y la cuenta de Movimientos (vuelven, pero como chips de la fila y no en el panel de la búsqueda), y el [ADR 089](089-movimientos-la-quinta-fuente-y-cuatro-puertas.md) D3 (la categoría y la cuenta ya no son solo filtros con los que se llega). Todo bajo 1024 px salvo lo dicho; escritorio no cambia de forma.

---

## Contexto

El pedido trae nueve puntos. El tablero de Claude Design que salió de él ya se aplicó como GAS.10 ([ADR 185](185-gastos-movil-cada-lugar-con-una-funcion.md)) la noche anterior. Se revisó cada punto contra `origin/main`, en pantalla a 393 x 740 (el Redmi Note 11 con Chrome), 375 x 667, 360 x 640 y 320 x 568, en los dos temas.

### Lo que el pedido daba por pendiente y ya estaba (GAS.10)

| Punto del pedido | Dónde quedó |
|---|---|
| 1. Pestañas arriba, el ojo en la tarjeta, la búsqueda de Gastos en Movimientos | ADR 185 D1 (la lupa es el primer botón de los filtros de Día a día y abre Movimientos) |
| 2. Sin la franja de lo vencido en Día a día | ADR 185 D1 (el punto rojo en Fijos y Deudas; el dato vive en Atención hoy y en Fijos) |
| 3. El gasto fijo con la estructura de Día a día; sin "¿Qué es?", "¿Cuál plataforma?", "Así queda tu gasto fijo", "Agrega si quieres", el indicador ni el monto repetido; sin "Cambiar" ni círculos de OK; "Sin empresa" con su campo; "Otra" sin repetir | ADR 185 D6 y D7. "Tu gasto fijo llevará nombre en Por pagar" ya no existía. Los textos que siguen en el código ("¿Qué es?", "¿Cuál plataforma?") son el nombre accesible de cada pantalla y el rótulo de escritorio, no se ven en el teléfono |
| 4. La factura del fijo como la del gasto, con el débito y la nota adentro, sin desplazar | ADR 185 D5 y D7 |
| 5. Colores de categoría en el formulario, sin "Elige la categoría...", "Frutas y verduras", áreas | ADR 185 D3 y D4 (los ids no cambiaron; la migración v58 movió lo guardado) |
| 6. "¿En qué fue?" | ADR 185 D4: la pantalla es el detalle, sin ese título |
| 7. Deudas: entidad o persona, sin desplazar en el Redmi | ADR 185 D8 a 393 x 740 |

Las periodicidades: el modelo admite nueve (`FRECUENCIAS`). El teléfono ofrece Mensual, Quincenal, Anual y "Otra" con Cada semana, Cada 2 meses, Cada 3 meses y Cada 6 meses, sin repetir; quedan fuera Diario y Única vez, que no son un gasto fijo. Las fechas de las siete se calcularon con `ocurrenciasEnMes` (`infra/vencimientos.js`, la fuente única de Fijos, Atención hoy, el calendario y los avisos) para catorce meses, con el día 15 y con el 31: seis salen bien, también el último día de febrero; **Cada semana no** (D6).

### Lo que faltaba

- **Movimientos no encontraba lo que la persona anotó.** Un gasto con nota ("Almuerzo de trabajo") se leía "Restaurantes" y la búsqueda no lo hallaba; un taxi se leía "Transporte". El chip "Deudas" juntaba el pago de Netflix con el de un crédito (los dos son del dominio `compromisos`). La categoría y la cuenta solo existían si se llegaba con ellas puestas.
- **Hormiga dependía de "gusto".** Un café suelto de $6.500 ya era hormiga (Café era gusto) y una necesidad nunca lo era, aunque se repitiera. El pedido lo dice al revés: hormiga es pequeño **y** recurrente, y no es lo mismo que deseo.
- **Cada semana no era cada semana.** El gasto fijo semanal guarda un día del mes (el teléfono le muestra los 31 días) y `ocurrenciasEnMes` repetía ese día cada 7 días dentro de cada mes: con el 15, pagos el 15, 22 y 29 de cada mes (del 29 al 15 siguiente pasan 16 días); con el 31, uno solo al mes.
- **Lo importante no cabía en teléfonos más bajos.** A 360 x 640 la primera vez de Deudas deja "Si no le debes a nadie..." bajo la barra y la factura del fijo desplaza 4 px. El Redmi con la barra de Chrome visible y la letra del sistema en grande queda en ese caso.

## Decisión

### D1. El título de un gasto en Movimientos es el de Gastos (GAS.11a)

Lo que la persona escribió (la descripción de antes o la nota), si no la subcategoría ("Taxi") y si no la categoría. Debajo, "Categoría · Cuenta". Es el mismo criterio de `textosFilaGasto` en Gastos.

### D2. Movimientos busca y filtra por lo que existe (GAS.11a)

- **La búsqueda** mira el título, la categoría, la subcategoría y la nota, sin tildes ni mayúsculas: "cafe" encuentra "Café". El campo dice "Busca por nombre, nota o categoría".
- **"Categoría ⌄" y "Cuenta ⌄"** son chips de la misma fila que "Fechas". Cada uno abre su panel bajo la fila (uno a la vez) con lo que hay en el historial: las categorías del día a día, de la más usada a la menos, y las cuentas que aparecen en algún movimiento. Elegir cierra el panel y deja la pastilla con su ×, como cuando se llega desde Límites o Mis cuentas. "Cuenta" solo aparece con dos o más.
- **El detalle:** con una categoría puesta que tiene subcategorías en el historial, debajo de la pastilla va "Todo" y cada una ("Transporte público", "Taxi").
- **Con cualquier filtro**, la lista dice cuántos y cuánto ("2 resultados · -$30.000") con "Limpiar"; antes solo con texto.

### D3. El tipo separa lo que se paga (GAS.11a)

Los chips de tipo dejan de ir por `dominio` (que colorea) y van por clase: Gastos, Gastos fijos, Deudas, Ingresos, Transferencias, Ahorro, Metas, Me deben y Ajustes de saldo, en ese orden y solo los que tienen algún movimiento. El pago de un fijo es "Gastos fijos"; el de una deuda, el dinero que entró de una deuda y el avance de una tarjeta son "Deudas"; el ajuste a mano deja de contarse como transferencia. "Gastos" e "Ingresos" valen lo mismo que antes, así las llegadas desde Gastos, Análisis y Mis cuentas no cambian.

### D4. Los periodos (GAS.11a)

El rango de fechas abre con cuatro atajos: Este mes, Mes pasado, Últimos 3 meses y Este año. Escriben "Desde" y "Hasta", que siguen a la vista para ajustarlos.

### D5. Hormiga es lo pequeño que se repite (GAS.11b)

Tres preguntas que no se mezclan:

| Pregunta | Qué la decide |
|---|---|
| ¿En qué fue? | La categoría y el detalle que elige la persona |
| ¿Necesidad o deseo? | El detalle; se pregunta dentro de la opción solo cuando depende del momento |
| ¿Es hormiga? | El comportamiento: una compra de hasta el tope (Límites, $20.000 por defecto) cuyo mismo concepto aparece 3 veces en 30 días. Nunca un pago de un fijo o de una deuda |

- **El carácter ya no entra en hormiga:** ni un gusto suelto cuenta, ni una necesidad que se repite queda fuera. Un tinto diario es hormiga sea necesidad o deseo; una película de $15.000 una vez al mes no lo es.
- **Café pasa a "depende"** y pregunta "Necesidad" o "Deseo" dentro de Tinto y de Café de cafetería, como Taxi; Bebidas frías sigue siendo deseo sin preguntar. Antojos sigue siendo deseo: la categoría lo dice con certeza.
- **Lo que se dice:** Análisis llama a lo pequeño "compras pequeñas que repites" y su hoja se titula "Gastos hormiga". La pregunta de Día a día para un concepto que se repite ("Tinto: ¿fue una necesidad o un deseo?") sigue: su respuesta queda en esos gastos para Análisis, no los saca de hormiga.

### D6. Cada semana cuenta 7 días desde el primer pago (GAS.11c)

El primer pago es el día elegido en el mes en que se creó el fijo (el 31 en un mes de 30 es el 30); desde ahí, cada 7 días, cruzando meses: 15, 22 y 29 de noviembre, 6, 13, 20 y 27 de diciembre. Un fijo semanal sin fecha de creación (los de antes de que existiera) conserva el cálculo de antes. No cambia lo guardado ni el formulario: el día que se elige es el del primer pago.

### D7. Lo importante cabe por la altura, no por un teléfono (GAS.11d)

- **Deudas, la primera vez:** Tino toma el alto que sobra (entre 96 y 160 px según la altura de la pantalla, `svh`), así la frase, las dos tarjetas y "Si no le debes a nadie..." quedan sobre la barra desde 360 x 640. La letra no se achica.
- **Las dos facturas** (gasto y fijo) recogen su aire vertical en pantallas bajas (menos de 700 px de alto) para caber sin desplazar a 360 x 640; a 320 x 568 la factura desplaza por dentro lo que falte, con "Guardar" siempre a la vista, como ya aceptaba el ADR 156.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una hoja aparte para elegir categoría y cuenta | La fila de Movimientos ya abre "Fechas" en línea (ADR 105); un modal nuevo es otro patrón para lo mismo. |
| Volver a poner "Por categoría" y "Por tipo y cuenta" en el panel de la búsqueda | El ADR 137 D5 los quitó porque empujaban la lista fuera de la pantalla con el teclado abierto; como chips, se eligen sin teclado. |
| Un dominio nuevo `fijos` para colorear distinto el pago de un fijo | El color es de la sección dueña (Por pagar) y no cambia; lo que estaba mal era usarlo para filtrar. |
| Dejar que una necesidad nunca sea hormiga | Vuelve a mezclar las dos preguntas: el pedido dice que no son excluyentes. Lo que sí se puede recortar lo dice el carácter, al lado. |
| Hormiga por monto solo | Es lo que el pedido prohíbe: un gasto suelto no es un hábito. |
| Achicar la letra para que quepa Deudas | El pedido lo prohíbe; el dibujo es lo que tiene alto de sobra. |

## Consecuencias

- Cuatro rebanadas, cada una con su commit y su push: GAS.11a (D1 a D4), GAS.11b (D5), GAS.11c (D6) y GAS.11d (D7).
- Un fijo semanal ya guardado cambia sus fechas futuras a las correctas; lo pagado no se toca.
- Hormiga suma más en quien se mueve en bus todos los días y menos en quien se da un gusto suelto. El tope y el límite de Límites siguen igual.
- Movimientos sigue sin importar ningún dominio: la subcategoría sale del catálogo de `core/constants.js`.
- Sin cambio de esquema: la subcategoría, la nota y la clase se derivan al leer.
