/**
 * gastos/index.js - API pública del dominio de gastos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { miles, desdeMiles } from '../../infra/miles.js';
import { gmfDeRetiro } from '../../infra/pago-compromiso.js';
import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { TARJETA_PREFIJO } from '../../core/constants.js';
import { guardar, editar, genId } from '../../infra/crud.js';
import { planDeshacer, aplicarDeshacer } from '../../infra/deshacer.js';
import { deshacerConConfirmacion } from '../../ui/deshacer-movimiento.js';
import { registrarAccion, dispatch } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updSaldo, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { hoy, f } from '../../infra/utils.js';
import { mostrarToast } from '../../ui/toast.js';
import { resolverPagoConPreferida } from '../../infra/cuenta-helper.js';
import { wireIconoPicker } from '../../infra/icon-picker.js';
import {
  validarGasto, normalizarGasto,
  deltasPorEdicionDeGasto, deltasPorEdicionEnDeuda, deltasPorEdicionEnCuotaMensual,
  validarCategoriaPersonalizada, excesoDeCupo, consecuenciaDeGasto, RESPUESTAS_CARACTER, planSiNoAlcanza,
  preguntaNecesidadODeseo,
} from './logic.js';
// ADR 060: lectura cross-domain de solo lectura, desde index.js (no desde
// logic.js, que cerraría un ciclo: presupuesto/logic.js ya importa
// gastosMes de gastos/logic.js).
import { calcularProgreso, sugerenciaDeLimiteAlRegistrar } from '../presupuesto/logic.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { htmlDetalleGasto, htmlExtrasDetalleGasto } from './detalle.js';
import { conceptoDeGasto } from '../../infra/hormiga.js';
import { renderListaGastos, renderFormGasto, renderFiltrosGastos, setFiltroCategoria, navegarMesGastos, irAMesActual, ayerIso, CATEGORIA_NUEVA_VALUE, abrirDiaGastos, alternarSemanaGastos } from './view.js';
import {
  gastoPorEtapas, renderFormGastoTelefono, montarFormGastoTelefono, irAEtapaGasto,
  limpiarCabeceraGasto, pintarReciboGasto,
} from './telefono.js';
import { montosOcultos, alternarMontosOcultos } from '../../infra/privacidad.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoGasto(el) {
  const overlay = document.getElementById('modal-gasto');
  if (!overlay) return;
  resetModal(overlay);

  // Re-inyectar el form cada vez: las tarjetas del selector de cuenta
  // dependen de S.cuentas, que puede haber cambiado desde la última apertura.
  // Sugerencias (TX.12) sí se muestran: es el caso de uso que las motiva.
  _montarFormGasto({ titulo: 'Nuevo gasto' });

  // Pre-rellenar la fecha con hoy para mejor UX. Quien abre el alta desde un
  // día pasado (Análisis, ADR 176 D7) la manda en `data-fecha`; nunca futura.
  const fechaInput = overlay.querySelector('#gasto-fecha');
  const pedida = el?.dataset?.fecha;
  if (fechaInput) fechaInput.value = /^\d{4}-\d{2}-\d{2}$/.test(pedida ?? '') && pedida <= hoy() ? pedida : hoy();

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo gasto';

  // GAS.8c (ADR 182 D3): las tejas de "¿En qué gastaste hoy?" llegan con su
  // categoría marcada; el monto sigue siendo lo primero que se pide.
  const categoria = el?.dataset?.categoria;
  if (categoria) {
    const radio = [...overlay.querySelectorAll('[name="categoria"]')].find(r => r.value === categoria);
    if (radio) radio.checked = true;
  }

  abrirModal(overlay);
}

/**
 * Si el gasto dejaría su cuenta por debajo de $0, el mensaje que lo dice
 * (GAS.5b, ADR 161 D2); si no, `null`. Vale al crear y al editar, en los
 * dos anchos. No mira:
 * - un consumo con tarjeta (sale del cupo, no de una cuenta: lo cuida el
 *   aviso de sobrecupo);
 * - un gasto importado (`sinEfectoSaldo`), que no mueve ninguna cuenta;
 * - al crear en escritorio con otras cuentas activas: ahí "Completa el
 *   pago" reparte sin dejar ninguna en negativo y no confirma hasta cubrir
 *   el total.
 *
 * @param {Record<string, FormDataEntryValue>} datos
 * @param {string|null} idEdit
 * @param {boolean} porEtapas
 * @returns {string|null}
 */
function _gastoSinSaldo(datos, idEdit, porEtapas) {
  const base = normalizarGasto(datos);
  if (base.consumoTC || !base.cuentaId) return null;
  const anterior = idEdit ? S.gastos.find(g => g.id === idEdit) ?? null : null;
  if (anterior?.sinEfectoSaldo === true) return null;
  const plan = planSiNoAlcanza(S.cuentas, base.monto, base.cuentaId, anterior);
  if (!plan) return null;
  const otras = (S.cuentas ?? []).filter(c => c.activa !== false && c.id !== base.cuentaId);
  if (!anterior && !porEtapas && otras.length > 0) return null;
  const nombre = plan.cuenta.nombre || 'esta cuenta';
  return `No tienes saldo suficiente en ${nombre}: faltan ${f(plan.falta)}. Elige otra cuenta o una tarjeta de crédito.`;
}

