# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Última actualización: 2026-07-15 (BUG-013 registrado: carrera del pase a11y sobre modales con fade, hallazgo de FORM.1b).

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
