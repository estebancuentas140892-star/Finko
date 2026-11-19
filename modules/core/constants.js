/**
 * constants.js - constantes legales y de catálogo para Colombia.
 *
 * ── Filosofía: Single Source of Truth ─────────────────────────────
 *
 * Los valores legales anuales (SMMLV, UVT, auxilio de transporte) se
 * almacenan en una tabla histórica indexada por año:
 *   - `LEGAL_POR_ANIO[anio]` → valores anuales (smmlv, uvt, auxilio).
 *
 * El resto del proyecto importa los exports estables (`SMMLV`, `UVT`,
 * `AUXILIO_TRANSPORTE`, `VIGENCIA`, `ANIO_VIGENTE`), que apuntan
 * automáticamente al año vigente según la fecha actual.
 *
 * Nota: la tasa de usura (certificación trimestral de la SFC) se eliminó
 * en 2026-06 por su alto costo de mantenimiento. Ver ADR 004.
 *
 * ── Cómo actualizar valores legales ──────────────────────────────
 *
 * Año nuevo (cada diciembre/enero):
 *   1. Agregar UNA entrada en `LEGAL_POR_ANIO` con los valores oficiales:
 *      2027: { smmlv: ..., auxilioTransporte: ..., uvt: ...,
 *               vigenciaDesde: '2027-01-01', fuentes: { ... } }
 *   2. Listo. Toda la app (UI, cálculos, tests) usa los valores nuevos
 *      automáticamente cuando la fecha del sistema entra en 2027.
 *
 * Reglas:
 *   - Toda constante se exporta con nombre. Sin window.X.
 *   - Las constantes con vencimiento se manejan en este archivo.
 */

// ── TABLA HISTÓRICA: VALORES ANUALES ─────────────────────────────
//
// Cada entrada anual contiene los valores oficiales publicados por el
// Ministerio de Trabajo (SMMLV, auxilio) y la DIAN (UVT).

/** @typedef {{
 *    smmlv: number,
 *    auxilioTransporte: number,
 *    uvt: number,
 *    vigenciaDesde: string,
 *    fuentes: { smmlv: string, auxilio: string, uvt: string }
 *  }} ValoresLegalesAnio */

/** @type {Record<number, ValoresLegalesAnio | null>} */
const LEGAL_POR_ANIO = {
  2025: {
    smmlv:             1_300_000, // Decreto 2292/2024 - incluido para histórico/migraciones
    auxilioTransporte:   162_000,
    uvt:                  47_065,
    vigenciaDesde: '2025-01-01',
    fuentes: {
      smmlv:   'Decreto 2292/2024 (Mintrabajo)',
      auxilio: 'Decreto 2293/2024 (Mintrabajo)',
      uvt:     'Resolución DIAN 000193/2024',
    },
  },
  2026: {
    smmlv:             1_750_905,
    auxilioTransporte:   249_095,
    uvt:                  52_374,
    vigenciaDesde: '2026-01-01',
    fuentes: {
      smmlv:   'Decreto 1469 del 29-12-2025 (Mintrabajo), ratificado por Decreto 0159 del 19-02-2026',
      auxilio: 'Decreto 1470 del 29-12-2025 (Mintrabajo)',
      uvt:     'Resolución DIAN 000238 del 15-12-2025',
    },
  },
  // 2027: agregar aquí cuando se publiquen los decretos/resoluciones
  //       (esperado: última semana de diciembre 2026).
  2027: null,
};

// ── SELECTORES (vigencia dinámica por fecha) ─────────────────────

/**
 * Devuelve los valores legales vigentes en una fecha dada.
 * Si la fecha cae en un año sin entrada (ej. enero 2027 antes de que se
 * publiquen los valores), retorna el último año publicado disponible.
 *
 * @param {Date} [fecha] - Por defecto: ahora.
 * @returns {ValoresLegalesAnio & { anio: number }}
 */
export function legalVigente(fecha = new Date()) {
  const anioActual = fecha.getFullYear();

  // 1) Si hay entrada para el año actual, usarla.
  if (LEGAL_POR_ANIO[anioActual]) {
    return { anio: anioActual, ...LEGAL_POR_ANIO[anioActual] };
  }

  // 2) Fallback: último año publicado anterior o igual al actual.
  const publicados = Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null && a <= anioActual)
    .sort((a, b) => b - a);

  if (publicados.length > 0) {
    const anio = publicados[0];
    return { anio, ...LEGAL_POR_ANIO[anio] };
  }

  // 3) Caso extremo: ningún año publicado ≤ actual (no debería pasar).
  //    Devolver el primer año disponible para no romper la app.
  const anyAnio = Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null)
    .sort()[0];
  return { anio: anyAnio, ...LEGAL_POR_ANIO[anyAnio] };
}

/**
 * Devuelve los valores legales de un año específico (lectura histórica).
 * Útil para reportes o análisis sobre datos antiguos.
 *
 * @param {number} anio
 * @returns {ValoresLegalesAnio | null}
 */
export function legalDelAnio(anio) {
  return LEGAL_POR_ANIO[anio] ?? null;
}

/**
 * Devuelve la lista de años con valores legales publicados.
 * @returns {number[]}
 */
export function aniosPublicados() {
  return Object.keys(LEGAL_POR_ANIO)
    .map(Number)
    .filter(a => LEGAL_POR_ANIO[a] != null)
    .sort((a, b) => a - b);
}

/**
 * Indica si los valores legales que está usando la app corresponden a un año
 * anterior al actual. Ocurre cuando empieza un año nuevo pero todavía no se
 * cargaron en `LEGAL_POR_ANIO` los valores oficiales de ese año: la app cae al
 * último año publicado como referencia provisional (ver `legalVigente`).
 *
 * Las vistas usan este estado para avisar al usuario que las cifras (SMMLV,
 * UVT, topes de renta) pueden estar desactualizadas, en vez de mostrarlas como
 * si fueran del año en curso sin más.
 *
 * @param {Date} [fecha] - Por defecto: ahora.
 * @returns {{ desactualizado: boolean, anioActual: number, anioVigente: number }}
 */
export function estadoVigenciaLegal(fecha = new Date()) {
  const anioActual  = fecha.getFullYear();
  const anioVigente = legalVigente(fecha).anio;
  return {
    desactualizado: anioVigente < anioActual,
    anioActual,
    anioVigente,
  };
}

// ── EXPORTS ESTABLES (los que importa el resto del proyecto) ─────
//
// Estos valores se resuelven una vez al cargar el módulo. Para la mayoría
// de cálculos eso es suficiente (la app se recarga al menos una vez al
// día). Si necesitas el valor para una fecha específica, llama a
// `legalVigente(fecha)` directamente.

const _vigente = legalVigente();

/** Salario Mínimo Mensual Legal Vigente (COP). */
export const SMMLV = _vigente.smmlv;

/** Auxilio de transporte mensual (COP). */
export const AUXILIO_TRANSPORTE = _vigente.auxilioTransporte;

/** Unidad de Valor Tributario (COP). */
export const UVT = _vigente.uvt;

/** Fecha ISO desde la cual rigen los valores vigentes. */
export const VIGENCIA = _vigente.vigenciaDesde;

/** Año al que corresponden los valores vigentes. */
export const ANIO_VIGENTE = _vigente.anio;

// ── OTRAS CONSTANTES NORMATIVAS (sin vencimiento o estables) ─────

/** Gravamen a los Movimientos Financieros (4×1000).
 *  Fuente: Ley 1111/2006. Estable. */
export const GMF = 0.004;
/** GMF.1 (ADR 165): lo que no paga al mes la cuenta marcada (ET art. 879 num. 1). */
export const GMF_EXENTO_UVT = 350;
/** Lo que no paga al mes un depósito de bajo monto, aparte (ET art. 879 num. 25). */
export const GMF_BAJO_MONTO_UVT = 65;
/** Billeteras de BANCOS_CO que son depósitos de bajo monto. */
export const BANCOS_BAJO_MONTO = Object.freeze(['Nequi', 'Daviplata']);

/** Topes de obligación de declarar renta para personas naturales, expresados
 *  en múltiplos de UVT. Los valores en pesos se derivan en vivo de `UVT`
 *  para que actualizar el UVT del año recalcule todos los topes solos.
 *
 *  Fuente: Estatuto Tributario art. 594-3 y Decreto reglamentario anual.
 *  Estable en el número de UVT desde hace varios años; lo que cambia es la UVT.
 *
 *  Sin tope superado: no obliga declarar por ese criterio (basta con uno
 *  para quedar obligado). El umbral de alerta preventiva es del 80 %. */
export const TOPES_RENTA_UVT = {
  ingresosBrutos:   1400,
  patrimonioBruto:  4500,
  consumosTotales:  1400,
  consumosTC:       1400,
  consignaciones:   1400,
};

/** Porcentaje del tope sobre el cual Finko emite alerta preventiva
 *  ("estás cerca del límite"). Antes era 80; subir es menos sensible. */
export const UMBRAL_ALERTA_RENTA = 0.80;

/** Meta de inflación de largo plazo del Banco de la República (3 % EA).
 *  Referencia de largo plazo; la inflación observada puede diferir.
 *  Fuente: Banco de la República, meta puntual de inflación de largo plazo.
 *  Revisar: anual (la meta puntual es estable en 3 % desde 2010). */
export const INFLACION_OBJETIVO = 0.03;

/** IPC observado por año: variación anual del IPC al cierre de diciembre,
 *  como decimal (0.051 = 5,1 %). Es el dato real de pérdida de poder
 *  adquisitivo, a diferencia de INFLACION_OBJETIVO (meta de BanRep).
 *  Fuente: DANE, boletín técnico IPC de diciembre de cada año.
 *  Revisar: enero de cada año, cuando el DANE publica el cierre (E.5). */
export const IPC_OBSERVADO_POR_ANIO = {
  2024: 0.0520,  // DANE, IPC dic-2024: 5,20 % anual
  2025: 0.0510,  // DANE, IPC dic-2025: 5,10 % anual (boletín de 2026-01-08)
};

/**
 * IPC observado más reciente publicado, con su año.
 * @returns {{ anio: number, valor: number }} valor como decimal (0.051 = 5,1 %).
 */
export function ipcObservadoVigente() {
  const anios = Object.keys(IPC_OBSERVADO_POR_ANIO).map(Number).sort((a, b) => b - a);
  const anio  = anios[0];
  return { anio, valor: IPC_OBSERVADO_POR_ANIO[anio] };
}

// ── METADATOS DE LA APP ──────────────────────────────────────────

/** Nombre comercial. Usado en títulos, headers, "Acerca de". */
export const APP_NAME = 'Finko';

/** Versión semántica. Debe mantenerse en sync con `package.json`. */
export const APP_VERSION = '1.0.0';

// ── ALIASES DE COMPATIBILIDAD (DEPRECATED) ───────────────────────
//
// Estos exports mantienen el código viejo funcional mientras se migra.
// Nuevos usos: importar `SMMLV`, `UVT`, etc. sin sufijo de año.
// TODO: eliminar en una próxima fase cuando no queden consumidores.

