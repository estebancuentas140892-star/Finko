# ADR 035 - Mis cuentas v2 (rediseño de la pantalla de Tesorería)

**Estado:** Aceptado (2026-07-12). Esteban aprobó el mockup completo tal cual, incluidas las dos decisiones que el handoff dejaba pendientes de validación (D6 tarjeta de entrada del asistente y D3 barra de composición).
**Fecha:** 2026-07-12
**Autores:** Esteban (visión de producto, aprobación del handoff), Claude Design (mockup `Mis cuentas v2.dc.html` + doc `SCREENS/mis-cuentas-v2.md` del bundle "Iteración de specimen"), Claude Code (triaje e implementación).
**Relación:** materializa la cara visual de la iniciativa "Mis Cuentas v2" del BOARD (MC.13/16/17 siguen siendo sus piezas funcionales); **consume el [ADR 033](033-direccion-visual-premium.md)** (degradado de identidad + sombra en reposo) y extiende su estreno parcial, antes acotado a Inicio, al hero de esta pantalla; hereda del [ADR 034](034-inicio-v2.md) la disciplina del ojo de privacidad con posición estable (IN.2/D3) y la familia visual del hero; respeta [ADR 031](031-identidad-de-color-por-seccion.md) (tesorería = `--fk-dom-tesoreria`) y [ADR 026](026-biblioteca-de-recursos-graficos.md) (assets/svg/ como fuente de verdad de diseño).

---

## Contexto

`#sec-tesoreria` ("Mis cuentas") apila hoy, en un solo scroll: lista de cuentas como `.list-item` con hints de texto y emoji (📅 cuota, 💸 4x1000, 🔑 transferencia), el nudge GMF suelto (K.1), dos listas de ingresos con encabezados independientes y el asistente "Distribuir mi ingreso" renderizado inline y siempre abierto. No hay total sumado en la pantalla (solo vive en Inicio), las cuentas no tienen peso visual de contenedor de dinero y el asistente satura el scroll.

El handoff de Claude Design (2026-07-12) propone el rediseño completo de la pantalla, alineado con la familia visual de Inicio v2.

## Decisión

Orden vertical nuevo (mobile): header + hero total + tarjetas de cuenta + insight GMF + fuentes de ingreso + tarjeta "Distribuir mi ingreso".

### D1. Total de cuentas como hero

Hero al tope de la sección: label "Tu dinero en cuentas" + total protagonista (tabular, extrabold) + ojo de privacidad + barra de composición (D3). Superficie: degradado de identidad tesorería (`color-mix` de `--fk-dom-tesoreria` al 16% sobre `--fk-bg-surface`, 2 paradas), borde tesorería al 30%, sombra en reposo. `calcularTotalCuentas()` ya existe: cero cálculo nuevo. Sin cuentas: label "Aún no tienes cuentas" + "$0", sin ojo (misma disciplina que Inicio: un control que no enmascara nada confunde).

### D2. Tarjetas de cuenta con metadatos como chips

Cada cuenta pasa de `.list-item` con hints apilados a tarjeta: teja de banco 44px + nombre + tipo + saldo prominente (17px/700 tabular) + chips compactos (icono SVG + texto, tokens neutros, fila que envuelve) para cuota de manejo, 4x1000 y datos de transferencia. Editar/eliminar como ghost icons de 32px; eliminar vira a danger en hover. Requiere símbolos `i-key` e `i-percent` nuevos en el sprite (drafts del mockup como plantillas; Esteban puede sobrescribirlos vía `assets/svg/`, ADR 026). Absorbe la verificación de legibilidad de logos de la ex tarjeta MC.15b (mismo contenedor de teja).

### D3. Barra de composición por cuenta (aprobada)

Barra fina segmentada bajo el total: un segmento por cuenta con saldo positivo, ancho proporcional, tintes de `--fk-dom-tesoreria` por peso (mayor saldo = más opaco). Sin números: las tarjetas los dan. Decorativa acompañada del resumen en texto ("3 cuentas · 1 billetera · efectivo"), cumple SC 1.4.11.

### D4. GMF integrado a las cuentas

El indicador 4x1000 (K.1) deja de ser nudge suelto y pasa a tarjeta insight compacta con tinte tesorería e icono `%`, justo bajo la lista de cuentas. Mismo copy y cálculo (`calcularCostoGMF`, `detectarNudgeGMF` intactos).

### D5. Privacidad coherente con Inicio

El ojo del hero enmascara total + saldos de cuentas + montos de ingresos juntos, con posición absoluta estable (solo cambia el contenido). Reutiliza `S.config.ocultarSaldo`: un solo flag para toda la app.

### D6. Distribuir como tarjeta de entrada (aprobada)

`renderDistribucionIngreso()` deja de pintar el asistente inline siempre abierto. En su lugar: tarjeta compacta "¿Cómo distribuir $X?" con barra 50/30/20 + leyenda (Necesidades / Estilo de vida / Ahorro) + botón que LANZA el asistente por pasos. El motor y los pasos (MC.7) no cambian; MC.13 rediseñará el contenido del asistente después, esta decisión solo cambia el punto de entrada.

### D7. Fuentes de ingreso agrupadas

Un solo encabezado "Fuentes de ingreso" con acción "Agregar" cubre recurrentes + puntuales; tarjetas compactas con teja verde `--fk-dom-ingresos`; los puntuales conservan su `+monto` en verde.

## Pregunta abierta (no bloquea)

"Mis cuentas" mezcla saldos, fuentes de ingreso y presupuestar (distribuir). Queda anotado evaluar con Esteban si ingresos + distribución merecen pantalla propia. Este rediseño NO asume ese split: mantiene todo en una pantalla, ordenado.

## Guardarraíles (criterio de aceptación de cada rebanada MC.18*)

1. Ambos temas, con contraste WCAG calculado (método IV.1) contra la parada fuerte del degradado; texto muted nunca dentro del hero (lección medida de IN.8b).
2. Pintura única: sin animar `box-shadow`, sin bucles, sin JS nuevo para color/decoración.
3. Hit targets: botones ≥ 40px, acciones secundarias en fila ≥ 32px.
4. El color/emoji nunca viaja solo: chips y estados llevan icono + texto.
5. Tests verdes + bump de `CACHE_NAME` en cada rebanada que llegue a producción.

## Plan de rebanadas (tarjetas MC.18a a MC.18e en BOARD.md)

- **MC.18a** - Hero total + ojo + barra de composición (D1+D3+D5 sobre el hero).
- **MC.18b** - Tarjetas de cuenta con chips + iconos `i-key`/`i-percent` (D2, absorbe MC.15b; extiende la máscara D5 a los saldos por cuenta).
- **MC.18c** - GMF como tarjeta insight integrada (D4).
- **MC.18d** - Fuentes de ingreso agrupadas (D7; extiende la máscara D5 a los montos de ingresos).
- **MC.18e** - Distribuir como tarjeta de entrada que lanza el asistente (D6; coordinar con MC.13).

## Alternativas rechazadas

- **Implementar el mockup como copia literal de estilos inline:** viola el sistema (`var(--fk-*)` obligatorio, ADN); se recrea con tokens y clases.
- **Mantener el asistente de distribución inline:** era el estado actual; Esteban aprobó explícitamente el cambio de punto de entrada (2026-07-12).
- **Quitar la barra de composición:** el doc de diseño la dejaba como opcional; Esteban la aprobó, es pintura única y da la relación total → cuentas de un vistazo.
- **Split inmediato de ingresos/distribución a pantalla propia:** decisión de arquitectura de información que merece discusión propia; queda como pregunta abierta.
