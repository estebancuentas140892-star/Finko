import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  calcularTotalCompromisos,
  resumenDeudas,
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
  simularConsolidacion,
  repartirExtraEnCuotas,
  compararEstrategias,
  recomendarEstrategia,
  recomendarPalanca,
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  vencidosSinPagar,
  agruparPorDiasRestantes,
  sumarMontos,
  aplicarAbonoASaldo,
  revertirAbonoDeSaldo,
  ajustarMontoAbono,
  validarAbono,
  deltasSaldoCompromisoPorEdicionGasto,
  detectarDeudaCreciente,
  calcularAbonosDelMes,
  fechaUltimoAbono,
  estadoPagoMes,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../../modules/dominio/compromisos/logic.js';
import { renderFormAbono, renderFormDeuda } from '../../modules/dominio/compromisos/views/formularios.js';
import { renderListaCompromisos } from '../../modules/dominio/compromisos/views/lista.js';
import { renderAlertaDeudasDurmiendo } from '../../modules/dominio/compromisos/views/alertas.js';
import { renderPanelPrioridades, renderPanelVencidos } from '../../modules/dominio/compromisos/views/dashboard.js';
import { renderResumenExtra, renderImpactoAvalancha, renderComparativaRenegociacion, renderComparativaConsolidacion } from '../../modules/dominio/compromisos/views/estrategia-impacto.js';
import { renderEstrategiaPago, setEstrategiaUI } from '../../modules/dominio/compromisos/views/estrategia.js';
import { renderHeroCompromisos } from '../../modules/dominio/compromisos/views/hero.js';
import { S } from '../../modules/core/state.js';
import {
  CATEGORIAS_AGENDA, CATEGORIA_AGENDA_ICONO,
  CATEGORIAS_DEUDA, CATEGORIA_DEUDA_ICONO,
  CATEGORIAS_DEUDA_PERSONAL, CATEGORIA_DEUDA_PERSONAL_ICONO,
} from '../../modules/core/constants.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const hoy = new Date();
const DIA_HOY = hoy.getDate();

// diaPago en 10 días desde hoy (siempre futuro, nunca igual a hoy en el cómputo).
const DIA_FUTURO = ((DIA_HOY + 10 - 1) % 28) + 1; // 1-28, nunca pisa hoy
const DIA_PASADO = ((DIA_HOY - 2 + 28 - 1) % 28) + 1; // 2 días antes, 1-28
const DIA_MANANA = ((DIA_HOY + 1 - 1) % 28) + 1; // mañana, 1-28, nunca pisa hoy

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

// ── CATEGORIAS_AGENDA / CATEGORIA_AGENDA_ICONO (MC.9-Agenda) ──────

