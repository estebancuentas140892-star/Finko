# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-18. Última tarea cerrada: DSK.7, Movimientos: un libro mayor con sus filtros al lado.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4386/4392 (2026-08-18). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 278/278 verdes, sello de DSK.7 (2026-08-18). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**DSK.7 - Movimientos: un libro mayor con sus filtros al lado (Movimientos), 2026-08-18**
Los filtros solo servían al principio: el ledger carga en lotes de 50 que se disparan solos ([ADR 076](DECISIONS/076-movimientos-libro-mayor-con-sus-filtros-al-lado.md)). Desde 1440px el ledger va a `span 8` y los filtros a `span 4` pegajosos (con 900px de desplazamiento: filtros en y=24, mes en y=0); las fechas pasan de 634 a 201px y el "Volver" se oculta, como INT.1b ya hacía en Ahorro. En todos los anchos: la columna de montos deja de estar dentada. SW v561.

**DSK.6 - Mis cuentas: sus dos trabajos a la vista (Mis cuentas), 2026-08-18**
La tarjeta de distribución, destino del aviso "Tienes $X sin distribuir" de Inicio, nacía más de un pliegue por debajo: 0px visibles ([ADR 075](DECISIONS/075-mis-cuentas-dos-trabajos-a-la-vista.md)). Desde 1440px las cuentas van a `span 7` y las fuentes con su reparto a `span 5` (medido: 793 y 559, distribución en y=985). En todos los anchos: las tarjetas de cuenta se separan 12px (se tocaban) y los botones de ingreso pasan a secundarios diciendo la acción. El rótulo de tarjetas deja de ser invisible: un cupo no es un saldo. SW v559.

**DSK.5 - Me deben adopta la anatomía de Deudas (Me deben), 2026-08-18**
Era la única de la familia sin componente propio de tarjeta: usaba `.list-item`, cuyo reemplazo ya estaba escrito para la sección hermana ([ADR 074](DECISIONS/074-me-deben-adopta-la-anatomia-de-deudas.md)). Desde 1280px la lista va 2-up con alturas igualadas por fila; en todos los anchos, notas en chips, barra topada a 120px, corte "Ya te pagaron" y "Nuevo préstamo" en los dos botones. SW v557.

**DSK.4 - Deudas en escritorio: la estrategia se queda a la vista (Por pagar), 2026-08-18**
Elegir Avalancha reordenaba la lista 1057px más abajo, fuera de la pantalla ([ADR 073](DECISIONS/073-deudas-inventario-con-su-herramienta-al-lado.md)). Desde 1440px la lista va a `span 8` y la estrategia a `span 4` pegajosa, con tope de alto contra el viewport en `dvh`: primera regla del proyecto que depende del alto de la ventana. La tarjeta baja a dos renglones y "Abonar" pasa de 1246 a 128px. SW v554.

**DSK.2 - Calendario como mapa del mes en escritorio (Calendario), 2026-08-18**
Única sección sin reglas desde 1024px: celda de 72 x 72 en columna de 188 y panel del día bajo el pliegue ([ADR 071](DECISIONS/071-calendario-como-mapa-del-mes-en-escritorio.md)). Mes a `span 8`, día a `span 4` que desplaza su lista; la celda dice qué y cuánto, y entrar sin eventos hoy abre el próximo día. SW v550.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 05 ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)); sigue la 06. El orden lo fijó Esteban y no se altera. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
