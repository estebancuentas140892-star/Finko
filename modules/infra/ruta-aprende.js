/**
 * infra/ruta-aprende.js - el catálogo de la ruta de Aprende y lo que se
 * deriva de él sin depender de un dominio (APR.1d, ADR 092 D3 y D8).
 *
 * Funciones puras, sin DOM. Lo leen `aprende` (la ruta y la lección) y
 * `logros` (cuántas unidades ya sabes, que cuentan para el nivel): como
 * ningún dominio importa a otro (ADN 10), el catálogo vive acá.
 */

/**
 * @typedef {Object} LeccionMeta
 * @property {string}  id
 * @property {string}  titulo
 * @property {number}  minutos
 * @property {string}  [termina]   - dónde se aplica, en palabras de la ruta.
 * @property {boolean} [contenido] - false mientras su texto no esté escrito.
 */

/**
 * @typedef {Object} Unidad
 * @property {string} id
 * @property {number} numero
 * @property {string} nombre
 * @property {string} dominio  - sufijo de `--fk-dom-*`: la unidad viste el
 *                               color de la sección donde se aplica (ADR 031).
 * @property {string} seccion  - hash de la sección donde termina.
 * @property {string} termina  - nombre visible de esa sección.
 * @property {LeccionMeta[]} lecciones - vacía si la unidad está en preparación.
 * @property {string} [aprendiste] - lo que la celebración de la unidad dice
 *                                   que ya sabes (D7, insignia).
 */

