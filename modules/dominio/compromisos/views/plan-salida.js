/**
 * compromisos/views/plan-salida.js - la hoja del plan de salida en el teléfono
 * (ADR 132 D10).
 *
 * El tablero ordena la hoja por lo que se viene a preguntar: primero el
 * resultado ("sales de deudas en 15 meses y pagas $X en intereses"), después
 * por cuál empezar (Bola de nieve y Avalancha como dos pestañas, la
 * recomendada marcada) con el orden en que se terminan las deudas, luego qué
 * pasa si se paga un poco más y "Aplicar", y al final las otras opciones
 * (renegociar, juntar) como filas. Si las cuotas no alcanzan para los
 * intereses, el aviso va primero con lo que crece cada deuda y "Lo mínimo
 * para salir".
 *
 * Desde 1024px el simulador sigue siendo la tarjeta de `estrategia.js`. Las
 * acciones son las mismas (`elegir-estrategia`, `cambiar-extra-remedio`,
 * `aplicar-aumento-cuota`, `elegir-alternativa`) y las herramientas de
 * renegociar y juntar son las de `estrategia-impacto.js`.
 *
 * Puede leer S. No puede mutarlo.
 */

import { miles } from '../../../infra/miles.js';
import { S } from '../../../core/state.js';
import { esc as _esc, f, hoy } from '../../../infra/utils.js';
import { icon, tejaCategoria } from '../../../infra/icons.js';
import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { estimarSalarioMensual } from '../../../infra/financiero.js';
import { compararEstrategias, recomendarEstrategia, calcularFijosMensuales, analizarDeudas, deudasUnibles } from '../logic.js';
import { calcularGastoVariablePromedio } from '../../tesoreria/logic.js';
import { formatearDuracion, renderRenegociar, renderConsolidar } from './estrategia-impacto.js';

const _NOMBRE = { avalancha: 'Avalancha', bolaNieve: 'Bola de nieve' };
const _OTRA = { avalancha: 'bolaNieve', bolaNieve: 'avalancha' };
const _MECANISMO = {
  bolaNieve: 'Primero la deuda más chica. Cuando la terminas, su cuota se suma a la siguiente.',
  avalancha: 'Primero la deuda con la tasa más alta. Cuando la terminas, su cuota se suma a la siguiente.',
};

/** Diferencias por debajo de esto se leen como "lo mismo" (redondeo de la simulación). */
const _MISMO = 1_000;

/**
 * Qué cuesta la estrategia elegida frente a la otra, en una frase.
 *
 * @param {'avalancha'|'bolaNieve'} activa
 * @param {ReturnType<typeof compararEstrategias>} comp
 */
function _comparacion(activa, comp) {
  const otra = _OTRA[activa];
  const a = comp[activa];
  const b = comp[otra];
  if (!a.completo) return `Con tus cuotas de hoy, ${_NOMBRE[activa]} no alcanza a terminar todas tus deudas.`;
  const dif = a.interesesTotales - b.interesesTotales;
  const progreso = activa === 'bolaNieve' ? ' y ves progreso antes' : '';
  if (Math.abs(dif) < _MISMO && a.meses === b.meses) return `En tu caso cuesta lo mismo que ${_NOMBRE[otra]}${progreso}.`;
  if (dif < 0) return `En tu caso ahorras ${f(-dif)} en intereses frente a ${_NOMBRE[otra]}.`;
  return `En tu caso pagas ${f(dif)} más en intereses que con ${_NOMBRE[otra]}${activa === 'bolaNieve' ? ', pero ves progreso antes' : ''}.`;
}

/**
 * Lo que pasa con el pago extra, en el recuadro bajo el monto. Lo pinta la
 * hoja y lo repinta `refrescarExtraPlan()` con cada tecla.
 *
 * @param {ReturnType<import('../logic.js').filtrarDeudasPagables>} deudas
 * @param {number} extra
 * @param {'avalancha'|'bolaNieve'} activa
 * @returns {{ html: string, ok: boolean }}
 */
