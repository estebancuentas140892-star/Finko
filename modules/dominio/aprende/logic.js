/**
 * aprende/logic.js - capa de aprendizaje del adulto (APR.1a, ADR 092).
 *
 * Funciones puras, sin DOM (ADN 9): catálogo de la ruta, estado de cada
 * unidad, motor de la lección (una sesión es un valor que entra y sale de
 * cada función, nunca se muta en el lugar) y los cálculos del Aplícalo.
 *
 * El CONTENIDO de cada lección (sus pasos) no vive acá: viaja en
 * `lecciones/<unidad>.js` y se carga con `import()` al abrirla, para no
 * pesar en el arranque (D11). Acá solo están los metadatos que la ruta
 * necesita para pintarse sin cargar nada.
 */

import { f } from '../../infra/utils.js';
import { resumenHormigaMes } from '../../infra/hormiga.js';
import { aplicaHormiga } from './aplica.js';
import { UNIDADES, unidadTerminada, semanaISO } from '../../infra/ruta-aprende.js';

// ── CATÁLOGO DE LA RUTA (D8) ─────────────────────────────────────

/**
 * El catálogo vive en `infra/ruta-aprende.js` desde APR.1d: lo lee también
 * `logros` para contar las unidades que ya sabes, y ningún dominio importa a
 * otro (ADN 10). Se re-exporta para no romper a quien lo importa de acá.
 *
 * @typedef {import('../../infra/ruta-aprende.js').Unidad} Unidad
 * @typedef {import('../../infra/ruta-aprende.js').LeccionMeta} LeccionMeta
 */
export { UNIDADES, unidadTerminada, semanaISO };

/**
 * Unidad dueña de una lección, por el prefijo de su id (`u3-l2` → `u3`).
 * @param {string} leccionId
 * @returns {Unidad | undefined}
 */
export function unidadDeLeccion(leccionId) {
  const prefijo = String(leccionId ?? '').split('-')[0];
  return UNIDADES.find(u => u.id === prefijo);
}

/**
 * Metadatos de una lección por id.
 * @param {string} leccionId
 * @returns {LeccionMeta | undefined}
 */
export function metaLeccion(leccionId) {
  return unidadDeLeccion(leccionId)?.lecciones.find(l => l.id === leccionId);
}

/** ¿La lección tiene su texto escrito? (D8: el resto se escribe en su rebanada). */
export function leccionDisponible(meta) {
  return Boolean(meta) && meta.contenido !== false;
}

// ── ESTADO DE LA RUTA ────────────────────────────────────────────

/**
 * Lee `S.aprende` con tolerancia: cualquier campo ausente o mal formado cae
 * a su vacío. La migración v45 ya lo normaliza; esto cubre los tests y un
 * estado a medio cargar.
 *
 * @param {unknown} aprende
 * @returns {{ hechas: Record<string, string>, sabidas: string[], semanas: string[], enCurso: { id: string, paso: number } | null }}
 */
export function normalizarAprende(aprende) {
  const a = aprende && typeof aprende === 'object' ? /** @type {any} */ (aprende) : {};
  return {
    hechas:  a.hechas && typeof a.hechas === 'object' && !Array.isArray(a.hechas) ? a.hechas : {},
    sabidas: Array.isArray(a.sabidas) ? a.sabidas : [],
    semanas: Array.isArray(a.semanas) ? a.semanas : [],
    enCurso: a.enCurso && typeof a.enCurso.id === 'string' ? a.enCurso : null,
  };
}


/**
 * Estado de cada unidad para la ruta (D8). Nada se bloquea: el estado solo
 * dice dónde recomendar empezar.
 *
 * - `sabida`: la prueba de ubicación la marcó (cuenta como sabida, D3/D9).
 * - `hecha`: todas sus lecciones terminadas.
 * - `actual`: la primera, en orden, que no está ni hecha ni sabida y tiene
 *   lecciones disponibles ("vas aquí").
 * - `despues`: el resto.
 *
 * @param {unknown} aprende - `S.aprende`.
 * @returns {{ unidad: Unidad, estado: 'sabida'|'hecha'|'actual'|'despues', hechas: number, total: number }[]}
 */