async function _guardarGasto() {
  const form = document.getElementById('form-gasto');
  if (!form) return;

  const datos  = Object.fromEntries(new FormData(form));
  const idEdit = form.dataset.id || null;
  // FORM.2d: la ficha del teléfono guarda cada cambio sin cerrarse.
  const quedarse  = form.dataset.quedarse === '1';
  delete form.dataset.quedarse;
  const previo    = idEdit ? { ...S.gastos.find(g => g.id === idEdit) } : null;
  const porEtapas = 'etapas' in form.dataset;

  // La cuenta de origen viene del selector de tarjetas (radio name="cuentaId").
  // TX.9b: "+ Otra categoría" pide nombre + ícono en el mismo formulario;
  // se valida junto con el resto para un solo paso de errores.
  const validar = (d) => {
    const e = validarGasto(d);
    // GAS.5c (ADR 162 D2): al registrar, si el gasto pregunta "¿Fue una
    // necesidad o un deseo?", la respuesta es obligatoria. Al editar no: un
    // gasto viejo sin respuesta se sigue pudiendo corregir.
    if (!idEdit && d.categoria && preguntaCaracterVisible(d.categoria, d.subcategoriaId)
      && !RESPUESTAS_CARACTER.includes(d.caracter)) {
      e.push('Elige si fue una necesidad o un deseo.');
    }
    if (d.categoria === CATEGORIA_NUEVA_VALUE) {
      e.push(...validarCategoriaPersonalizada(
        { nombre: d.categoriaNuevaNombre, icono: d.categoriaNuevaIcono },
        S.categoriasPersonalizadas,
      ));
    }
    return e;
  };
  const errores = validar(datos);
  const esCategoriaNueva = datos.categoria === CATEGORIA_NUEVA_VALUE;

  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => validar(Object.fromEntries(new FormData(form))));
    // En el teléfono, el primer dato que falta puede estar en otra etapa.
    if (porEtapas) {
      const etapa = form.querySelector('[aria-invalid="true"]')?.closest('[data-etapa]')?.dataset.etapa;
      if (etapa) irAEtapaGasto(form, etapa);
    }
    return;
  }

  // GAS.5b (ADR 161 D2): ningún gasto deja una cuenta por debajo de $0. Se
  // mira antes de escribir nada (ni la categoría nueva ni lo contestado):
  // si no alcanza, el formulario lo dice y no guarda. Con varias cuentas,
  // el escritorio sigue ofreciendo completar con otras ("Completa el
  // pago" no confirma hasta cubrir el total).
  const sinSaldo = _gastoSinSaldo(datos, idEdit, porEtapas);
  if (sinSaldo) {
    if (porEtapas) {
      pintarReciboGasto(form);
      announce(sinSaldo);
    } else {
      mostrarErroresForm(form, [sinSaldo]);
    }
    return;
  }

  // SUS.2a (ADR 147 D4): "¿Es un gusto o una necesidad?" se lee solo si la
  // pregunta estaba a la vista para esta categoría (el `disabled` del grupo
  // ya la saca de FormData en el navegador; esto lo hace explícito). En una
  // categoría propia la respuesta se guarda en la categoría, una sola vez.
  const respuesta = preguntaCaracterVisible(datos.categoria, datos.subcategoriaId) && RESPUESTAS_CARACTER.includes(datos.caracter)
    ? datos.caracter : null;
  const propiaSinCaracter = (S.categoriasPersonalizadas ?? [])
    .find(c => c.nombre === datos.categoria && !RESPUESTAS_CARACTER.includes(c.caracter));
  if (respuesta && propiaSinCaracter) editar('categoriasPersonalizadas', propiaSinCaracter.id, { caracter: respuesta });

  // Crear y persistir la categoría antes de normalizar el gasto: `datos.categoria`
  // pasa a ser su nombre, exactamente como si el usuario hubiera elegido una nativa.
  if (esCategoriaNueva) {
    const nueva = guardar('categoriasPersonalizadas', {
      nombre:  datos.categoriaNuevaNombre.trim(),
      icono:   datos.categoriaNuevaIcono,
      seccion: 'gasto',
      ...(respuesta ? { caracter: respuesta } : {}),
    });
    datos.categoria = nueva.nombre;
  }

  // GAS.2a: nombre + monto para el toast de confirmación. Se capturan aquí,
  // antes de que cualquier rama transforme `datos` (reparto entre cuentas,
  // consumo con tarjeta), porque el toast siempre nombra el gasto completo
  // como lo escribió el usuario, no cada registro derivado de él.
  const montoGasto     = Number(datos.monto);
  const categoriaGasto = datos.categoria;
  const fechaGasto     = datos.fecha;

  // GAS.2b: cuenta a mostrar en la 3ª prioridad de la consecuencia (saldo
  // restante). Solo tiene sentido con una sola cuenta descontada de verdad:
  // un consumo con tarjeta no descuenta ninguna, y un gasto repartido entre
  // varias no tiene "la" cuenta que nombrar. Se completa en la rama de abajo.
  let cuentaIdConsecuencia = null;
  // ADR 142 D4: lo recién guardado, para "Deshacer" desde el aviso.
  const guardados = [];

  if (idEdit) {
    // En edición calculamos los deltas a aplicar a los saldos comparando
    // contra el gasto anterior. Maneja cambios de monto y/o de cuenta.
    const gasto = normalizarGasto(datos);
    const anterior = S.gastos.find(g => g.id === idEdit);
    // GAS.5c: lo contestado desde la ficha en un gasto cuya categoría no
    // pregunta (el formulario no trae la pregunta) no se pierde al cambiar
    // otro dato, mientras la categoría y la subcategoría sigan iguales.
    if (anterior && gasto.caracter === null && RESPUESTAS_CARACTER.includes(anterior.caracter)
      && anterior.categoria === gasto.categoria && (anterior.subcategoriaId ?? null) === gasto.subcategoriaId) {
      gasto.caracter = anterior.caracter;
    }
    if (anterior) {
      // Un gasto importado (`sinEfectoSaldo`, HF.0c) no genera deltas: editarlo
      // no toca la cuenta. La marca sobrevive porque `editar` mezcla campos.
      // GMF.1b (ADR 165 D4): el 4x1000 se recalcula con el gasto como queda;
      // lo de antes vuelve entero a su cuenta. Explícito (0 incluido) para que
      // editar() no deje el de antes.
      const devuelve = anterior.cuentaId && anterior.cuentaId === gasto.cuentaId && !anterior.sinEfectoSaldo
        ? (Number(anterior.monto) || 0) + (Number(anterior.costoGMF) || 0) : 0;
      const cuentaDe = (S.cuentas ?? []).find(c => c.id === gasto.cuentaId);
      gasto.costoGMF = gasto.cuentaId && !anterior.sinEfectoSaldo
        ? gmfDeRetiro(gasto.cuentaId, gasto.monto, gasto.fecha, { excluirId: idEdit, disponible: (Number(cuentaDe?.saldo) || 0) + devuelve })
        : 0;
      const deltas = deltasPorEdicionDeGasto(
        { cuentaId: anterior.cuentaId, monto: anterior.monto, costoGMF: anterior.costoGMF, sinEfectoSaldo: anterior.sinEfectoSaldo },
        { cuentaId: gasto.cuentaId,    monto: gasto.monto,    costoGMF: gasto.costoGMF },
      );
      _aplicarDeltasASaldos(deltas);

      // Preservar el compromisoId del gasto-abono original: el formulario no lo
      // expone. Un consumo con tarjeta (MC.16b) sí trae el suyo del selector,
      // así que ahí manda lo que el usuario acaba de elegir.
      if (!gasto.compromisoId && anterior.compromisoId && !anterior.consumoTC) {
        gasto.compromisoId = anterior.compromisoId;
      }

      // Sincronizar saldoTotal si el gasto tocaba una deuda (abono o consumo).
      _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(anterior, gasto, S.compromisos));
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
      guardados.push(guardar('gastos', base).id);
      _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(null, base, S.compromisos));
      // MC.16d: el consumo sube cuotaMensual en monto/cuotas (1 = pago único).
      _aplicarDeltasACuotaMensual(deltasPorEdicionEnCuotaMensual(null, base));
    } else {
      // GAS.3 (ADR 156 D6): en el teléfono el gasto sale entero de la cuenta
      // elegida, y solo si alcanza (`_gastoSinSaldo`, arriba). En escritorio,
      // si la elegida no alcanza y hay otras, "Completa el pago".
      const splits = porEtapas
        ? [{ cuentaId: base.cuentaId, monto: base.monto }]
        : await resolverPagoConPreferida(S.cuentas, base.monto, base.cuentaId, 'registrar el gasto');
      if (splits === null) return; // canceló o fue redirigido a Mis Cuentas
      // GAS.5b: ya no hay "¿Registrar de todas formas?". Una sola cuenta que
      // no alcanza se detuvo arriba; el reparto nunca deja una en negativo.

      const repartido = splits.length > 1;
      // GAS.2b: solo una cuenta real involucrada tiene "el" saldo que nombrar.
      cuentaIdConsecuencia = repartido ? null : (splits[0]?.cuentaId || null);
      // MOV.3 (ADR 154 D3): las partes de un gasto repartido se deshacen juntas.
      const operacionId = repartido ? genId() : null;
      for (const s of splits) {
        // GMF.1b (ADR 165 D4): el 4x1000 de esta parte, con lo que la cuenta
        // ya retiró en el mes.
        const gmf = s.cuentaId ? gmfDeRetiro(s.cuentaId, s.monto, base.fecha) : 0;
        guardados.push(guardar('gastos', {
          ...base,
          cuentaId: s.cuentaId || null,
          monto:    s.monto,
          nota:     repartido ? [base.nota, 'Gasto repartido entre varias cuentas'].filter(Boolean).join(' · ') : base.nota,
          ...(operacionId ? { operacionId } : {}),
          ...(gmf > 0 ? { costoGMF: gmf } : {}),
        }).id);
        _ajustarSaldoCuenta(s.cuentaId, -(s.monto + gmf));
      }
    }
  }

  const overlay = document.getElementById('modal-gasto');
  if (overlay && !quedarse) cerrarModal(overlay);
  if (quedarse) {
    pintarReciboGasto(form);
    // Ya quedó guardado: cerrar la ficha no tiene por qué preguntar.
    if (overlay) delete overlay.dataset.cambios;
  }

  renderListaGastos();
  updSaldo();

  // GAS.2a: el toast (role="status") es ahora el aviso de que el gasto se
  // guardó, visual y para lector de pantalla a la vez; sustituye al
  // announce() que había acá antes (mismo rol, doble anuncio si se conservan
  // los dos).
  //
  // GAS.2b: la segunda línea, solo en creación (en edición no se recalcula
  // la consecuencia: el plan de la ficha 22 la deja en una sola línea).
  let detalle = null;
  if (!idEdit) {
    const [anio, mes] = fechaGasto.split('-').map(Number);
    const presupuesto = S.presupuestos.find(p => p.activo && p.categoria === categoriaGasto) ?? null;
    const progreso     = presupuesto ? calcularProgreso(presupuesto, S.gastos, anio, mes) : null;
    const cuenta        = cuentaIdConsecuencia ? S.cuentas.find(c => c.id === cuentaIdConsecuencia) : null;
    detalle = consecuenciaDeGasto({
      progreso,
      categoria:    categoriaGasto,
      saldoCuenta:  cuenta ? cuenta.saldo : null,
      nombreCuenta: cuenta ? cuenta.nombre : null,
      ocultarSaldo: montosOcultos(),
    });
  }

  mostrarToast({
    titulo:  idEdit ? 'Gasto actualizado' : `${categoriaGasto} ${f(montoGasto)}`,
    detalle: detalle?.texto,
    tono:    detalle?.tono ?? 'ok',
    accion:  guardados.length > 0
      ? { texto: 'Deshacer', alTocar: () => _deshacerGastos(guardados) }
      : (quedarse && previo ? { texto: 'Deshacer', alTocar: () => _restaurarGasto(previo) } : null),
  });

  if (!idEdit && guardados.length > 0) _sugerirLimite(S.gastos.find(g => g.id === guardados[0]));
}

