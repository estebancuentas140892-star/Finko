/**
 * tesoreria/logic/cuentas.js - funciones puras de cuentas, cuota de manejo y GMF (4x1000).
 *
 * Sub-modulo de tesoreria/logic.js (barrel). Reglas de la capa:
 * - Sin DOM. Sin S directo. Reciben datos, devuelven datos.
 * - Testeable en Node/Vitest sin ningun mock de navegador.
 */

import { GMF, BANCOS_CO, TIPOS_LLAVE, MAX_LLAVES_CUENTA, ICONOS_CATEGORIA_PERSONALIZADA } from '../../../core/constants.js';
import { pareceTarjeta, limpiarLlave, errorFormatoLlave, textoLlave } from '../../../infra/llaves.js';
import { regimenGMF, puedeSerMarcada } from '../../../infra/gmf.js';
import { esCuentaEfectivo } from './transferencias.js';

/**
 * Devuelve la clase de una entidad bancaria ('banco' | 'billetera' | 'efectivo' | 'otro').
 * Si el id no se encuentra en BANCOS_CO, devuelve 'otro' como fallback seguro.
 *
 * @param {string} bancoId
 * @returns {'banco'|'billetera'|'efectivo'|'otro'}
 */
function _claseBanco(bancoId) {
  return BANCOS_CO.find(b => b.id === bancoId)?.clase ?? 'otro';
}

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Filtra las cuentas que están activas (`activa !== false`).
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {import('../../../core/state.js').Cuenta[]}
 */
export function cuentasActivas(cuentas) {
  return cuentas.filter(c => c.activa !== false);
}

/**
 * Suma el saldo de todas las cuentas activas.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {number} Total en COP.
 */
export function calcularTotalCuentas(cuentas) {
  return cuentasActivas(cuentas).reduce((acc, c) => acc + (c.saldo ?? 0), 0);
}

/**
 * El dinero disponible partido en bancos y efectivo, para la ficha del saldo
 * de Inicio (INI.6a, ADR 181 D1). Cada cuenta activa cae en un solo lado, con
 * la misma regla de Retirar efectivo (`esCuentaEfectivo`): las billeteras y
 * "Otro" van con los bancos. Así `bancos.total + efectivo.total` es siempre
 * `calcularTotalCuentas`: nada se cuenta dos veces. Lo que una meta, reserva
 * o fondo dice que guarda en una cuenta (`guardadoEn`, ADR 174) no suma: ya
 * está en el saldo de esa cuenta.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {{ bancos: { total: number, cuentas: import('../../../core/state.js').Cuenta[] },
 *            efectivo: { total: number, cuentas: import('../../../core/state.js').Cuenta[] } }}
 */
export function repartoBancosEfectivo(cuentas) {
  const reparto = { bancos: { total: 0, cuentas: [] }, efectivo: { total: 0, cuentas: [] } };
  for (const c of cuentasActivas(cuentas ?? [])) {
    const lado = esCuentaEfectivo(c) ? reparto.efectivo : reparto.bancos;
    lado.total += c.saldo ?? 0;
    lado.cuentas.push(c);
  }
  return reparto;
}

/**
 * Tarjetas de crédito operables entre los compromisos (MC.16c): mismo filtro
 * que `tarjetasDeCredito()` de `gastos/logic.js`, duplicado a propósito
 * (ADN 10, ningún dominio importa a otro). Desde GAS.9d (ADR 183 D4) la
 * tarjeta nace en Mis cuentas y su fila abre la hoja de la tarjeta; el
 * modelo sigue siendo el del ADR 051 (una deuda con entidad con cupo).
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @returns {import('../../../core/state.js').Compromiso[]}
 */
export function tarjetasCredito(compromisos) {
  return (compromisos ?? []).filter(c =>
    c.tipo === 'deuda-entidad'
    && c.categoria === 'Tarjeta de crédito'
    && (Number(c.cupoTotal) || 0) > 0
    && c.activo !== false,
  );
}

