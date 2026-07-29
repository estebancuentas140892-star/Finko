/**
 * inversiones/logic.js - funciones puras del dominio Inversión (J.2).
 * Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 *
 * Registra inversiones reales del usuario (CDT, fondos, acciones, cripto) con
 * monto, tasa EA estimada, plazo y fecha de inicio. En J.2a solo se usa el
 * `monto` para el total invertido; la tasa y el plazo se capturan para que
 * J.2b proyecte el valor al vencimiento sin pedir datos de nuevo.
 *
 * Respeta la regla ADN #10: recibe primitivos/arrays, no importa de otro dominio.
 * Sí importa de `infra/financiero.js` (capa infra, no dominio): ahí viven las
 * fórmulas financieras CO reutilizables (CDT, interés compuesto, Fisher).
 */

import { calcularRentabilidadReal } from '../../infra/financiero.js';
import {
  calcularTotalInvertido,
  calcularPorTipo,
  esProyectable,
  proyectarInversion,
  proyectarPortafolio,
  columnasPortafolio,
} from '../../infra/portafolio.js';

// Lo invertido, su proyección al vencimiento y la geometría de las dos columnas
// viven en `infra/portafolio.js` desde DIS.19: la casa de Ahorro dibuja el mismo
// gráfico en su carril "Dinero que pusiste a crecer" y `columnasPortafolio()` no
// se puede mover sola (arrastra la proyección de la que se deriva). Se
// re-exportan con el nombre que este dominio ya usaba, así que ni las vistas ni
// los tests cambian de importación.
export {
  calcularTotalInvertido,
  calcularPorTipo,
  esProyectable,
  proyectarInversion,
  proyectarPortafolio,
  columnasPortafolio,
};

// ── TIPOS DE INVERSIÓN ───────────────────────────────────────────

/**
 * Tipos soportados. El orden define el del selector en el formulario.
 * 'Otro' cubre cualquier vehículo no listado (bonos, finca raíz, etc.).
 */
export const TIPOS_INVERSION = ['CDT', 'Fondo', 'Acciones', 'Cripto', 'Otro'];

/** Tasa EA máxima razonable para un campo de entrada (%). Evita valores absurdos. */
export const TASA_EA_MAX = 100;

/** Plazo máximo razonable en meses (50 años). Evita valores absurdos. */
export const PLAZO_MESES_MAX = 600;

// ── ORIGEN DEL DINERO (INV.1, ADR 053) ───────────────────────────

/**
 * Las dos ramas del origen del dinero.
 *
 * `cuenta`: salió de una cuenta que Finko ya conoce, así que registrar la
 * inversión tiene que descontar ese saldo. `preexistente`: la inversión ya
 * existía cuando el usuario empezó a usar la app, o el dinero nunca estuvo en
 * una cuenta registrada (nómina, rendimiento reinvertido, efectivo, regalo).
 *
 * Se pregunta con dos ramas explícitas y no con una casilla silenciosa: la
 * corrección del patrimonio depende de la respuesta y no hay un default seguro
 * para ambos casos ([ADR 053](../../../docs/DECISIONS/053-invariante-de-patrimonio.md)).
 */
export const ORIGENES_INVERSION = ['cuenta', 'preexistente'];

/**
 * Días hacia atrás dentro de los que una fecha de inicio se considera reciente.
 *
 * No es un umbral financiero, es una apuesta sobre el dato: si la inversión
 * arrancó este último mes, lo más probable es que el usuario ya estuviera usando
 * Finko y que el saldo que la app tiene registrado todavía incluya ese dinero,
 * así que hay que descontarlo. Con una fecha más vieja lo más probable es lo
 * contrario: el saldo que el usuario tecleó al registrar sus cuentas ya excluía
 * la inversión, y descontarla otra vez le borraría dinero que no tiene.
 */
export const DIAS_ORIGEN_RECIENTE = 30;

