import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderPanelConfig, renderModalFiscal, miles, desdeMiles, textoUltimoRespaldo } from '../../modules/dominio/config/view.js';
import { S, createInitialState } from '../../modules/core/state.js';
import { DOCUMENTOS_LEGALES, documentoLegalPorId } from '../../modules/dominio/config/legal.js';

// ── PERFIL: situación laboral (CFG.1) ────────────────────────────

describe('renderPanelConfig() - perfil con situación laboral (CFG.1)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
  });

  const html = () => document.getElementById('panel-config').innerHTML;

  it('el encabezado del perfil ya no muestra el SMMLV muerto', () => {
    renderPanelConfig();
    expect(html()).not.toContain('SMMLV configurado');
    expect(html()).not.toContain('id="config-smmlv"');
  });

  it('muestra el selector de situación laboral con la opción "Sin especificar"', () => {
    renderPanelConfig();
    const select = document.getElementById('config-situacion');
    expect(select).not.toBeNull();
    expect(select.querySelector('option[value=""]')?.textContent).toBe('Sin especificar');
  });

  it('sin situación laboral registrada, ninguna opción queda preseleccionada', () => {
    S.perfil.situacionLaboral = '';
    renderPanelConfig();
    expect(document.querySelector('#config-situacion option[selected]')).toBeNull();
  });

  it('con una situación laboral registrada, la preselecciona', () => {
    S.perfil.situacionLaboral = 'independiente';
    renderPanelConfig();

    // La opción correcta lleva el atributo `selected` (el comportamiento real de
    // `select.value` lo verifica el E2E en Chromium: happy-dom no lo sincroniza
    // desde el atributo puesto vía innerHTML).
    const opcion = document.querySelector('#config-situacion option[value="independiente"]');
    expect(opcion).not.toBeNull();
    expect(opcion.hasAttribute('selected')).toBe(true);
  });

  it('una situación laboral corrupta (id desconocido) no preselecciona nada', () => {
    S.perfil.situacionLaboral = 'valor-invalido';
    renderPanelConfig();
    expect(document.querySelector('#config-situacion option[selected]')).toBeNull();
  });

  // B3: el `<dl class="config-info">` del perfil repetía los mismos dos datos
  // que el formulario de abajo ya muestra rellenados. La única `.config-info`
  // que queda en el panel es la de "Acerca de".
  it('el perfil ya no repite nombre y situación en un resumen aparte', () => {
    S.perfil.nombre = 'Esteban';
    renderPanelConfig();

    const perfil = document.querySelector('section[aria-labelledby="config-perfil-title"]');
    expect(perfil.querySelector('.config-info')).toBeNull();
    expect(document.querySelectorAll('#panel-config .config-info')).toHaveLength(1);
    expect(document.querySelector('label[for="config-nombre"]').textContent.trim()).toBe('Tu nombre');
  });
});

// ── ESTRUCTURA DEL PANEL (B1, B2, B13) ───────────────────────────

