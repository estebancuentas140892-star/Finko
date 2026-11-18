# Tablero - Ahorro

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `ahorro`: fondo de emergencia y la entrada a las cuatro lentes, ADR 125). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: una tarjeta viva, AH.9 (¿dónde lo guardas?), abajo.** AH.7 completa (AH.7a y AH.7b cerradas). Historia en [`contexto/ahorro.md`](../contexto/ahorro.md) y el CHANGELOG.

---

#### AH.9 - ¿Dónde lo guardas?
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : [ADR 174](../DECISIONS/174-donde-lo-guardas.md) D2 a D5: `guardadoEn` (`cuentaId` y `bolsillo` opcional) en la meta, la reserva y el fondo; la fila "Guardado en Nequi, bolsillo Viaje" en sus fichas; "Guardado aquí" en la hoja de la cuenta, con la frase que separa metas y reservas (fuera del saldo) del fondo (dentro del saldo); la cuenta propuesta al aportar; el subtítulo "Tu colchón para emergencias"
- Riesgo     : es solo referencia: ningún cálculo de saldo, patrimonio ni distribución puede leer `guardadoEn`; una cuenta eliminada no rompe la ficha; los montos de "Guardado aquí" siguen el ojo de Mis cuentas
- Secciones  : Metas, Reservas, Fondo de emergencia, Mis cuentas (hoja de la cuenta)
- Archivos   : `modules/core/state.js`, `modules/dominio/metas/` (`logic.js`, `detalle.js`, `view.js`, `index.js`), `modules/dominio/apartados/` (los mismos), `modules/dominio/ahorro/view.js` e `index.js`, `modules/dominio/tesoreria/views/cuentas.js` (`htmlDetalleCuenta`), `tests/unit/`
- Depende de : nada
- Aceptación : unitarias de normalizar y validar `guardadoEn`; E2E a 390 px: una meta guardada en Nequi, bolsillo Viaje, aparece en la hoja de Nequi con su monto, y aportar a ella propone Nequi como origen
- Modelo     : capacidad estándar, esfuerzo medio
