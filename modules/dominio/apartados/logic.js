/**
 * apartados/logic.js - funciones puras del dominio de apartados.
 *
 * Un "apartado" es un sobre donde el usuario reúne dinero, poco a poco, para un
 * gasto previsible (SOAT, impuestos, productos personales, vacaciones). A
 * diferencia de una Meta (un objetivo único como un viaje), el apartado existe
 * para prepararse ante gastos que de otro modo llegarían como una emergencia.
 *
 * El valor central es `calcularAporteSugerido`: dado el faltante, la fecha en
 * que se necesita y cada cuánto cobra el usuario, dice cuánto separar por
 * periodo ("aparta $30.000 por quincena").
 *
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * El ritmo de aporte (cada cuánto cobra el usuario y cuánto le toca por
 * período) ya no vive aquí: es del motor compartido `infra/vencimientos.js`
 * (MC.13b, ADR 041). Antes estaba duplicado carácter por carácter en
 * `metas/logic.js`, porque ADN #10 impide que un dominio importe a otro; la
 * copia única vive en infra, que sí pueden importar los dos.
 */

import {
  FRECUENCIAS_APORTE,
  aportePorPeriodo,
  etiquetaPeriodo,
  frecuenciaPrincipalIngresos,
} from '../../infra/vencimientos.js';
import { diasHastaFecha, planDeReferencia } from '../../infra/bolsas.js';

// ── CONSTANTES ───────────────────────────────────────────────────

export { FRECUENCIAS_APORTE, etiquetaPeriodo, frecuenciaPrincipalIngresos };

// El plan de aportes y su medida de días viven en `infra/bolsas.js` desde
// DIS.19: la casa de Ahorro dibuja la línea del plan en su carril de Apartados
// y necesita el mismo cálculo. Se re-exportan con el nombre que este dominio ya
// usaba, así que ni las vistas ni los tests cambian de importación.
export { diasHastaFecha, planDeReferencia };

/**
 * Plantillas de gastos previsibles frecuentes en Colombia, para que el usuario
 * cree un apartado de un toque sin escribir el nombre. El fondo de emergencia
 * se omite a propósito: ya vive en el dominio Ahorro. Curado por la taxonomía
 * CAT.1 (validada 2026-07-13, ver ADR 014): "Vacaciones" sale (objetivo grande
 * de largo plazo, vive en `CATEGORIAS_META`); "Matrícula o semestre" se divide
 * en "Matrícula escolar" (colegio, esporádico) y el semestre universitario,
 * que se planea como Meta; entran Veterinario, Mantenimiento del hogar, Seguro
 * del hogar y Reparaciones inesperadas; "Útiles escolares" se amplía a
 * "Útiles y uniformes".
 */
export const PLANTILLAS_APARTADO = [
  { nombre: 'SOAT',                        icono: '🚗' },
  { nombre: 'Revisión técnico-mecánica',   icono: '📋' },
  { nombre: 'Mantenimiento del vehículo',  icono: '🔧' },
  { nombre: 'Impuestos',                   icono: '🧾' },
  { nombre: 'Impuesto predial',            icono: '🏛️' },
  { nombre: 'Arriendo',                    icono: '🏠' },
  { nombre: 'Mercado',                     icono: '🛒' },
  { nombre: 'Alimento para mascotas',      icono: '🐾' },
  { nombre: 'Arena para gatos',            icono: '🐱' },
  { nombre: 'Veterinario',                 icono: '🩺' },
  { nombre: 'Productos personales',        icono: '🧴' },
  { nombre: 'Útiles y uniformes',          icono: '🎒' },
  { nombre: 'Matrícula escolar',           icono: '🎓' },
  { nombre: 'Mantenimiento del hogar',     icono: '🛠️' },
  { nombre: 'Seguro del hogar',            icono: '🛡️' },
  { nombre: 'Reparaciones inesperadas',    icono: '🧰' },
  { nombre: 'Renovación de documentos',    icono: '🪪' },
  { nombre: 'Regalos',                     icono: '🎁' },
  { nombre: 'Cumpleaños',                  icono: '🎂' },
  { nombre: 'Navidad',                     icono: '🎄' },
];

