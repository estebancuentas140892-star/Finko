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
import { fechaDelRecibo, escribirMontoGasto, pintarReciboGasto } from '../../modules/dominio/gastos/telefono.js';
import { CATEGORIA_ILUSTRACION } from '../../modules/core/constants.js';
import { htmlMiniHoja, abrirMiniHoja, miniHojaAbierta } from '../../modules/ui/mini-hoja.js';
import { mostrarToast } from '../../modules/ui/toast.js';
import { initMiles } from '../../modules/ui/miles.js';
import { hoy } from '../../modules/infra/utils.js';

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

  // GAS.5b (ADR 161 D2): al editar, lo que el gasto ya descontó de la misma
  // cuenta vuelve a contar como disponible; de otra cuenta, nada.
  it('al editar, solo pide la diferencia en la misma cuenta', () => {
    const anterior = { cuentaId: 'efe', monto: 20_000 };
    expect(planSiNoAlcanza(cuentas, 50_000, 'efe', anterior)).toBeNull();
    expect(planSiNoAlcanza(cuentas, 60_000, 'efe', anterior)).toEqual({
      cuenta: { id: 'efe', nombre: 'Efectivo', saldo: 50_000 },
      falta: 10_000,
    });
    expect(planSiNoAlcanza(cuentas, 20_000, 'ban', anterior)).toEqual({
      cuenta: { id: 'ban', nombre: 'Banco', saldo: 10_000 },
      falta: 10_000,
    });
    // Un gasto importado nunca descontó: no devuelve nada.
    expect(planSiNoAlcanza(cuentas, 50_000, 'efe', { ...anterior, sinEfectoSaldo: true })).not.toBeNull();
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
/** La teja como la elige el dedo: queda marcada, avisa el cambio y avanza. */
const elegirTeja = (form, valor) => {
  const teja = form.querySelector(`input[name="categoria"][value="${valor}"]`);
  teja.checked = true;
  teja.dispatchEvent(new Event('change', { bubbles: true }));
  tocarTeja(form, valor);
};
/** GAS.5c: un toque en una opción de "¿En qué fue?" o en la respuesta (el clic llega antes del change). */
const tocarOpcion = (form, name, valor) => {
  const radio = form.querySelector(`fieldset:not([disabled]) input[name="${name}"][value="${valor}"]`);
  radio.checked = true;
  radio.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
  radio.dispatchEvent(new Event('change', { bubbles: true }));
};

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
    // GAS.5c (ADR 162 D1): Mercado tiene subcategorías, así que sigue "¿En qué fue?".
    expect(form.dataset.etapaActual).toBe('detalle');
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
    // GAS.10c (ADR 185 D4): sin la instrucción a la vista; las categorías
    // bajo su área, en el orden del tablero, cada una en su tono.
    expect(form.querySelector('#gasto-cat-q').classList.contains('sr-only')).toBe(true);
    expect(form.querySelector('.preg__s')).toBeNull();
    expect([...form.querySelectorAll('.tejas__area')].map(a => a.textContent)).toEqual(['Comida', 'Transporte', 'Personal', 'Casa y familia']);
    expect(form.querySelector('.teja-op__t').textContent).toBe('Mercado');
    expect(form.querySelector('.teja-op__teja').getAttribute('style')).toBe('--teja-tono:var(--fk-cat-mercado)');
    const sueltas = [...form.querySelectorAll('.tejas--sueltas .teja-op__t')].map(t => t.textContent);
    expect(sueltas).toEqual(['Otros', 'Crear categoría']);
    elegirTeja(form, 'Mercado');
    // GAS.5c (ADR 162 D1): el detalle antes del recibo; Supermercado no pregunta más.
    // GAS.10c: arriba, la categoría con su teja.
    expect(form.dataset.etapaActual).toBe('detalle');
    expect(form.querySelector('#gasto-detalle-q').textContent).toBe('Mercado');
    expect(form.querySelector('[data-detalle-teja] use').getAttribute('href')).toBe('#c-mercado');
    expect(form.querySelector('[data-caracter-grupo]').disabled).toBe(true);
    tocarOpcion(form, 'subcategoriaId', 'mercado-super');
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
    expect(fila.textContent).toContain('tienes $30.000');
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
    elegirTeja(form, 'Mercado');
    tocarOpcion(form, 'subcategoriaId', 'mercado-super');
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
    elegirTeja(form, 'Mercado');
    tocarOpcion(form, 'subcategoriaId', 'mercado-super');
    form.querySelector('#gasto-fila-cuenta').click();
    const nequi = form.querySelector('#gasto-mini-cuenta input[value="neq"]');
    nequi.checked = true;
    nequi.dispatchEvent(new Event('change', { bubbles: true }));
    expect(form.querySelector('#gasto-aviso-saldo').hidden).toBe(true);
    expect(form.querySelector('#gasto-fila-cuenta').textContent).toContain('quedan $1.195.000');
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
    expect(form.querySelector('#gasto-fila-cuenta').textContent).toContain('quedan $1.239.991');

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

  it('GAS.10d: la nota es "Nota" y "+ Agregar"; se escribe en su hoja y se conserva al volver', () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '9');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    tocarTeja(form, 'Café');
    expect(form.querySelector('#gasto-fila-nota [data-fila-v]').textContent).toBe('Nota');
    expect(form.querySelector('#gasto-fila-nota [data-fila-accion]').textContent).toBe('Agregar');
    form.querySelector('#gasto-fila-nota').click();
    const mini = form.querySelector('#gasto-mini-nota');
    // "Nota", el campo y "Listo": sin la frase de ayuda.
    expect(mini.querySelector('.mini-hoja__sub')).toBeNull();
    expect(mini.querySelector('#gasto-nota').tagName).toBe('TEXTAREA');
    mini.querySelector('#gasto-nota').value = 'Con Ana';
    mini.querySelector('[data-mini-cerrar].btn').click();
    expect(mini.hidden).toBe(true);
    expect(form.querySelector('#gasto-fila-nota [data-fila-v]').textContent).toBe('Con Ana');
    expect(form.querySelector('#gasto-fila-nota [data-fila-accion]').textContent).toBe('Cambiar');
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
    // GAS.13b (ADR 188 D2): "Gasto registrado", la papelera y "Repetir este gasto".
    expect(document.getElementById('modal-gasto-title').textContent).toBe('Gasto registrado');
    expect(form.querySelector('.ficha__papelera').getAttribute('aria-label')).toBe('Eliminar este gasto');
    expect(form.querySelector('[data-action="repetir-gasto"]').textContent.trim()).toBe('Repetir este gasto');
    expect(form.querySelector('.recibo__ayuda')).toBeNull();
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

  // GMF.1b (ADR 165 D4): desde una cuenta que paga 4x1000, el recibo lo dice y lo descuenta.
  it('GMF.1b: el recibo dice el 4x1000 y guardar lo descuenta con el gasto', async () => {
    guardar('cuentas', { id: 'bco', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true, exenta4x1000: false, aplica4x1000: true });
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '1'); tocar(form, '0'); tocar(form, '0'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    elegirTeja(form, 'Mercado');
    tocarOpcion(form, 'subcategoriaId', 'mercado-super');
    form.querySelector('#gasto-fila-cuenta').click();
    const bco = form.querySelector('#gasto-mini-cuenta input[value="bco"]');
    bco.checked = true;
    bco.dispatchEvent(new Event('change', { bubbles: true }));
    const fila = form.querySelector('#gasto-fila-cuenta');
    expect(fila.textContent).toContain('quedan $399.600');
    expect(fila.querySelector('.recibo__gmf').textContent).toBe('Incluye $400 de 4x1000');
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.gastos.find(g => g.cuentaId === 'bco')).toMatchObject({ monto: 100_000, costoGMF: 400 });
    expect(S.cuentas.find(c => c.id === 'bco').saldo).toBe(399_600);
  });

  // GAS.5b (ADR 161 D2): la ficha tampoco deja una cuenta por debajo de $0.
  it('GAS.5b: en la ficha, pasar el gasto a una cuenta sin saldo no guarda y lo dice', async () => {
    guardar('cuentas', { id: 'cero', nombre: 'Cuenta vacía', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 0, activa: true });
    accion('editar-gasto', { id: 'g1' });
    const form = document.getElementById('form-gasto');
    // Lo que el gasto ya descontó cuenta: en Efectivo le quedan sus $30.000.
    expect(form.querySelector('#gasto-fila-cuenta').textContent).toContain('quedan $30.000');
    form.querySelector('#gasto-fila-cuenta').click();
    const cero = form.querySelector('#gasto-mini-cuenta input[value="cero"]');
    cero.checked = true;
    cero.dispatchEvent(new Event('change', { bubbles: true }));
    await esperar();
    expect(S.gastos.find(g => g.id === 'g1').cuentaId).toBe('efe');
    expect(S.cuentas.find(c => c.id === 'cero').saldo).toBe(0);
    expect(S.cuentas.find(c => c.id === 'efe').saldo).toBe(30_000);
    const aviso = form.querySelector('#gasto-aviso-saldo');
    expect(aviso.hidden).toBe(false);
    expect(aviso.textContent).toContain('faltan $10.000');
  });

  // ── SUS.2a (ADR 147 D5): la subcategoría y "¿gusto o necesidad?" ──

  /**
   * Monto de $5.000 (alcanza en Efectivo), la teja de `categoria` y, si toca,
   * "¿En qué fue?" (GAS.5c): la subcategoría (`sub`, "Otra cosa" si no se da)
   * y la respuesta (`caracter`) cuando la pregunta aparece.
   */
  const hastaElRecibo = (categoria, { sub = '', caracter = 'necesidad' } = {}) => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    elegirTeja(form, categoria);
    if (form.dataset.etapaActual === 'detalle') {
      if (form.querySelector('[data-sub-grupo]:not([disabled])')) tocarOpcion(form, 'subcategoriaId', sub);
      if (form.dataset.etapaActual === 'detalle') tocarOpcion(form, 'caracter', caracter);
    }
    return form;
  };

  it('GAS.5c: Antojos pasa por "¿En qué fue?"; Helado no pregunta y la fila del recibo vuelve a la etapa', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    elegirTeja(form, 'Antojos');
    expect(form.dataset.etapaActual).toBe('detalle');
    const etapa = form.querySelector('[data-etapa="detalle"]');
    expect(etapa.querySelector('[data-sub-grupo="Antojos"]').disabled).toBe(false);
    expect(etapa.querySelector('[data-sub-grupo="Café"]').disabled).toBe(true);
    // "Otra cosa" va al final de la lista.
    const opciones = [...etapa.querySelectorAll('[data-sub-grupo="Antojos"] .chip-cat__label')].map(l => l.textContent);
    expect(opciones.at(-1)).toBe('Otra cosa');
    tocarOpcion(form, 'subcategoriaId', 'mecato-helado');
    expect(form.dataset.etapaActual).toBe('revisar');
    // La categoría queda una vez arriba y la subcategoría en su fila (ADR 156 D3).
    const fila = form.querySelector('#gasto-fila-detalle');
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Antojos');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Helado');
    expect(fila.textContent).not.toContain('Opcional');
    fila.click();
    expect(form.dataset.etapaActual).toBe('detalle');
    tocarOpcion(form, 'subcategoriaId', 'mecato-helado');

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    const nuevo = S.gastos.find(g => g.categoria === 'Antojos');
    expect(nuevo).toMatchObject({ monto: 5_000, subcategoriaId: 'mecato-helado', caracter: null });
  });

  it('GAS.5c: Taxi pregunta si fue necesidad o deseo; la respuesta es de ese gasto y Bus no pregunta', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '9'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    elegirTeja(form, 'Bus, taxi y apps');
    const opciones = [...form.querySelectorAll('[data-sub-grupo="Bus, taxi y apps"] .chip-cat__label')].map(l => l.textContent);
    expect(opciones.slice(0, 3)).toEqual(['Transporte público', 'Taxi', 'App de transporte']);
    tocarOpcion(form, 'subcategoriaId', 'transp-taxi');
    // Se queda: la pregunta aparece dentro de la opción, justo debajo de
    // Taxi (GAS.10c, ADR 185 D4), sin "Opcional".
    expect(form.dataset.etapaActual).toBe('detalle');
    const pregunta = form.querySelector('[data-caracter-grupo]');
    expect(pregunta.disabled).toBe(false);
    expect(pregunta.previousElementSibling.querySelector('input').value).toBe('transp-taxi');
    expect(pregunta.querySelector('legend').textContent).toBe('¿Fue una necesidad o un deseo?');
    expect([...pregunta.querySelectorAll('.chip-cat__label')].map(l => l.textContent)).toEqual(['Necesidad', 'Deseo']);
    expect(pregunta.querySelector('[data-caracter-ayuda]').textContent).toContain('solo para este gasto');
    tocarOpcion(form, 'caracter', 'gusto');
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Taxi · Deseo');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.gastos.find(g => g.categoria === 'Bus, taxi y apps')).toMatchObject({ subcategoriaId: 'transp-taxi', caracter: 'gusto' });
    // Finko no lo aprende: lo contestado no va a la configuración.
    expect(S.config.hormiga?.conceptos ?? {}).toEqual({});

    // Transporte público es una necesidad: no pregunta y va al recibo.
    const otro = hastaElRecibo('Bus, taxi y apps', { sub: 'transp-bus' });
    expect(otro.dataset.etapaActual).toBe('revisar');
    expect(otro.querySelector('[data-caracter-grupo]').disabled).toBe(true);
    expect(otro.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Transporte público');
  });

  it('GAS.5c: sin responder no se registra; enviar lleva a la pregunta', async () => {
    accion('nuevo-gasto');
    const form = document.getElementById('form-gasto');
    tocar(form, '5'); tocar(form, '000');
    form.querySelector('[data-gasto-seguir="monto"]').click();
    elegirTeja(form, 'Otros');
    // Sin subcategorías, la categoría arriba y la pregunta sola debajo.
    expect(form.dataset.etapaActual).toBe('detalle');
    expect(form.querySelector('#gasto-detalle-q').textContent).toBe('Otros');
    expect(form.querySelector('[data-etapa="detalle"]').classList.contains('etapa-gasto--solo-pregunta')).toBe(true);
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.gastos.filter(g => g.categoria === 'Otros')).toHaveLength(0);
    expect(form.dataset.etapaActual).toBe('detalle');
    expect(form.querySelector('input[name="caracter"]').getAttribute('aria-invalid')).toBe('true');
    expect(form.textContent).toContain('Elige si fue una necesidad o un deseo');
  });

  it('GAS.5c: en Otros la respuesta queda en el gasto', async () => {
    const form = hastaElRecibo('Otros', { caracter: 'necesidad' });
    const fila = form.querySelector('#gasto-fila-detalle');
    expect(fila.hidden).toBe(false);
    expect(fila.querySelector('.recibo__k').textContent).toBe('Detalle');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Necesidad');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.gastos.find(g => g.categoria === 'Otros')).toMatchObject({ caracter: 'necesidad', subcategoriaId: null });
  });

  it('GAS.13b (ADR 188 D2, cambia GAS.5c): "Repetir este gasto" lleva a la factura con todo igual, también la respuesta', () => {
    guardar('gastos', { id: 'gt', monto: 9_000, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', caracter: 'gusto', cuentaId: 'efe', fecha: '2026-11-12' });
    accion('repetir-gasto', { id: 'gt' });
    const form = document.getElementById('form-gasto');
    expect(form.dataset.etapaActual).toBe('revisar');
    expect(form.querySelector('[data-sub-grupo="Bus, taxi y apps"] input[value="transp-taxi"]').checked).toBe(true);
    expect(form.querySelector('[data-caracter-grupo] input:checked').value).toBe('gusto');
    expect(form.querySelector('#gasto-fecha').value).toBe(hoy());
    expect(document.getElementById('modal-gasto-title').textContent).toBe('Revisa tu gasto');
  });

  it('SUS.2a: en una categoría propia sin respuesta, la pregunta se guarda en la categoría y no vuelve', async () => {
    guardar('categoriasPersonalizadas', { nombre: 'Videojuegos', icono: 'c-computador', seccion: 'gasto' });
    const form = hastaElRecibo('Videojuegos', { caracter: 'gusto' });
    expect(form.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Deseo');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await esperar();
    expect(S.categoriasPersonalizadas.find(c => c.nombre === 'Videojuegos').caracter).toBe('gusto');
    expect(S.gastos.find(g => g.categoria === 'Videojuegos').caracter).toBeNull();

    // La próxima vez ya no pregunta: va directo al recibo.
    const otra = hastaElRecibo('Videojuegos');
    expect(otra.dataset.etapaActual).toBe('revisar');
    expect(otra.querySelector('#gasto-fila-detalle').hidden).toBe(true);
  });

  it('SUS.2c, desde GAS.5c: la respuesta va a los gastos de ese concepto sin respuesta, no a lo aprendido; "Deshacer" la quita', async () => {
    document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
    await new Promise(r => setTimeout(r, 450));
    S.config.hormiga = { tope: 20_000, limite: 50_000, conceptos: { 'c:Otros|recarga': 'necesidad' } };
    guardar('gastos', { id: 'r1', monto: 9_000, categoria: 'Restaurantes', cuentaId: 'efe', fecha: '2026-11-11' });
    guardar('gastos', { id: 'r2', monto: 9_500, categoria: 'Restaurantes', cuentaId: 'efe', fecha: '2026-11-12' });
    guardar('gastos', { id: 'r3', monto: 9_900, categoria: 'Restaurantes', caracter: 'necesidad', cuentaId: 'efe', fecha: '2026-11-13' });
    accion('gastos-gusto-o-necesidad', { concepto: 'c:Restaurantes|', etiqueta: 'Restaurantes', respuesta: 'gusto' });
    expect(['r1', 'r2', 'r3'].map(id => S.gastos.find(g => g.id === id).caracter)).toEqual(['gusto', 'gusto', 'necesidad']);
    expect(S.config.hormiga).toEqual({ tope: 20_000, limite: 50_000, conceptos: { 'c:Otros|recarga': 'necesidad' } });
    // Los avisos van de a uno: se cierran los de pruebas anteriores hasta que sale este.
    const buscar = () => [...document.querySelectorAll('.fk-toast')].find(t => t.textContent.includes('Anotado: Restaurantes'));
    for (let i = 0; i < 8 && !buscar(); i++) {
      document.querySelectorAll('.fk-toast__cerrar').forEach(b => b.click());
      await new Promise(r => setTimeout(r, 450));
    }
    const aviso = buscar();
    expect(aviso.textContent).toContain('Anotado: Restaurantes fue un deseo');
    aviso.querySelector('.fk-toast__accion').click();
    expect(['r1', 'r2', 'r3'].map(id => S.gastos.find(g => g.id === id).caracter)).toEqual([null, null, 'necesidad']);
    // Una respuesta que no es necesidad ni deseo no se guarda.
    accion('gastos-gusto-o-necesidad', { concepto: 'c:Restaurantes|', etiqueta: 'Restaurantes', respuesta: 'quizas' });
    expect(S.gastos.find(g => g.id === 'r1').caracter).toBeNull();
  });

  it('GAS.13f (ADR 188 D6): en la ficha, necesidad o deseo se contesta en la fila Detalle, sin bloque aparte', () => {
    S.config.hormiga = { tope: 20_000, limite: null, conceptos: {} };
    guardar('gastos', { id: 'g9', monto: 8_000, categoria: 'Otros', caracter: 'gusto', nota: 'Recarga celular', cuentaId: 'efe', fecha: '2026-11-12' });
    accion('editar-gasto', { id: 'g9' });
    const form = document.getElementById('form-gasto');
    expect(form.querySelector('.ficha__extras .detalle-gasto__caracter')).toBeNull();
    expect(form.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Deseo');
    form.querySelector('#gasto-fila-detalle').click();
    expect(form.dataset.etapaActual).toBe('detalle');
    expect(form.querySelector('[data-caracter-grupo] input[value="gusto"]').checked).toBe(true);
    expect(form.querySelector('.ficha__extras .detalle-gasto__ver--enlace').textContent.trim()).toBe('Ver en Movimientos');
  });

  it('SUS.2a: editar un gasto con subcategoría la trae elegida', () => {
    guardar('gastos', { id: 'g3', monto: 4_000, categoria: 'Café', subcategoriaId: 'cafe-tinto', cuentaId: 'efe', fecha: '2026-11-12' });
    accion('editar-gasto', { id: 'g3' });
    const form = document.getElementById('form-gasto');
    expect(form.querySelector('[data-sub-grupo="Café"] input[value="cafe-tinto"]').checked).toBe(true);
    expect(form.querySelector('[data-recibo-cat]').textContent).toBe('Café');
    // GAS.13f (ADR 188 D6): un tinto depende y sin contestar se pregunta en la fila.
    expect(form.querySelector('#gasto-fila-detalle [data-fila-v]').textContent).toBe('Tinto · ¿Necesidad o deseo?');
  });

  it('GAS.13f (ADR 188 D6): el paso a paso dice lo elegido y se toca para volver; sin el monto de subtítulo', () => {
    const form = hastaElRecibo('Mercado');
    const t = [...form.querySelectorAll('.etapa .etapa__t')].map(e => e.textContent);
    expect(t[0]).toMatch(/^\$\d/);
    expect(t[1]).toBe('Mercado');
    expect(t.at(-1)).toBe('Revisar');
    expect(document.querySelector('#modal-gasto .modal__titulo-sub')).toBeNull();
    form.querySelector('.etapa[data-etapa-de="categoria"] .etapa__b').click();
    expect(form.dataset.etapaActual).toBe('categoria');
    expect(form.querySelector('.etapa[data-etapa-de="revisar"] .etapa__b').disabled).toBe(true);
  });

  // ── FAC.1 (ADR 180): el recibo es una factura ──

  const usoDe = (raiz, sel) => raiz.querySelector(`${sel} use`)?.getAttribute('href') ?? null;

  it('FAC.1: el recibo es una factura: sello, título, cifra con COP, filas con su ícono, la nota aparte y barras', () => {
    const form = hastaElRecibo('Mercado');
    const factura = form.querySelector('[data-etapa="revisar"] .factura');
    expect(factura.querySelector('.factura__sello').getAttribute('aria-hidden')).toBe('true');
    expect(usoDe(factura, '.factura__disco')).toBe('#id-isotipo');
    expect(factura.querySelector('[data-recibo-titulo]').textContent).toBe('Nuevo gasto');
    expect(factura.querySelector('.factura__cifra .factura__moneda').textContent).toBe('COP');
    // La cifra va sola: la categoría es la primera fila, con su glifo, una vez.
    expect(factura.querySelector('.factura__cifra').textContent).not.toContain('Mercado');
    const filas = [...factura.querySelectorAll('.factura__filas:not(.factura__filas--nota) > .recibo__fila')].map(f => f.id);
    expect(filas).toEqual(['gasto-fila-categoria', 'gasto-fila-detalle', 'gasto-fila-cuenta', 'grupo-gasto-cuotas', 'gasto-fila-fecha']);
    expect(factura.querySelector('#gasto-fila-categoria .recibo__k').textContent).toBe('Categoría');
    expect(factura.querySelector('#gasto-fila-categoria [data-recibo-cat]').textContent).toBe('Mercado');
    expect(usoDe(factura, '#gasto-fila-categoria [data-recibo-teja]')).toBe('#c-mercado');
    // Cada campo con su ícono de contorno del sprite; la nota, tras otro corte.
    const iconos = {
      'gasto-fila-detalle': 'c-etiqueta', 'gasto-fila-cuenta': 'i-cuentas', 'grupo-gasto-cuotas': 'i-recurring',
      'gasto-fila-fecha': 'i-agenda', 'gasto-fila-nota': 'i-nota',
    };
    for (const [id, simbolo] of Object.entries(iconos)) {
      expect(usoDe(factura, `#${id} .recibo__campo`)).toBe(`#${simbolo}`);
      expect(HTML).toContain(`<symbol id="${simbolo}"`);
    }
    expect(factura.querySelector('.factura__filas--nota #gasto-fila-nota')).not.toBeNull();
    const barras = factura.querySelector('.factura__barras');
    expect(barras.getAttribute('aria-hidden')).toBe('true');
    expect(barras.querySelector('path').getAttribute('d')).toMatch(/^M0 0h\d/);
    // Ya no lleva las piezas del comprobante de GAS.C.
    expect(factura.querySelector('.comprobante__pestana, .comprobante__destello, .comprobante__dibujo, .comprobante__glifo')).toBeNull();
    expect(form.querySelectorAll('.recibo__pie button')).toHaveLength(1);
  });

  it('FAC.1: cada categoría lleva su glifo en su fila; el catálogo de ilustraciones sigue en el sprite', () => {
    const form = hastaElRecibo('Café');
    expect(usoDe(form, '#gasto-fila-categoria [data-recibo-teja]')).toBe('#c-cafe');
    for (const id of new Set(Object.values(CATEGORIA_ILUSTRACION))) {
      expect(HTML).toContain(`<symbol id="${id}"`);
    }
  });

  it('GAS.C: la cabecera del comprobante lleva el isotipo, hojas y "Revisa tu gasto" (GAS.13b); al volver al monto se van', () => {
    const form = hastaElRecibo('Mercado');
    const cab = document.querySelector('#modal-gasto .modal__header');
    const marca = cab.querySelector('[data-gasto-marca]');
    const hojas = cab.querySelector('[data-gasto-hojas]');
    expect(cab.dataset.etapaCab).toBe('revisar');
    expect(marca.hidden).toBe(false);
    expect(hojas.hidden).toBe(false);
    expect(marca.querySelector('use').getAttribute('href')).toBe('#id-isotipo');
    expect(usoDe(hojas, '.modal__hoja')).toBe('#cmp-decoracion-hojas');
    expect(document.getElementById('modal-gasto-title').textContent).toBe('Revisa tu gasto');
    form.querySelector('[data-gasto-ir="monto"]').click();
    expect(marca.hidden).toBe(true);
    expect(hojas.hidden).toBe(true);
    expect(document.getElementById('modal-gasto-title').textContent).toBe('Nuevo gasto');
    expect(cab.querySelectorAll('[data-gasto-marca], [data-gasto-hojas]')).toHaveLength(2);
  });

  it('GAS.10d: "Cuenta de origen" dice la entidad y a su lado lo que queda, sin el tipo; efectivo y tarjeta cambian el rótulo', () => {
    guardar('cuentas', { id: 'bca', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 300_000, activa: true });
    guardar('compromisos', { id: 't1', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', descripcion: 'Visa', cupoTotal: 2_000_000, saldoTotal: 0, activo: true });
    const form = hastaElRecibo('Café');
    const fila = form.querySelector('#gasto-fila-cuenta');
    const k = () => fila.querySelector('.recibo__k').textContent;
    const tipo = () => fila.querySelector('.recibo__tipo')?.textContent ?? null;
    const elegirCuenta = (valor) => {
      const radio = form.querySelector(`input[name="cuentaId"][value="${valor}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // Habitual: Efectivo (los dos cafés). Sin tipo.
    expect(k()).toBe('Sale de');
    expect(tipo()).toBeNull();
    expect(fila.textContent).toContain('quedan $25.000');

    // "Bancolombia Ahorros" se pinta "Bancolombia", sin el tipo (GAS.10d, ADR
    // 185 D5), con el ícono del banco. El nombre guardado no cambia.
    elegirCuenta('bca');
    expect(k()).toBe('Cuenta de origen');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Bancolombia');
    expect(tipo()).toBeNull();
    expect(fila.querySelector('[data-fila-s]').textContent).toBe('quedan $295.000');
    expect(usoDe(form, '#gasto-fila-cuenta .recibo__campo')).toBe('#i-cuentas');
    expect(fila.querySelector('[data-fila-figura] .bank-avatar')).not.toBeNull();
    expect(S.cuentas.find(c => c.id === 'bca').nombre).toBe('Bancolombia Ahorros');

    elegirCuenta('tc:t1');
    expect(k()).toBe('Tarjeta de crédito');
    expect(fila.querySelector('[data-fila-v]').textContent).toBe('Visa');
    expect(fila.querySelector('[data-fila-s]').textContent).toBe('cupo $1.995.000');
    expect(usoDe(form, '#gasto-fila-cuenta .recibo__campo')).toBe('#i-deudas');
  });

  it('GAS.C: una cifra larga baja de tamaño para no partirse', () => {
    const form = hastaElRecibo('Mercado');
    const cifra = form.querySelector('[data-recibo-monto]');
    expect(cifra.className).toBe('recibo__monto');
    escribirMontoGasto(form, 12_345_678);
    pintarReciboGasto(form);
    expect(cifra.classList.contains('recibo__monto--largo')).toBe(true);
    expect(cifra.classList.contains('recibo__monto--enorme')).toBe(false);
    escribirMontoGasto(form, 1_234_567_890);
    pintarReciboGasto(form);
    expect(cifra.textContent).toBe('$1.234.567.890');
    expect(cifra.classList.contains('recibo__monto--enorme')).toBe(true);
  });
});
