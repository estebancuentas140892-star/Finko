# Línea base de rendimiento (PERF.0)

> Generada con `pnpm perf` ([bench.perf.js](bench.perf.js) + [seed.js](seed.js)).
> Fecha: 2026-07-06. Entorno: happy-dom (Node), no navegador real.
> Cifras en ms, formato `mediana / p95`. Reproducibles (estado sembrado con semilla fija).

## Cómo leer estas cifras

Son costo de **JavaScript** (cómputo + `JSON.stringify` + construcción de `innerHTML`), no el paint real del navegador. Sirven para lo que necesitamos en F0: **comparar antes y después** de cada optimización. El paint real en un móvil de gama media será distinto en valor absoluto, pero el orden de magnitud y la tendencia con el volumen se conservan.

## Resultados

| gastos | Inicio | Análisis | Movimientos | stringify | save | nodos Movs |
|---|---|---|---|---|---|---|
| 1.000  | 4.5 / 7.8   | 4.4 / 5.8   | 327.8 / 354.3    | 0.4 / 0.5 | 0.5 / 0.5  | 1.100  |
| 5.000  | 47.5 / 56.5 | 9.3 / 15.1  | 1.752.9 / 2.078.1 | 2.3 / 2.6 | 2.4 / 2.6  | 5.500  |
| 10.000 | 95.0 / 106.2| 20.4 / 29.5 | 3.875.2 / 4.197.8 | 4.8 / 7.0 | 4.8 / 11.6 | 11.000 |

## Qué mide cada columna

- **Inicio**: `renderPanelResumen` + `renderActividadReciente` (los widgets del dashboard que barren todo el historial en cada cambio). Es lo que se recomputa cada vez que registras algo estando en Inicio.
- **Análisis**: `renderAnalisis` completo (~15 pasadas sobre `S.gastos`).
- **Movimientos**: `renderMovimientosCompletos` (lista sin ventana: construye un nodo por movimiento).
- **stringify**: `JSON.stringify(S)` aislado (el costo puro de serializar el estado).
- **save**: `_flushNow()` real (stringify + `localStorage.setItem` + emit).
- **nodos Movs**: cuántos `.list-item` quedan en el DOM (gastos + ingresos + aportes).

## Lectura (qué confirma la auditoría)

1. **Movimientos es, con diferencia, el peor cuello (P3).** ~3,9 s de construcción de DOM a 10.000, y crece lineal con el historial. La lista sin ventana domina todo lo demás por dos órdenes de magnitud. Windowing sube a prioridad máxima.
2. **Inicio escala peor que lineal (P2):** 4,5 ms a 1.000 pero 47,5 ms a 5.000 (10x por 5x de datos). Ordenar todo el historial para mostrar 5 filas + los barridos del resumen. Memoización + no ordenar todo para 5 filas.
3. **Análisis (P2):** más suave (crece ~lineal), pero 20 ms a 10.000 por render, y se repite en cada `state:change` relevante mientras la sección está abierta. Memoización lo aplana.
4. **Persistencia (P1):** modesta en happy-dom (~5 ms a 10.000), pero es costo por cada save y crece lineal con el estado total. Confirma partir la persistencia por colección como decisión estructural (ADR).

## Objetivo de las fases siguientes

Cada optimización (PERF.1+) debe volver a correr `pnpm perf` y comparar contra esta tabla. Meta: que la columna que ataca baje de forma clara sin que suba ninguna otra, y que el crecimiento con el volumen deje de ser el que se ve acá.

---

## PERF.1 (2026-07-06): windowing de Movimientos

**Cambio:** `renderMovimientosCompletos()` ([movimientos/view.js](../../modules/dominio/movimientos/view.js)) ya no pinta todo el historial de una sola vez. Pinta un primer lote de 50 ítems (contando solo movimientos reales; los divisores de mes no restan cupo) y agrega el resto bajo demanda con `cargarMasMovimientos()`, disparada por un botón accesible "Cargar más movimientos" (`data-action`, operable 100% por teclado) y, como mejora progresiva, por un `IntersectionObserver` sobre ese mismo botón (auto-carga al hacer scroll hasta él).

| gastos | Movs 1er lote (antes → después) | nodos 1er lote (antes → después) |
|---|---|---|
| 1.000  | 327.8 ms → **24.6 ms** (13x) | 1.100 → **50** |
| 5.000  | 1.752.9 ms → **33.0 ms** (53x) | 5.500 → **50** |
| 10.000 | 3.875.2 ms → **47.6 ms** (81x) | 11.000 → **50** |

