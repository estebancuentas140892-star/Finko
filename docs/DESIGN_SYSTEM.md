# Design System - Finko Claude

> Documento vivo. Se actualiza al agregar nuevos tokens o componentes.
> Última revisión: 2026-07-26 (R9 a R11, auditoría de diseño de Gastos; antes R19 a R22 de la de Me deben, R7 y R8 de la de Deudas, R1 a R6 de la de Inicio, radio protagonista y [ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md)).
> Fuente de verdad: los archivos CSS. Si este doc y `tokens.css` difieren, manda `tokens.css` (y hay que actualizar este doc).

---

## Principios de diseño

1. **Claridad sobre estética** - Si hay duda entre lo bonito y lo claro, gana lo claro.
2. **Lenguaje humano, neutral y profesional** - "Tu dinero disponible hoy" antes que "Saldo disponible" (ADN regla 11, [ADR 003](DECISIONS/003-tono-neutral-profesional.md)).
3. **Modo oscuro por defecto** - Reduce fatiga visual en uso prolongado. Modo claro de primera clase, no un derivado.
4. **WCAG AA mínimo** - Texto principal con contraste >= 4.5:1 en ambos temas. Lighthouse Accessibility 100 es innegociable.
5. **Responsive real** - Cada componente funciona en 320px y en 1440px.
6. **Tokens siempre** - Nunca hardcodear colores, espaciados ni tamaños. Solo `var(--fk-*)`.
7. **"Calma con energía"** (rediseño 2026) - Superficies tranquilas con mucho aire; el acento esmeralda se reserva para dinero disponible, progreso y éxito. Cero glow neón.

**R10 · El título nombra el periodo que se está viendo:** una cifra y su periodo se leen juntos. Si la pantalla deja navegar entre periodos, el label dice cuál ("Gastaste en junio"), nunca un "este mes" fijo; con un filtro aplicado, dimensión más periodo ("Café en junio"), nunca la dimensión sola. Origen: el hero de Gastos decía "Gastaste este mes" en cualquier mes navegado, y a 30px de distancia su propia nav decía "Junio 2026" y su chip comparativo, "8% más que mayo".

**R20 · El ojo no tiene excepciones:** toda vista que pinte montos lee `S.config.ocultarSaldo` (IN.2), el único control de privacidad de la app. Máscara larga (`SALDO_MASCARA`) para totales y heros, corta (`SALDO_MASCARA_CUENTA`) por fila y en las cifras dentro de hints. Las barras y anillos de proporción se conservan: muestran porcentaje, no magnitud. Origen: Me deben, la lista más sensible (cuánto te debe la tía, por su nombre propio), era la única sección con dinero que ignoraba el flag.

---

## Fuentes

**Una sola fuente: Inter Variable**, self-hosted en `assets/fonts/inter-variable.woff2` (pesos 100-900 en un archivo, `font-display: swap`, cero peticiones externas: compatible con CSP `font-src 'self'` y el modo offline del SW).

- Los **montos** usan Inter con `font-variant-numeric: tabular-nums` (cifras tabulares), peso 600-700. No existe fuente monoespaciada: `--fk-font-mono` es un alias de `--fk-font-sans` (DM Mono se eliminó en el rediseño 2026, fase F1).

```css
font-family: var(--fk-font-sans);  /* Inter + fallbacks system-ui */
```

---

## Paleta de colores

### Marca

| Token | Oscuro (default) | Claro (`body.light-theme`) | Uso |
|---|---|---|---|
| `--fk-accent` | `#1fd194` | `#13b377` | CTA principal, valor positivo, dinero disponible |
| `--fk-accent-hover` | `#38dca6` | (hereda) | Estado hover del acento |
| `--fk-accent-subtle` | `rgba(31,209,148,0.12)` | `rgba(19,179,119,0.10)` | Fondo de chips y celdas accent |
| `--fk-accent-border` | `rgba(31,209,148,0.32)` | `rgba(19,179,119,0.28)` | Bordes de elementos accent |