/**
 * Cuántos segmentos dibuja la barra del hero como máximo (MC-DIS.9 C4).
 * Con más cuentas que este tope, las que sobran se agrupan en un solo
 * segmento "otras": tres tintes son los que alcanzan a distinguirse sin
 * bajar del umbral de contraste no textual (SC 1.4.11).
 */
const COMPO_MAX_SEGMENTOS = 3;

/** Etiqueta del segmento que agrupa el resto de las cuentas. */
const COMPO_LABEL_OTRAS = 'otras';

/**
 * Composición del total por cuenta para la barra del hero (MC.18a, ADR 035 D3).
 * Solo cuentas activas con saldo mayor a 0, ordenadas de mayor a menor saldo.
 * `pct` es la porción del total (0 a 100, sin redondear: la vista formatea).
 * Devuelve [] cuando no hay saldo positivo que repartir (la barra no se pinta).
 *
 * MC-DIS.9 C4: devuelve como máximo `COMPO_MAX_SEGMENTOS` entradas. Con más
 * cuentas con saldo, las que sobran se suman en una última entrada "otras"
 * (`id: null`), porque cada segmento extra bajaba de la opacidad legible y los
 * dos últimos ni se distinguían entre sí. `nombre` es el banco y no
 * `cuenta.nombre`: es la misma reducción que hace la tarjeta de la lista con el
 * nombre autogenerado ("Bancolombia Ahorros" → "Bancolombia") y es lo que
 * necesita el resumen en texto para explicar la barra.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {{ id: string|null, nombre: string, pct: number }[]}
 */
export function composicionCuentas(cuentas) {
  const conSaldo = cuentasActivas(cuentas).filter(c => (c.saldo ?? 0) > 0);
  const total = conSaldo.reduce((acc, c) => acc + c.saldo, 0);
  if (total <= 0) return [];

  const ordenadas = conSaldo.slice().sort((a, b) => b.saldo - a.saldo);
  if (ordenadas.length <= COMPO_MAX_SEGMENTOS) {
    return ordenadas.map(c => ({ id: c.id, nombre: c.banco, pct: (c.saldo / total) * 100 }));
  }

  const propias = ordenadas.slice(0, COMPO_MAX_SEGMENTOS - 1);
  const resto   = ordenadas.slice(COMPO_MAX_SEGMENTOS - 1)
    .reduce((acc, c) => acc + c.saldo, 0);
  return [
    ...propias.map(c => ({ id: c.id, nombre: c.banco, pct: (c.saldo / total) * 100 })),
    { id: null, nombre: COMPO_LABEL_OTRAS, pct: (resto / total) * 100 },
  ];
}

/**
 * Resumen en texto de la composición para el hero (MC.18a, ADR 035 D3):
 * dice lo que dibuja la barra, cuenta por cuenta, ej. "Bancolombia 64% ·
 * Davivienda 23% · otras 14%". Devuelve '' cuando no hay barra que explicar.
 *
 * MC-DIS.9 C4 (regla R23): antes devolvía el conteo de cuentas ("4 cuentas ·
 * 1 billetera · efectivo"), que es un dato distinto sobre lo mismo y no sirve
 * de alternativa no visual a la barra (SC 1.4.11). Los porcentajes se redondean
 * acá porque son el texto: la barra sigue usando el `pct` sin redondear.
 *
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @returns {string}
 */
export function resumenCuentas(cuentas) {
  return composicionCuentas(cuentas)
    .map(seg => `${seg.nombre} ${Math.round(seg.pct)}%`)
    .join(' · ');
}

// ── VALIDACIÓN CUENTAS ───────────────────────────────────────────

/**
 * Valida los datos del formulario antes de guardar.
 * Devuelve un array de mensajes de error (vacío = válido).
 *
 * @param {Record<string, string>} datos - entradas del formulario (valores como string).
 * @returns {string[]}
 */
