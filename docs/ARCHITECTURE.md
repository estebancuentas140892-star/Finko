# Arquitectura - Finko Claude

> Documento vivo. Se actualiza al inicio de cada fase.
> Última revisión: Fase 1 (2026-05-12)

---

## 1. Visión general

Finko es una **PWA offline-first de página única (SPA)**. No hay servidor, no hay backend, no hay cuentas de usuario. Todo vive en el dispositivo del usuario.

```
Navegador
  │
  ├─ index.html          → Shell (estructura, modales, navegación)
  ├─ service-worker.js   → Cache-first (offline garantizado)
  ├─ styles/main.css     → Design system vía @layer
  └─ modules/            → ES6 modules (sin bundler)
       ├─ core/          → Estado + persistencia + constantes
       ├─ infra/         → Utilidades transversales
       ├─ ui/            → Navegación + eventos + shell
       └─ dominio/       → Lógica financiera por área
```

---

## 2. Capas y responsabilidades

### 2.1 `modules/core/`

La capa más baja. Ningún otro módulo puede importar desde acá hacia arriba.

| Archivo | Responsabilidad |
|---|---|
| `state.js` | Singleton `S` mutable + EventBus |
| `storage.js` | Persistencia en `localStorage` + migraciones idempotentes |
| `constants.js` | Constantes legales colombianas (SMMLV, UVT, usura, GMF, bancos) |

### 2.2 `modules/infra/`

Utilidades transversales sin dependencias de dominio.

| Archivo | Responsabilidad |
|---|---|
| `utils.js` | Formateo de moneda, fechas, diálogos nativos |
| `render.js` | `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()` |
| `a11y.js` | `announce()` para screen readers, `trapFocus()` para modales |
| `crud.js` | Helper genérico: guardar / editar / eliminar en `S` |
| `router.js` | Hash routing (`#dash`, `#gastos`, `#metas`, …) |

### 2.3 `modules/ui/`

Bootstrap y orquestación de la interfaz.

| Archivo | Responsabilidad |
|---|---|
| `bootstrap.js` | Entry point: importa dominios, registra `data-action`, inicializa app |
| `shell.js` | Sidebar, toggle de tema, navegación entre secciones |
| `actions.js` | Delegador central de `data-action` - único lugar con `addEventListener` en document |
| `modales.js` | Factory de modales con contrato uniforme (abrir, cerrar, reset) |
| `onboarding.js` | Wizard de 3 pasos para usuario nuevo (`!S.onboarded`) |

### 2.4 `modules/dominio/`

Cada dominio tiene su propia carpeta con separación estricta:

```
dominio/nombre/
  ├─ logic.js    → Cálculos puros. SIN DOM. Testeable en Node/Vitest.
  ├─ view.js     → Genera HTML (innerHTML). Importa logic.js.
  └─ index.js    → Exporta la API pública del dominio.
```

| Dominio | Área funcional |
|---|---|
| `ingresos/` | Registro de ingresos quincenales, resumen, historial |
| `gastos/` | Gastos variables, categorías, detector de hormigas |
| `compromisos/` | Gastos fijos, deudas (Avalancha/Bola de Nieve), agenda de pagos |
| `tesoreria/` | Cuentas bancarias, bolsillos, fondo de emergencia |
| `metas/` | Objetivos de ahorro, inversiones |
| `analisis/` | Salud financiera, logros, rachas, alertas, predicciones |
| `calculadoras/` | CDT, crédito, interés compuesto, regla 72, prima (lazy-loaded) |
| `exports/` | Exportar datos en JSON, CSV, HTML |

---

## 3. Flujo de datos

```
Usuario interactúa
  │
  ▼
data-action (delegado en actions.js)
  │
  ▼
Handler del dominio
  │  mutación de S
  ▼
save()          → localStorage (debounced 200ms)
  │
  ▼
EventBus.emit('state:change', { section })
  │
  ▼
render.js       → renderSmart(fn, key) → solo re-renderiza si la sección es visible
  │
  ▼
view.js del dominio → innerHTML actualizado
```

**Regla invariante:** toda mutación de `S` debe seguir esta secuencia exacta.
Nunca mutar `S` sin `save()`. Nunca renderizar sin que `S` esté actualizado.

---

## 4. Estado - Singleton `S`

`state.js` exporta un único objeto `S` mutable. Toda la app comparte la misma referencia.

```js
// state.js
export const S = {
  // Se inicializa con los datos de localStorage en bootstrap
};

export const EventBus = {
  on(event, fn) { ... },
  off(event, fn) { ... },
  emit(event, data) { ... },
};
```

**Reglas:**
- `S` es el único source of truth.
- No se permite reactivity, proxies ni observers sobre `S`.
- Toda lectura de `S` es síncrona y directa (`S.gastos`, `S.deudas`, etc.).

---

## 5. Persistencia - `storage.js`

- Clave en localStorage: `fco_v1` (schema v1 para Finko Claude - versión fresca).
- `loadData()` aplica todas las migraciones en orden al cargar.
- `save()` está debounced 200ms para no saturar escrituras.
- Cada bump de schema crea una nueva función de migración idempotente.

```js
// Patrón de migración
function migrate_v1_to_v2(data) {
  if (data.schemaVersion >= 2) return data;
  // ... transformación ...
  data.schemaVersion = 2;
  return data;
}
```

---

