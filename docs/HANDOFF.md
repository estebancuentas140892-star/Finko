# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-15. Última tarea cerrada: CFG.4a, persistencia del almacenamiento del origen.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4249/4255 (2026-08-15). Los 6 rojos son **BUG-028**, ajeno y verificado con `git stash`: creció solo de 1 a 6 con el avance del calendario |
| Tests E2E | 270/270 verdes, sello `feeecaf51849` (2026-08-15, CFG.4a). 1 flaky que pasó al reintento: la posición del ojo de IN.8b (`smoke.test.js:275`). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v41 (`Ingreso.creditoAutomatico`, `IngresoPuntual.ingresoId`, PA.1b; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**CFG.4a - persistencia del almacenamiento del origen (Configuración), 2026-08-15**
Cierra el **[ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) como Aceptado** (Esteban delegó la decisión) y desbloquea **CFG.4**: sin cuentas ni sincronización (D y E descartadas con fecha y condición de reapertura), custodia del usuario siempre, durabilidad sí, en tres palancas que no tocan el ADN. Esta rebanada es la primera: `modules/infra/persistencia.js` pide `navigator.storage.persist()` y "Tus datos" muestra el estado real. **No** activa el D4 del ADR 030. 18 tests nuevos. SW v535 → v536.

**PERF.9 - peso serializado real del estado en el harness (Transversal), 2026-08-14**
`scripts/perf/seed.js`: los gastos sembrados ya replican la forma real de un registro (`id` UUID de `genId()`, `fechaCreacion` ISO, más `nota`/`compromisoId`/`consumoTC`/`cuotas`/`avanceTC`), antes solo 4 campos e `id` corto. `bench.perf.js`: columnas nuevas `caracteres` y `% cupo` contra `LIMITE_LOCALSTORAGE_CHARS`, más una extrapolación que reporta a qué volumen se cruza el 80 %: ~255,9 caracteres/gasto, ~14.032 gastos (no los ~47.000 que sugería la semilla vieja). Da instrumento a **T1** del [ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md). Sin runtime (solo `pnpm perf`).

**DV.2d - cableado de emptyArt() al symbol il-* (Transversal), 2026-08-14**
`emptyArt()` en `modules/infra/icons.js` busca el `<symbol id="il-<dominio>">` del sprite antes de componer la ilustración geométrica; cae a esa composición mientras el placeholder del dominio siga fuera del sprite. Las 8 vistas consumidoras no cambian. Único bloqueo restante en DV.2d: el arte final de Esteban en Illustrator. SW v534 → v535.

**DOC.4 - compuerta 3 automatica en el pre-commit (Transversal), 2026-08-14**
`.githooks/pre-commit` ya bloqueaba sin sello E2E (compuerta 5); ahora corre tambien la compuerta 3 (guion largo/medio) sobre el index en cada commit, mismo patron, sin dependencias nuevas. Probado en verde y en rojo. Sin runtime: sin SW, sin tests que correr.

**PA.1b - crédito automático del ingreso fijo (Calendario/Mis cuentas), 2026-08-14**
Cierra la iniciativa **PA.1** completa ([ADR 052](DECISIONS/052-pagos-automaticos.md)). El ingreso fijo que el banco abona solo se marca con un toggle y entra a la misma hoja `#modal-automaticos` de PA.1a, con signo `+` y sin cascada de saldo (abonar nunca "no alcanza"). Reusa `Ingreso.cuentaId` como destino en vez de una FK nueva. Schema v40 → v41 (migración no-op), SW v533 → v534.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.4 desbloqueada** ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado el 2026-08-15): **CFG.4a cerrada**, quedan CFG.4b (sello del último respaldo y aviso, la de mayor valor), CFG.4c (respaldo cifrado) y CFG.4d (cláusula legal). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
