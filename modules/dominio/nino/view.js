/**
 * nino/view.js - lo que ve el niño (APR.3a, ADR 093 D9).
 *
 * Por ahora su Inicio: el saludo de Frai y la salida para cambiar de perfil.
 * La barra de cuatro destinos, la ruta, la alcancía y "Yo" llegan con APR.3c
 * y APR.3d. Voz del niño (D6): frases de máximo 10 palabras.
 */

import { esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { htmlFrai } from '../../infra/ilustraciones.js';

/**
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @returns {string}
 */
export function htmlInicioNino(perfil) {
  return `
    <section class="nino-inicio" aria-labelledby="nino-hola">
      <div class="nino-inicio__saludo">
        ${htmlFrai('saluda', { tamano: 96 })}
        <div class="nino-inicio__texto">
          <h1 class="k-h1" id="nino-hola" tabindex="-1">¡Hola, ${esc(perfil.nombre)}!</h1>
          <p class="k-body">Muy pronto tendrás aquí tus lecciones y tu alcancía.</p>
        </div>
      </div>
      <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="perfil-cambiar">
        ${icon('transferencia')}Cambiar de perfil
      </button>
    </section>`;
}
