# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (feat(assets): logos de marca a color, Bancolombia y Banco de Bogotá)

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
| Tests unitarios + integración | 2103/2103 verdes |
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

### feat(assets): logos de marca a color, Bancolombia y Banco de Bogotá · 2026-07-05

Arranque de BR.3 con los primeros logos de Esteban desde Illustrator. Decisión nueva: los logos **a color** (`data-fullcolor="true"`) son una excepción explícita a la silueta monocroma de ADR 025 para marcas cuya identidad ES el color. Bancolombia (bandera tricolor sobre blanco) y Banco de Bogotá (remolino con degradados sobre azul) entraron a color; su teja de catálogo se pinta del color de su propio fondo (`#ffffff` / `#003576`). `sync-sprite.py` se extendió para admitir `defs`/`linearGradient`/`stop` sin convertir colores, conservando el cuerpo byte a byte, y verifica unicidad global de IDs de gradiente (prefijados `bbog-*`). Se validó en el navegador que los degradados renderizan vía `<use>` desde el `<symbol>` a 16-72px en ambos temas. Nequi se probó como wordmark completo y se descartó (ilegible < 40px); mantiene su glifo monocromo hasta que Esteban aplique otro diseño. 2103/2103 unit; 147/147 E2E; lint limpio. SW v314 → v316. **Pendiente: formalizar la excepción de logo a color en un ADR (amendment de 025); resto de bancos siguen con iniciales.**

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{bancolombia,banco-bogota}.svg` | Logos a color (fondo + colores/degradados propios). |
| `scripts/sync-sprite.py` | Soporte `data-fullcolor` con degradados + unicidad de IDs internos. |
| `modules/core/constants.js` | Tejas `#ffffff` / `#003576` + `simbolo` para ambos. |
| `index.html` | Sprite regenerado (102 símbolos). |
| `tests/unit/{bancos,agenda,compromisos}.test.js` | Fixture "sin glifo" → Davivienda. |
| `service-worker.js` | v314 → v316. |

---

### feat(assets): BR.2, script de sincronización biblioteca → sprite · 2026-07-05

Segunda tarea de la biblioteca gráfica (tras BR.1). `scripts/sync-sprite.py` invierte la relación: recorre `assets/svg/` (prefijos `i-`/`c-`/`b-` por carpeta), excluye plantillas `data-placeholder`, convierte los colores centinela de Illustrator a los 3 roles finales, valida el estándar técnico y reescribe el bloque entre dos marcadores nuevos en `index.html` preservando el orden histórico de los ids (mínimo diff). Un archivo que no cumple el estándar se excluye sin bloquear la corrida (`ErrorRecurso`); el sync solo aborta sin escribir si borraría en silencio un símbolo ya publicado (`ErrorProduccion`). Normalización pendiente de BR.1 resuelta: `b-googlegemini` → `b-gemini`. Guardarraíl nuevo (`tests/unit/sprite-sync.test.js`, hermano de TX.4) vigila biblioteca ↔ sprite ↔ catálogos de marca. Hallazgo en el camino: `bancolombia.svg` ya tenía un export de prueba con los 3 colores reales de la marca (sin limpiar el estándar); el sync lo excluyó solo, sin intervención manual. Primera corrida: sprite idéntico salvo el rename de Gemini. 2097 → 2103 unit; 147/147 E2E; lint limpio. SW v313 → v314. **Pendiente: decidir con Esteban el tratamiento de logos multicolor (bandera de Bancolombia) antes de arrancar BR.3.**

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Nuevo: script de sincronización. |
| `index.html` | Marcadores del bloque generado; comentarios internos reubicados; `b-googlegemini` → `b-gemini`. |
| `modules/core/constants.js` | `MARCAS.gemini.simbolo` → `b-gemini`. |
| `tests/unit/sprite-sync.test.js` | Nuevo: guardarraíl biblioteca ↔ sprite ↔ catálogos. |
| `service-worker.js` | v313 → v314. |
| `docs/BOARD.md` | Tarjeta BR.2 cerrada y borrada. |

---

### refactor(compromisos): N.4, logic.js dividido en submódulos · 2026-07-05

