# Ficha de contexto: Mis cuentas

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Cuentas (dominio `tesoreria`, subsistema cuentas)

- **Objetivo**          : registro de las cuentas del usuario (banco, billetera digital, efectivo, otro) con saldo, cuota de manejo opcional (genera un Compromiso fijo mensual vinculado), GMF (4x1000) opcional, y desde MC.14 datos de transferencia opcionales para consulta rápida. Es la fuente de verdad del saldo total mostrado en Inicio.
- **Estado actual**     : estable. **MC.14** (2026-07-11): cada cuenta admite guardar, opcional, número de cuenta, llave de transferencia + su tipo, y alias, como punto de consulta rápida (Finko no ejecuta transferencias). **MC.15a** (2026-07-11): la tarjeta de la lista ya no repite "Banco de Bogotá · Ahorros" debajo de "Banco de Bogotá Ahorros" cuando el nombre es el autogenerado (el caso normal); en ingresos fijos, la categoría se omite del subtítulo cuando coincide con la descripción. Quedan MC.15b/c/d de la misma iniciativa (ver Cambios pendientes).
- **Verificado contra** : commit de MC.15a (2026-07-11).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Schema de la cuenta | `modules/core/state.js` | `@typedef Cuenta`, `@typedef DatosTransferencia` (MC.14) | ~19 |
| Consultas (activas, total) | `modules/dominio/tesoreria/logic/cuentas.js` | `cuentasActivas()`, `calcularTotalCuentas()` | ~30, ~40 |
| Validación del formulario | `modules/dominio/tesoreria/logic/cuentas.js` | `validarCuenta()` | ~53 |
| Cuota de manejo (opcional, genera Compromiso vinculado) | `modules/dominio/tesoreria/logic/cuentas.js` | `parseCuotaManejo()`, `compromisoDesdeCuotaManejo()`, `compromisoCuotaManejoDeCuenta()` | ~116, ~165 |
| GMF / 4x1000 | `modules/dominio/tesoreria/logic/cuentas.js` | `calcularCostoGMF()`, `detectarNudgeGMF()` | |
| Datos de transferencia (MC.14, opcional) | `modules/dominio/tesoreria/logic/cuentas.js` | `parseDatosTransferencia()` | ~139 |
| Normalización (form crudo → shape de `S.cuentas`) | `modules/dominio/tesoreria/logic/cuentas.js` | `normalizarCuenta()` | ~133 |
| Lista de cuentas + tarjeta individual | `modules/dominio/tesoreria/views/cuentas.js` | `renderListaCuentas()`, `_renderCuentaItem()` | ~23, ~37 |
| Hint de datos de transferencia en la tarjeta (MC.14) | `modules/dominio/tesoreria/views/cuentas.js` | `_formatDatosTransferencia()` | ~79 |
| Formulario del modal (crear/editar) | `modules/dominio/tesoreria/views/cuentas.js` | `renderFormCuenta()` | ~98 |
| Handlers de guardar/editar/eliminar | `modules/dominio/tesoreria/acciones/cuentas.js` | `_guardarCuenta()`, `_editarCuenta()`, `_eliminarCuenta()` | ~72, ~144, ~215 |
| Toggle de campos condicionales según clase de banco | `modules/dominio/tesoreria/acciones/cuentas.js` | `_toggleCamposPorClase()`, `_toggleCuotaFieldset()`, `_toggleTransferenciaFieldset()` (MC.14) | ~287 |
| Wiring del form (submit, toggles, bank-picker) | `modules/dominio/tesoreria/acciones/cuentas.js` | `inyectarFormCuenta()` | ~246 |
| Catálogos: tipos de cuenta, tipos por clase, tipos de llave (MC.14) | `modules/core/constants.js` | `TIPOS_CUENTA`, `TIPOS_POR_CLASE`, `TIPOS_LLAVE` | ~371, ~387, ~394 |

**Recursos**: estilos en `styles/components/*.css` (buscar `.list-item`, `.cuota-fieldset`, `.form-group--checkbox`, `.bank-picker__*`); avatares de banco vía `infra/bancos.js` (`bancoAvatar`); catálogo de entidades `BANCOS_CO` en `core/constants.js` (campo `clase`: `banco` | `billetera` | `efectivo` | `otro`, determina qué campos del form se muestran).

**Dependencias y relaciones**: `tesoreria/logic/cuentas.js` es puro (sin `S`, sin DOM). `acciones/cuentas.js` usa `infra/crud.js` (`guardar`/`editar`/`eliminar`) para `S.cuentas` y, cuando hay `cuotaManejo`, sincroniza un `Compromiso` fijo vinculado en `S.compromisos` (`_sincronizarCuotaManejo`, único cruce de dominio permitido aquí, vía `infra/crud.js` no vía import directo de `compromisos/logic.js`). Otros dominios leen `S.cuentas` para acreditar/descontar saldo (`compromisos` D.14, `tesoreria` ingresos NAV.A1, `gastos`, abonos) siempre vía `editar('cuentas', ...)` de `infra/crud.js`, nunca importándose entre sí (ADN 10).

