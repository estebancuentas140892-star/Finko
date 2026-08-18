/**
 * compromisos/index.js - API pública del dominio de compromisos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderSmart, updSaldo, registrarRender, programarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { f, hoy } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { mostrarToast } from '../../ui/toast.js';
import { resolverPagoConPreferida, resolverPagoConSelector, wireToggleDebitoAutomatico } from '../../infra/cuenta-helper.js';
import { asignarSplitsPorItem } from '../../infra/distribuir-pago.js';
import { gastoDePagoCompromiso, bajarSaldoDeuda, fechaPagoDelMes, aplicarPagosCompromisos } from '../../infra/pago-compromiso.js';
import { wireIconoPicker, setIconoPickerValor } from '../../infra/icon-picker.js';
import { iconoCategoria } from '../../infra/icons.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { CATEGORIAS_AGENDA } from '../../core/constants.js';
import { validarCategoriaPersonalizada } from '../gastos/logic.js';
import { eventosDelMes, pendientesDePagoDelMes } from '../agenda/logic.js';
import { validarCompromiso, normalizarCompromiso, validarAbono, ajustarMontoAbono, consecuenciaDeAbono, detectarDeudaCreciente, filtrarDeudasPagables, compararEstrategias, simularRenegociacion, simularConsolidacion, repartirExtraEnCuotas, tasaMensualToEA, tasaMensualDecimal, vencidosSinPagar } from './logic.js';
import {
  renderHeroCompromisos,
  renderListaCompromisos,
  renderFormDeuda,
  renderFormAbono,
  renderFormGastoFijo,
  textoBannerGastoFijo,
  CATEGORIA_NUEVA_VALUE_FIJO,
  renderEstrategiaPago,
  setEstrategiaUI,
  getEstrategiaUI,
  renderAlertaDeudasDurmiendo,
  renderPanelVencidos,
  renderPanelPrioridades,
  renderLoteCard,
  renderFormPagoLote,
} from './view.js';
import { renderResumenExtra, renderComparativaRenegociacion, renderComparativaConsolidacion } from './views/estrategia-impacto.js';

/** Personalizadas de sección 'fijo' (CAT.3c): mismo criterio de oferta por sección del ADR 058 D2. */
function _personalizadasFijo() {
  return (S.categoriasPersonalizadas ?? []).filter(c => c.seccion === 'fijo');
}

/** Devuelve el prefijo YYYY-MM del mes actual para comparar fechas. */
function _prefijoMesActual() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

/**
 * Re-renderiza los paneles del dashboard que dependen de compromisos.
 * Se invoca en cada renderAll() (via registrarRender) para que el dashboard
 * refleje cambios cross-domain (ej. al pagar un gasto que cierra un compromiso).
 */
function _renderDashboardPanels() {
  renderPanelVencidos();
  renderPanelPrioridades();
}

/**
 * Ficha 05 (ADR 069): la tarjeta de "paga de una vez lo vencido" vive en
 * "Por pagar", no en el Calendario. Siempre el mes en curso: esta sección no
 * navega meses.
 */
function _renderLoteEnPorPagar() {
  const el = document.getElementById('lote-compromisos');
  if (!el) return;
  const prefijo = _prefijoMesActual();
  el.innerHTML = renderLoteCard(_pendientesDelMes(prefijo), prefijo);
}

/**
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  // D.16a: el hero con el total de deuda encabeza la sección (ADR 036 D1).
  renderHeroCompromisos();
  _renderLoteEnPorPagar();
  // En v6 la card de estrategia va ARRIBA de la lista (define el orden de pago).
  renderEstrategiaPago();
  renderAlertaDeudasDurmiendo();
  renderListaCompromisos();
}

/**
 * Los dos renders reactivos del dominio, con identidad estable para que el
 * coalescer de PERF.6 los deduplique: una acción que paga varios compromisos
 * de una vez emite `compromisos` y `gastos` varias veces en el mismo tick.
 */
function _renderSeccionReactivo() {
  renderBannerProposito('compromisos', S.compromisos.length > 0);
  renderSmart(_renderTodo, 'compromisos');
}

function _renderDashboardReactivo() {
  renderSmart(_renderDashboardPanels, 'dash');
}

/**
 * Ajusta el saldo de una cuenta en `delta` (positivo suma, negativo descuenta).
 * No-op si la cuenta no existe. Espejo del helper de ingresos puntuales
 * (NAV.A1, `tesoreria/acciones/ingresos.js`): D.14 reutiliza el mismo patrón
 * para acreditar/revertir la cuenta de origen de una deuda.
 *
 * @param {string} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/**
 * FORM.1b (ADR 042 D4): monta el form de deuda en el modal y cablea sus
 * listeners locales. Único punto de entrada para las tres formas de llegar
 * al form (crear con el tipo por defecto, cambiar de tipo con el segmented,
 * editar): evita triplicar el wiring.
 * @param {HTMLElement} overlay - el modal-overlay ya resuelto.
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @param {import('../../core/state.js').Compromiso|null} [deuda] - modo edición si se pasa.
 */
function _mostrarFormDeuda(overlay, tipo, deuda = null) {
  const body = overlay.querySelector('.modal__body');
  if (!body) return;

  body.innerHTML = renderFormDeuda(tipo, deuda);

  body.querySelector('#form-compromiso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCompromiso();
  });
  _wireToggleFiado(body);
  _wireIconoOtraCategoria(body);
  _wireCupoTarjeta(body);
  _wireCondicionesColapsable(body);
  // PA.1a: el débito automático sí aplica al editar (una deuda existente puede
  // pasar a debitarse sola, o dejar de hacerlo), a diferencia de la cuenta de
  // origen, que solo se fija al crear.
  wireToggleDebitoAutomatico(body, 'comp-debito');

  // El segmented y el foco inicial en descripción solo aplican al crear:
  // editar no permite cambiar el tipo (ver renderFormDeuda) ni necesita
  // acreditar cuenta de origen otra vez.
  if (!deuda) {
    _wireToggleOrigen(body);
    body.querySelector('#comp-descripcion')?.focus();
  }
}

function _nuevoCompromiso() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nueva deuda';
  // FORM.1b: arranca directo en el form (Entidad por defecto); el segmented
  // inline reemplaza el chooser de dos pasos.
  _mostrarFormDeuda(overlay, 'deuda-entidad');
  abrirModal(overlay);
}