describe('CATEGORIAS_AGENDA', () => {
  it('contiene 15 categorías predefinidas', () => {
    expect(CATEGORIAS_AGENDA).toHaveLength(15);
  });

  it('todas son strings no vacíos', () => {
    for (const c of CATEGORIAS_AGENDA) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});

describe('CATEGORIA_AGENDA_ICONO', () => {
  it('tiene un ícono para cada categoría de CATEGORIAS_AGENDA', () => {
    for (const c of CATEGORIAS_AGENDA) {
      expect(CATEGORIA_AGENDA_ICONO[c]).toBeTruthy();
      expect(typeof CATEGORIA_AGENDA_ICONO[c]).toBe('string');
    }
  });

  it('no tiene entradas huérfanas fuera del catálogo', () => {
    for (const key of Object.keys(CATEGORIA_AGENDA_ICONO)) {
      expect(CATEGORIAS_AGENDA).toContain(key);
    }
  });
});

// ── CATEGORIAS_DEUDA / CATEGORIA_DEUDA_ICONO ──────────────────────

describe('CATEGORIAS_DEUDA', () => {
  it('contiene 7 tipos de deuda predefinidos (curado en ADR 015)', () => {
    expect(CATEGORIAS_DEUDA).toHaveLength(7);
  });

  it('todas son strings no vacíos', () => {
    for (const c of CATEGORIAS_DEUDA) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});

describe('CATEGORIA_DEUDA_ICONO', () => {
  it('tiene un ícono para cada categoría de CATEGORIAS_DEUDA', () => {
    for (const c of CATEGORIAS_DEUDA) {
      expect(CATEGORIA_DEUDA_ICONO[c]).toBeTruthy();
      expect(typeof CATEGORIA_DEUDA_ICONO[c]).toBe('string');
    }
  });

  it('no tiene entradas huérfanas fuera del catálogo', () => {
    for (const key of Object.keys(CATEGORIA_DEUDA_ICONO)) {
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

  it('AG.4: con categoría predefinida (no "Otro"), la descripción puede ir vacía', () => {
    const errores = validarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Mercado', descripcion: '',
    });
    expect(errores).toEqual([]);
  });

  it('AG.4: con categoría "Otro", la descripción sigue siendo obligatoria', () => {
    const errores = validarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Otro', descripcion: '',
    });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('AG.4: sin categoría, la descripción sigue siendo obligatoria', () => {
    const errores = validarCompromiso({ ...datosFormValidos, tipo: 'fijo', descripcion: '' });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0]).toMatch(/descripci/i);
  });

  // ── MC.16a (ADR 051 D1): cupoTotal de tarjeta de crédito ──────────

  it('MC.16a: tarjeta de crédito sin cupoTotal no es error (opcional)', () => {
    expect(validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Tarjeta de crédito',
    })).toEqual([]);
  });

  it('MC.16a: tarjeta de crédito con cupoTotal válido no es error', () => {
    expect(validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Tarjeta de crédito', cupoTotal: '3000000',
    })).toEqual([]);
  });

  it('MC.16a: tarjeta de crédito con cupoTotal <= 0 es error', () => {
    const errores = validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Tarjeta de crédito', cupoTotal: '0',
    });
    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0]).toMatch(/cupo/i);
  });

  it('MC.16a: cupoTotal inválido en otra categoría no reporta error (el campo no aplica)', () => {
    expect(validarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Vivienda', cupoTotal: '-5',
    })).toEqual([]);
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

  // ── MC.16a (ADR 051 D1): cupoTotal de tarjeta de crédito ──────────

  it('MC.16a: con categoría "Tarjeta de crédito" y cupoTotal válido, lo guarda', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Tarjeta de crédito', cupoTotal: '3000000',
    };
    const result = normalizarCompromiso(datos);
    expect(result.cupoTotal).toBe(3_000_000);
  });

  it('MC.16a: con otra categoría, cupoTotal queda null aunque venga en los datos', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Vivienda', cupoTotal: '3000000',
    };
    const result = normalizarCompromiso(datos);
    expect(result.cupoTotal).toBeNull();
  });

  it('MC.16a: tarjeta de crédito sin cupoTotal (deuda vieja a posteriori), queda null', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '100000', categoria: 'Tarjeta de crédito', cupoTotal: '',
    };
    const result = normalizarCompromiso(datos);
    expect(result.cupoTotal).toBeNull();
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

  it('AG.4: con categoría predefinida, la descripción es la categoría y el texto del form pasa a nota', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Mercado', descripcion: 'Éxito de la esquina',
    });
    expect(result.descripcion).toBe('Mercado');
    expect(result.nota).toBe('Éxito de la esquina');
  });

  it('AG.4: con categoría predefinida y texto vacío, la nota queda como cadena vacía', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Mercado', descripcion: '',
    });
    expect(result.descripcion).toBe('Mercado');
    expect(result.nota).toBe('');
  });

  it('AG.4: con categoría "Otro", la descripción es el texto escrito y no hay nota', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Otro', descripcion: 'Suscripción Xbox',
    });
    expect(result.descripcion).toBe('Suscripción Xbox');
    expect(result.nota).toBe('');
  });

  it('AG.4: sin categoría, la descripción es el texto escrito y no hay nota', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, tipo: 'fijo', descripcion: 'Arriendo' });
    expect(result.descripcion).toBe('Arriendo');
    expect(result.nota).toBe('');
  });

  // ── MC.13e-2c: nota de una deuda (campo propio, no doble uso como en fijo) ──

  it('MC.13e-2c: para deuda-entidad guarda la nota recortada', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', nota: '  Termina en 4532  ',
    });
    expect(result.nota).toBe('Termina en 4532');
  });

  it('MC.13e-2c: para deuda-personal sin nota, queda como cadena vacía', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000',
    });
    expect(result.nota).toBe('');
  });

  // ── CAT.2f: ícono elegido para la categoría "Otro" en Fijo ────────

  it('CAT.2f: con categoría "Otro" y un ícono válido del catálogo, lo guarda', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Otro', descripcion: 'Suscripción Xbox', icono: 'c-cohete',
    });
    expect(result.icono).toBe('c-cohete');
  });

  it('CAT.2f: con una categoría distinta de "Otro", el ícono queda null aunque venga en los datos', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Mercado', icono: 'c-cohete',
    });
    expect(result.icono).toBeNull();
  });

  it('CAT.2f: sin categoría, el ícono queda null aunque venga en los datos', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, tipo: 'fijo', icono: 'c-cohete' });
    expect(result.icono).toBeNull();
  });

  it('CAT.2f: con categoría "Otro" pero sin ícono elegido, queda null (no obligatorio)', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Otro', descripcion: 'Suscripción Xbox',
    });
    expect(result.icono).toBeNull();
  });

  it('CAT.2f: un valor de ícono fuera del catálogo (manipulación del DOM) se ignora', () => {
    const result = normalizarCompromiso({
      ...datosFormValidos, tipo: 'fijo', categoria: 'Otro', descripcion: 'Suscripción Xbox', icono: 'algo-inventado',
    });
    expect(result.icono).toBeNull();
  });

  it('para deudas guarda la categoría válida del catálogo del tipo (D.10)', () => {
    const entidad = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Libre inversión',
    };
    expect(normalizarCompromiso(entidad).categoria).toBe('Libre inversión');
    const personal = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Familiar',
    };
    expect(normalizarCompromiso(personal).categoria).toBe('Familiar');
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

  // ── CAT.2d: ícono elegido para la categoría 'Otra'/'Otro' ─────────

  it('CAT.2d: con categoría "Otra" (entidad) y un ícono válido del catálogo, lo guarda', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Otra', icono: 'c-avion',
    };
    expect(normalizarCompromiso(datos).icono).toBe('c-avion');
  });

  it('CAT.2d: con categoría "Otro" (personal) y un ícono válido del catálogo, lo guarda', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-personal',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Otro', icono: 'c-pesa',
    };
    expect(normalizarCompromiso(datos).icono).toBe('c-pesa');
  });

  it('CAT.2d: con una categoría distinta de "Otra"/"Otro", el ícono queda null aunque venga en los datos', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Vivienda', icono: 'c-avion',
    };
    expect(normalizarCompromiso(datos).icono).toBeNull();
  });

  it('CAT.2d: con categoría "Otra" pero sin ícono elegido, queda null (no obligatorio)', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Otra',
    };
    expect(normalizarCompromiso(datos).icono).toBeNull();
  });

  it('CAT.2d: un valor de ícono fuera del catálogo (manipulación del DOM) se ignora', () => {
    const datos = {
      ...datosFormValidos, tipo: 'deuda-entidad',
      saldoTotal: '500000', cuotaMensual: '50000', categoria: 'Otra', icono: 'algo-inventado',
    };
    expect(normalizarCompromiso(datos).icono).toBeNull();
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

  it('acepta cualquier categoría del catálogo correspondiente al tipo (D.10)', () => {
    for (const cat of CATEGORIAS_DEUDA) {
      expect(validarCompromiso({ ...datosEntidad, categoria: cat })).toEqual([]);
    }
    for (const cat of CATEGORIAS_DEUDA_PERSONAL) {
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

  it('D.11: única deuda con interés y avalancha material → la razón nombra que la elimina', () => {
    const r = recomendarEstrategia([
      dp({ id: 'cara', descripcion: 'Tarjeta',           tasaEA: 0.45, saldo: 5_000_000, cuota: 250_000 }),
      dp({ id: 'cero', descripcion: 'Préstamo familiar', tasaEA: 0,    saldo: 500_000,   cuota: 50_000 }),
    ], 100_000);
    expect(r.estrategia).toBe('avalancha');
    expect(r.razon).toContain('Tarjeta');
    expect(r.razon).toMatch(/única/i);
    expect(r.razon).toMatch(/elimina/i);
  });

  it('D.11: única deuda con interés que además es la más chica → Bola de nieve nombra que la primera elimina los intereses', () => {
    const r = recomendarEstrategia([
      dp({ id: 'chica-cara',  descripcion: 'Crédito tienda',    tasaEA: 0.30, saldo: 400_000,   cuota: 80_000 }),
      dp({ id: 'grande-cero', descripcion: 'Préstamo familiar', tasaEA: 0,    saldo: 2_000_000, cuota: 100_000 }),
    ], 50_000);
    expect(r.estrategia).toBe('bolaNieve');
    expect(r.razon).toContain('Crédito tienda');
    expect(r.razon).toMatch(/única que cobra intereses/i);
  });

  it('D.11: con varias deudas con interés la razón genérica no cambia', () => {
    const r = recomendarEstrategia([
      dp({ id: 'cara',   tasaEA: 0.40, saldo: 5_000_000, cuota: 200_000 }),
      dp({ id: 'barata', tasaEA: 0.05, saldo: 500_000,   cuota: 50_000 }),
    ], 100_000);
    expect(r.estrategia).toBe('avalancha');
    expect(r.razon).toMatch(/tasa más alta/i);
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

// ── recomendarPalanca() (D.15d) ────────────────────────────────────

describe('recomendarPalanca', () => {
  // Helper: deuda pagable (shape de filtrarDeudasPagables).
  const dp = (o = {}) => ({
    id: 'd', descripcion: 'Deuda', saldo: 1_000_000, tasaEA: 0.10, cuota: 100_000, ...o,
  });
  const dos = (a = {}, b = {}) => [
    dp({ id: 'a', cuota: 100_000, ...a }),
    dp({ id: 'b', cuota: 100_000, ...b }),
  ];

  it('lista vacía o inválida: sin recomendación', () => {
    for (const entrada of [[], null, undefined]) {
      const r = recomendarPalanca(entrada, { ingresoMensual: 3_000_000, fijosMensuales: 0 });
      expect(r.principal).toBeNull();
      expect(r.orden).toEqual([]);
      expect(r.capacidad).toBe(0);
      expect(r.tieneCapacidad).toBe(false);
      expect(r.razon).toBe('');
    }
  });

  it('capacidad = ingreso - fijos - Σ cuotas de deuda (margen libre real)', () => {
    const r = recomendarPalanca(dos(), { ingresoMensual: 3_000_000, fijosMensuales: 1_000_000 });
    // 3.000.000 - 1.000.000 - (100.000 + 100.000) = 1.800.000
    expect(r.capacidad).toBe(1_800_000);
    expect(r.tieneCapacidad).toBe(true);
  });

  it('con margen libre → principal Aumentar, aunque las tasas sean altas', () => {
    const r = recomendarPalanca(
      dos({ tasaEA: 0.30 }, { tasaEA: 0.30 }),
      { ingresoMensual: 3_000_000, fijosMensuales: 1_000_000 },
    );
    expect(r.principal).toBe('aumentar');
    expect(r.orden[0]).toBe('aumentar');
    // varias costosas: aumentar primero, consolidar segundo, renegociar tercero.
    expect(r.orden).toEqual(['aumentar', 'consolidar', 'renegociar']);
    expect(r.razon).toMatch(/dinero libre/i);
  });

  it('sin margen + varias deudas caras → principal Consolidar', () => {
    const r = recomendarPalanca(
      dos({ tasaEA: 0.30 }, { tasaEA: 0.30 }),
      { ingresoMensual: 500_000, fijosMensuales: 300_000 }, // capacidad 0
    );
    expect(r.tieneCapacidad).toBe(false);
    expect(r.principal).toBe('consolidar');
    expect(r.orden).toEqual(['consolidar', 'renegociar', 'aumentar']);
    expect(r.razon).toMatch(/un solo cr[eé]dito|consolid|unir/i);
  });

  it('sin margen + una sola deuda cara → principal Renegociar', () => {
    const r = recomendarPalanca(
      dos({ tasaEA: 0.30 }, { tasaEA: 0.10 }), // solo una supera el umbral
      { ingresoMensual: 500_000, fijosMensuales: 300_000 },
    );
    expect(r.principal).toBe('renegociar');
    expect(r.orden).toEqual(['renegociar', 'consolidar', 'aumentar']);
    expect(r.razon).toMatch(/tasa/i);
  });

  it('sin margen + sin tasas altas → principal Aumentar, con razón distinta', () => {
    const r = recomendarPalanca(
      dos({ tasaEA: 0 }, { tasaEA: 0 }),
      { ingresoMensual: 300_000, fijosMensuales: 200_000 }, // capacidad negativa
    );
    expect(r.principal).toBe('aumentar');
    // renegociar no está disponible con todas las tasas en 0%.
    expect(r.orden).toEqual(['aumentar', 'consolidar']);
    expect(r.razon).toMatch(/no cobran tasas altas/i);
  });

  it('capacidad negativa cuando ingreso < fijos + cuotas', () => {
    const r = recomendarPalanca(dos(), { ingresoMensual: 100_000, fijosMensuales: 200_000 });
    expect(r.capacidad).toBe(100_000 - 200_000 - 200_000); // -300.000
    expect(r.tieneCapacidad).toBe(false);
  });

  it('sin contexto: capacidad = -Σ cuotas, sin margen', () => {
    const r = recomendarPalanca(dos());
    expect(r.capacidad).toBe(-200_000);
    expect(r.tieneCapacidad).toBe(false);
  });

  it('disponibilidad: renegociar exige tasa > 0; consolidar exige ≥ 2 deudas', () => {
    // Una sola deuda: consolidar no aplica.
    const una = recomendarPalanca([dp({ tasaEA: 0.30 })], { ingresoMensual: 0, fijosMensuales: 0 });
    expect(una.orden).not.toContain('consolidar');
    expect(una.orden).toContain('aumentar');

    // Todas en 0%: renegociar no aplica.
    const cero = recomendarPalanca(dos({ tasaEA: 0 }, { tasaEA: 0 }), { ingresoMensual: 0, fijosMensuales: 0 });
    expect(cero.orden).not.toContain('renegociar');
  });

  it('umbral de capacidad: 20.000 exactos ya cuentan como margen', () => {
    // 2 cuotas de 100.000, fijos 0. ingreso 220.000 → capacidad 20.000 (umbral).
    const enUmbral = recomendarPalanca(dos({ tasaEA: 0 }, { tasaEA: 0 }), { ingresoMensual: 220_000, fijosMensuales: 0 });
    expect(enUmbral.capacidad).toBe(20_000);
    expect(enUmbral.tieneCapacidad).toBe(true);
    expect(enUmbral.razon).toMatch(/dinero libre/i);

    // Un peso menos ya no alcanza el umbral: cambia la razón.
    const bajoUmbral = recomendarPalanca(dos({ tasaEA: 0 }, { tasaEA: 0 }), { ingresoMensual: 219_999, fijosMensuales: 0 });
    expect(bajoUmbral.tieneCapacidad).toBe(false);
    expect(bajoUmbral.razon).toMatch(/no cobran tasas altas/i);
  });

  it('umbral de tasa alta: 25% EA cuenta como cara; 24% no', () => {
    const alta = recomendarPalanca(
      dos({ tasaEA: 0.25 }, { tasaEA: 0.10 }),
      { ingresoMensual: 500_000, fijosMensuales: 300_000 },
    );
    expect(alta.principal).toBe('renegociar'); // hay una deuda cara

    const noAlta = recomendarPalanca(
      dos({ tasaEA: 0.24 }, { tasaEA: 0.10 }),
      { ingresoMensual: 500_000, fijosMensuales: 300_000 },
    );
    expect(noAlta.principal).toBe('aumentar'); // ninguna supera el umbral
  });

  it('invariante: principal es siempre orden[0] y el orden solo trae palancas disponibles', () => {
    const escenarios = [
      recomendarPalanca(dos({ tasaEA: 0.30 }, { tasaEA: 0.30 }), { ingresoMensual: 3_000_000, fijosMensuales: 0 }),
      recomendarPalanca(dos({ tasaEA: 0.30 }, { tasaEA: 0.05 }), { ingresoMensual: 400_000, fijosMensuales: 300_000 }),
      recomendarPalanca(dos({ tasaEA: 0 }, { tasaEA: 0 }), { ingresoMensual: 0, fijosMensuales: 0 }),
    ];
    for (const r of escenarios) {
      expect(r.principal).toBe(r.orden[0]);
      const permitidas = ['aumentar', 'renegociar', 'consolidar'];
      for (const id of r.orden) expect(permitidas).toContain(id);
      // sin duplicados
      expect(new Set(r.orden).size).toBe(r.orden.length);
    }
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

  it('expone la cuota mensual como monto en deudas vencidas (regresión: mostraba $0)', () => {
    const result = detectarVencidosCompletos([
      comp({ id: 'a', tipo: 'fijo', diaPago: 1 }),
      comp({
        id: 'b', tipo: 'deuda-entidad', diaPago: 1,
        monto: undefined, cuotaMensual: 410_000, saldoTotal: 5_800_000,
      }),
    ], '2026-05-15');
    expect(result.find(r => r.id === 'a').monto).toBe(1_500_000);
    expect(result.find(r => r.id === 'b').monto).toBe(410_000);
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

// ── vencidosSinPagar (CAL.5b) ─────────────────────────────────────

describe('vencidosSinPagar', () => {
  const fijo = { id: 'f1', descripcion: 'Arriendo', tipo: 'fijo', monto: 900_000,
                 activo: true, diaPago: 5, frecuencia: 'Mensual' };
  const deuda = { id: 'd1', descripcion: 'Visa', tipo: 'deuda-entidad', cuotaMensual: 300_000,
                  saldoTotal: 2_000_000, activo: true, diaPago: 5, frecuencia: 'Mensual' };

  it('sin gastos devuelve lo mismo que detectarVencidosCompletos', () => {
    expect(vencidosSinPagar([fijo, deuda], [], '2026-06-15').map(v => v.id))
      .toEqual(detectarVencidosCompletos([fijo, deuda], '2026-06-15').map(v => v.id));
  });

  it('esconde el fijo que ya tiene un gasto vinculado este mes', () => {
    const gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-06-05', monto: 900_000 }];
    expect(vencidosSinPagar([fijo, deuda], gastos, '2026-06-15').map(v => v.id)).toEqual(['d1']);
  });

  it('un gasto de otro mes no esconde nada', () => {
    const gastos = [{ id: 'g1', compromisoId: 'f1', fecha: '2026-05-05', monto: 900_000 }];
    expect(vencidosSinPagar([fijo], gastos, '2026-06-15').map(v => v.id)).toEqual(['f1']);
  });

  it('la deuda con abono PARCIAL sigue pendiente; solo sale cuando cubre la cuota', () => {
    const parcial = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-07', monto: 100_000 }];
    expect(vencidosSinPagar([deuda], parcial, '2026-06-15').map(v => v.id)).toEqual(['d1']);

    const completo = [{ id: 'g1', compromisoId: 'd1', fecha: '2026-06-07', monto: 300_000 }];
    expect(vencidosSinPagar([deuda], completo, '2026-06-15')).toEqual([]);
  });

  it('tolera entradas inválidas y hoyISO sin forma de fecha', () => {
    expect(vencidosSinPagar([], [], '2026-06-15')).toEqual([]);
    expect(vencidosSinPagar([fijo], null, '2026-06-15').map(v => v.id)).toEqual(['f1']);
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

// ── sumarMontos (IN.1) ────────────────────────────────────────────

describe('sumarMontos', () => {
  it('devuelve 0 con lista vacia, nula o invalida', () => {
    expect(sumarMontos([])).toBe(0);
    expect(sumarMontos(null)).toBe(0);
    expect(sumarMontos(undefined)).toBe(0);
    expect(sumarMontos('foo')).toBe(0);
  });

  it('suma el campo monto de cada item', () => {
    const items = [{ monto: 100_000 }, { monto: 50_000 }, { monto: 25_000 }];
    expect(sumarMontos(items)).toBe(175_000);
  });

  it('usa cuotaMensual cuando monto no esta presente (deudas, v6)', () => {
    const items = [{ monto: 100_000 }, { cuotaMensual: 300_000 }];
    expect(sumarMontos(items)).toBe(400_000);
  });

  it('ignora items sin monto ni cuotaMensual valido', () => {
    const items = [{ monto: 100_000 }, { descripcion: 'sin cifra' }, { monto: NaN }];
    expect(sumarMontos(items)).toBe(100_000);
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

  it('sin cuentas: estado vacío con CTA que lleva a crear la cuenta, sin form', () => {
    S.cuentas = [];
    const html = renderFormAbono(deuda);
    expect(html).not.toContain('form-abono');
    expect(html).toContain('cuenta activa');
    // No se queda en informar: ofrece la acción directa para resolver el bloqueo.
    expect(html).toContain('data-action="ir-a-crear-cuenta"');
    expect(html).toContain('Crear una cuenta');
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

  it('D.15a: incluye el refuerzo psicológico antes de los botones del modal', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 1_000_000)];
    const html = renderFormAbono(deuda);
    expect(html).toContain('un paso real hacia quedar libre de esta deuda');
    const posRefuerzo = html.indexOf('paso real hacia quedar libre');
    const posFooter   = html.indexOf('modal__footer');
    expect(posRefuerzo).toBeGreaterThan(-1);
    expect(posRefuerzo).toBeLessThan(posFooter);
  });
});

// ── renderFormDeuda() - selector de tipo de obligación ────────────

describe('renderFormDeuda() - selector de categoría', () => {
  // FORM.1b (ADR 042 D4): la categoría son chips de ícono (radios reales
  // name="categoria"), no un <select>. El contrato de datos no cambia.

  it('incluye un chip (radio + ícono) por cada categoría de CATEGORIAS_DEUDA (ID.3)', () => {
    const html = renderFormDeuda('deuda-entidad');
    expect(html).not.toContain('<select id="comp-categoria"');
    for (const c of CATEGORIAS_DEUDA) {
      expect(html).toContain(`value="${c}"`);
      expect(html).toContain(`>${c}</span>`);
    }
  });

  it('D.10: entidad usa catálogo de producto, personal usa catálogo de relación', () => {
    const htmlEntidad  = renderFormDeuda('deuda-entidad');
    const htmlPersonal = renderFormDeuda('deuda-personal');
    expect(htmlEntidad).toContain('Libre inversión');
    expect(htmlEntidad).not.toContain('Familiar');
    for (const c of CATEGORIAS_DEUDA_PERSONAL) {
      expect(htmlPersonal).toContain(`value="${c}"`);
    }
    expect(htmlPersonal).not.toContain('Tarjeta de crédito');
  });

  it('en modo edición marca el chip de la categoría guardada', () => {
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true,
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    expect(html).toMatch(/value="Tarjeta de crédito"[^>]*checked/);
  });

  it('en modo creación ningún chip de categoría viene marcado', () => {
    const html = renderFormDeuda('deuda-personal');
    const div = document.createElement('div');
    div.innerHTML = html;
    const marcados = div.querySelectorAll('input[name="categoria"]:checked');
    expect(marcados).toHaveLength(0);
  });

  it('D.13: la cuota es opcional (sin required) solo en el form personal', () => {
    const htmlEntidad  = renderFormDeuda('deuda-entidad');
    const htmlPersonal = renderFormDeuda('deuda-personal');
    const cuotaEntidad  = htmlEntidad.match(/<input id="comp-cuota"[\s\S]*?\/>/)[0];
    const cuotaPersonal = htmlPersonal.match(/<input id="comp-cuota"[\s\S]*?\/>/)[0];
    expect(cuotaEntidad).toContain('required');
    expect(cuotaPersonal).not.toContain('required');
  });

  // ── D.15b: reorden del form (categoría/tipo antes que descripción) ──

  it('D.15b: el campo de categoría aparece antes que la descripción (mismo patrón que TX.9a)', () => {
    const html = renderFormDeuda('deuda-entidad');
    const posCategoria   = html.indexOf('chips-cat');
    const posDescripcion = html.indexOf('id="comp-descripcion"');
    expect(posCategoria).toBeGreaterThan(-1);
    expect(posDescripcion).toBeGreaterThan(-1);
    expect(posCategoria).toBeLessThan(posDescripcion);
  });

  it('FORM.1a/D2 se aplica también aquí: el saldo total vive en un monto hero', () => {
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('monto-hero__box');
    expect(html).toContain('input--big-amount');
  });

  it('FORM.1b: el segmented Entidad/Personal solo aparece al crear, no al editar', () => {
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true,
    };
    const htmlCrear = renderFormDeuda('deuda-entidad');
    const htmlEditar = renderFormDeuda('deuda-entidad', deuda);
    expect(htmlCrear).toContain('tipo-segmented');
    expect(htmlEditar).not.toContain('tipo-segmented');
  });

  it('D.15b: el hint de bajo valor "si es una tienda que te fía" se retiró del form personal', () => {
    const html = renderFormDeuda('deuda-personal');
    expect(html).not.toContain('tienda que te fía');
    // El campo de categoría personal ya lista "Fiado" como opción: no hace
    // falta un hint aparte que lo repita.
    expect(html).toContain('Fiado');
  });

  it('D.15b: el hint de tasa desconocida (D.12) se conserva íntegro', () => {
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('¿No conoces tu tasa?');
    expect(html).toContain('comp-tasa-hint');
  });
});

// ── CAT.2d: picker de ícono para la categoría 'Otra'/'Otro' ───────

describe('renderFormDeuda() - picker de ícono (CAT.2d)', () => {
  it('en modo creación, el grupo del picker viene oculto (ninguna categoría elegida aún)', () => {
    const html = renderFormDeuda('deuda-entidad');
    const grupo = html.match(/<div class="form-group"[^>]*id="grupo-comp-icono"[^>]*>/)[0];
    expect(grupo).toContain('hidden');
  });

  it('en modo edición con categoría "Otra" (entidad), el grupo viene visible y con el ícono guardado', () => {
    const deuda = {
      id: 'd1', descripcion: 'Deuda rara', tipo: 'deuda-entidad',
      saldoTotal: 500_000, cuotaMensual: 50_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Otra', icono: 'c-avion', activo: true,
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    const grupo = html.match(/<div class="form-group"[^>]*id="grupo-comp-icono"[^>]*>/)[0];
    expect(grupo).not.toContain('hidden');
    expect(html).toContain('aria-pressed="true"');
  });

  it('en modo edición con categoría "Otro" (personal), el grupo viene visible', () => {
    const deuda = {
      id: 'd1', descripcion: 'Préstamo raro', tipo: 'deuda-personal',
      saldoTotal: 500_000, cuotaMensual: 50_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Otro', icono: 'c-pesa', activo: true,
    };
    const html = renderFormDeuda('deuda-personal', deuda);
    const grupo = html.match(/<div class="form-group"[^>]*id="grupo-comp-icono"[^>]*>/)[0];
    expect(grupo).not.toContain('hidden');
  });

  it('en modo edición con una categoría fija (no "Otra"), el grupo del picker queda oculto', () => {
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 500_000, cuotaMensual: 50_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true,
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    const grupo = html.match(/<div class="form-group"[^>]*id="grupo-comp-icono"[^>]*>/)[0];
    expect(grupo).toContain('hidden');
  });

  it('el picker usa el catálogo compartido ICONOS_CATEGORIA_PERSONALIZADA (mismo id que Gastos/Metas/Apartados)', () => {
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('data-icono-picker="comp-icono"');
  });
});

// ── MC.13e-2c: nota opcional (mismo patrón que Meta/Apartado) ─────

describe('renderFormDeuda() - nota opcional (MC.13e-2c)', () => {
  it('incluye el campo de nota, vacío en modo creación', () => {
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('id="comp-nota"');
    expect(html).toContain('name="nota"');
    expect(html).toMatch(/id="comp-nota"[^>]*value=""/);
  });

  it('en modo edición, prellena la nota guardada', () => {
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true, nota: 'Termina en 4532',
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    expect(html).toMatch(/id="comp-nota"[^>]*value="Termina en 4532"/);
  });

  it('funciona igual en el form de deuda personal', () => {
    const html = renderFormDeuda('deuda-personal');
    expect(html).toContain('id="comp-nota"');
  });
});

// ── D.14: acreditar la cuenta de origen al crear una deuda ────────

describe('renderFormDeuda() - bloque de cuenta de origen (D.14)', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas activas: no ofrece el bloque (nada que acreditar)', () => {
    S.cuentas = [];
    const html = renderFormDeuda('deuda-entidad');
    expect(html).not.toContain('comp-recibio-dinero');
    expect(html).not.toContain('grupo-comp-cuenta-origen');
  });

  it('con cuentas activas: checkbox apagado por defecto y selector oculto', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia'), cuenta('c2', 'Nequi')];
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('id="comp-recibio-dinero"');
    expect(html).not.toMatch(/id="comp-recibio-dinero"[^>]*checked/);
    expect(html).toMatch(/id="grupo-comp-cuenta-origen"[^>]*hidden/);
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
  });

  it('TX.11: el switch usa el componente único .toggle de atoms.css, no .toggle-switch', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia')];
    const html = renderFormDeuda('deuda-entidad');
    expect(html).toContain('class="toggle"');
    expect(html).toContain('toggle__track');
    expect(html).not.toContain('toggle-switch');
  });

  it('solo se ofrece en modo creación, nunca al editar (no reacreditar dos veces)', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia')];
    const deuda = {
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', activo: true,
    };
    const html = renderFormDeuda('deuda-entidad', deuda);
    expect(html).not.toContain('comp-recibio-dinero');
    expect(html).not.toContain('grupo-comp-cuenta-origen');
  });

  it('cuentas inactivas no cuentan para ofrecer el bloque', () => {
    S.cuentas = [{ ...cuenta('c1', 'Cerrada'), activa: false }];
    const html = renderFormDeuda('deuda-personal');
    expect(html).not.toContain('comp-recibio-dinero');
  });
});

// ── D.10/D.13 - deuda personal: relación y cuota opcional ─────────

describe('D.10/D.13 - validación y normalización de deuda personal', () => {
  const fiado = {
    tipo: 'deuda-personal', descripcion: 'Fiado tienda de don José',
    saldoTotal: '80000', cuotaMensual: '', tasa: '', tasaUnidad: 'mensual',
    frecuencia: 'Mensual', diaPago: '28', categoria: 'Fiado',
  };

  it('acepta una deuda personal sin cuota (fiado se abona libre)', () => {
    expect(validarCompromiso(fiado)).toEqual([]);
  });

  it('si la cuota viene diligenciada debe ser mayor a 0', () => {
    expect(validarCompromiso({ ...fiado, cuotaMensual: '0' }))
      .toContainEqual(expect.stringMatching(/cuota/i));
    expect(validarCompromiso({ ...fiado, cuotaMensual: '-5' }))
      .toContainEqual(expect.stringMatching(/cuota/i));
  });

  it('la cuota sigue siendo obligatoria en deuda con entidad', () => {
    const ent = { ...fiado, tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', tasaUnidad: 'EA' };
    expect(validarCompromiso(ent)).toContainEqual(expect.stringMatching(/cuota/i));
  });

  it('valida la categoría contra el catálogo del tipo (relación vs producto)', () => {
    expect(validarCompromiso({ ...fiado, categoria: 'Familiar' })).toEqual([]);
    expect(validarCompromiso({ ...fiado, categoria: 'Tarjeta de crédito' }))
      .toContainEqual(expect.stringMatching(/categoría/i));
    const ent = {
      ...fiado, tipo: 'deuda-entidad', cuotaMensual: '100000',
      tasaUnidad: 'EA', categoria: 'Familiar',
    };
    expect(validarCompromiso(ent)).toContainEqual(expect.stringMatching(/categoría/i));
  });

  it('normaliza cuota vacía a 0 y conserva la relación', () => {
    const r = normalizarCompromiso(fiado);
    expect(r.cuotaMensual).toBe(0);
    expect(r.categoria).toBe('Fiado');
    expect(r.tasa).toBe(0);
  });

  it('normaliza a null una categoría fuera del catálogo del tipo', () => {
    const r = normalizarCompromiso({ ...fiado, categoria: 'Vivienda' });
    expect(r.categoria).toBeNull();
  });

  it('una deuda sin cuota queda fuera del simulador de estrategia', () => {
    const deudas = filtrarDeudasPagables([
      { id: 'a', tipo: 'deuda-personal', descripcion: 'Fiado', saldoTotal: 80_000, cuotaMensual: 0, activo: true },
      { id: 'b', tipo: 'deuda-entidad',  descripcion: 'Tarjeta', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.3, tasaUnidad: 'EA', activo: true },
    ]);
    expect(deudas.map(d => d.id)).toEqual(['b']);
  });
});

// ── CATEGORIAS_DEUDA_PERSONAL (D.10) ─────────────────────────────

describe('CATEGORIAS_DEUDA_PERSONAL', () => {
  it('contiene las relaciones esperadas, con Fiado incluido (D.13)', () => {
    expect(CATEGORIAS_DEUDA_PERSONAL).toContain('Familiar');
    expect(CATEGORIAS_DEUDA_PERSONAL).toContain('Natillera');
    expect(CATEGORIAS_DEUDA_PERSONAL).toContain('Prestamista particular');
    expect(CATEGORIAS_DEUDA_PERSONAL).toContain('Fiado');
  });

  it('tiene un ícono para cada relación y ninguno huérfano', () => {
    for (const c of CATEGORIAS_DEUDA_PERSONAL) {
      expect(CATEGORIA_DEUDA_PERSONAL_ICONO[c]).toBeTruthy();
    }
    for (const key of Object.keys(CATEGORIA_DEUDA_PERSONAL_ICONO)) {
      expect(CATEGORIAS_DEUDA_PERSONAL).toContain(key);
    }
  });
});

// ── renderListaCompromisos() - categoría como chip (ID.3, D.16d) ──

describe('renderListaCompromisos() - categoría como chip', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    S.compromisos = [];
  });

  it('muestra la categoría como chip tintado y su glifo en la teja (ID.3/D.16d)', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Tarjeta de crédito', tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const chipCat = document.querySelector('.deuda-card__chip--entidad');
    expect(chipCat).not.toBeNull();
    expect(chipCat.textContent).toContain('Tarjeta de crédito');
    const teja = document.querySelector('.deuda-card__icon .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.getAttribute('data-dom')).toBe('compromisos');
    expect(teja.innerHTML).toContain(`#${CATEGORIA_DEUDA_ICONO['Tarjeta de crédito']}`);
  });

  it('CAT.2d: categoría "Otra" con ícono elegido por el usuario prevalece sobre el fijo c-otros', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Deuda de viaje', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Otra', icono: 'c-avion', tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const teja = document.querySelector('.deuda-card__icon .cat-teja');
    expect(teja.innerHTML).toContain('#c-avion');
    expect(teja.innerHTML).not.toContain('#c-otros');
    const chipCat = document.querySelector('.deuda-card__chip--entidad');
    expect(chipCat.innerHTML).toContain('#c-avion');
  });

  it('CAT.2d: categoría "Otra" sin ícono elegido conserva el fijo c-otros del catálogo', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Deuda sin ícono', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: 'Otra', tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const teja = document.querySelector('.deuda-card__icon .cat-teja');
    expect(teja.innerHTML).toContain(`#${CATEGORIA_DEUDA_ICONO['Otra']}`);
  });

  it('sin categoría, el chip muestra el tipo y la tasa va en su propio chip', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
      saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
      diaPago: 5, categoria: null, tasa: 0.28, tasaUnidad: 'EA', activo: true,
    }];
    renderListaCompromisos();
    const chipCat = document.querySelector('.deuda-card__chip--entidad');
    expect(chipCat.textContent).toContain('Deuda con entidad');
    const chips = document.querySelectorAll('.deuda-card__chips .chip');
    expect([...chips].some(c => c.textContent.includes('28% EA'))).toBe(true);
  });
});

// ── renderListaCompromisos() - teja de marca (MK.2) ───────────────

describe('renderListaCompromisos() - teja de marca en el ícono', () => {
  const deudaBase = (overrides = {}) => ({
    id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
    saldoTotal: 2_000_000, cuotaMensual: 200_000, frecuencia: 'Mensual',
    diaPago: 5, categoria: null, tasa: 0.28, tasaUnidad: 'EA', activo: true,
    ...overrides,
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    S.compromisos = [];
  });

  it('una deuda que nombra una billetera con glifo muestra su teja de marca', () => {
    S.compromisos = [deudaBase({ descripcion: 'Crédito Nequi' })];
    renderListaCompromisos();
    const teja = document.querySelector('.deuda-card__icon .bank-avatar');
    expect(teja).not.toBeNull();
    expect(teja.innerHTML).toContain('#b-nequi');
  });

  it('una deuda que nombra una marca sin glifo muestra sus iniciales sobre su color', () => {
    // Con BR.3 completo, todo banco/billetera real del catálogo ya tiene
    // glifo propio; ChatGPT (MARCAS) sigue sin símbolo y ejemplifica el
    // fallback de iniciales.
    S.compromisos = [deudaBase({ descripcion: 'Suscripción ChatGPT' })];
    renderListaCompromisos();
    const teja = document.querySelector('.deuda-card__icon .bank-avatar');
    expect(teja).not.toBeNull();
    expect(teja.textContent).toBe('AI');
    expect(teja.getAttribute('style')).toContain('background:#10A37F');
  });

  it('sin marca reconocida en el nombre, conserva el ícono genérico del tipo', () => {
    S.compromisos = [deudaBase({ descripcion: 'Tarjeta Visa' })];
    renderListaCompromisos();
    expect(document.querySelector('.deuda-card__icon .bank-avatar')).toBeNull();
    expect(document.querySelector('.deuda-card__icon svg')).not.toBeNull();
  });
});

// ── renderAlertaDeudasDurmiendo() ────────────────────────────────

describe('renderAlertaDeudasDurmiendo() - saldo pendiente (regresión $NaN)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="nudge-deudas-durmiendo"></div>';
    S.compromisos = [];
  });

  it('muestra el saldoTotal formateado de la deuda, nunca NaN', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Préstamo moto', tipo: 'deuda-entidad',
      saldoTotal: 5_800_000, cuotaMensual: 410_000, frecuencia: 'Mensual',
      diaPago: 2, activo: true, fechaCreacion: '2025-01-15T10:00:00Z',
    }];
    renderAlertaDeudasDurmiendo();
    const html = document.getElementById('nudge-deudas-durmiendo').innerHTML;
    expect(html).toContain('$5.800.000 pendiente');
    expect(html).not.toContain('NaN');
  });
});

