# ADR 032 - Logros v2: niveles progresivos, niveles de usuario y regla anti-gaming

**Estado:** Propuesta (2026-07-09). Pendiente de que Esteban valide: (1) el catálogo de familias y niveles de la sección D4, (2) los nombres de los niveles de usuario de D5 (los propuestos son ejemplos, igual que los del brief), (3) la decisión de reubicación en dos tiempos de D6. Nada se codifica antes de esa validación (regla de la tarjeta LG.2a).
**Fecha:** 2026-07-09
**Autores:** Esteban (visión de producto, brief de Análisis puntos 1-5 del 4.º lote), Claude Fable 5 (análisis y diseño)
**Relación:** **revisa el [ADR 022](022-vitrina-de-logros-en-ajustes.md)** (vitrina en Ajustes: su decisión de ubicación se supera en dos tiempos, ver D6; su disciplina de evaluación barata y su modelo de persistencia se conservan y se refuerzan). Toca de lado el [ADR 028](028-inicio-centro-de-control.md) (una tarjeta nueva en Inicio pasa por la revisión de Inicio v2/IN.8, no por esta ADR). Conserva la decisión D6 del [ADR 025](025-logotipos-de-marca-y-tejas.md): los emojis de logros se quedan (momentos expresivos, no UI estructural).

---

## Contexto

Los logros hoy (G.3 + LG.1a/LG.1b): un catálogo plano de **11 logros binarios** en `logros/logic.js`, cada uno con `eval(S)` O(1), persistidos como `string[]` de ids en `S.logros` (un logro ganado nunca se revoca), un toast con confetti al desbloquear y una vitrina de solo lectura al final de Ajustes (ADR 022). La base es simple a propósito: evaluación barata en cada `state:change`.

El brief de Esteban (2026-07-08, Análisis puntos 1-5) pide evolucionarlos:

1. **Reubicación:** el progreso vive en Análisis (apartado propio) + una tarjeta de logros recientes/próximos en Inicio. Hoy la vitrina está en Ajustes por el ADR 022: moverla exige revisar esa decisión formalmente, no en silencio.
2. **Niveles progresivos** por logro: primer gasto → primer mes completo → 3 meses consecutivos → 6 meses...
3. **Niveles de usuario** que evolucionan con los hábitos (nombres por definir; los del brief son ejemplos).
4. **Regla de oro anti-gaming** (pedida como principio innegociable): premiar hábitos saludables, nunca la omisión de información.
5. **Logros por interpretación de comportamiento** (mejoró su % de ahorro varios meses, redujo gasto hormiga, terminó una deuda antes de lo previsto).

Hechos del código verificados antes de diseñar (2026-07-09):

- `S.logros` es `string[]` plano; `evaluarLogros(S)` recorre el catálogo con try/catch por logro; `estadoLogros()` arma la vitrina; la persistencia manda sobre la evaluación en vivo (sin revocación).
- Los gastos tienen fecha: las derivaciones mensuales y las rachas son calculables. `infra/memo.js` (PERF.2) ya ofrece memoización para que una derivación O(gastos) no corra en cada `state:change`.
- Las deudas saldadas dejan rastro (`saldoPendiente` llega a 0 vía abonos; las consolidadas quedan `archivada`), pero el usuario puede borrarlas después: cualquier conteo histórico sobre `S` puede retroceder.
- **El ingreso real del mes no tiene hoy una derivación canónica**: existen ingresos puntuales (movimientos) e ingresos fijos (plan, no registro). Un logro de "% de ahorro" depende de una derivación que probablemente construya ANL.1; no se inventa aquí una paralela.

## Decisión

### D1. Modelo de progresión: cada nivel es un logro con id propio (sin bump de schema)

Un "logro con niveles" se modela como una **familia**: varios logros independientes que comparten el campo nuevo `familia` y llevan `nivel` (1, 2, 3...). Cada nivel tiene su propio `id`, su `eval(S)` y su fila en el catálogo.

