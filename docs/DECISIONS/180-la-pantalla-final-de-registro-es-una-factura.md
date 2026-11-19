# ADR 180 - La pantalla final de registro es una factura

**Estado:** Aceptada (2026-11-19).
**Fecha:** 2026-11-19
**Autores:** Esteban (pedido "Implementar nuevo diseño de factura electrónica en Finko" con la referencia `Diseños SVG/factura-finko.svg`), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 158](158-el-recibo-de-gasto-es-un-comprobante.md) D1 (la forma del recibo), D2 (el isotipo en la banda de "Revisar") y D4 (qué piezas de `assets/svg/comprobante/` usa el recibo), y la forma del resumen del [ADR 142](142-formularios-por-tarea.md) D5 (FORM.2e, `ui/preguntas.js`). Conserva todo lo funcional del [ADR 156](156-registrar-gasto-en-el-telefono-tablero-integral.md) (un solo teclado, "¿Con qué pagaste?", la cuenta que no alcanza no guarda, un solo botón, sin desplazar) y del ADR 158 D3 (cada dato una vez). Solo bajo 1024 px: escritorio no cambia.

---

## Contexto

El pedido: que la pantalla final de un registro se vea como una factura electrónica, muy cerca de la referencia SVG y no una interpretación libre, en todos los movimientos que la comparten (gastos del día a día, gastos fijos, deudas y los demás). La referencia trae, de arriba abajo: un marco verde bosque con una franja de tres colores (bosque, girasol y coral, los del isotipo), un sello con el isotipo en un disco de doble aro entre tres rayas a cada lado, un corte de puntos, "Gasto registrado", la cifra grande y "COP", un corte de guiones, cuatro filas de "ícono | rótulo y valor" (Categoría, ¿En qué fue?, Cuenta de origen, Fecha), otro corte, la nota y un código de barras a todo el ancho. El texto viene en contornos, así que se midió renderizando el SVG.

Hay dos pantallas finales: el recibo de Registrar gasto (`gastos/telefono.js`, el comprobante de GAS.C), que es también la ficha de un gasto guardado, y el resumen de los flujos por preguntas (`ui/preguntas.js`), que comparten el gasto fijo, la deuda, el ingreso fijo, la cuenta, la meta, la reserva, la inversión, el préstamo y el límite.

## Decisión

### D1. Un solo papel de factura para las dos pantallas

`.factura` (`components/captura.css`) y `ui/factura.js` (el sello y el código de barras) visten los dos: el recibo de gasto y el resumen de preguntas. No hay un componente por tipo de movimiento: el contenido sale de los datos de cada formulario.

### D2. El papel y el marco son fijos en los dos temas

