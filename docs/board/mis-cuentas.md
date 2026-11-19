# Tablero - Mis cuentas (dominio `tesoreria`)

> Revisado: 2026-11-19.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`, mismo nombre que su ficha [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md)). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: una iniciativa viva, MC.20 (transferir y retirar), abajo: MC.20a cerrada el 2026-11-19 (Retirar efectivo); faltan MC.20b y MC.20c.** MC.19 (tus llaves a un toque, [ADR 170](../DECISIONS/170-tus-llaves-a-un-toque.md)) quedó completa el 2026-11-18. "Mis Cuentas v2" está completa: MC.13, MC.16, MC.17 (incluye MC.17f) y MC.18 en producción.

---

> **Iniciativa MC.20 - Transferir y retirar: a dónde fue el dinero** ([ADR 171](../DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md), aceptada 2026-11-18). Fuente única de cómo se registra el dinero que sale por transferencia o por cajero: sin canal (Bre-B, Transfiya, PSE), con el costo del retiro junto al 4x1000 y un selector que lleva "le transferí a alguien" al registro correcto. Amplía MC.17.

#### MC.20b - "Transferir o retirar" en la hoja de registrar
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 171 D2: la fila pasa a "Transferir o retirar" y aparece con una cuenta; su selector "¿A dónde fue el dinero?" lleva a Transferir, Retirar efectivo, Pagar varios (si hay algo pendiente este mes), Registrar gasto o Nuevo préstamo, cada opción solo cuando aplica
- Riesgo     : el selector reusa la vista de destinos de Abono y Aporte (`registrar-elegir-destino`), no una hoja nueva; `ui/registrar.js` no importa dominios (ADN 10)
- Secciones  : Registrar (botón central y barra de escritorio)
- Archivos   : `modules/ui/registrar.js`, `index.html` (la vista de destinos de la hoja), `tests/unit/registrar.test.js`
- Depende de : MC.20a
- Aceptación : unitarias de qué opciones salen según las cuentas y lo pendiente del mes; E2E: con una sola cuenta, "Le presté dinero" abre Nuevo préstamo
- Modelo     : capacidad estándar, esfuerzo bajo

#### MC.20c - La tarjeta como origen del retiro
- Prioridad  : baja
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 171 D3: en Retirar efectivo, las tarjetas con cupo en un grupo aparte; elegir una abre "Sacar un avance" (ADR 169) con el monto y Efectivo ya puestos
- Riesgo     : no se transfiere con cupo (ADR 051 D4): la tarjeta solo enruta al avance, nunca guarda una transferencia
- Secciones  : Mis cuentas, Por pagar
- Archivos   : `modules/dominio/tesoreria/views/transferencias.js`, `modules/infra/cuenta-helper.js`
- Depende de : MC.20a
- Aceptación : E2E: elegir la tarjeta en Retirar efectivo abre Sacar un avance con el monto escrito
- Modelo     : capacidad estándar, esfuerzo bajo
