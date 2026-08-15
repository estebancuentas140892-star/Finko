/**
 * infra/avisos.js - motor único de avisos
 * (CFG.3a, [ADR 066](../../docs/DECISIONS/066-motor-unico-de-avisos.md)).
 *
 * Responde una sola pregunta: **de todo lo que le pasa a este usuario hoy, qué
 * merece avisarle**. Los `nudge` de cada sección siguen siendo la señal en
 * contexto dentro de su pantalla; este motor es el que puede comparar un
 * arriendo vencido contra un tope excedido y decir cuál va primero.
 *
 * **Devuelve datos, nunca frases** (ADR 066 D2, mismo criterio que
 * `infra/sugerencias-categoria.js`): el copy es de cada superficie, dentro del
 * [ADR 003](../../docs/DECISIONS/003-tono-neutral-profesional.md).
 *
 * **No detecta nada nuevo** (ADR 066 D3): cada tipo se apoya en la función que
 * ya vive en su dominio, ya testeada. Acá solo se filtra, se clasifica por
 * severidad y se ordena. Por eso este archivo importa cinco `logic.js` de
 * dominios: es un recolector, y un recolector está encima de sus fuentes. Lo
 * hace por la vía que autoriza el
 * [ADR 060](../../docs/DECISIONS/060-lectura-cross-domain-de-solo-lectura.md):
 * solo `logic.js` puros, nunca `index.js`/`view.js`, y solo lectura. El
 * precedente ya estaba en `infra/notificaciones.js`.
 *
 * **No recorta la lista** (ADR 066 D4): cuántos avisos mostrar lo decide cada
 * superficie, que es la que sabe cuánto espacio tiene.
 *
 * Puro y testeable en Node: no lee `S`, no toca el DOM, la fecha entra como
 * `hoyISO`.
 */

import { vencidosSinPagar, compromisosProximos } from '../dominio/compromisos/logic.js';
import { alertasLimites } from '../dominio/presupuesto/logic.js';
import { apartadosProximos, estaListoParaReiniciar } from '../dominio/apartados/logic.js';
import { estadoPrestamo, calcularPendiente } from '../dominio/personales/logic.js';
import { diasHastaFecha } from './bolsas.js';
import { ocurrenciasEnMes } from './vencimientos.js';

// ── VOCABULARIO DEL MOTOR ────────────────────────────────────────

/** Los ocho tipos de aviso, en el orden de la tabla del ADR 066 D3. */
export const TIPOS_AVISO = Object.freeze([
  'compromiso-vencido',
  'compromiso-proximo',
  'limite-excedido',
  'limite-alerta',
  'apartado-proximo',
  'apartado-listo',
  'prestamo-vencido',
  'prestamo-proximo',
  'dia-de-pago',
  'respaldo-atrasado',
]);

/** Severidades de mayor a menor. El orden del array ES el ranking. */
export const SEVERIDADES = Object.freeze(['urgente', 'alta', 'media', 'baja']);

/**
 * Severidades que justifican interrumpir con una notificación del sistema
 * operativo (ADR 066 D5). Todo lo demás espera dentro de la app: un apartado a
 * seis días no despierta el teléfono.
 */
export const SEVERIDADES_QUE_INTERRUMPEN = Object.freeze(['urgente', 'alta']);

/** Días de anticipación de `compromiso-proximo`. El umbral histórico del motor. */
export const DIAS_COMPROMISO_PROXIMO = 3;

/**
 * Días de anticipación de `apartado-proximo`. **No es el `DIAS_PROXIMO` (30) del
 * dominio**: 30 días es el umbral correcto para listar en la sección, pero como
 * aviso del día no distingue nada porque casi siempre habría uno (ADR 066,
 * alternativas rechazadas). El dominio conserva su constante intacta.
 */
export const DIAS_APARTADO_PROXIMO = 7;

/** Días de anticipación de `prestamo-proximo` (fecha pactada de devolución). */
export const DIAS_PRESTAMO_PROXIMO = 3;

/**
 * Días sin un respaldo (JSON) exportado que activan `respaldo-atrasado` en
 * severidad `media` (CFG.4b, ADR 043 D2.2). Un mes de margen: bastante para no
 * molestar por un respaldo reciente, poco para dejar pasar el problema que
 * abrió el ADR (perder el historial por no acordarse de exportar).
 */
