/**
 * router.test.js - el foco al navegar.
 *
 * Al navegar, el foco pasa a la sección recién mostrada (el lector de pantalla
 * anuncia su título). Con un modal abierto no: desde PERF.11 el `inert` del
 * fondo llega un cuadro después de abrir el modal, y una acción que navega y
 * abre un modal en el mismo tick (ir-a-crear-cuenta) le sacaba el foco.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initRouter } from '../../modules/infra/router.js';

function montarDom() {
  document.body.innerHTML = `
    <div class="app-shell">
      <section class="section" id="sec-dash" tabindex="-1"></section>
      <section class="section" id="sec-gast" tabindex="-1"></section>
      <section class="section" id="sec-tesoreria" tabindex="-1"></section>
    </div>
    <div class="modal-overlay" id="modal-cuenta">
      <div class="modal"><input id="campo" /></div>
    </div>`;
}

/** Navega y espera el `hashchange`, que el navegador entrega en otra tarea. */
async function ir(hash) {
  const llego = new Promise((ok) => window.addEventListener('hashchange', ok, { once: true }));
  location.hash = hash;
  await llego;
}

beforeAll(async () => {
  montarDom();
  location.hash = '';
  initRouter();
});

beforeEach(montarDom);

describe('el foco al navegar', () => {
  it('pasa a la sección recién mostrada', async () => {
    await ir('#gast');
    expect(document.getElementById('sec-gast').classList.contains('active')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('sec-gast'));
  });

  it('se queda en el modal si hay uno abierto', async () => {
    const modal = document.getElementById('modal-cuenta');
    modal.dataset.open = '';
    document.getElementById('campo').focus();
    await ir('#tesoreria');
    expect(document.getElementById('sec-tesoreria').classList.contains('active')).toBe(true);
    expect(document.activeElement).toBe(document.getElementById('campo'));
  });
});