const _MESES_SUGERENCIA = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * GAS.9e (ADR 183 D5): con varios gastos del mes en una categoría sin límite,
 * Finko propone ponerle uno, después del aviso del gasto (la cola de avisos
 * los muestra de a uno). Una vez por categoría y mes, y como mucho una al día
 * (`sugerenciaDeLimiteAlRegistrar`); cerrarla es "ahora no". La presentación
 * es el aviso con Tino de siempre hasta que llegue el diseño (ADR 183 D6).
 *
 * @param {import('../../core/state.js').Gasto|undefined} gasto
 */
function _sugerirLimite(gasto) {
  if (!gasto || !S.config) return;
  const hoyISO = hoy();
  const s = sugerenciaDeLimiteAlRegistrar({
    gasto,
    gastos:         S.gastos,
    presupuestos:   S.presupuestos,
    hoyISO,
    vistas:         S.config.limiteSugerenciasVistas ?? [],
    descartada:     S.config.limiteSugerenciaDescartada ?? '',
    ultimoDia:      S.config.limiteSugerenciaUltimoDia ?? '',
    personalizadas: S.categoriasPersonalizadas ?? [],
  });
  if (!s) return;
  const mes = s.clave.slice(0, 7);
  // Solo se guardan las del mes: las de antes ya no pueden repetirse.
  S.config.limiteSugerenciasVistas = [...(S.config.limiteSugerenciasVistas ?? []).filter(c => c.startsWith(mes)), s.clave];
  S.config.limiteSugerenciaUltimoDia = hoyISO;
  save();
  const cuando = mes === hoyISO.slice(0, 7) ? 'este mes' : `en ${_MESES_SUGERENCIA[Number(mes.slice(5, 7)) - 1]}`;
  mostrarToast({
    titulo:  `Has hecho ${s.cantidad} gastos en ${s.categoria} ${cuando}`,
    detalle: s.parte
      ? `La mayor parte es ${s.parte.nombre}. ¿Quieres ponerle un límite para controlar cuánto gastas ahí?`
      : '¿Quieres ponerle un límite para controlar cuánto gastas en esta categoría?',
    tino:    'pensando',
    accion:  {
      texto: 'Poner límite',
      alTocar: () => {
        const b = document.createElement('button');
        Object.assign(b.dataset, { action: 'nuevo-presupuesto', categoria: s.categoria, sub: s.parte?.id ?? '' });
        dispatch(b, new Event('click'));
      },
    },
  });
}

