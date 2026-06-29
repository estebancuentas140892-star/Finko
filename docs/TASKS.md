# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-29

---

## Estado actual

**App estable, 1558/1558 tests verdes, lint limpio, 57/57 E2E.** Último cambio: **categorías predefinidas para Deudas** (12 tipos de obligación + emoji, schema v18); cierra el backlog "Mis cuentas: ajustes a ingresos". Antes: categorías predefinidas para Agenda. **Rediseño visual 2026 completo: las 8 fases cerradas.**

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

**ADR 011 en curso: rediseño de simulación de deudas.** S1, S2 y S3 cerrados (extra mensual siempre visible + resumen de impacto en vivo; eliminado el botón "Simular" por deuda; barrido de dead code del acordeón). Pendientes:
- **S4** - "Renegociar tasa" interactivo (`simularRenegociacion` + tests).
- **S5** - "Consolidar deudas" interactivo (`simularConsolidacion` + tests).

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
- **MC.6a** - Reescribir el modo `auto` de `sugerirDistribucionIngreso`: nuevos insumos (cuotas de deuda mensuales, faltante del fondo, aporte mensual a objetivos con plazo, suma de límites) + modelo de pisos (Necesidades obligatorias → Ahorro por prioridades → Estilo de vida con piso) + `razon` enriquecida + tests. **Siguiente sugerido.**
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
