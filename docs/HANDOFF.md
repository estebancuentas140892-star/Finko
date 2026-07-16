# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-15 (refactor(tesoreria): MC.13e-1, un ingreso esporádico ya no ofrece distribuirlo, decisión (a) del ADR 041 confirmada)

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, tasa de usura, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 2829/2829 verdes |
| Tests E2E | 207/207 verde (MC.13e-1 reemplazó 1:1 los 3 tests de `registrar-distribucion.test.js`, mismo total). Suites: `smoke` 128 tests, `estrategia-pago` 21 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 8 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### refactor(tesoreria): MC.13e-1 un ingreso esporádico ya no ofrece distribuirlo · 2026-07-15

Decisión (a) del ADR 041 (Distribución v2), confirmada por Esteban antes de codificar (regla 2.7: no se revierte un ADR en silencio): un ingreso esporádico (puntual) ya NO ofrece un diálogo de "¿quieres repartirlo?" apenas se registra (revierte NAV.A2b s2 del ADR 024). `tesoreria/acciones/ingresos.js`: `_guardarIngresoPuntual()` deja de llamar a `_ofrecerDistribucion()`; esa función y `_hayAsistenteDistribucion()` se eliminan (sin otro caller). **El modo "ya acreditado" del asistente se eliminó entero, no solo su disparador**: al quedar sin caller, el parámetro `preacreditado` (`distribuir:abrir` → `abrirAsistenteDistribucion()` → `renderAsistenteDistribucion()`) y la variable `_distribucionPreacreditada` en `acciones/distribucion.js` (que hacía que `_confirmarDistribucion()` saltara `resolverCuenta`, no re-acreditara el monto y no marcara el período distribuido) quedaban 100% inalcanzables; se retiraron en la misma rebanada, misma decisión de producto. El asistente sigue accesible manualmente desde la tarjeta "Distribuir mi ingreso" de Mis cuentas (MC.18e), intacta. `tests/e2e/registrar-distribucion.test.js` se reescribió completo (3 tests: verificaban el modo eliminado, ahora verifican que ningún ingreso puntual abre el asistente y que el acceso manual sigue funcionando). Cierra el punto 7+19 del brief de MC.13; **queda MC.13e-2+** (el rediseño del asistente en sí, puntos 9-21), sin re-cortar todavía. 2829/2829 unit + 207/207 E2E + lint verdes. SW v404→v405.

---

### refactor(ui): TX.11 un solo switch para toda la app · 2026-07-15

Hallazgo de la verificación de FORM.1b: la app tenía **tres** componentes de switch para el mismo control (`.toggle` en `atoms.css`, sin consumidores; `.config-toggle` en `config.css`, vivo en Ajustes; `.toggle-switch` en `forms.css`, vivo en Deudas D.14). Consolidados en **uno solo**: `.toggle` de `atoms.css` (el que no tenía consumidores, así que migrarlo era riesgo cero), con `var(--fk-section-accent, var(--fk-accent))` en su estado marcado para heredar el tinte de dominio dentro de un `[data-dom]` (Deudas) y caer al acento neutro fuera de uno (Ajustes, sin cambio visual). `.config-toggle` y `.toggle-row` (forms.css) se conservan como los layouts que envuelven el switch (pill de Ajustes, fila label+hint de formularios), tal como recomendaba la tarjeta: no eran duplicados del switch, eran su complemento. `.config-toggle input[type="checkbox"]` y `.toggle-switch*` se eliminan por completo de sus respectivos CSS. `config/index.js` ajustó `toggle.parentElement` → `toggle.closest('.config-toggle')` (el input quedó un nivel más adentro). El E2E de tema pasó de clickear el input (ahora visualmente oculto dentro de `.toggle`) a clickear la etiqueta visible, mismo patrón que los chips de FORM.1/1a. Cero cambios de lógica ni de wiring por `id`. 3 tests unitarios nuevos + 1 E2E adaptado. 2829/2829 unit + 207/207 E2E + lint verdes. SW v403→v404.

---

### feat(forms): FORM.1c Nuevo gasto fijo con el lenguaje v2, cierra la iniciativa · 2026-07-15

