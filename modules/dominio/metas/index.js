/**
 * metas/index.js - API pública del dominio de metas de ahorro.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal cada vez que se abre (crear o editar).
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { f } from '../../infra/utils.js';
import { resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
import { wireIconoPicker, resetIconoPicker } from '../../infra/icon-picker.js';
import { validarMeta, normalizarMeta, validarAbono, calcularProgreso } from './logic.js';
import { renderListaMetas, renderFormMeta, renderFormAbonoMeta } from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/**
 * Alterna el selector de ícono (CAT.2b, ex MT.3 con campo de emoji libre):
 * solo tiene sentido con la categoría "Otra" (las demás ya traen su ícono,
 * ver `normalizarMeta`). Al ocultarlo resetea el picker (`resetIconoPicker`)
 * para que un ícono elegido con "Otra" no sobreviva un cambio posterior a
 * otra categoría (`FormData` sigue enviando los campos ocultos, y
 * `normalizarMeta` prioriza el ícono explícito sobre el de la categoría).
 *
 * @param {HTMLFormElement} form
 */
function _syncCategoriaMeta(form) {
  const selCategoria = form.querySelector('#meta-categoria');
  const grupoIcono   = form.querySelector('#form-group-meta-icono');
  const pickerIcono  = form.querySelector('[data-icono-picker="meta-icono"]');
  if (!selCategoria || !grupoIcono || !pickerIcono) return;

  const esOtra = selCategoria.value === 'Otra';
  grupoIcono.hidden = !esOtra;
  if (!esOtra) resetIconoPicker(pickerIcono);
}

function _nuevaMeta() {
  const overlay = document.getElementById('modal-meta');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nueva meta de ahorro';

  _inyectarFormMeta();
  abrirModal(overlay);
}

/**
 * Abre el modal de meta en modo edición (EDIT.1) con los datos actuales
 * prellenados. **No toca `montoActual` ni el histórico de aportes**: solo
 * nombre, objetivo, fecha y categoría son editables aquí; lo ya aportado se
 * conserva tal cual (ver `normalizarMeta`, `logic.js`).
 * @param {HTMLElement} el - botón con data-id de la meta.
 */
function _editarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const overlay = document.getElementById('modal-meta');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar meta';

  _inyectarFormMeta(meta);
  abrirModal(overlay);
}

