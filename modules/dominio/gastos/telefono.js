/**
 * gastos/telefono.js - Registrar gasto en el teléfono (FORM.2b, ADR 142 D3 y D4).
 *
 * Bajo 1024 px el formulario deja de ser una columna de campos: es la misma
 * hoja y el mismo `<form id="form-gasto">`, con tres etapas con nombre arriba
 * (Monto · Categoría · Revisar):
 *
 * 1. **Monto** con el teclado de Finko (`ui/teclado-finko.js`), sin la salida
 *    al teclado del teléfono (GAS.3, ADR 156 D4). Un gasto frecuente (TX.12)
 *    salta directo al recibo con todo puesto.
 * 2. **Categoría.** Todas en tejas de dos columnas, las que más usas primero
 *    (042 D2: ninguna escondida), con el nombre entero. Tocar una avanza.
 * 3. **Recibo.** La categoría y el monto arriba, una sola vez; debajo, filas
 *    de rótulo y valor: "¿En qué fue?", "Sale de" (la cuenta habitual, con lo que
 *    le queda), "Fecha" y "Nota". Cada fila abre su mini-hoja
 *    (`ui/mini-hoja.js`) con los campos reales. Si la cuenta no alcanza, un
 *    solo mensaje bajo "Sale de" y "Guardar gasto" apagado hasta elegir con
 *    qué pagar (`planSiNoAlcanza`, ADR 156 D6).
 *
 * Los nombres de los campos son los de siempre (`monto`, `categoria`,
 * `cuentaId`, `cuotas`, `avanceTC`, `fechaOpcion`, `fecha`, `nota`), así
 * `validarGasto`, `normalizarGasto` y `_guardarGasto` no cambian. Los ids que lee `index.js`
 * (`#categoria-nueva-fields`, `#gasto-fecha`, `#gasto-fecha-otra`,
 * `#grupo-gasto-cuotas`, `#grupo-gasto-avance`...) también.
 *
 * Escritorio conserva `renderFormGasto()` (ADR 142, "Solo bajo 1024 px").
 */

import { S } from '../../core/state.js';
import {
  CATEGORIAS_GASTO_USUARIO, CATEGORIA_ILUSTRACION, ICONOS_CATEGORIA_PERSONALIZADA, TARJETA_PREFIJO, iconoDeCategoriaGasto,
} from '../../core/constants.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { miles, desdeMiles } from '../../infra/miles.js';
import { icon, iconoCategoria, isotipo } from '../../infra/icons.js';
import { bancoAvatar, bancoClase } from '../../infra/bancos.js';
import { tejaTarjeta, htmlOpcionCuenta, nombreCortoCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { SALDO_MASCARA_CUENTA, tipoDeCuenta } from '../../infra/render.js';
import { htmlTecladoFinko, montarTecladoFinko } from '../../ui/teclado-finko.js';
import { htmlMiniHoja, abrirMiniHoja, cerrarMiniHoja, miniHojaAbierta } from '../../ui/mini-hoja.js';
import { htmlCalendario, montarCalendario } from '../../ui/calendario-finko.js';
import { vigilarToques } from '../../ui/toque.js';
import {
  gastosFrecuentes, tarjetasDeCredito, ordenarCategoriasPorUso, cuentaHabitual,
  planSiNoAlcanza, validarCategoriaPersonalizada,
} from './logic.js';
import { CATEGORIA_NUEVA_VALUE, ayerIso, htmlDetalleCategoriaGasto, nombreSubcategoriaGasto } from './view.js';
import { htmlExtrasDetalleGasto } from './detalle.js';

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

/**
 * La fecha del recibo en una línea (GAS.3): "Hoy, 16 de noviembre", "Ayer,
 * 15 de noviembre" o "Sábado 14 de noviembre". Exportada para los tests.
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function fechaDelRecibo(iso) {
  const larga = _fechaLarga(iso);
  if (!larga) return '';
  const sinDia = larga.slice(larga.indexOf(' ') + 1);
  if (iso === hoy()) return `Hoy, ${sinDia}`;
  if (iso === ayerIso()) return `Ayer, ${sinDia}`;
  return larga;
}

const _oculto = () => S.config?.ocultarSaldo === true;
const _plata = (n) => (_oculto() ? SALDO_MASCARA_CUENTA : f(n));
const _cupo = (t) => Math.max((Number(t.cupoTotal) || 0) - (Number(t.saldoTotal) || 0), 0);

/**
 * Una pieza del comprobante (GAS.C): un `<symbol>` cmp-* del sprite
 * (assets/svg/comprobante/), con sus colores por rol (`--fk-cmp-*`).
 * Decorativa: quien la pinta ya dice lo que significa.
 */
const _pieza = (id, cls) => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#cmp-${id}"/></svg>`;

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
      <div class="kp-zona" data-kp-zona>${htmlTecladoFinko({ sistema: false })}</div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-primary" data-gasto-seguir="monto">Continuar${icon('arrow-right')}</button>
      </div>
    </section>`;
}

/** Etapa 2: la categoría, en tejas de dos columnas con el nombre entero. */
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
        <h3 class="preg__t" id="gasto-cat-q" tabindex="-1" data-etapa-foco>Elige la categoría en la que gastaste tu dinero</h3>
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

/**
 * Una fila del recibo (GAS.3, ADR 156 D3): el ícono de su campo (GAS.C), el
 * rótulo y el valor (con su figura, si tiene: el logo de la cuenta) y lo que
 * abre. Una fila vacía dice qué hacer ("Elegir", "Agregar") en el color de
 * la acción.
 */
function _fila({ id, mini, campo, k, vacia = false, oculta = false }) {
  return `
        <button type="button" class="recibo__fila${vacia ? ' recibo__fila--vacia' : ''}"${id ? ` id="${id}"` : ''} data-mini="${mini}"${oculta ? ' hidden' : ''}>
          <span class="recibo__icono">${_pieza(`campo-${campo}`, 'recibo__campo')}</span>
          <span class="recibo__k">${k}</span>
          <span class="recibo__figura" data-fila-figura></span>
          <span class="recibo__txt">
            <span class="recibo__v" data-fila-v></span>
            <span class="recibo__s" data-fila-s></span>
          </span>
          <svg class="icon recibo__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>`;
}

