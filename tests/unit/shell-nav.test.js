/**
 * shell-nav.test.js - navegación del shell (NAV2.1a, ADR 040).
 *
 * Cubre:
 * - markActiveNav(): marca .nav-item, .mas-tile Y .bloque-tabs__tab de la
 *   sección activa (clase + aria-current), y resalta el botón "Más" cuando
 *   la sección vive detrás del menú (MAS_SECTIONS).
 * - El botón "Más" no cambia de identidad (ADR 069, hallazgo H5): siempre
 *   dice "Más", con su ícono y sin data-section, esté donde esté el usuario.
 * - La entrada de Gastos se resalta en las tres lentes del bloque (ADR 069).
 * - _syncThemeButton vía toggleTheme(): sincroniza TODOS los toggles
 *   presentes (checkbox de Ajustes + botón de icono del sheet, que
 *   alterna el glifo luna/sol y aria-pressed).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  markActiveNav, toggleTheme, toggleSidebarCollapse, initSidebarCollapse,
} from '../../modules/ui/shell.js';

describe('markActiveNav()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <a class="nav-item" data-section="analisis"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <a class="mas-tile" data-section="analisis"></a>
      <a class="mas-tile" data-section="config"></a>
    `;
  });

  it('marca el nav-item y el mas-tile de la sección activa con clase y aria-current', () => {
    markActiveNav('analisis');
    const navItem = document.querySelector('.nav-item[data-section="analisis"]');
    const masTile = document.querySelector('.mas-tile[data-section="analisis"]');
    expect(navItem.classList.contains('active')).toBe(true);
    expect(navItem.getAttribute('aria-current')).toBe('page');
    expect(masTile.classList.contains('active')).toBe(true);
    expect(masTile.getAttribute('aria-current')).toBe('page');
  });

  it('desmarca los items de las demás secciones', () => {
    markActiveNav('analisis');
    markActiveNav('gast');
    const navAnalisis = document.querySelector('.nav-item[data-section="analisis"]');
    const tileAnalisis = document.querySelector('.mas-tile[data-section="analisis"]');
    const tileConfig = document.querySelector('.mas-tile[data-section="config"]');
    expect(navAnalisis.classList.contains('active')).toBe(false);
    expect(navAnalisis.getAttribute('aria-current')).toBe('false');
    expect(tileAnalisis.classList.contains('active')).toBe(false);
    expect(tileConfig.classList.contains('active')).toBe(false);
  });

  it('resalta el botón "Más" cuando la sección activa vive detrás del menú', () => {
    markActiveNav('analisis');
    const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
    expect(masBtn.classList.contains('active')).toBe(true);
    expect(masBtn.getAttribute('aria-current')).toBe('page');
  });

  it('apaga el botón "Más" cuando la sección activa está en la barra', () => {
    markActiveNav('analisis');
    markActiveNav('gast');
    const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
    expect(masBtn.classList.contains('active')).toBe(false);
    expect(masBtn.getAttribute('aria-current')).toBe('false');
  });
});

describe('el botón "Más" siempre se llama "Más" (ADR 069, hallazgo H5)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas" aria-label="Mas opciones">
        <svg class="nav-item__icon icon"><use href="#i-mas"></use></svg>
        <span class="nav-item__label">Más</span>
      </button>
    `;
  });

  const masBtn = () => document.querySelector('.nav-item[data-modal="modal-mas"]');

  it('dentro de una sección del menú conserva nombre, ícono y nombre accesible', () => {
    markActiveNav('analisis');
    const btn = masBtn();
    expect(btn.dataset.section).toBeUndefined();
    expect(btn.querySelector('.nav-item__label').textContent).toBe('Más');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-mas');
    expect(btn.getAttribute('aria-label')).toBe('Mas opciones');
  });

  it('se resalta en cada sección del menú, sin cambiar de palabra', () => {
    for (const hash of ['analisis', 'agenda', 'movimientos', 'tesoreria', 'personales', 'config']) {
      markActiveNav(hash);
      expect(masBtn().classList.contains('active')).toBe(true);
      expect(masBtn().querySelector('.nav-item__label').textContent).toBe('Más');
    }
  });

  it('Deudas y Límites ya no viven detrás del menú: son lentes del bloque Gastos', () => {
    for (const hash of ['compromisos', 'presupuesto']) {
      markActiveNav(hash);
      expect(masBtn().classList.contains('active')).toBe(false);
      expect(masBtn().getAttribute('aria-current')).toBe('false');
    }
  });

  it('Ahorro tampoco: subió a la barra inferior (AH.7a)', () => {
    markActiveNav('ahorro');
    expect(masBtn().classList.contains('active')).toBe(false);
  });
});

describe('el bloque Gastos y sus tres lentes (ADR 069)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" href="#gast" data-section="gast">
        <span class="nav-item__label">Gastos</span>
      </a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <nav class="bloque-tabs">
        <a class="bloque-tabs__tab" href="#gast" data-section="gast"></a>
        <a class="bloque-tabs__tab" href="#compromisos" data-section="compromisos"></a>
        <a class="bloque-tabs__tab" href="#presupuesto" data-section="presupuesto"></a>
      </nav>
    `;
  });

  const tab      = (s) => document.querySelector(`.bloque-tabs__tab[data-section="${s}"]`);
  const entrada  = () => document.querySelector('.nav-item[data-section="gast"]');

  it('marca la pestaña de la lente activa con clase y aria-current', () => {
    markActiveNav('compromisos');
    expect(tab('compromisos').classList.contains('active')).toBe(true);
    expect(tab('compromisos').getAttribute('aria-current')).toBe('page');
    expect(tab('gast').classList.contains('active')).toBe(false);
    expect(tab('presupuesto').getAttribute('aria-current')).toBe('false');
  });

  it('la entrada de la barra se marca como bloque activo en las otras dos lentes', () => {
    for (const hash of ['compromisos', 'presupuesto']) {
      markActiveNav(hash);
      expect(entrada().classList.contains('nav-item--bloque-activo')).toBe(true);
    }
  });

  it('en la portada la entrada se marca `active`, no como bloque activo', () => {
    markActiveNav('gast');
    expect(entrada().classList.contains('active')).toBe(true);
    expect(entrada().classList.contains('nav-item--bloque-activo')).toBe(false);
  });

  it('fuera del bloque se apaga todo', () => {
    markActiveNav('presupuesto');
    markActiveNav('analisis');
    expect(entrada().classList.contains('active')).toBe(false);
    expect(entrada().classList.contains('nav-item--bloque-activo')).toBe(false);
    expect(tab('presupuesto').classList.contains('active')).toBe(false);
  });
});

describe('el sub-nivel del grupo Ahorro se despliega dentro del grupo (INT.1b)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <a class="nav-item" href="#ahorro" data-section="ahorro" aria-expanded="false" aria-controls="nav-subnav-ahorro"></a>
      <div class="nav-subnav" id="nav-subnav-ahorro" hidden>
        <a class="nav-item" data-section="fondo"></a>
        <a class="nav-item" data-section="metas"></a>
      </div>
    `;
  });

  // aria-controls, no data-section: la barra inferior también lleva una
  // entrada con data-section="ahorro" desde AH.7a, así que data-section no
  // identifica a la casa del sidebar.
  const subnav = () => document.getElementById('nav-subnav-ahorro');
  const trigger = () => document.querySelector('[aria-controls="nav-subnav-ahorro"]');

  it('permanece oculto fuera del grupo', () => {
    markActiveNav('gast');
    expect(subnav().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('se despliega en la casa y en cada una de las 4 hijas', () => {
    for (const hash of ['ahorro', 'fondo', 'metas', 'apartados', 'inversion']) {
      markActiveNav(hash);
      expect(subnav().hidden).toBe(false);
      expect(trigger().getAttribute('aria-expanded')).toBe('true');
    }
  });

  it('se repliega al salir del grupo', () => {
    markActiveNav('metas');
    markActiveNav('gast');
    expect(subnav().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('la pestaña Ahorro de la barra inferior se resalta en todo el grupo (AH.7a)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <a class="nav-item nav-item--mobile-only" href="#ahorro" data-section="ahorro"></a>
      <a class="nav-item nav-item--no-mobile" href="#ahorro" data-section="ahorro"
         aria-expanded="false" aria-controls="nav-subnav-ahorro"></a>
    `;
  });

  const pestana = () => document.querySelector('.nav-item--mobile-only[data-section="ahorro"]');
  const casa    = () => document.querySelector('.nav-item--no-mobile[data-section="ahorro"]');

  it('se enciende en la casa y en cada una de las 4 hijas', () => {
    for (const hash of ['ahorro', 'fondo', 'metas', 'apartados', 'inversion']) {
      markActiveNav(hash);
      expect(pestana().classList.contains('active')).toBe(true);
      expect(pestana().getAttribute('aria-current')).toBe('page');
    }
  });

  it('se apaga fuera del grupo', () => {
    markActiveNav('metas');
    markActiveNav('gast');
    expect(pestana().classList.contains('active')).toBe(false);
    expect(pestana().getAttribute('aria-current')).toBe('false');
  });

  it('la entrada de desktop sigue marcándose solo en la casa: allá cada hija tiene su fila', () => {
    markActiveNav('metas');
    expect(casa().classList.contains('active')).toBe(false);
    markActiveNav('ahorro');
    expect(casa().classList.contains('active')).toBe(true);
  });
});

describe('la barra superior lee la teja + título de la sección activa (INT.1c)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="section active" id="sec-gast">
        <header class="section__header">
          <div class="section__title-group">
            <span class="cat-teja section__icon" data-dom="gastos">
              <svg class="icon"><use href="#i-gastos"></use></svg>
            </span>
            <h1 class="section__title" id="title-gast">Gastos</h1>
          </div>
        </header>
      </section>
      <section class="section" id="sec-movimientos">
        <header class="section__header">
          <div class="section__title-group">
            <span class="cat-teja section__icon">
              <svg class="icon"><use href="#i-saldo"></use></svg>
            </span>
            <h1 class="section__title" id="title-movimientos">Movimientos</h1>
          </div>
        </header>
      </section>
      <header id="topbar">
        <span id="topbar-icon"><svg><use id="topbar-icon-use" href="#i-home"></use></svg></span>
        <h2 id="topbar-title">Inicio</h2>
      </header>
    `;
  });

  const activar = (id) => {
    document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  };

  it('toma la teja, el ícono y el título del header de la sección activa', () => {
    markActiveNav('gast');
    expect(document.getElementById('topbar-title').textContent).toBe('Gastos');
    expect(document.getElementById('topbar-icon-use').getAttribute('href')).toBe('#i-gastos');
    expect(document.getElementById('topbar-icon').dataset.dom).toBe('gastos');
  });

  it('sin data-dom en la teja (ej. Movimientos), limpia el dominio previo', () => {
    markActiveNav('gast');
    activar('sec-movimientos');
    markActiveNav('movimientos');
    expect(document.getElementById('topbar-title').textContent).toBe('Movimientos');
    expect(document.getElementById('topbar-icon-use').getAttribute('href')).toBe('#i-saldo');
    expect(document.getElementById('topbar-icon').dataset.dom).toBeUndefined();
  });

  it('sin ninguna .section.active (Inicio, sin cat-teja propia) cae al rótulo neutro', () => {
    activar('__ninguna__');
    markActiveNav('dash');
    expect(document.getElementById('topbar-title').textContent).toBe('Inicio');
    expect(document.getElementById('topbar-icon-use').getAttribute('href')).toBe('#i-home');
  });
});

describe('toggleTheme() sincroniza todos los toggles presentes', () => {
  beforeEach(() => {
    document.body.classList.remove('light-theme');
    localStorage.removeItem('fk_theme');
    document.body.innerHTML = `
      <button class="mas-sheet__theme" data-action="theme-toggle" aria-pressed="false">
        <svg class="icon"><use href="#i-moon"></use></svg>
      </button>
      <input type="checkbox" data-action="theme-toggle">
    `;
  });

  it('al pasar a claro: glifo sol, aria-pressed=true y checkbox marcado', async () => {
    toggleTheme();
    expect(document.body.classList.contains('light-theme')).toBe(true);

    const btn = document.querySelector('.mas-sheet__theme');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-sun');
    expect(btn.getAttribute('aria-pressed')).toBe('true');

    // El checkbox se sincroniza en un setTimeout(0).
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('input[type="checkbox"]').checked).toBe(true);
  });

  it('al volver a oscuro: glifo luna y aria-pressed=false', async () => {
    toggleTheme();
    toggleTheme();
    expect(document.body.classList.contains('light-theme')).toBe(false);

    const btn = document.querySelector('.mas-sheet__theme');
    expect(btn.querySelector('use').getAttribute('href')).toBe('#i-moon');
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('input[type="checkbox"]').checked).toBe(false);
  });
});

// ── DSK.10a (ADR 079 D2) - un solo botón lleno por pantalla ──────

describe('jerarquía de primarios en la barra superior (DSK.10a)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section class="section active" id="sec-gast">
        <header class="section__header">
          <div class="section__title-group"><h1 class="section__title" id="title-gast">Gastos</h1></div>
          <button class="btn btn-primary" data-action="nuevo-gasto">Registrar gasto</button>
        </header>
      </section>
      <section class="section" id="sec-analisis">
        <header class="section__header">
          <div class="section__title-group"><h1 class="section__title" id="title-analisis">Análisis</h1></div>
        </header>
      </section>
      <header id="topbar">
        <span id="topbar-icon"><svg><use id="topbar-icon-use" href="#i-home"></use></svg></span>
        <h2 id="topbar-title">Inicio</h2>
        <button class="btn btn-secondary topbar__primario" id="topbar-primario" hidden></button>
        <button class="btn btn-primary topbar__registrar" data-action="registrar-abrir-hoja">Registrar</button>
      </header>
    `;
  });

  const activar = (id) => {
    document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === id));
  };
  const top = () => document.getElementById('topbar-primario');
  const registrar = () => document.querySelector('.topbar__registrar');

  // Hasta acá el primario de la sección viajaba a la barra en `.btn-secondary`,
  // al lado del `.btn-primary` de "Registrar": la acción propia de la pantalla
  // quedaba más callada que una que no le pertenece.
  it('con primario propio, el de la sección va lleno y Registrar se apaga', () => {
    activar('sec-gast');
    markActiveNav('gast');
    expect(top().classList.contains('btn-primary')).toBe(true);
    expect(top().classList.contains('btn-secondary')).toBe(false);
    expect(registrar().classList.contains('btn-secondary')).toBe(true);
    expect(registrar().classList.contains('btn-primary')).toBe(false);
  });

  // Es una regla, no un mapa por sección: la decide la misma condición que
  // ya evaluaba `_syncPrimarioTopbar` para mostrar u ocultar el botón.
  it('sin primario propio, Registrar recupera el lleno', () => {
    activar('sec-analisis');
    markActiveNav('analisis');
    expect(top().hidden).toBe(true);
    expect(registrar().classList.contains('btn-primary')).toBe(true);
    expect(top().classList.contains('btn-secondary')).toBe(true);
  });

  it('la jerarquía se recalcula al cambiar de sección, en los dos sentidos', () => {
    activar('sec-gast');
    markActiveNav('gast');
    activar('sec-analisis');
    markActiveNav('analisis');
    expect(registrar().classList.contains('btn-primary')).toBe(true);

    activar('sec-gast');
    markActiveNav('gast');
    expect(registrar().classList.contains('btn-secondary')).toBe(true);
    expect(top().classList.contains('btn-primary')).toBe(true);
  });

  it('un primario oculto por su dominio cuenta como sección sin primario', () => {
    const btn = document.querySelector('#sec-gast .btn-primary');
    btn.hidden = true;
    activar('sec-gast');
    markActiveNav('gast');
    expect(top().hidden).toBe(true);
    expect(registrar().classList.contains('btn-primary')).toBe(true);
  });
});

// ── DSK.10b (ADR 079 D4/D7) - la barra en monitor ────────────────

// happy-dom no tiene viewport real: se falsea `matchMedia`, mismo apaño que
// usan agenda.test.js y analisis.test.js.
describe('la barra sigue al ancho: sin plegado y con el mapa entero (DSK.10b)', () => {
  const matchMediaReal = window.matchMedia;
  const anchoDe = enMonitor => { window.matchMedia = () => ({ matches: enMonitor }); };

  beforeEach(() => {
    document.body.className = '';
    localStorage.clear();
    document.body.innerHTML = `
      <a class="nav-item" data-section="gast"></a>
      <button class="nav-item" data-modal="modal-mas"></button>
      <a class="nav-item" href="#ahorro" data-section="ahorro"
         aria-expanded="false" aria-controls="nav-subnav-ahorro"></a>
      <div class="nav-subnav" id="nav-subnav-ahorro" hidden>
        <a class="nav-item" data-section="fondo"></a>
        <a class="nav-item" data-section="metas"></a>
      </div>
      <button class="nav-item sidebar__collapse-btn" data-action="sidebar-toggle"
              aria-expanded="true" aria-label="Colapsar navegación">
        <span class="nav-item__label">Colapsar</span>
      </button>
    `;
  });

  afterEach(() => {
    window.matchMedia = matchMediaReal;
    localStorage.clear();
  });

  const subnav = () => document.getElementById('nav-subnav-ahorro');
  const trigger = () => document.querySelector('[aria-controls="nav-subnav-ahorro"]');

  // D7: hasta acá las 4 hijas solo existían mientras el hash pertenecía al
  // grupo, así que el mapa de la app no se podía leer entero sin navegar.
  it('desde 1680 el sub-nivel de Ahorro no se pliega, esté donde esté el hash', () => {
    anchoDe(true);
    markActiveNav('gast');
    expect(subnav().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('por debajo de 1680 sigue dependiendo del hash: 1 fila en vez de 5', () => {
    anchoDe(false);
    markActiveNav('gast');
    expect(subnav().hidden).toBe(true);
    markActiveNav('metas');
    expect(subnav().hidden).toBe(false);
  });

  // D4: con la sección topada en 1440 el contenido mide 1376 plegada o no,
  // así que el control cambiaba once nombres por cero píxeles.
  it('en monitor el estado persistido se ignora, pero no se borra', () => {
    localStorage.setItem('fk_sidebar_collapsed', 'true');
    anchoDe(true);
    initSidebarCollapse();
    expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
    expect(localStorage.getItem('fk_sidebar_collapsed')).toBe('true');
  });

  it('por debajo de 1680 el estado persistido se respeta', () => {
    localStorage.setItem('fk_sidebar_collapsed', 'true');
    anchoDe(false);
    initSidebarCollapse();
    expect(document.body.classList.contains('sidebar-collapsed')).toBe(true);
  });

  it('en monitor no hay nada que plegar: el toggle no hace efecto', () => {
    anchoDe(true);
    toggleSidebarCollapse();
    expect(document.body.classList.contains('sidebar-collapsed')).toBe(false);
    expect(localStorage.getItem('fk_sidebar_collapsed')).toBe(null);
  });
});
