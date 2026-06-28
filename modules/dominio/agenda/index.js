/**
 * agenda/index.js - API pública del dominio Agenda.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (navegación mes anterior/siguiente, alta de gasto fijo).
 * - Re-renderizar cuando cambia S.compromisos o el usuario llega al hash.
 * - Coordinar logic.js + view.js sin generar HTML ni hacer cálculos aquí.
 *
 * Alta de gasto fijo:
 * - La sección Agenda es el único punto de entrada para crear `tipo='fijo'`.
 * - Reusa `validarCompromiso` y `normalizarCompromiso` del dominio Compromisos.
 *
 * Acciones sobre gastos fijos existentes:
 * - Editar: abre modal-gasto-fijo pre-rellenado con los datos del compromiso.
 * - Eliminar: confirmación + elimina de S.compromisos.
 * - Marcar pagado este mes: usa resolverPagoConSelector. Con varias cuentas
 *   muestra el selector de tarjetas para elegir la cuenta preferida y solo abre
 *   el reparto si no alcanza (reparto-fallback, sin dejar negativos); con una
 *   sola cuenta no pregunta. Registra un gasto por cada cuenta usada, vinculado
 *   al compromiso vía compromisoId, para que el badge "Ya pagaste este mes"
 *   aparezca automáticamente en el calendario.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { resolverPagoConSelector } from '../../infra/cuenta-helper.js';
import { validarCompromiso, normalizarCompromiso } from '../compromisos/logic.js';
import { renderAgenda, renderFormGastoFijo, navegarMes, mostrarDia } from './view.js';

// ── HANDLERS DE NAVEGACIÓN ───────────────────────────────────────

function _prevMes() {
  navegarMes(-1);
  renderAgenda();
}

function _nextMes() {
  navegarMes(+1);
  renderAgenda();
}

function _mostrarDia(el) {
  const dia = parseInt(el?.dataset?.day, 10);
  if (!Number.isInteger(dia)) return;
  mostrarDia(dia);
  renderAgenda();
}

// ── HANDLERS DEL MODAL "GASTO FIJO" (nuevo + edición) ────────────

function _nuevoGastoFijo() {
  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;

  // Resetear modo edición y título.
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto fijo';

  // Re-inyectamos el form en cada apertura para restablecer defaults.
  _inyectarFormGastoFijo();
  abrirModal(overlay);
}

/**
 * Abre el modal de gasto fijo en modo edición con los datos del compromiso pre-rellenados.
 * @param {HTMLElement} el - botón con data-id del compromiso.
 */
function _editarGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp) return;

  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar gasto fijo';

  _inyectarFormGastoFijo(comp);
  abrirModal(overlay);
}

/**
 * (Re)Inyecta el form de gasto fijo en el modal.
 * Si se pasa `compromiso`, pre-rellena los campos y activa el modo edición
 * guardando el id en `form.dataset.id`.
 * @param {object|null} [compromiso]
 */
function _inyectarFormGastoFijo(compromiso = null) {
  const body = document.getElementById('modal-gasto-fijo-body');
  if (!body) return;

  body.innerHTML = renderFormGastoFijo();

  const form = body.querySelector('#form-gasto-fijo');
  if (!form) return;

  // Modo edición: pre-rellenar campos y guardar id.
  if (compromiso) {
    form.dataset.id = compromiso.id;
    const f_desc = form.querySelector('[name="descripcion"]');
    const f_monto = form.querySelector('[name="monto"]');
    const f_frec = form.querySelector('[name="frecuencia"]');
    const f_dia = form.querySelector('[name="diaPago"]');
    const f_btn = form.querySelector('[type="submit"]');
    if (f_desc) f_desc.value = compromiso.descripcion ?? '';
    if (f_monto) f_monto.value = compromiso.monto ?? '';
    if (f_frec) f_frec.value = compromiso.frecuencia ?? 'Mensual';
    if (f_dia) f_dia.value = compromiso.diaPago ?? '';
    if (f_btn) f_btn.textContent = 'Actualizar gasto fijo';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoFijo();
  });
}

