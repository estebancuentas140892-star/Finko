# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-30

---

## Estado actual

**App estable, 1667/1667 unit + 65/65 E2E verdes, lint limpio.** Último cambio: fix de flakiness E2E, fecha "hoy" en hora local en vez de UTC (ver abajo). Antes: **A11Y.4** fondo inerte con modal abierto (SW v235), auditoría a11y A11Y.1-3, épica EP completa (11/11 secciones con banner de propósito). **Épica EP completa. Rediseño visual 2026 completo: las 8 fases cerradas.**

**Workflow vigente desde 2026-06-12: deploy continuo.** Cada tarea cerrada se verifica (tests + desktop + móvil), se commitea y se pushea a producción de inmediato (Vercel auto-redeploya: https://finko-brown.vercel.app). El usuario valida cada cambio desde su celular.

---

## Cómo se trabaja una tarea

1. Elegir **una** tarea del ROADMAP (sección Post-v1.0) o del backlog del usuario.
2. Moverla a "En curso" abajo con la fecha de inicio.
3. Hacer el trabajo en una sola sesión cuando sea posible.
4. Al terminar:
   - Verificar en la app (servir + probar manualmente).
   - Correr `npm test` (debe quedar verde).
   - Commit con prefijo (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
   - **Eliminar** la entrada de este archivo.
   - **Agregar** entrada en [`CHANGELOG.md`](CHANGELOG.md) con fecha y archivos tocados.

Ver [`/CLAUDE.md`](../CLAUDE.md) → sección 2 para el workflow completo (cierre con modelo+esfuerzo, supervisión visual, etc.).

---

## En curso

_(sin tarea activa)_

---

## Próxima tarea sugerida

**✅ ADR 011 (rediseño de simulación de deudas) completamente implementado** (2026-06-29). S1 sustituido por la Revisión D.2; S2/S3 hechos; S4/S5 = D.3a/D.3b hechos. Trazabilidad de los slices:
- ✅ **D.2a** - Reordenada la card: picker arriba, acelerador plegable ("¿Puedes pagar más rápido?") abajo. SW v216. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.2b** - Plan inviable: el pago extra sube como primer remedio ("Aumenta tu cuota") dentro del diagnóstico. SW v217. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.3a / S4** - "Renegociar tasa" interactivo + aplicar (`simularRenegociacion`). 16 unit + 2 E2E. SW v218. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.3b / S5** - "Consolidar deudas" interactivo + aplicar (`simularConsolidacion`: crea el crédito nuevo y archiva las consolidadas). 12 unit + 2 E2E. SW v219. Ver [CHANGELOG](CHANGELOG.md).

**✅ Jornada 2 de "Visión de Deudas" completa (D.6-D.9).** El bloque inviable quedó limpio: botón único → panel → selector, y "Aumentar la cuota" ya aplica.

**✅ D.5 + D.5a cerrados: categorías de deuda en dos dimensiones ([ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md)).** Eje "qué" curado (12 → 7), migración v18 → v19, sin campo Acreedor. **Con esto, la serie completa de Deudas (D.1-D.9 + D.5/D.5a) queda cerrada.** **MC.6b, EP.0, EP.1 y EP.2 cerrados (2026-06-30).** Siguiente sugerido: **EP.3** (copy + slot para Metas, Ahorro, Inversión; reutiliza helper EP.1, Sonnet 4.6 - Bajo), **AG.1** (decidir nombre Agenda vs Calendario, Sonnet 4.6 - Bajo), o **MC.6c** (señales más ricas para la distribución, opcional).

### Backlog de auditoría: accesibilidad, color y responsividad (2026-06-30)

Auditoría de la app en 3 frentes (lectores de pantalla y teclado, contraste de color y legibilidad, responsividad). **Hallazgo general: la base es sólida.** Contraste casi todo AA/AAA en ambos temas, responsive completo (breakpoints, tipografía fluida, touch targets, anti-zoom iOS), `prefers-reduced-motion` y `forced-colors` cubiertos, formularios dinámicos con `id` + `<label for>`. Lo de abajo son ajustes puntuales. **Ninguno cambia la interfaz visual** (son semántica ARIA, foco y micro-ajustes de tono de color).

Severidad: Alta (afecta a usuarios reales de lector de pantalla hoy) · Media (mejora notable) · Baja/Verificación (pulido o requiere prueba en dispositivo).

✅ **A11Y.1 (alta) - Quitado `role="listitem"` de los enlaces de navegación.** Los 13 `<a class="nav-item">` + el botón "Más" tenían `role="listitem"` pisando su rol nativo (`link`/`button`); el lector de pantalla los anunciaba como ítems de lista, no como enlaces navegables. Fix mínimo: los 4 contenedores intermedios (uno por grupo de nav) pasan de `role="list"` a `role="group"` (agrupación por etiqueta sin exigir hijos `listitem`) y se quita `role="listitem"` de los 13 enlaces + el botón. `sidebar__nav` (role="list") y cada `.nav-group` (role="listitem") quedan intactos: siguen siendo válidos porque no son interactivos. Ajustado el selector `[role="list"]` → `[role="group"]` en `styles/responsive.css` (aplanado del bottom nav en mobile) para no romper el layout. 1658/1658 unit + 64/64 E2E verdes. SW v231 → v232 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

✅ **A11Y.2 (alta) - Quitado `aria-live="polite"` del `<main>`.** El `<main>` entero era una región viva: cada render y cada cambio de sección se anunciaba en cascada al lector de pantalla. La app ya tiene regiones live dedicadas y correctas (`announce()` en `modules/infra/a11y.js`, toasts de logros, hints de formularios, nudges con `role="alert"`), que quedan intactas. Fix: eliminado el atributo `aria-live` del `<main>` (se conserva `tabindex="-1"` para el skip link). Sin cambio visual ni de comportamiento. 1658/1658 verdes (incluye el test axe). SW v232 → v233 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md). Nota: el anuncio limpio de "estás en la sección X" al navegar lo aporta A11Y.3 (mover el foco), que conviene hacer a continuación.

✅ **A11Y.3 (media) - Mover el foco al navegar de sección.** `showSection` llamaba `.focus()` sobre `#sec-*`, pero las secciones no tenían `tabindex`, así que era un no-op: al cambiar de sección el foco se quedaba en el enlace anterior y no se anunciaba el contenido nuevo. Fix: (1) `tabindex="-1"` en las 13 secciones; (2) `showSection(hash, moveFocus)` mueve el foco solo en navegaciones reales, no en la carga inicial (para no robar el foco antes del skip link); (3) regla `.section:focus { outline: none }` en `base.css` para que el foco programático no dibuje un recuadro alrededor de la sección (el indicador visual ya lo da el item de nav activo). Al recibir foco, la sección anuncia su título como landmark (`aria-labelledby`). Cierra el anuncio limpio que A11Y.2 dejó pendiente. 1658/1658 unit + 64/64 E2E verdes. SW v233 → v234 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

✅ **A11Y.4 (media) - Fondo `inert` mientras hay un modal abierto.** `abrirModal` atrapaba el Tab (`trapFocus`) pero no marcaba el fondo como inerte, así que el cursor virtual del lector de pantalla podía leer el contenido detrás del modal (`aria-modal="true"` solo no basta: soporte inconsistente). Fix sin cambio visual: `abrirModal` marca `.app-shell` con `inert` (después de `trapFocus`) y `cerrarModal` lo libera (antes de `releaseFocus`, para restaurar el foco al botón que abrió el modal). Los modales viven como hermanos de `.app-shell`, así que inertizar el fondo no los afecta; los overlays dinámicos (`confirm.js`, `cuenta-helper.js`) también viven fuera y se cierran con `overlay.remove()`, así que apilan bien. Nuevo `tests/unit/modales.test.js` (9 tests) + 1 E2E que valida el `inert` real en navegador. 1667/1667 unit verdes. SW v234 → v235 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

✅ **test(e2e) - Fecha "hoy" en hora local, no UTC.** Detectado al verificar A11Y.4: 9 usos de `new Date().toISOString().slice(0, 10)` en `smoke.test.js` y `ahorro-inversion.test.js` hacían fallar 4 tests de Gastos en la tarde del último día del mes (Colombia UTC-5: cerca de medianoche local, `toISOString()` ya da el día siguiente en UTC; el gasto quedaba guardado en el mes que viene y la app, que filtra "este mes" en hora local, no lo mostraba). Fix: helper `hoyLocal()` en ambos archivos, replica `hoy()` de `modules/infra/utils.js` con getters locales. Solo tests, sin cambio de código de producción. 1667/1667 unit + 65/65 E2E verdes (antes 61/65 en frontera de mes) - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

**A11Y.5 (verificación) - Pase axe sobre formularios dinámicos.** El test [tests/unit/a11y.test.js](../tests/unit/a11y.test.js) solo ve el HTML inicial; los formularios reales se inyectan por JS y no se auditan. El patrón actual (`id` + `<label for>`) está bien en los que se muestrearon (Gastos, Deudas, abonos), pero conviene un pase axe en E2E con un modal abierto para cerrar la brecha. Modelo sugerido: Sonnet 4.6 - Medio.

**COL.1 (baja) - `--fk-warning` en modo claro queda apenas por debajo de AA como texto pequeño.** `#a06800` sobre `--fk-bg-base` (`#f6f7fa`) da 4.38:1 (AA pide 4.5 para texto normal); se usa en `.chip-warning`, `.badge--warn` y hints de aviso. Fix: oscurecer a ~`#8a5a00` en [styles/themes.css](../styles/themes.css) (el modo oscuro ya está en 10.8:1, no se toca). Cambio de color casi imperceptible. Modelo sugerido: Haiku 4.5.

**COL.2 (opcional) - `--fk-text-disabled` no cumple contraste** (2.05:1 oscuro / 1.92:1 claro). El texto deshabilitado está exento de WCAG, pero para baja visión cuesta leerlo. Fix opcional: subir un punto el tono en [styles/tokens.css](../styles/tokens.css) y [styles/themes.css](../styles/themes.css). Modelo sugerido: Haiku 4.5.

**RWD.1 (verificación) - Probar reflow real a 320px y zoom 200%.** El CSS responsive está completo en código, pero el preview del entorno no carga (ver memoria). Verificar en dispositivo o con un E2E a 320px que no haya scroll horizontal ni solapes (sobre todo en modales con `.input--big-amount` y la barra inferior). Nota menor: los labels del nav bajan a 10px bajo 360px (aceptable con icono, vigilar). Modelo sugerido: Sonnet 4.6 - Bajo.

**DOC.1 (baja) - `docs/DESIGN_SYSTEM.md` desactualizado.** Documenta `--fk-accent: #00dc82` y la fuente DM Mono, pero [styles/tokens.css](../styles/tokens.css) ya usa `#1fd194` e Inter para mono. El doc afirma "WCAG AA mínimo": conviene mantenerlo veraz. Fix: actualizar tokens y fuentes en [docs/DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Modelo sugerido: Haiku 4.5.

---

### Backlog del usuario "Mejoras generales" (2026-06-30)

Tres ideas del usuario para pulir la experiencia. Las dos últimas (EP.5, EP.6) revisan decisiones de la épica EP recién cerrada ([ADR 016](DECISIONS/016-banner-proposito-de-seccion.md)) y se solapan entre sí, así que conviene resolverlas en un mismo pase de diseño antes de codear.

**LG.1 (épica, requiere ADR) - Sección de Logros.** Hoy el sistema de logros solo se manifiesta como un toast al desbloquear uno, con dos problemas del usuario: (1) el toast dura poco (`DURACION_MS = 2500` en [modules/dominio/logros/index.js](../modules/dominio/logros/index.js)) y muchas veces no se alcanza a leer; (2) no hay dónde consultar los logros después. Propuesta: una sección o apartado "Logros" que muestre los conseguidos, los pendientes, el progreso de cada uno y una breve explicación de cómo desbloquearlos, como refuerzo de gamificación y buenos hábitos. El dato ya existe: `S.logros` guarda los IDs desbloqueados y `LOGROS` (en [logros/logic.js](../modules/dominio/logros/logic.js)) tiene nombre, emoji y descripción de cada uno. Puntos a decidir en el ADR: (a) sección propia con nav vs. tarjeta en Ajustes o Dashboard; (b) qué logros muestran progreso parcial (varios son binarios, ej. "Primer gasto"; otros tienen barra natural, ej. "10 gastos", "3 cuentas"), lo que puede requerir extender `LOGROS` con un `progreso(s)` opcional. Oportunidad asociada: las descripciones de `LOGROS` están en voseo ("Tenes", "vos"), que rompe la regla ADN 11 (tuteo); si se exponen en una sección conviene corregirlas. Se puede partir: **LG.1a (rápida)** subir la duración del toast y/o permitir cerrarlo o pausarlo al pasar el cursor (Sonnet 4.6 - Bajo); **LG.1b+ (épica)** la sección completa tras el ADR (diseño Opus 4.8 - Alto, implementación Sonnet 4.6 - Medio).

**EP.5 (revisa ADR 016) - Auto-ocultar el banner de propósito al interactuar.** El banner de propósito ([modules/ui/proposito.js](../modules/ui/proposito.js)) hoy queda expandido hasta que el usuario lo colapsa a mano ("Entendido, ocultar"). ADR 016 lo decidió así a propósito (visible tenga o no datos, colapsable pero nunca se borra). El usuario propone que se colapse solo una vez que empieza a usar la sección o ya tiene datos, para no ocupar espacio de forma permanente, sobre todo en móvil. El estado ya existe (`S.config.propositoColapsado[seccion]`); el cambio es la heurística de colapso automático (ej. colapsar por defecto cuando la sección ya tiene registros). Es una revisión de ADR 016: decidir el disparador antes de codear. Modelo: Sonnet 4.6 - Bajo (una vez decidido).

**EP.6 (revisa ADR 016, épica de diseño) - Unificar el mensaje de propósito con el del empty state.** Hoy hay dos mensajes que explican lo mismo: el banner de propósito arriba de la sección (EP/ADR 016) y el texto del empty state sobre el botón de acción (ej. en Gastos: "Sin gastos este mes. Anota cada compra o pago que haces..."). El usuario ve duplicidad y prefiere el mensaje del botón (más ligado a la acción que va a realizar), pero pide que sea más completo: que explique con claridad qué problema resuelve la sección y qué beneficio da. Propuesta: una sola explicación bien redactada en vez de dos, para reducir carga visual y mantener coherencia en toda la app. Es la decisión más de fondo porque reconsidera la dirección de la épica EP recién cerrada y toca los empty states de varios dominios. Requiere ADR (revisión de 016). Nota: EP.6 y EP.5 se solapan; si se decide unificar (EP.6), el auto-ocultar (EP.5) puede volverse innecesario. Conviene un solo pase de diseño que resuelva ambas. Modelo: Opus 4.8 - Alto.

---

### Backlog del usuario "Me deben (Personales)" (2026-06-30)

Cinco ideas del usuario sobre "Me deben" (dominio `personales`, préstamos que tú das). **PE.1 invierte la premisa actual del dominio** (hoy es "informal, sin tasa"); **PE.2 y PE.4 comparten un humanizador de fechas nuevo**.

**PE.1 (schema + lógica financiera) - Tasa de interés opcional + reparto capital/interés.** Hoy el préstamo es "informal, sin tasa de interés ni amortización" por diseño (`personales/logic.js` línea 7). El usuario pide un campo opcional de tasa; con él, Finko calcularía capital, interés generado, saldo pendiente y total recuperado. Requiere schema (campo `tasa` + unidad en el `Personal`, migración idempotente) y lógica de amortización, reusable desde la de deudas ([modules/infra/financiero.js](../modules/infra/financiero.js), sistema francés). Al haber tasa, cada pago se reparte en capital vs interés (ver PE.4). Modelo: Opus 4.8 - Medio (nueva lógica financiera CO + schema).

**PE.2 - Humanizar la antigüedad.** El chip muestra los días exactos ("1.825 días", `_renderPersonalItem` en [modules/dominio/personales/view.js:100](../modules/dominio/personales/view.js)). El usuario pide un formato natural: "Hace 5 años", "Hace 8 meses", "Hace 3 semanas", "Hace 5 días". Nuevo helper puro de tiempo relativo (en `personales/logic.js` o, mejor, en [infra/utils.js](../modules/infra/utils.js) para reusar; hoy solo existe `fechaLegible`, que es fecha absoluta). Modelo: Sonnet 4.6 - Medio (helper puro + tests + aplicarlo).

**PE.3 - Suavizar el copy de los estados.** El estado "viejo" muestra "N días, ya toca cobrar" ([view.js:103](../modules/dominio/personales/view.js)), que suena a presión. El usuario prefiere un tono de seguimiento: "La fecha de pago ya pasó", "El pago está pendiente", "Próximo pago en 5 días", "Pago programado para hoy". Nota: los estados "próximo pago en X" y "para hoy" se basan en una fecha pactada (`fechaLimite`), no solo en la antigüedad, así que además de copy hay algo de lógica de estado por vencimiento. Coherente con el tono neutral ([ADR 003](DECISIONS/003-tono-neutral-profesional.md)) y ADN regla 11. Modelo: Sonnet 4.6 - Medio (copy + estado por fecha pactada).

**PE.4 (reusa PE.2, se completa con PE.1) - Mejorar el estado tras un pago.** Tras registrar un pago, el chip muestra "0 días" ([view.js:106](../modules/dominio/personales/view.js), porque `ultimoPago` reinicia `calcularDias` a 0), poco informativo. El usuario pide estados como "Recibiste la cuota de este mes", "Último pago: hoy / ayer / hace 15 días", reusando el humanizador de PE.2 sobre `ultimoPago` (ya existe el hint "Último abono: {fecha}" en [view.js:114](../modules/dominio/personales/view.js), pero el chip principal sigue mostrando "0 días"). Con PE.1 (tasa), cada pago además indica cuánto fue a capital, cuánto a interés y el saldo restante. Modelo: Sonnet 4.6 - Medio.

**PE.5 - "Te han devuelto" en verde.** El indicador "Te han devuelto" (`r.totalCobrado` en [view.js:60](../modules/dominio/personales/view.js)) muestra dinero recuperado; el usuario pide resaltarlo en verde (positivo, ingreso), coherente con los patrones financieros. Cambio de clase/color con tokens `--fk-*` (verde de éxito). Modelo: Sonnet 4.6 - Bajo (color con tokens).

---

### Backlog del usuario "Ahorro (Fondo de emergencia)" (2026-06-30)

Cuatro ideas del usuario sobre el Fondo de emergencia. **AH.4 converge con MT.2 (Metas) y AP.4 (Apartados)** en un mismo ADR de recordatorios de aporte en Agenda; **AH.3 tensiona el modelo actual del fondo** (que hoy no mueve dinero).

**AH.1 - Clarificar de dónde sale el objetivo del fondo.** Al activar el fondo, el hint dice "Con esa meta tu objetivo sería $480.000 (3 meses × $160.000 de gastos fijos al mes)" (`renderFormFondo` en [modules/dominio/ahorro/view.js:318](../modules/dominio/ahorro/view.js)). El usuario no entiende de dónde sale el $160.000. Dos opciones: quitar el detalle, o explicarlo mejor ("Calculamos este objetivo tomando el promedio de tus gastos fijos mensuales registrados y multiplicándolo por los meses de respaldo que elegiste"). `gastosFijosMensuales` lo calcula `index.js` desde los compromisos tipo 'fijo'; conviene que el copy lo nombre así para dar confianza. Modelo: Sonnet 4.6 - Bajo (copy).

**AH.2 - Aporte recomendado según los ingresos, explicado.** Hoy el valor de ahorro que propone Finko no explica su origen. El usuario pide construirlo con sus datos: ingresos (o su promedio), frecuencia de cobro, gastos fijos, deudas y otras metas activas; y si falta info, pedir el promedio de ingreso mensual. El objetivo: un monto sostenible, no arbitrario. Se cruza con el modelo de distribución (MC.6a ya calcula `faltanteFondo / 12` como aporte ideal del fondo) y con MC.7 (asistente guiado, aportes auto-calculados por objetivo según la frecuencia). Conviene resolverlo alineado con MC.6/MC.10/MC.11 para no tener dos motores de recomendación de ahorro. Modelo: Sonnet 4.6 - Medio (o Opus si toca el motor de distribución).

**AH.3 (revisa el modelo del fondo) - Registrar el origen del dinero en el aporte.** El form de aporte al fondo (`renderFormAporte` en [ahorro/view.js:360](../modules/dominio/ahorro/view.js)) hoy solo pide monto, fecha y nota: **no** pregunta cuenta ni descuenta saldo, por diseño (comentario en [ahorro/index.js:410](../modules/dominio/ahorro/index.js): "el aporte NO descuenta cuenta, su dinero se queda donde está"). El usuario pide lo contrario: elegir una o varias cuentas (con logo, incluida efectivo), validar saldo suficiente y sincronizar el saldo, como en el resto de la app (patrón AP.1). Esto **revisa el modelo del fondo**: hoy es una designación de dinero que ya tienes (se mantiene líquido), no un pote aparte; que el aporte descuente lo convierte en un destino como metas/apartados. Decisión de diseño antes de codear: ¿el fondo mueve dinero fuera de las cuentas (como metas/apartados) o sigue siendo un marcador de dinero líquido? Si se decide que mueve, es un port de `renderSelectorCuenta` + `resolverPagoConPreferida`. Modelo: diseño Sonnet 4.6 - Alto (revisa el modelo); implementación Sonnet 4.6 - Medio.

**AH.4 (épica, ADR junto con MT.2 y AP.4) - Quitar "Definir" e integrar el fondo con Agenda.** El botón "Definir →" del compromiso mensual ("¿Cuánto quieres apartar este mes?", `renderFormCompromisoMensual` en [ahorro/view.js:400](../modules/dominio/ahorro/view.js), botón en [view.js:223](../modules/dominio/ahorro/view.js)) duplica lo que ya hace "Distribuir mi ingreso" (MC.4) en Mis cuentas. El usuario propone quitarlo y, en su lugar, integrar el fondo con Agenda: según la frecuencia de ingreso, un recordatorio "Hoy corresponde tu aporte al Fondo de emergencia" con botón "Ahorrado / Registrar aporte". **Esto converge con MT.2 (Metas) y AP.4 (Apartados):** los tres piden recordatorios de aporte en Agenda según la frecuencia de ingreso. Debe ser **un solo ADR** que decida el modelo de recordatorios de aporte para fondo + metas + apartados, sin solapar con MC.4 (que ya acredita y reparte al llegar el cobro). Antes de quitar `compromisoMensual`, verificar si alimenta nudges o el Score de Salud (J.1b/J.1c). Depende de AH.3 (el botón de aporte debe usar el flujo definido). Modelo: diseño Opus 4.8 - Alto (cross-domain, trade-offs de duplicación).

---

### Backlog del usuario "Metas" (2026-06-30)

Cinco ideas del usuario sobre la sección Metas. Varias replican patrones ya establecidos en otras secciones (categorías tipo MC.9/TX.1/D.5a; abono unificado tipo AP.1), y una (MT.2) se solapa con AP.4.

**MT.1 - Categorías para metas.** Metas hoy no tiene campo `categoria`, solo `icono` (default 🎯, ver `normalizarMeta` en [modules/dominio/metas/logic.js:108](../modules/dominio/metas/logic.js)). Agregar `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en `constants.js` (mismo patrón que MC.9 para ingresos, TX.1 para Agenda, D.5a para deudas), selector en el form de nueva meta y emoji junto al nombre en la lista. Categorías propuestas por el usuario: ✈️ Viajes, 🎂 Cumpleaños, 💍 Boda, 🏠 Vivienda, 🚗 Vehículo, 💻 Computador, 📱 Celular, 🎓 Educación, 👶 Hijo(s), 🏖️ Vacaciones, 💼 Emprendimiento, 📦 Otra. **Ojo de consistencia (TX.4):** "Educación" ya usa 📚 en Gastos/Agenda, así que el guardarraíl de `constants.test.js` fallaría con 🎓; reconciliar el emoji de las etiquetas compartidas (Educación, Vivienda ya es 🏠 en deudas). Schema: probablemente sin migración (campo `categoria` opcional de lectura defensiva); confirmar al implementar. Modelo: Sonnet 4.6 - Medio.

**MT.2 (épica, requiere ADR, junto con AP.4) - Integración de Metas con Agenda.** Según la frecuencia de ingreso (semanal, quincenal, mensual...), Finko programaría recordatorios de aporte a cada meta en Agenda, con el color de la meta, su nombre y un botón "Abonar" que funcione igual que los demás. **Se solapa fuerte con AP.4** (recordatorios automáticos de aporte en Agenda para Apartados, ya marcada "requiere ADR" por duplicación con MC.4 "Distribuir mi ingreso" y el nudge de proximidad). Conviene un ADR único que decida el modelo de "recordatorios de aporte en Agenda según frecuencia de ingreso" para metas y apartados a la vez, sin solapar con MC.4. Depende también de MT.5 (el botón "Abonar" debe usar el flujo unificado) y se beneficia de MT.1 (color/ícono de la meta). Modelo: diseño Opus 4.8 - Alto (cross-domain, trade-offs de duplicación).

**MT.3 (depende de MT.1) - Simplificar la selección de emoji.** Quitar el campo independiente "Emoji (opcional)" del form ([metas/view.js:145](../modules/dominio/metas/view.js)). Nueva regla: si el usuario elige categoría, la meta usa el emoji de esa categoría; si no elige categoría, aparece un botón pequeño junto al nombre para agregar un emoji opcional; si no quiere ninguno, queda vacío. Simplifica el form y conserva la personalización. `icono` pasa a derivarse de la categoría o del emoji manual. Modelo: Sonnet 4.6 - Medio (UX del form + derivación del ícono).

**MT.4 - Ahorro sugerido según la frecuencia de ingreso, no "por día".** Hoy la meta muestra cuánto ahorrar por día (`calcularAhorroDiario` en [metas/logic.js:59](../modules/dominio/metas/logic.js), render "/día" en [view.js:46](../modules/dominio/metas/view.js)). El usuario pide alinearlo con su frecuencia de cobro: si cobra quincenal, cuánto por quincena; si mensual, mensual; etc. Nueva función pura que reparte el faltante entre el número de periodos de la frecuencia (de `S.ingresos`) hasta `fechaLimite`, y el copy se ajusta ("$X por quincena"). Es el mismo espíritu que la parte 2 de MC.7 (aportes auto-calculados por objetivo según la frecuencia del ingreso). Modelo: Sonnet 4.6 - Medio (lógica pura + copy; lee la frecuencia de ingreso).

**MT.5 - Unificar el flujo de abono con el selector de cuentas compartido.** El abono a meta usa un `<select>` de texto plano (`_renderCuentaSelectorAbono` en [metas/view.js:168](../modules/dominio/metas/view.js)), distinto del resto de la app. Portar el patrón de AP.1: usar `renderSelectorCuenta` + `resolverPagoConPreferida` ([modules/infra/cuenta-helper.js](../modules/infra/cuenta-helper.js)) para mostrar cada cuenta con su logo, permitir combinar varias cuando una no alcanza, y bloquear el abono con un mensaje claro si aun combinando no hay fondos suficientes. Es un port directo del trabajo ya hecho en Apartados. Modelo: Sonnet 4.6 - Medio.

---

### Backlog del usuario "Deudas, jornada 3" (2026-06-30)

Tres observaciones nuevas del usuario sobre la sección Deudas. La primera revisa una decisión de [ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md); la segunda afina la explicación de la recomendación de [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md).

**D.10 (diseño, revisa ADR 015) - Categorías propias para deudas personales.** Al elegir "Personal" en el chooser, el formulario ([modules/dominio/compromisos/views/formularios.js:173](../modules/dominio/compromisos/views/formularios.js)) sigue mostrando las mismas categorías que una deuda con entidad (`CATEGORIAS_DEUDA`: Tarjeta de crédito, Vivienda, Vehículo...), que no encajan cuando le debes a una persona. El usuario propone que, para deuda personal, el selector cambie a categorías de relación o acreedor: Familiar, Amigo, Vecino, Natillera, Compañero de trabajo, Prestamista particular, Otro. El form ya se adapta por tipo en tasa, hint y placeholder (`esEntidad`), así que la pieza faltante es un catálogo aparte (`CATEGORIAS_DEUDA_PERSONAL` + su mapa de emoji) y elegir `catOpts` según el tipo, más ajustar el label ("Tipo de deuda" → algo como "¿Con quién es la deuda?"). Es una revisión de ADR 015, que declinó a propósito un campo "Acreedor" por solaparse con Entidad/Personal; aquí no es un campo nuevo, sino que el eje "qué" pasa a depender del eje "quién". Decisiones para el ADR: (a) qué hacer con las deudas personales ya registradas que tienen categoría de producto (migrar o dejar); (b) si "Natillera" o "Prestamista particular" se solapan con la tasa mensual que el form ya ofrece. Modelo: diseño Sonnet 4.6 - Alto (revisa ADR); implementación Sonnet 4.6 - Medio.

**D.11 (mejora de lógica y copy, revisa ADR 011) - Explicar el porqué de la recomendación, no solo cuál.** Con dos deudas (una de $4.000.000 sin interés y una de $600.000 al 5%), Finko recomienda bien Bola de nieve, pero la razón que muestra se queda en "es la más pequeña, pesa la motivación" (`recomendarEstrategia` en [compromisos/logic.js:1071](../modules/dominio/compromisos/logic.js), última rama: ambas estrategias atacan primero la misma deuda, así que el ahorro no es material y decide por impulso). El usuario pide que la explicación diga también que esa deuda es la **única que genera intereses**, así que pagarla primero elimina ese costo y libera esa cuota para la siguiente. Es afinar las cadenas `razon` para que sean conscientes de la situación: cuando la deuda a atacar primero es la única (o la principal) con tasa > 0, nombrar ese hecho. El dato ya está disponible en la comparación (qué deudas tienen `tasaEA > 0`). Toca la lógica financiera de deudas, así que conviene cuidado. Modelo: Opus 4.8 - Bajo (refinamiento de explicación en lógica financiera con repro clara).

**D.12 (mejora UI) - Contextualizar el aviso de tasa desconocida por deuda.** Cuando una deuda con entidad no tiene tasa, aparece un aviso al tope de la sección ("... no tiene tasa registrada. La calculamos como 0% por ahora..."), en `_renderAvisoTasaDesconocida` ([compromisos/views/estrategia.js:317](../modules/dominio/compromisos/views/estrategia.js)). El mensaje es útil pero está lejos de la deuda que lo motiva: el usuario tiene que interpretar a cuál se refiere. Propuesta: mostrarlo sobre la deuda correspondiente (en su item de la lista) o junto al campo de tasa que falta, para que se identifique al instante y la parte superior quede más limpia. Hoy el aviso lista los nombres de las deudas sin tasa en un solo banner; el cambio es moverlo a un aviso por deuda en el render de la lista ([compromisos/views/lista.js](../modules/dominio/compromisos/views/lista.js)). Modelo: Sonnet 4.6 - Medio (UI, render por item).

---

### Backlog del usuario "Visión de Deudas" (2026-06-29)

Observaciones del usuario sobre la sección Deudas. Varias revisan o se cruzan con ADR 011, así que conviene actualizar ese ADR antes de codear D.2/D.3.

✅ **D.1 (BUG)** - Corregido el cálculo del impacto del pago extra, que mostraba cifras absurdas ("terminas 49 años antes y ahorras $6e29") cuando la cuota no cubre los intereses. Raíz: con un plan base inviable, `simularEstrategiaPago` diverge (saldo crece, `interesesTotales` explota, meses topa en 600) y los renderers restaban contra esa base. Fix en los 3 puntos de fuga (`estrategia-impacto.js`): `renderResumenExtra` (si la base es inviable, explica que sin el extra no se paga, sin restar), `renderImpactoAvalancha` ("No se termina de pagar" en vez del total divergente) y `_renderComparativa` (no compara estrategias si alguna no completa). 4 tests de regresión. SW v214 → v215 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.2 (diseño, revisa ADR 011 S1)** - Replanteada la jerarquía de la simulación: el eje principal vuelve a ser elegir Avalancha vs Bola de nieve; el pago extra deja de ser protagonista y pasa a ser contextual (acelerador plegable en plan viable, primer remedio en plan inviable). ADR 011 revisado (sección "Revisión D.2", S1 sustituido). Implementación dividida en D.2a + D.2b (ver "Próxima tarea sugerida" arriba). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.3 (= ADR 011 S4/S5) - Convertir la simulación en acción.** Completa, corte vertical por herramienta: D.3a (renegociar tasa + aplicar) + D.3b (consolidar + aplicar). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.4 (mejora UI)** - Comparación explicada Avalancha vs Bola de nieve: bloque "¿Cómo elegir?" con una frase por estrategia (Avalancha = ahorro en intereses y, si difiere, terminar antes; Bola de nieve = cerrar la primera deuda antes). El "cuánto antes" sale de comparar `mesPagado` de la primera deuda que cierra cada estrategia (dato ya devuelto en `orden[]`), sin lógica nueva. Conserva el banner verde cuando solo Avalancha aventaja y los mensajes de empate. 3 tests de render. SW v219 → v220 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.5 (diseño) = [ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md).** Categorías de deuda en dos dimensiones. Decisión con el usuario: el modelo ya tiene los dos ejes (**quién** = Entidad/Personal, define la tasa; **qué** = `categoria`). Se refina el eje "qué" (Tipo de deuda, curado 12 → 7) y se deja "quién" intacto. **No** se agrega campo "Acreedor" (jerga confusa, se solapa con Entidad/Personal; los acreedores quedan como ejemplos en el chooser). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.5a (implementa D.5)** - `CATEGORIAS_DEUDA` curado (12 → 7: Tarjeta de crédito, Libre inversión, Vivienda, Vehículo, Educativo, Compra a cuotas, Otra) + `CATEGORIA_DEUDA_EMOJI`; migración idempotente v18 → v19 (`REMAPEO_TIPO_DEUDA`); label del form "Tipo de obligación" → "Tipo de deuda". El usuario aprobó la lista curada y el mapeo tal cual del ADR (los informales colapsan en "Libre inversión"). 4 tests de migración + catálogo/form actualizados. 1645 → 1649 verdes. SW v225 → v226 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

### Backlog del usuario "Visión de Deudas, jornada 2" (2026-06-29)

Segunda ronda de observaciones del usuario sobre la sección Deudas. Objetivo común: que la sección se sienta **limpia**, con Avalancha y Bola de nieve siempre de protagonistas, y que las herramientas de ayuda aparezcan **solo cuando hacen falta**, una a la vez. La revisión de la jerarquía ya está hecha: **[ADR 011](DECISIONS/011-unificacion-simulador-deudas.md) tiene la Revisión D.7** (botón único → panel con selector); D.8 y D.9 son la implementación.

✅ **D.6 (mejora UI, contenida)** - Eliminado el nudge `#nudge-fijos-sin-pagar` de la sección Deudas: el panel "N pendientes del mes" del Dashboard ya centraliza todos los vencidos (fijos, deudas, agenda). Eliminada también la función `renderAlertaFijosSinPagar` completa (función, re-export, import, call y nodo HTML). `renderAlertaDeudasDurmiendo` intacta. 1633/1633 verdes. SW v222 → v223 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.7 (diseño, revisa ADR 011)** - Replanteado el bloque inviable, que hoy muestra el diagnóstico + pago extra + renegociar + consolidar todo a la vez (saturado). Nueva jerarquía en la [Revisión D.7 de ADR 011](DECISIONS/011-unificacion-simulador-deudas.md): con el plan inviable, Avalancha/Bola de nieve siguen de protagonistas y, **debajo del detalle**, aparece **un solo botón de alerta** ("🚨 Cuidado: tu plan de pago no se sostiene. Veamos cómo resolverlo") que abre un **panel** con un selector de 3 alternativas (Aumentar la cuota · Renegociar · Consolidar) que muestra **una a la vez**. Estado del panel en `_uiEstrategia` (no `<details>`). Decidido para D.9: "Aplicar" en Aumentar la cuota es **automático** (Finko reparte el extra cubriendo déficits + remanente a la mayor tasa, sin preguntar a qué deuda). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.8 (implementa D.7) - Panel de alternativas con selector** - Botón único de alerta que alterna `panelAlternativasAbierto`; panel con diagnóstico + selector de 3 alternativas (`alternativaActiva`, default "Aumentar la cuota") que muestra **solo el contenido de la opción elegida** (no las tres a la vez). Renegociar (D.3a) y Consolidar (D.3b) **reubicados** dentro del selector sin tocar su lógica. "Aumentar la cuota" sigue siendo simulación hasta que D.9 le sume Aplicar. Estado del panel en `_uiEstrategia`, 2 data-actions nuevos (`abrir-panel-alternativas`, `elegir-alternativa`). El bloque inviable se movió **debajo del detalle** (corrige la deriva de que vivía arriba del picker). 8 unit + 2 E2E nuevos. 1633 → 1637 verdes; 61 → 63 E2E. SW v223 → v224 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.9 (implementa D.7) - "Aumentar la cuota" como acción aplicable real** - El pago extra deja de ser solo what-if (D.2b). El botón "Aplicar este aumento" reparte el extra **automáticamente** (`repartirExtraEnCuotas`: cubre el déficit de las que más rápido crecen, remanente a la mayor tasa; sin preguntar a qué deuda) y escribe la nueva `cuotaMensual` sobre cada deuda afectada (con confirmación que nombra cada una). Ese valor alimenta los pagos programados (`calcularCompromisoMensual`) y la distribución automática (`cuotasDeudaMensuales` en MC.6a) sin lógica nueva. Tercera superficie de "simular → aplicar". Limitación v1: `cuotaMensual` es estático; el volcado al cerrar una deuda queda como re-aplicar manual. 8 unit + 1 E2E. 1637 → 1645 verdes; 63 → 64 E2E. SW v224 → v225 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

### Backlog del usuario "Distribución inteligente, refinamientos" (2026-06-30)

Dos observaciones del usuario sobre el modo automático de "Distribuir mi ingreso". Ambas revisan el modelo de pisos de [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md) (implementado en MC.6a) y conviene resolverlas juntas, porque las dos ajustan cómo se reparte el ingreso cuando las Necesidades son altas.

**MC.10 (diseño, revisa ADR 013) - Reservar siempre algo para ahorro cuando hay margen.** Con Necesidades al 91% del ingreso, el modo auto reparte Necesidades 91% / Estilo de vida 9% / Ahorro 0%, porque el modelo reserva primero un piso de estilo de vida (`_PISO_EV_PCT = 10` en [modules/dominio/tesoreria/logic.js:754](../modules/dominio/tesoreria/logic.js)) y el ahorro solo recibe lo que sobra tras Necesidades y ese piso (Paso 3, línea 871: "el piso cede ante Necesidades pero gana sobre el ahorro extra"). El usuario propone lo contrario desde la educación financiera: cuando queda algún margen, garantizar un pequeño piso de ahorro aunque se recorte el estilo de vida (ej. del 9% libre, repartir algo a ahorro y algo a estilo de vida). El ahorro solo debería quedar en $0 cuando de verdad no hay alternativa (Necesidades >= ingreso), caso que ya existe (línea 850) y comunica el motivo. Cambio: introducir un `_PISO_AHORRO_PCT` que compita con el piso de estilo de vida al repartir el residuo. Es una revisión del orden de pisos de ADR 013. Modelo: diseño Opus 4.8 - Medio (regla del modelo de distribución); implementación Sonnet 4.6 - Medio.

**MC.11 (diseño, revisa ADR 013) - Detectar déficit real y comunicarlo, no forzar una distribución "ideal".** Con un gasto fijo de $2.000.000 más otros gastos y un ingreso de $2.000.000, el usuario ve una distribución 85/10/5, que no es coherente: sus Necesidades ya consumen todo el ingreso. El modelo sí tiene un caso de déficit (línea 850, `montoNec >= ingresoMensual` → 100/0/0 + alerta), pero no se está disparando en este escenario. Hipótesis a verificar: `montoNec` solo suma `gastosFijosMensuales` (gastos fijos en Agenda) + `cuotasDeudaMensuales` ([logic.js:812](../modules/dominio/tesoreria/logic.js)), así que un gasto fijo registrado en la sección Gastos (no en Agenda) no cuenta como Necesidad y el modelo subestima. El usuario pide que, cuando los ingresos no cubren las necesidades, Finko no invente porcentajes sino que detecte el déficit y lo comunique con un mensaje claro ("Tus ingresos no son suficientes para cubrir tus necesidades...") y ofrezca recomendaciones accionables: identificar gastos a reducir, replantear el estilo de vida, buscar más ingresos, revisar si alguna deuda se puede renegociar (esto último ya existe como herramienta en Deudas, D.3a). Decisiones para el ADR: (a) qué cuenta como "Necesidades" (solo Agenda + deudas, o también gastos fijos de la sección Gastos); (b) el estado de déficit como una vista propia con CTAs, no solo una alerta al pie. Modelo: diseño Opus 4.8 - Medio; implementación Sonnet 4.6 - Medio.

---

### Backlog del usuario "Mis cuentas + distribución" (2026-06-28)

Observaciones nuevas del usuario, de menor a mayor alcance. Arrancar por la más pequeña.

✅ **MC.1** - Simplificados los textos de ayuda del form de nueva cuenta (eliminada la descripción del 4x1000 y el "Opcional..." de la cuota de manejo) - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.2 (parte 1 de 2)** - Animación de entrada suave (`distribucion-rows-in`) al cambiar entre presets de distribución (50/30/20 ↔ 70/20/10 ↔ 60/20/20); la barra de chips queda fuera del bloque animado - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.2 (parte 2 de 2)** - Distribución de porcentajes personalizada: chip "Personalizar" abre un editor inline de 3 campos (Necesidades/Estilo de vida/Ahorro) con suma en vivo y validación de 100%; persiste en `S.config.distribucionPersonalizada` - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md). **MC.2 completa.**

✅ **MC.3** - Reformulado el nudge de deudas en la distribución: ahora invita a recortar Estilo de vida antes que el ahorro - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.4 (diseño)** - ADR 012 escrito: auto-distribución de ingresos "Distribuir mi ingreso". Decisiones: híbrido (mueve lo fondeable, informa lo demás), acredita el ingreso y reparte, confirmaciones parciales, orquestación por EventBus + undo por snapshot - 2026-06-29. Ver [ADR 012](DECISIONS/012-auto-distribucion-ingresos.md).

Slices de implementación de MC.4 (smallest-first, ver ADR 012):
- ✅ **MC.4a** - Entrada "Distribuir mi ingreso" + panel editable (toggles + montos + remanente en vivo) + acreditar ingreso + aplicar grupo Ahorro (Fondo, Metas, Apartados) vía EventBus + undo por snapshot - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4b** - Deudas como destino fondeable: abono real vía EventBus, ordenadas por prioridad (Avalancha), topado al saldo - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4c** - Filas informativas de Necesidades y Estilo de vida en el panel (solo monto de referencia, recalculadas en vivo) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4d** - "Distribuir mi ingreso" se habilita solo al llegar la fecha del cobro (`estadoDistribucion` + `ultimoPagoHasta`) + nudge "Hoy recibes tu ingreso. ¿Deseas distribuirlo ahora?" + guard de de-duplicación por periodo (`S.config.ultimaDistribucionPeriodo`, revertible en el undo) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). Nota: persistir el mapeo de destinos preferidos quedó fuera de este slice (no se pidió en la tarea); si se quiere, abrir un MC.4d-2.
- ✅ **MC.4e** - Inversiones como destino fondeable: aporte incremental al capital del holding vía EventBus (`construirPlanInversiones` + suscriptor en `inversiones/index.js`), descuenta la cuenta, undo restaura el capital - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). **MC.4 completa (a-e).**