/** @type {Unidad[]} */
export const UNIDADES = [
  {
    id: 'u1', numero: 1, nombre: 'Tu dinero hoy', dominio: 'tesoreria', seccion: 'tesoreria', termina: 'Mis cuentas',
    aprendiste: 'Ahora sabes cuánto tienes de verdad y dónde está.',
    lecciones: [
      { id: 'u1-l1', titulo: 'Cuánto tienes de verdad', minutos: 3, termina: 'Mis cuentas, con tus saldos' },
      { id: 'u1-l2', titulo: 'Dónde está tu dinero', minutos: 3, termina: 'Mis cuentas' },
      { id: 'u1-l3', titulo: 'Lo que entra y lo que sale', minutos: 4, termina: 'Mis cuentas' },
    ],
  },
  {
    id: 'u2', numero: 2, nombre: 'Repartir tu ingreso', dominio: 'tesoreria', seccion: 'tesoreria', termina: 'Repartir ingreso',
    aprendiste: 'Ahora sabes repartir tu ingreso antes de gastarlo.',
    lecciones: [
      { id: 'u2-l1', titulo: 'La regla 50/30/20', minutos: 3, termina: 'Repartir ingreso, con tu ingreso' },
      { id: 'u2-l2', titulo: 'Necesidad o gusto', minutos: 3, termina: 'Repartir ingreso' },
      { id: 'u2-l3', titulo: 'Págate primero', minutos: 3, termina: 'Repartir ingreso' },
    ],
  },
  {
    id: 'u3', numero: 3, nombre: 'Gastos hormiga y límites', dominio: 'presupuesto', seccion: 'presupuesto', termina: 'Límites',
    aprendiste: 'Ahora sabes ver lo pequeño y ponerle un límite que sí puedas cumplir.',
    lecciones: [
      { id: 'u3-l1', titulo: 'Lo pequeño también suma', minutos: 3, termina: 'Gastos' },
      { id: 'u3-l2', titulo: 'Encuentra tus gastos hormiga', minutos: 3, termina: 'Límites, con tus compras' },
      { id: 'u3-l3', titulo: 'Un límite que sí puedas cumplir', minutos: 4, termina: 'Límites' },
      { id: 'u3-l4', titulo: 'Repaso: tu mes en hormigas', minutos: 2, termina: 'Límites' },
    ],
  },
  {
    id: 'u4', numero: 4, nombre: 'Fondo de emergencia', dominio: 'ahorro', seccion: 'fondo', termina: 'Fondo',
    aprendiste: 'Ahora sabes cuánto necesita tu fondo, cómo llenarlo y cuándo usarlo.',
    lecciones: [
      { id: 'u4-l1', titulo: 'Para qué sirve un fondo', minutos: 3, termina: 'Fondo' },
      { id: 'u4-l2', titulo: '¿Cuánto es suficiente para ti?', minutos: 3, termina: 'Fondo, con tus gastos fijos' },
      { id: 'u4-l3', titulo: 'Cómo llenarlo sin ahogarte', minutos: 4, termina: 'Fondo' },
      { id: 'u4-l4', titulo: 'Cuándo usarlo y cómo reponerlo', minutos: 3, termina: 'Fondo' },
    ],
  },
  {
    id: 'u5', numero: 5, nombre: 'Metas y reservas', dominio: 'metas', seccion: 'metas', termina: 'Metas',
    aprendiste: 'Ahora sabes plantear una meta y reservar para lo que sabes que viene.',
    lecciones: [
      { id: 'u5-l1', titulo: 'Una meta con nombre, precio y fecha', minutos: 3, termina: 'Metas, con tus metas' },
      { id: 'u5-l2', titulo: 'Cuánto guardar cada mes', minutos: 3, termina: 'Metas' },
      { id: 'u5-l3', titulo: 'Reservas para lo que sabes que viene', minutos: 3, termina: 'Metas' },
    ],
  },
  {
    id: 'u6', numero: 6, nombre: 'Deudas y gota a gota', dominio: 'compromisos', seccion: 'compromisos', termina: 'Por pagar',
    aprendiste: 'Ahora sabes cuánto cuesta una deuda, en qué orden pagarla y por qué evitar el gota a gota.',
    lecciones: [
      { id: 'u6-l1', titulo: 'Lo que de verdad cuesta una deuda', minutos: 3, termina: 'Por pagar, con tus deudas' },
      { id: 'u6-l2', titulo: 'Avalancha o bola de nieve', minutos: 4, termina: 'Por pagar' },
      { id: 'u6-l3', titulo: 'Gota a gota: por qué es tan peligroso', minutos: 3, termina: 'Por pagar' },
    ],
  },
  {
    id: 'u7', numero: 7, nombre: 'Crédito e intereses', dominio: 'compromisos', seccion: 'compromisos', termina: 'Por pagar',
    aprendiste: 'Ahora sabes leer una tasa, usar la tarjeta sin intereses y comparar créditos.',
    lecciones: [
      { id: 'u7-l1', titulo: 'Tasa al mes y tasa al año', minutos: 3, termina: 'Por pagar, con tus deudas' },
      { id: 'u7-l2', titulo: 'La tarjeta de crédito', minutos: 4, termina: 'Por pagar' },
      { id: 'u7-l3', titulo: 'Menos cuotas, menos intereses', minutos: 3, termina: 'Por pagar' },
      { id: 'u7-l4', titulo: 'Repaso: el crédito a tu favor', minutos: 2, termina: 'Por pagar' },
    ],
  },
  {
    id: 'u8', numero: 8, nombre: 'Invertir: CDT y regla del 72', dominio: 'inversion', seccion: 'inversion', termina: 'Inversión',
    aprendiste: 'Ahora sabes cuándo invertir, qué es un CDT y cuánto tarda tu dinero en duplicarse.',
    lecciones: [
      { id: 'u8-l1', titulo: 'Ahorrar e invertir no son lo mismo', minutos: 3, termina: 'Inversión, con tus inversiones' },
      { id: 'u8-l2', titulo: 'El CDT', minutos: 3, termina: 'Inversión' },
      { id: 'u8-l3', titulo: 'Interés compuesto', minutos: 3, termina: 'Inversión' },
      { id: 'u8-l4', titulo: 'La regla del 72', minutos: 2, termina: 'Inversión' },
    ],
  },
  {
    id: 'u9', numero: 9, nombre: 'Impuestos: 4x1000 y renta', dominio: 'analisis', seccion: 'analisis', termina: 'Análisis',
    aprendiste: 'Ahora sabes qué es el 4x1000, cómo no pagarlo de más y cuándo te toca declarar renta.',
    lecciones: [
      { id: 'u9-l1', titulo: 'El 4x1000', minutos: 3, termina: 'Análisis, con tus ingresos' },
      { id: 'u9-l2', titulo: 'La cuenta exenta', minutos: 3, termina: 'Análisis' },
      { id: 'u9-l3', titulo: '¿Tienes que declarar renta?', minutos: 3, termina: 'Análisis' },
    ],
  },
];

