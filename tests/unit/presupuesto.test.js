import { describe, it, expect } from 'vitest';
import {
  presupuestosActivos,
  calcularGastadoCategoria,
  calcularProgreso,
  resumenGrupos,
  ejecutadoPorGrupoDelMes,
  desgloseNecesidadesDelMes,
  desgloseAhorroDelMes,
  generarMensajesLimites,
  totalAsignadoMensual,
  categoriasSinPresupuesto,
  tienePresupuesto,
  validarPresupuesto,
  normalizarPresupuesto,
  UMBRAL_ALERTA,
  UMBRAL_EXCEDIDO,
} from '../../modules/dominio/presupuesto/logic.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const presupuesto = (overrides = {}) => ({
  id:           'p1',
  categoria:    'Alimentación',
  montoMensual: 500_000,
  activo:       true,
  fechaCreacion:'2026-05-01T00:00:00.000Z',
  ...overrides,
});

const gasto = (overrides = {}) => ({
  id:          'g1',
  descripcion: 'Mercado',
  monto:       50_000,
  categoria:   'Alimentación',
  fecha:       '2026-05-15',
  cuentaId:    null,
  nota:        '',
  ...overrides,
});

// ── presupuestosActivos() ─────────────────────────────────────────────────────

describe('presupuestosActivos()', () => {
  it('filtra los que tienen activo: false', () => {
    const lista = [presupuesto({ id: 'a' }), presupuesto({ id: 'b', activo: false })];
    expect(presupuestosActivos(lista)).toHaveLength(1);
    expect(presupuestosActivos(lista)[0].id).toBe('a');
  });

  it('considera activos los que no traen flag explícito', () => {
    const lista = [{ id: 'x', categoria: 'Otros', montoMensual: 1000 }];
    expect(presupuestosActivos(lista)).toHaveLength(1);
  });

  it('null/undefined devuelve array vacío', () => {
    expect(presupuestosActivos(null)).toEqual([]);
    expect(presupuestosActivos(undefined)).toEqual([]);
  });
});

// ── calcularGastadoCategoria() ────────────────────────────────────────────────

describe('calcularGastadoCategoria()', () => {
  it('suma gastos de la categoría en el mes indicado', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, fecha: '2026-05-01' }),
      gasto({ id: 'g2', monto: 30_000, fecha: '2026-05-15' }),
      gasto({ id: 'g3', monto: 80_000, fecha: '2026-05-28' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(160_000);
  });

  it('ignora gastos de otra categoría', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, categoria: 'Alimentación' }),
      gasto({ id: 'g2', monto: 30_000, categoria: 'Transporte' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(50_000);
  });

  it('ignora gastos de otro mes', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 50_000, fecha: '2026-04-30' }),
      gasto({ id: 'g2', monto: 30_000, fecha: '2026-05-15' }),
    ];
    expect(calcularGastadoCategoria(gastos, 'Alimentación', 2026, 5)).toBe(30_000);
  });

  it('sin gastos devuelve 0', () => {
    expect(calcularGastadoCategoria([], 'Alimentación', 2026, 5)).toBe(0);
  });

  it('gastos null/undefined no rompe', () => {
    expect(calcularGastadoCategoria(null, 'Alimentación', 2026, 5)).toBe(0);
    expect(calcularGastadoCategoria(undefined, 'Alimentación', 2026, 5)).toBe(0);
  });
});

// ── calcularProgreso() ────────────────────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('progreso "ok" con < 75% gastado', () => {
    const gastos = [gasto({ monto: 200_000 })]; // 40% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.gastado).toBe(200_000);
    expect(r.asignado).toBe(500_000);
    expect(r.restante).toBe(300_000);
    expect(r.porcentaje).toBe(40);
    expect(r.estado).toBe('ok');
  });

  it('progreso "alerta" entre 75% y 100%', () => {
    const gastos = [gasto({ monto: 400_000 })]; // 80% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(80);
    expect(r.estado).toBe('alerta');
  });

  it('progreso "alerta" exacto en 75%', () => {
    const gastos = [gasto({ monto: 375_000 })]; // 75% de 500k
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.estado).toBe('alerta');
  });

  it('progreso "excedido" cuando supera 100%', () => {
    const gastos = [gasto({ monto: 600_000 })];
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(120);
    expect(r.restante).toBe(-100_000);
    expect(r.estado).toBe('excedido');
  });

  it('exactamente 100% no es excedido - todavía es alerta', () => {
    const gastos = [gasto({ monto: 500_000 })];
    const r = calcularProgreso(presupuesto(), gastos, 2026, 5);
    expect(r.porcentaje).toBe(100);
    expect(r.estado).toBe('alerta');
  });

  it('asignado en 0 no divide por cero - porcentaje 0, estado ok', () => {
    const r = calcularProgreso(presupuesto({ montoMensual: 0 }), [gasto({ monto: 100 })], 2026, 5);
    expect(r.porcentaje).toBe(0);
    expect(r.estado).toBe('ok');
  });

  it('sin gastos del mes devuelve gastado 0 y estado ok', () => {
    const r = calcularProgreso(presupuesto(), [], 2026, 5);
    expect(r.gastado).toBe(0);
    expect(r.restante).toBe(500_000);
    expect(r.estado).toBe('ok');
  });

  it('umbrales accesibles como constantes', () => {
    expect(UMBRAL_ALERTA).toBe(0.75);
    expect(UMBRAL_EXCEDIDO).toBe(1.00);
  });
});

