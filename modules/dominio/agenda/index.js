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
import { ocurrenciasEnMes } from '../../infra/vencimientos.js';
import { validarCompromiso, normalizarCompromiso } from '../compromisos/logic.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { CATEGORIAS_AGENDA } from '../../core/constants.js';
import { wireIconoPicker, setIconoPickerValor } from '../../infra/icon-picker.js';
import { iconoCategoria } from '../../infra/icons.js';
import { renderAgenda, renderFormGastoFijo, textoBannerGastoFijo, navegarMes, mostrarDia, marcarEntradaSeccion } from './view.js';

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
    const categoria = compromiso.categoria ?? '';
    const nombreAuto = categoria && CATEGORIAS_AGENDA.includes(categoria) && categoria !== 'Otro';
    // FORM.1c: la categoría es un chip de radio, no un select; se marca el
    // que corresponda (si `categoria` no está en el catálogo, ninguno queda
    // marcado, igual que antes con un <select> sin esa opción).
    const f_cat = form.querySelector(`[name="categoria"][value="${CSS.escape(categoria)}"]`);
    if (f_cat) f_cat.checked = true;
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
  _actualizarBannerGastoFijo(form);
  // FORM.1c: la categoría son chips-radio; un listener delegado de `change`
  // en el form cubre cualquiera de ellos (mismo patrón de Gastos/Deuda,
  // ADR 042). El banner se recalcula con cualquier `input` del form (tipeo
  // del día, cambio de frecuencia): más barato que filtrar por campo.
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') _syncCategoriaGastoFijo(form);
  });
  form.addEventListener('input', () => _actualizarBannerGastoFijo(form));
  wireIconoPicker(form.querySelector('[data-icono-picker="gfijo-icono"]'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGastoFijo();
  });
}

/**
 * FORM.1c (ADR 042 D5): recalcula el banner "Aparecerá cada X en tu
 * calendario el día N" leyendo la frecuencia y el día actuales del form.
 * @param {HTMLFormElement} form
 */
function _actualizarBannerGastoFijo(form) {
  const banner = form.querySelector('#gfijo-banner');
  if (!banner) return;
  const frecuencia = form.querySelector('[name="frecuencia"]')?.value ?? 'Mensual';
  const diaPago = form.querySelector('[name="diaPago"]')?.value ?? '';
  banner.textContent = textoBannerGastoFijo(frecuencia, diaPago);
}

/**
 * AG.4: alterna el rol del campo de texto según la categoría elegida.
 * Con una categoría predefinida (no "Otro"), el nombre lo da la categoría:
 * el campo pasa a ser una nota opcional. Sin categoría, o con "Otro", el
 * campo vuelve a ser el nombre obligatorio del registro.
 * @param {HTMLFormElement} form
 */
function _syncCategoriaGastoFijo(form) {
  const nombre   = form.querySelector('[name="descripcion"]');
  const etiqueta = form.querySelector('#gfijo-descripcion-label');
  if (!nombre || !etiqueta) return;

  // FORM.1c: la categoría son chips-radio; ninguno marcado equivale al
  // `<select>` vacío de antes.
  const categoria   = form.querySelector('[name="categoria"]:checked')?.value ?? '';
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
 * Registra el pago de un gasto fijo en el mes que el usuario está viendo en el
 * calendario (BUG-015), que no siempre es el actual: el botón trae ese mes en
 * `data-mes` y `_fechaPagoDelMes` decide la fecha del gasto.
 *
 * Usa resolverPagoConSelector: con varias cuentas pide elegir la cuenta
 * preferida (selector de tarjetas) y solo reparte si esa cuenta no alcanza,
 * sin dejar ninguna en negativo. Con una sola cuenta no pregunta.
 *
 * **El descuento de la cuenta siempre ocurre ahora, aunque el gasto quede
 * fechado en un mes pasado, y es lo correcto**: el saldo de una cuenta es un
 * valor "de hoy". Si el usuario pagó el arriendo en marzo y no lo registró, el
 * saldo que Finko muestra está inflado; registrarlo ahora lo pone al día con la
 * realidad del banco. No "corregir" esto descontando en la fecha del gasto: los
 * saldos no son históricos.
 *
 * @param {HTMLElement} el - botón con data-id del compromiso y data-mes del mes visible.
 */
async function _marcarPagadoGastoFijo(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp || comp.tipo !== 'fijo') return;

  // BUG-015: el pago pertenece al mes VISIBLE del calendario (el botón lo trae
  // en `data-mes`), no al mes actual. Antes se validaba y se fechaba siempre
  // contra hoy: marcar un mes pasado creaba un gasto de ESTE mes, el badge del
  // mes visible no viraba y el botón seguía invitando a re-clickear.
  const prefijo = el.dataset.mes || _prefijoMesActual();

  const fechaPago = _fechaPagoDelMes(comp, prefijo);
  if (!fechaPago) return; // mes futuro o prefijo inválido: no hay nada que pagar

  // Verificar que no esté pagado ya ese mes (defensa ante doble clic).
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
      fecha:              fechaPago,
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

/**
 * Fecha con la que se registra el pago de un gasto fijo del mes `prefijoMes`
 * ('YYYY-MM'), que es el mes VISIBLE en el calendario, no necesariamente el
 * actual (BUG-015).
 *
 * - Mes en curso: se fecha con hoy (el pago acaba de ocurrir).
 * - Mes pasado: se fecha con el vencimiento del compromiso en ESE mes (la
 *   última ocurrencia si el fijo cae varias veces); el pago ocurrió entonces,
 *   no hoy. Sin ocurrencia resoluble cae al último día del mes.
 * - Mes futuro: `null`. No se paga lo que aún no vence (Finko registra lo que
 *   pasó, mismo criterio que MC.13c-2); la vista ya oculta el botón y esto es
 *   la defensa en profundidad.
 *
 * @param {import('../../core/state.js').Compromiso} comp
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {string|null} 'YYYY-MM-DD' o null si el mes es futuro/inválido.
 */
function _fechaPagoDelMes(comp, prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return null;

  const anio = Number(m[1]);
  const mes  = Number(m[2]) - 1; // 0-indexed
  if (mes < 0 || mes > 11) return null;

  const d       = new Date();
  const anioHoy = d.getFullYear();
  const mesHoy  = d.getMonth();

  if (anio === anioHoy && mes === mesHoy) return hoy();
  if (anio > anioHoy || (anio === anioHoy && mes > mesHoy)) return null;

  const dias = ocurrenciasEnMes(comp, anio, mes);
  const dia  = dias.length > 0
    ? dias[dias.length - 1]
    : new Date(anio, mes + 1, 0).getDate();
  return `${prefijoMes}-${String(dia).padStart(2, '0')}`;
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
