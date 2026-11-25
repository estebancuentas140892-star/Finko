/**
 * gastos/telefono.js - Registrar gasto en el teléfono (FORM.2b, ADR 142 D3 y D4).
 *
 * Bajo 1024 px el formulario deja de ser una columna de campos: es la misma
 * hoja y el mismo `<form id="form-gasto">`, con etapas con nombre arriba
 * (Monto · Categoría · Detalle · Revisar):
 *
 * 1. **Monto** con el teclado de Finko (`ui/teclado-finko.js`), sin la salida
 *    al teclado del teléfono (GAS.3, ADR 156 D4). Un gasto frecuente (TX.12)
 *    salta directo al recibo con todo puesto.
 * 2. **Categoría.** Todas en tejas de dos columnas, las que más usas primero
 *    (042 D2: ninguna escondida), con el nombre entero. Tocar una avanza.
 * 3. **¿En qué fue?** (GAS.5c, ADR 162 D1): la subcategoría y, si lo
 *    elegido depende del día, "¿Fue una necesidad o un deseo?". Una
 *    categoría propia que ya lo dice salta al recibo.
 * 4. **Recibo.** La categoría y el monto arriba, una sola vez; debajo, filas
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
  AREAS_GASTO, ICONOS_CATEGORIA_GASTO_PROPIA, TARJETA_PREFIJO, iconoDeCategoriaGasto, tonoDeCategoria,
} from '../../core/constants.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { miles, desdeMiles } from '../../infra/miles.js';
import { icon, iconoCategoria, isotipo } from '../../infra/icons.js';
import { bancoAvatar, bancoClase } from '../../infra/bancos.js';
import { tejaTarjeta, htmlOpcionCuenta, nombreCortoCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { htmlTecladoFinko, montarTecladoFinko } from '../../ui/teclado-finko.js';
import { htmlFacturaSello, htmlFacturaBarras } from '../../ui/factura.js';
import { htmlMiniHoja, abrirMiniHoja, cerrarMiniHoja, miniHojaAbierta } from '../../ui/mini-hoja.js';
import { htmlCalendario, montarCalendario } from '../../ui/calendario-finko.js';
import { vigilarToques } from '../../ui/toque.js';
import {
  gastosFrecuentes, tarjetasDeCredito, cuentaHabitual,
  planSiNoAlcanza, validarCategoriaPersonalizada, preguntaNecesidadODeseo,
} from './logic.js';
import { CATEGORIA_NUEVA_VALUE, ayerIso, htmlDetalleCategoriaGasto, nombreSubcategoriaGasto, textosFilaGasto } from './view.js';
import { gmfDeRetiro } from '../../infra/pago-compromiso.js';
import { htmlExtrasDetalleGasto, htmlSalidaFichaGasto } from './detalle.js';
import { montosOcultos } from '../../infra/privacidad.js';
import { hormigaDelGasto, topeHormiga } from '../../infra/hormiga.js';

const MQ_MOVIL = '(max-width: 1023.98px)';

/** ¿Registrar gasto va por etapas? Solo en el teléfono y la tableta. */
export const gastoPorEtapas = () => window.matchMedia?.(MQ_MOVIL).matches === true;

const _CUOTAS = [1, 2, 3, 6, 9, 12, 18, 24];
const _DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const _MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "sáb 14 nov" (con el año si no es el de hoy). */
function _fechaCorta(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return '';
  const [a, m, d] = iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const anio = a !== new Date().getFullYear() ? ` ${a}` : '';
  return `${_DIAS[fecha.getDay()]} ${d} ${_MESES[m - 1]}${anio}`;
}

/**
 * GAS.15f: "Sáb 21 nov", la fecha de la cabecera de la ficha y de la tarjeta
 * de "¿Eliminar este gasto?". Exportada para la sección y los tests.
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function fechaCortaGasto(iso) {
  const corta = _fechaCorta(iso);
  return corta ? corta.charAt(0).toUpperCase() + corta.slice(1) : '';
}

/**
 * La fecha del recibo en una línea. GAS.15e (ADR 193 D2), como la página 3
 * del lienzo: "Hoy, sáb 21 nov", "Ayer, vie 20 nov" o "Sáb 14 nov" (antes
 * "Hoy, 21 de noviembre", GAS.3). Exportada para los tests.
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function fechaDelRecibo(iso) {
  const corta = _fechaCorta(iso);
  if (!corta) return '';
  if (iso === hoy()) return `Hoy, ${corta}`;
  if (iso === ayerIso()) return `Ayer, ${corta}`;
  return corta.charAt(0).toUpperCase() + corta.slice(1);
}

const _oculto = () => montosOcultos();
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

/**
 * Etapa 2: la categoría (GAS.10c, ADR 185 D4). Sin la instrucción de título
 * (la barra de pasos ya dice "Categoría"): las dieciséis bajo su área, en
 * dos columnas, cada ícono en el tono de su categoría; al final, sin área,
 * Otros, las propias y "Crear categoría". El orden es el del tablero, fijo:
 * el área ya ordena.
 */
