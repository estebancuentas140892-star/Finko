/**
 * scripts/perf/seed.js - generador de un estado grande y realista para medir
 * rendimiento (PERF.0). Puro: sin DOM, sin efectos. No forma parte del runtime
 * de la app (nunca lo importa index.html ni el service worker): es utillaje de
 * medición.
 *
 * Determinista: el mismo `seed` produce el mismo estado, para que dos corridas
 * del benchmark sean comparables (antes y después de una optimización).
 */

import { createInitialState } from '../../modules/core/state.js';
import { CATEGORIAS_GASTO_USUARIO } from '../../modules/core/constants.js';
import { genId } from '../../modules/infra/crud.js';

/**
 * PRNG determinista (mulberry32). Devuelve una función que produce floats en
 * [0, 1). Se usa uno propio en vez de Math.random para que las corridas sean
 * reproducibles.
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Construye un estado con la forma completa de `S`, poblado con volúmenes
 * proporcionales a un usuario de varios años: N gastos repartidos en `anios`,
 * más ingresos puntuales, aportes al fondo, compromisos, metas, apartados e
 * inversiones. Un 10 % de los gastos son abonos a deuda (con `compromisoId`),
 * como en el uso real.
 *
 * @param {object} [opts]
 * @param {number} [opts.gastos=5000] - Cantidad de gastos a generar.
 * @param {number} [opts.anios=10]    - Años hacia atrás en que se reparten las fechas.
 * @param {number} [opts.cuentas=5]   - Cantidad de cuentas activas.
 * @param {number} [opts.seed=42]     - Semilla del PRNG (misma semilla = mismo estado).
 * @returns {ReturnType<typeof createInitialState>}
 */
export function construirEstadoGrande({ gastos = 5000, anios = 10, cuentas = 5, seed = 42 } = {}) {
  const rnd    = mulberry32(seed);
  const pick   = (arr) => arr[Math.floor(rnd() * arr.length)];
  const entero = (min, max) => min + Math.floor(rnd() * (max - min + 1));
  const ahora  = new Date();
  const isoTs  = ahora.toISOString();

  const desdeMs = new Date(ahora.getFullYear() - anios, ahora.getMonth(), ahora.getDate()).getTime();
  const rangoMs = ahora.getTime() - desdeMs;
  const fechaAleatoria = () => new Date(desdeMs + rnd() * rangoMs).toISOString().slice(0, 10);

  const S = createInitialState();
  S.onboarded     = true;
  S.perfil.nombre = 'Usuario Prueba';

  // Cuentas activas.
  S.cuentas = Array.from({ length: cuentas }, (_, i) => ({
    id:            `cu-${i}`,
    nombre:        `Cuenta ${i + 1}`,
    banco:         'Nequi',
    tipo:          'Ahorros',
    saldo:         entero(50_000, 5_000_000),
    activa:        true,
    fechaCreacion: isoTs,
  }));

  // Compromisos: mezcla de fijos y deudas (entidad).
  const nComp = 20;
  S.compromisos = Array.from({ length: nComp }, (_, i) => {
    const esDeuda = i % 2 === 0;
    return esDeuda
      ? {
          id: `d-${i}`, descripcion: `Deuda ${i}`, frecuencia: 'Mensual',
          diaPago: entero(1, 28), tipo: 'deuda-entidad', activo: true,
          saldoTotal: entero(500_000, 30_000_000), cuotaMensual: entero(100_000, 900_000),
          tasa: 0.2, tasaUnidad: 'EA', categoria: null, fechaCreacion: isoTs,
        }
      : {
          id: `f-${i}`, descripcion: `Fijo ${i}`, frecuencia: 'Mensual',
          diaPago: entero(1, 28), tipo: 'fijo', activo: true,
          monto: entero(50_000, 800_000), categoria: null, fechaCreacion: isoTs,
        };
  });
  const deudaIds = S.compromisos.filter((c) => c.tipo.startsWith('deuda')).map((c) => c.id);

  // Gastos repartidos en `anios`. 10 % son abonos a deuda (categoría 'Deudas').
  // Forma real de un registro (PERF.9): los campos que `normalizarGasto()`
  // (dominio/gastos/logic.js) siempre deja presentes, más `id`/`fechaCreacion`
  // que agrega `infra/crud.js:guardar()`. Antes la semilla solo tenía 4 campos
  // e `id` corto (`g-0`), subestimando el peso serializado real en ~3x.
  S.gastos = Array.from({ length: gastos }, (_, i) => {
    const esAbono = rnd() < 0.1 && deudaIds.length > 0;
    return {
      monto:         entero(3_000, 400_000),
      categoria:     esAbono ? 'Deudas' : pick(CATEGORIAS_GASTO_USUARIO),
      fecha:         fechaAleatoria(),
      cuentaId:      `cu-${entero(0, cuentas - 1)}`,
      nota:          '',
      compromisoId:  esAbono ? pick(deudaIds) : null,
      consumoTC:     false,
      cuotas:        null,
      avanceTC:      false,
      fechaCreacion: isoTs,
      id:            genId(),
    };
  });

  // Ingresos puntuales y aportes al fondo: ~5 % del volumen de gastos cada uno.
  const nIng = Math.max(1, Math.round(gastos / 20));
  S.ingresosPuntuales = Array.from({ length: nIng }, (_, i) => ({
    id:            `ip-${i}`,
    descripcion:   `Ingreso ${i}`,
    monto:         entero(100_000, 3_000_000),
    categoria:     null,
    cuentaId:      `cu-${entero(0, cuentas - 1)}`,
    fecha:         fechaAleatoria(),
    fechaCreacion: isoTs,
  }));

  const nAp = Math.max(1, Math.round(gastos / 20));
  S.ahorro.fondoEmergencia.activo = true;
  S.ahorro.aportes = Array.from({ length: nAp }, (_, i) => ({
    id:    `ap-${i}`,
    monto: entero(50_000, 500_000),
    fecha: fechaAleatoria(),
  }));

  // Volúmenes menores pero presentes (afectan patrimonio y activos en Análisis).
  S.metas = Array.from({ length: 8 }, (_, i) => ({
    id: `m-${i}`, nombre: `Meta ${i}`, montoObjetivo: entero(1_000_000, 10_000_000),
    montoActual: entero(0, 1_000_000), completada: false,
  }));
  S.apartados = Array.from({ length: 8 }, (_, i) => ({
    id: `apt-${i}`, nombre: `Apartado ${i}`, icono: '📦',
    montoObjetivo: entero(300_000, 3_000_000), montoActual: entero(0, 300_000),
    fechaObjetivo: null, frecuenciaAporte: 'Mensual', recurrente: false,
    periodoMeses: null, completado: false, fechaCreacion: isoTs,
  }));
  S.inversiones = Array.from({ length: 5 }, (_, i) => ({
    id: `inv-${i}`, tipo: 'CDT', nombre: `CDT ${i}`, monto: entero(1_000_000, 20_000_000),
    tasaEA: 10, plazoMeses: 12, fechaInicio: '2024-01-01', fechaCreacion: isoTs,
  }));

  return S;
}