export function validarCuenta(datos, contexto = {}) {
  const errores = [];

  // Nombre es opcional: si esta vacio, normalizarCuenta() lo autogenera.
  if (!datos.banco?.trim() || datos.banco === '') {
    errores.push('Elige tu banco o billetera.');
  }
  // Las billeteras y el efectivo no tienen un "tipo de cuenta" bancario:
  // el selector se oculta en el form y el tipo se normaliza automáticamente.
  const clase = _claseBanco(datos.banco ?? '');
  if (clase !== 'efectivo' && clase !== 'billetera'
      && (!datos.tipo?.trim() || datos.tipo === '')) {
    errores.push('Elige qué tipo de cuenta es.');
  }
  const saldo = Number(datos.saldo);
  if (!Number.isFinite(saldo) || saldo < 0) {
    errores.push('Escribe el saldo de hoy con números. Por ejemplo: 1.500.000');
  }

  // Validar cuota de manejo solo si el toggle está activo.
  if (_cuotaActiva(datos)) {
    const monto = Number(datos.cuotaManejoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      errores.push('Escribe cuánto cobra la cuota de manejo. Por ejemplo: 18.000');
    }
    const dia = Number(datos.cuotaManejoDia);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      errores.push('Elige el día de cobro, del 1 al 31.');
    }
  }

  // MC.14 y MC.19 (ADR 170 D3): los datos de transferencia, solo con el
  // interruptor activo.
  if (_transferenciaActiva(datos)) errores.push(...erroresTransferencia(datos, contexto));

  return errores;
}

// ── LLAVES DE TRANSFERENCIA (MC.19, ADR 170) ─────────────────────

// Las llaves (formato, tarjeta y cómo se ven) viven en infra/llaves.js desde
// PAG.1: Por pagar también las usa (ADN 10). Se reexportan para quien las
// lee de acá.
export { pareceTarjeta, limpiarLlave, textoLlave };

/**
 * Los errores de los datos de transferencia (ADR 170 D3): el tipo de cada
 * llave, su formato (solo la que se escribe o se cambia: una llave vieja que
 * no lo cumple no bloquea editar la cuenta), la misma llave dos veces, en esta
 * cuenta o en otra, y el número de una tarjeta en cualquier campo.
 *
 * @param {{ numeroCuenta?: string, llaves?: Array<{tipo?: string, valor?: string}> }} datos
 * @param {{ cuentas?: Array, idEdit?: string|null }} [contexto] las cuentas
 *   guardadas y el id de la que se edita.
 * @returns {string[]}
 */
export function erroresTransferencia(datos, { cuentas = [], idEdit = null } = {}) {
  const errores = [];
  const tarjeta = 'Eso parece el número de una tarjeta. Finko no lo guarda.';
  if (pareceTarjeta(datos?.numeroCuenta)) errores.push(tarjeta);

  const llaves = (Array.isArray(datos?.llaves) ? datos.llaves : [])
    .filter(l => String(l?.valor ?? '').trim());
  if (llaves.length > MAX_LLAVES_CUENTA) {
    errores.push(`Una cuenta guarda hasta ${MAX_LLAVES_CUENTA} llaves.`);
  }
  const propia = (cuentas ?? []).find(c => c?.id === idEdit);
  const yaGuardadas = new Set((propia?.datosTransferencia?.llaves ?? []).map(l => `${l.tipo}|${l.valor}`));
  const vistas = new Set();
  llaves.forEach((l, i) => {
    // Con varias llaves, el mensaje dice cuál: "Llave 2: ...".
    const decir = (texto) => (llaves.length > 1
      ? `Llave ${i + 1}: ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`
      : texto);
    const tipo = String(l.tipo ?? '').trim();
    if (!TIPOS_LLAVE.includes(tipo)) { errores.push(decir('Elige el tipo de llave.')); return; }
    const valor = limpiarLlave(tipo, l.valor);
    if (pareceTarjeta(valor)) { errores.push(decir('Esa llave parece el número de una tarjeta. Finko no la guarda.')); return; }
    const formato = yaGuardadas.has(`${tipo}|${valor}`) ? null : errorFormatoLlave(tipo, valor);
    if (formato) { errores.push(decir(formato)); return; }
    const clave = valor.toLowerCase();
    if (vistas.has(clave)) { errores.push(decir('Esa llave ya está en esta cuenta.')); return; }
    vistas.add(clave);
    const otra = (cuentas ?? []).find(c => c?.id !== idEdit
      && (c?.datosTransferencia?.llaves ?? []).some(x => String(x.valor ?? '').toLowerCase() === clave));
    if (otra) errores.push(decir(`Esa llave ya está en ${otra.nombre}. En Bre-B una llave lleva a una sola cuenta.`));
  });
  return errores;
}


