/**
 * cripto-respaldo.test.js - cifrado del archivo de respaldo (CFG.4c, ADR 043 D2.3).
 *
 * Usa `crypto.subtle` real (el que trae Node), igual que `bloqueo.test.js`: el
 * valor de estos tests está justamente en que el ciclo cifrar/descifrar cierre
 * de verdad, no contra un doble que siempre dice que sí.
 *
 * Las iteraciones reales de PBKDF2 (600.000) cuestan cientos de milisegundos
 * por llamada. Los tests que solo miran el sobre o los errores de formato no
 * cifran nada; los que sí cierran el ciclo son pocos y a propósito.
 */

import { describe, it, expect } from 'vitest';
import {
  cifrarRespaldo,
  descifrarRespaldo,
  esRespaldoCifrado,
  validarContrasena,
  cifradoDisponible,
  FORMATO_CIFRADO,
  VERSION_CIFRADO,
  ITERACIONES_PBKDF2,
  LARGO_MIN_CONTRASENA,
} from '../../modules/infra/cripto-respaldo.js';

const JSON_RESPALDO = JSON.stringify({ _version: 43, gastos: [{ id: 'g1', monto: 50_000 }] });
const CLAVE = 'contrasena-larga';

describe('validarContrasena()', () => {
  it('acepta una contraseña del largo mínimo', () => {
    expect(validarContrasena('a'.repeat(LARGO_MIN_CONTRASENA))).toBeNull();
  });

  it('rechaza el campo vacío', () => {
    expect(validarContrasena('')).toBe('Escribe una contraseña.');
    expect(validarContrasena(null)).toBe('Escribe una contraseña.');
    expect(validarContrasena(undefined)).toBe('Escribe una contraseña.');
  });

  it('rechaza una contraseña más corta que el mínimo', () => {
    const error = validarContrasena('a'.repeat(LARGO_MIN_CONTRASENA - 1));
    expect(error).toContain(String(LARGO_MIN_CONTRASENA));
  });

  it('no exige composición: una contraseña larga de solo letras pasa', () => {
    expect(validarContrasena('todasletras')).toBeNull();
  });
});

describe('cifradoDisponible()', () => {
  it('true en el entorno de test, que sí trae crypto.subtle', () => {
    expect(cifradoDisponible()).toBe(true);
  });
});

describe('esRespaldoCifrado()', () => {
  it('false para un respaldo en claro', () => {
    expect(esRespaldoCifrado(JSON_RESPALDO)).toBe(false);
  });

  it('false para texto que no es JSON, sin lanzar', () => {
    expect(esRespaldoCifrado('no soy json')).toBe(false);
    expect(esRespaldoCifrado('')).toBe(false);
    expect(esRespaldoCifrado(null)).toBe(false);
    expect(esRespaldoCifrado(undefined)).toBe(false);
  });

  it('false para un JSON que trae el formato pero no los datos', () => {
    expect(esRespaldoCifrado(JSON.stringify({ formato: FORMATO_CIFRADO }))).toBe(false);
  });

  it('false para un JSON con datos pero sin la marca de formato', () => {
    expect(esRespaldoCifrado(JSON.stringify({ datos: 'abc' }))).toBe(false);
  });
});

