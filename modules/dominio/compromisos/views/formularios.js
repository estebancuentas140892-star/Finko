/**
 * compromisos/views/formularios.js - formularios modales del dominio.
 *
 * Cuatro formularios:
 *   - Form de gasto fijo (ficha 05, ADR 069: mudado desde Agenda)
 *   - Segmented Entidad/Personal inline + form tailored de deuda
 *   - Form de abono a deuda existente (ADR 002)
 *   - Form de "Sacar un avance" de una tarjeta (AVC.1b, ADR 169)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { miles } from '../../../infra/miles.js';
import { S } from '../../../core/state.js';
import { f, esc as _esc, hoy } from '../../../infra/utils.js';
import {
  FRECUENCIAS,
  GRUPOS_CATEGORIA_AGENDA,
  CATEGORIAS_AGENDA_RETIRADAS,
  CATEGORIAS_DEUDA,
  CATEGORIAS_DEUDA_PERSONAL,
  CATEGORIA_DEUDA_ICONO,
  CATEGORIA_DEUDA_PERSONAL_ICONO,
  ICONOS_CATEGORIA_PERSONALIZADA,
  TAGS_CATEGORIA_AGENDA,
  TIPOS_LLAVE,
  BANCOS_CO,
  iconoDeCategoriaGasto,
} from '../../../core/constants.js';
import { marcasDeCategoriaAgenda, tejaMarca } from '../../../infra/marcas.js';
import { renderSelectorCuenta, renderBloqueDebitoAutomatico, cuentaHabitualDe } from '../../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../../infra/icon-picker.js';
import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { htmlMiniHoja } from '../../../ui/mini-hoja.js';
import { CUOTAS_AVANCE, EFECTIVO_NUEVO, tasaEADe } from '../logic.js';

// ── FORMULARIO MODAL: NUEVO GASTO FIJO (ficha 05, mudado desde Agenda) ──

/**
 * Frase "cada X" (o "una vez") de cada frecuencia, para el banner dinámico
 * del gasto fijo (ver `textoBannerGastoFijo`). Cubre las 9 FRECUENCIAS;
 * "Única vez" es la única sin ritmo de repetición.
 */
const _FRASE_FRECUENCIA = {
  'Diario':     'cada día',
  'Semanal':    'cada semana',
  'Quincenal':  'cada quincena',
  'Mensual':    'cada mes',
  'Bimestral':  'cada dos meses',
  'Trimestral': 'cada tres meses',
  'Semestral':  'cada seis meses',
  'Anual':      'cada año',
  'Única vez':  'una vez',
};

/**
 * Texto del banner informativo del form de gasto fijo (FORM.1c, ADR 042 D5):
 * lee la frecuencia y el día de pago elegidos y arma "Aparecerá cada mes en
 * tu calendario el día 5." Sin día válido (campo vacío o fuera de 1-31),
 * usa un cierre neutro en vez de inventar una fecha.
 * @param {string} frecuencia
 * @param {string|number} diaPago
 * @returns {string}
 */
export function textoBannerGastoFijo(frecuencia, diaPago) {
  const frase = _FRASE_FRECUENCIA[frecuencia] ?? 'cada mes';
  const dia = Number(diaPago);
  // GAS.11c (ADR 186 D6): el semanal empieza ese día y sigue cada 7 días.
  const desde = frecuencia === 'Semanal' ? 'desde ' : '';
  const diaTexto = Number.isInteger(dia) && dia >= 1 && dia <= 31
    ? `${desde}el día ${dia}`
    : `${desde}el día que elijas`;
  return `Aparecerá ${frase} en tu calendario ${diaTexto}.`;
}

/**
 * La frecuencia como la dice el resumen del gasto fijo (GF.2, ADR 177 D6):
 * "Cada mes", "Una vez". Frecuencia desconocida: "Cada mes", como el banner.
 * @param {string} frecuencia
 * @returns {string}
 */