Marco `--fk-factura-marco` (#123e2c), papel `--fk-factura-papel` (#f3ecda), tinta, tinta secundaria y acento, girasol y coral, con los colores del SVG (`tokens.css`). Como el papel del comprobante (ADR 158 D1), no cambian con el tema: en oscuro el papel crema resalta y en claro lo separa el marco. Contraste sobre el papel: tinta 13,8:1, tinta secundaria 7,7:1, acento 5,5:1, marco 10,2:1. La tipografía es la de Finko (display para título, cifra y valores).

### D3. El recibo de gasto

- **Arriba:** el sello y el título: "Nuevo gasto" antes de guardar y "Gasto registrado" en la ficha de un gasto guardado (el SVG dice "Gasto registrado"; antes de guardar no sería cierto). Debajo, la cifra con "COP"; tocarla vuelve al monto.
- **Las filas:** la categoría pasa a ser la primera fila (antes era una pastilla junto a la cifra), con su glifo; tocarla vuelve a elegir la categoría. Siguen "¿En qué fue?", "Cuenta de origen" (antes "Entidad bancaria"; el efectivo sigue diciendo "Sale de" y la tarjeta "Tarjeta de crédito"), las cuotas si es una tarjeta y la fecha. La nota va aparte, tras otro corte, como en el SVG.
- **Los íconos** son de contorno, del sprite, como en el SVG: el glifo de la categoría, `c-etiqueta`, `i-deudas` (tarjeta), `i-recurring` (cuotas), `i-agenda` y el nuevo `i-nota` (un globo, `assets/svg/iconos/simbolos/nota.svg`). Entre el ícono y el texto, una raya.
- **Lo que sale:** la pestaña con el carrito, "Comprobante de gasto" entre destellos, la ilustración de la categoría, el trazo bajo la cifra, el troquel y el logo de la cuenta junto al valor. El isotipo sale de la banda de "Revisar" porque ya está en el sello. La banda, "Volver", la ✕ y el pie con hojas y arbusto se quedan.
- Debajo de la cuenta siguen el tipo, lo que queda y el 4x1000; el aviso de saldo queda pegado a la cuenta.

### D4. El resumen de los flujos por preguntas

- **Título:** `data-factura-titulo` del formulario o, si no lo tiene, su nombre (`data-preguntas`: "Nueva deuda", "Tu meta"...). El gasto fijo dice "Gasto fijo" (su nombre es "Nuevo gasto fijo" también al editar).
- **La cifra:** el bloque `data-cifra` (el gasto fijo) o, si no hay, el primer bloque de dinero respondido ("Lo que debes hoy" en la deuda, "Monto" en el ingreso). Va arriba con "COP" y su rótulo debajo, y su fila no se repite (cada dato una vez). Tocarla vuelve a su pregunta. Sin dinero respondido no hay cifra.
- **Las filas:** el ícono propio del bloque (la marca de la empresa, el banco) o uno de contorno según el rótulo (`simboloDeFilaFactura`: nota, día, frecuencia, cuenta, tasa, persona, dinero, nombre; un documento si no hay pista). La fila "Nota" va aparte, tras otro corte.
- Lo de alrededor no cambia: "Así queda tu deuda", "Toca un dato para cambiarlo", el aviso del calendario, "Agrega si quieres" y el botón de guardar.

### D5. Sin desplazar y con zonas táctiles de 44

Medido sin desplazar el recibo de gasto en 390 x 844, 430 x 932, 360 x 740 y 375 x 667: bajo 760 y 700 de alto se compactan el sello, la cifra, los cortes y las barras; las filas no bajan de 44 px. A 320 x 568 la hoja desplaza por dentro, como ya aceptaba el ADR 156. En un papel de menos de 300 px el sello se achica.

### D6. El código de barras solo adorna

`htmlFacturaBarras(semilla)` dibuja barras a todo el ancho derivadas del id del gasto (o del formulario), así cada factura tiene las suyas y no cambian al volver a pintarla. No codifica nada y va `aria-hidden`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Un componente de factura por tipo de movimiento | Duplicaría el papel; el resumen de preguntas ya es uno para todos y el contenido sale de cada formulario. |
| "Gasto registrado" también antes de guardar | No sería cierto: el gasto se guarda con el botón de abajo. |
| Mostrar la factura después de guardar, como pantalla nueva | Cambiaría el flujo de registro (un toque más) y el pedido pide no tocar su lógica. |
| Seguir el tema en el papel | El SVG es crema con tinta bosque; el papel de GAS.C ya era fijo por la misma razón. |
| Conservar la ilustración de la categoría | El SVG no la trae y competía con la cifra; el glifo de la categoría va en su fila. |

## Consecuencias

- Las ilustraciones de categoría, los íconos de campo, la pestaña, los destellos y el código de barras de `assets/svg/comprobante/` siguen en el sprite y `CATEGORIA_ILUSTRACION` sigue en `constants.js`, pero el recibo ya no los usa (las hojas y el arbusto del pie y de la banda sí). La tarjeta GAS.C2 (el arte que faltaba del comprobante) queda en pausa: la factura no lleva ilustraciones ni el logotipo en letras.
- `i-nota` entra al sprite; `ui/factura.js` al precache del SW (v791).
