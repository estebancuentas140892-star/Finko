/**
 * GAS.14e (ADR 189 D5): el motor de recomendaciones de deudas, con casos
 * controlados. Cada caso dice qué datos entran y qué debe decidir el motor;
 * las cifras se comparan contra las simulaciones de `estrategia.js`, no contra
 * números copiados.
 */
import { describe, it, expect } from 'vitest';
import {
  analizarDeudas,
  inventarioDeudas,
  deudasSimulables,
  deudasUnibles,
  capacidadDePago,
  extraParaFrenar,
  efectoAbonoUnico,
  mesMas,
  SUPUESTOS_MOTOR,
  simularConsolidacion,
  simularPagoDeuda,
  compararEstrategias,
} from '../../modules/dominio/compromisos/logic.js';

const HOY = '2026-11-22';
const deuda = (id, tipo, saldo, cuota, tasa, extra = {}) => ({
  id, descripcion: id, tipo, saldoTotal: saldo, cuotaMensual: cuota, tasa, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 5, activo: true, ...extra,
});
const entidad = (id, saldo, cuota, tasa, extra) => deuda(id, 'deuda-entidad', saldo, cuota, tasa, extra);
const persona = (id, saldo, cuota, tasa, extra) => deuda(id, 'deuda-personal', saldo, cuota, tasa, extra);
// Ingreso 4 M, fijos 1,5 M, día a día 1 M: libres 1,5 M menos las cuotas.
const CONTEXTO = { hoyISO: HOY, ingresoMensual: 4_000_000, fijosMensuales: 1_500_000, diaADia: 1_000_000 };

describe('inventarioDeudas: qué se sabe de cada deuda (regla 1)', () => {
  it('distingue tasa conocida, 0 % y desconocida; cuota o sin cuota; si crece y si es cara', () => {
    const inv = inventarioDeudas([
      entidad('Visa', 3_000_000, 200_000, 0.35),
      entidad('Sin tasa', 1_000_000, 100_000, null),
      persona('Mamá', 500_000, 0, null),
      persona('Gota', 2_000_000, 50_000, 0.6),
      entidad('Saldada', 0, 100_000, 0.2),
      entidad('Archivada', 1_000_000, 100_000, 0.2, { activo: false }),
    ]);
    expect(inv.map(d => d.id)).toEqual(['Visa', 'Sin tasa', 'Mamá', 'Gota']);
    const por = Object.fromEntries(inv.map(d => [d.id, d]));
    expect(por.Visa).toMatchObject({ tasaConocida: true, cara: true, crece: false, sinCuota: false });
    expect(por['Sin tasa']).toMatchObject({ tasaConocida: false, tasaEA: null, cara: false, crece: false });
    // La personal en blanco es "no cobra interés": conocida, 0 %.
    expect(por['Mamá']).toMatchObject({ tasaConocida: true, sinInteres: true, sinCuota: true });
    expect(por.Gota.crece).toBe(true);
    expect(por.Gota.deficitMes).toBeGreaterThan(0);
  });

  it('deudasSimulables deja fuera la tasa desconocida y la que no tiene cuota (regla 2)', () => {
    const c = [entidad('Visa', 3_000_000, 200_000, 0.35), entidad('Sin tasa', 1_000_000, 100_000, null), persona('Mamá', 500_000, 0, null)];
    expect(deudasSimulables(c).map(d => d.id)).toEqual(['Visa']);
  });

  it('deudasUnibles: solo con interés y tasa conocida; una personal sin interés nunca, un gota a gota sí (reglas 6 y 8)', () => {
    const c = [
      entidad('Visa', 3_000_000, 200_000, 0.35),
      entidad('Sin tasa', 1_000_000, 100_000, null),
      persona('Mamá', 500_000, 50_000, 0),
      persona('Gota', 2_000_000, 150_000, 0.6),
    ];
    expect(deudasUnibles(c).map(d => d.id)).toEqual(['Visa', 'Gota']);
  });
});

