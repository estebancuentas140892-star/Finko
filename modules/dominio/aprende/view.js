/**
 * aprende/view.js - HTML de la ruta (`#aprende`) y de la lección a pantalla
 * completa (`#modal-leccion`), ADR 092 D7 y D8.
 *
 * Solo genera strings. El estado de la lección (la sesión) lo maneja
 * index.js y entra acá como argumento; esta capa no decide nada.
 */

import { S } from '../../core/state.js';
import { f, esc } from '../../infra/utils.js';
import { icon, tejaCategoria, iconoCategoria } from '../../infra/icons.js';
import { htmlFrai, htmlDestellos } from '../../infra/ilustraciones.js';
import {
  estadoRuta, normalizarAprende, leccionDisponible, numeroDePaso, pasoActual,
  pasoListo, RESULTADOS, UNIDADES, ofrecerUbicacion, metaLeccion, unidadDeLeccion, tiposDeEjercicio,
} from './logic.js';

// ── RUTA ─────────────────────────────────────────────────────────

/**
 * Cómo se pinta la ruta: en móvil, tocar una lección la abre; en escritorio
 * la elige y su detalle se ve al lado (APR.4a, diseño 32).
 *
 * @typedef {{ escritorio: boolean, seleccion: string | null }} VistaRuta
 */
/** @type {VistaRuta} */
const _VISTA_MOVIL = { escritorio: false, seleccion: null };

/** Fila de una lección dentro de la unidad abierta. */
function _filaLeccion(leccion, n, hechas, siguienteId, vista) {
  const hecha = Boolean(hechas[leccion.id]);
  const disponible = leccionDisponible(leccion);
  const esSiguiente = leccion.id === siguienteId;
  const estado = hecha ? 'hecha' : esSiguiente ? 'siguiente' : 'despues';
  const punto = hecha ? icon('check') : String(n);
  const meta = hecha
    ? `Hecha · ${leccion.minutos} min`
    : !disponible
      ? 'En preparación'
      : `${leccion.minutos} min${leccion.termina ? ` · termina en ${esc(leccion.termina)}` : ''}`;
  const cuerpo = `
      <span class="aprende-paso__punto" aria-hidden="true">${punto}</span>
      <span class="aprende-paso__cuerpo">
        <span class="aprende-paso__titulo">${esc(leccion.titulo)}</span>
        <span class="aprende-paso__meta">${meta}</span>
      </span>`;
  if (!disponible) {
    return `<li class="aprende-paso aprende-paso--${estado} aprende-paso--pronto">${cuerpo}</li>`;
  }
  if (vista.escritorio) {
    const elegida = leccion.id === vista.seleccion;
    return `
    <li class="aprende-paso aprende-paso--${estado}${elegida ? ' aprende-paso--elegida' : ''}">
      <button class="aprende-paso__boton" type="button" data-action="leccion-ver" data-id="${esc(leccion.id)}"
              aria-label="Ver el detalle de ${esc(leccion.titulo)}"${elegida ? ' aria-current="true"' : ''}>${cuerpo}
        ${elegida ? icon('chevron-right', 'icon aprende-paso__flecha') : ''}
      </button>
    </li>`;
  }
  const accion = hecha ? `Repasar ${esc(leccion.titulo)}` : `Abrir ${esc(leccion.titulo)}`;
  return `
    <li class="aprende-paso aprende-paso--${estado}">
      <button class="aprende-paso__boton" type="button" data-action="leccion-abrir"
              data-id="${esc(leccion.id)}" aria-label="${accion}">${cuerpo}
      </button>
    </li>`;
}

/**
 * Tarjeta de una unidad con sus lecciones a la vista: la actual ("vas aquí")
 * o una que el usuario abrió desde la lista para repasar o adelantarse.
 */
function _tarjetaUnidad(entrada, aprende, eyebrow, vista) {
  const { unidad, hechas: cuantas, total } = entrada;
  const { hechas, enCurso } = aprende;
  const siguiente = unidad.lecciones.find(l => leccionDisponible(l) && !hechas[l.id]);
  const numero = siguiente ? unidad.lecciones.indexOf(siguiente) + 1 : 0;
  const retomar = siguiente && enCurso?.id === siguiente.id;
  // En escritorio el único primario es "Empezar lección" del detalle.
  const boton = siguiente && !vista.escritorio
    ? `<button class="btn btn-primary aprende-unidad__cta" type="button" data-action="leccion-abrir"
               data-id="${esc(siguiente.id)}">${retomar ? 'Seguir' : 'Empezar'} la lección ${numero}</button>`
    : '';
  return `
    <section class="aprende-unidad aprende-unidad--actual" data-dom="${unidad.dominio}"
             aria-labelledby="aprende-unidad-${unidad.id}">
      <p class="aprende-unidad__eyebrow">${eyebrow}</p>
      <div class="aprende-unidad__cabeza">
        <h2 class="aprende-unidad__nombre" id="aprende-unidad-${unidad.id}">${esc(unidad.nombre)}</h2>
        <span class="aprende-unidad__cuenta">${cuantas} de ${total}</span>
      </div>
      <ol class="aprende-pasos">
        ${unidad.lecciones.map((l, i) => _filaLeccion(l, i + 1, hechas, siguiente?.id, vista)).join('')}
      </ol>
      ${boton}
    </section>`;
}

/**
 * Fila compacta de una unidad que no es la actual. Si tiene lecciones
 * escritas es un botón que la despliega en su lugar (nada se bloquea, D8);
 * si está en preparación, solo dice a dónde llevará.
 */
function _filaUnidad(entrada, aprende, abierta, vista) {
  const { unidad, estado } = entrada;
  const disponibles = unidad.lecciones.filter(leccionDisponible).length;
  if (disponibles && abierta === unidad.id) {
    const etiqueta = estado === 'hecha' ? 'hecha' : estado === 'sabida' ? 'ya la sabes' : 'después';
    return `<li class="aprende-fila-abierta">${_tarjetaUnidad(entrada, aprende, `Unidad ${unidad.numero} · ${etiqueta}`, vista)}
      <button class="btn btn-ghost btn-sm aprende-fila-abierta__cerrar" type="button" data-action="aprende-unidad"
              data-id="${unidad.id}" aria-expanded="true">Cerrar la unidad ${unidad.numero}</button></li>`;
  }
  let meta;
  if (estado === 'hecha') meta = 'Hecha · Repasar';
  else if (estado === 'sabida') meta = 'Ya lo sabes · Repasar';
  else if (!disponibles) meta = `Termina en ${esc(unidad.termina)} · En preparación`;
  else meta = `${unidad.lecciones.length} lecciones · termina en ${esc(unidad.termina)}`;
  const cuerpo = `
      <span class="aprende-fila__numero" aria-hidden="true">${unidad.numero}</span>
      <span class="aprende-fila__cuerpo">
        <span class="aprende-fila__nombre">${esc(unidad.nombre)}</span>
        <span class="aprende-fila__meta">${meta}</span>
      </span>`;
  if (!disponibles) return `<li class="aprende-fila" data-dom="${unidad.dominio}">${cuerpo}</li>`;
  return `
    <li class="aprende-fila aprende-fila--boton" data-dom="${unidad.dominio}">
      <button class="aprende-fila__boton" type="button" data-action="aprende-unidad" data-id="${unidad.id}"
              aria-expanded="false">${cuerpo}</button>
    </li>`;
}

