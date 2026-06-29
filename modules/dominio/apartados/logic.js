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
 */

// ── CONSTANTES ───────────────────────────────────────────────────

/**
 * Frecuencias de aporte soportadas, alineadas a la frecuencia con la que el
 * usuario recibe ingresos. Subconjunto de FRECUENCIAS (core/constants.js): solo
 * las que tienen sentido como "cada cuánto aparto" para un gasto cercano.
 */
export const FRECUENCIAS_APORTE = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

/**
 * Mapeo de FRECUENCIAS (core) → FRECUENCIAS_APORTE.
 * Las frecuencias más largas (Bimestral, Trimestral, etc.) se asimilan a
 * 'Mensual', que es la frecuencia de planificación más cercana.
 */
const MAPA_FRECUENCIA_A_APORTE = {
  Diario:    'Diario',
  Semanal:   'Semanal',
  Quincenal: 'Quincenal',
  Mensual:   'Mensual',
  Bimestral: 'Mensual',
  Trimestral:'Mensual',
  Semestral: 'Mensual',
  Anual:     'Mensual',
};

/** Días calendario que dura cada periodo de aporte (promedio). */
const DIAS_POR_PERIODO = {
  Diario:    1,
  Semanal:   7,
  Quincenal: 15,
  Mensual:   30,
};

/**
 * Plantillas de gastos previsibles frecuentes en Colombia, para que el usuario
 * cree un apartado de un toque sin escribir el nombre. El fondo de emergencia
 * se omite a propósito: ya vive en el dominio Ahorro.
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
  { nombre: 'Productos personales',        icono: '🧴' },
  { nombre: 'Útiles escolares',            icono: '📚' },
  { nombre: 'Matrícula o semestre',        icono: '🎓' },
  { nombre: 'Renovación de documentos',    icono: '🪪' },
  { nombre: 'Regalos',                     icono: '🎁' },
  { nombre: 'Vacaciones',                  icono: '✈️' },
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
 * Devuelve la frecuencia de aporte recomendada a partir de los ingresos del
 * usuario. Busca la frecuencia más común entre los ingresos activos, mapeada a
 * una de FRECUENCIAS_APORTE. Si no hay ingresos activos, devuelve 'Mensual'.
 *
 * Se inyecta `ingresos` (no importa tesorería) para respetar ADN #10.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {string} Una de FRECUENCIAS_APORTE.
 */
export function frecuenciaPrincipalIngresos(ingresos) {
  const activos = (ingresos ?? []).filter(i => i.activo !== false);
  if (activos.length === 0) return 'Mensual';

  const conteo = {};
  for (const i of activos) {
    const f = MAPA_FRECUENCIA_A_APORTE[i.frecuencia] ?? 'Mensual';
    conteo[f] = (conteo[f] ?? 0) + 1;
  }

  // Más frecuente primero; en empate, la de mayor granularidad (índice menor).
  return Object.entries(conteo)
    .sort((a, b) => b[1] - a[1] || FRECUENCIAS_APORTE.indexOf(a[0]) - FRECUENCIAS_APORTE.indexOf(b[0]))
    .at(0)?.[0] ?? 'Mensual';
}

/**
 * Devuelve los apartados activos cuya fecha objetivo vence dentro de
 * `diasUmbral` días (inclusive). Excluye los ya completados o listos para
 * reiniciar (que ya tienen el dinero). Ordena de más urgente a menos.
 *
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {string}  hoyISO    YYYY-MM-DD.
 * @param {number}  [diasUmbral=60]
 * @returns {import('../../core/state.js').Apartado[]}
 */
export function apartadosProximos(apartados, hoyISO, diasUmbral = 60) {
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
 * Días calendario entre `hoyISO` y `fechaObjetivo`.
 * Devuelve `null` si no hay fecha objetivo o el formato es inválido.
 * Un valor <= 0 significa que la fecha ya pasó.
 *
 * `hoyISO` se inyecta para que el cálculo sea determinista en tests.
 *
 * @param {string|null|undefined} fechaObjetivo - YYYY-MM-DD.
 * @param {string} hoyISO - YYYY-MM-DD (día de referencia).
 * @returns {number|null}
 */
export function diasHastaFecha(fechaObjetivo, hoyISO) {
  if (!fechaObjetivo || !/^\d{4}-\d{2}-\d{2}$/.test(fechaObjetivo)) return null;
  if (!hoyISO || !/^\d{4}-\d{2}-\d{2}$/.test(hoyISO)) return null;
  const objetivo = new Date(fechaObjetivo + 'T00:00:00');
  const hoy      = new Date(hoyISO + 'T00:00:00');
  if (isNaN(objetivo) || isNaN(hoy)) return null;
  return Math.round((objetivo - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula cuánto debería apartar el usuario por periodo para reunir el faltante
 * antes de la fecha objetivo, según su frecuencia de aporte.
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
  if (faltante <= 0) return null;

  const dias = diasHastaFecha(apartado?.fechaObjetivo, hoyISO);
  if (dias === null || dias <= 0) return null;

  const frecuencia = FRECUENCIAS_APORTE.includes(apartado?.frecuenciaAporte)
    ? apartado.frecuenciaAporte
    : 'Mensual';
  const diasPorPeriodo = DIAS_POR_PERIODO[frecuencia];

  const numPeriodos      = Math.max(1, Math.ceil(dias / diasPorPeriodo));
  const aportePorPeriodo = Math.ceil(faltante / numPeriodos);

  return {
    aportePorPeriodo,
    numPeriodos,
    frecuencia,
    etiquetaPeriodo: etiquetaPeriodo(frecuencia),
    dias,
  };
}

/**
 * Etiqueta legible del periodo de aporte para usar en mensajes.
 * @param {string} frecuencia - una de FRECUENCIAS_APORTE.
 * @returns {string} ej. "por quincena", "al mes".
 */
export function etiquetaPeriodo(frecuencia) {
  switch (frecuencia) {
    case 'Diario':    return 'por día';
    case 'Semanal':   return 'por semana';
    case 'Quincenal': return 'por quincena';
    case 'Mensual':   return 'al mes';
    default:          return 'al mes';
  }
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
    montoActual:   excedente,
    completado:    false,
    fechaObjetivo: nuevaFecha,
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
    errores.push('El nombre del apartado es obligatorio.');
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
      errores.push('Indica cada cuántos meses se repite el apartado.');
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