### Fondos

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fk-bg-base` | `#101218` | `#f6f7fa` | Fondo principal de la app |
| `--fk-bg-surface` | `#181b23` | `#ffffff` | Cards, sidebar, modales |
| `--fk-bg-elevated` | `#20242f` | `#eef1f8` | Cards dentro de cards, inputs |
| `--fk-bg-hover` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | Hover de filas y botones ghost |
| `--fk-bg-active` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Estado presionado |
| `--fk-bg-glass` | `rgba(22,25,34,0.7)` | `rgba(255,255,255,0.75)` | Superficies translúcidas (topbar) |
| `--fk-bg-overlay` | `rgba(0,0,0,0.65)` | (hereda) | Fondo del overlay de modal |

### Texto

| Token | Uso |
|---|---|
| `--fk-text-primary` | Títulos, valores importantes (`#e9ebf3` oscuro / `#1a1d27` claro) |
| `--fk-text-secondary` | Párrafos, labels |
| `--fk-text-muted` | Texto de apoyo, placeholders (calibrado a AA sobre bg-base en ambos temas) |
| `--fk-text-disabled` | Deshabilitado (exento de WCAG; ver COL.2 en [BOARD.md](BOARD.md)) |
| `--fk-text-accent` | Texto verde (`#4bd99b` oscuro / `#006b3d` claro) |
| `--fk-text-on-accent` | Texto sobre botón de acento (`#08120d` oscuro / `#fff` claro) |

### Semánticos

| Token base | Oscuro | Claro | Uso |
|---|---|---|---|
| `--fk-success` | `#25cf86` | `#006b3d` | Pagado, positivo, logro. Desacoplado de la marca a propósito |
| `--fk-warning` | `#ffb82e` | `#a06800` | Pendiente, por vencer (claro: ver COL.1 en [BOARD.md](BOARD.md)) |
| `--fk-danger` | `#ff4757` | `#c0202f` | Vencido, error, incumplimiento. **No** se usa para el gasto normal (ver criterio de color abajo) |
| `--fk-info` | `#3d8aff` | `#1a5fd4` | Educativo, contexto neutral |
| `--fk-amber` | `#f59e0b` | (hereda) | Warning cálido (ej. duplicados en import) |

Cada semántico tiene par `--fk-{nombre}-bg` y `--fk-{nombre}-text`.

**Criterio semántico de color (ADR 019 + AUD.4):** verde = logro, ámbar = advertencia, rojo = incumplimiento. **Gastar no es incumplir:** los totales de gasto y las variaciones al alza van en neutro (`--fk-text-primary`), nunca en rojo. Bajar el gasto sí se celebra en verde.

### Colores por dominio (`--fk-dom-*`)

Reconocimiento visual inmediato de cada sección ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md)). Croma armonizado: ningún hue grita más que el resto, y cada par vecino se separa por matiz **y** luminosidad (no solo saturación), para que siga siendo discriminable con daltonismo.

| Token | Oscuro (default) | Claro (`body.light-theme`, solo `-text`) | Sección |
|---|---|---|---|
| `--fk-dom-ingresos` | `#1fd194` | `-text: #13815b` | Ingresos (= acento de marca) |
| `--fk-dom-gastos` | `#ff8a5c` | `-text: #d13b00` | Gastos |
| `--fk-dom-compromisos` | `#ea5385` | `-text: #db1b5a` | Deudas (frambuesa; antes `#ff4757`, idéntico a `--fk-danger`) |
| `--fk-dom-tesoreria` | `#5b95f0` | `-text: #1a6bea` | Mis cuentas |
| `--fk-dom-metas` | `#9d73eb` | `-text: #844fe6` | Metas |
| `--fk-dom-analisis` | `#8f9bb3` | `-text: #627291` | Análisis (pizarra neutra; antes `#2fd2bf` turquesa) |
| `--fk-dom-presupuesto` | `#f3b740` | `-text: #98680a` | Límites de gasto |
| `--fk-dom-personales` | `#f06fc2` | `-text: #d41690` | Me deben |
| `--fk-dom-ahorro` | `#38c98c` | `-text: #238059` | Ahorro |
| `--fk-dom-inversion` | `#2fd2bf` | `-text: #1c7f74` | Inversión (turquesa; hereda el matiz que Análisis dejó libre; antes `#4db8d8`) |
| `--fk-dom-agenda` | `#7d8cf0` | `-text: #4f64eb` | Calendario (índigo, token nuevo) |