/** Ícono de la sección donde termina cada unidad: el de la barra lateral. */
const _ICONO_SECCION = {
  tesoreria: 'cuentas', presupuesto: 'presupuesto', fondo: 'ahorro', metas: 'metas',
  compromisos: 'deudas', inversion: 'inversion', analisis: 'analisis',
};

/**
 * Detalle de la lección elegida, al lado de la ruta en escritorio (APR.4a,
 * diseño 32): qué vas a aprender, con qué ejercicios y dónde termina. Las
 * viñetas y los tipos salen del contenido de la unidad, que llega con
 * `import()` (D11): mientras carga, el detalle se pinta sin ellos.
 *
 * @param {string} id
 * @param {ReturnType<typeof normalizarAprende>} aprende
 * @param {{ aprendes?: string[], pasos?: any[] } | null} contenido
 * @returns {string}
 */
function _detalleLeccion(id, aprende, contenido) {
  const meta = metaLeccion(id);
  const unidad = unidadDeLeccion(id);
  if (!meta || !unidad) return '';
  const numero = unidad.lecciones.indexOf(meta) + 1;
  const boton = aprende.hechas[id] ? 'Repasar lección'
    : aprende.enCurso?.id === id ? 'Seguir donde quedaste' : 'Empezar lección';
  const aprendes = contenido?.aprendes ?? [];
  const tipos = tiposDeEjercicio(contenido);
  const vinetas = aprendes.length ? `
      <div class="aprende-detalle__aprendes">
        <h3 class="aprende-detalle__subtitulo">Vas a aprender</h3>
        <ul class="aprende-detalle__lista">${aprendes.map(t => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>
      </div>` : '';
  const chips = tipos.length
    ? `<ul class="aprende-detalle__tipos" aria-label="Ejercicios de la lección">${tipos.map(t => `<li class="chip">${esc(t)}</li>`).join('')}</ul>`
    : '';
  return `
    <aside class="aprende-detalle" data-dom="${unidad.dominio}" aria-labelledby="aprende-detalle-titulo">
      <p class="aprende-detalle__eyebrow">Lección ${numero} · ${meta.minutos} minutos</p>
      <h2 class="aprende-detalle__titulo" id="aprende-detalle-titulo">${esc(meta.titulo)}</h2>
      ${vinetas}
      ${chips}
      <div class="aprende-detalle__termina">
        <span class="aprende-detalle__teja" aria-hidden="true">${icon(_ICONO_SECCION[unidad.seccion] ?? 'arrow-right')}</span>
        <p class="aprende-detalle__destino"><span>Termina en</span><strong>${esc(meta.termina ?? unidad.termina)}</strong></p>
      </div>
      <button class="btn btn-primary aprende-detalle__cta" type="button" data-action="leccion-abrir"
              data-id="${esc(id)}">${boton}</button>
    </aside>`;
}

/**
 * HTML de la ruta completa: la unidad actual abierta y el resto en dos
 * grupos, lo que ya está y lo que viene. Nada se bloquea (D8).
 *
 * En escritorio (APR.4a) la ruta va en dos columnas: a la izquierda las
 * unidades, a la derecha el detalle de la lección elegida con su "Empezar
 * lección", que es el único primario de la pantalla.
 *
 * @param {unknown} aprendeCrudo - `S.aprende`.
 * @param {string | null} [abierta] - unidad que el usuario desplegó en la lista.
 * @param {{ seleccion: string | null, contenido: any } | null} [escritorio] - la
 *   lección elegida y su contenido, si ya cargó; `null` en móvil.
 * @returns {string}
 */
export function htmlRuta(aprendeCrudo, abierta = null, escritorio = null) {
  const aprende = normalizarAprende(aprendeCrudo);
  const ruta = estadoRuta(aprende);
  /** @type {VistaRuta} */
  const vista = escritorio ? { escritorio: true, seleccion: escritorio.seleccion } : _VISTA_MOVIL;
  const actual = ruta.find(e => e.estado === 'actual');
  const yaEsta = ruta.filter(e => e.estado === 'hecha' || e.estado === 'sabida');
  const despues = ruta.filter(e => e.estado === 'despues');
  const grupo = (titulo, id, filas) => filas.length ? `
    <section class="aprende-grupo" aria-labelledby="${id}">
      <h2 class="aprende-grupo__titulo" id="${id}">${titulo}</h2>
      <ul class="aprende-filas">${filas.map(e => _filaUnidad(e, aprende, abierta, vista)).join('')}</ul>
    </section>` : '';
  // Sin unidad actual es que no queda ninguna lección escrita por hacer:
  // se dice, en vez de dejar la ruta sin su tarjeta principal y sin motivo.
  // Solo se habla de unidades en preparación si de verdad queda alguna.
  const enPreparacion = ruta.some(e => !e.unidad.lecciones.some(leccionDisponible));
  const cabeza = actual
    ? _tarjetaUnidad(actual, aprende, `Unidad ${actual.unidad.numero} · vas aquí`, vista)
    : enPreparacion
      ? `<p class="aprende-ruta__aviso">Ya hiciste todas las lecciones disponibles. Las próximas unidades están en preparación; mientras tanto, puedes repasar las que ya hiciste.</p>`
      : `<p class="aprende-ruta__aviso">Terminaste las ${ruta.length} unidades de la ruta. Puedes repasar cualquier lección cuando quieras.</p>`;
  // La prueba de ubicación es opcional al empezar (D9): va debajo de la
  // lección recomendada, que sigue siendo lo primero.
  const prueba = ofrecerUbicacion(aprende) ? `
    <section class="aprende-ubicacion" aria-labelledby="aprende-ubicacion-titulo">
      <h2 class="aprende-ubicacion__titulo" id="aprende-ubicacion-titulo">¿Ya sabes algo de esto?</h2>
      <p class="aprende-ubicacion__texto">Responde 4 preguntas y empieza en la unidad que te toca. "Todavía no lo sé" también es una respuesta.</p>
      <button class="btn btn-secondary btn-sm aprende-ubicacion__cta" type="button" data-action="ubicacion-abrir">Hacer la prueba · 2 min</button>
    </section>` : '';
  const unidades = `
      ${cabeza}
      ${prueba}
      ${grupo('Ya lo sabes', 'aprende-grupo-sabes', yaEsta)}
      ${grupo('Después', 'aprende-grupo-despues', despues)}`;
  if (!escritorio) return `<div class="aprende-ruta">${unidades}</div>`;
  const detalle = escritorio.seleccion ? _detalleLeccion(escritorio.seleccion, aprende, escritorio.contenido) : '';
  return `
    <div class="aprende-ruta aprende-ruta--escritorio${detalle ? ' aprende-ruta--con-detalle' : ''}">
      <div class="aprende-ruta__unidades">${unidades}</div>
      ${detalle}
    </div>`;
}

