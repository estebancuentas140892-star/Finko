/**
 * ahorro/logic.js - funciones puras del dominio Ahorro (J.1).
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * El "fondo de emergencia" es el colchón de gastos fijos mensuales que la
 * persona aparta para imprevistos. Aquí calculamos objetivo, progreso y
 * meses de colchón cubiertos a partir de números primitivos: el caller
 * (ahorro/index.js) es quien lee S y calcula `gastosFijosMensuales`. Así
 * respetamos la regla ADN #10: ahorro no importa de otro dominio.
 */

import { f } from '../../infra/utils.js';

// ── RANGOS PERMITIDOS ────────────────────────────────────────────

/** Mínimo razonable de meses del fondo. */
export const META_MESES_MIN = 1;

/** Máximo razonable: 12 meses ya es muy holgado, evita valores absurdos. */
export const META_MESES_MAX = 12;

/** Default sugerido al activar el fondo: 3 meses (Banco de la República, ABC). */
export const META_MESES_DEFAULT = 3;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Objetivo del fondo en COP. Es lo que el usuario quiere tener apartado para
 * cubrir `metaMeses` de sus gastos fijos mensuales actuales.
 *
 * @param {number} gastosFijosMensuales COP que el usuario gasta en compromisos
 *                                      fijos por mes (cuotas + servicios).
 * @param {number} metaMeses            Cuántos meses cubrir.
 * @returns {number} COP del objetivo. Nunca negativo; 0 si los inputs no son válidos.
 */
export function calcularObjetivoFondo(gastosFijosMensuales, metaMeses) {
  const fijos = Number(gastosFijosMensuales);
  const meses = Number(metaMeses);
  if (!Number.isFinite(fijos) || fijos <= 0) return 0;
  if (!Number.isFinite(meses) || meses <= 0) return 0;
  return Math.round(fijos * meses);
}

/**
 * Progreso del fondo de emergencia.
 *
 * @param {number} montoActual Lo que ya tiene apartado el usuario.
 * @param {number} objetivo    Lo que necesita para cubrir su meta.
 * @returns {{ porcentaje: number, faltante: number, completado: boolean }}
 *   - porcentaje: 0-100 entero, redondeado.
 *   - faltante:   COP que falta para alcanzar el objetivo (nunca negativo).
 *   - completado: true si `montoActual >= objetivo` y objetivo > 0.
 */
export function calcularProgresoFondo(montoActual, objetivo) {
  const actual = Math.max(0, Number(montoActual) || 0);
  const meta   = Number(objetivo);
  if (!Number.isFinite(meta) || meta <= 0) {
    return { porcentaje: 0, faltante: 0, completado: false };
  }
  const porcentaje = Math.min(100, Math.round((actual / meta) * 100));
  const faltante   = Math.max(0, meta - actual);
  return { porcentaje, faltante, completado: porcentaje >= 100 };
}

/**
 * Cuántos meses de gastos fijos cubre el monto actual. Útil para mostrar al
 * usuario "tu fondo cubre X meses" en vez de solo un porcentaje.
 *
 * @param {number} montoActual           COP que ya tiene apartado.
 * @param {number} gastosFijosMensuales  COP/mes de gastos fijos.
 * @returns {number|null}
 *   - null si no se puede calcular (sin gastos fijos > 0 → ratio indefinido).
 *   - 0 o positivo, con 1 decimal (ej. 2.5 meses).
 */
export function mesesDeColchon(montoActual, gastosFijosMensuales) {
  const actual = Math.max(0, Number(montoActual) || 0);
  const fijos  = Number(gastosFijosMensuales);
  if (!Number.isFinite(fijos) || fijos <= 0) return null;
  return Math.round((actual / fijos) * 10) / 10;
}

/**
 * Tasa de ahorro mensual: qué porcentaje de los ingresos quedó libre tras
 * cubrir los gastos. Útil para el nudge "ahorrás X%" (J.1b).
 *
 * Convención: devuelve null si no se puede calcular (sin ingresos). Si los
 * gastos superan a los ingresos, retorna un porcentaje negativo (info al
 * usuario, no error).
 *
 * @param {number} ingresos COP/mes.
 * @param {number} gastos   COP/mes (egresos: gastos + cuotas).
 * @returns {number|null} porcentaje entero (0-100, puede ser negativo).
 */
export function calcularTasaAhorro(ingresos, gastos) {
  const ing = Number(ingresos);
  const gas = Number(gastos);
  if (!Number.isFinite(ing) || ing <= 0) return null;
  if (!Number.isFinite(gas)) return null;
  return Math.round(((ing - gas) / ing) * 100);
}