/** @deprecated Usar `SMMLV` (sin sufijo). */
export const SMMLV_2026 = SMMLV;
/** @deprecated Usar `AUXILIO_TRANSPORTE` (sin sufijo). */
export const AUXILIO_TRANSPORTE_2026 = AUXILIO_TRANSPORTE;
/** @deprecated Usar `UVT` (sin sufijo). */
export const UVT_2026 = UVT;
/** @deprecated Usar `VIGENCIA` (sin sufijo). */
export const VIGENCIA_2026 = VIGENCIA;

// ── CATÁLOGOS PARA SELECTS ──────────────────────────────────────

/**
 * Bancos y billeteras digitales principales en Colombia.
 *
 * Cada entrada tiene:
 *   id        - string que se guarda en localStorage (compatible con datos previos).
 *   iniciales - letras para la teja visual (max 2 chars); fallback cuando no hay glifo.
 *   color     - fondo de la teja (color corporativo).
 *   texto     - color del glifo o las iniciales encima (#ffffff o #1a1a1a según contraste).
 *   clase     - familia de la entidad: 'efectivo' | 'banco' | 'billetera' | 'otro'.
 *               Maneja qué campos muestra el formulario de cuenta (tipos de
 *               cuenta compatibles, 4x1000, cuota de manejo). Ver TIPOS_POR_CLASE.
 *   simbolo   - opcional (ADR 025): id de un <symbol> del sprite de index.html con el
 *               glifo de la marca (prefijo b-*) o un icono estructural (i-*). Sin este
 *               campo, la teja muestra las iniciales. Regla de fidelidad (ADR 025 D5):
 *               solo se agrega un glifo verificado contra el isotipo oficial; nunca se
 *               inventa un logo de memoria.
 *   aliases   - opcional (MK.2, ADR 025 D4): formas cortas con que el usuario nombra
 *               la entidad en un texto libre ("bbva", "colpatria"), ya normalizadas
 *               (minúsculas, sin tildes). El id completo normalizado siempre cuenta
 *               como alias implícito; ver resolverMarca() en infra/marcas.js.
 *
 * Agregar un banco nuevo no rompe datos existentes: el id es el valor guardado.
 * Nequi entró a color en BR.3 (excepción de logo a color, ver README de
 * assets/svg sección 6): la teja se pinta del fondo blanco propio del glifo,
 * no del berenjena/magenta corporativo anterior (`texto` queda sin efecto en
 * un logo a color, el archivo trae sus propios fill).
 */
export const BANCOS_CO = [
  { id: 'Efectivo',             iniciales: '💵', color: '#16a34a', texto: '#ffffff', clase: 'efectivo', simbolo: 'i-saldo'  },
  { id: 'Bancolombia',          iniciales: 'BC', color: '#ffffff', texto: '#1a1a1a', clase: 'banco',     simbolo: 'b-bancolombia' },
  { id: 'Davivienda',           iniciales: 'DV', color: '#d30f1a', texto: '#ffffff', clase: 'banco',     simbolo: 'b-davivienda' },
  { id: 'Banco de Bogotá',      iniciales: 'BB', color: '#003576', texto: '#ffffff', clase: 'banco',     simbolo: 'b-banco-bogota' },
  { id: 'BBVA Colombia',        iniciales: 'BV', color: '#001491', texto: '#ffffff', clase: 'banco',     simbolo: 'b-bbva', aliases: ['bbva'] },
  { id: 'Banco Popular',        iniciales: 'BP', color: '#105163', texto: '#ffffff', clase: 'banco',     simbolo: 'b-banco-popular' },
  { id: 'Scotiabank Colpatria', iniciales: 'SC', color: '#ed111b', texto: '#ffffff', clase: 'banco',     simbolo: 'b-scotiabank-colpatria', aliases: ['scotiabank', 'colpatria'] },
  { id: 'Banco de Occidente',   iniciales: 'BO', color: '#002d70', texto: '#ffffff', clase: 'banco',     simbolo: 'b-banco-occidente' },
  { id: 'Banco AV Villas',      iniciales: 'AV', color: '#ec1b30', texto: '#ffffff', clase: 'banco',     simbolo: 'b-av-villas', aliases: ['av villas'] },
  { id: 'Nequi',                iniciales: 'Nq', color: '#ffffff', texto: '#1f0020', clase: 'billetera', simbolo: 'b-nequi'  },
  { id: 'Daviplata',            iniciales: 'Dp', color: '#fe0000', texto: '#ffffff', clase: 'billetera', simbolo: 'b-daviplata' },
  { id: 'Nubank',               iniciales: 'Nu', color: '#820AD1', texto: '#ffffff', clase: 'billetera', simbolo: 'b-nubank', aliases: ['nu'] },
  { id: 'Lulo Bank',            iniciales: 'LB', color: '#1f2639', texto: '#ffffff', clase: 'billetera', simbolo: 'b-lulo-bank', aliases: ['lulo'] },
  { id: 'Otro',                 iniciales: '?',  color: '#6B7280', texto: '#ffffff', clase: 'otro'      },
];

/**
 * Marcas globales de suscripciones y servicios (MK.2, ADR 025 D2/D4).
 *
 * Cada entrada tiene:
 *   id        - slug estable de la marca. Desde SUS.1a (ADR 146 D4, schema
 *               v51) un gasto fijo lo guarda como `marcaId`: no se renombra
 *               nunca. Retirar una fila deja ese `marcaId` sin marca y la teja
 *               cae a la resolución por texto.
 *   nombre    - nombre comercial para mostrar. Invariante (ADR 146 D4): el
 *               nombre resuelve a su propia marca con `resolverMarca`, porque
 *               el fijo con plataforma se llama así y las superficies pintan
 *               la teja por texto. `tests/unit/marcas.test.js` lo recorre.
 *   categorias - tags del ADR 029 D3 a los que pertenece (`streaming`,
 *               `musica`, `ia`, `nube`...). Se leen por categoría de gasto
 *               fijo con `TAGS_CATEGORIA_AGENDA` y `marcasDeCategoriaAgenda`
 *               (infra/marcas.js). Una marca sin tags solo resuelve por texto.
 *   aliases   - palabras o frases normalizadas (minúsculas, sin tildes, sin
 *               signos) con que el usuario suele escribir la marca. El match
 *               es por palabra o frase completa, nunca substring: "clarooscuro"
 *               NO resuelve a Claro. El orden del catálogo importa: gana la
 *               primera entrada cuyo alias aparezca ("Google Gemini" resuelve
 *               a Gemini porque Gemini está antes que Google).
 *   color     - fondo de la teja (color oficial de la marca).
 *   texto     - color del glifo o las iniciales encima.
 *   iniciales - fallback visual cuando no hay glifo (ADR 025 D2).
 *   simbolo   - opcional: id del <symbol> b-* del sprite de index.html.
 *
 * Regla de fidelidad (D5): los glifos provienen de Simple Icons 16.25.0 (CC0),
 * verificados uno a uno el 2026-07-05. Disney+, Claro, Tigo, Rappi, ChatGPT,
 * Prime Video y Xbox no están en Simple Icons (o fueron retirados): entraron
 * el 2026-11-15 con el vector de Esteban, a color y con fondo propio
 * (`data-fullcolor`, README de assets/svg sección 6b). Su `color` es el fondo
 * del propio archivo, para que la teja y el glifo se vean continuos. Desde
 * BR.7 todo logo llena su teja: el fondo va de borde a borde en el archivo y
 * el logo pesa lo mismo en todas (README de assets/svg, sección 6). ChatGPT y
 * Apple TV+ pasan a fondo negro con el
 * logo en blanco (antes eran un cuadrado negro sobre teja blanca) y Disney+
 * lleva su degradado de borde a borde (su `color` es el tono medio).
 * Colores: los de
 * Simple Icons son oficiales; el fondo de Platzi es una aproximación
 * documentada (mismo tratamiento que tuvo Nequi antes de MK.1).
 * Retirar una marca = borrar su fila: el consumidor cae al ícono de categoría.
 *
 * SUS.1a (ADR 146 D3): seis plataformas entraron con iniciales hasta tener el
 * vector de Esteban (Paramount+, Apple TV+, Apple Music, YouTube Music,
 * Amazon Music, Deezer). BR.6b (2026-11-15) trajo cuatro: Apple Music es
 * silueta monocroma sobre su rojo; Apple TV+ (fondo negro, desde BR.7) y
 * Deezer (onda morada sobre teja blanca) van a color; Paramount+
 * trae su fondo azul. Spotify cambió su silueta de Simple Icons por el
 * círculo verde de Esteban. Siguen con iniciales YouTube Music y Amazon
 * Music. Los colores de las que no tienen glifo son los de Simple Icons salvo Amazon
 * Music, aproximación documentada. Las de nombre compuesto van ANTES de la
 * genérica que contiene su primera palabra ("YouTube Music" antes que
 * YouTube, "Apple TV+" antes que Apple, "Amazon Music" antes que el alias
 * `amazon` de Prime Video): gana la primera que coincide. El orden dentro de
 * un tag es también el orden del selector de plataforma.
 */
