# ADR 013 - Distribución "Automático inteligente" (a la medida de los datos)

**Estado:** Aceptada (diseño). Implementación pendiente por slices.
**Fecha:** 2026-06-29
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)

---

## Contexto

"¿Cómo distribuir mi dinero?" recomienda repartir el ingreso en 3 grupos (Necesidades / Estilo de vida / Ahorro) con una barra de presets: **Automático**, 50/30/20, 70/20/10, 60/20/20 y **✎ Personalizar** (ver MC.2). El motor es `sugerirDistribucionIngreso`.

El modo **Automático** de hoy adapta la distribución solo según el peso de los gastos fijos (`pctFijos = gastos fijos / ingreso`):

- `pctFijos > 70` → Necesidades hasta 85%, ahorro mínimo, estilo de vida lo que reste.
- `pctFijos > 50` → Necesidades = pctFijos, ahorro al menos 10%, estilo de vida el resto.
- en otro caso (lo más común) → **exactamente 50/30/20**.

Esto produce dos problemas que el usuario señaló:

1. **Se siente rote.** En el caso común (gastos fijos bajos o sin registrar) Automático devuelve 50/30/20 fijo. No mira las deudas (solo lanza una alerta), ni el estado del fondo de emergencia, ni las metas/apartados con plazo, ni los límites de gasto, ni las inversiones. No es "a la medida".
2. **Hay duplicidad.** La barra muestra a la vez un chip "Automático" y un chip "50/30/20" que, en el caso común, dan el mismo resultado. Dos botones para lo mismo confunden.

La visión del usuario (MC.6): que Automático **analice toda la información financiera registrada y recomiende una distribución personalizada**, y que se **elimine la duplicidad** con los presets fijos.

Datos disponibles hoy (todos derivables de `S`, sin inventar nada):

| Señal | De dónde |
|---|---|
| Ingreso mensual estimado | `estimarSalarioMensual(S.ingresos)` |
| Gastos fijos mensuales | `calcularGastosFijosMensuales(S.compromisos)` (tipo `fijo`) |
| Cuotas de deuda mensuales | `cuotaMensual` de `S.compromisos` tipo `deuda-entidad` / `deuda-personal` |
| Saldo y tasa de cada deuda | `saldoTotal`, `tasa`, `tasaUnidad` de las deudas |
| Fondo de emergencia (activo, faltante, completo) | `S.ahorro.fondoEmergencia` + meta = gastos fijos × `metaMeses` |
| Metas / apartados con plazo | `S.metas` (`montoObjetivo`, `montoActual`, `fechaLimite`), `S.apartados` (`fechaObjetivo`) |
| Límites de gasto por categoría | `S.presupuestos` (`montoMensual`) |
| Inversiones | `S.inversiones` |
| Frecuencia y día de cobro | `S.ingresos[].frecuencia` / `diaPago` |

---

## Decisión

### 1. Automático "a la medida" sobre el modelo de 3 grupos (no waterfall por destino)

Automático sigue devolviendo una distribución en **3 grupos** (Necesidades / Estilo de vida / Ahorro), pero los porcentajes se **calculan desde los datos reales** en vez de una regla fija. El reparto fino por destino (cuánto al fondo, a cada deuda, a cada meta) lo sigue haciendo el **panel de MC.4** y, más adelante, el asistente guiado de 3 pasos (MC.7). MC.6 se queda en "calcular bien los 3 porcentajes".

El cálculo es un modelo de **pisos por prioridad** que luego se resuelve a 3 grupos:

**Paso 1: Necesidades (piso obligatorio).**
`necesidades = gastos fijos mensuales + cuotas de deuda mensuales`. Son las obligaciones que sí o sí hay que cubrir: arriendo, servicios, suscripciones y la **cuota mínima/mensual de cada deuda**. (Decisión clave: la cuota de deuda vive en Necesidades, no en Ahorro; pagar lo mínimo de una deuda es una obligación, no un ahorro.)