// ── renderPanelPrioridades() ─────────────────────────────────────

describe('renderPanelPrioridades() - monto por tipo (regresión: deudas sin cifra)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-prioridades"></div>';
    S.compromisos = [];
    S.personales  = [];
    S.apartados   = [];
  });

  it('muestra la cuota mensual de una deuda próxima a vencer', () => {
    S.compromisos = [{
      id: 'd1', descripcion: 'Préstamo moto', tipo: 'deuda-entidad',
      saldoTotal: 5_800_000, cuotaMensual: 410_000, frecuencia: 'Mensual',
      diaPago: DIA_MANANA, activo: true, fechaCreacion: '2025-01-15T10:00:00Z',
    }];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).toContain('Préstamo moto');
    expect(html).toContain('$410.000');
  });

  it('sigue mostrando el monto de los gastos fijos', () => {
    S.compromisos = [compromisoBase({ diaPago: DIA_MANANA })];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).toContain('$1.500.000');
  });

  it('muestra el total de próximas prioridades al pie (IN.1)', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Arriendo', monto: 1_500_000, diaPago: DIA_MANANA }),
      { id: 'd1', descripcion: 'Préstamo moto', tipo: 'deuda-entidad',
        saldoTotal: 5_800_000, cuotaMensual: 410_000, frecuencia: 'Mensual',
        diaPago: DIA_MANANA, activo: true, fechaCreacion: '2025-01-15T10:00:00Z' },
    ];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).toContain('Total de próximas prioridades');
    expect(html).toContain('$1.910.000');
  });

  it('no muestra el total en el estado "Todo al día" (hay activos pero ninguno en 7 días)', () => {
    S.compromisos = [compromisoBase({ diaPago: DIA_FUTURO })]; // fuera de la ventana de 7 días
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).toContain('Todo al día');
    expect(html).not.toContain('prioridades-card__total');
  });

  it('no duplica un compromiso que vence hoy: solo vive en Pendientes del mes (IN.7)', () => {
    S.compromisos = [compromisoBase({ id: 'c1', descripcion: 'Arriendo', diaPago: DIA_HOY })];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).not.toContain('Arriendo');
    expect(html).toContain('Todo al día');
  });

  it('sí muestra un préstamo personal o apartado que vence hoy (no tienen panel de vencidos propio)', () => {
    S.compromisos = [];
    S.personales  = [{ id: 'p1', persona: 'Juan', monto: 100_000, pagado: 0, liquidado: false,
      fechaLimite: new Date().toISOString().slice(0, 10) }];
    renderPanelPrioridades();
    const html = document.getElementById('panel-prioridades').innerHTML;
    expect(html).toContain('Juan te debe');
  });
});