export const MARCAS = [
  // Música
  { id: 'spotify',      nombre: 'Spotify',       aliases: ['spotify'],                               categorias: ['musica'],    color: '#1ed760', texto: '#121212', iniciales: 'S',  simbolo: 'b-spotify' },
  { id: 'youtubemusic', nombre: 'YouTube Music', aliases: ['youtube music', 'yt music'],             categorias: ['musica'],    color: '#FF0000', texto: '#ffffff', iniciales: 'YM' },
  { id: 'applemusic',   nombre: 'Apple Music',   aliases: ['apple music'],                           categorias: ['musica'],    color: '#FA243C', texto: '#ffffff', iniciales: 'AM', simbolo: 'b-applemusic' },
  { id: 'amazonmusic',  nombre: 'Amazon Music',  aliases: ['amazon music'],                          categorias: ['musica'],    color: '#25D1DA', texto: '#121212', iniciales: 'AZ' },
  { id: 'deezer',       nombre: 'Deezer',        aliases: ['deezer'],                                categorias: ['musica'],    color: '#ffffff', texto: '#000000', iniciales: 'DZ', simbolo: 'b-deezer' },
  // Streaming de video
  { id: 'netflix',      nombre: 'Netflix',       aliases: ['netflix'],                               categorias: ['streaming'], color: '#E50914', texto: '#ffffff', iniciales: 'N',  simbolo: 'b-netflix' },
  { id: 'primevideo',   nombre: 'Prime Video',   aliases: ['prime video', 'amazon prime', 'amazon'], categorias: ['streaming'], color: '#0c7aff', texto: '#ffffff', iniciales: 'PV', simbolo: 'b-primevideo' },
  { id: 'disneyplus',   nombre: 'Disney+',       aliases: ['disney'],                                categorias: ['streaming'], color: '#0f5a69', texto: '#ffffff', iniciales: 'D+', simbolo: 'b-disneyplus' },
  { id: 'hbomax',       nombre: 'HBO Max',       aliases: ['hbo'],                                   categorias: ['streaming'], color: '#000000', texto: '#ffffff', iniciales: 'HB', simbolo: 'b-hbomax' },
  { id: 'youtube',      nombre: 'YouTube',       aliases: ['youtube'],                               categorias: ['streaming'], color: '#FF0000', texto: '#ffffff', iniciales: 'YT', simbolo: 'b-youtube' },
  { id: 'paramountplus', nombre: 'Paramount+',   aliases: ['paramount'],                             categorias: ['streaming'], color: '#0064ff', texto: '#ffffff', iniciales: 'P+', simbolo: 'b-paramountplus' },
  { id: 'appletv',      nombre: 'Apple TV+',     aliases: ['apple tv', 'appletv'],                   categorias: ['streaming'], color: '#000000', texto: '#ffffff', iniciales: 'TV', simbolo: 'b-appletv' },
  { id: 'crunchyroll',  nombre: 'Crunchyroll',   aliases: ['crunchyroll'],                           categorias: ['streaming'], color: '#FF5E00', texto: '#ffffff', iniciales: 'CR', simbolo: 'b-crunchyroll' },
  // MK.3a (ADR 172 D3): ViX, después de Crunchyroll.
  { id: 'vix',          nombre: 'ViX',           aliases: ['vix premium', 'vix'],                    categorias: ['streaming'], color: '#F45D0C', texto: '#ffffff', iniciales: 'VX' },
  // Tecnología e IA
  { id: 'icloud',       nombre: 'iCloud',        aliases: ['icloud'],                                categorias: ['nube'],      color: '#3693F3', texto: '#ffffff', iniciales: 'iC', simbolo: 'b-icloud' },
  { id: 'apple',        nombre: 'Apple',         aliases: ['apple'],                                 categorias: [],            color: '#000000', texto: '#ffffff', iniciales: 'A',  simbolo: 'b-apple' },
  { id: 'claude',       nombre: 'Claude',        aliases: ['claude', 'anthropic'],                   categorias: ['ia'],        color: '#D97757', texto: '#ffffff', iniciales: 'C',  simbolo: 'b-claude' },
  { id: 'chatgpt',      nombre: 'ChatGPT',       aliases: ['chatgpt', 'chat gpt', 'openai'],         categorias: ['ia'],        color: '#000000', texto: '#ffffff', iniciales: 'AI', simbolo: 'b-chatgpt' },
  { id: 'gemini',       nombre: 'Gemini',        aliases: ['gemini'],                                categorias: ['ia'],        color: '#8E75B2', texto: '#ffffff', iniciales: 'G',  simbolo: 'b-gemini' },
  { id: 'google',       nombre: 'Google',        aliases: ['google'],                                categorias: ['nube'],      color: '#4285F4', texto: '#ffffff', iniciales: 'G',  simbolo: 'b-google' },
  // Pagos
  { id: 'paypal',       nombre: 'PayPal',        aliases: ['paypal', 'pay pal'],                     categorias: ['pagos'],     color: '#002991', texto: '#ffffff', iniciales: 'PP', simbolo: 'b-paypal' },
  { id: 'mercadopago',  nombre: 'Mercado Pago',  aliases: ['mercado pago', 'mercadopago'],           categorias: ['pagos'],     color: '#00B1EA', texto: '#ffffff', iniciales: 'MP', simbolo: 'b-mercadopago' },
  // Telefonía e internet
  { id: 'claro',        nombre: 'Claro',         aliases: ['claro'],                                 categorias: ['telefonia'], color: '#cc2229', texto: '#ffffff', iniciales: 'CL', simbolo: 'b-claro' },
  { id: 'movistar',     nombre: 'Movistar',      aliases: ['movistar'],                              categorias: ['telefonia'], color: '#019DF4', texto: '#ffffff', iniciales: 'M',  simbolo: 'b-movistar' },
  { id: 'tigo',         nombre: 'Tigo',          aliases: ['tigo'],                                  categorias: ['telefonia'], color: '#27348b', texto: '#ffffff', iniciales: 'TG', simbolo: 'b-tigo' },
  // Transporte y domicilios
  { id: 'uber',         nombre: 'Uber',          aliases: ['uber'],                                  categorias: ['transporte'], color: '#000000', texto: '#ffffff', iniciales: 'U',  simbolo: 'b-uber' },
  { id: 'rappi',        nombre: 'Rappi',         aliases: ['rappi', 'rappipro'],                     categorias: ['domicilios'], color: '#f04e46', texto: '#ffffff', iniciales: 'R',  simbolo: 'b-rappi' },
  // Gaming y educación
  { id: 'playstation',  nombre: 'PlayStation',   aliases: ['playstation', 'play station', 'ps plus'], categorias: ['gaming'],   color: '#0070D1', texto: '#ffffff', iniciales: 'PS', simbolo: 'b-playstation' },
  { id: 'xbox',         nombre: 'Xbox',          aliases: ['xbox', 'game pass', 'gamepass'],         categorias: ['gaming'],    color: '#0f7c10', texto: '#ffffff', iniciales: 'XB', simbolo: 'b-xbox' },
  // MK.3a (ADR 172 D2 y D4): Roblox Premium (sin "robux": son compras sueltas),
  // y el software que se renueva cada año (sin "microsoft": Xbox también lo es).
  { id: 'roblox',       nombre: 'Roblox',        aliases: ['roblox'],                                categorias: ['gaming'],    color: '#1B1B1B', texto: '#ffffff', iniciales: 'RB' },
  { id: 'microsoft365', nombre: 'Microsoft 365', aliases: ['microsoft 365', 'office 365', 'microsoft office'], categorias: ['software'], color: '#0078D4', texto: '#ffffff', iniciales: 'M3' },
  { id: 'mcafee',       nombre: 'McAfee',        aliases: ['mcafee'],                                categorias: ['software'],  color: '#C01818', texto: '#ffffff', iniciales: 'MC' },
  { id: 'duolingo',     nombre: 'Duolingo',      aliases: ['duolingo'],                              categorias: ['educacion'], color: '#58CC02', texto: '#ffffff', iniciales: 'DU', simbolo: 'b-duolingo' },
  { id: 'platzi',       nombre: 'Platzi',        aliases: ['platzi'],                                categorias: ['educacion'], color: '#121F3D', texto: '#98CA3F', iniciales: 'PL', simbolo: 'b-platzi' },
  // GF.1 (ADR 167 D5): las empresas colombianas de los gastos fijos. Entran
  // con iniciales hasta tener el vector de Esteban (regla de fidelidad, D5
  // del ADR 025). Colores tomados de la web de cada empresa el 2026-11-18
  // (CSS, `theme-color` o el logo); Enel, Alcanos, DirecTV, Starlink,
  // Allianz y AXA Colpatria son aproximación documentada en el ADR 167.
  // Aliases solo de frase propia: "bolivar", "estado" o "compensar" a secas
  // pintarían la teja en textos que no hablan de la empresa.
  // Servicios públicos, de más a menos usuarios
  { id: 'epm',          nombre: 'EPM',           aliases: ['epm', 'empresas publicas de medellin'],  categorias: ['servicios'], color: '#007934', texto: '#ffffff', iniciales: 'EP' },
  { id: 'enel',         nombre: 'Enel',          aliases: ['enel', 'codensa'],                       categorias: ['servicios'], color: '#E70066', texto: '#ffffff', iniciales: 'EN' },
  { id: 'vanti',        nombre: 'Vanti',         aliases: ['vanti'],                                 categorias: ['servicios'], color: '#00315C', texto: '#ffffff', iniciales: 'VA' },
  { id: 'eaab',         nombre: 'Acueducto de Bogotá', aliases: ['acueducto de bogota', 'eaab'],     categorias: ['servicios'], color: '#008AC8', texto: '#1a1a1a', iniciales: 'AB' },
  { id: 'emcali',       nombre: 'Emcali',        aliases: ['emcali'],                                categorias: ['servicios'], color: '#D20A11', texto: '#ffffff', iniciales: 'EM' },
  { id: 'aire',         nombre: 'Air-e',         aliases: ['air e'],                                 categorias: ['servicios'], color: '#0056B4', texto: '#ffffff', iniciales: 'AE' },
  { id: 'afinia',       nombre: 'Afinia',        aliases: ['afinia'],                                categorias: ['servicios'], color: '#1275BB', texto: '#ffffff', iniciales: 'AF' },
  { id: 'celsia',       nombre: 'Celsia',        aliases: ['celsia'],                                categorias: ['servicios'], color: '#D8782C', texto: '#1a1a1a', iniciales: 'CE' },
  { id: 'triplea',      nombre: 'Triple A',      aliases: ['triple a'],                              categorias: ['servicios'], color: '#0C82C5', texto: '#ffffff', iniciales: 'AA' },
  { id: 'gascaribe',    nombre: 'Gases del Caribe', aliases: ['gases del caribe', 'gascaribe'],      categorias: ['servicios'], color: '#244B95', texto: '#ffffff', iniciales: 'GC' },
  { id: 'gdo',          nombre: 'Gases de Occidente', aliases: ['gases de occidente', 'gdo'],        categorias: ['servicios'], color: '#1E81C4', texto: '#ffffff', iniciales: 'GO' },
  { id: 'efigas',       nombre: 'Efigas',        aliases: ['efigas'],                                categorias: ['servicios'], color: '#0571CC', texto: '#ffffff', iniciales: 'EF' },
  { id: 'surtigas',     nombre: 'Surtigas',      aliases: ['surtigas'],                              categorias: ['servicios'], color: '#0083C9', texto: '#1a1a1a', iniciales: 'SG' },
  { id: 'alcanos',      nombre: 'Alcanos',       aliases: ['alcanos'],                               categorias: ['servicios'], color: '#003B71', texto: '#ffffff', iniciales: 'AL' },
  { id: 'essa',         nombre: 'ESSA',          aliases: ['essa'],                                  categorias: ['servicios'], color: '#1A97D4', texto: '#1a1a1a', iniciales: 'ES' },
  { id: 'chec',         nombre: 'CHEC',          aliases: ['chec'],                                  categorias: ['servicios'], color: '#007934', texto: '#ffffff', iniciales: 'CH' },
  // Internet y TV (Claro, Movistar y Tigo, arriba, venden los dos)
  { id: 'etb',          nombre: 'ETB',           aliases: ['etb'],                                   categorias: ['telefonia'], color: '#004583', texto: '#ffffff', iniciales: 'ET' },
  // MK.3a (ADR 172 D1 y D4): operadores solo móviles, con tag propio para que
  // "Internet y TV" no los ofrezca. Sin "exito" ni "kalley" solos: son el
  // supermercado y los televisores.
  { id: 'movilexito',   nombre: 'Móvil Éxito',   aliases: ['movil exito'],                           categorias: ['movil'],     color: '#FFE600', texto: '#1a1a1a', iniciales: 'MÉ' },
  { id: 'virginmobile', nombre: 'Virgin Mobile', aliases: ['virgin mobile', 'virgin'],               categorias: ['movil'],     color: '#E10A0A', texto: '#ffffff', iniciales: 'VM' },
  { id: 'kalleymovil',  nombre: 'Kalley Móvil',  aliases: ['kalley movil'],                          categorias: ['movil'],     color: '#111111', texto: '#ffffff', iniciales: 'KM' },
  // MK.3a (ADR 172 D5): plataformas de inversión, para "¿Dónde la tienes?" (MK.3b).
  { id: 'trii',         nombre: 'trii',          aliases: ['trii'],                                  categorias: ['inversion'], color: '#5B2DE1', texto: '#ffffff', iniciales: 'TR' },
  { id: 'wenia',        nombre: 'Wenia',         aliases: ['wenia'],                                 categorias: ['inversion'], color: '#000000', texto: '#FDDA24', iniciales: 'WE' },
  { id: 'directv',      nombre: 'DirecTV',       aliases: ['directv', 'direct tv'],                  categorias: ['tv'],        color: '#0071BA', texto: '#ffffff', iniciales: 'DT' },
  { id: 'starlink',     nombre: 'Starlink',      aliases: ['starlink'],                              categorias: ['internet'],  color: '#000000', texto: '#ffffff', iniciales: 'SL' },
  // Streaming de fútbol colombiano
  { id: 'winfutbol',    nombre: 'Win+ Fútbol',   aliases: ['win futbol', 'win sports', 'winplay', 'win play'], categorias: ['streaming'], color: '#0D222E', texto: '#ffffff', iniciales: 'W+' },
  // Medicina prepagada (Sura y Allianz también venden seguros)
  { id: 'colsanitas',   nombre: 'Colsanitas',    aliases: ['colsanitas'],                            categorias: ['salud'],     color: '#002E5B', texto: '#ffffff', iniciales: 'CS' },
  { id: 'colmedica',    nombre: 'Colmédica',     aliases: ['colmedica'],                             categorias: ['salud'],     color: '#005CAC', texto: '#ffffff', iniciales: 'CM' },
  { id: 'sura',         nombre: 'Sura',          aliases: ['sura'],                                  categorias: ['salud', 'seguros'], color: '#0033A0', texto: '#ffffff', iniciales: 'SU' },
  { id: 'coomeva',      nombre: 'Coomeva',       aliases: ['coomeva'],                               categorias: ['salud'],     color: '#1A975C', texto: '#1a1a1a', iniciales: 'CO' },
  { id: 'allianz',      nombre: 'Allianz',       aliases: ['allianz'],                               categorias: ['seguros', 'salud'], color: '#003781', texto: '#ffffff', iniciales: 'AZ' },
  // Seguros
  { id: 'segurosbolivar', nombre: 'Seguros Bolívar', aliases: ['seguros bolivar'],                   categorias: ['seguros'],   color: '#016D38', texto: '#ffffff', iniciales: 'SB' },
  { id: 'mapfre',       nombre: 'Mapfre',        aliases: ['mapfre'],                                categorias: ['seguros'],   color: '#DF0027', texto: '#ffffff', iniciales: 'MA' },
  { id: 'axacolpatria', nombre: 'AXA Colpatria', aliases: ['axa colpatria', 'axa'],                  categorias: ['seguros'],   color: '#00008F', texto: '#ffffff', iniciales: 'AX' },
  { id: 'hdi',          nombre: 'HDI Seguros',   aliases: ['hdi', 'liberty seguros'],                categorias: ['seguros'],   color: '#65A518', texto: '#1a1a1a', iniciales: 'HD' },
  { id: 'segurosdelestado', nombre: 'Seguros del Estado', aliases: ['seguros del estado'],           categorias: ['seguros'],   color: '#003287', texto: '#ffffff', iniciales: 'SE' },
  { id: 'previsora',    nombre: 'La Previsora',  aliases: ['previsora'],                             categorias: ['seguros'],   color: '#532963', texto: '#ffffff', iniciales: 'PR' },
  // Gimnasios
  { id: 'smartfit',     nombre: 'Smart Fit',     aliases: ['smart fit', 'smartfit'],                 categorias: ['gimnasio'],  color: '#FDB924', texto: '#1a1a1a', iniciales: 'SF' },
  { id: 'bodytech',     nombre: 'Bodytech',      aliases: ['bodytech', 'body tech'],                 categorias: ['gimnasio'],  color: '#EB6608', texto: '#1a1a1a', iniciales: 'BT' },
  { id: 'spinningcenter', nombre: 'Spinning Center', aliases: ['spinning center'],                   categorias: ['gimnasio'],  color: '#F8EA1C', texto: '#1a1a1a', iniciales: 'SC' },
];

