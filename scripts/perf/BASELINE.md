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

---

## PERF.3 (2026-07-06): cómputo diferido del grupo colapsable de Análisis

**Cambio:** el grupo colapsable "Más detalle de tus gastos" ([analisis/view.js](../../modules/dominio/analisis/view.js)) calculaba `calcularComparacionCategorias()` (recorre el mes actual + el anterior) y `detectarPatronGastoSemanal()` (recorre 90 días) en cada `renderAnalisis()`, aunque el usuario nunca abriera el `<details>`. Se sacaron esas dos derivaciones del bundle memoizado de PERF.2 a `_calcularDetalleGastos()` (nuevo, memoizado con `['gastos']`) y se difirió su render al evento `toggle`: `renderAnalisis()` dibuja el grupo con el cuerpo vacío y lo calcula la primera vez que el usuario lo abre. Las hormigas no se difirieron (ya vienen dentro de `generarResumen()`).

| gastos | Análisis frío (PERF.2 → PERF.3) | Análisis caché (sin regresión) |
|---|---|---|
| 1.000  | 4.3 → **4.4** (ruido)        | 2.9 → 3.5 |
| 5.000  | 9.7 → **7.4** (~24 % menos)  | 4.1 → 3.7 |
| 10.000 | 16.3 → **11.1** (~31 % menos)| 4.6 → 4.4 |

**Lectura:** el ahorro (median) crece con el volumen de historial, como se espera de saltarse ~3 barridos O(gastos) por render (2 de la comparación, 1 del patrón semanal). A 1.000 gastos el efecto queda dentro del ruido de medición; a 10.000 es una baja clara de ~31 %. La ruta "caché" (re-render redundante sin cambios) no regresa: sigue plana en ~3,5-4,4 ms. Las demás columnas (Inicio, Movimientos, stringify, save) no cambian.

**Cómo se preserva el comportamiento:** con gasto este mes la comparación siempre tiene contenido (invariante `totalGastosMes > 0` ⇒ comparación no vacía), así que el grupo se muestra con el cuerpo diferido; sin gasto este mes (caso menos común) el detalle se calcula en el render para no dibujar un grupo que resultaría vacío. El escenario que mide el harness (semilla con gastos repartidos en 10 años, ~1/120 caen en el mes actual) toma la ruta diferida, que es la que baja.

Verificado: 2233/2233 unit (5 tests nuevos del grupo diferido en `tests/unit/analisis.test.js`) + 151/151 E2E en Chromium real. SW v333 → v334.

---

## PERF.7a (2026-07-07): Intl.DateTimeFormat cacheado

**Cambio:** `fechaLegible()` ([utils.js](../../modules/infra/utils.js)), `_mesAnioLabel()` ([movimientos/view.js](../../modules/dominio/movimientos/view.js)) y `fechaCorta()` ([tesoreria/views/ingresos.js](../../modules/dominio/tesoreria/views/ingresos.js)) construían un `Intl.DateTimeFormat` nuevo (vía `toLocaleDateString`) en cada llamada, o sea **una vez por ítem** de lista: 50 por lote en Movimientos, el mes entero en Gastos. Construir el formatter es la parte cara; formatear con uno ya construido es barato. Se agregó `formateadorFecha(locale, opciones)` (nuevo, en `utils.js`): cachea la instancia por firma (locale + opciones) en un `Map`, así toda la app construye cada combinación una sola vez. `format()` produce texto idéntico a `toLocaleDateString` con los mismos argumentos: cero cambio de comportamiento (test de equivalencia incluido).

| gastos | Movs 1er lote (PERF.1 → PERF.7a) |
|---|---|
| 1.000  | 24.6 ms → **8.4 ms** |
| 5.000  | 33.0 ms → **8.2 ms** |
| 10.000 | 47.6 ms → **8.2 ms** |

**Lectura:** el primer lote deja de crecer con el volumen (antes 24→48 ms, ahora **plano ~8,2 ms**). Los 50 formatters por lote eran el residuo que PERF.1 dejó documentado. Las demás columnas no cambian (Inicio frío 93.5 ms vs 97.4 previo, Análisis frío 10.5 vs 11.1: dentro del ruido; `stringify`/`save` iguales). Es una ganancia **incondicional**: toda lista con fechas la recibe, no depende de la sección activa.

Verificado: 2257/2257 unit (5 tests nuevos: `formateadorFecha` + equivalencia de `fechaLegible` en `tests/unit/utils.test.js`) + 155/155 E2E en Chromium real + `pnpm perf`. SW v336 → v337.

---

## PERF.7b (2026-07-07): fold de `hayResumen` en el bundle memoizado de resumen

