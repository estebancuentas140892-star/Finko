# ADR 164 - El límite de una categoría puede ir por subcategoría

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", sección Límites), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Extiende** el tope por categoría de Límites (LIM.1) con las subcategorías de gasto del [ADR 147](147-gusto-o-necesidad-hormiga-sin-adivinar.md) D3 y del [ADR 162](162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) D3. Usa el armazón de preguntas del [ADR 142](142-formularios-por-tarea.md) D5 en el teléfono.

---

## Contexto

Esteban: en Restaurantes el almuerzo de trabajo puede importar mucho más que el resto; al poner un límite, la persona debería poder elegir si es para toda la categoría o uno para cada subcategoría.

## Decisión

### D1. Dos modos, y el de la categoría sigue siendo el de siempre

Al elegir una categoría con subcategorías aparece "¿Cómo quieres el límite?": **Toda la categoría** (un máximo, como hasta hoy) o **Por subcategoría** (un máximo para cada una; la que se deja vacía no tiene límite propio). Una categoría sin subcategorías (las propias) no ofrece el modo. En el teléfono es una pregunta más del armazón; en escritorio, un bloque del mismo formulario.

### D2. Por subcategoría, el tope de la categoría es la suma

El tope guarda `subcategorias: { id: monto }` y `montoMensual` es su suma. Así todo lo que ya lee el tope de la categoría (la lista, el aviso de 75 % y 100 %, la cobertura del plan, la consecuencia al registrar un gasto, Análisis) sigue igual sin saber de subcategorías. Volver a "Toda la categoría" deja `subcategorias` en null.

### D3. Lo que se ve

Bajo el tope, en la fila del teléfono, el sobre de escritorio y su hoja: una línea por subcategoría con su barra fina y "$240.000 de $300.000" (en ámbar o rojo con el mismo criterio del tope), y "Sin límite propio: $X, cuenta en el total" para lo gastado en la categoría sin una de esas subcategorías.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un tope independiente por subcategoría (un registro cada uno) | Duplicaría la categoría en la lista, en los avisos y en la cobertura del plan; el pedido habla de elegir dentro de la categoría. |
| Exigir máximo en todas las subcategorías | Obliga a inventar números para lo que no se quiere controlar. |
| Ignorar lo que no tiene subcategoría | El total de la categoría dejaría de ser lo que se gastó en ella. |

## Consecuencias

- Los avisos de 75 % y 100 % siguen siendo por categoría; una subcategoría pasada se ve en su línea, sin aviso propio.
- Schema sin cambio: el campo es opcional.
- Llega con la hoja de novedades 764 ("Tus gastos, más claros"), que cuenta también lo del ADR 161 al 163 a quien actualiza.
