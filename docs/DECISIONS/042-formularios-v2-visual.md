# ADR 042 - Formularios v2 (lenguaje de captura compartido)

**Estado:** Aceptado (2026-07-15). Esteban envió el handoff de Claude Design (`Formularios v2.dc.html`, bundle "Iteración de specimen") con la instrucción explícita de implementarlo. Los puntos donde el mockup choca con decisiones ya aprobadas se resuelven abajo con el criterio de la familia v2; el único conflicto que queda abierto (AP.5, ver D9) no bloquea y se señala para la palabra de Esteban.
**Fecha:** 2026-07-15
**Autores:** Esteban (visión de producto, envío del handoff), Claude Design (mockup `Formularios v2.dc.html`), Claude Code (triaje e implementación).
**Relación:** octava entrega de la familia visual v2 (tras Inicio, Mis cuentas, Deudas, Calendario, Análisis, Gastos y Navegación). Respeta [ADR 031](031-identidad-de-color-por-seccion.md) (el tinte de cada formulario entra por `--fk-section-accent`, el mecanismo de IV.2b ya declarado por `[data-dom]`), [ADR 024](024-reorganizacion-navegacion-movil.md) (los modales ya son hojas inferiores en móvil), TX.9b/CAT.2 (categorías personalizadas + picker de ícono se conservan tal cual) y D.14/D.10 (la anatomía del form de deuda del mockup calca funcionalidades ya existentes). **Revisa el orden de campos de TX.9a** para el form de gasto (ver D2): decisión del propio mockup, no una regresión silenciosa.

---

## Contexto

Los formularios de captura (Registrar gasto, Nueva deuda, Nuevo gasto fijo) siguen siendo formularios clásicos de la v1: campos apilados del mismo peso visual, categoría en un `<select>`, fecha en un `<input type="date">` pelado y monto en un input común. El handoff de Claude Design propone **un mismo lenguaje de campos** para todos: el monto como protagonista, la categoría elegida con chips de ícono (no un desplegable), la fecha con atajos (Hoy / Ayer / Otra fecha), los datos avanzados plegados hasta que hacen falta, y el pie con el primario a lo ancho.

## Triaje (regla 2.7)

- **Entra como iniciativa transversal propia** (rebanadas FORM.1a a FORM.1c): a diferencia de las siete pantallas v2 anteriores (una sección cada una), esta define un lenguaje compartido que hoy consumen tres formularios de tres dominios distintos (gastos, compromisos, agenda). La fundación CSS vive en `styles/components/forms.css` (capa compartida, no de dominio).
- **Toca CAT.4 sin cerrarla:** el chip "Hoy" seleccionado por defecto implementa la regla "fecha por defecto = hoy" en los formularios que migran; la auditoría transversal de CAT.4 (los ~8 formularios restantes + orden de campos) sigue pendiente en su tarjeta.
- **No pisa CAT.2 ni TX.9b:** el picker de ícono compartido y las categorías personalizadas se conservan tal cual; solo cambia cómo se llega a "Otra categoría" (chip en vez de opción del select).
- **El form de deuda del mockup calca funciones existentes:** el segmented Entidad/Personal es el chooser actual (paso 1) presentado inline, "Recibí este dinero en una cuenta" es D.14, y las categorías por tipo son D.10/D.13. FORM.1b es un re-vestido, no lógica nueva.
- **Íconos: cero símbolos nuevos en el sprite** (criterio ADR 037/038/039). El check del botón Guardar → `i-check-circle`; el "+" de "Otra categoría" → `i-plus`; los `c-*` de categorías ya existen y los resuelven `iconoDeCategoriaGasto` / `CATEGORIA_AGENDA_ICONO` / `CATEGORIA_ICONO`.
- **Tipografía:** los montos del mockup usan DM Mono; la app la eliminó en el redesign 2026 (`--fk-font-mono` es Inter con `tabular-nums`). El monto hero extiende `.input--big-amount`, ya calibrado con ese criterio.

## Decisión

Un lenguaje compartido de captura, con componentes en `forms.css` que cada formulario consume:

### D1. Componentes del lenguaje (fundación, FORM.1a)

- **`.modal__teja`**: teja del dominio (38px, tinte 14% + glifo en `--fk-section-accent`) junto al título del modal. La franja superior de 3px de IV.2b **se conserva** (decisión aprobada del ADR 031, no se revierte).
- **`.monto-hero`**: label uppercase + caja tintada del dominio (borde 35%, fondo 6% sobre `--fk-section-accent`) con prefijo `$` y un `<input type="number">` real que extiende `.input--big-amount` (grande, centrado, tabular). Hint "COP" debajo. Sin formateo vivo de miles: el mockup muestra un display estático; un input real con separadores exigiría lógica nueva de parseo con riesgo sobre `validarGasto`, y el número grande tabular ya comunica la jerarquía.
- **`.chips-cat` / `.chip-cat`**: grilla de 3 columnas de chips con ícono. **Radios reales** (`name="categoria"`) visualmente ocultos dentro del label: el contrato FormData y la validación no cambian en nada; a11y con `role="radiogroup"` + label, foco visible vía `:has(:focus-visible)` y navegación por flechas nativa. Estado seleccionado con el patrón calibrado D.16b (tinte 12% + borde 50% + texto primario), no el 15/48 del mockup.
- **`.fecha-chips` / `.chip-fecha`**: atajos Hoy / Ayer / Otra fecha (radios de presentación `name="fechaOpcion"`, énfasis neutro como en el mockup). El `<input type="date">` real (`name="fecha"`) queda oculto y sincronizado; "Otra fecha" lo revela. "Hoy" viene seleccionado por defecto (regla CAT.4 aplicada a los forms migrados).
- **`.modal__footer--principal`**: Cancelar ghost + primario a lo ancho con `i-check-circle`.
- **Estados**: error → el mecanismo existente `mostrarErroresForm` (su bloque `.form-errors` ya coincide con la anatomía del mockup) + señal en la grilla de chips vía `:has(.field-invalid)`; sin cuentas → `.form-empty` con teja v2 (66px, tinte tesorería) y el copy existente (que el mockup calcó de la app).

