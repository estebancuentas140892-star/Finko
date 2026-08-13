import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { crearBloqueo, limpiarFallos, FALLOS_ANTES_DE_FRENO } from '../../modules/dominio/config/bloqueo.js';
import { confirmarPin } from '../../modules/ui/bloqueo-acceso.js';

// ── RE-AUTENTICACIÓN EN ACCIONES CRÍTICAS (CFG.5b, ADR 063) ──────
//
// `confirmarPin()` envuelve borrar todo, exportar el respaldo completo y
// restablecer la app: sin candado no pide nada (regla de la tarjeta, "el
// guard no puede convertirse en un muro para quien nunca activó el candado")
// y con candado exige el mismo `verificarPin()` + freno que ya usa el gate
// de arranque (`initBloqueoAcceso`).

/** Espera un tick para que la verificación async del PIN (crypto.subtle) resuelva. */
const _tick = () => new Promise(r => setTimeout(r, 0));

describe('confirmarPin() (CFG.5b, ADR 063)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '';
    limpiarFallos();
  });

  it('sin candado activo, resuelve true de inmediato y no muestra nada', async () => {
    S.config.bloqueo = null;
    expect(await confirmarPin()).toBe(true);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('con candado activo, muestra el modal con el campo de PIN', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin();
    expect(document.getElementById('confirm-pin-input')).not.toBeNull();
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
  });

  it('cancelar resuelve false y quita el modal del DOM', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin();
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('el PIN correcto resuelve true y cierra el modal', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin();
    document.getElementById('confirm-pin-input').value = '1234';
    document.querySelector('[data-role="confirmar"]').click();
    expect(await promesa).toBe(true);
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });

  it('el PIN incorrecto no resuelve, muestra el error y deja el modal abierto', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin();
    document.getElementById('confirm-pin-input').value = '0000';
    document.querySelector('[data-role="confirmar"]').click();
    await _tick();

    expect(document.getElementById('confirm-pin-error').textContent).toContain('PIN incorrecto');
    expect(document.querySelector('.modal-overlay')).not.toBeNull();

    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
  });

  it('activa el mismo freno del gate tras 5 intentos fallidos', async () => {
    S.config.bloqueo = await crearBloqueo('1234');

    for (let i = 0; i < FALLOS_ANTES_DE_FRENO; i++) {
      const intento = confirmarPin();
      document.getElementById('confirm-pin-input').value = '0000';
      document.querySelector('[data-role="confirmar"]').click();
      await _tick();
      document.querySelector('[data-role="cancelar"]').click();
      await intento;
    }

    const promesa = confirmarPin();
    document.getElementById('confirm-pin-input').value = '1234';
    document.querySelector('[data-role="confirmar"]').click();
    await _tick();

    expect(document.getElementById('confirm-pin-error').textContent).toContain('Demasiados intentos');
    document.querySelector('[data-role="cancelar"]').click();
    expect(await promesa).toBe(false);
  });

  it('usa título y mensaje por defecto sin opciones', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin();
    expect(document.getElementById('confirm-pin-title').textContent).toBe('Confirma tu PIN');
    document.querySelector('[data-role="cancelar"]').click();
    await promesa;
  });

  it('acepta título y mensaje personalizados', async () => {
    S.config.bloqueo = await crearBloqueo('1234');
    const promesa = confirmarPin({ titulo: 'Exportar respaldo', mensaje: 'Escribe tu PIN para exportar.' });
    expect(document.getElementById('confirm-pin-title').textContent).toBe('Exportar respaldo');
    expect(document.querySelector('.confirm__mensaje').textContent).toBe('Escribe tu PIN para exportar.');
    document.querySelector('[data-role="cancelar"]').click();
    await promesa;
  });
});
