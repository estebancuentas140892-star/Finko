# ADR 037 - Calendario v2 (rediseño visual de la sección Calendario)

**Estado:** Aceptado (2026-07-13). Esteban envió el handoff de Claude Design con la instrucción explícita de implementarlo; los 4 puntos que el doc de diseño dejaba "pendientes de validar" se resuelven con su opción recomendada y quedan anotados abajo (ninguno bloquea).
**Fecha:** 2026-07-13
**Autores:** Esteban (visión de producto, envío del handoff), Claude Design (mockup `Calendario v2.dc.html` + doc `SCREENS/calendario-v2.md` del bundle "Iteración de specimen"), Claude Code (triaje e implementación).
**Relación:** cuarta pantalla de la familia visual v2; **consume el [ADR 033](033-direccion-visual-premium.md)** (degradado de identidad + sombra en reposo) y extiende su estreno parcial a un cuarto consumidor (Inicio, Mis cuentas, Deudas, ahora Calendario); hereda del [ADR 034](034-inicio-v2.md)/[ADR 035](035-mis-cuentas-v2.md)/[ADR 036](036-deudas-v2-visual.md) la disciplina del ojo de privacidad con posición estable y la anatomía del hero; respeta [ADR 021](021-recordatorio-dia-de-ingreso.md) (día de ingreso como evento con recordatorio de apartar), [ADR 031](031-identidad-de-color-por-seccion.md) (calendario = índigo `--fk-dom-agenda`; paleta `cal-dot--*` por tipo intacta, incluida la decisión IV.2c "fijo = índigo propio"), [ADR 019](019-limites-por-rol.md) (gastar/deber no es incumplir: refuerzo en positivo, sin rojo de alarma) y [ADR 026](026-biblioteca-de-recursos-graficos.md) (assets/svg/ como fuente de verdad de diseño).

---

## Contexto

`#sec-agenda` ("Calendario") es una vista calendario sobre `S.compromisos` + `S.ingresos` (no agrega datos propios). Hoy funciona, pero el mes **no tiene peso financiero**: la cabecera solo dice "9 compromisos este mes", sin decir cuánto sale ni cuánto va pagado; la grilla y el detalle comparten poco lenguaje con las pantallas ya rediseñadas (Inicio v2, Mis cuentas v2, Deudas v2); el día seleccionado se marca con borde neutro (blanco) que se confunde con "hoy"; y un mes sin eventos deja la pantalla vacía sin guiar a la acción. El handoff de Claude Design (2026-07-13) propone el rediseño visual completo, alineado con la familia v2.

## Triaje (regla 2.7)

- **Entra como iniciativa propia de la sección Calendario** (no había tarjeta previa: CAL.1/2/3 están cerradas), con el mismo rol que MC.18 en Mis cuentas y D.16 en Deudas: el bloque visual de su sección.
- **No pisa nada pendiente:** las tres observaciones del brief "Auditoría UX/UI Calendario" (triaje 2026-07-08) ya tienen fuente única (IV.2c cerrada, ADR 029, iniciativa CAT cerrada en su parte 2f) y este ADR no las reabre; construye sobre el resultado de IV.2c (tinte 8% por tipo en las tarjetas del detalle, "fijo" índigo).
- **No revierte ningún ADR:** cero cambios de lógica de calendario (`eventosDelMes`, `eventosIngresosDelMes`, frecuencias, CAL.3 auto-select y días vacíos clickeables quedan intactos). El único cálculo nuevo es un agregador puro (`totalesDelMes`) para el hero.
- **Íconos:** cero íconos nuevos en el sprite. El mockup usa `i-dumbbell` como teja ilustrativa de un gasto fijo, pero producción ya resuelve la teja real con `tejaMarca`/`tejaCategoria` (MK.2/ID.3/CAT.2f), que es más rica que el mockup. No se agrega.

## Decisión

Orden vertical nuevo (mobile): header + **hero del mes** + card de calendario (cabecera + grilla) + leyenda + detalle del día + (mes vacío: card de empty state).

### D1. Hero del mes con peso financiero (nuevo)

Hero al tope: label "Compromisos de julio" + **total del mes** protagonista (tabular, extrabold) + **barra de progreso** pagado/falta (relleno con el acento verde: pagar es avance, no identidad de la sección) + caption "Pagado $X · Falta $Y" + ojo de privacidad. Superficie: degradado de identidad agenda (`color-mix` de `--fk-dom-agenda` al 16% sobre `--fk-bg-surface`), borde agenda al 30%, sombra en reposo (cuarto consumidor del estreno parcial del ADR 033). El total del mes suma cada aparición de compromiso en el mes visible (`monto` para fijos, `cuotaMensual` para deudas; un quincenal cuenta dos veces); el pagado cruza `S.gastos` por `compromisoId` con tope en lo adeudado por compromiso. Mes sin pagos programados: label "Julio 2026" + "Sin pagos programados" + guía, sin ojo ni barra (un control que no enmascara nada confunde, disciplina ADR 034/035). La barra es decorativa (`aria-hidden`); los montos en texto portan la información (SC 1.4.11).

### D2. Grilla en card, celdas más legibles

La grilla vive en la card existente con sombra en reposo. Celdas cuadradas (`aspect-ratio: 1`, mínimo táctil 44px), contenido centrado (número arriba, fila de dots de 6px abajo, "+N" al desbordar 3), fondo transparente en reposo (la card es la superficie; la celda solo se pinta en hover/estados). Días pasados a opacidad 0.5. "Hoy" conserva el anillo verde acento + tinte sutil (sin cambios de criterio). El subtítulo de la cabecera separa compromisos de ingresos ("9 compromisos · 2 ingresos"): el día de ingreso no es un pago y no debe contarse como tal.