/**
 * Pinta la ruta en `#panel-aprende`.
 * @param {string | null} [abierta] - unidad desplegada en la lista.
 * @param {{ seleccion: string | null, contenido: any } | null} [escritorio]
 */
export function renderRuta(abierta = null, escritorio = null) {
  const panel = document.getElementById('panel-aprende');
  if (!panel) return;
  panel.innerHTML = htmlRuta(S.aprende, abierta, escritorio);
}

// ── LECCIÓN ──────────────────────────────────────────────────────

/**
 * Marcadores que una lección puede usar en sus textos, para no escribir a
 * mano cifras que cambian: `{tope}` (gasto pequeño vigente) y, desde la unidad
 * 9, los valores legales del año (`{uvt}`, `{exento4x1000}`, `{topeRenta}`,
 * `{anio}`), que salen de `core/constants.js` (ADN 12).
 */
function _texto(t, ctx) {
  let texto = String(t ?? '').replaceAll('{tope}', f(ctx.tope));
  for (const [clave, valor] of Object.entries(ctx.valores ?? {})) {
    texto = texto.replaceAll(`{${clave}}`, valor);
  }
  return esc(texto);
}

/** Barra superior: salir, avance y contador "n de N" (o "Lista"). */
function _barra(sesion, terminada) {
  const n = terminada ? sesion.total : numeroDePaso(sesion);
  const segmentos = Array.from({ length: sesion.total }, (_, i) =>
    `<i${i < n ? ' class="is-on"' : ''}></i>`).join('');
  const salir = terminada
    ? 'Cerrar y volver a la ruta'
    : 'Salir de la lección. Tu avance se guarda';
  // En escritorio la salida se lee, no solo se adivina por la X (ADR 092 D2).
  const texto = terminada ? 'Cerrar' : 'Salir · tu avance se guarda';
  const progreso = terminada
    ? `<div class="leccion__prog" aria-hidden="true">${segmentos}</div>`
    : `<div class="leccion__prog" role="progressbar" aria-valuemin="0" aria-valuemax="${sesion.total}"
            aria-valuenow="${n}" aria-label="Paso ${n} de ${sesion.total}">${segmentos}</div>`;
  return `
    <div class="leccion__top">
      <button class="btn btn-icon btn-ghost leccion__salir" type="button"
              data-action="leccion-salir" aria-label="${salir}">${icon('x')}<span class="leccion__salir-texto">${texto}</span></button>
      ${progreso}
      <span class="leccion__cuenta">${terminada ? 'Lista' : `${n} de ${sesion.total}`}</span>
    </div>`;
}

/**
 * La lección que se pinta ahora es del niño (APR.3c, ADR 093 D9). Lo fija
 * `htmlLeccion()` al empezar, que es síncrona: así los pasos no reciben un
 * argumento más solo para cambiar de piel.
 */
let _nino = false;

/** Panel de retroalimentación: "Así es" o "Casi", nunca rojo (D7). */
function _feedback(correcto, texto, boton, nota = '', tituloPropio = '') {
  const clase = correcto ? 'leccion-fb--bien' : 'leccion-fb--casi';
  const accion = boton.accion ?? 'leccion-continuar';
  if (_nino) {
    // Frai celebra lo correcto y anima tras un error; nunca se ve triste (D7).
    const titulo = tituloPropio || (correcto ? '¡Así es!' : '¡Casi!');
    const texto2 = correcto ? 'Siguiente' : 'Sigamos';
    return `
    <div class="leccion-fb ${clase} leccion-fb--nino" role="status">
      <div class="leccion-fb__fila">
        ${htmlFrai(correcto ? 'celebra' : 'anima', { tamano: 80 })}
        <div class="leccion-fb__cuerpo">
          <p class="leccion-fb__titulo" id="leccion-fb-titulo" tabindex="-1">${titulo}</p>
          ${texto ? `<p class="leccion-fb__texto">${texto}</p>` : ''}
        </div>
      </div>
      <button class="kbtn kbtn--block" type="button" data-action="${accion}">${boton.texto === 'Continuar' || boton.texto === 'Entendido' ? texto2 : boton.texto}</button>
      ${nota ? `<p class="leccion-fb__nota">${nota}</p>` : ''}
    </div>`;
  }
  const titulo = tituloPropio || (correcto ? 'Así es' : 'Casi');
  const ico = correcto ? icon('check') : icon('lightbulb');
  return `
    <div class="leccion-fb ${clase}" role="status">
      <p class="leccion-fb__titulo" id="leccion-fb-titulo" tabindex="-1">${ico}${titulo}</p>
      ${texto ? `<p class="leccion-fb__texto">${texto}</p>` : ''}
      <button class="btn btn-primary leccion__boton" type="button" data-action="${accion}">${boton.texto}</button>
      ${nota ? `<p class="leccion-fb__nota">${nota}</p>` : ''}
    </div>`;
}

const _NOTA_VUELVE = 'Equivocarte no te quita nada. Esta pregunta vuelve al final.';

function _pasoConcepto(paso, ctx) {
  if (_nino) {
    // Frai explica la idea en su globo (D9): una por pantalla.
    return {
      cuerpo: `
        <p class="leccion__eyebrow leccion__eyebrow--dom">${esc(ctx.eyebrow)}</p>
        <div class="leccion-nino__idea">
          ${htmlFrai('explica', { tamano: 112 })}
          <h2 class="leccion-nino__globo" id="leccion-titulo" tabindex="-1">${_texto(paso.titulo, ctx)}</h2>
        </div>
        ${paso.texto ? `<p class="leccion__texto">${_texto(paso.texto, ctx)}</p>` : ''}`,
      pie: `<button class="kbtn kbtn--block" type="button" data-action="leccion-continuar">Siguiente</button>`,
    };
  }
  return {
    cuerpo: `
      <p class="leccion__eyebrow leccion__eyebrow--dom">${esc(ctx.eyebrow)}</p>
      <h2 class="leccion__titulo leccion__titulo--grande" id="leccion-titulo" tabindex="-1">${_texto(paso.titulo, ctx)}</h2>
      ${paso.texto ? `<p class="leccion__texto">${_texto(paso.texto, ctx)}</p>` : ''}
      ${paso.nota ? `<p class="leccion__nota-info">${icon('info')}<span>${_texto(paso.nota, ctx)}</span></p>` : ''}`,
    pie: `<button class="btn btn-primary leccion__boton" type="button" data-action="leccion-continuar">Continuar</button>`,
  };
}

