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
 * - `data-cifra` en el bloque del dinero (GF.1, ADR 167 D1): se ve como el
 *   monto de Registrar gasto (`gastos/telefono.js`). La pregunta va al
 *   centro sobre la cifra grande, debajo su lectura en palabras y abajo el
 *   teclado de Finko, sin la salida al del teléfono (ADR 156 D4). Lo que
 *   falta se dice en la lectura, en rojo.
 *
 *
 * Pasos con nombre (GF.2, ADR 177 D1), opciones que solo pide quien las usa:
 *
 * - `data-pasos="Monto|Qué es|Cuándo|Revisar"` en el formulario: en lugar de
 *   la barra y "2 de 4", los pasos rotulados (`.etapas`). El último es el
 *   resumen. Cada bloque dice el suyo con `data-paso`; varios bloques pueden
 *   ser del mismo paso (la empresa es una pantalla de "Qué es"). Desde el
 *   resumen, una pregunta lleva a las demás de su paso antes de volver.
 * - `[data-contexto]` (oculto) dentro de un bloque: lo ya respondido, que va
 *   sobre el título ("Pagas $85.000"). El dominio lo mantiene al día; un
 *   botón `[data-preguntas-volver]` dentro vuelve a la pregunta anterior.
 * - `data-saltar="Sin empresa"`: la pregunta es opcional (lleva la pastilla)
 *   y el pie suma ese botón, que la deja sin respuesta y sigue.
 * - `data-seguir="Usar esta categoría"`: lo que dice el botón de seguir.
 * - `[data-avanza]` en una opción de un bloque `data-no-avanza`: esa sí
 *   avanza al tocarla ("Crear categoría").
 * - Un `data-control="dia"` puede ir dentro de un bloque; si el bloque es
 *   `data-no-avanza`, tocar un día no avanza.
 * - En el resumen: `data-resumen-orden` ordena las filas (las que no lo
 *   tienen van después); `[data-resumen-parte="Cada cuánto"]` parte un
 *   bloque en filas; `data-resumen=""` no tiene fila (la dice otra);
 *   `[data-resumen-icono]` (oculto) es el ícono de la fila;
 *   `[data-resumen-aviso]` se repite como aviso bajo las filas; y
 *   `data-resumen-agregar` en el formulario es la línea de "Agrega si quieres".
 * - El resumen es una factura (FAC.1, ADR 180, `ui/factura.js`): el sello, el
 *   título (`data-factura-titulo` del formulario o, si no, su nombre), la
 *   cifra principal con "COP" y su rótulo (el bloque `data-cifra` o, si no,
 *   el primer bloque de dinero respondido; su fila no se repite), las filas
 *   con su ícono de contorno, la nota aparte y un código de barras.
 *
 * Con pasos con nombre, elegir es seguir (GF.3, ADR 178): tocar una opción,
 * un día o una opción del desplegable de Finko lleva a la pantalla siguiente
 * cuando la pantalla queda respondida (en "¿Cuándo lo pagas?", cada cuánto
 * espera al día; con el día ya puesto, sigue). La opción elegida se ve un
 * instante antes de pasar, y cada pantalla entra con un fundido corto. Una
 * pantalla de elegir no lleva botón de seguir, tampoco desde el resumen
 * (Atrás vuelve sin cambiar nada); "Sin empresa" sí queda en el pie. Lo que
 * se escribe (el monto, la categoría nueva) conserva su botón.
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
import { vigilarToques } from './toque.js';
import { htmlFacturaSello, htmlFacturaBarras } from './factura.js';

/**
 * El ícono de contorno de una fila de la factura sin ícono propio, por lo
 * que dice su rótulo (FAC.1, ADR 180 D4). Sin pista, un documento.
 * @param {string} rotulo
 * @returns {string} id del símbolo del sprite.
 */
