import { describe, it, expect } from 'vitest';
import {
  calcularCDT,
  calcularCredito,
  calcularInteresCompuesto,
  calcularRegla72,
  calcularPrima,
  calcularPILA,
  calcularAportesEmpleado,
  calcularCesantias,
  calcularRentabilidadReal,
  validarCampos,
} from '../../modules/infra/financiero.js';
// Constantes legales vigentes (importadas desde el single source of truth).
// Si cambian los valores oficiales solo se toca `modules/core/constants.js`.
import {
  SMMLV,
  AUXILIO_TRANSPORTE,
  SALUD_EMPLEADO,
  PENSION_EMPLEADO,
  INTERESES_CESANTIAS,
} from '../../modules/core/constants.js';

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

  it('variablesPromedio 0 o ausente produce el mismo resultado', () => {
    const sinParam  = calcularPrima(2_000_000, 180);
    const conCero   = calcularPrima(2_000_000, 180, 0);
    expect(sinParam.prima).toBe(conCero.prima);
    expect(sinParam.variablesAplicadas).toBe(0);
  });

  it('variablesPromedio positivo incrementa la prima', () => {
    const sinVar = calcularPrima(2_000_000, 180);
    const conVar = calcularPrima(2_000_000, 180, 500_000);
    expect(conVar.prima).toBeGreaterThan(sinVar.prima);
    expect(conVar.variablesAplicadas).toBe(500_000);
    // Prima extra = 500.000 * 180/360 = 250.000
    expect(conVar.prima - sinVar.prima).toBe(250_000);
  });

  it('variablesPromedio negativo se trata como 0 (Math.max)', () => {
    const r = calcularPrima(2_000_000, 180, -100_000);
    expect(r.variablesAplicadas).toBe(0);
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

// ── calcularAportesEmpleado() ─────────────────────────────────────

describe('calcularAportesEmpleado()', () => {
  it('retorna null si salario <= 0', () => {
    expect(calcularAportesEmpleado(0)).toBeNull();
    expect(calcularAportesEmpleado(-1000)).toBeNull();
  });

  it('IBC = salario (sin auxilio de transporte) con piso de 1 SMMLV', () => {
    // Salario por encima del mínimo: IBC = salario.
    const r = calcularAportesEmpleado(3_000_000);
    expect(r.ibc).toBe(3_000_000);

    // Salario igual al mínimo: IBC = SMMLV (el piso no lo eleva).
    const rMin = calcularAportesEmpleado(SMMLV);
    expect(rMin.ibc).toBe(SMMLV);
  });

  it('salud = 4 % del IBC, pensión = 4 % del IBC', () => {
    const r = calcularAportesEmpleado(3_000_000);
    expect(r.salud).toBe(Math.round(3_000_000 * SALUD_EMPLEADO));
    expect(r.pension).toBe(Math.round(3_000_000 * PENSION_EMPLEADO));
    expect(r.salud).toBe(120_000);   // 4 % de 3M
    expect(r.pension).toBe(120_000);
  });

  it('sin ARL: el trabajador no aporta ARL (la paga el empleador)', () => {
    const r = calcularAportesEmpleado(3_000_000);
    expect(r).not.toHaveProperty('arlMonto');
  });

  it('FSP = 0 si el IBC es menor a 4 SMMLV', () => {
    const r = calcularAportesEmpleado(3 * SMMLV);  // < 4 SMMLV
    expect(r.fspTasa).toBe(0);
    expect(r.fsp).toBe(0);
  });

  it('FSP = 1 % si el IBC está entre 4 y 16 SMMLV', () => {
    const r = calcularAportesEmpleado(5 * SMMLV);
    expect(r.fspTasa).toBe(0.010);
    expect(r.fsp).toBe(Math.round(5 * SMMLV * 0.010));
  });

  it('FSP sube por tramos: 16 SMMLV → 1.2 %, 20 SMMLV → 2 %', () => {
    const r16 = calcularAportesEmpleado(16 * SMMLV);
    expect(r16.fspTasa).toBe(0.012);

    const r20 = calcularAportesEmpleado(20 * SMMLV);
    expect(r20.fspTasa).toBe(0.020);

    const r25 = calcularAportesEmpleado(25 * SMMLV);  // 20+ SMMLV → tope 2 %
    expect(r25.fspTasa).toBe(0.020);
  });

  it('totalDescuento = salud + pensión + FSP', () => {
    const r = calcularAportesEmpleado(6 * SMMLV);
    expect(r.totalDescuento).toBe(r.salud + r.pension + r.fsp);
  });

  it('sin FSP, el descuento es ~8 % del salario (4 % + 4 %)', () => {
    const salario = 3_000_000;
    const r = calcularAportesEmpleado(salario);  // < 4 SMMLV → sin FSP
    expect(r.totalDescuento).toBe(Math.round(salario * 0.08));
  });

  it('todos los montos son enteros redondeados', () => {
    const r = calcularAportesEmpleado(4_321_000);
    expect(Number.isInteger(r.ibc)).toBe(true);
    expect(Number.isInteger(r.salud)).toBe(true);
    expect(Number.isInteger(r.pension)).toBe(true);
    expect(Number.isInteger(r.fsp)).toBe(true);
    expect(Number.isInteger(r.totalDescuento)).toBe(true);
  });
});

// ── calcularCesantias() ───────────────────────────────────────────

describe('calcularCesantias()', () => {
  it('año completo (360 días) con salario mínimo incluye auxilio', () => {
    const r = calcularCesantias(SMMLV, 360);
    expect(r.incluyeAuxilio).toBe(true);
    expect(r.auxilioAplicado).toBe(AUXILIO_TRANSPORTE);
    // Año completo → cesantías = un salario base (salario + auxilio).
    expect(r.cesantias).toBe(SMMLV + AUXILIO_TRANSPORTE);
  });

  it('salario > 2 SMMLV no incluye auxilio de transporte', () => {
    const salarioAlto = 3 * SMMLV;
    const r = calcularCesantias(salarioAlto, 360);
    expect(r.incluyeAuxilio).toBe(false);
    expect(r.auxilioAplicado).toBe(0);
    expect(r.cesantias).toBe(salarioAlto);
  });

  it('intereses = 12 % de las cesantías en un año completo', () => {
    // 4 SMMLV queda por encima del umbral de auxilio (2 SMMLV), así el
    // test no depende de que se sume o no el auxilio de transporte.
    const salario = 4 * SMMLV;
    const r = calcularCesantias(salario, 360);
    expect(r.cesantias).toBe(salario);  // año completo, sin auxilio
    expect(r.intereses).toBe(Math.round(salario * INTERESES_CESANTIAS));
  });

  it('cesantías proporcionales a los días trabajados', () => {
    const completa = calcularCesantias(3_000_000, 360);
    const mitad    = calcularCesantias(3_000_000, 180);
    expect(mitad.cesantias).toBeCloseTo(completa.cesantias / 2, -2);
  });

  it('máximo de días efectivos es 360', () => {
    const r360 = calcularCesantias(3_000_000, 360);
    const r400 = calcularCesantias(3_000_000, 400);
    expect(r400.cesantias).toBe(r360.cesantias);
  });

  it('variablesPromedio positivo incrementa cesantías e intereses', () => {
    const sinVar = calcularCesantias(3_000_000, 360);
    const conVar = calcularCesantias(3_000_000, 360, 400_000);
    expect(conVar.cesantias).toBeGreaterThan(sinVar.cesantias);
    expect(conVar.variablesAplicadas).toBe(400_000);
    // Año completo: cesantías sube en exactamente el promedio de variables.
    expect(conVar.cesantias - sinVar.cesantias).toBe(400_000);
  });

  it('variablesPromedio negativo se trata como 0 (Math.max)', () => {
    const r = calcularCesantias(3_000_000, 360, -100_000);
    expect(r.variablesAplicadas).toBe(0);
  });

  it('total = cesantías + intereses, y todo es entero', () => {
    const r = calcularCesantias(2_750_000, 200);
    expect(r.total).toBe(r.cesantias + r.intereses);
    expect(Number.isInteger(r.cesantias)).toBe(true);
    expect(Number.isInteger(r.intereses)).toBe(true);
    expect(Number.isInteger(r.total)).toBe(true);
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

