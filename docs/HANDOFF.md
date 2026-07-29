# HANDOFF - Finko Claude

> Documento de contexto vivo. Se actualiza al cerrar **cada** tarea o fase.
> Propósito: que cualquier asistente IA o colaborador nuevo sepa en 2 minutos
> qué es el proyecto, qué se hizo recientemente, qué sigue, y cómo trabajamos.
> Última actualización: 2026-07-28. Última tarea cerrada: DIS.15, la tarjeta de apartado adopta "las dos carreras" (arquitectura E de la auditoría de diseño por secciones).

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
| Tests unitarios + integración | 3208/3208 verdes |
| Tests E2E | 235/235 verdes en las 11 suites, corrida completa el 2026-07-27. El desglose no se transcribe acá: lo reporta la propia corrida. |
| Schema version (localStorage) | v27 |
| Lighthouse Performance | 100 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse SEO | 100 |
| Cobertura lógica | 99.6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |

---

## 3. Qué se hizo recientemente (últimas 5 tareas)

### feat(apartados): DIS.15, las dos carreras reemplazan la fila · 2026-07-28

Arquitectura **E** de la auditoría por secciones, y la respuesta de Metas **no se hereda**: un apartado tiene un vencimiento externo, no una aspiración, así que el protagonista pasa a ser el plazo y no el dinero. La tarjeta enfrenta **dos carreras**: el dinero reunido contra lo que el plan preveía tener hecho hoy, dibujado en aportes, comparables por longitud sin leer un número. El veredicto habla solo con un aporte completo de diferencia y sabe decir algo que ninguna tarjeta de Finko decía: **que vas adelantado**. La recurrencia sube a la cabecera y **la sección entra al ojo de privacidad**, que no llegaba a ninguna vista del hub de ahorro. `planDeReferencia()` mide contra el plan y no contra el reloj (comparar con el tiempo transcurrido daba hasta 17 puntos de atraso falso); su arranque sale de `fechaCreacion` y del nuevo `fechaInicioPlan`, que `reiniciarCiclo()` anota al cerrar un ciclo, **sin bump de schema**. **Sin aplicar:** "Editar" y el CTA "Elegir fecha" del mockup, porque Apartados no tiene flujo de edición (rebanada pendiente de EDIT.1), y la historia entre ciclos, que necesita datos que no existen. Tres reglas nuevas de diseño (R60 a R62). 3254/3254 unit + 235/235 E2E + lint verdes. SW v436 → v437.

---

### feat(metas): DIS.14, la meta pasa de fila a tarjeta con medidor · 2026-07-28

Arquitectura **A2** de la auditoría de diseño por secciones (carpeta "Diseño Secciones"): la meta deja de ser una fila horizontal con anillo en una esquina y pasa a ser `.meta-card`, tarjeta vertical con medidor semicircular, como ya había hecho `.deuda-card`. **El objetivo deja de competir con lo acumulado**: es el extremo de la escala del arco, no un segundo número, y el ícono de la meta se muda al centro del arco a 44px. Cinco estados resueltos: en curso, sin fecha límite (el hueco del plan de aportes lo ocupa la invitación a ponerla), recién creada (la cifra en cero cede su línea a una frase y el botón nombra el primer paso), cumplida (arco cerrado, sin aportar) y con el saldo oculto. Las tres acciones a 44px, así que MT.g queda cerrado dentro de Metas sin decidir `btn-sm` global. El copy visible adopta "aporte", la palabra de Apartados y Fondo; los ids y `data-action` no cambian. `arcoProgreso()` nace en `infra/svg.js` como hermano de `progressRing()`. **Sin aplicar:** la historia de la meta cumplida ("12 aportes en 6 meses"), que no tiene de dónde salir sin ledger de aportes ni `fechaCumplida`. Tres reglas nuevas de diseño (R57 a R59). 3223/3223 unit + 235/235 E2E + lint verdes. SW v435 → v436.

---

### feat(metas): CAT.1c, el catálogo de Metas adopta la taxonomía global · 2026-07-27

Última rebanada de CAT.1: la iniciativa de taxonomía global queda completa. Ejecuta lo validado en el [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) el 2026-07-13: **Cumpleaños** sale del formulario de metas (gasto esporádico anual, ya es plantilla de Apartados desde CAT.1b) y **Vacaciones** se fusiona con **Viajes**. El catálogo se parte como en CAT.1a: `CATEGORIAS_META` sigue completo (y con él `CATEGORIA_META_ICONO`, que conserva la palmera de las metas viejas), el formulario lee `CATEGORIAS_META_USUARIO`. **Filtrar el formulario no bastaba y el ADR no podía saberlo, porque EDIT.1a cerró después:** con el selector curado a secas, editar una meta vieja de Vacaciones caía en "Sin categoría", así que corregir el nombre le borraba la categoría y le cambiaba el ícono. El selector ahora reinyecta la categoría retirada **solo si la meta ya la tenía**. Sin bump de schema: es curación de constantes. 7 tests nuevos. 3208/3208 unit + lint verdes. SW v434 → v435.

---

### docs(tesoreria): MC.16, la tarjeta de crédito se decide como producto de Deudas · 2026-07-27

