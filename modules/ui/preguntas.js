/**
 * preguntas.js - crear algo nuevo: una pregunta por pantalla y un resumen
 * (ADR 142 D5, FORM.2e). El armazón de los formularios de "crear" en el
 * teléfono; precedente: el asistente paginado de Distribuir (ADR 018).
 *
 * El formulario de siempre lo pide con atributos, sin otro HTML:
 *
 * - `form[data-preguntas="Nueva deuda"]`: el nombre que dice el progreso.
 *   `data-resumen-titulo="Así queda tu deuda"`; `data-preguntas-inicio=
 *   "resumen"` abre en el resumen (editar).
 * - `[data-pregunta="¿Cuánto debes hoy?"]` sobre cada bloque obligatorio, en
 *   el orden del DOM, con `data-ayuda` (una línea), `data-falta` (qué decir
 *   si se sigue sin responder) y `data-resumen` (su rótulo en el resumen).
 *   Un bloque `hidden` no se pregunta.
 * - `[data-opcional="Tasa de interés"]`: no se pregunta. En el resumen es
 *   una fila si ya tiene valor, o una ficha de "Agrega si quieres" que lo
 *   abre como pregunta suelta.
 * - `[data-pregunta-avanza]` dentro de un bloque: tocarlo responde y sigue,
 *   aunque el dominio vuelva a pintar el formulario (el tipo de deuda).
 * - `data-control="dia"` en el bloque de un día del mes: 31 botones y
 *   "Último día del mes" que escriben el campo de siempre.
 *
 * Elegir avanza al tocar; escribir lleva "Siguiente" a la vista. Atrás vuelve
 * a la pregunta anterior con la respuesta puesta. En el resumen, cada fila
 * vuelve a su pregunta y "Listo" regresa; el botón de guardar del formulario
 * va ahí. Un error al guardar lleva a la pregunta de su campo.
 */

import { esc as _esc, f } from '../infra/utils.js';
import { desdeMiles } from '../infra/miles.js';
import { mostrarErroresForm } from '../infra/form-errors.js';
import { marcarCambios } from './hojas.js';
import { htmlTecladoFinko, montarTecladoFinko } from './teclado-finko.js';

/** El texto de un rótulo sin la pastilla "Opcional". */
const _rotulo = (el) => {
  if (!el) return '';
  const copia = el.cloneNode(true);
  copia.querySelectorAll('.form-optional, .sr-only, .tipo-segmented__sub').forEach(x => x.remove());
  return copia.textContent.replace(/\s+/g, ' ').trim();
};

/**
 * Lo que dice una respuesta en el resumen. Lee los campos del bloque.
 * @param {HTMLElement} bloque
 * @returns {string} '' si no tiene respuesta.
 */
export function valorDeBloque(bloque) {
  const propio = bloque.querySelector('[data-resumen-valor]');
  if (propio) return propio.textContent.replace(/\s+/g, ' ').trim();
  if (bloque.dataset.control === 'dia') {
    const n = Number(bloque.querySelector('input')?.value);
    if (!n) return '';
    return n >= 31 ? 'El último día de cada mes' : `El ${n} de cada mes`;
  }
  const pulsado = bloque.querySelector('[aria-pressed="true"]');
  if (pulsado && !bloque.querySelector('input:not([type="hidden"]), select')) return _rotulo(pulsado);
  // Un interruptor con su cuenta ("Se debita sola", "Recibí este dinero").
  const casilla = bloque.querySelector('input[type="checkbox"]');
  if (casilla) {
    if (!casilla.checked) return '';
    const cuenta = bloque.querySelector('input[type="radio"]:checked')?.closest('label')
      ?.querySelector('.cuenta-picker__nombre')?.textContent.trim();
    return cuenta ? `Sí · ${cuenta}` : 'Sí';
  }
  const radio = bloque.querySelector('input[type="radio"]:checked');
  if (radio) return _rotulo(radio.closest('label')?.querySelector('.chip-cat__label, .opt__t') ?? radio.closest('label'));
  const sufijo = bloque.dataset.resumenSufijo ?? '';
  const dinero = bloque.querySelector('input[data-miles]');
  if (dinero) {
    const n = desdeMiles(dinero.value) ?? 0;
    return n > 0 ? `${f(n)}${sufijo}` : '';
  }
  const select = bloque.querySelector('select');
  if (select) return [...select.options].find(o => o.value === select.value && o.value !== '')?.textContent.trim() ?? '';
  const texto = bloque.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea');
  if (texto?.value.trim()) return `${texto.value.trim()}${sufijo}`;
  return '';
}