**Cambio:** `renderPanelResumen()` ([resumen/view.js](../../modules/dominio/resumen/view.js)) llamaba a `hayResumen(gastos, hoyISO)` (barrido propio de `S.gastos`, sin memoizar) para decidir si mostrar el panel, y **después** llamaba a `_resumenSemanalMemo()` (memoizada, PERF.2) para el contenido. `resumenSemanal()` ya calcula `registros` (gastos en los últimos 7 días) internamente: la condición de "sin actividad" se deriva de ese campo en vez de repetir el barrido. Se llama al bundle memoizado una sola vez.

**Hallazgo de alcance (importante):** la otra mitad prevista de PERF.7b, memoizar `calcularEstadoRenta()` (Análisis, K.3), se descartó tras el análisis: depende de `S.config.datosFiscales`, que `config/index.js` **muta sin emitir `state:change`** (handler de `#form-datos-fiscales`, guarda directo + `save()` + `renderPanelConfig()`). Memoizarla contra `gastos`/`cuentas`/`inversiones` habría servido un resultado **obsoleto** tras editar "Datos de renta" y navegar a Análisis sin pasar por un `renderAll()` completo: un bug de datos, no solo una optimización perdida. Se deja sin memoizar; el arreglo correcto (emitir `state:change` en ese handler) es un cambio de comportamiento fuera del alcance de esta tarea de rendimiento.

| gastos | Inicio frío (7a → 7b) | Inicio caché (7a → 7b) |
|---|---|---|
| 1.000  | 4.3 → **8.5** (regresión, ver lectura) | 2.1 → **0.7** |
| 5.000  | 46.8 → **39.5** (~16 % menos) | 8.1 → **0.9** |
| 10.000 | 93.5 → **79.8** (~15 % menos) | 15.2 → **0.8** |

**Lectura (con la regresión reportada, no escondida):**

1. **Ruta caché: mejora uniforme y grande a todos los volúmenes**, queda **plana en ~0,7-0,9 ms**. Es la ganancia principal: `hayResumen()` era la única llamada del panel que NO pasaba por el memo, así que corría un barrido completo de `S.gastos` en **cada** render sin importar si había cache hit. Esto es lo que se paga en cada `renderAll()` redundante (ej. registrar un gasto repinta Inicio, o cualquier `state:change` de otra sección que dispare el dashboard sin que `gastos` cambiara).
2. **Ruta fría a 5.000/10.000: mejora ~15-16 %.** Antes: 1 barrido de `hayResumen` + 5 barridos de `resumenSemanal` (cuando había actividad esta semana que mostrar). Ahora: solo los 5 de `resumenSemanal`, siempre.
3. **Ruta fría a 1.000: regresión real de ~4 ms** (4.3 → 8.5), no ruido de medición (reproducida en 2 corridas). Causa: con la semilla de 10 años y solo 1.000 gastos, la ventana de "últimos 7 días" muy seguido no tiene ningún gasto (dato disperso). Antes, `hayResumen()` (1 barrido barato) devolvía `false` y el panel se ocultaba **sin llegar a llamar** a `resumenSemanal()` (5 barridos). Ahora `resumenSemanal()` se llama siempre para leer `.registros`, así que ese camino "sin actividad" pasó de pagar 1 barrido a pagar 5. Se acepta el trade porque: (a) en frío solo se paga una vez por mutación real de `gastos`, no por cada render; (b) el costo absoluto es ~4 ms, imperceptible; (c) a medida que el historial crece (el escenario que le preocupa a Esteban, años de datos), la ventana semanal casi siempre tiene actividad, así que el caso "sin resumen" se vuelve raro y el patrón se invierte a mejora clara (5.000/10.000 ya lo muestran).

**Validación:** 2261/2261 unit (4 tests nuevos de `renderPanelResumen()` en `tests/unit/resumen.test.js`: sin contenedor no revienta, oculta sin gastos en la ventana, oculta sin ningún gasto, muestra con actividad) + 155/155 E2E en Chromium real + `pnpm perf`. SW v337 → v338.

---

## PERF.7d (2026-07-07): memoizar `calcularEstadoRenta` sin necesidad de tocar `config/index.js`

**Cambio:** `_renderEstadoRenta(anio)` ([analisis/view.js](../../modules/dominio/analisis/view.js)) llamaba a `calcularEstadoRenta(S, anio)` (barrido de `patrimonioBruto` + `totalGastosAnio`) **sin memoizar**, en cada `renderAnalisis()`. Se agregó `_calcularEstadoRentaMemo`, memoizada contra `['gastos', 'cuentas', 'inversiones']` con un `extraerClave` propio que además lee `state.config?.datosFiscales?.[anio]` directamente.

