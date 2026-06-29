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
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderSmart, updSaldo, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
import { validarCompromiso, normalizarCompromiso, validarAbono, ajustarMontoAbono, detectarDeudaCreciente, filtrarDeudasPagables, compararEstrategias, simularRenegociacion, simularConsolidacion, tasaMensualToEA } from './logic.js';
import {
  renderListaCompromisos,
  renderChooserCompromiso,
  renderFormDeuda,
  renderFormAbono,
  renderEstrategiaPago,
  setEstrategiaUI,
  renderAlertaFijosSinPagar,
  renderAlertaDeudasDurmiendo,
  renderPanelVencidos,
  renderPanelPrioridades,
} from './view.js';
import { renderResumenExtra, renderComparativaRenegociacion, renderComparativaConsolidacion } from './views/estrategia-impacto.js';

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
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  // En v6 la card de estrategia va ARRIBA (define el orden de pago).
  renderEstrategiaPago();
  renderAlertaFijosSinPagar();
  renderAlertaDeudasDurmiendo();
  renderListaCompromisos();
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoCompromiso() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  // Volvemos al chooser (paso 1) y reseteamos el título. Así si el usuario
  // cerró habiendo llegado al form (paso 2) y vuelve a abrir, ve el chooser.
  _mostrarChooser(overlay);
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
    guardar('compromisos', normalizarCompromiso(datos));
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

  const body = document.getElementById('modal-compromiso-body');
  if (!body) return;

  body.innerHTML = renderFormDeuda(comp.tipo, comp);

  const formEl = body.querySelector('#form-compromiso');
  if (formEl) {
    formEl.dataset.id = id;
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarCompromiso();
    });
  }

  abrirModal(overlay);
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

  eliminar('compromisos', id);
  _renderTodo();
  announce(`Compromiso "${compromiso.descripcion}" eliminado.`);
}

// ── HANDLERS DEL MODAL: FLUJO DE 2 PASOS ────────────────────────

/**
 * Pone el modal en el paso 1 (chooser). Reinyecta el HTML limpio y resetea el título.
 * @param {HTMLElement} overlay - el modal-overlay
 */
function _mostrarChooser(overlay) {
  const body = overlay.querySelector('.modal__body');
  const titulo = overlay.querySelector('.modal__title');
  if (body)   body.innerHTML = renderChooserCompromiso();
  if (titulo) titulo.textContent = 'Nueva deuda';
}

/**
 * Cuando el usuario elige el tipo (entidad | personal), pasamos al paso 2.
 * @param {HTMLElement} el - botón con data-tipo
 */
function _elegirTipoDeuda(el) {
  const tipo = el.dataset.tipo;
  if (tipo !== 'deuda-entidad' && tipo !== 'deuda-personal') return;

  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;

  const body   = overlay.querySelector('.modal__body');
  const titulo = overlay.querySelector('.modal__title');
  if (!body) return;

  body.innerHTML = renderFormDeuda(tipo);

  const tituloTexto = tipo === 'deuda-entidad' ? 'Deuda con entidad' : 'Deuda personal';
  if (titulo) titulo.textContent = tituloTexto;

  // Adjuntar submit handler al nuevo form.
  body.querySelector('#form-compromiso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCompromiso();
  });

  // Foco en el primer campo visible para accesibilidad.
  body.querySelector('input:not([type=hidden])')?.focus();
}

/**
 * Vuelve al chooser (paso 1) desde el form (paso 2).
 */
function _volverChooser() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  _mostrarChooser(overlay);
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
    guardar('gastos', {
      descripcion:        `Abono: ${deuda.descripcion}`,
      monto:              s.monto,
      categoria:          'Deudas',
      fecha:              datos.fecha,
      cuentaId:           s.cuentaId || null,
      nota:               repartido ? [notaBase, 'Abono repartido entre varias cuentas'].filter(Boolean).join(' · ') : notaBase,
      compromisoId:       deudaId,
      pendienteCompletar: false,
    });
    const cuenta = S.cuentas.find(x => x.id === s.cuentaId);
    if (cuenta) {
      editar('cuentas', s.cuentaId, { saldo: (cuenta.saldo ?? 0) - s.monto });
    }
  }

  // Reducir el saldo de la deuda por el total abonado.
  const nuevoSaldo = saldaDeuda ? 0 : Math.max(0, (Number(deuda.saldoTotal) || 0) - montoAjustado);
  editar('compromisos', deudaId, { saldoTotal: nuevoSaldo });

  const overlay = document.getElementById('modal-abono');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  updSaldo();

  const msg = saldaDeuda
    ? `Deuda "${deuda.descripcion}" saldada.`
    : `Abono de ${f(montoAjustado)} registrado en "${deuda.descripcion}".`;
  announce(msg);
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