/** Estado por hoja: sobrevive a que el dominio vuelva a pintar el formulario. */
const _estados = new WeakMap();
const _montados = new WeakSet();

/**
 * Monta el armazón sobre un formulario `[data-preguntas]`.
 * @param {HTMLFormElement} form
 * @param {HTMLElement} overlay
 * @param {{ reabierta: boolean }} opciones `reabierta`: la hoja se está
 *   abriendo (no es el mismo formulario vuelto a pintar).
 */
export function montarPreguntas(form, overlay, { reabierta }) {
  const estado = (reabierta || !_estados.has(overlay)) ? { id: null, avanzar: false } : _estados.get(overlay);
  _estados.set(overlay, estado);
  if (_montados.has(form)) {
    _controles.get(form)?.ir(reabierta ? null : estado.id);
    return;
  }
  _montados.add(form);

  const nombre = form.dataset.preguntas;
  const tituloResumen = form.dataset.resumenTitulo || 'Revisa antes de guardar';
  const cab = overlay.querySelector('.modal__header');
  const cuerpo = form.closest('.modal__body');
  const pie = [...form.children].find(el => el.matches('.modal__footer--principal'));
  const todos = () => [...form.querySelectorAll('[data-pregunta], [data-opcional]')];
  const preguntas = () => [...form.querySelectorAll('[data-pregunta]')].filter(b => !b.hidden);
  const idDe = (b) => b.dataset.preguntaId || (b.dataset.preguntaId = `p${todos().indexOf(b)}`);
  todos().forEach(idDe);

  form.classList.add('form-preguntas');
  form.insertAdjacentHTML('afterbegin', `
      <div class="preguntas__cab">
        <div class="prog" role="progressbar" aria-label="${_esc(nombre)}" aria-valuemin="1"></div>
        <p class="preg__n" data-preguntas-n></p>
        <h3 class="preg__t" tabindex="-1" data-preguntas-t></h3>
        <p class="preg__s" data-preguntas-s></p>
      </div>`);
  form.insertAdjacentHTML('beforeend', `
      <div class="preguntas__resumen" data-preguntas-resumen>
        <div class="recibo" data-resumen-filas></div>
        <div class="preguntas__agregar" data-resumen-agregar hidden>
          <p class="preguntas__agregar-t" id="${_esc(form.id)}-agregar">Agrega si quieres</p>
          <p class="preguntas__agregar-s">Mejoran los cálculos. También puedes hacerlo después.</p>
          <div class="agregar" role="group" aria-labelledby="${_esc(form.id)}-agregar" data-resumen-fichas></div>
        </div>
      </div>
      <div class="modal__footer modal__footer--principal preguntas__pie" data-preguntas-pie>
        <button type="button" class="btn btn-primary" data-preguntas-seguir></button>
      </div>`);
  // El pie de guardar va al final, para el resumen.
  if (pie) form.appendChild(pie);
  const cabTxt = form.querySelector('.preguntas__cab');
  const resumen = form.querySelector('[data-preguntas-resumen]');
  const pieSeguir = form.querySelector('[data-preguntas-pie]');
  const btnSeguir = pieSeguir.querySelector('button');

  // Controles propios: el teclado de Finko en el dinero y el selector de día.
  for (const bloque of todos()) {
    const dinero = bloque.querySelector('input[data-miles]');
    if (dinero && !bloque.querySelector('[data-kp-zona]')) {
      bloque.insertAdjacentHTML('beforeend', `<div class="kp-zona" data-kp-zona>${htmlTecladoFinko()}</div>`);
      montarTecladoFinko(bloque.querySelector('[data-kp-zona]'), dinero);
    }
    if (bloque.dataset.control === 'dia') _montarDia(bloque);
  }

  // Atrás en la cabecera.
  let atras = cab?.querySelector('[data-preguntas-atras]');
  if (cab && !atras) {
    cab.insertAdjacentHTML('afterbegin', '<button type="button" class="btn btn-icon btn-ghost modal__atras" data-preguntas-atras aria-label="Volver a la pregunta anterior" hidden><svg class="icon" aria-hidden="true"><use href="#i-arrow-left"/></svg></button>');
    atras = cab.querySelector('[data-preguntas-atras]');
  }

  let actual = null;      // id de la pregunta, o 'resumen'
  let desdeResumen = false;

  const mostrar = (on) => {
    for (const el of [...todos(), resumen, pie, pieSeguir].filter(Boolean)) el.toggleAttribute('data-pregunta-on', on.includes(el));
  };

  const pintarProgreso = (i, total) => {
    const prog = cabTxt.querySelector('.prog');
    prog.style.setProperty('--n', String(total));
    prog.innerHTML = Array.from({ length: total }, (_, j) => `<span class="prog__s${j <= i ? ' prog__s--on' : ''}"></span>`).join('');
    prog.setAttribute('aria-valuemax', String(total));
    prog.setAttribute('aria-valuenow', String(Math.min(i + 1, total)));
  };

  const pintarResumen = () => {
    const filas = [];
    const fichas = [];
    for (const b of todos()) {
      // Lo que el dominio esconde (el cupo sin tarjeta) no se ofrece.
      if (b.hidden) continue;
      const opcional = 'opcional' in b.dataset;
      const valor = valorDeBloque(b);
      const rotulo = b.dataset.resumen || b.dataset.opcional || b.dataset.pregunta;
      if (opcional && !valor) {
        fichas.push(`<button type="button" class="add" data-preguntas-ir="${idDe(b)}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>${_esc(b.dataset.opcional)}</button>`);
        continue;
      }
      filas.push(`<button type="button" class="recibo__fila" data-preguntas-ir="${idDe(b)}"><span class="recibo__txt"><span class="recibo__k">${_esc(rotulo)}</span><span class="recibo__v">${_esc(valor || 'Sin responder')}</span></span><svg class="icon recibo__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>`);
    }
    form.querySelector('[data-resumen-filas]').innerHTML = filas.join('');
    form.querySelector('[data-resumen-fichas]').innerHTML = fichas.join('');
    form.querySelector('[data-resumen-agregar]').hidden = fichas.length === 0;
  };

  const ir = (id, { foco = true } = {}) => {
    const lista = preguntas();
    const total = lista.length;
    if (!id) id = form.dataset.preguntasInicio === 'resumen' ? 'resumen' : idDe(lista[0]);
    actual = id;
    form.dataset.preguntaActual = id;
    const t = cabTxt.querySelector('[data-preguntas-t]');
    const s = cabTxt.querySelector('[data-preguntas-s]');
    const n = cabTxt.querySelector('[data-preguntas-n]');
    if (id === 'resumen') {
      desdeResumen = false;
      pintarResumen();
      mostrar([resumen, pie]);
      pintarProgreso(total, total);
      n.textContent = '';
      t.textContent = tituloResumen;
      s.textContent = 'Toca un dato para cambiarlo.';
    } else {
      const bloque = todos().find(b => idDe(b) === id);
      if (!bloque) return;
      const i = lista.indexOf(bloque);
      const opcional = i < 0;
      // Lo opcional se abre entero (la tasa vivía en un plegable).
      if (opcional) bloque.querySelectorAll('.form-disclosure__panel').forEach(p => { p.hidden = false; });
      mostrar([bloque, pieSeguir]);
      pintarProgreso(opcional ? total : i, total);
      n.textContent = opcional ? (nombre ?? '') : `${nombre ? `${nombre} · ` : ''}${i + 1} de ${total}${i + 1 === total ? ' · la última' : ''}`;
      t.textContent = bloque.dataset.pregunta || bloque.dataset.opcional || '';
      s.textContent = bloque.dataset.ayuda || '';
      s.hidden = !bloque.dataset.ayuda;
      const ultima = !opcional && i === total - 1;
      btnSeguir.innerHTML = (desdeResumen || opcional) ? 'Listo' : (ultima ? 'Ver el resumen' : 'Siguiente');
      if (!desdeResumen && !opcional && !ultima) btnSeguir.insertAdjacentHTML('beforeend', '<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>');
      // Elegir avanza al tocar: el pie sobra salvo que haya algo que escribir.
      pieSeguir.classList.toggle('preguntas__pie--suave', _esEleccion(bloque) && !desdeResumen && !opcional);
    }
    const anterior = id === 'resumen' ? lista.at(-1) : lista[lista.findIndex(b => idDe(b) === id) - 1];
    if (atras) {
      atras.hidden = id === 'resumen'
        ? form.dataset.preguntasInicio === 'resumen'
        : !anterior && !desdeResumen;
      atras.setAttribute('aria-label', id === 'resumen' ? 'Volver a la última pregunta' : 'Volver a la pregunta anterior');
    }
    if (cuerpo) cuerpo.scrollTop = 0;
    if (foco) t.focus({ preventScroll: true });
  };

  const respondida = (bloque) => {
    const campos = [...bloque.querySelectorAll('[required]')];
    const falta = campos.some(c => {
      if (c.type === 'radio') return !bloque.querySelector(`input[name="${CSS.escape(c.name)}"]:checked`);
      if (c.matches('[data-miles]')) return !((desdeMiles(c.value) ?? 0) > 0);
      return !String(c.value ?? '').trim();
    });
    if (!falta) return true;
    mostrarErroresForm(form, [bloque.dataset.falta || 'Responde para seguir.']);
    return false;
  };

  const seguir = () => {
    if (actual === 'resumen') return;
    const bloque = todos().find(b => idDe(b) === actual);
    if (!bloque || !respondida(bloque)) return;
    const lista = preguntas();
    const i = lista.indexOf(bloque);
    if (desdeResumen || i < 0 || i === lista.length - 1) { ir('resumen'); return; }
    ir(idDe(lista[i + 1]));
  };

  const volver = () => {
    const lista = preguntas();
    if (actual === 'resumen') { ir(idDe(lista.at(-1))); return; }
    if (desdeResumen) { ir('resumen'); return; }
    const i = lista.findIndex(b => idDe(b) === actual);
    if (i > 0) ir(idDe(lista[i - 1]));
  };

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-preguntas-seguir]')) { seguir(); return; }
    const a = e.target.closest('[data-preguntas-ir]');
    if (a) { desdeResumen = true; ir(a.dataset.preguntasIr); return; }
    const avanza = e.target.closest('[data-pregunta-avanza]');
    if (avanza) { estado.id = actual; estado.avanzar = !desdeResumen; estado.alResumen = desdeResumen; return; }
    // Una opción tocada con el dedo responde y sigue.
    const radio = e.target.closest('input[type="radio"]');
    if (radio && e.detail > 0 && radio.closest('[data-pregunta-on]') && !radio.closest('[data-no-avanza]')) {
      setTimeout(seguir, 0);
    }
  }, true);
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || actual === 'resumen') return;
    if (e.target.matches('textarea, button')) return;
    if (e.target.closest('[data-pregunta-on]')) { e.preventDefault(); seguir(); }
  });
  atras?.addEventListener('click', volver);
  // Un error al guardar lleva a la pregunta de su campo.
  new MutationObserver(() => {
    if (actual !== 'resumen') return;
    const invalido = form.querySelector('[aria-invalid="true"]');
    const bloque = invalido?.closest('[data-pregunta], [data-opcional]');
    if (bloque) { desdeResumen = true; ir(idDe(bloque)); }
  }).observe(form, { attributes: true, subtree: true, attributeFilter: ['aria-invalid'] });

  _controles.set(form, { ir: (id) => ir(id) });
  // Primera vez, o el mismo formulario vuelto a pintar por el dominio.
  if (estado.id && estado.avanzar) {
    const lista = preguntas();
    const i = lista.findIndex(b => idDe(b) === estado.id);
    ir(i >= 0 && i < lista.length - 1 ? idDe(lista[i + 1]) : 'resumen', { foco: true });
  } else if (estado.id && estado.alResumen) {
    ir('resumen');
  } else {
    ir(null, { foco: false });
  }
  estado.avanzar = false;
  estado.alResumen = false;
}

