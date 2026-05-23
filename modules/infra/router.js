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
  ['metas',       'sec-metas'],
  ['presupuesto', 'sec-presupuesto'],
  ['analisis',    'sec-analisis'],
  ['calc',        'sec-calc'],
  ['config',      'sec-config'],
]);

const DEFAULT_HASH = 'dash';

function currentHash() {
  return location.hash.slice(1) || DEFAULT_HASH;
}

function showSection(hash) {
  const targetId = SECTIONS.get(hash) ?? SECTIONS.get(DEFAULT_HASH);

  for (const [, sectionId] of SECTIONS) {
    const el = document.getElementById(sectionId);
    if (el) el.classList.toggle('active', sectionId === targetId);
  }

  document.getElementById(targetId)?.focus({ preventScroll: true });
}

export function initRouter(onNavigate) {
  const handler = () => {
    const hash = currentHash();
    showSection(hash);
    onNavigate?.(hash);
  };

  window.addEventListener('hashchange', handler);
  handler();
}

export function navigate(hash) {
  location.hash = hash;
}

export { SECTIONS, DEFAULT_HASH };
