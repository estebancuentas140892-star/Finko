# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (fix(assets): contorno fantasma en logos a color por herencia CSS vía use)

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

### fix(assets): contorno fantasma en logos a color por herencia CSS vía use · 2026-07-05

Esteban reportó desde su celular que Banco de Bogotá mostraba un contorno blanco y Nequi un borde morado que se comía el acento rosa. Causa raíz: la clase `.icon` pone `fill:none; stroke:currentColor; stroke-width:2.35` en el `<svg>` anfitrión y esas propiedades **se heredan hacia adentro del `<use>`**; los paths de esos dos logos no declaraban `stroke` propio y recibían un contorno del color `texto` de la teja. Bancolombia no lo sufría (sus paths sí llevan `stroke="none"`). Fix en tres capas: `stroke="none"` en cada path de los dos archivos (cero cambio de formas o colores del diseño), el validador fullcolor de `sync-sprite.py` ahora exige `fill` y `stroke` explícitos en todo elemento pintable, y un guardarraíl nuevo en `sprite-sync.test.js`. Verificado por conteo de píxeles en canvas replicando la herencia: contorno blanco de BdB 4.587 px → 0; acento rosa de Nequi 30 px → 235. Reglas nuevas registradas: fidelidad absoluta (cero contornos/sombras/efectos agregados a un logo; el contraste se resuelve en el contenedor) y flujo de entrega (SVG siempre + PNG 512px de referencia opcional). Primera ficha de contexto creada: `docs/contexto/transversal.md`. 2104/2104 unit; 147/147 E2E; lint limpio. SW v318 → v319. **Pendiente: validación de Esteban en su celular (tejas de Nequi y Banco de Bogotá sin contorno).**

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{nequi,banco-bogota}.svg` | `stroke="none"` explícito en cada path (diseño intacto). |
| `scripts/sync-sprite.py` | Validador fullcolor exige fill y stroke explícitos en elementos pintables. |
| `tests/unit/sprite-sync.test.js` | Guardarraíl nuevo: logos a color con fill/stroke explícitos. |
| `assets/svg/README.md` | Sección 6b (estándar de logo a color) + PNG de referencia en el flujo. |
| `index.html` | Sprite regenerado (2 símbolos). |
| `service-worker.js` | v318 → v319. |
| `docs/contexto/transversal.md` | Nueva: primera ficha de contexto (tejas de marca y biblioteca gráfica). |

---

### feat(assets): BR.3, rediseño de Nequi a color + limpieza de exports crudos · 2026-07-05

Nequi cambió su wordmark descartado por un monograma "N" morado con acento rosa sobre blanco (mismo tratamiento a color que Bancolombia/Banco de Bogotá); llegó junto con un reexport ajustado de Banco de Bogotá. Ambos eran exports crudos de Illustrator; el de Banco de Bogotá traía además una imagen PNG de calco incrustada, tapada del todo por los paths vectoriales encima, retirada porque no cambiaba nada del render (regla nueva: los SVG de Esteban son la versión oficial, cero restilizado, solo limpieza técnica cuando el resultado es visualmente idéntico). Catálogo actualizado: Nequi pinta su teja del fondo blanco propio. Verificado en el navegador (picker de banco + lista de cuentas, ambas tejas correctas). 2103/2103 unit; 147/147 E2E; sync sin errores. SW v317 → v318.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/{nequi,banco-bogota}.svg` | Nequi a color (monograma); Banco de Bogotá limpio sin imagen de calco. |
| `modules/core/constants.js` | Nequi: teja pintada de su fondo blanco propio. |
| `index.html` | Sprite regenerado (2 símbolos). |
| `tests/unit/bancos.test.js` | Fixture de color actualizado. |
| `service-worker.js` | v317 → v318. |

---

### docs(workflow): metodología de contexto técnico por funcionalidad · 2026-07-05