function _actualizarTipProyeccion() {
  const montoInput = document.getElementById('abono-monto');
  const tipEl      = document.getElementById('abono-tip-proyeccion');
  const form       = document.getElementById('form-abono');
  if (!montoInput || !tipEl || !form) return;

  const monto = Number(montoInput.value);
  const cuota = Number(form.dataset.cuota);
  const saldo = Number(form.dataset.saldo);

  if (!cuota || cuota <= 0 || saldo <= 0 || !Number.isFinite(monto) || monto <= 0) {
    tipEl.textContent = '';
    return;
  }

  const montoEfectivo = Math.min(monto, saldo);
  const mesesAntes    = Math.ceil(saldo / cuota);
  const mesesDespues  = Math.ceil((saldo - montoEfectivo) / cuota);
  const mesesMenos    = mesesAntes - mesesDespues;

  if (mesesMenos <= 0) {
    tipEl.textContent = '';
    return;
  }

  const etiqueta = mesesMenos === 1 ? '1 mes antes' : `${mesesMenos} meses antes`;
  tipEl.textContent = `Con este abono terminas ${etiqueta}.`;
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

function _cambiarExtraEstrategia(el) {
  setEstrategiaUI({ extraMensual: el.value });
  renderEstrategiaPago();
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


// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  // Paso 1: al arrancar inyectamos el chooser en el modal.
  // El form (paso 2) se inyecta dinámicamente cuando el usuario elige tipo.
  const overlay = document.getElementById('modal-compromiso');
  if (overlay) _mostrarChooser(overlay);
}

export function initCompromisos() {
  registrarAccion('nuevo-compromiso',        _nuevoCompromiso);
  registrarAccion('editar-compromiso',       _editarCompromiso);
  registrarAccion('eliminar-compromiso',     _eliminarCompromiso);
  registrarAccion('abrir-abono',             _abrirAbono);
  registrarAccion('archivar-compromiso',     _archivarCompromiso);
  registrarAccion('elegir-estrategia',       _elegirEstrategia);
  registrarAccion('aplicar-renegociacion',   _aplicarRenegociacion);
  registrarAccion('aplicar-consolidacion',   _aplicarConsolidacion);
  registrarAccion('comp-elegir-tipo',        _elegirTipoDeuda);
  registrarAccion('comp-volver-chooser',     _volverChooser);

  _inyectarForm();

  // El extra mensual y la tasa de renegociación reaccionan en vivo al escribir:
  //   - extra: `input` actualiza el resumen sin re-render; `change` (blur)
  //     re-renderiza la card completa.
  //   - renegociar tasa: `input` actualiza la comparación y commitea el valor
  //     a estado (sin re-render) para no perder el clic en "Aplicar".
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.dataset.action === 'cambiar-extra-estrategia')     _actualizarResumenEnVivo(t);
    else if (t.dataset.action === 'cambiar-renegociar-tasa') _actualizarRenegociacionEnVivo(t);
    else if (t.dataset.action === 'cambiar-consolidar')      _actualizarConsolidacionEnVivo();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.dataset.action === 'cambiar-extra-estrategia') {
      _cambiarExtraEstrategia(t);
    } else if (t instanceof HTMLSelectElement && t.dataset.action === 'cambiar-renegociar-deuda') {
      _cambiarRenegociarDeuda(t);
    }
  });

  // Los paneles de Dashboard (Vencidos + Prioridades) se actualizan en cada
  // renderAll() para reflejar cambios cross-domain (ej. al cerrar un compromiso
  // desde otra sección). renderSmart corta si el dashboard no está activo.
  registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(_renderTodo, 'compromisos');
      // El dashboard también depende de compromisos: si el usuario crea/edita/
      // elimina uno y luego vuelve a #dash, el panel debe reflejarlo. renderSmart
      // corta si la sección activa no es 'dash', así que es barato llamarlo siempre.
      renderSmart(_renderDashboardPanels, 'dash');
    }
  });

  // "Distribuir mi ingreso" (ADR 012, MC.4b): aplica los abonos a deudas del
  // plan. Solo baja `saldoTotal` (topado en 0); el descuento de la cuenta de
  // origen lo centraliza tesorería. Los montos ya vienen topados al saldo.
  EventBus.on('distribucion:aplicar', ({ items }) => {
    const abonos = (items ?? []).filter(i => i.tipo === 'deuda' && i.monto > 0);
    for (const it of abonos) {
      const deuda = S.compromisos.find(c => c.id === it.id);
      if (!deuda) continue;
      const nuevoSaldo = Math.max(0, (Number(deuda.saldoTotal) || 0) - it.monto);
      editar('compromisos', it.id, { saldoTotal: nuevoSaldo });
    }
  });

  // Re-render al navegar a #compromisos o #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'compromisos') renderSmart(_renderTodo, 'compromisos');
    if (hash === 'dash')        renderSmart(_renderDashboardPanels, 'dash');
  });

  renderSmart(_renderTodo, 'compromisos');
  renderSmart(_renderDashboardPanels, 'dash');
}
