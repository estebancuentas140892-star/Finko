/**
 * gastos/telefono.js - Registrar gasto en el teléfono (FORM.2b, ADR 142 D3 y D4).
 *
 * Bajo 1024 px el formulario deja de ser una columna de campos: es la misma
 * hoja y el mismo `<form id="form-gasto">`, con tres etapas con nombre arriba
 * (Monto · Categoría · Revisar):
 *
 * 1. **Monto** con el teclado de Finko (`ui/teclado-finko.js`). Un gasto
 *    frecuente (TX.12) salta directo al recibo con todo puesto.
 * 2. **¿En qué fue?** Todas las categorías en tejas grandes, las que más usas
 *    primero (042 D2: ninguna escondida). Tocar una avanza.
 * 3. **Recibo.** Monto y categoría arriba; "Sale de" (la cuenta habitual, con
 *    lo que le queda), "Fecha" y "Nota". Cada fila abre su mini-hoja
 *    (`ui/mini-hoja.js`) con los campos reales. Si la cuenta no alcanza, el
 *    recibo lo dice antes de guardar y ofrece completar (`planSiNoAlcanza`).
 *
 * Los nombres de los campos son los de siempre (`monto`, `categoria`,
 * `cuentaId`, `cuotas`, `avanceTC`, `fechaOpcion`, `fecha`, `nota`, más
 * `reparto` cuando hay que completar), así `validarGasto`, `normalizarGasto`
 * y `_guardarGasto` no cambian. Los ids que lee `index.js`
 * (`#categoria-nueva-fields`, `#gasto-fecha`, `#gasto-fecha-otra`,
 * `#grupo-gasto-cuotas`, `#grupo-gasto-avance`...) también.
 *
 * Escritorio conserva `renderFormGasto()` (ADR 142, "Solo bajo 1024 px").
 */

