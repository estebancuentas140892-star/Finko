# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-05 (feat(ui): MK.2, detección de marca por nombre en fijos, suscripciones y deudas)

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
| Tests unitarios + integración | 2088/2088 verdes |
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

### feat(ui): MK.2, detección de marca por nombre en fijos, suscripciones y deudas · 2026-07-05

Segunda fase del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md) (D4). Módulo nuevo `infra/marcas.js`: `resolverMarca(texto)` matchea aliases normalizados por palabra o frase completa (nunca substring) contra el catálogo nuevo `MARCAS` (24 marcas globales) y contra `BANCOS_CO` (bancos y billeteras, id como alias implícito); sin match, el consumidor cae a su ícono de categoría o tipo. Consumidores: detalle del día del Calendario (busca `descripcion` + `nota`, por el nombre automático de AG.4) y lista de Deudas ("Tarjeta Bancolombia" hereda la teja del banco). 17 glifos de **Simple Icons 16.25.0** (CC0, versión fijada, insertados por script); hallazgo D5: OpenAI, Amazon, Prime Video y Xbox ya no están en Simple Icons vigente, así que ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox entran con iniciales sobre su color. En Deudas, el badge de orden de la estrategia **ya no reemplaza al ícono**: se superpone reducido en la esquina (si no, la teja jamás se vería: casi toda deuda activa es "pagable"). `bancoAvatar()` ahora delega en `tejaMarca()`: render único de teja. 2088/2088 unit (+32, suite nueva `marcas`); 147/147 E2E. SW v307 → v308. **Pendiente: validación del usuario en su celular (glifos y badge superpuesto).**

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Catálogo `MARCAS` + campo `aliases` en `BANCOS_CO`. |
| `index.html` | 17 símbolos `b-*` (Simple Icons 16.25.0). |
| `modules/infra/marcas.js` | Módulo nuevo: `normalizarAlias`, `resolverMarca`, `tejaMarca`. |
| `modules/infra/bancos.js` | `bancoAvatar()` delega en `tejaMarca()`. |
| `modules/dominio/agenda/view.js`, `modules/dominio/compromisos/views/lista.js` | Teja de marca como ícono en ambas vistas. |
| `styles/components/atoms.css`, `styles/components/config.css` | Badge superpuesto + tinte apagado bajo la teja. |
| `tests/unit/marcas.test.js` (+`agenda`, `compromisos`) | Suite nueva (25) + 7 tests de integración. |
| `service-worker.js` | Precache de `marcas.js`; v307 → v308. |

---

### feat(ui): MK.1, teja de marca con glifos oficiales en Mis cuentas · 2026-07-04