async function _guardarCompromiso() {
  const form = document.getElementById('form-compromiso');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  // Alerta: la cuota no cubre el interés mensual, la deuda no baja o crece.
  const alerta = detectarDeudaCreciente(datos);
  if (alerta) {
    const titulo  = alerta.deficit === 0
      ? 'La cuota solo cubre los intereses'
      : 'La cuota no alcanza para cubrir los intereses';
    const mensaje = alerta.deficit === 0
      ? `Con este pago de ${f(alerta.cuotaMensual)}, solo cubrirás los intereses del mes. El saldo de la deuda se quedará igual y nunca bajará mientras mantengas esta cuota. Para empezar a reducir lo que debes, necesitas aumentar el pago mensual. ¿Quieres registrarla de todas formas?`
      : `Con este pago de ${f(alerta.cuotaMensual)}, no cubres los intereses mensuales de ${f(alerta.interesMensual)}. El saldo crecerá ${f(alerta.deficit)} cada mes en lugar de bajar: mientras más tiempo pase, más deberás. Para que la deuda empiece a bajar, necesitas pagar al menos ${f(alerta.interesMensual)} al mes. ¿Quieres registrarla de todas formas?`;
    const ok = await confirmar({ titulo, mensaje, confirmarTexto: 'Registrar igual', peligroso: false });
    if (!ok) return;
  }

  const idEdit = form.dataset.id || null;

  if (idEdit) {
    editar('compromisos', idEdit, normalizarCompromiso(datos));
  } else {
    const nuevo = normalizarCompromiso(datos);

    // D.14: si el usuario indicó que recibió el dinero en una cuenta, se
    // acredita el saldo total de la deuda a esa cuenta (espejo del ingreso
    // puntual, NAV.A1). `montoAcreditado` congela el monto acreditado para
    // poder revertirlo exacto si la deuda se elimina, sin depender de
    // abonos posteriores que ya modificaron saldoTotal.
    const cuentaOrigenId = (datos.recibioDinero === 'on' && datos.cuentaId) ? datos.cuentaId : null;
    if (cuentaOrigenId) {
      nuevo.cuentaOrigenId  = cuentaOrigenId;
      nuevo.montoAcreditado = nuevo.saldoTotal;
      _ajustarSaldoCuenta(cuentaOrigenId, nuevo.saldoTotal);
      updSaldo();
    }

    guardar('compromisos', nuevo);
  }

  const overlay = document.getElementById('modal-compromiso');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  announce(idEdit ? 'Deuda actualizada.' : 'Compromiso guardado correctamente.');
}

/** @param {HTMLElement} el */
function _editarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const comp = S.compromisos.find(c => c.id === id);
  if (!comp) return;

  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar deuda';

  _mostrarFormDeuda(overlay, comp.tipo, comp);

  const formEl = overlay.querySelector('#form-compromiso');
  if (formEl) formEl.dataset.id = id;

  abrirModal(overlay);
}

/**
 * D.13: interfaz adaptada para Fiado. Un fiado (tienda de barrio, vendedor)
 * no tiene cuota fija, ni tasa, ni frecuencia: se abona libre. Al elegir
 * Fiado en los chips de categoría se ocultan esos campos (y se limpian sus
 * valores); el día de pago queda como recordatorio de la fecha acordada.
 * Solo aplica a deuda personal: en entidad el chip es de producto.
 * @param {HTMLElement} body - contenedor del form ya inyectado.
 */
function _wireToggleFiado(body) {
  const form = body.querySelector('#form-compromiso');
  if (!form) return;
  if (form.querySelector('input[name="tipo"]')?.value !== 'deuda-personal') return;

  const grupos = ['#grupo-comp-cuota', '#grupo-comp-tasa', '#grupo-comp-frecuencia']
    .map(s => body.querySelector(s))
    .filter(Boolean);

  const aplicar = (valor) => {
    const esFiado = valor === 'Fiado';
    for (const g of grupos) g.hidden = esFiado;
    if (esFiado) {
      const cuota = form.querySelector('#comp-cuota');
      const tasa  = form.querySelector('#comp-tasa');
      if (cuota) cuota.value = '';
      if (tasa)  tasa.value  = '';
    }
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') aplicar(e.target.value);
  });
  aplicar(form.querySelector('input[name="categoria"]:checked')?.value ?? null); // estado inicial (ej. edición de un fiado existente)
}

/**
 * CAT.2d: el picker de ícono solo tiene sentido con la categoría 'Otra'
 * (entidad) / 'Otro' (personal); se revela/oculta el grupo al cambiar el
 * chip elegido. El form se re-renderiza completo en cada apertura (como
 * Gastos y Apartados, no como Metas): no hace falta `resetIconoPicker`.
 * @param {HTMLElement} body - contenedor del form ya inyectado.
 */
function _wireIconoOtraCategoria(body) {
  const form   = body.querySelector('#form-compromiso');
  const grupo  = body.querySelector('#grupo-comp-icono');
  const picker = body.querySelector('[data-icono-picker="comp-icono"]');
  if (!form || !grupo || !picker) return;

  const esEntidad     = form.querySelector('input[name="tipo"]')?.value === 'deuda-entidad';
  const categoriaOtra = esEntidad ? 'Otra' : 'Otro';

  const aplicar = (valor) => { grupo.hidden = valor !== categoriaOtra; };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') aplicar(e.target.value);
  });
  aplicar(form.querySelector('input[name="categoria"]:checked')?.value ?? null); // estado inicial (ej. edición de una deuda ya guardada como 'Otra')
  wireIconoPicker(picker);
}

/**
 * MC.16a (ADR 051 D1): el campo `cupoTotal` solo tiene sentido con categoría
 * 'Tarjeta de crédito' (entidad). Se revela/oculta al cambiar el chip, mismo
 * patrón que `_wireIconoOtraCategoria`.
 * @param {HTMLElement} body - contenedor del form ya inyectado.
 */
function _wireCupoTarjeta(body) {
  const form  = body.querySelector('#form-compromiso');
  const grupo = body.querySelector('#grupo-comp-cupo');
  if (!form || !grupo) return;
  if (form.querySelector('input[name="tipo"]')?.value !== 'deuda-entidad') return;

  const aplicar = (valor) => { grupo.hidden = valor !== 'Tarjeta de crédito'; };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'categoria') aplicar(e.target.value);
  });
  aplicar(form.querySelector('input[name="categoria"]:checked')?.value ?? null); // estado inicial (ej. edición de una tarjeta existente)
}

/**
 * FORM.1b (ADR 042 D4): despliega/colapsa "Condiciones del crédito" (tasa).
 * Frecuencia y día de pago quedan fuera del colapsable a propósito (ver
 * renderFormDeuda): son obligatorios y el día no tiene un valor por defecto
 * seguro para ocultar.
 * @param {HTMLElement} body - contenedor del form ya inyectado.
 */
function _wireCondicionesColapsable(body) {
  const trigger = body.querySelector('.form-disclosure__trigger');
  const panel   = body.querySelector('.form-disclosure__panel');
  if (!trigger || !panel) return;
  trigger.addEventListener('click', () => {
    const abierto = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!abierto));
    panel.hidden = abierto;
  });
}