export const DIAS_RESPALDO_ATRASADO = 30;

/**
 * Días sin respaldo que escalan el aviso a `alta` (interrumpe con notificación
 * del sistema, ADR 066 D5). Tres meses: bastante más que el umbral base, para
 * que solo escale quien de verdad dejó pasar mucho tiempo.
 */
export const DIAS_RESPALDO_CRITICO = 90;

/**
 * Las cinco secciones de origen de un aviso (CFG.3c, ADR 066 nota 2026-08-13).
 * Es la granularidad que expone la preferencia del usuario: por sección, no
 * por los nueve `TIPOS_AVISO` uno por uno. Un compromiso vencido y uno próximo
 * son la misma fuente para quien decide si quiere o no avisos de esa fuente;
 * separarlos en el interruptor multiplicaría los controles sin agregar una
 * decisión real (ver ADR 066, alternativas rechazadas).
 */
export const SECCIONES_AVISO = Object.freeze(['compromisos', 'presupuesto', 'apartados', 'personales', 'tesoreria', 'respaldo']);

/** Etiqueta legible de cada sección, para el interruptor de Ajustes (CFG.3c). */
export const LABEL_SECCION_AVISO = Object.freeze({
  compromisos: 'Deudas y pagos fijos',
  presupuesto: 'Límites de gasto',
  apartados:   'Apartados',
  personales:  'Préstamos personales',
  tesoreria:   'Día de pago',
  respaldo:    'Respaldo de tus datos',
});

const _RX_HOY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Mapea la severidad de `vencidosSinPagar` a la escala del motor. */
const _SEVERIDAD_ATRASO = { leve: 'media', moderada: 'alta', urgente: 'urgente' };

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Un aviso ya armado. `nombre` es dato del usuario (el nombre del compromiso, la
 * categoría del tope), nunca una frase; `dias` se lee junto a `sentido`.
 *
 * @param {object} datos
 * @returns {Aviso}
 */
function _aviso({ tipo, severidad, id, nombre, monto = null, dias = null, sentido = null, seccion, extra = null }) {
  return { id: `${tipo}:${id}`, tipo, severidad, nombre: nombre ?? '', monto, dias, sentido, seccion, extra };
}

/**
 * Urgencia temporal comparable entre tipos distintos, para el orden dentro de
 * una misma severidad: un atraso de 12 días pesa más que uno de 2, y los dos
 * pesan más que algo que todavía no vence. El atraso entra en negativo, así que
 * un solo orden ascendente sirve para las dos direcciones del tiempo.
 */
function _urgencia(aviso) {
  if (aviso.dias === null) return 0;
  return aviso.sentido === 'atraso' ? -aviso.dias : aviso.dias;
}

/** Date a mediodía local desde 'YYYY-MM-DD': mismo criterio que `estadoPrestamo`. */
function _fechaRef(hoyISO) {
  return new Date(`${hoyISO}T12:00:00`);
}

// ── RECOLECTORES POR FUENTE ──────────────────────────────────────

/**
 * Compromisos cuyo día de pago ya pasó y siguen sin cubrirse.
 *
 * Pide `umbralDiasAtraso: 1` a propósito: con atraso 0 el compromiso vence
 * **hoy**, no está atrasado, y ese caso ya lo cubre `compromiso-proximo` con
 * `dias: 0`. Así ningún compromiso genera dos avisos el mismo día sin necesidad
 * de de-duplicar nada después.
 */
function _deCompromisosVencidos(compromisos, gastos, hoyISO) {
  return vencidosSinPagar(compromisos, gastos, hoyISO, { umbralDiasAtraso: 1 }).map(v => _aviso({
    tipo:      'compromiso-vencido',
    severidad: _SEVERIDAD_ATRASO[v.severidad] ?? 'media',
    id:        v.id,
    nombre:    v.descripcion,
    monto:     v.monto,
    dias:      v.diasAtraso,
    sentido:   'atraso',
    seccion:   'compromisos',
  }));
}

