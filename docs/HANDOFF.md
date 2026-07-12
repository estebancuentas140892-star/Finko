# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-12 (feat(tesoreria): MC.18d fuentes de ingreso agrupadas)

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
| Tests unitarios + integración | 2410/2410 verdes |
| Tests E2E | 174/174 verde. Suites: `smoke` 100 tests, `estrategia-pago` 17 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v25 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(tesoreria): MC.18d fuentes de ingreso agrupadas · 2026-07-12

Cuarta rebanada de "Mis cuentas v2" ([ADR 035](DECISIONS/035-mis-cuentas-v2.md) D7). Los dos sub-encabezados independientes ("Mis ingresos fijos" / "Otros ingresos") se fusionan en uno solo "Fuentes de ingreso" con las dos acciones ("+ Fijo" / "+ Puntual") lado a lado (`.section__sub-actions` nuevo). Se mantuvieron los dos formularios/acciones existentes en vez de inventar un selector nuevo (resolución del CTA único que el mockup dejaba abierta). Ambas listas comparten el lenguaje visual de `.cuenta-card` (radio + sombra scoped por contenedor) y la máscara del ojo (D5) ya extendida a los montos de ingreso. 2 tests unitarios nuevos + 1 E2E. 2410/2410 unit + 174/174 E2E + lint verdes. SW v359 → v360. Sigue **MC.18e** (distribuir como tarjeta de entrada), última rebanada del rediseño.

---

### feat(tesoreria): MC.18c GMF como tarjeta insight integrada · 2026-07-12

Tercera rebanada de "Mis cuentas v2" ([ADR 035](DECISIONS/035-mis-cuentas-v2.md) D4). El indicador del 4x1000 deja el formato nudge suelto y pasa a tarjeta insight propia (`.gmf-insight`, tinte tesorería 7%/22%, teja de 30px con icono `%` fijo), pegada bajo la lista de cuentas (misma posición de antes). Copy y cálculo intactos (`calcularCostoGMF()`, `detectarNudgeGMF()` sin tocar). Contraste WCAG medido en ambos temas (título/detalle sobre el tinte, glifo sobre su teja). 2 tests unitarios nuevos + 1 E2E. 2408/2408 unit + 173/173 E2E + lint verdes. SW v358 → v359. Sigue **MC.18d** (fuentes de ingreso agrupadas).

---

### feat(tesoreria): MC.18b tarjetas de cuenta con saldo prominente y chips de metadatos · 2026-07-12

Segunda rebanada de "Mis cuentas v2" ([ADR 035](DECISIONS/035-mis-cuentas-v2.md) D2), absorbe MC.15b. `_renderCuentaItem()` pasa de `.list-item` con hints de emoji a `.cuenta-card`: teja 44px (mejora legibilidad de logos densos sin tocar los SVG oficiales) + nombre + tipo (`_tipoLabel()` nuevo: "Ahorros"/"Billetera digital"/"Dinero en efectivo", generaliza MC.15a) + saldo prominente en la misma fila + chips (cuota, GMF, transferencia) + editar/eliminar como ghost icons 32px (eliminar vira a danger en hover). Máscara del ojo (D5) extendida a los saldos por cuenta. Icono nuevo `i-key` publicado al sprite vía `scripts/sync-sprite.py`. 8 tests unitarios nuevos + 3 reescritos + 1 E2E. 2406/2406 unit + 172/172 E2E + lint verdes. SW v357 → v358. Sigue **MC.18c** (GMF como tarjeta insight integrada).

---

### feat(tesoreria): MC.18a hero con total en cuentas + ojo de privacidad + composición · 2026-07-12

Primera rebanada del rediseño "Mis cuentas v2" ([ADR 035](DECISIONS/035-mis-cuentas-v2.md), handoff de Claude Design aprobado por Esteban con D6 y D3 incluidas). Hero nuevo al tope de `#sec-tesoreria`: total en cuentas protagonista (`renderHeroTesoreria()`, `calcularTotalCuentas()` existente) + ojo de privacidad que comparte `S.config.ocultarSaldo` con Inicio (acción `tesoreria-saldo-visibilidad`) + barra de composición por cuenta (`composicionCuentas()`, `resumenCuentas()` puras nuevas) con resumen en texto. Degradado de identidad tesorería + sombra en reposo (segundo consumidor del piloto ADR 033), contraste AA medido en ambos temas. 8 tests unitarios nuevos + 1 E2E. 2403/2403 unit + 171/171 E2E + lint verdes. SW v356 → v357.

---

### feat(logros): LG.2c constancia de registro + familia deudas saldadas · 2026-07-12

