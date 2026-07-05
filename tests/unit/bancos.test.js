import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bancoAvatar, bancoClaseEmoji } from '../../modules/infra/bancos.js';
import { BANCOS_CO } from '../../modules/core/constants.js';

/**
 * MK.1 (ADR 025): la teja de marca. bancoAvatar() devuelve el glifo oficial
 * del sprite cuando la entrada del catálogo tiene `simbolo`, y las iniciales
 * como fallback cuando no. Es HTML puro (string), sin DOM.
 */

describe('bancoAvatar - teja de marca (ADR 025)', () => {
  it('banco con simbolo renderiza el glifo del sprite, no las iniciales', () => {
    const html = bancoAvatar('Nequi');
    expect(html).toContain('<use href="#b-nequi"/>');
    expect(html).toContain('bank-avatar__glifo');
    expect(html).not.toContain('Nq');
  });

  it('Nubank usa su glifo oficial b-nubank', () => {
    const html = bancoAvatar('Nubank');
    expect(html).toContain('<use href="#b-nubank"/>');
  });

  it('Efectivo reusa el icono estructural i-saldo', () => {
    const html = bancoAvatar('Efectivo');
    expect(html).toContain('<use href="#i-saldo"/>');
  });

  it('banco sin simbolo cae a las iniciales (regla de fidelidad D5)', () => {
    // Davivienda sigue sin glifo propio: ejemplifica el fallback de iniciales.
    const html = bancoAvatar('Davivienda');
    expect(html).toContain('DV');
    expect(html).not.toContain('<use');
  });

  it('la teja lleva los colores corporativos como estilo inline', () => {
    const html = bancoAvatar('Nequi');
    expect(html).toContain('background:#ffffff');
    expect(html).toContain('color:#1f0020');
  });

  it('banco desconocido devuelve la teja generica con "?" y gris', () => {
    const html = bancoAvatar('Banco Inventado');
    expect(html).toContain('?');
    expect(html).toContain('background:#6B7280');
    expect(html).not.toContain('<use');
  });

  it('la teja se marca como decorativa (aria-hidden)', () => {
    expect(bancoAvatar('Nequi')).toContain('aria-hidden="true"');
    expect(bancoAvatar('Bancolombia')).toContain('aria-hidden="true"');
  });
});

describe('BANCOS_CO - integridad del campo simbolo', () => {
  it('todo simbolo declarado apunta a un symbol del sprite (prefijo b- o i-)', () => {
    for (const b of BANCOS_CO) {
      if ('simbolo' in b) {
        expect(typeof b.simbolo, `${b.id}: simbolo debe ser string`).toBe('string');
        expect(b.simbolo, `${b.id}: prefijo b-/i-`).toMatch(/^(b|i)-[a-z0-9-]+$/);
      }
    }
  });

  it('toda entrada conserva iniciales como fallback aunque tenga simbolo', () => {
    for (const b of BANCOS_CO) {
      expect(typeof b.iniciales, `${b.id}: iniciales`).toBe('string');
      expect(b.iniciales.length, `${b.id}: iniciales no vacias`).toBeGreaterThan(0);
    }
  });

  it('color y texto son hex validos en toda entrada', () => {
    for (const b of BANCOS_CO) {
      expect(b.color, `${b.id}: color`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(b.texto, `${b.id}: texto`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('todo simbolo declarado existe como <symbol> en el sprite de index.html', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    for (const b of BANCOS_CO) {
      if ('simbolo' in b) {
        expect(indexHtml, `${b.id}: falta <symbol id="${b.simbolo}"> en el sprite`)
          .toContain(`<symbol id="${b.simbolo}"`);
      }
    }
  });
});

describe('bancoClaseEmoji', () => {
  it('devuelve el emoji de la clase de la entidad', () => {
    expect(bancoClaseEmoji('Efectivo')).toBe('💵');
    expect(bancoClaseEmoji('Bancolombia')).toBe('🏦');
    expect(bancoClaseEmoji('Nequi')).toBe('📱');
  });

  it('entidad desconocida cae al emoji de "otro"', () => {
    expect(bancoClaseEmoji('Banco Inventado')).toBe('🔹');
  });
});