describe('renderPanelConfig() - grupos, jerarquía de botón y sprite (B1, B2, B13)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
    renderPanelConfig();
  });

  it('agrupa el panel en cinco bloques rotulados, con "La app" primero', () => {
    const rotulos = [...document.querySelectorAll('.config-grupo__label')].map(e => e.textContent.trim());
    expect(rotulos).toEqual(['La app', 'Tu cuenta', 'Tus datos', 'Impuestos', 'Información']);
  });

  it('el interruptor de tema vive en el primer grupo, no a dos pantallas de scroll', () => {
    const primerGrupo = document.querySelector('.config-grupo');
    expect(primerGrupo.querySelector('#toggle-tema')).not.toBeNull();
  });

  it('deja un solo botón primario en reposo: el de guardar perfil', () => {
    // Los dos formularios de impuestos ya no viven montados en el panel
    // (CFG.2c: pasaron al asistente); los de instalar y activar recordatorios
    // pasaron a secundario (R11).
    const primarios = [...document.querySelectorAll('#panel-config .btn-primary')]
      .filter(b => !b.closest('details'));
    expect(primarios).toHaveLength(1);
    expect(primarios[0].textContent.trim()).toBe('Guardar perfil');
    expect(document.querySelector('[data-action="install-pwa"]').className)
      .toContain('btn-secondary');
  });

  // CFG.2c/ADR 050 D1: lo fiscal ya no vive montado en Ajustes, ni plegado.
  it('lo fiscal ya no se renderiza en el panel: solo queda el botón del asistente', () => {
    const fiscal = document.querySelector('section[aria-labelledby="config-fiscal-title"]');
    expect(fiscal.querySelector('details')).toBeNull();
    expect(document.getElementById('form-perfil-fiscal')).toBeNull();
    expect(document.getElementById('form-datos-fiscales')).toBeNull();

    const boton = fiscal.querySelector('[data-action="abrir-perfil-fiscal"]');
    expect(boton).not.toBeNull();
    expect(boton.textContent.trim()).toBe('Completar perfil fiscal');
    expect(boton.className).toContain('btn-secondary');
  });

  it('ningún título de tarjeta lleva emoji: la sección usa el sprite como el resto de la app', () => {
    const titulos = [...document.querySelectorAll('#panel-config .config-section__title')];
    expect(titulos.length).toBeGreaterThan(0);
    for (const t of titulos) {
      expect(t.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

// ── TUS DATOS: importador accesible y ámbito de cada par (B5, B6) ─

describe('renderPanelConfig() - gestión de datos (B5, B6)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
    renderPanelConfig();
  });

  it('el importador es un botón de verdad y el input file va con hidden, no sr-only', () => {
    const boton = document.querySelector('[data-action="importar-datos"]');
    expect(boton.tagName).toBe('BUTTON');

    const input = document.getElementById('config-importar-json');
    expect(input.hasAttribute('hidden')).toBe(true);
    expect(input.getAttribute('aria-hidden')).toBeNull();
    expect(input.classList.contains('sr-only')).toBe(false);
  });

  it('separa los dos ámbitos: lo que mueve toda la app y lo que solo toca los gastos', () => {
    const datos = document.querySelector('section[aria-labelledby="config-datos-title"]');
    const rotulos = [...datos.querySelectorAll('.form-hint')].map(e => e.textContent.trim());
    expect(rotulos).toEqual(['Toda la app', 'Solo tus gastos']);

    const pares = datos.querySelectorAll('.config-actions--ambito');
    expect(pares).toHaveLength(2);
    expect(pares[0].querySelectorAll('.btn')).toHaveLength(2);
    expect(pares[1].querySelectorAll('.btn')).toHaveLength(2);
  });
});

// ── BORRADO AUTOMÁTICO DEL NAVEGADOR (CFG.4a, ADR 043 D2.1) ──────

describe('renderPanelConfig() - bloque de borrado automático (CFG.4a)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
    renderPanelConfig();
  });

  it('el bloque vive dentro de "Tus datos", no en una sección propia', () => {
    const datos = document.querySelector('section[aria-labelledby="config-datos-title"]');
    expect(datos.querySelector('#config-persistencia')).not.toBeNull();
  });

  it('nace oculto y sin texto: el estado real es asíncrono y lo pinta index.js', () => {
    const bloque = document.getElementById('config-persistencia');
    expect(bloque.hasAttribute('hidden')).toBe(true);
    expect(document.getElementById('config-persistencia-estado').textContent.trim()).toBe('');
  });

  it('el botón nace oculto: solo se muestra cuando hay algo que pedir', () => {
    const boton = document.getElementById('config-persistencia-btn');
    expect(boton.hasAttribute('hidden')).toBe(true);
    expect(boton.dataset.action).toBe('proteger-datos');
  });

  it('no agrega un tercer rótulo de ámbito a la sección', () => {
    const datos = document.querySelector('section[aria-labelledby="config-datos-title"]');
    const rotulos = [...datos.querySelectorAll('.form-hint')].map(e => e.textContent.trim());
    expect(rotulos).toEqual(['Toda la app', 'Solo tus gastos']);
  });
});

// ── SELLO DEL ÚLTIMO RESPALDO (CFG.4b, ADR 043 D2.2) ─────────────