// ── resumenGrupos() (MC.5a, ADR 017) ──────────────────────────────────────────

describe('resumenGrupos()', () => {
  it('devuelve las 3 claves de grupo financiero', () => {
    const r = resumenGrupos({}, {});
    expect(Object.keys(r).sort()).toEqual(['ahorro', 'estilo-de-vida', 'necesidades']);
  });

  it('calcula asignado, ejecutado y restante por grupo', () => {
    const r = resumenGrupos(
      { necesidades: 1_000_000, 'estilo-de-vida': 400_000, ahorro: 200_000 },
      { necesidades: 600_000, 'estilo-de-vida': 100_000, ahorro: 50_000 },
    );
    expect(r.necesidades).toEqual({
      asignado: 1_000_000, ejecutado: 600_000, restante: 400_000, pct: 60, estado: 'ok',
    });
    expect(r['estilo-de-vida']).toEqual({
      asignado: 400_000, ejecutado: 100_000, restante: 300_000, pct: 25, estado: 'ok',
    });
    expect(r.ahorro).toEqual({
      asignado: 200_000, ejecutado: 50_000, restante: 150_000, pct: 25, estado: 'ok',
    });
  });

  it('estado "alerta" entre 75% y 100%', () => {
    const r = resumenGrupos({ necesidades: 500_000 }, { necesidades: 400_000 }); // 80%
    expect(r.necesidades.pct).toBe(80);
    expect(r.necesidades.estado).toBe('alerta');
  });

  it('estado "alerta" exacto en 75%', () => {
    const r = resumenGrupos({ necesidades: 400_000 }, { necesidades: 300_000 }); // 75%
    expect(r.necesidades.estado).toBe('alerta');
  });

  it('estado "excedido" cuando el ejecutado supera el asignado', () => {
    const r = resumenGrupos({ ahorro: 200_000 }, { ahorro: 250_000 });
    expect(r.ahorro.pct).toBe(125);
    expect(r.ahorro.restante).toBe(-50_000);
    expect(r.ahorro.estado).toBe('excedido');
  });

  it('exactamente 100% no es excedido, todavía es alerta', () => {
    const r = resumenGrupos({ ahorro: 200_000 }, { ahorro: 200_000 });
    expect(r.ahorro.pct).toBe(100);
    expect(r.ahorro.estado).toBe('alerta');
  });

  it('asignado en 0 no divide por cero: pct 0, estado ok', () => {
    const r = resumenGrupos({}, { 'estilo-de-vida': 50_000 });
    expect(r['estilo-de-vida'].pct).toBe(0);
    expect(r['estilo-de-vida'].estado).toBe('ok');
  });

  it('grupo sin ejecutado devuelve ejecutado 0 y restante = asignado', () => {
    const r = resumenGrupos({ necesidades: 300_000 }, {});
    expect(r.necesidades.ejecutado).toBe(0);
    expect(r.necesidades.restante).toBe(300_000);
    expect(r.necesidades.estado).toBe('ok');
  });

  it('sin argumentos no rompe: los 3 grupos en 0', () => {
    const r = resumenGrupos();
    for (const grupo of ['necesidades', 'estilo-de-vida', 'ahorro']) {
      expect(r[grupo]).toEqual({ asignado: 0, ejecutado: 0, restante: 0, pct: 0, estado: 'ok' });
    }
  });

  it('usa los mismos umbrales que calcularProgreso', () => {
    // 75% exacto: alerta en ambas funciones.
    const progresoCategoria = calcularProgreso(
      { montoMensual: 400_000, categoria: 'X' },
      [{ monto: 300_000, categoria: 'X', fecha: '2026-05-01' }],
      2026, 5,
    );
    const grupo = resumenGrupos({ necesidades: 400_000 }, { necesidades: 300_000 }).necesidades;
    expect(progresoCategoria.estado).toBe(grupo.estado);
  });
});

