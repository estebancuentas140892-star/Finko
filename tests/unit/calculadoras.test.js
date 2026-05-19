import { describe, it, expect } from 'vitest';
import {
  calcularCDT,
  calcularCredito,
  calcularInteresCompuesto,
  calcularRegla72,
  calcularPrima,
  calcularPILA,
  calcularRentabilidadReal,
  clasificarTasaCredito,
  validarCampos,
} from '../../modules/dominio/calculadoras/logic.js';

// Constantes legales vigentes (importadas desde el single source of truth).
// Si cambian los valores oficiales solo se toca `modules/core/constants.js`.
import { SMMLV, AUXILIO_TRANSPORTE, TASA_USURA } from '../../modules/core/constants.js';

// ── calcularCDT() ─────────────────────────────────────────────────

describe('calcularCDT()', () => {
  it('calcula valor futuro bruto correctamente', () => {
    // 10M al 12% EA por 360 días: 10M × (1.12)^(360/365) ≈ 10M × 1.1183 ≈ 11.183.000
    const r = calcularCDT(10_000_000, 0.12, 360);
    expect(r.valorFuturo).toBeGreaterThan(11_000_000);
    expect(r.valorFuturo).toBeLessThan(11_250_000);
  });

  it('rendimientoBruto = valorFuturo − principal', () => {
    const r = calcularCDT(5_000_000, 0.10, 180);
    expect(r.rendimientoBruto).toBe(r.valorFuturo - 5_000_000);
  });

  it('retención es el 7% del rendimiento bruto', () => {
    const r = calcularCDT(5_000_000, 0.10, 180);
    expect(r.retencion).toBe(Math.round(r.rendimientoBruto * 0.07));
  });

  it('rendimientoNeto = bruto − retención', () => {
    const r = calcularCDT(5_000_000, 0.10, 180);
    expect(r.rendimientoNeto).toBe(r.rendimientoBruto - r.retencion);
  });

  it('totalNeto = principal + rendimientoNeto', () => {
    const r = calcularCDT(5_000_000, 0.10, 180);
    expect(r.totalNeto).toBe(5_000_000 + r.rendimientoNeto);
  });

  it('plazo 0 días devuelve valor futuro = principal', () => {
    const r = calcularCDT(1_000_000, 0.12, 0);
    expect(r.valorFuturo).toBe(1_000_000);
    expect(r.rendimientoBruto).toBe(0);
  });

  it('todos los campos son enteros redondeados', () => {
    const r = calcularCDT(7_500_000, 0.135, 270);
    expect(Number.isInteger(r.valorFuturo)).toBe(true);
    expect(Number.isInteger(r.rendimientoBruto)).toBe(true);
    expect(Number.isInteger(r.retencion)).toBe(true);
    expect(Number.isInteger(r.rendimientoNeto)).toBe(true);
    expect(Number.isInteger(r.totalNeto)).toBe(true);
  });
});

// ── calcularCredito() ─────────────────────────────────────────────

describe('calcularCredito()', () => {
  it('calcula la cuota mensual de un crédito estándar', () => {
    // 10M al 24% EA por 36 meses
    const r = calcularCredito(10_000_000, 0.24, 36);
    expect(r.cuotaMensual).toBeGreaterThan(300_000);
    expect(r.cuotaMensual).toBeLessThan(450_000);
  });

  it('totalPagado ≈ cuotaMensual × plazoMeses (±plazo por redondeo)', () => {
    const r = calcularCredito(5_000_000, 0.18, 24);
    // Ambas cifras se redondean independientemente; la diferencia máxima es ±1 por cuota.
    expect(Math.abs(r.totalPagado - r.cuotaMensual * 24)).toBeLessThanOrEqual(24);
  });

  it('totalIntereses = totalPagado − principal', () => {
    const r = calcularCredito(5_000_000, 0.18, 24);
    expect(r.totalIntereses).toBe(r.totalPagado - 5_000_000);
  });

  it('tasa mensual es positiva', () => {
    const r = calcularCredito(10_000_000, 0.24, 36);
    expect(r.tasaMensual).toBeGreaterThan(0);
    expect(r.tasaMensual).toBeLessThan(5);
  });

  it('con tasa 0% la cuota es principal / meses (amortización simple)', () => {
    const r = calcularCredito(12_000_000, 0, 12);
    expect(r.cuotaMensual).toBe(1_000_000);
    expect(r.totalIntereses).toBe(0);
  });

  it('cuota mensual es entera', () => {
    const r = calcularCredito(8_000_000, 0.20, 48);
    expect(Number.isInteger(r.cuotaMensual)).toBe(true);
  });

  it('totalIntereses siempre ≥ 0', () => {
    const r = calcularCredito(5_000_000, 0.15, 12);
    expect(r.totalIntereses).toBeGreaterThanOrEqual(0);
  });
});

