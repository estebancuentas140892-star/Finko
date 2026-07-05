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
 * Nequi usa sus colores oficiales verificados (fondo berenjena #200020, isotipo
 * magenta #CA0080), corregidos en MK.1 desde el morado aproximado anterior.
 */
export const BANCOS_CO = [
  { id: 'Efectivo',             iniciales: '💵', color: '#16a34a', texto: '#ffffff', clase: 'efectivo', simbolo: 'i-saldo'  },
  { id: 'Bancolombia',          iniciales: 'BC', color: '#FFC727', texto: '#1a1a1a', clase: 'banco'     },
  { id: 'Davivienda',           iniciales: 'DV', color: '#E31837', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco de Bogotá',      iniciales: 'BB', color: '#00438C', texto: '#ffffff', clase: 'banco'     },
  { id: 'BBVA Colombia',        iniciales: 'BV', color: '#004A9C', texto: '#ffffff', clase: 'banco',     aliases: ['bbva'] },
  { id: 'Banco Popular',        iniciales: 'BP', color: '#0B5394', texto: '#ffffff', clase: 'banco'     },
  { id: 'Scotiabank Colpatria', iniciales: 'SC', color: '#EC111A', texto: '#ffffff', clase: 'banco',     aliases: ['scotiabank', 'colpatria'] },
  { id: 'Banco de Occidente',   iniciales: 'BO', color: '#005B8E', texto: '#ffffff', clase: 'banco'     },
  { id: 'Banco AV Villas',      iniciales: 'AV', color: '#E4002B', texto: '#ffffff', clase: 'banco',     aliases: ['av villas'] },
  { id: 'Nequi',                iniciales: 'Nq', color: '#200020', texto: '#CA0080', clase: 'billetera', simbolo: 'b-nequi'  },
  { id: 'Daviplata',            iniciales: 'Dp', color: '#FF8000', texto: '#ffffff', clase: 'billetera' },
  { id: 'Nubank',               iniciales: 'Nu', color: '#820AD1', texto: '#ffffff', clase: 'billetera', simbolo: 'b-nubank', aliases: ['nu'] },
  { id: 'Lulo Bank',            iniciales: 'LB', color: '#FF5A1F', texto: '#ffffff', clase: 'billetera', aliases: ['lulo'] },
  { id: 'Otro',                 iniciales: '?',  color: '#6B7280', texto: '#ffffff', clase: 'otro'      },
];

/**
 * Marcas globales de suscripciones y servicios (MK.2, ADR 025 D2/D4).
 *
 * Cada entrada tiene:
 *   id        - slug estable de la marca (no se guarda en datos del usuario:
 *               la resolución es siempre por texto libre vía aliases).
 *   nombre    - nombre comercial para mostrar.
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
 * verificados uno a uno el 2026-07-05. Disney+, Claro, Tigo y Rappi no están
 * en Simple Icons y ChatGPT/OpenAI fue retirado de su versión vigente: esas
 * marcas quedan con iniciales (fallback natural, D2) hasta tener referencia
 * vectorial confiable. Colores: los de Simple Icons son oficiales; los de
 * Disney+, ChatGPT, Claro, Tigo, Prime Video y el fondo de Platzi son
 * aproximaciones documentadas (mismo tratamiento que tuvo Nequi antes de
 * MK.1); Rappi (#FF441F) está verificado contra el theme-color de su sitio.
 * Retirar una marca = borrar su fila: el consumidor cae al ícono de categoría.
 */
export const MARCAS = [
  // Streaming y entretenimiento
  { id: 'netflix',     nombre: 'Netflix',      aliases: ['netflix'],                                 color: '#E50914', texto: '#ffffff', iniciales: 'N',  simbolo: 'b-netflix' },
  { id: 'spotify',     nombre: 'Spotify',      aliases: ['spotify'],                                 color: '#1ED760', texto: '#121212', iniciales: 'S',  simbolo: 'b-spotify' },
  { id: 'youtube',     nombre: 'YouTube',      aliases: ['youtube'],                                 color: '#FF0000', texto: '#ffffff', iniciales: 'YT', simbolo: 'b-youtube' },
  { id: 'disneyplus',  nombre: 'Disney+',      aliases: ['disney'],                                  color: '#113CCF', texto: '#ffffff', iniciales: 'D+' },
  { id: 'hbomax',      nombre: 'HBO Max',      aliases: ['hbo'],                                     color: '#000000', texto: '#ffffff', iniciales: 'HB', simbolo: 'b-hbomax' },
  { id: 'primevideo',  nombre: 'Prime Video',  aliases: ['prime video', 'amazon prime', 'amazon'],   color: '#00A8E1', texto: '#ffffff', iniciales: 'PV' },
  { id: 'crunchyroll', nombre: 'Crunchyroll',  aliases: ['crunchyroll'],                             color: '#FF5E00', texto: '#ffffff', iniciales: 'CR', simbolo: 'b-crunchyroll' },
  // Tecnología e IA
  { id: 'icloud',      nombre: 'iCloud',       aliases: ['icloud'],                                  color: '#3693F3', texto: '#ffffff', iniciales: 'iC', simbolo: 'b-icloud' },
  { id: 'apple',       nombre: 'Apple',        aliases: ['apple'],                                   color: '#000000', texto: '#ffffff', iniciales: 'A',  simbolo: 'b-apple' },
  { id: 'claude',      nombre: 'Claude',       aliases: ['claude', 'anthropic'],                     color: '#D97757', texto: '#ffffff', iniciales: 'C',  simbolo: 'b-claude' },
  { id: 'chatgpt',     nombre: 'ChatGPT',      aliases: ['chatgpt', 'chat gpt', 'openai'],           color: '#10A37F', texto: '#ffffff', iniciales: 'AI' },
  { id: 'gemini',      nombre: 'Gemini',       aliases: ['gemini'],                                  color: '#8E75B2', texto: '#ffffff', iniciales: 'G',  simbolo: 'b-googlegemini' },
  { id: 'google',      nombre: 'Google',       aliases: ['google'],                                  color: '#4285F4', texto: '#ffffff', iniciales: 'G',  simbolo: 'b-google' },
  // Pagos
  { id: 'paypal',      nombre: 'PayPal',       aliases: ['paypal', 'pay pal'],                       color: '#002991', texto: '#ffffff', iniciales: 'PP', simbolo: 'b-paypal' },
  { id: 'mercadopago', nombre: 'Mercado Pago', aliases: ['mercado pago', 'mercadopago'],             color: '#00B1EA', texto: '#ffffff', iniciales: 'MP', simbolo: 'b-mercadopago' },
  // Telefonía e internet
  { id: 'movistar',    nombre: 'Movistar',     aliases: ['movistar'],                                color: '#019DF4', texto: '#ffffff', iniciales: 'M',  simbolo: 'b-movistar' },
  { id: 'claro',       nombre: 'Claro',        aliases: ['claro'],                                   color: '#DA291C', texto: '#ffffff', iniciales: 'CL' },
  { id: 'tigo',        nombre: 'Tigo',         aliases: ['tigo'],                                    color: '#00377B', texto: '#ffffff', iniciales: 'TG' },
  // Transporte y domicilios
  { id: 'uber',        nombre: 'Uber',         aliases: ['uber'],                                    color: '#000000', texto: '#ffffff', iniciales: 'U',  simbolo: 'b-uber' },
  { id: 'rappi',       nombre: 'Rappi',        aliases: ['rappi', 'rappipro'],                       color: '#FF441F', texto: '#ffffff', iniciales: 'R'  },
  // Gaming y educación
  { id: 'playstation', nombre: 'PlayStation',  aliases: ['playstation', 'play station', 'ps plus'],  color: '#0070D1', texto: '#ffffff', iniciales: 'PS', simbolo: 'b-playstation' },
  { id: 'xbox',        nombre: 'Xbox',         aliases: ['xbox', 'game pass', 'gamepass'],           color: '#107C10', texto: '#ffffff', iniciales: 'XB' },
  { id: 'duolingo',    nombre: 'Duolingo',     aliases: ['duolingo'],                                color: '#58CC02', texto: '#ffffff', iniciales: 'DU', simbolo: 'b-duolingo' },
  { id: 'platzi',      nombre: 'Platzi',       aliases: ['platzi'],                                  color: '#121F3D', texto: '#98CA3F', iniciales: 'PL', simbolo: 'b-platzi' },
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
 * Todas las categorías de gasto reconocidas por el sistema, incluyendo las
 * internas ("Deudas", "Ahorro") que el código usa al crear gastos-abono o
 * al calcular distribución de ingresos. No se deben eliminar: romperían la
 * lógica de compromisos/index.js y tesorería/logic.js.
 */
export const CATEGORIAS_GASTO = [
  'Mercado',
  'Restaurantes',
  'Café',
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
  'Gastos hormiga',
  'Deudas',
  'Ahorro',
  'Alimentación',
  'Otros',
];

/**
 * Categorías visibles en el formulario de gasto. Excluye las internas
 * ("Deudas" para abonos, "Ahorro" para aportes) y la legacy
 * ("Alimentación", reemplazada por Mercado/Restaurantes en v15).
 */
export const CATEGORIAS_GASTO_USUARIO = CATEGORIAS_GASTO.filter(
  c => c !== 'Deudas' && c !== 'Ahorro' && c !== 'Alimentación',
);

/**
 * Categorías que suelen corresponder a gastos fijos mensuales (recurrentes).
 * Al elegir una de estas en el formulario de gasto, se muestra un hint no
 * bloqueante que orienta al usuario a registrarlo como gasto fijo en Agenda
 * si es recurrente. No limita la decisión: puede registrarlo como ocasional.
 */
export const CATEGORIAS_TIPICAMENTE_FIJAS = new Set([
  'Vivienda',
  'Servicios públicos',
  'Educación',
]);

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
  'Gastos hormiga':     'c-hormiga',
  'Deudas':             'i-deudas',
  'Ahorro':             'i-ahorro',
  'Alimentación':       'c-mercado',
  'Otros':              'c-otros',
};

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
 */
export const CATEGORIAS_AGENDA = [
  'Arriendo',
  'Administración',
  'Servicios públicos',
  'Mercado',
  'Internet',
  'Telefonía',
  'Streaming',
  'Suscripciones',
  'Seguros',
  'Educación',
  'Gimnasio',
  'Cuota de manejo',
  'Transporte',
  'Mascotas',
  'Otro',
];

/** Ícono del sprite por categoría de gasto fijo (Agenda). Solo UI; nunca en el valor almacenado. */
export const CATEGORIA_AGENDA_ICONO = {
  'Arriendo':           'i-home',
  'Administración':     'c-edificio',
  'Servicios públicos': 'c-servicios',
  'Mercado':            'c-mercado',
  'Internet':           'c-internet',
  'Telefonía':          'c-telefono',
  'Streaming':          'c-streaming',
  'Suscripciones':      'c-campana',
  'Seguros':            'c-escudo',
  'Educación':          'c-libro',
  'Gimnasio':           'c-pesa',
  'Cuota de manejo':    'i-deudas',
  'Transporte':         'c-bus',
  'Mascotas':           'c-mascotas',
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
 * Categorías predefinidas para metas de ahorro (Compromiso libre, no recurrente).
 * Foco en objetivos de alto costo (MT.1). El orden define el del selector en
 * el formulario "Nueva meta". Al elegir 'Otra', el usuario nombra la meta
 * libremente y elige su propio ícono (ver MT.3).
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
 * Ícono del sprite por categoría de meta. Solo UI; nunca en el valor
 * almacenado (el campo `icono` de la meta guarda únicamente el emoji que el
 * usuario elige a mano con la categoría 'Otra', MT.3/ID.3). Con el paso a
 * sprite, 'Vacaciones' y 'Emprendimiento' ganan metáfora propia (palmera y
 * cohete): la reconciliación de emojis de MT.1 ya no las limita.
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