### Backlog del usuario "distribución inteligente + asistente guiado" (2026-06-29)

Visión nueva del usuario para evolucionar "Distribuir mi ingreso" como diferenciador. Ambas son épicas: requieren ADR antes de codear.

✅ **MC.6 (diseño)** - ADR 013 escrito: distribución "Automático inteligente". Decisiones con el usuario: alcance = sigue siendo distribución en 3 grupos pero con % calculados desde los datos reales (modelo de pisos por prioridad); duplicidad = Automático por defecto y los 3 presets fijos pasan a un grupo secundario "Métodos clásicos" - 2026-06-29. Ver [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md).

Slices de implementación de MC.6 (smallest-first, ver ADR 013):
✅ **MC.6a** - Modelo de pisos para distribución automática: `sugerirDistribucionIngreso` reescrita (pisos: Necesidades duro → Ahorro por prioridades → Estilo de vida residual con piso 10%). Nuevo helper puro `calcularAporteMensualObjetivos`. `view.js` computa 4 nuevos inputs desde S. 16 tests nuevos + 4 actualizados. 1617 → 1633 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
✅ **MC.6b** - Barra de presets: Automático + Personalizar en la fila principal; los 3 clásicos a `<details>` "Métodos clásicos" + copy de transparencia. SW v226 → v227 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).
- **MC.6c (opcional)** - Señales más ricas: historial de gastos variables (proxy de estilo de vida), inversiones como prioridad tras el fondo.
- **MC.7 (épica mayor, requiere ADR)** - Convertir "Distribuir mi ingreso" en un asistente guiado de 3 pasos: (1) **Necesidades** itemizadas automáticamente (gastos fijos, cuotas de deuda, compromisos de Agenda) con nombre/categoría/valor; (2) **Ahorro** con aportes auto-calculados por objetivo según su meta y la frecuencia del ingreso (ej. meta de $5M a un año → cuánto por quincena), priorizando el fondo de emergencia con el excedente; (3) **Estilo de vida** repartido entre las cuentas activas / efectivo. El usuario solo revisa, ajusta y confirma. Construye sobre MC.4a-e.