/**
 * Las 6 plantillas que quedan a la vista al abrir el formulario (T4, hallazgo
 * A8, decisión V3). Las otras 14 siguen disponibles, plegadas en el
 * `.form-details` que el mismo formulario ya usa para la recurrencia: veinte
 * chips medían 420px, el 34% de un formulario de 1.235px dentro de una hoja de
 * 776px, y empujaban "¿Cuánto necesitas reunir?" al borde del pliegue.
 * El catálogo completo no cambia: esto es composición, no curaduría.
 */
export const PLANTILLAS_APARTADO_FRECUENTES = [
  'SOAT',
  'Impuestos',
  'Impuesto predial',
  'Útiles y uniformes',
  'Regalos',
  'Navidad',
];

/** Icono por defecto cuando el usuario no elige uno. */
export const ICONO_APARTADO_DEFAULT = '📦';

/**
 * Presets de periodo de recurrencia (cada cuántos meses se repite el gasto).
 * El SOAT y los impuestos suelen ser anuales; el mercado, mensual.
 */
export const PERIODOS_RECURRENCIA = [
  { meses: 1,  etiqueta: 'Cada mes' },
  { meses: 3,  etiqueta: 'Cada 3 meses' },
  { meses: 6,  etiqueta: 'Cada 6 meses' },
  { meses: 12, etiqueta: 'Cada año' },
];

/** Periodo por defecto para un apartado recurrente (anual: SOAT, impuestos). */
export const PERIODO_RECURRENCIA_DEFAULT = 12;

/**
 * Días que definen "próximo" en toda la sección (T7, hallazgo A3, regla R25).
 *
 * Antes había dos umbrales para el mismo concepto: el aviso de proximidad
 * entraba a 60 días y el badge de la fila solo a 30. Un apartado a 45 días se
 * contaba en "y 2 apartados más con fecha próxima" y su fila no mostraba
 * ninguna señal: el usuario que bajaba a buscarlo no lo encontraba. Un umbral,
 * un concepto: lo consumen `apartadosProximos()` y el badge de la fila.
 */
export const DIAS_PROXIMO = 30;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra los apartados que deben mostrarse en la lista.
 *
 * Un apartado no recurrente desaparece al completarse (el gasto fue único).
 * Un apartado recurrente completado SÍ se mantiene visible: ya reunió el dinero
 * pero sigue activo, esperando que el usuario lo use y reinicie el ciclo (el
 * SOAT del próximo año, los impuestos del próximo periodo).
 *
 * @param {import('../../core/state.js').Apartado[]} apartados
 */
export function apartadosActivos(apartados) {
  return (apartados ?? []).filter(a => a.completado !== true || a.recurrente === true);
}

/**
 * True si el apartado ya reunió el dinero y está listo para usarse y reiniciar.
 * Solo aplica a recurrentes (los no recurrentes completados ya no se listan).
 * @param {import('../../core/state.js').Apartado} apartado
 */
export function estaListoParaReiniciar(apartado) {
  return apartado?.recurrente === true && calcularProgreso(apartado).completado === true;
}

/**
 * Devuelve los apartados activos cuya fecha objetivo vence dentro de
 * `diasUmbral` días (inclusive). Excluye los ya completados o listos para
 * reiniciar (que ya tienen el dinero). Ordena de más urgente a menos.
 *
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {string}  hoyISO    YYYY-MM-DD.
 * @param {number}  [diasUmbral=DIAS_PROXIMO]
 * @returns {import('../../core/state.js').Apartado[]}
 */
export function apartadosProximos(apartados, hoyISO, diasUmbral = DIAS_PROXIMO) {
  return (apartados ?? [])
    .filter(a => {
      if (a.completado === true) return false;
      const dias = diasHastaFecha(a.fechaObjetivo, hoyISO);
      return dias !== null && dias >= 0 && dias <= diasUmbral;
    })
    .sort((a, b) => {
      const da = diasHastaFecha(a.fechaObjetivo, hoyISO) ?? Infinity;
      const db = diasHastaFecha(b.fechaObjetivo, hoyISO) ?? Infinity;
      return da - db;
    });
}

/**
 * Calcula el progreso de un apartado.
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {{ porcentaje: number, faltante: number, completado: boolean }}
 */
export function calcularProgreso(apartado) {
  const objetivo = Number(apartado?.montoObjetivo) || 0;
  const actual   = Number(apartado?.montoActual)   || 0;

  if (objetivo <= 0) {
    return { porcentaje: 0, faltante: 0, completado: false };
  }

  const porcentaje = Math.min(100, Math.round((actual / objetivo) * 100));
  const faltante   = Math.max(0, objetivo - actual);

  return { porcentaje, faltante, completado: porcentaje >= 100 };
}