export function simboloDeFilaFactura(rotulo) {
  const r = String(rotulo ?? '').toLowerCase();
  if (/nota/.test(r)) return 'i-nota';
  if (/cada cu[aá]nto|frecuencia/.test(r)) return 'i-recurring';
  if (/d[ií]a|fecha|cu[aá]ndo|plazo|mes(es)?\b/.test(r)) return 'i-agenda';
  if (/cuenta|sale de|llega|debita|banco|entidad|guardad/.test(r)) return 'i-cuentas';
  if (/tasa|inter[eé]s|rendimiento/.test(r)) return 'i-percent';
  if (/qui[eé]n|persona/.test(r)) return 'i-users';
  if (/cuota|cupo|monto|cu[aá]nto|debes|saldo|necesitas|valor|l[ií]mite/.test(r)) return 'i-saldo';
  if (/nombre|qu[eé] es|tipo|c[oó]mo|categor[ií]a|para qu[eé]|empresa|meta|reserva/.test(r)) return 'c-etiqueta';
  return 'i-doc';
}

/**
 * El contenido de un elemento para repetirlo en otro lugar (el contexto, el
 * ícono de una fila, el aviso del resumen): sin `id`, que no se repiten, y
 * sin `aria-live`, que ya anuncia el original.
 * @param {HTMLElement} el
 * @returns {string}
 */
const _copia = (el) => {
  const c = el.cloneNode(true);
  c.querySelectorAll('[id], [aria-live]').forEach(x => { x.removeAttribute('id'); x.removeAttribute('aria-live'); });
  return c.innerHTML.trim();
};

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
  // Un desplegable o una fecha de Finko ya dicen su valor en su botón; la
  // lista que aparece con "Otra" manda sobre la opción "Otra".
  const finko = [...bloque.querySelectorAll('.campo-finko:not(.campo-finko--vacio)')]
    .find(b => !b.parentElement.closest('[hidden]'));
  if (finko) return finko.querySelector('.campo-finko__v').textContent.trim();
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

/**
 * GF.3 (ADR 178 D2): lo que la opción elegida se queda a la vista, con su
 * visto, antes de pasar a la pantalla siguiente. Sin pasos con nombre se
 * sigue al momento, como siempre.
 */
