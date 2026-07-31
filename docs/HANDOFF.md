# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-31. Última tarea cerrada: IN.9b, 8 filas de actividad en escritorio y 5 en móvil (segunda rebanada de Inicio en escritorio).

**Producción:** https://finko-brown.vercel.app
**Repositorio:** https://github.com/estebancuentas140892-star/Finko

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Vanilla JS puro + ES6 modules. Sin framework, sin build step, sin servidor, sin cuenta.
Todo vive en `localStorage` (clave `fk_v1`). Pensada para personas con poco conocimiento
financiero: lenguaje simple, normativa colombiana (SMMLV, UVT, GMF).

**Versión actual:** `v1.0.0` - todas las 14 fases originales completadas y cerradas.
**Rama principal:** `main`.

---

## 2. Estado técnico actual

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 3525/3525 verdes |
| Tests E2E | 246/246 verdes en las 12 suites, corrida completa el 2026-07-30 (MC.16d). Desde el 2026-07-30 **sí es compuerta**: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. |
| Schema version (localStorage) | v28 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(inicio): IN.9b, 8 filas de actividad en escritorio y 5 en móvil · 2026-07-31

Segunda rebanada de IN.9 ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra IE8. El límite de 5 se eligió para 390px y nunca fue una regla de negocio: `movimientosRecientes()` ya recibía el límite por parámetro, así que cambia el argumento, no la derivación (sin dato nuevo, sin consulta nueva, sin bump). `_limiteRecientes()` lee el ancho con `matchMedia('(max-width: 1023.98px)')`, misma forma que `_lanzarConfetti()` de `logros/index.js`. **Limitación declarada:** el panel se repinta con `state:change`, así que cambiar de ancho sin cambiar de estado deja el límite del último render hasta la siguiente acción; se acepta para no montar un observador de `resize` que ningún otro panel tiene. Verificado con 12 movimientos: 1280px pinta 8 filas, 391px pinta 5. PI10 (columna corta si el usuario registra poco) sigue abierto y se decide en IN.9d. 3525/3525 unit + 246/246 E2E + lint verdes. SW v456 a v457.

### feat(inicio): IN.9a, los dos avisos de "Atención hoy" comparten fila · 2026-07-31

Primera rebanada de **IN.9 "Inicio en escritorio"** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md)), del handoff de la auditoría de navegación global. Los dos avisos (`#panel-distribuir-inicio` y `#panel-limites`) pasan a `bento__cell--half` y límites sube junto al otro aviso: el grupo queda en dos filas de dos. El reorden no es cosmético, es lo que hace funcionar el reparto: a span 6 **sin** reordenar el grupo empeora de 541px a 588px, y reordenado baja a 459px (-15%), con el bento de 1.680 a 1.598. Acota el ADR 034 D1 (límites ya no van al final del grupo) en las dos plataformas, porque el bento es marcado compartido y separarlo con `order` divorciaría el orden de foco del visual (WCAG 2.4.3). Cero CSS nuevo: solo clases del bento existentes, así que tablet (541 a 478px) y móvil (solo cambia el orden) caen solos. **ID4 e ID7 del informe quedan fuera**: dependen de una barra superior de escritorio que no existe en el código (tarjeta INT.1). De paso, BUG-021: la prueba E2E de "Pendientes del mes" sembraba el día vencido con una envoltura modulo 28 y fallaba los días 1, 2, 3 y 31 del mes; ahora fija el reloj. 3523/3523 unit + 246/246 E2E + lint verdes. SW v455 a v456.

### feat(gastos): MC.16d, "¿A cuántas cuotas?" al registrar el consumo · 2026-07-30

Cierra MC.16 salvo MC.16e. El consumo con tarjeta pregunta a cuántas cuotas se difiere (chips 1 a 24, "1 cuota" por defecto, revelado solo con origen `tc:`) y sube `cuotaMensual` de la tarjeta en `monto / cuotas`, redondeado. Mismo patrón de deltas netos que ya tenía `saldoTotal` (`efectoEnCuotaMensual`/`deltasPorEdicionEnCuotaMensual`, gemelas de `efectoEnDeuda`/`deltasPorEdicionEnDeuda`); un abono no lo toca. No crea un plan por compra (ADR 051 D2): sigue siendo un único `Gasto`, saldo revolvente. `cuotaMensual` ya existía en el schema (v5): sin bump. 16 tests nuevos. 3523/3523 unit + 246/246 E2E + lint verdes. SW v453 a v455.