✅ **MC.5 (diseño) = [ADR 017](DECISIONS/017-limites-centro-de-control.md).** Límites de gasto como centro de control de los 3 grupos. Decisiones cerradas con el usuario: (1) **enfoque** = diseño primero (ADR), luego slices; (2) **presupuesto por grupo** = sale de la distribución (MC.6), Límites solo hace seguimiento, cero datos nuevos ni schema; (3) **topes por categoría** = se conservan como el detalle del grupo Estilo de vida (no se migran). El ejecutado por grupo se deriva de los flujos del mes (Agenda + deudas → Necesidades; `gastosMes` → Estilo de vida; fondo + metas + apartados + inversiones → Ahorro), reusando `GRUPO_POR_SECCION` (ADR 014) y `sugerirDistribucionIngreso` (ADR 013). Sin schema nuevo en v1 - 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

Slices de implementación de MC.5 (smallest-first, ver ADR 017):
- **MC.5a** - `logic.js` puro: `resumenGrupos(asignado, ejecutado)` → `{asignado, ejecutado, restante, pct, estado}` por grupo, reusando los umbrales 75%/100%. Tests. Modelo: Sonnet 4.6 - Medio.
- **MC.5b** - Vista read-only del resumen de los 3 grupos arriba de Límites (asignado desde la distribución, ejecutado desde los flujos del mes); topes por categoría como detalle de Estilo de vida; estado vacío que guía a Mis cuentas si no hay ingreso. Modelo: Sonnet 4.6 - Alto.
- **MC.5c** - Desglose por item dentro de cada grupo (Necesidades por fijo/deuda, Ahorro por destino, Estilo de vida por categoría). Modelo: Sonnet 4.6 - Medio.
- **MC.5d** - Alertas y refuerzos inteligentes por grupo y por item (los ejemplos aprobados del usuario), puras en `logic.js`. Modelo: Sonnet 4.6 - Medio.
- **MC.5e (opcional)** - CTAs cruzados con Mis cuentas + copy de complementariedad + alinear el banner de propósito (EP.2). Modelo: Sonnet 4.6 - Bajo.

