/**
 * compromisos/logic/modelo.js - el compromiso como modelo: catalogos de tipos, tasas
 * (EA/mensual), consultas, validacion y normalizacion del formulario.
 *
 * Sub-modulo de compromisos/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Testeable en Node/Vitest sin mocks de navegador.
 */

import { FRECUENCIAS, CATEGORIAS_AGENDA_NO_ESENCIALES, CATEGORIAS_DEUDA, CATEGORIAS_DEUDA_PERSONAL, ICONOS_CATEGORIA_PERSONALIZADA, esCategoriaAgenda } from '../../../core/constants.js';
import { ocurrenciasEnRango } from '../../../infra/vencimientos.js';
import { marcaEnCategoriaAgenda, marcaPorId } from '../../../infra/marcas.js';
import { pareceTarjeta, limpiarLlave, errorFormatoLlave, esTipoLlave } from '../../../infra/llaves.js';

// ── CATÁLOGOS LOCALES ────────────────────────────────────────────

/**
 * Tipos vigentes (v6).
 * - 'fijo'           → gasto recurrente con cuota fija (arriendo, servicios, suscripciones).
 *                      Se crea desde la sección Agenda; la sección Compromisos no lo expone.
 * - 'deuda-entidad'  → deuda con banco/fintech/tarjeta (tasa EA por ley).
 * - 'deuda-personal' → préstamo de un particular o gota a gota (tasa mensual usual).
 *
 * Los tipos antiguos 'deuda' y 'agenda' se migran automáticamente en storage.js
 * (v5 → v6) y nunca aparecen en datos vigentes.
 */
export const TIPOS_COMPROMISO = ['fijo', 'deuda-entidad', 'deuda-personal'];

/** Tipos que la sección Compromisos crea/lista (solo deudas a partir de v6). */
export const TIPOS_DEUDA = ['deuda-entidad', 'deuda-personal'];

/** Etiqueta legible por tipo. */
export const LABEL_TIPO = {
  'fijo':           'Gasto fijo',
  'deuda-entidad':  'Deuda con entidad',
  'deuda-personal': 'Deuda personal',
};

/** Id de icono SVG por tipo de compromiso (referencia al sprite #i-*). */
export const ICONO_TIPO = {
  'fijo':           'recurring',
  'deuda-entidad':  'cuentas',
  'deuda-personal': 'personales',
};

/** Devuelve true si el tipo corresponde a una deuda (entidad o personal). */
export function esDeuda(tipo) {
  return tipo === 'deuda-entidad' || tipo === 'deuda-personal';
}

/**
 * AG.4: con una categoría predefinida de Agenda o una personalizada de
 * sección 'fijo' (CAT.3c: mismo criterio, una categoría reutilizable ya dice
 * el nombre) el nombre del gasto fijo es la propia categoría: pedir un
 * nombre aparte sería redundante ("Arriendo" ya lo dice todo). Solo sin
 * categoría el usuario escribe su propio nombre. GF.1 (ADR 167 D3): "Otros"
 * es una categoría más, sin nombre ni ícono propios; quien quiere ponerle
 * nombre crea una categoría nueva.
 * @param {{ tipo?: string, categoria?: string }} datos
 * @param {{ nombre: string }[]} [personalizadasFijo] personalizadas de sección 'fijo'
 * @returns {boolean}
 */
function _categoriaFijoConNombreAuto(datos, personalizadasFijo = []) {
  return datos.tipo === 'fijo'
    && !!datos.categoria
    && (esCategoriaAgenda(datos.categoria)
      || personalizadasFijo.some(c => c.nombre === datos.categoria));
}

/**
 * PA.1a (ADR 052 D2): lee la marca de débito automático tal como puede llegar,
 * del `FormData` de un formulario (`'on'` cuando el checkbox está marcado,
 * ausente cuando no) o de un compromiso ya guardado (`true`/ausente). Un solo
 * lugar donde se decide qué cuenta como "sí": la validación y la normalización
 * no pueden discrepar.
 *
 * @param {{ debitoAutomatico?: string|boolean }} datos
 * @returns {boolean}
 */
export function esDebitoAutomatico(datos) {
  return datos?.debitoAutomatico === true || datos?.debitoAutomatico === 'on';
}

/**
 * Convierte una tasa mensual a su equivalente efectivo anual exacto.
 * tasaEA = (1 + tasaMensual)^12 - 1
 * @param {number} tasaMensual decimal (0.10 = 10% mensual)
 */