## 6. Sistema de eventos - EventBus

El EventBus en `state.js` desacopla dominios entre sí. Ningún dominio importa a otro dominio directamente.

```js
// Emitir desde un dominio
EventBus.emit('state:change', { section: 'gastos' });

// Escuchar desde render.js
EventBus.on('state:change', ({ section }) => renderSmart(renderGastos, section));
```

Eventos estándar del sistema:

| Evento | Quién lo emite | Quién lo escucha |
|---|---|---|
| `state:change` | Cualquier dominio tras mutación de S | `render.js` |
| `state:save` | `storage.js` tras cada guardado | Opcional: feedback UI |
| `ui:navigate` | `router.js` al cambiar hash | `shell.js` |
| `ui:modal:open` | Cualquier dominio | `modales.js` |
| `ui:modal:close` | `modales.js` | Limpieza general |

---

## 7. HTML - contrato de eventos

**0 `onclick=""` en HTML estático.** Toda interacción usa atributos `data-action`:

```html
<!-- Correcto -->
<button data-action="guardar-gasto" data-arg-id="123">Guardar</button>

<!-- Incorrecto - NO hacer -->
<button onclick="guardarGasto(123)">Guardar</button>
```

`actions.js` tiene un único listener en `document`:
```js
document.addEventListener('click', e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action) dispatch(action, e);
});
```

---

## 8. CSS - capas `@layer`

```css
@layer reset, base, tokens, layout, components, modals, themes, a11y, responsive, utils;
```

| Capa | Contenido |
|---|---|
| `reset` | Normalización cross-browser |
| `base` | Tipografía base, box-sizing, focus visible global |
| `tokens` | Variables CSS (paleta, espaciado, radii, sombras) |
| `layout` | Shell de app, sidebar, main content, Bento Grid |
| `components` | `.btn`, `.card`, `.input`, `.chip`, `.modal`, `.list-item` |
| `modals` | Overlay, animaciones de apertura/cierre |
| `themes` | Modo oscuro (default) y claro (`body.light-theme`) |
| `a11y` | `prefers-reduced-motion`, alto contraste |
| `responsive` | Breakpoints: 1440px / 1024px / 768px / 480px / 360px |
| `utils` | `.sr-only`, `.visually-hidden`, helpers de display |

---

## 9. PWA y Service Worker

- `service-worker.js` implementa **cache-first**.
- Al instalar: precachea `index.html`, todos los CSS, todos los JS, íconos y manifest.
- Al activar: limpia caches viejos.
- **Regla crítica:** cada vez que cambien assets (JS, CSS, HTML), bumpear `CACHE_NAME`.

---

## 10. Reglas innegociables (ADN del proyecto)

1. **Vanilla JS sin build step.** Ningún transpilador, bundler ni framework.
2. **Offline-first.** La app funciona sin red tras la primera carga.
3. **Sin servidor.** Sin backend, sin cuentas, sin sync. Privacidad absoluta.
4. **Singleton `S` mutable.** No agregar reactivity ni proxies.
5. **`save()` debounced.** No escribir a localStorage directamente ni fuera de `storage.js`.
6. **Migraciones idempotentes.** Cada bump de schema aplica sin romper datos existentes.
7. **`data-action` delegado.** 0 `onclick` en HTML estático.
8. **Cero `window.X`** - todo vía EventBus e imports. Ninguna función global.
9. **`logic.js` sin DOM.** Los cálculos no pueden tocar `document` ni `window`.
10. **Lenguaje humano.** Términos claros para personas sin educación financiera.
11. **Constantes legales vivas.** Tasa de usura, SMMLV y UVT con revisión trimestral obligatoria.

Cambiar cualquiera de estas reglas requiere crear un ADR en `docs/DECISIONS/`.

---

## 11. Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Dominios | Español neutro | `ingresos`, `compromisos`, `tesoreria` |
| Infra y UI | Inglés | `state`, `storage`, `render`, `actions` |
| Archivos CSS | kebab-case | `tokens.css`, `main.css` |
| Variables CSS | `--fk-*` | `--fk-color-primary`, `--fk-space-4` |
| Eventos EventBus | `dominio:acción` | `state:change`, `ui:navigate` |
| `data-action` | kebab-case verbo-sustantivo | `guardar-gasto`, `editar-deuda` |
| Commits | `tipo(área): descripción` | `feat(gastos): agregar detector de hormigas` |

---

## 12. Árbol de dependencias entre módulos

```
core/constants.js   (sin dependencias)
core/state.js       (sin dependencias)
core/storage.js     ← state.js
                    ← constants.js

infra/utils.js      ← state.js
infra/a11y.js       (sin dependencias de dominio)
infra/crud.js       ← state.js, storage.js
infra/render.js     ← state.js
infra/router.js     ← state.js, EventBus

ui/shell.js         ← infra/render.js, infra/router.js
ui/modales.js       ← infra/a11y.js
ui/actions.js       ← (registra handlers de todos los dominios)
ui/bootstrap.js     ← todo lo anterior + todos los dominios

dominio/*/logic.js  ← core/state.js, core/constants.js, infra/utils.js
dominio/*/view.js   ← logic.js, infra/render.js
dominio/*/index.js  ← logic.js, view.js
```

**Regla:** ningún `dominio/X` importa de `dominio/Y`. La comunicación cross-dominio va por EventBus.
