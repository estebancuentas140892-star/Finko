# ADR 018 - "Distribuir mi ingreso" como asistente guiado de 3 pasos

**Estado:** Propuesta (diseño). **Revisada el 2026-07-02:** el Paso 1 pasa de preview read-only a checklist accionable que registra pagos reales (ver sección "Revisión 2026-07-02"). Decisiones de modelo cerradas con el usuario; el detalle de cada slice se afina al implementarlo.
**Fecha:** 2026-07-01 (revisión: 2026-07-02)
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño), Claude Fable 5 (revisión 2026-07-02)
**Relación:** implementa la épica **MC.7**. Evoluciona el panel "Distribuir mi ingreso" de [ADR 012](012-auto-distribucion-ingresos.md) (MC.4a-e). Reusa `sugerirDistribucionIngreso` y `calcularAporteMensualObjetivos` de [ADR 013](013-distribucion-automatica-inteligente.md), el mapeo sección → grupo de [ADR 014](014-taxonomia-categorias-transversal.md) y la identidad "Mis cuentas planifica, Límites vigila" de [ADR 017](017-limites-centro-de-control.md). Respeta la regla de cuenta única del proyecto.

---

## Contexto

Hoy "Distribuir mi ingreso" (MC.4a-e) es un **panel inline** en Mis cuentas. El usuario abre el panel, confirma el monto a distribuir y reparte con filas editables hacia tres tipos de destino que **mueven dinero de verdad**:

- **Ahorro:** fondo de emergencia, metas y apartados. El fondo recibe por defecto todo el presupuesto de ahorro ("fondo primero", teachable); metas y apartados arrancan en 0 y el usuario los ajusta.
- **Deudas:** abonos reales, ordenados por prioridad de pago estilo avalancha (mayor interés efectivo primero).
- **Inversiones:** aporte de capital al holding.

**Necesidades** y **Estilo de vida** solo se muestran como referencia ("esto queda en tu cuenta, no se mueve"): las obligaciones se pagan al vencer y el estilo de vida se gasta a lo largo del mes. El panel está gated por la fecha de cobro (MC.4d): la acción solo aparece cuando el pago del periodo llegó y aún no se distribuyó.

El modelo funciona, pero deja trabajo manual y conocimiento en manos del usuario: metas y apartados arrancan en 0 (no sabe cuánto aportar a cada uno), Necesidades es una cifra agregada sin desglose, y todo vive en un solo panel plano. El usuario propone convertirlo en un **asistente guiado** que haga el trabajo pesado y lo deje a él solo **revisar, ajustar y confirmar**:

1. **Necesidades** itemizada automáticamente (gastos fijos de Agenda, cuotas de deuda, compromisos del periodo) con nombre, categoría y valor.
2. **Ahorro** con aportes **auto-calculados por objetivo** según su meta y la frecuencia del ingreso (ej. una meta de $5.000.000 a un año, con ingreso quincenal, sugiere cuánto por quincena), priorizando el fondo de emergencia con el excedente.
3. **Estilo de vida** repartido entre las cuentas activas.

---

## Decisión

### 1. Evolucionar el panel MC.4, no coexistir dos UIs

El panel inline actual **se transforma** en el asistente; no se mantienen dos flujos de distribución en paralelo (sería confuso y duplicaría lógica). El asistente reusa todo lo que MC.4 ya hace bien: el gating por fecha de cobro (MC.4d), los abonos avalancha a deudas (MC.4b), los aportes a inversiones (MC.4e) y el apply-plan vía EventBus que descuenta la cuenta y soporta undo.

### 2. Paso 1 - Necesidades: vista de desglose (read-only), sin mover dinero ni schema

> **Revisada el 2026-07-02.** Esta decisión cambió tras validar MC.7c en la app: el Paso 1 deja de ser read-only y pasa a ser una checklist accionable que registra pagos reales. Ver la sección "Revisión 2026-07-02". El texto original se conserva como historia.

**Decisión del usuario.** El Paso 1 **itemiza** las Necesidades del periodo (gastos fijos marcados en Agenda, cuotas mínimas de deuda, compromisos con fecha) mostrando nombre, categoría y valor, para que el usuario **vea** cuánto de su ingreso ya está comprometido. Pero **el dinero no se mueve**: queda en su cuenta y paga cada obligación al vencer, exactamente como hoy.