/**
 * Tipos de cuenta soportados en el módulo de tesorería.
 *
 * "Inversión" se eliminó en v11: las inversiones reales (CDT, fondos, acciones,
 * cripto) viven en el dominio Inversión (hub "Ahorros"), con monto, tasa y
 * plazo. Una cuenta de tesorería es un saldo disponible, no un instrumento de
 * inversión. Las cuentas viejas con tipo 'Inversión' se migran a 'Otro'.
 */
export const TIPOS_CUENTA = [
  'Corriente',
  'Ahorros',
  'Efectivo',
  'Otro',
];

/**
 * Tipos de cuenta válidos según la clase de entidad (BANCOS_CO[i].clase).
 * El formulario de cuenta filtra el selector "Tipo de cuenta" con esta tabla:
 *   - banco:     Corriente o Ahorros.
 *   - billetera: saldo único, no aplica tipo bancario (selector oculto).
 *   - efectivo:  no aplica (selector oculto; tipo se normaliza a 'Efectivo').
 *   - otro:      genérico (Ahorros u Otro).
 * Una lista vacía significa "no mostrar el selector de tipo".
 */
export const TIPOS_POR_CLASE = {
  banco:     ['Corriente', 'Ahorros'],
  billetera: [],
  efectivo:  [],
  otro:      ['Ahorros', 'Otro'],
};

/**
 * Tipos de llave de transferencia (MC.14), con los nombres de Bre-B desde
 * MC.19 ([ADR 170](../../docs/DECISIONS/170-tus-llaves-a-un-toque.md) D2): la
 * alfanumérica es la que empieza por @ (antes "Alfanumérico" y el campo
 * Alias); el código de comercio va en Otro, porque Finko es de personas.
 */
export const TIPOS_LLAVE = Object.freeze([
  'Celular',
  'Documento',
  'Correo',
  'Alfanumérica',
  'Otro',
]);

/** Cuántas llaves guarda una cuenta (ADR 170 D1: el tope de algunas entidades). */
export const MAX_LLAVES_CUENTA = 7;

/**
 * Todas las categorías de gasto reconocidas por el sistema, incluyendo las
 * internas ("Deudas", "Ahorro") que el código usa al crear gastos-abono o
 * al calcular distribución de ingresos. No se deben eliminar: romperían la
 * lógica de compromisos/index.js y tesorería/logic.js.
 */
export const CATEGORIAS_GASTO = [
  'Mercado',
  'Restaurantes',
  'Café',
  // SUS.2a (ADR 147 D2): toda clase de chucherías; carácter gusto.
  'Mecato',
  'Transporte',
  'Vivienda',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ropa',
  'Servicios públicos',
  'Hogar',
  'Mascotas',
  'Cuidado personal',
  // APR.3e (ADR 093 D3): la mesada y el premio del niño se anotan aquí.
  'Familia',
  'Gastos hormiga',
  'Deudas',
  'Ahorro',
  'Alimentación',
  'Otros',
];

/**
 * Categorías visibles en el formulario de gasto. Excluye las internas
 * ("Deudas" para abonos, "Ahorro" para aportes), la legacy ("Alimentación",
 * reemplazada por Mercado/Restaurantes en v15) y las que la taxonomía
 * CAT.1 (2026-07-13) reclasificó como exclusivas de Gastos fijos
 * ("Vivienda", "Servicios públicos": siempre recurrentes con fecha, viven
 * en Agenda). Se mantienen en `CATEGORIAS_GASTO` (no aquí) para que
 * `CATEGORIA_ICONO` y la validación de gastos/límites existentes sigan
 * resolviendo bien los registros ya guardados con esas categorías.
 *
 * SUS.1b ([ADR 146](../../docs/DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md)
 * D5): "Gastos hormiga" tampoco se ofrece. Hormiga es lo que Finko reconoce
 * por monto (`infra/hormiga.js`), no algo que el usuario declara; un café de
 * $6.000 cuenta como hormiga en su propia categoría. Mismo tratamiento que
 * Vivienda: los gastos y topes ya guardados con ella se siguen leyendo.
 */
export const CATEGORIAS_GASTO_USUARIO = CATEGORIAS_GASTO.filter(
  c => c !== 'Deudas' && c !== 'Ahorro' && c !== 'Alimentación'
    && c !== 'Vivienda' && c !== 'Servicios públicos' && c !== 'Gastos hormiga',
);

/**
 * Ícono del sprite por categoría de gasto (ID.3, ADR 025 D3). El valor es el
 * id completo de un `<symbol>` de index.html (`c-*` de categoría, o un `i-*`
 * estructural cuando la metáfora ya existe). Usar solo en UI, dentro de la
 * teja de categoría (`tejaCategoria`); nunca en el valor almacenado.
 */
export const CATEGORIA_ICONO = {
  'Mercado':            'c-mercado',
  'Restaurantes':       'c-restaurantes',
  'Café':               'c-cafe',
  // SUS.2a (ADR 147 D2): la hormiga hasta que Esteban dibuje su glifo.
  'Mecato':             'c-hormiga',
  'Transporte':         'c-bus',
  'Vivienda':           'i-home',
  'Salud':              'c-salud',
  'Educación':          'c-libro',
  'Entretenimiento':    'c-boleta',
  'Ropa':               'c-ropa',
  'Servicios públicos': 'c-servicios',
  'Hogar':              'c-hogar',
  'Mascotas':           'c-mascotas',
  'Cuidado personal':   'c-cuidado',
  'Familia':            'c-familia',
  'Gastos hormiga':     'c-hormiga',
  'Deudas':             'i-deudas',
  'Ahorro':             'i-ahorro',
  'Gastos fijos':       'i-recurring',
  'Alimentación':       'c-mercado',
  'Otros':              'c-otros',
};

/**
 * Ilustración del comprobante de gasto por categoría (GAS.C): id del
 * `<symbol>` cmp-* que dibuja assets/svg/comprobante/categorias/. Una
 * categoría sin entrada (Café, Mascotas, una propia...) lleva en el
 * comprobante su glifo de CATEGORIA_ICONO dentro de una teja.
 */
export const CATEGORIA_ILUSTRACION = Object.freeze({
  'Mercado':            'cmp-alimentacion',
  'Alimentación':       'cmp-alimentacion',
  'Transporte':         'cmp-transporte',
  'Vivienda':           'cmp-vivienda',
  'Hogar':              'cmp-vivienda',
  'Salud':              'cmp-salud',
  'Educación':          'cmp-educacion',
  'Entretenimiento':    'cmp-entretenimiento',
  'Ropa':               'cmp-compras',
  'Servicios públicos': 'cmp-servicios',
  'Deudas':             'cmp-deudas',
  'Ahorro':             'cmp-ahorro',
});

