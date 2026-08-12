import { describe, it, expect, beforeEach } from 'vitest';
import {
  PIN_LARGO_MIN, PIN_LARGO_MAX, FALLOS_ANTES_DE_FRENO, FRENO_MS,
  cryptoDisponible, candadoActivo, validarPin, generarSalt, hashearPin,
  crearBloqueo, verificarPin, registrarFallo, msDeFreno, fallosAcumulados,
  limpiarFallos,
} from '../../modules/dominio/config/bloqueo.js';

// ── FORMATO DEL PIN ──────────────────────────────────────────────

describe('validarPin() (CFG.5a)', () => {
  it('acepta un PIN de largo mínimo y de largo máximo', () => {
    expect(validarPin('1'.repeat(PIN_LARGO_MIN))).toBeNull();
    expect(validarPin('1'.repeat(PIN_LARGO_MAX))).toBeNull();
  });

  it('rechaza el campo vacío', () => {
    expect(validarPin('')).toBe('Escribe un PIN.');
    expect(validarPin(null)).toBe('Escribe un PIN.');
    expect(validarPin(undefined)).toBe('Escribe un PIN.');
  });

  it('rechaza cualquier caracter que no sea número', () => {
    expect(validarPin('12a4')).toContain('numeros');
    expect(validarPin('12 4')).toContain('numeros');
    expect(validarPin('-123')).toContain('numeros');
  });

  it('rechaza los largos fuera de rango', () => {
    expect(validarPin('1'.repeat(PIN_LARGO_MIN - 1))).toContain('entre');
    expect(validarPin('1'.repeat(PIN_LARGO_MAX + 1))).toContain('entre');
  });
});

// ── HASH Y VERIFICACIÓN ──────────────────────────────────────────

describe('hash del PIN (CFG.5a, ADR 063)', () => {
  it('el entorno de test tiene crypto disponible', () => {
    expect(cryptoDisponible()).toBe(true);
  });

  it('generarSalt() devuelve 16 bytes en hexadecimal', () => {
    const salt = generarSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it('dos salts consecutivos no coinciden', () => {
    expect(generarSalt()).not.toBe(generarSalt());
  });

  it('el mismo PIN con el mismo salt da el mismo hash', async () => {
    const salt = generarSalt();
    expect(await hashearPin('1234', salt)).toBe(await hashearPin('1234', salt));
  });

  it('el mismo PIN con salt distinto da hash distinto', async () => {
    expect(await hashearPin('1234', generarSalt()))
      .not.toBe(await hashearPin('1234', generarSalt()));
  });

  it('crearBloqueo() no guarda el PIN en claro en ninguna parte', async () => {
    const bloqueo = await crearBloqueo('4321');
    expect(JSON.stringify(bloqueo)).not.toContain('4321');
    expect(bloqueo.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(bloqueo.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(bloqueo.creado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('verificarPin() acepta el PIN correcto y rechaza el resto', async () => {
    const bloqueo = await crearBloqueo('1234');
    expect(await verificarPin('1234', bloqueo)).toBe(true);
    expect(await verificarPin('1235', bloqueo)).toBe(false);
    expect(await verificarPin('', bloqueo)).toBe(false);
  });

  it('verificarPin() sin candado guardado siempre es false', async () => {
    expect(await verificarPin('1234', null)).toBe(false);
    expect(await verificarPin('1234', {})).toBe(false);
    expect(await verificarPin('1234', { hash: '', salt: '' })).toBe(false);
  });
});

describe('candadoActivo() (CFG.5a)', () => {
  it('reconoce un candado completo', async () => {
    expect(candadoActivo(await crearBloqueo('1234'))).toBe(true);
  });

  it('el default (null) no es candado activo', () => {
    expect(candadoActivo(null)).toBe(false);
    expect(candadoActivo(undefined)).toBe(false);
  });

  it('un dato incompleto o de otra forma no cuenta como candado', () => {
    expect(candadoActivo({ hash: 'abc' })).toBe(false);
    expect(candadoActivo({ salt: 'abc' })).toBe(false);
    expect(candadoActivo({ hash: '', salt: 'abc' })).toBe(false);
    expect(candadoActivo('1234')).toBe(false);
    expect(candadoActivo(0)).toBe(false);
  });
});

// ── FRENO A LA FUERZA BRUTA ──────────────────────────────────────

describe('freno de intentos (CFG.5a, ADR 063 punto 6)', () => {
  beforeEach(() => { limpiarFallos(); });

  it('los primeros fallos no frenan nada', () => {
    for (let i = 1; i < FALLOS_ANTES_DE_FRENO; i++) {
      expect(registrarFallo(1_000)).toBe(0);
    }
    expect(fallosAcumulados()).toBe(FALLOS_ANTES_DE_FRENO - 1);
  });

  it('el fallo número 5 activa el freno base', () => {
    let freno = 0;
    for (let i = 0; i < FALLOS_ANTES_DE_FRENO; i++) freno = registrarFallo(1_000);
    expect(freno).toBe(FRENO_MS);
  });

  it('la segunda tanda de fallos escala el freno al doble', () => {
    let freno = 0;
    for (let i = 0; i < FALLOS_ANTES_DE_FRENO * 2; i++) freno = registrarFallo(1_000);
    expect(freno).toBe(FRENO_MS * 2);
  });

  it('el freno se agota con el paso del tiempo', () => {
    for (let i = 0; i < FALLOS_ANTES_DE_FRENO; i++) registrarFallo(1_000);
    expect(msDeFreno(1_000)).toBe(FRENO_MS);
    expect(msDeFreno(1_000 + FRENO_MS)).toBe(0);
    expect(msDeFreno(1_000 + FRENO_MS * 5)).toBe(0);
  });

  it('limpiarFallos() borra contador y freno tras un desbloqueo correcto', () => {
    for (let i = 0; i < FALLOS_ANTES_DE_FRENO; i++) registrarFallo(1_000);
    limpiarFallos();
    expect(fallosAcumulados()).toBe(0);
    expect(msDeFreno(1_000)).toBe(0);
  });
});

describe('el freno sobrevive a un recargue de la pestaña (CFG.5a)', () => {
  beforeEach(() => { limpiarFallos(); });

  it('registrarFallo() deja el freno en sessionStorage', () => {
    for (let i = 0; i < FALLOS_ANTES_DE_FRENO; i++) registrarFallo(1_000);
    const guardado = JSON.parse(globalThis.sessionStorage.getItem('fk_bloqueo_freno'));
    expect(guardado.fallos).toBe(FALLOS_ANTES_DE_FRENO);
    expect(guardado.hasta).toBe(1_000 + FRENO_MS);
  });

  it('limpiarFallos() borra la marca en vez de dejar basura', () => {
    registrarFallo(1_000);
    limpiarFallos();
    expect(globalThis.sessionStorage.getItem('fk_bloqueo_freno')).toBeNull();
  });
});