- **Coherente con el modelo actual y con el ADN:** no introduce un saldo "reservado" ni cambia el concepto de dinero disponible. Sin schema nuevo.
- **Honesto:** el desglose refleja lo que el usuario ya registró (Agenda + deudas); su fidelidad depende de que mantenga esos datos al día, igual que el ejecutado de Límites (ADR 017).
- Se descartó **reservar/apartar** el dinero de Necesidades (ver Alternativas): daría más control pero exige schema para el saldo reservado y toca el ADN; queda para un ADR posterior si el usuario lo pide.

### 3. Paso 2 - Ahorro: aportes auto-calculados por objetivo

**Núcleo de la épica y primer slice.** Hoy `calcularAporteMensualObjetivos` **suma** el aporte ideal de todos los objetivos con fecha pero solo devuelve el total. El asistente necesita el **desglose por objetivo**: una fila por meta y apartado con su aporte sugerido. Se agrega una función pura nueva que devuelve ese desglose, reusando la misma fórmula por objetivo (`faltante / meses restantes`, con `Math.ceil`):

- **Objetivo con fecha** (meta con `fechaLimite`, apartado con `fechaObjetivo`): aporte sugerido = faltante para su meta dividido entre los periodos que quedan hasta la fecha. Así una meta de $5.000.000 a un año reparte su aporte a lo largo de los meses restantes.
- **Objetivo sin fecha:** sugiere **0** y muestra un hint suave ("ponle una fecha para calcular tu aporte"). El asistente no adivina; el usuario ajusta a mano. Además crea un incentivo natural para completar los datos.
- **Fondo de emergencia:** conserva la prioridad. Recibe el **excedente** del presupuesto de ahorro una vez cubiertos los aportes de los objetivos con fecha (si el fondo aún no está completo). Mantiene el espíritu "fondo primero" pero ahora convive con objetivos concretos que tienen su propio ritmo.
- Todo es **editable**: el auto-cálculo es el punto de partida, no una imposición. La suma se valida contra el presupuesto de ahorro (reusa `resumirPlanDistribucion`).

### 4. Paso 3 - Estilo de vida: repartir entre cuentas, respetando la regla de cuenta única

El Paso 3 reparte el presupuesto de Estilo de vida entre las **cuentas activas** del usuario (dónde quiere tener disponible ese dinero para el día a día).

- **Con una sola cuenta activa el paso se omite:** no hay nada que repartir. El asistente pasa de 3 a 2 pasos. Respeta la regla de cuenta única del proyecto (con una sola cuenta nunca se pregunta cuenta de origen/destino).
- **Con dos o más cuentas** el asistente sugiere un reparto inicial editable del presupuesto de Estilo de vida entre ellas.
- **Si ese reparto genera o no movimientos entre cuentas** (transferencias reales vs guía visual) se decide en el slice de implementación del Paso 3, siguiendo la misma filosofía "preview primero, schema mínimo" del Paso 1. Es el último slice y el menos urgente.

### 5. Deudas: la cuota mínima es Necesidad; el abono extra vive junto a Ahorro

> **Ajustada el 2026-07-02:** la cuota mínima sigue viviendo en el Paso 1, pero ya no como fila informativa: es un item de la checklist que, al marcarse, registra el abono real de la cuota. El abono extra sigue junto al Paso 2. Ver "Revisión 2026-07-02".

Una deuda tiene dos caras. La **cuota mínima mensual** es una obligación: aparece en el desglose del Paso 1 (Necesidades), sin mover dinero. El **abono extra** para acelerar el pago es una decisión de asignación: se mantiene como fila editable junto al Paso 2, porque pagar deuda de alto interés equivale a un rendimiento garantizado (coherente con ubicarlo cerca del Ahorro) y así se preserva el orden avalancha de MC.4b. El detalle de dónde exactamente se muestra el abono extra se afina al implementar el shell del asistente.

### 6. Confirmación única al final

> **Ajustada el 2026-07-02:** la confirmación única ahora también aplica los pagos de las Necesidades marcadas en el Paso 1. Ver "Revisión 2026-07-02".

El usuario recorre los pasos (revisa, ajusta) y **confirma una sola vez**. El asistente aplica solo lo que mueve dinero: aportes de Ahorro (fondo, metas, apartados), abonos a deudas y aportes a inversiones, con el mismo apply-plan y undo de MC.4. Necesidades (Paso 1) y el reparto de Estilo de vida entre cuentas (Paso 3, salvo su eventual variante con transferencias) son informativos: no generan movimientos.

### 7. Sin schema nuevo en v1

Paso 1 es preview; Paso 2 reusa el apply-plan de Ahorro que ya existe; Paso 3 con una cuenta se omite y con varias arranca como guía. No se bumpea `SCHEMA_VERSION`. Consistente con el ADN, con MC.5 (ADR 017) y con la filosofía "cero fricción, cero datos nuevos". Un eventual "reservado" para Necesidades o transferencias entre cuentas para Estilo de vida tendría su propio ADR y schema.

