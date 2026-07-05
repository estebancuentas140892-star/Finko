# Arquitectura - Finko Claude

> Documento vivo. Se actualiza cuando cambia una capa, se agrega un dominio o se introduce un patrón nuevo.
> Última revisión: 2026-07-02 (DOC.C, reescrito al estado real del proyecto).

---

## 1. Visión general

Finko es una **PWA offline-first de página única (SPA)**. No hay servidor, no hay backend, no hay cuentas de usuario. Todo vive en el dispositivo del usuario.

```
Navegador
  │
  ├─ index.html          → Shell (estructura, modales, navegación, sprite SVG)
  ├─ service-worker.js   → Cache-first (offline garantizado)
  ├─ styles/main.css     → Design system vía @layer
  └─ modules/            → ES6 modules (sin bundler)
       ├─ core/          → Estado + persistencia + constantes
       ├─ infra/         → Utilidades transversales
       ├─ ui/            → Navegación + eventos + shell
       └─ dominio/       → Lógica financiera por área (18 dominios)
```

---

## 2. Capas y responsabilidades

### 2.1 `modules/core/`

La capa más baja. Ningún otro módulo puede importar desde acá hacia arriba.

| Archivo | Responsabilidad |
|---|---|
| `state.js` | Singleton `S` mutable (`createInitialState()`) + `EventBus` pub/sub |
| `storage.js` | Persistencia en `localStorage` (clave `fk_v1`) + migraciones idempotentes (`SCHEMA_VERSION`) |
| `constants.js` | Constantes legales colombianas (SMMLV, UVT, GMF, `LEGAL_POR_ANIO`), catálogos de categorías por dominio, mapeo sección → grupo financiero |

### 2.2 `modules/infra/`

Utilidades transversales sin dependencias de dominio.

| Archivo | Responsabilidad |
|---|---|
| `utils.js` | Formateo de moneda (`f()`), fechas, diálogos (`dialogo()`) |
| `render.js` | `renderSmart()`, `updSaldo()`, `updateBadge()`, `renderAll()`, `registrarRender()` |
| `a11y.js` | `announce()` para lectores de pantalla, `trapFocus()`/`releaseFocus()` para modales |
| `crud.js` | Helper genérico: `guardar()`/`editar()`/`eliminar()` sobre `S`, emite `state:change` |
| `router.js` | Hash routing (`#dash`, `#gastos`, `#metas`, …) |
| `financiero.js` | Fórmulas financieras puras compartidas: `calcularCDT`, `calcularCredito` (sistema francés), `calcularInteresCompuesto`, `calcularRegla72`, `calcularRentabilidadReal`, `validarCampos` |
| `cuenta-helper.js` | Patrón compartido "0/1/varias cuentas": `renderSelectorCuenta()` + `resolverPagoConPreferida()`, usado por Gastos, Deudas, Apartados y Metas |
| `distribuir-pago.js` | `distribuirPago()`: reparte un monto entre varias cuentas cuando ninguna alcanza sola |
| `icons.js` | `icon(id)` y `emptyArt(id)`: helpers que referencian el sprite SVG inline de `index.html` |
| `svg.js` | Gráficos SVG generados (sparkline, donut) para Análisis |
| `csv.js` | Parser/serializador CSV (RFC 4180 simplificado) para importar/exportar gastos |
| `notificaciones.js` | Web Notifications API para recordatorios de compromisos próximos |
| `form-errors.js` | Helpers de validación y mensajes de error en formularios |
| `bancos.js` | Catálogo de bancos colombianos + resolución de ícono por banco |
| `animate.js` | Helpers de animación (count-up, llenado de progreso) respetando `prefers-reduced-motion` |
| `sw-register.js` | Registro del Service Worker |

### 2.3 `modules/ui/`

Bootstrap y orquestación de la interfaz.

| Archivo | Responsabilidad |
|---|---|
| `bootstrap.js` | Entry point: `loadData()` → registra dominios → `initAcciones()` → `initShell()` → `initRouter()` → `initOnboarding()` → `renderAll()` |
| `shell.js` | Sidebar, toggle de tema, navegación entre secciones |
| `actions.js` | Delegador central de `data-action` - único lugar con `addEventListener('click', ...)` en `document` |
| `modales.js` | Factory de modales: `abrirModal()` (trapFocus + `inert` en el fondo), `cerrarModal()` (releaseFocus), `resetModal()` |
| `confirm.js` | Overlay de confirmación (reemplaza `confirm()` nativo) |
| `onboarding.js` | Wizard de bienvenida para usuario nuevo (`!S.onboarded`) |
| `proposito.js` | Banner colapsable de "propósito de sección" (qué resuelve cada sección), patrón de [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) |
| `menu-mas.js` | Menú "Más" (secciones que no caben en la bottom nav móvil) |
| `install-prompt.js` | Prompt de instalación de la PWA (`beforeinstallprompt`) |