Cierre del plan de navegabilidad (N.1 a N.4). `compromisos/logic.js` (1.517 líneas, el último archivo gigante del proyecto) quedó partido en 4 submódulos bajo `logic/`: `modelo.js` (tipos, tasas EA/mensual, consultas, validación y normalización), `alertas.js` (fijos sin pagar, deudas durmiendo, vencidos del dashboard), `estrategia.js` (simulaciones Avalancha/Bola de nieve, renegociación, consolidación, motor de recomendación, reparto del extra) y `abonos.js` (aritmética del ledger de abonos). `logic.js` quedó como barrel con los mismos 37 exports: crítico porque este dominio tiene consumidores externos reales (agenda, análisis e `infra/notificaciones.js` importan de aquí, excepción preexistente al ADN #10) que no cambiaron ni una línea. La vista ya estaba partida en `views/` desde antes; con esto el dominio queda simétrico al patrón de tesorería (N.3). Mismo método: script determinista por rangos de línea (los 4 bloques eran contiguos, sin renombres). 2097/2097 unit; 147/147 E2E (incluida la suite `estrategia-pago`, 15 tests sobre la lógica financiera movida); lint limpio. SW v312 → v313. **Pendiente: validación del usuario en su celular (Deudas: crear deuda, abonar, pestaña Estrategia; y la validación de Mis cuentas de N.3 sigue pendiente).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic/{modelo,alertas,estrategia,abonos}.js` | Nuevos: lógica pura por subsistema. |
| `modules/dominio/compromisos/logic.js` | Reescrito como barrel (1.517 → 66 líneas). |
| `service-worker.js` | 4 archivos nuevos al precache; v312 → v313. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Fila de compromisos actualizada. |
| `docs/BOARD.md` | Tarjeta N.4 cerrada y borrada. |

---

### refactor(tesoreria): N.3, dominio dividido en submódulos por subsistema · 2026-07-05

Segunda tarea del plan de navegabilidad (tras N.2). Los 3 archivos más grandes del proyecto (`tesoreria/logic.js` 1.557 líneas, `index.js` 1.521, `view.js` 1.099) se partieron por subsistema funcional en 9 submódulos: `logic/`, `views/` y `acciones/` con `cuentas.js`, `ingresos.js` y `distribucion.js` cada una. `logic.js` y `view.js` quedaron como barrels (la API pública no cambió: tests y consumidores importan igual que antes) e `index.js` como coordinador de 76 líneas. El estado mutable del asistente de distribución (snapshot de deshacer, modo "ya acreditado", timer del snackbar) viajó completo a `acciones/distribucion.js`, donde sigue siendo privado del módulo. `view.js` expone `renderTesoreria()` (el `_renderTodo` histórico) para renderSmart y los handlers de cuentas. Renombres mínimos: `_isoFecha` → `isoFecha` y `_FACTOR_MENSUAL` → `FACTOR_MENSUAL` (compartidos entre submódulos de logic), `_fechaCorta` → `fechaCorta` (entre views). El split se hizo con un script determinista por rangos de línea (cero retranscripción). Patrón nuevo documentado en ARCHITECTURE 2.4 y MAPA.md. 2097/2097 unit; 147/147 E2E (incluido el flujo `distribuir:abrir` end-to-end); lint limpio. SW v311 → v312 (9 archivos nuevos al precache). **Pendiente: validación del usuario en su celular (sección Mis cuentas completa: cuentas, ingresos y el asistente Distribuir).**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic/{cuentas,ingresos,distribucion}.js` | Nuevos: lógica pura por subsistema. |
| `modules/dominio/tesoreria/views/{cuentas,ingresos,distribucion}.js` | Nuevos: HTML por subsistema. |
| `modules/dominio/tesoreria/acciones/{cuentas,ingresos,distribucion}.js` | Nuevos: handlers por subsistema. |
| `modules/dominio/tesoreria/{logic,view}.js` | Reescritos como barrels (API idéntica). |
| `modules/dominio/tesoreria/index.js` | Reescrito como coordinador (1.521 → 76 líneas). |
| `service-worker.js` | 9 archivos nuevos al precache; v311 → v312. |
| `docs/ARCHITECTURE.md`, `docs/MAPA.md` | Patrón de corte por subsistema documentado. |
| `docs/BOARD.md` | Tarjeta N.4 (partir `compromisos/logic.js`) registrada como pendiente. |

---

### docs(mapa): N.2, mapa de navegación del código · 2026-07-05

Esteban pidió una reestructuración completa tipo `pages/` multipágina; se descartó (rompía la SPA, la PWA y los 47 archivos de test) y se tradujo a un plan de navegabilidad (N.1 a N.4). N.1 (partir `domain.css` por dominio) también se descartó al comprobar que todos los CSS de `styles/components/` agrupan por widget, no por dominio, a propósito (varios widgets como `banner-proposito` y `cuenta-picker` son compartidos entre secciones); forzar el split habría duplicado reglas. En su lugar, [`docs/MAPA.md`](MAPA.md) documenta sin tocar código: tabla sección visible → carpeta → archivos clave → estilos → test; por qué "Inicio" no tiene carpeta propia; índice de qué agrupa cada archivo CSS de `styles/components/`; y una tabla síntoma → dónde mirar para depurar rápido. De paso se corrigió una nota obsoleta en `ARCHITECTURE.md` que hablaba de dos carpetas de dominio vacías que ya no existen. Sin cambios de código: no aplica bump de SW ni tests.

| Archivo | Cambio |
|---|---|
| `docs/MAPA.md` | Nuevo: índice de navegación del código completo. |
| `docs/ARCHITECTURE.md` | Nota obsoleta de carpetas vacías reemplazada por puntero a MAPA.md. |
| `CLAUDE.md` | Sección 5 (lectura obligatoria): agregado MAPA.md como paso 5. |

---

> Para tareas anteriores (feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