// ── renderPanelVencidos() - total al pie (IN.1) ──────────────────

describe('renderPanelVencidos() - total al pie (IN.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-vencidos"></div>';
    S.compromisos = [];
  });

  // La lista mezcla gastos fijos y cuotas de deuda, así que "gastos vencidos"
  // nombraba mal la suma.
  it('muestra el total pendiente de pago al pie', () => {
    // diaPago: 1 siempre vence si hoy es el día 2 o después del mes (nunca choca con hoy).
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Arriendo', monto: 900_000, diaPago: 1 }),
      compromisoBase({ id: 'c2', descripcion: 'Servicios', monto: 150_000, diaPago: 1 }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('Total pendiente de pago');
    expect(html).toContain('$1.050.000');
  });

  it('no renderiza nada (ni total) cuando no hay vencidos', () => {
    renderPanelVencidos();
    const el = document.getElementById('panel-vencidos');
    expect(el.hidden).toBe(true);
    expect(el.innerHTML).toBe('');
  });
});

// ── renderPanelVencidos() - jerarquía sin línea roja (IN.8e, ADR 034 D5) ──

describe('renderPanelVencidos() - jerarquía real sin línea roja (IN.8e, ADR 034 D5)', () => {
  // Todo este bloque necesita un día YA PASADO dentro del mes en curso, y el
  // mes en curso no siempre tiene uno: el día 1 no hay ningún día anterior, y
  // `DIA_PASADO` (que envuelve a módulo 28) devuelve 27, o sea el futuro. El
  // panel salía vacío y 6 tests fallaban los primeros días de cada mes. Se fija
  // el reloj a mitad de mes, misma convención que ya usaban los dos tests de
  // conteo exacto de días.
  const HOY_FIJO = 15;
  const PASADO_FIJO = 13;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, HOY_FIJO)); // 15 julio 2026
    document.body.innerHTML = '<div id="panel-vencidos"></div>';
    S.compromisos = [];
  });

  afterEach(() => { vi.useRealTimers(); });

  it('el título ya no incluye el conteo; el número vive en el badge circular', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', diaPago: PASADO_FIJO }),
      compromisoBase({ id: 'c2', descripcion: 'Netflix', tipo: 'fijo', diaPago: HOY_FIJO }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('Pendientes del mes');
    expect(html).not.toContain('2 pendientes del mes');
    expect(html).toMatch(/vencidos-card__counter[^>]*>2</);
  });

  it('un ítem vencido hace 2 días muestra "Venció hace 2 días" en danger y badge corto "Deuda"', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', diaPago: 13 }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('Venció hace 2 días');
    expect(html).toContain('vencidos-card__estado--danger');
    expect(html).toContain('>Deuda<');
  });

  it('un ítem que vence hoy muestra "Vence hoy" en warning y badge corto "Gasto fijo"', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Netflix', tipo: 'fijo', diaPago: HOY_FIJO }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('Vence hoy');
    expect(html).toContain('vencidos-card__estado--warning');
    expect(html).toContain('>Gasto fijo<');
  });

  it('una deuda personal también usa el badge corto "Deuda"', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Préstamo primo', tipo: 'deuda-personal', diaPago: PASADO_FIJO }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('>Deuda<');
  });

  it('vencido hace 1 día dice "Venció ayer"', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Arriendo', tipo: 'fijo', diaPago: 14 }),
    ];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('Venció ayer');
  });

  it('sin línea roja de alarma: la tarjeta no lleva border-left en su clase base', () => {
    S.compromisos = [compromisoBase({ diaPago: PASADO_FIJO })];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).not.toContain('vencidos-card__item--leve');
    expect(html).not.toContain('vencidos-card__item--moderada');
    expect(html).not.toContain('vencidos-card__item--urgente');
  });

  it('"Ver calendario" lleva a #agenda (Calendario), no a #compromisos', () => {
    S.compromisos = [compromisoBase({ diaPago: PASADO_FIJO })];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).toContain('href="#agenda"');
    expect(html).not.toContain('href="#compromisos"');
    expect(html).toContain('aria-label="Ir al calendario"');
  });

  // ── CAL.5b: pagar el lote desde Inicio ──────────────────────────

  it('con 2 o más pendientes ofrece "Pagar los N" con la acción del lote', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Arriendo', tipo: 'fijo', diaPago: PASADO_FIJO }),
      compromisoBase({ id: 'c2', descripcion: 'Netflix',  tipo: 'fijo', diaPago: HOY_FIJO }),
    ];
    renderPanelVencidos();
    const btn = document.querySelector('.vencidos-card__pagar');
    expect(btn).not.toBeNull();
    expect(btn.dataset.action).toBe('inicio-pagar-lote');
    expect(btn.textContent.trim()).toBe('Pagar los 2');
  });

  it('con un solo pendiente no ofrece el lote (no ahorra nada)', () => {
    S.compromisos = [compromisoBase({ id: 'c1', tipo: 'fijo', diaPago: PASADO_FIJO })];
    renderPanelVencidos();
    expect(document.querySelector('.vencidos-card__pagar')).toBeNull();
  });

  it('lo ya pagado este mes no se lista ni cuenta para el CTA', () => {
    S.compromisos = [
      compromisoBase({ id: 'c1', descripcion: 'Arriendo', tipo: 'fijo', diaPago: PASADO_FIJO }),
      compromisoBase({ id: 'c2', descripcion: 'Netflix',  tipo: 'fijo', diaPago: HOY_FIJO }),
    ];
    S.gastos = [{ id: 'g1', compromisoId: 'c1', fecha: '2026-07-13', monto: 900_000 }];
    renderPanelVencidos();
    const html = document.getElementById('panel-vencidos').innerHTML;
    expect(html).not.toContain('Arriendo');
    expect(html).toContain('Netflix');
    expect(document.querySelector('.vencidos-card__pagar')).toBeNull();
    S.gastos = [];
  });
});

describe('renderPanelVencidos() - los que no caben se declaran, no se esconden', () => {
  // Mismo motivo que el describe de arriba: el día 1 del mes no tiene ningún
  // día anterior, así que el reloj se fija a mitad de mes para que "vencido"
  // exista siempre.
  const vencidosN = n => Array.from({ length: n }, (_, i) => compromisoBase({
    id: `c${i}`, descripcion: `Fijo ${i}`, monto: 10_000, diaPago: 13,
  }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15)); // 15 julio 2026
    document.body.innerHTML = '<div id="panel-vencidos"></div>';
    S.compromisos = [];
  });

  afterEach(() => { vi.useRealTimers(); });

  it('con 4 o menos: todas las filas, sin fila "Ver los N"', () => {
    S.compromisos = vencidosN(4);
    renderPanelVencidos();
    const panel = document.getElementById('panel-vencidos');
    expect(panel.querySelectorAll('.vencidos-card__item')).toHaveLength(4);
    expect(panel.querySelector('.vencidos-card__ver-mas')).toBeNull();
  });

  it('con 6: 4 filas y la salida explícita al calendario con el conteo real', () => {
    S.compromisos = vencidosN(6);
    renderPanelVencidos();
    const panel = document.getElementById('panel-vencidos');
    expect(panel.querySelectorAll('.vencidos-card__item')).toHaveLength(4);
    const verMas = panel.querySelector('.vencidos-card__ver-mas');
    expect(verMas.textContent).toBe('Ver los 6 en el calendario');
    expect(verMas.getAttribute('href')).toBe('#agenda');
    // El contador del header sigue nombrando el total, no lo visible.
    expect(panel.querySelector('.vencidos-card__counter').textContent).toBe('6');
  });

  it('el total suma los 6, no solo las 4 filas visibles', () => {
    S.compromisos = vencidosN(6);
    renderPanelVencidos();
    const panel = document.getElementById('panel-vencidos');
    expect(panel.querySelector('.vencidos-card__total-amount').textContent).toBe('$60.000');
  });
});

