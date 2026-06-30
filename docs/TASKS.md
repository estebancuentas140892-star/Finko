# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-29

---

## Estado actual

**App estable, 1633/1633 tests verdes, lint limpio, 61/61 E2E.** Último cambio: **MC.6a** modelo de pisos para distribución automática (ADR 013). Antes: TX.5 mapeo sección → grupo. **Rediseño visual 2026 completo: las 8 fases cerradas.**

**Workflow vigente desde 2026-06-12: deploy continuo.** Cada tarea cerrada se verifica (tests + desktop + móvil), se commitea y se pushea a producción de inmediato (Vercel auto-redeploya: https://finko-brown.vercel.app). El usuario valida cada cambio desde su celular.

---

## Cómo se trabaja una tarea

1. Elegir **una** tarea del ROADMAP (sección Post-v1.0) o del backlog del usuario.
2. Moverla a "En curso" abajo con la fecha de inicio.
3. Hacer el trabajo en una sola sesión cuando sea posible.
4. Al terminar:
   - Verificar en la app (servir + probar manualmente).
   - Correr `npm test` (debe quedar verde).
   - Commit con prefijo (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`).
   - **Eliminar** la entrada de este archivo.
   - **Agregar** entrada en [`CHANGELOG.md`](CHANGELOG.md) con fecha y archivos tocados.

Ver [`/CLAUDE.md`](../CLAUDE.md) → sección 2 para el workflow completo (cierre con modelo+esfuerzo, supervisión visual, etc.).

---

## En curso

_(sin tarea activa)_

---

## Próxima tarea sugerida

**✅ ADR 011 (rediseño de simulación de deudas) completamente implementado** (2026-06-29). S1 sustituido por la Revisión D.2; S2/S3 hechos; S4/S5 = D.3a/D.3b hechos. Trazabilidad de los slices:
- ✅ **D.2a** - Reordenada la card: picker arriba, acelerador plegable ("¿Puedes pagar más rápido?") abajo. SW v216. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.2b** - Plan inviable: el pago extra sube como primer remedio ("Aumenta tu cuota") dentro del diagnóstico. SW v217. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.3a / S4** - "Renegociar tasa" interactivo + aplicar (`simularRenegociacion`). 16 unit + 2 E2E. SW v218. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **D.3b / S5** - "Consolidar deudas" interactivo + aplicar (`simularConsolidacion`: crea el crédito nuevo y archiva las consolidadas). 12 unit + 2 E2E. SW v219. Ver [CHANGELOG](CHANGELOG.md).

**Siguiente sugerido del backlog "Visión de Deudas": D.5** (categorías de deuda en dos dimensiones, decisión de modelo de datos, Opus 4.8 - Alto). D.4 cerrada (ver abajo).

### Backlog del usuario "Visión de Deudas" (2026-06-29)

Observaciones del usuario sobre la sección Deudas. Varias revisan o se cruzan con ADR 011, así que conviene actualizar ese ADR antes de codear D.2/D.3.

✅ **D.1 (BUG)** - Corregido el cálculo del impacto del pago extra, que mostraba cifras absurdas ("terminas 49 años antes y ahorras $6e29") cuando la cuota no cubre los intereses. Raíz: con un plan base inviable, `simularEstrategiaPago` diverge (saldo crece, `interesesTotales` explota, meses topa en 600) y los renderers restaban contra esa base. Fix en los 3 puntos de fuga (`estrategia-impacto.js`): `renderResumenExtra` (si la base es inviable, explica que sin el extra no se paga, sin restar), `renderImpactoAvalancha` ("No se termina de pagar" en vez del total divergente) y `_renderComparativa` (no compara estrategias si alguna no completa). 4 tests de regresión. SW v214 → v215 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.2 (diseño, revisa ADR 011 S1)** - Replanteada la jerarquía de la simulación: el eje principal vuelve a ser elegir Avalancha vs Bola de nieve; el pago extra deja de ser protagonista y pasa a ser contextual (acelerador plegable en plan viable, primer remedio en plan inviable). ADR 011 revisado (sección "Revisión D.2", S1 sustituido). Implementación dividida en D.2a + D.2b (ver "Próxima tarea sugerida" arriba). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.3 (= ADR 011 S4/S5) - Convertir la simulación en acción.** Completa, corte vertical por herramienta: D.3a (renegociar tasa + aplicar) + D.3b (consolidar + aplicar). 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **D.4 (mejora UI)** - Comparación explicada Avalancha vs Bola de nieve: bloque "¿Cómo elegir?" con una frase por estrategia (Avalancha = ahorro en intereses y, si difiere, terminar antes; Bola de nieve = cerrar la primera deuda antes). El "cuánto antes" sale de comparar `mesPagado` de la primera deuda que cierra cada estrategia (dato ya devuelto en `orden[]`), sin lógica nueva. Conserva el banner verde cuando solo Avalancha aventaja y los mensajes de empate. 3 tests de render. SW v219 → v220 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

- **D.5 (evoluciona lo entregado)** - Categorías de deuda en **dos dimensiones**: hoy hay un solo campo "tipo de obligación" (`CATEGORIAS_DEUDA`, 12). El usuario propone separar **Tipo de deuda** (tarjeta, libre inversión, vivienda, educativo, vehículo, cooperativa, compra a cuotas, otra) y **Acreedor** (familiar, amigo, vecino, particular, natillera, banco, cooperativa, entidad financiera, empresa, otro). Decidir si reemplaza o complementa el campo actual y si el acreedor reemplaza la distinción entidad/personal. Posible schema bump + migración. Modelo: Opus 4.8 - Alto (decisión de modelo de datos).

### Backlog del usuario "Visión de Deudas, jornada 2" (2026-06-29)

Segunda ronda de observaciones del usuario sobre la sección Deudas. Objetivo común: que la sección se sienta **limpia**, con Avalancha y Bola de nieve siempre de protagonistas, y que las herramientas de ayuda aparezcan **solo cuando hacen falta**, una a la vez. Varias revisan otra vez la jerarquía de [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md) (que en D.2/D.3 ya replanteamos), así que **conviene una revisión D.7 del ADR antes de codear** D.7/D.8/D.9.

- **D.6 (mejora UI, contenida)** - Quitar de la sección Deudas el aviso "N gastos fijos vencieron este mes" (`#nudge-fijos-sin-pagar` en `sec-compromisos`, vía `renderAlertaFijosSinPagar`, G.1). El Dashboard **ya** tiene el panel "N pendientes del mes" (`#panel-vencidos` en `sec-dash`, `detectarVencidosCompletos`) que incluye fijos, deudas y agenda vencidos: el aviso de Deudas está duplicando esa información. Verificar que el panel del dashboard cubre todo lo que mostraba el nudge (no perder info: el nudge dice "¿ya los registraste?"; el panel solo lista) y, si es así, **eliminar el nudge de Deudas**; si el panel no cubre el matiz de "registrar", portarlo al dashboard. Cuidar también `#nudge-deudas-durmiendo` (otra alerta G.1 en la misma sección): el usuario solo mencionó los fijos vencidos, no tocar deudas durmiendo sin confirmar. Modelo: Sonnet 4.6 - Bajo.

- **D.7 (diseño, revisa ADR 011)** - Replantear el bloque inviable ("⚠️ Con tu pago actual, estas deudas no se terminan de pagar..."). Hoy muestra el diagnóstico + el remedio de pago extra + las herramientas de renegociar/consolidar, todo a la vez, y se siente saturado. Propuesta del usuario: cuando el plan no es viable, Avalancha/Bola de nieve siguen de protagonistas y aparece **un solo botón destacado** ("⚠️ ¿Necesitas mejorar tu plan de pago?" / "🚨 Explorar alternativas para salir de las deudas") que abre un **panel** con las 3 alternativas. Entregable: revisión del ADR 011 con la nueva jerarquía (botón → panel → selector de una alternativa a la vez) y los slices D.8/D.9. Modelo: Opus 4.8 - Alto.

- **D.8 (implementa D.7) - Panel de alternativas con selector** - Dentro del panel, las 3 alternativas (**Aumentar la cuota**, **Renegociar la tasa**, **Consolidar/unificar**) en un selector que muestra **solo el contenido de la opción elegida** (no las tres a la vez). Renegociar (D.3a) y Consolidar (D.3b) ya existen como herramientas Simular + Aplicar: aquí se reubican dentro del panel/selector. "Aumentar la cuota" hoy es solo acelerador/simulación (no aplica): se le suma la acción Aplicar en D.9. Cada alternativa expone **Simular** (visualiza el cambio) y **Aplicar** (confirma). Modelo: Sonnet 4.6 - Alto (reorganización de UI con estado de selector, sin lógica financiera nueva).

- **D.9 (implementa D.7) - "Aumentar la cuota" como acción aplicable real** - Hoy el pago extra es what-if (D.2b). El usuario quiere que, con un resultado favorable, se pueda **aplicar sin salir del flujo**: al pulsar Aplicar, pedir desde qué cuenta o fuente sale el incremento (patrón 0/1/varias del selector de cuentas compartido, igual que Gastos/Abono/Pago), actualizar la `cuotaMensual` de la deuda, y que ese nuevo valor alimente las **próximas distribuciones de ingreso** (MC.4/MC.6) y los **pagos programados**. Es la tercera superficie de "simular → aplicar" (tras D.3a y D.3b). Cuidar: ¿el extra se reparte entre deudas según la estrategia o sube la cuota de una deuda concreta? Decidirlo en el ADR D.7. Posible toque al modelo de la deuda. Modelo: Opus 4.8 - Alto (muta `S`, cruza con distribución y pagos).

### Backlog del usuario "Mis cuentas + distribución" (2026-06-28)

Observaciones nuevas del usuario, de menor a mayor alcance. Arrancar por la más pequeña.

✅ **MC.1** - Simplificados los textos de ayuda del form de nueva cuenta (eliminada la descripción del 4x1000 y el "Opcional..." de la cuota de manejo) - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.2 (parte 1 de 2)** - Animación de entrada suave (`distribucion-rows-in`) al cambiar entre presets de distribución (50/30/20 ↔ 70/20/10 ↔ 60/20/20); la barra de chips queda fuera del bloque animado - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.2 (parte 2 de 2)** - Distribución de porcentajes personalizada: chip "Personalizar" abre un editor inline de 3 campos (Necesidades/Estilo de vida/Ahorro) con suma en vivo y validación de 100%; persiste en `S.config.distribucionPersonalizada` - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md). **MC.2 completa.**

✅ **MC.3** - Reformulado el nudge de deudas en la distribución: ahora invita a recortar Estilo de vida antes que el ahorro - 2026-06-28. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.4 (diseño)** - ADR 012 escrito: auto-distribución de ingresos "Distribuir mi ingreso". Decisiones: híbrido (mueve lo fondeable, informa lo demás), acredita el ingreso y reparte, confirmaciones parciales, orquestación por EventBus + undo por snapshot - 2026-06-29. Ver [ADR 012](DECISIONS/012-auto-distribucion-ingresos.md).

Slices de implementación de MC.4 (smallest-first, ver ADR 012):
- ✅ **MC.4a** - Entrada "Distribuir mi ingreso" + panel editable (toggles + montos + remanente en vivo) + acreditar ingreso + aplicar grupo Ahorro (Fondo, Metas, Apartados) vía EventBus + undo por snapshot - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4b** - Deudas como destino fondeable: abono real vía EventBus, ordenadas por prioridad (Avalancha), topado al saldo - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4c** - Filas informativas de Necesidades y Estilo de vida en el panel (solo monto de referencia, recalculadas en vivo) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ **MC.4d** - "Distribuir mi ingreso" se habilita solo al llegar la fecha del cobro (`estadoDistribucion` + `ultimoPagoHasta`) + nudge "Hoy recibes tu ingreso. ¿Deseas distribuirlo ahora?" + guard de de-duplicación por periodo (`S.config.ultimaDistribucionPeriodo`, revertible en el undo) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). Nota: persistir el mapeo de destinos preferidos quedó fuera de este slice (no se pidió en la tarea); si se quiere, abrir un MC.4d-2.
- ✅ **MC.4e** - Inversiones como destino fondeable: aporte incremental al capital del holding vía EventBus (`construirPlanInversiones` + suscriptor en `inversiones/index.js`), descuenta la cuenta, undo restaura el capital - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). **MC.4 completa (a-e).**

