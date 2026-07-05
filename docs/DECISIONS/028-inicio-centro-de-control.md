# ADR 028 - Inicio como centro de control financiero (arquitectura de información)

**Estado:** Propuesta. Pendiente de aprobación de Esteban antes de implementar cualquier fase. IN.7 (des-duplicación puntual entre paneles) ya se cerró como paso previo (`623a654`, 2026-07-05).
**Fecha:** 2026-07-05
**Autores:** Esteban (visión de producto, briefs del 2026-07-05), Claude Fable 5 (análisis y diseño)
**Relación:** continúa el [ADR 024](024-reorganizacion-navegacion-movil.md) (bottom nav de 5 con "Registrar" central): esta ADR no toca la navegación general, define los roles internos de la pantalla Inicio. Convive con IN.2 (ojo/máscara del saldo) e IN.3 (resumen semanal), que siguen vigentes. Se apoya en el [ADR 026](026-biblioteca-de-recursos-graficos.md) para los avatares ilustrados futuros. Base técnica verificada en [`docs/contexto/inicio.md`](../contexto/inicio.md).

---

## Contexto

Esteban entregó el 2026-07-05 un paquete de briefs que convergen en la misma pantalla: Inicio debe ser el centro de control financiero (en menos de 5 segundos el usuario sabe qué debe hacer hoy, qué puede olvidar, qué está haciendo bien y qué le recomienda Finko), con accesos rápidos personalizables (IN.4), saludo e identidad personal (IN.6), el aviso de distribución del ingreso traído desde Calendario (CAL.1) y un historial general de movimientos (TX.8). Pidió explícitamente analizar la estructura completa desde UX/UI y proponer alternativas mejores donde existan.

Hechos verificados en el código (detalle en la ficha de contexto):

1. **Hoy solo existe 1 acceso rápido** (Gasto rápido, botón hardcodeado en `index.html`), no 3 como asumía el brief de IN.4. El sistema de accesos se construye desde cero, no se "hace personalizable" algo existente.
2. **En móvil, más de la mitad de la app queda a 2 taps.** El bottom nav (ADR 024) tiene Inicio, Gastos, Registrar, Calendario y Deudas; Mis cuentas, Me deben, Límites, Análisis, Fondo, Metas, Apartados e Inversión viven detrás de "Más". Ese es el hueco real que los accesos personalizables llenan: 1 tap a las secciones favoritas que no están en la barra.
3. **`S.gastos` ya es el log de egresos de la app.** Los pagos de fijos crean gastos con categoría interna `'Gastos fijos'` y los abonos a deuda con `'Deudas'` (3 rutas de código); por eso la lista de Gastos "mezcla" movimientos de otras secciones: es literal, viven ahí. Además existen `S.ingresosPuntuales` (registros fechados de ingresos, v22) y `S.ahorro.aportes[]` (aportes fechados al fondo). Metas y apartados solo tienen acumuladores (`montoActual`), sin historial fechado por aporte.
4. **El asistente de distribución ya es invocable por evento** (`distribuir:abrir` vía EventBus, con modo `preacreditado` de NAV.A2b): CAL.1 no necesita mecanismo nuevo, solo un disparador visible en Inicio.
5. **`S.perfil.nombre` existe desde el onboarding** pero ninguna vista de Inicio lo lee.

## Decisión

### D1. Un rol por bloque, en este orden

Cada bloque de Inicio tiene una función única; ningún dato aparece en dos bloques (principio que IN.7 ya estableció). Orden vertical propuesto (móvil primero):

| # | Bloque | Rol único | Estado |
|---|---|---|---|
| 1 | Saludo | Identidad: "Buenos días, {nombre}" | nuevo (IN.6a) |
| 2 | Hero saldo | Cuánto tengo (IN.2 intacto) | existente |
| 3 | Accesos rápidos | 1 tap a mis secciones favoritas | nuevo (IN.4a) |
| 4 | Atención hoy | Lo que requiere acción: aviso de distribución (CAL.1), gastos por organizar, pendientes del mes (vencidos) | nudge nuevo + 2 existentes |
| 5 | Próximas prioridades | Lo que viene en ≤ 7 días (a futuro: recomendaciones de LIM.1/TX.10) | existente |
| 6 | Actividad reciente | Últimos 3 a 5 movimientos + "Ver todos" | nuevo (TX.8a) |
| 7 | Resumen semanal | Cómo voy esta semana (IN.3 intacto) | existente |

Los accesos van justo bajo el hero (patrón estándar de apps financieras: acciones frecuentes bajo el saldo) porque una sola fila compacta no empuja las alertas fuera del primer pantallazo.

### D2. Accesos rápidos personalizables (IN.4)

