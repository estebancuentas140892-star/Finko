# Arquitectura - Finko Claude

> Documento vivo. Se actualiza cuando cambia una capa, se agrega un dominio, se mueve un archivo de estilos o se introduce un patrón nuevo.
> Última revisión: 2026-07-29 (DIS.19 suma `infra/bolsas.js`, `infra/portafolio.js` y `ui/comparador.js`). Antes: 2026-07-24 (absorbe el mapa operativo del ex `MAPA.md` como sección 13).
>
> **Dos preguntas distintas, dos mitades:** las secciones 1 a 12 responden **cómo está construido** el sistema (capas, dominios, eventos, reglas técnicas). La sección 13 responde **dónde está cada cosa y cómo localizarla** (sección visible → carpeta, índice de estilos, síntoma → dónde mirar). Si vienes a arreglar algo y no sabes por dónde empezar, ve directo a la 13.

## Índice

| Sección | Responde |
|---|---|
| [1. Visión general](#1-visión-general) | qué tipo de aplicación es y cómo se reparte en carpetas |
| [2. Capas y responsabilidades](#2-capas-y-responsabilidades) | qué hace cada archivo de `core/`, `infra/` y `ui/`, y los 18 dominios |
| [3. Flujo de datos](#3-flujo-de-datos) | la secuencia invariante desde el clic hasta el re-render |
| [4. Estado - Singleton `S`](#4-estado---singleton-s) | cómo se lee y se muta el estado, y qué está prohibido |
| [5. Persistencia](#5-persistencia---storagejs) | `localStorage`, el debounce de `save()` y el patrón de migración |
| [6. Sistema de eventos](#6-sistema-de-eventos---eventbus) | los 9 eventos reales, quién los emite y quién los escucha |
| [7. HTML - contrato de eventos](#7-html---contrato-de-eventos) | por qué no hay `onclick` y cómo funciona `data-action` |
| [8. CSS - capas `@layer`](#8-css---capas-layer) | el orden de cascada, el sistema de íconos SVG y la tipografía |
| [9. PWA y Service Worker](#9-pwa-y-service-worker) | qué se precachea y cuándo hay que bumpear `CACHE_NAME` |
| [10. Reglas innegociables](#10-reglas-innegociables-adn-del-proyecto) | las 12 reglas del ADN (fuente única en `CLAUDE.md`) |
| [11. Convenciones de naming](#11-convenciones-de-naming) | cómo se nombra un dominio, un token, un evento, un commit |
| [12. Árbol de dependencias](#12-árbol-de-dependencias-entre-módulos) | qué puede importar a qué, y la regla de no acoplar dominios |
| **[13. Mapa operativo](#13-mapa-operativo-dónde-vive-cada-cosa)** | **dónde tocar por sección visible, estilos, tests y síntoma → dónde mirar** |

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
| `svg.js` | Gráficos SVG generados: `sparkline`/`donut` para Análisis, `progressRing`/`arcoProgreso` y `siluetaMeta` (silueta que se llena por altura, DIS.19) |
| `bolsas.js` | El plan de aportes de una bolsa con fecha: `diasHastaFecha`, `planDeReferencia`, `estadoDeBolsa`. Lo comparten Apartados y la casa de Ahorro (DIS.19), primer paso de ARQ.1 |
| `portafolio.js` | Lo invertido, su proyección al vencimiento y la geometría del gráfico de dos columnas: de `esProyectable` a `columnasPortafolio`. Lo comparten Inversión y la casa de Ahorro (DIS.19) |
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
| `comparador.js` | Columnas comparables de varias bolsas contra la marca de su plan: `htmlComparador()` + `pieComparador()`. Puro, sin DOM. Lo comparten la lista de Apartados y la casa de Ahorro (DIS.19) |
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
| `accesos/` | Accesos rápidos personalizables de Inicio (IN.4a, [ADR 028](DECISIONS/028-inicio-centro-de-control.md) D2) | sin colección propia en `S`: lee y escribe `S.config.accesosInicio` (array de ids) |
| `agenda/` | Gastos fijos y calendario de pagos (sección visible "Calendario") | |
| `ahorro/` | Fondo de emergencia + hábito de aportar, **más la casa de Ahorro** (la pantalla `#ahorro` que reúne las cuatro modalidades, DIS.18) | el fondo vive en `#fondo` desde DIS.18: `#ahorro` es la casa ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)) |
| `analisis/` | Salud financiera, patrimonio neto, gráficos, comparaciones | |
| `apartados/` | Sobres para gastos previsibles (SOAT, impuestos, etc.) | |
| `compromisos/` | Gastos fijos + deudas (Avalancha/Bola de nieve) + agenda de pagos | `view.js` partido en `views/` (alertas, dashboard, estrategia, estrategia-impacto, formularios, lista); `logic.js` partido en `logic/` (modelo, alertas, estrategia, abonos), ambos con barrel |
| `config/` | Ajustes, perfil, exportar/importar backup completo | sin `logic.js` propio |
| `export/` | Serialización de gastos a CSV (`gastosACSV`) | solo `logic.js`, sin UI propia (se invoca desde `config`) |
| `gastos/` | Gastos variables, categorías, detector de hormigas | |
| `import/` | Importación de gastos desde CSV con preview y detección de duplicados | |
| `inversiones/` | Portafolio real (CDT, fondo, cripto, acciones) | |
| `logros/` | Sistema de logros y rachas (gamificación) | sin `view.js` propio (toast) |
| `metas/` | Objetivos de ahorro con fecha límite | |
| `movimientos/` | Ledger unificado: deriva la actividad de gastos, ingresos puntuales, aportes y transferencias | sin colección propia, es una vista derivada; las acciones de cada fila las delega al dominio dueño según `m.tipo` |
| `personales/` | Préstamos que el usuario otorga a terceros ("Me deben") | |
| `presupuesto/` | Límites de gasto (envelope budgeting) por categoría y por grupo financiero | |
| `resumen/` | Card de resumen semanal en Inicio (agregación de solo lectura) | |
| `tesoreria/` | Cuentas bancarias, ingresos, "Distribuir mi ingreso" (sección visible "Mis cuentas") | dividido por subsistema: `logic/`, `views/` y `acciones/` con `cuentas.js`, `ingresos.js` y `distribucion.js` cada una; `logic.js`/`view.js` son barrels |

> Para ubicar rápido qué archivo tocar por sección visible, estilos y test, ver la **sección 13 (mapa operativo)** de este mismo documento.

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

Los 10 eventos reales del sistema (verificados contra el código el 2026-08-02; no hay otros):

| Evento | Quién lo emite | Quién lo escucha |
|---|---|---|
| `state:change` | `infra/crud.js` tras cualquier mutación genérica; también dominios con lógica propia (`tesoreria/`, `ahorro/`) | `render.js` (re-render inteligente por sección) |
| `state:save` | `storage.js` tras cada guardado exitoso | feedback UI opcional |
| `theme:change` | `ui/shell.js` al alternar modo oscuro/claro | listeners de tema |
| `onboarding:completado` | `ui/onboarding.js` al cerrar el wizard | `bootstrap.js` |
| `distribucion:aplicar` | `tesoreria/index.js` al confirmar "Distribuir mi ingreso" | `ahorro/`, `metas/`, `apartados/`, `inversiones/`, `compromisos/` (cada uno aplica su porción de `items` y descuenta la cuenta de origen) |
| `distribuir:abrir` | `agenda/index.js` y `tesoreria/acciones/distribucion.js` | `tesoreria/index.js` (abre el asistente de distribución desde otra sección sin importarla) |
| `lote:abrir` | `compromisos/index.js` desde el bloque "Pendientes del mes" de Inicio (CAL.5b), con `{ mes: 'YYYY-MM' }` | `agenda/index.js` (abre el modal de pago en lote sin navegar; el set de pagos lo decide Agenda, su dueña) |
| `cuenta:crear` | `infra/cuenta-helper.js` y `ui/actions.js` cuando una acción necesita una cuenta y no hay ninguna | `tesoreria/acciones/cuentas.js` (abre el formulario de cuenta nueva) |
| `storage:cuota` | `core/storage.js` cuando el uso de `localStorage` deja de estar en nivel `ok` | `config/index.js` (aviso de cuota en Ajustes) |
| `storage:error` | `core/storage.js` cuando un guardado falla | `config/index.js` (aviso de error de persistencia) |

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

Ver [`/CLAUDE.md`](../CLAUDE.md) sección 4 - es la fuente única de verdad de las reglas ADN (evita mantener dos copias que se desincronizan). Resumen:

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

---

## 13. Mapa operativo: dónde vive cada cosa

Índice de navegación rápida. Mientras las secciones 1 a 12 explican **cómo está construido** el sistema, esta responde **dónde está** y **qué mirar primero**, sin depender de memoria. Absorbe el ex `docs/MAPA.md` (fusionado el 2026-07-24).

### 13.1 Sección visible → carpeta real

En la app, el nombre visible de una sección casi nunca coincide con el nombre de su carpeta:

| Ves en la app | Carpeta real |
|---|---|
| Inicio | `dash` (no tiene dominio propio, ver 13.2) |
| Gastos | `gastos` |
| Calendario | `agenda` |
| Deudas | `compromisos` (incluye también gastos fijos, no solo deudas) |
| Mis cuentas | `tesoreria` |
| Me deben | `personales` |

### 13.2 "Inicio" no es un dominio

El dashboard (`#dash`) no tiene carpeta propia en `modules/dominio/`: es una composición de widgets que sí pertenecen a otros dominios (`resumen/`, `movimientos/`, `accesos/`, `logros/`, alertas de `presupuesto/`, vencidos de `compromisos/` + `agenda/`, nudge de distribución de `tesoreria/`). Si algo se ve mal en Inicio, casi siempre hay que mirar el dominio dueño del dato, no un archivo "dash" que no existe.

### 13.3 Dónde tocar por sección: archivos, estilos y test

**Convención de la columna "Archivos clave":** "los 3 estándar" significa `logic.js`, `view.js` e `index.js`, el patrón universal descrito en la sección 2.4. Solo se detalla cuando el dominio se aparta de ese patrón, y el detalle del corte (qué archivo hay dentro de cada carpeta) vive en la tabla de dominios de la 2.4, no acá: esta columna dice **qué abrir primero**, no cómo está partido.

| Sección visible | Carpeta (`modules/dominio/`) | Archivos clave | Estilos (`styles/components/`) | Test unitario |
|---|---|---|---|---|
| Inicio | *(sin carpeta propia, ver 13.2)* | `ui/bootstrap.js`, `infra/render.js` | `domain.css` (hero-saldo, vencidos-card, prioridades-card, resumen-card, balance-tira, limites-card) | `resumen.test.js`, `render.test.js` |
| Gastos | `gastos/` | los 3 estándar | `domain.css` (mes-nav, filtros-bar/chip, gastos-resumen) | `gastos.test.js` |
| Calendario | `agenda/` | los 3 estándar | `config.css` (bloque AGENDA, línea 449) | `agenda.test.js` |
| Deudas | `compromisos/` | entrar por `logic/` o `views/` según el corte de la 2.4; `index.js` es el wiring | `charts.css` (chooser entidad/personal, estrategia de pago), `domain.css` (abono-btn, cal-detail) | `compromisos.test.js`, `estrategia-pago.test.js` (e2e) |
| Mis cuentas | `tesoreria/` | entrar por `logic/`, `views/` o `acciones/` según el subsistema (ver 2.4); `index.js` es el coordinador | `domain.css` (ingresos-card, distribucion-rows/clasicos) | `tesoreria.test.js`, `cuenta-helper.test.js`, `distribuir-pago.test.js` |
| Apartados | `apartados/` | los 3 estándar | `domain.css` (bloque APARTADOS línea 530, form rediseño línea 1305) | `apartados.test.js` |
| Ahorro (la casa, `#ahorro`) y Fondo de emergencia (`#fondo`) | `ahorro/` | los 3 estándar | `domain.css` (`.casa-ahorro__*`), `analysis.css` (bloque J.1/J.1b) | `ahorro.test.js`, `hub-ahorros.test.js` (e2e), `ahorro-inversion.test.js` (e2e) |
| Presupuesto | `presupuesto/` | los 3 estándar | `analysis.css` (D.5 envelope budgeting, MC.8b) | `presupuesto.test.js` |
| Metas | `metas/` | los 3 estándar | `analysis.css` | `metas.test.js` |
| Me deben | `personales/` | los 3 estándar | `domain.css` (personales-resumen) | `personales.test.js` |
| Inversiones | `inversiones/` | los 3 estándar | `analysis.css` (bloque J.2a/J.2b/J.2c) | `inversiones.test.js` |
| Análisis | `analisis/` | los 3 estándar | `analysis.css` (panel completo: bento, métricas, salud, patrimonio, proyección) | `analisis.test.js` |
| Configuración | `config/` | `index.js`, `view.js` (sin `logic.js` propio) | `config.css` (bloque CONFIGURACION línea 7) | *(sin test unitario dedicado, ver `import.test.js`/`export.test.js`)* |
| *(sin sección propia)* | `export/` | `logic.js` (invocado desde `config`) | | `export.test.js` |
| *(sin sección propia)* | `import/` | los 3 estándar | `charts.css` (bloque IMPORT CSV línea 154) | `import.test.js` |
| *(toast, sin vista propia)* | `logros/` | `logic.js`, `index.js` | `nudges.css` (bloque LOGRO TOAST línea 127) | `logros.test.js` |
| *(card en Inicio)* | `resumen/` | los 3 estándar | `domain.css` (RESUMEN-CARD línea 1070) | `resumen.test.js` |
| Movimientos (card "Actividad reciente" en Inicio + ruta `#movimientos` sin ícono de nav) | `movimientos/` | los 3 estándar (TX.8a panel, TX.8b vista completa, [ADR 028](DECISIONS/028-inicio-centro-de-control.md)) | `domain.css` (ACTIVIDAD-RECIENTE, MOVIMIENTOS), `atoms.css` (`.list-item__amount--ingreso`) | `movimientos.test.js` |
| Accesos rápidos (tiles bajo el hero de Inicio + modal "Personalizar") | `accesos/` | los 3 estándar (IN.4a, [ADR 028](DECISIONS/028-inicio-centro-de-control.md)) | `domain.css` (ACCESOS-INICIO), `atoms.css` (`.accesos-row*`) | `accesos.test.js` |

### 13.4 Índice de estilos por widget (`styles/components/`)

Estos archivos **no están organizados por dominio**, sino por tipo de widget o patrón visual, y varios widgets se comparten entre secciones a propósito (evita duplicar CSS). Antes de buscar a ciegas, revisar esta tabla:

| Archivo | Qué agrupa |
|---|---|
| `atoms.css` | Chips, badges, list items, empty state, spinner, divisor, progress bar, toggle, teja de categoría (`cat-teja`, ID.3) |
| `buttons.css` | Botones y cards genéricas |
| `charts.css` | Sparkline + donut, modal de importar CSV, chooser entidad/personal, estrategia de pago de deudas |
| `config.css` | Configuración (perfil, notificaciones, datos, acerca de), install PWA, Agenda/Calendario |
| `domain.css` | Grupo grande y heterogéneo: calculadoras (posible código muerto, ver nota abajo), herramienta-inline, ingresos-card, mes-nav, filtros-bar/chip, distribución de ingreso, gastos-resumen, apartados, abono a deudas, cuenta-picker/multi/sel (compartido por Gastos/Deudas/Apartados/Metas), widgets de Inicio (hero-saldo, vencidos-card, prioridades-card, actividad-reciente, resumen-card, balance-tira, limites-card), personales-resumen, form de apartados, casa de Ahorro, banner-propósito (compartido por las 10 secciones) |
| `forms.css` | Sistema de íconos SVG de línea, inputs/formularios |
| `nudges.css` | Sistema de nudges (5 niveles), logro toast, bank avatar/picker, badges de dominio |
| `analysis.css` | Todo el panel de Análisis: bento, métricas, salud financiera, presupuesto, ahorro, inversión, gastos, patrimonio |

Capas base (sin agrupar por widget, aplican a toda la app): `reset.css`, `base.css`, `tokens.css`, `layout.css`, `modals.css`, `themes.css`, `a11y.css`, `responsive.css`, `utils.css`. Ver el orden de cascada en [`styles/main.css`](../styles/main.css) y la tabla de `@layer` en la sección 8.

**Nota:** `.calc-*` (calculadoras) en `domain.css` líneas 7-190 puede ser código muerto: la sección "Calculadoras" se retiró de la app en 2026-06-07 y sus fórmulas migraron a `infra/financiero.js`. Verificar uso real antes de tocar o borrar.

### 13.5 Síntoma → dónde mirar

| Síntoma | Mirar primero |
|---|---|
| Un dato no se guarda o desaparece al recargar | `core/storage.js` (persistencia + migraciones), `core/state.js` (singleton `S`) |
| Un botón no responde al clic | `ui/actions.js` (único lugar con `data-action` delegado) |
| Un modal no abre, no cierra, o el foco se pierde | `ui/modales.js`, `infra/a11y.js` (`trapFocus`/`releaseFocus`) |
| La navegación entre secciones no cambia la vista | `infra/router.js` |
| Un cálculo financiero da un número raro | `infra/financiero.js` (fórmulas puras: CDT, crédito, interés compuesto, regla 72) o `logic.js` del dominio afectado |
| El selector de cuenta no aparece o elige mal | `infra/cuenta-helper.js` (patrón 0/1/varias cuentas, usado por Gastos/Deudas/Apartados/Metas) |
| Un pago se reparte mal entre cuentas | `infra/distribuir-pago.js` |
| Falta un ícono o aparece el símbolo genérico | `infra/icons.js`, sprite SVG inline en `index.html` |
| El banco no se detecta o el logo no aparece | `infra/bancos.js`, `infra/marcas.js` |
| Un formulario no valida o no muestra el error | `infra/form-errors.js` |
| Falta una notificación de compromiso próximo | `infra/notificaciones.js` |
| El CSV de gastos no importa/exporta bien | `infra/csv.js`, `dominio/import/`, `dominio/export/` |
| Algo se ve mal visualmente | usar la tabla de 13.4 para ubicar el archivo CSS, luego buscar la clase por nombre (`grep -n "\.clase-buscada" styles/components/*.css`) |
| El Service Worker sirve una versión vieja | `service-worker.js`, revisar el número de versión de cache (runbook 3 de [`OPERACION.md`](OPERACION.md)) |

### 13.6 Cómo agregar un dominio nuevo

1. Crear `modules/dominio/<nombre>/` con los 3 archivos del patrón estándar de la sección 2.4. Ver un dominio existente como referencia, ej. `gastos/`.
2. Si la vista supera ~300 líneas, o si el dominio entero crece, aplicar el corte que describe la sección 2.4 (`views/` con barrel, o las tres capas por subsistema) y sumar los archivos nuevos al precache de `service-worker.js`.
3. Agregar los estilos nuevos: si son exclusivos del dominio, en un bloque nuevo dentro del archivo de `styles/components/` que mejor encaje temáticamente (ver 13.4); si son un patrón reutilizable, considerar si ya existe algo similar antes de duplicar.
4. Registrar el dominio en `ui/bootstrap.js` y la navegación en `index.html`.
5. Crear `tests/unit/<nombre>.test.js`.
6. Actualizar la tabla de dominios de la sección 2.4 y las tablas 13.3 y 13.4 de este documento.