import { S } from '../../core/state.js';
import { CATEGORIAS_GASTO_USUARIO, ICONOS_CATEGORIA_PERSONALIZADA, TARJETA_PREFIJO, iconoDeCategoriaGasto } from '../../core/constants.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { miles, desdeMiles } from '../../infra/miles.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import { bancoAvatar } from '../../infra/bancos.js';
import { tejaTarjeta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { htmlTecladoFinko, montarTecladoFinko, montoEnPalabras } from '../../ui/teclado-finko.js';
import { htmlMiniHoja, abrirMiniHoja, cerrarMiniHoja, miniHojaAbierta } from '../../ui/mini-hoja.js';
import { htmlCalendario, montarCalendario } from '../../ui/calendario-finko.js';
import {
  gastosFrecuentes, tarjetasDeCredito, ordenarCategoriasPorUso, cuentaHabitual,
  planSiNoAlcanza, validarCategoriaPersonalizada,
} from './logic.js';
import { CATEGORIA_NUEVA_VALUE, ayerIso } from './view.js';

const MQ_MOVIL = '(max-width: 1023.98px)';

/** ¿Registrar gasto va por etapas? Solo en el teléfono y la tableta. */
export const gastoPorEtapas = () => window.matchMedia?.(MQ_MOVIL).matches === true;

const _CUOTAS = [1, 2, 3, 6, 9, 12, 18, 24];
const _DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Sábado 14 de noviembre". */
function _fechaLarga(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return '';
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const anio = a !== new Date().getFullYear() ? ` de ${a}` : '';
  return `${_DIAS[fecha.getDay()]} ${d} de ${_MESES[m - 1]}${anio}`;
}

const _oculto = () => S.config?.ocultarSaldo === true;
const _plata = (n) => (_oculto() ? SALDO_MASCARA_CUENTA : f(n));
const _cupo = (t) => Math.max((Number(t.cupoTotal) || 0) - (Number(t.saldoTotal) || 0), 0);

// ── HTML ─────────────────────────────────────────────────────────

/** Etapa 1: el monto, los frecuentes y el teclado de Finko. */
function _htmlMonto({ sugerencias }) {
  const frecuentes = sugerencias ? gastosFrecuentes(S.gastos ?? [], hoy()) : [];
  const riel = frecuentes.length === 0 ? '' : `
      <div class="riel-chips" role="group" aria-label="Repetir un gasto frecuente">
        ${frecuentes.map(gr => {
    const nombre = gr.descripcion || gr.categoria;
    return `
        <button type="button" class="gastos-frecuentes__chip"
                data-action="gastos-repetir-frecuente"
                data-categoria="${_esc(gr.categoria)}"
                data-monto="${gr.monto}"
                data-cuenta-id="${_esc(gr.cuentaId ?? '')}"
                aria-label="Repetir ${_esc(nombre)} de ${f(gr.monto)}">
          <svg class="icon" aria-hidden="true"><use href="#i-recurring"/></svg>
          <span class="gastos-frecuentes__nombre">${_esc(nombre)}</span>
          <span class="gastos-frecuentes__monto">${f(gr.monto)}</span>
        </button>`;
  }).join('')}
      </div>`;

  return `
    <section class="etapa-gasto etapa-gasto--monto" data-etapa="monto" aria-labelledby="gasto-monto-q">
      <div class="pmonto form-group">
        <label class="pmonto__q" id="gasto-monto-q" for="gasto-monto" tabindex="-1" data-etapa-foco>¿Cuánto gastaste?</label>
        <span class="pmonto__v">
          <span class="pmonto__signo" aria-hidden="true">$</span>
          <span class="pmonto__caja" data-valor="0">
            <input id="gasto-monto" name="monto" class="pmonto__in" type="text" placeholder="0" size="1"
                   required aria-required="true" autocomplete="off" inputmode="none"
                   enterkeyhint="next" aria-describedby="gasto-monto-lee" data-miles />
          </span>
        </span>
        <p class="pmonto__lee" id="gasto-monto-lee" aria-live="polite"></p>
      </div>
      ${riel}
      <div class="kp-zona" data-kp-zona>${htmlTecladoFinko()}</div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-primary" data-gasto-seguir="monto">Continuar${icon('arrow-right')}</button>
      </div>
    </section>`;
}

/** Etapa 2: ¿en qué fue?, en tejas. */
function _htmlCategoria({ categoriaFija }) {
  if (categoriaFija) return '';
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const nombres = ordenarCategoriasPorUso(
    [...CATEGORIAS_GASTO_USUARIO, ...personalizadas.map(c => c.nombre)],
    S.gastos ?? [],
  );
  const teja = (valor, etiqueta, simbolo, mas = false) => `
        <label class="teja-op${mas ? ' teja-op--mas' : ''}">
          <input type="radio" name="categoria" value="${_esc(valor)}" />
          <span class="teja-op__teja" aria-hidden="true">${iconoCategoria(simbolo)}</span>
          <span class="teja-op__t">${_esc(etiqueta)}</span>
        </label>`;
  return `
    <section class="etapa-gasto" data-etapa="categoria" aria-labelledby="gasto-cat-q" hidden>
      <div class="preg">
        <h3 class="preg__t" id="gasto-cat-q" tabindex="-1" data-etapa-foco>¿En qué fue?</h3>
        <p class="preg__s">Las que más usas van primero. Al tocar una, sigues.</p>
        <div class="tejas" role="radiogroup" aria-labelledby="gasto-cat-q">
          ${nombres.map(n => teja(n, n, iconoDeCategoriaGasto(n, personalizadas))).join('')}
          ${teja(CATEGORIA_NUEVA_VALUE, 'Otra categoría', 'i-plus', true)}
        </div>
      </div>
      <div class="form-group" id="categoria-nueva-fields" hidden>
        <label for="categoria-nueva-nombre" class="label">¿Cómo se llama?</label>
        <input id="categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio" autocomplete="off" enterkeyhint="done" />
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>
      <div class="modal__footer modal__footer--principal" data-gasto-pie-nueva hidden>
        <button type="button" class="btn btn-primary" data-gasto-seguir="categoria">Continuar${icon('arrow-right')}</button>
      </div>
    </section>`;
}

/** Una fila del recibo: rótulo, valor y lo que abre. */
function _fila({ id, mini, figura, k, v = '', s = '', vacia = false, oculta = false }) {
  return `
        <button type="button" class="recibo__fila${vacia ? ' recibo__fila--vacia' : ''}"${id ? ` id="${id}"` : ''} data-mini="${mini}"${oculta ? ' hidden' : ''}>
          <span class="recibo__figura" data-fila-figura>${figura}</span>
          <span class="recibo__txt">
            <span class="recibo__k">${k}</span>
            <span class="recibo__v" data-fila-v>${v}</span>
            <span class="recibo__s" data-fila-s>${s}</span>
          </span>
          <svg class="icon recibo__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>`;
}

/** Etapa 3: el recibo, que es también el formulario. */
function _htmlRevisar({ edicion }) {
  return `
    <section class="etapa-gasto" data-etapa="revisar" aria-labelledby="gasto-recibo-t" hidden>
      <h3 class="sr-only" id="gasto-recibo-t" tabindex="-1" data-etapa-foco>Revisa el gasto antes de guardarlo</h3>
      <div class="recibo">
        <button type="button" class="recibo__cab" data-gasto-ir="monto" aria-label="Cambiar el monto o la categoría">
          <span class="recibo__teja" aria-hidden="true" data-recibo-teja></span>
          <span class="recibo__monto" data-recibo-monto></span>
          <span class="recibo__cat" data-recibo-cat></span>
          <span class="recibo__lee" data-recibo-lee></span>
        </button>
        ${_fila({ id: 'gasto-fila-cuenta', mini: 'gasto-mini-cuenta', figura: '', k: 'Sale de' })}
        ${_fila({ id: 'grupo-gasto-cuotas', mini: 'gasto-mini-cuotas', figura: `<span class="recibo__icono">${icon('deudas')}</span>`, k: 'Cuotas', oculta: true })}
        ${_fila({ id: 'gasto-fila-fecha', mini: 'gasto-mini-fecha', figura: `<span class="recibo__icono">${icon('agenda')}</span>`, k: 'Fecha' })}
        ${_fila({ id: 'gasto-fila-nota', mini: 'gasto-mini-nota', figura: `<span class="recibo__icono">${icon('edit')}</span>`, k: 'Nota <span class="form-optional">Opcional</span>', vacia: true })}
      </div>
      <div class="recibo-extra" id="grupo-gasto-avance" hidden>
        <label class="recibo-interruptor">
          <span class="recibo-interruptor__t">Fue un avance en efectivo</span>
          <span class="toggle"><input type="checkbox" name="avanceTC" value="1" role="switch" /><span class="toggle__track" aria-hidden="true"></span></span>
        </label>
        <p class="aviso-ambar" id="gasto-avance-nudge" hidden>${icon('alert')}<span>Un avance cobra intereses desde el mismo día que lo retiras: no tiene los días sin intereses de una compra, y casi siempre suma un cobro fijo por el retiro.</span></p>
      </div>
      <p class="aviso-ambar" id="gasto-sobrecupo-nudge" aria-live="polite" hidden></p>
      <div id="gasto-aviso-saldo" hidden></div>
      <p class="recibo__ayuda">Toca cualquier dato para cambiarlo.</p>
      <div class="modal__footer modal__footer--principal recibo__pie">
        <button type="submit" class="btn btn-primary">${icon('check-circle')} ${edicion ? 'Guardar cambios' : 'Guardar gasto'}</button>
        ${edicion ? '' : '<button type="button" class="btn btn-ghost recibo__otro" data-gasto-otro>Guardar y registrar otro</button>'}
      </div>
    </section>`;
}

/** El desplegable de Finko con las cuentas y las tarjetas (051 D4). */
function _htmlMiniCuenta({ cuentas, tarjetas, sel }) {
  const fila = (valor, figura, nombre, sub) => `
          <label class="desplegable__f">
            <input type="radio" name="cuentaId" value="${_esc(valor)}"${valor === sel ? ' checked' : ''} />
            ${figura}
            <span class="desplegable__txt"><span class="desplegable__t">${_esc(nombre)}</span><span class="desplegable__s">${sub}</span></span>
            <span class="desplegable__ok" aria-hidden="true"></span>
          </label>`;
  const filasCuentas = cuentas.map(c => fila(c.id, bancoAvatar(c.banco, c.icono), c.nombre, `${_plata(c.saldo ?? 0)} disponibles`)).join('');
  const filasTarjetas = tarjetas.length === 0 ? '' : `
          <p class="desplegable__grupo">Tarjetas de crédito</p>
          ${tarjetas.map(t => fila(TARJETA_PREFIJO + t.id, tejaTarjeta(t), t.descripcion, `Cupo disponible ${_plata(_cupo(t))} · te pregunta a cuántas cuotas`)).join('')}`;
  return htmlMiniHoja({
    id: 'gasto-mini-cuenta',
    titulo: tarjetas.length > 0 ? '¿Con qué pagaste?' : '¿De qué cuenta sale?',
    cuerpo: `
        <div class="desplegable" role="radiogroup" aria-labelledby="gasto-mini-cuenta-t">
          ${tarjetas.length > 0 ? '<p class="desplegable__grupo">Tus cuentas</p>' : ''}
          ${filasCuentas}${filasTarjetas}
        </div>
        <p class="mini-hoja__ayuda">Al tocar una, vuelves al recibo.</p>`,
  });
}

function _htmlMiniCuotas() {
  return htmlMiniHoja({
    id: 'gasto-mini-cuotas',
    titulo: '¿A cuántas cuotas?',
    cuerpo: `
        <div class="fecha-chips" role="radiogroup" aria-labelledby="gasto-mini-cuotas-t">
          ${_CUOTAS.map(n => `
          <label class="chip-fecha">
            <input type="radio" name="cuotas" class="chip-cat__radio" value="${n}"${n === 1 ? ' checked' : ''} />
            ${n === 1 ? '1 cuota' : `${n} cuotas`}
          </label>`).join('')}
        </div>`,
  });
}

function _htmlMiniFecha() {
  const chip = (valor, etiqueta, checked) => `
          <label class="chip-fecha">
            <input type="radio" name="fechaOpcion" class="chip-cat__radio" value="${valor}"${checked ? ' checked' : ''} />
            ${etiqueta}
          </label>`;
  return htmlMiniHoja({
    id: 'gasto-mini-fecha',
    titulo: '¿Cuándo fue?',
    cuerpo: `
        <div class="fecha-chips" role="radiogroup" aria-labelledby="gasto-mini-fecha-t">
          ${chip('hoy', 'Hoy', true)}${chip('ayer', 'Ayer', false)}${chip('otra', 'Otra fecha', false)}
        </div>
        <input type="hidden" id="gasto-fecha" name="fecha" value="${hoy()}" />
        <div id="gasto-fecha-otra" hidden>${htmlCalendario({ id: 'gasto-calendario' })}</div>`,
  });
}

function _htmlMiniNota() {
  return htmlMiniHoja({
    id: 'gasto-mini-nota',
    titulo: 'Nota',
    cuerpo: `
        <label for="gasto-nota" class="sr-only">Nota del gasto</label>
        <input id="gasto-nota" name="nota" class="input" type="text" placeholder="Ej.: almuerzo con el equipo"
               autocomplete="off" enterkeyhint="done" data-gasto-nota />`,
    pie: '<button type="button" class="btn btn-primary" data-mini-cerrar>Listo</button>',
  });
}

/**
 * El formulario de gasto del teléfono. Mismo contrato que `renderFormGasto`
 * (sin cuentas lo resuelve el caller con el vacío de siempre).
 *
 * @param {{ sugerencias?: boolean, categoriaFija?: string|null, edicion?: boolean }} [opciones]
 * @returns {string}
 */
export function renderFormGastoTelefono({ sugerencias = true, categoriaFija = null, edicion = false } = {}) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const tarjetas = categoriaFija ? [] : tarjetasDeCredito(S.compromisos);
  const sel = cuentaHabitual(cuentas, S.gastos ?? []);
  const etapas = [['monto', 'Monto'], ...(categoriaFija ? [] : [['categoria', 'Categoría']]), ['revisar', 'Revisar']];
  // BUG-038: el pago de un compromiso conserva su categoría; va oculta.
  const fija = categoriaFija
    ? `<input type="radio" name="categoria" value="${_esc(categoriaFija)}" checked hidden />`
    : '';
  return `
    <form id="form-gasto" class="form-etapas" novalidate data-etapas>
      ${fija}
      <ol class="etapas" aria-label="Etapas">
        ${etapas.map(([id, t]) => `<li class="etapa" data-etapa-de="${id}">${t}</li>`).join('')}
      </ol>
      ${_htmlMonto({ sugerencias })}
      ${_htmlCategoria({ categoriaFija })}
      ${_htmlRevisar({ edicion })}
      ${_htmlMiniCuenta({ cuentas, tarjetas, sel })}
      ${_htmlMiniCuotas()}
      ${_htmlMiniFecha()}
      ${_htmlMiniNota()}
    </form>`;
}

