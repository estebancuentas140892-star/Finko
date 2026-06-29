import { describe, it, expect, beforeEach } from 'vitest';
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
  simularPagoDeuda,
  simularEstrategiaPago,
  simularRenegociacion,
  compararEstrategias,
  recomendarEstrategia,
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  aplicarAbonoASaldo,
  revertirAbonoDeSaldo,
  ajustarMontoAbono,
  validarAbono,
  deltasSaldoCompromisoPorEdicionGasto,
  detectarDeudaCreciente,
  calcularAbonosDelMes,
  estadoPagoMes,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../../modules/dominio/compromisos/logic.js';
import { renderFormAbono, renderFormDeuda } from '../../modules/dominio/compromisos/views/formularios.js';
import { renderListaCompromisos } from '../../modules/dominio/compromisos/views/lista.js';
import { renderResumenExtra, renderImpactoAvalancha, renderComparativaRenegociacion } from '../../modules/dominio/compromisos/views/estrategia-impacto.js';
import { renderEstrategiaPago, setEstrategiaUI } from '../../modules/dominio/compromisos/views/estrategia.js';
import { S } from '../../modules/core/state.js';
import { CATEGORIAS_AGENDA, CATEGORIA_AGENDA_EMOJI, CATEGORIAS_DEUDA, CATEGORIA_DEUDA_EMOJI } from '../../modules/core/constants.js';

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
  it('TIPOS_COMPROMISO tiene fijo + dos tipos de deuda (v6)', () => {
    expect(TIPOS_COMPROMISO).toEqual(
      expect.arrayContaining(['fijo', 'deuda-entidad', 'deuda-personal']),
    );
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

// ── CATEGORIAS_AGENDA / CATEGORIA_AGENDA_EMOJI (MC.9-Agenda) ──────

describe('CATEGORIAS_AGENDA', () => {
  it('contiene 13 categorías predefinidas', () => {
    expect(CATEGORIAS_AGENDA).toHaveLength(13);
  });

  it('todas son strings no vacíos', () => {
    for (const c of CATEGORIAS_AGENDA) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});

describe('CATEGORIA_AGENDA_EMOJI', () => {
  it('tiene un emoji para cada categoría de CATEGORIAS_AGENDA', () => {
    for (const c of CATEGORIAS_AGENDA) {
      expect(CATEGORIA_AGENDA_EMOJI[c]).toBeTruthy();
      expect(typeof CATEGORIA_AGENDA_EMOJI[c]).toBe('string');
    }
  });

  it('no tiene entradas huérfanas fuera del catálogo', () => {
    for (const key of Object.keys(CATEGORIA_AGENDA_EMOJI)) {
      expect(CATEGORIAS_AGENDA).toContain(key);
    }
  });
});

// ── CATEGORIAS_DEUDA / CATEGORIA_DEUDA_EMOJI ──────────────────────

describe('CATEGORIAS_DEUDA', () => {
  it('contiene 12 tipos de obligación predefinidos', () => {
    expect(CATEGORIAS_DEUDA).toHaveLength(12);
  });

  it('todas son strings no vacíos', () => {
    for (const c of CATEGORIAS_DEUDA) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});

describe('CATEGORIA_DEUDA_EMOJI', () => {
  it('tiene un emoji para cada categoría de CATEGORIAS_DEUDA', () => {
    for (const c of CATEGORIAS_DEUDA) {
      expect(CATEGORIA_DEUDA_EMOJI[c]).toBeTruthy();
      expect(typeof CATEGORIA_DEUDA_EMOJI[c]).toBe('string');
    }
  });

  it('no tiene entradas huérfanas fuera del catálogo', () => {
    for (const key of Object.keys(CATEGORIA_DEUDA_EMOJI)) {
      expect(CATEGORIAS_DEUDA).toContain(key);
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

  it('acepta los tres tipos válidos (v6)', () => {
    // fijo: solo monto requerido
    expect(validarCompromiso({ ...datosFormValidos, tipo: 'fijo' })).toEqual([]);
    // deuda-entidad: requiere saldoTotal + cuotaMensual + tasa
    expect(validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '5000000', cuotaMensual: '300000', tasa: '28', tasaUnidad: 'EA',
    })).toEqual([]);
    // deuda-personal: tasa opcional
    expect(validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '1000000', cuotaMensual: '100000',
    })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCompromiso({ descripcion: '', monto: '0', frecuencia: '', diaPago: '0', tipo: '' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });

  it('categoria es opcional para tipo=fijo: sin categoria no hay error', () => {
    expect(validarCompromiso({ ...datosFormValidos, tipo: 'fijo' })).toEqual([]);
  });

  it('acepta cualquier categoría del catálogo de Agenda para tipo=fijo', () => {
    for (const cat of CATEGORIAS_AGENDA) {
      expect(validarCompromiso({ ...datosFormValidos, tipo: 'fijo', categoria: cat })).toEqual([]);
    }
  });

  it('reporta error si la categoría no está en el catálogo de Agenda', () => {
    const errores = validarCompromiso({ ...datosFormValidos, tipo: 'fijo', categoria: 'Inventada' });
    expect(errores[0]).toMatch(/categor/i);
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

  it('para tipo=deuda-entidad incluye saldoTotal, cuotaMensual, tasa EA decimal y tasaUnidad=EA', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '5000000', cuotaMensual: '300000', tasa: '28', tasaUnidad: 'EA',
    };
    const result = normalizarCompromiso(datos);
    expect(result.tipo).toBe('deuda-entidad');
    expect(result.saldoTotal).toBe(5_000_000);
    expect(result.cuotaMensual).toBe(300_000);
    expect(result.tasa).toBeCloseTo(0.28);
    expect(result.tasaUnidad).toBe('EA');
    expect(result).not.toHaveProperty('monto');
    expect(result).not.toHaveProperty('saldoPendiente');
    expect(result).not.toHaveProperty('tasaEA');
  });

  it('para tipo=deuda-personal con tasa mensual incluye tasaUnidad=mensual', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '1000000', cuotaMensual: '120000', tasa: '10', tasaUnidad: 'mensual',
    };
    const result = normalizarCompromiso(datos);
    expect(result.tipo).toBe('deuda-personal');
    expect(result.saldoTotal).toBe(1_000_000);
    expect(result.cuotaMensual).toBe(120_000);
    expect(result.tasa).toBeCloseTo(0.10);
    expect(result.tasaUnidad).toBe('mensual');
  });

  it('para tipo=deuda-personal sin tasa, queda tasa=0 y tasaUnidad="mensual"', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000',
    };
    const result = normalizarCompromiso(datos);
    expect(result.tasa).toBe(0);
    expect(result.tasaUnidad).toBe('mensual');
  });

  it('para tipo=deuda-entidad sin tasa, queda tasa=null (desconocida) y tasaUnidad="EA"', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '5000000', cuotaMensual: '300000', tasa: '', tasaUnidad: 'EA',
    };
    const result = normalizarCompromiso(datos);
    expect(result.tasa).toBeNull();
    expect(result.tasaUnidad).toBe('EA');
  });

  it('para tipo=fijo no agrega campos de deuda aunque vengan en el form', () => {
    const datos = {
      ...datosFormValidos, tipo: 'fijo',
      saldoTotal: '999999', cuotaMensual: '99999', tasa: '10', tasaUnidad: 'EA',
    };
    const result = normalizarCompromiso(datos);
    expect(result.monto).toBe(89_000);
    expect(result).not.toHaveProperty('saldoTotal');
    expect(result).not.toHaveProperty('cuotaMensual');
    expect(result).not.toHaveProperty('tasa');
    expect(result).not.toHaveProperty('tasaUnidad');
  });

  it('para tipo=fijo guarda la categoría válida', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, tipo: 'fijo', categoria: 'Internet' });
    expect(result.categoria).toBe('Internet');
  });

  it('para tipo=fijo sin categoría, queda categoria=null', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, tipo: 'fijo' });
    expect(result.categoria).toBeNull();
  });

  it('para tipo=fijo con categoría inválida, queda categoria=null', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, tipo: 'fijo', categoria: 'Inventada' });
    expect(result.categoria).toBeNull();
  });

  it('para deudas guarda la categoría válida del catálogo de obligación', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Gota a gota',
    };
    expect(normalizarCompromiso(datos).categoria).toBe('Gota a gota');
  });

  it('para deudas sin categoría, queda categoria=null', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '5000000', cuotaMensual: '300000',
    };
    expect(normalizarCompromiso(datos).categoria).toBeNull();
  });

  it('para deudas, una categoría del catálogo de Agenda (fijo) no es válida', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Internet',
    };
    expect(normalizarCompromiso(datos).categoria).toBeNull();
  });
});