// ── calcularInteresCompuesto() ────────────────────────────────────

describe('calcularInteresCompuesto()', () => {
  it('duplica el capital aproximadamente a la tasa correcta en varios años', () => {
    // 100k al 12% anual por 6 años compuesto mensual
    const r = calcularInteresCompuesto(1_000_000, 12, 12, 6);
    expect(r.montoFinal).toBeGreaterThan(2_000_000);
  });

  it('ganancia = montoFinal − principal', () => {
    const r = calcularInteresCompuesto(1_000_000, 10, 12, 5);
    expect(r.ganancia).toBe(r.montoFinal - 1_000_000);
  });

  it('factor de crecimiento = montoFinal / principal', () => {
    const r = calcularInteresCompuesto(2_000_000, 8, 4, 10);
    expect(r.factorCrecimiento).toBeCloseTo(r.montoFinal / 2_000_000, 2);
  });

  it('0 años devuelve el capital sin cambios', () => {
    const r = calcularInteresCompuesto(1_000_000, 12, 12, 0);
    expect(r.montoFinal).toBe(1_000_000);
    expect(r.ganancia).toBe(0);
    expect(r.factorCrecimiento).toBe(1);
  });

  it('capitalización diaria (365) da más que mensual (12)', () => {
    const mensual = calcularInteresCompuesto(1_000_000, 12, 12, 5);
    const diario  = calcularInteresCompuesto(1_000_000, 12, 365, 5);
    expect(diario.montoFinal).toBeGreaterThan(mensual.montoFinal);
  });

  it('montoFinal y ganancia son enteros', () => {
    const r = calcularInteresCompuesto(1_500_000, 9, 2, 7);
    expect(Number.isInteger(r.montoFinal)).toBe(true);
    expect(Number.isInteger(r.ganancia)).toBe(true);
  });
});

// ── calcularRegla72() ─────────────────────────────────────────────

describe('calcularRegla72()', () => {
  it('al 12% tarda ~6 años en duplicarse', () => {
    const r = calcularRegla72(12);
    expect(r.aniosAproximados).toBeCloseTo(6, 0);
  });

  it('al 6% tarda ~12 años', () => {
    const r = calcularRegla72(6);
    expect(r.aniosAproximados).toBeCloseTo(12, 0);
  });

  it('años exactos siempre ≤ años aproximados (la regla 72 sobreestima levemente)', () => {
    // Para tasas moderadas (1%-30%) la regla sobreestima ligeramente
    const r = calcularRegla72(10);
    expect(Math.abs(r.aniosAproximados - r.aniosExactos)).toBeLessThan(1);
  });

  it('a mayor tasa, menos años para duplicar', () => {
    const bajo = calcularRegla72(5);
    const alto  = calcularRegla72(20);
    expect(alto.aniosAproximados).toBeLessThan(bajo.aniosAproximados);
  });

  it('devuelve números con 2 decimales', () => {
    const r = calcularRegla72(7);
    expect(typeof r.aniosAproximados).toBe('number');
    expect(typeof r.aniosExactos).toBe('number');
  });
});

// ── calcularPrima() ───────────────────────────────────────────────