**Por qué esto es seguro sin la mitad de PERF.7b que se había descartado** (emitir `state:change` desde `config/index.js`): el handler de "Datos de renta" (`#form-datos-fiscales`) siempre **reemplaza** `S.config.datosFiscales[anio]` con un objeto nuevo (`entrada = {}` en cada submit, o lo borra con `delete`), nunca lo muta en el lugar. Como `extraerClave` lee ese valor directo (no el objeto contenedor `datosFiscales`, que sí se muta en el lugar y no cambiaría de referencia), su identidad cambia en cada guardado real, y la comparación por referencia de `memoizar()` detecta el cambio sola. No hace falta tocar `config/index.js` ni sumar `'config'` a `SECCIONES_OBSERVADAS` de `analisis/index.js`: el arreglo queda contenido en `analisis/view.js`, con menos riesgo y menos superficie de cambio que lo planteado originalmente en la tarjeta.

**Prueba de la corrección (no solo del rendimiento):** se agregaron 4 tests nuevos en `tests/unit/analisis.test.js` que renderizan Análisis dos veces seguidas con `S.config.datosFiscales` editado entre medio (simulando exactamente lo que hace el handler, sin pasar por `EventBus`), y verifican que el segundo render **no sirve el resultado obsoleto**. Con una memoización ingenua (clave por defecto, sin este `extraerClave`), el test "editar datosFiscales entre dos renders refleja el valor nuevo" habría fallado mostrando el badge "Sin datos en Finko" en vez del monto nuevo.

**Medición (`pnpm perf`):** el efecto en "Análisis caché" es pequeño y está dentro del ruido de medición (3,4-4,6 ms antes → 3,4-3,9 ms ahora, a 1.000/5.000/10.000 gastos): `calcularEstadoRenta` ya era barata frente al resto del bundle memoizado de PERF.2 con los datos de la semilla de este harness (`patrimonioBruto` es chico, `totalGastosAnio` filtra por un solo año dentro de 10 de historial). El valor de esta tarea es principalmente de **corrección de cobertura de caché** (cierra el único barrido sin memoizar que quedaba en el render de Análisis) más que de velocidad medible en este escenario sintético; en un caso real con más cuentas/inversiones o un año con más actividad, el ahorro sería mayor.

**Validación:** 2265/2265 unit (4 tests nuevos en `tests/unit/analisis.test.js`) + 155/155 E2E en Chromium real + `pnpm perf`. SW v338 → v339.

---

## PERF.7c (2026-08-01): warm-up en idle del bundle de Análisis y `movimientosCompletos`

**Cambio:** `bootstrap.js`, tras `renderAll()`, agenda un `requestIdleCallback` (fallback `setTimeout` para navegadores sin soporte, ej. Safari) que llama a dos funciones nuevas: `precalentarAnalisis()` ([analisis/view.js](../../modules/dominio/analisis/view.js)) y `precalentarMovimientos()` ([movimientos/view.js](../../modules/dominio/movimientos/view.js)). Ambas solo invocan los memos ya existentes de PERF.2 (`_calcularDatosAnalisisMemo`, `_movimientosCompletosMemo`) con los mismos argumentos que sus respectivos renders reales; no tocan el DOM. Cierra **PERF.7** completo.

**Por qué no hacía falta infra nueva:** los memos de PERF.2/PERF.7a-d ya cachean 1 entrada por firma de argumentos. Llamar a la función memoizada una vez en idle, con los mismos argumentos que el render real usará después, deja la caché tibia sin duplicar lógica: si el usuario navega a Análisis o a Movimientos antes de que el idle callback corra, el render real paga el cómputo frío una sola vez igual (no hay condición de carrera dañina, solo se pierde el warm-up de esa navegación puntual).

**Medición:** no aplica una fila nueva a la tabla de `bench.perf.js`: el harness mide llamadas directas a los renders (sin pasar por `bootstrap.js`), así que no ejercita el `requestIdleCallback`. El beneficio es de latencia percibida en la primera navegación real (evita el costo frío ya documentado en PERF.2/PERF.7a: hasta ~11-48 ms a 10.000 gastos antes de esas optimizaciones), no un número nuevo de este harness.

**Validación:** 3583/3583 unit (6 tests nuevos: 3 en `tests/unit/analisis.test.js` para `precalentarAnalisis()`, 3 en `tests/unit/movimientos.test.js` para `precalentarMovimientos()`; cubren no-throw sin contenedor, que no tocan el DOM, y que precalentar antes de renderizar no cambia el resultado) + 253/253 E2E en Chromium real + `pnpm perf` sin regresión. SW v467 → v470 (bump compartido con DV.2b/DV.2c, en curso en paralelo).