// ── validarCompromiso() - reglas de deuda ─────────────────────────

describe('validarCompromiso() - reglas de deuda (v6)', () => {
  const datosEntidad = {
    ...datosFormValidos, tipo: 'deuda-entidad',
    saldoTotal: '5000000', cuotaMensual: '300000', tasa: '28', tasaUnidad: 'EA',
  };
  const datosPersonal = {
    ...datosFormValidos, tipo: 'deuda-personal',
    saldoTotal: '1000000', cuotaMensual: '100000',
  };

  it('deuda-entidad válida no produce errores', () => {
    expect(validarCompromiso(datosEntidad)).toEqual([]);
  });

  it('deuda-personal sin tasa es válida (tasa opcional)', () => {
    expect(validarCompromiso(datosPersonal)).toEqual([]);
  });

  it('deuda-personal con tasa mensual válida no produce errores', () => {
    const datos = { ...datosPersonal, tasa: '10', tasaUnidad: 'mensual' };
    expect(validarCompromiso(datos)).toEqual([]);
  });

  it('deuda-entidad sin tasa es válida (tasa opcional)', () => {
    const datos = { ...datosEntidad, tasa: '' };
    expect(validarCompromiso(datos)).toEqual([]);
  });

  it('deuda-entidad con tasa negativa: error', () => {
    const datos = { ...datosEntidad, tasa: '-5' };
    const errores = validarCompromiso(datos);
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('reporta error si saldoTotal es 0 o menor', () => {
    const errores = validarCompromiso({ ...datosEntidad, saldoTotal: '0' });
    expect(errores.some(e => /saldo/i.test(e))).toBe(true);
  });

  it('reporta error si cuotaMensual es 0 o menor', () => {
    const errores = validarCompromiso({ ...datosEntidad, cuotaMensual: '0' });
    expect(errores.some(e => /cuota/i.test(e))).toBe(true);
  });

  it('reporta error si tasa EA supera 200%', () => {
    const errores = validarCompromiso({ ...datosEntidad, tasa: '250' });
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('reporta error si tasa mensual supera 100%', () => {
    const datos = { ...datosPersonal, tasa: '150', tasaUnidad: 'mensual' };
    const errores = validarCompromiso(datos);
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('NO valida campos de deuda para tipo=fijo aunque vengan negativos', () => {
    const datos = {
      ...datosFormValidos, tipo: 'fijo',
      saldoTotal: '-9999', cuotaMensual: '-100', tasa: '-1',
    };
    expect(validarCompromiso(datos)).toEqual([]);
  });

  it('categoria es opcional para deudas: sin categoria no hay error', () => {
    expect(validarCompromiso(datosEntidad)).toEqual([]);
  });

  it('acepta cualquier categoría del catálogo de obligación para deuda-entidad y deuda-personal', () => {
    for (const cat of CATEGORIAS_DEUDA) {
      expect(validarCompromiso({ ...datosEntidad, categoria: cat })).toEqual([]);
      expect(validarCompromiso({ ...datosPersonal, categoria: cat })).toEqual([]);
    }
  });

  it('reporta error si la categoría no está en el catálogo de obligación', () => {
    const errores = validarCompromiso({ ...datosEntidad, categoria: 'Inventada' });
    expect(errores.some(e => /categor/i.test(e))).toBe(true);
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
  id:           'd1',
  descripcion:  'Tarjeta Visa',
  frecuencia:   'Mensual',
  diaPago:      15,
  tipo:         'deuda-entidad',
  activo:       true,
  saldoTotal:   1_000_000,
  cuotaMensual: 200_000,
  tasa:         0.30,
  tasaUnidad:   'EA',
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

  it('excluye deudas sin saldoTotal o saldo<=0', () => {
    const sinSaldo = deudaBase({ id: 'd1', saldoTotal: undefined });
    const cero     = deudaBase({ id: 'd2', saldoTotal: 0 });
    expect(filtrarDeudasPagables([sinSaldo, cero])).toHaveLength(0);
  });

  it('incluye deudas sin tasa (tasa=0 = sin interés)', () => {
    const sinTasa = deudaBase({ tasa: undefined });
    // tasaEADe() devuelve 0 para tasa undefined → sigue siendo una deuda pagable.
    expect(filtrarDeudasPagables([sinTasa])).toHaveLength(1);
    expect(filtrarDeudasPagables([sinTasa])[0].tasaEA).toBe(0);
  });

  it('incluye deudas con tasa=null (desconocida): simula con tasaEA 0', () => {
    const tasaNull = deudaBase({ tasa: null });
    expect(filtrarDeudasPagables([tasaNull])).toHaveLength(1);
    expect(filtrarDeudasPagables([tasaNull])[0].tasaEA).toBe(0);
  });

  it('marca tasaDesconocida=true para deuda-entidad con tasa null', () => {
    const tasaNull = deudaBase({ tasa: null });
    expect(filtrarDeudasPagables([tasaNull])[0].tasaDesconocida).toBe(true);
  });

  it('tasaDesconocida=false cuando la entidad tiene tasa registrada', () => {
    expect(filtrarDeudasPagables([deudaBase()])[0].tasaDesconocida).toBe(false);
  });

  it('tasaDesconocida=false para deuda-personal sin tasa (0 = sin interés real)', () => {
    const personal = deudaBase({ tipo: 'deuda-personal', tasa: 0, tasaUnidad: 'mensual' });
    expect(filtrarDeudasPagables([personal])[0].tasaDesconocida).toBe(false);
  });

  it('mapea al shape esperado', () => {
    const deuda = deudaBase();
    const [d] = filtrarDeudasPagables([deuda]);
    expect(d).toEqual({
      id:              'd1',
      descripcion:     'Tarjeta Visa',
      tipo:            'deuda-entidad',
      saldo:           1_000_000,
      tasaEA:          0.30,
      cuota:           200_000,
      tasaUnidad:      'EA',
      tasaDesconocida: false,
    });
  });

  it('convierte tasa mensual a EA para deuda-personal', () => {
    const gota = deudaBase({
      id: 'g1', tipo: 'deuda-personal', tasa: 0.10, tasaUnidad: 'mensual',
    });
    const [d] = filtrarDeudasPagables([gota]);
    // 10% mensual → EA ≈ 213.84%
    expect(d.tasaEA).toBeCloseTo(Math.pow(1.10, 12) - 1, 6);
  });

  it('tasa=0 (sin interés) es válida', () => {
    const sinInteres = deudaBase({ tasa: 0 });
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

// ── recomendarEstrategia() basada en simulación ────────────────────

describe('recomendarEstrategia', () => {
  // Helper: deuda pagable (shape de filtrarDeudasPagables).
  const dp = (o = {}) => ({
    id: 'd', descripcion: 'Deuda', saldo: 1_000_000, tasaEA: 0.20, cuota: 100_000, ...o,
  });
  // 10% mensual expresado como EA exacta (para reproducir el caso del usuario).
  const EA_10_MENSUAL = Math.pow(1.10, 12) - 1;

  it('una sola deuda no genera recomendación', () => {
    const r = recomendarEstrategia([dp()]);
    expect(r.estrategia).toBeNull();
    expect(r.razon).toBe('');
    expect(r.viable).toBe(true);
  });

  it('lista vacia o input invalido devuelve null y viable', () => {
    expect(recomendarEstrategia([]).estrategia).toBeNull();
    expect(recomendarEstrategia(null).estrategia).toBeNull();
    expect(recomendarEstrategia(undefined).viable).toBe(true);
  });

  it('ambas completan y todas sin interés: Bola de nieve', () => {
    const r = recomendarEstrategia([
      dp({ id: 'a', tasaEA: 0, saldo: 1_000_000, cuota: 100_000 }),
      dp({ id: 'b', tasaEA: 0, saldo: 500_000,   cuota: 100_000 }),
    ]);
    expect(r.estrategia).toBe('bolaNieve');
    expect(r.viable).toBe(true);
    expect(r.razon).toMatch(/no cobran inter[eé]s(es)?/i);
  });

  it('ambas completan y avalancha ahorra de forma material: Avalancha', () => {
    const r = recomendarEstrategia([
      dp({ id: 'cara',   tasaEA: 0.40, saldo: 5_000_000, cuota: 200_000 }),
      dp({ id: 'barata', tasaEA: 0.05, saldo: 500_000,   cuota: 50_000 }),
    ], 100_000);
    expect(r.estrategia).toBe('avalancha');
    expect(r.viable).toBe(true);
    expect(r.ahorroIntereses).toBeGreaterThan(0);
  });

  it('ambas completan con tasas iguales (empate): Bola de nieve', () => {
    const r = recomendarEstrategia([
      dp({ id: 'a', tasaEA: 0.10, saldo: 1_000_000, cuota: 100_000 }),
      dp({ id: 'b', tasaEA: 0.10, saldo: 1_000_000, cuota: 100_000 }),
    ], 50_000);
    expect(r.estrategia).toBe('bolaNieve');
    expect(r.viable).toBe(true);
  });

  // Escenario reportado por el usuario: deuda al 10% mensual con cuota que no
  // cubre el interés + deuda sin interés. Ningún orden cierra el plan.
  it('plan inviable: no recomienda estrategia, devuelve diagnóstico', () => {
    const r = recomendarEstrategia([
      dp({ id: 'interes', descripcion: 'Crédito caro', saldo: 200_000, tasaEA: EA_10_MENSUAL, cuota: 10_000 }),
      dp({ id: 'cero',    descripcion: 'Préstamo',     saldo: 200_000, tasaEA: 0,             cuota: 20_000 }),
    ], 0);
    expect(r.viable).toBe(false);
    expect(r.estrategia).toBeNull();
    expect(r.diagnostico).not.toBeNull();
  });

  it('plan inviable: señala la deuda creciente (cuota < interés)', () => {
    const r = recomendarEstrategia([
      dp({ id: 'interes', descripcion: 'Crédito caro', saldo: 200_000, tasaEA: EA_10_MENSUAL, cuota: 10_000 }),
      dp({ id: 'cero',    descripcion: 'Préstamo',     saldo: 200_000, tasaEA: 0,             cuota: 20_000 }),
    ], 0);
    const ids = r.diagnostico.deudasCrecientes.map(d => d.id);
    expect(ids).toContain('interes');
    expect(ids).not.toContain('cero');
    const creciente = r.diagnostico.deudasCrecientes.find(d => d.id === 'interes');
    expect(creciente.deficitMensual).toBeCloseTo(10_000, 0); // 20k interés - 10k cuota
  });

  it('plan inviable: extraMinimo vuelve viable el plan y es mínimo en la grilla', () => {
    const deudas = [
      dp({ id: 'interes', saldo: 200_000, tasaEA: EA_10_MENSUAL, cuota: 10_000 }),
      dp({ id: 'cero',    saldo: 200_000, tasaEA: 0,             cuota: 20_000 }),
    ];
    const r = recomendarEstrategia(deudas, 0);
    const extra = r.diagnostico.extraMinimo;
    expect(extra).toBeGreaterThan(0);
    // Con el extra mínimo, el plan completa.
    expect(simularEstrategiaPago(deudas, extra, 'avalancha').completo).toBe(true);
    // Un escalón menos (10.000) ya no completa: confirma minimalidad en la grilla.
    if (extra >= 10_000) {
      expect(simularEstrategiaPago(deudas, extra - 10_000, 'avalancha').completo).toBe(false);
    }
  });

  it('un extra suficiente convierte un plan inviable en viable', () => {
    const deudas = [
      dp({ id: 'interes', saldo: 200_000, tasaEA: EA_10_MENSUAL, cuota: 10_000 }),
      dp({ id: 'cero',    saldo: 200_000, tasaEA: 0,             cuota: 20_000 }),
    ];
    expect(recomendarEstrategia(deudas, 0).viable).toBe(false);
    const conExtra = recomendarEstrategia(deudas, 500_000);
    expect(conExtra.viable).toBe(true);
    expect(conExtra.estrategia).not.toBeNull();
  });

  it('solo avalancha cierra el plan: la recomienda', () => {
    // Deuda tóxica con saldo grande y tasa muy alta. Bola la deja al final
    // (ataca primero la de menor saldo) y la tóxica crece sin cerrar; Avalancha
    // la ataca primero y sí completa el plan.
    const deudas = [
      dp({ id: 'toxica',  descripcion: 'Gota a gota', saldo: 1_000_000, tasaEA: EA_10_MENSUAL, cuota: 10_000 }),
      dp({ id: 'benigna', descripcion: 'Sin interés', saldo: 900_000,   tasaEA: 0,             cuota: 20_000 }),
    ];
    const avalancha = simularEstrategiaPago(deudas, 100_000, 'avalancha');
    const bola      = simularEstrategiaPago(deudas, 100_000, 'bolaNieve');
    // Precondición del escenario: avalancha cierra, bola no.
    expect(avalancha.completo).toBe(true);
    expect(bola.completo).toBe(false);
    const r = recomendarEstrategia(deudas, 100_000);
    expect(r.estrategia).toBe('avalancha');
    expect(r.viable).toBe(true);
  });

  it('nunca recomienda una estrategia cuyo plan no cierra (invariante)', () => {
    // Si bola completa, avalancha también (avalancha es óptima en intereses):
    // por tanto el motor jamás devuelve estrategia con viable=false.
    const r = recomendarEstrategia([
      dp({ id: 'a', tasaEA: 0.30, saldo: 3_000_000, cuota: 50_000 }),
      dp({ id: 'b', tasaEA: 0.10, saldo: 1_000_000, cuota: 30_000 }),
    ], 0);
    if (r.estrategia !== null) expect(r.viable).toBe(true);
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
      [fijo({ tipo: 'deuda-entidad', diaPago: 1 }), fijo({ tipo: 'deuda-personal', diaPago: 1 })],
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
    id: 'd1', descripcion: 'Credito banco',
    tipo: 'deuda-entidad', activo: true, diaPago: 5, frecuencia: 'Mensual',
    saldoTotal: 2_000_000, cuotaMensual: 500_000, tasa: 0.28, tasaUnidad: 'EA',
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
    expect(result[0].saldoTotal).toBe(2_000_000);
  });

  it('no incluye deuda reciente (< umbral meses)', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ fechaCreacion: '2026-04-20T00:00:00.000Z' })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('no incluye deuda sin saldoTotal', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ saldoTotal: 0 })], '2026-05-19'
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
      [deuda({ tipo: 'fijo' })], '2026-05-19'
    );
    expect(result).toHaveLength(0);
  });

  it('incluye deuda-personal (no solo entidad)', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ tipo: 'deuda-personal' })], '2026-05-19'
    );
    expect(result).toHaveLength(1);
  });

  it('asigna severidad correctamente segun meses', () => {
    const hoy = '2026-05-19';
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
      [deuda({ saldoTotal: 400_000, cuotaMensual: 500_000 })], '2026-05-19'
    );
    expect(result[0].sugerencia).toBe('liquidar');
  });

  it('sugerencia "retomar" cuando saldo > cuota', () => {
    const result = detectarDeudasDurmiendo(
      [deuda({ saldoTotal: 2_000_000, cuotaMensual: 500_000 })], '2026-05-19'
    );
    expect(result[0].sugerencia).toBe('retomar');
  });

  it('ordena alta → media → baja, y por mayor saldo dentro del nivel', () => {
    const hoy = '2026-05-19';
    const compromisos = [
      deuda({ id: 'd1', saldoTotal: 1_000_000, fechaCreacion: '2026-03-01T00:00:00.000Z' }), // baja
      deuda({ id: 'd2', saldoTotal: 3_000_000, fechaCreacion: '2025-09-01T00:00:00.000Z' }), // alta
      deuda({ id: 'd3', saldoTotal: 2_000_000, fechaCreacion: '2025-09-01T00:00:00.000Z' }), // alta
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

  it('detecta los tres tipos vencidos: fijo, deuda-entidad y deuda-personal', () => {
    const result = detectarVencidosCompletos([
      comp({ id: 'a', tipo: 'fijo',           diaPago: 1 }),
      comp({ id: 'b', tipo: 'deuda-entidad',  diaPago: 1 }),
      comp({ id: 'c', tipo: 'deuda-personal', diaPago: 1 }),
    ], '2026-05-15');
    expect(result).toHaveLength(3);
    expect(result.map(r => r.tipo).sort()).toEqual(['deuda-entidad', 'deuda-personal', 'fijo']);
  });

  it('expone el tipo en cada item para el render', () => {
    const result = detectarVencidosCompletos(
      [comp({ tipo: 'deuda-entidad', diaPago: 2 })], '2026-05-15'
    );
    expect(result[0].tipo).toBe('deuda-entidad');
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

// ── aplicarAbonoASaldo() (ADR 002) ───────────────────────────────

describe('aplicarAbonoASaldo()', () => {
  it('resta el monto del saldo', () => {
    expect(aplicarAbonoASaldo(1_000_000, 200_000)).toBe(800_000);
  });

  it('monto > saldo: devuelve 0 (no negativo)', () => {
    expect(aplicarAbonoASaldo(100_000, 500_000)).toBe(0);
  });

  it('monto = saldo: devuelve 0 exacto', () => {
    expect(aplicarAbonoASaldo(500_000, 500_000)).toBe(0);
  });

  it('monto = 0: devuelve saldo intacto', () => {
    expect(aplicarAbonoASaldo(800_000, 0)).toBe(800_000);
  });

  it('saldo NaN: devuelve 0', () => {
    expect(aplicarAbonoASaldo(NaN, 100_000)).toBe(0);
    expect(aplicarAbonoASaldo(undefined, 100_000)).toBe(0);
  });

  it('monto NaN: devuelve 0 (resultado seguro, no propaga NaN)', () => {
    expect(aplicarAbonoASaldo(500_000, NaN)).toBe(0);
    expect(aplicarAbonoASaldo(500_000, undefined)).toBe(0);
  });
});

// ── revertirAbonoDeSaldo() ───────────────────────────────────────

describe('revertirAbonoDeSaldo()', () => {
  it('suma monto al saldo', () => {
    expect(revertirAbonoDeSaldo(300_000, 200_000)).toBe(500_000);
  });

  it('saldo 0: devuelve el monto restaurado', () => {
    expect(revertirAbonoDeSaldo(0, 500_000)).toBe(500_000);
  });

  it('saldo NaN: devuelve el monto', () => {
    expect(revertirAbonoDeSaldo(NaN, 200_000)).toBe(200_000);
    expect(revertirAbonoDeSaldo(undefined, 200_000)).toBe(200_000);
  });

  it('monto NaN: devuelve el saldo intacto', () => {
    expect(revertirAbonoDeSaldo(500_000, NaN)).toBe(500_000);
  });
});

// ── ajustarMontoAbono() ──────────────────────────────────────────

describe('ajustarMontoAbono()', () => {
  it('monto < saldo: monto pasa intacto, no salda', () => {
    expect(ajustarMontoAbono(200_000, 1_000_000))
      .toEqual({ montoAjustado: 200_000, saldaDeuda: false });
  });

  it('monto = saldo: monto pasa intacto, salda', () => {
    expect(ajustarMontoAbono(500_000, 500_000))
      .toEqual({ montoAjustado: 500_000, saldaDeuda: true });
  });

  it('monto > saldo: monto se capa al saldo, salda', () => {
    expect(ajustarMontoAbono(1_500_000, 500_000))
      .toEqual({ montoAjustado: 500_000, saldaDeuda: true });
  });

  it('monto = 0: monto ajustado 0, no salda', () => {
    expect(ajustarMontoAbono(0, 500_000))
      .toEqual({ montoAjustado: 0, saldaDeuda: false });
  });

  it('monto negativo: monto ajustado 0, no salda', () => {
    expect(ajustarMontoAbono(-1000, 500_000))
      .toEqual({ montoAjustado: 0, saldaDeuda: false });
  });

  it('saldo 0: monto ajustado 0, considera deuda saldada', () => {
    expect(ajustarMontoAbono(100_000, 0))
      .toEqual({ montoAjustado: 0, saldaDeuda: true });
  });

  it('monto NaN: monto ajustado 0, no salda', () => {
    expect(ajustarMontoAbono(NaN, 500_000))
      .toEqual({ montoAjustado: 0, saldaDeuda: false });
  });
});

// ── validarAbono() ───────────────────────────────────────────────

const deudaValida = (overrides = {}) => ({
  id:           'd1',
  descripcion:  'Tarjeta Visa',
  tipo:         'deuda-entidad',
  saldoTotal:   1_500_000,
  cuotaMensual: 200_000,
  tasa:         0.28,
  tasaUnidad:   'EA',
  frecuencia:   'Mensual',
  diaPago:      15,
  activo:       true,
  ...overrides,
});

const abonoValido = (overrides = {}) => ({
  monto:     '200000',
  cuentaId:  'cta1',
  fecha:     '2026-05-27',
  ...overrides,
});

describe('validarAbono()', () => {
  it('todos los campos OK: devuelve []', () => {
    expect(validarAbono(abonoValido(), deudaValida())).toEqual([]);
  });

  it('monto faltante: error', () => {
    const errs = validarAbono(abonoValido({ monto: '' }), deudaValida());
    expect(errs.some(e => /monto/i.test(e))).toBe(true);
  });

  it('monto 0: error', () => {
    const errs = validarAbono(abonoValido({ monto: '0' }), deudaValida());
    expect(errs.some(e => /monto/i.test(e))).toBe(true);
  });

  it('monto negativo: error', () => {
    const errs = validarAbono(abonoValido({ monto: '-100' }), deudaValida());
    expect(errs.some(e => /monto/i.test(e))).toBe(true);
  });

  it('cuentaId vacío: error (selector de tarjetas restaurado en el form)', () => {
    const errs = validarAbono(abonoValido({ cuentaId: '' }), deudaValida());
    expect(errs.some(e => /cuenta/i.test(e))).toBe(true);
  });

  it('fecha vacía: error', () => {
    const errs = validarAbono(abonoValido({ fecha: '' }), deudaValida());
    expect(errs.some(e => /fecha.*obligatoria/i.test(e))).toBe(true);
  });

  it('fecha mal formateada: error de formato', () => {
    const errs = validarAbono(abonoValido({ fecha: '27/05/2026' }), deudaValida());
    expect(errs.some(e => /formato/i.test(e))).toBe(true);
  });

  it('deuda null: error', () => {
    const errs = validarAbono(abonoValido(), null);
    expect(errs.some(e => /no se encontró la deuda/i.test(e))).toBe(true);
  });

  it('compromiso tipo "fijo" no es deuda: error', () => {
    const fijo = deudaValida({ tipo: 'fijo' });
    const errs = validarAbono(abonoValido(), fijo);
    expect(errs.some(e => /deudas/i.test(e))).toBe(true);
  });

  it('deuda inactiva (archivada): error', () => {
    const archivada = deudaValida({ activo: false });
    const errs = validarAbono(abonoValido(), archivada);
    expect(errs.some(e => /archivada/i.test(e))).toBe(true);
  });

  it('deuda con saldo 0: error de ya saldada', () => {
    const saldada = deudaValida({ saldoTotal: 0 });
    const errs = validarAbono(abonoValido(), saldada);
    expect(errs.some(e => /saldada/i.test(e))).toBe(true);
  });

  it('acumula múltiples errores en una sola pasada', () => {
    const errs = validarAbono({ monto: '0', fecha: '' }, null);
    expect(errs.length).toBeGreaterThanOrEqual(3);
  });
});

// ── renderFormAbono() - formulario ───────────────────────────────

describe('renderFormAbono() - formulario', () => {
  const deuda = {
    id: 'd1',
    descripcion: 'Tarjeta de crédito',
    tipo: 'deuda-entidad',
    saldoTotal: 2_000_000,
    cuotaMensual: 200_000,
    activo: true,
  };

  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas: estado vacío con instrucción, sin form', () => {
    S.cuentas = [];
    const html = renderFormAbono(deuda);
    expect(html).not.toContain('form-abono');
    expect(html).toContain('al menos una cuenta activa');
  });

  it('con cuentas: muestra el form (monto/fecha) con selector de tarjetas', () => {
    S.cuentas = [
      cuenta('c1', 'Bancolombia', 1_000_000),
      cuenta('c2', 'Nequi'),
    ];
    const html = renderFormAbono(deuda);
    expect(html).toContain('form-abono');
    expect(html).toContain('name="monto"');
    // Selector de tarjetas restaurado: una cuenta cubre, si no hay reparto-fallback.
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
  });
});

// ── renderFormDeuda() - selector de tipo de obligación ────────────

describe('renderFormDeuda() - selector de categoría', () => {
  it('incluye un <option> con emoji para cada categoría de CATEGORIAS_DEUDA', () => {
    const html = renderFormDeuda('deuda-entidad');
    for (const c of CATEGORIAS_DEUDA) {
      expect(html).toContain(`${CATEGORIA_DEUDA_EMOJI[c]} ${c}`);
    }
  });

  it('aparece igual para deuda-entidad y deuda-personal (catálogo único)', () => {
    const htmlEntidad  = renderFormDeuda('deuda-entidad');
    const htmlPersonal = renderFormDeuda('deuda-personal');
    expect(htmlEntidad).toContain('💧 Gota a gota');
    expect(htmlPersonal).toContain('💳 Tarjeta de crédito');
  });

  it('en modo edición preselecciona la categoría guardada', () => {
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true,
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    expect(html).toContain('value="Tarjeta de crédito" selected');
  });

  it('en modo creación ninguna categoría viene preseleccionada', () => {
    const html = renderFormDeuda('deuda-personal');
    const selectMatch = html.match(/<select id="comp-categoria"[\s\S]*?<\/select>/);
    expect(selectMatch).not.toBeNull();
    expect(selectMatch[0]).not.toContain('selected');
  });
});

// ── renderListaCompromisos() - categoría en el contexto ───────────

describe('renderListaCompromisos() - categoría en el contexto', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    S.compromisos = [];
  });

  it('muestra el emoji y el nombre de la categoría en la card de la deuda', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const html = document.getElementById('lista-compromisos').innerHTML;
    expect(html).toContain('💳 Tarjeta de crédito');
  });

  it('sin categoría no antepone nada al contexto (tipo · tasa)', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: null, tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const html = document.getElementById('lista-compromisos').innerHTML;
    expect(html).toContain('Deuda con entidad · 28%');
  });
});

