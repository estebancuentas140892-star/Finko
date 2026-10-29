/**
 * bloque-gastos.js - el encabezado del bloque Gastos en móvil.
 *
 * Ficha 01 de la auditoría móvil (ADR 069): en la barra inferior "Gastos"
 * deja de nombrar una sección y pasa a nombrar un bloque con tres lentes.
 * Ficha 07 (ADR 069 D8) le da su anatomía: un nombre, **un solo reloj** y las
 * tres pestañas. Las tres lentes siguen siendo secciones con hash propio; el
 * bloque es una capa de navegación, no un contenedor nuevo de estado, así que
 * no hay hash nuevo en router.js.
 *
 * El encabezado se inyecta en las tres secciones (`#tabs-{hash}`) con el mismo
 * patrón con el que proposito.js inyecta su banner. Quien marca la pestaña
 * activa es markActiveNav() (shell.js): las pestañas son navegación y el nav
 * ya sabe leer `data-section`.
 *
 * Solo se ve bajo 1024px (responsive.css): en escritorio el sidebar ya lista
 * las tres lentes en filas propias y cada una conserva su hero con su
 * selector de mes.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { hoy } from '../infra/utils.js';
import { registrarRender, renderAll } from '../infra/render.js';
import { registrarAccion } from './actions.js';
import { mesBloque, etiquetaMesBloque } from '../infra/mes-bloque.js';
import { mesTopeGastos, navegarMesGastos } from '../dominio/gastos/view.js';
import { vencidosSinPagar } from '../dominio/compromisos/logic.js';
import { alertasLimites } from '../dominio/presupuesto/logic.js';

/**
 * Las tres lentes del bloque, en el orden en que se leen. La primera es la
 * portada: el bloque aterriza en ella porque domina a sus hermanas (R81).
 *
 * "Día a día" no es un nombre nuevo: sale del propio código. El filtro de
 * categorías internas existe para enfocarse en "lo que el usuario sí decide
 * gastar día a día", así que la etiqueta nombra con exactitud lo que la lente
 * muestra y, por contraste, explica qué no muestra.
 */
export const LENTES_BLOQUE_GASTOS = [
  { hash: 'gast',        etiqueta: 'Día a día', primario: 'Gasto' },
  { hash: 'compromisos', etiqueta: 'Por pagar', primario: 'Agregar' },
  { hash: 'presupuesto', etiqueta: 'Límites',   primario: 'Límite' },
];

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML del encabezado del bloque. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del módulo, no datos del usuario: no pasan por
 * esc(). Las pastillas nacen vacías y `hidden`; su estado lo escribe
 * sincronizarBloqueGastos().
 *
 * ADR 098 D5: la cabecera suma dos cosas en la fila del nombre. La lupa, que
 * lleva a buscar en todo el historial (Movimientos), y el primario de la lente
 * en versión corta ("+ Gasto"). Antes el primario vivía en su propia fila
 * encima del bloque y empujaba la lista 96px hacia abajo. Es un espejo: al
 * tocarlo dispara el botón original del encabezado de la sección, que sigue
 * siendo el que lee la barra superior de escritorio.
 *
 * @param {string} [hash] Lente donde se inyecta; elige el texto del primario.
 * @returns {string} HTML listo para inyectar.
 */