Tercera y última rebanada de **Formularios v2** ([ADR 042](DECISIONS/042-formularios-v2-visual.md) D5): cierra la iniciativa completa (FORM.1a Registrar gasto, FORM.1b Nueva deuda, FORM.1c Nuevo gasto fijo). El form de gasto fijo adopta el lenguaje compartido: categoría en chips de ícono (grilla 3col por defecto, las 15 de `CATEGORIAS_AGENDA`, el picker CAT.2f para "Otro" intacto), monto en `.monto-hero` con el tinte índigo de agenda, frecuencia y día de pago comparten una fila nueva (`.form-row`, clase agregada a `forms.css`), y un banner informativo dinámico nuevo (`#gfijo-banner`, "Aparecerá cada X en tu calendario el día N") calculado por la función pura `textoBannerGastoFijo()`: sin día válido cierra con "el día que elijas" en vez de inventar una fecha, y "Única vez" no repite "cada". El modal ganó su `.modal__teja` (glifo `i-agenda`), que le faltaba a diferencia de los otros dos modales del lenguaje v2. Como la categoría deja de ser un único `<select>`, el wiring en `index.js` pasó a leer el radio marcado (`:checked`) y el listener quedó delegado en el `change` del form (mismo patrón que FORM.1a/1b). Cero cambios de lógica (`validarCompromiso`/`normalizarCompromiso` intactos, mismo contrato FormData). 10 tests unitarios nuevos/adaptados + 4 E2E adaptados de `#gfijo-categoria` (select) al helper `elegirChip()` + 1 E2E nuevo del banner. 2826/2826 unit + 207/207 E2E + lint verdes. SW v402→v403.

---

### feat(forms): FORM.1b Nueva deuda con el lenguaje v2 + el chooser de dos pasos desaparece · 2026-07-15

Segunda rebanada de **Formularios v2** ([ADR 042](DECISIONS/042-formularios-v2-visual.md) D4). El form de deuda adopta el lenguaje de FORM.1a y el **segmented Entidad/Personal pasa a vivir inline**, lo que **elimina el chooser de dos pasos** completo (JS y CSS: `renderChooserCompromiso`, `_mostrarChooser`, `_volverChooser`, la acción `comp-volver-chooser` y 89 líneas de `.comp-chooser*`). Chips de categoría 2col (picker CAT.2d intacto), monto hero frambuesa, disclosure "Condiciones del crédito" y toggle D.14. Cero lógica nueva. `_mostrarFormDeuda()` es ahora el **único punto de montaje** del form (crear, cambiar de tipo y editar), y el wiring de categoría pasó a `change` delegado porque `#comp-categoria` ya no existe. **Dos desvíos del plan, ambos documentados:** solo la **tasa** entró al colapsable (frecuencia y día son obligatorios y esconderlos generaba errores de validación silenciosos), y la verificación destapó dos defectos que la tarjeta no preveía. Uno **corregido aquí**: la perilla del toggle tenía `#fff` hardcodeado, el único color hardcodeado de todo `styles/`, y además contradecía el tema oscuro (el token del sistema, `--fk-text-on-accent`, es casi negro en oscuro). Otro **diferido con tarjeta**: el toggle se documentó como "el primer switch de la app" y es el **tercero** (`.toggle` en `atoms.css` es CSS muerto, `.config-toggle` vive en Ajustes) → **TX.11**. El pase `a11y-forms` salió flaky por una carrera preexistente del test (axe mide durante el fundido del modal; con opacidad 1 todo cumple AA y 6/6 repeticiones pasan) → **BUG-013**. 2818/2818 unit + 206/206 E2E + lint verdes. SW v401→v402.

---

### feat(tesoreria): MC.13d el ingreso fijo registra en qué cuenta se recibe (schema v27) · 2026-07-14