// ── deltasSaldoCompromisoPorEdicionGasto() ───────────────────────

describe('deltasSaldoCompromisoPorEdicionGasto()', () => {
  it('crear gasto con compromisoId: delta negativo (saldo deuda baja)', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      null,
      { compromisoId: 'd1', monto: 200_000 }
    );
    expect(deltas).toEqual({ d1: -200_000 });
  });

  it('eliminar gasto con compromisoId: delta positivo (saldo deuda sube)', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 200_000 },
      null
    );
    expect(deltas).toEqual({ d1: 200_000 });
  });

  it('editar solo el monto, mismo compromiso: delta = monto_antes - monto_después', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 200_000 },
      { compromisoId: 'd1', monto: 300_000 }
    );
    expect(deltas).toEqual({ d1: -100_000 });
  });

  it('editar bajando el monto: delta positivo (revertir parte del abono)', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 300_000 },
      { compromisoId: 'd1', monto: 100_000 }
    );
    expect(deltas).toEqual({ d1: 200_000 });
  });

  it('cambiar de un compromiso a otro: revierte el viejo, aplica el nuevo', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 200_000 },
      { compromisoId: 'd2', monto: 300_000 }
    );
    expect(deltas).toEqual({ d1: 200_000, d2: -300_000 });
  });

  it('desvincular (compromisoId pasa a null): revierte el viejo', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 200_000 },
      { compromisoId: null, monto: 200_000 }
    );
    expect(deltas).toEqual({ d1: 200_000 });
  });

  it('vincular (gasto previo sin compromisoId): aplica al nuevo', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: null, monto: 200_000 },
      { compromisoId: 'd1', monto: 200_000 }
    );
    expect(deltas).toEqual({ d1: -200_000 });
  });

  it('mismo compromiso, mismo monto: delta vacío (no hay nada que hacer)', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: 'd1', monto: 200_000 },
      { compromisoId: 'd1', monto: 200_000 }
    );
    expect(deltas).toEqual({});
  });

  it('ambos null: delta vacío', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(null, null);
    expect(deltas).toEqual({});
  });

  it('ambos sin compromisoId: delta vacío', () => {
    const deltas = deltasSaldoCompromisoPorEdicionGasto(
      { compromisoId: null, monto: 100_000 },
      { compromisoId: null, monto: 200_000 }
    );
    expect(deltas).toEqual({});
  });
});