/**
 * D.14: conecta el checkbox "Recibí este dinero en una de mis cuentas" con
 * el selector de cuenta destino, que arranca oculto. No-op si el bloque no
 * se renderizó (modo edición o sin cuentas activas, ver `renderFormDeuda`).
 * @param {HTMLElement} body - contenedor del form ya inyectado.
 */
function _wireToggleOrigen(body) {
  const cb    = body.querySelector('#comp-recibio-dinero');
  const grupo = body.querySelector('#grupo-comp-cuenta-origen');
  if (!cb || !grupo) return;
  cb.addEventListener('change', () => { grupo.hidden = !cb.checked; });
}

/** @param {HTMLElement} el */
async function _eliminarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  const ok = await confirmar({
    titulo:         'Eliminar compromiso',
    mensaje:        `¿Quieres eliminar "${compromiso.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  // D.14: si esta deuda acreditó una cuenta al crearse, revertir ese crédito
  // (espejo de eliminar un ingreso puntual, NAV.A1).
  if (compromiso.cuentaOrigenId) {
    _ajustarSaldoCuenta(compromiso.cuentaOrigenId, -(compromiso.montoAcreditado ?? 0));
    updSaldo();
  }

  eliminar('compromisos', id);
  _renderTodo();
  announce(`Compromiso "${compromiso.descripcion}" eliminado.`);
}

// ── HANDLER DEL SEGMENTED ENTIDAD/PERSONAL (FORM.1b) ─────────────

/**
 * Cambia el tipo de deuda (Entidad/Personal) sin cerrar el modal: el
 * segmented vive inline al tope del form (ADR 042 D4), ya no hay un paso
 * de chooser aparte. Solo aparece al crear (ver renderFormDeuda).
 * @param {HTMLElement} el - botón con data-tipo
 */
function _elegirTipoDeuda(el) {
  const tipo = el.dataset.tipo;
  if (tipo !== 'deuda-entidad' && tipo !== 'deuda-personal') return;

  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;

  _mostrarFormDeuda(overlay, tipo);
}

// ── CHOOSER "+ AGREGAR" (ficha 05, ADR 069) ──────────────────────

/**
 * "Por pagar" cubre tres tipos (fijo, deuda-entidad, deuda-personal) que no
 * caben en un solo formulario (un fijo no tiene tasa ni saldo total): en vez
 * de forzarlos dentro de `renderFormDeuda`, un solo botón de encabezado abre
 * esta hoja de tres chips y cada uno lleva a su propio modal ya existente
 * (FD6: un solo verbo, un solo botón de entrada).
 */
function _elegirTipoNuevo() {
  const overlay = document.getElementById('modal-compromiso-tipo');
  if (overlay) abrirModal(overlay);
}

/** @param {HTMLElement} el - chip con data-tipo dentro de la hoja de elección. */
function _elegirTipoNuevoIr(el) {
  const overlay = document.getElementById('modal-compromiso-tipo');
  if (overlay) cerrarModal(overlay);

  const tipo = el.dataset.tipo;
  if (tipo === 'fijo') _nuevoGastoFijo();
  else if (tipo === 'deuda-entidad' || tipo === 'deuda-personal') {
    const destino = document.getElementById('modal-compromiso');
    if (!destino) return;
    const titulo = destino.querySelector('.modal__title');
    if (titulo) titulo.textContent = 'Nueva deuda';
    _mostrarFormDeuda(destino, tipo);
    abrirModal(destino);
  }
}

// ── HANDLERS DEL MODAL "GASTO FIJO" (ficha 05: mudado desde Agenda) ──

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
    const nombreAuto = categoria && categoria !== 'Otro'
      && (CATEGORIAS_AGENDA.includes(categoria) || _personalizadasFijo().some(c => c.nombre === categoria));
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

    // PA.1a: el débito automático y su cuenta, si el compromiso ya los tenía.
    // El bloque no existe cuando no hay cuentas activas (ver
    // `renderBloqueDebitoAutomatico`), por eso todo es opcional-safe.
    if (compromiso.debitoAutomatico === true) {
      const check = form.querySelector('#gfijo-debito-check');
      if (check) check.checked = true;
      const cuenta = compromiso.cuentaDebitoId
        ? form.querySelector(`[name="cuentaDebitoId"][value="${CSS.escape(compromiso.cuentaDebitoId)}"]`)
        : null;
      if (cuenta) cuenta.checked = true;
    }
  }

  wireToggleDebitoAutomatico(form, 'gfijo-debito');

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
  wireIconoPicker(form.querySelector('[data-icono-picker="gfijo-categoria-nueva-icono"]'));

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
  const nombreAuto  = categoria && categoria !== 'Otro'
    && (CATEGORIAS_AGENDA.includes(categoria) || _personalizadasFijo().some(c => c.nombre === categoria));

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

  // CAT.3c: nombre + ícono de la categoría nueva solo con el chip sentinela.
  const camposNueva = form.querySelector('#gfijo-categoria-nueva-fields');
  if (camposNueva) camposNueva.hidden = categoria !== CATEGORIA_NUEVA_VALUE_FIJO;
}

function _guardarGastoFijo() {
  const form = document.getElementById('form-gasto-fijo');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const esCategoriaNueva = datos.categoria === CATEGORIA_NUEVA_VALUE_FIJO;
  const personalizadasFijo = _personalizadasFijo();

  // CAT.3c: mismo patrón que "Otra categoría" en Gastos (gastos/index.js). El
  // sentinela no es una categoría real todavía, así que se valida como si no
  // hubiera categoría elegida (categoria: '' no dispara el rechazo del catálogo).
  const errores = validarCompromiso(
    esCategoriaNueva ? { ...datos, categoria: '' } : datos,
    personalizadasFijo,
  );
  if (esCategoriaNueva) {
    errores.push(...validarCategoriaPersonalizada(
      { nombre: datos.categoriaNuevaNombre, icono: datos.categoriaNuevaIcono },
      S.categoriasPersonalizadas,
    ));
  }

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  // Crear y persistir la categoría antes de normalizar el compromiso, igual
  // que en Gastos: `datos.categoria` pasa a ser su nombre.
  if (esCategoriaNueva) {
    const nueva = guardar('categoriasPersonalizadas', {
      nombre:  datos.categoriaNuevaNombre.trim(),
      icono:   datos.categoriaNuevaIcono,
      seccion: 'fijo',
    });
    datos.categoria = nueva.nombre;
    personalizadasFijo.push(nueva);
  }

  const idEdit = form.dataset.id || null;
  const normalizado = normalizarCompromiso(datos, personalizadasFijo);

  if (idEdit) {
    editar('compromisos', idEdit, normalizado);
  } else {
    guardar('compromisos', normalizado);
  }

  const overlay = document.getElementById('modal-gasto-fijo');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  announce(idEdit ? 'Gasto fijo actualizado.' : 'Gasto fijo guardado correctamente.');
}

// ── HANDLERS ABONO A DEUDAS (ADR 002) ───────────────────────────

/** @param {HTMLElement} el */
function _abrirAbono(el) {
  const compromisoId = el.dataset.id;
  if (!compromisoId) return;

  const deuda = S.compromisos.find(c => c.id === compromisoId);
  if (!deuda) return;

  const overlay = document.getElementById('modal-abono');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Abonar: ${deuda.descripcion}`;

  const body = overlay.querySelector('.modal__body');
  if (body) {
    body.innerHTML = renderFormAbono(deuda);

    body.querySelector('#form-abono')?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAbono();
    });

    body.querySelector('#abono-monto')?.addEventListener('input', _actualizarTipProyeccion);
    _actualizarTipProyeccion();
  }

  abrirModal(overlay);
}