/**
 * Indica si un valor de checkbox HTML5 está marcado.
 * Un checkbox manda 'on' (o cualquier truthy) cuando está checked
 * y no aparece en FormData cuando está unchecked.
 *
 * @param {string|undefined} v
 * @returns {boolean}
 */
function _checkOn(v) {
  return v === 'on' || v === 'true' || v === '1';
}

/**
 * Indica si el form pidió activar la cuota de manejo.
 *
 * @param {Record<string, string>} datos
 * @returns {boolean}
 */
function _cuotaActiva(datos) {
  return _checkOn(datos?.cuotaManejoActiva);
}

/**
 * Extrae el objeto CuotaManejo del formulario, o devuelve `null` si no se activó.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {{monto: number, diaCobro: number} | null}
 */
export function parseCuotaManejo(datos) {
  if (!_cuotaActiva(datos)) return null;
  return {
    monto:    Number(datos.cuotaManejoMonto) || 0,
    diaCobro: Number(datos.cuotaManejoDia)   || 1,
  };
}

/**
 * Indica si el form pidió activar los datos de transferencia (MC.14).
 *
 * @param {Record<string, string>} datos
 * @returns {boolean}
 */
function _transferenciaActiva(datos) {
  return _checkOn(datos?.transferenciaActiva);
}

/**
 * Extrae los datos de transferencia del formulario (MC.14), o `null` si el
 * toggle no está activo o el usuario lo activó sin llenar ningún campo.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {import('../../../core/state.js').DatosTransferencia | null}
 */
export function parseDatosTransferencia(datos) {
  if (!_transferenciaActiva(datos)) return null;

  const numeroCuenta = datos.numeroCuenta?.trim() || '';
  // MC.19 (ADR 170 D1): la lista de llaves, cada una limpia como se guarda.
  const llaves = (Array.isArray(datos.llaves) ? datos.llaves : [])
    .map(l => ({ tipo: TIPOS_LLAVE.includes(l?.tipo) ? l.tipo : 'Otro', valor: limpiarLlave(l?.tipo, l?.valor) }))
    .filter(l => l.valor)
    .slice(0, MAX_LLAVES_CUENTA);

  if (!numeroCuenta && llaves.length === 0) return null;

  const resultado = {};
  if (numeroCuenta) resultado.numeroCuenta = numeroCuenta;
  if (llaves.length) resultado.llaves = llaves;
  return resultado;
}

// ── TRANSFORMACIÓN ───────────────────────────────────────────────

/**
 * Convierte los datos crudos del formulario al shape del schema de S.cuentas.
 * Asume que los datos ya pasaron `validarCuenta()`.
 *
 * @param {Record<string, string>} datos
 * @returns {Omit<import('../../../core/state.js').Cuenta, 'id' | 'fechaCreacion'>}
 */