// ── detectarDeudaCreciente() ─────────────────────────────────────

describe('detectarDeudaCreciente()', () => {
  const datos = (overrides = {}) => ({
    tipo:         'deuda-entidad',
    saldoTotal:   '10000000',
    cuotaMensual: '300000',
    tasa:         '24',
    tasaUnidad:   'EA',
    ...overrides,
  });

  it('devuelve null para tipo fijo (no aplica a gastos fijos)', () => {
    expect(detectarDeudaCreciente(datos({ tipo: 'fijo' }))).toBeNull();
  });

  it('devuelve null cuando la tasa es 0', () => {
    expect(detectarDeudaCreciente(datos({ tasa: '0' }))).toBeNull();
  });

  it('devuelve null cuando la tasa está vacía (deuda-personal sin interés)', () => {
    expect(detectarDeudaCreciente(datos({ tipo: 'deuda-personal', tasa: '' }))).toBeNull();
  });

  it('devuelve null cuando el saldo es 0', () => {
    expect(detectarDeudaCreciente(datos({ saldoTotal: '0' }))).toBeNull();
  });

  it('devuelve null cuando la cuota es 0', () => {
    expect(detectarDeudaCreciente(datos({ cuotaMensual: '0' }))).toBeNull();
  });

  it('devuelve null cuando la cuota cubre el interés mensual EA (caso normal)', () => {
    // saldo=10M, EA=24% → interesMensual ~180.900 < cuota=300.000 → sin alerta.
    expect(detectarDeudaCreciente(datos())).toBeNull();
  });

  it('detecta alerta cuando la cuota no cubre el interés mensual EA', () => {
    // saldo=10M, EA=24% → interesMensual ~180.900 > cuota=100.000 → alerta.
    const r = detectarDeudaCreciente(datos({ cuotaMensual: '100000' }));
    expect(r).not.toBeNull();
    expect(r.cuotaMensual).toBe(100_000);
    expect(r.interesMensual).toBeGreaterThan(100_000);
    expect(r.deficit).toBeGreaterThan(0);
    expect(r.deficit).toBeCloseTo(r.interesMensual - r.cuotaMensual, 5);
  });

  it('detecta alerta cuando la cuota no cubre el interés mensual (tasaUnidad mensual)', () => {
    // saldo=1M, tasa=10% mensual → interesMensual=100.000 > cuota=90.000 → alerta.
    const r = detectarDeudaCreciente(datos({
      tipo:         'deuda-personal',
      saldoTotal:   '1000000',
      cuotaMensual: '90000',
      tasa:         '10',
      tasaUnidad:   'mensual',
    }));
    expect(r).not.toBeNull();
    expect(r.interesMensual).toBeCloseTo(100_000, 0);
    expect(r.cuotaMensual).toBe(90_000);
    expect(r.deficit).toBeCloseTo(10_000, 0);
  });

  it('devuelve null cuando la cuota supera el interés mensual (tasaUnidad mensual)', () => {
    // saldo=1M, tasa=10% mensual → interesMensual=100.000 < cuota=110.000 → sin alerta.
    expect(detectarDeudaCreciente(datos({
      tipo:         'deuda-personal',
      saldoTotal:   '1000000',
      cuotaMensual: '110000',
      tasa:         '10',
      tasaUnidad:   'mensual',
    }))).toBeNull();
  });

  it('detecta alerta cuando cuota = interés exacto (la deuda no baja ni sube)', () => {
    // cuota=interés → cuota <= interés → alerta (deficit ≈ 0).
    const r = detectarDeudaCreciente(datos({
      tipo:         'deuda-personal',
      saldoTotal:   '1000000',
      cuotaMensual: '100000',
      tasa:         '10',
      tasaUnidad:   'mensual',
    }));
    expect(r).not.toBeNull();
    expect(r.deficit).toBeCloseTo(0, 5);
  });
});