### D3. Día seleccionado en índigo de sección (antes borde neutro)

Seleccionado = anillo `--fk-dom-agenda-text` (índigo, variante `-text` por el umbral no textual 3:1 en tema claro, mismo criterio de IV.2c) + tinte índigo al 16%. "Hoy" y "seleccionado" se distinguen por color, no solo por grosor; si coinciden, gana el tratamiento de "hoy" (regla existente).

### D4. Detalle del día: items accionables con CTA por tipo

Cada item conserva su card tintada por tipo (IV.2c, 8%) y gana borde del color del tipo al 20% + **fila de acciones** explícita: `Editar` y `Eliminar` ghost (acciones `data-action` intactas) + CTA principal con la identidad del tipo: **Abonar** tintado frambuesa/rosa (mismo criterio que `.deuda-card__abonar`: un abono no es un ingreso, no va en verde), **Marcar pagado** en índigo de la sección. El **día de ingreso** (ADR 021) presenta su recordatorio como callout verde con ícono (`i-bulb`) + CTA `Distribuir →` (mismo `data-action`, lanza el asistente de Mis cuentas vía EventBus).

### D5. Estado de pago explícito (completo / parcial / pendiente)

Item pagado → badge pill verde con `i-check` + "Ya pagaste este mes", sin CTA (regla existente). El estado **parcial** ("Abonado $X de $Y este mes") se **preserva** como pill neutra: el mockup lo omitió por simplicidad, pero el doc de diseño exige explícitamente no eliminarlo. El total del día cambia de label: "Total a pagar" (neutro) → "Pagado este día" (verde) cuando todos los compromisos del día están completos.

### D6. Empty state del mes

Mes sin ningún evento → card con borde punteado bajo el calendario: teja índigo con `i-agenda`, "Julio está despejado" + "Programa tus gastos fijos y deudas para no perder ningún pago" + CTA `+ Agregar gasto fijo` (`data-action="nuevo-gasto-fijo"` existente). La grilla sigue visible (el mes se puede navegar) y los días vacíos siguen clickeables (CAL.3 intacta).

### D7. Privacidad coherente

El ojo del hero enmascara total del mes + pagado/falta + montos del detalle del día juntos. Reutiliza `S.config.ocultarSaldo`: un solo flag en toda la app (IN.2), posición absoluta estable (ADR 034 D3). Máscara larga (`SALDO_MASCARA`) para el total del mes y el total del día; corta (`SALDO_MASCARA_CUENTA`) para los montos por item, mismo criterio que el hero de Inicio.

## Puntos pendientes del doc de diseño (resueltos con la recomendación, no bloquean)

1. **D1 hero completo vs. liviano:** se implementa completo (total + barra de progreso); degradar a "solo total" es borrar dos nodos si Esteban lo prefiere.
2. **D3 seleccionado índigo:** se implementa; revertir es un token en `.cal-day--selected`.
3. **D5 estado parcial:** se preserva (mandato explícito del doc de diseño).
4. **ADR 033:** sigue en estreno parcial; este es su cuarto consumidor con el mismo patrón acotado por sección (la unificación por token sigue siendo DV.2a, sin cambios).

## Guardarraíles (criterio de aceptación de cada rebanada CAL.4*)

1. Ambos temas, con contraste WCAG calculado (método IV.1) contra la parada fuerte del degradado; texto muted nunca dentro del hero (lección medida de IN.8b).
2. Pintura única: sin animar `box-shadow`, sin bucles; todo vía `var(--fk-*)`, cero color inventado (paleta `cal-dot--*` intacta).
3. Cero cambios de lógica de calendario: CAL.3 (auto-select + días vacíos clickeables) y las frecuencias siguen cubiertas por sus tests sin modificar su intención.
4. El color nunca viaja solo: leyenda, badges y callouts llevan texto y/o ícono (SC 1.4.11).
5. Toque ≥ 44px en celdas y botones de acción.
6. Tests verdes + bump de `CACHE_NAME` en cada rebanada que llegue a producción.

## Plan de rebanadas (tarjetas CAL.4a a CAL.4c en BOARD.md)

- **CAL.4a** - Hero del mes + agregador `totalesDelMes` + ojo (D1+D7 sobre el hero).
- **CAL.4b** - Grilla legible + selección índigo + empty state del mes (D2+D3+D6).
- **CAL.4c** - Detalle del día accionable: CTA por tipo + estado de pago + máscara del detalle (D4+D5; extiende D7 al detalle).

## Alternativas rechazadas

- **Implementar el mockup como copia literal de estilos inline:** viola el sistema (`var(--fk-*)` obligatorio); se recrea con tokens y clases.
- **Sumar el hero leyendo `compromisos/logic.js` desde `agenda/logic.js`:** rompería la pureza documentada del módulo (recibe datos como argumentos, duplica deliberadamente lo mínimo, ver nota de `totalDia`); `totalesDelMes` replica el criterio de `calcularAbonosDelMes` (gasto con `compromisoId` + prefijo de mes) como duplicación intencional del mismo tipo.
- **Barra de progreso en índigo de sección:** el verde acento ya significa "avance/pagado" en toda la app (progreso de metas, "Pagado" del detalle); pintarla índigo diría "identidad" donde hay que decir "progreso".
- **Agregar `i-dumbbell` al sprite:** teja ilustrativa del mockup; producción resuelve tejas reales por marca/categoría (más informativas). Cero assets nuevos.
- **Ocultar el detalle del día en mes vacío (como el mockup):** revertiría CAL.3 (días vacíos clickeables con mensaje explícito), que es decisión de producto verificada; se conserva CAL.3.