export const PAUSA_ELEGIR_MS = 180;

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
  // GF.2 (ADR 177 D1): los pasos con nombre; el último es el resumen.
  const pasos = form.dataset.pasos ? form.dataset.pasos.split('|') : null;
  const cab = overlay.querySelector('.modal__header');
  const cuerpo = form.closest('.modal__body');
  const pie = [...form.children].find(el => el.matches('.modal__footer--principal'));
  const todos = () => [...form.querySelectorAll('[data-pregunta], [data-opcional]')];
  const preguntas = () => [...form.querySelectorAll('[data-pregunta]')].filter(b => !b.hidden);
  const idDe = (b) => b.dataset.preguntaId || (b.dataset.preguntaId = `p${todos().indexOf(b)}`);
  todos().forEach(idDe);

  const progreso = pasos
    ? `<ol class="etapas" aria-label="Pasos" data-preguntas-pasos>${pasos.map(p => `<li class="etapa" data-paso-de="${_esc(p)}">${_esc(p)}</li>`).join('')}</ol>`
    : `<div class="prog" role="progressbar" aria-label="${_esc(nombre)}" aria-valuemin="1"></div>`;
  form.classList.add('form-preguntas');
  form.insertAdjacentHTML('afterbegin', `
      <div class="preguntas__cab">
        ${progreso}
        <p class="preg__n" data-preguntas-n></p>
        <div class="preguntas__ctx" data-preguntas-ctx hidden></div>
        <div class="preg__fila">
          <h3 class="preg__t" tabindex="-1" data-preguntas-t></h3>
          <span class="form-optional preg__opcional" data-preguntas-opcional hidden>Opcional</span>
        </div>
        <p class="preg__s" data-preguntas-s></p>
      </div>`);
  form.insertAdjacentHTML('beforeend', `
      <div class="preguntas__resumen" data-preguntas-resumen>
        <div class="factura factura--resumen">
          <div class="factura__papel">
            ${htmlFacturaSello()}
            <p class="factura__titulo" data-resumen-factura-titulo>${_esc(form.dataset.facturaTitulo || nombre || '')}</p>
            <button type="button" class="factura__cifra" data-resumen-cifra hidden>
              <span class="factura__monto" data-resumen-monto></span>
              <span class="factura__moneda">COP</span>
              <span class="factura__que" data-resumen-que></span>
            </button>
            <div class="recibo factura__filas" data-resumen-filas></div>
            <div class="recibo factura__filas factura__filas--nota" data-resumen-notas hidden></div>
            ${htmlFacturaBarras(form.id || nombre || 'finko')}
          </div>
        </div>
        <div class="preguntas__aviso" data-resumen-aviso-caja hidden></div>
        <div class="preguntas__agregar" data-resumen-agregar hidden>
          <p class="preguntas__agregar-t" id="${_esc(form.id)}-agregar">Agrega si quieres</p>
          <p class="preguntas__agregar-s">${_esc(form.dataset.resumenAgregar || 'Mejoran los cálculos. También puedes hacerlo después.')}</p>
          <div class="agregar" role="group" aria-labelledby="${_esc(form.id)}-agregar" data-resumen-fichas></div>
        </div>
      </div>
      <div class="modal__footer modal__footer--principal preguntas__pie" data-preguntas-pie>
        <button type="button" class="btn btn-secondary preguntas__saltar" data-preguntas-saltar hidden></button>
        <button type="button" class="btn btn-primary" data-preguntas-seguir></button>
      </div>`);
  // El pie de guardar va al final, para el resumen.
  if (pie) form.appendChild(pie);
  const cabTxt = form.querySelector('.preguntas__cab');
  // GF.3 (ADR 178 D3): lo que entra con cada pantalla, además del bloque (la
  // barra de pasos se queda quieta).
  const entran = pasos ? [...cabTxt.children].filter(el => !el.matches('.etapas')) : [];
  const resumen = form.querySelector('[data-preguntas-resumen]');
  const pieSeguir = form.querySelector('[data-preguntas-pie]');
  const btnSeguir = pieSeguir.querySelector('[data-preguntas-seguir]');
  const btnSaltar = pieSeguir.querySelector('[data-preguntas-saltar]');

  // Controles propios: el teclado de Finko en el dinero y el selector de día.
  for (const bloque of todos()) {
    const dinero = bloque.querySelector('input[data-miles]');
    if (dinero && !bloque.querySelector('[data-kp-zona]')) {
      if ('cifra' in bloque.dataset) {
        _montarCifra(bloque, dinero);
      } else {
        bloque.insertAdjacentHTML('beforeend', `<div class="kp-zona" data-kp-zona>${htmlTecladoFinko()}</div>`);
        montarTecladoFinko(bloque.querySelector('[data-kp-zona]'), dinero);
      }
    }
    // El día puede ser el bloque o ir dentro de él (GF.2: con la frecuencia).
    for (const dia of [bloque, ...bloque.querySelectorAll('[data-control="dia"]')]) {
      if (dia.dataset.control === 'dia') _montarDia(dia);
    }
  }

  // Atrás en la cabecera.
  let atras = cab?.querySelector('[data-preguntas-atras]');
  if (cab && !atras) {
    cab.insertAdjacentHTML('afterbegin', '<button type="button" class="btn btn-icon btn-ghost modal__atras" data-preguntas-atras aria-label="Volver a la pregunta anterior" hidden><svg class="icon" aria-hidden="true"><use href="#i-arrow-left"/></svg></button>');
    atras = cab.querySelector('[data-preguntas-atras]');
  }

  let actual = null;      // id de la pregunta, o 'resumen'
  let desdeResumen = false;
  let espera = null;      // el paso pendiente tras elegir (GF.3)

  const mostrar = (on) => {
    for (const el of [...todos(), resumen, pie, pieSeguir].filter(Boolean)) el.toggleAttribute('data-pregunta-on', on.includes(el));
  };

  /** ¿Los dos bloques son del mismo paso con nombre? */
  const mismoPaso = (a, b) => Boolean(pasos && a && b && a.dataset.paso && a.dataset.paso === b.dataset.paso);

  /**
   * Adónde lleva "Siguiente" desde un bloque: la pregunta que sigue o el
   * resumen. Desde el resumen, solo las del mismo paso (GF.2).
   */
  const destinoDe = (bloque) => {
    const lista = preguntas();
    const i = lista.indexOf(bloque);
    if (i < 0) return 'resumen';
    const sig = lista[i + 1];
    if (desdeResumen) return mismoPaso(bloque, sig) ? idDe(sig) : 'resumen';
    return sig ? idDe(sig) : 'resumen';
  };

  const pintarProgreso = (i, total, paso) => {
    if (pasos) {
      const n = paso ? Math.max(0, pasos.indexOf(paso)) : pasos.length - 1;
      cabTxt.querySelectorAll('[data-paso-de]').forEach((li, j) => {
        li.classList.toggle('etapa--hecha', j < n);
        li.classList.toggle('etapa--on', j === n);
        if (j === n) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      return;
    }
    const prog = cabTxt.querySelector('.prog');
    prog.style.setProperty('--n', String(total));
    prog.innerHTML = Array.from({ length: total }, (_, j) => `<span class="prog__s${j <= i ? ' prog__s--on' : ''}"></span>`).join('');
    prog.setAttribute('aria-valuemax', String(total));
    prog.setAttribute('aria-valuenow', String(Math.min(i + 1, total)));
  };

  const pintarResumen = () => {
    const filas = [];
    const notas = [];
    const fichas = [];
    // FAC.1 (ADR 180 D4): cada fila lleva un ícono; el propio del bloque o
    // uno de contorno según lo que dice su rótulo.
    const fila = (b, rotulo, valor, icono) => `<button type="button" class="recibo__fila" data-preguntas-ir="${idDe(b)}"><span class="recibo__ico${icono ? '' : ' recibo__ico--contorno'}" aria-hidden="true">${icono || `<svg class="icon" aria-hidden="true" focusable="false"><use href="#${simboloDeFilaFactura(rotulo)}"/></svg>`}</span><span class="recibo__txt"><span class="recibo__k">${_esc(rotulo)}</span><span class="recibo__v">${_esc(valor || 'Sin responder')}</span></span><svg class="icon recibo__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>`;
    const icono = (el) => {
      const i = el.querySelector('[data-resumen-icono]');
      return i ? _copia(i) : '';
    };
    // La cifra de la factura: el bloque `data-cifra` o el primer bloque de
    // dinero con respuesta. Va arriba, grande, y su fila no se repite.
    const conDinero = (b) => !b.hidden && b.dataset.resumen !== '' && !b.querySelector('[data-resumen-parte]')
      && (desdeMiles(b.querySelector('input[data-miles]')?.value) ?? 0) > 0;
    const heroe = todos().find(b => 'cifra' in b.dataset && conDinero(b)) ?? todos().find(conDinero) ?? null;
    const caja = form.querySelector('[data-resumen-cifra]');
    if (caja) {
      caja.hidden = !heroe;
      if (heroe) {
        const rotuloHeroe = heroe.dataset.resumen || heroe.dataset.opcional || heroe.dataset.pregunta || '';
        caja.dataset.preguntasIr = idDe(heroe);
        caja.setAttribute('aria-label', `${rotuloHeroe}: ${f(desdeMiles(heroe.querySelector('input[data-miles]').value))}. Cambiar`);
        form.querySelector('[data-resumen-monto]').textContent = f(desdeMiles(heroe.querySelector('input[data-miles]').value));
        form.querySelector('[data-resumen-que]').textContent = rotuloHeroe;
      }
    }
    for (const b of todos()) {
      // Lo que el dominio esconde (el cupo sin tarjeta) no se ofrece; lo que
      // ya dice otra fila (la empresa va con "Qué es") tampoco; la cifra de
      // la factura tampoco (FAC.1).
      if (b.hidden || b.dataset.resumen === '' || b === heroe) continue;
      const orden = 'resumenOrden' in b.dataset ? Number(b.dataset.resumenOrden) : Infinity;
      const opcional = 'opcional' in b.dataset;
      const partes = [...b.querySelectorAll('[data-resumen-parte]')];
      if (partes.length) {
        for (const p of partes) filas.push({ orden, html: fila(b, p.dataset.resumenParte, valorDeBloque(p), icono(p)) });
        continue;
      }
      const valor = valorDeBloque(b);
      const rotulo = b.dataset.resumen || b.dataset.opcional || b.dataset.pregunta;
      if (opcional && !valor) {
        fichas.push(`<button type="button" class="add" data-preguntas-ir="${idDe(b)}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>${_esc(b.dataset.opcional)}</button>`);
        continue;
      }
      // La nota va aparte, tras otro corte, como en la factura.
      (/^nota\b/i.test(rotulo) ? notas : filas).push({ orden, html: fila(b, rotulo, valor, icono(b)) });
    }
    // Las filas con orden van primero, en ese orden; las demás, como vienen.
    filas.sort((a, b) => (a.orden === b.orden ? 0 : (a.orden < b.orden ? -1 : 1)));
    form.querySelector('[data-resumen-filas]').innerHTML = filas.map(x => x.html).join('');
    const cajaNotas = form.querySelector('[data-resumen-notas]');
    if (cajaNotas) {
      cajaNotas.innerHTML = notas.map(x => x.html).join('');
      cajaNotas.hidden = notas.length === 0;
    }
    form.querySelector('[data-resumen-fichas]').innerHTML = fichas.join('');
    form.querySelector('[data-resumen-agregar]').hidden = fichas.length === 0;
    // El aviso se repite con su vestido (la clase del original).
    const aviso = form.querySelector('[data-resumen-aviso]');
    const cajaAviso = form.querySelector('[data-resumen-aviso-caja]');
    cajaAviso.className = `preguntas__aviso ${aviso?.className ?? ''}`.trim();
    cajaAviso.innerHTML = aviso ? _copia(aviso) : '';
    cajaAviso.hidden = !cajaAviso.innerHTML;
  };

  const ir = (id, { foco = true } = {}) => {
    clearTimeout(espera);
    espera = null;
    const lista = preguntas();
    const total = lista.length;
    if (!id) id = form.dataset.preguntasInicio === 'resumen' ? 'resumen' : idDe(lista[0]);
    actual = id;
    form.dataset.preguntaActual = id;
    const t = cabTxt.querySelector('[data-preguntas-t]');
    const s = cabTxt.querySelector('[data-preguntas-s]');
    const n = cabTxt.querySelector('[data-preguntas-n]');
    const ctx = cabTxt.querySelector('[data-preguntas-ctx]');
    const opc = cabTxt.querySelector('[data-preguntas-opcional]');
    // La cifra lleva su propia pregunta, al centro: el título no se repite.
    const cifra = id === 'resumen' ? null : todos().find(b => idDe(b) === id && 'cifra' in b.dataset);
    cabTxt.classList.toggle('preguntas__cab--cifra', Boolean(cifra));
    ctx.hidden = true;
    opc.hidden = true;
    btnSaltar.hidden = true;
    if (id === 'resumen') {
      desdeResumen = false;
      pintarResumen();
      mostrar([resumen, pie]);
      pintarProgreso(total, total, null);
      n.textContent = '';
      t.textContent = tituloResumen;
      s.textContent = 'Toca un dato para cambiarlo.';
      s.hidden = false;
    } else {
      const bloque = todos().find(b => idDe(b) === id);
      if (!bloque) return;
      const i = lista.indexOf(bloque);
      const opcional = i < 0;
      // Lo opcional se abre entero (la tasa vivía en un plegable), también si
      // vive dentro de uno ("Más opciones" del gasto fijo).
      if (opcional) {
        bloque.querySelectorAll('.form-disclosure__panel').forEach(p => { p.hidden = false; });
        const plegado = bloque.closest('.form-disclosure__panel');
        if (plegado) plegado.hidden = false;
      }
      mostrar([bloque, pieSeguir]);
      pintarProgreso(opcional ? total : i, total, opcional ? null : bloque.dataset.paso);
      if (pasos) n.textContent = '';
      else n.textContent = opcional ? (nombre ?? '') : `${nombre ? `${nombre} · ` : ''}${i + 1} de ${total}${i + 1 === total ? ' · la última' : ''}`;
      const fuente = opcional ? null : bloque.querySelector('[data-contexto]');
      ctx.innerHTML = fuente ? _copia(fuente) : '';
      ctx.hidden = !ctx.innerHTML;
      t.textContent = bloque.dataset.pregunta || bloque.dataset.opcional || '';
      s.textContent = bloque.dataset.ayuda || '';
      s.hidden = !bloque.dataset.ayuda;
      const saltable = !opcional && 'saltar' in bloque.dataset;
      opc.hidden = !saltable;
      btnSaltar.hidden = !saltable;
      btnSaltar.textContent = saltable ? bloque.dataset.saltar : '';
      const destino = destinoDe(bloque);
      const listo = opcional || (desdeResumen && destino === 'resumen');
      btnSeguir.innerHTML = _esc(listo ? 'Listo' : (bloque.dataset.seguir || (destino === 'resumen' ? 'Ver el resumen' : 'Siguiente')));
      if (!listo && (destino !== 'resumen' || pasos)) btnSeguir.insertAdjacentHTML('beforeend', '<svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg>');
      // Elegir avanza al tocar: el pie sobra salvo que haya algo que escribir.
      // Con pasos con nombre, también desde el resumen; "Sin empresa" se
      // queda solo en el pie (GF.3, ADR 178 D1).
      const eleccion = _esEleccion(bloque) && !opcional && (!desdeResumen || Boolean(pasos));
      pieSeguir.classList.toggle('preguntas__pie--suave', eleccion && !saltable);
      btnSeguir.hidden = eleccion && saltable;
    }
    const iActual = lista.findIndex(b => idDe(b) === id);
    const anterior = id === 'resumen' ? lista.at(-1) : lista[iActual - 1];
    if (atras) {
      atras.hidden = id === 'resumen'
        ? form.dataset.preguntasInicio === 'resumen'
        : !anterior && !desdeResumen;
      atras.setAttribute('aria-label', id === 'resumen' ? 'Volver a la última pregunta' : 'Volver a la pregunta anterior');
    }
    if (cuerpo) cuerpo.scrollTop = 0;
    // GF.3 (ADR 178 D3): el bloque entra solo (pasa de oculto a visible); la
    // cabecera es la misma, así que su animación se reinicia a mano.
    if (entran.length) {
      entran.forEach(el => el.classList.remove('preguntas__entra'));
      void cabTxt.offsetWidth;
      entran.forEach(el => el.classList.add('preguntas__entra'));
    }
    if (foco) (cifra?.querySelector('[data-cifra-foco]') ?? t).focus({ preventScroll: true });
  };

  /** ¿Falta algo obligatorio en el bloque? Sin decirlo. */
  const falta = (bloque) => [...bloque.querySelectorAll('[required]')].some(c => {
    if (c.type === 'radio') return !bloque.querySelector(`input[name="${CSS.escape(c.name)}"]:checked`);
    if (c.matches('[data-miles]')) return !((desdeMiles(c.value) ?? 0) > 0);
    return !String(c.value ?? '').trim();
  });

  const respondida = (bloque) => {
    if (!falta(bloque)) return true;
    // La cifra lo dice en su lectura, como Registrar gasto.
    const pmonto = bloque.querySelector('.pmonto');
    if (pmonto) {
      const lee = pmonto.querySelector('.pmonto__lee');
      pmonto.classList.add('pmonto--error');
      lee.classList.remove('pmonto__lee--vacia');
      lee.textContent = bloque.dataset.falta || 'Escribe cuánto. Por ejemplo: 50.000';
      return false;
    }
    mostrarErroresForm(form, [bloque.dataset.falta || 'Responde para seguir.']);
    return false;
  };

  const seguir = () => {
    if (actual === 'resumen') return;
    const bloque = todos().find(b => idDe(b) === actual);
    if (!bloque || !respondida(bloque)) return;
    ir(destinoDe(bloque));
  };

  /**
   * Tras elegir, sigue. Con pasos con nombre (GF.3, ADR 178 D2), después de
   * la pausa y solo si la pantalla quedó respondida, sin marcar error: elegir
   * cada cuánto antes del día no es un error. Un segundo toque durante la
   * pausa no salta otra pantalla, y Atrás o un cambio de pantalla la anulan.
   * Sin pasos, como siempre: al momento, después del `change` del toque.
   */
  const seguirTrasElegir = () => {
    if (!pasos) { setTimeout(seguir, 0); return; }
    if (espera) return;
    const desde = actual;
    espera = setTimeout(() => {
      espera = null;
      if (actual !== desde) return;
      const bloque = todos().find(b => idDe(b) === actual);
      if (bloque && !falta(bloque)) seguir();
    }, PAUSA_ELEGIR_MS);
  };

  /** "Sin empresa": la pregunta opcional queda sin respuesta y se sigue. */
  const saltar = () => {
    const bloque = todos().find(b => idDe(b) === actual);
    if (!bloque) return;
    for (const c of bloque.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked')) {
      c.checked = false;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    }
    ir(destinoDe(bloque));
  };

  const volver = () => {
    const lista = preguntas();
    if (actual === 'resumen') { ir(idDe(lista.at(-1))); return; }
    const i = lista.findIndex(b => idDe(b) === actual);
    if (desdeResumen) { ir(i > 0 && mismoPaso(lista[i], lista[i - 1]) ? idDe(lista[i - 1]) : 'resumen'); return; }
    if (i > 0) ir(idDe(lista[i - 1]));
  };

  const esToque = vigilarToques(form);
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-preguntas-seguir]')) { seguir(); return; }
    if (e.target.closest('[data-preguntas-saltar]')) { saltar(); return; }
    if (e.target.closest('[data-preguntas-volver]')) { volver(); return; }
    const a = e.target.closest('[data-preguntas-ir]');
    if (a) { desdeResumen = true; ir(a.dataset.preguntasIr); return; }
    const avanza = e.target.closest('[data-pregunta-avanza]');
    if (avanza) { estado.id = actual; estado.avanzar = !desdeResumen; estado.alResumen = desdeResumen; return; }
    // Una opción tocada con el dedo responde y sigue (ui/toque.js), salvo en
    // un bloque que no avanza; ahí, solo la opción `data-avanza`.
    const radio = e.target.closest('input[type="radio"]');
    const freno = radio?.closest('[data-avanza], [data-no-avanza]');
    if (radio && esToque(e, radio) && radio.closest('[data-pregunta-on]') && (!freno || 'avanza' in freno.dataset)) {
      seguirTrasElegir();
    }
  }, true);
  // GF.3 (ADR 178 D2): con pasos con nombre, una opción del desplegable de
  // Finko (la frecuencia "Otra") también es elegir. Solo en la pregunta a la
  // vista: el dominio que escribe un `<select>` al abrir no avanza nada.
  form.addEventListener('change', (e) => {
    if (!pasos || !e.target.matches?.('select')) return;
    const bloque = e.target.closest('[data-pregunta]');
    if (bloque?.matches('[data-pregunta-on]') && !e.target.closest('[data-no-avanza]')) seguirTrasElegir();
  });
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

  _controles.set(form, { ir: (id) => ir(id), pasos: Boolean(pasos), elegido: seguirTrasElegir });
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
  if ('noAvanza' in bloque.dataset) return false;
  return Boolean(bloque.querySelector('input[type="radio"], [data-pregunta-avanza]')) || bloque.dataset.control === 'dia';
}