- **Catálogo `ACCESOS_INICIO`** en `constants.js`: `{ id, hash de ruta, nombre, icono }` por sección elegible (todas las secciones de la app). Sección nueva futura = 1 fila en el catálogo (escalabilidad pedida en el brief).
- **Preferencia del usuario**: `S.config.accesosInicio` (array ordenado de ids, 3 por defecto). Bump de schema (v23) con migración idempotente; el default exacto (sugerencia: 3 secciones fuera del bottom nav, ej. Mis cuentas, Metas, Análisis) se confirma con Esteban en la implementación.
- **Personalización v1 por lista, no drag & drop**: botón discreto "Personalizar" abre un modal con la lista de secciones; tocar agrega/quita, el orden es el orden de selección. Drag & drop y mantener presionado se descartan en v1: en vanilla JS móvil compiten con el scroll táctil, son hostiles a accesibilidad (WCAG 2.5.7) y el brief acepta "elegir los accesos desde una lista". Revisable si tras usarlo Esteban quiere reordenar con arrastre.
- **Render data-driven** con `data-action` delegado; tiles con el icono `i-*` de la sección y su color de dominio `--fk-dom-*` (mismo lenguaje visual del resto de la app).
- **Sugerencia por uso (IN.4b) se pospone**: requiere contadores de navegación por sección que hoy no existen. Se decidirá con Esteban después de convivir con la personalización manual; todo sería local (sin telemetría externa, ADN 3 intacto).

### D3. Saludo y avatar (IN.6)

- **IN.6a (saludo)**: "Buenos días / Buenas tardes / Buenas noches, {nombre}" según hora local (5-11 / 12-18 / resto). Usa `S.perfil.nombre` existente; si está vacío, saluda sin nombre. Sin dato nuevo, sin migración.
- **IN.6b (avatar)**: teja de iniciales por defecto (patrón visual ya existente en tejas de marca) + set de avatares ilustrados propios como `<symbol>` del sprite, diseñados por Esteban en Illustrator vía la biblioteca del ADR 026. Guardado: `S.perfil.avatar` (id del símbolo, entra en el mismo bump v23).
- **Fotografía: descartada en v1.** Una foto en base64 compite por el cupo de `localStorage` (~5 MB compartidos con todos los datos financieros), infla el export JSON y un `QuotaExceededError` podría tumbar el `save()` de datos reales. La mascota virtual queda fuera de alcance (es un producto en sí misma). Ambas revisables a futuro.

### D4. Aviso de distribución del ingreso en Inicio (CAL.1)

- **Nudge nuevo en el bloque "Atención hoy", renderizado por tesorería** (dueña del asistente y de `S.ingresos`): si hoy es día de ingreso de una fuente activa (`diaPago`, y `diaPago + 15` para quincenal), muestra "Hoy recibes {fuente}. Distribúyelo antes de empezar a gastarlo" con CTA que emite el `distribuir:abrir` existente. Si pasaron 1 a 3 días sin atenderlo, el copy cambia a "Tu ingreso llegó hace N días y aún no lo has distribuido".
- **Anti-insistencia**: un marcador por ciclo (se apaga al abrir el asistente o al descartar el aviso; forma exacta del campo se define en la implementación, con preferencia por entrar al bump v23 en vez de otro campo defensivo sin migración).
- **Reparto de responsabilidades que pidió el brief**: Inicio = cuándo actuar; Calendario = cuándo ocurre. El Calendario conserva la marca visual del día de ingreso (ADR 021 sigue vigente) y su tap sigue abriendo el asistente; lo que migra a Inicio es el rol de alerta accionable, no la visualización temporal.

### D5. Movimientos derivados, no doble contabilidad (TX.8)

- **El historial se deriva de los registros que ya existen**; no se crea un log paralelo `S.movimientos[]`. Fuentes v1: `S.gastos` (los internos `'Deudas'`/`'Gastos fijos'` revelan su origen; TX.6/TX.7 ya les dieron el icono del compromiso), `S.ingresosPuntuales` y `S.ahorro.aportes`. Un log nuevo duplicaría la verdad y no podría reconstruir la historia previa del usuario.
- **Dominio nuevo `modules/dominio/movimientos/`** (navegabilidad: se encuentra por nombre) con `logic.js` puro que normaliza las fuentes a un shape común `{ fecha, tipo, descripcion, monto, direccion, icono, cuentaId }`. Lee `S` directamente sin importar otros dominios (patrón ya establecido; ADN 10 intacto).
- **En Inicio solo lo reciente**: panel "Actividad reciente" con los últimos 3 a 5 movimientos y enlace "Ver todos" a la vista completa (ruta propia). El historial completo no vive incrustado en Inicio (regla de los 5 segundos).
- **Gastos se acota a su rol** (el brief de TX.8): `renderListaGastos()` deja de mostrar las categorías internas. Los registros no se tocan (Análisis, Límites y los cálculos siguen leyendo `S.gastos` igual); solo cambia qué lista la sección Gastos. Con esto Gastos queda enfocada en gasto cotidiano y el resto se consulta en Movimientos.
- **Resumen financiero (totales de ingresos/egresos/variación): no va en Inicio.** Análisis es el dueño de la interpretación (ANL.1 lo reforzará); duplicar indicadores crea dos lugares que mantener y recarga la pantalla. Dentro de la vista completa de Movimientos puede ir un encabezado compacto del mes (cuánto entró, cuánto salió); se decide en esa fase.
- **Limitación aceptada v1**: los aportes a metas y apartados no aparecen (no existen registros fechados, solo `montoActual`). Darles historial (`Aporte[]` como ya tiene el fondo) es un bump de schema en sus dominios; queda como extensión natural posterior, no bloquea el valor inicial.