Pedido del usuario: que la IA busque menos y resuelva más. Entra `docs/contexto/` (una ficha por sección de la app, un bloque por funcionalidad: objetivo, estado, dónde vive con anclas por función, recursos, dependencias, riesgos, cambios pendientes/realizados, y `Verificado contra` para detectar bloques viejos) y el workflow queda codificado en `CLAUDE.md`: consultar MAPA + ficha antes de analizar (solo re-explorar si no hay bloque o quedó desactualizado), análisis profundo una sola vez por funcionalidad (modelo de mayor capacidad si se justifica; después, el más eficiente que mantenga la calidad), ficha como paso 1 del cierre de docs, cero tarjetas duplicadas en el BOARD y división de tareas multi-capa en subtareas verificables de forma independiente. Las fichas nacen bajo demanda; no se pre-generan. Solo docs: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/contexto/README.md` | Nuevo: reglas de uso, plantilla de bloque, índice de 14 fichas. |
| `CLAUDE.md` | 2.6 nueva (contexto por funcionalidad); 2.1 (dividir/unificar); 2.4 (ficha paso 1); enlaces en secciones 0 y 5. |
| `docs/BOARD.md` | Paso "consultar ficha" + reglas de tarjetas (sin duplicados, dividir lo grande). |
| `docs/CHANGELOG.md` | Entrada de cierre. |

---

### feat(ui): escala de tokens de iconografía + fix de cascada @layer · 2026-07-05

Revisión completa del sistema de iconografía (legibilidad y accesibilidad, pedido del usuario). Dos hallazgos: no existía escala de tamaños (11 valores hardcodeados entre 14 y 56px en 9 archivos CSS) y un **bug de cascada preexistente**: `layout.css` vive en una capa `@layer` inferior a `components`, así que sus tamaños de icono (nav 22px, hero saldo 32px, accesos 18px) perdían contra el `.icon` base y **los tres contextos renderizaban a 20px**. Entró la escala `--fk-icon-*` (7 pasos, 16 a 48px) + `--fk-teja-*` en `tokens.css`, y el patrón `--fk-icon-size` (hermano de la chispa `--fk-icon-dot`): `.icon` lee la variable y cada contexto la declara, con lo que el tamaño atraviesa las capas. Ajustes por contexto: nav 24px (estándar M3/HIG), tejas de lista 32 → 36px, `.icon--sm` 14 → 16px (piso de nitidez del trazo), cerrar modal 20px, heroes 28px, nudges SVG 24px. Accesibilidad: `prefers-contrast: more` sube el trazo de toda la familia un paso (`a11y.css`). Rendimiento intacto (solo valores CSS). Tabla contexto → token en `DESIGN_SYSTEM.md`. 2103/2103 unit; 147/147 E2E; 15 chequeos de estilos computados en Chromium a 1280x800 y 390x844 más capturas revisadas. SW v316 → v317. **Pendiente: validación del usuario en su celular (bottom nav, lista de Gastos con tejas, hoja Registrar).**

| Archivo | Cambio |
|---|---|
| `styles/tokens.css` | Escala `--fk-icon-*` + `--fk-teja-*`. |
| `styles/components/forms.css` | `.icon` lee `--fk-icon-size`; `.icon--sm` 16px; cerrar modal 20px. |
| `styles/layout.css` | Nav 24px, hero 32px y accesos 20px vía variable (antes quedaban en 20px por la capa). |
| `styles/responsive.css` | FAB al patrón; `width: auto` móvil acotado al wrapper del FAB. |
| `styles/modals.css`, `styles/components/{atoms,nudges,domain,charts,analysis}.css` | Contextos al patrón de variable + ajustes de tamaño. |
| `styles/a11y.css` | Bloque `prefers-contrast: more`. |
| `docs/DESIGN_SYSTEM.md` | Sección "Escala de tamaños" con tabla contexto → token. |
| `service-worker.js` | v316 → v317. |

---

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

> Para tareas anteriores (feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
