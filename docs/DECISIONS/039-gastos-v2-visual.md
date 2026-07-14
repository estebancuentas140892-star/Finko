# ADR 039 - Gastos v2 (rediseño visual de la sección Gastos)

**Estado:** Aceptado (2026-07-14). Esteban envió el handoff de Claude Design con la instrucción explícita de implementarlo; los 4 puntos que el doc de diseño dejaba "pendientes de validar" se resuelven abajo con la opción más coherente con decisiones ya aprobadas (uno de ellos, el FAB, se descarta con rationale explícito porque duplicaría el ADR 024).
**Fecha:** 2026-07-14
**Autores:** Esteban (visión de producto, envío del handoff), Claude Design (mockup `Gastos v2.dc.html` + doc `SCREENS/gastos-v2.md` del bundle "Iteración de specimen"), Claude Code (triaje e implementación).
**Relación:** sexta pantalla de la familia visual v2; **consume el [ADR 033](033-direccion-visual-premium.md)** (degradado de identidad + sombra en reposo, sexto consumidor tras Inicio, Mis cuentas, Deudas, Calendario y Análisis); hereda del [ADR 034](034-inicio-v2.md)/[ADR 037](037-calendario-v2-visual.md) la disciplina del ojo de privacidad con posición estable y el flag único `S.config.ocultarSaldo` (IN.2); respeta [ADR 031](031-identidad-de-color-por-seccion.md) (gastos = naranja `--fk-dom-gastos`), [ADR 019](019-limites-por-rol.md) + IV.3/[ADR 038](038-analisis-v2-visual.md) D4 (gastar más no es incumplir: la variación nunca alarma), [ADR 024](024-reorganizacion-navegacion-movil.md) (botón central "Registrar" del bottom nav, razón por la que el FAB del mockup NO se implementa) y TX.8b/TX.9a (categorías internas excluidas; la categoría es el título del gasto).

---

## Contexto

`#sec-gast` ("Gastos") es donde el usuario registra y revisa el gasto cotidiano. Hoy apila: barra de mes + chips (`renderFiltrosGastos`), franja fina de resumen (`_renderResumen`: conteo + total), lista plana recientes-primero (`_renderGastoItem`) y dos empty states. **El dato más importante ("¿cuánto llevo gastado este mes?") vive en una franja delgada sin jerarquía**, la lista plana no tiene anclas temporales, y `detectarHormigas()` (lógica valiosa de `logic.js`) no se muestra en ninguna pantalla. El handoff de Claude Design (2026-07-14) propone el rediseño visual completo, alineado con la familia v2.

## Triaje (regla 2.7)

- **Entra como iniciativa propia de la sección Gastos** (rebanadas GAS.1a a GAS.1c), el mismo rol que MC.18, D.16, CAL.4 y ANL.2 en sus secciones: el bloque visual de la sección.
- **No pisa la iniciativa CAT** (taxonomía de categorías, picker de "Otra categoría"): este rediseño no toca el formulario ni el catálogo de categorías; solo la vista de la sección.
- **No revierte lógica:** `gastosMes`, `filtrarGastos`, `ordenarRecientesPrimero`, `totalGastos`, `detectarHormigas`, TX.8b (categorías internas fuera de la lista) y "el total describe lo visible" se conservan intactos. `_renderResumen` (franja fina) desaparece porque su dato sube al hero.
- **Dos elementos del mockup NO se implementan**, con decisión explícita (detalle en D6/D8 abajo): el **FAB** de registro (duplicaría el botón central "Registrar" del ADR 024 que el artboard del mockup no tiene) y el **botón de búsqueda** del header (funcionalidad nueva sin decisión de diseño; si Esteban la quiere, es tarjeta propia).
- **Íconos:** cero íconos nuevos en el sprite (criterio ADR 037/038). Los del mockup se resuelven con símbolos existentes: comparativo → `i-trending-down`/`i-trending-up`; insight hormiga → `i-lightbulb`; empty states → `i-gastos`/`i-search` (tejas) en vez de `emptyArt`; ojo → `i-eye`/`i-eye-off`; tejas de categoría → resolver existente `iconoDeCategoriaGasto`/`iconoPorOrigen` (los `c-*` del mockup ya existen).

## Decisión

Orden vertical (mobile-first): header actual + **hero del mes** (navegación de mes integrada + total protagonista + comparativo) + chips de categoría + insight de gastos hormiga (cuando aplica) + lista agrupada por día + empty states v2.

### D1. Hero del mes (antes: barra de resumen fina + mes aparte)