### Backlog del usuario "distribución inteligente + asistente guiado" (2026-06-29)

Visión nueva del usuario para evolucionar "Distribuir mi ingreso" como diferenciador. Ambas son épicas: requieren ADR antes de codear.

✅ **MC.6 (diseño)** - ADR 013 escrito: distribución "Automático inteligente". Decisiones con el usuario: alcance = sigue siendo distribución en 3 grupos pero con % calculados desde los datos reales (modelo de pisos por prioridad); duplicidad = Automático por defecto y los 3 presets fijos pasan a un grupo secundario "Métodos clásicos" - 2026-06-29. Ver [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md).

Slices de implementación de MC.6 (smallest-first, ver ADR 013):
✅ **MC.6a** - Modelo de pisos para distribución automática: `sugerirDistribucionIngreso` reescrita (pisos: Necesidades duro → Ahorro por prioridades → Estilo de vida residual con piso 10%). Nuevo helper puro `calcularAporteMensualObjetivos`. `view.js` computa 4 nuevos inputs desde S. 16 tests nuevos + 4 actualizados. 1617 → 1633 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- **MC.6b** - Barra de presets: Automático + Personalizar en la fila principal; los 3 clásicos a un grupo secundario "Métodos clásicos" (disclosure) + copy de transparencia.
- **MC.6c (opcional)** - Señales más ricas: historial de gastos variables (proxy de estilo de vida), inversiones como prioridad tras el fondo.
- **MC.7 (épica mayor, requiere ADR)** - Convertir "Distribuir mi ingreso" en un asistente guiado de 3 pasos: (1) **Necesidades** itemizadas automáticamente (gastos fijos, cuotas de deuda, compromisos de Agenda) con nombre/categoría/valor; (2) **Ahorro** con aportes auto-calculados por objetivo según su meta y la frecuencia del ingreso (ej. meta de $5M a un año → cuánto por quincena), priorizando el fondo de emergencia con el excedente; (3) **Estilo de vida** repartido entre las cuentas activas / efectivo. El usuario solo revisa, ajusta y confirma. Construye sobre MC.4a-e.

