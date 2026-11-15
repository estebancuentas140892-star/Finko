/**
 * teclado-finko.test.js - el teclado de Finko (ADR 142 D3, FORM.2b).
 *
 * - `aplicarTecla`: qué produce cada tecla, con y sin coma.
 * - `montoEnPalabras`: la lectura del monto como se dice en Colombia.
 * - `montarTecladoFinko`: escribe en el mismo campo `data-miles`, despacha
 *   `input`, rehace la lectura y deja elegir el teclado del teléfono.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  aplicarTecla, montoEnPalabras, htmlTecladoFinko, montarTecladoFinko, DIGITOS_MAX,
} from '../../modules/ui/teclado-finko.js';
import { S } from '../../modules/core/state.js';

describe('aplicarTecla()', () => {
  it('un dígito se agrega al final y "000" agrega tres ceros', () => {
    expect(aplicarTecla('', '4')).toBe('4');
    expect(aplicarTecla('4', '5')).toBe('45');
    expect(aplicarTecla('45', '000')).toBe('45000');
  });

  it('un monto no empieza en cero', () => {
    expect(aplicarTecla('', '0')).toBe('');
    expect(aplicarTecla('', '000')).toBe('');
    expect(aplicarTecla('1', '0')).toBe('10');
  });

  it('borrar quita el último carácter; sobre vacío no pasa nada', () => {
    expect(aplicarTecla('45000', 'borrar')).toBe('4500');
    expect(aplicarTecla('', 'borrar')).toBe('');
  });

  it('no pasa del máximo de dígitos, tampoco con "000"', () => {
    const lleno = '9'.repeat(DIGITOS_MAX);
    expect(aplicarTecla(lleno, '1')).toBe(lleno);
    expect(aplicarTecla('9'.repeat(DIGITOS_MAX - 2), '000')).toBe('9'.repeat(DIGITOS_MAX - 2));
  });

  it('sin decimales la coma no escribe; una tecla desconocida tampoco', () => {
    expect(aplicarTecla('28', ',')).toBe('28');
    expect(aplicarTecla('28', 'x')).toBe('28');
  });

  it('con decimales (tasas): una sola coma, "0," al empezar y hasta los decimales pedidos', () => {
    const op = { decimales: 2 };
    expect(aplicarTecla('28', ',', op)).toBe('28,');
    expect(aplicarTecla('28,', ',', op)).toBe('28,');
    expect(aplicarTecla('', ',', op)).toBe('0,');
    expect(aplicarTecla('28,', '5', op)).toBe('28,5');
    expect(aplicarTecla('28,5', '0', op)).toBe('28,50');
    expect(aplicarTecla('28,50', '1', op)).toBe('28,50');
    expect(aplicarTecla('28,5', '000', op)).toBe('28,50');
  });
});

describe('montoEnPalabras()', () => {
  it.each([
    [1, 'Un peso'],
    [21, 'Veintiún pesos'],
    [100, 'Cien pesos'],
    [45_000, 'Cuarenta y cinco mil pesos'],
    [21_000, 'Veintiún mil pesos'],
    [101_000, 'Ciento un mil pesos'],
    [350_000, 'Trescientos cincuenta mil pesos'],
    [1_000_000, 'Un millón de pesos'],
    [1_500_000, 'Un millón quinientos mil pesos'],
    [2_000_000, 'Dos millones de pesos'],
    [3_200_000, 'Tres millones doscientos mil pesos'],
    [21_000_000, 'Veintiún millones de pesos'],
    [1_000_000_000, 'Mil millones de pesos'],
    [999_999, 'Novecientos noventa y nueve mil novecientos noventa y nueve pesos'],
  ])('%i: %s', (n, texto) => {
    expect(montoEnPalabras(n)).toBe(texto);
  });

  it('cero, negativo o algo que no es número: nada', () => {
    expect(montoEnPalabras(0)).toBe('');
    expect(montoEnPalabras(-5)).toBe('');
    expect(montoEnPalabras('abc')).toBe('');
  });
});

describe('montarTecladoFinko()', () => {
  const matchMediaReal = window.matchMedia;
  let raiz;
  let campo;
  let lectura;

  beforeEach(() => {
    window.matchMedia = () => ({ matches: true, addEventListener() {} }); // teléfono
    S.config.tecladoTelefono = undefined;
    document.body.innerHTML = `<form>
      <input name="monto" data-miles />
      <p id="lee" aria-live="polite"></p>
      <div id="raiz">${htmlTecladoFinko()}</div>
    </form>`;
    raiz = document.getElementById('raiz');
    campo = document.querySelector('[name="monto"]');
    lectura = document.getElementById('lee');
  });
  afterEach(() => {
    window.matchMedia = matchMediaReal;
    delete S.config.tecladoTelefono;
  });

  const tocar = (t) => raiz.querySelector(`[data-tecla="${t}"]`).click();

  it('tiene 12 teclas y cada una tiene nombre', () => {
    const teclas = [...raiz.querySelectorAll('.kp__k')];
    expect(teclas).toHaveLength(12);
    for (const t of teclas) expect(t.textContent.trim() || t.getAttribute('aria-label')).toBeTruthy();
  });

  it('en el teléfono el campo no abre el teclado del sistema', () => {
    montarTecladoFinko(raiz, campo, lectura);
    expect(campo.inputMode).toBe('none');
  });

  it('las teclas escriben en el mismo campo con separador de miles y despachan input', () => {
    montarTecladoFinko(raiz, campo, lectura);
    let eventos = 0;
    campo.addEventListener('input', () => { eventos++; });
    tocar('4'); tocar('5'); tocar('000');
    expect(campo.value).toBe('45.000');
    expect(eventos).toBe(3);
    expect(lectura.textContent).toBe('Cuarenta y cinco mil pesos');
    tocar('borrar');
    expect(campo.value).toBe('4.500');
    tocar('borrar'); tocar('borrar'); tocar('borrar'); tocar('borrar');
    expect(campo.value).toBe('');
    expect(lectura.textContent).toBe('');
  });

  it('lo que llega por otro lado (pegar, un teclado físico) también se lee', () => {
    montarTecladoFinko(raiz, campo, lectura);
    campo.value = '1.500.000';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    expect(lectura.textContent).toBe('Un millón quinientos mil pesos');
  });

  it('"Usar el teclado del teléfono" lo recuerda y deja el campo numérico', () => {
    montarTecladoFinko(raiz, campo, lectura);
    raiz.querySelector('[data-kp-sistema]').click();
    expect(S.config.tecladoTelefono).toBe(true);
    expect(campo.inputMode).toBe('numeric');
    expect(raiz.classList.contains('kp-oculto')).toBe(true);
  });

  it('en escritorio el campo es el de siempre', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    montarTecladoFinko(raiz, campo, lectura);
    expect(campo.inputMode).toBe('numeric');
    expect(raiz.classList.contains('kp-oculto')).toBe(true);
  });
});
