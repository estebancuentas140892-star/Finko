/**
 * registrar.js - contenido dinámico de la hoja "Registrar" (NAV.A2b, ADR 024).
 *
 * La hoja lleva cuatro acciones de registro. Gasto e Ingreso son globales y
 * autocontenidas: viven estáticas en index.html. Abono a deuda y Aporte a
 * ahorro dependen de los datos del usuario y necesitan elegir un destino, así
 * que se construyen aquí según S.
 *
 * No importa dominios (regla ADN #10): lee S directamente (como el consolidado
 * de ahorro) y reusa la acción built-in `registrar-abrir` para invocar el flujo
 * destino ya registrado (abrir-abono / ahorro-nuevo-aporte / abonar-meta /
 * aportar-apartado), pasándole el `data-id` del destino elegido.
 *
 * MC.20b (ADR 171 D2): "Transferir o retirar" aparece con una cuenta y abre
 * "¿A dónde fue el dinero?", que lleva al registro de siempre de cada caso
 * (transferir, retirar efectivo, pagar varios, gasto o préstamo).
 * Patrón 0/1/varias (igual que cuenta-helper para el origen del dinero):
 *   0 destinos → la teja no aparece.
 *   1 destino  → la teja enruta directo a ese destino (data-id ya incrustado).
 *   2+ destinos→ la teja abre el selector "¿a cuál?" (vista destino de la hoja).
 */

import { S } from '../core/state.js';
import { abrirModal } from './modales.js';
import { registrarAccion } from './actions.js';
import { f, esc, hoy } from '../infra/utils.js';
import { ordenarBolsasPorFecha } from '../infra/bolsas.js';
import { bancoClase } from '../infra/bancos.js';
import { pagosPendientesDelMes } from '../infra/estado-obligacion.js';

const TITULO_DEFECTO = '¿Qué quieres registrar?';

/** Tipos de compromiso que son deuda (duplicado local para no importar el dominio). */
const _TIPOS_DEUDA = new Set(['deuda-entidad', 'deuda-personal']);

// ── LÓGICA DE DESTINOS (pura, testeable) ─────────────────────────

/**
 * Deudas a las que se puede abonar: deuda activa con saldo pendiente.
 * Espejo de la condición del botón "Abonar" en la lista de Deudas.
 *
 * @param {Array} compromisos - S.compromisos
 * @returns {Array<{ id: string, label: string, monto: number }>}
 */
export function destinosAbono(compromisos) {
  return (Array.isArray(compromisos) ? compromisos : [])
    .filter(c => c && _TIPOS_DEUDA.has(c.tipo) && c.activo !== false && Number(c.saldoTotal) > 0)
    .map(c => ({
      id:    c.id,
      label: c.descripcion || 'Deuda',
      monto: Number(c.saldoTotal) || 0,
    }));
}

/**
 * Destinos de aporte de ahorro: fondo de emergencia (si está activo), metas no
 * completadas y apartados. Inversión queda fuera (ADR 024 D2: no tiene flujo de
 * aporte incremental, solo "nueva inversión").
 *
 * Cada destino trae la acción destino que `registrar-abrir` debe invocar. El
 * fondo no lleva id (su handler `ahorro-nuevo-aporte` es global, un solo fondo).
 *
 * @param {Object} ahorro    - S.ahorro
 * @param {Array}  metas      - S.metas
 * @param {Array}  apartados  - S.apartados
 * @returns {Array<{ targetAction: string, id: string|null, label: string, monto: number }>}
 */
