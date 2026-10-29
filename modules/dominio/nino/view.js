/**
 * nino/view.js - lo que ve el niño (APR.3c y APR.3d, ADR 093 D9). Solo HTML.
 *
 * Cuatro pantallas con su barra: Inicio, Aprender, Alcancía y Yo, más la de
 * crear una meta y la hoja para anotar lo que guardó, gastó o compartió.
 * Voz del niño (D6): frases de máximo 10 palabras y cifras redondas. Cada
 * texto lleva su ícono al lado y ningún color va solo (R49).
 */

import { f, esc, formateadorFecha } from '../../infra/utils.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import { htmlTino, htmlDibujo, dibujoPorId, htmlFrasco, DIBUJOS } from '../../infra/ilustraciones.js';
import { saldosFrascos, FRASCOS } from '../../infra/perfiles.js';
import { UNIDADES_NINO } from '../../infra/ruta-aprende.js';
import { proximaMesada, textoFrecuencia, TASAS_PREMIO, proximoPremio } from '../../infra/mesada.js';
import {
  estadoRutaNino, siguienteLeccionNino, unidadesHechasNino, ofreceUbicacionNino, sinEmpezarNino,
  metaActiva, planMeta, llenadoFrasco, puedeMover,
} from './logic.js';

/** Desde los 10 años, antes de empezar: tres preguntas para saber dónde empieza. */
function _ofertaUbicacion() {
  return `
    <section class="kcard kcard--dom" data-dom="ahorro" aria-labelledby="nino-ubicacion">
      <h2 class="k-h3" id="nino-ubicacion">Antes de empezar, tres preguntas</h2>
      <p class="k-body">Así sabemos en qué unidad empiezas.</p>
      <button class="kbtn kbtn--block" type="button" data-action="ubicacion-abrir">${icon('lightbulb')}Responder</button>
    </section>`;
}

/** Barra de cuatro destinos (D9). */
const _BARRA = [
  { vista: 'inicio', texto: 'Inicio', icono: 'i-home' },
  { vista: 'aprender', texto: 'Aprender', icono: 'c-birrete' },
  { vista: 'alcancia', texto: 'Alcancía', icono: 'i-ahorro' },
  { vista: 'yo', texto: 'Yo', icono: 'i-star' },
];

/** Nombre e ícono de cada frasco (R49: nunca solo el color). */
export const FRASCO_INFO = {
  ahorrar: { nombre: 'Ahorrar', icono: 'i-ahorro' },
  gastar: { nombre: 'Gastar', icono: 'c-tienda' },
  compartir: { nombre: 'Compartir', icono: 'c-regalo' },
};

