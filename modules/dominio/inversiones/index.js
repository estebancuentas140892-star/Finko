/**
 * inversiones/index.js - API pública del dominio Inversión (J.2).
 *
 * Responsabilidades:
 * - Registrar acciones: inversion-nueva, inversion-eliminar.
 * - Coordinar logic.js + view.js. Persistir vía crud.js (inversiones es una
 *   colección top-level de S, así que guardar()/eliminar() aplican directo).
 * - Suscribirse a EventBus para re-render cuando cambian las inversiones.
 *
 * Desde INV.1 este dominio **mueve dinero real**: es el último de las cuatro
 * bolsas de ahorro en cruzar esa línea. Lo hace siempre vía `editar('cuentas',
 * ...)` de `infra/crud.js` y nunca importando tesorería (regla ADN #10,
 * precedente exacto PE.7 en `personales`). El motivo y la regla que lo obliga
 * están en el [ADR 053](../../../docs/DECISIONS/053-invariante-de-patrimonio.md).
 */

import { S, EventBus }               from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion }           from '../../ui/actions.js';
import { abrirModal, cerrarModal }   from '../../ui/modales.js';
import { renderSmart, registrarRender, updSaldo } from '../../infra/render.js';
import { announce }                  from '../../infra/a11y.js';
import { mostrarErroresForm }        from '../../infra/form-errors.js';
import { confirmar }                 from '../../ui/confirm.js';
import { f, hoy }                    from '../../infra/utils.js';
import { validarInversion, normalizarInversion, origenSugerido } from './logic.js';
import { renderInversion, renderFormInversion }  from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

// ── HELPERS DE MODAL ─────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-inversion');
}

function _setBody(html) {
  const body = document.getElementById('modal-inversion-body');
  if (body) body.innerHTML = html;
}

// ── SALDO DE CUENTAS (INV.1) ─────────────────────────────────────

/**
 * Ajusta el saldo de una cuenta en `delta` (positivo suma, negativo descuenta).
 * No-op si no hay cuenta o si ya no existe.
 *
 * Copia literal del helper de Compromisos, Apartados, Metas y `personales`: ADN
 * #10 impide que un dominio importe a otro, así que la duplicación es
 * intencional y ya está registrada como candidata a unificarse en **ARQ.2**.
 *
 * @param {string|null|undefined} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
}

/**
 * Cablea el revelado del selector de cuenta según la rama de origen elegida, y
 * la sugerencia que sigue a la fecha de inicio (INV.1).
 *
 * **La sugerencia solo se mueve mientras el usuario no haya contestado.** Cambiar
 * la fecha reubica la rama sugerida, porque la fecha es de donde sale la
 * sugerencia; pero en cuanto el usuario toca los chips, la fecha deja de
 * mandar: pisarle su respuesta convertiría una confirmación en una trampa.
 *
 * @param {HTMLFormElement} form
 */
function _wireOrigen(form) {
  const bloque = form.querySelector('#inv-origen-cuenta');
  const fecha  = form.querySelector('#inv-fecha');
  if (!bloque) return; // sin cuentas activas no se dibujó la pregunta

  let elegidoAMano = false;

  const aplicar = (origen) => {
    const radio = form.querySelector(`input[name="origen"][value="${origen}"]`);
    if (radio) radio.checked = true;
    bloque.hidden = origen !== 'cuenta';
  };

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'origen') {
      elegidoAMano = true;
      bloque.hidden = t.value !== 'cuenta';
      return;
    }
    if (t === fecha && !elegidoAMano) {
      aplicar(origenSugerido(fecha.value, hoy()));
    }
  });
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevaInversion() {
  const overlay = _getOverlay();
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Registrar inversión';

  // INV.1: el form ahora depende de `S.cuentas` (pregunta el origen del dinero),
  // así que re-inyectarlo en cada apertura es obligatorio y no una comodidad:
  // crear una cuenta después dejaría la pregunta invisible hasta recargar la app.
  // Mismo motivo que en `_nuevoPersonal()` y `_nuevoApartado()`.
  _setBody(renderFormInversion({ fechaInicio: hoy() }));

  const form = document.getElementById('form-inversion');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarInversion(form);
    });
    _wireOrigen(form);
  }
  abrirModal(overlay);
}

