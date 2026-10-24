/**
 * aprende/view.js - HTML de la ruta (`#aprende`) y de la lección a pantalla
 * completa (`#modal-leccion`), ADR 092 D7 y D8.
 *
 * Solo genera strings. El estado de la lección (la sesión) lo maneja
 * index.js y entra acá como argumento; esta capa no decide nada.
 */

import { S } from '../../core/state.js';
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { f, esc } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import {
  estadoRuta, normalizarAprende, leccionDisponible, numeroDePaso, pasoActual,
  pasoListo, CALCULOS,
} from './logic.js';

// ── RUTA ─────────────────────────────────────────────────────────

/** Fila de una lección dentro de la unidad abierta. */
function _filaLeccion(leccion, n, hechas, siguienteId) {
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
  const accion = hecha ? `Repasar ${esc(leccion.titulo)}` : `Abrir ${esc(leccion.titulo)}`;
  return `
    <li class="aprende-paso aprende-paso--${estado}">
      <button class="aprende-paso__boton" type="button" data-action="leccion-abrir"
              data-id="${esc(leccion.id)}" aria-label="${accion}">${cuerpo}
      </button>
    </li>`;
}

/** Tarjeta de la unidad donde vas, con sus lecciones a la vista. */
function _unidadActual(entrada, aprende) {
  const { unidad, hechas: cuantas, total } = entrada;
  const { hechas, enCurso } = aprende;
  const siguiente = unidad.lecciones.find(l => leccionDisponible(l) && !hechas[l.id]);
  const numero = siguiente ? unidad.lecciones.indexOf(siguiente) + 1 : 0;
  const retomar = siguiente && enCurso?.id === siguiente.id;
  const boton = siguiente
    ? `<button class="btn btn-primary aprende-unidad__cta" type="button" data-action="leccion-abrir"
               data-id="${esc(siguiente.id)}">${retomar ? 'Seguir' : 'Empezar'} la lección ${numero}</button>`
    : '';
  return `
    <section class="aprende-unidad aprende-unidad--actual" data-dom="${unidad.dominio}"
             aria-labelledby="aprende-unidad-${unidad.id}">
      <p class="aprende-unidad__eyebrow">Unidad ${unidad.numero} · vas aquí</p>
      <div class="aprende-unidad__cabeza">
        <h2 class="aprende-unidad__nombre" id="aprende-unidad-${unidad.id}">${esc(unidad.nombre)}</h2>
        <span class="aprende-unidad__cuenta">${cuantas} de ${total}</span>
      </div>
      <ol class="aprende-pasos">
        ${unidad.lecciones.map((l, i) => _filaLeccion(l, i + 1, hechas, siguiente?.id)).join('')}
      </ol>
      ${boton}
    </section>`;
}

/** Fila compacta de una unidad que no es la actual. */
function _filaUnidad(entrada) {
  const { unidad, estado } = entrada;
  const disponibles = unidad.lecciones.filter(leccionDisponible).length;
  let meta;
  if (estado === 'hecha') meta = 'Hecha';
  else if (estado === 'sabida') meta = 'Ya lo sabes';
  else if (!disponibles) meta = `Termina en ${esc(unidad.termina)} · En preparación`;
  else meta = `${unidad.lecciones.length} lecciones · termina en ${esc(unidad.termina)}`;
  return `
    <li class="aprende-fila" data-dom="${unidad.dominio}">
      <span class="aprende-fila__numero" aria-hidden="true">${unidad.numero}</span>
      <span class="aprende-fila__cuerpo">
        <span class="aprende-fila__nombre">${esc(unidad.nombre)}</span>
        <span class="aprende-fila__meta">${meta}</span>
      </span>
    </li>`;
}

/**
 * HTML de la ruta completa: la unidad actual abierta y el resto en dos
 * grupos, lo que ya está y lo que viene. Nada se bloquea (D8).
 *
 * @param {unknown} aprendeCrudo - `S.aprende`.
 * @returns {string}
 */
export function htmlRuta(aprendeCrudo) {
  const aprende = normalizarAprende(aprendeCrudo);
  const ruta = estadoRuta(aprende);
  const actual = ruta.find(e => e.estado === 'actual');
  const yaEsta = ruta.filter(e => e.estado === 'hecha' || e.estado === 'sabida');
  const despues = ruta.filter(e => e.estado === 'despues');
  const grupo = (titulo, id, filas) => filas.length ? `
    <section class="aprende-grupo" aria-labelledby="${id}">
      <h2 class="aprende-grupo__titulo" id="${id}">${titulo}</h2>
      <ul class="aprende-filas">${filas.map(_filaUnidad).join('')}</ul>
    </section>` : '';
  return `
    <div class="aprende-ruta">
      ${actual ? _unidadActual(actual, aprende) : ''}
      ${grupo('Ya lo sabes', 'aprende-grupo-sabes', yaEsta)}
      ${grupo('Después', 'aprende-grupo-despues', despues)}
    </div>`;
}

