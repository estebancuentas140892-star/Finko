# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (docs(mapa): N.2, mapa de navegación del código)

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
| Tests unitarios + integración | 2097/2097 verdes |
| Tests E2E | 147/147 verde. Suites: `smoke` 82 tests, `estrategia-pago` 15 tests, `ahorro-inversion` 9 tests, `hub-ahorros` 7 tests, `navegacion-render` 6 tests, `registrar-destinos` 6 tests, `install-prompt` 6 tests, `a11y-forms` 6 tests, `reflow-320` 4 tests, `registrar-distribucion` 3 tests, `registrar-sheet` 3 tests. |
| Schema version (localStorage) | v22 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### docs(mapa): N.2, mapa de navegación del código · 2026-07-05

Esteban pidió una reestructuración completa tipo `pages/` multipágina; se descartó (rompía la SPA, la PWA y los 47 archivos de test) y se tradujo a un plan de navegabilidad (N.1 a N.4). N.1 (partir `domain.css` por dominio) también se descartó al comprobar que todos los CSS de `styles/components/` agrupan por widget, no por dominio, a propósito (varios widgets como `banner-proposito` y `cuenta-picker` son compartidos entre secciones); forzar el split habría duplicado reglas. En su lugar, [`docs/MAPA.md`](MAPA.md) documenta sin tocar código: tabla sección visible → carpeta → archivos clave → estilos → test; por qué "Inicio" no tiene carpeta propia; índice de qué agrupa cada archivo CSS de `styles/components/`; y una tabla síntoma → dónde mirar para depurar rápido. De paso se corrigió una nota obsoleta en `ARCHITECTURE.md` que hablaba de dos carpetas de dominio vacías que ya no existen. Sin cambios de código: no aplica bump de SW ni tests.

| Archivo | Cambio |
|---|---|
| `docs/MAPA.md` | Nuevo: índice de navegación del código completo. |
| `docs/ARCHITECTURE.md` | Nota obsoleta de carpetas vacías reemplazada por puntero a MAPA.md. |
| `CLAUDE.md` | Sección 5 (lectura obligatoria): agregado MAPA.md como paso 5. |

---

### feat(assets): BR.1, biblioteca oficial de recursos gráficos · 2026-07-05

Pivote en el mantenimiento del sistema visual ([ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md)): Esteban diseñará personalmente los SVG en Illustrator, así que nace **`assets/svg/` como fuente de verdad de diseño**. Los 100 símbolos del sprite se extrajeron byte a byte a archivos individuales (`iconos/`: secciones 14, simbolos 13, utilitarios 11, categorias 43; `logos/`: 19 glifos en 8 subcarpetas por sector) más **17 plantillas `data-placeholder`** para los bancos CO y marcas que hoy caen a iniciales (la cola de diseño de Esteban). El estándar completo (retícula 24, área viva, roles de color trazo/duotono/chispa, checklist de exportación de Illustrator con colores centinela, flujo de revisión en pareja, recetas para agregar recursos) vive en [`assets/svg/README.md`](../assets/svg/README.md). **La app no cambia:** el sprite inline sigue siendo el mecanismo de entrega; BR.2 (`scripts/sync-sprite.py`, tarjeta en BOARD) invertirá la relación para que sobrescribir un archivo + correr el sync actualice la app. Sin bump de SW (ningún asset de runtime cambió). 2097/2097 unit; E2E no aplica.

| Archivo | Cambio |
|---|---|
| `assets/svg/**` | Biblioteca nueva: 117 SVG (100 extraídos + 17 plantillas) + README maestro + README de `ilustraciones/` e `identidad/`. |
| `docs/DECISIONS/026-biblioteca-de-recursos-graficos.md` | ADR nuevo: biblioteca como fuente de verdad, sprite como artefacto generado. |
| `docs/ARCHITECTURE.md` | Sección 8.1 reescrita (describía el híbrido emoji/SVG superado por los ADR 023/025) + puntero a la biblioteca. |
| `docs/BOARD.md` | Iniciativa nueva con tarjetas BR.2 (script de sync) y BR.3 (primer lote de glifos propios). |

---

### style(ui): ID.5, tracking del patrimonio alineado con el hero · 2026-07-05

Micropulido tipográfico opcional, último punto suelto de la iniciativa de identidad visual. `.patrimonio-hero__valor` (Análisis) tenía `-0.02em` de tracking mientras el hero del dashboard (`.bento__value--xl`) ya usa `-0.03em` desde ID.4; ambas son la cifra más grande de su pantalla, así que quedan calibradas igual. El eje óptico de Inter (`opsz`) ya funcionaba solo (`font-optical-sizing: auto` es el default, nada lo desactivaba). 2097/2097 unit sin cambios; sin E2E (CSS puro). SW v310 → v311.

| Archivo | Cambio |
|---|---|
| `styles/components/analysis.css` | Tracking de `.patrimonio-hero__valor` a -0.03em. |
| `service-worker.js` | v310 → v311. |

