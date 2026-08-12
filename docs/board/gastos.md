# Tablero satélite: Gastos (dominio `gastos`)

> Revisado: 2026-08-11.

> Tarjetas vivas de la sección Gastos. Índice y reglas del tablero en [`../BOARD.md`](../BOARD.md); contexto técnico en [`../contexto/gastos.md`](../contexto/gastos.md).
> Creado: 2026-08-10, al triar la ficha 22 del handoff de Claude Design.
> **Estado: GAS.2a, GAS.2b y GAS.2c cerradas.** GAS.2c cerrada el 2026-08-11: Esteban aprobo activarla.

---

## Origen

Handoff de Claude Design, proyecto `f20729a0-6459-4181-9066-e8f7cd1d26da`, archivo `22 Formulario de Gasto.dc.html`. Decisión de la ficha: **Modificar**. El formulario no se toca: cambia solo la confirmación posterior al guardado.

Hallazgos de la ficha:

| Id | Hallazgo | Severidad |
|---|---|---|
| X1 | La confirmación no muestra la consecuencia que Finko ya calculó | Alto |
| X2 | Guardar devuelve al origen aunque el origen no muestre el gasto recién creado | Medio |

La ficha resuelve los dos con un solo cambio: la confirmación pasa de una línea genérica a dos, la segunda solo cuando hay algo que decir.

---

## Verificación del handoff contra el código

Antes de planear, se contrastó cada supuesto de la ficha con el repositorio. Cuatro correcciones y dos pendientes cerrados.

### C1. El toast no existe. Es el cambio más grande del plan

La ficha afirma "el toast ya existe, ya tiene cola y ya se muestra tras guardar" y dibuja «Gasto registrado». **Falso.** Hoy, tras guardar:

```js
// modules/dominio/gastos/index.js:167-169
renderListaGastos();
updSaldo();
announce(idEdit ? 'Gasto actualizado.' : 'Gasto guardado correctamente.');
```

`announce()` ([`modules/infra/a11y.js:33`](../../modules/infra/a11y.js)) escribe en una live region `sr-only`: **solo lo oye un lector de pantalla, nadie lo ve**. La cadena "Gasto registrado" no existe en `modules/`.

El único toast visual de la app es `.logro-toast`, propiedad del dominio `logros` ([`modules/dominio/logros/index.js:117`](../../modules/dominio/logros/index.js), CSS en `styles/components/nudges.css:164`). Por ADN 10 no se importa desde `gastos`.

**Consecuencia para el plan:** X1 y X2 no se resuelven "añadiendo una línea". Hay que construir un toast compartido. Piezas reutilizables que sí existen:

| Pieza | Dónde | Estado |
|---|---|---|
| `@keyframes toastIn` / `toastOut` | `styles/base.css:184` | ya globales, conservadas a propósito desde IN.5 |
| `--fk-z-toast: 300` | `styles/tokens.css:269` | ya existe |
| Patrón completo (cola, hover pausa, cierre, `role="status"`) | `modules/dominio/logros/index.js:97-175` | referencia a copiar, no a importar |

### C2. Los chips de categoría son SVG del sprite, no emoji

Pendiente que la ficha dejó abierto ("una de las dos reproducciones es infiel y no pude comprobar cuál"). **Resuelto:** `renderFormGasto()` pinta `<use href="#...">` resuelto por `iconoDeCategoriaGasto()` ([`modules/dominio/gastos/view.js:606-616`](../../modules/dominio/gastos/view.js)). La ficha 22 es fiel; **la ficha 12 (Límites), que los dibuja con emoji, es la infiel**.

### C3. No existe mapeo categoría a grupo financiero

Segundo pendiente de la ficha. **Resuelto:** `GRUPO_POR_SECCION` ([`modules/core/constants.js:834`](../../modules/core/constants.js)) mapea **sección**, no categoría. No hay tabla categoría a grupo en ninguna parte. Confirma la decisión de la ficha de dejar el grupo del plan fuera del toast: no es que compita, es que habría que inventar el mapeo.

### C4. La consulta cross-domain ya tiene precedente escrito

