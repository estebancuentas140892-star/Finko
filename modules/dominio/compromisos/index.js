/**
 * compromisos/index.js - API pública del dominio de compromisos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { miles, desdeMiles } from '../../infra/miles.js';
import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { guardar, editar, eliminar, genId } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { prepararHojaTelefono } from '../../ui/captura-telefono.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { deshacerConConfirmacion } from '../../ui/deshacer-movimiento.js';
import { copiarTexto } from '../../infra/portapapeles.js';
import { datosDePago, nombreDatoPago, textoLlave, limpiarLlave } from '../../infra/llaves.js';
import { renderSmart, updSaldo, registrarRender, programarRender } from '../../infra/render.js';
import { seccionDelHash } from '../../infra/router.js';
import { announce } from '../../infra/a11y.js';
import { resaltarFilaNueva } from '../../infra/animate.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { mostrarToast } from '../../ui/toast.js';
import { resolverPagoConPreferida, resolverPagoConSelector, wireToggleDebitoAutomatico, cuentaHabitualDe, VOLVER, mensajeSinSaldo } from '../../infra/cuenta-helper.js';
import { asignarSplitsPorItem } from '../../infra/distribuir-pago.js';
import { gastoDePagoCompromiso, bajarSaldoDeuda, fechaPagoDelMes, aplicarPagosCompromisos, gmfDeRetiro } from '../../infra/pago-compromiso.js';
import { wireIconoPicker } from '../../infra/icon-picker.js';
import { resolverMarca, marcaEnCategoriaAgenda, marcaPorId } from '../../infra/marcas.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { prefijoMesBloque } from '../../infra/mes-bloque.js';
import { esCategoriaAgenda } from '../../core/constants.js';
import { validarCategoriaPersonalizada } from '../gastos/logic.js';
import { pagosPendientesDelMes, resumenObligaciones, tituloObligaciones } from '../../infra/estado-obligacion.js';
import { validarCompromiso, avisoTasaAlta, normalizarCompromiso, validarAbono, ajustarMontoAbono, consecuenciaDeAbono, detectarDeudaCreciente, filtrarDeudasPagables, compararEstrategias, simularRenegociacion, simularConsolidacion, repartirExtraEnCuotas, tasaMensualToEA, tasaMensualDecimal, reversionAvancesAlBorrar, validarAvance, normalizarAvance, aplicarAvance, costoDeAvance, textoCostoDeAvance, leerTasaEscrita, erroresTasaEscrita, esTarjetaOperable, cuentaEfectivoNueva, EFECTIVO_NUEVO, tasaEADe } from './logic.js';
import {
  renderHeroCompromisos,
  renderListaCompromisos,
  renderFormDeuda,
  renderFormAbono,
  renderFormAvance,
  renderFormGastoFijo,
  textoBannerGastoFijo,
  textoFrecuenciaGastoFijo,
  htmlContextoGastoFijo,
  CATEGORIA_NUEVA_VALUE_FIJO,
  FRECUENCIAS_CHIP_FIJO,
  FRECUENCIA_OTRA_FIJO,
  renderEstrategiaPago,
  renderEntradaPlanSalida,
  setEstrategiaUI,
  getEstrategiaUI,
  renderAlertaDeudasDurmiendo,
  renderPanelVencidos,
  renderPanelPrioridades,
  renderLoteCard,
  renderFormPagoLote,
  setFiltroPorPagar,
  getFiltroPorPagar,
  filtroDeLente,
  lentePorPagar,
  setGrupoDeudas,
} from './view.js';
import { renderResumenExtra, renderComparativaRenegociacion, renderComparativaConsolidacion } from './views/estrategia-impacto.js';
import { htmlDetalleCompromiso } from './views/detalle.js';
import { montoDeLaHoja } from './views/lista.js';
import { refrescarExtraPlan } from './views/plan-salida.js';
import { montosOcultos, alternarMontosOcultos } from '../../infra/privacidad.js';

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
  // Ficha 08: el lote liquida el mes que la lente está mostrando. Es la puerta
  // que sustituye al "Marcar pagado" del Calendario para un mes pasado.
  const prefijo = prefijoMesBloque();
  el.innerHTML = renderLoteCard(_pendientesDelMes(prefijo), prefijo);
}

/**
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  // ADR 179 D1: la pestaña (Fijos o Deudas) marca la sección para que los
  // estilos apaguen lo que no es de ella (el simulador y sus avisos son de
  // las deudas).
  const sec = document.getElementById('sec-compromisos');
  if (sec) sec.dataset.lente = filtroDeLente() ?? '';
  // D.16a: el hero con el total de deuda encabeza la sección (ADR 036 D1).
  renderHeroCompromisos();
  _renderLoteEnPorPagar();
  // En v6 la card de estrategia va ARRIBA de la lista (define el orden de pago).
  renderEstrategiaPago();
  renderAlertaDeudasDurmiendo();
  renderListaCompromisos();
  renderEntradaPlanSalida();
}

// ── EL PLAN DE SALIDA EN SU HOJA (ADR 119 D1) ──────────────────────

const _MQ_MOVIL = '(max-width: 1023.98px)';

/** Bajo 1024px, donde el bloque Gastos muestra sus pestañas. */
function _enMovil() {
  return window.matchMedia?.(_MQ_MOVIL).matches === true;
}

/**
 * ADR 179 D1: en el teléfono `#compromisos` no tiene pestaña; se queda en la
 * de Fijos o la de Deudas según `lentePorPagar()`. `replaceState` y no
 * `location.hash`: corre dentro del `hashchange`, antes que el router, que
 * lee el hash ya corregido y marca la pestaña. Sin entrada nueva en el
 * historial, así que "atrás" no vuelve a `#compromisos`.
 */
function _quedarseEnLaPestana() {
  if ((location.hash.slice(1) || 'dash') !== 'compromisos' || !_enMovil()) return;
  history.replaceState(null, '', `#${lentePorPagar()}`);
}

/**
 * Lleva a Por pagar: en el teléfono, a la pestaña que toca; en escritorio, a
 * la sección con su chip. Devuelve si hubo que navegar.
 *
 * @param {string} [lente] Pestaña del teléfono; sin ella, `lentePorPagar()`.
 * @returns {boolean}
 */
function _irAPorPagar(lente) {
  const destino = _enMovil() ? (lente ?? lentePorPagar()) : 'compromisos';
  if ((location.hash.slice(1) || 'dash') === destino) return false;
  location.hash = `#${destino}`;
  return true;
}

/**
 * Bajo 1024px el simulador (`#estrategia-pago`) se muda a su hoja; desde
 * 1024px vuelve a su sitio en la sección, donde lo ubica la rejilla de
 * escritorio (ADR 073). Una sola copia: sus campos guardan el estado de la
 * simulación (BUG-011), y dos dirían cosas distintas.
 */
function _ubicarEstrategia() {
  const est = document.getElementById('estrategia-pago');
  const sitio = document.getElementById('estrategia-pago-sitio');
  const hoja = document.getElementById('plan-salida-body');
  if (!est || !sitio || !hoja) return;
  if (window.matchMedia?.(_MQ_MOVIL).matches === true) {
    if (est.parentElement !== hoja) hoja.appendChild(est);
    return;
  }
  const overlay = document.getElementById('modal-plan-salida');
  if (overlay && 'open' in overlay.dataset) cerrarModal(overlay);
  if (est.previousElementSibling !== sitio) sitio.after(est);
}

/** El pago y su dato que nombra un botón (`data-id` y `data-dato`). */
function _datoPagoDe(el) {
  const c = (S.compromisos ?? []).find(x => x.id === el?.dataset?.id);
  const d = datosDePago(c?.datosPago).find(x => x.dato === el?.dataset?.dato);
  return c && d ? { ...d, compromiso: c } : null;
}

