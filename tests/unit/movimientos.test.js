/**
 * movimientos.test.js - dominio de solo lectura para la Actividad reciente
 * de Inicio (TX.8a, ADR 028 D5).
 *
 * Cubre:
 * - Normalización de gastos/ingresos puntuales/aportes al shape común.
 * - Orden (más reciente primero) y límite de movimientosRecientes().
 * - renderActividadReciente(): vacío/oculto sin movimientos, ícono/monto/
 *   dirección correctos, límite de 5 en el DOM.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  movimientosDesdeGastos,
  movimientosDesdeIngresosPuntuales,
  movimientosDesdeAportes,
  movimientosDesdeTransferencias,
  movimientosRecientes,
  movimientosCompletos,
  descripcionMovimiento,
  filtrarMovimientos,
} from '../../modules/dominio/movimientos/logic.js';
import {
  renderActividadReciente, renderMovimientosCompletos, cargarMasMovimientos,
  renderFiltrosMovimientos, setFiltroTexto, setFiltroDominio,
  setFiltroFechaDesde, setFiltroFechaHasta, limpiarFiltrosMovimientos,
  actualizarBotonLimpiarFiltros, precalentarMovimientos,
} from '../../modules/dominio/movimientos/view.js';
import { S } from '../../modules/core/state.js';

const cuenta = (id, nombre) => ({ id, nombre, saldo: 0, banco: 'Nequi', tipo: 'Ahorros', activa: true });

// ── FIXTURES ─────────────────────────────────────────────────────

const gasto = (overrides = {}) => ({
  id: 'g1', descripcion: 'Mercado', monto: 50_000, categoria: 'Mercado',
  fecha: '2026-07-04', cuentaId: 'c1', nota: '', ...overrides,
});

const ingresoPuntual = (overrides = {}) => ({
  id: 'ip1', descripcion: 'Venta bici', monto: 300_000, categoria: 'Venta',
  fecha: '2026-07-03', cuentaId: 'c1', ...overrides,
});

const aporte = (overrides = {}) => ({
  id: 'a1', monto: 100_000, fecha: '2026-07-02', ...overrides,
});

const transferencia = (overrides = {}) => ({
  id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 200_000,
  fecha: '2026-07-06', ...overrides,
});

// ── movimientosDesdeGastos() ──────────────────────────────────────

describe('movimientosDesdeGastos()', () => {
  it('normaliza un gasto a movimiento de egreso con ícono de su categoría', () => {
    const [m] = movimientosDesdeGastos([gasto()]);
    expect(m).toMatchObject({
      id: 'g1', tipo: 'gasto', descripcion: 'Mercado', monto: 50_000,
      direccion: 'egreso', icono: 'c-mercado', cuentaId: 'c1', fecha: '2026-07-04',
    });
  });

  it('categoría interna "Deudas" usa el ícono i-deudas (revela el origen)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Deudas', descripcion: 'Abono: Préstamo moto' })]);
    expect(m.icono).toBe('i-deudas');
  });

  it('categoría interna "Gastos fijos" usa el ícono i-recurring', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gastos fijos', descripcion: 'Pago: Arriendo' })]);
    expect(m.icono).toBe('i-recurring');
  });

  it('un gasto cotidiano tiene dominio "gastos"', () => {
    const [m] = movimientosDesdeGastos([gasto()]);
    expect(m.dominio).toBe('gastos');
  });

  it('categoría interna "Deudas" tiene dominio "compromisos" (TX.8b)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Deudas' })]);
    expect(m.dominio).toBe('compromisos');
  });

  it('categoría interna "Gastos fijos" tiene dominio "compromisos" (TX.8b)', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Gastos fijos' })]);
    expect(m.dominio).toBe('compromisos');
  });

  it('categoría sin mapeo cae al ícono genérico i-gastos', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Categoría inexistente' })]);
    expect(m.icono).toBe('i-gastos');
  });

  it('resuelve el ícono de una categoría personalizada (TX.9b)', () => {
    const personalizadas = [{ nombre: 'Suplementos', icono: 'c-pesa' }];
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Suplementos' })], personalizadas);
    expect(m.icono).toBe('c-pesa');
  });

  it('sin personalizadas (default []), una categoría desconocida sigue cayendo al genérico', () => {
    const [m] = movimientosDesdeGastos([gasto({ categoria: 'Suplementos' })]);
    expect(m.icono).toBe('i-gastos');
  });

  it('sin cuentaId, cuentaId queda null', () => {
    const [m] = movimientosDesdeGastos([gasto({ cuentaId: undefined })]);
    expect(m.cuentaId).toBeNull();
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeGastos(null)).toEqual([]);
    expect(movimientosDesdeGastos(undefined)).toEqual([]);
  });
});

// ── movimientosDesdeIngresosPuntuales() ───────────────────────────

describe('movimientosDesdeIngresosPuntuales()', () => {
  it('normaliza un ingreso puntual a movimiento de ingreso', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual()]);
    expect(m).toMatchObject({
      id: 'ip1', tipo: 'ingreso', descripcion: 'Venta bici', monto: 300_000,
      direccion: 'ingreso', icono: 'c-bolsa', cuentaId: 'c1', fecha: '2026-07-03',
    });
  });

  it('categoría sin mapeo cae al ícono genérico i-saldo', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual({ categoria: null })]);
    expect(m.icono).toBe('i-saldo');
  });

  it('tiene dominio "ingresos"', () => {
    const [m] = movimientosDesdeIngresosPuntuales([ingresoPuntual()]);
    expect(m.dominio).toBe('ingresos');
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeIngresosPuntuales(null)).toEqual([]);
  });
});

// ── movimientosDesdeAportes() ─────────────────────────────────────

describe('movimientosDesdeAportes()', () => {
  it('normaliza un aporte a movimiento de egreso sin cuenta, ícono i-ahorro', () => {
    const [m] = movimientosDesdeAportes([aporte()]);
    expect(m).toMatchObject({
      id: 'a1', tipo: 'aporte', monto: 100_000, direccion: 'egreso',
      icono: 'i-ahorro', cuentaId: null, fecha: '2026-07-02',
    });
  });

  it('usa la nota como descripción si existe', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: 'Prima de junio' })]);
    expect(m.descripcion).toBe('Prima de junio');
  });

  it('sin nota, describe como "Aporte al fondo de emergencia"', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: undefined })]);
    expect(m.descripcion).toBe('Aporte al fondo de emergencia');
  });

  it('nota en blanco se trata como ausente', () => {
    const [m] = movimientosDesdeAportes([aporte({ nota: '   ' })]);
    expect(m.descripcion).toBe('Aporte al fondo de emergencia');
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeAportes(undefined)).toEqual([]);
  });

  it('tiene dominio "ahorro"', () => {
    const [m] = movimientosDesdeAportes([aporte()]);
    expect(m.dominio).toBe('ahorro');
  });
});

// ── movimientosDesdeTransferencias() (MC.17c) ─────────────────────

describe('movimientosDesdeTransferencias()', () => {
  it('normaliza una transferencia a movimiento neutro, sin descripción propia', () => {
    const [m] = movimientosDesdeTransferencias([transferencia()]);
    expect(m).toMatchObject({
      id: 't1', tipo: 'transferencia', monto: 200_000, direccion: 'neutro',
      icono: 'i-transferencia', cuentaId: null,
      cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', fecha: '2026-07-06',
    });
  });

  it('sin costoGMF, el movimiento lo expone como 0 (MC.17d)', () => {
    const [m] = movimientosDesdeTransferencias([transferencia()]);
    expect(m.costoGMF).toBe(0);
  });

  it('con costoGMF, lo propaga al movimiento (MC.17d)', () => {
    const [m] = movimientosDesdeTransferencias([transferencia({ costoGMF: 800 })]);
    expect(m.costoGMF).toBe(800);
  });

  it('tiene dominio "tesoreria"', () => {
    const [m] = movimientosDesdeTransferencias([transferencia()]);
    expect(m.dominio).toBe('tesoreria');
  });

  it('argumento no-array devuelve []', () => {
    expect(movimientosDesdeTransferencias(null)).toEqual([]);
    expect(movimientosDesdeTransferencias(undefined)).toEqual([]);
  });
});

// ── descripcionMovimiento() (MOV.2) ───────────────────────────────

describe('descripcionMovimiento()', () => {
  const cuentasFixture = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];

  it('un movimiento normal devuelve su propia descripcion', () => {
    const [m] = movimientosDesdeGastos([gasto({ descripcion: 'Mercado' })]);
    expect(descripcionMovimiento(m, cuentasFixture)).toBe('Mercado');
  });

  it('una transferencia arma "Origen → Destino" con los nombres vigentes', () => {
    const [m] = movimientosDesdeTransferencias([transferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2' })]);
    expect(descripcionMovimiento(m, cuentasFixture)).toBe('Nequi → Bancolombia');
  });

  it('una cuenta ya eliminada cae a "Cuenta eliminada", sin romper', () => {
    const [m] = movimientosDesdeTransferencias([transferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c-borrada' })]);
    expect(descripcionMovimiento(m, cuentasFixture)).toBe('Nequi → Cuenta eliminada');
  });

  it('sin cuentas (o undefined) no rompe', () => {
    const [m] = movimientosDesdeTransferencias([transferencia()]);
    expect(descripcionMovimiento(m, [])).toBe('Cuenta eliminada → Cuenta eliminada');
    expect(descripcionMovimiento(m)).toBe('Cuenta eliminada → Cuenta eliminada');
  });
});

// ── filtrarMovimientos() (MOV.2) ───────────────────────────────────

describe('filtrarMovimientos()', () => {
  const set = () => [
    ...movimientosDesdeGastos([gasto({ id: 'g1', descripcion: 'Mercado', fecha: '2026-07-04' })]),
    ...movimientosDesdeGastos([gasto({ id: 'g2', descripcion: 'Abono: Préstamo', categoria: 'Deudas', fecha: '2026-07-10' })]),
    ...movimientosDesdeIngresosPuntuales([ingresoPuntual({ id: 'ip1', descripcion: 'Venta bici', fecha: '2026-07-03' })]),
    ...movimientosDesdeAportes([aporte({ id: 'a1', fecha: '2026-07-02' })]),
    ...movimientosDesdeTransferencias([transferencia({ id: 't1', cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', fecha: '2026-07-06' })]),
  ];
  const cuentasFixture = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];

  it('sin filtros devuelve todo intacto', () => {
    expect(filtrarMovimientos(set())).toHaveLength(5);
    expect(filtrarMovimientos(set(), {})).toHaveLength(5);
  });

  it('filtra por texto en la descripcion, sin distinguir mayúsculas', () => {
    const r = filtrarMovimientos(set(), { texto: 'mercado' });
    expect(r.map(m => m.id)).toEqual(['g1']);
  });

  it('el texto tambien busca contra la descripcion resuelta de una transferencia', () => {
    const r = filtrarMovimientos(set(), { texto: 'bancolombia', cuentas: cuentasFixture });
    expect(r.map(m => m.id)).toEqual(['t1']);
  });

  it('texto vacío o solo espacios no filtra nada', () => {
    expect(filtrarMovimientos(set(), { texto: '' })).toHaveLength(5);
    expect(filtrarMovimientos(set(), { texto: '   ' })).toHaveLength(5);
  });

  it('filtra por dominio exacto', () => {
    const r = filtrarMovimientos(set(), { dominio: 'compromisos' });
    expect(r.map(m => m.id)).toEqual(['g2']);
  });

  it('dominio null o vacío no filtra nada', () => {
    expect(filtrarMovimientos(set(), { dominio: null })).toHaveLength(5);
    expect(filtrarMovimientos(set(), { dominio: '' })).toHaveLength(5);
  });

  it('filtra por rango de fechas inclusive', () => {
    const r = filtrarMovimientos(set(), { desde: '2026-07-04', hasta: '2026-07-06' });
    expect(r.map(m => m.id).sort()).toEqual(['g1', 't1']);
  });

  it('solo "desde" filtra sin techo', () => {
    const r = filtrarMovimientos(set(), { desde: '2026-07-06' });
    expect(r.map(m => m.id).sort()).toEqual(['g2', 't1']);
  });

  it('solo "hasta" filtra sin piso', () => {
    const r = filtrarMovimientos(set(), { hasta: '2026-07-03' });
    expect(r.map(m => m.id).sort()).toEqual(['a1', 'ip1']);
  });

  it('combina texto + dominio + fechas con AND', () => {
    const r = filtrarMovimientos(set(), { dominio: 'gastos', desde: '2026-07-01', hasta: '2026-07-05' });
    expect(r.map(m => m.id)).toEqual(['g1']);
  });

  it('sin coincidencias devuelve []', () => {
    expect(filtrarMovimientos(set(), { texto: 'no existe esto' })).toEqual([]);
  });

  it('entrada no-array no rompe', () => {
    expect(filtrarMovimientos(null)).toEqual([]);
    expect(filtrarMovimientos(undefined, { texto: 'x' })).toEqual([]);
  });
});

// ── movimientosRecientes() ────────────────────────────────────────

describe('movimientosRecientes()', () => {
  it('combina las 4 fuentes ordenadas por fecha descendente', () => {
    const r = movimientosRecientes({
      gastos: [gasto({ fecha: '2026-07-01' })],
      ingresosPuntuales: [ingresoPuntual({ fecha: '2026-07-05' })],
      aportes: [aporte({ fecha: '2026-07-03' })],
      transferencias: [transferencia({ fecha: '2026-07-06' })],
    });
    expect(r.map(m => m.fecha)).toEqual(['2026-07-06', '2026-07-05', '2026-07-03', '2026-07-01']);
  });

  it('respeta el límite pasado', () => {
    const gastos = Array.from({ length: 10 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    const r = movimientosRecientes({ gastos }, 3);
    expect(r).toHaveLength(3);
    expect(r[0].fecha).toBe('2026-07-10');
  });

  it('límite por defecto es 5', () => {
    const gastos = Array.from({ length: 10 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    expect(movimientosRecientes({ gastos })).toHaveLength(5);
  });

  it('sin ninguna fuente devuelve []', () => {
    expect(movimientosRecientes({})).toEqual([]);
    expect(movimientosRecientes()).toEqual([]);
  });

  it('ignora movimientos sin fecha válida', () => {
    const r = movimientosRecientes({ gastos: [gasto({ fecha: '' }), gasto({ id: 'g2', fecha: '2026-07-01' })] });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('g2');
  });
});

// ── renderActividadReciente() ──────────────────────────────────────

describe('renderActividadReciente()', () => {
  const elPanel = () => document.getElementById('panel-actividad-reciente');
  const elPanelEscritorio = () => document.getElementById('panel-actividad-reciente-escritorio');
  const matchMediaReal = window.matchMedia;

  afterEach(() => { window.matchMedia = matchMediaReal; });

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-actividad-reciente" hidden></div>'
      + '<div id="panel-actividad-reciente-escritorio" hidden></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderActividadReciente()).not.toThrow();
  });

  it('oculto y vacío sin ningún movimiento', () => {
    renderActividadReciente();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('visible con un gasto: muestra descripción y monto con signo -', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(false);
    expect(elPanel().innerHTML).toContain('Mercado');
    expect(elPanel().innerHTML).toContain('-$50.000');
  });

  it('visible con un ingreso puntual: monto con signo +', () => {
    S.ingresosPuntuales = [ingresoPuntual()];
    renderActividadReciente();
    expect(elPanel().innerHTML).toContain('Venta bici');
    expect(elPanel().innerHTML).toContain('+$300.000');
  });

  it('visible con un aporte al fondo', () => {
    S.ahorro.aportes = [aporte()];
    renderActividadReciente();
    expect(elPanel().innerHTML).toContain('Aporte al fondo de emergencia');
    expect(elPanel().innerHTML).toContain('-$100.000');
  });

  it('visible con una transferencia (MC.17c): "Origen → Destino" sin signo', () => {
    S.transferencias = [transferencia()];
    renderActividadReciente();
    const html = elPanel().innerHTML;
    expect(html).toContain('Nequi → Bancolombia');
    expect(html).toContain('$200.000');
    expect(html).not.toContain('+$200.000');
    expect(html).not.toContain('-$200.000');
  });

  // IN.9b (ADR 057 D4): el límite lo decide el ancho, no el dispositivo. El 5
  // se eligió para 390px; en escritorio caben 8 sin pedir un dato nuevo.
  // `matchMedia` se falsea porque happy-dom no tiene viewport real.
  const anchoDe = (esMovil) => {
    window.matchMedia = () => ({ matches: esMovil });
  };

  it('muestra como máximo 5 movimientos en móvil aunque haya más', () => {
    anchoDe(true);
    S.gastos = Array.from({ length: 12 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    renderActividadReciente();
    expect(elPanel().querySelectorAll('.actividad-reciente__item')).toHaveLength(5);
  });

  it('muestra hasta 8 movimientos en escritorio', () => {
    anchoDe(false);
    S.gastos = Array.from({ length: 12 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    renderActividadReciente();
    expect(elPanel().querySelectorAll('.actividad-reciente__item')).toHaveLength(8);
  });

  it('con menos movimientos que el límite, escritorio muestra los que hay', () => {
    anchoDe(false);
    S.gastos = Array.from({ length: 3 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-0${i + 1}` }));
    renderActividadReciente();
    expect(elPanel().querySelectorAll('.actividad-reciente__item')).toHaveLength(3);
  });

  it('vuelve a ocultarse si se vacían las fuentes tras un render previo', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(false);

    S.gastos = [];
    renderActividadReciente();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('incluye el link "Ver todo" hacia #movimientos cuando hay actividad', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    const link = elPanel().querySelector('.actividad-reciente__ver-todo');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#movimientos');
  });

  // ── IN.9d (ADR 057 D4): copia propia para la fila final de escritorio ──

  it('llena la copia de escritorio con el mismo contenido que la de móvil', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    expect(elPanelEscritorio().hidden).toBe(false);
    expect(elPanelEscritorio().innerHTML).toBe(elPanel().innerHTML);
  });

  it('oculta también la copia de escritorio sin movimientos', () => {
    renderActividadReciente();
    expect(elPanelEscritorio().hidden).toBe(true);
    expect(elPanelEscritorio().innerHTML).toBe('');
  });

  it('no-op si solo existe la copia de escritorio (móvil ausente del DOM)', () => {
    document.body.innerHTML = '<div id="panel-actividad-reciente-escritorio" hidden></div>';
    S.gastos = [gasto()];
    expect(() => renderActividadReciente()).not.toThrow();
    expect(elPanelEscritorio().hidden).toBe(false);
  });

  // ── IN.8g (ADR 034 D7): fusión con Accesos rápidos, header simplificado ──

  it('el label "Actividad reciente" vive en el header compartido, sin su propia card/ícono', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    const html = elPanel().innerHTML;
    expect(html).toContain('accesos-actividad__label');
    expect(html).toContain('Actividad reciente');
    expect(html).not.toContain('class="actividad-reciente"');
    expect(html).not.toContain('actividad-reciente__title');
  });

  // El panel usaba icon(m.icono), que antepone "#i-" a un id que ya venía
  // completo ('c-mercado'): href="#i-c-mercado" no existe en el sprite y las
  // 5 filas quedaban con el chip vacío. La vista completa siempre usó
  // tejaCategoria(); ahora el panel comparte ese componente.
  it('pinta la teja de categoría del dominio, no un chip con href inexistente', () => {
    S.gastos = [gasto()];
    renderActividadReciente();
    const teja = elPanel().querySelector('.actividad-reciente__item .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.dataset.dom).toBe('gastos');
    expect(elPanel().innerHTML).not.toContain('#i-c-');
  });

  it('un ingreso trae la teja de su propio dominio', () => {
    S.gastos = [];
    S.ingresosPuntuales = [{
      id: 'i1', descripcion: 'Salario', monto: 1_900_000,
      fecha: '2026-07-15', categoria: 'Salario',
    }];
    renderActividadReciente();
    const teja = elPanel().querySelector('.actividad-reciente__item .cat-teja');
    expect(teja.dataset.dom).toBe('ingresos');
  });
});

// ── movimientosCompletos() ────────────────────────────────────────

describe('movimientosCompletos()', () => {
  it('devuelve todos los movimientos sin límite de 5', () => {
    const gastos = Array.from({ length: 8 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    expect(movimientosCompletos({ gastos })).toHaveLength(8);
  });

  it('ordena por fecha descendente igual que movimientosRecientes', () => {
    const r = movimientosCompletos({
      gastos: [gasto({ fecha: '2026-07-01' })],
      ingresosPuntuales: [ingresoPuntual({ fecha: '2026-07-05' })],
      aportes: [aporte({ fecha: '2026-07-03' })],
    });
    expect(r.map(m => m.fecha)).toEqual(['2026-07-05', '2026-07-03', '2026-07-01']);
  });

  it('sin ninguna fuente devuelve []', () => {
    expect(movimientosCompletos()).toEqual([]);
    expect(movimientosCompletos({})).toEqual([]);
  });
});

// ── renderMovimientosCompletos() ───────────────────────────────────

describe('renderMovimientosCompletos()', () => {
  const elLista = () => document.getElementById('lista-movimientos');

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderMovimientosCompletos()).not.toThrow();
  });

  it('muestra el estado vacío sin ningún movimiento', () => {
    renderMovimientosCompletos();
    expect(elLista().querySelector('.empty-state')).not.toBeNull();
  });

  it('renderiza más de 5 movimientos (no aplica el límite del panel compacto)', () => {
    S.gastos = Array.from({ length: 8 }, (_, i) => gasto({ id: `g${i}`, fecha: `2026-07-${String(i + 1).padStart(2, '0')}` }));
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(8);
  });

  it('muestra el nombre de la cuenta cuando existe', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal')];
    S.gastos = [gasto({ cuentaId: 'c1' })];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).toContain('Nequi principal');
  });

  it('sin cuenta asociada (aporte), no rompe ni muestra "null"', () => {
    S.ahorro.aportes = [aporte()];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).not.toContain('null');
  });

  it('un ingreso se muestra con signo + y clase de color de ingreso', () => {
    S.ingresosPuntuales = [ingresoPuntual()];
    renderMovimientosCompletos();
    expect(elLista().innerHTML).toContain('+$300.000');
    expect(elLista().querySelector('.list-item__amount--ingreso')).not.toBeNull();
  });

  it('agrupa movimientos de meses distintos bajo divisores separados', () => {
    S.gastos = [
      gasto({ id: 'g1', fecha: '2026-07-05' }),
      gasto({ id: 'g2', fecha: '2026-06-20' }),
    ];
    renderMovimientosCompletos();
    const divisores = elLista().querySelectorAll('.movimientos-mes');
    expect(divisores).toHaveLength(2);
    expect(divisores[0].textContent).toContain('2026');
  });

  it('la teja del ícono lleva el dominio correcto (colores por sección)', () => {
    S.gastos = [gasto({ categoria: 'Deudas' })];
    renderMovimientosCompletos();
    expect(elLista().querySelector('.cat-teja[data-dom="compromisos"]')).not.toBeNull();
  });

  // ── MC.17c: transferencia como fila neutra ──────────────────────

  it('una transferencia se muestra como "Origen → Destino", sin signo ni clase de ingreso', () => {
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
    S.transferencias = [transferencia()];
    renderMovimientosCompletos();
    const html = elLista().innerHTML;
    expect(html).toContain('Nequi → Bancolombia');
    expect(html).toContain('$200.000');
    expect(html).not.toContain('+$200.000');
    expect(html).not.toContain('-$200.000');
    expect(elLista().querySelector('.list-item__amount--ingreso')).toBeNull();
  });

  it('la teja de una transferencia lleva el dominio "tesoreria"', () => {
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
    S.transferencias = [transferencia()];
    renderMovimientosCompletos();
    expect(elLista().querySelector('.cat-teja[data-dom="tesoreria"]')).not.toBeNull();
  });

  it('el subtítulo de una transferencia dice "Transferencia" (sin cuenta redundante)', () => {
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
    S.transferencias = [transferencia()];
    renderMovimientosCompletos();
    expect(elLista().querySelector('.list-item__subtitle').textContent).toContain('Transferencia');
  });

  it('una transferencia con 4x1000 traza el GMF en el subtítulo, sin sumarlo al monto (MC.17d)', () => {
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
    S.transferencias = [transferencia({ costoGMF: 800 })];
    renderMovimientosCompletos();
    const html = elLista().innerHTML;
    expect(elLista().querySelector('.list-item__subtitle').textContent).toContain('incluye $800 de 4x1000');
    expect(html).toContain('$200.000'); // el monto de la fila sigue siendo lo que llegó al destino
  });

  it('una transferencia sin GMF no muestra la nota del 4x1000 (MC.17d)', () => {
    S.cuentas = [cuenta('c1', 'Nequi'), cuenta('c2', 'Bancolombia')];
    S.transferencias = [transferencia()];
    renderMovimientosCompletos();
    expect(elLista().querySelector('.list-item__subtitle').textContent).not.toContain('4x1000');
  });
});

// ── precalentarMovimientos() (PERF.7c) ──────────────────────────────

describe('precalentarMovimientos()', () => {
  const elLista = () => document.getElementById('lista-movimientos');

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [gasto()];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
  });

  it('no lanza sin ningún contenedor en el DOM', () => {
    document.body.innerHTML = '';
    expect(() => precalentarMovimientos()).not.toThrow();
  });

  it('no toca el DOM', () => {
    precalentarMovimientos();
    expect(elLista().innerHTML).toBe('');
  });

  it('precalentar antes de renderMovimientosCompletos() no cambia el resultado', () => {
    precalentarMovimientos();
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(1);
  });
});

// ── renderFiltrosMovimientos() (MOV.2) ─────────────────────────────

describe('renderFiltrosMovimientos()', () => {
  const elFiltros = () => document.getElementById('movimientos-filtros');

  beforeEach(() => {
    document.body.innerHTML = '<div id="movimientos-filtros"></div><div id="lista-movimientos"></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
    limpiarFiltrosMovimientos();
  });

  afterEach(() => limpiarFiltrosMovimientos());

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderFiltrosMovimientos()).not.toThrow();
  });

  it('sin ningún movimiento, no pinta ningún filtro (nada que filtrar)', () => {
    renderFiltrosMovimientos();
    expect(elFiltros().innerHTML.trim()).toBe('');
  });

  it('con movimientos, pinta el buscador y el chip "Todos" activo por defecto', () => {
    S.gastos = [gasto()];
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('#movimientos-buscar')).not.toBeNull();
    const todos = elFiltros().querySelector('[data-action="movimientos-filtrar-dominio"][data-dominio=""]');
    expect(todos.classList.contains('chip--active')).toBe(true);
  });

  it('un chip por cada dominio presente, con su etiqueta amigable', () => {
    S.gastos = [gasto({ id: 'g1' }), gasto({ id: 'g2', categoria: 'Deudas' })];
    S.ahorro.aportes = [aporte()];
    renderFiltrosMovimientos();
    const labels = [...elFiltros().querySelectorAll('.filtros-bar [data-dominio]:not([data-dominio=""])')]
      .map(b => b.textContent.trim());
    expect(labels.sort()).toEqual(['Ahorro', 'Deudas', 'Gastos']);
  });

  it('no repite chip por dominio aunque haya varios movimientos del mismo', () => {
    S.gastos = [gasto({ id: 'g1' }), gasto({ id: 'g2', descripcion: 'Otro' })];
    renderFiltrosMovimientos();
    const chipsGastos = elFiltros().querySelectorAll('[data-dominio="gastos"]');
    expect(chipsGastos).toHaveLength(1);
  });

  it('con un filtro de dominio activo, ese chip queda marcado y "Todos" no', () => {
    S.gastos = [gasto()];
    setFiltroDominio('gastos');
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('[data-dominio="gastos"]').classList.contains('chip--active')).toBe(true);
    expect(elFiltros().querySelector('[data-dominio=""]').classList.contains('chip--active')).toBe(false);
  });

  it('si el dominio activo ya no existe en los datos, se auto-resetea a "Todos"', () => {
    setFiltroDominio('ahorro');
    S.gastos = [gasto()]; // sin ningún aporte: 'ahorro' desapareció
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('[data-dominio=""]').classList.contains('chip--active')).toBe(true);
  });

  it('sin ningún filtro activo, no muestra "Limpiar filtros"', () => {
    S.gastos = [gasto()];
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).toBeNull();
  });

  it('con un filtro de texto activo, sí muestra "Limpiar filtros"', () => {
    S.gastos = [gasto()];
    setFiltroTexto('mercado');
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();
  });

  it('con un rango de fechas activo, sí muestra "Limpiar filtros"', () => {
    S.gastos = [gasto()];
    setFiltroFechaDesde('2026-07-01');
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();
  });

  it('el buscador conserva el texto ya escrito como value', () => {
    S.gastos = [gasto()];
    setFiltroTexto('mercado');
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('#movimientos-buscar').value).toBe('mercado');
  });

  it('los inputs de fecha conservan sus valores actuales', () => {
    S.gastos = [gasto()];
    setFiltroFechaDesde('2026-07-01');
    setFiltroFechaHasta('2026-07-31');
    renderFiltrosMovimientos();
    expect(elFiltros().querySelector('#movimientos-desde').value).toBe('2026-07-01');
    expect(elFiltros().querySelector('#movimientos-hasta').value).toBe('2026-07-31');
  });
});

// ── actualizarBotonLimpiarFiltros() (MOV.2) ────────────────────────
//
// Un filtro de texto o de fecha se aplica escribiendo (índice.js llama solo a
// renderMovimientosCompletos(), NO a renderFiltrosMovimientos(), para no
// perder el foco a mitad de palabra). Sin este helper, "Limpiar filtros"
// se quedaría sin aparecer hasta el próximo repintado completo de la barra
// (ej. al cambiar de dominio): un bug real, detectado al verificar en la app.

describe('actualizarBotonLimpiarFiltros()', () => {
  const elFiltros = () => document.getElementById('movimientos-filtros');

  beforeEach(() => {
    document.body.innerHTML = '<div id="movimientos-filtros"></div><div id="lista-movimientos"></div>';
    S.gastos = [gasto()];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
    limpiarFiltrosMovimientos();
    renderFiltrosMovimientos(); // deja el slot #movimientos-limpiar-slot en el DOM
  });

  afterEach(() => limpiarFiltrosMovimientos());

  it('no-op si el slot no existe (barra vacía, sin movimientos)', () => {
    document.body.innerHTML = '<div id="movimientos-filtros"></div>';
    expect(() => actualizarBotonLimpiarFiltros()).not.toThrow();
  });

  it('activar un filtro de TEXTO hace aparecer el botón sin recrear el buscador', () => {
    const buscadorAntes = elFiltros().querySelector('#movimientos-buscar');
    setFiltroTexto('mercado');
    actualizarBotonLimpiarFiltros();

    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();
    // Mismo nodo: no se repintó el contenedor completo (no se perdió el foco).
    expect(elFiltros().querySelector('#movimientos-buscar')).toBe(buscadorAntes);
  });

  it('activar un filtro de FECHA hace aparecer el botón', () => {
    setFiltroFechaDesde('2026-07-01');
    actualizarBotonLimpiarFiltros();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();
  });

  it('sin ningún filtro activo, el botón no aparece', () => {
    actualizarBotonLimpiarFiltros();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).toBeNull();
  });

  it('quitar el filtro de texto hace desaparecer el botón de nuevo', () => {
    setFiltroTexto('mercado');
    actualizarBotonLimpiarFiltros();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();

    setFiltroTexto('');
    actualizarBotonLimpiarFiltros();
    expect(elFiltros().querySelector('[data-action="movimientos-limpiar-filtros"]')).toBeNull();
  });
});

// ── renderMovimientosCompletos() con filtros (MOV.2) ───────────────

describe('renderMovimientosCompletos() - filtros aplicados (MOV.2)', () => {
  const elLista = () => document.getElementById('lista-movimientos');

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [
      gasto({ id: 'g1', descripcion: 'Mercado', fecha: '2026-07-04' }),
      gasto({ id: 'g2', descripcion: 'Abono: Préstamo', categoria: 'Deudas', fecha: '2026-07-10' }),
    ];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
    limpiarFiltrosMovimientos();
  });

  afterEach(() => limpiarFiltrosMovimientos());

  it('sin filtros, pinta ambas filas', () => {
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(2);
  });

  it('filtra por texto: solo la fila que coincide con la descripción', () => {
    setFiltroTexto('mercado');
    renderMovimientosCompletos();
    const filas = elLista().querySelectorAll('.list-item');
    expect(filas).toHaveLength(1);
    expect(filas[0].dataset.id).toBe('g1');
  });

  it('filtra por dominio: aísla lo de Deudas del gasto cotidiano', () => {
    setFiltroDominio('compromisos');
    renderMovimientosCompletos();
    const filas = elLista().querySelectorAll('.list-item');
    expect(filas).toHaveLength(1);
    expect(filas[0].dataset.id).toBe('g2');
  });

  it('filtra por rango de fechas', () => {
    setFiltroFechaDesde('2026-07-05');
    renderMovimientosCompletos();
    const filas = elLista().querySelectorAll('.list-item');
    expect(filas).toHaveLength(1);
    expect(filas[0].dataset.id).toBe('g2');
  });

  it('con filtros que no dejan ningún resultado, muestra el empty "sin resultados", no el vacío real', () => {
    setFiltroTexto('esto no existe en ningún lado');
    renderMovimientosCompletos();
    expect(elLista().querySelector('.empty-state__title').textContent).toBe('Nada coincide con esos filtros');
    expect(elLista().querySelector('.empty-state__title').textContent).not.toBe('Todavía no hay movimientos');
  });

  it('el empty "sin resultados" trae un botón para limpiar los filtros', () => {
    setFiltroTexto('esto no existe en ningún lado');
    renderMovimientosCompletos();
    expect(elLista().querySelector('[data-action="movimientos-limpiar-filtros"]')).not.toBeNull();
  });

  it('limpiar filtros vuelve a mostrar todo', () => {
    setFiltroDominio('compromisos');
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(1);

    limpiarFiltrosMovimientos();
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(2);
  });

  it('sin ningún gasto/ingreso/aporte/transferencia (vacío real), muestra el empty original aunque haya filtros seteados', () => {
    S.gastos = [];
    setFiltroTexto('mercado');
    renderMovimientosCompletos();
    expect(elLista().querySelector('.empty-state__title').textContent).toBe('Todavía no hay movimientos');
  });
});

// ── PAGINACIÓN DE renderMovimientosCompletos() (PERF.1) ───────────
//
// Con años de historial, pintar todos los nodos de una sola vez es el cuello
// de botella más caro de la app. Estos tests fijan el contrato de paginación:
// el primer render solo pinta un lote (50 entradas), el resto se agrega bajo
// demanda con cargarMasMovimientos() sin recalcular el historial derivado.

describe('renderMovimientosCompletos() - paginación por lotes', () => {
  const elLista = () => document.getElementById('lista-movimientos');
  const gastosDelMismoMes = (n) => Array.from({ length: n }, (_, i) =>
    gasto({ id: `g${i}`, fecha: `2026-07-${String((i % 28) + 1).padStart(2, '0')}` }));

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
  });

  it('con más de 50 movimientos, el primer render solo pinta el primer lote', () => {
    S.gastos = gastosDelMismoMes(120);
    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(50);
  });

  it('muestra el control "Cargar más" cuando queda historial pendiente', () => {
    S.gastos = gastosDelMismoMes(120);
    renderMovimientosCompletos();
    expect(elLista().querySelector('#movimientos-cargar-mas')).not.toBeNull();
  });

  it('no muestra el control "Cargar más" si el historial cabe en un solo lote', () => {
    S.gastos = gastosDelMismoMes(8);
    renderMovimientosCompletos();
    expect(elLista().querySelector('#movimientos-cargar-mas')).toBeNull();
  });

  it('cargarMasMovimientos() agrega el siguiente lote sin repetir los ya pintados', () => {
    S.gastos = gastosDelMismoMes(120);
    renderMovimientosCompletos();
    cargarMasMovimientos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(100);
    const ids = [...elLista().querySelectorAll('.list-item')].map((el) => el.dataset.id);
    expect(new Set(ids).size).toBe(100);
  });

  it('cargarMasMovimientos() quita el control al agotar el historial', () => {
    S.gastos = gastosDelMismoMes(120);
    renderMovimientosCompletos();
    cargarMasMovimientos(); // 50 → 100
    cargarMasMovimientos(); // 100 → 120, se agota
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(120);
    expect(elLista().querySelector('#movimientos-cargar-mas')).toBeNull();
  });

  it('cargarMasMovimientos() no hace nada si ya no queda historial pendiente', () => {
    S.gastos = gastosDelMismoMes(30);
    renderMovimientosCompletos();
    expect(() => cargarMasMovimientos()).not.toThrow();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(30);
  });

  it('no duplica el divisor de mes cuando un lote corta a mitad de mes', () => {
    // 60 gastos en julio (2 lotes dentro del mismo mes) + 1 en junio.
    S.gastos = [
      ...gastosDelMismoMes(60),
      gasto({ id: 'g-junio', fecha: '2026-06-15' }),
    ];
    renderMovimientosCompletos();
    cargarMasMovimientos();
    const divisores = [...elLista().querySelectorAll('.movimientos-mes')].map((el) => el.textContent);
    expect(divisores.filter((d) => d.includes('2026')).length).toBe(2); // julio + junio, sin repetir julio
  });

  it('volver a llamar renderMovimientosCompletos() reinicia la paginación (no acumula lotes viejos)', () => {
    S.gastos = gastosDelMismoMes(120);
    renderMovimientosCompletos();
    cargarMasMovimientos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(100);

    renderMovimientosCompletos();
    expect(elLista().querySelectorAll('.list-item')).toHaveLength(50);
  });
});

// ── MOV.1: acciones por fila del ledger ───────────────────────────

describe('renderMovimientosCompletos() - acciones por fila (MOV.1)', () => {
  const elLista = () => document.getElementById('lista-movimientos');
  const accionesDe = (id) => [...elLista()
    .querySelector(`.list-item[data-id="${id}"]`)
    .querySelectorAll('[data-action]')]
    .map(b => b.dataset.action);

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    S.gastos = [];
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.cuentas = [];
  });

  it('un gasto ofrece editar y eliminar, delegando en las acciones del dominio Gastos', () => {
    S.gastos = [gasto({ id: 'g1' })];
    renderMovimientosCompletos();
    expect(accionesDe('g1')).toEqual(['editar-gasto', 'eliminar-gasto']);
  });

  it('los botones llevan el id del registro, que es lo que el handler dueño lee', () => {
    S.gastos = [gasto({ id: 'g-abc' })];
    renderMovimientosCompletos();
    const botones = elLista().querySelectorAll('.list-item[data-id="g-abc"] [data-action]');
    for (const b of botones) expect(b.dataset.id).toBe('g-abc');
  });

  it('un ingreso puntual solo ofrece eliminar (su dominio aún no sabe editarlo)', () => {
    S.ingresosPuntuales = [ingresoPuntual({ id: 'ip1' })];
    renderMovimientosCompletos();
    expect(accionesDe('ip1')).toEqual(['eliminar-ingreso-puntual']);
  });

  it('un aporte al fondo solo ofrece eliminar', () => {
    S.ahorro.aportes = [aporte({ id: 'a1' })];
    renderMovimientosCompletos();
    expect(accionesDe('a1')).toEqual(['ahorro-eliminar-aporte']);
  });

  it('una transferencia no ofrece ninguna acción todavía (es MC.17f) y no deja el contenedor vacío', () => {
    S.transferencias = [transferencia({ id: 't1' })];
    renderMovimientosCompletos();
    const fila = elLista().querySelector('.list-item[data-id="t1"]');
    expect(fila.querySelectorAll('[data-action]')).toHaveLength(0);
    expect(fila.querySelector('.list-item__action')).toBeNull();
  });

  it('un gasto de categoría interna se enruta por TIPO, no por su dominio visual', () => {
    // Trampa real: un gasto "Gastos fijos" lleva `dominio: 'compromisos'` para
    // colorear su teja, pero su registro vive en S.gastos. Enrutar por dominio
    // mandaría la acción a compromisos, que no administra ese registro.
    S.gastos = [gasto({ id: 'g-fijo', categoria: 'Gastos fijos', descripcion: 'Pago: Arriendo' })];
    renderMovimientosCompletos();
    expect(accionesDe('g-fijo')).toEqual(['editar-gasto', 'eliminar-gasto']);
  });

  it('el aria-label nombra el movimiento concreto, no solo la acción', () => {
    S.gastos = [gasto({ id: 'g1', descripcion: 'Mercado' })];
    renderMovimientosCompletos();
    const editar = elLista().querySelector('[data-action="editar-gasto"]');
    expect(editar.getAttribute('aria-label')).toContain('Mercado');
  });

  it('las acciones NO aparecen en el panel compacto de Inicio', () => {
    // Son dos renderizadores distintos a propósito: Inicio es un resumen.
    document.body.innerHTML = '<div id="panel-actividad-reciente"></div>';
    S.gastos = [gasto({ id: 'g1' })];
    renderActividadReciente();
    const panel = document.getElementById('panel-actividad-reciente');
    expect(panel.querySelectorAll('[data-action]')).toHaveLength(0);
  });
});