---

## Revisión 2026-07-02 - El Paso 1 se vuelve accionable (checklist que mueve dinero)

### Contexto de la revisión

MC.7a, MC.7b y MC.7c ya están entregados: el panel muestra los aportes de ahorro auto-calculados por objetivo y el desglose itemizado de Necesidades como preview read-only, tal como definió la decisión 2 original. Al validar ese preview en la app, el usuario dio una dirección nueva (2026-07-02): ver el desglose está bien, pero el valor real está en **actuar sobre él**. Cada grupo del asistente debe mostrar sus registros como **checklist seleccionable**, no como lista informativa: el usuario marca qué obligaciones cubre con este cobro y Finko registra esos pagos por él.

### R1. Paso 1 - Necesidades: checklist que registra pagos reales (reemplaza la decisión 2)

Cada item de la checklist (gastos fijos de Agenda + cuotas de deudas entidad y personales) muestra **nombre, cuota del periodo actual y día de pago**. La cuota es el pago real de esa obligación (fijo: su `monto` por ocurrencia según su frecuencia; deuda: su `cuotaMensual`), **nunca el saldo total** de la deuda ni un equivalente mensual normalizado: la checklist paga obligaciones concretas, no reparte porcentajes.

- El usuario **marca cuáles cubre con este ingreso**; el total seleccionado se acumula en vivo.
- Los items **ya pagados este periodo** aparecen como pagados y fuera de la selección, con el mismo criterio del badge "Ya pagaste este mes" de Agenda: existe un gasto del mes vinculado vía `compromisoId`. Ese guard compartido evita el doble registro entre el asistente y el botón "Marcar pagado" de Agenda.
- Al confirmar, cada item marcado genera **exactamente los mismos registros que su flujo individual existente**: un gasto fijo marcado produce lo mismo que "Marcar pagado este mes" de Agenda (gasto con `compromisoId`, categoría "Gastos fijos", descuento de cuenta); una cuota de deuda marcada produce lo mismo que un abono (baja `saldoTotal`, gasto de categoría "Deudas", descuento de cuenta). El asistente es un **atajo por lotes sobre flujos que ya existen**, no un tipo de movimiento nuevo: badges del calendario, ejecutado de Límites (ADR 017), lista de Gastos y Análisis quedan coherentes sin trabajo extra.
- Lo **no marcado** se comporta como hoy: el dinero queda en la cuenta y la obligación se paga al vencer (desde Agenda o desde Deudas).

### R2. Cuentas: una sola pregunta al confirmar (patrón cuenta-helper)

La pregunta "¿de qué cuenta sale el dinero?" se hace **una sola vez**, al confirmar el asistente completo, con el patrón `cuenta-helper` que ya usa todo movimiento de dinero: con **una sola cuenta activa no se pregunta** (regla de cuenta única); con varias, el selector de tarjetas. El ingreso se acredita primero a esa cuenta y todos los pagos y aportes se descuentan de ella, igual que hace MC.4 hoy. No se pregunta cuenta por cada item: sería fricción sin beneficio para el caso común (un cobro llega a una cuenta y de ahí se paga).

### R3. Presupuesto encadenado: los pasos operan sobre el remanente real

El Paso 2 (Ahorro) sugiere sus aportes sobre el **remanente real** del cobro tras las Necesidades marcadas en el Paso 1, no sobre el porcentaje teórico del split. La validación es una sola para todo el asistente: el total asignado (Necesidades marcadas + aportes de ahorro + abonos extra + inversiones) no puede exceder el monto del cobro (generaliza `resumirPlanDistribucion`). Lo que el usuario decida no cubrir con este cobro puede pagarlo después desde los flujos de siempre.

### R4. Confirmación única y undo (ajusta la decisión 6)

La confirmación única al final ahora aplica **también** los pagos de Necesidades marcadas, junto con los aportes de Ahorro, abonos extra e inversiones, con el mismo apply-plan por EventBus y el mismo snapshot para "Deshacer". **Nota de implementación obligatoria:** el snapshot de deshacer (`_SLICES_DISTRIBUCION` en `tesoreria/index.js`) hoy no incluye la slice `gastos`; como el Paso 1 crea gastos, hay que agregarla o el "Deshacer" dejaría pagos huérfanos.

### R5. Sin schema nuevo (confirma la decisión 7)

