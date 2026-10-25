/**
 * logros/view.js - "Tu progreso" (LG.2d, ADR 032 D6) y la vitrina de logros.
 *
 * Desde APR.1d (ADR 092 D4) es una sola superficie: la lente "Tu progreso"
 * (`renderProgresoSeccion()`). El apartado de Análisis y la tarjeta compacta
 * de Inicio que dejó LG.2d se retiraron; en Inicio, su celda la ocupa "Tu
 * siguiente paso" (dominio `aprende`). Puede leer S. No puede mutarlo. Sin lógica de negocio (delega a
 * logic.js).
 */

import { S } from '../../core/state.js';
import { esc as _esc } from '../../infra/utils.js';

import { estadoLogros, agruparVitrina, conteoVitrina, partirVitrina, resumenProgreso, NIVELES_USUARIO } from './logic.js';
import { UNIDADES, posicionEnRuta } from '../../infra/ruta-aprende.js';

/**
 * Pinta la lente "Tu progreso" (`#panel-progreso`, APR.1d, ADR 092 D4): el
 * nivel con su escala, lo que sabes, lo que haces y las semanas activas.
 * Reemplaza al apartado colapsable de Análisis y a la tarjeta compacta de
 * Inicio que dejó LG.2d. No-op si el contenedor no existe.
 */
export function renderProgresoSeccion() {
  const el = document.getElementById('panel-progreso');
  if (!el) return;

  const estados = estadoLogros(S, S.logros);
  const p = resumenProgreso(S, estados);
  // El "X de Y" de lo que haces sale de la vitrina agrupada, que es lo que se
  // dibuja debajo (R88), no del catálogo crudo.
  const vitrina = agruparVitrina(estados);
  const { conseguidos, total } = conteoVitrina(vitrina);
  // Lo que falta arriba y lo conseguido abajo (ficha 17 de MOV.1, G4); un
  // grupo vacío no se pinta.
  const { faltan, tienes } = partirVitrina(vitrina);
  const item = it => it.tipo === 'familia' ? _renderFamiliaItem(it) : _renderLogroItem(it.logro);
  const grupo = (titulo, id, lista) => lista.length ? `
        <h3 class="logros-grupo" id="${id}">${titulo}</h3>
        <ul class="logros-lista" role="list" aria-labelledby="${id}">${lista.map(item).join('')}</ul>` : '';

  const primero = NIVELES_USUARIO[0];
  const ultimo = NIVELES_USUARIO[NIVELES_USUARIO.length - 1];
  const avance = Math.min(100, Math.round((p.pasos / ultimo.min) * 100));
  const unidadesTxt = p.unidades === 1 ? '1 unidad que ya sabes' : `${p.unidades} unidades que ya sabes`;
  const logrosTxt = p.logros === 1 ? '1 logro' : `${p.logros} logros`;
  const siguienteTxt = p.siguiente
    ? `Faltan ${p.faltan} ${p.faltan === 1 ? 'paso' : 'pasos'} para ${_esc(p.siguiente.nombre)}`
    : 'Llegaste al nivel más alto';

  const pos = posicionEnRuta(S.aprende);
  const dondeVas = pos
    ? `Vas en la unidad ${pos.unidad.numero}, lección ${pos.leccion} de ${pos.total}.`
    : 'Ya hiciste todas las lecciones disponibles.';

  el.innerHTML = `
    <div class="progreso">
      <section class="progreso-nivel" aria-labelledby="progreso-nivel-nombre">
        <p class="progreso__eyebrow">Tu nivel</p>
        <h2 class="progreso-nivel__nombre" id="progreso-nivel-nombre">${_esc(p.nivel.nombre)}</h2>
        <p class="progreso__linea">Sumas ${p.pasos} ${p.pasos === 1 ? 'paso' : 'pasos'}: ${unidadesTxt} y ${logrosTxt} por lo que haces con tu dinero.</p>
        <div class="progress progreso-nivel__barra" role="progressbar" aria-valuenow="${p.pasos}" aria-valuemin="0"
             aria-valuemax="${ultimo.min}" aria-label="${p.pasos} de ${ultimo.min} pasos hasta ${_esc(ultimo.nombre)}">
          <div class="progress-bar" style="width:${avance}%"></div>
        </div>
        <p class="progreso-nivel__escala"><span>${_esc(primero.nombre)}</span><span>${siguienteTxt}</span><span>${_esc(ultimo.nombre)}</span></p>
      </section>

      <section class="progreso-bloque" aria-labelledby="progreso-sabes">
        <div class="progreso-bloque__cabeza">
          <h2 class="progreso-bloque__titulo" id="progreso-sabes">Lo que sabes</h2>
          <span class="progreso-bloque__cuenta">${p.unidades} de ${UNIDADES.length} unidades</span>
        </div>
        <p class="progreso__linea">${dondeVas} Cada unidad terminada suma un paso, una sola vez: repasar no suma.</p>
        <a class="link" href="#aprende">Ver tu ruta</a>
      </section>

      <section class="progreso-bloque" aria-labelledby="progreso-haces">
        <div class="progreso-bloque__cabeza">
          <h2 class="progreso-bloque__titulo" id="progreso-haces">Lo que haces</h2>
          <span class="progreso-bloque__cuenta">${conseguidos} de ${total} logros</span>
        </div>
        ${grupo('Te falta', 'logros-faltan', faltan)}
        ${grupo('Ya los tienes', 'logros-tienes', tienes)}
      </section>

      <section class="progreso-bloque progreso-semanas" aria-labelledby="progreso-semanas">
        <p class="progreso-semanas__cifra" id="progreso-semanas">${p.semanas} ${p.semanas === 1 ? 'semana activa' : 'semanas activas'}</p>
        <p class="progreso__linea">Semanas en que registraste algo o hiciste una lección. Solo informa: nunca vuelve a cero.</p>
      </section>
    </div>`;
}

