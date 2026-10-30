/**
 * distribuir-movil.test.js - Distribuir sin salir de donde estás (ADR 110).
 *
 * Cubre:
 * - motivoSinDistribuir() (D3): por qué "Distribuir" no avanza, en el orden en
 *   que el usuario lo resuelve.
 * - La vista (D2, D3): la pregunta de lo que queda abre el último paso, y el
 *   resumen y los botones forman un solo pie después del déficit.
 * - En el teléfono (D4, D5): qué se reparte y desde dónde en una fila con
 *   "Cambiar", la cuenta preguntada al empezar si no está guardada, y la
 *   comparación compacta dentro del paso 1 con los métodos a un toque.
 * - La cara final (D6): qué quedó, con "Deshacer" y "Listo".
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { motivoSinDistribuir, unirNombres } from '../../modules/dominio/tesoreria/logic/distribucion.js';
import { renderAsistenteDistribucion, htmlResultadoDistribucion } from '../../modules/dominio/tesoreria/view.js';

describe('motivoSinDistribuir() (ADR 110 D3)', () => {
  const listo = {
    monto: 3_000_000, asignado: 600_000, transferido: 0, sinAsignar: 2_400_000,
    recibido: { resuelto: true }, excedeTransferencia: false, faltaDecidirRemanente: false,
  };

  it('sin nada pendiente no dice nada', () => {
    expect(motivoSinDistribuir(listo)).toBe('');
  });

  it('lo que queda sin decidir se nombra con su monto', () => {
    expect(motivoSinDistribuir({ ...listo, faltaDecidirRemanente: true }))
      .toBe('Elige arriba qué hacer con los $2.400.000 que quedan.');
  });

  it('va en el orden en que se resuelve: monto, ingresos, cuentas, marcas y lo que queda', () => {
    const todo = {
      ...listo, monto: 0, asignado: 0, recibido: { resuelto: false },
      excedeTransferencia: true, faltaDecidirRemanente: true,
    };
    expect(motivoSinDistribuir(todo)).toBe('Escribe cuánto vas a distribuir.');
    expect(motivoSinDistribuir({ ...todo, monto: 1 })).toBe('Revisa qué ingresos te llegaron.');
    expect(motivoSinDistribuir({ ...todo, monto: 1, recibido: { resuelto: true } }))
      .toBe('Lo que mueves a otras cuentas pasa de lo que queda para tu estilo de vida.');
    expect(motivoSinDistribuir({ ...todo, monto: 1, recibido: { resuelto: true }, excedeTransferencia: false }))
      .toBe('Marca al menos un pago o un aporte.');
  });

  it('una transferencia sola ya es algo marcado', () => {
    expect(motivoSinDistribuir({ ...listo, asignado: 0, transferido: 100_000 })).toBe('');
  });

  it('sin cuenta de origen elegida, eso va antes que lo demás (D4)', () => {
    expect(motivoSinDistribuir({ ...listo, faltaCuenta: true, faltaDecidirRemanente: true }))
      .toBe('Elige arriba desde qué cuenta sale el dinero.');
  });
});

describe('unirNombres() (ADR 110 D4)', () => {
  it('une como se dice', () => {
    expect(unirNombres([])).toBe('');
    expect(unirNombres(['Salario'])).toBe('Salario');
    expect(unirNombres(['Salario', 'Prima'])).toBe('Salario y Prima');
    expect(unirNombres(['Salario', 'Prima', 'Clases'])).toBe('Salario, Prima y Clases');
    expect(unirNombres(['Salario', '', null])).toBe('Salario');
  });
});

describe('el asistente: la pregunta primero y un solo pie (ADR 110 D2, D3)', () => {
  const body = () => document.getElementById('modal-distribuir-body');

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-distribuir-body"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [];
    S.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
    S.apartados = []; S.inversiones = []; S.gastos = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 }, aportes: [] };
    S.config = { ...S.config, presetDistribucion: '50-30-20', ultimaDistribucionPeriodo: null };
  });

  it('en el último paso, "¿Qué haces con lo que queda?" va antes que todo lo demás', () => {
    renderAsistenteDistribucion();
    const pasos = [...body().querySelectorAll('[data-dist-paso]')];
    const ultimo = pasos.at(-1);
    expect(ultimo.dataset.distPasoTitulo).toBe('Estilo de vida');
    expect(ultimo.firstElementChild.id).toBe('distribuir-remanente');
  });

  it('el resumen y los botones forman el pie, después del déficit', () => {
    renderAsistenteDistribucion();
    const pie = body().querySelector('#distribuir-ingreso-panel > .distribuir__pie');
    expect(pie).not.toBeNull();
    expect(pie.querySelector('#distribuir-resumen')).not.toBeNull();
    expect(pie.querySelector('[data-action="confirmar-distribucion"]')).not.toBeNull();
    expect(pie.querySelector('[data-action="distribuir-paso-siguiente"]')).not.toBeNull();
    const deficit = body().querySelector('#distribuir-deficit');
    // 4 = DOCUMENT_POSITION_FOLLOWING: el pie va después del déficit.
    expect(deficit.compareDocumentPosition(pie) & 4).toBeTruthy();
    expect(pie.nextElementSibling).toBeNull();
  });
});

describe('en el teléfono: qué se reparte arriba y cada paso lo suyo (ADR 110 D4, D5)', () => {
  const body = () => document.getElementById('modal-distribuir-body');
  const matchMediaOriginal = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    document.body.innerHTML = '<div id="modal-distribuir-body"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [
      { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
    ];
    S.metas = []; S.apartados = []; S.inversiones = []; S.gastos = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 }, aportes: [] };
    S.config = { ...S.config, presetDistribucion: 'auto', ultimaDistribucionPeriodo: null };
  });

  afterEach(() => { window.matchMedia = matchMediaOriginal; });

  it('una fila dice cuánto, de qué ingresos y desde qué cuenta, con un solo "Cambiar"', () => {
    renderAsistenteDistribucion();
    const que = body().querySelector('.distribuir__que');
    expect(que.querySelector('[data-dist-que-monto]').textContent).toBe('$3.000.000');
    expect(que.querySelector('[data-dist-que-sub]').textContent).toBe('Salario · desde Nequi');
    const cambiar = que.querySelector('[data-action="distribuir-cambiar"]');
    expect(cambiar.getAttribute('aria-expanded')).toBe('false');
    // El monto vive plegado bajo "Cambiar"; con una sola cuenta no hay pregunta.
    const zona = body().querySelector('#distribuir-cambiar');
    expect(zona.hidden).toBe(true);
    expect(zona.querySelector('#distribuir-monto')).not.toBeNull();
    expect(body().querySelector('#distribuir-cuenta')).toBeNull();
  });

  it('con varias cuentas y ninguna guardada, la pregunta abre desplegada y sin respuesta', () => {
    S.cuentas.push({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true });
    renderAsistenteDistribucion();
    const select = body().querySelector('#distribuir-cuenta');
    expect(select.value).toBe('');
    expect(body().querySelector('#distribuir-cambiar').hidden).toBe(false);
    expect(body().querySelector('[data-dist-que-sub]').textContent).toBe('Salario');
  });

  it('con la cuenta guardada en el ingreso, llega elegida y plegada', () => {
    S.cuentas.push({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 500_000, activa: true });
    S.ingresos[0].cuentaId = 'c2';
    renderAsistenteDistribucion();
    expect(body().querySelector('#distribuir-cuenta').value).toBe('c2');
    expect(body().querySelector('#distribuir-cambiar').hidden).toBe(true);
    expect(body().querySelector('[data-dist-que-sub]').textContent).toBe('Salario · desde Bancolombia');
  });

  it('la comparación va compacta dentro del paso 1, con el porqué y los métodos a un toque', () => {
    renderAsistenteDistribucion();
    const paso1 = body().querySelector('[data-dist-paso="0"]');
    const edu = paso1.querySelector('.distribuir-edu--compacto');
    expect(edu).not.toBeNull();
    expect(edu.querySelectorAll('.distribuir-edu__tuyo')).toHaveLength(3);
    expect(edu.querySelector('.distribuir-edu__que')).toBeNull();
    expect(edu.querySelector('.distribuir-edu__barra')).toBeNull();
    // Nada de la educación fuera de los pasos.
    expect(body().querySelectorAll('.distribuir-edu')).toHaveLength(1);

    const metodo = paso1.querySelector('details.distribuir-metodo');
    expect(metodo.open).toBe(false);
    expect(metodo.querySelector('summary').textContent).toBe('Cómo lo calculamos y otros métodos');
    expect(metodo.querySelector('.distribuir-edu__razon').textContent.length).toBeGreaterThan(0);
    expect(metodo.querySelector('[data-action="cambiar-preset-distribucion"][data-preset="auto"]')).not.toBeNull();
    expect(metodo.querySelector('[data-action="toggle-distribucion-personalizada"]')).not.toBeNull();
  });
});

describe('htmlResultadoDistribucion() (ADR 110 D6)', () => {
  const base = {
    distribuido: 2_709_186, ingreso: 4_800_000,
    pagos: [
      { nombre: 'Arriendo', monto: 1_350_000 }, { nombre: 'Crédito', monto: 510_000 },
      { nombre: 'Gimnasio', monto: 89_900 }, { nombre: 'Plan Claro', monto: 65_000 },
    ],
    aportes: [{ nombre: 'Viaje a Cartagena', monto: 264_286 }],
    movido: 0, diaADia: 2_090_814,
    cuenta: { nombre: 'Bancolombia Ahorros', antes: 3_412_800, despues: 5_503_614 },
  };
  const filas = () => [...document.querySelectorAll('.distribuir-listo__fila')].map(f => f.textContent.replace(/\s+/g, ' ').trim());

  beforeEach(() => { document.body.innerHTML = htmlResultadoDistribucion(base); });

  it('dice cuánto se distribuyó y de qué ingreso', () => {
    expect(document.getElementById('distribuir-listo-titulo').textContent).toBe('Distribuiste $2.709.186');
    expect(document.querySelector('.distribuir-listo > .form-hint').textContent).toBe('Así quedó tu ingreso de $4.800.000.');
  });

  it('cada cosa en su fila, con los nombres sin hacer una lista larga', () => {
    expect(filas()).toEqual([
      '4 pagos registradosArriendo, Crédito y 2 más $2.014.900',
      '1 aporteViaje a Cartagena $264.286',
      'Para tu día a díaSe queda en Bancolombia Ahorros $2.090.814',
      'Bancolombia AhorrosAntes $3.412.800 $5.503.614',
    ]);
  });

  it('lo que no pasó no tiene fila', () => {
    document.body.innerHTML = htmlResultadoDistribucion({ ...base, pagos: [], diaADia: 0, movido: 50_000 });
    expect(filas()).toEqual([
      '1 aporteViaje a Cartagena $264.286',
      'Movido a otras cuentas $50.000',
      'Bancolombia AhorrosAntes $3.412.800 $5.503.614',
    ]);
  });

  it('"Deshacer" y "Listo" en el pie, y la salida a Mis cuentas', () => {
    const pie = document.querySelector('.distribuir__pie');
    expect([...pie.querySelectorAll('button')].map(b => [b.textContent.trim(), b.dataset.action])).toEqual([
      ['Deshacer', 'deshacer-distribucion'], ['Listo', 'modal-close'],
    ]);
    const ver = document.querySelector('.distribuir-listo__ver');
    expect(ver.getAttribute('href')).toBe('#tesoreria');
    expect(ver.dataset.action).toBe('ir-a-seccion');
  });
});
