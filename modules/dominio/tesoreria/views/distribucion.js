/**
 * tesoreria/views/distribucion.js - tarjeta de distribucion sugerida y asistente
 * "Distribuir mi ingreso" (presets, pasos, filas por destino).
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon, iconoCategoria } from '../../../infra/icons.js';
import { resolverMarca, tejaMarca } from '../../../infra/marcas.js';
import { bancoAvatar } from '../../../infra/bancos.js';
import {
  CATEGORIA_DEUDA_ICONO, CATEGORIA_DEUDA_PERSONAL_ICONO, iconoDeCategoriaGasto,
} from '../../../core/constants.js';
import { cuentasActivas } from '../logic/cuentas.js';
import { estimarSalarioMensual } from '../../../infra/financiero.js';
import {
  construirContextoDistribucion,
  sugerirDistribucionIngreso,
  PRESETS_DISTRIBUCION,
  esDistribucionPersonalizadaValida,
  construirDesgloseAhorroPorObjetivo,
  construirDesgloseNecesidades,
  presupuestosSobreRemanente,
  construirPlanInversiones,
  construirFilasTransferenciaCuentas,
  estadoDistribucion,
} from '../logic/distribucion.js';
import { frecuenciaPrincipalIngresos, montoCobroPrincipal } from '../../../infra/vencimientos.js';
import { fechaCorta } from './ingresos.js';

// ── DISTRIBUCIÓN ADAPTATIVA ──────────────────────────────────────

/**
 * Nudge de "Distribuir mi ingreso" en Inicio (CAL.1, ADR 028 D4): visible en
 * el bloque "Atención hoy" cuando ya llegó el cobro del periodo y aún no se
 * distribuyó. Reutiliza `estadoDistribucion()`, el mismo guard de
 * de-duplicación que ya usa el panel de Mis cuentas (`S.config.ultimaDistribucionPeriodo`):
 * no hay marcador nuevo que mantener. El CTA emite el `distribuir:abrir`
 * existente (ADR 021 / NAV.A2b), que navega a Mis cuentas y abre el asistente.
 * No-op si el contenedor no existe.
 */
