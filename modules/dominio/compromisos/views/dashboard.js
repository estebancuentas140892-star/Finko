/**
 * compromisos/views/dashboard.js - paneles del dashboard relacionados con compromisos.
 *
 * Renderiza dos paneles independientes:
 *   - Vencidos del mes (`#panel-vencidos`)
 *   - Próximas prioridades a 7 días (`#panel-prioridades`)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon, iconoCategoria } from '../../../infra/icons.js';
import {
  compromisosActivos,
  compromisosProximos,
  vencidosSinPagar,
  agruparPorDiasRestantes,
  sumarMontos,
  ICONO_TIPO,
  LABEL_TIPO,
} from '../logic.js';

// IV.2c (ADR 031): "el color nunca viaja solo" (D1) - cada ítem de
// "Pendientes del mes" y "Próximas prioridades" lleva, además del icono y
// el color de su sección de origen, una etiqueta de texto con el tipo
// (`.dom-badge`, ya reutilizado en toda la app). `personal` (Me deben) y
// `apartado` no están en LABEL_TIPO (son de otros dominios, no de
// compromisos), por eso el mapeo vive local a este archivo.
const _DOM_BADGE_POR_TIPO = {
  'fijo':           'agenda',
  'deuda-entidad':  'compromisos',
  'deuda-personal': 'personales',
  'personal':       'personales',
  'apartado':       'ahorro',
};
const _LABEL_POR_TIPO = {
  ...LABEL_TIPO,
  'personal': 'Préstamo',
  'apartado': 'Reserva',
};
function _tipoBadge(tipo) {
  const dom = _DOM_BADGE_POR_TIPO[tipo] ?? 'agenda';
  const label = _LABEL_POR_TIPO[tipo] ?? tipo;
  return `<span class="dom-badge dom-badge--${dom}">${_esc(label)}</span>`;
}

// "Pendientes del mes" (IN.8e, ADR 034 D5) usa un badge más corto que el
// resto de la app ("Deuda" en vez de "Deuda con entidad"/"Deuda personal"):
// decisión propia de este panel, `_tipoBadge()` (arriba) sigue intacto para
// "Próximas prioridades", que no cambia con esta rebanada.
function _tipoBadgeCorto(tipo) {
  const dom = _DOM_BADGE_POR_TIPO[tipo] ?? 'agenda';
  const label = tipo === 'fijo' ? 'Gasto fijo' : 'Deuda';
  return `<span class="dom-badge dom-badge--${dom}">${label}</span>`;
}

/**
 * Ícono de un apartado (CAT.2c): `apartado.icono` admite dos formatos, id de
 * símbolo del catálogo ('c-carro') o emoji legacy. Antes se escapaba siempre,
 * así que un apartado con id del catálogo imprimía el texto "c-carro" dentro
 * del chip. Mismo criterio que `_iconoApartado()` en apartados/view.js,
 * replicado acá porque ningún dominio importa a otro (ADN 10).
 */
function _iconoApartado(valor) {
  if (!valor) return icon('apartados');
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor) : _esc(valor);
}

// ── DASHBOARD: OBLIGACIONES FUSIONADAS (escritorio) ──────────────

/**
 * Umbral de escritorio (DSK.1d, ADR 070 D1). Mismo valor que usa
 * `infra/render.js` para repartir el cierre de Inicio: la auditoría decide
 * desde 1024px y móvil conserva su reparto, que es territorio de MOV.1.
 */
function _enEscritorio() {
  return window.matchMedia?.('(min-width: 1024px)').matches === true;
}

/**
 * Fila de la línea de tiempo. Misma anatomía para lo vencido y lo que viene:
 * el código ya decía que la fila de un panel era "idéntica" a la del otro, y
 * fusionarlos sin unificar la fila habría dejado dos anatomías dentro de una
 * sola tarjeta.
 *
 * @param {object} it        item de vencidos o de próximos
 * @param {string} estadoHtml texto de estado a la derecha del badge ('' si no aplica)
 * @param {string} badgeHtml  badge de dominio ya renderizado
 */
