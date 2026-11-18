# ADR 161 - Día a día: Tino anota, el vacío deja la flecha y ningún gasto deja la cuenta bajo $0

**Estado:** Aceptada (2026-11-17). La pose `anota` de D1 se retiró el mismo día (SAL.1): Esteban dibuja a Tino con la libreta y entrega el SVG; mientras, el vacío usa `explica`. La flecha sigue fuera.
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Gastos día a día", puntos 1, 2 y 4), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 156](156-registrar-gasto-en-el-telefono-tablero-integral.md) D2 (la pose de Tino y la flecha punteada del vacío) y **extiende** su D6 (la cuenta que no alcanza no guarda) a escritorio y a la edición (D2). **Extiende** el [ADR 127](127-identidad-bosque-y-sol.md) D6 con una pose compuesta sobre el dibujo original, sin redibujar al personaje.

---

## Contexto

El vacío de Día a día ("Anota tu primera compra") mostraba a Tino explicando y, en el teléfono, una flecha punteada que bajaba hasta el botón central, más un halo que late en él. Esteban pidió un Tino que apunte en una hoja, más acorde con anotar gastos, y quitar la línea: el botón ya titila (el halo) y la frase dice "Toca el botón +"; otro elemento es ruido.

No hay dibujo de Tino con libreta entre los originales de `Personaje Tino/`.

## Decisión

### D1. Tino anota en su libreta, y el halo basta

- **Pose `anota`** (`assets/tino/tino-anota.svg`, `TINO_ORIGINAL.anota`): es `tino.svg` sin un trazo cambiado, salvo el grano de café que sostenía (diez trazados que se quitan). Encima van una libreta de espiral con renglones y algo escrito, la pata de atrás que la sostiene por el borde y la de adelante con un lápiz. Las piezas nuevas usan los colores del dibujo (pelo `#9b5223`, contorno `#321106`, lápiz `#f5b11e` y `#f86e5a`) y su grosor de trazo. Mismo lienzo que la pose base (637 x 957), así que cae en el sol como cualquier pose de pie.
- **Sin flecha:** salen `.gastos-empty__guia--trazo` y `--punta` con su CSS (`--gastos-guia-base`, `--gastos-guia-alto`, la animación del trazo). Se queda el halo que late sobre el botón central y su versión quieta con "reducir movimiento".

### D2. Ningún gasto deja una cuenta por debajo de $0

Esteban registró en escritorio un gasto de $80.000 desde una cuenta en $0 y quedó en -$80.000: con una sola cuenta, el escritorio preguntaba "¿Registrar de todas formas?". El teléfono ya no guardaba (ADR 156 D6), pero solo al crear.

- **Un solo chequeo, antes de escribir nada** (`_gastoSinSaldo`, `gastos/index.js`): ni la categoría nueva ni lo contestado se guardan si el gasto no cabe. En el teléfono el recibo lo dice junto a "Sale de"; en escritorio, bajo "¿De qué cuenta sale?": "No tienes saldo suficiente en Nequi: faltan $80.000. Elige otra cuenta o una tarjeta de crédito."
- **Al editar**, lo que ese gasto ya había descontado de la misma cuenta vuelve a contar como disponible (`planSiNoAlcanza(..., anterior)`): subir de $50.000 a $60.000 pide solo la diferencia. La ficha del teléfono avisa igual y no guarda.
- **Fuera del chequeo:** el consumo con tarjeta (sale del cupo: lo cuida el aviso de sobrecupo), el gasto importado (`sinEfectoSaldo`, no mueve cuentas) y, al crear en escritorio con otras cuentas, "Completa el pago", que no confirma hasta cubrir el total sin dejar ninguna en negativo.
- Sale el "¿Registrar de todas formas?" del gasto.

Esteban pidió la misma regla para todo Finko (pagos de Por pagar, aportes a metas y ahorro): queda como SAL.1.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Esperar un dibujo nuevo de Esteban | El pedido es concreto y la composición conserva el personaje tal cual; si llega un original, se reemplaza el archivo sin tocar código. |
| Redibujar a Tino escribiendo | El ADR 127 D6 pide los dibujos originales, nunca una versión redibujada. |
| Quitar también el halo | El pedido lo nombra como suficiente para llamar la atención. |
| Seguir confirmando el sobregiro en escritorio | Es lo que dejó la cuenta en -$80.000; el pedido dice que nunca debe quedar bajo $0. |
| Medir el saldo final de la cuenta en la edición | Una cuenta que ya estaba en negativo (dato viejo) bloquearía cambiar la fecha o la nota; se mide lo que el gasto pide. |

## Consecuencias

- `tino-anota.svg` se precachea en el SW como las demás poses.
- Si la barra o el botón central cambian de medida, solo se recalibra `--gastos-guia-boton` (`domain.css`).
