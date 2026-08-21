# ADR 089 - Movimientos: la quinta fuente, el rango plegado y dos puertas nuevas

**Estado:** Aceptada. Ficha 15 de la auditoría móvil (MOV.1), implementada el 2026-08-21.
**Fecha:** 2026-08-21
**Autores:** Esteban (producto), Claude Design (auditoría), Claude Opus 5 (análisis e implementación)
**Relación:** cierra la ficha 15 de MOV.1 sobre el dominio `movimientos`. **Confirma la pregunta principal** que la ficha 03 dejó abierta: la sección se queda en "Consultar". **Usa el patrón de acceso contextual prefiltrado** que la ficha 07 definió ([ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8) y que el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D5 y el [ADR 081](081-calendario-la-forma-del-mes-entradas-incluidas.md) ya reutilizan. **No toca** la derivación sin log paralelo del [ADR 028](028-inicio-centro-de-control.md) D5 ni el `Abono[]` del schema v34 ([ADR 047](047-me-deben-v2-intereses-e-historial.md)). **Confirma y acota la candidata R90** que dejó el [ADR 088](088-me-deben-urgencia-de-cobro-y-direccion-con-forma.md).

---

## Contexto

Movimientos es la única sección sin datos propios: deriva su contenido de otras colecciones y no guarda ni una fila. Eso hace verificable su pregunta principal, y la ficha la probó contra el código en vez de asumirla.

**Se queda, y con evidencia.** Responde cuatro preguntas que ninguna otra vista responde: qué pasó un día concreto sin importar el dominio, dónde está un pago buscándolo por texto (es el único buscador de la app), qué pasó en un rango libre de fechas, y qué pasó en un mes viejo. Las cinco salidas posibles se probaron: desaparecer deja esas cuatro preguntas sin dueño; fusionar con Gastos choca con el reloj de mes de ese bloque, incompatible con un historial cuya gracia es cruzar meses; fusionar con Análisis mezcla enumerar con agregar, y esa sección no está auditada; y subir a la barra falla las cuatro condiciones de R84.

Los cuatro hallazgos:

| Id | Hallazgo | Severidad |
|---|---|---|
| M1 | El "historial completo" omite tres dominios, y uno de ellos ya tiene los datos guardados | Crítico |
| M2 | 224px de filtros antes del primer movimiento, en la vista donde el contenido es todo | Alto |
| M3 | Una sola entrada real en toda la app, y la teja de "Más" existe por una regla, no por un uso | Alto |
| M4 | La fila borra con efectos en otro dominio y no los anuncia | Medio |

**M1 es el que puede tumbar la sección:** si el historial transversal no es transversal, su única razón de existir queda a medias. La app tiene siete colecciones que mueven dinero y el ledger derivaba de cuatro. De las tres que faltan, **los préstamos ya tienen el dato**: `S.personales[].abonos` guarda fecha, monto, desglose y cuenta desde el schema v34, exactamente la forma que el ledger pide. Metas y apartados no lo tienen, y dárselo es cambiar el modelo.

---

## Decisión

### D1. Los abonos de préstamos entran como quinta fuente

`movimientosDesdeAbonos(personales)` en `logic.js`, con la misma forma que las cuatro que ya existen: dirección `ingreso`, dominio `personales`, descripción "Abono de Camila". Recibe los préstamos y no los abonos porque el nombre de la persona vive en el padre, y es lo que hace legible la fila.

Tres detalles decididos acá:

- **El id es sintético** (`prestamo.id` + índice): un abono no tiene id propio.
- **La fila no ofrece acciones.** Corregir un abono se hace en Me deben, donde está el préstamo entero con su desglose. El ledger lo enumera, que es lo que un ledger hace con lo que no le pertenece.
- **El abono `agrupado` de la migración v34 entra igual, con su marca.** Resume lo cobrado antes de que existiera el historial y su fecha es aproximada, así que el subtítulo dice **"Antes de este historial"** en vez de imprimir esa fecha como si fuera exacta. Es la misma copia que ya usa el historial por préstamo en Me deben.

**`personales` entra también a `_SECCIONES_FUENTE`**, la lista que decide qué `state:change` repinta el ledger. Sin eso, registrar un cobro habría dejado el abono fuera de la vista hasta recargar: el mismo defecto que la ficha 08 encontró en el dashboard de compromisos.

**Metas y apartados quedan fuera, documentados.** Necesitan que cada aporte guarde su fecha, y eso cambia el schema, la migración y probablemente las fichas 09 y 10, que están cerradas. El precedente está en la propia app (los préstamos ganaron `abonos[]` en v34 justo por esto), así que va a la ficha 18 con el argumento hecho.

### D2. El rango de fechas se pliega

`<details>` nativo con el summary "Filtrar por fechas", cerrado por defecto y **abierto solo si ya hay una fecha puesta**: esconder un filtro activo dejaría la lista recortada sin explicación. Cero JS, con el estado accesible por teclado y anunciado por el lector, igual que los desplegables de Ajustes y Análisis. La clase es de este dominio: la de Ajustes vive en `config.css` y es de esa sección.

Buscador y chips se quedan arriba, sin plegar: son el motivo de la visita. **"Limpiar filtros" sube junto a los chips**, fuera del plegable, para que se vea aunque esté cerrado.

Medido en la app a 375px: la barra pasa de 256px abierta a **160px cerrada**, y el control cuesta 44px (el piso táctil del proyecto). Se acepta que quien use el rango a menudo pague un toque: es el control menos frecuente de los tres y el más caro en altura.

### D3. Dos entradas prefiltradas nuevas

| Desde | Botón | Lleva |
|---|---|---|
| El pie de la lista de Gastos ("Día a día") | "Ver historial completo" | el chip **Gastos** puesto, sin rango |
| Cada tarjeta de Mis cuentas | "Ver sus movimientos" | la **cuenta** puesta, como pastilla que se puede quitar |

Las dos van por `EventBus.emit('movimientos:ver', ...)`, que es el receptor que ya existía y no tenía llamadores externos: **el emisor nombra lo que conoce** (su dominio, su cuenta) y la pantalla destino pone el filtro, porque los filtros son estado de ese módulo y ningún dominio importa a otro (ADN 10). Es el reparto que el ADR 081 fijó para las llegadas a "Por pagar".

La salida de Gastos **no lleva rango de fechas a propósito**: la gracia del historial es cruzar meses, justo lo que el reloj de ese bloque no puede hacer. Y va al pie de la lista, no al encabezado: es la salida de quien ya recorrió el mes y no encontró lo que buscaba.

**El filtro por cuenta es nuevo y su predicado tiene una decisión:** una transferencia cuenta para **sus dos** cuentas, porque filtrar por la de origen y perder el traslado que entró ahí dejaría el saldo sin explicación. El aporte al fondo queda fuera de cualquier filtro por cuenta: no movió ninguna, que es la misma razón por la que no cuenta como activo aparte. La pastilla guarda el id y resuelve el nombre en vivo, así que renombrar la cuenta no la desactualiza (mismo criterio que la descripción de una transferencia, MC.17c).

### D4. El borrado dice qué se lleva

El comportamiento no cambia: la reversa ya funcionaba y estaba bien resuelta (`_ACCIONES_POR_TIPO` enruta por tipo y hereda las reversas del dominio dueño). Lo que cambia es que **se anuncia**, y se anuncia con los efectos reales que la función va a aplicar, no con una plantilla:

> ¿Quieres eliminar "Pago Tarjeta Nu"? Borrarlo devuelve $184.000 a "Bancolombia" y sube de nuevo el saldo de "Tarjeta Nu". Esta acción no se puede deshacer.

Un gasto sin cuenta y sin deuda no promete devolver nada. **El aporte al fondo también gana su frase** ("baja ese monto del total del fondo, sin tocar el saldo de ninguna cuenta"): su efecto era igual de invisible desde el ledger. El ingreso puntual y la transferencia ya nombraban el suyo y no se tocan.

### D5. R90 confirmada y acotada

Movimientos es el **caso independiente** que el ADR 088 pedía, y lo resuelve por el lado contrario: acá la dirección **ya** se señalaba con forma. `+` al ingreso, `-` al egreso y nada al traslado interno; el color solo acompaña. Cuatro tipos de movimiento de cuatro dominios y ninguno depende del color.

La regla se acota en dos puntos: admite **tres estados** (entra, sale, y ni una cosa ni la otra, que es el traslado interno) y aplica **solo donde conviven varias direcciones**. En una vista de una sola dirección, como la lista de Me deben o "Por pagar", el signo sería ruido constante. **Sigue candidata hasta la ficha 18**, ahora con un caso independiente que antes no tenía.

### D6. Lo que no se mueve

La ubicación en "Consultar", el nombre, la derivación sin log paralelo, el enrutado por tipo y no por dominio, la paginación por lotes con observer (PERF.1), los dos estados vacíos distintos, la transferencia como dirección neutra con su 4x1000 en el subtítulo, la descripción de transferencia resuelta en vivo y el "Volver a Inicio" del encabezado.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Que el ledger ofrezca editar el abono, como ofrece editar un gasto | Un abono no es un registro suelto: es parte del historial de un préstamo, con desglose capital/interés y una cuenta. Corregirlo fuera de Me deben pide replicar ahí ese formulario |
| Dejar el abono `agrupado` fuera del ledger por tener fecha aproximada | El abono existió y su plata entró. Ocultarlo volvería a abrir el agujero de M1 para todo usuario migrado. Se muestra y se dice que su fecha no es exacta |
| Darle historial fechado a metas y apartados en esta misma ficha | Cambia el schema y la migración, y legisla sobre dos fichas cerradas (09 y 10). Va a la 18 con el precedente del v34 escrito |
| Plegar también el buscador, o los chips | Son el motivo de la visita. El buscador es la única forma de responder "dónde está ese pago" en toda la app |
| Dejar "Limpiar filtros" dentro del plegable, donde estaba | Con el rango cerrado, el único botón que deshace un filtro quedaría escondido detrás del filtro menos usado |
| Filtrar por cuenta con el buscador de texto y el nombre de la cuenta | Frágil (depende del nombre) y falso: la búsqueda mira la descripción, así que un gasto de esa cuenta sin su nombre escrito no aparecería |
| Que una transferencia cuente solo para su cuenta de origen | El traslado que entró explica el saldo de la de destino. Perderlo al filtrar deja la cuenta sin la mitad de su historia |
| Quitarle editar y borrar al ledger, por ser una lente de "Consultar" | Corregir el registro es la operación natural sobre un histórico, a diferencia de pagar (que es lo que Calendario sí cedió). Lo que faltaba era anunciar el efecto, no quitar la acción |
| Escribir una regla nueva con M1 ("una vista que promete todo enseña todo") | Caso único en quince fichas, y de completitud de datos, no de interfaz |

---

## Consecuencias

- **El ledger pasa de 4 a 5 de las 7 fuentes que mueven dinero.** Un abono recibido deja de no estar en ninguna vista cronológica de la app.
- **La barra de filtros baja de 256px a 160px** con el rango cerrado, y la lista gana esas filas en cada visita.
- **Movimientos pasa de dos puertas a cuatro**, y dos de ellas llegan con la pregunta ya filtrada. La entrada por "Ver todo" del panel de Inicio dejó de existir con el ADR 087, así que sin esto la sección se quedaba con la teja de "Más" como única puerta real.
- **`movimientosRecientes()` sigue sin consumidor** (el panel de Inicio se retiró con el ADR 087) pero ahora también deriva la quinta fuente, así que el día que la ficha 16 lo adopte lo hace completo.
- **Un usuario que borra desde el ledger sabe qué se lleva** antes de confirmarlo, incluso cuando el efecto ocurre en una sección que no está viendo.
- **Lo que va a la ficha 18:** el historial fechado para metas y reservas (la otra mitad de M1, con el precedente del schema v34); la redacción final de R90 con sus tres estados y su alcance acotado; que "Consultar" aloja dos criterios distintos de solo lectura (Calendario cedió sus acciones, Movimientos las conserva y acá sí son propias de un ledger); y **R88 llega a la ficha 16 con una sola aparición: es su última oportunidad** antes de que la 18 la descarte.
- **R89a suma su segundo caso positivo** (orden por fecha descendente, declarado con divisores de mes, correcto para la pregunta de un ledger) y **R89b su mejor caso**: el panel y la vista completa no comparten criterio, comparten función (`movimientosCompletos()` es `movimientosRecientes(fuentes, Infinity)`), así que no pueden divergir. R86 y R87 sin caso.
