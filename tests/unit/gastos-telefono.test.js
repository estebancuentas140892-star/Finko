/**
 * gastos-telefono.test.js - Registrar gasto en el teléfono (FORM.2b, ADR 142 D4).
 *
 * - Lógica pura: el orden de las tejas por uso, la cuenta habitual y el plan
 *   cuando la cuenta no alcanza (el mismo reparto de `resolverPagoConPreferida`,
 *   visible antes de guardar).
 * - Piezas de `ui/`: las semanas del calendario de Finko, la mini-hoja (se
 *   cierra sola con Escape, sin cerrar la hoja) y "Deshacer" en el aviso.
 * - Rutas reales: el formulario por etapas sobre el modal de `index.html`, con
 *   `matchMedia` de teléfono. Todos los datos son inventados.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar } from '../../modules/infra/crud.js';
import { dispatch } from '../../modules/ui/actions.js';
import { vaciarRendersProgramados } from '../../modules/infra/render.js';
import { initGastos } from '../../modules/dominio/gastos/index.js';
import { ordenarCategoriasPorUso, cuentaHabitual, planSiNoAlcanza } from '../../modules/dominio/gastos/logic.js';
import { semanasDelMes } from '../../modules/ui/calendario-finko.js';
import { htmlMiniHoja, abrirMiniHoja, miniHojaAbierta } from '../../modules/ui/mini-hoja.js';
import { mostrarToast } from '../../modules/ui/toast.js';
import { initMiles } from '../../modules/ui/miles.js';

// ── LÓGICA PURA ──────────────────────────────────────────────────

describe('ordenarCategoriasPorUso()', () => {
  it('las que más usas primero; los empates conservan el orden del catálogo', () => {
    const gastos = [
      { categoria: 'Café' }, { categoria: 'Café' }, { categoria: 'Mercado' }, { categoria: 'Ajena' },
    ];
    expect(ordenarCategoriasPorUso(['Mercado', 'Restaurantes', 'Café', 'Salud'], gastos))
      .toEqual(['Café', 'Mercado', 'Restaurantes', 'Salud']);
  });

  it('sin historial, el orden de siempre, en un arreglo nuevo', () => {
    const nombres = ['A', 'B'];
    const r = ordenarCategoriasPorUso(nombres, []);
    expect(r).toEqual(['A', 'B']);
    expect(r).not.toBe(nombres);
  });
});

describe('cuentaHabitual()', () => {
  const cuentas = [
    { id: 'a', saldo: 100, activa: true },
    { id: 'b', saldo: 900, activa: true },
    { id: 'c', saldo: 50, activa: false },
  ];

  it('la que más aparece en los gastos recientes', () => {
    const gastos = [
      { cuentaId: 'a', fecha: '2026-11-01' }, { cuentaId: 'a', fecha: '2026-11-02' },
      { cuentaId: 'b', fecha: '2026-11-03' },
    ];
    expect(cuentaHabitual(cuentas, gastos)).toBe('a');
  });

  it('empate: la del gasto más reciente; ignora inactivas y consumos con tarjeta', () => {
    const gastos = [
      { cuentaId: 'a', fecha: '2026-11-01' }, { cuentaId: 'b', fecha: '2026-11-05' },
      { cuentaId: 'c', fecha: '2026-11-06' }, { cuentaId: 'c', fecha: '2026-11-07' },
      { cuentaId: 'a', fecha: '2026-11-08', consumoTC: true },
    ];
    expect(cuentaHabitual(cuentas, gastos)).toBe('b');
  });

  it('sin historial, la de más saldo; sin cuentas activas, null', () => {
    expect(cuentaHabitual(cuentas, [])).toBe('b');
    expect(cuentaHabitual([{ id: 'x', activa: false }], [])).toBeNull();
  });
});

describe('planSiNoAlcanza()', () => {
  const cuentas = [
    { id: 'efe', nombre: 'Efectivo', saldo: 30_000, activa: true },
    { id: 'neq', nombre: 'Nequi', saldo: 1_240_000, activa: true },
    { id: 'ban', nombre: 'Banco', saldo: 10_000, activa: true },
  ];

  it('si alcanza (o el monto no es válido), no hay nada que decir', () => {
    expect(planSiNoAlcanza(cuentas, 20_000, 'efe')).toBeNull();
    expect(planSiNoAlcanza(cuentas, 0, 'efe')).toBeNull();
    expect(planSiNoAlcanza(cuentas, 20_000, 'no-existe')).toBeNull();
  });

  it('no alcanza: falta, completar con otra y pagar todo con la que alcanza sola', () => {
    const plan = planSiNoAlcanza(cuentas, 45_000, 'efe');
    expect(plan.falta).toBe(15_000);
    expect(plan.completar.splits).toEqual([
      { cuentaId: 'efe', monto: 30_000 }, { cuentaId: 'neq', monto: 15_000 },
    ]);
    expect(plan.completar.otras).toEqual(['Nequi']);
    expect(plan.todo).toEqual({ cuentaId: 'neq', nombre: 'Nequi', queda: 1_195_000 });
  });

  it('una sola cuenta: sin opciones, dice en cuánto queda en negativo', () => {
    const plan = planSiNoAlcanza([cuentas[0]], 45_000, 'efe');
    expect(plan.completar).toBeNull();
    expect(plan.todo).toBeNull();
    expect(plan.negativo).toBe(15_000);
  });

  it('entre todas alcanza pero ninguna sola: solo completar', () => {
    const plan = planSiNoAlcanza([cuentas[0], cuentas[2]], 35_000, 'efe');
    expect(plan.completar.splits.map(s => s.cuentaId)).toEqual(['efe', 'ban']);
    expect(plan.todo).toBeNull();
  });
});

// ── PIEZAS DE UI ─────────────────────────────────────────────────

describe('semanasDelMes()', () => {
  it('noviembre de 2026 empieza en domingo: seis huecos antes del 1', () => {
    const semanas = semanasDelMes(2026, 10);
    expect(semanas[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(semanas.flat().filter(Boolean)).toHaveLength(30);
    expect(semanas.every(s => s.length === 7)).toBe(true);
  });

  it('febrero de 2027 empieza en lunes y cierra en cuatro semanas', () => {
    const semanas = semanasDelMes(2027, 1);
    expect(semanas[0][0]).toBe(1);
    expect(semanas).toHaveLength(4);
  });
});

describe('mini-hoja', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="modal-overlay" data-open><div class="modal">
        <header class="modal__header"><button id="x">x</button></header>
        <div class="modal__body"><form>
          <section data-etapa="revisar"><button type="button" id="origen">Nota</button></section>
          ${htmlMiniHoja({ id: 'm', titulo: 'Nota', cuerpo: '<input id="campo" name="nota" />' })}
        </form></div>
      </div></div>`;
  });

  it('abre con el foco en su campo y deja el resto de la hoja inert', () => {
    const mini = document.getElementById('m');
    abrirMiniHoja(mini, { origen: document.getElementById('origen') });
    expect(mini.hidden).toBe(false);
    expect(document.activeElement.id).toBe('campo');
    expect(document.querySelector('.modal__header').hasAttribute('inert')).toBe(true);
    expect(document.querySelector('[data-etapa]').hasAttribute('inert')).toBe(true);
  });

  it('Escape cierra solo la mini-hoja y el foco vuelve a quien la abrió', () => {
    const mini = document.getElementById('m');
    const cerrada = vi.fn();
    abrirMiniHoja(mini, { origen: document.getElementById('origen'), alCerrar: cerrada });
    let llegoAlDocumento = false;
    const alDocumento = (e) => { if (e.key === 'Escape') llegoAlDocumento = true; };
    document.addEventListener('keydown', alDocumento);
    document.getElementById('campo').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.removeEventListener('keydown', alDocumento);
    expect(mini.hidden).toBe(true);
    expect(miniHojaAbierta(mini)).toBe(false);
    expect(llegoAlDocumento).toBe(false);
    expect(document.activeElement.id).toBe('origen');
    expect(document.querySelector('[data-etapa]').hasAttribute('inert')).toBe(false);
    expect(cerrada).toHaveBeenCalledTimes(1);
  });

  it('el velo y la ✕ también la cierran', () => {
    const mini = document.getElementById('m');
    abrirMiniHoja(mini);
    mini.querySelector('.mini-hoja__velo').click();
    expect(mini.hidden).toBe(true);
    abrirMiniHoja(mini);
    mini.querySelector('.mini-hoja__cerrar').click();
    expect(mini.hidden).toBe(true);
  });
});

describe('mostrarToast() con acción', () => {
  it('"Deshacer" cierra el aviso y llama a la acción', async () => {
    const alTocar = vi.fn();
    mostrarToast({ titulo: 'Mercado $45.000', accion: { texto: 'Deshacer', alTocar } });
    const boton = document.querySelector('.fk-toast__accion');
    expect(boton.textContent).toBe('Deshacer');
    boton.click();
    expect(alTocar).toHaveBeenCalledTimes(1);
    await new Promise(r => setTimeout(r, 450)); // la cola de avisos sigue
  });
});

// ── RUTAS REALES ─────────────────────────────────────────────────

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

const tocar = (form, t) => form.querySelector(`[data-tecla="${t}"]`).click();
/** Un toque de dedo sobre la teja (detail 1, como el navegador). */
const tocarTeja = (form, valor) => form.querySelector(`input[name="categoria"][value="${valor}"]`)
  .dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));