La revisión no toca el schema: los pagos del Paso 1 son gastos normales (shape existente, `compromisoId` existente) y los abonos actualizan `saldoTotal` como siempre. La decisión 7 se mantiene íntegra.

### Qué pasa con lo ya construido en MC.7c

El desglose read-only de MC.7c no se tira: **evoluciona a checklist en MC.7d**. `construirDesgloseNecesidades` se extiende para devolver la cuota del periodo (en vez del equivalente mensual normalizado), el día de pago y el estado "ya pagado este periodo"; la vista reemplaza el `<details>` informativo por filas seleccionables con el mismo patrón toggle + monto del resto del panel.

### Alternativas consideradas en la revisión

- **Mantener el Paso 1 read-only** (decisión 2 original). Descartada por el usuario tras probar el preview: informar sin actuar deja el trabajo de registrar cada pago en Agenda, uno por uno, justo después de haberlos revisado en el asistente.
- **Reservar el dinero de Necesidades como saldo no gastable.** Sigue descartada, igual que en el ADR original: exige schema nuevo y toca el ADN. La checklist logra el objetivo (que lo comprometido no se pierda de vista) registrando pagos reales, sin saldo reservado.
- **Pagar todas las Necesidades automáticamente al confirmar, sin checklist.** Descartada: el usuario decide qué cubre con cada cobro. Una quincena puede cubrir solo parte de las obligaciones del mes; marcar es la forma honesta de reflejarlo.
- **Preguntar cuenta por cada item marcado.** Descartada: fricción multiplicada para el caso común. Una pregunta al confirmar, con el patrón compartido, cubre el flujo real (el cobro llega a una cuenta).

### Consecuencias de la revisión

- **Positivas:** el asistente pasa de informar a ejecutar (el usuario revisa, marca y confirma una vez, en lugar de distribuir aquí y luego ir a Agenda a marcar pagos uno por uno); coherencia total con los registros existentes porque reusa los flujos de pago actuales; el guard "ya pagado este periodo" compartido elimina el riesgo de doble registro.
- **Negativas / restricciones:** la confirmación única concentra más responsabilidad (ahora también registra pagos de obligaciones), así que el copy del resumen previo a confirmar debe decir con claridad qué se va a registrar; el snapshot de undo crece (slice `gastos`); la checklist depende de que Agenda y Deudas estén al día, la misma restricción de fidelidad que ya tenía el preview.

---

## Alternativas consideradas

- **Paso 1 que reserva/aparta el dinero de Necesidades** (saldo "reservado" no gastable). Da más control y evita que el usuario gaste lo comprometido, pero exige schema para el saldo reservado, cambia el concepto de dinero disponible y toca el ADN. Descartada por el usuario para v1; queda como evolución posible.
- **Paso 2 que reparte el excedente entre objetivos sin fecha** (tras cubrir fondo y objetivos con fecha). Más proactivo, pero adivina la intención del usuario sobre objetivos que ni siquiera tienen plazo. Descartada por el usuario a favor de sugerir 0 con invitación a poner fecha.
- **Mantener el panel plano de MC.4 y solo sumarle el auto-cálculo de Ahorro.** Menos trabajo, pero no cumple la visión del asistente guiado (Necesidades itemizada, pasos claros) que el usuario pidió. El auto-cálculo se implementa primero (primer slice) pero dentro del plan de convertir el panel en asistente.
- **Un dominio o modal nuevo para el asistente.** Más aislado, pero duplica infra y aleja el trabajo del panel de distribución que ya vive en `tesoreria`. Se prefiere **evolucionar el panel** reusando su apply-plan, su gating por fecha y sus filas editables.
- **Wizard multi-pantalla con rutas propias (un hash por paso).** Más "app-like", pero suma routing y estado de navegación frágil para un flujo corto. Se prefiere un asistente **inline por pasos** (avanzar/atrás dentro del mismo contenedor), coherente con el resto de la UI sin build step.

---

## Consecuencias

### Positivas

- **Quita trabajo y conocimiento al usuario:** el asistente propone cuánto aportar a cada objetivo y desglosa las Necesidades; el usuario solo revisa y ajusta.
- **Reuso máximo:** `sugerirDistribucionIngreso` y `calcularAporteMensualObjetivos` (ADR 013), el apply-plan/undo, el gating por fecha y los abonos avalancha (ADR 012, MC.4), la regla de cuenta única. Poca superficie nueva.
- **Cero fricción y cero schema:** todo es derivado o reusa el apply-plan existente. No se pide ningún dato nuevo ni se migra nada.
- **Cierra el círculo con Límites (ADR 017):** el mismo reparto que el asistente ejecuta es el que Límites vigila. "Mis cuentas planifica, Límites vigila" se vuelve literal.
- **Incentiva completar datos:** los objetivos sin fecha (aporte 0 + hint) empujan suavemente a ponerles plazo, lo que mejora todo el modelo de distribución.