- **MC.5 (épica mayor, requiere ADR + posible schema)** - Límites de gastos como centro de control de los 3 grupos (Necesidades / Estilo de vida / Ahorro): clasificar cada categoría en un grupo, fijar límites por categoría, y mostrar % consumido + disponible + alertas al acercarse/superar. Toca Gastos, Deudas, Agenda, Apartados y Mis cuentas; depende de definir bien las categorías transversales.

### Backlog del usuario "Mis cuentas: ajustes a ingresos" (2026-06-29)

Seguimiento a las categorías de ingreso recién entregadas. Arrancar por el bug.

✅ **MC.8 (BUG)** - Corregido el cálculo del salario mínimo según la frecuencia: el salario mínimo se trata como ancla mensual y se divide por la frecuencia para pre-llenar el monto por período (helper puro `montoSalarioMinimoPorPeriodo`); la automatización ahora reacciona también al cambiar la frecuencia. 7 tests nuevos (incluye regresión). SW v208 → v209 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **MC.9 (mejora UI)** - Iconografía en las categorías de ingresos: `CATEGORIA_INGRESO_EMOJI` en `constants.js` (12 categorías, mismo patrón que `CATEGORIA_EMOJI` de gastos); el selector del form y la lista de ingresos muestran el emoji junto al nombre. 6 tests nuevos (mapa completo + render del selector y la lista). SW v209 → v210 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