### 2.4 `modules/dominio/`

Cada dominio vive en su propia carpeta. Los dominios simples tienen 3 archivos; los que crecieron dividen `view.js` en una carpeta `views/` (barrel).

```
dominio/nombre/
  ├─ logic.js         → Cálculos puros. SIN DOM. Testeable en Node/Vitest.
  ├─ view.js          → Genera HTML (innerHTML). Importa logic.js.
  │    (o views/*.js  → sub-módulos + barrel, cuando view.js supera ~300 líneas)
  └─ index.js         → API pública: wiring de acciones, registro de render, EventBus.
```

Cuando el dominio entero crece (caso `tesoreria/`, N.3 2026-07-05), el mismo corte se aplica a las tres capas, con un archivo por subsistema funcional:

```
dominio/nombre/
  ├─ logic.js          → barrel: re-exporta la API pública de logic/*.js
  ├─ view.js           → barrel: re-exporta views/*.js (+ render completo del dominio)
  ├─ index.js          → coordinador: llama a los init de acciones/, EventBus, primer render
  ├─ logic/<sub>.js    → funciones puras por subsistema
  ├─ views/<sub>.js    → HTML por subsistema
  └─ acciones/<sub>.js → handlers data-action por subsistema
```

Los barrels mantienen la API estable: tests y consumidores siguen importando de `logic.js`/`view.js` sin enterarse del corte. Los archivos nuevos deben agregarse al precache de `service-worker.js`.

18 carpetas bajo `dominio/` (algunas sin `logic.js` porque son de solo lectura o coordinación):

| Dominio | Área funcional | Notas |
|---|---|---|
| `agenda/` | Gastos fijos y calendario de pagos (sección visible "Calendario") | |
| `ahorro/` | Fondo de emergencia + hábito de aportar | |
| `analisis/` | Salud financiera, patrimonio neto, gráficos, comparaciones | |
| `apartados/` | Sobres para gastos previsibles (SOAT, impuestos, etc.) | |
| `compromisos/` | Gastos fijos + deudas (Avalancha/Bola de nieve) + agenda de pagos | `view.js` partido en `views/` (alertas, dashboard, estrategia, estrategia-impacto, formularios, lista) |
| `config/` | Ajustes, perfil, exportar/importar backup completo | sin `logic.js` propio |
| `export/` | Serialización de gastos a CSV (`gastosACSV`) | solo `logic.js`, sin UI propia (se invoca desde `config`) |
| `gastos/` | Gastos variables, categorías, detector de hormigas | |
| `import/` | Importación de gastos desde CSV con preview y detección de duplicados | |
| `inversiones/` | Portafolio real (CDT, fondo, cripto, acciones) | |
| `logros/` | Sistema de logros y rachas (gamificación) | sin `view.js` propio (toast) |
| `metas/` | Objetivos de ahorro con fecha límite | |
| `personales/` | Préstamos que el usuario otorga a terceros ("Me deben") | |
| `presupuesto/` | Límites de gasto (envelope budgeting) por categoría y por grupo financiero | |
| `resumen/` | Card de resumen semanal en Inicio (agregación de solo lectura) | |
| `tesoreria/` | Cuentas bancarias, ingresos, "Distribuir mi ingreso" (sección visible "Mis cuentas") | dividido por subsistema: `logic/`, `views/` y `acciones/` con `cuentas.js`, `ingresos.js` y `distribucion.js` cada una; `logic.js`/`view.js` son barrels |

> Para ubicar rápido qué archivo tocar por sección visible, estilos y test, ver [`docs/MAPA.md`](MAPA.md).

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
  │  mutación de S (directa o vía infra/crud.js)
  ▼
save()          → localStorage (debounced 200ms) + flush inmediato en visibilitychange/pagehide
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

`state.js` exporta un único objeto `S` mutable, creado por `createInitialState()`. Toda la app comparte la misma referencia.

```js
// state.js
export const S = createInitialState();

export const EventBus = {
  on(event, fn) { ... },
  off(event, fn) { ... },
  emit(event, data) { ... },  // nunca lanza: excepciones de listeners se loguean y se ignoran
};
```

