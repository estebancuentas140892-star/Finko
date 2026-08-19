# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-19. Última tarea cerrada: DSK.10b, la navegación de escritorio deja de plegarse y se lee entera.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4411/4417 (2026-08-19). Los 6 rojos son **BUG-028**, ajeno |
| Tests E2E | 281/281 verdes, sello de DSK.10b (2026-08-19). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v43 (`config.respaldoCifrado`, CFG.4c; migración no-op) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **3**: BUG-025 (impacto en el uso diario), BUG-027 (documental) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; ya son 6 tests rojos y crece con el calendario) |

---

## 2. Últimas 5 tareas cerradas

**DSK.10 (a y b de 3) - El armazón de escritorio (todas las secciones), 2026-08-19**
Las nueve auditorías de sección citaban D1, D2 y D3 como aprobadas y ninguna estaba implementada ([ADR 079](DECISIONS/079-armazon-de-escritorio-una-identidad-un-primario-una-navegacion.md)). Desde 1680px la sección se nombra una vez (el `h1` sigue siendo el nombre accesible), el botón lleno es el de la pantalla y no "Registrar", y el plegado de la barra se retira: daba 0px de contenido. La navegación pasa a cuatro grupos con nombre y las 4 hijas de Ahorro se ven siempre (184px libres a 1920). Falta **DSK.10c**: una entrada a Ajustes y movimiento de puntero fino. SW v567.

**DSK.9 - Análisis en dos filas de dos (Análisis), 2026-08-18**
Cuatro tarjetas apiladas: 1,7 pliegues y 2 de 6 bloques visibles ([ADR 078](DECISIONS/078-analisis-en-dos-filas-de-dos.md)). Desde 1440px van emparejadas por pregunta (score y patrimonio; tendencia y categorías), a 676 cada una, y el panel baja a 1676. El viewBox de la sparkline pasa a seguir al ancho al que se pinta: de **3,73:1 de deformación a 1:1**. SW v565.

**DSK.8 - Límites de gasto: los tres grupos a la vista (Límites), 2026-08-18**
Una tarjeta medía 5,7 veces sus hermanas y sus sobres no entraban en la primera pantalla ([ADR 077](DECISIONS/077-limites-de-gasto-tres-grupos-a-la-vista.md)). Desde 1440px: Necesidades y Ahorro a `span 5`, Estilo de vida a `span 7` con sus topes dentro (el ADR 019 no se toca) y sobres a dos columnas. El sobre excedido recupera AA (4,24 y 4,09 a 5,83:1) y queda un solo "Nuevo límite". SW v563.

**DSK.7 - Movimientos: un libro mayor con sus filtros al lado (Movimientos), 2026-08-18**
Los filtros solo servían al principio: el ledger carga en lotes de 50 que se disparan solos ([ADR 076](DECISIONS/076-movimientos-libro-mayor-con-sus-filtros-al-lado.md)). Desde 1440px el ledger va a `span 8` y los filtros a `span 4` pegajosos; las fechas pasan de 634 a 201px y el "Volver" se oculta, como INT.1b ya hacía en Ahorro. En todos los anchos la columna de montos deja de estar dentada. SW v561.

**DSK.6 - Mis cuentas: sus dos trabajos a la vista (Mis cuentas), 2026-08-18**
La tarjeta de distribución, destino del aviso "Tienes $X sin distribuir" de Inicio, nacía más de un pliegue por debajo: 0px visibles ([ADR 075](DECISIONS/075-mis-cuentas-dos-trabajos-a-la-vista.md)). Desde 1440px las cuentas van a `span 7` y las fuentes con su reparto a `span 5` (medido: 793 y 559, distribución en y=985). En todos los anchos las tarjetas se separan 12px y el rótulo de tarjetas deja de ser invisible: un cupo no es un saldo. SW v559.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En proceso:** **auditoría UX/UI móvil de Claude Design, 25 entregas**. Cerradas 01 a 05 ([ADR 069](DECISIONS/069-bloque-gastos-en-la-barra-movil.md)); sigue la 06. El orden lo fijó Esteban y no se altera. **CFG.4 completa** (sus cuatro rebanadas, 2026-08-15, [ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) Aceptado). **CFG.3 completa** (sus tres rebanadas, [ADR 066](DECISIONS/066-motor-unico-de-avisos.md)). **CFG.5 completa** (CFG.5a, CFG.5b, CFG.5c). **CFG.6 completa** (inventario sin hallazgos nuevos). **LIM.1 completa** (ADR 044 Aceptado). **PA.1 completa** (PA.1a y PA.1b; queda PA.1c opcional, sin tarjeta). **MT.6**, **PE.6**, **ANL.1**, **AH.7**, **CFG.1+CFG.2**, **CAT** y **GAS.2** completas. **LG.2 completa**. La migración a IndexedDB **ya no es tarjeta** ([ADR 068](DECISIONS/068-perf5-sale-del-tablero-disparadores-verificables.md), fuente única); lo que salió a la luz con ese ADR ya cerró completo: **PERF.9** (2026-08-14) y **PERF.10** (PERF.10a+PERF.10b, 2026-08-14). La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