[ADR 051](DECISIONS/051-tarjeta-de-credito-producto-integrado.md) pasa de Abierta a **Aceptada** con la alternativa **B**: la tarjeta es un producto de Deudas con `cupoTotal`, no un tipo de cuenta. Lo decidió el análisis del modelo actual: la deuda de tarjeta ya existe en `CATEGORIAS_DEUDA` con su tasa EA, `Gasto.compromisoId` ya mueve el saldo de una deuda y lo sincroniza al editar y eliminar, y `calcularActivos()` no lee `compromisos`, así que la I5 del ADR 053 (el cupo nunca es un activo) se cumple sin tocar Análisis. El consumo con tarjeta es un gasto sin cuenta, con `consumoTC` fijando el signo. Saldo revolvente, una deuda por tarjeta. MC.16 queda re-cortada en 5 rebanadas (MC.16a a MC.16e). Sin código: es el paso que el ADR exigía antes de escribir la primera línea. Sin tocar `modules/`, no hay tests que correr ni SW que bumpear.

---

### fix(tesoreria): MC.13f, confirmar el cobro que Finko no puede datar · 2026-07-27

Hallazgo de la auditoría integral del 2026-07-25. `estadoDistribucion` descarta los cobros anteriores a la creación del ingreso (bien: evita un falso "ya recibiste"), pero eso dejaba a quien registra un ingreso **a mitad de periodo**, con la quincena ya cobrada, sin poder distribuir hasta el cobro siguiente; y el CTA "Distribuir" del detalle del día de Calendario abría un asistente que no dejaba avanzar. **El estado `'pendiente'` ya era exactamente ese caso** (no había otro camino a esa rama), así que en vez de un quinto estado se renombró a `'por-confirmar'` y ahora devuelve la fecha candidata en vez de `null`: la tarjeta pregunta "Registraste este ingreso después del 5 de jul, así que no sabemos si ese pago te llegó" con el botón "Sí, recibí el pago del 5 de jul". **La fecha no es cosmética:** es el `periodoISO` que el guard de de-duplicación sella al confirmar, así que limitarse a habilitar el botón habría permitido distribuir el mismo periodo dos veces. La respuesta vive en `S.config.cobroConfirmadoPeriodo`, campo opcional sin declarar ni migrar como los dos que ya conviven ahí, **sin bump de schema**. Calendario no se toca: el guard del asistente ya cubría a sus callers externos, así que su CTA ahora encuentra la pregunta. Cero CSS nuevo. **Sin aplicar:** BUG-017 (el Quincenal que pierde un cobro), que se revisó como pedía la tarjeta y resultó vivir en otro archivo (`ocurrenciasEnMes`) y necesitar tu decisión porque cambia lo que muestra el Calendario. 8 tests nuevos. 3201/3201 unit + 235/235 E2E + lint verdes. SW v433 → v434.

---

> Para tareas anteriores (fix(gastos) TX.12b el chip de gasto frecuente ofrece el monto real, fix(metas) MT.7 prellenar el monto del aporte con la cuota del periodo, fix(metas) DIS.13 las 6 correcciones de la auditoria de diseno sobre Metas, fix(fondo) DIS.12 las 9 correcciones de la auditoria de diseno sobre Fondo de emergencia, fix(calendario) DIS.11 las 11 correcciones de la auditoria de diseno sobre Calendario, fix(analisis) DIS.10 las 12 correcciones de la auditoria de diseno sobre Analisis, fix(mis-cuentas) DIS.9 las 9 correcciones de la auditoria de diseno sobre Mis cuentas, fix(limites) DIS.7 las 9 correcciones de la auditoria de diseno sobre Limites de gasto, fix(interfaz) DIS.6 las 7 correcciones de la auditoria de diseno sobre la Interfaz, fix(apartados) DIS.5 las 11 correcciones de la auditoría de diseño sobre Apartados, fix(gastos) DIS.4 las 10 correcciones de la auditoría de diseño sobre Gastos, fix(me-deben) DIS.3 las 11 correcciones de la auditoría de diseño sobre Me deben, fix(deudas) DIS.2 las 8 correcciones de la auditoría de diseño sobre Deudas, fix(inicio) V1 el acento de marca deja de medir el gasto semanal, docs(reorg) Fases 1 y 2 de la reorganización documental, feat(metas) EDIT.1a editar sin destruir el progreso, feat(gastos) TX.12 gastos frecuentes y "Repetir", feat(agenda) CAL.5a pagar en lote lo que ya venció, feat(movimientos) MOV.2 búsqueda y filtros en el ledger, feat(movimientos) MOV.1 el ledger deja de ser solo lectura, feat(personales,analisis) PE.7 "Me deben" conectado a cuentas y patrimonio, feat(apartados,ahorro) AP.5a + AH.5a el monto de un aporte llega prellenado, fix(agenda) BUG-015 "Marcar pagado" registra el pago en el mes visible, fix(tesoreria) BUG-014 la distribución reparte el cobro del período, no el mes, y el historial completo antes de esas), ver [`docs/CHANGELOG.md`](CHANGELOG.md) o [`docs/changelog/`](changelog/) para meses ya archivados.

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