export function htmlBloqueGastos(hash = 'gast') {
  const lente = LENTES_BLOQUE_GASTOS.find(l => l.hash === hash) ?? LENTES_BLOQUE_GASTOS[0];
  const tabs = LENTES_BLOQUE_GASTOS.map(({ hash, etiqueta }) => `
        <a class="bloque-tabs__tab" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
          <span class="bloque-tabs__label">${etiqueta}</span>
          <span class="badge bloque-tabs__badge" aria-hidden="true" hidden></span>
        </a>`).join('');

  return `
    <div class="bloque-gastos">
      <div class="bloque-gastos__cabecera">
        <div class="bloque-gastos__nombre">
          <p class="bloque-gastos__titulo">Gastos</p>
          <p class="bloque-gastos__sub">Todo el dinero que se te va</p>
        </div>
        <div class="bloque-gastos__herramientas">
          <button class="bloque-gastos__ojo bloque-gastos__lupa" type="button"
                  data-action="bloque-buscar" aria-label="Buscar en tus movimientos">
            <svg class="icon" aria-hidden="true"><use href="#i-search"/></svg>
          </button>
          <button class="bloque-gastos__ojo" type="button"
                  data-action="bloque-saldo-visibilidad" aria-pressed="false"
                  aria-label="Ocultar tus saldos">
            <svg class="icon" aria-hidden="true"><use href="#i-eye"/></svg>
          </button>
          <button class="btn btn-primary btn-sm bloque-gastos__primario" type="button"
                  data-action="bloque-primario" data-lente="${lente.hash}">
            <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>${lente.primario}
          </button>
        </div>
      </div>
      <div class="bloque-gastos__mes" role="group" aria-label="Seleccionar mes">
        <button type="button" class="bloque-gastos__mes-btn"
                data-action="bloque-mes-prev" aria-label="Mes anterior">‹</button>
        <span class="bloque-gastos__mes-label"></span>
        <button type="button" class="bloque-gastos__mes-btn"
                data-action="bloque-mes-next" aria-label="Mes siguiente">›</button>
      </div>
      <nav class="bloque-tabs" aria-label="Lentes de Gastos">${tabs}</nav>
    </div>`;
}

/**
 * El estado que cada pestaña muestra encima. Puro respecto al DOM: recibe el
 * estado y la fecha, así que se testea sin app.
 *
 * `vencidos` usa la misma llamada que el bloque "Atención hoy" de Inicio
 * (compromisos/views/dashboard.js), sin config propia: si los dos contaran
 * distinto, la barra diría un número y el inicio otro.
 *
 * `excedidos` se cuenta, pero la pestaña "Límites" muestra un punto y no el
 * número (ficha 07): el dato importante es que pasó algo, no cuántos.
 *
 * @param {typeof S} [state=S]
 * @param {string} [hoyISO=hoy()] YYYY-MM-DD
 * @returns {{vencidos:number, excedidos:number}}
 */
export function estadoLentesGastos(state = S, hoyISO = hoy()) {
  const anio = Number(hoyISO.slice(0, 4));
  const mes  = Number(hoyISO.slice(5, 7));

  const vencidos = vencidosSinPagar(state.compromisos ?? [], state.gastos ?? [], hoyISO).length;
  const excedidos = alertasLimites(state.presupuestos ?? [], state.gastos ?? [], anio, mes)
    .filter(a => a.estado === 'excedido').length;

  return { vencidos, excedidos };
}

/**
 * Escribe en las tres copias del encabezado lo que cambia con el estado: el
 * rótulo del mes, el tope de la navegación, el ojo y las pastillas.
 * No-op si el encabezado no está en el DOM.
 *
 * @param {{vencidos:number, excedidos:number}} [estado]
 */
export function sincronizarBloqueGastos(estado = estadoLentesGastos()) {
  const etiqueta = etiquetaMesBloque();
  const tope     = mesTopeGastos();
  const { anio, mes } = mesBloque();
  const enTope   = anio === tope.anio && mes === tope.mes;
  const oculto   = S.config?.ocultarSaldo === true;

  document.querySelectorAll('.bloque-gastos__mes-label')
    .forEach(el => { el.textContent = etiqueta; });

  document.querySelectorAll('[data-action="bloque-mes-next"]').forEach((btn) => {
    btn.disabled = enTope;
    btn.setAttribute('aria-disabled', String(enTope));
  });

  document.querySelectorAll('[data-action="bloque-saldo-visibilidad"]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(oculto));
    btn.setAttribute('aria-label', oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos');
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', `#i-eye${oculto ? '-off' : ''}`);
  });

  _sincronizarPrimarios();

  _pintarBadge('compromisos', estado.vencidos,
    'Por pagar', n => `${n} ${n === 1 ? 'vencido' : 'vencidos'}`);
  // Punto y no número (ficha 07): en Límites lo que importa es que pasó algo.
  _pintarBadge('presupuesto', estado.excedidos,
    'Límites', n => `${n === 1 ? 'un tope excedido' : 'topes excedidos'}`, true);
}

/**
 * El botón original del encabezado de una lente: el que manda.
 * @param {string} hash
 * @returns {HTMLButtonElement|null}
 */
function _primarioOriginal(hash) {
  return document.querySelector(`#sec-${hash} > .section__header > .btn-primary`);
}

