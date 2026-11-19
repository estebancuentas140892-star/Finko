# Tablero - Gastos (dominio `gastos`)

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `gastos`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: tres tarjetas vivas, GAS.7 (Gastos en cuatro pestañas), GAS.5 (lo que falta del pedido "Gastos día a día") y GAS.C2 (el arte que falta del comprobante), abajo.** GAS.6 (Videojuegos) se cerró el 2026-11-18. GAS.2 completa (GAS.2a, GAS.2b y GAS.2c cerradas, 2026-08-10 y 2026-08-11). Historia en [`contexto/gastos.md`](../contexto/gastos.md) y el CHANGELOG; las decisiones de arquitectura que dejó, en el [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) (lectura cross-domain) y el [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) (toast de consecuencia).

---

**Dos hallazgos de la verificación de GAS.2 que no viven en ningún ADR** y conviene no volver a investigar:

- **La ficha 12 del handoff de Claude Design (Límites) es infiel:** dibuja los chips de categoría con emoji. El código pinta SVG del sprite vía `iconoDeCategoriaGasto()` (`modules/dominio/gastos/view.js`). La ficha 22 sí es fiel.
- **No existe mapeo de categoría a grupo financiero.** `GRUPO_POR_SECCION` (`modules/core/constants.js`) mapea **sección**, no categoría. Cualquier tarjeta que asuma ese mapeo tiene que inventarlo primero.

El detalle completo de las tres rebanadas (plan por pasos, tabla de prioridad del texto, casos de borde) vivió acá hasta el 2026-08-13 y se retiró al purgar tarjetas cerradas: está en `git log -- docs/board/gastos.md`.

---

### GAS.7 - Gastos en cuatro pestañas (tablero "Gastos móvil, rediseño de navegación", 2026-11-18)
- Prioridad  : alta
- Estado     : en proceso (GAS.7a a GAS.7e cerradas, [ADR 179](../DECISIONS/179-gastos-en-cuatro-pestanas.md) D1 a D5)
- Área       : ambos
- Objetivo   : aplicar el tablero entero en el teléfono, una rebanada con commit y push cada una, en este orden.
- Secciones  : Gastos, Por pagar (Fijos y Deudas) y Límites, bajo 1024 px
- Archivos   : `modules/ui/bloque-gastos.js`, `modules/dominio/gastos/view.js`, `modules/dominio/compromisos/views/{hero,lista,estrategia}.js`, `modules/dominio/presupuesto/view.js`, `styles/identidad.css`
- Depende de : nada
- Modelo     : capacidad alta, esfuerzo alto

Lo que falta (decisiones en el ADR 179):
1. **GAS.7f** (D6): Límites: grupos por estado y "Sin límite" (la tarjeta ya está).
2. **GAS.7g** (D7): primera vez y mes sin gastos.

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
- Estado     : pendiente (espera los SVG)
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

