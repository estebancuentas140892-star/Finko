/**
 * gastos/index.js - API pública del dominio de gastos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { TARJETA_PREFIJO } from '../../core/constants.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy, f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { mostrarToast } from '../../ui/toast.js';
import { resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
import { wireIconoPicker } from '../../infra/icon-picker.js';
import {
  validarGasto, normalizarGasto,
  deltasPorEdicionDeGasto, deltasPorEdicionEnDeuda, deltasPorEdicionEnCuotaMensual,
  validarCategoriaPersonalizada, excesoDeCupo,
} from './logic.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { renderListaGastos, renderFormGasto, renderFiltrosGastos, setFiltroCategoria, navegarMesGastos, irAMesActual, ayerIso, CATEGORIA_NUEVA_VALUE } from './view.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto() {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Re-inyectar el form cada vez: las tarjetas del selector de cuenta
  // dependen de S.cuentas, que puede haber cambiado desde la última apertura.
  // Sugerencias (TX.12) sí se muestran: es el caso de uso que las motiva.
  _montarFormGasto();

  // Pre-rellenar la fecha con hoy para mejor UX.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto';

  abrirModal(overlay);
}

async function _guardarGasto() {
  const form = document.getElementById('form-gasto');
  if (!form) return;

  const datos  = Object.fromEntries(new FormData(form));
  const idEdit = form.dataset.id || null;

  // La cuenta de origen viene del selector de tarjetas (radio name="cuentaId").
  const errores = validarGasto(datos);

  // TX.9b: "+ Otra categoría" pide nombre + ícono en el mismo formulario;
  // se valida junto con el resto para un solo paso de errores.
  const esCategoriaNueva = datos.categoria === CATEGORIA_NUEVA_VALUE;
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

  // Crear y persistir la categoría antes de normalizar el gasto: `datos.categoria`
  // pasa a ser su nombre, exactamente como si el usuario hubiera elegido una nativa.
  if (esCategoriaNueva) {
    const nueva = guardar('categoriasPersonalizadas', {
      nombre:  datos.categoriaNuevaNombre.trim(),
      icono:   datos.categoriaNuevaIcono,
      seccion: 'gasto',
    });
    datos.categoria = nueva.nombre;
  }

  // GAS.2a: nombre + monto para el toast de confirmación. Se capturan aquí,
  // antes de que cualquier rama transforme `datos` (reparto entre cuentas,
  // consumo con tarjeta), porque el toast siempre nombra el gasto completo
  // como lo escribió el usuario, no cada registro derivado de él.
  const montoGasto     = Number(datos.monto);
  const categoriaGasto = datos.categoria;

  if (idEdit) {
    // En edición calculamos los deltas a aplicar a los saldos comparando
    // contra el gasto anterior. Maneja cambios de monto y/o de cuenta.
    const gasto = normalizarGasto(datos);
    const anterior = S.gastos.find(g => g.id === idEdit);
    if (anterior) {
      const deltas = deltasPorEdicionDeGasto(
        { cuentaId: anterior.cuentaId, monto: anterior.monto },
        { cuentaId: gasto.cuentaId,    monto: gasto.monto    },
      );
      _aplicarDeltasASaldos(deltas);

      // Preservar el compromisoId del gasto-abono original: el formulario no lo
      // expone. Un consumo con tarjeta (MC.16b) sí trae el suyo del selector,
      // así que ahí manda lo que el usuario acaba de elegir.
      if (!gasto.compromisoId && anterior.compromisoId && !anterior.consumoTC) {
        gasto.compromisoId = anterior.compromisoId;
      }

      // Sincronizar saldoTotal si el gasto tocaba una deuda (abono o consumo).
      _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(anterior, gasto));
      // MC.16d: sincronizar cuotaMensual si el consumo cambió de monto o de cuotas.
      _aplicarDeltasACuotaMensual(deltasPorEdicionEnCuotaMensual(anterior, gasto));
    }
    editar('gastos', idEdit, gasto);
  } else {
    // En creación: se usa la cuenta elegida. Si no alcanza, el reparto entre
    // varias se resuelve al confirmar, sin dejar ninguna en negativo. Un
    // registro por cuenta usada.
    const base = normalizarGasto(datos); // incluye la cuenta o la tarjeta elegida

    if (base.consumoTC) {
      // MC.16b (ADR 051 D3): un consumo con tarjeta no sale de ninguna cuenta,
      // así que no pasa por el reparto ni por el aviso de sobregiro. Sube el
      // saldo de la tarjeta y nada más; lo demás (categoría, límites, análisis)
      // lo recibe como cualquier gasto.
      guardar('gastos', base);
      _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(null, base));
      // MC.16d: el consumo sube cuotaMensual en monto/cuotas (1 = pago único).
      _aplicarDeltasACuotaMensual(deltasPorEdicionEnCuotaMensual(null, base));
    } else {
      const splits = await resolverPagoConPreferida(
        S.cuentas, base.monto, base.cuentaId, 'registrar el gasto',
      );
      if (splits === null) return; // canceló o fue redirigido a Mis Cuentas

      // Una sola cuenta que no alcanza: confirmar el sobregiro (no hay reparto).
      if (splits.length === 1) {
        const c = S.cuentas.find(x => x.id === splits[0].cuentaId);
        const saldoCuenta = c?.saldo ?? 0;
        if (saldoCuenta < splits[0].monto) {
          const ok = await confirmar({
            titulo:         'Registrar gasto',
            mensaje:        `${c?.nombre ?? 'La cuenta'} tiene ${f(saldoCuenta)} y el gasto es ${f(splits[0].monto)}: quedará en negativo. ¿Registrar de todas formas?`,
            confirmarTexto: 'Registrar gasto',
            peligroso:      true,
          });
          if (!ok) return;
        }
      }

      const repartido = splits.length > 1;
      for (const s of splits) {
        guardar('gastos', {
          ...base,
          cuentaId: s.cuentaId || null,
          monto:    s.monto,
          nota:     repartido ? [base.nota, 'Gasto repartido entre varias cuentas'].filter(Boolean).join(' · ') : base.nota,
        });
        _ajustarSaldoCuenta(s.cuentaId, -s.monto);
      }
    }
  }

  const overlay = document.getElementById('modal-gasto');
  if (overlay) cerrarModal(overlay);

  renderListaGastos();
  updSaldo();

  // GAS.2a: el toast (role="status") es ahora el aviso de que el gasto se
  // guardó, visual y para lector de pantalla a la vez; sustituye al
  // announce() que había acá antes (mismo rol, doble anuncio si se conservan
  // los dos). La segunda línea con la consecuencia (límite/saldo) es GAS.2b.
  mostrarToast({
    titulo: idEdit ? 'Gasto actualizado' : `${categoriaGasto} ${f(montoGasto)}`,
  });
}

/** Abre el modal de gasto en modo edicion con datos pre-rellenados. */
function _editarGasto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const gasto = S.gastos.find(g => g.id === id);
  if (!gasto) return;

  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;

  resetModal(overlay);
  // TX.12: sin sugerencias en modo edición, repetir un patrón no tiene
  // sentido mientras se edita un registro puntual ya existente.
  _montarFormGasto({ sugerencias: false });

  const form = document.getElementById('form-gasto');
  if (!form) return;

  form.dataset.id = id;
  form.querySelector('[name="monto"]').value = gasto.monto ?? 0;

  // FORM.1a: la categoría son radios-chip; se marca el chip del gasto. Si la
  // categoría ya no está en el catálogo (legacy, ej. 'Vivienda' tras CAT.1a),
  // ningún chip queda marcado y el usuario re-elige (mismo comportamiento que
  // tenía el select cuando la opción ya no existía).
  const cat = gasto.categoria ?? 'Otros';
  const radioCat = [...form.querySelectorAll('input[name="categoria"]')].find(r => r.value === cat);
  if (radioCat) radioCat.checked = true;

  // Chips de fecha: hoy/ayer se marcan como atajo; cualquier otra fecha
  // marca "Otra fecha" y revela el input date con el valor del gasto.
  const fecha = gasto.fecha ?? hoy();
  form.querySelector('[name="fecha"]').value = fecha;
  const opcion = fecha === hoy() ? 'hoy' : (fecha === ayerIso() ? 'ayer' : 'otra');
  const radioFecha = form.querySelector(`input[name="fechaOpcion"][value="${opcion}"]`);
  if (radioFecha) radioFecha.checked = true;
  const fechaOtra = form.querySelector('#gasto-fecha-otra');
  if (fechaOtra) fechaOtra.hidden = opcion !== 'otra';

  const notaEl = form.querySelector('[name="nota"]');
  if (notaEl) notaEl.value = gasto.nota ?? '';

  // Precargar el origen del gasto en el selector: su cuenta, o su tarjeta si
  // fue un consumo (MC.16b). Si el gasto venía sin origen (versiones previas),
  // queda la pre-selección por defecto.
  const origen = _origenDeGasto(gasto);
  if (origen) {
    const radio = form.querySelector(`input[name="cuentaId"][value="${CSS.escape(origen)}"]`);
    if (radio) radio.checked = true;
  }

  // MC.16d: revelar y prellenar "¿A cuántas cuotas?" si el gasto es un
  // consumo con tarjeta. `checked = true` de arriba no dispara 'change', así
  // que el grupo se muestra/oculta a mano acá.
  const grupoCuotas = form.querySelector('#grupo-gasto-cuotas');
  if (grupoCuotas) grupoCuotas.hidden = !gasto.consumoTC;
  const radioCuotas = form.querySelector(`input[name="cuotas"][value="${gasto.cuotas || 1}"]`);
  if (radioCuotas) radioCuotas.checked = true;

  // MC.16e: misma razón que las cuotas, el `checked` programático no dispara
  // 'change'. La marca de avance y su aviso de costo se ajustan a mano.
  const grupoAvance = form.querySelector('#grupo-gasto-avance');
  if (grupoAvance) grupoAvance.hidden = !gasto.consumoTC;
  const avanceCheck = form.querySelector('[name="avanceTC"]');
  if (avanceCheck) avanceCheck.checked = gasto.avanceTC === true;
  const avanceNudge = form.querySelector('#gasto-avance-nudge');
  if (avanceNudge) avanceNudge.hidden = gasto.avanceTC !== true;
  _actualizarNudgeSobrecupo();

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar gasto';

  abrirModal(overlay);
}

