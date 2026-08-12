/**
 * compromisos/logic.js - barrel de re-exports de la capa de logica pura.
 *
 * La logica del dominio esta dividida en 4 sub-modulos bajo `logic/`. Este
 * archivo solo re-exporta las funciones publicas, manteniendo la API estable
 * para views/, index.js, los tests y los consumidores externos documentados
 * (agenda, analisis e infra/notificaciones importan de aqui).
 *
 * Sub-modulos:
 *   - logic/modelo.js     -> tipos, tasas, consultas, validacion, normalizacion
 *   - logic/alertas.js    -> fijos sin pagar, deudas durmiendo, vencidos, prioridades
 *   - logic/estrategia.js -> simulaciones de pago, recomendacion, reparto del extra
 *   - logic/abonos.js     -> aritmetica de abonos y estado de pago del mes
 *
 * Regla: los sub-modulos siguen siendo puros (sin DOM, sin S directo),
 * testeables en Node/Vitest sin mocks de navegador.
 */

export {
  TIPOS_COMPROMISO,
  TIPOS_DEUDA,
  LABEL_TIPO,
  ICONO_TIPO,
  esDeuda,
  tasaMensualToEA,
  tasaEADe,
  compromisosActivos,
  calcularCompromisoMensual,
  calcularTotalCompromisos,
  calcularFijosMensuales,
  resumenDeudas,
  proximoVencimiento,
  urgencia,
  compromisosProximos,
  nivelAlertaMora,
  validarCompromiso,
  detectarDeudaCreciente,
  tasaMensualDecimal,
  normalizarCompromiso,
} from './logic/modelo.js';

export {
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  vencidosSinPagar,
  agruparPorDiasRestantes,
  sumarMontos,
} from './logic/alertas.js';

export {
  simularPagoDeuda,
  simularRenegociacion,
  simularConsolidacion,
  filtrarDeudasPagables,
  simularEstrategiaPago,
  compararEstrategias,
  recomendarEstrategia,
  recomendarPalanca,
  repartirExtraEnCuotas,
} from './logic/estrategia.js';

export {
  aplicarAbonoASaldo,
  revertirAbonoDeSaldo,
  ajustarMontoAbono,
  consecuenciaDeAbono,
  validarAbono,
  calcularAbonosDelMes,
  fechaUltimoAbono,
  estadoPagoMes,
  deltasSaldoCompromisoPorEdicionGasto,
} from './logic/abonos.js';
