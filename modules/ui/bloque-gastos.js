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

import { S } from '../core/state.js';
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
  { hash: 'gast',        etiqueta: 'Día a día' },
  { hash: 'compromisos', etiqueta: 'Por pagar' },
  { hash: 'presupuesto', etiqueta: 'Límites' },
];

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML del encabezado del bloque. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del módulo, no datos del usuario: no pasan por
 * esc(). Las pastillas nacen vacías y `hidden`; su estado lo escribe
 * sincronizarBloqueGastos().
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlBloqueGastos() {
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
        <button class="bloque-gastos__ojo" type="button"
                data-action="bloque-saldo-visibilidad" aria-pressed="false"
                aria-label="Ocultar tus saldos">
          <svg class="icon" aria-hidden="true"><use href="#i-eye"/></svg>
        </button>
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

  _pintarBadge('compromisos', estado.vencidos,
    'Por pagar', n => `${n} ${n === 1 ? 'vencido' : 'vencidos'}`);
  // Punto y no número (ficha 07): en Límites lo que importa es que pasó algo.
  _pintarBadge('presupuesto', estado.excedidos,
    'Límites', n => `${n === 1 ? 'un tope excedido' : 'topes excedidos'}`, true);
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

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta el encabezado en las tres lentes, registra las acciones del reloj y
 * del ojo, y engancha su estado al render global. Se llama una sola vez desde
 * bootstrap.js.
 */
export function initBloqueGastos() {
  const html = htmlBloqueGastos();
  for (const { hash } of LENTES_BLOQUE_GASTOS) {
    const slot = document.getElementById(`tabs-${hash}`);
    if (slot) slot.innerHTML = html;
  }

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