// ── CASA DE AHORRO (DIS.18, ADR 009 restaurado) ──────────────────

/**
 * Las cuatro modalidades de ahorro, con su propósito y su unidad.
 *
 * El propósito no es decoración: la casa es **la única pantalla donde los cuatro
 * nombres conviven**, así que es el único lugar donde la diferencia se puede
 * enseñar comparando. Hoy esa explicación vive repartida en los estados vacíos
 * de Metas y Apartados, que se remiten entre sí, o sea en la pantalla a la que
 * el usuario llegó equivocado.
 *
 * `seccion` es el hash de destino, no la clave del dominio: el fondo vive en
 * `#fondo` desde DIS.18, porque `#ahorro` pasó a ser esta casa.
 */
export const MODALIDADES_AHORRO = [
  {
    clave: 'fondo', seccion: 'fondo', icono: 'ahorro', label: 'Fondo de emergencia',
    cuando: 'Ojalá nunca lo uses',
    proposito: 'Para cuando algo se dañe o te quedes sin ingresos',
  },
  {
    clave: 'apartados', seccion: 'apartados', icono: 'apartados', label: 'Apartados',
    cuando: 'En una fecha que no elegiste',
    proposito: 'Para pagos que ya sabes que llegan',
  },
  {
    clave: 'metas', seccion: 'metas', icono: 'metas', label: 'Metas',
    cuando: 'Algún día, cuando quieras',
    proposito: 'Para algo que quieres comprar o hacer',
  },
  {
    clave: 'inversiones', seccion: 'inversion', icono: 'inversion', label: 'Inversión',
    cuando: 'Además, creciendo',
    proposito: 'Dinero que pusiste a crecer',
  },
];

/**
 * Las cuatro filas de la casa de Ahorro: cuánto hay en cada modalidad, para qué
 * sirve y en qué va, cada una en **su propia unidad**.
 *
 * Antes de DIS.18 esto era `consolidarAhorro()`, que ordenaba por monto y
 * escondía las modalidades en cero: servía para un desglose de solo lectura
 * repetido en cuatro pantallas. Acá las filas **son la navegación**, así que el
 * orden es fijo y ninguna se esconde: una modalidad que no aparece no se puede
 * descubrir.
 *
 * DIS.19 (item 2): el orden lo fija **una sola pregunta**, ¿cuándo vas a usar
 * este dinero? Ojalá nunca (fondo), en una fecha que no elegiste (apartados),
 * algún día (metas), y además creciendo (inversión). Antes el orden era "del más
 * urgente al más lejano", que decía casi lo mismo sin poder explicarse: el
 * rótulo `cuando` es lo que vuelve legible la secuencia, y sin él dos personas
 * podían ordenar distinto y las dos tener razón.
 *
 * El estado en la unidad de cada sección (meses cubiertos, metas en curso, días
 * al próximo cobro, inversiones abiertas) es lo que permite decidir a dónde
 * entrar sin entrar. Función pura: recibe totales y conteos ya calculados, así
 * que este dominio no importa a ninguno de los otros tres (regla ADN #10).
 *
 * @param {{
 *   montos?: { fondo?: number, metas?: number, apartados?: number, inversiones?: number },
 *   mesesCubiertos?: number|null,
 *   metasEnCurso?: number,
 *   diasProximoApartado?: number|null,
 *   inversionesAbiertas?: number,
 * }} [datos]
 * @returns {{
 *   total: number,
 *   filas: Array<{
 *     clave: string, seccion: string, icono: string, label: string,
 *     proposito: string, monto: number, estado: string,
 *   }>,
 * }}
 */
export function casaAhorro({
  montos = {}, mesesCubiertos = null, metasEnCurso = 0,
  diasProximoApartado = null, inversionesAbiertas = 0,
} = {}) {
  const limpio = (n) => Math.max(0, Number(n) || 0);
  const porClave = {
    fondo:       limpio(montos.fondo),
    metas:       limpio(montos.metas),
    apartados:   limpio(montos.apartados),
    inversiones: limpio(montos.inversiones),
  };

  const estados = {
    fondo:       _estadoFondo(mesesCubiertos),
    metas:       _estadoMetas(metasEnCurso),
    apartados:   _estadoApartados(diasProximoApartado, porClave.apartados),
    inversiones: _estadoInversion(inversionesAbiertas),
  };

  const filas = MODALIDADES_AHORRO.map(m => ({
    ...m, monto: porClave[m.clave], estado: estados[m.clave],
  }));

  return { total: filas.reduce((sum, fila) => sum + fila.monto, 0), filas };
}

