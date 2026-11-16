# ADR 152 - Inicio, rediseño: el saldo al centro, "Atención hoy" resumida y el pago en hojas

**Estado:** Aceptada (2026-11-16). Tablero de Claude Design "Finko · Inicio, rediseño" (13 pantallas a 390x844: seis capturas de cómo se veía Inicio y siete del rediseño: Inicio, cuentas abiertas, "Pagos para hoy", elegir la cuenta, saldo insuficiente, completar con varias cuentas y "Todo al día"), aplicado tal cual: Esteban pidió aplicar los cambios propuestos sin rondas de preguntas, también donde chocan con un ADR anterior (D9).
**Fecha:** 2026-11-16
**Autores:** Esteban (visión de producto, tablero de diseño), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 150](150-estados-de-pago-y-logos-en-inicio.md) D3, D4, D5 y D7, el [ADR 126](126-inicio-del-adulto-en-el-telefono.md) D2 y el [ADR 099](099-inicio-movil-hoy-en-una-lista.md) D3 en lo que dice D9. Conserva el [ADR 149](149-inicio-centro-de-atencion-rapida.md) (qué entra a "Atención hoy", "Por completar" y "Novedades") y el [ADR 151](151-el-estado-de-una-obligacion-se-decide-una-vez.md) (el estado de un pago se decide una vez). Solo el teléfono: escritorio no cambia.

---

## Contexto

Con AH.1 ([ADR 150](150-estados-de-pago-y-logos-en-inicio.md)) "Atención hoy" listaba cada pago con su logo y su estado, y "Esta semana" cambió el recuadro del día por la teja del pago. El tablero nuevo vuelve a mirar Inicio entero: el saldo como protagonista, al centro de la banda; "Atención hoy" otra vez como un resumen que se lee de un vistazo ("3 pagos para hoy · 1 ya vencido", un botón "Pagar"); y el detalle de cada pago pasa a donde se decide, la hoja que se abre al pagar. El pago se vuelve un recorrido de tres hojas: qué pagar, desde qué cuenta y, si una cuenta no alcanza, con qué completar.

## Decisión

### D1. El saldo al centro (INI.2a)

- La banda es un degradado de arriba abajo del bosque claro al profundo, con tres círculos centrados en el monto: un disco de girasol al 7 % (radio 118) y dos anillos blancos de 1,5 px (radios 164 y 232). El encabezado y el saldo son dos cajas que pintan los mismos círculos desde el mismo centro.
- "Tu dinero disponible", sin "hoy", centrado. El monto en 56 px con el "$" volado en 28 px ("$" y cifra en dos spans; el texto del párrafo sigue siendo el monto entero). De once caracteres para arriba la cifra baja a 44 px.
- La ficha de cuentas, centrada: "En 3 cuentas" ("En efectivo y 2 cuentas", "En Nequi"), tejas de 30 en círculo montadas 9 px, con un aro del color de la banda.

### D2. Las cuentas abiertas (INI.2a)

La ficha abre una caja translúcida sobre la banda: una fila por cuenta con su logo de 40 y radio 12, el nombre y debajo su tipo ("Ahorros", "Corriente"; una billetera es "Depósito de bajo monto"; el efectivo no lleva línea), y el saldo a la derecha. Al pie, "Ver mis cuentas" centrado. `tipoDeCuenta()` (`infra/render.js`) dice el tipo; con `largo` escribe "Cuenta de ahorros", como la hoja del pago (D6).

### D3. "Atención hoy" resume los pagos (INI.2b)

- Los pagos vuelven a ser un aviso destacado: "Importante", "3 pagos para hoy", el total en el color del texto y "1 ya vencido" en rojo, y un botón "Pagar" a todo el ancho con el color de Por pagar. El botón abre la hoja de D5.
- Tu ingreso sigue debajo en la misma tarjeta: "Recibiste tu ingreso del 30 de oct" y "Distribuir".
- "Ver los N" solo aparece cuando hay filas que no caben en la tarjeta.

### D4. "Esta semana" con el día al lado (INI.2b)

El título con "Calendario" a la derecha, "Sale $682.016" debajo (y "Entra" si algo entra) y cada fila con el recuadro del día (48 por 52, "Jue" y "19"), el nombre, "En 3 días · gasto fijo" y el monto con su signo.

### D5. La hoja "Pagos para hoy" (INI.2c)

- Cada pago es una tarjeta que se toca entera: logo de 44 y radio 13, nombre, el estado escrito en su color ("Venció el 15" en rojo, "Vence hoy" en ámbar) y el monto; la casilla a la derecha. Marcada, la tarjeta lleva el borde de acento; desmarcada, el monto se apaga.
- Sin frase de explicación bajo el título.
- Al pie, "Total a pagar", "3 de 3 seleccionados" y el total en grande; el botón dice "Pagar los 3" ("Pagar 1 pago" con uno). Sin nada marcado, el botón se apaga y dice "Elige al menos un pago".