/**
 * Rama de origen que se sugiere para una fecha de inicio (INV.1).
 *
 * Convierte la pregunta nueva en una confirmación: el formulario ya pide la
 * fecha de inicio, así que la respuesta probable se deduce de un dato que el
 * usuario está escribiendo de todos modos. Es una **sugerencia**, no una
 * decisión: las dos ramas quedan visibles y el usuario puede cambiarla.
 *
 * Una fecha futura cuenta como reciente: es una inversión que se está haciendo
 * ahora y el dinero sale de una cuenta viva.
 *
 * @param {string} fechaInicio YYYY-MM-DD.
 * @param {string} hoyISO      YYYY-MM-DD (inyectable, para tests deterministas).
 * @returns {'cuenta'|'preexistente'} `preexistente` ante cualquier dato inválido:
 *   es la rama que no mueve dinero, así que un dato roto no descuenta un saldo.
 */
export function origenSugerido(fechaInicio, hoyISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaInicio ?? ''))) return 'preexistente';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hoyISO ?? '')))      return 'preexistente';

  const inicio = new Date(`${fechaInicio}T12:00:00Z`);
  const hoy    = new Date(`${hoyISO}T12:00:00Z`);
  if (isNaN(inicio) || isNaN(hoy)) return 'preexistente';

  const dias = Math.round((hoy - inicio) / 86_400_000);
  return dias <= DIAS_ORIGEN_RECIENTE ? 'cuenta' : 'preexistente';
}

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Ordena las inversiones de mayor a menor monto (posición más grande primero).
 * No muta el array original.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {Array} copia ordenada.
 */
export function ordenarInversionesPorMonto(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  return [...inversiones].sort((a, b) => (Number(b?.monto) || 0) - (Number(a?.monto) || 0));
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida el tipo de inversión contra TIPOS_INVERSION.
 * @param {string} raw
 * @returns {string[]} mensajes de error (vacío = válido).
 */
export function validarTipoInversion(raw) {
  if (typeof raw !== 'string' || !TIPOS_INVERSION.includes(raw)) {
    return ['Selecciona un tipo de inversión válido.'];
  }
  return [];
}

/**
 * Valida el nombre de la inversión (no vacío, hasta 60 caracteres).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarNombreInversion(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return ['El nombre es requerido.'];
  }
  if (raw.trim().length > 60) {
    return ['El nombre no puede superar los 60 caracteres.'];
  }
  return [];
}

/**
 * Valida el monto invertido (número > 0).
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return ['El monto debe ser un número.'];
  if (n <= 0)              return ['El monto invertido debe ser mayor que cero.'];
  return [];
}

/**
 * Valida la tasa EA estimada (%). Es opcional: 0 es válido (rentabilidad
 * variable, como acciones o cripto). Rango 0 a TASA_EA_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))       return ['La tasa debe ser un número.'];
  if (n < 0)                     return ['La tasa no puede ser negativa.'];
  if (n > TASA_EA_MAX)           return [`La tasa no puede superar ${TASA_EA_MAX}%.`];
  return [];
}

/**
 * Valida el plazo en meses. Opcional: 0 = sin plazo fijo (acciones, cripto).
 * Debe ser entero entre 0 y PLAZO_MESES_MAX.
 * @param {string|number} raw
 * @returns {string[]}
 */
export function validarPlazoMeses(raw) {
  if (raw === '' || raw == null) return []; // opcional: vacío = 0
  const n = Number(raw);
  if (!Number.isFinite(n))         return ['El plazo debe ser un número.'];
  if (!Number.isInteger(n))        return ['El plazo debe ser un número entero de meses.'];
  if (n < 0)                       return ['El plazo no puede ser negativo.'];
  if (n > PLAZO_MESES_MAX)         return [`El plazo no puede superar ${PLAZO_MESES_MAX} meses.`];
  return [];
}

/**
 * Valida la fecha de inicio (formato YYYY-MM-DD requerido).
 * @param {string} raw
 * @returns {string[]}
 */
export function validarFechaInicio(raw) {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return ['La fecha de inicio es requerida.'];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return ['El formato de fecha no es válido (se esperaba YYYY-MM-DD).'];
  }
  return [];
}

/**
 * Valida el origen del dinero y su cuenta (INV.1).
 *
 * `origen` puede faltar: el formulario no dibuja la pregunta cuando el usuario no
 * tiene ninguna cuenta activa, porque la rama "salió de una de mis cuentas" no
 * existiría. Ausente equivale a `preexistente`, que es la rama que no mueve
 * dinero.
 *
 * Con la rama de cuenta elegida, la cuenta es obligatoria: sin ella el descuento
 * no tiene destino y la inversión entraría al patrimonio sin haber salido de
 * ninguna parte, que es justo lo que el ADR 053 vino a cerrar.
 *
 * @param {string|undefined} origen
 * @param {string|undefined} cuentaId
 * @returns {string[]}
 */