Hero al tope con la anatomía de la familia (ADR 033: degradado de identidad gastos al 15% sobre `--fk-bg-surface`, borde naranja al 28%, sombra en reposo): **navegación de mes integrada arriba** (‹ Julio 2026 ›, reutiliza las acciones `gastos-prev-mes`/`gastos-next-mes`), label "Gastaste este mes" y **total protagonista** (clamp ~38px/800 tabular, mismo patrón de los otros heroes). Con un filtro de categoría activo, el label pasa a "Gastaste en {categoría}" y el total recalcula a lo visible (regla existente: el total describe lo visible). La franja `_renderResumen` desaparece (el conteo "8 gastos" no sobrevive: no respondía ninguna pregunta que el total y la lista no respondan).

### D2. Comparativo vs mes anterior (nuevo)

Chip bajo el total: "8% menos que junio" con `i-trending-down`. **Criterio de color: el de IV.3/ADR 038 D4, no el del mockup.** El mockup pedía ámbar `--fk-warning` para la subida; la app ya decidió dos veces (fix IV.3 y ADR 038 D4) que la variación de gasto va **verde solo cuando baja y neutra cuando sube, nunca alarmante**: un tercer tratamiento divergente en Gastos rompería el criterio único. Ámbar en Gastos y neutro en Análisis para el mismo dato habría sido incoherente. Esto resuelve el pendiente 3 del doc de diseño con una decisión ya aprobada. El chip **se oculta** cuando hay filtro de categoría activo (comparar una categoría contra el mes completo confundiría, decisión del mockup), cuando el mes anterior no tiene base (total 0) y cuando el mes visible está vacío. Variación 0% → "Igual que junio", neutro.

### D3. Lista agrupada por día (antes: lista plana)

Grupos por día con encabezado (Hoy / Ayer / "Vie 11 jul") + **total del día** a la derecha. `ordenarRecientesPrimero()` se conserva; una función pura nueva `agruparPorDia()` agrupa el resultado conservando el orden. Los ítems conservan `.list-item` tal cual (teja de categoría + categoría como título TX.9a + fecha/nota en subtítulo + monto + editar/eliminar): el estilo de grupo se aplica por contenedor, sin tocar la base compartida (mismo criterio que MC.18d). El label del día usa `formateadorFecha` cacheado (PERF.7a).

### D4. Insight de gastos hormiga (reusa `detectarHormigas`, hoy oculto)

Tarjeta insight con tinte gastos (anatomía `.gmf-insight` de MC.18c: teja + título + descripción) cuando `detectarHormigas(gastosMes sin internas)` devuelve resultados: "Gastos hormiga: {categoría}" + "N gastos pequeños suman $X este mes. Pequeños, pero se acumulan." Se muestra **solo en la vista "Todos"** (sin filtro), al tope de la lista, solo con mes poblado. **La comparación tangible del mockup ("más que tu recibo de luz") NO se incluye:** era el pendiente 1 del doc de diseño; como copy fijo puede ser falsa para el usuario concreto (mismo criterio que descartó las frases fijas del score en ANL.2a) y calcularla contra un fijo real del Calendario es una feature de interpretación que pertenece a ANL.1/el motor de sugerencia por categoría (fusión TX.10/LIM.1/ANL.1). Si Esteban la quiere ya, es una extensión pequeña de esta tarjeta.

### D5. Chips de categoría con identidad de sección

La fila de chips se conserva (scroll horizontal, "Todos" + categorías del mes); el chip activo deja el acento verde global y viste la **identidad gastos con el patrón ya aprobado en D.16b** (tinte 12% sobre surface + borde 50% + anillo interior, texto primario), no el relleno sólido del mockup: el sólido #ff8a5c exigiría un token nuevo de tinta oscura válido en ambos temas. Medición (método IV.1) que fija el texto primario: el ink `--fk-dom-gastos-text` sobre el tinte da 4.39:1 en tema claro (bajo AA para el texto xs del chip); el primario da 11.9:1 oscuro / 15.2:1 claro. Es exactamente lo que hace la card activa del picker de estrategia: la identidad va en superficie/borde, el texto queda primario. Modificador `chip--gastos` por contenedor; los chips de otras secciones no cambian.

### D6. FAB de registro rápido: NO se implementa (choca con ADR 024)

El mockup propone un FAB flotante porque su artboard tiene un bottom nav plano de 5 ítems **sin** botón central de registro. La app real ya tiene, desde el [ADR 024](024-reorganizacion-navegacion-movil.md) (NAV.A2a), un **botón central "Registrar" permanente en el bottom nav** (a un toque de la teja "Gasto", visible en todas las secciones) más el botón "+ Nuevo gasto" del header de la sección. Un FAB naranja flotando a ~70px del botón central "+" del nav serían dos botones flotantes de registro compitiendo en la misma esquina de la pantalla: exactamente la duplicación que el propio doc de diseño pedía validar (su pendiente 2). Implementarlo revisaría de facto el ADR 024, y eso no se hace en silencio (regla 2.7): **si Esteban prefiere el FAB, la decisión formal es suya** y la implementación es pequeña (un botón fijo + CSS). La premisa del mockup ("en la lista poblada no hay CTA persistente") no aplica a la app real.

