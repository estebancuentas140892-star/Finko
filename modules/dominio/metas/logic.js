/**
 * metas/logic.js - funciones puras del dominio de metas de ahorro.
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * El ritmo de ahorro (cada cuánto cobra el usuario y cuánto le toca por
 * período) ya no vive aquí: es del motor compartido `infra/vencimientos.js`
 * (MC.13b, ADR 041). Antes estaba duplicado carácter por carácter en
 * `apartados/logic.js`, porque ADN #10 impide que un dominio importe a otro;
 * la copia única vive en infra, que sí pueden importar los dos.
 */

import {
  FRECUENCIAS_APORTE,
  aportePorPeriodo,
  etiquetaPeriodo,
  frecuenciaPrincipalIngresos,
  normalizarFrecuenciaAporte,
  fechasAportePlan,
} from '../../infra/vencimientos.js';
import { progresoDeBolsa, ordenarBolsasPorFecha } from '../../infra/bolsas.js';
import { hijosDeCategoria } from '../../infra/taxonomia.js';
import { SUBCATEGORIAS_META } from '../../core/constants.js';
import { hoy, f } from '../../infra/utils.js';

// ── RITMO DE AHORRO (MT.4, motor compartido desde MC.13b) ─────────

/**
 * Frecuencias con sentido como "cada cuánto ahorro para esta meta", alineadas
 * a la frecuencia con la que el usuario recibe ingresos. Nombre propio del
 * dominio para la lista única del motor.
 */
export const FRECUENCIAS_AHORRO = FRECUENCIAS_APORTE;

export { frecuenciaPrincipalIngresos };

/**
 * Etiqueta legible del periodo de ahorro para usar en la lista de metas.
 * @param {string} frecuencia - una de FRECUENCIAS_AHORRO.
 * @returns {string} ej. "por quincena", "al mes".
 */
export const etiquetaPeriodoAhorro = etiquetaPeriodo;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra metas que aún no están completadas.
 * @param {import('../../core/state.js').Meta[]} metas
 */
export function metasActivas(metas) {
  return metas.filter(m => m.completada !== true);
}

/**
 * Filtra las metas ya cumplidas, hermana de `metasActivas()` (DIS.13, MT.d).
 * Hasta esta auditoría una meta cumplida salía de la lista y no había ninguna
 * otra pantalla donde verla: no se podía revisar, ni editar, ni eliminar,
 * porque el DOM de la fila ni se pintaba. El corte de las dos funciones es el
 * mismo campo (`completada`), así que ninguna meta puede caer en las dos ni
 * quedarse fuera de ambas.
 * @param {import('../../core/state.js').Meta[]} metas
 */
export function metasCumplidas(metas) {
  return metas.filter(m => m.completada === true);
}

/**
 * Calcula el progreso de una meta de ahorro.
 *
 * Envoltorio de `progresoDeBolsa` (ARQ.1a) con los campos de este dominio: el
 * cálculo es el mismo de las cuatro bolsas y su copia única vive en infra. Lo
 * único propio es el nombre del campo: acá la meta se completa **en femenino**,
 * y así lo guarda el registro (`S.metas[].completada`).
 *
 * @param {import('../../core/state.js').Meta} meta
 * @returns {{ porcentaje: number, faltante: number, completada: boolean }}
 */
export function calcularProgreso(meta) {
  const { porcentaje, faltante, completado } = progresoDeBolsa(meta?.montoObjetivo, meta?.montoActual);
  return { porcentaje, faltante, completada: completado };
}

// ── ORDEN Y CABEZA DE LA LISTA (ficha 09 de la auditoría móvil) ───

/**
 * Reparte las metas activas en los dos grupos que la lista pinta: las que
 * tienen plazo, ordenadas por la fecha que vence primero, y las que no lo
 * tienen, que van después.
 *
 * Hallazgo G1: `metasActivas()` filtra y no ordena, así que la lista salía en
 * orden de creación. Con una tarjeta y media visible a 390px, ese orden **es**
 * la respuesta que la sección da a "¿a cuál le aporto?", y era una respuesta
 * al azar: una meta al 90% que vence en septiembre quedaba debajo de una al
 * 34% que vence en diciembre. El criterio es el que Por pagar ya usa (urgencia
 * primero, con divisores visibles); acá la urgencia es la fecha límite.
 *
 * Las metas sin plazo no bajan como castigo: es el sitio donde su invitación a
 * ponerle fecha tiene sentido, porque son las únicas que piden algo distinto
 * de un aporte.
 *
 * Una `fechaLimite` ilegible cuenta como "sin plazo": no se ordena por una
 * fecha que no se puede leer, y el nudge de fecha es justo lo que le falta.
 *
 * **Fuente única del orden.** La lista de Metas y el picker "Elige a cuál" de
 * Registrar consumen esta misma función (hallazgo G4): una meta que sale
 * primera en la sección no puede salir tercera en el picker.
 *
 * @param {import('../../core/state.js').Meta[]} metas - lista completa; el corte de activas lo hace esta función.
 * @returns {{ conPlazo: import('../../core/state.js').Meta[], sinPlazo: import('../../core/state.js').Meta[] }}
 */
