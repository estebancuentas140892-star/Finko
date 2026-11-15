/**
 * captura-telefono.js - la forma de los formularios del teléfono que no
 * tienen una propia (ADR 142 D2 y D4, FORM.2c).
 *
 * Un formulario la pide con atributos y el dominio no aprende nada nuevo:
 *
 * - `data-etapas-monto="¿Cuánto abonas?"`: **mover dinero en dos etapas**
 *   (Monto · Revisar). El primer campo `data-miles` del formulario pasa a la
 *   etapa del monto, con el teclado de Finko y su lectura en palabras; lo
 *   demás queda tal cual en "Revisar", bajo el monto, que se toca para
 *   cambiarlo. `data-atajos='[{"t":"La cuota","v":350000}]'` pone atajos
 *   sobre el teclado que llevan directo a revisar.
 * - `data-captura`: **los controles de Finko** en vez de los del sistema. Un
 *   `<select>` pasa a ser el desplegable de Finko (con buscador desde 16
 *   opciones) y un `type="date"`, una fila que abre "Hoy", "Ayer" y el
 *   calendario de Finko. Los campos reales siguen ahí, ocultos, con su
 *   `name` y su valor: `FormData`, `validar*` y los listeners de `change`
 *   del dominio no cambian.
 *
 * Corre en `abrirModal` (registrado por `initCapturaTelefono`), después de
 * que el dominio llenó el formulario, así que vale para los formularios que
 * se pintan en cada apertura y para los que se reutilizan. Solo bajo 1024 px.
 */

import { esc as _esc, f, hoy } from '../infra/utils.js';
import { desdeMiles, miles } from '../infra/miles.js';
import { registrarAlAbrir } from './modales.js';
import { marcarCambios } from './hojas.js';
import { htmlTecladoFinko, montarTecladoFinko, montoEnPalabras } from './teclado-finko.js';
import { htmlMiniHoja, abrirMiniHoja, cerrarMiniHoja, miniHojaAbierta } from './mini-hoja.js';
import { htmlCalendario, montarCalendario } from './calendario-finko.js';
import { montarPreguntas } from './preguntas.js';

const MQ_MOVIL = '(max-width: 1023.98px)';
const _esMovil = () => window.matchMedia?.(MQ_MOVIL).matches === true;

/** Desde cuántas opciones el desplegable trae buscador (ADR 142 D2). */
export const OPCIONES_CON_BUSCADOR = 16;

const _DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Cómo se lee una fecha ISO en la fila: "Hoy", "Ayer" o "Martes 3 de
 * noviembre" (con el año si no es el actual). Pura salvo el reloj.
 *
 * @param {string} iso
 * @param {string} [hoyIso]
 * @returns {string} '' si no es una fecha.
 */
export function fechaEnPalabras(iso, hoyIso = hoy()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return '';
  const [a, m, d] = iso.split('-').map(Number);
  const [ha, hm, hd] = hoyIso.split('-').map(Number);
  const ayer = new Date(ha, hm - 1, hd - 1);
  if (iso === hoyIso) return 'Hoy';
  if (new Date(a, m - 1, d).getTime() === ayer.getTime()) return 'Ayer';
  return _diaConNombre(iso, ha);
}