describe('renderPanelPrioridades() - anatomía de fila igual a Pendientes del mes', () => {
  // Fecha local (no UTC) a N días de hoy: el panel compara contra el día
  // visible al usuario, igual que la vista.
  const _fechaEnDias = n => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-prioridades"></div>';
    S.compromisos = [];
    S.personales  = [];
    S.apartados   = [];
  });

  it('el glifo va en un chip con fondo y color separados, no en un cal-dot', () => {
    S.compromisos = [compromisoBase({ diaPago: DIA_MANANA })];
    renderPanelPrioridades();
    const panel = document.getElementById('panel-prioridades');
    // cal-dot pinta background y color al mismo tono: el ícono se volvía
    // invisible sobre su propio fondo.
    expect(panel.innerHTML).not.toContain('cal-dot--');
    expect(panel.querySelector('.prioridades-card__icon--fijo')).not.toBeNull();
  });

  it('el badge de tipo baja a la segunda línea, dentro de __meta', () => {
    S.compromisos = [compromisoBase({ descripcion: 'Arriendo', diaPago: DIA_MANANA })];
    renderPanelPrioridades();
    const panel = document.getElementById('panel-prioridades');
    expect(panel.querySelector('.prioridades-card__meta .dom-badge')).not.toBeNull();
    expect(panel.querySelector('.prioridades-card__body .prioridades-card__name').textContent)
      .toBe('Arriendo');
  });

  it('el h2 no lleva ícono inline: un solo patrón de header de card', () => {
    S.compromisos = [compromisoBase({ diaPago: DIA_MANANA })];
    renderPanelPrioridades();
    const titulo = document.querySelector('.prioridades-card__title');
    expect(titulo.querySelector('svg')).toBeNull();
    expect(titulo.textContent.trim()).toBe('Próximas prioridades');
  });

  it('un apartado usa su propio chip, no el de gasto fijo', () => {
    S.apartados = [{
      id: 'a1', nombre: 'SOAT moto', montoObjetivo: 120_000, montoActual: 0,
      fechaObjetivo: _fechaEnDias(3), completado: false,
    }];
    renderPanelPrioridades();
    const panel = document.getElementById('panel-prioridades');
    expect(panel.querySelector('.prioridades-card__icon--apartado')).not.toBeNull();
    expect(panel.querySelector('.prioridades-card__icon--fijo')).toBeNull();
  });

  // Regresión: `icono` admite id del catálogo o emoji legacy (CAT.2c). Solo se
  // escapaba, así que el id salía como texto plano dentro del chip.
  it('un apartado con id del catálogo pinta el símbolo, no el texto "c-carro"', () => {
    S.apartados = [{
      id: 'a1', nombre: 'SOAT moto', montoObjetivo: 120_000, montoActual: 0,
      fechaObjetivo: _fechaEnDias(3), completado: false, icono: 'c-carro',
    }];
    renderPanelPrioridades();
    const chip = document.querySelector('.prioridades-card__icon--apartado');
    expect(chip.querySelector('use').getAttribute('href')).toBe('#c-carro');
    expect(chip.textContent).not.toContain('c-carro');
  });

  it('un apartado con emoji legacy lo sigue mostrando tal cual', () => {
    S.apartados = [{
      id: 'a1', nombre: 'SOAT moto', montoObjetivo: 120_000, montoActual: 0,
      fechaObjetivo: _fechaEnDias(3), completado: false, icono: '🛡️',
    }];
    renderPanelPrioridades();
    expect(document.querySelector('.prioridades-card__icon--apartado').textContent.trim())
      .toBe('🛡️');
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

// ── fechaUltimoAbono (FD1) ───────────────────────────────────────

describe('fechaUltimoAbono()', () => {
  const gastos = [
    { compromisoId: 'deuda-1', fecha: '2026-06-05', monto: 20_000 },
    { compromisoId: 'deuda-1', fecha: '2026-07-22', monto: 30_000 },
    { compromisoId: 'deuda-1', fecha: '2026-05-15', monto: 100_000 },
    { compromisoId: 'deuda-2', fecha: '2026-12-10', monto: 50_000 },
  ];

  it('devuelve la fecha más reciente de los abonos del compromiso', () => {
    expect(fechaUltimoAbono(gastos, 'deuda-1')).toBe('2026-07-22');
  });

  it('no mira los abonos de otro compromiso', () => {
    expect(fechaUltimoAbono(gastos, 'deuda-2')).toBe('2026-12-10');
  });

  it('devuelve null si el compromiso no tiene abonos', () => {
    expect(fechaUltimoAbono(gastos, 'deuda-99')).toBeNull();
  });

  it('devuelve null con entradas vacías o inválidas', () => {
    expect(fechaUltimoAbono([], 'deuda-1')).toBeNull();
    expect(fechaUltimoAbono(null, 'deuda-1')).toBeNull();
    expect(fechaUltimoAbono(gastos, '')).toBeNull();
  });

  it('ignora abonos sin fecha', () => {
    const g = [{ compromisoId: 'deuda-1', monto: 10_000 }];
    expect(fechaUltimoAbono(g, 'deuda-1')).toBeNull();
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

// ── comparativa D.4: frases que ayudan a decidir Avalancha vs Bola de nieve ──

describe('comparativa Avalancha vs Bola de nieve (D.4)', () => {
  it('escenario clásico: bloque "¿Cómo elegir?" con las dos frases de decisión', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'cara',  descripcion: 'Tarjeta',       saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.40, tasaUnidad: 'EA' }),
      deudaBase({ id: 'chica', descripcion: 'Crédito chico', saldoTotal: 500_000,   cuotaMensual: 50_000,  tasa: 0.10, tasaUnidad: 'EA' }),
    ]);
    const resultado = compararEstrategias(deudas, 100_000);
    // Precondición: las dos estrategias tienen una ventaja real.
    expect(resultado.ahorroIntereses).toBeGreaterThan(0);

    const html = renderImpactoAvalancha(resultado, 100_000);

    expect(html).toContain('¿Cómo elegir?');
    expect(html).toContain('estrategia-card__decidir');
    // Lado Avalancha: ahorro de dinero.
    expect(html).toContain('Avalancha');
    expect(html).toContain('en intereses');
    // Lado Bola de nieve: impulso temprano (cierra antes la primera deuda).
    expect(html).toContain('Bola de nieve');
    expect(html).toContain('cierras tu primera deuda');
    expect(html).toContain('antes');
    // Nunca cifras divergentes.
    expect(html).not.toContain('e+');
  });

  it('empate con extra > 0: ambas dan lo mismo, sin bloque de decisión', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'a', descripcion: 'A', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.20, tasaUnidad: 'EA' }),
      deudaBase({ id: 'b', descripcion: 'B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.20, tasaUnidad: 'EA' }),
    ]);
    const resultado = compararEstrategias(deudas, 50_000);
    const html = renderImpactoAvalancha(resultado, 50_000);

    expect(html).toContain('mismo costo');
    expect(html).not.toContain('¿Cómo elegir?');
  });

  it('empate sin extra: invita a probar la palanca "Aumentar la cuota", sin bloque de decisión', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'a', descripcion: 'A', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.20, tasaUnidad: 'EA' }),
      deudaBase({ id: 'b', descripcion: 'B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.20, tasaUnidad: 'EA' }),
    ]);
    const resultado = compararEstrategias(deudas, 0);
    const html = renderImpactoAvalancha(resultado, 0);

    expect(html).toContain('Aumentar la cuota');
    expect(html).not.toContain('¿Cómo elegir?');
  });
});

// ── renderEstrategiaPago: jerarquía D.15d-2 (orden arriba, palancas abajo) ──

describe('renderEstrategiaPago jerarquía: nivel orden arriba, palancas abajo', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, alternativaActiva: null });
    S.ingresos = [];
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda A', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.28, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.12, tasaUnidad: 'EA' }),
    ];
  });

  it('el picker de orden aparece antes de la sección de palancas en el DOM', () => {
    renderEstrategiaPago();
    const el = document.getElementById('estrategia-pago');
    const picker = el.querySelector('.estrategia-cards');
    const palancas = el.querySelector('.estrategia-card__palancas');
    expect(picker).not.toBeNull();
    expect(palancas).not.toBeNull();
    expect(picker.compareDocumentPosition(palancas) & 4).toBeTruthy();
  });

  it('la sección de palancas es siempre visible (ya no un <details> acelerador)', () => {
    renderEstrategiaPago();
    expect(document.querySelector('.estrategia-card__acelerador')).toBeNull();
    const palancas = document.querySelector('.estrategia-card__palancas');
    expect(palancas).not.toBeNull();
    expect(palancas.querySelector('.estrategia-card__selector')).not.toBeNull();
  });

  it('el input de extra vive en la palanca "Aumentar la cuota", no arriba de la card', () => {
    setEstrategiaUI({ alternativaActiva: 'aumentar' });
    renderEstrategiaPago();
    const remedio = document.querySelector('.estrategia-card__palancas .estrategia-card__remedio');
    const input = remedio.querySelector('#estrategia-extra');
    expect(input).not.toBeNull();
    const header = document.querySelector('.estrategia-card__header');
    expect(header.compareDocumentPosition(input) & 4).toBeTruthy();
  });

  it('el botón "Aplicar este aumento" está siempre en la palanca Aumentar (absorbe D.15e)', () => {
    setEstrategiaUI({ alternativaActiva: 'aumentar', extraMensual: 0 });
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-aumento-cuota"]');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    setEstrategiaUI({ extraMensual: 50_000 });
    renderEstrategiaPago();
    expect(document.querySelector('[data-action="aplicar-aumento-cuota"]').disabled).toBe(false);
  });
});

// ── renderEstrategiaPago: D.16b (ADR 036 D2, picker y comparativa visuales) ──

describe('renderEstrategiaPago D.16b: header, picker e íconos', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0 });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda A', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.28, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.12, tasaUnidad: 'EA' }),
    ];
  });

  it('eyebrow "Estrategia de pago" arriba de la card + header con teja y título nuevo', () => {
    renderEstrategiaPago();
    const el = document.getElementById('estrategia-pago');
    expect(el.querySelector('.grupo-eyebrow').textContent.trim()).toBe('Estrategia de pago');
    expect(el.querySelector('.estrategia-card__header-teja')).not.toBeNull();
    expect(el.querySelector('.estrategia-card__title').textContent.trim()).toBe('¿Cómo salir más rápido?');
  });

  // D9 (regla R1): el encabezado no cambia de nombre según cuántas deudas haya.
  it('D9: con una sola deuda el encabezado es el mismo (eyebrow + "¿Cómo salir más rápido?")', () => {
    S.compromisos = [S.compromisos[0]];
    renderEstrategiaPago();
    const el = document.getElementById('estrategia-pago');
    expect(el.querySelector('.grupo-eyebrow').textContent.trim()).toBe('Estrategia de pago');
    expect(el.querySelector('.estrategia-card__title').textContent.trim()).toBe('¿Cómo salir más rápido?');
    // Lo que cambia es el cuerpo, no la identidad de la card.
    expect(el.querySelector('.estrategia-card__placeholder')).not.toBeNull();
  });

  it('Bola de nieve usa su símbolo propio i-snowball (ya no el círculo genérico)', () => {
    renderEstrategiaPago();
    const pickBola = document.querySelector('[data-estrategia="bolaNieve"]');
    expect(pickBola.innerHTML).toContain('#i-snowball');
    expect(pickBola.innerHTML).not.toContain('#i-circle');
  });

  it('la comparativa usa íconos de sprite en vez de emojis (💰🏆ℹ️ fuera)', () => {
    const deudas = filtrarDeudasPagables(S.compromisos);
    const conVentaja = compararEstrategias(deudas, 100_000);
    const htmlDecidir = renderImpactoAvalancha(conVentaja, 100_000);
    const sinExtra = compararEstrategias(deudas, 0);
    const htmlBase = renderImpactoAvalancha(sinExtra, 0);
    for (const html of [htmlDecidir, htmlBase]) {
      expect(html).not.toMatch(/💰|🏆|ℹ️/u);
    }
  });
});

// ── renderEstrategiaPago: D.16c (ADR 036 D3/D4, acelerador + panel en 2 capas) ──

describe('renderEstrategiaPago D.16c: tiles del selector e íconos sin emoji', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, panelAlternativasAbierto: true, alternativaActiva: 'renegociar' });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda barata', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ];
  });

  it('cada opción del selector es un tile con ícono arriba y nombre abajo', () => {
    renderEstrategiaPago();
    const opciones = document.querySelectorAll('.estrategia-card__selector-opcion');
    expect(opciones.length).toBe(3);
    for (const op of opciones) {
      expect(op.querySelector('.estrategia-card__selector-icono')).not.toBeNull();
      expect(op.querySelector('.estrategia-card__selector-nombre')).not.toBeNull();
    }
  });

  it('Renegociar usa i-handshake en el selector y en el título de la herramienta', () => {
    renderEstrategiaPago();
    const tile = document.querySelector('[data-alternativa="renegociar"]');
    expect(tile.innerHTML).toContain('#i-handshake');
    const tool = document.querySelector('.estrategia-card__remedio--renegociar');
    expect(tool.innerHTML).toContain('#i-handshake');
    expect(tool.innerHTML).not.toContain('🤝');
  });

  // FD5 (regla R8) revisa este test de D.16c: los tres confirmadores dejaron
  // btn-primary y visten la identidad de compromisos, como Abonar (ADR 036 D6).
  it('FD5: los botones Aplicar usan .estrategia-card__aplicar, no el primario verde', () => {
    renderEstrategiaPago();
    const btnRenegociar = document.querySelector('.estrategia-card__renegociar-aplicar');
    expect(btnRenegociar.className).toContain('estrategia-card__aplicar');
    expect(btnRenegociar.className).not.toContain('btn-primary');
    setEstrategiaUI({ alternativaActiva: 'consolidar' });
    renderEstrategiaPago();
    const btnConsolidar = document.querySelector('.estrategia-card__consolidar-aplicar');
    expect(btnConsolidar.className).toContain('estrategia-card__aplicar');
    expect(btnConsolidar.className).not.toContain('btn-primary');
    setEstrategiaUI({ alternativaActiva: 'aumentar' });
    renderEstrategiaPago();
    const btnAumentar = document.querySelector('.estrategia-card__aumentar-aplicar');
    expect(btnAumentar.className).toContain('estrategia-card__aplicar');
    expect(btnAumentar.className).not.toContain('btn-primary');
  });

  it('FD5: la card de estrategia no deja ningún .btn-primary visible', () => {
    renderEstrategiaPago();
    expect(document.querySelectorAll('#estrategia-pago .btn-primary').length).toBe(0);
  });

  it('el bloque inviable completo no contiene emojis (🤝🏦🎯 fuera, D.16c)', () => {
    renderEstrategiaPago();
    const html = document.getElementById('estrategia-pago').innerHTML;
    expect(html).not.toMatch(/🤝|🏦|🎯|🔒/u);
  });
});

