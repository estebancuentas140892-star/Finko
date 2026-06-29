# TASKS - Finko Claude

> Tablero de tareas activas. Se actualiza al final de cada sesión.
> Última actualización: 2026-06-28

---

## Estado actual

**App estable, 1402/1402 tests verdes, lint limpio.** Último cambio: **renombre "Presupuesto" → "Límites de gasto"** y diferenciación de Apartados (cross-links + subtítulo; sin fusionar, sin migración). Antes: fix de íconos en Agenda, V.8 card de resumen semanal (ADR 008). **Rediseño visual 2026 completo: las 8 fases cerradas.**

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

- **MC.8 (BUG, prioritario)** - **Corregir el cálculo del salario mínimo según la frecuencia.** Hoy, al elegir la categoría "Salario mínimo", la automatización pre-llena `monto` con el valor **mensual** completo (SMMLV + auxilio). Pero `monto` es el valor **por período** y `estimarSalarioMensual` multiplica por `_FACTOR_MENSUAL` (Quincenal × 2, Semanal × 4.33): si el usuario elige Quincenal, el ingreso mensual estimado queda **al doble**. Fix: tratar el salario mínimo como un **ancla mensual** y dividir por la frecuencia de pago para obtener el monto por período (Mensual = completo, Quincenal = /2, Semanal = /4.33). La automatización debe reaccionar **también al cambiar la frecuencia** (hoy solo reacciona a la categoría y al checkbox de subsidio), no solo al seleccionar la categoría. Tocar: `tesoreria/index.js` (`_attachCategoriaToggle`, acoplar al `change` de frecuencia), posible helper puro en `logic.js` (dividir valor mensual por frecuencia, reusando el factor) + tests. Modelo sugerido: Opus 4.8 - Bajo (bug sutil en lógica financiera con repro clara).

- **MC.9 (mejora UI)** - **Iconografía en las categorías de ingresos.** Cada categoría con un emoji representativo, consistente con el resto de la app (patrón de los íconos de categorías de gasto en `constants.js`). Mostrar el ícono en el selector del formulario (texto de la `<option>`) y en la lista de ingresos junto al nombre de la categoría. Íconos sugeridos por el usuario: 💼 Salario, 🏠 Arriendo, 💵 Honorarios, 🎁 Bonificación, 📈 Rendimientos, 🤝 Comisión, 🪙 Subsidio, 📦 Otro. Faltan por definir: Salario mínimo, Pensión, Cuota, Venta. Tocar: `constants.js` (mapa categoría → emoji), `tesoreria/view.js` (selector + lista) + tests de render. Modelo sugerido: Sonnet 4.6 - Bajo (UI aislada, sin lógica nueva).

Pendientes previos del backlog (2026-06-28), independientes de lo anterior:
- ✅ Categorías predefinidas para Ingresos (12 categorías + automatización "Salario mínimo" con subsidio de transporte) - 2026-06-29. Ver [CHANGELOG](CHANGELOG.md).
- Categorías predefinidas para Agenda (13 categorías de gastos fijos).
- Categorías predefinidas para Deudas (12 tipos de obligación).

Pendientes no urgentes (mantenimiento):

**A.5** - Deploy en dominio custom. No requiere cambios de código. Guía en `docs/SETUP_DOMINIO.md`.

**E.2-2027** - Actualizar SMMLV + UVT en enero 2027. Cambio mecánico en `constants.js`. Modelo: Haiku 4.5.

**Mejora candidata (resumen V.8):** retroalimentación del usuario en el celular puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas (mencionado como opcional en ADR 008). Esperar feedback antes de iterar.
