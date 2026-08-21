# ADR 081 - Calendario: la forma del mes, entradas incluidas

**Estado:** Aceptada. Implementada en la ficha 08 de la auditoría UX/UI móvil (MOV.1).
**Fecha:** 2026-08-20
**Autores:** Esteban (producto), Claude Design (ficha 08 de la auditoría móvil), Claude Opus 5 (implementación)
**Relación:** **supera el [ADR 037](037-calendario-v2-visual.md) D1 en la mitad del hero** (el total a pagar del mes y su progreso pagado/falta) y **acota su D5** (el label del total del día). Conserva el resto del ADR 037 entero: la grilla, el detalle del día, el callout del ingreso, el ojo de privacidad. **Completa el [ADR 069](069-bloque-gastos-en-la-barra-movil.md) D8** en su hallazgo G4: la lente "Por pagar" pasa a obedecer el reloj del bloque también para su estado de pago y su lote. Conserva entero el [ADR 071](071-calendario-como-mapa-del-mes-en-escritorio.md) (composición de escritorio: la banda sigue siendo la banda, con el hero nuevo dentro). Y **retira una decisión de la ficha 05**: el "Marcar pagado" que aquella dejó en el detalle del día, con su razón declarada abajo.

---

## Contexto

La ficha 05 dejó a Calendario sin el alta de gastos fijos y sin el pago en lote. La ficha 08 llegó a medir lo que quedaba y encontró que **la sección medía la mitad de lo que dibuja**:

- **K1, crítico.** El hero decía "Compromisos de agosto $1.867.800". Tres bloques más abajo, la grilla pintaba también el día 15 con un punto verde de ingreso, y esa cifra no incluía nada de lo verde. Dos funciones distintas alimentaban la misma pantalla: `totalesDelMes()` para el hero y `eventosIngresosDelMes()` para la grilla, y el hero nunca leía la segunda. Con eso, el resumen respondía a la misma pregunta que "Por pagar" y la respondía peor, porque no traía la lista.
- **K3, alto.** El detalle del día conservaba cuatro acciones: "Editar", "Eliminar" y, según el tipo, "Marcar pagado" o "Abonar". La ficha 05 las dejó "como atajo declarado", pero **cuatro atajos en una fila no son un atajo**: son la interfaz de administración que se suponía mudada. Y contradecía el rótulo bajo el que la ficha 03 metió la sección: "Consultar: tres lentes de solo lectura, ninguna crea nada".
- **K4, alto.** Lo único irrepetible de la sección era lo que menos se veía. El día de ingreso se distinguía por un punto de 8px entre otros puntos, y para llegar al callout de apartar y al botón "Distribuir" había que adivinar qué día era y tocarlo.
- **K2, crítico, ya resuelto.** Tres textos internos prometían el alta que se fue. Dos los arregló la ficha 05; queda uno de copia, no de función.
- **K5, medio, no se toca acá.** El día vencido se pinta ámbar en Calendario y rojo en Inicio y en "Por pagar". Las dos decisiones tienen razón escrita y buena; elegir un lado es una decisión de tono que ninguna ficha tomó. Va a la ficha 18.

La condición 1 de la puerta de "Más" se verificó dato por dato, no por impresión: de las seis cosas con fecha que la sección enseña, **cinco tienen otra superficie más accesible**. La única exclusiva es "entradas y salidas sobre la misma línea de tiempo", y descuidarla no cuesta dinero: cuesta perspectiva. El "≈" que dejó la ficha 03 pasa a "✓".

---

## Decisión

Reducir. Calendario deja de ser una lista de pagos con cuadrícula y pasa a ser lo único que sabe hacer y nadie más hace: **enseñar cuándo entra el dinero y cuándo sale, sobre la misma línea de tiempo**.

### D1. El encabezado mide el mes entero (resuelve K1 y K4)

El hero **no se borra: se sustituye** por uno que mide lo que la grilla dibuja. Su protagonista pasa de ser el total a pagar a ser **lo que queda**:

```
Te queda en agosto
$682.200
Entra $2.550.000   Sale $1.867.800
Lo primero vence el 1; tu primer ingreso llega el 15.
```

- `flujoDelMes()` nueva en `agenda/logic.js`, pura: suma las dos direcciones y devuelve el primer día de cada lado. **Las dos cifras ya se calculaban**; acá se dejan de ignorar. Los aportes de meta siguen fuera de las dos sumas, igual que en `totalesDelMes()`: un aporte planeado es un recordatorio, no dinero movido.
- Cuando sale más de lo que entra, el label pasa a **"Te falta en agosto"** y la cifra va en positivo. Sin color de alarma: deber un pago no es un error del usuario ([ADR 019](019-limites-por-rol.md)).
- La línea de fechas es lo que ninguna otra sección puede escribir, y **el ojo no la enmascara**: son fechas, no montos.
- **Lo que se pierde: el progreso pagado/falta del ADR 037 D1.** Quien quiere saber qué le falta pagar del mes lo tiene en "Por pagar", con la lista y el lote. Aquí ocupaba el sitio de la mitad del mes que faltaba.
- El resumen del día hereda el mismo criterio (**acota el ADR 037 D5**): pasa de "Total a pagar" a "Sale $X · no entra nada" / "Entra $X · no sale nada" / "Entra $X · sale $Y". La afirmación en positivo del D5 se conserva: con todo cubierto dice "Pagado este día".

### D2. El día se lee; se actúa en "Por pagar" (resuelve K3)

Las cuatro acciones de la fila de salida se sustituyen por **una salida**: "Ver en Por pagar", prefiltrada a ese compromiso. El evento de la ficha 06 (`porPagar:ver-deuda`) se generaliza a `porPagar:ver-compromiso` y **el chip lo decide la lente destino**, no el emisor: quien llama sabe de qué compromiso habla, no de la taxonomía de la otra pantalla.