/**
 * Valor con el que el selector de origen identifica de dónde salió un gasto ya
 * guardado: el id de su cuenta, o el de su tarjeta con prefijo si fue un
 * consumo (MC.16b). Devuelve '' si el gasto no tiene origen registrado.
 * @param {import('../../core/state.js').Gasto} gasto
 * @returns {string}
 */
function _origenDeGasto(gasto) {
  if (gasto.consumoTC && gasto.compromisoId) return TARJETA_PREFIJO + gasto.compromisoId;
  return gasto.cuentaId ?? '';
}

// ── HANDLERS: GASTOS FRECUENTES (TX.12) ─────────────────────────

/**
 * Aplica una "plantilla" de gasto (monto/categoría/cuenta y, si se conoce,
 * nota) sobre un formulario recién montado, y deja el foco en el botón de
 * guardar: el usuario solo confirma (mismo espíritu de prellenado que
 * AP.5a/AH.5a). La comparten el chip de gasto frecuente (plantilla
 * sintetizada desde varios registros, sin nota: sería ambigua entre
 * instancias del grupo) y "Repetir" de una fila puntual de la lista (una
 * instancia concreta y conocida, la nota sí se copia).
 *
 * @param {HTMLFormElement} form
 * @param {{ monto:number, categoria:string, cuentaId?:string, nota?:string }} datos
 */
