/**
 * router.js - hash routing
 * Maps URL hash → section visibility.
 * Contract: sections have id="sec-{hash}" and use .active class.
 */

const SECTIONS = new Map([
  ['dash',        'sec-dash'],
  ['gast',        'sec-gast'],
  ['compromisos', 'sec-compromisos'],
  ['agenda',      'sec-agenda'],
  ['personales',  'sec-personales'],
  ['tesoreria',   'sec-tesoreria'],
  ['ahorro',      'sec-ahorro'],
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

function showSection(hash, moveFocus = false) {
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

  // Mover el foco al contenido recién mostrado solo en navegaciones reales.
  // La sección tiene tabindex="-1" + aria-labelledby: al recibir foco, el
  // lector de pantalla anuncia el título de la sección como landmark.
  // En la carga inicial no se mueve, para no robar el foco antes del skip link.
  if (moveFocus) {
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }
}

export function initRouter(onNavigate) {
  let inicial = true;
  const handler = () => {
    const hash = currentHash();
    showSection(hash, !inicial);
    onNavigate?.(hash);
    inicial = false;
  };

  window.addEventListener('hashchange', handler);
  handler();
}

export function navigate(hash) {
  location.hash = hash;
}

export { SECTIONS, REDIRECTS, DEFAULT_HASH };