export function validarOrigenInversion(origen, cuentaId) {
  if (origen === undefined || origen === null || origen === '') return [];
  if (!ORIGENES_INVERSION.includes(origen)) {
    return ['Elige de dónde sale el dinero de esta inversión.'];
  }
  if (origen === 'cuenta' && String(cuentaId ?? '').trim() === '') {
    return ['Elige la cuenta de la que sale el dinero.'];
  }
  return [];
}

/**
 * Valida todos los campos del formulario de inversión de una sola pasada.
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string,
 *          origen?:string, cuentaId?:string}} datos
 * @returns {string[]} todos los errores acumulados (vacío = válido).
 */
export function validarInversion(datos) {
  const d = datos ?? {};
  return [
    ...validarTipoInversion(d.tipo),
    ...validarNombreInversion(d.nombre),
    ...validarMontoInversion(d.monto),
    ...validarTasaEAInversion(d.tasaEA),
    ...validarPlazoMeses(d.plazoMeses),
    ...validarFechaInicio(d.fechaInicio),
    ...validarOrigenInversion(d.origen, d.cuentaId),
  ];
}

// ── NORMALIZACIÓN ────────────────────────────────────────────────

/** Redondea el monto a entero COP; 0 si no es válido. */
export function normalizarMontoInversion(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** Tasa EA con 2 decimales, acotada a [0, TASA_EA_MAX]; 0 si vacío o inválido. */
export function normalizarTasaEAInversion(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, TASA_EA_MAX) * 100) / 100;
}

/** Plazo entero >= 0; 0 si vacío o inválido. */
export function normalizarPlazoMeses(raw) {
  if (raw === '' || raw == null) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), PLAZO_MESES_MAX);
}

/**
 * Construye un objeto inversión normalizado a partir de los datos crudos del
 * formulario. No asigna `id` ni `fechaCreacion`: eso lo hace crud.guardar().
 *
 * `cuentaId` solo se escribe cuando el usuario eligió la rama de cuenta (INV.1).
 * En la otra rama la propiedad **no se agrega**, ni siquiera vacía: su presencia
 * es lo que dice "esta inversión descontó un saldo", y guardar `cuentaId: ''`
 * dejaría un dato que parece origen y no lo es. Mismo criterio que
 * `normalizarPersonal()` con el `cuentaId` de PE.7.
 *
 * @param {{tipo:string, nombre:string, monto:string|number,
 *          tasaEA:string|number, plazoMeses:string|number, fechaInicio:string,
 *          origen?:string, cuentaId?:string}} datos
 * @returns {{tipo:string, nombre:string, monto:number, tasaEA:number,
 *           plazoMeses:number, fechaInicio:string, cuentaId?:string}}
 */
export function normalizarInversion(datos) {
  const d = datos ?? {};
  const inv = {
    tipo:        TIPOS_INVERSION.includes(d.tipo) ? d.tipo : 'Otro',
    nombre:      String(d.nombre ?? '').trim(),
    monto:       normalizarMontoInversion(d.monto),
    tasaEA:      normalizarTasaEAInversion(d.tasaEA),
    plazoMeses:  normalizarPlazoMeses(d.plazoMeses),
    fechaInicio: String(d.fechaInicio ?? '').trim(),
  };

  const cuentaId = String(d.cuentaId ?? '').trim();
  if (d.origen === 'cuenta' && cuentaId !== '') inv.cuentaId = cuentaId;

  return inv;
}

// ── PROYECCIÓN AL VENCIMIENTO (J.2b) ─────────────────────────────

/**
 * Tasa EA nominal promedio del portafolio, ponderada por monto, considerando
 * solo los holdings proyectables.
 *
 * @param {Array} inversiones
 * @returns {number|null} % EA (2 decimales), o null si no hay proyectables.
 */