### D6. Fases (tarjetas re-cortadas en BOARD.md)

| Tarjeta | Alcance | Modelo sugerido |
|---|---|---|
| **IN.6a** | Saludo dinámico con nombre en el encabezado de Inicio. | Sonnet 5 - Bajo |
| **CAL.1** | Nudge de distribución en "Atención hoy" + marcador anti-insistencia. | Sonnet 5 - Alto |
| **TX.8a** | Dominio `movimientos` (logic pura + tests) + panel "Actividad reciente". | Sonnet 5 - Alto |
| **TX.8b** | Vista completa de Movimientos (ruta propia) + Gastos deja de listar categorías internas. | Sonnet 5 - Alto |
| **IN.4a** | Catálogo `ACCESOS_INICIO` + tiles data-driven + modal "Personalizar" + schema v23. | Sonnet 5 - Alto |
| **IN.6b** | Avatares ilustrados (espera diseños de Esteban en `assets/svg/`). | Sonnet 5 - Medio |
| **IN.4b** | (Opcional, pospuesta) Sugerencia de accesos por frecuencia de uso. | decidir al llegar |

Orden recomendado: IN.6a → CAL.1 → TX.8a → TX.8b → IN.4a → IN.6b. Primero el valor diario visible (saludo, aviso de ingreso), después la plomería de datos (movimientos), y la personalización cuando el conjunto final de paneles esté estable. Una tarea por vez, verificada y pusheada antes de la siguiente (workflow de siempre).

## Alternativas consideradas

- **Log de eventos nuevo (`S.movimientos[]`) alimentado por cada acción.** Descartada: doble fuente de verdad frente a los registros existentes, riesgo de divergencia silenciosa, y nace vacío (no puede mostrar la historia previa del usuario). La derivación muestra desde el día uno todo lo ya registrado.
- **Drag & drop o mantener presionado para personalizar accesos.** Descartada en v1: en vanilla JS móvil compite con el scroll táctil, exige alternativa accesible de todos modos (WCAG 2.5.7) y el brief acepta la lista. Si se quiere después, se agrega sobre la misma estructura de datos sin rehacer nada.
- **Fotografía de perfil.** Descartada en v1 por el cupo de `localStorage` compartido con los datos financieros y el peso en el export/import. El avatar ilustrado propio da la conexión emocional buscada sin ese riesgo y alimenta la biblioteca del ADR 026.
- **Resumen financiero (totales) en Inicio.** Descartada: es interpretación, territorio de Análisis (ANL.1). Inicio orienta a la acción; Análisis explica.
- **Un "centro de notificaciones" único que absorba todos los avisos.** Descartada: los paneles actuales ya tienen roles claros tras IN.7; un inbox genérico aplana la prioridad visual y obliga al usuario a leer para distinguir lo urgente de lo informativo.

## Consecuencias

### Positivas

- Inicio cumple la regla de los 5 segundos con bloques de rol único y sin duplicados, y cada brief de Esteban queda mapeado a una fase verificable por separado.
- Movimientos muestra la historia completa existente desde el primer día (derivación), y Gastos queda enfocada en su propósito sin tocar un solo registro.
- El sistema de accesos nace data-driven y escalable: sección nueva = 1 fila de catálogo, y la fase de sugerencias por uso puede montarse encima sin rehacer nada.
- Cero dependencias nuevas, offline intacto, ADN completo respetado (un bump de schema v23 con migración idempotente concentra los campos nuevos en vez de acumular más campos defensivos sin versión).

### Negativas / Restricciones

- Inicio gana 3 bloques nuevos (saludo, accesos, actividad): hay que vigilar el peso visual total en el celular de Esteban tras cada fase; el orden de D1 es hipótesis a validar en dispositivo real.
- La derivación de Movimientos depende de la disciplina de las categorías internas (`'Deudas'`, `'Gastos fijos'`): si un flujo futuro crea gastos automáticos sin categoría interna, aparecerían como gasto cotidiano. Mitigación: test guardarraíl en el dominio movimientos que inventaríe las fuentes.
- Metas y apartados no aparecen en Movimientos v1 (sin registros fechados); extensión posterior con bump de schema propio.
- Ocultar las categorías internas en la lista de Gastos cambia un comportamiento visible: usuarios habituados a ver los abonos ahí deberán encontrarlos en Movimientos (mitigado porque la vista nueva los muestra mejor y con más contexto).
