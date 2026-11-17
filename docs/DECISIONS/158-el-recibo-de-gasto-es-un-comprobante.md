# ADR 158 - El recibo de "Registrar gasto" es un comprobante

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "Rediseño visual del registro de gastos: comprobante tipo factura", imagen de referencia "Registrar gasto en Finko" y la plantilla de Illustrator "Plantilla factura gastos"), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** el [ADR 156](156-registrar-gasto-en-el-telefono-tablero-integral.md) D3 (la forma del recibo) y la cabecera de la etapa "Revisar". Conserva todo lo funcional de ese ADR: D4 (un solo teclado), D5 ("¿Con qué pagaste?"), D6 (la cuenta que no alcanza no guarda), D7 (un solo botón), D9 (el calendario) y D12 (sin desplazar, medido de nuevo). Extiende la biblioteca del [ADR 026](026-biblioteca-de-recursos-graficos.md) con la carpeta `comprobante/`, con las reglas de color por rol de las poses de Tino ([ADR 095](095-tino-en-el-sprite.md) D4). Solo bajo 1024 px: escritorio no cambia.

---

## Contexto

El pedido: que al registrar un gasto la persona vea un pequeño comprobante de compra, no un formulario dentro de una tarjeta, con la identidad de Finko (verdes, crema, ilustraciones amigables). Llegaron una imagen de referencia y una plantilla de Illustrator con todas las piezas en un solo lienzo de 1920 x 1080 (Image Trace: unos 380 tonos y los rótulos trazados). El recibo que GAS.3 había dejado esa misma madrugada ya decía cada dato una vez; lo que cambia es su forma.

## Decisión

### D1. El recibo tiene forma de comprobante

Un papel blanco cálido con sombra y borde troquelado, la pestaña verde con el carrito sobresaliendo arriba y "Comprobante de gasto" entre destellos. Debajo, la ilustración de la categoría junto al monto ("$ 48.500", grande, en el verde profundo, con un trazo verde debajo) y la categoría en su pastilla; tocarlos vuelve al monto, como el lápiz de GAS.3. Las filas llevan el ícono de su campo, el rótulo en verde y el valor en su columna, alineado a la izquierda. Al pie, un código de barras que solo adorna. El papel y su tinta son fijos en los dos temas (como la teja del isotipo); en claro la hoja detrás es crema.

### D2. La cabecera de "Revisar" es la banda de Finko

Banda bosque con el isotipo en su teja crema, "Registrar gasto", "Volver" y la ✕ en tejas translúcidas, hojas en los extremos y una loma crema que sube en el centro. Las etapas con nombre no se pintan en este paso. La ✕ se queda: es la única salida de la ficha de un gasto guardado.

### D3. Cada dato una vez, también la cuenta

"Entidad bancaria": el logo, la entidad y debajo el tipo ("Bancolombia" y "Cuenta de ahorros"), con `nombreCortoCuenta` y `tipoDeCuenta(c, true)` como en Inicio, y lo que le queda. El efectivo dice "Sale de" y la tarjeta "Tarjeta de crédito". La subcategoría es "¿En qué fue?". "Opcional" no se pinta en el papel (sigue en el texto de la fila). Sin "Guardar y registrar otro" ni "Toca cualquier dato" (ADR 156 D7).

### D4. Las piezas son SVG de la biblioteca, con color por rol

La plantilla se partió fuera del repo en 20 piezas (`assets/svg/comprobante/`: pestaña, destellos, hojas, arbusto, código de barras, 10 ilustraciones de categoría y 5 íconos de campo), con coordenadas horneadas, un decimal y solo `path`, `rect` y `circle`. Cada color es uno de 31 roles `--fk-cmp-*` (`tokens.css`); el contorno es el bosque profundo, no el negro del trazado. Entran al sprite como `cmp-*` con las reglas de `ilustraciones/` (`sync-sprite.py`). `CATEGORIA_ILUSTRACION` (`constants.js`) dice qué categoría usa qué ilustración; la que no tiene lleva su glifo en una teja.

### D5. El troquel y la sombra son CSS

El borde inferior se repite a cualquier ancho: es una máscara con las medidas de la plantilla. La sombra venía como PNG incrustado (la biblioteca lo prohíbe): es un `drop-shadow`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar los colores absolutos con `data-fullcolor` | Esa excepción es para marcas cuya identidad es el color. Con roles el contorno pasa al verde profundo que pide el pedido y una pieza se ajusta sin reexportar. |
| El borde inferior como SVG estirado | Un ancho fijo deforma las medias lunas en cada teléfono. |
| Quitar la ✕ como la referencia | La ficha de un gasto guardado no tiene "Volver": quedaría sin salida a la vista. |
| Dejar el lápiz de GAS.3 | La referencia no lo trae; tocar la ilustración, el monto o la categoría vuelve al monto con el mismo aviso para el lector. |

## Consecuencias

- Sin desplazar (ADR 156 D12), medido: 390 x 844, 375 x 667, 360 x 740 y 430 x 932; bajo 760 y 700 de alto el comprobante se compacta. A 320 x 568 la hoja desplaza por dentro, como ya aceptaba el ADR 156.
- El sprite crece unos 34 KB (unos 11 KB comprimidos).
- Pendiente de arte (tarjeta GAS.C2): el logotipo "Finko" en letras (hoy va el isotipo), ilustraciones para las categorías que no tienen (Restaurantes, Café, Mecato, Mascotas, Cuidado personal, Familia, Otros, Gastos hormiga, Gastos fijos) y, opcional, el ícono de "Cuotas" (hoy el de "Categoría").
