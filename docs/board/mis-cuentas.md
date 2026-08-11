# Tablero - Mis cuentas

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Mis cuentas (dominio `tesoreria`)

> **Iniciativa "Mis Cuentas v2"** (briefs 2026-07-08), **cerrada**: MC.13, MC.16, MC.17 y MC.18 en producción. **Conflicto (b) del brief, abierto:** "el ingreso fijo se abona solo sin confirmación" es el mismo problema de filosofía de PA.1, se decide en ESE ADR y no por separado.

#### MC.17f - Deshacer o editar una transferencia (hueco de integridad)
- Prioridad  : media
- Estado     : pendiente de análisis. **Revisa el cierre de MC.17 como "completa"** (regla 2.7: decirlo, no corregirlo en silencio). Hallazgo de la auditoría de UX/producto.
- Objetivo   : una transferencia no se puede editar ni revertir hoy; un error de cuenta o monto descuadra dos saldos a la vez sin salida dentro de la app (patrón P3, agravado). Diseño recomendado (deshacer con rastro, no borrado silencioso) y el cuidado del GMF en [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md).
- Secciones  : Mis cuentas, Movimientos (rastro)
- Depende de : coordinar con **MOV.1** (si el ledger gana acciones por fila, "deshacer transferencia" es una de ellas y no necesita UI propia en Mis cuentas)
- Modelo     : Alta capacidad - Alto (dinero en dos cuentas + GMF; una reversa mal hecha descuadra el patrimonio)