// ── renderEstrategiaPago: plan inviable (D.8 + D.15d-2: alarma vs palancas) ──

describe('renderEstrategiaPago plan inviable: botón de alerta + palancas', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, panelAlternativasAbierto: false, alternativaActiva: 'aumentar' });
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

  it('con el diagnóstico cerrado, se ve el botón de alerta pero no el panel; las palancas sí están', () => {
    renderEstrategiaPago();
    const boton = document.querySelector('.estrategia-card__alerta-boton');
    expect(boton).not.toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    // El diagnóstico (danger) está cerrado...
    expect(document.querySelector('.estrategia-card__alerta')).toBeNull();
    // ...pero la sección de palancas (la solución) es siempre visible.
    expect(document.querySelector('.estrategia-card__palancas')).not.toBeNull();
    expect(document.querySelector('.estrategia-card__remedio')).not.toBeNull();
  });

  it('activar el botón abre el diagnóstico (solo el porqué); el selector vive en las palancas, siempre visible', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true });
    renderEstrategiaPago();
    const boton = document.querySelector('.estrategia-card__alerta-boton');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    const panel = document.querySelector('.estrategia-card__alerta');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Por qué tu plan no se sostiene');
    // El selector NO está dentro del diagnóstico (danger): vive en la sección de
    // palancas (la solución), separada y siempre visible.
    expect(panel.querySelector('.estrategia-card__selector')).toBeNull();
    const selector = document.querySelector('.estrategia-card__palancas .estrategia-card__selector');
    expect(selector).not.toBeNull();
    expect(selector.querySelectorAll('.estrategia-card__selector-opcion').length).toBe(3);
  });

  it('con la palanca Aumentar activa, se muestra solo su herramienta', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true });
    renderEstrategiaPago();
    const remedio = document.querySelector('.estrategia-card__remedio');
    expect(remedio).not.toBeNull();
    const input = remedio.querySelector('#estrategia-extra');
    expect(input).not.toBeNull();
    expect(remedio.textContent).toContain('Aumenta tu cuota');
    // Las otras dos alternativas no se muestran a la vez.
    expect(document.querySelector('.estrategia-card__remedio--renegociar')).toBeNull();
    expect(document.querySelector('.estrategia-card__remedio--consolidar')).toBeNull();
  });

  it('el remedio de aumentar cuota vive en la sección de palancas, no en el diagnóstico', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true });
    renderEstrategiaPago();
    const palancas = document.querySelector('.estrategia-card__palancas');
    const remedio = palancas.querySelector('.estrategia-card__remedio');
    expect(remedio).not.toBeNull();
    expect(remedio.textContent).toContain('Aumenta tu cuota');
  });

  it('el resumen de impacto se muestra dentro del remedio activo', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true });
    renderEstrategiaPago();
    const remedio = document.querySelector('.estrategia-card__remedio');
    const resumen = remedio.querySelector('.estrategia-card__resumen-extra');
    expect(resumen).not.toBeNull();
  });

  it('D.9: el botón "Aplicar este aumento" arranca deshabilitado sin extra', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true, extraMensual: 0 });
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-aumento-cuota"]');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  it('D.9: con un extra > 0 el botón "Aplicar este aumento" se habilita', () => {
    // Extra pequeño: ayuda pero no alcanza a volver viable el plan (sigue
    // mostrándose el bloque inviable con el botón).
    setEstrategiaUI({ panelAlternativasAbierto: true, extraMensual: 10_000 });
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-aumento-cuota"]');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
  });

  it('elegir "renegociar" en el selector muestra solo esa alternativa', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true, alternativaActiva: 'renegociar' });
    renderEstrategiaPago();
    expect(document.querySelector('.estrategia-card__remedio--renegociar')).not.toBeNull();
    expect(document.querySelector('.estrategia-card__remedio--consolidar')).toBeNull();
    // El remedio "aumentar" (genérico) tampoco se muestra a la vez.
    expect(document.querySelector('#estrategia-extra')).toBeNull();
  });

  it('elegir "consolidar" en el selector muestra solo esa alternativa', () => {
    setEstrategiaUI({ panelAlternativasAbierto: true, alternativaActiva: 'consolidar' });
    renderEstrategiaPago();
    expect(document.querySelector('.estrategia-card__remedio--consolidar')).not.toBeNull();
    expect(document.querySelector('.estrategia-card__remedio--renegociar')).toBeNull();
    expect(document.querySelector('#estrategia-extra')).toBeNull();
  });
});

// ── renderEstrategiaPago: BUG-011 (el extra simulado no reestructura la card) ──

describe('renderEstrategiaPago BUG-011: el extra simulado no reestructura la card', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, panelAlternativasAbierto: true, alternativaActiva: 'aumentar' });
    // Plan inviable: la cuota de la deuda cara no cubre su interés mensual.
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda barata', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ];
  });

  it('un extra que volvería viable el plan NO convierte la card al modo viable en un re-render', () => {
    // 500.000/mes extra alcanza para que ambas estrategias completen el plan.
    // Sin el fix, el re-render leía la simulación como estado real y
    // reemplazaba el bloque inviable (botón + panel) por el acelerador.
    setEstrategiaUI({ extraMensual: 500_000 });
    renderEstrategiaPago();

    expect(document.querySelector('.estrategia-card__acelerador')).toBeNull();
    expect(document.querySelector('.estrategia-card__alerta-boton')).not.toBeNull();
    expect(document.querySelector('#estrategia-panel-alternativas')).not.toBeNull();
  });

  it('cambiar a "Renegociar" con el extra tecleado conserva el panel abierto (repro del reporte)', () => {
    setEstrategiaUI({ extraMensual: 500_000, alternativaActiva: 'renegociar' });
    renderEstrategiaPago();

    expect(document.querySelector('.estrategia-card__remedio--renegociar')).not.toBeNull();
    expect(document.querySelector('.estrategia-card__acelerador')).toBeNull();
  });

  it('la simulación sigue viva dentro del remedio: input con el monto, resumen activo y Aplicar habilitado', () => {
    setEstrategiaUI({ extraMensual: 500_000 });
    renderEstrategiaPago();

    const input = document.querySelector('#estrategia-extra');
    expect(input).not.toBeNull();
    expect(input.value).toBe('500000');
    expect(document.querySelector('.estrategia-card__resumen-extra--activo')).not.toBeNull();
    expect(document.querySelector('[data-action="aplicar-aumento-cuota"]').disabled).toBe(false);
  });

  it('las cuotas registradas no cambian: la simulación nunca muta S', () => {
    setEstrategiaUI({ extraMensual: 500_000, alternativaActiva: 'renegociar' });
    renderEstrategiaPago();
    expect(S.compromisos.map(c => c.cuotaMensual)).toEqual([50_000, 100_000]);
  });

  it('el detalle "Tu impacto" del plan inviable no adopta el extra simulado', () => {
    setEstrategiaUI({ estrategia: 'avalancha', extraMensual: 500_000 });
    renderEstrategiaPago();
    // Con los datos registrados (sin extra) el plan no cierra: la métrica de
    // intereses lo sigue diciendo, en vez del total finito de la simulación.
    expect(document.getElementById('estrategia-pago').textContent).toContain('No se termina de pagar');
  });
});

// ── renderEstrategiaPago: D.15d-2 (sección de palancas siempre visible) ──

describe('renderEstrategiaPago D.15d-2: sección de palancas', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, alternativaActiva: null });
    S.ingresos = [];
    // Plan viable (ambas cuotas cubren su interés), sin ingresos → sin margen.
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Tarjeta',  saldoTotal: 3_000_000, cuotaMensual: 200_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Libranza', saldoTotal: 2_000_000, cuotaMensual: 150_000, tasa: 0.12, tasaUnidad: 'EA' }),
    ];
  });

  it('la sección de palancas aparece con un plan viable (antes solo estaba el acelerador)', () => {
    renderEstrategiaPago();
    const palancas = document.querySelector('.estrategia-card__palancas');
    expect(palancas).not.toBeNull();
    // Plan viable: no hay botón de alerta.
    expect(document.querySelector('.estrategia-card__alerta-boton')).toBeNull();
    // Las 3 palancas están a primer plano.
    expect(palancas.querySelectorAll('.estrategia-card__selector-opcion').length).toBe(3);
  });

  it('sin margen + una tasa alta: la principal recomendada es Renegociar', () => {
    renderEstrategiaPago();
    const reco = document.querySelector('.estrategia-card__selector-opcion--recomendada');
    expect(reco).not.toBeNull();
    expect(reco.dataset.alternativa).toBe('renegociar');
    expect(reco.querySelector('.estrategia-card__selector-sub').textContent).toContain('Recomendada');
    // Solo una palanca es la recomendada (pesos visuales distintos).
    expect(document.querySelectorAll('.estrategia-card__selector-opcion--recomendada').length).toBe(1);
  });

  it('muestra la razón de la palanca recomendada', () => {
    renderEstrategiaPago();
    const razon = document.querySelector('.estrategia-card__palancas-razon');
    expect(razon).not.toBeNull();
    expect(razon.textContent).toMatch(/tasa/i);
  });

  it('sin elección del usuario, la palanca activa es la principal y se muestra su herramienta', () => {
    renderEstrategiaPago();
    const activa = document.querySelector('.estrategia-card__selector-opcion--activa');
    expect(activa.dataset.alternativa).toBe('renegociar');
    expect(document.querySelector('.estrategia-card__remedio--renegociar')).not.toBeNull();
  });

  it('con margen libre, la principal es Aumentar la cuota y encabeza los tiles', () => {
    S.ingresos = [{ descripcion: 'Sueldo', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    renderEstrategiaPago();
    const reco = document.querySelector('.estrategia-card__selector-opcion--recomendada');
    expect(reco.dataset.alternativa).toBe('aumentar');
    // Mayor peso visual: es el primer tile del selector.
    const primero = document.querySelector('.estrategia-card__palancas .estrategia-card__selector-opcion');
    expect(primero.dataset.alternativa).toBe('aumentar');
  });

  it('la elección del usuario manda sobre la principal (pero la Recomendada no se mueve)', () => {
    setEstrategiaUI({ alternativaActiva: 'consolidar' });
    renderEstrategiaPago();
    const activa = document.querySelector('.estrategia-card__selector-opcion--activa');
    expect(activa.dataset.alternativa).toBe('consolidar');
    expect(document.querySelector('.estrategia-card__remedio--consolidar')).not.toBeNull();
    // La marca "Recomendada" sigue en la principal (renegociar), no en la activa.
    const reco = document.querySelector('.estrategia-card__selector-opcion--recomendada');
    expect(reco.dataset.alternativa).toBe('renegociar');
  });
});

// ── renderEstrategiaPago: D.15a (copy motivador y "cuándo conviene") ──

