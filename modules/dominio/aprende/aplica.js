/**
 * aprende/aplica.js - el "Aplícalo" de cada unidad (ADR 092 D7).
 *
 * Funciones puras, sin DOM. Cada lección cierra con un paso
 * `{ tipo: 'aplica', calculo }`; acá vive, por nombre, el cálculo que lee los
 * datos del usuario y devuelve el modelo que la vista pinta tal cual: el dato
 * real, su línea de lectura (R75), hasta tres filas de desglose y los botones
 * hacia la sección donde se aplica, con el monto escrito cuando proponen mover
 * dinero (R50). Si el dato no existe, el modelo lo pide en su lugar (R57).
 *
 * Ningún dominio se importa (ADN 10): los datos llegan como argumento, desde
 * `S`, y lo compartido se lee de `infra/` y `core/constants.js`.
 */

import { f } from '../../infra/utils.js';
import { resumenHormigaMes, UMBRAL_GASTO_HORMIGA } from '../../infra/hormiga.js';
import { estimarSalarioMensual, estimarIngresoAnual, calcularRegla72 } from '../../infra/financiero.js';
import { iconoDeCategoriaGasto, UVT, GMF, TOPES_RENTA_UVT, ANIO_VIGENTE } from '../../core/constants.js';

/**
 * @typedef {Object} AccionAplica
 * @property {string} texto
 * @property {'primario' | 'ghost'} estilo
 * @property {string} action - `data-action` global que ya existe en la app. Para
 *   las que no cierran la lección solas se usa `registrar-abrir` con
 *   `targetAction`: cierra el overlay y dispara la acción por su nombre.
 * @property {{ target?: string, targetAction?: string, monto?: number, id?: string }} [datos]
 */

/**
 * @typedef {Object} ModeloAplica
 * @property {boolean} sinDato - true cuando el dato no existe y el modelo lo pide (R57).
 * @property {string}  lead
 * @property {string}  [cifra]
 * @property {string}  [linea]
 * @property {{ icono?: string, nombre: string, detalle?: string, monto?: string }[]} [filas]
 * @property {{ texto: string, fuerte?: string, despues?: string }} [extra]
 * @property {AccionAplica[]} acciones
 * @property {string}  [nota]
 */

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Cada cuántas veces al mes ocurre una frecuencia (misma tabla que Fondo, ADN 10). */
const _FACTOR_MENSUAL = {
  'Diario': 30, 'Semanal': 4.33, 'Quincenal': 2, 'Mensual': 1,
  'Bimestral': 1 / 2, 'Trimestral': 1 / 3, 'Semestral': 1 / 6, 'Anual': 1 / 12, 'Única vez': 0,
};

const _ir = (texto, target, estilo = 'primario') => ({ texto, estilo, action: 'ir-a-seccion', datos: { target } });

/** "1 mes y 3 semanas" (R69): misma regla que la franja del Fondo. */
export function mesesEnPalabras(meses) {
  const n = Number(meses);
  if (!Number.isFinite(n) || n <= 0) return '0 meses';
  let enteros = Math.floor(n);
  let semanas = Math.round((n - enteros) * 4);
  if (semanas === 4) { enteros += 1; semanas = 0; }
  const partes = [];
  if (enteros > 0) partes.push(`${enteros} ${enteros === 1 ? 'mes' : 'meses'}`);
  if (semanas > 0) partes.push(`${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`);
  return partes.length ? partes.join(' y ') : 'menos de una semana';
}

/** Gastos fijos del mes: compromisos activos de tipo fijo, proyectados a mes. */
export function gastosFijosMensuales(compromisos) {
  return (compromisos ?? [])
    .filter(c => c && c.activo !== false && c.tipo === 'fijo')
    .reduce((s, c) => s + (Number(c.monto) || 0) * (_FACTOR_MENSUAL[c.frecuencia] ?? 0), 0);
}