**La fila de ingreso conserva su acción**, y no es una excepción: repartir un ingreso no tiene otra casa dentro del mes. Esa asimetría es la decisión.

### D3. Prerrequisito: "Por pagar" obedece el reloj del bloque

Sin esto, D2 destruye una capacidad. El "Marcar pagado" del detalle del día era **la única superficie capaz de registrar el pago de un mes que no fuera el actual** (BUG-015), y por eso la ficha 05 lo conservó. Ahora esa puerta es "Por pagar", que desde la ficha 07 sí navega meses:

- `renderListaCompromisos()` toma su mes de `prefijoMesBloque()` y no del calendario del sistema. Con eso, el chip "Pagado", el estado de cada fila y el `data-mes` del botón hablan del mes que la lente muestra.
- La tarjeta del lote liquida ese mismo mes.
- El guardia del mes futuro deja de vivir en el botón y vive antes, en la navegación: el reloj del bloque se corta en el mes en curso, así que a un mes que aún no ha vencido no se llega.

**Hueco que esto destapó y que también se cierra:** los botones de mes del bloque repintan con `renderAll()`, pero **ninguna de las tres lentes tenía su render de sección registrado ahí**. El encabezado cambiaba de mes y el contenido se quedaba en el anterior hasta que el usuario navegara a otra sección. Las tres lo registran ahora (`renderSmart` corta si su sección no está activa, así que no cuesta nada).

### D4. El día de ingreso se marca en la grilla (resuelve K4)

`cal-day--ingreso`, con el mismo mecanismo que `cal-day--vencido` y el color de ingresos que la leyenda y el punto ya usan. Cero tokens nuevos. Se declara **antes** que `--vencido` a propósito: un día que trae un ingreso y además un pago vencido se pinta como vencido, que es lo que hay que atender.

### D5. El vacío no promete lo que ya no tiene (resuelve K2)

El mes despejado dice lo que es cierto ("no hay nada con fecha este mes: ni pagos programados ni ingresos previstos") y su primario es "Programar en Por pagar". El `data-action` del alta ya lo había quitado la ficha 05; lo que faltaba era la copia.

### D6. El nombre se conserva, y una línea lo hace cierto

"Calendario" se queda: es lo que la pantalla es y está aprendido. Se probaron "Mi mes" (colisiona con el reloj del bloque Gastos), "Agenda" (nombre interno del dominio, y sugiere citas) y "Flujo de caja" (terminología contable). Bajo el `h1` va **"Cuándo entra y cuándo sale"**, con el par `.section__titulo` / `.section__linea` que estrenó la ficha 06 y que acá pasa de una sola sección a vocabulario compartido.

### D7. Lo que no se toca

La grilla con sus puntos y su navegación de meses. La leyenda. El detalle del día como lectura, con su badge de pago y su estado parcial. El callout del ingreso y su "Distribuir". El ojo (R20). El guardia de mes futuro. La composición de escritorio del ADR 071. Y el ámbar del día vencido (K5), que va a la ficha 18.

---

## Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Inflar el total del hero sumando los ingresos | Un total que mezcla las dos direcciones no responde ninguna pregunta. El defecto no era la cifra, era que callaba la mitad del mes |
| Conservar el progreso pagado/falta junto a las tres cifras nuevas | Cinco cifras en un encabezado de móvil. Y el progreso de pago es la pregunta de "Por pagar", que además trae la lista para hacer algo con ella |
| Dejar las cuatro acciones del detalle "como atajo declarado" | Es lo que decidió la ficha 05 y es lo que la 08 mide como defecto: cuatro atajos son la interfaz de administración completa, no un atajo. Mantiene en pie dos verdades sobre dónde se paga |
| Quitar el "Marcar pagado" sin mover el reloj de "Por pagar" | Destruiría la única forma de registrar el pago de un mes pasado (BUG-015). El prerrequisito no es opcional |
| Subir Calendario a la barra porque es el único sitio con la línea de tiempo | Cinco de las seis cosas con fecha tienen otra superficie más accesible, y la exclusiva no penaliza al que la descuida. Se queda en "Más" |
| Renombrar la sección | Tres alternativas probadas, todas peores: una colisiona con el reloj del bloque, otra es el nombre interno del dominio y la tercera es contabilidad |
| Unificar el ámbar y el rojo del vencido acá | Es un conflicto entre dos secciones y esta ficha solo ve una. Cambiarlo desde un lado movería la incoherencia de sitio |

---

## Consecuencias

- **La sección responde por primera vez su propia pregunta.** "¿Me alcanza hasta que entre lo siguiente?" no se contestaba en ninguna pantalla de la app.
- **Calendario encaja por fin en su rótulo.** Al perder las acciones de pago entra de verdad en "Consultar: ninguna crea nada", que hasta hoy era una promesa que incumplía.
- **Regla candidata R88**, del hallazgo K1: *el resumen mide lo que la vista dibuja*. Una sola aparición: candidata, pendiente de una segunda. No sustituye a R82, porque acá el alcance se declaraba ("Compromisos de agosto") y aun así engañaba.
- **R86 suma su tercera aparición**, con un matiz nuevo: el texto roto estaba en el **origen** de la mudanza, no en el destino ni en un tercero.
- **La cobertura de BUG-015 cambia de casa**, no desaparece: sus pruebas se mudan de `agenda.test.js` a `compromisos.test.js`, que es donde vive el botón ahora.
- **Deuda que queda anotada:** un mes con veinte compromisos y tres ingresos llena la grilla de puntos y el detalle crece sin techo. La ficha no propone agrupación porque no hay evidencia del umbral hasta que la ficha 15 mida el volumen real.
