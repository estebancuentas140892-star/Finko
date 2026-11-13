# ADR 133 - Ahorro del adulto en el teléfono

**Estado:** Aceptada (2026-11-13). Se aplica en cinco tandas: (1) el encabezado de las cuatro lentes y el Fondo (SW v680, aplicada); (2) Reservas y sus hojas "Detalle de una reserva" y "Aportar" (SW v681, aplicada); (3) Metas y la hoja de una meta (SW v682, aplicada); (4) Inversión y la hoja de una inversión; (5) la hoja "Nueva reserva".
**Fecha:** 2026-11-13
**Autores:** Esteban (diseño y decisión: "vamos a seguir aplicando los cambios de diseño propuestos en esta carpeta"), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño2" (Claude Design, `Diseño Finko/`), la tercera pieza de MV2.30, sobre la identidad del [ADR 127](127-identidad-bosque-y-sol.md). **Supera** el [ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md) D4 (la frase `cuando` bajo el título, D1). **Acota** al escritorio la franja de meses del Fondo (DIS.19) y su medidor de gota (D2), el gráfico "Todos, uno al lado del otro" de Reservas (D4) y la tarjeta grande de cada reserva, meta e inversión (D4, D6 y D7). **Mueve** la línea de propósito de la tarjeta del Fondo ([ADR 049](049-fondo-de-emergencia-v2.md) D3) al subtítulo de la sección (D1). **Conserva** el [ADR 125](125-ahorro-abre-en-el-fondo.md) (sin casa: sus tres pantallas no se aplican), el [ADR 049](049-fondo-de-emergencia-v2.md) D2 (aportar al fondo no es un primario sólido), el [ADR 009](009-consolidado-de-ahorro.md) (el aporte al fondo no descuenta saldo), la tarjeta de identidad de Metas ([ADR 127](127-identidad-bosque-y-sol.md) D5) y a Tino en los vacíos ([ADR 129](129-tino-ronda-2-en-el-adulto.md)).

---

## Contexto

El tablero compara, para las cuatro lentes de Ahorro y sus hojas, la pantalla de hoy (capturas del 2026-11-04, antes de la identidad v3 y del ADR 125) con una propuesta: Fondo, Reservas, Metas e Inversión con uso normal, vacías y a 360 px con mucha información; las hojas "Aportar a una reserva", "Detalle de una reserva", "Detalle de una meta", "Detalle de una inversión" y "Nueva reserva". Tres pantallas dibujan la casa de Ahorro, retirada con el ADR 125: no se aplican. Se auditó cada propuesta contra la app de hoy fotografiada con los mismos datos.

El patrón es el de Gastos ([ADR 132](132-gastos-del-adulto-en-el-telefono.md)): cada cosa guardada es una fila compacta en una tarjeta, con su acción del día en un círculo a la derecha; tocar la fila abre su hoja con el detalle y las acciones de siempre.

## Decisión

### D1. El encabezado de las cuatro lentes (tanda 1)

Bajo el título va para qué sirve cada forma de ahorro, no la frase de la casa: "Para cuando algo se dañe o te quedes sin ingresos", "Para pagos que ya sabes que llegan", "Para algo que quieres comprar o hacer" y "Dinero que pusiste a crecer". Sin casa, ya no hay otro sitio que lo diga. Vale en los dos anchos: es contenido. En el Fondo, la línea de propósito con que abría la tarjeta (ADR 049 D3) es ahora ese subtítulo y sale de la tarjeta: decía lo mismo justo debajo.

### D2. El Fondo (tanda 1, bajo 1024 px)

- Arriba, suelto: "Tu fondo te cubre", el tiempo en grande ("1 mes", con "de 3" al lado), una barra partida en tantos tramos como meses de meta (cada tramo se llena con su mes), la frase "Si hoy dejaras de recibir ingresos, cubres tus gastos fijos hasta el 16 de dic." y "Tienes $X de $Y · te faltan $Z".
- Dos botones en una fila: "Aportar al fondo" con el tinte de la sección (no sólido, ADR 049 D2) y "Ajustar" con su lápiz, que con la meta cumplida ofrece subir al nivel siguiente.
- La nota de que el dinero sigue en las cuentas pasa a una caja con su ícono, fuera de la tarjeta.
- "Tu compromiso de noviembre" (o de esta quincena, semana u hoy, según la frecuencia de cobro) es una tarjeta: lo aportado de lo prometido, "Cumplido · el 1 de dic vuelve a empezar" o lo que falta, una barra delgada y "Cambiar". Sin compromiso, la misma tarjeta pregunta cuánto y ofrece "Definir".
- "Aportes" con cuántos van este año a la derecha; cada aporte es una fila (la nota arriba, la fecha abajo, el monto a la derecha) que abre su hoja, donde vive "Eliminar este aporte".
- La tasa del mes se dice como lo que es: "Este mes te queda el 79% de lo que recibes", según los gastos registrados hasta hoy, con el 20% recomendado como referencia. En los dos anchos.

### D3. El Fondo sin empezar (tanda 1)

Una sola pregunta: la del banner, con Tino. Debajo, en la misma tarjeta, los tres niveles en una tabla ("Un mes · si algo pasa, no corres") y "Empezar mi fondo" como primario. Sin gastos fijos, una nota al pie dice que los meses se miden con ellos y lleva a Por pagar. Cierra el hallazgo de GU.1a (dos preguntas apiladas).

### D4. Reservas (tanda 2)