Tercera rebanada de "Logros v2" ([ADR 032](DECISIONS/032-logros-v2-niveles-y-habitos.md) D3/D4). Dos derivaciones puras nuevas en `logros/logic.js`: `mesCompleto(gastos, mesISO)` (¿al menos 3 de las ~4.4 semanas del mes tuvieron gasto?) y `rachaMesesCompletos(gastos, hoyISO)` (racha de meses completos consecutivos, contada desde el mes anterior a hoy; el mes en curso nunca cuenta). 4 niveles nuevos de la familia "registro" (mes completo, 3/6/12 meses seguidos) y familia "deudas" nueva (`primera-deuda-saldada`, `tres-deudas-saldadas`: cuenta deudas en `saldoTotal === 0`, excluyendo las consolidadas, que se transforman en un crédito nuevo en vez de pagarse). Catálogo pasa de 11 a 17 logros. 24 tests unitarios nuevos + 1 E2E. 2391/2391 unit + 170/170 E2E + lint verdes. SW v354 → v355. Sigue **LG.2e** (familia comportamiento) o **LG.2d** (mudanza a Análisis, aún bloqueada por ANL.1).

---

> Para tareas anteriores (feat(ui) IN.8g fusión accesos rápidos + actividad reciente cierra "Inicio v2", feat(tesoreria) MC.15c aviso de cuota de manejo + MC.15d orden categoría→descripción, feat(resumen) IN.8f resumen semanal visual con serie diaria + barras + chip comparativo, feat(compromisos) IN.8e Pendientes del mes sin línea roja + Gestionar a Calendario, feat(ui) IN.8d header de perfil con avatar de iniciales + saludo en dos líneas, feat(ui) IN.8c detalle por cuenta expandible en el hero + máscara extendida, feat(ui) IN.8b hero con saldo protagonista + ojo estable + piloto visual ADR 033, feat(ui) IN.8a reorden del dashboard + labels de grupo + aire, docs(adr) IN.8 fase de análisis, ADR 034 Inicio v2 escrito + iniciativa re-cortada, fix(ahorro) BUG-012 lenguaje humano al desactivar el fondo de emergencia, feat(tesoreria) MC.15a menos redundancia en tarjetas de cuenta e ingreso fijo, fix(compromisos) BUG-011 la simulación de estrategia ya no se presenta como aplicada, feat(tesoreria) MC.14 datos de transferencia por cuenta, feat(agenda) CAL.3 selección automática del día actual al entrar al Calendario, feat(compromisos) D.14 registrar una deuda acredita la cuenta donde se recibió el dinero, fix(analisis) IV.3 "Vs mes anterior" ya no tiñe de rojo la subida de gasto (D5, ADR 031), docs(adr) DV.1 ADR 033 Dirección Visual premium escrito, feat(ui) IV.2c Calendario + Inicio cierra IV.2 completa, feat(ui) IV.2b barras/anillos de progreso por dominio, fix(ui) IV.2d migración de -text + cierre de la franja de modales, feat(ui) IV.2a nav + encabezados de sección teñidos por dominio, docs(triaje) 8.º lote Nueva dirección de diseño integrado al BOARD, feat(logros) LG.2b fundación de progresión de logros, docs(adr) LG.2a ADR 032 Logros v2 escrito, feat(config) LEG.1 Centro Legal en Ajustes, fix(legal) LEG.3 auditoría de avisos en funciones sensibles, docs(legal) LEG.1 rebanada de borradores del paquete legal local-only en docs/legal/, docs(triaje) 7.º lote Centro Legal y cumplimiento integrado al BOARD, docs(triaje) 5.º lote Fondo de emergencia y Límites de gasto integrado al BOARD, docs(triaje) 6.º lote brief General integrado al BOARD con decisión de ADN señalada, docs(triaje) 4.º lote Ajustes, Análisis, Apartados y Metas integrado al BOARD, docs(triaje) 3.er lote Inicio, Calendario y Me deben integrado al BOARD, docs(triaje) 2.º lote Deudas y Mis Cuentas integrado al BOARD, docs(triaje) 1.er lote de 5 auditorías integrado al BOARD, docs(workflow) sección 2.7 triaje de tareas nuevas y rol de líder técnico, docs(adr) + feat(ui) IV.1 fundación de tokens de identidad de color por sección (ADR 031), perf(rendimiento) PERF.7d calcularEstadoRenta memoizada sin tocar config/index.js, perf(rendimiento) PERF.7b fold de hayResumen() en el bundle memoizado del resumen semanal, perf(rendimiento) PERF.7a Intl.DateTimeFormat cacheado en las vistas de lista, feat(config) CFG.1a situación laboral en el perfil, feat(agenda) CAL.2 leyenda del calendario dinámica, perf(analisis) PERF.3 diferir el cómputo del grupo colapsado de Análisis, perf(storage) PERF.4 ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite, perf(rendimiento) PERF.2 memoizar derivaciones pesadas de Inicio y Análisis vía infra/memo.js, perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
