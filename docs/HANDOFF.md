# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-18. Última tarea cerrada: DSK.5, Me deben adopta la anatomía de Deudas.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4386/4392 (2026-08-18). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 278/278 verdes, sello de DSK.5 (2026-08-18). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**DSK.5 - Me deben adopta la anatomía de Deudas (Me deben), 2026-08-18**
Era la única de la familia sin componente propio de tarjeta: usaba `.list-item`, cuyo reemplazo ya estaba escrito para la sección hermana ([ADR 074](DECISIONS/074-me-deben-adopta-la-anatomia-de-deudas.md)). Desde 1280px la lista va 2-up (tarjetas de 680 en vez de 1376, alturas igualadas por fila) y el resumen pasa a banda. En todos los anchos: notas en chips, barra topada a 120px con su porcentaje, corte "Ya te pagaron" con borde discontinuo en las cerradas y "Nuevo préstamo" en los dos botones. SW v557.

**DSK.4 - Deudas en escritorio: la estrategia se queda a la vista (Por pagar), 2026-08-18**
Elegir Avalancha reordenaba la lista 1057px más abajo, fuera de la pantalla, y ninguna deuda entraba en el pliegue ([ADR 073](DECISIONS/073-deudas-inventario-con-su-herramienta-al-lado.md)). Desde 1440px la lista va a `span 8` y la estrategia a `span 4` **pegajosa**: desplazada 700px, selector en y=55 y primer badge en y=207. Su tope de alto va contra el viewport en `dvh`: primera regla del proyecto que depende del alto de la ventana. La tarjeta baja a dos renglones y "Abonar" pasa de 1246 a 128px. SW v554.

**DSK.3 - Gastos en escritorio (Gastos), 2026-08-18**
Desde 1680px el hero deja de centrar el total en 1296px de vacío y pasa a banda, con enlace a Análisis ([ADR 072](DECISIONS/072-gastos-cabecera-de-banda-y-fila-con-cuenta.md)); el total del día cae sobre la columna que suma, y la fila ya no se levanta ni entra en cascada. En **todos** los anchos: la fila abre su subtítulo con la cuenta, el dato que ya tenía y no mostraba. Sin lógica nueva. SW v552.

**DSK.2 - Calendario como mapa del mes en escritorio (Calendario), 2026-08-18**
Única sección sin reglas desde 1024px: móvil estirado a 1376, celda de 72 x 72 en columna de 188 y panel del día bajo el pliegue ([ADR 071](DECISIONS/071-calendario-como-mapa-del-mes-en-escritorio.md)). Ahora mes a `span 8` y día a `span 4` que desplaza su lista; la celda dice qué y cuánto (agregado desde 3 pagos) y entrar sin eventos hoy abre el próximo día. **Móvil no cambia.** Acota el [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md): vuelve la entrada al lote, no el flujo. 31 tests, SW v550.

**INT.1g - carril derecho de escritorio, iniciativa INT.1 completa (Transversal), 2026-08-17**
El código ya tenía la rebanada desde el 2026-08-12 y el tablero seguía diciendo "diferida". Cero cambios de código: verificado en navegador. Sin test propio, hueco de cobertura anotado. Cierra las ocho rebanadas de INT.1.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 05 ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)); sigue la 06. El orden lo fijó Esteban y no se altera. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
