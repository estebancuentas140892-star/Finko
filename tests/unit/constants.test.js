import { describe, it, expect } from 'vitest';
import {
  legalVigente,
  legalDelAnio,
  aniosPublicados,
  estadoVigenciaLegal,
  BANCOS_CO,
  TIPOS_CUENTA,
  TIPOS_POR_CLASE,
  CATEGORIAS_GASTO,
  CATEGORIAS_GASTO_USUARIO,
  INFLACION_OBJETIVO,
  IPC_OBSERVADO_POR_ANIO,
  ipcObservadoVigente,
  CATEGORIA_ICONO,
  CATEGORIA_AGENDA_ICONO,
  CATEGORIA_INGRESO_ICONO,
  CATEGORIA_DEUDA_ICONO,
  CATEGORIA_DEUDA_PERSONAL_ICONO,
  CATEGORIAS_META,
  CATEGORIA_META_ICONO,
  GRUPOS_FINANCIEROS,
  LABEL_GRUPO_FINANCIERO,
  GRUPO_POR_SECCION,
  clasificarSeccionEnGrupo,
  ICONOS_CATEGORIA_PERSONALIZADA,
  iconoDeCategoriaGasto,
} from '../../modules/core/constants.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Fechas en hora local (mes 0-indexado) para evitar corrimientos de zona.
const enAnio = (anio) => new Date(anio, 5, 15);

describe('legalVigente', () => {
  it('devuelve los valores del año actual cuando existe entrada', () => {
    const v = legalVigente(enAnio(2026));
    expect(v.anio).toBe(2026);
    expect(v.smmlv).toBe(1_750_905);
    expect(v.uvt).toBe(52_374);
  });

  it('respeta un año histórico publicado', () => {
    const v = legalVigente(enAnio(2025));
    expect(v.anio).toBe(2025);
    expect(v.smmlv).toBe(1_300_000);
  });

  it('cae al último año publicado cuando el año en curso no tiene entrada', () => {
    const v = legalVigente(enAnio(2027));
    expect(v.anio).toBe(2026);
    expect(v.smmlv).toBe(1_750_905);
  });

  it('mantiene el fallback varios años hacia adelante', () => {
    expect(legalVigente(enAnio(2030)).anio).toBe(2026);
  });
});

describe('legalDelAnio', () => {
  it('devuelve el objeto de un año publicado', () => {
    expect(legalDelAnio(2026)?.uvt).toBe(52_374);
  });

  it('devuelve null para un año sin valores cargados', () => {
    expect(legalDelAnio(2027)).toBeNull();
    expect(legalDelAnio(1999)).toBeNull();
  });
});

describe('aniosPublicados', () => {
  it('lista solo los años con valores cargados, ordenados', () => {
    const anios = aniosPublicados();
    expect(anios).toContain(2025);
    expect(anios).toContain(2026);
    expect(anios).not.toContain(2027); // 2027 está como null
    expect([...anios]).toEqual([...anios].sort((a, b) => a - b));
  });
});

describe('estadoVigenciaLegal', () => {
  it('no marca desactualizado cuando el año en curso tiene valores', () => {
    const e = estadoVigenciaLegal(enAnio(2026));
    expect(e.desactualizado).toBe(false);
    expect(e.anioActual).toBe(2026);
    expect(e.anioVigente).toBe(2026);
  });

  it('no marca desactualizado en un año histórico publicado', () => {
    const e = estadoVigenciaLegal(enAnio(2025));
    expect(e.desactualizado).toBe(false);
    expect(e.anioVigente).toBe(2025);
  });

  it('marca desactualizado cuando el año en curso aún no tiene valores', () => {
    const e = estadoVigenciaLegal(enAnio(2027));
    expect(e.desactualizado).toBe(true);
    expect(e.anioActual).toBe(2027);
    expect(e.anioVigente).toBe(2026); // referencia provisional
  });

  it('sigue marcando desactualizado varios años después', () => {
    const e = estadoVigenciaLegal(enAnio(2031));
    expect(e.desactualizado).toBe(true);
    expect(e.anioActual).toBe(2031);
    expect(e.anioVigente).toBe(2026);
  });

  it('usa la fecha actual por defecto y retorna las tres claves', () => {
    const e = estadoVigenciaLegal();
    expect(typeof e.desactualizado).toBe('boolean');
    expect(Number.isInteger(e.anioActual)).toBe(true);
    expect(Number.isInteger(e.anioVigente)).toBe(true);
    expect(e.anioVigente).toBeLessThanOrEqual(e.anioActual);
  });
});

// ── Catálogo de cuentas (clase de entidad + tipos) ────────────────

