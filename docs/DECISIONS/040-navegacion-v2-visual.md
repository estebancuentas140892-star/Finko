# ADR 040 - Navegación v2: menú "Más" agrupado como sheet, marca en el sidebar y pastilla "Registrar"

**Estado:** Aceptada (2026-07-14). Handoff de Claude Design "Iteración de specimen" (mockup `Navegación v2.dc.html`), enviado por Esteban con instrucción de implementar.
**Fecha:** 2026-07-14
**Autores:** Esteban (diseño en Claude Design), Claude Fable 5 (triaje e implementación)
**Relación:** séptima pantalla de la familia visual v2 (tras Inicio, Mis cuentas, Deudas, Calendario, Análisis y Gastos). **Revisa explícitamente la D5 del [ADR 024](024-reorganizacion-navegacion-movil.md)** (ver D1 abajo). Consume los tokens de identidad de color del [ADR 031](031-identidad-de-color-por-seccion.md) y cierra un pendiente del lenguaje de iconografía del [ADR 023](023-lenguaje-de-iconografia-propio.md) (el emoji 💚 del logo). El hub "Ahorros" (ADR 024 D4, NAV.B: pestañas + consolidado) queda **intacto**.

---

## Contexto

El mockup trae 4 láminas: sidebar desktop expandida, sidebar colapsada, barra inferior móvil y menú "Más" móvil. El diagnóstico del triaje es que **la estructura ya existe** en producción: sidebar con 3 grupos + footer con Ajustes y Colapsar (persistido), barra inferior de 5 slots con botón central "Registrar" (ADR 024 D1) y estado activo teñido por dominio con barra indicadora (IV.2a, ADR 031). El delta real es visual y de agrupación:

1. El menú "Más" hoy es un modal centrado con 7 tarjetas planas tipo launcher (ADR 024 D5); el mockup lo convierte en **bottom sheet agrupado** con tejas de dominio.
2. El sidebar abre con el emoji 💚 como logo (último emoji decorativo de la UI estructural, pendiente del ADR 023) y un rótulo "Diario" que el mockup elimina.
3. El botón central "Registrar" es un círculo de 46px; el mockup lo dibuja como **pastilla con degradado de acento**.

## Decisión

### D1. Menú "Más" v2: bottom sheet agrupado (revisa ADR 024 D5)

El modal "Más" pasa a presentarse como **hoja anclada al borde inferior** (asa decorativa, esquinas superiores redondeadas) con dos grupos rotulados y una fila final:

- **Gestión del dinero:** Deudas, Mis cuentas, Me deben, Límites de gasto, Análisis.
- **Ahorros:** Fondo de emergencia, Metas, Apartados, Inversión.
- **Fila final:** Ajustes + botón de tema (D3).

**Qué revierte del ADR 024 D5 y qué no.** D5 decidió "7 tarjetas en una sola cuadrícula, sin grupos", con la tarjeta única "Ahorros" como entrada al hub. Esta decisión la revisa en sus dos partes: vuelven los rótulos de grupo (2 grupos coherentes, no los 3 arbitrarios pre-024: "Gestión del dinero" sí predice su contenido, a diferencia del "Gestión" retirado) y las 4 secciones de ahorro recuperan entrada directa en el menú. El **hub en sí no se toca**: la franja de pestañas y el consolidado (NAV.B) siguen en las 4 secciones; solo cambia cuántas puertas tiene el menú. Racional: en 2026-07-04 las 10 tarjetas planas eran carga visual; con la identidad de color por dominio (ADR 031) y las tejas de icono, los grupos hacen el trabajo de orientación que antes hacía la reducción de opciones.

### D2. Tejas y estado activo con identidad de dominio

Cada tile del sheet es horizontal: teja de icono (32px, tinte del dominio) + nombre. El tile de la **sección activa** se resalta con el tinte y el borde de su dominio, y `markActiveNav` lo marca con `aria-current`, igual que el nav. Regla de contraste de la casa: los glifos usan la variante `-text` del dominio, nunca el token crudo (hueco de tema claro documentado en IV.1/IV.2).

**Clases nuevas `.mas-sheet*` / `.mas-tile*`:** las clases `.menu-mas__*` actuales NO se restilizan porque las comparten la hoja "Registrar" (NAV.A2) y los accesos personalizables de Inicio (IN.4a); quedan como el lenguaje "launcher vertical" de esos dos consumidores.