/**
 * Los tres caracteres de un gasto (SUS.2a, [ADR 147](../../docs/DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md) D1):
 * una necesidad nunca es hormiga; un deseo pequeño lo es de inmediato; lo que
 * "depende" se decide al repetirse. Es lo que el usuario contesta en "¿Es un
 * gusto o una necesidad?" (solo los dos primeros: "depende" es la ausencia de
 * respuesta).
 */
export const CARACTERES_GASTO = Object.freeze(['necesidad', 'gusto', 'depende']);

/**
 * Carácter de cada categoría nativa de gasto (ADR 147 D3). Una subcategoría
 * puede decir otro (`SUBCATEGORIAS_GASTO[].caracter`). Deudas y Gastos fijos
 * no están: son pagos, y `gastosHormiga` los deja fuera por su naturaleza.
 */
export const CARACTER_CATEGORIA_GASTO = Object.freeze({
  'Mecato':           'gusto',
  'Café':             'gusto',
  'Restaurantes':     'depende',
  'Mercado':          'necesidad',
  'Transporte':       'necesidad',
  'Salud':            'necesidad',
  'Educación':        'necesidad',
  'Hogar':            'necesidad',
  'Mascotas':         'necesidad',
  'Cuidado personal': 'depende',
  'Ropa':             'depende',
  'Entretenimiento':  'depende',
  'Familia':          'necesidad',
  'Otros':            'depende',
  // SUS.2b: las que ya no se ofrecen pero viven en gastos guardados. Quien
  // anotó algo en "Gastos hormiga" ya dijo que era un gusto (SUS.1b la
  // retiró del formulario, no de los datos).
  'Gastos hormiga':     'gusto',
  'Vivienda':           'necesidad',
  'Servicios públicos': 'necesidad',
  'Alimentación':       'necesidad',
  'Ahorro':             'necesidad',
});

/**
 * Subcategorías de gasto (SUS.2a, ADR 147 D3, validadas con Esteban el
 * 2026-11-15). Catálogo plano de dos niveles (ADR 064): cada hijo declara su
 * categoría y, solo si difiere de ella, su carácter. Se lee con
 * `hijosDeCategoria`/`hijoPorId` de `infra/taxonomia.js`.
 *
 * El `id` se guarda en el gasto (`subcategoriaId`, schema v52): no se
 * renombra nunca. El `nombre` es texto visible y sí puede cambiar. Otros no
 * tiene subcategorías: ahí se pregunta "¿Fue una necesidad o un deseo?".
 *
 * GAS.5c ([ADR 162](../../docs/DECISIONS/162-en-que-fue-y-necesidad-o-deseo-en-cada-gasto.md) D3):
 * Transporte separa Taxi y App de transporte (las dos "depende") y llama
 * "Transporte público" al bus y al Metro; Restaurantes dice "Almuerzo de
 * trabajo" y "Restaurante". Los ids no cambian.
 */
export const SUBCATEGORIAS_GASTO = Object.freeze([
  { id: 'mecato-dulces',        nombre: 'Dulces y chocolates',        categorias: ['Mecato'] },
  { id: 'mecato-paquetes',      nombre: 'Paquetes',                   categorias: ['Mecato'] },
  { id: 'mecato-helado',        nombre: 'Helado',                     categorias: ['Mecato'] },
  { id: 'mecato-bebidas',       nombre: 'Gaseosas y jugos',           categorias: ['Mecato'] },
  { id: 'mecato-panaderia',     nombre: 'Panadería y fritos',         categorias: ['Mecato'] },

  { id: 'cafe-tinto',           nombre: 'Tinto',                      categorias: ['Café'] },
  { id: 'cafe-cafeteria',       nombre: 'Café de cafetería',          categorias: ['Café'] },
  { id: 'cafe-frias',           nombre: 'Bebidas frías',              categorias: ['Café'] },

  { id: 'rest-almuerzo',        nombre: 'Almuerzo de trabajo',        categorias: ['Restaurantes'], caracter: 'necesidad' },
  { id: 'rest-rapida',          nombre: 'Comida rápida',              categorias: ['Restaurantes'], caracter: 'gusto' },
  { id: 'rest-salida',          nombre: 'Restaurante',                categorias: ['Restaurantes'] },
  { id: 'rest-domicilio',       nombre: 'Domicilio',                  categorias: ['Restaurantes'] },

  { id: 'mercado-super',        nombre: 'Supermercado',               categorias: ['Mercado'] },
  { id: 'mercado-tienda',       nombre: 'Tienda de barrio',           categorias: ['Mercado'] },
  { id: 'mercado-plaza',        nombre: 'Plaza o fruver',             categorias: ['Mercado'] },
  { id: 'mercado-carne',        nombre: 'Carne y pollo',              categorias: ['Mercado'] },

  { id: 'transp-bus',           nombre: 'Transporte público',         categorias: ['Transporte'] },
  { id: 'transp-taxi',          nombre: 'Taxi',                       categorias: ['Transporte'], caracter: 'depende' },
  { id: 'transp-app',           nombre: 'App de transporte',          categorias: ['Transporte'], caracter: 'depende' },
  { id: 'transp-gasolina',      nombre: 'Gasolina',                   categorias: ['Transporte'] },
  { id: 'transp-parqueadero',   nombre: 'Parqueadero',                categorias: ['Transporte'] },
  { id: 'transp-peajes',        nombre: 'Peajes',                     categorias: ['Transporte'] },

  { id: 'salud-medicamentos',   nombre: 'Medicamentos',               categorias: ['Salud'] },
  { id: 'salud-cita',           nombre: 'Cita o copago',              categorias: ['Salud'] },
  { id: 'salud-examenes',       nombre: 'Exámenes',                   categorias: ['Salud'] },
  { id: 'salud-optica',         nombre: 'Óptica',                     categorias: ['Salud'] },
  { id: 'salud-odontologia',    nombre: 'Odontología',                categorias: ['Salud'] },

  { id: 'edu-utiles',           nombre: 'Útiles y fotocopias',        categorias: ['Educación'] },
  { id: 'edu-libros',           nombre: 'Libros',                     categorias: ['Educación'] },
  { id: 'edu-curso',            nombre: 'Curso o taller',             categorias: ['Educación'] },
  { id: 'edu-matricula',        nombre: 'Matrícula',                  categorias: ['Educación'] },

  { id: 'hogar-aseo',           nombre: 'Aseo y limpieza',            categorias: ['Hogar'] },
  { id: 'hogar-herramientas',   nombre: 'Herramientas y ferretería',  categorias: ['Hogar'] },
  { id: 'hogar-arreglos',       nombre: 'Arreglos',                   categorias: ['Hogar'] },
  { id: 'hogar-muebles',        nombre: 'Muebles y electrodomésticos', categorias: ['Hogar'] },
  { id: 'hogar-decoracion',     nombre: 'Decoración',                 categorias: ['Hogar'], caracter: 'depende' },

  { id: 'masc-comida',          nombre: 'Comida',                     categorias: ['Mascotas'] },
  { id: 'masc-veterinario',     nombre: 'Veterinario',                categorias: ['Mascotas'] },
  { id: 'masc-bano',            nombre: 'Baño y peluquería',          categorias: ['Mascotas'] },
  { id: 'masc-juguetes',        nombre: 'Juguetes y accesorios',      categorias: ['Mascotas'], caracter: 'depende' },

  { id: 'cuidado-aseo',         nombre: 'Aseo personal',              categorias: ['Cuidado personal'], caracter: 'necesidad' },
  { id: 'cuidado-peluqueria',   nombre: 'Peluquería o barbería',      categorias: ['Cuidado personal'] },
  { id: 'cuidado-maquillaje',   nombre: 'Maquillaje',                 categorias: ['Cuidado personal'] },
  { id: 'cuidado-unas',         nombre: 'Uñas y spa',                 categorias: ['Cuidado personal'] },

  { id: 'ropa-ropa',            nombre: 'Ropa',                       categorias: ['Ropa'] },
  { id: 'ropa-calzado',         nombre: 'Calzado',                    categorias: ['Ropa'] },
  { id: 'ropa-accesorios',      nombre: 'Accesorios',                 categorias: ['Ropa'] },

  { id: 'entret-cine',          nombre: 'Cine',                       categorias: ['Entretenimiento'] },
  { id: 'entret-eventos',       nombre: 'Conciertos y eventos',       categorias: ['Entretenimiento'] },
  // GAS.6 (ADR 173 D1): diamantes, Robux, pases y juegos; gusto, como las apuestas.
  { id: 'entret-videojuegos',   nombre: 'Videojuegos',                categorias: ['Entretenimiento'], caracter: 'gusto' },
  { id: 'entret-rumba',         nombre: 'Rumba y licor',              categorias: ['Entretenimiento'] },
  { id: 'entret-apuestas',      nombre: 'Chance y apuestas',          categorias: ['Entretenimiento'], caracter: 'gusto' },
  { id: 'entret-paseos',        nombre: 'Paseos',                     categorias: ['Entretenimiento'] },

  { id: 'familia-mesada',       nombre: 'Mesada',                     categorias: ['Familia'] },
  { id: 'familia-ayuda',        nombre: 'Ayuda a un familiar',        categorias: ['Familia'] },
  { id: 'familia-regalos',      nombre: 'Regalos',                    categorias: ['Familia'], caracter: 'depende' },
]);

/**
 * Íconos elegibles para una categoría de gasto personalizada (TX.9b): los
 * símbolos `c-*` de categoría del sprite que ya existen pero **no** están
 * asignados en `CATEGORIA_ICONO` (evita dos entradas con el mismo glifo en
 * el mismo selector). Reusan la metáfora ya usada por otros catálogos del
 * proyecto (ingresos, agenda, metas) donde aplica: cruzar de dominio no
 * confunde porque nunca aparecen lado a lado en el selector de Gastos.
 * Etiqueta en español para el `aria-label` de cada botón del selector.
 */
export const ICONOS_CATEGORIA_PERSONALIZADA = [
  { icono: 'c-carro',       etiqueta: 'Carro' },
  { icono: 'c-computador',  etiqueta: 'Tecnología' },
  { icono: 'c-telefono',    etiqueta: 'Celular' },
  { icono: 'c-internet',    etiqueta: 'Internet' },
  { icono: 'c-streaming',   etiqueta: 'Streaming' },
  { icono: 'c-campana',     etiqueta: 'Suscripción' },
  { icono: 'c-compras',     etiqueta: 'Compras' },
  { icono: 'c-tienda',      etiqueta: 'Tienda' },
  { icono: 'c-regalo',      etiqueta: 'Regalo' },
  { icono: 'c-torta',       etiqueta: 'Celebración' },
  { icono: 'c-avion',       etiqueta: 'Viaje' },
  { icono: 'c-palmera',     etiqueta: 'Vacaciones' },
  { icono: 'c-maletin',     etiqueta: 'Trabajo' },
  { icono: 'c-edificio',    etiqueta: 'Vivienda' },
  { icono: 'c-amigos',      etiqueta: 'Amigos' },
  { icono: 'c-vecino',      etiqueta: 'Vecino' },
  { icono: 'c-biberon',     etiqueta: 'Bebé' },
  { icono: 'c-anillo',      etiqueta: 'Boda' },
  { icono: 'c-birrete',     etiqueta: 'Educación' },
  { icono: 'c-pesa',        etiqueta: 'Gimnasio' },
  { icono: 'c-escudo',      etiqueta: 'Seguro' },
  { icono: 'c-paraguas',    etiqueta: 'Protección' },
  { icono: 'c-recibo',      etiqueta: 'Factura' },
  { icono: 'c-billete',     etiqueta: 'Dinero' },
  { icono: 'c-bolsa',       etiqueta: 'Ahorro' },
  { icono: 'c-subsidio',    etiqueta: 'Subsidio' },
  { icono: 'c-cohete',      etiqueta: 'Emprendimiento' },
  { icono: 'c-etiqueta',    etiqueta: 'Otro' },
];

