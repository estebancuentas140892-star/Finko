/**
 * gastos-telefono.test.js - Registrar gasto en el teléfono (FORM.2b, ADR 142 D4).
 *
 * - Lógica pura: el orden de las tejas por uso, la cuenta habitual, qué falta
 *   cuando la cuenta no alcanza (GAS.3, ADR 156 D6) y la fecha del recibo.
 * - Piezas de `ui/`: las semanas del calendario de Finko (meses que empiezan
 *   en cualquier día, bisiestos, cambio de año), la mini-hoja (se cierra sola
 *   con Escape, sin cerrar la hoja) y "Deshacer" en el aviso.
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
import { semanasDelMes, htmlCalendario, montarCalendario } from '../../modules/ui/calendario-finko.js';
import { fechaDelRecibo } from '../../modules/dominio/gastos/telefono.js';
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

  it('no alcanza: la cuenta, su saldo y lo que falta; nada de repartir', () => {
    expect(planSiNoAlcanza(cuentas, 45_000, 'efe')).toEqual({
      cuenta: { id: 'efe', nombre: 'Efectivo', saldo: 30_000 },
      falta: 15_000,
    });
  });

  it('un saldo en negativo no resta: falta el gasto entero', () => {
    const plan = planSiNoAlcanza([{ id: 'x', nombre: 'X', saldo: -5_000, activa: true }], 20_000, 'x');
    expect(plan.falta).toBe(20_000);
  });

  it('una cuenta inactiva no se evalúa', () => {
    expect(planSiNoAlcanza([{ id: 'x', saldo: 0, activa: false }], 20_000, 'x')).toBeNull();
  });
});

describe('fechaDelRecibo()', () => {
  beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 10, 16, 9, 0, 0)); });
  afterAll(() => { vi.useRealTimers(); });

  it('hoy y ayer con el día; otro día con su nombre; otro año con el año', () => {
    expect(fechaDelRecibo('2026-11-16')).toBe('Hoy, 16 de noviembre');
    expect(fechaDelRecibo('2026-11-15')).toBe('Ayer, 15 de noviembre');
    expect(fechaDelRecibo('2026-11-14')).toBe('Sábado 14 de noviembre');
    expect(fechaDelRecibo('2025-12-31')).toBe('Miércoles 31 de diciembre de 2025');
    expect(fechaDelRecibo('no')).toBe('');
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

  it('cada día cae en su columna, de lunes a domingo (GAS.3, ADR 156 D9)', () => {
    // El 1 de cada mes, en la columna de su día de la semana: 0 = lunes.
    for (let mes0 = 0; mes0 < 12; mes0++) {
      const semanas = semanasDelMes(2026, mes0);
      const columna = semanas[0].indexOf(1);
      expect(columna).toBe((new Date(2026, mes0, 1).getDay() + 6) % 7);
      expect(semanas.flat().filter(Boolean)).toHaveLength(new Date(2026, mes0 + 1, 0).getDate());
    }
  });

  it('bisiesto: febrero de 2028 tiene 29 días y empieza en martes', () => {
    const semanas = semanasDelMes(2028, 1);
    expect(semanas[0].indexOf(1)).toBe(1);
    expect(Math.max(...semanas.flat().filter(Boolean))).toBe(29);
    expect(Math.max(...semanasDelMes(2026, 1).flat().filter(Boolean))).toBe(28);
  });
});

describe('montarCalendario()', () => {
  beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 30, 9, 0, 0)); });
  afterAll(() => { vi.useRealTimers(); });

  it('pasa de diciembre a enero y elige la fecha local del día tocado', () => {
    document.body.innerHTML = htmlCalendario({ id: 'cal' });
    const raiz = document.getElementById('cal');
    const alElegir = vi.fn();
    montarCalendario(raiz, { valor: '2026-12-30', alElegir });
    expect(raiz.querySelector('.calf__mes').textContent).toBe('Diciembre 2026');
    expect(raiz.querySelector('[aria-pressed="true"]').dataset.calfDia).toBe('2026-12-30');
    raiz.querySelector('[data-calf-mover="1"]').click();
    expect(raiz.querySelector('.calf__mes').textContent).toBe('Enero 2027');
    // El 1 de enero de 2027 es viernes: cuatro huecos antes.
    expect(raiz.querySelectorAll('.calf__semana:not(.calf__semana--nombres)')[0].querySelectorAll('.calf__hueco')).toHaveLength(4);
    raiz.querySelector('[data-calf-dia="2027-01-05"]').click();
    expect(alElegir).toHaveBeenCalledWith('2027-01-05');
    raiz.querySelector('[data-calf-mover="-1"]').click();
    raiz.querySelector('[data-calf-mover="-1"]').click();
    expect(raiz.querySelector('.calf__mes').textContent).toBe('Noviembre 2026');
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
    // Quien antes eligió el teclado del teléfono también recibe el de Finko
    // (GAS.3, ADR 156 D4): en Registrar gasto ya no hay salida.
    S.config.tecladoTelefono = true;
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    expect('etapas' in form.dataset).toBe(true);
    expect(form.dataset.etapaActual).toBe('monto');
    expect(form.querySelector('[data-etapa="categoria"]').hidden).toBe(true);
    expect(form.querySelector('#gasto-monto').inputMode).toBe('none');
    expect(form.querySelectorAll('.kp__k')).toHaveLength(12);
    expect(form.querySelector('[data-kp-sistema]')).toBeNull();
    expect(form.textContent).not.toContain('Usar el teclado del teléfono');
    // Nunca un selector del sistema (ADR 142 D2).
    expect(form.querySelector('select, input[type="date"], input[type="number"]')).toBeNull();
  });

  it('en Safari la teja también avanza: el clic reenviado del rótulo trae detail 0', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    const radio = form.querySelector('input[name="categoria"][value="Mercado"]');
    // Con las flechas del teclado se elige y no se avanza.
    radio.checked = true;
    radio.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(form.dataset.etapaActual).toBe('categoria');
    // El dedo toca el rótulo (detail 1) y Safari reenvía el clic al radio con detail 0.
    radio.closest('label').querySelector('.teja-op__t').dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
    radio.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Mercado');
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
    expect(form.querySelector('#gasto-cat-q').textContent).toBe('Elige la categoría en la que gastaste tu dinero');
    expect(form.querySelector('.preg__s')).toBeNull();
    // La más usada va primero.
    expect(form.querySelector('.teja-op__t').textContent).toBe('Café');
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-recibo-monto]').textContent).toBe('$45.000');
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Mercado');
    // Una vez cada dato (ADR 156 D3): ni el monto en letras ni la instrucción.
    const recibo = form.querySelector('[data-etapa="revisar"]');
    expect(recibo.textContent).not.toContain('Cuarenta y cinco mil');
    expect(recibo.textContent).not.toContain('Toca cualquier dato');
    expect(recibo.textContent.match(/Mercado/g)).toHaveLength(1);
    // Un solo botón: "Guardar gasto" (ADR 156 D7).
    expect(recibo.querySelectorAll('.recibo__pie button')).toHaveLength(1);
    expect(form.querySelector('[data-gasto-otro]')).toBeNull();
    // Habitual: Efectivo (los dos cafés); no alcanza: un solo mensaje y sin guardar (D6).
    const fila = form.querySelector('#gasto-fila-cuenta');
    expect(fila.textContent).toContain('Efectivo');
    expect(fila.textContent).toContain('Tienes $30.000');
    expect(fila.classList.contains('recibo__fila--alerta')).toBe(true);
    const aviso = form.querySelector('#gasto-aviso-saldo');
    expect(aviso.hidden).toBe(false);
    expect(aviso.textContent).toBe('No tienes saldo suficiente en esta cuenta: faltan $15.000. Elige otro método de pago para completar el gasto.');
    expect(form.querySelector('input[name="reparto"]')).toBeNull();
    expect(recibo.querySelector('.recibo__pie [type="submit"]').disabled).toBe(true);
  });

  it('si la cuenta no alcanza, enviar no registra nada ni toca saldos', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    // El botón está apagado; un Enter o un envío igual no pasan.
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(document.querySelector('body > .modal-overlay:not([id])')).toBeNull();
    expect(S.gastos.filter(g => g.categoria === 'Mercado')).toHaveLength(0);
    expect(S.cuentas.find(c => c.id === 'efe').saldo).toBe(30_000);
    expect(S.cuentas.find(c => c.id === 'neq').saldo).toBe(1_240_000);
  });

  it('elegir otra cuenta que alcanza quita el aviso y guarda entero desde ella; "Deshacer" lo devuelve', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '4'); tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    form.querySelector('input[name="categoria"][value="Mercado"]').checked = true;
    tocarTeja(form, 'Mercado');
    form.querySelector('#gasto-fila-cuenta').click();
    const nequi = form.querySelector('#gasto-mini-cuenta input[value="neq"]');
    nequi.checked = true;
    nequi.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.querySelector('#gasto-aviso-saldo').hidden).toBe(true);
    expect(form.querySelector('#gasto-fila-cuenta').textContent).toContain('Te quedan $1.195.000');
    expect(form.querySelector('.recibo__pie [type="submit"]').disabled).toBe(false);
    // Un aviso a la vez: se cierra el de la prueba anterior para ver este.
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    const nuevos = S.gastos.filter(g => g.categoria === 'Mercado');
    expect(nuevos.map(g => [g.cuentaId, g.monto, g.fecha])).toEqual([['neq', 45_000, '2026-11-14']]);
    expect(S.cuentas.find(c => c.id === 'neq').saldo).toBe(1_195_000);
    expect(S.cuentas.find(c => c.id === 'efe').saldo).toBe(30_000);

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
    // Las filas de Inicio (ADR 156 D5): entidad, tipo y saldo.
    const filaNequi = mini.querySelector('.cuenta-pago__opcion:has(input[value="neq"])');
    expect(filaNequi.querySelector('.cuenta-pago__nombre').textContent).toBe('Nequi');
    expect(filaNequi.querySelector('.cuenta-pago__tipo').textContent).toBe('Depósito de bajo monto');
    expect(filaNequi.querySelector('.cuenta-pago__saldo').textContent).toBe('$1.240.000');
    expect(filaNequi.querySelector('.bank-avatar')).not.toBeNull();
    expect(mini.textContent).not.toContain('Al tocar una');
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
    expect(form.querySelector('#gasto-fila-fecha [data-fila-v]').textContent).toBe('Ayer, 13 de noviembre');
  });

  it('"Otra fecha": el día del calendario queda en el campo y en el recibo, y vuelve marcado', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '9');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    tocarTeja(form, 'Café');
    form.querySelector('#gasto-fila-fecha').click();
    const otra = form.querySelector('input[name="fechaOpcion"][value="otra"]');
    otra.checked = true;
    otra.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.querySelector('#gasto-fecha-otra').hidden).toBe(false);
    form.querySelector('[data-calf-dia="2026-11-03"]').click();
    expect(form.querySelector('#gasto-mini-fecha').hidden).toBe(true);
    expect(form.querySelector('[name="fecha"]').value).toBe('2026-11-03');
    expect(form.querySelector('#gasto-fila-fecha [data-fila-v]').textContent).toBe('Martes 3 de noviembre');
    form.querySelector('#gasto-fila-fecha').click();
    expect(form.querySelector('#gasto-fecha-otra').hidden).toBe(false);
    expect(form.querySelector('#gasto-calendario [aria-pressed="true"]').dataset.calfDia).toBe('2026-11-03');
  });

  it('la nota dice dónde aparece y se conserva al volver al recibo', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '9');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    tocarTeja(form, 'Café');
    expect(form.querySelector('#gasto-fila-nota [data-fila-v]').textContent).toBe('Agregar');
    form.querySelector('#gasto-fila-nota').click();
    const mini = form.querySelector('#gasto-mini-nota');
    expect(mini.querySelector('.mini-hoja__sub').textContent).toBe('Lo que escribas aparece en tu lista de gastos.');
    mini.querySelector('#gasto-nota').value = 'Con Ana';
    mini.querySelector('[data-mini-cerrar].btn').click();
    expect(mini.hidden).toBe(true);
    expect(form.querySelector('#gasto-fila-nota [data-fila-v]').textContent).toBe('Con Ana');
    expect(form.querySelector('#gasto-fila-nota').classList.contains('recibo__fila--vacia')).toBe(false);
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

  // ── SUS.2a (ADR 147 D5): la subcategoría y "¿gusto o necesidad?" ──

  /** Monto de $5.000 (alcanza en Efectivo) y la teja de `categoria`. */
  const hastaElRecibo = (categoria) => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    const teja = form.querySelector(`input[name="categoria"][value="${categoria}"]`);
    teja.checked = true;
    teja.dispatchEvent(new Event('change', { bubbles: true }));
    tocarTeja(form, categoria);
    return form;
  };
  const elegir = (form, name, valor) => {
    const radio = form.querySelector(`fieldset:not([disabled]) input[name="${name}"][value="${valor}"]`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('SUS.2a: Mecato lleva al recibo y la subcategoría es una fila opcional con su mini-hoja', async () => {
    const form = hastaElRecibo('Mecato');
    expect(form.dataset.etapaActual).toBe('revisar');
    const fila = form.querySelector('#gasto-fila-detalle');
    expect(fila.hidden).toBe(false);
    expect(fila.textContent).toContain('¿Qué fue?');
    expect(fila.textContent).toContain('Opcional');
    fila.click();
    const mini = form.querySelector('#gasto-mini-detalle');
    expect(mini.hidden).toBe(false);
    expect(mini.querySelector('[data-sub-grupo="Mecato"]').disabled).toBe(false);
    expect(mini.querySelector('[data-sub-grupo="Café"]').disabled).toBe(true);
    // La mini-hoja dice de qué categoría habla.
    expect(mini.querySelector('.mini-hoja__sub').textContent).toContain('Mecato');
    elegir(form, 'subcategoriaId', 'mecato-helado');
    expect(mini.hidden).toBe(true);
    // La categoría queda una vez arriba y la subcategoría en su fila (ADR 156 D3).
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Mecato');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Helado');

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    const nuevo = S.gastos.find(g => g.categoria === 'Mecato');
    expect(nuevo).toMatchObject({ monto: 5_000, subcategoriaId: 'mecato-helado', caracter: null });
  });

  it('SUS.2a: en Otros la fila pregunta "¿Gusto o necesidad?" y la respuesta queda en el gasto', async () => {
    const form = hastaElRecibo('Otros');
    const fila = form.querySelector('#gasto-fila-detalle');
    expect(fila.hidden).toBe(false);
    expect(fila.textContent).toContain('¿Gusto o necesidad?');
    fila.click();
    elegir(form, 'caracter', 'necesidad');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Una necesidad');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.gastos.find(g => g.categoria === 'Otros')).toMatchObject({ caracter: 'necesidad', subcategoriaId: null });
  });

  it('SUS.2a: en una categoría propia sin respuesta, la pregunta se guarda en la categoría y no vuelve', async () => {
    guardar('categoriasPersonalizadas', { nombre: 'Videojuegos', icono: 'c-computador', seccion: 'gasto' });
    const form = hastaElRecibo('Videojuegos');
    form.querySelector('#gasto-fila-detalle').click();
    elegir(form, 'caracter', 'gusto');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.categoriasPersonalizadas.find(c => c.nombre === 'Videojuegos').caracter).toBe('gusto');
    expect(S.gastos.find(g => g.categoria === 'Videojuegos').caracter).toBeNull();

    // La próxima vez ya no pregunta.
    const otra = hastaElRecibo('Videojuegos');
    expect(otra.querySelector('#gasto-fila-detalle').hidden).toBe(true);
  });

  it('SUS.2c: "Es un gusto" guarda la respuesta por concepto y "Deshacer" la quita', async () => {
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    S.config.hormiga = { tope: 20_000, limite: 50_000, conceptos: { 'c:Otros|recarga': 'necesidad' } };
    accion('gastos-gusto-o-necesidad', { concepto: 'c:Domicilios|', etiqueta: 'Domicilios', respuesta: 'gusto' });
    expect(S.config.hormiga).toEqual({ tope: 20_000, limite: 50_000, conceptos: { 'c:Otros|recarga': 'necesidad', 'c:Domicilios|': 'gusto' } });
    // Los avisos van de a uno: se cierran los de pruebas anteriores hasta que sale este.
    const buscar = () => [...document.querySelectorAll('.fk-toast')].find(t => t.textContent.includes('Anotado: Domicilios'));
    for (let i = 0; i < 8 && !buscar(); i++) {
      document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
      await new Promise(r => setTimeout(r, 450));
    }
    const aviso = buscar();
    expect(aviso.textContent).toContain('Anotado: Domicilios es un gusto');
    aviso.querySelector('.fk-toast__accion').click();
    expect(S.config.hormiga.conceptos).toEqual({ 'c:Otros|recarga': 'necesidad' });
    // Una respuesta que no es gusto ni necesidad no se guarda.
    accion('gastos-gusto-o-necesidad', { concepto: 'c:Domicilios|', etiqueta: 'Domicilios', respuesta: 'quizas' });
    expect(S.config.hormiga.conceptos).toEqual({ 'c:Otros|recarga': 'necesidad' });
  });

  it('SUS.2d: en la ficha, "Lo necesito" corrige el concepto y la respuesta propia del gasto', () => {
    S.config.hormiga = { tope: 20_000, limite: null, conceptos: {} };
    guardar('gastos', { id: 'g9', monto: 8_000, categoria: 'Otros', caracter: 'gusto', nota: 'Recarga celular', cuentaId: 'efe', fecha: '2026-11-12' });
    accion('editar-gasto', { id: 'g9' });
    const form = document.getElementById('form-gasto');
    const bloque = form.querySelector('.ficha__extras .detalle-gasto__caracter');
    expect(bloque.textContent).toContain('Para Finko, Recarga es un gusto');
    dispatch(bloque.querySelector('[data-respuesta="necesidad"]'), new Event('click', { cancelable: true }));
    expect(S.config.hormiga.conceptos).toEqual({ 'c:Otros|recarga': 'necesidad' });
    expect(S.gastos.find(g => g.id === 'g9').caracter).toBe('necesidad');
    expect(form.querySelector('.ficha__extras .detalle-gasto__caracter').textContent).toContain('Recarga es algo que necesitas');
  });

  it('SUS.2a: editar un gasto con subcategoría la trae elegida', () => {
    guardar('gastos', { id: 'g3', monto: 4_000, categoria: 'Café', subcategoriaId: 'cafe-tinto', cuentaId: 'efe', fecha: '2026-11-12' });
    accion('editar-gasto', { id: 'g3' });
    const form = document.getElementById('form-gasto');
    expect(form.querySelector('[data-sub-grupo="Café"] input[value="cafe-tinto"]').checked).toBe(true);
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Café');
    expect(form.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Tinto');
  });
});