**Reglas:**
- `S` es el único source of truth.
- No se permite reactivity, proxies ni observers sobre `S`.
- Toda lectura de `S` es síncrona y directa (`S.gastos`, `S.compromisos`, `S.cuentas`, etc.).
- Los tipos de cada slice (`Cuenta`, `Gasto`, `Compromiso`, `Meta`, `Apartado`, `Personal`, `Ahorro`, `Inversion`, `Config`...) están documentados con JSDoc en `state.js`.

---

## 5. Persistencia - `storage.js`

- Clave en localStorage: **`fk_v1`** (`STORAGE_KEY`).
- `loadData()` aplica todas las migraciones en orden al cargar, hasta `SCHEMA_VERSION` (bump con cada migración; ver el archivo para el valor actual).
- `save()` está debounced 200ms para no saturar escrituras.
- `initFlushOnHide()` (registrado en `bootstrap.js`) fuerza un flush inmediato en `visibilitychange` (hidden) y `pagehide`, para no perder el último cambio si la pestaña se cierra antes de que corra el debounce.
- Cada bump de schema crea una nueva función de migración idempotente.

```js
// Patrón de migración
function migrate_vN_to_vNplus1(data) {
  if (data._version >= N + 1) return data;
  // ... transformación ...
  data._version = N + 1;
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

Eventos reales del sistema:

| Evento | Quién lo emite | Quién lo escucha |
|---|---|---|
| `state:change` | `infra/crud.js` tras cualquier mutación genérica; también dominios con lógica propia (`tesoreria/`, `ahorro/`) | `render.js` (re-render inteligente por sección) |
| `state:save` | `storage.js` tras cada guardado exitoso | feedback UI opcional |
| `theme:change` | `ui/shell.js` al alternar modo oscuro/claro | listeners de tema |
| `onboarding:completado` | `ui/onboarding.js` al cerrar el wizard | `bootstrap.js` |
| `distribucion:aplicar` | `tesoreria/index.js` al confirmar "Distribuir mi ingreso" | `ahorro/`, `metas/`, `apartados/`, `inversiones/`, `compromisos/` (cada uno aplica su porción de `items` y descuenta la cuenta de origen) |

`distribucion:aplicar` es el ejemplo canónico de orquestación cross-dominio sin acoplar dominios entre sí: `tesoreria` no importa `metas` ni `apartados`, solo emite un evento con la lista de `items`; cada dominio destino decide si le corresponde algo y lo aplica.

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
| `tokens` | Variables CSS (paleta, tipografía, espaciado, radii, sombras, colores por dominio `--fk-dom-*`) |
| `layout` | Shell de app, sidebar, main content, Bento Grid |
| `components` | `.btn`, `.card`, `.input`, `.chip`, `.modal`, `.list-item`... Barrel `styles/components.css` → 8 sub-módulos en `styles/components/` (`atoms`, `buttons`, `forms`, `domain`, `analysis`, `charts`, `config`, `nudges`) |
| `modals` | Overlay, animaciones de apertura/cierre |
| `themes` | Modo oscuro (default) y claro (`body.light-theme`) |
| `a11y` | `prefers-reduced-motion`, alto contraste, `forced-colors` |
| `responsive` | Breakpoints: 1440px / 1024px / 768px / 480px / 360px |
| `utils` | `.sr-only`, `.visually-hidden`, helpers de display |

### 8.1 Sistema de íconos SVG

Lenguaje de iconografía **propio**, "Finko Icons v2: trazo cálido con chispa" ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): geometría de línea sobre retícula de 24, redondez sistemática, duotono al 22 % y un punto de valor ("chispa") que el contexto enciende vía `--fk-icon-dot`. Las marcas (bancos, suscripciones) usan su logotipo monocromo sobre teja de color corporativo ([ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)); las categorías, su glifo sobre teja teñida por dominio. Los emojis quedan solo en momentos expresivos (logros, celebración): el tono cálido es ADN (regla 11), no se elimina.

- **Fuente de verdad de diseño:** `assets/svg/` (biblioteca oficial, [ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md)): un archivo SVG por recurso, estándar completo en [`assets/svg/README.md`](../assets/svg/README.md). La carpeta define el prefijo del symbol (`iconos/*` → `i-`/`c-`, `logos/**` → `b-`).
- **Entrega:** sprite inline, un `<svg>` oculto al inicio de `<body>` en `index.html` con cada recurso como `<symbol id="..." viewBox="0 0 24 24">`. Cero peticiones, offline atómico. (BR.2 automatizará biblioteca → sprite; hasta entonces el sprite se mantiene a mano y la biblioteca es su espejo.)
- **Uso:** `icon('home')`, `iconoCategoria('c-mercado')`, `tejaCategoria()` (`infra/icons.js`) y `tejaMarca()` (`infra/marcas.js`) generan `<svg class="icon"><use href="#..."/></svg>` y sus tejas. Funciona desde HTML estático y desde HTML generado en JS.
- **Presentación:** la clase `.icon` (en `styles/components/forms.css`) aplica `fill: none; stroke: currentColor; stroke-width: 2.35` (2.5 en `--sm`, 1.8 en `--lg`). Como usa `currentColor`, el ícono **hereda el color del contexto** (ej: nav activa = acento; tejas tintadas por dominio con `--fk-dom-*`).
- **Regla:** todo recurso nuevo entra como archivo a `assets/svg/` + `<symbol>` al sprite + fila de catálogo si aplica (`MARCAS`, `BANCOS_CO`, `CATEGORIA_*_ICONO`); nunca se hardcodea `<path>` suelto ni se reintroduce emoji en UI estructural. El guardarraíl TX.4 verifica que todo id referenciado exista en el sprite.

### 8.2 Tipografía

Una sola fuente: **Inter Variable**, self-hosted (`assets/fonts/inter-variable.woff2`, pesos 100-900 en un archivo). Los montos usan `font-variant-numeric: tabular-nums` con Inter, no una fuente monoespaciada aparte. Detalle completo en [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

---

## 9. PWA y Service Worker

- `service-worker.js` implementa **cache-first**.
- Al instalar: precachea `index.html`, todos los CSS, todos los JS, íconos y manifest.
- Al activar: limpia caches viejos.
- **Regla crítica:** cada vez que cambien assets (JS, CSS, HTML), bumpear `CACHE_NAME`.

---

## 10. Reglas innegociables (ADN del proyecto)

Ver [`/CLAUDE.md`](../CLAUDE.md) sección 3 - es la fuente única de verdad de las reglas ADN (evita mantener dos copias que se desincronizan). Resumen:

1. Vanilla JS sin build step. 2. Offline-first. 3. Sin servidor (`localStorage`, clave `fk_v1`). 4. Singleton `S` mutable. 5. `save()` debounced. 6. Migraciones idempotentes. 7. Cero `onclick=""`. 8. Cero `window.X`. 9. `logic.js` sin DOM. 10. Ningún dominio importa a otro. 11. Lenguaje humano, neutral y profesional. 12. Constantes legales con fecha de revisión.

Cambiar cualquiera de estas reglas requiere crear un ADR en `docs/DECISIONS/`.

---

## 11. Convenciones de naming

| Elemento | Convención | Ejemplo |
|---|---|---|
| Dominios | Español neutro | `gastos`, `compromisos`, `tesoreria` |
| Infra y UI | Inglés | `state`, `storage`, `render`, `actions` |
| Archivos CSS | kebab-case | `tokens.css`, `main.css` |
| Variables CSS | `--fk-*` | `--fk-accent`, `--fk-space-4` |
| Eventos EventBus | `dominio:acción` | `state:change`, `distribucion:aplicar` |
| `data-action` | kebab-case verbo-sustantivo | `guardar-gasto`, `editar-deuda` |
| Commits | `tipo(área): descripción` | `feat(gastos): agregar detector de hormigas` |

---

## 12. Árbol de dependencias entre módulos

```
core/constants.js   (sin dependencias)
core/state.js       ← constants.js
core/storage.js     ← state.js, constants.js

infra/utils.js       ← state.js
infra/a11y.js         (sin dependencias de dominio)
infra/crud.js        ← state.js, storage.js
infra/render.js      ← state.js
infra/router.js      ← state.js, EventBus
infra/financiero.js   (sin dependencias de dominio, funciones puras)
infra/cuenta-helper.js ← infra/utils.js
infra/icons.js         (lee el sprite de index.html)

ui/shell.js         ← infra/render.js, infra/router.js
ui/modales.js       ← infra/a11y.js
ui/actions.js       ← (registra handlers de todos los dominios)
ui/bootstrap.js     ← todo lo anterior + todos los dominios

dominio/*/logic.js  ← core/state.js, core/constants.js, infra/utils.js, infra/financiero.js
dominio/*/view.js   ← logic.js, infra/render.js, infra/icons.js, infra/cuenta-helper.js
dominio/*/index.js  ← logic.js, view.js, EventBus
```

**Regla:** ningún `dominio/X` importa de `dominio/Y`. La comunicación cross-dominio va por `EventBus` (ver sección 6).