**Rampa de cada dominio (2 acompañantes, IV.1):**

- **`--fk-dom-X-bg`**: `color-mix(in srgb, var(--fk-dom-X) 12%, transparent)`. Mismo valor en ambos temas (a 12% compone bien sobre superficie oscura y clara). Fondo de tejas y celdas, donde el contenido encima es icono/glifo (umbral 3:1, WCAG 1.4.11).
- **`--fk-dom-X-text`**: variante segura como texto o UI significativa (glifos, dots, badges). En oscuro es igual a `--fk-dom-X` (ya pasa AA ahí). En claro se sobreescribe en `body.light-theme`: el valor crudo fallaba WCAG AA sobre blanco (varios por debajo de 2:1, ver tabla arriba).
- **Opacidad del fondo cuando lleva texto real encima (hallazgo IV.2a):** 12% + `-text` cae a 4.22-4.46:1 en tema claro para varios dominios (por debajo del 4.5:1 de WCAG 1.4.3). `.dom-badge--*` (texto real, no solo icono) usa 6% en vez de 12% (peor caso medido: 4.54:1). Regla: contenido de texto → ~6%; glifo/icono decorativo → 12-14% está bien.
- El token base `--fk-dom-X` se reserva para acentos decorativos (bordes finos, franjas) que ya van acompañados de icono/etiqueta y por eso quedan exentos del umbral de contraste no textual (SC 1.4.11).

**R6 · El acento no mide gasto** ([ADR 054](DECISIONS/054-el-acento-no-mide-gasto.md)): toda magnitud de gasto va en familia `--fk-dom-gastos` o en neutro; `--fk-accent` queda para dinero disponible, progreso y logro (principio 7). El chip que celebra una **bajada** sí va verde: es logro, no magnitud.

**R3 · Fondo y glifo nunca del mismo tono:** teja de dominio = fondo `color-mix(in srgb, var(--fk-dom-X) 14%, transparent)` + glifo `var(--fk-dom-X-text)`. Mismo tono en ambos deja el trazo invisible sobre su propio fondo. Un punto sólido sin dibujo (`.cal-dot--*`) puede compartirlo; un chip con icono, nunca.

### Nudges (5 niveles)

Tokens `--fk-nudge-{nivel}-{bg|border|accent}` construidos con `color-mix()` sobre los semánticos. Niveles: `critical` (danger), `high` (dom-gastos), `medium` (warning), `info` (info), `success` (success). Clases: `.nudge`, `.nudge-critical|high|medium|info|success`.

---

## Escala de espaciado (base 4px)

`--fk-space-1` (4px) · `-2` (8px) · `-3` (12px) · `-4` (16px) · `-5` (20px) · `-6` (24px) · `-8` (32px) · `-10` (40px) · `-12` (48px) · `-16` (64px) · `-20` (80px).

Alias t-shirt: `--fk-space-xs` (8px), `-sm` (12px), `-md` (16px), `-lg` (24px), `-xl` (32px).

---

## Escala tipográfica

| Token | rem | px | Uso |
|---|---|---|---|
| `--fk-text-xs` | 0.75 | 12 | Labels muy pequeñas, helpers |
| `--fk-text-sm` | 0.875 | 14 | Labels, botones, texto de soporte |
| `--fk-text-base` | 1 | 16 | Texto base del cuerpo |
| `--fk-text-lg` | 1.125 | 18 | Subtítulos, intros |
| `--fk-text-xl` | 1.25 | 20 | Títulos de sección pequeños |
| `--fk-text-2xl` | 1.5 | 24 | Títulos de sección |
| `--fk-text-3xl` | 1.875 | 30 | Valores monetarios grandes |
| `--fk-text-4xl` | 2.25 | 36 | Títulos hero, saldo principal |

Pesos: `--fk-font-light` (300) a `--fk-font-extrabold` (800). Altura de línea: `--fk-leading-tight` (1.25) a `--fk-leading-relaxed` (1.625). Existen alias `--fk-fs-*` y `--fk-fw-*`.