Cuarta rebanada de **MC.13** ([ADR 041](DECISIONS/041-motor-vencimientos-y-distribucion-v2.md) D5). Campo opcional `cuentaId` en `Ingreso`, **bump v26 → v27 con migración intencionalmente no-op** (precedente v4 → v5): los ingresos existentes quedan sin el campo y caen al comportamiento actual, sin backfill, porque adivinar la cuenta sería inventar un dato del usuario. El formulario aplica el patrón 0/1/varias: sin cuentas no pregunta, con una sola informa dónde cae el dinero y manda el id en un hidden, con varias muestra el selector **sin preseleccionar** (en un pago la cuenta de mayor saldo es un default razonable; en "dónde recibes tu sueldo" no hay default honesto). `renderSelectorCuenta` gana `preseleccionar: false` con default `true`, así que sus 8 consumidores no cambian. Es solo un dato: **no implica crédito automático**, eso es PA.1. 15 unit + 1 E2E nuevos (el E2E cubre el recorrido completo form → localStorage, que los unit no podían cubrir por separado). 2807/2807 unit + 206/206 E2E + lint verdes. SW v398→v399.

---

> Para tareas anteriores (feat(tesoreria) MC.13c-2 la checklist de Necesidades consume el motor cierra MC.7g, feat(forms) FORM.1a lenguaje de formularios v2 + Registrar gasto con monto hero y chips, feat(infra) MC.13c-1 obligacionesYAportesDelCobro la composición "qué toca con este cobro", refactor(infra) MC.13b motor de vencimientos mitad B + Metas y Apartados borran sus copias, feat(infra) MC.13a motor de vencimientos mitad A + Agenda lo consume, docs(triaje) MC.13 fase de análisis ADR 041 motor de vencimientos + Distribución v2, feat(nav) NAV2.1c pastilla "Registrar" con degradado + indicador fijo cierra Navegación v2 completa, feat(nav) NAV2.1b marca "F" con degradado en el sidebar + grupo diario sin rótulo, feat(nav) NAV2.1a menú "Más" como hoja agrupada con tejas de dominio + toggle de tema abre Navegación v2, feat(gastos) GAS.1c insight de gastos hormiga + empty states v2 cierra Gastos v2 completo, feat(gastos) GAS.1b lista agrupada por día + chips con identidad + máscara de montos, feat(gastos) GAS.1a hero del mes con total protagonista + comparativo + ojo abre Gastos v2 con el ADR 039, feat(analisis) ANL.2c "A dónde va tu dinero" tendencia con chip + categorías rankeadas, feat(analisis) ANL.2b patrimonio neto como card-héroe con composición + ojo, feat(analisis) ANL.2a score de salud como héroe + chip de mes abre Análisis v2 con el ADR 038, feat(agenda) CAL.4c detalle del día accionable cierra Calendario v2 completo, feat(agenda) CAL.4b grilla legible + selección índigo + empty state del mes, feat(agenda) CAL.4a hero del mes con total + progreso pagado + ojo abre Calendario v2 con el ADR 037, feat(apartados) CAT.1b plantillas de Apartados curadas según la taxonomía Apartados↔Metas, feat(gastos) CAT.1a Gastos ya no ofrece Vivienda ni Servicios públicos con hint retirado, docs(taxonomia) CAT.1 taxonomía global validada con Esteban ADR 014 aceptado y ADR 029 D3 confirmada, feat(transversal) CAT.2e selector de ícono en Mis cuentas quinto consumidor, feat(transversal) CAT.2d selector de ícono en Deudas cuarto consumidor, feat(transversal) CAT.2f selector de ícono en Gasto fijo/Calendario sexto consumidor cierra CAT.2 completa, feat(transversal) CAT.2c selector de ícono en Apartados tercer consumidor + primera cobertura E2E de la sección, feat(compromisos) D.15a copy de simulaciones + refuerzo en Abonar cierra Deudas v2 completa, feat(transversal) CAT.2b selector de ícono en Metas segundo consumidor + fix de locator ambiguo, feat(transversal) CAT.2a selector compacto de ícono + migración de Gastos (TX.9b), feat(compromisos) D.16c acelerador + panel inviable en 2 capas, feat(compromisos) D.16d tarjeta de deuda con chips + máscara + empty state cierra D.16 completa, feat(compromisos) D.15b editar deuda + reorden del form cierra Deudas v2 salvo D.15a, feat(compromisos) D.15d-2 las 3 palancas a primer plano en la vista absorbe D.15e, feat(compromisos) D.15d-1 motor puro recomendarPalanca + estimarSalarioMensual a infra, feat(compromisos) D.16b picker de estrategia con identidad de sección + comparativa como callout, feat(compromisos) D.16a hero con el total de deuda + ojo de privacidad, feat(ui) MC.17e teja "Transferir" en la hoja Registrar cierra MC.17 completa, feat(tesoreria) MC.17d GMF del retiro en la transferencia, feat(movimientos) MC.17c transferencia en el ledger de Movimientos con tipo neutro, feat(tesoreria) MC.17b formulario + acción de transferir entre cuentas, feat(tesoreria) MC.17a fundación de datos + lógica pura de transferencias, feat(tesoreria) MC.18d fuentes de ingreso agrupadas, feat(tesoreria) MC.18c GMF como tarjeta insight integrada, feat(tesoreria) MC.18b tarjetas de cuenta con saldo prominente y chips de metadatos, feat(tesoreria) MC.18a hero con total en cuentas + ojo de privacidad + composición, feat(logros) LG.2c constancia de registro + familia deudas saldadas, feat(ui) IN.8g fusión accesos rápidos + actividad reciente cierra "Inicio v2", feat(tesoreria) MC.15c aviso de cuota de manejo + MC.15d orden categoría→descripción, feat(resumen) IN.8f resumen semanal visual con serie diaria + barras + chip comparativo, feat(compromisos) IN.8e Pendientes del mes sin línea roja + Gestionar a Calendario, feat(ui) IN.8d header de perfil con avatar de iniciales + saludo en dos líneas, feat(ui) IN.8c detalle por cuenta expandible en el hero + máscara extendida, feat(ui) IN.8b hero con saldo protagonista + ojo estable + piloto visual ADR 033, feat(ui) IN.8a reorden del dashboard + labels de grupo + aire, docs(adr) IN.8 fase de análisis, ADR 034 Inicio v2 escrito + iniciativa re-cortada, fix(ahorro) BUG-012 lenguaje humano al desactivar el fondo de emergencia, feat(tesoreria) MC.15a menos redundancia en tarjetas de cuenta e ingreso fijo, fix(compromisos) BUG-011 la simulación de estrategia ya no se presenta como aplicada, feat(tesoreria) MC.14 datos de transferencia por cuenta, feat(agenda) CAL.3 selección automática del día actual al entrar al Calendario, feat(compromisos) D.14 registrar una deuda acredita la cuenta donde se recibió el dinero, fix(analisis) IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031), docs(adr) DV.1 ADR 033 Dirección Visual premium escrito, feat(ui) IV.2c Calendario + Inicio cierra IV.2 completa, feat(ui) IV.2b barras/anillos de progreso por dominio, fix(ui) IV.2d migración de -text + cierre de la franja de modales, feat(ui) IV.2a nav + encabezados de sección teñidos por dominio, docs(triaje) 8.º lote Nueva dirección de diseño integrado al BOARD, feat(logros) LG.2b fundación de progresión de logros, docs(adr) LG.2a ADR 032 Logros v2 escrito, feat(config) LEG.1 Centro Legal en Ajustes, fix(legal) LEG.3 auditoría de avisos en funciones sensibles, docs(legal) LEG.1 rebanada de borradores del paquete legal local-only en docs/legal/, docs(triaje) 7.º lote Centro Legal y cumplimiento integrado al BOARD, docs(triaje) 5.º lote Fondo de emergencia y Límites de gasto integrado al BOARD, docs(triaje) 6.º lote brief General integrado al BOARD con decisión de ADN señalada, docs(triaje) 4.º lote Ajustes, Análisis, Apartados y Metas integrado al BOARD, docs(triaje) 3.er lote Inicio, Calendario y Me deben integrado al BOARD, docs(triaje) 2.º lote Deudas y Mis Cuentas integrado al BOARD, docs(triaje) 1.er lote de 5 auditorías integrado al BOARD, docs(workflow) sección 2.7 triaje de tareas nuevas y rol de líder técnico, docs(adr) + feat(ui) IV.1 fundación de tokens de identidad de color por sección (ADR 031), perf(rendimiento) PERF.7d calcularEstadoRenta memoizada sin tocar config/index.js, perf(rendimiento) PERF.7b fold de hayResumen() en el bundle memoizado del resumen semanal, perf(rendimiento) PERF.7a Intl.DateTimeFormat cacheado en las vistas de lista, feat(config) CFG.1a situación laboral en el perfil, feat(agenda) CAL.2 leyenda del calendario dinámica, perf(analisis) PERF.3 diferir el cómputo del grupo colapsado de Análisis, perf(storage) PERF.4 ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite, perf(rendimiento) PERF.2 memoizar derivaciones pesadas de Inicio y Análisis vía infra/memo.js, perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100, cero deuda técnica conocida).