### D7. Empty states v2 (se conservan, reestilizados)

Los dos estados actuales pasan a la anatomía `.cal-empty` de la familia (card con teja grande de dominio + título + descripción + CTA): mes sin gastos → teja naranja `i-gastos` + "Sin gastos este mes" + copy cálido del mockup + CTA primario "+ Registrar gasto" (acción existente); filtro sin resultados → teja neutra `i-search` + CTA ghost "Ver todos" (acción existente). Sin cambio de lógica.

### D8. Header sin cambios (la búsqueda del mockup queda fuera)

El header de la sección conserva título + "+ Nuevo gasto". El botón de búsqueda del mockup es **funcionalidad nueva** (no existe búsqueda de gastos en la app) que ningún D-decision del doc de diseño desarrolla; entra al backlog solo si Esteban la pide como tarjeta propia.

### D9. Ojo de privacidad (disciplina de familia, no estaba en el mockup)

El hero lleva el **ojo de posición estable** (top-right, ADR 034 D3), sexto consumidor del flag único `S.config.ocultarSaldo`: enmascara el total del hero (`SALDO_MASCARA`), los totales por día y los montos de los ítems y del insight hormiga (`SALDO_MASCARA_CUENTA`). Enmascarar solo el hero dejaría la fuga que ANL.2b ya cerró en Análisis (la suma de montos visibles reconstruye el total oculto). El chip comparativo (porcentaje) queda visible: la proporción no revela montos (precedente ANL.2b). Acción nueva `gastos-saldo-visibilidad`, espejo de `agenda-saldo-visibilidad`.

## Puntos pendientes del doc de diseño (resueltos, no bloquean)

1. **Comparación tangible del insight hormiga:** fuera de esta iniciativa (D4); pertenece al motor de interpretación (ANL.1). Validar con Esteban si la quiere como extensión.
2. **FAB vs accesos existentes:** resuelto descartando el FAB (D6); revertible con decisión explícita de Esteban.
3. **Tono del comparativo al gastar más:** resuelto con el criterio ya aprobado IV.3/ADR 038 D4 (neutro, no ámbar) (D2).
4. **Íconos de categoría del sprite:** ya cubiertos; los `c-*` del mockup existen y el resolver `iconoDeCategoriaGasto`/`iconoPorOrigen` ya los aplica. Cero assets nuevos.

## Guardarraíles (criterio de aceptación de cada rebanada GAS.1*)

1. Ambos temas, con contraste WCAG calculado (método IV.1) contra la parada fuerte del degradado gastos; texto muted nunca dentro del hero (lección de IN.8b).
2. Comparativo e insight comunican con **color + ícono + texto** (SC 1.4.1); los totales por día en texto.
3. Cero cambios de lógica financiera; TX.8b y "el total es lo visible" intactos.
4. Pintura única, sin animaciones nuevas; todo vía `var(--fk-*)`, cero color inventado.
5. Toque ≥ 44px en ojo y navegación de mes; chips ≥ 32px.
6. Tests verdes + bump de `CACHE_NAME` en cada rebanada que llegue a producción.

## Plan de rebanadas (tarjetas GAS.1a a GAS.1c en BOARD.md)

- **GAS.1a** - Hero del mes con navegación integrada + comparativo + ojo (D1+D2+D9-hero).
- **GAS.1b** - Lista agrupada por día + chips con identidad + máscara de la lista (D3+D5+D9-lista).
- **GAS.1c** - Insight de gastos hormiga + empty states v2 (D4+D7); cierra la iniciativa.

## Alternativas rechazadas

- **Implementar el mockup como copia literal de estilos inline:** viola el sistema (`var(--fk-*)` obligatorio); se recrea con tokens y clases.
- **FAB + botón central del nav conviviendo:** dos controles flotantes de registro a centímetros uno del otro; duplicación que el propio doc de diseño advertía (ver D6).
- **Chip activo con relleno sólido naranja (mockup):** exigiría un token nuevo de tinta oscura para ambos temas; el patrón tinte+ink de D.16b ya está calibrado AA y es el lenguaje de la familia (ver D5).
- **Comparativo en ámbar al gastar más (mockup):** divergiría del criterio único ya decidido en IV.3/ADR 038 D4 para el mismo dato (ver D2).
- **Copy fijo "más que tu recibo de luz" en el insight:** puede ser falso para el usuario concreto; mismo criterio que descartó las frases fijas del mockup del score en ANL.2a (ver D4).
- **Conservar la franja de resumen (conteo + total) bajo el hero:** duplicaba el total y el conteo no responde ninguna pregunta útil; el hero y los totales por día cubren ambas.
