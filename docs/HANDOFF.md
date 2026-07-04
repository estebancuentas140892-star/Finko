# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-04 (feat(nav): NAV.C, pulidos de navegación)

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
| Tests unitarios + integración | 2043/2043 verdes |
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

### feat(nav): NAV.A2b slice 1, Abono y Aporte en la hoja "Registrar" · 2026-07-04

Primer corte de NAV.A2b ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) D2). La hoja "Registrar" suma dos tejas condicionadas por los datos del usuario: **Abono a deuda** (si hay deuda activa con saldo) y **Aporte a ahorro** (si hay fondo activo, meta o apartado). Módulo nuevo `ui/registrar.js`: lee `S` directo sin importar dominios (regla ADN #10, como el consolidado) y reusa la acción built-in `registrar-abrir` inyectando el `data-id` del destino elegido, así cada flujo de dinero existente (abono, aporte a fondo/meta/apartado) corre igual que desde su sección y acredita/descuenta su cuenta como siempre. Patrón 0/1/varias: 0 destinos → sin teja; 1 → enruta directo; 2+ → selector "¿a cuál?" dentro de la misma hoja. El "+" pasa a la acción `registrar-abrir-hoja`, que reconstruye las tejas al abrir. Inversión queda fuera (no tiene aporte incremental). **Slice 2 (pendiente): la oferta de distribución tras un ingreso, que necesita el modo "ya acreditado" del asistente.** El preview quedó con caché de módulos envenenado; verificado con E2E (Chromium fresco): 2043/2043 unit (+6); 144/144 E2E (+6, suite `registrar-destinos`). SW v303 → v304. **Pendiente: validación del usuario en su celular.**

| Archivo | Cambio |
|---|---|
| `modules/ui/registrar.js` | Módulo nuevo: destinos (puro) + tejas dinámicas + selector "¿a cuál?". |
| `index.html`, `modules/ui/bootstrap.js` | Hoja con vista raíz/destino, "+" → `registrar-abrir-hoja`, `initRegistrar()`. |
| `styles/modals.css` | Tintes de las tejas Abono/Aporte + estilos del selector de destino. |
| `service-worker.js` | Precache de `registrar.js`; v303 → v304. |

---

### feat(nav): NAV.B, hub "Ahorros" con pestañas y consolidado · 2026-07-04

Tercera tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) (D4/D5/D6). "¿Dónde están mis ahorros?" pasa a tener una sola respuesta: tarjeta única "Ahorros" en el modal Más (que baja de 10 tarjetas en 3 grupos a 7 planas), franja de pestañas `Fondo · Metas · Apartados · Inversión` compartida por las 4 secciones (enlaces estáticos con `aria-current`, cero cambios de router, deep links intactos), y el consolidado de [ADR 009](DECISIONS/009-consolidado-de-ahorro.md) como cabecera común del hub (slots `[data-hub-consolidado]` en el shell; `ahorro/view.js` los llena y omite el enlace "Ver" de la sección actual). La sección "Ahorro" se renombra a "Fondo de emergencia"; en el sidebar desktop "Crecer" pasa a "Ahorros" y "Herramientas" se disuelve (Análisis entra a Gestión, el nombre del grupo se revisa en NAV.C). De paso: `MAS_SECTIONS` ahora incluye `apartados` e `inversion` (el botón Más no se resaltaba en esas secciones) y se retiró el código muerto del toggle de tema en `menu-mas.js`. Verificado en preview (móvil 375px y desktop); 2037/2037 unit; 138/138 E2E (+7, suite `hub-ahorros`). SW v302 → v303. **Pendiente: validación del usuario en su celular.**

| Archivo | Cambio |
|---|---|
| `index.html` | Pestañas + slots del consolidado en las 4 secciones, modal Más plano de 7, sidebar reorganizado. |
| `modules/dominio/ahorro/{view,index}.js` | Consolidado multi-slot + render en los 4 hashes del hub. |
| `styles/layout.css`, `styles/modals.css` | Componente `.hub-tabs`; estilos de grupos del menú Más retirados. |
| `modules/ui/{shell,menu-mas,proposito}.js` | Resaltado de Más, limpieza, copy del renombre. |

---

### feat(nav): NAV.A2a, bottom nav de 5 con botón central "Registrar" · 2026-07-04

Segunda tarea del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). Bottom nav móvil de 5: `Inicio · Gastos · [+] · Calendario · Más`. El "+" (FAB de acento) abre la hoja "¿Qué quieres registrar?" con dos tejas, Gasto e Ingreso, que enrutan a los modales existentes vía la acción built-in `registrar-abrir` (cierra la hoja e invoca la acción destino por nombre, sin anidar modales). Resuelve H1/H2 de la auditoría (registrar entró/salió en la zona del pulgar) y cierra BUG-010 (safe area del bottom nav). Abono/Aporte y la oferta de distribución se separaron a NAV.A2b (necesitan selector de destino + modo "ya acreditado" del asistente). Verificado en móvil y a 320px; 2037/2037 unit; 131/131 E2E (+3). SW v301 → v302. **Pendiente: validación del usuario en su celular.**

