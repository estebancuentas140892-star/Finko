# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (fix(resumen): IN.7, Próximas prioridades ya no duplica lo que vence hoy)

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
| Tests unitarios + integración | 2106/2106 verdes |
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

### fix(resumen): IN.7, Próximas prioridades ya no duplica lo que vence hoy · 2026-07-05

Esteban entregó un lote grande de ideas nuevas para Inicio, Calendario, Gastos, Análisis, Límites y Ajustes (15 tarjetas registradas en `BOARD.md`: IN.4 a IN.7, CAL.1/CAL.2, TX.8 a TX.10, ANL.1, LIM.1, CFG.1 a CFG.6). Eligió empezar por el cluster de Inicio (mayor impacto: 5 tarjetas convergen ahí) y, dentro de ese cluster, por **IN.7** primero (el cambio más chico y de menor riesgo). Análisis exhaustivo previo (ficha nueva `docs/contexto/inicio.md`) confirmó la causa: `detectarVencidosCompletos()` (Pendientes del mes) y `compromisosProximos()` (Próximas prioridades) cuentan "vence hoy" como día 0 sin exclusión mutua, así que un mismo compromiso aparecía en ambos paneles. Fix acotado a la vista: `renderPanelPrioridades()` excluye `diasRestantes === 0` de los compromisos (ya cubiertos por Pendientes del mes) sin tocar `compromisosProximos()` en `logic.js` (otros consumidores, como el nudge de mora, siguen necesitando el día 0). Préstamos personales y apartados que vencen hoy siguen apareciendo en Próximas prioridades (no tienen panel de vencidos propio). Hallazgo relevante para el resto del cluster: hoy solo existe **1** acceso rápido en Inicio (Gasto rápido), no 3 como describía el brief original de IN.4. 2106/2106 unit (2 tests migrados + 2 de regresión nuevos); preview no disponible en este entorno (puerto ocupado por otra sesión), verificado por render happy-dom del DOM real del panel. SW v321 → v322.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelPrioridades()` filtra `diasRestantes > 0` en compromisos. |
| `tests/unit/compromisos.test.js` | `DIA_MANANA` nuevo; 3 tests migrados; 2 tests de regresión. |
| `docs/contexto/inicio.md` | Ficha nueva: mapa del dashboard, base del análisis conjunto IN.4/IN.6/CAL.1/TX.8. |
| `docs/BOARD.md` | IN.7 cerrada y borrada; resto del cluster sigue pendiente de análisis. |
| `service-worker.js` | v321 → v322. |

---

### docs(adr): BR.4, ADR 027 formaliza la excepción de logo a color · 2026-07-05

Cierre de la iniciativa Biblioteca de recursos gráficos. Esteban ya había decidido e implementado, sin ADR previo, que los logos donde el color ES la identidad (Bancolombia, Banco de Bogotá, Nequi, y después el resto de `BANCOS_CO` en BR.3) se implementaran a color completo (`data-fullcolor`) en vez de seguir la regla monocroma de ADR 025 D2. [ADR 027](DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md) formaliza esa deuda de proceso: cuándo aplica la excepción (D1, juicio humano), el marcado `data-fullcolor="true"` (D2), archivo autónomo conservado byte a byte sin conversión de colores (D3), color de teja igual al color del propio fondo del logo con el criterio de esquinas para degradados/mosaicos (D4), el guardarraíl de `fill`/`stroke` explícitos que previene el bug del contorno fantasma en cualquier fullcolor futuro (D5), IDs de degradado prefijados por slug (D6) y su convivencia con la fidelidad D5 de ADR 025 (D7). Con esto, la iniciativa (ADR 026 + ADR 027) queda **completa**: BR.1 a BR.5 sin pendientes. Solo docs: cero cambios de código, app intacta, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/027-logos-de-marca-a-color-excepcion-monocromo.md` | ADR nuevo: excepción de logo a color, D1 a D7. |
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | Línea "Estado" actualizada: referencia hacia ADR 027. |
| `docs/contexto/transversal.md` | Ficha actualizada: BR.4 de pendiente a realizado. |
| `docs/BOARD.md` | Tarjeta BR.4 borrada; iniciativa marcada **COMPLETA**. |

---

### feat(assets): BR.3 completa, los 11 bancos/billeteras de BANCOS_CO a color · 2026-07-05

