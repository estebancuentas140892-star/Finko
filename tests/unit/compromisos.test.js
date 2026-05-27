import { describe, it, expect } from 'vitest';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  calcularTotalCompromisos,
  proximoVencimiento,
  urgencia,
  compromisosProximos,
  nivelAlertaMora,
  validarCompromiso,
  normalizarCompromiso,
  filtrarDeudasPagables,
  simularEstrategiaPago,
  compararEstrategias,
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../../modules/dominio/compromisos/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const hoy = new Date();
const DIA_HOY = hoy.getDate();

// diaPago en 10 días desde hoy (siempre futuro, nunca igual a hoy en el cómputo).
const DIA_FUTURO = ((DIA_HOY + 10 - 1) % 28) + 1; // 1-28, nunca pisa hoy
const DIA_PASADO = ((DIA_HOY - 2 + 28 - 1) % 28) + 1; // 2 días antes, 1-28

const compromisoBase = (overrides = {}) => ({
  id:          'c1',
  descripcion: 'Arriendo',
  monto:       1_500_000,
  frecuencia:  'Mensual',
  diaPago:     DIA_FUTURO,
  tipo:        'fijo',
  activo:      true,
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Internet hogar',
  monto:       '89000',
  frecuencia:  'Mensual',
  diaPago:     '5',
  tipo:        'fijo',
};

// ── CATÁLOGOS ─────────────────────────────────────────────────────

describe('catálogos exportados', () => {
  it('TIPOS_COMPROMISO tiene los tres tipos', () => {
    expect(TIPOS_COMPROMISO).toEqual(expect.arrayContaining(['fijo', 'deuda', 'agenda']));
    expect(TIPOS_COMPROMISO).toHaveLength(3);
  });

  it('LABEL_TIPO cubre todos los tipos', () => {
    for (const tipo of TIPOS_COMPROMISO) {
      expect(LABEL_TIPO[tipo]).toBeTruthy();
    }
  });

  it('ICONO_TIPO cubre todos los tipos', () => {
    for (const tipo of TIPOS_COMPROMISO) {
      expect(ICONO_TIPO[tipo]).toBeTruthy();
    }
  });
});

// ── compromisosActivos() ──────────────────────────────────────────

describe('compromisosActivos()', () => {
  it('devuelve todos cuando todos están activos', () => {
    const lista = [compromisoBase(), compromisoBase({ id: 'c2', descripcion: 'Netflix' })];
    expect(compromisosActivos(lista)).toHaveLength(2);
  });

  it('excluye compromisos con activo === false', () => {
    const lista = [compromisoBase(), compromisoBase({ id: 'c2', activo: false })];
    expect(compromisosActivos(lista)).toHaveLength(1);
    expect(compromisosActivos(lista)[0].id).toBe('c1');
  });

  it('incluye compromisos sin campo activo (undefined ≠ false)', () => {
    const { activo: _, ...sinActivo } = compromisoBase();
    expect(compromisosActivos([sinActivo])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay compromisos', () => {
    expect(compromisosActivos([])).toEqual([]);
  });
});

// ── calcularCompromisoMensual() ───────────────────────────────────

describe('calcularCompromisoMensual()', () => {
  it('mensual × 1 = monto original', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }))).toBe(1_500_000);
  });

  it('quincenal × 2', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 500_000, frecuencia: 'Quincenal' }))).toBe(1_000_000);
  });

  it('anual / 12', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 12_000_000, frecuencia: 'Anual' }))).toBe(1_000_000);
  });

  it('única vez devuelve 0', () => {
    expect(calcularCompromisoMensual(compromisoBase({ frecuencia: 'Única vez' }))).toBe(0);
  });

  it('frecuencia desconocida devuelve 0', () => {
    expect(calcularCompromisoMensual(compromisoBase({ frecuencia: 'Cada siglo' }))).toBe(0);
  });
});

// ── calcularTotalCompromisos() ────────────────────────────────────

describe('calcularTotalCompromisos()', () => {
  it('suma proyección mensual de todos los activos', () => {
    const lista = [
      compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }),
      compromisoBase({ id: 'c2', monto: 250_000, frecuencia: 'Quincenal' }),
    ];
    expect(calcularTotalCompromisos(lista)).toBe(2_000_000);
  });

  it('ignora compromisos inactivos', () => {
    const lista = [
      compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }),
      compromisoBase({ id: 'c2', monto: 999_999, frecuencia: 'Mensual', activo: false }),
    ];
    expect(calcularTotalCompromisos(lista)).toBe(1_500_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalCompromisos([])).toBe(0);
  });
});

// ── proximoVencimiento() ──────────────────────────────────────────