export function resultadoExtra(deudas, extra, activa) {
  if (!(extra > 0)) {
    return { html: 'Escribe un monto y mira cuánto antes sales y cuánto te ahorras.', ok: false };
  }
  const sin = compararEstrategias(deudas, 0)[activa];
  const conAmbas = compararEstrategias(deudas, extra);
  const con = conAmbas[activa];
  if (!con.completo) {
    return { html: `Con ${f(extra)} más todavía no alcanzas a terminar. Prueba con un monto mayor.`, ok: false };
  }
  if (!sin.completo) {
    return {
      html: `Con ${f(extra)} más sí terminas, pero tardas <strong>${formatearDuracion(con.meses)}</strong> y pagas <strong>${f(con.interesesTotales)}</strong> en intereses. Mientras más pongas, antes sales.`,
      ok: true,
    };
  }
  const ahorro = Math.max(0, sin.interesesTotales - con.interesesTotales);
  if (con.meses >= sin.meses && ahorro < _MISMO) {
    return { html: `Con ${f(extra)} más el plan casi no cambia. Prueba con un monto mayor.`, ok: false };
  }
  let html = `Sales en <strong>${formatearDuracion(con.meses)}</strong> en vez de ${formatearDuracion(sin.meses)}`
    + (ahorro >= _MISMO ? ` y pagas <strong>${f(ahorro)} menos</strong> en intereses.` : '.');
  const otra = conAmbas[_OTRA[activa]];
  const difOtra = con.interesesTotales - otra.interesesTotales;
  if (otra.completo && difOtra >= _MISMO) {
    const tiempo = otra.meses > con.meses ? `, pero tardas ${formatearDuracion(otra.meses - con.meses)} más`
      : otra.meses < con.meses ? ` y sales ${formatearDuracion(con.meses - otra.meses)} antes` : '';
    html += ` Con este extra, ${_NOMBRE[_OTRA[activa]]} te ahorraría ${f(difOtra)} más${tiempo}.`;
  }
  return { html, ok: true };
}

/** El texto del botón "Aplicar": con el monto si lo hay. */
const _textoAplicar = (extra) => (extra > 0 ? `Aplicar ${f(extra)} más al mes` : 'Aplicar');

/**
 * Repinta el recuadro del pago extra y el botón "Aplicar" sin repintar la hoja
 * (el foco sigue en el campo). No-op si la hoja no está en pantalla.
 *
 * @param {number} extra
 * @param {'avalancha'|'bolaNieve'|null} estrategia - la elegida, o null.
 * @returns {boolean} true si la hoja estaba y se repintó.
 */
export function refrescarExtraPlan(extra, estrategia) {
  const caja = document.querySelector('.plan-movil__resultado');
  if (!caja) return false;
  const analisis = analisisDelPlan();
  const deudas = analisis.simulables;
  const activa = estrategia ?? _recomendada(analisis);
  const r = resultadoExtra(deudas, extra, activa);
  caja.innerHTML = `${r.ok ? icon('check') : ''}<p>${r.html}</p>`;
  caja.classList.toggle('plan-movil__resultado--ok', r.ok);
  const btn = document.querySelector('.plan-movil__aplicar');
  if (btn) {
    btn.disabled = !(extra > 0);
    btn.textContent = _textoAplicar(extra);
  }
  return true;
}

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _mesLegible = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym ?? ''));
  return m ? `${_MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
};
const _lista = (nombres) => (nombres.length <= 1 ? nombres.join('')
  : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`);

/**
 * GAS.14e (ADR 189 D5): el análisis del motor con lo registrado. Sin el extra
 * que se está escribiendo: la estructura sale de los datos (BUG-011). La
 * capacidad usa el ingreso estimado, los fijos y el promedio del día a día de
 * los tres meses cerrados.
 */
export function analisisDelPlan() {
  return analizarDeudas(S.compromisos ?? [], {
    hoyISO: hoy(),
    ingresoMensual: estimarSalarioMensual(S.ingresos ?? []),
    fijosMensuales: calcularFijosMensuales(S.compromisos ?? []),
    // Sin ningún mes cerrado con gastos el promedio es desconocido (null),
    // no 0: restar 0 inflaría lo que queda libre.
    diaADia: calcularGastoVariablePromedio(S.gastos ?? []) || null,
  });
}

/** El orden que recomienda el motor; si recomienda otra cosa, el de siempre. */
function _recomendada(analisis) {
  const id = analisis.principal?.id;
  if (id === 'avalancha' || id === 'bolaNieve') return id;
  return recomendarEstrategia(analisis.simulables, 0).estrategia ?? 'bolaNieve';
}