/** Pinta la ruta en `#panel-aprende`. */
export function renderRuta() {
  const panel = document.getElementById('panel-aprende');
  if (!panel) return;
  panel.innerHTML = htmlRuta(S.aprende);
}

// ── LECCIÓN ──────────────────────────────────────────────────────

/** Reemplaza `{tope}` en un texto de lección por el tope vigente. */
function _texto(t, ctx) {
  return esc(String(t ?? '').replaceAll('{tope}', f(ctx.tope)));
}

/** Barra superior: salir, avance y contador "n de N" (o "Lista"). */
function _barra(sesion, terminada) {
  const n = terminada ? sesion.total : numeroDePaso(sesion);
  const segmentos = Array.from({ length: sesion.total }, (_, i) =>
    `<i${i < n ? ' class="is-on"' : ''}></i>`).join('');
  const salir = terminada
    ? 'Cerrar y volver a la ruta'
    : 'Salir de la lección. Tu avance se guarda';
  const progreso = terminada
    ? `<div class="leccion__prog" aria-hidden="true">${segmentos}</div>`
    : `<div class="leccion__prog" role="progressbar" aria-valuemin="0" aria-valuemax="${sesion.total}"
            aria-valuenow="${n}" aria-label="Paso ${n} de ${sesion.total}">${segmentos}</div>`;
  return `
    <div class="leccion__top">
      <button class="btn btn-icon btn-ghost leccion__salir" type="button"
              data-action="leccion-salir" aria-label="${salir}">${icon('x')}</button>
      ${progreso}
      <span class="leccion__cuenta">${terminada ? 'Lista' : `${n} de ${sesion.total}`}</span>
    </div>`;
}