/** "Martes 3 de noviembre", con el año solo si no es `anioActual`. */
function _diaConNombre(iso, anioActual) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${_DIAS[new Date(a, m - 1, d).getDay()]} ${d} de ${_MESES[m - 1]}${a !== anioActual ? ` de ${a}` : ''}`;
}

const _ayerIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** El texto de un rótulo sin la pastilla "Opcional". */
const _rotulo = (label) => {
  if (!label) return '';
  const copia = label.cloneNode(true);
  copia.querySelectorAll('.form-optional, .sr-only').forEach(el => el.remove());
  return copia.textContent.replace(/\s+/g, ' ').trim();
};

let _secuencia = 0;
const _idPara = (el, prefijo) => {
  if (!el.id) el.id = `${prefijo}-${++_secuencia}`;
  return el.id;
};

/** Lo que cada control de Finko sabe hacer para volver a pintarse. */
const _refrescos = new WeakMap();

/**
 * Inserta el botón que reemplaza un control del sistema y apunta su rótulo a él.
 * @returns {HTMLButtonElement}
 */
function _campoFinko(original, form) {
  const id = _idPara(original, 'campo');
  const label = form.querySelector(`label[for="${CSS.escape(id)}"]`);
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'campo-finko';
  boton.id = `${id}-finko`;
  boton.setAttribute('aria-haspopup', 'dialog');
  boton.innerHTML = '<span class="campo-finko__v"></span><svg class="icon campo-finko__chev" aria-hidden="true"><use href="#i-chevron-down"/></svg>';
  original.insertAdjacentElement('afterend', boton);
  if (label) label.htmlFor = boton.id;
  return boton;
}

// ── El desplegable de Finko ──────────────────────────────────────

/**
 * Un `<select>` pasa a ser el desplegable de Finko. Las opciones se leen al
 * abrir (el dominio puede cambiarlas); elegir una escribe el `<select>`,
 * despacha `change` y vuelve.
 *
 * @param {HTMLSelectElement} select
 * @param {HTMLFormElement} form
 */
export function mejorarSelect(select, form) {
  if ('finko' in select.dataset) return;
  select.dataset.finko = '';
  const boton = _campoFinko(select, form);
  select.hidden = true;
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  const titulo = _rotulo(form.querySelector(`label[for="${boton.id}"]`)) || 'Elige una opción';
  form.insertAdjacentHTML('beforeend', htmlMiniHoja({
    id: `${select.id}-mini`,
    titulo,
    cuerpo: '<div class="desplegable" role="listbox" data-desplegable></div>',
  }));
  const mini = form.querySelector(`#${CSS.escape(select.id)}-mini`);
  const lista = mini.querySelector('[data-desplegable]');
  lista.setAttribute('aria-label', titulo);

  const opciones = () => [...select.options].filter(o => !o.disabled && !(o.value === '' && select.required));
  const refrescar = () => {
    const elegida = [...select.options].find(o => o.value === select.value);
    const vacia = !elegida || elegida.value === '';
    boton.querySelector('.campo-finko__v').textContent = vacia ? 'Elegir' : elegida.textContent.trim();
    boton.classList.toggle('campo-finko--vacio', vacia);
  };

  const pintar = (filtro = '') => {
    const norm = (s) => s.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const ops = opciones();
    const buscador = ops.length >= OPCIONES_CON_BUSCADOR;
    const filas = [];
    let grupo = null;
    for (const o of ops) {
      if (filtro && !norm(o.textContent).includes(norm(filtro))) continue;
      const g = o.parentElement?.tagName === 'OPTGROUP' ? o.parentElement.label : null;
      if (g && g !== grupo) { filas.push(`<p class="desplegable__grupo">${_esc(g)}</p>`); grupo = g; }
      const sel = o.value === select.value;
      filas.push(`<button type="button" class="desplegable__f" role="option" aria-selected="${sel}" data-valor="${_esc(o.value)}"><span class="desplegable__txt"><span class="desplegable__t">${_esc(o.value === '' ? 'Sin elegir' : o.textContent.trim())}</span></span><span class="desplegable__ok" aria-hidden="true"></span></button>`);
    }
    if (filas.length === 0) filas.push('<p class="mini-hoja__ayuda">No hay nada con ese nombre.</p>');
    if (buscador && !mini.querySelector('[data-desplegable-buscar]')) {
      lista.insertAdjacentHTML('beforebegin', `<label class="buscar-finko"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Buscar</span><input type="search" class="buscar-finko__in" placeholder="Buscar" autocomplete="off" data-desplegable-buscar /></label>`);
      mini.querySelector('[data-desplegable-buscar]').addEventListener('input', (e) => pintar(e.target.value));
    }
    lista.innerHTML = filas.join('');
  };

  boton.addEventListener('click', () => {
    const buscar = mini.querySelector('[data-desplegable-buscar]');
    if (buscar) buscar.value = '';
    pintar();
    abrirMiniHoja(mini, { origen: boton });
    mini.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true });
  });
  lista.addEventListener('click', (e) => {
    const fila = e.target.closest('[data-valor]');
    if (!fila) return;
    select.value = fila.dataset.valor;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (e.isTrusted) marcarCambios(select);
    cerrarMiniHoja(mini);
    refrescar();
  });
  select.addEventListener('change', refrescar);
  _refrescos.set(boton, refrescar);
  refrescar();
}

// ── La fecha de Finko ────────────────────────────────────────────

/**
 * Un `type="date"` pasa a ser una fila que abre "Hoy", "Ayer" (si es la
 * fecha de algo que ya pasó, `name="fecha"`) y el calendario de Finko. El
 * campo queda `type="hidden"` con su `name` y su valor ISO.
 *
 * @param {HTMLInputElement} input
 * @param {HTMLFormElement} form
 */