| Archivo | Cambio |
|---|---|
| `index.html`, `modules/ui/actions.js` | Nav de 5 + hoja `modal-registrar` + acción `registrar-abrir`. |
| `styles/responsive.css`, `styles/modals.css` | FAB central + fix BUG-010 + tejas de la hoja. |

---

> Para tareas anteriores (feat(tesoreria) NAV.A1 ingreso puntual en Mis cuentas, docs(nav) auditoría de navegación móvil, ADR 024 y tarjetas NAV, feat(ui) ID.6 Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación, feat(ui) ID.2 familia Finko Icons en el resto de la UI estructural, feat(ui) ID.4 espaciado y jerarquía en las tarjetas más densas, feat(ui) ID.1 lenguaje de iconografía propio con piloto en la navegación, style(analisis) paleta unificada entre la dona y las barras por categoría, feat(tesoreria) MC.6c señales más ricas para la distribución automática, feat(inversiones) E.5 IPC observado como constante anual, feat(gastos) TX.3 categorías Café y Gastos hormiga, feat(logros) LG.1b vitrina de logros en Ajustes ADR 022, feat(agenda) AP.4, MT.2 y AH.4 recordatorio de día de ingreso ADR 021, feat(ahorro) AH.3 y AUD.6 ADR 020 fondo como marcador de liquidez, feat(ahorro) AH.2 aporte recomendado del fondo explicado con datos reales, feat(personales) PE.1 tasa de interés opcional y reparto capital/interés, feat(tesoreria) MC.10 y MC.11 piso de ahorro y detección de déficit real, feat(compromisos) D.10 y D.13 categorías de relación para deuda personal y Fiado, feat(presupuesto) MC.8d pulido de Límites con iconos por categoría, test(rwd) RWD.1 verificación de reflow real a 320px en E2E, feat(presupuesto) MC.8c layout de dos columnas en Límites, feat(compromisos) D.12 aviso de tasa desconocida por deuda en la lista, feat(compromisos) D.11 la recomendación nombra la única deuda con interés, fix(ahorro) AH.1 hint del objetivo del fondo explicado, feat(logros) LG.1a toast de logros más legible, feat(personales) PE.2 a PE.5 estados de seguimiento humanizados en Me deben, style(a11y) COL.1 y COL.2 contraste de warning y texto deshabilitado, test(a11y) A11Y.5 pase axe sobre formularios dinámicos en E2E, feat(gastos) TX.6 y TX.7 el gasto hereda el ícono de su compromiso de origen, feat(ui) EP.7d divulgación progresiva Mis cuentas/Análisis/Me deben con la épica EP.7 completa, feat(ui) EP.7c divulgación progresiva Metas/Ahorro/Inversión, feat(ui) EP.7b divulgación progresiva Gastos/Deudas/Calendario/Límites, feat(ui) EP.7a banner con divulgación progresiva, docs(adr) ADR 016 revisado divulgación progresiva, chore(tesoreria) MC.12 renombrar "Ingreso" a "Ingresos fijos", fix(tesoreria) MC.7f pulido del asistente épica MC.7 completa, feat(tesoreria) MC.7e Paso 3 reparte entre cuentas, feat(tesoreria) MC.7d completo asistente paginado + R3, fix(tesoreria) BUG-007/BUG-008 copy cuota de manejo + validaciones Infinity, fix(compromisos) BUG-006 abono extra, fix(tesoreria) BUG-009 tope coordinado cuota+extra, docs(bugs) diseño BUG-009, fix(tesoreria) BUG-005 cuota de manejo, fix(tesoreria) BUG-003/BUG-004 checklist de Necesidades, feat(tesoreria) MC.7d slice 1 checklist de Necesidades, docs(revision) Mis cuentas, docs(adr) ADR 018 revisión, AG.4, AG.2, AG.7, AG.6, AG.5, MT.4, MT.5, MT.3, MT.1, IN.2, IN.1, IN.3, AUD.5, AUD.4, AUD.3, AUD.1, MC.8b, AUD.2, fix(presupuesto) Ahorro celebra en verde MC.8, MC.8a, docs(adr) ADR 019, MC.7c, MC.7b, MC.7a, docs(adr) ADR 018, MC.5e, MC.5b, MC.5d, MC.5c, feat(nav) Dashboard→Inicio/Agenda→Calendario, MC.5a, docs(adr) ADR 017, A11Y.4, A11Y.3, A11Y.2, A11Y.1, EP.4, EP.3, EP.2, EP.1, EP.0, MC.6b...), ver [`docs/CHANGELOG.md`](CHANGELOG.md) (o [`docs/changelog/2026-07.md`](changelog/2026-07.md) una vez julio se archive).

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
