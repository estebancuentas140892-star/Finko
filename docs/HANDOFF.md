# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-08 (docs(triaje): 6.º lote, brief General, con la decisión de ADN de CFG.4 señalada)

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
| Tests unitarios + integración | 2265/2265 verdes |
| Tests E2E | 155/155 verde. Suites: `smoke` 87 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 7 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `registrar-sheet` 5 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests. |
| Schema version (localStorage) | v25 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(triaje): 6.º lote (brief General) integrado al BOARD, con decisión de ADN señalada (regla 2.7, sin implementar) · 2026-07-08

Sexto triaje del día, el de mayor alcance. **Cuentas de usuario + sync TOCA EL ADN** ("Sin servidor. Sin cuenta. Sin sync."): fusionado con **CFG.4**, que ahora captura la versión completa + lo que el ADR debe evaluar (redefinición del producto, backend/costos, alternativas locales-first cifradas, PERF.5 como precondición); nada se implementa sin esa discusión explícita. Seguridad → **CFG.5 ampliada** (re-auth en acciones críticas; "Restablecer" hoy solo pide confirmación de texto). Guía por navegación + simplificar info inicial → iniciativa **GU.1** (revisa el ADR 016; audita lo transversal, las secciones v2 aplican el principio). Transferencias entre cuentas → **MC.17** (historial como tipo propio en Movimientos, jamás ingreso/gasto; automatización 0/1/varias; decisión GMF). Actualizaciones → **UPD.1** (aviso del SW + novedades una vez, cero servidor). Hallazgo: el **ADR 014** (taxonomía transversal, Propuesta desde junio) se suma a la sesión única de taxonomía con ADR 029 D3 y CAT.1. Detalle en CHANGELOG y [`BOARD.md`](BOARD.md).

---

### docs(triaje): 5.º lote (Fondo de emergencia, Límites de gasto) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Quinto triaje del día. Fondo: "Empty State" literal en la UI → **BUG-012** (bug de copy, con pasada de grep por otros literales técnicos al corregirlo); rediseño UX + aporte por el flujo de distribución → iniciativa **AH.5** (la base ya existía: AH.2, ADR 021, MC.13 p.21; el registro manual se conserva como vía secundaria). Límites: **FUSIÓN en LIM.1** (el brief se solapaba casi 1:1 con el del 2026-07-05); solo entran como nuevos los puntos 7-10 (base de cálculo = dinero disponible, fijos no esenciales vía CAT.1/ADR 029 D3, hormiga/fantasma de suscripciones al motor único de sugerencias, límites adaptativos); nota formal: sacar Necesidades/Ahorro revisa parcialmente el ADR 019; análisis inicial sube a Opus 4.8 - Alto. Detalle en CHANGELOG, [`BOARD.md`](BOARD.md) y [BUGS.md](BUGS.md).

---

### docs(triaje): 4.º lote (Ajustes, Análisis, Apartados, Metas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Cuarto triaje del día, el más entrelazado. Ajustes: lo fiscal confirma y amplía la iniciativa CFG (nueva **CFG.2c**: asistente bajo demanda + interpretación en Análisis); rediseño visual → CFG.6; transición de temas → **CFG.7 con advertencia técnica** (la transición YA existe, restringida a propósito por lag móvil; dirección: View Transitions API + verificar en dispositivo real). Análisis: puntos de lenguaje/gráficos/layout → **ANL.1** (ya los registraba casi 1:1); logros → iniciativa **LG.2** (requiere ADR que revisa el 022; regla anti-gaming como principio: premiar hábitos, nunca omisión de registro). Apartados: iniciativa **AP.5** (filosofía redefinida: colchón de gastos esporádicos; form estándar, recurrencia toggle, aporte prellenado); sus categorías-que-son-Metas → **CAT.1 ampliada** (taxonomía global en una pasada). Metas: iniciativa **MT.6** (subcategorías = mismo patrón dos-niveles que entidad→producto, se decide UNA vez en ADR 029 D3; plan de aportes generado/recalculado). Motor de MC.13 renombrado a "vencimientos y aportes recomendados" (+2 consumidores); CAT.2 sube a 6 consumidores. Detalle en CHANGELOG y [`BOARD.md`](BOARD.md).

---

