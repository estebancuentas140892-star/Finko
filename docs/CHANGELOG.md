# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-07)

### feat(infra): MC.13c-1 obligacionesYAportesDelCobro, la composición "qué toca con este cobro" · 2026-07-14

Tercera rebanada de **MC.13** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D2). Sobre las dos mitades del motor, una función compone la pregunta que el asistente debe responder: **qué toca con ESTE cobro**, en vez de "cómo reparto todo lo del mes".

**Archivos tocados**

- `modules/infra/vencimientos.js`: `obligacionesYAportesDelCobro({cobro, compromisos, gastos, metas, apartados, fondo, hoyISO})` → `{ventana, vencidas, enVentana, aportes}`. `vencidas` mira un período hacia atrás (desde el cobro anterior hasta ayer): lo que este dinero puede cubrir y el cobro pasado no cubrió. `enVentana` va de hoy hasta el próximo cobro. `aportes` (fondo, metas, apartados) trae la **cuota del período según la frecuencia real del cobro**, que es el punto 21 del brief. Pura: recibe los datos inyectados, no lee `S` ni importa dominios.
- `tests/unit/vencimientos.test.js`: 40 tests nuevos (98 en total).
- `service-worker.js`: `CACHE_NAME` v397 → v398.

**Dos decisiones de diseño que tomó esta rebanada**

- **Una fila por compromiso, no por ocurrencia.** Si un fijo Semanal cae tres veces en la ventana, es una fila de monto × 3, no tres filas. Un `Gasto` solo guarda `compromisoId`, `fecha` y `monto`: no dice a qué ocurrencia corresponde, así que atribuir pagos a ocurrencias concretas sería inventar el dato. Comparar el total del rango contra lo esperado del rango es la lectura honesta, y es la regla que las deudas ya usaban.
- **Un mismo compromiso puede estar vencido y volver a vencer en la ventana.** El arriendo del día 5 sin pagar en julio está vencido, y el del 5 de agosto vuelve a caer antes del próximo cobro: son dos deudas reales, no una repetida. Los dos tramos son disjuntos, así que ninguna ocurrencia se cuenta dos veces.

**Nada la consume todavía** (mismo patrón que MC.13a, cuyas `ocurrenciasEnRango`/`ventanaDelCobro` también aterrizaron antes que su consumidor): la verificación es unitaria. Wiring en **MC.13c-2**, que quedó bloqueada por tres decisiones de producto, ver BOARD.

**Corrección al ADR 041:** el ADR afirma que MC.7g se cierra "sin código especial". El motor sí resuelve las frecuencias, pero la checklist no puede consumirlo sin decidir antes qué significa "ya lo pagaste" (mes calendario vs ventana del cobro) y qué registra marcar una fila de varias ocurrencias. Detalle en la tarjeta MC.13c-2.

**Verificación:** 2793/2793 unit + 205/205 E2E + lint verdes.

---

### refactor(infra): MC.13b motor de vencimientos mitad B + Metas y Apartados borran sus copias · 2026-07-14

Segunda rebanada de **MC.13** (Distribución v2, [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D1 mitad B): **el motor compartido queda completo**. La mitad B responde "cada cuánto entra dinero y cuánto toca aportar por período", que es lo que estaba **duplicado carácter por carácter** en `metas/logic.js` y `apartados/logic.js`. La duplicación no era descuido: ADN #10 impide que un dominio importe a otro, y cada archivo lo comentaba como "duplicado intencional". Infra sí la pueden importar los dos, así que la copia única vive ahí.

**Archivos tocados**

- `modules/infra/vencimientos.js`: mitad B nueva. `FRECUENCIAS_APORTE` (la lista que era `FRECUENCIAS_AHORRO` en Metas y `FRECUENCIAS_APORTE` en Apartados), `normalizarFrecuenciaAporte` (los mapas `MAPA_FRECUENCIA_A_*`: lo más largo que un mes se planifica al mes), `diasPorPeriodo` (los `DIAS_POR_PERIODO*`: 1/7/15/30), `etiquetaPeriodo`, `frecuenciaPrincipalIngresos` y `aportePorPeriodo(faltante, fechaObjetivoISO, frecuencia, hoyISO)`, el reparto del faltante entre períodos reales con `hoyISO` inyectable.
- `modules/dominio/metas/logic.js`: borra sus copias. `calcularAhorroPorPeriodo` queda como envoltorio del motor; `FRECUENCIAS_AHORRO` y `etiquetaPeriodoAhorro` pasan a ser alias re-exportados (la vista y sus tests no cambian una línea). Conserva su `diasHastaFecha`, que la vista usa aparte.
- `modules/dominio/apartados/logic.js`: igual. `calcularAporteSugerido` queda como envoltorio; `FRECUENCIAS_APORTE`, `etiquetaPeriodo` y `frecuenciaPrincipalIngresos` se re-exportan.
- `tests/unit/vencimientos.test.js`: 26 tests nuevos de la mitad B (59 en total).
- `service-worker.js`: `CACHE_NAME` v396 → v397.

**Efecto colateral bueno, y uno que conviene saber:** el motor valida lo que las copias no validaban (mismo criterio que la validación de `diaPago` de MC.13a). Una fecha que no existe ya no desborda a otro mes ('2026-02-30' devuelve `null` en vez de calcular sobre el 1 de marzo) y un faltante no finito devuelve `null`; antes Metas propagaba `NaN` hasta la vista si le llegaba una fecha basura. En el camino normal el comportamiento es idéntico.

**Verificación:** refactor sin cambio de comportamiento, así que la prueba es que **no se tocó ni un test existente**: los 86 de `metas.test.js` y los 87 de `apartados.test.js` pasan intactos contra el motor compartido, igual que los 139 de `agenda.test.js` para la mitad A. 2754/2754 unit + 205/205 E2E + lint verdes.

**Qué desbloquea:** MC.13c (`obligacionesYAportesDelCobro`) ya tiene sus dos mitades. Los consumidores previstos (cuota del período del asistente, punto 21; prellenar Aportar de Apartados en AP.5; fondo de emergencia en AH.5; plan de aportes de Metas v2 en MT.6) importan de un solo sitio en vez de copiar por tercera vez.

---

### feat(infra): MC.13a motor de vencimientos mitad A + Agenda lo consume · 2026-07-14

Primera rebanada de **MC.13** (Distribución v2, [ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D1 mitad A). Nace el motor compartido de vencimientos: la regla de "en qué días cae una obligación según su frecuencia", que vivía duplicable en Agenda, pasa a una sola fuente de verdad en `infra/` que la Distribución v2 (MC.13c), los pagos automáticos (PA.1) y Agenda comparten.

**Qué cambió:** (1) `modules/infra/vencimientos.js` (nuevo, puro, sin dominio, ADN #10): `ocurrenciasEnMes(item, year, month)` (extrae la regla de frecuencias de `_diasParaCompromiso` de Agenda: Mensual/Quincenal/Semanal/Diario/Bimestral/Trimestral/Semestral/Anual/Única vez, con validación de `diaPago` incorporada), `ocurrenciasEnRango(item, inicioISO, finISO)` (generaliza a una ventana arbitraria que puede cruzar meses: la base de la ventana de cobro de MC.13c) y `ventanaDelCobro(frecuencia, fechaCobroISO)` (ventana del cobro para TODAS las frecuencias; a diferencia de `ultimoPagoHasta`, que sólo cubre Mensual/Quincenal; Mensual usa el mes calendario con clamp de fin de mes, el resto su longitud en días/meses). (2) `modules/dominio/agenda/logic.js`: `eventosDelMes` y `eventosIngresosDelMes` pasan a **consumir** `ocurrenciasEnMes`; se eliminan los helpers `_diasParaCompromiso`, `_caeEnCiclo`, `_diasDelMes` y `_parseFechaISO` (ya no duplicados). Comportamiento idéntico (la validación de `diaPago` ahora vive dentro de `ocurrenciasEnMes`, que devuelve `[]` si es inválido). (3) `service-worker.js`: `infra/vencimientos.js` en `CORE_ASSETS`, v395→v396.

**Archivos tocados:** `modules/infra/vencimientos.js` (nuevo), `modules/dominio/agenda/logic.js`, `tests/unit/vencimientos.test.js` (nuevo, 33 tests: frecuencias, validación, rango cruzando meses, ventana por frecuencia, coherencia ventana↔ocurrencias), `service-worker.js`.

**Verificación:** 2728/2728 unit (incluye los 139 de `agenda.test.js`, la red de regresión del refactor) + 205/205 E2E completos + lint verdes.

**Podría afectar:** nada visible al usuario. Es refactor puro: Agenda calcula lo mismo desde una fuente compartida. El Calendario (grilla, dots, detalle del día) queda idéntico (verificado por los E2E de Calendario y los 139 unit de Agenda).

---

### feat(nav): NAV2.1c pastilla "Registrar" con degradado + indicador fijo, cierra Navegación v2 completa · 2026-07-14

Tercera y última rebanada de **Navegación v2** ([ADR 040](DECISIONS/040-navegacion-v2-visual.md) D5): **la iniciativa queda completa** (NAV2.1a-c en un día, séptima pantalla de la familia visual v2). Quedan registradas en el ADR las decisiones diferidas: **badges de notificación** (decidir qué cuenta el badge es de Esteban; el CSS `.nav-item__badge` ya existe sin consumidores) y el tooltip estilizado de la sidebar colapsada (se conservó el `title` nativo).

**Qué cambió:** `styles/responsive.css`: (1) el botón central "Registrar" del bottom nav pasa de círculo 46px con fondo plano a **pastilla 50x38** (radio lg) con el degradado de acento (el mismo de la marca "F" de NAV2.1b) y sombra teñida con `--fk-accent-border` (reemplaza un rgba hardcodeado heredado). (2) El **indicador de sección activa** pasa de `width: 44%` (crecía con el viewport) a **22px fijos**.

**Archivos tocados:** `styles/responsive.css`, `service-worker.js` (v394→v395).

**Verificación:** 2695/2695 unit + 205/205 E2E completos + lint verdes (CSS puro, sin tests nuevos: los E2E de navegación y reflow-320 cubren la barra). Visual con Playwright/Chromium a 390x844.

**Podría afectar:** solo presentación de la barra inferior móvil; la acción `registrar-abrir-hoja` y la hoja "Registrar" no cambian.

---

### feat(nav): NAV2.1b marca "F" con degradado en el sidebar + grupo diario sin rótulo · 2026-07-14

Segunda rebanada de **Navegación v2** ([ADR 040](DECISIONS/040-navegacion-v2-visual.md) D4).

**Qué cambió:** (1) `index.html`: el logo del sidebar cambia el emoji 💚 por la **marca "F"** (`.sidebar__logo-mark`); cierra el último emoji decorativo de la UI estructural (pendiente del ADR 023) y sobrevive al modo colapsado como marca mínima. El rótulo visible "Diario" del primer grupo desaparece (el mockup abre directo con los items); el nombre queda para lectores de pantalla vía `aria-label="Uso diario"` en el `role="group"`. (2) `styles/layout.css`: `.sidebar__logo-mark` (34px, radio md, degradado `--fk-accent-hover`→`--fk-accent`, tinta `--fk-text-on-accent`, sombra con `--fk-accent-border`); solo tokens, ambos temas.

**Archivos tocados:** `index.html`, `styles/layout.css`, `tests/e2e/hub-ahorros.test.js` (test del sidebar desktop actualizado: rótulos visibles = Seguimiento/Ahorros, grupo diario localizado por aria-label, marca "F" presente), `service-worker.js` (v393→v394).

**Verificación:** 2695/2695 unit (incluye el pase axe sobre `index.html`) + 205/205 E2E completos + lint verdes. Visual con Playwright/Chromium a 1280x800 en sidebar expandida y colapsada.

**Podría afectar:** solo presentación del sidebar desktop; navegación, colapso persistido y tooltips nativos intactos.

---

### feat(nav): NAV2.1a menú "Más" como hoja agrupada con tejas de dominio + toggle de tema, abre Navegación v2 · 2026-07-14

Triaje del handoff de Claude Design "Navegación v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 040](DECISIONS/040-navegacion-v2-visual.md)** aceptado + iniciativa NAV2.1 con rebanadas NAV2.1a-c en el BOARD, séptima pantalla de la familia visual v2. Hallazgo del triaje: la estructura del mockup ya existe (sidebar con grupos + colapsar del ADR 024 D6, barra de 5 slots con "Registrar" central del D1, tinte por dominio de IV.2a); el delta real es el menú "Más" y dos pulidos. Decisiones: **revisa explícitamente el ADR 024 D5** (vuelven los rótulos de grupo y las 4 secciones de ahorro recuperan entrada directa; el hub NAV.B con pestañas + consolidado queda intacto), **badges de notificación diferidos** (exige decidir qué cuenta el badge; decisión de producto de Esteban), tooltip nativo de la colapsada se conserva (el estilizado del mockup se recortaría por el scroll del nav), y el sheet conserva un cierre accesible que el mockup omite.

**Qué cambió:** (1) `index.html`: `#modal-mas` reescrito como **hoja inferior**: asa, cierre discreto, grupos "Gestión del dinero" (Deudas, Mis cuentas, Me deben, Límites de gasto, Análisis) y "Ahorros" (Fondo de emergencia, Metas, Apartados, Inversión), fila final Ajustes + **botón de tema** (regresa al menú tras retirarse en una fase anterior; alterna sin cerrar la hoja, la sección Apariencia de Ajustes no cambia). (2) `styles/modals.css`: presentación de hoja reutilizable (`.modal-overlay--sheet`/`.modal--sheet`, ancla inferior + entrada deslizada; a ≤480px el bottom-sheet global existente la gobierna a propósito) + tiles horizontales `.mas-tile` con **teja teñida por el dominio** vía el mapeo `[data-section]` de IV.2a (cero mapeo nuevo; `-text` para glifos, regla IV.1) y **tile activo** con tinte 10% + borde 45%; las clases `.menu-mas__*` quedan intactas para Registrar y accesos de Inicio. (3) `modules/ui/shell.js`: `markActiveNav()` marca también `.mas-tile[data-section]` (clase + `aria-current`); `_syncThemeButton()` pasa de un solo elemento a **todos** los toggles (checkbox de Ajustes + botón del sheet con swap de glifo `#i-moon`/`#i-sun` y `aria-pressed`). (4) `modules/ui/menu-mas.js`: solo doc (cierra al navegar; el botón de tema no cierra por ser `<button>` sin href).

**Archivos tocados:** `index.html`, `styles/modals.css`, `modules/ui/shell.js`, `modules/ui/menu-mas.js`, `tests/unit/shell-nav.test.js` (nuevo, 6 tests: markActiveNav con tiles y botón "Más", sync multi-toggle con glifo y checkbox), `tests/e2e/hub-ahorros.test.js` (2 reescritos a la estructura nueva + 1 nuevo: tile activo resaltado y tema alterna sin cerrar la hoja), `service-worker.js` (v392→v393), `docs/DECISIONS/040-navegacion-v2-visual.md` (nuevo), BOARD/HANDOFF/contexto.

**Verificación:** 2695/2695 unit + 205/205 E2E completos + lint verdes. Visual con Playwright/Chromium en 390x844, ambos temas (glifo sol/luna correcto; el preview embebido congela transiciones y no sirve para screenshots: verificado el mecanismo con estilos computados y las capturas con Chromium real).

**Podría afectar:** en móvil, el menú "Más" cambia de presentación (hoja inferior) y las 4 secciones de ahorro se alcanzan con un toque directo (antes: tarjeta "Ahorros" → pestañas). El resaltado del botón "Más" (`MAS_SECTIONS`) y los deep links no cambian.

---

### feat(gastos): GAS.1c insight de gastos hormiga + empty states v2, cierra Gastos v2 completo · 2026-07-14

Tercera y última rebanada de **Gastos v2** ([ADR 039](DECISIONS/039-gastos-v2-visual.md) D4/D7). **La iniciativa queda completa** (GAS.1a-c cerradas el mismo día): Gastos es la sexta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035), Deudas (ADR 036), Calendario (ADR 037) y Análisis (ADR 038).

**Qué cambió:** (1) `modules/dominio/gastos/view.js`: **insight de gastos hormiga** (`_renderInsightHormigas()`): pone por fin en pantalla `detectarHormigas()` (existía en `logic.js` desde TX.3 sin ninguna vista). Tarjeta con la anatomía de `.gmf-insight` (MC.18c) en tinte gastos: teja `i-lightbulb` + "Gastos hormiga: {categoría top}" + "N gastos pequeños suman $X este mes. Pequeños, pero se acumulan." Solo en la vista "Todos" (con filtro activo se oculta), solo con mes poblado; el monto respeta el ojo (D9). La comparación tangible del mockup ("más que tu recibo de luz") quedó fuera por decisión del ADR (pendiente 1: pertenece al motor de interpretación de ANL.1). (2) **Empty states v2** (D7): los dos estados pasan de `.empty-state` genérico a `.gastos-empty` con la anatomía de `.cal-empty` (CAL.4b): mes vacío → teja naranja `i-gastos` + copy ampliado del mockup ("...y verás aquí a dónde se va tu dinero") + CTA primario; filtro sin resultados → teja neutra `i-search` + CTA ghost "Ver todos" (acciones existentes, cero lógica nueva). (3) `styles/components/domain.css`: bloques `.gastos-insight*` (glifo `-text` sobre teja 15%: ~3.9:1 oscuro / ~4.1:1 claro, ≥ 3:1 umbral de glifo) y `.gastos-empty*` nuevos; `emptyArt` deja de usarse en Gastos.

**Archivos tocados:** `modules/dominio/gastos/view.js`, `styles/components/domain.css`, `tests/unit/gastos.test.js` (6 nuevos: insight con categoría top/conteo/total, sin hormigas sin tarjeta, filtro la oculta, máscara del ojo, empty de mes con teja+CTA, empty de filtro con teja neutra+Ver todos), `tests/e2e/smoke.test.js` (1 nuevo: 6 domicilios pequeños sembrados → insight visible y se oculta al filtrar; nota del test: el seed va por `addInitScript` + `reload`, un `goto` a la misma URL con hash es navegación same-document y no re-arranca la app), `tests/e2e/navegacion-render.test.js` (selector del empty state migrado a `.gastos-empty__title`), `service-worker.js` (v391→v392).

**Verificación:** 2689/2689 unit + 204/204 E2E completos + lint verdes.

**Podría afectar:** usuarios con muchos gastos pequeños de una misma categoría (≤ $20.000 c/u que suman ≥ $100.000 al mes) ven ahora una tarjeta informativa al tope de la lista que antes no existía; no altera filtros, totales ni CRUD. Los dos empty states cambian solo de presentación.

---

### feat(gastos): GAS.1b lista agrupada por día + chips con identidad + máscara de montos · 2026-07-14

Segunda rebanada de **Gastos v2** ([ADR 039](DECISIONS/039-gastos-v2-visual.md) D3/D5/D9).

**Qué cambió:** (1) `modules/dominio/gastos/logic.js`: `agruparPorDia()` pura nueva: agrupa por fecha exacta conservando el orden recibido (el caller entrega `ordenarRecientesPrimero`, así que los grupos salen del más reciente al más antiguo) con total por grupo. (2) `modules/dominio/gastos/view.js`: `renderListaGastos()` pinta **grupos por día** (`_renderGrupoDia`): encabezado con label humano (`_labelDia`: "Hoy" / "Ayer" / "Vie 11 jul", + año solo si no es el año en curso; `formateadorFecha` cacheado PERF.7a, UTC mediodía como `fechaLegible`) + **total del día** a la derecha. El subtítulo del ítem ya no repite la fecha (vive en el encabezado del grupo): quedan la descripción legacy y la nota, y la línea se omite si no hay ninguna. (3) **Máscara de la lista** (D9): con el ojo activo, el total del día y los montos de los ítems van en `SALDO_MASCARA_CUENTA`; se cierra la fuga que GAS.1a dejaba señalada (sumar los montos visibles reconstruía el total oculto del hero, la misma clase de hueco que ANL.2b cerró en Análisis). (4) **Chips con identidad** (D5): modificador `chip--gastos`; el activo deja el acento verde global y viste el patrón de la card activa del picker de estrategia (D.16b): tinte gastos 12% sobre surface + borde 50% + anillo interior + **texto primario** (el ink naranja sobre el tinte mide 4.39:1 en claro, bajo AA; el primario 11.9:1 oscuro / 15.2:1 claro; medición en el ADR, cuyo D5 se corrigió para reflejarla). (5) `styles/components/domain.css`: `.gastos-dia*` nuevos; los `.list-item` del grupo ganan radio lg + sombra en reposo **por contenedor** (mismo criterio que `#lista-ingresos` en MC.18d: la base compartida de atoms no cambia).

**Archivos tocados:** `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/view.js`, `styles/components/domain.css`, `docs/DECISIONS/039-gastos-v2-visual.md` (D5 corregido con la medición), `tests/unit/gastos.test.js` (11 nuevos: 5 de `agruparPorDia`, 6 de la vista: grupo "Hoy" con total, dos días dos grupos con formato humano, máscara de día e ítems, subtítulo sin fecha, sin subtítulo vacío, chips con identidad), `tests/e2e/smoke.test.js` (1 nuevo: dos gastos de hoy → grupo "Hoy" con total $117.000 y máscara del ojo), `service-worker.js` (v390→v391).

**Verificación:** 2683/2683 unit + 203/203 E2E completos + lint verdes.

**Podría afectar:** el subtítulo de los ítems de Gastos ya no muestra la fecha (la porta el encabezado del día); un gasto sin nota ni descripción legacy muestra solo la categoría. Los montos de la lista ahora respetan el ojo de privacidad. La vista completa de Movimientos (TX.8b) no cambió: sigue plana con su propio formato.

---

### feat(gastos): GAS.1a hero del mes con total protagonista + comparativo + ojo, abre Gastos v2 · 2026-07-14

Triaje del handoff de Claude Design "Gastos v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 039](DECISIONS/039-gastos-v2-visual.md)** aceptado + iniciativa "Gastos v2" con rebanadas GAS.1a-c en el BOARD, sexta pantalla de la familia visual v2. Decisiones de triaje del ADR: el **FAB del mockup no se implementa** (duplicaría el botón central "Registrar" del ADR 024, que el artboard del mockup no tiene; si Esteban lo prefiere, la decisión formal es suya), la búsqueda del header queda fuera (funcionalidad nueva sin decisión de diseño) y el comparativo usa el criterio único IV.3/ADR 038 D4 en vez del ámbar del mockup. Primera rebanada implementada (D1+D2+D9-hero).

**Qué cambió:** (1) `modules/dominio/gastos/view.js`: `renderFiltrosGastos()` reescrita: la barra "‹ Mes ›" suelta y la franja fina de resumen (`_renderResumen`, retirada junto con el conteo "8 gastos") pasan a un **hero de familia v2** (`_renderHeroGastos()`): navegación de mes integrada arriba (mismas acciones `gastos-prev-mes`/`gastos-next-mes`), label contextual ("Gastaste este mes", o "Gastaste en {categoría}" con filtro activo) y **total protagonista de lo visible** (clamp ~38px mono extrabold, tabular-nums). Sexto consumidor del estreno parcial del ADR 033 (degradado de identidad gastos 15% + borde 28% + sombra en reposo). (2) **Chip comparativo** (`_renderComparativo()` + `variacionMensualGasto()` pura en `logic.js`): "8% menos que junio" con `i-trending-down` en verde (`.chip-success` de atoms) solo cuando el gasto baja; al subir queda **neutro con `i-trending-up`** (criterio IV.3/ADR 038 D4, nunca alarmante); "Igual que {mes}" sin ícono si no hubo cambio; oculto con filtro activo, mes visible vacío o sin base (mes anterior en 0, internas TX.8b excluidas de la base). (3) **Ojo de privacidad** (D9): sexto consumidor del flag único `S.config.ocultarSaldo` (IN.2); acción nueva `gastos-saldo-visibilidad` en `index.js` (espejo de `agenda-saldo-visibilidad`); enmascara el total con `SALDO_MASCARA` (la máscara de la lista llega con GAS.1b). El ojo vive en una grilla `[espaciador | nav | ojo]` en vez del absoluto de los demás heroes: misma posición visual top-right, sin colisión con la nav centrada a 320px. (4) `styles/components/domain.css`: bloque `.hero-gastos*` nuevo (contraste método IV.1 contra la parada fuerte del degradado: oscuro #3b2c2c primario 11.15:1 / secundario 5.67:1; claro #ffede7 14.83:1 / 7.51:1); `.mes-nav*` y `.gastos-resumen*` retirados (solo Gastos los usaba); `.hero-gastos__ojo` sumado al grupo compartido de ojos.

**Archivos tocados:** `docs/DECISIONS/039-gastos-v2-visual.md` (nuevo), `docs/BOARD.md`, `modules/dominio/gastos/view.js`, `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`, `styles/components/domain.css`, `tests/unit/gastos.test.js` (17 nuevos: 7 de `variacionMensualGasto`, 10 del hero: total y label, nav dentro del hero, filtro recalcula, verde al bajar, neutro al subir, internas fuera de la base, sin base sin chip, filtro oculta comparativo, máscara del ojo, mes vacío), `tests/e2e/smoke.test.js` (1 nuevo: hero con total + toggle del ojo), `service-worker.js` (v389→v390).

**Verificación:** 2672/2672 unit + 202/202 E2E completos + lint verdes.

**Podría afectar:** solo presentación de la cabecera de Gastos (filtros, orden de lista, form y CRUD intactos). El conteo "N gastos" de la franja vieja ya no se muestra. El total del mes ahora respeta el ojo de privacidad (antes Gastos era la única sección de la familia sin máscara); los montos de los ítems se enmascaran en GAS.1b.

---

### feat(analisis): ANL.2d filas colapsables limpias + empty state único, cierra Análisis v2 completo · 2026-07-13

Cuarta y última rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D5/D7). **La iniciativa queda completa** (ANL.2a-d cerradas el mismo día): Análisis es la quinta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035), Deudas (ADR 036) y Calendario (ADR 037).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: los `summary` de los dos colapsables ("Más detalle de tus gastos" y "Estado de tu renta") pasan de encabezado con emoji a **fila limpia**: teja pizarra con ícono existente (`i-bar-chart` / `i-percent`, cero íconos nuevos por el criterio del ADR 037), título, **subtítulo con el contenido** ("Vs mes anterior · patrón semanal · hormigas" / "5 criterios DIAN · topes por UVT") y el chevron `::after` que ya existía. Renta suma un **badge contador ámbar** con los criterios en alerta (`cerca` + `supera`) + texto `sr-only`, para que lo colapsado no esconda lo urgente; la apertura automática cuando hay alerta se conserva, y el **cuerpo interno de los colapsables no se rediseña** (decisión D5 del doc de diseño). (2) **Empty state único** (D7): sin gastos registrados, sin activos, sin deudas **y sin señal fiscal**, `renderAnalisis()` corto-circuita a `_renderEmptyAnalisis()`: teja pizarra `i-analisis`, "Aún no hay suficientes datos", explicación y CTA "+ Registrar un gasto" (acción global `nuevo-gasto`). Los datos de renta manuales (Ajustes → Datos de renta) y los flags del perfil fiscal cuentan como datos: el monitor K.3 tiene contenido real para ese usuario y no se esconde tras un "sin datos" (refinamiento dentro del espíritu del D7: "con datos parciales, el panel se muestra"). (3) `styles/components/analysis.css`: modificador `.analisis-grupo--fila` (superficie v2 + sombra en reposo) + `.analisis-grupo__teja/__texto/__title/__sub/__badge` nuevos; la base `.analisis-grupo` quedó **intacta** porque el desglose de Límites (`.grupo-card__desglose`) la reutiliza. `.analisis-empty*` con el mismo lenguaje de `.cal-empty` (CAL.4b): borde punteado de invitación, teja de sección. PERF.2/PERF.3 intactos (el diferimiento por `toggle` y su listener no cambiaron).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `styles/components/analysis.css`, `tests/unit/analisis.test.js` (6 nuevos: empty state con CTA y sin cards, datos parciales muestran el panel, señal fiscal evita el empty, fila del detalle con teja/título/subtítulo, fila de renta sin badge sin alertas, badge con criterio cerca del tope; la aserción de PERF.3 que usaba "Vs mes anterior" como marcador de cuerpo pintado pasó a `comparacion__tabla` porque ese texto ahora vive en el subtítulo del summary, misma intención; fixtures "todo vacío" de ANL.2a y PERF.7d ajustados con el dato mínimo para escapar del empty state sin alterar lo que verifican), `tests/e2e/smoke.test.js` (1 nuevo: usuario sin datos ve un único empty state y el CTA abre el modal de gasto), `service-worker.js` (v388→v389).

**Verificación:** 2655/2655 unit + 201/201 E2E completos + lint verdes.

**Podría afectar:** usuarios recién llegados a Análisis sin ningún dato ven ahora una sola invitación en vez de la pila de secciones con vacíos parciales (score crítico "vacío", patrimonio en ceros). El monitor de renta ya no es visible con la app totalmente vacía (antes se dibujaba con sus 5 criterios "Sin datos en Finko"); reaparece con cualquier dato real o señal fiscal manual.

---

### feat(analisis): ANL.2c "A dónde va tu dinero", tendencia con chip + categorías rankeadas · 2026-07-13

Tercera rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D3/D4).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: tendencia y categorías dejan de ser dos secciones sueltas con `h2` propios y pasan a **dos cards bajo el rótulo "A dónde va tu dinero"** (`.analisis__group-label`, patrón `.bento__group-label` de Inicio v2). (2) `_renderTendencia()`: la variación sale de la grilla de stats y pasa a **chip** en la cabecera de la card, con ícono `i-trending-up/down` + texto; **verde solo cuando el gasto baja** (`↓ 25% vs mes anterior`), neutro si sube, neutro sin ícono sin base de comparación o sin cambio (D4, re-declara ADR 019/IV.3 explícitamente en el markup). El sparkline pasa del verde acento al **pizarra de sección** (`--fk-dom-analisis-text`: la serie es contexto, el color con significado lo aporta el dato); las stats quedan en 3 tiles (Este mes / Máximo / Mínimo). (3) `_renderPorCategoria()` (firma nueva `(gastoMes, segmentos)`): dona de 120 con **el top al centro** ("Top · Mercado · 67%") + **filas rankeadas construidas desde los mismos segmentos coloreados de la dona** (color·nombre·%·monto); la leyenda y la lista completa de barras eran dos representaciones paralelas de lo mismo y se unifican en una sola lista (la paleta unificada dona↔filas queda garantizada por construcción); el total del mes ancla la cabecera. (4) CSS: `.analisis__group*`, `.tend-card*`, `.catg-card*` nuevos en `analysis.css`; `charts.css` conserva solo los primitivos (`.sparkline`, `.chart-axis*`, `.donut`; el wrap del sparkline pierde su chrome de card: la tend-card ya es la superficie); `.chart-stats/.chart-stat*/.chart-legend*/.chart-donut-wrap/.analisis__cat-layout/.cat-row*/.cat-list` retirados (solo Análisis los usaba, verificado); referencias migradas en `base.css` (tabular-nums) y `responsive.css` (reglas móviles de `.chart-stats`/`.cat-row` retiradas).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `styles/components/analysis.css`, `styles/components/charts.css`, `styles/base.css`, `styles/responsive.css`, `tests/unit/analisis.test.js` (5 nuevos: rótulo del grupo, chip verde al bajar con ícono, chip neutro al subir, 3 stats, total + top al centro; el describe de paleta unificada se reescribió a la estructura nueva: fila i = color del arco i), `tests/e2e/smoke.test.js` (1 nuevo), `service-worker.js` (v387→v388).

**Verificación:** 2649/2649 unit + 200/200 E2E completos + lint verdes.

**Podría afectar:** solo presentación de tendencia y categorías (la lógica `serieGastosMensual`/`seriePorCategoria`/`colorearSegmentos` no cambió). La lista de categorías ahora muestra los 6 segmentos de la dona (top 5 + "Otros") en vez de todas las categorías con barras: el detalle completo por categoría sigue en "Más detalle de tus gastos" (comparación vs mes anterior).

---

### feat(analisis): ANL.2b patrimonio neto como card-héroe con composición + ojo de privacidad · 2026-07-13

Segunda rebanada de **Análisis v2** ([ADR 038](DECISIONS/038-analisis-v2-visual.md) D2).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: `_renderPatrimonio()` reescrita: la pila "hero + 2 metric-cards" pasa a **una sola card** (`.patri-card`) con teja pizarra (`i-saldo`) + kicker, cifra grande del neto (verde si ≥ 0 con `--fk-text-accent`, rojo `--fk-danger-text` si < 0; deber más de lo que se tiene sí es una alerta real, no viola ADR 019), leyenda "activos − pasivos", **barra de composición de activos** (`_BUCKETS_ACTIVOS`: Cuentas/Metas/Apartados/Inversión, solo buckets > 0, cada segmento con el color crudo de su dominio ADR 031; decorativa `aria-hidden`) y dos columnas compactas Activos / Pasivos. Los **porcentajes de composición van en texto** en la columna de Activos ("Cuentas 61% · Metas 12% · Inversión 27%"): la barra nunca es la única portadora del dato (SC 1.4.11); reemplazan a los montos por bucket que mostraba la card vieja (cada monto exacto vive en su propia sección). El aviso de deudas sin saldo se conserva. (2) **Ojo de privacidad** (IN.2): quinto consumidor del flag único `S.config.ocultarSaldo`; máscara larga para el neto (`SALDO_MASCARA`), corta para Activos/Pasivos (`SALDO_MASCARA_CUENTA`); los porcentajes no se enmascaran (proporción no revela montos, mismo criterio que la barra del hero de agenda). Acción nueva `analisis-saldo-visibilidad` en `analisis/index.js` (espejo de `agenda-saldo-visibilidad`; nota de cabecera del módulo actualizada: sigue sin mutar datos financieros). (3) `styles/components/analysis.css`: bloque `.patri-card*` reemplaza a `.patrimonio-hero*` y `.metric-*` (solo Análisis los usaba, verificado); superficie neutra + `--fk-shadow-sm` (la identidad semántica vive en el signo del neto). `styles/components/domain.css`: `.patri-card__ojo` se suma al grupo compartido de ojos (posición estable, ADR 034 D3). `styles/base.css`/`styles/responsive.css`: referencias `metric-card__value`/`patrimonio-hero__valor` migradas a las clases nuevas; las reglas móviles de `.metric-grid`/`.patrimonio-hero` se retiran (la card nueva es 2 columnas fijas y padding único).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `modules/dominio/analisis/index.js`, `styles/components/analysis.css`, `styles/components/domain.css`, `styles/base.css`, `styles/responsive.css`, `tests/unit/analisis.test.js` (5 nuevos: positivo con columnas, negativo con signo, composición con porcentajes en texto, sin activos sin barra, máscara integral + porcentajes visibles), `tests/e2e/smoke.test.js` (1 nuevo: toggle del ojo enmascara y desenmascara), `service-worker.js` (v386→v387).

**Verificación:** 2645/2645 unit + 199/199 E2E completos + lint verdes.

**Podría afectar:** solo presentación del patrimonio (la lógica `calcularActivos`/`calcularPasivos`/`calcularPatrimonioNeto` no cambió). Quien tenga el ojo activo ahora ve enmascarado también el patrimonio de Análisis (antes quedaba visible: era una fuga del control de privacidad IN.2, la misma clase de hueco que CAL.4c cerró en Calendario). Los montos por bucket de activos dejan de mostrarse en esta card (los reemplaza el porcentaje; el monto exacto vive en su sección).

---

### feat(analisis): ANL.2a score de salud como héroe + chip de mes, abre Análisis v2 · 2026-07-13

Triaje del handoff de Claude Design "Análisis v2" (bundle "Iteración de specimen", enviado por Esteban con instrucción de implementar) → **[ADR 038](DECISIONS/038-analisis-v2-visual.md)** aceptado + iniciativa "Análisis v2" con rebanadas ANL.2a-d en el BOARD, quinta pantalla de la familia visual v2. El ADR declara la relación con ANL.1 (avanza sus puntos visuales 4/5/7/8; la interpretación sigue allá) y conserva PERF.2/PERF.3 intactos. Primera rebanada implementada (D1+D6).

**Qué cambió:** (1) `modules/dominio/analisis/view.js`: `_renderScoreSalud()` reescrita como **hero** con wash del color de la banda (no del pizarra de sección: el color es el dato): anillo `progressRing` de 132px con el score y "de 100" en overlay HTML, pill de banda (ícono + texto), factores 2×2 (`_FACTORES_SCORE`) con mini-barras en el color de banda (dentro del hero el dato semántico manda; las barras por dominio de IV.2b siguen fuera de él), y **frase humana** vía `_fraseScore()` que nombra el factor más débil real ("Atención a tu liquidez: es lo que más está frenando tu score."), reemplazando el desglose técnico "Deuda 80/100 • ..." redundante con las barras; las frases fijas por banda del mockup se descartaron por ser datos demo (podían ser falsas para el usuario concreto, ADR 038). (2) **Chip de mes** (D6): Análisis es de solo lectura y su header no lleva botón `+`; el chip ghost (`#analisis-chip-mes`, `i-agenda`) ancla el mes analizado; `renderAnalisis()` escribe el nombre (`_MESES` local, duplicación deliberada por ADN 10). (3) `styles/components/analysis.css`: `.score-hero*` reemplaza `.score-card*` (wash `color-mix` banda 14% sobre surface + borde 30% + sombra en reposo, quinto consumidor del estreno parcial del ADR 033); `--score-banda` pinta superficies y `--score-banda-ink` (variantes `-text`) pinta trazos; el texto del pill va en `--fk-text-primary` porque el ink apilado sobre el wash cae bajo AA (medido: crítica oscuro 3.70, ajustada claro 4.05); `progress-bar--score-*` y `.score-factor__bar` sobreviven (los usan los criterios de renta K.3). (4) `styles/layout.css`: `.section__chip` nuevo (genérico para secciones de solo lectura).

**Contraste (método IV.1):** primary/secondary sobre la parada fuerte del wash ≥ 5.49 en ambos temas y las 4 bandas; arco del anillo y mini-barras vs wash ≥ 4.43 (supera el 3:1 no textual), con el valor numérico siempre al lado (SC 1.4.11).

**Archivos tocados:** `modules/dominio/analisis/view.js`, `index.html` (chip del header), `styles/components/analysis.css`, `styles/layout.css`, `tests/unit/analisis.test.js` (6 nuevos: banda + pill con ícono, score en el anillo, 4 factores con valor junto a la barra, frase del factor más débil, refuerzo en excelente, chip de mes), `tests/e2e/smoke.test.js` (1 nuevo: hero + anillo + pill + 4 factores + chip con datos sembrados), `service-worker.js` (v385→v386).

**Verificación:** 2640/2640 unit + 198/198 E2E completos + lint verdes.

**Podría afectar:** solo presentación del score (la lógica `calcularScoreSalud`/`clasificarScore` no cambió). Quien lea el texto de explicación del score verá la frase humana nueva en vez del desglose técnico.

---

### feat(agenda): CAL.4c detalle del día accionable, cierra Calendario v2 completo · 2026-07-13

Tercera y última rebanada de **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md) D4/D5/D7). **La iniciativa queda completa** (CAL.4a-c cerradas el mismo día): Calendario es la cuarta pantalla de la familia visual v2 tras Inicio (ADR 034), Mis cuentas (ADR 035) y Deudas (ADR 036).

**Qué cambió:** (1) `modules/dominio/agenda/view.js`: `_renderDetalleDia()` calcula si todos los compromisos del día están completos (`estadoPagoMes`) y el label del total cambia "Total a pagar" (neutro) → **"Pagado este día"** (verde, `.cal-detail__total--pagado`; refuerzo positivo, ADR 019); un día mixto sigue en "Total a pagar". `_renderDetalleItem()`: el badge de pagado pasa de línea de texto "✓ ..." a **pill verde con `i-check-circle`**; el estado **parcial se preserva** ("Abonado $X de $Y este mes") como pill neutra tabular (mandato explícito del doc de diseño); los CTA dejan `.btn-primary` (verde genérico) por `.cal-detail__cta--<tipo>` con la identidad del tipo: **Marcar pagado** índigo agenda, **Abonar** frambuesa (entidad) / rosa (personal), mismo criterio que `.deuda-card__abonar` (ADR 036 D5: un abono no es un ingreso); Editar y Eliminar quedan intactos (mismas acciones ghost). `_renderDetalleItemIngreso()`: el recordatorio de apartar (ADR 021) pasa de línea de texto a **callout verde `.cal-detail__callout-ingreso`** con `i-lightbulb`, a ancho completo de la tarjeta; el CTA Distribuir sigue `btn-primary` (verde correcto: es dinero que entra). (2) **Máscara D7**: el ojo del hero enmascara ahora también el total del día (`SALDO_MASCARA`), los montos por item, el monto del ingreso y el badge parcial (`SALDO_MASCARA_CUENTA`, mismo criterio que IN.8c). (3) `styles/components/config.css`: pills de estado, callout de ingreso, `.cal-detail__cta*` (38px de alto, hit AA) y borde por tipo al 20% en `.cal-detail__item--*` (decorativo: el tipo lo porta el texto, SC 1.4.11); **`.cal-detail__badge-abono` y `.cal-detail__actions` migraron de `domain.css` a `config.css`**, junto al resto de la familia `.cal-detail__*` (navegabilidad; la animación `check-pop` sigue en forms.css).

**Archivos tocados:** `modules/dominio/agenda/view.js`, `styles/components/config.css`, `styles/components/domain.css` (bloques retirados con nota), `tests/unit/agenda.test.js` (8 nuevos: label neutro/pagado/mixto, pill con ícono y sin CTA, parcial preservado con CTA, clases de CTA por tipo + Editar/Eliminar intactos, callout de ingreso, máscara integral del detalle), `tests/e2e/smoke.test.js` (1 nuevo: día pagado muestra "Pagado este día" + pill; día pendiente muestra Abonar con la clase de su tipo), `service-worker.js` (v384→v385).

**Verificación:** 2634/2634 unit + 197/197 E2E completos + lint verdes.

**Podría afectar:** solo presentación del detalle del día; los `data-action` (`agenda-marcar-pagado-fijo`, `abrir-abono`, `agenda-distribuir-ingreso`, editar/eliminar) no cambiaron. Quien tenga el ojo de privacidad activo ahora ve enmascarados también los montos del detalle del calendario (antes quedaban visibles: era una fuga del control de privacidad IN.2).

---

### feat(agenda): CAL.4b grilla legible + selección índigo + empty state del mes · 2026-07-13

Segunda rebanada de **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md) D2/D3/D6).

**Qué cambió:** (1) `styles/components/config.css`: `.cal-day` pasa a celda cuadrada con contenido centrado (`aspect-ratio: 1`, piso táctil 44px AA, techo 72px para que el grid no crezca desmedido en desktop) y **fondo transparente en reposo** (antes cada celda llevaba `--fk-bg-elevated`; la card ya es la superficie, la celda solo se pinta en hover y en los estados hoy/seleccionado); `.cal-day--selected` cambia de borde neutro `--fk-text-primary` (se confundía con "hoy") a **anillo índigo de sección** (`--fk-dom-agenda-text` + tinte `--fk-dom-agenda` al 16%; variante `-text` porque el token crudo falla el umbral no textual 3:1 en tema claro, mismo criterio que `cal-dot--*` en IV.2c); días pasados bajan de opacidad 0.55 a 0.5; `.cal-card` gana `--fk-shadow-sm` (sombra en reposo, ADR 033); bloque `.cal-empty*` nuevo (borde punteado, teja índigo de 48px con `i-agenda`); la media query móvil de `.cal-day` queda solo con la tipografía (el piso táctil ya vive en la regla base). (2) `modules/dominio/agenda/view.js`: `_renderGrid()` pinta la fila `.cal-day__dots` **siempre** (vacía y `aria-hidden` si el día no tiene eventos, `min-height: 6px`) para que el número quede a la misma altura en todas las celdas del grid centrado; `_renderCabecera()` gana el parámetro `eventosIng` y el subtítulo separa compromisos de ingresos ("2 compromisos este mes · 1 ingreso"; el día de ingreso no es un pago, ADR 021); `_renderEmptyMes()` nuevo (ADR 037 D6), renderizado al final del panel cuando `totalEventosDelMes(eventos) === 0`: "<Mes> está despejado" + "Programa tus gastos fijos y deudas para no perder ningún pago" + CTA `+ Agregar gasto fijo` (`data-action="nuevo-gasto-fijo"` existente). La grilla sigue visible en mes vacío y los días vacíos siguen clickeables (CAL.3 intacta: el empty state convive con el detalle "Sin compromisos ni ingresos este día").

**Archivos tocados:** `styles/components/config.css`, `modules/dominio/agenda/view.js`, `tests/unit/agenda.test.js` (6 nuevos: subtítulo con/sin ingresos, empty state con CTA, sin empty state con un solo ingreso, convivencia con CAL.3, fila de dots en todas las celdas), `tests/e2e/smoke.test.js` (1 nuevo: mes vacío muestra la card y el CTA abre el modal de gasto fijo), `service-worker.js` (v383→v384).

**Verificación:** 2626/2626 unit + 196/196 E2E completos + lint verdes.

**Podría afectar:** solo presentación del grid del calendario y el bloque nuevo de mes vacío. El test E2E de reflow a 320px y las suites de Agenda pasan sin cambios; los `data-action` y clases `cal-day--*` que consumen los E2E existentes no cambiaron de nombre.

---

### feat(agenda): CAL.4a hero del mes con total + progreso pagado + ojo de privacidad · 2026-07-13

Primera rebanada de la iniciativa **Calendario v2** ([ADR 037](DECISIONS/037-calendario-v2-visual.md), aceptado en esta misma sesión tras el triaje del handoff de Claude Design "Iteración de specimen" enviado por Esteban). El mes ahora responde de un vistazo "¿cuánto me sale y cuánto llevo pagado?": hero al tope de `#panel-agenda`, cuarto consumidor del estreno parcial del ADR 033 (degradado de identidad índigo + sombra en reposo), con la misma anatomía que los heroes de Mis cuentas (MC.18a) y Deudas (D.16a).

**Qué cambió:** (1) `modules/dominio/agenda/logic.js`: `totalesDelMes(eventos, gastos, prefijoMes)` nuevo (puro): `total` suma cada aparición de compromiso del mes (`monto` fijos / `cuotaMensual` deudas, criterio de `totalDia`: un quincenal cuenta dos veces, los ingresos no son dinero a pagar, montos no positivos no suman); `pagado` cruza gastos por `compromisoId` + prefijo del mes (criterio de `calcularAbonosDelMes`, duplicado intencional ADN #10) con tope en lo adeudado por compromiso (pagar de más no infla el progreso). (2) `modules/dominio/agenda/view.js`: `_renderHeroMes()` con variante poblada (label "Compromisos de <mes>", total 38px tabular, barra de progreso decorativa `aria-hidden` con relleno acento verde: pagar es avance, no identidad de sección; caption "Pagado $X / Falta $Y") y variante "Sin pagos programados" (mes sin compromisos con monto, aunque tenga ingresos: guía sin cifra, sin barra y sin ojo, disciplina ADR 034/035). (3) `modules/dominio/agenda/index.js`: acción `agenda-saldo-visibilidad` (flip de `S.config.ocultarSaldo` + `save()` + `updSaldo()`, mismo flag de toda la app IN.2) y el listener de `state:change` ahora incluye `gastos` (el pagado del hero y los badges del detalle lo leen; antes la ficha lo daba por hecho pero el listener no lo incluía). (4) `styles/components/config.css`: bloque `.hero-agenda*` (contraste WCAG medido contra la parada fuerte del degradado: oscuro #282d44 → primario 11.39:1, secundario 5.79:1, acento 7.55:1; claro #eaedfd → 14.44:1, 7.31:1, 5.69:1). (5) `styles/components/domain.css`: `.hero-agenda__ojo` sumado a la lista compartida de ojos de hero.

**Archivos tocados:** `modules/dominio/agenda/logic.js`, `modules/dominio/agenda/view.js`, `modules/dominio/agenda/index.js`, `styles/components/config.css`, `styles/components/domain.css`, `tests/unit/agenda.test.js` (16 nuevos: 9 de `totalesDelMes`, 7 del hero), `tests/e2e/smoke.test.js` (3 nuevos: total/progreso, ojo con persistencia del flag vía `expect.poll` por el debounce de `save()`, variante sin pagos), `service-worker.js` (v382→v383).

**Verificación:** 2620/2620 unit + 195/195 E2E completos + lint verdes.

**Podría afectar:** el tope de la sección Calendario (bloque nuevo, el resto del panel no cambia de estructura) y la frecuencia de re-render de agenda (ahora también con `state:change` de `gastos`; `renderSmart` solo pinta con la sección visible). El ojo comparte flag con Inicio/Mis cuentas/Deudas: ocultar en Calendario oculta en toda la app (comportamiento buscado, IN.2).

---

### feat(apartados): CAT.1b plantillas de Apartados curadas según la taxonomía Apartados↔Metas · 2026-07-13

Segunda rebanada de implementación de **CAT.1** (`docs/BOARD.md`), Apartados↔Metas. `PLANTILLAS_APARTADO` pasa de 17 a 20 plantillas.

**Qué cambió (`modules/dominio/apartados/logic.js`):** sale **Vacaciones** ✈️ (ya vive en `CATEGORIAS_META`). "Matrícula o semestre" se divide: la plantilla queda como **"Matrícula escolar"** 🎓 (colegio anual o semestral, gasto esporádico); el semestre universitario se planea como Meta (categoría Educación ya existe ahí). "Útiles escolares" se amplía a **"Útiles y uniformes"** 🎒. Entran **Veterinario** 🩺, **Mantenimiento del hogar** 🛠️, **Seguro del hogar** 🛡️ y **Reparaciones inesperadas** 🧰 (catálogo de esporádicos olvidables definido por Esteban).

**Hallazgo de la rebanada:** a diferencia de `CATEGORIA_ICONO` (Gastos), un apartado ya creado no referencia `PLANTILLAS_APARTADO` en su render: `_aplicarPlantilla()` copia `nombre`/`icono` una sola vez al crear el apartado. Retirar o renombrar una plantilla es seguro para los apartados existentes (conservan su nombre/ícono guardado); la plantilla retirada solo deja de ofrecerse para apartados nuevos. Ningún cambio en `_aplicarPlantilla()` ni `renderFormApartado()` (agnósticos al contenido del catálogo).

**Archivos tocados:** `modules/dominio/apartados/logic.js` (`PLANTILLAS_APARTADO`), `tests/unit/apartados.test.js` (6 tests actualizados/nuevos: conteo 17→20, exclusión de Vacaciones/Matrícula o semestre/Útiles escolares, presencia de las 4 nuevas), `service-worker.js` (v381→v382).

**Verificación:** 2604/2604 unit + 192/192 E2E completos + lint verdes.

**Podría afectar:** solo las plantillas rápidas ofrecidas al crear un apartado nuevo. Apartados existentes creados desde cualquier plantilla (incluidas las retiradas o renombradas) no cambian de nombre ni ícono.

---

### feat(gastos): CAT.1a Gastos ya no ofrece Vivienda ni Servicios públicos, hint retirado · 2026-07-13

Primera rebanada de implementación de **CAT.1** (`docs/BOARD.md`), tras la validación de taxonomía de la misma sesión. Gastos↔Fijos: Vivienda y Servicios públicos salen del formulario de Gastos (siempre recurrentes con fecha fija, viven solo en Agenda) y el hint no bloqueante "esta categoría suele ser un gasto fijo" se retira por completo, revisando la decisión 4 del ADR 014 ("nudge, no muro"): Finko decide en vez de avisar.

**Qué cambió:** (1) `modules/core/constants.js`: `CATEGORIAS_GASTO_USUARIO` (filtro del formulario) excluye ahora también 'Vivienda' y 'Servicios públicos', sumándose a las ya excluidas (Deudas, Ahorro, Alimentación). `CATEGORIAS_GASTO` (catálogo base) las conserva intactas: `CATEGORIA_ICONO` y la validación de categorías de `presupuesto/logic.js` siguen resolviendo bien los gastos y límites ya guardados con esas categorías (mismo precedente que "Alimentación" v15, sin bump de schema). `CATEGORIAS_TIPICAMENTE_FIJAS` (el Set que impulsaba el hint) se elimina. (2) `modules/dominio/gastos/view.js`: `renderFormGasto()` ya no renderiza `<p id="hint-categoria-fija">`. (3) `modules/dominio/gastos/index.js`: `_montarFormGasto()` ya no adjunta el listener de `change` que mostraba/ocultaba el hint; import muerto retirado.

**Archivos tocados:** `modules/core/constants.js`, `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js`, `tests/unit/gastos.test.js` (2 tests viejos que afirmaban lo contrario del hint se reescriben, 4 tests nuevos), `service-worker.js` (v380→v381).

**Verificación:** 2600/2600 unit + 192/192 E2E completos + lint verdes.

**Podría afectar:** solo el formulario de nuevo gasto/edición de gasto. Gastos existentes con categoría "Vivienda" o "Servicios públicos" (incluidos los generados al pagar un fijo, TX.6/TX.7) siguen mostrando su ícono y su nombre sin cambios; solo dejan de ofrecerse como opción nueva. Los límites de gasto (`presupuesto`) que ya referencian esas categorías no se ven afectados (`CATEGORIAS_GASTO` intacto).

---

### docs(taxonomia): CAT.1 taxonomía global validada con Esteban, ADR 014 aceptado y ADR 029 D3 confirmada · 2026-07-13

Primer paso de **CAT.1** (`docs/BOARD.md`): sesión de validación de taxonomía con Esteban, una sola decisión para los tres documentos que cubrían la misma pregunta (ADR 014 en Propuesta desde junio, ADR 029 sección D3, criterios de la tarjeta CAT.1), como exigía el hallazgo del triaje del 2026-07-08. Solo documentación, sin código.

**Decisiones validadas:** (1) **Gastos↔Fijos**: Vivienda y Servicios públicos salen del formulario de Gastos y el hint "normalmente pertenece a fijos" (`CATEGORIAS_TIPICAMENTE_FIJAS` + `#hint-categoria-fija`) se retira por completo; esto **revisa la decisión 4 del ADR 014** ("nudge, no muro"), conflicto señalado explícitamente y ratificado por Esteban (regla 2.7). Educación queda en ambas secciones sin hint (doble cara real); Mercado, Transporte y Mascotas quedan duales. (2) **Apartados↔Metas**: sale Vacaciones (ya vive en Metas); "Matrícula o semestre" se divide (la plantilla queda como "Matrícula escolar", el semestre universitario se planea como Meta); entran Veterinario, Mantenimiento del hogar, Seguro del hogar y Reparaciones inesperadas; "Útiles escolares" se amplía a "Útiles y uniformes". (3) **Metas**: sale "Cumpleaños" y "Vacaciones"/"Viajes" se fusionan en "Viajes". (4) **Fijos no esenciales** (para LIM.1 punto 8): solo Streaming y Suscripciones; Gimnasio y Telefonía quedan esenciales (ajuste de Esteban sobre la propuesta). (5) **ADR 029 D3**: la tabla de 13 tags validada tal cual; la Fase 0 de ese ADR queda desbloqueada. **Hallazgo de la sesión:** no hace falta bump de schema (precedente "Alimentación" v15: filtrar del formulario conservando la entrada de ícono), lo que baja el modelo de implementación de Opus 4.8 - Extra a Sonnet 5 - Medio por rebanada.

**Archivos tocados:** `docs/DECISIONS/014-taxonomia-categorias-transversal.md` (Estado → Aceptada + sección "Validación 2026-07-13"), `docs/DECISIONS/029-catalogo-de-marcas-por-categoria.md` (Estado → Aceptada, D3 validada), `docs/contexto/transversal.md` (bloque nuevo "Taxonomía global de categorías"), `docs/BOARD.md` (CAT.1 re-cortada en CAT.1a-c; nota del punto 8 de LIM.1 actualizada), `docs/HANDOFF.md`.

**Podría afectar:** nada en runtime. Define el catálogo que CAT.1a-c implementarán y desbloquea CAT.3, el catálogo de AP.5, el punto 8 de LIM.1 y la Fase 0 del ADR 029.

---

### feat(transversal): CAT.2f selector de ícono en Gasto fijo/Calendario, sexto consumidor, cierra CAT.2 completa · 2026-07-13

Cierra **CAT.2f** (`docs/BOARD.md`), sexta y última rebanada del picker de ícono compartido: **Gasto fijo/Calendario** migrado (categoría "Otro"). Con esta rebanada **la iniciativa CAT.2 queda completa** (CAT.2a-f).

**Análisis previo (misma sesión, triaje 2.7):** la tarjeta señalaba una decisión bloqueante (alcance mínimo vs. categorías personalizadas completas, cruzada con la taxonomía de CAT.1 aún sin validar). Pregunta directa a Esteban: **alcance mínimo**, mismo patrón que CAT.2d/2e, sin esperar CAT.1. Las categorías nombradas nuevas (no solo el ícono de "Otro") quedan para CAT.3.

**Qué cambió:** (1) `agenda/view.js`: `renderFormGastoFijo()` agrega el grupo `#form-group-gfijo-icono` con `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'gfijo-icono' })`, oculto por defecto; `_renderDetalleItem()` resuelve `c.icono` antes que `CATEGORIA_AGENDA_ICONO[c.categoria]` (mismo patrón que la teja de Deudas, CAT.2d). (2) `agenda/index.js`: el form se re-renderiza completo en cada apertura (`_inyectarFormGastoFijo()`, como Gastos/Deudas/Apartados: no hace falta `resetIconoPicker`); `_syncCategoriaGastoFijo()` (ya era el listener de `change` del selector de categoría, AG.4) se extiende para alternar también `hidden` del grupo del ícono; `wireIconoPicker` se llama en cada `_inyectarFormGastoFijo()`; en modo edición, `setIconoPickerValor` prellena el ícono guardado. (3) `compromisos/logic/modelo.js`: `normalizarCompromiso()` gana `base.icono` en la rama `tipo==='fijo'` (antes solo existía en la rama de deuda desde CAT.2d): guarda el ícono solo si `categoria==='Otro'` Y el valor está en el catálogo, siempre explícito `null`/id válido. (4) `gastos/logic.js`: `iconoPorOrigen()` (TX.6/TX.7, herencia de ícono cuando un gasto nace de pagar un fijo) resuelve `comp.icono` antes que `CATEGORIA_AGENDA_ICONO[comp.categoria]`. (5) El checklist de "Distribuir mi ingreso" **no necesitó ningún cambio**: `construirDesgloseNecesidades()`/`_iconoNecesidad()` ya generalizaban por `it.icono` sin distinguir tipo desde CAT.2d.

**Archivos tocados:** `modules/dominio/agenda/view.js` (`renderFormGastoFijo`, `_renderDetalleItem`), `modules/dominio/agenda/index.js` (`_syncCategoriaGastoFijo`, `_inyectarFormGastoFijo`), `modules/dominio/compromisos/logic/modelo.js` (`normalizarCompromiso`), `modules/dominio/gastos/logic.js` (`iconoPorOrigen`), `tests/unit/compromisos.test.js` (5 tests nuevos), `tests/unit/agenda.test.js` (4 tests nuevos), `tests/unit/gastos.test.js` (1 test nuevo), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v379→v380).

**Verificación:** 2598/2598 unit + **192/192 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Agenda/Calendario al crear/editar un gasto fijo con categoría "Otro", y los gastos generados al pagarlo (heredan el ícono elegido en vez del genérico). Gastos fijos existentes con categoría "Otro" y sin ícono siguen mostrando el fijo `c-otros`, sin cambios visibles.

---

### feat(transversal): CAT.2e selector de ícono en Mis cuentas, quinto consumidor · 2026-07-13

Cierra **CAT.2e** (`docs/BOARD.md`), quinta y última rebanada nueva del picker de ícono compartido: **Mis cuentas** migrada (banco "Otro"). Misma naturaleza que CAT.2d (agrega elección de ícono, no reemplaza un campo existente), con un hallazgo adicional real: `cuenta.icono` ya existía en el schema, pero era **dato muerto**: `_iconoPorBanco()` asignaba un emoji a toda cuenta nueva (no solo "Otro"), y ningún render lo leía (`bancoAvatar()`/`tejaMarca()` resolvían la teja únicamente desde `BANCOS_CO`).

**Qué cambió:** (1) `_iconoPorBanco()` retirada; `normalizarCuenta()` ahora guarda `cuenta.icono` solo cuando `banco==='Otro'` y el valor elegido está en `ICONOS_CATEGORIA_PERSONALIZADA` (protege contra manipulación del DOM), siempre explícito (`null` si no aplica, nunca ausente, mismo patrón que `compromiso.icono` de CAT.2d para sobrevivir el merge shallow de `editar()`). (2) `infra/bancos.js`: `bancoAvatar(bancoId, icono)` gana el segundo parámetro; solo lo aplica como `simbolo` de la teja cuando `bancoId==='Otro'` Y el valor tiene forma de id de sprite (`/^[a-z]-[a-z0-9-]+$/`). Esta guarda es necesaria porque **cuentas ya guardadas antes de esta rebanada tienen un emoji en `icono`** (dato legado de `_iconoPorBanco()`), y sin validarlo se generaría un `<use href="#💚">` roto. (3) Los **6 call sites** de `bancoAvatar` en la app (`infra/cuenta-helper.js` ×3, `infra/render.js`, `tesoreria/views/transferencias.js`, `tesoreria/views/cuentas.js`) pasan `cuenta.icono`. (4) `tesoreria/views/cuentas.js`: `renderFormCuenta()` agrega el grupo `#form-group-icono` con el picker, oculto por defecto. (5) `tesoreria/acciones/cuentas.js`: el form de cuenta es un **singleton reusado** (como Metas, no como Gastos/Deudas/Apartados): `wireIconoPicker` se llama una sola vez en `inyectarFormCuenta()`; `_toggleCamposPorClase()` alterna la visibilidad del grupo según la clase del banco elegido (`clase==='otro'`); `_resetBankPicker()` llama `resetIconoPicker`; `_editarCuenta()` usa `setIconoPickerValor` para prellenar el ícono guardado.

**Archivos tocados:** `modules/infra/bancos.js` (`bancoAvatar`), `modules/infra/cuenta-helper.js` (3 call sites), `modules/infra/render.js` (1 call site), `modules/dominio/tesoreria/logic/cuentas.js` (`normalizarCuenta`, retira `_iconoPorBanco`), `modules/dominio/tesoreria/views/cuentas.js` (`renderFormCuenta`, `_renderCuentaItem`, `_bankAvatarHtml`), `modules/dominio/tesoreria/views/transferencias.js` (1 call site), `modules/dominio/tesoreria/acciones/cuentas.js` (`_toggleCamposPorClase`, `inyectarFormCuenta`, `_resetBankPicker`, `_editarCuenta`), `modules/core/state.js` (docstring `Cuenta.icono`), `tests/unit/tesoreria.test.js` (12 tests nuevos, 2 actualizados), `tests/unit/bancos.test.js` (5 tests nuevos), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v378→v379).

**Verificación:** 2589/2589 unit + **190/190 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Mis cuentas al elegir banco "Otro". Cuentas existentes con banco "Otro" y un emoji legado en `icono` (de antes de esta rebanada) siguen mostrando el fallback de iniciales "?", sin romperse ni mostrar un glifo inválido (guard de forma en `bancoAvatar`). Cuentas de cualquier otro banco no cambian de teja.

---

### feat(transversal): CAT.2d selector de ícono en Deudas, cuarto consumidor · 2026-07-13

Cierra **CAT.2d** (`docs/BOARD.md`), cuarta rebanada del picker de ícono compartido: **Deudas** migrada (categoría "Otra"/"Otro"). A diferencia de los 3 consumidores previos (Gastos, Metas, Apartados), esta rebanada AGREGA una capacidad nueva en vez de reemplazar un campo de ícono existente: hoy "Otra" (entidad) / "Otro" (personal) cae al ícono fijo `c-otros`, sin elección del usuario.

**Qué cambió:** (1) `compromiso.icono` nuevo, campo opcional sin bump de schema, guardado solo cuando la categoría es "Otra"/"Otro" y el valor elegido está en `ICONOS_CATEGORIA_PERSONALIZADA` (protege contra manipulación del DOM). Siempre explícito (`null` o el id del sprite), nunca ausente: `editar('compromisos', id, cambios)` hace un merge shallow (`Object.assign`, `infra/crud.js`), así que si el usuario cambia de categoría al editar, el ícono viejo debe limpiarse explícitamente en vez de quedar huérfano (mismo patrón ya usado ahí para `tasa`). (2) `formularios.js`: `renderFormDeuda()` agrega el grupo `#grupo-comp-icono` con `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'comp-icono' })`, oculto salvo que la categoría (guardada, en edición) ya sea la de "otra". (3) `index.js`: `_wireIconoOtraCategoria()` nueva alterna la visibilidad del grupo al cambiar el `<select>` de categoría y llama `wireIconoPicker` (el form se re-renderiza completo en cada apertura, como Gastos/Apartados: no hace falta `resetIconoPicker`). (4) `lista.js`: `compromiso.icono` antes que `_ICONO_DEUDA[categoria]` en la teja y en el chip de categoría. (5) **Consistencia de paso**: el checklist de "Distribuir mi ingreso" (`tesoreria/logic/distribucion.js` `construirDesgloseNecesidades`, `views/distribucion.js` `_iconoNecesidad`) propaga el mismo campo `icono`, para que una deuda con ícono elegido se vea igual ahí que en la lista de Deudas.

**Archivos tocados:** `modules/dominio/compromisos/logic/modelo.js` (`normalizarCompromiso`), `modules/dominio/compromisos/views/formularios.js` (`renderFormDeuda`), `modules/dominio/compromisos/index.js` (`_wireIconoOtraCategoria`, wiring en `_elegirTipoDeuda`/`_editarCompromiso`), `modules/dominio/compromisos/views/lista.js` (`_renderCompromisoItem`), `modules/dominio/tesoreria/logic/distribucion.js` (`construirDesgloseNecesidades`), `modules/dominio/tesoreria/views/distribucion.js` (`_iconoNecesidad`), `tests/unit/compromisos.test.js` (14 tests nuevos), `tests/unit/tesoreria.test.js` (2 tests nuevos + 1 actualizado), `tests/e2e/smoke.test.js` (2 tests nuevos), `service-worker.js` (v377→v378).

**Verificación:** 2577/2577 unit + **188/188 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Deudas al elegir "Otra"/"Otro" y el checklist de "Distribuir mi ingreso" (ambos ahora pueden mostrar un ícono personalizado en vez del fijo `c-otros`). Deudas existentes sin `icono` siguen mostrando el ícono fijo por categoría, sin cambios visibles.

---

### feat(transversal): CAT.2c selector de ícono en Apartados, tercer consumidor + primera cobertura E2E de la sección · 2026-07-13

Cierra **CAT.2c** (`docs/BOARD.md`), tercera rebanada del picker de ícono compartido: **Apartados** migrado (nombre del apartado).

**Qué cambió:** (1) El `<input type="text" maxlength="4" placeholder="📦">` para pegar un emoji a mano se reemplaza por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'apartado-icono', label: '' })` en `apartados/view.js`, dentro de la misma columna angosta (`.apartado-nombre-row`, 3.5rem) que antes ocupaba el input. (2) `renderIconoPicker` gana la opción `label: ''` para omitir el `<span>` de etiqueta en usos compactos (el `aria-label` del panel cae a "Elegir ícono" cuando el label está vacío, sin perder accesibilidad). (3) `_iconoApartado()` nueva distingue sprite-id de emoji crudo (mismo patrón `/^[a-z]-/` que `_iconoMeta()`). (4) Las **17 plantillas rápidas** de Apartados (SOAT 🚗, Regalos 🎁, Arena para gatos 🐱...) conservan su propio catálogo curado de emojis, más específico que el genérico de 29 íconos del picker: se fijan con **`setIconoPickerValor(container, valor, previewHtml)`**, nuevo en el componente compartido, que actualiza el recuadro/input sin pasar por los botones de la grilla (ningún botón queda marcado si el valor no coincide con el catálogo). (5) El panel, al no caber en la columna angosta, pasa a **popover flotante** (`position: absolute`, CSS nuevo en `domain.css`) para no romper el layout de 2 columnas al desplegarse. (6) El form se re-renderiza completo en cada apertura (como Gastos, no como Metas): no hace falta `resetIconoPicker`. (7) **Primera cobertura E2E de la sección Apartados** (no tenía ninguna): 3 tests nuevos cubren plantilla, ícono manual del picker, y plantilla seguida de cambio manual.

**Archivos tocados:** `modules/infra/icon-picker.js` (+`setIconoPickerValor`, `label` opcional), `modules/dominio/apartados/view.js` (`renderFormApartado`, `_iconoApartado`), `modules/dominio/apartados/index.js` (`_inyectarFormApartado`, `_aplicarPlantilla`), `styles/components/domain.css` (popover flotante del panel en `.apartado-nombre-row`), `tests/unit/icon-picker.test.js` (9 tests nuevos), `tests/unit/apartados.test.js` (6 tests nuevos), `tests/e2e/smoke.test.js` (3 tests nuevos), `service-worker.js` (v376→v377).

**Verificación:** 2563/2563 unit + **186/186 E2E completos** + lint verdes.

**Podría afectar:** solo la UI de Apartados al crear/editar un apartado. Las plantillas rápidas siguen mostrando su emoji curado tal cual (no migran al catálogo genérico); `apartado.icono` admite id de sprite o emoji crudo sin bump de schema, igual que `meta.icono` desde CAT.2b.

---

### feat(transversal): CAT.2b selector de ícono en Metas, segundo consumidor + fix de locator ambiguo · 2026-07-13

Cierra **CAT.2b** (`docs/BOARD.md`), segunda rebanada del picker de ícono compartido: **Metas** migrada (categoría "Otra").

**Qué cambió:** (1) El `<input type="text" maxlength="4" placeholder="🎯">` de MT.3 (pegar un emoji a mano) se reemplaza por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'meta-icono', ... })` en `metas/view.js`. (2) `_iconoMeta()` ahora distingue dos formatos posibles de `meta.icono` (sin bump de schema): un id de símbolo del sprite (`c-pesa`, elegido con el picker) o un emoji crudo (metas viejas, creadas antes de CAT.2b), usando el patrón `/^[a-z]-/` que ningún emoji real produce. (3) El componente compartido gana **`resetIconoPicker(container)`** (limpia input + recuadro + panel + `aria-pressed`) y el input oculto ahora expone su propio `id` (igual al `id` del picker): necesarios porque el form de Metas, a diferencia del de Gastos, es un **singleton reusado entre aperturas** (`_inyectarForm()` corre una sola vez en `initMetas()`), así que `resetModal()` limpia el `.value` de los campos pero no el estado VISUAL del picker; `metas/index.js` llama `resetIconoPicker` tanto en `_syncCategoriaMeta()` (al ocultar el grupo por cambio de categoría) como en `_nuevaMeta()` (al reabrir el modal). (4) **Bug real encontrado y corregido**: el E2E de Gastos (TX.9b) usaba `page.locator('.icono-picker__panel')` sin acotar al formulario; con Metas también migrado, hay 2 instancias del componente en el DOM al mismo tiempo (ambos modales se inyectan al arrancar la app, estén abiertos o no), así que el locator se volvió ambiguo y el test empezó a fallar. Corregido a `form.locator(...)`.

**Archivos tocados:** `modules/infra/icon-picker.js` (+`resetIconoPicker`, `id` en el input oculto), `modules/dominio/metas/view.js` (`renderFormMeta`, `_iconoMeta`), `modules/dominio/metas/index.js` (`_inyectarForm`, `_syncCategoriaMeta`, `_nuevaMeta`), `tests/unit/icon-picker.test.js` (5 tests nuevos), `tests/unit/metas.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (2 tests reescritos al nuevo flujo + 1 corregido en Gastos por el locator ambiguo), `service-worker.js` (v375→v376).

**Verificación:** 2548/2548 unit + **183/183 E2E completos** (suite entera en Chromium real, incluyendo la regresión de Gastos que este mismo cambio expuso) + lint verdes.

**Podría afectar:** solo la UI de Metas al elegir "Otra" categoría; metas existentes con emoji crudo en `icono` siguen renderizando igual (backward-compat verificada con test dedicado). Cualquier E2E futuro que use un locator global `.icono-picker__*` sin acotar al formulario correspondiente será ambiguo en cuanto un tercer dominio (CAT.2c-f) sume su propio picker a la página; los tests ya migrados usan locators acotados.

---

### feat(transversal): CAT.2a selector compacto de ícono + migración de Gastos (TX.9b) · 2026-07-13

Primera rebanada de **CAT.2** (`docs/BOARD.md`): picker de ícono compartido para "Otra categoría/entidad" personalizada, pedido por 6 briefs distintos (2026-07-08). Primer análisis a fondo de esta funcionalidad transversal (ficha nueva en `docs/contexto/transversal.md`, regla 2.6): los 6 consumidores identificados NO parten del mismo punto. Gastos (TX.9b) ya tenía categoría personalizada con una grilla de 29 íconos SIEMPRE visible al elegir "+ Otra categoría" (invasiva en pantalla); Deudas y Cuentas tienen "Otro" con un ícono FIJO (`c-otros`, fallback de iniciales), sin que el usuario pueda elegir; Apartados y Metas usan un `<input type="text" maxlength="4">` para pegar un emoji a mano (dependiente del selector de emojis del sistema operativo); Fijo/Calendario no tiene ni siquiera creación de categoría personalizada. Re-cortado en **CAT.2a-f**, una rebanada por consumidor (regla 2.1: multi-dominio, y varias necesitan más que solo el picker).

**Qué se construyó en CAT.2a:** (1) **Componente compartido nuevo `modules/infra/icon-picker.js`** (`renderIconoPicker`/`wireIconoPicker`): un recuadro que muestra el ícono elegido (o un placeholder "+" vacío) y, al tocarlo, despliega una grilla colapsable de íconos; elegir uno la cierra de nuevo y actualiza el recuadro. **Sin modal anidado a propósito** (mismo criterio que el comentario original de TX.9b en `gastos/index.js`): un panel `hidden` dentro del mismo formulario, no un overlay nuevo. Esto evita además amplificar un bug latente ya presente en los pickers dinámicos de `cuenta-helper.js` (`_mostrarPickerCuenta`, etc.): `trapFocus`/`releaseFocus` de `infra/a11y.js` son **singleton** (una sola `_trapEl`/`_prevFocus`, no una pila), así que un modal anidado sobre otro deja el trap de foco del modal exterior huérfano al cerrar el interior; documentado como riesgo preexistente en la ficha, no corregido aquí (fuera de alcance). (2) **Gastos (TX.9b) migrado** como primer consumidor: `gastos/view.js` reemplaza la grilla inline por `renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, ...)`; `gastos/index.js` reemplaza el listener manual de clic por `wireIconoPicker(...)`. CSS re-arquitecturado en `forms.css`: `.icono-picker` (grilla siempre visible) se convierte en `.icono-picker-field` (wrapper) + `.icono-picker__recuadro` (swatch, borde punteado cuando vacío) + `.icono-picker__vacio` (placeholder) + `.icono-picker__panel` (la grilla, ahora colapsable); `.icono-picker__btn` queda con el mismo nombre de clase (sin romper el conteo de botones en tests existentes). Sin cambios de schema ni de lógica de negocio (`validarCategoriaPersonalizada` intacta, sigue exigiendo un ícono válido).

**Archivos tocados:** `modules/infra/icon-picker.js` (nuevo), `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js`, `styles/components/forms.css`, `tests/unit/icon-picker.test.js` (nuevo, 12 tests), `tests/unit/gastos.test.js` (1 test nuevo), `tests/e2e/smoke.test.js` (suite TX.9b actualizada al nuevo flujo: tocar el recuadro antes de elegir ícono), `service-worker.js` (agrega `icon-picker.js` a `CORE_ASSETS`, v374→v375).

**Verificación:** 2541/2541 unit + **183/183 E2E completos** (suite entera corrida en Chromium real, no solo la de Gastos) + lint verdes. El preview local de este entorno no cargó (mismo problema ya documentado en sesiones anteriores); verificado por Playwright/Chromium real en su lugar.

**Podría afectar:** solo la UI de Gastos al crear una categoría personalizada; el `name` del input oculto (`categoriaNuevaIcono`) y la validación no cambiaron, así que el resto del flujo (guardado, reutilización de la categoría en gastos futuros) sigue igual. Cualquier E2E o integración externa que hiciera clic directo en `.icono-picker__btn` sin antes abrir el recuadro se rompería (ya corregido en `smoke.test.js`, no se encontró otro caso).

---

### feat(compromisos): D.15a copy de simulaciones + refuerzo en Abonar, cierra Deudas v2 completa · 2026-07-13

Cierra **D.15a** (`docs/BOARD.md`), última rebanada de la iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08). **Con esta pieza la iniciativa queda completa** (D.15a-e + rediseño visual D.16a-d). Puntos 4, 5-copy, 6 y 9 del brief; sin cambios de lógica ni schema.

**Qué cambió:** (1) **Nivel orden (Avalancha/Bola de nieve):** `_RESUMEN_ESTRATEGIA.avalancha` gana la frase "Te conviene si tu prioridad es pagar lo menos posible", en paralelo a Bola de nieve, que ya explicaba cuándo conviene ("Ideal si necesitas ver progreso rápido..." → reformulado a "Te conviene si..." para mantener el paralelismo). (2) **Las 3 palancas** (`_renderRemedioExtra`, `renderRenegociar`, `renderConsolidar`): cada una suma "Explora libremente: nada cambia hasta que confirmes", el refuerzo de copy que corresponde a la iniciativa sobre la garantía que BUG-011 ya blindó en lógica (ninguna simulación se aplica sin el botón "Aplicar"). (3) **Refuerzo psicológico en Abonar** (punto 9): `renderFormAbono` suma una línea estática antes del footer del modal ("Cada abono, grande o pequeño, es un paso real hacia quedar libre de esta deuda", `form-hint--info`). El tip en vivo bajo el monto (`_actualizarTipProyeccion` en `index.js`) se reescribió para nunca dejar el campo vacío mientras el monto sea válido, con 3 mensajes por prioridad: el abono salda la deuda por completo ("¡Con este abono saldas esta deuda por completo!", el más fuerte) → hay cuota registrada y el abono adelanta al menos un mes (comportamiento previo intacto, "Con este abono terminas X antes") → refuerzo genérico ("Cada abono reduce lo que debes, sin importar el monto") para deudas sin cuota fija (Fiado, D.13) o abonos que no adelantan un mes completo. Tono ADR 003/008 en todo: afirma progreso real, nunca presiona ni compara con otros usuarios ni usa cuenta regresiva.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (resumen de Avalancha + hint de la palanca Aumentar), `modules/dominio/compromisos/views/estrategia-impacto.js` (hint de Renegociar y Consolidar), `modules/dominio/compromisos/views/formularios.js` (línea de refuerzo en `renderFormAbono`), `modules/dominio/compromisos/index.js` (`_actualizarTipProyeccion` reescrita), `tests/unit/compromisos.test.js` (3 tests nuevos), `tests/e2e/estrategia-pago.test.js` (4 tests nuevos, suite "Refuerzo psicológico en Abonar"), `service-worker.js` (v373→v374).

**Verificación:** 2528/2528 unit + 21/21 E2E `estrategia-pago` (suite completa corrida en Chromium real, incluyendo la nueva) + lint verdes.

**Podría afectar:** solo copy de la sección Deudas; ningún `data-action`, handler ni cálculo cambió de comportamiento (el tip en vivo antes quedaba en blanco en algunos casos, ahora siempre muestra un mensaje; el resto de su lógica original, meses antes con cuota, es idéntica).

---

### feat(compromisos): D.15b editar deuda + reorden del form, cierra Deudas v2 salvo D.15a · 2026-07-13

Cierra **D.15b** (`docs/BOARD.md`), tercera pieza independiente de la iniciativa Deudas v2 (puntos 7, 8 y 10 del brief).

**Qué cambió:** (1) **Editar deuda**: el flujo `_editarCompromiso` + `renderFormDeuda(tipo, deuda)` ya existía y prellenaba el formulario completo, pero la `.deuda-card` no tenía ningún trigger visible (solo Abonar/Eliminar/Archivar); el único acceso era desde Calendario, para fijos. Se agregó un botón de editar (`i-edit`, `.btn-icon`, mismo patrón visual que Eliminar) a `_renderCompromisoItem` en `views/lista.js`, disponible tanto en deuda activa (junto a Abonar y Eliminar) como saldada (junto a Archivar); usa la acción `editar-compromiso` ya registrada en `index.js`, cero wiring nuevo. (2) **Formulario reordenado**: el campo de categoría/tipo de deuda ("Tipo de deuda" en entidad, "¿Con quién es la deuda?" en personal) pasa a ir ANTES que la descripción libre, el mismo patrón que TX.9a adoptó en Gastos (y que CAT.4 documenta como regla transversal: "la categoría/tipo va primero, la descripción después, nunca al contrario"). (3) **Hint de bajo valor retirado**: "Si es una tienda o comercio que te fía, elige Fiado" desaparece del campo de categoría personal (Fiado ya está listado como una opción más del propio selector, el hint solo repetía información visible); el hint de tasa desconocida (D.12, `comp-tasa-hint`, "¿No conoces tu tasa?...") se conserva íntegro y sigue siendo el contenido principal de ese campo.

**Archivos tocados:** `modules/dominio/compromisos/views/lista.js` (botón de editar), `modules/dominio/compromisos/views/formularios.js` (reorden de campos + hint retirado), `tests/unit/compromisos.test.js` (5 tests nuevos: 2 del botón de editar en `lista.js`, 3 del form en `formularios.js`), `service-worker.js` (v372→v373).

**Verificación:** 2525/2525 unit + 17/17 E2E `estrategia-pago` (corrida en Chromium real: confirma que la tarjeta con el botón nuevo sigue interactuando bien con Abonar/Eliminar/estrategia) + lint verdes.

**Podría afectar:** solo la sección Deudas. Sin cambios de lógica de negocio, schema ni de los `data-action`/handlers existentes (`editar-compromiso` ya estaba registrado desde antes, solo le faltaba un trigger). Con esto, **la iniciativa "Deudas v2" queda completa salvo D.15a** (copy de simulaciones + refuerzo en Abonar, pendiente e independiente).

---

### feat(compromisos): D.15d-2 las 3 palancas a primer plano en la vista, absorbe D.15e · 2026-07-13

Cierra **D.15d-2** (`docs/BOARD.md`), segunda rebanada de D.15d: conecta el motor puro `recomendarPalanca` (D.15d-1) a la card de estrategia. **El corazón de la iniciativa Deudas v2 se vuelve visible.**

**Qué cambió:** la card de estrategia pasa a **2 niveles ortogonales**. (1) **Nivel orden** (Avalancha/Bola de nieve): sin cambio, pero su detalle se **decopla del extra simulado** (usa siempre extra=0; la exploración del pago extra se mudó a la palanca). (2) **Nivel palanca (nuevo, siempre visible)**: las 3 macro-acciones (Aumentar la cuota / Renegociar la tasa / Consolidar), antes enterradas en el panel "plan inviable" que solo veía un usuario con plan inviable, ahora son una sección permanente bajo el detalle de orden: intro "¿Qué acción te conviene?" + la razón de la palanca recomendada + 3 tiles ordenados por relevancia (`palanca.orden`), con la principal marcada "Recomendada" (`--recomendada`) y preseleccionada, y la herramienta de la palanca activa (una a la vez). La vista calcula la capacidad: `estimarSalarioMensual(S.ingresos)` (infra, D.15d-1) para el ingreso + **`calcularFijosMensuales(S.compromisos)`** (nueva en `modelo.js`, suma tipo 'fijo') para los fijos. (3) **Absorbe D.15e:** el acelerador `<details>` "¿Puedes pagar más rápido?" (solo ofrecía subir la cuota, sin "Aplicar") se retiró; su input vive ahora en la palanca "Aumentar la cuota", que ya trae el botón "Aplicar este aumento". (4) **Panel inviable en 2 capas puras (ADR 031):** el botón de alerta (danger) abre SOLO el diagnóstico; el selector de palancas ya no vive ahí (es la sección neutra siempre visible). **BUG-011 intacto:** la estructura de la card se sigue decidiendo con datos registrados (`recomendarEstrategia(deudas, 0)`); el extra simulado nunca decide estructura. `_uiEstrategia.alternativaActiva` default `null` ("sin elección" → principal); `setEstrategiaUI` admite reset a null.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (2 niveles + `_renderPalancas`/`_renderPalancaTile`; retira `_renderAceleradorExtra`), `modules/dominio/compromisos/views/estrategia-impacto.js` (copy del acelerador retirado), `modules/dominio/compromisos/logic/modelo.js` (+`calcularFijosMensuales`), `modules/dominio/compromisos/logic.js` (export), `modules/dominio/compromisos/index.js` (retira el wiring muerto `cambiar-extra-estrategia`/`_cambiarExtraEstrategia`), `styles/components/charts.css` (`.estrategia-card__palancas`/`-intro`/`-razon` + `.estrategia-card__selector-sub`/`--recomendada`), `tests/unit/compromisos.test.js` (bloque de la vista reescrito + `describe D.15d-2`), `tests/e2e/estrategia-pago.test.js` (helper `elegirPalanca`, palancas siempre visibles), `service-worker.js` (v371→v372).

**Verificación:** 2520/2520 unit + **179/179 E2E** (suite `estrategia-pago` reescrita al nuevo modelo, corrida en Chromium real) + lint verdes.

**Podría afectar:** solo la sección Deudas. Los `data-action` de las herramientas (aumentar/renegociar/consolidar) y sus handlers no cambiaron; el acelerador `.estrategia-card__acelerador` y la acción `cambiar-extra-estrategia` ya no existen (cualquier consumidor externo debía ser interno a esta card, no se encontró otro).

---

### feat(compromisos): D.15d-1 motor puro recomendarPalanca + estimarSalarioMensual a infra · 2026-07-13

Primera de las dos rebanadas en que se re-cortó **D.15d** (motor de recomendación de palanca de Deudas v2) al triarla: toca infra + lógica pura + vista, así que se parte en **D.15d-1** (esta, lógica sin UI, verificable por tests) y **D.15d-2** (la vista que consume el motor). Precedente aplicado: **MC.17a** (lógica pura aterriza antes que su consumidor).

**Qué cambió:** (1) **Extracción a infra.** `estimarSalarioMensual` sale de `tesoreria/logic/ingresos.js` y pasa a `infra/financiero.js` (con su tabla privada `FACTOR_MENSUAL_INGRESO`): con presupuesto y compromisos como consumidores además de tesorería, su hogar único sin dueño de dominio es infra (mantiene ADN #10 limpio). El barrel `tesoreria/logic.js` la **re-exporta** desde infra (consumidores del barrel y tests intactos); `presupuesto/view.js` la importa directo de infra (un import cruzado de dominio menos); `tesoreria/acciones/ingresos.js` y `tesoreria/views/distribucion.js` repuntados a infra. `FACTOR_MENSUAL` de tesorería queda donde está (aún lo usan `montoSalarioMinimoPorPeriodo` y `distribucion.js`). (2) **Motor puro `recomendarPalanca(deudas, { ingresoMensual, fijosMensuales })`** en `compromisos/logic/estrategia.js`: decide la palanca principal por **margen libre real** (`capacidad = ingreso - fijos - Σ cuotas de deuda`) y devuelve el orden de relevancia de las 3 (Aumentar/Renegociar/Consolidar) + la razón en tono ADR 003/008. Con margen → Aumentar; sin margen + ≥2 deudas caras → Consolidar; sin margen + 1 cara → Renegociar; sin margen + sin tasas altas → Aumentar (cuando se libere margen). No lee S ni importa tesorería (recibe la capacidad como parámetro; la vista la calculará en D.15d-2). Umbrales: tasa alta 25% EA (heurística, NO la usura del ADR 004) y capacidad mínima 20.000/mes. **Nadie consume el motor todavía** (eso es D.15d-2).

**Archivos tocados:** `modules/infra/financiero.js` (+`estimarSalarioMensual` + tabla), `modules/dominio/tesoreria/logic/ingresos.js` (−`estimarSalarioMensual`), `modules/dominio/tesoreria/logic.js` (re-export desde infra), `modules/dominio/tesoreria/acciones/ingresos.js` y `modules/dominio/tesoreria/views/distribucion.js` (import a infra), `modules/dominio/presupuesto/view.js` (import a infra), `modules/dominio/compromisos/logic/estrategia.js` (+`recomendarPalanca` + helpers `_ordenarPalancas`/`_razonPalanca`), `modules/dominio/compromisos/logic.js` (export), `tests/unit/compromisos.test.js` (12 tests nuevos), `service-worker.js` (v370→v371).

**Verificación:** 2514/2514 unit + lint verdes. Sin verificación en navegador porque no hay UI nueva (el motor aún no se consume): es lógica pura probada, mismo criterio que MC.17a.

**Podría afectar:** cualquier consumidor futuro de `estimarSalarioMensual` debe importarla de `infra/financiero.js` (o del barrel de tesorería, que la re-exporta). El comportamiento de la función es idéntico (mismos tests verdes).

---

### feat(compromisos): D.16d tarjeta de deuda con chips + máscara + empty state, cierra D.16 completa (ADR 036 D5/D6/D7) · 2026-07-12

Cierra **D.16d** (`docs/BOARD.md`), última rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)): la iniciativa D.16 completa queda en producción el mismo día del handoff. Absorbe formalmente **D.15c** (tarjeta con jerarquía visual).

**Qué cambió:** cada deuda pasa de `.list-item` con hints apilados a **tarjeta** `.deuda-card`: teja de marca/categoría a 44px con el **badge de orden estratégico superpuesto en la esquina** (el badge conserva el accent: blanco sobre frambuesa mide ~3.2:1 y no pasa AA a 10px), nombre + chip de urgencia, **saldo prominente** (tabular/bold, enmascarable), cuota como subtítulo, **chips de categoría** (tinte compromisos o personales según el tipo) **y de tasa** ("28% EA" / "Sin interés" con check / "Tasa por confirmar" en ámbar), el aviso de tasa desconocida (D.12) ascendido de línea con ⚠️ a **callout ámbar con ícono**, y acciones nuevas: **Abonar con tinte de compromisos** (botón propio, no verde: un abono no es un ingreso, ADR 002 sin cambios de flujo) + eliminar ghost que vira a danger en hover. Encabezado de grupo "Tus deudas" con el indicador "Orden Avalancha/Bola de nieve" a la derecha (solo cuando el usuario ya eligió estrategia). **Máscara del ojo (D7) extendida al saldo por deuda** (mismo flag del hero). Empty state alineado al mockup ("...y Finko arma tu estrategia de salida"). La clase muerta `.abono-btn` se retiró (su único consumidor era esta lista).

**Archivos tocados:** `modules/dominio/compromisos/views/lista.js` (tarjeta + encabezado + máscara + empty state), `styles/components/domain.css` (bloque DEUDA-CARD + retiro de `.abono-btn`), `styles/components/atoms.css` (badge de orden en `.deuda-card__icon`), `tests/unit/compromisos.test.js` (7 tests nuevos + 5 actualizados al markup nuevo), `service-worker.js` (v369→v370).

**Verificación:** 2502/2502 unit + **179/179 E2E completos** + lint verdes (gate final de toda la serie D.16a-d).

**Podría afectar:** los flujos de abono/archivar/eliminar usan los mismos `data-action` e ids (cero cambios de wiring); cualquier CSS externo que apuntara a `.list-item` dentro de `#lista-compromisos` ya no aplica (no se encontró ninguno fuera de los estilos retirados).

---

### feat(compromisos): D.16c acelerador + panel inviable en 2 capas (ADR 036 D3/D4) · 2026-07-12

Cierra **D.16c** (`docs/BOARD.md`), tercera rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)). Materializa la capa visual que pedía D.15a punto 1 (arquitectura de 2 capas del ADR 031: la alarma señala, la solución calma).

**Qué cambió:** (1) **acelerador** "¿Puedes pagar más rápido?" como sub-card inset (`bg-base`) con el ícono del summary en verde; el impacto del extra pasa a callout de éxito con ícono (mismo lenguaje que la comparativa de D.16b). (2) **Plan inviable en 2 capas:** el danger vive SOLO en el botón de alerta; el panel interior pasa de fondo danger a neutros (fondo base + borde danger sutil) y únicamente el título del diagnóstico conserva el rojo (la regla CSS que teñía TODOS los títulos del panel se acotó al diagnóstico). (3) **Selector de alternativas como tiles verticales** (ícono arriba + nombre abajo), activa en frambuesa de sección; Renegociar estrena `i-handshake`. (4) **Emojis fuera** de todo el bloque: 🎯→`i-trending-down`/`i-check-circle`, 🤝→`i-handshake`, 🏦→`i-cuentas`, 🔒→`i-alert` (SC 1.4.11: ícono + texto). (5) **Fix visual real encontrado en la pasada:** los botones "Aplicar nueva tasa" y "Consolidar" usaban la clase inexistente `btn--primary` (doble guion) y se pintaban como botones sin estilo; ahora `btn-primary`. Cero cambios de lógica; las suites BUG-011 quedan intactas.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (tiles del selector + handshake + no-aplica sin candado), `views/estrategia-impacto.js` (íconos en títulos y mensajes ok, fix `btn-primary`), `styles/components/charts.css`, `tests/unit/compromisos.test.js` (4 tests nuevos + 2 aserciones de emoji actualizadas al criterio real), `service-worker.js` (v368→v369).

**Verificación:** 2495/2495 unit + 17/17 E2E `estrategia-pago` + lint verdes.

**Podría afectar:** solo presentación del panel de estrategia; los `data-action` y el flujo de alternativas no cambiaron.

---

### feat(compromisos): D.16b picker de estrategia con identidad de sección + comparativa como callout (ADR 036 D2) · 2026-07-12

Cierra **D.16b** (`docs/BOARD.md`), segunda rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)).

**Qué cambió:** (1) la card de estrategia pasa a superficie con sombra en reposo y radio XL (familia visual del hero); los paneles interiores (picker, métricas, placeholder) bajan a `bg-base` como "inset". (2) Header nuevo: teja tintada de compromisos + título "¿Cómo salir más rápido?" + un solo subtítulo (la línea de honestidad del motor); el eyebrow "Estrategia de pago" queda arriba de la card (clase genérica nueva `.grupo-eyebrow` en `atoms.css`, reutilizable por D.16d para "Tus deudas"). (3) El picker viste la identidad de la sección: card activa con borde/fondo/teja en frambuesa `--fk-dom-compromisos` (antes el accent verde global). (4) Bola de nieve estrena su símbolo propio `i-snowball` (antes el círculo genérico); drafts nuevos `i-snowball`, `i-handshake` y `i-trending-down` publicados vía `scripts/sync-sprite.py` (plantillas que Esteban puede sobrescribir, ADR 026; el rediseño de metáfora de Avalancha/Bola sigue en IV.4). (5) La comparativa Avalancha vs Bola de nieve deja los emojis 💰🏆ℹ️ y pasa a callouts tintados con borde completo + ícono de sprite (verde = ahorro, azul = impulso; ícono + texto, SC 1.4.11). Cero cambios de lógica.

**Archivos tocados:** `assets/svg/iconos/simbolos/{snowball,handshake,trending-down}.svg` (nuevos), `index.html` (sprite, 3 símbolos), `modules/dominio/compromisos/views/estrategia.js` (header + eyebrow + ícono del picker), `views/estrategia-impacto.js` (comparativa con íconos), `styles/components/charts.css`, `styles/components/atoms.css` (`.grupo-eyebrow`), `tests/unit/compromisos.test.js` (3 tests nuevos), `tests/e2e/estrategia-pago.test.js` (aserción del título actualizada al rediseño), `service-worker.js` (v367→v368).

**Verificación:** 2491/2491 unit + 17/17 E2E `estrategia-pago` + lint verdes (incluye las suites de regresión BUG-011 sin tocar su intención).

**Podría afectar:** nada de lógica; el título de la card cambió de copy (la aserción E2E se actualizó en el mismo commit).

---

### feat(compromisos): D.16a hero con el total de deuda + ojo de privacidad (ADR 036 D1/D7) · 2026-07-12

Cierra **D.16a** (`docs/BOARD.md`), primera rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md), handoff de Claude Design `Deudas v2.dc.html` enviado por Esteban). La pantalla de Deudas gana lo que no tenía: la magnitud total del problema de un vistazo.

**Qué cambió:** hero nuevo al tope de `#sec-compromisos` con "Lo que debes en total" + saldo total de las deudas activas (cifra protagonista, tabular/extrabold) + chip "cuota/mes" con ícono + texto "en N deudas" + ojo de privacidad anclado a la esquina (posición estable, `S.config.ocultarSaldo`, mismo flag de Inicio y Mis cuentas: un solo control de privacidad en toda la app). Degradado de identidad de compromisos (frambuesa ADR 031) como tercer consumidor del estreno parcial del ADR 033. Agregado puro `resumenDeudas(compromisos)` nuevo en `logic/modelo.js`: suma `saldoTotal` y cuota mensual SOLO de deudas activas (los gastos fijos del mismo dominio no entran: el hero habla de "lo que debes"). Sin deudas: "$0" + "No tienes deudas registradas", sin ojo ni chip (un control que no enmascara nada confunde). Contraste WCAG medido contra la parada fuerte del degradado (método IV.1): oscuro `#3a2433` → primario 11.92:1, secundario 6.06:1; claro `#fce3eb` → primario 13.87:1, secundario 7.02:1.

**Archivos tocados:** `index.html` (contenedor `#compromisos-hero`), `modules/dominio/compromisos/logic/modelo.js` (`resumenDeudas()`), `logic.js` + `view.js` (barrels), `views/hero.js` (nuevo), `index.js` (wiring en `_renderTodo()` + acción `compromisos-saldo-visibilidad`), `styles/components/domain.css` (`.hero-compromisos` + ojo compartido), `tests/unit/compromisos.test.js` (9 tests nuevos), `service-worker.js` (v366→v367).

**Verificación:** 2488/2488 unit + 17/17 E2E `estrategia-pago` + lint verdes.

**Podría afectar:** nada fuera de la sección Deudas; la máscara de los saldos por deuda en la lista llega en D.16d (hoy el ojo enmascara el total y el chip del hero).

---

### feat(ui): MC.17e teja "Transferir" en la hoja Registrar, cierra MC.17 completa · 2026-07-12

Cierra **MC.17e** (`docs/BOARD.md`), última rebanada de MC.17 (transferencias entre cuentas propias). La iniciativa completa (MC.17a fundación de datos, MC.17b formulario/acción, MC.17c ledger de Movimientos, MC.17d GMF del retiro) queda cerrada con este punto de entrada.

**Qué cambió:** nueva teja "Transferir" en la hoja "Registrar" (NAV.A2), visible solo con 2+ cuentas activas (mismo patrón 0/1/varias que ya usan Abono a deuda y Aporte a ahorro en ese mismo archivo). `cuentasActivasParaTransferir(cuentas)` (nueva, pura) cuenta las cuentas activas sin importar el dominio `tesoreria` (regla ADN #10, ya documentada en la cabecera del archivo: la hoja lee `S` directamente y reusa acciones ya registradas por nombre en vez de importar lógica de dominio). La teja usa `data-action="registrar-abrir" data-target-action="abrir-transferencia"`, reutilizando la acción `abrir-transferencia` que MC.17b ya registró en `acciones/transferencias.js`: cero lógica nueva de apertura de modal.

**Archivos tocados:** `modules/ui/registrar.js` (`cuentasActivasParaTransferir()` nueva + teja en `_construirTejasDinamicas()`), `tests/unit/registrar.test.js` (2 tests nuevos), `service-worker.js` (v365→v366), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2479/2479 unit verdes (conteo de cuentas activas, tolerancia a entrada vacía/no-array). Verificación funcional vía DOM en el Browser pane (el screenshot visual no respondió esta sesión, mismo patrón intermitente de sesiones anteriores): con 2 cuentas activas la teja aparece en `#registrar-grid` y su clic abre `#modal-transferencia` (`data-open` presente); con 1 sola cuenta activa la teja no se inyecta.

**Podría afectar:** nada fuera de la hoja Registrar; la acción `abrir-transferencia` y el modal no cambiaron (ya cubiertos por los tests de MC.17b/d).

---

### feat(tesoreria): MC.17d GMF del retiro en la transferencia, opcional · 2026-07-12

Cierra **MC.17d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), cuarta rebanada de MC.17. Añade el 4x1000 (GMF) real que un banco cobra al sacar dinero de una cuenta no exenta.

**Decisión ratificada con Esteban antes de codificar** (ambas opciones = la recomendación del análisis de Opus del 2026-07-12): (1) el costo del 4x1000 se guarda como campo opcional `costoGMF` en la Transferencia, NO como un `Gasto` separado (no ensucia Análisis, Límites de gasto ni el monitor de renta con una micro-comisión bancaria mecánica); (2) el checkbox del formulario viene marcado por defecto, porque refleja lo que el banco realmente cobrará (el saldo queda exacto sin que el usuario haga nada; puede desmarcarlo si tiene el cupo exento del mes disponible).

**Qué cambió:** cuando la cuenta de origen no está exenta (`aplica4x1000 === true`), el modal de transferencia muestra una sección nueva (`renderSeccionGMF()`, `views/transferencias.js`) con un checkbox "Descontar el 4x1000 (GMF)" marcado + un hint que calcula el costo en vivo a medida que se escribe el monto. Al aplicar: sale `monto + costoGMF` del origen y entra `monto` al destino → el patrimonio neto baja EXACTAMENTE el GMF (la única parte real-mundo de una transferencia, un costo que se lleva el banco). Lógica pura nueva en `logic/transferencias.js`: `costoGMFRetiro(monto)` (monto × 0.004 redondeado al peso, 0 si el monto no es positivo, mismo redondeo que `calcularCostoGMF`) y `origenSujetoAGMF(cuentas, id)` (salvaguarda dura: solo `aplica4x1000 === true`); `calcularTransferencia()` ahora descuenta el `costoGMF` del origen (Σ deltas = −costoGMF) y `normalizarTransferencia(datos, costoGMF)` lo guarda solo si es > 0 (campo opcional, sin migración). La sección reacciona al origen en vivo: aparece/desaparece al invertir el par o cambiar el selector de 3+ (`_refrescarSeccionGMF()`), con el hint recalculado por `_actualizarHintGMF()`. El chequeo de sobregiro y su mensaje de confirmación usan `monto + costoGMF`. El ledger (extiende MC.17c) traza "incluye $X de 4x1000" en el subtítulo de la fila, sin sumarlo al monto mostrado (que es lo que llegó al destino).

**Archivos tocados:** `modules/dominio/tesoreria/logic/transferencias.js`, `modules/dominio/tesoreria/logic.js` (barrel: 2 exports nuevos), `modules/dominio/tesoreria/views/transferencias.js`, `modules/dominio/tesoreria/view.js` (barrel), `modules/dominio/tesoreria/acciones/transferencias.js`, `modules/core/state.js` (campo opcional `costoGMF` en `Transferencia`), `modules/dominio/movimientos/logic.js` (`costoGMF` en el `Movimiento`), `modules/dominio/movimientos/view.js` (subtítulo del GMF), `service-worker.js` (v364→v365), `tests/unit/tesoreria.test.js` + `tests/unit/movimientos.test.js` (21 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2477/2477 unit (helpers puros del GMF, apply que descuenta el gravamen con Σ deltas = −costoGMF, render condicional del checkbox por exención, acción que descuenta/omite según checkbox, subtítulo del ledger) + 179/179 E2E (1 nuevo en Chromium real: origen no exento → checkbox marcado → transferencia descuenta `monto + 800` del origen, `monto` al destino, `costoGMF` guardado, y el ledger muestra "incluye $800 de 4x1000") + lint verdes. El Browser pane interactivo siguió inestable esta sesión; la verificación se apoyó en el E2E de Playwright sobre Chromium real y en la suite unitaria sobre el `render.js`/DOM de producción.

**Podría afectar:** una transferencia con GMF baja el patrimonio total (a diferencia de MC.17a-c, donde el traslado era neutro): es correcto, el GMF es dinero que sale del sistema hacia el banco. El GMF NO es un `Gasto`, así que Análisis/Límites/resumen semanal/monitor de renta siguen sin verlo. El campo `costoGMF` es opcional y `undefined`-safe: transferencias existentes (sin él) siguen válidas sin migración.

---

### feat(movimientos): MC.17c transferencia en el ledger de Movimientos, tipo neutro · 2026-07-12

Cierra **MC.17c** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), tercera rebanada de MC.17. Sobre la lógica y la UI ya cerradas en MC.17a/b: ahora una transferencia queda visible en el historial.

**Qué cambió:** `movimientosDesdeTransferencias(transferencias)` (nuevo, `modules/dominio/movimientos/logic.js`) normaliza `S.transferencias` a `Movimiento` con `direccion: 'neutro'` (sin signo, sin color), `tipo: 'transferencia'`, `dominio: 'tesoreria'`, ícono `i-transferencia`, y guarda `cuentaOrigenId`/`cuentaDestinoId` en el objeto en vez de una descripción ya armada, porque esta función pura recibe solo `transferencias` (no `cuentas`). El typedef `Movimiento` se extiende con esos 3 valores nuevos. `movimientosRecientes()`/`movimientosCompletos()` combinan ahora 4 fuentes en vez de 3. En `view.js`, `_descripcionMovimiento()` (nuevo) arma "Origen → Destino" en vivo con `_nombreCuenta()` (mismo criterio que el resto del historial: el nombre de cuenta no se congela en el momento de la derivación). `renderActividadReciente()` y `_renderMovimientoItem()` (los 2 sitios de render, panel de Inicio y vista completa `#movimientos`) dejan de asumir el signo binario `esIngreso ? '+' : '-'`: con `direccion === 'neutro'` el signo es `''`, reutilizando la clase de color de egreso (ya neutra por defecto, sin CSS nuevo). `_TIPO_LABEL` suma `transferencia: 'Transferencia'` para el subtítulo. `'transferencias'` se agregó a `_SECCIONES_MOVIMIENTOS` (memo, `view.js`) y a `_SECCIONES_FUENTE` (guard de `state:change`, `movimientos/index.js`): guardar una transferencia (MC.17b) re-pinta ambas vistas solo. Símbolo de sprite nuevo `i-transferencia` (doble flecha, trazo): draft en `assets/svg/iconos/simbolos/transferencia.svg`, publicado con `scripts/sync-sprite.py` (BR.2).

**Archivos tocados:** `modules/dominio/movimientos/logic.js`, `modules/dominio/movimientos/view.js`, `modules/dominio/movimientos/index.js`, `assets/svg/iconos/simbolos/transferencia.svg` (nuevo), `index.html` (sprite regenerado, símbolo `i-transferencia`), `service-worker.js` (v363→v364), `tests/unit/movimientos.test.js` (12 tests nuevos), `docs/BOARD.md`, `docs/HANDOFF.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2456/2456 unit verdes (normalización de la fuente nueva, combinación de las 4 fuentes, render sin signo/color en ambos sitios, dominio "tesoreria" en la teja, subtítulo "Transferencia"). **Nota de proceso:** el Browser pane interactivo no respondió de forma estable esta sesión (mismo patrón intermitente de sesiones anteriores); la verificación se apoyó en la suite unitaria sobre happy-dom, que ejercita el mismo `render.js`/DOM real de producción, sin revisión visual manual en Chromium.

**Podría afectar:** nada fuera del ledger; la transferencia sigue sin tocar `S.gastos` (invariante de MC.17 verificado desde MC.17a), así que Análisis, Límites de gasto, resumen semanal y monitor de renta no la ven, como se diseñó.

---

### feat(tesoreria): MC.17b formulario + acción de transferir entre cuentas · 2026-07-12

Cierra **MC.17b** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), segunda rebanada de MC.17. UI sobre la lógica ya cerrada en MC.17a.

**Qué cambió:** botón de entrada "Transferir entre cuentas" en `#tesoreria-transferir` (nuevo `renderBotonTransferir()`, `views/transferencias.js`), visible solo con 2+ cuentas activas (patrón 0/1/2/varias: con menos, no hay dos endpoints posibles). Modal `#modal-transferencia` nuevo con automatización por conteo: con **exactamente 2 cuentas**, `renderParTransferencia()` pinta un widget fijo "De A a B" (origen por defecto = mayor saldo) con botón `⇄` que invierte la dirección sin re-renderizar el resto del form; con **3+ cuentas**, `renderFormTransferencia()` usa dos `renderSelectorCuenta()` independientes (mismo componente de tarjetas que ya usan ingreso puntual y abono a deuda), extendido con un parámetro `name` nuevo (opcional, retrocompatible) para poder renderizar dos radiogroups (`cuentaOrigenId`/`cuentaDestinoId`) en el mismo formulario sin colisión. `_guardarTransferencia()` (`acciones/transferencias.js`) valida con `validarTransferencia()`, confirma el sobregiro con el usuario si `!saldoSuficiente()` (mismo patrón "Registrar igual" que ya usa el formulario de deuda), aplica el traslado con `calcularTransferencia()` de MC.17a vía `editar('cuentas', ...)` ×2, guarda el registro en `S.transferencias` (historial, MC.17c lo mostrará en el ledger) y cierra el modal.

**Archivos tocados:** `modules/dominio/tesoreria/views/transferencias.js` (nuevo), `modules/dominio/tesoreria/acciones/transferencias.js` (nuevo), `modules/dominio/tesoreria/view.js` (barrel: 3 exports nuevos + `renderBotonTransferir()` en `renderTesoreria()`), `modules/dominio/tesoreria/index.js` (`initAccionesTransferencias()`), `modules/infra/cuenta-helper.js` (`renderSelectorCuenta()` gana el parámetro opcional `name`), `index.html` (`#tesoreria-transferir` + modal `#modal-transferencia`), `styles/components/domain.css` (`.transferir-entrada`, `.transferir-par*`), `service-worker.js` (v362→v363 + los 2 módulos nuevos en `CORE_ASSETS`), `tests/unit/tesoreria.test.js` (13 tests nuevos), `tests/e2e/smoke.test.js` (4 E2E nuevos), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2449/2449 unit (gating 0/1/2/varias, ambas ramas del form, widget de par, wiring de invertir, camino feliz con descuento/crédito/historial, camino de error sin tocar S) + 178/178 E2E (4 nuevos en Chromium real: entrada oculta con 1 cuenta, transferencia con 2 cuentas actualiza ambos saldos en las tarjetas y en localStorage, invertir cambia el origen, transferencia con 3+ cuentas vía selectores) + lint verdes. **Nota de verificación:** el Browser pane interactivo no estuvo disponible esta sesión (clasificador de seguridad temporalmente caído); la verificación visual se apoyó en los E2E de Playwright sobre Chromium real (incluyen aserciones de texto visible como `$800.000`/`$400.000` en las tarjetas de cuenta), no en una revisión manual de estilos/espaciado del widget nuevo.

**Podría afectar:** `renderSelectorCuenta()` (`infra/cuenta-helper.js`) gana un parámetro opcional con default retrocompatible; sus 5 callers existentes (apartados, compromisos ×2, gastos, ingresos) siguen sin cambios. El patrimonio total en cuentas no cambia con una transferencia (invariante de MC.17a, verificado en la app): solo se mueve entre dos cuentas propias.

---

### feat(tesoreria): MC.17a fundación de datos + lógica pura de transferencias · 2026-07-12

Cierra **MC.17a** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), primera rebanada de MC.17 (transferencias entre cuentas propias). Solo fundación de datos + lógica pura, sin UI (verificación solo-unit, precedente de la capa `logic/`).

**Qué cambió:** colección nueva `S.transferencias` con el typedef `Transferencia` (`{ id, cuentaOrigenId, cuentaDestinoId, monto, fecha, nota?, fechaCreacion }`) en `state.js`; bump `SCHEMA_VERSION` v25→v26 con migración idempotente en `storage.js` (`transferencias: []` para usuarios existentes, no toca el resto del estado) + el campo en `createInitialState()` (segunda red vía `_applyToS`). Módulo puro nuevo `logic/transferencias.js` con: `validarTransferencia(datos, cuentas)` (origen/destino existen y activos, distintos, monto > 0, fecha ISO; el saldo insuficiente NO es error de validación, es decisión de UI); `saldoSuficiente(cuentas, origenId, monto)` (para que MC.17b decida si confirma sobregiro); `normalizarTransferencia(datos)` (crudo → schema, omite nota vacía); `calcularTransferencia(transferencia, cuentas)` (apply atómico PURO: devuelve las 2 actualizaciones de saldo + los deltas, o `null` como guard estructural si corrompería saldos). **Invariante clave verificado en tests:** la suma de los deltas es 0 (traslado interno, el patrimonio neto no cambia). El GMF sigue diferido a MC.17d (la función es monto-based; MC.17d le suma un parámetro opcional sin romper la firma).

**Archivos tocados:** `modules/core/state.js` (typedef + colección), `modules/core/storage.js` (SCHEMA_VERSION 26 + migración v25→v26), `modules/dominio/tesoreria/logic/transferencias.js` (nuevo), `modules/dominio/tesoreria/logic.js` (barrel: 4 exports nuevos), `service-worker.js` (v361→v362 + `logic/transferencias.js` en `CORE_ASSETS`), `tests/unit/storage.test.js` (3 tests de migración), `tests/unit/tesoreria.test.js` (23 tests de las 4 funciones puras), `tests/integration/flujos.test.js` (1 test ajustado: usaba `transferencias` como ejemplo de campo desconocido, ahora es legítimo → renombrado a `campoInventado`), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2436/2436 unit (26 nuevos: migración idempotente + preservación de datos + invariante de patrimonio neto + guards estructurales del apply) + 174/174 E2E (boot real con schema v26, `logic/transferencias.js` cargado sin error) + lint verdes.

**Podría afectar:** el bump de schema corre en todo cliente al abrir la app (migración idempotente y aditiva, no toca datos existentes). Ningún código escribe aún en `S.transferencias` (eso es MC.17b): la colección arranca `[]` y el apply es una función pura no invocada todavía por la app.

---

### feat(tesoreria): MC.18e distribuir como tarjeta de entrada que lanza el asistente · 2026-07-12

Cierra **MC.18e** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), quinta y última rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D6). Cierra la iniciativa MC.18 (rediseño visual de "Mis cuentas") completa.

**Qué cambió:** `renderDistribucionIngreso()` deja de pintar el bloque completo siempre desplegado (chips de preset, desglose fila por fila, editor personalizado y el asistente por pasos, todo junto e inline) y pasa a una **tarjeta de entrada compacta** (`.distribuir-card`): "¿Cómo distribuir $X?" con barra segmentada 50/30/20 + leyenda (Necesidades / Estilo de vida / Ahorro, cada una con % y monto), alertas y el CTA cruzado a Límites de gasto (MC.5e) siempre visibles, y un botón "Distribuir mi ingreso" que **lanza** el asistente como modal (`#modal-distribuir`, nuevo) en vez de desplegarlo inline. Los 3 colores de la barra/leyenda reutilizan tokens de dominio ya existentes (Necesidades = `--fk-dom-tesoreria`, Estilo de vida = `--fk-dom-presupuesto`, Ahorro = `--fk-dom-ahorro`), coinciden exactamente con la paleta aprobada del handoff sin introducir hex nuevos. El motor y los 3 pasos del asistente (MC.7, MC.4a/b/d/e) **no cambian**: `_renderPanelDistribuir()` sigue generando el mismo `<fieldset id="distribuir-ingreso-panel">` con sus pasos paginados, solo se mudó de vivir siempre en el DOM con `hidden` + su propio botón toggle, a inyectarse en `#modal-distribuir-body` (`renderAsistenteDistribucion()`, exportada nueva) cada vez que se abre el modal. Los chips de preset (Automático/Clásicos/Personalizado), el editor de distribución personalizada y la razón del cálculo se mudaron junto con el asistente al modal (mismo contenido, misma lógica, nueva casa). `abrirAsistenteDistribucion()` sigue siendo el único punto de entrada del asistente para todos los callers (botón de la tarjeta, recordatorio de día de ingreso del Calendario ADR 021, oferta tras un ingreso puntual NAV.A2b s2 con `preacreditado`): ninguno cambió su firma ni su contrato. Confirmar la distribución ahora cierra el modal (el snackbar "Deshacer" vive en `<body>`, sobrevive el cierre). La tarjeta se reubicó al final de `#sec-tesoreria`, completando el orden vertical del ADR 035 (hero → tarjetas de cuenta → insight GMF → fuentes de ingreso → distribuir). El `data-action="toggle-distribuir-ingreso"` se conserva por nombre (ahora abre el modal en vez de desplegar/ocultar un panel inline) para no tener que repintar los ~30 call sites que ya lo usan en los tests E2E existentes.

**Archivos tocados:** `index.html` (`#ingresos-distribucion` reubicado al final de la sección, `#modal-distribuir` nuevo), `modules/dominio/tesoreria/views/distribucion.js` (`_construirDatosDistribucion()` nueva, `renderDistribucionIngreso()` reescrita, `renderAsistenteDistribucion()` nueva exportada, `_renderTarjetaDistribuir()` nueva, `_renderContenidoAsistente()` ex `_renderDistribucion()` recortada, `_renderPanelDistribuir()` sin su botón/`hidden` propios), `modules/dominio/tesoreria/view.js` (barrel: exporta `renderAsistenteDistribucion`, reordena `renderTesoreria()`), `modules/dominio/tesoreria/acciones/distribucion.js` (`abrirAsistenteDistribucion()` reescrita para abrir el modal, `_refrescarDistribucion()` nueva, `_toggleDistribuirIngreso()` eliminada, `_confirmarDistribucion()` cierra el modal), `styles/components/domain.css` (`.distribuir-card__*` + `.dist-color-*` nuevos, `.distribucion-row*` muerto eliminado), `tests/e2e/smoke.test.js` (1 test ajustado: conteo de `.section__sub-header` escopado por texto), `service-worker.js` (v360 → v361), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2410/2410 unit (sin cambios, la capa de renderizado del asistente nunca tuvo tests unitarios dedicados) + 174/174 E2E (24 tests existentes del asistente completo verificados sin cambios de código, 1 ajustado por el nuevo sub-header legítimo) + lint verdes. Verificado en el navegador con datos reales: tarjeta compacta con barra/leyenda correctas, botón abre el modal con el asistente completo (3 pasos, monto precargado, foco en el input), colores exactos de la paleta aprobada, cierre del modal funcional.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de aplicar/deshacer la distribución). Cualquier caller futuro que asuma que `#distribuir-ingreso-panel` existe en el DOM desde el primer render (en vez de solo tras `abrirAsistenteDistribucion()`) se rompería; no se detectó ninguno fuera de los ya migrados.

---

### feat(tesoreria): MC.18d fuentes de ingreso agrupadas · 2026-07-12

Cierra **MC.18d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), cuarta rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D7).

**Qué cambió:** los dos sub-encabezados independientes ("Mis ingresos fijos" con "+ Ingreso fijo", "Otros ingresos" con "+ Ingreso") se fusionan en un solo `.section__sub-header` "Fuentes de ingreso", con las dos acciones ("+ Fijo" / "+ Puntual") lado a lado en `.section__sub-actions` (nuevo, envoltorio genérico reutilizable para agrupar acciones cortas en un sub-header). **Resolución del CTA único del mockup:** en vez de un selector nuevo (menú/popover) para elegir entre fijo y puntual, se mantienen los dos botones existentes, ahora compactos y unidos bajo un solo encabezado; no se inventó una pieza de interacción nueva para dos formularios que ya son deliberadamente distintos (uno recurrente, uno de una sola vez). Ambas listas (`#lista-ingresos`, `#lista-ingresos-puntuales`) quedan una tras otra sin sub-header propio entre ellas, con el lenguaje visual de `.cuenta-card` (radio `lg` + sombra en reposo, tercer y último consumidor del piloto ADR 033 en esta pantalla), sin tocar la `.list-item` base que usan las demás secciones (selector CSS scoped por contenedor). **Máscara (D5):** `renderListaIngresos()` y `renderListaIngresosPuntuales()` extienden `S.config.ocultarSaldo` a cada monto (`SALDO_MASCARA_CUENTA`), el puntual conserva su prefijo `+` incluso enmascarado (`+••••`).

**Archivos tocados:** `index.html` (headers de `#sec-tesoreria` fusionados), `modules/dominio/tesoreria/views/ingresos.js` (`_renderIngresoItem()`, `_renderIngresoPuntualItem()`, `renderListaIngresos()`, `renderListaIngresosPuntuales()`), `styles/layout.css` (`.section__sub-actions`), `styles/components/domain.css` (radio + sombra scoped a `#lista-ingresos`/`#lista-ingresos-puntuales`), `tests/unit/tesoreria.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v359 → v360), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2410/2410 unit (montos reales vs enmascarados en ambas listas) + 174/174 E2E (1 nuevo en Chromium real: un solo sub-header con las dos acciones, ingreso fijo y puntual creados y visibles, máscara compartida) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de guardado/eliminado, `acciones/ingresos.js` intacto). El aria-label de los botones de agregar no cambió (mismo texto descriptivo), solo su texto visible pasa de "+ Ingreso fijo"/"+ Ingreso" a "+ Fijo"/"+ Puntual".

---

### feat(tesoreria): MC.18c GMF como tarjeta insight integrada · 2026-07-12

Cierra **MC.18c** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), tercera rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D4).

**Qué cambió:** el indicador del 4x1000 (K.1) deja el formato de nudge suelto (`.nudge nudge-info`, con `border-left` de acento) y pasa a **tarjeta insight** propia (`.gmf-insight`): teja de 30px con icono `%` (`i-percent`, fijo, ya no depende del campo `icono` de `detectarNudgeGMF()`) + título con el costo estimado + detalle, tinte tesorería (7% fondo / 22% borde), pegada justo bajo la lista de cuentas (posición sin cambios, ya estaba ahí desde antes de MC.18). Copy y cálculo intactos (`calcularCostoGMF()`, `detectarNudgeGMF()` sin tocar). Contraste WCAG medido en ambos temas: título/detalle 13.14:1/6.68:1 (oscuro) y 15.72:1/7.96:1 (claro); glifo contra su teja 4.59:1 (oscuro) y 4.19:1 (claro), ambos sobre el umbral de 3:1 para elementos gráficos.

**Archivos tocados:** `index.html` (comentario del contenedor `#tesoreria-gmf`), `modules/dominio/tesoreria/views/cuentas.js` (`_renderNudgeGMF()` → `_renderGMFInsight()`), `styles/components/domain.css` (`.gmf-insight__*`), `tests/unit/tesoreria.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v358 → v359), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2408/2408 unit (contenedor vacío sin costo, tarjeta con icono/monto/detalle con costo) + 173/173 E2E (1 nuevo en Chromium real: sin gastos no aparece, con un gasto del mes desde una cuenta con GMF aparece con el monto correcto) + lint verdes.

**Podría afectar:** nada persistido ni de cálculo (cero cambios en `logic/cuentas.js`). El campo `icono` que devuelve `detectarNudgeGMF()` (`'gastos'`) ya no lo consume ningún render; se conserva en la función pura porque no hay motivo para romper su contrato de datos por un cambio puramente visual.

---

### feat(tesoreria): MC.18b tarjetas de cuenta con saldo prominente y chips de metadatos · 2026-07-12

Cierra **MC.18b** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), segunda rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisión D2), y **absorbe MC.15b** (legibilidad de logos: Davivienda, BBVA, DaviPlata, Nubank).

**Qué cambió:** cada cuenta pasa de `.list-item` con hints apilados de emoji (📅 cuota, 💸 4x1000, 🔑 transferencia) a `.cuenta-card`: teja de banco/billetera **44px** (antes 36px, mejora la legibilidad óptica de los logos densos sin tocar los SVG oficiales, ADR 026/027) + nombre + tipo + **saldo prominente** (700, tabular) en la misma fila + **chips** (icono SVG + texto) para cuota de manejo, 4x1000 y datos de transferencia + editar/eliminar como ghost icons de 32px (**eliminar vira a danger en hover**, patrón nuevo solo de esta tarjeta). **Nombre/tipo, generaliza MC.15a:** con nombre autogenerado, el título se reduce al banco solo ("Bancolombia") y el tipo va debajo con una etiqueta siempre legible (`_tipoLabel()` nuevo: "Ahorros"/"Corriente" para bancos, "Billetera digital" para billeteras, "Dinero en efectivo" para efectivo, nunca duplica el nombre); con un nombre explícito (soportado por `normalizarCuenta()`), el subtítulo vuelve a ser "banco · tipo" como antes. **Máscara (D5):** `renderListaCuentas()` extiende el flag `S.config.ocultarSaldo` a cada tarjeta (`SALDO_MASCARA_CUENTA`, mismo control que el hero de MC.18a). **Icono nuevo:** `assets/svg/iconos/simbolos/key.svg` (`i-key`) diseñado siguiendo el lenguaje v2 (trazo + chispa en el ojo) y publicado al sprite con `scripts/sync-sprite.py`; `i-percent` e `i-agenda` ya existían. Los chips reutilizan `.chip`/`.icon--sm`, cero componente nuevo.

**Archivos tocados:** `assets/svg/iconos/simbolos/key.svg` (nuevo), `index.html` (sprite regenerado, símbolo `i-key`), `modules/dominio/tesoreria/views/cuentas.js` (`_renderCuentaItem()` reescrito, `_tipoLabel()` nuevo, `_formatDatosTransferencia()` → `_labelDatosTransferencia()`), `modules/infra/bancos.js` (uso de `bancoClase()` ya existente), `styles/components/domain.css` (`.cuenta-card__*`), `tests/unit/tesoreria.test.js` (8 tests nuevos + 3 reescritos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v357 → v358), `docs/DECISIONS/035-mis-cuentas-v2.md` (referencia), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2406/2406 unit (nombre/tipo en ambos casos auto/explícito, tipo label por clase, chips de cuota/GMF/transferencia con su icono, saldo enmascarado) + 172/172 E2E (1 nuevo en Chromium real: crear cuenta bancaria con cuota+GMF, verificar nombre/tipo/saldo/chips/botones, verificar máscara por tarjeta) + guardarraíl `sprite-sync.test.js` verde + lint. La legibilidad de los logos (ex MC.15b) se verificó por el cambio de contenedor (44px, cero bytes tocados en los SVG oficiales) y por el E2E en Chromium real; sin captura visual local (preview de este entorno no siempre carga, ver `docs/contexto/mis-cuentas.md` histórico de MC.15b).

**Podría afectar:** nada persistido (cero cambios de schema). Cambia el marcado de la lista de cuentas (`.list-item` → `.cuenta-card`): cualquier selector CSS o test externo que dependiera de `.list-item` específicamente para `#lista-tesoreria` deja de aplicar (ninguno detectado fuera de este archivo).

---

### feat(tesoreria): MC.18a hero con total en cuentas + ojo de privacidad + composición · 2026-07-12

Cierra **MC.18a** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), primera rebanada del [ADR 035](DECISIONS/035-mis-cuentas-v2.md) (decisiones D1, D3 y D5 sobre el hero), el rediseño de pantalla aprobado por Esteban desde el handoff de Claude Design (mockup `Mis cuentas v2.dc.html`).

**Qué cambió:** la pantalla "Mis cuentas" gana un hero al tope (antes el total de cuentas solo existía en Inicio): label "Tu dinero en cuentas" + total protagonista (mono, extrabold, tabular) + **ojo de privacidad** anclado a la esquina (posición estable, solo cambia el contenido) + **barra de composición** (un segmento por cuenta con saldo positivo, ancho proporcional, tintes de `--fk-dom-tesoreria` por peso: mayor saldo = más opaco) + resumen en texto ("3 cuentas · 1 billetera · efectivo", para que el color nunca viaje solo). El ojo comparte `S.config.ocultarSaldo` con el de Inicio (IN.2): un solo control de privacidad en toda la app, enmascarar aquí enmascara allá y viceversa. Sin cuentas: "Aún no tienes cuentas" + $0, sin ojo ni barra. Superficie con degradado de identidad tesorería (16%) + borde (30%) + sombra en reposo: segundo consumidor del piloto ADR 033, contraste WCAG medido contra la parada fuerte (oscuro: primario 11.36:1, secundario 5.78:1; claro: 14.39:1 y 7.28:1); el resumen usa texto secundario, no muted (lección de IN.8b).

**Archivos tocados:** `index.html` (contenedor `#tesoreria-hero`), `modules/dominio/tesoreria/logic/cuentas.js` (`composicionCuentas()`, `resumenCuentas()` puras nuevas), `modules/dominio/tesoreria/views/cuentas.js` (`renderHeroTesoreria()`), `modules/dominio/tesoreria/view.js` (barrel + `renderTesoreria()`), `modules/dominio/tesoreria/logic.js` (barrel), `modules/dominio/tesoreria/acciones/cuentas.js` (acción `tesoreria-saldo-visibilidad`), `styles/components/domain.css` (`.hero-tesoreria__*`; el ojo comparte reglas con `.hero-inicio__ojo`), `tests/unit/tesoreria.test.js` (8 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v356 → v357), `docs/DECISIONS/035-mis-cuentas-v2.md` (nuevo), `docs/BOARD.md`, `docs/contexto/mis-cuentas.md`.

**Verificación:** 2403/2403 unit (composición ordenada por peso y pct, exclusión de inactivas/saldo 0, resumen singular/plural/billetera/efectivo, hero con total y aria-pressed, máscara sin monto real en el DOM, estado vacío sin ojo, acción que alterna y re-renderiza) + 171/171 E2E (1 nuevo en Chromium real: estado vacío, total tras crear cuenta, máscara compartida con el saldo de Inicio, destape) + lint verdes.

**Podría afectar:** nada persistido (reutiliza `S.config.ocultarSaldo`, cero cambios de schema). El ojo de Inicio ahora tiene un segundo punto de control del mismo flag: al volver a Inicio, `updSaldo()` ya refleja el cambio hecho desde Mis cuentas (cubierto por el E2E).

---

### feat(tesoreria): MC.15c aviso de cuota de manejo + MC.15d orden categoría→descripción · 2026-07-12

Cierra **MC.15c** y **MC.15d** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2", tarjeta MC.15). Con esto y la absorción de MC.15b por MC.18b (ADR 035), la tarjeta MC.15 queda cerrada.

**Qué cambió:** (MC.15c) al crear o editar una cuenta, el formulario muestra un hint bajo el toggle de cuota de manejo ("¿Seguro que esta cuenta no cobra cuota de manejo, seguros u otros costos periódicos?") mientras el toggle está SIN marcar; al marcarlo, el hint desaparece y aparece el fieldset de monto/día como siempre. No bloquea el guardado: solo reduce el olvido de un costo recurrente real. El hint vive dentro del mismo `.form-group--checkbox` del toggle, así que el caso "efectivo" de `_toggleCamposPorClase()` ya lo oculta sin wiring adicional. (MC.15d) `renderFormIngresoPuntual()` reordena sus campos a monto → cuenta → categoría → descripción → fecha, el mismo orden que ya cumplía `renderFormIngreso()` (fijos).

**Archivos tocados:** `modules/dominio/tesoreria/views/cuentas.js` (hint en `renderFormCuenta()`), `modules/dominio/tesoreria/acciones/cuentas.js` (`_toggleCuotaFieldset()` sincroniza el hint), `modules/dominio/tesoreria/views/ingresos.js` (orden de campos), `tests/unit/tesoreria.test.js` (3 tests nuevos), `service-worker.js` (v355 → v356), `docs/contexto/mis-cuentas.md`, `docs/BOARD.md`.

**Verificación:** 2394/2394 unit (hint presente y visible por defecto, toggle lo oculta/restaura, orden categoría antes que descripción) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema ni de lógica de guardado). **CAT.4** (auditoría transversal de formularios) debe saber que el form de ingreso puntual ya cumple el orden categoría→descripción.

---

### feat(logros): LG.2c constancia de registro + familia deudas saldadas · 2026-07-12

Cierra **LG.2c** (`docs/BOARD.md`, iniciativa "Logros v2"), tercera rebanada del [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) (decisiones D3 y D4).

**Qué cambió:** dos derivaciones puras nuevas en `logros/logic.js`: `mesCompleto(gastos, mesISO)` (¿el mes tuvo gasto en al menos 3 de sus ~4.4 semanas? bloque de 7 días desde el día 1, el bloque final corto cuenta como semana propia) y `rachaMesesCompletos(gastos, hoyISO)` (racha de meses completos consecutivos, contada hacia atrás desde el mes ANTERIOR a hoy: el mes en curso nunca cuenta porque todavía no terminó). Ambas reciben `hoyISO`/`mesISO` inyectado (mismo patrón que el resto del código: testeables sin mockear `Date`) y comparten un solo pase O(gastos) (`_semanasPorMes()`) para no recorrer el historial una vez por mes consultado. **4 niveles nuevos de la familia "registro"** (`mes-completo`, `tres-meses-seguidos`, `seis-meses-seguidos`, `doce-meses-seguidos`), cada `eval` del catálogo llama a la racha memoizada (`_rachaMesesCompletosMemo`, PERF.2: evita recorrer `S.gastos` 4 veces en una misma pasada de `evaluarLogros()`) con `hoy()` real. **Familia "deudas" nueva**: `deudasSaldadas(compromisos)` cuenta deudas (entidad o personal) con `saldoTotal === 0`, **excluyendo explícitamente las consolidadas** (`_aplicarConsolidacion()` en `compromisos/index.js` archiva la deuda vieja con `activo:false` pero nunca toca su `saldoTotal`: transformarse en un crédito nuevo no es "pagarla", tal como pide el ADR); una deuda archivada manualmente después de llegar a 0 sigue contando. 2 logros nuevos: `primera-deuda-saldada` y `tres-deudas-saldadas`.

**Archivos tocados:** `modules/dominio/logros/logic.js` (`mesCompleto()`, `rachaMesesCompletos()`, `deudasSaldadas()`, 6 entradas nuevas en `LOGROS`, `FAMILIAS.deudas`), `tests/unit/logros.test.js` (24 tests nuevos + 4 ajustados por el crecimiento de la familia registro de 2 a 6 niveles), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v354 → v355), `docs/contexto/transversal.md`, `docs/BOARD.md` (LG.2d: su bloqueo por IN.8 se levanta, ya solo espera a ANL.1).

**Verificación:** 2391/2391 unit (semanas por mes, mes completo con bloque final corto, racha que cruza el cambio de año, racha que corta en el primer mes incompleto, deudas saldadas excluyendo consolidadas, integración catálogo↔evaluarLogros con fake timers para los 4 niveles nuevos) + 170/170 E2E (1 nuevo en Chromium real: familia "Deudas saldadas" agrupada en la vitrina) + lint verdes.

**Podría afectar:** nada persistido más allá de lo ya vigente (`S.logros` sigue siendo `string[]`, sin bump de schema, tal como diseña el ADR). El catálogo pasa de 11 a 17 logros; con 17 (no los ~20 previstos para cuando LG.2e agregue la familia comportamiento), el tramo superior de `NIVELES_USUARIO` ("Leyenda del ahorro", min 18) queda temporalmente inalcanzable, fuera del alcance declarado de esta rebanada.

---

### feat(ui): IN.8g fusión accesos rápidos + actividad reciente, cierra "Inicio v2" · 2026-07-12

Cierra **IN.8g** (`docs/BOARD.md`), séptima y última rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D7). **Con esta rebanada, la iniciativa "Inicio v2" queda completa.**

**Qué cambió:** "Accesos rápidos" y "Actividad reciente" (antes dos bloques independientes, cada uno su propio `bento__cell`/card) quedan fusionados en un solo contenedor (`.accesos-actividad`), cierre de la pantalla de Inicio. **Arriba:** header con label "Accesos rápidos" + botón "Personalizar" en la misma fila (antes el botón vivía debajo de la grilla, sin label visible) + grilla de tiles sin cambios (`renderAccesosInicio()`/`accesosVisibles()` intactos). **Abajo**, separado por `border-top` (`.accesos-actividad__seccion--actividad`, que desaparece junto con el panel cuando no hay movimientos, sin lógica nueva): header con label "Actividad reciente" + link "Ver todo" en la misma fila (antes: encabezado con ícono propio arriba, "Ver todo" como pie de página al final de la lista) + lista de movimientos sin cambios (`movimientosRecientes()` intacto, mismo signo +/- por dirección). **Cero cambios en `accesos/logic.js` y `movimientos/logic.js`** (regla explícita del ADR: solo contenedor/posición).

**Archivos tocados:** `index.html` (marcado fusionado del bloque final), `modules/dominio/movimientos/view.js` (`renderActividadReciente()`: header simplificado, ya no genera su propia `<section>`/`<header>` con ícono), `styles/components/domain.css` (`.accesos-actividad*` nuevo toma la superficie de card que antes tenían por separado ambos bloques; `.actividad-reciente__ver-todo` pasa de pie de página a link inline), `tests/unit/movimientos.test.js` (2 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v353 → v354), `docs/contexto/inicio.md`.

**Verificación:** 2367/2367 unit (label "Actividad reciente" en el header compartido sin su propia card/ícono, ausencia de las clases retiradas) + 169/169 E2E (1 nuevo en Chromium real: un solo contenedor visual, ambos labels, botón Personalizar visible, grilla de accesos, link "Ver todo" con href correcto, separador en la sección de actividad) + lint verdes.

**Podría afectar:** nada persistido ni de comportamiento (cero cambios de schema, cero cambios de lógica). Visualmente el botón "Personalizar" y el link "Ver todo" cambian de posición (ahora junto a sus labels respectivos, no como pie de página).

---

### feat(resumen): IN.8f resumen semanal visual con serie diaria + barras + chip comparativo · 2026-07-12

Cierra **IN.8f** (`docs/BOARD.md`, iniciativa "Inicio v2"), sexta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D6).

**Qué cambió:** `resumenSemanal()` (`resumen/logic.js`) se extiende de forma aditiva (ningún campo existente cambia de forma ni de valor) con **`serie`** (7 días, ordenados de más antiguo a más reciente, `serieDiaria()` nuevo, cálculo puro dentro del mismo bundle memoizado de PERF.2/7b, sin memo nueva), **`diasActivosSemana`** (días de la ventana de 7 con gasto real, distinto de `diasActivos` mensual que se conserva sin cambios) y **`diaPico`** (nombre completo del día con más gasto, `null` si la semana no tuvo gasto). `renderPanelResumen()` reemplaza el grid plano de estadísticas por un bloque visual bespoke (`.resumen-semana__*`, namespace propio: `.resumen-card__grid/__stat/__label/__value` **no se tocan** porque "Me deben" (`personales-resumen`) los reutiliza): monto grande (`--fk-text-3xl`) + **chip comparativo** compacto ("12% menos" en verde `--fk-success-bg/-text` solo cuando el gasto bajó; "12% más"/"igual"/"sin previa" comparten un tono neutro, mismo criterio que IV.3 en Análisis: **nunca rojo**, ADR 019) + **mini gráfico de 7 barras** (`--fk-accent` al 100% en el día pico, ~28% de opacidad en el resto, alto proporcional con tope al 72% del contenedor) + etiquetas de día resaltadas en el pico + fila de **categoría top** con `tejaCategoria()` (36px) y mensaje interpretativo ("Mercado fue tu categoría top · 2 de 7 días activos · mayor gasto el sábado"). El label cambia a "Gastaste esta semana" (antes "Gastaste estos 7 días") para calzar con el copy del diseño hifi. El viejo stat "Constancia" (días activos del mes) se retira de este panel (Análisis cubre el detalle mensual); `.resumen-card__trend*` quedó sin consumidor tras el cambio y se eliminó como CSS muerto.

**Archivos tocados:** `modules/dominio/resumen/logic.js` (`serieDiaria()`, `resumenSemanal()` extendido), `modules/dominio/resumen/view.js` (rediseño completo de `renderPanelResumen()`, chip/barras/categoría top), `styles/components/domain.css` (`.resumen-semana__*` nuevo, `.resumen-card__trend*` eliminado), `tests/unit/resumen.test.js` (11 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v352 → v353), `docs/contexto/inicio.md`.

**Verificación:** 2366/2366 unit (serie diaria ordenada y sumada por ventana, campos nuevos de `resumenSemanal()`, `diaPico` null sin gasto, 7 barras en el DOM, chip verde al bajar, chip neutro al subir, categoría top con días activos y día pico, defensivo sin categoría top) + 168/168 E2E (1 nuevo en Chromium real: monto, chip, 7 barras con 1 pico, categoría top con teja y monto) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema). El stat "Constancia" (días activos del mes) ya no aparece en el panel de Inicio; ese detalle sigue disponible en Análisis.

---

### feat(compromisos): IN.8e Pendientes del mes sin línea roja + Gestionar → Calendario · 2026-07-12

Cierra **IN.8e** (`docs/BOARD.md`, iniciativa "Inicio v2"), quinta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D5).

**Qué cambió:** `renderPanelVencidos()` (`compromisos/views/dashboard.js`) deja el `border-left: 3px solid var(--fk-danger)` de `.vencidos-card` (ADR 019, "gastar no es incumplir"): la urgencia vive SOLO en un texto de estado por ítem, nunca en el borde/fondo de toda la tarjeta. Cada ítem gana una fila `.vencidos-card__meta` con **badge corto** ("Deuda"/"Gasto fijo", `_tipoBadgeCorto()` nuevo, propio de este panel; `_tipoBadge()` con las etiquetas largas sigue intacto para "Próximas prioridades") + **estado temporal semántico** ("Venció hace N días"/"Venció ayer" en `--fk-danger-text`, "Vence hoy" en `--fk-warning-text`, tokens ya validados AA en el resto de la app). El **título** deja de incluir el conteo ("2 pendientes del mes" → "Pendientes del mes"); el número pasa a un **badge circular** en el header (`.vencidos-card__counter`, `--fk-danger-bg`/`-text`). El monto de cada ítem sube a peso `--fk-font-bold` + `font-variant-numeric: tabular-nums` (el 15px del mockup no tiene token exacto en la escala; se conserva `--fk-text-sm`, mismo criterio de IN.8b). **"Gestionar" pasa de `#compromisos` a `#agenda`**: el Calendario es el centro de gestión de obligaciones por fecha (ampliación del 3.er lote del 2026-07-08, formalizada ahora en el ADR); `aria-label` actualizado a "Ir al calendario", igual que "Próximas prioridades".

**Archivos tocados:** `modules/dominio/compromisos/views/dashboard.js` (`_tipoBadgeCorto()`, `renderPanelVencidos()`), `styles/components/domain.css` (`.vencidos-card` sin border-left, `__counter`, `__meta`, `__estado--danger/--warning`, `__name`/`__amount` con peso y tabular-nums), `tests/unit/compromisos.test.js` (7 tests nuevos), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v351 → v352), `docs/contexto/inicio.md`.

**Verificación:** 2356/2356 unit (7 nuevos: título sin conteo + badge circular, "Venció hace 2 días" en danger con badge "Deuda", "Vence hoy" en warning con badge "Gasto fijo", deuda personal también usa "Deuda", "Venció ayer", ausencia de clases de severidad viejas, link a `#agenda` con aria-label nuevo) + 167/167 E2E (1 nuevo en Chromium real: badge corto, colores semánticos por estado, click en "Gestionar" navega a `#sec-agenda`) + lint verdes.

**Podría afectar:** nada persistido (cero cambios de schema). Un usuario que antes llegaba a la lista completa de Compromisos desde "Gestionar" ahora llega al Calendario; la lista de Compromisos sigue accesible por su propio ícono de navegación.

---

### feat(ui): IN.8d header de perfil con avatar de iniciales + saludo en dos líneas · 2026-07-12

Cierra **IN.8d** (`docs/BOARD.md`, iniciativa "Inicio v2"), cuarta rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D8, cierra la absorción de IN.6b: iniciales, sin foto).

**Qué cambió:** el header de `#sec-dash` deja el título "Tu resumen" + subtítulo y pasa a un header de perfil (`.perfil-inicio`): **teja de iniciales** 46×46px/radio 14px con gradiente del acento y tinta oscura (tokens nuevos `--fk-avatar-grad-a/-grad-b/-ink` en `tokens.css`, colores FIJOS en ambos temas por el criterio de tejas de marca del ADR 025; contraste 9.6:1 sobre la parada más clara del gradiente), **saludo en dos líneas** (`#saludo-franja` "Buenas tardes," 14px secundario arriba; `#saludo-inicio` con el nombre 20px/700 abajo, ahora título visual de la pantalla; medidas ajustadas a la escala de tokens, mismo criterio que IN.8b) y **enlace de ajustes** 40×40px a `#config` (`.perfil-inicio__ajustes`, reusa el símbolo `i-ajustes`). `updSaludo()` (`render.js`) reparte franja/nombre/iniciales; `_iniciales()` nuevo toma la primera letra de las dos primeras palabras del nombre con spread (no parte caracteres de dos unidades de código). **Fallback sin nombre** (decisión que el ADR delegaba a la rebanada): la franja saluda sola (sin coma) y nombre y avatar se ocultan; sin dato nuevo ni bump de schema. **Encabezado accesible resuelto:** el h1 "Tu resumen" queda `sr-only` y la sección conserva su nombre de región vía `aria-labelledby` (pase axe WCAG 2.1 AA del suite unitario verde con el marcado nuevo). La lógica de franjas horarias (IN.6a) no cambió.

**Archivos tocados:** `index.html` (header de `#sec-dash`), `modules/infra/render.js` (`updSaludo()` + `_iniciales()`), `styles/components/domain.css` (`.perfil-inicio*`), `styles/tokens.css` (`--fk-avatar-*`), `tests/unit/render.test.js` (fixture réplica del header + tests de iniciales y fallbacks), `service-worker.js` (v350 → v351), `docs/contexto/inicio.md`.

**Verificación:** 2349/2349 unit (2 netos nuevos: iniciales con 1 y 2+ palabras, franja sin coma y avatar oculto sin nombre, más el fixture del header nuevo en toda la suite de `updSaludo()`) + 166/166 E2E en Chromium real + lint verdes. El pase axe sobre `index.html` (violaciones críticas/graves, ARIA, IDs duplicados) corre dentro del suite unitario y pasó con el marcado nuevo.

**Podría afectar:** nada persistido (cero cambios de schema ni de datos). Lectores de pantalla siguen anunciando la región como "Tu resumen"; visualmente el título de Inicio ahora es el nombre del usuario (o el saludo genérico si no hay nombre).

---

### feat(ui): IN.8c detalle por cuenta expandible en el hero + máscara extendida · 2026-07-12

Cierra **IN.8c** (`docs/BOARD.md`, iniciativa "Inicio v2"), tercera rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D4, resuelve la decisión UX que IN.2 dejó abierta).

**Qué cambió:** bajo el monto del hero aparece el pill `#saldo-detalle-toggle` ("Ver detalle por cuenta" ↔ "Ocultar detalle", con `aria-expanded`/`aria-controls`) que expande in situ una lista con una fila por cuenta activa: teja de marca del banco (`bancoAvatar()`, ADR 025), nombre (escapado) y saldo tabular; el efectivo es una fila más. Reglas del ADR implementadas tal cual: **colapsado por defecto** y **estado solo de UI en memoria** (`_detalleCuentasAbierto` en `render.js`; la acción nueva `saldo-detalle` no llama a `save()` ni toca `S.config`, verificado por test); **la máscara del ojo cubre total Y detalle juntos** (extensión de IN.2: filas con `SALDO_MASCARA_CUENTA` y ningún saldo real toca el DOM mientras está oculto); **el conteo "efectivo + N cuentas bancarias" solo colapsado** y ahora con datos reales (`_descCuentas()`: "efectivo + 2 cuentas bancarias", "1 cuenta bancaria", "solo efectivo"; antes era un texto fijo). Animación de entrada de 180 ms solo con `opacity` + `transform` (disciplina ADR 033 D4), apagada bajo `prefers-reduced-motion`. Helper nuevo `bancoClase()` en `infra/bancos.js`, espejo de `claseEntidad()` (tesorería) para consumidores de infra que no pueden importar dominios (ADN 10).

**Archivos tocados:** `index.html` (pill + lista en el hero), `modules/infra/render.js` (estado, `alternarDetalleCuentas()`, filas, conteo real, `SALDO_MASCARA_CUENTA`), `modules/ui/actions.js` (acción `saldo-detalle`), `modules/infra/bancos.js` (`bancoClase()`), `styles/components/domain.css` (pill, tile en miniatura, filas, animación), `tests/unit/render.test.js` (fixture + 10 tests), `tests/e2e/smoke.test.js` (1 test), `service-worker.js` (v349 → v350), `docs/contexto/inicio.md`.

**Verificación:** 2347/2347 unit (10 nuevos: default colapsado, conteos singular/plural/sin efectivo/solo efectivo, filas con tejas y montos, máscara total+detalle sin montos reales en el DOM, colapso limpia, sin cuentas oculta todo, escape de nombre, acción sin persistencia) + 166/166 E2E (1 nuevo en Chromium real: expandir, enmascarar, desenmascarar y recargar vuelve colapsado) + lint verdes. Capturas móvil en ambos temas (expandido y enmascarado) revisadas contra el mockup; fix visual encontrado en la revisión: el pill estiraba al ancho completo por el stretch del flex column, corregido con `align-self: center`.

**Podría afectar:** nada persistido (cero cambios de schema). El texto del conteo bajo el saldo cambia de fijo a real: usuarios sin cuenta de efectivo dejan de leer "efectivo + ..." engañoso.

---

### feat(ui): IN.8b hero con saldo protagonista + ojo estable + piloto visual ADR 033 · 2026-07-12

Cierra **IN.8b** (`docs/BOARD.md`, iniciativa "Inicio v2"), segunda rebanada del [ADR 034](DECISIONS/034-inicio-v2.md) (decisiones D2 y D3) y estreno del piloto acotado del [ADR 033](DECISIONS/033-direccion-visual-premium.md) (D1 sombra en reposo + D2 degradado de identidad, solo en el hero de Inicio; DV.2a sigue pendiente).

**Qué cambió:** el hero (`index.html`, clase nueva `.hero-inicio` sobre la celda) queda centrado y sin el ícono decorativo `i-saldo` (`#hero-saldo-icon` eliminado del DOM y de `updSaldo()`): label "Tu dinero disponible hoy" en sentence case (14px, secundario), monto protagonista (objetivo 42px/800; `clamp()` solo protege pantallas < 390px de un saldo de 9 cifras; tabular-nums; letter-spacing -0.02em; color primario: la identidad la pone el degradado, no el número verde de antes), descripción 12px secundario. El **ojo de privacidad** (D3) pasa a `position:absolute` en la esquina superior derecha del hero, reescrito como botón propio (sin `.btn`: el min-height táctil de 44px que responsive.css impone a `.btn` deformaría los 40px del diseño; 40px cumple WCAG 2.5.8). Al alternar visible/oculto solo cambian el ícono y el contenido del monto: la posición del control queda estable al píxel. Fondo del piloto: `linear-gradient(160deg, color-mix(accent 14%, transparent), transparent 55%)` sobre `--fk-bg-surface`, borde `--fk-accent-border`, sombra `--fk-shadow-md`; ambos temas heredan por tokens sin tocar `themes.css`.

**Contraste WCAG (método IV.1/IV.2, medido contra la parada fuerte del degradado):** oscuro (#193433 compuesto): primario 11.16:1, secundario 5.67:1 (AA texto pequeño); claro (#def4ec): primario 14.62:1, secundario 7.40:1. El texto muted queda excluido del hero (4.13:1 en oscuro, falla AA); las cifras viven como comentario en el propio CSS.

**Archivos tocados:** `index.html` (marcado del hero), `modules/infra/render.js` (`updSaldo()` sin el ícono; contrato de `S.config.ocultarSaldo` intacto), `styles/components/domain.css` (bloque `.hero-inicio*` reemplaza a `.hero-saldo*`), `styles/responsive.css` (excepción de padding del hero en móvil), `tests/unit/render.test.js` (fixture al marcado nuevo), `tests/e2e/smoke.test.js` (1 E2E nuevo), `service-worker.js` (v348 → v349), `docs/contexto/inicio.md`.

**Verificación:** 2337/2337 unit + 165/165 E2E + lint verdes. E2E nuevo: la posición del ojo medida en reposo (`boundingBox`) es idéntica en visible → oculto → visible. Hallazgo del proceso: el corrimiento de 2px que apareció al medir era el lift de hover de `.bento__cell` (comportamiento preexistente por diseño, documentado en el test); el defecto real de IN.2 (el ojo saltaba con el ancho de la máscara) quedó corregido de raíz. Capturas móvil/desktop en ambos temas revisadas contra el mockup.

**Podría afectar:** el monto pierde el verde acento (decisión del diseño hifi); el empty state del hero (`hero-guia`) no cambió. `bento__value--xl` y `bento__cell--accent` quedan sin consumidores en Inicio (la limpieza de CSS muerto vive en PERF.8).

---

### feat(ui): IN.8a reorden del dashboard + labels de grupo + aire · 2026-07-12

Cierra **IN.8a** (`docs/BOARD.md`, iniciativa "Inicio v2"), la primera rebanada de implementación del [ADR 034](DECISIONS/034-inicio-v2.md) (decisión D1: lo accionable sube, los atajos bajan).

**Qué cambió:** el `.bento--dash` de `index.html` queda en el orden nuevo: hero → grupo "Atención hoy" (nudge de distribuir ingreso + Pendientes del mes + Próximas prioridades + alertas de límites) → grupo "Resumen de la semana" → accesos rápidos → actividad reciente al final. Los dos grupos usan un contenedor nuevo `.bento__group` (layout.css): label de grupo `.bento__group-label` (12px/700, uppercase, letter-spacing 0.07em, `--fk-text-muted`: pasa AA sobre bg-base, donde se apoya) + grilla interna `.bento__group-cells` que espeja las columnas del bento por breakpoint (12 desktop / 6 tablet / 1 móvil, responsive.css), así los spans `--full`/`--half` existentes siguen valiendo. Un grupo sin ninguna celda visible desaparece completo (label incluido) vía `:has()`, respetando el patrón `[hidden]` de los paneles dinámicos. Los 6 paneles dinámicos ganan `.bento__cell--flat` (utils.css, capa más alta a propósito: debe ganarle al padding móvil de `.bento__cell` en la capa responsive y al `margin-bottom` de las cards internas en la capa components): el componente interno pone su propia superficie/borde y desaparece el doble contenedor card-dentro-de-card que existía desde TX.8a. Aire en móvil: 20px entre bloques de primer nivel (`.bento--dash`), 12px entre tarjetas dentro de un grupo. `renderPanelResumen()` (`resumen/view.js`) deja de repetir el encabezado interno "Resumen de la semana": el label del grupo es el título (el rediseño completo de esa card llega en IN.8f).

**Archivos tocados:** `index.html` (orden del `.bento--dash` + grupos), `styles/layout.css` (`.bento__group*`), `styles/utils.css` (`.bento__cell--flat`), `styles/responsive.css` (columnas espejo + aire móvil), `modules/dominio/resumen/view.js` (sin encabezado interno), `service-worker.js` (v347 → v348), `docs/contexto/inicio.md`.

**Verificación:** 2337/2337 unit + 164/164 E2E + lint verdes (ningún dominio cambió su lógica: no hacían falta tests nuevos). Geometría medida en Chromium real con datos sembrados (script de captura + medición): label→cards 12px, card→card dentro del grupo 12px, bloque→bloque 20px, celdas planas sin padding fantasma. Capturas móvil/desktop en ambos temas revisadas.

**Podría afectar:** cualquier flujo que dependa del orden visual del dashboard (los E2E de navegación pasan porque localizan por id/aria, no por posición). La línea roja de "Pendientes del mes" y el diseño interno de cada panel siguen igual: cambian en IN.8e/IN.8f.

---

### docs(adr): IN.8 fase de análisis, ADR 034 Inicio v2 escrito + iniciativa re-cortada en rebanadas · 2026-07-12

Cierra la fase de análisis/ADR de la iniciativa **"Inicio v2" (IN.8)**, la tarjeta que exigía revisión formal del ADR 028 antes de codificar. Detonante: Esteban entregó el handoff de diseño de alta fidelidad (`Iteración de specimen/design_handoff_inicio_v2/`: mockup HTML interactivo construido con los tokens reales de `tokens.css`/`themes.css` + documento de decisiones D1 a D8) y dio la instrucción de implementar el diseño con sus opciones recomendadas.

**Qué se decidió (nuevo [ADR 034](DECISIONS/034-inicio-v2.md), Aceptada):** orden vertical nuevo (perfil → hero → "Atención hoy" → "Resumen de la semana" → accesos+actividad fusionados al final; reemplaza el D1 del ADR 028 conservando "un rol por bloque"); hero con saldo centrado protagonista (42px/800 tabular, sin el ícono `i-saldo` decorativo) sobre degradado de identidad + `--fk-shadow-md`; ojo de privacidad con posición absoluta estable (corrige el desplazamiento al alternar); "Ver detalle por cuenta" expandible (colapsado por defecto, estado UI en memoria sin persistir, máscara del ojo extendida al detalle); "Pendientes del mes" sin línea roja (jerarquía por teja de dominio + `.dom-badge` + estado temporal semántico solo en el texto; "Gestionar" pasa de `#compromisos` a `#agenda`, ampliación del 3.er lote); resumen semanal como bloque más visual (monto grande + chip comparativo nunca rojo + barras de 7 días + categoría top); header de perfil con teja de iniciales (sin foto, ratifica ADR 028 D3/ADR 030; sin bump de schema, las iniciales se derivan de `S.perfil.nombre`, así que el bump v24 previsto para IN.6b ya no hace falta).

**Verificaciones hechas contra el código en esta fase:** `resumenSemanal()` (`resumen/logic.js`) NO expone serie diaria, solo agregados (el gráfico de IN.8f requiere cálculo puro nuevo, dentro del bundle memoizado de PERF.2/7b); "Gestionar" apunta hoy a `#compromisos` (`renderPanelVencidos()`); los tokens `--fk-shadow-*` existen en ambos temas pero `--fk-grad-identity` no (lo estrena IN.8b sobre `--fk-accent`); el ojo del hero vive en flujo junto al monto (causa real del salto reportado).

**Estado del [ADR 033](DECISIONS/033-direccion-visual-premium.md):** pasa de "Propuesta" a "Propuesta con estreno parcial autorizado": D1 (sombra en reposo) y D2 (degradado de identidad) se consumen acotados al dashboard de Inicio como piloto, en línea con las recomendaciones de P1/P5; P2, P3, P4 y el despliegue global (DV.2a a DV.2d) siguen pendientes de validación formal.

**Archivos tocados:** `docs/DECISIONS/034-inicio-v2.md` (nuevo), `docs/DECISIONS/033-direccion-visual-premium.md` (estado), `docs/BOARD.md` (tarjeta IN.8 reemplazada por las rebanadas IN.8a a IN.8g, con dependencias y modelo por rebanada; notas de "En proceso" y LG.2d actualizadas), `docs/contexto/inicio.md`, `docs/HANDOFF.md`. Sin cambios de código, tests ni SW.

**Podría afectar:** nada en producción (solo documentación). La implementación arranca con **IN.8a** (reorden del dashboard + labels de grupo + aire); cada rebanada saldrá con tests verdes, verificación en la app, bump de `CACHE_NAME` y push.

---

### feat(tesoreria): MC.15a menos redundancia en tarjetas de cuenta e ingreso fijo · 2026-07-11

Cierra la primera rebanada de **MC.15** (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"): la tarjeta se re-cortó en MC.15a/b/c/d (regla 2.1, la tarjeta original tocaba texto duplicado, CSS de logos, un aviso nuevo y orden de formulario, cuatro concerns independientes). Esta rebanada cierra los puntos 1 y 20 del brief.

**Diagnóstico:** la tarjeta de una cuenta mostraba "Banco de Bogotá Ahorros" (título) seguido de "Banco de Bogotá · Ahorros" (subtítulo): pura repetición, porque el formulario de cuentas (`renderFormCuenta()`) nunca ofrece un campo para escribir un nombre propio, así que `cuenta.nombre` siempre sale de `_autoNombre(banco, tipo)` (`logic/cuentas.js`) y ya contiene ambos datos. La tarjeta de un ingreso fijo tenía el mismo problema cuando la descripción coincidía con la categoría elegida (ej. descripción "Salario mínimo" + categoría "Salario mínimo" → subtítulo "Quincenal · Salario mínimo").

**Qué cambió:** en `modules/dominio/tesoreria/views/cuentas.js`, `_renderCuentaItem()` compara `cuenta.nombre` (normalizado: trim + minúsculas) contra el combinado `banco tipo`; si coinciden, omite el subtítulo por completo. Importante: no se asumió que el subtítulo sobra siempre. `normalizarCuenta()` (`logic/cuentas.js`) ya soporta un nombre explícito distinto si algún día el form lo expone (sus propios tests lo prueban: "respeta el nombre del usuario si lo provee"), así que en ese caso el subtítulo se conserva porque sí aportaría información nueva. En `modules/dominio/tesoreria/views/ingresos.js`, `_renderIngresoItem()` omite la categoría del subtítulo cuando coincide (normalizada) con la descripción, dejando solo la frecuencia; si difieren, conserva ambas como antes (el caso común y útil, ej. descripción "Sueldo Claro" + categoría "Salario mínimo").

**Archivos tocados:** `modules/dominio/tesoreria/views/cuentas.js`, `modules/dominio/tesoreria/views/ingresos.js`, `tests/unit/tesoreria.test.js` (5 tests nuevos), `service-worker.js` (v346 → v347), `docs/contexto/mis-cuentas.md`.

**Verificación:** 2337/2337 unit verdes (5 nuevos: nombre autogenerado sin subtítulo, caso banco===tipo sin subtítulo, nombre explícito con subtítulo, descripción=categoría en ingresos omite categoría con match case-insensitive, descripción≠categoría conserva ambas). Lint verde.

**Podría afectar:** ninguna cuenta o ingreso real pierde información: en cuentas, el 100% de las existentes tiene `nombre` autogenerado (ningún form ni migración histórica escribió uno distinto, confirmado por `git log -S` sobre el archivo del formulario), así que todas dejan de mostrar el subtítulo; en ingresos, solo se omite la categoría cuando es literalmente el mismo texto que la descripción.

---

### fix(ahorro): BUG-012 lenguaje humano al desactivar el fondo de emergencia · 2026-07-11

Corrige y elimina **BUG-012** de `docs/BUGS.md` (prioridad media, reportado por Esteban el 2026-07-08): al desactivar el Fondo de Emergencia (Ahorro → editar el fondo → "Desactivar fondo"), el modal de confirmación mostraba el texto literal "...la sección vuelve a mostrar el **empty state**...", jerga técnica de desarrollo visible al usuario final. Viola el ADN 11 (lenguaje humano, jamás jerga técnica en la UI).

**Qué cambió:** en `modules/dominio/ahorro/index.js`, `_desactivarFondo()` cambia el mensaje de `confirmar()` a "...la sección vuelve a mostrar la **pantalla inicial** para activarlo...", que comunica lo mismo (los datos se conservan, la sección vuelve a su estado de bienvenida) sin término técnico. La nota del reporte pedía además "una pasada rápida de grep por otros literales técnicos visibles (Empty State, placeholder, TODO, null, undefined) en todos los view.js al corregirlo, para cazar hermanos del mismo error": el grep (`mensaje:`/`titulo:` de `confirmar()` en todo `modules/`, y `empty state`/`placeholder`/`TODO`/`null`/`undefined` en todos los `view*.js`) confirmó que este era el único caso real; el resto de coincidencias eran comentarios de código (`// ── EMPTY STATE ──`), nombres de variable (`null` como valor de tipo) o atributos HTML legítimos (`placeholder` de un `<input>`).

**Archivos tocados:** `modules/dominio/ahorro/index.js` (fix), `tests/unit/ahorro.test.js` (1 test nuevo), `service-worker.js` (v345 → v346), `docs/contexto/ahorro.md` (ficha nueva, primera de esta sección), `docs/BUGS.md` (entrada eliminada).

**Verificación:** 2331/2331 unit verdes (1 nuevo: el mensaje de confirmación no contiene el literal "empty state" y sí "pantalla inicial"; falla sin el fix, verificado revirtiéndolo con stash). 164/164 E2E verdes (sin cambios de comportamiento observable en flujos automatizados). Lint verde.

**Podría afectar:** nada funcional; cambio de copy en un solo mensaje de confirmación.

---

### fix(compromisos): BUG-011 la simulación de estrategia ya no se presenta como aplicada · 2026-07-11

Corrige y elimina **BUG-011** de `docs/BUGS.md` (prioridad alta, reportado por Esteban el 2026-07-08): en Deudas, con un plan de pago inviable, teclear un valor en "Aumenta tu cuota" (panel de alternativas) y luego pasar a la pestaña "Renegociar la tasa" cerraba el panel automáticamente y dejaba la card mostrando el plan como saneado, sin haber presionado "Aplicar este aumento".

**Diagnóstico (la primera pregunta del reporte era si la mutación es real o visual):** es la variante **visual**. Los tres caminos que escriben en `S` (`_aplicarAumentoCuota`, `_aplicarRenegociacion`, `_aplicarConsolidacion` en `modules/dominio/compromisos/index.js`) están detrás de `confirmar()` y nunca se invocan al teclear ni al cambiar de pestaña; las cuotas registradas no cambiaban. La causa: el input del remedio (`cambiar-extra-remedio`) commitea cada tecla a `_uiEstrategia.extraMensual` (decisión deliberada de D.9, para que el clic en "Aplicar" no compita con un re-render por blur), y `renderEstrategiaPago()` calculaba `recomendarEstrategia(deudas, extraMensual)` **con ese extra simulado**. Si el monto tecleado volvía viable el plan, el siguiente re-render (cambiar de alternativa, abrir/cerrar el panel, cualquier `state:change`) reemplazaba el bloque inviable completo (botón de alerta + panel) por el acelerador del plan viable: la simulación quedaba presentada como estado real.

**Qué cambió:** en `modules/dominio/compromisos/views/estrategia.js`, la estructura de la card (recomendación, detalle "Tu impacto" y la elección bloque viable/inviable) se decide ahora con `recomendarEstrategia(deudas, 0)`: solo datos registrados. El extra simulado alimenta únicamente el resumen comparativo (`renderResumenExtra`) dentro de su propio bloque, que ya cubría el caso "sin extra no cierra, con extra sí" con copy honesto. Con plan viable, el extra del acelerador sigue participando de la recomendación (exploración legítima ya documentada en `logic/estrategia.js`). Beneficio adicional: la simulación ahora **sobrevive** al ir y volver entre pestañas (monto en el input + resumen + botón habilitado), antes se perdía junto con el panel.

**Archivos tocados:** `modules/dominio/compromisos/views/estrategia.js` (fix), `tests/unit/compromisos.test.js` (5 tests nuevos), `tests/e2e/estrategia-pago.test.js` (2 tests nuevos), `service-worker.js` (v344 → v345), `docs/contexto/deudas.md` (lección de diseño: el estado UI simulado nunca decide estructura), `docs/BUGS.md` (entrada BUG-011 eliminada).

**Verificación:** 2330/2330 unit verdes (5 nuevos; 4 de ellos fallan sin el fix, verificado revirtiéndolo temporalmente con stash). 164/164 E2E verdes (2 nuevos con el flujo exacto del reporte en Chromium real: fill del extra, click en la pestaña, panel conservado, `localStorage` sin cambios). Lint verde.

**Hallazgo colateral (SW):** IV.3, D.14, CAL.3 y MC.14 salieron a producción **sin bump de `CACHE_NAME`** y el SW es cache-first puro, así que las PWAs ya instaladas seguían sirviendo los archivos de v344 (IV.2c): esos cuatro cambios podían no verse en el celular. El bump a v345 de este commit los propaga todos. Recordatorio de proceso: todo cambio de JS/CSS/HTML en producción necesita bump (regla ya escrita en el encabezado de `service-worker.js`); la tarjeta UPD.1 del BOARD (aviso de actualización) mitigará el costo de estos bumps para el usuario.

**Podría afectar:** la card de estrategia con plan viable no cambia de comportamiento; con plan inviable, el detalle "Tu impacto" ya no adopta el extra simulado (vuelve a mostrar "No se termina de pagar" hasta que el aumento se aplique de verdad), que es el comportamiento honesto especificado en la iniciativa Deudas v2 (punto 5 del brief).

---

### feat(tesoreria): MC.14 datos de transferencia por cuenta · 2026-07-11

Cierra MC.14 (`docs/BOARD.md`, iniciativa "Mis Cuentas v2"), rebanada independiente que ya podía ejecutarse sin esperar el resto de la iniciativa (MC.13, MC.15, MC.16). Hoy, cuando alguien le pide al usuario sus datos para consignarle, tiene que salir de Finko a buscarlos en otra parte (banca en línea, mensajes viejos, memoria); la app no tenía ningún lugar para guardar esa información de referencia.

**Qué cambió:** en `modules/core/state.js` se agrega el typedef `DatosTransferencia` y el campo opcional `Cuenta.datosTransferencia`: número de cuenta, llave de transferencia con su tipo (`TIPOS_LLAVE`, nuevo catálogo en `core/constants.js`: Celular/Correo/Documento/Alfanumérico/Otro) y alias. En `modules/dominio/tesoreria/views/cuentas.js`, `renderFormCuenta()` agrega un bloque opcional detrás de un toggle "Guardar los datos que compartes cuando alguien te va a consignar" (mismo patrón de fieldset colapsable que ya usaba la cuota de manejo); `_renderCuentaItem()` muestra un hint compacto (🔑) cuando la cuenta tiene estos datos, igual que los hints existentes de cuota de manejo y GMF (no existe una vista de "detalle de cuenta" separada en esta sección, así que la tarjeta de lista sigue siendo el punto de consulta). En `modules/dominio/tesoreria/logic/cuentas.js`: `validarCuenta()` exige el tipo de llave cuando hay una llave (los demás campos son libres entre sí); `parseDatosTransferencia()` (nuevo) construye el objeto final o `null` si el toggle está apagado o quedó vacío tras recortar espacios. En `modules/dominio/tesoreria/acciones/cuentas.js`: wiring del toggle (`_toggleTransferenciaFieldset()`), pre-rellenado en modo edición, y el bloque se oculta para cuentas de clase `efectivo` (no tiene número de cuenta ni llave que aplique), igual que ya pasa con la cuota de manejo y el 4x1000.

**Sin bump de `SCHEMA_VERSION`:** los campos son opcionales y `undefined`-safe en registros existentes, mismo precedente que `cuotaManejo`/`aplica4x1000` (tampoco tienen entrada en `_migrate()`, confirmado por grep antes de decidir).

**Archivos tocados:** `modules/core/state.js`, `modules/core/constants.js`, `modules/dominio/tesoreria/logic/cuentas.js`, `modules/dominio/tesoreria/logic.js` (barrel), `modules/dominio/tesoreria/views/cuentas.js`, `modules/dominio/tesoreria/acciones/cuentas.js`, `tests/unit/tesoreria.test.js` (18 tests nuevos), `docs/contexto/mis-cuentas.md` (ficha nueva, primera de esta sección).

**Verificación:** 2325/2325 unit verdes (18 nuevos: validación con/sin llave+tipo, parseo con todas las combinaciones de campos, normalización, render del toggle+fieldset+catálogo, render del hint combinado en la lista). 162/162 E2E verdes; una prueba de accesibilidad no relacionada (`#distribuir-ingreso-panel`) salió flaky en la corrida completa por contención de recursos, confirmada 3/3 al aislarla, sin relación con los archivos tocados. Lint verde.

**Podría afectar:** nada funcional fuera de la tarjeta/formulario de cuenta; ningún otro dominio lee `datosTransferencia` todavía.

---

### feat(agenda): CAL.3 selección automática del día actual al entrar al Calendario · 2026-07-10

Cierra CAL.3 (`docs/BOARD.md`, sección Calendario). Antes, entrar a Calendario nunca mostraba nada del día de hoy hasta que el usuario tocaba la fecha manualmente, aunque tuviera compromisos vencidos ese mismo día; además, los días sin registros no respondían al click en absoluto (`aria-disabled`, sin `data-action`), así que si el usuario tocaba un día vacío por curiosidad, la app simplemente no hacía nada, sin explicar por qué.

**Qué cambió:** en `modules/dominio/agenda/view.js`, `marcarEntradaSeccion()` (nueva, exportada) arma un flag de un solo uso que el siguiente `renderAgenda()` consume: si el mes visible es el real y hoy tiene compromisos/ingresos y no hay ningún día ya seleccionado, auto-selecciona el día de hoy. El flag NO se arma en `renderAgenda()` mismo (evita que un render disparado por cambio de datos o navegación de meses/días fuerce la selección); solo `modules/dominio/agenda/index.js` la llama, y únicamente en el listener de `hashchange` cuando el usuario llega a `#agenda` desde otra sección. **Decisión deliberada, no un descuido:** la carga directa de la app en `#agenda` (recarga de página, deep-link) no arma el flag. La razón es concreta: varios tests E2E ya existentes cargan `page.goto('/#agenda')` con un `diaPago` fijo (15, 20...) y después hacen click explícito en ese mismo día para abrir el detalle; si el auto-select se armara también en esa carga directa, el día quedaría ya seleccionado, y el click del test lo CERRARÍA por el toggle existente de `mostrarDia()`, un bug intermitente que solo se manifiesta cuando la fecha real de ejecución coincide con el `diaPago` del fixture. Separar "navegar hacia la sección" de "cargar directo en ella" resuelve el problema de raíz sin tocar ningún test existente.

En `_renderGrid()`: se elimina la regla "solo días con eventos son interactivos" (antes los días vacíos llevaban `aria-disabled="true" tabindex="-1"` sin `data-action`); ahora todos los días del grid llevan `data-action="agenda-mostrar-dia"`. En `_renderDetalleDia()`: cuando el día seleccionado no tiene eventos (a propósito, o porque se eliminó el compromiso desde otra sección), en vez de que `renderAgenda()` anule la selección en silencio (comportamiento anterior), se muestra el mismo encabezado con "Sin compromisos ni ingresos este día", sin total ni lista. Se elimina `.cal-day--inactive` de `styles/components/config.css` (CSS muerto: comunicaba "no clickeable", ya no aplica).

**Archivos tocados:** `modules/dominio/agenda/view.js`, `modules/dominio/agenda/index.js`, `styles/components/config.css`, `tests/unit/agenda.test.js` (8 tests nuevos), `tests/e2e/smoke.test.js` (3 tests nuevos), `docs/contexto/calendario.md`.

**Verificación:** 2307/2307 unit verdes (8 nuevos: auto-select con/sin `marcarEntradaSeccion()`, no pisa selección manual previa, se consume una sola vez, día vacío clickeable, mensaje de estado vacío, toggle intacto en día vacío). 162/162 E2E verdes (3 nuevos, incluido uno que navega de verdad vía `.nav-item[href="#agenda"]` con un `diaPago` calculado en el navegador con `new Date().getDate()`, válido sin importar qué día se ejecute la suite; y uno que confirma que `page.goto('/#agenda')` directo NO auto-abre nada). Lint verde. **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en tareas anteriores de esta sesión); la verificación se apoyó en la suite E2E real contra Chromium headless en lugar de una captura manual.

**Podría afectar:** cualquier otro E2E que navegue a Calendario en dos pasos (otra sección → click en nav a `#agenda`) con un fixture cuyo `diaPago` sea igual al día real de ejecución podría empezar a ver el detalle ya abierto antes de su propio click; ninguno de los E2E existentes lo hace así hoy (todos usan `page.goto('/#agenda')` directo), así que no hay impacto actual.

---

### feat(compromisos): D.14 registrar una deuda acredita la cuenta donde se recibió el dinero · 2026-07-10

Cierra D.14, primera rebanada ya triada de la iniciativa "Deudas v2: de registro a asesor" (`docs/BOARD.md`). Hoy registrar una deuda no tiene ningún efecto sobre las cuentas del usuario: si el préstamo entregó dinero real (un giro, un préstamo personal), el usuario tenía que ir aparte a Mis cuentas y editar el saldo a mano, con el riesgo de olvidarlo o de duplicarlo si además registraba un ingreso puntual. El espejo exacto de este problema ya estaba resuelto para ingresos (NAV.A1, ingreso puntual): reutilizar ese mismo patrón para deudas.

**Qué cambió:** en `modules/dominio/compromisos/views/formularios.js`, `renderFormDeuda()` agrega, solo en modo creación (nunca al editar) y solo si hay al menos una cuenta activa, un checkbox opcional "Recibí este dinero en una de mis cuentas" (apagado por defecto) que revela el selector de cuenta ya existente (`renderSelectorCuenta()` de `infra/cuenta-helper.js`, el mismo componente del ingreso puntual). En `modules/dominio/compromisos/index.js`: `_wireToggleOrigen()` conecta el checkbox al selector (espejo de `_wireToggleFiado`, D.13); `_ajustarSaldoCuenta()` (nuevo, espejo del helper de `tesoreria/acciones/ingresos.js`) suma el `saldoTotal` de la deuda a la cuenta elegida al guardar; `_guardarCompromiso()` guarda `cuentaOrigenId` y `montoAcreditado` (copia inmutable del monto acreditado en ese momento) en el compromiso; `_eliminarCompromiso()` revierte ese crédito exacto usando `montoAcreditado`, no `saldoTotal` actual (que puede haber bajado por abonos posteriores, que ya mueven su propia cuenta de origen por separado: usar `saldoTotal` habría revertido de menos). En `modules/core/state.js` se documentan los dos campos nuevos en el typedef `Compromiso`, opcionales y `undefined`-safe para registros existentes: **sin bump de `SCHEMA_VERSION`**, no hace falta backfill porque ningún código asume que siempre existen.

**Archivos tocados:** `modules/dominio/compromisos/views/formularios.js`, `modules/dominio/compromisos/index.js`, `modules/core/state.js`, `tests/unit/compromisos.test.js` (4 tests nuevos), `docs/contexto/deudas.md` (ficha nueva, primera de esta sección).

**Verificación:** 2299/2299 unit verdes (4 nuevos sobre `renderFormDeuda()`: bloque ausente sin cuentas activas, checkbox apagado + selector oculto por defecto con cuentas, ausente en modo edición, cuentas inactivas no cuentan). Lint verde. **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en IV.3 y sesiones anteriores); verificado por trazado de código contra el patrón ya probado y en producción de NAV.A1 (ingreso puntual), en vez de captura en Chromium real.

**Podría afectar:** ninguna otra sección lee `cuentaOrigenId`/`montoAcreditado` todavía (no hay UI que los muestre); el efecto observable es solo el saldo de la cuenta elegida al crear/eliminar una deuda con acreditación.

---

### fix(analisis): IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031) · 2026-07-10

Cierra IV.3 (números y estados). Al retomar el criterio D5 del ADR 031 ("dirección con signo, egresos neutros, estados con icono"), se encontró que la card "Vs mes anterior" de Análisis (`_renderComparacionCategorias()`, G.2) seguía sin corregir: usaba `--fk-danger`/`--fk-danger-text` para el delta total, el fondo de fila (`.comparacion__row--sube`) y la columna de dirección (`.comparacion__dir`) cuando el gasto de una categoría o el total subían. Es exactamente la violación que el ADR 019/AUD.4 prohíbe ("gastar no es incumplir": las variaciones al alza van en neutro, nunca en rojo) y que el resumen semanal (F8, `resumen-card__trend--sube`) y `_renderTendencia()` (misma sección Análisis, comentario explícito en el código) ya habían corregido; esta card en particular se quedó fuera de esas pasadas anteriores.

**Qué cambió:** en `styles/components/analysis.css`, `.comparacion__delta--sube` pasa de `--fk-danger-text` a `--fk-text-primary` (neutro); se elimina la regla de fondo `.comparacion__row--sube` (queda sin tinte, solo `--baja` conserva el fondo de éxito); se elimina la regla `.comparacion__row--sube .comparacion__dir` (cae al color por defecto, que hereda `--fk-text-primary` del `body` por cascada, verificado contra `styles/base.css`). Solo "bajar" el gasto sigue reforzándose en verde (`--fk-success`/`-text`). Los highlights ámbar (`.comparacion__highlight--alerta`, "empezaste a gastar en X") no se tocaron: no son rojo y funcionan como aviso informativo, coherente con el resto de la app.

**Archivos tocados:** `styles/components/analysis.css` (3 reglas de color), `docs/contexto/analisis.md` (ficha actualizada con el hallazgo).

**Verificación:** 2295/2295 unit verdes (CSS puro, sin lógica nueva que testear). **El preview local de este entorno no cargó** (limitación de infraestructura ya documentada en sesiones anteriores); la verificación se hizo por trazado manual de la cascada CSS contra el código fuente en vez de captura en Chromium real, diferencia explícita respecto al método habitual de IV.1/IV.2.

**Podría afectar:** nada funcional (CSS puro; sin cambios de datos, JS ni EventBus).

---

### docs(adr): DV.1 ADR 033 Dirección Visual premium escrito (Propuesta) · 2026-07-10

Cierra DV.1 (8.º lote de triaje, pedido directo de Esteban): el entregable era el ADR, cero código tocado. [ADR 033](DECISIONS/033-direccion-visual-premium.md) escrito en estado **Propuesta**, con 5 preguntas (P1-P5, todas con recomendación) esperando la validación de Esteban. Construye SOBRE el ADR 031 sin revertirlo y ratifica los ADR 023/025/026/027.

**Hallazgos del análisis del código que fundan las decisiones:**

- Las cards reposan planas de verdad (`.card`, `.bento__cell`, `.list-item`: borde 1px sin sombra); los tokens `--fk-shadow-*` existen pero solo se usan en hover, dropdowns, modales y toasts. En tema oscuro la profundidad ya la dan los escalones de fondo (base → surface → elevated): la sombra en reposo rinde sobre todo en tema claro, y el ADR lo dice explícitamente para no perseguir en oscuro un efecto que la física del color no da.
- No existe ningún token de degradado: toda la riqueza de color vive en tintes planos al 6-12%.
- El catálogo de animaciones existe de facto (14 keyframes + `countUp`) pero sin doctrina, y contiene 2 bucles infinitos ambientales (`empty-orbit`/`empty-float` en empty states) que el propio brief veta.
- `--fk-section-accent` (IV.2b) ya probó el mecanismo de parametrización por dominio: los degradados y la decoración se montan encima sin JS nuevo.

**Decisiones (resumen):** D1 elevación en escala semántica de 4 niveles (lienzo/reposo/realce/flotante), cards con sombra en reposo y doble capa en claro; D2 el color secundario por dominio es rampa derivada del mismo matiz (no un 2.º hue: respeta el techo de ~8 identidades del ADR 031), materializada en `--fk-section-color` + `--fk-grad-identity` (máx 2 paradas, texto medido contra la parada fuerte); D3 riqueza con presupuesto: formas orgánicas `d-*` neutras compartidas teñidas por `currentColor` (máx 1 por pantalla, opacidad 4-8%), un patrón de puntos CSS tokenizado y las ilustraciones `il-*` como clase nueva de asset del pipeline ADR 026 (Esteban diseña, drafts de Claude como plantillas); D4 catálogo de movimiento CERRADO (150-250 ms micro, una sola vez, solo transform/opacity, retiro de los bucles infinitos, celebraciones siguen en LG.2 y el cambio de tema en CFG.7); D5 la tensión "familia de iconos por sección" se resuelve RATIFICANDO el lenguaje único del ADR 023 (la familia por sección ya existe como metáfora + color; IV.4 sigue siendo el vehículo de redibujos dirigidos); D6 guardarraíles duros por rebanada (ambos temas, AA con cálculo real método IV.1, Lighthouse 100, `pnpm perf` sin regresión, lista prohibida y tabla de presupuesto por regla).

**Archivos tocados:** `docs/DECISIONS/033-direccion-visual-premium.md` (nuevo), `docs/BOARD.md` (DV.1 borrada; iniciativa actualizada; rebanadas DV.2a a DV.2d creadas, ninguna se inicia sin validación), `docs/HANDOFF.md`, `docs/contexto/transversal.md` (bloque de identidad visual apunta al ADR 033).

**Qué sigue:** Esteban valida P1-P5; con el ADR Aceptado arranca DV.2a (tokens de superficie/elevación). Mientras tanto la tarjeta natural es IV.3 (números y estados), independiente de esta iniciativa. **Podría afectar:** nada (solo documentación).

---

### chore(lint): 3 errores no-undef corregidos, lint verde de nuevo · 2026-07-10

Pasada de verificación post-IV.2: `pnpm run lint` fallaba con 3 errores `no-undef` que los cierres anteriores no detectaron (el gate de commit corría tests, no lint). Uno era de IV.2c (`getComputedStyle` sin `window.` en el E2E actualizado de `smoke.test.js`, corregido con el prefijo, convención del propio archivo); dos eran **preexistentes**: `IntersectionObserver` en `movimientos/view.js` (desde PERF.1, 2026-07-06) y `DOMException` en `storage.test.js` (desde PERF.4). La config usa lista blanca explícita de globals (no `env: browser`), así que ambos se agregaron a `eslint.config.js` siguiendo el patrón del archivo. Verificado: lint exit 0, 2295/2295 unit + 159/159 E2E verdes. Sin cambios de comportamiento (el código ya funcionaba; solo el linter no conocía esos globals).

---

### feat(ui): IV.2c Calendario + Inicio, cierra IV.2 completa (ADR 031) · 2026-07-10

Última rebanada de IV.2 (identidad de color por sección). Cierra la iniciativa completa (IV.1, IV.2a-d).

**Calendario:**

- **"fijo" pasa del amarillo prestado de Presupuesto al índigo propio de Calendario** (`--fk-dom-agenda`) en `.cal-dot--fijo`, `.cal-detail__item--fijo`, `.cal-detail__icon--fijo` y `.vencidos-card__icon--fijo` (Inicio, ver abajo). Resuelve la ambigüedad "amarillo = ¿fijo o límite?" (hallazgo 3 del ADR 031) y, al aplicar el mismo cambio en las 4 superficies donde aparece "fijo", evita que Calendario e Inicio queden con dos colores distintos para el mismo concepto.
- **Las tarjetas de evento del detalle del día abandonan la franja lateral de 3px (AG.7) y pasan a fondo teñido** (`background: color-mix(in srgb, var(--fk-dom-X) 8%, var(--fk-bg-elevated))`), pedido explícito de Esteban ("la línea comunica poco"). El texto de la tarjeta es neutro (no del color del dominio), así que el 8% no colisiona con el hallazgo de IV.2a sobre texto coloreado (ese exige ~6%; aquí no aplica).
- Todos los `color:` de glifo en `.cal-dot--*`/`.cal-detail__icon--*` migraron a `-text` (mismo criterio de IV.2d).

**Inicio:**

- "Pendientes del mes" y "Próximas prioridades" ganan una **etiqueta de tipo** (`.dom-badge`, dos variantes nuevas `--agenda`/`--ahorro`) junto al icono+color de sección ya existentes, cumpliendo la regla "el color nunca viaja solo" (D1 del ADR).
- **Bug real corregido de paso**: un apartado en "Próximas prioridades" pedía prestado el dot de tipo `fijo` (heredaba su color, antes amber/presupuesto, ahora habría heredado índigo/agenda) en vez de tener identidad propia. Nuevo `.cal-dot--apartado` (familia menta de Ahorro, ADR 031 P4).

**Archivos tocados:** `styles/components/config.css` (`.cal-dot--*`, `.cal-detail__item--*`, `.cal-detail__icon--*`), `styles/components/domain.css` (`.vencidos-card__icon--*`), `styles/components/nudges.css` (`.dom-badge--agenda`/`--ahorro` nuevas), `modules/dominio/agenda/view.js` (comentario actualizado), `modules/dominio/compromisos/views/dashboard.js` (`_tipoBadge()`, fix del dot de apartado), `tests/e2e/smoke.test.js` (test de franja actualizado a fondo teñido), `service-worker.js` (v343 → v344).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (1 test E2E actualizado: verificaba `borderLeftColor`, ahora verifica `backgroundColor` contra el mecanismo nuevo). Verificado con datos reales en Chromium: en tema oscuro, "Gasto fijo" resuelve `#7d8cf0` (agenda), "Apartado" resuelve `#38c98c` (ahorro); en tema claro, los mismos badges resuelven sus `-text` correspondientes (`#4f64eb`, `#238059`). **Lección de verificación documentada en `contexto/transversal.md`**: alternar `body.classList` para probar tema claro en caliente puede devolver un `color-mix()` stale (oklab de tema oscuro) incluso leyendo la variable CSS correcta; cargar la página con `localStorage.fk_theme='light'` ya puesto es el método confiable.

**Podría afectar:** nada funcional (CSS + `data-*` + un mapeo local de labels; sin cambios de datos ni de EventBus).

---

### fix(ui): IV.2d migración de -text + cierre de la franja de modales (ADR 031) · 2026-07-10

Tercera rebanada de IV.2 (identidad de color por sección). Corrige el hueco de contraste que IV.1 había detectado y documentado como pendiente: usos de `color: var(--fk-dom-X)` (token crudo) que fallan WCAG AA en tema claro, fuera de las superficies que ya tocó IV.2a. **Además cierra la mitad de IV.2b** ("franja de modales"): se encontró ya implementada, sin commitear, en el working tree (WIP de una sesión anterior); se verificó en el navegador (Chromium real, ambos temas) y se cierra en este mismo movimiento en vez de dejarla suelta.

**Franja de modales (mitad de IV.2b, verificada y cerrada):** los 15 modales de registro con dominio propio (`#modal-gasto`, `#modal-compromiso`, `#modal-abono`...) llevan `data-dom="X"` + una franja superior de 3px en `--fk-dom-X` (crudo: es un acento decorativo, WCAG 1.4.11 exime este caso, no lleva texto). Los modales sin dominio (import, legal, registrar, más, personalizar accesos, instalar iOS, onboarding) quedan correctamente sin franja. Verificado con `getComputedStyle`: `#modal-gasto` resuelve `rgb(255,138,92)` (`--fk-dom-gastos`) y `#modal-inversion` `rgb(47,210,191)` (`--fk-dom-inversion`), ambos exactos en los dos temas. **Queda pendiente de IV.2b:** barras/anillos de progreso (`.progress-bar`/`.progress-ring-wrap` en `atoms.css`) siguen en colores genéricos, sin tinte de dominio.

**Qué cambió:**

- **Análisis:** iconos y textos de los héroes de Fondo e Inversión pasan a `-text` (`.fondo-hero__icon`, `.fondo-hero__sub--ok`, `.fondo-hero__banner`, `.ahorro-habito__compromiso strong`, `.inversion-hero__icon`, `.inversion-hero__tipo-pct`, `.inversion-item__tipo`). `.inversion-hero__tipo-pct` era el caso que IV.1 midió explícitamente en 1.89:1 sobre blanco.
- **Modal Registrar:** los iconos de los tiles `gasto`/`abono`/`aporte` pasan a `-text` (`ingreso` ya usaba el semántico `--fk-success`, sin cambio).
- **Nudges:** `.nudge-high .nudge__title` pasa a `-text` (usaba `--fk-dom-gastos` crudo como color de texto, aunque el resto de niveles de nudge ya usaban tokens `-text` semánticos). Los tokens `--fk-nudge-high-accent/-bg/-border` (border/acento, no texto) se dejaron intactos a propósito.
- **`.dom-badge--*`** (chip reutilizable "Gastos", "Deudas"...): color a `-text` **y** fondo bajado de 12% a 6%, porque lleva texto real directamente sobre el tinte (mismo hallazgo de IV.2a: 12%+`-text` cae a 4.22-4.46:1 en tema claro; 6% mide 4.54:1 en el peor caso).

**Fuera de alcance a propósito:** `.cal-dot--*`/`.cal-detail__icon--*` (Calendario), `.vencidos-card__icon--*` y `.prioridades-card__dot` (Inicio) tienen el mismo patrón de token crudo sin migrar, pero viven en el alcance de **IV.2c** (calendario/inicio), que probablemente rediseñe ese markup (teja + etiqueta de tipo); migrarlos ahora sería trabajo duplicado.

**Archivos tocados:** `styles/components/analysis.css`, `styles/modals.css` (`-text` + franja de modales ya presente), `index.html` (`data-dom` en modales, ya presente), `styles/components/nudges.css`, `docs/DESIGN_SYSTEM.md` (documenta la distinción 6%/12% según texto vs. glifo).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: CSS puro, sin cambios de markup/JS). Verificado con `getComputedStyle` en Chromium real en tema claro: `.dom-badge--gastos` resuelve `color: rgb(209,59,0)` (`#d13b00` = `--fk-dom-gastos-text` exacto) sobre fondo al 6%; `.inversion-hero__tipo-pct` resuelve `rgb(28,127,116)` (`#1c7f74` = `--fk-dom-inversion-text` exacto); franja de `#modal-gasto`/`#modal-inversion` exacta en ambos temas. Ficha actualizada en [`contexto/transversal.md`](contexto/transversal.md).

**Qué queda de IV.2:** IV.2c (calendario/inicio).

**Podría afectar:** nada funcional (solo color computado en tema claro; tema oscuro sin cambio visual porque `-text` es alias directo del token crudo ahí).

---

### feat(ui): IV.2b barras/anillos de progreso por dominio + franja de modales (ADR 031) · 2026-07-10

Cierra IV.2b completa (el resto del objetivo de IV.2d, mismo día). Extiende `.progress-bar`/`.progress-ring-wrap` (única fuente de progreso lineal/circular de la app) para que su **estado por defecto** ("aún en progreso", sin completar ni cerca) se tiña con el color de la sección, en vez del verde genérico de marca.

**Mecanismo:** una variable compartida `--fk-section-accent`, definida por los mismos bloques `[data-dom="X"]` que ya usaba la franja de modales (`styles/modals.css`), leída por `.progress-bar`/`.progress-ring-wrap` con fallback al acento de marca (`var(--fk-section-accent, var(--fk-accent))`). Los modificadores semánticos (`--near`, `--complete`, `--warn`, `--danger`) NO se tocaron: siguen mandando por especificidad/orden, así que "cerca de la meta" y "completado" se siguen viendo iguales (verde) sin importar la sección, por diseño (D1 del ADR: la capa semántica nunca se mezcla con la identidad).

**Dónde se aplicó `data-dom` (mapeo sin ambigüedad):** anillo de Metas (`metas/view.js`) → `metas`; anillo de Apartados (`apartados/view.js`) y del fondo de emergencia (`ahorro/view.js`) → `ahorro` (comparten familia, ADR 031 P4); barra de Me deben, cobro y pago (`personales/view.js`, 2 lugares) → `personales`; factores Deuda/Liquidez/Ahorro del score de salud en Análisis (`analisis/view.js`) → `compromisos`/`tesoreria`/`ahorro` respectivamente (son composición multi-dominio, D3 punto 4 del ADR: "los gráficos multi-dominio de Análisis ya usan el color de cada dominio").

**Fuera de alcance, con justificación:**

- **Presupuesto/Límites** (`_renderGrupoCard`, grupos Necesidades/Ahorro/Estilo de vida): ya tiene un esquema de color deliberado por **ADR 019** (Necesidades = siempre neutro, nunca alarma; Ahorro = celebra en verde; Estilo de vida = alerta ámbar/rojo). Teñir la barra base con el ámbar de "Límites" habría roto la neutralidad a propósito de Necesidades. Se dejó intacta (sin `data-dom`, sigue en `--fk-accent`); queda como decisión pendiente, coincide con la revisión que **LIM.1** ya tiene planteada para esta sección.
- **Factor "Control"** del score de Análisis: mide volatilidad del gasto (coeficiente de variación), no un dominio limpio de la app (no es "Límites"); se dejó sin teñir en vez de adivinar mal.

**Hallazgo real corregido antes de cerrar (mismo método WCAG de IV.1/IV.2a):** la primera versión usaba el token crudo `--fk-dom-X` (igual que la franja de modales, que es decorativa). Pero el relleno de una barra/anillo de progreso **es la información**, no un acento: aplica el umbral no textual completo de WCAG 1.4.11 (3:1), y el crudo lo fallaba en tema claro para varios dominios medidos contra el fondo del track (ahorro 1.88:1, personales 2.39:1, tesorería 2.65:1, muy por debajo de 3:1). Se cambió `--fk-section-accent` a usar `-text` en vez del token crudo (afecta también la franja de modales: sin cambio en tema oscuro, más nítida en tema claro). Verificado: 4.28-4.38:1 en tema claro para los 5 dominios tocados, encima del umbral. En tema oscuro `-text` es idéntico al crudo, cero cambio visual.

**De paso se corrigió un bug preexistente en la franja de modales de IV.2b (WIP de sesión anterior):** faltaba el mapeo `[data-dom="metas"]`, así que los modales de Metas (`modal-meta`, `modal-abono-meta`) no mostraban franja (caían al verde genérico). Corregido en el mismo movimiento.

**Archivos tocados:** `styles/modals.css` (variable `--fk-section-accent` + mapeo `-text` + fix de metas), `styles/components/atoms.css` (`.progress-bar`, `.progress-ring-wrap`), `modules/dominio/metas/view.js`, `modules/dominio/apartados/view.js`, `modules/dominio/ahorro/view.js`, `modules/dominio/personales/view.js` (2 lugares), `modules/dominio/analisis/view.js` (3 factores), `service-worker.js` (v342 → v343).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: CSS + atributos estáticos, sin lógica nueva). Verificado con `getComputedStyle` en Chromium real: colores exactos por dominio en ambos temas, estados `--near`/`--complete` sin cambio, Presupuesto sin `data-dom` cae correctamente al acento de marca (sin regresión). Ficha actualizada en [`contexto/transversal.md`](contexto/transversal.md).

**Cierra IV.2 salvo IV.2c** (calendario/inicio).

**Podría afectar:** nada funcional (CSS + atributos `data-*`, sin JS de negocio ni cambios de estado).

---

### feat(ui): IV.2a nav + encabezados de sección teñidos por dominio (ADR 031) · 2026-07-09

Primera rebanada de IV.2 (identidad de color por sección). Cierra la parte de la tarjeta con mayor impacto visual inmediato: reconocer la sección activa por su color, sin leer el texto.

**Qué cambió:**

- **Nav (sidebar + bottom-nav):** el item activo se tiñe con el color de SU dominio (`--fk-dom-X`), no con el acento genérico de marca. Inicio y Ajustes quedan monocromos (no son dominios financieros, ADR 025 D6).
- **Pestañas del hub Ahorros** (Fondo/Metas/Apartados/Inversión): la pestaña activa se tiñe igual, con el mismo mecanismo.
- **Encabezados de sección:** los 11 dominios ganaron una teja (icono + acento del dominio) junto al `<h1>`, reusando el componente `.cat-teja` que ya existía para categorías (ID.3/ADR 025 D3).
- **Mecanismo:** un mapeo único `[data-section="X"] { --fk-nav-bg; --fk-nav-text }` en `styles/layout.css`, consumido por `.nav-item.active` y `.hub-tabs__tab[aria-current]`. Apartados comparte la familia menta de Ahorro (`--fk-dom-ahorro`, decisión ya tomada en ADR 031 P4, no una omisión). Cero JS nuevo: `shell.js` sigue siendo el único que asigna `.active`/`aria-current`.

**Hallazgo real durante la implementación, corregido antes de cerrar (mismo método de IV.1: fórmula WCAG real, no inspección visual):**

- El tinte de fondo estándar del sistema (`--fk-dom-X-bg`, 12%) usado detrás de texto en `-text` cae a **4.22-4.46:1** en tema claro para varios dominios (compromisos, agenda, tesoreria, metas, analisis...), por debajo del umbral AA de texto (4.5:1, WCAG 1.4.3). Se ajustó a **6%** específicamente donde el contenido sobre el tinte es texto real (nav activo); el peor caso mide 4.54:1. Se documentó la distinción para IV.2c (que necesita decidir la opacidad de las tarjetas de evento del calendario): texto encima del tinte → umbral 4.5:1 y ~6-8%; glifo/icono decorativo → umbral 3:1 (WCAG 1.4.11) y 12-14% sobra.
- **Bug preexistente encontrado y corregido de paso** (no introducido hoy; era exactamente el hueco que IV.1 ya había señalado como pendiente para IV.2): `.cat-teja` (usado en categorías de gastos, listas, etc. en toda la app) y `.menu-mas__item .icon` (menú "Más") usaban el token crudo `--fk-dom-X` como color del glifo en vez de `-text`. Verificado: caía a ~1.9-2.5:1 en tema claro, muy por debajo incluso del umbral gráfico de 3:1. Corregido en ambos archivos (`atoms.css`, `modals.css`); en tema oscuro `-text` es idéntico a `-dom` (alias directo en `tokens.css`), cero cambio visual ahí.

**Archivos tocados:** `styles/layout.css` (mapeo + reglas de nav/hub-tabs), `styles/components/atoms.css` (`.cat-teja` corregido + modificador `.section__icon`), `styles/modals.css` (`.menu-mas__item .icon` corregido), `index.html` (11 encabezados con teja + `data-section` en las 4 copias de `.hub-tabs`).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (sin tests nuevos: cambio de CSS/markup puro sobre mecanismo ya cubierto por los tests existentes de render y E2E de navegación). Verificado visualmente en Chromium real: ambos temas, 320/375/1280px, computado de `background-color`/`color` inspeccionado por sección (frambuesa `#ea5385` en Deudas, menta `#38c98c` en Ahorro/Apartados, púrpura en Metas, pizarra en Análisis, todos exactos). Ficha nueva "Identidad de color por sección" en [`contexto/transversal.md`](contexto/transversal.md) (primer análisis a fondo de esta funcionalidad, regla 2.6).

**Qué queda de IV.2:** IV.2b (progreso/modales), IV.2c (calendario/inicio, con la nota de opacidad ya resuelta arriba) e IV.2d (auditoría general de `-text`: quedan `.inversion-hero__tipo-pct` y `.dom-badge--*` sin migrar).

**Podría afectar:** nada funcional (CSS + atributos `data-*` existentes; ningún dominio ni EventBus tocado).

---

### docs(triaje): 8.º lote (Nueva dirección de diseño premium) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-09

Brief de dirección visual de Esteban + 2 imágenes de referencia (explícitamente inspiración de tono, no para copiar: identidad propia). Resultado en [`BOARD.md`](BOARD.md):

- **Decisión de triaje central: NO se abre una iniciativa paralela.** El brief evoluciona la iniciativa de identidad visual existente ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md) + tarjetas IV.*) a "Dirección Visual premium". Una sola fuente de verdad; cero tarjetas duplicadas.
- **Lo que el brief pide y YA existe o está decidido:** color con significado y distinto por sección (ADR 031, IV.1 cerrada con contraste WCAG verificado; los emojis del brief son ilustrativos, mandan los tokens); identificar la sección sin leer (es IV.2, que **sigue siendo la tarjeta recomendada para iniciar y NO espera al ADR nuevo**); iconografía protagonista con logos oficiales intactos (ADR 023 v2, 025, 026, 027, todos vigentes); diseño emocional al completar acciones (vive en LG.2/ADR 032 y el catálogo de celebraciones existente).
- **Lo genuinamente nuevo → tarjeta DV.1** (el ADR de la dirección): sistema de superficie/elevación (cards con profundidad ligera, sombras sutiles en 2-3 niveles, aire), color secundario por dominio (extensión del ADR 031), riqueza visual (degradados tokenizados, formas orgánicas SVG estáticas, patrones discretos, ilustraciones como clase nueva de asset del pipeline ADR 026), catálogo de animaciones con propósito (150-250 ms, `prefers-reduced-motion`, coordinado con LG.2 y CFG.7).
- **Tensión señalada para resolución formal en el ADR:** "una familia de iconos propia por sección" contradice el lenguaje único del ADR 023 (decisión de Esteban tras el rechazo del lenguaje genérico v1). Recomendación preliminar registrada: un solo lenguaje Finko Icons con acento de color y detalles por dominio, no 13 familias. Se decide en DV.1, no en silencio.
- **Guardarraíles duros registrados en la tarjeta** (del propio brief + ADN): la apariencia nunca afecta la velocidad (Lighthouse 100 y `pnpm perf` sin regresión como criterio de cierre de cada rebanada), WCAG AA verificado con cálculo real (método de IV.1), ambos temas (las referencias son claras, Finko es oscuro por defecto), prohibidos backdrop-filter/blurs/transparencias costosas/animaciones permanentes. Nota: PERF.8 ya tiene pendiente borrar el único `backdrop-filter` muerto del CSS.
- **Anti-doble-trabajo:** DV define el sistema transversal (tokens + componentes base); la jerarquía y la "riqueza" pantalla por pantalla se ejecutan en las iniciativas v2 ya registradas (Inicio v2/IN.8, ANL.1, Deudas v2, Mis Cuentas v2, GU.1...), que consumen el sistema. Las ilustraciones/formas definitivas son cola de diseño de Esteban en Illustrator (ADR 026), no bloquean el ADR.

Cero código tocado.

---

### feat(logros): LG.2b fundación de progresión de logros (ADR 032 Aceptada) · 2026-07-09

Esteban validó el [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) (catálogo D4 aprobado como está; nombres de niveles de usuario provisionales hasta que entregue los definitivos; reubicación en dos tiempos D6 aprobada) y la primera rebanada de implementación cerró el mismo día.

**Archivos tocados:**

- `modules/dominio/logros/logic.js`: campos `familia`/`nivel` en el catálogo (primer-gasto = registro N1, diez-gastos = registro N2, meta-lograda = metas N1; ids intactos, `S.logros` sigue siendo `string[]`, cero migración); `FAMILIAS` (metadata de nombre por familia); `agruparVitrina()` (puro: los singles pasan tal cual y cada familia colapsa a una entrada con el nivel más alto ganado, el siguiente pendiente como objetivo, y conteos); `NIVELES_USUARIO` + `nivelUsuario()` (nivel derivado del conteo de logros, umbrales del ADR 032 D5: 0/3/6/10/14/18; nombres provisionales en la constante, cambiarlos no toca datos).
- `modules/dominio/logros/view.js`: encabezado con "Tu nivel: X" + render agrupado (`_renderFamiliaItem`: emoji del nivel más alto ganado, chip "Nivel X de Y", desc del nivel actual o hint del nivel 1, línea "Siguiente: ..." y barra de progreso del nivel pendiente si la expone). Cero CSS nuevo: reutiliza `.logro-item`, `.chip`, `.progress`.
- `service-worker.js`: `CACHE_NAME` v341 → v342.
- Tests: `tests/unit/logros.test.js` +17 (integridad familia/nivel consecutivos desde 1, `agruparVitrina` con todos los estados de familia, umbrales de `nivelUsuario` en los bordes, render agrupado con chip y objetivo); `tests/e2e/smoke.test.js` +1 (suite "Vitrina de logros (niveles)": nivel visible y familia colapsada sin listar sus niveles sueltos).

**Verificación:** 2295/2295 unit + 159/159 E2E verdes (la vitrina se verifica con render real en happy-dom + Chromium E2E; el preview local de este entorno no es confiable). **Cómo verlo en la app:** Ajustes → card "🏆 Logros": encabezado con "Tu nivel:", la familia "Constancia de registro" como una sola tarjeta con chip de nivel y objetivo siguiente.

**Qué sigue de la iniciativa:** LG.2c (mes completo de registro + rachas + familia deudas), LG.2d (mudanza a Análisis+Inicio, bloqueada por ANL.1/IN.8), LG.2e (comportamiento). **Podría afectar:** solo la vitrina de Ajustes y el toast (sin cambios de datos); los usuarios con logros existentes ven su progreso intacto agrupado por familia.

---

### docs(adr): LG.2a ADR 032 Logros v2, niveles progresivos y regla anti-gaming (Propuesta) · 2026-07-09

Primera fase de la iniciativa LG.2 (4.º lote de triaje). [ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) escrito en estado **Propuesta**: revisión formal del ADR 022, como exige la iniciativa (no mover la vitrina en silencio). Cero código tocado; el catálogo y los nombres se validan con Esteban antes de codificar.

**Decisiones de diseño del ADR:**

- **D1, progresión sin bump de schema:** cada nivel de un "logro con niveles" es un logro independiente con id propio dentro de una familia (`familia` + `nivel` en el catálogo); `S.logros` sigue siendo `string[]` y los ids existentes se reutilizan como primeros niveles (`primer-gasto` = registro N1, `diez-gastos` = N2, `meta-lograda` = metas N1): cero migración, la regla "no revocación" aplica por nivel sin lógica nueva.
- **D2, regla anti-gaming (principio innegociable):** prohibidos los logros que mejoren al omitir registro ("día sin gastos", "semana bajo X%"); test de gaming obligatorio por PR ("¿se consigue más fácil borrando datos?"); guardia: los logros de reducción de gasto solo evalúan meses completos de registro.
- **D3, "mes completo de registro":** gastos en al menos 3 semanas del mes; un pase O(gastos del mes) memoizado (`infra/memo.js`); las rachas se calculan desde el mes anterior (el corriente nunca rompe una racha).
- **D4, catálogo v2 (a validar):** de 11 a ~20 logros; familias registro (6 niveles), metas (3), deudas saldadas (2, excluye consolidaciones), comportamiento (hormiga-a-raya, ahorro-creciente, pagador-puntual); 8 singles intactos. "Deuda antes de lo previsto" diferido sin tarjeta (necesita snapshot del plan que no se persiste).
- **D5, niveles de usuario derivados:** del conteo de logros, sin puntos/XP ni persistencia nueva; nombres propuestos como ejemplos a validar.
- **D6, reubicación en dos tiempos:** principio aceptado (el lugar final es Análisis + tarjeta en Inicio) pero la mudanza queda como rebanada bloqueada por ANL.1 e IN.8 (no posicionar dos veces); el ADR 022 sigue vigente operativamente hasta entonces.
- **D7, rendimiento:** evaluadores O(1) o memoizados, disciplina del ADR 022 reforzada; emojis conservados (ADR 025 D6).

**Rebanadas especificadas** (se vuelven tarjetas tras la validación): LG.2b fundación de progresión, LG.2c constancia + deudas, LG.2d mudanza (bloqueada), LG.2e comportamiento. **Hechos verificados antes de diseñar:** deudas saldadas dejan rastro pero borrable; no existe derivación canónica de ingreso mensual (ingresos fijos son plan, no registro), por eso `ahorro-creciente` queda bloqueado hasta esa derivación (probable entregable de ANL.1).

**Además:** bloque nuevo "Sistema de logros" en [`contexto/transversal.md`](contexto/transversal.md) (primer análisis a fondo del dominio, regla 2.6: catálogo, evaluación, toast/cola, vitrina, riesgos e invariantes).

**Podría afectar:** nada (solo docs). **Validación pendiente:** los 3 puntos marcados en el estado del ADR.

---

### feat(config): LEG.1 Centro Legal en Ajustes (rebanada de UI) · 2026-07-09

Cierra LEG.1 por completo (la rebanada de borradores ya se había cerrado horas antes, mismo día). Apartado "⚖️ Centro Legal" en Ajustes con los 10 documentos de `docs/legal/`.

**Decisión de mecanismo (pendiente en la tarjeta original, resuelta al implementar):** fetch de los `.md` en tiempo de ejecución (mismo origen, `docs/legal/*.md` sumados a `CORE_ASSETS` del service worker → disponibles offline tras la primera visita, igual que el resto de la app) + conversión con un conversor Markdown propio nuevo, sin dependencias (ADN 1). Se descartó incrustar el contenido como datos JS duplicados: `docs/legal/` sigue siendo la única fuente de verdad de los textos, sin bifurcación.

**Archivos nuevos:**
- `modules/infra/markdown.js`: `mdToHtml()`, conversor puro y sin DOM. Cubre solo el subconjunto que usan estos 10 documentos (encabezados h1/h2, negrita, código en línea, enlaces, listas, tablas, citas `>`, separador `---`); no es un parser CommonMark completo. Escapa HTML antes de aplicar cualquier transformación (sin XSS). Los enlaces a otro `.md` reciben `data-doc-link` para que el visor cambie de documento sin salir del modal; los enlaces `https://` externos abren en pestaña nueva.
- `modules/dominio/config/legal.js`: catálogo `DOCUMENTOS_LEGALES` (10 entradas, sin el README interno) + `cargarDocumentoLegal()` (fetch) + `documentoLegalPorId()`.

**Archivos modificados:**
- `index.html`: modal genérico `#modal-legal` (un solo modal para los 10 documentos, patrón `modal-open`/`data-doc` ya usado en el resto de la app).
- `modules/dominio/config/view.js`: `_renderLegal()`, lista de documentos con `data-action="abrir-legal"`.
- `modules/dominio/config/index.js`: `_mostrarDocumentoLegal()` (fetch + `mdToHtml` + pinta el modal, con estado de carga y mensaje de error si falla) y `_wireLegalLinks()` (delegación de clicks en enlaces internos).
- `styles/components/config.css`: `.legal-lista` (lista de Ajustes) y `.legal-doc` (tipografía del visor: h3/h4, párrafos, listas, citas, tablas con scroll horizontal, código).
- `service-worker.js`: `CACHE_NAME` v340 → v341; `markdown.js`, `config/legal.js` y los 10 `.md` sumados a `CORE_ASSETS`.
- `eslint.config.js`: agregado el global `fetch` (usado por primera vez en el proyecto).

**Tests:** 13 nuevos en `tests/unit/markdown.test.js` (encabezados, párrafos, `---`, negrita, código protegido de negrita, enlaces externos e internos, listas, tabla con fila separadora, escape de HTML, citas). 2 nuevos en `config.test.js` (un botón por documento del catálogo, id y título correctos) + 2 en `documentoLegalPorId()`. 3 E2E nuevos en `smoke.test.js` (lista completa + abrir un documento con contenido real vía fetch, navegar a otro documento por su enlace interno, cerrar el modal). El conversor se validó además contra los 10 `.md` reales con un script ad-hoc (sin errores, tablas y citas correctas). 2282/2282 unit + 158/158 E2E verdes.

**Qué queda de la iniciativa LEG:** sin bloqueo de código. Falta contenido: el checklist de `docs/legal/README.md` (responsable, correo de contacto, decisión de licencia del código) y la revisión por un abogado colombiano antes de pasar de v0.1 a v1.0 (gate del punto 9 del brief). LEG.2 (aceptación obligatoria) queda pendiente de eso, no de UI. LEG.3 (auditoría de avisos en funciones sensibles) ya se había cerrado antes en la misma jornada.

**Podría afectar:** nada del resto de la app (sección nueva, aislada, sin tocar `S` ni EventBus). **Validación pendiente:** contenido en v0.1 con marcadores `[PENDIENTE: ...]` visibles en el modal hasta que Esteban los resuelva.

---

### fix(legal): LEG.3 auditoría de avisos en funciones sensibles y transparencia de recomendaciones · 2026-07-09

Cierra la iniciativa LEG.3 (puntos 7+8 del brief del 7.º lote). Inventario de las funciones sensibles de la app y verificación de que cada una aclara que sus resultados son aproximaciones sobre los datos del usuario, no instrucciones ni garantías:

- **Monitor de renta (Análisis):** ya cumplía. 3 avisos existentes verificados: "Confirma con un contador antes de declarar" (hint principal), "Consulta con un contador" (recomendación fiscal permanente K.2) y el aviso de vigencia de UVT ("toma estos topes como referencia provisional"). Sin cambios.
- **Patrimonio neto (Análisis):** es una foto del presente (activos − pasivos con los datos de hoy), no una proyección. No aplica el mismo aviso; se deja fuera del alcance con esa justificación explícita.
- **Estrategia de pago de deudas (`modules/dominio/compromisos/views/estrategia.js`): hueco cerrado.** La card (Avalancha/Bola de nieve, comparativa, renegociar tasa, consolidar) mostraba cifras concretas de ahorro y plazos sin ningún aviso de que son simulaciones. Se agregó una línea bajo el subtítulo de la card: "Los plazos y ahorros son simulaciones con los datos que registraste; confírmalos con tu entidad antes de decidir." Cubre las 4 herramientas de la card (estrategia base, aumentar cuota, renegociar, consolidar) con un solo aviso, sin repetirlo en cada bloque (criterio del punto 15 del brief de Deudas: pocos avisos).
- **Proyección de inversión (`modules/dominio/inversiones/view.js`, sección "Proyección al vencimiento"): hueco cerrado.** Mostraba valor proyectado, ganancia esperada y rentabilidad real sin aviso. Se agregó: "Proyección estimada con la tasa y el plazo que registraste; no es garantía de rentabilidad, confírmala con tu entidad."

**Verificación:** ambos avisos confirmados en el preview (deuda con 2 compromisos con tasa + inversión CDT de prueba), captura y snapshot de accesibilidad revisados, cero errores de consola. 2265/2265 tests unitarios verdes (sin tests nuevos: cambio de copy puro, sin lógica). El descargo general de responsabilidad vive en LEG.1 (`docs/legal/descargo-de-responsabilidad.md`); esta tarjeta solo cubre los avisos contextuales en el punto de uso.

**Podría afectar:** nada funcional (2 líneas de copy nuevas en vistas existentes, sin cambio de estructura de datos ni de lógica).

---

### docs(legal): LEG.1 rebanada de borradores, paquete legal completo para el modelo local-only en `docs/legal/` · 2026-07-09

Primera rebanada de LEG.1 (la iniciativa LEG entró al BOARD el 2026-07-08, 7.º lote). Se ejecuta la secuencia recomendada en el triaje: redactar YA para el modelo local-only vigente (la app está pública sin base legal), con cláusula de versionado por si CFG.4 cambia el ADN.

**Archivos nuevos (11, todos en `docs/legal/`):**

- `README.md`: índice del paquete, reglas de redacción y versionado (0.x borrador → 1.0 tras revisión jurídica), hechos verificados del producto y **checklist de pendientes que bloquean v1.0**: nombre del responsable, correo de contacto real, decisión de licencia del código (el repo público no tiene LICENSE: hoy rige "todos los derechos reservados") y revisión por abogado colombiano (gate del punto 9 del brief).
- `terminos-y-condiciones.md`: naturaleza del servicio (herramienta gratuita de organización, no entidad financiera), consecuencias aceptadas del modelo local-only (respaldo propio, sin recuperación, un dispositivo), uso aceptable, menores, disponibilidad, re-aceptación versionada.
- `politica-de-privacidad.md`: privacidad por diseño; lo único que viaja es la descarga de la app (datos técnicos del hosting Vercel, sin datos financieros); controles de Ajustes (export/import/borrar).
- `tratamiento-de-datos-personales.md`: posición frente a la Ley 1581 de 2012 (tratamiento de ámbito personal/doméstico, excluido por el artículo 2 literal a; Finko no es responsable del tratamiento porque no recibe datos), principios adoptados por diseño, derechos habeas data con plazos de los artículos 14/15, SIC como autoridad, cláusula CFG.4 completa.
- `aviso-de-cookies.md`: cero cookies de todo tipo (verificado); `localStorage` estrictamente funcional; caché del service worker; cómo borrar.
- `descargo-de-responsabilidad.md`: puntos 3+4 del brief (organización y guía, no asesoría financiera/tributaria/contable/jurídica; aproximaciones sobre datos del usuario; constantes legales con fecha de revisión; sin garantías; limitación de responsabilidad).
- `propiedad-intelectual.md`: titularidad del código/diseño/iconografía/textos; el repo público no otorga licencia implícita; los datos del usuario son del usuario.
- `marcas-de-terceros.md`: punto 5 del brief, complementa los ADR 025 D5/027/029 (uso nominativo de identificación, sin afiliación salvo convenio informado, retiro a solicitud del titular con fallback a iniciales/categoría).
- `licencias-de-terceros.md`: inventario verificado archivo por archivo: fuentes Inter y DM Mono (SIL OFL 1.1, empaquetadas en `assets/fonts/`), glifos Simple Icons (CC0, en el sprite); las devDependencies no se distribuyen; cero librerías en runtime.
- `aviso-legal.md`: identificación del responsable (con marcadores pendientes), infraestructura, marco normativo CO, jurisdicción.
- `historial-de-cambios.md`: registro versionado (primera fila: v0.1 del paquete) + criterio de cambio importante vs menor para la re-aceptación de LEG.2.

**Convenciones:** todos los documentos siguen el ADN 11 (bloque "En pocas palabras" en lenguaje claro + texto formal numerado), tuteo, cero guion largo (verificado con grep). Marcadores `[PENDIENTE: ...]` uniformes para los datos que solo Esteban puede definir.

**Qué queda de la iniciativa LEG:** LEG.1 rebanada de UI (Centro Legal en Ajustes que muestre estos textos, coordinar con CFG.6), LEG.2 (aceptación versionada, sigue bloqueada hasta tener el Centro Legal y textos estables) y LEG.3 (auditoría de avisos contextuales, puede ir en paralelo).

**Podría afectar:** nada en la app (cero código tocado; docs solamente). **Validación pendiente:** los 4 puntos del checklist del README de `docs/legal/`.

---

### docs(triaje): 7.º lote (Centro Legal y cumplimiento) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Séptimo triaje del día: 1 brief de 9 puntos sobre el marco legal. Resultado en [`BOARD.md`](BOARD.md), iniciativa nueva **LEG**:

- **Hueco real verificado:** la app está en producción sin ningún documento legal (cero términos, privacidad o disclaimers formales; solo los avisos puntuales "confirma con un contador" del monitor de renta).
- **LEG.1** (Centro Legal en Ajustes + borradores de todos los documentos: términos, privacidad, Ley 1581/Habeas Data, cookies (aclarando que no se usan), licencias, descargo de responsabilidad con los puntos 3+4 del brief, propiedad intelectual, aviso de marcas de terceros que complementa los ADR 025/027/029, contacto para derechos e historial versionado). **LEG.2** (aceptación obligatoria versionada en onboarding + re-aceptación en cambios importantes, con la limitación honesta documentada: sin servidor, la evidencia vive solo en el dispositivo). **LEG.3** (auditoría de avisos en funciones sensibles: mucho ya existe; completar huecos con el mismo tono, sin llenar la app de texto).
- **Acoplamiento señalado con CFG.4:** el contenido del paquete depende de esa decisión de ADN (local-only = "tus datos no salen de tu dispositivo" como fortaleza; cuentas/sync = paquete completamente distinto). Secuencia recomendada: redactar YA para el modelo vigente, con cláusula de versionado. Nota cruzada en ambas direcciones.
- **Gate final explícito (punto 9):** la revisión del paquete por un abogado colombiano antes del lanzamiento oficial es trabajo profesional externo; las tarjetas producen borradores informados y el inventario de funciones sensibles PARA esa revisión, no la sustituyen (mismo principio que Finko aplica a sus usuarios).
- CFG.6 reserva el bloque del Centro Legal en el layout de Ajustes.

Cero código tocado.

---

### docs(triaje): 6.º lote (brief General) integrado al BOARD, con decisión de ADN señalada (regla 2.7, sin implementar) · 2026-07-08

Sexto triaje del día: 1 brief de 8 puntos, el de mayor alcance. Resultado en [`BOARD.md`](BOARD.md):

- **Punto 2 (cuentas de usuario + sincronización): TOCA EL ADN DE FRENTE** ("Sin servidor. Sin cuenta. Sin sync.", CLAUDE.md reglas 2/3, y la promesa de privacidad del onboarding). Se **fusionó con CFG.4**, que ya anticipaba la tensión, y la tarjeta ahora captura la versión completa del pedido + lo que el ADR debe poner sobre la mesa: redefinición del producto, backend/costos/modelo de amenazas, alternativas intermedias (local-first con cifrado E2E, respaldo a almacenamiento del propio usuario), y PERF.5 (IndexedDB) como precondición práctica (activaría el disparador D4 del ADR 030). **Nada se implementa sin ese ADR y la discusión explícita con Esteban.**
- **Punto 3 (seguridad)** → integrado a **CFG.5**, ampliada con re-autenticación en acciones críticas (restablecer app, eliminar todo, exportar; hoy "Restablecer" solo pide confirmación de texto). La parte usuario/contraseña pertenece a CFG.4; el PIN/patrón local puede ir antes.
- **Puntos 4+5 (guía por navegación + simplificar info inicial)** → iniciativa **GU.1** (fusión interna del lote: son la misma auditoría). Revisa formalmente el **ADR 016** (banner de propósito). Regla anti-doble-trabajo: GU.1 audita el sistema transversal; los rediseños internos viven en las iniciativas v2 de cada sección. Varios ejemplos del brief ya existen o ya están previstos (CTA de cuenta, CAL.1, "Gestionar"→Calendario, fondo→distribución).
- **Puntos 6+7+8 (transferencias entre cuentas)** → **MC.17** nueva: transferencia con actualización automática de ambas cuentas, automatización por conteo (regla 0/1/varias), historial como tipo propio en Movimientos que jamás cuenta como ingreso/gasto (bump de schema), y la decisión GMF/4x1000 para el análisis (las cuentas ya modelan `aplica4x1000`).
- **Punto 1 (actualizaciones)** → **UPD.1** nueva: aviso discreto al detectar versión nueva del SW + novedades mostradas una sola vez (`NOVEDADES_POR_VERSION` local, cero servidor).
- **Hallazgo de archivo:** el [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) (taxonomía transversal, Propuesta desde junio) cubre el territorio de CAT.1: la sesión de taxonomía debe validar ADR 014 + ADR 029 D3 + CAT.1 como UNA decisión. Desambiguado el ID histórico "AP.5" del ADR 014 frente a la tarjeta AP.5 actual.

Cero código tocado.

---

### docs(triaje): 5.º lote (Fondo de emergencia, Límites de gasto) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Quinto triaje del día: 2 briefs. Resultado en [`BOARD.md`](BOARD.md) y [BUGS.md](BUGS.md):

- **Fondo de emergencia:** el punto 1 ("Empty State" literal visible al desactivar y editar el fondo) es un **bug de copy, BUG-012** (viola el ADN 11; incluye pasada de grep por otros literales técnicos en views al corregirlo). El rediseño UX educativo y la integración del aporte al flujo de distribución → iniciativa **"Fondo v2" (AH.5)**; la base ya existía (AH.2 calcula el aporte, ADR 021 recuerda el día de ingreso, MC.13 punto 21 ya contemplaba la cuota del fondo en la distribución). El registro manual de aportes se conserva como vía secundaria para aportes fuera de ciclo, no se elimina.
- **Límites de gasto: FUSIÓN, no tarjeta nueva.** El brief se solapa casi 1:1 con LIM.1 (brief verbatim de Esteban del 2026-07-05): los puntos coincidentes se marcaron como reafirmados y solo los genuinamente nuevos entraron como puntos 7-10 de la tarjeta, que pasa a llamarse **"Límites v2"**: (7) base de cálculo sobre dinero realmente disponible y no solo ingresos fijos (con la advertencia de diseño: un saldo alto no siempre es gastable; conecta con MC.10/MC.11 y el motor de MC.13); (8) fijos no esenciales (streaming, IA) cuentan contra los límites, con la dimensión esencial/no-esencial decidida en CAT.1/ADR 029 D3; (9) hormiga y fantasma sobre suscripciones ("$120.000/mes en streaming, revisa cuáles usas"), alimentando el motor único de sugerencia por categoría (regla TX.10/LIM.1/ANL.1); (10) límites sugeridos y adaptativos. **Nota formal añadida:** sacar Necesidades y Ahorro de la sección revisa parcialmente el ADR 019 (roles por grupo), a decidir en el análisis, no en silencio. El modelo del análisis inicial sube a Opus 4.8 - Alto (la base de cálculo es lógica financiera con riesgo de recomendaciones erróneas).
- Motor de MC.13: el aporte del fondo en la distribución (AH.5) queda explícito como consumidor n.º 7.

Cero código tocado.

---

### docs(triaje): 4.º lote (Ajustes, Análisis, Apartados, Metas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Cuarto triaje del día, el más entrelazado: 4 briefs cruzados contra tablero, ADRs, fichas y los 3 lotes anteriores. Resultado en [`BOARD.md`](BOARD.md):

- **Ajustes:** punto 1 (unificar lo fiscal) confirma la dirección de la iniciativa CFG.1+CFG.2 ya en curso y añade la decisión de ubicación → tarjeta nueva **CFG.2c** (asistente "Completar perfil fiscal" bajo demanda en Ajustes; interpretación consolidada en Análisis). Punto 2 (rediseño visual) → integrado a **CFG.6**. Punto 3 (transición de temas) → **CFG.7 con advertencia técnica**: la transición suave YA existe y fue deliberadamente restringida por lag en móvil (documentado en `themes.css`); la dirección recomendada es View Transitions API como mejora progresiva + verificar primero en el dispositivo real de Esteban (mismo criterio de evidencia del ADR 030).
- **Análisis:** puntos 6-8 (lenguaje cercano, explicar gráficos, reorganización) se **integran a ANL.1**, que ya los registraba casi 1:1 desde el 2026-07-05 (se añaden los ejemplos de copy nuevos: "Estado de tu dinero", "Lo que tienes"/"Lo que debes"). Puntos 1-5 (logros) → iniciativa nueva **LG.2 "Logros v2, gamificación de hábitos"** (LG.2a), que requiere ADR revisando el ADR 022 (la vitrina se muda de Ajustes a Análisis + Inicio) e incluye como principio innegociable la **regla anti-gaming de Esteban**: premiar hábitos, nunca la omisión de información (prohibido "día sin gastos").
- **Apartados:** iniciativa **"Apartados v2" (AP.5)** con la filosofía redefinida (colchón para gastos esporádicos olvidables, no objetivos grandes): form estándar, recurrencia como toggle post-creación, aporte sugerido prellenado. Las categorías que son Metas (Vacaciones, Computador...) → **CAT.1 ampliada** (la taxonomía Apartados↔Metas se decide en la MISMA pasada que Gastos↔Fijos); el selector de emojis del SO (Win+.) → **CAT.2**.
- **Metas:** iniciativa **"Metas v2" (MT.6)**: subcategorías inteligentes (patrón compartido detectado: categoría→subcategoría es el mismo modelo de dos niveles que entidad→producto de MC.16/Deudas, se decide UNA vez en ADR 029 D3), cuota por frecuencia real del usuario, plan de aportes generado y recalculado automáticamente (si se ejecutara solo, pertenece al ADR de PA). La integración con "Distribuir mi ingreso" era exactamente el punto 21 de MC.13 (metas añadido como consumidor).
- **Motor compartido de MC.13 renombrado** a "vencimientos y aportes recomendados": suma como consumidores el plan de MT.6 y el prellenado de AP.5 (ya eran consumidores el asistente, la checklist, PA.1 y la cuota por período). **CAT.2 sube a 6 consumidores.**

Cero código tocado.

---

### docs(triaje): 3.er lote (Inicio, Calendario, Me deben) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Tercer triaje del día: 3 briefs. Resultado en [`BOARD.md`](BOARD.md):

- **Inicio:** los 2 puntos se integran a fuentes ya existentes, cero tarjetas nuevas. "Gestionar" de Pendientes del mes → Calendario (no Deudas) entra a la iniciativa **Inicio v2** como rebanada temprana candidata (cambio de una línea, no espera el ADR de revisión). La identificación visual de prioridades **amplía la spec que ya vivía en IV.2c**: además de icono + color de sección, cada ítem lleva etiqueta pequeña de tipo ("Deuda", "Gasto fijo", "Meta"...), cumpliendo "el color nunca viaja solo" (ADR 031 D1); los colores de los emojis del brief son ilustrativos, mandan los tokens aprobados.
- **Calendario:** tarjeta nueva **CAL.3** (selección automática del día actual al entrar: si hoy tiene compromisos, el panel de detalle carga solo; navegación entre fechas sin cambios; incluye indicar claramente cuando un día no tiene registros, que hoy simplemente no muestra nada).
- **Me deben:** iniciativa nueva **"Me deben v2: seguimiento inteligente" (PE.6)** sobre la base ya cerrada de PE.1 (tasa + reparto capital/interés) y PE.2-PE.5 (estados humanizados): total sugerido con intereses acumulados y desglose visible en "Me pagaron" (el usuario decide: cobrar todo, parte o perdonar), historial de abonos por préstamo (bump de schema; hoy solo existe el acumulado `pagado`), rendimiento del préstamo, estados visuales con los semánticos del ADR 031 y estadísticas de confianza por persona (historial informativo, no calificación). **Derivados:** recordatorios de vencimiento → **CFG.3** (personales añadido como fuente del motor único); fecha por defecto = hoy → **CAT.4**, que Esteban elevó a regla de toda la app (la tarjeta pasa a "auditoría de consistencia de formularios: orden + fecha default").

Cero código tocado.

---

### docs(triaje): 2.º lote (Deudas y Mis Cuentas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Segundo triaje del día: 2 briefs (Deudas, 15 puntos; Mis Cuentas, 21 puntos + integración del ingreso fijo con cuenta de destino). Resultado en [`BOARD.md`](BOARD.md):

- **Iniciativa "Deudas v2: de registro a asesor" (D.15):** alerta roja solo en el encabezado con panel interior en calma (2 capas del ADR 031), Finko recomienda la estrategia principal según capacidad de pago, copy motivador en simulaciones/Avalancha/Bola de nieve, editar deuda (hoy solo se elimina; rebanada temprana candidata), tarjetas con jerarquía visual, "Aplicar" en el simulador de pago extra, menos hints de bajo valor conservando los útiles (D.12). D.14 queda como su primera rebanada. Derivados a fuentes externas: iconos Avalancha/Bola de nieve → IV.4 (spec añadida); "Otro" con icono → CAT.2; catálogo entidad→producto (Visa Platinum...) → ADR 029 D3, compartido con MC.16.
- **BUG-011 registrado en [BUGS.md](BUGS.md):** el panel estratégico se cierra al cambiar de pestaña y deja la simulación aplicada sin "Aplicar estrategia" (reportado por Esteban con pasos de reproducción; corregible antes o dentro de Deudas v2).
- **Iniciativa "Mis Cuentas v2" con 3 tarjetas:** **MC.13 ampliada** a "Distribución v2" (2 pasos: educación visual + distribución por prioridad; alertas por categoría en su paso; completar con saldo de otras cuentas; dinero restante con decisión explícita; cuota del período según frecuencia; el ingreso fijo registra cuenta de destino y el paso final "Estilo de vida" desaparece: lo no distribuido se queda en la cuenta); **MC.15** (UI: redundancias en tarjetas de cuenta e ingresos fijos, legibilidad de logos ajustando SOLO el contenedor por la regla de fidelidad, advertencia útil de cuota de manejo); **MC.16** (tarjeta de crédito como producto integrado cuentas↔deudas, requiere ADR: cupo+deuda, cuotas al pagar, recalculo por pago anticipado, nudges de costos bancarios; desbloquearía el `consumosTC` automático de CFG.2a, nota cruzada añadida).
- **Dos conflictos con decisiones aprobadas, señalados sin revertir en silencio:** (a) "los ingresos esporádicos no ofrecen distribución" revierte parcialmente NAV.A2b slice 2 del ADR 024; (b) el abono automático del ingreso fijo a la fecha es un movimiento sin confirmación: se decide en el MISMO ADR de PA.1 (débitos y créditos automáticos, un solo criterio).
- **CAT.2 pasa de 2 a 4 consumidores** (se suman los forms de Deudas y Cuentas) y nace **CAT.4** (orden categoría→descripción consistente en todos los formularios).

Cero código tocado.

---

### docs(triaje): lote de 5 auditorías de Esteban integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Primer triaje formal bajo la sección 2.7 de CLAUDE.md: 5 briefs de Esteban (Inicio, Gastos, Calendario, Mis Cuentas, Deudas/pagos automáticos) cruzados contra el tablero, los 31 ADRs, las fichas y **entre sí**, sin implementar nada. Resultado en [`BOARD.md`](BOARD.md):

- **Iniciativa "Inicio v2" nueva (IN.8):** requiere revisión formal del ADR 028 porque reordena la pantalla aprobada (alertas primero; accesos fusionados con actividad reciente al final) y reabre el avatar con fotografía que el ADR 028 D3 descartó por cupo de `localStorage`. Absorbe IN.6b, IN.4b y las 2 observaciones sueltas de Inicio. Recomendado no iniciar antes de IV.2 (auditar sobre la base de color desplegada, no rediseñar dos veces).
- **Iniciativa CAT nueva (CAT.1/2/3, Transversal):** taxonomía Gastos↔Gastos fijos con categorías contextuales y deduplicación de catálogos (coordinar con la validación D3 del ADR 029: UNA clasificación, no dos); picker de icono compartido (cruce interno del lote: los briefs de Gastos y Calendario piden la misma interacción por separado, se construye UNA vez); categorías personalizadas globales (extiende TX.9b a toda la app).
- **MC.13** (distribución de ingresos contextual por fecha, absorbe MC.7g) y **MC.14** (llaves de transferencia por cuenta) en Mis cuentas. MC.13 define el **motor de vencimientos compartido** que también consume PA.1 (cruce interno del lote: no construir 2 motores; `eventosDelMes` de Agenda ya resuelve la mitad).
- **D.14** (registrar deuda acredita la cuenta donde se recibió el dinero, con "No aplica" obligatorio para deudas que no entregan dinero). **Verificación del triaje:** la otra mitad del brief ("pagar deuda descuenta de la cuenta") ya existe desde el ADR 002 y no genera tarjeta.
- **Iniciativa PA nueva (PA.1, Transversal):** pagos automáticos. Requiere ADR propio: en una PWA offline el "débito a la fecha" solo puede ser catch-up al abrir la app, y registrar movimientos sin confirmación arriesga divergencia con la realidad bancaria (filosofía "Finko refleja, no inventa").
- **Integraciones a fuentes únicas existentes:** iconografía+color en Pendientes/Prioridades y tinte de eventos del calendario → IV.2 (specs añadidas); copy cercano de alertas de límites → LIM.1 (punto 6 nuevo); nota cruzada en ANL.1 (su punto 8 lo resuelve el ADR 031); logos de marca en eventos → ADR 029 (base MK.2 ya existente).

Cero código tocado. Limpieza 7.4 de paso: 3 guiones largos heredados corregidos en BOARD/CHANGELOG/ADR 031.

---

### docs(workflow): sección 2.7, triaje de tareas nuevas y rol de líder técnico · 2026-07-08

Regla nueva del usuario, codificada en [`/CLAUDE.md`](../CLAUDE.md) sección 2.7: toda tarea nueva entra por **triaje** (¿existe parcial?, ¿modifica algo aprobado o revierte un ADR?, ¿se integra a una iniciativa mayor?, ¿depende de algo?, ¿se difiere?) y el resultado es implementar ahora, integrar o registrar y diferir; la tarjeta "En proceso" no se abandona por ideas nuevas (continuidad primero); cada funcionalidad tiene **una sola entrada canónica** en el BOARD (tarjeta o iniciativa que absorbe las tareas pequeñas relacionadas), con la ejecución siempre por rebanadas verificables (la regla 2.1 se mantiene: fuente única ≠ tarea monolítica); priorización explícita al elegir tarjeta (impacto, dependencias, riesgo, beneficio, verificabilidad); y rol de arquitecto: proponer la solución más elegante/reutilizable **antes** de implementar, no después.

**Primer caso aplicado en el mismo movimiento:** la tarjeta **TX.10** ("categoría como eje de automatización") seguía viva en el BOARD pese a que el [ADR 029](DECISIONS/029-catalogo-de-marcas-por-categoria.md) declara absorberla desde el 2026-07-06. Se fusionó (nota de absorción con el solape LIM.1/ANL.1 preservado como regla de diseño), se corrigió la nota de IN.7 que la citaba como tarjeta viva (junto con CAL.1, ya cerrada), y el ADR 029 (que llevaba 2 días sin commitear siendo referenciado) entró al repo en su estado honesto de **Propuesta** (pendiente de que Esteban valide la taxonomía D3; nada de eso se inicia sin esa validación).

| Archivo | Cambio |
|---|---|
| `CLAUDE.md` | Sección 2.7 nueva (triaje, continuidad, fuente única por funcionalidad, priorización, rol de arquitecto, documentación viva). |
| `docs/BOARD.md` | Regla de triaje en el encabezado; TX.10 absorbida por el ADR 029; nota de IN.7 corregida. |
| `docs/DECISIONS/029-catalogo-de-marcas-por-categoria.md` | Entra al repo (estado Propuesta, sin cambios de contenido). |

---

### docs(adr) + feat(ui): IV.1, fundación de tokens de identidad de color por sección · 2026-07-07

Primera fase de la iniciativa "Identidad de color por sección" ([ADR 031](DECISIONS/031-identidad-de-color-por-seccion.md), aceptada por Esteban el mismo día). Brief: la app depende demasiado del verde y el negro; cada sección debería tener un color reconocible en toda la experiencia (tarjetas, botones, iconos, barras, gráficos, calendario). El análisis encontró que los tokens `--fk-dom-*` ya existían en `tokens.css` pero sub-desplegados (solo en tejas, dots y badges pequeños), **sin rampa de tema claro** (hueco WCAG real: varios dominios por debajo de 2:1 de contraste sobre blanco) y con `--fk-dom-compromisos` **idéntico** a `--fk-danger` (#ff4757 compartido entre "es una deuda" y "hubo un error").

Las 5 decisiones abiertas del ADR (P1 a P5) se resolvieron todas con la opción recomendada: gastos/egresos se mantienen cálidos y neutros (el [ADR 019](DECISIONS/019-limites-por-rol.md) "gastar no es incumplir" sigue vigente, sin cambios); Deudas se separa del rojo de error; Límites se queda en amarillo; el hub Ahorros usa una familia de colores relacionados en vez de 4 matices sueltos que chocarían entre sí (Metas azul habría colisionado con Mis cuentas).

**Cambios de tokens:** `--fk-dom-agenda` nuevo (índigo `#7d8cf0`, Calendario no tenía color propio); `--fk-dom-compromisos` de `#ff4757` a frambuesa `#ea5385`; `--fk-dom-analisis` a pizarra neutra `#8f9bb3` (Análisis interpreta a los demás dominios en vez de tener datos propios, así que se retira de la zona verde-turquesa saturada); `--fk-dom-inversion` hereda el turquesa `#2fd2bf` que Análisis deja libre. Los 11 dominios ganan `--fk-dom-X-bg` (`color-mix` al 12%, mismo valor en ambos temas) y `--fk-dom-X-text` (variante segura como texto/UI significativa, con override obligatorio en `body.light-theme` que corrige el hueco WCAG).

**Hallazgo corregido antes de implementar, no a ojo:** la frambuesa que proponía el texto original del ADR (`#ef5777`) resultó, al calcular su HSL real, estar a solo 7° de matiz de `--fk-danger`: casi indistinguible con daltonismo protán pese a no ser el mismo hex. Se recalculó a `#ea5385`, separada 14-19° de matiz y con luminosidad propia (una separación robusta contra daltonismo no depende solo del matiz), verificando con la fórmula de contraste WCAG que los 11 dominios siguen pasando ≥4.98:1 sobre superficies oscuras y los 11 `-text` ≥4.5:1 sobre blanco y `#f6f7fa` en tema claro.

**Verificado en el navegador, no solo en código:** con Chromium real vía preview, la teja de "Deudas" en el menú "Más" resuelve a `rgb(234,83,133)` (=`#ea5385`) exacto, "Análisis" a `rgb(143,155,179)` (=`#8f9bb3`) exacto, en ambos temas. La verificación también encontró (preexistente, no introducido por esta tarea) que algunos usos ya desplegados leen el token base directo como color de texto en vez de la variante `-text` (ej. `.inversion-hero__tipo-pct` de `analysis.css`, badges de `nudges.css`), fallando contraste en tema claro (`100%` de Inversión da 1.89:1 contra blanco). Es exactamente el hueco que la iniciativa se propuso cerrar; queda documentado con los archivos y selectores exactos para que IV.2 lo resuelva sin tener que volver a auditar.

**Validación:** 2265/2265 unit (sin cambios de comportamiento JS, cero tests nuevos) + 155/155 E2E en Chromium real + verificación manual de contraste (axe-core no cubre la regla `color-contrast` en happy-dom, ver nota en `a11y.test.js`). SW v339 → v340.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | Recoloreo de compromisos/análisis/inversión; `--fk-dom-agenda` nuevo; rampa `-bg`/`-text` para los 11 dominios. |
| `styles/themes.css` | Override de los 11 `--fk-dom-X-text` en `body.light-theme`. |
| `docs/DESIGN_SYSTEM.md` | Tabla de dominios actualizada (valores oscuro/claro) + documentación de la rampa de 3 tokens. |
| `docs/DECISIONS/031-identidad-de-color-por-seccion.md` | ADR aceptado; corrección del hex de compromisos tras el cálculo de contraste real. |
| `docs/BOARD.md` | IV.1 cerrada con el hallazgo exacto para IV.2; IV.2/IV.3 desbloqueadas. |
| `service-worker.js` | v339 → v340. |

---

### perf(rendimiento): PERF.7d, calcularEstadoRenta memoizada sin tocar config/index.js · 2026-07-07

Tercera rebanada de **PERF.7**, y cierre de la mitad de `calcularEstadoRenta()` que PERF.7b había descartado por riesgo de datos obsoletos. `_renderEstadoRenta(anio)` ([analisis/view.js](../../modules/dominio/analisis/view.js)) llamaba a `calcularEstadoRenta(S, anio)` (barrido de `patrimonioBruto` + `totalGastosAnio`) **sin memoizar**, en cada `renderAnalisis()`.

**El plan original de esta tarjeta resultó más grande de lo necesario.** PERF.7b había planteado que primero había que corregir `config/index.js` para que emitiera `state:change` al guardar datos fiscales (hoy los muta directo, sin EventBus), y solo después memoizar. Al analizarlo a fondo: el handler de "Datos de renta" (`#form-datos-fiscales`) siempre **reemplaza** `S.config.datosFiscales[anio]` con un objeto nuevo (`entrada = {}` en cada submit, o lo borra con `delete`), nunca lo muta en el lugar. Eso significa que memoizar `calcularEstadoRenta` con un `extraerClave` que lea `state.config?.datosFiscales?.[anio]` **directamente** (en vez de pasar el estado completo, que nunca cambia de referencia) detecta el cambio solo por identidad, sin depender de ningún evento. Se agregó `_calcularEstadoRentaMemo`, memoizada contra `['gastos', 'cuentas', 'inversiones']` (que sí emiten `state:change` correctamente hoy) con ese `extraerClave` propio. `config/index.js` y `analisis/index.js` quedan sin tocar: menos riesgo y menos superficie de cambio que el plan original.

**Prueba de la corrección, no solo del rendimiento:** se agregaron 4 tests en `tests/unit/analisis.test.js` que renderizan Análisis dos veces con `S.config.datosFiscales` editado entre medio (simulando exactamente el handler, sin pasar por EventBus) y verifican que el segundo render **no sirve el resultado obsoleto**. Con una memoización ingenua (clave por defecto), el test de "editar entre dos renders" habría fallado mostrando el badge "Sin datos en Finko" en vez del monto nuevo: la prueba habría detectado exactamente el bug que este diseño evita.

**Medición honesta (`pnpm perf`):** el efecto en "Análisis caché" es pequeño, dentro del ruido de medición (3,4-4,6 ms antes → 3,4-3,9 ms ahora). `calcularEstadoRenta` ya era barata frente al resto del bundle memoizado de PERF.2 con los datos de la semilla de este harness. El valor de esta tarea es de **corrección de cobertura de caché** (cierra el único barrido sin memoizar que quedaba en el render de Análisis), no de velocidad medible en este escenario sintético.

**Validación:** 2265/2265 unit (4 tests nuevos) + 155/155 E2E en Chromium real + `pnpm perf`. SW v338 → v339. Con esto, **PERF.7 queda completa salvo PERF.7c** (warm-up en idle).

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `_calcularEstadoRentaMemo` nuevo (memoiza `calcularEstadoRenta` con `extraerClave` propio); `_renderEstadoRenta` lo usa. |
| `tests/unit/analisis.test.js` | 4 tests nuevos: sin datos, edición entre renders no queda obsoleta, borrado se refleja, cache hit correcto sin cambios. |
| `scripts/perf/BASELINE.md` | Sección PERF.7d con la medición y la explicación de por qué es seguro. |
| `docs/BOARD.md` | PERF.7d cerrada con el alcance revisado (más chico que el planteado en PERF.7b). |
| `service-worker.js` | v338 → v339. |

---

### perf(rendimiento): PERF.7b, fold de hayResumen() en el bundle memoizado del resumen semanal · 2026-07-07

Segunda rebanada de **PERF.7**. `renderPanelResumen()` ([resumen/view.js](../../modules/dominio/resumen/view.js)) llamaba a `hayResumen(gastos, hoyISO)` (barrido propio de `S.gastos`, **sin memoizar**) para decidir si mostrar el panel, y recién después llamaba a `_resumenSemanalMemo()` (memoizada desde PERF.2) para el contenido. `resumenSemanal()` ya calcula `registros` (gastos en los últimos 7 días) como parte de su resultado: la condición de "sin actividad" ahora se lee de ese campo, una sola llamada memoizada en vez de dos (una sin cachear).

**Hallazgo de alcance importante:** la otra mitad prevista de esta tarjeta, memoizar `calcularEstadoRenta()` (Análisis, K.3), se descartó tras analizarla: depende de `S.config.datosFiscales`, y `config/index.js` **muta ese dato sin emitir `state:change`** (el handler de `#form-datos-fiscales` guarda directo + `save()` + `renderPanelConfig()`, sin pasar por el EventBus como el resto de la app). Memoizarla contra `gastos`/`cuentas`/`inversiones` habría servido un resultado **obsoleto** después de editar "Datos de renta" y navegar a Análisis sin pasar por un `renderAll()` completo: eso es un bug de datos, no una optimización perdida. Se registró como **PERF.7d** (arreglar la emisión de eventos primero, memoizar después) en vez de forzarla en esta tarjeta.

**Medición (`pnpm perf`, columna "Inicio", que mide `renderPanelResumen` + `renderActividadReciente`):**

| gastos | Inicio frío (7a → 7b) | Inicio caché (7a → 7b) |
|---|---|---|
| 1.000  | 4,3 → 8,5 ms (regresión, ver nota) | 2,1 → **0,7 ms** |
| 5.000  | 46,8 → **39,5 ms** (~16 % menos) | 8,1 → **0,9 ms** |
| 10.000 | 93,5 → **79,8 ms** (~15 % menos) | 15,2 → **0,8 ms** |

La ruta **caché** (re-render de Inicio sin cambios en `gastos`, el caso más frecuente en uso real) queda plana en ~0,8 ms a cualquier volumen. La ruta **fría** mejora ~15-16 % a 5.000/10.000 gastos. A 1.000 gastos hay una **regresión real de ~4 ms** (no ruido, reproducida en 2 corridas): con la semilla de 10 años y poca densidad, la ventana de "últimos 7 días" seguido no tiene gasto; antes `hayResumen()` (1 barrido) devolvía `false` sin llegar a calcular el bundle completo (5 barridos), ahora `resumenSemanal()` se calcula siempre para leer `.registros`. Se acepta el trade porque el costo absoluto es imperceptible (~4 ms), solo se paga una vez por mutación real (no por render), y se invierte a mejora clara cuando el historial crece, que es el escenario que le preocupa a Esteban. Detalle completo, sin maquillar la regresión, en [`scripts/perf/BASELINE.md`](../scripts/perf/BASELINE.md).

**Validación:** 2261/2261 unit (4 tests nuevos de `renderPanelResumen()` en `tests/unit/resumen.test.js`) + 155/155 E2E en Chromium real + `pnpm perf`. SW v337 → v338.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/view.js` | `renderPanelResumen()` deriva la condición de "sin actividad" de `r.registros` en vez de llamar a `hayResumen()` por separado. |
| `tests/unit/resumen.test.js` | 4 tests nuevos de `renderPanelResumen()` (sin contenedor, oculta sin actividad/sin gastos, muestra con actividad). |
| `scripts/perf/BASELINE.md` | Sección PERF.7b con la medición completa, incluida la regresión a 1.000 gastos. |
| `docs/BOARD.md` | PERF.7b cerrada (parcial); PERF.7d nueva (arreglar emisión de eventos de datos fiscales, precondición para memoizar `calcularEstadoRenta`). |
| `service-worker.js` | v337 → v338. |

---

### perf(rendimiento): PERF.7a, Intl.DateTimeFormat cacheado en las vistas de lista · 2026-07-07

Primera rebanada de **PERF.7**, salida de la segunda pasada de la auditoría de rendimiento (2026-07-07). Esa pasada confirmó que lo grueso ya estaba resuelto (eventos por sección, `renderSmart` hash-gate, `infra/memo.js`, windowing) y corrigió un hallazgo propio: el doble-render caro que motivaba PERF.6 **no ocurre**, porque `renderSmart` solo pinta la sección activa y Análisis (solo-lectura) nunca se muta desde sí mismo. Se reordenó la prioridad hacia PERF.7, que es una ganancia **medida e incondicional**.

**Hallazgo (PERF.7a):** `fechaLegible()` (`infra/utils.js`), `_mesAnioLabel()` (`movimientos/view.js`) y `fechaCorta()` (`tesoreria/views/ingresos.js`) construían un `Intl.DateTimeFormat` nuevo (vía `toLocaleDateString`) en **cada llamada**, o sea una vez por ítem de lista: 50 por lote en Movimientos, el mes completo en Gastos. Construir el formatter es la parte cara; formatear con uno ya construido es barato.

**Cambio:** se agregó `formateadorFecha(locale, opciones)` en `utils.js`: cachea la instancia por firma (locale + `JSON.stringify(opciones)`) en un `Map`, de modo que cada combinación se construye una sola vez en toda la vida de la app. Los tres call sites la usan. `format()` produce texto idéntico a `toLocaleDateString` con los mismos argumentos, así que es cero cambio de comportamiento (hay un test de equivalencia explícito).

**Medición (`pnpm perf`):** "Movs 1er lote" baja de 24,6 / 33,0 / 47,6 ms (línea base PERF.1, a 1.000 / 5.000 / 10.000 gastos) a **~8,2 ms planos**: deja de crecer con el volumen porque los 50 formatters por lote eran el residuo documentado en PERF.1. Las demás columnas no se mueven (Inicio frío 93,5 vs 97,4 previo, Análisis frío 10,5 vs 11,1: dentro del ruido; `stringify`/`save` iguales).

**Validación:** 2257/2257 unit (5 nuevos en `tests/unit/utils.test.js`: `formateadorFecha` reutiliza instancia por firma, distingue firmas, su `format()` coincide con `toLocaleDateString`, y `fechaLegible` no cambió su salida) + 155/155 E2E en Chromium real + `pnpm perf`. SW v336 → v337. Quedan PERF.7b (folding de `calcularEstadoRenta`/`hayResumen` al memo) y PERF.7c (warm-up en idle).

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | `formateadorFecha()` nuevo (caché de `Intl.DateTimeFormat` por firma); `fechaLegible` lo usa. |
| `modules/dominio/movimientos/view.js` | `_mesAnioLabel()` usa `formateadorFecha` en vez de `toLocaleDateString`. |
| `modules/dominio/tesoreria/views/ingresos.js` | `fechaCorta()` usa `formateadorFecha`. |
| `tests/unit/utils.test.js` | 5 tests nuevos (`formateadorFecha` + equivalencia de `fechaLegible`). |
| `scripts/perf/BASELINE.md` | Sección PERF.7a (antes/después de "Movs 1er lote"). |
| `docs/BOARD.md` | PERF.6/7/8 registradas; PERF.7a cerrada; PERF.7b y PERF.7c abiertas. |
| `service-worker.js` | v336 → v337. |

---

### feat(config): CFG.1a, situación laboral en el perfil (quita el SMMLV muerto) · 2026-07-06

Primera rebanada de la iniciativa **fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"). Esteban eligió fusionar ambas tarjetas del BOARD porque la situación laboral (CFG.1) alimenta la interpretación del monitor de renta (CFG.2).

**Análisis previo (regla 2.6, ficha nueva `docs/contexto/configuracion.md`):** el encabezado de Ajustes mostraba nombre + un campo "SMMLV configurado" editable, pero rastreando `S.perfil.smmlv` en todo el código **ningún cálculo financiero lo lee** (toda la lógica usa la constante legal `SMMLV` de `constants.js`): era dato muerto que confundía sin hacer nada. Criba de las 8 preguntas de perfil que propuso Esteban contra el criterio "no pedir datos innecesarios": solo **situación laboral** tiene consumidor real hoy y no es derivable; tipo de ingresos y frecuencia ya viven en `S.ingresos`; el resto (personas a cargo, objetivos, conocimiento financiero, tolerancia al riesgo) no lo consume nada todavía y se aplaza hasta que exista la feature que lo use (evita llenar `localStorage` con datos inertes, coherente con PERF.4/ADR 030). Hallazgo adicional para las siguientes rebanadas: el monitor de renta (K.3, `calcularEstadoRenta` en Análisis) **ya hace gran parte de CFG.2**.

**CFG.1a:** se quitó el campo SMMLV del encabezado (`_renderPerfil`) y se agregó un selector de **situación laboral** (`SITUACIONES_LABORALES`: empleado, independiente, pensionado, mixto, otro; vacío = "sin especificar"), persistida en `perfil.situacionLaboral` (schema v24 → v25, migración idempotente que arranca a los usuarios existentes en ''). El handler de `#form-perfil` valida contra el catálogo (nunca guarda un valor libre). `perfil.smmlv` se conserva en el estado (marcado `@deprecated`) por compatibilidad con datos y seeds existentes; solo deja de mostrarse y editarse.

**Validación:** 2252/2252 unit (9 nuevos: 5 de render en `tests/unit/config.test.js` nuevo, 4 de migración v25 en `storage.test.js`; `state.test.js` actualizado a la forma nueva de `perfil`, que ahora incluye `situacionLaboral`) + 155/155 E2E en Chromium real (2 nuevos en `smoke.test.js`: el encabezado del perfil ya no muestra el SMMLV; guardar la situación laboral la refleja en el resumen, la conserva en el selector y la persiste en `localStorage`). El E2E verifica la persistencia leyendo `localStorage` en vez de recargar, porque el `addInitScript` de `saltearOnboarding` resiembra `fk_v1` en cada carga. SW v335 → v336.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `SITUACIONES_LABORALES` (catálogo de 5 situaciones, ids estables). |
| `modules/core/state.js` | `perfil.situacionLaboral` nuevo; `perfil.smmlv` marcado `@deprecated`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 24 → 25; migración v24 → v25 (situación laboral por defecto '', repone perfil corrupto). |
| `modules/dominio/config/view.js` | `_renderPerfil` quita el SMMLV muerto y agrega el selector de situación laboral (resumen + `<select>`). |
| `modules/dominio/config/index.js` | Handler de `#form-perfil` guarda la situación laboral validada contra el catálogo; ya no procesa el SMMLV. |
| `tests/unit/config.test.js` | Nuevo: 5 tests de render del perfil (SMMLV ausente, selector, preselección, id corrupto). |
| `tests/unit/storage.test.js` | 4 tests de la migración v24 → v25. |
| `tests/unit/state.test.js` | Forma de `perfil` actualizada a `{ nombre, smmlv, situacionLaboral }`. |
| `tests/e2e/smoke.test.js` | 2 tests E2E del perfil (situación laboral se guarda, refleja y persiste). |
| `docs/contexto/configuracion.md` | Ficha nueva (primer análisis a fondo de la sección Ajustes). |
| `docs/contexto/README.md` | Fila de Configuración pasa de "sin crear" a "activa". |
| `docs/BOARD.md` | CFG.1 + CFG.2 fusionadas; CFG.1a cerrada; CFG.2a y CFG.2b como subtareas pendientes. |
| `service-worker.js` | v335 → v336. |

---

### feat(agenda): CAL.2, leyenda del calendario dinámica · 2026-07-06

Primera tarea trabajada sobre la sección Calendario bajo la metodología de fichas de contexto (regla 2.6 de CLAUDE.md): no existía `docs/contexto/calendario.md`, así que el análisis a fondo del dominio `agenda` (piezas, relaciones, riesgos) quedó documentado en la ficha nueva antes de codificar.

La leyenda bajo el calendario mostraba siempre las 4 entradas posibles (día de ingreso, gasto fijo, deuda con entidad, deuda personal) aunque el usuario no tuviera registros de varias de ellas en el mes visible, ocupando espacio sin aportar información útil.

**Solución:** `tiposPresentesEnMes()` (nuevo, `agenda/logic.js`, función pura sin DOM ni `S`): recorre el mapa de eventos ya calculado del mes (el mismo que usa el grid de días) y devuelve solo los tipos que realmente aparecen, en el orden canónico de la leyenda. `_renderLeyenda()` (`agenda/view.js`) pasó a recibir ese mapa de eventos en vez de no recibir nada, y renderiza únicamente las entradas presentes; si ningún tipo aparece este mes (sin compromisos ni ingresos), la función devuelve `''` y no se dibuja el contenedor. Color, ícono y nomenclatura de cada tipo se conservan exactamente iguales (`cal-dot--*`, la misma paleta que ya usan los puntos del calendario): esta tarea solo decide qué entradas mostrar, no cómo se ven, cumpliendo el pedido explícito de no inventar una presentación nueva.

**Validación:** 2243/2243 unit (10 nuevos en `tests/unit/agenda.test.js`: `tiposPresentesEnMes` con input inválido, vacío, un tipo, los cuatro tipos, sin duplicados, tipo faltante tratado como "fijo", y coincidencia con `eventosDelMes` real; más render dinámico de la leyenda con 0, 1 y varios tipos presentes) + 153/153 E2E en Chromium real (2 nuevos/reescritos en `smoke.test.js`: sin compromisos ni ingresos no dibuja la leyenda; con los tres tipos de compromiso presentes los muestra a los tres). Dos tests preexistentes que asumían la leyenda estática (con estado vacío esperaban ver "Gasto fijo"/"Deuda entidad"/"Deuda personal") se corrigieron para sembrar los tipos que ahora necesitan estar presentes para aparecer, reflejando el comportamiento nuevo. SW v334 → v335.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | `tiposPresentesEnMes()` nuevo: filtra el orden canónico de tipos contra los presentes en el mapa de eventos del mes. |
| `modules/dominio/agenda/view.js` | `_renderLeyenda(eventos)` ahora recibe el mapa de eventos y filtra dinámicamente; `_LABEL_LEYENDA` nuevo (etiquetas por tipo, mismo copy que antes). |
| `tests/unit/agenda.test.js` | 10 tests nuevos (`tiposPresentesEnMes` + render dinámico); 2 tests existentes de la leyenda corregidos al comportamiento dinámico. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos/reescritos de la leyenda dinámica (suite dedicada con seed propio, evita el problema de navegar dos veces al mismo hash sin recargar el SPA). |
| `docs/contexto/calendario.md` | Ficha nueva (primer análisis a fondo del dominio `agenda`, regla 2.6). |
| `docs/contexto/README.md` | Fila de Calendario pasa de "sin crear" a "activa". |
| `docs/BOARD.md` | CAL.2 cerrada. |
| `service-worker.js` | v334 → v335. |

---

### perf(analisis): PERF.3, diferir el cómputo del grupo colapsado de Análisis · 2026-07-06

Cierre de la auditoría de rendimiento (solo queda **PERF.5**/IndexedDB, diferida por el ADR 030). El grupo colapsable "Más detalle de tus gastos" de Análisis (un `<details>` cerrado por defecto) calculaba `calcularComparacionCategorias()` (recorre el mes actual y el anterior de `S.gastos`) y `detectarPatronGastoSemanal()` (recorre 90 días) en **cada** `renderAnalisis()`, aunque el usuario nunca lo abriera. Con PERF.2 esas dos derivaciones vivían dentro del bundle memoizado `_calcularDatosAnalisis()`, así que se recalculaban en cada `state:change` genuino de las secciones observadas mientras la pantalla estaba abierta.

**Solución:** se sacaron esas dos derivaciones del bundle principal a `_calcularDetalleGastos()` (nuevo, memoizado con `['gastos']`) y se **difirió su render al evento `toggle`** del `<details>`. `renderAnalisis()` dibuja el grupo con el cuerpo vacío; la primera vez que el usuario lo abre, un listener calcula y pinta el cuerpo (comparación + patrón semanal + hormigas) y marca `data-cargado` para no recomputar. Las hormigas **no** se difirieron: ya vienen dentro de `generarResumen()`, que el resto del panel (score, patrimonio) necesita igual, así que rendirlas es gratis.

**Cómo se preserva el comportamiento exacto:** la visibilidad del grupo se decide barato, sin pagar el cómputo caro en el caso común. Con gasto este mes (`resumen.gastoMes > 0`, dato que ya trae el resumen) la comparación **siempre** tiene contenido (invariante: `totalGastosMes > 0` implica al menos una categoría con gasto, y `calcularComparacionCategorias` no devuelve vacío en ese caso), así que basta ese chequeo para mostrar el grupo y diferir su cuerpo. Sin gasto este mes (caso menos común: inicio de mes, o usuario que dejó de registrar) se calcula el detalle en el mismo render para no dibujar un grupo que resultaría vacío, ya que la comparación con el mes anterior ("desapareció") o el patrón de los últimos 90 días podrían seguir teniendo datos. Cada `renderAnalisis()` reescribe `innerHTML` (comportamiento previo), así que el `<details>` se recrea y el listener se re-asocia al nodo nuevo, sin duplicados.

**Validación:** 2233/2233 unit (5 nuevos en `tests/unit/analisis.test.js`: grupo mostrado con cuerpo diferido, llenado al primer `toggle`, ruta ansiosa sin gasto del mes, grupo oculto sin datos, y re-diferido en cada render) + 151/151 E2E verdes en Chromium real (Playwright). Medido con `pnpm perf`: Análisis frío baja de ~9,7/16,3 ms a ~7,4/11,1 ms (mediana, 5.000/10.000 gastos), sin regresión en la ruta caché (~3,5-4,4 ms, plana) ni en las demás columnas. SW v333 → v334.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | `_calcularDetalleGastos()`/`_calcularDetalleGastosMemo`/`_renderDetalleGastos()` nuevos; `renderAnalisis()` difiere el cuerpo del grupo al `toggle`; `_renderGrupoColapsable()` reemplazado por `_renderGrupoDetalle()`. |
| `tests/unit/analisis.test.js` | 5 tests nuevos del grupo de detalle diferido. |
| `scripts/perf/BASELINE.md` | Sección PERF.3 (antes/después de la columna Análisis frío). |
| `docs/contexto/analisis.md` | Ficha actualizada (piezas nuevas, riesgo del diferido, cambio realizado). |
| `docs/BOARD.md` | PERF.3 cerrada; nota de la iniciativa actualizada. |
| `service-worker.js` | v333 → v334. |

---

### perf(storage): PERF.4, ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite · 2026-07-06

Cierre de la auditoría de rendimiento. PERF.4 se había planteado como "partir la persistencia por colección", pero el análisis con el harness PERF.0 mostró que **el costo de guardar es bajo**: `save()` está debounced 200 ms y `JSON.stringify(S)` son ~5 ms de mediana a 10.000 gastos (la escritura a disco real de un móvil no la mide happy-dom, así que queda estimada). El cuello no es la CPU: es el **techo de cuota de `localStorage` (~5 MB por origen)**, que es un riesgo de **pérdida de datos** a largo plazo, no de lentitud.

Decisión (delegada por Esteban), formalizada en el [ADR 030](DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md): **no reescribir la capa de persistencia** (sería el cambio de mayor riesgo del proyecto: `loadData()` pasaría a asíncrono → bootstrap async, más una migración de años de datos reales sin pérdida, más reescribir el sembrado de las 11 suites E2E que dependen de escribir la clave `fk_v1`, todo para ahorrar ~5 ms debounced). En su lugar se pone una salvaguarda barata sobre el riesgo real y se deja **IndexedDB** documentado como dirección futura con disparadores concretos (ADR 030 D4). Se **rechaza explícitamente** partir `localStorage` por clave: no sube la cuota (todas las claves comparten el límite por origen), solo suma complejidad. La regla 3 del ADN se **reafirma**, no se cambia.

**Salvaguarda implementada (ADR 030 D2), dos partes:**

1. **El guardado que falla deja de morir en silencio.** Antes, si `localStorage` estaba lleno, `_flush()` atrapaba el `QuotaExceededError` con solo un `console.error` y el usuario perdía el cambio sin enterarse. Ahora marca `_falloUltimoGuardado`, emite `storage:error`, y `config/` lo anuncia (a11y assertive) más un aviso persistente en la sección "💾 Tus datos" con CTA "Exportar respaldo".
2. **Aviso anticipado.** `evaluarCuota()` y `estadoCuota()` (funciones puras en `core/storage.js`) clasifican el uso contra un límite conservador (`LIMITE_LOCALSTORAGE_CHARS` = 4.5 M chars, con margen porque la contabilidad exacta varía por navegador): `aviso` ≥ 80 %, `critico` ≥ 95 %. Al **cruzar de nivel** (no en cada guardado) se emite `storage:cuota` y Ajustes muestra el aviso. En operación normal, `_renderAvisoAlmacenamiento()` devuelve string vacío: no se ve nada.

**Validación:** 2228/2228 unit (9 nuevos en `storage.test.js`: umbrales de `evaluarCuota`, `estadoCuota` reflejando el tamaño de S, y el guardado fallido emitiendo `storage:error` en vez de morir en silencio, simulando el cupo lleno con `vi.stubGlobal` porque happy-dom no expone `setItem` de forma espiable) + 151/151 E2E verdes en Chromium real (Playwright). SW v332 → v333.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md` | Nuevo: ADR de la decisión (diferir rewrite, salvaguarda de cuota, IndexedDB como futuro con disparadores). |
| `modules/core/storage.js` | `evaluarCuota()`, `estadoCuota()`, `LIMITE_LOCALSTORAGE_CHARS`; `_flush()` marca fallo y emite `storage:error`/`storage:cuota` en vez de solo loguear; single-serialize. |
| `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` en "💾 Tus datos" (aviso con CTA a exportar; vacío en operación normal). |
| `modules/dominio/config/index.js` | Escucha `storage:error`/`storage:cuota`: anuncia (assertive) y re-renderiza el panel de Config. |
| `tests/unit/storage.test.js` | 9 tests nuevos del monitor de cuota. |
| `docs/BOARD.md` | PERF.4 cerrada; **PERF.5** (migración a IndexedDB) documentada como diferida con disparadores del ADR 030. |
| `service-worker.js` | v332 → v333. |

---

### perf(rendimiento): PERF.2, memoizar derivaciones pesadas de Inicio y Análisis · 2026-07-06

Continuación de la auditoría de rendimiento (PERF.0/PERF.1). El harness `pnpm perf` confirmó el segundo cuello real: `resumenSemanal()`, `movimientosRecientes()`/`movimientosCompletos()` (Inicio) y el bundle de `renderAnalisis()` (~7 llamadas de primer nivel, cada una con sub-barridos propios: `serieGastosMensual` recorre 12 meses llamando `totalGastosMes` cada uno, `calcularComparacionCategorias` recorre el mes actual y el anterior, `detectarPatronGastoSemanal` recorre 90 días) recalculaban sobre todo el historial en cada `state:change` relevante, **incluso en re-renders redundantes**: `renderAll()` repintando el dashboard sin que esos datos hubieran cambiado, o dos listeners reaccionando a una misma acción del usuario (ej. editar un gasto-abono dispara `state:change` para `gastos` y para `compromisos` por separado, cada uno con su propio recálculo completo).

**Solución:** `modules/infra/memo.js` (nuevo), con `memoizar()`: caché de 1 entrada que invalida contra dos señales, cualquiera de las dos basta para forzar el recálculo (nunca se sirve un resultado dudoso): identidad de referencia de los argumentos (cubre el caso de tests que reasignan `S.gastos = [...]` directo, sin pasar por `EventBus`) y un contador de revisión por sección, alimentado por el propio `EventBus` (`state:change`), que ya es la señal canónica de mutación en toda la app. Sin Proxies ni observers sobre `S` (ADN 4). Aplicado a `resumenSemanal()`, a `movimientosRecientes()`/`movimientosCompletos()` (con un `extraerClave` propio, porque esas dos funciones reciben un objeto envoltorio nuevo en cada llamada: `extraerClave` compara los arrays de adentro, no el envoltorio) y al bundle consolidado `_calcularDatosAnalisis()` (nuevo en `analisis/view.js`, junta las ~7 llamadas de `renderAnalisis()` en una sola unidad memoizable). Ninguna función deja de escribir el DOM en cada render: el cacheo es solo de cómputo, nunca de pintado, así que el HTML resultante es idéntico con o sin cache hit.

**Riesgo de medición evitado y documentado:** el harness original medía llamando a la misma función N veces sin cambiar `S` entre medidas; tras esta fase eso convierte casi todas las repeticiones en cache hits, midiendo un escenario real (re-render redundante) pero no el costo de un recálculo genuino. `bench.perf.js` ahora separa ambos: "frío" (`invalidar()` fuerza un `state:change` antes de cada muestra, cache miss garantizado) y "caché" (sin invalidar). En frío, el costo no cambia respecto a la línea base de PERF.0/PERF.1 (sin regresión); en caché, Inicio pasa de 4,3-97,4 ms a 2,2-16,9 ms (1.000 a 10.000 gastos) y Análisis de 4,3-16,3 ms a 2,9-4,6 ms **planos**, ya no crece con el volumen de historial.

Primer análisis a fondo del dominio Análisis documentado en `docs/contexto/analisis.md` (ficha nueva, regla 2.6): dónde vive cada pieza, riesgos conocidos (`_renderEstadoRenta()` queda fuera del bundle memoizado a propósito, es un solo barrido).

**Validación:** 2219/2219 unit (10 tests nuevos en `tests/unit/memo.test.js`: cache hit/miss por referencia, por sección observada/no observada, `extraerClave` con envoltorio) + 151/151 E2E verdes en Chromium real (Playwright). SW v331 → v332.

| Archivo | Cambio |
|---|---|
| `modules/infra/memo.js` | Nuevo: `memoizar()`, caché de 1 entrada por identidad de referencia + revisión de sección. |
| `modules/dominio/resumen/view.js` | `resumenSemanal()` envuelta en `_resumenSemanalMemo`. |
| `modules/dominio/movimientos/view.js` | `movimientosRecientes()`/`movimientosCompletos()` envueltas con `_extraerFuentes` propio. |
| `modules/dominio/analisis/view.js` | `_calcularDatosAnalisis()` nuevo (consolida 7 llamadas en 1), envuelto en `_calcularDatosAnalisisMemo`. |
| `scripts/perf/bench.perf.js` | Medición "frío"/"caché" separada (`invalidar()`, `antesDeCadaMuestra`) para no confundir cache hits del harness con una mejora real. |
| `tests/unit/memo.test.js` | Nuevo: 10 tests del helper de memoización. |
| `docs/contexto/analisis.md` | Nuevo: primer análisis a fondo del dominio Análisis. |
| `docs/contexto/inicio.md`, `docs/contexto/README.md` | Bloques de Inicio/Movimientos/Resumen actualizados; índice de fichas. |
| `docs/HANDOFF.md` | PERF.2 al tope de "últimas 5". |
| `service-worker.js` | `infra/memo.js` agregado a `CORE_ASSETS`; v331 → v332. |

---

### perf(movimientos): PERF.1, paginar por lotes la vista completa de Movimientos · 2026-07-06

Esteban pidió una auditoría de rendimiento completa (temor: que la app se vuelva lenta con años de datos, y que un cambio en una sección recalcule toda la app). **PERF.0** construyó primero el harness de medición: `pnpm perf` (`scripts/perf/seed.js` genera un estado determinista de hasta 10.000 gastos con un PRNG de semilla fija; `scripts/perf/bench.perf.js` mide en happy-dom el costo de los widgets de Inicio, Análisis, Movimientos y la persistencia; corre fuera de `pnpm test` vía `vitest.perf.config.js`). La auditoría en sí confirmó que el temor central estaba mayormente resuelto: `renderSmart()` ya corta el render por sección (hash-gate), así que editar un gasto no recalcula Metas/Inversiones/Análisis. El cuello real medido: la vista completa de Movimientos (`#movimientos`) construía **todos** los nodos del historial de una sola vez, ~3,9 s con 10 años de datos simulados.

**PERF.1** resolvió ese cuello con windowing. `renderMovimientosCompletos()` pinta un primer lote de 50 movimientos (los divisores de mes no restan cupo al conteo, para que un mes con pocos registros no reduzca el tamaño efectivo del lote) y agrega el resto bajo demanda con `cargarMasMovimientos()` (nuevo, exportado), disparada por un botón accesible `data-action="movimientos-cargar-mas"` ("Cargar más movimientos", 100% operable por teclado/lector de pantalla) y, como mejora progresiva, por un `IntersectionObserver` sobre ese mismo botón (se descarta y recrea en cada lote; nunca hay más de uno vivo). El panel compacto de Inicio (`renderActividadReciente()`, límite fijo de 5) no cambia.

**Resultado medido:** primer lote de 327,8 ms → 24,6 ms (1.000 gastos), 1.752,9 ms → 33,0 ms (5.000) y 3.875,2 ms → 47,6 ms (10.000): hasta **81x** más rápido, y el tamaño del primer lote queda plano en 50 nodos sin importar cuánto historial exista (antes crecía 1:1 con él). Nota honesta: el primer lote aún crece un poco con N porque `movimientosCompletos()` sigue derivando y ordenando todo el historial antes de paginar (el corte de PERF.1 es solo de construcción de DOM); ese residuo queda para una fase de memoización futura, sin tarjeta todavía.

**Riesgo de medición encontrado y documentado:** el primer diseño del harness intentaba recorrer todos los lotes en un loop apretado para medir el costo "cargar todo"; eso creaba cientos de `IntersectionObserver` en segundos y saturaba la heap de happy-dom (`FATAL ERROR: JavaScript heap out of memory`, worker crash). Es un artefacto del entorno de test (en la app real nunca hay más de un observer vivo a la vez), no un bug de producción; el harness se ajustó para medir el costo de un lote adicional de forma aislada.

**Validación:** 2209/2209 unit (8 tests nuevos de paginación en `movimientos.test.js`: primer lote acotado a 50, control "Cargar más" aparece/desaparece según haya historial pendiente, `cargarMasMovimientos()` no duplica ítems ni repite divisores de mes al cortar a mitad de mes, reiniciar el render no acumula lotes viejos) + 151/151 E2E verdes en Chromium real (Playwright). SW v330 → v331.

| Archivo | Cambio |
|---|---|
| `scripts/perf/seed.js` | Nuevo: generador determinista de un `S` grande y realista (10 años de gastos, ingresos puntuales, aportes, compromisos, metas, apartados, inversiones). |
| `scripts/perf/bench.perf.js` | Nuevo: harness de medición de hot paths (Inicio, Análisis, Movimientos, `JSON.stringify(S)`, `save()` real). |
| `scripts/perf/BASELINE.md` | Nuevo: línea base PERF.0 + resultado de PERF.1, artefacto de referencia para las próximas fases. |
| `vitest.perf.config.js` | Nuevo: config dedicada de Vitest para `pnpm perf`, no incluida en `pnpm test`. |
| `package.json` | Script `perf` nuevo. |
| `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()` paginado por lotes; `cargarMasMovimientos()`, `_agregarSiguienteLote()`, `_aplanarEntradas()`, `_renderControlCargarMas()`, `_observarControlCargarMas()` nuevos. |
| `modules/dominio/movimientos/index.js` | Acción `movimientos-cargar-mas` registrada vía `registrarAccion()`. |
| `styles/components/domain.css` | Bloque `.movimientos-cargar-mas` (control centrado). |
| `tests/unit/movimientos.test.js` | 8 tests nuevos de paginación. |
| `docs/contexto/inicio.md` | Bloque de Movimientos actualizado; nueva entrada de "Cambios realizados". |
| `docs/HANDOFF.md` | PERF.1 al tope de "últimas 5"; `pnpm perf` en comandos rápidos. |
| `service-worker.js` | v330 → v331. |

---

### refactor(gastos): IN.5, eliminar "Gasto rápido" y el subsistema de pendientes · 2026-07-06

Con TX.9 completa, el formulario completo de gasto registra en pocos toques (categoría + monto, con fecha y cuenta pre-rellenadas). "Gasto rápido" (anotar solo el monto y completar la categoría después) dejó de aportar valor sobre eso: mantener dos flujos para lo mismo solo sumaba complejidad, más una cola de "pendientes por organizar" que el usuario debía volver a completar. Esteban decidió eliminarlo. Se retiró la feature completa y todo su subsistema dependiente, verificando primero que ningún otro flujo lo necesitara.

**Qué se eliminó.** El botón `.quick-add` del dashboard y el modal `#modal-gasto-rapido` (`index.html`); `renderFormGastoRapido()`, `renderPendientesOrganizar()` y el badge "📝 Pendiente" de `_renderGastoItem()` (`view.js`); `validarGastoRapido()`, `normalizarGastoRapido()`, `esGastoPendiente()`, `gastosPendientes()` (`logic.js`); los handlers `_inyectarFormGastoRapido`/`_abrirGastoRapido`/`_guardarGastoRapido`/`_toastGastoRapido`/`_fmtMonto` y la acción `gasto-rapido` (`index.js`); el contenedor `#panel-gastos-pendientes` del bento; los estilos `.quick-add*` y `.quick-toast*` (`forms.css`, keyframes `toastIn/toastOut` conservadas porque las usa el toast de logros).

**Efecto en cadena.** El flag `pendienteCompletar` tenía un único lector (`esGastoPendiente`), ahora eliminado; se dejó de escribir en los 4 dominios que lo ponían (`gastos/logic.js`, `agenda/index.js`, `compromisos/index.js`, `tesoreria/acciones/distribucion.js`). El dato legacy que quede en `localStorage` (gastos viejos con `pendienteCompletar`) simplemente se ignora: no requiere migración porque nada lo lee. Al desaparecer el panel `#panel-gastos-pendientes` que acompañaba al hero, el hero del dashboard pasa a ancho completo (`bento__cell--full`) y se retiró la regla `:has()` que antes lo expandía condicionalmente (`layout.css`).

**Validación.** 2201/2201 unit (25 tests del subsistema retirados de `gastos.test.js`) + 151/151 E2E; el test de reflow a 320px se repuntó del modal de gasto rápido (eliminado) al de ingreso puntual, que también usa `.input--big-amount`. El preview de este entorno funcionó esta vez: se verificó en la app el dashboard con el hero a ancho completo (sin la card ni huecos), la lista de Gastos sin badge, y cero errores en consola. SW v329 → v330.

| Archivo | Cambio |
|---|---|
| `index.html` | Quita el botón `.quick-add`, el modal `#modal-gasto-rapido` y `#panel-gastos-pendientes`; hero a `bento__cell--full`. |
| `modules/dominio/gastos/view.js` | Quita `renderFormGastoRapido`, `renderPendientesOrganizar`, el badge "📝 Pendiente" y el tip del empty state. |
| `modules/dominio/gastos/logic.js` | Quita `validarGastoRapido`, `normalizarGastoRapido`, `esGastoPendiente`, `gastosPendientes`; `normalizarGasto` deja de escribir `pendienteCompletar`. |
| `modules/dominio/gastos/index.js` | Quita los handlers de gasto rápido, la acción `gasto-rapido` y el render de pendientes; título de edición fijo ("Editar gasto"). |
| `modules/dominio/agenda/index.js`, `modules/dominio/compromisos/index.js`, `modules/dominio/tesoreria/acciones/distribucion.js` | Dejan de escribir `pendienteCompletar: false` al crear gastos. |
| `styles/components/forms.css` | Quita `.quick-add*` y `.quick-toast*`; el chevron sale de la regla de `--fk-icon-sm`. |
| `styles/layout.css` | Quita `#panel-gastos-pendientes` y la regla `:has()` del hero. |
| `styles/components.css`, `docs/DESIGN_SYSTEM.md` | Referencias a `.quick-add`/chevron retiradas. |
| `tests/unit/gastos.test.js` | 25 tests del subsistema retirados. |
| `tests/e2e/reflow-320.test.js` | Reflow repunteado al modal de ingreso puntual. |
| `docs/contexto/gastos.md`, `docs/contexto/inicio.md`, `docs/BOARD.md` | IN.5 cerrada; fichas y tablero actualizados. |
| `service-worker.js` | v329 → v330. |

---

### feat(ux): CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta · 2026-07-06

Reporte de Esteban sobre el onboarding: un usuario nuevo que pulsa el botón (+) → "Nuevo ingreso" sin haber creado ninguna cuenta veía el mensaje "Primero necesitas una cuenta", pero el botón "Entendido" solo cerraba el modal y lo dejaba buscando por su cuenta dónde crear la cuenta. Rompía la continuidad del onboarding. Se unificó el patrón de **todos** los bloqueos por "falta una cuenta" bajo un criterio único de UX: si falta un requisito, la app guía a resolverlo, no solo lo informa.

Nueva acción reutilizable `ir-a-crear-cuenta` en `ui/actions.js`: cierra el modal actual, navega a Mis cuentas y emite `EventBus 'cuenta:crear'`. Tesorería lo escucha en `initAccionesCuentas()` (`EventBus.on('cuenta:crear', _nuevaCuenta)`) y abre el formulario de nueva cuenta. El shell no importa el dominio y `infra/cuenta-helper.js` emite el mismo evento tras navegar, sin invertir el layering infra→ui (ADN 10, comunicación por EventBus). Un solo copy, "Crear una cuenta", en los cinco puntos de entrada.

Diagnóstico de la inconsistencia previa: cada surface hacía algo distinto. El **Nuevo ingreso** (`renderFormIngresoPuntual`) usaba `data-action="modal-close"` sobre un `<a href="#tesoreria">`, y como `dispatch()` hace `preventDefault()` para toda `data-action`, el href nunca navegaba: solo cerraba el modal (el bug reportado). Los dos empty states de **Gastos** ya usaban `ir-a-seccion` (navegaban, pero sin abrir el formulario). El **Abono a deuda** (`renderFormAbono`) era un callejón sin salida: solo un botón "Cerrar". El modal guiado `_mostrarGuiadoCero` de `cuenta-helper.js` (que heredan todos los flujos de un clic: Marcar pagado, confirmar gasto multi-cuenta, aportar a meta/apartado) navegaba pero tampoco abría el formulario.

**Validación:** 2226/2226 unit (2 nuevos en `tesoreria.test.js`: el empty state del ingreso puntual expone el CTA `ir-a-crear-cuenta` y ya no `modal-close`/"Entendido"; el evento `cuenta:crear` abre `#modal-cuenta` en modo creación) + 151/151 E2E en navegador real a viewport móvil (2 nuevos en `registrar-sheet.test.js`: registro de ingreso y de gasto sin cuentas → el CTA cierra el modal, navega a `#tesoreria` y abre el form de nueva cuenta con título "Nueva cuenta"). `gastos.test.js` y `compromisos.test.js` actualizados al copy/acción nuevos. Preview de este entorno no disponible (mismo problema recurrente); cubierto por los E2E. SW v328 → v329.

| Archivo | Cambio |
|---|---|
| `modules/ui/actions.js` | Acción `ir-a-crear-cuenta` (cierra modal + `navigate('tesoreria')` + `EventBus.emit('cuenta:crear')`); import de `EventBus`. |
| `modules/dominio/tesoreria/acciones/cuentas.js` | `EventBus.on('cuenta:crear', _nuevaCuenta)` en `initAccionesCuentas()`; import de `EventBus`. |
| `modules/infra/cuenta-helper.js` | `_mostrarGuiadoCero`: botón "Crear una cuenta" que emite `cuenta:crear` tras navegar; import de `EventBus`. |
| `modules/dominio/tesoreria/views/ingresos.js` | Empty state: CTA `ir-a-crear-cuenta` "Crear una cuenta" (era `modal-close` "Entendido", el bug). |
| `modules/dominio/gastos/view.js` | Empty states de Gasto rápido y Gasto completo: CTA `ir-a-crear-cuenta` "Crear una cuenta" (eran `ir-a-seccion`). |
| `modules/dominio/compromisos/views/formularios.js` | Empty state de Abono: agrega CTA "Crear una cuenta" junto a "Ahora no" (era solo "Cerrar"). |
| `tests/unit/tesoreria.test.js` | 2 tests nuevos. |
| `tests/unit/gastos.test.js`, `tests/unit/compromisos.test.js` | Aserciones actualizadas al copy/acción nuevos. |
| `tests/e2e/registrar-sheet.test.js` | 2 tests E2E nuevos (registro sin cuentas). |
| `docs/contexto/transversal.md` | Bloque nuevo del patrón CTA "necesitas una cuenta". |
| `service-worker.js` | v328 → v329. |

---

### feat(gastos): TX.9b, categorías personalizadas · 2026-07-05

Segunda y última fase de TX.9 (brief de Esteban: categoría primero, categorías personalizadas, sin descripción redundante). Al elegir "+ Otra categoría" en el select del formulario de gasto, se revela un campo de nombre y una grilla de íconos, en el mismo formulario (sin modal anidado, reusando el patrón ya establecido de `hint-categoria-fija`).

`ICONOS_CATEGORIA_PERSONALIZADA` (29 entradas, `constants.js`) cura los símbolos `c-*` del sprite que ya existían pero no estaban asignados a ninguna categoría nativa en `CATEGORIA_ICONO`: se descubrió que el sprite tiene 43 símbolos `c-*` en total, repartidos entre 7 catálogos distintos (gastos, ingresos, agenda, deuda, deuda personal, deuda-personal-relación, metas), de los cuales solo ~18 estaban en uso dentro del catálogo de Gastos. Los 29 restantes son exactamente el pool que hacía falta, sin trabajo de diseño nuevo. Cada entrada trae una etiqueta en español (ej. "Gimnasio" para `c-pesa`) para el `aria-label` del botón.

`validarCategoriaPersonalizada({ nombre, icono }, existentes)` exige nombre no vacío, sin duplicar (insensible a mayúsculas y tildes, vía `.normalize('NFD')` + `\p{Diacritic}`) ninguna categoría nativa de `CATEGORIAS_GASTO` ni una personalizada ya creada, más un ícono elegido del catálogo curado. Al enviar el formulario, la categoría se persiste primero (`guardar('categoriasPersonalizadas', { nombre, icono })`, bump de schema v23 → v24, migración idempotente) y su nombre pasa a ser la `categoria` del gasto: en usos futuros aparece como una opción normal del select, bajo `<optgroup label="Tus categorías">`, indistinguible de una nativa para el resto de la app.

`iconoDeCategoriaGasto(categoria, personalizadas)` (nuevo, en `core/constants.js` en vez de `gastos/logic.js`, para que `movimientos/logic.js` también pueda importarlo sin violar ADN 10 "ningún dominio importa a otro") resuelve nativa primero, personalizada después, y el genérico `i-gastos` como último recurso. Se usa tanto en `_renderGastoItem()` (lista de Gastos) como en `movimientosDesdeGastos()` (Movimientos, TX.8): una categoría personalizada muestra su ícono correcto en ambos lugares, no solo donde se creó.

Encontrado durante el desarrollo: el primer intento de `validarCategoriaPersonalizada()` solo comparaba en minúsculas (`toLocaleLowerCase()`), sin la insensibilidad a tildes que el propio docstring ya prometía; un test escrito con una tilde de más ("mercadó" vs "Mercado") lo detectó antes de cerrar la tarea. Se corrigió agregando `.normalize('NFD').replace(/\p{Diacritic}/gu, '')` a la comparación.

**Validación:** 2224/2224 unit (32 tests nuevos: `constants.test.js` verifica que el catálogo curado no repite ningún ícono ya usado en `CATEGORIA_ICONO` y que cada uno existe en el sprite; `gastos.test.js` cubre validación y los elementos nuevos del formulario; `movimientos.test.js` cubre la resolución del ícono personalizado; `storage.test.js` cubre la migración v23→v24) + 149/149 E2E verdes en navegador real (Playwright), incluido 1 test nuevo de extremo a extremo: crear "Gimnasio" con ícono, verla en la lista, y reutilizarla en un segundo gasto sin que el select duplique la opción. Preview de este entorno no disponible (mismo problema recurrente).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `ICONOS_CATEGORIA_PERSONALIZADA` (29 íconos curados), `iconoDeCategoriaGasto()`. |
| `modules/core/state.js` | `S.categoriasPersonalizadas` (default `[]`). |
| `modules/core/storage.js` | Migración v23 → v24; `SCHEMA_VERSION = 24`. |
| `modules/dominio/gastos/logic.js` | `validarCategoriaPersonalizada()` nuevo. |
| `modules/dominio/gastos/view.js` | `renderFormGasto()`: optgroup de personalizadas + opción "+ Otra categoría" + selector de ícono inline; `CATEGORIA_NUEVA_VALUE` exportado; `_renderGastoItem()` usa `iconoDeCategoriaGasto()`. |
| `modules/dominio/gastos/index.js` | Reveal/hide de los campos nuevos y click del selector de ícono en `_montarFormGasto()`; creación y persistencia de la categoría en `_guardarGasto()`. |
| `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` recibe `categoriasPersonalizadas` y usa `iconoDeCategoriaGasto()`. |
| `modules/dominio/movimientos/view.js` | Pasa `S.categoriasPersonalizadas` a `movimientosRecientes()`/`movimientosCompletos()`. |
| `styles/components/forms.css` | Bloque `.icono-picker*` (primer selector de ícono de la app). |
| `tests/unit/constants.test.js` | 8 tests nuevos (catálogo curado + resolver). |
| `tests/unit/gastos.test.js` | 15 tests nuevos (validación + formulario). |
| `tests/unit/movimientos.test.js` | 2 tests nuevos. |
| `tests/unit/storage.test.js` | 2 tests nuevos (migración v24). |
| `tests/e2e/smoke.test.js` | 1 test nuevo. |
| `docs/contexto/gastos.md` | TX.9 completa (9a + 9b) cerrada. |
| `docs/BOARD.md` | Tarjeta TX.9b cerrada y borrada. |
| `service-worker.js` | v327 → v328. |

---

### feat(gastos): TX.9a, categoría primero + descripción ya no obligatoria · 2026-07-05

Primera de dos fases de TX.9 (brief de Esteban sobre el formulario de gasto: categoría primero, categorías personalizadas, sin descripción redundante). Primer análisis a fondo de la sección Gastos, documentado en [`docs/contexto/gastos.md`](contexto/gastos.md) (regla 2.6 de `/CLAUDE.md`); la tarjeta original se dividió en **TX.9a** (esta) y **TX.9b** (categorías personalizadas, siguiente fase) por tocar reordenamiento de formulario, redefinición de una señal existente y un modelo de dato nuevo sin precedente en la misma tarjeta.

Categoría pasa a ser el primer campo de `renderFormGasto()` (antes el 4° de 5). El campo Descripción se quitó del formulario: la categoría es ahora el concepto principal del gasto, y `validarGasto()` ya no la exige. El campo **Nota** opcional que pedía el brief ya existía desde antes (agregado en una fase previa sin tarjeta propia); esta tarea no tuvo que crearlo, solo reordenar alrededor de él.

`normalizarGasto()` solo incluye la clave `descripcion` en el objeto devuelto si el caller la trae (ningún caller ya lo hace desde el formulario). Esto importa porque `editar()` hace un merge superficial vía `Object.assign`: si `normalizarGasto()` siempre incluyera `descripcion: ''`, cada edición de un gasto antiguo (aunque solo se cambiara el monto) borraría silenciosamente su descripción histórica.

El título del ítem en la lista de Gastos pasa a ser la categoría; una descripción legacy (de gastos registrados antes de este cambio) y la nota se muestran en el subtítulo, junto a la fecha. `esGastoPendiente()`, el criterio que alimenta el panel "Gastos por organizar" de Inicio, se redefinió de "sin descripción" a `pendienteCompletar === true && categoria === 'Otros'` (el valor que Gasto Rápido ya le pone por defecto cuando el usuario no elige categoría real): preserva exactamente la misma función sin depender de un campo que deja de ser obligatorio.

Durante la implementación se encontraron y corrigieron 2 bugs propios: el mensaje de confirmación de borrado y el anuncio de accesibilidad en `_eliminarGasto()` (`gastos/index.js`), y `movimientosDesdeGastos()` en Movimientos (deriva su descripción de la del gasto), leían `gasto.descripcion` sin fallback; con la descripción ahora opcional, ambos habrían mostrado literalmente "undefined" para cualquier gasto creado con el formulario nuevo. Ambos caen ahora a la categoría.

Fuera de alcance de esta fase (documentado explícitamente para no repetir el error de mezclar cards): categorías personalizadas (**TX.9b**) y cualquier detección nueva de gasto hormiga/fantasma, que es tema de **TX.10**, no de TX.9 (la categoría-primero solo abre la puerta, no implementa el motor).

**Validación:** 2198/2198 unit (tests de formulario reordenado, validación, `esGastoPendiente()`/`gastosPendientes()` con la nueva regla, título/subtítulo del ítem con descripción legacy y nota) + 148/148 E2E verdes en navegador real (Playwright); 4 tests de `smoke.test.js` (crear/editar/eliminar gasto) actualizados porque rellenaban un campo del formulario que ya no existe, y el de borrado ahora verifica explícitamente que el mensaje de confirmación no muestre "undefined". Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual de creación completa (categoría, monto, cuenta, fecha, nota) y de Gasto Rápido (monto + cuenta, categoría 'Otros', badge Pendiente).

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js` | `renderFormGasto()` reordenado, sin campo descripción; `_renderGastoItem()` título = categoría, subtítulo con descripción legacy/nota; copy de `renderPendientesOrganizar()` actualizado. |
| `modules/dominio/gastos/logic.js` | `validarGasto()` sin la validación de descripción; `normalizarGasto()` omite `descripcion` si no viene; `esGastoPendiente()` redefinida. |
| `modules/dominio/gastos/index.js` | `_editarGasto()` sin pre-fill de descripción (el campo ya no existe); `_eliminarGasto()` con fallback a categoría; título del modal de edición usa `esGastoPendiente()`. |
| `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()` con fallback de descripción a categoría. |
| `modules/core/state.js` | `Gasto.descripcion` documentado como opcional (`[descripcion]`). |
| `styles/components/forms.css` | `.list-item__placeholder` eliminada (sin consumidores tras el cambio de título). |
| `tests/unit/gastos.test.js` | Tests de `renderFormGasto()`, `validarGasto()`, `esGastoPendiente()`/`gastosPendientes()` y `renderListaGastos()` actualizados/nuevos. |
| `tests/unit/movimientos.test.js` | 1 test actualizado (fallback de descripción). |
| `tests/e2e/smoke.test.js` | 4 tests actualizados. |
| `docs/contexto/gastos.md` | Ficha nueva (primer análisis de la sección); TX.9a cerrada. |
| `docs/BOARD.md` | Tarjeta TX.9a cerrada y borrada; TX.9b es la siguiente fase. |

---

### feat(resumen): IN.4a, accesos rápidos personalizables en Inicio · 2026-07-05

Última fase de la iniciativa "Inicio como centro de control" del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): fila de tiles bajo el hero de Inicio con 1 toque a secciones que hoy quedan detrás de "Más" (Mis cuentas, Deudas, Ahorros, Límites de gasto, Me deben, Análisis, Movimientos, Ajustes), más un botón "Personalizar" que abre un modal con la lista completa: tocar una fila la agrega o la quita, sin drag & drop (ADR 028 D2).

Bump de schema v23: `S.config.accesosInicio` (array ordenado de ids, migración idempotente v22 → v23). El default de 3 secciones no se eligió por preferencia personal (Esteban lo pidió explícitamente objetivo): se evaluaron las 8 candidatas por frecuencia real de autoconsulta y por si ya tienen presencia en Inicio hoy. Resultado: **Mis cuentas, Ahorros, Límites de gasto**, el mismo patrón que usan Mint/YNAB/Fintonic como pantalla principal (cuentas + presupuesto + metas); Deudas queda cubierta parcialmente por "Pendientes del mes", Análisis por el Resumen semanal, y Me deben/Ajustes/Movimientos son nicho o ya están a 1 tap por otra vía.

Dominio nuevo `modules/dominio/accesos/` (`logic.js` puro: `accesosVisibles()` resuelve ids contra el catálogo, `alternarAcceso()` agrega/quita de forma inmutable; `view.js`: `renderAccesosInicio()` y `renderModalPersonalizarAccesos()`; `index.js`: acciones `accesos-personalizar`/`accesos-toggle`). Reutilización máxima de componentes existentes: los tiles son `.menu-mas__item`/`__icon`/`__label` tal cual (mismo color por dominio que ya usa el menú "Más" vía `[data-section]`, cero CSS de color nuevo) y las filas del modal reusan `.list-item`/`tejaCategoria()` (mismo patrón que Movimientos/Gastos).

Bug propio detectado durante el desarrollo: el texto instructivo del modal usaba la clase `.confirm__mensaje`, que los tests E2E ya trataban como el identificador único del mensaje del modal de confirmación activo (`smoke.test.js`); al vivir siempre en el DOM (el modal no se desmonta, solo se oculta), rompía ese selector con un "strict mode violation" de Playwright en un test de Metas sin relación funcional con esta tarea. Se corrigió reusando `.form-hint` (helper genérico ya existente en `forms.css`), sin tocar el contrato de `.confirm__mensaje`.

**Validación:** 2188/2188 unit (20 tests nuevos: `accesos.test.js` con lógica pura, render de tiles/modal y toggle end-to-end vía `dispatch()`; 3 tests de migración v22→v23 en `storage.test.js`). 148/148 E2E verdes en navegador real (Playwright), incluida la corrección del test de Metas que la colisión de clase rompía. Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual: tiles default en Dashboard → abrir Personalizar → quitar/agregar una sección → cierre y verificación de que el tile row se actualiza en vivo → navegar a otra sección y volver (persiste) → tocar un tile navega a la sección real. SW v326 → v327.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `ACCESOS_INICIO` (catálogo de 8 secciones), `ACCESOS_INICIO_DEFAULT`. |
| `modules/core/state.js` | `S.config.accesosInicio` con el default. |
| `modules/core/storage.js` | Migración v22 → v23; `SCHEMA_VERSION = 23`. |
| `modules/dominio/accesos/logic.js` | Nuevo: `accesosVisibles()`, `alternarAcceso()`. |
| `modules/dominio/accesos/view.js` | Nuevo: `renderAccesosInicio()`, `renderModalPersonalizarAccesos()`. |
| `modules/dominio/accesos/index.js` | Nuevo: `initAccesos()`, acciones `accesos-personalizar`/`accesos-toggle`. |
| `modules/ui/bootstrap.js` | Import + llamada a `initAccesos()`. |
| `index.html` | Fila de tiles bajo el hero (`#accesos-inicio-grid`), modal `#modal-personalizar-accesos`. |
| `styles/components/domain.css` | Bloque `ACCESOS-INICIO` (grilla auto-fit de tiles). |
| `styles/components/atoms.css` | `.accesos-row*` (fila toggleable del modal). |
| `tests/unit/accesos.test.js` | Nuevo: 17 tests. |
| `tests/unit/storage.test.js` | 3 tests nuevos (migración v23). |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | IN.4a cerrada; dominio `accesos/` indexado. |
| `docs/BOARD.md` | Tarjeta IN.4a cerrada y borrada; iniciativa del ADR 028 completa salvo IN.6b. |
| `service-worker.js` | `accesos/` agregado a `CORE_ASSETS`; v326 → v327. |

---

### feat(movimientos): TX.8b, vista completa + Gastos acota categorías internas · 2026-07-05

Cuarta y última fase de la iniciativa TX.8 del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): vista completa del historial de Movimientos en ruta propia `#movimientos` (sin ícono fijo en la barra de navegación; se llega por el link "Ver todo" del panel compacto de Inicio, o por hash directo). Cronológica, agrupada por mes ("Julio 2026"), sin totales: el resumen financiero (ingresos/egresos/variación) sigue siendo dueño exclusivo de Análisis (ADR 028 D5).

Cada `Movimiento` (`movimientos/logic.js`) ahora lleva un campo `dominio` (`gastos`, `compromisos`, `ingresos` o `ahorro`, según el tipo y la categoría interna del gasto) que colorea la teja del ícono con `tejaCategoria()`, el mismo patrón que usan Gastos y Deudas. `movimientosCompletos()` es nuevo: reusa `movimientosRecientes()` con límite `Infinity`, sin duplicar la lógica de combinación/orden de las 3 fuentes.

En paralelo, `renderListaGastos()` y `renderFiltrosGastos()` (`gastos/view.js`) dejan de mostrar las categorías internas ('Deudas' = abonos, 'Gastos fijos' = pagos del Calendario) vía el filtro `_sinInternas()`: Gastos queda enfocada en gasto cotidiano, incluido el total del resumen del mes. `S.gastos` no se toca, así que Análisis y Límites (que siguen leyendo todo el historial) no se ven afectados.

Se corrigió de paso un hueco de TX.8a: `modules/dominio/movimientos/{logic,view,index}.js` no estaban en `CORE_ASSETS` del service worker (ausentes del precache offline desde que se creó el dominio).

**Validación:** 2168/2168 unit (17 tests nuevos en `movimientos.test.js`: campo `dominio` por fuente, `movimientosCompletos()`, `renderMovimientosCompletos()` con lista completa/cuenta/agrupación por mes/teja por dominio/link "Ver todo"; 7 tests nuevos en `gastos.test.js` para la exclusión de internas en lista, chips y total). E2E smoke 82/82 y navegación 7/7 verdes en navegador real (Playwright), incluida una regresión nueva para la ruta sin ícono de nav (mismo patrón que las demás secciones en `navegacion-render.test.js`). Preview de este entorno no disponible (mismo problema recurrente); verificado además con un flujo manual Dashboard → "Ver todo" → Movimientos con datos reales (cuenta, mes, colores por dominio confirmados visualmente). SW v325 → v326.

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/logic.js` | Campo `dominio` en `movimientosDesdeGastos()`/`...IngresosPuntuales()`/`...Aportes()`; `movimientosCompletos()` nuevo. |
| `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()`, `_agruparPorMes()`, `_renderMovimientoItem()`, link "Ver todo" en `renderActividadReciente()`. |
| `modules/dominio/movimientos/index.js` | `_renderTodo()` wiring `renderSmart(..., 'movimientos')` además de `'dash'`. |
| `modules/dominio/gastos/view.js` | `_CATEGORIAS_INTERNAS`, `_sinInternas()` aplicado en `renderListaGastos()`/`renderFiltrosGastos()`. |
| `modules/infra/router.js` | `SECTIONS` suma `['movimientos', 'sec-movimientos']`. |
| `index.html` | Sección `#sec-movimientos` nueva (sin ícono en `.nav-item`). |
| `styles/components/domain.css` | Bloque `MOVIMIENTOS` (divisor de mes), `.actividad-reciente__ver-todo`. |
| `styles/components/atoms.css` | `.list-item__amount--ingreso`. |
| `tests/unit/movimientos.test.js` | 17 tests nuevos. |
| `tests/unit/gastos.test.js` | 7 tests nuevos. |
| `tests/e2e/navegacion-render.test.js` | 1 test nuevo. |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8b cerrada; dominio actualizado. |
| `docs/BOARD.md` | Tarjeta TX.8b cerrada y borrada. |
| `service-worker.js` | `movimientos/` agregado a `CORE_ASSETS`; v325 → v326. |

---

### feat(movimientos): TX.8a, dominio nuevo + Actividad reciente en Inicio · 2026-07-05

Tercera fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): Inicio muestra un panel "Actividad reciente" con los últimos 5 movimientos de la app, derivados sin log paralelo (D5 del ADR) desde `S.gastos`, `S.ingresosPuntuales` y `S.ahorro.aportes`.

Dominio nuevo `modules/dominio/movimientos/` (`logic.js` puro, `view.js`, `index.js`). `logic.js` no lee `S` ni importa otros dominios (ADN 10): `view.js` extrae los arrays y se los pasa. Cada fuente se normaliza a un shape común `{ id, fecha, tipo, descripcion, monto, direccion, icono, cuentaId }`; se combinan y ordenan por fecha descendente, límite 5.

Ajuste menor a `constants.js`: se agregó `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'` (la categoría interna que crean los pagos de fijos no tenía ícono propio y caía al genérico `i-gastos`); `'Deudas'` y `'Ahorro'` ya tenían íconos, así que no hizo falta tocar más el catálogo ni importar `iconoPorOrigen()` de `gastos/logic.js` (habría violado ADN 10).

CSS nuevo `.actividad-reciente*` en `domain.css`, siguiendo el mismo patrón visual que `vencidos-card`/`prioridades-card` (header + lista de ítems con ícono, descripción, "hace N días" vía `tiempoRelativo()` ya existente, y monto con signo `+`/`-` según dirección).

**Validación:** 2145/2145 unit (26 tests nuevos en `movimientos.test.js`: normalización de las 3 fuentes, orden/límite, render oculto/visible/límite de 5 en el DOM). E2E smoke 82/82 verde en navegador real (Playwright), confirmando que el dominio nuevo carga sin errores. Preview de este entorno no disponible (mismo problema recurrente). SW v324 → v325.

| Archivo | Cambio |
|---|---|
| `modules/dominio/movimientos/logic.js` | Nuevo: `movimientosDesdeGastos()`, `movimientosDesdeIngresosPuntuales()`, `movimientosDesdeAportes()`, `movimientosRecientes()`. |
| `modules/dominio/movimientos/view.js` | Nuevo: `renderActividadReciente()`. |
| `modules/dominio/movimientos/index.js` | Nuevo: `initMovimientos()`, registro en `state:change`/`hashchange`/`registrarRender`. |
| `modules/ui/bootstrap.js` | Import + llamada a `initMovimientos()`. |
| `modules/core/constants.js` | `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'`. |
| `index.html` | `#panel-actividad-reciente` en el bento de Inicio, antes de "Resumen de la semana". |
| `styles/components/domain.css` | Bloque `ACTIVIDAD-RECIENTE` nuevo. |
| `tests/unit/movimientos.test.js` | Nuevo: 26 tests. |
| `docs/contexto/inicio.md`, `docs/MAPA.md` | TX.8a cerrada; nuevo dominio indexado. |
| `docs/BOARD.md` | Tarjeta TX.8a cerrada y borrada. |
| `service-worker.js` | v324 → v325. |

---

### feat(tesoreria): CAL.1, nudge de distribución del ingreso en Inicio · 2026-07-05

Segunda fase del [ADR 028](DECISIONS/028-inicio-centro-de-control.md): el bloque "Atención hoy" de Inicio ahora muestra un nudge cuando llegó el cobro del periodo y aún no se ha distribuido ("Hoy recibes tu ingreso" / "Recibiste tu ingreso el {fecha}"), con un botón "Distribuir ahora".

Hallazgo clave durante la implementación: `modules/dominio/tesoreria/logic/distribucion.js` ya tenía `estadoDistribucion()`, la función que decide si el cobro del periodo ya llegó y si ya se distribuyó, y `S.config.ultimaDistribucionPeriodo` ya era el marcador de de-duplicación (lo usa el panel equivalente de Mis cuentas desde antes). El ADR 028 D4 anticipaba un "marcador anti-insistencia nuevo dentro del bump v23"; no hizo falta: el nudge de Inicio reutiliza el guard existente sin tocar el schema. El CTA emite el mismo `distribuir:abrir` que ya usa el recordatorio de día de ingreso del Calendario (ADR 021), así que el Calendario no perdió nada: sigue marcando visualmente el día y su tap sigue abriendo el asistente.

Renderizado por **tesorería** (dueña del asistente y de `S.ingresos`), no por el dominio de Inicio: `renderNudgeDistribucionInicio()` nuevo en `views/distribucion.js`, registrado en `tesoreria/index.js` vía `registrarRender()` (mismo patrón que usan los paneles del dashboard de `compromisos`). Reutiliza el componente `.nudge`/`.nudge-info` ya existente en el sistema de diseño (cero CSS nuevo).

**Validación:** 2119/2119 unit (7 tests nuevos: oculto sin ingresos datables, oculto con cobro pendiente, visible con "hoy", visible con fecha de atraso, oculto una vez distribuido, el CTA emite el evento correcto). E2E smoke 82/82 verde en un navegador real (Playwright), incluido el flujo "Distribuir abre el asistente en Mis cuentas". Preview de este entorno no disponible (mismo problema recurrente de sesiones anteriores). SW v323 → v324.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/views/distribucion.js` | `renderNudgeDistribucionInicio()` nuevo. |
| `modules/dominio/tesoreria/acciones/distribucion.js` | `_distribuirDesdeInicio()` + acción `distribuir-desde-inicio`. |
| `modules/dominio/tesoreria/view.js` | Re-export de `renderNudgeDistribucionInicio`. |
| `modules/dominio/tesoreria/index.js` | Registro del render en `state:change`, `hashchange` y `registrarRender()`. |
| `index.html` | `#panel-distribuir-inicio` en el bento de Inicio, antes de "Gastos por organizar". |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos para `renderNudgeDistribucionInicio()`. |
| `docs/contexto/inicio.md` | CAL.1 cerrada; corrección del alcance del bump v23 (sin el marcador que anticipaba el ADR). |
| `docs/BOARD.md` | Tarjeta CAL.1 cerrada y borrada. |
| `service-worker.js` | v323 → v324. |

---

### feat(resumen): IN.6a, saludo dinámico con nombre en Inicio · 2026-07-05

Primera fase implementada del [ADR 028](DECISIONS/028-inicio-centro-de-control.md) (aprobado el mismo día). "Buenos días / Buenas tardes / Buenas noches, {nombre}" según la hora local, bajo el título de Inicio. Usa `S.perfil.nombre` (existía desde el onboarding, ninguna vista lo leía); sin nombre, saluda sin él. Sin dato nuevo, sin migración de schema (D3 del ADR). Franjas: 5 a 11 días, 12 a 18 tardes, resto (19 a 23 y 0 a 4) noches.

`updSaludo()` nuevo en `modules/infra/render.js`, junto a `updSaldo()` (mismo patrón: lee `S` directo, actualiza un elemento del dashboard, se invoca desde `renderAll()`). Elemento `#saludo-inicio` agregado en `index.html` bajo `#title-dash`, reutilizando la clase `.section__subtitle` ya existente.

**Validación:** 2112/2112 unit (6 tests nuevos con reloj falso para las 3 franjas horarias, sin nombre, `S.perfil` ausente y contenedor ausente). Preview no disponible en este entorno (mismo problema de sesiones anteriores, el servidor no llega a "running"); verificado por render happy-dom directo del DOM. SW v322 → v323.

| Archivo | Cambio |
|---|---|
| `modules/infra/render.js` | `updSaludo()` nuevo, invocado desde `renderAll()`. |
| `index.html` | `#saludo-inicio` bajo el título de Inicio. |
| `tests/unit/render.test.js` | 6 tests nuevos para `updSaludo()`. |
| `docs/contexto/inicio.md` | Ficha actualizada: IN.6a cerrada, riesgo del perfil resuelto. |
| `docs/BOARD.md` | Tarjeta IN.6a cerrada y borrada. |
| `service-worker.js` | v322 → v323. |

---

### docs(adr): ADR 028 propuesto, Inicio como centro de control · 2026-07-05

Cierre del análisis conjunto del cluster de Inicio. [ADR 028](DECISIONS/028-inicio-centro-de-control.md) (**aprobado por Esteban el mismo día**) define la arquitectura de información de la pantalla: un rol único por bloque en orden vertical fijo (saludo, hero, accesos rápidos, atención hoy, próximas prioridades, actividad reciente, resumen semanal) y re-corta los briefs del usuario en 6 fases verificables por separado.

Decisiones principales: accesos rápidos data-driven con catálogo + personalización por lista, sin drag & drop en v1 (D2); saludo dinámico ya, avatar ilustrado propio después, fotografía descartada por el cupo de `localStorage` (D3); el aviso de distribución del ingreso pasa a Inicio como nudge de tesorería reutilizando el `distribuir:abrir` existente, y el Calendario conserva la visualización temporal (D4); Movimientos se **deriva** de los registros existentes (`S.gastos` con categorías internas, `S.ingresosPuntuales`, `S.ahorro.aportes`) en un dominio nuevo `movimientos`, sin log paralelo, y Gastos deja de listar las categorías internas; el resumen financiero no va en Inicio (Análisis es el dueño, ANL.1) (D5). Un solo bump de schema (v23) concentrará los campos nuevos.

Hechos verificados que sustentan el diseño (en la ficha [`contexto/inicio.md`](contexto/inicio.md)): los pagos de fijos y abonos a deuda ya crean gastos con categorías internas `'Gastos fijos'`/`'Deudas'` (la "mezcla" que reportó el usuario en Gastos es literal); metas y apartados no tienen registros fechados por aporte (limitación aceptada v1); en móvil, 8 secciones quedan a 2 taps detrás de "Más" (el hueco real que llenan los accesos personalizables).

Solo docs: cero cambios de código, app intacta, sin bump de SW. Con el ADR aprobado, la siguiente tarea es **IN.6a** (saludo dinámico), primera fase del orden recomendado.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/028-inicio-centro-de-control.md` | ADR nuevo (aceptado): D1 a D6. |
| `docs/BOARD.md` | Tarjetas IN.4/IN.6/CAL.1/TX.8 re-cortadas en fases IN.6a, CAL.1, TX.8a, TX.8b, IN.4a, IN.6b (+ IN.4b pospuesta); briefs verbatim capturados por el ADR. |
| `docs/contexto/inicio.md` | Estado, pendientes (con los hallazgos nuevos de fuentes de movimientos) y observaciones apuntando al ADR 028. |

---

### fix(resumen): IN.7, Próximas prioridades ya no duplica lo que vence hoy · 2026-07-05

El usuario reportó que un mismo gasto fijo con vencimiento hoy aparecía a la vez en "Pendientes del mes" y en "Próximas prioridades". Causa confirmada en el análisis de la ficha nueva `docs/contexto/inicio.md`: `detectarVencidosCompletos()` (panel Pendientes del mes) y `compromisosProximos()` (panel Próximas prioridades) tratan "vence hoy" como `diasAtraso = 0` y `diasRestantes = 0` respectivamente, sin exclusión mutua.

Fix acotado a la vista: `renderPanelPrioridades()` filtra `diasRestantes > 0` sobre los compromisos antes de combinarlos con préstamos personales y apartados. No se tocó `compromisosProximos()` en `logic.js`: otros consumidores (`nivelAlertaMora`, el nudge de mora inminente) siguen necesitando el día 0. Los préstamos personales y apartados que vencen hoy sí siguen mostrándose en Próximas prioridades porque no tienen un panel de vencidos propio.

Primer paso del análisis conjunto de Inicio (IN.4, IN.6, IN.7, CAL.1, TX.8, ver BOARD): quedó documentado en la ficha `docs/contexto/inicio.md`, nueva, con el mapa completo del dashboard actual. Un hallazgo relevante para el resto del cluster: hoy solo existe **1** acceso rápido (Gasto rápido), no 3 como describía el brief original de IN.4.

**Validación:** 2 tests migrados de `DIA_HOY` a un nuevo `DIA_MANANA` (dejaron de aplicar al caso "vence hoy" tras el fix) + 2 tests de regresión nuevos (uno confirma que un compromiso de hoy ya no aparece en Próximas prioridades, otro confirma que un préstamo personal o apartado de hoy sigue apareciendo). 2106/2106 unit; verificación en preview no disponible en este entorno (servidor de otra sesión ocupando el puerto), verificación por render happy-dom del DOM real del panel. SW v321 → v322.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelPrioridades()` filtra `diasRestantes > 0` en la fuente de compromisos. |
| `tests/unit/compromisos.test.js` | `DIA_MANANA` nuevo; 3 tests migrados de `DIA_HOY`; 2 tests de regresión nuevos. |
| `docs/contexto/inicio.md` | Ficha nueva: mapa exhaustivo del dashboard actual, base del análisis conjunto IN.4/IN.6/CAL.1/TX.8. |
| `docs/BOARD.md` | Tarjeta IN.7 cerrada y borrada; nota de alcance restante (recomendaciones anticipadas) enlazada a CAL.1/LIM.1/TX.10. |
| `service-worker.js` | v321 → v322. |

---

### docs(adr): BR.4, ADR 027 formaliza la excepción de logo a color · 2026-07-05

Cierre de la iniciativa Biblioteca de recursos gráficos: registro formal, en un ADR nuevo, de una decisión que Esteban ya había tomado e implementado sin ADR (deuda de proceso señalada en BR.3). [ADR 027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md) amplía la sección D2 de [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) ("glifos monocromos de un solo path") con la excepción `data-fullcolor`, ya vigente en los 11 bancos/billeteras reales de `BANCOS_CO`.

Contenido del ADR: cuándo aplica la excepción (D1, juicio humano: marcas cuya identidad ES el color), el marcado `data-fullcolor="true"` (D2), archivo autónomo conservado byte a byte sin conversión de colores (D3), color de teja igual al color del propio fondo del logo, con el criterio de esquinas para degradados/mosaicos ya usado en BR.3 (D4), el guardarraíl técnico de `fill`/`stroke` explícitos que previene el bug del contorno fantasma (`0f143f9`) en cualquier símbolo fullcolor futuro (D5), IDs de degradado prefijados por slug (D6) y su convivencia con la fidelidad D5 de ADR 025 (D7). También actualiza la línea "Estado" de ADR 025 para apuntar hacia el nuevo ADR.

Con BR.4 cerrada, la iniciativa Biblioteca de recursos gráficos (ADR 026 + ADR 027) queda completa: BR.1, BR.2, BR.3, BR.4 y BR.5 sin pendientes. Solo documentación: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md` | ADR nuevo: excepción de logo a color (`data-fullcolor`), D1 a D7. |
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | Línea "Estado" actualizada: referencia hacia ADR 027. |
| `docs/contexto/transversal.md` | Ficha actualizada: BR.4 pasa de pendiente a cambio realizado, `Verificado contra` al día. |
| `docs/BOARD.md` | Tarjeta BR.4 cerrada y borrada; iniciativa Biblioteca de recursos gráficos marcada **COMPLETA**. |

---

### feat(assets): BR.3 completa, los 11 bancos/billeteras de BANCOS_CO a color · 2026-07-05

Cierre de la iniciativa de biblioteca gráfica para banca CO. Esteban entregó, en el mismo lote, exports de Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, DaviPlata, Lulo Bank y Nubank, y minutos después (en vivo, mientras se integraban los anteriores) también Banco de Occidente y AV Villas: **9 bancos de un tirón**. Con Bancolombia, Banco de Bogotá y Nequi ya cerrados antes, **los 11 bancos/billeteras de `BANCOS_CO` quedan con glifo oficial a color**; el único sin símbolo es "Otro" (deliberado: no es una entidad real, es el fallback genérico).

Los 9 nuevos llegaron como exports crudos de Illustrator, cada uno con su propia imagen de calco incrustada (mismo patrón ya visto en Banco de Bogotá): BR.5 (cerrada en el commit anterior) resolvió automáticamente la limpieza del envoltorio, y la imagen se retiró de los 9 con el mismo criterio ya aprobado (cero diferencia visual, solo cruft). Dos casos particulares: DaviPlata y Davivienda usan degradado (`Degradado_sin_nombre_N`, nombre en español de Illustrator, que BR.5 no contemplaba); se amplió el regex de renombrado de degradados de BR.5 para reconocer ese patrón además del inglés. Banco de Occidente construye su fondo con un mosaico de 5 polígonos en diagonal (no un rect plano) más una marca en degradado encima.

**Color de teja para los casos sin fondo plano:** DaviPlata, Davivienda y Banco de Occidente no tienen un único color de fondo (degradado o mosaico); se eligió el tono que coincide exacto con al menos 2 de las 4 esquinas del glifo (verificado por muestreo de píxeles en canvas a 240×240), mismo criterio ya aceptado para Banco de Bogotá.

**Ajuste de tests:** con el catálogo completo, ya no queda ningún banco/billetera real sin glifo para ejemplificar el fallback de iniciales (los 3 tests que usaban Davivienda como ejemplo apuntaban a un caso que dejó de existir). Se migraron a "Otro" (para el test que llama a `bancoAvatar()` directo, el único BANCOS_CO restante sin `simbolo`) y a "ChatGPT" de `MARCAS` (para los 2 tests de flujo completo vía `resolverMarca()`, que sigue sin glifo).

**Validación:** 2104/2104 unit (3 fixtures migrados); 147/147 E2E; lint limpio; sync sin errores. Verificación visual: los 9 glifos renderizan completos (0% píxeles transparentes inesperados, muestreo en canvas) y los 3 casos de color aproximado calzan en al menos 2 esquinas exactas. SW v320 → v321.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{banco-popular,bbva,daviplata,davivienda,lulo-bank,nubank,scotiabank-colpatria,av-villas,banco-occidente}.svg` | 9 logos a color nuevos (imagen de calco retirada, `data-fullcolor`, fill/stroke explícitos). |
| `scripts/sync-sprite.py` | Regex de degradados amplia a `Degradado_sin_nombre_N` (Illustrator en español); limpieza de `data-name`. |
| `modules/core/constants.js` | 9 entradas de `BANCOS_CO`: `simbolo` nuevo + `color` actualizado al fondo real del logo. |
| `index.html` | Sprite regenerado: 110 símbolos (9 nuevos). |
| `tests/unit/{agenda,bancos,compromisos}.test.js` | 3 fixtures migrados de Davivienda (ya con glifo) a Otro/ChatGPT. |
| `service-worker.js` | v320 → v321. |
| `docs/BOARD.md` | Tarjeta BR.3 cerrada y borrada; BR.4 actualizada (ya no pendiente de bancos, solo del ADR). |
| `docs/contexto/transversal.md` | Ficha actualizada: estado, riesgos y cambios realizados. |

---

### feat(assets): BR.5, el sync normaliza exports crudos de Illustrator · 2026-07-05

Cierra la fricción detrás de las dos limpiezas manuales que ya hicieron falta en BR.3 (Nequi, Banco de Bogotá): `scripts/sync-sprite.py` ahora normaliza el envoltorio típico de un export crudo de Adobe Illustrator **antes** de validar, y reescribe el archivo limpio de vuelta en `assets/svg/` (la biblioteca sigue siendo la fuente de verdad; el guardarraíl byte a byte de `sprite-sync.test.js` sigue válido porque compara contra el archivo ya normalizado en disco).

**Qué normaliza automáticamente** (`normalizar_export_illustrator()`):

- Declaración XML, `id="Capa_1"`, `version`, comentario del generador: se quitan.
- `xlink:href` → `href` (namespace `xlink` innecesario, se retira si quedó vacío).
- IDs de degradado por defecto de Illustrator (`linear-gradient`, `linear-gradient1`...): se renombran con el nombre del propio archivo como prefijo (`banco-bogota-g0`, `banco-bogota-g1`...), reescribiendo también sus referencias (`url(#...)`, `href="#..."`). Un id ya prefijado a mano (`bbog-g0`) no matchea el patrón y queda intacto: idempotente.
- `<g>` bare (sin `transform`/`class`/`style`) envolviendo el bloque final de paths: se desenvuelve.

**Lo que deliberadamente NO automatiza** (sigue siendo decisión humana): `fill`/`stroke` explícitos por elemento y `data-fullcolor="true"` (el sync los exige, no los adivina); una `<image>` incrustada se **rechaza con un error explicando la causa probable** (capa de calco/referencia olvidada), nunca se borra en silencio.

**Validación:** probado con exports sintéticos replicando los dos casos reales (Nequi, Banco de Bogotá) más un ícono simple, confirmando normalización correcta e idempotencia; corrida real contra la biblioteca ya limpia: `index.html ya estaba sincronizado (sin cambios)`, `bbog-g0` intacto. 2104/2104 unit; 147/147 E2E; lint limpio. SW v319 → v320.

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Paso 0 nuevo: `normalizar_export_illustrator()` + helpers; reescribe archivos normalizados en `assets/svg/`. |
| `assets/svg/README.md` | Sección 7: qué normaliza el sync vs. qué sigue siendo checklist manual. |
| `service-worker.js` | v319 → v320. |
| `docs/BOARD.md` | Tarjeta BR.5 cerrada y borrada. |

---

### fix(assets): contorno fantasma en logos a color por herencia CSS vía use · 2026-07-05

Esteban reportó desde su celular dos alteraciones visuales que él no diseñó: contorno blanco alrededor del remolino de Banco de Bogotá y un borde morado en Nequi que hacía percibir el logo más morado que rosa. **Los archivos SVG estaban intactos**: la causa raíz es que la clase `.icon` ([forms.css](../styles/components/forms.css), `fill:none; stroke:currentColor; stroke-width:2.35`) aplica esas propiedades al `<svg>` anfitrión de la teja y **se heredan hacia adentro del `<use>`**: todo elemento del símbolo sin `stroke` propio recibe un contorno del color `texto` de la teja (blanco en BdB, morado `#1f0020` en Nequi, que a 2.35 de grosor devoraba el acento rosa de ~4 unidades). Bancolombia nunca lo sufrió porque sus paths sí llevan `stroke="none"` explícito: esa asimetría fue la pista.

**Fix en tres capas** (el diseño de Esteban no se tocó: ni una coordenada, ni un color):

- `stroke="none"` explícito en los 2 paths de `nequi.svg` y los 5 de `banco-bogota.svg` (el atributo de presentación del elemento gana a la herencia CSS).
- `sync-sprite.py` (`_validar_fullcolor`): todo elemento pintable de un logo a color debe declarar `fill` Y `stroke` explícitos, o el recurso se excluye con mensaje explicando la herencia. Ningún logo futuro puede reintroducir el bug.
- Guardarraíl nuevo en `sprite-sync.test.js` vigilando lo mismo sobre los archivos publicados.

**Verificación objetiva** (render en canvas replicando la herencia del CSS, conteo de píxeles a 96px): contorno blanco de BdB 4.587 px → **0**; acento rosa de Nequi 30 px → **235** (su área real de diseño); la N volvió a su peso original (5.165 → 2.954 px de morado).

**Reglas nuevas del usuario registradas** (BOARD transversal + memoria + `assets/svg/README.md` 6b): fidelidad absoluta a los logotipos oficiales, cero contornos/bordes/sombras/efectos agregados; si un logo necesita contraste se ajusta el contenedor, nunca el logo. Flujo de entrega: SVG siempre (fuente de verdad) + PNG 512px de referencia opcional para logos a color (vara de comparación en la revisión en pareja). Se creó además la **primera ficha de contexto** de la metodología nueva: [`contexto/transversal.md`](contexto/transversal.md) (tejas de marca y biblioteca gráfica).

**Validación:** 2104/2104 unit (guardarraíl nuevo incluido); 147/147 E2E; lint limpio; sync idempotente (diff de `index.html` limitado a los 2 símbolos). SW v318 → v319.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{nequi,banco-bogota}.svg` | `stroke="none"` en cada path; diseño intacto. |
| `scripts/sync-sprite.py` | Validador fullcolor exige fill/stroke explícitos en elementos pintables. |
| `tests/unit/sprite-sync.test.js` | Test nuevo: logos a color con fill/stroke explícitos (2103 → 2104). |
| `assets/svg/README.md` | Sección 6b (estándar del logo a color y el porqué) + PNG de referencia en el flujo (sección 9). |
| `index.html` | Sprite regenerado: `b-nequi`, `b-banco-bogota`. |
| `service-worker.js` | v318 → v319. |
| `docs/contexto/{README,transversal}.md` | Primera ficha de contexto activa. |
| `docs/BOARD.md` | Regla de fidelidad ampliada; tarjeta BR.5 nueva (normalización de exports crudos). |

---

### feat(assets): BR.3, rediseño de Nequi a color + limpieza de exports crudos · 2026-07-05

Segunda entrega de BR.3: Esteban reemplazó el wordmark completo de Nequi (descartado por ilegible bajo 40px) por un monograma "N" morado con acento rosa sobre fondo blanco, mismo tratamiento a color que Bancolombia y Banco de Bogotá. De paso llegó un reexport ajustado de Banco de Bogotá.

Ambos archivos llegaron como export crudo de Illustrator (declaración XML, `id="Capa_1"`, comentario del generador, sin `data-fullcolor`). El de Banco de Bogotá además traía una **imagen PNG en base64 incrustada** (una capa de calco/referencia que Illustrator no había ocultado antes de exportar), tapada por completo por los 5 paths vectoriales que sí dibujan el remolino completo: se retiró porque quitarla no cambia ni un píxel de lo renderizado y evita cargar un raster pesado en cada teja. Se estableció una regla nueva de fidelidad: todo SVG que Esteban entrega es la versión oficial, cero simplificación o restilizado sin pedirlo; solo limpieza técnica cuando el resultado es visualmente idéntico (ver nota en `BOARD.md`, transversal).

**Qué entró:**

- `nequi.svg` limpio: `data-fullcolor="true"`, fondo `#fff`, N en `#1f0020`, acento en `#fe0086`. Catálogo (`BANCOS_CO`) actualizado: la teja se pinta ahora del fondo blanco propio del glifo (antes berenjena/magenta corporativo).
- `banco-bogota.svg` reexportado: mismos 5 paths con degradado, coordenadas afinadas, IDs de gradiente re-prefijados `bbog-g0` a `bbog-g4` (convención ya usada), sin la imagen de calco.
- Verificado visualmente en el navegador: ambas tejas renderizan correctas en el picker de banco y en la lista de cuentas (36px), sin regresión.

**Validación:** 2103/2103 unit (1 fixture de color de Nequi actualizado); 147/147 E2E; lint limpio; sync-sprite sin errores (diff de `index.html` limitado a los 2 símbolos tocados). SW v317 → v318.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/nequi.svg` | Nuevo diseño a color (monograma N + acento), reemplaza el wordmark descartado. |
| `assets/svg/logos/bancos/banco-bogota.svg` | Reexport limpio: gradientes re-prefijados, sin imagen de calco incrustada. |
| `modules/core/constants.js` | Nequi: `color` pasa a `#ffffff` (fondo propio del logo a color). |
| `index.html` | Sprite regenerado: `b-nequi` y `b-banco-bogota` actualizados. |
| `tests/unit/bancos.test.js` | Fixture de colores de Nequi actualizado al nuevo fondo/glifo. |
| `service-worker.js` | v317 → v318. |
| `docs/BOARD.md` | Nota de BR.3 actualizada; regla de fidelidad de SVG registrada. |

---

### docs(workflow): metodología de contexto técnico por funcionalidad · 2026-07-05

Pedido del usuario: minimizar el tiempo que la IA gasta localizando información dentro del proyecto y maximizar el dedicado a diseñar, desarrollar y validar. Entra `docs/contexto/`: una ficha por sección de la app y, dentro, un bloque por funcionalidad con objetivo, estado, dónde vive (tabla archivo + ancla por función/export/clase CSS, con la línea como referencia orientativa), recursos gráficos, dependencias y relaciones, riesgos, cambios pendientes y realizados, y un campo `Verificado contra` (commit) para detectar cuándo un bloque quedó desactualizado.

El workflow queda codificado en `CLAUDE.md`:

- **Reutilización (2.6):** antes de analizar, consultar MAPA + la ficha de la sección; solo recorrer el proyecto desde cero si el bloque no existe o quedó viejo. El análisis inicial de una funcionalidad se hace una sola vez, en profundidad (modelo de mayor capacidad si se justifica); las iteraciones siguientes usan el modelo más eficiente que mantenga la calidad.
- **Cierre (2.4):** actualizar la ficha es ahora el paso 1 de la secuencia de docs al cerrar una tarea.
- **Unificar y dividir (2.1):** cero tarjetas duplicadas en el BOARD (la más completa absorbe a las demás); las tareas que tocan varios dominios o capas se parten en subtareas verificables de forma independiente.

Las fichas nacen bajo demanda al trabajar cada funcionalidad por primera vez; no se pre-generan (envejecen mal y cuestan tokens sin retorno). Se auditó el BOARD en busca de duplicados: no hay (BR.3 y BR.4 son entregables distintos de una misma iniciativa, ya agrupados). Solo docs: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/contexto/README.md` | Nuevo: reglas de uso, plantilla de bloque, índice de 14 fichas por sección. |
| `CLAUDE.md` | Sección 2.6 nueva (contexto por funcionalidad); 2.1 ampliada (dividir/unificar); 2.4 con la ficha como paso 1; sección 0 y lectura previa (sección 5) enlazan `docs/contexto/`. |
| `docs/BOARD.md` | Paso "consultar ficha" en el uso del tablero + reglas de tarjetas (sin duplicados, dividir lo grande). |
| `docs/HANDOFF.md` | Entrada de cierre en "Qué se hizo recientemente". |

---

### feat(ui): escala de tokens de iconografía + fix de cascada @layer · 2026-07-05

Revisión completa del sistema de iconografía pedida por el usuario: los iconos se percibían pequeños y difíciles de identificar de un vistazo, en móvil y en escritorio. La auditoría encontró dos problemas: (1) no existía una escala de tamaños (11 valores sueltos hardcodeados entre 14 y 56px repartidos en 9 archivos CSS, contra la regla "nunca hardcodear tamaños") y (2) **un bug de cascada preexistente**: `main.css` importa `layout.css` en una capa `@layer` inferior a `components`, y en capas CSS la capa gana sin importar la especificidad, así que los tamaños declarados en `layout.css` para la navegación (22px), el hero de saldo (32px) y los accesos rápidos (18px) llevaban tiempo perdiendo contra el `.icon` base: **los tres contextos renderizaban a 20px**. Eso explica directamente la percepción de iconos pequeños.

**Qué entró:**

- **Escala de tokens `--fk-icon-*`** en `tokens.css`: 7 pasos (16, 18, 20, 24, 28, 32, 48px) más 2 tamaños de teja (`--fk-teja-md` 32px, `--fk-teja-lg` 36px). Piso de 16px: por debajo, el trazo efectivo del sprite (2.35 × tamaño/24) baja de ~1.5px y pierde nitidez en pantallas 1x o de baja resolución. Documentada en `DESIGN_SYSTEM.md` con la tabla contexto → token.
- **Patrón `--fk-icon-size`** (mismo mecanismo que la chispa `--fk-icon-dot` del ADR 023): `.icon` lee `var(--fk-icon-size, var(--fk-icon-md))` y cada contexto declara la variable en vez de `width`/`height` directos. Las variables atraviesan las capas de `main.css`, así que el fix de cascada queda resuelto de raíz y cualquier capa puede dimensionar iconos sin pelear la cascada. Un solo mecanismo en toda la app.
- **Navegación 22 → 24px** (sidebar y bottom-nav): estándar de Material 3 y Apple HIG para navegación, el contexto más crítico en móvil. El override móvil `width: auto` de la era emoji quedó acotado al wrapper del FAB Registrar (único `<span>` del nav); antes pisaba el ancho de los SVG por la misma razón de capas.
- **Tejas más grandes en listas:** en filas de lista (Gastos, Mis cuentas, Deudas, Metas: el contexto de reconocimiento primario) la teja de categoría/marca sube de 32 a 36px (glifo interno de ~20 a ~22px, ratio 62% constante). En superficies compactas (detalle del calendario, picker, hints) conserva 32px.
- **Ajustes por contexto** (jerarquía, no aumento uniforme): `.icon--sm` 14 → 16px (piso de nitidez); cerrar modal 18 → 20px (acción de escape, separada de las acciones de fila que siguen en 18px); ojo del hero 22 → 24px; chips de vencidos y accesos rápidos 18 → 20px (ratio 62% en caja de 32px); heroes de Ahorro/Inversión 26 → 28px; nudges con SVG 20 → 24px (iguala la masa visual con el emoji de 22px); emoji suelto en filas 18 → 20px.
- **Accesibilidad:** bajo `prefers-contrast: more` el trazo de toda la familia sube un paso (base 2.35 → 2.6, sm 2.75, lg 2) conservando la jerarquía entre escalas (bloque nuevo en `a11y.css`, que por vivir en capa superior le gana a components, esta vez a favor).
- **Rendimiento:** cero costo. Solo cambian valores CSS; el sprite, el número de peticiones y el JS quedan intactos.

**Validación:** 2103/2103 unit (incluye axe-core WCAG 2.1 AA); 147/147 E2E (incluye `reflow-320`); script de verificación de estilos computados en Chromium a 1280x800 y 390x844 (15 chequeos: nav 24px en ambos viewports, FAB 24px en círculo de 46px, teja 36px en lista y 32px suelta, glifo 22.3px, sin overflow del bottom-nav). Capturas desktop y móvil revisadas. SW v316 → v317.

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | Escala `--fk-icon-*` (7 pasos) + `--fk-teja-*` (2 tamaños). |
| `styles/components/forms.css` | `.icon` lee `--fk-icon-size`; `.icon--sm` 16px; cerrar modal 20px. |
| `styles/layout.css` | Nav 24px, hero saldo 32px y accesos 20px vía variable (antes perdían la cascada y quedaban en 20px). |
| `styles/responsive.css` | FAB al patrón de variable; `width: auto` móvil acotado al wrapper del FAB. |
| `styles/modals.css` | Menú Más, tejas de Registrar y volver al patrón de variable. |
| `styles/components/atoms.css` | Teja 36px en filas de lista; emoji de fila a 20px; base de teja tokenizada. |
| `styles/components/nudges.css` | Nudge con SVG a 24px; `bank-avatar` tokenizado. |
| `styles/components/domain.css` | Ojo del hero 24px; chip de vencidos 20px. |
| `styles/components/charts.css` | Chooser de estrategia tokenizado (28px, 24px móvil). |
| `styles/components/analysis.css` | Heroes de Ahorro/Inversión 28px. |
| `styles/a11y.css` | Bloque `prefers-contrast: more` para el trazo. |
| `docs/DESIGN_SYSTEM.md` | Sección "Escala de tamaños" con la tabla contexto → token. |
| `service-worker.js` | v316 → v317. |

---

### feat(assets): logos de marca a color, primeros glifos propios (Bancolombia, Banco de Bogotá) · 2026-07-05

Arranque del flujo de diseño en pareja (BR.3) con los primeros logos que Esteban dibujó en Illustrator. Trae una **decisión de diseño nueva**: algunas marcas cuya identidad **es** el color (Bancolombia: bandera roja/amarilla/azul sobre blanco; Banco de Bogotá: remolino con degradados sobre azul) no se pueden reducir a silueta monocroma sin perderlas. Se introduce el logo **a color** como excepción explícita a la regla de monocromo de [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (pendiente de formalizar en un ADR).

**Qué entró:**

- **Logo a color (`data-fullcolor="true"`):** un logo puede traer sus propios `fill`, su fondo y hasta `<defs>` con degradados. Su teja de catálogo se pinta del color de ese fondo (Bancolombia `#ffffff`, Banco de Bogotá `#003576`), no de un color corporativo con glifo monocromo encima. El archivo es autónomo y funciona igual en ambos temas.
- **`sync-sprite.py` extendido:** detecta `data-fullcolor`, valida con un set ampliado que admite `linearGradient`/`radialGradient`/`stop`/`defs`, y **conserva el cuerpo tal cual** (sin convertir colores) para que biblioteca y sprite queden idénticos byte a byte. Verifica además que los **IDs internos de gradiente sean únicos en todo el sprite** (los de Banco de Bogotá van prefijados `bbog-*`). Un logo a color mal formado sigue cayendo en `ErrorRecurso` (se excluye sin romper la corrida).
- **Degradados vía `<use>` verificados:** los `<defs>` viven dentro del `<symbol>` y renderizan correctamente al instanciarse con `<use>` (validado en el navegador a 16-72px, ambos temas).
- **Nequi se probó y se descartó por ahora:** el export era el wordmark completo "nequi", ilegible por debajo de ~40px (las tejas van a 16-32px). Se mantiene su glifo monocromo actual; Esteban aplicará otro diseño más adelante.
- **Tests guardarraíl:** el hermano de TX.4 (`sprite-sync.test.js`) ya cubría la igualdad biblioteca ↔ sprite; ahora valida también los dos logos a color con sus degradados. Tres fixtures que usaban Bancolombia como ejemplo de "banco sin glifo → iniciales" se migraron a Davivienda (sigue sin glifo).

**Validación:** 2103/2103 unit; 147/147 E2E; lint limpio; sync idempotente; degradados renderizando desde el sprite. SW v314 → v316.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/bancolombia.svg` | Logo a color: fondo blanco + bandera tricolor (data-fullcolor). |
| `assets/svg/logos/bancos/banco-bogota.svg` | Logo a color: fondo azul + remolino con 5 degradados (IDs `bbog-*`). |
| `scripts/sync-sprite.py` | Soporte `data-fullcolor` con degradados + chequeo de unicidad de IDs internos. |
| `modules/core/constants.js` | Bancolombia teja `#ffffff` + `simbolo`; Banco de Bogotá teja `#003576` + `simbolo`. |
| `index.html` | Sprite regenerado: `b-bancolombia`, `b-banco-bogota` (101 → 102 símbolos). |
| `tests/unit/{bancos,agenda,compromisos}.test.js` | Fixture "sin glifo" migrado de Bancolombia a Davivienda. |
| `.gitignore` | Ignora `__pycache__/` de los scripts Python. |
| `service-worker.js` | v314 → v316. |

---

### feat(assets): BR.2, script de sincronización biblioteca → sprite · 2026-07-05

Segunda tarea de la iniciativa de biblioteca gráfica (tras BR.1). `scripts/sync-sprite.py` invierte la relación: `assets/svg/` manda y el sprite de `index.html` se regenera desde ahí, cerrando el ciclo "Esteban sobrescribe un .svg en Illustrator + corre el script = la app usa el dibujo nuevo" sin tocar código.

**Qué entró:**

- **El script** recorre `iconos/{secciones,simbolos,utilitarios,categorias}` (prefijos `i-`/`c-`) y `logos/**` en cualquier subcarpeta (prefijo `b-`), excluye plantillas `data-placeholder`, convierte los 3 colores centinela de Illustrator (sección 7 del README) a los roles finales y valida el estándar técnico (raíz limpia, solo `path`/`circle`/`rect`/`line`, sin `transform`/`class`/`style`). Reescribe el bloque entre dos marcadores nuevos en `index.html` preservando el orden histórico de los ids ya publicados, así que reemplazar un archivo produce el menor diff posible; los recursos nuevos se agregan al final.
- **Dos niveles de error, a propósito:** un archivo que no cumple el estándar (`ErrorRecurso`) se excluye del sprite sin bloquear la corrida completa, exactamente como promete el README ("nada se rompe" mientras Esteban itera en Illustrator). El sync solo se detiene sin escribir nada (`ErrorProduccion`) cuando la regeneración borraría en silencio un símbolo que ya estaba publicado: ahí hay que arreglar el archivo o retirar la fila de catálogo primero.
- **Normalización pendiente de BR.1 resuelta:** `b-googlegemini` → `b-gemini` (coincide con el archivo `gemini.svg`), 1 línea en `MARCAS`.
- **Guardarraíl nuevo** (`tests/unit/sprite-sync.test.js`, hermano de TX.4): vigila que todo `<symbol>` del sprite tenga su archivo fuente y coincida byte a byte, que ninguna plantilla llegue al sprite, que no haya colisiones de id, y que todo campo `simbolo` de `MARCAS`/`BANCOS_CO` resuelva en ambos lados.
- **Hallazgo en el camino:** `assets/svg/logos/bancos/bancolombia.svg` ya tenía un export de prueba (colores reales de la marca, sin pasar la limpieza del estándar). El sync lo excluyó automáticamente sin intervención manual; Bancolombia sigue con iniciales hasta que BR.3 defina el tratamiento de logos con más de un color (la bandera de Bancolombia no es una silueta monocroma).

**Validación:** primera corrida produjo un sprite idéntico al anterior salvo el rename de Gemini. 2097 → 2103 unit (6 nuevos), 147/147 E2E, lint limpio. SW v313 → v314 (`index.html` y `constants.js` cambiaron).

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Nuevo: script de sincronización. |
| `index.html` | Marcadores del bloque generado; 2 comentarios internos reubicados como documentación permanente; `b-googlegemini` → `b-gemini`. |
| `modules/core/constants.js` | `MARCAS.gemini.simbolo` → `b-gemini`. |
| `tests/unit/sprite-sync.test.js` | Nuevo: guardarraíl biblioteca ↔ sprite ↔ catálogos. |
| `service-worker.js` | v313 → v314. |
| `docs/BOARD.md` | Tarjeta BR.2 cerrada y borrada. |

---

### refactor(compromisos): N.4, logic.js dividido en submódulos · 2026-07-05

Cierre del plan de navegabilidad (N.1 descartada con razones, N.2 MAPA.md, N.3 tesorería, N.4 esta). `compromisos/logic.js` era, tras N.3, el último archivo gigante del proyecto: 1.517 líneas mezclando el modelo del compromiso, los detectores de alerta, todo el motor de estrategia de pago y la aritmética de abonos.

**Qué entró:**

- **4 submódulos bajo `logic/`**, con cortes que resultaron perfectamente contiguos en el original: `modelo.js` (390 líneas: catálogos de tipos, tasas EA/mensual, consultas, validación y normalización del formulario), `alertas.js` (307: fijos sin pagar este mes, deudas durmiendo, vencidos del dashboard, agrupador de prioridades), `estrategia.js` (635: simulación mes a mes Avalancha/Bola de nieve, renegociación, consolidación, motor de recomendación D.11/D.8 y reparto del extra en cuotas D.9) y `abonos.js` (213: aritmética de saldo, validación de abono, estado de pago del mes, deltas por edición de gasto).
- **Barrel con API idéntica (37 exports).** Este dominio es especial: además de sus `views/`, `index.js` y tests, lo importan `agenda/` (validar/normalizar, estado de pago), `analisis/` (totales) e `infra/notificaciones.js` (próximos vencimientos), una excepción preexistente y documentada al ADN #10. Ninguno de esos consumidores cambió ni una línea.
- **Referencias cruzadas mínimas y en una sola dirección:** alertas, estrategia y abonos importan solo de `modelo.js` (`esDeuda`, `tasaEADe`, `compromisosActivos`, `TIPOS_COMPROMISO`). Sin renombres: los privados de cada bloque (`_tasaMensualDesdeEA`, `_RX_FECHA_COMP`, umbrales) ya vivían junto a sus únicos usuarios.
- **Mismo método que N.3:** script determinista por rangos de línea, cero retranscripción manual.

Con esto, el dominio queda simétrico a su propia vista (partida en `views/` desde antes) y el proyecto ya no tiene ningún archivo de más de 900 líneas en `modules/`.

**Validación:** 2097/2097 unit, 147/147 E2E (incluida la suite `estrategia-pago` completa, 15 tests sobre la lógica financiera movida), lint limpio. **Pendiente: validación del usuario en su celular** (Deudas: crear deuda, abonar, pestaña Estrategia; sumada a la de Mis cuentas de N.3).

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic/{modelo,alertas,estrategia,abonos}.js` | Nuevos: lógica pura por subsistema (390/307/635/213 líneas). |
| `modules/dominio/compromisos/logic.js` | Reescrito como barrel (1.517 → 66 líneas). |
| `service-worker.js` | 4 archivos nuevos al precache; v312 → v313. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Fila de compromisos actualizada con el corte. |
| `docs/BOARD.md` | Tarjeta N.4 cerrada y borrada. |

---

### refactor(tesoreria): N.3, dominio dividido en submódulos por subsistema · 2026-07-05

Segunda tarea del plan de navegabilidad. Tesorería concentraba los 3 archivos más grandes del proyecto (`logic.js` 1.557 líneas, `index.js` 1.521, `view.js` 1.099: 4.177 líneas en 3 archivos) y depurar cualquier cosa ahí exigía leer archivos enormes que mezclaban tres subsistemas distintos.

**Qué entró:**

- **Corte por subsistema en las tres capas.** El dominio quedó dividido en `cuentas` (cuentas bancarias, cuota de manejo sincronizada como compromiso, GMF/4x1000, bank picker), `ingresos` (recurrentes y puntuales, salario mínimo, fechas de cobro, prima de servicios, nudge de próximo cobro) y `distribucion` (el asistente "Distribuir mi ingreso" completo: contexto, sugerencia, pasos, aplicar y deshacer). Cada subsistema tiene su archivo en `logic/`, `views/` y `acciones/`: 9 submódulos nuevos, ninguno supera las 900 líneas.
- **API pública intacta vía barrels.** `logic.js` re-exporta los mismos 38 nombres de siempre y `view.js` las mismas 9 funciones de render: los tests (`tesoreria.test.js`, `flujos.test.js`) y `bootstrap.js` no cambiaron ni una línea de imports. `view.js` además expone `renderTesoreria()`, el `_renderTodo` histórico, para renderSmart y los handlers de cuentas.
- **El estado delicado del asistente quedó encapsulado.** `_snapshotDistribucion` (deshacer atómico), `_distribucionPreacreditada` (modo "ya acreditado" de NAV.A2b) y el timer del snackbar viven ahora como estado privado de `acciones/distribucion.js`, compartido solo por las funciones que de verdad lo usan.
- **Renombres mínimos** para compartir entre submódulos: `_FACTOR_MENSUAL` → `FACTOR_MENSUAL` e `_isoFecha` → `isoFecha` (internos de `logic/`, no re-exportados por el barrel), `_fechaCorta` → `fechaCorta` (entre views). Nada más cambió de nombre.
- **Método:** el split se ejecutó con un script determinista que corta el original por rangos de línea exactos (cero retranscripción manual de código). El orden de registro de acciones, listeners delegados e inyección del formulario se preservó uno a uno.
- **Patrón documentado** en `ARCHITECTURE.md` sección 2.4 y en `MAPA.md`: cuando un dominio entero crece, se corta por subsistema en las tres capas detrás de los barrels.

**Validación:** 2097/2097 unit, 147/147 E2E (incluido el flujo `distribuir:abrir` desde Calendario hasta el asistente en Mis cuentas), lint limpio. **Pendiente: validación del usuario en su celular** (sección Mis cuentas: crear/editar cuenta, ingreso puntual con oferta de distribución, asistente completo con deshacer).

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic/{cuentas,ingresos,distribucion}.js` | Nuevos: lógica pura por subsistema (307/387/883 líneas). |
| `modules/dominio/tesoreria/views/{cuentas,ingresos,distribucion}.js` | Nuevos: HTML por subsistema (265/321/538 líneas). |
| `modules/dominio/tesoreria/acciones/{cuentas,ingresos,distribucion}.js` | Nuevos: handlers por subsistema (477/362/671 líneas). |
| `modules/dominio/tesoreria/logic.js` | Reescrito como barrel (1.557 → 63 líneas). |
| `modules/dominio/tesoreria/view.js` | Reescrito como barrel + `renderTesoreria()` (1.099 → 48 líneas). |
| `modules/dominio/tesoreria/index.js` | Reescrito como coordinador (1.521 → 76 líneas). |
| `service-worker.js` | 9 archivos nuevos al precache; v311 → v312. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Patrón de corte por subsistema. |
| `docs/BOARD.md` | Tarjeta N.4 (partir `compromisos/logic.js`) registrada. |

---

### docs(mapa): N.2, mapa de navegación del código · 2026-07-05

Esteban pidió reestructurar el proyecto completo (carpetas `pages/` por sección, tipo aplicación multipágina). Se descartó por análisis de impacto: rompería la SPA, el service worker y los 47 archivos de test, sin aportar nada a lo que de verdad quería resolver (ubicarse rápido en el código). Traducido a un plan de navegabilidad de 4 tareas (N.1 a N.4); N.1 (partir `styles/components/domain.css` en un archivo por dominio) también se descartó tras comprobar que todos los CSS de `styles/components/` agrupan por widget/patrón visual a propósito, no por dominio, y que varios widgets (`banner-proposito`, `cuenta-picker/multi/sel`, `abono-btn`) son compartidos entre secciones: forzar el split habría duplicado reglas o quebrado la consistencia con los archivos hermanos.

En su lugar, esta tarea crea [`docs/MAPA.md`](MAPA.md) sin tocar ni una línea de código: tabla completa sección visible → carpeta de dominio → archivos clave (`logic.js`/`view.js`/`index.js`) → archivo de estilos → test unitario; explicación de por qué "Inicio" no tiene carpeta propia (es composición de widgets de otros dominios); índice de qué agrupa cada archivo `styles/components/*.css`; y una tabla síntoma → dónde mirar para depurar sin buscar a ciegas. De paso se corrigió una nota obsoleta en `ARCHITECTURE.md` que hablaba de dos carpetas de dominio (`calculadoras/`, `exports/`) que ya no existen. Sin cambios funcionales: no aplica bump de SW ni tests nuevos.

**Validación pendiente:** ninguna en la app (documentación pura).

| Archivo | Cambio |
|---|---|
| `docs/MAPA.md` | Nuevo: índice de navegación completo del código. |
| `docs/ARCHITECTURE.md` | Nota obsoleta de carpetas vacías reemplazada por puntero a MAPA.md. |
| `CLAUDE.md` | Sección 5 (lectura obligatoria antes de tocar código): agregado MAPA.md como paso 5. |
| `docs/HANDOFF.md` | Entrada nueva al tope de "qué se hizo recientemente"; MK.2 rotó al bloque de tareas anteriores. |

---

### feat(assets): BR.1, biblioteca oficial de recursos gráficos · 2026-07-05

Arranque de la iniciativa Biblioteca de recursos gráficos ([ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md)): Esteban pasa a diseñar personalmente los SVG del sistema en Adobe Illustrator, y para eso nace `assets/svg/` como **fuente de verdad de diseño** con estándar propio. La app no cambia en runtime: el sprite inline de `index.html` sigue siendo el mecanismo de entrega (cero peticiones, offline, theming vía `<use>`), y por eso **no hay bump de SW**.

**Qué entró:**

- **Extracción fiel del sprite:** los 100 `<symbol>` convertidos a archivos SVG individuales, byte a byte (regenerar el sprite desde ellos da el mismo resultado). Organización: `iconos/secciones` (14), `iconos/simbolos` (13), `iconos/utilitarios` (11, monolínea exentos de rediseño por la regla 4 del ADR 023), `iconos/categorias` (43) y `logos/` (19 glifos en 8 subcarpetas por sector). La carpeta define el prefijo del symbol (`i-`, `c-`, `b-`); las subcarpetas de `logos/` son organización humana y no afectan el id.
- **17 plantillas `data-placeholder="true"`** para todo lo que hoy cae a iniciales: 10 bancos CO (bancolombia, davivienda, banco-bogota, bbva, banco-popular, scotiabank-colpatria, banco-occidente, av-villas, daviplata, lulo-bank) + disneyplus, primevideo, chatgpt, xbox, claro, tigo y rappi. Son la cola de diseño; el sync futuro las excluye del sprite.
- **El estándar maestro** en `assets/svg/README.md`: retícula 24 y área viva ~21×21, roles de color (trazo desnudo / duotono 22 % / chispa), reglas para logos (silueta monocroma, color en catálogo), nomenclatura (kebab ASCII, archivo = id de catálogo), checklist de exportación de Illustrator con colores centinela (#000 trazo, #00FFFF duotono, #FF00FF chispa), flujo de revisión en pareja y recetas para agregar recursos. Sin `catalog.json`: los metadatos siguen en `constants.js`, única verdad.
- **Caso conocido documentado:** `logos/ia/gemini.svg` ↔ symbol `b-googlegemini`; BR.2 lo normaliza a `b-gemini` (1 línea en `MARCAS`).

**Validación pendiente:** ninguna en la app (cero cambios de runtime). La biblioteca se vuelve operativa con BR.2 (`scripts/sync-sprite.py`); hasta entonces el sprite manda y la biblioteca es su espejo. 2097/2097 unit.

| Archivo | Cambio |
|---|---|
| `assets/svg/**` | 117 SVG nuevos (100 extraídos + 17 plantillas) + README maestro + README de `ilustraciones/` e `identidad/`. |
| `docs/DECISIONS/026-biblioteca-de-recursos-graficos.md` | ADR nuevo. |
| `docs/ARCHITECTURE.md` | Sección 8.1 reescrita: describía la iconografía híbrida emoji/SVG, superada desde los ADR 023/025. |
| `docs/BOARD.md` | Iniciativa nueva con tarjetas BR.2 y BR.3. |

---

### style(ui): ID.5, tracking del patrimonio alineado con el hero · 2026-07-05

Micropulido tipográfico opcional. El único desajuste real tras ID.4: `.patrimonio-hero__valor` (Análisis) usaba `letter-spacing: -0.02em` mientras el hero del dashboard (`.bento__value--xl`, mismo tamaño base `--fk-text-4xl`) ya usa `-0.03em` desde ID.4. Ambas son "la cifra más grande de su pantalla", así que quedan con el mismo tracking calibrado. El eje óptico de Inter Variable (`opsz`) ya se resuelve solo: `font-optical-sizing` es `auto` por defecto y no hay ninguna regla que lo desactive, así que no requirió cambio. Verificado con `preview_inspect` (24px × 0.03 = 0.72px, coincide). 2097/2097 unit (sin cambios, ningún test fija ese valor); no requiere E2E (CSS puro, sin lógica). SW v310 → v311.

| Archivo | Cambio |
|---|---|
| `styles/components/analysis.css` | `.patrimonio-hero__valor`: tracking -0.02em → -0.03em. |
| `service-worker.js` | v310 → v311. |

---

### feat(ui): ID.3, categorías Finko v2 en tejas por dominio · 2026-07-05

Cierre de la iniciativa de identidad visual 2026-07 completa ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md) sección ID.3, [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) D3): los emojis de categoría salen de la UI estructural y entran 43 símbolos nuevos `c-*` en el lenguaje v2 ("trazo cálido con chispa": duotono 22 %, chispa `var(--fk-icon-dot, currentColor)`, redondez sistemática, vértices agudos solo donde la metáfora los exige: punta de `c-avion`, play de `c-streaming`, diamante de `c-anillo`, tablero de `c-birrete`).

**Catálogos.** Los 6 `CATEGORIA_*_EMOJI` de `constants.js` se reemplazan por `CATEGORIA_*_ICONO` (categoría → id completo de `<symbol>`). Un glifo por metáfora, compartido entre catálogos cuando la etiqueta coincide (guardarraíl TX.4); 5 categorías reusan símbolos estructurales en vez de duplicar dibujo: Vivienda/Arriendo → `i-home`, Tarjeta de crédito/Cuota de manejo → `i-deudas`, Comisión → `i-percent`, Rendimientos → `i-trending-up`, interna Ahorro → `i-ahorro`. Vacaciones y Emprendimiento ganan metáfora propia (palmera y cohete): la reconciliación de emojis de MT.1 ya no las limita.

**La teja de categoría.** `tejaCategoria(id, dominio)` en `infra/icons.js` (hermana de `tejaMarca`) + `.cat-teja` en atoms.css: contenedor de 32px con fondo `--fk-dom-*` al 14 % y glifo al 100 % del color del dominio; dentro de la teja `currentColor` ES el color del dominio, así que la chispa cae a él sin declarar variable. Superficies: Gastos (naranja, hereda el glifo del compromiso de origen vía `iconoPorOrigen`, antes `emojiPorOrigen`), Ingresos fijos y puntuales (verde; las filas ganan ícono que antes no tenían), Deudas (rojo entidad / rosa personal: la teja de categoría es ahora el fallback cuando no hay marca, completando el sistema del ADR 025), Calendario (amarillo presupuesto, el color que el calendario ya usaba para "fijo"; el ingreso del día también cambia 💰 por su teja). Los contextos inline densos (título de meta junto al anillo, envelopes y alertas de Límites, checklist de Necesidades, resumen semanal, desgloses de grupos) usan el glifo a `icon--sm` sin teja.

**Selects y datos.** Los `<option>` quedan en texto plano (un `<option>` nativo no renderiza SVG, ADR 025). En Metas, `normalizarMeta` deja de almacenar el emoji de la categoría: la vista lo resuelve desde el catálogo al renderizar (las metas viejas migran solas al sprite) y el emoji manual del usuario (categoría "Otra") se conserva como dato (ADR 025 D3); las plantillas de Apartados no se tocan. TX.4 pasa a comparar ids de sprite y gana una aserción nueva: todo id referenciado existe como `<symbol>` en `index.html`.

Verificación visual: los 43 glifos renderizados con Chromium a 20px y en teja de 32px, tema claro y oscuro (4 iteraciones de diseño: la lupa de Cuidado personal se leía como símbolo de género y pasó a gota con destello; Vecino se leía como ícono de "foto" y pasó a dos casas con volumen; taza de Café ampliada; hormiga re-alineada), más un render de filas reales (`list-item`, `cal-detail`) con el CSS de producción en ambos temas. 2097/2097 unit (+3); 147/147 E2E (3 asserts de smoke actualizados a teja/sprite). SW v309 → v310. Pendiente: validación del usuario en su celular.

| Archivo | Cambio |
|---|---|
| `index.html` | 43 símbolos `c-*` nuevos; comentario del sprite actualizado (estado final de la migración). |
| `modules/core/constants.js` | `CATEGORIA_*_ICONO` reemplazan a los 6 catálogos de emoji. |
| `modules/infra/icons.js` | `iconoCategoria(id, cls)` (id completo) y `tejaCategoria(id, dominio)`. |
| `modules/dominio/gastos/logic.js` | `emojiPorOrigen` → `iconoPorOrigen` (ids de sprite). |
| `modules/dominio/gastos/view.js` | Teja en la lista; chips y `<option>` en texto plano; retirada la clase `--cat`. |
| `modules/dominio/agenda/view.js` | Teja de categoría en el detalle del día (fijos e ingreso); `<option>` plano. |
| `modules/dominio/tesoreria/view.js` | Teja en ingresos fijos/puntuales; checklist de Necesidades a `icon--sm`; selects planos. |
| `modules/dominio/metas/view.js`, `logic.js` | `_iconoMeta` (sprite por categoría, emoji del usuario en "Otra"); `normalizarMeta` sin emoji derivado. |
| `modules/dominio/compromisos/views/lista.js`, `formularios.js` | Teja de categoría como fallback sin marca; contexto y `<option>` planos. |
| `modules/dominio/presupuesto/view.js`, `modules/dominio/resumen/view.js` | Glifos `icon--sm` en envelopes, huérfanas, alertas, desgloses y categoría top. |
| `styles/components/atoms.css` | `.cat-teja` (tinte por dominio); `:has()` extendido; borrado el bloque `--cat` obsoleto. |
| `styles/components/config.css` | `:has(.cat-teja)` en el detalle del calendario; retirada `.cal-detail__icon--emoji`. |
| `tests/unit/*` (constants, gastos, agenda, compromisos, metas, tesoreria) | TX.4 con ids de sprite + guardarraíl de existencia; asserts a teja/sprite. |
| `tests/e2e/smoke.test.js` | 3 asserts de Metas y Agenda actualizados a sprite/teja. |
| `service-worker.js` | v309 → v310. |

---

### feat(ui): ID.7, símbolos estructurales al lenguaje v2 · 2026-07-05

Cierra la iniciativa de identidad visual 2026-07 ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): última fase pendiente tras ID.6 (piloto de navegación). Los 13 símbolos redibujados en ID.2 (`saldo`, `recurring`, `lightbulb`, `alert`, `bolt`, `trophy`, `mountain`, `circle`, `star`, `percent`, `trending-up`, `info`, `bar-chart`) heredaban el trazo 2.35 global desde ID.6 pero conservaban la geometría v1 (duotono al 15 %, punto de valor en `currentColor` plano, sin la variable de la "chispa"). Ahora quedan al día con las reglas v2: `fill-opacity=".22"` y `var(--fk-icon-dot, currentColor)` en cada punto de valor.

**Regla 5 "metáfora primero" aplicada explícitamente.** Tres símbolos mantienen vértices agudos a propósito: los picos de `i-mountain` (avalancha), la punta de `i-bolt` y las 5 puntas de `i-star`. La geometría puntiaguda ES la metáfora (un pico de montaña o una punta de estrella redondeados dejan de leerse como tales); mismo criterio que ya dejó agudo el vértice central de la porción de `i-analisis` en el piloto ID.6. Dos símbolos no llevan punto de valor adicional: `i-saldo` (el signo peso ya es la firma) e `i-star` (la estrella entera ya es el "punto"), evitando redundancia visual. `i-percent` enciende la chispa en sus **dos** círculos, ya que ambos juntos constituyen "el punto de valor" del glifo (razonamiento que ya había fijado ID.2). `i-info` mantiene su círculo exterior sin relleno duotono: distinción deliberada entre una alerta (pesada, con cuerpo) y una explicación neutra (más liviana, solo contorno).

**Redondez sistemática** aplicada donde había una esquina incidental de contenedor, sin tocar la silueta de la metáfora: el triángulo de `i-alert` (radio de esquina 2 → 2.3), las asas de `i-trophy` (2.5 → 2.9, coincide con el piso "≥ 2.9" que fija la regla 2 del ADR) y las barras de `i-bar-chart` (rx 1 → 2, esquinas tipo cápsula: la mitad exacta del ancho de la barra, extremos en semicírculo). El resto de los símbolos (saldo, recurring, lightbulb, circle) ya tenía geometría curva sin vértices que rectificar.

Verificación: los 13 símbolos se renderizaron aislados en el preview a 20px y 48px, en tema claro y oscuro, confirmando que ningún path quedó roto y que la lectura de cada metáfora se conserva. Guardarraíl nuevo en `tests/unit/icons.test.js`: ningún símbolo recalentado conserva `fill-opacity=".15"` (v1), todo punto de valor enciende la chispa salvo las dos excepciones documentadas, y `mountain`/`bolt`/`star` no usan comandos de arco en el path de su silueta principal (verificación mecánica de que la regla 5 no se rompe accidentalmente a futuro).

2094/2094 unit (+6, suite nueva de guardarraíles del sprite); 147/147 E2E sin cambios (no hay lógica de dinero involucrada). SW v308 → v309.

| Archivo | Cambio |
|---|---|
| `index.html` | 13 símbolos `i-*` recalentados a v2 (duotono 22 %, chispa, radios de esquina); comentario del sprite actualizado con el estado de migración. |
| `tests/unit/icons.test.js` | Suite nueva: duotono/chispa por símbolo, excepciones documentadas, vértices agudos preservados, cápsula de `bar-chart`. |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | Sección "ID.7" con el razonamiento de cada decisión de geometría. |
| `docs/BOARD.md` | Tarjeta ID.7 borrada; nota de la iniciativa actualizada (cerrada salvo ID.3). |
| `service-worker.js` | v308 → v309. |

---

### feat(ui): MK.2, detección de marca por nombre en fijos, suscripciones y deudas · 2026-07-05

Segunda fase del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (D4): la teja de marca llega a los nombres libres. Módulo nuevo `infra/marcas.js` con `resolverMarca(texto)`: normaliza el texto del usuario (minúsculas, sin tildes, signos a espacio) y lo compara contra aliases por **palabra o frase completa**, nunca substring ("Netflix Premium" resuelve a Netflix; "clarooscuro" NO resuelve a Claro). Busca primero en el catálogo nuevo `MARCAS` y después en `BANCOS_CO` (solo bancos y billeteras, con el id como alias implícito: una deuda "Tarjeta Bancolombia" hereda la identidad del banco; Efectivo y Otro quedan excluidos porque "otro" es palabra común). Sin match devuelve null y el consumidor cae a su ícono de categoría o de tipo: el fallback automático del ADR.

**Catálogo `MARCAS` (24 marcas).** 17 con glifo oficial de **Simple Icons 16.25.0** (CC0), descargados de la versión fijada y copiados por script, sin transcripción manual (regla de fidelidad D5): Netflix, Spotify, YouTube, HBO Max, Crunchyroll, iCloud, Apple, Claude, Gemini, Google, PayPal, Mercado Pago, Movistar, Uber, PlayStation, Duolingo y Platzi. Hallazgo de cobertura: el CDN con `@latest` servía **caché vieja de la v15**; contra la versión vigente real, OpenAI, Amazon, Prime Video y Xbox ya **no están** en Simple Icons (retiros posteriores al análisis del ADR), y Disney+, Claro, Tigo y Rappi nunca estuvieron. Esas 7 entran con iniciales sobre su color (el fallback natural de D2): ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox. Rappi verificado en `#FF441F` contra el theme-color de su propio sitio; Disney+, ChatGPT, Claro, Tigo, Prime Video y el fondo de Platzi quedan como aproximaciones documentadas en el JSDoc (mismo tratamiento que tuvo Nequi antes de MK.1).

**Consumidores.** Calendario (detalle del día): la teja de marca gana al emoji de categoría; con categoría predefinida el nombre del usuario vive en `nota` (AG.4), así que se buscan `descripcion` y `nota` juntas ("Streaming" + nota "Netflix" resuelve). Deudas (lista): la teja reemplaza al ícono genérico del tipo cuando el nombre menciona una marca o un banco. Cambio de convivencia necesario: el **badge de orden de la estrategia ya no reemplaza al ícono** (antes `badge || icono`, y como casi toda deuda activa es "pagable", la teja jamás se habría visto); ahora se superpone reducido (18px) en la esquina de la teja o del ícono, con aro del color de la superficie. La card de estrategia sigue usando el badge a tamaño completo.

**Unificación de render.** `bancoAvatar()` de `infra/bancos.js` ahora delega en `tejaMarca()` de `marcas.js`: un solo render de teja en toda la app, mismo HTML (`.bank-avatar`, glifo al ~62% o iniciales, colores inline). `BANCOS_CO` gana el campo opcional `aliases` (bbva, scotiabank, colpatria, av villas, nu, lulo) para los nombres cortos con que el usuario escribe su banco.

Guardarraíles nuevos en tests: todo alias debe venir ya normalizado, ningún alias puede repetirse entre marcas ni chocar con un banco, y todo `simbolo` declarado debe existir como `<symbol>` en el sprite. 2088/2088 unit (+32: suite nueva `marcas` con 25, +4 en `agenda`, +3 en `compromisos`); 147/147 E2E sin cambios. SW v307 → v308. Pendiente: validación del usuario en su celular (calidad visual de los glifos y del badge superpuesto).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Catálogo `MARCAS` (24 entradas) + campo `aliases` en `BANCOS_CO`. |
| `index.html` | 17 símbolos `b-*` nuevos en el sprite (Simple Icons 16.25.0, insertados por script). |
| `modules/infra/marcas.js` | Módulo nuevo: `normalizarAlias`, `resolverMarca`, `tejaMarca`. |
| `modules/infra/bancos.js` | `bancoAvatar()` delega en `tejaMarca()` (render único de teja). |
| `modules/dominio/agenda/view.js` | Teja de marca como ícono principal del detalle del día (descripcion + nota). |
| `modules/dominio/compromisos/views/lista.js` | Teja de marca en la card de deuda; badge de orden superpuesto, ya no excluyente. |
| `styles/components/atoms.css` | Badge de orden reducido y superpuesto en la esquina del ícono. |
| `styles/components/config.css` | `.cal-detail__icon:has(.bank-avatar)`: apaga el tinte del tipo bajo la teja. |
| `tests/unit/marcas.test.js` | Suite nueva (25 tests): normalización, resolución, integridad del catálogo, teja. |
| `tests/unit/agenda.test.js`, `tests/unit/compromisos.test.js` | Tests de integración de la teja en ambas vistas (+7). |
| `service-worker.js` | Precache de `marcas.js`; v307 → v308. |

---

### feat(ui): MK.1, teja de marca con glifos oficiales en Mis cuentas · 2026-07-04

Primera implementación del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (D1/D2). El avatar de banco evoluciona a **teja de marca**: `BANCOS_CO` gana el campo opcional `simbolo` (id de `<symbol>` del sprite) y `bancoAvatar()` renderiza el glifo oficial cuando existe, o las iniciales sobre el color corporativo como fallback. La clase `.bank-avatar` y la firma de la función se conservan, así que los tres consumidores (lista de cuentas de Mis cuentas, picker de cuentas, hints de formularios) reciben el cambio sin tocarse.

**Glifos que entraron (regla de fidelidad ADR 025 D5: nunca inventar un logo de memoria):**

- `b-nequi`: isotipo oficial verificado contra el vector real (cuadrado redondeado magenta). De paso se corrigieron los colores del catálogo a los oficiales: fondo berenjena `#200020` y glifo magenta `#CA0080` (antes un morado aproximado `#9C00FF`).
- `b-nubank`: path oficial tomado de Simple Icons (CC0), verbatim.
- Efectivo reusa el icono estructural `i-saldo` (no es una marca).
- **Quedan con iniciales** (fallback previsto por el ADR): Bancolombia, Davivienda, DaviPlata, Banco de Bogotá y el resto. Motivo documentado: DaviPlata resultó ser solo wordmark (sin isotipo), y para Davivienda/Bancolombia no hubo referencia vectorial confiable en las fuentes consultadas. Cada glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo`.

Detalles técnicos: los `b-*` son de relleno (`fill="currentColor" stroke="none"` en el path, que le gana al `fill:none` de `.icon`); el glifo ocupa ~62% de la teja; hairline `--fk-border-subtle` en la teja para que las marcas oscuras (Nequi) no se fundan con el tema oscuro. Guardarraíl nuevo en tests: todo `simbolo` declarado debe existir como `<symbol>` en `index.html`.

2056/2056 unit (+13, suite nueva `bancos`); 147/147 E2E sin cambios. SW v306 → v307. Pendiente: validación del usuario en su celular (calidad visual de los glifos a tamaño real).

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Campo `simbolo` en `BANCOS_CO` (Nequi, Nubank, Efectivo) + colores oficiales de Nequi + JSDoc con la regla de fidelidad. |
| `index.html` | Símbolos `b-nequi` y `b-nubank` en el sprite (prefijo `b-*` nuevo, ADR 025). |
| `modules/infra/bancos.js` | `bancoAvatar()` renderiza glifo del sprite o iniciales (teja de marca). |
| `styles/components/nudges.css` | `.bank-avatar__glifo` (~62%) + hairline; comentario actualizado. |
| `modules/dominio/tesoreria/view.js` | Comentario del wrapper actualizado (teja, no "avatar circular"). |
| `tests/unit/bancos.test.js` | Suite nueva (13 tests): glifo/fallback/colores/aria/guardarraíl del sprite. |
| `service-worker.js` | v306 → v307. |

---

### docs(adr): ADR 025, logotipos de marca y tejas unificadas · 2026-07-04

Replanteo de la tarjeta ID.3 pedido por el usuario al arrancarla: siempre que un servicio o entidad tenga identidad visual reconocida (Netflix, Spotify, Nequi, Bancolombia, Claude...), mostrar su **logotipo oficial** en lugar de un icono genérico; las categorías sin marca siguen con iconos; un solo sistema visual, escalable por catálogo y con fallback automático. Pidió además el análisis fundamentado del paquete de iconos que mejor conviva con logotipos.

**Análisis (con verificación real):** Simple Icons (CC0, glifos de marca monocromos con color oficial) cubre las marcas globales pero **no** la banca colombiana: Nequi, Daviplata, Bancolombia, Davivienda, Banco de Bogotá y Rappi devuelven 404 (verificado archivo por archivo; la primera consulta al listado devolvió un falso "todo existe" y se descartó). Ningún paquete cubre el corazón de Finko, así que adoptar uno completo era imposible. Además, Finko ya hacía identidad de marca a medias con el patrón correcto: `BANCOS_CO` (color corporativo + color de texto) y `bancoAvatar()` con iniciales.

**Decisión ([ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)):** el unificador no es un paquete de iconos, es la **teja** (contenedor único de 40/32px). Dentro conviven dos especies: marca = glifo monocromo sobre fondo sólido de su color oficial (Simple Icons curado para globales + glifos propios para la banca CO); categoría = Finko Icons v2 sobre tinte `--fk-dom-*` con chispa (la dirección C del ADR 023, sin cambios). Resolución automática: catálogo `MARCAS` + `resolverMarca(texto)` por aliases, con fallback a categoría. Marco legal documentado (CC0 + uso nominativo, D5). Emojis de celebración conservados (D6, decisión que la antigua ID.3 dejaba abierta). La decisión de ID.6 (lenguaje propio) sale reforzada: se descartó explícitamente volver a un paquete genérico.

Solo docs, sin código: tests (2043 unit, 147 E2E) y SW (v306) sin cambios.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | ADR nuevo (contexto con cobertura verificada, D1 a D6, alternativas, fases). |
| `docs/BOARD.md` | ID.3 re-cortada en MK.1 (tejas + banca CO, prioridad alta), MK.2 (marcas globales por alias) e ID.3 (categorías v2 en tejas); nota de la iniciativa actualizada. |
| `docs/HANDOFF.md` | Entrada nueva; NAV.A2a movida a la línea de tareas anteriores. |

---

### feat(nav): NAV.C, pulidos de navegación · 2026-07-04

Cierra la iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D6), última tarjeta pendiente tras NAV.A1, NAV.A2a, NAV.B y NAV.A2b. Tres pulidos acotados, sin lógica nueva:

**Toast de logro retrasado.** El logro "Primer paso" (`s.onboarded === true`) se cumple en el instante en que el usuario termina el wizard, así que su toast con confetti aparecía pisando el cierre del modal de onboarding, la guía del hero vacío ("registrá tus cuentas en Tesorería") y una posible exploración inmediata de la hoja "Registrar" o el modal "Más". El listener de `onboarding:completado` en `logros/index.js` ahora envuelve `_checkYMostrar` en un `setTimeout` de 4 segundos; el resto de logros (disparados por `state:change`) siguen apareciendo al instante.

**Nombre del grupo del sidebar desktop.** Al disolver "Herramientas" en NAV.B, Análisis quedó dentro del grupo "Gestión" junto a Mis cuentas, Me deben y Límites de gasto, pero ese nombre ya había sido señalado como poco predictivo (motivo por el que el modal "Más" lo había retirado en NAV.B, ADR 024 D5). Se renombra a **"Seguimiento"**, que describe mejor el hilo común: monitorear saldos, deudas a favor, topes y análisis, en vez de accionar sobre ellos.

**Banner de propósito de Apartados.** Excedía el objetivo de 40 a 60 palabras de [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) por un buen margen (83 palabras, el único de las 11 secciones fuera de rango). Se recortó a 58 palabras quitando ejemplos redundantes de la lista de gastos previsibles, manteniendo los tres tiempos (pregunta, problema, solución) y la mención al SOAT que ya cubría un test unitario.

2043/2043 unit; 147/147 E2E (se actualizó el texto de grupo esperado en `hub-ahorros.test.js`; sin tests nuevos, los tres cambios son de copy/timing sin lógica de dinero). SW v305 → v306.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Retraso de 4s (`RETRASO_TOAST_ONBOARDING_MS`) en el toast disparado por `onboarding:completado`. |
| `index.html` | Grupo del sidebar "Gestión" → "Seguimiento" (comentario actualizado). |
| `modules/ui/proposito.js` | Texto de `PROPOSITOS_SECCION.apartados` recortado de 83 a 58 palabras. |
| `tests/e2e/hub-ahorros.test.js` | Nombre de grupo esperado actualizado en el test de sidebar desktop. |
| `service-worker.js` | v305 → v306. |

---

### feat(nav): NAV.A2b slice 2, oferta de distribución tras un ingreso · 2026-07-04

Cierre de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D3). Tras registrar un ingreso puntual (que ya subió el saldo de su cuenta en NAV.A1), Finko ofrece repartirlo con el asistente "Distribuir mi ingreso" de Mis cuentas. Es la pieza de lógica de dinero que se había separado a propósito del slice 1.

**El problema y el modo "ya acreditado":** `_confirmarDistribucion` acreditaba la cuenta con `saldo + monto - lo que sale` porque el asistente asumía que el cobro recurrente del mes **aún no había entrado**. Un ingreso puntual ya acreditó su cuenta al registrarse, así que abrir el asistente con ese monto y confirmar habría **duplicado el abono** (el saldo subiría dos veces). El modo nuevo (`_distribucionPreacreditada`):

- **No re-acredita:** `creditoIngreso = 0`, así el saldo solo baja por lo que se reparte a Necesidades/deudas/otras cuentas (el aporte al fondo no descuenta, ADR 009). El dinero ya estaba en la cuenta.
- **Usa la cuenta del ingreso como origen** (no vuelve a preguntar con `resolverCuenta`). Si esa cuenta se borró entre registrar y distribuir, cae al flujo normal para no perder el reparto.
- **No consume el periodo del ingreso recurrente** (`ultimaDistribucionPeriodo`): ese guard de de-duplicación es del salario mensual; un ingreso puntual es un evento aparte y no debe ocultar la distribución del recurrente.

**La oferta:** tras guardar el ingreso puntual (venga de la hoja "Registrar" o de "+ Ingreso" en Mis cuentas), un diálogo pregunta "¿Repartirlo ahora?". Al aceptar, reusa el evento `distribuir:abrir` (el mismo del recordatorio del Calendario, ADR 021) con un payload `preacreditado`: navega a Mis cuentas, abre el asistente y pre-carga el monto y la cuenta del ingreso. Solo se ofrece si el asistente existe (requiere un ingreso recurrente registrado: el panel no se renderiza sin `estimarSalarioMensual > 0`). El modo es de un solo uso: se limpia al confirmar la distribución y al abrir el asistente a mano (toggle), para no filtrarse a una distribución normal posterior.

Verificado con E2E (el preview del entorno sigue con caché de módulos envenenado). El test clave de no-doble-abono: registrar $1.000.000 sobre una cuenta de $1.000.000 (saldo → $2.000.000), distribuir pagando un fijo de $800.000, y confirmar que el saldo queda en **$1.200.000** (no $3.000.000, que sería el doble abono); además el periodo recurrente no se marca. 2043/2043 unit; **147/147 E2E** (+3, nueva suite `registrar-distribucion`); el flujo normal de distribución (incluido el recordatorio ADR 021) sigue verde sin cambios. SW v304 → v305.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | Estado `_distribucionPreacreditada`; `_ofrecerDistribucion` + `_hayAsistenteDistribucion` tras el ingreso; modo "ya acreditado" en `_confirmarDistribucion` (crédito, origen y guard de periodo); `_abrirAsistenteDistribucion` acepta `{preacreditado}` y pre-carga el monto; `distribuir:abrir` con payload; toggle manual limpia el modo. |
| `service-worker.js` | v304 → v305. |
| `tests/e2e/registrar-distribucion.test.js` | Suite nueva (3 tests): no-doble-abono, "Ahora no" no abre el asistente, sin ingreso recurrente no se ofrece. |

---

### feat(nav): NAV.A2b slice 1, Abono a deuda y Aporte a ahorro en la hoja "Registrar" · 2026-07-04

Primer corte de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D2). La hoja "Registrar" (que en NAV.A2a quedó con Gasto e Ingreso) suma las dos acciones que dependen de los datos del usuario y necesitan elegir un destino:

- **Abono a deuda:** aparece solo si hay al menos una deuda activa con saldo pendiente (espejo de la condición del botón "Abonar" de la lista de Deudas).
- **Aporte a ahorro:** aparece solo si hay fondo de emergencia activo, alguna meta no completada o algún apartado. Inversión queda fuera (ADR D2: no tiene flujo de aporte incremental, solo "nueva inversión").

**Cómo funciona sin acoplar dominios:** módulo nuevo `ui/registrar.js` que lee `S` directamente (permitido para el shell, igual que el consolidado de ahorro; no importa ningún dominio, regla ADN #10) y reusa la acción built-in `registrar-abrir` incrustando el `data-id` del destino elegido. Así cada flujo de dinero ya existente (`abrir-abono`, `ahorro-nuevo-aporte`, `abonar-meta`, `aportar-apartado`) corre exactamente igual que desde su sección y acredita o descuenta la cuenta como siempre: **cero lógica de dinero nueva en este slice.**

**Patrón 0/1/varias** (el mismo de `cuenta-helper` para el origen del dinero): 0 destinos → la teja no aparece; 1 destino → la teja enruta directo (con el `data-id` ya incrustado); 2+ → la teja abre el selector "¿a cuál?" dentro de la misma hoja (vista destino con lista + "Volver"), sin anidar modales. El botón central "+" pasa de `modal-open` a la acción nueva `registrar-abrir-hoja`, que reconstruye las tejas dinámicas desde `S` cada vez que la hoja se abre.

**Diferido a slice 2 (nueva sesión):** la oferta del asistente de distribución tras registrar un ingreso, que necesita el modo "ya acreditado" en `_confirmarDistribucion` para no duplicar el abono (la trampa documentada en ADR 024 D3). Es la pieza de lógica de dinero riesgosa, aislada a propósito.

El preview del entorno quedó con caché de módulos envenenado (ni recarga ni reinicio del server la bustan, síntoma ya documentado); verificado con E2E en Chromium fresco: la hoja muestra las 4 tejas con datos, el selector lista los destinos correctos y enruta a cada modal, y el caso de 1 destino salta el selector. 2043/2043 unit (+6, `registrar.test.js` cubre `destinosAbono`/`destinosAporte`); **144/144 E2E** (+6, nueva suite `registrar-destinos`); lint limpio; axe sobre el HTML estático sin violaciones. SW v303 → v304.

| Archivo | Cambio |
|---|---|
| `modules/ui/registrar.js` | Módulo nuevo: `destinosAbono`/`destinosAporte` (puras) + tejas dinámicas + selector de destino + acciones `registrar-abrir-hoja`/`registrar-elegir-destino`/`registrar-volver`. |
| `index.html` | Hoja con vista raíz (`#registrar-grid`) + vista destino; "+" del nav → `registrar-abrir-hoja`. |
| `modules/ui/bootstrap.js` | `initRegistrar()` tras `initMenuMas()`. |
| `styles/modals.css` | Tintes de las tejas Abono (deudas) / Aporte (ahorro) + estilos del selector de destino. |
| `service-worker.js` | Precache de `modules/ui/registrar.js`; v303 → v304. |
| `tests/unit/registrar.test.js` | Suite nueva (6 tests): destinos de abono y aporte, filtros y bordes. |
| `tests/e2e/registrar-destinos.test.js` | Suite nueva (6 tests): tejas condicionales, selector, enrutado a cada modal, 0/1/varias. |

---

### feat(nav): NAV.B, hub "Ahorros" con pestañas y consolidado · 2026-07-04

Tercera tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) (decisiones D4, D5 y D6). "¿Dónde están mis ahorros?" tenía cuatro respuestas que competían sin jerarquía; ahora tiene una:

- **Modal "Más" plano (D5):** baja de 10 tarjetas en 3 grupos a **7 tarjetas en una sola cuadrícula** (Deudas, Mis cuentas, Ahorros, Límites de gasto, Me deben, Análisis, Ajustes). La tarjeta única "Ahorros" reemplaza a Ahorro/Metas/Apartados/Inversión y entra al hub por `#ahorro`. Desaparecen los rótulos "Gestión"/"Crecer"/"Herramientas".
- **Franja de pestañas (D4):** `Fondo · Metas · Apartados · Inversión` en la cabecera de las 4 secciones. Son enlaces estáticos entre las secciones existentes presentados como tabs (componente `.hub-tabs`, la actual marcada con `aria-current="page"`): **cero cambios de router**, los deep links `#ahorro/#metas/#apartados/#inversion` siguen intactos, cero JS nuevo.
- **Consolidado como cabecera común (D4 + ADR 009):** el "Tu ahorro total" que vivía solo en Ahorro ahora se dibuja en las 4 secciones vía slots `[data-hub-consolidado]` del shell. `renderResumenAhorroConsolidado()` llena todos los slots y omite el enlace "Ver" del vehículo de la sección actual; `ahorro/index.js` lo renderiza al navegar a cualquier hash del hub. Sigue oculto si el total es 0.
- **Renombre (D4):** la sección "Ahorro" pasa a llamarse **"Fondo de emergencia"** (tab: "Fondo"); se actualizó el copy que la nombraba (propósito de sección, tips de Metas/Inversión, nudge de Inversión, hint del logro "Red de seguridad").
- **Sidebar desktop (D6):** el grupo "Crecer" pasa a "Ahorros" (conserva las 4 entradas directas); "Herramientas" se disuelve y Análisis se integra a "Gestión" (el nombre de ese grupo se revisa en NAV.C).
- **De paso:** `MAS_SECTIONS` en `shell.js` no incluía `apartados` ni `inversion`, así que el botón "Más" no se resaltaba como activo en esas secciones (bug preexistente, corregido); y se retiró el código muerto del toggle de tema en `menu-mas.js` (el botón `#menu-mas-tema` ya no existe en el HTML).

Podría afectar: navegación móvil y desktop, y el render de las secciones del hub (el consolidado ahora también se dibuja en Metas/Apartados/Inversión). Verificado en preview (móvil 375px: pestañas, consolidado en Metas con enlaces correctos, modal de 7; desktop: grupos del sidebar) y con la suite nueva. 2037/2037 unit; **138/138 E2E** (+7, nueva suite `hub-ahorros`). SW v302 → v303. Validación pendiente: la del usuario en su celular.

| Archivo | Cambio |
|---|---|
| `index.html` | Pestañas `.hub-tabs` + slots `[data-hub-consolidado]` en las 4 secciones, título "Fondo de emergencia", modal Más plano de 7, sidebar reorganizado. |
| `modules/dominio/ahorro/view.js` | `renderResumenAhorroConsolidado()` multi-slot con `_htmlConsolidado(total, desglose, seccionActual)`. |
| `modules/dominio/ahorro/index.js` | `_renderSegunSeccion()`: panel en `#ahorro`, consolidado en los 4 hashes del hub. |
| `modules/ui/shell.js` | `MAS_SECTIONS` + `apartados`/`inversion`. |
| `modules/ui/menu-mas.js` | Limpieza: solo cierra el modal al navegar (código de tema muerto retirado). |
| `modules/ui/proposito.js` | Copy de `ahorro`: "¿Para qué sirve el Fondo de emergencia?". |
| `modules/dominio/{metas,inversiones}/view.js`, `modules/dominio/{inversiones,logros}/logic.js`, `modules/core/constants.js` | Menciones a la sección "Ahorro" actualizadas (pestaña Fondo / sección Ahorros). |
| `styles/layout.css`, `styles/modals.css` | Componente `.hub-tabs`; estilos de `.menu-mas__group*` retirados. |
| `tests/e2e/hub-ahorros.test.js` | Suite nueva (7 tests): modal de 7, navegación por pestañas, consolidado visible/oculto, resaltado de "Más", sidebar desktop. |
| `service-worker.js` | v302 → v303. |

---

### feat(nav): NAV.A2a, bottom nav de 5 con botón central "Registrar" · 2026-07-04

Segunda tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). El bottom nav móvil pasa de 4 a 5 posiciones: `Inicio · Gastos · [+] · Calendario · Más`. El "+" central es un FAB de acento (acción, no sección) que abre la hoja "¿Qué quieres registrar?" con dos tejas: **Gasto** (naranja, "una compra o pago") e **Ingreso** (verde, "dinero que recibiste"). Resuelve el hallazgo H1/H2 de la auditoría: registrar entró/salió deja de vivir solo en el botón de la esquina superior y queda siempre en la zona del pulgar, desde cualquier pantalla.

La hoja enruta con una acción built-in `registrar-abrir` en `actions.js` (paralela a `ir-a-seccion`): cierra la hoja e invoca por nombre la acción destino ya registrada (`nuevo-gasto`, `nuevo-ingreso-puntual`), sin anidar modales ni acoplar dominios; no hizo falta el módulo `ui/registrar.js` que el ADR anticipaba.

**Alcance (subset más pequeño con sentido):** la hoja lleva solo las dos acciones globales autocontenidas. "Abono a deuda" y "Aporte a ahorro" se separaron a NAV.A2b: no son globales (los flujos actuales exigen elegir la deuda/meta/apartado por `data-id`, un selector de destino que aún no existe y que encaja con el hub de NAV.B). La oferta de distribución sigue diferida (modo "ya acreditado" del asistente, ADR 024 D3).

**Cierra [BUG-010]:** el bottom nav ahora compensa `env(safe-area-inset-bottom)` (altura + `padding-bottom`) y `.main-content` deja libre ese alto; en iPhone con home indicator los labels ya no quedan bajo la franja del sistema.

Verificado en móvil 390x844 (nav en el orden correcto, la hoja abre y enruta a Gasto e Ingreso sin errores) y a 320px (sin scroll horizontal). 2037/2037 unit; **131/131 E2E** (+3, nueva suite `registrar-sheet`); lint limpio. SW v301 → v302.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolo `i-plus`, botón central "Registrar" en el nav, hoja `modal-registrar`. |
| `modules/ui/actions.js` | Acción built-in `registrar-abrir` (cierra la hoja e invoca la acción destino). |
| `styles/responsive.css` | Fix BUG-010 (safe area en `.sidebar` y `.main-content`) + FAB `.nav-item--registrar`. |
| `styles/modals.css` | Hoja "Registrar": grid de 2 tejas, descripciones y tintes gasto/ingreso. |
| `tests/e2e/registrar-sheet.test.js` | Suite nueva (3 tests): nav de 5, hoja abre y enruta a Ingreso y a Gasto. |
| `service-worker.js` | v301 → v302. |

---

### feat(tesoreria): NAV.A1, ingreso puntual en Mis cuentas · 2026-07-04

Primera tarea de implementación del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). La auditoría detectó que registrar dinero que entra no tenía camino real: la única acción era la fuente fija (`nuevo-ingreso`), escondida y sin fecha ni cuenta. Ahora Mis cuentas tiene una sub-sección "Otros ingresos" con un botón "+ Ingreso" que abre "Registrar un ingreso": monto, cuenta destino (selector 0/1/varias de `cuenta-helper`; con 0 cuentas, guía a agregar una), descripción y categoría opcionales, y fecha (hoy por defecto).

Decisiones de datos y alcance (ver ADR 024 D3, revisado): colección nueva `S.ingresosPuntuales` (migración v21→v22 idempotente), no reutilizar `S.ingresos` (plantillas recurrentes, otro shape). El registro **acredita el saldo** de la cuenta destino y eliminarlo lo **revierte**, espejo exacto de un gasto (que descuenta y devuelve). Respeta la v8.8: el ingreso se refleja por su efecto (hero "Tu dinero disponible" y patrimonio neto), **no** como flujo en Análisis ni en el resumen semanal, que no cambian. La oferta del asistente de distribución al confirmar quedó **diferida a NAV.A2**: `_confirmarDistribucion` re-acredita la cuenta, así que abrirlo con el monto ya acreditado duplicaría el abono; unificar los flujos es propio de la hoja "Registrar".

Verificado en la app (móvil 390x844): saldo 100k → 350k al registrar $250k, hero muestra $350.000, y al eliminar vuelve a 100k con 0 registros; cero errores de consola. 2037/2037 unit (+13); 128/128 E2E; lint limpio. SW v300 → v301.

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | Slice `ingresosPuntuales` + typedef `IngresoPuntual`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 22 + migración v21→v22. |
| `modules/dominio/tesoreria/logic.js` | `validarIngresoPuntual` + `normalizarIngresoPuntual` (puras). |
| `modules/dominio/tesoreria/view.js` | `renderFormIngresoPuntual` + `renderListaIngresosPuntuales`. |
| `modules/dominio/tesoreria/index.js` | Handlers nuevo/guardar/eliminar + acredita/revierte saldo + acciones + EventBus. |
| `index.html` | Sub-sección "Otros ingresos" + modal `modal-ingreso-puntual`. |
| `styles/layout.css`, `styles/components/atoms.css` | `.section__sub-hint` + `.list-item__value--in` (verde). |
| `tests/unit/tesoreria.test.js`, `tests/unit/storage.test.js` | +13 tests (validar/normalizar + migración v22). |
| `service-worker.js` | v300 → v301. |

---

### docs(nav): auditoría de navegación móvil, ADR 024 y tarjetas NAV · 2026-07-04

Auditoría completa de la navegación móvil con ojos de usuario nuevo (viewport 390x844 con Playwright, localStorage limpio) más lectura del código de navegación. Resultado del test de orientación (8 preguntas): 3 evidentes, 3 a medias, 2 fallidas. Hallazgos principales: no existe registro de ingreso puntual y el ingreso fijo vive escondido en Mis cuentas (asimetría entró/salió); no hay acción de registro global y los CTA de alta viven en la peor zona del pulgar; 10 de 13 secciones detrás del modal "Más"; el dinero guardado repartido en 4 secciones sin jerarquía; la barra inferior no compensa el safe area de iOS (registrado como BUG-010).

Decisión aprobada en [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md): bottom nav de 5 posiciones con botón central "Registrar" (hoja con Gasto/Ingreso siempre y Abono/Aporte por divulgación progresiva), ingreso puntual como capacidad nueva de `tesoreria`, hub "Ahorros" (una entrada, cuatro pestañas, consolidado de ADR 009 como cabecera, sin fusionar dominios), modal "Más" plano de 7 tarjetas y pulidos. Revisa a nivel de navegación la decisión 2026-06 de no fusionar las 4 secciones de ahorro; los dominios no se tocan.

Solo documentación: ninguna funcionalidad afectada. Validación pendiente: ninguna (la implementación arranca con NAV.A1).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/024-reorganizacion-navegacion-movil.md` | ADR nuevo: contexto (auditoría), decisión D1 a D6, alternativas, slices. |
| `docs/BOARD.md` | Iniciativa de navegación 2026-07: tarjetas NAV.A1, NAV.A2, NAV.B y NAV.C. |
| `docs/BUGS.md` | BUG-010 registrado (safe area del bottom nav). |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente". |

---

### feat(ui): ID.6, Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación · 2026-07-04

Revisión del lenguaje de iconografía ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), sección "Revisión v2"). Al arrancar ID.3, el usuario replanteó el sistema: el lenguaje v1 (trazo 2, duotono 15 %, punto monocromo) cumplía pero se percibía neutro y frío. Tras análisis de mercado y 3 direcciones dibujadas sobre la paleta real, se adoptó la dirección A ("trazo cálido con chispa") combinada con C (insignias por dominio, para las categorías de ID.3); la B (sello sólido) se descartó por pesada en listas densas.

Reglas v2: trazo 2.35 global vía CSS `.icon` (`--sm` 2.5, `--lg` 1.8; toda la familia gana cuerpo en un solo cambio), redondez sistemática (radios ≥ 2.9, ápices con arco), duotono al 22 %, y **la chispa**: el punto de valor pasa a `fill="var(--fk-icon-dot, currentColor)"` y el contexto lo enciende en color. La navegación lo pone en acento: item inactivo gris con chispa verde viva (firma visible de la familia); sin variable declarada cae a `currentColor`, cero regresión y cero JS.

Piloto: los 14 símbolos de navegación redibujados en v2. Cambio de metáfora en Inversión: de zigzag con flecha a curva suave ascendente con la chispa en el extremo (progreso calmado). Verificado en preview (tema oscuro y claro: chispa `#1fd194` / `#13b377`, trazo computado 2.35px). 2024/2024 unit; 128/128 E2E. SW v299 → v300.

**Pendiente de validación:** revisión visual del usuario en su celular (nav inferior, modal "Más", empty states con trazo 1.8).

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados en v2; comentario del sprite actualizado. |
| `styles/components/forms.css` | `.icon` a trazo 2.35; `.icon--sm` 2.5; `.icon--lg` 1.8. |
| `styles/layout.css` | `--fk-icon-dot: var(--fk-accent)` en `.nav-item__icon.icon` (chispa encendida en nav). |
| `docs/DECISIONS/023-...md` | Sección "Revisión v2" con motivo, direcciones evaluadas y reglas nuevas. |
| `service-worker.js` | v299 → v300. |

---

### feat(ui): ID.2, familia Finko Icons en el resto de la UI estructural · 2026-07-04

Tercera fase de la identidad visual ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)). Se redibujan 8 símbolos existentes con el lenguaje (duotono + punto de valor): `i-saldo`, `i-recurring`, `i-lightbulb`, `i-alert`, `i-bolt`, `i-trophy`, `i-mountain` y `i-circle` (reinterpretado como "bola de nieve": dos círculos, uno chico creciendo a uno grande). Se agregan 5 símbolos nuevos: `i-star`, `i-percent`, `i-trending-up`, `i-info`, `i-bar-chart`; y se reutiliza `i-cuentas` para "Consolidar deudas" (misma metáfora, sin dibujo nuevo).

Se retiran los emojis de utilería concentrados en la card "Estrategia de pago" (💡, 💪, ✨, ℹ️, 🚨, ⚠️, 📊, 🤝, 🏦) y en el tip evergreen de Inversión (💡), reemplazados por `icon()`. Nuevo modificador `.icon--sm` (14px) para iconos junto a texto xs/sm.

**Fuera de alcance a propósito:** un `hint.textContent` en Apartados que interpola 💡 (asignar HTML a `textContent` lo mostraría como texto crudo); los emojis de categoría (`CATEGORIA_*_EMOJI`, dominio de ID.3); el badge "📝 Pendiente" de Gastos y los usos sueltos de ⚠ en otros 8 archivos (fuera del cúmulo visual que motivó esta fase).

2024/2024 unit; 128/128 E2E. Lint limpio. SW v298 → v299.

| Archivo | Cambio |
|---|---|
| `index.html` | 8 símbolos rediseñados + 4 nuevos (star, percent, trending-up, info, bar-chart). |
| `modules/dominio/compromisos/views/estrategia.js` | 10 emojis de utilería reemplazados por `icon()`. |
| `modules/dominio/inversiones/view.js` | Tip evergreen con `icon('lightbulb')`. |
| `styles/components/forms.css` | `.icon--sm`. |
| `styles/components/charts.css` | Tamaño de icono en `estrategia-card-pick__icono` (desktop + mobile). |
| `docs/DECISIONS/023-...md`, `docs/DESIGN_SYSTEM.md` | ID.2 documentada, `.icon--sm` referenciado. |
| `service-worker.js` | v298 → v299. |

---

### feat(ui): ID.4, espaciado y jerarquía en las tarjetas más densas · 2026-07-04

Segunda fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Cinco puntos de la auditoría visual quedan resueltos:

- **"¿Cómo distribuir?" (Mis cuentas, la tarjeta más densa en móvil):** las filas Necesidades/Estilo de vida/Ahorro pasan de párrafos corridos a un mini listado alineado (icono, etiqueta, porcentaje, monto) con filete discreto entre filas. Las alertas ("fondo aún no completo"...) ganan un callout con tinte de advertencia en vez de mezclarse con el texto. Los enlaces "Ver progreso/estrategia/seguimiento" pasan a fila propia con separación real entre ellos.
- **Bug real, no solo espaciado:** el icono de "1 pendiente del mes" en Inicio era invisible: reutilizaba `.cal-dot--*`, que pinta fondo Y color del mismo tono, así que el SVG quedaba del mismo color que su propio fondo. Ahora es un chip con fondo tenue y el icono en el color completo del dominio (`vencidos-card__icon--fijo/deuda-entidad/deuda-personal`).
- **Tarjeta del fondo (Ahorro):** la nota "este dinero sigue en tus cuentas..." se separa del dato "Objetivo: $X" con un filete y un peldaño menos de peso visual (ya no compite con la cifra).
- **Confetti de logros en móvil:** cada pieza partía siempre desde `bottom:90px` y caía 80px; en desktop no pasaba nada, pero en móvil terminaba a 10px del borde, dentro de la franja del bottom-nav. Ahora en viewports < 1024px arranca por encima de esa franja (mismo criterio que ya usa el toast).
- **Fade del sidebar (ventanas ≤ 800px de alto):** la franja que insinúa "hay más para desplazar" pasa de 20px a 36px con más paradas de color, así el borde de "HERRAMIENTAS" se ve como un desvanecido intencional y no como texto cortado a la mitad.

2024/2024 unit; 128/128 E2E. Lint limpio. SW v297 → v298.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Filas de distribución, alertas y CTAs con markup propio. |
| `modules/dominio/compromisos/views/dashboard.js` | Icono de vencidos con clase de color dedicada (fix del bug de invisibilidad). |
| `modules/dominio/ahorro/view.js` | Nota del fondo con clase propia (separada del dato). |
| `modules/dominio/logros/index.js` | Confetti con clearance de bottom-nav en móvil. |
| `styles/components/domain.css` | `.distribucion-row/-alerta/-ctas`, `.vencidos-card__icon--*`. |
| `styles/components/analysis.css` | `.fondo-hero__nota`. |
| `styles/layout.css` | Fade del sidebar más alto y suave; `.nav-item` compacto en ventanas bajas. |
| `service-worker.js` | v297 → v298. |

---

### feat(ui): ID.1, lenguaje de iconografía propio con piloto en la navegación · 2026-07-04

Primera fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Nace la familia **"Finko Icons"** ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): línea sobre grid 24 (trazo 2 heredado de `.icon`), **duotono** (la región "cuerpo" con `fill="currentColor" fill-opacity=".15"` como atributo del símbolo, atraviesa `<use>` sin CSS nuevo) y **punto de valor** (un círculo sólido integrado en la metáfora: la firma de la familia). Glifos utilitarios quedan monolínea a propósito.

Piloto: los 14 símbolos de navegación redibujados (`i-home`, `i-gastos` recibo, `i-agenda` día marcado, `i-deudas`, `i-mas`, `i-cuentas`, `i-personales` persona + moneda, `i-presupuesto` velocímetro, `i-metas` diana, `i-apartados`, `i-ahorro` frasco con moneda, `i-inversion` curva con área, `i-analisis` dona, `i-ajustes` deslizadores). Dos metáforas cambian a propósito: Límites pasa de torta a velocímetro y Ahorro de cerdito a frasco (legibilidad a 22px). Ids intactos: ningún consumidor (`icon()`, `emptyArt()`, HTML) cambió. Verificado con capturas Playwright a 22/48px en ambos temas, sidebar y bottom-nav. Cero costo de rendimiento (sprite estático, sin peticiones ni JS nuevos).

Fases siguientes en el tablero: ID.2 (resto del chrome), ID.3 (categorías, retira emojis estructurales), ID.4 (espaciado en tarjetas densas), ID.5 (micropulido de cifras).

2024/2024 unit; 128/128 E2E. SW v296 → v297.

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados + comentario del sprite actualizado. |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | ADR nuevo: lenguaje Finko Icons y plan de fases. |
| `docs/DESIGN_SYSTEM.md` | Sección Iconografía reescrita (lenguaje + estado de migración). |
| `docs/BOARD.md` | Tarjetas ID.2-ID.5 en Transversal. |
| `service-worker.js` | v296 → v297. |

---

### style(analisis): paleta unificada entre la dona y las barras por categoría · 2026-07-04

Cierra la observación registrada en el tablero de Análisis. Las barras laterales de "Gastos por categoría" dejan de ser todas verdes: cada una usa **el color que la dona le asignó a su categoría** (misma fuente: `colorearSegmentos`), y las categorías agrupadas en "Otros" heredan el slate de ese segmento, para que el color cuente la misma historia en toda la sección. Sin dona (sin segmentos), las barras conservan el color por defecto.

2022/2022 → 2024/2024 unit (2 nuevos); 128/128 E2E. Lint limpio. SW v295 → v296.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | Barras con el color de su segmento de la dona. |
| `tests/unit/analisis.test.js` | 2 tests nuevos (paleta unificada en happy-dom). |
| `service-worker.js` | v295 → v296. |

---

### feat(tesoreria): MC.6c, señales más ricas para la distribución automática · 2026-07-04

Cierra MC.6c, la última tarjeta accionable del tablero. Dos señales nuevas en el motor de pisos (ADR 013):

- **Historial de gasto variable como proxy del estilo de vida real.** Nueva `calcularGastoVariablePromedio(gastos, hoy, meses)`: promedio mensual del gasto variable (sin `compromisoId` y fuera de Deudas/Ahorro/Gastos fijos) sobre los últimos 3 meses completos; los meses sin registros no diluyen y el mes corriente se excluye. El motor eleva el piso de Estilo de vida a ese promedio cuando supera el 10% mínimo: sugerir menos de lo que el usuario de verdad gasta produce planes incumplibles. Si eso aprieta el ahorro por debajo de su ideal, alerta accionable con el rubro a recortar (mismo espíritu que MC.11) y la razón lo menciona. Sin historial, la señal queda apagada (retrocompatible: reparto idéntico al anterior).
- **Inversiones como prioridad tras el fondo.** Con fondo completo y usuario que ya invierte, la razón agrega "tu fondo está completo, así que el ahorro puede ir a tus inversiones" y aparece la CTA "Aportar a tus inversiones" (antes ese caso no tenía CTA de inversión; "Explorar inversiones" sigue reservada a quien no invierte).

Límites de gasto consume el mismo `construirContextoDistribucion`: mejora automáticamente. Un test viejo fijaba el contrato anterior ("ya invierte → sin CTA"); se actualizó al nuevo.

2012/2012 → 2022/2022 unit (10 nuevos, 1 actualizado); 128/128 E2E. Lint limpio. SW v294 → v295.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularGastoVariablePromedio`; piso EV informado por historial; razón/alerta/CTA nuevas. |
| `tests/unit/tesoreria.test.js` | 10 tests nuevos (proxy + señales), 1 actualizado. |
| `service-worker.js` | v294 → v295. |

---

### feat(inversiones): E.5, IPC observado como constante anual · 2026-07-04

Cierra E.5. Nueva constante `IPC_OBSERVADO_POR_ANIO` (variación anual del IPC al cierre de diciembre, decimal) con fuente y fecha de revisión (regla ADN #12): 2024 = 5,20% y 2025 = 5,10% (DANE, boletín de 2026-01-08), más el helper `ipcObservadoVigente()`.

Primer consumidor: la **rentabilidad real del portafolio** de Inversión pasa a descontar la inflación observada (el dato real de pérdida de poder adquisitivo) en vez de la meta de BanRep (3%), que queda en el copy como referencia de largo plazo. Con tasas nominales típicas de CDT (~9-10% EA) la diferencia es material: real ~4,2% con IPC observado vs ~6,3% con la meta. Mantenimiento anual: agregar la entrada del año en enero, junto a E.2.

2008/2008 → 2012/2012 unit (4 nuevos); 128/128 E2E. Lint limpio. SW v293 → v294.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `IPC_OBSERVADO_POR_ANIO` + `ipcObservadoVigente()`. |
| `modules/dominio/inversiones/view.js` | Rentabilidad real con IPC observado; copy con ambas referencias. |
| `tests/unit/constants.test.js` | Describe E.5 (4 tests). |
| `service-worker.js` | v293 → v294. |

---

### feat(gastos): TX.3, categorías Café y Gastos hormiga · 2026-07-04

Cierra TX.3. Dos categorías nuevas en el catálogo de gastos: **Café ☕** y **Gastos hormiga 🐜** (el concepto conocido en finanzas personales para las fugas pequeñas y recurrentes). Aparecen automáticamente en el form de gasto, los envelopes de Límites y la dona de Análisis. Sin migración: los gastos existentes no cambian. Guardarraíl nuevo: toda categoría de gasto debe tener emoji propio (ninguna cae al fallback 📦).

2005/2005 → 2008/2008 unit (3 nuevos); 128/128 E2E. Lint limpio. SW v292 → v293.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `Café` y `Gastos hormiga` en `CATEGORIAS_GASTO` + emojis. |
| `tests/unit/constants.test.js` | Describe TX.3 (3 tests). |
| `service-worker.js` | v292 → v293. |

---

### feat(logros): LG.1b, vitrina de logros en Ajustes · 2026-07-04

Cierra LG.1b con el ADR que pedía ([ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md)):

- **Decisión de ubicación:** card "🏆 Logros" al final de **Ajustes** (no sección propia: la nav ya tiene 13 secciones y la vitrina es solo lectura; no en Inicio: IN.1-IN.3 lo curaron como estado financiero del día). El momento de descubrimiento sigue siendo el toast (LG.1a); la vitrina es el "ver todos".
- **Arquitectura:** `config` no puede importar `logros` (ADN #10), así que el shell expone `#panel-logros` junto a `#panel-config` y el dominio logros renderiza ahí su propia vista (`logros/view.js`, archivo nuevo, agregado al precache del SW).
- **Catálogo extendido:** cada logro gana `hint` (cómo desbloquearlo, en imperativo; los conseguidos muestran `desc`) y `progreso(s)` opcional solo en los de conteo observable directo de S: `diez-gastos` (n de 10) y `diversificador` (n de 3 cuentas activas), con barra de progreso accesible. El progreso del fondo ya vive en Ahorro con su anillo: no se duplica.
- Nueva `estadoLogros(s, idsPersistidos)` pura: desbloqueado = persistido en `S.logros` o cumplido en vivo (un logro ganado no se revoca aunque el estado retroceda).

1994/1994 → 2005/2005 unit (11 nuevos); 128/128 E2E. Lint limpio. SW v291 → v292.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/022-vitrina-de-logros-en-ajustes.md` | ADR nuevo. |
| `modules/dominio/logros/logic.js` | `hint` + `progreso` en el catálogo; `estadoLogros`. |
| `modules/dominio/logros/view.js` | Archivo nuevo: vitrina. |
| `modules/dominio/logros/index.js` | Render en init, state:change y hashchange. |
| `index.html`, `service-worker.js` | Contenedor `#panel-logros`; asset nuevo + v291 → v292. |
| `styles/components/config.css` | Estilos `.logro-item` (pendientes atenuados, emoji en gris). |
| `tests/unit/logros.test.js` | 11 tests nuevos (estadoLogros + vitrina en happy-dom). |

---

### feat(agenda): AP.4, MT.2 y AH.4, recordatorio de día de ingreso en Calendario · 2026-07-04

Cierra las tres épicas de recordatorios de aporte con el único ADR que pedía el tablero ([ADR 021](DECISIONS/021-recordatorio-dia-de-ingreso.md)):

- **Modelo elegido:** el día de pago de cada ingreso activo (`diaPago`, capturado desde v12) aparece en Calendario como **evento de "día de ingreso"**: dot verde (`--fk-dom-ingresos`), entrada en la leyenda, item de detalle con el monto en verde, el recordatorio "Hoy llega tu dinero: recuerda apartar para tus objetivos" y botón **"Distribuir →"**. Respeta la frecuencia (Quincenal = dos ocurrencias, misma lógica que compromisos). El aria-label y el resumen del día distinguen "día de ingreso" de los compromisos a pagar, y el ingreso no infla el "Total a pagar".
- **Sin duplicar a MC.4:** el CTA emite `distribuir:abrir` (EventBus); tesorería navega a Mis cuentas y abre el asistente "Distribuir mi ingreso" en el primer paso. Los montos por vehículo ("$X para el SOAT", "Abonar a la meta") viven SOLO en el asistente: cero réplica del motor de ADR 013 en Agenda. Se rechazó el modelo de N eventos por meta/apartado/fondo (spam + flujos paralelos inferiores).
- El gating por fecha del asistente (MC.4d) sigue mandando: si el cobro aún no llega o ya se distribuyó, el usuario ve ese estado al llegar (degradación coherente).
- El nudge de proximidad de Apartados (60 días) se mantiene; el botón "Definir →" del compromiso mensual se conserva (la parte de AH.4 que pedía quitarlo quedó superada por AH.2: ese form ahora es la casa del aporte sugerido explicado; se verificó que `compromisoMensual` no alimenta nudges ni Score).

1983/1983 → 1994/1994 unit (11 nuevos); 127/127 → **128/128 E2E** (nuevo test del flujo completo: día en calendario → CTA → asistente abierto). Lint limpio. SW v290 → v291.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/021-recordatorio-dia-de-ingreso.md` | ADR nuevo (modelo agregado, alternativas rechazadas). |
| `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes`; `totalDia` excluye ingresos. |
| `modules/dominio/agenda/view.js` | Merge por día, item de ingreso, leyenda, aria/resumen. |
| `modules/dominio/agenda/index.js` | Acción `agenda-distribuir-ingreso`; re-render ante `ingresos`. |
| `modules/dominio/tesoreria/index.js` | Listener `distribuir:abrir` + `_abrirAsistenteDistribucion`. |
| `styles/components/config.css` | `cal-dot--ingreso`, franja e ícono del item (patrón AG.6/AG.7). |
| `tests/unit/agenda.test.js`, `tests/e2e/smoke.test.js` | 11 unit + 1 E2E nuevos. |
| `service-worker.js` | v290 → v291. |

---

### feat(ahorro): AH.3 y AUD.6, ADR 020 fondo como marcador de liquidez + hint del modelo · 2026-07-04

Cierra juntas AH.3 y AUD.6, que el tablero pedía resolver en la misma decisión ([ADR 020](DECISIONS/020-fondo-marcador-de-liquidez.md)):

- **Decisión (AH.3):** el fondo de emergencia **sigue siendo un marcador de liquidez**: el aporte no pide cuenta de origen ni descuenta saldo. Se rechaza la variante con patrón AP.1 porque el modelo con descuento no tiene flujo de salida (el fondo no se "gasta" como una meta o un apartado: se usa en emergencias, y el dinero quedaría atrapado fuera de Mis cuentas), la migración retroactiva es imposible (los aportes históricos no tienen cuenta) y toda la app ya asume el marcador (Distribuir mi ingreso, Score, consolidado). La asimetría con Metas/Apartados es de propósito: esos vehículos son gasto futuro comprometido; el fondo es liquidez etiquetada.
- **Implementación (AUD.6):** hint permanente en la card del fondo ("Este dinero sigue en tus cuentas: el fondo solo lo marca como reservado para emergencias") y en el form de aporte, cerrando la doble contabilidad mental que motivaba ambas tarjetas.
- AH.4 pierde su dependencia de AH.3: el ADR de recordatorios (AP.4/MT.2/AH.4) puede diseñarse sobre un modelo ya fijado.

1983/1983 unit; 127/127 E2E. Lint limpio. SW v289 → v290.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/020-fondo-marcador-de-liquidez.md` | ADR nuevo con la decisión y las alternativas rechazadas. |
| `modules/dominio/ahorro/view.js` | Hint del modelo en card y form de aporte. |
| `service-worker.js` | v289 → v290. |

---

### feat(ahorro): AH.2, aporte recomendado del fondo explicado con datos reales · 2026-07-04

Cierra AH.2. El compromiso mensual del fondo de emergencia deja de ser una pregunta sin guía: el modal muestra un **aporte sugerido construido con los datos reales del usuario** y la explicación de dónde sale, con botón "Usar este monto".

- Nueva `calcularAporteSugerido` (pura, en `ahorro/logic.js`), **alineada con el motor de distribución de Mis cuentas** (ADR 013, MC.6a/MC.10/MC.11) para no tener dos recomendaciones contradictorias: mismo horizonte de 12 meses para cerrar el fondo, mismos pisos (estilo de vida 10%, ahorro 5%), mismo reparto proporcional con margen corto y misma honestidad en déficit (si fijos + cuotas superan el ingreso: $0 y la verdad, sin inventar porcentajes).
- Señales que usa: ingresos mensuales proyectados, gastos fijos, cuotas de deuda activas y el aporte que ya piden las metas/apartados con fecha (réplica local del cálculo de tesorería, regla ADN #10). Cinco bases posibles: `meta` (alcanza el ritmo de 12 meses), `capacidad` (sugiere lo que el margen permite y estima el plazo real; con más de 36 meses no promete fechas), `piso` (margen corto: proporcional 5/15), `deficit` y `completo`.
- **Si falta el ingreso** (nada registrado), la sugerencia usa solo el faltante/12 y el form pide "¿Cuánto recibes al mes, aproximadamente?": la caja se recalcula en vivo mientras el usuario escribe, sin persistir el dato.
- La sección de hábito, cuando no hay compromiso definido, acompaña la pregunta con "Según tus números, $X es un buen punto de partida".

1974/1974 → 1983/1983 unit (9 tests nuevos); 127/127 E2E. Lint limpio. SW v288 → v289.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/logic.js` | `calcularAporteSugerido` + constantes alineadas con ADR 013. |
| `modules/dominio/ahorro/view.js` | Caja de sugerencia reutilizable; form con input de ingreso opcional; hint en hábito. |
| `modules/dominio/ahorro/index.js` | Contexto (cuotas de deuda, objetivos con fecha); recálculo en vivo; acción `ahorro-usar-sugerido`. |
| `tests/unit/ahorro.test.js` | 9 tests nuevos. |
| `service-worker.js` | v288 → v289. |

---

### feat(personales): PE.1, tasa de interés opcional y reparto capital/interés · 2026-07-04

Cierra PE.1. El préstamo dado (Me deben) acepta una **tasa de interés mensual opcional**, el modelo del préstamo informal en Colombia ("te presto al 2% mensual"): interés simple sobre el capital pendiente, prorrateado por días (mes comercial de 30), sin capitalización. Sin tasa, nada cambia (retrocompatible en lógica, vista y tests).

- **Con tasa, cada pago cubre primero el interés acumulado** y el resto baja el capital (orden estándar de imputación). `aplicarPago` mantiene los acumuladores `capitalPagado`, `interesPagado` e `interesPendiente` (snapshot del devengo al último abono, que es el ancla del devengo siguiente: no se cuenta doble).
- La card muestra el desglose ("Pendiente: $X (capital $C + interés $I)"), la tasa y el interés ya cobrado; la barra de progreso mide **recuperación de capital** (no se infla con intereses). El modal de pago muestra capital e interés acumulado y explica el orden de imputación; el anuncio del abono dice cuánto fue a capital y cuánto a interés.
- El resumen agregado incluye el interés devengado en "Pendiente" y el interés recibido en "Te han devuelto"; `pctCobrado` sigue midiendo capital.
- **Schema v20 → v21** (migración idempotente): préstamos existentes quedan con `tasa: null` y acumuladores derivados de `pagado` (todo lo cobrado fue capital). Nueva fórmula reusable `calcularInteresSimple` en `infra/financiero.js`.

1934/1934 → 1974/1974 unit (40 tests nuevos); 127/127 E2E. Lint limpio. SW v287 → v288.

| Archivo | Cambio |
|---|---|
| `modules/infra/financiero.js` | Nueva `calcularInteresSimple(capital, tasaMensualPct, dias)`. |
| `modules/dominio/personales/logic.js` | `tieneInteres`, `calcularCapitalPendiente`, `calcularInteresPendiente`, `desglosarPago`; `calcularPendiente`/`aplicarPago`/`porcentajePagado`/`calcularResumen`/validación/normalización con tasa. |
| `modules/dominio/personales/view.js` | Campo de tasa en el form; desglose en card y modal de pago. |
| `modules/dominio/personales/index.js` | Persiste acumuladores; anuncio con reparto capital/interés. |
| `modules/core/storage.js` | Migración v20 → v21. |
| `tests/unit/personales.test.js`, `tests/unit/storage.test.js`, `tests/unit/calculadoras.test.js` | 40 tests nuevos (lógica de interés, migración, fórmula). |
| `service-worker.js` | v287 → v288. |

---

### feat(tesoreria): MC.10 y MC.11, piso de ahorro y detección de déficit real · 2026-07-03

Cierra MC.10 y MC.11 juntas, como sugería el tablero ([ADR 013 revisado](DECISIONS/013-distribucion-automatica-inteligente.md), decisiones A y B). Ambas ajustan el reparto del modo Automático cuando las Necesidades son altas:

- **MC.10 (piso de ahorro):** nueva constante `_PISO_AHORRO_PCT = 5`. Cuando el residuo del ingreso no alcanza para el piso de Estilo de vida (10%) más el de ahorro, se reparte **proporcional a los pisos** (el ahorro recibe 1/3 del margen) en vez de irse entero a Estilo de vida. Antes, con obligaciones al 92%, el ahorro quedaba en $0 aunque hubiera fondo incompleto u objetivos con fecha. El ahorro solo queda en $0 sin margen real (obligaciones ≥ 100%) o con déficit real.
- **MC.11 (déficit real):** `construirContextoDistribucion` incorpora el slice `gastos` y deriva `gastosDelMes`. Si los gastos ya registrados este mes superan el ingreso (ej. un fijo que no está en Calendario y se registró suelto), el modo auto deja de mostrar una distribución "ideal" incoherente: ahorro a $0, razón honesta ("tus gastos ya van en el 113% de tu ingreso: estás gastando más de lo que entra") y alerta accionable (revisar en Análisis, recortar Estilo de vida, registrar en Calendario los fijos que falten). Los presets explícitos no se tocan.

El asignado por grupo de Límites de gasto mejora automáticamente (consume el mismo motor). 1927/1927 → 1934/1934 unit (7 tests nuevos); 127/127 E2E (una corrida con flaky de a11y-forms que pasó en retry; re-corrida limpia). Lint limpio. SW v286 → v287.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Piso de ahorro proporcional; `gastosDelMes` + rama de déficit real. |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos (3 de MC.10, 3 de MC.11, 1 de contexto). |
| `docs/DECISIONS/013-...md` | Revisión con decisiones A y B. |
| `service-worker.js` | v286 → v287. |

---

### feat(compromisos): D.10 y D.13, categorías de relación para deuda personal y Fiado · 2026-07-03

Cierra D.10 y D.13 en un solo pase de diseño, como pedía el tablero ([ADR 015 revisado](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md), decisiones 5 y 6):

- **D.10:** nuevo catálogo `CATEGORIAS_DEUDA_PERSONAL` (Familiar 👪, Amigo 🤝, Vecino 🏘️, Natillera 💰, Prestamista particular 💼, Fiado 🏪, Otro 📦). El form de deuda personal pregunta "¿Con quién es la deuda?" en vez de ofrecer productos de entidad (Tarjeta, Vivienda...). Mismo campo `categoria` en el schema; validación y normalización aceptan solo el catálogo del tipo. **Sin migración:** las deudas personales viejas con valor de producto se conservan tal cual y se reclasifican al editar (no se borra un dato elegido por el usuario).
- **D.13:** "Fiado" entra como categoría de relación con **interfaz adaptada**: al elegirlo, el form oculta cuota, tasa y frecuencia (una tienda que fía no cobra interés ni pacta cuota; se abona libre) y el día de pago queda como recordatorio de la fecha acordada. Para habilitarlo, **la cuota mensual pasa a ser opcional en toda deuda personal** (los préstamos de familia sin cuota fija son la norma): si viene debe ser > 0, vacía se guarda `0`. El simulador de estrategia ya excluía cuota 0 (sin cuota no hay plan que simular); la lista muestra la frecuencia en su lugar y Agenda omite el monto cuando es 0.

El guardarraíl TX.4 incorpora el catálogo nuevo (único label compartido: 'Otro' → 📦, consistente). 1917/1917 → 1927/1927 unit (10 nuevos, 3 actualizados); 127/127 E2E. Lint limpio. SW v285 → v286.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_DEUDA_PERSONAL` + emojis. |
| `modules/dominio/compromisos/logic.js` | Validación/normalización por catálogo del tipo; cuota opcional en personal. |
| `modules/dominio/compromisos/views/formularios.js` | Catálogo y labels por tipo; cuota opcional; grupos con id para el toggle. |
| `modules/dominio/compromisos/index.js` | `_wireToggleFiado` (oculta cuota/tasa/frecuencia al elegir Fiado). |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/tesoreria/view.js` | Lookup de emoji unificado producto + relación. |
| `modules/dominio/agenda/view.js` | Deuda sin cuota no muestra "$0". |
| `modules/core/state.js`, `docs/DECISIONS/015-...md` | JSDoc del schema; revisión del ADR. |
| `tests/unit/compromisos.test.js`, `tests/unit/constants.test.js` | 10 tests nuevos; TX.4 con el catálogo nuevo. |
| `service-worker.js` | v285 → v286. |

---

### feat(presupuesto): MC.8d, pulido de Límites con iconos por categoría · 2026-07-03

Cierra MC.8d. Los envelopes y la lista de categorías huérfanas de Límites de gasto muestran el emoji de su categoría (`CATEGORIA_EMOJI`, fallback 📦), igual que ya lo hacía el panel de alertas del dashboard. Los otros frentes de la tarjeta (copy final por grupo, estados vacíos, a11y) ya habían quedado cubiertos por EP.7b (banner y copy de Límites), MC.8b (fusión de topes en la card) y A11Y.1-5: sin más cambios.

1917/1917 unit verdes; 127/127 E2E. Lint limpio. SW v284 → v285.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Emoji de categoría en envelopes y huérfanas. |
| `service-worker.js` | v284 → v285. |

---

### test(rwd): RWD.1, verificación de reflow real a 320px en E2E · 2026-07-03

Cierra RWD.1 (estaba bloqueada por el preview del entorno; se resolvió por la vía E2E que la propia tarjeta sugería). Nueva suite [tests/e2e/reflow-320.test.js](../tests/e2e/reflow-320.test.js) (4 tests, viewport 320×568, el punto de verificación de reflow de WCAG 1.4.10, que cubre el zoom 200%/400% en pantallas comunes):

- Las 13 secciones, con **datos reales sembrados** (cuentas, gastos, deudas con nombre largo, fijo, meta, préstamo personal, límite, fondo con aportes), no generan scroll horizontal.
- La barra inferior (la sidebar vuelta bottom bar en móvil) queda completa dentro del viewport.
- El modal de gasto rápido (`.input--big-amount`, el caso de riesgo señalado) y el asistente "Distribuir mi ingreso" caben completos.

Resultado: cero solapes ni overflow, ningún fix de CSS requerido. 123/123 → 127/127 E2E; unit sin cambios; solo tests, sin bump de SW. Nota menor de la tarjeta (labels del nav a 10px bajo 360px) sigue vigente y aceptable.

| Archivo | Cambio |
|---|---|
| `tests/e2e/reflow-320.test.js` | Suite nueva (4 tests de reflow). |

---

### feat(presupuesto): MC.8c, layout de dos columnas + fila completa en Límites · 2026-07-03

Cierra MC.8c (ver [ADR 019](DECISIONS/019-limites-por-rol.md)). En desktop, el grid de "Tu plan del mes por grupo" pasa de 3 columnas iguales a: **Necesidades y Ahorro en 2 columnas compactas** (fila de arriba) y **Estilo de vida en fila completa** (es la card alta: contiene la olla finita, los envelopes y las huérfanas, y en 1/3 del ancho quedaba apretada). El DOM sigue el orden visual (Necesidades → Ahorro → Estilo de vida), que coincide con el orden del asistente "Distribuir mi ingreso". En móvil no cambia nada: `responsive.css` ya apila a 1 columna.

1917/1917 unit verdes; 123/123 E2E (los tests usan selectores `data-grupo`, independientes del orden). Lint limpio. SW v283 → v284.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Orden de cards Necesidades → Ahorro → Estilo de vida. |
| `styles/components/analysis.css` | Grid a 2 columnas; Estilo de vida `grid-column: 1 / -1`. |
| `service-worker.js` | v283 → v284. |

---

### feat(compromisos): D.12, aviso de tasa desconocida por deuda en la lista · 2026-07-03

Cierra D.12. El aviso de tasa desconocida era un banner único al tope de la card de estrategia que listaba los nombres, pero al leer la lista de deudas no se identificaba a cuál correspondía. Ahora cada deuda con entidad sin tasa registrada muestra su propio aviso en la card ([lista.js](../modules/dominio/compromisos/views/lista.js)): "⚠️ Tasa por confirmar: la calculamos como 0% y eso subestima los intereses. Confírmala con tu banco." (`.text-warning`, `role="note"`). El contexto de la card ya no repite "tasa por confirmar" (el aviso lo reemplaza). El banner global y su CSS (`.estrategia-card__nota`) se retiran.

1917/1917 unit verdes; 123/123 E2E. Lint limpio. SW v282 → v283.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/lista.js` | Aviso por deuda; contexto sin duplicar la tasa. |
| `modules/dominio/compromisos/views/estrategia.js` | Banner global retirado. |
| `styles/components/charts.css` | `.estrategia-card__nota` retirada (muerta). |
| `service-worker.js` | v282 → v283. |

---

### feat(compromisos): D.11, la recomendación nombra cuándo la deuda a atacar es la única con interés · 2026-07-03

Cierra D.11 (revisó [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md)). En `recomendarEstrategia` ([compromisos/logic.js](../modules/dominio/compromisos/logic.js)), cuando ambas estrategias completan el plan y **una sola deuda cobra intereses**:

- Si gana Avalancha, la razón la nombra: «"Tarjeta" es la única de tus deudas que cobra intereses. Pagarla primero no solo reduce ese costo: lo elimina...» (antes solo el copy genérico de tasa más alta).
- Si esa deuda es además la más chica (Avalancha y Bola de nieve empatan y se recomienda Bola de nieve), la razón suma el hecho: cerrar la primera también deja el plan sin intereses (antes solo "pesa la motivación").
- Con varias deudas con interés, el copy genérico no cambia.

1914/1914 → 1917/1917 unit verdes (3 tests nuevos); 123/123 E2E (suite `estrategia-pago` sin regresiones). Lint limpio. SW v281 → v282.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Razones específicas cuando hay una única deuda con tasa > 0. |
| `tests/unit/compromisos.test.js` | 3 tests nuevos de D.11. |
| `service-worker.js` | v281 → v282. |

---

### fix(ahorro): AH.1, el hint del objetivo del fondo explica de dónde sale el número · 2026-07-03

Cierra AH.1. En el formulario de activar/editar fondo ([ahorro/view.js](../modules/dominio/ahorro/view.js), `renderFormFondo`), el preview "Con esa meta tu objetivo sería $480.000 (3 meses × $160.000 de gastos fijos al mes)" no explicaba de dónde salía el $160.000. Ahora dice que es "lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...)", que es exactamente cómo lo calcula `_gastosFijosMensuales()` (compromisos fijos activos proyectados a valor mensual).

1914/1914 unit verdes; 123/123 E2E. Lint limpio. SW v280 → v281.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/view.js` | Copy del preview del objetivo. |
| `service-worker.js` | v280 → v281. |

---

### feat(logros): LG.1a, toast de logros más legible · 2026-07-03

Cierra LG.1a. Tres mejoras al toast de logro desbloqueado en [logros/index.js](../modules/dominio/logros/index.js):

- **Duración:** `DURACION_MS` sube de 2.5s a 5s (2.5s no alcanzaba para leer el nombre del logro).
- **Pausa al pasar el cursor:** `mouseenter` congela el tiempo restante y `mouseleave` lo retoma (mínimo 1s para que no muera apenas salga el cursor).
- **Cierre manual:** botón ✕ con `aria-label`, también accesible por teclado (focusable, `:focus-visible` visible).

Para poder interactuar, el toast pasa de `pointer-events: none` a `auto`. Los toasts encadenados por timer fijo (1.4s) se reemplazan por una cola de uno a la vez: con la pausa por hover la vida de un toast ya no es predecible, y dos toasts fijos en el mismo punto se solaparían (guard anti doble avance de cola entre `animationend` y su fallback).

1914/1914 unit verdes; 123/123 E2E sin regresiones (el toast interactivo no intercepta ningún flujo). Lint limpio. SW v279 → v280.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Duración 5s, pausa por hover, botón de cierre, cola de toasts. |
| `styles/components/nudges.css` | `pointer-events: auto`; estilos de `.logro-toast__cerrar`. |
| `service-worker.js` | v279 → v280. |

---

### feat(personales): PE.2 a PE.5, estados de seguimiento humanizados en Me deben · 2026-07-03

Cierra PE.2, PE.3, PE.4 y PE.5 en un solo pase (los cuatro reescriben el mismo chip de estado de `_renderPersonalItem` o líneas vecinas).

- **PE.2:** nuevo helper puro `tiempoRelativo(dias)` en [infra/utils.js](../modules/infra/utils.js): 0 → "hoy", 1 → "ayer", luego días/semanas/meses/años con singular correcto ("hace 1 mes", "hace 5 años"). Reusable por cualquier dominio.
- **PE.3:** nueva lógica de estado por `fechaLimite` en [personales/logic.js](../modules/dominio/personales/logic.js): `estadoPrestamo()` devuelve `proximo` (fecha pactada futura), `hoy`, `vencido`, `abonado` o `pendiente`; `labelEstado()` produce el copy de seguimiento: "Próximo pago en 5 días", "Pago programado para hoy", "La fecha de pago pasó hace 2 meses", en vez de "N días, ya toca cobrar".
- **PE.4:** tras un abono el chip ya no dice "0 días": muestra "Recibiste un abono hoy" o "Último abono hace 15 días" (reusa el humanizador de PE.2). El reparto capital/interés quedará para PE.1.
- **PE.5:** el valor "Te han devuelto" del resumen usa `.text-success` (verde, coherente con los patrones de color financieros).

El tono del chip (default/warning/danger) sigue saliendo del reloj de incomodidad (`clasificarAntiguedad` sobre `calcularDias`, que un abono reinicia); un préstamo vencido se muestra en warning si el reloj es reciente y solo pasa a danger cuando es viejo.

1892/1892 → 1914/1914 unit verdes (7 tests de `tiempoRelativo`, 15 de `estadoPrestamo`/`labelEstado`); 123/123 E2E sin regresiones. Lint limpio. SW v278 → v279.

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | Nuevo `tiempoRelativo(dias)`. |
| `modules/dominio/personales/logic.js` | Nuevos `estadoPrestamo` y `labelEstado`. |
| `modules/dominio/personales/view.js` | Chip por estado; "Te han devuelto" en verde. |
| `tests/unit/utils.test.js`, `tests/unit/personales.test.js` | 29 tests nuevos. |
| `service-worker.js` | v278 → v279. |

---

### style(a11y): COL.1 y COL.2, contraste de warning en claro y texto deshabilitado · 2026-07-03

Cierra COL.1 y COL.2 en un solo pase (mismo tipo de ajuste, mismos archivos de tokens).

- **COL.1:** en modo claro `--fk-warning` (y `--fk-warning-text`) pasa de `#a06800` a `#8a5a00`: el contraste sobre `--fk-bg-base` sube de 4.38:1 a 5.5:1 (AA para texto normal, antes solo cumplía para texto grande). `--fk-warning-bg` se retinta al mismo tono. El modo oscuro (10.8:1) no se toca.
- **COL.2:** `--fk-text-disabled` sube un punto de contraste en ambos temas: oscuro `#424858` → `#565d72` (2.05:1 → 2.9:1), claro `#b0b4c8` → `#8f94ac` (1.92:1 → 2.8:1). El texto deshabilitado está exento de WCAG, pero con baja visión era ilegible; sigue viéndose claramente inactivo frente a `--fk-text-muted`.

1892/1892 unit verdes; 123/123 E2E (incluye el pase axe con `color-contrast` en Chromium real, que valida COL.1 directamente). Lint limpio. SW v277 → v278.

| Archivo | Cambio |
|---|---|
| `styles/themes.css` | Warning claro oscurecido; disabled claro oscurecido. |
| `styles/tokens.css` | Disabled oscuro aclarado. |
| `service-worker.js` | v277 → v278. |

---

### test(a11y): A11Y.5, pase axe sobre formularios dinámicos en E2E · 2026-07-03

Cierra A11Y.5. `tests/unit/a11y.test.js` solo auditaba el HTML estático de `index.html`; los formularios se inyectan por JS al abrir cada modal y quedaban sin auditar. Nueva suite [tests/e2e/a11y-forms.test.js](../tests/e2e/a11y-forms.test.js): abre en Chromium real los 5 modales representativos (Nuevo gasto, Nueva deuda, Nuevo gasto fijo, Nuevo apartado, Nueva cuenta) y el asistente "Distribuir mi ingreso" (con fondo activo para que haya contenido), inyecta axe-core (la misma devDependency del unit test, cero dependencias nuevas, en línea con `docs/SECURITY.md`) y corre WCAG 2.1 A/AA scoped al contenedor abierto, exigiendo cero violaciones critical/serious. En navegador real `color-contrast` sí es computable, así que no se excluye (a diferencia del unit test en happy-dom).

Resultado: los 6 formularios dinámicos pasan sin violaciones graves (ningún fix requerido). 117/117 → 123/123 E2E; 1892/1892 unit sin cambios; lint limpio. Solo tests: sin cambios en assets de producción, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `tests/e2e/a11y-forms.test.js` | Suite nueva (6 tests axe sobre modales y asistente). |

---

### feat(gastos): TX.6 y TX.7, el gasto hereda el ícono de su compromiso de origen · 2026-07-03

Cierra TX.6 y TX.7 en un solo pase (mismo hook, como sugería el tablero). Un gasto con `compromisoId` nació de un fijo de Calendario (checklist de Necesidades o "marcar pagado") o de un abono a deuda; hasta ahora mostraba el ícono genérico de su categoría: todos los abonos a deuda se veían iguales (💳 de 'Deudas') y los pagos de fijos con el 📦 de 'Otros'.

Nuevo helper puro `emojiPorOrigen(gasto, compromisos)` en [gastos/logic.js](../modules/dominio/gastos/logic.js): fijo → emoji de su categoría de Agenda (`CATEGORIA_AGENDA_EMOJI`, ej. Arriendo 🏠); deuda con entidad → 🏦; deuda personal → 🤝; `null` si no hay origen resoluble (sin `compromisoId`, compromiso eliminado, fijo sin categoría), en cuyo caso `_renderGastoItem` cae al lookup por categoría de siempre. Sin violar la regla de dominios: la vista lee `S.compromisos` (permitido) y el helper es puro (recibe la lista como parámetro).

Verificado con 7 unit tests nuevos del helper (fijo hereda, 🏦 vs 🤝, y los 4 caminos de fallback). 1885/1885 → 1892/1892 unit; 117/117 E2E sin regresiones. Lint limpio. Contenido servido verificado vía `curl`. SW v276 → v277.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | Nuevo `emojiPorOrigen` (importa `CATEGORIA_AGENDA_EMOJI`). |
| `modules/dominio/gastos/view.js` | `_renderGastoItem` resuelve el ícono por origen antes del lookup por categoría. |
| `tests/unit/gastos.test.js` | Suite `emojiPorOrigen` (7 tests). |
| `service-worker.js` | v276 → v277. |

---

### feat(ui): EP.7d, divulgación progresiva en Mis cuentas, Análisis y Me deben. Épica EP.7 completa · 2026-07-03

Cierra EP.7d, el último slice de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md), y con él la épica EP.7 completa (EP.7a a EP.7d):

- **Mis cuentas:** el título del empty state ("¿Dónde tienes tu dinero?", una pregunta gancho que duplicaba la del banner) se recorta a "Agrega tu primera cuenta"; `tieneDatos` = alguna cuenta o algún ingreso ya registrado.
- **Análisis:** el `section__subtitle` "Cómo está tu salud financiera..." se quita de `index.html`; los empties por sub-card (Gastos por categoría, Tendencia de gastos) se revisaron contra el criterio de "no repetir el banner" y ya eran cortos y específicos de su propio dato, se dejan igual; `tieneDatos = S.gastos.length > 0`.
- **Me deben:** empty state recortado; `tieneDatos = S.personales.length > 0`. El fix de copy "Personales" → "Me deben" en el banner ya se había hecho en EP.7a.

Se actualizaron 3 aserciones E2E que verificaban el título viejo del empty state de Mis cuentas.

1885/1885 unit verdes; 117/117 E2E (3 actualizadas, sin regresiones). Lint limpio. Verificado sirviendo el contenido real vía `curl` (mismo síntoma de caché stale del preview ya documentado). SW v275 → v276.

**Con EP.7d cerrado, la épica EP.7 (divulgación progresiva) queda completa en las 11 secciones**: cada una tiene una única descripción de propósito (el banner) que se oculta automáticamente en cuanto la sección tiene datos, sin colapso manual ni preferencia persistida.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js`, `modules/dominio/tesoreria/index.js` | Empty state recortado; nuevo helper `_tieneDatosTesoreria()`. |
| `index.html`, `modules/dominio/analisis/index.js` | Subtítulo de Análisis fuera; `tieneDatos` real. |
| `modules/dominio/personales/view.js`, `modules/dominio/personales/index.js` | Empty state recortado; `tieneDatos` real. |
| `tests/e2e/navegacion-render.test.js` | 3 aserciones actualizadas al nuevo título del empty state de Mis cuentas. |
| `service-worker.js` | v275 → v276. |
| `docs/BOARD.md` | Tarjeta EP.7 borrada (épica cerrada). |

---

### feat(ui): EP.7c, divulgación progresiva en Metas, Ahorro e Inversión · 2026-07-03

Aplica el patrón de EP.7a/EP.7b a los 3 dominios de "Crecer" del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Metas:** el `section__subtitle` "Objetivos aspiracionales: viaje, laptop, boda..." se quita de `index.html`; el empty state se recorta pero conserva en una línea la regla de contexto hacia Apartados (gastos previsibles vs objetivos libres); `tieneDatos = S.metas.length > 0`.
- **Ahorro:** el `section__subtitle` "Tu colchón para imprevistos..." se quita; el empty state se recorta (ya no repite "un imprevisto se cubre con deuda" del banner); `tieneDatos` = fondo de emergencia activo o algún aporte ya registrado.
- **Inversión:** sin subtítulo que barrer; empty state recortado; `tieneDatos = S.inversiones.length > 0`.

Verificación: mismo síntoma de caché HTTP stale del preview ya documentado; se confirmó el contenido real servido vía `curl` y la conducta vía la suite E2E real. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E sin regresiones. Lint limpio. SW v274 → v275.

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos de Metas y Ahorro fuera. |
| `modules/dominio/metas/view.js`, `modules/dominio/metas/index.js` | Empty state recortado; `tieneDatos` real. |
| `modules/dominio/ahorro/view.js`, `modules/dominio/ahorro/index.js` | Empty state recortado; nuevo helper `_tieneDatosAhorro()`. |
| `modules/dominio/inversiones/view.js`, `modules/dominio/inversiones/index.js` | Empty state recortado; `tieneDatos` real. |
| `service-worker.js` | v274 → v275. |

---

### feat(ui): EP.7b, divulgación progresiva en Gastos, Deudas, Calendario y Límites · 2026-07-03

Aplica el patrón de EP.7a (mecanismo `tieneDatos` ya listo) a los 4 dominios siguientes del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Gastos:** empty state recortado de un párrafo a una línea ("Anota tu primera compra o pago."); `tieneDatos = S.gastos.length > 0` (histórico completo, no solo el mes en curso).
- **Deudas:** empty state recortado; `tieneDatos` reusa el helper existente `esDeuda(tipo)` de `compromisos/logic.js` sobre `S.compromisos`.
- **Calendario:** sin subtítulo ni empty state que barrer, solo el wiring de `tieneDatos = S.compromisos.length > 0` (mismos compromisos que Deudas: un fijo o una deuda ya generan eventos del mes).
- **Límites de gasto:** el `section__subtitle` "Sigue tu plan del mes por grupo..." se quita de `index.html`; la nota al pie del resumen ("Mis cuentas planifica...; Límites de gasto vigila...") se retira por repetir el banner casi literal; el copy del banner se reescribe a la estructura de tres tiempos del ADR conservando la relación con Mis cuentas; `tieneDatos` = ingresos registrados (`S.ingresos`) o algún tope por categoría (`S.presupuestos`).

El E2E "MC.5e: la nota de la sección menciona la complementariedad con Mis cuentas" se actualiza: ahora verifica que la nota ya no existe (el mensaje lo cubre el banner, visible solo antes de tener datos).

Verificación: se intentó verificar en el preview, pero el navegador arrastró una caché HTTP obstinada del entorno (síntoma ya documentado en memoria del proyecto: `python -m http.server` no envía `Cache-Control`, así que Chrome sirve módulos stale incluso tras recargar); se confirmó el contenido real servido vía `curl` directo y la verificación conductual se apoyó en la suite E2E real (Playwright/Chromium), que sí corre en un contexto limpio. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E (1 test actualizado, sin regresiones). Lint limpio. SW v273 → v274.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js` | Empty state recortado; `tieneDatos` real en los 3 puntos de render. |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/compromisos/index.js` | Empty state recortado; `tieneDatos` vía `esDeuda`. |
| `modules/dominio/agenda/index.js` | `tieneDatos` real en los 3 puntos de render. |
| `index.html`, `modules/dominio/presupuesto/view.js`, `modules/dominio/presupuesto/index.js`, `modules/ui/proposito.js` | Subtítulo y nota fuera; copy del banner reescrito; `tieneDatos` real. |
| `tests/e2e/smoke.test.js` | Test "MC.5e" actualizado a la ausencia de la nota. |
| `service-worker.js` | v273 → v274. |

---

### feat(ui): EP.7a, banner de propósito con divulgación progresiva · 2026-07-03

Cierra EP.7a, el slice piloto de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md). El banner de propósito pasa a ser la **descripción única** de cada sección y **solo se muestra mientras la sección no tiene datos**: `htmlBannerProposito(seccion, tieneDatos)` y `renderBannerProposito(seccion, tieneDatos)` reciben ahora si la sección tiene datos, en vez de leer `S.config.propositoColapsado`. Se retira el mecanismo de colapso manual completo: la clave `S.config.propositoColapsado` deja de leerse (queda huérfana e inofensiva en `localStorage` de usuarios existentes, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` se eliminan de `actions.js`, y el bloque "Mensajes de ayuda" de Ajustes (`config/view.js` `_renderPropositos`, `config/index.js` acción `reactivar-propositos`) se retira por completo.

Piloto completo en Apartados: el `section__subtitle` "Reservas para gastos previsibles..." se quita de `index.html` (duplicaba el banner), el empty state se recorta de un párrafo largo a "Crea tu primer apartado para empezar a separar dinero." (los tips accionables y la regla de contexto hacia Límites de gasto se conservan), y `apartados/index.js` pasa `S.apartados.length > 0` como `tieneDatos` en los tres puntos de render (inicial, `hashchange`, `state:change`). Verificado en el preview: el banner desaparece al crear el primer apartado sin recargar.

Fix de copy incidental (detectado al revisar el mapa completo): el banner de Me deben decía "Personales te ayuda..." en vez de "Me deben".

Los 10 dominios restantes siguen llamando `renderBannerProposito(seccion)` con un solo argumento: `tieneDatos` queda `undefined` (falsy), así que su banner se sigue mostrando siempre (sin colapso posible) hasta que su propio slice (EP.7b a EP.7d) les aplique el patrón completo.

Tests: se reescribió `tests/unit/proposito.test.js` completo (los tests de colapso/persistencia se reemplazan por tests de visibilidad por `tieneDatos`); 1887 → 1885 unit verdes (menos aserciones repartidas, misma cobertura). 117/117 E2E sin regresiones (ningún E2E tocaba el colapso). Lint limpio. SW v272 → v273.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | `htmlBannerProposito`/`renderBannerProposito` reciben `tieneDatos`; se retira todo el mecanismo de colapso (handlers, `initBannersProposito`, `reactivarPropositos`); fix de copy "Personales" → "Me deben". |
| `modules/ui/bootstrap.js` | Se retira el import y la llamada a `initBannersProposito()`. |
| `modules/dominio/config/view.js` | Se retira `_renderPropositos()` y su slot en `renderPanelConfig`. |
| `modules/dominio/config/index.js` | Se retira el import de `reactivarPropositos` y la acción `reactivar-propositos`. |
| `index.html` | Subtítulo de Apartados eliminado. |
| `modules/dominio/apartados/view.js` | Empty state recortado. |
| `modules/dominio/apartados/index.js` | Los 3 renders del banner pasan `S.apartados.length > 0`. |
| `tests/unit/proposito.test.js` | Reescrito para el nuevo contrato. |
| `service-worker.js` | v272 → v273. |

---

### docs(adr): ADR 016 revisado, divulgación progresiva (EP.7, fase de diseño) · 2026-07-03

Cierra la fase de diseño de EP.7 (dirección fijada por el usuario el 2026-07-02, reconfirmada con su observación en Metas: "la descripción solo debe aparecer al inicio"). El [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) pasa de "banner siempre visible y colapsable" a **divulgación progresiva**:

- **D1:** el banner de propósito es la descripción única de cada sección; los `section__subtitle` descriptivos (Límites, Ahorro, Metas, Apartados, Análisis) y las notas al pie que repiten propósito se eliminan.
- **D2:** la visibilidad se deriva de los datos: el banner solo aparece mientras la sección no tiene datos. Se van el colapso manual, `S.config.propositoColapsado` (clave huérfana inofensiva, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` y el bloque "Mensajes de ayuda" de Ajustes.
- **D3:** el empty state deja de describir y pasa a accionar (título + una línea + CTA); los tips accionables y las reglas de contexto de ADR 014 quedan.
- **D4:** guards de formulario y notas contextuales de datos no se tocan.
- **D5:** contrato: `htmlBannerProposito` devuelve `''` cuando la sección tiene datos; cada dominio pasa el mismo predicado de su empty state.

La revisión incluye la tabla del criterio "tiene datos" para las 11 secciones, el inventario texto por texto (archivo y línea aproximada: qué queda, qué se recorta, qué se va, incluido el fix de copy "Personales" → "Me deben" en el banner) y los 4 slices de implementación: EP.7a (piloto: mecanismo + Apartados + Ajustes), EP.7b (Gastos, Deudas, Calendario, Límites), EP.7c (Metas, Ahorro, Inversión), EP.7d (Mis cuentas, Análisis, Me deben).

Solo docs: sin cambios de código. 1887/1887 unit verdes (sin cambios). Podría afectar (cuando se implemente): visibilidad del banner en las 11 secciones, empty states, Ajustes. Validación pendiente: ninguna para esta fase; cada slice se verifica en la app al implementarse.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/016-banner-proposito-de-seccion.md` | Estado actualizado; notas "Revisada el 2026-07-03" en decisiones 1, 2, 6 y 7; sección "Revisión 2026-07-03" (por qué, D1 a D5, criterio por sección, inventario transversal y por sección, consecuencias, slices EP.7a a EP.7d). |
| `docs/BOARD.md` | Tarjeta EP.7 actualizada: diseño cerrado, quedan los slices. |
| `docs/HANDOFF.md` | Entrada nueva en "Qué se hizo recientemente". |

---

### chore(tesoreria): MC.12, renombrar "Ingreso" a "Ingresos fijos" · 2026-07-03

Cierra MC.12 (tarea de copy solamente). La sección de ingresos en Mis cuentas se llamaba "Ingreso" (singular, demasiado general); ahora se llama "Ingresos fijos" para dejar claro que registra recurrentes (salario, honorarios periódicos, pensión). Solo cambio en copy visible y `aria-label`; IDs internas del DOM quedan estables.

Puntos tocados: titulo ("Mis ingresos" → "Mis ingresos fijos"), botón ("+ Ingreso" → "+ Ingreso fijo"), modal ("Nuevo ingreso" → "Nuevo ingreso fijo"), diálogo de edición ("Editar ingreso" → "Editar ingreso fijo"), diálogo de eliminación ("Eliminar ingreso" → "Eliminar ingreso fijo"), y mensajes de confirmación (guardado/actualizado/eliminado). Verificado en el preview. 1887/1887 unit verdes.

| Archivo | Cambio |
|---|---|
| `index.html` | Título h2, botón, modal title. |
| `modules/dominio/tesoreria/index.js` | Mensajes + diálogos. |

---

### fix(tesoreria): MC.7f, pulido del asistente (copy, foco, transición, estados vacíos) · 2026-07-03

Cierra MC.7f (opcional), el último punto de la épica MC.7. Ninguna lógica financiera nueva: ajustes de copy, accesibilidad y una transición sutil sobre el shell paginado que ya entregaron MC.7d y MC.7e.

- **Copy por paso.** El Paso 2 ganó un título consistente con el resto ("💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:"), igual que el Paso 1 ya tenía el suyo.
- **Estado vacío corregido.** El hint "Sugerencia: $X a ahorro..." aparecía aunque no hubiera ninguna fila de Ahorro (sin fondo activo, sin metas, sin apartados) donde poner esa sugerencia, un texto confuso sin destino. Ahora solo se muestra cuando existe al menos una fila de Ahorro.
- **Indicador de paso más limpio.** "Paso X de N" solo aporta con 2 o más pasos; con un asistente de un único paso (posible con MC.7e: 2+ cuentas pero nada más que repartir) el indicador ya no aparece.
- **Foco al avanzar (a11y, WAI-ARIA APG para asistentes multi-paso).** Cada contenedor de paso ganó `tabindex="-1"`; al hacer clic en "Siguiente"/"Atrás", el foco se mueve al contenedor del paso recién mostrado. Su `aria-label` ("Paso X de N: <título>") queda anunciado por el simple hecho de recibir foco, sin depender de que el usuario esté cerca del indicador `role="status"`. Al abrir el panel por primera vez se preserva el comportamiento anterior (foco al monto a distribuir), no al contenedor del Paso 1.
- **Transición sutil.** Un fade-in corto (180ms) al mostrar un paso nuevo, con `@media (prefers-reduced-motion: no-preference)` (mismo patrón que el resto de la app); `a11y.css` ya colapsa duraciones globalmente bajo `reduce` como defensa adicional.

Verificado con 3 E2E nuevos en Chromium real (foco se mueve al paso al avanzar/retroceder y se preserva en la apertura inicial; indicador ausente con un solo paso; hint de ahorro ausente cuando no hay fila de Ahorro) y la suite completa de "Distribuir mi ingreso" (19 tests) sin regresiones. 1887/1887 unit sin cambios (nada de lo tocado tiene lógica pura nueva); 114/114 → 117/117 E2E. Lint limpio. SW v271 → v272.

**La épica MC.7 (asistente "Distribuir mi ingreso") queda completa: MC.7a a MC.7f entregados.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Título del Paso 2; hint de ahorro condicionado a `ahorro.length > 0`; indicador de paso omitido con un solo paso; `tabindex="-1"` en cada contenedor de paso. |
| `modules/dominio/tesoreria/index.js` | `_irAPasoDistribucion` gana `{ moverFoco }`; mueve el foco al contenedor del paso al avanzar/retroceder, salvo en la apertura inicial. |
| `styles/components/forms.css` | Transición `distribuir-paso-in` (fade + translateY corto, bajo `prefers-reduced-motion: no-preference`); `.distribuir__paso:focus { outline: none }` (el cambio de contenido ya es la señal visual). |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (foco al avanzar/retroceder, indicador ausente con un paso, hint de ahorro ausente sin fila de Ahorro). |
| `service-worker.js` | v271 → v272. |

---

### feat(tesoreria): MC.7e, Paso 3 reparte Estilo de vida entre cuentas · 2026-07-03

Cierra MC.7e (ADR 018 decisión 4), la última tarjeta de prioridad alta de la épica del asistente "Distribuir mi ingreso". Con **2 o más cuentas activas**, el paso final "Estilo de vida" gana una sección "¿Quieres mover parte a otras cuentas?": una fila editable por cuenta activa (mismo patrón toggle + monto del resto del panel), mostrando el saldo actual de cada una como contexto. Con **una sola cuenta activa** el paso sigue siendo puramente informativo, sin cambios (regla de cuenta única).

Diseño deliberadamente conservador para evitar un problema de orden: la cuenta de origen (desde dónde sale el ingreso y se pagan Necesidades/Ahorro/Deudas/Inversiones) solo se resuelve **al confirmar** (R2 del ADR, una sola pregunta al final), así que en el momento de renderizar el Paso 3 todavía no se sabe cuál cuenta es "el origen". En vez de asumir una por defecto (riesgo de mover dinero por error si el usuario elige otra cuenta en el picker final), las filas de transferencia arrancan **sin marcar y en $0**: el remanente completo sigue en la cuenta de origen salvo que el usuario opte explícitamente por mover algo a otra. Al confirmar, cualquier fila cuyo destino resulte ser la propia cuenta de origen es un no-op transparente (el dinero ya estaba ahí).

Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): una fila por cuenta activa, ordenadas de mayor a menor saldo. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerTransferenciasCuentas()` lee las filas marcadas (excluidas explícitamente de `_leerItemsDistribucion`, que ya no las cuenta como "asignado" del ingreso: son redistribuciones internas, no gasto nuevo); `_validarTransferenciasCuentas()` topa la suma contra el presupuesto de Estilo de vida ya recalculado sobre el remanente real (R3), con su propio resumen en vivo (`#distribuir-cuentas-resumen`) y su propio bloqueo de "Distribuir" si excede. `_confirmarDistribucion()` aplica las transferencias antes de fijar el saldo final de la cuenta de origen (descuenta lo transferido junto con lo demás que sale de ahí); `_SLICES_DISTRIBUCION` ya incluía `cuentas`, así que "Deshacer" revierte todo sin cambios adicionales. Al arreglar el guard de habilitación se corrigió un bug encontrado durante la verificación: "Distribuir" exigía `asignado > 0`, lo que bloqueaba una distribución que **solo** mueve dinero entre cuentas (nada marcado en Necesidades/Ahorro/Deudas/Inversiones); ahora también se habilita con `transferido > 0`. También se corrigió el guard de contenido del panel (`_renderPanelDistribuir`), que antes ocultaba el botón entero si Necesidades/Ahorro/Deudas/Inversiones estaban vacíos, sin considerar que 2+ cuentas ya son motivo suficiente para mostrar el asistente.

Sin schema nuevo (decisión 7 del ADR se mantiene): son ajustes de saldo entre cuentas ya existentes, igual que cualquier otro movimiento de tesorería.

Verificado con 4 tests unitarios nuevos de `construirFilasTransferenciaCuentas` y 5 E2E nuevos en Chromium real (una cuenta activa sin filas de transferencia; 2+ cuentas sin marcar nada por defecto; el resumen en vivo bloquea "Distribuir" si excede el presupuesto de Estilo de vida; confirmar mueve el saldo correctamente entre cuentas; Deshacer revierte la transferencia). Verificación visual adicional en el preview (móvil): las filas de cuenta, el resumen en vivo y el bloqueo del botón. 1883/1883 → 1887/1887 unit; 109/109 → 114/114 E2E. Lint limpio. SW v270 → v271.

Con esto, la épica del asistente "Distribuir mi ingreso" (MC.7) solo deja pendiente el pulido opcional MC.7f.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)`. |
| `modules/dominio/tesoreria/view.js` | `_filaDistribuir` soporta tipo 'cuenta' (saldo actual, sin marcar por defecto); `_renderPanelDistribuir` agrega la sección de transferencias al paso final y corrige el guard de contenido vacío. |
| `modules/dominio/tesoreria/index.js` | `_leerTransferenciasCuentas`, `_validarTransferenciasCuentas`, `_aplicarTransferenciasCuentas`; `_leerItemsDistribucion` excluye tipo 'cuenta'; guards de habilitación de "Distribuir" ahora aceptan `transferido > 0` sin nada más asignado. |
| `tests/unit/tesoreria.test.js` | Suite `construirFilasTransferenciaCuentas` (4 tests). |
| `tests/e2e/smoke.test.js` | Suite nueva "reparto de Estilo de vida entre cuentas (MC.7e)" (5 tests). |
| `service-worker.js` | v270 → v271. |

---

### feat(tesoreria): MC.7d completo, asistente paginado + ahorro sobre el remanente real (R3) · 2026-07-03

Cierra la tarjeta MC.7d del tablero (las dos partes que quedaban tras el slice 1 del 2026-07-03). El panel "Distribuir mi ingreso" ahora es un **asistente paginado** de hasta 3 pasos (Necesidades → Ahorro, deudas e inversiones → Estilo de vida) con navegación Atrás/Siguiente inline, indicador "Paso X de N" (`role="status"`, anuncia el cambio a lectores de pantalla) y **confirmación única al final**: el botón "Distribuir" solo existe en el último paso. Solo se crean los pasos con contenido (sin Necesidades el asistente arranca en las asignaciones); el monto a distribuir, el indicador y el resumen en vivo quedan fuera de la paginación, visibles siempre. Al abrir, el asistente siempre arranca en el primer paso; si el botón con foco se oculta al navegar, el foco pasa al de navegación visible.

**R3 (ADR 018 revisión 2026-07-02):** el Paso 2 ya no sugiere el ahorro como % teórico del split total. Nuevo helper puro `presupuestosSobreRemanente(monto, necesidadesMarcadas, ahorroPct, estiloVidaPct)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): reparte el **remanente real** (monto menos Necesidades marcadas) entre Ahorro y Estilo de vida conservando la proporción del split, con un tope en la sugerencia teórica de cada grupo (marcar menos Necesidades no infla el ahorro: lo no marcado sigue comprometido y se paga después por los flujos de siempre). La fila del fondo de emergencia absorbe en vivo el excedente de ese presupuesto tras los aportes marcados a metas/apartados (nuevo campo `autoExcedente` en `construirDesgloseAhorroPorObjetivo`, `data-dist-auto` en la vista), hasta que el usuario la edite a mano (`data-editado`, se respeta su valor) o la excluya del plan. El hint de sugerencia y la fila informativa de Estilo de vida también se recalculan en vivo al cambiar marcas o monto.

Verificado con 8 tests unitarios nuevos de `presupuestosSobreRemanente` (anclaje al split cuando lo marcado iguala su % teórico; encogimiento proporcional con Necesidades altas; tope teórico al marcar menos; remanente 0; sin fuga por redondeo; splits con 0% en un grupo; entradas no numéricas) y 2 E2E nuevos en Chromium real (navegación completa del asistente con visibilidad de botones por paso; R3 en vivo: desmarcar una Necesidad de 2,7M sube la sugerencia del fondo de 120.000 a 600.000 y editarlo a mano lo saca del modo automático). Los 8 E2E existentes del panel se adaptaron al shell (helper `avanzarDistribuirHasta`). Verificación visual adicional en el preview (desktop y móvil): los 3 pasos, la navegación y los recálculos en vivo. 1875/1875 → 1883/1883 unit; 107/107 → 109/109 E2E. Lint limpio. SW v269 → v270.

Con MC.7d cerrada, **MC.7e (Paso 3: reparto de Estilo de vida entre cuentas) queda desbloqueada**.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `presupuestosSobreRemanente`; `construirDesgloseAhorroPorObjetivo` expone `autoExcedente` en la fila del fondo. |
| `modules/dominio/tesoreria/view.js` | `_renderPanelDistribuir` reescrito como shell paginado (pasos dinámicos, indicador, nav Atrás/Siguiente, Distribuir al final); presupuesto inicial sobre el remanente con el checklist por defecto; hint y fila de Estilo de vida con spans actualizables. |
| `modules/dominio/tesoreria/index.js` | Navegación del asistente (`_irAPasoDistribucion`, acciones `distribuir-paso-siguiente`/`atras`); `_actualizarSugerenciasRemanente` (R3) invocada desde `_recalcularDistribucion`; flag `data-editado` al editar una fila a mano. |
| `styles/components/forms.css` | Estilos del indicador de paso y la barra de navegación del asistente. |
| `tests/unit/tesoreria.test.js` | Suite nueva `presupuestosSobreRemanente` (8 tests); shapes del fondo con `autoExcedente`. |
| `tests/e2e/smoke.test.js` | Helper `avanzarDistribuirHasta`; suite nueva "asistente paginado (MC.7d)" (2 tests); 8 tests existentes adaptados al shell. |
| `service-worker.js` | v269 → v270. |

---

### fix(tesoreria): tope coordinado entre cuota del checklist y abono extra (BUG-009) · 2026-07-03

Cierra el último bug pendiente de la revisión exhaustiva de Mis cuentas, implementando el diseño decidido con el usuario el mismo día (entrada anterior). Una deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades del panel "Distribuir mi ingreso" (su cuota, marcada por defecto) y en "Abonar extra a deudas" (input libre); si el usuario marcaba ambos, la cuenta se debitaba `cuota + extra` mientras la deuda solo podía bajar hasta 0, sobrepagando.

El fix agrega un helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): calcula `disponible = max(0, saldoTotal - cuotaMarcada)` y devuelve `min(extraSolicitado, disponible)`. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js), `_leerItemsDistribucion()` gana un segundo parámetro (las Necesidades ya leídas por `_leerNecesidadesMarcadas`), suma la cuota marcada de la misma deuda por `id` y usa el helper en vez del `Math.min(monto, _saldoDeuda(id))` anterior, que topaba contra el saldo previo sin descontar lo que la cuota del checklist ya iba a pagar. `_recalcularDistribucion()` y `_confirmarDistribucion()` ahora leen las Necesidades primero y se las pasan a `_leerItemsDistribucion()`, de modo que el resumen en vivo y el `apply` comparten el mismo monto efectivo, la garantía que el docstring de esa función ya prometía mucho antes de que ambos flujos pudieran chocar en la misma deuda.

Verificado con 5 tests unitarios nuevos de `topeAbonoExtraDeuda` (sin cuota marcada replica el comportamiento previo; resta la cuota antes de topar el extra; permite el extra hasta lo que queda; nunca negativo si la cuota supera el saldo; valores no numéricos como 0) más 1 E2E en Chromium real que reproduce el escenario exacto del bug: deuda con saldo 300.000 y cuota 100.000 marcada por defecto, el usuario pide un extra de 300.000 (más de lo disponible); el resumen en vivo ya muestra "Asignado: $300.000" en vez de $400.000, y tras confirmar la deuda queda en 0 (nunca negativa), los dos gastos generados suman exactamente 300.000 y la cuenta se debita 300.000, no 400.000. 1870/1870 → 1875/1875 unit; 106/106 → 107/107 E2E. Lint limpio. SW v268 → v269.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)`. |
| `modules/dominio/tesoreria/index.js` | `_leerItemsDistribucion()` gana el parámetro `necesidades` y usa `topeAbonoExtraDeuda`; `_recalcularDistribucion()` y `_confirmarDistribucion()` le pasan las Necesidades ya leídas. |
| `tests/unit/tesoreria.test.js` | 5 tests nuevos de `topeAbonoExtraDeuda`. |
| `tests/e2e/smoke.test.js` | Suite nueva "cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)", 1 test. |
| `service-worker.js` | v268 → v269. |
| `docs/BUGS.md` | BUG-009 resuelto (eliminado). Sin errores pendientes por primera vez desde que se abrió el registro. |

---

### docs(bugs): diseño de BUG-009 decidido, cuota + extra con tope coordinado · 2026-07-03

Tarea de decisión de diseño, sin código. BUG-009 (una misma deuda puede sobrepagarse combinando su cuota del checklist de Necesidades y un abono extra en "Distribuir mi ingreso") quedó registrado el mismo día con la pregunta abierta: ¿se permite pagar cuota + extra a la misma deuda en un mismo movimiento?

**Decisión del usuario, con recomendación del análisis:** sí se permite, con tope coordinado. El extra efectivo pasa a ser `min(extra, saldoTotal - cuotaMarcada)`; si la cuota marcada ya cubre todo el saldo, el extra queda en 0 y se ignora. Pagar la cuota y abonar extra al capital en el mismo movimiento es un comportamiento financiero real y sano que Finko fomenta (el orden Avalancha de "Abonar extra a deudas" existe justo para eso), y el fix es la extensión natural del patrón de topes ya vigente: el docstring de `_leerItemsDistribucion` ya promete que "el resumen y el apply usan el mismo monto efectivo", solo que hoy el tope (`_saldoDeuda`) ignora la cuota marcada en el checklist. Alternativas descartadas: excluir la deuda de "Abonar extra" cuando su cuota está marcada (elimina un flujo legítimo y exige filas que aparecen/desaparecen en vivo) y bloquear la confirmación con un error (fricción, rechaza una intención válida).

El diseño completo con los puntos de implementación (en `modules/dominio/tesoreria/index.js`: `_leerItemsDistribucion` recibe las Necesidades marcadas para restar la cuota del tope; helper puro del tope en `logic.js` con unit tests; E2E del escenario exacto del bug) quedó en la entrada BUG-009 de [BUGS.md](BUGS.md). La implementación es una tarea aparte; BUG-009 sigue pendiente hasta entonces.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | BUG-009 gana la línea "Diseño" con la decisión y el plan de implementación; se retira el "fix probable" abierto. |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente" (sale MC.7d slice 1 hacia el puntero de tareas anteriores). |
| `docs/CHANGELOG.md` | Esta entrada. |

---

### fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity (BUG-007, BUG-008) · 2026-07-03

Cierra los dos bugs de baja prioridad de la revisión de Mis cuentas, dejando la sección sin bugs pendientes salvo BUG-009 (media, requiere una decisión de diseño).

**BUG-007:** el formulario de cuenta, al activar la cuota de manejo, decía "Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Calendario y en Deudas." La sección Deudas solo lista deudas desde la reestructuración v6 (los gastos fijos, incluida la cuota de manejo, se gestionan en Calendario); el copy quedó desactualizado desde entonces. Fix de una línea en [tesoreria/view.js](../modules/dominio/tesoreria/view.js): "Lo verás en Calendario."

**BUG-008:** `validarIngreso()` y `validarCuenta()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaban `isNaN(x) || x <= 0` (o `< 0`) para validar montos. `isNaN(Infinity)` es `false`, así que un monto como `'1e999'` (que `Number()` convierte a `Infinity`) pasaba la validación: un ingreso o saldo Infinity contaminaba la distribución sugerida con montos no representables en pantalla, y al persistir `JSON.stringify` lo serializaba silenciosamente como `null`, dejando un dato corrupto en `localStorage`. Fix: los tres guards (`monto` de ingreso, `saldo` de cuenta, `cuotaManejoMonto`) cambian a `!Number.isFinite(x)`, que rechaza `NaN`, `Infinity` y `-Infinity` por igual. El guard de `cuotaManejoDia` ya usaba `Number.isInteger`, que también excluye `Infinity`; se simplificó quitando el `isNaN` redundante que llevaba delante.

El alcance de BUG-008 se mantuvo en tesorería, como quedó registrado originalmente ("el patrón probablemente se repite en otros dominios: confirmarlo al revisar cada sección"); extenderlo ahora a otros dominios habría sido un cambio de alcance no pedido.

Verificado con 4 tests unitarios nuevos (`validarIngreso` rechaza monto Infinity; `validarCuenta` rechaza saldo Infinity y -Infinity; la cuota de manejo rechaza monto Infinity). Sin E2E nuevo: el copy no tenía ninguna aserción existente que actualizar y el cambio de validación ya está cubierto a nivel de lógica pura. 1866/1866 → 1870/1870 unit; 106/106 E2E sin cambios (sin regresiones). Lint limpio. SW v267 → v268.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Copy de la cuota de manejo: "Lo vas a ver en Calendario y en Deudas." → "Lo verás en Calendario." |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso()`, `validarCuenta()`: `isNaN` → `!Number.isFinite` en los 3 guards de monto/saldo; guard de `cuotaManejoDia` simplificado. |
| `tests/unit/tesoreria.test.js` | 4 tests nuevos (BUG-008): rechazo de Infinity en monto de ingreso, saldo de cuenta (positivo y negativo) y monto de cuota de manejo. |
| `service-worker.js` | v267 → v268. |
| `docs/BUGS.md` | BUG-007 y BUG-008 resueltos (eliminados). |

---

### fix(compromisos): el abono extra a deudas desde "Distribuir mi ingreso" registra el gasto (BUG-006); nuevo BUG-009 · 2026-07-03

Cuarto bug de la revisión de Mis cuentas, ya de prioridad media. El panel "Distribuir mi ingreso" permite abonar un extra a cada deuda pendiente (sección "Abonar extra a deudas", aparte de la cuota del checklist de Necesidades). Al confirmar, el abono extra bajaba el `saldoTotal` de la deuda y descontaba la cuenta de origen, pero no dejaba ningún registro de gasto: el handler de `distribucion:aplicar` en [compromisos/index.js](../modules/dominio/compromisos/index.js) solo hacía `editar('compromisos', ...)` con el nuevo saldo. El abono quedaba invisible para Análisis (que lee los gastos del mes), para el ejecutado por grupo de Límites (ADR 017) y para el guard "ya pagado este periodo" del propio checklist. El flujo de abono individual (`_guardarAbono`) y el pago de cuota del checklist (`_aplicarNecesidad`) sí registran ese gasto; el abono extra era el único de los tres que no lo hacía.

El fix agrega al handler la creación del gasto-abono con el mismo shape que los otros dos flujos (`descripcion: 'Abono: <deuda>'`, categoría "Deudas", `compromisoId`, `cuentaId`), leyendo `cuentaOrigenId` del payload del evento (ya viajaba, el handler no lo destructuraba). El handler sigue sin tocar la cuenta: el descuento del saldo lo centraliza tesorería en `_confirmarDistribucion` (el monto ya está en `descontable`), así que no hay doble descuento. La slice `gastos` ya estaba en `_SLICES_DISTRIBUCION` (agregada en MC.7d slice 1), de modo que "Deshacer" revierte también el nuevo gasto sin cambios extra.

**BUG-009 detectado al implementar este fix (registrado, no corregido aquí):** una misma deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra" (input en 0). Si el usuario marca la cuota y además escribe un extra para esa deuda, ambos se aplican y la cuenta se debita `cuota + extra` mientras la deuda solo puede bajar hasta 0; con montos cercanos al saldo se sobrepaga. Es preexistente en la matemática de la cuenta (el `descontable` ya debitaba ambos); este fix solo lo hizo visible al crear el segundo gasto. Requiere una decisión de diseño (¿se permite pagar cuota + extra en un mismo movimiento, o una deuda ya en el checklist no debe ofrecerse también como extra?), por eso se registró como BUG-009 en vez de ampliar el alcance de esta tarea.

Verificado con 2 E2E nuevos en Chromium real: una deuda con `cuotaMensual: 0` (para que aparezca solo en "Abonar extra", aislando la ruta) recibe un abono extra de $500.000, y al confirmar se crea el gasto con el shape correcto, la deuda baja a $1.500.000 y la cuenta se descuenta una sola vez; el segundo test confirma que "Deshacer" borra el gasto y restaura saldo de deuda y cuenta. El fix vive en el handler de EventBus (capa `index.js`, no cubierta por unit tests, excluida de coverage por diseño), de ahí que la verificación sea E2E. La verificación en el preview interactivo mostró el módulo `compromisos/index.js` cacheado de una sesión anterior (el servidor sí sirve el código nuevo, confirmado por fetch; `location.reload()` no invalida la caché heurística de módulos ES de `python -m http.server`), comportamiento ya documentado en la memoria del entorno; la E2E en Chromium fresco (contexto nuevo por test) es la verificación autoritativa. 1866/1866 unit; 104/104 → 106/106 E2E. Lint limpio. SW v266 → v267.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | El handler de `distribucion:aplicar` crea el gasto-abono (mismo shape que el abono individual) y lee `cuentaOrigenId` del evento; importa `hoy` de utils. |
| `tests/e2e/smoke.test.js` | Suite nueva "abono extra a deudas (BUG-006)", 2 tests (registro del gasto + Deshacer). |
| `service-worker.js` | v266 → v267. |
| `docs/BUGS.md` | BUG-006 resuelto (eliminado); BUG-009 nuevo. |

---

### fix(tesoreria): la cuota de manejo cuenta como gasto fijo mensual (BUG-005) · 2026-07-03

Tercer bug de prioridad alta de la revisión exhaustiva de Mis cuentas. Cuando el usuario marca "esta cuenta cobra cuota de manejo mensual" en el formulario de cuenta, Finko crea un compromiso fijo vinculado (`esCuotaManejo: true`) que representa ese cobro recurrente. Ese compromiso nacía con `frecuencia: 'mensual'` en minúscula, pero todo el resto de la app compara contra `'Mensual'` capitalizado: el catálogo `FRECUENCIAS`, la tabla `_FACTOR_MENSUAL` de tesorería y la `FACTOR_MENSUAL` de compromisos. El resultado era una cuota fantasma: no sumaba en `calcularGastosFijosMensuales` (factor `undefined → 0`), así que no entraba en las Necesidades del modelo de distribución (`construirContextoDistribucion` → `sugerirDistribucionIngreso`), no inflaba el objetivo del fondo de emergencia (gastos fijos × meses de respaldo), no aparecía en el checklist de Necesidades de "Distribuir mi ingreso" (que filtra por `frecuencia === 'Mensual'`) y proyectaba $0 como equivalente mensual en la lógica de Deudas. Solo se veía en Calendario, y por casualidad: `_diasParaCompromiso` de Agenda trata cualquier frecuencia no reconocida como mensual (fallback conservador de su `default`).

El fix tiene dos partes, porque hay dos poblaciones de datos. Para las cuotas que se creen de ahora en adelante, `compromisoDesdeCuotaManejo()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) escribe `'Mensual'`. Para las cuotas ya guardadas en los dispositivos de los usuarios, una migración idempotente v19 → v20 en [storage.js](../modules/core/storage.js) capitaliza la `frecuencia` de los compromisos con `esCuotaManejo === true` que tengan exactamente `'mensual'` (los que ya están en `'Mensual'`, o cualquier otro valor, se dejan igual; sin `esCuotaManejo` no se tocan). Como todas las migraciones del proyecto, corre en memoria (`S`) en cada `loadData()` y se persiste en el siguiente `save()`, no fuerza una escritura al cargar; el efecto es visible de inmediato porque la UI lee de `S`.

Este cambio hace, por diseño, que la cuota de manejo aparezca ahora como una Necesidad marcable en "Distribuir mi ingreso": es una obligación mensual real, coherente con que el usuario pueda registrar su pago desde ahí igual que cualquier otro fijo (mismo `_pagadoEstePeriodo` compartido, sin doble registro con Calendario). Observación menor detectada al verificar en el navegador, no corregida aquí (es preexistente y ortogonal): el resumen de la tarjeta de distribución redondea a porcentaje entero, así que una necesidad de $15.000 sobre un ingreso de $3.000.000 (0,5%) se muestra como 1% · $30.000 en el resumen agregado, aunque el checklist muestra el monto exacto; afecta a cualquier necesidad pequeña, no solo a la cuota de manejo.

Verificado con 6 tests unitarios nuevos (4 de la migración v19→v20: capitaliza la cuota, no toca un fijo normal, idempotente sobre 'Mensual', no-op sin compromisos; 2 de integración: la cuota generada cuenta en `calcularGastosFijosMensuales` y aparece en `construirDesgloseNecesidades`), el shape esperado de `compromisoDesdeCuotaManejo` actualizado a `'Mensual'` (el test afirmaba el valor buggy y lo entrenaba), más 1 E2E en Chromium real que carga un estado v19 con la cuota en minúscula, comprueba que aparece en el checklist tras la migración y que confirmar la distribución persiste `'Mensual'`. Verificación adicional en el preview interactivo (cargó bien): una cuota de manejo de $15.000 aparece en el checklist con su monto exacto y contribuye al cálculo de Necesidades del modelo de distribución. 1861/1861 → 1866/1866 unit; 103/103 → 104/104 E2E. Lint limpio. SW v265 → v266.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'Mensual'` (era `'mensual'`). |
| `modules/core/storage.js` | Migración v19 → v20: capitaliza la frecuencia de las cuotas de manejo ya guardadas; `SCHEMA_VERSION` 19 → 20. |
| `tests/unit/storage.test.js` | 4 tests nuevos de la migración v19 → v20. |
| `tests/unit/tesoreria.test.js` | Shape de `compromisoDesdeCuotaManejo` a `'Mensual'`; 1 test de integración (la cuota cuenta en cálculos mensuales y checklist). |
| `tests/e2e/smoke.test.js` | 1 test nuevo: migración + aparición en el checklist + persistencia en Chromium real. |
| `service-worker.js` | v265 → v266. |

---

### fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas (BUG-003, BUG-004) · 2026-07-03

Corrige los dos bugs de prioridad alta encontrados en la revisión exhaustiva de Mis cuentas del mismo día (ver la entrada de abajo). Ambos vivían en el checklist accionable de Necesidades del panel "Distribuir mi ingreso" (MC.7d, ADR 018).

**BUG-003:** una fila del checklist ya pagada este periodo nace `checked disabled` para comunicar "esto ya está cubierto", pero un checkbox deshabilitado sigue reportando `.checked === true` en el DOM. `_leerNecesidadesMarcadas()` en [tesoreria/index.js](../modules/dominio/tesoreria/index.js) filtraba solo por `.checked`, así que confirmar la distribución con esa fila presente volvía a pagar un gasto o abono ya registrado: segundo gasto vinculado al mismo compromiso, segundo descuento de la cuenta. Fix de una línea: el filtro exige además `!chk.disabled`. Esto también corrige el resumen en vivo ("Asignado: $X"), que antes sumaba el monto de las filas ya pagadas.

**BUG-004:** `construirDesgloseNecesidades()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaba `cuotaMensual` de una deuda sin toparla contra su `saldoTotal` pendiente ni excluir las deudas ya saldadas (`saldoTotal <= 0`). Una deuda con cuota de $200.000 y saldo pendiente de solo $50.000 ofrecía y registraba el abono completo de $200.000: la deuda quedaba en $0 correctamente, pero $150.000 de más salían de la cuenta como gasto real, sin ningún lugar a donde ir. Una deuda ya saldada pero sin archivar seguía apareciendo como pendiente, algo que el formulario de abono individual ya rechazaba ("Esta deuda ya está saldada"). Fix: `monto = Math.min(cuotaMensual, saldoTotal)` y el filtro de entrada exige `saldoTotal > 0`, mismo criterio que ya usa `deudasPendientes` en `view.js` para las filas de "Abonar extra a deudas".

Verificado con 4 tests unitarios nuevos en `construirDesgloseNecesidades` (tope activo, tope no interfiere cuando el saldo alcanza, exclusión de deuda saldada, exclusión de saldo negativo) más 2 E2E nuevos en Chromium real que reproducen exactamente los escenarios de los bugs: confirmar con una Necesidad ya pagada presente no la duplica y el resumen en vivo la excluye; el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada, con el abono real registrado por el monto correcto. Verificación adicional en el preview interactivo (que esta vez sí cargó la app): confirmé la distribución en vivo con las tres condiciones a la vez (fijo ya pagado + deuda con cuota mayor al saldo + deuda saldada) y el saldo final de la cuenta, el conteo de gastos y el saldo de la deuda coincidieron con lo esperado. 1857/1857 → 1861/1861 unit; 101/101 → 103/103 E2E. Lint limpio. SW v264 → v265.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_leerNecesidadesMarcadas()` agrega `&& !chk.disabled` al filtro. |
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` topa el monto de deuda a `saldoTotal` y excluye deudas con `saldoTotal <= 0`. |
| `tests/unit/tesoreria.test.js` | `compDeudaBase()` gana `saldoTotal` por defecto; 4 tests nuevos de BUG-004. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos: BUG-003 (confirmar sin duplicar una fila ya pagada) y BUG-004 (tope de cuota + exclusión de deuda saldada). |
| `service-worker.js` | v264 → v265. |

---

### docs(revision): revisión exhaustiva de Mis cuentas, 6 bugs registrados (BUG-003 a BUG-008) · 2026-07-03

Arranque del plan de validación sección por sección acordado con el usuario (orden: seguir el flujo del dinero, empezando por Mis cuentas como base de todo y dominio con el cambio más reciente). La revisión cubrió el dominio completo (`tesoreria/logic.js`, `view.js`, `index.js`, 3.208 líneas), sus integraciones (crud, cuenta-helper, EventBus `distribucion:aplicar` en los 5 dominios consumidores, Agenda "Marcar pagado", abono individual de Deudas), los ADR que lo gobiernan (012, 013, 017, 018) y todo el copy de la sección. Cada sospecha se confirmó empíricamente antes de registrarse: 13 sondas unitarias (happy-dom) y 3 sondas E2E (Chromium real), temporales y no commiteadas; el fix de cada bug debe traer sus propios tests.

**Hallazgos registrados en [BUGS.md](BUGS.md):** BUG-003 (alta: una Necesidad "Ya pagado" se vuelve a pagar al confirmar la distribución, porque un checkbox `checked disabled` sigue estando checked), BUG-004 (alta: el checklist ofrece y registra la cuota completa de una deuda aunque el saldo pendiente sea menor, e incluye deudas ya saldadas sin archivar), BUG-005 (alta: la cuota de manejo nace con frecuencia 'mensual' en minúscula y queda fuera de gastos fijos mensuales, checklist, objetivo del fondo y equivalente mensual de Deudas; solo se ve en Calendario por un fallback), BUG-006 (media: el abono extra a deudas desde el panel baja deuda y cuenta pero no crea el gasto, invisible para Análisis y Límites), BUG-007 (baja: copy que promete ver la cuota de manejo "en Deudas") y BUG-008 (baja: las validaciones aceptan Infinity vía '1e999').

**Observaciones sin registro de bug (decisión del usuario pendiente):** el monto por defecto del panel para ingresos Quincenales es el mensual estimado (el doble del cobro real); sin día de pago no hay guard de periodo y una segunda confirmación acreditaría el ingreso dos veces; el copy del panel no avisa que el ingreso se acreditará a la cuenta (riesgo de doble conteo si el usuario ya actualizó su saldo a mano); la línea "Sugerencia: $X a ahorro" aparece aunque no haya destinos de ahorro; y la regla ADN #10 ("ningún dominio importa a otro") convive con 8+ imports cruzados de `logic.js` puro (analisis importa de 5 dominios, agenda de compromisos incluso en `index.js`, presupuesto de tesorería y gastos, config de export) mientras otros sitios duplican código citando esa misma regla: conviene un ADR que legalice el patrón "import de logic.js puro, solo lectura" o un refactor, pero no ambos criterios a la vez.

Sin cambios de código ni de service worker. Suites verificadas antes y después: 1857/1857 unit, línea base intacta.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | 6 entradas nuevas (BUG-003 a BUG-008) con causa, archivo, función y líneas. |
| `docs/HANDOFF.md` | Entrada de la revisión en "Qué se hizo recientemente". |

---

### feat(tesoreria): Necesidades pasa a checklist accionable en Distribuir mi ingreso (MC.7d, slice 1) · 2026-07-03

Primer slice de MC.7d: implementa las decisiones R1, R4 y R5 de la revisión 2026-07-02 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md). El desglose de Necesidades del panel "Distribuir mi ingreso" (un `<details>` de solo lectura desde MC.7c) pasa a ser una checklist accionable: el usuario marca los gastos fijos mensuales y las cuotas de deuda que cubre con este ingreso, y al confirmar, cada marca genera exactamente el mismo registro que su flujo individual existente, sin inventar un tipo de movimiento nuevo.

**Alcance decidido con el usuario antes de codear:** solo entran a la checklist los fijos con frecuencia Mensual y las deudas. Un fijo Quincenal, Semanal o Diario tiene más de una ocurrencia dentro del periodo del ingreso; como esta checklist modela una fila = un pago completo, incluirlo con su monto por ocurrencia habría dejado al usuario marcando como "cubierto todo el periodo" algo que en realidad solo cubre una fracción, ensuciando el badge "Ya pagaste este mes" de Agenda y registrando un gasto de menos. Modelar sus múltiples vencimientos (como ya hace `eventosDelMes` de Agenda) queda para una tarea futura. El shell de asistente paginado (avanzar/atrás entre pasos) y el recálculo del presupuesto de Ahorro sobre el remanente real tras las Necesidades marcadas (R3 del ADR) tampoco entran en este slice: quedan como tarjetas separadas en el BOARD para no mezclar tres decisiones de UI/producto distintas en un solo cambio.

En [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js), `construirDesgloseNecesidades(compromisos, gastos, hoy)` gana dos parámetros nuevos y cambia de comportamiento: antes mensualizaba cualquier frecuencia con `_FACTOR_MENSUAL` (un Mercado Quincenal de $150.000 se mostraba como $300.000/mes); ahora filtra directamente por `frecuencia === 'Mensual'` para fijos (las deudas no tienen este problema porque `cuotaMensual` ya es, por definición, la obligación completa del mes) y cada fila trae su `diaPago` y si ya está `pagado` este periodo. Dos privadas nuevas, `_prefijoMes()` y `_pagadoEstePeriodo()`, duplican el criterio de `estadoPagoMes()` de compromisos/logic.js (el mismo guard que usa el badge "Ya pagaste este mes" de Agenda: para un fijo, cualquier gasto vinculado el mes en curso cuenta como pagado; para una deuda, la suma de abonos del periodo debe alcanzar `cuotaMensual`). Es un duplicado intencional, no una importación cruzada: tesorería no puede importar de Compromisos (ADN #10). El orden de la lista pone primero los no pagados, de mayor a menor monto, y deja los ya pagados al final.

En [tesoreria/view.js](../modules/dominio/tesoreria/view.js), `_renderDesgloseNecesidades()` (el `<details>` de solo lectura) se elimina y su lugar lo toma `_filaNecesidad()`: checkbox, nombre, categoría, día de pago y monto. El monto no es editable a propósito, a diferencia de las filas de Ahorro/Deudas/Inversiones: es la cuota real de una obligación, no una asignación libre que el usuario deba calcular. Una fila ya pagada nace marcada y deshabilitada, con "Ya pagado" en vez del monto, para que no se pueda registrar el mismo pago dos veces. `_renderPanelDistribuir()` saca a Necesidades del bloque "Esto queda en tu cuenta (no se mueve)" (ya no aplica: ahora sí se mueve dinero) y la ubica como la primera sección accionable del panel, antes de Ahorro/Deudas/Inversiones, reflejando el orden de pasos del ADR. El panel completo ahora también se muestra cuando la única fuente de contenido son las Necesidades (antes exigía al menos un destino de ahorro, deuda o inversión para aparecer).

En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerNecesidadesMarcadas()` lee los checkboxes de la nueva checklist (monto fijo en `data-nec-monto`, no un input) y se combina con `_leerItemsDistribucion()` dentro de `_recalcularDistribucion()`, así el resumen en vivo ("Asignado: $X. Queda disponible: $Y") ya suma ambos grupos sin distinguir su origen. `_aplicarNecesidad()` escribe el pago directo en la colección `'gastos'` (para un fijo: mismo shape que "Marcar pagado este mes" de Agenda, categoría "Gastos fijos"; para una deuda: mismo shape que un abono, categoría "Deudas", más el descuento de `saldoTotal` topado en 0). Escribir `gastos`/`cuentas` directo desde tesorería no es una violación de ADN #10: es el mismo patrón que ya usan Agenda y Compromisos, un ledger compartido que cualquier dominio edita con `guardar`/`editar` de crud.js. `_confirmarDistribucion()` aplica cada Necesidad marcada dentro de la misma confirmación única que ya aplicaba Ahorro/Deudas/Inversiones (un solo `resolverCuenta`, ninguna pregunta adicional). **Hallazgo de R4 del ADR aplicado en este slice:** `_SLICES_DISTRIBUCION` (el snapshot para "Deshacer") no incluía la colección `'gastos'`; como este cambio hace que el Paso 1 cree gastos reales, se agregó esa slice, evitando que "Deshacer" dejara pagos huérfanos sin revertir.

**Bug de timing encontrado y corregido durante la verificación E2E (no era un bug de lógica):** los primeros intentos de los tests de confirmar/deshacer fallaban con el saldo y el gasto sin persistir, aunque el código corría sin lanzar ningún error (se confirmó agregando logging temporal directo en el código fuente, luego removido). La causa real: `save()` está debounced 200ms (ADN #5, "nunca escribir a `localStorage` directo") y los tests leían `localStorage` inmediatamente después del click de confirmar, antes de que el debounce hiciera el flush real a disco. Se corrigió agregando `page.waitForTimeout(400)` antes de leer `localStorage` en ambos tests, el mismo patrón que ya usan otros E2E del proyecto que verifican persistencia entre sesiones.

Verificado con 13 tests unitarios nuevos/reescritos en `construirDesgloseNecesidades` (fijos Mensuales con su monto tal cual; exclusión de Quincenal/Semanal/Diario; estado `pagado` según gasto/abono del periodo, incluyendo el caso de abono parcial que no cuenta como pagado; orden con los pagados al final aunque su monto sea mayor) más 4 E2E en Chromium real: la checklist lista fijos mensuales y deudas con su día de pago y excluye un fijo Quincenal; una Necesidad ya pagada aparece marcada y deshabilitada con "Ya pagado"; confirmar con una Necesidad marcada registra el mismo gasto que su flujo individual y descuenta la cuenta correctamente; "Deshacer" restaura el saldo y borra el gasto creado. El preview interactivo de este entorno no cargó la app (`chrome-error://chromewebdata/`, problema ya conocido de este entorno de trabajo); la verificación se apoyó en la suite E2E con Chromium real, que sí es una verificación de navegador genuina. 1851/1851 → 1857/1857 unit; 98/98 → 101/101 E2E. Lint limpio. SW v263 → v264.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` gana parámetros `gastos`/`hoy`, filtra solo fijos Mensuales (ya no mensualiza), agrega `diaPago` y `pagado` por fila; nuevas privadas `_prefijoMes()`, `_pagadoEstePeriodo()`. |
| `modules/dominio/tesoreria/view.js` | `_renderDesgloseNecesidades()` eliminada; nueva `_filaNecesidad()` (checklist accionable); `_renderPanelDistribuir()` mueve Necesidades a una sección accionable propia, primero en el panel. |
| `modules/dominio/tesoreria/index.js` | Nuevas `_leerNecesidadesMarcadas()`, `_aplicarNecesidad()`; `_confirmarDistribucion()` aplica los pagos de Necesidades marcadas; `_SLICES_DISTRIBUCION` suma `'gastos'`; listener de `change` para `[data-nec-toggle]`. |
| `styles/components/forms.css` | Nuevas `.distribuir__fila--pagado`, `.distribuir__nec-monto`; clases del `<details>` retirado eliminadas. |
| `tests/unit/tesoreria.test.js` | `construirDesgloseNecesidades`: 13 tests (exclusión por frecuencia, `pagado`, `diaPago`, orden). |
| `tests/e2e/smoke.test.js` | Suite "Distribuir mi ingreso: checklist de Necesidades" reemplaza el test de solo lectura de MC.7c; 4 tests nuevos. |
| `service-worker.js` | v263 → v264. |

---

### docs(adr): revisión de ADR 018, el Paso 1 del asistente pasa a checklist accionable · 2026-07-02

Prerequisito de MC.7d, sin cambios de código. Tras validar en la app el desglose read-only de Necesidades (MC.7c), el usuario dio la dirección nueva del 2026-07-02: cada grupo del asistente "Distribuir mi ingreso" debe mostrar sus registros como **checklist seleccionable que registra pagos reales**, no como lista informativa. Eso contradice la decisión 2 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md) (Paso 1 read-only, sin mover dinero), así que, siguiendo la regla del proyecto (tocar una decisión de un ADR requiere actualizarlo antes de codear), se revisó el ADR como tarea propia.

Se agregó la sección "Revisión 2026-07-02" con cinco decisiones nuevas, ancladas en el código que ya existe:

- **R1 (reemplaza la decisión 2):** la checklist de Necesidades muestra nombre, cuota del periodo actual (fijo: su `monto` por ocurrencia según su frecuencia; deuda: su `cuotaMensual`; nunca el saldo total ni el equivalente mensual normalizado) y día de pago. Los items marcados generan al confirmar exactamente los mismos registros que sus flujos individuales existentes: pago de fijo como "Marcar pagado este mes" de Agenda (gasto con `compromisoId`, categoría "Gastos fijos"), cuota de deuda como abono (baja `saldoTotal`, gasto de categoría "Deudas"). El guard "ya pagado este periodo" se comparte con el badge de Agenda (gasto del mes con `compromisoId`), lo que elimina el doble registro entre ambos flujos. Lo no marcado se comporta como hoy: queda en la cuenta y se paga al vencer.
- **R2:** una sola pregunta de cuenta al confirmar todo el asistente, con el patrón `cuenta-helper` (con una sola cuenta activa no se pregunta, regla de cuenta única). Se descartó preguntar cuenta por cada item: fricción multiplicada para el caso común.
- **R3:** los pasos se encadenan sobre el remanente real: el Paso 2 (Ahorro) sugiere sus aportes sobre el cobro menos las Necesidades marcadas, no sobre el porcentaje teórico del split; la validación total asignado ≤ monto del cobro es una sola para todo el asistente (generaliza `resumirPlanDistribucion`).
- **R4 (ajusta la decisión 6):** la confirmación única aplica también los pagos del Paso 1, con el mismo apply-plan por EventBus y snapshot de undo. Nota de implementación obligatoria: `_SLICES_DISTRIBUCION` en `tesoreria/index.js` hoy no incluye la slice `gastos`; como el Paso 1 crea gastos, hay que agregarla o el "Deshacer" dejaría pagos huérfanos.
- **R5 (confirma la decisión 7):** sin schema nuevo: los pagos son gastos normales con `compromisoId` y los abonos actualizan `saldoTotal`.

Las decisiones 2, 5 y 6 originales quedan marcadas con notas de revisión y su texto se conserva como historia. La tabla de slices refleja MC.7a/b/c entregados y amplía MC.7d (extender `construirDesgloseNecesidades` con cuota del periodo, día de pago y estado pagado; sumar `gastos` al snapshot); la nota de modelos de los slices restantes pasa a la escala Claude 5. El desglose construido en MC.7c no se tira: evoluciona a checklist en MC.7d.

En [BOARD.md](BOARD.md), la tarjeta MC.7d pasó de "requiere revisión de ADR 018 antes de codear" a "pendiente (diseño cerrado)", con el objetivo alineado a R1-R5, los archivos afectados precisados (`construirDesgloseNecesidades`, `_SLICES_DISTRIBUCION`, `_confirmarDistribucion`) y modelo de implementación `Sonnet 5 - Alto`.

Tarea solo de documentación: sin tests nuevos ni bump de service worker. Suites verificadas verdes antes del commit (1851/1851 unit).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/018-asistente-distribuir-ingreso.md` | Sección "Revisión 2026-07-02" (R1-R5, alternativas y consecuencias de la revisión); notas en las decisiones 2, 5 y 6; estado y autores actualizados; tabla de slices y modelos al día. |
| `docs/BOARD.md` | Tarjeta MC.7d actualizada: estado, objetivo R1-R5, archivos y modelo. |
| `docs/HANDOFF.md` | Entrada nueva en "últimas 5 tareas" (sale AG.5 del listado detallado). |

---

### feat(calendario): nombre automático según la categoría en el gasto fijo (AG.4) · 2026-07-02

El form de "Nuevo gasto fijo" pedía descripción y categoría como dos campos independientes y ambos obligatorios de hecho, pero para las 13 categorías predefinidas (Mercado, Arriendo, Servicios públicos, Internet...) esa pregunta doble es redundante: si el usuario elige "Mercado" como categoría, escribir "Mercado" otra vez como nombre no aporta nada. AG.4 resuelve esto haciendo que, al elegir una categoría predefinida, el nombre del registro sea la propia categoría, y el campo de texto libere su rol original para convertirse en una nota opcional (por ejemplo, con categoría "Mercado" el usuario puede anotar "Éxito de la esquina" o "unidad 302"). Solo con la categoría "Otro" (o sin categoría elegida) el campo de texto vuelve a ser el nombre obligatorio del gasto, exactamente como funcionaba antes.

En [compromisos/logic.js](../modules/dominio/compromisos/logic.js) se agregó `_categoriaFijoConNombreAuto(datos)`, un helper privado que evalúa si el tipo es `fijo`, la categoría pertenece al catálogo `CATEGORIAS_AGENDA` y es distinta de `'Otro'`. `validarCompromiso()` usa este helper para dejar de exigir `descripcion` cuando aplica (antes el chequeo de descripción vacía era incondicional para los tres tipos de compromiso). `normalizarCompromiso()` lo usa para decidir el shape final: con nombre automático, `descripcion = categoria` y lo que el usuario escribió se guarda en un campo nuevo `nota` (cadena vacía si no escribió nada); sin nombre automático, `descripcion` es el texto del usuario y `nota` queda `''`. El campo `nota` es nuevo en el schema de compromisos tipo fijo, pero es opcional, con valor por defecto `''`, y se lee de forma defensiva (`c.nota ?? ''` en el render); siguiendo el mismo criterio que ya usó la adición de `categoria` en MC.9-Agenda, no hace falta una migración de schema para los compromisos ya guardados.

En [agenda/view.js](../modules/dominio/agenda/view.js), `renderFormGastoFijo()` reordena los campos: la categoría pasa a ir primero y el nombre/nota después, para que la relación causa-efecto sea clara en la interfaz (elegís la categoría, el campo de abajo reacciona). El label del campo de nombre ahora tiene un id propio (`gfijo-descripcion-label`) para que JS pueda alternar su texto. En `_renderDetalleItem()`, el subtítulo deja de repetir la categoría cuando coincide exactamente con el nombre del registro (el caso de nombre automático, donde mostrarla de nuevo sería ruido: el título ya dice "Mercado"), pero la sigue mostrando cuando difieren (categoría "Otro" con un nombre propio, por ejemplo "Suscripción Xbox" con categoría "Otro"); además, cuando el registro tiene una nota, se agrega al final del subtítulo.

En [agenda/index.js](../modules/dominio/agenda/index.js) se agregó `_syncCategoriaGastoFijo(form)`, calcada del patrón que ya usó `_syncCategoriaMeta` en MT.3 para Metas: alterna el label ("Descripción" ↔ "Nota (opcional)"), el placeholder y el atributo `required`/`aria-required` del campo de texto según la categoría elegida en el `<select>`, enganchada al evento `change` del selector. Se llama también al (re)inyectar el formulario, tanto al crear un gasto nuevo (estado por defecto: sin categoría, campo requerido) como al editar uno existente. El prefill de edición ahora distingue: si el compromiso tiene nombre automático (categoría predefinida), el campo de texto se rellena con `compromiso.nota`, no con `compromiso.descripcion` (que sería igual a la categoría y no aportaría nada al reabrir el form).

Verificado con 10 tests unitarios nuevos (`validarCompromiso` y `normalizarCompromiso` con categoría predefinida, con "Otro" y sin categoría; el nuevo orden de campos del formulario y su estado por defecto; la supresión de la categoría duplicada en el subtítulo y el render de la nota) más 4 E2E en Chromium real: el label y el `required` cambian al elegir una categoría predefinida y vuelven al elegir "Otro"; guardar con una categoría predefinida y sin texto usa la categoría como nombre del registro; guardar con una categoría predefinida y una nota la muestra en el subtítulo del detalle del día. 1838/1838 → 1851/1851 unit; 94/94 → 98/98 E2E. Lint limpio. SW v262 → v263.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `_categoriaFijoConNombreAuto()`; `validarCompromiso()` deja de exigir descripción con nombre automático; `normalizarCompromiso()` deriva `descripcion`/`nota` para tipo fijo según la categoría. |
| `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` reordena categoría antes del nombre y agrega `#gfijo-descripcion-label`; `_renderDetalleItem()` suprime la categoría duplicada en el subtítulo y muestra la nota cuando existe. |
| `modules/dominio/agenda/index.js` | Nueva `_syncCategoriaGastoFijo(form)` (mismo patrón que `_syncCategoriaMeta` de MT.3); el prefill de edición usa `nota` en vez de `descripcion` cuando el nombre es automático. |
| `tests/unit/compromisos.test.js` | 6 tests nuevos: `validarCompromiso`/`normalizarCompromiso` con categoría predefinida, "Otro" y sin categoría. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: orden de campos y estado por defecto del formulario, supresión de la categoría duplicada, render de la nota en el subtítulo. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - nombre automático según la categoría", 4 tests. |
| `service-worker.js` | v262 → v263. |

---

### feat(calendario): emoji de categoría como ícono principal (AG.2) · 2026-07-02

En el detalle del día, un gasto fijo con categoría (Mercado, Internet, Arriendo, Servicios públicos...) mostraba el emoji de su categoría (`CATEGORIA_AGENDA_EMOJI`) únicamente dentro del subtítulo pequeño (` · 🌐 Internet`), mientras el ícono principal a la izquierda del registro seguía siendo el genérico por tipo, el mismo círculo para todos los gastos fijos sin distinción. Gastos ya había resuelto exactamente este problema (`CATEGORIA_EMOJI[catKey] ?? icon('gastos')` como ícono principal, con el emoji retirado del subtítulo para no repetirse): AG.2 porta ese mismo patrón a Agenda.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` calcula `emojiCategoria` (el emoji de la categoría cuando `tipo === 'fijo'` y el registro tiene `categoria`) y lo usa como ícono principal con `emojiCategoria ?? icon(ICONO_TIPO[tipo] ?? 'recurring')`: con emoji disponible, se muestra ese carácter directamente; sin categoría, o en deudas (`categoria` es un campo exclusivo de gastos fijos), cae al ícono SVG genérico de siempre, sin cambio de comportamiento. El subtítulo deja de repetir el emoji: pasa de ` · 🌐 Internet` a ` · Internet`, ya que el emoji ahora vive en el ícono principal y repetirlo sería ruido visual, igual que ya evita Gastos en `list-item__subtitle`.

En [config.css](../styles/components/config.css) se agregó `.cal-detail__icon--emoji`, aplicada solo cuando el ícono muestra un emoji de categoría, con un `font-size` de 1.375rem (más grande que el 1rem base del ícono con SVG) para que el emoji se lea con presencia como protagonista del registro, mismo criterio de tamaño que ya usa `.list-item__icon--cat` de Gastos (1.5rem, "emoji grande, protagonista", documentado en `atoms.css`).

**Corrección de un descuido de la tarea anterior (AG.7):** el commit de AG.7 documentaba el bump de `service-worker.js` de v261 a v262 tanto en el mensaje de commit como en HANDOFF y este mismo CHANGELOG, pero el archivo nunca se tocó: `CACHE_NAME` seguía en `finko-v261` después de ese push. Eso significa que los cambios de AG.7 (franja de color por tipo en el detalle del día) se desplegaron a producción sin invalidar el caché del service worker, así que los usuarios con una instalación PWA activa podían seguir viendo la versión sin la franja de color hasta que algún otro cambio bumpeara la caché. Este commit hace el bump real a v262, cubriendo retroactivamente AG.7 junto con AG.2.

Verificado con 5 tests unitarios (2 reescritos de una tarea anterior que asumían el emoji pegado al texto del subtítulo, un markup que este cambio reemplaza; 3 nuevos para el fallback sin categoría, el emoji sin `<svg>` con categoría, y que las deudas conservan el ícono genérico) más 2 E2E en Chromium real (con categoría, el ícono no contiene ningún `<svg>` y sí el carácter emoji; sin categoría, el ícono sí contiene un `<svg>`). 1835/1835 → 1838/1838 unit; 92/92 → 94/94 E2E. Lint limpio. SW v261 → v262 (bump real, corrige también el vacío dejado por AG.7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()`: el emoji de categoría pasa a ser el ícono principal (`emojiCategoria ?? icon(...)`); el subtítulo ya no repite el emoji, solo el nombre de la categoría. |
| `styles/components/config.css` | Nueva `.cal-detail__icon--emoji` (tamaño mayor para el emoji protagonista, mismo criterio que Gastos). |
| `tests/unit/agenda.test.js` | 2 tests reescritos (emoji ahora en el ícono principal, no en el subtítulo) + 3 tests nuevos (fallback sin categoría, sin `<svg>` con categoría, deuda con ícono genérico). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - emoji de categoría como ícono principal", 2 tests. |
| `service-worker.js` | v261 → v262 (bump real; corrige el vacío dejado por el commit de AG.7). |

---

### feat(calendario): identificación visual por color en los registros del día (AG.7) · 2026-07-02

En fechas cargadas (una quincena, el fin de mes) el detalle del día en Calendario mostraba todos los registros con el mismo aspecto visual: la única forma de distinguir un gasto fijo de una deuda con entidad o una deuda personal era leer su etiqueta de texto. AG.7 suma una identificación de color a cada item de la lista, reusando la misma paleta que AG.6 ya había fijado para los dots del mini calendario, así el significado de cada color es el mismo en toda la tarjeta.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` agrega la clase `cal-detail__item--${tipo}` al `<li>` de cada registro (el ícono ya tenía su propia clase `cal-detail__icon--${tipo}`, heredada de una tarea anterior, pero sin ningún CSS de color asociado hasta ahora). En [config.css](../styles/components/config.css), `.cal-detail__item` gana una franja lateral (`border-left: 3px solid`) que cada tipo colorea con su `--fk-dom-*` correspondiente: `--fk-dom-presupuesto` (amarillo) para fijo, `--fk-dom-compromisos` (rojo) para deuda entidad, `--fk-dom-personales` (rosa) para deuda personal. El padding izquierdo del item se recalcula con `calc(var(--fk-space-N) - 3px)` para que la franja no desplace el contenido ni el ícono; el ajuste se repite en el media query mobile porque ahí el padding base es más chico (`--fk-space-2` en vez de `--fk-space-3`). El ícono circular de cada registro también toma el color de su tipo (texto + un fondo tenue con `color-mix(in srgb, var(--fk-dom-*) 14%, var(--fk-bg-surface))`), mismo criterio de intensidad que ya usan los `dom-badge--*` de `nudges.css` para no saturar la tarjeta.

No hubo que decidir nuevos colores: como el calendario solo mapea `S.compromisos` (los mismos 3 tipos que ya cubría la leyenda de AG.6), la paleta ya estaba resuelta y consistente con el resto de la app. Cuando el ADR de recordatorios de aporte (AP.4/MT.2/AH.4) sume tipos nuevos al calendario, sumarán aquí su propia clase `cal-detail__item--<tipo>` con el mismo patrón.

Verificado con 4 tests unitarios nuevos (`cal-detail__item--fijo` en un gasto fijo, `--deuda-entidad` en una deuda con entidad, `--deuda-personal` en una deuda personal, y los tres tipos combinados el mismo día cada uno con su propia clase) más 1 E2E en Chromium real que siembra un fijo y una deuda entidad el mismo día y compara el `border-left-color` computado de ambos: deben ser colores distintos entre sí y ninguno debe quedar transparente (regresión que ocurriría si un tipo no matcheara ninguna clase CSS). 1831/1831 → 1835/1835 unit; 91/91 → 92/92 E2E. Lint limpio. SW v261 → v262.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()` agrega `cal-detail__item--${tipo}` al `<li>` del detalle. |
| `styles/components/config.css` | `.cal-detail__item--fijo/deuda-entidad/deuda-personal` (franja lateral + padding compensado, también en el media query mobile); `.cal-detail__icon--*` con color de texto y fondo tenue por tipo. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: clase por tipo (fijo, deuda entidad, deuda personal) y los 3 tipos combinados el mismo día. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - marca de color por tipo", 1 test que compara colores computados en Chromium real. |
| `service-worker.js` | v261 → v262. |

---

### feat(calendario): leyenda completa, con colores consistentes y siempre visible (AG.6) · 2026-07-02

La leyenda del calendario (qué significa cada dot de color en los días) se renderizaba al final del panel, después del detalle del día. Con un día cargado de registros (una quincena, un fin de mes), el detalle empujaba la leyenda fuera de la pantalla justo cuando más ayudaba tenerla a mano: había que desplazarse hasta el fondo para consultarla.

AG.6 la reubica y la fija. En [agenda/view.js](../modules/dominio/agenda/view.js) la leyenda pasa a renderizarse entre el calendario y el detalle del día (justo debajo del calendario, como pedía la tarjeta), y `.cal-legend` en [config.css](../styles/components/config.css) es ahora `position: sticky` con un pequeño offset superior y fondo, borde y radio propios: al quedar pegada durante el scroll, el contenido del detalle pasa por debajo y no debe transparentarse. El obstáculo real estaba en el shell: `.main-content` tenía `overflow-x: hidden`, y un ancestro con overflow distinto de `visible` se convierte en scroll container, lo que anula el `position: sticky` de todos sus descendientes (el sticky pasa a calcularse contra un contenedor que nunca scrollea, no contra la ventana). Se cambió a `overflow-x: clip` en [layout.css](../styles/layout.css): recorta el desborde horizontal exactamente igual, pero sin crear scroll container. El comentario en el CSS deja el porqué para que nadie lo regrese a `hidden` por accidente.

Sobre la parte de colores de la tarjeta: el calendario hoy solo mapea `S.compromisos` (`eventosDelMes`), así que los 3 tipos que la leyenda ya listaba (gasto fijo, deuda entidad, deuda personal) cubren todos los eventos posibles, cada uno con su color único y consistente con el resto de la app: `--fk-dom-presupuesto` (amarillo), `--fk-dom-compromisos` (rojo) y `--fk-dom-personales` (rosa). No hubo que tocar colores. Los tipos futuros (metas, apartados, aportes al fondo) entrarán a la leyenda cuando el ADR de recordatorios de aporte (AP.4 + MT.2 + AH.4) los sume al calendario; el doc de `_renderLeyenda` deja la guía (una entrada nueva con su `cal-dot--<tipo>`). AG.7 (marca de color por registro en el detalle del día) reusa esta misma paleta.

Verificado con 2 tests unitarios nuevos (la leyenda trae los dots de los 3 tipos; con un día abierto la leyenda queda antes del detalle en el DOM) y 1 E2E en Chromium real que siembra 10 compromisos el mismo día, abre el detalle, scrollea al fondo del documento (con guard de `scrollY > 0` para que el test no pase trivialmente si el contenido no desborda) y verifica que la leyenda sigue completa dentro del viewport. El preview del entorno sigue sin cargar (servidor levantado pero sin respuesta); la verificación visual queda cubierta por el E2E. 1829/1829 → 1831/1831 unit; 90/90 → 91/91 E2E. Lint limpio. SW v260 → v261.

**Podría afectar / validación pendiente:** el cambio de `overflow-x` en `.main-content` es global (todas las secciones). `clip` recorta igual que `hidden`, así que no debería notarse; validar en el celular que la leyenda queda pegada arriba al recorrer un día cargado y que ninguna sección muestra scroll horizontal nuevo.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | La leyenda se renderiza entre el calendario y el detalle del día; doc de `_renderLeyenda` con la guía para tipos futuros. |
| `styles/components/config.css` | `.cal-legend` sticky (top), con fondo, borde y radio propios. |
| `styles/layout.css` | `.main-content` pasa de `overflow-x: hidden` a `clip`: hidden creaba un scroll container que anulaba el sticky. |
| `tests/unit/agenda.test.js` | 2 tests nuevos: dots de los 3 tipos en la leyenda, orden leyenda → detalle. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - leyenda sticky", 1 test con scroll real. |
| `service-worker.js` | v260 → v261. |

---

### feat(calendario): total a pagar por día (AG.5) · 2026-07-02

El panel de detalle de un día en Calendario listaba cada compromiso por separado (nombre, frecuencia, monto individual) pero nunca los sumaba: para saber cuánto dinero necesitaba tener disponible ese día, el usuario tenía que sumar a mano cada monto de la lista. La sumatoria ya existía como código, pero solo como función privada `_totalDia` dentro de [agenda/view.js](../modules/dominio/agenda/view.js), sin exportar y sin un solo test, y su resultado se mostraba pegado al subtítulo pequeño y gris ("3 compromisos · $450.000"), fácil de pasar por alto.

AG.5 extrae esa suma a `totalDia(evs)`, función pura y exportada en [agenda/logic.js](../modules/dominio/agenda/logic.js): mismo criterio que ya usa el render de cada item individual (`monto` para gastos fijos, `cuotaMensual` para deudas, nunca `saldoTotal`) y que `sumarMontos` de `compromisos/logic.js` (IN.1). Es una duplicación intencional, no una importación cruzada: Agenda no puede importar de Compromisos porque el ADN #10 prohíbe que un dominio importe a otro (aunque `agenda/view.js` ya importa varias funciones de `compromisos/logic.js` para el render de cada item, un acoplamiento existente que este cambio no extiende ni corrige, fuera del alcance de esta tarea). `_renderDetalleDia()` ahora muestra una línea propia, con más peso visual, justo bajo el título del panel: "Total a pagar: **$X**" (`.cal-detail__total`), visible de inmediato sin tener que desplazarse por la lista de items, en vez del monto perdido dentro del subtítulo. Color neutro (`--fk-text-primary`), no rojo: un compromiso programado para ese día no es un incumplimiento, mismo criterio de AUD.4/ADR 019 que ya gobierna el resto de la app. La línea solo aparece cuando la suma es mayor a 0 (compromisos sin monto capturado, como una deuda a la que aún no se le puso cuota, no generan una línea "Total a pagar: $0" vacía de sentido).

Verificado con 9 tests unitarios nuevos (`totalDia` con fijos, deudas, mezcla de ambos, montos no numéricos y entradas nulas; render real del panel con uno y con varios compromisos, con y sin monto, y sin día seleccionado) más 1 E2E en Chromium real (un gasto fijo de $900.000 y una deuda con cuota de $150.000 el mismo día 20, el panel muestra "Total a pagar: $1.050.000"). 1819/1819 → 1829/1829 unit; 89/89 → 90/90 E2E. Lint limpio. SW v259 → v260.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | Nueva `totalDia(evs)`, función pura y exportada (antes privada en `view.js`, sin tests). |
| `modules/dominio/agenda/view.js` | Eliminada `_totalDia`; `_renderDetalleDia` usa `totalDia` de `logic.js` y muestra una línea propia "Total a pagar" en vez de anexarlo al subtítulo. |
| `styles/components/config.css` | Nueva `.cal-detail__total` (color neutro, monto en negrita). |
| `tests/unit/agenda.test.js` | 9 tests nuevos: `totalDia` (5) + render del total en el panel de detalle (4). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - total a pagar por día", 1 test. |
| `service-worker.js` | v259 → v260. |

---

### feat(metas): ahorro sugerido según la frecuencia de ingreso, no "por día" (MT.4) · 2026-07-02

La lista de Metas siempre mostraba "$X/día" como ritmo sugerido de ahorro, sin importar cómo cobra el usuario en la realidad. Para alguien que recibe su sueldo cada quincena, pensar en "cuánto por día" no ayuda a planear: el gesto natural es "cuánto aparto en cada quincena". MT.4 reemplaza ese cálculo fijo por uno que reparte el faltante entre los periodos de la frecuencia real de ingreso del usuario, mismo espíritu que ya resolvió Apartados (AP.1) para sus propios aportes sugeridos.

Nueva `calcularAhorroPorPeriodo(meta, frecuenciaIngresos)` en [metas/logic.js](../modules/dominio/metas/logic.js) reemplaza a `calcularAhorroDiario` (eliminada): calcula cuántos periodos completos quedan hasta la fecha límite según la frecuencia (Diario = 1 día, Semanal = 7, Quincenal = 15, Mensual = 30; las frecuencias más largas como Trimestral o Anual se asimilan a Mensual, la unidad de planificación más cercana) y reparte el faltante entre esos periodos, redondeando hacia arriba (mejor pasarse un poco que llegar corto, mismo criterio que Apartados). La frecuencia no es un campo por meta (a diferencia de Apartados, que sí tiene `frecuenciaAporte` seleccionable por ítem): se deriva una sola vez de los ingresos activos del usuario con `frecuenciaPrincipalIngresos(S.ingresos)`, la frecuencia más común entre ellos.

Esta función es una copia intencional de la homónima de `apartados/logic.js`: Metas no puede importar de Apartados porque ambos son dominios y el ADN #10 prohíbe que un dominio importe a otro. La duplicación de esta idea (mapeo de frecuencia + conteo de la más común) ya es el patrón establecido en el código: tesorería tiene su propio `_FACTOR_MENSUAL`, independiente del `DIAS_POR_PERIODO` de Apartados. `renderListaMetas()` en [metas/view.js](../modules/dominio/metas/view.js) calcula la frecuencia una sola vez para toda la lista (es la misma para todas las metas, no cambia por ítem) y la pasa a `_renderMetaItem`, que ahora muestra "$X por quincena", "$X por semana", "$X al mes" o "$X por día" según corresponda, con exactamente la misma redacción que ya usa Apartados en `etiquetaPeriodo` (consistencia de vocabulario entre secciones, mismo espíritu que el guardarraíl de emojis de TX.4/ADR 014, aunque aquí no hay un test automático que lo fuerce).

Los tests con fechas relativas (`new Date(); setDate(...)`) usaban antes `toISOString().slice(0,10)`, que puede desplazar un día en zonas horarias UTC negativas como Colombia según la hora exacta en que corre el test (el mismo problema que ya resolvió `hoyLocal()` en los E2E). Se agregó un helper local `isoEnDias(dias)` en `metas.test.js` que construye la fecha con los getters locales de `Date`, evitando el off-by-one; dos aserciones de conteo exacto de periodos fallaban intermitentemente antes de este ajuste y quedaron estables después. Verificado con 22 tests unitarios nuevos (`frecuenciaPrincipalIngresos`, `etiquetaPeriodoAhorro`, `calcularAhorroPorPeriodo`, y el render real de `renderListaMetas` con distintas frecuencias) más 1 E2E en Chromium real (ingreso Quincenal sembrado, meta con fecha límite a 90 días muestra "por quincena" y nunca "/día"). 1804/1804 → 1819/1819 unit; 88/88 → 89/89 E2E. Lint limpio. SW v258 → v259.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/logic.js` | Nuevas `frecuenciaPrincipalIngresos()`, `etiquetaPeriodoAhorro()`, `calcularAhorroPorPeriodo()`; eliminada `calcularAhorroDiario()`. |
| `modules/dominio/metas/view.js` | `renderListaMetas()` calcula la frecuencia de ingreso una sola vez; `_renderMetaItem` recibe la frecuencia y muestra el monto por periodo con su etiqueta. |
| `tests/unit/metas.test.js` | 22 tests nuevos; helper `isoEnDias()` para fechas relativas sin drift de zona horaria. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - ritmo de ahorro según frecuencia (MT.4)", 1 test. |
| `service-worker.js` | v258 → v259. |

---

### feat(metas): unificar el flujo de abono con el selector de cuentas compartido (MT.5) · 2026-07-02

El abono a una meta tenía su propia implementación de selector de cuenta, separada del resto de la app: un `<select>` de texto plano, obligatorio elegir cuando había 2 o más cuentas, y una lógica de descuento que solo restaba de una cuenta sin repartir ni confirmar sobregiros. Apartados ya había resuelto exactamente este problema en AP.1 con dos piezas de [infra/cuenta-helper.js](../modules/infra/cuenta-helper.js): `renderSelectorCuenta` (tarjetas seleccionables con avatar de banco, nombre y saldo, preselecciona la de mayor saldo) y `resolverPagoConPreferida` (usa la cuenta elegida si cubre el monto; si no alcanza y hay más cuentas, abre un picker de reparto que no deja ninguna en negativo; con una sola cuenta que no alcanza, pide confirmar el sobregiro). MT.5 es el port directo de ese patrón a Metas.

En [metas/view.js](../modules/dominio/metas/view.js), `renderFormAbonoMeta()` cambia `_renderCuentaSelectorAbono` (función eliminada, 24 líneas de lógica 0/1/varias cuentas duplicada) por una llamada a `renderSelectorCuenta`. En [metas/index.js](../modules/dominio/metas/index.js), `_guardarAbonoMeta()` pasa a ser async y sigue el mismo esqueleto que `_guardarAporte` de Apartados: valida el monto, resuelve los splits con `resolverPagoConPreferida` (si hay cuentas activas), confirma el sobregiro cuando la única cuenta no alcanza (mismo texto y `peligroso: true` que Apartados, adaptado a "abono"), aplica el descuento a cada cuenta del reparto, y llama a `updSaldo()` tras guardar, algo que la implementación anterior nunca hacía (el hero de Inicio quedaba con el saldo viejo hasta el siguiente `renderAll()` completo). El chequeo manual "debes elegir cuenta si hay varias" desaparece: como el selector de tarjetas siempre trae una preselección, ya no hace falta forzar la elección a mano.

Los tests de `renderFormAbonoMeta` que verificaban el `<select>` viejo se reescribieron contra el markup de tarjetas, calcados de los que ya existían para `renderFormAporteApartado` en `apartados.test.js` (mismo patrón: sin cuentas no hay selector, una cuenta trae una tarjeta preseleccionada, varias cuentas preseleccionan la de mayor saldo, ya no queda el `<select>` viejo). Se sumaron 2 E2E en Chromium real que ejercitan el flujo completo con una cuenta real: uno de abono normal que descuenta el saldo correcto (verificado en Tesorería, mismo patrón que la suite Gastos-Cuenta), y uno de abono que no alcanza, que confirma el diálogo de sobregiro y deja el saldo en negativo tras aceptar. 1804/1804 unit; 86/86 → 88/88 E2E. Lint limpio. SW v257 → v258.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta()` usa `renderSelectorCuenta` de `cuenta-helper.js`; eliminada `_renderCuentaSelectorAbono`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta()` async: `resolverPagoConPreferida`, confirmación de sobregiro con una sola cuenta, reparto aplicado a cada split, `updSaldo()` tras guardar. |
| `tests/unit/metas.test.js` | Describe "selector de cuenta" reescrito contra el nuevo markup, mismo patrón que `apartados.test.js`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - abono con selector de cuenta compartido (MT.5)", 2 tests. |
| `service-worker.js` | v257 → v258. |

---

### feat(metas): simplificar la selección de emoji (MT.3) · 2026-07-02

MT.1 agregó categorías con emoji a Metas, pero dejó el campo "Emoji (opcional)" suelto: visible siempre, sin relación con la categoría elegida. Un usuario podía escribir un emoji, cambiar de categoría, y el emoji manual seguía ganando (por la prioridad de `normalizarMeta`) sin que la UI diera ninguna pista de por qué. MT.3 simplifica: el campo vive oculto por defecto (`#form-group-meta-icono` en [metas/view.js](../modules/dominio/metas/view.js)) y solo aparece cuando la categoría elegida es "Otra", la válvula de escape del catálogo (ADR 014, principio 7); el resto de las categorías ya trae su propio emoji, así que no hay nada que decidir.

La pieza no trivial es evitar un emoji manual "fantasma": `_syncCategoriaMeta(form)`, nueva en [metas/index.js](../modules/dominio/metas/index.js) y enganchada al `change` del selector de categoría, alterna el `hidden` del campo y **limpia su valor al ocultarlo**. Sin esto, un usuario que prueba "Otra", escribe un emoji, y luego elige "Vivienda" antes de guardar, terminaría con el emoji viejo en la meta: `FormData` sigue enviando campos ocultos, y `normalizarMeta` prioriza el emoji explícito sobre el de la categoría (decisión de MT.1, sigue siendo correcta como contrato de la función). También se llama tras `resetModal()` en `_nuevaMeta()`, porque `resetModal` limpia valores de input pero no el atributo `hidden` que dejó una apertura anterior del modal.

La segunda mitad de la tarjeta ("eliminar el emoji emocional de la parte inferior del form/card de meta") ya estaba resuelta: el changelog de junio 2026 registra que ese emoji se movió al título de la card en el rediseño de la lista (anillo de progreso + emoji junto al nombre), no queda ningún emoji suelto en la parte inferior del form ni de la card hoy.

Verificado con 5 tests E2E en Chromium real (el preview del entorno sigue sin cargar, nota ya conocida): el campo nace oculto, se muestra solo con "Otra", el emoji manual se guarda con "Otra", y el caso crítico, cambiar de "Otra" a otra categoría antes de guardar usa el emoji de la categoría nueva y no el manual. Se reescribió un E2E de MT.1 que ya no aplicaba (asumía el campo siempre visible). Sin tests unitarios nuevos: el comportamiento de mostrar/ocultar y limpiar el campo vive en `index.js` (DOM + eventos), fuera del alcance de happy-dom por convención del proyecto (igual que los demás toggles condicionales de formulario); se ajustó el test existente de `renderFormMeta` para reflejar el nuevo markup. 1803/1803 unit; 84/84 → 86/86 E2E. Lint limpio. SW v256 → v257.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | El form-group del emoji nace `hidden`; label cambiado a "Elige un emoji para tu meta". |
| `modules/dominio/metas/index.js` | Nueva `_syncCategoriaMeta(form)`: alterna `hidden` según la categoría y limpia el emoji al ocultarlo; enganchada al `change` del selector y llamada tras `resetModal` en `_nuevaMeta`. |
| `modules/dominio/metas/logic.js` | Comentario de `normalizarMeta` actualizado para reflejar la nueva UI (la función en sí no cambió). |
| `tests/unit/metas.test.js` | Test de `renderFormMeta` actualizado: el form-group del emoji nace `hidden`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (visibilidad condicional, guardado con "Otra", limpieza al cambiar de categoría); 1 test de MT.1 reescrito. |
| `service-worker.js` | v256 → v257. |

---

### feat(metas): categorías con emoji (MT.1) · 2026-07-02

Metas de ahorro tenía nombre libre y un campo de emoji suelto (sin catálogo). Nuevo `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en [core/constants.js](../modules/core/constants.js), mismo patrón que los catálogos ya existentes (`CATEGORIA_EMOJI` de Gastos, `CATEGORIA_AGENDA_EMOJI`, `CATEGORIA_DEUDA_EMOJI`): 12 categorías con foco en objetivos de alto costo, priorizadas por el usuario el 2026-07-02 (Viajes, Cumpleaños, Boda, Vivienda, Vehículo, Computador, Celular, Educación, Hijo(s), Vacaciones, Emprendimiento, Otra).

Selector "Categoría (opcional)" nuevo en `renderFormMeta()` ([metas/view.js](../modules/dominio/metas/view.js)), con las opciones ya mostrando su emoji. `normalizarMeta()` ([metas/logic.js](../modules/dominio/metas/logic.js)) resuelve el emoji final con esta prioridad: emoji escrito a mano en el campo "Emoji (opcional)" (que se conserva, no se elimina en esta tarea) > emoji de la categoría elegida > 🎯 por defecto. Así una meta sin categoría se comporta exactamente igual que antes, y elegir una categoría predefinida trae su emoji sin que el usuario tenga que escribirlo. El emoji resuelto queda guardado en `meta.icono` como siempre; `_renderMetaItem` no cambió porque ya leía ese campo. Campo `categoria` nuevo y opcional en el shape de `Meta`, lectura defensiva, sin migración de schema.

Reconciliación de emoji contra el guardarraíl de consistencia entre catálogos (ADR 014, TX.4, "mismo concepto ⇒ misma etiqueta y mismo emoji en todas las secciones"): la lista original de la tarjeta pedía 🎓 para "Educación" y 🏖️ para "Vacaciones", pero esas etiquetas ya existían con otro emoji en otros catálogos (Educación 📚 en Gastos/Agenda; Vacaciones ✈️ en Apartados). Se usaron los emojis ya establecidos en vez de introducir un desajuste, y el catálogo de Metas se sumó a la lista de fuentes del test de guardarraíl `TX.4` (antes cubría Gastos, Agenda, Ingresos, Deudas y Apartados) para que una edición futura de cualquiera de estos catálogos no vuelva a divergir sin que un test lo marque.

El preview del entorno sigue sin cargar la app (nota ya conocida en la memoria del proyecto); verificado con 22 tests unitarios nuevos (forma del catálogo, prioridad del emoji en `normalizarMeta`, contenido del selector, emoji real en `renderListaMetas`) más 2 tests E2E nuevos en Chromium real: crear una meta con categoría "Boda" muestra 💍 en la lista, y un emoji escrito a mano gana sobre el de la categoría. 1787/1787 → 1803/1803 unit; 82/82 → 84/84 E2E. Lint limpio. SW v255 → v256.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_META` (12 categorías) + `CATEGORIA_META_EMOJI`, con la reconciliación de Educación y Vacaciones documentada en el comentario. |
| `modules/dominio/metas/logic.js` | `normalizarMeta()`: nuevo campo `categoria`; `icono` se resuelve con prioridad manual > categoría > default. |
| `modules/dominio/metas/view.js` | `renderFormMeta()` agrega el selector `#meta-categoria`; nuevo helper `_renderOpcionesCategoria()`. |
| `tests/unit/constants.test.js` | Describe nuevo con 4 tests de forma del catálogo; `CATEGORIA_META_EMOJI` sumado a las fuentes del guardarraíl TX.4. |
| `tests/unit/metas.test.js` | 15 tests nuevos: `normalizarMeta` con categoría (6), selector en `renderFormMeta` (4), emoji real en `renderListaMetas` (2), más los describe wrappers. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - categorías con emoji (MT.1)" con 2 tests. |
| `service-worker.js` | v255 → v256. |

---

### feat(inicio): ojo para ocultar/mostrar el dinero disponible (IN.2) · 2026-07-02

Icono de ojo junto al saldo del hero de Inicio ("Tu dinero disponible hoy"), estilo app bancaria, para usar Finko en lugares públicos: alterna entre el monto visible y la máscara `$••••••` (largo fijo, para no revelar la magnitud del monto real). La preferencia persiste entre sesiones en `S.config.ocultarSaldo` con lectura defensiva (`=== true`; cualquier otro valor muestra el monto), sin migración de schema, como pedía la tarjeta.

Detalles de implementación: `updSaldo()` ([infra/render.js](../modules/infra/render.js)) es el único punto que escribe `#saldo-total`, así que la máscara vive ahí; exporta la constante `SALDO_MASCARA` y sincroniza el botón `#saldo-ojo` (icono ojo/ojo tachado vía swap del `href` del `<use>`, `aria-pressed`, oculto sin cuentas junto con el valor). Mientras el saldo está oculto el monto real nunca toca el DOM, y la nueva `stopCount(el)` ([infra/animate.js](../modules/infra/animate.js)) cancela un countUp en vuelo que de otro modo sobreescribiría la máscara frames después. La acción `saldo-visibilidad` se registra como built-in del shell en [ui/actions.js](../modules/ui/actions.js) (flip defensivo `!== true` + `save()` + `updSaldo()`). CSS en [styles/components/domain.css](../styles/components/domain.css) (capa `components`, para que el refuerzo `.hero-saldo__ojo[hidden]` gane a `display:inline-flex` de `.btn`); el botón reusa `btn btn-ghost btn-icon`. Sprite: símbolos `i-eye` / `i-eye-off` (geometría estilo Lucide, coherente con el resto).

Alcance decidido (la tarjeta lo dejaba abierto): solo el hero, el dato más sensible y el subset más pequeño con sentido; extender la máscara a los demás montos de Inicio (totales de vencidos/prioridades, resumen semanal) quedó como observación en [BOARD.md](BOARD.md). Verificación: el preview del entorno sigue sin cargar (nota en memoria del proyecto), así que la evidencia es 13 tests unit nuevos en `tests/unit/render.test.js` (máscara, defensiva, sync del botón, empty state, acción vía `dispatch`) + 1 E2E nuevo en Chromium real (click → máscara, recarga → persiste, click → monto de vuelta). 1774/1774 → 1787/1787 unit; 81/81 → 82/82 E2E. Lint limpio. SW v254 → v255.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolos `i-eye`/`i-eye-off` en el sprite; fila `.hero-saldo` con el botón `#saldo-ojo` (`data-action="saldo-visibilidad"`, `aria-pressed`). |
| `modules/infra/render.js` | `SALDO_MASCARA` exportada; `updSaldo()` enmascara cuando `S.config.ocultarSaldo === true` y sincroniza el botón del ojo. |
| `modules/infra/animate.js` | Nueva `stopCount(el)`: cancela el RAF del countUp activo de un elemento. |
| `modules/ui/actions.js` | Acción built-in `saldo-visibilidad`: flip defensivo + `save()` + `updSaldo()`. |
| `styles/components/domain.css` | Sección HERO-SALDO: fila monto + ojo, refuerzo `[hidden]`, icono a 1.375rem. |
| `tests/unit/render.test.js` | Nuevo archivo: 13 tests de `updSaldo` + acción `saldo-visibilidad`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Ocultar/mostrar el dinero disponible (IN.2)" con seed condicional (el reload no pisa la preferencia guardada). |
| `service-worker.js` | v254 → v255. |

---

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)) listaban items sin sumatoria: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en los próximos 7 días. Nueva función pura `sumarMontos(items)` en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` que ya usa el render de cada item individual, AUD.1), consumida por `renderPanelVencidos` ("Total de gastos vencidos") y `renderPanelPrioridades` ("Total de próximas prioridades", solo cuando hay algo que mostrar; el estado "Todo al día" no lleva total). Nuevas clases `.vencidos-card__total` / `.prioridades-card__total` en [styles/components/domain.css](../styles/components/domain.css), fila con borde superior sutil y monto en negrita, coherente con el resto de las cards del dashboard. Verificación en el navegador bloqueada por caché HTTP agresiva del entorno de preview (`fetch` con `cache:'no-store'` sí traía el código nuevo, pero la navegación normal servía JS viejo); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real sin ese problema. 6 tests nuevos (4 `sumarMontos` + 2 de render por panel). 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`, función pura. |
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos` y `renderPanelPrioridades` agregan el total al pie. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total` + variantes `-amount`. |
| `tests/unit/compromisos.test.js` | 4 tests de `sumarMontos` + 2 de render (total presente/ausente según estado). |
| `service-worker.js` | v253 → v254. |

---

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js), `categoriaTopSemana`) sumaba todos los `S.gastos` de la semana, incluidos los generados automáticamente por un gasto fijo o un abono a deuda (que llevan `compromisoId`, ver [ADR 002](DECISIONS/002-abono-deudas.md)). Con un arriendo de $900.000 y un mercado de $50.000, el indicador mostraba "Vivienda" cuando el hábito de consumo real del usuario era Alimentación. Fix: `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen visible en la lista de Gastos (obligación vs. consumo variable). Las demás cifras del resumen (total de 7 días, comparación semanal, registros, días activos) no cambian: siguen contando todos los gastos, porque miden actividad total, no hábitos de categoría. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados (arriendo con `compromisoId` + mercado sin él → "🛒 Alimentación $50.000"). SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId` antes de agrupar por categoría. |
| `tests/unit/resumen.test.js` | 2 tests: excluye `compromisoId`, y devuelve `null` si toda la semana fue solo fijos/deudas. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto y último slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Tres ajustes independientes de descubribilidad y robustez:

1. **Sidebar con pliegue**: en alturas de ventana <= 800px (solo escritorio; la regla exige `min-width: 1024px` para no chocar con el bottom nav móvil, que ya aplana el nav a fila) el grupo Herramientas quedaba bajo el scroll interno del `.sidebar__nav` sin ningún indicio visual de que había más contenido. [styles/layout.css](../styles/layout.css) compacta el `margin-top` de `.nav-group` y el `padding-bottom` de `.nav-group__label`, y agrega un `::after` `position: sticky; bottom: 0` con gradiente hacia el color de fondo del sidebar, que insinúa el scroll sin robar espacio de layout (compensado con `margin-top` negativo).
2. **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV con muchas categorías nuevas) se encadenaba un toast con confetti cada 1.4s ([logros/index.js](../modules/dominio/logros/index.js)) que tapaba contenido por varios segundos. `_checkYMostrar` ahora corta a un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un segundo parámetro `label` opcional (antes fijo en "Logro desbloqueado"). Verificado con un script Playwright temporal (no comiteado, borrado tras confirmar): sembrando datos que desbloquean 6 logros de golpe, aparece exactamente 1 `.logro-toast` con el texto "Logros desbloqueados" / "6 logros nuevos".
3. **`save()` sin flush al cerrar**: el debounce de 200ms en [core/storage.js](../modules/core/storage.js) puede perder el último cambio si el usuario cierra la pestaña o el sistema mata la PWA en segundo plano en móvil antes de que el timer corra. Nueva `initFlushOnHide()` (exportada desde `storage.js`) escucha `visibilitychange` (solo cuando `document.visibilityState === 'hidden'`) y `pagehide`, y llama a `_flushNow()` únicamente si hay un guardado pendiente (`_saveTimer` activo), para no escribir a `localStorage` sin necesidad. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`, antes de cualquier interacción del usuario. El doc comment de `_flushNow` (antes "no usar en producción") se actualizó para reflejar este segundo uso legítimo.

Sin tests unitarios nuevos: los dos primeros son CSS/DOM puro sin lógica que aislar en happy-dom, y el toast de logros está explícitamente fuera del alcance de los tests unitarios por decisión ya documentada en `tests/unit/logros.test.js` ("el toast y confetti requieren DOM completo y se verifican manualmente en la app"). El flush en `visibilitychange`/`pagehide` tampoco es testeable en happy-dom (no hay pestaña real que ocultar). 1764/1764 unit + 81/81 E2E verdes (sin regresiones). SW v251 → v252.

- **`styles/layout.css`**: media query `(max-height: 800px) and (min-width: 1024px)` con espaciado compacto de `.nav-group` + fade sticky en `.sidebar__nav`.
- **`modules/dominio/logros/index.js`**: `_checkYMostrar` muestra un toast resumen si `nuevos.length > 2`; `_mostrarToast(logro, label)` acepta label opcional.
- **`modules/core/storage.js`**: nueva `initFlushOnHide()`; doc comment de `_flushNow` actualizado.
- **`modules/ui/bootstrap.js`**: registra `initFlushOnHide()` tras `loadData()`.
- **`service-worker.js`**: v251 → v252.

---

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio consolidado de [ADR 019](DECISIONS/019-limites-por-rol.md) (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de [ADR 008](DECISIONS/008-mecanicas-de-habito.md) (resumen semanal como reflexión sin castigo): gastar no es incumplir.

1. **Total de "Resumen de la semana"** en Inicio y **"Pendiente"** en Préstamos ([styles/components/domain.css](../styles/components/domain.css)), ambos usando la clase compartida `.resumen-card__stat--primary`, coloreaban el monto con `--fk-danger-text`. Cambiado a `--fk-text-primary` (neutro). Ninguno de los dos casos es un incumplimiento: uno es cuánto gastaste (información), el otro es dinero que te deben (positivo para ti).
2. **Variación al alza del gasto mensual** en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`. Se eliminó la regla de color (el default de `.chart-stat__valor` ya es neutro) y se quitó la asignación de la clase en `_renderTendencia` ([analisis/view.js](../modules/dominio/analisis/view.js)).

Decisión sobre el punto pendiente del backlog (neutro vs ámbar para la variación al alza): **neutro**, por dos razones. Primero, consistencia: el texto de tendencia semanal en Inicio ya es neutro desde F8 ("Gastaste X% más que la semana pasada" en `--fk-text-secondary`), así que el número no debía quedar en otro tono que su propio texto. Segundo, no hay un umbral incumplido que justifique una advertencia (ámbar): es solo una comparación mes a mes, no un límite superado. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): eso sí es un logro digno de refuerzo positivo.

Sin tests nuevos: cambio de color puro sin lógica nueva; ningún test existente referenciaba las clases o colores tocados (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v250 → v251.

- **`styles/components/domain.css`**: `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`.
- **`styles/components/charts.css`**: eliminada `.chart-stat--negativo` (color danger); queda el neutro por defecto de `.chart-stat__valor`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` ya no asigna `chart-stat--negativo` cuando sube el gasto.
- **`service-worker.js`**: v250 → v251.

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Cinco correcciones puntuales de copy que violaban la regla ADN 11 (tuteo, español neutro, sin términos internos):

1. **[logros/logic.js](../modules/dominio/logros/logic.js)**: 4 descripciones de logros en voseo o sin tildes ("Tenes 3 o mas", "un prestamo que vos le diste", "configuracion", "esta lista"). Corregidas a tuteo con tildes correctas.
2. **"Ver agenda"** en el panel de "Próximas prioridades" de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)): quedó desactualizado desde que la sección se renombró a Calendario (AG.1, 2026-06-30). Ahora dice "Ver calendario".
3. **"el dashboard"** en los empty states de Gastos ([gastos/view.js](../modules/dominio/gastos/view.js)) y Mis cuentas ([tesoreria/view.js](../modules/dominio/tesoreria/view.js)): término interno que la app ya no usa desde el renombre a Inicio. Corregido a "Inicio".
4. **`APP_VERSION`** en [core/constants.js](../modules/core/constants.js): decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, desincronizado de `package.json` (`1.0.0`). Sincronizado.
5. **"Toca una estrategia"** en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)): se lee raro en desktop (no hay "toque" con mouse). Cambiado a "Elige una estrategia".

Sin tests nuevos: es copy sin lógica asociada y ningún test existente referenciaba estos textos (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v249 → v250.

- **`modules/dominio/logros/logic.js`**: 4 descripciones de logros con tuteo y tildes correctas.
- **`modules/dominio/compromisos/views/dashboard.js`**: "Ver agenda" → "Ver calendario" (+ `aria-label`).
- **`modules/dominio/gastos/view.js`**, **`modules/dominio/tesoreria/view.js`**: "el dashboard" → "Inicio" en empty states.
- **`modules/core/constants.js`**: `APP_VERSION` `'0.1.0'` → `'1.0.0'`.
- **`modules/dominio/compromisos/views/estrategia.js`**: "Toca una estrategia" → "Elige una estrategia".
- **`service-worker.js`**: v249 → v250.

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` referenciaban 15 variables `--fk-*` nunca definidas en `tokens.css` (~52 usos): al no existir, el navegador usa el valor inicial en vez del token de diseño, lo que rompía en silencio el `accent-color` de radios/checkboxes (verde de marca → azul del navegador), los bordes de tarjetas (caían a `currentColor`, invisibles) y los fondos de gráficos (transparentes).

Mapeo aplicado siguiendo el patrón ya dominante en el resto del código:

- `--fk-primary` → `--fk-accent` (color de marca).
- `--fk-border` → `--fk-border-subtle` (convención mayoritaria para bordes de tarjeta: 35 usos reales contra 15 de `border-default`).
- `--fk-bg`, `--fk-surface`, `--fk-surface-subtle` → `--fk-bg-surface` / `--fk-bg-elevated` según la jerarquía visual del elemento (dos usos como `color:` sobre círculos de acento van a `--fk-text-on-accent`, no a un fondo).
- `--fk-text` → `--fk-text-primary`.
- `--fk-weight-bold/medium/semibold/regular` y `--fk-font-normal` → `--fk-font-bold/medium/semibold/regular`.
- `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`.
- `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala tipográfica, xs es el valor real más cercano).

Se aprovechó para quitar los fallbacks inline (`var(--x, valor)`) que compensaban las variables fantasma: ya no hacen falta porque el token real siempre está definido. Cero cambios de lógica, HTML o comportamiento: es puramente resolución de tokens. Verificado en navegador (datos sembrados): Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) muestran bordes y fondos reales. 1764/1764 unit verdes (sin tests nuevos: no hay lógica que cubrir, solo CSS). SW v248 → v249.

- **`styles/components/charts.css`**: 15 usos (sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda).
- **`styles/components/domain.css`**: 11 usos (selector de cuenta radio/checkbox, tarjeta de límites, consolidado de ahorro).
- **`styles/components/analysis.css`**: 14 usos (tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa).
- **`styles/components/forms.css`**: 2 usos (badge genérico, placeholder de gasto sin completar).
- **`styles/components/config.css`**: 2 usos (título y emoji del detalle de calendario).
- **`styles/layout.css`**: 1 uso (separador de sub-header de sección).
- **`service-worker.js`**: v248 → v249.

---

### fix(dashboard/analisis): montos reales de deudas en los paneles de Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Corrige los 4 bugs funcionales visibles que detectó la auditoría:

1. **"$NaN pendiente" en el nudge "deudas llevan tiempo sin actividad"** (sección Deudas): la vista leía `d.saldoPendiente`, campo que no existe; la lógica (`detectarDeudasDurmiendo`) devuelve `saldoTotal`. Ahora muestra el saldo formateado ("$5.800.000 pendiente").
2. **Deudas vencidas con "$0" en el panel "N pendientes del mes"** (Inicio): `detectarVencidosCompletos` exponía `Number(c.monto) || 0`, pero las deudas no tienen `monto` desde la migración v6 (su cuota vive en `cuotaMensual`). Ahora expone la cuota mensual para deudas y conserva `monto` para fijos.
3. **"Próximas prioridades" (Inicio) omitía la cifra de las deudas**: el render leía `c.monto`; ahora cae a `cuotaMensual` cuando no hay `monto` (fijos, préstamos personales y apartados siguen igual).
4. **Variación "↑ 0%" en rojo en la tendencia de Análisis** cuando el mes anterior cerró en $0: sin base de comparación no hay porcentaje que mostrar; ahora dice "Sin gastos el mes anterior para comparar" en tono neutro (mismo criterio que el resumen semanal de F8).

6 tests de regresión nuevos (1 de lógica + 5 de render en happy-dom). 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real (Playwright, datos sembrados): Inicio, Deudas y Análisis muestran los montos y textos correctos. SW v247 → v248.

- **`modules/dominio/compromisos/views/alertas.js`**: `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes `d.saldoPendiente`, undefined, que formateaba NaN).
- **`modules/dominio/compromisos/logic.js`**: `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas.
- **`modules/dominio/compromisos/views/dashboard.js`**: el panel de prioridades usa `c.monto ?? c.cuotaMensual`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` maneja el caso sin base (mes anterior en $0) con aviso neutro.
- **`tests/unit/compromisos.test.js`**, **`tests/unit/analisis.test.js`**: 6 tests de regresión.
- **`service-worker.js`**: v247 → v248.

---

### feat(presupuesto): los topes por categoría se fusionan dentro de la tarjeta de Estilo de vida (MC.8b, ADR 019) · 2026-07-01

Segundo slice grande de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Elimina la **redundancia de arquitectura de la información**: Estilo de vida dejaba de aparecer en dos sitios (su tarjeta en el resumen y el bloque suelto "Estilo de vida: topes por categoría" debajo, con su hero de totales). Ahora hay **un solo relato por grupo**.

Los topes por categoría (envelope budgeting sobre `S.presupuestos`) viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida` en `presupuesto/view.js`), con tres piezas:

- **Olla finita** (`_renderOllaFinita`): una línea que dice cuánto del presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas) cubren los límites y cuánto queda sin tope, por ejemplo "Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope." Da la noción de presupuesto acotado sin forzar a asignar el 100% (usa `coberturaLimitesEstiloVida`, MC.8a). Maneja los bordes: sin presupuesto, sin límites, cobertura total y exceso (este último en ámbar).
- **Envelopes por categoría** con sus alertas ámbar/roja (Estilo de vida es el grupo que sí se controla), o un mensaje breve si aún no hay ninguno.
- **Botón "Agregar límite"** (topes bajo demanda) más las categorías con gasto pero sin tope (sugerencia de dónde poner uno).

`_renderGrupoCard` pasa a ser **consciente del rol** (ADR 019 decisión 1): **Necesidades = monitorear** (estado neutro `monitor`, sin barra ámbar ni roja; la tercera cifra informa el exceso como "Sobre lo previsto", nunca "Excedido" en rojo, porque son gastos esenciales que se pagan sí o sí); **Ahorro = celebrar** (verde, ya venía de MC.8); **Estilo de vida = controlar** (conserva su estado de gasto alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin la olla finita, que necesita el presupuesto del grupo), para no perder la capacidad de ponerle un tope al gasto antes de registrar ingresos.

Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión) y su CSS (`.presupuesto-hero*`, `.estilo-detalle*`, y la regla móvil asociada en `responsive.css`). **Pendiente MC.8c:** el layout (Necesidades + Ahorro en dos columnas compactas, Estilo de vida en fila completa); por ahora las tres tarjetas siguen en el grid de 3 columnas.

3 E2E nuevos (fusión de topes + botón "Agregar límite", olla finita con la cobertura exacta, Necesidades sin alarma aunque supere lo previsto). 1758/1758 unit; 42/42 → 45/45 smoke E2E. Lint limpio. SW v246 → v247.

- **`modules/dominio/presupuesto/view.js`**: topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol (Necesidades neutro); `_renderResumenGruposVacio` conserva los topes sin ingreso; `_renderHero`/`_renderEmptyState` eliminados.
- **`styles/components/analysis.css`**: `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`.
- **`styles/responsive.css`**: se quitó la regla móvil de `.presupuesto-hero__totales`.
- **`tests/e2e/smoke.test.js`**: 3 tests nuevos.
- **`service-worker.js`**: v246 → v247.

---

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo (MC.8, ADR 019) · 2026-07-01

Petición del usuario sobre la retroalimentación visual del Ahorro: superar la meta se pintaba de **rojo** (barra `progress-bar--danger`, borde/fondo de peligro, "Excedido" en rojo), lo que transmite error cuando en realidad es un buen hábito. Se hace `_renderGrupoCard` (`presupuesto/view.js`) consciente del rol para el grupo **Ahorro**: cumplir o superar la meta (`pct >= 100`) usa la **paleta positiva** (verde), nunca ámbar ni rojo.

- Barra `progress-bar--complete` (verde) al llegar al 100%; por debajo, el color de progreso neutro. Nunca `--warn` ni `--danger` para Ahorro.
- Estado visual nuevo `logro` (borde y fondo verdes) en vez de `excedido` (rojo).
- Tercera cifra: superar la meta es "Ahorrado de más" en verde (`is-positive`), no "Excedido" en rojo; no llegar aún es "Te falta" (neutro), en vez del "Disponible" que no aplicaba a ahorro.

Consolida la regla de color de Finko: verde = logros/ahorro/metas cumplidas, ámbar = advertencias, rojo = incumplimientos reales. Necesidades y Estilo de vida conservan su chrome actual (el reencuadre de Necesidades es MC.8b). 1 E2E nuevo (en navegador limpio, autoritativo). 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador: la tarjeta de Ahorro al 150% muestra barra verde, "Ahorrado de más $300.000" en verde y borde verde. Lint limpio. SW v245 → v246.

- **`modules/dominio/presupuesto/view.js`**: `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`).
- **`styles/components/analysis.css`**: `.grupo-card[data-estado="logro"]` (verde) + `.grupo-card__fig dd.is-positive`.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo (Ahorro superado se ve en verde, nunca en rojo).
- **`service-worker.js`**: v245 → v246.

---

### feat(presupuesto): mensajes de Límites por rol, Necesidades informativo y Ahorro más cálido (MC.8a, ADR 019) · 2026-07-01

Primer slice de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 1, 3 y 2). Reencuadra `generarMensajesLimites` (`presupuesto/logic.js`) para que cada grupo hable según su **rol**, no con una plantilla común:

- **Necesidades = monitorear.** Deja de emitir una alerta con lenguaje de "límite". Cuando el gasto en necesidades supera lo que la distribución les asignó, genera un mensaje **informativo** (`tipo: 'info'`, nuevo): "Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos." Estar cerca del presupuesto (estado 'alerta') ya no genera nada: es normal.
- **Ahorro = celebrar.** El refuerzo distingue cumplir de superar: si aportaste justo lo planeado, "Vas por buen camino. Cumpliste con el ahorro que planeaste este mes"; si aportaste de más (`ejecutado > asignado`), un mensaje más cálido: "¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana."
- **Estilo de vida = controlar.** Sin cambios: sigue siendo el único grupo con alertas preventivas por categoría y por grupo.

Nueva función pura **`coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida)`** (la "olla finita"): devuelve `{limites, presupuesto, sinTope, excede}`, cuánto del presupuesto de Estilo de vida cubren los topes y cuánto queda sin tope, para dar noción de presupuesto acotado sin forzar el 100%. Reusa `totalAsignadoMensual`. La usará MC.8b en la vista.

Como `generarMensajesLimites` ya está en uso, se ajustó el render de nudges (`presupuesto/view.js`): `_nivelNudge` resuelve el nivel visual y se agregó el nivel `info` → `nudge-info` (azul calmado), además de los existentes. **Nota:** el chrome de las tarjetas (barra roja, etiqueta "Excedido") todavía sigue el modelo simétrico de MC.5b; su reencuadre por rol es MC.8b. Este slice solo cambia los mensajes.

6 unit netos + 1 E2E nuevo. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador: la tarjeta de Necesidades excedidas muestra un nudge azul informativo (sin "límite") y la de Ahorro que supera lo planeado, el refuerzo cálido en verde. Lint limpio. SW v244 → v245.

- **`modules/dominio/presupuesto/logic.js`**: `generarMensajesLimites` reencuadrada por rol; `coberturaLimitesEstiloVida` nueva.
- **`modules/dominio/presupuesto/view.js`**: `_nivelNudge` + soporte del nivel `nudge-info`.
- **`tests/unit/presupuesto.test.js`**: tests de Necesidades/Ahorro actualizados + 6 de `coberturaLimitesEstiloVida`.
- **`tests/e2e/smoke.test.js`**: E2E de refuerzo de Ahorro actualizado (cumplir) + nuevo (superar).
- **`service-worker.js`**: v244 → v245.

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica **MC.8**, que **revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md)** sin revertir su núcleo (presupuesto por grupo desde la distribución, sin schema). Nace de una observación del usuario: tratar los tres grupos de Límites con la misma tarjeta y los mismos umbrales es sutilmente incorrecto, porque no tienen la misma naturaleza. La sección pasa a un **tratamiento asimétrico por rol**:

1. **Necesidades = monitorear.** Gastos esenciales que se pagan sí o sí; no se limitan. El copy se reencuadra: informa cuánto del ingreso consumen ("usan el X%") y, si suben, sugiere revisar el plan general, nunca "te estás pasando". Se elimina la palabra "límite" de su copy.
2. **Ahorro = celebrar.** Ahorrar más de lo planeado es una victoria, no una desviación. Refuerzo cálido y variado al cumplir o superar la meta (ya existía desde MC.5d; se enriquece), nunca alerta.
3. **Estilo de vida = controlar.** Único grupo con topes por categoría y alertas preventivas. Los topes se **fusionan dentro de su tarjeta** (desaparece el bloque suelto "Estilo de vida: topes por categoría"), con el modelo de "agregar límite bajo demanda" (ya existente) más una línea de conciencia de "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites actuales). Se rechaza la alternativa de porcentajes que sumen 100% por la misma rigidez que MC.6b ya descartó.

Layout: en desktop, Necesidades y Ahorro en dos columnas compactas y Estilo de vida en fila completa (el peso visual comunica dónde está la acción); en móvil se apilan. Decisión pragmática: todas las categorías de gasto siguen siendo limitables en v1 (reclasificarlas por grupo tocaría `ejecutadoPorGrupoDelMes` y se difiere a un ADR futuro). Sin schema nuevo. Implementación en 4 slices (MC.8a a MC.8d). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

- **`docs/DECISIONS/019-limites-por-rol.md`**: nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa.

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c, ADR 018) · 2026-07-01

Tercer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva función pura **`construirDesgloseNecesidades(compromisos)`** en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual equivalente), ordenadas de mayor a menor. Es una vista de **solo lectura**: no mueve dinero, no crea schema; cada obligación se sigue pagando al vencer, exactamente como hoy.

El monto de cada fila usa la misma normalización mensual que ya usa el modelo de distribución (fijo = `monto * factor de frecuencia`, igual que `calcularGastosFijosMensuales`; deuda = `cuotaMensual`, ya mensual), para que el desglose sea coherente con el "Necesidades" agregado que el panel ya mostraba. Los compromisos de baja periodicidad (Anual, Bimestral, etc.) se excluyen, igual que en el agregado.

En la vista, el desglose aparece como un `<details>` colapsable ("Ver detalle (N)") bajo la fila "📦 Necesidades" existente, reusando el patrón visual `.analisis-grupo` (ya usado en Análisis y Límites de gasto) con clases propias (`.distribuir__nec-*`) para no acoplar Mis cuentas al markup de Límites. Cada fila muestra un emoji por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI` de `constants.js`), con fallback genérico por tipo.

11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador: con Arriendo ($800.000), Tarjeta ($250.000) e Internet ($100.000), el detalle los lista en ese orden con sus emojis de categoría. Lint limpio. SW v243 → v244.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseNecesidades()` nueva.
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` computa el desglose; `_renderDesgloseNecesidades()` y `_emojiNecesidad()` nuevas; se inserta en `_renderPanelDistribuir`.
- **`styles/components/forms.css`**: `.distribuir__nec-desglose` + `.distribuir__nec-item*`.
- **`tests/unit/tesoreria.test.js`**: 11 tests nuevos.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo.
- **`service-worker.js`**: v243 → v244.

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b, ADR 018) · 2026-07-01

Segundo slice de la épica MC.7. El panel "Distribuir mi ingreso" ya no arranca con "todo al fondo": cada meta y apartado activo aparece con su **aporte sugerido** (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo de emergencia recibe el **excedente** que queda tras esos aportes. Los objetivos sin fecha muestran $0 y un hint bajo su fila: "Ponle una fecha en Metas/Apartados para calcular cuánto aportar", con enlace a la sección correspondiente. Todo sigue siendo editable, como antes.

`construirPlanAhorro` quedó sin llamadores tras el cambio (era solo el default "todo al fondo") y se **eliminó** junto con sus 5 tests, en vez de dejarla como código muerto. `construirDesgloseAhorroPorObjetivo` (MC.7a) suma el campo `sinFecha` por fila para que la vista sepa cuándo mostrar el hint, sin que `view.js` tenga que re-derivar esa lógica leyendo fechas directamente.

3 unit + 2 E2E nuevos (netos: se sumaron 8 y se quitaron 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit (neto); 73/73 → 75/75 E2E. Verificado en el navegador: con una meta a 6 meses y $1.200.000 de faltante, sugiere $200.000; el fondo (presupuesto $600.000) recibe $400.000 de excedente; una meta sin fecha muestra $0 con el hint. Lint limpio. SW v242 → v243.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` ahora expone `sinFecha` por fila; `construirPlanAhorro()` eliminada (sin llamadores).
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` usa `construirDesgloseAhorroPorObjetivo` directamente sobre `S.metas`/`S.apartados`; `_filaDistribuir` agrega el hint de "sin fecha" con enlace a Metas/Apartados.
- **`styles/components/forms.css`**: `.distribuir-ingreso__destinos .distribuir__hint` (sin margin-top propio, ya lo da el `gap` del contenedor).
- **`tests/unit/tesoreria.test.js`**: 3 tests nuevos de `sinFecha`; se eliminó el describe de `construirPlanAhorro` (5 tests).
- **`tests/e2e/smoke.test.js`**: 2 tests nuevos (aporte sugerido + excedente del fondo; hint de meta sin fecha).
- **`service-worker.js`**: v242 → v243.

---

### feat(tesoreria): desglose de aportes de ahorro por objetivo (MC.7a, ADR 018) · 2026-07-01

Primer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). Nueva función pura **`construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro, hoy })`** en `tesoreria/logic.js`: a diferencia de `construirPlanAhorro` (que hoy sugiere todo el presupuesto al fondo), reparte un aporte sugerido **por cada meta y apartado activo** (faltante entre meses restantes, igual fórmula que `calcularAporteMensualObjetivos`), y el **fondo de emergencia recibe el excedente** que quede tras esos aportes (nunca negativo; 0 si ya está completo). Los objetivos sin fecha sugieren 0 en vez de adivinar (decisión del usuario).

Para no duplicar la fórmula, se extrajo el helper privado `_aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy)` y `calcularAporteMensualObjetivos` se refactorizó para consumirlo (extracción sin cambio de comportamiento, verificada por sus 8 tests existentes que siguen en verde). Esta función aún **no está integrada** en el panel "Distribuir mi ingreso" (eso es MC.7b); es solo la lógica de agregación, pura y testeada en aislamiento.

15 tests nuevos. 1728/1728 → 1743/1743 unit. Lint limpio. SW v241 → v242.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` nueva; `_aporteMensualObjetivo()` helper privado extraído; `calcularAporteMensualObjetivos()` refactorizada para reusarlo.
- **`tests/unit/tesoreria.test.js`**: 15 tests nuevos.
- **`service-worker.js`**: v241 → v242.

---

### docs(adr): ADR 018, "Distribuir mi ingreso" como asistente guiado de 3 pasos (MC.7, diseño) · 2026-07-01

Diseño de la épica MC.7. El panel "Distribuir mi ingreso" ([ADR 012](DECISIONS/012-auto-distribucion-ingresos.md), MC.4a-e) evoluciona a un **asistente guiado** que hace el trabajo pesado y deja al usuario solo revisar, ajustar y confirmar. Tres pasos:

1. **Necesidades** itemizada como **preview read-only** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo, con nombre/categoría/valor). El dinero no se mueve: queda en la cuenta y se paga cada obligación al vencer, como hoy. Sin schema.
2. **Ahorro** con aportes **auto-calculados por objetivo**: para metas/apartados con fecha, `faltante / periodos restantes` (reusa la fórmula de `calcularAporteMensualObjetivos`, pero devolviendo el desglose por objetivo, no solo el total); para los que no tienen fecha, sugiere 0 + hint "ponle una fecha"; el fondo de emergencia recibe el excedente si está incompleto. Todo editable.
3. **Estilo de vida** repartido entre las cuentas activas; **omitido con cuenta única** (regla de cuenta única del proyecto).

Decisiones cerradas con el usuario: (a) Paso 1 = preview, no reservar/apartar (evita schema y no toca el ADN); (b) objetivos sin fecha en el Paso 2 = sugerir 0 con invitación a poner fecha (no adivinar); (c) la implementación arranca por el **Paso 2** (auto-cálculo de Ahorro), el valor "inteligente" más tangible. Confirmación única al final; reusa el apply-plan/undo, el gating por fecha de cobro y los abonos avalancha de MC.4. Sin schema nuevo en v1. Implementación en 6 slices (MC.7a a MC.7f). Solo docs.

- **`docs/DECISIONS/018-asistente-distribuir-ingreso.md`**: nuevo ADR (contexto, 7 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.7 diseño cerrado + slices MC.7a a MC.7f.

---

## Meses anteriores

- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