/** "19 de diciembre": la fecha de una meta, en palabras. */
const _DIA_MES = (iso) => formateadorFecha('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  .format(new Date(`${iso}T12:00:00Z`));

/**
 * La barra del niño. En tableta y escritorio es un riel a la izquierda con
 * su dibujo arriba y "Cambiar" al pie (APR.4b, diseño 34); en el teléfono
 * esas dos piezas no se ven, porque Inicio y Yo ya las tienen.
 *
 * @param {string} vista
 * @param {import('../../infra/perfiles.js').PerfilNino | null} [perfil]
 */
export function htmlBarraNino(vista, perfil = null) {
  const activa = vista === 'meta' ? 'alcancia' : vista;
  const destinos = _BARRA.map(b => `
    <button class="knav__it" type="button" data-action="nino-vista" data-vista="${b.vista}"${b.vista === activa ? ' aria-current="page"' : ''}>
      ${iconoCategoria(b.icono)}<span>${b.texto}</span>
    </button>`).join('');
  if (!perfil) return destinos;
  return `
    <span class="knav__yo" aria-hidden="true">${_avatar(perfil, 42)}</span>
    ${destinos}
    <button class="knav__it knav__it--cambiar" type="button" data-action="perfil-cambiar"
            aria-label="Cambiar de perfil">${icon('transferencia')}<span>Cambiar</span></button>`;
}

/** El dibujo del niño en su teja, del color de su dibujo. */
function _avatar(perfil, tamano = 38) {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav kidav--nino" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

const _botonCambiar = `
  <button class="knino-cambiar" type="button" data-action="perfil-cambiar" aria-label="Cambiar de perfil">${icon('transferencia')}</button>`;

/** "Unas 4 semanas", "Una semana" o "Ya lo tienes". */
function _semanas(n) {
  if (n === 0) return 'Ya lo tienes.';
  if (!Number.isFinite(n)) return 'Elige cuánto guardas cada semana.';
  return n === 1 ? 'Una semana más.' : `Unas ${n} semanas.`;
}

/**
 * La meta con su barra: lo que tiene en Ahorrar contra el precio (R60).
 * Lograda, ofrece "Lo compré".
 */
export function htmlTarjetaMeta(perfil, hoyISO) {
  const meta = metaActiva(perfil);
  if (!meta) {
    return `
      <button class="kcard knino-meta knino-meta--nueva" type="button" data-action="nino-vista" data-vista="meta">
        <span class="knino-teja" data-frasco="ahorrar">${iconoCategoria('i-metas')}</span>
        <span class="knino-pila"><span class="k-h3">Crear una meta</span><span class="k-sm">¿Para qué quieres ahorrar?</span></span>
        ${icon('chevron-right')}
      </button>`;
  }
  const ahorrado = saldosFrascos(perfil).ahorrar;
  const plan = planMeta({ precio: meta.precio, semanal: meta.semanal, ahorrado, hoyISO });
  const pct = Math.round(plan.proporcion * 100);
  const d = dibujoPorId(meta.dibujo);
  const pie = plan.falta === 0
    ? `<p class="k-sm knino-meta__lista">¡Ya tienes para tu ${esc(meta.nombre)}!</p>
       <div class="knino-meta__acciones">
         <button class="kbtn kbtn--block" type="button" data-action="nino-meta-compre">${icon('check')}Lo compré</button>
       </div>`
    : `<p class="k-sm">Te faltan ${f(plan.falta)}. ${_semanas(plan.semanas)}</p>`;
  return `
    <section class="kcard knino-meta" aria-labelledby="nino-meta-titulo">
      <div class="knino-fila">
        <span class="kidav kidav--nino" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(meta.dibujo, { tamano: 44 })}</span>
        <div class="knino-pila">
          <h2 class="k-h3" id="nino-meta-titulo">Mi ${esc(meta.nombre)} · ${f(meta.precio)}</h2>
          <div class="kprog" data-frasco="ahorrar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
               aria-label="${esc(meta.nombre)}: ${f(meta.precio - plan.falta)} de ${f(meta.precio)}"><span style="width:${pct}%"></span></div>
          ${pie}
        </div>
      </div>
      <button class="knino-quitar" type="button" data-action="nino-meta-quitar">Quitar esta meta</button>
    </section>`;
}

/** Los tres frascos, cada uno lleno contra lo suyo (R60). */
function _frascos(perfil) {
  const s = saldosFrascos(perfil);
  return `
    <ul class="jars">${FRASCOS.map(fr => `
      <li class="jar" data-frasco="${fr}">
        ${htmlFrasco(fr, llenadoFrasco(fr, perfil), { etiqueta: `Frasco ${FRASCO_INFO[fr].nombre}: ${f(s[fr])}` })}
        <p class="jar__nombre">${iconoCategoria(FRASCO_INFO[fr].icono)}${FRASCO_INFO[fr].nombre}</p>
        <p class="jar__monto">${f(s[fr])}</p>
      </li>`).join('')}
    </ul>`;
}

/** El título de la unidad con su número, para la ruta y el Inicio. */
function _chipUnidad(unidad, numeroLeccion) {
  return `<span class="kchip kchip--dom">Unidad ${unidad.numero} · lección ${numeroLeccion}</span>`;
}

/**
 * Inicio: el saludo de Tino, la lección que sigue, la alcancía y la meta (D9).
 * Mientras el niño no empieza la ruta, Tino se presenta (ADR 094 D1).
 * Va en dos grupos: en escritorio son dos columnas (APR.4b), lo que sigue a
 * la izquierda y la alcancía, con sus tres frascos, a la derecha.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {string} hoyISO
 */
export function htmlInicioNino(perfil, hoyISO) {
  const sig = siguienteLeccionNino(perfil.aprende);
  const leccion = sig ? `
    <section class="kcard kcard--dom" data-dom="${sig.unidad.dominio}" aria-labelledby="nino-siguiente">
      <div class="knino-fila">
        <span class="knino-teja">${iconoCategoria(sig.unidad.icono)}</span>
        <div class="knino-pila">
          ${_chipUnidad(sig.unidad, sig.numero)}
          <h2 class="k-h3" id="nino-siguiente">${esc(sig.leccion.titulo)}</h2>
        </div>
      </div>
      <button class="kbtn kbtn--block" type="button" data-action="leccion-abrir" data-id="${esc(sig.leccion.id)}">${iconoCategoria('c-birrete')}Empezar</button>
    </section>` : `
    <section class="kcard" aria-labelledby="nino-siguiente">
      <h2 class="k-h3" id="nino-siguiente">Hiciste todo lo que hay por ahora.</h2>
      <p class="k-body">Pronto llegan más lecciones.</p>
    </section>`;
  const ubicar = ofreceUbicacionNino(perfil);
  const saludo = ubicar ? 'Primero, tres preguntas cortas.'
    : sig ? `¿Aprendemos algo hoy? Son ${sig.leccion.minutos} minutos.` : '¡Qué bien vas! Repasa cuando quieras.';
  const presentacion = sinEmpezarNino(perfil.aprende) ? 'Soy Tino, un guatín. ' : '';
  const primero = ubicar ? _ofertaUbicacion() : leccion;
  const s = saldosFrascos(perfil);
  return `
    <div class="nino-inicio">
      <div class="nino-inicio__grupo">
        <header class="knino-cabeza">
          ${_avatar(perfil)}
          <h1 class="k-h1 knino-cabeza__hola" tabindex="-1">¡Hola, ${esc(perfil.nombre)}!</h1>
          ${_botonCambiar}
        </header>
        <div class="knino-fila">
          ${htmlTino('saluda', { tamano: 96 })}
          <p class="bubble">${presentacion}${saludo}</p>
        </div>
        ${primero}
      </div>
      <div class="nino-inicio__grupo">
        <section class="kcard" aria-labelledby="nino-alcancia-inicio">
          <div class="knino-cabeza">
            <h2 class="k-h3 knino-titulo-sm" id="nino-alcancia-inicio">${iconoCategoria('i-ahorro')}Mi alcancía</h2>
            <span class="knino-total">${f(s.total)}</span>
          </div>
          <ul class="knino-mini">${FRASCOS.map(fr => `
            <li data-frasco="${fr}"><span>${iconoCategoria(FRASCO_INFO[fr].icono)}${FRASCO_INFO[fr].nombre}</span><strong>${f(s[fr])}</strong></li>`).join('')}
          </ul>
          ${_frascos(perfil)}
          <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="nino-vista" data-vista="alcancia">Ver mi alcancía</button>
        </section>
        ${metaActiva(perfil) ? htmlTarjetaMeta(perfil, hoyISO) : ''}
      </div>
    </div>`;
}

/** Un nodo del camino: hecha (se repasa), la que sigue (Empezar) o después. */
function _nodo(l, unidad) {
  const titulo = esc(l.leccion.titulo);
  if (l.estado === 'hecha') {
    return `<button class="knode knode--hecha" type="button" data-action="leccion-abrir" data-id="${esc(l.leccion.id)}"
              aria-label="Lección ${l.numero}, ${titulo}, terminada. Repasar">${icon('check')}</button>`;
  }
  if (l.estado === 'actual') {
    return `<button class="knode knode--ahora" type="button" data-action="leccion-abrir" data-id="${esc(l.leccion.id)}"
              aria-label="Lección ${l.numero}: ${titulo}. Empezar">${iconoCategoria(unidad.icono)}<span class="knode__rotulo">Empezar</span></button>`;
  }
  return `<span class="knode knode--despues" role="img" aria-label="Lección ${l.numero}, ${titulo}, después">${iconoCategoria('c-birrete')}</span>`;
}

/**
 * Aprender: la ruta como camino, en orden (D9).
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlRutaNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const hechas = unidadesHechasNino(perfil.aprende);
  const filas = ruta.map(e => {
    const u = e.unidad;
    const cabeza = (rotulo, extra = '') => `
      <div class="kunit kunit--${e.estado}" data-dom="${u.dominio}">
        <span class="knino-teja">${iconoCategoria(u.icono)}</span>
        <span class="knino-pila"><span class="k-sm">${rotulo}</span><span class="k-h3">${esc(u.nombre)}</span></span>
        ${extra}
      </div>`;
    if (e.estado === 'hecha') {
      return `<li>${cabeza(`Unidad ${u.numero}`, `<span class="kchip kchip--hecha">${icon('check')}Lista</span>`)}</li>`;
    }
    if (e.estado === 'sabida') {
      return `<li>${cabeza(`Unidad ${u.numero}`, `<span class="kchip kchip--hecha">${icon('check')}Ya lo sabes</span>`)}</li>`;
    }
    if (e.estado === 'actual') {
      return `<li>${cabeza(`Unidad ${u.numero} · vas aquí`)}
        <ol class="kcamino" data-dom="${u.dominio}" aria-label="Lecciones de la unidad ${u.numero}">
          ${e.lecciones.map(l => `
            <li class="kcamino__paso kcamino__paso--${l.estado}">
              ${l.estado === 'actual' ? htmlTino('explica', { tamano: 72 }) : ''}
              ${_nodo(l, u)}
            </li>`).join('')}
        </ol></li>`;
    }
    if (e.estado === 'preparacion') {
      return `<li>${cabeza(`Unidad ${u.numero} · muy pronto`)}</li>`;
    }
    return `<li>${cabeza(`Unidad ${u.numero} · después`)}</li>`;
  }).join('');
  return `
    <header class="knino-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">${iconoCategoria('c-birrete')}Aprender</h1>
      <span class="kchip">${hechas} de ${UNIDADES_NINO.length} unidades</span>
    </header>
    ${ofreceUbicacionNino(perfil) ? _ofertaUbicacion() : ''}
    <ol class="kruta">${filas}</ol>`;
}

/**
 * Alcancía: el total, los tres frascos con "Guardé", "Gasté" y "Compartí",
 * y la meta (D9). La mesada y el premio llegan con APR.3e.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {string} hoyISO
 */
export function htmlAlcanciaNino(perfil, hoyISO) {
  const s = saldosFrascos(perfil);
  return `
    <header class="knino-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">${iconoCategoria('i-ahorro')}Mi alcancía</h1>
      <span class="kchip knino-total">${f(s.total)}</span>
    </header>
    ${_frascos(perfil)}
    <div class="knino-acciones" role="group" aria-label="Anotar dinero">
      <button class="kbtn kbtn--dom" type="button" data-frasco="ahorrar" data-action="nino-mov" data-tipo="guarde">${icon('plus')}Guardé</button>
      <button class="kbtn kbtn--dom" type="button" data-frasco="gastar" data-action="nino-mov" data-tipo="gaste">${iconoCategoria('c-tienda')}Gasté</button>
      <button class="kbtn kbtn--dom" type="button" data-frasco="compartir" data-action="nino-mov" data-tipo="comparti">${iconoCategoria('c-regalo')}Compartí</button>
    </div>
    ${puedeMover(perfil) && s.total > 0 ? `
    <button class="knino-quitar knino-mover" type="button" data-action="nino-mov" data-tipo="mover">${icon('transferencia')}Mover dinero entre frascos</button>` : ''}
    ${htmlTarjetaMeta(perfil, hoyISO)}
    ${_tarjetaMesada(perfil, hoyISO)}
    ${_tarjetaPremio(perfil, hoyISO)}
    ${s.total === 0 ? `
    <div class="knino-fila">
      ${htmlTino('explica', { tamano: 80 })}
      <p class="bubble">Cuando recibas dinero, toca Guardé.</p>
    </div>` : ''}`;
}

/** La mesada que fijó el tutor: cuánto, cada cuánto, la próxima y su reparto. */
function _tarjetaMesada(perfil, hoyISO) {
  const m = perfil.mesada;
  if (!m) return '';
  const prox = proximaMesada(m, hoyISO);
  const cuando = textoFrecuencia(m);
  const linea = `${cuando[0].toUpperCase()}${cuando.slice(1)}.${prox ? ` La próxima llega el ${_DIA_MES(prox)}.` : ''}`;
  return `
    <section class="kcard" aria-labelledby="nino-mesada">
      <div class="knino-cabeza">
        <h2 class="k-h3 knino-titulo-sm" id="nino-mesada">${iconoCategoria('c-billete')}Mi mesada</h2>
        <span class="knino-total">${f(m.monto)}</span>
      </div>
      <p class="k-sm">${linea}</p>
      <ul class="knino-mini">${FRASCOS.map(fr => `
        <li data-frasco="${fr}"><span>${FRASCO_INFO[fr].nombre}</span><strong>${f(Number(m.reparto?.[fr]) || 0)}</strong></li>`).join('')}
      </ul>
    </section>`;
}

/** El premio por ahorrar: quién lo da, cuánto y cuándo llega (D4). */
function _tarjetaPremio(perfil, hoyISO) {
  if (!perfil.premio) return '';
  const tasa = TASAS_PREMIO[perfil.premio.tasa];
  const prox = proximoPremio(perfil, hoyISO);
  return `
    <section class="kcard kcard--dom" data-dom="inversion" aria-labelledby="nino-premio">
      <h2 class="k-h3 knino-titulo-sm" id="nino-premio">${icon('trending-up')}Premio por ahorrar</h2>
      <p class="k-body knino-fuerte">${esc(perfil.teNombra)} te suma ${tasa?.texto ?? ''}.</p>
      <p class="k-sm">${prox.monto > 0 ? `El ${_DIA_MES(prox.fechaISO)} recibes ${f(prox.monto)} más.` : 'Guarda en Ahorrar y crecerá cada mes.'}</p>
      <button class="knino-quitar" type="button" data-action="nino-vista" data-vista="aprender">¿Por qué crece? Míralo en la unidad 8</button>
    </section>`;
}

/** Qué pregunta cada acción de la alcancía (D6: frases cortas). */
const _HOJA = {
  guarde:   { titulo: '¿Cuánto guardaste?', nota: '¿De dónde salió?', ejemplo: 'Un regalo', boton: 'Guardar' },
  gaste:    { titulo: '¿Cuánto gastaste?', nota: '¿En qué?', ejemplo: 'Un helado', boton: 'Anotar' },
  comparti: { titulo: '¿Cuánto compartiste?', nota: '¿Con quién o para qué?', ejemplo: 'Un regalo para mi abuela', boton: 'Anotar' },
  mover:    { titulo: 'Mover dinero entre frascos', nota: '¿Para qué?', ejemplo: 'Para mi meta', boton: 'Mover' },
};

/** Radios de frasco con su nombre e ícono. */
function _elegirFrasco(nombre, leyenda, marcado) {
  return `
    <fieldset class="kfield">
      <legend class="kfield__etiqueta">${leyenda}</legend>
      <div class="kfrascos">${FRASCOS.map(fr => `
        <label class="kfrasco" data-frasco="${fr}"><input class="sr-only" type="radio" name="${nombre}" value="${fr}"${fr === marcado ? ' checked' : ''} />
          ${iconoCategoria(FRASCO_INFO[fr].icono)}<span>${FRASCO_INFO[fr].nombre}</span></label>`).join('')}
      </div>
    </fieldset>`;
}

/**
 * La hoja para anotar dinero que entra, sale o se mueve entre frascos.
 *
 * @param {'guarde'|'gaste'|'comparti'|'mover'} tipo
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlMovimientoNino(tipo, perfil) {
  const h = _HOJA[tipo] ?? _HOJA.guarde;
  const s = saldosFrascos(perfil);
  const saldo = tipo === 'gaste' ? `En Gastar tienes ${f(s.gastar)}.`
    : tipo === 'comparti' ? `En Compartir tienes ${f(s.compartir)}.` : '';
  const frascos = tipo === 'guarde' ? _elegirFrasco('frasco', '¿En qué frasco?', 'ahorrar')
    : tipo === 'mover' ? `${_elegirFrasco('desde', '¿De qué frasco sale?', 'gastar')}${_elegirFrasco('hacia', '¿A cuál entra?', 'ahorrar')}`
    : '';
  return `
    <form class="kform" id="form-nino-mov" data-tipo="${tipo}" novalidate>
      <h2 class="k-h2" id="modal-nino-titulo" tabindex="-1">${h.titulo}</h2>
      ${saldo ? `<p class="k-sm">${saldo}</p>` : ''}
      <div class="kfield">
        <label class="kfield__etiqueta" for="nino-monto">¿Cuánto dinero?</label>
        <div class="kin"><span aria-hidden="true">$</span><input id="nino-monto" name="monto" type="text" inputmode="numeric" autocomplete="off" /></div>
        <div class="kchips">${[1_000, 2_000, 5_000, 10_000].map(m => `
          <button class="kchip kchip--boton" type="button" data-action="nino-monto" data-monto="${m}">${f(m)}</button>`).join('')}
        </div>
      </div>
      ${frascos}
      <div class="kfield">
        <label class="kfield__etiqueta" for="nino-nota">${h.nota}</label>
        <div class="kin"><input id="nino-nota" name="nota" type="text" maxlength="40" autocomplete="off" placeholder="${esc(h.ejemplo)}" /></div>
      </div>
      <p class="kform__error" id="nino-mov-error" role="alert"></p>
      <button class="kbtn kbtn--block" type="submit">${icon('check')}${h.boton}</button>
    </form>`;
}

/**
 * Crear una meta (D9): dibujo, nombre, precio y cuánto guarda cada semana.
 * La pantalla responde en semanas y en fecha mientras el niño elige.
 *
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {{ dibujo?: string, nombre?: string, precio?: number, semanal?: number }} borrador
 * @param {string} hoyISO
 */
export function htmlMetaNino(perfil, borrador, hoyISO) {
  const semanal = borrador.semanal ?? 2_000;
  return `
    <header class="knino-cabeza">
      <button class="knino-cambiar" type="button" data-action="nino-vista" data-vista="alcancia" aria-label="Volver a mi alcancía">${icon('arrow-left')}</button>
      <h1 class="k-h2 knino-titulo" tabindex="-1">${iconoCategoria('i-metas')}Nueva meta</h1>
    </header>
    <form class="kform" id="form-nino-meta" novalidate>
      <fieldset class="kfield">
        <legend class="kfield__etiqueta">¿Para qué quieres ahorrar?</legend>
        <div class="kdibujos">${DIBUJOS.map(d => `
          <label class="kdibujo"><input class="sr-only" type="radio" name="dibujo" value="${d.id}"${borrador.dibujo === d.id ? ' checked' : ''} />
            ${htmlDibujo(d.id, { tamano: 52 })}<span class="sr-only">${esc(d.nombre)}</span></label>`).join('')}
        </div>
      </fieldset>
      <div class="kfield">
        <label class="kfield__etiqueta" for="nino-meta-nombre">${icon('edit')}Ponle nombre</label>
        <div class="kin"><input id="nino-meta-nombre" name="nombre" type="text" maxlength="40" autocomplete="off" value="${esc(borrador.nombre ?? '')}" /></div>
      </div>
      <div class="kfield">
        <label class="kfield__etiqueta" for="nino-meta-precio">${iconoCategoria('c-etiqueta')}¿Cuánto cuesta?</label>
        <div class="kin"><span aria-hidden="true">$</span><input id="nino-meta-precio" name="precio" type="text" inputmode="numeric" autocomplete="off" value="${borrador.precio ? f(borrador.precio).replace('$', '') : ''}" /></div>
      </div>
      <div class="kfield">
        <p class="kfield__etiqueta" id="nino-meta-semana">${iconoCategoria('i-ahorro')}¿Cuánto guardas cada semana?</p>
        <div class="kstep" role="group" aria-labelledby="nino-meta-semana">
          <button type="button" data-action="nino-meta-semana" data-paso="-1000" aria-label="Guardar $1.000 menos">${icon('chevron-down')}</button>
          <output id="nino-meta-semanal" data-valor="${semanal}">${f(semanal)}</output>
          <button type="button" data-action="nino-meta-semana" data-paso="1000" aria-label="Guardar $1.000 más">${icon('chevron-up')}</button>
        </div>
      </div>
      <div class="knino-plan" id="nino-meta-plan" role="status">${htmlPlanMeta(perfil, borrador.precio, semanal, hoyISO)}</div>
      <p class="kform__error" id="nino-meta-error" role="alert"></p>
      <button class="kbtn kbtn--block" type="submit">${icon('check')}Crear mi meta</button>
    </form>`;
}

/** "Lo tendrás en 8 semanas. Para el 19 de diciembre." */
export function htmlPlanMeta(perfil, precio, semanal, hoyISO) {
  if (!(Number(precio) > 0)) return `${iconoCategoria('i-agenda')}<p class="k-sm">Escribe el precio y te digo cuándo.</p>`;
  const plan = planMeta({ precio, semanal, ahorrado: saldosFrascos(perfil).ahorrar, hoyISO });
  if (plan.falta === 0) return `${iconoCategoria('i-agenda')}<p class="k-h3">¡Ya tienes para eso!</p>`;
  return `${iconoCategoria('i-agenda')}
    <div class="knino-pila">
      <p class="k-h3">Lo tendrás en ${plan.semanas === 1 ? '1 semana' : `${plan.semanas} semanas`}.</p>
      <p class="k-sm">Para el ${_DIA_MES(plan.fechaISO)}.</p>
    </div>`;
}

/**
 * Yo: sus insignias y "Cambiar de perfil" (D9).
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlYoNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const insignias = ruta.map(e => e.estado === 'hecha' || e.estado === 'sabida' ? `
      <li class="kinsignia" data-dom="${e.unidad.dominio}">
        <svg class="kinsignia__dibujo" viewBox="0 0 120 120" aria-hidden="true"><use href="#il-insignia"/></svg>
        <span class="k-sm">${esc(e.unidad.nombre)}</span>
      </li>` : `
      <li class="kinsignia kinsignia--pendiente" aria-label="Unidad ${e.unidad.numero}, insignia por ganar">
        <span class="kinsignia__vacia" aria-hidden="true">${e.unidad.numero}</span>
        <span class="k-sm">Unidad ${e.unidad.numero}</span>
      </li>`).join('');
  return `
    <header class="knino-cabeza">
      ${_avatar(perfil, 48)}
      <div class="knino-pila">
        <h1 class="k-h1" tabindex="-1">${esc(perfil.nombre)}</h1>
        <p class="k-sm">${perfil.edad} años</p>
      </div>
    </header>
    <section class="kcard" aria-labelledby="nino-insignias">
      <h2 class="k-h3" id="nino-insignias">${icon('star')}Mis insignias</h2>
      <ul class="kinsignias">${insignias}</ul>
    </section>
    <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="perfil-cambiar">${icon('transferencia')}Cambiar de perfil</button>
    <button class="knino-adulto" type="button" data-action="telefono-adulto">Este teléfono es de un adulto</button>`;
}