export function tasaPromedioPonderada(inversiones) {
  if (!Array.isArray(inversiones)) return null;
  let sumaPonderada = 0;
  let sumaMontos    = 0;
  for (const inv of inversiones) {
    if (!esProyectable(inv)) continue;
    const monto = Number(inv.monto);
    sumaPonderada += monto * Number(inv.tasaEA);
    sumaMontos    += monto;
  }
  if (sumaMontos <= 0) return null;
  return Math.round((sumaPonderada / sumaMontos) * 100) / 100;
}

/**
 * Rentabilidad real del portafolio ajustada por inflación (fórmula de Fisher).
 * Usa la tasa nominal promedio ponderada y el capital de los holdings
 * proyectables.
 *
 * @param {Array} inversiones
 * @param {number} inflacionPct  inflación anual esperada en porcentaje (ej. 3).
 * @returns {{
 *   tasaNominalPct: number,
 *   tasaRealPct: number,
 *   capital: number,
 *   gananciaReal: number,
 *   perdidaInflacion: number,
 * } | null} null si no hay holdings proyectables.
 */
export function calcularRentabilidadRealPortafolio(inversiones, inflacionPct) {
  const tasaNominal = tasaPromedioPonderada(inversiones);
  if (tasaNominal === null) return null;

  let capital = 0;
  for (const inv of inversiones) {
    if (esProyectable(inv)) capital += Number(inv.monto) || 0;
  }

  const infl = Number.isFinite(Number(inflacionPct)) ? Number(inflacionPct) : 0;
  const r = calcularRentabilidadReal(capital, tasaNominal, infl);
  return {
    tasaNominalPct:   tasaNominal,
    tasaRealPct:      r.tasaRealPct,
    capital,
    gananciaReal:     r.gananciaReal,
    perdidaInflacion: r.perdidaInflacion,
  };
}

// ── EDUCACIÓN / NUDGES (J.2c) ────────────────────────────────────

/** Un solo tipo concentra demasiado el portafolio a partir de este %. */
export const UMBRAL_CONCENTRACION_PCT = 70;

/** El portafolio tiene demasiado peso en retorno variable a partir de este %. */
export const UMBRAL_VARIABLE_PCT = 50;

/**
 * Detecta nudges educativos sobre el portafolio. No tiene DOM ni efectos: el
 * caller (index/view) lee el estado del fondo de emergencia (`contexto`) sin
 * que este dominio importe a otro (regla ADN #10), y la vista pinta el HTML.
 *
 * Orden de prioridad (mayor severidad primero):
 *   1. Fondo de emergencia primero (high si no hay fondo, medium si incompleto).
 *   2. Concentración: un tipo supera UMBRAL_CONCENTRACION_PCT (con 2+ holdings).
 *   3. Retorno variable: el peso variable supera UMBRAL_VARIABLE_PCT.
 *   4. Refuerzo positivo: base sana (fondo completo + diversificado).
 *
 * @param {Array} inversiones
 * @param {{ fondoActivo?: boolean, fondoCompletado?: boolean }} [contexto]
 * @returns {Array<{id:string, nivel:string, icono:string, titulo:string, desc:string}>}
 */
