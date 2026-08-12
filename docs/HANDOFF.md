# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-12. Última tarea cerrada: ANL.1a, la lectura de las tres cards principales (Análisis).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3930/3930 verdes (18 nuevos de ANL.1a: las tres lecturas de Análisis) |
| Tests E2E | 263/263 verdes, sello escrito sobre el runtime de ANL.1a. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v36 (`config.bloqueo`, CFG.5a; default `null` = sin candado, se activa en Ajustes) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**ANL.1a - la lectura de las tres cards principales (Análisis), 2026-08-12**
Patrimonio, tendencia y categorías mostraban cifras crudas mientras el hero del score ya interpretaba la suya. `lecturaPatrimonio` / `lecturaTendencia` / `lecturaCategorias` (puras, en `logic.js`) escriben una línea derivada del dato real, impresa por `_renderLectura()` con `.analisis-lectura`. Tendencia compara contra el **promedio** de los meses con gasto, y **los meses en cero quedan fuera del promedio**: un mes sin registro no es un mes de gasto cero. Describe, no ordena, así que no esperó al ADR 044. Sin barridos nuevos: viajan dentro del bundle de PERF.2. Contraste 7,35 oscuro / 8,51 claro. R75 nueva.

**ADR 046 resuelto, ANL.1 partida en tres rebanadas (Análisis), 2026-08-12**
El inventario que el propio ADR pedía cambió la decisión: de 8 unidades visibles, 5 ya están colapsadas o ya interpretan. [ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md): **ninguna card se elimina**; titular en lenguaje corriente y término técnico como secundario; interpretar es una línea por card derivada del dato; layout cerrado en 6 bloques, el sexto reservado a logros, lo que **desbloquea LG.2d**.

**MT.6a - fundación de subcategorías de meta (Metas), 2026-08-12**
Arranca MT.6, que llevaba en "pendiente de análisis" por una delegación circular: el ADR 048 D1 remitía la estructura de dos niveles a la validación D3 del ADR 029, y esa validación fijó la taxonomía de tags pero no la forma de datos. [ADR 064](DECISIONS/064-estructura-de-dos-niveles.md) la decide: catálogo plano de hijos etiquetados con su padre, `id` estable almacenado, y `hijosDeCategoria`/`hijoPorId`/`categoriasConHijos` en `infra/taxonomia.js` con el catálogo por parámetro (sirve a subcategoría de meta, marca por categoría y entidad a producto sin conocer a ninguno). `SUBCATEGORIAS_META`: 32 filas sobre 9 categorías. **Sin UI y sin campo nuevo en la meta**, eso es MT.6b. D2 del ADR 048 declarado cumplido sin código (lo entregaron MT.4 y MC.13b). Commit `57b3cdb`.

**CFG.5a - candado de acceso local con PIN (Configuración), 2026-08-12**
Arranca CFG.5 por la rebanada que no depende de CFG.4. PIN de 4 a 8 digitos con `SHA-256` + salt por usuario en `config.bloqueo` (schema v36); gate de arranque bloqueante y **opaco** (`--fk-bg-base`) con el patron de LEG.2, y el gate legal + novedades pasan detras de el (`bloqueo:abierto`). Freno de 5 intentos en `sessionStorage`, no en memoria: recargar la pestana saltaba la espera anunciada. [ADR 063](DECISIONS/063-candado-de-acceso-local.md) fija el framing honesto (es pantalla de privacidad, **no cifra** `fk_v1`, y eso lo dice la tarjeta de Ajustes) y rechaza cifrado real, patron y biometria.

**MC.17f - deshacer una transferencia desde el ledger (Mis cuentas), 2026-08-12**
Una transferencia no se podía revertir ni editar. `_eliminarTransferencia()` (`tesoreria/acciones/transferencias.js`) revierte los deltas exactos de `calcularTransferencia()` (`monto + costoGMF` al origen, descuenta el destino) y borra el registro; `transferencia` entra a `_ACCIONES_POR_TIPO` del ledger con solo `eliminar`, y cierra el último hueco de MOV.1. Deshacer = eliminar + revertir, sin fila de reversa visible.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. De ANL.1 quedan **ANL.1b** (titulares) y **ANL.1c** (colapsable), ambas sin bloqueos; **LG.2d también quedó desbloqueada** por el ADR 046 D4. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