Pendientes previos del backlog (2026-06-28), independientes de lo anterior:
- ✅ Categorías predefinidas para Ingresos (12 categorías + automatización "Salario mínimo" con subsidio de transporte) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ Categorías predefinidas para Agenda (13 categorías de gastos fijos + emoji, schema v17) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- ✅ Categorías predefinidas para Deudas (12 tipos de obligación + emoji, schema v18) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md). **Backlog "Mis cuentas: ajustes a ingresos" + las 3 categorías predefinidas completas.**

Pendientes no urgentes (mantenimiento):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.

**Mejora candidata (resumen V.8):** retroalimentación del usuario en el celular puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas (mencionado como opcional en ADR 008). Esperar feedback antes de iterar.

---

### Backlog del usuario "Explicar el propósito de cada sección" (2026-06-29)

**Visión.** Cada sección debe responder en pocos segundos una pregunta simple para el usuario nuevo: **¿qué problema me ayuda a resolver esta sección?**. Hoy las funciones son buenas pero alguien que entra por primera vez no entiende de inmediato para qué sirve cada apartado ni el beneficio que obtiene. La meta no es llenar la app de texto, sino dar un mensaje breve, cercano y fácil de entender que genere contexto, eduque y motive mejores hábitos. Finko no solo registra movimientos: también explica el propósito de cada herramienta.