export function destinosAporte(ahorro, metas, apartados) {
  const destinos = [];

  const fondo = ahorro?.fondoEmergencia;
  if (fondo?.activo) {
    const aportes = Array.isArray(ahorro.aportes) ? ahorro.aportes : [];
    const total = (Number(fondo.montoActual) || 0)
      + aportes.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
    destinos.push({ targetAction: 'ahorro-nuevo-aporte', id: null, label: 'Fondo de emergencia', monto: total });
  }

  // Ficha 09 (hallazgo G4): el picker sale en el mismo orden que la lista de
  // Metas, urgencia primero y las metas sin plazo al final. Una meta que se ve
  // primera en la sección no puede verse tercera acá. El orden lo define
  // `infra/bolsas.js`, que es la única copia: importar el dominio no está
  // permitido (ver la cabecera de este archivo).
  const activas = (Array.isArray(metas) ? metas : []).filter(m => m && m.completada !== true);
  const { conFecha, sinFecha } = ordenarBolsasPorFecha(activas, 'fechaLimite');

  for (const m of [...conFecha, ...sinFecha]) {
    destinos.push({ targetAction: 'abonar-meta', id: m.id, label: m.nombre || 'Meta', monto: Number(m.montoActual) || 0 });
  }

  for (const a of (Array.isArray(apartados) ? apartados : [])) {
    if (!a) continue;
    destinos.push({ targetAction: 'aportar-apartado', id: a.id, label: a.nombre || 'Reserva', monto: Number(a.montoActual) || 0 });
  }

  return destinos;
}

/**
 * Cuántas cuentas activas hay disponibles para transferir entre ellas
 * (espejo local de `cuentasActivas()` de tesoreria/logic/cuentas.js, sin
 * importar el dominio: solo hace falta el conteo, no la lista completa).
 *
 * @param {Array} cuentas - S.cuentas
 * @returns {number}
 */
export function cuentasActivasParaTransferir(cuentas) {
  return (Array.isArray(cuentas) ? cuentas : []).filter(c => c && c.activa !== false).length;
}

/**
 * Las opciones de "¿A dónde fue el dinero?" (MC.20b, ADR 171 D2), cada una
 * solo cuando aplica: a otra cuenta tuya (dos cuentas o más), en efectivo
 * (una cuenta que no sea efectivo), algo de Por pagar (algo pendiente este
 * mes; va antes que "Le pagué algo a alguien" para que el arriendo pagado por
 * transferencia marque el fijo), un gasto y un préstamo. Ninguna crea un tipo
 * de movimiento nuevo: abren el registro de siempre. Pura.
 *
 * @param {{ cuentas?: Array, compromisos?: Array, gastos?: Array, hoyISO?: string }} datos
 * @returns {Array<{ targetAction: string, label: string, desc: string }>}
 */
export function opcionesTransferirORetirar({ cuentas, compromisos, gastos, hoyISO } = {}) {
  const activas = (Array.isArray(cuentas) ? cuentas : []).filter(c => c && c.activa !== false);
  const esEfectivo = (c) => (c.banco ? bancoClase(c.banco) === 'efectivo' : /^efectivo$/i.test(c.tipo ?? ''));
  const opciones = [];
  if (activas.length >= 2) {
    opciones.push({ targetAction: 'abrir-transferencia', label: 'A otra cuenta tuya', desc: 'Pasar dinero entre tus cuentas' });
  }
  if (activas.some(c => !esEfectivo(c))) {
    opciones.push({ targetAction: 'abrir-retiro', label: 'Lo saqué en efectivo', desc: 'En un cajero o en el banco' });
  }
  const dia = hoyISO && /^\d{4}-\d{2}-\d{2}$/.test(hoyISO) ? hoyISO : hoy();
  if (pagosPendientesDelMes(compromisos, gastos, dia.slice(0, 7), dia).length > 0) {
    opciones.push({ targetAction: 'inicio-pagar-lote', label: 'Pagué algo de Por pagar', desc: 'Un gasto fijo o la cuota de una deuda' });
  }
  opciones.push({ targetAction: 'nuevo-gasto', label: 'Le pagué algo a alguien', desc: 'Queda como un gasto' });
  opciones.push({ targetAction: 'nuevo-personal', label: 'Le presté dinero', desc: 'Queda en Me deben' });
  return opciones;
}

