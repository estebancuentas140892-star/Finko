/**
 * cuenta-helper.test.js - Tests del helper de selección inteligente de cuenta.
 *
 * `cuenta-helper.js` es infra DOM-bound: la mayor parte de su código crea
 * overlays y gestiona foco. Lo excluimos de coverage (como router.js, a11y.js).
 * Estos tests verifican las ramas de decisión core y que el DOM se construye
 * correctamente en happy-dom.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  resolverCuenta,
  renderSelectorCuenta,
  resolverPagoConPreferida,
  resolverPagoConSelector,
  repartirEnOrden,
  cuentaHabitualDe,
} from '../../modules/infra/cuenta-helper.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const cuentaActiva = (overrides = {}) => ({
  id:     'c1',
  nombre: 'Nequi',
  saldo:  500_000,
  activa: true,
  ...overrides,
});

/** Tarjeta operable (MC.16b): compromiso de deuda con cupo registrado. */
const tarjetaTC = (overrides = {}) => ({
  id:          'd1',
  descripcion: 'Tarjeta Bancolombia',
  tipo:        'deuda-entidad',
  categoria:   'Tarjeta de crédito',
  cupoTotal:   5_000_000,
  saldoTotal:  1_000_000,
  activo:      true,
  ...overrides,
});

// ── LIMPIEZA DE DOM ──────────────────────────────────────────────

afterEach(() => {
  // Quitar cualquier modal-overlay creado por el helper en cada test.
  document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
});

// ── RAMA: 1 CUENTA ───────────────────────────────────────────────

describe('resolverCuenta() - 1 cuenta activa', () => {
  it('devuelve el id de la única cuenta sin crear DOM', async () => {
    const cuentas = [cuentaActiva({ id: 'abc' })];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBe('abc');
    // No debe haber creado ningún overlay.
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('ignora cuentas inactivas y retorna la activa', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c-inactiva', activa: false }),
      cuentaActiva({ id: 'c-activa', activa: true }),
    ];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBe('c-activa');
  });

  it('ignora cuentas con activa=undefined como activas (retrocompat)', async () => {
    // Cuentas sin el campo 'activa' se tratan como activas.
    const { activa: _a, ...sinActiva } = cuentaActiva({ id: 'c-sin-campo' });
    const resultado = await resolverCuenta([sinActiva]);
    expect(resultado).toBe('c-sin-campo');
  });
});

// ── RAMA: 0 CUENTAS ─────────────────────────────────────────────

describe('resolverCuenta() - 0 cuentas activas', () => {
  it('devuelve null con lista vacía', async () => {
    const resultado = await resolverCuenta([]);
    expect(resultado).toBeNull();
  });

  it('devuelve null con lista undefined', async () => {
    const resultado = await resolverCuenta(undefined);
    expect(resultado).toBeNull();
  });

  it('devuelve null con solo cuentas inactivas', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', activa: false }),
      cuentaActiva({ id: 'c2', activa: false }),
    ];
    const resultado = await resolverCuenta(cuentas);
    expect(resultado).toBeNull();
  });

  it('crea el diálogo guiado en el DOM', async () => {
    await resolverCuenta([]);
    // El diálogo debe haberse añadido al body.
    const titulo = document.getElementById('cta-sin-cuentas-title');
    expect(titulo).not.toBeNull();
    expect(titulo.textContent).toContain('Necesitas una cuenta primero');
  });
});

// ── RAMA: VARIAS CUENTAS ─────────────────────────────────────────

describe('resolverCuenta() - varias cuentas activas', () => {
  it('crea el picker en el DOM con botones por cuenta', async () => {
    const c1 = cuentaActiva({ id: 'c1', nombre: 'Nequi' });
    const c2 = cuentaActiva({ id: 'c2', nombre: 'Bancolombia' });

    // No awaiteamos aún: queremos inspeccionar el DOM mientras el picker está abierto.
    const promesa = resolverCuenta([c1, c2]);

    // Dar un tick para que el DOM se construya.
    await new Promise(r => setTimeout(r, 0));

    const picker = document.getElementById('cuenta-picker-title');
    expect(picker).not.toBeNull();
    expect(document.querySelectorAll('[data-role="elegir"]').length).toBe(2);

    // Cerrar el picker cancelando para que la promesa resuelva y no quede colgada.
    document.querySelector('[data-role="cancelar"]')?.click();
    const resultado = await promesa;
    expect(resultado).toBeNull();
  });

  it('resuelve con el id de la cuenta seleccionada', async () => {
    const c1 = cuentaActiva({ id: 'id-nequi',       nombre: 'Nequi' });
    const c2 = cuentaActiva({ id: 'id-bancolombia',  nombre: 'Bancolombia' });

    const promesa = resolverCuenta([c1, c2]);
    await new Promise(r => setTimeout(r, 0));

    // Simular selección de la segunda cuenta.
    const btn = document.querySelector('[data-cuenta-id="id-bancolombia"]');
    expect(btn).not.toBeNull();
    btn.click();

    const resultado = await promesa;
    expect(resultado).toBe('id-bancolombia');
  });

  it('resuelve con null si el usuario cancela el picker (Escape)', async () => {
    const c1 = cuentaActiva({ id: 'c1' });
    const c2 = cuentaActiva({ id: 'c2' });

    const promesa = resolverCuenta([c1, c2]);
    await new Promise(r => setTimeout(r, 0));

    // Simular tecla Escape.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const resultado = await promesa;
    expect(resultado).toBeNull();
  });
});