/**
 * El recibo, que es también el formulario, con forma de comprobante (GAS.C):
 * la pestaña con el carrito, "Comprobante de gasto" entre destellos, la
 * ilustración de la categoría junto al monto y la categoría (una vez cada
 * uno, ADR 156 D3; tocarlos vuelve al monto), las filas de los datos con el
 * ícono de su campo, un código de barras que solo adorna y el borde
 * troquelado (CSS). El aviso de saldo va pegado a "Sale de". Lo comparten la
 * etapa "Revisar" y la ficha.
 * @param {{ avance: string }} textos
 */
function _htmlRecibo({ avance }) {
  const opcional = '<span class="form-optional">Opcional</span>';
  return `
      <div class="comprobante">
        ${_pieza('pestana-carrito', 'comprobante__pestana')}
        <div class="recibo comprobante__papel">
          <p class="comprobante__titulo" aria-hidden="true">
            ${_pieza('decoracion-destellos', 'comprobante__destello')}
            <span>Comprobante de gasto</span>
            ${_pieza('decoracion-destellos', 'comprobante__destello comprobante__destello--der')}
          </p>
          <button type="button" class="recibo__cab" data-gasto-ir="monto" aria-label="Cambiar el monto o la categoría">
            <span class="comprobante__ilustracion" aria-hidden="true" data-recibo-teja></span>
            <span class="comprobante__cifra">
              <span class="recibo__monto" data-recibo-monto></span>
              <span class="recibo__cat" data-recibo-cat></span>
            </span>
          </button>
          ${_fila({ id: 'gasto-fila-detalle', mini: 'gasto-mini-detalle', campo: 'en-que-fue', k: `¿En qué fue? ${opcional}`, vacia: true, oculta: true })}
          ${_fila({ id: 'gasto-fila-cuenta', mini: 'gasto-mini-cuenta', campo: 'entidad', k: 'Sale de' })}
          <div class="recibo__aviso" id="gasto-aviso-saldo" role="status" hidden></div>
          ${_fila({ id: 'grupo-gasto-cuotas', mini: 'gasto-mini-cuotas', campo: 'categoria', k: 'Cuotas', oculta: true })}
          ${_fila({ id: 'gasto-fila-fecha', mini: 'gasto-mini-fecha', campo: 'fecha', k: 'Fecha' })}
          ${_fila({ id: 'gasto-fila-nota', mini: 'gasto-mini-nota', campo: 'nota', k: `Nota ${opcional}`, vacia: true })}
          ${_pieza('codigo-barras', 'comprobante__barras')}
        </div>
      </div>
      <div class="recibo-extra" id="grupo-gasto-avance" hidden>
        <label class="recibo-interruptor">
          <span class="recibo-interruptor__t">Fue un avance en efectivo</span>
          <span class="toggle"><input type="checkbox" name="avanceTC" value="1" role="switch" /><span class="toggle__track" aria-hidden="true"></span></span>
        </label>
        <p class="aviso-ambar" id="gasto-avance-nudge" hidden>${icon('alert')}<span>${avance}</span></p>
      </div>
      <p class="aviso-ambar" id="gasto-sobrecupo-nudge" aria-live="polite" hidden></p>`;
}