function _pasoElegir(paso, sesion, ctx) {
  const rev = sesion.revision;
  const letras = 'ABCDEFGH';
  const opciones = paso.opciones.map((texto, i) => {
    const correcta = rev && i === paso.correcta;
    const elegida = rev && i === rev.elegida;
    const clases = ['leccion-opcion'];
    if (correcta) clases.push('leccion-opcion--correcta');
    else if (elegida) clases.push('leccion-opcion--elegida');
    let etiqueta = '';
    if (elegida) etiqueta = `<span class="chip ${correcta ? 'chip-success' : 'chip-info'} leccion-opcion__tag">Tu respuesta</span>`;
    else if (correcta) etiqueta = `<span class="chip chip-success leccion-opcion__tag">${_nino ? 'Esta era' : 'Esta es'}</span>`;
    return `
      <button class="${clases.join(' ')}" type="button" role="radio" aria-checked="${elegida ? 'true' : 'false'}"
              data-action="leccion-elegir" data-idx="${i}"${rev ? ' aria-disabled="true"' : ''}>
        <span class="leccion-opcion__letra" aria-hidden="true">${letras[i]}</span>
        <span class="leccion-opcion__texto">${_texto(texto, ctx)}</span>${etiqueta}
      </button>`;
  }).join('');
  const noSe = paso.noSe ? _opcionNoSe(rev) : '';
  const fb = rev ? _feedbackElegir(paso, sesion, rev, ctx) : '';
  return {
    cuerpo: `
      <p class="leccion__eyebrow">${esc(sesion.repaso ? 'Otra vez' : paso.etiqueta ?? 'Elige una')}</p>
      <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
      <div class="leccion-opciones" role="radiogroup" aria-labelledby="leccion-titulo">${opciones}${noSe}</div>`,
    fb,
  };
}

/** "Todavía no lo sé" (D9): una respuesta válida, con su letra "?". */
function _opcionNoSe(rev) {
  const elegida = rev?.elegida === -1;
  return `
      <button class="leccion-opcion${elegida ? ' leccion-opcion--elegida' : ''}" type="button" role="radio"
              aria-checked="${elegida ? 'true' : 'false'}" data-action="leccion-elegir" data-idx="-1"${rev ? ' aria-disabled="true"' : ''}>
        <span class="leccion-opcion__letra" aria-hidden="true">?</span>
        <span class="leccion-opcion__texto">Todavía no lo sé</span>${elegida ? '<span class="chip chip-info leccion-opcion__tag">Tu respuesta</span>' : ''}
      </button>`;
}

/**
 * Retroalimentación de "elegir". En una lección, el error vuelve al final.
 * En la prueba de ubicación (`ctx.sinRepetir`) nada vuelve: se dice en qué
 * unidad se aprende y se sigue con la siguiente pregunta.
 */
function _feedbackElegir(paso, sesion, rev, ctx) {
  if (!ctx.sinRepetir) {
    return rev.correcto
      ? _feedback(true, _texto(paso.bien, ctx), { texto: 'Continuar' })
      : _feedback(false, _texto(paso.casi?.[rev.elegida], ctx), { texto: 'Entendido' }, _NOTA_VUELVE);
  }
  const boton = { texto: sesion.pos >= sesion.cola.length - 1 ? 'Ver mi resultado' : 'Siguiente pregunta' };
  if (rev.correcto) return _feedback(true, _texto(paso.bien, ctx), boton);
  const unidad = UNIDADES.find(u => u.id === paso.unidad);
  const nota = unidad ? `Lo ves en la unidad ${unidad.numero}, ${esc(unidad.nombre)}.` : '';
  return rev.elegida === -1
    ? _feedback(false, _texto(paso.bien, ctx), boton, nota, 'Sin problema')
    : _feedback(false, _texto(paso.casi?.[rev.elegida], ctx), boton, nota);
}

function _pasoClasificar(paso, sesion, ctx) {
  const { cola, si, no } = sesion.tarjetas;
  const total = paso.tarjetas.length;
  const rev = sesion.revision;
  if (!cola.length) {
    return {
      cuerpo: `
        <p class="leccion__eyebrow">${esc(paso.etiqueta ?? 'Clasifica')}</p>
        <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
        <p class="leccion__conteo">${esc(paso.si)}: ${si} · ${esc(paso.no)}: ${no}</p>`,
      fb: _feedback(true, _texto(paso.bien ?? 'Separaste lo pequeño que se repite de lo grande que planeas.', ctx), { texto: 'Continuar' }),
    };
  }
  const arriba = paso.tarjetas[cola[0]];
  const numero = total - cola.length + 1;
  const fondo = cola.length > 2 ? '<div class="leccion-tarjeta leccion-tarjeta--fondo2" aria-hidden="true"></div>' : '';
  const medio = cola.length > 1 ? '<div class="leccion-tarjeta leccion-tarjeta--fondo1" aria-hidden="true"></div>' : '';
  // Tras un error, la tarjeta que se ve y se explica es la que se falló, que
  // ya volvió al fondo del mazo: `arriba` es la siguiente.
  const visible = rev ? paso.tarjetas[rev.elegida] : arriba;
  const fb = rev
    ? _feedback(false, _texto(visible.casi, ctx), { texto: 'Entendido', accion: 'leccion-seguir' },
      'Equivocarte no te quita nada. Esta tarjeta vuelve al final.')
    : '';
  return {
    cuerpo: `
      <p class="leccion__eyebrow">${esc(paso.etiqueta ?? 'Clasifica')} · tarjeta ${Math.min(numero, total)} de ${total}</p>
      <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
      <p class="leccion__ayuda">${_texto(paso.ayuda, ctx)}</p>
      <div class="leccion-mazo">
        <span class="leccion-mazo__pista leccion-mazo__pista--no" aria-hidden="true">${esc(paso.no)}</span>
        <span class="leccion-mazo__pista leccion-mazo__pista--si" aria-hidden="true">${esc(paso.si)}</span>
        ${fondo}${medio}
        <div class="leccion-tarjeta leccion-tarjeta--arriba" data-tarjeta>
          ${tejaCategoria(visible.icono || 'c-otros', 'gastos')}
          <p class="leccion-tarjeta__titulo">${esc(visible.titulo)}</p>
          ${visible.monto != null ? `<p class="leccion-tarjeta__monto">${f(visible.monto)}</p>` : ''}
          <p class="leccion-tarjeta__detalle">${esc(visible.detalle)}</p>
        </div>
      </div>
      <div class="leccion-clasificar" role="group" aria-label="Clasificar esta tarjeta">
        <button class="leccion-clasificar__boton" type="button" data-action="leccion-clasificar" data-lado="no"
                ${rev ? 'aria-disabled="true"' : ''}>${icon('arrow-left')}${esc(paso.no)}</button>
        <button class="leccion-clasificar__boton" type="button" data-action="leccion-clasificar" data-lado="si"
                ${rev ? 'aria-disabled="true"' : ''}>${esc(paso.si)}${icon('arrow-right')}</button>
      </div>
      <p class="leccion__conteo">
        <span class="chip">${esc(paso.si)}: ${si}</span>
        <span class="chip">${esc(paso.no)}: ${no}</span>
        <span class="leccion__conteo-faltan">Faltan ${cola.length}</span>
      </p>`,
    fb,
  };
}

