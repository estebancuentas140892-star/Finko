# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-08-10 (**nace BUG-027**: el ADR 059 no existe en el repo pese a estar citado como aceptado en 7 documentos, encontrado al verificar numeración de ADR para GAS.2b). Antes: BUG-026 solucionado (2026-08-03: INT.1b anidó las 4 hijas de Ahorro); BUG-017 y BUG-018 solucionados y retirados. **4 errores abiertos:** BUG-016 (cuatro mensajes en voseo), BUG-013 (el pase de accesibilidad mide contraste durante el fundido del modal), BUG-025 (`fechaCreacion` se guarda en UTC y se lee como fecha local) y BUG-027 (ADR 059 inexistente).
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

### BUG-016 - Cuatro mensajes en voseo rompen el tuteo del ADN 11
- Estado    : pendiente
- Prioridad : media (no rompe funcionalidad, pero contradice una regla innegociable del ADN y se nota: el resto de la app tutea)
- Problema  : cuatro cadenas visibles al usuario usan voseo rioplatense ("Intentá", "Habilitá", "Importá") en vez del tuteo que fija el ADN 11 y el [ADR 003](DECISIONS/003-tono-neutral-profesional.md). Tres son anuncios a lector de pantalla (`announce`) y una es texto visible en la pantalla de Importar.
- Causa     : copy heredado, nunca revisado contra la regla de tono. No hay lint de estilo que lo detecte.
- Archivo   : `modules/dominio/config/index.js` y `modules/dominio/import/view.js`
- Función   : `config/index.js` handlers de exportar (×2) y de permiso de notificaciones; `import/view.js` copy del encabezado
- Líneas    : `config/index.js` 41 ("Intentá de nuevo"), 85 ("Habilitá el permiso"), 119 ("Intentá de nuevo") · `import/view.js` 23 ("Importá tus gastos")
- Secciones : Ajustes (exportar, notificaciones), Importar
- **Arreglo sugerido**: "Intentá de nuevo" → "Intenta de nuevo"; "Habilitá el permiso" → "Habilita el permiso"; "Importá tus gastos" → "Importa tus gastos". Fix de copy aislado, sin lógica. Al hacerlo, considerar una pasada `grep` por otras terminaciones de voseo (`-á`/`-é` en imperativo) para cerrar el hueco de una vez.

### BUG-013 - El pase de accesibilidad mide el contraste mientras el modal aún se está abriendo
- Estado    : pendiente
- Prioridad : baja (es el test, no la app: ningún usuario lo ve)
- Problema  : `tests/e2e/a11y-forms.test.js` falla de forma **intermitente** con violaciones `color-contrast` de impacto "serious". Visto el 2026-07-15 en el pase de FORM.1b sobre "Nueva deuda" (señaló `.tipo-segmented__btn` y `.monto-hero__label`); pasó al reintentar y 6 repeticiones seguidas dieron 6/6 verde. Puede reaparecer en **cualquiera** de los modales del archivo, no solo en el de deuda.
- Causa     : carrera del test, **no un defecto de CSS**. Los tests esperan `waitForSelector('#modal-x[data-open]')`, pero `[data-open]` se pone al inicio de la animación y el modal tiene `transition: opacity var(--fk-transition-base)` (`styles/modals.css:24` y `:49`). Si axe corre antes de que termine el fundido, mide el color **mezclado** con el fondo y calcula un contraste que no es el real. Con opacidad 1 los dos pares señalados cumplen AA en ambos temas: `--fk-text-muted` `#888fa6` sobre `--fk-bg-elevated` `#20242f` = 4.7:1 (oscuro) y `#5d6276` sobre `#eef1f8` = 5.3:1 (claro). Los tokens de `--fk-text-muted` están calibrados contra `bg-base`, así que sobre `bg-elevated` el margen es real pero estrecho: por eso este archivo es el que acusa la carrera primero.
- Archivo   : `tests/e2e/a11y-forms.test.js`
- Función   : cada `test(...)` que hace `waitForSelector('#modal-...[data-open]')` antes de `violacionesGraves(page, ...)`
- Líneas    : ~85-110 (el patrón se repite por modal)
- Secciones : ninguna de la app (solo la suite E2E). Afecta la confianza en el pase A11Y.5.
- **Arreglo sugerido**: esperar a que el fundido termine antes de medir, no dormir un tiempo fijo. Opciones: esperar la promesa de `element.getAnimations()` en el overlay, o afirmar `opacity === '1'` con `expect.poll` antes de llamar a axe. Conviene hacerlo en el helper compartido para que cubra todos los modales de una vez.