export function tasaMensualToEA(tasaMensual) {
  return Math.pow(1 + tasaMensual, 12) - 1;
}

/**
 * Devuelve la tasa EA (decimal) de un compromiso de deuda según su `tasaUnidad`.
 * Para fijos o sin `tasa` devuelve 0.
 * @param {{ tasa?: number, tasaUnidad?: string }} c
 */
export function tasaEADe(c) {
  const t = Number(c?.tasa);
  if (!Number.isFinite(t) || t < 0) return 0;
  return c.tasaUnidad === 'mensual' ? tasaMensualToEA(t) : t;
}

/**
 * Cuántas veces ocurre cada frecuencia en un mes calendario promedio.
 * Definido localmente para no crear dependencia cruzada con ingresos/logic.js.
 */
const FACTOR_MENSUAL = {
  'Diario':     30,
  'Semanal':    4.33,
  'Quincenal':  2,
  'Mensual':    1,
  'Bimestral':  0.5,
  'Trimestral': 1 / 3,
  'Semestral':  1 / 6,
  'Anual':      1 / 12,
  'Única vez':  0,
};

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra compromisos con `activo !== false`.
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 */
export function compromisosActivos(compromisos) {
  return compromisos.filter(c => c.activo !== false);
}

/**
 * Proyecta el monto mensual equivalente de un compromiso.
 * - Para fijo: aplica el factor de frecuencia sobre `monto` (cuota recurrente).
 * - Para deudas (entidad/personal): `cuotaMensual` ya es lo que se paga al mes.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @returns {number} COP / mes equivalente.
 */
export function calcularCompromisoMensual(compromiso) {
  if (esDeuda(compromiso.tipo)) {
    return Number(compromiso.cuotaMensual) || 0;
  }
  const factor = FACTOR_MENSUAL[compromiso.frecuencia] ?? 0;
  return (compromiso.monto ?? 0) * factor;
}

/** Desde cuántas suscripciones se pregunta si se usan todas (ADR 146 D6). */
export const MINIMO_SUSCRIPCIONES_AVISO = 3;

/**
 * Las suscripciones activas (SUS.1c, ADR 146 D6): los fijos de Streaming y
 * Suscripciones, las dos categorías no esenciales del ADR 014. Cuenta
 * plataformas distintas: dos fijos con la misma `marcaId` (el plan del mes y
 * un extra de Netflix) son una plataforma, aunque los dos montos suman. Sin
 * `marcaId`, cada fijo es la suya.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {{ cuantas: number, mensual: number, anual: number, nombres: string[] }}
 */
export function resumenSuscripciones(compromisos) {
  const activas = (compromisos ?? []).filter(c => c?.tipo === 'fijo' && c.activo !== false
    && CATEGORIAS_AGENDA_NO_ESENCIALES.includes(c.categoria));
  const porPlataforma = new Map();
  let mensual = 0;
  for (const c of activas) {
    mensual += calcularCompromisoMensual(c);
    const clave = c.marcaId || c.id;
    if (!porPlataforma.has(clave)) porPlataforma.set(clave, c.descripcion || c.categoria);
  }
  mensual = Math.round(mensual);
  return { cuantas: porPlataforma.size, mensual, anual: mensual * 12, nombres: [...porPlataforma.values()] };
}

/**
 * Suma la proyección mensual de todos los compromisos activos.
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP.
 */
