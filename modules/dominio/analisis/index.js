/**
 * analisis/index.js - API pública del dominio de análisis.
 *
 * Análisis es un dominio de sólo lectura: no registra acciones que muten
 * datos financieros, no tiene formulario. Se limita a re-renderizar cuando
 * cualquier dato cambia. Única acción propia: el ojo de privacidad del
 * patrimonio (ANL.2b), que solo alterna el flag de configuración
 * S.config.ocultarSaldo compartido con toda la app (IN.2).
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { renderSmart, registrarRender, updSaldo, programarRender } from '../../infra/render.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderAnalisis, htmlHojaAnalisis } from './view.js';
import {
  cambiarLenteAnalisis, cambiarPeriodoAnalisis, moverPeriodoAnalisis, abrirCategoriaAnalisis, alternarOtrasCategorias,
} from './telefono.js';
import { primerGastoDe } from './logic.js';
import { hoy } from '../../infra/utils.js';
import { renderBannerProposito } from '../../ui/proposito.js';
import { alternarMontosOcultos } from '../../infra/privacidad.js';

// Secciones cuyos cambios requieren re-analisis.
// CFG.2a suma `ingresos` e `ingresosPuntuales`: el criterio "Ingresos brutos"
// del monitor de renta se deriva de ellos, así que registrar un ingreso con
// Análisis en pantalla tiene que repintar el panel.
const SECCIONES_OBSERVADAS = new Set([
  'gastos', 'compromisos', 'cuentas', 'metas', 'ahorro',
  'ingresos', 'ingresosPuntuales',
]);

/**
 * Render reactivo de la seccion, con identidad estable para el coalescer de
 * PERF.6: son 7 secciones observadas y el render hace ~15 pasadas sobre
 * `S.gastos`, asi que repintarlo una vez por emision de una misma accion es el
 * peor caso de la app.
 */
function _renderReactivo() {
  renderBannerProposito('analisis', S.gastos.length > 0);
  renderSmart(renderAnalisis, 'analisis');
}

