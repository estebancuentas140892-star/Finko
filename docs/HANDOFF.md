# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-13 (feat(transversal): CAT.2a selector compacto de ícono + migración de Gastos, TX.9b)

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
| Tests unitarios + integración | 2541/2541 verdes |
| Tests E2E | 183/183 verde. Suites: `smoke` 105 tests, `estrategia-pago` 21 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v26 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(transversal): CAT.2a selector compacto de ícono + migración de Gastos (TX.9b) · 2026-07-13

Primera rebanada de **CAT.2** (picker de icono compartido para "Otra categoría/entidad", 6 consumidores identificados en el brief 2026-07-08). Análisis hecho antes de codificar (primera ficha de la funcionalidad, `contexto/transversal.md`): los 6 consumidores NO parten del mismo punto (Gastos ya tenía categoría personalizada + grilla siempre visible; Deudas/Cuentas tienen "Otro" con ícono FIJO sin elección del usuario; Apartados/Metas usan un `<input>` de texto para pegar un emoji a mano; Fijo/Calendario no tiene ni categoría personalizada). Re-cortada en **CAT.2a-f**, una por dominio. Esta rebanada: **componente compartido nuevo `infra/icon-picker.js`** (`renderIconoPicker`/`wireIconoPicker`): un recuadro que muestra el ícono elegido (o un placeholder vacío) y, al tocarlo, despliega una grilla colapsable; elegir un ícono la cierra de nuevo. Sin modal anidado a propósito (mismo criterio original de TX.9b): un panel dentro del mismo formulario, evitando además el bug latente de foco anidado que ya existe en los pickers de `cuenta-helper.js` (`trapFocus`/`releaseFocus` son singleton, no una pila; documentado como riesgo, no corregido, fuera de alcance). **Gastos (TX.9b) migrado** como primer consumidor: la grilla de 29 íconos ya no se muestra siempre al elegir "+ Otra categoría", solo al tocar el recuadro. Sin cambios de schema ni de lógica de negocio (`validarCategoriaPersonalizada` intacta). 8 tests unitarios nuevos (`icon-picker.test.js`) + 1 en `gastos.test.js`; E2E `smoke.test.js` (TX.9b) actualizado al nuevo flujo (tocar el recuadro antes de elegir ícono). 2541/2541 unit + **183/183 E2E completos** + lint verdes. SW v374→v375.

---

### feat(compromisos): D.15a copy de simulaciones + refuerzo en Abonar, cierra Deudas v2 completa · 2026-07-13

Última pieza de la iniciativa "Deudas v2: de registro a asesor" (brief 2026-07-08): con esta rebanada **la iniciativa completa queda cerrada** (D.15a-e + rediseño visual D.16a-d). Solo copy, sin cambios de lógica ni schema. (1) **Simulaciones de orden**: Avalancha gana la frase "Te conviene si tu prioridad es pagar lo menos posible", en paralelo a Bola de nieve, que ya tenía su "cuándo conviene". (2) **Las 3 palancas** (Aumentar/Renegociar/Consolidar) suman "Explora libremente: nada cambia hasta que confirmes", reforzando en copy lo que BUG-011 ya garantiza en lógica: ninguna simulación se aplica sola. (3) **Refuerzo psicológico en Abonar**: línea estática nueva ("Cada abono, grande o pequeño, es un paso real hacia quedar libre de esta deuda") + el tip en vivo bajo el monto (`_actualizarTipProyeccion`) reescrito para nunca dejar el campo vacío: mensaje más fuerte cuando el abono salda la deuda por completo, el ya existente "termina X antes" cuando hay cuota y adelanta meses, y un refuerzo genérico para deudas sin cuota fija (Fiado, D.13) o abonos que no adelantan un mes. Tono ADR 003/008: afirma progreso real, sin presión ni comparación (nunca "deberías" o cuenta regresiva). 3 tests unitarios + 4 E2E nuevos. 2528/2528 unit + 21/21 E2E `estrategia-pago` + lint verdes. SW v373→v374.

---

### feat(compromisos): D.15b editar deuda + reorden del form, cierra Deudas v2 salvo D.15a · 2026-07-13