Primera implementación del [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md). `BANCOS_CO` gana el campo opcional `simbolo` (id de `<symbol>` del sprite) y `bancoAvatar()` se convierte en la **teja de marca**: renderiza el glifo oficial si existe, o las iniciales como fallback, siempre sobre el color corporativo. La clase `.bank-avatar` se conserva (cero cambios en consumidores: Mis cuentas, picker de cuentas, hints de formularios). Glifos que entraron, bajo la **regla de fidelidad D5** (nunca inventar un logo de memoria): `b-nequi` (isotipo oficial verificado: cuadrado redondeado magenta #CA0080 sobre berenjena #200020; colores del catálogo corregidos desde el morado aproximado), `b-nubank` (path real de Simple Icons, CC0) y Efectivo reusa `i-saldo`. Bancolombia, Davivienda, DaviPlata y el resto quedan con iniciales: no hubo referencia vectorial confiable (DaviPlata es solo wordmark; Davivienda inaccesible), y cada glifo futuro es 1 `<symbol>` + 1 campo. Teja con hairline `--fk-border-subtle` para marcas oscuras en tema oscuro; guardarraíl nuevo: todo `simbolo` debe existir en el sprite. 2056/2056 unit (+13, suite `bancos`); 147/147 E2E. SW v306 → v307. **Pendiente: validación del usuario en su celular (calidad visual de los glifos).**

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | Campo `simbolo` en `BANCOS_CO` + colores oficiales de Nequi. |
| `index.html` | Símbolos `b-nequi` y `b-nubank` en el sprite (prefijo `b-*` nuevo). |
| `modules/infra/bancos.js` | `bancoAvatar()` renderiza glifo o iniciales (teja de marca). |
| `styles/components/nudges.css` | Tamaño del glifo (~62%) + hairline de la teja. |
| `tests/unit/bancos.test.js` | Suite nueva (13 tests): glifo/fallback/colores/guardarraíl del sprite. |
| `service-worker.js` | v306 → v307. |

---

### docs(adr): ADR 025, logotipos de marca y tejas unificadas · 2026-07-04

Replanteo de ID.3 pedido por el usuario: logotipos oficiales donde haya marca (Netflix, Spotify, Nequi, Bancolombia...), iconos donde no, todo como un solo sistema de diseño escalable. Análisis con verificación real de fuentes: Simple Icons (CC0) cubre las marcas globales pero **no** la banca colombiana (Nequi, Daviplata, Bancolombia, Davivienda, Banco de Bogotá y Rappi: 404 verificado archivo por archivo); esos glifos se dibujan propios en el mismo estilo. Decisión ([ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)): el unificador es la **teja** (contenedor único de 40/32px): marca = glifo monocromo sobre su color oficial (generaliza el patrón `BANCOS_CO`), categoría = Finko Icons v2 sobre tinte del dominio; resolución automática por catálogo `MARCAS` + aliases con fallback a categoría. Los emojis de celebración se conservan (D6). Tarjetas re-cortadas en BOARD: MK.1 (tejas + banca CO en Mis cuentas, prioridad alta), MK.2 (marcas globales por alias en fijos y deudas), ID.3 (categorías v2 en tejas). Solo docs, sin código: tests y SW sin cambios.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/025-logotipos-de-marca-y-tejas.md` | ADR nuevo (contexto, D1 a D6, alternativas, fases). |
| `docs/BOARD.md` | ID.3 re-cortada en MK.1 / MK.2 / ID.3; nota de iniciativa actualizada. |

---

### feat(nav): NAV.C, pulidos de navegación · 2026-07-04

Cierre de la iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D6). Tres pulidos acotados: (1) el toast del logro "Primer paso" ya no aparece al instante al completar el onboarding, ahora espera 4 segundos para no pisar el cierre del wizard, la guía del hero vacío ni una exploración inmediata de "Registrar" o "Más". (2) El grupo del sidebar desktop que había quedado con Análisis integrado tras disolver "Herramientas" (NAV.B) pasó de llamarse "Gestión" a **"Seguimiento"**: agrupa Mis cuentas, Me deben, Límites de gasto y Análisis, y "Gestión" no describía ese contenido (mismo motivo por el que el modal "Más" ya lo había retirado, ADR 024 D5). (3) El banner de propósito de Apartados excedía las 40 a 60 palabras de ADR 016 (83 palabras); se recortó a 58 manteniendo los tres tiempos (pregunta, problema, solución) y la mención al SOAT. 2043/2043 unit; 147/147 E2E (ajuste del texto esperado en `hub-ahorros.test.js`, sin tests nuevos). SW v305 → v306.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Retraso de 4s en el toast tras `onboarding:completado`. |
| `index.html` | Grupo del sidebar "Gestión" → "Seguimiento". |
| `modules/ui/proposito.js` | Banner de Apartados recortado de 83 a 58 palabras. |
| `tests/e2e/hub-ahorros.test.js` | Actualizado el nombre de grupo esperado. |
| `service-worker.js` | v305 → v306. |

---

### feat(nav): NAV.A2b slice 2, oferta de distribución tras un ingreso · 2026-07-04

Cierre de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D3). Tras registrar un ingreso puntual (que ya subió el saldo), Finko ofrece "¿Repartirlo ahora?"; al aceptar, abre el asistente "Distribuir mi ingreso" de Mis cuentas con el monto y la cuenta pre-cargados, en un **modo "ya acreditado"** nuevo. El problema que resolvía: `_confirmarDistribucion` hacía `saldo + monto - ...` asumiendo que el cobro recurrente aún no entró; como el ingreso puntual ya acreditó, eso duplicaba el abono. En el modo nuevo el asistente no re-acredita (`creditoIngreso = 0`), usa la cuenta del ingreso como origen (sin volver a preguntar) y no consume el periodo del ingreso recurrente. La oferta reusa el evento `distribuir:abrir` (mismo que el recordatorio del Calendario, ADR 021) con payload `preacreditado`, y solo aparece si el asistente existe (requiere un ingreso recurrente registrado). Modo de un solo uso: se limpia al confirmar o al abrir el asistente a mano. Verificado con E2E (no-doble-abono: saldo final correcto, no el doble). 2043/2043 unit; 147/147 E2E (+3, suite `registrar-distribucion`). SW v304 → v305. **Pendiente: validación del usuario en su celular.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | Estado `_distribucionPreacreditada`; oferta tras el ingreso; modo "ya acreditado" en `_confirmarDistribucion`; `_abrirAsistenteDistribucion` pre-carga monto; `distribuir:abrir` con payload. |
| `service-worker.js` | v304 → v305. |
| `tests/e2e/registrar-distribucion.test.js` | Suite nueva (3 tests): no-doble-abono, "Ahora no", gate sin ingreso recurrente. |

---

> Para tareas anteriores (feat(nav) NAV.A2b slice 1 Abono a deuda y Aporte a ahorro en la hoja "Registrar", feat(nav) NAV.B hub "Ahorros" con pestañas y consolidado, feat(nav) NAV.A2a bottom nav de 5 con botón central "Registrar", feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