// ── renderSelectorCuenta() ───────────────────────────────────────

describe('renderSelectorCuenta()', () => {
  it('sin cuentas activas: devuelve cadena vacía', () => {
    expect(renderSelectorCuenta([])).toBe('');
    expect(renderSelectorCuenta(undefined)).toBe('');
    expect(renderSelectorCuenta([cuentaActiva({ activa: false })])).toBe('');
  });

  it('renderiza un radio name="cuentaId" por cuenta activa', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', nombre: 'Bancolombia', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Nequi', saldo: 400_000 }),
    ]);
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
  });

  it('pre-selecciona la cuenta de mayor saldo por defecto', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'menor', saldo: 100_000 }),
      cuentaActiva({ id: 'mayor', saldo: 900_000 }),
    ]);
    expect(html).toMatch(/value="mayor"[^>]*checked|checked[^>]*value="mayor"/);
  });

  it('respeta selectedId si la cuenta existe', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', saldo: 900_000 }),
      cuentaActiva({ id: 'c2', saldo: 100_000 }),
    ], { selectedId: 'c2' });
    expect(html).toMatch(/value="c2"[^>]*checked|checked[^>]*value="c2"/);
  });

  // ── MC.16b: tarjetas de crédito (ADR 051 D4) ──────────────────

  it('las tarjetas van en su propio grupo, con el prefijo tc: y su cupo disponible', () => {
    const html = renderSelectorCuenta([cuentaActiva({ id: 'c1' })], { tarjetas: [tarjetaTC()] });
    expect(html).toContain('cuenta-sel__grupo');
    expect(html).toContain('Tarjetas de crédito');
    expect(html).toContain('value="tc:d1"');
    expect(html).toContain('Cupo $4.000.000');
  });

  it('la tarjeta va debajo de las cuentas: el cupo nunca encabeza el dinero real', () => {
    const html = renderSelectorCuenta([cuentaActiva({ id: 'c1' })], { tarjetas: [tarjetaTC()] });
    expect(html.indexOf('value="c1"')).toBeLessThan(html.indexOf('value="tc:d1"'));
  });

  it('nunca pre-selecciona una tarjeta: el default sigue siendo la cuenta de mayor saldo', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', saldo: 900_000 }),
    ], { tarjetas: [tarjetaTC()] });
    expect(html).not.toMatch(/value="tc:d1"[^>]*checked/);
    expect(html).toMatch(/value="c1"[^>]*checked/);
  });

  it('respeta selectedId cuando apunta a una tarjeta (edición de un consumo)', () => {
    const html = renderSelectorCuenta([
      cuentaActiva({ id: 'c1', saldo: 900_000 }),
    ], { tarjetas: [tarjetaTC()], selectedId: 'tc:d1' });
    expect(html).toMatch(/value="tc:d1"[^>]*checked/);
    expect(html).not.toMatch(/value="c1"[^>]*checked/);
  });

  it('el cupo disponible se acota en cero si la tarjeta está sobregirada', () => {
    const html = renderSelectorCuenta([cuentaActiva()], {
      tarjetas: [tarjetaTC({ cupoTotal: 1_000_000, saldoTotal: 1_400_000 })],
    });
    expect(html).toContain('Cupo $0');
  });

  it('sin cuentas pero con tarjetas: el selector existe y no pre-marca nada', () => {
    const html = renderSelectorCuenta([], { tarjetas: [tarjetaTC()] });
    expect(html).toContain('value="tc:d1"');
    expect(html).not.toContain('checked');
  });

  it('sin cuentas ni tarjetas: sigue devolviendo cadena vacía', () => {
    expect(renderSelectorCuenta([], { tarjetas: [] })).toBe('');
  });
});