describe('proximoVencimiento()', () => {
  it('devuelve 0 cuando el diaPago es hoy', () => {
    expect(proximoVencimiento(compromisoBase({ diaPago: DIA_HOY }))).toBe(0);
  });

  it('devuelve un número positivo cuando el diaPago es futuro en este mes', () => {
    const dias = proximoVencimiento(compromisoBase({ diaPago: DIA_FUTURO }));
    expect(dias).toBeGreaterThan(0);
  });

  it('devuelve un número positivo cuando el diaPago ya pasó (próximo mes)', () => {
    // DIA_PASADO está antes de hoy → próximo ciclo es el mes siguiente
    const dias = proximoVencimiento(compromisoBase({ diaPago: DIA_PASADO }));
    expect(dias).toBeGreaterThan(0);
  });

  it('siempre devuelve un número no negativo', () => {
    for (let dia = 1; dia <= 28; dia++) {
      expect(proximoVencimiento(compromisoBase({ diaPago: dia }))).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── urgencia() ────────────────────────────────────────────────────

describe('urgencia()', () => {
  it('retorna "urgente" cuando faltan ≤ 3 días (incluye hoy)', () => {
    expect(urgencia(compromisoBase({ diaPago: DIA_HOY }))).toBe('urgente');
  });

  it('retorna uno de los tres niveles válidos para cualquier día', () => {
    const niveles = new Set(['urgente', 'proximo', 'normal']);
    for (let dia = 1; dia <= 28; dia++) {
      expect(niveles.has(urgencia(compromisoBase({ diaPago: dia })))).toBe(true);
    }
  });

  it('retorna "normal" para diaPago muy lejano', () => {
    // 15 días en el futuro siempre es 'normal' si DIA_HOY <= 13
    const diaLejano = ((DIA_HOY + 15 - 1) % 28) + 1;
    const dias = Math.abs(diaLejano - DIA_HOY); // aproximación
    if (dias > 7) {
      expect(urgencia(compromisoBase({ diaPago: diaLejano }))).toBe('normal');
    }
  });
});

// ── validarCompromiso() ───────────────────────────────────────────

describe('validarCompromiso()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarCompromiso(datosFormValidos)).toEqual([]);
  });

  it('reporta error si descripción está vacía', () => {
    const errores = validarCompromiso({ ...datosFormValidos, descripcion: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('reporta error si monto es 0', () => {
    expect(validarCompromiso({ ...datosFormValidos, monto: '0' }).length).toBeGreaterThan(0);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarCompromiso({ ...datosFormValidos, monto: 'mucho' });
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si frecuencia no está en la lista', () => {
    const errores = validarCompromiso({ ...datosFormValidos, frecuencia: 'Rarísimo' });
    expect(errores[0]).toMatch(/frecuencia/i);
  });

  it('reporta error si diaPago es 0', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '0' }).length).toBeGreaterThan(0);
  });

  it('reporta error si diaPago es 32', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '32' }).length).toBeGreaterThan(0);
  });

  it('acepta diaPago 1 y 31 como válidos', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '1' })).toEqual([]);
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '31' })).toEqual([]);
  });

  it('reporta error si tipo no está en la lista', () => {
    const errores = validarCompromiso({ ...datosFormValidos, tipo: 'capricho' });
    expect(errores[0]).toMatch(/tipo/i);
  });

  it('acepta los tres tipos válidos', () => {
    for (const tipo of ['fijo', 'deuda', 'agenda']) {
      expect(validarCompromiso({ ...datosFormValidos, tipo })).toEqual([]);
    }
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCompromiso({ descripcion: '', monto: '0', frecuencia: '', diaPago: '0', tipo: '' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});

// ── normalizarCompromiso() ────────────────────────────────────────

describe('normalizarCompromiso()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarCompromiso(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(89_000);
  });

  it('convierte diaPago string a número entero', () => {
    const result = normalizarCompromiso(datosFormValidos);
    expect(typeof result.diaPago).toBe('number');
    expect(result.diaPago).toBe(5);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, descripcion: '  Internet  ' });
    expect(result.descripcion).toBe('Internet');
  });

  it('marca activo en true', () => {
    expect(normalizarCompromiso(datosFormValidos).activo).toBe(true);
  });

  it('preserva la frecuencia', () => {
    expect(normalizarCompromiso(datosFormValidos).frecuencia).toBe('Mensual');
  });

  it('preserva el tipo', () => {
    expect(normalizarCompromiso(datosFormValidos).tipo).toBe('fijo');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarCompromiso(datosFormValidos)).not.toHaveProperty('id');
  });

  it('incluye saldoPendiente cuando tipo=deuda y el campo está lleno', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '12000000', tasaEA: '' };
    const result = normalizarCompromiso(datos);
    expect(result.saldoPendiente).toBe(12_000_000);
  });

  it('incluye tasaEA como decimal cuando tipo=deuda y el campo está lleno', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '', tasaEA: '26.5' };
    const result = normalizarCompromiso(datos);
    expect(result.tasaEA).toBeCloseTo(0.265);
  });

  it('incluye ambos campos extras cuando tipo=deuda y ambos están completos', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '5000000', tasaEA: '24' };
    const result = normalizarCompromiso(datos);
    expect(result.saldoPendiente).toBe(5_000_000);
    expect(result.tasaEA).toBeCloseTo(0.24);
  });

  it('omite saldoPendiente cuando tipo=deuda pero el campo está vacío', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '', tasaEA: '' };
    const result = normalizarCompromiso(datos);
    expect(result).not.toHaveProperty('saldoPendiente');
  });

  it('omite campos extra cuando tipo=fijo aunque el campo tenga valor', () => {
    const datos = { ...datosFormValidos, tipo: 'fijo', saldoPendiente: '999999', tasaEA: '10' };
    const result = normalizarCompromiso(datos);
    expect(result).not.toHaveProperty('saldoPendiente');
    expect(result).not.toHaveProperty('tasaEA');
  });
});

