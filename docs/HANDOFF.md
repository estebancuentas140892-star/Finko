# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-30. Última tarea cerrada: MC.13e-2e, completar el déficit del asistente con el saldo de otra cuenta.

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
| Tests unitarios + integración | 3498/3498 verdes |
| Tests E2E | 246/246 verdes en las 12 suites, corrida completa el 2026-07-30 (MC.13e-2e). Desde el 2026-07-30 **sí es compuerta**: el hook de pre-commit exige el sello de una corrida verde cuando el diff toca runtime. |
| Schema version (localStorage) | v28 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(tesoreria): MC.13e-2e, completar el déficit con el saldo de otra cuenta · 2026-07-30

Marcar más de lo que entra ya no es un callejón sin salida en el asistente "Distribuir mi ingreso" (punto 14 del brief): el déficit se nombra y se ofrece cubrirlo con el saldo de las demás cuentas activas. La oferta es explícita (casilla sin marcar por defecto; sin aceptarla, "Distribuir" sigue bloqueado igual que antes) y nunca sobregira: `planComplementoDeficit()` reusa `distribuirPago`, así que toma hasta el saldo de cada cuenta y, si no alcanza, no hay oferta. Al confirmar se recalcula el reparto **con la cuenta de origen ya resuelta**, porque mientras el panel muestra la oferta esa cuenta todavía puede ser cualquiera de las activas. "Deshacer" lo cubre sin cambios (`cuentas` ya estaba en el snapshot). Sin bump de schema. 3498/3498 unit + 246/246 E2E + lint verdes. SW v452 → v453.

### feat(gastos): MC.16b, pagar con la tarjeta sube la deuda · 2026-07-30

Segunda rebanada de MC.16 y corazón del [ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) (D3/D4): un gasto puede pagarse con la tarjeta. Las tarjetas operables entran al mismo selector de origen, en grupo aparte y con el valor prefijado `tc:<id>`, así que elegir cuenta o tarjeta es excluyente sin agregar un campo. El consumo no descuenta ninguna cuenta, sube el `saldoTotal` de la tarjeta y lleva `Gasto.consumoTC` para fijar el signo, que el abono a esa misma tarjeta usa invertido. Indivisible por la I3 del [ADR 053](DECISIONS/053-invariante-de-patrimonio.md): alta, edición y eliminación entraron juntas, con el delta calculado en `logic.js` (`deltasPorEdicionEnDeuda`) y neteado por deuda, porque el acote en cero del saldo podía tragarse el remanente de una reversa en dos pasadas. Sin bump de schema (`consumoTC` entra en la v28 que abrió MC.16a). 3498/3498 unit + 242/242 E2E + lint verdes. SW v451.

### feat(compromisos): MC.16a, el cupo de la tarjeta de crédito · 2026-07-30

Primera de las cinco rebanadas de MC.16 ([ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md)): el form de deuda con categoría 'Tarjeta de crédito' gana `cupoTotal`, y la card muestra el disponible (`cupoTotal - saldoTotal`, derivado, acotado a cero). El campo hace también de discriminador de "tarjeta operable", sin `esTarjeta` paralelo, misma economía que `esCuotaManejo`. **Todavía no se puede pagar con la tarjeta**: eso es MC.16b, ahora desbloqueada. Ninguna `Cuenta` nueva (D5). Bump v27 a v28 con migración no-op. De paso, el E2E dejó de hardcodear la versión de schema (la importa de `storage.js`): el bump la había dejado en rojo. 3456/3456 unit + 242/242 E2E + lint verdes. SW v449.

### refactor(tesoreria): MC.13e-2b + MC.13e-2f-1 · 2026-07-30

"Abonar extra a deudas" sale del asistente "Distribuir mi ingreso" (un abono es un pago, vive en Deudas): se borran `destinosDeudas`/`seccionDeudas` del asistente y del apply, y `construirPlanDeudas()` con ellas (sin consumidor). La distribución además parte del `cuentaId` que el ingreso ya tiene guardado (MC.13d) en vez de preguntar siempre con `resolverCuenta()`: `cuentaIngresoPrincipal()` nueva en `logic/distribucion.js`. Sin bump de schema. 485/485 unit de tesoreria + 3410/3410 unit total + lint verdes. SW v448 → v449.

### test(e2e): BUG-019 y BUG-020, la compuerta E2E vuelve a verde · 2026-07-30

La suite llevaba dos días caída sin que nadie lo supiera (última verde: 2026-07-28, anterior a DIS.19). De 20+ fallas y 146 tests sin ejecutar a **243/243**. La causa dominante no era la obvia: que `.casa-ahorro__fila[data-vehiculo]` desapareciera explicaba 4 fallas, y las otras 16 eran que cada `.lane__cta` de DIS.19 **duplica la `data-action` de su sección**, así que los selectores a nivel de documento elegían el del carril oculto. Se acotaron 25 sitios. Tres tests de Metas afirmaban el sprite `#c-anillo` que DIS.19 cambió por una silueta. **BUG-020** salió por el reloj: `DIA_AYER`/`DIA_PASADO` envolvían a módulo 28 y perdían el offset a fin de mes, fallando 2 o 3 días de cada mes. Y un defecto propio de INV.1: `.check()` sobre un radio que su label intercepta. **Cero cambios en `modules/`.** 3450/3450 unit + lint verdes.

---

> Para tareas anteriores (feat(inversion) INV.1 el dinero sale de una cuenta al registrar una inversion, feat(ahorro) DIS.19 Ahorro en cuatro carriles, feat(ahorro) DIS.18 Ahorro pasa de encabezado repetido a pantalla propia, feat(fondo) DIS.16 el fondo se mide en tiempo y no en porcentaje, feat(inversion) DIS.17 la seccion pasa a los tres momentos, feat(apartados) DIS.15 las dos carreras reemplazan la fila, feat(metas) DIS.14 la meta pasa de fila a tarjeta con medidor, feat(metas) CAT.1c el catalogo de Metas adopta la taxonomia global, docs(tesoreria) MC.16 la tarjeta de credito se decide como producto de Deudas, fix(tesoreria) MC.13f confirmar el cobro que Finko no puede datar, fix(gastos) TX.12b el chip de gasto frecuente ofrece el monto real, fix(metas) MT.7 prellenar el monto del aporte con la cuota del periodo, fix(metas) DIS.13 las 6 correcciones de la auditoria de diseno sobre Metas, fix(fondo) DIS.12 las 9 correcciones de la auditoria de diseno sobre Fondo de emergencia, fix(calendario) DIS.11 las 11 correcciones de la auditoria de diseno sobre Calendario, fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

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
