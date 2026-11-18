/**
 * SUS.2a (ADR 147): Mecato, subcategorías de gasto y el carácter de cada gasto
 * (necesidad, gusto o depende). Catálogo, resolución, normalización, el título
 * de la fila y el bloque del formulario de escritorio.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import {
  CATEGORIAS_GASTO, CATEGORIAS_GASTO_USUARIO, CATEGORIA_ICONO,
  CARACTERES_GASTO, CARACTER_CATEGORIA_GASTO, SUBCATEGORIAS_GASTO,
} from '../../modules/core/constants.js';
import { caracterDeGasto, gastosHormiga, conceptoDeGasto, resumenHormigaMes, preguntaHormiga, etiquetaConcepto, aprendidosDe, conRespuesta } from '../../modules/infra/hormiga.js';
import { htmlCaracterGasto } from '../../modules/dominio/gastos/detalle.js';
import { normalizarGasto, subcategoriaValida } from '../../modules/dominio/gastos/logic.js';
import { textosFilaGasto, renderFormGasto, nombreSubcategoriaGasto } from '../../modules/dominio/gastos/view.js';

describe('catálogo (ADR 147 D2 y D3)', () => {
  it('Mecato es una categoría que se ofrece, después de Café, con la hormiga como ícono', () => {
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Mecato');
    expect(CATEGORIAS_GASTO.indexOf('Mecato')).toBe(CATEGORIAS_GASTO.indexOf('Café') + 1);
    expect(CATEGORIA_ICONO.Mecato).toBe('c-hormiga');
  });

  it('toda categoría que se ofrece tiene carácter, y es uno de los tres', () => {
    for (const c of CATEGORIAS_GASTO_USUARIO) {
      expect(CARACTERES_GASTO, c).toContain(CARACTER_CATEGORIA_GASTO[c]);
    }
    expect(CARACTER_CATEGORIA_GASTO.Mecato).toBe('gusto');
    expect(CARACTER_CATEGORIA_GASTO.Salud).toBe('necesidad');
    expect(CARACTER_CATEGORIA_GASTO.Otros).toBe('depende');
  });

  it('las subcategorías tienen ids únicos, una categoría que se ofrece y, si dicen carácter, uno válido', () => {
    const ids = SUBCATEGORIAS_GASTO.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SUBCATEGORIAS_GASTO) {
      expect(s.categorias, s.id).toHaveLength(1);
      expect(CATEGORIAS_GASTO_USUARIO, s.id).toContain(s.categorias[0]);
      if ('caracter' in s) expect(CARACTERES_GASTO, s.id).toContain(s.caracter);
    }
  });

  it('una subcategoría no repite el carácter de su categoría (solo lo declara si cambia)', () => {
    for (const s of SUBCATEGORIAS_GASTO.filter(x => 'caracter' in x)) {
      expect(s.caracter, s.id).not.toBe(CARACTER_CATEGORIA_GASTO[s.categorias[0]]);
    }
  });

  it('Otros no tiene subcategorías: ahí se pregunta (D4)', () => {
    expect(SUBCATEGORIAS_GASTO.some(s => s.categorias.includes('Otros'))).toBe(false);
  });
});

describe('caracterDeGasto() (ADR 147 D1)', () => {
  it('sin nada más, manda la categoría nativa', () => {
    expect(caracterDeGasto({ categoria: 'Mecato' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Salud' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Restaurantes' })).toBe('depende');
  });

  it('la subcategoría con carácter propio gana a la categoría', () => {
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-almuerzo' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-rapida' })).toBe('gusto');
    // Sin carácter propio, la de su categoría.
    expect(caracterDeGasto({ categoria: 'Restaurantes', subcategoriaId: 'rest-domicilio' })).toBe('depende');
  });

  it('una subcategoría de otra categoría no decide', () => {
    expect(caracterDeGasto({ categoria: 'Salud', subcategoriaId: 'rest-rapida' })).toBe('necesidad');
  });

  it('lo que el usuario contestó en el gasto gana a todo', () => {
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'necesidad' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'gusto' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Otros', caracter: 'otra-cosa' })).toBe('depende');
  });

  it('una categoría propia usa lo contestado al crearla; sin respuesta, depende', () => {
    const propias = [{ nombre: 'Videojuegos', caracter: 'gusto' }, { nombre: 'Gimnasio' }];
    expect(caracterDeGasto({ categoria: 'Videojuegos' }, propias)).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Gimnasio' }, propias)).toBe('depende');
  });

  it('una categoría vieja dice lo que era; una desconocida cae a depende', () => {
    // SUS.2b: quien anotó en "Gastos hormiga" ya dijo que era un gusto.
    expect(caracterDeGasto({ categoria: 'Gastos hormiga' })).toBe('gusto');
    expect(caracterDeGasto({ categoria: 'Vivienda' })).toBe('necesidad');
    expect(caracterDeGasto({ categoria: 'Algo raro' })).toBe('depende');
    expect(caracterDeGasto({})).toBe('depende');
    expect(caracterDeGasto(null)).toBe('depende');
  });
});

describe('normalizarGasto() con subcategoría y carácter', () => {
  const base = { monto: '5000', fecha: '2026-11-15', cuentaId: 'c1' };

  it('guarda la subcategoría si es de la categoría', () => {
    expect(normalizarGasto({ ...base, categoria: 'Mecato', subcategoriaId: 'mecato-helado' }).subcategoriaId).toBe('mecato-helado');
  });

  it('descarta una subcategoría de otra categoría o inexistente, explícita en null', () => {
    expect(normalizarGasto({ ...base, categoria: 'Salud', subcategoriaId: 'mecato-helado' })).toHaveProperty('subcategoriaId', null);
    expect(normalizarGasto({ ...base, categoria: 'Mecato', subcategoriaId: 'no-existe' }).subcategoriaId).toBeNull();
    expect(normalizarGasto({ ...base, categoria: 'Mecato' }).subcategoriaId).toBeNull();
  });

  it('la respuesta de carácter solo se guarda en Otros', () => {
    expect(normalizarGasto({ ...base, categoria: 'Otros', caracter: 'necesidad' }).caracter).toBe('necesidad');
    expect(normalizarGasto({ ...base, categoria: 'Mecato', caracter: 'necesidad' })).toHaveProperty('caracter', null);
    expect(normalizarGasto({ ...base, categoria: 'Otros', caracter: 'depende' }).caracter).toBeNull();
  });

  it('subcategoriaValida() es la misma regla', () => {
    expect(subcategoriaValida('cafe-tinto', 'Café')).toBe('cafe-tinto');
    expect(subcategoriaValida('cafe-tinto', 'Mecato')).toBeNull();
    expect(subcategoriaValida(42, 'Café')).toBeNull();
  });
});

describe('textosFilaGasto() con subcategoría (ADR 147 D5)', () => {
  const cuentas = [{ id: 'n', nombre: 'Nequi' }];

  it('sin nota, la subcategoría es el título y la categoría va debajo', () => {
    expect(textosFilaGasto({ categoria: 'Mecato', subcategoriaId: 'mecato-helado', cuentaId: 'n' }, cuentas))
      .toEqual({ titulo: 'Helado', subtitulo: 'Mecato · Nequi' });
  });

  it('con nota, la nota es el título y la subcategoría acompaña a la categoría', () => {
    expect(textosFilaGasto({ categoria: 'Mecato', subcategoriaId: 'mecato-helado', nota: 'Con los niños', cuentaId: 'n' }, cuentas))
      .toEqual({ titulo: 'Con los niños', subtitulo: 'Mecato · Helado · Nequi' });
  });

  it('una subcategoría que no es de su categoría no se muestra', () => {
    expect(textosFilaGasto({ categoria: 'Salud', subcategoriaId: 'mecato-helado' }).titulo).toBe('Salud');
    expect(nombreSubcategoriaGasto({ categoria: 'Salud', subcategoriaId: 'mecato-helado' })).toBeNull();
  });
});

describe('renderFormGasto() - "¿En qué fue?" y la pregunta (ADR 147 D5; GAS.5c, ADR 162)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', saldo: 100_000, activa: true }];
  });

  const montar = (opciones) => {
    const div = document.createElement('div');
    div.innerHTML = renderFormGasto(opciones);
    return div;
  };

  it('un grupo por categoría con subcategorías y la pregunta, todo oculto y deshabilitado al nacer', () => {
    const div = montar();
    const grupos = [...div.querySelectorAll('[data-sub-grupo]')];
    expect(grupos.map(g => g.dataset.subGrupo)).toContain('Mecato');
    expect(grupos.map(g => g.dataset.subGrupo)).not.toContain('Otros');
    for (const g of [...grupos, div.querySelector('[data-caracter-grupo]')]) {
      expect(g.hidden).toBe(true);
      expect(g.disabled).toBe(true);
    }
    const mecato = div.querySelector('[data-sub-grupo="Mecato"]');
    expect([...mecato.querySelectorAll('[name="subcategoriaId"]')].map(r => r.value))
      .toEqual(['mecato-dulces', 'mecato-paquetes', 'mecato-helado', 'mecato-bebidas', 'mecato-panaderia', '']);
    // GAS.5c: "Otra cosa" al final; "Necesidad" y "Deseo" (el dato de Deseo sigue siendo gusto).
    expect(mecato.querySelector('label:last-child').textContent.trim()).toBe('Otra cosa');
    expect([...div.querySelectorAll('[data-caracter-grupo] [name="caracter"]')].map(r => r.value)).toEqual(['necesidad', 'gusto']);
    expect(div.querySelector('[data-caracter-grupo] legend').textContent).toBe('¿Fue una necesidad o un deseo?');
  });

  it('el pago de un compromiso (categoría fija) no trae el bloque', () => {
    const div = montar({ categoriaFija: 'Gastos fijos' });
    expect(div.querySelector('[data-sub-grupo], [data-caracter-grupo]')).toBeNull();
  });
});

// ── SUS.2b (ADR 147 D6): la regla nueva de hormiga ──────────────

describe('gastosHormiga(): lo pequeño que es un gusto', () => {
  const g = (categoria, fecha, monto = 5_000, extra = {}) => ({ categoria, fecha, monto, ...extra });
  const cuenta = (gastos, opciones) => [...gastosHormiga(gastos, opciones)];

  it('un deseo pequeño cuenta solo, sin repetirse; uno grande no', () => {
    const mecato = g('Mecato', '2026-11-03');
    expect(cuenta([mecato, g('Mecato', '2026-11-04', 25_000)])).toEqual([mecato]);
  });

  it('una necesidad nunca cuenta, aunque se repita (el jarabe)', () => {
    const salud = Array.from({ length: 6 }, (_, i) => g('Salud', `2026-11-0${i + 1}`, 15_000));
    expect(cuenta(salud)).toEqual([]);
  });

  it('"depende" cuenta a la tercera vez en 30 días, y cuentan las tres', () => {
    const dos = [g('Restaurantes', '2026-11-01'), g('Restaurantes', '2026-11-10')];
    expect(cuenta(dos)).toEqual([]);
    const tres = [...dos, g('Restaurantes', '2026-11-25')];
    expect(cuenta(tres)).toHaveLength(3);
  });

  it('tres veces repartidas en más de 30 días no son un hábito', () => {
    const lejos = [g('Restaurantes', '2026-10-01'), g('Restaurantes', '2026-10-20'), g('Restaurantes', '2026-11-05')];
    expect(cuenta(lejos)).toEqual([]);
  });

  it('una repetición que cruza el cambio de mes cuenta en los dos meses', () => {
    const gastos = [g('Restaurantes', '2026-10-28', 8_000), g('Restaurantes', '2026-11-02', 6_000), g('Restaurantes', '2026-11-05', 4_000)];
    expect(resumenHormigaMes(gastos, '2026-10').total).toBe(8_000);
    expect(resumenHormigaMes(gastos, '2026-11').total).toBe(10_000);
  });

  it('el concepto es la primera palabra de la nota, sin tildes ni plural', () => {
    const helados = [
      g('Otros', '2026-11-01', 4_000, { nota: 'Helados de mora' }),
      g('Otros', '2026-11-02', 4_000, { nota: 'helado' }),
      g('Otros', '2026-11-03', 4_000, { nota: 'HELADO' }),
    ];
    expect(cuenta(helados)).toHaveLength(3);
    const distintos = [
      g('Otros', '2026-11-01', 4_000, { nota: 'almuerzo' }),
      g('Otros', '2026-11-02', 4_000, { nota: 'pizza' }),
      g('Otros', '2026-11-03', 4_000, { nota: 'almuerzo' }),
    ];
    expect(cuenta(distintos)).toEqual([]);
  });

  it('con subcategoría, el concepto es la subcategoría aunque las notas cambien', () => {
    const domicilios = ['pizza', 'sushi', 'arepas'].map((nota, i) =>
      g('Restaurantes', `2026-11-0${i + 1}`, 15_000, { subcategoriaId: 'rest-domicilio', nota }));
    expect(cuenta(domicilios)).toHaveLength(3);
    expect(conceptoDeGasto(domicilios[0])).toBe('s:rest-domicilio');
    expect(conceptoDeGasto(g('Otros', '2026-11-01', 1, { nota: 'Helados de mora' }))).toBe('c:Otros|helado');
  });

  it('lo que el usuario contestó manda: "necesidad" en Otros no cuenta, y una propia de gusto cuenta sola', () => {
    const recargas = Array.from({ length: 4 }, (_, i) => g('Otros', `2026-11-0${i + 1}`, 10_000, { caracter: 'necesidad', nota: 'recarga' }));
    expect(cuenta(recargas)).toEqual([]);
    const juego = g('Videojuegos', '2026-11-04', 9_000);
    expect(cuenta([juego], { personalizadas: [{ nombre: 'Videojuegos', caracter: 'gusto' }] })).toEqual([juego]);
  });

  it('el pago de un fijo o de una deuda nunca es hormiga', () => {
    const pagos = [
      g('Gastos fijos', '2026-11-01'), g('Gastos fijos', '2026-11-02'), g('Gastos fijos', '2026-11-03'),
      g('Deudas', '2026-11-01'), g('Deudas', '2026-11-02'), g('Deudas', '2026-11-03'),
    ];
    expect(cuenta(pagos)).toEqual([]);
  });

  it('respeta el tope configurado', () => {
    const cafe = g('Café', '2026-11-03', 18_000);
    expect(cuenta([cafe], { tope: 15_000 })).toEqual([]);
    expect(cuenta([cafe], { tope: 20_000 })).toEqual([cafe]);
  });
});

// ── SUS.2c (ADR 147 D1): la pregunta y lo aprendido ─────────────

describe('lo aprendido por concepto (SUS.2c)', () => {
  const g = (categoria, fecha, monto = 5_000, extra = {}) => ({ categoria, fecha, monto, ...extra });
  const tres = (categoria, extra = {}) => [1, 2, 3].map(d => g(categoria, `2026-11-0${d}`, 6_000, extra));

  it('aprendidosDe() lee config.hormiga.conceptos o un vacío estable', () => {
    expect(aprendidosDe({ hormiga: { conceptos: { a: 'gusto' } } })).toEqual({ a: 'gusto' });
    expect(aprendidosDe({})).toBe(aprendidosDe(undefined));
    expect(aprendidosDe({ hormiga: { conceptos: [] } })).toEqual({});
  });

  it('lo contestado manda sobre la categoría y la subcategoría', () => {
    expect(caracterDeGasto(g('Restaurantes', '2026-11-01'), [], { 'c:Restaurantes|': 'necesidad' })).toBe('necesidad');
    expect(caracterDeGasto(g('Restaurantes', '2026-11-01', 1, { subcategoriaId: 'rest-rapida' }), [], { 's:rest-rapida': 'necesidad' })).toBe('necesidad');
    // Una respuesta inválida no cuenta.
    expect(caracterDeGasto(g('Restaurantes', '2026-11-01'), [], { 'c:Restaurantes|': 'quizas' })).toBe('depende');
  });

  it('"gusto" hace contar de inmediato, incluso una sola vez; "necesidad" lo saca aunque se repita', () => {
    const uno = g('Restaurantes', '2026-11-01');
    expect([...gastosHormiga([uno], { aprendidos: { 'c:Restaurantes|': 'gusto' } })]).toEqual([uno]);
    expect([...gastosHormiga(tres('Restaurantes'), { aprendidos: { 'c:Restaurantes|': 'necesidad' } })]).toEqual([]);
  });

  it('preguntaHormiga() elige el concepto "depende" repetido que más suma y sin respuesta', () => {
    const gastos = [...tres('Restaurantes'), ...[4, 5, 6].map(d => g('Otros', `2026-11-0${d}`, 9_000, { nota: 'Helados' })), ...tres('Mecato')];
    expect(preguntaHormiga(gastos, '2026-11')).toEqual({ concepto: 'c:Otros|helado', etiqueta: 'Helado', veces: 3, total: 27_000 });
    expect(preguntaHormiga(gastos, '2026-11', { aprendidos: { 'c:Otros|helado': 'gusto' } }))
      .toEqual({ concepto: 'c:Restaurantes|', etiqueta: 'Restaurantes', veces: 3, total: 18_000 });
    expect(preguntaHormiga(gastos, '2026-11', { aprendidos: { 'c:Otros|helado': 'gusto', 'c:Restaurantes|': 'necesidad' } })).toBeNull();
    expect(preguntaHormiga(gastos, '2026-10')).toBeNull();
  });

  it('etiquetaConcepto() nombra la subcategoría, la palabra o la categoría', () => {
    expect(etiquetaConcepto('s:rest-domicilio')).toBe('Domicilio');
    expect(etiquetaConcepto('c:Otros|helado')).toBe('Helado');
    expect(etiquetaConcepto('c:Restaurantes|')).toBe('Restaurantes');
  });
});

// ── SUS.2d: corregir y olvidar ───────────────────────────────────

describe('conRespuesta() y el bloque del gasto (SUS.2d)', () => {
  it('cambia u olvida sin mutar lo que recibe', () => {
    const antes = Object.freeze({ a: 'gusto', b: 'necesidad' });
    expect(conRespuesta(antes, 'a', 'necesidad')).toEqual({ a: 'necesidad', b: 'necesidad' });
    expect(conRespuesta(antes, 'b', null)).toEqual({ a: 'gusto' });
    expect(conRespuesta(antes, 'c', '')).toEqual({ a: 'gusto', b: 'necesidad' });
    expect(conRespuesta(undefined, 'c', 'gusto')).toEqual({ c: 'gusto' });
  });

  const montar = (gasto) => {
    const div = document.createElement('div');
    div.innerHTML = htmlCaracterGasto(gasto);
    return div;
  };

  it('dice qué es este gasto para Finko y marca la respuesta vigente (GAS.5c: por gasto)', () => {
    Object.assign(S, createInitialState());
    const mecato = montar({ id: 'g1', categoria: 'Mecato', subcategoriaId: 'mecato-helado', monto: 3_000, fecha: '2026-11-03' });
    expect(mecato.textContent).toContain('¿Fue una necesidad o un deseo?');
    expect(mecato.textContent).toContain('Este gasto fue un deseo');
    expect(mecato.querySelector('[data-respuesta="gusto"]').getAttribute('aria-pressed')).toBe('true');
    expect(mecato.querySelector('[data-respuesta="necesidad"]').getAttribute('aria-pressed')).toBe('false');

    const rest = montar({ id: 'g2', categoria: 'Restaurantes', monto: 9_000, fecha: '2026-11-03' });
    expect(rest.textContent).toContain('Todavía no dice si fue una necesidad o un deseo');
    expect(rest.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);

    S.config.hormiga = { tope: 20_000, limite: null, conceptos: { 'c:Restaurantes|': 'necesidad' } };
    expect(montar({ id: 'g2', categoria: 'Restaurantes', monto: 9_000, fecha: '2026-11-03' }).textContent)
      .toContain('Este gasto fue una necesidad');
  });

  it('el pago de un fijo o una deuda no trae el bloque', () => {
    expect(htmlCaracterGasto({ id: 'g3', categoria: 'Gastos fijos', monto: 9_000 })).toBe('');
    expect(htmlCaracterGasto({ id: 'g4', categoria: 'Deudas', monto: 9_000 })).toBe('');
  });
});
