# Tablero - Mis cuentas (dominio `tesoreria`)

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`, mismo nombre que su ficha [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md)). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: dos iniciativas vivas, MC.19 (tus llaves a un toque) y MC.20 (transferir y retirar), abajo.** "Mis Cuentas v2" está completa: MC.13, MC.16, MC.17 (incluye MC.17f) y MC.18 en producción.

---

> **Iniciativa MC.19 - Tus llaves a un toque** ([ADR 170](../DECISIONS/170-tus-llaves-a-un-toque.md), aceptada 2026-11-18). Fuente única de los datos para recibir dinero de una cuenta propia: varias llaves con los tipos de Bre-B, copiar y enmascarar. Cambia MC.14. Los datos de otras personas (parte 9b de la revisión) no van acá: esperan su propio ADR.

#### MC.19a - Varias llaves con los tipos de Bre-B
- Prioridad  : alta
- Estado     : pendiente
- Área       : code
- Objetivo   : ADR 170 D1 a D3 y D7: `datosTransferencia.llaves` (hasta 7), `TIPOS_LLAVE` con los nombres de Bre-B, formato por tipo al escribir, sin llaves repetidas entre cuentas, sin números de tarjeta (Luhn) y la migración de `llave`, `tipoLlave` y `alias`
- Riesgo     : la validación no puede bloquear editar una cuenta por una llave vieja; `form-errors.js` ata los mensajes a su campo por palabras (revisar `_CAMPOS`); la hoja sigue mostrando la primera llave hasta MC.19b
- Secciones  : Mis cuentas
- Archivos   : `modules/core/constants.js`, `modules/core/state.js`, `modules/core/storage.js`, `modules/dominio/tesoreria/logic/cuentas.js`, `modules/infra/form-errors.js`, `tests/unit/tesoreria.test.js`
- Depende de : nada
- Aceptación : unitarias de cada formato, de las dos reglas de rechazo y de la migración (llave con tipo, tipo vacío, "Alfanumérico", alias con y sin `@`, alias que repite una llave)
- Modelo     : capacidad estándar, esfuerzo medio

#### MC.19b - Copiar, enmascarar y el formulario de varias llaves
- Prioridad  : alta
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 170 D4 a D6: "Para recibir" con cada llave y el número, cada uno con Copiar; `infra/portapapeles.js` con respaldo; documento y número enmascarados hasta tocarlos; todo enmascarado con el ojo de Mis cuentas cerrado; el chip de escritorio copia; el formulario con "Agregar otra llave" y sin Alias
- Riesgo     : en el iPhone, la app instalada solo copia dentro del toque: probarlo con REV.3b; al cerrar, podar `contexto/mis-cuentas.md` (pasa de 40 KB, ADR 138 D4)
- Secciones  : Mis cuentas (hoja de la cuenta, tarjeta de escritorio, formulario de cuenta)
- Archivos   : `modules/dominio/tesoreria/views/cuentas.js` (`htmlDetalleCuenta`, `_labelDatosTransferencia`, formulario), `modules/dominio/tesoreria/acciones/cuentas.js`, `modules/infra/portapapeles.js` (nuevo), `modules/ui/toast.js`, `styles/`
- Depende de : MC.19a
- Aceptación : unitarias del helper con y sin Clipboard API; E2E a 390 px y en escritorio: una cuenta con celular y cédula muestra la cédula enmascarada, Copiar deja los 10 dígitos en el portapapeles y avisa, y con el ojo cerrado se enmascaran las dos
- Modelo     : capacidad estándar, esfuerzo medio

> **Iniciativa MC.20 - Transferir y retirar: a dónde fue el dinero** ([ADR 171](../DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md), aceptada 2026-11-18). Fuente única de cómo se registra el dinero que sale por transferencia o por cajero: sin canal (Bre-B, Transfiya, PSE), con el costo del retiro junto al 4x1000 y un selector que lleva "le transferí a alguien" al registro correcto. Amplía MC.17.

#### MC.20a - Retirar efectivo
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 171 D3 (sin la tarjeta) y D4 a D6: `Transferencia.comision` (sin migración); "Retirar efectivo" junto a "Transferir entre cuentas" en Mis cuentas, con destino Efectivo (la crea en $0 si no existe) y "¿Te cobraron por el retiro?"; la fila "Retiro de ..." en Movimientos con lo que costó; la nota de Transferir con su ejemplo nuevo
- Riesgo     : `calcularTransferencia`, `efectoEnCuenta`, el aviso de saldo y deshacer deben contar la comisión como cuentan el 4x1000, o la prueba de R-HF2 deja de cuadrar; la comisión no entra como gasto
- Secciones  : Mis cuentas, Movimientos
- Archivos   : `modules/core/state.js`, `modules/dominio/tesoreria/logic/transferencias.js`, `tesoreria/views/transferencias.js` y `acciones/transferencias.js`, `modules/dominio/movimientos/logic.js`, `modules/infra/deshacer.js`, `tests/unit/`
- Depende de : nada
- Aceptación : unitarias de la comisión en el cálculo, el efecto en la cuenta y el deshacer; E2E a 390 px: retirar $200.000 de una cuenta sin Efectivo crea Efectivo con $200.000, descuenta monto, 4x1000 y comisión, y Movimientos dice "Retiro de ..."
- Modelo     : capacidad estándar, esfuerzo medio

#### MC.20b - "Transferir o retirar" en la hoja de registrar
- Prioridad  : media
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 171 D2: la fila pasa a "Transferir o retirar" y aparece con una cuenta; su selector "¿A dónde fue el dinero?" lleva a Transferir, Retirar efectivo, Pagar varios (si hay algo pendiente este mes), Registrar gasto o Nuevo préstamo, cada opción solo cuando aplica
- Riesgo     : el selector reusa la vista de destinos de Abono y Aporte (`registrar-elegir-destino`), no una hoja nueva; `ui/registrar.js` no importa dominios (ADN 10)
- Secciones  : Registrar (botón central y barra de escritorio)
- Archivos   : `modules/ui/registrar.js`, `index.html` (la vista de destinos de la hoja), `tests/unit/registrar.test.js`
- Depende de : MC.20a
- Aceptación : unitarias de qué opciones salen según las cuentas y lo pendiente del mes; E2E: con una sola cuenta, "Le presté dinero" abre Nuevo préstamo
- Modelo     : capacidad estándar, esfuerzo bajo

#### MC.20c - La tarjeta como origen del retiro
- Prioridad  : baja
- Estado     : pendiente
- Área       : ambos
- Objetivo   : ADR 171 D3: en Retirar efectivo, las tarjetas con cupo en un grupo aparte; elegir una abre "Sacar un avance" (ADR 169) con el monto y Efectivo ya puestos
- Riesgo     : no se transfiere con cupo (ADR 051 D4): la tarjeta solo enruta al avance, nunca guarda una transferencia
- Secciones  : Mis cuentas, Por pagar
- Archivos   : `modules/dominio/tesoreria/views/transferencias.js`, `modules/infra/cuenta-helper.js`
- Depende de : MC.20a y AVC.1b
- Aceptación : E2E: elegir la tarjeta en Retirar efectivo abre Sacar un avance con el monto escrito
- Modelo     : capacidad estándar, esfuerzo bajo