describe('renderEstrategiaPago D.15a: copy de las simulaciones', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    setEstrategiaUI({ extraMensual: 0, estrategia: null });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda A', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.28, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda B', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.12, tasaUnidad: 'EA' }),
    ];
  });

  it('Avalancha explica "cuándo conviene" en paralelo a Bola de nieve', () => {
    setEstrategiaUI({ estrategia: 'avalancha' });
    renderEstrategiaPago();
    expect(document.getElementById('estrategia-pago').textContent).toMatch(/conviene si tu prioridad es pagar lo menos posible/i);
  });

  it('Bola de nieve explica "cuándo conviene" (impulso/progreso rápido)', () => {
    setEstrategiaUI({ estrategia: 'bolaNieve' });
    renderEstrategiaPago();
    expect(document.getElementById('estrategia-pago').textContent).toMatch(/conviene si necesitas ver progreso rápido/i);
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

  it('mejora con ahorro: mensaje ok con "menos" y el plazo nuevo (ícono, sin emoji, D.16c)', () => {
    const sim = simularRenegociacion({ saldo: 5_000_000, tasaEA: 0.40, cuota: 300_000 }, 0.20);
    const html = renderComparativaRenegociacion(sim, 20, 'EA');
    expect(html).toContain('estrategia-card__renegociar-msg--ok');
    expect(html).not.toContain('🎯');
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
    // D.8: la herramienta vive detrás del panel de alternativas, en "renegociar".
    setEstrategiaUI({
      extraMensual: 0, renegociarDeudaId: null, renegociarTasaPct: 0,
      panelAlternativasAbierto: true, alternativaActiva: 'renegociar',
    });
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

// ── simularConsolidacion (D.3b) ──────────────────────────────────

describe('simularConsolidacion', () => {
  // Plan viable: dos deudas que se pagan con su cuota actual.
  const viables = () => filtrarDeudasPagables([
    deudaBase({ id: 'a', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.40, tasaUnidad: 'EA' }),
    deudaBase({ id: 'b', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.30, tasaUnidad: 'EA' }),
  ]);

  it('consolidar a una tasa más baja ahorra intereses (ambos planes cierran)', () => {
    const r = simularConsolidacion(viables(), { tasaEA: 0.15, cuota: 300_000 });
    expect(r.actual.completo).toBe(true);
    expect(r.consolidado.completo).toBe(true);
    expect(r.consolidado.saldo).toBe(6_000_000);
    expect(r.ahorroIntereses).toBeGreaterThan(0);
    expect(r.mejora).toBe(true);
  });

  it('consolidar a una tasa más alta no mejora (no ahorra intereses)', () => {
    const r = simularConsolidacion(viables(), { tasaEA: 0.60, cuota: 300_000 });
    expect(r.consolidado.completo).toBe(true);
    expect(r.mejora).toBe(false);
    expect(r.ahorroIntereses).toBeLessThanOrEqual(0);
  });

  it('si la cuota nueva no cubre el interés, el crédito tampoco se paga', () => {
    const r = simularConsolidacion(viables(), { tasaEA: 0.15, cuota: 5_000 });
    expect(r.consolidado.completo).toBe(false);
    expect(r.mejora).toBe(false);
  });

  it('mejora cualitativa: plan actual inviable que el crédito nuevo vuelve pagable', () => {
    const inviables = filtrarDeudasPagables([
      deudaBase({ id: 'a', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'b', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ]);
    const r = simularConsolidacion(inviables, { tasaEA: 0.08, cuota: 400_000 });
    expect(r.actual.completo).toBe(false);
    expect(r.consolidado.completo).toBe(true);
    expect(r.mejora).toBe(true);
    expect(r.ahorroIntereses).toBe(0); // no se resta una cifra divergente
  });

  it('null si no hay deudas o la cuota es inválida', () => {
    expect(simularConsolidacion([], { tasaEA: 0.1, cuota: 100_000 })).toBeNull();
    expect(simularConsolidacion(viables(), { tasaEA: 0.1, cuota: 0 })).toBeNull();
  });
});

// ── renderComparativaConsolidacion (D.3b) ────────────────────────

describe('renderComparativaConsolidacion', () => {
  const viables = () => filtrarDeudasPagables([
    deudaBase({ id: 'a', saldoTotal: 5_000_000, cuotaMensual: 200_000, tasa: 0.40, tasaUnidad: 'EA' }),
    deudaBase({ id: 'b', saldoTotal: 1_000_000, cuotaMensual: 100_000, tasa: 0.30, tasaUnidad: 'EA' }),
  ]);

  it('sin simulación, invita a ingresar datos', () => {
    expect(renderComparativaConsolidacion(null)).toContain('Ingresa la tasa');
  });

  it('mejora: mensaje ok con el ahorro en intereses (ícono, sin emoji, D.16c)', () => {
    const sim = simularConsolidacion(viables(), { tasaEA: 0.15, cuota: 300_000 });
    const html = renderComparativaConsolidacion(sim);
    expect(html).toContain('estrategia-card__renegociar-msg--ok');
    expect(html).not.toContain('🎯');
    expect(html).toContain('ahorras');
    expect(html).toContain('en intereses');
  });

  it('sin ahorro: avisa que consolidar así no conviene', () => {
    const sim = simularConsolidacion(viables(), { tasaEA: 0.60, cuota: 300_000 });
    const html = renderComparativaConsolidacion(sim);
    expect(html).toContain('no te ahorra intereses');
  });

  it('cuota demasiado baja: advierte que el crédito tampoco se paga', () => {
    const sim = simularConsolidacion(viables(), { tasaEA: 0.15, cuota: 5_000 });
    const html = renderComparativaConsolidacion(sim);
    expect(html).toContain('tampoco alcanza');
    expect(html).not.toContain('e+');
  });
});

// ── renderEstrategiaPago: herramienta consolidar en bloque inviable (D.3b) ──

describe('renderConsolidar (D.3b) en el bloque inviable', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="estrategia-pago"></div>';
    // D.8: la herramienta vive detrás del panel de alternativas, en "consolidar".
    setEstrategiaUI({
      extraMensual: 0, consolidarTasaPct: 0, consolidarCuota: 0,
      panelAlternativasAbierto: true, alternativaActiva: 'consolidar',
    });
    S.compromisos = [
      deudaBase({ id: 'd1', descripcion: 'Deuda cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'd2', descripcion: 'Deuda barata', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ];
  });

  it('muestra la herramienta de consolidar dentro del bloque inviable', () => {
    renderEstrategiaPago();
    const tool = document.querySelector('.estrategia-card__remedio--consolidar');
    expect(tool).not.toBeNull();
    expect(tool.querySelector('#consolidar-tasa')).not.toBeNull();
    expect(tool.querySelector('#consolidar-cuota')).not.toBeNull();
    expect(tool.textContent).toContain('Consolidar tus deudas');
  });

  it('el botón Consolidar arranca deshabilitado (sin datos)', () => {
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-consolidacion"]');
    expect(btn.disabled).toBe(true);
  });

  it('con tasa + cuota que mejoran el plan, Consolidar se habilita', () => {
    setEstrategiaUI({ consolidarTasaPct: 8, consolidarCuota: 400_000 });
    renderEstrategiaPago();
    const btn = document.querySelector('[data-action="aplicar-consolidacion"]');
    expect(btn.disabled).toBe(false);
  });
});

// ── repartirExtraEnCuotas (D.9) ──────────────────────────────────

describe('repartirExtraEnCuotas', () => {
  // Interés mensual de una deuda con la misma fórmula que la lógica.
  const interesMensual = (saldo, tasaEA) => saldo * (Math.pow(1 + tasaEA, 1 / 12) - 1);

  it('guarda: extra <= 0, deudas vacías o no-array devuelven reparto vacío', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'a', saldoTotal: 1_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
    ]);
    expect(repartirExtraEnCuotas(deudas, 0)).toEqual({ incrementos: [], totalRepartido: 0 });
    expect(repartirExtraEnCuotas(deudas, -100)).toEqual({ incrementos: [], totalRepartido: 0 });
    expect(repartirExtraEnCuotas([], 50_000)).toEqual({ incrementos: [], totalRepartido: 0 });
    expect(repartirExtraEnCuotas(null, 50_000)).toEqual({ incrementos: [], totalRepartido: 0 });
  });

  it('una sola deuda creciente: el extra (menor que el déficit) sube su cuota', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'cara', descripcion: 'Tarjeta cara', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'sana', descripcion: 'Préstamo sano', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ]);
    const { incrementos, totalRepartido } = repartirExtraEnCuotas(deudas, 50_000);
    // Solo la deuda que crece recibe el aumento; la sana no se toca.
    expect(incrementos).toHaveLength(1);
    expect(incrementos[0].id).toBe('cara');
    expect(incrementos[0].incremento).toBe(50_000);
    expect(incrementos[0].cuotaNueva).toBe(100_000);
    expect(totalRepartido).toBe(50_000);
  });

  it('cubre primero el déficit y vuelca el remanente a la deuda de mayor tasa', () => {
    // La que crece (B, 20% EA) no es la de mayor tasa (A, 60% EA, pero sana).
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'A', descripcion: 'Cara sana',  saldoTotal: 1_000_000,  cuotaMensual: 200_000, tasa: 0.60, tasaUnidad: 'EA' }),
      deudaBase({ id: 'B', descripcion: 'Barata crece', saldoTotal: 10_000_000, cuotaMensual: 50_000,  tasa: 0.20, tasaUnidad: 'EA' }),
    ]);
    const deficitB = interesMensual(10_000_000, 0.20) - 50_000;
    const extra = 300_000; // > déficit de B
    const { incrementos, totalRepartido } = repartirExtraEnCuotas(deudas, extra);

    const incB = incrementos.find(i => i.id === 'B');
    const incA = incrementos.find(i => i.id === 'A');
    expect(incB).toBeDefined();
    expect(incA).toBeDefined();
    // B recibe (al menos) su déficit: con su cuota nueva ya no crece.
    expect(incB.cuotaNueva).toBeGreaterThanOrEqual(interesMensual(10_000_000, 0.20) - 1);
    // El remanente (extra - déficit de B) va a la de mayor tasa, A.
    expect(incA.incremento).toBeCloseTo(extra - deficitB, -1);
    expect(totalRepartido).toBeCloseTo(extra, -1);
  });

  it('extra menor que el déficit total: cubre primero la que más rápido crece', () => {
    // Dos deudas que crecen; B crece más rápido que C.
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'B', descripcion: 'Crece mucho', saldoTotal: 10_000_000, cuotaMensual: 50_000, tasa: 0.30, tasaUnidad: 'EA' }),
      deudaBase({ id: 'C', descripcion: 'Crece poco',  saldoTotal: 3_000_000,  cuotaMensual: 40_000, tasa: 0.25, tasaUnidad: 'EA' }),
    ]);
    const deficitB = interesMensual(10_000_000, 0.30) - 50_000;
    const extra = Math.round(deficitB / 2); // alcanza solo para parte de B
    const { incrementos } = repartirExtraEnCuotas(deudas, extra);
    // Todo el extra va a B (la que más rápido crece); C no recibe nada.
    expect(incrementos).toHaveLength(1);
    expect(incrementos[0].id).toBe('B');
    expect(incrementos[0].incremento).toBe(extra);
  });

  it('sin deudas crecientes: todo el extra va a la deuda de mayor tasa', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'alta', saldoTotal: 1_000_000, cuotaMensual: 300_000, tasa: 0.40, tasaUnidad: 'EA' }),
      deudaBase({ id: 'baja', saldoTotal: 1_000_000, cuotaMensual: 300_000, tasa: 0.10, tasaUnidad: 'EA' }),
    ]);
    const { incrementos, totalRepartido } = repartirExtraEnCuotas(deudas, 80_000);
    expect(incrementos).toHaveLength(1);
    expect(incrementos[0].id).toBe('alta');
    expect(incrementos[0].incremento).toBe(80_000);
    expect(totalRepartido).toBe(80_000);
  });

  it('cuotaNueva = cuotaActual + incremento en cada deuda afectada', () => {
    const deudas = filtrarDeudasPagables([
      deudaBase({ id: 'x', saldoTotal: 8_000_000, cuotaMensual: 60_000, tasa: 0.35, tasaUnidad: 'EA' }),
      deudaBase({ id: 'y', saldoTotal: 2_000_000, cuotaMensual: 30_000, tasa: 0.28, tasaUnidad: 'EA' }),
    ]);
    const { incrementos } = repartirExtraEnCuotas(deudas, 400_000);
    for (const i of incrementos) {
      expect(i.cuotaNueva).toBe(i.cuotaActual + i.incremento);
    }
  });
});

// ── resumenDeudas() (D.16a, ADR 036 D1) ───────────────────────────

describe('resumenDeudas()', () => {
  const deudaHero = (overrides = {}) => ({
    id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
    saldoTotal: 2_400_000, cuotaMensual: 220_000, frecuencia: 'Mensual',
    diaPago: 5, tasa: 0.28, tasaUnidad: 'EA', activo: true,
    ...overrides,
  });

  it('suma saldo y cuota de las deudas activas y las cuenta', () => {
    const r = resumenDeudas([
      deudaHero({ id: 'd1' }),
      deudaHero({ id: 'd2', tipo: 'deuda-personal', saldoTotal: 400_000, cuotaMensual: 200_000, tasa: 0 }),
      deudaHero({ id: 'd3', saldoTotal: 1_500_000, cuotaMensual: 180_000, activo: false }),
    ]);
    expect(r.saldoTotal).toBe(2_800_000);
    expect(r.cuotaMensual).toBe(420_000);
    expect(r.cantidad).toBe(2);
  });

  it('excluye los gastos fijos del mismo dominio (el hero habla de deudas)', () => {
    const r = resumenDeudas([
      deudaHero(),
      { id: 'f1', descripcion: 'Arriendo', tipo: 'fijo', monto: 1_500_000, frecuencia: 'Mensual', diaPago: 1, activo: true },
    ]);
    expect(r.cantidad).toBe(1);
    expect(r.saldoTotal).toBe(2_400_000);
    expect(r.cuotaMensual).toBe(220_000);
  });

  it('sin deudas devuelve ceros', () => {
    expect(resumenDeudas([])).toEqual({ saldoTotal: 0, cuotaMensual: 0, cantidad: 0, saldadas: 0 });
  });

  // FD7: el hero necesita separar las saldadas para explicar por qué el total
  // no crece con el conteo de tarjetas de la lista.
  it('FD7: cuenta aparte las deudas ya saldadas, sin sacarlas de `cantidad`', () => {
    const r = resumenDeudas([
      deudaHero({ id: 'd1' }),
      deudaHero({ id: 'd2', saldoTotal: 0, cuotaMensual: 0 }),
      deudaHero({ id: 'd3', saldoTotal: 0, cuotaMensual: 0 }),
    ]);
    expect(r.cantidad).toBe(3);
    expect(r.saldadas).toBe(2);
    expect(r.saldoTotal).toBe(2_400_000);
  });

  it('tolera cuotaMensual ausente (fiado sin cuota, D.13)', () => {
    const r = resumenDeudas([deudaHero({ saldoTotal: 300_000, cuotaMensual: undefined })]);
    expect(r.saldoTotal).toBe(300_000);
    expect(r.cuotaMensual).toBe(0);
    expect(r.cantidad).toBe(1);
  });
});

// ── renderHeroCompromisos() (D.16a, ADR 036 D1/D7) ────────────────