/**
 * Resuelve el ícono de una categoría ya guardada, sea de Gastos o de Gastos
 * fijos: nativa de Gastos (`CATEGORIA_ICONO`), nativa de Agenda
 * (`CATEGORIA_AGENDA_ICONO`), personalizada (creada por el usuario, TX.9b,
 * de cualquier `seccion`), y como último recurso el genérico `i-gastos`.
 * Resolutora global (ADR 058 D2): ignora la `seccion` porque el nombre ya
 * es único en toda la app (D4) y una superficie que pinta un movimiento no
 * sabe, y no debe saber, de qué formulario salió ese nombre. Pura: recibe
 * las personalizadas como parámetro (el caller lee `S`).
 *
 * @param {string} categoria
 * @param {{ nombre: string, icono: string }[]} [personalizadas]
 * @returns {string}
 */
export function iconoDeCategoriaGasto(categoria, personalizadas = []) {
  if (CATEGORIA_ICONO[categoria]) return CATEGORIA_ICONO[categoria];
  if (CATEGORIA_AGENDA_ICONO[categoria]) return CATEGORIA_AGENDA_ICONO[categoria];
  const propia = personalizadas.find(c => c.nombre === categoria);
  return propia?.icono ?? 'i-gastos';
}

/**
 * Categorías predefinidas para ingresos recurrentes.
 * El orden define el del selector en el formulario.
 * 'Salario mínimo' dispara la automatización de subsidio de transporte.
 */
export const CATEGORIAS_INGRESO = [
  'Salario',
  'Salario mínimo',
  'Honorarios',
  'Comisión',
  'Arriendo',
  'Pensión',
  'Subsidio',
  'Bonificación',
  'Cuota',
  'Venta',
  'Rendimientos',
  'Otro',
];

/**
 * Situaciones laborales del perfil del usuario (CFG.1, schema v25). Sirven para
 * que Finko interprete los ingresos y enmarque el monitor de renta (CFG.2). El
 * valor '' (o ausente) significa "sin especificar": el usuario puede dejarlo en
 * blanco. Los `id` son estables (se guardan en `S.perfil.situacionLaboral`); la
 * `label` es lo único que se muestra. El orden define el del selector.
 */
export const SITUACIONES_LABORALES = [
  { id: 'empleado',      label: 'Empleado (con contrato)' },
  { id: 'independiente', label: 'Independiente o freelance' },
  { id: 'pensionado',    label: 'Pensionado' },
  { id: 'mixto',         label: 'Mixto (empleado e independiente)' },
  { id: 'otro',          label: 'Otro' },
];

/** Ícono del sprite por categoría de ingreso. Solo UI; nunca en el valor almacenado. */
export const CATEGORIA_INGRESO_ICONO = {
  'Salario':         'c-maletin',
  'Salario mínimo':  'c-etiqueta',
  'Honorarios':      'c-billete',
  'Comisión':        'i-percent',
  'Arriendo':        'i-home',
  'Pensión':         'c-paraguas',
  'Subsidio':        'c-subsidio',
  'Bonificación':    'c-regalo',
  'Cuota':           'c-recibo',
  'Venta':           'c-bolsa',
  'Rendimientos':    'i-trending-up',
  'Otro':            'c-otros',
};

/**
 * Categorías predefinidas para gastos fijos (sección Agenda, Compromiso tipo='fijo').
 * El orden define el del selector en el formulario "Nuevo gasto fijo".
 *
 * GF.1 ([ADR 167](../../docs/DECISIONS/167-gastos-fijos-categorias-de-colombia.md)):
 * un gasto fijo es un pago con fecha cuyo valor casi no cambia de un mes a
 * otro. Mercado, Transporte y Mascotas varían cada semana: viven solo en Día a
 * día (cambia la D2 del ADR 014). Entran los fijos que pagan los hogares en
 * Colombia y no tenían casa: Medicina prepagada, Seguridad social (la planilla
 * de quien trabaja por su cuenta), Impuestos (predial y vehicular, una vez al
 * año) y Servicio doméstico. "Internet" pasa a "Internet y TV", "Telefonía" a
 * "Celular" y "Otro" a "Otros", el mismo nombre que en Día a día.
 */
export const CATEGORIAS_AGENDA = [
  'Arriendo',
  'Administración',
  'Servicios públicos',
  'Internet y TV',
  'Celular',
  'Streaming',
  'Suscripciones',
  'Educación',
  'Seguros',
  'Medicina prepagada',
  'Seguridad social',
  'Impuestos',
  'Gimnasio',
  'Servicio doméstico',
  'Cuota de manejo',
  'Otros',
];

/**
 * Las familias en que "¿Qué es?" muestra las categorías de un gasto fijo
 * (GF.2, [ADR 177](../../docs/DECISIONS/177-el-gasto-fijo-en-cuatro-pasos-con-nombre.md) D2).
 * Cada categoría de `CATEGORIAS_AGENDA` va en una sola familia, salvo "Otros",
 * que va con "Crear categoría" en "¿No está en la lista?". `familia` es la
 * clave del color (`data-familia` en CSS, sobre los tokens de sección).
 */
export const GRUPOS_CATEGORIA_AGENDA = Object.freeze([
  { familia: 'casa',    nombre: 'Casa',                       categorias: ['Arriendo', 'Administración', 'Servicios públicos', 'Servicio doméstico'] },
  { familia: 'conexion', nombre: 'Conexión y entretenimiento', categorias: ['Internet y TV', 'Celular', 'Streaming', 'Suscripciones'] },
  { familia: 'salud',   nombre: 'Salud y bienestar',          categorias: ['Medicina prepagada', 'Seguridad social', 'Seguros', 'Gimnasio'] },
  { familia: 'estudio', nombre: 'Estudio, banco e impuestos', categorias: ['Educación', 'Cuota de manejo', 'Impuestos'] },
  { familia: 'otros',   nombre: '¿No está en la lista?',      categorias: ['Otros'] },
]);

/**
 * Categorías de gasto fijo que ya no se ofrecen pero viven en fijos guardados
 * (GF.1, ADR 167 D4; mismo trato que CAT.1 dio a Vivienda en Gastos). Siguen
 * siendo válidas al leer, validar y editar: un fijo de Mercado se edita sin
 * perder su categoría y su teja sale de `CATEGORIA_AGENDA_ICONO`. Los tres
 * nombres viejos de `RENOMBRES_CATEGORIA_AGENDA` están acá solo por si llega
 * un dato sin migrar: la migración v55 los reescribe.
 */
export const CATEGORIAS_AGENDA_RETIRADAS = Object.freeze([
  'Mercado', 'Transporte', 'Mascotas', 'Internet', 'Telefonía', 'Otro',
]);

/**
 * Nombre viejo → nombre nuevo de una categoría de gasto fijo (GF.1, ADR 167
 * D2 y D3). La aplica la migración v55 de `storage.js` a los fijos guardados.
 */
export const RENOMBRES_CATEGORIA_AGENDA = Object.freeze({
  'Otro':      'Otros',
  'Internet':  'Internet y TV',
  'Telefonía': 'Celular',
});

/**
 * ¿Es una categoría nativa de gasto fijo, ofrecida o retirada? La pregunta
 * de validar y normalizar un fijo (GF.1).
 * @param {string} categoria
 * @returns {boolean}
 */
export function esCategoriaAgenda(categoria) {
  return CATEGORIAS_AGENDA.includes(categoria) || CATEGORIAS_AGENDA_RETIRADAS.includes(categoria);
}

/**
 * Categorías de gasto fijo que NO son esenciales: se pueden dar de baja sin
 * poner en riesgo la vida diaria, así que cuentan contra Estilo de vida (donde
 * el usuario decide) y no contra Necesidades. Lista cerrada por el
 * [ADR 014](../../docs/DECISIONS/014-taxonomia-categorias-transversal.md),
 * validación del 2026-07-13: Streaming y Suscripciones, nada más. Gimnasio y
 * Telefonía quedan como esenciales por decisión explícita.
 *
 * Fuente única de la dimensión (LIM.1b): la consumen el ejecutado de Límites
 * (`presupuesto/logic.js`) y el piso de Necesidades de la distribución
 * (`tesoreria/logic/distribucion.js`), que tienen que moverse juntos o Estilo
 * de vida aparece excedido contra un asignado que no lo incluye.
 *
 * GF.1 (ADR 167): las categorías nuevas son esenciales (la lista sigue
 * cerrada) y "Celular" hereda la decisión de "Telefonía".
 */
export const CATEGORIAS_AGENDA_NO_ESENCIALES = ['Streaming', 'Suscripciones'];

/**
 * Qué tags de `MARCAS` ofrece cada categoría de gasto fijo en el selector de
 * plataforma (SUS.1a, ADR 146 D3; es la decisión que el ADR 029 D4 dejó para
 * la UI). Una categoría que no está acá no muestra selector. El orden de los
 * tags es el orden de los grupos en el selector.
 *
 * GF.1 (ADR 167 D5): Servicios públicos, Medicina prepagada, Seguros y
 * Gimnasio ofrecen las empresas más conocidas del país. `telefonia` es el
 * operador que vende internet y celular; `tv` e `internet`, solo eso. WOM no
 * entra: perdió el nombre en 2026 y no hay uno nuevo confirmado (ADR 167).
 */
export const TAGS_CATEGORIA_AGENDA = Object.freeze({
  'Servicios públicos': ['servicios'],
  'Internet y TV':      ['telefonia', 'tv', 'internet'],
  'Celular':            ['telefonia', 'movil'],
  'Streaming':          ['streaming', 'musica'],
  'Suscripciones':      ['ia', 'nube', 'software', 'gaming', 'educacion', 'domicilios'],
  'Seguros':            ['seguros'],
  'Medicina prepagada': ['salud'],
  'Gimnasio':           ['gimnasio'],
});

/**
 * Ícono del sprite por categoría de gasto fijo (Agenda). Solo UI; nunca en el
 * valor almacenado. Lleva también las retiradas (GF.1): sus fijos guardados
 * siguen pintando su teja.
 */