export function calcularTotalCompromisos(compromisos) {
  return compromisosActivos(compromisos)
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Suma la proyección mensual de los compromisos tipo 'fijo' activos (arriendo,
 * servicios, suscripciones): los gastos recurrentes que NO son deuda. Es el
 * `fijosMensuales` que consume el motor de palanca (D.15d): la capacidad de
 * pago resta estos fijos aparte de las cuotas de deuda, para no doble-contar
 * (las cuotas de deuda las resta `recomendarPalanca` desde el array de deudas).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {number} Total mensual en COP de los compromisos fijos.
 */
export function calcularFijosMensuales(compromisos) {
  return compromisosActivos(compromisos)
    .filter(c => !esDeuda(c.tipo))
    .reduce((acc, c) => acc + calcularCompromisoMensual(c), 0);
}

/**
 * Resumen agregado de las deudas activas para el hero de la sección
 * (D.16a, ADR 036 D1). Solo deudas (entidad + personal): los gastos fijos
 * del mismo dominio (tipo 'fijo', viven en Calendario) no entran, porque
 * el hero habla de "lo que debes", no de pagos recurrentes.
 *
 * `cantidad` cuenta TODAS las deudas activas, saldadas incluidas: es el mismo
 * conjunto que pinta la lista. `saldadas` (FD7) separa cuántas de ellas ya
 * están en cero, para que el hero pueda explicar por qué el total no crece con
 * el conteo ("en 3 deudas por pagar · 1 saldada") en vez de dejar al usuario
 * comparando una cifra con un número de tarjetas.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {{ saldoTotal: number, cuotaMensual: number, cantidad: number, saldadas: number }}
 */
export function resumenDeudas(compromisos) {
  const deudas = compromisosActivos(compromisos).filter(c => esDeuda(c.tipo));
  return {
    saldoTotal:   deudas.reduce((acc, c) => acc + (Number(c.saldoTotal) || 0), 0),
    cuotaMensual: deudas.reduce((acc, c) => acc + calcularCompromisoMensual(c), 0),
    cantidad:     deudas.length,
    saldadas:     deudas.filter(c => (Number(c.saldoTotal) || 0) <= 0).length,
  };
}

/**
 * Días hacia adelante en los que se busca un vencimiento (HF.0d): un año
 * entero, así un Anual siempre cae dentro.
 */
const DIAS_BUSQUEDA_VENCIMIENTO = 366;

/** 'YYYY-MM-DD' de un Date, leído en hora local. */
function _isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Vencimientos de un compromiso desde hoy (incluido), con los días que faltan
 * para cada uno (HF.0d, BUG-031).
 *
 * La regla de frecuencias es la del motor compartido (`ocurrenciasEnRango`,
 * ADR 041): los mismos días que pinta el Calendario, con el día 29, 30 o 31
 * clampeado al último del mes, el quincenal en sus dos fechas y el bimestral,
 * trimestral, semestral y anual solo en los meses de su ciclo. No mira pagos:
 * eso lo decide `compromisosProximos`, que sabe de gastos.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {Date} [hoy=new Date()] Fecha de referencia (inyectable).
 * @param {number} [dias=366] Hasta cuántos días hacia adelante buscar.
 * @returns {Array<{ fecha: string, dias: number }>} En orden cronológico.
 */
export function vencimientosDesde(compromiso, hoy = new Date(), dias = DIAS_BUSQUEDA_VENCIMIENTO) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const tope = Number.isFinite(dias) && dias >= 0 ? Math.floor(dias) : DIAS_BUSQUEDA_VENCIMIENTO;
  const fin  = new Date(base.getFullYear(), base.getMonth(), base.getDate() + tope);

  return ocurrenciasEnRango(compromiso, _isoLocal(base), _isoLocal(fin)).map(fecha => {
    const [y, m, d] = fecha.split('-').map(Number);
    return { fecha, dias: Math.round((new Date(y, m - 1, d) - base) / 86_400_000) };
  });
}

/**
 * Cuántos días faltan para el próximo vencimiento de un compromiso, según su
 * frecuencia (HF.0d): la fecha es la misma que pinta el Calendario. No mira
 * pagos; para "lo próximo que falta pagar" está `compromisosProximos`.
 *
 * Antes contaba solo con `diaPago`: un bimestral vencía todos los meses y un
 * día 31 caía en un 31 de septiembre que no existe (BUG-031).
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {Date} [hoy=new Date()] Fecha de referencia (inyectable, BUG-028).
 * @returns {number|null} Días hasta el próximo vencimiento (0 = hoy), o `null`
 *   si no vuelve a vencer en un año (una "Única vez" de un mes ya pasado).
 */
export function proximoVencimiento(compromiso, hoy = new Date()) {
  const [proximo] = vencimientosDesde(compromiso, hoy);
  return proximo ? proximo.dias : null;
}

/**
 * Nivel de urgencia según días al próximo vencimiento.
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {Date} [hoy=new Date()] Fecha de referencia (inyectable).
 * @returns {'urgente' | 'proximo' | 'normal'}
 */
export function urgencia(compromiso, hoy = new Date()) {
  const dias = proximoVencimiento(compromiso, hoy);
  if (dias === null) return 'normal';
  if (dias <= 3) return 'urgente';
  if (dias <= 7) return 'proximo';
  return 'normal';
}