function _filaObligacion(it, estadoHtml, badgeHtml) {
  const tipo     = it.tipo ?? 'fijo';
  const chipTipo = tipo === 'personal' ? 'deuda-personal' : tipo;
  const icono    = tipo === 'personal' ? icon('personales')
    : tipo === 'apartado' ? _iconoApartado(it.icono)
    : icon(ICONO_TIPO[tipo] ?? 'recurring');
  const desc  = _esc(it.descripcion ?? '(sin descripción)');
  const valor = Number(it.monto ?? it.cuotaMensual);
  const monto = Number.isFinite(valor) ? f(valor) : '';
  return `
    <li class="prioridades-card__item">
      <span class="prioridades-card__icon prioridades-card__icon--${chipTipo}" aria-hidden="true">${icono}</span>
      <div class="prioridades-card__body">
        <p class="prioridades-card__name">${desc}</p>
        <div class="prioridades-card__meta">${badgeHtml}${estadoHtml}</div>
      </div>
      ${monto ? `<p class="prioridades-card__amount">${monto}</p>` : ''}
    </li>`;
}

/**
 * Renderiza en `#panel-vencidos` la tarjeta única "Lo que tienes que pagar"
 * (DSK.1d, ADR 070 D8 y D9). Solo escritorio.
 *
 * Fusiona "Pendientes del mes" y "Próximas prioridades": misma pregunta
 * partida en dos, mismo origen, mismo eje (el tiempo) y mismo enlace. Para
 * saber cuánto debía en total el usuario tenía que sumar dos cifras de dos
 * tarjetas; acá la suma ya está hecha y va en el pie.
 *
 * La tarjeta **es** la celda (D9): `#panel-vencidos` pierde `--flat` y pinta
 * él la superficie, así que su borde cae a plomo con el de la banda de
 * contexto en vez de 24px por dentro.
 *
 * "Ya se venció" agrupa exactamente lo que `vencidosSinPagar` devuelve, que
 * es lo mismo que paga el botón de lote: si el grupo y el botón no listaran
 * el mismo conjunto, la cifra del botón dejaría de ser cierta, que es
 * justamente el defecto que D8 corrige. Por eso un compromiso que vence hoy
 * se queda en ese grupo y lo dice en su propia fila, en warning.
 */
