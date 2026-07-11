# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-10 (feat(agenda): CAL.3 selección automática del día actual al entrar al Calendario)

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
| Tests unitarios + integración | 2307/2307 verdes |
| Tests E2E | 162/162 verde. Suites: `smoke` 94 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v25 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(agenda): CAL.3 selección automática del día actual al entrar al Calendario · 2026-07-10

Cierra CAL.3. Al navegar hacia Calendario desde otra sección (`hashchange`), si hoy tiene compromisos/ingresos y no hay ningún día ya seleccionado, el detalle se auto-abre sin click (`marcarEntradaSeccion()`, flag de un solo uso; no se dispara por re-renders de `state:change` ni al navegar meses/días dentro de la sección). Segundo pedido de la tarjeta: se elimina la restricción "solo días con eventos son interactivos" en el grid (`_renderGrid()`), TODOS los días pasan a ser clickeables; seleccionar uno vacío ya no cierra el detalle en silencio, muestra "Sin compromisos ni ingresos este día". **Decisión de diseño clave, documentada en la ficha:** el auto-select NO se arma en la carga directa de la app en `#agenda` (deep-link/recarga), solo en la navegación real desde otra sección; de lo contrario los E2E existentes con `page.goto('/#agenda')` y `diaPago` fijo (15, 20...) podrían colisionar de forma intermitente con la fecha real de ejecución. 8 tests unitarios nuevos + 3 E2E nuevos (uno navega de verdad vía `.nav-item[href="#agenda"]` con `diaPago` calculado en el navegador para ser válido cualquier día). 2307/2307 unit + 162/162 E2E verdes. **El preview local de este entorno no cargó** (limitación ya documentada); verificado con la suite E2E real en Chromium headless. Ficha actualizada en [`contexto/calendario.md`](contexto/calendario.md).

---

### feat(compromisos): D.14 registrar una deuda acredita la cuenta donde se recibió el dinero · 2026-07-10

Cierra D.14, primera rebanada triada de la iniciativa "Deudas v2". Al crear una deuda (no al editar), si hay al menos una cuenta activa, se ofrece un checkbox opcional "Recibí este dinero en una de mis cuentas" (apagado por defecto: muchas deudas no entregan dinero directo, ej. tarjeta ya consumida, deuda vieja, crédito que paga a un tercero). Al activarlo se revela el selector de cuenta (reutiliza `renderSelectorCuenta()` de `cuenta-helper.js`, mismo componente que el ingreso puntual NAV.A1). Al guardar con cuenta elegida, se acredita `saldoTotal` completo a esa cuenta y se guarda `cuentaOrigenId` + `montoAcreditado` (copia inmutable, para revertir exacto si se elimina la deuda sin verse afectado por abonos posteriores). Sin bump de schema (campos opcionales, `undefined`-safe). 4 tests nuevos, 2299/2299 unit verdes, lint verde. **El preview local de este entorno no cargó** (limitación ya documentada); verificado por trazado de código contra el patrón ya probado de NAV.A1. Primera ficha de esta sección: [`contexto/deudas.md`](contexto/deudas.md).

---

### fix(analisis): IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031) · 2026-07-10

Cierra IV.3 (números y estados). La card "Vs mes anterior" de Análisis (`_renderComparacionCategorias()`, G.2) usaba `--fk-danger`/`--fk-danger-text` para el delta total, el fondo de fila y la columna de dirección cuando el gasto subía: exactamente lo que el criterio D5 del ADR 031 ("gastar no es incumplir", ADR 019) prohíbe, y que el resumen semanal (F8) y `_renderTendencia()` de la misma sección ya habían corregido en su momento. Esta card se había quedado fuera de esas pasadas. Corregido en `styles/components/analysis.css`: la subida queda en `--fk-text-primary` (neutro, sin fondo teñido); solo bajar el gasto conserva el refuerzo en verde. Los highlights ámbar ("empezaste a gastar en X") no se tocaron, no son rojo. CSS puro, sin JS ni markup. 2295/2295 unit verdes. **El preview local de este entorno no cargó** (limitación documentada); verificado por trazado de cascada CSS contra el código fuente. Ficha actualizada en [`contexto/analisis.md`](contexto/analisis.md).

---

### docs(adr): DV.1 ADR 033 Dirección Visual premium escrito (Propuesta) · 2026-07-10

