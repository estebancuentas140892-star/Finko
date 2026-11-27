# ADR 205 - Día a día sin filtro y el ojo junto a la lupa (teléfono)

**Estado:** Aceptada y aplicada el 2026-11-27 (GAS.18).
**Fecha:** 2026-11-27
**Autores:** el pedido de Esteban ("elimina el filtro que aparece en el apartado día a día [...] la idea es que con la lupa [...] sea suficiente para ir a movimientos [...] el ojo [...] aparezca a un lado de la lupa y no a un lado del monto"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia**, solo bajo 1024 px, el [ADR 188](188-gastos-especificacion-integral.md) D4 (el ojo junto a su cifra), el [ADR 182](182-gastos-cada-cosa-con-su-forma-y-su-color.md) D2 (los chips de Día a día y la lectura con una categoría) y el [ADR 157](157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D5 (el riel de categorías de más a menos gasto). Sigue el [ADR 166](166-un-ojo-por-seccion.md) en lo que tapa cada ojo. Escritorio no cambia.

---

## Contexto

Desde GAS.13d (ADR 188 D4) la cabecera de Gastos tiene la lupa, que abre Movimientos con el apartado de la pestaña y el mes; ahí viven el texto, la cuenta, las fechas y la categoría. Día a día conservaba además los chips de categoría bajo la tarjeta: dos maneras de buscar en la misma pantalla, y la de los chips, más pobre. El ojo iba pegado a la cifra en las cuatro tarjetas, donde compite con ella por el ancho (`cifra-que-cabe.js` la achicaba para dejarle sitio).

## Decisión

### D1. Día a día no filtra

Bajo 1024 px salen los chips de categoría ("Todo", "Mercado"...). Buscar es la lupa de la cabecera. Con los chips salen lo que solo existía con uno puesto: la lectura "N gastos, el X % de lo que gastaste este mes", la ficha del límite de esa categoría y "Restaurantes en nov" en la tarjeta compacta. Un filtro que venía de escritorio no sobrevive al pasar al teléfono: la tarjeta y la lista son de todo el mes.

### D2. El ojo, en la cabecera junto a la lupa

El ojo de cada pestaña va en la fila del nombre, a la derecha de la lupa y con su misma anatomía (círculo de 44 en el fondo elevado), como en Inicio (lupa y luego ojo, ADR 126 D1). Las tarjetas de Día a día, Fijos, Deudas y Límites se quedan con la cifra sola. Sigue habiendo un ojo por pestaña (ADR 188 D4): la cabecera se inyecta en cada sección y cada copia tapa la pestaña donde está; Fijos y Deudas comparten cabecera, así que su ojo se vuelve a leer al pasar de una a otra.

## Ajustes al aplicar

- **Escritorio conserva los chips y el ojo de la tarjeta**: la fila del nombre (con la lupa) no existe sobre 1024 px, y sin ella Día a día quedaría sin manera de filtrar.
- **El ojo de Fijos, Deudas y Límites se esconde por CSS** bajo 1024 px: su tarjeta es la misma en escritorio. El de Día a día no se pinta en el teléfono, porque esa tarjeta ya tenía su versión propia.
- **`sincronizarOjos()`** (`ui/bloque-gastos.js`) escribe el estado de todos los ojos; corre con cada render y con `hashchange`, para que el de Fijos y Deudas diga el de la pestaña nueva.

## Alternativas descartadas

- **Dejar los chips y quitar la lupa**: la lupa lleva a Movimientos, que busca también por texto, cuenta y fechas; los chips solo por categoría.
- **El ojo a la izquierda de la lupa**: Inicio ya pone la lupa primero; el mismo orden en las dos cabeceras.
- **Un solo ojo para todo Gastos**: el ADR 188 D4 pidió uno por pestaña y nada en el pedido lo cambia.

## Consecuencias

- La tarjeta de cada pestaña gana el ancho del ojo para la cifra.
- Ver lo de una categoría en el teléfono pasa por la lupa (Movimientos con Gastos y el mes) o por el Resumen de la tarjeta, que abre Movimientos con la categoría.
- Pruebas: unitarias de la cabecera (lupa y ojo, cada pestaña con el suyo), de Día a día sin chips ni ojo en la tarjeta y del filtro de escritorio que no sobrevive; E2E de la fila del nombre, de Fijos y Deudas con su ojo, de la cifra a 320 al 130 % y de Día a día sin chips.