export function initAnalisis() {
  // Registrar en renderAll para que se actualice con cualquier render global.
  registrarRender(() => renderSmart(renderAnalisis, 'analisis'));

  // ADR 134 D7: bajo 1024px la sección tiene otra anatomía; al cruzar el
  // ancho se vuelve a pintar (patrón de Límites, ADR 132 D8).
  window.matchMedia?.('(max-width: 1023.98px)').addEventListener?.('change', () => {
    renderSmart(renderAnalisis, 'analisis');
  });

  // ADR 176 D1: las dos lentes del teléfono. El foco se queda en la pestaña
  // tocada, que el repintado recrea.
  registrarAccion('analisis-lente', (el) => {
    const lente = el?.dataset?.lente;
    abrirCategoriaAnalisis(null);
    cambiarLenteAnalisis(lente);
    renderSmart(renderAnalisis, 'analisis');
    document.querySelector(`#panel-analisis .ana-lentes__tab[data-lente="${lente === 'situacion' ? 'situacion' : 'gastos'}"]`)?.focus();
  });

  // ADR 176 D2: el periodo de Tus gastos. Cambiar de tipo vuelve al que
  // contiene hoy; las flechas no pasan del periodo en curso ni antes del
  // primer gasto. El foco se queda en el control tocado.
  registrarAccion('analisis-periodo', (el) => {
    const tipo = el?.dataset?.periodo;
    // "Ver julio" (ADR 176 D6) salta a un periodo concreto con `data-ancla`.
    const ancla = /^\d{4}-\d{2}-\d{2}$/.test(el?.dataset?.ancla ?? '') ? el.dataset.ancla : null;
    abrirCategoriaAnalisis(null);
    cambiarPeriodoAnalisis(tipo, ancla && ancla < hoy() ? ancla : null);
    renderSmart(renderAnalisis, 'analisis');
    document.querySelector(`#panel-analisis .ana-periodos__btn[data-periodo="${tipo}"]`)?.focus();
  });
  registrarAccion('analisis-periodo-mover', (el) => {
    const delta = Number(el?.dataset?.delta) || 0;
    moverPeriodoAnalisis(delta, hoy(), primerGastoDe(S.gastos));
    renderSmart(renderAnalisis, 'analisis');
    const destino = document.querySelector(`#analisis-periodo [data-delta="${delta}"]`);
    (destino && !destino.disabled ? destino : document.querySelector('#analisis-periodo [data-delta]:not(:disabled)'))?.focus();
  });
  // ADR 176 D8: una fila de En qué gastas (o "Ver Restaurantes") abre el
  // detalle de su categoría; "‹ Análisis" vuelve al periodo. La pantalla
  // empieza arriba y el foco va a su título o a la fila de donde se vino.
  registrarAccion('analisis-categoria', (el) => {
    const categoria = el?.dataset?.categoria || null;
    const venia = document.querySelector('#ana-cat-titulo')?.textContent ?? null;
    abrirCategoriaAnalisis(categoria);
    renderSmart(renderAnalisis, 'analisis');
    document.getElementById('sec-analisis')?.scrollIntoView?.({ block: 'start' });
    const destino = categoria
      ? document.getElementById('ana-cat-titulo')
      : [...document.querySelectorAll('#panel-analisis .ana-parte--abre[data-categoria]')].find(b => b.dataset.categoria === venia);
    if (destino && categoria) destino.setAttribute('tabindex', '-1');
    destino?.focus?.();
  });
  registrarAccion('analisis-otras', () => {
    alternarOtrasCategorias();
    renderSmart(renderAnalisis, 'analisis');
  });

  // "Ver el día en Gastos": Movimientos con los gastos y el rango puestos
  // (ADR 176 D3), por EventBus como la salida de un tope de Límites (ADN 10).
  registrarAccion('analisis-ver-movimientos', (el) => {
    const { desde = '', hasta = '', categoria = '' } = el?.dataset ?? {};
    EventBus.emit('movimientos:ver', categoria ? { categoria, desde, hasta } : { dominio: 'gastos', desde, hasta });
  });

  // En el teléfono, cada fila de Análisis abre su hoja (`#modal-detalle-fila`):
  // la renta y el detalle de gastos (ADR 134 D7), y los factores, lo que
  // tienes y lo que debes (ADR 176 D9).
  const _HOJAS = new Set(['renta', 'factores', 'tienes', 'debes', 'hormiga']);
  registrarAccion('analisis-hoja', (el) => {
    const hoja = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!hoja || !cuerpo) return;
    const cual = el?.dataset?.hoja;
    if (!_HOJAS.has(cual)) return;
    cuerpo.innerHTML = htmlHojaAnalisis(cual);
    abrirModal(hoja);
  });
  // Un enlace de esas hojas (Ajustes, el fondo, Por pagar) lleva a otra
  // sección: la hoja se cierra para no quedar encima, como la hoja Más (NAV2.1a).
  const hojaFila = document.getElementById('modal-detalle-fila');
  hojaFila?.addEventListener('click', (e) => {
    if (!e.target.closest?.('a[href]')) return;
    if (hojaFila.querySelector('#detalle-fila-body > :is(.analisis-hoja, [data-hoja-analisis])')) cerrarModal(hojaFila);
  });

  // ANL.2b (ADR 038 D2): el ojo del patrimonio comparte el flag
  // S.config.ocultarSaldo con Inicio (IN.2), Mis cuentas (MC.18a), Deudas
  // (D.16a) y Calendario (CAL.4a): un solo control de privacidad en toda la
  // app. updSaldo() mantiene el hero de Inicio en sincronía.
  // Ficha 16 (Z3, ADR 090 D1): el aviso de deudas sin saldo sale a la lente
  // "Por pagar" con su chip puesto. Emite en vez de filtrar acá: el chip es
  // estado de `compromisos` y ningún dominio importa a otro (ADN 10). El
  // destino decide el chip a partir del compromiso, que es lo que este aviso
  // conoce (ADR 081).
  registrarAccion('analisis-completar-deuda', (el) => {
    EventBus.emit('porPagar:ver-compromiso', { id: el?.dataset?.id });
  });

  registrarAccion('analisis-saldo-visibilidad', () => {
    alternarMontosOcultos('analisis');
    save();
    updSaldo();
    renderSmart(renderAnalisis, 'analisis');
  });

  // Re-renderizar cuando cambia cualquier sección relevante.
  EventBus.on('state:change', ({ section }) => {
    if (SECCIONES_OBSERVADAS.has(section)) {
      programarRender(_renderReactivo);
    }
  });

  // Re-render al navegar a #analisis (sin esto la sección aparece vacía
  // hasta que cambien datos relevantes).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('analisis', S.gastos.length > 0);
    renderSmart(renderAnalisis, 'analisis');
  });

  // Render inicial si arrancamos directamente en #analisis.
  renderBannerProposito('analisis', S.gastos.length > 0);
  renderSmart(renderAnalisis, 'analisis');
}