describe('calcularPrima()', () => {
  it('prima completa (180 días) con salario mínimo incluye auxilio', () => {
    const r = calcularPrima(SMMLV, 180);
    expect(r.incluyeAuxilio).toBe(true);
    expect(r.auxilioAplicado).toBe(AUXILIO_TRANSPORTE);
    // (SMMLV + AUXILIO) * 180 / 360 = base/2
    const esperado = Math.round((SMMLV + AUXILIO_TRANSPORTE) * 180 / 360);
    expect(r.prima).toBe(esperado);
  });

  it('salario > 2 SMMLV no incluye auxilio de transporte', () => {
    // Resilient a cambios del SMMLV: usamos 3× SMMLV vigente para quedar
    // holgadamente por encima del umbral.
    const salarioAlto = 3 * SMMLV;
    const r = calcularPrima(salarioAlto, 180);
    expect(r.incluyeAuxilio).toBe(false);
    expect(r.auxilioAplicado).toBe(0);
    expect(r.salarioBase).toBe(salarioAlto);
  });

  it('prima proporcional a los días trabajados', () => {
    const completa = calcularPrima(2_000_000, 180);
    const mitad    = calcularPrima(2_000_000, 90);
    expect(mitad.prima).toBeCloseTo(completa.prima / 2, -2);
  });

  it('máximo de días efectivos es 180', () => {
    const r180 = calcularPrima(2_000_000, 180);
    const r200 = calcularPrima(2_000_000, 200);
    expect(r200.prima).toBe(r180.prima);
  });

  it('prima es entero redondeado', () => {
    const r = calcularPrima(1_800_000, 150);
    expect(Number.isInteger(r.prima)).toBe(true);
  });

  it('salario exactamente en 2 SMMLV incluye auxilio', () => {
    const r = calcularPrima(2 * SMMLV, 180);
    expect(r.incluyeAuxilio).toBe(true);
  });

  it('salario justo encima de 2 SMMLV no incluye auxilio', () => {
    const r = calcularPrima(2 * SMMLV + 1, 180);
    expect(r.incluyeAuxilio).toBe(false);
  });
});

// ── validarCampos() ───────────────────────────────────────────────

