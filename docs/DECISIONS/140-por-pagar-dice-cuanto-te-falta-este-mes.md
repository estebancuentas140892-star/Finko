# ADR 140 - Por pagar dice cuánto te falta pagar este mes

**Estado:** Aceptada y aplicada (2026-11-13, REV.2a).
**Fecha:** 2026-11-13
**Autores:** Esteban (el punto de la revisión del 13 de noviembre: con solo gastos fijos la tarjeta de arriba decía "No tienes deudas registradas" y $0; la tarjeta quedó en el tablero con la poda del [ADR 138](138-la-poda-del-tablero-del-13-de-noviembre.md); el arranque: "vamos con la siguiente"), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Ajusta** el [ADR 036](036-deudas-v2-visual.md) D1: la cifra grande del hero deja de ser el saldo de las deudas y pasa a ser lo que falta pagar del mes; el saldo baja a la fila de debajo, con su nombre, y la pastilla "cuota/mes" sale. **Cambia el texto** del pie del [ADR 070](070-inicio-centro-de-atencion-en-escritorio.md) D8 ("en total debes" pasa a "suman"). **Respeta** el [ADR 117](117-por-pagar-por-urgencia-y-en-filas.md) D1 (el reparto por urgencia es la regla de la cifra) y el FD7 del conteo de saldadas.

---

## Contexto

"Por pagar" junta desde la ficha 05 ([ADR 069](069-bloque-gastos-en-la-barra-movil.md)) los gastos fijos y las deudas, pero su hero seguía siendo el de "Deudas v2" (ADR 036 D1): sumaba solo el saldo de las deudas (`resumenDeudas()`). Quien tiene un arriendo y ninguna deuda abría la sección y leía "No tienes deudas registradas" y **$0** encima de una lista con $1.500.000 por pagar. La cifra no contestaba la pregunta de la sección ("¿qué tengo que pagar?").

## Decisión

### D1. La cifra grande es lo que te falta pagar este mes

Rótulo **"Te falta pagar este mes"** y la suma de lo vencido más lo que falta del mes, fijos y cuotas. El cálculo no es nuevo: sale de `_agruparPorUrgencia()` en `compromisos/views/lista.js`, la misma regla que reparte las filas del teléfono en "Vencidos" y "Lo que falta este mes" y les pone su suma. `faltaPorPagarDelMes()` devuelve esa suma al hero. Así la cifra de arriba y las dos sumas de la lista no pueden discrepar (cuarta superficie del mismo dato, junto a la pastilla de la pestaña, el chip de la fila y el lote).

- Lo pagado este mes no cuenta; lo que vence después de fin de mes tampoco ("Más adelante").
- Sobre otro mes del bloque el rótulo es el de la lista: **"Sin pagar en octubre"**.
- No mira el chip activo: el hero dice el mes entero. Con "Todo", coincide con la lista.
- Sin ningún pago registrado: **"No tienes pagos registrados"** y $0, sin ojo.

### D2. "Lo que debes en total" queda debajo, solo si hay deudas

La fila de debajo dice **"Lo que debes en total: $X"** con el conteo de siempre ("en N deudas", FD7). Sin deudas no se pinta; con todas saldadas queda solo el conteo. La pastilla "$X/mes" sale: la cuota ya está dentro de la cifra grande.

Inicio de escritorio decía "N pagos · en total debes $X" en el pie de "Lo que tienes que pagar", y esa cifra es otra (lo vencido y los próximos 7 días, con Me deben y reservas). Dos cifras distintas con casi el mismo nombre en dos pantallas: el pie pasa a **"N pagos · suman $X"**, que dice lo que es, la suma de las filas de arriba.

## Alternativas descartadas

- **Dejar el saldo arriba y agregar la cifra del mes debajo.** Con solo fijos la cifra grande seguiría en $0. El saldo de una deuda es una magnitud; lo que falta del mes es lo que se paga. La pregunta de la sección es la segunda.
- **Sumar el mes completo (lo pagado incluido) como "Tus pagos de este mes".** Repite lo que ya dice "Pagado este mes" y no dice cuánto queda.
- **Calcular la cifra en `logic/modelo.js`.** La regla del reparto vive en la vista porque depende de `agenda/logic.js` (los montos del lote); copiarla en lógica abriría una segunda regla que se desalinea. Se extrajo de la función que pinta las filas, no se duplicó.
- **Cambiar el nombre del saldo en vez del pie de Inicio.** "Lo que debes en total" es el nombre que el ADR 036 le dio al saldo y el que usa la hoja de cada deuda ("Te falta pagar" es el saldo de una deuda en su hoja, otra escala). El pie de Inicio era el que tomaba prestado un nombre que no le correspondía.

## Consecuencias

- `compromisos/views/hero.js` lee `faltaPorPagarDelMes()` de `views/lista.js` y `resumenDeudas()` solo para la fila de debajo.
- Pruebas: `compromisos.test.js` reescribe las del hero (12; entre ellas, la del arriendo solo y la que compara la cifra con las sumas de la lista) y ajusta dos del pie de Inicio; `smoke.test.js` ajusta una.
- SW v697.
