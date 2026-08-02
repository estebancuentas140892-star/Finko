/**
 * infra/portafolio.js - lo invertido, su proyección y la geometría del gráfico.
 *
 * Existe por la regla ADN #10 (ningún dominio importa a otro). La cadena
 * completa (`esProyectable` a `columnasPortafolio`) nació en
 * `inversiones/logic.js` y ahí funcionó mientras su único lector fue la sección
 * Inversión. Desde DIS.19 la casa de Ahorro dibuja el carril "Dinero que
 * pusiste a crecer" con las mismas dos columnas, y `columnasPortafolio()` no se
 * puede mover sola: arrastra la proyección de la que se deriva. Replicarla
 * habría duplicado las fórmulas financieras del negocio, que es justo lo que
 * DIS.18 se negó a hacer con `momentoInversion()`.
 *
 * `etapaDePortafolio()` bajó después, por la misma razón y con el mismo límite:
 * es el **corte** entre la primera inversión y el conjunto (el "momento" de
 * DIS.17 sin una palabra de copy), que la casa de Ahorro necesita para decir la
 * etapa de su carril en vez de un conteo.
 *
 * Lo que NO está aquí sigue siendo del dominio: los tipos soportados, la
 * validación del formulario, los nudges, las frases del momento del usuario y
 * la rentabilidad real. Esto es la aritmética compartida, no la sección.
 *
 * Sin DOM. Sin S directo. Importa de `infra/financiero.js` (capa infra, no
 * dominio): ahí viven las fórmulas CO reutilizables (CDT, interés compuesto).
 */

import { calcularCDT, calcularInteresCompuesto } from './financiero.js';

/** Días por mes promedio, para traducir un plazo en meses a días de CDT. */
const DIAS_POR_MES = 365 / 12;

// ── CONSULTAS ────────────────────────────────────────────────────

/**
 * Suma el monto invertido de todas las inversiones registradas.
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {number} COP. Nunca negativo; 0 si el input no es válido o está vacío.
 */
export function calcularTotalInvertido(inversiones) {
  if (!Array.isArray(inversiones)) return 0;
  return inversiones.reduce((sum, inv) => {
    const m = Number(inv?.monto);
    return sum + (Number.isFinite(m) && m > 0 ? m : 0);
  }, 0);
}

/**
 * Agrupa el monto invertido por tipo, para el desglose del portafolio.
 * Devuelve solo los tipos con monto > 0, ordenados de mayor a menor.
 *
 * @param {Array<{tipo:string, monto:number}>} inversiones
 * @returns {Array<{tipo:string, total:number, pct:number}>}
 */