// ── resolverPagoConPreferida() ───────────────────────────────────

describe('resolverPagoConPreferida()', () => {
  it('0 cuentas: devuelve null y abre el diálogo guiado', async () => {
    const resultado = await resolverPagoConPreferida([], 100_000, null);
    expect(resultado).toBeNull();
    expect(document.getElementById('cta-sin-cuentas-title')).not.toBeNull();
  });

  it('la cuenta preferida cubre el monto: un solo split, sin DOM', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', saldo: 400_000 }),
    ];
    const splits = await resolverPagoConPreferida(cuentas, 500_000, 'c1');
    expect(splits).toEqual([{ cuentaId: 'c1', monto: 500_000 }]);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('preferida no alcanza y es la única cuenta: split por el total (caller confirma)', async () => {
    const cuentas = [cuentaActiva({ id: 'c1', saldo: 100_000 })];
    const splits = await resolverPagoConPreferida(cuentas, 500_000, 'c1');
    expect(splits).toEqual([{ cuentaId: 'c1', monto: 500_000 }]);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  // INI.2e (ADR 152 D7): "Completa el pago" abre con la que no alcanzó y el
  // usuario marca con qué completar; el reparto sigue ese orden.
  it('preferida no alcanza y hay más cuentas: "Completa el pago" con la preferida marcada', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 900_000 }),
    ];
    const promesa = resolverPagoConPreferida(cuentas, 500_000, 'c1');
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('cuenta-multi-title').textContent).toBe('Completa el pago');
    expect([...document.querySelectorAll('.cuenta-multi__check:checked')].map(c => c.dataset.cuentaId)).toEqual(['c1']);
    const pagar = document.querySelector('[data-role="confirmar"]');
    expect(pagar.disabled).toBe(true);
    expect(pagar.textContent).toBe('Elige otra cuenta');
    expect(document.querySelector('[data-role="resumen"]').textContent).toBe('Faltan $400.000');
    // Sin la flecha: se llegó desde un formulario, no desde otra hoja.
    expect(document.querySelector('[data-role="volver"]')).toBeNull();

    const c2 = document.querySelector('.cuenta-multi__check[data-cuenta-id="c2"]');
    c2.checked = true;
    c2.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector('[data-role="resumen"]').textContent).toBe('Pago completo');
    expect(document.querySelector('[data-role="cubierto"]').textContent).toBe('$500.000 de $500.000');
    document.querySelector('[data-role="confirmar"]').click();
    expect(await promesa).toEqual([{ cuentaId: 'c1', monto: 100_000 }, { cuentaId: 'c2', monto: 400_000 }]);
  });

  // INI.3 (ADR 153 D4 y D5): un solo mensaje, según cómo va el reparto.
  describe('INI.3: el mensaje de "Completa el pago"', () => {
    const marcar = (id, si = true) => {
      const ch = document.querySelector(`.cuenta-multi__check[data-cuenta-id="${id}"]`);
      ch.checked = si;
      ch.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const mensaje = () => document.querySelector('[data-role="mensaje"]').textContent;
    const boton = () => document.querySelector('[data-role="confirmar"]');

    it('falta, completo con varias, y completo desde una sola cuenta', async () => {
      const cuentas = [
        cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
        cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 900_000 }),
      ];
      const promesa = resolverPagoConPreferida(cuentas, 500_000, 'c1');
      await new Promise(r => setTimeout(r, 0));
      // Ninguna frase vieja: ni "Elige una o varias" ni "mayor saldo".
      expect(document.querySelector('.modal--completar').textContent).not.toMatch(/Elige una o varias|mayor saldo|Repartimos/);
      expect(mensaje()).toBe('Elige otra cuenta para completar el valor. Cada una pone lo que tiene, en el orden en que las eliges.');

      marcar('c2');
      expect(mensaje()).toBe('Se registra un pago desde cada cuenta marcada, por el valor que ves en cada una.');

      // Quien ya pasó el dinero a Bancolombia desmarca Nequi: paga solo desde ahí.
      marcar('c1', false);
      expect(mensaje()).toBe('El pago se registra completo desde Bancolombia.');
      expect(boton().textContent).toBe('Pagar $500.000');
      boton().click();
      expect(await promesa).toEqual([{ cuentaId: 'c2', monto: 500_000 }]);
    });

    it('sin nada marcado, pide elegir; ni sumando todas, lo dice y apaga el botón', async () => {
      const cuentas = [
        cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
        cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 200_000 }),
      ];
      const promesa = resolverPagoConPreferida(cuentas, 500_000, 'c1');
      await new Promise(r => setTimeout(r, 0));
      expect(mensaje()).toBe('Ni sumando todas tus cuentas alcanza: faltan $200.000. Registra primero en tus cuentas el dinero que necesitas.');
      expect(boton().disabled).toBe(true);
      expect(boton().textContent).toBe('No alcanza con tus cuentas');
      marcar('c2');
      expect(document.querySelector('[data-role="resumen"]').textContent).toBe('Faltan $200.000');
      expect(boton().disabled).toBe(true);
      document.querySelector('[data-role="cancelar"]').click();
      expect(await promesa).toBeNull();
    });

    it('sin nada marcado y con dinero de sobra: "Elige las cuentas que vas a usar"', async () => {
      const cuentas = [
        cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
        cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 900_000 }),
      ];
      const promesa = resolverPagoConPreferida(cuentas, 500_000, 'c1');
      await new Promise(r => setTimeout(r, 0));
      marcar('c1', false);
      expect(mensaje()).toBe('Elige las cuentas que vas a usar. Cada una pone lo que tiene, en el orden en que las eliges.');
      document.querySelector('[data-role="cancelar"]').click();
      expect(await promesa).toBeNull();
    });
  });

  it('repartirEnOrden(): la primera pone lo que tiene; la siguiente, lo que falta', () => {
    const r = repartirEnOrden([{ id: 'bog', saldo: 1_373_900 }, { id: 'neq', saldo: 340_000 }], 1_453_900);
    expect(r.ok).toBe(true);
    expect(r.splits).toEqual([{ cuentaId: 'bog', monto: 1_373_900 }, { cuentaId: 'neq', monto: 80_000 }]);
    expect(r.usa.get('neq')).toBe(80_000);
    const corto = repartirEnOrden([{ id: 'neq', saldo: 340_000 }, { id: 'cero', saldo: -5 }], 1_453_900);
    expect(corto).toMatchObject({ ok: false, cubierto: 340_000, faltante: 1_113_900 });
    expect(corto.usa.get('cero')).toBe(0);
  });
});