/**
 * El dinero de un bloque `data-cifra` vestido como el monto de Registrar
 * gasto (GF.1): el mismo campo `data-miles`, dentro de la cifra grande que
 * crece con lo escrito; su rótulo y su caja de siempre quedan ocultos.
 * @param {HTMLElement} bloque
 * @param {HTMLInputElement} campo
 */
function _montarCifra(bloque, campo) {
  const id = campo.id || `cifra-${Math.random().toString(36).slice(2, 8)}`;
  campo.id = id;
  bloque.insertAdjacentHTML('afterbegin', `
      <div class="pmonto form-group">
        <label class="pmonto__q" id="${_esc(id)}-q" for="${_esc(id)}" tabindex="-1" data-cifra-foco>${_esc(bloque.dataset.pregunta || '¿Cuánto?')}</label>
        <span class="pmonto__v">
          <span class="pmonto__signo" aria-hidden="true">$</span>
          <span class="pmonto__caja" data-valor="0"></span>
        </span>
        <p class="pmonto__lee" id="${_esc(id)}-lee" aria-live="polite"></p>
      </div>`);
  const pmonto = bloque.querySelector('.pmonto');
  const caja = pmonto.querySelector('.pmonto__caja');
  caja.appendChild(campo);
  campo.classList.remove('input', 'input--big-amount');
  campo.classList.add('pmonto__in');
  campo.size = 1;
  campo.setAttribute('enterkeyhint', 'next');
  campo.setAttribute('aria-describedby', `${id}-lee`);
  bloque.querySelectorAll(`label[for="${CSS.escape(id)}"]:not(.pmonto__q), .monto-hero__box`)
    .forEach(el => { el.hidden = true; });

  bloque.insertAdjacentHTML('beforeend', `<div class="kp-zona" data-kp-zona>${htmlTecladoFinko({ sistema: false })}</div>`);
  montarTecladoFinko(bloque.querySelector('[data-kp-zona]'), campo, pmonto.querySelector('.pmonto__lee'), {
    vacio: 'Márcalo con el teclado de abajo',
    sistema: false,
  });
  const pintar = () => {
    caja.dataset.valor = campo.value || '0';
    pmonto.classList.toggle('pmonto--vacio', !campo.value);
    pmonto.classList.toggle('pmonto--largo', campo.value.length > 9);
    pmonto.classList.remove('pmonto--error');
  };
  campo.addEventListener('input', pintar);
  pintar();
}

/**
 * El selector de día: 31 botones y "Último día del mes" sobre el campo de
 * siempre. Tocar un día responde y sigue, salvo dentro de un bloque
 * `data-no-avanza`. Con pasos con nombre, sigue como cualquier elección
 * (GF.3, ADR 178 D2: la pausa y la pantalla respondida).
 * @param {HTMLElement} bloque el `[data-control="dia"]`
 */
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
    if (bloque.closest('[data-no-avanza]')) return;
    const form = bloque.closest('form');
    const control = form && _controles.get(form);
    if (control?.pasos) { control.elegido(); return; }
    form?.querySelector('[data-preguntas-seguir]')?.click();
  });
  pintar();
}