// ── DOM ──────────────────────────────────────────────────────────

/** Lo que cada formulario montado sabe hacer, para que index.js lo pida. */
const _controles = new WeakMap();

/**
 * Lleva el formulario a una etapa ('monto' | 'categoria' | 'revisar').
 * No hace nada si el formulario no va por etapas (escritorio).
 *
 * @param {HTMLFormElement | null} form
 * @param {string} etapa
 */
export function irAEtapaGasto(form, etapa) {
  _controles.get(form)?.irA(etapa);
}

/** Vuelve a pintar el recibo (tras prellenar desde afuera). */
export function pintarReciboGasto(form) {
  _controles.get(form)?.pintar();
}

/**
 * Devuelve la cabecera de la hoja a la de escritorio: sin "Volver" ni monto.
 * @param {HTMLElement | null} overlay
 */
export function limpiarCabeceraGasto(overlay) {
  overlay?.querySelector('[data-gasto-atras]')?.remove();
  overlay?.querySelector('.modal__header')?.removeAttribute('data-etapa-cab');
}

/**
 * Conecta las etapas, el teclado de Finko, el recibo y sus mini-hojas.
 *
 * @param {HTMLFormElement} form
 * @param {{ titulo: string, etapa?: string }} opciones `titulo`: el de la
 *   hoja en la primera etapa ("Nuevo gasto", "Editar gasto"...).
 */