// ── resolverPagoConSelector() ────────────────────────────────────

describe('resolverPagoConSelector()', () => {
  it('0 cuentas: devuelve null y abre el diálogo guiado', async () => {
    const resultado = await resolverPagoConSelector([], 100_000);
    expect(resultado).toBeNull();
    expect(document.getElementById('cta-sin-cuentas-title')).not.toBeNull();
  });

  it('1 cuenta: un solo split por el total, sin preguntar (sin DOM)', async () => {
    const cuentas = [cuentaActiva({ id: 'unica', saldo: 100_000 })];
    const splits = await resolverPagoConSelector(cuentas, 500_000);
    expect(splits).toEqual([{ cuentaId: 'unica', monto: 500_000 }]);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('varias cuentas: muestra el selector de tarjetas para elegir preferida', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 400_000 }),
    ];
    const promesa = resolverPagoConSelector(cuentas, 500_000);
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('cuenta-pref-title').textContent).toBe('¿Desde qué cuenta pagas?');
    // OB.1 (ADR 151 D5): sin frase que repita cuántos pagos ni su estado.
    expect(document.querySelector('.modal-overlay .confirm__mensaje')).toBeNull();
    expect(document.querySelectorAll('input[name="cuentaId"]').length).toBe(2);

    // Cancelar deja la promesa resuelta en null.
    document.querySelector('[data-role="cancelar"]')?.click();
    expect(await promesa).toBeNull();
  });

  it('preferida elegida cubre: un solo split por el total, sin reparto', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 600_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 400_000 }),
    ];
    const promesa = resolverPagoConSelector(cuentas, 300_000);
    await new Promise(r => setTimeout(r, 0));

    // Elegir explícitamente c2 (cubre 300k con saldo 400k) y continuar.
    document.querySelector('input[name="cuentaId"][value="c2"]').checked = true;
    document.querySelector('[data-role="confirmar"]')?.click();

    const splits = await promesa;
    expect(splits).toEqual([{ cuentaId: 'c2', monto: 300_000 }]);
    // No debe quedar ningún overlay (no se abrió el picker de reparto).
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('preferida elegida no alcanza: encadena el picker de reparto', async () => {
    const cuentas = [
      cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 100_000 }),
      cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 900_000 }),
    ];
    const promesa = resolverPagoConSelector(cuentas, 500_000);
    await new Promise(r => setTimeout(r, 0));

    // Elegir c1 (no alcanza) y continuar: debe abrir el picker de reparto.
    document.querySelector('input[name="cuentaId"][value="c1"]').checked = true;
    document.querySelector('[data-role="confirmar"]')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('cuenta-multi-title').textContent).toBe('Completa el pago');

    // Desde la hoja de la cuenta, "Volver" regresa a ella con c1 marcada.
    document.querySelector('[data-role="volver"]').click();
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('input[name="cuentaId"]:checked').value).toBe('c1');
    document.querySelector('[data-role="confirmar"]').click();
    await new Promise(r => setTimeout(r, 0));

    const c2 = document.querySelector('.cuenta-multi__check[data-cuenta-id="c2"]');
    c2.checked = true;
    c2.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-role="confirmar"]')?.click();
    const splits = await promesa;
    expect(splits.reduce((s, x) => s + x.monto, 0)).toBe(500_000);
  });
});

