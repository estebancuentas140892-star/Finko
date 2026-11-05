/**
 * familia-view.js - el bloque Familia de Ajustes y el alta del niño
 * (APR.3a, ADR 093 D1 y D2). Solo HTML, sin estado propio.
 *
 * El tutor administra desde aquí: agrega un niño (paso 1: nombre, edad,
 * dibujo y cómo lo nombra), entra a su perfil sin PIN (de adulto a niño es
 * libre) y lo elimina. La mesada, el premio y el progreso del niño llegan
 * con APR.3e.
 */

import { esc, f, formateadorFecha } from '../../infra/utils.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import { DIBUJOS, htmlDibujo, dibujoPorId } from '../../infra/ilustraciones.js';
import { EDAD_MIN, EDAD_MAX, NOMBRE_MAX, COMO_TE_NOMBRA, saldosFrascos } from '../../infra/perfiles.js';
import { UNIDADES_NINO, unidadTerminada } from '../../infra/ruta-aprende.js';
import {
  FRECUENCIAS_MESADA, DIAS_SEMANA, TASAS_PREMIO, TASA_POR_DEFECTO, repartoPorDefecto,
  proximaMesada, mesadaPendiente, premioPendiente, proximoPremio,
} from '../../infra/mesada.js';
import { textoFrecuencia } from '../../infra/mesada.js';
export { textoFrecuencia };
import { PIN_LARGO_MIN, PIN_LARGO_MAX } from './bloqueo.js';

/** Desde esta edad la ruta del niño empieza con preguntas de ubicación (D9). */
export const EDAD_UBICACION = 10;

/** El dibujo del niño dentro de su teja, con el borde de su color. */
export function avatarFamilia(perfil, tamano = 30) {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav kidav--familia" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

/** "sábado": el día de la semana de una fecha. */
const _diaSemana = (iso) => DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()] ?? '';

/** Lo que el tutor necesita saber de la mesada de un niño, en una línea. */
function _estadoMesada(p, hoyISO) {
  if (!p.mesada) return { texto: 'Sin mesada todavía', aviso: false };
  const pendiente = mesadaPendiente(p.mesada, hoyISO);
  if (pendiente) return { texto: `Mesada del ${_diaSemana(pendiente)} por entregar`, aviso: true };
  const proxima = proximaMesada(p.mesada, hoyISO);
  return { texto: proxima ? `La próxima mesada: ${fechaCorta(proxima)}` : 'Mesada al día', aviso: false };
}

/**
 * La tarjeta Familia de Ajustes (ADR 124 D10): cada niño es una fila que abre
 * su progreso; si le toca la mesada, "Se la entregué" va debajo, sin abrir
 * nada. Entrar como él, su teléfono y quitarlo viven en su progreso.
 *
 * @param {import('../../infra/perfiles.js').PerfilNino[]} ninos
 * @returns {string}
 */
export function htmlFamilia(ninos, hoyISO = '') {
  const lista = ninos.length ? `
      <p class="familia-intro">Toca a un niño para ver cómo va, cambiar su mesada o entrar como él.</p>
      <ul class="familia-lista">${ninos.map(p => {
        const estado = _estadoMesada(p, hoyISO);
        return `
        <li class="familia-nino">
          <button class="familia-nino__abrir" type="button" data-action="familia-progreso" data-id="${esc(p.id)}"
                  aria-haspopup="dialog" aria-label="Ver el progreso de ${esc(p.nombre)}">
            ${avatarFamilia(p)}
            <span class="familia-nino__datos">
              <span class="familia-nino__nombre">${esc(p.nombre)}</span>
              <span class="familia-nino__meta">${p.edad} años · te dice ${esc(p.teNombra)}</span>
              <span class="familia-nino__estado${estado.aviso ? ' familia-nino__estado--aviso' : ''}">${estado.texto}</span>
            </span>
          </button>${estado.aviso ? `
          <div class="familia-nino__entregar">
            <button class="familia-pildora" type="button" data-action="familia-entregada" data-id="${esc(p.id)}"
                    aria-label="Marcar entregada la mesada de ${esc(p.nombre)}: ${f(p.mesada.monto)}">${icon('check')}Se la entregué · ${f(p.mesada.monto)}</button>
          </div>` : ''}
        </li>`;
      }).join('')}
      </ul>` : `
      <p class="form-hint">
        Comparte Finko con tus hijos de ${EDAD_MIN} a ${EDAD_MAX} años. Cada uno tiene su perfil, sus lecciones
        y su alcancía, y no ve nada tuyo.
      </p>`;
  return `
    <section class="config-section" aria-labelledby="config-familia-title" id="config-familia">
      <h2 class="config-section__title" id="config-familia-title">Familia</h2>
      ${lista}
      <button class="familia-agregar" type="button" data-action="familia-agregar" aria-haspopup="dialog">${icon('plus')}${ninos.length ? 'Agregar otro niño' : 'Agregar un niño'}</button>
    </section>`;
}

