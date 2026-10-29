/**
 * router.js - hash routing
 * Maps URL hash → section visibility.
 * Contract: sections have id="sec-{hash}" and use .active class.
 */

// `ahorro` es la casa de las cuatro modalidades (DIS.18) y `fondo` el fondo de
// emergencia, que hasta entonces ocupaba `ahorro`. Un bookmark viejo a #ahorro
// llega a la casa, que enlaza al fondo en su primera fila: no se pierde, sube
// un nivel. Por eso no hay REDIRECTS para este cambio.
const SECTIONS = new Map([
  ['dash',        'sec-dash'],
  ['aprende',     'sec-aprende'],
  ['progreso',    'sec-progreso'],
  ['movimientos', 'sec-movimientos'],
  ['gast',        'sec-gast'],
  ['compromisos', 'sec-compromisos'],
  ['agenda',      'sec-agenda'],
  ['personales',  'sec-personales'],
  ['tesoreria',   'sec-tesoreria'],
  ['ahorro',      'sec-ahorro'],
  ['fondo',       'sec-fondo'],
  ['metas',       'sec-metas'],
  ['apartados',   'sec-apartados'],
  ['inversion',   'sec-inversion'],
  ['presupuesto', 'sec-presupuesto'],
  ['analisis',    'sec-analisis'],
  ['config',      'sec-config'],
]);

// Hashes retirados: redirigen al destino indicado (bookmarks viejos, etc.).
const REDIRECTS = new Map([
  ['calc', 'dash'],
]);

const DEFAULT_HASH = 'dash';

function currentHash() {
  return location.hash.slice(1) || DEFAULT_HASH;
}

/** Muestra la sección del hash y oculta las demás. Devuelve su id. */
function showSection(hash) {
  const resolved = REDIRECTS.get(hash) ?? hash;
  if (resolved !== hash) {
    history.replaceState(null, '', `#${resolved}`);
    hash = resolved;
  }
  const targetId = SECTIONS.get(hash) ?? SECTIONS.get(DEFAULT_HASH);

  for (const [, sectionId] of SECTIONS) {
    const el = document.getElementById(sectionId);
    if (el) el.classList.toggle('active', sectionId === targetId);
  }
  return targetId;
}

/**
 * Mueve el foco a la sección recién mostrada. Tiene tabindex="-1" +
 * aria-labelledby: al recibir foco, el lector de pantalla anuncia el título
 * de la sección como landmark.
 *
 * Con un modal abierto no: una acción que navega y abre un modal en el mismo
 * tick (ir-a-crear-cuenta) le sacaría el foco al modal, porque el `inert` del
 * fondo llega un cuadro después de abrirlo (PERF.11, modales.js).
 */
function enfocarSeccion(targetId) {
  if (document.querySelector('.modal-overlay[data-open]')) return;
  document.getElementById(targetId)?.focus({ preventScroll: true });
}

export function initRouter(onNavigate) {
  let inicial = true;
  const handler = () => {
    const hash = currentHash();
    const targetId = showSection(hash);
    onNavigate?.(hash);
    // El foco va al final, después de onNavigate (PERF.12): `focus()` obliga
    // a estilizar y maquetar en el acto la sección recién mostrada (~120 ms
    // con Gastos en un teléfono de gama media), y si onNavigate toca clases
    // después, el cuadro vuelve a estilizar ~900 elementos. Al final, una sola
    // pasada. En la carga inicial no se mueve, para no robar el foco antes
    // del skip link.
    if (!inicial) enfocarSeccion(targetId);
    inicial = false;
  };

  window.addEventListener('hashchange', handler);
  handler();
}

export function navigate(hash) {
  location.hash = hash;
}

export { SECTIONS, REDIRECTS, DEFAULT_HASH };
