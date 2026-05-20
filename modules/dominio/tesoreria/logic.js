/**
 * tesoreria/logic.js - funciones puras de la capa de tesorería.
 *
 * Reglas:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningún mock de navegador.
 */

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra las cuentas que están activas (`activa !== false`).
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @returns {import('../../core/state.js').Cuenta[]}
 */
export function cuentasActivas(cuentas) {
  return cuentas.filter(c => c.activa !== false);
}

/**
 * Suma el saldo de todas las cuentas activas.
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @returns {number} Total en COP.
 */
export function calcularTotalCuentas(cuentas) {
  return cuentasActivas(cuentas).reduce((acc, c) => acc + (c.saldo ?? 0), 0);
}

// ── PRIMA DE SERVICIOS - recordatorio (G.3.F9) ──────────────────

/**
 * Calcula los días que faltan para la próxima prima de servicios.
 *
 * Fechas de pago en Colombia:
 *   Primer semestre:  30 de junio.
 *   Segundo semestre: 20 de diciembre.
 *
 * @param {Date} [hoy] - Fecha de referencia (default: ahora).
 * @returns {{ dias: number, fecha: string, semestre: 1 | 2 }}
 */
export function diasParaPrimaSemestral(hoy = new Date()) {
  // Normalizar a medianoche local para comparación limpia de fechas.
  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const anio    = hoyNorm.getFullYear();

  const candidatos = [
    { fecha: new Date(anio,      5, 30), semestre: 1 },  // 30 jun este año
    { fecha: new Date(anio,     11, 20), semestre: 2 },  // 20 dic este año
    { fecha: new Date(anio + 1,  5, 30), semestre: 1 },  // 30 jun próximo año
  ];

  // Tomar el candidato más próximo que no haya pasado aún (>= hoy).
  const proximo = candidatos
    .filter(c => c.fecha >= hoyNorm)
    .sort((a, b) => a.fecha - b.fecha)[0];

  const msPerDay = 1000 * 60 * 60 * 24;
  const dias     = Math.round((proximo.fecha.getTime() - hoyNorm.getTime()) / msPerDay);
  const d        = proximo.fecha;
  const fecha    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { dias, fecha, semestre: proximo.semestre };
}

// ── PRIMA DE SERVICIOS - distribución (G.3.F8) ──────────────────

/**
 * Estima el salario mensual como suma de todos los ingresos activos
 * con frecuencia 'Mensual'. Proxy para calcular la prima semestral.
 *
 * @param {import('../../core/state.js').Ingreso[]} ingresos
 * @returns {number} COP/mes (0 si no hay ingresos mensuales registrados).
 */
export function estimarSalarioMensual(ingresos) {
  return ingresos
    .filter(i => i.activo !== false && i.frecuencia === 'Mensual')
    .reduce((acc, i) => acc + (i.monto ?? 0), 0);
}

/**
 * Calcula la prima semestral estimada y sugiere su distribución.
 *
 * Fórmula simplificada (semestre completo = 180 dias trabajados):
 *   prima = salario * 180 / 360
 *
 * Distribución sugerida:
 *   50% → fondo de emergencia
 *   30% → pago de deudas activas (solo si tieneDeudas = true)
 *   20% → metas de ahorro (sube a 50% cuando no hay deudas)
 *
 * @param {number} salario       - Ingreso mensual en COP.
 * @param {boolean} tieneDeudas  - true si hay compromisos tipo 'deuda' activos.
 * @returns {{
 *   prima:     number,
 *   fondo:     number,
 *   deudas:    number,
 *   ahorro:    number,
 *   fondoPct:  number,
 *   deudasPct: number,
 *   ahorroPct: number,
 * }}
 */
export function sugerirDistribucionPrima(salario, tieneDeudas) {
  const prima     = Math.round(salario * 180 / 360);
  const fondoPct  = 50;
  const deudasPct = tieneDeudas ? 30 : 0;
  const ahorroPct = 100 - fondoPct - deudasPct;      // 20 con deudas, 50 sin

  return {
    prima,
    fondo:     Math.round(prima * fondoPct  / 100),
    deudas:    Math.round(prima * deudasPct / 100),
    ahorro:    Math.round(prima * ahorroPct / 100),
    fondoPct,
    deudasPct,
    ahorroPct,
  };
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Valida los datos del formulario antes de guardar.
 * Devuelve un array de mensajes de error (vacío = válido).
 *
 * @param {Record<string, string>} datos - entradas del formulario (valores como string).
 * @returns {string[]}
 */
export function validarCuenta(datos) {
  const errores = [];

  // Nombre es opcional: si esta vacio, normalizarCuenta() lo autogenera.
  if (!datos.banco?.trim() || datos.banco === '') {
    errores.push('Debés elegir un banco o billetera.');
  }
  if (!datos.tipo?.trim() || datos.tipo === '') {
    errores.push('Debés elegir el tipo de cuenta.');
  }
  const saldo = Number(datos.saldo);
  if (isNaN(saldo) || saldo < 0) {
    errores.push('El saldo debe ser un número igual o mayor a 0.');
  }

  return errores;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte los datos crudos del formulario al shape del schema de S.cuentas.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../core/state.js').Cuenta, 'id' | 'fechaCreacion'>}
 */
export function normalizarCuenta(datos) {
  const banco  = datos.banco.trim();
  const tipo   = datos.tipo;
  // Si el usuario no escribio nombre, autogenerar uno legible:
  //   "Davivienda Ahorros" / "Nequi Otro" / "Efectivo".
  // Para el banco "Efectivo" + tipo "Efectivo" evitamos duplicar.
  const nombreUsuario = datos.nombre?.trim();
  const nombre = nombreUsuario || _autoNombre(banco, tipo);
  return {
    nombre,
    banco,
    tipo,
    saldo: Number(datos.saldo) || 0,
    icono: datos.icono?.trim() || _iconoPorBanco(banco),
    activa: true,
  };
}

/** Genera un nombre legible cuando el usuario lo deja en blanco. */
function _autoNombre(banco, tipo) {
  if (!banco) return tipo || 'Cuenta';
  if (!tipo)  return banco;
  // Evitar redundancia "Efectivo Efectivo".
  if (banco.toLowerCase() === tipo.toLowerCase()) return banco;
  return `${banco} ${tipo}`;
}

/**
 * Devuelve un emoji representativo según el banco/billetera.
 * Fallback general: '🏦'.
 *
 * @param {string} banco
 * @returns {string}
 */
function _iconoPorBanco(banco) {
  const mapa = {
    Nequi: '💚',
    Daviplata: '🟡',
    Nubank: '💜',
    'Lulo Bank': '🟠',
    Efectivo: '💵',
  };
  return mapa[banco] ?? '🏦';
}
