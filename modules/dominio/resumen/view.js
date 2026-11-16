/**
 * resumen/view.js - el panel de avisos de Inicio (CFG.3b).
 *
 * Aquí vivía también la card de resumen semanal (F8). El ADR 087 la retiró de
 * Inicio en móvil, extendiendo el ADR 070 D2, que ya la había retirado de
 * escritorio: es tendencia, y la tendencia no tiene fecha límite. Su cálculo
 * sigue entero en `resumen/logic.js` sin consumidor, esperando la ficha 16
 * (Análisis), que es su casa según ese mismo ADR.
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { avisosDeHoy } from '../../infra/avisos.js';

// ── PANEL DE AVISOS (CFG.3b, ADR 066) ────────────────────────────

/**
 * Tipos de aviso que hoy no tienen ninguna superficie propia en Inicio: los
 * demás (compromiso-vencido/proximo, apartado-proximo, prestamo-proximo) ya
 * viven en "Pendientes del mes" y "Próximas prioridades", con su propia
 * lógica de siempre (no pasan por el motor). Mostrarlos también acá sería el
 * mismo aviso dos veces en la misma pantalla.
 *
 * INI.1 (ADR 149 D2): los límites, la reserva lista, el respaldo y las
 * suscripciones salen de acá porque los dice "Novedades", en los dos anchos.
 */
const _TIPOS_SIN_PANEL_PROPIO = ['dia-de-pago', 'prestamo-vencido', 'nube-por-decidir', 'debito-sin-saldo'];

/** Filas visibles antes de resumir el resto en un texto, mismo tope que "Pendientes del mes". */
const MAX_VISIBLES_AVISOS = 4;

const _ICONO_POR_TIPO_AVISO = {
  'dia-de-pago':       () => icon('saldo'),
  'prestamo-vencido':  () => icon('personales'),
  'nube-por-decidir':  () => icon('alert'),
  'debito-sin-saldo':  () => icon('saldo'),
};

/**
 * Copy de una fila (ADR 066 D2: el motor devuelve datos, cada superficie
 * redacta el suyo). Tono neutral: "listo" nunca urgente, y el préstamo vencido
 * recuerda la fecha pactada sin lenguaje de cobro (ADR 047).
 */
function _filaAviso(a) {
  const monto = Number(a.monto) > 0 ? f(a.monto) : '';

  switch (a.tipo) {
    case 'dia-de-pago':
      return { sub: monto ? `Te llega hoy · ${monto}` : 'Te llega hoy', badge: 'Hoy', clase: 'info' };
    case 'prestamo-vencido': {
      const dias   = Number(a.dias) || 0;
      const cuando = dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
      return { sub: monto ? `Acordaron esta fecha ${cuando} · ${monto}` : `Acordaron esta fecha ${cuando}`, badge: 'Recordatorio', clase: 'info' };
    }
    case 'nube-por-decidir':
      return { sub: 'Falta decidir qué hacer con tus datos', badge: 'Por decidir', clase: 'info' };
    case 'debito-sin-saldo': {
      // HF.2b: el débito automático que la cuenta no alcanza a cubrir.
      const dias   = Number(a.dias) || 0;
      const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
      const cuenta = _esc(a.extra?.cuentaNombre || 'Tu cuenta');
      const falta  = Number(a.extra?.falta) > 0 ? ` · faltan ${f(a.extra.falta)}` : '';
      return { sub: `${cuenta} no alcanza · se debita ${cuando}${falta}`, badge: 'Sin saldo', clase: 'warning' };
    }
    default:
      return { sub: monto, badge: '', clase: 'info' };
  }
}

/**
 * Renderiza en `#panel-avisos` los avisos del motor único (`infra/avisos.js`,
 * CFG.3a) que ninguna otra superficie de Inicio muestra todavía: ingresos que
 * llegan hoy, préstamos personales con la fecha pactada ya pasada, el débito
 * sin saldo y la nube por decidir. El resto de tipos ya
 * vive en sus paneles propios (`_TIPOS_SIN_PANEL_PROPIO`), así que este panel
 * no los repite. Respeta además el interruptor por sección (CFG.3c,
 * `S.config.avisosPorSeccion`): una sección apagada en Ajustes tampoco
 * aparece acá.
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelAvisos() {
  const el = document.getElementById('panel-avisos');
  if (!el) return;

  const avisos = avisosDeHoy(S, hoy()).filter(a => _TIPOS_SIN_PANEL_PROPIO.includes(a.tipo));

  if (avisos.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const visibles = avisos.slice(0, MAX_VISIBLES_AVISOS);
  const resto    = avisos.length - visibles.length;

  const items = visibles.map(a => {
    const { sub, badge, clase, accion } = _filaAviso(a);
    const icono = (_ICONO_POR_TIPO_AVISO[a.tipo] ?? (() => icon('info')))();
    return `
      <li class="avisos-card__item">
        <div class="avisos-card__body">
          <p class="avisos-card__name">${icono} ${_esc(a.nombre || 'Aviso')}</p>
          <p class="avisos-card__sub">${sub}</p>
        </div>
        ${accion
    ? `<button type="button" class="avisos-card__badge avisos-card__badge--${clase} avisos-card__badge--accion" data-action="${accion}">${badge}</button>`
    : `<span class="avisos-card__badge avisos-card__badge--${clase}">${badge}</span>`}
      </li>`;
  }).join('');

  const n       = avisos.length;
  const titulo  = n === 1 ? '1 aviso' : `${n} avisos`;
  const masTexto = resto > 0 ? `<p class="avisos-card__mas">y ${resto} más</p>` : '';

  el.innerHTML = `
    <section class="avisos-card" aria-label="Avisos">
      <header class="avisos-card__header">
        <h2 class="avisos-card__title">${icon('alert', 'icon icon--sm')} ${titulo}</h2>
      </header>
      <ul class="avisos-card__list" role="list">
        ${items}
      </ul>
      ${masTexto}
    </section>`;
}