**Tono obligatorio** (ADN regla 11 + estilo de escritura regla 7.1): voz "tú", cercano y profesional, sin jerga, "dinero" (no "plata"), cero guion largo. Estructura sugerida del mensaje: (1) una pregunta gancho que toca un dolor real, (2) una o dos frases que nombran el problema, (3) una frase de cómo Finko ayuda.

**Copy de referencia aprobado por el usuario (Apartados):**
> ¿Te ha pasado que, de un momento a otro, debes pagar el SOAT, comprar el alimento de tu mascota, reponer tus productos de aseo personal o cubrir otro gasto importante que no esperabas? Aunque son gastos previsibles, muchas veces olvidamos prepararnos y terminamos usando nuestros ahorros, aplazando metas o endeudándonos. Apartados te ayuda a evitarlo: destina una pequeña parte de tus ingresos para cada gasto futuro y, cuando llegue el momento de pagarlo, ya tendrás el dinero (o gran parte de él) disponible.

**Ideas de beneficio por sección (insumo del usuario, a pulir en EP.0):**
- **Gastos:** conocer en qué se va tu dinero y detectar hábitos que puedes mejorar.
- **Deudas:** la mejor estrategia para salir de ellas pagando menos intereses y en menos tiempo.
- **Metas:** convertir tus objetivos en un plan de ahorro alcanzable.
- **Ahorros:** crear un respaldo para imprevistos y construir estabilidad.
- **Agenda:** no olvidar pagos y evitar intereses por mora o recargos.
- **Límites de gasto:** controlar tus gastos antes de exceder el presupuesto que definiste.
- **Mis cuentas:** centralizar tus ingresos y organizar cómo distribuirlos de forma inteligente.
- **Análisis:** transformar tus movimientos en información clara para tomar mejores decisiones.

**Épica: requiere diseño antes de codear (introduce un patrón de UI transversal nuevo).**

Slices (smallest-first):

- **EP.0 (diseño, requiere ADR)** - Definir el patrón único reutilizable. Decisiones a cerrar con el usuario: ubicación (banner colapsable arriba del contenido de cada sección vs. tip dentro del empty state vs. ícono "?" que despliega), persistencia (¿se puede colapsar/descartar de forma permanente por sección en `S.config`? ¿reaparece?), longitud máxima y estructura del copy, accesibilidad (rol, foco, contraste con tokens `--fk-*`), y a qué secciones aplica (las 8 del insumo del usuario + decidir Inversión, Compromisos, Personales, Dashboard, Calculadoras). Entregable: ADR + copy aprobado por sección. Modelo sugerido: Opus 4.8 - Alto (decisión arquitectural acotada, nuevo patrón de UI transversal).