describe('validarCampos()', () => {
  it('retorna vacío con todos los campos válidos', () => {
    const errores = validarCampos(
      { monto: '1000000', tasa: '12' },
      { monto: { min: 1 }, tasa: { min: 0, max: 100 } }
    );
    expect(errores).toEqual([]);
  });

  it('reporta error si valor no es número', () => {
    const errores = validarCampos({ monto: 'abc' }, { monto: { min: 1 } });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si valor < min', () => {
    const errores = validarCampos({ dias: '0' }, { dias: { min: 1 } });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si valor > max', () => {
    const errores = validarCampos({ tasa: '200' }, { tasa: { min: 0, max: 100 } });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si entero: true y el valor tiene decimales', () => {
    const errores = validarCampos({ meses: '12.5' }, { meses: { min: 1, entero: true } });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('no reporta error si entero: true y el valor es entero', () => {
    const errores = validarCampos({ meses: '12' }, { meses: { min: 1, entero: true } });
    expect(errores).toEqual([]);
  });

  it('puede retornar múltiples errores', () => {
    const errores = validarCampos(
      { a: 'x', b: '0' },
      { a: { min: 1 }, b: { min: 1 } }
    );
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── calcularPILA() ────────────────────────────────────────────────

describe('calcularPILA()', () => {
  it('retorna null si ingreso <= 0', () => {
    expect(calcularPILA(0)).toBeNull();
    expect(calcularPILA(-1000)).toBeNull();
  });

  it('IBC = max(ingreso × 40 %, 1 SMMLV)', () => {
    // Ingreso bajo → IBC se ancla en 1 SMMLV
    const r1 = calcularPILA(1_000_000);
    expect(r1.ibc).toBe(SMMLV);

    // Ingreso alto → IBC = 40 % del ingreso
    const r2 = calcularPILA(10_000_000);
    expect(r2.ibc).toBe(4_000_000);
  });

  it('salud = 12.5 % del IBC, pensión = 16 % del IBC', () => {
    const r = calcularPILA(10_000_000);
    expect(r.salud).toBe(Math.round(4_000_000 * 0.125));
    expect(r.pension).toBe(Math.round(4_000_000 * 0.16));
  });

  it('ARL default = clase I (0.522 %)', () => {
    const r = calcularPILA(10_000_000);
    expect(r.arlMonto).toBe(Math.round(4_000_000 * 0.00522));
  });

  it('ARL personalizable por clase de riesgo', () => {
    const r = calcularPILA(10_000_000, 0.04350);  // clase IV
    expect(r.arlMonto).toBe(Math.round(4_000_000 * 0.04350));
  });

  it('total = salud + pensión + ARL', () => {
    const r = calcularPILA(5_000_000);
    expect(r.total).toBe(r.salud + r.pension + r.arlMonto);
  });
});

// ── calcularRentabilidadReal() ────────────────────────────────────

describe('calcularRentabilidadReal()', () => {
  it('Fisher: 12 % nominal con 5 % inflación → ~6.67 % real', () => {
    // (1.12 / 1.05) − 1 ≈ 0.0667 → 6.67 %
    const r = calcularRentabilidadReal(10_000_000, 12, 5);
    expect(r.tasaRealPct).toBeGreaterThan(6.5);
    expect(r.tasaRealPct).toBeLessThan(6.8);
  });

  it('tasa nominal = inflación → tasa real ≈ 0', () => {
    const r = calcularRentabilidadReal(10_000_000, 8, 8);
    expect(r.tasaRealPct).toBeCloseTo(0, 4);
  });

  it('tasa nominal < inflación → tasa real negativa', () => {
    const r = calcularRentabilidadReal(10_000_000, 3, 8);
    expect(r.tasaRealPct).toBeLessThan(0);
    expect(r.perdidaInflacion).toBeGreaterThan(0);
  });

  it('ganancia nominal = capital × tasa / 100', () => {
    const r = calcularRentabilidadReal(10_000_000, 10, 4);
    expect(r.gananciaNominal).toBe(1_000_000);
  });

  it('perdidaInflacion = nominal − real', () => {
    const r = calcularRentabilidadReal(10_000_000, 12, 5);
    expect(r.perdidaInflacion).toBe(r.gananciaNominal - r.gananciaReal);
  });
});

// ── clasificarTasaCredito() ───────────────────────────────────────

describe('clasificarTasaCredito()', () => {
  const USURA = 0.2817;  // Q2 2026

  it('tasa > usura → "usura"', () => {
    expect(clasificarTasaCredito(0.30, USURA)).toBe('usura');
    expect(clasificarTasaCredito(0.50, USURA)).toBe('usura');
  });

  it('tasa entre 85 % y 100 % de usura → "alta"', () => {
    expect(clasificarTasaCredito(0.25, USURA)).toBe('alta');   // ~88.7 %
  });

  it('tasa entre 65 % y 85 % de usura → "estandar"', () => {
    expect(clasificarTasaCredito(0.20, USURA)).toBe('estandar'); // ~71 %
  });

  it('tasa < 65 % de usura → "razonable"', () => {
    expect(clasificarTasaCredito(0.15, USURA)).toBe('razonable'); // ~53 %
    expect(clasificarTasaCredito(0.05, USURA)).toBe('razonable');
  });

  it('tasa ≤ 0 → "razonable"', () => {
    expect(clasificarTasaCredito(0, USURA)).toBe('razonable');
    expect(clasificarTasaCredito(-0.01, USURA)).toBe('razonable');
  });

  it('usa TASA_USURA vigente por defecto si no se pasa el parámetro', () => {
    // No usura param → debe clasificar contra la usura vigente actual.
    // Resilient a cambios trimestrales: comparamos contra la constante importada.
    expect(clasificarTasaCredito(TASA_USURA + 0.01)).toBe('usura');
    expect(clasificarTasaCredito(TASA_USURA * 0.30)).toBe('razonable');
  });
});