/** Compromisos que vencen dentro de los próximos tres días (hoy incluido). */
function _deCompromisosProximos(compromisos) {
  return compromisosProximos(compromisos, DIAS_COMPROMISO_PROXIMO)
    .filter(c => c.diasRestantes >= 0)
    .map(c => _aviso({
      // Hoy y mañana interrumpen; dos o tres días esperan en la app.
      tipo:      'compromiso-proximo',
      severidad: c.diasRestantes <= 1 ? 'alta' : 'media',
      id:        c.id,
      nombre:    c.descripcion,
      // Las deudas no tienen `monto` desde v6: lo que vence es la cuota (mismo
      // criterio `monto ?? cuotaMensual` de `sumarMontos`).
      monto:     Number(c.monto ?? c.cuotaMensual ?? 0),
      dias:      c.diasRestantes,
      sentido:   'restante',
      seccion:   'compromisos',
    }));
}

/** Categorías con el tope excedido o cerca de excederse, en el mes en curso. */
function _deLimites(presupuestos, gastos, anio, mes) {
  return alertasLimites(presupuestos, gastos, anio, mes).map(a => _aviso({
    tipo:      a.estado === 'excedido' ? 'limite-excedido' : 'limite-alerta',
    severidad: a.estado === 'excedido' ? 'alta' : 'media',
    id:        a.categoria,
    nombre:    a.categoria,
    // El monto del aviso es lo gastado, que es la cifra que el usuario
    // reconoce; el tope viaja en `extra` para quien quiera comparar.
    monto:     a.gastado,
    seccion:   'presupuesto',
    extra:     { porcentaje: a.porcentaje, asignado: a.asignado, estado: a.estado },
  }));
}

/**
 * Apartados con fecha cerca y apartados que ya reunieron el dinero.
 *
 * `apartado-listo` es la versión útil del "meta alcanzada" que pedía el brief:
 * es un estado que **persiste** hasta que el usuario usa el dinero y reinicia el
 * ciclo, no una noticia de hace un rato (ADR 066, alternativas rechazadas).
 */
function _deApartados(apartados, hoyISO) {
  const out = [];

  for (const a of apartadosProximos(apartados, hoyISO, DIAS_APARTADO_PROXIMO)) {
    out.push(_aviso({
      tipo:      'apartado-proximo',
      severidad: 'media',
      id:        a.id,
      nombre:    a.nombre,
      monto:     Math.max(0, (Number(a.montoObjetivo) || 0) - (Number(a.montoActual) || 0)),
      dias:      diasHastaFecha(a.fechaObjetivo, hoyISO),
      sentido:   'restante',
      seccion:   'apartados',
    }));
  }

  for (const a of Array.isArray(apartados) ? apartados : []) {
    if (!a || !estaListoParaReiniciar(a)) continue;
    out.push(_aviso({
      tipo:      'apartado-listo',
      severidad: 'baja',
      id:        a.id,
      nombre:    a.nombre,
      monto:     Number(a.montoActual) || 0,
      seccion:   'apartados',
    }));
  }

  return out;
}

/**
 * Préstamos personales con fecha pactada: la que ya pasó y la que está cerca.
 *
 * **Nunca pasan de `media`**, ni con un año de atraso: el ADR 047 fija que el
 * lenguaje de esta sección recuerda y no presiona, y una notificación del
 * sistema por dinero que le debe un amigo es exactamente la presión que ese ADR
 * rechaza. Interrumpir el teléfono queda para lo que el usuario debe, no para lo
 * que le deben.
 */
function _dePrestamos(personales, hoyISO) {
  const ref = _fechaRef(hoyISO);
  const out = [];

  for (const p of Array.isArray(personales) ? personales : []) {
    if (!p || p.liquidado === true) continue;

    const estado = estadoPrestamo(p, ref);
    const esProximo = (estado.tipo === 'proximo' && estado.dias <= DIAS_PRESTAMO_PROXIMO)
      || estado.tipo === 'hoy';
    if (estado.tipo !== 'vencido' && !esProximo) continue;

    out.push(_aviso({
      tipo:      estado.tipo === 'vencido' ? 'prestamo-vencido' : 'prestamo-proximo',
      severidad: estado.tipo === 'vencido' ? 'media' : 'baja',
      id:        p.id,
      nombre:    p.persona,
      monto:     calcularPendiente(p, ref),
      dias:      estado.dias,
      sentido:   estado.tipo === 'vencido' ? 'atraso' : 'restante',
      seccion:   'personales',
    }));
  }

  return out;
}