/**
 * Calcula cuánto debería apartar el usuario por periodo para reunir el faltante
 * antes de la fecha objetivo, según su frecuencia de aporte.
 *
 * Envoltorio del motor (`aportePorPeriodo`, MC.13b) con el vocabulario de este
 * dominio: aporta el faltante del apartado y su fecha objetivo, y devuelve el
 * resultado con los nombres que ya usan la vista y los mensajes.
 *
 * Devuelve `null` cuando no hay nada que sugerir:
 *   - el apartado ya está completo (faltante <= 0), o
 *   - no hay fecha objetivo (sin plazo no hay ritmo), o
 *   - la fecha ya pasó (dias <= 0).
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia, inyectable).
 * @returns {{
 *   aportePorPeriodo: number,
 *   numPeriodos: number,
 *   frecuencia: string,
 *   etiquetaPeriodo: string,
 *   dias: number,
 * } | null}
 */
export function calcularAporteSugerido(apartado, hoyISO) {
  const { faltante } = calcularProgreso(apartado);
  const r = aportePorPeriodo(faltante, apartado?.fechaObjetivo, apartado?.frecuenciaAporte, hoyISO);
  if (!r) return null;

  return {
    aportePorPeriodo: r.montoPorPeriodo,
    numPeriodos:      r.numPeriodos,
    frecuencia:       r.frecuencia,
    etiquetaPeriodo:  r.etiqueta,
    dias:             r.dias,
  };
}

/**
 * Etiqueta legible de cada cuánto se repite un apartado recurrente.
 * @param {number} meses
 * @returns {string} ej. "cada año", "cada 3 meses".
 */
export function etiquetaPeriodoMeses(meses) {
  if (meses === 1)  return 'cada mes';
  if (meses === 12) return 'cada año';
  return `cada ${meses} meses`;
}

// ── RECURRENCIA ──────────────────────────────────────────────────

/**
 * Suma `meses` a una fecha YYYY-MM-DD, recortando al último día del mes cuando
 * el día original no existe en el mes destino (ej. 31 de enero + 1 mes → 28/29
 * de febrero, no el 3 de marzo que daría el overflow de Date).
 *
 * @param {string} fechaISO - YYYY-MM-DD.
 * @param {number} meses - número de meses a sumar (entero positivo).
 * @returns {string|null} nueva fecha YYYY-MM-DD, o null si la entrada es inválida.
 */
export function avanzarMeses(fechaISO, meses) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null;
  if (!Number.isInteger(meses) || meses <= 0) return null;

  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const indiceMesDestino = (mes - 1) + meses;
  const anioDestino = anio + Math.floor(indiceMesDestino / 12);
  const mesDestino  = ((indiceMesDestino % 12) + 12) % 12; // 0-11

  // Día 0 del mes siguiente = último día del mes destino.
  const ultimoDia = new Date(anioDestino, mesDestino + 1, 0).getDate();
  const diaDestino = Math.min(dia, ultimoDia);

  const mm = String(mesDestino + 1).padStart(2, '0');
  const dd = String(diaDestino).padStart(2, '0');
  return `${anioDestino}-${mm}-${dd}`;
}

/**
 * Reinicia el ciclo de un apartado recurrente: el usuario ya usó el dinero (pagó
 * el SOAT, los impuestos) y el apartado vuelve a empezar para el próximo periodo.
 *
 * - Conserva el excedente sobre el objetivo (si reunió de más, no se pierde).
 * - Vuelve a `completado: false`.
 * - Avanza `fechaObjetivo` por `periodoMeses` hasta que quede en el futuro (cubre
 *   el caso de reiniciar mucho después del vencimiento).
 * - Anota `fechaInicioPlan` (DIS.15): el ciclo nuevo arranca hoy, así que el
 *   plan de referencia se mide desde aquí y no desde que se creó el apartado.
 *   Sin esta anotación, `planDeReferencia()` diría "8 de 8 aportes" para
 *   siempre en cuanto el apartado cumpliera un ciclo.
 *
 * No-op (devuelve el apartado intacto) si no es recurrente.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia, inyectable).
 * @returns {import('../../core/state.js').Apartado}
 */