function _guardarMeta() {
  const form = document.getElementById('form-meta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarMeta(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const idEdit = form.dataset.id || null;

  if (idEdit) {
    const existente = S.metas.find(m => m.id === idEdit);
    editar('metas', idEdit, normalizarMeta(datos, existente));
  } else {
    guardar('metas', normalizarMeta(datos));
  }

  const overlay = document.getElementById('modal-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  announce(idEdit ? 'Meta actualizada.' : 'Meta creada correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const ok = await confirmar({
    titulo:         'Eliminar meta',
    mensaje:        `¿Quieres eliminar la meta "${meta.nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('metas', id);
  renderListaMetas();
  announce(`Meta "${meta.nombre}" eliminada.`);
}

/** @param {HTMLElement} el */
function _abrirAbonoMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const overlay = document.getElementById('modal-abono-meta');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Abonar: ${meta.nombre}`;

  const body = overlay.querySelector('.modal__body');
  if (body) {
    body.innerHTML = renderFormAbonoMeta(meta);
    body.querySelector('#form-abono-meta')?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAbonoMeta();
    });
    body.querySelector('#abono-meta-monto')?.focus();
  }

  abrirModal(overlay);
}

/**
 * Guarda el abono a una meta. MT.5: mismo patrón que `_guardarAporte` de
 * Apartados (AP.1): resuelve la cuenta con `resolverPagoConPreferida`
 * (usa la elegida en el selector de tarjetas y, si no alcanza y hay más
 * cuentas, reparte sin dejar ninguna en negativo). Con 0 cuentas activas
 * el abono vale como seguimiento y no descuenta nada.
 */
async function _guardarAbonoMeta() {
  const form = document.getElementById('form-abono-meta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarAbono(datos.monto);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const meta = S.metas.find(m => m.id === datos.metaId);
  if (!meta) return;

  const abono = Number(datos.monto);
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);

  let splits = [];
  if (cuentasActivas.length > 0) {
    splits = await resolverPagoConPreferida(
      S.cuentas,
      abono,
      datos.cuentaId,
      `registrar el abono a "${meta.nombre}"`,
    );
    if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

    // Una sola cuenta que no alcanza: confirmar el sobregiro (no hay con qué repartir).
    if (splits.length === 1) {
      const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
      const saldoCuenta = c?.saldo ?? 0;
      if (saldoCuenta < splits[0].monto) {
        const ok = await confirmar({
          titulo:         'Registrar abono',
          mensaje:        `¿Registrar abono de ${f(abono)} a "${meta.nombre}" desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
          confirmarTexto: 'Registrar abono',
          peligroso:      true,
        });
        if (!ok) return;
      }
    }
  }

  const nuevoMonto = (meta.montoActual ?? 0) + abono;
  const { completada } = calcularProgreso({ ...meta, montoActual: nuevoMonto });

  editar('metas', datos.metaId, { montoActual: nuevoMonto, completada });

  for (const s of splits) {
    _ajustarSaldoCuenta(s.cuentaId, -s.monto);
  }

  const overlay = document.getElementById('modal-abono-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  updSaldo();
  announce(completada
    ? `¡Meta "${meta.nombre}" completada! 🎉`
    : `Abono de ${f(abono)} registrado.`
  );
}

/**
 * Ajusta el saldo de la cuenta indicada en `delta` (positivo o negativo).
 * No-op si `cuentaId` es null/undefined o la cuenta no existe.
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

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * (Re)Inyecta el HTML del formulario de meta en el modal y cablea sus
 * listeners locales. Único punto de entrada para crear (`meta` null) y
 * editar (EDIT.1, `meta` presente): se llama en cada apertura, así que el
 * DOM nace limpio cada vez y no hace falta resetear campos ni el picker de
 * ícono a mano entre una apertura y otra (antes el form era un singleton
 * reusado; con el picker de ícono ya no alcanza con limpiar valores, hay
 * que reflejar también la meta que se está editando).
 * @param {import('../../core/state.js').Meta|null} [meta] modo edición si se pasa.
 */
function _inyectarFormMeta(meta = null) {
  const body = document.getElementById('modal-meta-body');
  if (!body) return;

  body.innerHTML = renderFormMeta(meta);

  const form = body.querySelector('#form-meta');
  if (!form) return;

  if (meta) form.dataset.id = meta.id;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarMeta();
  });
  form.querySelector('#meta-categoria')?.addEventListener('change', () => _syncCategoriaMeta(form));
  wireIconoPicker(form.querySelector('[data-icono-picker="meta-icono"]'));
}

export function initMetas() {
  registrarAccion('nueva-meta',    _nuevaMeta);
  registrarAccion('editar-meta',   _editarMeta);
  registrarAccion('eliminar-meta', _eliminarMeta);
  registrarAccion('abonar-meta',   _abrirAbonoMeta);

  EventBus.on('state:change', ({ section }) => {
    if (section === 'metas') {
      renderBannerProposito('metas', S.metas.length > 0);
      renderSmart(renderListaMetas, 'metas');
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4a): aplica los abonos a metas del plan.
  // Solo suma a montoActual y recalcula `completada`; el descuento de la cuenta
  // de origen lo hace tesorería de forma centralizada (no aquí).
  EventBus.on('distribucion:aplicar', ({ items }) => {
    const abonos = (items ?? []).filter(i => i.tipo === 'meta' && i.monto > 0);
    for (const it of abonos) {
      const meta = S.metas.find(m => m.id === it.id);
      if (!meta) continue;
      const nuevoMonto = (meta.montoActual ?? 0) + it.monto;
      const { completada } = calcularProgreso({ ...meta, montoActual: nuevoMonto });
      editar('metas', it.id, { montoActual: nuevoMonto, completada });
    }
  });

  // Re-render al navegar a #metas - sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('metas', S.metas.length > 0);
    renderSmart(renderListaMetas, 'metas');
  });

  renderBannerProposito('metas', S.metas.length > 0);
  renderSmart(renderListaMetas, 'metas');
}