// ── validarCompromiso() - campos de deuda ─────────────────────────

describe('validarCompromiso() - campos opcionales de deuda', () => {
  const datosDeuda = { ...datosFormValidos, tipo: 'deuda' };

  it('acepta deuda sin saldoPendiente ni tasaEA (ambos vacíos)', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '' })).toEqual([]);
  });

  it('acepta deuda con saldoPendiente válido', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '12000000', tasaEA: '' })).toEqual([]);
  });

  it('acepta deuda con tasaEA válida', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '26.5' })).toEqual([]);
  });

  it('acepta saldoPendiente de 0 (deuda saldada)', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '0', tasaEA: '' })).toEqual([]);
  });

  it('reporta error si saldoPendiente es negativo', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '-1000', tasaEA: '' });
    expect(errores.some(e => /saldo/i.test(e))).toBe(true);
  });

  it('reporta error si saldoPendiente no es número', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: 'mucho', tasaEA: '' });
    expect(errores.some(e => /saldo/i.test(e))).toBe(true);
  });

  it('reporta error si tasaEA supera 200%', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '201' });
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('reporta error si tasaEA es negativa', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '-1' });
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('NO valida saldoPendiente para tipo=fijo aunque tenga valor', () => {
    // fijo con saldo negativo no da error porque el campo no aplica
    const datos = { ...datosFormValidos, tipo: 'fijo', saldoPendiente: '-9999', tasaEA: '-1' };
    expect(validarCompromiso(datos)).toEqual([]);
  });
});

// ── compromisosProximos() ─────────────────────────────────────────

describe('compromisosProximos()', () => {
  it('devuelve array vacío si no hay compromisos', () => {
    expect(compromisosProximos([])).toEqual([]);
  });

  it('incluye compromisos cuyo diaPago es hoy (0 días restantes)', () => {
    const comp = compromisoBase({ diaPago: DIA_HOY });
    const resultado = compromisosProximos([comp], 3);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].diasRestantes).toBe(0);
  });

  it('excluye compromisos con más días que el límite', () => {
    const comp = compromisoBase({ diaPago: DIA_FUTURO }); // 10 días en el futuro
    // DIA_FUTURO está a 10 días → queda fuera del límite de 3
    const resultado = compromisosProximos([comp], 3);
    expect(resultado).toHaveLength(0);
  });

  it('excluye compromisos inactivos', () => {
    const comp = compromisoBase({ diaPago: DIA_HOY, activo: false });
    expect(compromisosProximos([comp], 3)).toHaveLength(0);
  });

  it('usa diasLimite=3 por defecto', () => {
    const comp = compromisoBase({ diaPago: DIA_HOY });
    const resultado = compromisosProximos([comp]);
    expect(resultado).toHaveLength(1);
  });

  it('cada elemento tiene diasRestantes', () => {
    const comp = compromisoBase({ diaPago: DIA_HOY });
    const resultado = compromisosProximos([comp], 3);
    expect(resultado[0]).toHaveProperty('diasRestantes');
    expect(typeof resultado[0].diasRestantes).toBe('number');
  });

  it('ordena de más urgente a menos urgente (menor diasRestantes primero)', () => {
    const hoy     = compromisoBase({ id: 'c1', diaPago: DIA_HOY });
    const futuro  = compromisoBase({ id: 'c2', diaPago: DIA_FUTURO });
    // Solo hoy pasa el límite de 3 días; para probar orden necesitamos 2 con distinto días
    // Usamos diasLimite=100 para incluir ambos y verificar el orden
    const resultado = compromisosProximos([futuro, hoy], 100);
    expect(resultado[0].id).toBe('c1'); // hoy (0 días) primero
    expect(resultado[1].id).toBe('c2'); // futuro después
  });

  it('respeta diasLimite=0 (solo los de hoy)', () => {
    const hoy   = compromisoBase({ id: 'c1', diaPago: DIA_HOY });
    const todos = compromisosProximos([hoy], 0);
    expect(todos).toHaveLength(1);
    expect(todos[0].diasRestantes).toBe(0);
  });
});

// ─── F.4: Estrategias de pago (Avalancha / Bola de Nieve) ────────