/**
 * Resultado de un paso "control": se pinta aparte porque el deslizador lo
 * reescribe en cada movimiento sin repintar el paso (el foco no se pierde).
 *
 * @param {any} paso
 * @param {Record<string, number>} valores
 * @returns {string}
 */
export function htmlResultadoControl(paso, valores) {
  const resultado = RESULTADOS[paso.calculo];
  if (!resultado) return '';
  const r = resultado(valores);
  return `
    <p class="leccion-resultado__lead">${esc(r.lead)}</p>
    <p class="leccion-resultado__cifra">${esc(r.cifra)}</p>
    <p class="leccion-resultado__linea">${esc(r.linea)}</p>`;
}

function _pasoControl(paso, sesion, ctx) {
  const controles = paso.controles.map(c => {
    const valor = sesion.valores[c.id];
    const etiquetaId = `leccion-control-${c.id}`;
    if (c.opciones) {
      const chips = c.opciones.map(op => `
        <button class="leccion-chip" type="button" role="radio" aria-checked="${op === valor ? 'true' : 'false'}"
                data-action="leccion-control" data-control="${esc(c.id)}" data-valor="${op}">${f(op)}</button>`).join('');
      return `
        <div class="leccion-control">
          <p class="leccion-control__etiqueta" id="${etiquetaId}">${esc(c.etiqueta)}</p>
          <div class="leccion-chips" role="radiogroup" aria-labelledby="${etiquetaId}">${chips}</div>
        </div>`;
    }
    // Con pocos valores se rotula cada uno; con muchos, solo los extremos.
    const marcas = c.max - c.min <= 10
      ? Array.from({ length: c.max - c.min + 1 }, (_, i) => `<span>${c.min + i}</span>`).join('')
      : `<span>${c.min}</span><span>${c.max}</span>`;
    return `
      <div class="leccion-control">
        <div class="leccion-control__fila">
          <label class="leccion-control__etiqueta" for="${etiquetaId}">${esc(c.etiqueta)}</label>
          <span class="leccion-control__valor" data-control-valor="${esc(c.id)}">${valor}${c.sufijo ? esc(c.sufijo) : ''}</span>
        </div>
        <input class="leccion-rango" id="${etiquetaId}" type="range" min="${c.min}" max="${c.max}" step="1"
               value="${valor}" data-control="${esc(c.id)}">
        <div class="leccion-rango__marcas" aria-hidden="true">${marcas}</div>
      </div>`;
  }).join('');
  return {
    cuerpo: `
      <p class="leccion__eyebrow">${esc(paso.etiqueta ?? 'Mueve el control')}</p>
      <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
      ${controles}
      <div class="leccion-resultado" id="leccion-resultado" role="status">${htmlResultadoControl(paso, sesion.valores)}</div>`,
    pie: `<button class="btn btn-primary leccion__boton" type="button" data-action="leccion-continuar">Continuar</button>`,
  };
}

function _pasoOrdenar(paso, sesion, ctx) {
  const rev = sesion.revision;
  // El asa se arrastra (D7); las flechas son la alternativa con teclado.
  const asa = rev ? '' : `<span class="leccion-orden__asa" data-orden-asa aria-hidden="true">${icon('grip')}</span>`;
  const filas = sesion.orden.map((item, i) => `
    <li class="leccion-orden__item${rev ? (rev.correcto ? ' leccion-orden__item--bien' : '') : ''}" data-orden="${i}">
      ${asa}
      <span class="leccion-orden__numero" aria-hidden="true">${i + 1}</span>
      <span class="leccion-orden__texto">${_texto(paso.items[item], ctx)}</span>
      <span class="leccion-orden__flechas">
        <button class="btn btn-icon btn-ghost" type="button" data-action="leccion-mover" data-idx="${i}" data-dir="-1"
                aria-label="Subir: ${_texto(paso.items[item], ctx)}"${i === 0 || rev ? ' disabled' : ''}>${icon('chevron-up')}</button>
        <button class="btn btn-icon btn-ghost" type="button" data-action="leccion-mover" data-idx="${i}" data-dir="1"
                aria-label="Bajar: ${_texto(paso.items[item], ctx)}"${i === sesion.orden.length - 1 || rev ? ' disabled' : ''}>${icon('chevron-down')}</button>
      </span>
    </li>`).join('');
  const fb = rev
    ? rev.correcto
      ? _feedback(true, _texto(paso.bien, ctx), { texto: 'Continuar' })
      : _feedback(false, _texto(paso.casi, ctx), { texto: 'Entendido' }, _NOTA_VUELVE)
    : '';
  return {
    cuerpo: `
      <p class="leccion__eyebrow">${esc(sesion.repaso ? 'Otra vez' : paso.etiqueta ?? 'Ordena los pasos')}</p>
      <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
      <p class="leccion__ayuda">Arrastra cada paso o usa las flechas.</p>
      <ol class="leccion-orden">${filas}</ol>`,
    pie: rev ? '' : `<button class="btn btn-primary leccion__boton" type="button" data-action="leccion-comprobar">Comprobar</button>`,
    fb,
  };
}

/** Filas del Aplícalo: hasta tres, con su ícono, detalle y monto. */
function _filas(filas) {
  if (!filas?.length) return '';
  const fila = (r) => `
    <li class="leccion-aplica__grupo">
      ${r.icono ? tejaCategoria(r.icono, 'gastos') : ''}
      <span class="leccion-aplica__grupo-nombre">${esc(r.nombre)}${r.detalle ? ` <span class="leccion-aplica__grupo-cuantos">${esc(r.detalle)}</span>` : ''}</span>
      ${r.monto ? `<span class="leccion-aplica__grupo-monto">${esc(r.monto)}</span>` : ''}
    </li>`;
  return `<ul class="leccion-aplica__grupos">${filas.map(fila).join('')}</ul>`;
}

