# ADR 197 - Las opciones en una línea

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido, con una captura de un Xiaomi Redmi Note 11: "Administración", "Suscripciones" y "Crear categoría" se salen de su celda en el formulario de Fijos; ninguna palabra partida en dos líneas, cada opción en una sola fila, en cualquier teléfono), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** la rejilla de dos columnas fijas de "¿Qué es?" del gasto fijo ([ADR 177](177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md) D2, [ADR 195](195-los-fijos-del-lienzo.md)), de la categoría del gasto ([ADR 185](185-gastos-movil-cada-lugar-con-una-funcion.md) D4) y de la categoría de "Nuevo límite" ([ADR 196](196-los-limites-del-lienzo.md) D3), que en el lienzo llevan los nombres largos en dos líneas. Es un pedido directo de Esteban sobre lo que el lienzo dibujó: manda sobre él en este punto. Escritorio no cambia.

---

## Contexto

En el Redmi Note 11 (393 px de ancho, con el tamaño de letra del sistema un poco más grande que el de fábrica) los nombres de una sola palabra larga no caben en media fila: "Administración" y "Suscripciones" se salían de su teja, y "Crear categoría" también. Las de varias palabras bajaban a dos líneas ("Servicios / públicos") y, donde no había espacio, la regla de seguridad `overflow-wrap` partía la palabra ("Entretenimient / o" en el gasto y en "Nuevo límite"). La auditoría en 320, 360, 393 y 412 px, con la letra al 100, 115 y 130 %, encontró lo mismo en "Cada cuánto" (el riel se montaba), en la fila "Primer pago", en la cabecera de la factura del fijo ("EP/M", "$85.0/00") y en "Opcional".

## Decisión

### D1. Las opciones con teja y nombre, en una sola línea

- En "¿Qué es?" del gasto fijo, en la categoría del gasto y en la de "Nuevo límite", cada nombre va en una línea y nunca se parte.
- Dos opciones comparten fila, en mitades iguales, cuando las dos caben; la que no cabe en media fila toma la fila entera. Con la letra de fábrica a 393 px queda como el lienzo ("Arriendo | Administración"); con la letra grande o en un teléfono angosto, los nombres largos van en su fila.
- Es CSS (`flex-wrap`, base de media fila y el ancho del nombre como mínimo): se rehace solo al girar el teléfono o al cambiar el tamaño de la letra.

### D2. El resto de la hoja del fijo, sin montarse

- "Cada cuánto": las cuatro van en un riel cuando caben; si no, en dos filas. "Otra" abre sus seis en dos columnas, cada una en una línea.
- La fila "Primer pago": si el rótulo y la fecha no caben juntos, la fecha baja a la derecha.
- La factura: el nombre baja entre palabras; la cifra va al lado del nombre y, si no cabe, debajo a la derecha, ajustada al ancho del papel. "Opcional" va entero y, si no hay espacio, "+ Agregar" queda en su "+".
- "Toda la categoría" o "Solo una parte" de "Nuevo límite": juntas si caben; si no, una debajo de la otra.

### D3. Las empresas, en columnas que crecen con la letra

La rejilla de logos usa columnas de al menos 4,5 rem: cuatro por fila en un teléfono común, tres con la letra grande. El nombre baja entre palabras, nunca a mitad de una.

## Alternativas descartadas

- **Achicar la letra para que todo quepa en dos columnas:** contradice el tamaño que la persona eligió en su teléfono.
- **Una sola columna siempre:** cabe todo, pero la lista se vuelve el doble de larga con la letra de fábrica.
- **Medir con JavaScript y reordenar las opciones para emparejar las cortas:** cambia el orden de lectura y el del teclado.

## Consecuencias

- Prueba nueva: `tests/e2e/opciones-una-linea.test.js` (a 360 y 393 px con la letra al 115 %: ninguna palabra partida ni fuera de su celda en el gasto fijo, su factura y "Nuevo límite"; cada nombre en una línea).
- Sin cambios de datos.

## Ajustes al aplicar

- **D1:** la palomita de lo elegido en "¿Qué es?" va encima de la teja, sin correr el nombre. Con la letra de fábrica, las tejas del fijo bajan 1 px de letra y 2 px de aire para que "Administración" vuelva a caber en media fila a 393 px.
- **D2:** la barra de pasos sigue cortando con "…" lo que no cabe ("Servicios pú…"), como el lienzo.