const deudaBase = (overrides = {}) => ({
  id:             'd1',
  descripcion:    'Tarjeta Visa',
  monto:          200_000,
  frecuencia:     'Mensual',
  diaPago:        15,
  tipo:           'deuda',
  activo:         true,
  saldoPendiente: 1_000_000,
  tasaEA:         0.30,
  ...overrides,
});

describe('filtrarDeudasPagables', () => {
  it('retorna array vacío si no hay compromisos', () => {
    expect(filtrarDeudasPagables([])).toEqual([]);
  });

  it('excluye compromisos no-deuda', () => {
    const fijo = deudaBase({ id: 'f1', tipo: 'fijo' });
    expect(filtrarDeudasPagables([fijo])).toHaveLength(0);
  });

  it('excluye deudas inactivas', () => {
    const inactiva = deudaBase({ activo: false });
    expect(filtrarDeudasPagables([inactiva])).toHaveLength(0);
  });

  it('excluye deudas sin saldoPendiente o saldo<=0', () => {
    const sinSaldo = deudaBase({ id: 'd1', saldoPendiente: undefined });
    const cero     = deudaBase({ id: 'd2', saldoPendiente: 0 });
    expect(filtrarDeudasPagables([sinSaldo, cero])).toHaveLength(0);
  });

  it('excluye deudas sin tasaEA', () => {
    const sinTasa = deudaBase({ tasaEA: undefined });
    expect(filtrarDeudasPagables([sinTasa])).toHaveLength(0);
  });

  it('mapea al shape esperado', () => {
    const deuda = deudaBase();
    const [d] = filtrarDeudasPagables([deuda]);
    expect(d).toEqual({
      id:          'd1',
      descripcion: 'Tarjeta Visa',
      saldo:       1_000_000,
      tasaEA:      0.30,
      cuota:       200_000,
    });
  });

  it('tasaEA=0 (sin interés) es válida', () => {
    const sinInteres = deudaBase({ tasaEA: 0 });
    expect(filtrarDeudasPagables([sinInteres])).toHaveLength(1);
  });
});

describe('simularEstrategiaPago', () => {
  it('retorna ceros si no hay deudas', () => {
    const r = simularEstrategiaPago([], 100_000, 'avalancha');
    expect(r.meses).toBe(0);
    expect(r.completo).toBe(true);
    expect(r.orden).toEqual([]);
  });

  it('paga una sola deuda sin interés en saldo/cuota meses', () => {
    const deudas = [{ id: 'd1', descripcion: 'X', saldo: 1_000_000, tasaEA: 0, cuota: 100_000 }];
    const r = simularEstrategiaPago(deudas, 0, 'avalancha');
    expect(r.meses).toBe(10);
    expect(r.interesesTotales).toBe(0);
    expect(r.completo).toBe(true);
    expect(r.orden[0].mesPagado).toBe(10);
  });

  it('extra mensual acelera el pago', () => {
    const deudas = [{ id: 'd1', descripcion: 'X', saldo: 1_000_000, tasaEA: 0, cuota: 100_000 }];
    const sinExtra = simularEstrategiaPago(deudas, 0, 'avalancha');
    const conExtra = simularEstrategiaPago(deudas, 100_000, 'avalancha');
    expect(conExtra.meses).toBeLessThan(sinExtra.meses);
  });

  it('avalancha prioriza deuda con tasa más alta', () => {
    const deudas = [
      { id: 'baja',  descripcion: 'Baja',  saldo: 1_000_000, tasaEA: 0.10, cuota: 100_000 },
      { id: 'alta',  descripcion: 'Alta',  saldo: 1_000_000, tasaEA: 0.30, cuota: 100_000 },
    ];
    const r = simularEstrategiaPago(deudas, 100_000, 'avalancha');
    expect(r.orden[0].id).toBe('alta');
    expect(r.orden[1].id).toBe('baja');
    // La de tasa más alta se paga primero (mes menor).
    expect(r.orden[0].mesPagado).toBeLessThan(r.orden[1].mesPagado);
  });

  it('bolaNieve prioriza deuda con saldo más pequeño', () => {
    const deudas = [
      { id: 'grande', descripcion: 'Grande', saldo: 5_000_000, tasaEA: 0.30, cuota: 200_000 },
      { id: 'chica',  descripcion: 'Chica',  saldo: 500_000,   tasaEA: 0.10, cuota: 100_000 },
    ];
    const r = simularEstrategiaPago(deudas, 100_000, 'bolaNieve');
    expect(r.orden[0].id).toBe('chica');
    expect(r.orden[0].mesPagado).toBeLessThan(r.orden[1].mesPagado);
  });

  it('genera intereses positivos cuando tasaEA>0', () => {
    const deudas = [{ id: 'd1', descripcion: 'X', saldo: 1_000_000, tasaEA: 0.30, cuota: 100_000 }];
    const r = simularEstrategiaPago(deudas, 0, 'avalancha');
    expect(r.interesesTotales).toBeGreaterThan(0);
  });

  it('no excede MAX_MESES cuando aporte no cubre intereses (no loop infinito)', () => {
    const deudas = [{ id: 'd1', descripcion: 'X', saldo: 10_000_000, tasaEA: 0.50, cuota: 1, }];
    const r = simularEstrategiaPago(deudas, 0, 'avalancha');
    expect(r.completo).toBe(false);
    expect(r.meses).toBe(600);
  });
});

