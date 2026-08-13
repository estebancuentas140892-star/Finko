/**
 * scripts/perf/bench.perf.js - harness de medición de rendimiento (PERF.0).
 *
 * Mide, sobre un estado grande y realista, el costo en milisegundos de los hot
 * paths que la auditoría marcó como candidatos a optimizar:
 *   - Inicio: los widgets que barren todo el historial en cada cambio
 *     (resumen semanal + actividad reciente).
 *   - Análisis: ~15 pasadas sobre S.gastos por render.
 *   - Movimientos: primer lote (PERF.1: paginado, ya no todo el historial de
 *     una sola vez) + el costo de cargar un lote adicional (debe mantenerse
 *     plano con el tamaño del historial, no crecer con él).
 *   - Persistencia: JSON.stringify(S) aislado + el save() real (_flushNow).
 *   - Arranque (PERF.8): loadData() real (JSON.parse + migraciones) sobre el
 *     payload serializado, la otra mitad de la ruta de arranque que crece
 *     lineal con el estado y que el D4 del ADR 030 exige medir.
 *
 * No es un test de aserción de negocio: es una MEDICIÓN. Corre fuera de la
 * suite normal (`pnpm test` no lo toca) vía su propia config:
 *
 *   pnpm perf
 *
 * Las cifras son de happy-dom (Node), así que reflejan el costo de JavaScript
 * (cómputo + stringify + construcción de innerHTML), no el paint real del
 * navegador. Para el objetivo de F0 (comparar antes/después de cada optimización)
 * eso es exactamente lo que importa y es estable entre corridas.
 *
 * Nota sobre `cargarMasMovimientos()`: cada lote crea un `IntersectionObserver`
 * (se descarta el anterior). En uso real nunca hay más de uno vivo a la vez.
 * Este harness NO recorre cientos de lotes en un loop apretado (se probó y
 * satura la heap de happy-dom, un artefacto del entorno de test, no de la
 * app): mide el costo de un lote adicional de forma aislada, que es lo que
 * de verdad importa para PERF.1 (que el costo por lote no dependa de N).
 *
 * Nota sobre `medir()` y PERF.2 (memoización, `infra/memo.js`): llamar a la
 * misma función N veces sin tocar `S` entre medidas convierte casi todas las
 * repeticiones en cache hits del propio harness, lo cual mide un escenario
 * real (re-render redundante, ej. `renderAll()` repintando una pantalla sin
 * cambios) pero NO el costo de un recálculo genuino. Por eso cada hot path
 * memoizado se mide dos veces: "frío" (`invalidar` fuerza un `state:change`
 * antes de cada muestra, cache miss garantizado) y "caché" (sin invalidar,
 * el beneficio real de PERF.2). Comparar contra la línea base de PERF.0/PERF.1
 * es válido solo contra la columna "frío".
 */

import { describe, it, expect } from 'vitest';
import { S, EventBus } from '../../modules/core/state.js';
import { _flushNow, loadData, STORAGE_KEY } from '../../modules/core/storage.js';
import { renderPanelResumen } from '../../modules/dominio/resumen/view.js';
import { renderActividadReciente, renderMovimientosCompletos, cargarMasMovimientos } from '../../modules/dominio/movimientos/view.js';
import { movimientosCompletos } from '../../modules/dominio/movimientos/logic.js';
import { renderAnalisis } from '../../modules/dominio/analisis/view.js';
import { initResumen } from '../../modules/dominio/resumen/index.js';
import { initMovimientos } from '../../modules/dominio/movimientos/index.js';
import { construirEstadoGrande } from './seed.js';

/** Tamaños de historial a medir (cantidad de gastos). */
const TAMANOS = [1_000, 5_000, 10_000];

/** Fuerza un cache miss en los memoizadores de PERF.2 antes de la próxima muestra. */
function invalidar() {
  EventBus.emit('state:change', { section: 'gastos' });
}

/**
 * Corre `fn` con calentamiento y devuelve la mediana y el p95 en ms.
 * @param {() => void} fn
 * @param {{ iteraciones?: number, warmup?: number, antesDeCadaMuestra?: () => void }} [opts]
 * @returns {{ mediana: number, p95: number }}
 */
