# Tablero - Gastos (dominio `gastos`)

> Revisado: 2026-11-20.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `gastos`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: cuatro tarjetas vivas, GAS.12 (cada pestaña con su cifra y cada vencimiento con su pago, en proceso), GAS.8 (Gastos en el teléfono, cada cosa con su forma y su color), GAS.5 (lo que falta del pedido "Gastos día a día") y GAS.C2 (el arte que falta del comprobante), abajo.** GAS.11 (el pedido "Implementación y correcciones funcionales de Gastos", [ADR 186](../DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md)) se cerró el 2026-11-20. GAS.10 (Gastos móvil, cada lugar con una función, [ADR 185](../DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)) y GAS.9 (Gastos que cuadran, [ADR 183](../DECISIONS/183-gastos-que-cuadran.md)) se cerraron el 2026-11-19. GAS.7 (Gastos en cuatro pestañas, [ADR 179](../DECISIONS/179-gastos-en-cuatro-pestanas.md)) y GAS.6 (Videojuegos) se cerraron el 2026-11-18. GAS.2 completa (GAS.2a, GAS.2b y GAS.2c cerradas, 2026-08-10 y 2026-08-11). Historia en [`contexto/gastos.md`](../contexto/gastos.md) y el CHANGELOG; las decisiones de arquitectura que dejó, en el [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) (lectura cross-domain) y el [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) (toast de consecuencia).

---

**Dos hallazgos de la verificación de GAS.2 que no viven en ningún ADR** y conviene no volver a investigar:

- **La ficha 12 del handoff de Claude Design (Límites) es infiel:** dibuja los chips de categoría con emoji. El código pinta SVG del sprite vía `iconoDeCategoriaGasto()` (`modules/dominio/gastos/view.js`). La ficha 22 sí es fiel.
- **No existe mapeo de categoría a grupo financiero.** `GRUPO_POR_SECCION` (`modules/core/constants.js`) mapea **sección**, no categoría. Cualquier tarjeta que asuma ese mapeo tiene que inventarlo primero.

El detalle completo de las tres rebanadas (plan por pasos, tabla de prioridad del texto, casos de borde) vivió acá hasta el 2026-08-13 y se retiró al purgar tarjetas cerradas: está en `git log -- docs/board/gastos.md`.

---

### GAS.12 - Cada pestaña con su cifra y cada vencimiento con su pago
- Prioridad  : alta
- Estado     : en proceso (GAS.12a y 12b cerradas, [ADR 187](../DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md))
- Área       : code (D3 y D4 traen un botón y un campo)
- Objetivo   : el pedido "Correcciones de cálculos y vencimientos, Gastos de Finko": el resumen de cada pestaña habla solo de ella y cada vencimiento de un fijo se paga por separado.
- Secciones  : Gastos (las cuatro pestañas), Calendario, Inicio (Atención hoy) y el formulario del gasto fijo
- Depende de : nada
- Modelo     : capacidad alta, esfuerzo alto

Lo que falta, una rebanada con commit y push cada una:
1. **GAS.12c** (D3): "Ya lo había pagado" en la hoja del fijo, sin mover dinero.
2. **GAS.12d** (D4): la fecha del primer pago en "Cuándo".

### GAS.8 - Gastos en el teléfono: cada cosa con su forma y su color
- Prioridad  : alta
- Estado     : en espera de las poses de Tino (GAS.8a a GAS.8h cerradas, [ADR 182](../DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md))
- Área       : ambos
- Objetivo   : el tablero "Gastos de Finko · Rediseño móvil", una rebanada con commit y push cada una, en este orden.
- Secciones  : Gastos (teléfono), Límites y Mis cuentas
- Depende de : nada; las cinco poses nuevas de Tino las entrega Esteban (mientras, `POSE_TINO_INTERINA`, D9)
- Modelo     : capacidad alta, esfuerzo alto

Lo que falta:
1. Al llegar las poses de Tino (fantasma, atajando, sorprendido, sorprendido solo cabeza, separando): sumarlas a `TINO_ORIGINAL`, `assets/tino/` y el SW, y quitar su línea de `POSE_TINO_INTERINA`.

### GAS.5 - Pedido "Gastos día a día" (Esteban, 2026-11-17)
- Prioridad  : alta
- Estado     : en proceso (GAS.5a y GAS.5b cerradas, [ADR 161](../DECISIONS/161-dia-a-dia-tino-anota-sin-flecha.md); GAS.5c cerrada, [ADR 162](../DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md); SAL.1 cerrada, [ADR 163](../DECISIONS/163-ninguna-cuenta-por-debajo-de-cero.md); LIM.2 cerrada, [ADR 164](../DECISIONS/164-limite-por-subcategoria.md); GMF.1a y GMF.1b cerradas, [ADR 165](../DECISIONS/165-el-4x1000-segun-la-cuenta.md); OJO.1 cerrada, [ADR 166](../DECISIONS/166-un-ojo-por-seccion.md); VIS.1a y VIS.1b cerradas, [ADR 168](../DECISIONS/168-lo-importante-sin-desplazar.md))
- Área       : ambos
- Objetivo   : el pedido completo, una rebanada con commit y push cada una, en este orden.
- Secciones  : Gastos, Límites, Mis cuentas y transversal
- Depende de : nada
- Modelo     : capacidad alta, esfuerzo alto

Lo que falta (más: "Distribuir mi ingreso" todavía no descuenta el 4x1000, ADR 165 D4):
1. **Tino con libreta** para el vacío de Día a día: lo dibuja Esteban y lo entrega en SVG (va a `assets/tino/`, `TINO_ORIGINAL` y el SW). Mientras, `explica`.

### GAS.C2 - El arte que falta del comprobante de gasto
- Prioridad  : media
- Estado     : en pausa desde FAC.1 (2026-11-19, [ADR 180](../DECISIONS/180-la-pantalla-final-de-registro-es-una-factura.md)): la pantalla final de registro es ahora una factura sin ilustraciones ni logotipo en letras. Retomarla solo si vuelven.
- Área       : design
- Objetivo   : que el comprobante de "Registrar gasto" quede igual a la referencia en toda categoría ([ADR 158](../DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md) D4).
- Secciones  : Gastos (teléfono)
- Archivos   : `assets/svg/identidad/wordmark.svg` (nuevo), `assets/svg/comprobante/categorias/*.svg`, `modules/core/constants.js` (`CATEGORIA_ILUSTRACION`), la cabecera en `modules/dominio/gastos/telefono.js`
- Depende de : los SVG de Esteban, en el mismo estilo de la plantilla (contorno grueso, colores planos, cada ilustración en un recuadro cuadrado). Se pueden entregar en una sola hoja: se parten con el conversor de GAS.C.
- Modelo     : capacidad media, esfuerzo bajo

Lo que falta:
1. El logotipo "Finko" en letras de la cabecera de la referencia (hoy va el isotipo en su teja).
2. Ilustraciones para Restaurantes, Café, Mecato, Mascotas, Cuidado personal, Familia y Otros; las internas Gastos hormiga y Gastos fijos; opcional, una para las categorías propias. Hoy llevan su glifo en una teja.
3. Opcional: el ícono de "Cuotas" (hoy el de "Categoría"), hojas de esquina más grandes como las de la referencia, la mancha verde detrás de la ilustración y el trazo bajo el monto (hoy CSS) y el rotulado "Comprobante de gasto" (hoy la tipografía de la app).