// ── RENDER (impuro: toca el DOM) ─────────────────────────────────

const _raizEl    = () => document.getElementById('registrar-vista-raiz');
const _destinoEl = () => document.getElementById('registrar-vista-destino');
const _listaEl   = () => document.getElementById('registrar-lista');
const _tituloEl  = () => document.getElementById('modal-registrar-title');

/**
 * HTML de una teja de la hoja (mismo molde que las estáticas Gasto/Ingreso).
 * `attrs` son atributos crudos del <button> (data-action y demás).
 */
/** El dominio de la teja de cada fila (ADR 126 D6). */
const _DOM_FILA = { abono: 'compromisos', transferir: 'tesoreria', aporte: 'ahorro' };

function _teja(attrs, iconId, label, desc, kind) {
  return `
    <li>
      <button class="registrar__tile registrar__fila" type="button" data-registrar-dyn
              data-kind="${esc(kind)}" ${attrs}>
        <span class="cat-teja registrar__fila-teja" data-dom="${_DOM_FILA[kind] ?? 'analisis'}" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#${esc(iconId)}"/></svg></span>
        <span class="registrar__fila-textos">
          <span class="menu-mas__label">${esc(label)}</span>
          <span class="registrar__tile-desc">${esc(desc)}</span>
        </span>
        <svg class="icon registrar__fila-flecha" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </button>
    </li>`;
}

/**
 * Reconstruye las filas que dependen de tus datos (Abono, Transferir,
 * Aporte) en la lista de la hoja (ADR 126 D6). Gasto e Ingreso no se tocan.
 * La lista se oculta si queda vacía.
 */
function _construirTejasDinamicas() {
  const lista = _listaEl();
  if (!lista) return;

  const abono  = destinosAbono(S.compromisos);
  const aporte = destinosAporte(S.ahorro, S.metas, S.apartados);

  let html = '';

  if (abono.length === 1) {
    const d = abono[0];
    html += _teja(
      `data-action="registrar-abrir" data-target-action="abrir-abono" data-id="${esc(d.id)}"`,
      'i-deudas', 'Abono a deuda', d.label, 'abono',
    );
  } else if (abono.length > 1) {
    html += _teja(
      `data-action="registrar-elegir-destino" data-picker="abono"`,
      'i-deudas', 'Abono a deuda', 'Elige a cuál', 'abono',
    );
  }

  // MC.20b (ADR 171 D2): con una cuenta ya hay a dónde mandar el dinero.
  if (cuentasActivasParaTransferir(S.cuentas) >= 1) {
    html += _teja(
      `data-action="registrar-elegir-destino" data-picker="transferir"`,
      'i-transferencia', 'Transferir o retirar', 'A tu cuenta, a otra persona o en el cajero', 'transferir',
    );
  }

  if (aporte.length === 1) {
    const d = aporte[0];
    const idAttr = d.id ? ` data-id="${esc(d.id)}"` : '';
    html += _teja(
      `data-action="registrar-abrir" data-target-action="${esc(d.targetAction)}"${idAttr}`,
      'i-ahorro', 'Aporte a ahorro', d.label, 'aporte',
    );
  } else if (aporte.length > 1) {
    html += _teja(
      `data-action="registrar-elegir-destino" data-picker="aporte"`,
      'i-ahorro', 'Aporte a ahorro', 'Elige a cuál', 'aporte',
    );
  }

  lista.innerHTML = html;
  lista.hidden = html === '';
}

/**
 * Fila del selector de destino. Reusa `registrar-abrir`: cierra la hoja e
 * invoca la acción destino con el data-id incrustado.
 */