export function ordenarMetasPorPlazo(metas) {
  const activas = metasActivas(Array.isArray(metas) ? metas : []);
  const { conFecha, sinFecha } = ordenarBolsasPorFecha(activas, 'fechaLimite');
  return { conPlazo: conFecha, sinPlazo: sinFecha };
}

/**
 * Las tres cifras de la franja que encabeza la lista (hallazgo G2): cuánto hay
 * reunido en las metas activas, cuánto falta para cerrarlas todas y cuántas
 * son.
 *
 * La casa lo decía y la habitación no: el carril de Ahorro anuncia
 * "$1.950.000 · 3 en curso" y al entrar a Metas la primera tarjeta empezaba
 * sin cabeza, así que con dos metas bajo el pliegue nada decía que existían.
 * Ninguna cifra es nueva y **no se importan de `ahorro/logic.js`** (ADN #10):
 * se agregan acá sobre `calcularProgreso()`, que ya es el envoltorio del
 * cálculo único de las cuatro bolsas.
 *
 * El conteo y el porcentaje no son magnitudes de dinero, así que la vista los
 * pinta sin máscara (regla R20, el mismo corte que el anillo de la tarjeta).
 *
 * @param {import('../../core/state.js').Meta[]} metas - lista completa; solo cuentan las activas.
 * @returns {{ reunido: number, faltante: number, objetivo: number, porcentaje: number, enCurso: number }}
 */
export function resumenMetas(metas) {
  const activas = metasActivas(Array.isArray(metas) ? metas : []);

  let reunido  = 0;
  let objetivo = 0;
  let faltante = 0;

  for (const meta of activas) {
    reunido  += Math.max(0, Number(meta?.montoActual) || 0);
    objetivo += Math.max(0, Number(meta?.montoObjetivo) || 0);
    faltante += calcularProgreso(meta).faltante;
  }

  const porcentaje = objetivo > 0 ? Math.min(100, Math.round((reunido / objetivo) * 100)) : 0;

  return { reunido, faltante, objetivo, porcentaje, enCurso: activas.length };
}

/**
 * Segunda linea del toast de confirmacion (ADR 062, mismo patron que
 * `consecuenciaDeGasto` de `gastos/logic.js`). Prioridad: meta completada
 * gana a cuanto falta. Con el ojo de privacidad activo no hay cifra que
 * mostrar, asi que corta antes de mirar nada mas.
 *
 * @param {{ completada: boolean, faltante: number, ocultarSaldo: boolean }} datos
 * @returns {{ texto: string, tono: 'ok' } | null}
 */
export function consecuenciaDeAporte({ completada, faltante, ocultarSaldo }) {
  if (ocultarSaldo) return null;
  if (completada) return { texto: 'Meta completada.', tono: 'ok' };
  return { texto: `Faltan ${f(faltante)} para tu meta.`, tono: 'ok' };
}

/**
 * Calcula cuánto ahorrar por periodo (según la frecuencia de ingreso del
 * usuario) para alcanzar la meta antes de la fecha límite. Reemplaza el
 * antiguo "$X por día" fijo (MT.4): reparte el faltante entre los periodos
 * de la frecuencia real con la que el usuario cobra, no entre días sueltos.
 *
 * Envoltorio del motor (`aportePorPeriodo`, MC.13b) con el vocabulario de este
 * dominio: aporta el faltante de la meta y su fecha límite, y devuelve el
 * resultado con los nombres que ya usa la vista.
 *
 * Devuelve `null` cuando no hay nada que sugerir:
 *   - la meta ya está cubierta (faltante <= 0), o
 *   - no hay fecha límite (sin plazo no hay ritmo), o
 *   - la fecha ya pasó.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuenciaIngresos - una de FRECUENCIAS_AHORRO; cualquier
 *   otro valor cae a 'Mensual' (lectura defensiva).
 * @returns {{
 *   montoPorPeriodo: number,
 *   numPeriodos: number,
 *   frecuencia: string,
 *   etiqueta: string,
 * }|null}
 */
export function calcularAhorroPorPeriodo(meta, frecuenciaIngresos) {
  const { faltante } = calcularProgreso(meta);
  const r = aportePorPeriodo(faltante, meta?.fechaLimite, frecuenciaIngresos, hoy());
  if (!r) return null;

  return {
    montoPorPeriodo: r.montoPorPeriodo,
    numPeriodos:     r.numPeriodos,
    frecuencia:      r.frecuencia,
    etiqueta:        r.etiqueta,
  };
}