### D2. Registrar gasto (flagship, FORM.1a): monto primero

Orden v2: **Monto hero → Categoría (chips) → Cuenta → Fecha (chips) → Nota**. Esto **revisa el orden de TX.9a** (categoría primero): el mockup declara "el monto es el protagonista" y lo pone al frente. La regla de CAT.4 ("categoría/tipo antes que descripción, nunca al revés") no se toca: este form no tiene descripción, y la categoría sigue antes que cuenta, fecha y nota. El catálogo de chips muestra **todas** las categorías visibles (13 nativas de `CATEGORIAS_GASTO_USUARIO` + personalizadas del usuario + "Otra categoría" al final con `i-plus`), no solo las 6 del mockup: esconder categorías detrás de un "ver más" recrearía el problema del desplegable que el mockup elimina. La hoja tiene scroll; el monto queda arriba.

### D3. Selector de cuenta: se conserva el existente

`renderSelectorCuenta` (tarjetas con radio, estado seleccionado `:has(:checked)`, 8+ consumidores) ya es el patrón del mockup en lo esencial. El check-circle verde del mockup no reemplaza el lenguaje ya calibrado (borde acento + fondo hover); cambiarlo tocaría 8 formularios por un matiz visual.

### D4. Nueva deuda (FORM.1b)

Segmented Entidad/Personal **inline** al tope del form (reemplaza el chooser de dos pasos: mismo contrato `tipo`, un paso menos), categorías en chips de 2 columnas (catálogos D.10 por tipo), saldo total como monto hero (tinte frambuesa), cuota mensual con prefijo `$`, **"Condiciones del crédito" colapsable** (tasa + frecuencia + día de pago, hoy siempre visibles) y el bloque D.14 "Recibí este dinero en una cuenta" como toggle. Detalle fino al re-cortar la rebanada.

### D5. Nuevo gasto fijo (FORM.1c)

Categoría en chips 3col (las 15 de `CATEGORIAS_AGENDA`), descripción, monto hero (tinte índigo agenda), frecuencia + día de pago en fila, y el banner informativo "Aparecerá cada mes en tu calendario el día N" **dinámico** (lee frecuencia + día elegidos). Cierra la iniciativa.

### D6. Alcance de "lenguaje": los demás formularios NO migran aquí

Ingreso, transferencia, apartado, meta, abono, cuenta, etc. adoptarán los componentes cuando su iniciativa los toque (AP.5, MT.6, MC.13e...); esta iniciativa solo entrega los 3 formularios del mockup. Regla para el futuro: **ningún formulario nuevo introduce un select de categoría**; usa los chips del lenguaje.

## Conflicto señalado (no bloquea)

### D9. AP.5 pedía "dropdown que autocompleta" para Apartados

La tarjeta AP.5 (pendiente de análisis, no iniciada) dice que el form de apartado adopte "el patrón estándar (dropdown Seleccionar categoría...)". Este ADR fija lo contrario como lenguaje (chips de ícono). Como AP.5 no se ha iniciado, no hay código que revertir; **al iniciarla, la decisión formal es de Esteban** (recomendación: chips, por consistencia con este ADR). Anotado en la tarjeta AP.5.

## Guardarraíles (criterio de aceptación de cada rebanada FORM.1*)

1. Ambos temas con contraste AA (método IV.1); los tintes usan las variantes `-text` vía `--fk-section-accent`.
2. Chips ≥ 44px de alto táctil; radios reales con foco visible y navegación por flechas.
3. **Cero cambios de lógica**: `validarGasto`, `normalizarGasto`, `resolverPagoConPreferida`, D.14 y los catálogos no se tocan; el contrato FormData (`name="categoria"`, `name="fecha"`, `name="cuentaId"`) se conserva.
4. Todo vía `var(--fk-*)`, cero color inventado, cero íconos nuevos en el sprite.
5. Tests verdes (unit + E2E adaptados en la misma rebanada) + bump de `CACHE_NAME`.

## Plan de rebanadas (tarjetas FORM.1b y FORM.1c en BOARD.md)

- **FORM.1a** - Fundación del lenguaje en `forms.css` + Registrar gasto completo (D1+D2+D3); abre la iniciativa.
- **FORM.1b** - Nueva deuda (D4).
- **FORM.1c** - Nuevo gasto fijo (D5); cierra la iniciativa.

## Alternativas rechazadas

- **Copiar los estilos inline del mockup:** viola el sistema (`var(--fk-*)` obligatorio); se recrea con tokens y clases.
- **Solo 6 categorías visibles + "ver más" (mockup literal):** esconder la mitad del catálogo recrea la fricción del dropdown; la grilla completa escanea mejor que un select y la hoja tiene scroll (ver D2).
- **Chips como `<button>` + input hidden:** exigiría JS nuevo para estado y romper el contrato FormData; los radios nativos dan selección, foco y navegación por flechas gratis.
- **Formateo vivo de miles en el monto hero:** parseo nuevo sobre un campo crítico de dinero a cambio de un matiz cosmético (ver D1).
- **Migrar los 10+ formularios de la app de una vez:** contradice la regla 2.1 (rebanadas verificables); el lenguaje queda definido y cada iniciativa migra el suyo (ver D6).
- **Reemplazar el selector de cuenta por el del mockup con check-circle:** tocaría 8 formularios por un matiz; el patrón existente ya comunica la selección (ver D3).
