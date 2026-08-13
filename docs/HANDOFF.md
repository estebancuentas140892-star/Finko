# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-13. Última tarea cerrada: CFG.3a, motor único de avisos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4175/4175 verdes, 37 de ellos del motor de avisos (CFG.3a) |
| Tests E2E | 268/268 verdes, sello escrito sobre el runtime de CFG.3a. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v39 (`compromisos[].debitoAutomatico` y `.cuentaDebitoId`, PA.1a; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**CFG.3a - motor único de avisos y notificación al abrir (Configuración / transversal), 2026-08-13**
Abre el [ADR 066](DECISIONS/066-motor-unico-de-avisos.md) y desbloquea CFG.3. **Su riesgo técnico se resolvió en contra:** un service worker no puede leer `localStorage`, así que no tiene con qué calcular un vencimiento con la app cerrada. Sin push ni background sync. `infra/avisos.js` recolecta ocho tipos de aviso de siete fuentes, **devuelve datos y no recorta la lista**, y compone los detectores de cada dominio en vez de escribir otros (ADR 060). Solo `urgente` y `alta` interrumpen; los préstamos nunca suben de `media` (ADR 047: recordar, no presionar). SW v527 → v528.

**LIM.1c - la app propone dónde y cuánto poner tope (Límites de gasto / transversal), 2026-08-13**
Cierra el [ADR 044](DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md) y con él la iniciativa LIM.1. Motor propio en `infra/sugerencias-categoria.js` que **devuelve datos, nunca frases**: el copy es de cada superficie. El monto propuesto es el promedio de los meses cerrados con gasto, **nunca un recorte**, acotado por lo que el plan deja sin tope (ADR 045 D6). Entra la categoría recurrente o creciente sobre $50.000 al mes; la suscripción se detecta por antigüedad y costo anual, no por uso (Finko no sabe si algo se usa). Un aviso de cada tipo por render, sin persistir descartes. SW v526 → v527.

**PA.1a - débito automático de compromisos (Calendario / transversal), 2026-08-13**
Resuelve D1 y D2 del [ADR 052](DECISIONS/052-pagos-automaticos.md), abiertas desde julio. **Finko no registra nada sin confirmación:** lo automático es la preparación (qué venció, cuánto, de qué cuenta, con qué fecha), y al abrir, la hoja `#modal-automaticos` lo deja listo para un toque. Rechazado el estado intermedio "registrado, confírmalo": cambiaría el invariante de `S.gastos` en toda la app para ahorrar un toque. La detección no es un motor nuevo: recorre dos meses con `pendientesDePagoDelMes`, la del lote. Sin saldo la fila se bloquea y dice qué falta. SW v525 → v526.

**CFG.2c - lo fiscal pasa a un asistente tras botón en Ajustes (Configuración), 2026-08-13**
Ejecuta D1 del [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md) y **cierra la iniciativa fusionada CFG.1+CFG.2**. "Perfil fiscal y datos de renta" deja de montarse en el panel (ni plegado): el grupo "Impuestos" pasa a un botón ("Completar perfil fiscal") que abre un modal nuevo (`#modal-fiscal`) con los mismos dos formularios, mismo contrato de guardado. Reubicación de UX, sin lógica fiscal nueva: el override de "Ingresos brutos" se conserva. SW v524 → v525.

**PERF.6 - coalescer de renders reactivos por microtask (Transversal / `infra/render.js`), 2026-08-13**
Reabierta con la evidencia que la propia tarjeta exigía: el escenario nuevo del harness midió **398 ms** por una sola distribución del ingreso estando en Inicio con 10.000 gastos, no los "2-3 repintados de costo bajo" con los que se cerró en "no se hace" el 2026-08-05. Causa: `crud.js` emite un `state:change` **por mutación**, 12 en un tick. `programarRender()` los colapsa a un pintado: **398,3 → 94,5 ms** (4,2x a los 3 volúmenes). **Dedup por identidad:** agendar una flecha creada en el callback no deduplica nada. Migran los 8 listeners que pintan paneles; navegación, arranque y `renderAll` siguen síncronos. SW v523 → v524.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **CFG.3a cerrada:** el [ADR 066](DECISIONS/066-motor-unico-de-avisos.md) queda Aceptado y de esa iniciativa quedan **CFG.3b** y **CFG.3c**. **LIM.1 completa** (ADR 044 Aceptado). De PA.1 vive **PA.1b** (crédito automático del ingreso fijo, misma hoja). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. De LG.2 queda **LG.2d**; de CFG.5, **CFG.5b** y **CFG.5c**. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
