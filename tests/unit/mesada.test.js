/**
 * mesada.test.js - APR.3e: la mesada y el premio por ahorrar (ADR 093 D2 a
 * D4). El calendario de la mesada, la que falta entregar, lo que el niño
 * guardó todo el mes y el premio que le toca.
 */

import { describe, it, expect } from 'vitest';
import {
  repartoPorDefecto, validarMesada, ultimaMesadaDebida, proximaMesada, mesadaPendiente,
  guardadoTodoElMes, montoPremio, premioPendiente, proximoPremio, mesAnterior, textoFrecuencia,
} from '../../modules/infra/mesada.js';
import { htmlMesada, htmlPremio, htmlProgresoNino, opcionesDia } from '../../modules/dominio/config/familia-view.js';
import { normalizarPerfil } from '../../modules/infra/perfiles.js';

// 2026-10-24 es sábado (6); 2026-10-25, domingo.
const SABADOS = { monto: 20_000, frecuencia: 'semanal', dia: 6, desde: '2026-10-01', entregas: [] };

describe('la mesada (D2, D3)', () => {
  it('el reparto por defecto da la mitad a Ahorrar: $20.000 son $10.000, $8.000 y $2.000', () => {
    expect(repartoPorDefecto(20_000)).toEqual({ ahorrar: 10_000, gastar: 8_000, compartir: 2_000 });
    const r = repartoPorDefecto(15_500);
    expect(r.ahorrar + r.gastar + r.compartir).toBe(15_500);
  });

  it('valida monto, frecuencia, día, que el reparto sume y la cuenta si se anota como gasto', () => {
    const ok = { monto: 20_000, frecuencia: 'semanal', dia: 6, reparto: repartoPorDefecto(20_000), anotarGasto: true, cuentaId: 'c1' };
    expect(validarMesada(ok)).toEqual([]);
    expect(validarMesada({ ...ok, reparto: { ahorrar: 10_000, gastar: 5_000, compartir: 2_000 } })[0]).toContain('tienen que coincidir');
    expect(validarMesada({ ...ok, cuentaId: null })).toContain('Elige de qué cuenta sale la mesada para anotarla en tus gastos.');
    expect(validarMesada({ ...ok, frecuencia: 'mensual', dia: 31 })).toContain('Elige qué día se la das.');
  });

  it('semanal: toca cada sábado; la última debida, la próxima y la pendiente', () => {
    expect(ultimaMesadaDebida(SABADOS, '2026-10-25')).toBe('2026-10-24');
    expect(proximaMesada(SABADOS, '2026-10-25')).toBe('2026-10-31');
    expect(mesadaPendiente(SABADOS, '2026-10-25')).toBe('2026-10-24');
    const entregada = { ...SABADOS, entregas: [{ fecha: '2026-10-24' }] };
    expect(mesadaPendiente(entregada, '2026-10-25')).toBeNull();
  });

  it('quincenal: cada 14 días desde el primer día que toca; mensual: ese día del mes', () => {
    const quincenal = { ...SABADOS, frecuencia: 'quincenal', desde: '2026-10-01' };
    // Primer sábado desde el 1: el 3. Luego 17 y 31.
    expect(ultimaMesadaDebida(quincenal, '2026-10-25')).toBe('2026-10-17');
    expect(proximaMesada(quincenal, '2026-10-25')).toBe('2026-10-31');
    const mensual = { ...SABADOS, frecuencia: 'mensual', dia: 5 };
    expect(proximaMesada(mensual, '2026-10-25')).toBe('2026-11-05');
    expect(textoFrecuencia(mensual)).toBe('cada mes, el día 5');
    expect(textoFrecuencia(SABADOS)).toBe('cada sábado');
  });

  it('antes de que exista no hay mesada debida', () => {
    expect(ultimaMesadaDebida({ ...SABADOS, desde: '2026-10-25' }, '2026-10-25')).toBeNull();
    expect(mesadaPendiente(null, '2026-10-25')).toBeNull();
  });

  it('el formulario cambia los días según la frecuencia', () => {
    expect(opcionesDia('mensual', 5).match(/<option/g)).toHaveLength(28);
    expect(opcionesDia('semanal', 6)).toContain('<option value="6" selected>Sábado</option>');
    const html = htmlMesada({ nombre: 'Sofía', cuentas: [{ id: 'c1', nombre: 'Nequi' }] });
    expect(html).toContain('Familia · paso 2 de 2');
    expect(html).toContain('Sofía puede mover dinero entre frascos');
    expect(html).toContain('Finko no mueve dinero: tú se la entregas y aquí queda anotada.');
    expect(html).toContain('value="10.000"');
  });
});

