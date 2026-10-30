/**
 * distribuir-movil.test.js - Distribuir sin salir de donde estás (ADR 110).
 *
 * Cubre:
 * - motivoSinDistribuir() (D3): por qué "Distribuir" no avanza, en el orden en
 *   que el usuario lo resuelve.
 * - La vista (D2, D3): la pregunta de lo que queda abre el último paso, y el
 *   resumen y los botones forman un solo pie después del déficit.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { motivoSinDistribuir } from '../../modules/dominio/tesoreria/logic/distribucion.js';
import { renderAsistenteDistribucion } from '../../modules/dominio/tesoreria/view.js';

describe('motivoSinDistribuir() (ADR 110 D3)', () => {
  const listo = {
    monto: 3_000_000, asignado: 600_000, transferido: 0, sinAsignar: 2_400_000,
    recibido: { resuelto: true }, excedeTransferencia: false, faltaDecidirRemanente: false,
  };

  it('sin nada pendiente no dice nada', () => {
    expect(motivoSinDistribuir(listo)).toBe('');
  });

  it('lo que queda sin decidir se nombra con su monto', () => {
    expect(motivoSinDistribuir({ ...listo, faltaDecidirRemanente: true }))
      .toBe('Elige arriba qué hacer con los $2.400.000 que quedan.');
  });

  it('va en el orden en que se resuelve: monto, ingresos, cuentas, marcas y lo que queda', () => {
    const todo = {
      ...listo, monto: 0, asignado: 0, recibido: { resuelto: false },
      excedeTransferencia: true, faltaDecidirRemanente: true,
    };
    expect(motivoSinDistribuir(todo)).toBe('Escribe cuánto vas a distribuir.');
    expect(motivoSinDistribuir({ ...todo, monto: 1 })).toBe('Revisa qué ingresos te llegaron.');
    expect(motivoSinDistribuir({ ...todo, monto: 1, recibido: { resuelto: true } }))
      .toBe('Lo que mueves a otras cuentas pasa de lo que queda para tu estilo de vida.');
    expect(motivoSinDistribuir({ ...todo, monto: 1, recibido: { resuelto: true }, excedeTransferencia: false }))
      .toBe('Marca al menos un pago o un aporte.');
  });

  it('una transferencia sola ya es algo marcado', () => {
    expect(motivoSinDistribuir({ ...listo, asignado: 0, transferido: 100_000 })).toBe('');
  });
});

describe('el asistente: la pregunta primero y un solo pie (ADR 110 D2, D3)', () => {
  const body = () => document.getElementById('modal-distribuir-body');

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-distribuir-body"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [];
    S.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
    S.apartados = []; S.inversiones = []; S.gastos = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: true, completado: false, metaMeses: 3, montoActual: 0 }, aportes: [] };
    S.config = { ...S.config, presetDistribucion: '50-30-20', ultimaDistribucionPeriodo: null };
  });

  it('en el último paso, "¿Qué haces con lo que queda?" va antes que todo lo demás', () => {
    renderAsistenteDistribucion();
    const pasos = [...body().querySelectorAll('[data-dist-paso]')];
    const ultimo = pasos.at(-1);
    expect(ultimo.dataset.distPasoTitulo).toBe('Estilo de vida');
    expect(ultimo.firstElementChild.id).toBe('distribuir-remanente');
  });

  it('el resumen y los botones forman el pie, después del déficit', () => {
    renderAsistenteDistribucion();
    const pie = body().querySelector('#distribuir-ingreso-panel > .distribuir__pie');
    expect(pie).not.toBeNull();
    expect(pie.querySelector('#distribuir-resumen')).not.toBeNull();
    expect(pie.querySelector('[data-action="confirmar-distribucion"]')).not.toBeNull();
    expect(pie.querySelector('[data-action="distribuir-paso-siguiente"]')).not.toBeNull();
    const deficit = body().querySelector('#distribuir-deficit');
    // 4 = DOCUMENT_POSITION_FOLLOWING: el pie va después del déficit.
    expect(deficit.compareDocumentPosition(pie) & 4).toBeTruthy();
    expect(pie.nextElementSibling).toBeNull();
  });
});