/**
 * "Tu plan" (ADR 189 D5 y D6): la recomendación principal, por qué, qué pasa
 * (estimado) y lo que falta. Va arriba de la hoja; en escritorio, arriba de la
 * tarjeta. El diseño final es de Claude Design: usa las clases de cada
 * superficie.
 *
 * @param {ReturnType<typeof analisisDelPlan>} analisis
 * @param {{ escritorio?: boolean }} [opciones]
 * @returns {string}
 */
export function htmlTuPlan(analisis, { escritorio = false } = {}) {
  const p = analisis?.principal;
  if (!p) return '';
  const cls = escritorio
    ? { sec: 'estrategia-card__tu-plan', h: 'estrategia-card__bloque-titulo', p: 'estrategia-card__bloque-body' }
    : { sec: 'plan-movil__bloque plan-movil__tu-plan', h: 'plan-movil__h', p: 'plan-movil__ayuda' };
  const c = p.consecuencias;
  const cuando = c?.completo ? _mesLegible(c.mesSalida) : '';
  const resultado = c?.completo
    ? `Así sales ${analisis.simulables.length < analisis.inventario.length ? 'de las demás' : 'de deudas'} en <strong>${formatearDuracion(c.meses)}</strong>${cuando ? ` (hacia ${cuando})` : ''} y pagas <strong>${f(c.intereses)}</strong> en intereses${c.ahorroIntereses >= _MISMO ? `: ${f(c.ahorroIntereses)} menos que pagando cada una solo con su cuota` : ''}. Es un estimado.`
    : '';
  const acordar = (analisis.alternativas ?? []).filter(a => a.id === 'acordar-cuota');
  return `
    <section class="${cls.sec}" aria-labelledby="tu-plan-titulo">
      <h3 class="${cls.h}" id="tu-plan-titulo">Tu plan: ${_esc(p.titulo)}</h3>
      ${p.porque.map(t => `<p class="${cls.p}">${_esc(t)}</p>`).join('')}
      ${resultado ? `<p class="${cls.p}">${resultado}</p>` : ''}
      ${acordar.map(a => `<p class="${cls.p}"><strong>${_esc(a.titulo)}.</strong> ${_esc(a.texto)}</p>`).join('')}
    </section>`;
}


/**
 * HTML de la hoja entera. Con menos de dos deudas no hay nada que comparar:
 * el caller (`renderEstrategiaPago`) no la pide.
 *
 * GAS.14e (ADR 189 D5): las cuentas son las del motor, solo con las deudas
 * de tasa y cuota conocidas (`analisis.simulables`); "Tu plan" va primero y
 * dice qué falta de las demás. El primer argumento queda por compatibilidad.
 *
 * @param {unknown} _pagables
 * @param {{ extraMensual: number, estrategia: 'avalancha'|'bolaNieve'|null, alternativaActiva: string|null }} ui
 * @returns {string}
 */