export function textoFrecuenciaGastoFijo(frecuencia) {
  const frase = _FRASE_FRECUENCIA[frecuencia] ?? 'cada mes';
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/** Sentinela del chip "Categoría nueva" del formulario de gasto fijo (CAT.3c). */
export const CATEGORIA_NUEVA_VALUE_FIJO = '__nueva__';

/**
 * Las tres frecuencias que van en chip en "¿Cada cuánto?" (REV.2b, ADR 141
 * D2). El resto de `FRECUENCIAS` vive detrás de "Otra", en el desplegable de
 * siempre: un arriendo, una quincena o un seguro anual son casi todos los
 * fijos, y los otros seis no se esconden, se piden con un toque más.
 */
export const FRECUENCIAS_CHIP_FIJO = Object.freeze(['Mensual', 'Quincenal', 'Anual']);

/** Valor del chip "Otra" en "¿Cada cuánto?": no es una frecuencia. */
export const FRECUENCIA_OTRA_FIJO = 'otra';

/**
 * Lo que despliega "Otra" en el teléfono (GAS.10f, ADR 185 D7): las cuatro
 * que faltan, sin repetir Mensual. Escritorio conserva el desplegable con
 * las nueve.
 */
export const FRECUENCIAS_OTRA_FIJO = Object.freeze([
  ['Semanal', 'Cada semana'],
  ['Bimestral', 'Cada 2 meses'],
  ['Trimestral', 'Cada 3 meses'],
  ['Semestral', 'Cada 6 meses'],
]);

/** La pregunta del selector de plataforma, por categoría (SUS.1a, GF.1). */
/** GAS.10e (ADR 185 D6): el rótulo de cada grupo de marcas, por etiqueta. */
const _GRUPO_MARCAS = {
  streaming: 'Series y películas',
  musica:    'Música',
  telefonia: 'Operadores',
  tv:        'Televisión',
  internet:  'Internet satelital',
  movil:     'Operadores virtuales',
  ia:        'Inteligencia artificial',
  nube:      'Nube',
  software:  'Programas',
  gaming:    'Videojuegos',
  educacion: 'Aprender',
  domicilios: 'Domicilios',
};

const _PREGUNTA_PLATAFORMA = {
  'Servicios públicos': '¿Con qué empresa?',
  'Internet y TV':      '¿Con qué empresa?',
  'Celular':            '¿Con qué empresa?',
  'Streaming':          '¿Cuál plataforma?',
  'Suscripciones':      '¿Cuál servicio?',
  'Seguros':            '¿Con qué aseguradora?',
  'Medicina prepagada': '¿Con qué entidad?',
  'Gimnasio':           '¿Cuál gimnasio?',
};

/**
 * Selector de plataforma del gasto fijo (SUS.1a, ADR 146 D2): un grupo de
 * chips con la teja de cada marca por cada categoría que tiene tags en
 * `TAGS_CATEGORIA_AGENDA`. Mismo patrón que la subcategoría de Metas
 * (`_gruposSubcategoria`, ADR 064): solo el grupo de la categoría elegida se
 * ve, el resto viaja `hidden` **y** `disabled`, así que `FormData` nunca lleva
 * un `marcaId` de otra categoría. `_syncCategoriaGastoFijo` (index.js) alterna
 * cuál queda a la vista.
 *
 * "Sin empresa" (valor vacío; "Otra" hasta GF.2, ADR 177 D3) es "ninguna de
 * estas": el fijo se llama como lo que se escriba en "Nombre del servicio"
 * o, sin nombre, como la categoría. `data-plataforma-pregunta` es la
 * pregunta del grupo (el nombre accesible de la pantalla).
 *
 * GAS.10e ([ADR 185](../../../../docs/DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D6):
 * las marcas van por grupo ("Series y películas", "Música") cuando la
 * categoría junta más de uno, y "Sin empresa: escribir el nombre" cierra la
 * lista (en el teléfono, punteado; lleva a su pantalla).
 *
 * @returns {string}
 */
function _gruposPlataforma() {
  return Object.keys(TAGS_CATEGORIA_AGENDA).map(cat => {
    const marcas = marcasDeCategoriaAgenda(cat);
    if (marcas.length === 0) return '';
    const legendId = `gfijo-plataforma-${cat.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase()}`;
    const pregunta = _PREGUNTA_PLATAFORMA[cat] ?? '¿Cuál es?';
    const chip = (m) => `
          <label class="chip-cat chip-cat--marca">
            <input type="radio" name="marcaId" class="chip-cat__radio" value="${_esc(m.id)}" />
            ${tejaMarca(m)}
            <span class="chip-cat__label">${_esc(m.nombre)}</span>
            <svg class="icon chip-cat__ok" aria-hidden="true"><use href="#i-check"/></svg>
          </label>`;
    // GAS.10e (ADR 185 D6): por grupo, en el orden de las etiquetas de la
    // categoría; cada marca, en el primero que la nombra.
    const tags = TAGS_CATEGORIA_AGENDA[cat];
    const grupos = tags
      .map(tag => ({ tag, marcas: marcas.filter(m => (m.categorias ?? []).find(t => tags.includes(t)) === tag) }))
      .filter(g => g.marcas.length > 0);
    const chips = grupos.length > 1
      ? grupos.map(g => `
          <p class="marcas-grupo__t" aria-hidden="true">${_esc(_GRUPO_MARCAS[g.tag] ?? g.tag)}</p>${g.marcas.map(chip).join('')}`).join('')
      : marcas.map(chip).join('');
    return `
      <fieldset class="subcategoria-fieldset" data-plataforma-grupo="${_esc(cat)}" data-plataforma-pregunta="${_esc(pregunta)}" hidden disabled>
        <legend id="${legendId}">${_esc(pregunta)} <span class="form-optional">Opcional</span></legend>
        <div class="chips-cat" role="radiogroup" aria-labelledby="${legendId}">${chips}
          <label class="chip-cat chip-cat--sin">
            <input type="radio" name="marcaId" class="chip-cat__radio" value="" />
            <svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg>
            <span class="chip-cat__label">Sin empresa: escribir el nombre</span>
          </label>
        </div>
      </fieldset>`;
  }).join('');
}

/**
 * "Para pagar" (PAG.1, [ADR 175](../../../../docs/DECISIONS/175-a-donde-se-paga.md)
 * D1): a dónde se le paga a alguien, en el gasto fijo y en la deuda con una
 * persona. El titular, una llave de Bre-B (tipo en chips, como en Mis
 * cuentas), la entidad y el número de cuenta, y la referencia. Es un bloque
 * opcional: en el teléfono, una ficha de "Agrega si quieres". `data-no-avanza`:
 * elegir el tipo de la llave no cierra la pregunta.
 * @param {string} prefijo el de los ids del formulario ('gfijo', 'comp')
 * @param {import('../../../core/state.js').DatosPago|null} [dp] lo guardado, al editar
 * @returns {string}
 */
export function htmlCamposPago(prefijo, dp = null) {
  const tipo = dp?.llave?.tipo ?? 'Celular';
  const chips = TIPOS_LLAVE.map(t => `
            <label class="chip-fecha">
              <input type="radio" class="chip-cat__radio" name="pagoLlaveTipo" value="${_esc(t)}"${t === tipo ? ' checked' : ''} />
              ${_esc(t)}
            </label>`).join('');
  const entidades = BANCOS_CO.filter(b => b.clase !== 'efectivo')
    .map(b => `<option value="${_esc(b.id)}"${b.id === dp?.entidad ? ' selected' : ''}>${_esc(b.id)}</option>`).join('');
  const valor = (v) => _esc(v ?? '');
  // GAS.13c (ADR 188 D3): en el gasto fijo, el teléfono pide un solo campo con
  // el nombre del dato de su tipo (`datoPagoDeFijo`, lo pinta el dominio al
  // elegir la categoría). Lo demás queda en el formulario: lo guardado no se
  // pierde al editar y escritorio no cambia.
  const fijo = prefijo === 'gfijo';
  return `
      <div class="form-group pago-datos${fijo ? ' pago-datos--fijo' : ''}" id="${prefijo}-pago" data-opcional="Para pagar" data-no-avanza>
        <span hidden data-resumen-valor id="${prefijo}-pago-resumen"></span>${fijo ? `
        <span hidden data-resumen-icono><svg class="icon" aria-hidden="true"><use href="#i-doc"/></svg></span>` : ''}
        <p class="form-hint pago-datos__extra">El dato que usas para pagarle: su llave de Bre-B, su cuenta o la referencia del recibo. Lo copias desde el pago.</p>
        <div class="form-group pago-datos__extra"${prefijo === 'comp' ? ' hidden' : ''}>
          <label for="${prefijo}-pago-titular" class="label">¿A nombre de quién? <span class="form-optional">Opcional</span></label>
          <input id="${prefijo}-pago-titular" name="pagoTitular" class="input" type="text" autocomplete="off"
                 placeholder="Ej. Martha Gómez, Conjunto Los Pinos" value="${valor(dp?.titular)}" />
        </div>
        <div class="form-group pago-datos__extra">
          <span class="label" id="${prefijo}-pago-llave-label">Su llave de Bre-B</span>
          <div class="fecha-chips fecha-chips--rejilla" role="radiogroup" aria-labelledby="${prefijo}-pago-llave-label">${chips}
          </div>
          <label for="${prefijo}-pago-llave" class="sr-only">Llave</label>
          <input id="${prefijo}-pago-llave" name="pagoLlaveValor" class="input" type="text" autocomplete="off"
                 placeholder="Ej. 300 123 4567, @martha" value="${valor(dp?.llave?.valor)}" />
        </div>
        <div class="form-group pago-datos__extra">
          <label for="${prefijo}-pago-numero" class="label">O su número de cuenta</label>
          <input id="${prefijo}-pago-numero" name="pagoNumeroCuenta" class="input" type="text" autocomplete="off"
                 placeholder="Ej. 1234567890" value="${valor(dp?.numeroCuenta)}" />
          <label for="${prefijo}-pago-entidad" class="sr-only">Banco o billetera de esa cuenta</label>
          <select id="${prefijo}-pago-entidad" name="pagoEntidad" class="input">
            <option value="">Banco o billetera</option>${entidades}
          </select>
        </div>
        <div class="form-group pago-datos__dato">
          <label for="${prefijo}-pago-referencia" class="label"><span class="pago-datos__k-esc">${prefijo === 'comp' ? 'Otra referencia' : 'Referencia o número de contrato'}</span>${fijo ? '<span class="pago-datos__k-tel">Dato para pagar</span>' : ''}</label>
          <input id="${prefijo}-pago-referencia" name="pagoReferencia" class="input" type="text" autocomplete="off"
                 placeholder="Ej. el número de contrato del recibo" value="${valor(dp?.referencia)}" />
        </div>
      </div>`;
}

/**
 * Las categorías del gasto fijo en familias (GF.2, ADR 177 D2): las de
 * `GRUPOS_CATEGORIA_AGENDA`, "Tus categorías" (las propias de sección fijo y
 * la retirada del fijo que se edita) antes de "¿No está en la lista?", que
 * cierra con "Crear categoría". En el teléfono, tocar cualquiera lleva a la
 * pantalla siguiente (GF.3, ADR 178 D1); "Crear categoría", a la suya. Cada
 * familia es su propio grupo de radios con su rótulo; todos los radios son
 * `name="categoria"`, como siempre.
 * @param {string[]} propias nombres de "Tus categorías"
 * @returns {string}
 */
function _familiasCategoria(propias) {
  const chip = (valor, etiqueta, simbolo, { crear = false } = {}) => `
          <label class="chip-cat${crear ? ' chip-cat--crear' : ''}">
            <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(valor)}" />
            <svg class="icon" aria-hidden="true"><use href="#${_esc(simbolo)}"/></svg>
            <span class="chip-cat__label">${_esc(etiqueta)}</span>
            <svg class="icon chip-cat__ok" aria-hidden="true"><use href="#i-check"/></svg>
          </label>`;
  const icono = (c) => iconoDeCategoriaGasto(c, S.categoriasPersonalizadas);
  const familia = ({ familia: clave, nombre, categorias }) => {
    const chips = categorias.map(c => chip(c, c, icono(c)));
    if (clave === 'otros') chips.push(chip(CATEGORIA_NUEVA_VALUE_FIJO, 'Crear categoría', 'i-plus', { crear: true }));
    return `
        <section class="familia-cat" data-familia="${_esc(clave)}">
          <h4 class="familia-cat__t" id="gfijo-familia-${_esc(clave)}">${_esc(nombre)}</h4>
          <div class="chips-cat" role="radiogroup" aria-labelledby="gfijo-familia-${_esc(clave)}">${chips.join('')}
          </div>
        </section>`;
  };
  const grupos = [...GRUPOS_CATEGORIA_AGENDA];
  if (propias.length) grupos.splice(grupos.length - 1, 0, { familia: 'propias', nombre: 'Tus categorías', categorias: propias });
  return grupos.map(familia).join('');
}

/**
 * El contexto del gasto fijo en el teléfono (GF.2, ADR 177 D1): lo ya
 * respondido, sobre la pregunta. `pastilla` en "¿Qué es?" y "Crea tu
 * categoría" ("Pagas $85.000"); `tarjeta` en la empresa (la categoría, su
 * familia y el monto, con "Cambiar"); `cuando` en "¿Cuándo lo pagas?" (la
 * empresa o la categoría y el monto). El armazón lo copia sobre el título.
 * @param {'pastilla'|'tarjeta'|'cuando'} forma
 * @param {{ monto: number, categoria?: string, familia?: string, nombreFamilia?: string, simbolo?: string, marca?: object|null }} datos
 * @returns {string}
 */
export function htmlContextoGastoFijo(forma, { monto, categoria = '', familia = 'otros', nombreFamilia = '', simbolo = 'c-otros', marca = null }) {
  const cuanto = f(monto || 0);
  const teja = marca
    ? tejaMarca(marca)
    : `<span class="familia-ico" data-familia="${_esc(familia)}"><svg class="icon" aria-hidden="true"><use href="#${_esc(simbolo)}"/></svg></span>`;
  if (forma === 'tarjeta') {
    return `
        <div class="gfijo-ctx gfijo-ctx--tarjeta">
          ${teja}
          <span class="gfijo-ctx__txt">
            <span class="gfijo-ctx__k">${_esc([nombreFamilia, cuanto].filter(Boolean).join(' · '))}</span>
            <span class="gfijo-ctx__v">${_esc(categoria)}</span>
          </span>
          <button type="button" class="gfijo-ctx__cambiar" data-preguntas-volver>Cambiar</button>
        </div>`;
  }
  if (forma === 'cuando') {
    return `<span class="gfijo-ctx gfijo-ctx--pastilla">${teja}${_esc(`${marca?.nombre ?? categoria} · ${cuanto}`)}</span>`;
  }
  return `<span class="gfijo-ctx gfijo-ctx--pastilla"><svg class="icon" aria-hidden="true"><use href="#i-recurring"/></svg>Pagas ${_esc(cuanto)}</span>`;
}

/**
 * Devuelve el HTML del formulario de gasto fijo.
 *
 * Orden (REV.2b, ADR 141, que ajusta el ADR 042 D5): "¿Cuánto pagas?" (el
 * monto, primero, como en Registrar gasto, ADR 042 D2), "¿Qué es?" (todas las
 * categorías en chips), "¿Cada cuánto?" (Mensual, Quincenal, Anual u Otra),
 * "¿Qué día?" con el banner, y "Más opciones" plegado con la nota y el débito
 * automático.
 *
 * `tipo` va como input hidden con valor 'fijo' para que `normalizarCompromiso`
 * lo guarde como un compromiso de tipo fijo en S.compromisos.
 *
 * AG.4: con una categoría predefinida (también "Otros" desde GF.1), el nombre
 * del registro es la propia categoría, así que pedirlo aparte es redundante;
 * el campo de texto pasa a ser una nota opcional. `_syncCategoriaGastoFijo`
 * (en index.js) alterna el label/placeholder/`required` de este campo según
 * la categoría elegida y lo muda: obligatorio, va bajo "¿Qué es?"; nota, va
 * dentro de "Más opciones". El HTML nace en el estado por defecto (sin
 * categoría, nombre obligatorio) y ese handler ajusta el resto en cada apertura.
 *
 * `frecuenciaOpcion` es un radio de presentación (mismo patrón que
 * `fechaOpcion` de Registrar gasto, ADR 042 D1): el dato real es el
 * `<select name="frecuencia">`, que los chips mantienen al día y que "Otra"
 * deja a la vista. `normalizarCompromiso` no lee `frecuenciaOpcion`.
 *
 * GF.1 (ADR 167): "¿Cuánto pagas?" lleva `data-cifra`: en el teléfono el
 * armazón de preguntas lo viste como el monto de Registrar gasto (la cifra
 * grande al centro y el teclado de Finko abajo). "Otros" ya no pide ícono ni
 * nombre. Al editar un fijo de una categoría retirada (Mercado, Transporte,
 * Mascotas), su chip va en "Tus categorías" para no perderla.
 *
 * GF.2 (ADR 177): en el teléfono, cuatro pasos con nombre (`data-pasos`):
 * Monto, Qué es (las familias; la empresa y la categoría nueva son pantallas
 * de este paso), Cuándo (la frecuencia y el día juntos) y Revisar. En
 * escritorio son los mismos bloques, uno debajo del otro. Los `[data-contexto]`
 * los llena `_pintarContextoGastoFijo` (index.js).
 *
 * GF.3 (ADR 178): en el teléfono, elegir es seguir. La categoría, la empresa
 * y el día llevan a la pantalla siguiente sin "Siguiente"; cada cuánto espera
 * al día (o sigue, si ya está). Solo "Otra" frecuencia (`data-no-avanza`) se
 * queda, porque pide el desplegable; elegir en él también sigue.
 *
 * @param {{ categoriaActual?: string }} [opciones]
 * @returns {string}
 */
export function renderFormGastoFijo({ categoriaActual = '' } = {}) {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  // FORM.1c (ADR 042 D5): la categoría son chips de ícono, no un
  // desplegable. Radios reales name="categoria" dentro del label: el
  // contrato FormData y validarCompromiso() no cambian. CAT.3c: las
  // personalizadas de sección 'fijo' y "Crear categoría" (el sentinela).
  // GF.2 (ADR 177 D2): agrupadas en familias.
  const personalizadasFijo = (S.categoriasPersonalizadas ?? []).filter(c => c.seccion === 'fijo');
  const retirada = CATEGORIAS_AGENDA_RETIRADAS.includes(categoriaActual) ? [categoriaActual] : [];
  const familias = _familiasCategoria([...retirada, ...personalizadasFijo.map(c => c.nombre)]);

  const chipFrecuencia = (valor, etiqueta, checked) => `
          <label class="chip-fecha"${valor === FRECUENCIA_OTRA_FIJO ? ' data-no-avanza' : ''}>
            <input type="radio" name="frecuenciaOpcion" class="chip-cat__radio" value="${_esc(valor)}"${checked ? ' checked' : ''} />
            ${_esc(etiqueta)}${valor === FRECUENCIA_OTRA_FIJO ? '<svg class="icon chip-fecha__chev" aria-hidden="true"><use href="#i-chevron-down"/></svg>' : ''}
          </label>`;
  // GAS.10f (ADR 185 D7): "Otra" despliega cuatro chips en el teléfono.
  const chipsOtra = FRECUENCIAS_OTRA_FIJO.map(([valor, etiqueta]) => `
              <label class="chip-fecha">
                <input type="radio" name="frecuenciaOtra" class="chip-cat__radio" value="${_esc(valor)}" />
                ${_esc(etiqueta)}
              </label>`).join('');
  const chipsFrecuencia = [
    ...FRECUENCIAS_CHIP_FIJO.map(fr => chipFrecuencia(fr, fr, fr === 'Mensual')),
    chipFrecuencia(FRECUENCIA_OTRA_FIJO, 'Otra', false),
  ].join('');

  // Sin cuentas activas no hay débito automático que ofrecer, y "Más
  // opciones" solo guarda la nota (cuando la hay).
  const debito = renderBloqueDebitoAutomatico(S.cuentas ?? [], { id: 'gfijo-debito' });

  // GF.2 (ADR 177 D5 y D6): el ícono de cada fila del resumen y el aviso del
  // calendario, que también se repite en el resumen.
  const icono = (simbolo) => `<span hidden data-resumen-icono><svg class="icon" aria-hidden="true"><use href="#${simbolo}"/></svg></span>`;

  return `
    <form id="form-gasto-fijo" novalidate data-preguntas="Nuevo gasto fijo" data-pasos="Monto|Qué es|Cuándo|Revisar"
          data-resumen-titulo="Así queda tu gasto fijo" data-resumen-agregar="También puedes hacerlo después."
          data-factura-titulo="Nuevo gasto fijo" data-resumen-opcionales="Débito automático|Para pagar|Nota">
      <input type="hidden" name="tipo" value="fijo" />

      <div class="monto-hero" data-pregunta="¿Cuánto pagas?" data-pregunta-id="monto" data-paso="Monto"
           data-resumen="Cuánto pagas" data-resumen-orden="2"
           data-falta="Escribe cuánto pagas. Por ejemplo: 1.200.000" data-cifra>
        <span hidden data-resumen-icono><span class="recibo__signo-ico">$</span></span>
        <label class="monto-hero__label" for="gfijo-monto">¿Cuánto pagas?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="gfijo-monto" name="monto" class="input input--big-amount" type="text" placeholder="0" required aria-required="true"
                 autocomplete="off" inputmode="numeric" data-miles />
        </div>
      </div>

      <div data-pregunta="¿Qué es?" data-pregunta-id="que" data-paso="Qué es" data-resumen="Servicio" data-resumen-orden="1"
           data-falta="Elige qué es: toca una de las categorías.">
        <span hidden data-contexto id="gfijo-ctx-que"></span>
        <span hidden data-resumen-icono id="gfijo-resumen-que-icono"></span>
        <div class="form-group">
          <span class="label" id="gfijo-categoria-label">¿Qué es?</span>
          <div class="familias-cat">${familias}
          </div>
          <span hidden data-resumen-valor id="gfijo-resumen-que"></span>
          <span hidden data-resumen-sub id="gfijo-resumen-que-sub"></span>
        </div>

        <div id="gfijo-ranura-nombre">
          <div class="form-group" id="gfijo-grupo-descripcion">
            <label for="gfijo-descripcion" class="label" id="gfijo-descripcion-label">Descripción</label>
            <input id="gfijo-descripcion" name="descripcion" class="input" type="text"
                   placeholder="Ej. Arriendo, Netflix, agua" required aria-required="true"
                   autocomplete="off" />
          </div>
        </div>
      </div>

      <div id="gfijo-empresa" data-pregunta="¿Con qué empresa?" data-pregunta-id="empresa" data-paso="Qué es" data-resumen="" hidden>
        ${_gruposPlataforma()}
      </div>

      <div id="gfijo-sin-empresa" data-pregunta="Nombre del servicio" data-pregunta-id="servicio" data-paso="Qué es"
           data-resumen="" data-seguir="Continuar" hidden>
        <label class="gfijo-servicio" for="gfijo-servicio">
          <span class="gfijo-servicio__teja" id="gfijo-servicio-teja" aria-hidden="true"></span>
          <span class="gfijo-servicio__txt">
            <span class="gfijo-servicio__k">Nombre del servicio</span>
            <input id="gfijo-servicio" name="nombreServicio" class="gfijo-servicio__campo" type="text"
                   placeholder="Ej. Mubi" autocomplete="off" enterkeyhint="next" maxlength="60" />
          </span>
        </label>
      </div>

      <div class="form-group" id="gfijo-categoria-nueva-fields" data-pregunta="Crea tu categoría" data-pregunta-id="nueva"
           data-paso="Qué es" data-resumen="" data-seguir="Usar esta categoría"
           data-ayuda="Para lo que no está en la lista. Queda guardada para la próxima vez."
           data-falta="Escribe un nombre para tu categoría y elige su ícono." hidden>
        <span hidden data-contexto id="gfijo-ctx-nueva"></span>
        <div class="gfijo-nueva__campo">
          <label for="gfijo-categoria-nueva-nombre" class="label">¿Cómo se llama?</label>
          <input id="gfijo-categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
                 placeholder="Ej. Parqueadero, Clases de inglés" autocomplete="off" required aria-required="true" />
        </div>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono', label: 'Elige un ícono', abierto: true })}
        <p class="form-hint">La encontrarás en «Tus categorías» al registrar otro gasto fijo.</p>
      </div>

      <div id="gfijo-cuando" data-pregunta="¿Cuándo lo pagas?" data-pregunta-id="cuando" data-paso="Cuándo" data-resumen-orden="3"
           data-falta="Toca el día de pago.">
        <span hidden data-contexto id="gfijo-ctx-cuando"></span>
        <div class="form-group" data-resumen-parte="Periodicidad" data-resumen-orden="4">
          ${icono('i-recurring')}
          <span class="label" id="gfijo-frecuencia-label">Cada cuánto</span>
          <span hidden data-resumen-valor id="gfijo-resumen-frecuencia"></span>
          <div class="fecha-chips" role="radiogroup" aria-labelledby="gfijo-frecuencia-label">
            ${chipsFrecuencia}
          </div>
          <div class="fecha-otra" id="gfijo-frecuencia-otra" hidden>
            <div class="fecha-chips gfijo-otras" role="radiogroup" aria-label="Otra periodicidad">${chipsOtra}
            </div>
            <label for="gfijo-frecuencia" class="sr-only">Frecuencia</label>
            <select id="gfijo-frecuencia" name="frecuencia" class="input" required aria-required="true">
              ${frecOpts}
            </select>
          </div>
        </div>

        <div class="form-group" data-control="dia" data-resumen-parte="Fecha de pago" data-resumen-orden="3">
          ${icono('i-agenda')}
          <span hidden data-resumen-valor id="gfijo-resumen-dia"></span>
          <span hidden data-resumen-sub id="gfijo-resumen-inicio"></span>
          <label for="gfijo-dia" class="label">Qué día</label>
          <input id="gfijo-dia" name="diaPago" class="input" type="number" inputmode="numeric"
                 min="1" max="31" step="1" placeholder="Del 1 al 31" required aria-required="true"
                 aria-describedby="gfijo-banner" />
        </div>

        <div class="form-group" id="gfijo-inicio">
          <label for="gfijo-fecha-inicio" class="label">¿Desde cuándo lo pagas? <span class="form-optional">Opcional</span></label>
          <input id="gfijo-fecha-inicio" name="fechaInicio" class="input" type="date" aria-describedby="gfijo-inicio-ayuda"
                 data-vacio="Primer pago (opcional)" />
          <p class="form-hint" id="gfijo-inicio-ayuda">Si ya lo venías pagando, la fecha del primer pago. Sin ella, el primero es el próximo día de pago.</p>
        </div>

        <div class="aviso-cal" data-resumen-aviso>
          <svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg>
          <p class="form-hint form-hint--info" id="gfijo-banner" aria-live="polite">${textoBannerGastoFijo('Mensual', '')}</p>
        </div>
      </div>

      <div class="form-disclosure" id="gfijo-mas">
        <button type="button" class="form-disclosure__trigger" aria-expanded="false" aria-controls="gfijo-mas-panel">
          <svg class="icon" aria-hidden="true"><use href="#i-mas"/></svg>
          <span class="form-disclosure__text">
            <span class="form-disclosure__title">Más opciones</span>
            <span class="form-disclosure__desc" id="gfijo-mas-desc">${debito ? 'Débito automático' : 'Nota'} &middot; opcional</span>
          </span>
          <svg class="icon form-disclosure__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        <div class="form-disclosure__panel" id="gfijo-mas-panel" hidden>
          <div id="gfijo-ranura-nota" data-opcional="Nota" hidden></div>
          ${htmlCamposPago('gfijo')}
          ${debito ? `<div id="gfijo-ranura-debito" data-opcional="Débito automático">${debito}</div>` : ''}
        </div>
      </div>

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Guardar gasto fijo</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL: ABONAR A DEUDA (ADR 002) ───────────────────

/**
 * Devuelve el HTML del formulario para registrar un abono a una deuda.
 *
 * Incluye el selector de tarjetas (mismo patrón que Gastos): el usuario elige
 * la cuenta de origen y, si no alcanza para cubrir el abono, el reparto entre
 * varias cuentas se resuelve al confirmar (`resolverPagoConPreferida`), sin
 * dejar ninguna en negativo. Si no hay ninguna cuenta activa, muestra un
 * estado vacío con instrucción.
 *
 * @param {import('../../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderFormAbono(deuda) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);
  if (cuentas.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-state__desc">Un abono necesita una cuenta activa de donde salga el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-action="modal-close">Ahora no</button>
          <button type="button" class="btn btn-primary" data-action="ir-a-crear-cuenta">Crear una cuenta</button>
        </div>
      </div>`;
  }

  const saldo = Number(deuda.saldoTotal) || 0;
  const cuota = Number(deuda.cuotaMensual) || 0;
  // `hoy()` y no `toISOString()`: Colombia es UTC-5 y desde las 7 p.m. la fecha
  // UTC ya es mañana, así que el abono quedaba guardado un día adelante
  // (BUG-018). El helper usa los getters locales de Date.
  const fechaHoy = hoy();

  return `
    <form id="form-abono" novalidate
          data-etapas-monto="¿Cuánto abonas?"
          data-atajos="${_esc(JSON.stringify([
            ...(cuota > 0 && cuota < saldo ? [{ t: 'La cuota', v: cuota }] : []),
            ...(saldo > 0 ? [{ t: 'Toda la deuda', v: saldo }] : []),
          ]))}"
          data-saldo="${saldo}"
          data-cuota="${cuota}"
          data-tarjeta="${(Number(deuda.cupoTotal) || 0) > 0 ? '1' : ''}"
          data-tasa="${deuda.tasa != null ? Number((Number(deuda.tasa) * 100).toFixed(4)) : ''}"
          data-tasa-unidad="${_esc(deuda.tasaUnidad ?? '')}">
      <input type="hidden" name="compromisoId" value="${_esc(deuda.id)}" />

      <p class="form-hint form-hint--muted">
        Saldo pendiente de <strong>${_esc(deuda.descripcion)}</strong>:
        <strong>${f(saldo)}</strong>
      </p>

      <div class="form-group">
        <label for="abono-monto" class="label">Monto del abono</label>
        <input id="abono-monto" name="monto" class="input" type="text" placeholder="0"
               value="${cuota > 0 ? miles(Math.min(cuota, saldo)) : ''}"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" data-miles />
        <p class="form-hint form-hint--muted">${cuota > 0 ? `Pre-llenado con tu cuota mensual. ` : ''}Máximo ${f(saldo)}.</p>
        <p id="abono-tip-proyeccion" class="form-hint form-hint--muted" aria-live="polite"></p>
      </div>

      ${renderSelectorCuenta(cuentas, {
        label: '¿De qué cuenta sale el abono?',
        // HF.2a: abre en la cuenta del último abono a esta deuda.
        selectedId: cuentaHabitualDe(deuda.id, S.gastos, S.cuentas),
      })}

      <div class="form-group">
        <label for="abono-fecha" class="label">Fecha del abono</label>
        <input id="abono-fecha" name="fecha" class="input" type="date"
               value="${_esc(fechaHoy)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="abono-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
        <input id="abono-nota" name="nota" class="input" type="text"
               placeholder="Ej. Cuota extra de mayo" autocomplete="off" />
      </div>

      <p class="form-hint form-hint--info">
        Cada abono, grande o pequeño, es un paso real hacia quedar libre de esta deuda.
      </p>

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL: SACAR UN AVANCE (AVC.1b, ADR 169) ──────────

/**
 * Lo que tiene el Fondo de emergencia, si está activo: su monto más sus
 * aportes. La misma cuenta que hace Distribuir (`tesoreria/logic/distribucion.js`):
 * se lee del estado sin importar el dominio de Ahorro (ADR 060).
 * @returns {number} 0 si no hay fondo activo.
 */
function _montoFondo() {
  const ahorro = S.ahorro;
  if (ahorro?.fondoEmergencia?.activo !== true) return 0;
  return (Number(ahorro.fondoEmergencia.montoActual) || 0)
    + (ahorro.aportes ?? []).reduce((acc, a) => acc + (Number(a?.monto) || 0), 0);
}

/**
 * "Sacar un avance" (ADR 169 D1 a D3): un formulario de mover dinero. En el
 * teléfono, `data-etapas-monto` lo pasa a Monto · Revisar con el teclado de
 * Finko (ADR 142 D4); en escritorio se ve entero.
 *
 * - ¿A dónde llegó?: las cuentas de dinero con Efectivo primero. Sin cuenta
 *   Efectivo, la primera opción es una nueva (`EFECTIVO_NUEVO`), que se crea
 *   al guardar.
 * - Las cuotas, sin ninguna marcada: el plazo cambia el costo y lo decide
 *   quien sacó el avance.
 * - La tasa solo se pide si la tarjeta no la tiene, y se guarda en ella.
 * - El costo en pesos (`#avance-costo`) y la línea del fondo van al final,
 *   antes de guardar. Los llena `compromisos/index.js` mientras se escribe.
 *
 * @param {import('../../../core/state.js').Compromiso} tarjeta  Una tarjeta operable.
 * @returns {string}
 */
export function renderFormAvance(tarjeta) {
  const activas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const efectivo = activas.find(c => c.banco === 'Efectivo');
  const destinos = efectivo
    ? [efectivo, ...activas.filter(c => c !== efectivo)]
    : [{ id: EFECTIVO_NUEVO, nombre: 'Efectivo', banco: 'Efectivo', saldo: 0, activa: true }, ...activas];
  const disponible = Math.max((Number(tarjeta.cupoTotal) || 0) - (Number(tarjeta.saldoTotal) || 0), 0);
  const tasaEA = tasaEADe(tarjeta);
  const pideTasa = !(tasaEA > 0);
  const fondo = _montoFondo();

  return `
    <form id="form-avance" novalidate
          data-etapas-monto="¿Cuánto sacaste?"
          data-tasa-ea="${pideTasa ? '' : tasaEA}"
          data-disponible="${disponible}">
      <input type="hidden" name="tarjetaId" value="${_esc(tarjeta.id)}" />

      <p class="form-hint form-hint--muted">
        Sale del cupo de <strong>${_esc(tarjeta.descripcion)}</strong>: te quedan
        <strong>${f(disponible)}</strong> disponibles.
      </p>

      <div class="form-group">
        <label for="avance-monto" class="label">¿Cuánto sacaste?</label>
        <input id="avance-monto" name="monto" class="input" type="text" placeholder="0"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" data-miles />
        <p id="avance-sobrecupo" class="form-hint form-hint--info" aria-live="polite" hidden></p>
      </div>

      ${renderSelectorCuenta(destinos, { label: '¿A dónde llegó?', selectedId: destinos[0].id })}

      <div class="form-group" id="grupo-avance-cuotas">
        <span class="label" id="avance-cuotas-label">¿A cuántas cuotas?</span>
        <div class="fecha-chips fecha-chips--rejilla" role="radiogroup" aria-labelledby="avance-cuotas-label">
          ${CUOTAS_AVANCE.map(n => `
          <label class="chip-fecha">
            <input type="radio" name="cuotas" class="chip-cat__radio" value="${n}" />
            ${n === 1 ? '1 cuota' : `${n} cuotas`}
          </label>`).join('')}
        </div>
      </div>
${pideTasa ? `
      <div class="form-group">
        <label for="avance-tasa" class="label">¿Qué tasa tiene tu tarjeta?</label>
        <input id="avance-tasa" name="tasa" class="input" type="text" placeholder="Ej. 25,5"
               autocomplete="off" inputmode="decimal" />
        <p class="form-hint form-hint--muted">Está en el extracto, como EA. Queda guardada en la tarjeta.</p>
      </div>` : ''}
      <div class="form-group">
        <label for="avance-comision" class="label">¿Cuánto te cobraron de comisión? <span class="form-optional">Opcional</span></label>
        <input id="avance-comision" name="comision" class="input" type="text" placeholder="0"
               autocomplete="off" inputmode="numeric" data-miles />
        <p class="form-hint form-hint--muted">Lo que dice el banco, con IVA. Si lo sacaste de un cajero de otra red, ese retiro tiene su propio costo aparte.</p>
      </div>

      <div class="form-group">
        <label for="avance-fecha" class="label">Fecha del avance</label>
        <input id="avance-fecha" name="fecha" class="input" type="date"
               value="${_esc(hoy())}" required aria-required="true" />
      </div>

      <p class="aviso-ambar" id="avance-costo" aria-live="polite" hidden><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg><span data-avance-costo></span></p>
${fondo > 0 ? `
      <p class="form-hint form-hint--muted" id="avance-fondo">Tu fondo de emergencia tiene ${f(fondo)}. Es para esto.</p>` : ''}
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar avance</button>
      </div>
    </form>`;
}

// ── FORMULARIO DEL MODAL: NUEVA DEUDA ────────────────────────────

/**
 * Devuelve el HTML del formulario de deuda (FORM.1b, ADR 042 D4).
 *
 * El segmented Entidad/Personal vive INLINE al tope del form (reemplaza el
 * chooser de dos pasos que existía antes de FORM.1b: mismo contrato `tipo`
 * en un hidden, un paso menos). Solo se muestra al crear: al editar, el
 * tipo de una deuda ya guardada no cambia (mismo criterio que tenía el
 * flujo de dos pasos, que tampoco lo permitía).
 *
 * Entidad: tasa EA opcional (muchas personas no la conocen; si falta, se guarda
 *          null y la app invita a consultarla para análisis más precisos).
 * Personal: tasa mensual opcional (gota a gota suele cobrar 5-20% mensual).
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @param {import('../../../core/state.js').Compromiso|null} [deuda] Cuando se pasa, activa el modo edición (pre-rellena los campos).
 * @returns {string}
 */
export function renderFormDeuda(tipo, deuda = null, { sinTarjeta = false } = {}) {
  const esEntidad = tipo === 'deuda-entidad';
  // GAS.9d (ADR 183 D4): sin la tarjeta, el formulario dice dónde se agrega.
  const ofreceTarjeta = esEntidad && !sinTarjeta;
  const modoEdit  = deuda !== null;
  const frecOpts  = FRECUENCIAS
    .map(fr => {
      const selFr = modoEdit ? deuda.frecuencia : 'Mensual';
      return `<option value="${_esc(fr)}"${fr === selFr ? ' selected' : ''}>${_esc(fr)}</option>`;
    })
    .join('');

  const tasaLabel = esEntidad
    ? 'Tasa de interés anual (% EA)'
    : 'Tasa de interés mensual (%)';

  const tasaPlaceholder = esEntidad ? '28.5' : '10';

  const tasaHint = esEntidad
    ? 'La encuentras en tu extracto, contrato o la app del banco. ¿No conoces tu tasa? Puedes continuar sin este dato, pero te recomendamos consultarla con tu banco o entidad financiera para obtener recomendaciones más precisas sobre tus deudas.'
    : 'Si no cobra interés, deja el campo en blanco. Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual.';

  const descPlaceholder = !esEntidad ? 'Ej. Mamá, Juan Pérez'
    : ofreceTarjeta ? 'Ej. Tarjeta Visa Bancolombia' : 'Ej. Crédito libre inversión Bancolombia';

  const vDesc  = modoEdit ? _esc(deuda.descripcion ?? '') : '';
  const vSaldo = modoEdit ? (deuda.saldoTotal ?? '') : '';
  const vCuota = modoEdit && deuda.cuotaMensual > 0 ? deuda.cuotaMensual : '';
  // GAS.14a (ADR 189 D1): la tasa se guarda en decimal (0,285 = 28,5 %) y el
  // campo es en porcentaje. Antes el campo mostraba el decimal y cada edición
  // la dividía otra vez entre 100.
  const vTasa  = modoEdit && deuda.tasa != null ? Number((Number(deuda.tasa) * 100).toFixed(4)) : '';
  const vDia   = modoEdit ? (deuda.diaPago ?? '') : '';
  const vCupo  = modoEdit && deuda.cupoTotal != null ? deuda.cupoTotal : '';
  const vNota  = modoEdit ? _esc(deuda.nota ?? '') : '';

  // D.10: el eje "qué/con quién" usa un catálogo distinto según Entidad/Personal.
  // Entidad clasifica el producto (Tarjeta, Vivienda...); Personal, la relación
  // (Familiar, Amigo, Fiado...). Mismo campo `categoria` en el schema.
  const catalogo  = !esEntidad ? CATEGORIAS_DEUDA_PERSONAL
    : ofreceTarjeta ? CATEGORIAS_DEUDA : CATEGORIAS_DEUDA.filter(c => c !== 'Tarjeta de crédito');
  const iconoCat  = esEntidad ? CATEGORIA_DEUDA_ICONO : CATEGORIA_DEUDA_PERSONAL_ICONO;
  // GAS.14d (ADR 189 D4): elegida "Con una persona", lo que sigue es la
  // relación, no otra vez "con quién".
  const catLabel  = esEntidad ? 'Tipo de deuda' : '¿Qué relación tienen?';
  const catSel    = modoEdit ? deuda.categoria : null;
  // ADR 142 D5: "Otra" pide un ícono antes de seguir; las demás avanzan al tocarlas.
  const chipsCategoria = catalogo.map(c => `
        <label class="chip-cat"${c === (esEntidad ? 'Otra' : 'Otro') ? ' data-no-avanza' : ''}>
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(c)}"${c === catSel ? ' checked' : ''} required />
          <svg class="icon" aria-hidden="true"><use href="#${_esc(iconoCat[c])}"/></svg>
          <span class="chip-cat__label">${_esc(c)}</span>
        </label>`).join('');

  // CAT.2d: con 'Otra' (entidad) / 'Otro' (personal), el usuario puede elegir
  // un ícono del picker compartido en vez del fijo c-otros. Grupo oculto salvo
  // que la categoría guardada ya sea la de "otro" (modo edición).
  const categoriaOtra = esEntidad ? 'Otra' : 'Otro';
  const iconoOculto = !(modoEdit && deuda.categoria === categoriaOtra);
  const vIcono = modoEdit ? (deuda.icono ?? null) : null;

  // FORM.1b (ADR 042 D4): "Condiciones del crédito" agrupa solo la TASA en un
  // colapsable. Frecuencia y día de pago quedan siempre visibles a propósito:
  // ambos son obligatorios y el día no tiene un valor por defecto seguro para
  // ocultar (a diferencia de frecuencia, que ya trae 'Mensual' preseleccionado).
  // Abre por defecto si se está editando una deuda que ya tiene tasa guardada.
  const condicionesAbiertas = modoEdit && vTasa !== '';

  // D.14: solo al crear (no al editar) y solo si hay cuentas activas donde
  // acreditar. Toggle apagado por defecto: muchas deudas no entregan dinero
  // directo (tarjeta ya consumida, deuda vieja, crédito que paga a un tercero).
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const bloqueOrigen = (modoEdit || cuentasActivas.length === 0) ? '' : `
      <div data-opcional="Recibí este dinero">
      <div class="form-group">
        <label class="toggle-row">
          <span class="toggle">
            <input type="checkbox" id="comp-recibio-dinero" name="recibioDinero" />
            <span class="toggle__track" aria-hidden="true"></span>
          </span>
          <span class="toggle-row__text">
            <span class="toggle-row__label">Recibí este dinero en una cuenta</span>
            <span class="toggle-row__hint">Actívalo si esta deuda te dio dinero disponible ahora, por ejemplo un préstamo o un giro. Si es una tarjeta ya usada, una deuda vieja o el dinero fue directo a otra persona, déjalo desactivado.</span>
          </span>
        </label>
      </div>
      <div id="grupo-comp-cuenta-origen" hidden>
        ${renderSelectorCuenta(cuentasActivas, { label: '¿En qué cuenta entró el dinero?' })}
      </div>
      </div>`;

  // El segmented solo aparece al crear: al editar el tipo ya está fijado.
  // ADR 142 D5: en el teléfono es la primera pregunta, dos tarjetas grandes
  // que avanzan al tocarlas (el subtítulo solo se ve ahí).
  const segmented = modoEdit ? '' : `
      <div class="tipo-segmented" role="group" aria-label="Tipo de deuda"
           data-pregunta="¿A quién le debes?" data-pregunta-id="tipo" data-resumen="Le debes a"
           data-ayuda="Así te mostramos solo lo que aplica a tu caso.">
        <button type="button" class="tipo-segmented__btn${esEntidad ? ' active' : ''}"
                data-action="comp-elegir-tipo" data-tipo="deuda-entidad" data-pregunta-avanza
                aria-pressed="${esEntidad}">Entidad<span class="tipo-segmented__sub">${sinTarjeta ? 'Un banco: créditos, compras a cuotas' : 'Un banco: tarjetas, créditos, compras a cuotas'}</span></button>
        <button type="button" class="tipo-segmented__btn${esEntidad ? '' : ' active'}"
                data-action="comp-elegir-tipo" data-tipo="deuda-personal" data-pregunta-avanza
                aria-pressed="${!esEntidad}">Personal<span class="tipo-segmented__sub">Familia, amigos, natillera, la tienda que fía</span></button>
      </div>`;
  const debitoHtml = renderBloqueDebitoAutomatico(cuentasActivas, {
    id:         'comp-debito',
    activo:     modoEdit && deuda.debitoAutomatico === true,
    selectedId: modoEdit ? (deuda.cuentaDebitoId ?? null) : null,
  });

  return `
    <form id="form-compromiso" novalidate
          data-preguntas="${modoEdit ? 'Tu deuda' : 'Nueva deuda'}" data-resumen-titulo="Así queda tu deuda"
          data-preguntas-inicio="${modoEdit ? 'resumen' : ''}">
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />

      ${segmented}

      <div data-pregunta="${esEntidad ? '¿Qué tipo de deuda es?' : '¿Qué relación tienen?'}" data-pregunta-id="categoria"
           data-resumen="${esEntidad ? 'Tipo' : 'Relación'}" data-falta="Elige una opción para seguir.">
      <div class="form-group">
        <span class="label" id="comp-categoria-label">${_esc(catLabel)}</span>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="comp-categoria-label">
          ${chipsCategoria}
        </div>
        ${esEntidad && sinTarjeta ? `<p class="form-hint deuda-sin-tarjeta">¿Es una tarjeta de crédito? <button type="button" class="link" data-action="tc-agregar">Agrégala en Mis cuentas</button>, con su cupo: así sabes cuánto te queda.</p>` : ''}
      </div>

      <div class="form-group"${iconoOculto ? ' hidden' : ''} id="grupo-comp-icono">
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'comp-icono', valorActual: vIcono, label: 'Ícono' })}
      </div>
      </div>

      <div class="form-group" data-pregunta="${esEntidad ? '¿Cómo la reconoces?' : '¿Cómo se llama?'}" data-pregunta-id="nombre" data-resumen="Nombre"
           data-ayuda="${esEntidad ? 'Un nombre corto, como aparece en tu extracto o como le dices.' : 'El nombre de quien te prestó, como le dices.'}" data-falta="${esEntidad ? 'Ponle un nombre para reconocerla.' : 'Escribe el nombre de quien te prestó.'}">
        <label for="comp-descripcion" class="label">${esEntidad ? '¿Cuál es la deuda?' : 'Nombre de quien te prestó'}</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="${_esc(descPlaceholder)}" required aria-required="true"
               autocomplete="off" value="${vDesc}" />
      </div>

      <div class="monto-hero" data-pregunta="¿Cuánto debes hoy?" data-pregunta-id="saldo" data-resumen="Lo que debes hoy"
           data-ayuda="Lo que te falta pagar, no lo que te prestaron." data-falta="Escribe cuánto debes hoy. Por ejemplo: 3.200.000">
        <label class="monto-hero__label" for="comp-saldo">¿Cuánto debes en total?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="comp-saldo" name="saldoTotal" class="input input--big-amount" type="text" inputmode="numeric" data-miles placeholder="0" required aria-required="true"
                 autocomplete="off" value="${miles(vSaldo)}" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>

      <div class="form-group" id="grupo-comp-cupo" data-opcional="Cupo de la tarjeta"${esEntidad && catSel === 'Tarjeta de crédito' ? '' : ' hidden'}>
        <label for="comp-cupo" class="label">Cupo aprobado de la tarjeta <span class="form-optional">Opcional</span></label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="comp-cupo" name="cupoTotal" class="input input--has-prefix" type="text" inputmode="numeric" data-miles placeholder="0"
                 autocomplete="off" value="${miles(vCupo)}" />
        </div>
        <p class="form-hint">Con el cupo, Finko calcula tu disponible y habilita pagar con esta tarjeta desde Gastos.</p>
      </div>

      <div class="form-group" id="grupo-comp-cuota" data-pregunta="¿Cuánto pagas cada mes?" data-pregunta-id="cuota"
           data-resumen="Cuota" data-resumen-sufijo=" al mes" data-falta="Escribe la cuota de cada mes. Por ejemplo: 350.000"
           ${esEntidad ? '' : 'data-ayuda="Si no acordaron una cuota fija, sigue sin escribirla."'}>
        <label for="comp-cuota" class="label">¿Cuánto pagas cada mes?${esEntidad ? '' : ' <span class="form-optional">Opcional</span>'}</label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="comp-cuota" name="cuotaMensual" class="input input--has-prefix" type="text" inputmode="numeric" data-miles placeholder="0"${esEntidad ? ' required aria-required="true"' : ''}
                 autocomplete="off" value="${miles(vCuota)}" />
        </div>
        ${esEntidad ? '' : '<p class="form-hint">Si no acordaron una cuota fija, déjalo en blanco: registras abonos cuando pagues.</p>'}
      </div>

      <div class="form-disclosure" id="grupo-comp-tasa" data-opcional="Tasa de interés"
           data-resumen-sufijo="${esEntidad ? ' % al año' : ' % al mes'}">
        <button type="button" class="form-disclosure__trigger" aria-expanded="${condicionesAbiertas}" aria-controls="comp-tasa-panel">
          <svg class="icon" aria-hidden="true"><use href="#i-percent"/></svg>
          <span class="form-disclosure__text">
            <span class="form-disclosure__title">Condiciones del crédito</span>
            <span class="form-disclosure__desc">Tasa de interés &middot; opcional</span>
          </span>
          <svg class="icon form-disclosure__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        <div class="form-disclosure__panel" id="comp-tasa-panel"${condicionesAbiertas ? '' : ' hidden'}>
          <div class="form-group">
            <label for="comp-tasa" class="label">${_esc(tasaLabel)} <span class="form-optional">Opcional</span></label>
            <div class="tasa-input-group">
              <input id="comp-tasa" name="tasa" class="input" type="number"
                     min="0" max="${esEntidad ? '200' : '100'}" step="0.01"
                     placeholder="${_esc(tasaPlaceholder)}"
                     aria-describedby="comp-tasa-hint"
                     autocomplete="off" value="${vTasa}" />
              <input type="hidden" name="tasaUnidad" value="${esEntidad ? 'EA' : 'mensual'}" />
            </div>
            <p id="comp-tasa-hint" class="form-hint">${esEntidad ? 'Está en tu extracto o en la app del banco.' : 'Si no cobra interés, déjala en blanco.'}
              <button type="button" class="ayuda-tino__btn" data-mini-ayuda="comp-tasa-ayuda" aria-label="¿Dónde encuentro la tasa?">${'<svg class="icon" aria-hidden="true"><use href="#i-info"/></svg>'}</button></p>
            <p class="aviso-ambar" id="comp-tasa-aviso" role="status" hidden></p>
          </div>
        </div>
      </div>

      <div class="form-group" id="grupo-comp-frecuencia" data-opcional="Frecuencia">
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group" data-pregunta="¿Qué día pagas la cuota?" data-pregunta-id="dia" data-control="dia"
           data-resumen="Día de pago" data-ayuda="Ese día te la recordamos en Por pagar." data-falta="Elige el día en que pagas.">
        <label for="comp-dia" class="label">Día de pago del mes</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="Del 1 al 31" required aria-required="true"
               value="${vDia}" />
        ${esEntidad ? '' : '<p class="form-hint">Si acordaron una fecha, usa ese día; si no, uno que te sirva de recordatorio.</p>'}
      </div>

      <div class="form-group" data-opcional="Nota">
        <label for="comp-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
        <input id="comp-nota" name="nota" class="input" type="text" maxlength="80"
               placeholder="Ej. Número de cuenta, referencia de pago"
               value="${vNota}" />
        <p class="form-hint">Se muestra junto a la deuda en el asistente de "Distribuir mi ingreso".</p>
      </div>

      ${bloqueOrigen}

      ${esEntidad ? '' : htmlCamposPago('comp', deuda?.datosPago ?? null)}

      ${debitoHtml ? `<div data-opcional="Se debita sola">${debitoHtml}</div>` : ''}

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${modoEdit ? 'Actualizar deuda' : 'Guardar deuda'}</button>
      </div>
      ${htmlMiniHoja({
        id: 'comp-tasa-ayuda',
        titulo: '¿Dónde está la tasa?',
        cuerpo: `<div class="ayuda-tino">${htmlTinoSol('explica', { tamano: 96 })}<p class="ayuda-tino__txt">${_esc(tasaHint)}</p></div>`,
        pie: '<button type="button" class="btn btn-primary" data-mini-cerrar>Entendido</button>',
      })}
    </form>`;
}
