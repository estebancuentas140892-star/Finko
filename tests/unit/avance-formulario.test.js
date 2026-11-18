/**
 * avance-formulario.test.js - "Sacar un avance" (AVC.1b, ADR 169 D1 a D3 y D7).
 *
 * Con el formulario y los manejadores reales de Por pagar:
 * - Lo que pinta: Efectivo primero (o uno nuevo si no hay), las cuotas sin
 *   ninguna marcada, la tasa solo si la tarjeta no la tiene y la línea del
 *   fondo solo si el fondo tiene dinero.
 * - Dónde se ofrece: en la hoja y en la tarjeta de escritorio, solo en una
 *   tarjeta con cupo.
 * - Lo que hace al guardar: crea Efectivo si hacía falta, guarda la tasa en
 *   la tarjeta y sube la tarjeta y la cuenta. No deja ningún gasto.
 * - Los errores atados a su campo, y el aviso de cupo, que no bloquea.
 *
 * Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import { initMiles } from '../../modules/ui/miles.js';
import { initCompromisos } from '../../modules/dominio/compromisos/index.js';
import { renderFormAvance } from '../../modules/dominio/compromisos/views/formularios.js';
import { htmlDetalleCompromiso } from '../../modules/dominio/compromisos/views/detalle.js';
import { EFECTIVO_NUEVO } from '../../modules/dominio/compromisos/logic.js';

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function montarModales(ids) {
  const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = cuerpo;
  document.body.innerHTML = `<div class="app-shell"></div>${ids.map(id => tmp.querySelector(`#${id}`).outerHTML).join('')}`;
}

async function esperar(vueltas = 20) {
  for (let i = 0; i < vueltas; i++) await Promise.resolve();
  vaciarRendersProgramados();
}

function accion(nombre, data = {}) {
  const el = document.createElement('button');
  el.dataset.action = nombre;
  Object.assign(el.dataset, data);
  dispatch(el, new Event('click', { cancelable: true }));
}

/** Escribe un campo como lo haría la persona y avisa. */
function escribir(form, name, valor) {
  const campos = [...form.querySelectorAll(`[name="${name}"]`)];
  if (campos.length === 0) throw new Error(`falta el campo ${name}`);
  const radio = campos.find(c => c.type === 'radio' && c.value === String(valor));
  const campo = radio ?? campos[0];
  if (campo.type === 'radio' || campo.type === 'checkbox') campo.checked = true;
  else campo.value = String(valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
}

const CREADA = '2025-01-01T00:00:00.000Z';
const tarjeta = (extra = {}) => ({
  id: 't1', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  saldoTotal: 800_000, cuotaMensual: 120_000, cupoTotal: 3_000_000, tasa: 0.2293, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: CREADA, ...extra,
});
const banco = { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 1_000_000, activa: true, fechaCreacion: CREADA };
const efectivo = { id: 'e1', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 20_000, activa: true, fechaCreacion: CREADA };

const contenedor = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

beforeEach(() => {
  Object.assign(S, createInitialState());
  S.onboarded = true;
});

// ── LO QUE PINTA ─────────────────────────────────────────────────

describe('renderFormAvance() (D1 a D3)', () => {
  it('Efectivo primero y elegido; las cuotas sin ninguna marcada', () => {
    S.cuentas = [banco, efectivo];
    const form = contenedor(renderFormAvance(tarjeta()));
    const radios = [...form.querySelectorAll('[name="cuentaId"]')];
    expect(radios.map(r => r.value)).toEqual(['e1', 'c1']);
    expect(radios[0].checked).toBe(true);
    const cuotas = [...form.querySelectorAll('[name="cuotas"]')];
    expect(cuotas.map(c => c.value)).toEqual(['1', '2', '3', '6', '9', '12', '18', '24', '36']);
    expect(cuotas.some(c => c.checked)).toBe(false);
  });

  it('sin cuenta Efectivo, ofrece una nueva de primera', () => {
    S.cuentas = [banco];
    const form = contenedor(renderFormAvance(tarjeta()));
    const primero = form.querySelector('[name="cuentaId"]');
    expect(primero.value).toBe(EFECTIVO_NUEVO);
    expect(primero.checked).toBe(true);
    expect(primero.closest('label').textContent).toContain('Efectivo');
  });

  it('pide la tasa solo si la tarjeta no la tiene', () => {
    S.cuentas = [banco];
    expect(contenedor(renderFormAvance(tarjeta())).querySelector('[name="tasa"]')).toBeNull();
    expect(contenedor(renderFormAvance(tarjeta({ tasa: null }))).querySelector('[name="tasa"]')).not.toBeNull();
  });

  it('la línea del fondo sale solo con un fondo activo que tiene dinero', () => {
    S.cuentas = [banco];
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 400_000 }, aportes: [{ id: 'a', monto: 100_000, fecha: '2026-11-01' }] };
    expect(contenedor(renderFormAvance(tarjeta())).querySelector('#avance-fondo').textContent)
      .toBe('Tu fondo de emergencia tiene $500.000. Es para esto.');
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 400_000 }, aportes: [] };
    expect(contenedor(renderFormAvance(tarjeta())).querySelector('#avance-fondo')).toBeNull();
  });

  it('el aviso del cajero de otra red vive en la comisión (ADR 051 D7)', () => {
    S.cuentas = [banco];
    expect(contenedor(renderFormAvance(tarjeta())).textContent).toContain('cajero de otra red');
  });
});

