/**
 * pago-vinculado.test.js - editar y borrar desde Gastos o Movimientos un gasto
 * que paga un compromiso (BUG-035 y BUG-038).
 *
 * El pago de un fijo ("Gastos fijos") y el abono a una deuda ("Deudas") llevan
 * `compromisoId` y una categoría interna que no es un chip del formulario.
 *
 * - BUG-038: "Editar" abría el formulario sin categoría marcada y no guardaba
 *   ("Debes elegir una categoría"): corregir el monto exigía recategorizar.
 * - BUG-035: borrar o editar el pago de un fijo le escribía `saldoTotal` al
 *   fijo, y el diálogo anunciaba que "sube de nuevo el saldo" de algo que no es
 *   una deuda.
 *
 * Rutas reales: `data-action` + `submit` sobre el modal de `index.html`, con el
 * reloj fijo en la fecha del escenario. Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import { initGastos } from '../../modules/dominio/gastos/index.js';
import { deltasPorEdicionEnDeuda } from '../../modules/dominio/gastos/logic.js';

// ── HELPERS (mismo patrón que consumo-no-es-pago.test.js) ────────

const HTML = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

function montarModales(ids) {
  const cuerpo = HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/gi, '');
  const tmp = document.createElement('div');
  tmp.innerHTML = cuerpo;
  document.body.innerHTML = `<div class="app-shell"></div>${ids.map(id => tmp.querySelector(`#${id}`).outerHTML).join('')}`;
}

function fijarDia(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  vi.setSystemTime(new Date(a, m - 1, d, 10, 0, 0));
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

/** Llena por `name` y envía; falla si el formulario no guardó. */
async function enviar(formId, valores) {
  const form = document.getElementById(formId);
  if (!form) throw new Error(`No está abierto #${formId}`);
  for (const [name, valor] of Object.entries(valores)) {
    const campo = form.querySelector(`[name="${name}"]`);
    if (!campo) throw new Error(`#${formId} no tiene el campo "${name}"`);
    campo.value = String(valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await esperar();
  const errores = form.querySelector('.form-errors');
  if (errores) throw new Error(`#${formId} no se guardó: ${errores.textContent.replace(/\s+/g, ' ').trim()}`);
}

/** Texto del diálogo de confirmación abierto, y lo acepta. */
async function confirmarDialogo() {
  await esperar();
  const d = document.querySelector('body > .modal-overlay[data-open]:not([id])');
  if (!d) throw new Error('No apareció el diálogo de confirmación');
  const texto = d.textContent.replace(/\s+/g, ' ');
  d.querySelector('[data-role="confirmar"]').click();
  await esperar();
  return texto;
}

// ── FIXTURES (inventados) ────────────────────────────────────────

const ARRIENDO = {
  id: 'cf-arriendo', descripcion: 'Arriendo de prueba', tipo: 'fijo', categoria: 'Arriendo',
  frecuencia: 'Mensual', diaPago: 3, monto: 1_200_000, activo: true,
};
const PRESTAMO = {
  id: 'd-prestamo', descripcion: 'Préstamo de prueba', tipo: 'deuda-personal', categoria: 'Familiar',
  frecuencia: 'Mensual', diaPago: 10, cuotaMensual: 300_000, saldoTotal: 2_000_000, activo: true,
};
/** Tarjeta operable: si el formulario la ofreciera, un abono podría volverse compra. */
const TARJETA = {
  id: 'tc', descripcion: 'Tarjeta de prueba', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  cupoTotal: 3_000_000, saldoTotal: 500_000, cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 16,
  tasa: 0.28, tasaUnidad: 'EA', activo: true,
};

/** Pagos con la forma exacta que escribe `infra/pago-compromiso.js`. */
const PAGO_ARRIENDO = {
  id: 'g-pago', descripcion: 'Pago: Arriendo de prueba', monto: 1_200_000, categoria: 'Gastos fijos',
  fecha: '2026-10-03', cuentaId: 'cta', nota: '', compromisoId: 'cf-arriendo',
};
const ABONO_PRESTAMO = {
  id: 'g-abono', descripcion: 'Abono: Préstamo de prueba', monto: 300_000, categoria: 'Deudas',
  fecha: '2026-10-10', cuentaId: 'cta', nota: '', compromisoId: 'd-prestamo',
};

const cta      = () => S.cuentas.find(c => c.id === 'cta');
const arriendo = () => S.compromisos.find(c => c.id === 'cf-arriendo');
const prestamo = () => S.compromisos.find(c => c.id === 'd-prestamo');
const gasto    = (id) => S.gastos.find(g => g.id === id);

// ── LÓGICA PURA ──────────────────────────────────────────────────

describe('BUG-035 - deltasPorEdicionEnDeuda() no toca un fijo', () => {
  const compromisos = [ARRIENDO, PRESTAMO];

  it('borrar o editar el pago de un fijo no produce delta de deuda', () => {
    expect(deltasPorEdicionEnDeuda(PAGO_ARRIENDO, null, compromisos)).toEqual({});
    expect(deltasPorEdicionEnDeuda(PAGO_ARRIENDO, { ...PAGO_ARRIENDO, monto: 1_000_000 }, compromisos)).toEqual({});
  });

  it('el abono a una deuda sigue revirtiendo su saldo', () => {
    expect(deltasPorEdicionEnDeuda(ABONO_PRESTAMO, null, compromisos)).toEqual({ 'd-prestamo': 300_000 });
  });

  it('sin la lista de compromisos conserva el comportamiento anterior', () => {
    expect(deltasPorEdicionEnDeuda(PAGO_ARRIENDO, null)).toEqual({ 'cf-arriendo': 1_200_000 });
  });
});

// ── RUTAS REALES ─────────────────────────────────────────────────

describe('BUG-035 y BUG-038 - rutas reales de editar y borrar', () => {
  let zonaOriginal;

  beforeAll(() => {
    zonaOriginal = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    vi.useFakeTimers({ toFake: ['Date'] });
    montarModales(['modal-gasto']);
    location.hash = '#pago-vinculado'; // ninguna sección coincide: los renders reactivos se saltan
    initGastos();
  });

  afterAll(() => {
    vi.useRealTimers();
    if (zonaOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = zonaOriginal;
  });

  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.onboarded = true;
    fijarDia('2026-10-20');
    guardar('cuentas', { id: 'cta', nombre: 'Cuenta de prueba', banco: 'Otro', tipo: 'Ahorros', saldo: 1_000_000, activa: true });
    guardar('compromisos', { ...ARRIENDO });
    guardar('compromisos', { ...PRESTAMO });
    guardar('compromisos', { ...TARJETA });
    guardar('gastos', { ...PAGO_ARRIENDO });
    guardar('gastos', { ...ABONO_PRESTAMO });
  });

  it('BUG-038: editar el pago del fijo abre con su categoría marcada y sin tarjetas', () => {
    accion('editar-gasto', { id: 'g-pago' });
    const form = document.getElementById('form-gasto');
    const radios = [...form.querySelectorAll('input[name="categoria"]')];
    expect(radios.map(r => r.value)).toEqual(['Gastos fijos']);
    expect(radios[0].checked).toBe(true);
    const origenes = [...form.querySelectorAll('input[name="cuentaId"]')].map(r => r.value);
    expect(origenes).toEqual(['cta']);
  });

  it('BUG-038 y BUG-035: corregir el monto del pago del fijo guarda sin tocar saldoTotal', async () => {
    accion('editar-gasto', { id: 'g-pago' });
    await enviar('form-gasto', { monto: 1_000_000 });
    expect(gasto('g-pago')).toMatchObject({
      monto: 1_000_000, categoria: 'Gastos fijos', compromisoId: 'cf-arriendo', cuentaId: 'cta',
    });
    expect(cta().saldo).toBe(1_200_000); // devuelve los 200.000 de diferencia
    expect(arriendo().saldoTotal).toBeUndefined();
  });

  it('BUG-038: corregir el abono guarda y ajusta la deuda por la diferencia', async () => {
    accion('editar-gasto', { id: 'g-abono' });
    const marcada = document.querySelector('#form-gasto input[name="categoria"]:checked');
    expect(marcada?.value).toBe('Deudas');
    await enviar('form-gasto', { monto: 250_000 });
    expect(gasto('g-abono')).toMatchObject({ monto: 250_000, categoria: 'Deudas', compromisoId: 'd-prestamo' });
    expect(gasto('g-abono').consumoTC).toBeFalsy();
    expect(cta().saldo).toBe(1_050_000);
    expect(prestamo().saldoTotal).toBe(2_050_000); // abonó 50.000 menos
  });

  it('BUG-035: borrar el pago del fijo devuelve el dinero y no anuncia ni escribe un saldo', async () => {
    accion('eliminar-gasto', { id: 'g-pago' });
    const texto = await confirmarDialogo();
    expect(texto).toContain('devuelve');
    expect(texto).not.toContain('saldo de "Arriendo de prueba"');
    expect(gasto('g-pago')).toBeUndefined();
    expect(cta().saldo).toBe(2_200_000);
    expect(arriendo().saldoTotal).toBeUndefined();
  });

  it('borrar el abono a una deuda sigue subiendo su saldo', async () => {
    accion('eliminar-gasto', { id: 'g-abono' });
    const texto = await confirmarDialogo();
    expect(texto).toContain('sube de nuevo el saldo de "Préstamo de prueba"');
    expect(prestamo().saldoTotal).toBe(2_300_000);
  });

  it('un gasto común sigue ofreciendo el catálogo completo', async () => {
    guardar('gastos', { id: 'g-comun', monto: 20_000, categoria: 'Restaurantes', fecha: '2026-10-19', cuentaId: 'cta', nota: '' });
    accion('editar-gasto', { id: 'g-comun' });
    const radios = [...document.querySelectorAll('#form-gasto input[name="categoria"]')];
    expect(radios.length).toBeGreaterThan(5);
    expect(radios.find(r => r.checked)?.value).toBe('Restaurantes');
  });
});