- `S.logros` **sigue siendo `string[]`**: cero migración, cero bump de schema, y la regla "un logro ganado no se revoca" aplica por nivel sin lógica nueva.
- Los ids existentes se reutilizan como primeros niveles de su familia (`primer-gasto` = registro nivel 1, `diez-gastos` = registro nivel 2, `meta-lograda` = metas nivel 1): los usuarios actuales conservan su progreso sin tocar datos.
- La vitrina agrupa por familia y muestra **una sola tarjeta por familia**: el nivel más alto desbloqueado + el siguiente nivel como objetivo (con su barra de progreso si aplica). Los logros sin familia se muestran como hoy.
- La fecha de desbloqueo NO se persiste en esta fase (exigiría cambiar la forma de `S.logros` y un bump): si algún día se quiere "desbloqueado el 12 de mayo", será una decisión aparte.

### D2. Regla de oro anti-gaming (principio innegociable de esta ADR)

**Los logros premian hábitos saludables y información completa; NUNCA la omisión de registro.** Concretamente:

1. **Prohibidos** los logros del tipo "día sin gastos", "semana gastando menos de X%", "mes por debajo del presupuesto" o cualquier métrica que mejore si el usuario deja de registrar: incentivan ocultar información, contra el propósito de Finko.
2. **Test de gaming obligatorio** para todo logro nuevo, presente o futuro: "¿este logro se consigue más fácil borrando u omitiendo datos que usando bien la app?". Si la respuesta es sí, no entra al catálogo.
3. **Guardia de mes completo:** todo logro que dependa de una *reducción* de gasto (ej. gasto hormiga) solo evalúa meses que califiquen como "mes completo de registro" (D3). Reducir el gasto registrándolo todo es un hábito; "reducirlo" dejando de registrar no desbloquea nada.
4. Lo que sí se premia: constancia de registro, planes de ahorro cumplidos, fondo completado, deudas saldadas o pagadas a tiempo, equilibrio entre grupos de gasto, uso de las herramientas de decisión.

### D3. "Mes completo de registro": la unidad de constancia

Definición barata y verificable: un mes calendario es **completo** si tiene gastos registrados en **al menos 3 semanas distintas** del mes (semana = bloque de 7 días desde el día 1; el bloque final corto cuenta como semana). Un solo pase O(gastos del mes), memoizado por mes con `infra/memo.js`.

- Es deliberadamente laxa (3 de ~4.4 semanas): premia el hábito sin castigar una semana de vacaciones.
- Las **rachas** ("3 meses completos consecutivos") se calculan hacia atrás desde el mes anterior al corriente (el mes en curso nunca rompe ni completa una racha: aún no terminó).
- La derivación vive en `logros/logic.js` como función pura sobre `S.gastos` (sin importar de otros dominios, ADN 10).

### D4. Catálogo v2 (PENDIENTE DE VALIDACIÓN por Esteban)

Los 11 logros actuales se conservan (ids intactos). Se reorganizan en familias y se agregan niveles y familias nuevas:

**Familia "registro" (constancia de registro):**

| Nivel | Id | Nombre propuesto | Condición | Datos |
|---|---|---|---|---|
| 1 | `primer-gasto` (existente) | Primer gasto | 1 gasto registrado | ya existe |
| 2 | `diez-gastos` (existente) | Hábito registrado | 10 gastos | ya existe |
| 3 | `mes-completo` | Un mes completo | 1 mes completo de registro (D3) | derivación D3 |
| 4 | `tres-meses-seguidos` | Tres meses seguidos | racha de 3 meses completos | derivación D3 |
| 5 | `seis-meses-seguidos` | Medio año de constancia | racha de 6 | derivación D3 |
| 6 | `doce-meses-seguidos` | Un año contigo | racha de 12 | derivación D3 |

**Familia "metas" (planes de ahorro cumplidos):**

| Nivel | Id | Nombre propuesto | Condición |
|---|---|---|---|
| 1 | `meta-lograda` (existente) | Lo lograste | 1 meta completada |
| 2 | `tres-metas` | Triple cumplidor | 3 metas completadas |
| 3 | `cinco-metas` | Coleccionista de metas | 5 metas completadas |

**Familia "deudas" (deudas saldadas):**