// ── ejecutadoPorGrupoDelMes() (MC.5b, ADR 017) ────────────────────────────────

describe('ejecutadoPorGrupoDelMes()', () => {
  it('Necesidades = gastos con compromisoId; Estilo de vida = gastos sin compromisoId', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 200_000, compromisoId: 'c1', fecha: '2026-05-03' }),
      gasto({ id: 'g2', monto: 50_000,  fecha: '2026-05-10' }),
      gasto({ id: 'g3', monto: 30_000,  fecha: '2026-05-20' }),
    ];
    const r = ejecutadoPorGrupoDelMes(gastos, [], 2026, 5);
    expect(r.necesidades).toBe(200_000);
    expect(r['estilo-de-vida']).toBe(80_000);
    expect(r.ahorro).toBe(0);
  });

  it('Ahorro = aportes al fondo con fecha dentro del mes', () => {
    const aportes = [
      { id: 'a1', monto: 100_000, fecha: '2026-05-05' },
      { id: 'a2', monto: 40_000,  fecha: '2026-05-28' },
      { id: 'a3', monto: 999_999, fecha: '2026-04-30' }, // mes anterior: se ignora
    ];
    const r = ejecutadoPorGrupoDelMes([], aportes, 2026, 5);
    expect(r.ahorro).toBe(140_000);
  });

  it('ignora los gastos de otros meses', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 10_000, fecha: '2026-04-30' }),
      gasto({ id: 'g2', monto: 20_000, fecha: '2026-06-01' }),
      gasto({ id: 'g3', monto: 30_000, fecha: '2026-05-15' }),
    ];
    const r = ejecutadoPorGrupoDelMes(gastos, [], 2026, 5);
    expect(r['estilo-de-vida']).toBe(30_000);
    expect(r.necesidades).toBe(0);
  });

  it('compromisoId null o vacío cuenta como Estilo de vida', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 10_000, compromisoId: null, fecha: '2026-05-01' }),
      gasto({ id: 'g2', monto: 20_000, compromisoId: '',   fecha: '2026-05-01' }),
    ];
    const r = ejecutadoPorGrupoDelMes(gastos, [], 2026, 5);
    expect(r['estilo-de-vida']).toBe(30_000);
    expect(r.necesidades).toBe(0);
  });

  it('sin datos: los 3 grupos en 0', () => {
    expect(ejecutadoPorGrupoDelMes([], [], 2026, 5))
      .toEqual({ necesidades: 0, 'estilo-de-vida': 0, ahorro: 0 });
  });

  it('acepta null/undefined sin romper', () => {
    expect(ejecutadoPorGrupoDelMes(null, null, 2026, 5))
      .toEqual({ necesidades: 0, 'estilo-de-vida': 0, ahorro: 0 });
  });

  it('su salida alimenta resumenGrupos como ejecutadoPorGrupo', () => {
    const gastos = [
      gasto({ id: 'g1', monto: 300_000, compromisoId: 'c1', fecha: '2026-05-02' }),
      gasto({ id: 'g2', monto: 100_000, fecha: '2026-05-02' }),
    ];
    const ejecutado = ejecutadoPorGrupoDelMes(gastos, [{ monto: 50_000, fecha: '2026-05-02' }], 2026, 5);
    const resumen = resumenGrupos(
      { necesidades: 600_000, 'estilo-de-vida': 400_000, ahorro: 200_000 },
      ejecutado,
    );
    expect(resumen.necesidades.ejecutado).toBe(300_000);
    expect(resumen['estilo-de-vida'].ejecutado).toBe(100_000);
    expect(resumen.ahorro.ejecutado).toBe(50_000);
  });
});

// ── desgloseNecesidadesDelMes() (MC.5c, ADR 017) ──────────────────────────────