export function mejorarFecha(input, form) {
  if ('finko' in input.dataset) return;
  input.dataset.finko = '';
  const boton = _campoFinko(input, form);
  const pasada = input.name === 'fecha';
  const opcional = !input.required;
  input.type = 'hidden';
  const titulo = _rotulo(form.querySelector(`label[for="${boton.id}"]`)) || '¿Qué fecha?';
  const atajos = pasada ? `
        <div class="fecha-chips" role="group" aria-label="Atajos">
          <button type="button" class="chip-fecha" data-fecha-atajo="hoy">Hoy</button>
          <button type="button" class="chip-fecha" data-fecha-atajo="ayer">Ayer</button>
        </div>` : '';
  form.insertAdjacentHTML('beforeend', htmlMiniHoja({
    id: `${input.id}-mini`,
    titulo,
    cuerpo: `${atajos}${htmlCalendario()}`,
    pie: opcional ? '<button type="button" class="btn btn-ghost" data-fecha-quitar>Quitar la fecha</button>' : '',
  }));
  const mini = form.querySelector(`#${CSS.escape(input.id)}-mini`);

  const refrescar = () => {
    const texto = fechaEnPalabras(input.value);
    const largo = texto === 'Hoy' || texto === 'Ayer'
      ? `${texto} · ${_diaConNombre(input.value, Number(hoy().slice(0, 4))).toLowerCase()}`
      : texto;
    boton.querySelector('.campo-finko__v').textContent = largo || 'Elegir fecha';
    boton.classList.toggle('campo-finko--vacio', !texto);
  };
  const escribir = (iso) => {
    input.value = iso;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    marcarCambios(input);
    cerrarMiniHoja(mini);
    refrescar();
  };
  const mostrar = montarCalendario(mini.querySelector('[data-calendario-finko]'), {
    valor: input.value,
    alElegir: escribir,
  });

  boton.addEventListener('click', () => {
    mostrar(input.value || hoy());
    abrirMiniHoja(mini, { origen: boton });
  });
  mini.addEventListener('click', (e) => {
    const atajo = e.target.closest('[data-fecha-atajo]');
    if (atajo) escribir(atajo.dataset.fechaAtajo === 'ayer' ? _ayerIso() : hoy());
    if (e.target.closest('[data-fecha-quitar]')) escribir('');
  });
  _refrescos.set(boton, refrescar);
  refrescar();
}

// ── Números que no son dinero ───────────────────────────────────

/**
 * Un `type="number"` (una tasa) pasa a texto con el teclado numérico del
 * teléfono, sin las flechas del sistema. La coma se escribe como punto, que
 * es lo que leen `validar*` y `normalizar*`.
 *
 * @param {HTMLInputElement} input
 */
export function mejorarNumero(input) {
  if ('finko' in input.dataset) return;
  input.dataset.finko = '';
  const decimal = String(input.step || '').includes('.') || input.step === 'any';
  input.type = 'text';
  input.inputMode = decimal ? 'decimal' : 'numeric';
  input.autocomplete = 'off';
  input.addEventListener('input', () => {
    if (input.value.includes(',')) input.value = input.value.replace(/,/g, '.');
  });
}

// ── Mover dinero en dos etapas ───────────────────────────────────

const _etapas = new WeakMap();

/**
 * Monto · Revisar sobre un formulario de mover dinero que ya existe.
 * @param {HTMLFormElement} form `[data-etapas-monto]`
 */