export function estadoRuta(aprende) {
  const { hechas, sabidas } = normalizarAprende(aprende);
  let hayActual = false;
  return UNIDADES.map(unidad => {
    const total = unidad.lecciones.length;
    const cuantas = unidad.lecciones.filter(l => hechas[l.id]).length;
    let estado = 'despues';
    if (sabidas.includes(unidad.id)) estado = 'sabida';
    else if (unidadTerminada(unidad, hechas)) estado = 'hecha';
    else if (!hayActual && unidad.lecciones.some(leccionDisponible)) {
      estado = 'actual';
      hayActual = true;
    }
    return { unidad, estado, hechas: cuantas, total };
  });
}

/**
 * La lección que la ruta recomienda abrir ahora: la primera disponible y no
 * hecha de la unidad actual. `null` si no queda ninguna disponible.
 *
 * @param {unknown} aprende
 * @returns {LeccionMeta | null}
 */
export function siguienteLeccion(aprende) {
  const { hechas } = normalizarAprende(aprende);
  const actual = estadoRuta(aprende).find(e => e.estado === 'actual');
  if (!actual) return null;
  return actual.unidad.lecciones.find(l => leccionDisponible(l) && !hechas[l.id]) ?? null;
}

// ── LA SECCIÓN OFRECE SU LECCIÓN (D6) ────────────────────────────

/**
 * La lección que ofrece cada sección, como máximo una (D6). La clave es el
 * hash de la sección; la sección dueña deja los huecos donde va la fila.
 */
export const OFERTAS_DE_SECCION = {
  fondo: { leccionId: 'u4-l2', eyebrow: 'Entiende tu fondo' },
};

/**
 * La oferta de una sección: su lección, la unidad y si ya la hiciste, en
 * cuyo caso la fila baja al pie como "Repasar" (D6, R65). `null` si la
 * sección no ofrece ninguna o su lección no está escrita.
 *
 * @param {string} seccion
 * @param {unknown} aprende
 * @returns {{ leccion: LeccionMeta, unidad: Unidad, eyebrow: string, repasar: boolean } | null}
 */
export function ofertaDeSeccion(seccion, aprende) {
  if (!Object.hasOwn(OFERTAS_DE_SECCION, seccion)) return null;
  const { leccionId, eyebrow } = OFERTAS_DE_SECCION[seccion];
  const leccion = metaLeccion(leccionId);
  if (!leccion || !leccionDisponible(leccion)) return null;
  const { hechas } = normalizarAprende(aprende);
  return { leccion, unidad: unidadDeLeccion(leccionId), eyebrow, repasar: Boolean(hechas[leccionId]) };
}

// ── SEMANAS ACTIVAS (D3) ─────────────────────────────────────────


/**
 * Registra una lección terminada. Devuelve un `aprende` NUEVO (no muta).
 *
 * Una lección suma una sola vez (D3, regla anti-trampa): si ya estaba hecha
 * se conserva su primera fecha y `primeraVez` sale en false. La semana sí se
 * suma siempre, porque repasar también es actividad.
 *
 * @param {unknown} aprende
 * @param {string} leccionId
 * @param {string} hoyISO - `YYYY-MM-DD` local.
 * @returns {{ aprende: ReturnType<typeof normalizarAprende>, primeraVez: boolean }}
 */
export function registrarLeccionHecha(aprende, leccionId, hoyISO) {
  const a = normalizarAprende(aprende);
  const primeraVez = !a.hechas[leccionId];
  const hechas = primeraVez ? { ...a.hechas, [leccionId]: hoyISO } : a.hechas;
  const semana = semanaISO(hoyISO);
  const semanas = semana && !a.semanas.includes(semana) ? [...a.semanas, semana] : a.semanas;
  const enCurso = a.enCurso?.id === leccionId ? null : a.enCurso;
  return { aprende: { ...a, hechas, semanas, enCurso }, primeraVez };
}

// ── MOTOR DE LA LECCIÓN (D7) ─────────────────────────────────────