async function _guardarAbono() {
  const form = document.getElementById('form-abono');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const deudaId = datos.compromisoId;
  const deuda   = S.compromisos.find(c => c.id === deudaId);

  const errores = validarAbono(datos, deuda);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const { montoAjustado, saldaDeuda } = ajustarMontoAbono(
    Number(datos.monto),
    Number(deuda.saldoTotal),
  );

  // Usa la cuenta elegida; si no alcanza y hay más cuentas, abre el reparto.
  const splits = await resolverPagoConPreferida(
    S.cuentas,
    montoAjustado,
    datos.cuentaId,
    `registrar el abono a "${deuda.descripcion}"`,
  );
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta que no alcanza: confirmar el sobregiro (no hay reparto).
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar abono',
        mensaje:        `¿Registrar abono de ${f(montoAjustado)} desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
        confirmarTexto: 'Registrar abono',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  // Aplicar cada split: un gasto-abono vinculado + descuento de su cuenta.
  const repartido = splits.length > 1;
  const notaBase  = datos.nota?.trim() || '';
  for (const s of splits) {
    gastoDePagoCompromiso(deuda, {
      monto:    s.monto,
      fecha:    datos.fecha,
      cuentaId: s.cuentaId,
      nota:     repartido ? [notaBase, 'Abono repartido entre varias cuentas'].filter(Boolean).join(' · ') : notaBase,
    });
    const cuenta = S.cuentas.find(x => x.id === s.cuentaId);
    if (cuenta) {
      editar('cuentas', s.cuentaId, { saldo: (cuenta.saldo ?? 0) - s.monto });
    }
  }

  // Reducir el saldo de la deuda por el total abonado (ARQ.2 punto 2).
  bajarSaldoDeuda(deuda, montoAjustado);

  const overlay = document.getElementById('modal-abono');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  updSaldo();

  // ADR 062: mismo patron de gastos (GAS.2a/2b), el toast sustituye a announce().
  const detalle = consecuenciaDeAbono({
    saldaDeuda,
    saldoRestante: deuda.saldoTotal,
    ocultarSaldo:  !!S.config.ocultarSaldo,
  });

  mostrarToast({
    titulo:  `Abono ${f(montoAjustado)} a ${deuda.descripcion}`,
    detalle: detalle?.texto,
    tono:    detalle?.tono ?? 'ok',
  });
}

/** @param {HTMLElement} el */
async function _archivarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  const ok = await confirmar({
    titulo:         'Archivar deuda saldada',
    mensaje:        `"${compromiso.descripcion}" tiene saldo $0. ¿Quieres archivarla para que no aparezca más en la lista?`,
    confirmarTexto: 'Archivar',
    peligroso:      false,
  });
  if (!ok) return;

  editar('compromisos', id, { activo: false });
  _renderTodo();
  announce(`Deuda "${compromiso.descripcion}" archivada.`);
}

/**
 * D.15a: refuerzo psicológico siempre presente mientras el monto sea válido,
 * en vez de quedar en blanco cuando no hay una proyección de meses que mostrar
 * (deudas sin cuota fija, Fiado/D.13, o un abono chico que no adelanta un mes
 * completo). Prioridad de mensajes (el primero que aplique):
 *   1. El abono salda la deuda por completo → la reafirmación más fuerte.
 *   2. MC.16e: es una tarjeta y queda saldo → qué cuesta no pagar el total.
 *   3. Hay cuota registrada y el abono adelanta al menos un mes → cuánto antes.
 *   4. Cualquier otro abono válido → refuerzo genérico, nunca deja el campo vacío.
 * Tono ADR 003/008: afirma el progreso real, sin presión ni comparación.
 *
 * El caso 2 es el nudge de pago mínimo del ADR 051 D7, derivado y no capturado:
 * el mínimo del extracto cambia cada mes y quedaría viejo, mientras que "lo que
 * no pagues genera intereses" vale para cualquier abono que no cubra el saldo.
 * Con `tasa` registrada el aviso trae el monto; sin ella explica el mecanismo,
 * pero nunca inventa una cifra. Explica el costo, no califica la decisión.
 */
function _actualizarTipProyeccion() {
  const montoInput = document.getElementById('abono-monto');
  const tipEl      = document.getElementById('abono-tip-proyeccion');
  const form       = document.getElementById('form-abono');
  if (!montoInput || !tipEl || !form) return;

  const monto = Number(montoInput.value);
  const cuota = Number(form.dataset.cuota);
  const saldo = Number(form.dataset.saldo);

  if (saldo <= 0 || !Number.isFinite(monto) || monto <= 0) {
    tipEl.textContent = '';
    tipEl.classList.remove('form-hint--info');
    tipEl.classList.add('form-hint--muted');
    return;
  }

  const montoEfectivo = Math.min(monto, saldo);
  tipEl.classList.remove('form-hint--muted');
  tipEl.classList.add('form-hint--info');

  if (montoEfectivo >= saldo) {
    tipEl.textContent = '¡Con este abono saldas esta deuda por completo!';
    return;
  }

  if (form.dataset.tarjeta === '1') {
    const resto       = saldo - montoEfectivo;
    const tasaMensual = tasaMensualDecimal(form.dataset.tasa, form.dataset.tasaUnidad);
    const interes     = Math.round(resto * tasaMensual);
    tipEl.textContent = interes > 0
      ? `Quedan ${f(resto)} en la tarjeta. Con la tasa que registraste, ese saldo genera unos ${f(interes)} de intereses el próximo mes.`
      : `Quedan ${f(resto)} en la tarjeta: lo que no pagues del total genera intereses hasta el próximo corte.`;
    return;
  }

  if (cuota > 0) {
    const mesesAntes   = Math.ceil(saldo / cuota);
    const mesesDespues = Math.ceil((saldo - montoEfectivo) / cuota);
    const mesesMenos   = mesesAntes - mesesDespues;
    if (mesesMenos > 0) {
      const etiqueta = mesesMenos === 1 ? '1 mes antes' : `${mesesMenos} meses antes`;
      tipEl.textContent = `Con este abono terminas ${etiqueta}.`;
      return;
    }
  }

  tipEl.textContent = 'Cada abono reduce lo que debes, sin importar el monto.';
}

// ── HANDLERS ESTRATEGIA ──────────────────────────────────────────

// Handlers de la card de estrategia (F.4). En v6 la estrategia también
// define el orden de la lista de deudas, así que re-renderizamos ambas.
function _elegirEstrategia(el) {
  const estrategia = el.dataset.estrategia;
  if (estrategia !== 'avalancha' && estrategia !== 'bolaNieve') return;
  setEstrategiaUI({ estrategia });
  renderEstrategiaPago();
  renderListaCompromisos();
}

function _actualizarResumenEnVivo(el) {
  const extra = Number(el.value) || 0;
  const resumen = document.querySelector('.estrategia-card__resumen-extra');
  if (!resumen) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length < 2) return;

  const sinExtra = compararEstrategias(deudas, 0);
  const conExtra = extra > 0 ? compararEstrategias(deudas, extra) : null;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderResumenExtra(sinExtra, conExtra, extra);
  const nuevo = tmp.firstElementChild;
  if (nuevo) resumen.replaceWith(nuevo);

  // D.9/D.15d-2: el botón "Aplicar este aumento" vive en la palanca "Aumentar la
  // cuota", siempre visible. Se habilita con cualquier extra > 0 (subir la cuota
  // siempre ayuda). Solo actúa si el input de la palanca está en pantalla.
  const btn = document.querySelector('[data-action="aplicar-aumento-cuota"]');
  if (btn) btn.disabled = !(extra > 0);
}

// ── HANDLERS PANEL DE ALTERNATIVAS (D.8) ─────────────────────────

/** Alterna el panel de alternativas del bloque inviable (botón único). */
function _abrirPanelAlternativas() {
  const { panelAlternativasAbierto } = getEstrategiaUI();
  setEstrategiaUI({ panelAlternativasAbierto: !panelAlternativasAbierto });
  renderEstrategiaPago();
}

/** Cambia la alternativa visible en el selector (una a la vez). */
function _elegirAlternativa(el) {
  const alternativa = el.dataset.alternativa;
  if (alternativa !== 'aumentar' && alternativa !== 'renegociar' && alternativa !== 'consolidar') return;
  setEstrategiaUI({ alternativaActiva: alternativa });
  renderEstrategiaPago();
}

// ── HANDLERS AUMENTAR LA CUOTA (D.9) ─────────────────────────────

/**
 * Input del extra dentro del bloque inviable ("Aumenta tu cuota"). Commitea el
 * valor a estado en vivo (sin re-render) para no perder el clic en "Aplicar",
 * y actualiza el resumen + el estado del botón. Usa su propia acción para no
 * disparar el re-render que sí hace el acelerador del plan viable al blur.
 */
function _actualizarRemedioExtraEnVivo(el) {
  setEstrategiaUI({ extraMensual: el.value });
  _actualizarResumenEnVivo(el);
}

/**
 * Aplica el aumento de cuota (D.9): reparte el extra automáticamente
 * (`repartirExtraEnCuotas`: cubre déficits, remanente a la mayor tasa) y escribe
 * la nueva `cuotaMensual` sobre cada deuda afectada. Es la tercera superficie de
 * "simular → aplicar" (tras D.3a/D.3b); muta `S`, por eso pide confirmación que
 * nombra cada deuda y su nueva cuota. Lee el extra del input en vivo al hacer clic.
 */
async function _aplicarAumentoCuota() {
  const input = document.getElementById('estrategia-extra');
  const extra = Number(input ? input.value : getEstrategiaUI().extraMensual);
  if (!Number.isFinite(extra) || extra <= 0) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  const { incrementos } = repartirExtraEnCuotas(deudas, extra);
  if (incrementos.length === 0) return;

  const lista = incrementos
    .map(i => `${i.descripcion} sube de ${f(i.cuotaActual)} a ${f(i.cuotaNueva)}/mes`)
    .join('; ');
  const ok = await confirmar({
    titulo:         'Aumentar tu cuota',
    mensaje:        `Repartiremos ${f(extra)} extra al mes así: ${lista}. Esa nueva cuota se usará en tus pagos programados y al distribuir tu ingreso. Aplícalo solo si puedes sostener el aumento.`,
    confirmarTexto: 'Aplicar aumento',
    peligroso:      false,
  });
  if (!ok) return;

  for (const i of incrementos) {
    editar('compromisos', i.id, { cuotaMensual: i.cuotaNueva });
  }

  // El extra ya quedó incorporado a las cuotas: se resetea para no contarlo dos
  // veces en la simulación. Se cierra el panel para volver al estado limpio.
  setEstrategiaUI({ extraMensual: 0, panelAlternativasAbierto: false });
  _renderTodo();

  const n = incrementos.length;
  announce(n === 1
    ? 'Tu cuota mensual aumentó. Finko la usará en tus próximos pagos.'
    : `Aumentaste la cuota de ${n} deudas. Finko las usará en tus próximos pagos.`);
}

// ── HANDLERS RENEGOCIAR TASA (D.3a) ──────────────────────────────

/** Cambia la deuda elegida en la herramienta de renegociar; resetea la tasa
 *  escrita (su unidad puede diferir entre entidad y personal). */
function _cambiarRenegociarDeuda(el) {
  setEstrategiaUI({ renegociarDeudaId: el.value, renegociarTasaPct: 0 });
  renderEstrategiaPago();
}

/**
 * Actualiza en vivo la comparación de renegociación al escribir la nueva tasa.
 * Commitea el valor a estado (sin re-render) por dos razones: que sobreviva a
 * un re-render por otra causa, y que el clic en "Aplicar" no compita con un
 * re-render por `change` (blur) que reemplazaría el botón a mitad de clic.
 */
function _actualizarRenegociacionEnVivo(el) {
  setEstrategiaUI({ renegociarTasaPct: el.value });

  const cont = document.querySelector('.estrategia-card__renegociar-comparativa');
  if (!cont) return;

  const deudaId = el.dataset.deuda;
  const unidad  = el.dataset.unidad;
  const pct     = Number(el.value) || 0;

  const deuda = filtrarDeudasPagables(S.compromisos).find(d => d.id === deudaId);
  if (!deuda) return;

  const nuevaEA = unidad === 'mensual' ? tasaMensualToEA(pct / 100) : pct / 100;
  const sim = pct > 0 ? simularRenegociacion(deuda, nuevaEA) : null;
  cont.innerHTML = renderComparativaRenegociacion(sim, pct, unidad);

  const btn = document.querySelector('[data-action="aplicar-renegociacion"]');
  if (btn) btn.disabled = !(sim && sim.mejora);
}

/**
 * Aplica la nueva tasa a la deuda: escribe `tasa` + `tasaUnidad` en S. Es la
 * única acción de la simulación que muta datos (ADR 011, Revisión D.3); por eso
 * pide confirmación explícita. Lee el valor del input en vivo al hacer clic.
 */
async function _aplicarRenegociacion(el) {
  const deudaId = el.dataset.deuda;
  const unidad  = el.dataset.unidad === 'mensual' ? 'mensual' : 'EA';
  if (!deudaId) return;

  const input = document.getElementById('renegociar-tasa');
  const pct = Number(input?.value);
  if (!Number.isFinite(pct) || pct < 0) return;

  const deuda = S.compromisos.find(c => c.id === deudaId);
  if (!deuda) return;

  const ok = await confirmar({
    titulo:         'Aplicar nueva tasa',
    mensaje:        `¿Actualizar la tasa de "${deuda.descripcion}" a ${pct}% ${unidad}? Reemplaza la tasa registrada y recalcula tu plan. Confírmala con tu entidad antes de hacerlo.`,
    confirmarTexto: 'Aplicar',
    peligroso:      false,
  });
  if (!ok) return;

  editar('compromisos', deudaId, { tasa: pct / 100, tasaUnidad: unidad });
  setEstrategiaUI({ renegociarTasaPct: 0 });
  _renderTodo();
  announce(`Tasa de "${deuda.descripcion}" actualizada a ${pct}% ${unidad}.`);
}

// ── HANDLERS CONSOLIDAR DEUDAS (D.3b) ────────────────────────────

/**
 * Actualiza en vivo la comparación de consolidación al escribir la tasa o la
 * cuota del crédito nuevo. Lee ambos inputs (no solo el que disparó el evento)
 * y commitea a estado, sin re-render, por la misma razón que renegociar: que el
 * clic en "Consolidar" no compita con un re-render por `change` (blur).
 */
function _actualizarConsolidacionEnVivo() {
  const cont = document.querySelector('.estrategia-card__consolidar-comparativa');
  if (!cont) return;

  const tasaPct = Number(document.getElementById('consolidar-tasa')?.value) || 0;
  const cuota   = Number(document.getElementById('consolidar-cuota')?.value) || 0;
  setEstrategiaUI({ consolidarTasaPct: tasaPct, consolidarCuota: cuota });

  const deudas = filtrarDeudasPagables(S.compromisos);
  const sim = (tasaPct > 0 && cuota > 0)
    ? simularConsolidacion(deudas, { tasaEA: tasaPct / 100, cuota })
    : null;
  cont.innerHTML = renderComparativaConsolidacion(sim);

  const btn = document.querySelector('[data-action="aplicar-consolidacion"]');
  if (btn) btn.disabled = !(sim && sim.mejora);
}

/**
 * Aplica la consolidación: crea una deuda nueva (crédito de consolidación) con
 * el saldo sumado y archiva (activo:false) las deudas consolidadas. Muta varios
 * registros, así que pide una confirmación explícita y clara.
 */
async function _aplicarConsolidacion() {
  const tasaPct = Number(document.getElementById('consolidar-tasa')?.value);
  const cuota   = Number(document.getElementById('consolidar-cuota')?.value);
  if (!(tasaPct >= 0) || !(cuota > 0)) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length < 2) return;

  // Confirmar contra la simulación real: solo aplicar si mejora.
  const sim = simularConsolidacion(deudas, { tasaEA: tasaPct / 100, cuota });
  if (!sim || !sim.mejora) return;

  const saldoTotal = deudas.reduce((a, d) => a + (Number(d.saldo) || 0), 0);
  const n = deudas.length;

  const ok = await confirmar({
    titulo:         'Consolidar tus deudas',
    mensaje:        `¿Crear un crédito de consolidación de ${f(saldoTotal)} a ${tasaPct}% EA con cuota ${f(cuota)}/mes y archivar tus ${n} deudas actuales? Hazlo solo cuando tengas el crédito aprobado: cambia tus deudas registradas.`,
    confirmarTexto: 'Consolidar',
    peligroso:      false,
  });
  if (!ok) return;

  // Crear el crédito nuevo (entidad: tasa EA) antes de archivar las consolidadas.
  guardar('compromisos', {
    descripcion:  'Crédito de consolidación',
    frecuencia:   'Mensual',
    diaPago:      Math.min(new Date().getDate(), 28),
    tipo:         'deuda-entidad',
    activo:       true,
    saldoTotal,
    cuotaMensual: cuota,
    categoria:    null,
    tasa:         tasaPct / 100,
    tasaUnidad:   'EA',
  });
  for (const d of deudas) {
    editar('compromisos', d.id, { activo: false });
  }

  setEstrategiaUI({ consolidarTasaPct: 0, consolidarCuota: 0 });
  _renderTodo();
  updSaldo();
  announce(`${n} deudas consolidadas en un crédito nuevo de ${f(saldoTotal)}.`);
}

// ── HANDLERS: PAGO EN LOTE (ficha 05, ADR 069: mudado desde Agenda) ──

/**
 * Compromisos vencidos y sin cubrir del mes en curso, leídos de S. "Por
 * pagar" no navega meses (a diferencia del viejo Calendario): siempre es el
 * mes actual. Se recalcula en cada paso del flujo (abrir el modal, confirmar)
 * en vez de confiar en lo que el DOM traía: entre una cosa y otra el usuario
 * pudo pagar uno desde el detalle del día del Calendario, o eliminarlo.
 *
 * **Quién decide QUÉ está vencido y quién decide CUÁNTO se debe son dos
 * motores distintos, y acá se combinan a propósito.** `vencidosSinPagar` es la
 * fuente única del conjunto (la misma que cuentan la pastilla de la pestaña y
 * "Pendientes del mes" en Inicio, criterio de la ficha 01): entre otras cosas
 * descarta un compromiso registrado este mes DESPUÉS de su día de pago, que no
 * se puede deber. `pendientesDePagoDelMes` aporta el monto de cada fila, que es
 * lo que sabe resolver (resta el abono parcial del mes y topa la cuota al saldo
 * de la deuda). Sin el filtro, esta tarjeta contaba uno más que la pastilla que
 * tiene tres centímetros arriba.
 *
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {ReturnType<typeof pendientesDePagoDelMes>}
 */
function _pendientesDelMes(prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return [];
  const eventos = eventosDelMes(S.compromisos ?? [], +m[1], +m[2] - 1);
  const conMonto = pendientesDePagoDelMes(eventos, S.gastos ?? [], prefijoMes, hoy());
  const vencidos = new Set(
    vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).map(v => v.id),
  );
  return conMonto.filter(p => vencidos.has(p.id));
}

/**
 * Abre el modal del lote con todos los pendientes marcados. Es la puerta que
 * usa tanto el CTA propio de "Por pagar" como "Pagar los N" de "Pendientes
 * del mes" en Inicio (mismo dominio ahora: llamada directa, sin EventBus).
 *
 * @param {string} prefijoMes 'YYYY-MM' del mes a liquidar.
 */
function _abrirLote(prefijoMes) {
  const prefijo    = prefijoMes || _prefijoMesActual();
  const pendientes = _pendientesDelMes(prefijo);

  if (pendientes.length === 0) {
    // El estado cambió desde otra pestaña/sección: repintar y no abrir nada.
    announce('No quedan pagos vencidos sin registrar.');
    _renderTodo();
    return;
  }

  const overlay = document.getElementById('modal-pago-lote');
  const body    = document.getElementById('modal-pago-lote-body');
  if (!overlay || !body) return;

  body.innerHTML   = renderFormPagoLote(pendientes);
  body.dataset.mes = prefijo;
  _actualizarTotalLote();
  abrirModal(overlay);
}

/**
 * CTA de la tarjeta del lote en "Por pagar".
 * @param {HTMLElement} el - botón con data-mes del mes a liquidar.
 */
function _pagarLote(el) {
  _abrirLote(el?.dataset?.mes || _prefijoMesActual());
}

/**
 * Recalcula el total y el texto del botón según lo que quede marcado.
 * Solo toca los nodos del resumen: repintar el cuerpo entero desmarcaría las
 * casillas del usuario.
 */
function _actualizarTotalLote() {
  const body = document.getElementById('modal-pago-lote-body');
  if (!body) return;

  const marcados = [...body.querySelectorAll('.lote-row__check:checked')];
  const total    = marcados.reduce((acc, ch) => acc + (Number(ch.dataset.loteMonto) || 0), 0);

  const totalEl = body.querySelector('[data-role="lote-total"]');
  if (totalEl) {
    totalEl.textContent = marcados.length === 0
      ? 'Selecciona al menos un pago.'
      : `Total a registrar: ${f(total)}`;
    totalEl.classList.toggle('lote-total--vacio', marcados.length === 0);
  }

  const textoEl = body.querySelector('[data-role="lote-cta-texto"]');
  if (textoEl) {
    textoEl.textContent = marcados.length === 1
      ? 'Registrar 1 pago'
      : `Registrar ${marcados.length} pagos`;
  }

  const btn = body.querySelector('[data-action="compromisos-confirmar-lote"]');
  if (btn) btn.disabled = marcados.length === 0;
}

/**
 * Registra en un solo movimiento los pagos marcados en el modal.
 *
 * Resuelve la cuenta **una sola vez para el grupo** (ese es el punto de la
 * tarjeta: hoy son ~5 toques por gasto) usando el mismo
 * `resolverPagoConSelector` del pago individual de Agenda, y después reparte
 * esos splits entre los items con `asignarSplitsPorItem`: cada compromiso
 * conserva su propio gasto vinculado, que es lo que hace funcionar el badge
 * "Ya pagaste este mes" del Calendario y el progreso del hero. Un item puede
 * quedar a caballo entre dos cuentas; entonces genera dos gastos, igual que
 * un pago individual repartido.
 *
 * La fecha de cada pago sigue la regla de BUG-015 (`fechaPagoDelMes`, en
 * `infra/pago-compromiso.js`): mes en curso → hoy; mes pasado → la ocurrencia
 * de ese mes. El descuento de las cuentas ocurre ahora en ambos casos.
 *
 * El modal se cierra ANTES de pedir la cuenta: el selector es otro overlay con
 * su propio `trapFocus`, y apilarlos dejaría el foco atrapado en el de abajo al
 * cerrarse el de arriba. Si el usuario cancela ahí, vuelve a "Por pagar" con la
 * tarjeta del lote intacta (un toque para reintentar).
 */
async function _confirmarLote() {
  const body = document.getElementById('modal-pago-lote-body');
  if (!body) return;

  const prefijo = body.dataset.mes || _prefijoMesActual();
  const ids = [...body.querySelectorAll('.lote-row__check:checked')]
    .map(ch => ch.dataset.loteId)
    .filter(Boolean);
  if (ids.length === 0) return;

  const overlay = document.getElementById('modal-pago-lote');
  if (overlay) cerrarModal(overlay);

  // La fuente de verdad es S, no el DOM que se pintó al abrir el modal.
  const pendientes = _pendientesDelMes(prefijo).filter(p => ids.includes(p.id));
  if (pendientes.length === 0) {
    announce('No quedan pagos vencidos sin registrar.');
    _renderTodo();
    return;
  }

  const total = pendientes.reduce((acc, p) => acc + p.monto, 0);
  const splits = await resolverPagoConSelector(
    S.cuentas,
    total,
    `registrar ${pendientes.length} pagos vencidos`,
  );
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // Una sola cuenta: puede quedar en negativo (no hay con qué repartir).
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      const ok = await confirmar({
        titulo:         'Registrar pagos',
        mensaje:        `¿Registrar ${pendientes.length} pagos por ${f(total)} desde ${c?.nombre ?? 'la cuenta'}? El saldo disponible es ${f(saldoCuenta)}: quedará en negativo.`,
        confirmarTexto: 'Registrar pagos',
        peligroso:      true,
      });
      if (!ok) return;
    }
  }

  const pagos = [];
  for (const asignado of asignarSplitsPorItem(pendientes, splits)) {
    if (asignado.partes.length === 0) continue;
    const comp = S.compromisos.find(c => c.id === asignado.id);
    if (!comp) continue;
    const fecha = fechaPagoDelMes(comp, prefijo);
    if (!fecha) continue; // mes futuro: defensa en profundidad (BUG-015)
    pagos.push({ comp, fecha, partes: asignado.partes });
  }
  if (pagos.length === 0) return;

  aplicarPagosCompromisos(pagos);

  _renderTodo();
  _renderDashboardPanels();
  updSaldo();
  announce(pagos.length === 1
    ? `1 pago registrado por ${f(total)}.`
    : `${pagos.length} pagos registrados por ${f(total)}.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

export function initCompromisos() {
  registrarAccion('nuevo-compromiso',        _nuevoCompromiso);
  registrarAccion('editar-compromiso',       _editarCompromiso);
  registrarAccion('eliminar-compromiso',     _eliminarCompromiso);
  registrarAccion('abrir-abono',             _abrirAbono);
  registrarAccion('archivar-compromiso',     _archivarCompromiso);
  registrarAccion('elegir-estrategia',       _elegirEstrategia);
  registrarAccion('abrir-panel-alternativas', _abrirPanelAlternativas);
  registrarAccion('elegir-alternativa',      _elegirAlternativa);
  registrarAccion('aplicar-aumento-cuota',   _aplicarAumentoCuota);
  registrarAccion('aplicar-renegociacion',   _aplicarRenegociacion);
  registrarAccion('aplicar-consolidacion',   _aplicarConsolidacion);
  registrarAccion('comp-elegir-tipo',        _elegirTipoDeuda);

  // Ficha 05 (ADR 069): "Por pagar" es la única entrada para crear un
  // compromiso, de cualquiera de los tres tipos. Un botón abre la hoja de
  // elección; cada chip lleva a su modal (deuda reusa el ya existente; fijo
  // el suyo, mudado de Agenda).
  registrarAccion('comp-elegir-tipo-nuevo',    _elegirTipoNuevo);
  registrarAccion('comp-elegir-tipo-nuevo-ir', _elegirTipoNuevoIr);

  // Gasto fijo (ficha 05, ADR 069): crear/editar son de "Por pagar"; el botón
  // "Editar" del detalle del día del Calendario sigue abriendo el mismo
  // modal (mismo patrón que "Abonar" con una deuda). Eliminar reusa el
  // handler genérico `_eliminarCompromiso` (ya soporta cualquier tipo).
  registrarAccion('nuevo-gasto-fijo',    _nuevoGastoFijo);
  registrarAccion('agenda-editar-fijo',  _editarGastoFijo);
  registrarAccion('agenda-eliminar-fijo', _eliminarCompromiso);

  // Pago en lote (ficha 05, ADR 069: mudado desde Agenda). "Pagar los N" de
  // "Pendientes del mes" en Inicio y el CTA propio de "Por pagar" llaman al
  // mismo handler directo: mismo dominio, ya no hace falta EventBus.
  registrarAccion('inicio-pagar-lote',        () => _abrirLote(hoy().slice(0, 7)));
  registrarAccion('compromisos-pagar-lote',   _pagarLote);
  registrarAccion('compromisos-confirmar-lote', _confirmarLote);

  // El cuerpo del modal del lote se re-inyecta en cada apertura, pero el
  // contenedor persiste; por eso el listener del total cuelga de él una sola
  // vez aquí (colgarlo dentro de `_abrirLote` acumularía uno por apertura).
  document.getElementById('modal-pago-lote-body')
    ?.addEventListener('change', (e) => {
      if (e.target.classList?.contains('lote-row__check')) _actualizarTotalLote();
    });

  // D.16a (ADR 036 D7): el ojo del hero de Deudas comparte el flag
  // S.config.ocultarSaldo con el ojo de Inicio (IN.2) y el de Mis cuentas
  // (MC.18a): un solo control de privacidad en toda la app. El flip con
  // `!== true` es defensivo, igual que en 'saldo-visibilidad' (ui/actions.js).
  // updSaldo() mantiene el hero de Inicio en sincronía; el re-render de la
  // sección enmascara el total (y, cuando D.16d extienda la máscara, los
  // saldos por deuda).
  registrarAccion('compromisos-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
    renderSmart(_renderTodo, 'compromisos');
  });

  // El extra mensual y la tasa/cuota de las palancas reaccionan en vivo al
  // escribir. Todos commitean su valor a estado en el `input` y actualizan su
  // bloque SIN re-render, para no perder el clic en su botón "Aplicar" (que el
  // blur dispararía, reemplazando el botón a mitad de clic):
  //   - extra (palanca "Aumentar la cuota", D.9/D.15d-2): resumen + botón.
  //   - renegociar tasa: comparación + botón.
  //   - consolidar: comparación + botón (lee tasa y cuota).
  // El único `change` que re-renderiza es el selector de deuda a renegociar
  // (un <select> sin botón "Aplicar" en juego mientras se abre).
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.dataset.action === 'cambiar-extra-remedio')        _actualizarRemedioExtraEnVivo(t);
    else if (t.dataset.action === 'cambiar-renegociar-tasa') _actualizarRenegociacionEnVivo(t);
    else if (t.dataset.action === 'cambiar-consolidar')      _actualizarConsolidacionEnVivo();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t instanceof HTMLSelectElement && t.dataset.action === 'cambiar-renegociar-deuda') {
      _cambiarRenegociarDeuda(t);
    }
  });

  // Los paneles de Dashboard (Vencidos + Prioridades) se actualizan en cada
  // renderAll() para reflejar cambios cross-domain (ej. al cerrar un compromiso
  // desde otra sección). renderSmart corta si el dashboard no está activo.
  registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      programarRender(_renderSeccionReactivo);
    }
    // El dashboard también depende de compromisos: si el usuario crea/edita/
    // elimina uno y luego vuelve a #dash, el panel debe reflejarlo. renderSmart
    // corta si la sección activa no es 'dash', así que es barato llamarlo siempre.
    // CAL.5b suma 'gastos': "Pendientes del mes" ahora esconde lo ya pagado
    // (`vencidosSinPagar`), así que registrar un pago desde el lote o desde el
    // calendario tiene que repintarlo. Pagar un fijo no toca `compromisos`.
    if (section === 'compromisos' || section === 'gastos') {
      programarRender(_renderDashboardReactivo);
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4b): aplica los abonos extra a deudas
  // del plan. Registra el gasto-abono (mismo shape que el abono individual y que
  // `_aplicarNecesidad` de tesorería, BUG-006: sin él el abono era invisible
  // para Análisis, el ejecutado de Límites y el guard "ya pagado este periodo")
  // y baja `saldoTotal` (topado en 0). El descuento de la cuenta de origen lo
  // centraliza tesorería (el monto ya viene en `descontable`); aquí NO se toca
  // la cuenta. Los montos ya vienen topados al saldo.
  EventBus.on('distribucion:aplicar', ({ items, cuentaOrigenId = null }) => {
    const abonos = (items ?? []).filter(i => i.tipo === 'deuda' && i.monto > 0);
    for (const it of abonos) {
      const deuda = S.compromisos.find(c => c.id === it.id);
      if (!deuda) continue;
      gastoDePagoCompromiso(deuda, { monto: it.monto, fecha: hoy(), cuentaId: cuentaOrigenId });
      bajarSaldoDeuda(deuda, it.monto);
    }
  });

  // Re-render al navegar a #compromisos o #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'compromisos') {
      renderBannerProposito('compromisos', S.compromisos.length > 0);
      renderSmart(_renderTodo, 'compromisos');
    }
    if (hash === 'dash') renderSmart(_renderDashboardPanels, 'dash');
  });

  renderBannerProposito('compromisos', S.compromisos.length > 0);
  renderSmart(_renderTodo, 'compromisos');
  renderSmart(_renderDashboardPanels, 'dash');
}
