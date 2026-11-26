/**
 * MOV.4 (ADR 200): el buscador que entiende criterios y la hoja de filtros
 * de Movimientos. Lo puro: preparar, aplicar, contar, nombrar y sugerir.
 */
import { describe, it, expect } from 'vitest';
import {
  movimientosCompletos,
} from '../../modules/dominio/movimientos/logic.js';
import {
  prepararMovimientos, aplicarFiltros, filtrosVacios, opcionesDe, chipsActivos, cuantosFiltros,
  sinCriterio, sinCriterios, rangoDeAtajo, textoPeriodo, periodoDeRango, montoDeTexto, sugerencias,
  conSugerencia, filtrosDeLlegada, resumen, salidasSinResultados, fraseSinResultados, grupoMovimiento,
  textoCriterio, conteoPeriodo, conteoValor, alternar,
} from '../../modules/dominio/movimientos/filtros.js';
import { vencimientoDeCadaPago } from '../../modules/infra/vencimientos.js';

const HOY = '2026-11-25';
const cuentas = [
  { id: 'bc', nombre: 'Bancolombia' },
  { id: 'nq', nombre: 'Nequi' },
  { id: 'ef', nombre: 'Efectivo', tipo: 'efectivo' },
];
const compromisos = [
  { id: 'netflix', tipo: 'fijo', descripcion: 'Netflix', categoria: 'Streaming', marcaId: 'netflix', monto: 44_900, frecuencia: 'Mensual', diaPago: 10, fechaCreacion: '2026-09-01T12:00:00' },
  { id: 'arriendo', tipo: 'fijo', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 5, fechaCreacion: '2026-11-01T12:00:00' },
  { id: 'visa', tipo: 'deuda-entidad', descripcion: 'Visa Bancolombia', categoria: 'Tarjeta de crédito', cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 15, fechaCreacion: '2026-11-01T12:00:00' },
  { id: 'tia', tipo: 'deuda-personal', descripcion: 'Tía Rosa', categoria: 'Familiar', cuotaMensual: 100_000, frecuencia: 'Mensual', diaPago: 20, fechaCreacion: '2026-11-01T12:00:00' },
];
const gastos = [
  { id: 'g1', monto: 45_000, categoria: 'Restaurantes', fecha: '2026-11-25', cuentaId: 'nq', nota: 'Almuerzo' },
  { id: 'g2', monto: 22_000, categoria: 'Restaurantes', fecha: '2026-11-20', cuentaId: 'nq', nota: 'Almuerzo' },
  { id: 'g3', monto: 8_000, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', fecha: '2026-11-18', cuentaId: 'ef' },
  { id: 'g4', monto: 3_200, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-bus', fecha: '2026-11-17', cuentaId: 'nq' },
  { id: 'n9', monto: 44_900, categoria: 'Gastos fijos', compromisoId: 'netflix', fecha: '2026-09-10', cuentaId: 'bc' },
  { id: 'n10', monto: 44_900, categoria: 'Gastos fijos', compromisoId: 'netflix', fecha: '2026-10-14', cuentaId: 'bc' },
  { id: 'n11', monto: 44_900, categoria: 'Gastos fijos', compromisoId: 'netflix', fecha: '2026-11-09', cuentaId: 'bc' },
  { id: 'a11', monto: 1_200_000, categoria: 'Gastos fijos', compromisoId: 'arriendo', fecha: '2026-11-05', cuentaId: 'bc' },
  { id: 'v1', monto: 300_000, categoria: 'Deudas', compromisoId: 'visa', fecha: '2026-11-15', cuentaId: 'bc' },
  { id: 'v2', monto: 120_000, categoria: 'Deudas', compromisoId: 'visa', fecha: '2026-11-22', cuentaId: 'nq' },
  { id: 't1', monto: 100_000, categoria: 'Deudas', compromisoId: 'tia', fecha: '2026-11-20', cuentaId: 'ef' },
];
const fuentes = {
  gastos,
  ingresosPuntuales: [{ id: 'i1', monto: 2_150_000, categoria: 'Salario', descripcion: 'Quincena', fecha: '2026-11-15', cuentaId: 'bc' }],
  transferencias: [{ id: 'tr1', monto: 200_000, cuentaOrigenId: 'bc', cuentaDestinoId: 'nq', fecha: '2026-11-16', costoGMF: 800 }],
  personales: [{ id: 'p1', persona: 'Camila', monto: 50_000, cuentaId: 'nq', fecha: '2026-11-02', abonos: [{ id: 'ab1', monto: 20_000, fecha: '2026-11-19', cuentaId: 'nq' }] }],
  compromisos,
};
const movs = prepararMovimientos(movimientosCompletos(fuentes), { compromisos, gastos, cuentas });
const ids = (lista) => lista.map(m => m.id).sort();
const con = (o) => ({ ...filtrosVacios(), ...o });
const ctx = { hoyISO: HOY, cuentas, compromisos };

describe('prepararMovimientos (D5): lo que cada criterio necesita', () => {
  const por = (id) => movs.find(m => m.id === id);

  it('el grupo de tipo separa día a día, fijo y deuda, y junta metas con ahorro', () => {
    expect(por('g1').grupo).toBe('gastos');
    expect(por('n11').grupo).toBe('fijos');
    expect(por('v1').grupo).toBe('deudas');
    expect(por('i1').grupo).toBe('ingresos');
    expect(por('tr1').grupo).toBe('transferencias');
    expect(grupoMovimiento({ tipo: 'aporte-meta' })).toBe('ahorro');
    expect(por('ab1').grupo).toBe('personales');
  });

  it('la categoría del fijo y de la deuda sale del compromiso, no de "Gastos fijos"', () => {
    expect(por('g1').categoriaFiltro).toBe('Restaurantes');
    expect(por('n11').categoriaFiltro).toBe('Streaming');
    expect(por('v1').categoriaFiltro).toBe('Tarjeta de crédito');
  });

  it('empresa: la marca del fijo y la entidad de la deuda; el día a día no tiene', () => {
    expect(por('n11').empresa).toBe('Netflix');
    expect(por('v1').empresa).toBe('Visa Bancolombia');
    expect(por('g1').empresa).toBeNull();
    expect(por('a11').empresa).toBeNull();
  });

  it('persona: la de Me deben y la de una deuda personal', () => {
    expect(por('ab1').persona).toBe('Camila');
    expect(por('p1:prestamo').persona).toBe('Camila');
    expect(por('t1').persona).toBe('Tía Rosa');
  });

  it('estado (D6): a tiempo, con atraso y abono parcial', () => {
    expect(por('n9').estado).toBe('a-tiempo');
    expect(por('n10').estado).toBe('atraso');   // venció el 10, se pagó el 14
    expect(por('n11').estado).toBe('a-tiempo');  // el 9, antes del 10
    expect(por('v1').estado).toBe('a-tiempo');
    expect(por('v2').estado).toBe('parcial');    // menos que la cuota
    expect(por('g1').estado).toBeNull();
  });
});

describe('vencimientoDeCadaPago (D6)', () => {
  it('cada pago salda el vencimiento más viejo sin pago', () => {
    const mapa = vencimientoDeCadaPago(compromisos[0], gastos, { cuota: 44_900 });
    expect(mapa.get('n9').vence).toBe('2026-09-10');
    expect(mapa.get('n10').vence).toBe('2026-10-10');
    expect(mapa.get('n11').vence).toBe('2026-11-10');
  });

  it('en una deuda, el abono parcial no salda ninguno', () => {
    const mapa = vencimientoDeCadaPago(compromisos[2], gastos, { cuota: 300_000, parcialCubre: false });
    expect(mapa.get('v2')).toMatchObject({ vence: null, parcial: true });
  });
});

describe('aplicarFiltros: y entre criterios, o dentro de uno', () => {
  it('sin filtros deja todo', () => {
    expect(aplicarFiltros(movs, filtrosVacios())).toHaveLength(movs.length);
  });

  it('varios tipos a la vez: fijos y deudas juntos', () => {
    expect(ids(aplicarFiltros(movs, con({ tipos: ['fijos', 'deudas'] })))).toEqual(['a11', 'n10', 'n11', 'n9', 't1', 'v1', 'v2']);
  });

  it('categoría entera o subcategoría suelta', () => {
    expect(ids(aplicarFiltros(movs, con({ categorias: ['Streaming'] })))).toEqual(['n10', 'n11', 'n9']);
    expect(ids(aplicarFiltros(movs, con({ subcategorias: ['transp-taxi'] })))).toEqual(['g3']);
    expect(ids(aplicarFiltros(movs, con({ categorias: ['Bus, taxi y apps'] })))).toEqual(['g3', 'g4']);
  });

  it('cuenta con dirección: salió de, llegó a y cualquiera (la transferencia cuenta para las dos)', () => {
    const nq = (sentido) => ids(aplicarFiltros(movs, con({ cuentas: ['nq'], sentido })));
    expect(nq('cualquiera')).toEqual(['ab1', 'g1', 'g2', 'g4', 'p1:prestamo', 'tr1', 'v2']);
    expect(nq('salio')).toEqual(['g1', 'g2', 'g4', 'p1:prestamo', 'v2']);
    expect(nq('llego')).toEqual(['ab1', 'tr1']);
  });

  it('periodo, valor, empresa, persona y estado', () => {
    expect(ids(aplicarFiltros(movs, con({ periodo: { atajo: null, desde: '2026-11-20', hasta: '2026-11-22' } })))).toEqual(['g2', 't1', 'v2']);
    expect(ids(aplicarFiltros(movs, con({ valor: { min: 50_000, max: 200_000, atajo: '50-200' } })))).toEqual(['p1:prestamo', 't1', 'tr1', 'v2']);
    expect(ids(aplicarFiltros(movs, con({ empresas: ['Netflix'] })))).toEqual(['n10', 'n11', 'n9']);
    expect(ids(aplicarFiltros(movs, con({ personas: ['Camila', 'Tía Rosa'] })))).toEqual(['ab1', 'p1:prestamo', 't1']);
    expect(ids(aplicarFiltros(movs, con({ estado: 'atraso' })))).toEqual(['n10']);
  });

  it('el texto busca en cuenta, empresa, persona y categoría, sin tildes; un número busca el monto', () => {
    expect(ids(aplicarFiltros(movs, con({ texto: 'nequi' })))).toContain('g1');
    expect(ids(aplicarFiltros(movs, con({ texto: 'TIA ROSA' })))).toEqual(['t1']);
    expect(ids(aplicarFiltros(movs, con({ texto: 'streaming' })))).toEqual(['n10', 'n11', 'n9']);
    expect(ids(aplicarFiltros(movs, con({ texto: '45.000' })))).toEqual(['g1']);
    expect(ids(aplicarFiltros(movs, con({ texto: '$45000' })))).toEqual(['g1']);
    expect(ids(aplicarFiltros(movs, con({ texto: 'salario' })))).toEqual(['i1']);
  });

  it('los pagos de un compromiso (GAS.14c) no traen la deuda recibida', () => {
    expect(ids(aplicarFiltros(movs, con({ compromisoId: 'visa' })))).toEqual(['v1', 'v2']);
  });
});

describe('conteos por opción, con lo demás ya puesto', () => {
  it('los tipos cuentan sin su propio criterio', () => {
    const f = con({ tipos: ['fijos'], cuentas: ['bc'] });
    const tipos = opcionesDe(movs, f, 'tipos');
    expect(tipos.find(o => o.valor === 'fijos').n).toBe(4);
    expect(tipos.find(o => o.valor === 'deudas').n).toBe(1);
    expect(tipos.find(o => o.valor === 'ingresos').n).toBe(1);
  });

  it('una opción en 0 sigue en la lista', () => {
    const f = con({ cuentas: ['ef'] });
    const cats = opcionesDe(movs, f, 'categorias');
    expect(cats.find(o => o.valor === 'Streaming').n).toBe(0);
    expect(cats.find(o => o.valor === 'Bus, taxi y apps').subs).toEqual([
      { valor: 'transp-bus', nombre: 'Transporte público', n: 0 },
      { valor: 'transp-taxi', nombre: 'Taxi', n: 1 },
    ]);
  });

  it('las cuentas cuentan según la dirección elegida', () => {
    const op = opcionesDe(movs, con({ sentido: 'llego' }), 'cuentas', { cuentas });
    expect(op.find(o => o.valor === 'nq').n).toBe(2);
  });

  it('atajos de periodo y de valor', () => {
    expect(conteoPeriodo(movs, filtrosVacios(), 'hoy', HOY)).toBe(1);
    expect(conteoValor(movs, filtrosVacios(), 'mas-200')).toBe(3);
  });
});

describe('periodos', () => {
  it('semana de lunes a domingo, mes entero, 30 días con hoy', () => {
    expect(rangoDeAtajo('semana', HOY)).toEqual({ desde: '2026-11-23', hasta: '2026-11-29' });
    expect(rangoDeAtajo('mes', HOY)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(rangoDeAtajo('mes-pasado', HOY)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoDeAtajo('30-dias', HOY)).toEqual({ desde: '2026-10-27', hasta: HOY });
    expect(rangoDeAtajo('mes:2026-02', HOY)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });

  it('lo que dice el chip', () => {
    expect(textoPeriodo({ atajo: 'mes', ...rangoDeAtajo('mes', HOY) }, HOY)).toBe('Noviembre');
    expect(textoPeriodo({ atajo: '30-dias', desde: '', hasta: '' }, HOY)).toBe('Últimos 30 días');
    expect(textoPeriodo({ atajo: null, desde: '2026-11-16', hasta: '2026-11-22' }, HOY)).toBe('16 al 22 nov');
    expect(textoPeriodo({ atajo: null, desde: '2026-10-28', hasta: '2026-11-03' }, HOY)).toBe('28 oct al 3 nov');
    expect(textoPeriodo({ atajo: 'mes:2025-10', desde: '', hasta: '' }, HOY)).toBe('Octubre de 2025');
  });

  it('una llegada con el mes se nombra como mes', () => {
    expect(periodoDeRango('2026-11-01', '2026-11-30', HOY).atajo).toBe('mes:2026-11');
    expect(periodoDeRango('2026-11-01', HOY, HOY).atajo).toBe('mes:2026-11');
    expect(periodoDeRango('2026-11-03', '2026-11-09', HOY).atajo).toBeNull();
  });
});

describe('chips y resumen', () => {
  it('cuenta los criterios, no el texto', () => {
    expect(cuantosFiltros(con({ texto: 'x', tipos: ['fijos'], cuentas: ['bc'] }))).toBe(2);
  });

  it('el texto de cada chip y sus dos nombres', () => {
    const f = con({ periodo: { atajo: 'mes', ...rangoDeAtajo('mes', HOY) }, categorias: ['Suscripciones'], cuentas: ['bc'], sentido: 'salio' });
    const chips = chipsActivos(f, ctx);
    expect(chips.map(c => c.texto)).toEqual(['Noviembre', 'Suscripciones', 'De Bancolombia']);
    expect(chips[0].cambiar).toBe('Cambiar el periodo: noviembre');
    expect(chips[0].quitar).toBe('Quitar el filtro noviembre');
  });

  it('plurales y valor', () => {
    expect(textoCriterio(con({ tipos: ['fijos', 'deudas', 'gastos'] }), 'tipos', ctx)).toBe('3 tipos');
    expect(textoCriterio(con({ valor: { min: 50_000, max: 200_000, atajo: '50-200' } }), 'valor', ctx)).toBe('$50.000 a $200.000');
    expect(textoCriterio(con({ cuentas: ['nq'], sentido: 'llego' }), 'cuentas', ctx)).toBe('A Nequi');
  });

  it('quitar uno, quitar todos (el texto se queda)', () => {
    const f = con({ texto: 'x', tipos: ['fijos'], estado: 'atraso' });
    expect(sinCriterio(f, 'tipos').tipos).toEqual([]);
    expect(sinCriterios(f)).toEqual({ ...filtrosVacios(), texto: 'x' });
    expect(alternar(['a'], 'a')).toEqual([]);
  });

  it('"N movimientos · entraron $X y salieron $Y"', () => {
    const r = resumen(aplicarFiltros(movs, con({ cuentas: ['bc'] })));
    expect(r.cuantos).toBe('7 movimientos');
    expect(r.cuanto).toBe('entraron $2.150.000 y salieron $1.634.700');
  });
});

describe('sin resultados (M10)', () => {
  it('cuántos habría sin cada filtro, y la frase', () => {
    const f = con({ periodo: { atajo: 'mes-pasado', ...rangoDeAtajo('mes-pasado', HOY) }, categorias: ['Streaming'], cuentas: ['nq'], sentido: 'salio' });
    expect(aplicarFiltros(movs, f)).toHaveLength(0);
    const salidas = salidasSinResultados(movs, f, ctx);
    expect(salidas.map(s => [s.texto, s.n])).toEqual([['Octubre', 0], ['Streaming', 0], ['De Nequi', 1]]);
    expect(fraseSinResultados(f, ctx)).toBe('En octubre no hay streaming desde Nequi.');
  });
});

describe('el buscador que entiende criterios (S1, 3)', () => {
  it('desde 2 letras, con tipo, categoría y subcategoría primero', () => {
    expect(sugerencias(movs, 't', filtrosVacios(), ctx).filtros).toEqual([]);
    const s = sugerencias(movs, 'trans', filtrosVacios(), ctx);
    expect(s.filtros.map(x => [x.clave, x.nombre, x.donde, x.n])).toEqual([
      ['tipos', 'Transferencias', 'Tipo de movimiento', 1],
      ['subcategorias', 'Transporte público', 'Subcategoría de Bus, taxi y apps', 1],
    ]);
    expect(s.texto).toEqual({ q: 'trans', n: 1 });
    expect(sugerencias(movs, 'taxi', filtrosVacios(), ctx).filtros[0]).toMatchObject({ clave: 'categorias', nombre: 'Bus, taxi y apps', inicio: 5 });
  });

  it('cuenta, empresa, persona, mes y monto', () => {
    expect(sugerencias(movs, 'banco', filtrosVacios(), ctx).filtros[0]).toMatchObject({ clave: 'cuentas', valor: 'bc', nombre: 'Bancolombia' });
    expect(sugerencias(movs, 'netf', filtrosVacios(), ctx).filtros.map(x => x.clave)).toContain('empresas');
    expect(sugerencias(movs, 'cami', filtrosVacios(), ctx).filtros[0]).toMatchObject({ clave: 'personas', valor: 'Camila' });
    expect(sugerencias(movs, 'nov', filtrosVacios(), ctx).filtros.find(x => x.clave === 'periodo')).toMatchObject({ valor: 'mes:2026-11', nombre: 'Noviembre' });
    expect(sugerencias(movs, 'oct', filtrosVacios(), ctx).filtros.find(x => x.clave === 'periodo')).toMatchObject({ valor: 'mes:2026-10' });
    expect(sugerencias(movs, '45.000', filtrosVacios(), ctx).filtros.at(-1)).toMatchObject({ clave: 'valor', valor: 45_000, nombre: 'Valor: $45.000' });
  });

  it('elegir una pone su filtro y borra el texto', () => {
    const f = conSugerencia(con({ texto: 'banco' }), { clave: 'cuentas', valor: 'bc' }, HOY);
    expect(f.texto).toBe('');
    expect(f.cuentas).toEqual(['bc']);
    expect(conSugerencia(filtrosVacios(), { clave: 'periodo', valor: 'mes:2026-10' }, HOY).periodo)
      .toEqual({ atajo: 'mes:2026-10', desde: '2026-10-01', hasta: '2026-10-31' });
  });

  it('montoDeTexto', () => {
    expect(montoDeTexto('45000')).toBe(45_000);
    expect(montoDeTexto('$ 45.000')).toBe(45_000);
    expect(montoDeTexto('45,5')).toBeNull();
    expect(montoDeTexto('microsoft 365')).toBeNull();
  });
});

describe('llegadas de otra sección: reemplazan los filtros', () => {
  it('categoría y mes desde Límites, cuenta desde Mis cuentas, día a día desde Gastos', () => {
    const f = filtrosDeLlegada({ categoria: 'Mercado', desde: '2026-11-01', hasta: '2026-11-30' }, HOY);
    expect(f.categorias).toEqual(['Mercado']);
    expect(f.periodo.atajo).toBe('mes:2026-11');
    expect(filtrosDeLlegada({ cuentaId: 'bc' }, HOY).cuentas).toEqual(['bc']);
    expect(filtrosDeLlegada({ dominio: 'gastos' }, HOY).tipos).toEqual(['gastos']);
    expect(filtrosDeLlegada({ dominio: 'metas' }, HOY).tipos).toEqual(['ahorro']);
    expect(filtrosDeLlegada({ categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi' }, HOY)).toMatchObject({ categorias: [], subcategorias: ['transp-taxi'] });
  });
});