**Paso 2: Ahorro (prioridades financieras, en orden).**
El monto objetivo de ahorro es la suma de las prioridades activas:
  1. **Fondo de emergencia incompleto:** una porción para cerrarlo (apuntar a completarlo en un horizonte razonable, ej. el faltante repartido en N meses).
  2. **Abono extra a deudas caras:** por encima de la cuota mínima, cuando hay deudas con interés alto (la app ya recomienda Avalancha en MC.4b).
  3. **Metas y apartados con plazo:** el aporte mensual necesario para llegar a tiempo = `faltante / meses restantes` por objetivo con fecha.
  4. **Base saludable:** si no hay ninguna prioridad urgente (fondo completo, sin deudas, sin objetivos con plazo), un ahorro base sano (referencia ~20%), para no recomendar 0% de ahorro a quien ya tiene todo cubierto.

**Paso 3: Estilo de vida (lo que queda), con piso de sostenibilidad.**
`estilo de vida = 100% - necesidades - ahorro`, pero con un **piso mínimo suave** (no recomendar 0%: la vida tiene que ser sostenible). El piso de estilo de vida **cede ante las Necesidades** (obligaciones reales) pero **gana sobre el ahorro "extra"**: si no alcanza para todo, se recorta primero el ahorro acelerado, no la comida.

**Paso 4: Normalización.** Garantizar que los 3 sumen 100, ninguno negativo, y resolver el residuo de redondeo en un solo grupo.

**Guardarraíles:**
- Necesidades nunca baja de las obligaciones reales (piso duro). Si las obligaciones ya superan el ingreso, Necesidades tiende a 100% y se emite una **alerta fuerte** ("tus obligaciones consumen casi todo tu ingreso"): se muestra la realidad, no se maquilla.
- Los **límites de gasto** (`S.presupuestos`), si existen, informan el Estilo de vida: si la suma de límites encaja en el % sugerido, se confirma; si lo excede, se alerta. No fuerzan el cálculo, lo validan.
- Inversiones: en este ADR son una **prioridad de ahorro secundaria** (después del fondo) y material para CTAs/mensajes, no un piso duro.

Resultado: distribuciones distintas para realidades distintas. Gastos fijos altos + deudas → Necesidades alto, Ahorro modesto, Estilo de vida delgado (con alerta). Sin deudas, fondo completo, sin metas → base sana (cercana a 50/30/20 pero presentada como "tu base", no como una regla de libro). Fondo incompleto → Ahorro sube para cerrarlo. Metas con fecha → el Ahorro refleja el aporte mensual necesario.

### 2. Resolver la duplicidad: Automático por defecto, clásicos como secundarios

- **Automático es el preset por defecto** y el camino principal (ya es el default `presetDistribucion: 'auto'`).
- La **fila principal** de la barra muestra solo: **Automático** (a la medida) y **✎ Personalizar**.
- Los 3 presets fijos (50/30/20, 70/20/10, 60/20/20) se mueven a un **grupo secundario "Métodos clásicos"** (un disclosure colapsable / segunda fila), para quien quiera comparar con reglas estándar conocidas. No se eliminan (50/30/20 es un ancla mental conocida), pero dejan de competir visualmente con Automático. Esto resuelve la duplicidad sin perder opciones.

### 3. Transparencia y tono (ADN #11)

- Automático **siempre explica en una línea por qué** propone esos porcentajes (la `razon` ya existe y se enriquece): ej. "Ajustamos tu distribución: tus obligaciones son el 58% de tu ingreso, tu fondo aún no está completo y tienes 2 metas con fecha." No es una caja negra: transparencia = confianza y enseña.
- Nunca prescriptivo: "te sugerimos", "puedes ajustar". Personalizar y los clásicos siguen disponibles para sobreescribir.
- Solo usa datos registrados. Con poca info, cae a una base sensata y muestra CTAs para registrar (gastos fijos, metas, fondo) y afinar. El valor diferencial crece a medida que el usuario registra.

### 4. Schema