/**
 * Nivel de urgencia para el nudge de mora inminente (G.3.F5).
 * Recibe la lista ya filtrada de `compromisosProximos()`.
 *
 * - `'high'`   → al menos un compromiso vence en ≤ 3 días.
 * - `'medium'` → todos vencen entre 4 y 5 días.
 * - `null`     → no hay compromisos proximos (no mostrar nudge).
 *
 * @param {Array<{ diasRestantes: number }>} proximos
 * @returns {'high' | 'medium' | null}
 */
export function nivelAlertaMora(proximos) {
  if (proximos.length === 0) return null;
  return proximos.some(c => c.diasRestantes <= 3) ? 'high' : 'medium';
}

// ── VALIDACIÓN ───────────────────────────────────────────────────

/**
 * Desde qué tasa una deuda ya no puede ser real (ADR 142 D9): por encima, el
 * formulario no deja guardar. Entre lo "muy alto" y esto, guarda con aviso.
 */
export const TASA_IMPOSIBLE = Object.freeze({ EA: 1000, mensual: 500 });

/** Desde qué tasa conviene revisar antes de guardar (el aviso ámbar). */
export const TASA_MUY_ALTA = Object.freeze({ EA: 200, mensual: 100 });

/**
 * El aviso ámbar de una tasa muy alta (ADR 142 D9): se puede guardar, pero
 * conviene revisarla. Pura.
 *
 * @param {{ tipo?: string, tasa?: string|number }} datos
 * @returns {string|null} El aviso, o null si no hay nada que revisar.
 */
export function avisoTasaAlta({ tipo, tasa } = {}) {
  const n = Number(String(tasa ?? '').replace(',', '.'));
  if (tasa === '' || tasa === undefined || tasa === null || !Number.isFinite(n)) return null;
  const t = String(n).replace('.', ',');
  if (tipo === 'deuda-entidad') {
    if (n > TASA_MUY_ALTA.EA && n <= TASA_IMPOSIBLE.EA) return `${t} % al año es muy alto para una deuda con un banco. Revisa tu extracto: quizá esa es la tasa de otro periodo. Puedes guardarla igual.`;
    return null;
  }
  if (n > TASA_MUY_ALTA.mensual && n <= TASA_IMPOSIBLE.mensual) return `${t} % al mes es muy alto. Revisa tu extracto: quizá es la tasa de un año.`;
  return null;
}

/**
 * Valida los datos del formulario de compromiso.
 *
 * Reglas v6:
 * - tipo='fijo'           → requiere monto y frecuencia (Cuotas recurrentes).
 * - tipo='deuda-entidad'  → requiere saldoTotal, cuotaMensual; tasa opcional (% EA).
 * - tipo='deuda-personal' → requiere saldoTotal, cuotaMensual; tasa opcional (% mensual).
 *
 * @param {Record<string, string>} datos
 * @param {{ nombre: string }[]} [personalizadasFijo] personalizadas de sección 'fijo' (CAT.3c)
 * @returns {string[]} Mensajes de error (vacío = válido).
 */
/**
 * ¿Este compromiso guarda a dónde se paga? El gasto fijo y la deuda con una
 * persona (ADR 175 D1 y D5: la deuda con una entidad se paga en su canal).
 * @param {string} tipo
 */
const _llevaDatosPago = (tipo) => tipo === 'fijo' || tipo === 'deuda-personal';

/**
 * Los datos para pagarle a alguien, como se guardan (PAG.1, ADR 175 D1): el
 * titular, una llave limpia (ADR 170 D3), la entidad, el número de cuenta y
 * la referencia. `null` si no hay llave, número ni referencia.
 * @param {Record<string, string>} datos los campos `pago*` del formulario
 * @returns {import('../../../core/state.js').DatosPago|null}
 */
export function normalizarDatosPago(datos) {
  const tipo = String(datos?.pagoLlaveTipo ?? '').trim();
  const valor = limpiarLlave(tipo, datos?.pagoLlaveValor);
  const numeroCuenta = String(datos?.pagoNumeroCuenta ?? '').trim();
  const referencia = String(datos?.pagoReferencia ?? '').trim();
  if (!valor && !numeroCuenta && !referencia) return null;
  const dp = {};
  const titular = String(datos?.pagoTitular ?? '').trim();
  if (titular) dp.titular = titular;
  if (valor) dp.llave = { tipo: esTipoLlave(tipo) ? tipo : 'Otro', valor };
  const entidad = String(datos?.pagoEntidad ?? '').trim();
  if (entidad && numeroCuenta) dp.entidad = entidad;
  if (numeroCuenta) dp.numeroCuenta = numeroCuenta;
  if (referencia) dp.referencia = referencia;
  return dp;
}

