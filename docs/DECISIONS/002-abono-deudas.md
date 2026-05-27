# ADR 002 - Abono de deudas con selector de cuenta

**Estado:** Propuesta (pendiente de aprobación del usuario antes de implementar)
**Fecha:** 2026-05-27
**Autores:** Esteban (producto), Claude Opus 4.7 (arquitectura)

---

## Contexto

Hoy la sección Compromisos es **informativa**: muestra deudas, su saldo, cuota, urgencia y estrategia de pago (Avalancha vs Bola de nieve). Pero **no permite registrar pagos**.

Para registrar un pago, el usuario debe ir manualmente a Gastos, elegir categoría "Deudas", indicar la cuenta de origen, etc. Compromisos y Tesorería están desconectados en el flujo real: el usuario sabe cuánto debe, pero la app no sabe cuándo paga.

Esto rompe el ciclo de uso natural:
- El usuario ve "Tarjeta Visa: Saldo $1.500.000, Cuota $200.000, vence mañana".
- Hace el pago en la app del banco.
- Vuelve a Finko y... el saldo sigue diciendo $1.500.000.

El comentario explícito de [`modules/dominio/compromisos/logic.js:307`](../../modules/dominio/compromisos/logic.js#L307) confirma este vacío:
> "Finko no persiste un historial de pagos en compromisos. Esta función no verifica si el pago fue registrado: avisa que el plazo ya pasó para que el usuario confirme que lo pagó y lo registró en gastos."

El usuario pidió cerrar este loop: un botón "Abonar deuda" en cada card que abra un modal donde se elija de qué cuenta sale la plata. El sistema actualiza saldo de la deuda, saldo de la cuenta, y deja registro auditable del movimiento.

---

## Decisión

**Implementar la feature "Abonar deuda" reutilizando el dominio Gastos como motor del movimiento financiero.** Cada abono es un Gasto categorizado como "Deudas", vinculado a una Cuenta (origen del dinero) y a un Compromiso (deuda destino) mediante un nuevo campo opcional `compromisoId`. El saldo de la deuda se reduce por el monto abonado.

### Las 5 decisiones críticas

| # | Pregunta | Decisión | Razón corta |
|---|---|---|---|
| D1 | ¿El abono crea un Gasto? | **Sí, en la colección `S.gastos`.** | Reutiliza infra (cuentaId, deltas de saldo, categorías), mantiene auditabilidad y aparece en analytics. |
| D2 | ¿Capital vs intereses? | **No se desglosa.** Resta el monto completo a `saldoTotal`. | El modelo actual no separa capital de intereses; cambiar eso es un refactor mayor. La simulación de estrategia ya trata `saldoTotal` como bolsa única. |
| D3 | ¿Monto del abono? | **Cualquier monto > 0.** Default: cuota mensual. | El usuario puede abonar menos (mes flojo), igual o más (extra). Si abona más que el saldo, se cierra la deuda y el gasto se ajusta al saldo restante. |
| D4 | ¿Qué pasa al saldar (saldoTotal = 0)? | **Card visible con badge "🎉 Saldada"** + acción "Archivar". El usuario archiva manualmente (set `activo=false`). | Celebrar el momento refuerza hábito. No desaparecer abrupto. |
| D5 | ¿Agenda muestra "pagada este mes"? | **Sí, badge ligero** "✓ Ya abonaste este mes" si hay un gasto en el mes actual con `compromisoId` que matchee. | Cierra el ciclo visual sin tocar el modelo de Agenda. |

---

## Justificación

### 1. Reutilizar el dominio Gastos como motor

Toda la infraestructura necesaria ya existe en `modules/dominio/gastos/`:
- [`aplicarGastoASaldo`](../../modules/dominio/gastos/logic.js#L137): reduce saldo de cuenta.
- [`revertirGastoDeSaldo`](../../modules/dominio/gastos/logic.js#L149): lo revierte al editar/eliminar.
- [`deltasPorEdicionDeGasto`](../../modules/dominio/gastos/logic.js#L168): maneja edits complejos (cambio de cuenta, cambio de monto).
- Categoría 'Deudas' en [`CATEGORIAS_GASTO`](../../modules/core/constants.js#L317).
- Selector de cuenta obligatorio en el form de gasto (`renderFormGasto`).

Crear una colección nueva `S.abonos[]` sería duplicar toda esta infraestructura. Reutilizar Gastos da:
- **Trazabilidad gratis:** el abono aparece en el listado de Gastos, en analytics, en presupuestos.
- **Reversibilidad gratis:** si el usuario edita o elimina el gasto, el `saldoTotal` se ajusta solo (con un poco de glue code).
- **Sin migración:** agregar `compromisoId?: string` opcional al typedef de Gasto es backwards-compatible.

### 2. No desglosar capital vs intereses

El modelo actual de `Compromiso.saldoTotal` es ambiguo: no sabemos si representa capital o capital + intereses pendientes. La simulación de Avalancha/BN ya lo trata como bolsa única y aplica intereses simulados sobre él.

Hacer el desglose real requeriría:
- Separar `saldoCapital` y `saldoIntereses` en el modelo.
- Saber la cuota inicial pactada (no es lo mismo que cuotaMensual actual si renegoció).
- Tener fecha de origen de la deuda.
- Recalcular cada mes el componente de intereses sobre el saldo capital.

Todo esto es un refactor mayor (migración v6 → v7, cambios en simulación, en validación, en tests). Y para el usuario común, la mental model es "pagué $200.000 y ahora debo $200.000 menos", no "pagué $200.000 de los cuales $35.000 fueron intereses". El sesgo introducido (saldoTotal cae un poco más rápido de lo "correcto") es amable: el usuario se siente más adelantado.

**Mejora futura opcional:** mostrar un desglose **informativo** debajo del input ("De este abono, ~$X se irían a intereses y ~$Y al capital"). Sin afectar el modelo. Se evalúa después de la feature base.

### 3. Compromiso saldado: visible con badge, no desaparece

Saldar una deuda es un momento celebratorio crítico para el hábito. Si la card desaparece sin más, el usuario pierde el feedback. La propuesta:
- Cuando `saldoTotal === 0`: badge "🎉 Saldada" reemplaza al chip de urgencia, oculta botón "Abonar", muestra botón "Archivar".
- Archivar = set `activo=false`. Sale de la lista y de las estrategias, queda en S para historial.
- La estrategia Avalancha/BN ya filtra con `saldoTotal > 0` en `filtrarDeudasPagables`, así que automáticamente la saldada deja de aparecer en cards de estrategia.

### 4. Permitir abonar menos, igual, o más que la cuota

Default del input: `compromiso.cuotaMensual`. El usuario puede ajustar. Validaciones:
- `monto > 0` (obligatorio).
- `monto <= saldoTotal` (cap automático: si excede, se ajusta al saldo y se avisa "Solo necesitabas $X. Registramos el abono por $X y la deuda queda saldada.").
- Sin restricción de `monto >= cuotaMensual`: el usuario manda en su realidad financiera.

---

## Consecuencias

### Positivas
- Cierra el loop compromisos ↔ tesorería ↔ gastos.
- La simulación de estrategia mejora con datos reales: cada abono actualiza `saldoTotal`, la próxima vez que el usuario abra estrategia ve cuánto le queda.
- El presupuesto de la categoría "Deudas" se llena automáticamente.
- El usuario tiene **un solo lugar** (Compromisos) donde gestiona pagos de deuda, en vez de dos (compromisos para ver, gastos para registrar).

### Negativas / Restricciones
- **Sesgo de saldoTotal:** se reduce ligeramente más rápido de lo "matemáticamente correcto" porque no separa intereses. Es amable pero hay que documentarlo.
  - *Mitigación:* tip informativo opcional en el modal con desglose estimado.
- **Glue code en gastos:** editar/eliminar un gasto con `compromisoId` debe ajustar el `saldoTotal` de la deuda. Añade complejidad en `gastos/index.js`.
  - *Mitigación:* funciones puras testeables en `compromisos/logic.js` (`aplicarAbonoASaldo`, `revertirAbonoDeSaldo`).
- **Dependencia dominio cruzada blanda:** Gastos no debe importar de Compromisos (la regla ADN dice "ningún dominio importa a otro"), pero ahora Gastos debe leer `S.compromisos[].saldoTotal` cuando edita/elimina un gasto con `compromisoId`.
  - *Mitigación:* la lectura ocurre vía `S` (no por import directo entre módulos). El handler de gasto lee `S.compromisos.find(c => c.id === gasto.compromisoId)` y aplica el delta. Sigue cumpliendo la regla literal (sin import cruzado) aunque haya acoplamiento de datos.
- **Agenda dependerá de S.gastos:** el badge "ya abonaste este mes" requiere que agenda cruce gastos con compromisos. Pequeño acoplamiento, vía S.
- **Tests existentes:** ninguno se rompe (campo opcional + funciones nuevas), pero hay que escribir suite nueva (estimado: 25 tests unitarios + 2 integración).

### Schema
- Sub schema v6 actual: no se sube versión.
- Cambio único: nuevo campo opcional `Gasto.compromisoId?: string`. Backwards-compatible. Sin migración.

---

## Alternativas rechazadas

### A1. Crear colección nueva `S.abonos[]` separada de gastos

**Por qué no:** Duplicaría la lógica de cuentaId, validación, edición, reversión, presentación. El usuario perdería visibilidad: los abonos no aparecerían en analytics de gastos, no contarían contra el presupuesto de "Deudas", no estarían en el listado mensual. Y nada se gana funcionalmente: un abono **es** un gasto categorizado.

### A2. Solo reducir `saldoTotal` sin tocar Gastos ni Cuentas

**Por qué no:** Rompe el invariante "toda salida de plata es un gasto". El saldo de la cuenta seguiría inflado falsamente. El usuario tendría que registrar el gasto por separado, duplicando trabajo y abriendo la puerta a inconsistencias (¿el abono lo registré como gasto o no?).

### A3. Refactor del modelo para separar capital de intereses

**Por qué no ahora:** Es un refactor mayor que requiere migración v7, cambios en validación, en simulación, en todos los tests de logic. La feature base (abonar) no lo necesita. Se puede agregar después como mejora incremental si la sobreestimación del saldo se vuelve un problema medido. **Cuándo reconsiderar:** si el usuario reporta que el saldoTotal queda en $0 antes de haber pagado todas las cuotas.

### A4. Abono solo en cuota exacta (sin extra ni parcial)

**Por qué no:** No matchea con la vida real ni con la simulación de estrategia (que ya soporta `extraMensual`). Restringir el monto sería peor UX que permitirlo libre.

### A5. Saldar la deuda implícitamente al llegar saldo 0 (set `activo=false` automático)

**Por qué no:** Pierde el momento de celebración. El usuario no ve la transición y queda confundido ("¿desapareció? ¿la borré sin querer?"). La acción de archivar manualmente da control + cierre psicológico.

---

## Plan de implementación

La feature se subdivide en 3 sub-tareas, **una por commit**, verificadas en la app antes de pasar a la siguiente:

### Sub-tarea 1: Modelo + lógica + tests unitarios
**Modelo:** Opus 4.7 - Alto (decisiones de schema, glue cross-domain).
**Alcance:**
- `core/state.js`: typedef `Gasto.compromisoId?: string`.
- `compromisos/logic.js`: `aplicarAbonoASaldo(saldoActual, monto)`, `revertirAbonoDeSaldo(saldoActual, monto)`, `validarAbono(datos, deuda, cuenta)`, `ajusteSaldoSiSatura(monto, saldoTotal)` (caps el abono al saldo y devuelve `{ montoAjustado, deudaSaldada }`).
- `gastos/logic.js`: extender `deltasPorEdicionDeGasto` para que cuando hay `compromisoId` también devuelva delta sobre `saldoTotal` de la deuda. O bien helper aparte `deltasPorEdicionDeAbono`.
- Tests unitarios: ~25 tests cubriendo cada función pura.

**No toca UI todavía.** El usuario aún no ve nada.

### Sub-tarea 2: UI del modal abono + acción
**Modelo:** Sonnet 4.6 - Alto (multi-archivo: HTML, view, index, modales).
**Alcance:**
- `index.html`: nuevo `<div id="modal-abono">` siguiendo el patrón de modal-cuenta.
- `compromisos/view.js`: nuevo `renderFormAbono(deuda)` con monto (default cuotaMensual), selector de cuenta, fecha (default hoy), nota opcional. Botón "Abonar" en card de cada deuda.
- `compromisos/index.js`: handlers `_abrirAbono(el)` y `_guardarAbono()`, registrar acciones, integrar al flujo de Gastos (crea el gasto vía `guardar('gastos', ...)` con `compromisoId`).
- `gastos/index.js`: en `_eliminarGasto` y `_guardarGasto` (edit), si el gasto tiene `compromisoId`, recalcular y aplicar delta al `saldoTotal` del compromiso.
- Estado "saldada": cuando `saldoTotal === 0`, mostrar badge + botón "Archivar".
- 2-3 tests de integración (flujo: crear deuda + cuenta → abonar → verificar gasto + saldos).

**Verificación obligatoria en la app antes de cerrar.**

### Sub-tarea 3: Refinamiento
**Modelo:** Sonnet 4.6 - Medio.
**Alcance:**
- Badge "✓ Ya abonaste este mes" en agenda cuando hay un gasto del mes con `compromisoId` que matchea.
- Tip en modal abono: "Tu cuota es $X. Si abonás $Y este mes, terminás Z meses antes." (cálculo trivial: rerun de la simulación con extra puntual).
- E2E smoke: abrir Compromisos, abonar una deuda, ver saldo reducido en Cuentas.

---

## Próxima revisión

Revisar esta decisión si:
- El usuario reporta que el saldoTotal llega a 0 antes de haber pagado todas las cuotas (señal de que el sesgo es problemático).
- Más del 30% de los usuarios usan la feature de abono y editan/eliminan abonos frecuentemente (señal de que el glue code en gastos se complica y vale la pena la colección separada).
- Aparece el requisito de mostrar historial de abonos por deuda en una vista dedicada (vista derivada de filtrar gastos por `compromisoId`, no requiere colección nueva).

---

## Pregunta abierta al usuario antes de implementar

1. **¿Está OK la decisión D2 (no desglosar capital vs intereses)?** Es la decisión con más sesgo. Alternativa: agregar el desglose **informativo** en el modal (sin afectar el modelo) ya en Sub-tarea 2.
2. **¿Está OK D4 (badge "Saldada" + archivar manual)?** Alternativa: archivar automático con un undo de 10 segundos.
3. **¿Querés que el botón diga "Abonar" o "Pagar cuota"?** "Abonar" es más colombiano y permite cualquier monto; "Pagar cuota" sugiere monto exacto.