describe('el premio por ahorrar (D4)', () => {
  const nino = (movimientos, premio = { tasa: '1x10', desde: '2026-09-01', pagados: [] }) =>
    normalizarPerfil({ id: 'n-1', nombre: 'Sofía', edad: 8, movimientos, premio });

  it('cuenta solo lo que se guardó todo el mes: si sacó, cuenta lo que quedó', () => {
    const p = nino([
      { frasco: 'ahorrar', monto: 20_000, fecha: '2026-09-02' },
      { frasco: 'ahorrar', monto: 10_000, fecha: '2026-10-10' },
      { frasco: 'ahorrar', monto: -15_000, fecha: '2026-10-20' },
    ]);
    // Empezó octubre con $20.000; el 10 entró $10.000 y el 20 salieron $15.000: quedó $15.000.
    expect(guardadoTodoElMes(p, '2026-10')).toBe(15_000);
    // Lo que entra en el mes no sube el piso.
    expect(guardadoTodoElMes(nino([{ frasco: 'ahorrar', monto: 10_000, fecha: '2026-10-05' }]), '2026-10')).toBe(0);
  });

  it('tres tasas: $1 por cada $20, $1 por cada $10 y $2 por cada $10', () => {
    expect(montoPremio(27_000, '1x20')).toBe(1_350);
    expect(montoPremio(27_000, '1x10')).toBe(2_700);
    expect(montoPremio(27_000, '2x10')).toBe(5_400);
  });

  it('el premio del mes pasado queda pendiente hasta que el tutor lo suma, una vez', () => {
    const p = nino([{ frasco: 'ahorrar', monto: 27_000, fecha: '2026-09-15' }]);
    expect(mesAnterior('2026-11-01')).toBe('2026-10');
    expect(premioPendiente(p, '2026-11-01')).toEqual({ mes: '2026-10', guardado: 27_000, monto: 2_700 });
    expect(premioPendiente(nino(p.movimientos, { ...p.premio, pagados: ['2026-10'] }), '2026-11-01')).toBeNull();
    // Antes de activarlo no hay premio que deber.
    expect(premioPendiente(nino(p.movimientos, { tasa: '1x10', desde: '2026-11-01', pagados: [] }), '2026-11-01')).toBeNull();
  });

  it('antes de activar, la pantalla dice cuánto y cuándo con el saldo de hoy (R50)', () => {
    const p = nino([{ frasco: 'ahorrar', monto: 27_000, fecha: '2026-10-01' }], null);
    expect(proximoPremio(p, '2026-10-25', '1x10')).toEqual({ fechaISO: '2026-11-01', monto: 2_700, ahorrado: 27_000 });
    const html = htmlPremio(p, '2026-10-25');
    expect(html).toContain('hoy: $2.700');
    expect(html).toContain('le sumas <strong>$2.700</strong>');
    expect(html).toContain('Solo sobre lo que guardó todo el mes.');
    expect(html).toContain('Activar el premio');
  });
});

describe('el progreso del niño para el tutor (D2)', () => {
  it('dice la mesada que toca entregar, su alcancía y lo que hizo esta semana', () => {
    const p = normalizarPerfil({
      id: 'n-1', nombre: 'Sofía', edad: 8, mesada: { ...SABADOS, reparto: repartoPorDefecto(20_000) },
      movimientos: [{ frasco: 'gastar', monto: -3_000, tipo: 'gaste', nota: 'un helado', fecha: '2026-10-23' }],
    });
    const html = htmlProgresoNino(p, '2026-10-25');
    expect(html).toContain('Toca entregar la mesada del sábado, 24 de octubre: $20.000.');
    expect(html).toContain('data-action="familia-entregada"');
    expect(html).toContain('Gastó $3.000 en un helado');
    expect(html).toContain('Entrar como Sofía');
  });
});