Nota: el asignado por grupo sale de la distribución, así que MC.5 se beneficia de resolver antes **MC.10/MC.11** (piso de ahorro + detección de déficit), aunque puede construirse sobre el modelo actual y afinar cuando esos entren.

### Backlog del usuario "Mis cuentas: ajustes a ingresos" (2026-06-29)

Seguimiento a las categorías de ingreso recién entregadas. Arrancar por el bug.

✅ **MC.8 (BUG)** - Corregido el cálculo del salario mínimo según la frecuencia: el salario mínimo se trata como ancla mensual y se divide por la frecuencia para pre-llenar el monto por período (helper puro `montoSalarioMinimoPorPeriodo`); la automatización ahora reacciona también al cambiar la frecuencia. 7 tests nuevos (incluye regresión). SW v208 → v209 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.9 (mejora UI)** - Iconografía en las categorías de ingresos: `CATEGORIA_INGRESO_EMOJI` en `constants.js` (12 categorías, mismo patrón que `CATEGORIA_EMOJI` de gastos); el selector del form y la lista de ingresos muestran el emoji junto al nombre. 6 tests nuevos (mapa completo + render del selector y la lista). SW v209 → v210 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

Pendientes previos del backlog (2026-06-28), independientes de lo anterior:
- ✅ Categorías predefinidas para Ingresos (12 categorías + automatización "Salario mínimo" con subsidio de transporte) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ Categorías predefinidas para Agenda (13 categorías de gastos fijos + emoji, schema v17) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ Categorías predefinidas para Deudas (12 tipos de obligación + emoji, schema v18) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). **Backlog "Mis cuentas: ajustes a ingresos" + las 3 categorías predefinidas completas.**