/** Deudas activas (entidad o personal). */
function _deudas(compromisos) {
  return (compromisos ?? []).filter(c => c && c.activo !== false
    && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal'));
}

/** Tasa mensual de una deuda como decimal, o null si no la tiene anotada. */
export function tasaMensualDeuda(deuda) {
  const t = Number(deuda?.tasa);
  if (!Number.isFinite(t) || t <= 0) return null;
  return deuda.tasaUnidad === 'mensual' ? t : Math.pow(1 + t, 1 / 12) - 1;
}

/**
 * Límite sugerido para lo pequeño: un poco menor que lo que ya gastas, no la
 * mitad (unidad 3, lección 3). El 80 % redondeado a la decena de mil.
 *
 * @param {number} total
 */
export function limiteSugerido(total) {
  if (!(total > 0)) return 0;
  return Math.max(10_000, Math.round((total * 0.8) / 10_000) * 10_000);
}

/**
 * Datos del Aplícalo de la unidad 3: los gastos pequeños del mes en curso,
 * con su desglose y un límite sugerido. `{ sinDato: true }` si el mes no
 * tiene ninguno todavía.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {string} hoyISO
 * @param {number} [tope]
 */
export function aplicaHormiga(gastos, hoyISO, tope = UMBRAL_GASTO_HORMIGA) {
  const mes = String(hoyISO ?? '').slice(0, 7);
  const resumen = resumenHormigaMes(gastos, mes, tope);
  const mesNombre = _MESES[Number(mes.slice(5, 7)) - 1] ?? '';
  if (resumen.cuantos === 0) return { sinDato: true, mesNombre, tope };
  const limite = limiteSugerido(resumen.total);
  return {
    sinDato: false, mesNombre, tope,
    total: resumen.total, cuantos: resumen.cuantos,
    grupos: resumen.porCategoria.slice(0, 3),
    limite, diferencia: Math.max(0, resumen.total - limite),
  };
}

// ── LOS CÁLCULOS, POR NOMBRE ─────────────────────────────────────

/**
 * @typedef {Object} DatosAplica
 * @property {any[]} gastos
 * @property {any[]} cuentas
 * @property {any[]} ingresos
 * @property {any[]} compromisos
 * @property {any[]} metas
 * @property {any[]} inversiones
 * @property {any}   ahorro
 * @property {any[]} categoriasPersonalizadas
 * @property {string} hoyISO
 * @property {number} tope    - tope de gasto pequeño vigente.
 * @property {number | null} limite - límite de gastos pequeños, si hay.
 * @property {any}   paso     - el paso "aplica" (su `cta`, si la trae).
 */

/** @type {Record<string, (d: DatosAplica) => ModeloAplica>} */
export const APLICA = {
  /** Unidad 1: el dinero disponible y lo que ya está comprometido este mes. */
  'dinero-hoy'(d) {
    const cuentas = (d.cuentas ?? []).filter(c => c && c.activa !== false);
    if (!cuentas.length) {
      return {
        sinDato: true,
        lead: 'Todavía no tienes cuentas en Finko.',
        linea: 'Agrega dónde tienes tu dinero (una cuenta, una billetera o el efectivo) y aquí verás cuánto tienes libre.',
        acciones: [{ texto: 'Agregar una cuenta', estilo: 'primario', action: 'registrar-abrir', datos: { targetAction: 'ir-a-crear-cuenta' } }],
      };
    }
    const total = cuentas.reduce((s, c) => s + (Number(c.saldo) || 0), 0);
    const pagos = gastosFijosMensuales(d.compromisos)
      + _deudas(d.compromisos).reduce((s, c) => s + (Number(c.cuotaMensual) || 0), 0);
    const libre = total - pagos;
    return {
      sinDato: false,
      lead: 'Hoy tienes en tus cuentas',
      cifra: f(total),
      linea: pagos > 0
        ? (libre >= 0
          ? `Tus pagos fijos y cuotas del mes suman ${f(pagos)}: te quedan ${f(libre)} libres.`
          : `Tus pagos fijos y cuotas del mes suman ${f(pagos)}: te faltan ${f(-libre)} para cubrirlos.`)
        : 'Todavía no tienes pagos fijos anotados: todo lo que ves está libre.',
      filas: [...cuentas].sort((a, b) => (b.saldo || 0) - (a.saldo || 0)).slice(0, 3)
        .map(c => ({ icono: 'i-cuentas', nombre: c.nombre, monto: f(Number(c.saldo) || 0) })),
      acciones: [_ir('Ver tus cuentas', 'tesoreria')],
    };
  },

  /** Unidad 2: tu ingreso del mes repartido con la regla 50/30/20. */
  'reparto-503020'(d) {
    const ingreso = estimarSalarioMensual(d.ingresos);
    if (!(ingreso > 0)) {
      return {
        sinDato: true,
        lead: 'Todavía no tienes un ingreso fijo anotado.',
        linea: 'Anota cuánto recibes y cada cuánto: con ese dato, Finko te propone cómo repartirlo.',
        acciones: [_ir('Anotar mi ingreso', 'tesoreria')],
      };
    }
    const fijos = gastosFijosMensuales(d.compromisos);
    const necesidades = Math.round(ingreso * 0.5);
    return {
      sinDato: false,
      lead: 'Tu ingreso de cada mes',
      cifra: f(Math.round(ingreso)),
      linea: fijos > necesidades
        ? `Tus gastos fijos (${f(fijos)}) ya pasan la mitad: el reparto te ayuda a ver de dónde sacar.`
        : `De cada $100 que recibes, la regla separa $50, $30 y $20.`,
      filas: [
        { icono: 'i-home', nombre: 'Lo que necesitas', detalle: '· 50', monto: f(necesidades) },
        { icono: 'i-star', nombre: 'Tus gustos', detalle: '· 30', monto: f(Math.round(ingreso * 0.3)) },
        { icono: 'i-ahorro', nombre: 'Ahorro o deudas', detalle: '· 20', monto: f(Math.round(ingreso * 0.2)) },
      ],
      acciones: [{ texto: 'Repartir mi ingreso', estilo: 'primario', action: 'registrar-abrir', datos: { targetAction: 'presupuesto-abrir-distribucion' } }],
      nota: 'El asistente te deja mover los porcentajes a tu medida.',
    };
  },

  /** Unidad 3: los gastos pequeños del mes (ver `aplicaHormiga`). */
  'hormiga-mes'(d) {
    const a = aplicaHormiga(d.gastos, d.hoyISO, d.tope);
    if (a.sinDato) {
      return {
        sinDato: true,
        lead: `Todavía no tienes gastos pequeños en ${a.mesNombre || 'este mes'}.`,
        linea: `Registra los de esta semana y vuelve: aquí verás cuánto suman tus gastos de ${f(d.tope)} o menos.`,
        acciones: [{ texto: 'Registrar un gasto', estilo: 'primario', action: 'registrar-abrir', datos: { targetAction: 'nuevo-gasto' } }],
      };
    }
    const modelo = {
      sinDato: false,
      lead: `Tus gastos pequeños de ${a.mesNombre} suman`,
      cifra: f(a.total),
      linea: `Son ${a.cuantos} ${a.cuantos === 1 ? 'compra' : 'compras'} de ${f(a.tope)} o menos.`,
      filas: a.grupos.map(g => ({
        icono: iconoDeCategoriaGasto(g.categoria, d.categoriasPersonalizadas) || 'c-otros',
        nombre: g.categoria, detalle: `· ${g.cuantos}`, monto: f(g.total),
      })),
      extra: {
        texto: 'Si un mes gastas en lo pequeño menos que tu promedio de los tres anteriores, ganas el logro ',
        fuerte: 'Hormiga a raya', despues: '.',
      },
    };
    if (d.paso?.cta === 'gastos') {
      return { ...modelo, acciones: [_ir('Ver tus gastos', 'gast')], nota: 'Ahí ves cada compra con su categoría y cuáles se repiten.' };
    }
    if (d.limite) {
      return { ...modelo, acciones: [_ir('Ver tu límite en Límites', 'presupuesto')],
        nota: `Tu límite para lo pequeño es ${f(d.limite)} al mes y vas en ${f(a.total)}.` };
    }
    return {
      ...modelo,
      acciones: [{ texto: `Poner un límite de ${f(a.limite)}`, estilo: 'primario', action: 'leccion-limite-hormiga', datos: { monto: a.limite } }],
      nota: `Unos ${f(a.diferencia)} menos que este mes: es la meta para el que viene. Lo ajustas en Límites.`,
    };
  },

  /** Unidad 4: cuánto te cubre hoy tu fondo de emergencia. */
  'fondo-meses'(d) {
    const fijos = gastosFijosMensuales(d.compromisos);
    if (!(fijos > 0)) {
      return {
        sinDato: true,
        lead: 'Todavía no tienes gastos fijos anotados.',
        linea: 'Con tu arriendo, los servicios y tus demás pagos fijos, Finko calcula cuánto necesita tu fondo.',
        acciones: [_ir('Anotar mis gastos fijos', 'compromisos')],
      };
    }
    const fondo = d.ahorro?.fondoEmergencia ?? {};
    const aportes = Array.isArray(d.ahorro?.aportes) ? d.ahorro.aportes : [];
    const monto = fondo.activo
      ? Math.max(0, Number(fondo.montoActual) || 0) + aportes.reduce((s, a) => s + (Number(a?.monto) || 0), 0)
      : 0;
    const meses = monto / fijos;
    const tres = Math.round(fijos * 3);
    const seis = Math.round(fijos * 6);
    const linea = `Tus gastos fijos son ${f(Math.round(fijos))} al mes: 3 meses son ${f(tres)} y 6 meses, ${f(seis)}.`;
    if (!fondo.activo || monto <= 0) {
      return {
        sinDato: false,
        lead: 'Si hoy dejaras de recibir ingresos, tu fondo te cubre',
        cifra: 'Nada todavía',
        linea,
        acciones: [_ir('Crear tu fondo de emergencia', 'fondo')],
        nota: `Empezar con poco cuenta: un mes completo serían ${f(Math.round(fijos))}.`,
      };
    }
    return {
      sinDato: false,
      lead: 'Si hoy dejaras de recibir ingresos, tu fondo te cubre',
      cifra: mesesEnPalabras(meses),
      linea,
      acciones: [_ir('Ir a tu fondo', 'fondo')],
      nota: monto < tres ? `Te faltan ${f(tres - monto)} para llegar a 3 meses.` : 'Ya pasaste los 3 meses: tu fondo te da tiempo para decidir con calma.',
    };
  },

  /** Unidad 5: tus metas, cuánto llevas y si tienen fecha. */
  'metas'(d) {
    const activas = (d.metas ?? []).filter(m => m && !m.completada);
    if (!activas.length) {
      return {
        sinDato: true,
        lead: 'Todavía no tienes metas activas.',
        linea: 'Ponle nombre, precio y fecha a algo que quieras: Finko te dice cuánto guardar cada mes.',
        acciones: [_ir('Crear una meta', 'metas')],
      };
    }
    const objetivo = activas.reduce((s, m) => s + (Number(m.montoObjetivo) || 0), 0);
    const llevas = activas.reduce((s, m) => s + (Number(m.montoActual) || 0), 0);
    const sinFecha = activas.find(m => !m.fechaLimite);
    return {
      sinDato: false,
      lead: `En tus ${activas.length === 1 ? 'meta llevas' : `${activas.length} metas llevas`}`,
      cifra: f(llevas),
      linea: `De ${f(objetivo)} en total: te faltan ${f(Math.max(0, objetivo - llevas))}.`,
      filas: activas.slice(0, 3).map(m => ({
        icono: 'i-metas', nombre: m.nombre,
        detalle: m.fechaLimite ? '' : '· sin fecha',
        monto: `${f(Number(m.montoActual) || 0)} de ${f(Number(m.montoObjetivo) || 0)}`,
      })),
      acciones: [_ir('Ir a tus metas', 'metas')],
      nota: sinFecha ? `"${sinFecha.nombre}" no tiene fecha: con una, Finko te dice cuánto guardar cada mes.` : undefined,
    };
  },

  /** Unidades 6 y 7: tus deudas, lo que pagas al mes y lo que te cuestan. */
  'deudas'(d) {
    const deudas = _deudas(d.compromisos);
    if (!deudas.length) {
      return {
        sinDato: true,
        lead: 'No tienes deudas anotadas en Finko.',
        linea: 'Si tienes alguna, anotarla te muestra cuánto pagas al mes y cuándo terminas.',
        acciones: [_ir('Ver Por pagar', 'compromisos')],
      };
    }
    const saldo = deudas.reduce((s, c) => s + (Number(c.saldoTotal) || 0), 0);
    const cuotas = deudas.reduce((s, c) => s + (Number(c.cuotaMensual) || 0), 0);
    const intereses = Math.round(deudas.reduce((s, c) => {
      const t = tasaMensualDeuda(c);
      return t ? s + (Number(c.saldoTotal) || 0) * t : s;
    }, 0));
    return {
      sinDato: false,
      lead: `Entre tus ${deudas.length === 1 ? 'deuda debes' : `${deudas.length} deudas debes`}`,
      cifra: f(saldo),
      linea: intereses > 0
        ? `Pagas ${f(cuotas)} al mes en cuotas, y de eso unos ${f(intereses)} se van en intereses este mes.`
        : `Pagas ${f(cuotas)} al mes en cuotas.`,
      filas: [...deudas].sort((a, b) => (b.saldoTotal || 0) - (a.saldoTotal || 0)).slice(0, 3).map(c => {
        const t = tasaMensualDeuda(c);
        return {
          icono: c.tipo === 'deuda-personal' ? 'i-personales' : 'i-deudas',
          nombre: c.descripcion,
          detalle: t ? `· ${(t * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} % al mes` : '· sin tasa anotada',
          monto: f(Number(c.saldoTotal) || 0),
        };
      }),
      acciones: [_ir('Ver tus deudas', 'compromisos')],
      nota: intereses > 0 ? undefined : 'Anota la tasa de cada deuda y Finko te dice cuánto te cobra al mes.',
    };
  },

  /** Unidad 8: tus inversiones y en cuántos años se duplicarían (regla del 72). */
  'inversion-72'(d) {
    const inversiones = (d.inversiones ?? []).filter(i => i && i.activa !== false && i.cerrada !== true);
    if (!inversiones.length) {
      const anios = Math.round(calcularRegla72(10).aniosAproximados);
      return {
        sinDato: true,
        lead: 'Todavía no tienes inversiones anotadas.',
        linea: `Con la regla del 72: a 10 % efectivo anual, el dinero se duplica en unos ${anios} años.`,
        acciones: [_ir('Ir a Inversión', 'inversion')],
      };
    }
    const total = inversiones.reduce((s, i) => s + (Number(i.monto) || 0), 0);
    return {
      sinDato: false,
      lead: 'Tienes invertidos',
      cifra: f(total),
      linea: 'La regla del 72 divide 72 entre la tasa anual: el resultado son los años que tarda en duplicarse.',
      filas: inversiones.slice(0, 3).map(i => {
        const tasa = Number(i.tasaEA) || 0;
        return {
          icono: 'i-inversion', nombre: i.nombre,
          detalle: tasa > 0 ? `· ${tasa} % anual, se duplica en unos ${Math.round(72 / tasa)} años` : '· tasa variable',
          monto: f(Number(i.monto) || 0),
        };
      }),
      acciones: [_ir('Ir a Inversión', 'inversion')],
    };
  },

  /** Unidad 9: tus ingresos del año contra el tope para declarar renta. */
  'impuestos'(d) {
    const topeRenta = TOPES_RENTA_UVT.ingresosBrutos * UVT;
    const exento = 350 * UVT;
    const anual = Math.round(estimarIngresoAnual(d.ingresos));
    const filas = [
      { icono: 'i-percent', nombre: 'Tope de ingresos para declarar', detalle: `· ${TOPES_RENTA_UVT.ingresosBrutos.toLocaleString('es-CO')} UVT`, monto: f(topeRenta) },
      { icono: 'i-cuentas', nombre: 'Exento de 4x1000 al mes, en una cuenta', detalle: '· 350 UVT', monto: f(exento) },
    ];
    if (!(anual > 0)) {
      return {
        sinDato: true,
        lead: 'Todavía no tienes un ingreso fijo anotado.',
        linea: `Con tus ingresos del año, Finko compara contra el tope para declarar renta (valores de ${ANIO_VIGENTE}).`,
        filas,
        acciones: [_ir('Anotar mi ingreso', 'tesoreria')],
      };
    }
    const cerca = anual >= topeRenta * 0.8;
    return {
      sinDato: false,
      lead: 'Tus ingresos de este año, estimados',
      cifra: f(anual),
      linea: anual >= topeRenta
        ? `Pasan el tope de ${f(topeRenta)}: por este criterio tendrías que declarar renta.`
        : cerca
          ? `Estás cerca del tope de ${f(topeRenta)}: vale la pena revisarlo con tiempo.`
          : `Están por debajo del tope de ${f(topeRenta)} (valores de ${ANIO_VIGENTE}).`,
      filas,
      acciones: [_ir('Ver tus impuestos en Análisis', 'analisis')],
      nota: `El 4x1000 es ${f(GMF * 1_000_000)} por cada millón que sale de una cuenta no marcada como exenta.`,
    };
  },
};

/**
 * El modelo del Aplícalo de un paso. Un cálculo desconocido devuelve un
 * modelo vacío que solo lleva a la ruta, para que una lección nunca quede sin
 * salida.
 *
 * @param {string} calculo
 * @param {DatosAplica} datos
 * @returns {ModeloAplica}
 */
export function modeloAplica(calculo, datos) {
  const fn = APLICA[calculo];
  if (!fn) return { sinDato: true, lead: 'Sigue en tu ruta.', acciones: [_ir('Volver a la ruta', 'aprende')] };
  return fn(datos);
}
