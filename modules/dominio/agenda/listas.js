/**
 * agenda/listas.js - lo del mes en listas, bajo el calendario del teléfono
 * (ADR 134 D4), y la frase de lo próximo de la tarjeta del mes (D2).
 *
 * El tablero "rediseño3" pone debajo del mes, sin tocar ningún día, lo que
 * ya venció, lo que falta este mes y lo que entró, cada uno en una tarjeta
 * con una fila por pago. La fila abre su día (la hoja del día, ADR 118).
 * En escritorio el detalle del día ya vive al lado del mes (ADR 071 D7) y las
 * listas no se pintan.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, fechaLegible, formateadorFecha } from '../../infra/utils.js';
import { tejaCategoria } from '../../infra/icons.js';
import { resolverMarca, tejaMarca } from '../../infra/marcas.js';
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { ICONO_TIPO } from '../compromisos/logic.js';
import { pendientesDePagoDelMes, eventosIngresosDelMes } from './logic.js';
import { montosOcultos } from '../../infra/privacidad.js';

/** Qué es cada pago, dicho al final de su fila. */
const _QUE_ES = { fijo: 'gasto fijo', 'deuda-entidad': 'cuota de deuda', 'deuda-personal': 'deuda personal' };

const _DIA_CORTO = formateadorFecha('es-CO', { weekday: 'short', timeZone: 'UTC' });
const _DIA_LARGO = formateadorFecha('es-CO', { weekday: 'long', timeZone: 'UTC' });

/** "Mar", "Sáb": el día de la semana corto, con mayúscula y sin punto. */
function _diaSemana(iso, largo = false) {
  const t = (largo ? _DIA_LARGO : _DIA_CORTO).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * La teja de un evento del calendario: la marca si el nombre la menciona, la
 * categoría de un gasto fijo, o el ícono de su tipo (mismo criterio que el
 * detalle del día, MK.2 y AG.2).
 *
 * @param {object} c compromiso o ingreso del mapa de eventos.
 * @returns {string}
 */
export function iconoEvento(c) {
  const tipo = c.tipo ?? 'fijo';
  if (tipo === 'ingreso') return tejaCategoria('i-saldo', 'ahorro');
  const marca = resolverMarca(`${c.descripcion ?? ''} ${c.nota ?? ''}`);
  if (marca) return tejaMarca(marca);
  const simbolo = tipo === 'fijo'
    ? (c.icono || (c.categoria ? iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) : null))
    : null;
  return simbolo ? tejaCategoria(simbolo, 'presupuesto') : tejaCategoria(`i-${ICONO_TIPO[tipo] ?? 'recurring'}`, 'compromisos');
}

/**
 * Cuándo, dicho como lo dice la fila: "Hoy", "Mañana, sáb 14", "Mar 17" o
 * "Venció el 5 de nov".
 */
function _cuando(iso, diaHoy, dia) {
  if (dia < diaHoy) return { texto: `Venció el ${fechaLegible(iso)}`, tono: 'danger' };
  if (dia === diaHoy) return { texto: 'Hoy', tono: 'warning' };
  if (dia === diaHoy + 1) return { texto: `Mañana, ${_diaSemana(iso).toLowerCase()} ${dia}`, tono: 'warning' };
  return { texto: `${_diaSemana(iso)} ${dia}`, tono: '' };
}

/**
 * Lo del mes en curso, en tres listas. `eventos` es el mapa día → eventos ya
 * mergeado; `idsVencidos` dice cuáles cuentan como vencidos (la misma regla
 * de la pastilla de Por pagar, `vencidosSinPagar`).
 *
 * @param {{ eventos: Record<number, any[]>, year: number, month: number, hoyISO: string, idsVencidos: Set<string> }} p
 * @returns {string}
 */
