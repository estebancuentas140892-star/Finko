# ADR 202 - Cada dato en su sitio (Inicio y Gastos en el teléfono)

**Estado:** Aceptada. En aplicación por rebanadas: SIT.1a (D1 a D5, Día a día), SIT.1b (D6, Fijos, Atención hoy y Deudas) y SIT.1c (D7, Esta semana, Novedades y bancos) aplicadas el 2026-11-26; SIT.1d (D8 y D9) pendiente.
**Fecha:** 2026-11-26
**Autores:** el pedido de Esteban ("vamos a aplicar los cambios propuestos en este enlace", con el lienzo de Claude Design "Finko móvil: cada dato en su sitio", 6 páginas y 18 tableros), Claude Opus 5.5 (implementación)
**Relación:** Cambia el ADR 184 D2 (el valor de Atención hoy sube junto al nombre, como en Fijos) y ajusta el ADR 199 D2 (los textos siguen sin cortarse, pero el monto ya no baja solo en algunas filas: la fila tiene una forma por lista). Las reglas R1 a R9 pasan a `DESIGN_SYSTEM.md` como R93.

---

## Contexto

Desde TEL.1a (ADR 199) nada se corta con puntos, pero nada decide dónde se parte un texto. El lienzo lo midió con datos largos reales a 320, 360, 375, 393 y 430 px: "Venció hace 2 / meses", "$96.000 de / $60.000", "Bancolombia / Ahorros", el "·" al principio o al final de un renglón; a 360 px el nombre de un fijo tenía 95 px porque el monto y "Pagar" reservaban su columna en toda la altura de la fila, y "Tarjeta de crédito Bancolombia Mastercard Black" ocupaba 5 renglones en Esta semana. Causas: (1) la columna derecha reserva su ancho en toda la fila; (2) varios datos unidos con " · " en un solo texto; (3) unidades sin protección; (4) `hyphens: auto` en `.teja-op__t` y `.bloque-tabs__label` ("Transporte pú-blico").

El lienzo trae el diagnóstico (página 1), nueve reglas (página 2), Inicio y Gastos con poca, normal y mucha información y sus vacíos (páginas 3 y 4), las pruebas en cinco anchos y en oscuro (página 5) y una especificación por pieza con criterios de aceptación (página 6). Solo el teléfono: escritorio, lógica, datos y cálculos no cambian.

## Las reglas (R1 a R9 del lienzo)

R1 un dato, un renglón. R2 las unidades no se parten. R3 palabras en vez de puntos. R4 el nombre usa todo el ancho (la columna derecha solo ocupa el primer renglón). R5 la cifra no se mueve (arriba a la derecha, alineada con el primer renglón del nombre, en todas las filas de una lista). R6 dos renglones con buen corte (`pretty` en nombres, `balance` en titulares y avisos; un tercero solo a 320 o con letra grande). R7 lo que distingue, no todo lo que sabe. R8 la tarjeta mide lo que trae. R9 antes de partir, reordenar (nunca abreviaturas inventadas, puntos suspensivos ni palabras partidas).

## Decisión

### D1. La fila de dato

`.fila__texto` (`flex: 1`, `min-width: 0`, `display: flow-root`) lleva primero `.fila__der` (la cifra `.fila__cifra` 15/20 700 tabular en Plus Jakarta Sans y su flecha de 16, `float: right`), luego `.fila__nombre` (15/20 600, `text-wrap: pretty`, `overflow-wrap: normal`, `hyphens: manual`), `.fila__estado` (estado y acción, `flex-wrap`, `space-between`) y `.fila__dato` (13/18 400 secundario), un dato por renglón. La cifra va antes del nombre en el DOM para poder flotar; el orden de lectura lo da el nombre accesible del botón que cubre la fila. Las clases van junto a las de siempre (`list-item__title fila__nombre`) y sus reglas viven en `identidad.css` bajo `max-width: 1023.98px`.