Cierra DV.1 (el ADR era el entregable; cero código tocado). El [ADR 033](DECISIONS/033-direccion-visual-premium.md) define el sistema visual nuevo SOBRE el ADR 031: **elevación en 4 niveles** (hallazgo del análisis: las cards reposan planas de verdad, los tokens `--fk-shadow-*` solo se usan en hover/modales; en oscuro la profundidad la dan los escalones de fondo y la sombra en reposo rinde sobre todo en claro); **color secundario = rampa derivada del mismo matiz** (no un 2.º hue por sección, respeta el techo de ~8 identidades), materializada en `--fk-section-color` + `--fk-grad-identity` (2 paradas máx) sobre el mapeo `[data-dom]` existente; **decoración con presupuesto** (formas `d-*` neutras teñidas por dominio vía `currentColor`, patrón CSS tokenizado, ilustraciones `il-*` como clase nueva del pipeline ADR 026, Esteban diseña); **catálogo de movimiento cerrado** (150-250 ms, una vez, solo transform/opacity; se retiran los 2 bucles infinitos existentes `empty-orbit`/`empty-float`); y **resolución formal de la tensión de iconografía**: se ratifica el lenguaje único del ADR 023 (la "familia por sección" es metáfora + color, no 13 estilos). 5 preguntas abiertas (P1-P5) con recomendación esperan a Esteban; rebanadas DV.2a-d creadas en [`BOARD.md`](BOARD.md), ninguna se inicia sin la validación. Guardarraíles duros por rebanada: ambos temas, AA con cálculo real (método IV.1), Lighthouse 100, `pnpm perf` sin regresión, lista prohibida explícita (backdrop-filter, bucles, scroll-linked, multi-stop...).

---

### feat(ui): IV.2c Calendario + Inicio, cierra IV.2 completa (ADR 031) · 2026-07-10

Última rebanada de IV.2 (identidad de color por sección): cierra la iniciativa completa. Calendario: "fijo" pasa del amarillo prestado de Presupuesto al índigo propio de Calendario (`--fk-dom-agenda`) en las 4 superficies donde aparecía (dots, detalle del día, Pendientes del mes en Inicio); las tarjetas de evento del detalle del día abandonan la franja lateral de 3px y pasan a fondo teñido al 8%. Inicio: "Pendientes del mes"/"Próximas prioridades" ganan una etiqueta de tipo (`.dom-badge`); de paso se corrigió un bug real donde un apartado heredaba el color de "fijo" en vez del suyo propio (nuevo `.cal-dot--apartado`, familia menta). 1 E2E actualizado (verificaba franja lateral, ahora fondo teñido). 2295/2295 unit + 159/159 E2E verdes. SW v343 → v344. Fichas actualizadas en [`contexto/calendario.md`](contexto/calendario.md), [`contexto/inicio.md`](contexto/inicio.md) y [`contexto/transversal.md`](contexto/transversal.md).

---

---

> Para tareas anteriores (feat(ui) IV.2b barras/anillos de progreso por dominio, fix(ui) IV.2d migración de -text + cierre de la franja de modales, feat(ui) IV.2a nav + encabezados de sección teñidos por dominio, docs(triaje) 8.º lote Nueva dirección de diseño integrado al BOARD, feat(logros) LG.2b fundación de progresión de logros, docs(adr) LG.2a ADR 032 Logros v2 escrito, feat(config) LEG.1 Centro Legal en Ajustes, fix(legal) LEG.3 auditoría de avisos en funciones sensibles, docs(legal) LEG.1 rebanada de borradores del paquete legal local-only en docs/legal/, docs(triaje) 7.º lote Centro Legal y cumplimiento integrado al BOARD, docs(triaje) 5.º lote Fondo de emergencia y Límites de gasto integrado al BOARD, docs(triaje) 6.º lote brief General integrado al BOARD con decisión de ADN señalada, docs(triaje) 4.º lote Ajustes, Análisis, Apartados y Metas integrado al BOARD, docs(triaje) 3.er lote Inicio, Calendario y Me deben integrado al BOARD, docs(triaje) 2.º lote Deudas y Mis Cuentas integrado al BOARD, docs(triaje) 1.er lote de 5 auditorías integrado al BOARD, docs(workflow) sección 2.7 triaje de tareas nuevas y rol de líder técnico, docs(adr) + feat(ui) IV.1 fundación de tokens de identidad de color por sección (ADR 031), perf(rendimiento) PERF.7d calcularEstadoRenta memoizada sin tocar config/index.js, perf(rendimiento) PERF.7b fold de hayResumen() en el bundle memoizado del resumen semanal, perf(rendimiento) PERF.7a Intl.DateTimeFormat cacheado en las vistas de lista, feat(config) CFG.1a situación laboral en el perfil, feat(agenda) CAL.2 leyenda del calendario dinámica, perf(analisis) PERF.3 diferir el cómputo del grupo colapsado de Análisis, perf(storage) PERF.4 ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite, perf(rendimiento) PERF.2 memoizar derivaciones pesadas de Inicio y Análisis vía infra/memo.js, perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
