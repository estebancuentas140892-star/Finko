# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-30. Última tarea cerrada: BUG-019 y BUG-020, la compuerta E2E vuelve a verde.

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
| Tests unitarios + integración | 3450/3450 verdes |
| Tests E2E | 243/243 verdes en las 11 suites, corrida completa el 2026-07-30 (BUG-019). Antes de eso la suite llevaba dos días en rojo sin que nadie lo supiera: **E2E no es compuerta de cada commit, así que un cambio de markup la deja caída hasta que alguien la corre.** |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### test(e2e): BUG-019 y BUG-020, la compuerta E2E vuelve a verde · 2026-07-30

La suite llevaba dos días caída sin que nadie lo supiera (última verde: 2026-07-28, anterior a DIS.19). De 20+ fallas y 146 tests sin ejecutar a **243/243**. La causa dominante no era la obvia: que `.casa-ahorro__fila[data-vehiculo]` desapareciera explicaba 4 fallas, y las otras 16 eran que cada `.lane__cta` de DIS.19 **duplica la `data-action` de su sección**, así que los selectores a nivel de documento elegían el del carril oculto. Se acotaron 25 sitios. Tres tests de Metas afirmaban el sprite `#c-anillo` que DIS.19 cambió por una silueta. **BUG-020** salió por el reloj: `DIA_AYER`/`DIA_PASADO` envolvían a módulo 28 y perdían el offset a fin de mes, fallando 2 o 3 días de cada mes. Y un defecto propio de INV.1: `.check()` sobre un radio que su label intercepta. **Cero cambios en `modules/`.** 3450/3450 unit + lint verdes.

### feat(inversion): INV.1, el dinero sale de una cuenta al registrar una inversión · 2026-07-29

`inversiones` era la única de las cuatro bolsas de ahorro que no tocaba cuentas, mientras `analisis` daba por hecho que sí: comprar un CDT con saldo de una cuenta registrada inflaba el patrimonio de forma permanente (H5 de la auditoría del 2026-07-25, [ADR 053](DECISIONS/053-invariante-de-patrimonio.md)). El formulario pregunta el origen con dos ramas explícitas (salió de una cuenta / ya la tenía), sugeridas según la fecha de inicio y siempre editables. Con cuenta de origen, guardar descuenta el saldo (con confirmación si lo deja en negativo) y eliminar lo devuelve, salvo que la cuenta ya no exista. Alcance indivisible por el propio ADR: alta, reversa y la regla de cuenta borrada entregadas juntas. `S.inversiones[].cuentaId` nuevo y opcional, sin bump de schema. 3450/3450 unit + lint verdes. SW v446 → v447.

### feat(ahorro): DIS.19, Ahorro en cuatro carriles · 2026-07-29

Sexta y última pasada de la auditoría por secciones. DIS.18 le dio a las cuatro modalidades una pantalla padre, pero las filas eran monto y estado en texto: **la diferencia entre las cuatro estaba adentro de cada sección y la decisión se toma afuera**. Ahora cada carril de `#ahorro` trae su propio gráfico y cada gráfico mide en su propia unidad (meses cubiertos, columnas contra la marca del plan, siluetas que se llenan, dos columnas de crecimiento), con el rótulo del momento de uso encabezando y ordenando los cuatro. Los mismos gráficos entran a las secciones hijas: la silueta al centro del arco en Metas, el comparador encima de la lista en Apartados, la franja con el eje de niveles y el medidor del compromiso en Fondo. Dos piezas bajan a `infra/bolsas.js` e `infra/portafolio.js` en vez de duplicarse (primer paso de ARQ.1). **Fuera de alcance:** la celda de ahorro en Inicio (para triaje), la etapa de Inversión en su carril (espera ARQ.1) y el nombre "Apartados" (AH.7). 3424/3424 unit + lint verdes. SW v441 → v446.

### feat(ahorro): DIS.18, Ahorro pasa de encabezado repetido a pantalla propia · 2026-07-28

