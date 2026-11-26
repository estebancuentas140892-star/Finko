# ADR 201 - Inicio: el desplegable de bancos no corre la banda

**Estado:** Aceptada y aplicada (2026-11-26), en una rebanada: INI.8.
**Fecha:** 2026-11-26
**Autores:** el pedido de Esteban con una captura de su teléfono ("cuando abro el desplegable de los bancos [...] todo se corre hacia la derecha"), Claude Opus 5.5 (diagnóstico e implementación)
**Relación:** Ajusta el ADR 152 D2 en las filas de las cuentas abiertas (el nombre y el tipo ya no se cortan con puntos) y les extiende el ADR 199 D2, que no las había alcanzado.

---

## Contexto

En el Redmi de Esteban (393 px, letra del sistema grande; con `text-scale`, ADR 199 D1, 1 rem crece con ella), al tocar la ficha "Bancos" la banda verde se ensanchaba y todo quedaba corrido a la derecha: el saludo, el saldo y la caja de las cuentas, que se salía de la pantalla.

La causa: en el teléfono la banda (`.hero-inicio`) es una celda del grid del bento, porque su envoltorio `.banda-inicio` es `display: contents`, y la columna del bento es `1fr`, es decir `minmax(auto, 1fr)`: no baja del ancho mínimo de su contenido. Las filas del desplegable llevaban el nombre y el tipo con `white-space: nowrap`, así que el ancho mínimo de una fila era la frase entera. "Nequi / Depósito de bajo monto / $188.000" pide 322 px con la letra al 100 %, 360 al 115 % y 398 al 130 %. Con la caja abierta, la columna crecía a ese ancho (a 393 px y 130 %, la banda pasaba de 393 a 440 px). Como `main` recorta lo que sobra, no aparecía barra de desplazamiento: la página solo se corría. Con la letra al 100 % pasaba igual por debajo de unos 345 px (320, o 360 con el zoom de página).

Ninguna prueba lo veía: la de INI.2a ("sobra 0") mide el ancho del documento, que `main` recorta, y la de TEL.1a nunca abre el desplegable.

## Decisión

### D1. Las filas de las cuentas abiertas bajan de línea

Como las filas de TEL.1a (ADR 199 D2): el nombre y el tipo bajan de línea, sin puntos y con `overflow-wrap: normal` (ninguna palabra se parte). La columna de textos es `flex: 1 1 0` con `min-width: auto`, así que no baja de su palabra más larga. La fila es `flex-wrap: wrap` y el saldo (`flex: none`, `margin-left: auto`, `nowrap`) baja a su renglón, a la derecha, solo si no cabe junto a esa palabra. El ancho mínimo de una fila pasa a ser el logo más su palabra más larga, no la frase entera.

### D2. La banda no ensancha su columna

`#sec-dash .hero-inicio` lleva `min-width: 0`. Si algún día otra cosa de la banda no cabe, se acomoda adentro y la página no se corre de lado. D1 es lo que evita que algo quede fuera de su caja; D2 es la guarda.

## Alternativas descartadas

- **`minmax(0, 1fr)` en la columna del bento del teléfono:** arregla todas las celdas de una vez, pero cambia cómo se reparten todas las secciones para arreglar una de Inicio. Queda como opción si otra celda repite el problema.
- **Solo `min-width: 0`, con los puntos:** la banda ya no se corría, pero "Depósito de bajo mo..." quedaba cortado, contra el ADR 199 D2.
- **`overflow-x: hidden` en la banda:** escondía el saldo bajo el borde en vez de acomodarlo.

## Consecuencias

- Con la letra grande y un nombre largo, la fila crece de alto (el nombre o el tipo en dos líneas): la caja puede ser más alta, nunca más ancha.
- E2E nueva en `telefonos.test.js`, "el desplegable de bancos no corre la banda": a 393 px con la letra al 115 y al 130 %, a 360 al 115 % y a 320 al 130 %, la banda mide lo mismo antes y después de abrir, cada fila queda dentro de la caja y ninguna palabra se parte. Sin el arreglo fallan las cuatro (la banda llega a 440, 397, 397 y 440 px).
