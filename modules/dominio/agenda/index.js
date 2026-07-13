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
import { save } from '../../core/storage.js';
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
import { renderBannerProposito } from '../../ui/proposito.js';
import { CATEGORIAS_AGENDA } from '../../core/constants.js';
import { wireIconoPicker, setIconoPickerValor } from '../../infra/icon-picker.js';
import { iconoCategoria } from '../../infra/icons.js';
import { renderAgenda, renderFormGastoFijo, navegarMes, mostrarDia, marcarEntradaSeccion } from './view.js';

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
    const f_cat = form.querySelector('[name="categoria"]');
    const f_monto = form.querySelector('[name="monto"]');
    const f_frec = form.querySelector('[name="frecuencia"]');
    const f_dia = form.querySelector('[name="diaPago"]');
    const f_btn = form.querySelector('[type="submit"]');
    const categoria = compromiso.categoria ?? '';
    const nombreAuto = categoria && CATEGORIAS_AGENDA.includes(categoria) && categoria !== 'Otro';
    if (f_cat) f_cat.value = categoria;
    // AG.4: con categoría de nombre automático, el campo de texto muestra la
    // nota (no la descripción, que ya es la categoría); si no, la descripción.
    if (f_desc) f_desc.value = nombreAuto ? (compromiso.nota ?? '') : (compromiso.descripcion ?? '');
    if (f_monto) f_monto.value = compromiso.monto ?? '';
    if (f_frec) f_frec.value = compromiso.frecuencia ?? 'Mensual';
    if (f_dia) f_dia.value = compromiso.diaPago ?? '';
    if (f_btn) f_btn.textContent = 'Actualizar gasto fijo';

    // CAT.2f: prellenar el ícono elegido si la categoría es "Otro" y ya
    // tiene uno guardado (el form nace limpio en cada render, no hace falta
    // resetear antes).
    if (categoria === 'Otro' && compromiso.icono) {
      setIconoPickerValor(
        form.querySelector('[data-icono-picker="gfijo-icono"]'),
        compromiso.icono,
        iconoCategoria(compromiso.icono),
      );
    }
  }

  _syncCategoriaGastoFijo(form);
  form.querySelector('[name="categoria"]')?.addEventListener('change', () => _syncCategoriaGastoFijo(form));
  wireIconoPicker(form.querySelector('[data-icono-picker="gfijo-icono"]'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoFijo();
  });
}

/**
 * AG.4: alterna el rol del campo de texto según la categoría elegida.
 * Con una categoría predefinida (no "Otro"), el nombre lo da la categoría:
 * el campo pasa a ser una nota opcional. Sin categoría, o con "Otro", el
 * campo vuelve a ser el nombre obligatorio del registro.
 * @param {HTMLFormElement} form
 */
function _syncCategoriaGastoFijo(form) {
  const catSel   = form.querySelector('[name="categoria"]');
  const nombre   = form.querySelector('[name="descripcion"]');
  const etiqueta = form.querySelector('#gfijo-descripcion-label');
  if (!catSel || !nombre || !etiqueta) return;

  const categoria   = catSel.value;
  const nombreAuto  = categoria && CATEGORIAS_AGENDA.includes(categoria) && categoria !== 'Otro';

  if (nombreAuto) {
    etiqueta.textContent = 'Nota (opcional)';
    nombre.placeholder   = 'Ej. Éxito, unidad 302, Netflix premium…';
    nombre.required      = false;
    nombre.removeAttribute('aria-required');
  } else {
    etiqueta.textContent = 'Descripción';
    nombre.placeholder   = 'Ej. Arriendo, Netflix, agua';
    nombre.required      = true;
    nombre.setAttribute('aria-required', 'true');
  }

  // CAT.2f: el picker de ícono solo tiene sentido con la categoría "Otro".
  const grupoIcono = form.querySelector('#form-group-gfijo-icono');
  if (grupoIcono) grupoIcono.hidden = categoria !== 'Otro';
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

// ── HANDLER: DISTRIBUIR DESDE EL DÍA DE INGRESO (ADR 021) ───────

/**
 * CTA del evento de día de ingreso: delega en tesorería vía EventBus
 * (`distribuir:abrir`), que navega a Mis cuentas y abre el asistente
 * "Distribuir mi ingreso". Agenda no conoce el panel ni el motor de reparto.
 */
function _distribuirDesdeAgenda() {
  EventBus.emit('distribuir:abrir');
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
  registrarAccion('agenda-distribuir-ingreso', _distribuirDesdeAgenda);

  // CAL.4a (ADR 037 D7): el ojo del hero del mes comparte el flag
  // S.config.ocultarSaldo con Inicio (IN.2), Mis cuentas (MC.18a) y Deudas
  // (D.16a): un solo control de privacidad en toda la app. El flip con
  // `!== true` es defensivo, igual que en 'saldo-visibilidad' (ui/actions.js).
  // updSaldo() mantiene el hero de Inicio en sincronía.
  registrarAccion('agenda-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
    renderSmart(renderAgenda, 'agenda');
  });

  _inyectarFormGastoFijo();

  // ADR 021: el calendario también muestra los días de ingreso, así que un
  // cambio en S.ingresos (alta, edición de diaPago, baja) debe re-renderizar.
  // CAL.4a: el hero (pagado del mes) y los badges de estado de pago leen
  // S.gastos, así que un abono o pago registrado/eliminado desde otra
  // sección también refresca (renderSmart solo pinta si la sección está
  // visible; con el calendario cerrado no cuesta nada).
  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos' || section === 'ingresos' || section === 'gastos') {
      renderBannerProposito('agenda', S.compromisos.length > 0);
      renderSmart(renderAgenda, 'agenda');
    }
  });

  // Re-render al navegar a #agenda. CAL.3: llegar desde OTRA sección arma
  // el auto-select de "hoy" (marcarEntradaSeccion); un state:change con la
  // sección ya abierta (arriba) no lo arma, para no pisar la selección del
  // usuario. La carga inicial de la app directo en #agenda (recarga,
  // deep-link) queda fuera a propósito: no es el caso de uso real que pidió
  // la tarjeta (navegar hacia la sección desde otra), y evita el efecto
  // extraño de auto-abrir el detalle en el primer pintado de la página.
  window.addEventListener('hashchange', () => {
    if ((location.hash.slice(1) || 'dash') === 'agenda') {
      marcarEntradaSeccion();
      renderBannerProposito('agenda', S.compromisos.length > 0);
      renderSmart(renderAgenda, 'agenda');
    }
  });

  renderBannerProposito('agenda', S.compromisos.length > 0);
  renderSmart(renderAgenda, 'agenda');
}