Quinta y última pasada de la auditoría por secciones, y la primera que analiza **la relación entre cinco pantallas** en vez de una. El bloque "Tu ahorro total" no tenía dónde vivir: era el resumen de una sección que Finko nunca construyó, así que se repetía en las cuatro hijas (316px de encabezado idéntico antes del contenido propio, el título a 365px del tope) y arrastraba una barra de pestañas que existía para saltar de lado cuando no se podía subir. Nace la casa **`#ahorro`**: el total una sola vez y las cuatro modalidades como **filas navegables**, cada una con una línea de para qué sirve y su estado en su propia unidad (meses cubiertos, metas en curso, días al próximo cobro, inversiones abiertas). El fondo de emergencia se muda a **`#fondo`**, las cuatro hijas abren con "volver a Ahorro" y en "Más" las cuatro tejas pasan a una. Restaura la intención del ADR 009 y supersede el hub de pestañas del ADR 024 D4 ([ADR 056](DECISIONS/056-la-casa-de-ahorro.md)). **Sin aplicar:** la etapa de Inversión en su fila ("construyendo"), que sale de `momentoInversion()` y queda pendiente de **ARQ.1** porque importarla rompe ADN 10 y replicarla duplica el cálculo; promover "Ahorro" a la barra inferior (implicaría mover Calendario); y el nombre "Apartados", que colisiona con "apartar". Cinco reglas nuevas de diseño (R70 a R74). 3337/3337 unit + 236/236 E2E + lint verdes. SW v440 → v441.

---

### feat(fondo): DIS.16, el fondo se mide en tiempo y no en porcentaje · 2026-07-28

Arquitectura **I con la prueba de H**. El fondo tenía dos problemas que ninguna otra sección tiene: **el objetivo se mueve solo** (si suben los gastos fijos el porcentaje cae sin que el usuario haya gastado un peso) y **no hay final** (tres meses no es terminar). La unidad deja de ser el porcentaje y pasa a ser el **tiempo**: el anillo se retira y entran el nombre del nivel, los bloques de mes con la fecha hasta la que alcanza el fondo, la escalera de tres niveles y el veredicto. Un logro no se retira cuando la meta sube (R66), el siguiente tramo siempre está a la vista (R67), un porcentaje diminuto se dice con palabras (R68) y ninguna cifra obliga a una cuenta mental (R69: "1,8 meses" pasa a "1 mes y 3 semanas"). En cero la tarjeta apunta al primer nivel y no a la meta completa, que es la lectura que desanima en el momento más frágil. La sección entra al ojo de privacidad y queda con un solo primario. **Sin aplicar:** los estados 4 y 5 del mockup ("tardaste 14 meses", la explicación del retroceso por subida de gastos), que necesitan dos datos que `S.ahorro` no guarda; y "Desactivar" no vuelve a la tarjeta porque DIS.12 lo bajó al modal con `.btn-danger` (R53), decisión posterior al mockup. Cuatro reglas nuevas de diseño (R66 a R69). 3323/3323 unit + 235/235 E2E + lint verdes. SW v439 → v440.

---

> Para tareas anteriores (feat(inversion) DIS.17 la seccion pasa a los tres momentos, feat(apartados) DIS.15 las dos carreras reemplazan la fila, feat(metas) DIS.14 la meta pasa de fila a tarjeta con medidor, feat(metas) CAT.1c el catalogo de Metas adopta la taxonomia global, docs(tesoreria) MC.16 la tarjeta de credito se decide como producto de Deudas, fix(tesoreria) MC.13f confirmar el cobro que Finko no puede datar, fix(gastos) TX.12b el chip de gasto frecuente ofrece el monto real, fix(metas) MT.7 prellenar el monto del aporte con la cuota del periodo, fix(metas) DIS.13 las 6 correcciones de la auditoria de diseno sobre Metas, fix(fondo) DIS.12 las 9 correcciones de la auditoria de diseno sobre Fondo de emergencia, fix(calendario) DIS.11 las 11 correcciones de la auditoria de diseno sobre Calendario, fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

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