/**
 * Los errores de "Para pagar" (ADR 175 D1 y D4): con algún dato, al menos la
 * llave, el número o la referencia; la llave con su tipo y su formato (ADR
 * 170 D3); y ningún número de tarjeta en la llave ni en el número de cuenta
 * (la referencia queda fuera de esa prueba).
 * @param {Record<string, string>} datos
 * @returns {string[]}
 */
export function erroresDatosPago(datos) {
  const errores = [];
  const tipo = String(datos?.pagoLlaveTipo ?? '').trim();
  const valor = limpiarLlave(tipo, datos?.pagoLlaveValor);
  const numero = String(datos?.pagoNumeroCuenta ?? '').trim();
  const referencia = String(datos?.pagoReferencia ?? '').trim();
  const algo = valor || numero || referencia || String(datos?.pagoTitular ?? '').trim();
  if (!algo) return errores;
  if (!valor && !numero && !referencia) {
    errores.push('Para pagar: escribe la llave, el número de cuenta o la referencia.');
    return errores;
  }
  if (valor) {
    if (!esTipoLlave(tipo)) errores.push('Para pagar: elige el tipo de la llave.');
    else if (pareceTarjeta(valor)) errores.push('Esa llave parece el número de una tarjeta. Finko no la guarda.');
    else {
      const formato = errorFormatoLlave(tipo, valor);
      if (formato) errores.push(`Para pagar: ${formato.charAt(0).toLowerCase()}${formato.slice(1)}`);
    }
  }
  if (pareceTarjeta(numero)) errores.push('Eso parece el número de una tarjeta. Finko no lo guarda.');
  return errores;
}

