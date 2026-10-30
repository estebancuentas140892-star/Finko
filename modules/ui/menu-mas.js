/**
 * menu-mas.js - manejo del menu "Mas opciones" del bottom nav mobile.
 *
 * Responsabilidad: cerrar la hoja automaticamente cuando el usuario hace
 * click en un item con href (navegacion). Desde NAV2.1a (ADR 040) es una
 * hoja inferior agrupada (Gestion del dinero / Ahorros / Ajustes + tema);
 * el boton de tema es un <button> sin href, asi que alternar el tema NO
 * cierra la hoja (a proposito: es un ajuste, no una navegacion).
 *
 * ADR 108 (MV2.21): cada destino dice como esta, con la cifra que su seccion
 * ya calcula (R74). Las lineas se escriben al abrir la hoja, no en cada
 * repintado: el calculo de la salud no es barato y la hoja casi siempre esta
 * cerrada. Se lee la logica pura de cada dominio, como el bloque Gastos.
 */

import { S } from '../core/state.js';
import { f, hoy, fechaLegible } from '../infra/utils.js';
import { SALDO_MASCARA } from '../infra/render.js';
import { cerrarModal } from './modales.js';
import { compromisosProximos } from '../dominio/compromisos/logic.js';
import { movimientosRecientes, descripcionMovimiento } from '../dominio/movimientos/logic.js';
import { generarResumen, calcularScoreSalud, clasificarScore } from '../dominio/analisis/logic.js';
import { calcularTotalCuentas, cuentasActivas } from '../dominio/tesoreria/logic/cuentas.js';
import { calcularResumen } from '../dominio/personales/logic.js';

/**
 * La linea de estado de cada destino de "Mas". Sin datos no hay linea
 * (`null`). Pura respecto al DOM: recibe el estado y la fecha.
 *
 * @param {typeof S} [state=S]
 * @param {string} [hoyISO=hoy()] YYYY-MM-DD
 * @returns {Record<string, {texto: string, largo?: string, aviso?: boolean} | null>}
 *   por `data-section` del destino.
 */
export function estadosMas(state = S, hoyISO = hoy()) {
  const oculto = state.config?.ocultarSaldo === true;
  const m = valor => (oculto ? SALDO_MASCARA : f(valor));
  const [anio, mes, dia] = hoyISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const ayer = new Date(anio, mes - 1, dia - 1);
  const ayerISO = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;

  // Calendario: lo que vence de hoy a 7 dias, sin lo ya pagado (HF.0d).
  const pagos = compromisosProximos(state.compromisos ?? [], 7, fecha, state.gastos ?? [])
    .filter(c => c.diasRestantes >= 0).length;
  const agenda = pagos > 0
    ? { texto: pagos === 1 ? '1 pago esta semana' : `${pagos} pagos esta semana` }
    : null;

  // Movimientos: el ultimo, con su dia.
  const [ultimo] = movimientosRecientes({
    gastos:            state.gastos,
    ingresosPuntuales: state.ingresosPuntuales,
    aportes:           state.ahorro?.aportes,
    transferencias:    state.transferencias,
    personales:        state.personales,
    categoriasPersonalizadas: state.categoriasPersonalizadas,
  }, 1);
  const cuando = ultimo && (ultimo.fecha === hoyISO ? 'Hoy' : ultimo.fecha === ayerISO ? 'Ayer' : fechaLegible(ultimo.fecha));
  const movimientos = ultimo
    ? { texto: `${cuando}: ${descripcionMovimiento(ultimo, state.cuentas ?? [])}` }
    : null;

  // Analisis: la misma salud y la misma banda que su anillo.
  let analisis = null;
  if ((state.gastos ?? []).length > 0) {
    const resumen = generarResumen(state.gastos, state.compromisos ?? [], state.cuentas ?? [], anio, mes,
      state.metas ?? [], state.apartados ?? [], state.inversiones ?? [], state.personales ?? []);
    const fondo = state.ahorro?.fondoEmergencia;
    const { score } = calcularScoreSalud(resumen, { activo: fondo?.activo === true, completado: fondo?.completado === true });
    analisis = { texto: `Salud ${Math.round(score)} de 100`, aviso: clasificarScore(score) === 'critica' };
  }

  // Mis cuentas: el total y cuantas.
  const activas = cuentasActivas(state.cuentas ?? []).length;
  const tesoreria = activas > 0
    ? {
      texto: `${m(calcularTotalCuentas(state.cuentas))} en ${activas}`,
      largo: `tienes ${m(calcularTotalCuentas(state.cuentas))} en ${activas} ${activas === 1 ? 'cuenta' : 'cuentas'}`,
    }
    : null;

  // Me deben: lo que falta cobrar, el mismo total que muestra su sección.
  const porCobrar = calcularResumen(state.personales ?? [], fecha).totalPendiente ?? 0;
  const personales = porCobrar > 0 ? { texto: `${m(porCobrar)} por cobrar` } : null;

  return { agenda, movimientos, analisis, tesoreria, personales };
}

/**
 * Escribe las lineas en la hoja. Cada fila guarda su nombre en `data-nombre`
 * la primera vez para armar el nombre accesible ("Calendario, 3 pagos esta
 * semana"). No-op si la hoja no esta en el DOM.
 *
 * @param {ReturnType<typeof estadosMas>} [estados]
 */
export function sincronizarEstadosMas(estados = estadosMas()) {
  document.querySelectorAll('#modal-mas .mas-tile[data-section]').forEach((tile) => {
    const linea = tile.querySelector('.mas-tile__estado');
    if (!linea) return;
    const estado = estados[tile.dataset.section] ?? null;
    const nombre = tile.dataset.nombre
      || (tile.dataset.nombre = tile.querySelector('.mas-tile__label')?.textContent.trim() ?? '');
    linea.textContent = estado?.texto ?? '';
    linea.hidden = !estado;
    linea.classList.toggle('mas-tile__estado--aviso', estado?.aviso === true);
    if (estado) tile.setAttribute('aria-label', `${nombre}, ${estado.largo ?? estado.texto}`);
    else tile.removeAttribute('aria-label');
  });
}

/**
 * Inicializa el modal "Mas". Se llama una sola vez desde bootstrap.js.
 */
export function initMenuMas() {
  const modal = document.getElementById('modal-mas');
  if (!modal) return;

  // Al hacer click en un link de navegacion adentro del modal, cerrar.
  modal.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link) cerrarModal(modal);
  });

  // ADR 108 D3: las lineas se escriben justo antes de abrir la hoja. En
  // captura, para que esten antes de que el delegado de modales la muestre.
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-modal="modal-mas"]')) sincronizarEstadosMas();
  }, true);
}
