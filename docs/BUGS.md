# Registro de errores - Finko Claude

> Revisado: 2026-10-18.

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-10-17 (iniciativa HF, [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): entran BUG-029 a BUG-031; HF.0a cierra BUG-028, HF.0b cierra BUG-030 y abre BUG-032, HF.0h cierra BUG-032; entran BUG-033 y BUG-034 (Distribuir no identifica qué ocurrencias acredita); HF.0c cierra BUG-029; HF.0i cierra BUG-033 y BUG-034; HF.0d cierra BUG-031; HF.0e cierra BUG-025. 2026-10-18: el banco de perfiles de HF.0f encuentra BUG-035 a BUG-038, cada uno con su caso mínimo en `tests/integration/perfiles-reversas.test.js`; se cierra BUG-037. **4 abiertos.**
>
> **Patrón recurrente que conviene vigilar (cerrado 3 veces el 2026-08-01 y 2 el 2026-10-16, BUG-028 y un test de Inversión):** tests con **fechas fijas** o con un día derivado a módulo 28 se ponen rojos según el día en que se corran, casi siempre los primeros días del mes. La regla es derivar las fechas del reloj, y **fijar el reloj** (`vi.setSystemTime`) cuando el test afirma una distancia exacta o necesita un día ya pasado dentro del mes.

---

## Cómo registrar un error

```markdown
### BUG-NNN - <título corto>
- Estado    : pendiente | en proceso | solucionado
- Prioridad : alta | media | baja
- Problema  : qué se ve mal, con pasos para reproducirlo
- Causa     : causa raíz, si ya se identificó (si no, "sin investigar")
- Archivo   : ruta completa desde la raíz del proyecto
- Función   : función, componente o módulo afectado
- Líneas    : rango aproximado
- Secciones : secciones de la app afectadas
```

Numerar `BUG-001`, `BUG-002`... de forma consecutiva y sin reutilizar números aunque un error se elimine.

---

## Pendientes

### BUG-027 - ADR 059 no existe en el repositorio pese a estar citado como "aceptado" en 5 documentos vivos
- Estado    : pendiente
- Prioridad : media (no afecta el uso de la app; rompe la trazabilidad de la iniciativa INT.1)
- Problema  : `CHANGELOG.md`, `HANDOFF.md`, `board/transversal.md`, `contexto/transversal.md` y `DECISIONS/056-la-casa-de-ahorro.md` citan el ADR 059 como fuente de INT.1 (interfaz de escritorio), "aceptado 2026-08-02". El archivo no existe en disco ni en `git log --all`: nunca se commiteó, aunque INT.1a-h ya cerraron citándolo. Además lo citan 8 archivos de runtime en comentarios (`index.html`, `modules/ui/shell.js`, `styles/layout.css`, `styles/responsive.css` y otros), que no son enlaces y no se tocan.
- Causa     : sin investigar. Encontrado de paso al verificar numeración de ADR libre para GAS.2b (ADR 060), no por revisión de INT.1.
- Archivo   : `docs/DECISIONS/059-interfaz-de-escritorio.md` (inexistente). **Los enlaces rotos se neutralizaron el 2026-08-13** en los documentos vivos: la cita quedó en texto plano, con el patrón que ya usaba el [ADR 065](DECISIONS/065-ahorro-en-la-barra-inferior.md) ("se cita sin enlace porque su archivo no está en el repositorio"). El bug sigue abierto: falta el ADR, no el enlace.
- Función   : ninguna (documentación)
- Secciones : ninguna de la app (solo trazabilidad de INT.1, Transversal/escritorio)
- **Requiere decisión antes de tocarlo**: quien cerró INT.1a-h sabe si el ADR se perdió o nunca se escribió. Reconstruirlo desde los commits de INT.1 es trabajo de esa sesión, no un fix de una línea.

### BUG-035 - Borrar o editar el pago de un gasto fijo le escribe un saldo de deuda
- Estado    : pendiente
- Prioridad : baja (el dinero revierte bien; ningún lector suma `saldoTotal` de un fijo)
- Problema  : marcar pagado el arriendo y borrar ese gasto devuelve el dinero, pero el fijo queda con `saldoTotal` igual al monto, y el diálogo dice "sube de nuevo el saldo de Arriendo". Editar su monto escribe `saldoTotal: 0`.
- Causa     : `efectoEnDeuda()` trata todo gasto con `compromisoId` como abono sin mirar el tipo; `_ajustarSaldoDeuda()` escribe en cualquier compromiso.
- Archivo   : `modules/dominio/gastos/logic.js`, `modules/dominio/gastos/index.js`
- Función   : `efectoEnDeuda` (logic ~424); `_ajustarSaldoDeuda` (index ~557), `_efectosDeBorrar` (~455)
- Secciones : Gastos, Movimientos, Calendario

### BUG-036 - Distribuir paga lo del mes siguiente con fecha de hoy: ese mes queda pendiente y se puede pagar dos veces
- Estado    : pendiente
- Prioridad : alta (doble débito si el usuario confirma la hoja)
- Problema  : con salario el 25, Distribuir propone el arriendo del 3 del mes siguiente (ventana del cobro) y lo paga fechado el 25. Ese mes, el Calendario lo marca sin pagar, el motor avisa vencido y la hoja de automáticos vuelve a ofrecer el débito. El mes actual queda con dos pagos.
- Causa     : `_aplicarNecesidad()` registra cada necesidad con `fecha: hoy()`; `estadoPagoMes`, los avisos y la hoja leen el pago por el mes de su fecha.
- Archivo   : `modules/dominio/tesoreria/acciones/distribucion.js`
- Función   : `_aplicarNecesidad` (~783); ventana en `construirDesgloseNecesidades` (`logic/distribucion.js` ~100)
- Secciones : Mis cuentas (Distribuir), Calendario, Por pagar, avisos

### BUG-038 - Un abono o un pago de fijo no se puede corregir desde Movimientos
- Estado    : pendiente
- Prioridad : media
- Problema  : Movimientos ofrece "Editar" en todo gasto; en un abono ("Deudas") o un pago de fijo ("Gastos fijos") el formulario no tiene esa categoría marcada y no guarda ("Debes elegir una categoría"). Guardar exige recategorizar el pago.
- Causa     : las categorías internas no son chips del formulario; `_editarGasto` no encuentra el radio y `validarGasto` exige uno.
- Archivo   : `modules/dominio/movimientos/view.js`, `modules/dominio/gastos/index.js`
- Función   : `_ACCIONES_POR_TIPO` (view ~362); `_editarGasto` (index ~223-250)
- Secciones : Movimientos, Gastos