---

## Border radius

| Token | Valor | Uso |
|---|---|---|
| `--fk-radius-sm` | `6px` | Inputs, chips pequeños |
| `--fk-radius-md` | `10px` | Botones, tags |
| `--fk-radius-lg` | `16px` | Cards principales |
| `--fk-radius-xl` | `24px` | Celdas Bento, modales |
| `--fk-radius-full` | `9999px` | Pills, badges, avatares |

**Radio protagonista:** el bloque protagonista de una sección usa `--fk-radius-xl`; todo panel secundario, `--fk-radius-lg`. El hero de Inicio (24px) sobre paneles de 16px es intención, no deriva.

---

## Sombras y elevación

Elevación sutil, **sin glow neón** (el look "neón sobre negro" se retiró en el rediseño 2026).

| Token | Uso |
|---|---|
| `--fk-shadow-sm` | Cards sutiles, elevación mínima |
| `--fk-shadow-md` | Cards en hover, dropdowns |
| `--fk-shadow-lg` | Modales, overlays |
| `--fk-shadow-glow` | Anillo de acento fino (1.5px de borde accent + sombra suave); **no** es glow luminoso |

En modo claro las sombras van tintadas hacia azul-tinta (`rgba(26,32,60,...)`) en vez de gris sucio.

---

## Transiciones y movimiento

- `--fk-transition-fast` (120ms) · `-base` (200ms) · `-slow` (350ms), easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- Animar solo `transform`/`opacity` (compositor), nunca layout.
- **Toda animación respeta `prefers-reduced-motion`.**
- El cambio de tema usa la técnica `.theme-transitioning` (crossfade de 280ms sobre ~30 contenedores acotados, no `*`, para no causar lag en móvil).

---

## Iconografía

**Familia propia "Finko Icons"** ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)), en migración por fases desde el híbrido emoji/SVG anterior:

- **Lenguaje:** línea sobre grid 24 (trazo 2, terminaciones redondeadas), **duotono** (la región "cuerpo" de la metáfora lleva `fill="currentColor" fill-opacity=".15"` como atributo del símbolo) y **punto de valor** (un círculo sólido r 1.2-1.6 integrado en la metáfora: la ventana de la casa, el día marcado, la moneda). Glifos utilitarios (x, chevron, edit, trash...) quedan monolínea sin duotono ni punto.
- **Sprite:** inline en `index.html` (`<symbol id="i-*">`, `currentColor`), consumido vía `icon('i-*')` de `infra/icons.js`. Los atributos `fill` atraviesan `<use>` sin CSS adicional, así que el duotono se tiñe solo con el color del contexto (nav activa, tarjetas de dominio, empty states).
- **Estado de migración:** navegación (ID.1) y resto de la UI estructural (ID.2) redibujadas; categorías con tinte por dominio quedan para ID.3 (ahí se retiran los catálogos de emoji y se actualiza el guardarraíl TX.4). Mientras tanto los **emojis** siguen en categorías de dominio, logros, celebraciones y tips, con su regla de consistencia vigente: la misma etiqueta compartida entre catálogos usa el mismo emoji en toda la app.
- **Iconos chicos:** `.icon--sm` (16px) para iconos en línea con texto xs/sm (subtítulos, badges, selectores de opción), evita que el `.icon` base (20px) domine una etiqueta pequeña.

### Escala de tamaños (tokens `--fk-icon-*`, 2026-07-05)

Todos los tamaños de icono salen de esta escala (definida en `styles/tokens.css`); ningún componente declara un tamaño suelto. El trazo efectivo de un icono de línea es `stroke × (tamaño / 24)`: por eso el piso es 16px (bajo eso el trazo baja de ~1.5px y pierde nitidez en pantallas 1x o de baja resolución).

