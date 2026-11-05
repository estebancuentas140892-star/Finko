/**
 * ui/celebraciones.js - Tino celebra los primeros pasos y los logros grandes
 * del adulto (ADR 127 D9).
 *
 * El ADR 101 retiró los avisos de logro del adulto ("Finko del adulto ayuda
 * a decidir, no premia"). El ADR 127 los devuelve acotados: no se celebra
 * cada registro, solo la primera vez que algo empieza (el primer ingreso, la
 * primera reserva, el primer límite, la primera meta) y lo que cierra un
 * esfuerzo largo (el primer mes completo de registro, una meta lograda, una
 * deuda saldada, el fondo de emergencia completo). La vitrina de logros
 * sigue sin pantalla.
 *
 * De dónde sale "acaba de pasar", sin guardar nada nuevo:
 * - Los logros que `dominio/logros` ya calcula y guarda en silencio
 *   (`S.logros`, ADR 101 D3). Un id que aparece en `S.logros` y no estaba
 *   al arrancar es un logro que la persona acaba de conseguir, y como
 *   `S.logros` se guarda, se celebra una sola vez en la vida. Un respaldo
 *   restaurado trae sus logros ya puestos: no se celebran. Y si en un mismo
 *   cambio aparecen dos logros o más, es una puesta al día (datos de antes
 *   de que existieran los logros, una importación), no algo que la persona
 *   acaba de hacer: tampoco se celebra.
 * - El primer ingreso y la primera reserva no tienen logro. Cuentan cuando
 *   su colección pasa de 0 a exactamente 1 en un cambio: un respaldo o una
 *   copia de la nube traen varias cosas de golpe y no son un primer paso.
 *
 * Nunca en el perfil del niño, que celebra a su manera (ADR 093).
 */

import { S, EventBus } from '../core/state.js';
import { esPerfilNino } from '../infra/perfiles.js';
import { mostrarToast } from './toast.js';

// ── LÓGICA PURA ──────────────────────────────────────────────────

/**
 * Cada hito: de qué logro sale (o de qué colección, si no tiene logro), qué
 * pose de Tino lo acompaña y qué dice. El orden es la prioridad cuando dos
 * llegan a la vez: lo grande primero.
 */
export const HITOS = Object.freeze([
  {
    id: 'meta-lograda',
    logro: 'meta-lograda',
    pose: 'celebra-grande',
    titulo: 'Lograste tu meta',
    detalle: 'Reuniste todo el dinero que te propusiste.',
  },
  {
    id: 'deuda-saldada',
    logro: 'primera-deuda-saldada',
    pose: 'celebra-grande',
    titulo: 'Saldaste una deuda',
    detalle: 'Es una deuda menos: ese dinero ya puede ir a otra parte.',
  },
  {
    id: 'fondo-completo',
    logro: 'fondo-emergencia',
    pose: 'celebra-grande',
    titulo: 'Tu fondo de emergencia está completo',
    detalle: 'Ya tienes un colchón para los imprevistos.',
  },
  {
    id: 'mes-completo',
    logro: 'mes-completo',
    pose: 'celebra-grande',
    titulo: 'Completaste tu primer mes registrando gastos',
    detalle: 'Con un mes completo, tus números ya cuentan cómo usas tu dinero.',
  },
  {
    id: 'primer-ingreso',
    coleccion: 'ingresos',
    pose: 'celebra',
    titulo: 'Registraste tu primer ingreso',
    detalle: 'Cuando quieras, Finko te ayuda a repartirlo desde Mis cuentas.',
  },
  {
    id: 'primera-reserva',
    coleccion: 'apartados',
    pose: 'celebra',
    titulo: 'Creaste tu primera reserva',
    detalle: 'Aporta poco a poco y, cuando llegue ese gasto, ya tendrás el dinero.',
  },
  {
    id: 'primer-limite',
    logro: 'planificador',
    pose: 'celebra',
    titulo: 'Pusiste tu primer límite de gasto',
    detalle: 'Finko te avisa antes de que te pases, no después.',
  },
  {
    id: 'primera-meta',
    logro: 'soñador',
    pose: 'celebra',
    titulo: 'Creaste tu primera meta',
    detalle: 'Ya tienes un plan: cada aporte te acerca a lograrla.',
  },
]);

