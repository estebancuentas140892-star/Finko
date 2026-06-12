import { describe, it, expect } from 'vitest';
import { icon, emptyArt } from '../../modules/infra/icons.js';

// ── icon() ───────────────────────────────────────────────────────

describe('icon()', () => {
  it('referencia el symbol del sprite por id', () => {
    expect(icon('metas')).toContain('href="#i-metas"');
  });

  it('clase por defecto "icon" y custom con el segundo argumento', () => {
    expect(icon('alert')).toContain('class="icon"');
    expect(icon('alert', 'icon icon--lg')).toContain('class="icon icon--lg"');
  });

  it('es decorativo: aria-hidden siempre presente', () => {
    expect(icon('saldo')).toContain('aria-hidden="true"');
  });
});

// ── emptyArt() ───────────────────────────────────────────────────

describe('emptyArt()', () => {
  it('compone la ilustración con fondo, órbita, puntos e icono central', () => {
    const out = emptyArt('metas');
    expect(out).toContain('class="empty-art"');
    expect(out).toContain('empty-art__bg');
    expect(out).toContain('empty-art__orbit');
    expect(out).toContain('empty-art__dot');
    expect(out).toContain('empty-art__icon');
    expect(out).toContain('href="#i-metas"');
  });

  it('es decorativa: aria-hidden y sin texto', () => {
    const out = emptyArt('ahorro');
    expect(out).toContain('aria-hidden="true"');
    expect(out).not.toContain('<text');
  });

  it('no fija colores inline: el color vive en CSS', () => {
    const out = emptyArt('gastos');
    expect(out).not.toContain('fill="#');
    expect(out).not.toContain('stroke="#');
    expect(out).not.toContain('style=');
  });
});