| Token | Tamaño | Contexto |
|---|---|---|
| `--fk-icon-xs` | 16px | Inline con texto xs/sm: badges, hints, `.icon--sm`, volver de la hoja Registrar |
| `--fk-icon-sm` | 18px | Acciones secundarias de fila: editar, borrar |
| `--fk-icon-md` | 20px | Base (`.icon`): filas, formularios, cerrar modal, accesos rápidos, chips de vencidos |
| `--fk-icon-lg` | 24px | Navegación (sidebar y bottom-nav), FAB Registrar, ojo del hero, nudges SVG. Estándar Material 3 / Apple HIG |
| `--fk-icon-xl` | 28px | Launchers y heroes de sección: menú Más, chooser de estrategia, heroes de Ahorro/Inversión |
| `--fk-icon-2xl` | 32px | Tejas de la hoja Registrar, icono del hero de saldo |
| `--fk-icon-3xl` | 48px | Empty states y guías (`.icon--lg`) |

Tejas (contenedor redondeado del glifo de categoría o marca, glifo interno al ~62% del lado): `--fk-teja-md` 32px en superficies compactas (detalle del calendario, picker, hints) y `--fk-teja-lg` 36px en filas de lista, el contexto de reconocimiento primario.

Accesibilidad: bajo `prefers-contrast: more` el trazo de toda la familia sube un paso (2.35 → 2.6 en base; ver `styles/a11y.css`) conservando la jerarquía entre escalas.

---

## Componentes

### Botones

```html
<button class="btn btn-primary">Guardar</button>
<button class="btn btn-secondary">Cancelar</button>
<button class="btn btn-accent">Ver detalle</button>
<button class="btn btn-ghost">Ignorar</button>
<button class="btn btn-danger">Eliminar</button>

<!-- Tamaños -->
<button class="btn btn-primary btn-sm">Pequeño</button>
<button class="btn btn-primary btn-lg">Grande</button>

<!-- Icono -->
<button class="btn btn-icon btn-ghost" aria-label="Cerrar">✕</button>
```

**Regla de uso:** un solo `.btn-primary` visible por sección. Los demás deben ser secondary o ghost.

**R8 · Confirmar un movimiento de dinero no usa el acento.** Generalización del [ADR 036](DECISIONS/036-deudas-v2-visual.md) D6 ("un abono es un pago, no un ingreso"): el botón que **confirma** una salida de dinero viste su dominio (`--fk-dom-X` 12 % + borde 40 % + `-text`); el verde queda para el único primario, que es el que **crea**. Aplicada en Deudas (`.deuda-card__abonar`, `.estrategia-card__aplicar`). Extenderla a toda la app es una decisión abierta.

### Cards

```html
<div class="card">
  <div class="card__header">
    <span class="card__title">Saldo total</span>
    <span class="chip chip-success">+2.3%</span>
  </div>
  <p class="card__value">$4.850.000</p>
  <div class="card__footer">
    <span class="text-sm text-muted">Actualizado hoy</span>
    <button class="btn btn-ghost btn-sm">Ver</button>
  </div>
</div>
```

Jerarquía interna en 3 niveles (rediseño F3): primario (monto/progreso), secundario (contexto), terciario (metadata).

**R1 · Un solo encabezado de card:** sentence case, `--fk-text-sm` / `--fk-font-semibold`, `--fk-text-primary`, **sin icono dentro del `h2`**; contador opcional junto al título y un enlace de acción a la derecha. El label de grupo del bento conserva su uppercase 12/700: otro nivel, no otro patrón. Corolario: **un solo verbo por destino**.

**R5 · Panel sin scroll propio:** máximo 4 filas y, si hay más, una fila de salida de 44px ("Ver los N en ..."). En móvil la barra de scroll no se dibuja, así que un `overflow-y: auto` esconde ítems sin pista visual. El scroll es de la pantalla.

### Inputs

```html
<div class="form-group">
  <label class="label label-required" for="monto">Monto</label>
  <div class="input-group">
    <span class="input-prefix" aria-hidden="true">$</span>
    <input class="input input-money input--has-prefix"
           id="monto" type="number" min="0" placeholder="0" />
  </div>
  <span class="helper-text">En pesos colombianos (COP)</span>
</div>
```

Reglas móviles: inputs con `font-size` >= 16px (anti-zoom iOS), touch targets >= 44px.