describe('capacidadDePago (regla 9)', () => {
  it('ingresos menos fijos, cuotas y día a día', () => {
    expect(capacidadDePago({ ingresoMensual: 4_000_000, fijosMensuales: 1_500_000, cuotas: 300_000, diaADia: 1_000_000 }))
      .toEqual({ valor: 1_200_000, conocida: true });
  });
  it('sin ingresos registrados es desconocida, no negativa', () => {
    expect(capacidadDePago({ ingresoMensual: 0, fijosMensuales: 1_500_000, cuotas: 300_000, diaADia: 0 })).toEqual({ valor: null, conocida: false });
  });
  it('sin promedio del día a día también es desconocida: restar 0 la inflaría', () => {
    expect(capacidadDePago({ ingresoMensual: 4_000_000, fijosMensuales: 1_500_000, cuotas: 300_000, diaADia: null })).toEqual({ valor: null, conocida: false });
    expect(capacidadDePago({ ingresoMensual: 4_000_000, fijosMensuales: 1_500_000, cuotas: 300_000, diaADia: 0 }).conocida).toBe(true);
  });
});

describe('analizarDeudas: la recomendación principal (regla 4)', () => {
  it('sin deudas no hay análisis', () => {
    expect(analizarDeudas([], CONTEXTO)).toMatchObject({ estado: 'sin-deudas', principal: null });
  });

  it('caso A: dos créditos con poca diferencia entre órdenes recomienda Bola de nieve y lo explica', () => {
    const c = [entidad('Visa', 3_000_000, 200_000, 0.35), entidad('Libre', 1_000_000, 100_000, 0.15)];
    const a = analizarDeudas(c, CONTEXTO);
    const comp = compararEstrategias(deudasSimulables(c), 0);
    // La diferencia es menor que 50.000 y no ahorra un mes.
    expect(comp.bolaNieve.interesesTotales - comp.avalancha.interesesTotales).toBeLessThan(50_000);
    expect(a.principal.id).toBe('bolaNieve');
    expect(a.principal.porque[0]).toMatch(/diferencia en intereses es pequeña/);
    expect(a.principal.orden[0].id).toBe('Libre');
    expect(a.principal.consecuencias).toMatchObject({ completo: true, meses: comp.bolaNieve.meses, calidad: 'calculado' });
    expect(a.principal.consecuencias.mesSalida).toBe(mesMas(HOY, comp.bolaNieve.meses));
    // La otra forma queda como alternativa, con sus cifras.
    expect(a.alternativas.some(x => x.id === 'avalancha')).toBe(true);
  });

  it('caso B: la deuda cara y grande termina antes con Avalancha (ahorra un mes o 50.000)', () => {
    const c = [entidad('Tarjeta', 8_000_000, 350_000, 0.45), entidad('Libranza', 6_000_000, 200_000, 0.12)];
    const a = analizarDeudas(c, CONTEXTO);
    const comp = compararEstrategias(deudasSimulables(c), 0);
    expect(comp.ahorroMeses >= 1 || comp.ahorroIntereses >= 50_000).toBe(true);
    expect(a.principal.id).toBe('avalancha');
    // Lo que sobra va primero a la más cara, aunque otra se termine antes.
    expect(a.principal.porque[0]).toMatch(/^Lo que te sobre va primero a Tarjeta\./);
    expect(a.principal.porque[0]).toMatch(/menos en intereses/);
  });

  it('caso C: una deuda que crece pide frenarla primero, con el mínimo en pasos de 10.000', () => {
    const c = [persona('Gota', 2_000_000, 50_000, 0.6), entidad('Banco', 1_000_000, 100_000, 0.2)];
    const a = analizarDeudas(c, CONTEXTO);
    const gota = inventarioDeudas(c).find(d => d.id === 'Gota');
    expect(a.principal.id).toBe('detener-crecimiento');
    expect(a.principal.extraMinimo).toBe(extraParaFrenar(inventarioDeudas(c)));
    expect(a.principal.extraMinimo % 10_000).toBe(0);
    expect(a.principal.extraMinimo).toBeGreaterThan(gota.deficitMes);
    // Con la capacidad conocida y suficiente lo dice como estimado.
    expect(a.principal.porque.join(' ')).toMatch(/te alcanza \(estimado\)/);
    // Con una persona, renegociar es con "quien te prestó", sin prometer.
    expect(a.alternativas.find(x => x.id === 'renegociar').texto).toMatch(/quien te prestó.*no puede asegurar/);
  });

  it('caso C2: si lo libre no alcanza para frenarla, el camino es hablar con la entidad', () => {
    const c = [entidad('Tarjeta', 9_000_000, 100_000, 0.5), entidad('Banco', 1_000_000, 100_000, 0.2)];
    const a = analizarDeudas(c, { ...CONTEXTO, ingresoMensual: 2_700_000 });
    expect(a.capacidad.conocida).toBe(true);
    expect(a.principal.titulo).toBe('Habla con la entidad');
  });

  it('caso C3: con el extra escrito que ya la frena, vuelve a decidir el orden', () => {
    const c = [persona('Gota', 2_000_000, 50_000, 0.6), entidad('Banco', 1_000_000, 100_000, 0.2)];
    const minimo = extraParaFrenar(inventarioDeudas(c));
    expect(analizarDeudas(c, { ...CONTEXTO, extra: minimo }).principal.id).not.toBe('detener-crecimiento');
  });

  it('caso D: todas sin interés recomienda la más pequeña y no inventa intereses', () => {
    const c = [persona('Mamá', 500_000, 50_000, null), persona('Tío', 300_000, 100_000, 0)];
    const a = analizarDeudas(c, CONTEXTO);
    expect(a.principal.id).toBe('bolaNieve');
    expect(a.principal.porque[0]).toMatch(/Ninguna cobra interés/);
    expect(a.principal.consecuencias.intereses).toBe(0);
    // "Pagar más" no promete ahorro en intereses que no existen.
    const abono = a.alternativas.find(x => x.id === 'abono-extra');
    expect(abono.texto).not.toMatch(/intereses/);
  });

  it('caso E: una sola deuda sigue con su cuota y propone pagar más con lo libre (estimado)', () => {
    const c = [entidad('Carro', 20_000_000, 700_000, 0.18)];
    const a = analizarDeudas(c, CONTEXTO);
    const r = simularPagoDeuda(20_000_000, 0.18, 700_000);
    expect(a.principal.id).toBe('cuota-actual');
    expect(a.principal.consecuencias.meses).toBe(r.meses);
    const abono = a.alternativas.find(x => x.id === 'abono-extra');
    expect(abono).toMatchObject({ calidad: 'estimado', extra: 800_000 });
  });

  it('caso F: lo desconocido no se inventa: falta la tasa y el acuerdo, y no hay plan con una sola completa', () => {
    const c = [entidad('Visa', 3_000_000, 200_000, null), entidad('Libre', 1_000_000, 100_000, 0.15), persona('Mamá', 500_000, 0, null)];
    const a = analizarDeudas(c, CONTEXTO);
    expect(a.faltantes.map(x => x.texto)).toEqual(['la tasa de Visa', 'cuánto y cuándo le pagas a Mamá']);
    expect(a.principal.id).toBe('completar-datos');
    expect(a.principal.consecuencias).toBeNull();
    expect(a.alternativas.find(x => x.id === 'acordar-cuota').texto).toMatch(/Mamá/);
  });

  it('caso G: con dos completas y una sin tasa, compara las dos y dice cuál no entra', () => {
    const c = [entidad('Visa', 3_000_000, 200_000, null), entidad('Libre', 1_000_000, 100_000, 0.15), entidad('Moto', 4_000_000, 250_000, 0.22)];
    const a = analizarDeudas(c, CONTEXTO);
    expect(a.simulables.map(d => d.id)).toEqual(['Libre', 'Moto']);
    expect(['avalancha', 'bolaNieve']).toContain(a.principal.id);
    expect(a.principal.porque.join(' ')).toMatch(/Visa no entra en las cuentas: falta la tasa de Visa/);
    expect(a.resumen).toMatch(/\. Sin contar Visa, sales en \d+ meses \(estimado\)\.$/);
  });

  it('sin ingresos, la capacidad es desconocida y no se propone pagar más con ella', () => {
    const c = [entidad('Visa', 3_000_000, 200_000, 0.35), entidad('Libre', 1_000_000, 100_000, 0.15)];
    const a = analizarDeudas(c, { hoyISO: HOY });
    expect(a.capacidad).toEqual({ valor: null, conocida: false });
    expect(a.alternativas.some(x => x.id === 'abono-extra')).toBe(false);
  });

  it('con cuotas que pasan de lo libre, sugiere renegociar sin prometer (regla 7)', () => {
    const c = [entidad('Visa', 3_000_000, 900_000, 0.35), entidad('Libre', 1_000_000, 900_000, 0.15)];
    const a = analizarDeudas(c, { ...CONTEXTO, ingresoMensual: 3_000_000 });
    expect(a.capacidad.valor).toBeLessThan(0);
    expect(a.alternativas.find(x => x.id === 'renegociar').texto).toMatch(/no puede asegurar/);
  });

  it('sugiere pedir una oferta para unir solo con dos o más que cobran interés y alguna cara', () => {
    const caras = [entidad('Tarjeta', 4_000_000, 300_000, 0.4), entidad('Libre', 2_000_000, 200_000, 0.18)];
    expect(analizarDeudas(caras, CONTEXTO).alternativas.some(x => x.id === 'consolidar')).toBe(true);
    const baratas = [entidad('Libranza', 4_000_000, 300_000, 0.12), entidad('Libre', 2_000_000, 200_000, 0.18)];
    expect(analizarDeudas(baratas, CONTEXTO).alternativas.some(x => x.id === 'consolidar')).toBe(false);
  });

  it('todo resultado lleva los supuestos (regla 10)', () => {
    const a = analizarDeudas([entidad('Carro', 20_000_000, 700_000, 0.18)], CONTEXTO);
    expect(a.supuestos).toEqual([...SUPUESTOS_MOTOR]);
    expect(a.resumen).toMatch(/\(estimado\)\.$/);
  });

  it('sin terminar, los intereses del escenario son null y no 50 años de intereses', () => {
    const c = [persona('Gota', 2_000_000, 50_000, 0.6), entidad('Banco', 1_000_000, 100_000, 0.2)];
    const a = analizarDeudas(c, CONTEXTO);
    expect(a.escenarios.base).toMatchObject({ completo: false, intereses: null, mesSalida: null });
  });
});