const compromisoFijo = (overrides = {}) => ({
  id:            'cf1',
  descripcion:   'Arriendo',
  tipo:          'fijo',
  frecuencia:    'Mensual',
  diaPago:       5,
  monto:         800_000,
  activo:        true,
  categoria:     null,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const compromisoDeuda = (overrides = {}) => ({
  id:            'cd1',
  descripcion:   'Tarjeta Bancolombia',
  tipo:          'deuda-entidad',
  frecuencia:    'Mensual',
  diaPago:       10,
  cuotaMensual:  150_000,
  saldoTotal:    1_000_000,
  activo:        true,
  categoria:     null,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('desgloseNecesidadesDelMes()', () => {
  it('un fijo con gasto vinculado este mes queda "completo"', () => {
    const compromisos = [compromisoFijo()];
    const gastos = [gasto({ id: 'g1', monto: 800_000, compromisoId: 'cf1', fecha: '2026-05-05' })];
    const [item] = desgloseNecesidadesDelMes(compromisos, gastos, 2026, 5);
    expect(item.tipo).toBe('fijo');
    expect(item.montoReferencia).toBe(800_000);
    expect(item.ejecutado).toBe(800_000);
    expect(item.estadoPago).toBe('completo');
  });

  it('un fijo sin gasto vinculado este mes queda "ninguno"', () => {
    const [item] = desgloseNecesidadesDelMes([compromisoFijo()], [], 2026, 5);
    expect(item.estadoPago).toBe('ninguno');
    expect(item.ejecutado).toBe(0);
  });

  it('una deuda con abono parcial (menor a la cuota) queda "parcial"', () => {
    const compromisos = [compromisoDeuda({ cuotaMensual: 150_000 })];
    const gastos = [gasto({ id: 'g1', monto: 80_000, compromisoId: 'cd1', fecha: '2026-05-10' })];
    const [item] = desgloseNecesidadesDelMes(compromisos, gastos, 2026, 5);
    expect(item.tipo).toBe('deuda');
    expect(item.montoReferencia).toBe(150_000);
    expect(item.estadoPago).toBe('parcial');
  });

  it('una deuda con abono que cubre o supera la cuota queda "completo"', () => {
    const compromisos = [compromisoDeuda({ cuotaMensual: 150_000 })];
    const gastos = [gasto({ id: 'g1', monto: 150_000, compromisoId: 'cd1', fecha: '2026-05-10' })];
    const [item] = desgloseNecesidadesDelMes(compromisos, gastos, 2026, 5);
    expect(item.estadoPago).toBe('completo');
  });

  it('excluye compromisos inactivos', () => {
    const compromisos = [compromisoFijo({ activo: false })];
    expect(desgloseNecesidadesDelMes(compromisos, [], 2026, 5)).toHaveLength(0);
  });

  it('no incluye tipos ajenos a fijo/deuda', () => {
    const compromisos = [compromisoFijo({ id: 'x', tipo: 'otro' })];
    expect(desgloseNecesidadesDelMes(compromisos, [], 2026, 5)).toHaveLength(0);
  });

  it('ordena: pendientes/parciales antes que completos, luego por monto descendente', () => {
    const compromisos = [
      compromisoFijo({ id: 'grande-pagado', monto: 900_000 }),
      compromisoFijo({ id: 'chico-pendiente', monto: 100_000 }),
      compromisoDeuda({ id: 'grande-pendiente', cuotaMensual: 500_000 }),
    ];
    const gastos = [gasto({ id: 'g1', monto: 900_000, compromisoId: 'grande-pagado', fecha: '2026-05-05' })];
    const orden = desgloseNecesidadesDelMes(compromisos, gastos, 2026, 5).map(i => i.id);
    expect(orden).toEqual(['grande-pendiente', 'chico-pendiente', 'grande-pagado']);
  });

  it('gastos de otros meses no cuentan como ejecutado', () => {
    const compromisos = [compromisoFijo()];
    const gastos = [gasto({ id: 'g1', monto: 800_000, compromisoId: 'cf1', fecha: '2026-04-05' })];
    const [item] = desgloseNecesidadesDelMes(compromisos, gastos, 2026, 5);
    expect(item.estadoPago).toBe('ninguno');
  });

  it('sin compromisos devuelve array vacío', () => {
    expect(desgloseNecesidadesDelMes([], [], 2026, 5)).toEqual([]);
    expect(desgloseNecesidadesDelMes(null, null, 2026, 5)).toEqual([]);
  });
});

// ── desgloseAhorroDelMes() (MC.5c, ADR 017) ───────────────────────────────────

describe('desgloseAhorroDelMes()', () => {
  it('sin nada activo devuelve array vacío', () => {
    expect(desgloseAhorroDelMes(null, [], [], [], 2026, 5)).toEqual([]);
  });

  it('fondo activo: acumulado suma montoActual + todos los aportes; aportadoEsteMes solo el del mes', () => {
    const ahorro = {
      fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 200_000 },
      aportes: [
        { id: 'a1', monto: 50_000, fecha: '2026-05-03' },
        { id: 'a2', monto: 30_000, fecha: '2026-04-20' },
      ],
    };
    const [item] = desgloseAhorroDelMes(ahorro, [], [], [], 2026, 5);
    expect(item.tipo).toBe('fondo');
    expect(item.acumulado).toBe(280_000);
    expect(item.aportadoEsteMes).toBe(50_000);
  });

  it('fondo inactivo no aparece en el desglose', () => {
    const ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [] };
    expect(desgloseAhorroDelMes(ahorro, [], [], [], 2026, 5)).toEqual([]);
  });

  it('metas completadas se excluyen; las activas muestran acumulado/objetivo', () => {
    const metas = [
      { id: 'm1', nombre: 'Viaje', montoObjetivo: 2_000_000, montoActual: 500_000, completada: false },
      { id: 'm2', nombre: 'Moto',  montoObjetivo: 5_000_000, montoActual: 5_000_000, completada: true },
    ];
    const items = desgloseAhorroDelMes(null, metas, [], [], 2026, 5);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'm1', tipo: 'meta', acumulado: 500_000, objetivo: 2_000_000, aportadoEsteMes: null });
  });

  it('apartados completados se excluyen; los activos muestran acumulado/objetivo', () => {
    const apartados = [
      { id: 'ap1', nombre: 'SOAT', montoObjetivo: 400_000, montoActual: 100_000, completado: false },
      { id: 'ap2', nombre: 'Impuestos', montoObjetivo: 300_000, montoActual: 300_000, completado: true },
    ];
    const items = desgloseAhorroDelMes(null, [], apartados, [], 2026, 5);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'ap1', tipo: 'apartado', acumulado: 100_000, objetivo: 400_000 });
  });

  it('inversiones aparecen todas, sin objetivo (null)', () => {
    const inversiones = [{ id: 'i1', nombre: 'CDT Bancolombia', monto: 1_000_000 }];
    const items = desgloseAhorroDelMes(null, [], [], inversiones, 2026, 5);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'i1', tipo: 'inversion', acumulado: 1_000_000, objetivo: null });
  });

  it('combina los 4 destinos cuando todos están activos', () => {
    const ahorro = {
      fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 100_000 },
      aportes: [],
    };
    const metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_000_000, montoActual: 200_000, completada: false }];
    const apartados = [{ id: 'ap1', nombre: 'SOAT', montoObjetivo: 300_000, montoActual: 50_000, completado: false }];
    const inversiones = [{ id: 'i1', nombre: 'CDT', monto: 500_000 }];
    const items = desgloseAhorroDelMes(ahorro, metas, apartados, inversiones, 2026, 5);
    expect(items.map(i => i.tipo)).toEqual(['fondo', 'meta', 'apartado', 'inversion']);
  });
});