// ── INTEGRACIÓN: FLUJO COMPLETO DE ABONO ─────────────────────────

describe('integración: flujo completo de abono a deuda', () => {
  const deudaBase = {
    id: 'deuda-1',
    descripcion: 'Tarjeta Visa',
    tipo: 'deuda-entidad',
    activo: true,
    tasa: 0.28,
    tasaUnidad: 'EA',
    saldoTotal: 500_000,
    cuotaMensual: 100_000,
    diaPago: 15,
    frecuencia: 'Mensual',
  };
  const datosBase = { cuentaId: 'c1', fecha: '2026-05-27', nota: '' };

  it('abono parcial: valida, ajusta monto y aplica correctamente', () => {
    const deuda = { ...deudaBase, saldoTotal: 500_000 };
    const datos = { ...datosBase, monto: '200000', compromisoId: deuda.id };

    const errores = validarAbono(datos, deuda);
    expect(errores).toHaveLength(0);

    const { montoAjustado, saldaDeuda } = ajustarMontoAbono(200_000, 500_000);
    expect(montoAjustado).toBe(200_000);
    expect(saldaDeuda).toBe(false);

    const nuevoSaldo = aplicarAbonoASaldo(500_000, montoAjustado);
    expect(nuevoSaldo).toBe(300_000);
  });

  it('abono que salda: monto mayor al saldo se ajusta y deja saldo en 0', () => {
    const deuda = { ...deudaBase, saldoTotal: 100_000 };
    const datos = { ...datosBase, monto: '150000', compromisoId: deuda.id };

    const errores = validarAbono(datos, deuda);
    expect(errores).toHaveLength(0);

    const { montoAjustado, saldaDeuda } = ajustarMontoAbono(150_000, 100_000);
    expect(montoAjustado).toBe(100_000);
    expect(saldaDeuda).toBe(true);

    const nuevoSaldo = aplicarAbonoASaldo(100_000, montoAjustado);
    expect(nuevoSaldo).toBe(0);
  });

  it('revertir abono al eliminar gasto-abono restaura el saldo original', () => {
    const saldoOriginal  = 500_000;
    const montoAbono     = 200_000;

    const saldoTrasAbono = aplicarAbonoASaldo(saldoOriginal, montoAbono);
    expect(saldoTrasAbono).toBe(300_000);

    const saldoRestaurado = revertirAbonoDeSaldo(saldoTrasAbono, montoAbono);
    expect(saldoRestaurado).toBe(500_000);
  });
});