function _renderObligaciones(el) {
  const vencidos = vencidosSinPagar(S.compromisos, S.gastos, _hoyISOLocal());

  // Los que vencen hoy ya están en `vencidos`: sin este filtro un mismo
  // compromiso sale dos veces el día que vence (IN.7), ahora dentro de la
  // misma tarjeta en vez de en dos.
  const proxComp = compromisosProximos(S.compromisos, 7).filter(c => c.diasRestantes > 0);
  const proximos = [...proxComp, ..._personalesProximos(7), ..._apartadosProximos(7)]
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const compActivos = compromisosActivos(S.compromisos).length > 0;
  if (vencidos.length === 0 && proximos.length === 0 && !compActivos) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  // D9: la celda deja de ser un marco vacío alrededor de una tarjeta.
  el.classList.remove('bento__cell--flat');
  el.classList.add('obligaciones-card');
  el.setAttribute('aria-label', 'Lo que tienes que pagar');

  const nVencidos = vencidos.length;
  const grupoVencidos = nVencidos === 0 ? '' : (() => {
    const filas = vencidos.slice(0, MAX_VISIBLES).map(v => {
      const dias  = v.diasAtraso;
      const esHoy = dias === 0;
      // El grupo ya dice que esto se venció, así que la fila solo lleva la
      // antigüedad: "hace 2 días" en vez de "Venció hace 2 días".
      const texto = esHoy ? 'vence hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
      const clase = esHoy ? 'vencidos-card__estado--warning' : 'vencidos-card__estado--danger';
      const estado = `<span class="vencidos-card__estado ${clase}">${texto}</span>`;
      return _filaObligacion(v, estado, _tipoBadgeCorto(v.tipo ?? 'fijo'));
    }).join('');

    // Los que no caben no desaparecen en silencio (misma fila que tenía
    // "Pendientes del mes", hacia la lente "Por pagar" del ADR 069).
    const verMas = nVencidos > MAX_VISIBLES
      ? `<a href="#compromisos" class="vencidos-card__ver-mas">Ver los ${nVencidos}</a>`
      : '';

    return `
      <div class="prioridades-card__group">
        <p class="prioridades-card__group-label obligaciones-card__lb--vencido">Ya se venció</p>
        <ul class="prioridades-card__list" role="list">${filas}</ul>
        ${verMas}
      </div>`;
  })();

  const gruposProximos = agruparPorDiasRestantes(proximos).map(g => {
    const filas = g.items.map(c => _filaObligacion(c, '', _tipoBadge(c.tipo ?? 'fijo'))).join('');
    return `
      <div class="prioridades-card__group${g.dias === 0 ? ' prioridades-card__group--hoy' : ''}">
        <p class="prioridades-card__group-label">${_esc(g.label)}</p>
        <ul class="prioridades-card__list" role="list">${filas}</ul>
      </div>`;
  }).join('');

  const cuerpo = (grupoVencidos || gruposProximos)
    ? grupoVencidos + gruposProximos
    : `<p class="prioridades-card__empty">Todo al día. Sin vencimientos en los próximos 7 días.</p>`;

  // El botón conserva el umbral de CAL.5b (con uno solo el lote no ahorra
  // nada) y ahora lleva la cifra dentro: es la acción más importante de la
  // pantalla y decía "Pagar los 2" sin decir cuánto.
  const pagar = nVencidos >= 2
    ? `<button type="button" class="vencidos-card__pagar" data-action="inicio-pagar-lote"
               aria-label="Pagar juntos los ${nVencidos} pagos vencidos">Pagar lo vencido · ${f(sumarMontos(vencidos))}</button>`
    : '';

  const nTodos = nVencidos + proximos.length;
  const resto = nTodos === 0 ? '' : `
    <span class="obligaciones-card__resto">${nTodos === 1 ? '1 pago' : `${nTodos} pagos`} · en total debes ${f(sumarMontos([...vencidos, ...proximos]))}</span>`;

  const pie = (pagar || resto)
    ? `<div class="obligaciones-card__pie">${pagar}${resto}</div>`
    : '';

  el.innerHTML = `
    <div class="card__header">
      <h2 class="card__title" id="obligaciones-titulo">Lo que tienes que pagar</h2>
      <a href="#agenda" class="vencidos-card__link" aria-label="Ir al calendario">Ver calendario</a>
    </div>
    <div class="obligaciones-card__body">
      ${cuerpo}
    </div>
    ${pie}`;
}

/**
 * Devuelve `#panel-vencidos` a su forma de móvil: celda plana que solo
 * reserva sitio, con `.vencidos-card` pintando su propia superficie dentro.
 * Sin esto, angostar la ventana tras haber pintado la fusión dejaría la
 * celda con superficie propia y la tarjeta dentro: caja dentro de caja.
 */
function _restaurarCeldaVencidos(el) {
  el.classList.add('bento__cell--flat');
  el.classList.remove('obligaciones-card');
  el.setAttribute('aria-label', 'Deudas y pagos vencidos');
}

// ── DASHBOARD: PANEL VENCIDOS ────────────────────────────────────

/** Filas visibles en "Pendientes del mes" antes de la fila "Ver los N". */
const MAX_VISIBLES = 4;