**R4 · Los 44px táctiles aplican a todo control, sea o no `.btn`.** Fuera de esa clase nadie los verificaba: quedaban entre 18 y 40px. El recuadro **visual** queda libre, así que un diseño aprobado no se rompe: se expande solo la zona sensible con un `::after` centrado de 44px (ver `styles/responsive.css`). Corolario del criterio: **si el recuadro no lo fijó ninguna decisión, el control crece de verdad**; el `::after` es para los tamaños que sí están decididos (el ojo de los heros, la nav de mes). Un chip de filtro de 27,7px no tenía dueño: creció.

**R11 · El primer bloque de un formulario es el dato que el usuario vino a escribir.** Los atajos, las sugerencias y las ayudas van después, por útiles que sean. Origen: TX.12 insertó los chips de gasto frecuente antes del monto y el formulario más usado de la app dejó de abrir en su campo principal, contra lo que ya fijaba el [ADR 042](DECISIONS/042-formularios-v2-visual.md) D2, sin que nadie lo hubiera decidido.

### Chips y Badges

```html
<span class="chip chip-success">Pagado</span>
<span class="chip chip-warning">Pendiente</span>
<span class="chip chip-danger">Vencido</span>
<span class="chip chip-info">Info</span>
<span class="chip chip-accent">Activo</span>

<span class="badge">3</span>
<span class="badge badge-accent">12</span>
<span class="badge badge-warning">2</span>
```

**R7 · Estado terminal:** un elemento en estado final (saldado, cumplido, archivado) **apaga sus indicadores de futuro**: vencimientos, urgencias, cuentas regresivas, cuotas por pagar. El chip se calcula después de saber si el elemento sigue vivo, no antes, y el hueco se llena con el **cierre** (la fecha en que ocurrió). Origen: una deuda saldada decía "Saldada" en verde y "Vence hoy" en rojo a dos centímetros.

**R9 · Una barra de opciones no esconde opciones:** prohibido `overflow-x` con `scrollbar-width: none` en una barra de chips. O envuelve (`flex-wrap`), o muestra N y ofrece un "+M" que despliega el resto (patrón de R5, en horizontal). Origen: la barra de filtros de Gastos medía 792px de contenido dentro de 356px visibles, o sea el 55% de las categorías del mes fuera de vista, y en móvil no se dibuja ninguna barra de scroll: la única pista era que el cuarto chip aparecía cortado. Precio honesto de envolver: ~44px por fila extra.

**R22 · Un chip cabe o baja de línea:** un chip de estado nunca desborda ni tapa. Si no cabe en su columna, vive en su **propia línea** bajo el título y puede partir en dos (`white-space: normal`); `nowrap` solo con truncado explícito. Origen: el chip de Me deben iba dentro del `<p>` del nombre y "La fecha de pago pasó hace 3 semanas" (252px) cruzaba por debajo del botón, que lo tapaba: el estado más urgente producía el label más largo, así que cuanto peor la noticia, menos se leía.

### List Items

```html
<article class="list-item">
  <div class="list-item__icon" aria-hidden="true">🛒</div>
  <div class="list-item__content">
    <p class="list-item__title">Mercado del mes</p>
    <p class="list-item__subtitle">Alimentación · Hoy</p>
  </div>
  <span class="list-item__amount">$285.000</span>
</article>
```

Variantes reales: `.list-item__icon--cat` (ícono de categoría con chip de acento), `.list-item__meta`, `.list-item__action`, `.list-item__value`, `.list-item__progress-label`. Nota de color: los montos de gasto van en neutro, no en rojo (criterio AUD.4).

**R2 · Fila de obligación**, anatomía única en 2 líneas: teja 32px (`--fk-dom-X` al 14% + `-text`) · nombre 14/600 truncado · meta con `.dom-badge` y estado temporal · monto 14/700 tabular. En una línea el badge se come ~64px y trunca el nombre justo donde se decide qué pagar.

**R19 · El monto ancla es lo vigente:** la cifra destacada de una fila de dinero (`.list-item__amount`) es la que **decide hoy**: pendiente, saldo, cuota. El histórico acompaña debajo en secundario (`--fk-text-xs` + `--fk-text-muted`) y solo cuando hay movimientos que expliquen la diferencia. Nunca al revés. En móvil esa cifra vive en el **primer renglón** y las acciones bajan a su propio renglón: dos botones en el primer renglón dejan el cuerpo en ~112px y parten el nombre en dos líneas. Origen: Me deben anclaba lo prestado hace meses ($1.200.000) y dejaba lo pendiente ($858.500) en 12px gris al fondo de la tarjeta.