### docs(triaje): 3.er lote (Inicio, Calendario, Me deben) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Tercer triaje del día. Inicio: 0 tarjetas nuevas ("Gestionar"→Calendario entra a Inicio v2 como rebanada temprana; la identificación de prioridades amplía la spec de IV.2c con etiqueta de tipo además de icono+color). Calendario: **CAL.3** nueva (auto-selección del día actual + mensaje de día sin registros). Me deben: iniciativa **PE.6 "Me deben v2"** sobre la base de PE.1/PE.2-5 (intereses acumulados con desglose en "Me pagaron", historial de abonos con bump de schema, rendimiento, estados visuales con semánticos del ADR 031, estadísticas de confianza). Derivados: recordatorios → CFG.3 (personales como fuente); fecha default = hoy → CAT.4 (elevada por Esteban a regla de toda la app). Detalle en CHANGELOG y [`BOARD.md`](BOARD.md).

---

### docs(triaje): 2.º lote (Deudas y Mis Cuentas) integrado al BOARD (regla 2.7, sin implementar) · 2026-07-08

Segundo triaje del día: iniciativa **Deudas v2** (D.15: asesor de estrategias con recomendación según capacidad, copy motivador, editar deuda, tarjetas con jerarquía; D.14 como primera rebanada; **BUG-011** registrado: la simulación de estrategia queda aplicada sin confirmar), iniciativa **Mis Cuentas v2** (MC.13 ampliada a Distribución v2 con ingreso fijo→cuenta destino y sin paso "Estilo de vida"; MC.15 UI; MC.16 tarjeta de crédito integrada, requiere ADR, desbloquearía consumosTC de CFG.2a). Dos conflictos señalados sin revertir en silencio: ingresos esporádicos sin oferta de distribución (revierte parte de NAV.A2b/ADR 024) y el abono automático del ingreso fijo (va al MISMO ADR de PA.1). CAT.2 sube a 4 consumidores; nace CAT.4 (orden de formularios). Detalle en CHANGELOG y [`BOARD.md`](BOARD.md).

---

---

---

> Para tareas anteriores (docs(triaje) 1.er lote de 5 auditorías integrado al BOARD, docs(workflow) sección 2.7 triaje de tareas nuevas y rol de líder técnico, docs(adr) + feat(ui) IV.1 fundación de tokens de identidad de color por sección (ADR 031), perf(rendimiento) PERF.7d calcularEstadoRenta memoizada sin tocar config/index.js, perf(rendimiento) PERF.7b fold de hayResumen() en el bundle memoizado del resumen semanal, perf(rendimiento) PERF.7a Intl.DateTimeFormat cacheado en las vistas de lista, feat(config) CFG.1a situación laboral en el perfil, feat(agenda) CAL.2 leyenda del calendario dinámica, perf(analisis) PERF.3 diferir el cómputo del grupo colapsado de Análisis, perf(storage) PERF.4 ADR 030 persistencia: salvaguarda de cuota + diferir el rewrite, perf(rendimiento) PERF.2 memoizar derivaciones pesadas de Inicio y Análisis vía infra/memo.js, perf(movimientos) PERF.1 paginar por lotes la vista completa de Movimientos, refactor(gastos) IN.5 eliminar "Gasto rápido" y el subsistema de pendientes, feat(ux) CTA unificado "necesitas una cuenta" lleva directo a crear la cuenta, feat(gastos) TX.9b categorías personalizadas, feat(gastos) TX.9a categoría primero + descripción ya no obligatoria, feat(resumen) IN.4a accesos rápidos personalizables en Inicio, feat(movimientos) TX.8b vista completa de Movimientos + Gastos acota categorías internas, feat(movimientos) TX.8a dominio nuevo + Actividad reciente en Inicio, feat(tesoreria) CAL.1 nudge de distribución del ingreso en Inicio, feat(resumen) IN.6a saludo dinámico con nombre en Inicio, docs(adr) ADR 028 Inicio como centro de control aprobado, fix(resumen) IN.7 Próximas prioridades ya no duplica lo que vence hoy, docs(adr) BR.4 ADR 027 formaliza la excepción de logo a color, feat(assets) BR.3 completa los 11 bancos/billeteras de BANCOS_CO a color, feat(assets) BR.5 el sync normaliza exports crudos de Illustrator, fix(assets) contorno fantasma en logos a color por herencia CSS vía use, docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