"Tienes reservado" y el total, una pastilla con cuántas vencen en 30 días y cuánto falta, y la pista "Toca + para aportar lo que te toca. La rayita de cada barra marca dónde deberías ir hoy." Grupos en frase ("Listas para usar", "Vencen en 30 días" con lo que falta, "Más adelante", "Sin fecha"); cada reserva es una fila con su emoji, lo reunido de lo que necesita, la fecha, la barra con la rayita de hoy y "Vas un aporte atrás"; a la derecha un círculo "+" que abre "Aportar" (o un visto "Ya la usé" si está lista). La fila abre "Detalle de una reserva": lo reunido contra la meta, dónde deberías ir hoy, cuánto reponer, vence, tu plan y lo que falta, "Se repite cada año" como interruptor, "Aportar", "Editar la reserva" y "Eliminar esta reserva". La hoja "Aportar" dice antes del monto cuánto llevas y si vas atrás, y el botón lleva el monto. El vacío lleva su botón dentro de la tarjeta y la salida a Límites.

### D5. Metas (tanda 3)

La tarjeta de identidad sigue (ADR 127 D5). El aviso del fondo incompleto es una tarjeta con "Ir al fondo". Grupos "Con plazo" (la más cercana primero), "Sin plazo" y "Cumplidas"; cada meta es una fila con su silueta, lo reunido, la fecha, la barra y cuántos aportes faltan, con el círculo "+" a la derecha. La fila abre "Detalle de una meta": la silueta grande, lo reunido y el porcentaje, la fecha, el plan y lo que falta, "Aportar", "Editar la meta" y "Eliminar esta meta".

### D6. Inversión (tanda 4)

"Lo que pusiste a crecer" y el total con la pastilla de lo que suma el tiempo. La tarjeta de la etapa dice lo mismo que hoy con una barra partida (lo que pusiste y lo que pone el tiempo; con varias, por tipo) en vez de las columnas. El aviso del fondo es una tarjeta. "Tus inversiones" en filas (nombre, monto, tipo, tasa y vencimiento) que abren "Detalle de una inversión": lo que tendrías al vencer, la barra, tasa, plazo y de dónde salió el dinero, "Editar" y "Eliminar". El vacío lleva su botón dentro y el aviso del fondo en tarjeta.

### D7. La hoja "Nueva reserva" (tanda 5)

"¿Para qué pago te quieres preparar?" con los tipos como chips que llenan el nombre, el monto en frase, "¿Para cuándo lo necesitas?", "¿Cada cuánto puedes aportar?" en cuatro botones y la nota al final, con el pie fijo de siempre (ADR 123).

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| "‹ Ahorro" arriba de cada lente | sin vuelta atrás | la casa se retiró (ADR 125) |
| "Ahorro" en la barra de abajo lleva a la casa | `#fondo` | ADR 125 D1 |
| La franja y el medidor de gota del Fondo se van | se van bajo 1024 px; en escritorio siguen, con el carril desde 1680 px | la tarjeta de escritorio tiene el ancho para la prueba mes a mes y el carril repite el medidor (INT.1g) |
| Una teja con el ícono de la sección en los vacíos | Tino sobre su sol, en el banner | ADR 127 D6 y 129 D3 |
| Dos preguntas en el Fondo vacío (la del banner y "¿Cuánto tiempo aguantarías?") | solo la del banner | el tablero dibuja una; la de la tarjeta repetía la idea (GU.1a) |
| "Ir a Por pagar" siempre en el Fondo vacío | solo sin gastos fijos; con ellos, cuánto sería el primer nivel | con fijos registrados, la nota pide algo ya hecho |
| "Ajustar" siempre | "Subir mi meta a N meses" con la meta cumplida | la oferta de seguir nombra su destino (R67) |
| "42% · te faltan $X" bajo la barra de Metas | lo mismo, en los dos anchos | es contenido de la tarjeta de identidad, que es la misma en los dos |
| El aviso del fondo en Metas como tarjeta | tarjeta bajo 1024 px; en escritorio sigue la media línea (ADR 116 D5) con el enlace al final | en escritorio no compite con filas, compite con tarjetas grandes |
| La pastilla "1 vence en 30 días" y el aviso de proximidad | solo la pastilla bajo 1024 px; el aviso sigue en escritorio | dicen lo mismo; en escritorio el aviso acompaña al comparador |
| "Repón $52.000" (la distancia a la rayita) | el mismo cálculo de la tarjeta: la cuota del plan por cada aporte atrás | coinciden con el plan en aportes enteros; un solo veredicto en la app |
| El interruptor "Se repite cada año" | actúa sin cerrar la hoja; apagarlo en una reserva ya reunida cierra la hoja y pide confirmar | esa reserva se va de la lista y la confirmación no se apila sobre la hoja |
| "Aportar" con el monto grande solo en el teléfono | `monto-hero` en los dos anchos | es el campo de monto de "Nueva reserva" desde AP.5; en escritorio queda centrado (ADR 042) |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| La anatomía nueva del Fondo también en escritorio | dos pruebas de escritorio y el carril se apoyan en la franja; el tablero es del teléfono |
| "Ojalá nunca lo uses" como subtítulo | era la frase de la casa, que juntaba las cuatro; sola en su lente no dice para qué sirve |

## Consecuencias

- El subtítulo de las cuatro lentes y la frase de la tasa del mes cambian también en escritorio (D1 y D2).
- Cada tanda se publica sola, con su prueba y su versión del Service Worker.