function _htmlCategoria({ categoriaFija }) {
  if (categoriaFija) return '';
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const teja = (valor, etiqueta, simbolo, { mas = false, tono = null } = {}) => `
        <label class="teja-op${mas ? ' teja-op--mas' : ''}">
          <input type="radio" name="categoria" value="${_esc(valor)}" />
          <span class="teja-op__teja" aria-hidden="true"${tono ? ` style="--teja-tono:var(--fk-cat-${tono})"` : ''}>${iconoCategoria(simbolo)}</span>
          <span class="teja-op__t">${_esc(etiqueta)}</span>
        </label>`;
  const deCategoria = (n) => teja(n, n, iconoDeCategoriaGasto(n, personalizadas), { tono: tonoDeCategoria(n) });
  const areas = AREAS_GASTO.map((a, i) => `
        <p class="tejas__area" id="gasto-area-${i}">${_esc(a.nombre)}</p>
        <div class="tejas" role="radiogroup" aria-labelledby="gasto-area-${i}">
          ${a.categorias.map(deCategoria).join('')}
        </div>`).join('');
  const sueltas = ['Otros', ...personalizadas.map(c => c.nombre)];
  return `
    <section class="etapa-gasto etapa-gasto--areas" data-etapa="categoria" aria-labelledby="gasto-cat-q" hidden>
      <div class="preg">
        <h3 class="sr-only" id="gasto-cat-q" tabindex="-1" data-etapa-foco>Categoría del gasto</h3>${areas}
        <div class="tejas tejas--sueltas" role="radiogroup" aria-label="Otras categorías">
          ${sueltas.map(deCategoria).join('')}
          ${teja(CATEGORIA_NUEVA_VALUE, 'Crear categoría', 'i-plus', { mas: true })}
        </div>
      </div>
      <div class="form-group" id="categoria-nueva-fields" hidden>
        <label for="categoria-nueva-nombre" class="label">¿Cómo se llama?</label>
        <input id="categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio" autocomplete="off" enterkeyhint="done" />
        ${renderIconoPicker(ICONOS_CATEGORIA_GASTO_PROPIA, { id: 'categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>
      <div class="modal__footer modal__footer--principal" data-gasto-pie-nueva hidden>
        <button type="button" class="btn btn-primary" data-gasto-seguir="categoria">Continuar${icon('arrow-right')}</button>
      </div>
    </section>`;
}

/**
 * Una fila del recibo (GAS.3, ADR 156 D3): el ícono de su campo, el rótulo y
 * el valor (con su figura, si tiene: el logo de la cuenta) y lo que abre. Una
 * fila vacía dice qué hacer ("Elegir", "Agregar") en el color de la acción.
 * FAC.1 (ADR 180 D3): el ícono es de contorno, del sprite, como en la
 * factura; la fila de la categoría lleva el glifo de la elegida
 * (`data-recibo-teja`, lo pinta `_pintarRecibo`). GAS.10d (ADR 185 D5): en
 * la factura del gasto la flecha se ve, a la derecha de cada dato.
 */