// ── calcularAbonosDelMes ─────────────────────────────────────────

describe('calcularAbonosDelMes()', () => {
  const gastos = [
    { compromisoId: 'deuda-1', fecha: '2026-06-05', monto: 20_000 },
    { compromisoId: 'deuda-1', fecha: '2026-06-20', monto: 30_000 },
    { compromisoId: 'deuda-2', fecha: '2026-06-10', monto: 50_000 },
    { compromisoId: 'deuda-1', fecha: '2026-05-15', monto: 100_000 },
  ];

  it('suma los abonos del mes correcto para un compromiso', () => {
    expect(calcularAbonosDelMes(gastos, 'deuda-1', '2026-06')).toBe(50_000);
  });

  it('no suma abonos de otro mes', () => {
    expect(calcularAbonosDelMes(gastos, 'deuda-1', '2026-05')).toBe(100_000);
  });

  it('no suma abonos de otro compromiso', () => {
    expect(calcularAbonosDelMes(gastos, 'deuda-2', '2026-06')).toBe(50_000);
  });

  it('devuelve 0 si no hay gastos para ese compromiso y mes', () => {
    expect(calcularAbonosDelMes(gastos, 'deuda-99', '2026-06')).toBe(0);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularAbonosDelMes([], 'deuda-1', '2026-06')).toBe(0);
  });

  it('devuelve 0 con gastos null/undefined', () => {
    expect(calcularAbonosDelMes(null, 'deuda-1', '2026-06')).toBe(0);
  });

  it('ignora gastos sin compromisoId', () => {
    const g = [{ fecha: '2026-06-01', monto: 999 }];
    expect(calcularAbonosDelMes(g, 'deuda-1', '2026-06')).toBe(0);
  });
});

// ── estadoPagoMes ────────────────────────────────────────────────