// ── HF.2a: LA CUENTA HABITUAL DE CADA PAGO ───────────────────────

describe('cuentaHabitualDe() (HF.2a)', () => {
  const cuentas = [
    cuentaActiva({ id: 'nequi' }),
    cuentaActiva({ id: 'banco', nombre: 'Bancolombia' }),
    cuentaActiva({ id: 'vieja', nombre: 'Vieja', activa: false }),
  ];
  const pago = (cuentaId, fecha, monto = 100_000, o = {}) => ({ compromisoId: 'arriendo', cuentaId, fecha, monto, ...o });

  it('es la cuenta del último pago de ese compromiso', () => {
    const gastos = [pago('nequi', '2026-09-05'), pago('banco', '2026-10-05'), pago('nequi', '2026-08-05')];
    expect(cuentaHabitualDe('arriendo', gastos, cuentas)).toBe('banco');
  });

  it('solo mira los pagos de ese compromiso', () => {
    const gastos = [pago('nequi', '2026-09-05'), { compromisoId: 'otro', cuentaId: 'banco', fecha: '2026-11-01', monto: 1 }];
    expect(cuentaHabitualDe('arriendo', gastos, cuentas)).toBe('nequi');
  });

  it('a igual fecha, el pago repartido sale sobre todo de la de mayor monto', () => {
    const gastos = [pago('nequi', '2026-10-05', 300_000), pago('banco', '2026-10-05', 50_000)];
    expect(cuentaHabitualDe('arriendo', gastos, cuentas)).toBe('nequi');
  });

  it('una compra con la tarjeta no es un pago (BUG-037)', () => {
    const gastos = [pago('nequi', '2026-09-05'), pago('banco', '2026-10-05', 1, { consumoTC: true })];
    expect(cuentaHabitualDe('arriendo', gastos, cuentas)).toBe('nequi');
  });

  it('si la cuenta del último pago ya no está activa, no adivina con uno más viejo', () => {
    const gastos = [pago('nequi', '2026-09-05'), pago('vieja', '2026-10-05')];
    expect(cuentaHabitualDe('arriendo', gastos, cuentas)).toBeNull();
  });

  it('sin pagos previos, o sin compromiso, no hay habitual', () => {
    expect(cuentaHabitualDe('arriendo', [], cuentas)).toBeNull();
    expect(cuentaHabitualDe('arriendo', null, cuentas)).toBeNull();
    expect(cuentaHabitualDe('', [pago('nequi', '2026-09-05')], cuentas)).toBeNull();
    expect(cuentaHabitualDe('arriendo', [pago(undefined, '2026-09-05')], cuentas)).toBeNull();
  });
});

describe('resolverPagoConSelector() con la cuenta habitual (HF.2a)', () => {
  const dos = () => [
    cuentaActiva({ id: 'c1', nombre: 'Nequi', saldo: 600_000 }),
    cuentaActiva({ id: 'c2', nombre: 'Bancolombia', saldo: 400_000 }),
  ];

  it('el selector abre en la preferida aunque no sea la de mayor saldo', async () => {
    const promesa = resolverPagoConSelector(dos(), 100_000, 'pagar', { preferidaId: 'c2' });
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('input[name="cuentaId"]:checked')?.value).toBe('c2');
    document.querySelector('[data-role="confirmar"]')?.click();
    expect(await promesa).toEqual([{ cuentaId: 'c2', monto: 100_000 }]);
  });

  it('sin preferida, la de mayor saldo, como antes', async () => {
    const promesa = resolverPagoConSelector(dos(), 100_000, 'pagar');
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('input[name="cuentaId"]:checked')?.value).toBe('c1');
    document.querySelector('[data-role="cancelar"]')?.click();
    expect(await promesa).toBeNull();
  });
});