export function montarEtapasMonto(form) {
  if (_etapas.has(form)) return;
  const campo = form.querySelector('input[data-miles]');
  if (!campo) return;
  const overlay = form.closest('.modal-overlay');
  const cab = overlay?.querySelector('.modal__header');
  const cuerpo = form.closest('.modal__body');
  const id = _idPara(campo, 'monto');
  const pregunta = form.dataset.etapasMonto || _rotulo(form.querySelector(`label[for="${CSS.escape(id)}"]`)) || '¿Cuánto?';
  let atajos = [];
  try { atajos = JSON.parse(form.dataset.atajos || '[]'); } catch { atajos = []; }

  // Lo que había queda en "Revisar"; el monto se muda a su etapa.
  const revisar = document.createElement('section');
  revisar.className = 'etapa-gasto';
  revisar.dataset.etapa = 'revisar';
  revisar.hidden = true;
  const contenedor = campo.closest('.monto-hero, .form-group');
  for (const hijo of [...form.childNodes]) {
    if (hijo.nodeType === 1 && hijo.matches('input[type="hidden"], .mini-hoja')) continue;
    revisar.appendChild(hijo);
  }
  form.classList.add('form-etapas');
  form.dataset.etapas = '';
  form.insertAdjacentHTML('afterbegin', `
      <ol class="etapas" aria-label="Etapas">
        <li class="etapa" data-etapa-de="monto">Monto</li>
        <li class="etapa" data-etapa-de="revisar">Revisar</li>
      </ol>
      <section class="etapa-gasto etapa-gasto--monto" data-etapa="monto" aria-labelledby="${id}-q">
        <div class="pmonto form-group">
          <label class="pmonto__q" id="${id}-q" for="${id}" tabindex="-1" data-etapa-foco>${_esc(pregunta)}</label>
          <span class="pmonto__v">
            <span class="pmonto__signo" aria-hidden="true">$</span>
            <span class="pmonto__caja" data-valor="0"></span>
          </span>
          <p class="pmonto__lee" id="${id}-lee" aria-live="polite"></p>
        </div>
        ${atajos.length === 0 ? '' : `
        <div class="riel-chips" role="group" aria-label="Atajos">
          ${atajos.map(a => `<button type="button" class="atajo-monto" data-atajo-monto="${Number(a.v) || 0}"><span class="atajo-monto__k">${_esc(a.t)}</span><span class="atajo-monto__v">${f(Number(a.v) || 0)}</span></button>`).join('')}
        </div>`}
        <div class="kp-zona" data-kp-zona>${htmlTecladoFinko()}</div>
        <div class="modal__footer modal__footer--principal">
          <button type="button" class="btn btn-primary" data-etapa-seguir>Continuar<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>
        </div>
      </section>`);
  form.querySelector('[data-etapa="monto"]').insertAdjacentElement('afterend', revisar);
  revisar.insertAdjacentHTML('afterbegin', `
      <button type="button" class="recibo__cab recibo__cab--suelta" data-etapa-ir="monto" aria-label="Cambiar el monto">
        <span class="recibo__monto" data-recibo-monto></span>
        <span class="recibo__lee" data-recibo-lee></span>
      </button>`);

  // El campo de siempre, vestido de cifra grande.
  const caja = form.querySelector('.pmonto__caja');
  caja.appendChild(campo);
  campo.classList.remove('input', 'input--big-amount');
  campo.classList.add('pmonto__in');
  campo.size = 1;
  campo.setAttribute('enterkeyhint', 'next');
  campo.setAttribute('aria-describedby', `${id}-lee`);
  // Su rótulo y su caja quedan sin uso; las ayudas del campo siguen en "Revisar".
  contenedor?.querySelectorAll(`label[for="${CSS.escape(id)}"]:not(.pmonto__q), .monto-hero__label, .monto-hero__box`)
    .forEach(el => { el.hidden = true; });

  const pmonto = form.querySelector('.pmonto');
  const pintarMonto = () => {
    caja.dataset.valor = campo.value || '0';
    pmonto.classList.toggle('pmonto--vacio', !campo.value);
    pmonto.classList.toggle('pmonto--largo', campo.value.length > 9);
    const m = desdeMiles(campo.value) ?? 0;
    form.querySelector('[data-recibo-monto]').textContent = f(m);
    form.querySelector('[data-recibo-lee]').textContent = montoEnPalabras(m);
  };
  montarTecladoFinko(form.querySelector('[data-kp-zona]'), campo, form.querySelector(`#${CSS.escape(id)}-lee`), {
    vacio: 'Márcalo con el teclado de abajo',
  });
  campo.addEventListener('input', pintarMonto);

  // Cabecera: "Volver" en "Revisar".
  let atras = cab?.querySelector('[data-etapa-atras]');
  if (cab && !atras) {
    cab.insertAdjacentHTML('afterbegin', '<button type="button" class="btn btn-icon btn-ghost modal__atras" data-etapa-atras aria-label="Volver al monto" hidden><svg class="icon" aria-hidden="true"><use href="#i-arrow-left"/></svg></button>');
    atras = cab.querySelector('[data-etapa-atras]');
  }

  let actual = 'monto';
  const irA = (etapa, { foco = true } = {}) => {
    actual = etapa;
    form.dataset.etapaActual = etapa;
    for (const s of form.children) if (s.dataset.etapa) s.hidden = s.dataset.etapa !== etapa;
    for (const li of form.querySelectorAll('.etapa')) {
      const on = li.dataset.etapaDe === etapa;
      li.classList.toggle('etapa--on', on);
      li.classList.toggle('etapa--hecha', etapa === 'revisar' && li.dataset.etapaDe === 'monto');
      if (on) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    }
    if (atras) atras.hidden = etapa === 'monto';
    pintarMonto();
    if (cuerpo) cuerpo.scrollTop = 0;
    if (foco) {
      const destino = etapa === 'monto'
        ? form.querySelector('[data-etapa-foco]')
        : revisar.querySelector('[data-etapa-ir]');
      destino?.focus({ preventScroll: true });
    }
  };
  const seguir = () => {
    if (!((desdeMiles(campo.value) ?? 0) > 0)) {
      pmonto.classList.add('pmonto--error');
      const lee = form.querySelector(`#${CSS.escape(id)}-lee`);
      lee.textContent = 'Escribe cuánto. Por ejemplo: 50.000';
      return;
    }
    pmonto.classList.remove('pmonto--error');
    irA('revisar');
  };

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-etapa-seguir]')) { seguir(); return; }
    if (e.target.closest('[data-etapa-ir]')) { irA('monto'); return; }
    const atajo = e.target.closest('[data-atajo-monto]');
    if (atajo) {
      campo.value = miles(Number(atajo.dataset.atajoMonto));
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      if (e.isTrusted) marcarCambios(campo);
      seguir();
    }
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.target === campo) { e.preventDefault(); seguir(); }
  });
  atras?.addEventListener('click', () => {
    if ([...form.querySelectorAll('.mini-hoja')].some(miniHojaAbierta)) return;
    irA('monto');
  });
  // Un error del monto al guardar lleva a su etapa.
  new MutationObserver(() => {
    if (campo.getAttribute('aria-invalid') === 'true' && actual !== 'monto') irA('monto');
  }).observe(campo, { attributes: true, attributeFilter: ['aria-invalid'] });

  _etapas.set(form, { irA, pintarMonto });
}