export function calcularPorTipo(inversiones) {
  if (!Array.isArray(inversiones)) return [];
  const acc = Object.create(null);
  let total = 0;
  for (const inv of inversiones) {
    const m = Number(inv?.monto);
    if (!Number.isFinite(m) || m <= 0) continue;
    const tipo = typeof inv?.tipo === 'string' && inv.tipo ? inv.tipo : 'Otro';
    acc[tipo] = (acc[tipo] || 0) + m;
    total += m;
  }
  if (total <= 0) return [];
  return Object.entries(acc)
    .map(([tipo, t]) => ({ tipo, total: t, pct: Math.round((t / total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

/**
 * En qué etapa va el portafolio: cuántas inversiones abiertas hay y si eso es
 * la primera o ya el conjunto.
 *
 * Es el corte que la sección Inversión llamaba "momento" (DIS.17): con una sola
 * inversión la app explica qué compró el usuario, con dos o más muestra el
 * conjunto y de qué está hecho. La casa de Ahorro necesita el mismo corte para
 * decir la etapa en su carril en vez de un conteo (consecuencia pendiente del
 * ADR 056), y `momentoInversion()` no se puede leer desde ahí: es del dominio
 * Inversión y ADN #10 prohíbe importarlo. Bajar el corte acá es el mismo
 * movimiento que hizo `columnasPortafolio()` con la geometría del gráfico.
 *
 * **Lo que baja es el criterio, no la frase.** Los títulos, la explicación del
 * tipo, el anticipo y la acción siguen en `inversiones/logic.js`, y el carril de
 * Ahorro pone las suyas: infra devuelve números, cada pantalla su vocabulario
 * (mismo criterio que `estadoDeBolsa()` en `infra/bolsas.js`).
 *
 * `activas` viaja en la respuesta porque el filtro "monto > 0" es parte del
 * mismo criterio: quien pregunta por la etapa suele necesitar después la lista
 * que la produjo, y volver a filtrarla sería duplicar la definición de
 * "inversión abierta".
 *
 * @param {Array<{monto:number}>} inversiones
 * @returns {{ numero: number, abiertas: number, activas: Array<Object> } | null}
 *   null si no hay ninguna inversión con monto.
 */
export function etapaDePortafolio(inversiones) {
  const activas = Array.isArray(inversiones)
    ? inversiones.filter(i => Number(i?.monto) > 0)
    : [];
  if (activas.length === 0) return null;

  return {
    numero:   activas.length === 1 ? 1 : 2,
    abiertas: activas.length,
    activas,
  };
}

// ── PROYECCIÓN ───────────────────────────────────────────────────

/**
 * Una inversión es proyectable si tiene monto, tasa y plazo.
 *
 * Sin tasa (acciones/cripto de retorno variable) o sin plazo (posición
 * abierta) no se puede proyectar un valor al vencimiento de forma honesta.
 *
 * @param {{tasaEA:number, plazoMeses:number, monto:number}} inv
 * @returns {boolean}
 */
export function esProyectable(inv) {
  const tasa  = Number(inv?.tasaEA);
  const plazo = Number(inv?.plazoMeses);
  const monto = Number(inv?.monto);
  return (
    Number.isFinite(monto) && monto > 0 &&
    Number.isFinite(tasa)  && tasa  > 0 &&
    Number.isFinite(plazo) && plazo > 0
  );
}

/**
 * Proyecta el valor de una inversión a su vencimiento.
 *
 * - CDT: usa `calcularCDT` y aplica la retención en la fuente del 7 % sobre el
 *   rendimiento (igual que la herramienta CDT de la app). `valorFuturo` es neto.
 * - Resto (Fondo/Acciones/Cripto/Otro): crecimiento compuesto al EA sin retención
 *   (la retención de fondos varía y no se modela aquí). `valorFuturo` es bruto.
 *
 * @param {{tipo:string, monto:number, tasaEA:number, plazoMeses:number}} inv
 * @returns {{
 *   aplicaRetencion: boolean,
 *   valorFuturo: number,        // valor final (neto en CDT, bruto en el resto)
 *   valorFuturoBruto: number,   // antes de retención
 *   retencion: number,          // 0 si no aplica
 *   rendimiento: number,        // valorFuturo - monto
 * } | null} null si la inversión no es proyectable.
 */
export function proyectarInversion(inv) {
  if (!esProyectable(inv)) return null;

  const monto      = Number(inv.monto);
  const tasaEA     = Number(inv.tasaEA);
  const plazoMeses = Number(inv.plazoMeses);

  if (inv.tipo === 'CDT') {
    const dias = Math.max(1, Math.round(plazoMeses * DIAS_POR_MES));
    const r = calcularCDT(monto, tasaEA / 100, dias);
    return {
      aplicaRetencion:  true,
      valorFuturo:      r.totalNeto,
      valorFuturoBruto: r.valorFuturo,
      retencion:        r.retencion,
      rendimiento:      r.rendimientoNeto,
    };
  }

  // Capitalización anual (periodosPorAnio = 1) reproduce exactamente la tasa
  // efectiva anual: VF = monto × (1 + EA)^(plazoMeses/12).
  const anios = plazoMeses / 12;
  const r = calcularInteresCompuesto(monto, tasaEA, 1, anios);
  return {
    aplicaRetencion:  false,
    valorFuturo:      r.montoFinal,
    valorFuturoBruto: r.montoFinal,
    retencion:        0,
    rendimiento:      r.ganancia,
  };
}

/**
 * Agrega la proyección de todo el portafolio.
 * Los holdings no proyectables se cuentan a su valor invertido (no se asume
 * ninguna ganancia).
 *
 * @param {Array} inversiones
 * @returns {{
 *   totalInvertido: number,
 *   totalProyectado: number,
 *   rendimientoEsperado: number,
 *   proyectables: number,
 *   noProyectables: number,
 * }}
 */
export function proyectarPortafolio(inversiones) {
  const base = {
    totalInvertido: 0, totalProyectado: 0, rendimientoEsperado: 0,
    proyectables: 0, noProyectables: 0,
  };
  if (!Array.isArray(inversiones)) return base;

  for (const inv of inversiones) {
    const monto = Number(inv?.monto);
    if (!Number.isFinite(monto) || monto <= 0) continue;
    base.totalInvertido += monto;

    const p = proyectarInversion(inv);
    if (p) {
      base.totalProyectado += p.valorFuturo;
      base.proyectables    += 1;
    } else {
      base.totalProyectado += monto; // sin proyección: vale lo invertido
      base.noProyectables  += 1;
    }
  }

  base.rendimientoEsperado = base.totalProyectado - base.totalInvertido;
  return base;
}

// ── GEOMETRÍA DEL GRÁFICO ────────────────────────────────────────

/** Porcentaje con 2 decimales, para alturas de gráfico que deben sumar exacto. */
function _alto(parte, total) {
  if (!(total > 0)) return 0;
  return Math.round((parte / total) * 10000) / 100;
}

/**
 * Geometría del gráfico de dos columnas: hoy contra al vencer (DIS.17).
 *
 * La primera columna es el dinero que puso el usuario, partido por tipo de
 * inversión, así que la diversificación se ve sin nombrarla. La segunda repite
 * ese mismo cuerpo y le añade un segmento encima: eso es lo que pone el tiempo.
 * Una figura enseña dos cosas porque una es la partición de la otra.
 *
 * Las alturas van en % de la columna más alta (la de al vencer, que vale 100),
 * así las dos comparten escala y se comparan por longitud sin leer una cifra.
 *
 * @param {Array} inversiones
 * @returns {{
 *   segmentos: Array<{tipo:string, monto:number, pct:number, alto:number}>,
 *   altoCuerpo: number,
 *   altoTiempo: number,
 *   rendimiento: number,
 *   totalInvertido: number,
 *   totalProyectado: number,
 *   proyectables: number,
 *   noProyectables: number,
 * } | null} null si no hay capital registrado.
 */
export function columnasPortafolio(inversiones) {
  const proy = proyectarPortafolio(inversiones);
  if (proy.totalInvertido <= 0) return null;

  // El rendimiento nunca resta altura: una proyección negativa no existe con
  // las tasas que acepta el formulario, y dibujarla invertiría la lectura.
  const rendimiento = Math.max(0, proy.rendimientoEsperado);
  const escala      = proy.totalInvertido + rendimiento;
  const altoTiempo  = _alto(rendimiento, escala);
  const altoCuerpo  = Math.round((100 - altoTiempo) * 100) / 100;

  const segmentos = calcularPorTipo(inversiones).map(t => ({
    tipo:  t.tipo,
    monto: t.total,
    pct:   t.pct,
    alto:  _alto(t.total, escala),
  }));

  return {
    segmentos,
    altoCuerpo,
    altoTiempo,
    rendimiento,
    totalInvertido:  proy.totalInvertido,
    totalProyectado: proy.totalProyectado,
    proyectables:    proy.proyectables,
    noProyectables:  proy.noProyectables,
  };
}