describe('textoUltimoRespaldo()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15)); // 2026-08-15
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nunca respaldó', () => {
    expect(textoUltimoRespaldo(null)).toBe('Nunca has guardado un respaldo.');
  });

  it('respaldó hoy mismo', () => {
    expect(textoUltimoRespaldo('2026-08-15')).toBe('Guardaste tu último respaldo hoy.');
  });

  it('respaldó ayer', () => {
    expect(textoUltimoRespaldo('2026-08-14')).toBe('Guardaste tu último respaldo ayer.');
  });

  it('respaldó hace varios días', () => {
    expect(textoUltimoRespaldo('2026-08-01')).toBe('Guardaste tu último respaldo hace 14 días.');
  });
});

describe('renderPanelConfig() - sello del último respaldo (CFG.4b)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
  });

  it('sin respaldo previo, muestra el aviso de "nunca"', () => {
    renderPanelConfig();
    const sello = document.getElementById('config-ultimo-respaldo');
    expect(sello).not.toBeNull();
    expect(sello.textContent).toBe('Nunca has guardado un respaldo.');
  });

  it('con un sello guardado, lo muestra en la misma sección de "Tus datos"', () => {
    S.config.ultimoRespaldoISO = '2026-01-01';
    renderPanelConfig();
    const datos = document.querySelector('section[aria-labelledby="config-datos-title"]');
    const sello = datos.querySelector('#config-ultimo-respaldo');
    expect(sello).not.toBeNull();
    expect(sello.textContent).toContain('Guardaste tu último respaldo hace');
  });

  it('el sello no es un .form-hint: no rompe el conteo de rótulos de ámbito', () => {
    renderPanelConfig();
    const datos = document.querySelector('section[aria-labelledby="config-datos-title"]');
    const rotulos = [...datos.querySelectorAll('.form-hint')].map(e => e.textContent.trim());
    expect(rotulos).toEqual(['Toda la app', 'Solo tus gastos']);
  });
});

// ── MONTOS DE RENTA CON SEPARADOR DE MILES (B4/R16) ──────────────

describe('miles() y desdeMiles()', () => {
  it('agrupa de a tres desde la derecha', () => {
    expect(miles(72000000)).toBe('72.000.000');
    expect(miles('1234')).toBe('1.234');
    expect(miles(999)).toBe('999');
  });

  it('descarta lo que no sea dígito y los ceros a la izquierda', () => {
    expect(miles('72.000.000')).toBe('72.000.000');
    expect(miles('$72,000,000')).toBe('72.000.000');
    expect(miles('-500')).toBe('500');
    expect(miles('007')).toBe('7');
  });

  it('sin dígitos devuelve cadena vacía: los tres campos son opcionales', () => {
    expect(miles('')).toBe('');
    expect(miles(null)).toBe('');
    expect(miles('abc')).toBe('');
  });

  it('desdeMiles() es la inversa y distingue vacío de cero', () => {
    expect(desdeMiles('72.000.000')).toBe(72000000);
    expect(desdeMiles('0')).toBe(0);
    expect(desdeMiles('')).toBeNull();
    expect(desdeMiles(null)).toBeNull();
  });
});

// CFG.2c: los dos formularios fiscales viven en el asistente (modal), no en
// el panel. `renderModalFiscal()` es el HTML que `config/index.js` inyecta
// en `#modal-fiscal-body` al abrirlo.
describe('renderModalFiscal() - asistente fiscal (B4, CFG.2c)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="modal-fiscal-body"></div>';
  });

  const render = () => {
    document.getElementById('modal-fiscal-body').innerHTML = renderModalFiscal();
  };

  it('incluye el formulario de perfil fiscal y el de datos de renta', () => {
    render();
    expect(document.getElementById('form-perfil-fiscal')).not.toBeNull();
    expect(document.getElementById('form-datos-fiscales')).not.toBeNull();
  });

  it('los tres campos son texto numérico con separador, no type=number pelado', () => {
    render();
    for (const id of ['df-ingresos', 'df-tc', 'df-consig']) {
      const campo = document.getElementById(id);
      expect(campo.getAttribute('type')).toBe('text');
      expect(campo.getAttribute('inputmode')).toBe('numeric');
      expect(campo.hasAttribute('data-miles')).toBe(true);
    }
  });

  it('un valor ya guardado se muestra con puntos de miles', () => {
    const anio = new Date().getFullYear();
    S.config = { datosFiscales: { [anio]: { ingresosBrutos: 72000000 } } };
    render();
    expect(document.getElementById('df-ingresos').getAttribute('value')).toBe('72.000.000');
  });
});