export function htmlListasMes({ eventos, year, month, hoyISO, idsVencidos }) {
  const oculto = montosOcultos('agenda');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const mm = String(month + 1).padStart(2, '0');
  const prefijo = `${year}-${mm}`;
  const ultimo = new Date(year, month + 1, 0).getDate();
  const diaHoy = Number(hoyISO.slice(8, 10));
  const iso = (dia) => `${prefijo}-${String(dia).padStart(2, '0')}`;

  // Lo que sigue sin pagar en todo el mes: la misma función que marca los
  // vencidos de la rejilla, mirada desde el último día del mes.
  const pendientes = pendientesDePagoDelMes(eventos, S.gastos ?? [], prefijo, iso(ultimo));
  const compromisoDe = (id) => (S.compromisos ?? []).find(c => c.id === id) ?? { id };
  const vencidos = pendientes.filter(p => p.dia < diaHoy && idsVencidos.has(p.id));
  const falta = pendientes.filter(p => p.dia >= diaHoy);

  const filaPago = (p) => {
    const c = compromisoDe(p.id);
    const cuando = _cuando(iso(p.dia), diaHoy, p.dia);
    const que = _QUE_ES[p.tipo] ?? '';
    return `
      <button type="button" class="cal-lista__fila" data-action="agenda-mostrar-dia" data-day="${p.dia}"
              aria-label="${_esc(p.descripcion)}, ${m(p.monto)}, ${_esc(cuando.texto.toLowerCase())}. Ver el día">
        <span class="cal-lista__teja" aria-hidden="true">${iconoEvento({ ...c, tipo: p.tipo })}</span>
        <span class="cal-lista__info">
          <span class="cal-lista__nombre">${_esc(p.descripcion)}</span>
          <span class="cal-lista__dato"><strong>${m(p.monto)}</strong> · <span class="cal-lista__cuando${cuando.tono ? ` cal-lista__cuando--${cuando.tono}` : ''}">${_esc(cuando.texto)}</span>${que ? ` · ${que}` : ''}</span>
        </span>
      </button>`;
  };

  const ingresos = [];
  for (const [d, evs] of Object.entries(eventosIngresosDelMes(S.ingresos ?? [], year, month))) {
    for (const ing of evs) ingresos.push({ ...ing, dia: Number(d) });
  }
  const entro = ingresos.filter(i => i.dia <= diaHoy).sort((a, b) => a.dia - b.dia);
  const filaIngreso = (ing) => {
    const cuenta = ing.cuentaId ? (S.cuentas ?? []).find(c => c.id === ing.cuentaId) : null;
    const donde = cuenta ? `llegó a ${_esc(cuenta.nombre)}` : 'entró';
    return `
      <button type="button" class="cal-lista__fila" data-action="agenda-mostrar-dia" data-day="${ing.dia}"
              aria-label="${_esc(ing.descripcion ?? 'Ingreso')}, más ${m(Number(ing.monto) || 0)}, ${_diaSemana(iso(ing.dia), true).toLowerCase()} ${ing.dia}. Ver el día">
        <span class="cal-lista__teja" aria-hidden="true">${iconoEvento(ing)}</span>
        <span class="cal-lista__info">
          <span class="cal-lista__nombre">${_esc(ing.descripcion ?? 'Ingreso')}</span>
          <span class="cal-lista__dato"><strong class="cal-lista__entra">+${m(Number(ing.monto) || 0)}</strong> · ${_diaSemana(iso(ing.dia))} ${ing.dia} · ${donde}</span>
        </span>
      </button>`;
  };

  const grupo = (titulo, suma, filas, tono = '') => filas.length === 0 ? '' : `
    <section class="cal-lista" aria-label="${_esc(titulo)}">
      <div class="cal-lista__head${tono ? ` cal-lista__head--${tono}` : ''}">
        <h2 class="cal-lista__titulo">${_esc(titulo)}</h2>
        <p class="cal-lista__suma">${suma}</p>
      </div>
      <div class="cal-lista__tarjeta">${filas.join('')}</div>
    </section>`;

  const suma = (xs) => xs.reduce((s, x) => s + (Number(x.monto) || 0), 0);
  return `
    <div class="cal-listas">
      ${grupo('Vencido', m(suma(vencidos)), vencidos.map(filaPago), 'danger')}
      ${grupo('Lo que falta este mes', m(suma(falta)), falta.map(filaPago))}
      ${grupo('Lo que entró', `+${m(suma(entro))}`, entro.map(filaIngreso))}
    </div>`;
}

/**
 * La frase de lo próximo (D2): "Lo próximo: Colegio, mañana. Tu siguiente
 * ingreso llega el 1 de dic." Solo para el mes en curso: el pago sin pagar
 * más cercano desde hoy y el ingreso que sigue, aunque caiga el mes que viene.
 *
 * @param {{ eventos: Record<number, any[]>, year: number, month: number, hoyISO: string }} p
 * @returns {string} '' si no hay nada que decir.
 */
export function fraseLoProximo({ eventos, year, month, hoyISO }) {
  const mm = String(month + 1).padStart(2, '0');
  const prefijo = `${year}-${mm}`;
  const ultimo = new Date(year, month + 1, 0).getDate();
  const diaHoy = Number(hoyISO.slice(8, 10));
  const pendientes = pendientesDePagoDelMes(eventos, S.gastos ?? [], prefijo, `${prefijo}-${String(ultimo).padStart(2, '0')}`)
    .filter(p => p.dia >= diaHoy);
  const partes = [];
  if (pendientes.length > 0) {
    const p = pendientes[0];
    const cuando = p.dia === diaHoy ? 'hoy'
      : p.dia === diaHoy + 1 ? 'mañana'
        : `el ${_diaSemana(`${prefijo}-${String(p.dia).padStart(2, '0')}`, true).toLowerCase()} ${p.dia}`;
    partes.push(`Lo próximo: <strong>${_esc(p.descripcion)}, ${cuando}</strong>.`);
  }
  const ingresos = S.ingresos ?? [];
  const deEsteMes = Object.keys(eventosIngresosDelMes(ingresos, year, month)).map(Number).filter(d => d > diaHoy);
  let siguiente = null;
  if (deEsteMes.length > 0) {
    siguiente = `${prefijo}-${String(Math.min(...deEsteMes)).padStart(2, '0')}`;
  } else {
    const sy = month === 11 ? year + 1 : year;
    const sm = (month + 1) % 12;
    const delQueSigue = Object.keys(eventosIngresosDelMes(ingresos, sy, sm)).map(Number);
    if (delQueSigue.length > 0) {
      siguiente = `${sy}-${String(sm + 1).padStart(2, '0')}-${String(Math.min(...delQueSigue)).padStart(2, '0')}`;
    }
  }
  if (siguiente) partes.push(`Tu siguiente ingreso llega el ${fechaLegible(siguiente)}.`);
  return partes.join(' ');
}
