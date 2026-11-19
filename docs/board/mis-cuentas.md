# Tablero - Mis cuentas (dominio `tesoreria`)

> Revisado: 2026-11-19.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`, mismo nombre que su ficha [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md)). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: sin tarjetas vivas.** MC.20 (transferir y retirar, [ADR 171](../DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md)) quedó completa el 2026-11-19: MC.20a (Retirar efectivo), MC.20b ("Transferir o retirar") y MC.20c (la tarjeta lleva a Sacar un avance). MC.19 (tus llaves a un toque, [ADR 170](../DECISIONS/170-tus-llaves-a-un-toque.md)) quedó completa el 2026-11-18. "Mis Cuentas v2" está completa: MC.13, MC.16, MC.17 (incluye MC.17f) y MC.18 en producción.

---

> **Iniciativa MC.20 - Transferir y retirar: a dónde fue el dinero** ([ADR 171](../DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md), aceptada 2026-11-18). Fuente única de cómo se registra el dinero que sale por transferencia o por cajero: sin canal (Bre-B, Transfiya, PSE), con el costo del retiro junto al 4x1000 y un selector que lleva "le transferí a alguien" al registro correcto. Amplía MC.17.