---

### feat(ui): ID.3, categorías Finko v2 en tejas por dominio · 2026-07-05

Cierre TOTAL de la iniciativa de identidad visual 2026-07 (ADR 023 + ADR 025). 43 símbolos nuevos `c-*` en lenguaje v2 cubren las 71 claves de los 6 catálogos; `CATEGORIA_*_EMOJI` → `CATEGORIA_*_ICONO` (categoría → id de sprite, con 5 reusos de `i-*`: i-home, i-deudas, i-percent, i-trending-up, i-ahorro). Teja de categoría nueva (`tejaCategoria` en infra/icons.js + `.cat-teja`): fondo `--fk-dom-*` al 14 %, glifo y chispa al 100 % del color del dominio. Superficies: listas de Gastos, Ingresos (ganan ícono), Deudas (teja de categoría como fallback sin marca) y detalle del Calendario; contextos inline densos (Límites, checklist, resumen, título de metas) usan `icon--sm` sin teja. Selects en texto plano. En Metas el emoji derivado ya no se almacena (la vista resuelve por categoría, metas viejas migran solas); el emoji manual de "Otra" y las plantillas de Apartados se conservan como dato del usuario. TX.4 compara ids de sprite y verifica que existan en el sprite. Verificado con renders de Chromium (43 glifos a 20/32px + filas reales con CSS de producción, ambos temas; 4 glifos iterados: cuidado, vecino, cafe, hormiga). 2097/2097 unit (+3); 147/147 E2E (3 asserts actualizados). SW v309 → v310. **Pendiente: validación del usuario en su celular.**

| Archivo | Cambio |
|---|---|
| `index.html` | 43 símbolos `c-*` nuevos en el sprite. |
| `modules/core/constants.js` | Catálogos `CATEGORIA_*_ICONO` (reemplazan a los de emoji). |
| `modules/infra/icons.js` | `iconoCategoria()` + `tejaCategoria()`. |
| `modules/dominio/{gastos,agenda,tesoreria,metas,compromisos,presupuesto,resumen}` | 10 consumidores migrados a teja / icon--sm / texto plano. |
| `styles/components/atoms.css`, `config.css` | `.cat-teja` por dominio; limpieza de clases emoji obsoletas. |
| `tests/unit/*` + `tests/e2e/smoke.test.js` | TX.4 con ids de sprite + guardarraíl de existencia; asserts a teja. |
| `service-worker.js` | v309 → v310. |

---

### feat(ui): ID.7, símbolos estructurales al lenguaje v2 · 2026-07-05

Cierre de la iniciativa de identidad visual 2026-07: los 13 símbolos de ID.2 (`saldo`, `recurring`, `lightbulb`, `alert`, `bolt`, `trophy`, `mountain`, `circle`, `star`, `percent`, `trending-up`, `info`, `bar-chart`) suben a duotono 22 % y chispa (`var(--fk-icon-dot, currentColor)`), que hasta ahora heredaban solo el trazo 2.35 pero conservaban la geometría v1. Aplicación explícita de la regla 5 del ADR 023 ("metáfora primero"): los picos de `i-mountain`, la punta de `i-bolt` y las 5 puntas de `i-star` se mantienen agudos (la geometría puntiaguda ES la metáfora, mismo criterio que dejó agudo el vértice central de la porción de `i-analisis` en ID.6); `i-saldo` y `i-star` no llevan punto de valor adicional (la propia forma ya es la firma). Redondez sistemática donde había una esquina incidental de contenedor: el triángulo de `i-alert` (radio 2 → 2.3), las asas de `i-trophy` (2.5 → 2.9, coincide con el piso de la regla 2) y las barras de `i-bar-chart` (rx 1 → 2, capsulas de extremo semicircular). Verificado renderizando los 13 símbolos aislados a 20px y 48px en ambos temas con el preview: ningún path quedó roto. Guardarraíl nuevo en tests: ningún símbolo recalentado conserva `fill-opacity=".15"`, todo punto de valor enciende la chispa salvo las dos excepciones documentadas, y mountain/bolt/star no usan comandos de arco en su silueta principal. 2094/2094 unit (+6); 147/147 E2E (sin tests nuevos, no hay lógica de dinero). SW v308 → v309. Cierra la iniciativa: solo queda ID.3 (categorías en tejas).

| Archivo | Cambio |
|---|---|
| `index.html` | 13 símbolos `i-*` recalentados a v2 (opacidad, chispa, radios); comentario del sprite actualizado. |
| `tests/unit/icons.test.js` | Suite nueva de guardarraíles del sprite (6 tests). |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | Sección "ID.7" documentando las decisiones de geometría. |
| `service-worker.js` | v308 → v309. |

---

> Para tareas anteriores (feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
               personales, presupuesto, resumen, tesoreria
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
```