// ── generarMensajesLimites() (MC.5d, ADR 017) ─────────────────────────────────

const resumenGrupo = (overrides = {}) => ({
  asignado: 1_000_000, ejecutado: 500_000, restante: 500_000, pct: 50, estado: 'ok',
  ...overrides,
});

const itemNecesidad = (overrides = {}) => ({
  id: 'n1', descripcion: 'Arriendo', tipo: 'fijo', categoria: null,
  montoReferencia: 800_000, ejecutado: 800_000, estadoPago: 'completo',
  ...overrides,
});

describe('generarMensajesLimites()', () => {
  it('sin datos no genera ningún mensaje', () => {
    expect(generarMensajesLimites()).toEqual([]);
    expect(generarMensajesLimites({})).toEqual([]);
  });

  it('categoría en alerta (75-99%) genera mensaje con el % y el nombre exacto', () => {
    const alertasCategoria = [{ categoria: 'Restaurantes', estado: 'alerta', porcentaje: 80, gastado: 400_000, asignado: 500_000 }];
    const [m] = generarMensajesLimites({ alertasCategoria });
    expect(m).toMatchObject({ grupo: 'estilo-de-vida', tipo: 'alerta', severidad: 'alerta' });
    expect(m.mensaje).toBe('Ya usaste el 80% de tu presupuesto para Restaurantes. Intenta moderar este tipo de gastos los próximos días.');
  });

  it('categoría excedida (>100%) genera mensaje distinto con severidad "excedido"', () => {
    const alertasCategoria = [{ categoria: 'Mercado', estado: 'excedido', porcentaje: 130, gastado: 650_000, asignado: 500_000 }];
    const [m] = generarMensajesLimites({ alertasCategoria });
    expect(m.severidad).toBe('excedido');
    expect(m.mensaje).toContain('Superaste tu límite para Mercado');
  });

  it('varias categorías generan un mensaje cada una', () => {
    const alertasCategoria = [
      { categoria: 'A', estado: 'alerta',   porcentaje: 80,  gastado: 1, asignado: 1 },
      { categoria: 'B', estado: 'excedido', porcentaje: 120, gastado: 1, asignado: 1 },
    ];
    expect(generarMensajesLimites({ alertasCategoria })).toHaveLength(2);
  });

  it('categoría "ok" no genera mensaje', () => {
    const alertasCategoria = [{ categoria: 'X', estado: 'ok', porcentaje: 10, gastado: 1, asignado: 100 }];
    expect(generarMensajesLimites({ alertasCategoria })).toEqual([]);
  });

  it('grupo Necesidades excedido genera alerta de grupo', () => {
    const resumen = { necesidades: resumenGrupo({ estado: 'excedido' }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m).toMatchObject({ grupo: 'necesidades', tipo: 'alerta', severidad: 'excedido' });
  });

  it('grupo Necesidades en alerta genera mensaje distinto', () => {
    const resumen = { necesidades: resumenGrupo({ estado: 'alerta' }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m.severidad).toBe('alerta');
    expect(m.mensaje).toContain('Vigila los gastos fijos');
  });

  it('grupo Necesidades "ok" no genera alerta de grupo', () => {
    const resumen = { necesidades: resumenGrupo({ estado: 'ok' }) };
    expect(generarMensajesLimites({ resumen })).toEqual([]);
  });

  it('grupo Estilo de vida en alerta usa el mensaje exacto aprobado en el ADR', () => {
    const resumen = { 'estilo-de-vida': resumenGrupo({ estado: 'alerta' }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m.mensaje).toBe('Tus gastos de estilo de vida están creciendo más rápido de lo previsto. Revisa si puedes reducir algunos consumos.');
  });

  it('grupo Estilo de vida excedido genera mensaje distinto', () => {
    const resumen = { 'estilo-de-vida': resumenGrupo({ estado: 'excedido' }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m.severidad).toBe('excedido');
  });

  it('grupo Ahorro con pct >= 100 genera refuerzo, con el mensaje exacto del ADR', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'alerta', pct: 100 }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m).toMatchObject({ grupo: 'ahorro', tipo: 'refuerzo', severidad: null });
    expect(m.mensaje).toBe('Vas por buen camino. Cumpliste con el ahorro programado para este período.');
  });

  it('grupo Ahorro excedido (aportaste de más) también genera el refuerzo, no una alerta', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'excedido', pct: 130 }) };
    const [m] = generarMensajesLimites({ resumen });
    expect(m.tipo).toBe('refuerzo');
  });

  it('grupo Ahorro por debajo de 100% no genera ningún mensaje', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'alerta', pct: 80 }) };
    expect(generarMensajesLimites({ resumen })).toEqual([]);
  });

  it('grupo Ahorro sin asignado (0) no genera refuerzo aunque pct sea 0/NaN', () => {
    const resumen = { ahorro: resumenGrupo({ asignado: 0, ejecutado: 0, pct: 0, estado: 'ok' }) };
    expect(generarMensajesLimites({ resumen })).toEqual([]);
  });

  it('refuerzo combinado: todas las necesidades pagadas + ahorro ejecutado > 0', () => {
    const resumen = {
      necesidades: resumenGrupo({ estado: 'ok' }),
      ahorro:      resumenGrupo({ estado: 'ok', ejecutado: 100_000, pct: 20 }),
    };
    const itemsNecesidades = [itemNecesidad({ estadoPago: 'completo' })];
    const mensajes = generarMensajesLimites({ resumen, itemsNecesidades });
    const combinado = mensajes.find(m => m.grupo === null);
    expect(combinado).toBeDefined();
    expect(combinado.mensaje).toBe('Cumpliste todas tus necesidades este mes y aún tienes dinero para ahorrar. Excelente trabajo.');
  });

  it('refuerzo combinado no aparece si algún item de Necesidades está pendiente o parcial', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'ok', ejecutado: 100_000, pct: 20 }) };
    const itemsNecesidades = [itemNecesidad({ estadoPago: 'completo' }), itemNecesidad({ id: 'n2', estadoPago: 'ninguno' })];
    const mensajes = generarMensajesLimites({ resumen, itemsNecesidades });
    expect(mensajes.find(m => m.grupo === null)).toBeUndefined();
  });

  it('refuerzo combinado no aparece si no hay items de Necesidades registrados', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'ok', ejecutado: 100_000, pct: 20 }) };
    const mensajes = generarMensajesLimites({ resumen, itemsNecesidades: [] });
    expect(mensajes.find(m => m.grupo === null)).toBeUndefined();
  });

  it('refuerzo combinado no aparece si el ahorro ejecutado es 0', () => {
    const resumen = { ahorro: resumenGrupo({ estado: 'ok', ejecutado: 0, pct: 0 }) };
    const itemsNecesidades = [itemNecesidad({ estadoPago: 'completo' })];
    const mensajes = generarMensajesLimites({ resumen, itemsNecesidades });
    expect(mensajes.find(m => m.grupo === null)).toBeUndefined();
  });

  it('refuerzo combinado no aparece si el grupo Necesidades está excedido, aunque los items estén completos', () => {
    const resumen = {
      necesidades: resumenGrupo({ estado: 'excedido' }),
      ahorro:      resumenGrupo({ estado: 'ok', ejecutado: 100_000, pct: 20 }),
    };
    const itemsNecesidades = [itemNecesidad({ estadoPago: 'completo' })];
    const mensajes = generarMensajesLimites({ resumen, itemsNecesidades });
    expect(mensajes.find(m => m.grupo === null)).toBeUndefined();
    // Sí debe seguir mostrando la alerta de grupo de Necesidades.
    expect(mensajes.some(m => m.id === 'grupo-necesidades')).toBe(true);
  });
});

