# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-11. Última tarea cerrada: CAT.3c/CAT.3d, gastos fijos ofrecen y aceptan personalizadas (Transversal).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3856/3856 verdes en el índice de CAT.3c/CAT.3d (16 nuevos: `compromisos.test.js`, `agenda.test.js`). La fuga de `vi.useFakeTimers()` reportada por sesiones anteriores no se reprodujo en esta corrida |
| Tests E2E | 263/263 verdes, sello escrito sobre el índice de CAT.3c/CAT.3d. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v35 (`config.atajosTeclado`, INT.1h; default encendido, apagable en Ajustes). GAS.2a/2b no bumpearon schema (no tocan `localStorage`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**CAT.3c/CAT.3d - gastos fijos ofrecen y aceptan personalizadas (Transversal), 2026-08-11**
Cierra CAT.3 completa (4 rebanadas). `renderFormGastoFijo()` ofrece las personalizadas de `seccion: 'fijo'` + chip sentinela propio (`'Otro'` ya es miembro literal del catálogo, no sirve como disparador). `validarCompromiso()`/`normalizarCompromiso()` (`compromisos/logic/modelo.js`) reciben `personalizadasFijo`: el gate de escritura ya no rechaza ni descarta en silencio, y AG.4 (nombre automático) aplica igual que con una predefinida. CAT.3d (verificación end-to-end) confirmó sin cambios de código que las 3 superficies resueltas por CAT.3b pintan correcto. Commit `db81eee`.

**GAS.2c - toast de confirmación generalizado a Abono y Aporte (Gastos), 2026-08-11**
`consecuenciaDeAbono()` (`compromisos/logic/abonos.js`) y `consecuenciaDeAporte()` (`metas/logic.js`), mismo patrón de GAS.2a/2b: `_guardarAbono()` y `_guardarAbonoMeta()` sustituyen su `announce()` final por `mostrarToast()`. [ADR 062](DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) formaliza la regla: todo formulario que registra un movimiento de dinero confirma con toast + consecuencia. Activada por aprobación explícita de Esteban tras diferirse en GAS.2b.

**DOC.1 - reorganización documental, fases 4 y 5 (Mantenimiento), 2026-08-11**
Fase 4: los 10 movimientos de `MIGRACION.md` completos (incluido `settings.local.json` 12.2: Esteban decide borrar `git rm *`/`git branch *`, mantener el resto). Fase 5: cero enlaces `.md` rotos, cero guiones largos, sellos `Revisado:` en 37 docs que no lo tenían, techos corregidos (`BUGS.md` 9 KB, `DESIGN_SYSTEM.md` 70 KB), `README.md` adelgazado a 4 KB, `contexto/README.md` con los 11 principios, arranque medido en 29,5 KB (~7.400 tokens, 89% de reducción). `MIGRACION.md` borrado. Riesgo abierto: `CHANGELOG.md` del mes ya supera su fusible de 60 KB a 11 días de cerrar agosto.

**GAS.2b - segunda línea del toast con la consecuencia del gasto (Gastos), 2026-08-10**
`consecuenciaDeGasto()` (`gastos/logic.js`, pura) decide la segunda línea con prioridad fija: límite excedido, límite en alerta, saldo restante de la cuenta, o nada. [ADR 060](DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) formaliza cómo `gastos/index.js` lee `calcularProgreso()` de `presupuesto/logic.js` sin violar ADN 10 (el `logic.js` puro se comparte, no el `index.js`). Resuelve los 4 casos que la ficha 22 no cubría: repartido, consumo con tarjeta, edición, ojo de privacidad. De paso, BUG-027 (ADR 059 inexistente).

**GAS.2a - toast compartido de confirmación (Gastos), 2026-08-10**
Toast genérico (`ui/toast.js`, `mostrarToast()`) copiado del patrón de logros pero en `ui/` para no violar ADN 10; primer consumidor `_guardarGasto()`, primera línea con el nombre del gasto guardado. Corrige un hallazgo del handoff de Claude Design (ficha 22): el toast que asumía ya existente no existía, solo corría `announce()` (solo lector de pantalla).

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