describe('compararEstrategias', () => {
  it('avalancha ≤ intereses que bolaNieve en escenario clásico', () => {
    const deudas = [
      { id: 'grande_alta',  descripcion: 'Grande Alta',  saldo: 5_000_000, tasaEA: 0.40, cuota: 200_000 },
      { id: 'chica_baja',   descripcion: 'Chica Baja',   saldo: 500_000,   tasaEA: 0.10, cuota: 50_000 },
    ];
    const r = compararEstrategias(deudas, 100_000);
    expect(r.avalancha.interesesTotales).toBeLessThanOrEqual(r.bolaNieve.interesesTotales);
    expect(r.mejor).toBe('avalancha');
    expect(r.ahorroIntereses).toBeGreaterThan(0);
  });

  it('empata cuando todas las deudas tienen misma tasa y saldo', () => {
    const deudas = [
      { id: 'a', descripcion: 'A', saldo: 1_000_000, tasaEA: 0.20, cuota: 100_000 },
      { id: 'b', descripcion: 'B', saldo: 1_000_000, tasaEA: 0.20, cuota: 100_000 },
    ];
    const r = compararEstrategias(deudas, 50_000);
    expect(r.mejor).toBe('empate');
    expect(r.ahorroIntereses).toBe(0);
  });

  it('una sola deuda: ambas estrategias dan idéntico resultado', () => {
    const deudas = [{ id: 'd1', descripcion: 'X', saldo: 1_000_000, tasaEA: 0.25, cuota: 100_000 }];
    const r = compararEstrategias(deudas, 0);
    expect(r.avalancha.meses).toBe(r.bolaNieve.meses);
    expect(r.avalancha.interesesTotales).toBeCloseTo(r.bolaNieve.interesesTotales, 2);
  });
});

// ── nivelAlertaMora() (G.3.F5) ─────────────────────────────────────

describe('nivelAlertaMora()', () => {
  it('retorna null cuando el array esta vacio', () => {
    expect(nivelAlertaMora([])).toBeNull();
  });

  it('retorna "high" cuando al menos uno tiene diasRestantes <= 3', () => {
    expect(nivelAlertaMora([{ diasRestantes: 0 }])).toBe('high');
    expect(nivelAlertaMora([{ diasRestantes: 1 }])).toBe('high');
    expect(nivelAlertaMora([{ diasRestantes: 3 }])).toBe('high');
  });

  it('retorna "high" aunque haya mezcla de urgente y no urgente', () => {
    const proximos = [{ diasRestantes: 2 }, { diasRestantes: 5 }];
    expect(nivelAlertaMora(proximos)).toBe('high');
  });

  it('retorna "medium" cuando todos tienen diasRestantes entre 4 y 5', () => {
    expect(nivelAlertaMora([{ diasRestantes: 4 }])).toBe('medium');
    expect(nivelAlertaMora([{ diasRestantes: 5 }])).toBe('medium');
    expect(nivelAlertaMora([{ diasRestantes: 4 }, { diasRestantes: 5 }])).toBe('medium');
  });

  it('el umbral 3 es high y 4 es medium', () => {
    expect(nivelAlertaMora([{ diasRestantes: 3 }])).toBe('high');
    expect(nivelAlertaMora([{ diasRestantes: 4 }])).toBe('medium');
  });
});

// ── detectarFijosSinPagarEsteMes ──────────────────────────────────