### feat(tesoreria): MC.16c, bloque de tarjetas de crédito en Mis cuentas · 2026-07-30

Mis cuentas gana un bloque propio de tarjetas de crédito, **fuera** del total de dinero disponible (ADR 051 D6), con cupo, usado y disponible derivado (nunca almacenado). `tarjetasCredito()` duplica a propósito el filtro de `gastos/logic.js` (ADN 10). Solo lectura: reusa la anatomía de `.cuenta-card` y cierra con un enlace "Ver en Deudas" (`#compromisos`); la dueña de operar sigue siendo Deudas. 9 tests nuevos. 3523/3523 unit + lint verdes. SW v454 a v455.

### feat(tesoreria): MC.13e-2e, completar el déficit con el saldo de otra cuenta · 2026-07-30

Marcar más de lo que entra ya no es un callejón sin salida en el asistente "Distribuir mi ingreso" (punto 14 del brief): el déficit se nombra y se ofrece cubrirlo con el saldo de las demás cuentas activas. La oferta es explícita (casilla sin marcar por defecto; sin aceptarla, "Distribuir" sigue bloqueado igual que antes) y nunca sobregira: `planComplementoDeficit()` reusa `distribuirPago`, así que toma hasta el saldo de cada cuenta y, si no alcanza, no hay oferta. Al confirmar se recalcula el reparto **con la cuenta de origen ya resuelta**, porque mientras el panel muestra la oferta esa cuenta todavía puede ser cualquiera de las activas. "Deshacer" lo cubre sin cambios (`cuentas` ya estaba en el snapshot). Sin bump de schema. 3498/3498 unit + 246/246 E2E + lint verdes. SW v452 → v453.

---

> Para tareas anteriores (feat(gastos) MC.16b pagar con la tarjeta sube la deuda, feat(compromisos) MC.16a el cupo de la tarjeta de credito, refactor(tesoreria) MC.13e-2b + MC.13e-2f-1, test(e2e) BUG-019 y BUG-020 la compuerta E2E vuelve a verde, feat(inversion) INV.1 el dinero sale de una cuenta al registrar una inversion, feat(ahorro) DIS.19 Ahorro en cuatro carriles, feat(ahorro) DIS.18 Ahorro pasa de encabezado repetido a pantalla propia, feat(fondo) DIS.16 el fondo se mide en tiempo y no en porcentaje, feat(inversion) DIS.17 la seccion pasa a los tres momentos, feat(apartados) DIS.15 las dos carreras reemplazan la fila, feat(metas) DIS.14 la meta pasa de fila a tarjeta con medidor, feat(metas) CAT.1c el catalogo de Metas adopta la taxonomia global, docs(tesoreria) MC.16 la tarjeta de credito se decide como producto de Deudas, fix(tesoreria) MC.13f confirmar el cobro que Finko no puede datar, fix(gastos) TX.12b el chip de gasto frecuente ofrece el monto real, fix(metas) MT.7 prellenar el monto del aporte con la cuota del periodo, fix(metas) DIS.13 las 6 correcciones de la auditoria de diseno sobre Metas, fix(fondo) DIS.12 las 9 correcciones de la auditoria de diseno sobre Fondo de emergencia, fix(calendario) DIS.11 las 11 correcciones de la auditoria de diseno sobre Calendario, fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

---

## 4. Mantenimiento y producción

**App en producción estable:** https://finko-brown.vercel.app (Lighthouse 99-100). **Deuda técnica conocida: 2 errores abiertos**, ninguno con impacto en el uso diario (uno de copy, uno de la propia suite E2E): ver [`docs/BUGS.md`](BUGS.md).

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
dominio/     → accesos, agenda, ahorro, analisis, apartados, compromisos,
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