/** Panel de retroalimentación: "Así es" o "Casi", nunca rojo (D7). */
function _feedback(correcto, texto, boton, nota = '') {
  const clase = correcto ? 'leccion-fb--bien' : 'leccion-fb--casi';
  const titulo = correcto ? 'Así es' : 'Casi';
  const ico = correcto ? icon('check') : icon('lightbulb');
  const accion = boton.accion ?? 'leccion-continuar';
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
    else if (correcta) etiqueta = '<span class="chip chip-success leccion-opcion__tag">Esta es</span>';
    return `
      <button class="${clases.join(' ')}" type="button" role="radio" aria-checked="${elegida ? 'true' : 'false'}"
              data-action="leccion-elegir" data-idx="${i}"${rev ? ' aria-disabled="true"' : ''}>
        <span class="leccion-opcion__letra" aria-hidden="true">${letras[i]}</span>
        <span class="leccion-opcion__texto">${_texto(texto, ctx)}</span>${etiqueta}
      </button>`;
  }).join('');
  const fb = rev
    ? rev.correcto
      ? _feedback(true, _texto(paso.bien, ctx), { texto: 'Continuar' })
      : _feedback(false, _texto(paso.casi?.[rev.elegida], ctx), { texto: 'Entendido' }, _NOTA_VUELVE)
    : '';
  return {
    cuerpo: `
      <p class="leccion__eyebrow">${esc(sesion.repaso ? 'Otra vez' : paso.etiqueta ?? 'Elige una')}</p>
      <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">${_texto(paso.pregunta, ctx)}</h2>
      <div class="leccion-opciones" role="radiogroup" aria-labelledby="leccion-titulo">${opciones}</div>`,
    fb,
  };
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
      fb: _feedback(true, 'Separaste lo pequeño que se repite de lo grande que planeas.', { texto: 'Continuar' }),
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
          <p class="leccion-tarjeta__monto">${f(visible.monto)}</p>
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
  const calculo = CALCULOS[paso.calculo];
  if (!calculo) return '';
  const r = calculo(valores);
  const extra = r.ahorroConTres > 0
    ? ` Si lo bajas a 3 días, te quedan <strong>${f(r.ahorroConTres)} al año</strong> para otra cosa.`
    : '';
  return `
    <p class="leccion-resultado__lead">En un año suman</p>
    <p class="leccion-resultado__cifra">${f(r.anual)}</p>
    <p class="leccion-resultado__linea">Son ${f(r.mensual)} al mes.${extra}</p>`;
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
    const marcas = Array.from({ length: c.max - c.min + 1 }, (_, i) => `<span>${c.min + i}</span>`).join('');
    return `
      <div class="leccion-control">
        <div class="leccion-control__fila">
          <label class="leccion-control__etiqueta" for="${etiquetaId}">${esc(c.etiqueta)}</label>
          <span class="leccion-control__valor" data-control-valor="${esc(c.id)}">${valor}</span>
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
  const filas = sesion.orden.map((item, i) => `
    <li class="leccion-orden__item${rev ? (rev.correcto ? ' leccion-orden__item--bien' : '') : ''}">
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
      <p class="leccion__ayuda">Usa las flechas para mover cada paso.</p>
      <ol class="leccion-orden">${filas}</ol>`,
    pie: rev ? '' : `<button class="btn btn-primary leccion__boton" type="button" data-action="leccion-comprobar">Comprobar</button>`,
    fb,
  };
}

/** Desglose del Aplícalo: hasta tres categorías, con su número de compras. */
function _grupos(grupos) {
  return grupos.map(g => `
    <li class="leccion-aplica__grupo">
      ${tejaCategoria(iconoDeCategoriaGasto(g.categoria, S.categoriasPersonalizadas) || 'c-otros', 'gastos')}
      <span class="leccion-aplica__grupo-nombre">${esc(g.categoria)} <span class="leccion-aplica__grupo-cuantos">· ${g.cuantos}</span></span>
      <span class="leccion-aplica__grupo-monto">${f(g.total)}</span>
    </li>`).join('');
}

/** Cierre de la lección: chulo, "Lección lista" y el Aplícalo con tus datos. */
function _pasoAplica(ctx) {
  const a = ctx.aplica;
  const avance = ctx.unidad
    ? `<p class="leccion-lista__linea">Llevas ${ctx.avance.hechas} de ${ctx.avance.total} en ${esc(ctx.unidad.nombre)}.</p>`
    : '';
  const cabeza = `
    <div class="leccion-lista">
      <span class="leccion-lista__check" aria-hidden="true">${icon('check')}</span>
      <div>
        <h2 class="leccion__titulo" id="leccion-titulo" tabindex="-1">Lección lista</h2>
        ${avance}
      </div>
    </div>`;
  if (!a || a.sinDato) {
    return {
      cuerpo: `${cabeza}
        <section class="leccion-aplica" aria-labelledby="leccion-aplica-titulo">
          <p class="leccion__eyebrow leccion__eyebrow--dom">Aplícalo con tus datos</p>
          <h3 class="leccion-aplica__lead" id="leccion-aplica-titulo">Todavía no tienes gastos pequeños en ${esc(a?.mesNombre ?? 'este mes')}.</h3>
          <p class="leccion-aplica__linea">Registra los de esta semana y vuelve: aquí verás cuánto suman tus gastos de ${f(ctx.tope)} o menos.</p>
        </section>`,
      pie: `
        <button class="btn btn-primary leccion__boton" type="button" data-action="registrar-abrir" data-target-action="nuevo-gasto">Registrar un gasto</button>
        <button class="btn btn-ghost leccion__boton" type="button" data-action="leccion-salir">Ahora no</button>`,
    };
  }
  return {
    cuerpo: `${cabeza}
      <section class="leccion-aplica" aria-labelledby="leccion-aplica-titulo">
        <p class="leccion__eyebrow leccion__eyebrow--dom">Aplícalo con tus datos</p>
        <h3 class="leccion-aplica__lead" id="leccion-aplica-titulo">Tus gastos pequeños de ${esc(a.mesNombre)} suman</h3>
        <p class="leccion-aplica__cifra">${f(a.total)}</p>
        <p class="leccion-aplica__linea">Son ${a.cuantos} ${a.cuantos === 1 ? 'compra' : 'compras'} de ${f(a.tope)} o menos.</p>
        <ul class="leccion-aplica__grupos">${_grupos(a.grupos)}</ul>
      </section>
      <p class="leccion-aplica__logro">${icon('trophy')}<span>Si un mes gastas en lo pequeño menos que tu promedio de los tres anteriores, ganas el logro <strong>Hormiga a raya</strong>.</span></p>`,
    pie: `
      <button class="btn btn-primary leccion__boton" type="button" data-action="ir-a-seccion" data-target="presupuesto">Ir a Límites</button>
      <p class="leccion__nota">Un límite cercano sería ${f(a.limite)}: unos ${f(a.diferencia)} menos que este mes.</p>
      <button class="btn btn-ghost leccion__boton" type="button" data-action="leccion-salir">Ahora no</button>`,
  };
}

/**
 * HTML completo del panel de la lección para el paso activo.
 *
 * @param {import('./logic.js').Sesion} sesion
 * @param {{ pasos: any[] }} leccion
 * @param {{ eyebrow: string, tope: number, terminada: boolean, entrada: boolean,
 *           aplica?: any, unidad?: any, avance?: { hechas: number, total: number } }} ctx
 * @returns {string}
 */
export function htmlLeccion(sesion, leccion, ctx) {
  const paso = pasoActual(sesion, leccion);
  let partes = { cuerpo: '', pie: '', fb: '' };
  if (ctx.terminada) partes = _pasoAplica(ctx);
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
    <div class="leccion__marco${listo}" data-paso="${esc(ctx.terminada ? 'aplica' : paso?.tipo ?? '')}"
         data-listo="${pasoListo(sesion, leccion) ? 'true' : 'false'}">
      ${_barra(sesion, ctx.terminada)}
      <div class="leccion__cuerpo${animar}">${partes.cuerpo}</div>
      ${pie}
      ${partes.fb ?? ''}
    </div>`;
}