### D3. El toggle de tema vuelve al menú "Más"

Botón de icono (luna/sol) junto al tile de Ajustes, con `aria-pressed` y sincronizado con el tema vigente. Había vivido en este menú y se retiró en una fase anterior; el mockup lo trae de vuelta como acceso rápido. La sección "Apariencia" de Ajustes se conserva como está (el botón es un atajo, no la fuente).

### D4. Sidebar: marca "F" y grupo diario sin rótulo

- El logo pasa de 💚 a una **teja "F"** con el degradado de acento (34px, radio 11): cierra el último emoji decorativo de la UI estructural (ADR 023) y sobrevive al modo colapsado como marca mínima.
- El rótulo visible "Diario" desaparece (el mockup abre directo con los items); el nombre del grupo se conserva para lectores de pantalla vía `aria-label`. "Seguimiento" y "Ahorros" no cambian.

### D5. Barra inferior: pastilla "Registrar" e indicador fijo

- El botón central pasa de círculo 46px a **pastilla 50x38 (radio 14)** con el degradado de acento y sombra teñida: más cercano al lenguaje de las fintech de referencia del ADR 024 y con más área táctil horizontal.
- El indicador de sección activa pasa de `width: 44%` a **22px fijos** (el mockup lo dibuja constante; en viewports anchos el 44% crecía sin razón).

### D6. Adaptaciones respecto al mockup (con razón)

| Pieza del mockup | Decisión | Razón |
|---|---|---|
| Tooltip estilizado en la sidebar colapsada | Se conserva el `title` nativo ya implementado | Un tooltip CSS se recorta por el contenedor con scroll del nav; el nativo cumple la función sin JS nuevo |
| Badge de notificación (Deudas "2") | **Diferido** | Exige decidir qué cuenta el badge (candidato: vencimientos del mes); decisión de producto de Esteban, tarjeta propia si la pide. El CSS `.nav-item__badge` ya existe sin consumidores |
| Sheet sin botón de cierre | El sheet conserva un cierre accesible discreto | Escape existe, pero mouse/touch necesitan salida explícita sin navegar; criterio a11y de la casa (Lighthouse 100) |
| Colores hex del mockup (tema oscuro) | Tokens `var(--fk-*)` con `-text` para glifos | El mockup es monotema; la app tiene claro/oscuro con contraste AA verificado por token |

## Alternativas consideradas

- **Restilizar `.menu-mas__*` en el lugar.** Descartada: rompería la hoja "Registrar" y los accesos de Inicio, que reusan esas clases con el lenguaje launcher.
- **Sheet con las 12 secciones** (incluyendo las 4 de la barra). Descartada: duplicaría destinos ya visibles; el mockup solo agrupa lo que no cabe en la barra (mismo criterio del ADR 024).
- **Implementar los badges ya, contando vencimientos.** Descartada: inventaría una regla de producto sin la palabra de Esteban; se difiere con candidato anotado.

## Consecuencias

- El E2E `hub-ahorros` "el modal Más muestra 7 tarjetas planas" asegura la D5 del ADR 024 y se reescribe para asegurar esta D1 (grupos + 10 tiles).
- `MAS_SECTIONS` (shell.js) no cambia: son las mismas secciones detrás de "Más".
- `markActiveNav` gana un consumidor (tiles del sheet); `_syncThemeButton` pasa a sincronizar todos los toggles presentes (checkbox de Ajustes + botón del sheet).
- El menú deja de compartir presentación con los modales centrados: nace el modificador de hoja inferior, reutilizable por futuros sheets móviles.

## Rebanadas de implementación

| Rebanada | Qué | Depende de | Modelo sugerido |
|---|---|---|---|
| **NAV2.1a** | Menú "Más" v2: sheet agrupado + tejas de dominio + tile activo + toggle de tema (D1, D2, D3). Markup + CSS + `shell.js` + tests | nada | Fable 5 - Alto (sesión del triaje) |
| **NAV2.1b** | Sidebar: marca "F" con degradado + grupo diario sin rótulo (D4) | nada | Sonnet 5 - Bajo |
| **NAV2.1c** | Barra inferior: pastilla "Registrar" + indicador fijo (D5) | nada | Sonnet 5 - Bajo |

Cada rebanada se verifica (unit + E2E + lint), bumpea el SW y se commitea por separado, según el workflow de [`/CLAUDE.md`](../../CLAUDE.md).