export function validarCompromiso(datos, personalizadasFijo = []) {
  const errores = [];
  // PAG.1 (ADR 175 D1): a dónde se paga, en el fijo y la deuda con una persona.
  if (_llevaDatosPago(datos?.tipo)) errores.push(...erroresDatosPago(datos));

  // AG.4: con categoría predefinida, el nombre lo da la propia categoría; el
  // campo de texto queda libre para una nota opcional.
  if (!_categoriaFijoConNombreAuto(datos, personalizadasFijo) && !datos.descripcion?.trim()) {
    errores.push(String(datos.tipo ?? '').startsWith('deuda')
      ? 'Ponle un nombre para reconocerla.'
      : 'Escribe qué es. Por ejemplo: Arriendo');
  }
  if (!datos.frecuencia || !FRECUENCIAS.includes(datos.frecuencia)) {
    errores.push('Elige cada cuánto pagas.');
  }
  const diaPago = Number(datos.diaPago);
  if (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31) {
    errores.push('Elige un día del 1 al 31.');
  }
  if (!datos.tipo || !TIPOS_COMPROMISO.includes(datos.tipo)) {
    errores.push('Elige qué tipo de pago es.');
  }
  // PA.1a (ADR 052 D2): sin cuenta no hay débito automático que preparar, y
  // elegirla por el usuario sería inventar de dónde sale su dinero.
  if (esDebitoAutomatico(datos) && !datos.cuentaDebitoId) {
    errores.push('Elige la cuenta de la que sale el débito automático.');
  }

  if (datos.tipo === 'fijo') {
    const monto = Number(datos.monto);
    if (isNaN(monto) || monto <= 0) {
      errores.push('Escribe cuánto pagas. Por ejemplo: 85.000');
    }
    if (datos.categoria && !esCategoriaAgenda(datos.categoria)
      && !personalizadasFijo.some(c => c.nombre === datos.categoria)) {
      errores.push('Elige una categoría de la lista.');
    }
  } else if (esDeuda(datos.tipo)) {
    const saldo = Number(datos.saldoTotal);
    if (isNaN(saldo) || saldo <= 0) {
      errores.push('Escribe cuánto debes hoy. Por ejemplo: 3.200.000');
    }
    // D.13: en deuda personal la cuota es opcional (fiado, préstamos sin
    // cuota fija se abonan libre). Si viene, debe ser > 0. En entidad sigue
    // siendo obligatoria: sin cuota no hay plan de pago que simular.
    const esPersonal = datos.tipo === 'deuda-personal';
    const cuotaVacia = datos.cuotaMensual === '' || datos.cuotaMensual === undefined || datos.cuotaMensual === null;
    if (!(esPersonal && cuotaVacia)) {
      const cuota = Number(datos.cuotaMensual);
      if (isNaN(cuota) || cuota <= 0) {
        errores.push('Escribe cuánto pagas cada mes. Por ejemplo: 350.000');
      }
    }
    // D.10: el catálogo del eje "qué/con quién" depende del eje Entidad/Personal.
    const catalogoCat = esPersonal ? CATEGORIAS_DEUDA_PERSONAL : CATEGORIAS_DEUDA;
    if (datos.categoria && !catalogoCat.includes(datos.categoria)) {
      errores.push('Elige una categoría de la lista.');
    }
    const tasa = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null;
    if (datos.tipo === 'deuda-entidad') {
      // Opcional: muchas personas no conocen su tasa EA. Si la dan, validar rango.
      if (tieneTasa) {
        if (isNaN(tasa) || tasa < 0) {
          errores.push('Escribe la tasa con números. Por ejemplo: 28,5');
        } else if (tasa > TASA_IMPOSIBLE.EA) {
          // ADR 142 D9: lo alto se guarda con un aviso (avisoTasaAlta); solo
          // lo que no puede ser una tasa real no se deja guardar.
          errores.push(`${String(tasa).replace('.', ',')} % al año no parece una tasa real. Revisa tu extracto.`);
        }
      }
    } else if (tieneTasa) {
      // Personal: opcional pero si la ponen, validar rango razonable (mensual).
      if (isNaN(tasa) || tasa < 0) {
        errores.push('Escribe la tasa con números. Por ejemplo: 2,1');
      } else if (tasa > TASA_IMPOSIBLE.mensual) {
        errores.push(`${String(tasa).replace('.', ',')} % al mes no parece una tasa real. Revisa tu extracto.`);
      }
    }
    if (tieneTasa) {
      const unidad = datos.tasaUnidad;
      if (unidad !== 'EA' && unidad !== 'mensual') {
        errores.push('Elige si la tasa es al año (EA) o al mes.');
      }
    }
    // MC.16a (ADR 051 D1): cupoTotal solo aplica a tarjeta de crédito (entidad),
    // y es opcional. Si viene, debe ser un número positivo.
    if (datos.tipo === 'deuda-entidad' && datos.categoria === 'Tarjeta de crédito') {
      const tieneCupo = datos.cupoTotal !== '' && datos.cupoTotal !== undefined && datos.cupoTotal !== null;
      if (tieneCupo) {
        const cupo = Number(datos.cupoTotal);
        if (isNaN(cupo) || cupo <= 0) {
          errores.push('Escribe el cupo con números. Por ejemplo: 5.000.000');
        }
      }
    }
  }

  return errores;
}

/**
 * Tasa mensual en decimal a partir de la tasa registrada en la deuda, que se
 * guarda en % y con su unidad ('EA' anual de banco/tarjeta, o 'mensual' del
 * préstamo personal). Devuelve 0 cuando no hay tasa con la que calcular.
 *
 * @param {number|string} tasaPct   tasa en %, como la teclea el usuario.
 * @param {string} [tasaUnidad]     'EA' | 'mensual'.
 * @returns {number} decimal mensual (0.02 = 2% mensual).
 */
export function tasaMensualDecimal(tasaPct, tasaUnidad) {
  const pct = Number(tasaPct);
  if (!(pct > 0)) return 0;
  const decimal = pct / 100;
  return tasaUnidad === 'mensual' ? decimal : Math.pow(1 + decimal, 1 / 12) - 1;
}

/**
 * Detecta si la cuota declarada no cubre el interés mensual del crédito.
 * Si cuotaMensual <= interés mensual, la deuda crece (nunca baja) o se mantiene.
 *
 * Solo aplica a deudas con tasa > 0. Para deudas personales sin tasa la función
 * devuelve null (no hay intereses que comparar).
 *
 * @param {Record<string, string>} datos - datos crudos del formulario de compromiso.
 *   Espera: saldoTotal, cuotaMensual, tasa (en %), tasaUnidad ('EA' | 'mensual'), tipo.
 * @returns {{ interesMensual: number, cuotaMensual: number, deficit: number } | null}
 *   null si no hay alerta. Objeto con los montos si la cuota no cubre el interés mensual.
 */