/** Un botón del Aplícalo con sus `data-*`, sin HTML en el modelo. */
function _botonAplica(a) {
  const datos = a.datos ?? {};
  const attrs = [
    datos.target ? ` data-target="${esc(datos.target)}"` : '',
    datos.targetAction ? ` data-target-action="${esc(datos.targetAction)}"` : '',
    datos.monto != null ? ` data-monto="${esc(String(datos.monto))}"` : '',
    datos.id ? ` data-id="${esc(datos.id)}"` : '',
  ].join('');
  const clase = a.estilo === 'ghost' ? 'btn-ghost' : 'btn-primary';
  return `<button class="btn ${clase} leccion__boton" type="button" data-action="${esc(a.action)}"${attrs}>${esc(a.texto)}</button>`;
}

/**
 * Cabeza del cierre. Celebración proporcional (D7): una lección, el chulo;
 * la lección que completa la unidad por primera vez, la insignia en el color
 * de la unidad (`badgeIn`). Sin confeti ni personaje en el adulto.
 */
function _cabezaCierre(ctx) {
  if (ctx.celebrarUnidad && ctx.unidad) {
    return `
    <div class="leccion-lista leccion-lista--unidad">
      <svg class="leccion-insignia" aria-hidden="true"><use href="#il-insignia"/></svg>
      <div>
        <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">Terminaste la unidad ${ctx.unidad.numero}</h2>
        <p class="leccion-lista__linea">${esc(ctx.unidad.aprendiste ?? ctx.unidad.nombre)}</p>
      </div>
    </div>`;
  }
  const avance = ctx.unidad && ctx.avance
    ? `<p class="leccion-lista__linea">Llevas ${ctx.avance.hechas} de ${ctx.avance.total} en ${esc(ctx.unidad.nombre)}.</p>`
    : '';
  return `
    <div class="leccion-lista">
      <span class="leccion-lista__check" aria-hidden="true">${icon('check')}</span>
      <div>
        <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">Lección lista</h2>
        ${avance}
      </div>
    </div>`;
}

/**
 * Cierre de la lección: la celebración y el Aplícalo con tus datos (D7). El
 * modelo lo arma `aplica.js` según la unidad; acá solo se pinta.
 */
function _pasoAplica(ctx) {
  const m = ctx.aplica;
  const cabeza = _cabezaCierre(ctx);
  if (!m) return { cuerpo: cabeza, pie: '<button class="btn btn-ghost leccion__boton" type="button" data-action="leccion-salir">Volver a la ruta</button>' };
  const extra = m.extra
    ? `<p class="leccion-aplica__logro">${icon('trophy')}<span>${esc(m.extra.texto)}${m.extra.fuerte ? `<strong>${esc(m.extra.fuerte)}</strong>` : ''}${esc(m.extra.despues ?? '')}</span></p>`
    : '';
  const [primera, ...resto] = m.acciones ?? [];
  return {
    cuerpo: `${cabeza}
      <section class="leccion-aplica" aria-labelledby="leccion-aplica-titulo">
        <p class="leccion__eyebrow leccion__eyebrow--dom">Aplícalo con tus datos</p>
        <h3 class="leccion-aplica__lead" id="leccion-aplica-titulo">${esc(m.lead)}</h3>
        ${m.cifra ? `<p class="leccion-aplica__cifra">${esc(m.cifra)}</p>` : ''}
        ${m.linea ? `<p class="leccion-aplica__linea">${esc(m.linea)}</p>` : ''}
        ${_filas(m.filas)}
      </section>
      ${extra}`,
    pie: `
      ${primera ? _botonAplica(primera) : ''}
      ${m.nota ? `<p class="leccion__nota">${esc(m.nota)}</p>` : ''}
      ${resto.map(_botonAplica).join('')}
      <button class="btn btn-ghost leccion__boton" type="button" data-action="leccion-salir">Ahora no</button>`,
  };
}

// ── RESULTADO DE LA PRUEBA DE UBICACIÓN (D9) ─────────────────────

/** Unidades que el resultado lista antes de resumir el resto (diseño: cinco). */
const _FILAS_RESULTADO = 5;
const _CUANTAS = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];

/** "a, b y c", con "e" delante de una palabra que suena a "i". */
function _enumerar(palabras) {
  if (palabras.length < 2) return palabras.join('');
  const ultima = palabras.at(-1);
  const y = /^h?i(?![aeiouáéó])/i.test(ultima) ? 'e' : 'y';
  return `${palabras.slice(0, -1).join(', ')} ${y} ${ultima}`;
}

/**
 * Dónde empiezas, qué quedó como sabido y la salida para empezar desde la
 * unidad 1 (D9). Las sabidas siguen abiertas para repasar.
 *
 * @param {{ sabidas: string[], empieza: any }} resultado
 */
function _resultadoUbicacion({ sabidas, empieza }, catalogo = UNIDADES) {
  const numeros = catalogo.filter(u => sabidas.includes(u.id)).map(u => u.numero);
  const n = numeros.length;
  const titulo = empieza ? `Empiezas en la unidad ${empieza.numero}` : 'Ya sabes lo de toda la ruta';
  const linea = n === 0
    ? 'Empiezas por lo básico, a tu ritmo. Nada está cerrado: puedes abrir cualquier unidad cuando quieras.'
    : `Respondiste bien lo de ${n === 1 ? 'la unidad' : 'las unidades'} ${_enumerar(numeros.map(String))}. ${n === 1 ? 'La marcamos como sabida y sigue abierta' : 'Las marcamos como sabidas y siguen abiertas'} para repasar.`;
  const visibles = Math.max(_FILAS_RESULTADO, (empieza?.numero ?? 0) + 1);
  const filas = catalogo.slice(0, visibles).map(u => {
    const [chip, texto] = sabidas.includes(u.id)
      ? ['chip-success', 'Ya lo sabes']
      : u.id === empieza?.id ? ['chip-accent', 'Empiezas aquí'] : ['', 'Después'];
    return `
        <li class="ubicacion-unidad${u.id === empieza?.id ? ' ubicacion-unidad--actual' : ''}" data-dom="${u.dominio}">
          <span class="ubicacion-unidad__numero" aria-hidden="true">${u.numero}</span>
          <span class="ubicacion-unidad__nombre">${esc(u.nombre)}</span>
          <span class="chip ${chip}">${texto}</span>
        </li>`;
  }).join('');
  const resto = catalogo.slice(visibles);
  // El primer nombre de cada unidad, en minúscula: "deudas, crédito, invertir e impuestos".
  const restoTxt = resto.length
    ? `Y ${resto.length} ${resto.length === 1 ? 'unidad' : 'unidades'} más: ${esc(_enumerar(resto.map(u => u.corto ?? u.nombre.split(/[\s:]/)[0].toLowerCase())))}.`
    : '';
  // El niño no tiene "Tu progreso": lo sabido es una insignia en "Yo".
  const donde = _nino ? 'ya es una insignia en Yo' : 'cuenta en Tu progreso';
  const cuentan = n === 0 ? '' : n === 1
    ? `La que ya sabes ${donde}.`
    : `Las ${_CUANTAS[n] ?? n} que ya sabes ${_nino ? 'ya son insignias en Yo' : 'cuentan en Tu progreso'}.`;
  const nota = [restoTxt, cuentan].filter(Boolean).join(' ');
  return {
    cuerpo: `
      <p class="leccion__eyebrow">Prueba de ubicación</p>
      <h2 class="leccion__titulo leccion__titulo--grande" id="leccion-titulo" tabindex="-1">${titulo}</h2>
      <p class="leccion__texto">${linea}</p>
      <ul class="ubicacion-unidades">${filas}</ul>
      ${nota ? `<p class="ubicacion-resto">${nota}</p>` : ''}`,
    pie: _nino ? `
      <button class="kbtn kbtn--block" type="button" data-action="leccion-salir-a" data-vista="aprender">Ver mi ruta</button>
      ${n ? '<button class="kbtn kbtn--soft kbtn--block" type="button" data-action="ubicacion-desde-1">Prefiero empezar desde la unidad 1</button>' : ''}` : `
      <button class="btn btn-primary leccion__boton" type="button" data-action="ubicacion-inicio">Ir a mi Inicio</button>
      ${n ? '<button class="btn btn-ghost leccion__boton" type="button" data-action="ubicacion-desde-1">Prefiero empezar desde la unidad 1</button>' : ''}`,
  };
}