// ── CENTRO LEGAL (LEG.1) ──────────────────────────────────────────

describe('renderPanelConfig() - Centro Legal (LEG.1)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
    renderPanelConfig();
  });

  it('muestra la sección con un botón por cada documento del catálogo', () => {
    const html = document.getElementById('panel-config').innerHTML;
    expect(html).toContain('Centro Legal');

    const botones = [...document.querySelectorAll('[data-action="abrir-legal"]')];
    expect(botones).toHaveLength(DOCUMENTOS_LEGALES.length);
  });

  // B9: los dos que la gente busca de verdad quedan sueltos arriba; los otros
  // ocho, a un toque dentro del desplegable.
  it('destaca Términos y Privacidad y pliega los ocho restantes', () => {
    const legal = document.querySelector('section[aria-labelledby="config-legal-title"]');
    const sueltos = [...legal.querySelectorAll('.legal-lista__link')]
      .filter(b => !b.closest('details'))
      .map(b => b.dataset.doc);
    expect(sueltos).toEqual(['terminos-y-condiciones', 'politica-de-privacidad']);

    const plegados = legal.querySelectorAll('details .legal-lista__link');
    expect(plegados).toHaveLength(DOCUMENTOS_LEGALES.length - 2);
    expect(legal.querySelector('details > summary').textContent).toContain('Más documentos (8)');
  });

  it('cada botón lleva el id correcto en data-doc y el título visible', () => {
    for (const doc of DOCUMENTOS_LEGALES) {
      const boton = document.querySelector(`[data-action="abrir-legal"][data-doc="${doc.id}"]`);
      expect(boton, `falta el botón de "${doc.id}"`).not.toBeNull();
      expect(boton.textContent).toContain(doc.titulo);
    }
  });
});

// ── Toggle de tema: único switch de la app (TX.11) ────────────────

describe('renderPanelConfig() - toggle de tema con el switch único (TX.11)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
    renderPanelConfig();
  });

  it('usa el componente .toggle de atoms.css, no un checkbox estilizado a mano', () => {
    const label = document.querySelector('.config-toggle');
    expect(label).not.toBeNull();
    expect(label.querySelector('.toggle')).not.toBeNull();
    expect(label.querySelector('.toggle__track')).not.toBeNull();
    // Ya no queda ningún resto de los otros dos switches que existían.
    expect(label.querySelector('.toggle-switch')).toBeNull();
  });

  it('el input real sigue siendo #toggle-tema con su data-action intacto', () => {
    const input = document.getElementById('toggle-tema');
    expect(input).not.toBeNull();
    expect(input.closest('.toggle')).not.toBeNull();
    expect(input.dataset.action).toBe('theme-toggle');
  });
});

// ── AVISOS POR SECCIÓN (CFG.3c, ADR 066 nota 2026-08-13) ─────────

describe('renderPanelConfig() - preferencias de avisos por tipo (CFG.3c)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    S.config.notificaciones = true;
    document.body.innerHTML = '<div id="panel-config"></div>';
    // La rama 'granted' de _renderNotificaciones() es la única que muestra el
    // fieldset nuevo; happy-dom no trae `Notification`, así que se stubea acá
    // (primer test de este archivo que necesita esa rama).
    globalThis.Notification = { permission: 'granted' };
  });

  afterEach(() => {
    delete globalThis.Notification;
  });

  it('con recordatorios activos, muestra un interruptor por cada sección', () => {
    renderPanelConfig();
    const fieldset = document.querySelector('.config-avisos-tipos');
    expect(fieldset).not.toBeNull();
    expect(fieldset.querySelectorAll('.config-toggle').length).toBe(6);
    expect(fieldset.textContent).toContain('Deudas y pagos fijos');
    expect(fieldset.textContent).toContain('Límites de gasto');
    expect(fieldset.textContent).toContain('Apartados');
    expect(fieldset.textContent).toContain('Préstamos personales');
    expect(fieldset.textContent).toContain('Día de pago');
    expect(fieldset.textContent).toContain('Respaldo de tus datos');
  });

  it('sin recordatorios activos, no se muestra ningún interruptor por sección', () => {
    S.config.notificaciones = false;
    renderPanelConfig();
    expect(document.querySelector('.config-avisos-tipos')).toBeNull();
  });

  it('una sección apagada en S nace desmarcada; las demás siguen marcadas', () => {
    S.config.avisosPorSeccion = { compromisos: false, presupuesto: true, apartados: true, personales: true, tesoreria: true };
    renderPanelConfig();
    const compromisos = document.getElementById('toggle-aviso-compromisos');
    const presupuesto = document.getElementById('toggle-aviso-presupuesto');
    expect(compromisos.checked).toBe(false);
    expect(presupuesto.checked).toBe(true);
  });

  it('sin preferencia guardada, las seis secciones nacen activas', () => {
    delete S.config.avisosPorSeccion;
    renderPanelConfig();
    const inputs = document.querySelectorAll('.config-avisos-tipos input[type="checkbox"]');
    expect(inputs.length).toBe(6);
    for (const input of inputs) expect(input.checked).toBe(true);
  });

  it('cada input trae data-action y data-seccion para el delegador', () => {
    renderPanelConfig();
    const input = document.getElementById('toggle-aviso-tesoreria');
    expect(input.dataset.action).toBe('toggle-aviso-seccion');
    expect(input.dataset.seccion).toBe('tesoreria');
  });
});

