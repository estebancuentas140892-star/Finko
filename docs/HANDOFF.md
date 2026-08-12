# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-12. Última tarea cerrada: ADR 045 resuelto, LIM.1 partida en tres rebanadas (Límites de gasto).

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

**ADR 045 resuelto, LIM.1 partida en tres rebanadas (Límites de gasto), 2026-08-12**
El inventario del código descartó dos de las cuatro alternativas: el piso de Necesidades del ADR 013 **ya descuenta** lo comprometido (nada que restar, ninguna ventana que decidir) y sumar saldos cuenta dos veces el mismo dinero. [ADR 045](DECISIONS/045-base-de-calculo-del-disponible-para-limites.md): la base sigue siendo el ingreso recurrente, la aritmética del asignado **no cambia**, y el dinero extraordinario del mes **se informa y no se reparte** (una prima sumada al ingreso duplicaría el permiso de gasto discrecional sin mover el ahorro). D6 desbloquea el ADR 044. Rebanadas LIM.1a, LIM.1b y LIM.1c (esta última sigue esperando el 044).

**ANL.1a - la lectura de las tres cards principales (Análisis), 2026-08-12**
Patrimonio, tendencia y categorías mostraban cifras crudas mientras el hero del score ya interpretaba la suya. `lecturaPatrimonio` / `lecturaTendencia` / `lecturaCategorias` (puras, en `logic.js`) escriben una línea derivada del dato real, impresa por `_renderLectura()` con `.analisis-lectura`. Tendencia compara contra el **promedio** de los meses con gasto, y **los meses en cero quedan fuera del promedio**: un mes sin registro no es un mes de gasto cero. Describe, no ordena, así que no esperó al ADR 044. Sin barridos nuevos: viajan dentro del bundle de PERF.2. Contraste 7,35 oscuro / 8,51 claro. R75 nueva.

**ADR 046 resuelto, ANL.1 partida en tres rebanadas (Análisis), 2026-08-12**
De 8 unidades visibles, 5 ya interpretan o están colapsadas. [ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md): **ninguna card se elimina**; titular en lenguaje corriente con el término técnico como secundario; interpretar es una línea por card derivada del dato; layout cerrado en 6 bloques, lo que **desbloquea LG.2d**.

**MT.6a - fundación de subcategorías de meta (Metas), 2026-08-12**
Arranca MT.6, que llevaba en "pendiente de análisis" por una delegación circular: el ADR 048 D1 remitía la estructura de dos niveles a la validación D3 del ADR 029, y esa validación fijó la taxonomía de tags pero no la forma de datos. [ADR 064](DECISIONS/064-estructura-de-dos-niveles.md) la decide: catálogo plano de hijos etiquetados con su padre, `id` estable almacenado, y `hijosDeCategoria`/`hijoPorId`/`categoriasConHijos` en `infra/taxonomia.js` con el catálogo por parámetro. `SUBCATEGORIAS_META`: 32 filas sobre 9 categorías. **Sin UI y sin campo nuevo en la meta**, eso es MT.6b. Commit `57b3cdb`.

**CFG.5a - candado de acceso local con PIN (Configuración), 2026-08-12**
Arranca CFG.5 por la rebanada que no depende de CFG.4. PIN de 4 a 8 digitos con `SHA-256` + salt por usuario en `config.bloqueo` (schema v36); gate de arranque bloqueante y **opaco** (`--fk-bg-base`) con el patron de LEG.2, y el gate legal + novedades pasan detras de el (`bloqueo:abierto`). Freno de 5 intentos en `sessionStorage`, no en memoria: recargar la pestana saltaba la espera anunciada. [ADR 063](DECISIONS/063-candado-de-acceso-local.md) fija el framing honesto (pantalla de privacidad, **no cifra** `fk_v1`) y rechaza cifrado real, patron y biometria.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. De LIM.1 quedan **LIM.1a** y **LIM.1b** (listas) y **LIM.1c** (espera el ADR 044). De ANL.1 quedan **ANL.1b** y **ANL.1c**, sin bloqueos; **LG.2d desbloqueada** por el ADR 046 D4. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. De PE.6 solo queda **PE.6d** (estados visuales) y está bloqueada hasta que IV.2 esté en producción. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