export function reiniciarCiclo(apartado, hoyISO) {
  if (!apartado || apartado.recurrente !== true) return apartado;

  const periodoMeses = Number(apartado.periodoMeses) > 0
    ? Number(apartado.periodoMeses)
    : PERIODO_RECURRENCIA_DEFAULT;

  // Base del avance: la fecha objetivo actual, o hoy si no tiene.
  let nuevaFecha = apartado.fechaObjetivo && /^\d{4}-\d{2}-\d{2}$/.test(apartado.fechaObjetivo)
    ? apartado.fechaObjetivo
    : hoyISO;

  // Avanzar al menos un periodo, y seguir avanzando hasta superar hoy.
  do {
    nuevaFecha = avanzarMeses(nuevaFecha, periodoMeses);
  } while (nuevaFecha && diasHastaFecha(nuevaFecha, hoyISO) <= 0);

  const excedente = Math.max(0, (Number(apartado.montoActual) || 0) - (Number(apartado.montoObjetivo) || 0));

  return {
    ...apartado,
    montoActual:    excedente,
    completado:     false,
    fechaObjetivo:  nuevaFecha,
    fechaInicioPlan: hoyISO,
  };
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario de apartado.
 * @param {Record<string, string>} datos
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
export function validarApartado(datos) {
  const errores = [];

  if (!datos?.nombre?.trim()) {
    errores.push('El nombre de la reserva es obligatorio.');
  }

  const objetivo = Number(datos?.montoObjetivo);
  if (!Number.isFinite(objetivo) || objetivo <= 0) {
    errores.push('El monto objetivo debe ser un número mayor a 0.');
  }

  // Fecha objetivo es opcional. Si viene, debe tener formato válido.
  if (datos?.fechaObjetivo?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaObjetivo.trim())) {
    errores.push('La fecha objetivo debe estar en formato YYYY-MM-DD.');
  }

  // Frecuencia es opcional (default Mensual); si viene, debe ser válida.
  if (datos?.frecuenciaAporte && !FRECUENCIAS_APORTE.includes(datos.frecuenciaAporte)) {
    errores.push('La frecuencia de aporte no es válida.');
  }

  // Recurrencia: si el apartado se repite, el periodo debe ser un entero > 0.
  if (_esRecurrente(datos?.recurrente)) {
    const periodo = Number(datos?.periodoMeses);
    if (!Number.isInteger(periodo) || periodo <= 0) {
      errores.push('Indica cada cuántos meses se repite la reserva.');
    }
  }

  return errores;
}

/**
 * Interpreta el valor de "recurrente" del formulario. Un checkbox HTML envía
 * 'on' cuando está marcado y no envía la clave cuando no lo está; también
 * aceptamos booleanos por si llega desde código.
 * @param {unknown} valor
 * @returns {boolean}
 */
function _esRecurrente(valor) {
  return valor === true || valor === 'on' || valor === 'true' || valor === '1';
}

/**
 * Valida el monto de un aporte a un apartado existente.
 * @param {string|number} monto
 * @returns {string[]}
 */
export function validarAbonoApartado(monto) {
  const n = Number(monto);
  if (!Number.isFinite(n) || n <= 0) {
    return ['El aporte debe ser un número mayor a 0.'];
  }
  return [];
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.apartados.
 * Asume que los datos ya pasaron `validarApartado()`.
 * @param {Record<string, string>} datos
 */
export function normalizarApartado(datos) {
  const frecuencia = FRECUENCIAS_APORTE.includes(datos.frecuenciaAporte)
    ? datos.frecuenciaAporte
    : 'Mensual';

  const recurrente = _esRecurrente(datos.recurrente);
  const periodoMeses = recurrente
    ? (Number(datos.periodoMeses) > 0 ? Number(datos.periodoMeses) : PERIODO_RECURRENCIA_DEFAULT)
    : null;

  return {
    nombre:           datos.nombre.trim(),
    icono:            datos.icono?.trim() || ICONO_APARTADO_DEFAULT,
    montoObjetivo:    Number(datos.montoObjetivo),
    montoActual:      0,
    fechaObjetivo:    datos.fechaObjetivo?.trim() || null,
    frecuenciaAporte: frecuencia,
    recurrente,
    periodoMeses,
    completado:       false,
  };
}