La ficha marca esto como "la única parte que no es copia" y pide decidir el enrutado sin romper ADN 10. El precedente ya está en el código:

```js
// modules/dominio/presupuesto/logic.js:13
import { gastosMes } from '../gastos/logic.js';
// modules/dominio/analisis/logic.js:12,14
import { ... } from '../gastos/logic.js';
import { calcularTotalCuentas } from '../tesoreria/logic.js';
```

ADN 10 se cumple hoy así: **ningún dominio importa el `index.js` de otro** (nada de acciones, wiring ni efectos ajenos). El `logic.js` puro sí se comparte. Hay además el precedente contrario de `iconoDeCategoriaGasto()`, que se subió a `core/constants.js` justamente "para que `gastos/` y `movimientos/` lo importen sin violar ADN 10" (ver [`contexto/gastos.md`](../contexto/gastos.md) línea 99).

Dos rutas válidas:

| Ruta | Qué implica | Veredicto |
|---|---|---|
| **A.** `gastos/index.js` importa `calcularProgreso` + `UMBRAL_*` de `presupuesto/logic.js` y se los pasa como parámetro a la función pura de `gastos/logic.js` | 1 import nuevo, cero refactor, sigue la convención ya escrita | **recomendada** |
| B. Subir `calcularProgreso` a `infra/` (como hizo `infra/bolsas.js` con las cuatro copias de progreso) | toca `presupuesto`, su `view.js` y sus tests sin necesitarlo esta tarea | fallback si Esteban quiere estrictez literal de ADN 10 |

**Por qué el import va en `index.js` y no en `logic.js`:** `presupuesto/logic.js` ya importa `gastosMes` de `gastos/logic.js`. Hacer el import inverso en `gastos/logic.js` cerraría un ciclo `gastos/logic <-> presupuesto/logic`. `gastos/index.js` no participa de ese ciclo, y `logic.js` sigue sin conocer a presupuesto: recibe el progreso ya calculado.

### C5. Casos que la ficha no cubre

| Caso | Qué pasa hoy | Qué decidir |
|---|---|---|
| Gasto repartido entre varias cuentas (`splits.length > 1`, `index.js:151-160`) | se crea un registro por cuenta | la línea 3 nombra una cuenta: ¿cuál? Propuesta: omitir la línea de saldo y caer al caso "nada que decir" |
| Consumo con tarjeta (`base.consumoTC`, `index.js:121-129`) | no sale de ninguna cuenta, sube el saldo de la tarjeta | la línea 3 (saldo de cuenta) no aplica; las de límite sí |
| Edición de un gasto existente (`idEdit`) | mismo formulario, lógica de deltas | la ficha solo habla de creación. Propuesta: en edición, toast de una línea |
| Ojo de privacidad (`S.config.ocultarSaldo`) | enmascara montos en toda la app | la ficha lo nombra en el caso "nada": con el ojo activo, no hay cifra que enseñar. Aplica a las dos líneas |

---

## Plan por rebanadas

Tres rebanadas, cada una commiteable y verificable por separado. **Ninguna toca el formulario.**

### GAS.2a - Toast compartido de la app

- Prioridad  : media
- Estado     : **CERRADA (2026-08-10)**. Ver `contexto/gastos.md`, bloque "Confirmación tras guardar", y el CHANGELOG del mes.
- Área       : ambos (componente visual nuevo + infraestructura de UI)
- Objetivo   : que la app tenga un aviso visual efímero reutilizable, hoy inexistente fuera de Logros.
- Secciones  : Transversal (lo estrena Gastos)
- Depende de : nada

**Pasos**