export function detectarNudgesInversion(inversiones, contexto = {}) {
  const lista = Array.isArray(inversiones)
    ? inversiones.filter(i => Number(i?.monto) > 0)
    : [];
  if (lista.length === 0) return [];

  const { fondoActivo = false, fondoCompletado = false } = contexto;
  const total   = calcularTotalInvertido(lista);
  const porTipo = calcularPorTipo(lista);
  const nudges  = [];

  // 1. Fondo de emergencia primero.
  if (!fondoActivo) {
    nudges.push({
      id:     'fondo-primero',
      nivel:  'nudge-high',
      icono:  '🛡️',
      titulo: 'Asegura tu fondo de emergencia antes de invertir',
      desc:   'Si surge un imprevisto sin un colchón, podrías tener que vender una inversión en mal momento o endeudarte. Actívalo en la pestaña Fondo.',
    });
  } else if (!fondoCompletado) {
    nudges.push({
      id:     'fondo-incompleto',
      nivel:  'nudge-medium',
      icono:  '🛡️',
      titulo: 'Tu fondo de emergencia aún no está completo',
      desc:   'Vas bien invirtiendo, pero prioriza terminar tu colchón: es tu red de seguridad antes que la rentabilidad.',
    });
  }

  // 2. Concentración por tipo (solo tiene sentido con 2 o más holdings).
  if (lista.length >= 2 && porTipo.length > 0 && porTipo[0].pct >= UMBRAL_CONCENTRACION_PCT) {
    nudges.push({
      id:     'concentracion',
      nivel:  'nudge-medium',
      icono:  '⚖️',
      titulo: `El ${porTipo[0].pct}% de tu portafolio está en ${porTipo[0].tipo}`,
      desc:   'Concentrar todo en un solo tipo aumenta el riesgo. Repartir entre varios (renta fija, fondos, acciones) suaviza los altibajos.',
    });
  }

  // 3. Peso en retorno variable (acciones/cripto sin tasa o plazo fijo).
  const montoVariable = lista
    .filter(i => !esProyectable(i))
    .reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const pctVariable = total > 0 ? Math.round((montoVariable / total) * 100) : 0;
  if (pctVariable >= UMBRAL_VARIABLE_PCT) {
    nudges.push({
      id:     'riesgo-variable',
      nivel:  'nudge-info',
      icono:  '🎢',
      titulo: `El ${pctVariable}% de tu portafolio es de retorno variable`,
      desc:   'Acciones y cripto pueden subir mucho, pero también caer. Invierte aquí solo lo que no necesitarás a corto plazo y te haga sentir cómodo.',
    });
  }

  // 4. Refuerzo positivo: fondo completo y portafolio diversificado.
  const diversificado = porTipo.length >= 2 && (porTipo[0]?.pct ?? 100) < UMBRAL_CONCENTRACION_PCT;
  if (fondoCompletado && diversificado) {
    nudges.push({
      id:     'base-sana',
      nivel:  'nudge-success',
      icono:  '🌟',
      titulo: 'Vas por buen camino',
      desc:   'Tu fondo de emergencia está completo y tu portafolio está diversificado. Esa es una base financiera sólida.',
    });
  }

  return nudges;
}

// ── LOS TRES MOMENTOS (DIS.17) ───────────────────────────────────

/**
 * El recorrido del inversionista tiene tres momentos y la sección solo puede
 * construir dos. El tercero ("tu dinero ya trabaja para ti") necesita el valor
 * real de cada inversión en el tiempo, y Finko solo guarda el monto que se puso
 * y la tasa que el usuario escribió: sin ese dato la frase no tiene con qué
 * probarse. Queda diseñado y fuera del código. El conteo sí lo nombra ("momento
 * 1 de 3"), porque el usuario merece saber que hay camino por delante.
 */
export const TOTAL_MOMENTOS = 3;

/**
 * Qué es cada tipo de inversión, en una frase. Solo se muestra en el momento 1,
 * cuando hay una sola inversión registrada, y desaparece después: una
 * explicación que se repite para siempre deja de educar y pasa a ser ruido.
 */
export const EXPLICACION_TIPO = {
  CDT:      'Un CDT es dinero que le prestas al banco por un plazo fijo. Sabes desde el primer día cuánto te va a devolver, y no puedes sacarlo antes sin perder la ganancia.',
  Fondo:    'Un fondo reúne el dinero de muchas personas y lo invierte por ti. No te promete una cifra exacta, pero suele moverse menos que las acciones.',
  Acciones: 'Al comprar acciones te vuelves dueño de un pedazo de una empresa. Puede subir o bajar, y nadie te garantiza cuánto.',
  Cripto:   'Las criptomonedas suben y bajan mucho en poco tiempo. Nadie responde por su precio, así que aquí solo va dinero que puedas dejar quieto.',
  Otro:     'Registraste una inversión por fuera de los tipos que Finko conoce. Los cálculos usan la tasa y el plazo que escribiste.',
};

/**
 * El rasgo de cada tipo en dos o tres palabras: qué esperar de ese dinero.
 * Es la leyenda del gráfico, donde la lista de porcentajes tenía sentido
 * pedagógico solo si cada parte decía qué es.
 */
export const RASGO_TIPO = {
  CDT:      'plazo fijo',
  Fondo:    'riesgo bajo',
  Acciones: 'sube o baja',
  Cripto:   'sube o baja',
  Otro:     '',
};

/** @param {string} tipo @returns {string} '' si el tipo no tiene rasgo propio. */
export function rasgoTipo(tipo) {
  return RASGO_TIPO[tipo] ?? '';
}