| Nivel | Id | Nombre propuesto | Condición | Nota |
|---|---|---|---|---|
| 1 | `primera-deuda-saldada` | Una deuda menos | 1 deuda con abonos llevada a saldo 0 | excluye consolidaciones (la deuda no se pagó, se transformó) |
| 2 | `tres-deudas-saldadas` | Rompedeudas | 3 deudas saldadas | el conteo puede retroceder si el usuario borra deudas; el logro ganado no se revoca (regla vigente) |

**Sin familia (se quedan como están):** `primer-paso`, `primer-compromiso`, `tesorero`, `soñador`, `planificador`, `diversificador`, `prestamista`, `fondo-emergencia`. El progreso fino del fondo sigue viviendo en su anillo de la sección Ahorro (decisión del ADR 022 que se mantiene: no duplicar ese cálculo aquí).

**Familia "comportamiento" (interpretación, fase LG.2e, cada uno debe pasar el test de gaming de D2):**

| Id | Nombre propuesto | Condición | Dependencia de datos |
|---|---|---|---|
| `hormiga-a-raya` | Hormiga a raya | gasto hormiga del mes < promedio de los 3 meses anteriores, **solo entre meses completos de registro** (guardia D2.3) | categorías hormiga/café (TX.3), derivación mensual memoizada |
| `ahorro-creciente` | Ahorro que crece | el balance mensual (ingresos registrados - gastos) mejora 3 meses seguidos, solo entre meses completos | **bloqueado**: necesita la derivación canónica de ingreso mensual (probable entregable de ANL.1); no construir una paralela |
| `pagador-puntual` | Pagador puntual | 3 meses seguidos pagando todas las cuotas del mes antes de su fecha | verificar en implementación si el histórico de abonos por fecha alcanza; si no, se difiere |

"Terminó una deuda antes de lo previsto" (brief) se **difiere sin tarjeta**: exige comparar contra un plan guardado (snapshot de la simulación de estrategia) que hoy no se persiste; se reevalúa cuando exista.

### D5. Niveles de usuario: derivados, no persistidos

El nivel del usuario se **calcula** del total de logros desbloqueados (`S.logros.length` filtrado contra el catálogo vigente): cero estado nuevo, cero migración, imposible de desincronizar. Con el catálogo v2 (~20 logros):

| Logros | Nivel propuesto (EJEMPLOS, nombres por definir con Esteban) |
|---|---|
| 0-2 | Semilla |
| 3-5 | Brote |
| 6-9 | Constante |
| 10-13 | Organizado |
| 14-17 | Estratega |
| 18+ | Leyenda del ahorro |

- Los nombres deben ser cercanos y sin jerga (ADN 11), nunca condescendientes; se validan con Esteban antes de codificar.
- El nivel se muestra en el encabezado de la vitrina ("Nivel: Constante, 7 de 20 logros") y, cuando exista, en la tarjeta de Inicio.
- Sin puntos ni XP: el conteo simple es transparente ("cada logro suma 1") y no introduce una economía que haya que balancear.

### D6. Reubicación en dos tiempos (la revisión formal del ADR 022)

**Principio aceptado:** con niveles y comportamiento, los logros dejan de ser meta-información ocasional (el argumento del ADR 022) y pasan a ser parte de la interpretación del progreso financiero. Su lugar final es **Análisis** (apartado "Tu progreso") con una **tarjeta compacta en Inicio** (nivel actual + último logro + próximo objetivo).

**Ejecución diferida:** la mudanza NO se implementa hasta que ANL.1 defina el layout de Análisis e IN.8 revise Inicio (ADR 028). Mover la vitrina hoy significaría posicionarla dos veces. Mientras tanto, **el ADR 022 sigue vigente operativamente**: la vitrina permanece en Ajustes, y las fases LG.2b/LG.2c (progresión, constancia) se construyen sobre ella. Cuando ANL.1 e IN.8 aterricen, la rebanada LG.2d ejecuta la mudanza y el ADR 022 pasa a "Superada".

### D7. Disciplina de rendimiento (se conserva y se refuerza)

