# Tablero - Mis cuentas (dominio `tesoreria`)

> Revisado: 2026-11-18.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `tesoreria`, mismo nombre que su ficha [`contexto/mis-cuentas.md`](../contexto/mis-cuentas.md)). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.
> **Estado: una iniciativa viva, MC.19 (tus llaves a un toque), abajo.** "Mis Cuentas v2" está completa: MC.13, MC.16, MC.17 (incluye MC.17f) y MC.18 en producción.

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