describe('estadoPagoMes()', () => {
  const deuda = {
    id: 'deuda-1', tipo: 'deuda-entidad', cuotaMensual: 200_000,
  };
  const fijo = {
    id: 'fijo-1', tipo: 'fijo', monto: 500_000,
  };

  const gastoDeuda20k  = [{ compromisoId: 'deuda-1', fecha: '2026-06-10', monto: 20_000 }];
  const gastoDeuda200k = [{ compromisoId: 'deuda-1', fecha: '2026-06-10', monto: 200_000 }];
  const gastoFijo      = [{ compromisoId: 'fijo-1',  fecha: '2026-06-05', monto: 500_000 }];

  it('ninguno: sin gastos vinculados ese mes', () => {
    expect(estadoPagoMes([], deuda, '2026-06')).toBe('ninguno');
  });

  it('parcial: abono de deuda cubre menos que la cuota', () => {
    expect(estadoPagoMes(gastoDeuda20k, deuda, '2026-06')).toBe('parcial');
  });

  it('completo: abono de deuda cubre exactamente la cuota', () => {
    expect(estadoPagoMes(gastoDeuda200k, deuda, '2026-06')).toBe('completo');
  });

  it('completo: abono de deuda supera la cuota', () => {
    const g = [{ compromisoId: 'deuda-1', fecha: '2026-06-10', monto: 250_000 }];
    expect(estadoPagoMes(g, deuda, '2026-06')).toBe('completo');
  });

  it('completo: múltiples abonos que juntos cubren la cuota', () => {
    const g = [
      { compromisoId: 'deuda-1', fecha: '2026-06-05', monto: 100_000 },
      { compromisoId: 'deuda-1', fecha: '2026-06-20', monto: 100_000 },
    ];
    expect(estadoPagoMes(g, deuda, '2026-06')).toBe('completo');
  });

  it('parcial: múltiples abonos que no alcanzan la cuota', () => {
    const g = [
      { compromisoId: 'deuda-1', fecha: '2026-06-05', monto: 50_000 },
      { compromisoId: 'deuda-1', fecha: '2026-06-20', monto: 50_000 },
    ];
    expect(estadoPagoMes(g, deuda, '2026-06')).toBe('parcial');
  });

  it('gasto fijo: cualquier pago vinculado = completo (no tiene cuota parcial)', () => {
    expect(estadoPagoMes(gastoFijo, fijo, '2026-06')).toBe('completo');
  });

  it('gasto fijo: sin gastos vinculados = ninguno', () => {
    expect(estadoPagoMes([], fijo, '2026-06')).toBe('ninguno');
  });

  it('ninguno: compromiso null', () => {
    expect(estadoPagoMes(gastoDeuda20k, null, '2026-06')).toBe('ninguno');
  });

  it('completo: deuda sin cuotaMensual definida, cualquier abono = completo', () => {
    const deudaSinCuota = { id: 'deuda-1', tipo: 'deuda-entidad', cuotaMensual: 0 };
    expect(estadoPagoMes(gastoDeuda20k, deudaSinCuota, '2026-06')).toBe('completo');
  });

  it('ninguno: gastos de otro mes no cuentan', () => {
    const gOtroMes = [{ compromisoId: 'deuda-1', fecha: '2026-05-10', monto: 200_000 }];
    expect(estadoPagoMes(gOtroMes, deuda, '2026-06')).toBe('ninguno');
  });
});

// ── renderResumenExtra() ────────────────────────────────────────

describe('renderResumenExtra()', () => {
  it('sin extra, muestra invitación a probar', () => {
    const html = renderResumenExtra(null, null, 0);
    expect(html).toContain('Escribe un monto');
    expect(html).toContain('resumen-extra');
    expect(html).not.toContain('--activo');
  });

  it('con extra y ahorro real, muestra impacto con clase --activo', () => {
    const sinExtra = {
      avalancha: { meses: 36, interesesTotales: 500_000, completo: true },
      bolaNieve: { meses: 38, interesesTotales: 520_000, completo: true },
    };
    const conExtra = {
      avalancha: { meses: 24, interesesTotales: 300_000, completo: true },
      bolaNieve: { meses: 26, interesesTotales: 320_000, completo: true },
    };
    const html = renderResumenExtra(sinExtra, conExtra, 100_000);
    expect(html).toContain('--activo');
    expect(html).toContain('Impacto de tu pago extra');
    expect(html).toContain('$100.000');
    expect(html).toContain('menos');
  });

  it('con extra pero sin mejora significativa, sugiere monto mayor', () => {
    const base = {
      avalancha: { meses: 12, interesesTotales: 50_000, completo: true },
    };
    const igual = {
      avalancha: { meses: 12, interesesTotales: 50_000, completo: true },
    };
    const html = renderResumenExtra(base, igual, 1000);
    expect(html).toContain('no cambia significativamente');
    expect(html).not.toContain('--activo');
  });

  it('si ambos planes son inviables, no muestra resumen', () => {
    const inviable = {
      avalancha: { meses: 600, interesesTotales: 0, completo: false },
    };
    const html = renderResumenExtra(inviable, inviable, 50_000);
    expect(html).toBe('');
  });
});

// ── Regresión: el impacto no muestra cifras absurdas con plan inviable ────
// Bug reportado: la cuota no cubre el interés → la simulación base diverge
// (saldo crece, interesesTotales explota a ~1e29 y meses se topa en 600). Al
// comparar contra esa base salían "terminas 49 años antes y ahorras $6e29".

describe('impacto de deudas - plan base inviable (regresión cifras absurdas)', () => {
  // Deuda donde la cuota ($50.000) no cubre el interés mensual (~$221.000):
  // sola, su saldo crece mes a mes y nunca se paga.
  const deudasInviables = () => filtrarDeudasPagables([
    deudaBase({ saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
  ]);

  it('precondición: la base diverge (no completa) y un extra grande sí la vuelve viable', () => {
    const deudas = deudasInviables();
    expect(compararEstrategias(deudas, 0).avalancha.completo).toBe(false);
    expect(compararEstrategias(deudas, 2_000_000).avalancha.completo).toBe(true);
  });

  it('renderResumenExtra: con base inviable explica que sin el extra no se paga, sin cifras absurdas', () => {
    const deudas   = deudasInviables();
    const sinExtra = compararEstrategias(deudas, 0);
    const conExtra = compararEstrategias(deudas, 2_000_000);

    const html = renderResumenExtra(sinExtra, conExtra, 2_000_000);

    expect(html).toContain('Impacto de tu pago extra');
    expect(html).toContain('no se termina de pagar');
    // El bug mostraba "terminas X años antes" y "$...e+29": no deben aparecer.
    expect(html).not.toContain('terminas');
    expect(html).not.toContain('menos en intereses');
    expect(html).not.toContain('e+');
  });

  it('renderImpactoAvalancha: plan incompleto muestra "No se termina de pagar" en vez del total divergente', () => {
    const resultado = compararEstrategias(deudasInviables(), 0);
    const html = renderImpactoAvalancha(resultado, 0);

    expect(html).toContain('No se termina de pagar');
    expect(html).not.toContain('e+');
    // No debe colarse el banner comparativo con un ahorro entre estrategias.
    expect(html).not.toContain('te ahorrarías');
  });

  it('renderImpactoAvalancha: plan completo sigue mostrando el total de intereses normal', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ saldoTotal: 1_000_000, cuotaMensual: 200_000, tasa: 0.30, tasaUnidad: 'EA' }),
    ]);
    const resultado = compararEstrategias(deudas, 0);
    expect(resultado.avalancha.completo).toBe(true);

    const html = renderImpactoAvalancha(resultado, 0);
    expect(html).toContain('Total que pagas en intereses');
    expect(html).not.toContain('No se termina de pagar');
  });
});

// ── renderEstrategiaPago: jerarquía D.2a (picker arriba, acelerador plegable) ──

describe('renderEstrategiaPago jerarquía D.2a', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0 });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda A', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.28, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.12, tasaUnidad: 'EA' }),
    ];
  });

  it('el picker aparece antes del acelerador en el DOM', () => {
    renderEstrategiaPago();
    const el = document.getElementById('estrategia-pago');
    const picker = el.querySelector('.estrategia-cards');
    const acelerador = el.querySelector('.estrategia-card__acelerador');
    expect(picker).not.toBeNull();
    expect(acelerador).not.toBeNull();
    expect(picker.compareDocumentPosition(acelerador) & 4).toBeTruthy();
  });

  it('el acelerador es un <details> colapsado por defecto (extra=0)', () => {
    renderEstrategiaPago();
    const details = document.querySelector('.estrategia-card__acelerador');
    expect(details.tagName).toBe('DETAILS');
    expect(details.hasAttribute('open')).toBe(false);
  });

  it('el acelerador se abre cuando el extra es > 0', () => {
    setEstrategiaUI({ extraMensual: 50_000 });
    renderEstrategiaPago();
    const details = document.querySelector('.estrategia-card__acelerador');
    expect(details.hasAttribute('open')).toBe(true);
  });

  it('el input de extra vive dentro del acelerador, no arriba de la card', () => {
    renderEstrategiaPago();
    const acelerador = document.querySelector('.estrategia-card__acelerador');
    const input = acelerador.querySelector('#estrategia-extra');
    expect(input).not.toBeNull();
    const header = document.querySelector('.estrategia-card__header');
    const inputGlobal = document.getElementById('estrategia-extra');
    expect(header.compareDocumentPosition(inputGlobal) & 4).toBeTruthy();
    expect(acelerador.contains(inputGlobal)).toBe(true);
  });
});

