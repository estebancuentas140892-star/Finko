# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-07-24. **3 errores abiertos:** BUG-016 (cuatro mensajes en voseo), BUG-013 (el pase de accesibilidad mide contraste durante el fundido del modal) y BUG-017 (el modelo Quincenal pierde un cobro al mes). Ninguno afecta el uso diario de la app salvo con `diaPago > 16` en frecuencia Quincenal.

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

### BUG-017 - El modelo Quincenal pierde el segundo cobro del mes si `diaPago > 16`
- Estado    : pendiente
- Prioridad : media (necesita decisión de producto antes de tocarlo, no es un fix directo)
- Problema  : un compromiso o ingreso Quincenal con `diaPago > 16` aparece **una sola vez al mes** en vez de dos, en el Calendario, la checklist de vencimientos y cualquier consumidor del motor.
- Causa     : `ocurrenciasEnMes` resuelve Quincenal como `[diaPago, diaPago + 15]` **dentro del mismo mes** y descarta el segundo si no cabe (con `diaPago = 20`, el segundo sería el día 35). Preexistente: viene de `_diasParaCompromiso` de Agenda, `MC.13a` lo extrajo tal cual (139 tests lo fijan).
- Archivo   : `modules/infra/vencimientos.js`
- Función   : `ocurrenciasEnMes`, caso Quincenal
- Líneas    : sin localizar (hallazgo de MC.13c-2, no una lectura de código línea a línea)
- Secciones : Calendario, Mis cuentas (asistente), transversal (todo consumidor del motor)
- **Arreglo sugerido**: el segundo cobro debería pasar al mes siguiente (día 5). **Requiere decisión de Esteban**, porque cambia lo que hoy ve el Calendario.