function _fila({ id, mini, ir, simbolo, k, vacia = false, oculta = false }) {
  const abre = ir ? `data-gasto-ir="${ir}"` : `data-mini="${mini}"`;
  const ico = simbolo
    ? `<span class="recibo__icono"><svg class="icon recibo__campo" aria-hidden="true" focusable="false"><use href="#${simbolo}"/></svg></span>`
    : '<span class="recibo__icono" aria-hidden="true" data-recibo-teja></span>';
  return `
        <button type="button" class="recibo__fila${vacia ? ' recibo__fila--vacia' : ''}"${id ? ` id="${id}"` : ''} ${abre}${oculta ? ' hidden' : ''}>
          ${ico}
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
 * El recibo, que es también el formulario, con forma de factura (FAC.1, ADR
 * 180): el sello con el isotipo, el título ("Nuevo gasto" o "Gasto
 * registrado"), la cifra con "COP" (tocarla vuelve al monto), las filas de
 * los datos (la categoría, el detalle, la cuenta, las cuotas y la fecha)
 * con su ícono de contorno, la nota aparte tras una línea y un código de
 * barras que solo adorna. GAS.10d (ADR 185 D5): cabe entera en 375 x 667
 * con "Guardar gasto" a la vista; la nota es una línea con "Agregar". El marco, la franja de tres colores y los cortes
 * son CSS (`.factura`). El aviso de saldo va pegado a la cuenta. Lo comparten
 * la etapa "Revisar" y la ficha.
 * @param {{ avance: string, titulo: string, semilla: string, categoriaFija?: string|null }} textos
 */
function _htmlRecibo({ avance, titulo, semilla, categoriaFija = null }) {
  return `
      <div class="comprobante factura">
        <div class="recibo comprobante__papel factura__papel">
          ${htmlFacturaSello('Comprobante')}
          <p class="factura__titulo" data-recibo-titulo>${_esc(titulo)}</p>
          <button type="button" class="recibo__cab factura__cifra" data-gasto-ir="monto">
            <span class="recibo__monto" data-recibo-monto></span>
            <span class="factura__moneda">COP</span>
            <span class="sr-only">. Cambiar el monto</span>
          </button>
          <div class="factura__filas">
            ${_fila({ id: 'gasto-fila-categoria', ir: categoriaFija ? 'monto' : 'categoria', simbolo: null, k: 'Categoría' })}
            ${_fila({ id: 'gasto-fila-detalle', ir: 'detalle', simbolo: 'c-etiqueta', k: 'Detalle', vacia: true, oculta: true })}
            ${_fila({ id: 'gasto-fila-cuenta', mini: 'gasto-mini-cuenta', simbolo: 'i-cuentas', k: 'Pagado con' })}
            <div class="recibo__aviso" id="gasto-aviso-saldo" role="status" hidden></div>
            ${_fila({ id: 'grupo-gasto-cuotas', mini: 'gasto-mini-cuotas', simbolo: 'i-recurring', k: 'Cuotas', oculta: true })}
            ${_fila({ id: 'gasto-fila-fecha', mini: 'gasto-mini-fecha', simbolo: 'i-agenda', k: 'Fecha' })}
          </div>
          <div class="factura__filas factura__filas--nota">
            <button type="button" class="recibo__fila recibo__fila--nota recibo__fila--vacia" id="gasto-fila-nota" data-mini="gasto-mini-nota">
              <span class="recibo__icono"><svg class="icon recibo__campo" aria-hidden="true" focusable="false"><use href="#i-nota"/></svg></span>
              <span class="recibo__k">Nota</span>
              <span class="recibo__v" data-fila-v>Opcional</span>
              <span class="recibo__agregar" data-fila-accion></span>
            </button>
          </div>
          <p class="recibo__hormiga" id="gasto-hormiga" hidden><svg class="icon" aria-hidden="true"><use href="#c-hormiga"/></svg><span data-hormiga-texto></span></p>
          ${htmlFacturaBarras(semilla)}
        </div>
      </div>
      <div class="recibo-extra" id="grupo-gasto-avance" hidden>
        <label class="recibo-interruptor">
          <span class="recibo-interruptor__t">Lo pagué con un avance</span>
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
function _htmlRevisar({ edicion, ficha, categoriaFija = null }) {
  if (ficha) return _htmlFicha(ficha, { categoriaFija });
  return `
    <section class="etapa-gasto" data-etapa="revisar" aria-labelledby="gasto-recibo-t" hidden>
      <h3 class="sr-only" id="gasto-recibo-t" tabindex="-1" data-etapa-foco>Revisa el gasto antes de guardarlo</h3>
      ${_htmlRecibo({ titulo: edicion ? 'Gasto registrado' : 'Revisa tu gasto', semilla: edicion ? 'editar' : 'nuevo', categoriaFija, avance: 'Un avance cobra intereses desde el mismo día: no tiene los días sin intereses de una compra, y casi siempre suma un cobro fijo. Si el dinero llegó a tu cuenta o lo sacaste en efectivo, regístralo en la tarjeta, con Sacar un avance.' })}
      <div class="modal__footer modal__footer--principal recibo__pie">
        <button type="submit" class="btn btn-primary">${icon('check')} ${edicion ? 'Guardar cambios' : 'Guardar gasto'}</button>
      </div>
    </section>`;
}

/**
 * La ficha editable (FORM.2d, ADR 142 D6): el mismo recibo, sin "Guardar".
 * Cada dato abre su mini-hoja y se guarda al volver, con "Deshacer" en el
 * aviso. GAS.15f (ADR 194 D1), como el lienzo: debajo, el límite si lo hay,
 * "Repetir este gasto" a todo el ancho y la salida a Movimientos; la
 * papelera va en la cabecera.
 * @param {import('../../core/state.js').Gasto} gasto
 */
function _htmlFicha(gasto, { categoriaFija = null } = {}) {
  return `
    <section class="etapa-gasto" data-etapa="revisar" aria-labelledby="gasto-recibo-t" hidden>
      <h3 class="sr-only" id="gasto-recibo-t" tabindex="-1" data-etapa-foco>Tu gasto: toca un dato para cambiarlo</h3>
      ${_htmlRecibo({ titulo: 'Gasto registrado', semilla: String(gasto.id ?? 'gasto'), categoriaFija, avance: 'Un avance cobra intereses desde el mismo día. Si el dinero llegó a tu cuenta o en efectivo, regístralo en la tarjeta, con Sacar un avance.' })}
      <div class="ficha__extras">${htmlExtrasDetalleGasto(gasto)}</div>
      <div class="ficha__acciones">
        <button type="button" class="btn btn-secondary ficha__repetir" data-action="repetir-gasto" data-id="${_esc(gasto.id)}">${icon('recurring')} Repetir este gasto</button>
      </div>
      ${htmlSalidaFichaGasto(gasto)}
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
 * Etapa 3, "¿En qué fue?" (GAS.5c, ADR 162 D1; antes una mini-hoja
 * opcional del recibo, SUS.2a): las subcategorías de la categoría elegida
 * en una lista con "Otra cosa" al final y, cuando lo elegido depende del
 * día (Taxi, Domicilio, Otros), "¿Fue una necesidad o un deseo?" con sus
 * dos respuestas. Son los grupos de escritorio (`htmlDetalleCategoriaGasto`):
 * `sincronizarDetalleCategoria` (index.js) deja habilitado el que toca.
 * Sin subcategorías (Otros, una categoría propia) el título es la pregunta.
 */
function _htmlDetalle({ categoriaFija }) {
  if (categoriaFija) return '';
  // GAS.10c (ADR 185 D4): la pregunta va dentro de la opción elegida.
  // GAS.15e (ADR 193 D1): la teja de la categoría y "¿Qué fue?" a la vista,
  // como el lienzo (GAS.13f la había dejado solo para el lector).
  return `
    <section class="etapa-gasto etapa-gasto--detalle" data-etapa="detalle" aria-labelledby="gasto-detalle-q" hidden>
      <div class="preg">
        <div class="detalle-cab">
          <span class="detalle-cab__teja" aria-hidden="true" data-detalle-teja></span>
          <h3 class="detalle-cab__t" id="gasto-detalle-q" tabindex="-1" data-etapa-foco></h3>
        </div>
        ${htmlDetalleCategoriaGasto()}
        <span hidden data-caracter-casa></span>
      </div>
    </section>`;
}

/**
 * La nota (GAS.10d, ADR 185 D5): una hoja aparte con "Nota", el campo y
 * "Listo"; la factura no se mueve. Enter también la cierra: la nota es una
 * línea de la lista de gastos.
 */
function _htmlMiniNota() {
  return htmlMiniHoja({
    id: 'gasto-mini-nota',
    titulo: 'Nota',
    cuerpo: `
        <label for="gasto-nota" class="sr-only">Nota del gasto</label>
        <textarea id="gasto-nota" name="nota" class="input mini-nota__campo" rows="3" maxlength="140"
                  placeholder="Ej.: almuerzo con el equipo" autocomplete="off" enterkeyhint="done" data-gasto-nota></textarea>`,
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
  const etapas = [['monto', 'Monto'], ...(categoriaFija ? [] : [['categoria', 'Categoría'], ['detalle', 'Detalle']]), ['revisar', 'Revisar']];
  // BUG-038: el pago de un compromiso conserva su categoría; va oculta.
  const fija = categoriaFija
    ? `<input type="radio" name="categoria" value="${_esc(categoriaFija)}" checked hidden />`
    : '';
  return `
    <form id="form-gasto" class="form-etapas" novalidate data-etapas${ficha ? ' data-ficha' : ''}>
      ${fija}
      <ol class="etapas" aria-label="Etapas">
        ${etapas.map(([id, t]) => `<li class="etapa" data-etapa-de="${id}"><button type="button" class="etapa__b" data-gasto-ir="${id}" data-rotulo="${t}" disabled><span class="etapa__t">${t}</span></button></li>`).join('')}
      </ol>
      ${_htmlMonto({ sugerencias })}
      ${_htmlCategoria({ categoriaFija })}
      ${_htmlDetalle({ categoriaFija })}
      ${_htmlRevisar({ edicion, ficha, categoriaFija })}
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
 * Lleva el formulario a una etapa ('monto' | 'categoria' | 'detalle' | 'revisar').
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
  overlay?.querySelectorAll('[data-gasto-atras], [data-gasto-marca], [data-gasto-hojas], [data-gasto-sub], [data-gasto-papelera]').forEach(el => el.remove());
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
  // GAS.15f (ADR 194 D1): la ficha dice su fecha bajo el nombre y lleva la
  // papelera junto a la ✕.
  const esFicha0 = 'ficha' in form.dataset;
  let subCab = cab?.querySelector('[data-gasto-sub]');
  if (cab && tituloEl && esFicha0 && !subCab) {
    tituloEl.insertAdjacentHTML('afterend', '<p class="modal__sub" data-gasto-sub></p>');
    subCab = cab.querySelector('[data-gasto-sub]');
    cab.querySelector('.modal__close')?.insertAdjacentHTML('beforebegin',
      `<button type="button" class="btn btn-icon btn-ghost modal__papelera" data-gasto-papelera data-action="eliminar-gasto" aria-label="Eliminar este gasto">${icon('trash')}</button>`);
  }

  const valorMonto = () => desdeMiles(monto.value) ?? 0;
  /** Lo elegido en un paso, para su segmento (GAS.13f). */
  const valorDeEtapa = (id) => {
    if (id === 'monto') return valorMonto() > 0 ? f(valorMonto()) : '';
    const cat = form.querySelector('input[name="categoria"]:checked')?.value ?? '';
    if (id === 'categoria') {
      if (cat === CATEGORIA_NUEVA_VALUE) return form.querySelector('[name="categoriaNuevaNombre"]')?.value.trim() ?? '';
      return cat;
    }
    if (id === 'detalle') {
      const marcada = form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked');
      if (!marcada) return '';
      return marcada.value ? (marcada.closest('label')?.querySelector('.chip-cat__label')?.textContent.trim() ?? '') : 'Otra cosa';
    }
    return '';
  };
  const categoria = () => form.querySelector('input[name="categoria"]:checked')?.value ?? '';
  // GAS.5c (ADR 162 D1): "¿En qué fue?" va si la categoría tiene
  // subcategorías o si hay que preguntar si fue necesidad o deseo. Se decide
  // con el valor tocado: el `change` (y la sincronización de index.js) llega
  // después del clic.
  const tieneSub = (cat) => Boolean(cat && form.querySelector(`[data-sub-grupo="${CSS.escape(cat)}"]`));
  const pide = (cat, sub) => cat === CATEGORIA_NUEVA_VALUE
    || preguntaNecesidadODeseo(cat, sub, S.categoriasPersonalizadas ?? []);
  const necesitaDetalle = (cat = categoria()) => etapas.includes('detalle') && (tieneSub(cat) || pide(cat, null));
  const grupoCaracter = () => form.querySelector('[data-caracter-grupo]');
  const anterior = (e) => {
    let i = etapas.indexOf(e) - 1;
    if (etapas[i] === 'detalle' && !necesitaDetalle()) i -= 1;
    return etapas[Math.max(0, i)];
  };
  /**
   * GAS.10c (ADR 185 D4): la cabecera es la categoría (su teja en su tono y
   * su nombre) y "Necesidad" y "Deseo" van dentro de la opción elegida, sin
   * título; sin subcategorías (Otros, una propia) van solos, debajo.
   */
  const pintarDetalle = () => {
    const cat = categoria();
    const conSub = tieneSub(cat);
    const t = form.querySelector('#gasto-detalle-q');
    const nombre = cat === CATEGORIA_NUEVA_VALUE
      ? (form.querySelector('[name="categoriaNuevaNombre"]')?.value?.trim() || 'Otra categoría') : cat;
    // GAS.15e (ADR 193 D1): con opciones, "¿Qué fue?"; sin ellas (Otros, una
    // propia) el nombre, para el lector: la pregunta va sola, con su frase.
    if (t) {
      t.textContent = conSub ? '¿Qué fue?' : nombre;
      if (conSub) t.setAttribute('aria-label', `¿Qué fue? ${nombre}`);
      else t.removeAttribute('aria-label');
    }
    const teja = form.querySelector('[data-detalle-teja]');
    if (teja) {
      const simbolo = cat === CATEGORIA_NUEVA_VALUE
        ? (form.querySelector('[name="categoriaNuevaIcono"]')?.value || 'i-plus')
        : iconoDeCategoriaGasto(cat, S.categoriasPersonalizadas ?? []);
      teja.innerHTML = iconoCategoria(simbolo);
    }
    const etapa = form.querySelector('[data-etapa="detalle"]');
    // El tono de la categoría tiñe la teja, el aro elegido y su fondo.
    etapa?.style.setProperty('--teja-tono', `var(--fk-cat-${tonoDeCategoria(cat)})`);
    etapa?.classList.toggle('etapa-gasto--solo-pregunta', !conSub);
    colocarPregunta();
  };
  /** La pregunta, debajo de la opción elegida; sin opción, en su casa. */
  const colocarPregunta = () => {
    const g = grupoCaracter();
    const casa = form.querySelector('[data-caracter-casa]');
    if (!g || !casa) return;
    const marcada = form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked');
    // Se decide con lo marcado, no con el estado del grupo: el `change` de
    // index.js (que lo habilita) puede llegar después de este.
    if (marcada && pide(categoria(), marcada.value)) marcada.closest('.chip-cat').after(g);
    else casa.before(g);
  };

  const pintarMonto = () => {
    caja.dataset.valor = monto.value || '0';
    pmonto.classList.toggle('pmonto--vacio', !monto.value);
    pmonto.classList.toggle('pmonto--largo', monto.value.length > 9);
  };

  const esFicha = 'ficha' in form.dataset;
  const pintarCabecera = () => {
    if (!tituloEl) return;
    if (marca) marca.hidden = !(esFicha && actual === 'revisar');
    if (hojas) hojas.hidden = !(esFicha && actual === 'revisar');
    if (esFicha && actual === 'revisar') {
      // GAS.15f (ADR 194 D1): el nombre del gasto, como su fila, y debajo su
      // fecha; sin la banda bosque.
      const g0 = (S.gastos ?? []).find(g => g.id === form.dataset.id) ?? {};
      const sub = form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')?.value || null;
      const actualG = { ...g0, categoria: categoria() || g0.categoria, subcategoriaId: sub ?? g0.subcategoriaId, nota: form.querySelector('[name="nota"]')?.value ?? g0.nota };
      tituloEl.textContent = form.dataset.id ? textosFilaGasto(actualG).titulo : 'Gasto registrado';
      const fecha = form.querySelector('#gasto-fecha')?.value || g0.fecha || '';
      if (subCab) subCab.textContent = `${fechaCortaGasto(fecha)} · toca un dato para cambiarlo`;
      const papelera = cab?.querySelector('[data-gasto-papelera]');
      if (papelera && form.dataset.id) papelera.dataset.id = form.dataset.id;
      if (atras) atras.hidden = true;
      cab?.setAttribute('data-etapa-cab', 'ficha');
      return;
    }
    // GAS.15e (ADR 193 D2): la hoja dice su título en todos los pasos, con la
    // barra de pasos también en "Revisar"; "Revisa tu gasto" va en el papel.
    tituloEl.textContent = titulo;
    if (atras) {
      atras.hidden = actual === 'monto';
      const volver = anterior(actual);
      atras.setAttribute('aria-label', volver === 'detalle' ? 'Volver a en qué fue'
        : volver === 'categoria' ? 'Volver a la categoría' : 'Volver al monto');
    }
    // "revisar" es la banda bosque de la ficha; el recibo nuevo va sin ella.
    cab?.setAttribute('data-etapa-cab', actual === 'revisar' ? 'recibo' : actual);
  };

  // La ficha guarda sola: al volver al recibo, si algo cambió (FORM.2d).
  let firma = null;
  const firmaActual = () => JSON.stringify([...new FormData(form)]);
  const pintar = () => {
    pintarMonto();
    _pintarRecibo(form);
    if (esFicha && actual === 'revisar') pintarCabecera();
    if (!esFicha || actual !== 'revisar') return;
    const ahora = firmaActual();
    if (firma === null) { firma = ahora; return; }
    if (ahora === firma) return;
    firma = ahora;
    form.dataset.quedarse = '1';
    form.requestSubmit();
  };

  // TEL.1c (ADR 199 D15): los frenos del toque; cada etapa nueva vuelve a
  // contar la gracia (ui/toque.js).
  const esToque = vigilarToques(form);
  const irA = (etapa, { foco = true } = {}) => {
    if (!etapas.includes(etapa)) return;
    esToque.nuevaPantalla();
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
      // GAS.13f (ADR 188 D6): lo hecho dice lo elegido ("$4.500", "Café") y
      // se toca para volver a ese paso.
      const b = li.querySelector('.etapa__b');
      if (b) {
        b.disabled = !(j < i);
        const t = b.querySelector('.etapa__t');
        if (t) t.textContent = j < i ? (valorDeEtapa(li.dataset.etapaDe) || b.dataset.rotulo) : b.dataset.rotulo;
        // TEL.1c (ADR 199 D18): el nombre empieza por lo que se ve y dice
        // para qué sirve ("$4.500, monto: volver a este paso").
        if (j < i && t) b.setAttribute('aria-label', `${t.textContent}, ${b.dataset.rotulo.toLowerCase()}: volver a este paso`);
        else b.removeAttribute('aria-label');
      }
    }
    if (etapa === 'revisar') pintar();
    if (etapa === 'detalle') pintarDetalle();
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
    irA(necesitaDetalle() ? 'detalle' : 'revisar');
  };

  // GAS.5c: con Enter, o al volver a tocar lo ya elegido. La pregunta, si
  // está a la vista, es obligatoria.
  const seguirDesdeDetalle = () => {
    const g = grupoCaracter();
    if (g && !g.disabled && !g.querySelector('input[name="caracter"]:checked')) {
      mostrarErroresForm(form, ['Elige si fue una necesidad o un deseo.']);
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

  form.addEventListener('click', (e) => {
    const seguir = e.target.closest('[data-gasto-seguir]');
    if (seguir) {
      if (seguir.dataset.gastoSeguir === 'monto') seguirDesdeMonto();
      else if (seguir.dataset.gastoSeguir === 'detalle') seguirDesdeDetalle();
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
      irA(necesitaDetalle(radio.value) ? 'detalle' : 'revisar');
      return;
    }
    // GAS.5c: en "¿En qué fue?", una opción que no pide la pregunta avanza;
    // una que la pide (Taxi) se queda para contestarla. Contestar avanza.
    const sub = e.target.closest('input[name="subcategoriaId"]');
    if (sub && esToque(e, sub) && actual === 'detalle') {
      if (!pide(categoria(), sub.value)) irA('revisar');
      return;
    }
    const respuesta = e.target.closest('input[name="caracter"]');
    if (respuesta && esToque(e, respuesta) && actual === 'detalle') irA('revisar');
  });

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'categoria') {
      colocarPregunta();
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
    if (t.name === 'subcategoriaId' || t.name === 'caracter') _pintarRecibo(form);
    // GAS.10c: la pregunta aparece dentro de la opción elegida: que se vea.
    if (t.name === 'subcategoriaId' && actual === 'detalle') {
      colocarPregunta();
      const g = grupoCaracter();
      if (g && !g.disabled) g.scrollIntoView?.({ block: 'nearest' });
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
    } else if ((e.target.name === 'subcategoriaId' || e.target.name === 'caracter') && actual === 'detalle') {
      e.preventDefault();
      seguirDesdeDetalle();
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
  // La categoría y el monto, una vez cada uno (ADR 156 D3). FAC.1 (ADR 180
  // D3): la categoría es la primera fila de la factura, con su glifo de
  // contorno, y la cifra queda sola arriba con "COP".
  set('[data-recibo-teja]', iconoCategoria(simbolo));
  // GAS.10d (ADR 185 D5): el glifo de la categoría va en su tono.
  form.querySelector('#gasto-fila-categoria')?.style.setProperty('--recibo-tono', `var(--fk-cat-${tonoDeCategoria(cat)})`);
  set('#gasto-fila-categoria [data-fila-v]', `<span data-recibo-cat>${_esc(nombreCat || 'Elegir')}</span>`);
  form.querySelector('#gasto-fila-categoria')?.classList.toggle('recibo__fila--vacia', !nombreCat);
  set('[data-recibo-monto]', `<span class="recibo__signo">$</span>${_esc(f(m).replace(/^-?\$/, ''))}`);
  // La cifra comparte el ancho con la ilustración: baja de tamaño antes de partirse.
  const cifra = form.querySelector('[data-recibo-monto]');
  cifra?.classList.toggle('recibo__monto--largo', f(m).length > 8);
  cifra?.classList.toggle('recibo__monto--enorme', f(m).length > 11);
  const sub = nombreSubcategoriaGasto({ categoria: cat, subcategoriaId: form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')?.value });
  _pintarFilaDetalle(form, sub);

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
    filaCuenta.querySelector('.recibo__campo use')?.setAttribute('href', esTarjeta ? '#i-deudas' : '#i-cuentas');
    // GAS.13g (ADR 188 D6): la cuenta va con el logo de su banco o el billete
    // del efectivo, en el lugar del ícono.
    filaCuenta.classList.toggle('recibo__fila--con-logo', !esTarjeta && (S.cuentas ?? []).some(x => x.id === origen));
    if (esTarjeta) {
      const t = (S.compromisos ?? []).find(c => c.id === origen.slice(TARJETA_PREFIJO.length));
      k.textContent = 'Tarjeta de crédito';
      figura.innerHTML = t ? tejaTarjeta(t) : '';
      v.textContent = t?.descripcion ?? 'Tarjeta';
      // GAS.10d (ADR 185 D5): lo que queda, al lado del nombre.
      s.innerHTML = t ? `cupo ${_plata(Math.max(_cupo(t) - m, 0))}` : '';
    } else {
      const c = (S.cuentas ?? []).find(x => x.id === origen);
      // "Pagado con" (GAS.15e, ADR 193 D2; antes "Cuenta de origen", FAC.1):
      // la entidad ("Bancolombia") y a su lado lo que queda (GAS.10d, ADR 185
      // D5: sin el tipo, como el tablero). El efectivo dice "Sale de".
      k.textContent = c && bancoClase(c.banco) === 'efectivo' ? 'Sale de' : 'Pagado con';
      figura.innerHTML = c ? bancoAvatar(c.banco, c.icono) : '';
      // Sin el tipo, dos cuentas del mismo banco se distinguen por su nombre.
      const homonima = c && (S.cuentas ?? []).some(x => x.activa !== false && x.id !== c.id
        && nombreCortoCuenta(x) === nombreCortoCuenta(c));
      v.textContent = c ? (homonima ? c.nombre : nombreCortoCuenta(c)) : 'Elige una cuenta';
      // GAS.5b (ADR 161 D2): al editar, lo que este gasto ya había
      // descontado de la misma cuenta vuelve a contar como disponible.
      const anterior = edicion ? (S.gastos ?? []).find(g => g.id === form.dataset.id) ?? null : null;
      const devuelve = anterior && anterior.cuentaId === c?.id && anterior.sinEfectoSaldo !== true
        ? Number(anterior.monto) || 0 : 0;
      const disponible = (c?.saldo ?? 0) + devuelve;
      plan = c && anterior?.sinEfectoSaldo !== true ? planSiNoAlcanza(S.cuentas, m, c.id, anterior) : null;
      // GMF.1b (ADR 165 D4): lo que queda ya descuenta el 4x1000, y se dice.
      const gmf = c && !plan && anterior?.sinEfectoSaldo !== true
        ? gmfDeRetiro(c.id, m, form.querySelector('#gasto-fecha')?.value || hoy(), { excluirId: anterior?.id ?? null, disponible })
        : 0;
      const saldo = !c ? ''
        : plan ? `tienes ${_plata(disponible)}`
          : `queda ${_plata(disponible - m - gmf)}`;
      const lineaGMF = gmf > 0 ? `<span class="recibo__gmf">Incluye ${_plata(gmf)} de 4x1000</span>` : '';
      s.innerHTML = [saldo && `<span>${saldo}</span>`, lineaGMF].filter(Boolean).join('');
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
    filaNota.querySelector('[data-fila-v]').textContent = nota || 'Opcional';
    filaNota.querySelector('[data-fila-accion]').innerHTML = nota ? 'Cambiar' : `${icon('plus')}Agregar`;
    filaNota.setAttribute('aria-label', nota ? `Nota: ${nota}. Cambiar` : 'Agregar nota');
    filaNota.classList.toggle('recibo__fila--vacia', !nota);
  }

  _pintarAvisoSaldo(form, plan);
  _pintarHormiga(form, { cat, m, origen });
}

/**
 * GAS.15e (ADR 193 D3): "Finko lo cuenta como gasto hormiga: 4.º tinto en 30
 * días", si el gasto que se va a guardar completa o sigue una racha de lo
 * pequeño que se repite (`hormigaDelGasto`, el criterio de siempre).
 * GAS.15f (ADR 194 D1): también en la ficha, sin contarse dos veces.
 */
function _pintarHormiga(form, { cat, m, origen }) {
  const caja = form.querySelector('#gasto-hormiga');
  if (!caja) return;
  const sub = form.querySelector('[data-sub-grupo]:not([disabled]) input[name="subcategoriaId"]:checked')?.value || null;
  const h = !cat || cat === CATEGORIA_NUEVA_VALUE || !(m > 0) ? null
    : hormigaDelGasto(S.gastos ?? [], {
      categoria: cat, subcategoriaId: sub, monto: m,
      fecha: form.querySelector('#gasto-fecha')?.value || hoy(),
      nota: form.querySelector('[name="nota"]')?.value ?? '',
      cuentaId: origen,
    }, { tope: topeHormiga(S.config), excluirId: form.dataset.id || null });
  caja.hidden = !h;
  const t = caja.querySelector('[data-hormiga-texto]');
  if (t) t.innerHTML = h ? `Finko lo cuenta como <strong>gasto hormiga</strong>: ${h.veces}.º ${_esc(h.etiqueta.toLowerCase())} en 30 días` : '';
}

/**
 * La fila "Detalle" del recibo (SUS.2a; GAS.5c, ADR 162 D1; GAS.10d, ADR 185
 * D5, antes "¿En qué fue?" o "¿Necesidad o deseo?"): se ve si la
 * categoría elegida tiene subcategorías o lleva la pregunta, que es lo que
 * `sincronizarDetalleCategoria` (index.js) dejó habilitado. Dice lo elegido y
 * la respuesta ("Taxi · Deseo") y lleva a la etapa "¿En qué fue?".
 * @param {HTMLFormElement} form
 * @param {string|null} sub - nombre de la subcategoría elegida.
 */
function _pintarFilaDetalle(form, sub) {
  const fila = form.querySelector('#gasto-fila-detalle');
  if (!fila) return;
  const grupoSub = form.querySelector('[data-sub-grupo]:not([disabled])');
  const conPregunta = Boolean(form.querySelector('[data-caracter-grupo]:not([disabled])'));
  fila.hidden = !grupoSub && !conPregunta;
  if (fila.hidden) return;
  const respuesta = conPregunta ? form.querySelector('[data-caracter-grupo] input[name="caracter"]:checked')?.value : null;
  const otra = grupoSub?.querySelector('input[name="subcategoriaId"][value=""]:checked') ? 'Otra cosa' : null;
  // GAS.13f (ADR 188 D6): lo que depende y no se contestó se pregunta aquí,
  // en la fila Detalle, no en un bloque aparte.
  const sinContestar = conPregunta && !respuesta ? '¿Necesidad o deseo?' : null;
  // GAS.15e (ADR 193 D2): "Tinto" y, al lado y más chica, "· Necesidad".
  const eleccion = grupoSub ? (sub ?? otra) : null;
  const caracter = { gusto: 'Deseo', necesidad: 'Necesidad' }[respuesta] ?? sinContestar;
  const v = eleccion ?? caracter;
  fila.querySelector('[data-fila-v]').textContent = v || 'Elegir';
  const s = fila.querySelector('[data-fila-s]');
  if (s) s.textContent = eleccion && caracter ? `· ${caracter}` : '';
  fila.classList.toggle('recibo__fila--vacia', !v);
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