// ── renderEstrategiaPago: D.2b (plan inviable: extra como remedio, no acelerador) ──

describe('renderEstrategiaPago D.2b plan inviable', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0 });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda barata', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ];
  });

  it('no muestra el acelerador plegable cuando el plan es inviable', () => {
    renderEstrategiaPago();
    const acelerador = document.querySelector('.estrategia-card__acelerador');
    expect(acelerador).toBeNull();
  });

  it('el input de extra vive dentro del bloque de remedio', () => {
    renderEstrategiaPago();
    const remedio = document.querySelector('.estrategia-card__remedio');
    expect(remedio).not.toBeNull();
    const input = remedio.querySelector('#estrategia-extra');
    expect(input).not.toBeNull();
  });

  it('el remedio está dentro del bloque de alerta (diagnóstico inviable)', () => {
    renderEstrategiaPago();
    const alerta = document.querySelector('.estrategia-card__alerta');
    const remedio = alerta.querySelector('.estrategia-card__remedio');
    expect(remedio).not.toBeNull();
    expect(alerta.textContent).toContain('Aumenta tu cuota');
  });

  it('el resumen de impacto se muestra dentro del remedio', () => {
    renderEstrategiaPago();
    const remedio = document.querySelector('.estrategia-card__remedio');
    const resumen = remedio.querySelector('.estrategia-card__resumen-extra');
    expect(resumen).not.toBeNull();
  });
});

// ── simularPagoDeuda: bandera completo (D.3a) ────────────────────

describe('simularPagoDeuda completo', () => {
  it('completo=true cuando la cuota salda la deuda', () => {
    const r = simularPagoDeuda(1_000_000, 0.30, 200_000);
    expect(r.completo).toBe(true);
    expect(r.meses).toBeGreaterThan(0);
  });

  it('completo=false cuando la cuota no cubre el interés (la deuda crece)', () => {
    const r = simularPagoDeuda(10_000_000, 0.30, 50_000);
    expect(r.completo).toBe(false);
  });

  it('completo=true para saldo 0 (nada que pagar)', () => {
    expect(simularPagoDeuda(0, 0.30, 100_000).completo).toBe(true);
  });

  it('completo=false si la cuota total es 0', () => {
    expect(simularPagoDeuda(1_000_000, 0.30, 0, 0).completo).toBe(false);
  });
});

// ── simularRenegociacion (D.3a) ──────────────────────────────────

describe('simularRenegociacion', () => {
  it('bajar la tasa reduce meses e intereses (ambos planes cierran)', () => {
    const r = simularRenegociacion({ saldo: 5_000_000, tasaEA: 0.40, cuota: 300_000 }, 0.20);
    expect(r.actual.completo).toBe(true);
    expect(r.nueva.completo).toBe(true);
    expect(r.ahorroIntereses).toBeGreaterThan(0);
    expect(r.mejora).toBe(true);
  });

  it('una tasa igual no mejora el plan', () => {
    const r = simularRenegociacion({ saldo: 5_000_000, tasaEA: 0.20, cuota: 300_000 }, 0.20);
    expect(r.mejora).toBe(false);
    expect(r.ahorroIntereses).toBe(0);
    expect(r.ahorroMeses).toBe(0);
  });

  it('mejora cualitativa: el plan actual no cierra pero la nueva tasa sí', () => {
    const r = simularRenegociacion({ saldo: 10_000_000, tasaEA: 0.40, cuota: 60_000 }, 0.03);
    expect(r.actual.completo).toBe(false);
    expect(r.nueva.completo).toBe(true);
    expect(r.mejora).toBe(true);
    // No se resta una cifra divergente: el ahorro queda en 0 (mejora cualitativa).
    expect(r.ahorroIntereses).toBe(0);
    expect(r.ahorroMeses).toBe(0);
  });

  it('si la nueva tasa tampoco cubre los intereses, no mejora', () => {
    const r = simularRenegociacion({ saldo: 10_000_000, tasaEA: 0.40, cuota: 50_000 }, 0.35);
    expect(r.nueva.completo).toBe(false);
    expect(r.mejora).toBe(false);
  });

  it('null si la deuda no tiene saldo o cuota válidos', () => {
    expect(simularRenegociacion({ saldo: 0, tasaEA: 0.3, cuota: 100_000 }, 0.2)).toBeNull();
    expect(simularRenegociacion({ saldo: 1_000_000, tasaEA: 0.3, cuota: 0 }, 0.2)).toBeNull();
    expect(simularRenegociacion(null, 0.2)).toBeNull();
  });
});

// ── renderComparativaRenegociacion (D.3a) ────────────────────────

describe('renderComparativaRenegociacion', () => {
  it('sin tasa nueva, invita a escribir', () => {
    expect(renderComparativaRenegociacion(null, 0, 'EA')).toContain('Escribe la tasa');
  });

  it('mejora con ahorro: muestra "menos" y el plazo nuevo', () => {
    const sim = simularRenegociacion({ saldo: 5_000_000, tasaEA: 0.40, cuota: 300_000 }, 0.20);
    const html = renderComparativaRenegociacion(sim, 20, 'EA');
    expect(html).toContain('🎯');
    expect(html).toContain('menos');
  });

  it('plan actual inviable y nueva viable: mensaje cualitativo sin cifras absurdas', () => {
    const sim = simularRenegociacion({ saldo: 10_000_000, tasaEA: 0.40, cuota: 60_000 }, 0.03);
    const html = renderComparativaRenegociacion(sim, 3, 'EA');
    expect(html).toContain('no se termina de pagar');
    expect(html).not.toContain('e+');
    expect(html).not.toContain('menos en intereses');
  });

  it('la nueva tasa tampoco cubre intereses: advierte que la deuda crece', () => {
    const sim = simularRenegociacion({ saldo: 10_000_000, tasaEA: 0.40, cuota: 50_000 }, 0.35);
    const html = renderComparativaRenegociacion(sim, 35, 'EA');
    expect(html).toContain('seguiría creciendo');
  });
});

// ── renderEstrategiaPago: herramienta renegociar en bloque inviable (D.3a) ──

describe('renderRenegociar (D.3a) en el bloque inviable', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, renegociarDeudaId: null, renegociarTasaPct: 0 });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda barata', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ];
  });

  it('muestra la herramienta de renegociar dentro del bloque inviable', () => {
    renderEstrategiaPago();
    const tool = document.querySelector('.estrategia-card__remedio--renegociar');
    expect(tool).not.toBeNull();
    expect(tool.querySelector('#renegociar-tasa')).not.toBeNull();
    expect(tool.textContent).toContain('Renegociar la tasa');
  });

  it('el botón Aplicar arranca deshabilitado (sin tasa nueva)', () => {
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-renegociacion"]');
    expect(btn.disabled).toBe(true);
  });

  it('con una tasa nueva que vuelve viable la deuda, Aplicar se habilita', () => {
    setEstrategiaUI({ renegociarDeudaId: 'd1', renegociarTasaPct: 2 });
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-renegociacion"]');
    expect(btn.disabled).toBe(false);
    expect(btn.dataset.deuda).toBe('d1');
    expect(btn.dataset.unidad).toBe('EA');
  });
});
