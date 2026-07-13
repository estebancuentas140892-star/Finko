# ADR 038 - Análisis v2 (rediseño visual del panel de Análisis)

**Estado:** Aceptado (2026-07-13). Esteban envió el handoff de Claude Design con la instrucción explícita de implementarlo; los 3 puntos que el doc de diseño dejaba "pendientes de validar" se resuelven con su opción recomendada y quedan anotados abajo (ninguno bloquea).
**Fecha:** 2026-07-13
**Autores:** Esteban (visión de producto, envío del handoff), Claude Design (mockup `Análisis v2.dc.html` + doc `SCREENS/analisis-v2.md` del bundle "Iteración de specimen"), Claude Code (triaje e implementación).
**Relación:** quinta pantalla de la familia visual v2; **consume el [ADR 033](033-direccion-visual-premium.md)** (degradado de identidad + sombra en reposo) y extiende su estreno parcial a un quinto consumidor (Inicio, Mis cuentas, Deudas, Calendario, ahora Análisis); hereda del [ADR 034](034-inicio-v2.md)/[ADR 035](035-mis-cuentas-v2.md)/[ADR 036](036-deudas-v2-visual.md)/[ADR 037](037-calendario-v2-visual.md) la disciplina del ojo de privacidad con posición estable y la anatomía del hero; respeta [ADR 031](031-identidad-de-color-por-seccion.md) (análisis = pizarra `--fk-dom-analisis`, deliberadamente desaturado), [ADR 019](019-limites-por-rol.md) + IV.3 (gastar más no es incumplir: la variación de gasto nunca alarma en rojo), [ADR 010](010-simplificacion-analisis.md) (menos es más en este panel) y las decisiones de rendimiento PERF.2/PERF.3 (bundle memoizado + cómputo diferido de los colapsables, que se conservan intactas).

---

## Contexto

`#sec-analisis` ("Análisis") es el panel cross-dominio de solo lectura. La arquitectura de información ya es buena (primero "cómo estoy": score + patrimonio; luego "a dónde va mi dinero": tendencia + categorías; lo fino en colapsables, PERF.3). **El problema no es el orden sino el peso visual:** todo compite con el mismo tratamiento (encabezados `h2` sueltos, cards de borde plano, emoji 📊📅🐜📋 en títulos), así que el dato más importante, el score, no se lee como titular. El handoff de Claude Design (2026-07-13) propone el rediseño visual completo, alineado con la familia v2.

## Triaje (regla 2.7)

- **Entra como iniciativa propia de la sección Análisis** (rebanadas ANL.2a a ANL.2d), con el mismo rol que MC.18 en Mis cuentas, D.16 en Deudas y CAL.4 en Calendario: el bloque visual de su sección.
- **Relación con ANL.1 (declarada, no absorbida):** ANL.1 ("Análisis como centro de interpretación financiera") es la iniciativa de FONDO: lenguaje simple para términos financieros, explicación de cada gráfico con 3 preguntas, recomendaciones accionables, motor de sugerencia por categoría. Este ADR implementa su capa VISUAL: los puntos 4 (reorganización), 5 (jerarquía: lo crítico primero), 7 (carga cognitiva: colapsables señalizados) y 8 (coherencia con el sistema) del brief de ANL.1 quedan avanzados por esta iniciativa; los puntos 1, 2, 3, 6 y 9 (interpretación, copy, recomendaciones) siguen viviendo en ANL.1, que además hereda el lienzo v2 ya montado (cuando llegue, escribe copy sobre estas cards, no rediseña de cero).
- **No revierte ningún ADR:** cero cambios de lógica financiera (`calcularScoreSalud`, `clasificarScore`, `calcularActivos/Pasivos`, `serieGastosMensual`, `seriePorCategoria`, comparación, patrón semanal y monitor de renta quedan intactos). PERF.2 (bundle memoizado) y PERF.3 (colapsable diferido al toggle) se conservan tal cual. El criterio IV.3/ADR 019 (subida de gasto nunca en rojo) se re-declara explícitamente en el chip de variación (D4).
- **Íconos:** cero íconos nuevos en el sprite (criterio ADR 037). Los del mockup se resuelven con símbolos existentes: balanza del patrimonio → `i-saldo`; factores → `i-deudas`/`i-saldo`/`i-analisis`/`i-ahorro` (los actuales); colapsable de detalle → `i-bar-chart`; renta → `i-percent`; empty state → `i-analisis`; chip de variación → `i-trending-up/down`; chip de mes → `i-agenda`; ojo → `i-eye/off`.

## Decisión