/** @param {HTMLFormElement} form */
async function _guardarInversion(form) {
  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarInversion(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const inversion = normalizarInversion(datos);

  // INV.1: con cuenta de origen, registrar la inversión saca el dinero de esa
  // cuenta. No destruye riqueza (el monto entra al patrimonio como inversión,
  // ver `calcularActivos()`): convierte dinero disponible en dinero invertido.
  // Sin cuenta de origen, la inversión vale como registro y no toca saldos.
  if (inversion.cuentaId) {
    const cuenta = (S.cuentas ?? []).find(c => c.id === inversion.cuentaId);
    const saldo  = cuenta?.saldo ?? 0;

    // El saldo no alcanza: se confirma el sobregiro en vez de bloquearlo. La
    // cifra que el usuario tiene en la app puede estar atrasada, y negarle el
    // registro le impediría corregirla. Mismo criterio que el aporte a una meta
    // o a un apartado desde una sola cuenta.
    if (saldo < inversion.monto) {
      const ok = await confirmar({
        titulo:         'Registrar inversión',
        mensaje:        `¿Registrar "${inversion.nombre}" por ${f(inversion.monto)} desde ${cuenta?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldo)}: quedará en negativo.`,
        confirmarTexto: 'Registrar inversión',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  guardar('inversiones', inversion);

  if (inversion.cuentaId) {
    _ajustarSaldoCuenta(inversion.cuentaId, -inversion.monto);
    updSaldo();
  }

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  announce(inversion.cuentaId
    ? `Inversión "${inversion.nombre}" registrada. Se descontaron ${f(inversion.monto)} de tu cuenta.`
    : `Inversión "${inversion.nombre}" registrada por ${f(inversion.monto)}.`
  );
}

/** @param {HTMLElement} el */
async function _eliminarInversion(el) {
  const id = el.dataset.id;
  if (!id) return;

  const inversiones = Array.isArray(S.inversiones) ? S.inversiones : [];
  const inv = inversiones.find(x => x.id === id);
  if (!inv) return;

  // INV.1 (ADR 053 I3): lo que descontó al crearse tiene que volver al
  // eliminarse. Se devuelve el `monto` actual y no el original a propósito: si
  // el asistente de distribución le sumó capital, ese dinero también salió de
  // cuentas, así que todo el monto vivo tiene que regresar o el patrimonio
  // bajaría al borrar.
  const cuenta = inv.cuentaId
    ? (S.cuentas ?? []).find(c => c.id === inv.cuentaId)
    : null;
  const devuelve = Boolean(inv.cuentaId) && Boolean(cuenta);

  // La cuenta de origen ya no existe: no se devuelve el dinero a ninguna otra.
  // Elegir una cuenta cualquiera inventaría un movimiento que nunca ocurrió, y
  // es peor que dejar el hueco a la vista.
  const nota = devuelve
    ? ` Se devolverán ${f(inv.monto)} a ${cuenta.nombre}.`
    : (inv.cuentaId
      ? ' La cuenta de la que salió ya no existe, así que el dinero no se devuelve a ninguna.'
      : '');

  const ok = await confirmar({
    titulo:         'Eliminar inversión',
    mensaje:        `¿Quieres eliminar "${inv.nombre}" (${f(inv.monto)})?${nota} Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('inversiones', id);

  if (devuelve) {
    _ajustarSaldoCuenta(inv.cuentaId, inv.monto);
    updSaldo();
  }

  announce(devuelve
    ? `Inversión eliminada. Se devolvieron ${f(inv.monto)} a tu cuenta.`
    : 'Inversión eliminada.'
  );
}

// ── INIT ─────────────────────────────────────────────────────────

function _renderInversionBound() {
  renderInversion();
}

export function initInversiones() {
  registrarAccion('inversion-nueva',     _nuevaInversion);
  registrarAccion('inversion-eliminar',  _eliminarInversion);

  // Re-render ante cambios en la colección de inversiones.
  EventBus.on('state:change', ({ section }) => {
    if (section === 'inversiones') {
      renderBannerProposito('inversion', S.inversiones.length > 0);
      renderSmart(_renderInversionBound, 'inversion');
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4e): aplica los aportes a inversiones del
  // plan. Solo incrementa el capital (`monto`) del holding; el descuento de la
  // cuenta de origen lo centraliza tesorería (no aquí), igual que metas/apartados.
  EventBus.on('distribucion:aplicar', ({ items }) => {
    const aportes = (items ?? []).filter(i => i.tipo === 'inversion' && i.monto > 0);
    for (const it of aportes) {
      const inv = (S.inversiones ?? []).find(x => x.id === it.id);
      if (!inv) continue;
      editar('inversiones', it.id, { monto: (Number(inv.monto) || 0) + it.monto });
    }
  });

  // Para que renderAll() también dibuje esta sección.
  registrarRender(_renderInversionBound);

  // Re-render al navegar a #inversion (mismo patrón que ahorro/metas).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('inversion', S.inversiones.length > 0);
    renderSmart(_renderInversionBound, 'inversion');
  });

  renderBannerProposito('inversion', S.inversiones.length > 0);
  renderSmart(_renderInversionBound, 'inversion');
}