export const CATEGORIA_AGENDA_ICONO = {
  'Arriendo':           'i-home',
  'Administración':     'c-edificio',
  'Servicios públicos': 'c-servicios',
  'Internet y TV':      'c-internet',
  'Celular':            'c-telefono',
  'Streaming':          'c-streaming',
  'Suscripciones':      'c-campana',
  'Educación':          'c-libro',
  'Seguros':            'c-escudo',
  'Medicina prepagada': 'c-salud',
  'Seguridad social':   'c-paraguas',
  'Impuestos':          'c-recibo',
  'Gimnasio':           'c-pesa',
  'Servicio doméstico': 'c-hogar',
  'Cuota de manejo':    'i-deudas',
  'Otros':              'c-otros',
  // Retiradas (GF.1): solo para los fijos que ya las tenían.
  'Mercado':            'c-mercado',
  'Transporte':         'c-bus',
  'Mascotas':           'c-mascotas',
  'Internet':           'c-internet',
  'Telefonía':          'c-telefono',
  'Otro':               'c-otros',
};

/**
 * Tipo de deuda (eje "qué") para deudas (Compromiso tipo='deuda-entidad'|'deuda-personal').
 * Valores orientados al propósito, ortogonales al eje "quién" (Entidad/Personal,
 * que define la unidad de tasa). Curado de 12 a 7 en ADR 015 (antes "Tipo de
 * obligación"). Los productos-mecanismo y la distinción formal/informal (Gota a
 * gota, Libranza, Sobregiro) viven en el eje Entidad/Personal y en la tasa, no aquí.
 * El orden define el del selector en el formulario de nueva deuda.
 */
export const CATEGORIAS_DEUDA = [
  'Tarjeta de crédito',
  'Libre inversión',
  'Vivienda',
  'Vehículo',
  'Educativo',
  'Compra a cuotas',
  'Otra',
];

/**
 * Prefijo del valor que identifica a una tarjeta de crédito en el selector de
 * origen del dinero (MC.16b, ADR 051 D3/D4). El selector es uno solo: sus
 * opciones son cuentas (valor = `cuenta.id`) y tarjetas (valor =
 * `tc:<compromisoId>`), así que elegir una excluye a la otra por construcción.
 * Vive acá porque lo comparten quien lo escribe (`infra/cuenta-helper.js`) y
 * quien lo lee (`gastos/logic.js`), y ningún dominio importa a otro.
 */
export const TARJETA_PREFIJO = 'tc:';

/** Ícono del sprite por tipo de deuda. Solo UI; nunca en el valor almacenado. */
export const CATEGORIA_DEUDA_ICONO = {
  'Tarjeta de crédito': 'i-deudas',
  'Libre inversión':    'c-billete',
  'Vivienda':           'i-home',
  'Vehículo':           'c-carro',
  'Educativo':          'c-birrete',
  'Compra a cuotas':    'c-compras',
  'Otra':               'c-otros',
};

/**
 * Relación de una deuda personal (eje "con quién", D.10, revisión del ADR 015).
 * Solo aplica a Compromiso tipo='deuda-personal': el catálogo de producto
 * (CATEGORIAS_DEUDA) no encaja cuando el acreedor es una persona o un comercio
 * de barrio. 'Fiado' cubre la deuda de tienda o vendedor que fía (D.13).
 * El orden define el del selector en el formulario de nueva deuda.
 */
export const CATEGORIAS_DEUDA_PERSONAL = [
  'Familiar',
  'Amigo',
  'Vecino',
  'Natillera',
  'Prestamista particular',
  'Fiado',
  'Otro',
];

/** Ícono del sprite por relación de deuda personal. Solo UI; nunca en el valor almacenado. */
export const CATEGORIA_DEUDA_PERSONAL_ICONO = {
  'Familiar':               'c-familia',
  'Amigo':                  'c-amigos',
  'Vecino':                 'c-vecino',
  'Natillera':              'c-bolsa',
  'Prestamista particular': 'c-maletin',
  'Fiado':                  'c-tienda',
  'Otro':                   'c-otros',
};

/**
 * Todas las categorías de meta reconocidas por el sistema, incluyendo las que
 * la taxonomía CAT.1c retiró del formulario ('Cumpleaños', 'Vacaciones'). No
 * se deben eliminar: `CATEGORIA_META_ICONO` se deriva de esta lista y es lo
 * que resuelve el ícono de las metas ya guardadas con esas categorías.
 * Foco en objetivos de alto costo (MT.1). Al elegir 'Otra', el usuario nombra
 * la meta libremente y elige su propio ícono (ver MT.3).
 */
export const CATEGORIAS_META = [
  'Viajes',
  'Cumpleaños',
  'Boda',
  'Vivienda',
  'Vehículo',
  'Computador',
  'Celular',
  'Educación',
  'Hijo(s)',
  'Vacaciones',
  'Emprendimiento',
  'Otra',
];

/**
 * Categorías visibles en el formulario de meta. Excluye las que la taxonomía
 * CAT.1c (ADR 014, validado el 2026-07-13) reclasificó: 'Cumpleaños' es un
 * gasto esporádico anual y vive en Apartados, y 'Vacaciones' se fusiona con
 * 'Viajes' (un solo concepto, una sola etiqueta). Se mantienen en
 * `CATEGORIAS_META` (no aquí) para que `CATEGORIA_META_ICONO` siga
 * resolviendo el ícono de las metas ya guardadas con esas categorías.
 * Mismo patrón que `CATEGORIAS_GASTO_USUARIO` (CAT.1a).
 */
export const CATEGORIAS_META_USUARIO = CATEGORIAS_META.filter(
  c => c !== 'Cumpleaños' && c !== 'Vacaciones',
);

/**
 * Subcategorías de meta (MT.6a, [ADR 048](../../docs/DECISIONS/048-metas-v2-subcategorias-y-plan-de-aportes.md) D1).
 *
 * Segundo nivel de la categoría: "Vehículo" dice de qué habla la meta, "Carro"
 * dice **qué** es. Ese dato es el que habilita reconocer el tipo de meta, y con
 * él las automatizaciones y las estadísticas que el ADR persigue.
 *
 * La forma es la que fija el [ADR 064](../../docs/DECISIONS/064-estructura-de-dos-niveles.md):
 * catálogo plano de hijos etiquetados con su padre, no un mapa de padre a lista
 * de hijos. Es la misma estructura que van a usar categoría a marca (ADR 029) y
 * entidad a producto (MC.16), y se lee con `hijosDeCategoria`/`hijoPorId` de
 * `infra/taxonomia.js`.
 *
 * El `id` es estable y es lo que se guarda en el registro: no se renombra
 * nunca. El `nombre` es texto visible y sí puede cambiar. Igual que `MARCAS`,
 * esto es **solo datos**: agregar una subcategoría es agregar una fila.
 *
 * 'Otra' no aparece a propósito: es el cajón de lo que el usuario nombra a mano
 * (MT.3), así que un segundo nivel predefinido ahí no tendría qué reconocer.
 */
export const SUBCATEGORIAS_META = [
  // Viajes
  { id: 'viajes-vuelo',          nombre: 'Vuelos o tiquetes',        categorias: ['Viajes'] },
  { id: 'viajes-hospedaje',      nombre: 'Hospedaje',                categorias: ['Viajes'] },
  { id: 'viajes-plan',           nombre: 'Plan o paquete completo',  categorias: ['Viajes'] },
  { id: 'viajes-documentos',     nombre: 'Pasaporte o visa',         categorias: ['Viajes'] },
  // Boda
  { id: 'boda-celebracion',      nombre: 'Ceremonia y celebración',  categorias: ['Boda'] },
  { id: 'boda-anillos',          nombre: 'Anillos',                  categorias: ['Boda'] },
  { id: 'boda-vestuario',        nombre: 'Vestuario',                categorias: ['Boda'] },
  { id: 'boda-luna-de-miel',     nombre: 'Luna de miel',             categorias: ['Boda'] },
  // Vivienda
  { id: 'vivienda-cuota-inicial', nombre: 'Cuota inicial',           categorias: ['Vivienda'] },
  { id: 'vivienda-remodelacion',  nombre: 'Remodelación',            categorias: ['Vivienda'] },
  { id: 'vivienda-muebles',       nombre: 'Muebles y electrodomésticos', categorias: ['Vivienda'] },
  { id: 'vivienda-mudanza',       nombre: 'Mudanza o arriendo por adelantado', categorias: ['Vivienda'] },
  // Vehículo
  { id: 'vehiculo-carro',        nombre: 'Carro',                    categorias: ['Vehículo'] },
  { id: 'vehiculo-moto',         nombre: 'Moto',                     categorias: ['Vehículo'] },
  { id: 'vehiculo-bicicleta',    nombre: 'Bicicleta',                categorias: ['Vehículo'] },
  { id: 'vehiculo-cuota-inicial', nombre: 'Cuota inicial',           categorias: ['Vehículo'] },
  // Computador
  { id: 'computador-portatil',   nombre: 'Portátil',                 categorias: ['Computador'] },
  { id: 'computador-escritorio', nombre: 'De escritorio',            categorias: ['Computador'] },
  { id: 'computador-tableta',    nombre: 'Tableta',                  categorias: ['Computador'] },
  // Celular
  { id: 'celular-nuevo',         nombre: 'Celular nuevo',            categorias: ['Celular'] },
  { id: 'celular-reposicion',    nombre: 'Reposición o cambio',      categorias: ['Celular'] },
  { id: 'celular-accesorios',    nombre: 'Accesorios',               categorias: ['Celular'] },
  // Educación
  { id: 'educacion-matricula',   nombre: 'Matrícula o semestre',     categorias: ['Educación'] },
  { id: 'educacion-posgrado',    nombre: 'Posgrado',                 categorias: ['Educación'] },
  { id: 'educacion-curso',       nombre: 'Curso o diplomado',        categorias: ['Educación'] },
  { id: 'educacion-idiomas',     nombre: 'Idiomas',                  categorias: ['Educación'] },
  // Hijo(s)
  { id: 'hijos-nacimiento',      nombre: 'Nacimiento',               categorias: ['Hijo(s)'] },
  { id: 'hijos-educacion',       nombre: 'Educación',                categorias: ['Hijo(s)'] },
  { id: 'hijos-salud',           nombre: 'Salud',                    categorias: ['Hijo(s)'] },
  // Emprendimiento
  { id: 'emprendimiento-capital', nombre: 'Capital inicial',         categorias: ['Emprendimiento'] },
  { id: 'emprendimiento-equipos', nombre: 'Equipos y herramientas',  categorias: ['Emprendimiento'] },
  { id: 'emprendimiento-local',   nombre: 'Local o puesto',          categorias: ['Emprendimiento'] },
];

/**
 * Ícono del sprite por categoría de meta. Solo UI; nunca en el valor
 * almacenado (el campo `icono` de la meta guarda únicamente el emoji que el
 * usuario elige a mano con la categoría 'Otra', MT.3/ID.3). Con el paso a
 * sprite, 'Vacaciones' y 'Emprendimiento' ganan metáfora propia (palmera y
 * cohete): la reconciliación de emojis de MT.1 ya no las limita.
 *
 * Cubre `CATEGORIAS_META` completo, no solo lo que hoy ofrece el formulario:
 * las entradas retiradas por CAT.1c ('Cumpleaños', 'Vacaciones') se conservan
 * para que una meta vieja siga mostrando su ícono de siempre.
 */
