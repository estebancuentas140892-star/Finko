# Design System — Finko Claude

> Documento vivo. Se actualiza al agregar nuevos tokens o componentes.
> Última revisión: Fase 2 (2026-05-12)

---

## Principios de diseño

1. **Claridad sobre estética** — Si hay duda entre lo bonito y lo claro, gana lo claro.
2. **Lenguaje humano** — "Tu plata" antes que "Saldo disponible".
3. **Modo oscuro por defecto** — Reduce fatiga visual en uso prolongado.
4. **WCAG AA mínimo** — Todo texto principal cumple relación de contraste ≥ 4.5:1.
5. **Responsive real** — Cada componente funciona en 320px y en 1440px.
6. **Tokens siempre** — Nunca hardcodear colores, espaciados ni tamaños.

---

## Fuentes

| Fuente | Uso | Pesos disponibles |
|---|---|---|
| **Inter** | Texto de UI, etiquetas, párrafos | 300, 400, 500, 600, 700, 800 |
| **DM Mono** | Valores monetarios (`$4.850.000`) | 300, 400, 500 |

```css
font-family: var(--fk-font-sans);  /* Inter */
font-family: var(--fk-font-mono);  /* DM Mono */
```

---

## Paleta de colores

### Marca

| Token | Valor | Uso |
|---|---|---|
| `--fk-accent` | `#00dc82` | Ícono, borde, valor positivo, CTA principal |
| `--fk-accent-hover` | `#00ef8e` | Estado hover del acento |
| `--fk-accent-subtle` | `rgba(0,220,130,0.12)` | Fondo de chips y células accent |
| `--fk-accent-border` | `rgba(0,220,130,0.35)` | Bordes de elementos accent |

### Fondos (modo oscuro)

| Token | Valor | Uso |
|---|---|---|
| `--fk-bg-base` | `#0f1117` | Fondo principal de la app |
| `--fk-bg-surface` | `#161922` | Cards, sidebar, modales |
| `--fk-bg-elevated` | `#1d2130` | Cards dentro de cards, inputs |
| `--fk-bg-hover` | `rgba(255,255,255,0.04)` | Estado hover de filas y botones ghost |

### Fondos (modo claro — `body.light-theme`)

| Token | Valor |
|---|---|
| `--fk-bg-base` | `#f4f5f9` |
| `--fk-bg-surface` | `#ffffff` |
| `--fk-bg-elevated` | `#edf0f7` |

### Texto

| Token | Uso |
|---|---|
| `--fk-text-primary` | Títulos, valores importantes |
| `--fk-text-secondary` | Párrafos, labels |
| `--fk-text-muted` | Texto de apoyo, placeholders |
| `--fk-text-accent` | Texto verde (`#00dc82` oscuro / `#006b3d` claro) |
| `--fk-text-on-accent` | Texto sobre botón verde (`#0f1117` oscuro / `#fff` claro) |

### Semánticos

| Token base | Valor oscuro | Uso |
|---|---|---|
| `--fk-success` | `#00dc82` | Pagado, positivo, ok |
| `--fk-warning` | `#ffb82e` | Pendiente, por vencer |
| `--fk-danger` | `#ff4757` | Vencido, error, deuda crítica |
| `--fk-info` | `#3d8aff` | Educativo, contexto neutral |

Cada semántico tiene par `--fk-{nombre}-bg` y `--fk-{nombre}-text`.

---

## Escala de espaciado (base 4px)

| Token | Valor | px |
|---|---|---|
| `--fk-space-1` | `0.25rem` | 4 |
| `--fk-space-2` | `0.5rem` | 8 |
| `--fk-space-3` | `0.75rem` | 12 |
| `--fk-space-4` | `1rem` | 16 |
| `--fk-space-5` | `1.25rem` | 20 |
| `--fk-space-6` | `1.5rem` | 24 |
| `--fk-space-8` | `2rem` | 32 |
| `--fk-space-10` | `2.5rem` | 40 |
| `--fk-space-12` | `3rem` | 48 |
| `--fk-space-16` | `4rem` | 64 |

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

---

## Border radius

| Token | Valor | Uso |
|---|---|---|
| `--fk-radius-sm` | `6px` | Inputs, chips pequeños |
| `--fk-radius-md` | `10px` | Botones, tags |
| `--fk-radius-lg` | `16px` | Cards principales |
| `--fk-radius-xl` | `24px` | Celdas Bento, modales |
| `--fk-radius-full` | `9999px` | Pills, badges, avatares |

---

## Sombras

| Token | Uso |
|---|---|
| `--fk-shadow-sm` | Cards sutiles, elevación mínima |
| `--fk-shadow-md` | Cards en hover, dropdowns |
| `--fk-shadow-lg` | Modales, overlays |
| `--fk-shadow-glow` | Efecto neón sobre elementos accent (hover) |

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