export function montarFormGastoTelefono(form, { titulo, etapa = 'monto' }) {
  const overlay = form.closest('.modal-overlay');
  const cab = overlay?.querySelector('.modal__header');
  const tituloEl = overlay?.querySelector('.modal__title');
  const cuerpo = form.closest('.modal__body');
  const monto = form.querySelector('#gasto-monto');
  const caja = form.querySelector('.pmonto__caja');
  const pmonto = form.querySelector('.pmonto');
  const fechaInput = form.querySelector('#gasto-fecha');
  const etapas = [...form.querySelectorAll('[data-etapa]')].map(s => s.dataset.etapa);
  const tieneCategoria = etapas.includes('categoria');
  let actual = 'monto';

  // Cabecera: "Volver" a la izquierda en las etapas 2 y 3.
  let atras = cab?.querySelector('[data-gasto-atras]');
  if (cab && !atras) {
    cab.insertAdjacentHTML('afterbegin', `<button type="button" class="btn btn-icon btn-ghost modal__atras" data-gasto-atras aria-label="Volver" hidden>${icon('arrow-left')}</button>`);
    atras = cab.querySelector('[data-gasto-atras]');
  }

  const valorMonto = () => desdeMiles(monto.value) ?? 0;
  const categoria = () => form.querySelector('input[name="categoria"]:checked')?.value ?? '';
  const anterior = (e) => etapas[Math.max(0, etapas.indexOf(e) - 1)];

  const pintarMonto = () => {
    caja.dataset.valor = monto.value || '0';
    pmonto.classList.toggle('pmonto--vacio', !monto.value);
    pmonto.classList.toggle('pmonto--largo', monto.value.length > 9);
  };

  const pintarCabecera = () => {
    if (!tituloEl) return;
    const sub = actual === 'categoria' && valorMonto() > 0
      ? `<span class="modal__titulo-sub">${f(valorMonto())}</span>` : '';
    const texto = actual === 'revisar' && titulo === 'Nuevo gasto' ? 'Revisa tu gasto' : titulo;
    tituloEl.innerHTML = `${_esc(texto)}${sub}`;
    if (atras) {
      atras.hidden = actual === 'monto';
      atras.setAttribute('aria-label', actual === 'revisar' && tieneCategoria ? 'Volver a la categoría' : 'Volver al monto');
    }
    cab?.setAttribute('data-etapa-cab', actual);
  };

  const pintar = () => {
    pintarMonto();
    _pintarRecibo(form);
  };

  const irA = (etapa, { foco = true } = {}) => {
    if (!etapas.includes(etapa)) return;
    actual = etapa;
    form.dataset.etapaActual = etapa;
    for (const s of form.querySelectorAll('[data-etapa]')) s.hidden = s.dataset.etapa !== etapa;
    const i = etapas.indexOf(etapa);
    for (const li of form.querySelectorAll('.etapa')) {
      const j = etapas.indexOf(li.dataset.etapaDe);
      li.classList.toggle('etapa--hecha', j < i);
      li.classList.toggle('etapa--on', j === i);
      if (j === i) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    }
    if (etapa === 'revisar') pintar();
    pintarCabecera();
    if (cuerpo) cuerpo.scrollTop = 0;
    if (foco) form.querySelector(`[data-etapa="${etapa}"] [data-etapa-foco]`)?.focus({ preventScroll: true });
  };

  const seguirDesdeMonto = () => {
    if (!(valorMonto() > 0)) {
      mostrarErroresForm(form, ['Escribe cuánto fue. Por ejemplo: 45.000']);
      return;
    }
    // Desde el monto se pasa por la categoría (se puede cambiar; tocar la
    // misma teja sigue). Un pago de compromiso no tiene esa etapa.
    irA(tieneCategoria ? 'categoria' : 'revisar');
  };

  const seguirDesdeCategoria = () => {
    if (categoria() === CATEGORIA_NUEVA_VALUE) {
      const errores = validarCategoriaPersonalizada(
        { nombre: form.querySelector('[name="categoriaNuevaNombre"]')?.value, icono: form.querySelector('[name="categoriaNuevaIcono"]')?.value },
        S.categoriasPersonalizadas ?? [],
      );
      if (errores.length > 0) { mostrarErroresForm(form, errores); return; }
    } else if (!categoria()) {
      mostrarErroresForm(form, ['Elige en qué fue el gasto.']);
      return;
    }
    irA('revisar');
  };

  // Teclado de Finko sobre el mismo campo.
  montarTecladoFinko(form.querySelector('[data-kp-zona]'), monto, form.querySelector('#gasto-monto-lee'), {
    vacio: 'Márcalo con el teclado de abajo',
  });
  monto.addEventListener('input', pintarMonto);

  // Calendario de Finko para "Otra fecha".
  const mostrarFecha = montarCalendario(form.querySelector('#gasto-calendario'), {
    valor: fechaInput?.value ?? hoy(),
    alElegir: (iso) => {
      if (fechaInput) fechaInput.value = iso;
      cerrarMiniHoja(form.querySelector('#gasto-mini-fecha'));
    },
  });

  form.addEventListener('click', (e) => {
    const seguir = e.target.closest('[data-gasto-seguir]');
    if (seguir) {
      if (seguir.dataset.gastoSeguir === 'monto') seguirDesdeMonto();
      else seguirDesdeCategoria();
      return;
    }
    const ir = e.target.closest('[data-gasto-ir]');
    if (ir) {
      irA(ir.dataset.gastoIr);
      return;
    }
    const filaMini = e.target.closest('[data-mini]');
    if (filaMini) {
      const mini = form.querySelector(`#${filaMini.dataset.mini}`);
      if (filaMini.dataset.mini === 'gasto-mini-fecha') {
        mostrarFecha(fechaInput?.value ?? hoy());
        const otra = form.querySelector('input[name="fechaOpcion"][value="otra"]')?.checked;
        const contenedor = form.querySelector('#gasto-fecha-otra');
        if (contenedor) contenedor.hidden = !otra;
      }
      abrirMiniHoja(mini, { origen: filaMini, alCerrar: pintar });
      return;
    }
    if (e.target.closest('[data-gasto-otro]')) {
      form.dataset.otro = '1';
      form.requestSubmit();
      return;
    }
    // Una teja tocada con el dedo o el mouse avanza, aunque ya estuviera
    // elegida. Con el teclado (detail 0) se elige y se sigue con Enter.
    const radio = e.target.closest('input[name="categoria"]');
    if (radio && e.detail > 0 && radio.value !== CATEGORIA_NUEVA_VALUE && actual === 'categoria') {
      irA('revisar');
    }
  });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'categoria') {
      const nueva = t.value === CATEGORIA_NUEVA_VALUE;
      const pie = form.querySelector('[data-gasto-pie-nueva]');
      if (pie) pie.hidden = !nueva;
      if (nueva) form.querySelector('#categoria-nueva-nombre')?.focus();
    }
    if (t.name === 'cuentaId' || t.name === 'cuotas') {
      cerrarMiniHoja(t.closest('.mini-hoja'));
      _pintarRecibo(form);
    }
    if (t.name === 'fechaOpcion') {
      if (t.value === 'otra') {
        form.querySelector('#gasto-calendario [aria-pressed="true"], #gasto-calendario .calf__dia--hoy')?.focus();
      } else {
        cerrarMiniHoja(t.closest('.mini-hoja'));
      }
    }
    if (t.name === 'avanceTC' || t.name === 'reparto') _pintarRecibo(form);
  });

  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.target === monto) {
      e.preventDefault();
      seguirDesdeMonto();
    } else if (e.target.name === 'categoria' && actual === 'categoria') {
      e.preventDefault();
      seguirDesdeCategoria();
    } else if (e.target.name === 'categoriaNuevaNombre') {
      e.preventDefault();
      seguirDesdeCategoria();
    } else if (e.target.matches('[data-gasto-nota]')) {
      e.preventDefault();
      cerrarMiniHoja(e.target.closest('.mini-hoja'));
    }
  });

  if (atras) {
    atras.onclick = () => {
      // Con una mini-hoja abierta la cabecera está inert; por si acaso.
      if ([...form.querySelectorAll('.mini-hoja')].some(miniHojaAbierta)) return;
      irA(anterior(actual));
    };
  }

  _controles.set(form, { irA, pintar });
  pintarMonto();
  irA(etapa, { foco: false });
}

