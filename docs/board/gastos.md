# Tablero - Gastos (dominio `gastos`)

> Revisado: 2026-08-13.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `gastos`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: GAS.2 completa (GAS.2a, GAS.2b y GAS.2c cerradas, 2026-08-10 y 2026-08-11).** Sin tarjetas vivas. Historia en [`contexto/gastos.md`](../contexto/gastos.md) y el CHANGELOG; las decisiones de arquitectura que dejó, en el [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) (lectura cross-domain) y el [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) (toast de consecuencia).

---

**Dos hallazgos de la verificación de GAS.2 que no viven en ningún ADR** y conviene no volver a investigar:

- **La ficha 12 del handoff de Claude Design (Límites) es infiel:** dibuja los chips de categoría con emoji. El código pinta SVG del sprite vía `iconoDeCategoriaGasto()` (`modules/dominio/gastos/view.js`). La ficha 22 sí es fiel.
- **No existe mapeo de categoría a grupo financiero.** `GRUPO_POR_SECCION` (`modules/core/constants.js`) mapea **sección**, no categoría. Cualquier tarjeta que asuma ese mapeo tiene que inventarlo primero.

El detalle completo de las tres rebanadas (plan por pasos, tabla de prioridad del texto, casos de borde) vivió acá hasta el 2026-08-13 y se retiró al purgar tarjetas cerradas: está en `git log -- docs/board/gastos.md`.

---

_(vacío: sin tarjetas pendientes en Gastos)_