/**
 * Genera el plan de aportes de una meta (MT.6c, ADR 048 D3): un registro de
 * aporte por cada fecha de ingreso hasta `meta.fechaLimite`. Se llama al
 * crear la meta, al editarla, al registrar un aporte y cuando cambia la
 * frecuencia del ingreso principal: el plan **se regenera completo**, nunca
 * se parcha (un ajuste manual sobre un aporte suelto no sobrevive).
 *
 * Sin fecha límite, meta ya cumplida o sin faltante, no hay plan: `[]`.
 *
 * El día de pago que ancla las fechas es el del ingreso de mayor monto entre
 * los que cobran en la frecuencia principal (el más representativo del
 * ritmo real); sin ninguno con día datable, `fechasAportePlan` cae a fechas
 * espaciadas uniformemente.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @param {string} hoyISO 'YYYY-MM-DD' de referencia (inyectable).
 * @returns {{fecha: string, monto: number}[]}
 */
export function generarPlanAportes(meta, ingresos, hoyISO = hoy()) {
  if (!meta?.fechaLimite) return [];

  const { faltante, completada } = calcularProgreso(meta);
  if (completada || faltante <= 0) return [];

  const activos     = (ingresos ?? []).filter(i => i?.activo !== false);
  const frecuencia  = frecuenciaPrincipalIngresos(activos);
  const principal   = activos
    .filter(i => normalizarFrecuenciaAporte(i.frecuencia) === frecuencia)
    .sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0))
    .at(0);

  return fechasAportePlan({
    faltante,
    fechaObjetivoISO: meta.fechaLimite,
    frecuencia,
    diaPago:        principal?.diaPago ?? null,
    fechaCreacion:  principal?.fechaCreacion,
    hoyISO,
  });
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de meta.
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarMeta(datos) {
  const errores = [];

  if (!datos.nombre?.trim()) {
    errores.push('El nombre de la meta es obligatorio.');
  }
  const objetivo = Number(datos.montoObjetivo);
  if (isNaN(objetivo) || objetivo <= 0) {
    errores.push('El monto objetivo debe ser un número mayor a 0.');
  }

  return errores;
}

/**
 * Valida el monto de un abono a una meta existente.
 * @param {string|number} monto
 * @returns {string[]}
 */
export function validarAbono(monto) {
  const n = Number(monto);
  if (isNaN(n) || n <= 0) {
    return ['El abono debe ser un número mayor a 0.'];
  }
  return [];
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.metas.
 * Asume que los datos ya pasaron `validarMeta()`.
 *
 * Ícono (MT.1, revisado en ID.3): `icono` solo guarda el emoji que el
 * usuario escribe a mano (el form MT.3 lo ofrece con la categoría 'Otra');
 * con categoría predefinida el ícono ya no se almacena, la vista lo
 * resuelve desde CATEGORIA_META_ICONO al renderizar (así un cambio futuro
 * del sprite no deja emojis viejos congelados en los datos). Sin emoji
 * manual queda null y la vista cae a la diana i-metas.
 *
 * EDIT.1: `metaExistente` (opcional) distingue crear de editar. Al crear,
 * `montoActual` arranca en 0 (nada aportado todavía). Al editar, el
 * histórico de aportes **se conserva tal cual** (recomendación explícita
 * de la auditoría, patrón P3: corregir un dato no debe borrar progreso ya
 * hecho); `completada` sí se recalcula, porque cambiar el objetivo puede
 * cruzar el umbral de cumplimiento en cualquier dirección con el mismo
 * `montoActual` de siempre.
 *
 * MT.6b: `subcategoriaId` (ADR 048 D1, estructura del ADR 064) solo se
 * guarda si de verdad es hija de la categoría enviada. El form ya lo
 * garantiza (el `<fieldset>` de la subcategoría de otra categoría llega
 * `disabled` y no manda su valor), pero la función valida igual: es la
 * única puerta de guardado y no debe confiar en que el DOM se comportó.
 *
 * @param {Record<string, string>} datos
 * @param {import('../../core/state.js').Meta|null} [metaExistente] modo edición si se pasa.
 */
export function normalizarMeta(datos, metaExistente = null) {
  const categoria     = datos.categoria?.trim() || null;
  const montoObjetivo = Number(datos.montoObjetivo);
  const montoActual   = metaExistente ? (metaExistente.montoActual ?? 0) : 0;
  const { completada } = calcularProgreso({ montoObjetivo, montoActual });

  const subcategoriaBruta = datos.subcategoriaId?.trim() || null;
  const subcategoriaId = subcategoriaBruta
    && hijosDeCategoria(SUBCATEGORIAS_META, categoria).some(h => h.id === subcategoriaBruta)
    ? subcategoriaBruta
    : null;

  return {
    nombre:        datos.nombre.trim(),
    montoObjetivo,
    montoActual,
    fechaLimite:   datos.fechaLimite?.trim() || null,
    categoria,
    subcategoriaId,
    icono:         datos.icono?.trim() || null,
    nota:          datos.nota?.trim() || '',
    completada,
  };
}