export function detectarDeudaCreciente(datos) {
  if (datos.tipo !== 'deuda-entidad' && datos.tipo !== 'deuda-personal') return null;

  const cuota   = Number(datos.cuotaMensual);
  const saldo   = Number(datos.saldoTotal);
  const tasaPct = Number(datos.tasa);

  if (!(cuota > 0) || !(saldo > 0) || !(tasaPct > 0)) return null;

  const interesMensual = saldo * tasaMensualDecimal(tasaPct, datos.tasaUnidad);
  if (cuota <= interesMensual) {
    return {
      interesMensual,
      cuotaMensual: cuota,
      deficit:      interesMensual - cuota,
    };
  }
  return null;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte datos crudos del formulario al shape de S.compromisos.
 * Asume que los datos ya pasaron `validarCompromiso()`.
 *
 * v6:
 * - 'fijo'           → { monto, frecuencia, diaPago, categoria|null, nota, icono|null } (categoria desde v17,
 *                       CATEGORIAS_AGENDA; nota desde AG.4). Con categoría predefinida (también
 *                       "Otros" desde GF.1), descripcion es la propia categoría y lo que llega en
 *                       el campo de texto se guarda como nota opcional; sin categoría, descripcion
 *                       es el nombre que escribió el usuario y nota queda ''. `icono` (CAT.2f) es
 *                       null con categoría desde GF.1 (ADR 167 D3, "Otros" ya no elige ícono) y
 *                       sin categoría no se escribe (conserva el de un fijo viejo). `marcaId`
 *                       (SUS.1a, v51): id de `MARCAS` si se eligió una plataforma de la
 *                       categoría; entonces descripcion es el nombre de la plataforma. null si no.
 * - 'deuda-entidad'  → { saldoTotal, cuotaMensual, categoria|null, tasa|null, tasaUnidad='EA', icono|null, nota }
 *                       (tasa null = desconocida; 0 significaría "sin interés",
 *                       que en una entidad casi nunca es cierto; categoria desde v18, CATEGORIAS_DEUDA)
 * - 'deuda-personal' → { saldoTotal, cuotaMensual, categoria|null, tasa?, tasaUnidad?, icono|null, nota }
 *                       (sin tasa = 0: el form dice "si no cobra interés, deja en blanco")
 *                       `icono` (CAT.2d, extendido a 'fijo' en CAT.2f): solo con categoría
 *                       'Otra'/'Otro' y un ícono elegido del picker compartido
 *                       (`ICONOS_CATEGORIA_PERSONALIZADA`); siempre explícito (null si no aplica)
 *                       `nota` (MC.13e-2c): texto libre opcional, directo del campo del form (a
 *                       diferencia de 'fijo', acá no hace doble uso con descripcion).
 *                       para que `editar()` (Object.assign shallow) lo limpie si el usuario cambia
 *                       de categoría al editar, en vez de dejarlo huérfano.
 *
 * @param {Record<string, string>} datos
 * @param {{ nombre: string }[]} [personalizadasFijo] personalizadas de sección 'fijo' (CAT.3c)
 */
export function normalizarCompromiso(datos, personalizadasFijo = []) {
  // PA.1a (ADR 052 D2): los dos campos van en `base` porque aplican a fijos y a
  // deudas por igual (D3: un solo criterio, no dos). Siempre explícitos, nunca
  // ausentes, mismo patrón que `icono` y `cupoTotal`: `editar()` hace un
  // Object.assign shallow, así que apagar el débito debe escribir el `false` y
  // el `null` para limpiar lo que había.
  const automatico = esDebitoAutomatico(datos);
  const base = {
    descripcion: datos.descripcion.trim(),
    frecuencia:  datos.frecuencia,
    diaPago:     Number(datos.diaPago),
    tipo:        datos.tipo,
    activo:      true,
    debitoAutomatico: automatico,
    cuentaDebitoId:   automatico ? (datos.cuentaDebitoId || null) : null,
    // PAG.1 (ADR 175 D1): siempre explícito, como el débito: editar() mezcla
    // shallow, y quitar el dato debe escribir el `null`.
    datosPago: _llevaDatosPago(datos.tipo) ? normalizarDatosPago(datos) : null,
  };

  if (datos.tipo === 'fijo') {
    const categoriaValida = datos.categoria && (esCategoriaAgenda(datos.categoria)
      || personalizadasFijo.some(c => c.nombre === datos.categoria));
    const categoria = categoriaValida ? datos.categoria : null;
    const nombreAuto = _categoriaFijoConNombreAuto(datos, personalizadasFijo);

    // SUS.1a (ADR 146 D4): con una plataforma de la categoría elegida, el
    // fijo se llama como ella ("Netflix", no "Streaming") y guarda su id.
    // Siempre explícito, como `icono`: cambiar de categoría al editar lo limpia.
    const marca = nombreAuto && marcaEnCategoriaAgenda(datos.marcaId, categoria)
      ? marcaPorId(datos.marcaId)
      : null;

    base.monto = Number(datos.monto);
    base.categoria = categoria;
    base.marcaId = marca ? marca.id : null;
    // GAS.10e (ADR 185 D6): sin empresa, el nombre del servicio si se escribió.
    const servicio = String(datos.nombreServicio ?? '').trim();
    base.descripcion = marca ? marca.nombre : (nombreAuto ? (servicio || categoria) : datos.descripcion.trim());
    base.nota = nombreAuto ? datos.descripcion.trim() : '';
    // GF.1 (ADR 167 D3): ningún fijo elige ícono. Con categoría, el `null`
    // explícito limpia el que hubiera; sin ella no se escribe: el "Otro" con
    // nombre propio que la migración v55 dejó sin categoría conserva su teja
    // al editarlo.
    if (categoria) base.icono = null;
    return base;
  }

  if (esDeuda(datos.tipo)) {
    base.saldoTotal   = Number(datos.saldoTotal);
    // MC.13e-2c: nota de texto libre, mismo campo opcional que ya tienen Meta
    // y Apartado; se muestra junto a la fila en el asistente de distribución.
    base.nota         = datos.nota?.trim() || '';
    // D.13: sin cuota fija (deuda personal) se guarda 0: el simulador de
    // estrategia la excluye y la lista muestra la frecuencia en su lugar.
    base.cuotaMensual = Number(datos.cuotaMensual) || 0;
    const catalogoCat = datos.tipo === 'deuda-personal' ? CATEGORIAS_DEUDA_PERSONAL : CATEGORIAS_DEUDA;
    base.categoria    = datos.categoria && catalogoCat.includes(datos.categoria)
      ? datos.categoria
      : null;
    // CAT.2d: 'Otra' (entidad) / 'Otro' (personal) admite elegir un ícono del
    // picker compartido en vez del fijo c-otros. Siempre explícito (null si no
    // aplica), nunca ausente: ver nota de icono en el docstring de la función.
    const categoriaOtra = datos.tipo === 'deuda-personal' ? 'Otro' : 'Otra';
    const iconoValido = ICONOS_CATEGORIA_PERSONALIZADA.some(i => i.icono === datos.icono);
    base.icono = (base.categoria === categoriaOtra && iconoValido) ? datos.icono : null;
    const tasaPct = Number(datos.tasa);
    const tieneTasa = datos.tasa !== '' && datos.tasa !== undefined && datos.tasa !== null
      && !isNaN(tasaPct) && tasaPct >= 0;
    if (datos.tipo === 'deuda-entidad') {
      base.tasa       = tieneTasa ? tasaPct / 100 : null;
      base.tasaUnidad = 'EA';
    } else {
      base.tasa       = tieneTasa ? tasaPct / 100 : 0;
      base.tasaUnidad = tieneTasa ? (datos.tasaUnidad || 'mensual') : 'mensual';
    }
    // MC.16a (ADR 051 D1): cupoTotal solo aplica a tarjeta de crédito (entidad).
    // Siempre explícito (null si no aplica), mismo patrón que `icono`, para que
    // `editar()` (Object.assign shallow) lo limpie si el usuario cambia de categoría.
    const cupoPct = Number(datos.cupoTotal);
    const tieneCupo = datos.cupoTotal !== '' && datos.cupoTotal !== undefined && datos.cupoTotal !== null
      && !isNaN(cupoPct) && cupoPct > 0;
    base.cupoTotal = (base.categoria === 'Tarjeta de crédito' && tieneCupo) ? cupoPct : null;
  }

  return base;
}