/**
 * El espejo copia del original el nombre accesible y si se ve: cada dominio
 * oculta su primario cuando no aplica (Límites sin plan del mes, por ejemplo),
 * y el espejo no puede contradecirlo.
 */
function _sincronizarPrimarios() {
  document.querySelectorAll('.bloque-gastos__primario').forEach((espejo) => {
    const original = _primarioOriginal(espejo.dataset.lente);
    espejo.hidden = !original || original.hidden;
    const nombre = original?.getAttribute('aria-label') || original?.textContent.trim();
    if (nombre) espejo.setAttribute('aria-label', nombre);
  });
}

/**
 * La pastilla es decorativa (`aria-hidden`): un número suelto leído en voz
 * alta no dice de qué. Lo que oye el lector es el nombre accesible de la
 * pestaña, que se reescribe con el conteo.
 *
 * @param {string} hash
 * @param {number} n
 * @param {string} etiqueta
 * @param {(n:number) => string} frase
 * @param {boolean} [comoPunto=false] Muestra un punto en vez del número.
 */
function _pintarBadge(hash, n, etiqueta, frase, comoPunto = false) {
  document.querySelectorAll(`.bloque-tabs__tab[data-section="${hash}"]`).forEach((tab) => {
    const badge = tab.querySelector('.bloque-tabs__badge');
    if (badge) {
      badge.textContent = n > 0 && !comoPunto ? String(n) : '';
      badge.classList.toggle('bloque-tabs__badge--punto', comoPunto);
      badge.hidden = n === 0;
    }
    tab.setAttribute('aria-label', n > 0 ? `${etiqueta}, ${frase(n)}` : etiqueta);
  });
}

/**
 * Va a Movimientos sin filtros y pone el foco en la búsqueda. La lupa del
 * bloque y la de Inicio comparten esta salida (ADR 098 D5). El foco espera a
 * que Movimientos pinte su barra: `movimientos:ver` la repinta en un timeout.
 */
export function irABuscar() {
  EventBus.emit('movimientos:ver', {});
  setTimeout(() => document.getElementById('movimientos-buscar')?.focus(), 60);
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta el encabezado en las tres lentes, registra las acciones del reloj y
 * del ojo, y engancha su estado al render global. Se llama una sola vez desde
 * bootstrap.js.
 */
export function initBloqueGastos() {
  for (const { hash } of LENTES_BLOQUE_GASTOS) {
    const slot = document.getElementById(`tabs-${hash}`);
    if (slot) slot.innerHTML = htmlBloqueGastos(hash);
  }

  // ADR 098 D5: el espejo dispara el original, así hereda su acción, sus
  // datos y cualquier cambio futuro sin duplicar nada. Un observador sigue el
  // `hidden` que cada dominio le pone a su primario en su propio render.
  registrarAccion('bloque-primario', (el) => { _primarioOriginal(el.dataset.lente)?.click(); });
  if (typeof MutationObserver === 'function') {
    const obs = new MutationObserver(_sincronizarPrimarios);
    for (const { hash } of LENTES_BLOQUE_GASTOS) {
      const original = _primarioOriginal(hash);
      if (original) obs.observe(original, { attributes: true, attributeFilter: ['hidden'] });
    }
  }
  _sincronizarPrimarios();

  // La lupa busca en todo el historial: Movimientos con los filtros limpios y
  // el foco en el campo de búsqueda. Va por EventBus (ADN 10), igual que la
  // salida de un tope de Límites.
  registrarAccion('bloque-buscar', irABuscar);

  // El reloj manda sobre las tres lentes (G4), así que repinta todo: cada
  // dominio decide con `renderSmart` si le toca. Delega en navegarMesGastos
  // para conservar el reset del filtro de categoría, que es propio de la
  // portada y no del bloque.
  registrarAccion('bloque-mes-prev', () => { navegarMesGastos(-1); renderAll(); });
  registrarAccion('bloque-mes-next', () => { navegarMesGastos(1);  renderAll(); });

  // Mismo flag de privacidad que el resto de la app (IN.2): un solo control.
  // Desde acá silencia las tres lentes a la vez en vez de una sola pantalla.
  registrarAccion('bloque-saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    renderAll();
  });

  sincronizarBloqueGastos();
  registrarRender(() => sincronizarBloqueGastos());
}
