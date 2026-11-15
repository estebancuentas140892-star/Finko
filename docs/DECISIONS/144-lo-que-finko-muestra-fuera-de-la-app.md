# ADR 144 - Lo que Finko muestra fuera de la app

**Estado:** Aceptada (2026-11-15). Pedido en chat: aplicar lo que sigue del tablero sin preguntar ("toma tú todas las decisiones que consideres que es lo mejor para la app"); HF.3e esperaba este ADR corto.
**Fecha:** 2026-11-15
**Autores:** Esteban (el pedido y la delegación), Claude Opus 5.5 (diagnóstico, diseño e implementación)
**Relación:** **Acota** el [ADR 063](063-candado-de-acceso-local.md) (el candado también cubre lo que se ve fuera de la app) y el [ADR 066](066-motor-unico-de-avisos.md) (la notificación es una superficie más del motor único: este ADR suma dos, el número del ícono y los accesos directos). **Absorbe** el diferido del [ADR 040](040-navegacion-v2-visual.md) D-badges: el número cuenta lo mismo que interrumpe. Iniciativa HF del [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md), tarjeta HF.3e (absorbe HF.3f y HF.3g).

---

## Contexto

Revisado en el código el 2026-11-15:

- `verificarYNotificar()` (`infra/notificaciones.js`) corre en `bootstrap.js` **fuera del candado** y su cuerpo lleva el monto ("$350.000"). Una notificación se ve en la pantalla bloqueada del teléfono: con el candado puesto, el nombre del pago y la cifra quedaban a la vista de cualquiera. Tampoco miraba el ojo (`ocultarSaldo`).
- Tocar la notificación abre la app en Inicio: el service worker no escucha `notificationclick`.
- La app instalada no pone número en su ícono (`navigator.setAppBadge`) ni ofrece accesos directos en `manifest.json`.
- El router (`infra/router.js`) solo conoce `#seccion`, sin parámetros.

## Decisión

### D1. Con el candado, la notificación no nombra ni muestra cifras

Con `config.bloqueo` activo, la notificación dice solo cuántos avisos esperan: "Tienes un aviso en Finko" o "Tienes N avisos en Finko", y el cuerpo "Ábrela para verlo" / "para verlos". Sin nombre, sin monto, sin emoji del tipo. Con el ojo puesto y sin candado, nombra el aviso pero no lleva el monto. Sin ninguno de los dos, como hoy.

### D2. El número del ícono cuenta lo que interrumpe

`navigator.setAppBadge(n)`, con `n` = los avisos `urgente` y `alta` que la persona no apagó por sección: exactamente el conjunto que puede volverse notificación (ADR 066 D5). Se recalcula al abrir, en cada `state:change` (agrupado, una vez por cuadro) y al volver a la app (`visibilitychange`). En cero se limpia (`clearAppBadge`). Solo con los recordatorios activados (`config.notificaciones`): es lo que la app muestra fuera de ella, y eso es opt-in desde CFG.3a. Sin la API (navegador sin soporte, o la app no instalada), no hace nada. Un número no dice montos, así que el candado no lo apaga.

### D3. La notificación abre la sección de su aviso, no el elemento

Cada notificación lleva en `data.url` la sección dueña del aviso protagonista (`#compromisos` para un pago, `#presupuesto` para un tope, `#apartados`, `#personales`, `#tesoreria` para el día de pago, `#config` para el respaldo). El service worker atiende `notificationclick`: si la app ya está abierta la enfoca y navega; si no, la abre ahí. Con candado, la app pide el PIN y después queda en esa sección.

**No se agrega una ruta por elemento.** Pedía una convención nueva de parámetros en el router para algo que la sección ya resuelve: la lista de cada sección pone arriba lo vencido y lo próximo, que es justo lo que avisó.

### D4. Cuatro accesos directos en el ícono

`manifest.json` gana `shortcuts`: **Hoy** (`/#dash`), **Por pagar** (`/#compromisos`), **Registrar gasto** (`/?accion=nuevo-gasto#gast`) y **Registrar ingreso** (`/?accion=nuevo-ingreso-puntual#tesoreria`). `?accion=` es una lista cerrada de dos acciones que ya existen (`data-action`); el arranque la ejecuta después de los gates (candado, aceptación legal) y borra el parámetro de la dirección, para que recargar no vuelva a abrir el formulario. Cualquier otro valor se ignora.

## Lo que no cambia

El motor de avisos, qué interrumpe y la notificación una vez al día (`ultimoAvisoISO`). El candado mismo. Las notificaciones siguen saliendo solo al abrir la app (ADR 066 D1).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| No notificar con candado | quien pone el PIN igual quiere saber que vence algo; lo que protege el candado es el contenido, no el hecho |
| Rutas por elemento (`#compromisos/id`) | convención nueva en el router para un caso que la sección ya cubre |
| Número del ícono con todos los avisos | contaría un apartado a seis días: un número que nunca baja deja de leerse |
| Número sin opt-in | lo que se ve fuera de la app es opt-in desde CFG.3a |
| Accesos con hash propio (`#registrar-gasto`) | mezclaría acciones con secciones en el router; `?accion=` las separa y es lista cerrada |

## Consecuencias

### Positivas

- Con candado, la pantalla bloqueada ya no dice qué se debe ni cuánto.
- La notificación lleva a donde está lo que avisó.
- Registrar un gasto desde el ícono son dos toques.

### Negativas / Restricciones

- iOS solo pone número con la app instalada y el permiso de notificaciones; Safari no tiene accesos directos.
- `?accion=` es vocabulario nuevo del arranque: crece solo con una decisión.

## Resolución en implementación (HF.3e, 2026-11-15)

- **El service worker sirve el shell de `/` a toda navegación con query.** Sin eso, `/?accion=nuevo-gasto` quedaba en el cache como entrada propia y el traspaso de `activate` (UPD.2) la habría llevado vieja de una versión a la siguiente.
- **La acción va antes que las novedades y la hoja de débitos**, que esperan a la próxima apertura (la de débitos se salta sola con un modal abierto). Si falta la aceptación legal, espera a `legal:aceptado`, un tick después, y no se apila si ya se abrieron las novedades.
- **La notificación y el número leen la misma lista** (`avisosQueNotifican()`), no la de "Atención hoy" (`avisosDeHoy()`), que suma el ingreso por distribuir y la nube: así el número cuenta exactamente lo que puede interrumpir (D2).
- **El número también se recalcula en `state:save`**: los interruptores de Ajustes guardan sin emitir `state:change`.
