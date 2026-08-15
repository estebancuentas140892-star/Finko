# Registro de errores - Finko Claude

> Revisado: 2026-08-15.

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-08-13 (auditoría documental transversal). **BUG-016 y BUG-013 se retiran: verificados como ya corregidos en el código**, sin que ningún commit los hubiera dado de baja acá. BUG-016: cero cadenas de voseo en `modules/` e `index.html`. BUG-013: `tests/e2e/a11y-forms.test.js:66` implementa `esperarFundidoDeEntrada()`, que espera `opacity === '1'` antes de llamar a axe, exactamente el arreglo sugerido. Antes: BUG-026 solucionado (2026-08-03); BUG-017 y BUG-018 solucionados y retirados. **3 errores abiertos:** BUG-025 (`fechaCreacion` se guarda en UTC y se lee como fecha local), BUG-027 (ADR 059 inexistente) y BUG-028 (el aviso de compromiso próximo ignora el `hoyISO` inyectado; abierto el 2026-08-14 al cerrar PERF.10a).
>
> **Patrón recurrente que conviene vigilar (cerrado 3 veces el 2026-08-01):** tests con **fechas fijas** o con un día derivado a módulo 28 se ponen rojos según el día en que se corran, casi siempre los primeros días del mes. La regla es derivar las fechas del reloj, y **fijar el reloj** (`vi.setSystemTime`) cuando el test afirma una distancia exacta o necesita un día ya pasado dentro del mes.

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

### BUG-028 - el aviso "compromiso próximo" ignora el `hoyISO` inyectado y lee el reloj real
- Estado    : pendiente
- Prioridad : media (en producción `hoyISO` **es** el día real, así que el usuario no ve una fecha mal; lo que rompe es el contrato de inyectabilidad del módulo, y con él el test, que se pone rojo cualquier día distinto al del fixture)
- Problema  : `tests/unit/avisos.test.js:183` ("lo que vence hoy es próximo con 0 días, nunca vencido") falla desde el 2026-08-14. El test fija `HOY = '2026-08-13'` y pasa `hoyISO`, pero el aviso se calcula contra la fecha del sistema, así que pasó el día que se escribió y falla desde el siguiente. Tercera repetición del patrón que este archivo ya vigila (ver la nota de arriba).
- Causa     : `recolectarAvisos()` reparte `hoyISO` a **todas** sus fuentes menos una: `_deCompromisosProximos(compromisos)` se llama sin la fecha y delega en `compromisosProximos()`, que calcula con `proximoVencimiento(c)`, y esa función lee el reloj real. Arreglarlo no es una línea: hay que propagar la fecha por `compromisosProximos()` y `proximoVencimiento()`, que tienen otros consumidores en el dominio Compromisos.
- Archivo   : `modules/infra/avisos.js` (origen) y `modules/dominio/compromisos/logic/modelo.js` (las dos funciones que hay que abrir a la fecha inyectada)
- Función   : `_deCompromisosProximos()`; `compromisosProximos()` y `proximoVencimiento()` en `modelo.js`
- Líneas    : `avisos.js:170` y `:402` (movidas por CFG.4b, sin tocar la función); `modelo.js:233`
- Secciones : Inicio (panel "Avisos", CFG.3b), Calendario, notificación del sistema (`infra/notificaciones.js`)
- Encontrado el 2026-08-14 cerrando PERF.10a, con `pnpm test`. **Verificado ajeno** con `git stash`: la suite falla igual sin ese cambio. Llega con CFG.3a ([ADR 066](DECISIONS/066-motor-unico-de-avisos.md)), no con PERF.10.
- **Crece solo con el calendario (medido el 2026-08-15, cerrando CFG.4a):** de **1** test rojo a **6** en `avisos.test.js`, sin que nadie tocara el módulo. Confirmado ajeno otra vez con `git stash`. La prioridad no sube (en producción `hoyISO` sigue siendo el día real y el usuario no ve nada mal), pero el costo de convivir con él sí: la suite unitaria ya no puede leerse como "verde salvo un caso conocido".

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
- **Requiere decisión antes de tocarlo**: los registros ya guardados tienen el sello UTC, así que cambiar `guardar()` no arregla el pasado y mezcla dos convenciones en la misma colección. Las dos salidas son (a) guardar además `fechaCreacionLocal` (campo nuevo, migración con backfill imposible: el huso del momento de creación no se puede recuperar) o (b) dejar el sello como está y convertir a fecha local en la lectura, con un helper único. La (b) no necesita schema y arregla el pasado, pero cambia lo que hoy muestra el Calendario para los registros nocturnos.