/**
 * Renderiza en `#panel-vencidos` la lista de compromisos vencidos del mes
 * (fijo, deuda, agenda con día de pago ya pasado). Vacío si no hay nada,
 * y limpia el panel para no ocupar espacio.
 *
 * Muestra hasta `MAX_VISIBLES` items; si hay más, el resto NO se esconde tras
 * un scroll interno (invisible en movil: el contador decia 5 y se veian 3, sin
 * ninguna pista), sino tras una fila explicita "Ver los N en el calendario".
 *
 * CAL.5b: la fuente pasa de `detectarVencidosCompletos` (calendario puro) a
 * `vencidosSinPagar` (además cruza el estado de pago del mes). Sin ese cruce el
 * panel listaba lo que el usuario ya había pagado, y el CTA nuevo habría
 * ofrecido registrar dos veces el mismo dinero.
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelVencidos() {
  const el = document.getElementById('panel-vencidos');
  if (!el) return;

  // Desde 1024px esta celda deja de ser "Pendientes del mes" y pasa a ser la
  // tarjeta fusionada (DSK.1d, ADR 070 D8): las dos listas viven en una sola
  // línea de tiempo, con un total y un pie.
  if (_enEscritorio()) return _renderObligaciones(el);
  _restaurarCeldaVencidos(el);

  const vencidos = vencidosSinPagar(S.compromisos, S.gastos, _hoyISOLocal());

  if (vencidos.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const n = vencidos.length;
  // ADR 034 D5: el título deja de incluir el conteo ("2 pendientes del
  // mes"); el número vive solo en el badge circular del header.
  const contadorLabel = n === 1 ? '1 pendiente' : `${n} pendientes`;

  const items = vencidos.slice(0, MAX_VISIBLES).map(v => {
    const tipo  = v.tipo ?? 'fijo';
    const icono = icon(ICONO_TIPO[tipo] ?? 'recurring');
    const desc  = _esc(v.descripcion);
    const monto = f(v.monto);
    const dias  = v.diasAtraso;
    // Sin línea roja lateral (D5): la urgencia vive SOLO en este texto,
    // nunca en el borde/fondo de la tarjeta (ADR 019, "gastar no es
    // incumplir"). "Vence hoy" en warning; ya vencido, en danger.
    const esHoy = dias === 0;
    const estadoTexto = esHoy ? 'Vence hoy'
      : dias === 1              ? 'Venció ayer'
      :                           `Venció hace ${dias} días`;
    const estadoClase = esHoy ? 'vencidos-card__estado--warning' : 'vencidos-card__estado--danger';
    return `
      <li class="vencidos-card__item">
        <span class="vencidos-card__icon vencidos-card__icon--${tipo}" aria-hidden="true">${icono}</span>
        <div class="vencidos-card__body">
          <p class="vencidos-card__name">${desc}</p>
          <div class="vencidos-card__meta">
            ${_tipoBadgeCorto(tipo)}
            <span class="vencidos-card__estado ${estadoClase}">${estadoTexto}</span>
          </div>
        </div>
        <p class="vencidos-card__amount">${monto}</p>
      </li>`;
  }).join('');

  const total = f(sumarMontos(vencidos));

  // Los que no caben no desaparecen en silencio: fila tactil hacia la lente
  // "Por pagar", que es donde estan todos desde el ADR 069. Antes iba al
  // calendario, que ya no es la duena del contenido y ademas bajo al menu.
  const verMas = n > MAX_VISIBLES
    ? `<a href="#compromisos" class="vencidos-card__ver-mas">Ver los ${n}</a>`
    : '';

  // CAL.5b: registrarlos juntos sin ir al calendario. Mismo umbral que la
  // tarjeta de lote del Calendario (con uno solo el lote no ahorra nada) y el
  // mismo orden: el total va arriba del boton, nunca dentro (DIS.11 C5).
  // El evento lo atiende Agenda, que es la duena del lote: aqui no se calcula
  // ni se escribe nada de dinero.
  const pagarJuntos = n >= 2
    ? `<button type="button" class="vencidos-card__pagar" data-action="inicio-pagar-lote"
               aria-label="Pagar juntos los ${n} pagos vencidos">Pagar los ${n}</button>`
    : '';

  el.innerHTML = `
    <section class="vencidos-card" aria-label="Pendientes del mes">
      <header class="vencidos-card__header">
        <h2 class="vencidos-card__title">
          Pendientes del mes
          <span class="vencidos-card__counter" aria-label="${contadorLabel}">${n}</span>
        </h2>
        <a href="#compromisos" class="vencidos-card__link"
           aria-label="Ver todo lo que tienes por pagar">Ver todos</a>
      </header>
      <ul class="vencidos-card__list" role="list">
        ${items}
      </ul>
      ${verMas}
      <p class="vencidos-card__total">
        <span>Total pendiente de pago</span>
        <span class="vencidos-card__total-amount">${total}</span>
      </p>
      ${pagarJuntos}
    </section>`;
}

// ── DASHBOARD: PANEL PRÓXIMAS PRIORIDADES ────────────────────────

/**
 * Renderiza en `#panel-prioridades` los compromisos, préstamos personales y
 * apartados con vencimiento en los próximos 7 días, agrupados por día.
 *
 * Fuentes de datos:
 *   - S.compromisos  (diaPago recurrente)
 *   - S.personales   (fechaLimite, si el préstamo no está liquidado)
 *   - S.apartados    (fechaObjetivo, si el apartado no está completado)
 *
 * Si no hay nada activo en ninguna fuente, limpia el panel.
 * No-op si el contenedor no existe.
 */