/**
 * Etapa 3: el recibo y un solo botón, "Guardar gasto" (GAS.3, ADR 156 D7: sin
 * "Guardar y registrar otro" ni la instrucción de tocar los datos).
 */
function _htmlRevisar({ edicion, ficha }) {
  if (ficha) return _htmlFicha(ficha);
  return `
    <section class="etapa-gasto" data-etapa="revisar" aria-labelledby="gasto-recibo-t" hidden>
      <h3 class="sr-only" id="gasto-recibo-t" tabindex="-1" data-etapa-foco>Revisa el gasto antes de guardarlo</h3>
      ${_htmlRecibo({ avance: 'Un avance cobra intereses desde el mismo día que lo retiras: no tiene los días sin intereses de una compra, y casi siempre suma un cobro fijo por el retiro.' })}
      <div class="modal__footer modal__footer--principal recibo__pie">
        ${_pieza('decoracion-hojas', 'recibo__pie-hojas')}${_pieza('decoracion-arbusto', 'recibo__pie-arbusto')}
        <button type="submit" class="btn btn-primary">${icon('check-circle')} ${edicion ? 'Guardar cambios' : 'Guardar gasto'}</button>
      </div>
    </section>`;
}

/**
 * La ficha editable (FORM.2d, ADR 142 D6): el mismo recibo, sin "Guardar".
 * Cada dato abre su mini-hoja y se guarda al volver, con "Deshacer" en el
 * aviso. Debajo, lo que decía la hoja del gasto y, al pie, eliminar.
 * @param {import('../../core/state.js').Gasto} gasto
 */
function _htmlFicha(gasto) {
  return `
    <section class="etapa-gasto" data-etapa="revisar" aria-labelledby="gasto-recibo-t" hidden>
      <h3 class="sr-only" id="gasto-recibo-t" tabindex="-1" data-etapa-foco>Tu gasto: toca un dato para cambiarlo</h3>
      ${_htmlRecibo({ avance: 'Un avance cobra intereses desde el mismo día que lo retiras.' })}
      <p class="recibo__ayuda">Cada cambio se guarda solo y lo puedes deshacer.</p>
      <div class="ficha__extras">${htmlExtrasDetalleGasto(gasto)}</div>
      <div class="ficha__acciones">
        <button type="button" class="btn btn-secondary" data-action="repetir-gasto" data-id="${_esc(gasto.id)}">${icon('recurring')} Repetir hoy</button>
        <button type="button" class="boton-peligro" data-action="eliminar-gasto" data-id="${_esc(gasto.id)}">Eliminar este gasto</button>
      </div>
      <button type="submit" hidden>Guardar cambios</button>
    </section>`;
}

/**
 * "¿Con qué pagaste?" (GAS.3, ADR 156 D5): las filas de "¿Desde qué cuenta
 * pagas?" de Inicio (`htmlOpcionCuenta`), con el logo, la entidad, el tipo y
 * el saldo, y las tarjetas en su grupo con el cupo disponible (051 D4).
 * Elegir una vuelve al recibo.
 */