- **Sin cambios de schema.** Todos los inputs se derivan de slices existentes. `presetDistribucion` ya vive en `S.config`.
- El cambio es en la **lógica** del modo `auto` de `sugerirDistribucionIngreso` y en la **barra de presets** (view + CSS). El estado UI de "Métodos clásicos" colapsado/expandido es efímero (no requiere persistirse).
- La lógica sigue **pura** (ADN #9): los nuevos insumos (cuotas de deuda, faltante del fondo, aporte mensual a objetivos con plazo, suma de límites) se calculan con helpers puros que **reciben arrays planos** desde `view.js` (que lee `S`), sin importar otros dominios (ADN #10), igual que ya hace `calcularGastosFijosMensuales`.

---

## Alternativas consideradas

- **Dejar 'auto' como está (adaptativo solo por gastos fijos):** no resuelve la queja (sigue cayendo en 50/30/20 en el caso común y la duplicidad persiste). Descartada.
- **Optimización dura a montos exactos por destino (waterfall tipo asistente):** más potente, pero rompe el modelo de 3 grupos como titular y agranda el slice hasta solaparse con MC.7. Descartada para MC.6 (confirmado con el usuario: el alcance es "% de los 3 grupos a la medida").
- **Eliminar todos los presets fijos:** algunos usuarios confían en 50/30/20 como referencia conocida; quitarlos pierde un ancla mental. Descartada a favor de demoverlos a un grupo secundario (confirmado con el usuario).
- **Recomendar sin explicar (caja negra):** erosiona la confianza y choca con el tono del proyecto. Descartada: Automático siempre dice el porqué.
- **Meter la cuota de deuda en Ahorro:** confunde "pagar lo mínimo" (obligación) con "ahorrar/abonar extra" (prioridad). Descartada: la cuota mínima va en Necesidades; el abono acelerado va en Ahorro.

---

## Consecuencias

### Positivas

- La recomendación deja de ser rote: refleja la realidad de cada usuario (deudas, fondo, metas con plazo, gastos fijos, límites).
- Se elimina la duplicidad visual: Automático es el camino principal; los clásicos quedan como comparación opcional.
- La explicación del porqué construye confianza y enseña a distribuir.
- Sin cambios de schema; la lógica sigue pura y testeable; el panel de MC.4 consume el mismo `split` sin cambios.

### Negativas / Restricciones

- Más lógica condicional en `sugerirDistribucionIngreso`: hay que cuidar que siga legible y bien cubierta por tests (cada prioridad y cada piso es un caso).
- "Inteligente" puede sorprender: la recomendación cambia cuando el usuario registra o edita datos. Se mitiga con la explicación del porqué y con Personalizar/clásicos siempre a mano.
- Necesita datos para brillar: con poca info cae a una base sensata (sin regresión), y el diferencial aparece a medida que el usuario registra.
- Casos extremos (obligaciones > ingreso) pueden empujar Estilo de vida al piso: se acompaña de una alerta honesta, no se esconde la realidad.

---

## Slices de implementación (smallest-first)

| Slice | Qué | Capas | Lógica/tests |
|---|---|---|---|
| MC.6a | Reescribir el modo `auto` de `sugerirDistribucionIngreso`: nuevos insumos (cuotas de deuda mensuales, faltante del fondo, aporte mensual a objetivos con plazo, suma de límites) + modelo de pisos (Necesidades obligatorias → Ahorro por prioridades → Estilo de vida con piso) + `razon` enriquecida. Sin tocar aún la barra de presets. | tesoreria/logic.js (+ helpers puros) | tests por cada prioridad, piso y guardarraíl |
| MC.6b | Barra de presets: Automático + Personalizar en la fila principal; los 3 clásicos a un grupo secundario "Métodos clásicos" (disclosure). Copy de transparencia. | tesoreria/view.js + CSS | tests de render |
| MC.6c (opcional) | Señales más ricas: historial de gastos variables (promedio real como proxy de estilo de vida), inversiones como prioridad tras el fondo. | tesoreria/logic.js | tests |

Cada slice es verificable en la app de forma aislada. MC.6a entrega el valor central (la distribución a la medida); MC.6b elimina la duplicidad visual.

> Relación con otras épicas: MC.7 (asistente guiado de 3 pasos) construye sobre este motor para **pre-asignar montos por destino**; MC.5 (límites como centro de control de los 3 grupos) puede alimentar a Automático con una clasificación categoría → grupo más fina. Ambas son ADRs aparte.