1. Crear `modules/ui/toast.js`: `mostrarToast({ titulo, detalle, tono, icono })`, con cola de uno en uno, `role="status"`, pausa en hover y cierre manual. Copiar el patrón de `logros/index.js:97-175`, **no importarlo**.
2. `tono`: `'ok' | 'alerta' | 'peligro'`, mapeado a tokens `--fk-*` existentes. Cero color hardcodeado (regla 5 de CLAUDE.md).
3. CSS en `styles/components/nudges.css`, junto al bloque LOGRO TOAST, reusando `@keyframes toastIn`/`toastOut` de `base.css` y `--fk-z-toast`.
4. Respetar `bottom: calc(var(--fk-space-6) + env(safe-area-inset-bottom, 0px))` y el margen sobre la barra inferior, igual que `.logro-toast`.
5. Estrenarlo en `_guardarGasto()` con **solo la línea 1**: `«Mercado $182.400»` en creación, `«Gasto actualizado»` en edición. `announce()` se conserva: el toast no reemplaza la live region, la acompaña.
6. Tests: unit del armado del texto; E2E de que el toast aparece tras guardar y desaparece solo.

**Qué resuelve:** X2 completo (la prueba de que se guardó, sin cambiar de pantalla).

**Archivos**: `modules/ui/toast.js` (nuevo), `modules/dominio/gastos/index.js`, `modules/dominio/gastos/logic.js`, `styles/components/nudges.css`, `tests/unit/gastos.test.js`, `tests/e2e/smoke.test.js`.

---

### GAS.2b - La segunda línea: qué cambió con ese gasto

- Prioridad  : media
- Estado     : **CERRADA (2026-08-10)**. Ver `contexto/gastos.md`, bloque "Confirmación tras guardar", CHANGELOG del mes y [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md).
- Área       : ambos
- Objetivo   : que la confirmación diga la consecuencia que Finko ya calculó, y solo cuando exista.
- Depende de : GAS.2a

**Prioridad fija (de la ficha, verbatim)**

| # | Condición | Texto | Tono |
|---|---|---|---|
| 1 | Un límite quedó excedido | «Te pasaste $22.400 del límite de Mercado este mes.» | peligro |
| 2 | Un límite pasó del 75 % | «Te quedan $17.600 en Mercado este mes.» | alerta |
| 3 | Ni lo uno ni lo otro | «Quedan $1.957.600 en Bancolombia.» | ok, neutro |
| 4 | Nada de lo anterior, o el ojo de privacidad activo | sin segunda línea | ok |

**Pasos (implementados; una corrección menor sobre el plan original)**

1. Función pura nueva en `modules/dominio/gastos/logic.js`:
   `consecuenciaDeGasto({ progreso, categoria, saldoCuenta, nombreCuenta, ocultarSaldo })` devuelve `{ texto, tono } | null`. Sin DOM, sin leer `S` (regla ADN 9). Firma final distinta a la planeada (`{ gasto, progresoCategoria, cuenta, ocultarSaldo }`): más plana, sin objetos anidados que la función tendría que desarmar.
2. `gastos/index.js` importa `calcularProgreso` de `../presupuesto/logic.js` (ADR 060), calcula el progreso de la categoría del gasto **después** de persistirlo y se lo pasa a la función pura. **Corrección sobre el plan**: no se importan `UMBRAL_ALERTA`/`UMBRAL_EXCEDIDO`. `calcularProgreso()` ya devuelve `estado` ('ok'/'alerta'/'excedido') calculado con esos umbrales, así que la función pura solo lee `estado`, sin comparar de nuevo contra un umbral. Menos superficie de import, mismo resultado.
3. Casos de C5: repartido y consumo con tarjeta pasan `saldoCuenta: null` (sin cuenta única), pero el aviso de límite (prioridad 1/2) sigue aplicando; edición no llama a la función en absoluto (toast de una línea).
4. Tests unit: los 4 casos de la tabla, más repartido/`consumoTC` (mismo caso, sin cuenta), más ojo de privacidad, más categoría sin presupuesto.
5. Verificado en la app real los 4 casos con datos reales (ver CHANGELOG).

**Qué resuelve:** X1.

**Archivos**: `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`, `tests/unit/gastos.test.js`, `docs/DECISIONS/060-lectura-cross-domain-de-solo-lectura.md` (nuevo), `docs/BUGS.md` (BUG-027, hallazgo de paso).

---

### GAS.2c - Extender a los otros formularios