function _htmlMiniCuenta({ cuentas, tarjetas, sel }) {
  const grupo = (id, titulo, filas, { oculto = false } = {}) => `
        <p class="desplegable__grupo${oculto ? ' sr-only' : ''}" id="${id}">${titulo}</p>
        <div class="cuenta-pago__lista" role="radiogroup" aria-labelledby="${id}">${filas}
        </div>`;
  const filasCuentas = cuentas
    .map(c => htmlOpcionCuenta(c, { marcada: c.id === sel, saldo: _plata(c.saldo ?? 0) })).join('');
  const filasTarjetas = tarjetas
    .map(t => htmlOpcionCuenta(t, { tarjeta: true, marcada: TARJETA_PREFIJO + t.id === sel, saldo: _plata(_cupo(t)) })).join('');
  return htmlMiniHoja({
    id: 'gasto-mini-cuenta',
    titulo: tarjetas.length > 0 ? '¿Con qué pagaste?' : '¿De qué cuenta sale?',
    cuerpo: grupo('gasto-cuentas-g', 'Tus cuentas', filasCuentas, { oculto: tarjetas.length === 0 })
      + (tarjetas.length > 0 ? grupo('gasto-tarjetas-g', 'Tarjetas de crédito', filasTarjetas) : ''),
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
        <div class="fecha-chips fecha-chips--seg" role="radiogroup" aria-labelledby="gasto-mini-fecha-t">
          ${chip('hoy', 'Hoy', true)}${chip('ayer', 'Ayer', false)}${chip('otra', 'Otra fecha', false)}
        </div>
        <input type="hidden" id="gasto-fecha" name="fecha" value="${hoy()}" />
        <div class="fecha-otra-cal" id="gasto-fecha-otra" hidden>${htmlCalendario({ id: 'gasto-calendario' })}</div>`,
  });
}

/**
 * SUS.2a (ADR 147 D5): la subcategoría o la pregunta "¿gusto o necesidad?"
 * viven en una mini-hoja, como la nota: tocar una categoría sigue llevando
 * directo al recibo (ADR 142 D4) y esto se agrega solo si se quiere. El
 * título lo ajusta `_pintarRecibo` según lo que toque preguntar.
 */
function _htmlMiniDetalle() {
  return htmlMiniHoja({
    id: 'gasto-mini-detalle',
    titulo: '¿Qué fue?',
    sub: '',
    cuerpo: htmlDetalleCategoriaGasto(),
  });
}

function _htmlMiniNota() {
  return htmlMiniHoja({
    id: 'gasto-mini-nota',
    titulo: 'Nota',
    sub: 'Lo que escribas aparece en tu lista de gastos.',
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
 * @param {{ sugerencias?: boolean, categoriaFija?: string|null, edicion?: boolean, ficha?: object|null }} [opciones]
 *   `ficha`: el gasto que se corrige (FORM.2d); el formulario es su ficha.
 * @returns {string}
 */
export function renderFormGastoTelefono({ sugerencias = true, categoriaFija = null, edicion = false, ficha = null } = {}) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const tarjetas = categoriaFija ? [] : tarjetasDeCredito(S.compromisos);
  const sel = cuentaHabitual(cuentas, S.gastos ?? []);
  const etapas = [['monto', 'Monto'], ...(categoriaFija ? [] : [['categoria', 'Categoría']]), ['revisar', 'Revisar']];
  // BUG-038: el pago de un compromiso conserva su categoría; va oculta.
  const fija = categoriaFija
    ? `<input type="radio" name="categoria" value="${_esc(categoriaFija)}" checked hidden />`
    : '';
  return `
    <form id="form-gasto" class="form-etapas" novalidate data-etapas${ficha ? ' data-ficha' : ''}>
      ${fija}
      <ol class="etapas" aria-label="Etapas">
        ${etapas.map(([id, t]) => `<li class="etapa" data-etapa-de="${id}">${t}</li>`).join('')}
      </ol>
      ${_htmlMonto({ sugerencias })}
      ${_htmlCategoria({ categoriaFija })}
      ${_htmlRevisar({ edicion, ficha })}
      ${_htmlMiniCuenta({ cuentas, tarjetas, sel })}
      ${_htmlMiniCuotas()}
      ${_htmlMiniFecha()}
      ${_htmlMiniNota()}
      ${categoriaFija ? '' : _htmlMiniDetalle()}
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
 * Devuelve la cabecera de la hoja a la de escritorio: sin "Volver", monto,
 * isotipo ni hojas.
 * @param {HTMLElement | null} overlay
 */
export function limpiarCabeceraGasto(overlay) {
  overlay?.querySelectorAll('[data-gasto-atras], [data-gasto-marca], [data-gasto-hojas]').forEach(el => el.remove());
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
  // El comprobante lleva la cabecera bosque con el isotipo al centro y
  // hojas en los extremos (GAS.C).
  let marca = cab?.querySelector('[data-gasto-marca]');
  if (cab && tituloEl && !marca) {
    tituloEl.insertAdjacentHTML('beforebegin', `<span class="modal__marca" data-gasto-marca hidden>${isotipo()}</span>`);
    cab.insertAdjacentHTML('beforeend', `<span class="modal__hojas" data-gasto-hojas hidden>${_pieza('decoracion-hojas', 'modal__hoja')}${_pieza('decoracion-hojas', 'modal__hoja modal__hoja--der')}</span>`);
    marca = cab.querySelector('[data-gasto-marca]');
  }
  const hojas = cab?.querySelector('[data-gasto-hojas]');

  const valorMonto = () => desdeMiles(monto.value) ?? 0;
  const categoria = () => form.querySelector('input[name="categoria"]:checked')?.value ?? '';
  const anterior = (e) => etapas[Math.max(0, etapas.indexOf(e) - 1)];

  const pintarMonto = () => {
    caja.dataset.valor = monto.value || '0';
    pmonto.classList.toggle('pmonto--vacio', !monto.value);
    pmonto.classList.toggle('pmonto--largo', monto.value.length > 9);
  };

  const esFicha = 'ficha' in form.dataset;
  const pintarCabecera = () => {
    if (!tituloEl) return;
    if (marca) marca.hidden = actual !== 'revisar';
    if (hojas) hojas.hidden = actual !== 'revisar';
    if (esFicha && actual === 'revisar') {
      tituloEl.textContent = 'Gasto';
      if (atras) atras.hidden = true;
      cab?.setAttribute('data-etapa-cab', actual);
      return;
    }
    const sub = actual === 'categoria' && valorMonto() > 0
      ? `<span class="modal__titulo-sub">${f(valorMonto())}</span>` : '';
    const texto = actual === 'revisar' && titulo === 'Nuevo gasto' ? 'Registrar gasto' : titulo;
    tituloEl.innerHTML = `${_esc(texto)}${sub}`;
    if (atras) {
      atras.hidden = actual === 'monto';
      atras.setAttribute('aria-label', actual === 'revisar' && tieneCategoria ? 'Volver a la categoría' : 'Volver al monto');
    }
    cab?.setAttribute('data-etapa-cab', actual);
  };

  // La ficha guarda sola: al volver al recibo, si algo cambió (FORM.2d).
  let firma = null;
  const firmaActual = () => JSON.stringify([...new FormData(form)]);
  const pintar = () => {
    pintarMonto();
    _pintarRecibo(form);
    if (!esFicha || actual !== 'revisar') return;
    const ahora = firmaActual();
    if (firma === null) { firma = ahora; return; }
    if (ahora === firma) return;
    firma = ahora;
    form.dataset.quedarse = '1';
    form.requestSubmit();
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
    sistema: false,
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

  const esToque = vigilarToques(form);
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
    // Una teja tocada con el dedo o el mouse avanza, aunque ya estuviera
    // elegida. Con el teclado se elige y se sigue con Enter (ui/toque.js).
    const radio = e.target.closest('input[name="categoria"]');
    if (radio && esToque(e, radio) && radio.value !== CATEGORIA_NUEVA_VALUE && actual === 'categoria') {
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
    if (t.name === 'subcategoriaId' || t.name === 'caracter') {
      cerrarMiniHoja(t.closest('.mini-hoja'));
      _pintarRecibo(form);
    }
    if (t.name === 'avanceTC') _pintarRecibo(form);
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
 * Pinta el recibo desde los campos: la categoría y el monto arriba, la
 * cuenta con lo que le queda, las cuotas si es una tarjeta, la fecha, la nota
 * y, si la cuenta no alcanza, el aviso y "Guardar gasto" apagado.
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
  // La categoría y el monto, una vez cada uno (ADR 156 D3): sin el monto en
  // letras ni la categoría repetida debajo de la cifra. Junto a ellos, la
  // ilustración de la categoría o, si no tiene, su glifo en una teja (GAS.C).
  const ilustracion = cat === CATEGORIA_NUEVA_VALUE ? null : CATEGORIA_ILUSTRACION[cat];
  set('[data-recibo-teja]', ilustracion
    ? `<svg class="comprobante__dibujo" aria-hidden="true" focusable="false"><use href="#${ilustracion}"/></svg>`
    : `<span class="comprobante__glifo">${iconoCategoria(simbolo)}</span>`);
  set('[data-recibo-cat]', _esc(nombreCat || 'Elige en qué fue'));
  set('[data-recibo-monto]', `<span class="recibo__signo">$</span>${_esc(f(m).replace(/^-?\$/, ''))}`);
  // La cifra comparte el ancho con la ilustración: baja de tamaño antes de partirse.
  const cifra = form.querySelector('[data-recibo-monto]');
  cifra?.classList.toggle('recibo__monto--largo', f(m).length > 8);
  cifra?.classList.toggle('recibo__monto--enorme', f(m).length > 11);
  const sub = nombreSubcategoriaGasto({ categoria: cat, subcategoriaId: form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')?.value });
  _pintarFilaDetalle(form, sub, { nombreCat, simbolo });

  // Sale de.
  const origen = form.querySelector('input[name="cuentaId"]:checked')?.value ?? '';
  const filaCuenta = form.querySelector('#gasto-fila-cuenta');
  const esTarjeta = origen.startsWith(TARJETA_PREFIJO);
  const edicion = Boolean(form.dataset.id);
  let plan = null;
  if (filaCuenta) {
    const figura = filaCuenta.querySelector('[data-fila-figura]');
    const k = filaCuenta.querySelector('.recibo__k');
    const v = filaCuenta.querySelector('[data-fila-v]');
    const s = filaCuenta.querySelector('[data-fila-s]');
    if (esTarjeta) {
      const t = (S.compromisos ?? []).find(c => c.id === origen.slice(TARJETA_PREFIJO.length));
      k.textContent = 'Tarjeta de crédito';
      figura.innerHTML = t ? tejaTarjeta(t) : '';
      v.textContent = t?.descripcion ?? 'Tarjeta';
      s.innerHTML = t ? `Cupo disponible <b>${_plata(Math.max(_cupo(t) - m, 0))}</b> después` : '';
    } else {
      const c = (S.cuentas ?? []).find(x => x.id === origen);
      // "Entidad bancaria": la entidad ("Bancolombia") y debajo el tipo
      // ("Cuenta de ahorros"), cada uno una vez, como en Inicio (GAS.C).
      k.textContent = c && bancoClase(c.banco) === 'efectivo' ? 'Sale de' : 'Entidad bancaria';
      figura.innerHTML = c ? bancoAvatar(c.banco, c.icono) : '';
      v.textContent = c ? nombreCortoCuenta(c) : 'Elige una cuenta';
      plan = c && !edicion ? planSiNoAlcanza(S.cuentas, m, c.id) : null;
      const tipo = c ? tipoDeCuenta(c, true) : '';
      const saldo = !c ? ''
        : plan ? `Tienes <b>${_plata(c.saldo ?? 0)}</b>`
          : `Te quedan <b>${_plata((c.saldo ?? 0) - (edicion ? 0 : m))}</b>`;
      s.innerHTML = [tipo && `<span class="recibo__tipo">${_esc(tipo)}</span>`, saldo && `<span>${saldo}</span>`]
        .filter(Boolean).join('');
    }
    filaCuenta.classList.toggle('recibo__fila--alerta', Boolean(plan));
  }

  // Cuotas (solo con tarjeta: index.js muestra u oculta la fila).
  const cuotas = Number(form.querySelector('input[name="cuotas"]:checked')?.value) || 1;
  const filaCuotas = form.querySelector('#grupo-gasto-cuotas');
  if (filaCuotas) filaCuotas.querySelector('[data-fila-v]').textContent = cuotas === 1 ? '1 cuota' : `${cuotas} cuotas`;

  // Fecha, en una línea: "Hoy, 16 de noviembre".
  const filaFecha = form.querySelector('#gasto-fila-fecha');
  if (filaFecha) filaFecha.querySelector('[data-fila-v]').textContent = fechaDelRecibo(form.querySelector('#gasto-fecha')?.value ?? '');

  // Nota.
  const nota = form.querySelector('[name="nota"]')?.value?.trim() ?? '';
  const filaNota = form.querySelector('#gasto-fila-nota');
  if (filaNota) {
    filaNota.querySelector('[data-fila-v]').textContent = nota || 'Agregar';
    filaNota.classList.toggle('recibo__fila--vacia', !nota);
  }

  _pintarAvisoSaldo(form, plan);
}

/**
 * La fila "¿Qué fue?" o "¿Gusto o necesidad?" del recibo (SUS.2a): se ve si
 * la categoría elegida tiene subcategorías o lleva la pregunta, que es lo que
 * `sincronizarDetalleCategoria` (index.js) dejó habilitado. La mini-hoja dice
 * debajo de su título de qué categoría habla (GAS.3).
 * @param {HTMLFormElement} form
 * @param {string|null} sub - nombre de la subcategoría elegida.
 * @param {{ nombreCat: string, simbolo: string }} categoria
 */
function _pintarFilaDetalle(form, sub, { nombreCat, simbolo }) {
  const fila = form.querySelector('#gasto-fila-detalle');
  if (!fila) return;
  const conSub = Boolean(form.querySelector('[data-sub-grupo]:not([disabled])'));
  const conPregunta = Boolean(form.querySelector('[data-caracter-grupo]:not([disabled])'));
  fila.hidden = !conSub && !conPregunta;
  if (fila.hidden) return;
  const respuesta = form.querySelector('[data-caracter-grupo] input[name="caracter"]:checked')?.value;
  const k = conSub ? '¿En qué fue?' : '¿Gusto o necesidad?';
  const v = conSub
    ? (sub ?? 'Elegir')
    : ({ gusto: 'Un gusto', necesidad: 'Una necesidad' }[respuesta] ?? 'Elegir');
  fila.querySelector('.recibo__k').innerHTML = `${k} <span class="form-optional">Opcional</span>`;
  fila.querySelector('[data-fila-v]').textContent = v;
  fila.classList.toggle('recibo__fila--vacia', conSub ? !sub : !respuesta);
  const titulo = form.querySelector('#gasto-mini-detalle-t');
  if (titulo) titulo.textContent = conSub ? '¿Qué fue?' : '¿Es un gusto o una necesidad?';
  const linea = form.querySelector('#gasto-mini-detalle-s');
  if (linea) {
    linea.innerHTML = `<span class="mini-hoja__cat">${iconoCategoria(simbolo)}${_esc(nombreCat)}</span> <span class="form-optional">Opcional</span>`;
    linea.hidden = !nombreCat;
  }
}

/**
 * Cuando la cuenta elegida no alcanza (GAS.3, ADR 156 D6): un solo mensaje,
 * pegado a "Sale de", con lo que falta, y "Guardar gasto" apagado hasta que
 * se elija otra cuenta que alcance o una tarjeta. Cambiar de cuenta vuelve a
 * pintar el recibo, así que el mensaje sigue a la elegida.
 * @param {HTMLFormElement} form
 * @param {ReturnType<typeof planSiNoAlcanza>} plan
 */
function _pintarAvisoSaldo(form, plan) {
  const caja = form.querySelector('#gasto-aviso-saldo');
  const guardar = form.querySelector('.recibo__pie [type="submit"]');
  if (guardar) guardar.disabled = Boolean(plan);
  if (!caja) return;
  if (!plan) { caja.hidden = true; caja.innerHTML = ''; return; }
  caja.hidden = false;
  caja.innerHTML = `<p class="cuenta-pago__falta-caja">${icon('info')}<span><strong>No tienes saldo suficiente en esta cuenta: faltan ${_plata(plan.falta)}.</strong> Elige otro método de pago para completar el gasto.</span></p>`;
}

/** Escribe un monto en el campo del teclado de Finko (prellenar). */
export function escribirMontoGasto(form, valor) {
  const campo = form?.querySelector('#gasto-monto');
  if (!campo) return;
  campo.value = valor ? miles(valor) : '';
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}