function medir(fn, { iteraciones = 20, warmup = 3, antesDeCadaMuestra } = {}) {
  for (let i = 0; i < warmup; i++) { antesDeCadaMuestra?.(); fn(); }
  const muestras = [];
  for (let i = 0; i < iteraciones; i++) {
    antesDeCadaMuestra?.();
    const t0 = performance.now();
    fn();
    muestras.push(performance.now() - t0);
  }
  muestras.sort((a, b) => a - b);
  const mediana = muestras[Math.floor(muestras.length / 2)];
  const p95     = muestras[Math.min(muestras.length - 1, Math.floor(muestras.length * 0.95))];
  return { mediana, p95 };
}

/** Formatea un resultado de `medir` como "mediana / p95" con 1 decimal. */
function fmt({ mediana, p95 }) {
  return `${mediana.toFixed(1)} / ${p95.toFixed(1)}`;
}

/** Monta en el body los contenedores que cada render espera encontrar. */
function montarContenedores() {
  document.body.innerHTML = `
    <div id="saldo-total"></div>
    <div id="panel-resumen"></div>
    <div id="panel-actividad-reciente"></div>
    <div id="panel-analisis"></div>
    <div id="lista-movimientos"></div>`;
}

describe('Rendimiento - hot paths (PERF.0 línea base, PERF.1 windowing, PERF.2 memoización)', () => {
  it('mide render de hot paths + persistencia a varios tamaños', () => {
    const filas = [];
    let nodosPrimerLote = 0;
    let totalDisponible = 0;

    for (const n of TAMANOS) {
      // Volcar el estado grande al singleton real que leen los renders.
      Object.assign(S, construirEstadoGrande({ gastos: n }));
      montarContenedores();

      // "Frío": cada muestra invalida la memoización antes de medir (cache
      // miss garantizado) → costo de un recálculo genuino, comparable contra
      // la línea base de PERF.0/PERF.1.
      const inicioFrio    = medir(() => { renderPanelResumen(); renderActividadReciente(); }, { antesDeCadaMuestra: invalidar });
      const analisisFrio  = medir(() => renderAnalisis(), { antesDeCadaMuestra: invalidar });
      // "Caché": sin invalidar entre muestras → el beneficio real de PERF.2
      // (re-render redundante sin cambios de datos, ej. renderAll() o dos
      // listeners reaccionando a una misma acción).
      const inicioCache   = medir(() => { renderPanelResumen(); renderActividadReciente(); });
      const analisisCache = medir(() => renderAnalisis());

      const primerLote = medir(() => renderMovimientosCompletos(), { iteraciones: 12 });
      // Un lote adicional: render inicial + un solo cargarMasMovimientos() por
      // iteración (no un loop de cientos de lotes, ver nota arriba).
      const loteExtra = medir(() => { renderMovimientosCompletos(); cargarMasMovimientos(); }, { iteraciones: 12 });
      const stringify = medir(() => JSON.stringify(S), { iteraciones: 15 });
      const save      = medir(() => _flushNow(), { iteraciones: 15 });

      // Arranque real (PERF.8): JSON.parse + migraciones sobre el mismo
      // payload que "stringify ms" acaba de medir, ya en localStorage bajo
      // la clave real. Es el costo que corre una sola vez al abrir la app y
      // que el D4 del ADR 030 exige medir para decidir IndexedDB.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
      const arranque = medir(() => loadData(), { iteraciones: 15 });

      renderMovimientosCompletos();
      nodosPrimerLote = document.querySelectorAll('#lista-movimientos .list-item').length;
      // Cantidad real disponible (calculada con la función pura, sin tocar el
      // DOM ni crear observers): confirma que el recorte es solo de pintado.
      totalDisponible = movimientosCompletos({
        gastos: S.gastos, ingresosPuntuales: S.ingresosPuntuales, aportes: S.ahorro?.aportes,
      }).length;

      filas.push({
        'gastos':              n,
        'Inicio frío ms':      fmt(inicioFrio),
        'Inicio caché ms':     fmt(inicioCache),
        'Análisis frío ms':    fmt(analisisFrio),
        'Análisis caché ms':   fmt(analisisCache),
        'Movs 1er lote ms':    fmt(primerLote),
        'Movs +1 lote ms':     fmt(loteExtra),
        'stringify ms':        fmt(stringify),
        'save ms':             fmt(save),
        'arranque ms':         fmt(arranque),
        'nodos 1er lote':      nodosPrimerLote,
        'total disponible':    totalDisponible,
      });
    }

    // Smoke bajo carga: al mayor tamaño los renders sí produjeron contenido,
    // y el primer lote queda acotado (windowing, PERF.1) sin importar cuánto
    // historial real exista.
    expect(document.getElementById('panel-analisis').innerHTML.length).toBeGreaterThan(0);
    expect(document.getElementById('lista-movimientos').innerHTML.length).toBeGreaterThan(0);
    expect(nodosPrimerLote).toBeLessThan(200);
    expect(totalDisponible).toBeGreaterThan(TAMANOS[TAMANOS.length - 1]);

    // eslint-disable-next-line no-console
    console.log('\nRendimiento de hot paths (ms: mediana / p95, happy-dom):');
    // eslint-disable-next-line no-console
    console.table(filas);
  }, 120_000);
});