describe('FORM.2b - Registrar gasto por etapas en el teléfono', () => {
  const matchMediaReal = window.matchMedia;
  let zonaOriginal;

  beforeAll(() => {
    zonaOriginal = process.env.TZ;
    process.env.TZ = 'America/Bogota';
    vi.useFakeTimers({ toFake: ['Date'] });
    window.matchMedia = (q) => ({ matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {} });
    montarModales(['modal-gasto']);
    location.hash = '#gastos-telefono';
    initGastos();
    initMiles(); // el monto viaja como dígitos al armar FormData, como en la app
  });

  afterAll(() => {
    window.matchMedia = matchMediaReal;
    vi.useRealTimers();
    if (zonaOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = zonaOriginal;
  });

  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.onboarded = true;
    vi.setSystemTime(new Date(2026, 10, 14, 10, 0, 0));
    guardar('cuentas', { id: 'neq', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 1_240_000, activa: true });
    guardar('cuentas', { id: 'efe', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 30_000, activa: true });
    guardar('gastos', { id: 'g1', monto: 10_000, categoria: 'Café', cuentaId: 'efe', fecha: '2026-11-10' });
    guardar('gastos', { id: 'g2', monto: 12_000, categoria: 'Café', cuentaId: 'efe', fecha: '2026-11-11' });
  });

  it('abre en el monto, con el teclado de Finko y sin el teclado del sistema', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    expect('etapas' in form.dataset).toBe(true);
    expect(form.dataset.etapaActual).toBe('monto');
    expect(form.querySelector('[data-etapa="categoria"]').hidden).toBe(true);
    expect(form.querySelector('#gasto-monto').inputMode).toBe('none');
    expect(form.querySelectorAll('.kp__k')).toHaveLength(12);
    // Nunca un selector del sistema (ADR 142 D2).
    expect(form.querySelector('select, input[type="date"], input[type="number"]')).toBeNull();
  });

  it('sin monto no se sigue: el error dice qué hacer', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    expect(form.dataset.etapaActual).toBe('monto');
    expect(form.querySelector('.form-error').textContent).toContain('Escribe cuánto fue');
  });

  it('monto, una teja y el recibo con la cuenta habitual y lo que le queda', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5'); tocar(form, '000');
    expect(form.querySelector('#gasto-monto-lee').textContent).toBe('Cuarenta y cinco mil pesos');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    expect(form.dataset.etapaActual).toBe('categoria');
    // La más usada va primero.
    expect(form.querySelector('.teja-op__t').textContent).toBe('Café');
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-recibo-monto]').textContent).toBe('$45.000');
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Mercado');
    // Habitual: Efectivo (los dos cafés); no alcanza, así que lo dice antes de guardar.
    const fila = form.querySelector('#gasto-fila-cuenta');
    expect(fila.textContent).toContain('Efectivo');
    expect(fila.classList.contains('recibo__fila--alerta')).toBe(true);
    const aviso = form.querySelector('#gasto-aviso-saldo');
    expect(aviso.hidden).toBe(false);
    expect(aviso.textContent).toContain('faltan $15.000');
    expect(form.querySelector('input[name="reparto"]:checked').value).toBe('completar');
  });

  it('guardar con "Completar con Nequi" reparte sin abrir "¿Desde qué cuentas?"', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(document.querySelector('body > .modal-overlay:not([id])')).toBeNull();
    const nuevos = S.gastos.filter(g => g.categoria === 'Mercado');
    expect(nuevos.map(g => [g.cuentaId, g.monto]).sort()).toEqual([['efe', 30_000], ['neq', 15_000]]);
    expect(S.cuentas.find(c => c.id === 'efe').saldo).toBe(0);
    expect(S.cuentas.find(c => c.id === 'neq').saldo).toBe(1_225_000);
  });

  it('"Pagar todo con Nequi" usa solo esa cuenta, y "Deshacer" lo devuelve todo', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    form.querySelector('input[name="reparto"][value="todo"]').checked = true;
    // Un aviso a la vez: se cierra el de la prueba anterior para ver este.
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    const nuevos = S.gastos.filter(g => g.categoria === 'Mercado');
    expect(nuevos.map(g => [g.cuentaId, g.monto])).toEqual([['neq', 45_000]]);
    expect(S.cuentas.find(c => c.id === 'neq').saldo).toBe(1_195_000);

    const deshacer = [...document.querySelectorAll('.fk-toast__accion')].at(-1);
    expect(deshacer.textContent).toBe('Deshacer');
    deshacer.click();
    await esperar();
    expect(S.gastos.filter(g => g.categoria === 'Mercado')).toHaveLength(0);
    expect(S.cuentas.find(c => c.id === 'neq').saldo).toBe(1_240_000);
  });

  it('el desplegable de cuentas y la fecha de "Ayer" vuelven al recibo', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '9');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    form.querySelector('input[name="categoria"][value="Café"]').checked = true;
    tocarTeja(form, 'Café');

    form.querySelector('#gasto-fila-cuenta').click();
    const mini = form.querySelector('#gasto-mini-cuenta');
    expect(mini.hidden).toBe(false);
    const nequi = mini.querySelector('input[value="neq"]');
    nequi.checked = true;
    nequi.dispatchEvent(new Event('change', { bubbles: true }));
    expect(mini.hidden).toBe(true);
    expect(form.querySelector('#gasto-fila-cuenta').textContent).toContain('Te quedan $1.239.991');

    form.querySelector('#gasto-fila-fecha').click();
    const ayer = form.querySelector('input[name="fechaOpcion"][value="ayer"]');
    ayer.checked = true;
    ayer.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.querySelector('#gasto-mini-fecha').hidden).toBe(true);
    expect(form.querySelector('[name="fecha"]').value).toBe('2026-11-13');
    expect(form.querySelector('#gasto-fila-fecha [data-fila-v]').textContent).toBe('Ayer');
  });

  it('FORM.2d: editar abre la ficha del gasto, sin "Guardar", con eliminar al pie', () => {
    accion('editar-gasto', { id: 'g1' });
    const form = document.getElementById('form-gasto');
    expect('ficha' in form.dataset).toBe(true);
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-recibo-monto]').textContent).toBe('$10.000');
    expect(form.querySelector('button[type="submit"]').hidden).toBe(true);
    expect(form.querySelector('[data-gasto-otro]')).toBeNull();
    expect(form.querySelector('[data-action="eliminar-gasto"]').dataset.id).toBe('g1');
    expect(document.getElementById('modal-gasto-title').textContent).toBe('Gasto');
  });

  it('FORM.2d: un cambio en la ficha se guarda solo y "Deshacer" lo devuelve', async () => {
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    accion('editar-gasto', { id: 'g1' });
    const form = document.getElementById('form-gasto');
    form.querySelector('#gasto-fila-fecha').click();
    const ayer = form.querySelector('input[name="fechaOpcion"][value="ayer"]');
    ayer.checked = true;
    ayer.dispatchEvent(new Event('change', { bubbles: true }));
    await esperar();
    expect(S.gastos.find(g => g.id === 'g1').fecha).toBe('2026-11-13');
    // La ficha sigue abierta.
    expect(document.querySelector('#modal-gasto[data-open]')).not.toBeNull();
    const deshacer = [...document.querySelectorAll('.fk-toast__accion')].at(-1);
    expect(deshacer.textContent).toBe('Deshacer');
    deshacer.click();
    await esperar();
    expect(S.gastos.find(g => g.id === 'g1').fecha).toBe('2026-11-10');
  });
});
