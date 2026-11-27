# ADR 204 - Movimientos con la fila de Día a día (teléfono)

**Estado:** Aceptada y aplicada el 2026-11-27 (MOV.5).
**Fecha:** 2026-11-27
**Autores:** el pedido de Esteban ("Sí, Movimientos", sobre la recomendación del ADR 203 D10), Claude Opus 5.5 (implementación)
**Relación:** Desarrolla el ADR 203 D10. Ajusta el ADR 200 D4 (la fila v2) solo en el teléfono: escritorio la conserva. Sigue las reglas R93 de `DESIGN_SYSTEM.md` (ADR 202 y su ajuste de R1 en el ADR 203).

---

## Contexto

La fila v2 de Movimientos (ADR 200 D4) pone la cuenta bajo el monto, en una columna de 128 px, y une el tipo y la categoría con " · " ("Gasto fijo · Suscripciones"). La referencia de Claude Design del refinamiento midió a 393 px que un nombre largo bajaba a 4 renglones ("Mercado / quincenal en el / Éxito de / Laureles") y que el mismo gasto se veía en Día a día con otra forma. Recomendó, como tarea aparte, que Movimientos usara la fila de Día a día.

## Decisión

### D1. La fila del teléfono es la de Día a día

Bajo 1024 px la fila del historial lleva `list-item--fila`: la teja junto al primer renglón; la cifra con su signo arriba a la derecha (`.fila__der`, antes del nombre en el DOM) y la flecha cuando la fila abre una hoja; el nombre a todo el ancho desde su segundo renglón. Sale la columna de la derecha. La vista decide la forma por ancho al pintar, como Día a día; escritorio sigue con la fila v2.

### D2. Lo que dice bajo el nombre

- **Un gasto del día a día** dice qué fue, cuánto y de qué cuenta salió, como en Día a día: sin tipo ni categoría (la dice la ilustración). Dos renglones.
- **Lo demás** dice qué es en su renglón ("Gasto fijo", "Pago de deuda", "Ingreso", "Transferencia", "Retiro", "Aporte a meta", "Préstamo", "Me deben", "Ajuste de saldo"): en el historial se mezclan los tipos y el color de la teja nunca va solo. Lo que acompaña al tipo va como unidades separadas por coma, sin punto: "Transferencia, 4x1000 $800", "Retiro, cajero $5.000", "Antes de este historial, me deben". La categoría ("Suscripciones", "Salario") va en la hoja.
- **La cuenta** es el mismo renglón de Día a día: el logo de 16, el nombre corto y el tipo como unidad atenuada ("Bancolombia Ahorros"). La transferencia no lleva cuenta: su nombre dice de dónde a dónde.

### D3. Una sola pieza para el renglón de la cuenta

El renglón de la cuenta pasa de `gastos/view.js` a `infra/cuenta-helper.js` (`htmlRenglonCuenta`) y lo usan Día a día y Movimientos; Movimientos no importa el dominio Gastos (ADN 10).

## Ajustes al aplicar

- **La hoja de la fila no cambia**: `ui/detalle-fila.js` lee la fila. La cifra conserva `list-item__amount` (y `--ingreso`), qué es va en `list-item__subtitle` y la cuenta en `list-item__hint`; el logo lleva `data-solo-fila` para no viajar a la hoja como texto.
- **Una fila sin hoja** (un abono, un préstamo) no lleva flecha ni botón que diga el monto: un `sr-only` lo lee después del nombre.
- **Lo que entra** conserva el color de un ingreso en la cifra: la regla de `.fila__cifra` lo pintaba del color del texto.

## Alternativas descartadas

- **Dejar la categoría en la fila**: Día a día la sacó (ADR 203 D2) y en el historial el mismo gasto se vería distinto.
- **Tipo y cuenta en un renglón**: son dos unidades sin lugar fijo (ADR 203, la regla).
- **Pintar las dos filas y esconder una por CSS**: duplica cada movimiento en el DOM, con el historial pintado por lotes.

## Consecuencias

- Un gasto del día a día mide 66 px en el historial, como en Día a día; el resto, hasta 86 px con tres renglones. Ningún texto del historial del teléfono lleva " · ".
- `cada-dato.test.js` mide Movimientos en sus cinco anchos por tres tamaños de letra y suma la fila (qué es, la cuenta, el alto), la hoja de un ingreso y escritorio sin cambios; unitarias de la fila del teléfono y de la hoja.
- Riesgo heredado de Día a día: girar de escritorio a teléfono sin repintar deja la fila de escritorio hasta la siguiente acción.