### Negativas / Restricciones

- **Más superficie de UI en un flujo:** tres pasos (o dos) piden cuidar la jerarquía, la navegación avanzar/atrás y el rendimiento en móvil. Se mitiga reusando componentes existentes y confirmando una sola vez.
- **Fidelidad del Paso 1 dependiente del registro:** el desglose de Necesidades es tan bueno como lo que el usuario mantenga en Agenda y Deudas. El copy debe ser honesto (igual que en ADR 017).
- **El Paso 3 solo aporta valor con varias cuentas:** con cuenta única se omite; su versión con transferencias reales queda diferida y sin decidir hasta su slice.
- **Cambio de hábito:** los usuarios de MC.4 verán un flujo distinto. Se mitiga conservando los mismos conceptos (mover a ahorro, abonar deudas, aportar inversión) y el mismo momento (gating por cobro).

---

## Slices de implementación (smallest-first)

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app (desktop + móvil) con tests. El orden arranca por el Paso 2 (auto-cálculo de Ahorro), por decisión del usuario: es el valor "inteligente" más tangible y construye sobre el apply-plan que ya existe, antes de reorganizar el panel en asistente.

| Slice | Qué | Capas |
|---|---|---|
| **MC.7a** | `logic.js` puro: función que devuelve el **desglose de aportes de ahorro por objetivo** (una fila por meta/apartado con su aporte sugerido: `faltante / periodos restantes` para los que tienen fecha, 0 para los que no; fondo con el excedente si está incompleto). Reusa la fórmula de `calcularAporteMensualObjetivos`. Tests unitarios. | `tesoreria/logic.js`, tests |
| **MC.7b** | Integrar ese desglose como **default editable** en las filas de Ahorro del panel actual (reemplaza el default "todo al fondo" de `construirPlanAhorro`), con hint para objetivos sin fecha. Verificable en el panel de hoy + E2E. | `tesoreria/logic.js` + `view.js` + `index.js`, tests + E2E |
| **MC.7c** | Paso 1 - **desglose itemizado de Necesidades** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo) como preview read-only, con nombre/categoría/valor. Lógica de agregación pura + vista. | `tesoreria/logic.js` + `view.js`, tests + E2E |
| **MC.7d** | Convertir el panel en **shell de asistente por pasos** (avanzar/atrás inline, confirmación única al final), integrando el Paso 1 (Necesidades como **checklist accionable**, revisión 2026-07-02: cuota del periodo + día de pago + guard de pagado, registra pagos reales al confirmar) y el Paso 2 (Ahorro auto + abonos deuda + inversiones como checklist). Incluye extender `construirDesgloseNecesidades` y sumar la slice `gastos` al snapshot de undo. | `tesoreria/logic.js` + `view.js` + `index.js`, tests + E2E |
| **MC.7e** | Paso 3 - **reparto de Estilo de vida entre cuentas** (omitido con una sola cuenta; guía editable con dos o más). Se decide aquí si genera transferencias o es solo guía. | `tesoreria/logic.js` + `view.js` + `index.js`, tests + E2E |
| **MC.7f (opcional)** | Pulido: copy de cada paso, transiciones, accesibilidad del asistente (foco al avanzar, `aria` de pasos), estados vacíos. | `view.js`, `styles`, tests |

> Estado al 2026-07-03: **MC.7a, MC.7b, MC.7c y MC.7d entregados**. MC.7d se entregó en dos partes el 2026-07-03: primero la checklist accionable de Necesidades (R1/R4/R5), luego el shell paginado (Necesidades → Ahorro/Deudas/Inversiones → Estilo de vida, confirmación única al final) y el presupuesto de ahorro sobre el remanente real (R3, helper `presupuestosSobreRemanente` con tope en la sugerencia teórica del split). Queda MC.7e (Paso 3 accionable) y el pulido opcional MC.7f.
>
> Modelos sugeridos para los slices restantes (escala Claude 5, revisada 2026-07-02): **MC.7d** Sonnet 5 - Alto (reorganiza el panel en asistente, integra la checklist accionable y su navegación). **MC.7e** Sonnet 5 - Medio/Alto según se decida mover dinero. **MC.7f** Sonnet 5 - Bajo. La lógica de fechas/aportes no toca normativa CO ni el ADN, así que no requiere Opus.
