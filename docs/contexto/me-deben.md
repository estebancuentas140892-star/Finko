# Ficha de contexto: Me deben

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Préstamos personales conectados a cuentas y patrimonio (dominio `personales`, PE.7)

- **Objetivo**          : registrar dinero que TÚ prestaste (espejo de `compromisos.deuda`, donde tú debes). Desde PE.7 el préstamo deja de vivir en paralelo al resto de la app: prestar **descuenta** la cuenta de donde salió el dinero, cobrar **acredita** la cuenta donde entró, y el capital pendiente cuenta como activo ("Por cobrar") en el patrimonio de Análisis.
- **Estado actual**     : estable. **PE.7 cerrada** (2026-07-22, hallazgo P5 de la auditoría de UX/producto: el dominio no tenía un solo `cuentaId` y obligaba al usuario a registrar un gasto "espejo" a mano para cuadrar el saldo). Antes: PE.1 (tasa opcional + reparto capital/interés, schema v21), PE.2 a PE.5 (estados humanizados). Pendiente: **PE.6** (intereses acumulados al cobrar, historial de abonos, rendimiento, confianza).
- **Verificado contra** : commit de PE.7 (2026-07-22). Primera ficha de esta sección.

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Alta de préstamo (descuenta la cuenta) | `modules/dominio/personales/index.js` | `_guardarPersonal()`, `_ajustarSaldoCuenta()` | ~40, ~33 |
| Cobro "Me pagaron" (acredita la cuenta) | `modules/dominio/personales/index.js` | `_confirmarPagoPersonal()` | ~95 |
| Eliminar préstamo (NO revierte, ver Riesgos) | `modules/dominio/personales/index.js` | `_eliminarPersonal()` | ~160 |
| Form de alta (selector de cuenta origen) | `modules/dominio/personales/view.js` | `renderFormPersonal()` | ~192 |
| Form de cobro (selector de cuenta destino) | `modules/dominio/personales/view.js` | `renderFormPagoPersonal()` | ~250 |
| Capital pendiente (base del activo "por cobrar") | `modules/dominio/personales/logic.js` | `calcularCapitalPendiente()` | ~53 |
| Interés pendiente (NO entra al patrimonio) | `modules/dominio/personales/logic.js` | `calcularInteresPendiente()` | ~71 |
| Desglose y aplicación de un pago | `modules/dominio/personales/logic.js` | `desglosarPago()`, `aplicarPago()` | ~394, ~424 |
| Validación / normalización del form | `modules/dominio/personales/logic.js` | `validarPersonal()`, `normalizarPersonal()` | ~319, ~352 |
| Total por cobrar (puro, alimenta el patrimonio) | `modules/dominio/personales/logic.js` | `calcularTotalPorCobrar()` | |
| Activo "Por cobrar" en el patrimonio | `modules/dominio/analisis/logic.js` | `calcularActivos()` (5.º parámetro `personales`), `generarResumen()` | ~47, ~175 |
| Bucket visual "Por cobrar" | `modules/dominio/analisis/view.js` | `_BUCKETS_ACTIVOS`, `_calcularDatosAnalisisMemo` | ~527, ~65 |
| Selector de cuenta compartido | `modules/infra/cuenta-helper.js` | `renderSelectorCuenta(cuentas, {label, name})` | ~45 |
| Schema del préstamo | `modules/core/state.js` | `S.personales[]` (`monto`, `pagado`, `tasa`, `capitalPagado`, `cuentaId`) | |

**Recursos**: estilos en `styles/components/domain.css` (`.personal-*`) y el selector compartido (`.cuenta-sel__*`); token de dominio `--fk-dom-personales`; bucket `patri-card__seg--porcobrar` en `analysis.css`.

**Dependencias y relaciones**: `personales` no importa de otros dominios (ADN 10); el descuento/crédito de cuenta se hace con `editar('cuentas', ...)` vía el helper local `_ajustarSaldoCuenta`, mismo patrón que D.14 en Compromisos y que los aportes de Apartados. `analisis/logic.js` sí importa `personales/logic.js`: es la única capa autorizada a cruzar dominios (declarado en su propio encabezado). El dominio NO emite `distribucion:aplicar` ni participa del asistente de distribución.

**Riesgos**:

