/**
 * personales/telefono.js - Me deben en el teléfono (ADR 135 D7).
 *
 * El tablero "rediseño4" dice lo mismo que la lista de escritorio, en filas:
 * arriba "Te deben" suelto con lo devuelto en una pastilla y su barra; los
 * grupos de urgencia en frase con su suma; cada préstamo una fila que abre su
 * hoja, con un círculo a la derecha para "Me pagó". Desde 1024px sigue la
 * lista de siempre (DSK.5, ADR 074).
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc, tiempoRelativo } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import {
  calcularPendiente, estadoPrestamo, porcentajePagado, calcularResumen, agruparPersonalesPorUrgencia,
  historialAbonos, tieneInteres,
} from './logic.js';

/** Días enteros entre una fecha ISO y `hoy`, a medianoche. */
function _diasDesde(iso, hoy) {
  if (!iso) return 0;
  const a = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  const b = new Date(hoy);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Cuándo, en la línea de la fila (ADR 135 D7): lo pactado si hay fecha
 * ("Pactó devolver en 17 días", "Pactó devolver el 31 de oct") y, sin fecha,
 * desde cuándo ("Prestado hace 1 mes"). El tono dice la urgencia: rojo si ya
 * pasó, ámbar si es hoy o dentro de un mes.
 *
 * @param {import('./logic.js').Personal} prestamo
 * @param {Date} hoy
 * @returns {{ texto: string, tono: '' | 'atencion' | 'peligro' }}
 */
export function cuandoPrestamo(prestamo, hoy = new Date()) {
  const estado = estadoPrestamo(prestamo, hoy);
  if (prestamo?.fechaLimite && estado.tipo !== 'liquidado') {
    if (estado.tipo === 'vencido') return { texto: `Pactó devolver el ${fechaLegible(prestamo.fechaLimite)}`, tono: 'peligro' };
    if (estado.tipo === 'hoy') return { texto: 'Pactó devolver hoy', tono: 'atencion' };
    if (estado.dias === 1) return { texto: 'Pactó devolver mañana', tono: 'atencion' };
    if (estado.dias <= 30) return { texto: `Pactó devolver en ${estado.dias} días`, tono: 'atencion' };
    return { texto: `Pactó devolver el ${fechaLegible(prestamo.fechaLimite)}`, tono: '' };
  }
  return { texto: `Prestado ${tiempoRelativo(_diasDesde(prestamo?.fecha, hoy))}`, tono: '' };
}

/**
 * Una fila de préstamo. El cuerpo abre la hoja del préstamo
 * (`personal-detalle`); el círculo registra el pago (`pagar-personal`).
 *
 * @param {import('./logic.js').Personal} p
 * @param {Date} hoy
 * @param {(n: number) => string} m
 * @returns {string}
 */
function _fila(p, hoy, m) {
  const id        = _esc(p.id);
  const persona   = _esc(p.persona);
  const motivo    = (p.motivo ?? '').trim();
  const pendiente = calcularPendiente(p, hoy);
  const liquidado = pendiente <= 0;

  if (liquidado) {
    const partes = [`<strong class="medeben-fila__monto">${m(p.monto)}</strong>`, motivo && _esc(motivo), 'te pagó todo'].filter(Boolean);
    return `
        <li class="medeben-fila medeben-fila--pagado">
          <button type="button" class="medeben-fila__abrir" data-action="personal-detalle" data-id="${id}"
                  aria-haspopup="dialog" aria-label="Ver detalle: ${persona}">
            <span class="medeben-fila__teja medeben-fila__teja--pagado" aria-hidden="true">${icon('check')}</span>
            <span class="medeben-fila__textos">
              <span class="medeben-fila__nombre">${persona}</span>
              <span class="medeben-fila__linea">${partes.join(' · ')}</span>
            </span>
          </button>
        </li>`;
  }

  const abonado = (Number(p.pagado) || 0) > 0;
  const pct     = porcentajePagado(p);
  const cuando  = cuandoPrestamo(p, hoy);
  const cuandoHtml = cuando.tono
    ? `<span class="medeben-fila__cuando medeben-fila__cuando--${cuando.tono}">${_esc(cuando.texto)}</span>`
    : _esc(cuando.texto);
  const detalle = [
    cuandoHtml,
    motivo && _esc(motivo),
    !p.cuentaId && '<span class="medeben-fila__cuando medeben-fila__cuando--atencion">solo seguimiento</span>',
  ].filter(Boolean).join(' · ');

  return `
        <li class="medeben-fila">
          <button type="button" class="medeben-fila__abrir" data-action="personal-detalle" data-id="${id}"
                  aria-haspopup="dialog" aria-label="Ver detalle: ${persona}">
            <span class="medeben-fila__teja" aria-hidden="true">${icon('personales')}</span>
            <span class="medeben-fila__textos">
              <span class="medeben-fila__nombre">${persona}</span>
              <span class="medeben-fila__linea"><strong class="medeben-fila__monto">${m(pendiente)}</strong> por cobrar${abonado ? ` · de ${m(p.monto)}` : ''}</span>
              ${abonado ? `<span class="medeben-barra medeben-barra--fila" aria-hidden="true"><span style="width:${pct}%"></span></span>` : ''}
              <span class="medeben-fila__linea medeben-fila__detalle">${detalle}</span>
            </span>
          </button>
          <button type="button" class="medeben-fila__pago" data-action="pagar-personal" data-id="${id}"
                  aria-label="Me pagó ${persona}">
            <span class="medeben-fila__circulo" aria-hidden="true">${icon('check')}</span>
          </button>
        </li>`;
}

/**
 * Me deben en el teléfono.
 *
 * @param {{ lista: import('./logic.js').Personal[], hoy: Date, oculto: boolean, porPersona?: string }} p
 * @returns {string}
 */
export function htmlPersonalesTelefono({ lista, hoy, oculto, porPersona = '' }) {
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const r = calcularResumen(lista, hoy);
  const { vencidos, vencenHoy, sinFecha, adelante, liquidados } = agruparPersonalesPorUrgencia(lista, hoy);
  const pctDevuelto = r.totalPrestado > 0 ? Math.min(100, Math.round((r.totalCobrado / r.totalPrestado) * 100)) : 0;

  const total = `
    <section class="medeben-total" aria-label="Te deben">
      <p class="medeben-total__rotulo">Te deben</p>
      <p class="medeben-total__cifra">${oculto ? SALDO_MASCARA : f(r.totalPendiente)}</p>
      <p class="medeben-total__chip">${icon('personales')}<span>Te han devuelto <strong>${m(r.totalCobrado)}</strong> de ${m(r.totalPrestado)}</span></p>
      <span class="medeben-barra" aria-hidden="true"><span style="width:${pctDevuelto}%"></span></span>
    </section>`;

  const hayActivos = vencidos.length + vencenHoy.length + sinFecha.length + adelante.length > 0;
  const nota = hayActivos ? `
    <p class="medeben-nota"><span class="medeben-fila__circulo medeben-fila__circulo--nota" aria-hidden="true">${icon('check')}</span><span>Toca el círculo cuando te paguen, aunque sea una parte. Finko te pregunta cuánto y a qué cuenta entró.</span></p>` : '';

  const grupo = (titulo, g, conSuma = true) => {
    if (g.length === 0) return '';
    const suma = g.reduce((s, p) => s + Math.max(0, calcularPendiente(p, hoy)), 0);
    return `
    <section class="medeben-grupo" aria-label="${titulo}">
      <div class="medeben-grupo__cabeza">
        <h2 class="medeben-grupo__titulo${conSuma ? '' : ' medeben-grupo__titulo--pasado'}">${titulo}</h2>
        ${conSuma ? `<p class="medeben-grupo__suma">${m(suma)}</p>` : ''}
      </div>
      <ul class="medeben-lista" role="list">${g.map(p => _fila(p, hoy, m)).join('')}
      </ul>
    </section>`;
  };

  return `
    ${total}
    ${nota}
    ${grupo('La fecha ya pasó', vencidos)}
    ${grupo('La fecha es hoy', vencenHoy)}
    ${grupo('Sin fecha pactada', sinFecha)}
    ${grupo('Con fecha por delante', adelante)}
    ${grupo('Ya te pagaron', liquidados, false)}
    ${porPersona}`;
}

/**
 * La hoja de un préstamo (ADR 135 D8): cuánto falta, cuánto devolvió y su
 * parte; cuándo le prestaste y de qué cuenta, lo pactado, el motivo y los
 * abonos; "Me pagó", "Editar el préstamo" y, aparte, "Eliminar el préstamo".
 * Las acciones pasan por `registrar-abrir`, que cierra la hoja antes de abrir
 * su formulario o su confirmación (ADR 133 D4).
 *
 * @param {import('./logic.js').Personal} prestamo
 * @param {Date} [hoy]
 * @returns {string}
 */
export function htmlDetallePrestamo(prestamo, hoy = new Date()) {
  const oculto    = S.config?.ocultarSaldo === true;
  const m         = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id        = _esc(prestamo.id);
  const persona   = _esc(prestamo.persona);
  const pendiente = calcularPendiente(prestamo, hoy);
  const liquidado = pendiente <= 0;
  const devuelto  = Number(prestamo.pagado) || 0;
  const pct       = porcentajePagado(prestamo);

  const cuenta = prestamo.cuentaId ? (S.cuentas ?? []).find(c => c.id === prestamo.cuentaId) : null;
  const prestaste = [prestamo.fecha ? fechaLegible(prestamo.fecha) : '', cuenta ? `de ${_esc(cuenta.nombre)}` : 'solo seguimiento']
    .filter(Boolean).join(' · ');
  const estado = estadoPrestamo(prestamo, hoy);
  const enDias = estado.tipo === 'proximo' ? ` · en ${estado.dias} ${estado.dias === 1 ? 'día' : 'días'}`
    : estado.tipo === 'hoy' ? ' · hoy'
      : '';
  const pacto = prestamo.fechaLimite ? `${fechaLegible(prestamo.fechaLimite)}${enDias}` : 'Sin fecha';
  const abonos = historialAbonos(prestamo)
    .map(a => `${a.agrupado ? 'Antes de este historial' : (a.fecha ? fechaLegible(a.fecha) : 'Sin fecha')} · ${m(a.monto)}`);
  const datos = [
    ['Le prestaste', prestaste],
    ['Pactó devolver', pacto],
    tieneInteres(prestamo) && ['Interés', `${_esc(String(prestamo.tasa))}% mensual`],
    (prestamo.motivo ?? '').trim() && ['Motivo', _esc(prestamo.motivo.trim())],
    abonos.length > 0 && ['Abonos', abonos.join('<br>')],
  ].filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const puente = (accion) => `data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}"`;
  const pagar = liquidado ? '' : `
      <button type="button" class="btn-dominio btn-dominio--bloque detalle-fila__accion" data-dom="personales" ${puente('pagar-personal')}>${icon('check')}Me pagó</button>`;

  return `
    <div class="detalle-fila__cabeza" data-prestamo-id="${id}">
      <div class="detalle-fila__icono medeben-fila__teja${liquidado ? ' medeben-fila__teja--pagado' : ''}" aria-hidden="true">${icon(liquidado ? 'check' : 'personales')}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${persona}</h2>
        <p class="detalle-fila__sub">Préstamo</p>
      </div>
    </div>
    <div class="detalle-prestamo__cifra">
      <p class="detalle-fila__monto">${liquidado ? m(prestamo.monto) : m(pendiente)}</p>
      <span class="detalle-prestamo__que">${liquidado ? 'te pagó todo' : 'por cobrar'}</span>
    </div>
    ${liquidado ? '' : `<p class="detalle-prestamo__devuelto">Te devolvió ${m(devuelto)} de ${m(prestamo.monto)} · ${pct}%</p>
    <span class="medeben-barra" aria-hidden="true"><span style="width:${pct}%"></span></span>`}
    <dl class="detalle-gasto__datos">${datos}
    </dl>
    <div class="detalle-fila__acciones">${pagar}
      <button type="button" class="btn btn-secondary detalle-fila__accion" ${puente('editar-personal')}>${icon('edit')}Editar el préstamo</button>
    </div>
    <div class="detalle-fila__peligro">
      <button type="button" class="btn btn-ghost detalle-fila__accion detalle-fila__accion--peligro" ${puente('eliminar-personal')}>${icon('trash')}Eliminar el préstamo</button>
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}
