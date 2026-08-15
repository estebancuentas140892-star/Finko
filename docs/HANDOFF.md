# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-15. Última tarea cerrada: CFG.4d, cláusula de cambio de modelo cerrada en `docs/legal/`.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4304/4310 (2026-08-15). Los 6 rojos son **BUG-028**, ajeno y verificado con `git stash` |
| Tests E2E | 271/271 verdes, sello `77ce9e755481` (2026-08-15, CFG.4c). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**CFG.4d - cláusula de cambio de modelo cerrada, iniciativa CFG.4 completa (Configuración), 2026-08-15**
Cuarta y última rebanada ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D1). Los cinco documentos de `docs/legal/` con la cláusula "cambio de modelo (CFG.4)" pasan de "si esto llegara a pasar" a "se decidió que no pasa", conservando qué cambiaría si se reabriera. Cambio menor en `historial-de-cambios.md`: no pide re-aceptación, el fondo no cambia. Sin runtime, sin tests. **Cierra CFG.4 completa**: CFG.4a-d, las cuatro el mismo día.

**CFG.4c - respaldo cifrado opcional con contraseña (Configuración), 2026-08-15**
Tercera rebanada de **CFG.4** ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D2.3). `infra/cripto-respaldo.js` nuevo: AES-GCM 256 + PBKDF2 600k sobre el `crypto.subtle` del candado, en un sobre JSON que lleva sus propios parámetros. Interruptor opcional en "Tus datos" (schema v43); importar detecta el formato solo. **La contraseña no se guarda y no se recupera**, y la pantalla lo dice. Corrige un defecto de CFG.3c: repintar el panel dejaba el importador sin listener. 29 tests nuevos. SW v538 → v539.

**CFG.4b - sello del último respaldo y aviso de respaldo atrasado (Configuración), 2026-08-15**
Segunda rebanada de **CFG.4** (D2.2): ataca el problema que abrió el ADR, un respaldo que depende de acordarse no protege. `config.ultimoRespaldoISO` se sella al exportar y "Tus datos" lo muestra en lenguaje humano; `infra/avisos.js` suma el tipo `respaldo-atrasado` (media a 30 días, alta a 90) y la sexta sección `'respaldo'`. 26 tests nuevos.

**IV.4 - metáfora de movimiento en Avalancha y Bola de nieve (Transversal), 2026-08-15**
`i-mountain` gana un trazo de caída (dos golpes + chispa al final); `i-snowball` suma un arco de rastro tras el círculo chico. Un solo `circle` de chispa por ícono (regla 3, ADR 023). Esteban decidió directamente. Detalle y verificación: CHANGELOG. SW v537 → v538.

**CFG.4a - persistencia del almacenamiento del origen (Configuración), 2026-08-15**
Cierra el **[ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) como Aceptado** (Esteban delegó la decisión) y desbloquea **CFG.4**: sin cuentas ni sincronización (D y E descartadas con fecha y condición de reapertura), custodia del usuario siempre, durabilidad sí, en tres palancas que no tocan el ADN. Esta rebanada es la primera: `modules/infra/persistencia.js` pide `navigator.storage.persist()` y "Tus datos" muestra el estado real. **No** activa el D4 del ADR 030. 18 tests nuevos. SW v535 → v536.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
