# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-18. Última tarea cerrada: DSK.2, Calendario como mapa del mes en escritorio (sus tres rebanadas).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4375/4381 (2026-08-18). Los 6 rojos son **BUG-028**, ajeno y verificado contra HEAD |
| Tests E2E | 277/277 verdes, sello de DSK.2 (2026-08-18). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**DSK.2 - Calendario como mapa del mes en escritorio (Calendario), 2026-08-18**
Única sección sin reglas desde 1024px: móvil estirado a 1376, celda de 72 x 72 en columna de 188 y panel del día bajo el pliegue ([ADR 071](DECISIONS/071-calendario-como-mapa-del-mes-en-escritorio.md)). Ahora mes a `span 8` y día a `span 4` en columna fija que desplaza su lista; la celda dice qué y cuánto (agregado desde 3 pagos) y entrar sin eventos hoy abre el próximo día con fecha. **Móvil no cambia.** Acota el [ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md): vuelve la entrada al lote, no el flujo. 31 tests, SW v550.

**Ficha 05 de la auditoría móvil - "Por pagar" recupera su dominio (Por pagar + Calendario), 2026-08-18**
`compromisos` tiene tres tipos y solo administraba dos: el alta de gasto fijo y el pago en lote vivían en Calendario. Los dos se mudan (`views/lote.js` nuevo), muere el evento `lote:abrir` y un "+ Agregar" con chooser de tres chips cubre los tres tipos. **Dos hallazgos de verificar en la app**: el lote contaba un vencido más que la pastilla y que Inicio (dos motores, unificados contra `vencidosSinPagar`), y el chip afirmaba "Vence en 21 días" sobre una cuota ya vencida. El Calendario vuelve a tablero de consulta. 20 tests nuevos, 24 movidos. SW v544 → v545.

**INT.1g - carril derecho de escritorio, iniciativa INT.1 completa (Transversal), 2026-08-17**
El código ya tenía la rebanada desde el 2026-08-12 (commit `57b3cdb`, sesión de MT.6a que nunca la nombró); el tablero seguía diciendo "diferida". Cero cambios de código: verificado en navegador (carril con el compromiso real desde 1.680px, copia original vuelve debajo). Sin test propio, hueco de cobertura anotado. Cierra las ocho rebanadas de INT.1.

**Ficha 04 de la auditoría móvil - circulación dentro del bloque Ahorro (Ahorro), 2026-08-15**
La portada-resumen **se confirma**: es la única pantalla donde los cuatro términos conviven. Lo roto era la circulación: `ui/bloque-ahorro.js` baja a las cuatro hijas la fila de chips de la casa (de Metas a Reservas: de 2 toques y un scroll a 1), y tres textos que citaban "la pestaña Fondo (arriba)" pasan a enlaces reales (**R85**). 14 tests nuevos. SW v542 → v543.

**Ficha 03 de la auditoría móvil - techo y puerta para "Más" (Navegación), 2026-08-15**
La hoja ya estaba ordenada; le faltaba resistencia a volver a llenarse. **R83**: no scrollea, techo de 444 px (mide 361), con compuerta E2E. **R84**: cuatro condiciones de admisión. Las seis entradas heredadas pasan; **Logros las falla y se queda en Ajustes**. H8 cerrado sin cambio. SW v541 → v542.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 05 ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)); sigue la 06. El orden lo fijó Esteban y no se altera. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