Orden vertical (sin cambios de orden, cambia el peso): header con chip de mes + **score hero** + **card de patrimonio** + grupo "A dónde va tu dinero" (tendencia + categorías) + filas colapsables (detalle fino + renta). Sin datos: un único empty state.

### D1. Score de salud como héroe con anillo (antes: una card más en la pila)

Hero al tope: **anillo de progreso** (`progressRing` de `infra/svg.js`, 132px, score centrado + "de 100"), pill de banda (Excelente/Buena/Ajustada/Crítica) con ícono + texto, explicación en una línea, y los **4 factores como mini-barras en grilla 2×2** (ícono + label + valor + barra). El fondo del hero lleva un lavado del **color de la banda** (no del pizarra de sección): `color-mix` de la banda al 14% sobre `--fk-bg-surface`, borde de banda al 30%, sombra en reposo (quinto consumidor del ADR 033). Mapa banda → token: excelente `--fk-accent`, buena `--fk-success`, ajustada `--fk-warning`, crítica `--fk-danger` (el mismo de `progress-bar--score-*`). Las mini-barras de los factores toman el **color de la banda** (decisión del mockup: dentro del hero el dato semántico manda; las barras por dominio de IV.2b siguen vigentes fuera de él). La explicación deja el formato técnico "Deuda 80/100 • Liquidez 64/100…" (redundante con las barras visibles) por **una frase humana derivada de los datos reales**: nombra el factor más débil como siguiente paso ("Atención a tu liquidez: es lo que más está frenando tu score."); en banda excelente, refuerzo sin señalar factor. Es derivación de vista sobre `score.factors` ya calculados, no lógica nueva.

### D2. Patrimonio neto como card-héroe con composición de activos

Una sola card (reemplaza hero + 2 metric-cards): kicker con teja pizarra (`i-saldo`) + "Patrimonio neto", **cifra grande** (verde si ≥ 0, rojo si < 0, mismos tokens actuales), leyenda "activos − pasivos", **barra de composición de activos** (Cuentas / Metas / Apartados / Inversión, cada bucket > 0 en su color de dominio `--fk-dom-*`, decorativa `aria-hidden`: el desglose textual porta la información, SC 1.4.11) y dos columnas compactas Activos / Pasivos. **Ojo de privacidad** de posición estable (top-right, disciplina ADR 034 D3) que enmascara neto (`SALDO_MASCARA`), activos y pasivos (`SALDO_MASCARA_CUENTA`) con el flag único `S.config.ocultarSaldo` (IN.2); acción nueva `analisis-saldo-visibilidad` espejo de `agenda-saldo-visibilidad`. La barra deriva del desglose que `calcularActivos` ya expone: sin cálculo nuevo. El aviso de deudas sin saldo registrado se conserva.

### D3. "A dónde va tu dinero": tendencia + categorías agrupadas

Un **rótulo de grupo** (patrón `.bento__group-label` de Inicio v2) sobre dos cards, en vez de dos `h2` sueltos. **Tendencia:** card con título + "Últimos 12 meses", **chip de variación** arriba a la derecha (ícono `i-trending-*` + texto), sparkline área+línea en **pizarra de sección** (`--fk-dom-analisis-text`: la serie es contexto, no dato semántico; antes verde acento) y **3 stats** (Este mes / Máximo / Mínimo) como tiles compactos. **Por categoría:** card con título + total del mes a la derecha; **dona con el top al centro** ("Top · Mercado · 34%") + **filas rankeadas** color·nombre·%·monto construidas desde los mismos segmentos coloreados de la dona (leyenda y barras dejan de ser dos listas paralelas: una sola lista cuenta la historia; la paleta unificada dona↔filas se conserva por construcción).

### D4. La variación de gasto nunca alarma en rojo (re-declara ADR 019/IV.3)

El chip de variación va **verde solo cuando el gasto baja** (`↓ 8% vs mes anterior`, con `i-trending-down`); si sube queda **neutro** (nunca rojo); sin base de comparación (mes anterior en cero), texto neutro sin porcentaje (regla existente que el rediseño conserva).

### D5. Detalle fino y renta: filas colapsables limpias (progressive disclosure)

Cada `<details>` conserva su mecánica (incluido el cómputo diferido de PERF.3 y la apertura automática de renta cuando hay alerta), pero su `summary` pasa de encabezado con emoji a **fila limpia**: teja pizarra con ícono (`i-bar-chart` para "Más detalle de tus gastos", `i-percent` para "Estado de tu renta"), título, **subtítulo con el contenido** ("Vs mes anterior · patrón semanal · hormigas" / "5 criterios DIAN · topes por UVT") y chevron. "Estado de tu renta" muestra un **badge contador ámbar** con el número de criterios en alerta (`cerca` + `supera`), para que lo colapsado no esconda lo urgente. **El cuerpo interno no se rediseña en esta fase** (decisión D5 del doc de diseño, opción recomendada: fase siguiente si se desea).

