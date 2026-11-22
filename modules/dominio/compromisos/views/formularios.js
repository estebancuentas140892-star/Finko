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
import { marcasDeCategoriaAgenda, tejaMarca, resolverMarca } from '../../../infra/marcas.js';
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

/**
 * Las entidades del paso "Crédito" (GAS.15b, lienzo "Gastos · Rediseño
 * integral", página 7), con su nombre corto. "Otra" pide el nombre.
 */
export const ENTIDADES_DEUDA = Object.freeze([
  ['Bancolombia', 'Bancolombia'], ['Davivienda', 'Davivienda'], ['BBVA Colombia', 'BBVA'],
  ['Banco de Bogotá', 'Banco de Bogotá'], ['Banco Popular', 'Banco Popular'], ['Scotiabank Colpatria', 'Colpatria'],
  ['Banco de Occidente', 'Occidente'], ['Banco AV Villas', 'AV Villas'], ['Nubank', 'Nubank'],
  ['Lulo Bank', 'Lulo Bank'], ['Daviplata', 'Daviplata'],
]);

/**
 * Cómo se lee cada categoría guardada en los chips del lienzo. El valor
 * guardado no cambia (no se migra nada): "Educativo" se lee "Estudio".
 */
export const ETIQUETA_CATEGORIA_DEUDA = Object.freeze({
  'Educativo': 'Estudio',
  'Otra': 'Otro',
  'Prestamista particular': 'Prestamista',
  'Fiado': 'La tienda (fiado)',
});
export const etiquetaCategoriaDeuda = (c) => ETIQUETA_CATEGORIA_DEUDA[c] ?? c;

/** El nombre de una deuda con entidad: lo que es y con quién ("Libre inversión Davivienda"). */
export function nombreDeudaEntidad(categoria, entidad) {
  const que = categoria === 'Tarjeta de crédito' ? 'Tarjeta'
    : categoria === 'Otra' || !categoria ? 'Crédito'
      : etiquetaCategoriaDeuda(categoria);
  return [que, String(entidad ?? '').trim()].filter(Boolean).join(' ');
}

/** Cómo se paga una deuda guardada: 'cuota', 'fecha' o 'cuando' (GAS.15b). */
export function formaPagoDeDeuda(deuda) {
  if (!deuda) return null;
  if (deuda.frecuencia === 'Única vez' && deuda.fechaInicio) return 'fecha';
  return (Number(deuda.cuotaMensual) || 0) > 0 ? 'cuota' : 'cuando';
}

