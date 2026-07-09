/**
 * config/legal.js - catálogo del Centro Legal + carga de sus documentos.
 *
 * Los textos viven en `docs/legal/*.md` (fuente de verdad, LEG.1): este
 * módulo solo lista los documentos y los trae con `fetch` (mismo origen,
 * cacheados por el service worker para lectura offline). Sin lógica de
 * negocio ni DOM: `index.js` maneja el fetch real y el render del modal.
 */

/**
 * @typedef {{ id: string, titulo: string, archivo: string }} DocumentoLegal
 */

/** @type {DocumentoLegal[]} */
export const DOCUMENTOS_LEGALES = [
  { id: 'terminos-y-condiciones',        titulo: 'Términos y condiciones',              archivo: 'terminos-y-condiciones.md' },
  { id: 'politica-de-privacidad',        titulo: 'Política de privacidad',              archivo: 'politica-de-privacidad.md' },
  { id: 'tratamiento-de-datos-personales', titulo: 'Tratamiento de datos personales',    archivo: 'tratamiento-de-datos-personales.md' },
  { id: 'aviso-de-cookies',              titulo: 'Aviso de cookies y almacenamiento',    archivo: 'aviso-de-cookies.md' },
  { id: 'descargo-de-responsabilidad',   titulo: 'Descargo de responsabilidad',          archivo: 'descargo-de-responsabilidad.md' },
  { id: 'propiedad-intelectual',         titulo: 'Propiedad intelectual',                archivo: 'propiedad-intelectual.md' },
  { id: 'marcas-de-terceros',            titulo: 'Aviso de marcas de terceros',          archivo: 'marcas-de-terceros.md' },
  { id: 'licencias-de-terceros',         titulo: 'Licencias de terceros',                archivo: 'licencias-de-terceros.md' },
  { id: 'aviso-legal',                   titulo: 'Aviso legal e identificación',         archivo: 'aviso-legal.md' },
  { id: 'historial-de-cambios',          titulo: 'Historial de cambios de las políticas', archivo: 'historial-de-cambios.md' },
];

/**
 * Busca un documento del catálogo por id. `null` si no existe (id desconocido
 * o corrupto, por ejemplo un `data-doc-link` con typo en el markdown fuente).
 * @param {string} id
 * @returns {DocumentoLegal | null}
 */
export function documentoLegalPorId(id) {
  return DOCUMENTOS_LEGALES.find(d => d.id === id) ?? null;
}

/**
 * Trae el contenido crudo (Markdown) de un documento legal desde `docs/legal/`.
 * Mismo origen: el service worker lo sirve desde cache si el dispositivo
 * está offline y el archivo ya fue precacheado.
 * @param {DocumentoLegal} doc
 * @returns {Promise<string>}
 */
export async function cargarDocumentoLegal(doc) {
  const res = await fetch(`./docs/legal/${doc.archivo}`);
  if (!res.ok) throw new Error(`No se pudo cargar ${doc.archivo}: HTTP ${res.status}`);
  return res.text();
}