export function renderNudgeDistribucionInicio() {
  const el = document.getElementById('panel-distribuir-inicio');
  if (!el) return;

  // MC.13f: un cobro ya confirmado por el usuario cuenta como recibido, así que
  // el nudge aparece igual que con uno datado. Sin confirmar el estado es
  // 'por-confirmar' y el nudge sigue oculto: la pregunta vive en Mis cuentas,
  // Inicio no la duplica.
  const estado = estadoDistribucion(
    S.ingresos ?? [],
    S.config?.ultimaDistribucionPeriodo ?? null,
    new Date(),
    S.config?.cobroConfirmadoPeriodo ?? null,
  );
  if (estado.estado !== 'listo') {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const titulo = estado.esHoy
    ? 'Hoy recibes tu ingreso'
    : `Recibiste tu ingreso el ${fechaCorta(estado.periodoISO)}`;

  // Mismo componente de nudge que el resto de la app (ver styles/components/nudges.css);
  // nivel "info" porque es una invitación a actuar, no una mora ni un error.
  el.innerHTML = `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon('bolt')}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        <p class="nudge__desc">Distribúyelo antes de empezar a gastarlo.</p>
      </div>
      <button type="button" class="nudge__cta btn btn-primary btn-sm" data-action="distribuir-desde-inicio">
        Distribuir ahora
      </button>
    </div>`;
}

/**
 * Reúne todo lo que necesitan tanto la tarjeta de entrada compacta (D6) como
 * el asistente por pasos: el contexto (la "realidad registrada", compartido
 * con Límites de gasto MC.5), la sugerencia de reparto y cada destino
 * fondeable. `null` si no hay ingreso mensual estimable o nada que sugerir.
 *
 * @returns {null | {
 *   dist: ReturnType<typeof sugerirDistribucionIngreso>,
 *   presetId: string,
 *   distribucionPersonalizada: {n:number,e:number,a:number}|null,
 *   estado: ReturnType<typeof estadoDistribucion>,
 *   hayDestinos: boolean,
 *   distribuir: object,
 * }}
 */
function _construirDatosDistribucion() {
  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  if (!ingresoMensual) return null;

  // Dos cifras distintas, a propósito (BUG-2): el mensual-equivalente alimenta
  // el split de porcentajes (`sugerirDistribucionIngreso` compara contra fijos,
  // cuotas y aportes mensuales: con la cifra por cobro los % se dispararían).
  // El monto que se reparte HOY y se acredita a la cuenta es lo recibido en
  // ESTE cobro: un quincenal reparte una quincena, no dos. `|| ingresoMensual`
  // es una red defensiva (datos válidos siempre dan > 0).
  const montoCobro = montoCobroPrincipal(S.ingresos ?? []) || ingresoMensual;

  const contexto = construirContextoDistribucion(S);
  const { presetId, distribucionPersonalizada } = contexto;

  const dist = sugerirDistribucionIngreso(ingresoMensual, contexto);
  if (!dist) return null;

  // Estado de "Distribuir mi ingreso" (MC.4d): la acción se habilita solo cuando
  // llega el cobro del periodo y aún no se distribuyó (guard de de-duplicación).
  const estadoDist = estadoDistribucion(
    S.ingresos ?? [],
    S.config?.ultimaDistribucionPeriodo ?? null,
    new Date(),
    S.config?.cobroConfirmadoPeriodo ?? null,
  );

  // El cobro que se está repartiendo (MC.13c-2): su fecha la data
  // `estadoDistribucion` (sólo Mensual/Quincenal; sin ella el motor asume hoy,
  // que es cuando el usuario está repartiendo) y su frecuencia sale de la
  // frecuencia real de cobro del usuario (motor mitad B, punto 21 del brief).
  const cobro = {
    frecuencia: frecuenciaPrincipalIngresos(S.ingresos ?? []),
    fechaISO:   estadoDist.periodoISO ?? null,
  };

  // Checklist accionable de Necesidades (Paso 1 del asistente, MC.7d, ADR 018
  // revisión 2026-07-02): el usuario marca cuáles cubre con este ingreso; al
  // confirmar, cada marca registra el mismo pago que su flujo individual.
  // Desde MC.13c-2 muestra lo que toca con ESTE cobro (todas las frecuencias),
  // no todos los fijos mensuales del mes.
  const itemsNecesidades = construirDesgloseNecesidades(
    S.compromisos ?? [], S.gastos ?? [], new Date(), cobro,
  );

  // Presupuestos sobre el remanente real (R3): el punto de partida asume el
  // estado inicial del checklist (todo lo no pagado llega marcado); acciones/distribucion.js
  // los recalcula en vivo cuando cambian las marcas o el monto.
  const necesidadesIniciales = itemsNecesidades
    .filter(it => !it.pagado)
    .reduce((s, it) => s + it.monto, 0);
  // Remanente sobre el monto del cobro (BUG-2), consistente con Necesidades:
  // ambos son de ESTE cobro (la checklist ya usa la ventana del cobro), no del
  // mes. Con el mensual el remanente quedaba inflado y sobre-sugería ahorro/EV.
  const presupuestos = presupuestosSobreRemanente(
    montoCobro, necesidadesIniciales, dist.split.ahorro.pct, dist.split.estiloVida.pct,
  );

  // Destinos fondeables del grupo Ahorro para "Distribuir mi ingreso" (MC.4a):
  // fondo de emergencia (si está activo), metas y apartados aún no completados,
  // con un aporte sugerido por objetivo (MC.7a/MC.7b, ADR 018) en vez de todo
  // al fondo por defecto.
  const fondo = S.ahorro?.fondoEmergencia;
  const fondoParaPlan = (fondo && fondo.activo)
    ? { activo: true, completado: fondo.completado === true }
    : null;

  const destinosAhorro = construirDesgloseAhorroPorObjetivo({
    metas:        S.metas ?? [],
    apartados:    S.apartados ?? [],
    fondo:        fondoParaPlan,
    budgetAhorro: presupuestos.ahorro,
    frecuencia:   cobro.frecuencia,
  });

  // Inversiones (MC.4e): cada holding es un destino fondeable; el aporte
  // incrementa su capital. El descuento de la cuenta lo centraliza tesorería.
  const destinosInversiones = construirPlanInversiones({ inversiones: S.inversiones ?? [] });

  // Paso 3 (MC.7e, ADR 018 decisión 4): con 2+ cuentas activas, el usuario
  // puede repartir el Estilo de vida entre ellas (transferencias internas, no
  // gasto). Con una sola cuenta se omite (regla de cuenta única).
  const cuentasParaTransferir = cuentasActivas(S.cuentas ?? []);
  const destinosCuentas = cuentasParaTransferir.length > 1
    ? construirFilasTransferenciaCuentas(cuentasParaTransferir)
    : [];

  const hayDestinos = itemsNecesidades.length > 0 || destinosAhorro.length > 0
    || destinosInversiones.length > 0 || destinosCuentas.length > 0;

  return {
    dist, presetId, distribucionPersonalizada, estado: estadoDist, hayDestinos,
    distribuir: {
      montoIngreso:    montoCobro,
      ahorroPct:       dist.split.ahorro.pct,
      estiloVidaPct:   dist.split.estiloVida.pct,
      ahorroBudget:    presupuestos.ahorro,
      evBudget:        presupuestos.estiloVida,
      destinosAhorro,
      destinosInversiones,
      destinosCuentas,
      itemsNecesidades,
      estado:          estadoDist,
      // MC.13e-2g (punto 10): los accesos cruzados viajan al panel para
      // repartirse por paso, uno en el paso de su categoría. La tarjeta de
      // entrada sigue sin mostrar ninguno (punto 11, MC.13e-2a).
      ctas:            dist.ctas ?? [],
    },
  };
}

/**
 * Renderiza la tarjeta de entrada compacta en `#ingresos-distribucion` (ADR
 * 035 D6): "¿Cómo distribuir $X?" con barra 50/30/20 + leyenda. El asistente
 * por pasos ya no vive inline aquí, lo lanza el botón de la tarjeta (ver
 * `abrirAsistenteDistribucion` en acciones/distribucion.js). No-op si no hay
 * ingresos mensuales registrados o el contenedor no existe.
 */
export function renderDistribucionIngreso() {
  const el = document.getElementById('ingresos-distribucion');
  if (!el) return;

  const datos = _construirDatosDistribucion();
  if (!datos) { el.innerHTML = ''; return; }

  el.innerHTML = _renderTarjetaDistribuir(datos);

  // Ancho de los 3 segmentos de la barra como propiedad JS tras el innerHTML
  // (cero style="" en el HTML generado, regla del proyecto, mismo patrón que
  // la barra de composición del hero, MC.18a).
  const { necesidades, estiloVida, ahorro } = datos.dist.split;
  const pcts = [necesidades.pct, estiloVida.pct, ahorro.pct];
  el.querySelectorAll('.distribuir-card__seg').forEach((seg, i) => {
    seg.style.width = `${pcts[i]}%`;
  });
}

/**
 * Inyecta el contenido del asistente por pasos en `#modal-distribuir-body`
 * (ADR 035 D6: el asistente se lanza como modal, ya no vive inline). Llamada
 * por `abrirAsistenteDistribucion()` cada vez que se abre, para partir
 * siempre de datos frescos.
 *
 * @returns {boolean} `false` si no hay nada que distribuir (no-op para el caller).
 */
export function renderAsistenteDistribucion() {
  const body = document.getElementById('modal-distribuir-body');
  if (!body) return false;

  const datos = _construirDatosDistribucion();
  if (!datos) { body.innerHTML = ''; return false; }

  body.innerHTML = _renderContenidoAsistente(datos.dist, datos.presetId, datos.distribucionPersonalizada, datos.distribuir);

  // Ancho de los 3 segmentos de la barra de referencia (MC.13e-2g) como
  // propiedad JS tras el innerHTML, mismo patrón que la barra de la tarjeta de
  // entrada: así los porcentajes salen del preset y no se hardcodean en CSS.
  body.querySelectorAll('.distribuir-edu__seg').forEach((seg, i) => {
    seg.style.width = `${_REFERENCIA_EXPERTOS[i].pct}%`;
  });
  return true;
}

/** Sección a la que enlaza el hint de "sin fecha", según el tipo de objetivo. */
const _SECCION_OBJETIVO = { meta: 'metas', apartado: 'apartados' };

/**
 * Una fila de destino del panel: toggle (incluir) + monto editable. Para deudas
 * muestra el saldo pendiente, para inversiones el capital actual y para
 * cuentas (MC.7e) el saldo actual, todos como contexto. Para metas/apartados
 * sin fecha (`sinFecha`, MC.7a/MC.7b) agrega un hint que invita a ponerle
 * fecha, para que el aporte se pueda calcular la próxima vez.
 * `autoExcedente` (solo la fila del fondo, R3) marca el input con
 * `data-dist-auto` para que acciones/distribucion.js re-absorba en vivo el excedente del
 * presupuesto de ahorro mientras el usuario no lo edite a mano.
 *
 * Las filas de tipo 'cuenta' (transferencias de Estilo de vida, MC.7e) arrancan
 * **sin marcar**, a diferencia de las demás: por defecto no se mueve nada (el
 * remanente completo queda en la cuenta de origen, como hoy); el usuario opta
 * por mover dinero a otra cuenta explícitamente.
 *
 * @param {{tipo:string, id:string|null, nombre:string, monto:number, saldoTotal?:number, invertido?:number, saldoActual?:number, sinFecha?:boolean, autoExcedente?:boolean, icono?:string|null, nota?:string, banco?:string}} d
 * @returns {string}
 */
function _filaDistribuir(d) {
  let sub = '';
  if (d.tipo === 'deuda' && d.saldoTotal != null) {
    sub = ` <span class="distribuir__saldo">saldo ${f(d.saldoTotal)}</span>`;
  } else if (d.tipo === 'inversion' && d.invertido != null) {
    sub = ` <span class="distribuir__saldo">invertido ${f(d.invertido)}</span>`;
  } else if (d.tipo === 'cuenta' && d.saldoActual != null) {
    sub = ` <span class="distribuir__saldo">saldo ${f(d.saldoActual)}</span>`;
  }
  const notaSub = d.nota ? ` <span class="distribuir__nota">${_esc(d.nota)}</span>` : '';

  // `ir-a-seccion` (MC.13e-2g): el enlace vive dentro del modal del asistente,
  // así que tiene que cerrarlo antes de navegar. Sin la acción, el modal
  // quedaba abierto encima de la sección recién activada. Mismo trato que los
  // accesos cruzados por paso (`_ctasDelPaso`).
  const seccionHint = _SECCION_OBJETIVO[d.tipo];
  const hint = (d.sinFecha && seccionHint)
    ? `<p class="form-hint form-hint--muted distribuir__hint">Ponle una fecha en <a href="#${seccionHint}" data-action="ir-a-seccion">${seccionHint === 'metas' ? 'Metas' : 'Reservas'}</a> para calcular cuánto aportar.</p>`
    : '';

  const marcada = d.tipo !== 'cuenta';

  return `
        <div class="distribuir__fila">
          <label class="checkbox-row distribuir__toggle">
            <input type="checkbox" data-dist-destino-toggle ${marcada ? 'checked' : ''} />
            <span>${_iconoDestino(d)} ${_esc(d.nombre)}${sub}${notaSub}</span>
          </label>
          <input type="number" class="input distribuir__monto"
                 min="0" step="10000" inputmode="numeric" value="${d.monto}"
                 aria-label="Monto para ${_esc(d.nombre)}"
                 data-dist-tipo="${_esc(d.tipo)}" data-dist-id="${_esc(d.id ?? '')}"${d.autoExcedente ? ' data-dist-auto="1"' : ''}
                 ${marcada ? '' : 'disabled'}
                 data-action="recalcular-distribucion" />
        </div>
        ${hint}`;
}

/** Ícono genérico por tipo de destino, último eslabón de la cadena de `_iconoDestino`. */
const _ICONO_GENERICO_DESTINO = { meta: 'i-metas', apartado: 'i-apartados', inversion: 'i-inversion', fondo: 'i-ahorro' };

/**
 * Ícono inline de una fila del panel de destinos (MC.13e-2c): logo/ícono de
 * marca + nombre + nota, reusando la infra ya construida (BR/MK/CAT.2), sin
 * crear íconos nuevos. Prioridad: marca reconocida en el nombre (Bancolombia,
 * Nequi...) > símbolo/emoji ya guardado en el ítem > genérico por tipo. Mismo
 * orden que ya usa Agenda para sus filas (`_renderDetalleItem`, MK.2).
 * Cuentas van aparte: siempre tienen `banco`, así que usan `bancoAvatar`
 * directo, igual que el resto de la app (Mis cuentas, Deudas).
 */
function _iconoDestino(d) {
  if (d.tipo === 'cuenta') return bancoAvatar(d.banco, d.icono);

  const marca = resolverMarca(d.nombre);
  if (marca) return tejaMarca(marca);

  // Apartados guardan el ícono como emoji crudo (CAT.2c); Metas, como id de
  // símbolo del sprite salvo entradas viejas pre-CAT.2b (mismo criterio que
  // `_iconoApartado`/`_iconoMeta` en sus propias vistas, no importable acá
  // porque tesoreria no puede importar otro dominio, ADN #10).
  if (d.icono) {
    return /^[a-z]-/.test(d.icono) ? iconoCategoria(d.icono, 'icon icon--sm') : _esc(d.icono);
  }

  return iconoCategoria(_ICONO_GENERICO_DESTINO[d.tipo] ?? 'i-cuentas', 'icon icon--sm');
}

/**
 * Ícono inline de una fila de Necesidades: marca reconocida en el nombre
 * primero (MC.13e-2c, mismo criterio que `_iconoDestino`), si no por
 * categoría, si no un genérico por tipo (calendario para fijos, tarjeta para
 * deudas). Va en línea con el texto de la checklist, por eso icon--sm y no
 * una teja (salvo que gane la marca, que sí trae su propia teja).
 */
function _iconoNecesidad(it) {
  const marca = resolverMarca(it.nombre);
  if (marca) return tejaMarca(marca);

  // CAT.2d: ícono elegido por el usuario para la categoría 'Otra'/'Otro' de
  // una deuda prevalece sobre el fijo del catálogo (mismo campo que ya
  // resuelve el ícono en la lista de Deudas, `compromiso.icono`).
  const porCategoria = it.icono || (it.tipo === 'fijo'
    ? iconoDeCategoriaGasto(it.categoria, S.categoriasPersonalizadas)
    : (CATEGORIA_DEUDA_ICONO[it.categoria] ?? CATEGORIA_DEUDA_PERSONAL_ICONO[it.categoria]));
  return iconoCategoria(porCategoria ?? (it.tipo === 'fijo' ? 'i-agenda' : 'i-deudas'), 'icon icon--sm');
}

/**
 * Una fila de la checklist de Necesidades (Paso 1, MC.7d, ADR 018 revisión
 * 2026-07-02): checkbox + nombre + día de pago + monto. A diferencia de las
 * filas de Ahorro/Deudas/Inversiones, el monto no es editable: es la cuota
 * real de la obligación, no una asignación libre. Si ya se registró un pago
 * este periodo, aparece marcada, deshabilitada y con "Ya pagado" en vez del
 * monto, para que no se pueda volver a registrar (mismo guard que el badge
 * "Ya pagaste este mes" de Agenda).
 *
 * @param {{id:string, nombre:string, categoria:string|null, tipo:'fijo'|'deuda', monto:number, diaPago:number|null, pagado:boolean, nota?:string}} it
 * @returns {string}
 */
function _filaNecesidad(it) {
  const catSub = it.categoria ? ` <span class="distribuir__nec-item-cat">· ${_esc(it.categoria)}</span>` : '';
  const diaSub = it.diaPago ? ` <span class="distribuir__saldo">día ${it.diaPago}</span>` : '';
  const notaSub = it.nota ? ` <span class="distribuir__nota">${_esc(it.nota)}</span>` : '';
  const checkedAttr = it.pagado ? 'checked disabled' : 'checked';

  return `
        <div class="distribuir__fila${it.pagado ? ' distribuir__fila--pagado' : ''}">
          <label class="checkbox-row distribuir__toggle">
            <input type="checkbox" data-nec-toggle data-nec-tipo="${_esc(it.tipo)}"
                   data-nec-id="${_esc(it.id)}" data-nec-monto="${it.monto}" ${checkedAttr} />
            <span>${_iconoNecesidad(it)} ${_esc(it.nombre)}${catSub}${diaSub}${notaSub}</span>
          </label>
          <span class="distribuir__nec-monto">${it.pagado ? 'Ya pagado' : f(it.monto)}</span>
        </div>`;
}

/**
 * Pregunta de MC.13f, compartida por la tarjeta compacta y el asistente: hay un
 * cobro datable anterior a la fecha en que se registró el ingreso, así que
 * Finko no sabe si llegó. En vez de asumir que sí (el falso "ya recibiste" que
 * el descarte por creación evita) o asumir que no (lo que dejaba a quien
 * registra un ingreso a mitad de periodo esperando al cobro siguiente),
 * pregunta y deja que el usuario responda.
 *
 * Responder no es solo un permiso visual: es lo que produce el `periodoISO` que
 * el guard de de-duplicación sella al confirmar la distribución. Por eso el
 * botón confirma una fecha concreta y la lleva en `data-periodo`.
 *
 * @param {string|null} periodoISO Fecha candidata del cobro.
 * @returns {string}
 */
function _preguntaCobroRecibido(periodoISO) {
  // Sin fecha candidata no hay nada que confirmar: se conserva el aviso de
  // espera, que es lo que este estado mostraba antes de MC.13f.
  if (!periodoISO) {
    return `<p class="distribuir__pendiente form-hint form-hint--muted">${icon('saldo', 'icon icon--sm')} Podrás distribuir tu ingreso cuando recibas tu próximo pago.</p>`;
  }

  // Sin clases nuevas: el párrafo y el CTA ya traen su separación
  // (`.distribuir__pendiente` y `.distribuir-card__cta`), así que un envoltorio
  // solo agregaría una clase sin regla. El gancho estable es el `data-action`.
  const fecha = fechaCorta(periodoISO);
  return `
    <p class="distribuir__pendiente form-hint form-hint--muted">
      ${icon('saldo', 'icon icon--sm')} Registraste este ingreso después del ${fecha}, así que no sabemos si ese pago te llegó.
    </p>
    <button type="button" class="btn btn-primary distribuir-card__cta"
            data-action="confirmar-cobro-recibido"
            data-periodo="${_esc(periodoISO)}">
      Sí, recibí el pago del ${fecha}
      ${icon('chevron-right')}
    </button>`;
}

// ── BLOQUE EDUCATIVO Y ACCESOS POR PASO (MC.13e-2g) ──────────────

/**
 * Reparto de referencia del bloque educativo (punto 9): la regla 50/30/20, el
 * punto de partida que la educación financiera usa para explicar un reparto
 * sano. Los porcentajes NO se escriben acá: salen del preset `50-30-20` que ya
 * vive en `PRESETS_DISTRIBUCION`, para que la referencia y el chip del mismo
 * nombre no puedan divergir (el objeto de respaldo solo evita que un cambio de
 * catálogo rompa el módulo al importarlo).
 *
 * Cada entrada trae `que`: lo que convierte la barra en educación y no en
 * adorno es decir qué entra en cada grupo. `clave` es la del split real del
 * usuario, para poner su porcentaje al lado del de referencia.
 */
const _PRESET_REFERENCIA = PRESETS_DISTRIBUCION.find(p => p.id === '50-30-20')
  ?? { n: 50, e: 30, a: 20 };

const _REFERENCIA_EXPERTOS = [
  {
    clave: 'necesidades', tono: 'necesidades', label: 'Necesidades',
    pct: _PRESET_REFERENCIA.n,
    que: 'Arriendo, servicios, transporte y cuotas de deuda.',
  },
  {
    clave: 'estiloVida', tono: 'estilo-vida', label: 'Estilo de vida',
    pct: _PRESET_REFERENCIA.e,
    que: 'Salidas, ropa, suscripciones: lo que sí puedes ajustar.',
  },
  {
    clave: 'ahorro', tono: 'ahorro', label: 'Ahorro',
    pct: _PRESET_REFERENCIA.a,
    que: 'Primero tu fondo de emergencia, después tus metas.',
  },
];

/**
 * Bloque educativo que abre el asistente (MC.13e-2g, punto 9): antes de repartir,
 * cómo reparten los expertos, con barra y porcentajes, y qué entra en cada grupo.
 *
 * **Va delante de la acción, pero no la bloquea.** El punto 9 pide la educación
 * primero; la auditoría de UX del 2026-07-21 pide bajar la fricción del flujo
 * más repetido de la app. Un paso educativo paginado satisfaría al primero y
 * rompería a la segunda (un toque más cada vez que se cobra), así que este
 * bloque es la cabecera del asistente, no un paso: se lee de arriba a abajo y
 * los pasos de reparto siguen abajo, ya prellenados, sin un clic extra.
 *
 * Al lado del porcentaje de referencia va el del usuario, que es donde la
 * comparación enseña: "los expertos 50%, tú 62%". La barra es decorativa
 * (`aria-hidden`): la lista de abajo da la misma información en texto (SC
 * 1.4.11, mismo trato que la barra de la tarjeta de entrada).
 *
 * @param {{necesidades:{pct:number}, estiloVida:{pct:number}, ahorro:{pct:number}}} split
 * @param {string} razon Por qué el reparto del usuario quedó así (`sugerirDistribucionIngreso`).
 * @returns {string}
 */
function _renderBloqueEducativo(split, razon) {
  const filas = _REFERENCIA_EXPERTOS.map(r => `
        <li class="distribuir-edu__item">
          <p class="distribuir-edu__fila">
            <span class="distribuir-edu__dot dist-color-${r.tono}" aria-hidden="true"></span>
            <span class="distribuir-edu__label">${r.label}</span>
            <span class="distribuir-edu__ref">${r.pct}%</span>
            <span class="distribuir-edu__tuyo">tú ${split[r.clave].pct}%</span>
          </p>
          <p class="distribuir-edu__que">${r.que}</p>
        </li>`).join('');

  return `
    <section class="distribuir-edu" aria-labelledby="distribuir-edu-titulo">
      <h3 id="distribuir-edu-titulo" class="distribuir-edu__titulo">
        ${icon('lightbulb', 'icon icon--sm')} Así reparten los expertos
      </h3>
      <div class="distribuir-edu__barra" aria-hidden="true">
        ${_REFERENCIA_EXPERTOS.map(r => `<div class="distribuir-edu__seg dist-color-${r.tono}"></div>`).join('')}
      </div>
      <ul class="distribuir-edu__lista">${filas}</ul>
      <p class="distribuir-edu__razon">${_esc(razon)}</p>
    </section>`;
}

/**
 * Paso al que pertenece cada acceso cruzado (punto 10): cada recomendación
 * aparece solo en el paso de su categoría, nunca todas juntas al abrir.
 * Las deudas se pagan en el checklist de Necesidades, el fondo y las
 * inversiones se fondean en el paso de asignaciones, y Límites de gasto vigila
 * el Estilo de vida.
 */
const _PASO_DE_CTA = {
  compromisos: 'necesidades',
  ahorro:      'asignaciones',
  inversion:   'asignaciones',
  presupuesto: 'estiloVida',
};

/**
 * Accesos cruzados de un paso (punto 10). Un acceso cuyo paso no existe en este
 * asistente **se descarta**, no se reubica: mostrar "Ver estrategia de deudas"
 * en el paso de Estilo de vida sería justo lo que el punto 10 prohíbe, y la
 * sección sigue a un toque desde la navegación. El paso de Estilo de vida
 * siempre existe, así que el acceso a Límites de gasto (siempre presente,
 * MC.5e) nunca se pierde.
 *
 * `ir-a-seccion` es la acción built-in del shell para enlazar fuera desde un
 * modal: cierra el asistente y navega (sin ella, `dispatch` cancelaría la
 * navegación del `<a>` y el modal quedaría abierto encima de la sección nueva).
 *
 * @param {{label:string, seccion:string}[]} ctas
 * @param {'necesidades'|'asignaciones'|'estiloVida'} paso
 * @returns {string}
 */
function _ctasDelPaso(ctas, paso) {
  const propios = (ctas ?? []).filter(c => _PASO_DE_CTA[c.seccion] === paso);
  if (propios.length === 0) return '';

  return `
          <div class="distribuir__ctas">
            ${propios.map(c => `
            <a href="#${_esc(c.seccion)}" class="btn btn-ghost btn-sm distribuir__cta"
               data-action="ir-a-seccion">
              ${_esc(c.label)} ${icon('chevron-right', 'icon icon--sm')}
            </a>`).join('')}
          </div>`;
}

/**
 * Asistente por pasos (ADR 012, MC.4a/b/d/e; ADR 018, MC.7d: shell paginado
 * con confirmación única al final; MC.7e: Paso 3 accionable con 2+ cuentas).
 * Desde ADR 035 D6 vive dentro de `#modal-distribuir-body`, inyectado por
 * `renderAsistenteDistribucion()` cada vez que se abre el modal (ya no es un
 * panel inline con su propio botón de apertura: eso lo resuelve ahora la
 * tarjeta de entrada, `_renderTarjetaDistribuir`). Solo se crean los pasos
 * con contenido:
 *
 *   1. Necesidades (R1): checklist accionable; cada marca registra al confirmar
 *      el mismo pago que su flujo individual.
 *   2. Ahorro, deudas e inversiones: filas editables con la sugerencia de
 *      ahorro calculada sobre el remanente real tras las Necesidades marcadas
 *      (R3); abonos extra a deudas por prioridad de pago y aportes a inversiones.
 *   3. Estilo de vida: lo que queda disponible en la cuenta. Con una sola
 *      cuenta activa el monto es puramente informativo (regla de cuenta única);
 *      con 2+ cuentas (MC.7e) suma un reparto opcional: transferencias internas
 *      hacia otras cuentas, sin tocar el total del remanente. Desde MC.13e-2f-2
 *      cierra con la decisión explícita del remanente (punto 18): qué se hace
 *      con lo que quedó sin asignar, sin preselección, obligatoria antes de
 *      confirmar. La confirmación única aplica todo al final.
 *
 * El monto a distribuir, el indicador de paso, el resumen en vivo y el bloque de
 * déficit (MC.13e-2e) quedan fuera de la paginación (visibles en todos los
 * pasos): lo marcado en el Paso 1 puede exceder el monto recién en el Paso 2,
 * así que la oferta de completar con otra cuenta tiene que verse desde donde se
 * produzca. Su contenido lo escribe `acciones/distribucion.js` en vivo (solo
 * texto y `hidden`, mismo trato que `#distribuir-cuentas-resumen`). La navegación avanzar/atrás,
 * el recálculo y el botón "Distribuir" se manejan desde acciones/distribucion.js. Devuelve ''
 * si no hay ningún destino fondeable, Necesidad que marcar, ni cuenta a la que
 * repartir Estilo de vida (MC.7e: con 2+ cuentas el reparto es accionable
 * aunque no haya Necesidades/Ahorro/Deudas/Inversiones que mostrar).
 *
 * Guard defensivo por fecha (MC.4d): en el flujo normal la tarjeta de entrada
 * ya solo ofrece el botón que abre este asistente cuando el estado es 'listo'
 * o 'sin-fecha' (ver `_renderTarjetaDistribuir`); este chequeo se conserva
 * aquí para los callers externos que abren el asistente sin pasar por ese
 * botón (recordatorio de Calendario ADR 021, oferta tras ingreso puntual
 * NAV.A2b s2). **En 'por-confirmar' ese guard ya no es un callejón sin salida**
 * (MC.13f): el CTA "Distribuir" del detalle del día de Calendario abre acá, y
 * antes se encontraba un asistente que no dejaba avanzar; ahora encuentra la
 * pregunta que lo desbloquea sin que Calendario tenga que saber nada de esto.
 *
 * Desde MC.13e-2g (punto 10) cada paso cierra con los accesos cruzados de su
 * categoría (`_ctasDelPaso`), en vez de mostrarlos todos juntos antes de
 * empezar.
 *
 * @param {{montoIngreso:number, ahorroPct:number, estiloVidaPct:number, ahorroBudget:number, evBudget:number, destinosAhorro:Array, destinosInversiones:Array, destinosCuentas?:Array, itemsNecesidades?:Array, ctas?:Array<{label:string, seccion:string}>, estado:{estado:string, periodoISO:string|null, esHoy:boolean}}} d
 * @returns {string}
 */
function _renderPanelDistribuir(d) {
  const { montoIngreso, ahorroPct, estiloVidaPct, ahorroBudget, evBudget } = d;
  const necesidades = d.itemsNecesidades ?? [];
  const ahorro      = d.destinosAhorro ?? [];
  const inversiones = d.destinosInversiones ?? [];
  const cuentas     = d.destinosCuentas ?? [];
  if (necesidades.length === 0 && ahorro.length === 0 && inversiones.length === 0 && cuentas.length === 0) return '';

  const est = d.estado?.estado ?? 'sin-fecha';

  // Ya distribuido este periodo: confirmación, sin pasos que mostrar (guard MC.4d).
  if (est === 'distribuido') {
    return `<p class="distribuir__hecho" role="status">✓ Ya distribuiste tu ingreso de este periodo.</p>`;
  }
  // Hay un cobro anterior a la creación del ingreso: Finko no puede afirmar que
  // llegó, así que pregunta en vez de bloquear (MC.13f).
  if (est === 'por-confirmar') {
    return _preguntaCobroRecibido(d.estado?.periodoISO ?? null);
  }

  // Paso 1 (R1): checklist de Necesidades, marcadas por defecto salvo las ya
  // pagadas este periodo (checkbox deshabilitado, "Ya pagado"). Al confirmar,
  // cada marca registra el mismo pago que su flujo individual (ver acciones/distribucion.js).
  const seccionNecesidades = `
          <p class="form-hint distribuir__subtitulo">📦 Necesidades · marca las que cubres con este ingreso:</p>
          <div class="distribuir-ingreso__destinos">
            ${necesidades.map(_filaNecesidad).join('')}
          </div>
          ${_ctasDelPaso(d.ctas, 'necesidades')}`;

  // Paso 2: título consistente con el resto de pasos (MC.7f), y la sugerencia
  // de ahorro sale del remanente real (R3); acciones/distribucion.js la actualiza en vivo
  // (span data-dist-sugerencia-ahorro) al cambiar las marcas. El hint de
  // sugerencia solo tiene sentido si hay al menos una fila de Ahorro donde
  // ponerla (fondo, meta o apartado): sin ninguna, mostrarlo sería un estado
  // vacío confuso ("sugerencia: $X a ahorro" sin ningún destino de ahorro
  // debajo, MC.7f).
  const tituloAsignaciones = `<p class="form-hint distribuir__subtitulo">💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:</p>`;
  const seccionAhorro = ahorro.length > 0
    ? `
          <p class="form-hint">Sugerencia: <span data-dist-sugerencia-ahorro>${f(ahorroBudget)}</span> a ahorro${necesidades.length > 0 ? ', calculada sobre lo que queda tras tus Necesidades marcadas' : ''}.</p>
          <div class="distribuir-ingreso__destinos">${ahorro.map(_filaDistribuir).join('')}</div>`
    : '';
  const seccionInversiones = inversiones.length > 0
    ? `
          <p class="form-hint distribuir__subtitulo">Aportar a inversiones:</p>
          <div class="distribuir-ingreso__destinos">
            ${inversiones.map(_filaDistribuir).join('')}
          </div>`
    : '';
  const seccionAsignaciones = `
          ${tituloAsignaciones}
          ${seccionAhorro}
          ${seccionInversiones}
          ${_ctasDelPaso(d.ctas, 'asignaciones')}`;

  // Paso final (MC.4c): Estilo de vida no se mueve entre gastos/ahorro/deudas en
  // este panel (se gasta a lo largo del mes). acciones/distribucion.js recalcula su monto en
  // vivo sobre el remanente (R3). Con 2+ cuentas activas (MC.7e, ADR 018
  // decisión 4), el usuario puede repartir ese remanente entre sus cuentas:
  // transferencias internas, no gasto. Con una sola cuenta se omite (regla de
  // cuenta única): todo el remanente queda donde ya está.
  const seccionCuentas = cuentas.length > 0
    ? `
          <p class="form-hint distribuir__subtitulo">¿Quieres mover parte a otras cuentas?</p>
          <div class="distribuir-ingreso__destinos">
            ${cuentas.map(_filaDistribuir).join('')}
          </div>
          <p id="distribuir-cuentas-resumen" class="form-hint form-hint--muted" role="status"></p>`
    : '';

  // Decisión explícita del remanente (MC.13e-2f-2, punto 18 del brief): lo que
  // queda sin asignar deja de ser puramente informativo y hay que decir qué se
  // hace con ello antes de confirmar. Sin preselección a propósito: una opción
  // marcada de entrada es la respuesta de Finko, no la del usuario, y el punto
  // 18 pide justo lo contrario.
  //
  // Las opciones se arman con los destinos que el Paso 2 ya tiene: mandarlo a
  // ahorro o a una meta no abre una ruta de apply nueva, prellena la fila que
  // registra ese aporte desde siempre (ver `_elegirDestinoRemanente` en
  // acciones/distribucion.js). Sin fila de ahorro ni de meta donde ponerlo, la
  // única respuesta posible sería "dejarlo": una pregunta de una sola respuesta
  // es fricción, no decisión, así que el bloque no se renderiza y el asistente
  // confirma como antes.
  const hayAhorro = ahorro.some(d => d.tipo === 'fondo' || d.tipo === 'apartado');
  const hayMeta   = ahorro.some(d => d.tipo === 'meta');
  const opcionesRemanente = [
    { valor: 'cuenta', texto: 'Dejarlo en mi cuenta para mis gastos del día a día' },
    ...(hayAhorro ? [{ valor: 'ahorro', texto: 'Mandarlo a mi ahorro' }] : []),
    ...(hayMeta   ? [{ valor: 'meta',   texto: 'Mandarlo a una meta' }] : []),
  ];
  const seccionRemanente = opcionesRemanente.length > 1
    ? `
          <div id="distribuir-remanente" class="distribuir__remanente" hidden>
            <p class="form-hint distribuir__subtitulo">¿Qué haces con los <span data-dist-remanente-monto>${f(0)}</span> que quedan sin asignar?</p>
            <div role="radiogroup" aria-label="Qué hacer con lo que queda sin asignar">
              ${opcionesRemanente.map(o => `
              <label class="checkbox-row">
                <input type="radio" name="distribuir-remanente" value="${o.valor}" data-dist-remanente />
                <span>${o.texto}</span>
              </label>`).join('')}
            </div>
          </div>`
    : '';

  const seccionInfo = `
          <p class="form-hint distribuir__subtitulo">Esto queda en tu cuenta (no se mueve):</p>
          <div class="distribuir__info">
            <p class="distribuir__info-fila">
              <span>🎯 Estilo de vida</span>
              <span data-dist-info="estiloVida">${f(evBudget)}</span>
            </p>
          </div>
          ${seccionCuentas}
          ${seccionRemanente}
          ${_ctasDelPaso(d.ctas, 'estiloVida')}
          <p class="form-hint form-hint--muted">Revisa el resumen y confirma: se registrarán los pagos y aportes que marcaste.</p>`;

  // Shell paginado (MC.7d): un paso visible a la vez, avanzar/atrás inline.
  const pasos = [];
  if (necesidades.length > 0) pasos.push({ titulo: 'Necesidades', html: seccionNecesidades });
  if (ahorro.length > 0 || inversiones.length > 0) {
    pasos.push({ titulo: 'Ahorro, deudas e inversiones', html: seccionAsignaciones });
  }
  pasos.push({ titulo: 'Estilo de vida', html: seccionInfo });

  // `tabindex="-1"` (MC.7f, a11y): cada paso es un destino de foco programático
  // (no forma parte del tab order normal). Al avanzar/retroceder, acciones/distribucion.js
  // enfoca el paso recién mostrado; su `aria-label` ya dice "Paso X de N: <título>",
  // así que el foco por sí solo anuncia el cambio a lectores de pantalla, sin
  // depender de que el usuario llegue justo al indicador con `role="status"`.
  const pasosHtml = pasos.map((p, i) => `
          <div class="distribuir__paso" data-dist-paso="${i}" data-dist-paso-titulo="${p.titulo}"
               role="group" aria-label="Paso ${i + 1} de ${pasos.length}: ${p.titulo}" tabindex="-1"${i > 0 ? ' hidden' : ''}>
            ${p.html}
          </div>`).join('');

  const esUnicoPaso = pasos.length === 1;
  // El indicador "Paso X de N" solo aporta con 2+ pasos: con uno solo no hay
  // progresión que comunicar (MC.7f, estado vacío más limpio).
  const indicadorPaso = esUnicoPaso ? '' : `
          <p class="form-hint distribuir__paso-indicador" data-dist-paso-indicador role="status">Paso 1 de ${pasos.length}: ${pasos[0].titulo}</p>`;
  return `
        <fieldset id="distribuir-ingreso-panel" class="distribuir-ingreso"
                  data-ahorro-pct="${ahorroPct}" data-estilo-vida-pct="${estiloVidaPct}">
          <legend>Reparte tu ingreso entre tus necesidades, ahorro, deudas e inversiones. Lo que no distribuyas queda disponible en tu cuenta.</legend>
          <div class="form-group">
            <label for="distribuir-monto" class="label">Monto a distribuir (COP)</label>
            <input id="distribuir-monto" type="number" class="input"
                   min="0" step="10000" inputmode="numeric" value="${montoIngreso}"
                   data-action="recalcular-distribucion" />
          </div>
          ${indicadorPaso}
          ${pasosHtml}
          <p id="distribuir-resumen" class="form-hint" role="status"></p>
          <div id="distribuir-deficit" class="distribuir__deficit" hidden>
            <p id="distribuir-deficit-msg" class="form-hint" role="status"></p>
            <label id="distribuir-deficit-opcion" class="checkbox-row" hidden>
              <input type="checkbox" data-dist-completar-deficit />
              <span>Completar con el saldo de mis otras cuentas</span>
            </label>
            <p id="distribuir-deficit-detalle" class="form-hint form-hint--muted"></p>
          </div>
          <div class="distribuir__nav">
            <button type="button" class="btn btn-ghost btn-sm distribuir__nav-atras"
                    data-action="distribuir-paso-atras" hidden>
              ${icon('chevron-right', 'icon icon--sm distribuir__nav-icon--atras')} Atrás
            </button>
            <button type="button" class="btn btn-primary btn-sm"
                    data-action="distribuir-paso-siguiente"${esUnicoPaso ? ' hidden' : ''}>
              Siguiente ${icon('chevron-right', 'icon icon--sm')}
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-action="confirmar-distribucion"${esUnicoPaso ? '' : ' hidden'}>
              ${icon('check-circle', 'icon icon--sm')} Distribuir
            </button>
          </div>
        </fieldset>`;
}

/**
 * Tarjeta de entrada compacta en `#ingresos-distribucion` (ADR 035 D6): "¿Cómo
 * distribuir $X?" con barra 50/30/20 + leyenda (Necesidades / Estilo de vida /
 * Ahorro). Reemplaza al bloque completo que antes vivía siempre desplegado
 * (chips de preset, desglose fila por fila, editor personalizado y el
 * asistente por pasos): ese contenido se mudó dentro de
 * `#modal-distribuir-body` (`_renderContenidoAsistente`), que el botón de esta
 * tarjeta lanza vía `abrirAsistenteDistribucion()`. Los colores de la
 * barra/leyenda reutilizan tokens de dominio ya existentes que casualmente
 * coinciden con la paleta aprobada del handoff: Necesidades = tesorería
 * (azul), Estilo de vida = presupuesto (ámbar), Ahorro = ahorro (verde menta).
 *
 * MC.13e-2a (punto 12 del brief): el aviso "recibiste tu ingreso" es un
 * bloque aparte (`avisoHtml`), antes de la tarjeta, en vez de vivir mezclado
 * en el subtítulo; la tarjeta en sí siempre abre con la misma invitación
 * genérica, tenga o no un cobro reciente que anunciar.
 *
 * MC.13e-2a (punto 11 del brief): los accesos cruzados (`dist.ctas`: "Ver
 * progreso del fondo", "Ver estrategia de deudas", "Ver tu seguimiento en
 * Límites de gasto"...) dejan de renderizarse aquí. `sugerirDistribucionIngreso()`
 * los sigue calculando (lógica intacta, sus tests no cambian): MC.13e-2g los
 * reintroduce, pero contextuales a su paso correspondiente (punto 10), no
 * todos juntos antes de abrir el asistente.
 *
 * @param {ReturnType<typeof _construirDatosDistribucion>} datos
 * @returns {string}
 */
function _renderTarjetaDistribuir({ dist, estado, hayDestinos, distribuir }) {
  const { split, alertas } = dist;
  const { necesidades, estiloVida, ahorro } = split;
  // Monto de ESTE cobro (BUG-2), el mismo que arranca el asistente: la tarjeta
  // y el asistente comparten nombre y botón, no pueden mostrar cifras distintas.
  // Los % del split no cambian con la frecuencia; solo la base sobre la que se
  // leen (un quincenal reparte una quincena, no el mes). Cae al mensual si por
  // algún motivo no llega `distribuir` (mismo valor para un asalariado mensual).
  const montoCobro = distribuir?.montoIngreso ?? dist.ingresoMensual;
  const est = estado?.estado ?? 'sin-fecha';

  // MC-DIS.9 C10 (regla R24): sin `role="status"`. El aviso es informativo y
  // estable, no la respuesta a una acción, y la tarjeta se repinta en cada
  // `state:change` de la sección.
  const avisoHtml = est === 'listo'
    ? `<p class="distribuir-aviso">${estado.esHoy ? 'Hoy recibes tu ingreso.' : `Recibiste tu ingreso el ${fechaCorta(estado.periodoISO)}.`}</p>`
    : '';

  // MC-DIS.9 C6: ✓ y 💸 pasan a i-check-circle e i-saldo del sprite (el emoji
  // se dibuja distinto en cada sistema operativo y no hereda el color del
  // texto). El `role="status"` del pie sí se conserva: cambia al distribuir.
  const pie = est === 'distribuido'
    ? `<p class="distribuir__hecho" role="status">${icon('check-circle', 'icon icon--sm')} Ya distribuiste tu ingreso de este periodo.</p>`
    : est === 'por-confirmar'
      ? _preguntaCobroRecibido(estado?.periodoISO ?? null)
      : hayDestinos
        ? `<button type="button" class="btn btn-primary distribuir-card__cta" data-action="toggle-distribuir-ingreso">
            Distribuir mi ingreso
            ${icon('chevron-right')}
          </button>`
        : '';

  // MC-DIS.9 C6: ⚠ pasa a i-alert. `.distribucion-alerta` ya es flex con gap,
  // así que el ícono se alinea sin CSS nuevo.
  const alertasHtml = alertas.map(a =>
    `<p class="distribucion-alerta">${icon('alert', 'icon icon--sm')}<span>${_esc(a)}</span></p>`
  ).join('');

  const filaLeyenda = (tono, s) => `
      <div class="distribuir-card__item">
        <span class="distribuir-card__dot dist-color-${tono}" aria-hidden="true"></span>
        <span class="distribuir-card__label">${_esc(s.label)}</span>
        <span class="distribuir-card__pct">${s.pct}%</span>
        <span class="distribuir-card__monto">${f(Math.round(montoCobro * s.pct / 100))}</span>
      </div>`;

  return `
    <div class="section__sub-header"><h2 class="section__subtitle">Distribuir mi ingreso</h2></div>
    ${avisoHtml}
    <div class="distribuir-card">
      <div class="distribuir-card__top">
        <span class="distribuir-card__icon" aria-hidden="true">${icon('lightbulb')}</span>
        <div class="distribuir-card__body">
          <p class="distribuir-card__title">¿Cómo distribuir ${f(montoCobro)}?</p>
          <p class="distribuir-card__sub">Reparte tu ingreso entre necesidades, estilo de vida y ahorro.</p>
        </div>
      </div>
      <div class="distribuir-card__barra" aria-hidden="true">
        <div class="distribuir-card__seg dist-color-necesidades"></div>
        <div class="distribuir-card__seg dist-color-estilo-vida"></div>
        <div class="distribuir-card__seg dist-color-ahorro"></div>
      </div>
      <div class="distribuir-card__leyenda">
        ${filaLeyenda('necesidades', necesidades)}
        ${filaLeyenda('estilo-vida', estiloVida)}
        ${filaLeyenda('ahorro', ahorro)}
      </div>
      ${alertasHtml}
      ${pie}
    </div>`;
}

/**
 * Contenido de `#modal-distribuir-body` (ADR 035 D6), en dos bloques desde
 * MC.13e-2g (punto 9):
 *
 *   1. **Educación** (`_renderBloqueEducativo`): cómo reparten los expertos, con
 *      barra y porcentajes, el porcentaje del usuario al lado y la razón detrás
 *      de su cálculo; enseguida cómo elegir el método (chips de preset, métodos
 *      clásicos, editor personalizado).
 *   2. **Reparto** (`_renderPanelDistribuir`): el flujo por pasos de siempre,
 *      ya prellenado.
 *
 * Son dos bloques del mismo scroll, no dos pasos paginados: ver
 * `_renderBloqueEducativo` para por qué la educación va delante sin cobrar un
 * clic extra.
 *
 * @param {ReturnType<typeof sugerirDistribucionIngreso>} dist
 * @param {string} presetActivo
 * @param {{n:number, e:number, a:number}|null} distribucionPersonalizada
 * @param {{montoIngreso:number, ahorroPct:number, estiloVidaPct:number, ahorroBudget:number, evBudget:number, destinosAhorro:Array}} distribuir
 */
function _renderContenidoAsistente({ razon, split }, presetActivo, distribucionPersonalizada, distribuir) {
  const { necesidades, estiloVida, ahorro } = split;

  const autoActivo = presetActivo === 'auto';
  const autoChip = `
      <button type="button"
              class="chip${autoActivo ? ' chip--active' : ''}"
              data-action="cambiar-preset-distribucion"
              data-preset="auto"
              aria-pressed="${autoActivo}">
        Automático
      </button>`;

  const clasicosActivo = ['50-30-20', '70-20-10', '60-20-20'].includes(presetActivo);
  const clasicosChips = PRESETS_DISTRIBUCION
    .filter(p => p.id !== 'auto')
    .map(p => {
      const activo = p.id === presetActivo;
      return `
        <button type="button"
                class="chip${activo ? ' chip--active' : ''}"
                data-action="cambiar-preset-distribucion"
                data-preset="${_esc(p.id)}"
                aria-pressed="${activo}">
          ${_esc(p.label)}
        </button>`;
    }).join('');

  const personalizadaValida = esDistribucionPersonalizadaValida(distribucionPersonalizada);
  const personalizadaActiva = presetActivo === 'personalizado' && personalizadaValida;
  const personalizadaLabel  = personalizadaValida
    ? `${distribucionPersonalizada.n}/${distribucionPersonalizada.e}/${distribucionPersonalizada.a}`
    : 'Personalizar';

  const personalizadaChip = `
      <button type="button"
              class="chip${personalizadaActiva ? ' chip--active' : ''}"
              data-action="toggle-distribucion-personalizada"
              aria-expanded="false"
              aria-controls="distribucion-personalizada-fieldset">
        ✎ ${_esc(personalizadaLabel)}
      </button>`;

  // Punto de partida del editor: lo ya guardado si existe; si no, el split
  // activo (siempre suma 100), para ajustar en vez de partir de cero.
  const prefillN = personalizadaValida ? distribucionPersonalizada.n : necesidades.pct;
  const prefillE = personalizadaValida ? distribucionPersonalizada.e : estiloVida.pct;
  const prefillA = personalizadaValida ? distribucionPersonalizada.a : ahorro.pct;

  const editorPersonalizada = `
    <fieldset id="distribucion-personalizada-fieldset" class="distribucion-personalizada" hidden>
      <legend>Crea tu distribución: los 3 porcentajes deben sumar 100%.</legend>
      <div class="distribucion-personalizada__inputs">
        <div class="form-group">
          <label for="dist-pct-n" class="label">📦 Necesidades</label>
          <input id="dist-pct-n" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillN}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="n" />
        </div>
        <div class="form-group">
          <label for="dist-pct-e" class="label">🎯 Estilo de vida</label>
          <input id="dist-pct-e" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillE}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="e" />
        </div>
        <div class="form-group">
          <label for="dist-pct-a" class="label">💰 Ahorro</label>
          <input id="dist-pct-a" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillA}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="a" />
        </div>
      </div>
      <p id="distribucion-personalizada-msg" class="form-hint" role="status"></p>
      <button type="button" class="btn btn-primary btn-sm" data-action="guardar-distribucion-personalizada">
        Guardar mi distribución
      </button>
    </fieldset>`;

  return `
    ${_renderBloqueEducativo(split, razon)}
    <div class="filtros-bar" role="group" aria-label="Preset de distribución">
      ${autoChip}
      ${personalizadaChip}
    </div>
    <details class="distribucion-clasicos"${clasicosActivo ? ' open' : ''}>
      <summary class="distribucion-clasicos__toggle">Métodos clásicos</summary>
      <div class="filtros-bar" role="group" aria-label="Métodos clásicos de distribución">
        ${clasicosChips}
      </div>
      <p class="form-hint form-hint--muted">Porcentajes fijos. No consideran tus gastos reales.</p>
    </details>
    ${editorPersonalizada}
    ${_renderPanelDistribuir(distribuir)}`;
}