// ── EL RECIBO ────────────────────────────────────────────────────

/**
 * Pinta el recibo desde los campos: monto y categoría arriba, la cuenta con
 * lo que le queda, las cuotas si es una tarjeta, la fecha, la nota y el
 * aviso si la cuenta no alcanza.
 * @param {HTMLFormElement} form
 */
function _pintarRecibo(form) {
  const m = desdeMiles(form.querySelector('#gasto-monto')?.value) ?? 0;
  const cat = form.querySelector('input[name="categoria"]:checked')?.value ?? '';
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const nombreNueva = form.querySelector('[name="categoriaNuevaNombre"]')?.value?.trim();
  const nombreCat = cat === CATEGORIA_NUEVA_VALUE ? (nombreNueva || 'Otra categoría') : cat;
  const simbolo = cat === CATEGORIA_NUEVA_VALUE
    ? (form.querySelector('[name="categoriaNuevaIcono"]')?.value || 'i-plus')
    : iconoDeCategoriaGasto(cat, personalizadas);

  const set = (sel, html) => { const el = form.querySelector(sel); if (el) el.innerHTML = html; };
  set('[data-recibo-teja]', iconoCategoria(simbolo));
  set('[data-recibo-monto]', _esc(f(m)));
  set('[data-recibo-cat]', _esc(nombreCat || 'Elige en qué fue'));
  set('[data-recibo-lee]', _esc(montoEnPalabras(m)));

  // Sale de.
  const origen = form.querySelector('input[name="cuentaId"]:checked')?.value ?? '';
  const filaCuenta = form.querySelector('#gasto-fila-cuenta');
  const esTarjeta = origen.startsWith(TARJETA_PREFIJO);
  const edicion = Boolean(form.dataset.id);
  let plan = null;
  if (filaCuenta) {
    const figura = filaCuenta.querySelector('[data-fila-figura]');
    const v = filaCuenta.querySelector('[data-fila-v]');
    const s = filaCuenta.querySelector('[data-fila-s]');
    if (esTarjeta) {
      const t = (S.compromisos ?? []).find(c => c.id === origen.slice(TARJETA_PREFIJO.length));
      figura.innerHTML = t ? tejaTarjeta(t) : '';
      v.textContent = t?.descripcion ?? 'Tarjeta';
      s.innerHTML = t ? `Cupo disponible <b>${_plata(Math.max(_cupo(t) - m, 0))}</b> después` : '';
    } else {
      const c = (S.cuentas ?? []).find(x => x.id === origen);
      figura.innerHTML = c ? bancoAvatar(c.banco, c.icono) : '';
      v.textContent = c?.nombre ?? 'Elige una cuenta';
      plan = c && !edicion ? planSiNoAlcanza(S.cuentas, m, c.id) : null;
      if (!c) s.textContent = '';
      else if (plan) s.innerHTML = `Tienes <b>${_plata(c.saldo ?? 0)}</b>`;
      else s.innerHTML = `Te quedan <b>${_plata((c.saldo ?? 0) - (edicion ? 0 : m))}</b>`;
    }
    filaCuenta.classList.toggle('recibo__fila--alerta', Boolean(plan));
  }

  // Cuotas (solo con tarjeta: index.js muestra u oculta la fila).
  const cuotas = Number(form.querySelector('input[name="cuotas"]:checked')?.value) || 1;
  const filaCuotas = form.querySelector('#grupo-gasto-cuotas');
  if (filaCuotas) filaCuotas.querySelector('[data-fila-v]').textContent = cuotas === 1 ? '1 cuota' : `${cuotas} cuotas`;

  // Fecha.
  const fecha = form.querySelector('#gasto-fecha')?.value ?? '';
  const filaFecha = form.querySelector('#gasto-fila-fecha');
  if (filaFecha) {
    const etiqueta = fecha === hoy() ? 'Hoy' : (fecha === ayerIso() ? 'Ayer' : _fechaLarga(fecha));
    filaFecha.querySelector('[data-fila-v]').textContent = etiqueta;
    filaFecha.querySelector('[data-fila-s]').textContent = etiqueta === _fechaLarga(fecha) ? '' : _fechaLarga(fecha);
  }

  // Nota.
  const nota = form.querySelector('[name="nota"]')?.value?.trim() ?? '';
  const filaNota = form.querySelector('#gasto-fila-nota');
  if (filaNota) {
    filaNota.querySelector('[data-fila-v]').textContent = nota || 'Agregar una nota';
    filaNota.classList.toggle('recibo__fila--vacia', !nota);
  }

  _pintarAvisoSaldo(form, plan, m);
}

