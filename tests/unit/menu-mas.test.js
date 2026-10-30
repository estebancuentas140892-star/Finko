/**
 * menu-mas.test.js - la hoja "Más" dice cómo está cada destino (ADR 108).
 *
 * Cubre:
 * - estadosMas(): una línea por destino con la cifra que su sección ya
 *   calcula, sin línea cuando no hay datos y con la máscara del ojo (R20).
 * - sincronizarEstadosMas(): escribe la línea, la oculta sin datos y arma el
 *   nombre accesible de la fila.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { estadosMas, sincronizarEstadosMas } from '../../modules/ui/menu-mas.js';

const HOY = '2026-10-15';

const vacio = () => ({
  config: {}, cuentas: [], gastos: [], compromisos: [], personales: [], ingresosPuntuales: [],
  transferencias: [], ahorro: { aportes: [] }, metas: [], apartados: [], inversiones: [],
});

describe('estadosMas()', () => {
  it('sin datos no hay ninguna línea', () => {
    expect(estadosMas(vacio(), HOY)).toEqual({
      agenda: null, movimientos: null, analisis: null, tesoreria: null, personales: null,
    });
  });

  it('Mis cuentas: el total y cuántas cuentas activas', () => {
    const s = { ...vacio(), cuentas: [
      { id: 'c1', nombre: 'Nequi', saldo: 1_000_000, activa: true },
      { id: 'c2', nombre: 'Bancolombia', saldo: 500_000, activa: true },
      { id: 'c3', nombre: 'Vieja', saldo: 9_000, activa: false },
    ] };
    expect(estadosMas(s, HOY).tesoreria).toEqual({
      texto: '$1.500.000 en 2', largo: 'tienes $1.500.000 en 2 cuentas',
    });
  });

  it('el ojo enmascara los montos de Mis cuentas y Me deben (R20)', () => {
    const s = { ...vacio(), config: { ocultarSaldo: true },
      cuentas: [{ id: 'c1', nombre: 'Nequi', saldo: 1_000_000, activa: true }],
      personales: [{ id: 'p1', persona: 'Ana', monto: 300_000, pagado: 100_000, fecha: '2026-09-01', liquidado: false }] };
    const e = estadosMas(s, HOY);
    expect(e.tesoreria.texto).not.toContain('1.000.000');
    expect(e.personales.texto).not.toContain('200.000');
  });

  it('Me deben: lo que falta cobrar', () => {
    const s = { ...vacio(), personales: [{ id: 'p1', persona: 'Ana', monto: 300_000, pagado: 100_000, fecha: '2026-09-01', liquidado: false }] };
    expect(estadosMas(s, HOY).personales).toEqual({ texto: '$200.000 por cobrar' });
  });

  it('Calendario: los pagos de hoy a 7 días', () => {
    const s = { ...vacio(), compromisos: [
      { id: 'k1', descripcion: 'Arriendo', tipo: 'fijo', monto: 900_000, diaPago: 18, activo: true },
      { id: 'k2', descripcion: 'Gimnasio', tipo: 'fijo', monto: 90_000, diaPago: 20, activo: true },
      { id: 'k3', descripcion: 'Seguro', tipo: 'fijo', monto: 50_000, diaPago: 28, activo: true },
    ] };
    expect(estadosMas(s, HOY).agenda).toEqual({ texto: '2 pagos esta semana' });
  });

  it('Movimientos: el último, con su día', () => {
    const s = { ...vacio(), gastos: [
      { id: 'g1', monto: 20_000, categoria: 'Café', descripcion: 'Café', fecha: '2026-10-14' },
      { id: 'g2', monto: 80_000, categoria: 'Mercado', descripcion: 'Mercado', fecha: '2026-10-02' },
    ] };
    expect(estadosMas(s, HOY).movimientos.texto).toMatch(/^Ayer: /);
  });

  it('Análisis: la salud de 100, en ámbar solo si la banda es crítica', () => {
    const s = { ...vacio(), gastos: [{ id: 'g1', monto: 20_000, categoria: 'Café', fecha: '2026-10-14' }] };
    const { analisis } = estadosMas(s, HOY);
    expect(analisis.texto).toMatch(/^Salud \d+ de 100$/);
    expect(typeof analisis.aviso).toBe('boolean');
  });
});

describe('sincronizarEstadosMas()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal-mas">
        <a class="mas-tile" href="#tesoreria" data-section="tesoreria">
          <span class="mas-tile__label">Mis cuentas</span>
          <span class="mas-tile__estado" hidden></span>
        </a>
        <a class="mas-tile" href="#personales" data-section="personales">
          <span class="mas-tile__label">Me deben</span>
          <span class="mas-tile__estado" hidden></span>
        </a>
        <a class="mas-tile" href="#config" data-section="config">
          <span class="mas-tile__label">Ajustes</span>
        </a>
      </div>`;
  });

  const linea = s => document.querySelector(`[data-section="${s}"] .mas-tile__estado`);
  const fila = s => document.querySelector(`[data-section="${s}"]`);

  it('escribe la línea y el nombre accesible completo', () => {
    sincronizarEstadosMas({ tesoreria: { texto: '$1.500.000 en 2', largo: 'tienes $1.500.000 en 2 cuentas' }, personales: null });
    expect(linea('tesoreria').textContent).toBe('$1.500.000 en 2');
    expect(linea('tesoreria').hidden).toBe(false);
    expect(fila('tesoreria').getAttribute('aria-label')).toBe('Mis cuentas, tienes $1.500.000 en 2 cuentas');
  });

  it('sin datos la línea se oculta y la fila se nombra sola', () => {
    sincronizarEstadosMas({ tesoreria: null, personales: null });
    expect(linea('personales').hidden).toBe(true);
    expect(fila('personales').hasAttribute('aria-label')).toBe(false);
  });

  it('una línea que pide atención va en ámbar', () => {
    document.getElementById('modal-mas').insertAdjacentHTML('beforeend', `
      <a class="mas-tile" href="#analisis" data-section="analisis">
        <span class="mas-tile__label">Análisis</span><span class="mas-tile__estado" hidden></span>
      </a>`);
    sincronizarEstadosMas({ analisis: { texto: 'Salud 37 de 100', aviso: true } });
    expect(linea('analisis').classList.contains('mas-tile__estado--aviso')).toBe(true);
  });
});