- Los `eval(S)` siguen siendo O(1) sobre `S` **o** lecturas de derivaciones mensuales memoizadas (`infra/memo.js`, invalidadas por referencia de `S.gastos` y por cambio de mes), nunca barridos completos por evaluación.
- La evaluación sigue disparándose por `state:change` (patrón actual); el toast, su cola y el resumen "N logros nuevos" no cambian.
- Los emojis del catálogo se conservan (ADR 025 D6); la tarjeta de familia muestra el emoji del nivel más alto desbloqueado.

### Fases (rebanadas a crear en el BOARD tras la validación)

| Rebanada | Alcance | Depende de |
|---|---|---|
| **LG.2b** | Fundación de progresión: campos `familia`/`nivel` en el catálogo, vitrina agrupada por familia, nivel de usuario en el encabezado. Sin schema bump. | validación de esta ADR |
| **LG.2c** | Derivación "mes completo de registro" + rachas (memoizadas) + niveles 3-6 de registro + familia deudas | LG.2b |
| **LG.2d** | Mudanza: apartado "Tu progreso" en Análisis + tarjeta en Inicio; ADR 022 pasa a Superada | ANL.1 (layout) e IN.8 (Inicio v2) |
| **LG.2e** | Familia comportamiento (hormiga-a-raya; ahorro-creciente y pagador-puntual según disponibilidad de datos), cada logro con test de gaming explícito en el PR | LG.2c; ahorro-creciente además de la derivación de ingreso mensual (ANL.1) |

## Alternativas consideradas

1. **Puntos/XP con pesos por logro.** Descartada: exige balancear una economía, invita a farmear, y el valor para el usuario de "350 XP" es menor que "7 de 20 logros". El conteo simple es transparente y suficiente para derivar niveles.
2. **Persistir el progreso derivado (rachas, conteos) en `S`.** Descartada: todo es derivable de los datos primarios; persistirlo crea una segunda fuente de verdad que puede desincronizarse (mismo criterio que "niveles derivados, no persistidos" de D5). La memoización resuelve el costo.
3. **Bump de schema a `S.logros = [{ id, fecha }]`** para guardar fecha de desbloqueo. Descartada por ahora: la fecha es nice-to-have, el bump toca migración y seeds E2E, y no la pide el brief. Reevaluable como rebanada independiente si Esteban la quiere.
4. **Racha diaria estilo Duolingo.** Descartada: la presión diaria no corresponde al ciclo natural del dinero personal (los gastos no son diarios para todo el mundo) y roza el patrón oscuro de culpabilizar la pausa. El ciclo de Finko es mensual; la laxitud de D3 (3 de ~4.4 semanas) es deliberada.
5. **Mudar la vitrina a Análisis ya mismo.** Descartada: sin el layout de ANL.1 se posiciona dos veces (regla anti-doble-trabajo del triaje). La mudanza es la última rebanada, no la primera.

## Consecuencias

### Positivas

- Progresión real sin tocar el modelo de datos: cero migración, usuarios actuales conservan todo.
- La regla anti-gaming queda escrita como principio con test verificable por PR, no como intención.
- Las derivaciones de constancia (mes completo, rachas) quedan disponibles para otros consumidores futuros (ej. mensajes de Análisis: "llevas 4 meses registrando sin fallar").
- Cada fase es verificable por separado y la mudanza no bloquea el resto.

### Negativas / Restricciones

- El catálogo crece de 11 a ~20 logros: la vitrina agrupada por familia es obligatoria para que no se vuelva una lista abrumadora (LG.2b la incluye por eso).
- `ahorro-creciente` y `pagador-puntual` quedan condicionados a datos que hoy no existen en forma canónica: el catálogo se publica por tandas, no completo de una vez.
- Sin fecha de desbloqueo, la tarjeta de Inicio dirá "último logro" según el orden de `S.logros`, no por fecha real (aceptable: el array preserva orden de inserción).
- Dos briefs futuros podrían pedir logros de reducción de gasto: la guardia D2.3 los condiciona a mes completo de registro, lo que hace su copy más difícil de explicar. Costo asumido: la alternativa (premiarlos sin guardia) incentiva dejar de registrar.