describe('documentoLegalPorId()', () => {
  it('encuentra un documento existente', () => {
    expect(documentoLegalPorId('politica-de-privacidad')?.archivo).toBe('politica-de-privacidad.md');
  });

  it('devuelve null para un id desconocido (defensivo ante un data-doc-link roto)', () => {
    expect(documentoLegalPorId('no-existe')).toBeNull();
  });
});

// ── CANDADO DE ACCESO (CFG.5a, ADR 063) ──────────────────────────

describe('renderPanelConfig() - candado de acceso (CFG.5a)', () => {
  beforeEach(() => {
    Object.assign(S, createInitialState());
    document.body.innerHTML = '<div id="panel-config"></div>';
  });

  const html = () => document.getElementById('panel-config').innerHTML;

  it('sin candado ofrece activarlo con PIN y confirmación', () => {
    renderPanelConfig();
    expect(document.getElementById('form-bloqueo-crear')).not.toBeNull();
    expect(document.getElementById('bloqueo-pin')).not.toBeNull();
    expect(document.getElementById('bloqueo-pin2')).not.toBeNull();
    expect(document.getElementById('form-bloqueo-quitar')).toBeNull();
  });

  it('dice de frente que no cifra los datos (ADR 063, ADN 11)', () => {
    renderPanelConfig();
    expect(html()).toContain('No cifra tus datos');
  });

  it('avisa que si se olvida el PIN la unica salida es borrar todo', () => {
    renderPanelConfig();
    expect(html()).toContain('borrar todo');
  });

  it('el PIN se captura como password, nunca como texto visible', () => {
    renderPanelConfig();
    expect(document.getElementById('bloqueo-pin').type).toBe('password');
    expect(document.getElementById('bloqueo-pin').getAttribute('inputmode')).toBe('numeric');
  });

  it('con candado activo muestra el estado y ofrece cambiarlo o quitarlo', () => {
    S.config.bloqueo = { hash: 'a'.repeat(64), salt: 'b'.repeat(32), creado: '2026-08-12' };
    renderPanelConfig();

    expect(document.getElementById('config-bloqueo-estado')?.textContent).toContain('Candado activo');
    expect(document.getElementById('form-bloqueo-cambiar')).not.toBeNull();
    expect(document.getElementById('form-bloqueo-quitar')).not.toBeNull();
    expect(document.getElementById('form-bloqueo-crear')).toBeNull();
  });

  it('quitar el candado exige el PIN actual', () => {
    S.config.bloqueo = { hash: 'a'.repeat(64), salt: 'b'.repeat(32), creado: '2026-08-12' };
    renderPanelConfig();

    const campo = document.querySelector('#form-bloqueo-quitar [name="pinActual"]');
    expect(campo).not.toBeNull();
    expect(campo.type).toBe('password');
  });

  it('el bloque vive en el grupo "Tu cuenta", junto al perfil', () => {
    renderPanelConfig();
    const grupo = document.getElementById('form-bloqueo-crear').closest('.config-grupo');
    expect(grupo.querySelector('.config-grupo__label').textContent.trim()).toBe('Tu cuenta');
  });
});