describe('detectarFijosSinPagarEsteMes', () => {
  const fijo = (overrides = {}) => ({
    id: 'c1', descripcion: 'Arriendo', monto: 1_500_000,
    tipo: 'fijo', activo: true, diaPago: 1, frecuencia: 'Mensual',
    ...overrides,
  });

  it('devuelve [] con lista vacia', () => {
    expect(detectarFijosSinPagarEsteMes([], '2026-05-15')).toEqual([]);
  });

  it('devuelve [] si hoyISO es invalido', () => {
    expect(detectarFijosSinPagarEsteMes([fijo()], 'no-date')).toEqual([]);
    expect(detectarFijosSinPagarEsteMes([fijo()], null)).toEqual([]);
  });

  it('detecta fijo cuyo dia de pago ya paso', () => {
    // diaPago=5, hoy=15 → diasAtraso=10
    const result = detectarFijosSinPagarEsteMes([fijo({ diaPago: 5 })], '2026-05-15');
    expect(result).toHaveLength(1);
    expect(result[0].diasAtraso).toBe(10);
    expect(result[0].severidad).toBe('moderada');
  });

  it('no incluye fijo cuyo dia de pago aun no llego', () => {
    // diaPago=20, hoy=15 → diasAtraso=-5, no incluye
    const result = detectarFijosSinPagarEsteMes([fijo({ diaPago: 20 })], '2026-05-15');
    expect(result).toHaveLength(0);
  });

  it('detecta fijo con diaPago igual a hoy (diasAtraso=0)', () => {
    const result = detectarFijosSinPagarEsteMes([fijo({ diaPago: 15 })], '2026-05-15');
    expect(result).toHaveLength(1);
    expect(result[0].diasAtraso).toBe(0);
    expect(result[0].severidad).toBe('leve');
  });

  it('asigna severidad correctamente', () => {
    const hoy = '2026-05-20';
    // diasAtraso=1 → leve, 8 → moderada, 15 → urgente
    const r1 = detectarFijosSinPagarEsteMes([fijo({ diaPago: 19 })], hoy);
    const r2 = detectarFijosSinPagarEsteMes([fijo({ diaPago: 12 })], hoy);
    const r3 = detectarFijosSinPagarEsteMes([fijo({ diaPago: 5  })], hoy);
    expect(r1[0].severidad).toBe('leve');
    expect(r2[0].severidad).toBe('moderada');
    expect(r3[0].severidad).toBe('urgente');
  });

  it('ignora compromisos inactivos', () => {
    const result = detectarFijosSinPagarEsteMes(
      [fijo({ activo: false, diaPago: 1 })], '2026-05-15'
    );
    expect(result).toHaveLength(0);
  });

  it('ignora compromisos que no son fijo', () => {
    const result = detectarFijosSinPagarEsteMes(
      [fijo({ tipo: 'deuda', diaPago: 1 }), fijo({ tipo: 'agenda', diaPago: 1 })],
      '2026-05-15'
    );
    expect(result).toHaveLength(0);
  });

  it('ordena por mayor atraso primero', () => {
    const compromisos = [
      fijo({ id: 'c1', descripcion: 'A', diaPago: 10 }),  // diasAtraso=5
      fijo({ id: 'c2', descripcion: 'B', diaPago: 1  }),  // diasAtraso=14
      fijo({ id: 'c3', descripcion: 'C', diaPago: 14 }),  // diasAtraso=1
    ];
    const result = detectarFijosSinPagarEsteMes(compromisos, '2026-05-15');
    expect(result[0].id).toBe('c2'); // mayor atraso primero
    expect(result[2].id).toBe('c3'); // menor atraso ultimo
  });

  it('respeta umbralDiasAtraso', () => {
    // diaPago=13, hoy=15 → diasAtraso=2. Con umbral=3, no incluye.
    const result = detectarFijosSinPagarEsteMes(
      [fijo({ diaPago: 13 })], '2026-05-15', { umbralDiasAtraso: 3 }
    );
    expect(result).toHaveLength(0);
  });

  it('no marca como vencido un fijo recién creado este mes después de su día de pago', () => {
    // Creado el 26 mayo con diaPago=15. Hoy 26. NO debe contar.
    const result = detectarFijosSinPagarEsteMes(
      [fijo({ diaPago: 15, fechaCreacion: '2026-05-26T10:00:00.000Z' })],
      '2026-05-26'
    );
    expect(result).toHaveLength(0);
  });
});

// ── detectarDeudasDurmiendo ───────────────────────────────────────