- **EP.1 (piloto)** - Implementar el componente base reutilizable (helper en `infra/render.js` o partial) + persistencia del estado colapsado + aplicarlo a **una** sección piloto: **Apartados** (ya tiene el copy de referencia). Verificar el patrón en la app (desktop + móvil), a11y y tests de render. Modelo sugerido: Sonnet 4.6 - Medio (feature de un dominio siguiendo patrón nuevo, con tests).

- **EP.2 (grupo "Gastar bien")** - Desplegar el copy al grupo: Gastos, Deudas, Agenda, Límites de gasto. Solo copy + reuso del componente de EP.1. Modelo sugerido: Sonnet 4.6 - Bajo (copy + patrón ya existente).

- **EP.3 (grupo "Crecer")** - Desplegar a: Metas, Ahorro, Inversión. Modelo sugerido: Sonnet 4.6 - Bajo.

- **EP.4 (grupo "Organizar")** - Desplegar a: Mis cuentas, Análisis (y las demás que EP.0 haya decidido incluir). Modelo sugerido: Sonnet 4.6 - Bajo.

---

### Backlog del usuario "Visión de Apartados" (2026-06-29)

Visión del usuario para que Apartados tenga un propósito claro y diferenciado del resto: **"ahorrar poco a poco para gastos futuros que sabemos que llegarán, evitando que sean un golpe al bolsillo"**. Casos típicos: SOAT, revisión técnico-mecánica, impuesto predial, matrículas/semestre, renovación de documentos, regalos, mantenimiento del vehículo, cuido y arena de mascotas, aseo personal, vacaciones. Ejemplo guía: mantener perro y gato puede costar ~$420.000 cuando coinciden alimento y arena; si el usuario ya apartó $300.000, solo completa $120.000 y el golpe es mínimo.

✅ **AP.1** - Formulario de aporte unificado al selector de tarjetas compartido (`renderSelectorCuenta` + `resolverPagoConPreferida`): muestra el logo del banco y permite elegir una o varias cuentas, con reparto automático cuando una no alcanza, igual que Gastos/Abono/Pago. Reemplaza el `<select>` de texto plano; preserva el aporte como seguimiento cuando no hay cuentas activas. 4 tests de render nuevos. SW v212 → v213 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

✅ **AP.2** - `PLANTILLAS_APARTADO` ampliada de 9 a 15: Revisión técnico-mecánica, Impuesto predial (sin duplicar "Impuestos", que sigue siendo el genérico/vehículo), Matrícula o semestre, Renovación de documentos, Alimento para mascotas, Arena para gatos. Reordenada por afinidad (vehículo, impuestos/vivienda, mascotas, educación, regalos/vacaciones). 2 tests nuevos (15 plantillas, sin duplicados, cubre las 6 nuevas). SW v213 → v214 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

- **AP.3 (propósito) = EP.1** - El mensaje "¿qué problema resuelve Apartados?" es el piloto de la épica EP (ver backlog EP arriba). La filosofía y el ejemplo de mascotas son el insumo de copy ya aprobado. Depende de EP.0 (decidir el patrón del banner de propósito).

- **AP.4 (épica, requiere ADR)** - Recordatorios automáticos de aporte en Agenda al recibir el ingreso ("Hoy recibiste tu ingreso, recuerda apartar $X para el SOAT"). **Cuidar la duplicación:** "Distribuir mi ingreso" (MC.4) ya acredita el ingreso y reparte a los apartados al llegar el cobro, con nudge propio; y Apartados ya tiene nudge de proximidad (60 días). El ADR debe decidir si se extiende MC.4 o el nudge existente, o se crea un recordatorio nuevo en Agenda, sin solapar. Modelo: Opus 4.8 - Alto.

✅ **AP.5 (diseño) = AG.3** - Taxonomía de categorías de toda la app. **Absorbida en [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md)** (ver AG.3 abajo), que cierra la identidad de cada sección, la regla de contexto para categorías compartidas y el mapeo sección → grupo. Implementación en slices TX.1-TX.5 - 2026-06-29.