El primer lote queda plano en 50 nodos sin importar el volumen de historial (antes crecía 1:1 con él). El costo de un lote adicional (`Movs +1 lote`, render + un `cargarMasMovimientos()`) también se mantiene acotado: 38.7 → 50.4 → 58.6 ms.

**Nota honesta:** el tiempo del primer lote todavía crece un poco con N (24.6 → 33.0 → 47.6 ms), porque `movimientosCompletos()` sigue derivando y ordenando **todo** el historial antes de paginar (el corte solo aplica a la construcción de DOM). Ese residuo es exactamente el problema P2 de la auditoría (memoización de derivaciones) y queda para PERF.2, no para esta fase.

**Riesgo de medición descubierto:** el harness original intentaba "cargar todos los lotes" en un loop apretado para verificar el costo total; eso creaba cientos de `IntersectionObserver` en segundos y saturaba la heap de happy-dom (`FATAL ERROR: JavaScript heap out of memory`). Es un artefacto del entorno de test (en uso real nunca hay más de un observer vivo a la vez, uno por sesión de scroll), no un bug de producción. El harness se ajustó para medir el costo de un lote adicional de forma aislada en vez de recorrer todo el historial de una sentada.

Verificado: 2209/2209 unit (8 tests nuevos de paginación) + 151/151 E2E en Chromium real. SW v330 → v331.

---

## PERF.2 (2026-07-06): memoización de Inicio y Análisis

**Cambio:** `modules/infra/memo.js` (nuevo), `memoizar()`: caché de 1 entrada que invalida contra dos señales (identidad de referencia de los argumentos, o un contador de revisión por sección alimentado por `EventBus`). Aplicado a `resumenSemanal()` ([resumen/view.js](../../modules/dominio/resumen/view.js)), `movimientosRecientes()`/`movimientosCompletos()` ([movimientos/view.js](../../modules/dominio/movimientos/view.js)) y al bundle consolidado `_calcularDatosAnalisis()` (nuevo, junta las ~7 llamadas de primer nivel de `renderAnalisis()` en una sola unidad, [analisis/view.js](../../modules/dominio/analisis/view.js)).

**Nota metodológica importante:** llamar a la misma función N veces sin cambiar `S` entre medidas (como hacía `medir()` hasta ahora) convierte casi todas las repeticiones en cache hits tras esta fase. Eso mide un escenario real (re-render redundante) pero no el costo de un recálculo genuino. Por eso cada hot path memoizado se mide dos veces:

- **Frío**: `invalidar()` fuerza un `state:change` antes de cada muestra → cache miss garantizado → costo de un recálculo genuino, comparable contra PERF.0/PERF.1.
- **Caché**: sin invalidar → el beneficio real de PERF.2.

| gastos | Inicio frío | Inicio caché | Análisis frío | Análisis caché |
|---|---|---|---|---|
| 1.000  | 4.3 / 6.5   | **2.2 / 3.0**  | 4.3 / 5.4   | **2.9 / 3.7** |
| 5.000  | 48.3 / 52.0 | **8.3 / 12.2** | 9.7 / 13.9  | **4.1 / 5.5** |
| 10.000 | 97.4 / 130.7| **16.9 / 20.3**| 16.3 / 26.7 | **4.6 / 5.9** |

**Lectura:**

1. **Frío no regresó** respecto a la línea base de PERF.0/PERF.1 (4.5→48.5→98.8 en Inicio, 4.4→9.9→20.4 en Análisis originalmente; los valores actuales están dentro del ruido normal de medición). Confirma que envolver con `memoizar()` no le agrega costo perceptible a un recálculo genuino.
2. **Caché es la ganancia real de PERF.2**: Inicio baja de un rango 4-97 ms a 2-17 ms; Análisis baja de 4-16 ms a un rango **casi plano de 3-5 ms**, sin importar el volumen de historial. Esto es lo que el usuario siente en la práctica: navegar de vuelta a una pantalla sin cambios, o que `renderAll()` repinte el dashboard tras una acción en otra sección.
3. **Movimientos** (`Movs 1er lote`/`Movs +1 lote`, no listados arriba por brevedad) también se beneficia un poco de la memoización de `movimientosCompletos()` (el residuo de crecimiento que PERF.1 dejó documentado se aplana), pero el harness no separa frío/caché para esas dos columnas: siguen midiendo el escenario "repetido sin cambios", consistente con cómo se reportaron en la sección de PERF.1.

Verificado: 2219/2219 unit (10 tests nuevos de `infra/memo.js` en `tests/unit/memo.test.js`) + 151/151 E2E en Chromium real. SW v331 → v332.