describe('detectarDeudasDurmiendo', () => {
  const deuda = (overrides = {}) => ({
    id: 'd1', descripcion: 'Credito banco', monto: 500_000,
    tipo: 'deuda', activo: true, diaPago: 5, frecuencia: 'Mensual',
    saldoPendiente: 2_000_000,
    fechaCreacion: '2024-01-01T00:00:00.000Z', // hace mucho
    ...overrides,
  });

  it('devuelve [] con lista vacia', () => {
    expect(detectarDeudasDurmiendo([], '2026-05-19')).toEqual([]);
  });

  it('devuelve [] si hoyISO es invalido', () => {
    expect(detectarDeudasDurmiendo([deuda()], 'no-date')).toEqual([]);
    expect(detectarDeudasDurmiendo([deuda()], null)).toEqual([]);
  });

  it('detecta deuda antigua con saldo pendiente', () => {
    // fechaCreacion hace 28 meses → durmiendo
    const result = detectarDeudasDurmiendo([deuda()], '2026-05-19');
    expect(result).toHaveLength(1);
    expect(result[0].severidad).toBe('alta'); // >6 meses
    expect(result[0].saldoPendiente).toBe(2_000_000);
  });

  it('no incluye deuda reciente (< umbral meses)', () => {
    // fechaCreacion hace 1 mes → no durmiendo (umbral=2)
    const result = detectarDeudasDurmiendo(
      [deuda({ fechaCreacion: '2026-04-20T00:00:00.000Z' })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('no incluye deuda sin saldoPendiente', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ saldoPendiente: 0 })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('no incluye deuda inactiva', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ activo: false })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('ignora compromisos que no son deuda', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ tipo: 'fijo' }), deuda({ tipo: 'agenda' })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('asigna severidad correctamente segun meses', () => {
    const hoy = '2026-05-19';
    // 2 meses → baja, 4 meses → media, 8 meses → alta
    const d1 = deuda({ id: 'd1', fechaCreacion: '2026-03-01T00:00:00.000Z' });
    const d2 = deuda({ id: 'd2', fechaCreacion: '2026-01-01T00:00:00.000Z' });
    const d3 = deuda({ id: 'd3', fechaCreacion: '2025-09-01T00:00:00.000Z' });
    const r1 = detectarDeudasDurmiendo([d1], hoy);
    const r2 = detectarDeudasDurmiendo([d2], hoy);
    const r3 = detectarDeudasDurmiendo([d3], hoy);
    expect(r1[0].severidad).toBe('baja');
    expect(r2[0].severidad).toBe('media');
    expect(r3[0].severidad).toBe('alta');
  });

  it('sugerencia "liquidar" cuando saldo <= cuota', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ saldoPendiente: 400_000, monto: 500_000 })], '2026-05-19'
    );
    expect(result[0].sugerencia).toBe('liquidar');
  });

  it('sugerencia "retomar" cuando saldo > cuota', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ saldoPendiente: 2_000_000, monto: 500_000 })], '2026-05-19'
    );
    expect(result[0].sugerencia).toBe('retomar');
  });

  it('ordena alta → media → baja, y por mayor saldo dentro del nivel', () => {
    const hoy = '2026-05-19';
    const compromisos = [
      deuda({ id: 'd1', saldoPendiente: 1_000_000, fechaCreacion: '2026-03-01T00:00:00.000Z' }), // baja
      deuda({ id: 'd2', saldoPendiente: 3_000_000, fechaCreacion: '2025-09-01T00:00:00.000Z' }), // alta
      deuda({ id: 'd3', saldoPendiente: 2_000_000, fechaCreacion: '2025-09-01T00:00:00.000Z' }), // alta
    ];
    const result = detectarDeudasDurmiendo(compromisos, hoy);
    expect(result[0].id).toBe('d2'); // alta + mayor saldo
    expect(result[1].id).toBe('d3'); // alta + menor saldo
    expect(result[2].id).toBe('d1'); // baja
  });

  it('respeta mesesUmbral custom', () => {
    // fechaCreacion hace 3 meses. Con umbral=4, no incluye.
    const result = detectarDeudasDurmiendo(
      [deuda({ fechaCreacion: '2026-02-01T00:00:00.000Z' })],
      '2026-05-19',
      { mesesUmbral: 4 }
    );
    expect(result).toHaveLength(0);
  });
});

// ── detectarVencidosCompletos ─────────────────────────────────────