**No existe una vista de "detalle de cuenta" separada**: la tarjeta de `_renderCuentaItem()` en la lista (`#lista-tesoreria`) es el único lugar donde se ve una cuenta fuera del formulario de edición. Los datos opcionales (cuota de manejo, GMF, y desde MC.14 los de transferencia) se comunican como hints de una línea dentro de esa misma tarjeta, no en una pantalla propia.

**Riesgos**:

- **MC.14, ningún campo nuevo requiere bump de `SCHEMA_VERSION`**: `datosTransferencia` es opcional y `undefined`-safe en registros existentes (mismo precedente que `cuotaManejo`/`aplica4x1000`, que tampoco tienen entrada en `_migrate()`). Si en el futuro alguno de estos campos necesitara un valor por defecto distinto de "ausente", ahí sí hace falta migración con backfill.
- **`datosTransferencia` se oculta completo para cuentas tipo Efectivo** (`_toggleCamposPorClase()`, MC.14): el efectivo no tiene número de cuenta ni llave a la que consignar. Si el usuario cambia el banco/billetera de una cuenta que YA tenía datos de transferencia guardados hacia una entidad de clase `efectivo`, el toggle se desmarca y el fieldset se oculta en el form, pero los datos anteriores no se borran del objeto guardado hasta que el usuario guarde el formulario (mismo comportamiento que `cuotaManejo` ya tenía, no es una regresión nueva).
- **`parseDatosTransferencia()` devuelve `null` si el toggle está activo pero todos los campos quedan vacíos tras el `trim()`**: evita guardar un objeto de referencia inútil (`{}` o con solo espacios). El toggle en sí no se persiste, solo su efecto (el objeto o `null`).
- **La regla `llave` requiere `tipoLlave`, pero `numeroCuenta`/`alias` no exigen nada entre sí**: si se agrega un campo nuevo a `DatosTransferencia` en el futuro, decidir explícitamente si necesita esa misma clase de validación cruzada o si es independiente, no asumir.

**Cambios pendientes**: **MC.13** (Distribución v2), **MC.15b** (legibilidad de logos: Davivienda, BBVA, DaviPlata, Nubank, solo contenedor), **MC.15c** (aviso de costos periódicos al crear cuenta), **MC.15d** (orden categoría→descripción en ingreso puntual, coordina con CAT.4 aún sin cerrar), **MC.16** (tarjeta de crédito integrada, requiere ADR) y **MC.17** (transferencias entre cuentas propias) siguen pendientes en `docs/BOARD.md`, todos dentro de la iniciativa "Mis Cuentas v2".

**Cambios realizados**:

- 2026-07-11 (MC.15a): en `tesoreria/views/cuentas.js`, `_renderCuentaItem()` deja de mostrar el subtítulo "banco · tipo" cuando `cuenta.nombre` es el autogenerado por `_autoNombre(banco, tipo)` (el caso normal hoy: el form no ofrece un campo de nombre propio), comparando ambos textos normalizados (trim + lowercase); si el nombre es explícito y difiere (soportado por `normalizarCuenta()` aunque el form actual no lo exponga), el subtítulo se conserva porque sí aporta información nueva. En `tesoreria/views/ingresos.js`, `_renderIngresoItem()` omite la categoría del subtítulo cuando coincide (normalizada) con la descripción del ingreso fijo (ej. descripción "Salario mínimo" + categoría "Salario mínimo" → subtítulo solo "Quincenal"); si difieren, conserva ambas como antes. 5 tests nuevos en `tests/unit/tesoreria.test.js`. 2337/2337 unit verdes. SW v346 → v347.

- 2026-07-11 (MC.14): cada cuenta admite, opcional, número de cuenta, llave de transferencia (con su tipo: Celular/Correo/Documento/Alfanumérico/Otro) y alias, agrupados detrás de un toggle "Guardar los datos que compartes cuando alguien te va a consignar" (mismo patrón de fieldset colapsable que la cuota de manejo). Nuevo catálogo `TIPOS_LLAVE` en `core/constants.js`. `parseDatosTransferencia()` (nuevo, `logic/cuentas.js`) construye el objeto final, `null` si el toggle está apagado o si quedó vacío tras recortar espacios; `validarCuenta()` exige `tipoLlave` cuando hay `llave`. Se muestra como un hint compacto (🔑) en la tarjeta de la lista, igual que los hints existentes de cuota de manejo y GMF. El bloque se oculta para cuentas de clase `efectivo` (sin número de cuenta ni llave que aplique). Sin bump de `SCHEMA_VERSION` (campos opcionales, `undefined`-safe, mismo precedente que `cuotaManejo`/`aplica4x1000`). 18 tests nuevos en `tests/unit/tesoreria.test.js` (validación, parseo, normalización, render del form, render del hint). 2325/2325 unit + 162/162 E2E verdes (1 flake preexistente en `#distribuir-ingreso-panel`, no relacionado, confirmado 3/3 en aislamiento). Primer análisis a fondo de la sección, ficha nueva.
