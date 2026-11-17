# Tablero - Gastos (dominio `gastos`)

> Revisado: 2026-11-17.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `gastos`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: una tarjeta viva, GAS.C2 (el arte que falta del comprobante, abajo).** GAS.2 completa (GAS.2a, GAS.2b y GAS.2c cerradas, 2026-08-10 y 2026-08-11). Historia en [`contexto/gastos.md`](../contexto/gastos.md) y el CHANGELOG; las decisiones de arquitectura que dejó, en el [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) (lectura cross-domain) y el [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) (toast de consecuencia).

---

**Dos hallazgos de la verificación de GAS.2 que no viven en ningún ADR** y conviene no volver a investigar:

- **La ficha 12 del handoff de Claude Design (Límites) es infiel:** dibuja los chips de categoría con emoji. El código pinta SVG del sprite vía `iconoDeCategoriaGasto()` (`modules/dominio/gastos/view.js`). La ficha 22 sí es fiel.
- **No existe mapeo de categoría a grupo financiero.** `GRUPO_POR_SECCION` (`modules/core/constants.js`) mapea **sección**, no categoría. Cualquier tarjeta que asuma ese mapeo tiene que inventarlo primero.

El detalle completo de las tres rebanadas (plan por pasos, tabla de prioridad del texto, casos de borde) vivió acá hasta el 2026-08-13 y se retiró al purgar tarjetas cerradas: está en `git log -- docs/board/gastos.md`.

---

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