// ── totalAsignadoMensual() ────────────────────────────────────────────────────

describe('totalAsignadoMensual()', () => {
  it('suma el monto mensual de envelopes activos', () => {
    const lista = [
      presupuesto({ id: 'a', montoMensual: 500_000 }),
      presupuesto({ id: 'b', montoMensual: 300_000 }),
      presupuesto({ id: 'c', montoMensual: 100_000 }),
    ];
    expect(totalAsignadoMensual(lista)).toBe(900_000);
  });

  it('ignora envelopes inactivos', () => {
    const lista = [
      presupuesto({ id: 'a', montoMensual: 500_000 }),
      presupuesto({ id: 'b', montoMensual: 300_000, activo: false }),
    ];
    expect(totalAsignadoMensual(lista)).toBe(500_000);
  });

  it('lista vacía devuelve 0', () => {
    expect(totalAsignadoMensual([])).toBe(0);
  });
});

// ── categoriasSinPresupuesto() ────────────────────────────────────────────────

describe('categoriasSinPresupuesto()', () => {
  it('detecta categorías con gastos pero sin envelope', () => {
    const presupuestos = [presupuesto({ categoria: 'Alimentación' })];
    const gastos = [
      gasto({ id: 'g1', categoria: 'Alimentación', monto: 50_000 }),
      gasto({ id: 'g2', categoria: 'Transporte',   monto: 30_000 }),
      gasto({ id: 'g3', categoria: 'Salud',        monto: 20_000 }),
    ];
    const result = categoriasSinPresupuesto(presupuestos, gastos, 2026, 5);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.categoria).sort()).toEqual(['Salud', 'Transporte']);
  });

  it('agrupa múltiples gastos de la misma categoría', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'Transporte', monto: 5_000 }),
      gasto({ id: 'g2', categoria: 'Transporte', monto: 8_000 }),
    ];
    const result = categoriasSinPresupuesto([], gastos, 2026, 5);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ categoria: 'Transporte', gastado: 13_000 });
  });

  it('ordena por gastado descendente', () => {
    const gastos = [
      gasto({ id: 'g1', categoria: 'Transporte', monto: 5_000 }),
      gasto({ id: 'g2', categoria: 'Ropa',       monto: 100_000 }),
      gasto({ id: 'g3', categoria: 'Salud',      monto: 50_000 }),
    ];
    const result = categoriasSinPresupuesto([], gastos, 2026, 5);
    expect(result.map(r => r.categoria)).toEqual(['Ropa', 'Salud', 'Transporte']);
  });

  it('ignora gastos de otro mes', () => {
    const gastos = [gasto({ categoria: 'Salud', fecha: '2026-04-15', monto: 100_000 })];
    expect(categoriasSinPresupuesto([], gastos, 2026, 5)).toEqual([]);
  });

  it('envelopes inactivos no cuentan como con presupuesto', () => {
    const presupuestos = [presupuesto({ categoria: 'Salud', activo: false })];
    const gastos = [gasto({ categoria: 'Salud', monto: 50_000 })];
    const result = categoriasSinPresupuesto(presupuestos, gastos, 2026, 5);
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('Salud');
  });
});