/**
 * Ingresos fijos que caen hoy. La regla de frecuencias es la del motor de
 * vencimientos (`ocurrenciasEnMes`), no una copia: un quincenal cae dos veces al
 * mes y un anual solo en su mes del ciclo.
 */
function _deDiaDePago(ingresos, anio, mes, dia) {
  return (Array.isArray(ingresos) ? ingresos : [])
    .filter(i => i && i.activo !== false && ocurrenciasEnMes(i, anio, mes - 1).includes(dia))
    .map(i => _aviso({
      tipo:      'dia-de-pago',
      severidad: 'media',
      id:        i.id,
      nombre:    i.descripcion,
      monto:     Number(i.monto) || 0,
      dias:      0,
      sentido:   'restante',
      seccion:   'tesoreria',
    }));
}

/**
 * Días transcurridos entre `desde` (pasado) y `hoyISO`, siempre positivo o
 * cero. Reusa `diasHastaFecha`, escrita para fechas futuras: para una fecha
 * pasada devuelve negativo, así que acá se invierte el signo.
 */
function _diasTranscurridos(desde, hoyISO) {
  const d = diasHastaFecha(desde, hoyISO);
  return d === null ? null : Math.max(0, -d);
}

/**
 * Aviso de respaldo atrasado (CFG.4b, ADR 043 D2.2).
 *
 * A diferencia de los demás recolectores, no detecta un registro nuevo: mide
 * una **ausencia** (cuánto hace que nadie exporta), así que el disparador es
 * el paso del tiempo. `desde` es el último respaldo si existe, o
 * `primerUsoISO` si nunca hubo uno: el reloj arranca cuando empezó a haber
 * algo que perder, no antes, para no molestar a un usuario que instaló la
 * app ayer y todavía no tiene con qué perder nada.
 *
 * Sin datos que perder (`hayDatos` falso), no hay nada que avisar.
 */
function _deRespaldo(ultimoRespaldoISO, primerUsoISO, hoyISO, hayDatos) {
  if (!hayDatos) return [];
  const desde = ultimoRespaldoISO ?? primerUsoISO;
  if (!desde) return [];

  const dias = _diasTranscurridos(desde, hoyISO);
  if (dias === null || dias < DIAS_RESPALDO_ATRASADO) return [];

  return [_aviso({
    tipo:      'respaldo-atrasado',
    severidad: dias >= DIAS_RESPALDO_CRITICO ? 'alta' : 'media',
    id:        'respaldo',
    nombre:    'Respaldo de tus datos',
    dias,
    sentido:   'atraso',
    seccion:   'respaldo',
  })];
}

/**
 * true si hay algo que perder si el dispositivo se pierde sin respaldo
 * (CFG.4b). Cubre las seis colecciones financieras del estado: las cinco que
 * ya recibe el motor (`compromisos`, `presupuestos`, `apartados`,
 * `personales`, `ingresos`) más `gastos`, `cuentas`, `metas` e `inversiones`,
 * que ningún otro tipo de aviso necesita pero que sí son datos que perder.
 *
 * @param {object} colecciones
 * @returns {boolean}
 */
export function hayDatosParaRespaldar({
  compromisos = [], presupuestos = [], apartados = [], personales = [], ingresos = [],
  gastos = [], cuentas = [], metas = [], inversiones = [],
} = {}) {
  return [compromisos, presupuestos, apartados, personales, ingresos, gastos, cuentas, metas, inversiones]
    .some(col => Array.isArray(col) && col.length > 0);
}

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Todos los avisos que aplican hoy, ordenados por severidad, luego por urgencia
 * temporal y luego por monto. La lista **no se recorta**: el tope es de cada
 * superficie (ADR 066 D4).
 *
 * Cada colección se recibe por parámetro (el motor no lee `S`), y todas son
 * opcionales: un usuario sin apartados no necesita pasar `apartados`.
 *
 * @param {object} params
 * @param {Array}  [params.compromisos]  `S.compromisos`.
 * @param {Array}  [params.gastos]       `S.gastos` (para saber qué ya se pagó).
 * @param {Array}  [params.presupuestos] `S.presupuestos` (topes por categoría).
 * @param {Array}  [params.apartados]    `S.apartados`.
 * @param {Array}  [params.personales]   `S.personales` (lo que te deben).
 * @param {Array}  [params.ingresos]     `S.ingresos` (fijos, para el día de pago).
 * @param {string|null} [params.ultimoRespaldoISO] `S.config.ultimoRespaldoISO` (CFG.4b).
 * @param {string|null} [params.primerUsoISO]      `S.config.primerUsoISO` (CFG.4b), referencia
 *                                                  si nunca hubo un respaldo.
 * @param {boolean} [params.hayDatosParaRespaldar]  Si hay algo que perder (ver la función del
 *                                                  mismo nombre exportada por este módulo).
 * @param {string} params.hoyISO         'YYYY-MM-DD' de referencia (inyectable).
 * @returns {Aviso[]} `[]` si `hoyISO` no es una fecha con forma válida.
 */