export function normalizarCuenta(datos) {
  const banco  = datos.banco.trim();
  // Normalizar tipo según la clase de la entidad:
  //   efectivo  → 'Efectivo' (tipo oculto en el form, autogenerado)
  //   billetera → id del banco (ej. 'Nequi'): _autoNombre evita duplicar "Nequi Nequi"
  //   banco/otro → valor del select (lo eligió el usuario)
  const claseN = _claseBanco(banco);
  const tipo   = claseN === 'efectivo'  ? 'Efectivo'
               : claseN === 'billetera' ? banco
               : (datos.tipo ?? '');
  // Si el usuario no escribio nombre, autogenerar uno legible:
  //   "Davivienda Ahorros" / "Nequi Otro" / "Efectivo".
  // Para el banco "Efectivo" + tipo "Efectivo" evitamos duplicar.
  const nombreUsuario = datos.nombre?.trim();
  const nombre = nombreUsuario || _autoNombre(banco, tipo);
  // CAT.2e: 'Otro' no tiene glifo propio en BANCOS_CO; el usuario puede elegir
  // uno del picker compartido. Siempre explícito (null si no aplica), nunca
  // ausente, para que sobreviva el merge shallow de `editar()` (mismo patrón
  // que `compromiso.icono`, CAT.2d). Valida contra el catálogo por si el DOM
  // fue manipulado.
  const iconoValido = ICONOS_CATEGORIA_PERSONALIZADA.some(i => i.icono === datos.icono);
  const icono = (banco === 'Otro' && iconoValido) ? datos.icono : null;
  // GMF.1 (ADR 165): la marcada es una respuesta ("si"/"no") solo donde
  // puede haberla; si no, null. `aplica4x1000` sigue diciendo "paga en cada
  // retiro" para lo que ya lo lee (el estimado del mes, las etiquetas).
  const exenta4x1000 = !puedeSerMarcada({ banco, tipo }) ? null
    : datos.exenta4x1000 === 'si' ? true : datos.exenta4x1000 === 'no' ? false : null;
  const regimen = regimenGMF({ banco, tipo, exenta4x1000, aplica4x1000: _checkOn(datos.aplica4x1000) });
  return {
    nombre,
    banco,
    tipo,
    saldo: Number(datos.saldo) || 0,
    icono,
    activa: true,
    cuotaManejo: parseCuotaManejo(datos),
    // El efectivo nunca está sujeto al GMF (no hay movimiento financiero).
    aplica4x1000: regimen.tipo === 'sujeta',
    exenta4x1000,
    datosTransferencia: parseDatosTransferencia(datos),
  };
}

// ── CUOTA DE MANEJO → COMPROMISO ─────────────────────────────────

/**
 * Genera el shape de Compromiso fijo mensual que representa la cuota de
 * manejo de una cuenta. Devuelve `null` si la cuenta no tiene cuota.
 *
 * Se usa en tesoreria/index.js para sincronizar: tras guardar la cuenta,
 * o se crea/actualiza el compromiso vinculado, o se elimina.
 *
 * NO incluye `id` ni `fechaCreacion`: los asigna crud.js cuando se persiste.
 *
 * La frecuencia es 'Mensual' capitalizada (BUG-005): todo el catálogo
 * `FRECUENCIAS` y las tablas de factor mensual (`FACTOR_MENSUAL` aquí,
 * `FACTOR_MENSUAL` en compromisos) comparan contra la forma capitalizada;
 * con 'mensual' en minúscula la cuota quedaba fuera de los gastos fijos
 * mensuales, del checklist de Necesidades y del objetivo del fondo. La
 * migración v19→v20 de storage.js corrige las cuotas ya guardadas.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {Omit<import('../../../core/state.js').Compromiso, 'id' | 'fechaCreacion'> | null}
 */
export function compromisoDesdeCuotaManejo(cuenta) {
  if (!cuenta?.cuotaManejo) return null;
  const { monto, diaCobro } = cuenta.cuotaManejo;
  return {
    descripcion:    `Cuota de manejo ${cuenta.nombre}`,
    monto,
    frecuencia:     'Mensual',
    diaPago:        diaCobro,
    tipo:           'fijo',
    activo:         cuenta.activa !== false,
    cuentaId:       cuenta.id,
    esCuotaManejo:  true,
  };
}

/**
 * Busca en una lista de compromisos el que representa la cuota de manejo
 * de una cuenta dada. Devuelve `undefined` si no hay match.
 *
 * @param {import('../../../core/state.js').Compromiso[]} compromisos
 * @param {string} cuentaId
 */
export function compromisoCuotaManejoDeCuenta(compromisos, cuentaId) {
  if (!Array.isArray(compromisos)) return undefined;
  return compromisos.find(c => c?.esCuotaManejo === true && c?.cuentaId === cuentaId);
}