/**
 * @typedef {Object} Sesion
 * @property {string}   leccionId
 * @property {number[]} cola       - índices de pasos por recorrer, en orden.
 * @property {number}   pos        - posición actual dentro de `cola`.
 * @property {number}   total      - pasos originales de la lección.
 * @property {number[]} vistos     - índices de pasos ya superados.
 * @property {boolean}  repaso     - el paso actual es una pregunta que volvió.
 * @property {null | { correcto: boolean, elegida?: number, orden?: number[] }} revision
 *           - respuesta revisada del paso actual, o null si aún no responde.
 * @property {null | { cola: number[], si: number, no: number }} tarjetas
 *           - avance dentro de un paso "clasificar".
 * @property {null | number[]} orden - orden actual dentro de un paso "ordenar".
 * @property {Record<string, number>} valores - valores de un paso "control".
 */

/** Pasos que se responden y por lo tanto pueden volver al final si fallan. */
const _TIPOS_PREGUNTA = new Set(['elegir', 'ordenar']);

/**
 * Prepara el estado interno del paso que queda activo.
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @returns {Sesion}
 */
function _entrarAlPaso(s, leccion) {
  const paso = leccion.pasos[s.cola[s.pos]];
  const base = { ...s, revision: null, tarjetas: null, orden: null, valores: {} };
  if (!paso) return base;
  if (paso.tipo === 'clasificar') {
    base.tarjetas = { cola: paso.tarjetas.map((_, i) => i), si: 0, no: 0 };
  } else if (paso.tipo === 'ordenar') {
    base.orden = mezclarSinAcertar(paso.items.length, s.cola[s.pos] + s.pos);
  } else if (paso.tipo === 'control') {
    for (const c of paso.controles ?? []) base.valores[c.id] = c.inicial;
  }
  return base;
}

/**
 * Orden inicial de un paso "ordenar": una rotación determinista que nunca
 * coincide con la respuesta, para que el ejercicio no empiece resuelto y el
 * mismo estado produzca siempre la misma pantalla (testeable).
 *
 * @param {number} n
 * @param {number} semilla
 * @returns {number[]}
 */
export function mezclarSinAcertar(n, semilla = 0) {
  const base = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return base;
  const corrimiento = 1 + (Math.abs(semilla) % (n - 1));
  return base.map((_, i) => base[(i + corrimiento) % n]);
}

/**
 * Abre una sesión sobre una lección cargada. `desde` retoma en ese paso
 * original (el avance guardado en `S.aprende.enCurso`).
 *
 * @param {{ id: string, pasos: any[] }} leccion
 * @param {number} [desde=0]
 * @returns {Sesion}
 */
export function crearSesion(leccion, desde = 0) {
  const total = leccion.pasos.length;
  const inicio = Number.isInteger(desde) && desde > 0 && desde < total ? desde : 0;
  const cola = Array.from({ length: total }, (_, i) => i);
  const vistos = cola.slice(0, inicio);
  return _entrarAlPaso({
    leccionId: leccion.id, cola, pos: inicio, total, vistos,
    repaso: false, revision: null, tarjetas: null, orden: null, valores: {},
  }, leccion);
}

/**
 * Devuelve la cola con el paso actual repetido al final, pero antes del
 * Aplícalo: el cierre siempre es lo último que se ve (D7).
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @returns {number[]}
 */
function _reencolar(s, leccion) {
  const cola = [...s.cola];
  const aplica = cola.findIndex((i, pos) => pos > s.pos && leccion.pasos[i]?.tipo === 'aplica');
  if (aplica === -1) cola.push(s.cola[s.pos]);
  else cola.splice(aplica, 0, s.cola[s.pos]);
  return cola;
}

/** Paso activo de la sesión. */
export function pasoActual(s, leccion) {
  return leccion.pasos[s.cola[s.pos]] ?? null;
}

/**
 * Número que muestra el contador "n de N": cuántos pasos distintos se
 * abrieron hasta el actual, incluido. Una pregunta que vuelve ya se había
 * abierto, así que no infla el contador: queda en el número del último paso
 * nuevo, y el cierre sigue siendo el último.
 *
 * @param {Sesion} s
 */
