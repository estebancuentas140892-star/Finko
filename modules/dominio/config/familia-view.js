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
import { icon } from '../../infra/icons.js';
import { DIBUJOS, htmlDibujo, dibujoPorId } from '../../infra/ilustraciones.js';
import { EDAD_MIN, EDAD_MAX, NOMBRE_MAX, COMO_TE_NOMBRA, saldosFrascos } from '../../infra/perfiles.js';
import { UNIDADES_NINO, unidadTerminada } from '../../infra/ruta-aprende.js';
import {
  FRECUENCIAS_MESADA, DIAS_SEMANA, TASAS_PREMIO, TASA_POR_DEFECTO, repartoPorDefecto,
  proximaMesada, mesadaPendiente, premioPendiente, proximoPremio,
} from '../../infra/mesada.js';
export { textoFrecuencia } from '../../infra/mesada.js';
import { PIN_LARGO_MIN, PIN_LARGO_MAX } from './bloqueo.js';

/** Desde esta edad la ruta del niño empieza con preguntas de ubicación (D9). */
export const EDAD_UBICACION = 10;

/** El dibujo del niño dentro de su teja de color. */
function _avatar(perfil, tamano = 40) {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav kidav--sm" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

/**
 * La tarjeta Familia de Ajustes.
 *
 * @param {import('../../infra/perfiles.js').PerfilNino[]} ninos
 * @returns {string}
 */
export function htmlFamilia(ninos, hoyISO = '') {
  const lista = ninos.length ? `
      <ul class="familia-lista">
        ${ninos.map(p => `
          <li class="familia-nino">
            ${_avatar(p)}
            <div class="familia-nino__datos">
              <p class="familia-nino__nombre">${esc(p.nombre)}</p>
              <p class="familia-nino__meta">${p.edad} años · te dice ${esc(p.teNombra)}${mesadaPendiente(p.mesada, hoyISO) ? ' · <strong class="familia-nino__aviso">mesada por entregar</strong>' : ''}</p>
            </div>
            <div class="familia-nino__acciones">
              <button class="btn btn-secondary btn-sm" type="button" data-action="familia-progreso" data-id="${esc(p.id)}">Ver progreso</button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="nube-vincular-nino" data-id="${esc(p.id)}">Su teléfono</button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="familia-entrar" data-id="${esc(p.id)}">Entrar como ${esc(p.nombre)}</button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="familia-eliminar" data-id="${esc(p.id)}"
                      aria-label="Eliminar el perfil de ${esc(p.nombre)}">${icon('trash')}</button>
            </div>
          </li>`).join('')}
      </ul>` : `
      <p class="form-hint">
        Comparte Finko con tus hijos de ${EDAD_MIN} a ${EDAD_MAX} años. Cada uno tiene su perfil, sus lecciones
        y su alcancía, y no ve nada tuyo.
      </p>`;
  return `
    <section class="config-section" aria-labelledby="config-familia-title" id="config-familia">
      <h2 class="config-section__title" id="config-familia-title">Familia</h2>
      ${lista}
      <div class="config-form__guardar">
        <button class="btn btn-secondary" type="button" data-action="familia-agregar">${icon('plus')}${ninos.length ? 'Agregar otro niño' : 'Agregar un niño'}</button>
      </div>
    </section>`;
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
      <p class="familia-alta__paso">Familia · paso 1 de 2</p>
      <div class="form-group">
        <label for="familia-nombre" class="label">Nombre</label>
        <input id="familia-nombre" name="nombre" class="input" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" value="${esc(datos.nombre ?? '')}" />
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Edad</legend>
        <div class="familia-opciones">
          ${edades.map(e => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="edad" value="${e}"${marcado('edad', e)} /><span>${e}</span></label>`).join('')}
        </div>
        <p class="form-hint">Con ${EDAD_MIN} a ${EDAD_UBICACION - 1} años, la ruta empieza en la unidad 1. Desde los ${EDAD_UBICACION}, primero responde 3 preguntas de ubicación.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Su dibujo</legend>
        <div class="familia-dibujos">
          ${DIBUJOS.map((d, i) => `
            <label class="familia-dibujo"><input class="sr-only" type="radio" name="dibujo" value="${d.id}"${datos.dibujo ? marcado('dibujo', d.id) : i === 0 ? ' checked' : ''} />${htmlDibujo(d.id, { tamano: 48 })}<span>${esc(d.nombre)}</span></label>`).join('')}
        </div>
        <p class="form-hint">Sin fotos: ocupan espacio y no hacen falta.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cómo te nombra?</legend>
        <div class="familia-opciones">
          ${COMO_TE_NOMBRA.map(n => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="${esc(n)}"${!esOtro && teNombra === n ? ' checked' : ''} /><span>${esc(n)}</span></label>`).join('')}
          <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="otro"${esOtro ? ' checked' : ''} /><span>Otro nombre</span></label>
        </div>
        <label for="familia-otro" class="sr-only">Otro nombre</label>
        <input id="familia-otro" name="teNombraOtro" class="input familia-alta__otro" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" placeholder="Por ejemplo, Abuela" value="${esOtro ? esc(teNombra) : ''}" />
        <p class="form-hint">Así te nombra en su alcancía: «Papá te suma $1 por cada $10».</p>
      </fieldset>
      <div class="familia-alta__ve">
        <p class="familia-alta__ve-titulo">${icon('eye')}Lo que verá</p>
        <p>Sus lecciones, su alcancía y sus metas.</p>
        <p>Nada tuyo: ni cuentas, ni deudas, ni tarjetas, ni impuestos. Tampoco puede exportar datos.</p>
      </div>
      ${candado ? '' : `<p class="form-hint familia-alta__candado">${icon('key')}Aún no tienes candado. Al continuar crearás tu PIN, para que nadie más entre a tu perfil.</p>`}
      <button type="submit" class="btn btn-primary btn-block">Continuar</button>
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
  return `
    <form id="form-familia-mesada" class="familia-alta" novalidate>
      <p class="familia-alta__paso">${paso2 ? 'Familia · paso 2 de 2' : 'Familia'}</p>
      <h3 class="familia-alta__titulo" tabindex="-1">Mesada de ${esc(nombre)}</h3>
      <div class="form-group">
        <label for="familia-monto" class="label">¿Cuánto le das?</label>
        <input id="familia-monto" name="monto" class="input" type="text" inputmode="numeric" autocomplete="off" value="${monto.toLocaleString('es-CO')}" />
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cada cuánto?</legend>
        <div class="familia-opciones">
          ${Object.entries(FRECUENCIAS_MESADA).map(([id, texto]) => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="frecuencia" value="${id}"${id === frecuencia ? ' checked' : ''} /><span>${texto}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="form-group">
        <label for="familia-dia" class="label">¿Qué día?</label>
        <select id="familia-dia" name="dia" class="input">${opcionesDia(frecuencia, dia)}</select>
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Así se reparte en sus frascos</legend>
        <div class="familia-reparto">
          ${[['ahorrar', 'Ahorrar', 'La mitad, para sus metas'], ['gastar', 'Gastar', 'Para la tienda del colegio y gustos'], ['compartir', 'Compartir', 'Para regalar o ayudar']].map(([id, n, d]) => `
            <div class="familia-reparto__fila" data-frasco="${id}">
              <label for="familia-reparto-${id}"><strong>${n}</strong><span>${d}</span></label>
              <input id="familia-reparto-${id}" name="reparto-${id}" class="input" type="text" inputmode="numeric" autocomplete="off" value="${(Number(reparto[id]) || 0).toLocaleString('es-CO')}" />
            </div>`).join('')}
        </div>
      </fieldset>
      <label class="familia-interruptor">
        <input type="checkbox" name="puedeMover"${m.puedeMover === false ? '' : ' checked'} />
        <span><strong>${esc(nombre)} puede mover dinero entre frascos</strong><span>Decidir también es parte de aprender.</span></span>
      </label>
      <label class="familia-interruptor">
        <input type="checkbox" name="anotarGasto"${m.anotarGasto === false ? '' : ' checked'} />
        <span><strong>Anotarla como gasto tuyo</strong><span>Cuando marques «Entregada», Finko la registra en tus Gastos, categoría Familia.</span></span>
      </label>
      <div class="form-group">${_cuentas(cuentas, m.cuentaId)}</div>
      <p class="form-hint">${icon('info')}Finko no mueve dinero: tú se la entregas y aquí queda anotada.</p>
      <button type="submit" class="btn btn-primary btn-block">Guardar la mesada</button>
      ${paso2 ? '<button type="button" class="btn btn-ghost btn-block" data-action="familia-sin-mesada">Ahora no</button>' : ''}
    </form>`;
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
      <p class="familia-alta__paso">Familia</p>
      <h3 class="familia-alta__titulo" tabindex="-1">Premio por ahorrar</h3>
      <p class="form-hint">Cada mes le sumas a ${esc(perfil.nombre)} un poco de lo que tiene guardado. Así ve qué es el interés: lo que te pagan por dejar tu dinero quieto.</p>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cuánto le sumas cada mes?</legend>
        <div class="familia-tasas">
          ${Object.entries(TASAS_PREMIO).map(([id, t]) => {
            const hoy = proximoPremio(perfil, hoyISO, id).monto;
            return `<label class="familia-tasa"><input class="sr-only" type="radio" name="tasa" value="${id}"${id === elegida ? ' checked' : ''} /><span><strong>${t.texto}</strong>hoy: ${f(hoy)}</span></label>`;
          }).join('')}
        </div>
      </fieldset>
      <p class="familia-premio__resumen" id="familia-premio-resumen">Con lo que tiene en Ahorrar (${f(prox.ahorrado)}), el ${fechaCorta(prox.fechaISO)} le sumas <strong>${f(prox.monto)}</strong>.</p>
      <p class="form-hint"><strong>Solo sobre lo que guardó todo el mes.</strong> Si saca dinero de Ahorrar, el premio se calcula sobre lo que quedó.</p>
      <p class="form-hint">Sale de tu dinero y se anota en tus Gastos, categoría Familia. En un banco el interés es mucho menor: el premio es más grande para que ${esc(perfil.nombre)} lo note.</p>
      <button type="submit" class="btn btn-primary btn-block">${perfil.premio ? 'Guardar el premio' : 'Activar el premio'}</button>
      ${perfil.premio ? '<button type="button" class="btn btn-ghost btn-block" data-action="familia-quitar-premio">Quitar el premio</button>' : ''}
    </form>`;
}

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
  const proxima = proximaMesada(perfil.mesada, hoyISO);
  const mesada = !perfil.mesada
    ? `<p class="form-hint">Aún no tiene mesada.</p>
       <button class="btn btn-secondary btn-sm" type="button" data-action="familia-mesada" data-id="${esc(perfil.id)}">Fijar la mesada</button>`
    : `${pendiente ? `<p class="familia-progreso__aviso">Toca entregar la mesada del ${fechaCorta(pendiente)}: ${f(perfil.mesada.monto)}.</p>
        <button class="btn btn-primary btn-sm" type="button" data-action="familia-entregada" data-id="${esc(perfil.id)}">Entregada</button>`
        : `<p>Al día. La próxima: ${proxima ? fechaCorta(proxima) : 'sin fecha'}, ${f(perfil.mesada.monto)}.</p>`}
       <button class="btn btn-ghost btn-sm" type="button" data-action="familia-mesada" data-id="${esc(perfil.id)}">Cambiar la mesada</button>`;
  const premioPend = premioPendiente(perfil, hoyISO);
  const premio = !perfil.premio
    ? `<button class="btn btn-secondary btn-sm" type="button" data-action="familia-premio" data-id="${esc(perfil.id)}">Activar el premio por ahorrar</button>`
    : `<p>Activo: le sumas ${TASAS_PREMIO[perfil.premio.tasa]?.texto ?? ''} que tiene en Ahorrar.</p>
       ${premioPend ? `<p class="familia-progreso__aviso">Le debes el premio de ${premioPend.mes}: ${f(premioPend.monto)}.</p>
         <button class="btn btn-primary btn-sm" type="button" data-action="familia-pagar-premio" data-id="${esc(perfil.id)}"${premioPend.monto > 0 ? '' : ' disabled'}>Sumar ${f(premioPend.monto)}</button>` : ''}
       <button class="btn btn-ghost btn-sm" type="button" data-action="familia-premio" data-id="${esc(perfil.id)}">Cambiar el premio</button>`;
  const semana = (Array.isArray(perfil.movimientos) ? perfil.movimientos : [])
    .filter(m => m?.fecha && m.fecha >= _haceDias(hoyISO, 7))
    .slice(-6).reverse()
    .map(m => `<li><span>${_textoMovimiento(m)}</span><span class="familia-progreso__fecha">${esc(m.fecha === hoyISO ? 'Hoy' : fechaCorta(m.fecha))}</span></li>`).join('');
  const meta = (Array.isArray(perfil.metas) ? perfil.metas : []).find(x => x && !x.lograda);
  return `
    <div class="familia-progreso">
      <p class="familia-alta__paso">Familia</p>
      <h3 class="familia-alta__titulo" tabindex="-1">${esc(perfil.nombre)}</h3>
      <p class="form-hint">${perfil.edad} años · ${_semanas((perfil.aprende?.semanas ?? []).length)}</p>
      <section class="familia-progreso__bloque"><h4>Mesada</h4>${mesada}</section>
      <section class="familia-progreso__bloque"><h4>Lo que aprende</h4><p>${unidades} de ${UNIDADES_NINO.length} unidades.</p></section>
      <section class="familia-progreso__bloque">
        <h4>Su alcancía · ${f(s.total)}</h4>
        <p>Ahorrar ${f(s.ahorrar)} · Gastar ${f(s.gastar)} · Compartir ${f(s.compartir)}</p>
        ${meta ? `<p>Meta: ${esc(meta.nombre)} de ${f(meta.precio)}. Le faltan ${f(Math.max(0, meta.precio - s.ahorrar))}.</p>` : ''}
      </section>
      <section class="familia-progreso__bloque"><h4>Premio por ahorrar</h4>${premio}</section>
      <section class="familia-progreso__bloque"><h4>Esta semana</h4>${semana ? `<ul class="familia-progreso__lista">${semana}</ul>` : '<p class="form-hint">Sin movimientos esta semana.</p>'}</section>
      <button class="btn btn-secondary btn-block" type="button" data-action="familia-entrar" data-id="${esc(perfil.id)}">Entrar como ${esc(perfil.nombre)}</button>
    </div>`;
}

/** "1 semana activa", "6 semanas activas". */
const _semanas = (n) => (n === 1 ? "1 semana activa" : `${n} semanas activas`);

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