/**
 * El nombre de una cuenta cuando su tipo va escrito debajo (INI.3, ADR 153
 * D3): el nombre autogenerado ("Banco de Bogotá Ahorros") se reduce a la
 * entidad ("Banco de Bogotá"), porque la línea de abajo ya dice "Cuenta de
 * ahorros". Un nombre que no sale de `_autoNombre` se respeta tal cual. Es la
 * misma reducción que hace la tarjeta de Mis cuentas (MC.18b). Pura.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
export function nombreCortoCuenta(cuenta) {
  const nombre = (cuenta?.nombre ?? '').trim();
  const banco = (cuenta?.banco ?? '').trim();
  if (!banco) return nombre;
  return nombre.toLowerCase() === _autoNombre(banco, cuenta.tipo).toLowerCase() ? banco : nombre;
}

/** Genera un nombre legible cuando el usuario lo deja en blanco. */
function _autoNombre(banco, tipo) {
  if (!banco) return tipo || 'Cuenta';
  if (!tipo)  return banco;
  // Evitar redundancia "Efectivo Efectivo".
  if (banco.toLowerCase() === tipo.toLowerCase()) return banco;
  return `${banco} ${tipo}`;
}

// ── GMF / 4x1000 ─────────────────────────────────────────────────

/**
 * Calcula el costo estimado del GMF (4x1000) para el mes indicado,
 * sumando los gastos registrados desde cuentas sujetas al gravamen.
 *
 * Nota: el GMF real se aplica sobre retiros y transferencias bancarias.
 * Esta función usa los gastos del mes como proxy razonable para orientar
 * al usuario sobre su exposición al gravamen.
 *
 * @param {import('../../../core/state.js').Gasto[]}  gastos
 * @param {import('../../../core/state.js').Cuenta[]} cuentas
 * @param {number} anio
 * @param {number} mes  1-12.
 * @returns {{ cantidadCuentasGMF: number, gastosGravados: number, costoGMF: number }}
 */
export function calcularCostoGMF(gastos, cuentas, anio, mes) {
  const cuentasArr = Array.isArray(cuentas) ? cuentas : [];
  const gastosArr  = Array.isArray(gastos)  ? gastos  : [];

  const idsConGMF = new Set(
    cuentasArr.filter(c => c?.aplica4x1000 === true).map(c => c.id),
  );

  if (idsConGMF.size === 0) {
    return { cantidadCuentasGMF: 0, gastosGravados: 0, costoGMF: 0 };
  }

  const mesPad  = String(mes).padStart(2, '0');
  const prefijo = `${anio}-${mesPad}`;

  const gastosGravados = gastosArr
    .filter(g => g?.fecha?.startsWith(prefijo) && idsConGMF.has(g.cuentaId))
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);

  return {
    cantidadCuentasGMF: idsConGMF.size,
    gastosGravados:     Math.round(gastosGravados),
    costoGMF:           Math.round(gastosGravados * GMF),
  };
}

/**
 * Detecta si aplica mostrar el nudge de costo del GMF.
 * Devuelve un objeto de nudge cuando el costo estimado del mes es mayor a 0,
 * o null cuando no hay nada que reportar.
 *
 * El objeto devuelto incluye los valores numéricos en crudo para que la
 * vista los formatee con la función de moneda correspondiente.
 *
 * @param {{ cantidadCuentasGMF: number, gastosGravados: number, costoGMF: number }} gmfData
 * @returns {{ id: string, nivel: string, icono: string, cantidadCuentasGMF: number,
 *             gastosGravados: number, costoGMF: number } | null}
 */
export function detectarNudgeGMF(gmfData) {
  const {
    cantidadCuentasGMF = 0,
    gastosGravados     = 0,
    costoGMF           = 0,
  } = gmfData ?? {};

  if (costoGMF <= 0) return null;

  return {
    id:                'gmf-costo',
    nivel:             'nudge-info',
    icono:             'gastos',
    cantidadCuentasGMF,
    gastosGravados,
    costoGMF,
  };
}