const _n = a => (Array.isArray(a) ? a.length : 0);

/**
 * Lo que se compara entre dos momentos: los logros guardados y el tamaño de
 * las colecciones sin logro.
 *
 * @param {object} s
 * @returns {{ logros: string[], ingresos: number, apartados: number }}
 */
export function fotoHitos(s) {
  const st = s && typeof s === 'object' ? s : {};
  return {
    logros:    Array.isArray(st.logros) ? [...st.logros] : [],
    ingresos:  _n(st.ingresos) + _n(st.ingresosPuntuales),
    apartados: _n(st.apartados),
  };
}

/**
 * Los hitos que ocurrieron entre dos fotos, en orden de prioridad.
 *
 * @param {ReturnType<typeof fotoHitos> | null} antes
 * @param {ReturnType<typeof fotoHitos> | null} despues
 * @returns {typeof HITOS[number][]}
 */
export function hitosNuevos(antes, despues) {
  if (!antes || !despues) return [];
  const yaEstaban = new Set(antes.logros);
  const llegaron = despues.logros.filter(id => !yaEstaban.has(id));
  const unoSolo = llegaron.length === 1;
  return HITOS.filter((h) => {
    if (h.logro) return unoSolo && llegaron[0] === h.logro;
    return antes[h.coleccion] === 0 && despues[h.coleccion] === 1;
  });
}

// ── DOM / EVENTOS ────────────────────────────────────────────────

let _foto = null;
let _pendiente = false;

/**
 * Hay algo que tapa la pantalla: la bienvenida, el candado, la aceptación
 * legal, "¿Quién usa Finko?" o cualquier hoja. Todos son `.modal-overlay`
 * y se abren con `data-open` (ui/modales.js).
 */
function _hayBloqueo() {
  return Boolean(document.querySelector('.modal-overlay[data-open]'));
}

function _revisar() {
  _pendiente = false;
  if (esPerfilNino() || document.body.classList.contains('kid')) { _foto = null; return; }
  const ahora = fotoHitos(S);
  const antes = _foto;
  _foto = ahora;
  // Uno por cambio: si dos hitos coinciden, el más grande habla.
  const [hito] = hitosNuevos(antes, ahora);
  if (!hito) return;
  mostrarToast({ titulo: hito.titulo, detalle: hito.detalle, tino: hito.pose });
}

/**
 * Revisa un cuadro después del cambio: `dominio/logros` escucha el mismo
 * `state:change` y tiene que haber guardado el logro nuevo antes de mirar.
 */
function _programar() {
  if (_pendiente) return;
  _pendiente = true;
  setTimeout(_revisar, 0);
}

/**
 * Toma la foto inicial ANTES de que `initLogros()` evalúe al arrancar: un
 * logro que se gana al abrir la app (el mes que se completó ayer) también se
 * celebra, una vez y con la pantalla ya quieta. Se llama una vez desde
 * bootstrap.js, justo antes de `initLogros()`.
 */
export function initCelebraciones() {
  _foto = esPerfilNino() ? null : fotoHitos(S);
  EventBus.on('state:change', _programar);
  // Al volver del perfil del niño, la foto se rehace en silencio.
  EventBus.on('perfil:cambio', () => { _foto = esPerfilNino() ? null : fotoHitos(S); });
  // El logro ganado al arrancar: si un candado o un aviso tapa la pantalla,
  // se espera a que la persona entre (el primer cambio lo muestra).
  setTimeout(() => { if (!_hayBloqueo()) _revisar(); }, 1500);
}