function _filaDestino(targetAction, id, label, monto) {
  const idAttr = id ? ` data-id="${esc(id)}"` : '';
  return `
    <li>
      <button class="registrar__destino-item" type="button"
              data-action="registrar-abrir" data-target-action="${esc(targetAction)}"${idAttr}>
        <span class="registrar__destino-nombre">${esc(label)}</span>
        <span class="registrar__destino-monto">${f(monto)}</span>
      </button>
    </li>`;
}

/** Una opción de "¿A dónde fue el dinero?": su nombre y, debajo, qué deja. */
function _filaOpcion({ targetAction, label, desc }) {
  return `
    <li>
      <button class="registrar__destino-item registrar__destino-item--opcion" type="button"
              data-action="registrar-abrir" data-target-action="${esc(targetAction)}">
        <span class="registrar__destino-textos">
          <span class="registrar__destino-nombre">${esc(label)}</span>
          <span class="registrar__destino-desc">${esc(desc)}</span>
        </span>
        <svg class="icon registrar__fila-flecha" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </button>
    </li>`;
}

/** Muestra el selector "¿a cuál?" para el tipo dado ('abono' | 'aporte' | 'transferir'). */
function _abrirPicker(picker) {
  const cont = _destinoEl();
  const raiz = _raizEl();
  if (!cont || !raiz) return;

  let filas = '';
  let titulo = '';
  if (picker === 'transferir') {
    titulo = '¿A dónde fue el dinero?';
    filas = opcionesTransferirORetirar({ cuentas: S.cuentas, compromisos: S.compromisos, gastos: S.gastos })
      .map(_filaOpcion).join('');
  } else if (picker === 'abono') {
    titulo = '¿A qué deuda quieres abonar?';
    filas = destinosAbono(S.compromisos)
      .map(d => _filaDestino('abrir-abono', d.id, d.label, d.monto)).join('');
  } else {
    titulo = '¿A qué le quieres aportar?';
    filas = destinosAporte(S.ahorro, S.metas, S.apartados)
      .map(d => _filaDestino(d.targetAction, d.id, d.label, d.monto)).join('');
  }

  cont.innerHTML = `
    <div class="registrar__destino-head">
      <button class="registrar__volver" type="button" data-action="registrar-volver">
        <svg class="icon" aria-hidden="true"><use href="#i-x"/></svg>
        Volver
      </button>
    </div>
    <ul class="registrar__destino-lista" role="list">${filas}</ul>`;

  const t = _tituloEl();
  if (t) t.textContent = titulo;
  raiz.hidden = true;
  cont.hidden = false;
  // El foco estaba en la teja ahora oculta: llevarlo a la primera opción.
  cont.querySelector('.registrar__destino-item')?.focus();
}

/** Vuelve de la vista destino a la vista raíz (tejas). */
function _volverARaiz() {
  const cont = _destinoEl();
  const raiz = _raizEl();
  if (cont) { cont.hidden = true; cont.innerHTML = ''; }
  if (raiz) raiz.hidden = false;
  const t = _tituloEl();
  if (t) t.textContent = TITULO_DEFECTO;
  // Si volvimos con un foco vivo (botón "Volver" recién removido), reanclarlo.
  if (cont && document.activeElement === document.body) {
    raiz?.querySelector('.registrar__tile')?.focus();
  }
}

/** Abre la hoja "Registrar" reconstruyendo su contenido desde cero. */
function _abrirHoja() {
  const overlay = document.getElementById('modal-registrar');
  if (!overlay) return;
  _volverARaiz();            // por si quedó en la vista destino de una apertura previa
  _construirTejasDinamicas();
  abrirModal(overlay);
}

/**
 * Inicializa la hoja "Registrar". Se llama una vez desde bootstrap.js, después
 * de que los dominios registraron sus acciones destino.
 */
export function initRegistrar() {
  registrarAccion('registrar-abrir-hoja', _abrirHoja);
  registrarAccion('registrar-elegir-destino', (el) => _abrirPicker(el.dataset.picker));
  registrarAccion('registrar-volver', _volverARaiz);
}