// ── CIERRE DEL NIÑO (APR.3c, ADR 093 D9) ─────────────────────────

const _NOMBRE_FRASCO = { ahorrar: 'Ahorrar', gastar: 'Gastar', compartir: 'Compartir' };
const _ICONO_FRASCO = { ahorrar: 'i-ahorro', gastar: 'c-tienda', compartir: 'c-regalo' };

/**
 * Cierre de la lección del niño: Frai celebra (con insignia de 88 px y
 * destellos si terminó la unidad) y "Úsalo de verdad", una pregunta sobre
 * un frasco de su alcancía con lo que tiene ahí.
 */
function _cierreNino(ctx) {
  const u = ctx.unidad;
  const cabeza = ctx.celebrarUnidad
    ? `
      <div class="leccion-nino__celebra" role="img" aria-label="Celebramos tu nueva insignia de la unidad ${u.numero}">
        ${htmlFrai('celebra', { tamano: 128 })}
        <div class="destellos leccion-nino__insignia">${htmlDestellos()}<svg class="leccion-insignia--nino" viewBox="0 0 120 120" aria-hidden="true"><use href="#il-insignia"/></svg></div>
      </div>
      <h2 class="k-h1 leccion-nino__titulo" id="leccion-titulo" tabindex="-1">¡Terminaste la unidad ${u.numero}!</h2>
      <p class="k-body leccion-nino__linea">${esc(u.aprendiste ?? u.nombre)}</p>
      <span class="kchip leccion-nino__chip">${icon('star')}Nueva insignia en Yo</span>`
    : `
      <div class="leccion-nino__celebra">${htmlFrai('celebra', { tamano: 112 })}</div>
      <h2 class="k-h1 leccion-nino__titulo" id="leccion-titulo" tabindex="-1">¡Lección lista!</h2>
      ${ctx.avance ? `<p class="k-body leccion-nino__linea">Llevas ${ctx.avance.hechas} de ${ctx.avance.total} en esta unidad.</p>` : ''}`;
  let usalo = '';
  if (ctx.usalo) {
    const nombre = _NOMBRE_FRASCO[ctx.usalo.frasco] ?? _NOMBRE_FRASCO.ahorrar;
    const linea = ctx.usalo.saldo > 0
      ? `En tu frasco ${nombre} tienes ${f(ctx.usalo.saldo)}.`
      : `Tu frasco ${nombre} está vacío por ahora.`;
    usalo = `
      <section class="kcard leccion-nino__usalo" data-frasco="${esc(ctx.usalo.frasco)}" aria-labelledby="leccion-usalo-titulo">
        <h3 class="k-h3 leccion-nino__usalo-titulo" id="leccion-usalo-titulo">${iconoCategoria(_ICONO_FRASCO[ctx.usalo.frasco] ?? 'i-ahorro')}Úsalo de verdad</h3>
        <p class="k-body leccion-nino__usalo-linea">${linea}</p>
        <p class="k-body">${esc(ctx.usalo.pregunta)}</p>
      </section>`;
  }
  return {
    cuerpo: `${cabeza}${usalo}`,
    pie: `
      <button class="kbtn kbtn--block" type="button" data-action="leccion-salir-a" data-vista="alcancia">${icon('ahorro')}Ver mi alcancía</button>
      <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="leccion-salir-a" data-vista="aprender">Volver a la ruta</button>`,
  };
}

/**
 * HTML completo del panel de la lección para el paso activo.
 *
 * @param {import('./logic.js').Sesion} sesion
 * @param {{ pasos: any[] }} leccion
 * @param {{ eyebrow: string, tope: number, terminada: boolean, entrada: boolean,
 *           aplica?: import('./aplica.js').ModeloAplica, unidad?: any,
 *           avance?: { hechas: number, total: number }, celebrarUnidad?: boolean,
 *           valores?: Record<string, string> }} ctx
 * @returns {string}
 */
export function htmlLeccion(sesion, leccion, ctx) {
  _nino = Boolean(ctx.nino);
  const paso = pasoActual(sesion, leccion);
  let partes = { cuerpo: '', pie: '', fb: '' };
  if (ctx.terminada) {
    partes = ctx.ubicacion ? _resultadoUbicacion(ctx.ubicacion, ctx.catalogo) : _nino ? _cierreNino(ctx) : _pasoAplica(ctx);
  }
  else if (paso?.tipo === 'concepto') partes = _pasoConcepto(paso, ctx);
  else if (paso?.tipo === 'elegir') partes = _pasoElegir(paso, sesion, ctx);
  else if (paso?.tipo === 'clasificar') partes = _pasoClasificar(paso, sesion, ctx);
  else if (paso?.tipo === 'control') partes = _pasoControl(paso, sesion, ctx);
  else if (paso?.tipo === 'ordenar') partes = _pasoOrdenar(paso, sesion, ctx);
  const animar = ctx.entrada ? ' leccion__cuerpo--entra' : '';
  const listo = ctx.terminada ? ' leccion--lista' : '';
  // Con el panel de retroalimentación abierto, el pie se esconde: el panel
  // trae su propio botón y no puede haber dos primarios a la vez.
  const pie = partes.fb || !partes.pie ? '' : `<div class="leccion__pie">${partes.pie}</div>`;
  return `
    <div class="leccion__marco${listo}" data-paso="${esc(ctx.terminada ? (ctx.ubicacion ? 'resultado' : 'aplica') : paso?.tipo ?? '')}"
         data-listo="${pasoListo(sesion, leccion) ? 'true' : 'false'}">
      ${_barra(sesion, ctx.terminada)}
      <div class="leccion__cuerpo${animar}">${partes.cuerpo}</div>
      ${pie}
      ${partes.fb ?? ''}
    </div>`;
}