describe('cifrarRespaldo()', () => {
  it('produce un sobre JSON con la marca, la versión y los parámetros de derivación', async () => {
    const sobre = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));

    expect(sobre.formato).toBe(FORMATO_CIFRADO);
    expect(sobre.version).toBe(VERSION_CIFRADO);
    expect(sobre.kdf.nombre).toBe('PBKDF2');
    expect(sobre.kdf.hash).toBe('SHA-256');
    expect(sobre.kdf.iteraciones).toBe(ITERACIONES_PBKDF2);
    expect(typeof sobre.kdf.salt).toBe('string');
    expect(sobre.cifrado.nombre).toBe('AES-GCM');
    expect(typeof sobre.cifrado.iv).toBe('string');
    expect(typeof sobre.datos).toBe('string');
  });

  it('el sobre no deja ver el contenido en claro ni la contraseña', async () => {
    const sobre = await cifrarRespaldo(JSON_RESPALDO, CLAVE);
    expect(sobre).not.toContain('gastos');
    expect(sobre).not.toContain('50000');
    expect(sobre).not.toContain(CLAVE);
  });

  it('el resultado lo reconoce esRespaldoCifrado()', async () => {
    expect(esRespaldoCifrado(await cifrarRespaldo(JSON_RESPALDO, CLAVE))).toBe(true);
  });

  it('dos respaldos de lo mismo con la misma clave no son iguales: salt e IV son nuevos', async () => {
    const uno = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));
    const dos = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));

    expect(uno.kdf.salt).not.toBe(dos.kdf.salt);
    expect(uno.cifrado.iv).not.toBe(dos.cifrado.iv);
    expect(uno.datos).not.toBe(dos.datos);
  });
});

describe('descifrarRespaldo()', () => {
  it('cierra el ciclo: lo cifrado con una contraseña se abre con esa contraseña', async () => {
    const sobre = await cifrarRespaldo(JSON_RESPALDO, CLAVE);
    const r     = await descifrarRespaldo(sobre, CLAVE);

    expect(r.ok).toBe(true);
    expect(r.json).toBe(JSON_RESPALDO);
  });

  it('conserva acentos y eñes: el respaldo real trae descripciones en español', async () => {
    const conAcentos = JSON.stringify({ gastos: [{ descripcion: 'Peluquería del niño, año 2026' }] });
    const sobre      = await cifrarRespaldo(conAcentos, CLAVE);
    const r          = await descifrarRespaldo(sobre, CLAVE);

    expect(r.ok).toBe(true);
    expect(r.json).toBe(conAcentos);
  });

  it('con la contraseña equivocada reporta contrasena-incorrecta, no basura', async () => {
    const sobre = await cifrarRespaldo(JSON_RESPALDO, CLAVE);
    const r     = await descifrarRespaldo(sobre, 'otra-contrasena');

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('contrasena-incorrecta');
  });

  it('un sobre alterado no se abre: AES-GCM autentica el contenido', async () => {
    const sobre = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));
    const bytes = globalThis.atob(sobre.datos).split('');
    bytes[0] = bytes[0] === 'A' ? 'B' : 'A';
    sobre.datos = globalThis.btoa(bytes.join(''));

    const r = await descifrarRespaldo(JSON.stringify(sobre), CLAVE);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('contrasena-incorrecta');
  });

  it('distingue el archivo que no es un sobre del que tiene la clave equivocada', async () => {
    await expect(descifrarRespaldo('no soy json', CLAVE))
      .resolves.toEqual({ ok: false, motivo: 'archivo-invalido' });
    await expect(descifrarRespaldo(JSON_RESPALDO, CLAVE))
      .resolves.toEqual({ ok: false, motivo: 'archivo-invalido' });
  });

  it('un sobre con iteraciones inválidas es archivo-invalido, no un intento de derivar', async () => {
    const sobre = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));
    sobre.kdf.iteraciones = 0;
    await expect(descifrarRespaldo(JSON.stringify(sobre), CLAVE))
      .resolves.toEqual({ ok: false, motivo: 'archivo-invalido' });
  });

  it('respeta las iteraciones que trae el archivo, no las de la constante actual', async () => {
    // Un respaldo viejo cifrado con otros parámetros se tiene que poder abrir:
    // es lo que hace que subir ITERACIONES_PBKDF2 mañana no rompa los archivos
    // guardados hoy. Se simula al revés (bajando el número del sobre) para no
    // pagar dos derivaciones de 600.000 iteraciones en un test.
    const sobre = JSON.parse(await cifrarRespaldo(JSON_RESPALDO, CLAVE));
    sobre.kdf.iteraciones = ITERACIONES_PBKDF2 - 1;

    const r = await descifrarRespaldo(JSON.stringify(sobre), CLAVE);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('contrasena-incorrecta');
  });
});
