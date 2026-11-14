# ADR 141 - El gasto fijo empieza por el monto, y el campo que escribes queda a la vista

**Estado:** Aceptada y aplicada (2026-11-13, REV.2b).
**Fecha:** 2026-11-13
**Autores:** Esteban (el punto de la revisión del 13 de noviembre: el formulario abría con 15 categorías antes del monto y el teclado tapaba el campo; la tarjeta recortada por el [ADR 138](138-la-poda-del-tablero-del-13-de-noviembre.md) D3; el arranque: "Sí, REV.2b"), Claude Opus 5.5 (diseño e implementación)
**Relación:** **Ajusta** el [ADR 042](042-formularios-v2-visual.md) D5 (el orden del gasto fijo y su frecuencia + día en fila). **Extiende** el [ADR 115](115-el-pie-se-apoya-sobre-el-teclado.md): además del pie, el campo enfocado. **Respeta** el ADR 042 D2 (todas las categorías a la vista, sin "ver más") y AG.4 (la categoría da el nombre y el texto pasa a ser nota).

---

## Contexto

El ADR 042 D5 ordenó el gasto fijo como categoría, descripción, monto, frecuencia y día. En un teléfono de 390 px eso son 16 chips (seis filas) antes del monto, que es lo que la persona viene a escribir; Registrar gasto ya lo había resuelto al revés (ADR 042 D2: "el monto es el protagonista"). Y con el teclado abierto, la hoja se achica al área visible (ADR 115) pero el campo que se está escribiendo podía quedar debajo: el navegador lo había llevado a la vista antes de que la hoja cambiara de alto.

## Decisión

### D1. Cuatro preguntas, en el orden en que se piensan

**"¿Cuánto pagas?"** (el monto hero, primero), **"¿Qué es?"** (todas las categorías en chips, como manda el ADR 042 D2), **"¿Cada cuánto?"** y **"¿Qué día?"** con el banner "Aparecerá cada mes en tu calendario el día N" debajo. Frecuencia y día dejan de compartir fila: cada uno es una pregunta.

### D2. "¿Cada cuánto?" en chips: Mensual, Quincenal, Anual u Otra

Las tres frecuencias de casi todo fijo (arriendo, quincena, seguro anual) van en chips (`.fecha-chips`, mismo lenguaje que "¿Cuándo?" de Registrar gasto). "Otra" deja a la vista el desplegable con las nueve de siempre. El dato sigue siendo el `<select name="frecuencia">`: los chips son radios de presentación (`frecuenciaOpcion`), el mismo patrón que `fechaOpcion` (ADR 042 D1), y `normalizarCompromiso` no cambia. Al editar, el chip sale de la frecuencia guardada, u "Otra" con el desplegable abierto.

### D3. La nota y el débito automático, en "Más opciones"

Un plegable al final (`.form-disclosure`, el de "Condiciones del crédito" de la deuda) con la nota y el débito automático. El campo de texto se muda según la categoría (AG.4): obligatorio ("Descripción", sin categoría o con "Otro") va bajo "¿Qué es?"; nota (la categoría da el nombre) va dentro de "Más opciones". Se muda el mismo nodo, así que lo escrito no se pierde, y si ya tenía texto el plegable se abre. Al editar, se abre si guarda una nota o el débito. El rótulo dice lo que hay adentro ("Nota y débito automático", "Débito automático" sin categoría, "Nota" sin cuentas) y sin nada adentro no se pinta.

### D4. El campo enfocado sube a la vista, en todos los formularios

`ui/teclado.js` (`llevarCampoALaVista()`): cuando el teclado se abre o cambia de alto, y cuando se pasa a otro campo con el teclado abierto, el campo enfocado sube al centro del área visible. Solo un campo que abre teclado (no casillas, radios, botones ni desplegables), solo dentro de una hoja abierta (las páginas las desplaza el navegador solo) y solo si quedó fuera de la vista o bajo el pie de la hoja (96 px). No se hace al desplazar: quien mueve la hoja con el teclado abierto decide qué mira.

## Alternativas descartadas

- **"6 frecuentes y N más" en las categorías.** Salió en la poda (ADR 138 D3): el ADR 042 D2 lo rechazó con razón escrita (esconder categorías recrea la fricción del desplegable) y la primera entrega del canvas lo respetó.
- **El formulario corto del canvas móvil (MV2.17), tal como venía.** El tablero 12 lo dio por "descartado en parte" sin ADR: lo que escondía categorías choca con el ADR 042 D2, y del resto no se midió un problema después del pie fijo (ADR 115 y la adenda al ADR 123). Los 13 HTML del canvas se borraron el 2026-11-05 y la tarjeta MV2.28 (c), luego esta, era su única copia (commit `01f671e2`); el detalle de sus pantallas no se conserva. De esa idea, este ADR toma el monto primero y lo opcional plegado; no toma esconder categorías.
- **Las nueve frecuencias en chips.** Tres filas de chips para opciones que casi nadie usa (Diario, Bimestral, Única vez); vuelve a poner un muro antes del día.
- **Dos campos, nombre y nota, en vez de mudar uno.** Cambiaría el contrato de `normalizarCompromiso` (hoy un solo `descripcion` que AG.4 interpreta) y obligaría a migrar la edición de lo guardado.
- **`scrollIntoView` siempre, sin mirar si el campo ya se ve.** Movía la hoja aunque el campo estuviera a la vista y empujaba el monto fuera de pantalla al tocarlo.

## Consecuencias

- `compromisos/views/formularios.js` (el orden, los chips de frecuencia, "Más opciones"), `compromisos/index.js` (`_syncFrecuenciaGastoFijo()`, la mudanza del campo en `_syncCategoriaGastoFijo()`, el plegable) y `ui/teclado.js`.
- Pruebas: `compromisos.test.js` (5 nuevas del orden, los chips y el plegable; sale la de "frecuencia y día en una fila"), `teclado.test.js` (6 nuevas), `smoke.test.js` (2 ajustadas y 1 nueva a 390 px con la edición).
- El efecto del teclado no se puede ejercitar en el navegador de escritorio: lo cubren las pruebas unitarias, y en el teléfono se verifica con REV.3b.
- SW v698.