/**
 * "Deshacer" de un cambio en la ficha (FORM.2d, ADR 142 D6): el gasto vuelve
 * a como estaba, con sus efectos en cuentas, deuda y cuota de la tarjeta. Si
 * la ficha sigue abierta, se vuelve a pintar con lo de antes.
 * @param {import('../../core/state.js').Gasto} previo
 */
function _restaurarGasto(previo) {
  const actual = S.gastos.find(g => g.id === previo.id);
  if (!actual) return;
  _aplicarDeltasASaldos(deltasPorEdicionDeGasto(
    { cuentaId: actual.cuentaId, monto: actual.monto, sinEfectoSaldo: actual.sinEfectoSaldo },
    { cuentaId: previo.cuentaId, monto: previo.monto },
  ));
  _aplicarDeltasADeudas(deltasPorEdicionEnDeuda(actual, previo, S.compromisos));
  _aplicarDeltasACuotaMensual(deltasPorEdicionEnCuotaMensual(actual, previo));
  editar('gastos', previo.id, previo);
  renderListaGastos();
  updSaldo();
  const overlay = document.getElementById('modal-gasto');
  if (overlay && 'open' in overlay.dataset && document.getElementById('form-gasto')?.dataset.id === previo.id) {
    _editarGasto({ dataset: { id: previo.id } });
  }
  announce('Listo: el gasto quedó como estaba.');
}