describe('BANCOS_CO - clase de entidad', () => {
  it('toda entrada tiene una clase válida', () => {
    const clasesValidas = ['efectivo', 'banco', 'billetera', 'otro'];
    for (const b of BANCOS_CO) {
      expect(clasesValidas).toContain(b.clase);
    }
  });

  it('Efectivo es clase efectivo', () => {
    expect(BANCOS_CO.find(b => b.id === 'Efectivo').clase).toBe('efectivo');
  });

  it('las billeteras digitales conocidas son clase billetera', () => {
    for (const id of ['Nequi', 'Daviplata', 'Nubank', 'Lulo Bank']) {
      expect(BANCOS_CO.find(b => b.id === id).clase).toBe('billetera');
    }
  });

  it('los bancos tradicionales son clase banco', () => {
    for (const id of ['Bancolombia', 'Davivienda', 'BBVA Colombia']) {
      expect(BANCOS_CO.find(b => b.id === id).clase).toBe('banco');
    }
  });
});

describe('TIPOS_CUENTA y TIPOS_POR_CLASE', () => {
  it('ya no incluye "Inversión" (vive en el dominio Inversión)', () => {
    expect(TIPOS_CUENTA).not.toContain('Inversión');
  });

  it('conserva los tipos vigentes', () => {
    expect(TIPOS_CUENTA).toEqual(['Corriente', 'Ahorros', 'Efectivo', 'Otro']);
  });

  it('TIPOS_POR_CLASE cubre las cuatro clases', () => {
    expect(Object.keys(TIPOS_POR_CLASE).sort())
      .toEqual(['banco', 'billetera', 'efectivo', 'otro']);
  });

  it('banco ofrece Corriente y Ahorros', () => {
    expect(TIPOS_POR_CLASE.banco).toEqual(['Corriente', 'Ahorros']);
  });

  it('billetera y efectivo no muestran selector de tipo (lista vacía)', () => {
    expect(TIPOS_POR_CLASE.billetera).toEqual([]);
    expect(TIPOS_POR_CLASE.efectivo).toEqual([]);
  });

  it('todo tipo listado en TIPOS_POR_CLASE existe en TIPOS_CUENTA', () => {
    for (const tipos of Object.values(TIPOS_POR_CLASE)) {
      for (const t of tipos) {
        expect(TIPOS_CUENTA).toContain(t);
      }
    }
  });
});

// ── CATEGORIAS_META / CATEGORIA_META_ICONO (MT.1, sprite desde ID.3) ──

describe('CATEGORIAS_META / CATEGORIA_META_ICONO', () => {
  it('toda categoría de CATEGORIAS_META tiene un ícono en CATEGORIA_META_ICONO', () => {
    for (const cat of CATEGORIAS_META) {
      expect(CATEGORIA_META_ICONO[cat]).toBeDefined();
      expect(typeof CATEGORIA_META_ICONO[cat]).toBe('string');
      expect(CATEGORIA_META_ICONO[cat].length).toBeGreaterThan(0);
    }
  });

  it('CATEGORIA_META_ICONO no tiene entradas huérfanas (todas están en CATEGORIAS_META)', () => {
    for (const cat of Object.keys(CATEGORIA_META_ICONO)) {
      expect(CATEGORIAS_META).toContain(cat);
    }
  });

  it('incluye la categoría de escape "Otra" con la caja c-otros', () => {
    expect(CATEGORIAS_META).toContain('Otra');
    expect(CATEGORIA_META_ICONO['Otra']).toBe('c-otros');
  });

  it('sin categorías duplicadas', () => {
    expect(new Set(CATEGORIAS_META).size).toBe(CATEGORIAS_META.length);
  });
});

// ── TX.4: guardarraíl de consistencia de íconos entre catálogos (ADR 014,
//    ids de sprite desde ID.3) ──
//
// ADR 014 exige que toda etiqueta compartida entre catálogos use el mismo
// ícono en todos los catálogos donde aparece. Este test falla si alguien
// introduce un desajuste (ej. Mercado c-mercado en Gastos pero otro id en
// Agenda).
//
// Fuentes incluidas: los 6 catálogos CATEGORIA_*_ICONO. Las plantillas de
// Apartados quedaron fuera desde ID.3: su `icono` es un emoji que se guarda
// como dato del usuario (ADR 025 D3), ya no comparte formato con el sprite.
// Se ignoran etiquetas internas de Gastos (Deudas, Ahorro, Alimentación).
// La comparación es por nombre exacto (case-sensitive): "Otro" ≠ "Otros".