// ── tienePresupuesto() ────────────────────────────────────────────────────────

describe('tienePresupuesto()', () => {
  it('detecta categoría con envelope activo', () => {
    const lista = [presupuesto({ categoria: 'Alimentación' })];
    expect(tienePresupuesto('Alimentación', lista)).toBe(true);
  });

  it('ignora envelopes inactivos', () => {
    const lista = [presupuesto({ categoria: 'Alimentación', activo: false })];
    expect(tienePresupuesto('Alimentación', lista)).toBe(false);
  });

  it('false si la categoría no aparece', () => {
    expect(tienePresupuesto('Salud', [presupuesto({ categoria: 'Alimentación' })])).toBe(false);
  });
});

// ── validarPresupuesto() ──────────────────────────────────────────────────────

describe('validarPresupuesto()', () => {
  it('válido con categoría y monto correcto', () => {
    expect(validarPresupuesto({ categoria: 'Alimentación', montoMensual: '500000' }, [])).toEqual([]);
  });

  it('error si falta categoría', () => {
    const errs = validarPresupuesto({ montoMensual: '500000' }, []);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/categoría/i);
  });

  it('error si categoría no está en el catálogo', () => {
    const errs = validarPresupuesto({ categoria: 'Inventada', montoMensual: '1000' }, []);
    expect(errs[0]).toMatch(/inválida/i);
  });

  it('error si monto es 0 o negativo', () => {
    const errs1 = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '0' }, []);
    expect(errs1[0]).toMatch(/mayor a 0/i);
    const errs2 = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '-100' }, []);
    expect(errs2[0]).toMatch(/mayor a 0/i);
  });

  it('error si monto no es número', () => {
    const errs = validarPresupuesto({ categoria: 'Alimentación', montoMensual: 'abc' }, []);
    expect(errs[0]).toMatch(/mayor a 0/i);
  });

  it('error si ya existe envelope para esa categoría', () => {
    const existentes = [presupuesto({ categoria: 'Alimentación' })];
    const errs = validarPresupuesto({ categoria: 'Alimentación', montoMensual: '300000' }, existentes);
    expect(errs[0]).toMatch(/ya existe/i);
  });

  it('NO marca duplicado si estamos editando el mismo envelope (id coincide)', () => {
    const existentes = [presupuesto({ id: 'p1', categoria: 'Alimentación' })];
    const errs = validarPresupuesto(
      { categoria: 'Alimentación', montoMensual: '600000' },
      existentes,
      'p1',
    );
    expect(errs).toEqual([]);
  });

  it('marca duplicado si editamos otro envelope hacia una categoría ya usada', () => {
    const existentes = [
      presupuesto({ id: 'p1', categoria: 'Alimentación' }),
      presupuesto({ id: 'p2', categoria: 'Transporte' }),
    ];
    const errs = validarPresupuesto(
      { categoria: 'Alimentación', montoMensual: '500000' },
      existentes,
      'p2',
    );
    expect(errs[0]).toMatch(/ya existe/i);
  });
});

// ── normalizarPresupuesto() ───────────────────────────────────────────────────

describe('normalizarPresupuesto()', () => {
  it('convierte montoMensual a Number', () => {
    const out = normalizarPresupuesto({ categoria: 'Alimentación', montoMensual: '500000' });
    expect(out.montoMensual).toBe(500_000);
    expect(typeof out.montoMensual).toBe('number');
  });

  it('marca activo: true por defecto', () => {
    const out = normalizarPresupuesto({ categoria: 'Alimentación', montoMensual: '100' });
    expect(out.activo).toBe(true);
  });

  it('preserva la categoría tal cual', () => {
    const out = normalizarPresupuesto({ categoria: 'Salud', montoMensual: '200000' });
    expect(out.categoria).toBe('Salud');
  });
});
