# ADR 148 - El botón central registra según la sección

**Estado:** Aceptada (2026-11-15). Pedido de Esteban en chat; el mapa y el cambio al ADR 024 los confirmó él antes de implementar.
**Fecha:** 2026-11-15
**Autores:** Esteban (visión de producto), Claude Fable 5.2 (diseño e implementación)
**Relación:** **Revisa** el [ADR 024](024-reorganizacion-navegacion-movil.md) D1 en un punto: el botón central ya no abre lo mismo "sin depender de en qué sección estés". La hoja del 024 D2 no cambia. **Se apoya** en la regla de un solo primario por pantalla (R1) y en el espejo de la barra superior del [ADR 059](059-interfaz-de-escritorio.md) D3, que ya lee ese primario del encabezado de la sección. Respeta el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) (el filtro de Por pagar decide el formulario) y el [ADR 133](133-las-pantallas-de-ahorro-en-el-telefono.md) D6 (el primario de Inversión solo existe en el teléfono).

---

## Contexto

Esteban (2026-11-15): "podemos darle un uso mucho mejor al botón verde con el símbolo +": que abra el formulario de la sección en la que está el usuario, y que donde no haya nada que registrar siga como hoy.

El botón central de la barra de abajo abría siempre la hoja "¿Qué quieres registrar?" (gasto, ingreso, abono, aporte). En Metas, Reservas, Mis cuentas o Me deben, lo que la persona quiere crear es lo de esa pantalla, y para hacerlo tenía que subir al botón "+" del encabezado, la zona más lejana del pulgar (el mismo hallazgo que motivó el 024).

Cada sección con alta ya declara su acción en un único `.btn-primary` del encabezado. La barra superior de escritorio lo copia desde INT.1e sin mapa propio.

## Decisión

### D1. El botón central dispara el alta de la sección activa

Solo el botón central de la barra de abajo (`.nav-item--registrar`). Lee el mismo primario del encabezado que lee la barra superior y dispara su acción con ese botón como origen: es un toque en el botón del encabezado, hecho desde el pulgar. No hay mapa sección a acción que mantener: una sección nueva con primario en el encabezado queda cubierta sola.

| Sección | Qué abre el botón central |
|---|---|
| Gastos (Día a día) | Registrar gasto |
| Por pagar, filtro "Gastos fijos" | Nuevo gasto fijo |
| Por pagar, filtro "Deudas" | Nueva deuda |
| Por pagar, filtro "Todo" o "Pagado" | El selector de tipo (gasto fijo, deuda con entidad, deuda con persona) |
| Límites | Nuevo límite |
| Mis cuentas | Nueva cuenta |
| Me deben | Nuevo préstamo |
| Metas | Nueva meta |
| Reservas | Nueva reserva |
| Inversión | Nueva inversión |
| Fondo de emergencia | Aportar al fondo; sin fondo, "Empezar mi fondo" |
| Inicio, Movimientos, Calendario, Análisis, Ajustes | La hoja "¿Qué quieres registrar?", como hasta hoy |

### D2. Sin alta a la vista, la hoja de siempre

Si la sección no tiene primario en el encabezado, o lo tiene oculto (`hidden`), el botón abre la hoja del 024 D2. Nunca queda sin hacer nada.

### D3. El Fondo es la única excepción declarada

Su encabezado no lleva primario (el fondo no se "crea" muchas veces: se aporta). El botón busca en la sección la acción de aportar y, si no está, la de empezar el fondo. Es la única lista escrita a mano, en `ui/shell.js`.

### D4. El nombre accesible dice lo que va a pasar

El `aria-label` del botón central toma el del primario de la sección y vuelve a "Registrar: gasto, ingreso, pago o ahorro" donde abre la hoja. El rótulo visible sigue siendo "Registrar".

### D5. Escritorio no cambia

El botón "Registrar" de la barra superior y la tecla N siguen abriendo la hoja: en escritorio el alta de la sección ya está al lado, en la misma barra.

## Alternativas descartadas

- **Un mapa hash a acción en el shell.** Segunda fuente de verdad junto al primario del encabezado; se desincroniza en cuanto una sección cambia su alta.
- **Mis cuentas abre la hoja porque tiene dos altas (cuenta e ingreso).** Esteban eligió "Nueva cuenta": es el primario de la pantalla, y el ingreso conserva su fila propia.
- **Cambiar también el rótulo visible** ("Meta", "Cuenta"). El ancho del slot central no alcanza para todos los nombres y el rótulo estable ayuda a reconocer el botón (mismo criterio que el botón "Más", ADR 069 H5).

## Consecuencias

- Registrar un gasto deja de estar a un toque desde las secciones con alta propia (Mis cuentas, Metas, Reservas, Me deben, Inversión, Fondo, Por pagar, Límites). Sigue a un toque desde Inicio y desde Gastos, que son dos de los cinco slots de la barra. Esteban lo aceptó de forma explícita.
- La regla "un solo primario por encabezado" pasa a tener un segundo lector. Un encabezado con dos `.btn-primary` haría que el botón central tome el primero.