export const CATEGORIA_META_ICONO = {
  'Viajes':         'c-avion',
  'Cumpleaños':     'c-torta',
  'Boda':           'c-anillo',
  'Vivienda':       'i-home',
  'Vehículo':       'c-carro',
  'Computador':     'c-computador',
  'Celular':        'c-telefono',
  'Educación':      'c-libro',
  'Hijo(s)':        'c-biberon',
  'Vacaciones':     'c-palmera',
  'Emprendimiento': 'c-cohete',
  'Otra':           'c-otros',
};

/**
 * Silueta que se llena por categoría de meta (DIS.19, item 3 del informe de
 * gráficos). El ícono del sprite dice **qué** persigues; la silueta dice
 * además **cuánto llevas**, porque se llena de abajo hacia arriba como un
 * recipiente. Solo UI, igual que `CATEGORIA_META_ICONO`.
 *
 * Aquí vive el mapeo, no el dibujo: la geometría de cada forma está en
 * `infra/svg.js` (`SILUETAS`), que es su capa. Un símbolo del sprite no sirve
 * como silueta: la mayoría son trazos abiertos, y rellenar por altura un trazo
 * abierto no produce un nivel legible. Estas diez son figuras cerradas
 * derivadas de esos mismos glifos.
 *
 * El inventario es cerrado y cubre `CATEGORIAS_META_USUARIO` completo, así que
 * no hay categoría sin forma: 'Otra' es la caja, un destino legítimo y no un
 * caso de fallo. Las dos categorías que CAT.1c retiró del formulario se
 * resuelven donde la propia taxonomía las mandó: 'Vacaciones' se fusionó con
 * 'Viajes' (avión) y 'Cumpleaños' se fue a Apartados, así que hereda la caja.
 */
export const CATEGORIA_META_SILUETA = {
  'Viajes':         'avion',
  'Cumpleaños':     'caja',
  'Boda':           'anillo',
  'Vivienda':       'hogar',
  'Vehículo':       'carro',
  'Computador':     'computador',
  'Celular':        'telefono',
  'Educación':      'libro',
  'Hijo(s)':        'biberon',
  'Vacaciones':     'avion',
  'Emprendimiento': 'cohete',
  'Otra':           'caja',
};

/** Frecuencias soportadas en compromisos e ingresos recurrentes. */
export const FRECUENCIAS = [
  'Diario',
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
  'Única vez',
];

// ── Grupos financieros y mapeo sección → grupo (ADR 014) ─────────

/**
 * Los tres grupos en que se clasifica el dinero del usuario.
 * El orden refleja la prioridad de cubrimiento: Necesidades primero.
 * Reutilizado por MC.5 (límites de gasto) y MC.6 (distribución inteligente).
 */
export const GRUPOS_FINANCIEROS = ['necesidades', 'estilo-de-vida', 'ahorro'];

/** Etiqueta legible por grupo, para usar en UI. */
export const LABEL_GRUPO_FINANCIERO = {
  'necesidades':    'Necesidades',
  'estilo-de-vida': 'Estilo de vida',
  'ahorro':         'Ahorro',
};

/**
 * Mapeo canónico sección → grupo financiero (ADR 014).
 * Claves: identificadores del dominio en S (en minúsculas).
 *   'agenda'    → compromisos tipo='fijo'
 *   'deudas'    → compromisos tipo='deuda-entidad'|'deuda-personal' (cuota mínima)
 *   'gastos'    → S.gastos (consumo variable)
 *   'apartados' → S.apartados
 *   'metas'     → S.metas
 *   'ahorro'    → S.ahorro (fondo de emergencia + aportes)
 *   'inversion' → S.inversiones
 */
export const GRUPO_POR_SECCION = {
  'agenda':    'necesidades',
  'deudas':    'necesidades',
  'gastos':    'estilo-de-vida',
  'apartados': 'ahorro',
  'metas':     'ahorro',
  'ahorro':    'ahorro',
  'inversion': 'ahorro',
};

/**
 * Devuelve el grupo financiero al que pertenece una sección.
 * @param {string} seccion  Clave de sección (ej. 'gastos', 'agenda', 'deudas').
 * @returns {'necesidades'|'estilo-de-vida'|'ahorro'|null}
 */
export function clasificarSeccionEnGrupo(seccion) {
  return GRUPO_POR_SECCION[seccion] ?? null;
}

/**
 * Catálogo de secciones elegibles como acceso rápido personalizable en Inicio
 * (IN.4a, ADR 028 D2). Cubre lo que hoy vive detrás de "Más" (más Movimientos,
 * que tampoco tiene ícono propio en la barra, TX.8b): 1 toque desde Inicio en
 * vez de Inicio → Más → sección. `id` es independiente de `hash` a propósito
 * (si una ruta cambia de nombre algún día, `S.config.accesosInicio` no se
 * rompe: solo se actualiza el `hash` de esta entrada). `hash` también hace de
 * clave de color de dominio (`data-section`/`data-dom`, `--fk-dom-*`): cadena
 * vacía en las secciones sin color financiero propio (Ajustes; Movimientos
 * combina varias fuentes y no tiene uno solo, igual que su ícono en Actividad
 * reciente) cae al gris neutro por defecto, sin agregar una regla CSS nueva.
 * Sección nueva futura = 1 fila más acá, sin tocar el resto del sistema.
 *
 * @typedef {Object} AccesoInicio
 * @property {string} id
 * @property {string} hash
 * @property {string} nombre
 * @property {string} icono  Id completo del símbolo del sprite (`i-*`).
 */
export const ACCESOS_INICIO = [
  { id: 'tesoreria',   hash: 'tesoreria',   nombre: 'Mis cuentas',  icono: 'i-cuentas' },
  { id: 'compromisos', hash: 'compromisos', nombre: 'Por pagar',    icono: 'i-deudas' },
  { id: 'presupuesto', hash: 'presupuesto', nombre: 'Límites',      icono: 'i-presupuesto' },
  { id: 'personales',  hash: 'personales',  nombre: 'Me deben',     icono: 'i-personales' },
  { id: 'analisis',    hash: 'analisis',    nombre: 'Análisis',     icono: 'i-analisis' },
  { id: 'movimientos', hash: 'movimientos', nombre: 'Movimientos',  icono: 'i-recurring' },
  { id: 'config',      hash: 'config',      nombre: 'Ajustes',      icono: 'i-ajustes' },
];

/**
 * Accesos rápidos por defecto para un usuario nuevo: Mis cuentas, Por pagar y
 * Me deben.
 *
 * Criterio (ficha 02 de la auditoría móvil, [ADR 069]): **un atajo solo se
 * gana Inicio si ahorra al menos un toque**. Con la barra nueva, Ahorro está
 * a un toque y Límites se ve al entrar a Gastos, así que el defecto anterior
 * (`tesoreria`, `ahorro`, `presupuesto`) tenía dos tejas que no acortaban
 * nada. Ahorro sale también del catálogo por el mismo motivo: un atajo que no
 * ahorra pasos enseña que la sección de atajos no vale la pena mirarla.
 *
 * Los ids guardados que ya no existen en el catálogo se descartan solos
 * (`accesosVisibles`), así que quien tenía "Ahorro" configurado no necesita
 * migración: la teja desaparece y el resto de su selección se conserva.
 *
 * Ver análisis completo en `docs/contexto/inicio.md` (IN.4a).
 */
export const ACCESOS_INICIO_DEFAULT = ['tesoreria', 'compromisos', 'personales'];

/**
 * Catálogo de novedades por versión (UPD.1). Clave = mismo número que
 * `CACHE_NAME` en `service-worker.js` en el momento del release; no hace
 * falta una entrada por cada bump (la mayoría son invisibles para el
 * usuario), solo cuando vale la pena avisar. Ver runbook "Bump del Service
 * Worker" en `docs/OPERACION.md`.
 *
 * @type {Record<number, { titulo: string, items: string[] }>}
 */
export const NOVEDADES_POR_VERSION = {
  // ADR 130 D3: la primera entrada anuncia la identidad v3 (ADR 127 a 129).
  672: {
    titulo: 'Finko estrena imagen',
    items: [
      'Colores nuevos que salen del logo de Finko, en el tema oscuro y en el claro.',
      'El total de cada sección se lee en una tarjeta con su color.',
      'Tino, el guatín de Finko, te acompaña cuando una sección está vacía y celebra contigo tus logros.',
    ],
  },
  // GAS.5 (ADR 161 a 164): el pedido "Gastos día a día", para quien actualiza.
  764: {
    titulo: 'Tus gastos, más claros',
    items: [
      'Al anotar un gasto eliges en qué fue: Taxi, Almuerzo de trabajo, Domicilio y más.',
      'Si depende del día, Finko te pregunta si fue una necesidad o un deseo, solo para ese gasto.',
      'Ninguna cuenta queda por debajo de $0: si no alcanza, Finko te dice cuánto falta.',
      'En Límites puedes ponerle un máximo a toda la categoría o a cada subcategoría.',
    ],
  },
  // GF.1 (ADR 167): el pedido "Gastos fijos", para quien actualiza.
  768: {
    titulo: 'Tus gastos fijos, más ordenados',
    items: [
      'El monto de un gasto fijo se escribe igual que en tus gastos del día a día.',
      'Categorías nuevas: Medicina prepagada, Seguridad social, Impuestos y Servicio doméstico.',
      'Elige tu empresa: EPM, Enel, Vanti, Claro, Sura, Smart Fit y otras del país.',
      'Mercado y Transporte se anotan en Día a día. "Otros" sirve para lo que no encaja.',
    ],
  },
  // GF.2 (ADR 177): el gasto fijo en cuatro pasos con nombre.
  777: {
    titulo: 'Crear un gasto fijo, paso a paso',
    items: [
      'Cuatro pasos con nombre: cuánto pagas, qué es, cuándo lo pagas y revisar.',
      'Las categorías van por grupos: Casa, Conexión y entretenimiento, Salud y bienestar, y Estudio, banco e impuestos.',
      'La empresa tiene su propia pantalla; si no está, toca "Sin empresa".',
      'Cada cuánto y qué día se eligen juntos, y ves cuándo aparecerá en tu calendario.',
      'Al elegir una opción, Finko te lleva solo al paso siguiente: sin botones de más.',
    ],
  },
};

/**
 * Última versión del catálogo de novedades conocida en este build. Un
 * usuario nuevo (o uno que migra a `config.ultimaVersionVista`, schema v32)
 * arranca "al día" con esto, para no mostrarle de golpe todo el historial.
 * @returns {number}
 */
export function ultimaVersionNovedadesConocida() {
  const claves = Object.keys(NOVEDADES_POR_VERSION).map(Number);
  return claves.length ? Math.max(...claves) : 0;
}