/** Las iniciales de un nombre ("Juan Diego" → "JD"). */
export function inicialesNombre(nombre) {
  return String(nombre ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(p => p.charAt(0).toUpperCase()).join('');
}

/**
 * La cabecera de la factura de una deuda (GAS.15b): la teja (el logo de la
 * entidad, la de su tipo o las iniciales de la persona), lo que es y de
 * quién. '' si todavía no hay nada que decir.
 *
 * @param {{ tipo: string, categoria?: string|null, entidad?: string, nombre?: string }} d
 * @returns {string}
 */
export function htmlFacturaQuienDeuda({ tipo, categoria = null, entidad = '', nombre = '' }) {
  if (tipo === 'deuda-personal') {
    const n = String(nombre ?? '').trim();
    if (!n) return '';
    return `<span class="factura__quien-teja factura__quien-teja--persona">${_esc(inicialesNombre(n))}</span>`
      + `<span class="factura__quien-txt"><span class="factura__quien-n">${_esc(n)}</span>`
      + `${categoria ? `<span class="factura__quien-s">${_esc(etiquetaCategoriaDeuda(categoria))}</span>` : ''}</span>`;
  }
  const ent = String(entidad ?? '').trim();
  if (!categoria && !ent) return '';
  const marca = ent ? resolverMarca(ent) : null;
  const teja = marca ? tejaMarca(marca)
    : `<span class="factura__quien-ico"><svg class="icon" aria-hidden="true"><use href="#${_esc(CATEGORIA_DEUDA_ICONO[categoria] ?? 'c-otros')}"/></svg></span>`;
  const que = categoria === 'Tarjeta de crédito' ? 'Tarjeta de crédito'
    : categoria && categoria !== 'Otra' ? etiquetaCategoriaDeuda(categoria) : 'Crédito';
  const corto = ENTIDADES_DEUDA.find(([id]) => id === ent)?.[1] ?? ent;
  return `<span class="factura__quien-teja">${teja}</span>`
    + `<span class="factura__quien-txt"><span class="factura__quien-n">${_esc(que)}</span>`
    + `${corto ? `<span class="factura__quien-s">${_esc(corto)}</span>` : ''}</span>`;
}

/** Los días rápidos de "Qué día" en la deuda con una persona. */
const _DIAS_RAPIDOS = [5, 10, 15, 20, 30];

// ── FORMULARIO DEL MODAL: NUEVA DEUDA ────────────────────────────

/**
 * Devuelve el HTML del formulario de deuda.
 *
 * GAS.15b ([ADR 191](../../../../docs/DECISIONS/191-las-deudas-del-lienzo.md)):
 * los pasos de la página 7 del lienzo. Con una entidad: Crédito (tipo de
 * crédito y entidad en la misma pantalla) · Cuánto · Cuota (la cuota y el
 * día) · Revisar. Con una persona: Quién (el nombre y qué es tuyo) · Cuánto ·
 * Cómo pagas (una cuota cada mes, todo en una fecha o cuando pueda) ·
 * Revisar. El nombre de la deuda con entidad sale de lo elegido ("Libre
 * inversión Davivienda"). "¿Con quién es?" solo se pregunta cuando no se
 * sabe (`conTipo` en false): desde "Agregar deuda con una entidad" no se
 * vuelve a preguntar.
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @param {import('../../../core/state.js').Compromiso|null} [deuda] Cuando se pasa, activa el modo edición (pre-rellena los campos).
 * @param {{ sinTarjeta?: boolean, conTipo?: boolean }} [opciones]
 * @returns {string}
 */
export function renderFormDeuda(tipo, deuda = null, { sinTarjeta = false, conTipo = false } = {}) {
  const esEntidad = tipo === 'deuda-entidad';
  // GAS.9d (ADR 183 D4): sin la tarjeta, el formulario dice dónde se agrega.
  const ofreceTarjeta = esEntidad && !sinTarjeta;
  const modoEdit  = deuda !== null;
  const frecSel   = modoEdit ? (deuda.frecuencia || 'Mensual') : 'Mensual';
  const frecOpts  = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === frecSel ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const vSaldo = modoEdit ? (deuda.saldoTotal ?? '') : '';
  const vCuota = modoEdit && deuda.cuotaMensual > 0 ? deuda.cuotaMensual : '';
  // GAS.14a (ADR 189 D1): la tasa se guarda en decimal y el campo es en porcentaje.
  const vTasa  = modoEdit && deuda.tasa != null && !(tipo === 'deuda-personal' && !(Number(deuda.tasa) > 0))
    ? Number((Number(deuda.tasa) * 100).toFixed(4)) : '';
  const vDia   = modoEdit ? (deuda.diaPago ?? '') : '';
  const vCupo  = modoEdit && deuda.cupoTotal != null ? deuda.cupoTotal : '';
  const vNota  = modoEdit ? _esc(deuda.nota ?? '') : '';
  const catSel = modoEdit ? deuda.categoria : null;

  const catalogo  = !esEntidad ? CATEGORIAS_DEUDA_PERSONAL
    : ofreceTarjeta ? CATEGORIAS_DEUDA : CATEGORIAS_DEUDA.filter(c => c !== 'Tarjeta de crédito');
  const iconoCat  = esEntidad ? CATEGORIA_DEUDA_ICONO : CATEGORIA_DEUDA_PERSONAL_ICONO;
  const categoriaOtra = esEntidad ? 'Otra' : 'Otro';
  const chipsCategoria = catalogo.map(c => `
          <label class="chip-cat">
            <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(c)}"${c === catSel ? ' checked' : ''} required />
            <svg class="icon" aria-hidden="true"><use href="#${_esc(iconoCat[c])}"/></svg>
            <span class="chip-cat__label">${_esc(etiquetaCategoriaDeuda(c))}</span>
          </label>`).join('');
  // CAT.2d: con 'Otra' / 'Otro', el ícono del picker compartido.
  const iconoOculto = !(modoEdit && deuda.categoria === categoriaOtra);
  const vIcono = modoEdit ? (deuda.icono ?? null) : null;
  const pickerIcono = `
        <div class="form-group"${iconoOculto ? ' hidden' : ''} id="grupo-comp-icono">
          ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'comp-icono', valorActual: vIcono, label: 'Ícono' })}
        </div>`;

  // D.14: solo al crear y con cuentas activas: el dinero de la deuda entró a una cuenta.
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
  const debitoHtml = renderBloqueDebitoAutomatico(cuentasActivas, {
    id:         'comp-debito',
    activo:     modoEdit && deuda.debitoAutomatico === true,
    selectedId: modoEdit ? (deuda.cuentaDebitoId ?? null) : null,
  });

  const pasoUno = esEntidad ? 'Crédito' : 'Quién';
  const pasoTres = esEntidad ? 'Cuota' : 'Cómo pagas';
  const pasos = `${pasoUno}|Cuánto|${pasoTres}|Revisar`;

  // "¿Con quién es?" (DeudaInicio del lienzo): solo cuando no se sabe.
  const logos = ['Bancolombia', 'Davivienda', 'BBVA Colombia', 'Banco de Bogotá']
    .map(id => resolverMarca(id)).filter(Boolean)
    .map(m => `<span class="deuda-con__logo">${tejaMarca(m)}</span>`).join('');
  const avatares = ['AM', 'L', 'R'].map(i => `<span class="deuda-con__avatar">${i}</span>`).join('');
  const conQuien = (modoEdit || conTipo) ? '' : `
      <div class="deuda-con" role="group" aria-label="Con quién es la deuda"
           data-pregunta="¿Con quién es?" data-pregunta-id="tipo" data-paso="${_esc(pasoUno)}" data-resumen="">
        <button type="button" class="deuda-con__op${esEntidad ? ' active' : ''}"
                data-action="comp-elegir-tipo" data-tipo="deuda-entidad" data-pregunta-avanza aria-pressed="${esEntidad}">
          <span class="deuda-con__ico" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#c-edificio"/></svg></span>
          <span class="deuda-con__txt"><span class="deuda-con__t">Con un banco o entidad</span>
          <span class="deuda-con__s">Libre inversión, vivienda, vehículo, estudio, compras a cuotas</span>
          <span class="deuda-con__fila" aria-hidden="true">${logos}</span></span>
          <svg class="icon deuda-con__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        <button type="button" class="deuda-con__op${esEntidad ? '' : ' active'}"
                data-action="comp-elegir-tipo" data-tipo="deuda-personal" data-pregunta-avanza aria-pressed="${!esEntidad}">
          <span class="deuda-con__ico" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-personales"/></svg></span>
          <span class="deuda-con__txt"><span class="deuda-con__t">Con una persona</span>
          <span class="deuda-con__s">Familia, amigos, natillera, prestamista o la tienda que fía</span>
          <span class="deuda-con__fila" aria-hidden="true">${avatares}</span></span>
          <svg class="icon deuda-con__chev" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        ${sinTarjeta ? `<button type="button" class="deuda-con__tarjeta" data-action="tc-agregar"><svg class="icon" aria-hidden="true"><use href="#i-deudas"/></svg><span>¿Es una tarjeta de crédito? <b>Se agrega en Mis cuentas</b></span><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>` : ''}
      </div>`;

  const saldo = `
      <div class="monto-hero" data-pregunta="¿Cuánto debes hoy?" data-pregunta-id="saldo" data-paso="Cuánto" data-seguir="Continuar"
           data-resumen="${esEntidad ? 'debes hoy' : 'le debes'}"
           data-ayuda="Lo que te falta pagar, no lo que te prestaron." data-falta="Escribe cuánto debes hoy. Por ejemplo: 3.200.000">
        <label class="monto-hero__label" for="comp-saldo">¿Cuánto debes en total?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="comp-saldo" name="saldoTotal" class="input input--big-amount" type="text" inputmode="numeric" data-miles placeholder="0" required aria-required="true"
                 autocomplete="off" value="${miles(vSaldo)}" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>`;

  const nota = `
      <div class="form-group" data-opcional="Nota">
        <label for="comp-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
        <input id="comp-nota" name="nota" class="input" type="text" maxlength="80"
               placeholder="Ej. Número de cuenta, referencia de pago"
               value="${vNota}" />
        <p class="form-hint">Se muestra junto a la deuda en el asistente de "Distribuir mi ingreso".</p>
      </div>`;
  const frecuencia = `
      <div class="form-group" id="grupo-comp-frecuencia" data-opcional="Frecuencia"${frecSel === 'Mensual' || frecSel === 'Única vez' ? ' hidden' : ''}>
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>`;
  const debito = debitoHtml ? `<div data-opcional="Débito automático">${debitoHtml}</div>` : '';
  const pie = `
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${modoEdit ? 'Actualizar deuda' : 'Guardar deuda'}</button>
      </div>`;

  if (esEntidad) {
    // El nombre sale de lo elegido; al editar, se conserva el que tenía hasta
    // cambiar el crédito o la entidad.
    const marcaGuardada = modoEdit ? resolverMarca(deuda.descripcion) : null;
    const entidadGuardada = marcaGuardada && ENTIDADES_DEUDA.some(([id]) => id === marcaGuardada.id) ? marcaGuardada.id : null;
    const otraGuardada = modoEdit && !entidadGuardada;
    const vDesc = modoEdit ? (deuda.descripcion ?? '') : '';
    const auto = !modoEdit || vDesc === nombreDeudaEntidad(deuda.categoria, entidadGuardada ?? '');
    const opcionesEntidad = ENTIDADES_DEUDA.map(([id, corto]) => {
      const m = resolverMarca(id);
      return `
          <label class="deuda-entidad__op">
            <input type="radio" class="deuda-entidad__radio" name="entidad" value="${_esc(id)}"${id === entidadGuardada ? ' checked' : ''} required />
            <span class="deuda-entidad__teja" aria-hidden="true">${m ? tejaMarca(m) : ''}</span>
            <span class="deuda-entidad__n">${_esc(corto)}</span>
          </label>`;
    }).join('');
    const tasaHint = 'La encuentras en tu extracto, contrato o la app del banco. ¿No conoces tu tasa? Puedes continuar sin este dato, pero te recomendamos consultarla con tu banco o entidad financiera para obtener recomendaciones más precisas sobre tus deudas.';
    return `
    <form id="form-compromiso" novalidate
          data-preguntas="${modoEdit ? 'Tu deuda' : 'Nueva deuda'}" data-resumen-titulo="Así queda tu deuda"
          data-preguntas-inicio="${modoEdit ? 'resumen' : ''}" data-pasos="${_esc(pasos)}" data-pasos-elegido
          data-factura-tipo="Deuda" data-resumen-opcionales="Débito automático|Tasa de interés|Cuotas que faltan|Cupo de la tarjeta|Frecuencia|Nota|Recibí este dinero">
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />
      <input type="hidden" id="comp-descripcion" name="descripcion" value="${_esc(vDesc)}"${auto ? ' data-auto' : ''} />
      <div hidden data-factura-quien id="comp-factura-quien"></div>
      ${conQuien}

      <div class="deuda-credito" data-pregunta="¿Qué crédito es?" data-titulo-oculto data-pregunta-id="credito" data-paso="Crédito" data-seguir="Continuar"
           data-no-avanza data-resumen="" data-falta="Elige el tipo de crédito y la entidad.">
        <span hidden data-etapa-valor id="comp-credito-elegido"></span>
        <div class="form-group">
          <h4 class="deuda-paso__k" id="comp-categoria-label">Tipo de crédito</h4>
          <div class="deuda-chips deuda-credito__tipos" role="radiogroup" aria-labelledby="comp-categoria-label">
            ${chipsCategoria}
          </div>
          ${sinTarjeta ? '<p class="form-hint deuda-sin-tarjeta">¿Es una tarjeta de crédito? <button type="button" class="link" data-action="tc-agregar">Agrégala en Mis cuentas</button>, con su cupo: así sabes cuánto te queda.</p>' : ''}
        </div>
        ${pickerIcono}
        <div class="form-group">
          <h4 class="deuda-paso__k" id="comp-entidad-label">Entidad</h4>
          <div class="deuda-entidad" role="radiogroup" aria-labelledby="comp-entidad-label">
            ${opcionesEntidad}
            <label class="deuda-entidad__op deuda-entidad__op--otra">
              <input type="radio" class="deuda-entidad__radio" name="entidad" value="otra"${otraGuardada ? ' checked' : ''} required />
              <span class="deuda-entidad__teja deuda-entidad__teja--otra" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></span>
              <span class="deuda-entidad__n">Otra</span>
            </label>
          </div>
          <div class="form-group deuda-entidad__nombre"${otraGuardada ? '' : ' hidden'} id="grupo-comp-entidad-otra">
            <label for="comp-entidad-otra" class="label">¿Cuál entidad?</label>
            <input id="comp-entidad-otra" name="entidadOtra" class="input" type="text" autocomplete="off"
                   placeholder="Ej. Cooperativa Confiar" value="${otraGuardada ? _esc(vDesc) : ''}"${otraGuardada ? ' required' : ''} />
          </div>
        </div>
      </div>

      ${saldo}

      <div class="form-group" id="grupo-comp-cupo" data-opcional="Cupo de la tarjeta"${catSel === 'Tarjeta de crédito' ? '' : ' hidden'}>
        <label for="comp-cupo" class="label">Cupo aprobado de la tarjeta <span class="form-optional">Opcional</span></label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="comp-cupo" name="cupoTotal" class="input input--has-prefix" type="text" inputmode="numeric" data-miles placeholder="0"
                 autocomplete="off" value="${miles(vCupo)}" />
        </div>
        <p class="form-hint">Con el cupo, Finko calcula tu disponible y habilita pagar con esta tarjeta desde Gastos.</p>
      </div>

      <div class="deuda-cuota" id="grupo-comp-cuota" data-pregunta="¿Cuánto y qué día pagas?" data-titulo-oculto data-pregunta-id="cuota"
           data-paso="Cuota" data-seguir="Continuar" data-no-avanza data-sin-teclado data-resumen="Cuota" data-falta="Escribe la cuota de cada mes y elige el día en que pagas.">
        <span hidden data-resumen-valor id="comp-cuota-resumen"></span>
        <span hidden data-etapa-valor id="comp-cuota-elegido"></span>
        <label class="deuda-monto" for="comp-cuota">
          <span class="deuda-monto__k">Cuota de cada mes</span>
          <span class="deuda-monto__caja"><span class="deuda-monto__signo" aria-hidden="true">$</span>
          <input id="comp-cuota" name="cuotaMensual" class="deuda-monto__in" type="text" inputmode="numeric" data-miles placeholder="0" required aria-required="true"
                 autocomplete="off" value="${miles(vCuota)}" /></span>
        </label>
        <h4 class="deuda-paso__k">Qué día pagas</h4>
        <div class="form-group" data-control="dia">
          <label for="comp-dia" class="label sr-only">Día de pago del mes</label>
          <input id="comp-dia" name="diaPago" class="input" type="number" min="1" max="31" step="1" placeholder="Del 1 al 31" required aria-required="true" value="${vDia}" />
        </div>
      </div>

      ${frecuencia}

      <div class="form-group" id="grupo-comp-tasa" data-opcional="Tasa de interés" data-resumen-sufijo=" % E.A.">
        <label for="comp-tasa" class="label">Tasa de interés anual (% E.A.) <span class="form-optional">Opcional</span></label>
        <input id="comp-tasa" name="tasa" class="input" type="number" min="0" max="200" step="0.01" placeholder="28.5"
               aria-describedby="comp-tasa-hint" autocomplete="off" value="${vTasa}" />
        <input type="hidden" name="tasaUnidad" value="EA" />
        <p id="comp-tasa-hint" class="form-hint">Está en tu extracto o en la app del banco.
          <button type="button" class="ayuda-tino__btn" data-mini-ayuda="comp-tasa-ayuda" aria-label="¿Dónde encuentro la tasa?"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg></button></p>
        <p class="aviso-ambar" id="comp-tasa-aviso" role="status" hidden></p>
      </div>

      <div class="form-group" data-opcional="Cuotas que faltan" data-resumen-sufijo=" cuotas">
        <label for="comp-cuotas-restantes" class="label">¿Cuántas cuotas te faltan? <span class="form-optional">Opcional</span></label>
        <input id="comp-cuotas-restantes" name="cuotasRestantes" class="input" type="number" min="1" max="600" step="1" inputmode="numeric"
               placeholder="Ej. 24" autocomplete="off" value="${modoEdit && deuda.cuotasRestantes ? _esc(deuda.cuotasRestantes) : ''}" />
        <p class="form-hint">Está en tu extracto o en la app del banco. Si no lo sabes, déjalo en blanco.</p>
      </div>

      ${nota}
      ${bloqueOrigen}
      ${debito}
      ${pie}
      ${htmlMiniHoja({
        id: 'comp-tasa-ayuda',
        titulo: '¿Dónde está la tasa?',
        cuerpo: `<div class="ayuda-tino">${htmlTinoSol('explica', { tamano: 96 })}<p class="ayuda-tino__txt">${_esc(tasaHint)}</p></div>`,
        pie: '<button type="button" class="btn btn-primary" data-mini-cerrar>Entendido</button>',
      })}
    </form>`;
  }

  // ── Con una persona ──
  const vNombre = modoEdit ? _esc(deuda.descripcion ?? '') : '';
  const forma = modoEdit ? formaPagoDeDeuda(deuda) : null;
  const diaRapido = _DIAS_RAPIDOS.includes(Number(vDia)) ? Number(vDia) : null;
  const diaOtro = forma === 'cuota' && vDia && !diaRapido;
  const chipsDia = _DIAS_RAPIDOS.map(d => `
              <button type="button" class="deuda-dia" data-dia-rapido="${d}" aria-pressed="${forma === 'cuota' && d === diaRapido}">${d}</button>`).join('');
  const vFechaUnica = forma === 'fecha' ? _esc(deuda.fechaInicio) : '';
  const vPrestamo = modoEdit ? _esc(deuda.fechaPrestamo ?? String(deuda.fechaCreacion ?? '').slice(0, 10)) : hoy();
  const cobra = modoEdit && Number(deuda.tasa) > 0;
  const opcionForma = (valor, titulo, sub, mas = '') => `
        <div class="deuda-forma${forma === valor ? ' deuda-forma--on' : ''}" data-forma="${valor}">
          <label class="deuda-forma__op">
            <input type="radio" class="deuda-forma__radio" name="formaPago" value="${valor}"${forma === valor ? ' checked' : ''} required />
            <span class="deuda-forma__punto" aria-hidden="true"></span>
            <span class="deuda-forma__txt"><span class="deuda-forma__t">${titulo}</span><span class="deuda-forma__s">${sub}</span></span>
          </label>${mas}
        </div>`;
  return `
    <form id="form-compromiso" novalidate
          data-preguntas="${modoEdit ? 'Tu deuda' : 'Nueva deuda'}" data-resumen-titulo="Así queda tu deuda"
          data-preguntas-inicio="${modoEdit ? 'resumen' : ''}" data-pasos="${_esc(pasos)}" data-pasos-elegido
          data-factura-tipo="Deuda personal" data-resumen-opcionales="Te prestó el|Te cobra interés|Nota|Para pagar|Frecuencia|Débito automático|Recibí este dinero">
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />
      <div hidden data-factura-quien id="comp-factura-quien"></div>
      ${conQuien}

      <div class="deuda-quien" data-pregunta="¿A quién le debes?" data-titulo-oculto data-pregunta-id="nombre" data-paso="Quién" data-seguir="Continuar"
           data-no-avanza data-resumen="" data-falta="Escribe el nombre de quien te prestó y elige qué es tuyo.">
        <span hidden data-etapa-valor id="comp-quien-elegido"></span>
        <label class="deuda-quien__campo" for="comp-descripcion">
          <span class="deuda-paso__k">¿A quién le debes?</span>
          <span class="deuda-quien__caja"><span class="deuda-quien__avatar" id="comp-quien-avatar" aria-hidden="true"></span>
          <input id="comp-descripcion" name="descripcion" class="deuda-quien__in" type="text" placeholder="Ej. Mamá, Juan Pérez"
                 required aria-required="true" autocomplete="off" value="${vNombre}" /></span>
        </label>
        <div class="form-group">
          <h4 class="deuda-paso__k" id="comp-categoria-label">Es tu</h4>
          <div class="deuda-chips" role="radiogroup" aria-labelledby="comp-categoria-label">
            ${chipsCategoria}
          </div>
        </div>
        ${pickerIcono}
      </div>

      ${saldo}

      <div class="deuda-como" data-pregunta="¿Cómo le pagas?" data-titulo-oculto data-pregunta-id="como" data-paso="Cómo pagas" data-seguir="Continuar"
           data-no-avanza data-sin-teclado data-resumen="Le pagas" data-falta="Elige cómo le pagas y completa lo que pide.">
        <span hidden data-resumen-valor id="comp-como-resumen"></span>
        <span hidden data-etapa-valor id="comp-como-elegido"></span>
        <input type="hidden" id="comp-dia" name="diaPago" value="${forma === 'cuando' ? '' : _esc(vDia)}" />
        <input type="hidden" id="comp-fecha-inicio" name="fechaInicio" value="${vFechaUnica}" />
        ${opcionForma('cuota', 'Una cuota cada mes', 'Le pagas lo mismo cada mes', `
          <div class="deuda-forma__mas" data-forma-mas="cuota"${forma === 'cuota' ? '' : ' hidden'}>
            <label class="deuda-monto deuda-monto--chico" for="comp-cuota">
              <span class="deuda-monto__k">Cuota</span>
              <span class="deuda-monto__caja"><span class="deuda-monto__signo" aria-hidden="true">$</span>
              <input id="comp-cuota" name="cuotaMensual" class="deuda-monto__in" type="text" inputmode="numeric" data-miles placeholder="0"
                     autocomplete="off" value="${forma === 'cuota' ? miles(vCuota) : ''}" /></span>
            </label>
            <span class="deuda-paso__k" id="comp-dia-label">Qué día</span>
            <div class="deuda-dias" role="group" aria-labelledby="comp-dia-label">${chipsDia}
              <button type="button" class="deuda-dia deuda-dia--otro" data-dia-rapido="otro" aria-pressed="${Boolean(diaOtro)}">Otro</button>
            </div>
            <div class="form-group deuda-dia-otro"${diaOtro ? '' : ' hidden'}>
              <label for="comp-dia-otro" class="label">Día del mes</label>
              <input id="comp-dia-otro" class="input" type="number" min="1" max="31" step="1" inputmode="numeric" placeholder="Del 1 al 31" value="${diaOtro ? _esc(vDia) : ''}" />
            </div>
          </div>`)}
        ${opcionForma('fecha', 'Todo en una fecha', 'Le pagas todo de una vez', `
          <div class="deuda-forma__mas" data-forma-mas="fecha"${forma === 'fecha' ? '' : ' hidden'}>
            <label for="comp-fecha-unica" class="label">¿Qué día le pagas?</label>
            <input id="comp-fecha-unica" class="input" type="date" value="${vFechaUnica}" />
          </div>`)}
        ${opcionForma('cuando', 'Cuando pueda', 'Sin fecha fija')}
      </div>

      ${frecuencia}

      <div class="form-group" data-opcional="Te prestó el">
        <label for="comp-fecha-prestamo" class="label">¿Cuándo te prestó?</label>
        <input id="comp-fecha-prestamo" name="fechaPrestamo" class="input" type="date" value="${vPrestamo}" max="${hoy()}" />
      </div>

      <div class="form-group" id="grupo-comp-tasa" data-opcional="Te cobra interés" data-resumen-sufijo=" % al mes">
        <label class="toggle-row">
          <span class="toggle">
            <input type="checkbox" id="comp-cobra-interes" name="cobraInteres"${cobra ? ' checked' : ''} />
            <span class="toggle__track" aria-hidden="true"></span>
          </span>
          <span class="toggle-row__text">
            <span class="toggle-row__label">Te cobra interés</span>
            <span class="toggle-row__hint">Los prestamistas particulares suelen cobrar entre 5 % y 20 % al mes.</span>
          </span>
        </label>
        <div class="form-group" id="grupo-comp-tasa-valor"${cobra ? '' : ' hidden'}>
          <label for="comp-tasa" class="label">Tasa de interés mensual (%)</label>
          <input id="comp-tasa" name="tasa" class="input" type="number" min="0" max="100" step="0.01" placeholder="10"
                 autocomplete="off" value="${cobra ? vTasa : ''}" />
          <input type="hidden" name="tasaUnidad" value="mensual" />
          <p class="aviso-ambar" id="comp-tasa-aviso" role="status" hidden></p>
        </div>
      </div>

      ${nota}
      ${htmlCamposPago('comp', deuda?.datosPago ?? null)}
      ${bloqueOrigen}
      ${debito}
      ${pie}
    </form>`;
}