### BUG-027 - ADR 059 no existe en el repositorio pese a estar citado como "aceptado" en 7 documentos
- Estado    : pendiente
- Prioridad : media (no afecta el uso de la app; rompe la trazabilidad de la iniciativa INT.1)
- Problema  : `CHANGELOG.md`, `HANDOFF.md`, `board/transversal.md`, `contexto/transversal.md` y `DECISIONS/056-la-casa-de-ahorro.md` citan `[ADR 059](DECISIONS/059-interfaz-de-escritorio.md)` como fuente de INT.1 (interfaz de escritorio), "aceptado 2026-08-02". El archivo no existe en disco ni en `git log --all`: nunca se commiteó, aunque INT.1a-h ya cerraron citándolo.
- Causa     : sin investigar. Encontrado de paso al verificar numeración de ADR libre para GAS.2b (ADR 060), no por revisión de INT.1.
- Archivo   : `docs/DECISIONS/059-interfaz-de-escritorio.md` (inexistente); referencias rotas en los 5 documentos de arriba
- Función   : ninguna (documentación)
- Secciones : ninguna de la app (solo trazabilidad de INT.1, Transversal/escritorio)
- **Requiere decisión antes de tocarlo**: quien cerró INT.1a-h sabe si el ADR se perdió o nunca se escribió. Reconstruirlo desde los commits de INT.1 es trabajo de esa sesión, no un fix de una línea.

### BUG-025 - `fechaCreacion` se guarda en UTC y se lee como fecha local
- Estado    : pendiente
- Prioridad : media (no corrompe montos ni saldos; corre fechas un día, y en el borde de mes corre un ciclo entero)
- Problema  : todo registro creado desde las 7 p.m. hora Colombia queda con una `fechaCreacion` cuya parte de fecha es la de mañana. Los consumidores le cortan los primeros 10 caracteres y la tratan como fecha local, así que: una deuda creada el 31 de julio a las 8 p.m. cuenta como de agosto; un compromiso Bimestral creado esa noche ancla su ciclo un mes tarde y el Calendario lo pinta en los meses equivocados; el umbral de "deudas durmiendo" y el guard de "no marcar vencido lo creado después" se corren un día.
- Causa     : `crear()` sella `fechaCreacion: new Date().toISOString()`, que es un instante UTC correcto. El defecto está en leerlo como si fuera una fecha de calendario local, no en guardarlo. Es el mismo patrón de BUG-018 (solucionado el 2026-08-02), que solo cubría los tres sitios que llamaban a `toISOString()` para pintar "hoy".
- Archivo   : `modules/infra/crud.js` (origen del sello) y sus lectores
- Función   : `crear()` en `crud.js:38`; lectores `_caeEnCiclo` (`infra/vencimientos.js`), `estadoDistribucion` (`tesoreria/logic/distribucion.js`), `detectarDeudasDurmiendo` y los tres `_RX_FECHA_COMP.exec` de `compromisos/logic/alertas.js`
- Líneas    : `crud.js:38`; `alertas.js:62`, `:132`, `:230`
- Secciones : Deudas, Calendario, Mis cuentas (asistente), transversal (todo consumidor del motor)
- **Requiere decisión antes de tocarlo**: los registros ya guardados tienen el sello UTC, así que cambiar `crear()` no arregla el pasado y mezcla dos convenciones en la misma colección. Las dos salidas son (a) guardar además `fechaCreacionLocal` (campo nuevo, migración con backfill imposible: el huso del momento de creación no se puede recuperar) o (b) dejar el sello como está y convertir a fecha local en la lectura, con un helper único. La (b) no necesita schema y arregla el pasado, pero cambia lo que hoy muestra el Calendario para los registros nocturnos.