### Backlog del usuario "Agenda + taxonomía de categorías" (2026-06-29)

Observaciones del usuario sobre la sección Agenda y, a partir de ahí, una propuesta de taxonomía de categorías para toda la app. El hilo conductor: que el usuario entienda de forma natural dónde registrar cada movimiento sin pensarlo dos veces, porque las categorías son la base de muchas funciones (análisis, límites de gasto, recomendaciones, distribución inteligente).

- **AG.1 (decisión + copy)** - Nombre de la sección: ¿**Agenda** o **Calendario**? El usuario se inclina por "Agenda" (transmite organizar compromisos y pagos futuros) frente a "Calendario" (suena a eventos o citas en general), pero quiere analizar cuál es más intuitivo. Entregable: decidir el término y, si cambia, renombrar etiqueta de nav + título de sección + copys. Sin lógica. Modelo: Sonnet 4.6 - Bajo (o Haiku si solo se confirma "Agenda" sin cambios).

- **AG.2 (mejora UI, posiblemente ya hecha)** - Iconografía a la izquierda del nombre en las categorías de Agenda, consistente con el resto de la app. **Verificar primero:** desde el schema v17 ya existe `CATEGORIA_AGENDA_EMOJI` y el emoji ya se renderiza en el selector del form (`agenda/view.js:376`) y en la lista (`agenda/view.js:284`), igual que MC.9 hizo para ingresos. Si el usuario ya lo ve, AG.2 está cerrada; si pide más prominencia o ícono SVG en vez de emoji, es un ajuste de placement. No abrir trabajo nuevo sin confirmar la brecha. Modelo: Sonnet 4.6 - Bajo.

✅ **AG.3 (diseño) = AP.5** - [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md) escrito (unifica AG.3 + AP.5). Decisión central: **la sección define la intención y la categoría la refina**; el significado de un movimiento es el par (sección, categoría). Cada sección responde una pregunta distinta; una categoría puede vivir en varias secciones y la sección la desambigua (caso canónico: Mercado); consistencia mismo concepto ⇒ misma etiqueta/emoji; las funciones transversales mapean a los 3 grupos por sección. Sin schema. La curación concreta de catálogos queda en slices TX.1-TX.5 (a confirmar con el usuario) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).

Slices de implementación de ADR 014 (smallest-first, a confirmar la curación):
✅ **TX.1** - `CATEGORIAS_AGENDA` curada: Mercado 🛒 (caso canónico de contexto, emoji consistente con Gastos) y Suscripciones 🔔 (bucket más amplio que Streaming). Longitud 13 → 15. 1607/1607 verdes. SW v220 → v221 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
✅ **TX.2** - `PLANTILLAS_APARTADO` curada: Cumpleaños 🎂 y Navidad 🎄 (después de "Regalos", antes de "Vacaciones"). 15 → 17 plantillas. 1607/1607 verdes. SW v221 → v222 - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- **TX.3 (opcional)** - Gastos: agregar Café ☕ y Gastos hormiga 🐜 si el usuario los quiere explícitos. Modelo: Sonnet 4.6 - Bajo.
✅ **TX.4** - Guardarraíl de consistencia: 2 tests en `constants.test.js` que verifican que toda etiqueta compartida entre catálogos (Gastos, Agenda, Ingresos, Deudas, Apartados) usa el mismo emoji. Detecta hoy 6 compartidas: Mercado 🛒, Transporte 🚗, Servicios públicos 💡, Educación 📚, Mascotas 🐾, Arriendo 🏠. 1607 → 1609 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
✅ **TX.5** - Mapeo sección → grupo financiero: `GRUPOS_FINANCIEROS`, `LABEL_GRUPO_FINANCIERO`, `GRUPO_POR_SECCION` y `clasificarSeccionEnGrupo` en `constants.js`. 8 tests. 1609 → 1617 verdes - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