Tercera pieza de la iniciativa Deudas v2 (independiente de D.15d): (1) **trigger de editar** en la `.deuda-card` (`i-edit`, `.btn-icon`), disponible en deuda activa y saldada; usa la acción `editar-compromiso` ya registrada (el flujo `_editarCompromiso` + `renderFormDeuda(tipo, deuda)` ya existía y prellenaba, solo faltaba el botón visible). (2) **Formulario reordenado**: categoría/tipo de deuda va antes que la descripción (mismo patrón que TX.9a en Gastos; consistente con la regla transversal de CAT.4). (3) **Hint de bajo valor retirado**: "Si es una tienda o comercio que te fía, elige Fiado" (Fiado ya está en el propio selector de categoría); el hint de tasa desconocida (D.12) se conserva íntegro. Sin cambios de lógica de negocio ni de schema. Con esto **la iniciativa Deudas v2 queda completa salvo D.15a** (solo copy, pendiente e independiente). 5 tests unitarios nuevos. 2525/2525 unit + 17/17 E2E `estrategia-pago` + lint verdes. SW v372→v373.

---

### feat(compromisos): D.16d tarjeta de deuda con chips + máscara + empty state, cierra D.16 completa · 2026-07-12

Última rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md), handoff de Claude Design `Deudas v2.dc.html`): la iniciativa D.16 completa (a hero, b picker/comparativa, c acelerador/panel en 2 capas, d tarjeta) quedó en producción el mismo día del handoff. Absorbe D.15c. Cada deuda pasa a tarjeta `.deuda-card`: teja 44px con badge de orden superpuesto (conserva el accent: blanco sobre frambuesa no pasa AA a 10px), saldo prominente enmascarable, chips de categoría (tinte por dominio) y tasa, callout ámbar de tasa desconocida, Abonar con tinte de compromisos (no verde: un abono no es un ingreso) y eliminar ghost→danger. Encabezado "Tus deudas · Orden X" solo con estrategia elegida. Flujos ADR 002 sin cambios de wiring. 7 tests unitarios nuevos + 5 actualizados. 2502/2502 unit + **179/179 E2E completos** + lint verdes (gate final de la serie). SW v369→v370.

---

### feat(compromisos): D.16c acelerador + panel inviable en 2 capas · 2026-07-12

Tercera rebanada del rediseño visual de Deudas ([ADR 036](DECISIONS/036-deudas-v2-visual.md)); materializa la capa visual de D.15a punto 1 (ADR 031: la alarma señala, la solución calma). Acelerador como sub-card inset con impacto en callout de éxito; el danger queda SOLO en el botón de alerta y el panel interior pasa a neutros (solo el título del diagnóstico conserva el rojo); selector de alternativas como tiles verticales con ícono (Renegociar estrena `i-handshake`); emojis 🎯🤝🏦🔒 fuera. Fix real de la pasada: los botones Aplicar usaban la clase inexistente `btn--primary` y se veían sin estilo primario. Cero cambios de lógica (BUG-011 intacto). 4 tests unitarios nuevos. 2495/2495 unit + 17/17 E2E `estrategia-pago` + lint verdes. SW v368→v369.

---