Pendientes no urgentes (mantenimiento):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.

**Mejora candidata (resumen V.8):** retroalimentación del usuario en el celular puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas (mencionado como opcional en ADR 008). Esperar feedback antes de iterar.

---

### Backlog del usuario "Explicar el propósito de cada sección" (2026-06-29)

**Visión.** Cada sección debe responder en pocos segundos una pregunta simple para el usuario nuevo: **¿qué problema me ayuda a resolver esta sección?**. Hoy las funciones son buenas pero alguien que entra por primera vez no entiende de inmediato para qué sirve cada apartado ni el beneficio que obtiene. La meta no es llenar la app de texto, sino dar un mensaje breve, cercano y fácil de entender que genere contexto, eduque y motive mejores hábitos. Finko no solo registra movimientos: también explica el propósito de cada herramienta.

**Tono obligatorio** (ADN regla 11 + estilo de escritura regla 7.1): voz "tú", cercano y profesional, sin jerga, "dinero" (no "plata"), cero guion largo. Estructura sugerida del mensaje: (1) una pregunta gancho que toca un dolor real, (2) una o dos frases que nombran el problema, (3) una frase de cómo Finko ayuda.

**Copy de referencia aprobado por el usuario (Apartados):**
> ¿Te ha pasado que, de un momento a otro, debes pagar el SOAT, comprar el alimento de tu mascota, reponer tus productos de aseo personal o cubrir otro gasto importante que no esperabas? Aunque son gastos previsibles, muchas veces olvidamos prepararnos y terminamos usando nuestros ahorros, aplazando metas o endeudándonos. Apartados te ayuda a evitarlo: destina una pequeña parte de tus ingresos para cada gasto futuro y, cuando llegue el momento de pagarlo, ya tendrás el dinero (o gran parte de él) disponible.