function _guardarGastoFijo() {
  const form = document.getElementById('form-gasto-fijo');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const idEdit = form.dataset.id || null;

  if (idEdit) {
    editar('compromisos', idEdit, normalizarCompromiso(datos));
  } else {
    guardar('compromisos', normalizarCompromiso(datos));
  }

  const overlay = document.getElementById('modal-gasto-fijo');
  if (overlay) cerrarModal(overlay);

  renderAgenda();
  announce(idEdit ? 'Gasto fijo actualizado.' : 'Gasto fijo guardado correctamente.');
}

// ── HANDLER: ELIMINAR GASTO FIJO ────────────────────────────────

/**
 * @param {HTMLElement} el - botón con data-id del compromiso a eliminar.
 */
async function _eliminarGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp) return;

  const ok = await confirmar({
    titulo:         'Eliminar gasto fijo',
    mensaje:        `¿Quieres eliminar "${comp.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('compromisos', id);
  renderAgenda();
  announce(`Gasto fijo "${comp.descripcion}" eliminado.`);
}

// ── HANDLER: MARCAR PAGADO ESTE MES ─────────────────────────────

/**
 * Registra el pago del mes actual de un gasto fijo.
 * Usa resolverPagoConSelector: con varias cuentas pide elegir la cuenta
 * preferida (selector de tarjetas) y solo reparte si esa cuenta no alcanza,
 * sin dejar ninguna en negativo. Con una sola cuenta no pregunta.
 * @param {HTMLElement} el - botón con data-id del compromiso.
 */
async function _marcarPagadoGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp || comp.tipo !== 'fijo') return;

  // Verificar que no esté pagado ya este mes (defensa ante doble clic).
  const prefijo = _prefijoMesActual();
  const yaPagado = Array.isArray(S.gastos) &&
    S.gastos.some(g => g.compromisoId === id && g.fecha?.startsWith(prefijo));
  if (yaPagado) {
    announce('Este gasto ya está marcado como pagado este mes.');
    return;
  }

  const monto = Number(comp.monto) || 0;

  // Elegir la cuenta preferida (si hay varias) y resolver el reparto-fallback.
  const splits = await resolverPagoConSelector(
    S.cuentas,
    monto,
    `registrar el pago de "${comp.descripcion}"`,
  );
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta: puede quedar en negativo (no hay con qué repartir).
  // Confirmamos el sobregiro, igual que el flujo de cuenta única anterior.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar pago',
        mensaje:        `¿Registrar pago de ${f(monto)} de "${comp.descripcion}" desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
        confirmarTexto: 'Registrar pago',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  // Aplicar cada split: un gasto vinculado + descuento de su cuenta.
  const repartido = splits.length > 1;
  for (const s of splits) {
    guardar('gastos', {
      descripcion:        `Pago: ${comp.descripcion}`,
      monto:              s.monto,
      categoria:          'Gastos fijos',
      fecha:              hoy(),
      cuentaId:           s.cuentaId || null,
      nota:               repartido ? 'Pago repartido entre varias cuentas' : '',
      compromisoId:       id,
      pendienteCompletar: false,
    });
    const cuenta = S.cuentas.find(x => x.id === s.cuentaId);
    if (cuenta) {
      editar('cuentas', s.cuentaId, { saldo: (cuenta.saldo ?? 0) - s.monto });
    }
  }

  renderAgenda();
  updSaldo();
  announce(`Pago de ${f(monto)} registrado para "${comp.descripcion}".`);
}

// ── HELPERS ──────────────────────────────────────────────────────

/** Devuelve el prefijo YYYY-MM del mes actual para comparar fechas. */
function _prefijoMesActual() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAgenda() {
  registrarAccion('agenda-prev-mes',          _prevMes);
  registrarAccion('agenda-next-mes',          _nextMes);
  registrarAccion('agenda-mostrar-dia',       _mostrarDia);
  registrarAccion('nuevo-gasto-fijo',         _nuevoGastoFijo);
  registrarAccion('agenda-editar-fijo',       _editarGastoFijo);
  registrarAccion('agenda-eliminar-fijo',     _eliminarGastoFijo);
  registrarAccion('agenda-marcar-pagado-fijo', _marcarPagadoGastoFijo);

  _inyectarFormGastoFijo();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar a #agenda.
  window.addEventListener('hashchange', () => {
    if ((location.hash.slice(1) || 'dash') === 'agenda') {
      renderSmart(renderAgenda, 'agenda');
    }
  });

  renderSmart(renderAgenda, 'agenda');
}