describe('E.5 - IPC observado como constante anual', () => {
  it('tiene el cierre oficial del DANE para 2024 y 2025', () => {
    expect(IPC_OBSERVADO_POR_ANIO[2024]).toBe(0.0520);
    expect(IPC_OBSERVADO_POR_ANIO[2025]).toBe(0.0510);
  });

  it('ipcObservadoVigente devuelve el año más reciente publicado', () => {
    const v = ipcObservadoVigente();
    expect(v.anio).toBe(2025);
    expect(v.valor).toBe(0.0510);
  });

  it('todos los valores son decimales razonables (entre 0 y 30%)', () => {
    for (const [anio, valor] of Object.entries(IPC_OBSERVADO_POR_ANIO)) {
      expect(valor, `IPC de ${anio}`).toBeGreaterThan(0);
      expect(valor, `IPC de ${anio}`).toBeLessThan(0.30);
    }
  });

  it('la meta de BanRep sigue disponible como referencia aparte', () => {
    expect(INFLACION_OBJETIVO).toBe(0.03);
  });
});

describe('TX.3 - Café y Gastos hormiga en el catálogo de gastos', () => {
  it('las dos categorías nuevas existen y son visibles para el usuario', () => {
    expect(CATEGORIAS_GASTO).toContain('Café');
    expect(CATEGORIAS_GASTO).toContain('Gastos hormiga');
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Café');
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Gastos hormiga');
  });

  it('cada una tiene su ícono propio', () => {
    expect(CATEGORIA_ICONO['Café']).toBe('c-cafe');
    expect(CATEGORIA_ICONO['Gastos hormiga']).toBe('c-hormiga');
  });

  it('toda categoría de gasto tiene ícono (ninguna cae al fallback)', () => {
    for (const c of CATEGORIAS_GASTO) {
      expect(typeof CATEGORIA_ICONO[c], `ícono de ${c}`).toBe('string');
      expect(CATEGORIA_ICONO[c].length, `ícono de ${c}`).toBeGreaterThan(0);
    }
  });
});

describe('TX.4 - Consistencia de íconos entre catálogos (ADR 014, ids de sprite)', () => {
  // Pares (label, icono, fuente) de todos los catálogos.
  const entradas = [
    ...Object.entries(CATEGORIA_ICONO)
      .filter(([k]) => !['Deudas', 'Ahorro', 'Alimentación'].includes(k))
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Gastos' })),
    ...Object.entries(CATEGORIA_AGENDA_ICONO)
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Agenda' })),
    ...Object.entries(CATEGORIA_INGRESO_ICONO)
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Ingresos' })),
    ...Object.entries(CATEGORIA_DEUDA_ICONO)
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Deudas' })),
    ...Object.entries(CATEGORIA_DEUDA_PERSONAL_ICONO)
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Deudas personales' })),
    ...Object.entries(CATEGORIA_META_ICONO)
      .map(([k, v]) => ({ label: k, icono: v, fuente: 'Metas' })),
  ];

  // Agrupar por etiqueta.
  const porLabel = {};
  for (const { label, icono, fuente } of entradas) {
    (porLabel[label] ??= []).push({ icono, fuente });
  }

  // Solo las etiquetas que aparecen en más de un catálogo.
  const compartidas = Object.entries(porLabel)
    .filter(([, ocurrencias]) => ocurrencias.length > 1);

  it('hay al menos una etiqueta compartida entre catálogos (smoke del propio guardarraíl)', () => {
    expect(compartidas.length).toBeGreaterThan(0);
  });

  it('toda etiqueta compartida usa el mismo ícono en todos los catálogos', () => {
    for (const [label, ocurrencias] of compartidas) {
      const iconosDistintos = [...new Set(ocurrencias.map(o => o.icono))];
      expect(
        iconosDistintos,
        `"${label}" aparece en [${ocurrencias.map(o => o.fuente).join(', ')}] ` +
        `con íconos distintos: ${iconosDistintos.join(' vs ')}`,
      ).toHaveLength(1);
    }
  });

  it('todo id referenciado por un catálogo existe como <symbol> en el sprite de index.html', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const ids = new Set([...indexHtml.matchAll(/<symbol id="([\w-]+)"/g)].map(m => m[1]));
    for (const { label, icono, fuente } of entradas) {
      expect(ids.has(icono), `"${label}" (${fuente}) apunta a "${icono}", que no está en el sprite`).toBe(true);
    }
    // Las claves internas de Gastos filtradas arriba también deben resolver.
    for (const k of ['Deudas', 'Ahorro', 'Alimentación']) {
      expect(ids.has(CATEGORIA_ICONO[k]), `interna "${k}"`).toBe(true);
    }
  });
});

// ── TX.9b: catálogo de íconos para categorías personalizadas ─────