> Para tareas anteriores (feat(compromisos) D.15d-2 las 3 palancas a primer plano en la vista absorbe D.15e, feat(compromisos) D.15d-1 motor puro recomendarPalanca + estimarSalarioMensual a infra, feat(compromisos) D.16b picker de estrategia con identidad de sección + comparativa como callout, feat(compromisos) D.16a hero con el total de deuda + ojo de privacidad, feat(ui) MC.17e teja "Transferir" en la hoja Registrar cierra MC.17 completa, feat(tesoreria) MC.17d GMF del retiro en la transferencia, feat(movimientos) MC.17c transferencia en el ledger de Movimientos con tipo neutro, feat(tesoreria) MC.17b formulario + acción de transferir entre cuentas, feat(tesoreria) MC.17a fundación de datos + lógica pura de transferencias, feat(tesoreria) MC.18d fuentes de ingreso agrupadas, feat(tesoreria) MC.18c GMF como tarjeta insight integrada, feat(tesoreria) MC.18b tarjetas de cuenta con saldo prominente y chips de metadatos, feat(tesoreria) MC.18a hero con total en cuentas + ojo de privacidad + composición, feat(logros) LG.2c constancia de registro + familia deudas saldadas, feat(ui) IN.8g fusión accesos rápidos + actividad reciente cierra "Inicio v2", feat(tesoreria) MC.15c aviso de cuota de manejo + MC.15d orden categoría→descripción, feat(resumen) IN.8f resumen semanal visual con serie diaria + barras + chip comparativo, feat(compromisos) IN.8e Pendientes del mes sin línea roja + Gestionar a Calendario, feat(ui) IN.8d header de perfil con avatar de iniciales + saludo en dos líneas, feat(ui) IN.8c detalle por cuenta expandible en el hero + máscara extendida, feat(ui) IN.8b hero con saldo protagonista + ojo estable + piloto visual ADR 033, feat(ui) IN.8a reorden del dashboard + labels de grupo + aire, docs(adr) IN.8 fase de análisis, ADR 034 Inicio v2 escrito + iniciativa re-cortada, fix(ahorro) BUG-012 lenguaje humano al desactivar el fondo de emergencia, feat(tesoreria) MC.15a menos redundancia en tarjetas de cuenta e ingreso fijo, fix(compromisos) BUG-011 la simulación de estrategia ya no se presenta como aplicada, feat(tesoreria) MC.14 datos de transferencia por cuenta, feat(agenda) CAL.3 selección automática del día actual al entrar al Calendario, feat(compromisos) D.14 registrar una deuda acredita la cuenta donde se recibió el dinero, fix(analisis) IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031), docs(adr) DV.1 ADR 033 Dirección Visual premium escrito, feat(ui) IV.2c Calendario + Inicio cierra IV.2 completa, feat(ui) IV.2b barras/anillos de progreso por dominio, fix(ui) IV.2d migración de -text + cierre de la franja de modales, feat(ui) IV.2a nav + encabezados de sección teñidos por dominio, docs(triaje) 8.º lote Nueva dirección de diseño integrado al BOARD, feat(logros) LG.2b fundación de progresión de logros, docs(adr) LG.2a ADR 032 Logros v2 escrito, feat(config) LEG.1 Centro Legal en Ajustes, fix(legal) LEG.3 auditoría de avisos en funciones sensibles, docs(legal) LEG.1 rebanada de borradores del paquete legal local-only en docs/legal/, docs(triaje) 7.º lote Centro Legal y cumplimiento integrado al BOARD, docs(triaje) 5.º lote Fondo de emergencia y Límites de gasto integrado al BOARD, docs(triaje) 6.º lote brief General integrado al BOARD con decisión de ADN señalada, docs(triaje) 4.º lote Ajustes, Análisis, Apartados y Metas integrado al BOARD, docs(triaje) 3.er lote Inicio, Calendario y Me deben integrado al BOARD, docs(triaje) 2.º lote Deudas y Mis Cuentas integrado al BOARD, docs(triaje) 1.er lote de 5 auditorías integrado al BOARD, docs(workflow) sección 2.7 triaje de tareas nuevas y rol de líder técnico, docs(adr) + feat(ui) IV.1 fundación de tokens de identidad de color por sección (ADR 031), perf(rendimiento) PERF.7d calcularEstadoRenta memoizada sin tocar config/index.js, perf(rendimiento) PERF.7b fold de hayResumen() en el bundle memoizado del resumen semanal, perf(rendimiento) PERF.7a Intl.DateTimeFormat cacheado en las vistas de lista, feat(config) CFG.1a situación laboral en el perfil, feat(agenda) CAL.2 leyenda del calendario dinámica, perf(analisis) PERF.3 diferir el cómputo del grupo colapsado de Análisis, perf(storage) PERF.4 ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite, perf(rendimiento) PERF.2 memoizar derivaciones pesadas de Inicio y Análisis vía infra/memo.js, perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