// ── LA SECCIÓN OFRECE SU LECCIÓN (D6) ────────────────────────────

/**
 * El dato real de la fila, por sección, con lo que la sección mandó al
 * pintarse. Sin dato (o con el saldo oculto), una línea sin cifras.
 */
const _DATO_OFERTA = {
  fondo: ({ gastosFijos } = {}) => gastosFijos > 0
    ? `Con tus gastos fijos, 3 meses son ${f(gastosFijos * 3)} y 6 meses, ${f(gastosFijos * 6)}. Te ayudamos a elegir.`
    : 'Te ayudamos a elegir cuántos meses de gastos guardar.',
};

/**
 * La fila con la que una sección ofrece su lección (D6). Antes de hacerla
 * lleva un dato real del usuario; hecha, es una fila corta de "Repasar" que
 * la sección pone al pie (R65). Abre la lección, no duplica la pantalla.
 *
 * @param {string} seccion
 * @param {ReturnType<typeof import('./logic.js').ofertaDeSeccion>} oferta
 * @param {Record<string, number>} [datos]
 * @returns {string} HTML; `''` si no hay oferta.
 */
export function htmlOfertaLeccion(seccion, oferta, datos = {}) {
  if (!oferta) return '';
  const { leccion, unidad, eyebrow, repasar } = oferta;
  if (repasar) {
    return `
      <button class="leccion-oferta leccion-oferta--repasar" type="button" data-dom="${unidad.dominio}"
              data-action="leccion-abrir" data-id="${esc(leccion.id)}">
        <span class="leccion-oferta__cuerpo">
          <span class="leccion-oferta__eyebrow">Repasar · ${leccion.minutos} min</span>
          <span class="leccion-oferta__titulo">${esc(leccion.titulo)}</span>
        </span>
        ${icon('chevron-right', 'icon leccion-oferta__chevron')}
      </button>`;
  }
  const dato = Object.hasOwn(_DATO_OFERTA, seccion) ? _DATO_OFERTA[seccion](datos) : '';
  return `
    <button class="leccion-oferta" type="button" data-dom="${unidad.dominio}"
            data-action="leccion-abrir" data-id="${esc(leccion.id)}">
      <span class="leccion-oferta__teja" aria-hidden="true">${icon('lightbulb')}</span>
      <span class="leccion-oferta__cuerpo">
        <span class="leccion-oferta__eyebrow">${esc(eyebrow)} · ${leccion.minutos} min</span>
        <span class="leccion-oferta__titulo">${esc(leccion.titulo)}</span>
        ${dato ? `<span class="leccion-oferta__texto">${esc(dato)}</span>` : ''}
      </span>
      ${icon('chevron-right', 'icon leccion-oferta__chevron')}
    </button>`;
}

// ── TU SIGUIENTE PASO (D5) ───────────────────────────────────────

/** "Termina en X, con tus datos.", sin repetir el "con tus" que ya traiga X. */
function _gancho(termina) {
  return /, con tus /.test(termina) ? `Termina en ${esc(termina)}.` : `Termina en ${esc(termina)}, con tus datos.`;
}

/**
 * La celda "Tu siguiente paso" de Inicio. Ocupa el lugar de la tarjeta
 * compacta de logros (APR.1c): Inicio no crece (ADR 087). Con una lección, el
 * gancho es un dato real del usuario cuando lo hay; con una acción, el botón
 * dice el monto (R50) y la lección queda como salida para repasar.
 *
 * @param {ReturnType<typeof import('./logic.js').siguientePaso>} paso
 * @param {number} tope
 * @returns {string} HTML; `''` si no hay paso.
 */
export function htmlSiguientePaso(paso, tope) {
  if (!paso) return '';
  const cabeza = (etiqueta) => `
    <div class="siguiente-paso__cabeza">
      <h2 class="siguiente-paso__titulo-celda">${etiqueta}</h2>
      <a class="link" href="#aprende">Ver tu ruta</a>
    </div>`;
  if (paso.tipo === 'leccion') {
    const { leccion, unidad, hormiga } = paso;
    const gancho = unidad.id === 'u3' && hormiga.cuantos > 0
      ? `Este mes hiciste ${hormiga.cuantos} ${hormiga.cuantos === 1 ? 'compra' : 'compras'} de ${f(tope)} o menos. ¿Sabes cuánto suman juntas?`
      : _gancho(leccion.termina ?? unidad.termina);
    return `
      <div class="siguiente-paso" data-dom="${unidad.dominio}">
        ${cabeza('Tu siguiente paso')}
        <p class="siguiente-paso__titulo">${esc(leccion.titulo)}</p>
        <p class="siguiente-paso__texto">${gancho}</p>
        <p class="siguiente-paso__meta">Lección de ${leccion.minutos} minutos · unidad ${unidad.numero}</p>
        <button class="btn btn-primary siguiente-paso__cta" type="button" data-action="leccion-abrir"
                data-id="${esc(leccion.id)}">Empezar lección</button>
      </div>`;
  }
  const { aplica, unidad, leccionId } = paso;
  return `
    <div class="siguiente-paso" data-dom="${unidad.dominio}">
      ${cabeza('Tu siguiente paso')}
      <p class="siguiente-paso__meta">De la lección de gastos hormiga</p>
      <p class="siguiente-paso__titulo">Ponle un límite a tus gastos pequeños</p>
      <p class="siguiente-paso__texto">Este mes suman ${f(aplica.total)}. Un límite de ${f(aplica.limite)} te deja unos ${f(aplica.diferencia)} libres el mes que viene.</p>
      <div class="siguiente-paso__acciones">
        <button class="btn btn-primary siguiente-paso__cta" type="button" data-action="leccion-limite-hormiga"
                data-monto="${aplica.limite}">Poner un límite de ${f(aplica.limite)}</button>
        <button class="btn btn-ghost" type="button" data-action="leccion-abrir" data-id="${esc(leccionId)}">Repasar la lección</button>
      </div>
    </div>`;
}