// ── En cada apertura ─────────────────────────────────────────────

/**
 * Prepara los formularios de una hoja que se abre: etapas y controles de
 * Finko la primera vez; en cada apertura, vuelve al monto y repinta lo que
 * el dominio llenó.
 *
 * @param {HTMLElement} overlay
 */
const SELECTOR_FORMS = 'form[data-captura], form[data-etapas-monto], form[data-preguntas]';

/** Formularios ya preparados: con la hoja abierta no se vuelven a tocar. */
const _preparados = new WeakSet();

/**
 * Prepara un formulario: armazón, etapas y controles de Finko. `overlay` es
 * null para los que no viven en una hoja (Ajustes).
 */
function _prepararForm(form, overlay, reabierta) {
  _preparados.add(form);
  // Primero el armazón: el día del mes deja de ser un número antes de mejorar los números.
  if (overlay && 'preguntas' in form.dataset) montarPreguntas(form, overlay, { reabierta });
  for (const s of form.querySelectorAll('select:not([data-finko])')) mejorarSelect(s, form);
  for (const d of form.querySelectorAll('input[type="date"]:not([data-finko])')) mejorarFecha(d, form);
  for (const n of form.querySelectorAll('input[type="number"]:not([data-finko])')) mejorarNumero(n);
  if ('etapasMonto' in form.dataset) {
    montarEtapasMonto(form);
    _etapas.get(form)?.irA('monto', { foco: false });
  }
  for (const b of form.querySelectorAll('.campo-finko')) _refrescos.get(b)?.();
}

export function prepararHojaTelefono(overlay) {
  if (!_esMovil()) return;
  const reabierta = !('open' in overlay.dataset);
  for (const form of overlay.querySelectorAll(SELECTOR_FORMS)) {
    // Con la hoja abierta, un formulario ya preparado no se toca: el armazón
    // perdería la pregunta en la que va.
    if (!reabierta && _preparados.has(form)) continue;
    _prepararForm(form, overlay, reabierta);
  }
}

/**
 * Un formulario que aparece después (el dominio vuelve a pintar con la hoja
 * abierta, o uno de Ajustes que no vive en una hoja) se prepara solo.
 * @param {MutationRecord[]} cambios
 */
function _alAparecer(cambios) {
  if (!_esMovil()) return;
  for (const c of cambios) {
    for (const n of c.addedNodes) {
      if (n.nodeType !== 1) continue;
      const forms = n.matches(SELECTOR_FORMS) ? [n] : [...n.querySelectorAll(SELECTOR_FORMS)];
      for (const form of forms) {
        if (_preparados.has(form) || !form.isConnected) continue;
        const overlay = form.closest('.modal-overlay');
        if (!overlay) _prepararForm(form, null, true);
        else if ('open' in overlay.dataset) prepararHojaTelefono(overlay);
      }
    }
  }
}

/** Se llama una vez desde bootstrap.js. */
export function initCapturaTelefono() {
  registrarAlAbrir(prepararHojaTelefono);
  new MutationObserver(_alAparecer).observe(document.body, { childList: true, subtree: true });
}