La lista completa y vigente de tareas de mantenimiento y features opcionales vive en [`docs/BOARD.md`](BOARD.md) (secciones "Mantenimiento" y por sección de la app). Esta sección solo guarda el procedimiento detallado de la tarea recurrente más delicada.

> **Importante para futuros desarrolladores:** Antes de instalar dependencias o configurar
> un nuevo entorno, leer [`docs/SECURITY.md`](SECURITY.md). Incluye política anti-malware npm,
> guía de migración a **pnpm** con defensas (`minimum-release-age`, `only-built-dependencies`),
> y el audit de seguridad realizado el 2026-05-18.

### Recordatorio enero 2027 - E.2-2027

> Desde la refactorización a tabla histórica, **no se crean exports `_2027`**: basta con agregar UNA entrada en `LEGAL_POR_ANIO`. Toda la app (UI, cálculos, tests) y el aviso de vigencia de P1 dejan de marcar "desactualizado" en cuanto la entrada existe.

**Qué hacer:**
1. Visita [DIAN UVT](https://www.dian.gov.co/) y [Mintrabajo SMMLV](https://www.mintrabajo.gov.co/)
2. Obtén los valores oficiales 2027 (SMMLV, auxilio de transporte, UVT) con sus decretos/resoluciones.
3. En `modules/core/constants.js`, reemplaza `2027: null` por una entrada completa:
   ```javascript
   2027: {
     smmlv:             <nuevo_valor>,
     auxilioTransporte: <nuevo_valor>,
     uvt:               <nuevo_valor>,
     vigenciaDesde: '2027-01-01',
     fuentes: { smmlv: '...', auxilio: '...', uvt: '...' },
   },
   ```
4. Tests (`pnpm test` → todo verde; incluye `tests/unit/constants.test.js`).
5. Bumpear `CACHE_NAME` en `service-worker.js`.
6. Commit: `feat(E.2): cargar SMMLV + auxilio + UVT 2027`
7. Push a main → auto-deploy a producción.

**Modelo:** Escribe tu `Próximo paso` con **Haiku 4.5** (búsqueda + cambio mecánico de una entrada).

---

## 5. Cómo trabajamos (workflow)

Workflow completo (una tarea a la vez, cierre de conversación, selección de modelo) en [`/CLAUDE.md`](../CLAUDE.md) sección 2. No se duplica acá para no desincronizarse.

---

## 6. Arquitectura en una línea por capa

```
core/        → state.js (singleton S), storage.js (save debounced), constants.js (CO legales)
infra/       → utils, render, a11y, crud, router, csv, svg, notificaciones
ui/          → bootstrap (entry point), shell, actions (delegación data-action), modales, onboarding
dominio/     → agenda, ahorro, analisis, apartados, calculadoras, compromisos,
               config, export, gastos, import, inversiones, logros, metas,
               movimientos, personales, presupuesto, resumen, tesoreria
```

Regla clave: **ningún dominio importa a otro** - comunicación exclusiva por `EventBus`.
Todo `logic.js` es sin DOM (testeable en Node). Todo `view.js` solo lee `S`, no lo muta.
Detalle completo en [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Cifras de tests actuales: ver sección 2 arriba.

---

## 7. Comandos rápidos

```bash
python -m http.server 8080   # Servir la app (ES6 modules requieren HTTP)
pnpm test                     # tests unitarios + integración (Vitest + happy-dom)
pnpm run test:e2e             # smoke tests Playwright
pnpm run coverage             # umbral 90% capa lógica
pnpm run lighthouse           # requiere servidor en :8080
pnpm perf                     # harness de rendimiento (scripts/perf/), no toca pnpm test
```