/**
 * El `hint` de un pendiente con el nombre de su sección como enlace (ficha 17
 * de MOV.1, G3): es un encargo y lleva a donde se cumple, con un toque.
 *
 * @param {{ hint?: string, ir?: { hash: string, texto: string } | null }} logro
 * @returns {string} HTML ya escapado.
 */
function _hint(logro) {
  const texto = _esc(logro?.hint ?? '');
  if (!logro?.ir) return texto;
  const rotulo = _esc(logro.ir.texto);
  return texto.replace(rotulo, `<a class="link" href="#${_esc(logro.ir.hash)}">${rotulo}</a>`);
}

/**
 * Tarjeta de una familia de logros (LG.2b, ADR 032 D1): muestra el nivel más
 * alto desbloqueado como estado y el siguiente nivel como objetivo, con su
 * barra de progreso si el nivel pendiente la expone.
 *
 * @param {ReturnType<import('./logic.js').agruparVitrina>[number] & { tipo: 'familia' }} fam
 * @returns {string}
 */
function _renderFamiliaItem(fam) {
  const activa = fam.desbloqueados > 0;
  const clase  = activa ? 'logro-item logro-item--on' : 'logro-item logro-item--off';
  const emoji  = (fam.actual ?? fam.siguiente)?.emoji ?? '🏅';
  const chip   = activa
    ? `<span class="chip chip-success">Nivel ${fam.desbloqueados} de ${fam.totalNiveles}</span>`
    : '<span class="chip">Pendiente</span>';

  // Estado: qué se consiguió (nivel actual) o cómo arrancar (hint del nivel 1).
  const texto = fam.actual ? _esc(fam.actual.desc) : _hint(fam.siguiente);

  // Objetivo: el siguiente nivel, con barra si expone progreso.
  const sig = fam.siguiente;
  const siguienteHtml = (activa && sig)
    ? `<p class="logro-item__progreso">Siguiente: ${_hint(sig)}</p>`
    : '';
  const progresoHtml = (sig && sig.progreso)
    ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${sig.progreso.actual}" aria-valuemin="0" aria-valuemax="${sig.progreso.meta}"
             aria-label="Progreso: ${sig.progreso.actual} de ${sig.progreso.meta}">
          <div class="progress-bar" style="width:${Math.min(100, Math.round((sig.progreso.actual / sig.progreso.meta) * 100))}%"></div>
        </div>
        <p class="logro-item__progreso">${sig.progreso.actual} de ${sig.progreso.meta}</p>`
    : '';

  return `
      <li class="${clase}">
        <span class="logro-item__emoji" aria-hidden="true">${emoji}</span>
        <div class="logro-item__body">
          <p class="logro-item__nombre">${_esc(fam.nombre)} ${chip}</p>
          <p class="logro-item__desc">${texto}</p>
          ${siguienteHtml}
          ${progresoHtml}
        </div>
      </li>`;
}

/**
 * @param {ReturnType<typeof estadoLogros>[number]} l
 * @returns {string}
 */
function _renderLogroItem(l) {
  const clase = l.desbloqueado ? 'logro-item logro-item--on' : 'logro-item logro-item--off';
  // Desbloqueado: qué se consiguió. Pendiente: cómo desbloquearlo (hint).
  const texto = l.desbloqueado ? _esc(l.desc) : _hint(l);
  const chip  = l.desbloqueado
    ? '<span class="chip chip-success">Desbloqueado</span>'
    : '<span class="chip">Pendiente</span>';

  const progresoHtml = (!l.desbloqueado && l.progreso)
    ? `
        <div class="progress" role="progressbar"
             aria-valuenow="${l.progreso.actual}" aria-valuemin="0" aria-valuemax="${l.progreso.meta}"
             aria-label="Progreso: ${l.progreso.actual} de ${l.progreso.meta}">
          <div class="progress-bar" style="width:${Math.min(100, Math.round((l.progreso.actual / l.progreso.meta) * 100))}%"></div>
        </div>
        <p class="logro-item__progreso">${l.progreso.actual} de ${l.progreso.meta}</p>`
    : '';

  return `
      <li class="${clase}">
        <span class="logro-item__emoji" aria-hidden="true">${l.emoji}</span>
        <div class="logro-item__body">
          <p class="logro-item__nombre">${_esc(l.nombre)} ${chip}</p>
          <p class="logro-item__desc">${texto}</p>
          ${progresoHtml}
        </div>
      </li>`;
}
