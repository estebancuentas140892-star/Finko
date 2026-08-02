# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-08-02 (BUG-017 solucionado y retirado). **3 errores abiertos:** BUG-016 (cuatro mensajes en voseo), BUG-013 (el pase de accesibilidad mide contraste durante el fundido del modal) y BUG-018 (fecha por defecto del abono a deuda usa UTC, no hora Colombia). BUG-018 afecta el uso diario desde las 7 p.m. hora Colombia en adelante.
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

### BUG-018 - La fecha por defecto del abono a deuda usa UTC, no hora Colombia
- Estado    : pendiente
- Prioridad : alta (corrompe datos financieros; sin decisión de producto, un tecleo por sitio)
- Problema  : el formulario de abono a deuda inicializa la fecha con `new Date().toISOString().slice(0,10)`. Colombia es UTC-5: desde las 7 p.m. hora local, esa fecha ya es "mañana". Reproducido: abono registrado el 24 de julio a las 11:50 p.m. quedó guardado y visible en Movimientos como "25 de julio".
- Causa     : uso de fecha UTC en vez de fecha local. El proyecto ya tiene el helper correcto, `isoFecha()` en `modules/dominio/tesoreria/logic/ingresos.js:184`, pero vive dentro de un dominio y nadie más lo busca ahí.
- Archivo   : `modules/dominio/compromisos/views/formularios.js`
- Función   : valor por defecto del campo fecha en el formulario de abono
- Líneas    : ~54
- Secciones : Deudas (abono). Variantes cosméticas del mismo patrón, sin persistencia de dato incorrecto: `modules/dominio/compromisos/views/alertas.js:29` (umbral de meses, no se mueve por horas) y `modules/dominio/config/index.js:32,109` (nombre de archivo de backup). No requieren fix urgente, solo quedan atrapadas si se promueve el helper.
- **Arreglo sugerido**: mover `isoFecha()` a `infra/utils.js` como única fuente de "hoy en ISO", reemplazar el uso en `formularios.js:54` (obligatorio) y opcionalmente los otros dos (cosmético). Test unitario que fije un huso UTC-5 nocturno.