**R21 · Lo terminado no compite:** lo liquidado, completado o archivado se lista **después** de lo activo, sin desaparecer; el criterio de orden se aplica dentro de cada grupo. Origen: un préstamo liquidado, que no pide ninguna acción salvo borrar, se sentaba encima de uno activo por ser más antiguo. Corolario de contenedor: una lista separa sus ítems desde el contenedor (`display: flex` + `gap`), no desde el ítem.

### Barras y anillos de progreso

```html
<!-- Barra (gruesa, animada al entrar en viewport) -->
<div class="progress" role="progressbar"
     aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"
     aria-label="Progreso de meta">
  <div class="progress-bar" style="width:68%"></div>
</div>
<!-- Estados: .progress-bar--near | --complete | --warn | --danger -->
```

Para el progreso protagonista (Metas, Apartados, Ahorro, Score) existe el **anillo SVG**: `.progress-ring` + `.progress-ring__track` + `.progress-ring__bar` + `.progress-ring__label` (envueltos en `.progress-ring-wrap`), generado desde `infra/svg.js`.

### Empty State

```html
<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true">💸</div>
  <h3 class="empty-state__title">Aún no hay gastos</h3>
  <p class="empty-state__desc">Registra tu primer gasto para empezar.</p>
  <p class="empty-state__tip">Tip: usa "Anotar un gasto" desde Inicio.</p>
  <button class="btn btn-primary">+ Agregar gasto</button>
</div>
```

Los empty states del rediseño F7 usan ilustraciones SVG geométricas inline (`emptyArt()` de `infra/icons.js`).

---

## Bento Grid

Layout del Inicio (`#sec-dash`). CSS Grid de 12 columnas.

```html
<div class="bento" role="region" aria-label="Inicio">

  <!-- Celda grande: 8 cols × 2 filas -->
  <article class="bento__cell bento__cell--wide bento__cell--tall bento__cell--accent">
    <p class="bento__label">Tu dinero disponible hoy</p>
    <p class="bento__value bento__value--accent bento__value--xl">$2.485.000</p>
    <p class="bento__desc">efectivo + cuentas bancarias</p>
  </article>

  <!-- Celda pequeña: 4 cols × 1 fila -->
  <article class="bento__cell">
    <p class="bento__label">Gastos del mes</p>
    <p class="bento__value">$985.400</p>
  </article>

</div>
```

| Clase | Columnas | Filas |
|---|---|---|
| `.bento__cell` (base) | 4 | 1 |
| `.bento__cell--wide` | 8 | 1 |
| `.bento__cell--full` | 12 | 1 |
| `+ .bento__cell--tall` | - | 2 |

Responsive: 12 cols (> 1024px) → 6 cols (768-1023px) → 1 col (< 768px).

---

## Capas CSS (`@layer`)

Orden de precedencia (menor → mayor):

```
reset → base → tokens → layout → components → modals → themes → a11y → responsive → utils
```

`styles/components.css` es un barrel que importa los 8 sub-módulos de `styles/components/` (atoms, buttons, forms, domain, analysis, charts, config, nudges).

**Reglas:** cada archivo CSS vive en su capa. Nunca agregar reglas directamente en `main.css` (solo `@import` + `@font-face`; los `@font-face` van al final porque un `@import` después de otra regla se descarta).

---

## Modo claro / oscuro

El modo oscuro es el **default** (tokens en `:root` de `tokens.css`).
El modo claro se activa con `body.light-theme`, que sobrescribe tokens en `themes.css`.

- En claro, el acento se oscurece (`#13b377`) y los interactivos van a verde bosque (`#006b3d`) para garantizar contraste AA sobre blanco.
- Toda clase nueva debe funcionar en ambos temas (probar los dos antes de commitear).
- Breakpoints responsive: 1440 / 1024 / 768 / 480 / 360 px, con tipografía fluida (`clamp`).
