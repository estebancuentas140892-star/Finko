# ADR 030 - Persistencia: diferir la reescritura, salvaguarda de cuota, IndexedDB como dirección futura

**Estado:** Aceptada por Esteban el 2026-07-06 (delegó la decisión tras el análisis de la auditoría de rendimiento).
**Fecha:** 2026-07-06
**Autores:** Esteban (decisión), Claude Opus 4.8 (análisis y diseño).
**Relación:** cierra **PERF.4** de la auditoría de rendimiento 2026-07 ([BOARD.md](../BOARD.md), tras PERF.0/PERF.1/PERF.2). Toca la **regla 3 del ADN** ([`/CLAUDE.md`](../../CLAUDE.md) sección 4: "Sin servidor, solo `localStorage`, clave `fk_v1`"): esta ADR la **reafirma**, no la cambia, y documenta la condición bajo la cual se revisaría. Base técnica en [`docs/contexto/transversal.md`](../contexto/transversal.md) y `scripts/perf/BASELINE.md`.

---

## Contexto

La auditoría de rendimiento (PERF.0) midió el costo de persistir el estado con un historial grande. Hechos verificados:

1. **`save()` está debounced 200 ms** y su costo medido es bajo: `JSON.stringify(S)` domina con ~5 ms de mediana a 10.000 gastos (hasta ~19 ms p95) en el harness. La escritura a disco real de `localStorage.setItem` en un móvil de gama media **no la mide happy-dom** (simula `localStorage` en memoria), así que ese costo queda estimado, no medido.
2. **`loadData()` se llama en un solo lugar, síncrono** ([bootstrap.js](../../modules/ui/bootstrap.js)), antes de cualquier render. Es el único punto que obligaría a volverse asíncrono si se cambiara de motor.
3. **`save()` tiene 44 llamadas, todas fire-and-forget** (nadie hace `await save()`): que la escritura sea asíncrona sería transparente para los callers.
4. **El techo de cuota de `localStorage` (~5 MB por origen) es el riesgo real a largo plazo.** Un estado de 10 años realista pesa ~1.5-3 MB; un usuario muy intenso a 15-20 años puede acercarse al muro. Ahí el fallo no es "va lento", es "no puedo guardar / pierdo datos".
5. **Antes de esta ADR, un guardado que excede la cuota moría en silencio:** `_flush()` atrapaba el error con solo un `console.error`, y el usuario perdía el cambio sin enterarse.
6. **El sembrado de los tests E2E depende de escribir la clave `fk_v1`** (101 referencias solo en `smoke.test.js`, en 11 archivos): cambiar el motor de persistencia obligaría a reescribir toda esa estrategia.

## Decisión

### D1. NO reescribir la capa de persistencia ahora

El costo de CPU medido (~5 ms debounced) no justifica el cambio de mayor riesgo del proyecto (ruta de arranque asíncrona + migración de años de datos reales + reescritura del sembrado E2E). Optimizar eso sería trabajar contra la intuición, no contra los datos, justo lo que el harness PERF.0 existe para evitar. La regla 3 del ADN (clave única `fk_v1` en `localStorage`) se mantiene tal cual.

### D2. Salvaguarda de cuota (implementada en esta tarea)

Se ataca el **único riesgo real** (perder datos al llenar la cuota) con casi cero riesgo:

- **Guardado que falla deja de ser silencioso.** `_flush()` ([core/storage.js](../../modules/core/storage.js)) marca `_falloUltimoGuardado` y emite `storage:error` cuando `setItem` es rechazado; `config/` lo anuncia (a11y assertive) y muestra un aviso persistente con CTA a "Exportar respaldo".
- **Aviso anticipado.** `evaluarCuota()`/`estadoCuota()` (puras, en `core/storage.js`) clasifican el uso contra un límite conservador (`LIMITE_LOCALSTORAGE_CHARS`, 4.5 M chars, con margen porque la contabilidad real varía por navegador): `aviso` ≥ 80 %, `critico` ≥ 95 %. Al cruzar de nivel se emite `storage:cuota` (una vez, no en cada guardado) y la sección "💾 Tus datos" de Ajustes muestra el aviso.

### D3. IndexedDB es la dirección futura, NO partir `localStorage` por clave

Cuando un disparador lo justifique (ver D4), el motor destino es **IndexedDB**, no un split de `localStorage` en varias claves. Razón: partir en `fk_v1_gastos`, `fk_v1_compromisos`... **no sube la cuota** (todas las claves comparten el mismo límite por origen), así que suma complejidad de coordinación multi-clave sin resolver el problema real. IndexedDB tiene un cupo mucho mayor (cientos de MB a GB) y escritura por registro, resolviendo cuota **y** CPU. Esta opción queda **explícitamente rechazada** para que nadie la reintente.

### D4. Disparadores para retomar la migración a IndexedDB

Se abre la tarjeta futura (sin iniciar) cuando ocurra cualquiera de:

- Jank de guardado **medido en dispositivo real** (no en happy-dom) que afecte la interacción.
- Usuarios reales acercándose a la cuota (el aviso de D2 empieza a dispararse en la práctica).
- Una feature que necesite persistencia asíncrona o mayor cupo (ej. **CFG.4** respaldo/recuperación, ya en el BOARD).

## Consecuencias

- **Positivas:** el riesgo real (pérdida de datos silenciosa) queda cubierto hoy con cambios mínimos y sin tocar el ADN; la ruta de arranque sigue síncrona y simple; la dirección futura queda documentada y acotada, sin rewrite especulativo.
- **Negativas / deuda aceptada:** el costo de `JSON.stringify(S)` completo por guardado sigue creciendo lineal con el estado total (aceptable mientras esté debounced y en el rango medido); el techo de cuota sigue existiendo, ahora con aviso pero sin eliminarlo. Ambas se resuelven solo con D4.

## Alternativas rechazadas

- **Partir `localStorage` por colección:** no resuelve la cuota (mismo límite por origen), suma complejidad. Rechazada en D3.
- **Migrar a IndexedDB ahora:** correcta como destino, pero es el cambio de mayor riesgo del proyecto y no lo justifica el costo medido. Diferida a D4.
- **No hacer nada:** deja el guardado fallando en silencio (riesgo de pérdida de datos). Rechazada: la salvaguarda de D2 es barata y de alto valor.