describe('detectarVencidosCompletos', () => {
  const comp = (overrides = {}) => ({
    id: 'c1', descripcion: 'Arriendo', monto: 1_500_000,
    tipo: 'fijo', activo: true, diaPago: 5, frecuencia: 'Mensual',
    ...overrides,
  });

  it('devuelve [] con lista vacia', () => {
    expect(detectarVencidosCompletos([], '2026-05-15')).toEqual([]);
  });

  it('devuelve [] si hoyISO es invalido', () => {
    expect(detectarVencidosCompletos([comp()], 'no-date')).toEqual([]);
    expect(detectarVencidosCompletos([comp()], null)).toEqual([]);
  });

  it('detecta los tres tipos vencidos: fijo, deuda y agenda', () => {
    const result = detectarVencidosCompletos([
      comp({ id: 'a', tipo: 'fijo',   diaPago: 1 }),
      comp({ id: 'b', tipo: 'deuda',  diaPago: 1 }),
      comp({ id: 'c', tipo: 'agenda', diaPago: 1 }),
    ], '2026-05-15');
    expect(result).toHaveLength(3);
    expect(result.map(r => r.tipo).sort()).toEqual(['agenda', 'deuda', 'fijo']);
  });

  it('expone el tipo en cada item para el render', () => {
    const result = detectarVencidosCompletos(
      [comp({ tipo: 'deuda', diaPago: 2 })], '2026-05-15'
    );
    expect(result[0].tipo).toBe('deuda');
  });

  it('no incluye compromisos cuyo dia de pago aun no llego', () => {
    // diaPago=20, hoy=15 → diasAtraso=-5
    expect(detectarVencidosCompletos(
      [comp({ diaPago: 20 })], '2026-05-15'
    )).toHaveLength(0);
  });

  it('ignora compromisos inactivos sin importar el tipo', () => {
    const result = detectarVencidosCompletos([
      comp({ activo: false, tipo: 'fijo',  diaPago: 1 }),
      comp({ activo: false, tipo: 'deuda', diaPago: 1 }),
    ], '2026-05-15');
    expect(result).toHaveLength(0);
  });

  it('asigna severidad: leve (<=3), moderada (4-10), urgente (>10)', () => {
    const hoy = '2026-05-20';
    const r1 = detectarVencidosCompletos([comp({ diaPago: 18 })], hoy); // 2 → leve
    const r2 = detectarVencidosCompletos([comp({ diaPago: 12 })], hoy); // 8 → moderada
    const r3 = detectarVencidosCompletos([comp({ diaPago: 3  })], hoy); // 17 → urgente
    expect(r1[0].severidad).toBe('leve');
    expect(r2[0].severidad).toBe('moderada');
    expect(r3[0].severidad).toBe('urgente');
  });

  it('ordena por mayor atraso primero', () => {
    const result = detectarVencidosCompletos([
      comp({ id: 'a', diaPago: 10 }), // 5 días
      comp({ id: 'b', diaPago: 1  }), // 14 días
      comp({ id: 'c', diaPago: 14 }), // 1 día
    ], '2026-05-15');
    expect(result.map(r => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('respeta umbralDiasAtraso', () => {
    // diaPago=13, hoy=15 → 2 días. Con umbral=3, no incluye.
    expect(detectarVencidosCompletos(
      [comp({ diaPago: 13 })], '2026-05-15', { umbralDiasAtraso: 3 }
    )).toHaveLength(0);
  });

  it('no marca como vencido un compromiso recién creado este mes después del día de pago', () => {
    // Creado el 26 de mayo con diaPago=15. Hoy es 26. NO debe contar como mora:
    // el ciclo del 15 de mayo no le aplicaba (el compromiso aún no existía).
    const result = detectarVencidosCompletos(
      [comp({ diaPago: 15, fechaCreacion: '2026-05-26T10:00:00.000Z' })],
      '2026-05-26'
    );
    expect(result).toHaveLength(0);
  });

  it('sí marca como vencido si fechaCreacion es de un mes anterior', () => {
    // Creado en abril, hoy 26 mayo, diaPago=15 → debe contar como vencido.
    const result = detectarVencidosCompletos(
      [comp({ diaPago: 15, fechaCreacion: '2026-04-10T10:00:00.000Z' })],
      '2026-05-26'
    );
    expect(result).toHaveLength(1);
    expect(result[0].diasAtraso).toBe(11);
  });

  it('sí marca como vencido si fechaCreacion es del mismo mes pero anterior al día de pago', () => {
    // Creado el 5 de mayo con diaPago=15. Hoy 26 → vencido (lleva 11 días).
    const result = detectarVencidosCompletos(
      [comp({ diaPago: 15, fechaCreacion: '2026-05-05T10:00:00.000Z' })],
      '2026-05-26'
    );
    expect(result).toHaveLength(1);
    expect(result[0].diasAtraso).toBe(11);
  });

  it('mantiene el comportamiento legacy cuando el compromiso no tiene fechaCreacion', () => {
    // Compromisos creados antes de que el campo existiera (o importados) siguen
    // funcionando: si diaPago ya pasó, se marca vencido.
    const result = detectarVencidosCompletos(
      [{ id: 'x', descripcion: 'Legacy', monto: 100, tipo: 'fijo',
         activo: true, diaPago: 5, frecuencia: 'Mensual' }],
      '2026-05-26'
    );
    expect(result).toHaveLength(1);
  });
});

// ── agruparPorDiasRestantes ───────────────────────────────────────

describe('agruparPorDiasRestantes', () => {
  it('devuelve [] con lista vacia', () => {
    expect(agruparPorDiasRestantes([])).toEqual([]);
    expect(agruparPorDiasRestantes(null)).toEqual([]);
  });

  it('agrupa por dia y etiqueta: Hoy / Mañana / En N días', () => {
    const result = agruparPorDiasRestantes([
      { id: 'a', diasRestantes: 0 },
      { id: 'b', diasRestantes: 1 },
      { id: 'c', diasRestantes: 3 },
    ]);
    expect(result.map(g => g.label)).toEqual(['Hoy', 'Mañana', 'En 3 días']);
  });

  it('fusiona items del mismo dia en un solo grupo', () => {
    const result = agruparPorDiasRestantes([
      { id: 'a', diasRestantes: 0 },
      { id: 'b', diasRestantes: 0 },
      { id: 'c', diasRestantes: 2 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].items).toHaveLength(2);
    expect(result[1].items).toHaveLength(1);
  });

  it('ordena los grupos por dias ascendente', () => {
    const result = agruparPorDiasRestantes([
      { diasRestantes: 5 },
      { diasRestantes: 1 },
      { diasRestantes: 0 },
    ]);
    expect(result.map(g => g.dias)).toEqual([0, 1, 5]);
  });

  it('descarta items con diasRestantes no entero o negativo', () => {
    const result = agruparPorDiasRestantes([
      { diasRestantes: 0 },
      { diasRestantes: -1 },
      { diasRestantes: 1.5 },
      { diasRestantes: 'foo' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(1);
  });
});
