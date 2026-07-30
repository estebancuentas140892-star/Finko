# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-07-29. **5 errores abiertos:** BUG-019 (la suite E2E apunta al markup que DIS.19 reemplazó y la compuerta E2E está caída), BUG-016 (cuatro mensajes en voseo), BUG-013 (el pase de accesibilidad mide contraste durante el fundido del modal), BUG-017 (el modelo Quincenal pierde un cobro al mes) y BUG-018 (fecha por defecto del abono a deuda usa UTC, no hora Colombia). BUG-018 afecta el uso diario desde las 7 p.m. hora Colombia en adelante; BUG-019 no afecta al usuario pero deja al proyecto sin red de seguridad E2E.

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

### BUG-019 - La suite E2E apunta al markup que DIS.19 reemplazó: la compuerta E2E está caída
- Estado    : pendiente
- Prioridad : alta (no lo ve ningún usuario, pero el proyecto quedó sin red de seguridad E2E y cada cierre siguiente hereda el rojo)
- Problema  : `pnpm run test:e2e` falla en al menos dos suites. `ahorro-inversion.test.js` falla sus 16 tests (los 4 del fondo por timeout en `page.click('.casa-ahorro__fila[data-vehiculo="fondo"]')`); `smoke.test.js` falla 4 tests de Metas con "element is not visible" en `[data-action="nueva-meta"]`, que Playwright reporta como *"locator resolved to 3 elements"*. Quedaron **146 tests sin ejecutar**: el alcance real del rojo no está medido.
- Causa     : **DIS.19 cambió el markup de la casa de Ahorro y no re-corrió E2E.** Los `.casa-ahorro__fila[data-vehiculo]` de DIS.18 son ahora `.lane` con `id="carril-<clave>"` y salida por `a.lane__ver[href="#<seccion>"]` (`modules/dominio/ahorro/view.js:197-207`); `grep -rn "casa-ahorro__fila\|data-vehiculo" modules/ styles/` no devuelve ninguna coincidencia. El segundo síntoma es el mismo cambio: cada carril trae su propio `.lane__cta` con la `data-action` que ya usaban la sección y el menú "Más", así que el selector pasó de 1 a 3 elementos y el primero está en un carril no visible. Última corrida verde de E2E: 2026-07-28 (236/236), anterior a DIS.19.
- Archivo   : `tests/e2e/ahorro-inversion.test.js`, `tests/e2e/smoke.test.js` (revisar `hub-ahorros.test.js` y `navegacion-render.test.js`: tocan la misma pantalla y no se ejecutaron)
- Función   : suite "Ahorro - fondo de emergencia (J.1)" y suite "Metas - categorías con emoji (MT.1)"
- Líneas    : `ahorro-inversion.test.js` 103, 120, 149, 185 · `smoke.test.js` 498, 514, 530, 550
- Secciones : ninguna de la app. Afecta la compuerta E2E de todo el proyecto.
- **Arreglo sugerido**: navegar por el markup vigente (`a.lane__ver[href="#fondo"]`, o ir al hash y afirmar `#sec-fondo.active`) y **acotar los selectores de `data-action` al contenedor visible**, que es la causa estructural del segundo síntoma y se va a repetir con cada CTA duplicado en los carriles. Después correr la suite completa. Entra por triaje como tarjeta propia: el alcance no está medido.

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