export function renderPanelPrioridades() {
  const el = document.getElementById('panel-prioridades');
  if (!el) return;

  // En escritorio esta celda no tiene contenido propio: lo que mostraba está
  // dentro de "Lo que tienes que pagar" (DSK.1d, ADR 070 D8). Se vacía en vez
  // de retirarse del marcado porque bajo 1024px sigue siendo su propia
  // tarjeta, y ese ancho es territorio de MOV.1.
  if (_enEscritorio()) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }

  // Los que vencen hoy (diasRestantes === 0) ya se muestran en "Pendientes
  // del mes" (panel-vencidos, vía detectarVencidosCompletos): sin este
  // filtro, un mismo compromiso aparece duplicado el día que vence (IN.7).
  const proxComp = compromisosProximos(S.compromisos, 7).filter(c => c.diasRestantes > 0);
  const proxPers = _personalesProximos(7);
  const proxApar = _apartadosProximos(7);

  const compActivos = compromisosActivos(S.compromisos).length > 0;
  if (!compActivos && proxPers.length === 0 && proxApar.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const proxTodos = [...proxComp, ...proxPers, ...proxApar]
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
  const grupos = agruparPorDiasRestantes(proxTodos);

  let bodyHtml;
  let totalHtml = '';
  if (grupos.length === 0) {
    bodyHtml = `<p class="prioridades-card__empty">Todo al día. Sin vencimientos en los próximos 7 días.</p>`;
  } else {
    const total = f(sumarMontos(proxTodos));
    totalHtml = `
      <p class="prioridades-card__total">
        <span>Total de próximas prioridades</span>
        <span class="prioridades-card__total-amount">${total}</span>
      </p>`;
    bodyHtml = grupos.map(g => {
      const items = g.items.map(c => {
        const tipo     = c.tipo ?? 'fijo';
        // chipTipo alimenta .prioridades-card__icon--* (mismo chip que
        // "Pendientes del mes"): deuda-personal para 'personal' (Me deben
        // comparte la familia rosa de personales), 'apartado' tiene el suyo
        // (IV.2c, antes prestaba 'fijo' por error: pintaba un apartado con el
        // color de gasto fijo).
        const chipTipo = tipo === 'personal' ? 'deuda-personal'
          : tipo;
        const icono    = tipo === 'personal'  ? icon('personales')
          : tipo === 'apartado'  ? _iconoApartado(c.icono)
          : icon(ICONO_TIPO[tipo] ?? 'recurring');
        const desc  = _esc(c.descripcion ?? '(sin descripción)');
        // Las deudas guardan su cuota en `cuotaMensual` (v6); fijos, préstamos
        // personales y apartados llegan con `monto`.
        const valor = Number(c.monto ?? c.cuotaMensual);
        const monto = Number.isFinite(valor) ? f(valor) : '';
        // Anatomía de dos líneas idéntica a .vencidos-card__item: el badge deja
        // de robarle ancho al nombre en la misma línea (a 390px truncaba a la
        // mitad) y el glifo deja de pintarse del color de su propio fondo.
        return `
          <li class="prioridades-card__item">
            <span class="prioridades-card__icon prioridades-card__icon--${chipTipo}" aria-hidden="true">${icono}</span>
            <div class="prioridades-card__body">
              <p class="prioridades-card__name">${desc}</p>
              <div class="prioridades-card__meta">${_tipoBadge(tipo)}</div>
            </div>
            ${monto ? `<p class="prioridades-card__amount">${monto}</p>` : ''}
          </li>`;
      }).join('');

      const esHoy = g.dias === 0;
      return `
        <div class="prioridades-card__group${esHoy ? ' prioridades-card__group--hoy' : ''}">
          <p class="prioridades-card__group-label">${_esc(g.label)}</p>
          <ul class="prioridades-card__list" role="list">${items}</ul>
        </div>`;
    }).join('');
  }

  el.innerHTML = `
    <section class="prioridades-card" aria-label="Próximas prioridades">
      <header class="prioridades-card__header">
        <h2 class="prioridades-card__title">Próximas prioridades</h2>
        <a href="#agenda" class="prioridades-card__link"
           aria-label="Ir al calendario">Ver calendario</a>
      </header>
      <div class="prioridades-card__body">
        ${bodyHtml}
      </div>
      ${totalHtml}
    </section>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve la fecha local (no UTC) en formato YYYY-MM-DD.
 * Necesario para que el cómputo de "vencido hoy" use el día visible al usuario,
 * no el día UTC. En Colombia (GMT-5), `toISOString` arroja un día más
 * entre 19:00 y 23:59 local.
 */
function _hoyISOLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Días desde hoy hasta una fecha ISO YYYY-MM-DD.
 * Devuelve null si la fecha es inválida. Negativo si ya pasó.
 * Usa comparación local (sin UTC) para consistencia con el resto de la UI.
 */
function _diasHastaFechaISO(fechaISO) {
  if (!fechaISO || typeof fechaISO !== 'string') return null;
  const partes = fechaISO.split('-').map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) return null;
  const [yyyy, mm, dd] = partes;
  const hoy    = new Date();
  const hoyMs  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const targetMs = new Date(yyyy, mm - 1, dd).getTime();
  return Math.round((targetMs - hoyMs) / 86_400_000);
}

/**
 * Items de S.personales cuya fechaLimite cae en los próximos `diasLimite` días.
 * Solo incluye préstamos no liquidados.
 */
function _personalesProximos(diasLimite) {
  const lista = Array.isArray(S.personales) ? S.personales : [];
  const resultado = [];
  for (const p of lista) {
    if (p.liquidado || !p.fechaLimite) continue;
    const dias = _diasHastaFechaISO(p.fechaLimite);
    if (dias === null || dias < 0 || dias > diasLimite) continue;
    resultado.push({
      diasRestantes: dias,
      tipo:          'personal',
      descripcion:   `${p.persona} te debe`,
      monto:         Math.max(0, (p.monto || 0) - (p.pagado || 0)),
    });
  }
  return resultado;
}

/**
 * Items de S.apartados cuya fechaObjetivo cae en los próximos `diasLimite` días.
 * Solo incluye apartados no completados con fecha pactada.
 */
function _apartadosProximos(diasLimite) {
  const lista = Array.isArray(S.apartados) ? S.apartados : [];
  const resultado = [];
  for (const a of lista) {
    if (a.completado || !a.fechaObjetivo) continue;
    const dias = _diasHastaFechaISO(a.fechaObjetivo);
    if (dias === null || dias < 0 || dias > diasLimite) continue;
    resultado.push({
      diasRestantes: dias,
      tipo:          'apartado',
      descripcion:   a.nombre,
      monto:         Math.max(0, (a.montoObjetivo || 0) - (a.montoActual || 0)),
      icono:         a.icono ?? null,
    });
  }
  return resultado;
}