describe('dónde se ofrece "Sacar un avance" (D1)', () => {
  it('en la hoja de una tarjeta con cupo, y no en otra deuda', () => {
    S.gastos = [];
    S.compromisos = [tarjeta()];
    const conCupo = contenedor(htmlDetalleCompromiso(tarjeta(), { prefijoMes: '2026-11', monto: 120_000 }));
    expect(conCupo.querySelector('[data-target-action="abrir-avance"]')?.textContent).toBe('Sacar un avance');
    const sinCupo = contenedor(htmlDetalleCompromiso(tarjeta({ cupoTotal: null }), { prefijoMes: '2026-11', monto: 120_000 }));
    expect(sinCupo.querySelector('[data-target-action="abrir-avance"]')).toBeNull();
  });

  it('también en una tarjeta que no debe nada', () => {
    S.gastos = [];
    const saldada = contenedor(htmlDetalleCompromiso(tarjeta({ saldoTotal: 0 }), { prefijoMes: '2026-11', monto: 0 }));
    expect(saldada.querySelector('[data-target-action="abrir-avance"]')).not.toBeNull();
  });
});

// ── AL GUARDAR ───────────────────────────────────────────────────

describe('sacar un avance con el formulario real', () => {
  beforeAll(() => {
    montarModales(['modal-abono']);
    location.hash = '#compromisos';
    initMiles();
    initCompromisos();
  });

  const formAbierto = async (id = 't1') => {
    accion('abrir-avance', { id });
    await esperar();
    const form = document.getElementById('form-avance');
    expect(form).not.toBeNull();
    return form;
  };
  const enviar = async (form) => {
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
  };

  it('sin Efectivo: lo crea con el avance, guarda la tasa escrita y no deja gasto', async () => {
    guardar('cuentas', banco);
    guardar('compromisos', tarjeta({ tasa: null }));
    const form = await formAbierto();
    expect(document.querySelector('#modal-abono .modal__title').textContent).toBe('Sacar un avance: Visa Bancolombia');

    escribir(form, 'monto', '500.000');
    escribir(form, 'cuotas', '24');
    escribir(form, 'tasa', '22,93');
    escribir(form, 'comision', '9.870');
    expect(form.querySelector('#avance-costo').hidden).toBe(false);
    expect(form.querySelector('[data-avance-costo]').textContent).toBe('Este avance te cuesta unos $125.500: $115.600 de intereses en 24 cuotas de $25.649 y $9.870 de comisión. Pagarás unos $625.500 por $500.000.');

    await enviar(form);
    const nueva = S.cuentas.find(c => c.banco === 'Efectivo');
    expect(nueva).toMatchObject({ nombre: 'Efectivo', saldo: 500_000, aplica4x1000: false });
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(1_000_000);
    expect(S.compromisos[0]).toMatchObject({ saldoTotal: 1_309_870, cuotaMensual: 145_649, tasa: 0.2293, tasaUnidad: 'EA' });
    expect(S.compromisos[0].avances).toEqual([expect.objectContaining({ monto: 500_000, cuentaId: nueva.id, cuotas: 24, cuota: 25_649, comision: 9_870 })]);
    expect(S.gastos).toEqual([]);
    expect(document.getElementById('modal-abono').dataset.open).toBeUndefined();
  });

  it('con Efectivo: el dinero llega a esa cuenta', async () => {
    guardar('cuentas', efectivo);
    guardar('cuentas', banco);
    guardar('compromisos', tarjeta());
    const form = await formAbierto();
    escribir(form, 'monto', '200.000');
    escribir(form, 'cuotas', '12');
    await enviar(form);
    expect(S.cuentas.filter(c => c.banco === 'Efectivo')).toHaveLength(1);
    expect(S.cuentas.find(c => c.id === 'e1').saldo).toBe(220_000);
    expect(S.compromisos[0].saldoTotal).toBe(1_000_000);
  });

  it('sin cuotas no guarda y lo dice bajo las cuotas', async () => {
    guardar('cuentas', banco);
    guardar('compromisos', tarjeta());
    const form = await formAbierto();
    escribir(form, 'monto', '200.000');
    await enviar(form);
    expect(form.querySelector('#grupo-avance-cuotas .form-error')?.textContent).toContain('Elige a cuántas cuotas lo difirieron.');
    expect(S.compromisos[0].avances).toBeUndefined();
    expect(S.cuentas).toHaveLength(1);
  });

  it('una tasa mal escrita dice qué hacer una sola vez', async () => {
    guardar('cuentas', banco);
    guardar('compromisos', tarjeta({ tasa: null }));
    const form = await formAbierto();
    escribir(form, 'monto', '200.000');
    escribir(form, 'cuotas', '6');
    escribir(form, 'tasa', 'abc');
    await enviar(form);
    const errores = [...form.querySelectorAll('.form-error')].map(e => e.textContent.trim());
    expect(errores).toEqual(['Escribe la tasa con números. Por ejemplo: 28,5']);
    expect(S.compromisos[0].tasa).toBeNull();
  });

  it('pasar el cupo avisa, pero deja guardar', async () => {
    guardar('cuentas', banco);
    guardar('compromisos', tarjeta({ saldoTotal: 2_900_000 }));
    const form = await formAbierto();
    escribir(form, 'monto', '300.000');
    const aviso = form.querySelector('#avance-sobrecupo');
    expect(aviso.hidden).toBe(false);
    expect(aviso.textContent).toBe('Este avance pasa del cupo en $200.000: te quedan $100.000 disponibles. Puedes registrarlo, pero tu banco decide si lo aprueba.');
    escribir(form, 'cuotas', '1');
    await enviar(form);
    expect(S.compromisos[0].saldoTotal).toBe(3_200_000);
  });

  it('una deuda que no es tarjeta operable no abre el formulario', async () => {
    guardar('compromisos', tarjeta({ id: 't2', cupoTotal: null }));
    document.querySelector('#modal-abono .modal__body').innerHTML = '';
    accion('abrir-avance', { id: 't2' });
    await esperar();
    expect(document.getElementById('form-avance')).toBeNull();
  });
});