describe('efectoAbonoUnico: reducir plazo o reducir cuota (regla 5)', () => {
  it('con interés da las dos formas: menos meses con la misma cuota, o cuota menor con el mismo plazo', () => {
    const r = efectoAbonoUnico({ saldo: 20_000_000, tasaEA: 0.18, cuota: 700_000 }, 2_000_000);
    expect(r.plazo.mesesMenos).toBeGreaterThan(0);
    expect(r.plazo.interesesMenos).toBeGreaterThan(0);
    expect(r.cuota.cuotaNueva).toBeLessThan(700_000);
    // Reducir plazo ahorra más intereses que reducir cuota.
    expect(r.plazo.interesesMenos).toBeGreaterThan(r.cuota.interesesMenos);
    // La cuota nueva termina en el mismo plazo de hoy.
    const hoy = simularPagoDeuda(20_000_000, 0.18, 700_000);
    expect(simularPagoDeuda(18_000_000, 0.18, r.cuota.cuotaNueva).meses).toBe(hoy.meses);
  });

  it('sin interés los meses salen del saldo y la cuota', () => {
    const r = efectoAbonoUnico({ saldo: 500_000, tasaEA: 0, cuota: 100_000 }, 200_000);
    expect(r.plazo).toEqual({ mesesMenos: 2, interesesMenos: 0 });
  });

  it('null si no hay cuota, si el abono salda la deuda o si la deuda no se termina', () => {
    expect(efectoAbonoUnico({ saldo: 500_000, tasaEA: 0, cuota: 0 }, 100_000)).toBeNull();
    expect(efectoAbonoUnico({ saldo: 500_000, tasaEA: 0, cuota: 100_000 }, 500_000)).toBeNull();
    expect(efectoAbonoUnico({ saldo: 9_000_000, tasaEA: 0.5, cuota: 100_000 }, 100_000)).toBeNull();
  });
});

