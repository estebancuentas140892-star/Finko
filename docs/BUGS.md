# Registro de errores - Finko Claude

> Revisado: 2026-10-17.

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-10-17 (iniciativa HF, [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): entran BUG-029 a BUG-031; HF.0a cierra BUG-028, HF.0b cierra BUG-030 y abre BUG-032, HF.0h cierra BUG-032; entran BUG-033 y BUG-034 (Distribuir no identifica qué ocurrencias acredita). **6 abiertos.**
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

### BUG-034 - Distribuir propone y acredita un cobro que una distribución anterior ya acreditó
- Estado    : pendiente (HF.0i). Prioridad alta: crea dinero
- Problema  : Salario de prueba (4.000.000, día 15) y Honorarios de prueba (1.000.000, día 25), mensuales. Distribuir el 26 de septiembre acredita 5.000.000 (llegaron los dos). Distribuir el 16 de octubre propone otra vez 5.000.000 aunque solo llegó el salario, y confirmarlo deja el total en +10.000.000 con 9.000.000 recibidos. Reproducido con E2E temporal y reloj fijo el 2026-10-17.
- Causa     : el monto por defecto es `montoCobroPrincipal()`, la suma de las plantillas de la frecuencia principal, y `montoYaAcreditadoDelCobro()` solo descuenta los `IngresoPuntual` de la hoja. Los honorarios del 25 de septiembre siguen siendo "su último cobro" el 16 de octubre y nada recuerda que ya se distribuyeron (desde HF.0h están en `cobrosDistribuidos`, pero nadie lo lee al acreditar). Existe desde MC.13; HF.0h no lo introdujo.
- Archivo   : `modules/infra/vencimientos.js` (`montoCobroPrincipal`), `tesoreria/views/distribucion.js` (`montoCobro`), `tesoreria/logic/distribucion.js` (`montoYaAcreditadoDelCobro`), `tesoreria/acciones/distribucion.js` (`_confirmarDistribucion`)
- Secciones : Mis cuentas (asistente)

### BUG-033 - Distribuir con el monto editado da por recibidos ingresos que no puede identificar
- Estado    : pendiente (HF.0i). Prioridad alta: oculta un ingreso que no llegó
- Problema  : Salario de prueba (4.000.000) y Honorarios de prueba (1.000.000), mensuales, día 15, crédito automático. Se pospone la hoja, Distribuir propone 5.000.000 y se edita a 4.000.000 porque solo llegó el salario. Se acreditan 4.000.000, pero quedan sellados los dos ingresos y al recargar la hoja ya no ofrece los honorarios. Reproducido con E2E temporal y reloj fijo el 2026-10-17.
- Causa     : `_confirmarDistribucion()` sella todo `cobrosQueAcreditaLaDistribucion()` siempre que `acreditar > 0`. Con dos o más ingresos en el cobro y el monto editado, ningún dato dice cuál llegó. Con un solo ingreso la identidad sí es segura.
- Archivo   : `modules/dominio/tesoreria/acciones/distribucion.js` (bloque "El otro sentido" de `_confirmarDistribucion`), `tesoreria/logic/distribucion.js`
- Secciones : Mis cuentas (asistente), Calendario (hoja)

### BUG-031 - "compromiso próximo" avisa lo ya pagado y fecha sin la frecuencia
- Estado    : pendiente (HF.0d). Prioridad media
- Problema  : un fijo con `diaPago` 18 pagado el 15 sigue en "Próximas prioridades" y en el aviso hasta el 18 (el 17 puede notificar). Un bimestral sale todos los meses, con otra fecha que en el Calendario.
- Causa     : `compromisosProximos()` no recibe gastos y `proximoVencimiento()` solo mira `diaPago`; el Calendario usa `ocurrenciasEnMes()` (ADR 041).
- Archivo   : `compromisos/logic/modelo.js` (`proximoVencimiento`, `compromisosProximos`); consumidores `compromisos/views/dashboard.js`, `infra/avisos.js`
- Secciones : Inicio, Por pagar, notificación

### BUG-029 - el importador CSV de gastos crea dinero al borrar y no reimporta lo que exporta
- Estado    : pendiente (HF.0c). Prioridad alta: rompe la I3 del ADR 053. Decidido (P4 del ADR 091): el importado no toca el saldo
- Problema  : importar con columna `cuenta` guarda `cuentaId` sin descontar; borrar o editar ese gasto devuelve el monto. Y el export deja `descripcion` vacía, que el import exige.
- Causa     : `_confirmarImport()` solo llama `guardar()`; borrar siempre reembolsa.
- Archivo   : `import/index.js`, `import/logic.js`, `gastos/index.js`, `export/logic.js` (`gastosACSV`)
- Secciones : Ajustes, Gastos

### BUG-027 - ADR 059 no existe en el repositorio pese a estar citado como "aceptado" en 5 documentos vivos
- Estado    : pendiente
- Prioridad : media (no afecta el uso de la app; rompe la trazabilidad de la iniciativa INT.1)
- Problema  : `CHANGELOG.md`, `HANDOFF.md`, `board/transversal.md`, `contexto/transversal.md` y `DECISIONS/056-la-casa-de-ahorro.md` citan el ADR 059 como fuente de INT.1 (interfaz de escritorio), "aceptado 2026-08-02". El archivo no existe en disco ni en `git log --all`: nunca se commiteó, aunque INT.1a-h ya cerraron citándolo. Además lo citan 8 archivos de runtime en comentarios (`index.html`, `modules/ui/shell.js`, `styles/layout.css`, `styles/responsive.css` y otros), que no son enlaces y no se tocan.
- Causa     : sin investigar. Encontrado de paso al verificar numeración de ADR libre para GAS.2b (ADR 060), no por revisión de INT.1.
- Archivo   : `docs/DECISIONS/059-interfaz-de-escritorio.md` (inexistente). **Los enlaces rotos se neutralizaron el 2026-08-13** en los documentos vivos: la cita quedó en texto plano, con el patrón que ya usaba el [ADR 065](DECISIONS/065-ahorro-en-la-barra-inferior.md) ("se cita sin enlace porque su archivo no está en el repositorio"). El bug sigue abierto: falta el ADR, no el enlace.
- Función   : ninguna (documentación)
- Secciones : ninguna de la app (solo trazabilidad de INT.1, Transversal/escritorio)
- **Requiere decisión antes de tocarlo**: quien cerró INT.1a-h sabe si el ADR se perdió o nunca se escribió. Reconstruirlo desde los commits de INT.1 es trabajo de esa sesión, no un fix de una línea.

### BUG-025 - `fechaCreacion` se guarda en UTC y se lee como fecha local
- Estado    : pendiente
- Prioridad : media (no corrompe montos ni saldos; corre fechas un día, y en el borde de mes corre un ciclo entero)
- Problema  : todo registro creado desde las 7 p.m. hora Colombia queda con una `fechaCreacion` cuya parte de fecha es la de mañana. Los consumidores le cortan los primeros 10 caracteres y la tratan como fecha local, así que: una deuda creada el 31 de julio a las 8 p.m. cuenta como de agosto; un compromiso Bimestral creado esa noche ancla su ciclo un mes tarde y el Calendario lo pinta en los meses equivocados; el umbral de "deudas durmiendo" y el guard de "no marcar vencido lo creado después" se corren un día.
- Causa     : `guardar()` sella `fechaCreacion: new Date().toISOString()`, que es un instante UTC correcto. El defecto está en leerlo como si fuera una fecha de calendario local, no en guardarlo. Es el mismo patrón de BUG-018 (solucionado el 2026-08-02), que solo cubría los tres sitios que llamaban a `toISOString()` para pintar "hoy".
- Archivo   : `modules/infra/crud.js` (origen del sello) y sus lectores
- Función   : `guardar()` en `crud.js:36` (el ADR y las notas viejas la llaman `crear()`; ese nombre ya no existe); lectores `_caeEnCiclo` (`infra/vencimientos.js`), `estadoDistribucion` (`tesoreria/logic/distribucion.js`), `detectarDeudasDurmiendo` y los tres `_RX_FECHA_COMP.exec` de `compromisos/logic/alertas.js`
- Líneas    : `crud.js:38` (dentro de `guardar()`); `alertas.js:62`, `:132`, `:230`
- Secciones : Deudas, Calendario, Mis cuentas (asistente), transversal (todo consumidor del motor)
- **Decidido el 2026-10-16 (P3 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): opción (b)**, convertir a fecha local en la lectura con un helper único. Sin schema y arregla el pasado; cambia lo que el Calendario pinta para registros nocturnos. Tarjeta HF.0e. La opción (a) se descarta: su backfill es imposible porque el huso del momento de creación no se recupera.