**En Día a día (SIT.1a):** el teléfono pinta la fila nueva y escritorio la de siempre (la vista ya decide por ancho al renderizar, como el pliegue por semanas). `textosFilaGasto` devuelve además `clasificacion` y `cuenta`: la clasificación es lo más específico que el título no dice (la subcategoría bajo lo escrito, la categoría bajo la subcategoría, nada bajo la categoría; con un chip, la categoría no se repite); la cuenta lleva su logo de 16, `nombreCortoCuenta` y el tipo ("Ahorros", "Corriente") como unidad atenuada; billeteras y efectivo sin tipo. La nota ya no va en la fila (sí en la ficha). El `subtitulo` unido queda para escritorio.

### D2. Unidades y palabras en vez de puntos

`.fk-unidad` (`white-space: nowrap`) y `.fk-balance` (`text-wrap: balance`) viven en `utils.css`, solo en el teléfono. En Inicio y Gastos del teléfono no queda " · " entre datos: "8 gastos, sin contar fijos ni deudas", "2 gastos, el 99 % de lo que gastaste este mes", "Restaurantes en nov" en la tarjeta compacta, y la ficha del límite con "115 % de $300.000" y "faltan 8 días" como dos unidades.

### D3. El encabezado del día

"Hoy" en Plus Jakarta 15/20 700 y "jueves 26" en Inter 13/18 400 atenuado, sin punto. Los días anteriores ya lo dicen ("Martes 24") y no llevan complemento (antes, "· nov").

### D4. La tarjeta del mes y su vacío

La lectura reparte con `balance` y termina en el mes: "$710.500 más que a esta altura de octubre" (antes, "que octubre a esta altura del mes", con "mes" solo en su renglón). El mes corriente sin gastos dice "Aún no anotas gastos este mes.", sin barra ni leyenda; la tarjeta de Tino de abajo ("Todavía no hay gastos en noviembre") sale porque repetía lo mismo, y quedan "¿En qué gastaste hoy?", las cuatro tejas y la pista "Anótalo en Fijos" (unidad). La tarjeta de Tino sigue la primera vez, cuando no hay tarjeta del mes.

### D5. Sin guiones automáticos

`.teja-op__t` y `.bloque-tabs__label` pasan a `hyphens: manual` (y la etiqueta de la pestaña a `overflow-wrap: normal`). Nada calcula `hyphens: auto` en Inicio ni en Gastos.

### D6. Fijos, Atención hoy y Deudas (SIT.1b)

- **La fila de Fijos y Por pagar** toma la forma de D1: la cifra arriba a la derecha; el estado con su ícono (triángulo, reloj, calendario, visto) comparte renglón con "Pagar" o el círculo; debajo, "3 pagos de $92.000" (antes "· 3 pagos" pegado al estado) y, en Por pagar, el tipo con mayúscula ("Gasto fijo") y "Te faltan $X" en renglones propios. Sale la regla de TEL.1a que bajaba el monto solo en algunas filas: todas tienen la misma forma (ajusta el ADR 199 D2). El estado dice el verbo y el día entero: "Vence hoy", "Vence mañana", "Sábado 28". "Pagar los 5" lleva la cifra debajo. La tarjeta dice "Pagaste $0 de $980.000" y "0 de 2 pagos" como dos unidades.
- **Atención hoy** (cambia el ADR 184 D2): el valor sube junto al nombre con la flecha y el estado queda en su renglón; la fila mide lo que trae (66 con un nombre corto; antes 84 fijas). El valor de abajo queda solo para el lector de pantalla, después del nombre y el estado. "7 pagos por $3.461.200" bajo el título y "4 pagos más" con su cifra debajo.
- **La tarjeta de una deuda**: el saldo con "te falta" debajo flota a la derecha; la entidad sola y "Cuota de $1.180.000 el día 3" en renglones propios (la cuota sale del lado de la barra, que conserva el cupo); el estado y "Pagar" al pie y, sin atraso, "Próxima cuota el sábado 28" en gris. La tarjeta dice "Debes en total" y el mes sin punto, y "Cuotas de noviembre: $X, pagaste $Y".
- **El aviso de Tino**: "Finko revisó tus deudas", el titular en palabras hasta diez ("Dos deudas crecen cada mes"), los nombres en lista y "Mira cómo frenarlas". Sin deudas que crecen, el titular es el resumen del motor y el enlace "Ver tu plan". El motor devuelve los nombres (`crecen`).
- **Entidades y personas**: el conteo como insignia junto a la cifra.