- Prioridad  : baja
- Estado     : **CERRADA (2026-08-11)**. Esteban aprobo activarla. Ver [ADR 062](../DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md) y `contexto/gastos.md`.
- Objetivo   : misma confirmación en Abono (cuánto queda de la deuda) y Aporte (cuánto falta para la meta).
- Depende de : GAS.2b cerrada

Regla de la ficha, adoptada tal cual: dos formularios más la necesitaban, asi que dejo de ser un arreglo local y paso a ser una regla de confirmacion con ADR propio (ADR 062).

**Implementado:**

1. `consecuenciaDeAbono({ saldaDeuda, saldoRestante, ocultarSaldo })` en `modules/dominio/compromisos/logic/abonos.js`: prioridad deuda saldada > saldo restante.
2. `consecuenciaDeAporte({ completada, faltante, ocultarSaldo })` en `modules/dominio/metas/logic.js`: prioridad meta completada > cuanto falta.
3. `_guardarAbono()` (`compromisos/index.js`) y `_guardarAbonoMeta()` (`metas/index.js`) importan `mostrarToast` y sustituyen su `announce()` final por el toast, mismo patron de GAS.2a.

**Qué resuelve:** generaliza X1/X2 a Abono y Aporte.

**Archivos**: `modules/dominio/compromisos/index.js`, `modules/dominio/compromisos/logic.js`, `modules/dominio/compromisos/logic/abonos.js`, `modules/dominio/metas/index.js`, `modules/dominio/metas/logic.js`, `tests/unit/compromisos.test.js`, `tests/unit/metas.test.js`, `docs/DECISIONS/062-toast-de-consecuencia-en-abono-y-aporte.md` (nuevo).

---

## Decisiones abiertas (no se ejecuta sin la palabra de Esteban)

Las cuatro originales quedaron resueltas al cerrar GAS.2a y GAS.2b. Ninguna queda pendiente para GAS.2c: si esa rebanada se activa alguna vez, hereda el ADR 060 y el patrón del toast tal cual, sin decisiones nuevas de arquitectura.

1. ~~**¿ADR o no?**~~ **Resuelta al cerrar GAS.2b: sí.** [ADR 060](../DECISIONS/060-lectura-cross-domain-de-solo-lectura.md) precisa ADN 10: ningún dominio importa el `index.js`/`view.js`/`acciones/*.js` de otro; un `logic.js` puro sí puede importarse entre 1-2 dominios (a partir del tercero, sube a `core/`/`infra/`).
2. ~~**Numeración del ADR**~~ **Resuelta: 060.** Verificado contra el repo, no adivinado: el 059 está reservado (citado como "aceptado" en 7 documentos de la iniciativa INT.1) aunque su archivo no exista (**BUG-027**, ajeno a esta tarjeta); el 060 no tenía ninguna referencia en ningún lado y quedó libre para este ADR; el 061 ya existe.
3. ~~**¿El toast reemplaza a `announce()`?**~~ **Resuelta al cerrar GAS.2a: sí.** `_guardarGasto()` retiró el `announce()` de esa ruta; el toast (`role="status"`) es ahora el único aviso, igual que `.logro-toast`. `announce()` se conserva intacto en los otros dos call sites del dominio (prellenado de sugerencia, borrado).
4. ~~**Enganche en el tablero**~~ **Resuelta al cerrar GAS.2a.** `GAS.2c` (diferida) vive en el índice de `BOARD.md` y en su sección "Gastos"; la fila de Gastos se retiró de "Secciones sin tarjetas pendientes".

---

## Lo que la ficha decidió NO cambiar, y se respeta

- El orden de los campos: coincide con el orden en que se recuerda un gasto.
- Volver al contexto de origen tras guardar (ya decidido en la ficha 21).
- Preseleccionar la cuenta más usada: un gasto cargado a la cuenta equivocada por inercia es peor que un toque más.
- Añadir el grupo del plan al toast (además, C3: el mapeo no existe).
- Los siete bloques, la revelación progresiva de cuotas y avance, el aviso de sobrecupo en vivo, la validación agrupada y el estado vacío sin cuentas.
