/**
 * bloque-inicio.js - la franja de lentes del bloque Inicio en móvil
 * (APR.1c, ADR 092 D1).
 *
 * Inicio pasa de sección a bloque, igual que Gastos (ADR 069): la barra
 * inferior no cambia, y el botón "Inicio" abre una portada dominante (Hoy) con
 * dos lentes más, Aprende y Tu progreso, que se enseñan con pestañas que
 * llevan su estado encima (R81). Las tres siguen siendo secciones con hash
 * propio; el bloque es una capa de navegación, no un contenedor de estado.
 *
 * La franja se inyecta en las tres secciones (`#tabs-{hash}`) y quien marca
 * la pestaña activa es markActiveNav() (shell.js), que ya sabe leer
 * `.bloque-tabs__tab[data-section]`. Solo se ve bajo 1024px (responsive.css):
 * en escritorio la barra lateral lista Aprende y Tu progreso en filas propias.
 */

import { S, EventBus } from '../core/state.js';
import { hoy } from '../infra/utils.js';
import { registrarRender, programarRender } from '../infra/render.js';
import { avisosDeHoy } from '../infra/avisos.js';
import { siguienteLeccion } from '../dominio/aprende/logic.js';
import { resumenProgreso } from '../dominio/logros/logic.js';

/**
 * Las tres lentes del bloque, en el orden en que se leen. La primera es la
 * portada: el bloque aterriza en ella porque domina a sus hermanas (R81).
 */
export const LENTES_BLOQUE_INICIO = [
  { hash: 'dash',     etiqueta: 'Hoy' },
  { hash: 'aprende',  etiqueta: 'Aprende' },
  { hash: 'progreso', etiqueta: 'Tu progreso' },
];

/**
 * HTML de la franja. Pura: las etiquetas son constantes del módulo y el
 * estado de cada pestaña nace vacío; lo escribe sincronizarBloqueInicio().
 *
 * @returns {string}
 */
export function htmlBloqueInicio() {
  const tabs = LENTES_BLOQUE_INICIO.map(({ hash, etiqueta }) => `
        <a class="bloque-tabs__tab bloque-tabs__tab--estado" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
          <span class="bloque-tabs__label">${etiqueta}</span>
          <span class="bloque-tabs__estado" aria-hidden="true"></span>
        </a>`).join('');
  return `<nav class="bloque-tabs bloque-tabs--inicio" aria-label="Lentes de Inicio">${tabs}</nav>`;
}

/**
 * El estado que cada pestaña lleva encima. Puro respecto al DOM.
 *
 * - Hoy: cuántos avisos hay, con el mismo conjunto que "Atención hoy".
 * - Aprende: cuánto dura la lección que sigue.
 * - Tu progreso: el nivel actual.
 *
 * @param {typeof S} [state=S]
 * @param {string} [hoyISO=hoy()]
 * @returns {{ avisos: number, minutos: number | null, nivel: string }}
 */
export function estadoLentesInicio(state = S, hoyISO = hoy()) {
  const avisos = avisosDeHoy(state, hoyISO).length;
  const minutos = siguienteLeccion(state.aprende)?.minutos ?? null;
  const nivel = resumenProgreso(state).nivel.nombre;
  return { avisos, minutos, nivel };
}

/**
 * Escribe el estado en las tres copias de la franja. El texto del estado es
 * decorativo (`aria-hidden`); lo que oye el lector es el nombre accesible de
 * la pestaña, que se reescribe con el estado (mismo criterio que Gastos).
 *
 * @param {{ avisos: number, minutos: number | null, nivel: string }} [estado]
 */
export function sincronizarBloqueInicio(estado = estadoLentesInicio()) {
  const textos = {
    dash:     estado.avisos > 0 ? `${estado.avisos} ${estado.avisos === 1 ? 'aviso' : 'avisos'}` : '',
    aprende:  estado.minutos ? `${estado.minutos} min` : '',
    progreso: estado.nivel,
  };
  for (const { hash, etiqueta } of LENTES_BLOQUE_INICIO) {
    document.querySelectorAll(`.bloque-tabs--inicio .bloque-tabs__tab[data-section="${hash}"]`).forEach((tab) => {
      const span = tab.querySelector('.bloque-tabs__estado');
      if (span) span.textContent = textos[hash];
      tab.setAttribute('aria-label', textos[hash] ? `${etiqueta}, ${textos[hash]}` : etiqueta);
    });
  }
}

/**
 * Inyecta la franja en las tres lentes y engancha su estado al render
 * global. Se llama una sola vez desde bootstrap.js, antes del router.
 */
export function initBloqueInicio() {
  const html = htmlBloqueInicio();
  for (const { hash } of LENTES_BLOQUE_INICIO) {
    const slot = document.getElementById(`tabs-${hash}`);
    if (slot) slot.innerHTML = html;
  }
  sincronizarBloqueInicio();
  registrarRender(_sincronizar);
  // Terminar una lección o registrar un gasto cambia el estado de las
  // pestañas sin pasar por renderAll(): se repinta al final del tick.
  EventBus.on('state:change', () => programarRender(_sincronizar));
}

/** Identidad estable para el coalescer de renders (PERF.6). */
function _sincronizar() {
  sincronizarBloqueInicio();
}