const _controles = new WeakMap();

/** ¿La pregunta se responde eligiendo (y avanza al tocar)? */
function _esEleccion(bloque) {
  return Boolean(bloque.querySelector('input[type="radio"], [data-pregunta-avanza]')) || bloque.dataset.control === 'dia';
}

/** El selector de día: 31 botones y "Último día del mes" sobre el campo de siempre. */
function _montarDia(bloque) {
  const campo = bloque.querySelector('input');
  if (!campo || bloque.querySelector('.dias')) return;
  campo.type = 'hidden';
  const boton = (v, t, ancho = false) => `<button type="button" class="dia${ancho ? ' dia--ancho' : ''}" data-dia="${v}" aria-pressed="false">${t}</button>`;
  campo.insertAdjacentHTML('afterend', `
      <div class="dias" role="group" aria-label="Día del mes">
        ${Array.from({ length: 31 }, (_, i) => boton(i + 1, i + 1)).join('')}
        ${boton(31, 'Último día del mes', true)}
      </div>`);
  const pintar = () => {
    const v = Number(campo.value);
    const botones = [...bloque.querySelectorAll('[data-dia]')];
    // El 31 se marca como "Último día del mes".
    botones.forEach((b, i) => b.setAttribute('aria-pressed', String(v > 0 && (v === 31 ? i === 31 : Number(b.dataset.dia) === v))));
  };
  bloque.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]');
    if (!b) return;
    campo.value = b.dataset.dia;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    if (e.isTrusted) marcarCambios(campo);
    pintar();
    const form = bloque.closest('form');
    form?.querySelector('[data-preguntas-seguir]')?.click();
  });
  pintar();
}