export function htmlPlanSalida(_pagables, ui) {
  const analisis = analisisDelPlan();
  const deudas = analisis.simulables;
  const n = analisis.inventario.length;
  const total = analisis.inventario.reduce((a, d) => a + (Number(d.saldo) || 0), 0);
  const base = recomendarEstrategia(deudas, 0);
  const comp = compararEstrategias(deudas, 0);
  const recomendada = _recomendada(analisis);
  const activa = ui.estrategia ?? recomendada;
  const crece = analisis.principal?.id === 'detener-crecimiento';
  const fuera = analisis.inventario.filter(d => !deudas.some(x => x.id === d.id));

  const cabeza = `
    <header class="plan-movil__cabeza">
      ${htmlTinoSol('pensando', { tamano: 44, clase: 'plan-movil__tino' })}
      <div class="plan-movil__cabeza-textos">
        <h2 class="plan-movil__titulo">¿Cómo salir más rápido?</h2>
        <p class="plan-movil__sub">${n} ${n === 1 ? 'deuda' : 'deudas'} · debes ${f(total)}</p>
      </div>
    </header>`;

  // El mínimo es el del motor (lo que frena lo que crece); sin él, el de la
  // simulación de siempre.
  const extraMinimo = analisis.principal?.extraMinimo ?? base.diagnostico?.extraMinimo ?? null;
  const extra = ui.extraMensual > 0 ? ui.extraMensual : (extraMinimo ?? 0);

  let arriba = '';
  if (deudas.length && base.viable) {
    const plan = comp[activa];
    const orden = [...plan.orden].sort((a, b) => (a.mesPagado ?? 1e9) - (b.mesPagado ?? 1e9));
    const lead = fuera.length
      ? `Sin contar ${_esc(_lista(fuera.map(d => d.descripcion)))}, con tus cuotas de hoy sales ${deudas.length === 1 ? `de ${_esc(deudas[0].descripcion)}` : 'de las demás'} en`
      : 'Con tus cuotas de hoy, sales de deudas en';
    // GAS.14e: si este orden no termina, no se dice "50 años".
    const resultado = plan.completo ? `
    <section class="plan-movil__resultado-base" aria-label="Tu plan con las cuotas de hoy">
      <p class="plan-movil__lead">${lead}</p>
      <p class="plan-movil__cifra">${formatearDuracion(plan.meses)}</p>
      <p class="plan-movil__lead">Y pagas <strong>${f(plan.interesesTotales)}</strong> en intereses.</p>
    </section>` : `
    <section class="plan-movil__resultado-base" aria-label="Tu plan con las cuotas de hoy">
      <p class="plan-movil__lead">Con tus cuotas de hoy y empezando así,</p>
      <p class="plan-movil__cifra">no terminas</p>
      <p class="plan-movil__lead">Una deuda crece más de lo que le pagas. Con ${_NOMBRE[_OTRA[activa]]} sí terminas.</p>
    </section>`;
    const pestanas = [recomendada, _OTRA[recomendada]].map(e => `
        <button type="button" class="plan-movil__pestana${e === activa ? ' plan-movil__pestana--activa' : ''}"
                data-action="elegir-estrategia" data-estrategia="${e}" aria-pressed="${e === activa}">
          <span>${_NOMBRE[e]}</span>
          ${e === recomendada ? '<span class="plan-movil__recomendada">Recomendada para ti</span>' : ''}
        </button>`).join('');
    const porCual = deudas.length < 2 ? '' : `
    <section class="plan-movil__bloque" aria-labelledby="plan-movil-orden">
      <h3 class="plan-movil__h" id="plan-movil-orden">¿Por cuál empiezas?</h3>
      <p class="plan-movil__ayuda">Las dos formas pagan las mismas cuotas. Lo que cambia es a cuál le pones primero lo que te sobra.</p>
      <div class="plan-movil__pestanas" role="group" aria-label="Elige por cuál deuda empiezas">${pestanas}
      </div>
      <p class="plan-movil__explica">${_MECANISMO[activa]} ${_comparacion(activa, comp)}</p>
      <ol class="plan-movil__orden">${orden.map((d, i) => `
        <li><span class="plan-movil__num" aria-hidden="true">${i + 1}</span>
          <span class="plan-movil__orden-textos"><span class="plan-movil__orden-nombre">${_esc(d.descripcion)}</span>
          <span class="plan-movil__orden-sub">${d.mesPagado ? `La terminas en ${formatearDuracion(d.mesPagado)}` : 'No se termina con estas cuotas'}</span></span></li>`).join('')}
      </ol>
    </section>`;
    arriba = resultado + porCual;
  } else if (deudas.length) {
    const crecen = base.diagnostico?.deudasCrecientes ?? [];
    arriba = `
    <section class="plan-movil__alerta" role="alert">
      <p class="plan-movil__alerta-titulo">${icon('alert')}Con estas cuotas, tus deudas crecen</p>
      <p class="plan-movil__alerta-texto">Cada mes los intereses son más que lo que pagas, así que nunca terminas.</p>
      ${crecen.length ? `<ul class="plan-movil__crecen">${crecen.map(d => `
        <li><span>${_esc(d.descripcion)}</span><strong>crece ${f(d.deficitMensual)} al mes</strong></li>`).join('')}
      </ul>` : ''}
    </section>`;
  }

  let extraHtml = '';
  if (deudas.length) {
    const r = resultadoExtra(deudas, extra, activa);
    const tituloExtra = base.viable ? 'Si pagas un poco más cada mes' : 'Lo mínimo para salir';
    const abono = analisis.alternativas.find(a => a.id === 'abono-extra');
    let ayudaExtra;
    if (!base.viable || crece) {
      ayudaExtra = extraMinimo
        ? `Con ${f(extraMinimo)} más al mes repartidos en tus cuotas, las deudas dejan de crecer.`
        : 'Con un poco más al mes repartido en tus cuotas, las deudas dejan de crecer.';
    } else if (abono) {
      ayudaExtra = `Recomendado para ti: ${_esc(abono.texto)} Es un estimado con tus ingresos y tus gastos.`;
    } else {
      ayudaExtra = 'Lo que pongas de más se suma a la deuda que va primero.';
    }
    extraHtml = `
    <section class="plan-movil__bloque" aria-labelledby="plan-movil-extra">
      <h3 class="plan-movil__h" id="plan-movil-extra">${tituloExtra}</h3>
      <p class="plan-movil__ayuda">${ayudaExtra}</p>
      <div class="monto-hero plan-movil__monto">
        <label class="monto-hero__label" for="estrategia-extra">¿Cuánto más puedes pagar al mes?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="estrategia-extra" class="input input--big-amount" type="text" value="${miles(extra || '')}"
                 placeholder="0" autocomplete="off" inputmode="numeric" data-miles data-action="cambiar-extra-remedio" />
        </div>
      </div>
      <div class="plan-movil__resultado${r.ok ? ' plan-movil__resultado--ok' : ''}" role="status">${r.ok ? icon('check') : ''}<p>${r.html}</p></div>
      <button type="button" class="btn-dominio btn-dominio--bloque plan-movil__aplicar" data-dom="compromisos"
              data-action="aplicar-aumento-cuota"${extra > 0 ? '' : ' disabled'}>${_textoAplicar(extra)}</button>
    </section>`;
  }

  // ADR 189 D5, reglas 6 a 8: renegociar solo lo que cobra interés; juntar
  // solo deudas con interés y tasa conocida (nunca una personal sin interés).
  const unibles = deudasUnibles(S.compromisos ?? []);
  const opciones = [
    deudas.some(d => d.tasaEA > 0) ? { id: 'renegociar', icono: 'i-handshake', titulo: 'Renegociar la tasa',
      sub: base.viable ? 'Mira cuánto ahorras si te bajan la tasa' : 'Pide una tasa más baja: los intereses bajan y la cuota alcanza' } : null,
    unibles.length >= 2 ? { id: 'consolidar', icono: 'i-cuentas', titulo: 'Juntar tus deudas en una',
      sub: base.viable ? 'Compara un crédito nuevo, con sus costos, con lo que pagas hoy' : 'Un crédito con menor tasa y una sola cuota' } : null,
  ].filter(Boolean);
  const otras = opciones.length === 0 ? '' : `
    <section class="plan-movil__bloque" aria-labelledby="plan-movil-otras">
      <h3 class="plan-movil__h" id="plan-movil-otras">Otras opciones</h3>
      <ul class="plan-movil__opciones">${opciones.map((o) => {
    const abierta = ui.alternativaActiva === o.id;
    const herramienta = abierta ? (o.id === 'renegociar' ? renderRenegociar(deudas, ui) : renderConsolidar(unibles, ui)) : '';
    return `
        <li>
          <button type="button" class="plan-movil__opcion" data-action="elegir-alternativa" data-alternativa="${o.id}"
                  data-plegable="1" aria-expanded="${abierta}">
            ${tejaCategoria(o.icono, 'analisis')}
            <span class="plan-movil__opcion-textos"><span class="plan-movil__opcion-titulo">${o.titulo}</span>
            <span class="plan-movil__opcion-sub">${o.sub}</span></span>
            ${icon(abierta ? 'chevron-down' : 'chevron-right')}
          </button>${herramienta ? `
          <div class="plan-movil__herramienta">${herramienta}</div>` : ''}
        </li>`;
  }).join('')}
      </ul>
    </section>`;

  // ADR 189 D5, regla 10: los supuestos de toda simulación.
  const supuestos = analisis.supuestos.map(x => x.charAt(0).toLowerCase() + x.slice(1).replace(/\.$/, ''));
  return `${cabeza}${htmlTuPlan(analisis)}${arriba}${extraHtml}${otras}
    <p class="plan-movil__nota">Son simulaciones con las tasas y cuotas que registraste. Suponen que ${_lista(supuestos)}. Confírmalas con tu entidad antes de decidir. Nada cambia hasta que apliques algo.</p>`;
}
