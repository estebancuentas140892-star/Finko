/**
 * tesoreria/logic.js - barrel de re-exports de la capa de logica pura.
 *
 * La logica del dominio esta dividida en 3 sub-modulos bajo `logic/`. Este
 * archivo solo re-exporta las funciones publicas, manteniendo la API estable
 * para view.js, acciones/, index.js y los tests.
 *
 * Sub-modulos:
 *   - logic/cuentas.js         -> cuentas, cuota de manejo, GMF (4x1000)
 *   - logic/ingresos.js        -> ingresos recurrentes y puntuales, salario minimo,
 *                                 fechas de cobro, prima de servicios
 *   - logic/distribucion.js    -> asistente "Distribuir mi ingreso" completo
 *   - logic/transferencias.js  -> transferencias entre cuentas propias (MC.17)
 *
 * Regla: los sub-modulos siguen siendo puros (sin DOM, sin S directo),
 * testeables en Node/Vitest sin mocks de navegador.
 */

export {
  cuentasActivas,
  calcularTotalCuentas,
  composicionCuentas,
  resumenCuentas,
  validarCuenta,
  parseCuotaManejo,
  parseDatosTransferencia,
  normalizarCuenta,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
  calcularCostoGMF,
  detectarNudgeGMF,
} from './logic/cuentas.js';

export {
  estimarSalarioMensual,
  diasParaPrimaSemestral,
  sugerirDistribucionPrima,
  diasParaProximoPago,
  detectarNudgeProximoIngreso,
  ultimoPagoHasta,
  FRECUENCIAS_CON_DIA,
  validarIngreso,
  normalizarIngreso,
  calcularSalarioMinimo,
  montoSalarioMinimoPorPeriodo,
  validarIngresoPuntual,
  normalizarIngresoPuntual,
} from './logic/ingresos.js';

export {
  calcularGastosFijosMensuales,
  construirDesgloseNecesidades,
  estadoDistribucion,
  PRESETS_DISTRIBUCION,
  esDistribucionPersonalizadaValida,
  calcularAporteMensualObjetivos,
  construirDesgloseAhorroPorObjetivo,
  presupuestosSobreRemanente,
  calcularGastoVariablePromedio,
  construirContextoDistribucion,
  sugerirDistribucionIngreso,
  resumirPlanDistribucion,
  topeAbonoExtraDeuda,
  construirPlanDeudas,
  construirPlanInversiones,
  construirFilasTransferenciaCuentas,
} from './logic/distribucion.js';

export {
  validarTransferencia,
  saldoSuficiente,
  costoGMFRetiro,
  origenSujetoAGMF,
  normalizarTransferencia,
  calcularTransferencia,
} from './logic/transferencias.js';