Esteban entregó 9 bancos de un tirón (Davivienda, BBVA, Banco Popular, Scotiabank Colpatria, DaviPlata, Lulo Bank, Nubank, y 2 más en vivo mientras se integraban: Banco de Occidente y AV Villas). Con Bancolombia/Bogotá/Nequi ya cerrados, **BR.3 queda completa**: los 11 bancos/billeteras reales de `BANCOS_CO` tienen glifo a color; solo "Otro" (no es una entidad real) sigue con iniciales. Los 9 traían la misma imagen de calco incrustada que Banco de Bogotá; BR.5 (recién cerrada) limpió el envoltorio automáticamente, y la imagen se retiró con el mismo criterio ya aprobado. Ampliado el regex de degradados de BR.5 para reconocer el nombre en español de Illustrator (`Degradado_sin_nombre_N`), encontrado en DaviPlata y Davivienda. Banco de Occidente no tiene rect de fondo plano (mosaico de 5 polígonos); su color de teja (igual que DaviPlata/Davivienda) se eligió por coincidencia exacta en al menos 2 esquinas, verificado por muestreo de píxeles en canvas. 3 tests migrados (ya no queda ningún banco real sin glifo para el escenario "fallback de iniciales"; ahora usan "Otro" y "ChatGPT"). 2104/2104 unit; 147/147 E2E; lint limpio. SW v320 → v321.

| Archivo | Cambio |
|---|---|
| `assets/svg/logos/bancos/*.svg` | 9 logos a color nuevos, imagen de calco retirada. |
| `scripts/sync-sprite.py` | Degradados en español (`Degradado_sin_nombre_N`) + limpieza `data-name`. |
| `modules/core/constants.js` | 9 entradas de `BANCOS_CO` con `simbolo` + color real del logo. |
| `index.html` | Sprite: 110 símbolos. |
| `tests/unit/{agenda,bancos,compromisos}.test.js` | 3 fixtures migrados. |
| `service-worker.js` | v320 → v321. |

---

### feat(assets): BR.5, el sync normaliza exports crudos de Illustrator · 2026-07-05

`scripts/sync-sprite.py` ahora limpia automáticamente el envoltorio típico de un export crudo de Illustrator (declaración XML, `id="Capa_1"`, `version`, comentario del generador, `xlink:href` → `href`, `<g>` bare envolvente, IDs de degradado genéricos renombrados al prefijo del propio archivo) antes de validar, y reescribe el archivo limpio de vuelta en `assets/svg/`. Cierra la fricción de las dos limpiezas manuales que ya hicieron falta (Nequi, Banco de Bogotá). Deliberadamente NO automatiza `fill`/`stroke`/`data-fullcolor` (decisión humana) ni borra una `<image>` incrustada (la rechaza con mensaje explicando la causa probable). Probado con exports sintéticos + corrida real idempotente contra la biblioteca ya limpia. 2104/2104 unit; 147/147 E2E; lint limpio. SW v319 → v320.

| Archivo | Cambio |
|---|---|
| `scripts/sync-sprite.py` | Paso 0: normalización de exports crudos antes de validar. |
| `assets/svg/README.md` | Sección 7 actualizada: qué automatiza el sync vs. checklist manual. |
| `service-worker.js` | v319 → v320. |

---

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

---

> Para tareas anteriores (docs(workflow) metodología de contexto técnico por funcionalidad, feat(ui) escala de tokens de iconografía + fix de cascada @layer, feat(assets) BR.3 rediseño de Nequi a color + limpieza de exports crudos, feat(assets) logos de marca a color Bancolombia y Banco de Bogotá, feat(assets) BR.2 script de sincronización biblioteca → sprite, refactor(compromisos) N.4 logic.js dividido en submódulos, refactor(tesoreria) N.3 dominio dividido en submódulos por subsistema, docs(mapa) N.2 mapa de navegación del código, feat(assets) BR.1 biblioteca oficial de recursos gráficos, style(ui) ID.5 tracking del patrimonio alineado con el hero, feat(ui) ID.3 categorías Finko v2 en tejas por dominio, feat(ui) ID.7 símbolos estructurales al lenguaje v2, feat(ui) MK.2 detección de marca por nombre en fijos, suscripciones y deudas, feat(ui) MK.1 teja de marca con glifos oficiales en Mis cuentas, docs(adr) ADR 025 logotipos de marca y tejas unificadas, feat(nav) NAV.C pulidos de navegación con cierre del ADR 024, feat(nav) NAV.A2b slice 2 oferta de distribución tras un ingreso, feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