**Ideas de beneficio por sección (insumo del usuario, a pulir en EP.0):**
- **Gastos:** conocer en qué se va tu dinero y detectar hábitos que puedes mejorar.
- **Deudas:** la mejor estrategia para salir de ellas pagando menos intereses y en menos tiempo.
- **Metas:** convertir tus objetivos en un plan de ahorro alcanzable.
- **Ahorros:** crear un respaldo para imprevistos y construir estabilidad.
- **Agenda:** no olvidar pagos y evitar intereses por mora o recargos.
- **Límites de gasto:** controlar tus gastos antes de exceder el presupuesto que definiste.
- **Mis cuentas:** centralizar tus ingresos y organizar cómo distribuirlos de forma inteligente.
- **Análisis:** transformar tus movimientos en información clara para tomar mejores decisiones.

**Épica: requiere diseño antes de codear (introduce un patrón de UI transversal nuevo).**

Slices (smallest-first):

✅ **EP.0 (diseño) = [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md).** Patrón único reutilizable del banner de propósito. Decisiones cerradas con el usuario: (1) **ubicación** = banner colapsable arriba del contenido (debajo del `section__header`), visible tenga o no datos; (2) **persistencia** = se colapsa a una línea re-abrible, nunca se borra; estado por sección en `S.config.propositoColapsado` (lectura defensiva, **sin migración**), "reactivar todo" desde Ajustes; (3) **11 secciones** = las 10 núcleo + Personales (Dashboard y Calculadoras fuera); (4) **copy** = tres tiempos (pregunta gancho, problema, cómo Finko ayuda), 3-4 frases; (5) **a11y** = patrón disclosure, borde del color de la sección, AA, respeta `prefers-reduced-motion`. Incluye copy propuesto por sección. 2026-06-30. Ver [CHANGELOG](CHANGELOG.md).