/** "Copiaste la llave de Martha Gómez"; si no se pudo, el dato a la vista. */
async function _copiarDatoPago(el) {
  const d = _datoPagoDe(el);
  if (!d) return;
  const que = nombreDatoPago(d.dato, d.compromiso.datosPago?.titular || d.compromiso.descripcion);
  if (await copiarTexto(d.valor)) {
    mostrarToast({ titulo: `Copiaste ${que}` });
    return;
  }
  mostrarToast({ titulo: 'No se pudo copiar', detalle: `Aquí está ${que}: ${d.valor}`, tono: 'alerta' });
}

function _verPlanSalida() {
  const overlay = document.getElementById('modal-plan-salida');
  if (!overlay) return;
  // AVC.1c (ADR 169 D8): el aviso de avances seguidos lo pide desde Inicio, y
  // el plan se pinta en Por pagar. Se navega y se abre después del re-render
  // del `hashchange`, como `_verCompromisoEnPorPagar`; en escritorio el plan
  // vive en la página, así que se trae a la vista.
  // ADR 179 D1: el plan es de las deudas; en el teléfono va a su pestaña.
  if (_irAPorPagar('deudas')) {
    setTimeout(() => {
      renderSmart(_renderTodo, 'compromisos');
      _ubicarEstrategia();
      if (window.matchMedia?.(_MQ_MOVIL).matches === true) abrirModal(overlay);
      else document.getElementById('estrategia-pago')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return;
  }
  _ubicarEstrategia();
  abrirModal(overlay);
}

/**
 * Cambia el chip activo de la lente (ADR 080 D6). Repinta solo la lista: el
 * hero, la estrategia y el lote hablan del mes completo y no del filtro, así
 * que un `_renderTodo()` los haría parpadear sin cambiar nada.
 *
 * @param {HTMLElement} el Elemento con `data-filtro`.
 */
function _filtrarPorPagar(el) {
  const id = el?.dataset?.filtro;
  if (!id || id === getFiltroPorPagar()) return;
  setFiltroPorPagar(id);
  renderListaCompromisos();
}

/**
 * Llegada prefiltrada desde otro dominio (ADR 080 D5, ampliada por la ficha 08).
 * La usan la tarjeta de crédito de Mis cuentas y cada fila del detalle del día
 * del Calendario, que dejó de tener acciones propias.
 *
 * El chip lo decide **este** dominio, no el emisor: el que llama sabe de qué
 * compromiso habla pero no de la taxonomía de esta lente, y hacerlo al revés
 * obligaría a cada emisor a saber que un fijo y una deuda se filtran distinto.
 * Un id que no existe cae en "todo": mejor la lista entera que una vacía.
 *
 * Pone el chip, navega si hace falta y trae la tarjeta a pantalla. El
 * `setTimeout` es el mismo apaño que usa `distribuir:abrir` en tesoreria: si
 * venimos de otra sección, el nodo al que hay que desplazarse no existe hasta
 * después del re-render del `hashchange`.
 *
 * `scrollIntoView` y no un cálculo de offset, igual que los chips de la casa
 * de Ahorro: el contenedor que hace scroll cambia entre móvil y escritorio y el
 * navegador ya sabe cuál es.
 *
 * @param {{ id?: string }} payload
 */
function _verCompromisoEnPorPagar({ id } = {}) {
  const compromiso = (S.compromisos ?? []).find(c => c.id === id);
  setFiltroPorPagar(compromiso?.tipo === 'fijo' ? 'fijo'
    : compromiso ? 'deuda'
    : 'todo');
  // GAS.9b (ADR 183 D2): en el teléfono, a la pestaña de su tipo: el fijo
  // en Fijos y la deuda (con su cuota) en Deudas.
  _irAPorPagar(compromiso && compromiso.tipo !== 'fijo' ? 'deudas' : 'fijos');
  setTimeout(() => {
    renderSmart(_renderTodo, 'compromisos');
    if (!id) return;
    const destino = document.querySelector(`#lista-compromisos .deuda-card[data-id="${CSS.escape(id)}"]`);
    if (!destino) return;
    destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // N7 (ADR 116 D1): con 20 filas a la vista nada decía cuál era la pedida.
    // El destello va cuando la tarjeta ya llegó: antes se gastaba en camino.
    let marcada = false;
    const marcar = () => { if (!marcada) { marcada = true; resaltarFilaNueva(destino, 'compromisos'); } };
    window.addEventListener('scrollend', marcar, { once: true });
    setTimeout(marcar, 450);
  }, 0);
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

  // GAS.9d (ADR 183 D4): una tarjeta de crédito nace en Mis cuentas. Desde
  // Deudas el formulario no la ofrece (dice dónde se agrega); la abren "Agregar
  // cuenta" (`data-desde="cuentas"`) y la edición de una tarjeta que ya existe.
  const conTarjeta = deuda
    ? deuda.categoria === 'Tarjeta de crédito'
    : overlay.dataset.desde === 'cuentas';
  body.innerHTML = renderFormDeuda(tipo, deuda, { sinTarjeta: !conTarjeta });

  body.querySelector('#form-compromiso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCompromiso();
  });
  _wireToggleFiado(body);
  _wireIconoOtraCategoria(body);
  _wireCupoTarjeta(body);
  _wireCondicionesColapsable(body);
  _wireDatosPago(body.querySelector('#form-compromiso'), 'comp');
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

  // ADR 142 D5: elegir el tipo vuelve a pintar el formulario con la hoja
  // abierta; el armazón de preguntas sigue en la siguiente.
  if ('open' in overlay.dataset) prepararHojaTelefono(overlay);
}

/**
 * PAG.1 (ADR 175): "Para pagar" en el resumen del teléfono dice el dato
 * principal ("Llave · 300 123 4567"); sin dato, queda como ficha de "Agrega
 * si quieres". Se repinta al escribir y al cambiar el tipo de la llave.
 * @param {HTMLFormElement|null} form
 * @param {string} prefijo
 */
function _wireDatosPago(form, prefijo) {
  if (!form) return;
  const pintar = () => {
    const destino = form.querySelector(`#${prefijo}-pago-resumen`);
    if (!destino) return;
    const tipo = form.querySelector('[name="pagoLlaveTipo"]:checked')?.value ?? '';
    const llave = limpiarLlave(tipo, form.querySelector('[name="pagoLlaveValor"]')?.value);
    const dp = {
      llave: llave ? { tipo, valor: llave } : null,
      numeroCuenta: form.querySelector('[name="pagoNumeroCuenta"]')?.value.trim(),
      referencia: form.querySelector('[name="pagoReferencia"]')?.value.trim(),
    };
    const principal = datosDePago(dp)[0];
    destino.textContent = principal ? `${principal.rotulo} · ${textoLlave(principal.tipo, principal.valor)}` : '';
  };
  form.addEventListener('input', pintar);
  form.addEventListener('change', pintar);
  pintar();
}

/**
 * Pone lo guardado de "Para pagar" en el formulario del fijo (el de la deuda
 * lo trae de `renderFormDeuda`).
 * @param {HTMLFormElement} form
 * @param {import('../../core/state.js').DatosPago|null|undefined} dp
 */
function _prellenarDatosPago(form, dp) {
  if (!dp) return;
  const poner = (nombre, valor) => { const el = form.querySelector(`[name="${nombre}"]`); if (el) el.value = valor ?? ''; };
  poner('pagoTitular', dp.titular);
  poner('pagoLlaveValor', dp.llave?.valor);
  poner('pagoNumeroCuenta', dp.numeroCuenta);
  poner('pagoEntidad', dp.entidad);
  poner('pagoReferencia', dp.referencia);
  const radio = dp.llave ? form.querySelector(`[name="pagoLlaveTipo"][value="${CSS.escape(dp.llave.tipo)}"]`) : null;
  if (radio) radio.checked = true;
}

function _nuevoCompromiso() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nueva deuda';
  delete overlay.dataset.desde;
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
    mostrarErroresForm(form, errores, undefined, () => validarCompromiso(Object.fromEntries(new FormData(form))));
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
  // ADR 142 D9: una tasa muy alta avisa en ámbar mientras se escribe; se
  // puede guardar igual.
  const tasa  = body.querySelector('#comp-tasa');
  const aviso = body.querySelector('#comp-tasa-aviso');
  const tipo  = body.querySelector('[name="tipo"]')?.value;
  if (tasa && aviso) {
    tasa.addEventListener('input', () => {
      const texto = avisoTasaAlta({ tipo, tasa: tasa.value });
      aviso.textContent = texto ?? '';
      aviso.hidden = !texto;
    });
  }
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
  // AVC.1a (ADR 169, I3 del ADR 053): el dinero de los avances de la tarjeta
  // entró a sus cuentas; sin la tarjeta no queda fila que lo explique.
  const reversion = Object.entries(reversionAvancesAlBorrar(compromiso));
  for (const [cuentaId, delta] of reversion) _ajustarSaldoCuenta(cuentaId, delta);
  if (reversion.length) updSaldo();

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
 *
 * REV.1 (ADR 137 D1): el botón sabe dónde estás. Con el chip "Fijos" abre de
 * una vez el gasto fijo; con "Deudas", el formulario de deuda, que ya pregunta
 * entidad o personal. Con "Todo" o "Pagado" no hay pista: la hoja de siempre.
 */
function _elegirTipoNuevo() {
  // ADR 179 D1: la pestaña (Fijos o Deudas) también es pista, como el chip.
  const filtro = filtroDeLente() ?? getFiltroPorPagar();
  if (filtro === 'fijo')  { _nuevoGastoFijo(); return; }
  if (filtro === 'deuda') { _nuevoCompromiso(); return; }
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
    // GAS.9d (ADR 183 D4): la tarjeta llega de "Agregar cuenta" en Mis
    // cuentas, con su categoría puesta; es la única puerta que la crea.
    const tarjeta = el.dataset.desde === 'cuentas' && el.dataset.categoria === 'Tarjeta de crédito';
    if (tarjeta) destino.dataset.desde = 'cuentas';
    else delete destino.dataset.desde;
    const titulo = destino.querySelector('.modal__title');
    if (titulo) titulo.textContent = tarjeta ? 'Nueva tarjeta de crédito' : 'Nueva deuda';
    _mostrarFormDeuda(destino, tipo);
    const categoria = el.dataset.categoria;
    const cat = categoria
      ? destino.querySelector(`#form-compromiso [name="categoria"][value="${CSS.escape(categoria)}"]`)
      : null;
    if (cat) {
      cat.checked = true;
      cat.dispatchEvent(new Event('change', { bubbles: true }));
    }
    abrirModal(destino);
  }
}

