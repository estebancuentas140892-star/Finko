# ADR 194 - El historial del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 5 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 5 ("Consultar un registro") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15. **Cambia** el [ADR 188](188-gastos-especificacion-integral.md) D2 (la papelera de la ficha deja el pie y va a la cabecera; "Eliminar gasto" pasa a "¿Eliminar este gasto?") y la cabecera bosque de GAS.C en la ficha de un gasto, que el [ADR 193](193-el-gasto-del-lienzo.md) D2 había dejado para esta página. Conserva el [ADR 154](154-deshacer-un-movimiento.md) D6: eliminar es el mismo deshacer de Movimientos y dice sus efectos cuando van más allá de lo que se ve.

---

## Contexto

La página 5 trae tres tableros: un gasto registrado, eliminarlo y un gasto fijo. La ficha de un gasto seguía con la cabecera bosque "Gasto registrado", el aviso de hormiga en una tarjeta aparte, "Ver en Movimientos" sobre "Repetir este gasto" y la papelera al pie; eliminar abría la confirmación de siempre ("Eliminar gasto", un párrafo y dos botones en fila). La ficha del fijo es otra pantalla (GAS.15g).

## Decisión

### D1. La ficha de un gasto registrado (GAS.15f)

- La cabecera dice el nombre del gasto, como su fila ("Tinto"), y debajo "Sáb 21 nov · toca un dato para cambiarlo"; a la derecha, la papelera y la ✕. Sin la banda bosque.
- El papel dice "Gasto registrado" sobre la cifra, con las filas de la factura del ADR 193 y, si es hormiga, "Finko lo cuenta como gasto hormiga: 4.º tinto en 30 días" (sin contarse dos veces).
- Debajo: el límite de su categoría si lo tiene, "Repetir este gasto" a todo el ancho y "Ver los 2 gastos de Café en Movimientos" (los de su categoría en su mes).

### D2. "¿Eliminar este gasto?" (GAS.15f)

La hoja del lienzo: la papelera en un círculo rojo, "¿Eliminar este gasto?", la tarjeta del gasto (su teja, su nombre, "Sáb 21 nov · Efectivo" y el monto), "Se borra de Gastos y de Movimientos. Úsalo si lo anotaste por error.", "Eliminar gasto" a todo el ancho y "Cancelar" debajo. `confirmar()` gana `icono`, `tarjeta` y `apilado` para pedirla.

## Alternativas descartadas

- **Una hoja nueva solo para eliminar:** `confirmar()` ya hace el foco, Esc y el velo; tres opciones nuevas bastan.

## Consecuencias

- Las pruebas que buscaban `.ficha__papelera`, "Ver en Movimientos" en la ficha o el título "Eliminar gasto" cambian.
- Sin cambios de datos.
- Pendiente en esta página: la ficha del gasto fijo (GAS.15g).

## Ajustes al aplicar

- **D2:** cuando eliminar hace más que devolver el monto a la cuenta de la tarjeta (otras partes de un pago repartido, una deuda que vuelve a deber, un pago que se reabre), el mensaje lo agrega ("Se borran sus 2 partes, una por cuenta. Vuelven $200.000 a..."), como pide el ADR 154.
- **D1:** a 360 px la fecha de la cabecera se corta con puntos suspensivos y la salida baja a 14 px.