function _prellenarCamposGasto(form, datos) {
  const montoEl = form.querySelector('[name="monto"]');
  if (montoEl) montoEl.value = datos.monto || '';

  const radioCat = form.querySelector(`input[name="categoria"][value="${CSS.escape(datos.categoria ?? '')}"]`);
  if (radioCat) {
    radioCat.checked = true;
    // Dispara el listener delegado de _montarFormGasto (oculta/revela los
    // campos de "Otra categoría"): una plantilla nunca es __nueva__, pero
    // mantiene el form coherente si venía abierto en ese estado.
    radioCat.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (datos.cuentaId) {
    const radioCuenta = form.querySelector(`input[name="cuentaId"][value="${CSS.escape(datos.cuentaId)}"]`);
    if (radioCuenta) {
      radioCuenta.checked = true;
      // Dispara el listener delegado (MC.16d: revela "¿A cuántas cuotas?" si
      // la plantilla apunta a una tarjeta).
      radioCuenta.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (datos.nota) {
    const notaEl = form.querySelector('[name="nota"]');
    if (notaEl) notaEl.value = datos.nota;
  }

  form.querySelector('button[type="submit"]')?.focus();
}

/**
 * Chip de gasto frecuente: prellena el formulario ya abierto con la
 * plantilla que trae en sus `data-*` (calculada por `gastosFrecuentes()` al
 * pintar el form; el handler no vuelve a derivarla).
 * @param {HTMLElement} el
 */
function _repetirFrecuente(el) {
  const form = document.getElementById('form-gasto');
  if (!form) return;

  const categoria = el.dataset.categoria || '';
  const monto     = Number(el.dataset.monto) || 0;

  _prellenarCamposGasto(form, { monto, categoria, cuentaId: el.dataset.cuentaId || '' });
  announce(`${categoria} de ${f(monto)} prellenado. Confirma el monto y guarda.`);
}

/**
 * "Repetir" desde una fila de la lista de Gastos (TX.12): abre el modal en
 * modo CREACIÓN (no edición: no lleva `form.dataset.id`) prellenado con los
 * datos del gasto elegido, fechado HOY (es un registro nuevo, no una
 * corrección del original). Sin sugerencias de frecuentes: el usuario ya
 * eligió qué repetir.
 * @param {HTMLElement} el - botón con data-id del gasto a repetir.
 */
function _repetirGasto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const gasto = S.gastos.find(g => g.id === id);
  if (!gasto) return;

  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;

  resetModal(overlay);
  _montarFormGasto({ sugerencias: false });

  const form = document.getElementById('form-gasto');
  if (!form) return;

  const fechaInput = form.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  _prellenarCamposGasto(form, {
    monto:     gasto.monto,
    categoria: gasto.categoria ?? '',
    cuentaId:  _origenDeGasto(gasto),
    nota:      gasto.nota ?? '',
  });

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Repetir gasto';

  abrirModal(overlay);
}

// ── NAVEGACIÓN DE MES ────────────────────────────────────────────

function _prevMes() {
  navegarMesGastos(-1);
  renderFiltrosGastos();
  renderListaGastos();
}

function _nextMes() {
  navegarMesGastos(+1);
  renderFiltrosGastos();
  renderListaGastos();
}

/**
 * CTA del estado vacío de un mes que no es el corriente (DIS.4/G7): devuelve
 * la vista al mes donde caerá el gasto que se registre hoy.
 */
function _mesActual() {
  irAMesActual();
  renderFiltrosGastos();
  renderListaGastos();
}

// ── FILTRO DE CATEGORÍA ──────────────────────────────────────────

/** Cambia el chip activo y re-renderiza filtros + lista. */
function _filtrarCategoria(el) {
  const cat = el?.dataset?.cat || null;
  setFiltroCategoria(cat);
  renderFiltrosGastos();
  renderListaGastos();
}

/** @param {HTMLElement} el */
async function _eliminarGasto(el) {
  const id = el.dataset.id;
  if (!id) return;

  const gasto = S.gastos.find(g => g.id === id);
  if (!gasto) return;

  // TX.9a: la descripción ya no es obligatoria; sin ella, el nombre visible
  // del gasto es su categoría (mismo criterio que el título de la lista).
  const nombre = gasto.descripcion?.trim() || gasto.categoria || 'este gasto';

  const ok = await confirmar({
    titulo:         'Eliminar gasto',
    mensaje:        `¿Quieres eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  // Devolver el monto al saldo de la cuenta (si el gasto tenía cuenta).
  _ajustarSaldoCuenta(gasto.cuentaId, +gasto.monto);

  // Revertir el efecto en la deuda: un abono la vuelve a subir, un consumo con
  // tarjeta la baja (MC.16b, ADR 051 D3).
  _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(gasto, null));
  // MC.16d: revertir lo que ese consumo sumaba a cuotaMensual.
  _aplicarDeltasACuotaMensual(deltasPorEdicionEnCuotaMensual(gasto, null));

  eliminar('gastos', id);
  renderListaGastos();
  updSaldo();
  announce(`Gasto "${nombre}" eliminado.`);
}

// ── HELPERS DE SALDO ─────────────────────────────────────────────

/**
 * Ajusta el saldo de la cuenta indicada en `delta` (positivo o negativo).
 * No-op si `cuentaId` es null/undefined o la cuenta no existe.
 * Usa `editar()` para que dispare save() + state:change.
 *
 * @param {string|null|undefined} cuentaId
 * @param {number} delta - positivo suma, negativo descuenta.
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = S.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) return;
  const nuevoSaldo = (cuenta.saldo ?? 0) + delta;
  editar('cuentas', cuentaId, { saldo: nuevoSaldo });
}

/**
 * Aplica un mapa de deltas { cuentaId → delta } a los saldos.
 * Útil al editar un gasto que puede mover dinero entre cuentas.
 * @param {Record<string, number>} deltas
 */
function _aplicarDeltasASaldos(deltas) {
  for (const [cuentaId, delta] of Object.entries(deltas)) {
    _ajustarSaldoCuenta(cuentaId, delta);
  }
}

/**
 * Ajusta el saldoTotal de una deuda cuando se edita o elimina un gasto-abono.
 * delta positivo: revierte un abono (saldo sube). delta negativo: suma un abono (saldo baja).
 * @param {string} compromisoId
 * @param {number} delta
 */
function _ajustarSaldoDeuda(compromisoId, delta) {
  if (!compromisoId || !Number.isFinite(delta) || delta === 0) return;
  const comp = S.compromisos.find(c => c.id === compromisoId);
  if (!comp) return;
  const nuevoSaldo = Math.max(0, (Number(comp.saldoTotal) || 0) + delta);
  editar('compromisos', compromisoId, { saldoTotal: nuevoSaldo });
}

/**
 * Aplica un mapa de deltas { compromisoId → delta } a los saldos de las deudas.
 * Gemelo de `_aplicarDeltasASaldos`: los deltas los calcula
 * `deltasPorEdicionEnDeuda` (logic.js), acá solo se escriben.
 * @param {Record<string, number>} deltas
 */
function _aplicarDeltasADeudas(deltas) {
  for (const [compromisoId, delta] of Object.entries(deltas)) {
    _ajustarSaldoDeuda(compromisoId, delta);
  }
}

/**
 * Ajusta la `cuotaMensual` de una tarjeta cuando un consumo se crea, edita o
 * elimina (MC.16d). Mismo patrón que `_ajustarSaldoDeuda`, acotado en cero.
 * @param {string} compromisoId
 * @param {number} delta
 */
function _ajustarCuotaMensual(compromisoId, delta) {
  if (!compromisoId || !Number.isFinite(delta) || delta === 0) return;
  const comp = S.compromisos.find(c => c.id === compromisoId);
  if (!comp) return;
  const nuevaCuota = Math.max(0, (Number(comp.cuotaMensual) || 0) + delta);
  editar('compromisos', compromisoId, { cuotaMensual: nuevaCuota });
}

/**
 * Aplica un mapa de deltas { compromisoId → delta } a `cuotaMensual`.
 * Gemelo de `_aplicarDeltasADeudas`.
 * @param {Record<string, number>} deltas
 */
function _aplicarDeltasACuotaMensual(deltas) {
  for (const [compromisoId, delta] of Object.entries(deltas)) {
    _ajustarCuotaMensual(compromisoId, delta);
  }
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * (Re)Inyecta el HTML del formulario de gasto en el modal y attacha el
 * listener de submit. Se llama desde `_nuevoGasto()`, `_editarGasto()` y
 * `_repetirGasto()` cada vez que el modal se abre, porque las tarjetas del
 * selector de cuenta dependen de `S.cuentas`, que puede cambiar entre
 * aperturas.
 * @param {{ sugerencias?: boolean }} [opciones] reenviado a `renderFormGasto`.
 */
function _montarFormGasto(opciones = {}) {
  const body = document.getElementById('modal-gasto-body');
  if (!body) return;

  body.innerHTML = renderFormGasto(opciones);

  const form = body.querySelector('#form-gasto');
  if (!form) return;  // empty state (sin cuentas): no hay form, no hay listeners.

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarGasto();
  });

  // FORM.1a (ADR 042): la categoría son radios-chip; un listener delegado de
  // `change` cubre tanto la categoría como los atajos de fecha (el evento
  // change de un radio burbujea hasta el form).
  const camposNueva = form.querySelector('#categoria-nueva-fields');
  const fechaInput  = form.querySelector('#gasto-fecha');
  const fechaOtra   = form.querySelector('#gasto-fecha-otra');
  const grupoCuotas = form.querySelector('#grupo-gasto-cuotas');
  const grupoAvance = form.querySelector('#grupo-gasto-avance');
  const avanceNudge = form.querySelector('#gasto-avance-nudge');
  form.addEventListener('change', (e) => {
    const t = e.target;
    // TX.9b: el chip "Otra categoría" revela nombre + selector de ícono en el
    // mismo formulario (sin modal anidado); elegir otro chip los oculta.
    if (t.name === 'categoria' && camposNueva) {
      camposNueva.hidden = t.value !== CATEGORIA_NUEVA_VALUE;
    }
    // Atajos de fecha (ADR 042 D1): Hoy/Ayer escriben el input date real y lo
    // mantienen oculto; "Otra fecha" lo revela para elegir el día exacto.
    if (t.name === 'fechaOpcion' && fechaInput && fechaOtra) {
      if (t.value === 'otra') {
        fechaOtra.hidden = false;
      } else {
        fechaInput.value = t.value === 'ayer' ? ayerIso() : hoy();
        fechaOtra.hidden = true;
      }
    }
    // MC.16d: "¿A cuántas cuotas?" solo aplica cuando el origen elegido es
    // una tarjeta (prefijo tc:).
    if (t.name === 'cuentaId' && grupoCuotas) {
      grupoCuotas.hidden = !t.value.startsWith(TARJETA_PREFIJO);
    }
    // MC.16e (ADR 051 D7): "fue un avance" solo aplica con tarjeta, igual que
    // las cuotas. Cambiar a una cuenta limpia la marca y su aviso: si no queda
    // limpia, `normalizarGasto` la descartaría igual y el usuario vería un
    // check activo que no se guarda.
    if (t.name === 'cuentaId' && grupoAvance) {
      const esTarjeta = t.value.startsWith(TARJETA_PREFIJO);
      grupoAvance.hidden = !esTarjeta;
      if (!esTarjeta) {
        const check = form.querySelector('[name="avanceTC"]');
        if (check) check.checked = false;
        if (avanceNudge) avanceNudge.hidden = true;
      }
    }
    if (t.name === 'avanceTC' && avanceNudge) {
      avanceNudge.hidden = !t.checked;
    }
    if (t.name === 'cuentaId') _actualizarNudgeSobrecupo();
  });

  // El aviso de sobrecupo depende del monto que se está escribiendo, así que
  // escucha 'input' y no solo 'change' (mismo patrón que el tip del abono).
  form.addEventListener('input', (e) => {
    if (e.target.name === 'monto') _actualizarNudgeSobrecupo();
  });

  // CAT.2: selector compacto de ícono (recuadro + panel colapsable).
  wireIconoPicker(form.querySelector('[data-icono-picker="categoria-nueva-icono"]'));
}

/**
 * MC.16e (ADR 051 D7): aviso de que el consumo pasa del cupo de la tarjeta,
 * antes de guardarlo. Hoy el consumo entra igual y el disponible queda en "$0"
 * sin decir nada. El aviso explica el costo y no bloquea: el banco es quien
 * aprueba o rechaza, y Finko no puede saberlo (ADR 003, ADN 11).
 *
 * Se apaga solo cuando el origen no es una tarjeta o el monto todavía no es
 * válido, así que puede llamarse en cualquier momento del formulario.
 */
function _actualizarNudgeSobrecupo() {
  const form = document.getElementById('form-gasto');
  const el   = form?.querySelector('#gasto-sobrecupo-nudge');
  if (!form || !el) return;

  const apagar = () => { el.textContent = ''; el.hidden = true; };

  const origen = form.querySelector('input[name="cuentaId"]:checked')?.value ?? '';
  const monto  = Number(form.querySelector('[name="monto"]')?.value);
  if (!origen.startsWith(TARJETA_PREFIJO) || !(monto > 0)) return apagar();

  const tarjetaId = origen.slice(TARJETA_PREFIJO.length);
  const tarjeta   = (S.compromisos ?? []).find(c => c.id === tarjetaId);

  // En edición, el saldo de la tarjeta ya carga el consumo que se está
  // editando: sin devolverlo al cupo, cualquier cambio parecería ocuparlo dos veces.
  const anterior = form.dataset.id ? (S.gastos ?? []).find(g => g.id === form.dataset.id) : null;
  const previo   = (anterior?.consumoTC && anterior.compromisoId === tarjetaId) ? Number(anterior.monto) || 0 : 0;

  const hallazgo = excesoDeCupo(tarjeta, monto, previo);
  if (!hallazgo) return apagar();

  el.textContent = `Este consumo pasa del cupo en ${f(hallazgo.exceso)}: te quedan ${f(hallazgo.disponible)} disponibles. Puedes registrarlo, pero tu banco decide si lo aprueba y suele cobrar por pasarse del cupo.`;
  el.hidden = false;
}

export function initGastos() {
  registrarAccion('nuevo-gasto', _nuevoGasto);
  registrarAccion('editar-gasto', _editarGasto);
  registrarAccion('eliminar-gasto', _eliminarGasto);
  registrarAccion('repetir-gasto', _repetirGasto);
  registrarAccion('gastos-repetir-frecuente', _repetirFrecuente);
  registrarAccion('gastos-prev-mes',    _prevMes);
  registrarAccion('gastos-next-mes',    _nextMes);
  registrarAccion('gastos-mes-actual',  _mesActual);
  registrarAccion('gastos-filtrar-cat', _filtrarCategoria);

  // GAS.1a (ADR 039 D9): el ojo del hero del mes comparte el flag
  // S.config.ocultarSaldo con Inicio (IN.2), Mis cuentas, Deudas,
  // Calendario y Análisis: un solo control de privacidad en toda la app.
  // El flip con `!== true` es defensivo, igual que en 'saldo-visibilidad'
  // (ui/actions.js). updSaldo() mantiene el hero de Inicio en sincronía.
  registrarAccion('gastos-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
    renderSmart(renderFiltrosGastos, 'gast');
    renderSmart(renderListaGastos, 'gast');
  });

  // El form completo se monta on-demand desde _nuevoGasto/_editarGasto.

  EventBus.on('state:change', ({ section }) => {
    if (section === 'gastos') {
      renderBannerProposito('gast', S.gastos.length > 0);
      renderSmart(renderFiltrosGastos, 'gast');
      renderSmart(renderListaGastos, 'gast');
      updSaldo();
    }
  });

  // Re-render al navegar a #gast: filtros + lista.
  window.addEventListener('hashchange', () => {
    renderBannerProposito('gast', S.gastos.length > 0);
    renderSmart(renderFiltrosGastos, 'gast');
    renderSmart(renderListaGastos, 'gast');
  });

  renderBannerProposito('gast', S.gastos.length > 0);
  renderSmart(renderFiltrosGastos, 'gast');
  renderSmart(renderListaGastos, 'gast');
}