/**
 * Escenario de ráfaga (PERF.6): una sola acción del usuario que muta varias
 * colecciones emite un `state:change` por mutación (contrato de `infra/crud.js`),
 * y cada uno dispara los listeners de los paneles de Inicio. Este bloque mide
 * lo que cuesta esa ráfaga completa con los listeners REALES cableados, que es
 * la única forma de saber si el coalescer de renders vale el cambio de timing.
 *
 * Va después del bloque de hot paths a propósito: `initResumen()`/`initMovimientos()`
 * dejan listeners vivos en el EventBus para el resto del archivo, y medir "Inicio
 * frío" con esos listeners activos contaminaría la comparación contra BASELINE.md
 * (cada `invalidar()` pintaría de más).
 */
describe('Rendimiento - ráfaga de una acción multi-sección (PERF.6)', () => {
  /**
   * Secciones que emite una distribución del ingreso realista, en orden: cuatro
   * necesidades pagadas (`gastoDePagoCompromiso` = un `guardar('gastos')` cada
   * una, más un `editar('compromisos')` cuando la necesidad es deuda), el saldo
   * de la cuenta de origen, el aporte a ahorro, el abono extra a una deuda, una
   * inversión, y el cierre de logros y config. Todas caen en el MISMO tick: son
   * una sola acción del usuario.
   */
  const RAFAGA_DISTRIBUCION = [
    'gastos', 'compromisos', 'gastos', 'compromisos', 'gastos', 'gastos',
    'cuentas', 'ahorro', 'compromisos', 'inversiones', 'logros', 'config',
  ];

  /** Deja correr los renders agendados en microtask (no-op sin coalescer). */
  async function vaciarMicrotasks() {
    for (let i = 0; i < 3; i++) await Promise.resolve();
  }

  /**
   * Mide la ráfaga completa: emitir todo + esperar a que los paneles queden
   * pintados. Sin coalescer el costo se paga durante los emit; con coalescer,
   * en el microtask posterior. Ambos entran en la misma ventana medida.
   */
  async function medirRafaga({ iteraciones = 10, warmup = 2 } = {}) {
    const muestras = [];
    for (let i = 0; i < warmup + iteraciones; i++) {
      const t0 = performance.now();
      for (const s of RAFAGA_DISTRIBUCION) EventBus.emit('state:change', { section: s });
      await vaciarMicrotasks();
      const dt = performance.now() - t0;
      if (i >= warmup) muestras.push(dt);
    }
    muestras.sort((a, b) => a - b);
    return {
      mediana: muestras[Math.floor(muestras.length / 2)],
      p95: muestras[Math.min(muestras.length - 1, Math.floor(muestras.length * 0.95))],
    };
  }

  it('mide el costo de una distribución del ingreso estando en Inicio', async () => {
    const filas = [];
    let htmlFinal = '';

    // Inicio activo: es la condición que hace visible el problema (renderSmart
    // corta el pintado desde cualquier otra sección).
    location.hash = '#dash';

    for (const n of TAMANOS) {
      Object.assign(S, construirEstadoGrande({ gastos: n }));
      montarContenedores();
      // Cablear una sola vez los listeners reales de los paneles de Inicio.
      if (n === TAMANOS[0]) { initResumen(); initMovimientos(); }

      const conListeners = await medirRafaga();

      filas.push({
        'gastos':                 n,
        'ráfaga Inicio ms':       fmt(conListeners),
        'emits por acción':       RAFAGA_DISTRIBUCION.length,
      });
      htmlFinal = document.getElementById('panel-actividad-reciente').innerHTML;
    }

    // Smoke: la ráfaga sí dejó los paneles pintados (el coalescer no puede
    // "ganar" simplemente no pintando).
    expect(htmlFinal.length).toBeGreaterThan(0);

    // eslint-disable-next-line no-console
    console.log('\nRáfaga de una acción multi-sección estando en Inicio (ms: mediana / p95):');
    // eslint-disable-next-line no-console
    console.table(filas);
  }, 120_000);
});