describe('TX.9b - ICONOS_CATEGORIA_PERSONALIZADA', () => {
  it('no repite ningún ícono ya asignado en CATEGORIA_ICONO (evita glifos duplicados en el mismo selector)', () => {
    const usados = new Set(Object.values(CATEGORIA_ICONO));
    for (const { icono, etiqueta } of ICONOS_CATEGORIA_PERSONALIZADA) {
      expect(usados.has(icono), `"${etiqueta}" (${icono}) ya está asignado en CATEGORIA_ICONO`).toBe(false);
    }
  });

  it('cada ícono existe como <symbol> en el sprite de index.html', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const ids = new Set([...indexHtml.matchAll(/<symbol id="([\w-]+)"/g)].map(m => m[1]));
    for (const { icono, etiqueta } of ICONOS_CATEGORIA_PERSONALIZADA) {
      expect(ids.has(icono), `"${etiqueta}" apunta a "${icono}", que no está en el sprite`).toBe(true);
    }
  });

  it('no tiene íconos ni etiquetas repetidas dentro del propio catálogo', () => {
    const iconos = ICONOS_CATEGORIA_PERSONALIZADA.map(i => i.icono);
    const etiquetas = ICONOS_CATEGORIA_PERSONALIZADA.map(i => i.etiqueta);
    expect(new Set(iconos).size).toBe(iconos.length);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
  });
});

describe('iconoDeCategoriaGasto()', () => {
  it('resuelve una categoría nativa desde CATEGORIA_ICONO', () => {
    expect(iconoDeCategoriaGasto('Mercado')).toBe('c-mercado');
  });

  it('resuelve una categoría personalizada por nombre', () => {
    const personalizadas = [{ nombre: 'Gimnasio', icono: 'c-pesa' }];
    expect(iconoDeCategoriaGasto('Gimnasio', personalizadas)).toBe('c-pesa');
  });

  it('nativa tiene prioridad si por algún motivo coinciden los nombres', () => {
    const personalizadas = [{ nombre: 'Mercado', icono: 'c-pesa' }];
    expect(iconoDeCategoriaGasto('Mercado', personalizadas)).toBe('c-mercado');
  });

  it('cae al genérico i-gastos sin categoría nativa ni personalizada', () => {
    expect(iconoDeCategoriaGasto('Categoría inexistente', [])).toBe('i-gastos');
  });

  it('tolera personalizadas ausente (default [])', () => {
    expect(iconoDeCategoriaGasto('Categoría inexistente')).toBe('i-gastos');
  });
});

// ── TX.5: mapeo sección → grupo financiero (ADR 014) ─────────────

describe('TX.5 - Mapeo sección → grupo financiero (ADR 014)', () => {
  it('GRUPOS_FINANCIEROS tiene exactamente los 3 grupos en orden de prioridad', () => {
    expect(GRUPOS_FINANCIEROS).toEqual(['necesidades', 'estilo-de-vida', 'ahorro']);
  });

  it('LABEL_GRUPO_FINANCIERO tiene etiqueta legible para cada grupo', () => {
    for (const g of GRUPOS_FINANCIEROS) {
      expect(typeof LABEL_GRUPO_FINANCIERO[g]).toBe('string');
      expect(LABEL_GRUPO_FINANCIERO[g].length).toBeGreaterThan(0);
    }
  });

  it('Agenda y Deudas mapean a necesidades', () => {
    expect(clasificarSeccionEnGrupo('agenda')).toBe('necesidades');
    expect(clasificarSeccionEnGrupo('deudas')).toBe('necesidades');
  });

  it('Gastos mapea a estilo-de-vida', () => {
    expect(clasificarSeccionEnGrupo('gastos')).toBe('estilo-de-vida');
  });

  it('Apartados, Metas, Ahorro e Inversión mapean a ahorro', () => {
    expect(clasificarSeccionEnGrupo('apartados')).toBe('ahorro');
    expect(clasificarSeccionEnGrupo('metas')).toBe('ahorro');
    expect(clasificarSeccionEnGrupo('ahorro')).toBe('ahorro');
    expect(clasificarSeccionEnGrupo('inversion')).toBe('ahorro');
  });

  it('sección desconocida devuelve null', () => {
    expect(clasificarSeccionEnGrupo('desconocida')).toBeNull();
    expect(clasificarSeccionEnGrupo('')).toBeNull();
    expect(clasificarSeccionEnGrupo(undefined)).toBeNull();
  });

  it('todo valor de GRUPO_POR_SECCION es un grupo válido', () => {
    for (const grupo of Object.values(GRUPO_POR_SECCION)) {
      expect(GRUPOS_FINANCIEROS).toContain(grupo);
    }
  });

  it('los tres grupos están representados en GRUPO_POR_SECCION', () => {
    const gruposRepresentados = new Set(Object.values(GRUPO_POR_SECCION));
    for (const g of GRUPOS_FINANCIEROS) {
      expect(gruposRepresentados.has(g)).toBe(true);
    }
  });
});