/** @param {string} tipo @returns {string} explicación del instrumento. */
export function explicacionTipo(tipo) {
  return EXPLICACION_TIPO[tipo] ?? EXPLICACION_TIPO.Otro;
}

/**
 * Fecha en la que vence una inversión: `fechaInicio` más `plazoMeses`, con el
 * día acotado al último del mes destino (31 ene + 1 mes = 28/29 feb), mismo
 * criterio que `_addMeses` de `infra/vencimientos.js`.
 *
 * @param {{fechaInicio:string, plazoMeses:number}} inv
 * @returns {string|null} 'YYYY-MM-DD', o null si no hay plazo o fecha válida.
 */
export function fechaVencimientoInversion(inv) {
  const plazo  = Number(inv?.plazoMeses);
  const inicio = String(inv?.fechaInicio ?? '').trim();
  if (!Number.isFinite(plazo) || plazo <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return null;

  const [anio, mes, dia] = inicio.split('-').map(Number);
  const base   = new Date(anio, mes - 1 + plazo, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const fin    = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, ultimo));
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`;
}

/**
 * El momento en el que está el usuario (DIS.17, arquitectura O).
 *
 * La cabecera de la sección deja de ser un total y pasa a ser la etapa: lo que
 * se enseña cambia cuando el usuario cambia. Con una inversión la sección
 * explica qué compró; con dos o más muestra el conjunto y de qué está hecho.
 *
 * Los nudges no se apilan: se absorben aquí. La concentración y el refuerzo
 * positivo entran en la frase del momento, y el del fondo de emergencia sale
 * como `aviso` porque además cambia la acción principal.
 *
 * @param {Array} inversiones
 * @param {{ fondoActivo?: boolean, fondoCompletado?: boolean }} [contexto]
 * @returns {{
 *   numero: number, chip: string, titulo: string, frase: string,
 *   anticipoKicker: string, anticipo: string, accion: string,
 *   aviso: {id:string, nivel:string, titulo:string, desc:string} | null,
 * } | null} null si no hay ninguna inversión con monto.
 */
export function momentoInversion(inversiones, contexto = {}) {
  const lista = Array.isArray(inversiones)
    ? inversiones.filter(i => Number(i?.monto) > 0)
    : [];
  if (lista.length === 0) return null;

  const nudges = detectarNudgesInversion(lista, contexto);
  const aviso  = nudges.find(n => n.id === 'fondo-primero' || n.id === 'fondo-incompleto') ?? null;

  if (lista.length === 1) {
    return {
      numero:         1,
      chip:           'aprendiendo',
      titulo:         'Diste tu primer paso',
      frase:          explicacionTipo(lista[0].tipo),
      anticipoKicker: 'Siguiente momento',
      anticipo:       'Cuando tengas dos o más inversiones distintas, vas a ver cómo se reparte el riesgo entre ellas.',
      accion:         'Registrar otra inversión',
      aviso,
    };
  }

  const porTipo     = calcularPorTipo(lista);
  const concentrado = nudges.find(n => n.id === 'concentracion') ?? null;
  const baseSana    = nudges.some(n => n.id === 'base-sana');

  let frase;
  if (concentrado && porTipo.length > 0) {
    frase = `El ${porTipo[0].pct}% de lo que tienes invertido está en ${porTipo[0].tipo}. Repartirlo entre varios tipos suaviza los altibajos: si a uno le va mal, no te afecta todo.`;
  } else {
    frase = `Tienes ${lista.length} inversiones repartidas en ${porTipo.length} tipos distintos. Eso reparte el riesgo: si a uno le va mal, no te afecta todo.`;
    if (baseSana) frase += ' Con tu fondo de emergencia completo, esa es una base sólida.';
  }

  return {
    numero:         2,
    chip:           'construyendo',
    titulo:         'Estás construyendo patrimonio',
    frase,
    // El momento 3 no se puede prometer: necesita un dato que Finko no guarda.
    // El anticipo dice lo que sí es verdad hoy y no compromete una pantalla que
    // no existe.
    anticipoKicker: 'Lo que sigue',
    anticipo:       'Cada año que dejas quieta una inversión, el pedazo que pone el tiempo se hace más grande. Ese es el interés compuesto, y solo se ve con paciencia.',
    accion:         'Registrar una inversión',
    aviso,
  };
}