// ── HANDLERS DEL MODAL "GASTO FIJO" (ficha 05: mudado desde Agenda) ──

function _nuevoGastoFijo({ categoria = '', nombre = '' } = {}) {
  const overlay = document.getElementById('modal-gasto-fijo');
  if (!overlay) return;

  // Resetear modo edición y título.
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto fijo';

  // Re-inyectamos el form en cada apertura para restablecer defaults.
  _inyectarFormGastoFijo();
  // GAS.7d (ADR 179 D4): un camino del vacío de Fijos llega con su
  // categoría ya elegida y, si la categoría es más amplia (Energía en
  // Servicios públicos), con su nombre.
  const form = document.getElementById('form-gasto-fijo');
  if (form && categoria) {
    const cat = form.querySelector(`[name="categoria"][value="${CSS.escape(categoria)}"]`);
    if (cat) cat.checked = true;
    cat?.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const desc = form?.querySelector('[name="descripcion"]');
  if (desc && nombre) desc.value = nombre;
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

  body.innerHTML = renderFormGastoFijo({ categoriaActual: compromiso?.categoria ?? '' });

  const form = body.querySelector('#form-gasto-fijo');
  if (!form) return;

  // Modo edición: pre-rellenar campos y guardar id. En el teléfono abre en
  // el resumen de las preguntas (ADR 142 D5).
  if (compromiso) {
    form.dataset.id = compromiso.id;
    form.dataset.preguntas = 'Tu gasto fijo';
    form.dataset.preguntasInicio = 'resumen';
    const f_desc = form.querySelector('[name="descripcion"]');
    const f_monto = form.querySelector('[name="monto"]');
    const f_frec = form.querySelector('[name="frecuencia"]');
    const f_dia = form.querySelector('[name="diaPago"]');
    const f_btn = form.querySelector('[type="submit"]');
    const categoria = compromiso.categoria ?? '';
    const nombreAuto = categoria
      && (esCategoriaAgenda(categoria) || _personalizadasFijo().some(c => c.nombre === categoria));
    // FORM.1c: la categoría es un chip de radio, no un select; se marca el
    // que corresponda (si `categoria` no está en el catálogo, ninguno queda
    // marcado, igual que antes con un <select> sin esa opción).
    const f_cat = form.querySelector(`[name="categoria"][value="${CSS.escape(categoria)}"]`);
    if (f_cat) f_cat.checked = true;
    // SUS.1a (ADR 146 D4): la plataforma guardada; un fijo de antes de v51
    // propone la que su nombre o su nota ya mencionan (si es de su
    // categoría), y queda guardada solo si el usuario guarda.
    if (nombreAuto) {
      const sugerida = resolverMarca(`${compromiso.nota ?? ''} ${compromiso.descripcion ?? ''}`)?.id;
      const marcaId = compromiso.marcaId ?? (marcaEnCategoriaAgenda(sugerida, categoria) ? sugerida : null);
      const f_marca = marcaId
        ? form.querySelector(`[data-plataforma-grupo="${CSS.escape(categoria)}"] [name="marcaId"][value="${CSS.escape(marcaId)}"]`)
        : null;
      if (f_marca) f_marca.checked = true;
    }
    // AG.4: con categoría de nombre automático, el campo de texto muestra la
    // nota (no la descripción, que ya es la categoría); si no, la descripción.
    if (f_desc) f_desc.value = nombreAuto ? (compromiso.nota ?? '') : (compromiso.descripcion ?? '');
    if (f_monto) f_monto.value = miles(compromiso.monto);
    if (f_frec) f_frec.value = compromiso.frecuencia ?? 'Mensual';
    // REV.2b (ADR 141 D2): el chip de la frecuencia guardada, u "Otra" con
    // el desplegable a la vista si no es una de las tres de chip.
    const frecuencia = f_frec?.value ?? 'Mensual';
    const opcion = FRECUENCIAS_CHIP_FIJO.includes(frecuencia) ? frecuencia : FRECUENCIA_OTRA_FIJO;
    const f_opcion = form.querySelector(`[name="frecuenciaOpcion"][value="${CSS.escape(opcion)}"]`);
    if (f_opcion) f_opcion.checked = true;
    if (f_dia) f_dia.value = compromiso.diaPago ?? '';
    if (f_btn) f_btn.textContent = 'Actualizar gasto fijo';

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
  _wireMasOpcionesGastoFijo(form);
  // GF.2 (ADR 177 D4): en el teléfono, "Crea tu categoría" no sigue sin nombre
  // ni ícono (el armazón mira los `required` del bloque).
  const iconoNueva = form.querySelector('#gfijo-categoria-nueva-icono');
  if (iconoNueva) iconoNueva.required = true;

  _syncCategoriaGastoFijo(form);
  _syncFrecuenciaGastoFijo(form);
  // PAG.1: a dónde se paga, guardado.
  if (compromiso) _prellenarDatosPago(form, compromiso.datosPago);
  _wireDatosPago(form, 'gfijo');
  // Al editar, "Más opciones" se abre si guarda algo: una nota escrita, el
  // débito automático o a dónde se paga. Lo que se guardó no se esconde.
  if (compromiso && (form.querySelector('#gfijo-ranura-nota [name="descripcion"]')?.value
      || compromiso.debitoAutomatico === true || compromiso.datosPago)) {
    _abrirMasOpcionesGastoFijo(form, true);
  }
  _actualizarBannerGastoFijo(form);
  _pintarContextoGastoFijo(form);
  // FORM.1c: la categoría son chips-radio; un listener delegado de `change`
  // en el form cubre cualquiera de ellos (mismo patrón de Gastos/Deuda,
  // ADR 042). El banner se recalcula con cualquier `input` del form (tipeo
  // del día, cambio de frecuencia): más barato que filtrar por campo.
  form.addEventListener('change', (e) => {
    // GF.2 (ADR 177 D3): en el teléfono la empresa es su propia pantalla; ya
    // no hace falta traerla a la vista al elegir la categoría.
    if (e.target.name === 'categoria') _syncCategoriaGastoFijo(form);
    if (e.target.name === 'categoria' || e.target.name === 'marcaId') _syncSinEmpresaGastoFijo(form);
    if (e.target.name === 'marcaId') _rotularQueEsGastoFijo(form);
    // GAS.10f (ADR 185 D7): un chip de "Otra" escribe la frecuencia.
    if (e.target.name === 'frecuenciaOtra') {
      const select = form.querySelector('[name="frecuencia"]');
      if (select) {
        select.value = e.target.value;
        select.dispatchEvent(new Event('change'));
      }
      _actualizarBannerGastoFijo(form);
    }
    if (e.target.name === 'frecuenciaOpcion') {
      _syncFrecuenciaGastoFijo(form);
      // `input` corre antes que `change`: el banner se rehace con el valor nuevo.
      _actualizarBannerGastoFijo(form);
    }
    // GF.3: el desplegable de Finko (teléfono, frecuencia "Otra") despacha
    // solo `change`; sin esto, el aviso y el resumen decían la de antes.
    if (e.target.name === 'frecuencia') _actualizarBannerGastoFijo(form);
    _pintarContextoGastoFijo(form);
  });
  form.addEventListener('input', (e) => {
    _actualizarBannerGastoFijo(form);
    if (e.target.name === 'categoriaNuevaNombre' || e.target.name === 'nombreServicio') _rotularQueEsGastoFijo(form);
    _pintarContextoGastoFijo(form);
  });
  wireIconoPicker(form.querySelector('[data-icono-picker="gfijo-categoria-nueva-icono"]'), {
    onSeleccionar: () => { _rotularQueEsGastoFijo(form); _pintarContextoGastoFijo(form); },
  });

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
  // GF.2 (ADR 177 D6): "Cada mes" en la fila del resumen del teléfono.
  const enResumen = form.querySelector('#gfijo-resumen-frecuencia');
  if (enResumen) enResumen.textContent = textoFrecuenciaGastoFijo(frecuencia);
  // GAS.10f (ADR 185 D7): "Fecha de pago: El día 15" en la factura.
  const dia = form.querySelector('#gfijo-resumen-dia');
  if (dia) {
    const n = Number(diaPago);
    const cuando = n >= 31 ? 'último día del mes' : `día ${n}`;
    // GAS.11c (ADR 186 D6): el semanal paga cada 7 días desde ese día, no
    // ese día de cada mes.
    dia.textContent = !n ? '' : frecuencia === 'Semanal' ? `Desde el ${cuando}` : `El ${cuando}`;
  }
}

/**
 * Lo que el gasto fijo ya sabe de la categoría elegida (GF.2): su rótulo, su
 * familia, su ícono y la marca, si eligió una. La categoría nueva se nombra
 * con lo escrito y su ícono elegido, en "Tus categorías".
 * @param {HTMLFormElement} form
 * @returns {{ categoria: string, familia: string, nombreFamilia: string, simbolo: string, marca: object|null }|null}
 */
function _categoriaElegidaGastoFijo(form) {
  const radio = form.querySelector('[name="categoria"]:checked');
  if (!radio) return null;
  if (radio.value === CATEGORIA_NUEVA_VALUE_FIJO) {
    return {
      categoria: form.querySelector('[name="categoriaNuevaNombre"]')?.value.trim() || 'Tu categoría',
      familia: 'propias',
      nombreFamilia: 'Tus categorías',
      simbolo: form.querySelector('#gfijo-categoria-nueva-icono')?.value || 'c-etiqueta',
      marca: null,
    };
  }
  const chip = radio.closest('label');
  const familia = radio.closest('[data-familia]');
  return {
    categoria: chip?.querySelector('.chip-cat__label')?.textContent.trim() ?? radio.value,
    familia: familia?.dataset.familia ?? 'otros',
    nombreFamilia: familia?.querySelector('.familia-cat__t')?.textContent.trim() ?? '',
    simbolo: chip?.querySelector('use')?.getAttribute('href')?.slice(1) ?? 'c-otros',
    marca: marcaPorId(form.querySelector('[data-plataforma-grupo]:not([disabled]) [name="marcaId"]:checked')?.value) ?? null,
  };
}

/**
 * GF.2 (ADR 177 D1): lo ya respondido, que el teléfono pone sobre cada
 * pregunta. GAS.10e (ADR 185 D6): "Qué es", la empresa y "Crea tu categoría"
 * ya no lo llevan; el monto va bajo el título de la hoja ("Nuevo gasto fijo"
 * y debajo "$44.900"), como en Nuevo gasto. Queda la empresa (o la
 * categoría) con el monto en "¿Cuándo lo pagas?". En escritorio no se ve.
 * @param {HTMLFormElement} form
 */
function _pintarContextoGastoFijo(form) {
  const monto = desdeMiles(form.querySelector('[name="monto"]')?.value ?? '') ?? 0;
  const elegida = _categoriaElegidaGastoFijo(form);
  const poner = (sel, html) => { const el = form.querySelector(sel); if (el) el.innerHTML = html; };
  poner('#gfijo-ctx-cuando', elegida ? htmlContextoGastoFijo('cuando', { monto, ...elegida }) : '');
  // La cifra bajo el título: el CSS la muestra solo en el teléfono, fuera
  // del monto y del resumen.
  const titulo = document.getElementById('modal-gasto-fijo-title');
  if (titulo) {
    const base = titulo.querySelector('[data-titulo-base]')?.textContent ?? titulo.textContent;
    // GAS.10f (ADR 185 D7): en la factura, la cabecera dice "Gasto fijo".
    titulo.innerHTML = `<span data-titulo-base>${_esc(base)}</span><span class="modal__titulo-resumen">Gasto fijo</span>${monto > 0 ? `<span class="modal__titulo-sub">${_esc(f(monto))}</span>` : ''}`;
  }
}

/**
 * GAS.10e (ADR 185 D6): "Sin empresa: escribir el nombre" lleva a "Nombre
 * del servicio", con la teja de la categoría. Elegir una empresa (o cambiar
 * de categoría) la esconde y borra lo escrito: el fijo se llama como la
 * empresa.
 * @param {HTMLFormElement} form
 */
function _syncSinEmpresaGastoFijo(form) {
  const bloque = form.querySelector('#gfijo-sin-empresa');
  if (!bloque) return;
  const grupo = form.querySelector('[data-plataforma-grupo]:not([disabled])');
  const sinEmpresa = Boolean(grupo?.querySelector('[name="marcaId"][value=""]:checked'));
  bloque.hidden = !sinEmpresa;
  const campo = bloque.querySelector('[name="nombreServicio"]');
  if (!sinEmpresa && campo) campo.value = '';
  const teja = bloque.querySelector('#gfijo-servicio-teja');
  const elegida = _categoriaElegidaGastoFijo(form);
  if (teja) {
    const tmp = document.createElement('div');
    tmp.innerHTML = elegida ? htmlContextoGastoFijo('cuando', { monto: 0, ...elegida, marca: null }) : '';
    teja.innerHTML = tmp.querySelector('.familia-ico')?.outerHTML ?? '';
  }
}

/**
 * AG.4: alterna el rol del campo de texto según la categoría elegida.
 * Con una categoría predefinida (también "Otros" desde GF.1, ADR 167 D3), el
 * nombre lo da la categoría: el campo pasa a ser una nota opcional. Sin
 * categoría, el campo vuelve a ser el nombre obligatorio del registro.
 * @param {HTMLFormElement} form
 */
function _syncCategoriaGastoFijo(form) {
  const nombre   = form.querySelector('[name="descripcion"]');
  const etiqueta = form.querySelector('#gfijo-descripcion-label');
  if (!nombre || !etiqueta) return;

  // FORM.1c: la categoría son chips-radio; ninguno marcado equivale al
  // `<select>` vacío de antes.
  const categoria   = form.querySelector('[name="categoria"]:checked')?.value ?? '';
  // GF.2 (ADR 177 D4): la categoría nueva también da el nombre.
  const nombreAuto  = categoria
    && (esCategoriaAgenda(categoria) || categoria === CATEGORIA_NUEVA_VALUE_FIJO
      || _personalizadasFijo().some(c => c.nombre === categoria));

  if (nombreAuto) {
    etiqueta.innerHTML   = 'Nota <span class="form-optional">Opcional</span>';
    nombre.placeholder   = 'Ej. Apartamento 302, plan familiar…';
    nombre.required      = false;
    nombre.removeAttribute('aria-required');
  } else {
    etiqueta.textContent = 'Descripción';
    nombre.placeholder   = 'Ej. Arriendo, Netflix, agua';
    nombre.required      = true;
    nombre.setAttribute('aria-required', 'true');
  }

  // CAT.3c: nombre + ícono de la categoría nueva solo con el chip sentinela.
  const camposNueva = form.querySelector('#gfijo-categoria-nueva-fields');
  if (camposNueva) camposNueva.hidden = categoria !== CATEGORIA_NUEVA_VALUE_FIJO;

  // SUS.1a (ADR 146 D2): el selector de plataforma de la categoría elegida, y
  // ninguno más. `disabled` saca de FormData el `marcaId` de los otros grupos.
  let conEmpresa = null;
  for (const grupo of form.querySelectorAll('[data-plataforma-grupo]')) {
    const visible = nombreAuto && grupo.dataset.plataformaGrupo === categoria;
    grupo.hidden = !visible;
    grupo.disabled = !visible;
    if (visible) conEmpresa = grupo;
  }
  // GF.2 (ADR 177 D3): la empresa es su propia pregunta, solo si la
  // categoría tiene empresas; su título es la pregunta del grupo.
  const empresa = form.querySelector('#gfijo-empresa');
  if (empresa) {
    empresa.hidden = !conEmpresa;
    if (conEmpresa) empresa.dataset.pregunta = conEmpresa.dataset.plataformaPregunta;
  }
  _rotularQueEsGastoFijo(form);

  // REV.2b (ADR 141 D3): obligatorio, el campo va bajo "¿Qué es?"; nota, va
  // dentro de "Más opciones". Se muda el mismo nodo: lo escrito no se pierde,
  // y si ya tenía texto el plegable se abre para que no desaparezca de la vista.
  const grupo = form.querySelector('#gfijo-grupo-descripcion');
  const destino = form.querySelector(nombreAuto ? '#gfijo-ranura-nota' : '#gfijo-ranura-nombre');
  if (grupo && destino && grupo.parentElement !== destino) {
    destino.appendChild(grupo);
    if (nombreAuto && nombre.value.trim()) _abrirMasOpcionesGastoFijo(form, true);
  }
  _rotularMasOpcionesGastoFijo(form);
}

/**
 * SUS.1a: lo que el resumen del teléfono dice en "Qué es". Sin plataforma, el
 * rótulo del chip de categoría (lo que `valorDeBloque` leía antes); con
 * plataforma, los dos: "Streaming · Netflix".
 * @param {HTMLFormElement} form
 */
function _rotularQueEsGastoFijo(form) {
  const destino = form.querySelector('#gfijo-resumen-que');
  if (!destino) return;
  const elegida = _categoriaElegidaGastoFijo(form);
  // GAS.10e: sin empresa, el nombre escrito. GAS.10f (ADR 185 D7): la
  // factura dice el servicio ("Netflix") y a su lado la categoría.
  const servicio = elegida && !elegida.marca ? form.querySelector('[name="nombreServicio"]')?.value?.trim() : '';
  const nombre = elegida ? (elegida.marca?.nombre || servicio || elegida.categoria) : '';
  destino.textContent = nombre;
  const sub = form.querySelector('#gfijo-resumen-que-sub');
  if (sub) sub.textContent = elegida && nombre !== elegida.categoria ? elegida.categoria : '';
  // GF.2 (ADR 177 D6): la fila lleva la teja de la empresa o el ícono de la
  // categoría en el color de su familia (la misma teja del contexto).
  const icono = form.querySelector('#gfijo-resumen-que-icono');
  if (!icono) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = elegida ? htmlContextoGastoFijo('cuando', { monto: 0, ...elegida }) : '';
  icono.innerHTML = tmp.querySelector('.bank-avatar, .familia-ico')?.outerHTML ?? '';
}

/**
 * REV.2b (ADR 141 D2): los chips de "¿Cada cuánto?" escriben en el
 * `<select name="frecuencia">`, que es el dato; "Otra" lo deja a la vista con
 * la frecuencia que ya tenía, para elegir entre las nueve.
 * @param {HTMLFormElement} form
 */
function _syncFrecuenciaGastoFijo(form) {
  const opcion = form.querySelector('[name="frecuenciaOpcion"]:checked')?.value ?? 'Mensual';
  const select = form.querySelector('[name="frecuencia"]');
  const otra   = form.querySelector('#gfijo-frecuencia-otra');
  if (!select || !otra) return;
  const esOtra = opcion === FRECUENCIA_OTRA_FIJO;
  if (!esOtra && select.value !== opcion) {
    select.value = opcion;
    // GF.3: el desplegable de Finko del teléfono se refresca con su `change`.
    // Sin burbujear: no es una elección (no avanza ni repinta el formulario).
    select.dispatchEvent(new Event('change'));
  }
  otra.hidden = !esOtra;
  // GAS.10f (ADR 185 D7): los chips de "Otra" dicen la que está guardada.
  for (const r of form.querySelectorAll('[name="frecuenciaOtra"]')) r.checked = esOtra && r.value === select.value;
}

/**
 * REV.2b (ADR 141 D3): "Más opciones" se pliega y despliega con el mismo
 * patrón de "Condiciones del crédito" (`_wireCondicionesColapsable`).
 * @param {HTMLFormElement} form
 */
function _wireMasOpcionesGastoFijo(form) {
  const trigger = form.querySelector('#gfijo-mas .form-disclosure__trigger');
  if (!trigger) return;
  trigger.addEventListener('click', () => {
    _abrirMasOpcionesGastoFijo(form, trigger.getAttribute('aria-expanded') !== 'true');
  });
}

/** Abre o cierra "Más opciones" del gasto fijo. */
function _abrirMasOpcionesGastoFijo(form, abrir) {
  const trigger = form.querySelector('#gfijo-mas .form-disclosure__trigger');
  const panel   = form.querySelector('#gfijo-mas-panel');
  if (!trigger || !panel) return;
  trigger.setAttribute('aria-expanded', String(abrir));
  panel.hidden = !abrir;
}

/**
 * El rótulo de "Más opciones" dice lo que guarda adentro: la nota (cuando la
 * categoría ya da el nombre) y el débito automático (cuando hay cuentas). Sin
 * ninguna de las dos, el plegable no se pinta.
 * @param {HTMLFormElement} form
 */
function _rotularMasOpcionesGastoFijo(form) {
  const mas  = form.querySelector('#gfijo-mas');
  const desc = form.querySelector('#gfijo-mas-desc');
  if (!mas || !desc) return;
  const conNota   = !!form.querySelector('#gfijo-ranura-nota #gfijo-grupo-descripcion');
  const conDebito = !!form.querySelector('#gfijo-debito-check');
  // PAG.1: "Para pagar" siempre está, así que el plegable siempre se pinta.
  const partes = [conNota && 'nota', 'a dónde pagar', conDebito && 'débito automático'].filter(Boolean);
  mas.hidden = false;
  // GF.2 (ADR 177 D6): sin nota, el teléfono no la ofrece en "Agrega si quieres".
  const ranuraNota = form.querySelector('#gfijo-ranura-nota');
  if (ranuraNota) ranuraNota.hidden = !conNota;
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0];
  desc.textContent = `${lista.charAt(0).toUpperCase()}${lista.slice(1)} · opcional`;
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
  // GF.2 (ADR 177 D4): con la categoría nueva no se pide descripción: el
  // fijo se llama como ella. Lo que falte de su nombre lo dice su propio error.
  const validar = (d) => {
    const nueva = d.categoria === CATEGORIA_NUEVA_VALUE_FIJO;
    const e = validarCompromiso(nueva ? { ...d, categoria: '', descripcion: d.categoriaNuevaNombre?.trim() || '-' } : d, personalizadasFijo);
    if (nueva) {
      e.push(...validarCategoriaPersonalizada(
        { nombre: d.categoriaNuevaNombre, icono: d.categoriaNuevaIcono },
        S.categoriasPersonalizadas,
      ));
    }
    return e;
  };
  const errores = validar(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => validar(Object.fromEntries(new FormData(form))));
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
    mostrarErroresForm(form, errores, undefined, () => validarAbono(Object.fromEntries(new FormData(form)), deuda));
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

  // SAL.1 (ADR 163): una sola cuenta que no alcanza no se sobregira.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      await confirmar({
        titulo:         'Saldo insuficiente',
        mensaje:        mensajeSinSaldo(c, splits[0].monto),
        confirmarTexto: 'Entendido',
        soloAceptar:    true,
      });
      return;
    }
  }

  // Aplicar cada split: un gasto-abono vinculado + descuento de su cuenta.
  const repartido = splits.length > 1;
  const notaBase  = datos.nota?.trim() || '';
  // MOV.3 (ADR 154 D3): las partes del abono se deshacen juntas.
  const operacionId = repartido ? genId() : null;
  for (const s of splits) {
    // GMF.1b (ADR 165 D4): el abono también paga su 4x1000.
    const gmf = gmfDeRetiro(s.cuentaId, s.monto, datos.fecha);
    gastoDePagoCompromiso(deuda, {
      monto:    s.monto,
      fecha:    datos.fecha,
      cuentaId: s.cuentaId,
      nota:     repartido ? [notaBase, 'Abono repartido entre varias cuentas'].filter(Boolean).join(' · ') : notaBase,
      operacionId,
      costoGMF: gmf,
    });
    const cuenta = S.cuentas.find(x => x.id === s.cuentaId);
    if (cuenta) {
      editar('cuentas', s.cuentaId, { saldo: (cuenta.saldo ?? 0) - s.monto - gmf });
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
    ocultarSaldo:  montosOcultos('compromisos'),
  });

  mostrarToast({
    titulo:  `Abono ${f(montoAjustado)} a ${deuda.descripcion}`,
    detalle: detalle?.texto,
    tono:    detalle?.tono ?? 'ok',
  });
}