/** Cuántas mesadas tocan y no se han entregado, para la fila de Ajustes. */
export function mesadasPorEntregar(ninos, hoyISO) {
  return ninos.filter(p => mesadaPendiente(p.mesada, hoyISO)).length;
}

/** El pie fijo de las hojas de Familia: una salida y la acción (ADR 123 D1). */
function _pie(principal, salida = '<button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>') {
  return `
      <div class="modal__footer modal__footer--principal familia-pie">
        ${salida}
        ${principal}
      </div>`;
}

/**
 * Paso 1 del alta: quién es el niño y qué verá (D2).
 *
 * @param {{ candado: boolean, datos?: Record<string, string> }} opciones
 * @returns {string}
 */
export function htmlAltaNino({ candado, datos = {} }) {
  const edades = Array.from({ length: EDAD_MAX - EDAD_MIN + 1 }, (_, i) => EDAD_MIN + i);
  const marcado = (campo, valor) => String(datos[campo] ?? '') === String(valor) ? ' checked' : '';
  const teNombra = datos.teNombra ?? COMO_TE_NOMBRA[0];
  const esOtro = !COMO_TE_NOMBRA.includes(teNombra);
  return `
    <form id="form-familia-nino" class="familia-alta" novalidate>
      <div class="form-group">
        <label for="familia-nombre" class="label">Su nombre</label>
        <input id="familia-nombre" name="nombre" class="input" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" value="${esc(datos.nombre ?? '')}" />
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Su edad</legend>
        <div class="familia-edades">
          ${edades.map(e => `
            <label class="familia-opcion familia-opcion--cuadro"><input class="sr-only" type="radio" name="edad" value="${e}"${marcado('edad', e)} /><span>${e}</span></label>`).join('')}
        </div>
        <p class="form-hint">De ${EDAD_MIN} a ${EDAD_UBICACION - 1} años empieza en la unidad 1. Desde los ${EDAD_UBICACION}, Finko le hace 3 preguntas para ubicarlo.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Su dibujo</legend>
        <div class="familia-dibujos">
          ${DIBUJOS.map((d, i) => `
            <label class="familia-dibujo" style="--d: var(--fk-dom-${d.dominio})"><input class="sr-only" type="radio" name="dibujo" value="${d.id}"${datos.dibujo ? marcado('dibujo', d.id) : i === 0 ? ' checked' : ''} />${htmlDibujo(d.id, { tamano: 40 })}<span class="sr-only">${esc(d.nombre)}</span></label>`).join('')}
        </div>
        <p class="form-hint">Sin fotos: ocupan espacio y no hacen falta.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cómo te dice?</legend>
        <div class="familia-opciones">
          ${COMO_TE_NOMBRA.map(n => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="${esc(n)}"${!esOtro && teNombra === n ? ' checked' : ''} /><span>${esc(n)}</span></label>`).join('')}
          <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="otro"${esOtro ? ' checked' : ''} /><span>Otro nombre</span></label>
        </div>
        <label for="familia-otro" class="sr-only">Otro nombre</label>
        <input id="familia-otro" name="teNombraOtro" class="input familia-alta__otro" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" placeholder="Por ejemplo, Abuela" value="${esOtro ? esc(teNombra) : ''}" />
      </fieldset>
      <p class="familia-alta__ve">${iconoCategoria('c-escudo')}<span><strong>Qué verá:</strong> sus lecciones, su alcancía y su meta. No verá tus cuentas, deudas, tarjetas ni impuestos. Para volver a tu perfil se pide tu PIN.</span></p>
      ${candado ? '' : `<p class="form-hint familia-alta__candado">${icon('key')}Aún no tienes candado. Al continuar crearás tu PIN, para que nadie más entre a tu perfil.</p>`}
      ${_pie(`<button type="submit" class="btn btn-primary">Siguiente: su mesada${icon('chevron-right')}</button>`)}
    </form>`;
}

/**
 * Crear el PIN antes del primer niño (D1: el candado es obligatorio).
 *
 * @param {string} nombre - del niño, para decir para qué es.
 * @returns {string}
 */
export function htmlAltaPin(nombre) {
  return `
    <form id="form-familia-pin" class="familia-alta" novalidate>
      <p class="familia-alta__paso">Familia · tu candado</p>
      <p class="form-hint">
        Con niños en este teléfono, Finko pide un PIN para entrar a tu perfil, así ${esc(nombre)} no
        ve tus cuentas. <strong>No cifra tus datos:</strong> tapa la pantalla, nada más.
      </p>
      <div class="form-group">
        <label for="familia-pin" class="label">Tu PIN nuevo</label>
        <input id="familia-pin" name="pin" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="${PIN_LARGO_MIN} a ${PIN_LARGO_MAX} números" />
      </div>
      <div class="form-group">
        <label for="familia-pin2" class="label">Repite el PIN</label>
        <input id="familia-pin2" name="pin2" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="Otra vez" />
        <p class="form-hint">Si lo olvidas, la única salida es borrar todo, también los perfiles de los niños.</p>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Crear PIN y agregar a ${esc(nombre)}</button>
    </form>`;
}

// ── MESADA, PREMIO Y PROGRESO (APR.3e, ADR 093 D2 a D4) ──────────

/** "sábado 31 de octubre": la fecha de la mesada o del premio, en palabras. */
export const fechaCorta = (iso) => formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  .format(new Date(`${iso}T12:00:00Z`));

/**
 * Opciones del día de la mesada: días de la semana para semanal y
 * quincenal, días 1 a 28 del mes para mensual (existen todos los meses).
 *
 * @param {string} frecuencia
 * @param {number} dia
 */
export function opcionesDia(frecuencia, dia) {
  if (frecuencia === 'mensual') {
    return Array.from({ length: 28 }, (_, i) => i + 1)
      .map(d => `<option value="${d}"${d === dia ? ' selected' : ''}>Día ${d}</option>`).join('');
  }
  return DIAS_SEMANA.map((d, i) => `<option value="${i}"${i === dia ? ' selected' : ''}>${d[0].toUpperCase()}${d.slice(1)}</option>`).join('');
}

/** Opciones de la cuenta de donde sale la mesada (solo cuentas activas). */
function _cuentas(cuentas, elegida) {
  const activas = (Array.isArray(cuentas) ? cuentas : []).filter(c => c && c.activa !== false);
  if (!activas.length) return '<p class="form-hint">Necesitas una cuenta en Mis cuentas para anotarla como gasto.</p>';
  return `
    <label for="familia-cuenta" class="label">¿De qué cuenta sale?</label>
    <select id="familia-cuenta" name="cuentaId" class="input">
      ${activas.map(c => `<option value="${esc(c.id)}"${c.id === elegida ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
    </select>`;
}

/**
 * Paso 2 del alta, o cambiar la mesada (D2, D3): cuánto, cada cuánto, qué
 * día, el reparto en los tres frascos, si el niño puede mover entre frascos
 * y si se anota como gasto del tutor.
 *
 * @param {{ nombre: string, mesada?: any, cuentas?: any[], paso2?: boolean, teNombra?: string }} opciones
 */
export function htmlMesada({ nombre, mesada = null, cuentas = [], paso2 = true }) {
  const m = mesada ?? {};
  const monto = Number(m.monto) || 20_000;
  const reparto = m.reparto ?? repartoPorDefecto(monto);
  const frecuencia = m.frecuencia ?? 'semanal';
  const dia = Number.isInteger(m.dia) ? m.dia : 6;
  const anotar = m.anotarGasto !== false;
  return `
    <form id="form-familia-mesada" class="familia-alta" novalidate>
      ${paso2 ? '<p class="familia-alta__paso">Paso 2 de 2</p>' : ''}
      <h3 class="sr-only familia-alta__titulo" tabindex="-1">Mesada de ${esc(nombre)}</h3>
      <div class="form-group">
        <label for="familia-monto" class="label">¿Cuánto le das?</label>
        <div class="familia-monto"><span aria-hidden="true">$</span><input id="familia-monto" name="monto" class="input" type="text" inputmode="numeric" autocomplete="off" value="${monto.toLocaleString('es-CO')}" /></div>
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cada cuánto?</legend>
        <div class="familia-segmento">
          ${Object.entries(FRECUENCIAS_MESADA).map(([id, texto]) => `
            <label class="familia-segmento__op"><input class="sr-only" type="radio" name="frecuencia" value="${id}"${id === frecuencia ? ' checked' : ''} /><span>${texto}</span></label>`).join('')}
        </div>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label" id="familia-dia-titulo">¿Qué día?</legend>
        <div id="familia-dia-opciones">${htmlDiaMesada(frecuencia, dia)}</div>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Así se reparte en sus frascos</legend>
        <div class="familia-reparto">
          ${[['ahorrar', 'Ahorrar'], ['gastar', 'Gastar'], ['compartir', 'Compartir']].map(([id, n]) => `
            <div class="familia-reparto__fila" data-frasco="${id}">
              <span class="familia-reparto__barra" aria-hidden="true"></span>
              <label for="familia-reparto-${id}"><strong>${n}</strong><span class="familia-reparto__pct" data-pct="${id}">${_pct(reparto[id], monto)}</span></label>
              <span class="familia-reparto__campo"><span aria-hidden="true">$</span><input id="familia-reparto-${id}" name="reparto-${id}" class="input" type="text" inputmode="numeric" autocomplete="off" value="${(Number(reparto[id]) || 0).toLocaleString('es-CO')}" /></span>
            </div>`).join('')}
        </div>
        <p class="familia-suma" id="familia-suma" role="status">${htmlSumaReparto(reparto, monto)}</p>
      </fieldset>
      <label class="familia-interruptor">
        <span><strong>Puede mover dinero entre sus frascos</strong><span>Lo decide desde su alcancía</span></span>
        <input type="checkbox" role="switch" name="puedeMover"${m.puedeMover === false ? '' : ' checked'} />
      </label>
      <label class="familia-interruptor">
        <span><strong>Anotarla en mis gastos</strong><span>Como gasto de Familia, desde la cuenta que elijas</span></span>
        <input type="checkbox" role="switch" name="anotarGasto"${anotar ? ' checked' : ''} />
      </label>
      <div class="form-group familia-cuenta"${anotar ? '' : ' hidden'}>${_cuentas(cuentas, m.cuentaId)}</div>
      <p class="form-hint">${icon('info')}Finko no mueve dinero: tú se la entregas y aquí queda anotada.</p>
      ${_pie(`<button type="submit" class="btn btn-primary">${icon('check')}Guardar la mesada</button>`,
        paso2 ? '<button type="button" class="btn btn-ghost" data-action="familia-sin-mesada">Ahora no</button>' : undefined)}
    </form>`;
}

/** "50% de la mesada". */
function _pct(parte, total) {
  const t = Number(total) || 0;
  return t > 0 ? `${Math.round((Number(parte) || 0) * 100 / t)}% de la mesada` : '';
}

/** Los porcentajes de cada frasco, para repintarlos mientras el tutor escribe. */
export function porcentajesReparto(reparto, monto) {
  return Object.fromEntries(['ahorrar', 'gastar', 'compartir'].map(k => [k, _pct(reparto[k], monto)]));
}

/** "Suma $10.000, igual que la mesada." o lo que falta o sobra. */
export function htmlSumaReparto(reparto, monto) {
  const suma = ['ahorrar', 'gastar', 'compartir'].reduce((t, k) => t + (Number(reparto[k]) || 0), 0);
  if (suma === monto) return `<span class="familia-suma--ok">${icon('check')}Suma ${f(suma)}, igual que la mesada.</span>`;
  return `<span class="familia-suma--mal">${icon('alert')}Suma ${f(suma)} y la mesada es ${f(monto)}: tienen que coincidir.</span>`;
}

/**
 * El día de la mesada: los siete días como botones para cada semana o cada
 * 15 días; del 1 al 28 en una lista para cada mes (ADR 124 D10).
 *
 * @param {string} frecuencia
 * @param {number} dia
 */
export function htmlDiaMesada(frecuencia, dia) {
  if (frecuencia === 'mensual') {
    return `<label for="familia-dia" class="sr-only">Día del mes</label>
        <select id="familia-dia" name="dia" class="input">${opcionesDia(frecuencia, dia)}</select>`;
  }
  const orden = [1, 2, 3, 4, 5, 6, 0];
  return `<div class="familia-dias" role="radiogroup" aria-labelledby="familia-dia-titulo">${orden.map(i => `
          <label class="familia-opcion familia-opcion--cuadro"><input class="sr-only" type="radio" name="dia" value="${i}"${i === dia ? ' checked' : ''} /><span>${DIAS_SEMANA[i][0].toUpperCase()}${DIAS_SEMANA[i].slice(1)}</span></label>`).join('')}
        </div>`;
}

/**
 * Premio por ahorrar (D4): las tres tasas con el resultado de hoy, la fecha
 * de pago y la verdad sobre el interés.
 *
 * @param {any} perfil
 * @param {string} hoyISO
 */
export function htmlPremio(perfil, hoyISO) {
  const elegida = perfil.premio?.tasa ?? TASA_POR_DEFECTO;
  const prox = proximoPremio(perfil, hoyISO, elegida);
  return `
    <form id="form-familia-premio" class="familia-alta" novalidate>
      <h3 class="sr-only familia-alta__titulo" tabindex="-1">Premio por ahorrar</h3>
      <p class="familia-alta__texto">Cada mes le sumas a ${esc(perfil.nombre)} un poco de lo que tuvo guardado todo el mes en Ahorrar. Así ve que el dinero quieto crece.</p>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="sr-only">¿Cuánto le sumas cada mes?</legend>
        <div class="familia-tasas">
          ${Object.entries(TASAS_PREMIO).map(([id, t]) => {
            const hoy = proximoPremio(perfil, hoyISO, id).monto;
            return `<label class="familia-tasa"><input class="sr-only" type="radio" name="tasa" value="${id}"${id === elegida ? ' checked' : ''} /><span><i class="familia-tasa__radio" aria-hidden="true"></i><strong>${t.texto}</strong><em>hoy serían <b>${f(hoy)}</b></em></span></label>`;
          }).join('')}
        </div>
      </fieldset>
      <p class="familia-nota">${icon('info')}<span>Un 10% al mes es mucho más que cualquier interés real. Es grande a propósito, para que lo note. Sale de tu dinero y se anota como gasto de Familia. Solo cuenta lo que guardó todo el mes.</span></p>
      <p class="familia-premio__resumen" id="familia-premio-resumen">${htmlResumenPremio(prox)}</p>
      ${perfil.premio ? '<button type="button" class="btn btn-ghost btn-block familia-quitar-premio" data-action="familia-quitar-premio">Quitar el premio</button>' : ''}
      ${_pie(`<button type="submit" class="btn btn-primary">${icon('check')}${perfil.premio ? 'Guardar el premio' : 'Activar el premio'}</button>`)}
    </form>`;
}

/** "Con lo que tiene hoy ($26.200), el 1 de dic le sumas $2.620." */
export function htmlResumenPremio(prox) {
  return `Con lo que tiene hoy (${f(prox.ahorrado)}), el ${_diaMesCorto(prox.fechaISO)} le sumas <strong>${f(prox.monto)}</strong>.`;
}

/** "1 de dic": la fecha corta, con el mes abreviado. */
const _diaMesCorto = (iso) => formateadorFecha('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  .format(new Date(`${iso}T12:00:00Z`)).replace('.', '');

/**
 * Progreso del niño para el tutor (D2): mesada, lo que aprende, su alcancía,
 * su meta, el premio y lo que hizo esta semana, con "Entrar como".
 *
 * @param {any} perfil
 * @param {string} hoyISO
 */
export function htmlProgresoNino(perfil, hoyISO) {
  const s = saldosFrascos(perfil);
  const hechas = perfil.aprende?.hechas ?? {};
  const unidades = UNIDADES_NINO.filter(u => unidadTerminada(u, hechas)).length;
  const pendiente = mesadaPendiente(perfil.mesada, hoyISO);
  const premioPend = premioPendiente(perfil, hoyISO);
  const tasa = perfil.premio ? TASAS_PREMIO[perfil.premio.tasa] : null;
  const proxPremio = perfil.premio ? proximoPremio(perfil, hoyISO) : null;
  const meta = (Array.isArray(perfil.metas) ? perfil.metas : []).find(x => x && !x.lograda);
  const avisos = `${pendiente ? `
      <section class="familia-aviso" aria-labelledby="familia-aviso-mesada">
        <p class="familia-aviso__titulo" id="familia-aviso-mesada">Mesada del ${_diaSemana(pendiente)} ${_diaMesCorto(pendiente)}: ${f(perfil.mesada.monto)}</p>
        <p class="familia-aviso__texto">Finko no mueve dinero: tú se la entregas y aquí queda anotada en sus frascos.</p>
        <button class="familia-boton-acento" type="button" data-action="familia-entregada" data-id="${esc(perfil.id)}">${icon('check')}Se la entregué</button>
      </section>` : ''}${premioPend?.monto > 0 ? `
      <section class="familia-aviso" aria-labelledby="familia-aviso-premio">
        <p class="familia-aviso__titulo" id="familia-aviso-premio">Premio de ${_mes(premioPend.mes)}: ${f(premioPend.monto)}</p>
        <p class="familia-aviso__texto">Sale de tu dinero y entra a su frasco Ahorrar.</p>
        <button class="familia-boton-acento" type="button" data-action="familia-pagar-premio" data-id="${esc(perfil.id)}">${icon('check')}Sumar ${f(premioPend.monto)}</button>
      </section>` : ''}`;
  const datos = [
    ['Aprende', `${unidades} de ${UNIDADES_NINO.length} unidades · ${_semanas((perfil.aprende?.semanas ?? []).length)}`],
    ['Su alcancía', f(s.total)],
    ['Ahorrar · Gastar · Compartir', `${f(s.ahorrar)} · ${f(s.gastar)} · ${f(s.compartir)}`],
    ...(meta ? [['Su meta', `${esc(meta.nombre)} · le faltan ${f(Math.max(0, meta.precio - s.ahorrar))}`]] : []),
    ...(tasa ? [['Premio', `${tasa.texto} · el ${_diaMesCorto(proxPremio.fechaISO)}: ${f(proxPremio.monto)}`]] : []),
  ];
  const semana = (Array.isArray(perfil.movimientos) ? perfil.movimientos : [])
    .filter(m => m?.fecha && m.fecha >= _haceDias(hoyISO, 7))
    .slice(-6).reverse()
    .map(m => `<li><span>${_textoMovimiento(m)}</span><span class="familia-progreso__fecha">${esc(m.fecha === hoyISO ? 'Hoy' : fechaCorta(m.fecha))}</span></li>`).join('');
  const fila = (accion, icono, titulo, sub, extra = '') => `
        <li><button class="familia-accion" type="button" data-action="${accion}" data-id="${esc(perfil.id)}"${extra}>
          <span class="familia-accion__teja" aria-hidden="true">${icono}</span>
          <span class="familia-accion__textos"><span class="familia-accion__titulo">${titulo}</span><span class="familia-accion__sub">${sub}</span></span>
          ${icon('chevron-right')}
        </button></li>`;
  const cuando = perfil.mesada ? `${f(perfil.mesada.monto)} ${textoFrecuencia(perfil.mesada)}` : 'Aún no tiene mesada';
  return `
    <div class="familia-progreso">
      <h3 class="sr-only familia-alta__titulo" tabindex="-1">Progreso de ${esc(perfil.nombre)}</h3>${avisos}
      <ul class="familia-datos">${datos.map(([k, v]) => `
        <li><span>${k}</span><strong>${v}</strong></li>`).join('')}
      </ul>${semana ? `
      <section class="familia-semana" aria-labelledby="familia-semana-titulo">
        <h4 id="familia-semana-titulo">Esta semana</h4>
        <ul class="familia-progreso__lista">${semana}</ul>
      </section>` : ''}
      <ul class="familia-acciones">
        ${fila('familia-mesada', icon('edit'), perfil.mesada ? 'Cambiar la mesada' : 'Fijar la mesada', cuando)}
        ${fila('familia-premio', icon('trending-up'), perfil.premio ? 'Cambiar el premio' : 'Activar el premio por ahorrar', tasa ? `${tasa.texto} guardados` : 'Le suma un poco de lo que ahorra')}
        ${fila('nube-vincular-nino', iconoCategoria('c-telefono'), 'Pasar a su teléfono', 'Con un código, en su propio celular')}
      </ul>
      <button class="btn btn-secondary btn-block" type="button" data-action="familia-entrar" data-id="${esc(perfil.id)}">Entrar como ${esc(perfil.nombre)}</button>
      <div class="familia-quitar">
        <button class="familia-quitar__boton" type="button" data-action="familia-eliminar" data-id="${esc(perfil.id)}">${icon('trash')}Quitar a ${esc(perfil.nombre)} de Finko</button>
        <p>Se borra su alcancía y su progreso. Te pediremos confirmar.</p>
      </div>
    </div>`;
}

/** "1 semana", "5 semanas": las semanas en que aprendió algo. */
const _semanas = (n) => (n === 1 ? '1 semana' : `${n} semanas`);

/** "octubre": el mes de un `YYYY-MM`. */
const _mes = (ym) => formateadorFecha('es-CO', { month: 'long', timeZone: 'UTC' }).format(new Date(`${ym}-15T12:00:00Z`));

/** `YYYY-MM-DD` de hace `n` días. */
function _haceDias(hoyISO, n) {
  const d = new Date(`${hoyISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Lo que hizo el niño, dicho para el tutor: "Gastó $3.000 en un helado". */
function _textoMovimiento(m) {
  const monto = f(Math.abs(Number(m.monto) || 0));
  const nota = m.nota ? ` en ${esc(m.nota)}` : '';
  const frasco = { ahorrar: 'Ahorrar', gastar: 'Gastar', compartir: 'Compartir' }[m.frasco] ?? '';
  if (m.tipo === 'mesada') return `Recibió ${monto} de su mesada en ${frasco}`;
  if (m.tipo === 'premio') return `Recibió ${monto} de premio por ahorrar`;
  if (m.tipo === 'guarde') return `Guardó ${monto} en ${frasco}${m.nota ? ` (${esc(m.nota)})` : ''}`;
  if (m.tipo === 'gaste') return `Gastó ${monto}${nota}`;
  if (m.tipo === 'comparti') return `Compartió ${monto}${nota}`;
  if (m.tipo === 'meta') return `Compró su meta: ${esc(m.nota)}`;
  return Number(m.monto) < 0 ? `Sacó ${monto} de ${frasco}` : `Puso ${monto} en ${frasco}`;
}