export function numeroDePaso(s) {
  return Math.min(new Set(s.cola.slice(0, s.pos + 1)).size, s.total);
}

/**
 * Responde un paso "elegir". Equivocarse no quita nada: la pregunta vuelve
 * al final de la cola (D7).
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @param {number} elegida - índice de la opción.
 * @returns {Sesion}
 */
export function responderElegir(s, leccion, elegida) {
  const paso = pasoActual(s, leccion);
  if (paso?.tipo !== 'elegir' || s.revision) return s;
  const correcto = elegida === paso.correcta;
  const cola = correcto ? s.cola : _reencolar(s, leccion);
  return { ...s, cola, revision: { correcto, elegida } };
}

/**
 * Mueve un elemento de un paso "ordenar" una posición arriba (-1) o abajo (+1).
 * Fuera de rango, o con la respuesta ya revisada, no cambia nada.
 *
 * @param {Sesion} s
 * @param {number} indice - posición actual del elemento en `s.orden`.
 * @param {-1 | 1} direccion
 * @returns {Sesion}
 */
export function moverItem(s, indice, direccion) {
  if (!s.orden || s.revision) return s;
  const destino = indice + direccion;
  if (indice < 0 || indice >= s.orden.length || destino < 0 || destino >= s.orden.length) return s;
  const orden = [...s.orden];
  [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
  return { ...s, orden };
}

/**
 * Revisa un paso "ordenar": correcto si quedó en el orden de `items`.
 * Si falla, vuelve al final igual que "elegir".
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @returns {Sesion}
 */
export function comprobarOrden(s, leccion) {
  const paso = pasoActual(s, leccion);
  if (paso?.tipo !== 'ordenar' || !s.orden || s.revision) return s;
  const correcto = s.orden.every((item, i) => item === i);
  const cola = correcto ? s.cola : _reencolar(s, leccion);
  return { ...s, cola, revision: { correcto, orden: [...s.orden] } };
}

/**
 * Clasifica la tarjeta de arriba de un paso "clasificar".
 * Acierto: la tarjeta sale y suma a su lado. Error: la tarjeta vuelve al
 * fondo del mazo y queda una revisión para mostrar el "casi" (D7).
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @param {boolean} esSi - true si el usuario dijo que sí lo es.
 * @returns {Sesion}
 */
export function clasificarTarjeta(s, leccion, esSi) {
  const paso = pasoActual(s, leccion);
  if (paso?.tipo !== 'clasificar' || !s.tarjetas || s.revision) return s;
  const [arriba, ...resto] = s.tarjetas.cola;
  if (arriba === undefined) return s;
  const tarjeta = paso.tarjetas[arriba];
  const correcto = Boolean(tarjeta.es) === Boolean(esSi);
  const tarjetas = correcto
    ? { cola: resto, si: s.tarjetas.si + (tarjeta.es ? 1 : 0), no: s.tarjetas.no + (tarjeta.es ? 0 : 1) }
    : { ...s.tarjetas, cola: [...resto, arriba] };
  return { ...s, tarjetas, revision: correcto ? null : { correcto: false, elegida: arriba } };
}

/** Cierra el "casi" de una tarjeta mal clasificada y sigue con la próxima. */
export function seguirClasificando(s) {
  return s.revision && s.tarjetas ? { ...s, revision: null } : s;
}

/** ¿El paso activo ya se puede dejar atrás? */
export function pasoListo(s, leccion) {
  const paso = pasoActual(s, leccion);
  if (!paso) return false;
  if (_TIPOS_PREGUNTA.has(paso.tipo)) return Boolean(s.revision);
  if (paso.tipo === 'clasificar') return Boolean(s.tarjetas) && s.tarjetas.cola.length === 0;
  return true;
}

/**
 * Cambia el valor de un control de un paso "control" (D7: el resultado se
 * recalcula en vivo). Valores fuera de las opciones o del rango se ignoran.
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @param {string} controlId
 * @param {number} valor
 * @returns {Sesion}
 */
export function cambiarControl(s, leccion, controlId, valor) {
  const paso = pasoActual(s, leccion);
  const control = paso?.tipo === 'control' ? paso.controles.find(c => c.id === controlId) : null;
  if (!control || !Number.isFinite(valor)) return s;
  const valido = control.opciones
    ? control.opciones.includes(valor)
    : valor >= control.min && valor <= control.max;
  if (!valido) return s;
  return { ...s, valores: { ...s.valores, [controlId]: valor } };
}

/**
 * Avanza al siguiente paso de la cola. Devuelve `terminada: true` cuando la
 * cola se agotó o el próximo paso es el Aplícalo, que es el cierre (D7).
 *
 * @param {Sesion} s
 * @param {{ pasos: any[] }} leccion
 * @returns {{ sesion: Sesion, terminada: boolean }}
 */
export function avanzar(s, leccion) {
  if (!pasoListo(s, leccion)) return { sesion: s, terminada: false };
  const indice = s.cola[s.pos];
  const fallo = s.revision && !s.revision.correcto;
  const vistos = fallo || s.vistos.includes(indice) ? s.vistos : [...s.vistos, indice];
  const pos = s.pos + 1;
  if (pos >= s.cola.length) {
    return { sesion: { ...s, vistos, pos: s.cola.length - 1 }, terminada: true };
  }
  const siguiente = s.cola[pos];
  const repaso = s.cola.indexOf(siguiente) < pos;
  const sesion = _entrarAlPaso({ ...s, vistos, pos, repaso }, leccion);
  return { sesion, terminada: leccion.pasos[siguiente]?.tipo === 'aplica' };
}

/**
 * Paso original más avanzado alcanzado, para guardarlo en `enCurso` y
 * retomar ahí al volver (D7: "Salir · tu avance se guarda").
 *
 * @param {Sesion} s
 */
export function pasoParaRetomar(s) {
  const originales = s.vistos.filter(i => i < s.total);
  return originales.length ? Math.max(...originales) + 1 : 0;
}

// ── CÁLCULOS DE LOS PASOS "CONTROL" ──────────────────────────────

/**
 * Cálculos con nombre que un paso "control" puede pedir. El contenido de la
 * lección es dato (`lecciones/*.js`); la aritmética vive acá, testeable.
 */
export const CALCULOS = {
  /**
   * Un gasto diario repetido a lo largo del año (unidad 3).
   * @param {{ precio: number, dias: number }} v
   */
  'gasto-repetido-anual'(v) {
    const anual = v.precio * v.dias * 52;
    const mensual = Math.round(anual / 12);
    const conTres = v.dias > 3 ? v.precio * (v.dias - 3) * 52 : 0;
    return { anual, mensual, ahorroConTres: conTres };
  },

  /** Cuánto debe tener el fondo: gastos fijos del mes por meses de respaldo (unidad 4). */
  'fondo-objetivo'(v) {
    return { objetivo: v.gastos * v.meses };
  },

  /** Cuántos meses tarda en llenarse una meta con un aporte fijo (unidades 4 y 5). */
  'aporte-meses'(v) {
    const meses = v.aporte > 0 ? Math.ceil(v.meta / v.aporte) : 0;
    const conDoble = v.aporte > 0 ? Math.ceil(v.meta / (v.aporte * 2)) : 0;
    return { meses, conDoble };
  },

  /** Cuánto guardar al mes para tener un monto en N meses (unidad 5). */
  'meta-mensual'(v) {
    return { porMes: v.meses > 0 ? Math.ceil(v.precio / v.meses / 1_000) * 1_000 : 0 };
  },

  /** Lo que queda libre por día después de los pagos fijos (unidad 1). */
  'libre-por-dia'(v) {
    const libre = Math.max(0, v.ingreso - v.fijos);
    return { libre, porDia: Math.floor(libre / 30 / 100) * 100 };
  },

  /** La regla 50/30/20 sobre un ingreso (unidad 2). */
  'regla-503020'(v) {
    return { necesidades: v.ingreso * 0.5, gustos: v.ingreso * 0.3, ahorro: v.ingreso * 0.2 };
  },

  /**
   * Cuota y costo de un crédito a cuotas fijas, al 2 % mensual (unidad 7).
   * Sistema francés, el mismo de `infra/financiero.js`.
   */
  'credito-cuotas'(v) {
    const i = 0.02;
    const n = v.cuotas;
    const factor = Math.pow(1 + i, n);
    const cuota = Math.round(v.monto * (i * factor) / (factor - 1));
    return { cuota, intereses: Math.max(0, cuota * n - v.monto) };
  },

  /** Lo que cobra un préstamo gota a gota del 20 % al mes (unidad 6). */
  'gota-a-gota'(v) {
    const pagas = Math.round(v.prestamo * 1.2);
    return { pagas, cuotaDiaria: Math.round(pagas / 30), intereses: pagas - v.prestamo };
  },

  /** Interés compuesto al 10 % efectivo anual (unidad 8). */
  'interes-compuesto'(v) {
    const final = Math.round(v.inicial * Math.pow(1.10, v.anios));
    return { final, ganancia: final - v.inicial };
  },

  /** La regla del 72: años para duplicar el dinero a una tasa anual (unidad 8). */
  'regla-72'(v) {
    return { anios: v.tasa > 0 ? 72 / v.tasa : 0 };
  },
};

/**
 * La lectura de cada cálculo, lista para pintar: qué es la cifra, la cifra y
 * una línea que dice qué significa (R75), con números de persona (R69).
 *
 * @type {Record<string, (v: Record<string, number>) => { lead: string, cifra: string, linea: string }>}
 */
export const RESULTADOS = {
  'gasto-repetido-anual'(v) {
    const r = CALCULOS['gasto-repetido-anual'](v);
    const extra = r.ahorroConTres > 0
      ? ` Si lo bajas a 3 días, te quedan ${f(r.ahorroConTres)} al año para otra cosa.`
      : '';
    return { lead: 'En un año suman', cifra: f(r.anual), linea: `Son ${f(r.mensual)} al mes.${extra}` };
  },
  'fondo-objetivo'(v) {
    const { objetivo } = CALCULOS['fondo-objetivo'](v);
    const linea = v.meses < 3
      ? 'Menos de 3 meses te da poco tiempo si pierdes tu ingreso.'
      : v.meses <= 6
        ? 'Entre 3 y 6 meses es lo que se suele recomendar.'
        : 'Más de 6 meses tiene sentido si tu ingreso cambia mucho de un mes a otro.';
    return { lead: 'Tu fondo debería tener', cifra: f(objetivo), linea };
  },
  'aporte-meses'(v) {
    const { meses, conDoble } = CALCULOS['aporte-meses'](v);
    return {
      lead: 'Lo llenas en',
      cifra: _mesesTexto(meses),
      linea: `Con ${f(v.aporte * 2)} al mes, en ${_mesesTexto(conDoble)}.`,
    };
  },
  'meta-mensual'(v) {
    const { porMes } = CALCULOS['meta-mensual'](v);
    return { lead: 'Guarda cada mes', cifra: f(porMes), linea: `En ${_mesesTexto(v.meses)} tienes ${f(v.precio)}.` };
  },
  'libre-por-dia'(v) {
    const { libre, porDia } = CALCULOS['libre-por-dia'](v);
    return {
      lead: 'Te quedan libres al mes',
      cifra: f(libre),
      linea: libre > 0 ? `Son unos ${f(porDia)} por día para todo lo demás.` : 'Tus pagos fijos se llevan todo: no queda nada libre.',
    };
  },
  'regla-503020'(v) {
    const r = CALCULOS['regla-503020'](v);
    return {
      lead: 'Para ahorrar o pagar deudas',
      cifra: f(r.ahorro),
      linea: `${f(r.necesidades)} para lo que necesitas y ${f(r.gustos)} para tus gustos.`,
    };
  },
  'credito-cuotas'(v) {
    const { cuota, intereses } = CALCULOS['credito-cuotas'](v);
    return {
      lead: `Pagas cada mes, en ${v.cuotas} ${v.cuotas === 1 ? 'cuota' : 'cuotas'}`,
      cifra: f(cuota),
      linea: `En total le pagas ${f(intereses)} de intereses al banco.`,
    };
  },
  'gota-a-gota'(v) {
    const r = CALCULOS['gota-a-gota'](v);
    return {
      lead: 'En un mes terminas pagando',
      cifra: f(r.pagas),
      linea: `Son ${f(r.cuotaDiaria)} cada día, y ${f(r.intereses)} solo de intereses en 30 días.`,
    };
  },
  'interes-compuesto'(v) {
    const { final, ganancia } = CALCULOS['interes-compuesto'](v);
    return {
      lead: `En ${v.anios} ${v.anios === 1 ? 'año' : 'años'} tendrías`,
      cifra: f(final),
      linea: `${f(ganancia)} son intereses: cada año ganas también sobre lo que ya ganaste.`,
    };
  },
  'regla-72'(v) {
    const { anios } = CALCULOS['regla-72'](v);
    const redondo = Math.round(anios * 10) / 10;
    return {
      lead: 'Tu dinero se duplica en unos',
      cifra: `${redondo.toLocaleString('es-CO')} años`,
      linea: `72 dividido entre ${v.tasa} da ${redondo.toLocaleString('es-CO')}.`,
    };
  },
};

/** "1 año y 2 meses", "8 meses" (R69). */
function _mesesTexto(meses) {
  const n = Math.max(0, Math.round(meses));
  const anios = Math.floor(n / 12);
  const resto = n % 12;
  const partes = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (resto || !anios) partes.push(`${resto} ${resto === 1 ? 'mes' : 'meses'}`);
  return partes.join(' y ');
}

// ── APLÍCALO (D7) ────────────────────────────────────────────────

/**
 * Los cálculos del Aplícalo viven en `aplica.js` desde APR.2c, uno por unidad.
 * Se re-exportan los de la unidad 3 para no romper a quien los importa de acá.
 */
export { aplicaHormiga, limiteSugerido } from './aplica.js';

// ── TU SIGUIENTE PASO (D5) ───────────────────────────────────────

/**
 * La única cosa que Inicio propone hacer ahora (D5). Una lección, si hay
 * una por hacer; o la acción pendiente de un Aplícalo (hoy, el límite de
 * gastos pequeños que la unidad 3 enseña a poner y todavía no está puesto).
 * `null` si no hay nada que proponer: la celda no se dibuja.
 *
 * @param {{ aprende: unknown, gastos: any[], hoyISO: string, tope: number, limite: number | null }} datos
 * @returns {null
 *   | { tipo: 'leccion', leccion: LeccionMeta, unidad: Unidad, hormiga: { cuantos: number } }
 *   | { tipo: 'accion', unidad: Unidad, leccionId: string, aplica: ReturnType<typeof aplicaHormiga> }}
 */
export function siguientePaso({ aprende, gastos, hoyISO, tope, limite }) {
  const leccion = siguienteLeccion(aprende);
  if (leccion) {
    const unidad = unidadDeLeccion(leccion.id);
    const { cuantos } = resumenHormigaMes(gastos, String(hoyISO ?? '').slice(0, 7), tope);
    return { tipo: 'leccion', leccion, unidad, hormiga: { cuantos } };
  }
  const u3 = UNIDADES.find(u => u.id === 'u3');
  const { hechas } = normalizarAprende(aprende);
  if (u3 && unidadTerminada(u3, hechas) && !limite) {
    const aplica = aplicaHormiga(gastos, hoyISO, tope);
    if (!aplica.sinDato) return { tipo: 'accion', unidad: u3, leccionId: 'u3-l3', aplica };
  }
  return null;
}

/**
 * Suma la semana de hoy a las semanas activas (D3) cuando el usuario
 * registra algo. Devuelve el mismo objeto si la semana ya estaba, para que el
 * llamador sepa que no hay nada que guardar.
 *
 * @param {unknown} aprende
 * @param {string} hoyISO
 * @returns {ReturnType<typeof normalizarAprende>}
 */
export function registrarSemana(aprende, hoyISO) {
  const a = normalizarAprende(aprende);
  const semana = semanaISO(hoyISO);
  if (!semana || a.semanas.includes(semana)) return a;
  return { ...a, semanas: [...a.semanas, semana] };
}