### D6. "¿Desde qué cuenta pagas?" y el saldo que no alcanza (INI.2d)

- Una flecha para volver a la hoja anterior y la X para cerrar. Debajo del título, "Total a pagar $X".
- Las cuentas en una sola tarjeta: logo de 42, nombre, tipo largo, saldo y un círculo de marcado a la derecha. La elegida lleva fondo de acento. Abre marcada la cuenta propuesta (la habitual del pago o la de mayor saldo).
- El botón dice "Pagar $X". Si la cuenta marcada no alcanza, debajo de su fila sale el aviso "No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan $X. Puedes elegir otra cuenta para completar el valor." y el botón pasa a "Completar con otra cuenta", que lleva a D7.

### D7. "Completa el pago" (INI.2e)

- Volver lleva a D6. Una frase: "Elige una o varias cuentas para cubrir $X. Si ya pasaste dinero a otra cuenta, elígela aquí: el pago quedará registrado desde cada una."
- Cada cuenta con su casilla a la derecha y, si está marcada, cuánto se usa ("Usa $80.000") o "No hace falta".
- El reparto sigue el orden en que se marcaron las cuentas: la primera pone todo lo que tiene, la siguiente lo que falta. Abre marcada la cuenta que no alcanzó.
- Al pie, "Pago completo" en verde o "Faltan $X" en ámbar, "$cubierto de $total" y una barra. El botón "Pagar $X" solo con el pago cubierto; si no, apagado: "Elige otra cuenta".

### D8. "Todo al día" (INI.2f)

Sin nada en "Atención hoy" ni en "Esta semana", Inicio no muestra esas dos tarjetas: Tino duerme sobre su sol, centrado en el espacio que queda. El dibujo es una imagen con nombre: "Todo al día: no tienes pagos pendientes hoy ni esta semana". Es la pose `tranquilo` que ya existe (`assets/tino/tino-tranquilo.svg`, [ADR 129](129-tino-ronda-2-en-el-adulto.md)): el tablero trae el mismo dibujo. Lo que cambia es la puesta: un sol de 204 con dos halos y Tino de 310 de ancho apoyado abajo, más ancho que el sol.

### D9. Lo que el tablero cambia de ADR anteriores

- **ADR 150 D3:** "Atención hoy" deja de listar cada pago; la lista con logos vive en la hoja de D5.
- **ADR 150 D4 y D7 ("Esta semana"):** vuelven el recuadro del día, "Sale" y el enlace "Calendario", y el monto lleva otra vez su signo.
- **ADR 150 D7 ("15 de noviembre"):** la frase del ingreso vuelve al mes en tres letras del [ADR 102](102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md) D1, con "del": "Recibiste tu ingreso del 30 de oct".
- **ADR 150 D5:** la hoja plegada con "Cambiar" se reemplaza por la lista de D6.
- **ADR 150 D1 en la hoja de pagos:** el estado va escrito en su color, sin pastilla ni ícono, y el vencido dice su día ("Venció el 15"). El estado sigue saliendo de `estado-obligacion.js` (ADR 151); solo cambia cómo se escribe ahí. La hoja "Avisos de hoy" conserva las pastillas.
- **ADR 126 D2:** el saldo pasa de alineado a la izquierda a centrado, sin "hoy" en el rótulo, y la ficha dice "En 3 cuentas".
- **ADR 099 D3:** "Ver los N" sale cuando todo cabe en la tarjeta.

## Alternativas descartadas

- **Mantener la lista de pagos de AH.1 en "Atención hoy" y abrir la hoja nueva solo al pagar.** El tablero dibuja el resumen, y la lista quedaba dos veces seguidas (en Inicio y en la hoja).
- **Repartir el pago desde la cuenta de mayor saldo, como antes.** El tablero reparte en el orden en que el usuario marca las cuentas: quien pasó dinero a Nequi para completar el arriendo quiere que salga de Nequi, aunque Bancolombia tenga más.
- **Rellenar "Completa el pago" con las cuentas que alcanzan.** La hoja dice "elige": abre con la cuenta que no alcanzó y el usuario marca con qué completar.

## Consecuencias

- La frase del lote ("3 pagos para hoy · 1 ya vencido") vuelve a verse en Inicio; la lista con logos y estados, en la hoja.
- El recorrido de pago desde Inicio son hasta tres hojas, cada una con volver.
- Se aplica en rebanadas, cada una publicada: INI.2a (D1 y D2), INI.2b (D3 y D4), INI.2c (D5), INI.2d (D6), INI.2e (D7) e INI.2f (D8).
