# ADR 110 - Distribuir sin salir de donde estás

**Estado:** Aceptada (2026-10-30). Pedido en chat: "Sí, MV2.19", sobre la fase 9 del canvas "Finko móvil: rediseño integral" (Claude Design, tablero "Fase 9: Distribuir y decisiones" y "Distribuir v2"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-30
**Autores:** Esteban (pedido y diseño de la fase 9), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.19 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Cambia bajo 1024 px** el [ADR 021](021-recordatorio-dia-de-ingreso.md) y CAL.1 (abrir el asistente navega a Mis cuentas). **Acota** el [ADR 061](061-educacion-antes-de-repartir.md) (la explicación se lee primero: compacta y solo en el paso 1). **Respeta** el [ADR 018](018-asistente-distribuir-ingreso.md) (los mismos pasos y la misma lógica), el [ADR 035](035-mis-cuentas-v2.md) D6 (el asistente es un modal), el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md), MC.13e-2f-2 (decidir lo que queda antes de confirmar) y MC.13d (la cuenta de origen guardada). Ningún cálculo cambia. La app del niño no tiene asistente.

---

## Contexto

Medido en la app real a 390 px con cuatro cuentas, dos ingresos, tres pagos fijos, una meta, una reserva y una inversión:

| Hallazgo | Medida |
|---|---|
| Te saca de donde estás | tocar "Distribuir" en Inicio cambia a Mis cuentas antes de abrir el asistente; al cerrar no vuelves a Inicio |
| El paso empieza fuera de la vista | el contenido del paso 1 arranca a 789 px en una hoja de 699 |
| "Siguiente" fuera de la vista | a 976 px: en cada paso hay que bajar hasta el final para seguir |
| "Distribuir" apagado sin razón | falta decidir qué hacer con lo que queda, y esa pregunta está al final del paso, debajo de lo demás |

## Decisión

Se implementa en tres rebanadas, MV2.19a a MV2.19c.

### D1. Bajo 1024 px se abre sobre la pantalla en que estás (MV2.19a)

`distribuir:abrir` deja de cambiar la dirección en el teléfono: el asistente se abre encima de Inicio, Calendario, Límites o Mis cuentas, y cerrar te deja donde estabas. En escritorio sigue navegando a Mis cuentas (ADR 021).

### D2. Lo asignado, lo que queda y la acción, siempre a la vista (MV2.19a)

El resumen y los botones de paso forman el pie del asistente. Bajo 1024 px el pie se pega al borde de la hoja, como el de los formularios (ADR 098 D8).

### D3. La pregunta obligatoria va primero y el pie dice qué falta (MV2.19a)

En el último paso, "¿Qué haces con lo que queda?" sube al principio. Mientras falte una respuesta que bloquea "Distribuir" (lo que queda, qué ingresos llegaron, lo que se mueve de más a otras cuentas o no haber marcado nada), el pie lo dice en vez de apagar el botón en silencio. Vale en todos los anchos: es el mismo botón y el mismo motivo.

### D4. Qué se reparte y desde dónde, una vez y arriba (MV2.19b)

Bajo 1024 px el asistente abre con una fila: el monto, los ingresos y la cuenta de origen, con un solo "Cambiar" que despliega el monto, los ingresos recibidos y la cuenta. Si la cuenta no está guardada (MC.13d), se pregunta al empezar y no al confirmar.

### D5. Cada paso muestra solo lo suyo (MV2.19b)

Bajo 1024 px la comparación con los expertos se lee primero pero compacta, y solo en el paso 1. El porqué, los métodos clásicos y "Personalizar" viven en "Cómo lo calculamos", a un toque.

### D6. Al confirmar, la hoja dice qué quedó (MV2.19c)

Bajo 1024 px confirmar no cierra la hoja: muestra los pagos registrados, los aportes, lo que se queda para el día a día y el saldo de la cuenta, con "Deshacer" ahí mismo y "Ver Mis cuentas". Al cerrarla, el aviso con "Deshacer" sigue como hasta ahora.

### D7. Nada se quita

Mover a otras cuentas, desmarcar un ingreso, cambiar el monto, los métodos y los enlaces a Deudas, Fondo y Límites siguen a un toque.

## Alternativas descartadas

- **Un asistente nuevo para el teléfono.** Duplicaría 3.500 líneas de vista, acciones y lógica que ya están probadas; se reordena lo que se ve, no lo que se calcula.
- **Abrir en sitio también en escritorio.** Ahí Mis cuentas tiene la tarjeta de distribución al lado del asistente, y nadie pidió cambiarlo.

## Consecuencias

### Positivas

- El reparto se hace sin perder el lugar, y el botón para seguir nunca queda fuera de la vista.
- Un "Distribuir" apagado siempre dice por qué.

### Negativas / Restricciones

- En el teléfono el asistente puede abrirse sobre cualquier sección: lo que pinte al confirmar no puede depender de que Mis cuentas esté montada.
- En escritorio, con déficit, el resumen pasa debajo del bloque del déficit (el pie es uno solo en todos los anchos).