/**
 * Días que faltan para el apartado que se cobra primero.
 *
 * Recibe la lista de apartados como dato (no importa el dominio Apartados,
 * regla ADN #10, igual que `_gastosFijosMensuales()` en index.js replica el
 * factor de frecuencia de compromisos). Solo mira los que tienen fecha: un
 * apartado sin `fechaObjetivo` no tiene próximo cobro que anunciar.
 *
 * @param {Array<{ fechaObjetivo?: string, activo?: boolean }>} apartados
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {number|null} negativo si el más próximo ya venció; null si ninguno tiene fecha.
 */
export function diasAlProximoApartado(apartados, hoyISO) {
  if (!Array.isArray(apartados) || !hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;
  const base = new Date(`${hoyISO}T12:00:00Z`);
  if (isNaN(base)) return null;

  let minimo = null;
  for (const a of apartados) {
    if (!a || a.activo === false) continue;
    const fecha = a.fechaObjetivo;
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue;
    const d = new Date(`${fecha}T12:00:00Z`);
    if (isNaN(d)) continue;
    const dias = Math.round((d - base) / 86_400_000);
    if (minimo === null || dias < minimo) minimo = dias;
  }
  return minimo;
}

/** Estado del fondo, en la unidad de su sección: tiempo cubierto (DIS.16). */
function _estadoFondo(mesesCubiertos) {
  const meses = Number(mesesCubiertos);
  if (!Number.isFinite(meses) || meses <= 0) return 'sin empezar';
  return `${mesesEnPalabras(meses)} cubiertos`;
}

/** Estado de Metas: cuántas están en curso (las cumplidas ya no piden nada). */
function _estadoMetas(metasEnCurso) {
  const n = Math.max(0, Math.round(Number(metasEnCurso) || 0));
  if (n === 0) return 'ninguna todavía';
  return n === 1 ? '1 en curso' : `${n} en curso`;
}

/**
 * Estado de Apartados: cuándo llega el próximo cobro, que es su unidad (DIS.15).
 * Con dinero apartado pero sin fecha por delante, se dice eso y no un plazo
 * inventado. `dias` negativo significa vencido: eso es lo que hay que ver.
 */
function _estadoApartados(diasProximoApartado, monto) {
  // `Number(null)` es 0, y 0 días significa "vence hoy": el chequeo de tipo
  // tiene que ir antes que la conversión o un apartado sin fecha se anuncia
  // como si venciera hoy.
  const dias = typeof diasProximoApartado === 'number' ? diasProximoApartado : NaN;
  if (!Number.isFinite(dias)) return monto > 0 ? 'sin fecha próxima' : 'ninguno todavía';
  if (dias < 0)   return 'uno ya venció';
  if (dias === 0) return 'uno vence hoy';
  if (dias === 1) return 'el más próximo, mañana';
  return `el más próximo, en ${dias} días`;
}

/** Estado de Inversión: cuántas hay abiertas. */
function _estadoInversion(inversionesAbiertas) {
  const n = Math.max(0, Math.round(Number(inversionesAbiertas) || 0));
  if (n === 0) return 'ninguna todavía';
  return n === 1 ? '1 inversión' : `${n} inversiones`;
}

// ── NIVELES DE PROTECCIÓN (DIS.16, arquitectura I+H) ─────────────

/**
 * Los tres niveles del fondo, en meses cubiertos y en lenguaje corriente.
 *
 * Un fondo **no se completa**: llegar a tres meses no es el final, la
 * recomendación sensata es seguir hasta seis. Los niveles convierten un camino
 * largo sin final en una serie de logros nombrados, y el nombre es lo que hace
 * el trabajo: "60%" no significa nada, "buscas trabajo con calma" sí. Son fijos
 * (1, 3 y 6) aunque el usuario apunte a otra meta: la escalera es el camino
 * posible, la meta es su situación elegida.
 *
 * Los textos no llevan jerga ni dramatizan (ADR 003): "con calma" y no "sin
 * pánico", que mete miedo donde debía haber tranquilidad.
 */
export const NIVELES_FONDO = [
  { meses: 1, titulo: 'Un mes',    consecuencia: 'si algo pasa, no corres',       logrado: 'Un mes cubierto' },
  { meses: 3, titulo: 'Tres meses', consecuencia: 'buscas trabajo con calma',     logrado: 'Tres meses cubiertos' },
  { meses: 6, titulo: 'Seis meses', consecuencia: 'aguantas algo grande',         logrado: 'Seis meses cubiertos' },
];

/**
 * Estado de cada nivel para los meses de colchón que el usuario tiene hoy.
 *
 * Un nivel logrado **no se retira** cuando el objetivo se mueve: si suben los
 * gastos fijos el usuario no perdió nada, cambió lo que falta. Por eso el corte
 * es contra los meses cubiertos y no contra un porcentaje del objetivo.
 *
 * El `pct` del nivel en curso es **relativo a su tramo** (del nivel anterior al
 * suyo), no al objetivo global: es la distancia que hay que recorrer ahora, y
 * el avance global ya está dicho arriba en meses.
 *
 * @param {number|null} mesesCubiertos Salida de `mesesDeColchon()`.
 * @returns {Array<{
 *   meses: number, titulo: string, consecuencia: string, logrado: string,
 *   estado: 'logrado'|'actual'|'lejano', pct: number|null,
 * }>}
 */
export function nivelesFondo(mesesCubiertos) {
  const cubiertos = Math.max(0, Number(mesesCubiertos) || 0);
  let actualAsignado = false;

  return NIVELES_FONDO.map((nivel, i) => {
    if (cubiertos >= nivel.meses) {
      return { ...nivel, estado: 'logrado', pct: 100 };
    }
    if (!actualAsignado) {
      actualAsignado = true;
      const desde = i === 0 ? 0 : NIVELES_FONDO[i - 1].meses;
      const tramo = nivel.meses - desde;
      const pct   = Math.max(0, Math.min(100, Math.round(((cubiertos - desde) / tramo) * 100)));
      return { ...nivel, estado: 'actual', pct };
    }
    return { ...nivel, estado: 'lejano', pct: null };
  });
}

/**
 * Cuánto tiempo cubre el fondo, dicho como lo diría una persona.
 *
 * "1,8 meses" es lenguaje de hoja de cálculo: nadie piensa en decimales de mes,
 * y era la cifra más importante de la sección. Un mes se cuenta acá como cuatro
 * semanas: no es exacto, pero es la cuenta que hace cualquiera.
 *
 * @param {number|null} meses
 * @returns {string} ej. "1 mes y 3 semanas", "3 semanas", "0 meses".
 */
export function mesesEnPalabras(meses) {
  const n = Number(meses);
  if (!Number.isFinite(n) || n <= 0) return '0 meses';

  let enteros  = Math.floor(n);
  let semanas  = Math.round((n - enteros) * 4);
  if (semanas === 4) { enteros += 1; semanas = 0; }

  const partes = [];
  if (enteros > 0) partes.push(`${enteros} ${enteros === 1 ? 'mes' : 'meses'}`);
  if (semanas > 0) partes.push(`${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`);
  if (partes.length === 0) return 'menos de una semana';
  return partes.join(' y ');
}

/** Días que dura un mes, promediados: el fondo se mide en meses, no en fechas exactas. */
const _DIAS_POR_MES = 30.44;

/**
 * Hasta qué día alcanza el fondo si hoy se cortaran los ingresos.
 *
 * Es la traducción visceral de la sección: una fecha se siente de una forma que
 * un porcentaje no, y cada aporte la mueve hacia adelante. **Es hipotética** y
 * la vista tiene que decirlo ("si hoy dejaras de recibir ingresos"), o parece
 * un pronóstico.
 *
 * @param {number|null} mesesCubiertos
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {string|null} YYYY-MM-DD, o null si no hay cobertura que datar.
 */
export function fechaCobertura(mesesCubiertos, hoyISO) {
  const meses = Number(mesesCubiertos);
  if (!Number.isFinite(meses) || meses <= 0) return null;
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;

  const d = new Date(`${hoyISO}T12:00:00Z`);
  if (isNaN(d)) return null;
  d.setUTCDate(d.getUTCDate() + Math.round(meses * _DIAS_POR_MES));
  return d.toISOString().slice(0, 10);
}

/**
 * Los meses del calendario que el fondo cubre, en bloques.
 *
 * Son la **prueba** del nivel: "cubres un mes" es una afirmación que hay que
 * creer, y agosto entero más casi todo septiembre se ve. Cada bloque es un mes
 * corrido desde el actual, relleno con la fracción que el fondo alcanza a
 * cubrir. Se dibujan tantos como la meta del usuario, no como el último nivel:
 * los bloques son su situación real, la escalera es el camino posible.
 *
 * @param {number|null} mesesCubiertos
 * @param {number} metaMeses
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {Array<{ mesISO: string, pct: number }>} vacío si la meta no es válida.
 */
export function bloquesCobertura(mesesCubiertos, metaMeses, hoyISO) {
  const meta = Math.round(Number(metaMeses));
  if (!Number.isFinite(meta) || meta <= 0) return [];
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return [];

  const [anio, mes] = hoyISO.split('-').map(Number);
  let restante = Math.max(0, Number(mesesCubiertos) || 0);

  return Array.from({ length: meta }, (_, i) => {
    const indice = (mes - 1) + i;
    const y = anio + Math.floor(indice / 12);
    const m = String((indice % 12) + 1).padStart(2, '0');
    const pct = Math.max(0, Math.min(1, restante)) * 100;
    restante -= 1;
    return { mesISO: `${y}-${m}-01`, pct: Math.round(pct) };
  });
}

/**
 * Meses que la franja dibuja como mínimo: los del último nivel de la escalera.
 *
 * DIS.19 (item 6): la lista de tres niveles que vivía aparte se retira y los
 * niveles pasan a rotular el eje de la franja. Eso obliga a que la franja llegue
 * hasta el último nivel: un eje que marca "6 meses" sobre una franja de tres
 * pondría el rótulo fuera del dibujo.
 */
export const MESES_FRANJA_MIN = NIVELES_FONDO[NIVELES_FONDO.length - 1].meses;

/**
 * Pasados estos bloques se dejan de rotular los meses.
 *
 * Con la meta en el máximo (12 meses) cada bloque baja a unos 26px en un
 * teléfono de 375px, y "sept" en 9px ya no cabe sin recortarse. El eje de
 * niveles sí se conserva: es el que hace legible la franja, y el mes exacto ya
 * lo dice el pie con la fecha de cobertura.
 */
export const MAX_ROTULOS_MES = 8;

/**
 * Todo lo que la franja de cobertura necesita dibujar (DIS.19, item 6).
 *
 * La franja hace dos trabajos que antes estaban en dos componentes: los bloques
 * son la **prueba** (cuánto tiempo aguantas de verdad) y el eje es el **camino**
 * (los tres niveles y dónde caen). Juntarlos ahorra la lista de niveles y hace
 * que el avance hacia el siguiente se lea como distancia, no como porcentaje.
 *
 * Un bloque sin nada cubierto se marca `futuro`: se dibuja con contorno y sin
 * relleno, así que la franja completa siempre está a la vista. Una franja que
 * solo dibujara lo cubierto no diría hacia dónde va.
 *
 * @param {number|null} mesesCubiertos Salida de `mesesDeColchon()`.
 * @param {number} metaMeses           Meses que el usuario apunta a cubrir.
 * @param {string} hoyISO              YYYY-MM-DD.
 * El eje conserva lo único que la lista de niveles decía y el dibujo no: **cuál
 * ya está logrado**. Va como estado del rótulo, no como texto aparte, así que se
 * lee sin sumar una línea.
 *
 * @param {number|null} mesesCubiertos Salida de `mesesDeColchon()`.
 * @param {number} metaMeses           Meses que el usuario apunta a cubrir.
 * @param {string} hoyISO              YYYY-MM-DD.
 * @returns {{
 *   bloques: Array<{mesISO: string, pct: number, futuro: boolean}>,
 *   eje: Array<{rotulo: string, estado: string}>,
 *   conRotulos: boolean,
 * }} `bloques` vacío si no hay franja que dibujar.
 */
export function franjaCobertura(mesesCubiertos, metaMeses, hoyISO) {
  const meta   = Math.round(Number(metaMeses));
  const cuantos = Number.isFinite(meta) && meta > 0
    ? Math.max(meta, MESES_FRANJA_MIN)
    : MESES_FRANJA_MIN;

  const crudos = bloquesCobertura(mesesCubiertos, cuantos, hoyISO);
  if (crudos.length === 0) return { bloques: [], eje: [], conRotulos: false };

  const niveles = nivelesFondo(mesesCubiertos);

  return {
    bloques: crudos.map(b => ({ ...b, futuro: b.pct <= 0 })),
    // El rótulo del nivel va al final del bloque que lo completa: "3 meses" cae
    // en el borde derecho del tercero, que es donde el nivel se alcanza.
    eje: crudos.map((_, i) => {
      const nivel = niveles.find(n => n.meses === i + 1) ?? null;
      return {
        rotulo: nivel ? nivel.titulo.toLowerCase() : '',
        estado: nivel ? nivel.estado : '',
      };
    }),
    conRotulos: crudos.length <= MAX_ROTULOS_MES,
  };
}

// ── COMPROMISO DEL MES ───────────────────────────────────────────

/**
 * Cuánto se aportó al fondo dentro del mes de `hoyISO`.
 *
 * El compromiso mensual es una promesa que se renueva: el 1 vuelve a cero. Por
 * eso el corte es el mes calendario y no los últimos 30 días, que dejarían el
 * medidor a media agua el día que arranca el mes nuevo.
 *
 * @param {Array<{monto:number, fecha:string}>} aportes
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {number} COP. 0 si no hay aportes del mes o el input no sirve.
 */
export function aportadoEnMes(aportes, hoyISO) {
  if (!Array.isArray(aportes)) return 0;
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return 0;

  const prefijo = hoyISO.slice(0, 7);
  return aportes.reduce((sum, a) => {
    if (typeof a?.fecha !== 'string' || a.fecha.slice(0, 7) !== prefijo) return sum;
    const monto = Number(a.monto);
    return sum + (Number.isFinite(monto) && monto > 0 ? monto : 0);
  }, 0);
}

/**
 * El estado del compromiso de este mes, para el medidor (DIS.19, item 7).
 *
 * La fila de texto que decía "Compromiso mensual: $420.000" informaba sin medir:
 * no había forma de saber si el mes iba cumplido sin abrir la lista de aportes y
 * sumar a mano. El medidor mide, y para eso hacen falta las tres cifras juntas:
 * lo prometido, lo hecho y lo que queda de mes.
 *
 * @param {number} compromisoMensual
 * @param {number} aportadoMes
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {{
 *   pct: number, aportado: number, objetivo: number, faltante: number,
 *   diasRestantes: number, completo: boolean,
 * } | null} null sin compromiso definido: no hay promesa que medir.
 */
export function progresoCompromiso(compromisoMensual, aportadoMes, hoyISO) {
  const objetivo = Number(compromisoMensual);
  if (!Number.isFinite(objetivo) || objetivo <= 0) return null;

  const aportado = Math.max(0, Number(aportadoMes) || 0);
  const pct      = Math.min(100, Math.round((aportado / objetivo) * 100));

  return {
    pct,
    aportado,
    objetivo,
    faltante:      Math.max(0, objetivo - aportado),
    diasRestantes: _diasRestantesDelMes(hoyISO),
    completo:      aportado >= objetivo,
  };
}

/**
 * Días que quedan del mes contando hoy: el último día del mes todavía cuenta
 * como un día para cumplir.
 * @param {string} hoyISO YYYY-MM-DD.
 * @returns {number} 0 si la fecha no sirve.
 */
function _diasRestantesDelMes(hoyISO) {
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return 0;
  const [anio, mes, dia] = hoyISO.split('-').map(Number);
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return Math.max(0, ultimo - dia + 1);
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida la meta de meses ingresada en el form de activación/edición.
 * @param {string|number} raw
 * @returns {string[]} mensajes de error (vacío = válido).
 */
export function validarMetaMeses(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return ['La meta debe ser un número de meses.'];
  }
  if (!Number.isInteger(n)) {
    return ['La meta debe ser un número entero de meses.'];
  }
  if (n < META_MESES_MIN || n > META_MESES_MAX) {
    return [`La meta debe estar entre ${META_MESES_MIN} y ${META_MESES_MAX} meses.`];
  }
  return [];
}

/**
 * Valida el monto actual del fondo (puede ser 0 al activar).
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarMontoActual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return ['El monto debe ser un número.'];
  }
  if (n < 0) {
    return ['El monto no puede ser negativo.'];
  }
  return [];
}

// ── NORMALIZACIÓN ────────────────────────────────────────────────

/**
 * Lleva la meta a un entero dentro del rango permitido. Si el valor no es
 * válido cae al default. Usado al guardar el form (asume que pasó validación,
 * pero defiende contra clamp por si acaso).
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMetaMeses(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return META_MESES_DEFAULT;
  const entero = Math.round(n);
  if (entero < META_MESES_MIN) return META_MESES_MIN;
  if (entero > META_MESES_MAX) return META_MESES_MAX;
  return entero;
}

/**
 * Lleva el monto a un número no-negativo. Asume que pasó validación.
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMontoActual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

// ── APORTES (J.1b) ───────────────────────────────────────────────

/**
 * Suma los montos de todos los aportes registrados en el historial.
 *
 * @param {Array<{monto: number}>} aportes
 * @returns {number} Total en COP. 0 si el array está vacío o no es válido.
 */
export function calcularTotalAportes(aportes) {
  if (!Array.isArray(aportes)) return 0;
  return aportes.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
}

/**
 * Monto total visible del fondo: el balance de apertura declarado al activarlo
 * más la suma de todos los aportes registrados en el historial.
 *
 * @param {number} montoBase  `fondoEmergencia.montoActual` (valor al activar/editar).
 * @param {Array}  aportes    `S.ahorro.aportes`.
 * @returns {number}
 */
export function calcularMontoTotalFondo(montoBase, aportes) {
  return Math.max(0, Number(montoBase) || 0) + calcularTotalAportes(aportes);
}

/**
 * Devuelve los aportes ordenados por fecha descendente (más reciente primero).
 * No muta el array original.
 *
 * @param {Array<{fecha: string}>} aportes
 * @returns {Array}
 */
export function ordenarAportesPorFecha(aportes) {
  if (!Array.isArray(aportes)) return [];
  return [...aportes].sort((a, b) => {
    if (b.fecha > a.fecha) return 1;
    if (b.fecha < a.fecha) return -1;
    return 0;
  });
}

/**
 * Valida el monto de un aporte. Debe ser mayor que cero (a diferencia de
 * `validarMontoActual`, que acepta 0 como saldo inicial).
 *
 * @param {string|number} raw
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarMontoAporte(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n <= 0)              return ['El monto del aporte debe ser mayor que cero.'];
  return [];
}

/**
 * Valida una fecha de aporte (formato YYYY-MM-DD, no vacía).
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function validarFechaAporte(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return ['La fecha es requerida.'];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ['El formato de fecha no es válido (se esperaba YYYY-MM-DD).'];
  }
  return [];
}

/**
 * Normaliza el monto de un aporte a entero positivo.
 * Si el valor no es válido o no es positivo devuelve 0.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarMontoAporte(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

// ── APORTE SUGERIDO AL FONDO (AH.2) ──────────────────────────────

// Constantes replicadas del motor de distribución de Mis cuentas (ADR 013,
// MC.6a/MC.10) para que la sugerencia del fondo y la de "Distribuir mi
// ingreso" nunca se contradigan. Se replican en vez de importarse porque
// ningún dominio importa a otro (regla ADN #10).
const _PISO_EV_PCT     = 10;  // % mínimo de estilo de vida (sostenibilidad)
const _PISO_AHORRO_PCT = 5;   // % mínimo de ahorro cuando el margen es corto

/** Meses del horizonte para cerrar el fondo incompleto (ADR 013). */
export const HORIZONTE_FONDO_MESES = 12;

/**
 * Aporte mensual sugerido al fondo de emergencia, con explicación (AH.2).
 *
 * Construye la sugerencia con los datos reales del usuario en vez de un
 * número sin contexto. Sigue el mismo modelo de pisos del motor de
 * distribución (ADR 013): cerrar el fondo en 12 meses si el margen alcanza;
 * si no, sugerir lo que el margen permite tras reservar un mínimo de estilo
 * de vida (10%) y el aporte a otras metas con fecha; con margen muy corto,
 * la parte proporcional del piso de ahorro (5 de 15); sin margen, cero y
 * la verdad (mismo espíritu que MC.11: no inventar recomendaciones).
 *
 * @param {{
 *   faltanteFondo?:          number,  // COP que faltan para el objetivo
 *   ingresosMensuales?:      number,  // COP/mes. 0 o ausente = sin datos.
 *   gastosFijosMensuales?:   number,  // COP/mes de fijos activos.
 *   cuotasDeudaMensuales?:   number,  // COP/mes de cuotas de deuda activas.
 *   aporteMensualObjetivos?: number,  // COP/mes que piden metas/apartados con fecha.
 * }} [ctx]
 * @returns {{
 *   monto: number,
 *   base: 'completo'|'meta'|'capacidad'|'piso'|'deficit'|'sin-ingreso',
 *   meses: number|null,   // meses estimados para completar el fondo a ese ritmo
 *   razones: string[],    // explicación en lenguaje humano (1-3 frases)
 * }}
 */
export function calcularAporteSugerido({
  faltanteFondo          = 0,
  ingresosMensuales      = 0,
  gastosFijosMensuales   = 0,
  cuotasDeudaMensuales   = 0,
  aporteMensualObjetivos = 0,
} = {}) {
  const faltante = Math.max(0, Number(faltanteFondo) || 0);
  if (faltante <= 0) {
    return {
      monto: 0, base: 'completo', meses: 0,
      razones: ['Tu fondo ya está completo. Cualquier aporte extra suma colchón.'],
    };
  }

  const ritmoMeta = _redondearMiles(faltante / HORIZONTE_FONDO_MESES);

  const ingreso = Math.max(0, Number(ingresosMensuales) || 0);
  if (ingreso <= 0) {
    return {
      monto: ritmoMeta, base: 'sin-ingreso', meses: HORIZONTE_FONDO_MESES,
      razones: [
        `Te faltan ${f(faltante)}: con ${f(ritmoMeta)} al mes completas tu fondo en unos ${HORIZONTE_FONDO_MESES} meses.`,
        'La sugerencia aún no considera tu capacidad real. Cuéntale a Finko cuánto recibes al mes para afinarla.',
      ],
    };
  }

  const fijos     = Math.max(0, Number(gastosFijosMensuales)   || 0);
  const cuotas    = Math.max(0, Number(cuotasDeudaMensuales)   || 0);
  const objetivos = Math.max(0, Number(aporteMensualObjetivos) || 0);
  const margen    = ingreso - fijos - cuotas;

  if (margen <= 0) {
    return {
      monto: 0, base: 'deficit', meses: null,
      razones: [
        `Tus gastos fijos (${f(fijos)}) y cuotas de deuda (${f(cuotas)}) igualan o superan tu ingreso mensual (${f(ingreso)}).`,
        'Antes de comprometer un aporte, revisa tus gastos en Análisis o ajusta tus fijos en Calendario. El fondo puede esperar; las obligaciones no.',
      ],
    };
  }

  const pisoEV     = ingreso * _PISO_EV_PCT / 100;
  const pisoAhorro = ingreso * _PISO_AHORRO_PCT / 100;
  // Capacidad real para el fondo: margen menos un mínimo de estilo de vida
  // y menos lo que ya piden tus otras metas con fecha.
  const capacidad = margen - pisoEV - objetivos;

  const notaObjetivos = objetivos > 0
    ? ` y el aporte a tus otras metas con fecha (${f(objetivos)})`
    : '';

  if (capacidad >= ritmoMeta) {
    return {
      monto: ritmoMeta, base: 'meta',
      meses: Math.ceil(faltante / ritmoMeta),
      razones: [
        `Te faltan ${f(faltante)}: con ${f(ritmoMeta)} al mes completas tu fondo en unos ${HORIZONTE_FONDO_MESES} meses.`,
        `Te alcanza: tu ingreso (${f(ingreso)}) menos gastos fijos (${f(fijos)})` +
          `${cuotas > 0 ? `, cuotas de deuda (${f(cuotas)})` : ''}${notaObjetivos}` +
          ` deja margen suficiente sin apretar tu estilo de vida.`,
      ],
    };
  }

  if (capacidad >= pisoAhorro) {
    const monto = _redondearMiles(capacidad);
    const meses = Math.ceil(faltante / monto);
    return {
      monto, base: 'capacidad', meses,
      razones: [
        `Para cerrar el fondo en ${HORIZONTE_FONDO_MESES} meses necesitarías ${f(ritmoMeta)}, pero tu margen real da para ${f(monto)} al mes.`,
        `Es tu ingreso (${f(ingreso)}) menos gastos fijos (${f(fijos)})` +
          `${cuotas > 0 ? `, cuotas de deuda (${f(cuotas)})` : ''}${notaObjetivos}` +
          ` y un mínimo para tu estilo de vida.`,
        _fraseRitmo(meses),
      ],
    };
  }

  // Margen corto: parte proporcional del piso de ahorro (5 de 15), igual que
  // el reparto proporcional de pisos de MC.10.
  const montoPiso = _redondearMiles(margen * _PISO_AHORRO_PCT / (_PISO_EV_PCT + _PISO_AHORRO_PCT));
  const meses     = Math.ceil(faltante / montoPiso);
  return {
    monto: montoPiso, base: 'piso', meses,
    razones: [
      `Tu margen está apretado: tras gastos fijos y cuotas te quedan ${f(margen)} al mes.`,
      `Empieza con ${f(montoPiso)} para no frenar el hábito. Cuando tu margen mejore, la sugerencia sube sola.`,
    ],
  };
}

/**
 * Redondea hacia arriba a miles de COP, con mínimo de $1.000.
 * @param {number} x
 * @returns {number}
 */
function _redondearMiles(x) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0) return 1000;
  return Math.max(1000, Math.ceil(n / 1000) * 1000);
}

/**
 * Frase del ritmo estimado. Con más de 36 meses no promete plazos: invita a
 * revisar gastos en su lugar.
 * @param {number} meses
 * @returns {string}
 */
function _fraseRitmo(meses) {
  if (meses > 36) {
    return 'A ese ritmo el fondo tardaría más de 3 años. Si puedes recortar algo de estilo de vida, el plazo baja rápido.';
  }
  return `A ese ritmo completas el fondo en unos ${meses} meses.`;
}

// ── COMPROMISO MENSUAL ("págate primero", J.1b) ──────────────────

/**
 * Valida el monto del compromiso mensual de ahorro.
 * Acepta 0 (= sin compromiso). No acepta negativos.
 *
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarCompromisoMensual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n < 0)               return ['El monto no puede ser negativo.'];
  return [];
}

/**
 * Normaliza el compromiso mensual a entero no-negativo.
 *
 * @param {string|number} raw
 * @returns {number}
 */
export function normalizarCompromisoMensual(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