/**
 * ¿La unidad está terminada? Todas sus lecciones hechas. Una unidad en
 * preparación (sin lecciones) nunca está terminada.
 *
 * @param {Unidad} unidad
 * @param {Record<string, string>} hechas
 */
export function unidadTerminada(unidad, hechas) {
  return unidad.lecciones.length > 0 && unidad.lecciones.every(l => Boolean(hechas[l.id]));
}

/**
 * Cuántas unidades ya sabes (D3): terminadas, o marcadas "Ya lo sabes" por
 * la prueba de ubicación. Cada una suma un paso hacia el nivel, una sola
 * vez: `hechas` guarda la primera fecha y repasar no la cambia.
 *
 * @param {{ hechas?: Record<string, string>, sabidas?: string[] } | undefined} aprende - `S.aprende`.
 * @returns {number}
 */
export function contarUnidadesSabidas(aprende) {
  const hechas = aprende?.hechas && typeof aprende.hechas === 'object' ? aprende.hechas : {};
  const sabidas = Array.isArray(aprende?.sabidas) ? aprende.sabidas : [];
  return UNIDADES.filter(u => sabidas.includes(u.id) || unidadTerminada(u, hechas)).length;
}

/**
 * Semana ISO 8601 de una fecha `YYYY-MM-DD`, como `YYYY-Www`. El año es el
 * de la semana ISO, que en los bordes de enero y diciembre puede no
 * coincidir con el del calendario.
 *
 * @param {string} fechaISO
 * @returns {string | null}
 */
export function semanaISO(fechaISO) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaISO ?? '');
  if (!m) return null;
  const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const dia = fecha.getUTCDay() || 7;           // lunes 1 ... domingo 7
  fecha.setUTCDate(fecha.getUTCDate() + 4 - dia); // jueves de esa semana
  const anio = fecha.getUTCFullYear();
  const inicio = Date.UTC(anio, 0, 1);
  const semana = Math.ceil(((fecha.getTime() - inicio) / 86_400_000 + 1) / 7);
  return `${anio}-W${String(semana).padStart(2, '0')}`;
}

/**
 * Semanas activas (D3): las que quedaron guardadas al hacer una lección o
 * registrar algo, unidas a las semanas en que tienes gastos. La unión deja
 * entrar el historial de antes de Aprende; lo guardado hace que borrar un
 * gasto no reste la semana en que lo registraste. Solo informa: nunca vuelve
 * a cero.
 *
 * @param {{ semanas?: string[] } | undefined} aprende - `S.aprende`.
 * @param {{ fecha?: string }[]} [gastos] - `S.gastos`.
 * @returns {number}
 */
export function contarSemanasActivas(aprende, gastos = []) {
  const semanas = new Set(Array.isArray(aprende?.semanas) ? aprende.semanas : []);
  for (const g of gastos ?? []) {
    const s = semanaISO(g?.fecha);
    if (s) semanas.add(s);
  }
  return semanas.size;
}

/**
 * Dónde vas en la ruta: la unidad recomendada (la primera, en orden, que no
 * está terminada ni sabida y tiene lecciones escritas) y el número de su
 * siguiente lección. `null` si no queda ninguna lección escrita por hacer.
 * Es la misma regla de "vas aquí" que pinta la ruta (D8).
 *
 * @param {{ hechas?: Record<string, string>, sabidas?: string[] } | undefined} aprende
 * @returns {{ unidad: Unidad, leccion: number, total: number } | null}
 */
export function posicionEnRuta(aprende) {
  const hechas = aprende?.hechas && typeof aprende.hechas === 'object' ? aprende.hechas : {};
  const sabidas = Array.isArray(aprende?.sabidas) ? aprende.sabidas : [];
  for (const unidad of UNIDADES) {
    if (sabidas.includes(unidad.id) || unidadTerminada(unidad, hechas)) continue;
    const i = unidad.lecciones.findIndex(l => l.contenido !== false && !hechas[l.id]);
    if (i >= 0) return { unidad, leccion: i + 1, total: unidad.lecciones.length };
  }
  return null;
}

