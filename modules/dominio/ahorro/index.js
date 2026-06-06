/**
 * ahorro/index.js - API pública del dominio Ahorro (J.1).
 *
 * Responsabilidades:
 * - Registrar acciones: ahorro-activar-fondo, ahorro-editar, ahorro-desactivar.
 * - Calcular `gastosFijosMensuales` localmente desde S.compromisos para no
 *   importar de otro dominio (regla ADN #10). Replica el `FACTOR_MENSUAL`
 *   de compromisos en una constante local con el mismo comentario explicativo.
 * - Coordinar logic.js + view.js. Persistir con save().
 * - Suscribirse a EventBus para re-render cuando cambia el ahorro o cuando
 *   cambian compromisos (porque el objetivo del fondo depende de los gastos fijos).
 */

import { S, EventBus }              from '../../core/state.js';
import { save }                     from '../../core/storage.js';
import { registrarAccion }          from '../../ui/actions.js';
import { abrirModal, cerrarModal }  from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { announce }                 from '../../infra/a11y.js';
import { mostrarErroresForm }       from '../../infra/form-errors.js';
import { confirmar }                from '../../ui/confirm.js';
import {
  validarMetaMeses, validarMontoActual,
  normalizarMetaMeses, normalizarMontoActual,
} from './logic.js';
import { renderAhorro, renderFormFondo } from './view.js';

// ── FACTOR DE FRECUENCIA ─────────────────────────────────────────

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * Replicado localmente desde compromisos/logic.js para no crear dependencia
 * cruzada entre dominios (regla ADN #10).
 */
const FACTOR_MENSUAL = {
  'Diario':     30,
  'Semanal':    4.33,
  'Quincenal':  2,
  'Mensual':    1,
  'Bimestral':  0.5,
  'Trimestral': 1 / 3,
  'Semestral':  1 / 6,
  'Anual':      1 / 12,
  'Única vez':  0,
};

/**
 * Suma los gastos fijos mensuales del usuario a partir de S.compromisos.
 *
 * Solo cuenta compromisos activos de tipo `'fijo'` (las deudas no son
 * "gastos fijos" en el sentido del fondo de emergencia: son obligaciones
 * a saldar, no costos recurrentes a cubrir). Aplica `FACTOR_MENSUAL` para
 * proyectar a unidad mensual frecuencias no-mensuales.
 *
 * @returns {number} COP/mes.
 */
function _gastosFijosMensuales() {
  const compromisos = Array.isArray(S.compromisos) ? S.compromisos : [];
  let total = 0;
  for (const c of compromisos) {
    if (!c || c.activo === false) continue;
    if (c.tipo !== 'fijo') continue;
    const factor = FACTOR_MENSUAL[c.frecuencia] ?? 0;
    total += (Number(c.monto) || 0) * factor;
  }
  return total;
}

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-ahorro');
}

function _setBody(html) {
  const body = document.getElementById('modal-ahorro-body');
  if (body) body.innerHTML = html;
}

function _wireForm() {
  const form = document.getElementById('form-fondo');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarFondo(form);
  });
}

function _abrirFormFondo(editando) {
  const overlay = _getOverlay();
  if (!overlay) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { metaMeses: 3, montoActual: 0 };
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = editando ? 'Editar fondo de emergencia' : 'Activar fondo de emergencia';

  _setBody(renderFormFondo({
    editando,
    metaMeses:           fondo.metaMeses   ?? 3,
    montoActual:         fondo.montoActual ?? 0,
    gastosFijosMensuales: _gastosFijosMensuales(),
  }));
  _wireForm();
  abrirModal(overlay);
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _activarFondo() {
  _abrirFormFondo(/* editando */ false);
}

function _editarFondo() {
  _abrirFormFondo(/* editando */ true);
}

/** @param {HTMLFormElement} form */
function _guardarFondo(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = [...validarMetaMeses(datos.metaMeses), ...validarMontoActual(datos.montoActual)];

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const metaMeses   = normalizarMetaMeses(datos.metaMeses);
  const montoActual = normalizarMontoActual(datos.montoActual);

  const yaActivo = S.ahorro?.fondoEmergencia?.activo === true;
  S.ahorro.fondoEmergencia = { activo: true, metaMeses, montoActual };
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  renderAhorro(_gastosFijosMensuales());
  announce(yaActivo
    ? 'Fondo de emergencia actualizado.'
    : '¡Fondo de emergencia activado!'
  );
}

async function _desactivarFondo() {
  const ok = await confirmar({
    titulo:         'Desactivar fondo de emergencia',
    mensaje:        'Vas a quitar el fondo del seguimiento. Los datos se guardan, pero la sección vuelve a mostrar el empty state. ¿Continuar?',
    confirmarTexto: 'Desactivar',
    peligroso:      true,
  });
  if (!ok) return;

  if (S.ahorro?.fondoEmergencia) {
    S.ahorro.fondoEmergencia.activo = false;
  }
  save();
  EventBus.emit('state:change', { section: 'ahorro' });

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  renderAhorro(_gastosFijosMensuales());
  announce('Fondo de emergencia desactivado.');
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Wrapper que renderSmart/registrarRender pueden invocar sin argumentos.
 * Calcula gastosFijosMensuales al vuelo desde S.compromisos.
 */
function _renderAhorroBound() {
  renderAhorro(_gastosFijosMensuales());
}

export function initAhorro() {
  registrarAccion('ahorro-activar-fondo', _activarFondo);
  registrarAccion('ahorro-editar',        _editarFondo);
  registrarAccion('ahorro-desactivar',    _desactivarFondo);

  // El objetivo del fondo depende de los gastos fijos: re-render ante
  // cambios en ahorro O en compromisos.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'ahorro' || section === 'compromisos') {
      renderSmart(_renderAhorroBound, 'ahorro');
    }
  });

  // Para que renderAll() también dibuje esta sección.
  registrarRender(_renderAhorroBound);

  // Re-render al navegar a #ahorro (mismo patrón que metas/presupuesto).
  window.addEventListener('hashchange', () => {
    renderSmart(_renderAhorroBound, 'ahorro');
  });

  renderSmart(_renderAhorroBound, 'ahorro');
}
