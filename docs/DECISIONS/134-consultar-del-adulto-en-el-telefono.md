# ADR 134 - Consultar del adulto en el teléfono: la hoja Más, Calendario, Movimientos y Análisis

**Estado:** Aceptada (2026-11-13). Se aplica en cuatro tandas: (1) la hoja Más y Calendario (SW v685, aplicada); (2) la hoja de un día y el Calendario vacío (SW v686, aplicada); (3) Movimientos, su búsqueda y la hoja de un movimiento (SW v687, aplicada); (4) Análisis.
**Fecha:** 2026-11-13
**Autores:** Esteban (diseño y decisión: "vamos a seguir aplicando los cambios de diseño propuestos en esta carpeta"), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño3" (Claude Design, `Diseño Finko/`), la cuarta pieza de MV2.30, sobre la identidad del [ADR 127](127-identidad-bosque-y-sol.md). **Cambia** en la hoja Más el lugar de la línea de estado de cada destino ([ADR 108](108-mas-dice-como-esta-cada-destino.md) D2: de la derecha a debajo del nombre, como ya iba la de Ajustes, D4) y la leyenda del Calendario (de tipos de pago a lo que sale y lo que entra, D3). **Conserva** la tarjeta de identidad de Calendario ([ADR 127](127-identidad-bosque-y-sol.md) D5), el techo de la hoja Más (R83), la hoja del día en el teléfono ([ADR 118](118-el-dia-en-hoja-y-las-hojas-se-cierran-de-tres-formas.md)) y a Tino en los vacíos ([ADR 129](129-tino-ronda-2-en-el-adulto.md)).

---

## Contexto

El tablero compara, para la hoja Más y las tres secciones de consulta, la pantalla de hoy (capturas del 2026-11-04) con una propuesta: la hoja Más con uso normal, usuario nuevo y a 360 px; Calendario, Movimientos y Análisis con uso normal, vacíos y a 360 px con mucha información; la hoja de un día del calendario, la de un movimiento y Movimientos buscando "mercado". Se auditó cada propuesta contra la app de hoy fotografiada con los mismos datos.

## Decisión

### D1. La hoja Más (tanda 1)

Cada destino es una fila con su nombre y, debajo, cómo está ("4 pagos esta semana", "Salud 59 de 100"), con una flecha a la derecha. Los rótulos de grupo van en frase, sin mayúsculas sostenidas. La hoja sigue sin desplazarse (R83).

### D2. Calendario arriba (tanda 1)

La tarjeta de identidad dice lo que entra y lo que sale en una pastilla y, debajo, lo próximo en frase: "Lo próximo: Colegio, mañana. Tu siguiente ingreso llega el 1 de dic."

### D3. El mes (tanda 1)

Las flechas van sueltas, sin caja; bajo el mes, cuántos pagos y cuántos ingresos. Cada día marca con un punto lo que sale y con un aro lo que entra; el día con algo vencido se tiñe de rojo. La leyenda dice eso mismo: "Sale un pago", "Entra un ingreso", "Vencido" y "Hoy".

### D4. Lo del mes, en listas (tanda 1, bajo 1024 px)

Debajo del mes, sin tocar ningún día: "Vencido" en rojo con su suma, "Lo que falta este mes" y "Lo que entró", cada una una tarjeta con una fila por pago (su teja, el monto, cuándo y qué es). La fila abre el día.

### D5. La hoja de un día (tanda 2)

"Mañana, sábado 14 de noviembre" y cuántos pagos, "Sale $X · no entra nada", los pagos en filas y "Ver en Por pagar", con la nota de que ahí se marcan como pagados.

### D6. Movimientos (tanda 3)

Bajo el título, "Todo lo que entró y salió, por fecha". Los filtros "Todos", "Gastos", "Aportes" y "Fechas"; el mes en frase con su total y, debajo, cada día ("Hoy, viernes 13") con su total y sus movimientos en una tarjeta; la fila dice categoría y cuenta, sin repetir el día. Buscando, "2 resultados · −$404.300" y "Limpiar". La hoja de un movimiento dice fecha, categoría y de dónde salió, "Editar el gasto" y "Eliminar el gasto" con a dónde vuelve el dinero.

### D7. Análisis (tanda 4)

"Salud de tu dinero" suelta, con el número, su estado en una pastilla, una barra y lo que más la frena con su salida; "De dónde sale el 59" en filas; "Lo que realmente tienes" con lo que tienes y lo que debes en filas con su parte; "A dónde va tu dinero" en barras por mes con la comparación en frase; "En qué gastas" en filas con su barra; "Más detalle de tus gastos" y "Estado de tu renta" como filas que abren su detalle.

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| "Te queda en noviembre" suelto, sin tarjeta | la tarjeta de identidad de Calendario | ADR 127 D5, posterior al tablero |
| Una teja con el ícono de la sección en los vacíos | Tino sobre su sol | ADR 127 D6 y 129 D3 |
| "Lo próximo: Colegio, mañana" con "Plan Claro" venciendo hoy | lo próximo desde hoy, incluido hoy | lo que vence hoy es lo más próximo; callarlo dejaría de avisar justo ese día |
| El día de hoy con un pago sin pagar | se marca como hoy, no como vencido, en los dos anchos | ADR 132: el rojo es para lo que ya pasó; "Vence hoy" va en ámbar |
| La hoja de un movimiento con fecha, categoría y "Salió de" | un gasto abre la hoja del gasto que ya existe (ADR 119 D2), con nota, "Repetir hoy" y los gastos de su categoría en el mes | es la misma hoja que se abre desde Gastos; dos hojas para el mismo gasto dirían cosas distintas |
| "−$1.197.000" con el día en cada fila | el día en su encabezado y la fila sin él, en los dos anchos | **supera** esa parte del ADR 121 D1 ("Mar 27 · Restaurantes · Nequi"): con el día arriba se leía dos veces |
| El vacío sin el mes | sin el mes solo para quien no tiene nada con fecha; con datos y un mes vacío sigue "está despejado" con el mes | ADR 111 D5: quien ya tiene datos navega meses |
| "Agregar un pago fijo" | abre el formulario de gasto fijo de Por pagar, sin pasar por la sección | es el mismo camino del vacío de Por pagar (ADR 132 D6) |
| La flecha también en Ajustes | se calla bajo 360 px | a 320 la línea de Ajustes no cabe al lado del botón del tema (ADR 108 D4) |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Las listas del mes también en escritorio | en escritorio el detalle del día ya vive al lado del mes (ADR 071 D7) |

## Consecuencias

- La hoja Más y la leyenda del Calendario cambian también en escritorio: son contenido.
- Cada tanda se publica sola, con su prueba y su versión del Service Worker.
