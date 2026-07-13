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
 * Patrón 0/1/varias (igual que cuenta-helper para el origen del dinero):
 *   0 destinos → la teja no aparece.
 *   1 destino  → la teja enruta directo a ese destino (data-id ya incrustado).
 *   2+ destinos→ la teja abre el selector "¿a cuál?" (vista destino de la hoja).
 */

import { S } from '../core/state.js';
import { abrirModal } from './modales.js';
import { registrarAccion } from './actions.js';
import { f, esc } from '../infra/utils.js';

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

  for (const m of (Array.isArray(metas) ? metas : [])) {
    if (!m || m.completada === true) continue;
    destinos.push({ targetAction: 'abonar-meta', id: m.id, label: m.nombre || 'Meta', monto: Number(m.montoActual) || 0 });
  }

  for (const a of (Array.isArray(apartados) ? apartados : [])) {
    if (!a) continue;
    destinos.push({ targetAction: 'aportar-apartado', id: a.id, label: a.nombre || 'Apartado', monto: Number(a.montoActual) || 0 });
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

// ── RENDER (impuro: toca el DOM) ─────────────────────────────────

const _raizEl    = () => document.getElementById('registrar-vista-raiz');
const _destinoEl = () => document.getElementById('registrar-vista-destino');
const _gridEl    = () => document.getElementById('registrar-grid');
const _tituloEl  = () => document.getElementById('modal-registrar-title');

/**
 * HTML de una teja de la hoja (mismo molde que las estáticas Gasto/Ingreso).
 * `attrs` son atributos crudos del <button> (data-action y demás).
 */
function _teja(attrs, iconId, label, desc, kind) {
  return `
    <button class="menu-mas__item registrar__tile" type="button" data-registrar-dyn
            data-kind="${esc(kind)}" ${attrs}>
      <svg class="menu-mas__icon icon" aria-hidden="true"><use href="#${esc(iconId)}"/></svg>
      <span class="menu-mas__label">${esc(label)}</span>
      <span class="registrar__tile-desc">${esc(desc)}</span>
    </button>`;
}

/**
 * Reconstruye las tejas dinámicas (Abono, Aporte) según S. Las estáticas
 * (Gasto, Ingreso) no se tocan; las dinámicas anteriores se retiran primero.
 */
function _construirTejasDinamicas() {
  const grid = _gridEl();
  if (!grid) return;

  grid.querySelectorAll('[data-registrar-dyn]').forEach(el => el.remove());

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

  if (cuentasActivasParaTransferir(S.cuentas) >= 2) {
    html += _teja(
      `data-action="registrar-abrir" data-target-action="abrir-transferencia"`,
      'i-transferencia', 'Transferir', 'Entre tus cuentas', 'transferir',
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

  grid.insertAdjacentHTML('beforeend', html);
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

/** Muestra el selector "¿a cuál?" para el tipo dado ('abono' | 'aporte'). */
function _abrirPicker(picker) {
  const cont = _destinoEl();
  const raiz = _raizEl();
  if (!cont || !raiz) return;

  let filas = '';
  let titulo = '';
  if (picker === 'abono') {
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
