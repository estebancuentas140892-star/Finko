/**
 * nino/view.js - lo que ve el niño (APR.3c y APR.3d, ADR 093 D9). Solo HTML.
 *
 * Cuatro pantallas con su barra: Inicio, Aprender, Alcancía y Yo, más la de
 * crear una meta y la hoja para anotar lo que guardó, gastó o compartió.
 * Voz del niño (D6): frases de máximo 10 palabras y cifras redondas. Cada
 * texto lleva su ícono o su dibujo al lado y ningún color va solo (R49).
 * La forma de cada pantalla en el teléfono: ADR 124.
 */

import { f, esc, formateadorFecha } from '../../infra/utils.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import { htmlTino, htmlDibujo, dibujoPorId, htmlFrasco, DIBUJOS } from '../../infra/ilustraciones.js';
import { saldosFrascos, FRASCOS } from '../../infra/perfiles.js';
import { UNIDADES_NINO } from '../../infra/ruta-aprende.js';
import { proximaMesada, DIAS_SEMANA, TASAS_PREMIO, proximoPremio } from '../../infra/mesada.js';
import {
  estadoRutaNino, siguienteLeccionNino, unidadesHechasNino, ofreceUbicacionNino, sinEmpezarNino,
  metaActiva, planMeta, llenadoFrasco, puedeMover, ultimasAnotaciones,
} from './logic.js';

/** Desde los 10 años, antes de empezar: tres preguntas para saber dónde empieza. */
function _ofertaUbicacion() {
  return `
    <section class="kcard knino-leccion" aria-labelledby="nino-ubicacion">
      <h2 class="k-h3" id="nino-ubicacion">Antes de empezar, tres preguntas</h2>
      <p class="knino-dato">Así sabemos en qué unidad empiezas.</p>
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

/** Nombre, ícono y para qué sirve cada frasco (R49: nunca solo el color). */
export const FRASCO_INFO = {
  ahorrar: { nombre: 'Ahorrar', icono: 'i-ahorro', para: 'Para lo que quieres tener después' },
  gastar: { nombre: 'Gastar', icono: 'c-tienda', para: 'Para lo que compras ya' },
  compartir: { nombre: 'Compartir', icono: 'c-regalo', para: 'Para ayudar o dar un regalo' },
};

/** "19 de diciembre": la fecha de una meta, en palabras. */
const _DIA_MES = (iso) => formateadorFecha('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  .format(new Date(`${iso}T12:00:00Z`));

/** "sábado": el día de la semana de una fecha. */
const _diaSemana = (iso) => DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()] ?? '';

/** "sábado 14 de noviembre". */
const _diaLargo = (iso) => `${_diaSemana(iso)} ${_DIA_MES(iso)}`;

/** "miércoles 11" si es de este mes; si no, "lunes 2 de noviembre". */
function _diaCorto(iso, hoyISO) {
  if (!iso) return '';
  if (iso.slice(0, 7) !== String(hoyISO ?? '').slice(0, 7)) return _diaLargo(iso);
  return `${_diaSemana(iso)} ${Number(iso.slice(8, 10))}`;
}

/**
 * La barra del niño. En el teléfono, el destino actual lleva su ícono en una
 * píldora (ADR 124 D1). En tableta y escritorio es un riel a la izquierda con
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
      <span class="knav__ico">${iconoCategoria(b.icono)}</span><span>${b.texto}</span>
    </button>`).join('');
  if (!perfil) return destinos;
  return `
    <span class="knav__yo" aria-hidden="true">${_avatar(perfil, 34)}</span>
    ${destinos}
    <button class="knav__it knav__it--cambiar" type="button" data-action="perfil-cambiar"
            aria-label="Cambiar de perfil">${icon('transferencia')}<span>Cambiar</span></button>`;
}

