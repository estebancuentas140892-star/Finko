# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-14. Última tarea cerrada: DOC.4, compuerta 3 automatica en el pre-commit.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4236/4237 (2026-08-14). El único rojo es **BUG-028**, ajeno a la última tarea y verificado con `git stash` |
| Tests E2E | 271/271 verdes, sello `c5283d3158bf` (2026-08-14, PA.1b). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v41 (`Ingreso.creditoAutomatico`, `IngresoPuntual.ingresoId`, PA.1b; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; deja la suite unitaria en rojo) |

---

## 2. Últimas 5 tareas cerradas

**DOC.4 - compuerta 3 automatica en el pre-commit (Transversal), 2026-08-14**
`.githooks/pre-commit` ya bloqueaba sin sello E2E (compuerta 5); ahora corre tambien la compuerta 3 (guion largo/medio) sobre el index en cada commit, mismo patron, sin dependencias nuevas. Probado en verde y en rojo. Sin runtime: sin SW, sin tests que correr.

**PA.1b - crédito automático del ingreso fijo (Calendario/Mis cuentas), 2026-08-14**
Cierra la iniciativa **PA.1** completa ([ADR 052](DECISIONS/052-pagos-automaticos.md)). El ingreso fijo que el banco abona solo se marca con un toggle y entra a la misma hoja `#modal-automaticos` de PA.1a, con signo `+` y sin cascada de saldo (abonar nunca "no alcanza"). Reusa `Ingreso.cuentaId` como destino en vez de una FK nueva. Schema v40 → v41 (migración no-op), SW v533 → v534.

**PERF.10b - helper único de estado en las 13 suites E2E (Transversal), 2026-08-14**
Cierra **PERF.10** completa: `grep -rl "fk_v1" tests/e2e/` pasa de 13 archivos a 1. Es helper y no constante porque `addInitScript()` serializa su función al navegador y no puede cerrar sobre nada de Node: eso obligaba a teclear la clave 105 veces. Borra código: los 31 envoltorios que solo cruzaban valores al navegador desaparecen (neto -101 líneas). Sin runtime ni bump de SW.

**DOC.3 - fichas de contexto bajo su techo y sellos vencidos re-verificados (Transversal), 2026-08-14**
**El defecto no era el tamaño sino la historia duplicada:** en `inicio.md` y `calendario.md` "Cambios realizados" reproducía el CHANGELOG en párrafos; podarlo bastó, sin partirlas. `transversal.md` sí se partió en cuatro: nacen `categorias.md`, `logros.md` y `escritorio.md`. Los tres sellos se re-verificaron ancla por ancla y **dos afirmaban cifras ya falsas** (CTA de cuenta: 5 superficies, hoy 4; tejas de marca: 11 bancos, hoy 12). Ninguna ficha supera 40 KB. Sin código.

**PERF.10a - fachada de `localStorage` en el runtime (Transversal), 2026-08-14**
`fk_v1` y el motor dejan de nombrarse fuera de `modules/core/storage.js`. `restaurarBlob()` distingue JSON inválido de cupo lleno: la segunda ruta ya no se anuncia como "archivo corrupto" y sí activa la salvaguarda del [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) D2. `borrarTodo()` reemplaza los dos `localStorage.clear()` crudos. Las dos cancelan el `save()` pendiente, que podía resucitar datos borrados en el reload. SW v532 → v533.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**; de CFG queda solo **CFG.4** (respaldo/sync, ADN, ADR 043 abierto). La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); en su lugar viven **PERF.9** y **PERF.10** (completa, PERF.10a+PERF.10b cerradas el 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