describe('renderHeroCompromisos()', () => {
  const deudaHero = (overrides = {}) => ({
    id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
    saldoTotal: 2_400_000, cuotaMensual: 220_000, frecuencia: 'Mensual',
    diaPago: 5, tasa: 0.28, tasaUnidad: 'EA', activo: true,
    ...overrides,
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="compromisos-hero"></div>';
    S.compromisos = [];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
  });

  it('con deudas: label, total, chip de cuota, "en N deudas" y ojo con aria-pressed=false', () => {
    S.compromisos = [
      deudaHero({ id: 'd1' }),
      deudaHero({ id: 'd2', tipo: 'deuda-personal', saldoTotal: 400_000, cuotaMensual: 200_000, tasa: 0 }),
    ];
    renderHeroCompromisos();
    const el = document.getElementById('compromisos-hero');
    expect(el.querySelector('.hero-compromisos__label').textContent).toBe('Lo que debes en total');
    expect(el.querySelector('.hero-compromisos__valor').textContent).toBe('$2.800.000');
    expect(el.querySelector('.hero-compromisos__chip').textContent).toContain('$420.000/mes');
    expect(el.querySelector('.hero-compromisos__meta-txt').textContent).toBe('en 2 deudas');
    const ojo = el.querySelector('#compromisos-saldo-ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('false');
    expect(ojo.innerHTML).toContain('#i-eye');
    expect(ojo.innerHTML).not.toContain('#i-eye-off');
  });

  it('con el saldo oculto: máscara en total y en el chip, ojo tachado', () => {
    S.compromisos = [deudaHero()];
    S.config.ocultarSaldo = true;
    renderHeroCompromisos();
    const el = document.getElementById('compromisos-hero');
    expect(el.querySelector('.hero-compromisos__valor').textContent).toBe('$••••••');
    expect(el.innerHTML).not.toContain('2.400.000');
    expect(el.innerHTML).not.toContain('220.000');
    const ojo = el.querySelector('#compromisos-saldo-ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    expect(ojo.innerHTML).toContain('#i-eye-off');
  });

  it('sin deudas: "$0" con label de vacío, sin ojo ni fila de metadatos', () => {
    renderHeroCompromisos();
    const el = document.getElementById('compromisos-hero');
    expect(el.querySelector('.hero-compromisos__label').textContent).toBe('No tienes deudas registradas');
    expect(el.querySelector('.hero-compromisos__valor').textContent).toBe('$0');
    expect(el.querySelector('#compromisos-saldo-ojo')).toBeNull();
    expect(el.querySelector('.hero-compromisos__meta')).toBeNull();
  });

  it('los gastos fijos no cuentan para el hero', () => {
    S.compromisos = [
      { id: 'f1', descripcion: 'Arriendo', tipo: 'fijo', monto: 1_500_000, frecuencia: 'Mensual', diaPago: 1, activo: true },
    ];
    renderHeroCompromisos();
    const el = document.getElementById('compromisos-hero');
    expect(el.querySelector('.hero-compromisos__label').textContent).toBe('No tienes deudas registradas');
    expect(el.querySelector('.hero-compromisos__valor').textContent).toBe('$0');
  });

  it('una sola deuda: "en 1 deuda" en singular y sin chip si no tiene cuota', () => {
    S.compromisos = [deudaHero({ cuotaMensual: 0 })];
    renderHeroCompromisos();
    const el = document.getElementById('compromisos-hero');
    expect(el.querySelector('.hero-compromisos__meta-txt').textContent).toBe('en 1 deuda');
    expect(el.querySelector('.hero-compromisos__chip')).toBeNull();
  });

  // ── FD7: el conteo explica las saldadas ──────────────────────────

  it('FD7: con una saldada dice "en N deudas por pagar · 1 saldada"', () => {
    S.compromisos = [
      deudaHero({ id: 'd1' }),
      deudaHero({ id: 'd2', saldoTotal: 900_000 }),
      deudaHero({ id: 'd3', saldoTotal: 0, cuotaMensual: 0 }),
    ];
    renderHeroCompromisos();
    const txt = document.querySelector('.hero-compromisos__meta-txt').textContent.trim();
    expect(txt).toBe('en 2 deudas por pagar · 1 saldada');
  });

  it('FD7: varias saldadas van en plural y una sola por pagar en singular', () => {
    S.compromisos = [
      deudaHero({ id: 'd1' }),
      deudaHero({ id: 'd2', saldoTotal: 0, cuotaMensual: 0 }),
      deudaHero({ id: 'd3', saldoTotal: 0, cuotaMensual: 0 }),
    ];
    renderHeroCompromisos();
    const txt = document.querySelector('.hero-compromisos__meta-txt').textContent.trim();
    expect(txt).toBe('en 1 deuda por pagar · 2 saldadas');
  });

  it('FD7: con todas saldadas dice "sin deudas por pagar", no "en 0 deudas"', () => {
    S.compromisos = [
      deudaHero({ id: 'd1', saldoTotal: 0, cuotaMensual: 0 }),
      deudaHero({ id: 'd2', saldoTotal: 0, cuotaMensual: 0 }),
    ];
    renderHeroCompromisos();
    const txt = document.querySelector('.hero-compromisos__meta-txt').textContent.trim();
    expect(txt).toBe('sin deudas por pagar · 2 saldadas');
    expect(txt).not.toContain('en 0');
  });

  it('FD7: sin saldadas el texto de siempre no cambia', () => {
    S.compromisos = [deudaHero({ id: 'd1' }), deudaHero({ id: 'd2' })];
    renderHeroCompromisos();
    const txt = document.querySelector('.hero-compromisos__meta-txt').textContent.trim();
    expect(txt).toBe('en 2 deudas');
  });
});

// ── renderListaCompromisos() - tarjeta de deuda (D.16d, ADR 036 D5/D6/D7) ──

describe('renderListaCompromisos() - tarjeta de deuda D.16d', () => {
  const deudaCard = (overrides = {}) => ({
    id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad',
    saldoTotal: 2_400_000, cuotaMensual: 220_000, frecuencia: 'Mensual',
    diaPago: 5, categoria: 'Tarjeta de crédito', tasa: 0.28, tasaUnidad: 'EA', activo: true,
    ...overrides,
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    S.compromisos = [];
    // FD1 lee los abonos (gastos con `compromisoId`) para fechar el saldado.
    S.gastos = [];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
    S.gastos = [];
  });

  it('pinta la tarjeta con saldo prominente, botón Abonar tintado y eliminar ghost', () => {
    S.compromisos = [deudaCard()];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card');
    expect(card).not.toBeNull();
    expect(card.querySelector('.deuda-card__saldo').textContent).toBe('$2.400.000');
    const abonar = card.querySelector('.deuda-card__abonar');
    expect(abonar.getAttribute('data-action')).toBe('abrir-abono');
    expect(abonar.textContent).toContain('Abonar');
    expect(card.querySelector('.deuda-card__eliminar')).not.toBeNull();
  });

  it('encabezado "Tus deudas" siempre; el indicador de orden solo con estrategia elegida', () => {
    S.compromisos = [
      deudaCard({ id: 'd1' }),
      deudaCard({ id: 'd2', descripcion: 'Crédito Nu', saldoTotal: 1_500_000, tasa: 0.12 }),
    ];
    setEstrategiaUI({ estrategia: 'bolaNieve' });
    renderListaCompromisos();
    const el = document.getElementById('lista-compromisos');
    expect(el.querySelector('.grupo-eyebrow').textContent.trim()).toBe('Tus deudas');
    const extra = el.querySelector('.grupo-eyebrow-fila__extra');
    expect(extra.textContent).toContain('Orden Bola de nieve');
    expect(extra.innerHTML).toContain('#i-snowball');
  });

  it('el aviso de tasa desconocida es un callout ámbar con ícono, sin emoji ⚠️', () => {
    S.compromisos = [deudaCard({ tasa: null, categoria: null })];
    renderListaCompromisos();
    const aviso = document.querySelector('.deuda-card__aviso');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Tasa por confirmar');
    expect(aviso.innerHTML).toContain('#i-alert');
    expect(document.getElementById('lista-compromisos').innerHTML).not.toContain('⚠️');
    const chipWarn = document.querySelector('.deuda-card__chip--warn');
    expect(chipWarn.textContent).toContain('Tasa por confirmar');
  });

  it('con el ojo activado, el saldo de la tarjeta se enmascara (ADR 036 D7)', () => {
    S.compromisos = [deudaCard()];
    S.config.ocultarSaldo = true;
    renderListaCompromisos();
    const saldo = document.querySelector('.deuda-card__saldo');
    expect(saldo.textContent).toBe('••••');
    expect(document.getElementById('lista-compromisos').innerHTML).not.toContain('2.400.000');
  });

  it('deuda personal: chip de categoría con tinte personales', () => {
    S.compromisos = [deudaCard({ tipo: 'deuda-personal', categoria: 'Familiar', tasa: 0 })];
    renderListaCompromisos();
    const chip = document.querySelector('.deuda-card__chip--personal');
    expect(chip).not.toBeNull();
    expect(chip.textContent).toContain('Familiar');
    const chips = document.querySelectorAll('.deuda-card__chips .chip');
    expect([...chips].some(c => c.textContent.includes('Sin interés'))).toBe(true);
  });

  it('deuda saldada: chip "Saldada" + Archivar, sin Abonar ni saldo', () => {
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card');
    expect(card.querySelector('.abono-saldada')).not.toBeNull();
    expect(card.querySelector('.deuda-card__abonar')).toBeNull();
    expect(card.querySelector('.deuda-card__saldo')).toBeNull();
    expect(card.querySelector('[data-action="archivar-compromiso"]')).not.toBeNull();
  });

  it('el badge de orden se superpone en la teja de la tarjeta', () => {
    S.compromisos = [
      deudaCard({ id: 'd1' }),
      deudaCard({ id: 'd2', descripcion: 'Crédito Nu', saldoTotal: 1_500_000, tasa: 0.12 }),
    ];
    setEstrategiaUI({ estrategia: 'avalancha' });
    renderListaCompromisos();
    const badge = document.querySelector('.deuda-card__icon .orden-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('1°');
  });

  // ── D.15b: trigger de editar en la tarjeta ──────────────────────

  it('D.15b: la deuda activa tiene un botón de editar con el id correcto (i-edit)', () => {
    S.compromisos = [deudaCard()];
    renderListaCompromisos();
    const editar = document.querySelector('[data-action="editar-compromiso"]');
    expect(editar).not.toBeNull();
    expect(editar.dataset.id).toBe('d1');
    expect(editar.innerHTML).toContain('#i-edit');
  });

  it('D.15b: la deuda saldada también tiene botón de editar, junto a Archivar', () => {
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card');
    expect(card.querySelector('[data-action="editar-compromiso"]')).not.toBeNull();
    expect(card.querySelector('[data-action="archivar-compromiso"]')).not.toBeNull();
  });

  // ── FD1 / FD2 / FD3: una pasada por _renderCompromisoItem ─────────

  it('FD3: el chip de vencimiento vive en la fila de chips, no dentro del nombre', () => {
    S.compromisos = [deudaCard()];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card');
    expect(card.querySelector('.deuda-card__nombre .chip')).toBeNull();
    expect(card.querySelector('.deuda-card__nombre').textContent.trim()).toBe('Tarjeta Visa');
    const chips = [...card.querySelectorAll('.deuda-card__chips .chip')];
    expect(chips[0].textContent).toContain('Vence');
  });

  it('FD1: la deuda saldada no anuncia ningún vencimiento', () => {
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    renderListaCompromisos();
    const card = document.querySelector('.deuda-card');
    expect(card.textContent).not.toContain('Vence');
    expect(card.querySelector('.chip-danger')).toBeNull();
    expect(card.querySelector('.chip-warning')).toBeNull();
  });

  it('FD1: la deuda saldada muestra la fecha del último abono como subtítulo', () => {
    const ano = new Date().getFullYear();
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    S.gastos = [
      { id: 'g1', monto: 100_000, categoria: 'Deudas', fecha: `${ano}-07-10`, compromisoId: 'd1' },
      { id: 'g2', monto: 220_000, categoria: 'Deudas', fecha: `${ano}-07-22`, compromisoId: 'd1' },
      { id: 'g3', monto: 50_000, categoria: 'Deudas', fecha: `${ano}-07-24`, compromisoId: 'otra' },
    ];
    renderListaCompromisos();
    const subtitulo = document.querySelector('.deuda-card__cuota').textContent.trim();
    expect(subtitulo).toBe('Saldada el 22 de julio');
  });

  it('FD1: una saldada de otro año sí lleva el año, para no confundir', () => {
    const anoPasado = new Date().getFullYear() - 1;
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    S.gastos = [
      { id: 'g1', monto: 220_000, categoria: 'Deudas', fecha: `${anoPasado}-03-04`, compromisoId: 'd1' },
    ];
    renderListaCompromisos();
    const subtitulo = document.querySelector('.deuda-card__cuota').textContent.trim();
    expect(subtitulo).toBe(`Saldada el 4 de marzo de ${anoPasado}`);
  });

  it('FD1: sin abonos registrados la saldada no inventa una fecha', () => {
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    S.gastos = [];
    renderListaCompromisos();
    const subtitulo = document.querySelector('.deuda-card__cuota').textContent.trim();
    expect(subtitulo).toBe('Sin saldo pendiente');
  });

  it('FD1: la deuda activa conserva su subtítulo de cuota y día de pago', () => {
    S.compromisos = [deudaCard()];
    renderListaCompromisos();
    const subtitulo = document.querySelector('.deuda-card__cuota').textContent.trim();
    expect(subtitulo).toBe('Cuota $220.000/mes · día 5');
  });

  it('FD2: archivar usa el ícono del sprite, no el carácter de texto', () => {
    S.compromisos = [deudaCard({ saldoTotal: 0 })];
    renderListaCompromisos();
    const archivar = document.querySelector('[data-action="archivar-compromiso"]');
    expect(archivar.innerHTML).toContain('#i-check-circle');
    expect(archivar.textContent).not.toContain('✓');
  });

  // ── FD6: un solo CTA para crear una deuda ─────────────────────────

  it('FD6: el estado vacío usa el mismo verbo del encabezado ("+ Nueva deuda")', () => {
    renderListaCompromisos();
    const cta = document.querySelector('.empty-state [data-action="nuevo-compromiso"]');
    expect(cta.textContent.trim()).toBe('+ Nueva deuda');
  });

  it('FD6: sin deudas el botón del encabezado se oculta; con deudas vuelve', () => {
    document.body.innerHTML = `
      <button id="compromisos-nueva-deuda" data-action="nuevo-compromiso">+ Nueva deuda</button>
      <div id="lista-compromisos"></div>`;
    renderListaCompromisos();
    expect(document.getElementById('compromisos-nueva-deuda').hidden).toBe(true);

    S.compromisos = [deudaCard()];
    renderListaCompromisos();
    expect(document.getElementById('compromisos-nueva-deuda').hidden).toBe(false);
  });
});