### D6. Header sin acción de alta; contexto de mes como chip

Análisis no crea nada: su header ya no trae botón `+` (correcto hoy) y gana un **chip de mes** ghost ("Julio", con `i-agenda`) que ancla el periodo del análisis. El chip es presentación pura: `renderAnalisis()` escribe el mes actual en un nodo estático del shell.

### D7. Empty state único (antes: varias secciones "sin datos" apiladas)

Sin gastos registrados **y** sin activos **y** sin deudas, `renderAnalisis()` corto-circuita a **un único empty state**: teja pizarra con `i-analisis`, "Aún no hay suficientes datos", explicación de qué aparecerá y CTA **"+ Registrar un gasto"** (`data-action="nuevo-gasto"` existente, el modal es global). Con datos parciales (ej. cuentas sin gastos), el panel se muestra y cada card conserva su vacío puntual.

## Puntos pendientes del doc de diseño (resueltos con la recomendación, no bloquean)

1. **D1 score como hero con anillo + wash de banda:** se implementa; volver a la card plana es CSS.
2. **D2 barra de composición de activos:** se mantiene (mismo criterio que la validación D3 de Mis cuentas v2, donde Esteban la aprobó tal cual); quitarla es borrar un nodo.
3. **D5 rediseño interno de los colapsables:** fase siguiente; esta iniciativa solo rediseña las filas `summary`.
4. **ADR 033:** sigue en estreno parcial; este es su quinto consumidor con el mismo patrón acotado por sección (la unificación por token sigue siendo DV.2a).

## Guardarraíles (criterio de aceptación de cada rebanada ANL.2*)

1. Ambos temas, con contraste WCAG calculado (método IV.1) contra la parada fuerte del lavado de banda; texto muted nunca dentro del hero (lección medida de IN.8b).
2. La banda y la variación comunican con **color + ícono + texto** (SC 1.4.11 / 1.4.1); barras de factores acompañadas del número; dona y barra de composición decorativas con el dato en texto.
3. Cero cambios de lógica financiera; PERF.2/PERF.3 intactos (los tests de diferimiento siguen pasando sin cambiar su intención).
4. Pintura única: sin animar sombras; gráficos SVG estáticos; todo vía `var(--fk-*)`, cero color inventado.
5. Toque ≥ 44px en el ojo y las filas colapsables.
6. Tests verdes + bump de `CACHE_NAME` en cada rebanada que llegue a producción.

## Plan de rebanadas (tarjetas ANL.2a a ANL.2d en BOARD.md)

- **ANL.2a** - Score hero con anillo + wash de banda + chip de mes (D1+D6).
- **ANL.2b** - Patrimonio card-héroe con composición + ojo de privacidad (D2, D7-privacidad).
- **ANL.2c** - Grupo "A dónde va tu dinero": tendencia con chip + categorías rankeadas (D3+D4).
- **ANL.2d** - Filas colapsables limpias + badge de renta + empty state único (D5+D7); cierra la iniciativa.

## Alternativas rechazadas

- **Implementar el mockup como copia literal de estilos inline:** viola el sistema (`var(--fk-*)` obligatorio); se recrea con tokens y clases.
- **Wash del hero en pizarra de sección:** el doc de diseño lo descarta a propósito: el pizarra es identidad, la banda es el dato; un score crítico con lavado neutro mentiría por omisión.
- **Copiar las frases de explicación fijas por banda del mockup:** son datos demo; una frase fija ("tu liquidez puede mejorar") puede ser falsa para el usuario concreto. Se deriva del factor más débil real.
- **Mantener la lista completa de categorías con barras + leyenda de dona en paralelo:** duplicaba la misma información con dos representaciones; las filas rankeadas de los segmentos (top 5 + "Otros") son la única lista, con el total del mes como ancla.
- **Absorber ANL.1 en esta iniciativa:** son capas distintas (visual vs. interpretación); fusionarlas habría bloqueado el rediseño detrás de un motor de recomendaciones aún sin diseñar. Se declara la relación y ANL.1 conserva su alcance.
- **Agregar íconos nuevos al sprite (balanza, capas, recibo, actividad):** metáforas ya cubiertas por símbolos existentes; cero assets nuevos (criterio ADR 037).