<!-- Variantes -->
<div class="card card-accent">…</div>   <!-- borde + fondo verde sutil -->
<div class="card card-elevated">…</div> <!-- sombra extra -->
<div class="card card-warning">…</div>  <!-- fondo warning -->
<div class="card card-danger">…</div>   <!-- fondo danger -->
```

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

### Chips y Badges

```html
<!-- Chips (estado, categoría) -->
<span class="chip chip-success">Pagado</span>
<span class="chip chip-warning">Pendiente</span>
<span class="chip chip-danger">Vencido</span>
<span class="chip chip-accent">Activo</span>

<!-- Badges (conteos) -->
<span class="badge">3</span>
<span class="badge badge-accent">12</span>
```

### List Items

```html
<article class="list-item">
  <div class="list-item__icon" aria-hidden="true">🛒</div>
  <div class="list-item__content">
    <p class="list-item__title">Mercado del mes</p>
    <p class="list-item__subtitle">Alimentación · Hoy</p>
  </div>
  <span class="list-item__amount text-danger">-$285.000</span>
</article>
```

### Progress Bar

```html
<div class="progress" role="progressbar"
     aria-valuenow="68" aria-valuemin="0" aria-valuemax="100"
     aria-label="Progreso de meta">
  <div class="progress__bar" style="width:68%"></div>
</div>
<!-- Variantes: progress__bar--warning | progress__bar--danger -->
```

### Toggle

```html
<label class="toggle" aria-label="Activar notificaciones">
  <input type="checkbox" role="switch" aria-checked="false" />
  <span class="toggle__track"></span>
</label>
```

### Empty State

```html
<div class="empty-state">
  <div class="empty-state__icon" aria-hidden="true">💸</div>
  <h3 class="empty-state__title">Aún no hay gastos</h3>
  <p class="empty-state__desc">Registrá tu primer gasto para empezar.</p>
  <button class="btn btn-primary">+ Agregar gasto</button>
</div>
```

---

## Bento Grid

El Bento Grid es el layout del dashboard (`#sec-dash`). Funciona con CSS Grid de 12 columnas.

```html
<div class="bento" role="region" aria-label="Dashboard">

  <!-- Celda grande: 8 cols × 2 filas -->
  <article class="bento__cell bento__cell--wide bento__cell--tall bento__cell--accent">
    <p class="bento__label">Tu plata disponible hoy</p>
    <p class="bento__value bento__value--accent">$2.485.000</p>
    <p class="bento__desc">efectivo + cuentas bancarias</p>
  </article>

  <!-- Celda pequeña: 4 cols × 1 fila -->
  <article class="bento__cell">
    <p class="bento__label">Gastos del mes</p>
    <p class="bento__value">$985.400</p>
  </article>

  <!-- Celda ancha: 12 cols (alerta) -->
  <article class="bento__cell bento__cell--full card-danger">
    <p class="bento__desc">Detectamos 3 gastos hormiga…</p>
  </article>

</div>
```

### Clases de tamaño

| Clase | Columnas | Filas |
|---|---|---|
| `.bento__cell` (base) | 4 | 1 |
| `.bento__cell--wide` | 8 | 1 |
| `.bento__cell--full` | 12 | 1 |
| `+ .bento__cell--tall` | — | 2 |
| `+ .bento__cell--taller` | — | 3 |

### Responsive

| Viewport | Columnas del grid | Comportamiento |
|---|---|---|
| `> 1024px` | 12 | Bento completo |
| `768–1023px` | 6 | Celda base = 3 cols |
| `< 768px` | 1 | Columna única, scroll natural |

---

## Capas CSS (`@layer`)

Orden de precedencia (menor → mayor):

```
reset → base → tokens → layout → components → modals → themes → a11y → responsive → utils
```

**Regla:** cada archivo CSS importado vive en su capa correspondiente.
**Nunca** agregar reglas directamente en `main.css`.

---

## Modo claro / oscuro

El modo oscuro es el **default** (tokens en `:root`).
El modo claro se activa agregando `body.light-theme`.

```js
// Toggle de tema
document.body.classList.toggle('light-theme');
```

Los tokens que cambian en modo claro están documentados en `styles/themes.css`.
El acento decorativo `#00dc82` se mantiene igual en ambos modos; solo cambian
los tokens de texto e interactivos para garantizar contraste WCAG.

---

## Tipografía — nota de privacidad

Las fuentes actualmente se cargan desde Google Fonts (plan de privacidad: Fase 13).
En Fase 13 (PWA), se migrará a self-hosted en `assets/fonts/` para eliminar
la dependencia externa y los tracking implícitos de Google.