// ── SACAR UN AVANCE (AVC.1b, ADR 169 D1 a D3) ────────────────────

/**
 * Abre "Sacar un avance" de una tarjeta operable. Usa la hoja del abono
 * (`#modal-abono`), como "Abonar": mismo dominio, otro formulario.
 * @param {HTMLElement} el - lleva `data-id` de la tarjeta.
 */
function _abrirAvance(el) {
  const tarjeta = S.compromisos.find(c => c.id === el.dataset.id);
  if (!esTarjetaOperable(tarjeta)) return;

  const overlay = document.getElementById('modal-abono');
  const body = overlay?.querySelector('.modal__body');
  if (!overlay || !body) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Sacar un avance: ${tarjeta.descripcion}`;

  body.innerHTML = renderFormAvance(tarjeta);
  const form = body.querySelector('#form-avance');
  // MC.20c (ADR 171 D3): desde "Retirar efectivo" llega con el monto escrito.
  const montoPrevio = Number(el.dataset.monto) || 0;
  const campoMonto = form.querySelector('[name="monto"]');
  if (montoPrevio > 0 && campoMonto) campoMonto.value = miles(montoPrevio);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarAvance();
  });
  form.addEventListener('input', _actualizarCostoAvance);
  form.addEventListener('change', _actualizarCostoAvance);
  _actualizarCostoAvance();

  abrirModal(overlay);
}

/**
 * El costo en pesos y el aviso de cupo mientras se escribe (D2). Lee los
 * campos con `desdeMiles`: el valor visible lleva separador de miles.
 */
function _actualizarCostoAvance() {
  const form = document.getElementById('form-avance');
  if (!form) return;
  const monto    = desdeMiles(form.querySelector('[name="monto"]')?.value) ?? 0;
  const comision = desdeMiles(form.querySelector('[name="comision"]')?.value) ?? 0;
  const cuotas   = Number(form.querySelector('[name="cuotas"]:checked')?.value) || 0;
  const campoTasa = form.querySelector('[name="tasa"]');
  const pct = campoTasa ? leerTasaEscrita(campoTasa.value) : null;
  const tasaEA = campoTasa ? (pct > 0 ? pct / 100 : 0) : (Number(form.dataset.tasaEa) || 0);

  const costo = form.querySelector('#avance-costo');
  if (costo) {
    const texto = textoCostoDeAvance({ monto, tasaEA, cuotas, comision });
    costo.querySelector('[data-avance-costo]').textContent = texto;
    costo.hidden = !texto;
  }

  // Lo mismo que el consumo (ADR 051 D7): avisa que pasa del cupo, no bloquea.
  const sobre = form.querySelector('#avance-sobrecupo');
  if (sobre) {
    const disponible = Number(form.dataset.disponible) || 0;
    const exceso = monto + comision - disponible;
    const pasa = monto > 0 && exceso > 0;
    sobre.textContent = pasa
      ? `Este avance pasa del cupo en ${f(exceso)}: te quedan ${f(disponible)} disponibles. Puedes registrarlo, pero tu banco decide si lo aprueba.`
      : '';
    sobre.hidden = !pasa;
  }
}

/**
 * Los errores del avance: los de `validarAvance` con la tasa que se acaba de
 * escribir (si la tarjeta no tenía) y la cuenta Efectivo que se crearía.
 * @param {HTMLFormElement} form
 * @returns {string[]}
 */
function _erroresAvance(form) {
  const datos = Object.fromEntries(new FormData(form));
  const tarjeta = S.compromisos.find(c => c.id === datos.tarjetaId);
  const errTasa = 'tasa' in datos ? erroresTasaEscrita(datos.tasa) : [];
  const pct = 'tasa' in datos ? leerTasaEscrita(datos.tasa) : null;
  const conTasa = tarjeta && pct > 0 && errTasa.length === 0
    ? { ...tarjeta, tasa: pct / 100, tasaUnidad: 'EA' }
    : tarjeta;
  const cuentas = datos.cuentaId === EFECTIVO_NUEVO
    ? [...(S.cuentas ?? []), { id: EFECTIVO_NUEVO, activa: true }]
    : S.cuentas;
  const errores = validarAvance(datos, { tarjeta: conTasa, cuentas });
  // Una tasa mal escrita ya dice qué hacer: no se repite "escribe la tasa".
  return errTasa.length > 0
    ? [...errTasa, ...errores.filter(e => !e.startsWith('Escribe la tasa de tu tarjeta'))]
    : errores;
}

/**
 * Guarda el avance (D4): la tasa escrita queda en la tarjeta, la cuenta
 * Efectivo se crea si hacía falta, y la tarjeta y la cuenta suben con
 * `aplicarAvance`. Ni el avance ni la comisión son un gasto.
 */
function _guardarAvance() {
  const form = document.getElementById('form-avance');
  if (!form) return;

  const errores = _erroresAvance(form);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => _erroresAvance(form));
    return;
  }

  const datos = Object.fromEntries(new FormData(form));
  const pct = 'tasa' in datos ? leerTasaEscrita(datos.tasa) : null;
  if (pct > 0) editar('compromisos', datos.tarjetaId, { tasa: pct / 100, tasaUnidad: 'EA' });

  const cuentaId = datos.cuentaId === EFECTIVO_NUEVO
    ? guardar('cuentas', cuentaEfectivoNueva()).id
    : datos.cuentaId;

  const tarjeta = S.compromisos.find(c => c.id === datos.tarjetaId);
  const avance = { id: genId(), ...normalizarAvance({ ...datos, cuentaId }, tarjeta) };
  const r = aplicarAvance(tarjeta, S.cuentas, avance);
  if (!r) {
    mostrarToast({ titulo: 'No se pudo guardar el avance', detalle: 'Revisa la tarjeta y la cuenta, y vuelve a intentarlo.', tono: 'peligro' });
    return;
  }
  editar('compromisos', tarjeta.id, r.tarjeta);
  editar('cuentas', r.cuenta.id, { saldo: r.cuenta.saldo });

  const overlay = document.getElementById('modal-abono');
  if (overlay) cerrarModal(overlay);
  _renderTodo();
  updSaldo();

  const cuenta = S.cuentas.find(c => c.id === r.cuenta.id);
  const { costo } = costoDeAvance({ monto: avance.monto, tasaEA: tasaEADe(tarjeta), cuotas: avance.cuotas, comision: avance.comision });
  mostrarToast({
    titulo:  `Avance de ${f(avance.monto)} a ${cuenta?.nombre ?? 'tu cuenta'}`,
    detalle: montosOcultos('compromisos')
      ? `Queda en ${tarjeta.descripcion}.`
      : `${tarjeta.descripcion} queda en ${f(r.tarjeta.saldoTotal)}. Te cuesta unos ${f(Math.round(costo / 100) * 100)}.`,
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

  const monto = desdeMiles(montoInput.value) ?? 0;
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
  const extra = desdeMiles(el.value) ?? 0;
  // ADR 132 D10: la hoja del teléfono tiene su propio recuadro y su botón.
  if (refrescarExtraPlan(extra, getEstrategiaUI().estrategia)) return;
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
  // ADR 132 D10: en la hoja del teléfono cada opción es una fila que se abre
  // y se cierra; en la tarjeta de escritorio siempre hay una activa.
  const cerrar = el.dataset.plegable === '1' && getEstrategiaUI().alternativaActiva === alternativa;
  setEstrategiaUI({ alternativaActiva: cerrar ? null : alternativa });
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
  setEstrategiaUI({ extraMensual: desdeMiles(el.value) ?? 0 });
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
  const extra = input ? (desdeMiles(input.value) ?? 0) : getEstrategiaUI().extraMensual;
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
  const cuota   = desdeMiles(document.getElementById('consolidar-cuota')?.value) ?? 0;
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
  const cuota   = desdeMiles(document.getElementById('consolidar-cuota')?.value) ?? 0;
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
 * Pagos pendientes (vencidos o de hoy, sin cubrir) del mes, leídos de S. Se
 * recalcula en cada paso del flujo (abrir el modal, confirmar) en vez de
 * confiar en lo que el DOM traía: entre una cosa y otra el usuario pudo pagar
 * uno desde el detalle del día del Calendario, o eliminarlo.
 *
 * El conjunto, el monto y el estado de cada fila son los de
 * `pagosPendientesDelMes` (OB.1, ADR 151): la misma fuente que Atención hoy,
 * el panel de Inicio y la banda del Calendario.
 *
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {ReturnType<typeof pagosPendientesDelMes>}
 */
function _pendientesDelMes(prefijoMes) {
  return pagosPendientesDelMes(S.compromisos ?? [], S.gastos ?? [], prefijoMes, hoy());
}

/**
 * Abre el modal del lote con todos los pendientes marcados. Es la puerta que
 * usa tanto el CTA propio de "Por pagar" como "Pagar los N" de "Pendientes
 * del mes" en Inicio (mismo dominio ahora: llamada directa, sin EventBus).
 *
 * @param {string} prefijoMes 'YYYY-MM' del mes a liquidar.
 */
function _abrirLote(prefijoMes, marcados = null, tipo = null) {
  const prefijo    = prefijoMes || _prefijoMesActual();
  // ADR 179 D1: desde una pestaña, el lote trae solo los de su tipo.
  const tipoDe     = new Map((S.compromisos ?? []).map(c => [c.id, c.tipo]));
  const pendientes = _pendientesDelMes(prefijo).filter(p => !tipo
    || (tipo === 'fijo' ? tipoDe.get(p.id) === 'fijo' : tipoDe.get(p.id) !== 'fijo'));

  if (pendientes.length === 0) {
    // El estado cambió desde otra pestaña/sección: repintar y no abrir nada.
    announce('No quedan pagos pendientes sin registrar.');
    _renderTodo();
    return;
  }

  const overlay = document.getElementById('modal-pago-lote');
  const body    = document.getElementById('modal-pago-lote-body');
  if (!overlay || !body) return;

  // OB.1: el título dice el estado del conjunto ("Pagos vencidos" o "Pagos
  // para hoy", también con lo vencido dentro, AH.1e), como el grupo de
  // Atención hoy que abrió este modal.
  const titulo = document.getElementById('modal-pago-lote-title');
  if (titulo) titulo.textContent = tituloObligaciones(resumenObligaciones(pendientes));
  body.innerHTML   = renderFormPagoLote(pendientes, marcados);
  body.dataset.mes = prefijo;
  _actualizarTotalLote();
  abrirModal(overlay);
}

/**
 * CTA de la tarjeta del lote en "Por pagar".
 * @param {HTMLElement} el - botón con data-mes del mes a liquidar.
 */
function _pagarLote(el) {
  _abrirLote(el?.dataset?.mes || _prefijoMesActual(), null, el?.dataset?.tipo || null);
}

/**
 * Recalcula el total y el texto del botón según lo que quede marcado.
 * Solo toca los nodos del resumen: repintar el cuerpo entero desmarcaría las
 * casillas del usuario.
 */
function _actualizarTotalLote() {
  const body = document.getElementById('modal-pago-lote-body');
  if (!body) return;

  const todos    = body.querySelectorAll('.lote-row__check').length;
  const marcados = [...body.querySelectorAll('.lote-row__check:checked')];
  const total    = marcados.reduce((acc, ch) => acc + (Number(ch.dataset.loteMonto) || 0), 0);

  // INI.2c (ADR 152 D5): el pie dice "Total a pagar", cuántos van de cuántos
  // y la cifra; el botón, "Pagar los N". Sin nada marcado, el botón se
  // apaga y pide elegir uno.
  const vacio   = marcados.length === 0;
  const totalEl = body.querySelector('[data-role="lote-total"]');
  if (totalEl) totalEl.textContent = f(total);
  const conteo = body.querySelector('[data-role="lote-conteo"]');
  if (conteo) conteo.textContent = `${marcados.length} de ${todos} ${todos === 1 ? 'seleccionado' : 'seleccionados'}`;

  const textoEl = body.querySelector('[data-role="lote-cta-texto"]');
  if (textoEl) {
    textoEl.textContent = vacio
      ? 'Elige al menos un pago'
      : marcados.length === 1 ? 'Pagar 1 pago' : `Pagar los ${marcados.length}`;
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
    announce('No quedan pagos pendientes sin registrar.');
    _renderTodo();
    return;
  }

  const total = pendientes.reduce((acc, p) => acc + p.monto, 0);
  // HF.2a: si todos los del lote salen de la misma cuenta habitual, el
  // selector abre en ella; si no coinciden, no hay una que proponer.
  const habituales = new Set(pendientes.map(p => cuentaHabitualDe(p.id, S.gastos, S.cuentas)));
  const preferidaId = habituales.size === 1 ? [...habituales][0] : null;
  // OB.1: el contexto no repite cuántos ni en qué estado (el usuario los
  // acaba de marcar) y no puede decir "vencidos" de lo que vence hoy.
  // INI.2d (ADR 152 D6): la hoja de la cuenta trae "Volver", que regresa a
  // esta hoja con las mismas casillas.
  const splits = await resolverPagoConSelector(
    S.cuentas,
    total,
    pendientes.length === 1 ? 'registrar este pago' : 'registrar estos pagos',
    { preferidaId, volver: true },
  );
  if (splits === VOLVER) {
    _abrirLote(prefijo, ids);
    return;
  }
  if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

  // SAL.1 (ADR 163): una sola cuenta que no alcanza no se sobregira.
  if (splits.length === 1) {
    const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
    const saldoCuenta = c?.saldo ?? 0;
    if (saldoCuenta < splits[0].monto) {
      await confirmar({
        titulo:         'Saldo insuficiente',
        mensaje:        mensajeSinSaldo(c, splits[0].monto),
        confirmarTexto: 'Entendido',
        soloAceptar:    true,
      });
      return;
    }
  }

  // INI.3 (ADR 153 D6): mientras el usuario elegía la cuenta pudo entrar el
  // mismo pago por otro lado (otra pestaña, la nube, un segundo toque). Se
  // vuelve a mirar S: si algún pago ya no está pendiente o cambió su monto,
  // no se registra nada y la lista se repinta. Así nada se paga dos veces.
  const vigentes = new Map(_pendientesDelMes(prefijo).map(p => [p.id, p.monto]));
  if (pendientes.some(p => vigentes.get(p.id) !== p.monto)) {
    announce('Algunos de estos pagos cambiaron mientras elegías la cuenta. Revisa la lista y vuelve a intentarlo.');
    _renderTodo();
    _renderDashboardPanels();
    return;
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
  registrarAccion('abrir-avance',            _abrirAvance);
  registrarAccion('archivar-compromiso',     _archivarCompromiso);
  registrarAccion('elegir-estrategia',       _elegirEstrategia);
  registrarAccion('abrir-panel-alternativas', _abrirPanelAlternativas);
  registrarAccion('elegir-alternativa',      _elegirAlternativa);
  registrarAccion('aplicar-aumento-cuota',   _aplicarAumentoCuota);
  registrarAccion('aplicar-renegociacion',   _aplicarRenegociacion);
  registrarAccion('aplicar-consolidacion',   _aplicarConsolidacion);
  registrarAccion('comp-elegir-tipo',        _elegirTipoDeuda);

  // ADR 080 D6: los cuatro chips de la lente, que la ficha 05 especificó y
  // dejó sin construir.
  registrarAccion('comp-filtrar',            _filtrarPorPagar);
  // GAS.8e (ADR 182 D5): las dos puertas de Deudas (entidades y personas).
  registrarAccion('deudas-grupo', (el) => {
    setGrupoDeudas(el?.dataset?.grupo);
    _renderTodo();
  });

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
  // INI.7b (ADR 184 D2): la fila de un pago en Atención hoy abre el lote con
  // solo ese pago marcado.
  registrarAccion('inicio-pagar-uno', (el) => _abrirLote(hoy().slice(0, 7), el?.dataset?.id ? [el.dataset.id] : null));
  registrarAccion('compromisos-pagar-lote',   _pagarLote);
  registrarAccion('compromisos-ver-plan',     _verPlanSalida);
  registrarAccion('comp-nuevo-fijo-sugerido', (el) => _nuevoGastoFijo({
    categoria: el?.dataset?.categoria ?? '',
    nombre: el?.dataset?.nombre ?? '',
  }));
  // PAG.1 (ADR 175 D2 y D3): copiar y ver el dato para pagar, en la ficha del
  // pago. Copiar no cierra la hoja: al volver del banco, se marca pagado.
  registrarAccion('pago-copiar', _copiarDatoPago);
  registrarAccion('pago-ver', (el) => {
    const d = _datoPagoDe(el);
    if (!d) return;
    const span = document.createElement('span');
    span.className = 'detalle-cuenta__valor';
    span.textContent = textoLlave(d.tipo, d.valor, { ver: true });
    el.replaceWith(span);
  });
  // AVC.1d (ADR 169 D6): deshacer un avance desde la hoja de su tarjeta, con
  // el mismo recorrido de "Deshacer movimiento" (MOV.3).
  registrarAccion('deshacer-avance', async (el) => {
    const hecho = await deshacerConConfirmacion(el.dataset.id, {
      titulo: 'Deshacer avance', confirmarTexto: 'Deshacer', listo: 'Avance deshecho',
    });
    if (hecho) _renderTodo();
  });
  registrarAccion('compromisos-confirmar-lote', _confirmarLote);

  // ADR 132 D7: la fila de Por pagar abre su hoja, armada con los datos del
  // compromiso (la cuota del mes, cuánto falta, la tasa y el día de pago). Es
  // la hoja de la fila (`#modal-detalle-fila`), como la del gasto (ADR 119 D2).
  registrarAccion('compromiso-detalle', (el) => {
    const c = S.compromisos.find(x => x.id === el.dataset.id);
    const hoja = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!c || !hoja || !cuerpo) return;
    const prefijoMes = el.dataset.mes || prefijoMesBloque();
    // GAS.9d (ADR 183 D4): la fila de la tarjeta en Mis cuentas abre esta
    // misma hoja sin traer el monto: se calcula como en la fila de Deudas.
    cuerpo.innerHTML = htmlDetalleCompromiso(c, {
      prefijoMes,
      monto: el.dataset.monto !== undefined ? Number(el.dataset.monto) || 0 : montoDeLaHoja(c, prefijoMes),
    });
    abrirModal(hoja);
  });

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
    alternarMontosOcultos('compromisos');
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

  // El reloj del bloque Gastos (ficha 07, ADR 069 D8) mueve el mes y repinta
  // con renderAll(): sin esto la lente se queda en el mes anterior.
  registrarRender(() => renderSmart(_renderTodo, 'compromisos'));

  // ADR 117 D1: la lista cambia de anatomía en 1024px (filas por urgencia en
  // el teléfono, tarjetas por tipo en escritorio). Al cruzar el corte se
  // repinta, y el simulador cambia de casa (ADR 119 D1).
  _ubicarEstrategia();
  window.matchMedia?.(_MQ_MOVIL).addEventListener?.('change', () => {
    _ubicarEstrategia();
    // ADR 179 D1: al pasar al teléfono en `#compromisos`, a su pestaña.
    if (_enMovil() && (location.hash.slice(1) || 'dash') === 'compromisos') {
      location.replace(`#${lentePorPagar()}`);
      return;
    }
    renderSmart(_renderTodo, 'compromisos');
  });

  // `gastos` entra por dos motivos distintos, y los dos vienen de que pagar un
  // fijo o abonar una deuda escribe en `gastos` y no en `compromisos`:
  //
  // - **La lista** (ficha 08): el "Marcar pagado" del fijo vive acá desde que
  //   el detalle del día del Calendario dejó de tener acciones. Sin esto la
  //   fila conserva su botón después del pago y su chip no vira, así que la
  //   pantalla invita a re-pagar un mes ya pagado.
  // - **El dashboard** (CAL.5b): "Pendientes del mes" esconde lo ya pagado
  //   (`vencidosSinPagar`), así que un pago desde el lote, desde el calendario
  //   o desde esta lista tiene que repintarlo.
  //
  // Los dos renders cortan solos con `renderSmart` si su sección no es la
  // activa, así que llamarlos siempre es barato.
  EventBus.on('state:change', ({ section }) => {
    if (section !== 'compromisos' && section !== 'gastos') return;
    programarRender(_renderSeccionReactivo);
    programarRender(_renderDashboardReactivo);
  });

  // ADR 080 D5 y ficha 08: quien tiene un compromiso a la vista y no puede
  // operarlo manda su id, y esta lente pone el chip y lo trae a pantalla. El
  // emisor no puede filtrar acá porque ningún dominio importa a otro (ADN 10).
  EventBus.on('porPagar:ver-compromiso', _verCompromisoEnPorPagar);

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

  // Re-render al navegar a #compromisos (o a sus pestañas #fijos y #deudas,
  // ADR 179 D1) o a #dash.
  window.addEventListener('hashchange', () => {
    _quedarseEnLaPestana();
    const hash = location.hash.slice(1) || 'dash';
    if (seccionDelHash(hash) === 'compromisos') {
      renderBannerProposito('compromisos', S.compromisos.length > 0);
      renderSmart(_renderTodo, 'compromisos');
    }
    if (hash === 'dash') renderSmart(_renderDashboardPanels, 'dash');
  });

  _quedarseEnLaPestana();
  renderBannerProposito('compromisos', S.compromisos.length > 0);
  renderSmart(_renderTodo, 'compromisos');
  renderSmart(_renderDashboardPanels, 'dash');
}