- **La regla de oro del patrimonio: un activo solo se suma si el dinero SALIÓ de `cuentas`.** Está documentada en el docstring de `calcularActivos` y es la razón de que Metas y Apartados cuenten (descuentan al aportar) y el fondo de emergencia NO (su aporte no descuenta, su dinero ya está dentro de `cuentas`). **Por eso "por cobrar" solo suma préstamos con `cuentaId`**: en un préstamo sin cuenta vinculada (registro viejo, o el usuario prestó efectivo que Finko nunca vio) el dinero nunca salió de `cuentas` según Finko, y sumarlo lo contaría dos veces. No "arreglar" esto sumando todos los préstamos.
- **Las dos mitades de PE.7 están acopladas y no se podían separar en dos entregas.** Si prestar descontara la cuenta sin que exista el activo "por cobrar", el patrimonio del usuario CAERÍA al prestar (prestar no destruye riqueza, la convierte en un derecho de cobro). Cualquier cambio futuro debe conservar la identidad: al prestar $X con cuenta vinculada, `cuentas` baja $X y `porCobrar` sube $X, y el patrimonio neto no se mueve.
- **El interés pendiente NO entra al patrimonio, a propósito**: no se ha ganado ni cobrado, y contarlo inflaría el patrimonio con dinero incierto (el usuario puede perdonarlo, y el brief de PE.6 dice explícitamente que Finko sugiere pero el usuario decide). Solo el capital.
- **Eliminar un préstamo NO revierte los movimientos de cuenta**, a diferencia de D.14 en Deudas. Es una divergencia deliberada: una deuda D.14 acredita UNA vez al crearse (revertir es exacto), pero un préstamo es un flujo (desembolso + N abonos, posiblemente a cuentas distintas); revertir solo el desembolso sobre-acreditaría en cuanto hubiera un abono, y revertir el neto con fiabilidad necesita el **historial de abonos que planea PE.6b** (hoy solo existe el acumulador `pagado`). El copy del `confirmar()` ya lo dice ("Esto no devuelve el dinero, solo limpia el registro"). Al cerrar PE.6b, reevaluar.
- **`cuentaId` es opcional y sin backfill** (mismo criterio que MC.13d con `Ingreso.cuentaId`): asignar una cuenta a los préstamos viejos sería inventar un dato del usuario, y además rompería el patrimonio (sumaría como activo dinero que nunca salió). Sin bump de schema: campo aditivo ausente en registros previos, precedente `compromiso.icono` (CAT.2d) y `costoGMF` (MC.17d).
- **Con 0 cuentas activas el préstamo se registra igual**, como seguimiento puro sin `cuentaId` (mismo patrón 0/1/varias que Apartados: el registro nunca se bloquea por no tener cuentas).

**Cambios pendientes**: **PE.6** (intereses acumulados al cobrar, historial de abonos con bump, rendimiento, estados visuales, confianza) y **EDIT.1** (editar un préstamo; hoy corregir obliga a eliminar y recrear), ambas en `docs/BOARD.md`.

**Cambios realizados**:

- 2026-07-22 (**PE.7**, hallazgo P5 de la auditoría de UX/producto): el dominio se conecta al resto de la app. `Personal.cuentaId` opcional (`normalizarPersonal` lo incluye solo si viene con valor, patrón condicional de MC.13d; sin bump de schema). `renderFormPersonal()` gana el selector "¿De qué cuenta sale el dinero?" y `renderFormPagoPersonal()` el de "¿En qué cuenta entró el dinero?" (preselecciona la cuenta del préstamo). `_guardarPersonal()` descuenta el monto; `_confirmarPagoPersonal()` acredita `desglose.aplicado` (ya recortado al pendiente, así que escribir de más no infla el saldo); helper local `_ajustarSaldoCuenta` (copia intencional de D.14/Apartados, ADN 10). `calcularTotalPorCobrar()` nuevo en logic.js y 5.º parámetro `personales` en `calcularActivos`/`generarResumen`, más el bucket `totalPorCobrar` y su segmento `--porcobrar` en la barra de composición. **`personales` se agregó a las claves de memoización de `_calcularDatosAnalisisMemo`**: sin eso, prestar o cobrar no repintaría el patrimonio. **Dos hallazgos corregidos de paso**: `_nuevoPersonal` inyectaba el form una sola vez en el init, así que crear una cuenta después dejaba el selector invisible hasta recargar (ahora re-inyecta en cada apertura, patrón de `_nuevoApartado`); y `resetModal()` se retiró porque ponía `checked = false` en todos los radios (habría borrado la cuenta preseleccionada) y vaciaba los `value` del HTML, que era lo que dejaba en blanco la fecha del préstamo. 15 tests unitarios + 4 E2E nuevos. Verificado en la app real: prestar $400.000 bajó el saldo de $1.000.000 a $600.000 con el patrimonio neto intacto en $1.000.000; cobrar $150.000 lo subió a $750.000, patrimonio otra vez $1.000.000. Ver CHANGELOG.
