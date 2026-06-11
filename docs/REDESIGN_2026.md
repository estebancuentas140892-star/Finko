# Rediseño visual 2026 - Finko

> Plan maestro de modernización UI/UX. Creado: 2026-06-11.
> Objetivo: que Finko se sienta como una app financiera moderna, confiable y agradable de usar a diario, sin tocar el ADN técnico (vanilla JS, offline-first, sin build step).

---

## 1. Diagnóstico (auditoría 2026-06-11)

Auditoría visual hecha sobre la app real con datos de demostración, en desktop (1280px) y móvil (375px), modo oscuro y claro.

### Lo que ya está bien (NO tocar la base, solo evolucionar)

| Activo | Detalle |
|---|---|
| Arquitectura de tokens | `tokens.css` + `themes.css`: todo via `--fk-*`, dark/light ya funcionan. El rediseño es cambiar **valores**, no reconstruir el sistema. |
| Colores por dominio | 10 hues armonizados (`--fk-dom-*`) dan reconocimiento inmediato por sección. Se conservan. |
| Accesibilidad | Focus visible, contraste AA, `prefers-reduced-motion`, skip link, Lighthouse A11y 100. Innegociable: el rediseño no puede bajar nada de esto. |
| Tipografía base | Inter Variable self-hosted (pesos 100-900 en un archivo). Sirve como única fuente del rediseño. |
| Móvil | Bottom nav + topbar + cards apiladas funcionan bien. El gap grande está en desktop. |
| Performance | Lighthouse 99-100. Presupuesto duro: ninguna fase puede bajarlo. |

### Los 7 problemas que hacen que se vea anticuada

1. **Iconografía emoji.** Listas, headers de card, empty states y nav usan emojis (💵 🏖️ 🚗 📊 💡). Renderizan distinto en cada OS, compiten en color con la UI y dan sensación informal/inconsistente. Es la señal número 1 de "no profesional".
2. **Dinero en monoespaciada (DM Mono).** Los montos en mono verde neón leen como terminal de programador, no como app financiera. Las fintech modernas (Nubank, Revolut, N26) usan su sans con cifras tabulares. Inter Variable ya soporta `tnum`: DM Mono puede eliminarse por completo (además ahorra 2 archivos de fuente).
3. **Estética "neón sobre negro" 2020.** Acento esmeralda brillante + glow shadows + fondo casi negro = look de dashboard cripto. La modernización va hacia: superficies oscuras más suaves con más pasos de elevación, acento usado como condimento (no como salsa), cero glow.
4. **Desktop plano de una columna.** Todas las secciones son filas apiladas a lo ancho incluso en 1440px. El vocabulario `.bento` ya existe en `layout.css` pero el dashboard no lo explota. Desktop necesita composición en 2-3 columnas donde tenga sentido.
5. **El progreso es tímido.** Barras de 8px y porcentajes diminutos para los datos más motivacionales de la app (Metas, Apartados, Ahorro, Score). Principio Duolingo aplicable: el progreso es el héroe visual. Anillos de progreso SVG, números grandes, hitos marcados, animación de llenado.
6. **Jerarquía débil dentro de las cards.** Ej. en Metas: una sola línea apretada con monto actual, objetivo, límite, días y faltante, todo en mono pequeño. Hace falta nivel primario (monto/progreso), secundario (contexto) y terciario (metadata).
7. **Microinteracciones casi ausentes.** Hay fade de sección y confetti de logros. Faltan: elevación al hover en cards, llenado animado de barras/anillos, count-up de cifras, checkmark animado al completar un pago, transiciones de modal. Todo CSS/rAF, siempre respetando `prefers-reduced-motion`.

### Principios Duolingo adaptados a finanzas (sin infantilizar)

- **Claridad sobre densidad**: una idea por card, números grandes, una acción primaria visible.
- **Progreso visible siempre**: anillos, barras, hitos. El usuario debe "ver" que avanza.
- **Feedback inmediato**: cada acción (pagar, abonar, completar) tiene respuesta visual satisfactoria.
- **Motivo para volver**: logros ya existen; en fase opcional se evalúa racha de registro y resumen semanal.
- **Tono adulto**: paleta sobria con energía, iconografía geométrica, cero mascotas ni caricaturas.

---

## 2. Dirección de diseño

**Concepto: "calma con energía".** Finko debe transmitir control (superficies tranquilas, mucho aire, jerarquía clara) con momentos de energía (el verde esmeralda reservado para dinero disponible, progreso y éxito).