- **EP.1 (piloto)** - Implementar el componente base reutilizable (helper en `ui/proposito.js` o infra) + mapa de copy (`PROPOSITOS_SECCION`) + persistencia del estado colapsado (`S.config.propositoColapsado`, lectura defensiva sin migración) + 2 data-actions (`colapsar-proposito`, `expandir-proposito`) + acción "reactivar" en Ajustes + slot en `index.html`, aplicado a la sección piloto **Apartados** (copy ya aprobado en ADR 016). Verificar el patrón en la app (desktop + móvil), a11y (disclosure) y tests de render. Modelo sugerido: Sonnet 4.6 - Medio (feature de un dominio siguiendo patrón nuevo, con tests).

- **EP.2 (grupo "Gastar bien")** - Copy + slot para: Gastos, Deudas, Agenda, Límites de gasto. Copy propuesto en ADR 016. Solo entrada de copy + slot + reuso del componente de EP.1. Modelo sugerido: Sonnet 4.6 - Bajo.

- **EP.3 (grupo "Crecer")** - Copy + slot para: Metas, Ahorro, Inversión. Copy propuesto en ADR 016. Modelo sugerido: Sonnet 4.6 - Bajo.

- **EP.4 (grupo "Organizar")** - Copy + slot para: Mis cuentas, Análisis, Personales. Copy propuesto en ADR 016. Modelo sugerido: Sonnet 4.6 - Bajo.