describe('simularConsolidacion: los costos del crédito nuevo cuentan (regla 6)', () => {
  const deudas = deudasUnibles([entidad('Tarjeta', 4_000_000, 300_000, 0.4), entidad('Libre', 2_000_000, 200_000, 0.18)]);

  it('una tasa menor ahorra, pero costos altos pueden quitarle la ventaja', () => {
    const sin = simularConsolidacion(deudas, { tasaEA: 0.2, cuota: 500_000 });
    expect(sin.mejora).toBe(true);
    const con = simularConsolidacion(deudas, { tasaEA: 0.2, cuota: 500_000, costos: sin.ahorroIntereses + 1 });
    expect(con.consolidado.costos).toBe(sin.ahorroIntereses + 1);
    expect(con.mejora).toBe(false);
  });

  it('una cuota menor sola no es mejora si en total pagas más', () => {
    const r = simularConsolidacion(deudas, { tasaEA: 0.3, cuota: 250_000 });
    expect(r.consolidado.cuotaMensual).toBeLessThan(r.actual.cuotaMensual);
    expect(r.mejora).toBe(false);
  });
});

describe('mesMas', () => {
  it('suma meses al mes de hoy', () => {
    expect(mesMas('2026-11-22', 2)).toBe('2027-01');
    expect(mesMas('2026-11-22', 0)).toBe('2026-11');
    expect(mesMas('', 3)).toBeNull();
  });
});
