import { describe, it, expect } from 'vitest';
import {
  legalVigente,
  legalDelAnio,
  aniosPublicados,
  estadoVigenciaLegal,
  BANCOS_CO,
  TIPOS_CUENTA,
  TIPOS_POR_CLASE,
  CATEGORIA_EMOJI,
  CATEGORIA_AGENDA_EMOJI,
  CATEGORIA_INGRESO_EMOJI,
  CATEGORIA_DEUDA_EMOJI,
  GRUPOS_FINANCIEROS,
  LABEL_GRUPO_FINANCIERO,
  GRUPO_POR_SECCION,
  clasificarSeccionEnGrupo,
} from '../../modules/core/constants.js';
import { PLANTILLAS_APARTADO } from '../../modules/dominio/apartados/logic.js';

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

// ── TX.4: guardarraíl de consistencia de emojis entre catálogos (ADR 014) ──
//
// ADR 014 exige que toda etiqueta compartida entre catálogos use el mismo
// emoji en todos los catálogos donde aparece. Este test falla si alguien
// introduce un desajuste (ej. Mercado 🛒 en Gastos pero 🥕 en Agenda).
//
// Fuentes incluidas: Gastos, Agenda, Ingresos, Deudas + PLANTILLAS_APARTADO.
// Se ignoran etiquetas internas de Gastos (Deudas, Ahorro, Alimentación).
// La comparación es por nombre exacto (case-sensitive): "Otro" ≠ "Otros".

describe('TX.4 - Consistencia de emojis entre catálogos (ADR 014)', () => {
  // Pares (label, emoji, fuente) de todos los catálogos.
  const entradas = [
    ...Object.entries(CATEGORIA_EMOJI)
      .filter(([k]) => !['Deudas', 'Ahorro', 'Alimentación'].includes(k))
      .map(([k, v]) => ({ label: k, emoji: v, fuente: 'Gastos' })),
    ...Object.entries(CATEGORIA_AGENDA_EMOJI)
      .map(([k, v]) => ({ label: k, emoji: v, fuente: 'Agenda' })),
    ...Object.entries(CATEGORIA_INGRESO_EMOJI)
      .map(([k, v]) => ({ label: k, emoji: v, fuente: 'Ingresos' })),
    ...Object.entries(CATEGORIA_DEUDA_EMOJI)
      .map(([k, v]) => ({ label: k, emoji: v, fuente: 'Deudas' })),
    ...PLANTILLAS_APARTADO
      .map(p => ({ label: p.nombre, emoji: p.icono, fuente: 'Apartados' })),
  ];

  // Agrupar por etiqueta.
  const porLabel = {};
  for (const { label, emoji, fuente } of entradas) {
    (porLabel[label] ??= []).push({ emoji, fuente });
  }

  // Solo las etiquetas que aparecen en más de un catálogo.
  const compartidas = Object.entries(porLabel)
    .filter(([, ocurrencias]) => ocurrencias.length > 1);

  it('hay al menos una etiqueta compartida entre catálogos (smoke del propio guardarraíl)', () => {
    expect(compartidas.length).toBeGreaterThan(0);
  });

  it('toda etiqueta compartida usa el mismo emoji en todos los catálogos', () => {
    for (const [label, ocurrencias] of compartidas) {
      const emojisDistintos = [...new Set(ocurrencias.map(o => o.emoji))];
      expect(
        emojisDistintos,
        `"${label}" aparece en [${ocurrencias.map(o => o.fuente).join(', ')}] ` +
        `con emojis distintos: ${emojisDistintos.join(' vs ')}`,
      ).toHaveLength(1);
    }
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