export function recolectarAvisos({
  compromisos  = [],
  gastos       = [],
  presupuestos = [],
  apartados    = [],
  personales   = [],
  ingresos     = [],
  ultimoRespaldoISO = null,
  primerUsoISO = null,
  hayDatosParaRespaldar: hayDatos = false,
  hoyISO,
} = {}) {
  const m = _RX_HOY.exec(String(hoyISO ?? ''));
  if (!m) return [];

  const anio = +m[1];
  const mes  = +m[2];
  const dia  = +m[3];

  const avisos = [
    ..._deCompromisosVencidos(compromisos, gastos, hoyISO),
    ..._deCompromisosProximos(compromisos),
    ..._deLimites(presupuestos, gastos, anio, mes),
    ..._deApartados(apartados, hoyISO),
    ..._dePrestamos(personales, hoyISO),
    ..._deDiaDePago(ingresos, anio, mes, dia),
    ..._deRespaldo(ultimoRespaldoISO, primerUsoISO, hoyISO, hayDatos),
  ];

  return avisos.sort((a, b) => {
    const s = SEVERIDADES.indexOf(a.severidad) - SEVERIDADES.indexOf(b.severidad);
    if (s !== 0) return s;
    const u = _urgencia(a) - _urgencia(b);
    if (u !== 0) return u;
    return (Number(b.monto) || 0) - (Number(a.monto) || 0);
  });
}

/**
 * Los avisos que justifican una notificación del sistema operativo (ADR 066 D5).
 * Conserva el orden que trae la lista.
 *
 * @param {Aviso[]} avisos Salida de `recolectarAvisos`.
 * @returns {Aviso[]}
 */
export function avisosQueInterrumpen(avisos) {
  if (!Array.isArray(avisos)) return [];
  return avisos.filter(a => SEVERIDADES_QUE_INTERRUMPEN.includes(a?.severidad));
}

/**
 * Aplica la preferencia del usuario por sección (CFG.3c, `S.config.avisosPorSeccion`).
 * Conserva el orden. Sección ausente del mapa de preferencias = activada: el
 * campo es aditivo (schema v40) y un usuario que nunca tocó el interruptor
 * sigue viendo todo, mismo criterio que el resto de preferencias opcionales
 * de `S.config` (ver `contexto/inicio.md`, `ocultarSaldo`).
 *
 * @param {Aviso[]} avisos Salida de `recolectarAvisos`.
 * @param {Record<string, boolean>} [prefs] `S.config.avisosPorSeccion`.
 * @returns {Aviso[]}
 */
export function filtrarPorPreferencia(avisos, prefs) {
  if (!Array.isArray(avisos)) return [];
  return avisos.filter(a => (prefs?.[a?.seccion]) !== false);
}

/**
 * @typedef {object} Aviso
 * @property {string} id         `tipo:idDelItem`, único dentro de una recolección.
 * @property {string} tipo       Uno de `TIPOS_AVISO`.
 * @property {string} severidad  Una de `SEVERIDADES`.
 * @property {string} nombre     Dato del usuario (nombre del compromiso, categoría del tope).
 * @property {number|null} monto COP en juego, o null si el aviso no tiene cifra.
 * @property {number|null} dias  Cantidad de días; se lee junto a `sentido`.
 * @property {'atraso'|'restante'|null} sentido Hacia atrás o hacia adelante en el tiempo.
 * @property {string} seccion    Hash de la sección donde se resuelve (`compromisos`, `presupuesto`, ...).
 * @property {object|null} extra Datos propios del tipo (ej. `porcentaje` del tope).
 */