### D7. Inicio: Esta semana, Novedades y los bancos (SIT.1c)

- **Esta semana**: la teja dice el día, el número y "en 2 días" (o "mañana"); el segundo renglón, solo el tipo con mayúscula ("Gasto fijo", "Deuda", "Ingreso"); el monto flota arriba a la derecha. El lector oye el día y el monto después del nombre y el tipo. Los totales son dos pares rótulo y cifra que envuelven ("Entra" y "Sale", siempre en singular: son rótulos).
- **Novedades y lo que no es un pago**: sin "Ver" escrito, queda la flecha (el nombre accesible ya lo dice); el detalle y el estado, cada uno en su renglón; el par "$X de $Y", las cifras y los porcentajes como unidades. Los límites dicen "va en el 80 % de su límite" y "Llevas $240.000 de $300.000" (antes "va al 80%" y "Te quedan"). Sin punto entre datos: "Te debe $X, fecha acordada...", "Se debita mañana y faltan $X", "Reuniste $X hoy".
- **La lista de bancos de la banda**: el saldo arriba a la derecha, el nombre a todo el ancho desde su segundo renglón y el tipo en el suyo ("Davivienda Cuenta de Nómina Empresarial" pasa de 4 a 2 renglones).

### D8. Límites y ficha del gasto (SIT.1d, pendiente)

Fila de límite con el nombre solo y debajo "$96.000 de $60.000" y el veredicto como unidades; "Sin límite" con la cifra y "este mes" como unidades; la ficha del gasto con la fecha sola, "Toca un dato para cambiarlo." al pie y "Pagado con" en renglones.

### D9. Vacíos (SIT.1d, pendiente)

Tejas de Fijos por su palabra más larga (3 columnas a 360); Inicio sin alertas con "Nada pendiente hoy" y lo próximo; Esta semana sin pagos con "Nada más esta semana"; Inicio sin cuentas con Tino y su saludo en una fila y el título debajo.

## Lo que no se aplica

- **Los chips de categoría en dos renglones con "Más"**: el lienzo lo deja abierto para que Esteban decida (cambiaría el ADR 199 D2 para los chips). Siguen como están.

## Ajustes al aplicar

- **Los criterios viven en `tests/e2e/cada-dato.test.js`**, junto a `telefonos.test.js` y no dentro (la especificación decía ese archivo): la suite crece con cada rebanada (`SECCIONES`) y comparte el escenario largo del lienzo.
- **A 320 px con la letra al 130 %**, una primera palabra larga ("Transporte") no cabe junto a la cifra: la cifra se queda arriba a la derecha y el nombre empieza en el renglón de abajo. El criterio de alineación se mide en los demás casos.
- **Letra en rem**, no en px: 15 px es `0.9375rem`, así crece con la letra del sistema (ADR 199 D1).
- **La clasificación no repite el título**: si lo escrito es igual a la subcategoría ("Taxi" sobre Taxi), va la categoría.
- **Una unidad con negrita adentro** da dos rectángulos en el mismo renglón: la E2E cuenta renglones, no rectángulos.
- **Con el texto al 200 %** (`movil-mv2`), el monto de Fijos ya no baja bajo el nombre: se queda arriba a la derecha (R5) y el nombre empieza debajo si no cabe.

## Alternativas descartadas

- **Achicar la letra** (escala compacta del lienzo, 14/12): gana poco alto y nada de ancho y el 12 gris pierde lectura al sol.
- **Pintar las dos filas y esconder una por CSS**: duplica cada gasto en el DOM; la vista ya decide por ancho al renderizar.
- **Grid de dos columnas con la cifra en su área**: la columna derecha vuelve a reservar su ancho en toda la altura (la causa 1).

## Consecuencias

- La fila de Día a día pasa de dos a tres renglones cuando hay clasificación y cuenta; mide lo que trae (sin cuenta, dos renglones menos).
- E2E nueva `cada-dato.test.js`: 15 casos (cinco anchos por tres tamaños de letra) más la fila de Día a día. Unitarias: `textosFilaGasto` con `clasificacion` y la fila del teléfono en `gastos-pestanas.test.js`.