---

### Backlog del usuario "Visión de Apartados" (2026-06-29)

Visión del usuario para que Apartados tenga un propósito claro y diferenciado del resto: **"ahorrar poco a poco para gastos futuros que sabemos que llegarán, evitando que sean un golpe al bolsillo"**. Casos típicos: SOAT, revisión técnico-mecánica, impuesto predial, matrículas/semestre, renovación de documentos, regalos, mantenimiento del vehículo, cuido y arena de mascotas, aseo personal, vacaciones. Ejemplo guía: mantener perro y gato puede costar ~$420.000 cuando coinciden alimento y arena; si el usuario ya apartó $300.000, solo completa $120.000 y el golpe es mínimo.

✅ **AP.1** - Formulario de aporte unificado al selector de tarjetas compartido (`renderSelectorCuenta` + `resolverPagoConPreferida`): muestra el logo del banco y permite elegir una o varias cuentas, con reparto automático cuando una no alcanza, igual que Gastos/Abono/Pago. Reemplaza el `<select>` de texto plano; preserva el aporte como seguimiento cuando no hay cuentas activas. 4 tests de render nuevos. SW v212 → v213 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **AP.2** - `PLANTILLAS_APARTADO` ampliada de 9 a 15: Revisión técnico-mecánica, Impuesto predial (sin duplicar "Impuestos", que sigue siendo el genérico/vehículo), Matrícula o semestre, Renovación de documentos, Alimento para mascotas, Arena para gatos. Reordenada por afinidad (vehículo, impuestos/vivienda, mascotas, educación, regalos/vacaciones). 2 tests nuevos (15 plantillas, sin duplicados, cubre las 6 nuevas). SW v213 → v214 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

- **AP.3 (propósito) = EP.1** - El mensaje "¿qué problema resuelve Apartados?" es el piloto de la épica EP (ver backlog EP arriba). La filosofía y el ejemplo de mascotas son el insumo de copy ya aprobado. Depende de EP.0 (decidir el patrón del banner de propósito).

- **AP.4 (épica, requiere ADR)** - Recordatorios automáticos de aporte en Agenda al recibir el ingreso ("Hoy recibiste tu ingreso, recuerda apartar $X para el SOAT"). **Cuidar la duplicación:** "Distribuir mi ingreso" (MC.4) ya acredita el ingreso y reparte a los apartados al llegar el cobro, con nudge propio; y Apartados ya tiene nudge de proximidad (60 días). El ADR debe decidir si se extiende MC.4 o el nudge existente, o se crea un recordatorio nuevo en Agenda, sin solapar. Modelo: Opus 4.8 - Alto.

✅ **AP.5 (diseño) = AG.3** - Taxonomía de categorías de toda la app. **Absorbida en [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)** (ver AG.3 abajo), que cierra la identidad de cada sección, la regla de contexto para categorías compartidas y el mapeo sección → grupo. Implementación en slices TX.1-TX.5 - 2026-06-29.

### Backlog del usuario "Agenda + taxonomía de categorías" (2026-06-29)

Observaciones del usuario sobre la sección Agenda y, a partir de ahí, una propuesta de taxonomía de categorías para toda la app. El hilo conductor: que el usuario entienda de forma natural dónde registrar cada movimiento sin pensarlo dos veces, porque las categorías son la base de muchas funciones (análisis, límites de gasto, recomendaciones, distribución inteligente).

- **AG.1 (decisión + copy)** - Nombre de la sección: ¿**Agenda** o **Calendario**? El usuario se inclina por "Agenda" (transmite organizar compromisos y pagos futuros) frente a "Calendario" (suena a eventos o citas en general), pero quiere analizar cuál es más intuitivo. Entregable: decidir el término y, si cambia, renombrar etiqueta de nav + título de sección + copys. Sin lógica. Modelo: Sonnet 4.6 - Bajo (o Haiku si solo se confirma "Agenda" sin cambios).

- **AG.2 (mejora UI, posiblemente ya hecha)** - Iconografía a la izquierda del nombre en las categorías de Agenda, consistente con el resto de la app. **Verificar primero:** desde el schema v17 ya existe `CATEGORIA_AGENDA_EMOJI` y el emoji ya se renderiza en el selector del form (`agenda/view.js:376`) y en la lista (`agenda/view.js:284`), igual que MC.9 hizo para ingresos. Si el usuario ya lo ve, AG.2 está cerrada; si pide más prominencia o ícono SVG en vez de emoji, es un ajuste de placement. No abrir trabajo nuevo sin confirmar la brecha. Modelo: Sonnet 4.6 - Bajo.

✅ **AG.3 (diseño) = AP.5** - [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) escrito (unifica AG.3 + AP.5). Decisión central: **la sección define la intención y la categoría la refina**; el significado de un movimiento es el par (sección, categoría). Cada sección responde una pregunta distinta; una categoría puede vivir en varias secciones y la sección la desambigua (caso canónico: Mercado); consistencia mismo concepto ⇒ misma etiqueta/emoji; las funciones transversales mapean a los 3 grupos por sección. Sin schema. La curación concreta de catálogos queda en slices TX.1-TX.5 (a confirmar con el usuario) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

Slices de implementación de ADR 014 (smallest-first, a confirmar la curación):
✅ **TX.1** - `CATEGORIAS_AGENDA` curada: Mercado 🛒 (caso canónico de contexto, emoji consistente con Gastos) y Suscripciones 🔔 (bucket más amplio que Streaming). Longitud 13 → 15. 1607/1607 verdes. SW v220 → v221 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
✅ **TX.2** - `PLANTILLAS_APARTADO` curada: Cumpleaños 🎂 y Navidad 🎄 (después de "Regalos", antes de "Vacaciones"). 15 → 17 plantillas. 1607/1607 verdes. SW v221 → v222 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- **TX.3 (opcional)** - Gastos: agregar Café ☕ y Gastos hormiga 🐜 si el usuario los quiere explícitos. Modelo: Sonnet 4.6 - Bajo.
✅ **TX.4** - Guardarraíl de consistencia: 2 tests en `constants.test.js` que verifican que toda etiqueta compartida entre catálogos (Gastos, Agenda, Ingresos, Deudas, Apartados) usa el mismo emoji. Detecta hoy 6 compartidas: Mercado 🛒, Transporte 🚗, Servicios públicos 💡, Educación 📚, Mascotas 🐾, Arriendo 🏠. 1607 → 1609 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
✅ **TX.5** - Mapeo sección → grupo financiero: `GRUPOS_FINANCIEROS`, `LABEL_GRUPO_FINANCIERO`, `GRUPO_POR_SECCION` y `clasificarSeccionEnGrupo` en `constants.js`. 8 tests. 1609 → 1617 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