- **Color**: se mantiene el esmeralda como marca, menos saturado en superficies grandes. Más pasos de elevación en dark (base, surface, elevated, raised). Light mode de primera clase, no un derivado.
- **Tipografía**: solo Inter Variable. Montos con `font-variant-numeric: tabular-nums` y peso 600-700, tamaño según jerarquía. DM Mono se elimina.
- **Iconos**: set SVG propio inline (geométrico, stroke 1.5-2px, 24px grid) generado desde `infra/svg.js` o módulo nuevo `infra/icons.js`. Cero dependencias externas, cero emojis en UI estructural.
- **Forma**: radii actuales (16-24px) están bien. Sombras: elevación sutil en vez de glow.
- **Movimiento**: 150-350ms, easing estándar ya definido. Animar solo transform/opacity (compositor), nunca layout.

---

## 3. Fases (una por sesión, en orden)

Cada fase: tests verdes + bump de SW + verificación visual en la app + commit antes de pasar a la siguiente.

| Fase | Alcance | Archivos principales | Modelo sugerido |
|---|---|---|---|
| **F1. Tokens v2 + tipografía** | Nuevos valores de paleta dark/light, sistema de elevación (reemplaza glow), montos a Inter `tnum`, eliminar DM Mono (fuentes y `@font-face`). | `tokens.css`, `themes.css`, `base.css`, `main.css`, `buttons.css` | Sonnet 4.6 - Alto |
| **F2. Sistema de iconos SVG** | `infra/icons.js` con el set de iconos; reemplazo de emojis en sidebar, bottom nav, list-items, headers de card y empty states. | `infra/icons.js` (nuevo), views de dominios, `index.html` | Sonnet 4.6 - Alto |
| **F3. Componentes núcleo** | Card v2 (jerarquía interna), list-item v2 (aire, alineación), progress v2 (barra gruesa animada + anillo SVG reutilizable), chips/badges refinados. | `atoms.css`, `buttons.css`, `infra/svg.js` | Sonnet 4.6 - Alto |
| **F4. Dashboard bento** | Composición desktop en bento grid (hero + pendientes + prioridades + accesos), hero card rediseñada, count-up del saldo. | `dashboard.js` (compromisos/views), `layout.css`, `index.html` | Sonnet 4.6 - Alto |
| **F5. Secciones de progreso** | Metas, Apartados y Ahorro con anillo/barra protagonista, hitos y jerarquía nueva. Score de salud de Análisis con gauge mejorado. | views de `metas`, `apartados`, `ahorro` (tesoreria), `analisis`; `domain.css` | Sonnet 4.6 - Medio |
| **F6. Microinteracciones** | Hover/press en cards y botones, llenado animado de progreso al entrar en viewport, count-up reutilizable, checkmark animado al pagar/completar. | `base.css`, `utils` (helper count-up), components | Sonnet 4.6 - Medio |
| **F7. Estados vacíos + navegación** | Ilustraciones SVG inline geométricas para empty states; pulido de sidebar/bottom nav (estados activos, transiciones). | `atoms.css`, `layout.css`, views, `infra/icons.js` | Sonnet 4.6 - Medio |
| **F8 (opcional, producto)** | Mecánicas de hábito: racha de registro, resumen semanal. Requiere decisión de producto aparte (no es solo UI). | por definir | Opus 4.8 - Medio |

**Orden razonado:** tokens primero (todo lo demás hereda), iconos segundo (los componentes los embeben), componentes tercero (las secciones los usan), y recién entonces composición por sección.

---

## 4. Restricciones innegociables por fase

1. Solo `var(--fk-*)`: ningún color/tamaño hardcodeado fuera de `tokens.css`/`themes.css`.
2. Cero assets externos nuevos (CSP `self`, offline-first). Iconos e ilustraciones: SVG inline desde JS o CSS.
3. Lighthouse no baja de 99/100/100/100. Performance se mide al cerrar cada fase.
4. Accesibilidad: contraste AA mínimo, focus visible, `prefers-reduced-motion` en toda animación nueva.
5. Bump de `CACHE_NAME` en `service-worker.js` en cada fase que toque JS/CSS.
6. Tests verdes antes de cada commit. Los E2E no dependen de estética, pero sí de estructura: si una fase cambia DOM, actualizar selectores en la misma fase.
7. Cero guion largo en todo texto nuevo.

---

## 5. Estado

| Fase | Estado |
|---|---|
| F1 | Completada 2026-06-11 |
| F2 | Completada 2026-06-11 |
| F3 | Pendiente |
| F4 | Pendiente |
| F5 | Pendiente |
| F6 | Pendiente |
| F7 | Pendiente |
| F8 | Sin decidir (producto) |