/**
 * "Deshacer" del aviso (ADR 142 D4, como el 062): borra lo que se acaba de
 * guardar y devuelve cada efecto, igual que eliminar el gasto pero sin
 * preguntar (la persona lo pidió segundos después de guardarlo).
 * @param {string[]} ids
 */
function _deshacerGastos(ids) {
  // MOV.3b (ADR 154 D6): el motor de deshacer, sin preguntar. El plan del
  // primer id ya trae las otras partes; las siguientes ya no están.
  for (const id of ids) {
    const plan = planDeshacer(S, id);
    if (plan.ok) aplicarDeshacer(plan);
  }
  renderListaGastos();
  updSaldo();
  announce('Listo: el gasto no quedó registrado.');
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
  // BUG-038: el pago de un fijo o el abono a una deuda (vinculado y no una
  // compra con tarjeta) conserva su categoría interna, que no es un chip del
  // catálogo; sin esto el formulario no guardaba.
  const esPagoDeCompromiso = Boolean(gasto.compromisoId) && !gasto.consumoTC;
  _montarFormGasto({
    sugerencias:   false,
    categoriaFija: esPagoDeCompromiso ? (gasto.categoria || null) : null,
    edicion:       true,
    titulo:        'Editar gasto',
    // FORM.2d (ADR 142 D6): en el teléfono, editar es la ficha del gasto.
    ficha:         gasto,
  });

  const form = document.getElementById('form-gasto');
  if (!form) return;

  form.dataset.id = id;
  form.querySelector('[name="monto"]').value = miles(gasto.monto ?? 0);

  // FORM.1a: la categoría son radios-chip; se marca el chip del gasto. Si la
  // categoría ya no está en el catálogo (legacy, ej. 'Vivienda' tras CAT.1a),
  // ningún chip queda marcado y el usuario re-elige (mismo comportamiento que
  // tenía el select cuando la opción ya no existía).
  const cat = gasto.categoria ?? 'Otros';
  const radioCat = [...form.querySelectorAll('input[name="categoria"]')].find(r => r.value === cat);
  if (radioCat) radioCat.checked = true;
  // SUS.2a: su subcategoría y, en Otros, lo que contestó.
  _marcarDetalleCategoria(form, gasto);

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

  // FORM.2b: en el teléfono, editar abre el recibo con todo puesto (la ficha, FORM.2d).
  form.querySelector('[name="monto"]').dispatchEvent(new Event('input', { bubbles: true }));
  irAEtapaGasto(form, 'revisar');

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
  if (montoEl) montoEl.value = miles(datos.monto);

  const radioCat = form.querySelector(`input[name="categoria"][value="${CSS.escape(datos.categoria ?? '')}"]`);
  if (radioCat) {
    radioCat.checked = true;
    // Dispara el listener delegado de _montarFormGasto (oculta/revela los
    // campos de "Otra categoría"): una plantilla nunca es __nueva__, pero
    // mantiene el form coherente si venía abierto en ese estado.
    radioCat.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // SUS.2a: "Repetir" copia también la subcategoría y lo contestado en Otros.
  _marcarDetalleCategoria(form, datos);

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

  // FORM.2b: en el teléfono, un frecuente o "Repetir" salta al recibo con
  // todo puesto; el monto avisa para que su lectura en palabras se rehaga.
  // GAS.5c: si falta decir si fue necesidad o deseo, salta a esa pregunta.
  montoEl?.dispatchEvent(new Event('input', { bubbles: true }));
  irAEtapaGasto(form, _faltaRespuesta(form) ? 'detalle' : 'revisar');

  form.querySelector('button[type="submit"]')?.focus();
}

/**
 * Marca la subcategoría y la respuesta de carácter de un gasto conocido
 * (editar, "Repetir") y deja a la vista su grupo (SUS.2a). Un id que no es de
 * la categoría no encuentra radio en el grupo de ella y no se marca.
 * @param {HTMLFormElement} form
 * @param {{ categoria?: string, subcategoriaId?: string|null, caracter?: string|null }} gasto
 */
function _marcarDetalleCategoria(form, gasto) {
  const sub = gasto?.subcategoriaId
    ? form.querySelector(`[data-sub-grupo="${CSS.escape(gasto.categoria ?? '')}"] input[name="subcategoriaId"][value="${CSS.escape(gasto.subcategoriaId)}"]`)
    : null;
  if (sub) sub.checked = true;
  const caracter = RESPUESTAS_CARACTER.includes(gasto?.caracter)
    ? form.querySelector(`input[name="caracter"][value="${gasto.caracter}"]`)
    : null;
  if (caracter) caracter.checked = true;
  sincronizarDetalleCategoria(form);
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
  _montarFormGasto({ sugerencias: false, titulo: 'Repetir gasto' });

  const form = document.getElementById('form-gasto');
  if (!form) return;

  const fechaInput = form.querySelector('#gasto-fecha');
  if (fechaInput) fechaInput.value = hoy();

  _prellenarCamposGasto(form, {
    monto:          gasto.monto,
    categoria:      gasto.categoria ?? '',
    cuentaId:       _origenDeGasto(gasto),
    nota:           gasto.nota ?? '',
    subcategoriaId: gasto.subcategoriaId ?? null,
    // GAS.5c (ADR 162 D2): "Repetir" no copia si fue necesidad o deseo:
    // el mismo taxi puede ser una cosa hoy y otra mañana. Se pregunta.
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

/**
 * Eliminar un gasto (MOV.3b, [ADR 154](../../../docs/DECISIONS/154-deshacer-un-movimiento.md)
 * D6): el mismo recorrido de "Deshacer movimiento" de Movimientos, con las
 * palabras de esta sección. Quita la operación entera (las otras partes de un
 * gasto o pago repartido también), devuelve lo que movió en cuentas, deuda y
 * cuota de la tarjeta, y no quita nada si no es seguro. La confirmación dice
 * los efectos reales (ficha 15, M4).
 * @param {HTMLElement} el
 */
async function _eliminarGasto(el) {
  const id = el.dataset.id;
  if (!id) return;
  const ok = await deshacerConConfirmacion(id, { titulo: 'Eliminar gasto', confirmarTexto: 'Eliminar', listo: 'Gasto eliminado' });
  if (!ok) return;
  // Borrado desde su ficha (FORM.2d): la ficha se cierra si su gasto ya no está.
  const hojaGasto = document.getElementById('modal-gasto');
  const idFicha = document.getElementById('form-gasto')?.dataset.id;
  if (hojaGasto && 'open' in hojaGasto.dataset && idFicha && !S.gastos.some(g => g.id === idFicha)) cerrarModal(hojaGasto);
  renderListaGastos();
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
  // Un fijo no tiene saldo de deuda (BUG-035): su pago nunca escribe saldoTotal.
  if (!comp || comp.tipo === 'fijo') return;
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
 * FORM.2b (ADR 142 D4): bajo 1024 px, el mismo formulario va por etapas
 * (`telefono.js`); escritorio conserva la columna.
 *
 * @param {{ sugerencias?: boolean, categoriaFija?: string|null, edicion?: boolean, titulo?: string }} [opciones]
 *   reenviado a `renderFormGasto` / `renderFormGastoTelefono`.
 */
function _montarFormGasto(opciones = {}) {
  const body = document.getElementById('modal-gasto-body');
  if (!body) return;

  const hayCuentas = (S.cuentas ?? []).some(c => c.activa !== false);
  const porEtapas = gastoPorEtapas() && hayCuentas;
  if (!porEtapas) limpiarCabeceraGasto(body.closest('.modal-overlay'));
  body.innerHTML = porEtapas ? renderFormGastoTelefono(opciones) : renderFormGasto(opciones);

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
    // SUS.2a: la subcategoría o la pregunta de la categoría elegida.
    // GAS.5c: la pregunta depende también de la subcategoría (Taxi sí, Bus no).
    if (t.name === 'categoria' || t.name === 'subcategoriaId') sincronizarDetalleCategoria(form);
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
  sincronizarDetalleCategoria(form);

  // Después de los listeners de arriba: el recibo se pinta con los campos
  // ya actualizados (la fecha de "Ayer", las cuotas de la tarjeta).
  if (porEtapas) montarFormGastoTelefono(form, { titulo: opciones.titulo ?? 'Nuevo gasto' });
}

/**
 * La pregunta de un concepto que se repite sin respuesta (SUS.2c), desde la
 * lista o desde Inicio. GAS.5c (ADR 162 D2): la respuesta queda en los gastos
 * de ese concepto que todavía no la tienen; Finko ya no la aprende para los
 * que vienen, que se preguntan al registrarlos.
 * @param {HTMLElement} el
 */
function _responderGustoONecesidad(el) {
  const { concepto, etiqueta, respuesta } = el.dataset;
  if (!concepto || !RESPUESTAS_CARACTER.includes(respuesta)) return;
  const ids = (S.gastos ?? [])
    .filter(g => conceptoDeGasto(g) === concepto && !RESPUESTAS_CARACTER.includes(g.caracter))
    .map(g => g.id);
  _anotarCaracter(ids, respuesta, { titulo: `Anotado: ${etiqueta} ${_TEXTO_RESPUESTA[respuesta]}`, detalle: 'En los gastos que ya registraste. Los nuevos te lo preguntan al anotarlos.' });
}

/** "fue un deseo" / "fue una necesidad", para los avisos. */
const _TEXTO_RESPUESTA = Object.freeze({ gusto: 'fue un deseo', necesidad: 'fue una necesidad' });

/**
 * Un solo escritor de "¿Fue una necesidad o un deseo?" fuera del formulario
 * (GAS.5c): escribe la respuesta en cada gasto, repinta la lista y lo que pida
 * quien llama, y avisa con "Deshacer", que devuelve a cada gasto lo que tenía.
 * @param {string[]} ids
 * @param {string} respuesta - 'gusto' | 'necesidad'.
 * @param {{ titulo: string, detalle?: string, repintar?: () => void }} aviso
 */
function _anotarCaracter(ids, respuesta, { titulo, detalle, repintar }) {
  const previos = ids.map(id => [id, S.gastos.find(g => g.id === id)?.caracter ?? null]);
  const escribir = (pares) => {
    for (const [id, caracter] of pares) editar('gastos', id, { caracter });
    renderSmart(renderListaGastos, 'gast');
    repintar?.();
  };
  escribir(ids.map(id => [id, respuesta]));
  announce(`${titulo}.`);
  mostrarToast({
    titulo,
    ...(detalle ? { detalle } : {}),
    tono:    'ok',
    accion:  { texto: 'Deshacer', alTocar: () => escribir(previos) },
  });
}

/**
 * SUS.2d, desde GAS.5c (ADR 162 D2): corregir desde el gasto (su hoja o su
 * ficha) si fue una necesidad o un deseo. Cambia solo ese gasto, no su
 * concepto. Repinta el bloque donde se tocó.
 * @param {HTMLElement} el
 */
function _corregirCaracterGasto(el) {
  const gasto = S.gastos.find(g => g.id === el.dataset.id);
  const respuesta = el.dataset.respuesta;
  if (!gasto || !RESPUESTAS_CARACTER.includes(respuesta)) return;
  const hoja = el.closest('#detalle-fila-body');
  const ficha = el.closest('.ficha__extras');
  const repintar = () => {
    const actual = S.gastos.find(g => g.id === gasto.id);
    if (!actual) return;
    if (hoja) hoja.innerHTML = htmlDetalleGasto(actual);
    if (ficha) ficha.innerHTML = htmlExtrasDetalleGasto(actual);
    (hoja ?? ficha)?.querySelector(`[data-action="gasto-caracter"][data-respuesta="${respuesta}"]`)?.focus();
  };
  _anotarCaracter([gasto.id], respuesta, { titulo: `Anotado: este gasto ${_TEXTO_RESPUESTA[respuesta]}`, repintar });
}

/**
 * ¿Falta decir si fue una necesidad o un deseo? (GAS.5c): la pregunta está a
 * la vista y no tiene respuesta. Un prellenado ("Repetir", un frecuente) que
 * la deja así lleva a esa pregunta y no al recibo.
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
function _faltaRespuesta(form) {
  const grupo = form.querySelector('[data-caracter-grupo]');
  return Boolean(grupo && !grupo.disabled && !grupo.querySelector('input[name="caracter"]:checked'));
}

/**
 * ¿Se pregunta "¿Fue una necesidad o un deseo?"? (ADR 147 D4; GAS.5c, ADR 162
 * D2): al crear una categoría, en una propia que todavía no lo dice y en las
 * nativas cuya subcategoría lo deja en "depende" (`preguntaNecesidadODeseo`).
 * @param {string} categoria - valor del chip elegido.
 * @param {string|null} [subcategoriaId]
 * @returns {boolean}
 */
function preguntaCaracterVisible(categoria, subcategoriaId = null) {
  if (categoria === CATEGORIA_NUEVA_VALUE) return true;
  return preguntaNecesidadODeseo(categoria, subcategoriaId, S.categoriasPersonalizadas ?? []);
}

/**
 * SUS.2a (ADR 147 D5): deja a la vista, y habilitado, solo el grupo que toca
 * a la categoría elegida: su "Sé más específico" o la pregunta de carácter.
 * Los demás quedan `hidden` y `disabled` (fuera de FormData). En el teléfono
 * los grupos viven en una mini-hoja y su fila del recibo la pinta
 * `telefono.js` leyendo este mismo estado.
 * @param {HTMLFormElement} form
 */
function sincronizarDetalleCategoria(form) {
  const categoria = form.querySelector('input[name="categoria"]:checked')?.value ?? '';
  for (const grupo of form.querySelectorAll('[data-sub-grupo]')) {
    const ver = grupo.dataset.subGrupo === categoria;
    grupo.hidden = !ver;
    grupo.disabled = !ver;
  }
  const pregunta = form.querySelector('[data-caracter-grupo]');
  if (pregunta) {
    const sub = form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')?.value ?? null;
    const ver = preguntaCaracterVisible(categoria, sub);
    pregunta.hidden = !ver;
    pregunta.disabled = !ver;
    const ayuda = pregunta.querySelector('[data-caracter-ayuda]');
    if (ayuda) {
      const propia = categoria === CATEGORIA_NUEVA_VALUE
        || (S.categoriasPersonalizadas ?? []).some(c => c.nombre === categoria);
      ayuda.textContent = propia
        ? 'Lo contestas una vez: Finko lo recuerda para esta categoría.'
        : 'Depende del día: tu respuesta vale solo para este gasto.';
    }
  }
  pintarReciboGasto(form);
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
  const monto  = desdeMiles(form.querySelector('[name="monto"]')?.value) ?? 0;
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

/**
 * Un gasto que otro dominio ya decidió (APR.3e, ADR 093 D3): la mesada que
 * el tutor marcó "Entregada" o el premio por ahorrar. Es un solo hecho (091
 * R-HF1): se guarda y descuenta su cuenta como cualquier gasto, sin preguntar
 * por sobregiro, porque el dinero ya se entregó. `origen` dice de dónde vino.
 *
 * @param {{ gasto?: { monto: number, categoria: string, fecha: string, cuentaId: string, descripcion?: string, origen?: object } }} datos
 */
function _registrarGastoExterno({ gasto } = {}) {
  if (!gasto || !(Number(gasto.monto) > 0) || !gasto.cuentaId) return;
  if (!S.cuentas.some(c => c.id === gasto.cuentaId)) return;
  const base = normalizarGasto(gasto);
  if (gasto.origen) base.origen = gasto.origen;
  guardar('gastos', base);
  _aplicarDeltasASaldos(deltasPorEdicionDeGasto(null, { cuentaId: base.cuentaId, monto: base.monto }));
}

export function initGastos() {
  EventBus.on('gasto:registrar', _registrarGastoExterno);
  registrarAccion('nuevo-gasto', _nuevoGasto);
  registrarAccion('editar-gasto', _editarGasto);
  registrarAccion('eliminar-gasto', _eliminarGasto);

  // Ficha 15 (M3): salida al historial completo. Manda el dominio y nada mas:
  // el chip lo pone la pantalla destino, y el rango se deja libre a proposito
  // porque la gracia del historial es cruzar meses, justo lo que el reloj de
  // este bloque no puede hacer. Sin import cruzado (ADN 10): va por EventBus,
  // igual que la salida de un tope de Limites.
  registrarAccion('gastos-ver-historial', () => {
    EventBus.emit('movimientos:ver', { dominio: 'gastos' });
  });
  // GAS.8b (ADR 182 D2): el embudo de los filtros lleva al mismo historial,
  // donde viven la cuenta y las fechas.
  registrarAccion('gastos-mas-filtros', () => {
    EventBus.emit('movimientos:ver', { dominio: 'gastos' });
  });
  registrarAccion('repetir-gasto', _repetirGasto);

  // ADR 119 D2: la hoja del gasto trae datos propios (cuenta, límite de la
  // categoría, cuántos van en el mes, qué pasa al borrar). Es la hoja de la
  // fila (`#modal-detalle-fila`) con el cuerpo armado acá.
  registrarAccion('gasto-detalle', (el) => {
    // MOV.3 (ADR 154 D1): desde Movimientos se abre la hoja, que ofrece
    // "Deshacer movimiento"; editar sigue a un toque ("Editar").
    const desdeMovimientos = el.dataset.desde === 'movimientos';
    // FORM.2d (ADR 142 D6): en el teléfono la ficha del gasto es su formulario.
    if (!desdeMovimientos && gastoPorEtapas() && (S.cuentas ?? []).some(c => c.activa !== false)) { _editarGasto(el); return; }
    const gasto = S.gastos.find(g => g.id === el.dataset.id);
    const hoja = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!gasto || !hoja || !cuerpo) return;
    cuerpo.innerHTML = htmlDetalleGasto(gasto, { desdeMovimientos });
    abrirModal(hoja);
  });
  // "Los N gastos de X en octubre": Movimientos con la categoría y el mes.
  registrarAccion('gasto-ver-categoria', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
    const { categoria, desde, hasta } = el.dataset;
    EventBus.emit('movimientos:ver', { categoria, desde, hasta });
  });
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
  // SUS.2c (ADR 147 D1): la respuesta a "¿Es un gusto o algo que
  // necesitas?" se guarda por concepto y vale para antes y después.
  registrarAccion('gastos-gusto-o-necesidad', _responderGustoONecesidad);
  // SUS.2d: lo mismo desde la hoja o la ficha de un gasto.
  registrarAccion('gasto-caracter', _corregirCaracterGasto);

  // GAS.7g (ADR 179 D7): desde un mes pasado sin gastos, el mes siguiente.
  registrarAccion('gastos-mes-siguiente', () => {
    navegarMesGastos(1);
    renderFiltrosGastos();
    renderListaGastos();
  });

  // GAS.7c (ADR 179 D3): "N gastos más del sábado" abre el día entero.
  registrarAccion('gastos-dia-mas', (el) => {
    abrirDiaGastos(el?.dataset?.fecha);
    renderSmart(renderListaGastos, 'gast');
  });
  // GAS.8c (ADR 182 D3): la equis de Gastos fantasma la descarta en ese mes.
  registrarAccion('gastos-fantasma-descartar', (el) => {
    S.config.fantasmaDescartado = el?.dataset?.mes ?? '';
    save();
    renderSmart(renderListaGastos, 'gast');
  });
  // GAS.8b (ADR 182 D2): una semana anterior se abre y se cierra en su sitio.
  registrarAccion('gastos-semana', (el) => {
    const clave = el?.dataset?.semana;
    alternarSemanaGastos(clave);
    renderSmart(renderListaGastos, 'gast');
    // El botón se vuelve a pintar: el foco vuelve a él (y el lector oye
    // su `aria-expanded` nuevo).
    if (clave) document.querySelector(`[data-action="gastos-semana"][data-semana="${clave}"]`)?.focus();
  });
  // El aviso de lo vencido lleva a su pestaña (Fijos o Deudas) por EventBus:
  // Por pagar elige la pestaña y trae la fila a la vista (ADN 10).
  registrarAccion('gastos-ver-vencido', (el) => {
    EventBus.emit('porPagar:ver-compromiso', { id: el?.dataset?.id });
  });

  registrarAccion('gastos-saldo-visibilidad', () => {
    alternarMontosOcultos('gast');
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

  // La portada del bloque también obedece al reloj (ficha 07, ADR 069 D8): sus
  // dos renders entran en renderAll(), que es lo que llaman los botones de mes
  // del encabezado. Sin esto el encabezado cambiaba de mes y la lista se
  // quedaba en el anterior hasta que el usuario navegara a otra sección.
  registrarRender(() => {
    renderSmart(renderFiltrosGastos, 'gast');
    renderSmart(renderListaGastos, 'gast');
  });
}