/** El dibujo del niño en su teja, con el borde del color de su dibujo. */
function _avatar(perfil, tamano = 34, clase = 'kidav--nino') {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav ${clase}" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

const _botonCambiar = `
  <button class="knino-cambiar" type="button" data-action="perfil-cambiar" aria-label="Cambiar de perfil">${icon('transferencia')}<span>Cambiar</span></button>`;

/** "Te faltan $93.800. Unas 19 semanas", y la fecha si se pide. */
function _faltaMeta(plan, conFecha) {
  let resto = '';
  if (Number.isFinite(plan.semanas) && plan.semanas > 0) {
    resto = plan.semanas === 1 ? ' Una semana más' : ` Unas ${plan.semanas} semanas`;
    if (conFecha) resto += `, para el ${_DIA_MES(plan.fechaISO)}`;
    resto += '.';
  }
  return `Te faltan <strong>${f(plan.falta)}</strong>.${resto}`;
}

/**
 * La meta con su barra: lo que tiene en Ahorrar contra el precio (R60). En
 * Inicio solo se mira; en la Alcancía (`acciones`) trae la fecha y sus dos
 * botones: "Cambiar el plan" y "Quitar la meta", o "Ya lo compré" si ya
 * alcanza (ADR 124 D2).
 *
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {string} hoyISO
 * @param {{ acciones?: boolean }} [opciones]
 */
export function htmlTarjetaMeta(perfil, hoyISO, { acciones = false } = {}) {
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
  const lograda = plan.falta === 0;
  const botones = !acciones ? '' : `
      <div class="knino-meta__acciones">
        ${lograda
          ? `<button class="kbtn" type="button" data-action="nino-meta-compre">${icon('check')}Ya lo compré</button>`
          : '<button class="kbtn kbtn--soft" type="button" data-action="nino-meta-cambiar">Cambiar el plan</button>'}
        <button class="kbtn kbtn--linea" type="button" data-action="nino-meta-quitar">Quitar la meta</button>
      </div>`;
  return `
    <section class="kcard knino-meta" data-frasco="ahorrar" aria-labelledby="nino-meta-titulo">
      <div class="knino-meta__cabeza">
        <span class="knino-meta__dibujo">${htmlDibujo(meta.dibujo, { tamano: 52 })}</span>
        <div class="knino-pila">
          <p class="k-sm">Tu meta</p>
          <h2 class="k-h3" id="nino-meta-titulo">${esc(meta.nombre)}</h2>
          <p class="knino-meta__cifras"><strong>${f(Math.min(ahorrado, meta.precio))}</strong> <span>de ${f(meta.precio)}</span></p>
        </div>
      </div>
      <div class="kprog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="${esc(meta.nombre)}: ${f(meta.precio - plan.falta)} de ${f(meta.precio)}"><span style="width:${pct}%"></span></div>
      <p class="knino-meta__linea">${lograda ? '¡Ya tienes para tu meta!' : _faltaMeta(plan, acciones)}</p>
      ${botones}
    </section>`;
}

/** Inicio, con la meta ya alcanzada: Tino celebra en vez de saludar (ADR 124 D2). */
function _metaLograda(perfil, meta) {
  return `
    <section class="kcard knino-logro" aria-labelledby="nino-logro">
      <div class="knino-fila">
        ${htmlTino('celebra', { tamano: 88 })}
        <div class="knino-pila">
          <p class="knino-logro__rotulo">¡Lo lograste!</p>
          <h2 class="k-h3" id="nino-logro">Ya tienes para tu meta</h2>
        </div>
      </div>
      <div class="knino-pila">
        <p class="knino-fuerte">${esc(meta.nombre)}</p>
        <p class="k-body">Cuesta ${f(meta.precio)} y tienes ${f(saldosFrascos(perfil).ahorrar)} en Ahorrar.</p>
      </div>
      <button class="kbtn kbtn--block" type="button" data-action="nino-meta-compre">${icon('check')}Ya lo compré</button>
    </section>`;
}

/**
 * La lección que sigue: su unidad, cuánto dura o dónde iba, y un solo botón.
 * La primera de todas se presenta como tal (ADR 124 D2).
 */
function _tarjetaLeccion(perfil, sig) {
  const enCurso = perfil.aprende?.enCurso;
  const seguir = enCurso?.id === sig.leccion.id && Number(enCurso.paso) > 0;
  const chip = sinEmpezarNino(perfil.aprende) ? 'Tu primera lección'
    : `Unidad ${sig.unidad.numero} · lección ${sig.numero} de ${sig.unidad.lecciones.length}`;
  const linea = seguir ? `Ibas en el paso ${Number(enCurso.paso) + 1}` : `${sig.leccion.minutos} minutos`;
  return `
    <section class="kcard knino-leccion" aria-labelledby="nino-siguiente">
      <p class="kchip kchip--acento">${chip}</p>
      <h2 class="k-h3" id="nino-siguiente">${esc(sig.leccion.titulo)}</h2>
      <p class="knino-dato">${icon('clock')}${linea}</p>
      <button class="kbtn kbtn--block" type="button" data-action="leccion-abrir" data-id="${esc(sig.leccion.id)}">${iconoCategoria('c-birrete')}${seguir ? 'Seguir donde ibas' : 'Empezar'}</button>
    </section>`;
}

/** Los tres frascos en tejas de su color: dibujo, nombre y monto. */
function _tejasFrascos(perfil) {
  const s = saldosFrascos(perfil);
  return `
    <ul class="ktejas">${FRASCOS.map(fr => `
      <li class="kteja" data-frasco="${fr}">
        ${htmlFrasco(fr, llenadoFrasco(fr, perfil), { ancho: 44 })}
        <span class="kteja__nombre">${FRASCO_INFO[fr].nombre}</span>
        <strong class="kteja__monto">${f(s[fr])}</strong>
      </li>`).join('')}
    </ul>`;
}

/** La alcancía en Inicio. Vacía, invita a anotar lo primero que guarde. */
function _alcanciaInicio(perfil) {
  const s = saldosFrascos(perfil);
  if (s.total === 0) {
    return `
      <section class="kcard" aria-labelledby="nino-alcancia-inicio">
        <div class="knino-fila">
          ${htmlFrasco('ahorrar', 0, { ancho: 52 })}
          <div class="knino-pila">
            <h2 class="k-h3" id="nino-alcancia-inicio">Tu alcancía</h2>
            <p class="k-body">Cuando te den dinero, guárdalo aquí.</p>
          </div>
        </div>
        <button class="kbtn kbtn--dom kbtn--block" type="button" data-frasco="ahorrar" data-action="nino-mov" data-tipo="guarde">${icon('plus')}Guardé dinero</button>
      </section>`;
  }
  return `
    <section class="kcard" aria-labelledby="nino-alcancia-inicio">
      <div class="knino-suma">
        <h2 class="k-h3" id="nino-alcancia-inicio">Mi alcancía</h2>
        <p class="knino-suma__total">${f(s.total)}</p>
      </div>
      ${_tejasFrascos(perfil)}
      <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="nino-vista" data-vista="alcancia">Ver mi alcancía</button>
    </section>`;
}

/**
 * Inicio: el saludo de Tino, la lección que sigue, la alcancía y la meta (D9,
 * ADR 124 D2). Mientras el niño no empieza la ruta, Tino se presenta (ADR 094
 * D1); con la meta alcanzada, celebra. Va en dos grupos: en escritorio son
 * dos columnas (APR.4b), lo que sigue a la izquierda y la alcancía a la
 * derecha.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {string} hoyISO
 */
export function htmlInicioNino(perfil, hoyISO) {
  const sig = siguienteLeccionNino(perfil.aprende);
  const ubicar = ofreceUbicacionNino(perfil);
  const meta = metaActiva(perfil);
  const lograda = !!meta && saldosFrascos(perfil).ahorrar >= meta.precio;
  const presentacion = sinEmpezarNino(perfil.aprende) ? 'Soy Tino, un guatín. ' : '';
  const saludo = ubicar ? `${presentacion}Primero, tres preguntas cortas.`
    : presentacion ? `${presentacion}¡Aprendamos juntos!`
    : sig ? '¡Vas muy bien! Sigue tu lección de hoy.' : '¡Qué bien vas! Repasa cuando quieras.';
  const tino = lograda ? _metaLograda(perfil, meta) : `
        <div class="knino-fila knino-tino">
          ${htmlTino('saluda', { tamano: 96 })}
          <p class="bubble">${saludo}</p>
        </div>`;
  const primero = ubicar ? _ofertaUbicacion() : sig ? _tarjetaLeccion(perfil, sig) : `
    <section class="kcard knino-leccion" aria-labelledby="nino-siguiente">
      <h2 class="k-h3" id="nino-siguiente">Hiciste todo lo que hay por ahora.</h2>
      <p class="knino-dato">Pronto llegan más lecciones.</p>
    </section>`;
  return `
    <div class="nino-inicio">
      <div class="nino-inicio__grupo">
        <header class="knino-cabeza">
          ${_avatar(perfil)}
          <h1 class="k-h1 knino-cabeza__hola" tabindex="-1">¡Hola, ${esc(perfil.nombre)}!</h1>
          ${_botonCambiar}
        </header>
        ${tino}
        ${primero}
      </div>
      <div class="nino-inicio__grupo">
        ${_alcanciaInicio(perfil)}
        ${meta && !lograda ? htmlTarjetaMeta(perfil, hoyISO) : ''}
      </div>
    </div>`;
}

/** Lo que dice Tino junto a la lección que sigue. */
function _diceTino(faltan, numero) {
  return faltan === 1 ? '¡Te falta una para la insignia!' : `¡Vamos con la lección ${numero}!`;
}

/**
 * La unidad actual, abierta: sus lecciones (las listas se repasan, la de
 * ahora lleva su número, las que vienen un candado), Tino y un solo botón
 * (ADR 124 D6).
 */
function _unidadActual(e, enCurso) {
  const u = e.unidad;
  const actual = e.lecciones.find(l => l.estado === 'actual');
  const faltan = e.lecciones.filter(l => l.estado !== 'hecha').length;
  const seguir = !!actual && enCurso?.id === actual.leccion.id && Number(enCurso.paso) > 0;
  const lecciones = e.lecciones.map(l => {
    const titulo = esc(l.leccion.titulo);
    if (l.estado === 'hecha') {
      return `
            <li class="kleccion">
              <button class="kleccion__fila" type="button" data-action="leccion-abrir" data-id="${esc(l.leccion.id)}"
                      aria-label="Lección ${l.numero}, ${titulo}: lista. Repasar">
                <span class="kleccion__nodo kleccion__nodo--hecha">${icon('check')}</span>
                <span class="knino-pila"><span class="kleccion__titulo">${titulo}</span><span class="kleccion__estado">Lista</span></span>
              </button>
            </li>`;
    }
    if (l.estado === 'actual') {
      return `
            <li class="kleccion kleccion--actual" aria-current="step">
              <span class="kleccion__nodo kleccion__nodo--actual" aria-hidden="true">${l.numero}</span>
              <span class="knino-pila"><span class="kleccion__titulo">${titulo}${seguir ? ' · ibas aquí' : ''}</span><span class="kleccion__estado">Ahora · ${l.leccion.minutos} minutos</span></span>
            </li>`;
    }
    return `
            <li class="kleccion kleccion--despues">
              <span class="kleccion__nodo" aria-hidden="true">${icon('lock')}</span>
              <span class="knino-pila"><span class="kleccion__titulo">${titulo}</span><span class="kleccion__estado">Después</span></span>
            </li>`;
  }).join('');
  return `
        <li class="kruta__actual" data-dom="${u.dominio}">
          <div class="knino-fila">
            <span class="kruta__teja" aria-hidden="true">${iconoCategoria(u.icono)}</span>
            <span class="knino-pila"><span class="kruta__rotulo">Unidad ${u.numero} · vas aquí</span><span class="k-h3">${esc(u.nombre)}</span></span>
          </div>
          <ol class="klecciones" aria-label="Lecciones de la unidad ${u.numero}">${lecciones}
          </ol>${actual ? `
          <div class="knino-fila knino-tino">
            ${htmlTino('explica', { tamano: 64 })}
            <p class="bubble bubble--sm">${_diceTino(faltan, actual.numero)}</p>
          </div>
          <button class="kbtn kbtn--block" type="button" data-action="leccion-abrir" data-id="${esc(actual.leccion.id)}">${iconoCategoria('c-birrete')}${seguir ? 'Seguir donde ibas' : 'Empezar la lección'}</button>` : ''}
        </li>`;
}

/**
 * Aprender: la ruta en orden como una línea (D9, ADR 124 D6). Las unidades
 * hechas o sabidas se repasan desde su primera lección; la actual va
 * abierta; las que vienen esperan con su ícono.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlRutaNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const hechas = unidadesHechasNino(perfil.aprende);
  const total = UNIDADES_NINO.length;
  const filas = ruta.map(e => {
    const u = e.unidad;
    if (e.estado === 'hecha' || e.estado === 'sabida') {
      const rotulo = e.estado === 'hecha' ? 'Lista' : 'Ya lo sabes';
      return `
        <li>
          <button class="kruta__unidad" type="button" data-action="leccion-abrir" data-id="${esc(u.lecciones[0].id)}"
                  aria-label="Unidad ${u.numero}, ${esc(u.nombre)}: ${rotulo.toLowerCase()}. Repasar">
            <span class="kruta__nodo kruta__nodo--hecha">${icon('check')}</span>
            <span class="knino-pila"><span class="kruta__rotulo">Unidad ${u.numero} · ${rotulo}</span><span class="kruta__nombre">${esc(u.nombre)}</span></span>
          </button>
        </li>`;
    }
    if (e.estado === 'actual') return _unidadActual(e, perfil.aprende?.enCurso);
    const rotulo = e.estado === 'preparacion' ? 'muy pronto' : 'después';
    return `
        <li class="kruta__unidad kruta__unidad--despues">
          <span class="kruta__nodo" aria-hidden="true">${iconoCategoria(u.icono)}</span>
          <span class="knino-pila"><span class="kruta__rotulo">Unidad ${u.numero} · ${rotulo}</span><span class="kruta__nombre">${esc(u.nombre)}</span></span>
        </li>`;
  }).join('');
  return `
    <header class="knino-ruta-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">Aprender</h1>
      <p class="knino-ruta-cabeza__cuenta">Llevas ${hechas} de ${total} unidades</p>
      <div class="kprog kprog--ruta" role="progressbar" aria-valuenow="${hechas}" aria-valuemin="0" aria-valuemax="${total}"
           aria-label="${hechas} de ${total} unidades listas"><span style="width:${Math.round(hechas / total * 100)}%"></span></div>
    </header>
    ${ofreceUbicacionNino(perfil) ? _ofertaUbicacion() : ''}
    <ol class="kruta">${filas}
    </ol>`;
}

/** Qué anota cada botón de su frasco en la Alcancía. */
const _ANOTAR = {
  ahorrar: { tipo: 'guarde', texto: 'Guardé' },
  gastar: { tipo: 'gaste', texto: 'Gasté' },
  compartir: { tipo: 'comparti', texto: 'Compartí' },
};

/**
 * Alcancía: el total, cada frasco con su botón debajo ("Guardé", "Gasté",
 * "Compartí"), la meta, lo último que anotó, la mesada y el premio (D9,
 * ADR 124 D3). Sin nada anotado todavía, explica los tres frascos.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 * @param {string} hoyISO
 */
export function htmlAlcanciaNino(perfil, hoyISO) {
  const s = saldosFrascos(perfil);
  if (s.total === 0 && !perfil.movimientos?.length) return _alcanciaVacia(perfil, hoyISO);
  return `
    <header class="knino-suma">
      <h1 class="k-h1 knino-titulo" tabindex="-1">Mi alcancía</h1>
      <p class="knino-suma__total knino-suma__total--h1">${f(s.total)}</p>
    </header>
    <ul class="jars" aria-label="Tus tres frascos">${FRASCOS.map(fr => `
      <li class="jars__col" data-frasco="${fr}">
        <div class="jar" data-frasco="${fr}">
          ${htmlFrasco(fr, llenadoFrasco(fr, perfil), { ancho: 64, etiqueta: `Frasco ${FRASCO_INFO[fr].nombre}: ${f(s[fr])}` })}
          <p class="jar__nombre">${iconoCategoria(FRASCO_INFO[fr].icono)}${FRASCO_INFO[fr].nombre}</p>
          <p class="jar__monto">${f(s[fr])}</p>
        </div>
        <button class="kbtn kbtn--dom" type="button" data-frasco="${fr}" data-action="nino-mov" data-tipo="${_ANOTAR[fr].tipo}">${_ANOTAR[fr].texto}</button>
      </li>`).join('')}
    </ul>
    ${puedeMover(perfil) && s.total > 0 ? `
    <button class="kbtn kbtn--linea kbtn--block" type="button" data-action="nino-mov" data-tipo="mover">${icon('transferencia')}Mover dinero entre frascos</button>` : ''}
    ${htmlTarjetaMeta(perfil, hoyISO, { acciones: true })}
    ${_ultimas(perfil, hoyISO)}
    ${_tarjetaMesada(perfil, hoyISO)}
    ${_tarjetaPremio(perfil, hoyISO)}`;
}

/** La alcancía sin nada anotado: qué es cada frasco y el primer "Guardé". */
function _alcanciaVacia(perfil, hoyISO) {
  return `
    <header class="knino-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">Mi alcancía</h1>
    </header>
    <div class="knino-fila knino-tino">
      ${htmlTino('explica', { tamano: 88 })}
      <p class="bubble">Tu dinero va en tres frascos.</p>
    </div>
    <ul class="kcard klista" aria-label="Tus tres frascos">${FRASCOS.map(fr => `
      <li class="klista__fila klista__fila--frasco" data-frasco="${fr}">
        ${htmlFrasco(fr, 0, { ancho: 44 })}
        <span class="knino-pila"><span class="klista__frasco">${FRASCO_INFO[fr].nombre}</span><span class="klista__para">${FRASCO_INFO[fr].para}</span></span>
        <strong class="klista__monto">${f(0)}</strong>
      </li>`).join('')}
    </ul>
    <button class="kbtn kbtn--block" type="button" data-frasco="ahorrar" data-action="nino-mov" data-tipo="guarde">${icon('plus')}Guardé dinero</button>
    ${metaActiva(perfil) ? htmlTarjetaMeta(perfil, hoyISO, { acciones: true })
      : '<p class="knino-nota">¿Quieres algo especial? Primero guarda, después creas tu meta.</p>'}
    ${_tarjetaMesada(perfil, hoyISO)}
    ${_tarjetaPremio(perfil, hoyISO)}`;
}

/** Cómo se nombra lo que anotó el niño con sus botones. */
const _VERBO = { guarde: 'Guardé', gaste: 'Gasté', comparti: 'Compartí' };

/** Una fila de "Lo último que anotaste": qué, cuándo y cuánto. */
function _filaAnotacion(a, perfil, hoyISO) {
  let titulo;
  let detalle = '';
  let frasco = a.frasco;
  let icono = FRASCO_INFO[a.frasco]?.icono ?? 'i-ahorro';
  if (a.tipo === 'mesada') {
    titulo = `Mesada del ${_diaSemana(a.fecha)}`;
    detalle = a.frascos > 1 ? `En tus ${a.frascos} frascos` : `En ${FRASCO_INFO[a.frasco].nombre}`;
    frasco = 'ahorrar';
    icono = 'i-ahorro';
  } else if (a.tipo === 'premio') {
    titulo = 'Premio por ahorrar';
    detalle = `${esc(perfil.teNombra)} te lo sumó`;
  } else if (a.tipo === 'mover') {
    titulo = a.nota || 'Moviste dinero';
    detalle = `De ${FRASCO_INFO[a.desde]?.nombre ?? ''} a ${FRASCO_INFO[a.hacia]?.nombre ?? ''}`;
    frasco = a.hacia ?? a.frasco;
    icono = 'i-transferencia';
  } else if (a.tipo === 'meta') {
    titulo = a.nota || 'Tu meta';
    detalle = 'Lo compraste';
  } else {
    const verbo = _VERBO[a.tipo] ?? 'Anotaste';
    titulo = a.nota || verbo;
    detalle = a.nota ? verbo : '';
  }
  const linea = [detalle, _diaCorto(a.fecha, hoyISO)].filter(Boolean).join(' · ');
  const entra = a.tipo !== 'mover' && a.monto > 0;
  const monto = a.tipo === 'mover' ? f(a.monto) : entra ? `+${f(a.monto)}` : `−${f(-a.monto)}`;
  return `
      <li class="klista__fila" data-frasco="${frasco}">
        <span class="knino-teja knino-teja--sm">${iconoCategoria(icono)}</span>
        <span class="knino-pila">
          <span class="klista__titulo">${esc(titulo)}</span>
          <span class="klista__linea"><span class="klista__cuando">${linea}</span><strong class="klista__monto${entra ? ' klista__monto--entra' : ''}">${monto}</strong></span>
        </span>
      </li>`;
}

/** Lo último que anotó el niño, una fila por hecho (ADR 124 D3). */
function _ultimas(perfil, hoyISO) {
  const lista = ultimasAnotaciones(perfil, 4);
  if (!lista.length) return '';
  return `
    <section class="knino-seccion" aria-labelledby="nino-ultimas">
      <h2 class="k-h3" id="nino-ultimas">Lo último que anotaste</h2>
      <ul class="kcard klista">${lista.map(a => _filaAnotacion(a, perfil, hoyISO)).join('')}
      </ul>
    </section>`;
}

/** "sábados", "lunes": el día de la semana que se repite. */
const _cadaDia = (dia) => (dia.endsWith('o') ? `${dia}s` : dia);

/** La mesada que fijó el tutor: cuánto, cada cuánto, la próxima y su reparto. */
function _tarjetaMesada(perfil, hoyISO) {
  const m = perfil.mesada;
  if (!m) return '';
  const prox = proximaMesada(m, hoyISO);
  const dia = DIAS_SEMANA[m.dia] ?? '';
  let titulo;
  let linea;
  if (m.frecuencia === 'mensual') {
    titulo = `${f(m.monto)} cada mes`;
    linea = `Llega el día ${m.dia}.${prox ? ` La próxima: ${_diaLargo(prox)}.` : ''}`;
  } else if (m.frecuencia === 'quincenal') {
    titulo = `${f(m.monto)} cada 15 días`;
    linea = `Llega los ${_cadaDia(dia)}.${prox ? ` La próxima: ${_diaLargo(prox)}.` : ''}`;
  } else {
    titulo = `${f(m.monto)} cada ${dia}`;
    linea = prox ? `La próxima llega el ${_diaLargo(prox)}.` : '';
  }
  return `
    <section class="knino-seccion" aria-labelledby="nino-mesada">
      <h2 class="k-h3" id="nino-mesada">Tu mesada</h2>
      <div class="kcard">
        <div class="knino-pila">
          <p class="knino-mesada__monto">${titulo}</p>
          ${linea ? `<p class="k-body">${linea}</p>` : ''}
        </div>
        <ul class="ktejas ktejas--sm">${FRASCOS.map(fr => `
          <li class="kteja" data-frasco="${fr}"><span class="kteja__nombre">${FRASCO_INFO[fr].nombre}</span><strong class="kteja__monto">${f(Number(m.reparto?.[fr]) || 0)}</strong></li>`).join('')}
        </ul>
      </div>
    </section>`;
}

/** El premio por ahorrar: quién lo da, cuánto y cuándo llega (D4). */
function _tarjetaPremio(perfil, hoyISO) {
  if (!perfil.premio) return '';
  const tasa = TASAS_PREMIO[perfil.premio.tasa];
  const prox = proximoPremio(perfil, hoyISO);
  return `
    <section class="kcard knino-premio" aria-labelledby="nino-premio">
      <div class="knino-fila knino-fila--arriba">
        ${htmlTino('celebra', { tamano: 72 })}
        <div class="knino-pila">
          <h2 class="k-h3" id="nino-premio">Premio por ahorrar</h2>
          <p class="knino-fuerte">${esc(perfil.teNombra)} te suma ${tasa?.texto ?? ''} que guardas.</p>
          <p class="k-body">${prox.monto > 0 ? `El ${_DIA_MES(prox.fechaISO)} recibes ${f(prox.monto)} más.` : 'Guarda en Ahorrar y crecerá cada mes.'}</p>
        </div>
      </div>
      <button class="kbtn kbtn--linea kbtn--block" type="button" data-action="nino-vista" data-vista="aprender">${icon('trending-up')}¿Por qué crece? Unidad 8</button>
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
 * La pantalla responde en semanas y en fecha mientras el niño elige. Con
 * `borrador.id` cambia el plan de la meta que ya tiene (ADR 124 D2).
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
      <h1 class="k-h2 knino-titulo" tabindex="-1">${iconoCategoria('i-metas')}${borrador.id ? 'Cambiar tu meta' : 'Nueva meta'}</h1>
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
      <button class="kbtn kbtn--block" type="submit">${icon('check')}${borrador.id ? 'Guardar mi meta' : 'Crear mi meta'}</button>
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
 * Yo: su dibujo, cuánto lleva, sus insignias y "Cambiar de perfil" (D9,
 * ADR 124 D4). Cada insignia ganada lleva el ícono de su unidad; las que
 * faltan, un candado y el nombre de la unidad.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlYoNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const hechas = unidadesHechasNino(perfil.aprende);
  const semanas = Array.isArray(perfil.aprende?.semanas) ? perfil.aprende.semanas.length : 0;
  const insignias = ruta.map(e => e.estado === 'hecha' || e.estado === 'sabida' ? `
        <li class="kinsignia" data-dom="${e.unidad.dominio}">
          <span class="kinsignia__dibujo" aria-hidden="true">
            <svg viewBox="0 0 120 120"><use href="#il-insignia"/></svg>
            <span class="kinsignia__icono">${iconoCategoria(e.unidad.icono)}</span>
          </span>
          <span class="kinsignia__nombre">${esc(e.unidad.nombre)}</span>
        </li>` : `
        <li class="kinsignia kinsignia--pendiente">
          <span class="kinsignia__vacia" aria-hidden="true">${icon('lock')}</span>
          <span class="kinsignia__nombre">${esc(e.unidad.nombre)}<span class="sr-only">: insignia por ganar</span></span>
        </li>`).join('');
  return `
    <header class="knino-yo">
      ${_avatar(perfil, 64, 'kidav--yo')}
      <h1 class="k-h1" tabindex="-1">${esc(perfil.nombre)}</h1>
      <p class="k-body">${perfil.edad} años</p>
    </header>
    <div class="knino-datos">
      <p class="knino-datos__teja"><strong>${hechas} de ${UNIDADES_NINO.length}</strong><span>unidades listas</span></p>
      <p class="knino-datos__teja"><strong>${semanas}</strong><span>${semanas === 1 ? 'semana aprendiendo' : 'semanas aprendiendo'}</span></p>
    </div>
    <section class="knino-seccion" aria-labelledby="nino-insignias">
      <div class="knino-seccion__cabeza">
        <h2 class="k-h3" id="nino-insignias">Mis insignias</h2>
        <span class="knino-seccion__cuenta">${hechas} de ${UNIDADES_NINO.length}</span>
      </div>
      <ul class="kcard kinsignias">${insignias}
      </ul>
    </section>
    <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="perfil-cambiar">${icon('transferencia')}Cambiar de perfil</button>
    <button class="knino-adulto" type="button" data-action="telefono-adulto">Este teléfono es de un adulto</button>`;
}
