import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { VERSION_LEGAL } from '../../modules/dominio/config/legal.js';
import { faltaAceptarLegal, registrarAceptacion, registrarAvisoNino } from '../../modules/ui/aceptacion-legal.js';

beforeEach(() => {
  Object.assign(S, createInitialState());
});

describe('faltaAceptarLegal()', () => {
  it('false para un usuario nuevo (S.onboarded === false): lo resuelve el paso 2 del onboarding, no el gate', () => {
    S.onboarded = false;
    S.config.legalAceptado = null;
    expect(faltaAceptarLegal()).toBe(false);
  });

  it('true para un usuario onboarded sin aceptación registrada', () => {
    S.onboarded = true;
    S.config.legalAceptado = null;
    expect(faltaAceptarLegal()).toBe(true);
  });

  it('true para un usuario onboarded con una versión aceptada distinta a la vigente', () => {
    S.onboarded = true;
    S.config.legalAceptado = { version: 'Borrador v0.1 vieja', fecha: '2026-01-01' };
    expect(faltaAceptarLegal()).toBe(true);
  });

  it('false para un usuario onboarded ya al día con VERSION_LEGAL', () => {
    S.onboarded = true;
    S.config.legalAceptado = { version: VERSION_LEGAL, fecha: '2026-08-01' };
    expect(faltaAceptarLegal()).toBe(false);
  });
});

describe('registrarAceptacion()', () => {
  it('escribe la versión vigente y una fecha ISO en S.config.legalAceptado', () => {
    registrarAceptacion();
    expect(S.config.legalAceptado.version).toBe(VERSION_LEGAL);
    expect(S.config.legalAceptado.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('crea S.config si vino ausente', () => {
    S.config = undefined;
    registrarAceptacion();
    expect(S.config.legalAceptado.version).toBe(VERSION_LEGAL);
  });
});

// APR.6a (ADR 100 D3): el niño no acepta un contrato, deja dicho que un
// adulto de su familia sabe. El gate solo mira la versión: no le salta.
describe('registrarAvisoNino()', () => {
  it('escribe la versión vigente marcada como aviso del niño', () => {
    registrarAvisoNino();
    expect(S.config.legalAceptado.version).toBe(VERSION_LEGAL);
    expect(S.config.legalAceptado.via).toBe('nino');
  });

  it('con el aviso del niño, el gate de la versión no vuelve a pedir nada', () => {
    S.onboarded = true;
    registrarAvisoNino();
    expect(faltaAceptarLegal()).toBe(false);
  });

  it('la aceptación del adulto no lleva marca de niño', () => {
    registrarAceptacion();
    expect(S.config.legalAceptado.via).toBeUndefined();
  });
});
