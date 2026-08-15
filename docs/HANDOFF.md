# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-15. Última tarea cerrada: ficha 04 de la auditoría móvil, circulación dentro del bloque Ahorro.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4334/4340 (2026-08-15). Los 6 rojos son **BUG-028**, ajeno y verificado con `git stash` |
| Tests E2E | 275/275 verdes, sello `36703dee0019` (2026-08-15, ficha 04). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**Ficha 04 de la auditoría móvil - circulación dentro del bloque Ahorro (Ahorro), 2026-08-15**
La portada-resumen **se confirma**: es la única pantalla donde los cuatro términos conviven y desde donde se aporta a una meta concreta sin entrar. Lo roto era otra cosa. `ui/bloque-ahorro.js` baja a las cuatro hijas la fila de chips de la casa (de Metas a Reservas: de 2 toques y un scroll a 1); tres textos que citaban "la pestaña Fondo (arriba)" pasan a enlaces reales (**R85**); y la cabecera gana media línea mientras el fondo no esté activo. 14 tests nuevos. SW v542 → v543.

**Ficha 03 de la auditoría móvil - techo y puerta para "Más" (Navegación), 2026-08-15**
La hoja ya estaba ordenada; le faltaba resistencia a volver a llenarse. **R83**: no scrollea, techo de 444 px (mide 361), con compuerta E2E. **R84**: cuatro condiciones de admisión. Las seis entradas heredadas pasan; **Logros las falla y se queda en Ajustes**. H8 cerrado sin cambio. SW v541 → v542.

**Ficha 02 de la auditoría móvil - Inicio apunta al mapa nuevo (Inicio), 2026-08-15**
Inicio conserva forma, orden, hero y estado vacío; cambia a dónde apunta ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)). Las salidas de "Pendientes del mes" van a la lente "Por pagar" en vez de a Calendario; los accesos rápidos se recalculan con un criterio nuevo (**un atajo solo se gana Inicio si ahorra un toque**) y quedan en Mis cuentas · Por pagar · Me deben; el resumen semanal declara que incluye fijos y cuotas; "Ver todo" solo aparece con más historial del que cabe. El lote sigue en Agenda: lo hereda la ficha 05. SW v540 → v541.

**Ficha 01 de la auditoría móvil - el bloque Gastos en la barra (Navegación), 2026-08-15**
"Gastos" pasa de sección a bloque con tres lentes (Lo que gastaste, Por pagar, Límites), servidas por la franja que inyecta `ui/bloque-gastos.js`: **capa de navegación, no contenedor de estado** (cero hashes nuevos). Cada pestaña lleva su estado encima. El botón "Más" deja de cambiar de nombre (H5) y la hoja pasa a dos rótulos que sí excluyen: Consultar / Tu dinero. 13 tests nuevos. SW v539 → v540.

**CFG.4d - cláusula de cambio de modelo cerrada, iniciativa CFG.4 completa (Configuración), 2026-08-15**
Cuarta y última rebanada ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) D1). Los cinco documentos de `docs/legal/` con la cláusula "cambio de modelo (CFG.4)" pasan de "si esto llegara a pasar" a "se decidió que no pasa", conservando qué cambiaría si se reabriera. Cambio menor en `historial-de-cambios.md`: no pide re-aceptación, el fondo no cambia. Sin runtime, sin tests. **Cierra CFG.4 completa**: CFG.4a-d, las cuatro el mismo día.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 04 ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)); sigue la 05 (Por pagar). El orden lo fijó Esteban y no se altera. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