/**
 * El aviso ámbar cuando la cuenta no alcanza (ADR 142 D9): dice cuánto falta
 * y ofrece cómo completarlo, con la primera opción elegida. Sin cómo
 * completar, dice en cuánto queda la cuenta.
 */
function _pintarAvisoSaldo(form, plan, m) {
  const caja = form.querySelector('#gasto-aviso-saldo');
  if (!caja) return;
  if (!plan) { caja.hidden = true; caja.innerHTML = ''; return; }

  const previo = form.querySelector('input[name="reparto"]:checked')?.value ?? '';
  const nombre = _esc(plan.cuenta.nombre);
  const opciones = [];
  if (plan.completar) {
    const partes = plan.completar.splits.map(sp => {
      const c = (S.cuentas ?? []).find(x => x.id === sp.cuentaId);
      return `${_plata(sp.monto)} de ${_esc(c?.nombre ?? '')}`;
    });
    opciones.push({
      valor: 'completar',
      t: `Completar con ${_esc(plan.completar.otras.join(' y '))}`,
      s: partes.join(' y '),
    });
  }
  if (plan.todo) {
    opciones.push({
      valor: 'todo',
      t: `Pagar todo con ${_esc(plan.todo.nombre)}`,
      s: `A ${_esc(plan.todo.nombre)} le quedarían ${_plata(plan.todo.queda)}`,
    });
  }
  const elegida = opciones.some(o => o.valor === previo) ? previo : opciones[0]?.valor;

  const texto = opciones.length > 0
    ? (_oculto()
      ? `${nombre} no alcanza para ${_plata(m)}. ¿Cómo lo completas?`
      : `En ${nombre} tienes <b>${f(Math.max(0, plan.cuenta.saldo))}</b>: faltan <b>${f(plan.falta)}</b>. ¿Cómo lo completas?`)
    : (_oculto()
      ? `${nombre} no alcanza para este gasto: queda en negativo.`
      : `${nombre} tiene <b>${f(plan.cuenta.saldo)}</b>: con este gasto queda en <b>${f(plan.cuenta.saldo - m)}</b>.`);

  caja.hidden = false;
  caja.innerHTML = `
      <p class="aviso-ambar" role="status">${icon('alert')}<span>${texto}</span></p>
      ${opciones.length === 0 ? '' : `
      <div class="reparto" role="radiogroup" aria-label="Cómo completar el pago">
        ${opciones.map(o => `
        <label class="reparto__op">
          <input type="radio" name="reparto" value="${o.valor}"${o.valor === elegida ? ' checked' : ''} />
          <span class="reparto__punto" aria-hidden="true"></span>
          <span class="reparto__txt"><span class="reparto__t">${o.t}</span><span class="reparto__s">${o.s}</span></span>
        </label>`).join('')}
      </div>`}`;
}

/**
 * Cómo repartir el gasto según lo que la persona eligió en el recibo. Lo usa
 * `_guardarGasto` en lugar del diálogo "¿Desde qué cuentas?".
 *
 * @param {HTMLFormElement} form
 * @param {number} monto
 * @param {string} cuentaId
 * @returns {Array<{cuentaId: string, monto: number}>}
 */
export function repartoDelRecibo(form, monto, cuentaId) {
  const plan = planSiNoAlcanza(S.cuentas, monto, cuentaId);
  const eleccion = form.querySelector('input[name="reparto"]:checked')?.value ?? '';
  if (plan?.completar && eleccion === 'completar') return plan.completar.splits;
  if (plan?.todo && eleccion === 'todo') return [{ cuentaId: plan.todo.cuentaId, monto }];
  return [{ cuentaId, monto }];
}

/** Escribe un monto en el campo del teclado de Finko (prellenar). */
export function escribirMontoGasto(form, valor) {
  const campo = form?.querySelector('#gasto-monto');
  if (!campo) return;
  campo.value = valor ? miles(valor) : '';
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}
