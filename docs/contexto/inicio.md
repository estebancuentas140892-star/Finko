# Ficha de contexto: Inicio (dashboard)

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Estructura actual del Dashboard (bento grid)

- **Objetivo**          : pantalla principal e inamovible de la app; hoy muestra saldo, un acceso rápido, paneles de vencidos/próximos y un resumen semanal.
- **Estado actual**     : estable, en evolución. **IN.7**, **IN.6a**, **CAL.1**, **TX.8a** y **TX.8b** cerradas. Rediseño decidido en [ADR 028](../DECISIONS/028-inicio-centro-de-control.md) (**aprobado el 2026-07-05**): un rol por bloque, orden vertical definido, y fases IN.4a → IN.6b restantes en `BOARD.md`.
- **Verificado contra** : pendiente (fijar en el próximo commit de este archivo, ver TX.8b en HANDOFF).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Orquestador del dominio (suscripción a EventBus, re-render) | `modules/dominio/resumen/index.js` | `initResumen()` | ~16 |
| Resumen semanal (datos) | `modules/dominio/resumen/logic.js` | `resumenSemanal(gastos, hoyISO)` | ~202 |
| Resumen semanal (render) | `modules/dominio/resumen/view.js` | `renderPanelResumen()` | ~51 |
| Hero de saldo (render + ojo/máscara) | `modules/infra/render.js` | `updSaldo()` | ~72 |
| Saludo dinámico según hora (IN.6a) | `modules/infra/render.js` | `updSaludo()` | ~126 |
| Elemento del saludo en el DOM | `index.html` | `#saludo-inicio` (bajo `#title-dash`) | ~377 |
| Acceso rápido "Gasto rápido" (único hoy) | `index.html` | botón `.quick-add`, `data-action="gasto-rapido"` | ~382 |
| Formulario de Gasto rápido | `modules/dominio/gastos/view.js` | `renderFormGastoRapido()` | ~298 |
| Panel "Gastos por organizar" (sin descripción/categoría) | `modules/dominio/gastos/view.js` | `renderPendientesOrganizar()` | ~259 |
| Criterio de "por organizar" | `modules/dominio/gastos/view.js` | `pendienteCompletar === true \|\| !descripcion` | ~186 |
| Panel "Pendientes del mes" (compromisos vencidos) | `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos()` | ~35 |
| Fuente de vencidos | `modules/dominio/compromisos/logic.js` | `detectarVencidosCompletos(compromisos, hoyISO)` | |
| Panel "Próximas prioridades" | `modules/dominio/compromisos/views/dashboard.js` | `renderPanelPrioridades()` | ~106 |
| Fuente 1 de prioridades (compromisos) | `modules/dominio/compromisos/logic.js` | `compromisosProximos(comps, 7)` | ~32 |
| Fuente 2 de prioridades (préstamos personales) | `modules/dominio/compromisos/views/dashboard.js` | `_personalesProximos(7)` | ~218 |
| Fuente 3 de prioridades (apartados) | `modules/dominio/compromisos/views/dashboard.js` | `_apartadosProximos(7)` | ~239 |
| Combinación manual de las 3 fuentes | `modules/dominio/compromisos/views/dashboard.js` | `[...proxComp, ...proxPers, ...proxApar].sort(...)` | ~122 |
| Aviso de distribuir ingreso desde Calendario (ADR 021, se conserva) | `modules/dominio/agenda/index.js` | `EventBus.emit('distribuir:abrir')` | ~61 |
| Nudge de distribuir ingreso en Inicio (CAL.1) | `modules/dominio/tesoreria/views/distribucion.js` | `renderNudgeDistribucionInicio()` | ~45 |
| Estado del nudge (mismo guard que Mis cuentas, sin marcador nuevo) | `modules/dominio/tesoreria/logic/distribucion.js` | `estadoDistribucion(ingresos, ultimaDistribucionPeriodo, hoy)` | ~137 |
| CTA del nudge (emite `distribuir:abrir`) | `modules/dominio/tesoreria/acciones/distribucion.js` | `_distribuirDesdeInicio()`, `data-action="distribuir-desde-inicio"` | ~127 |
| Elemento del nudge en el DOM | `index.html` | `#panel-distribuir-inicio` | ~437 |
| Receptor del aviso, abre el asistente en Tesorería (ambos orígenes) | `modules/dominio/tesoreria/index.js` | `EventBus.on('distribuir:abrir', ...)` | ~68 |
| Perfil del usuario (nombre, no renderizado en Inicio hoy) | `modules/core/state.js` | `S.perfil = { nombre, smmlv }` | ~272 |
| Config de usuario (sin accesos personalizados ni avatar hoy) | `modules/core/state.js` | `S.config = { notificaciones, perfilFiscal, datosFiscales }` | ~278 |
| Preferencia de ocultar saldo (agregada dinámica, sin bump de schema) | `modules/infra/render.js` | lectura defensiva `S.config?.ocultarSaldo` | ~76 |
| Catálogo de categorías de gasto (fijo, 19 + 2 internas) | `modules/core/constants.js` | `CATEGORIAS_GASTO` | ~400 |
| Categorías visibles al usuario | `modules/core/constants.js` | `CATEGORIAS_GASTO_USUARIO` | ~426 |
| Mapeo categoría → símbolo del sprite | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Eventos de compromisos por mes (patrón de referencia, no cruza dominios) | `modules/dominio/agenda/logic.js` | `eventosDelMes(compromisos, year, month)` | ~104 |
| Eventos de ingresos por mes | `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes(ingresos, year, month)` | ~144 |
| Dominio nuevo: derivación de movimientos (TX.8a) | `modules/dominio/movimientos/logic.js` | `movimientosDesdeGastos()`, `movimientosDesdeIngresosPuntuales()`, `movimientosDesdeAportes()`, `movimientosRecientes()` | |
| Panel "Actividad reciente" (render) | `modules/dominio/movimientos/view.js` | `renderActividadReciente()` | ~40 |
| Orquestador de movimientos (registrarRender, state:change) | `modules/dominio/movimientos/index.js` | `initMovimientos()` | |
| Elemento del panel en el DOM | `index.html` | `#panel-actividad-reciente` (antes de `#panel-resumen`) | ~467 |
| Ícono para gastos con categoría interna "Gastos fijos" (nuevo) | `modules/core/constants.js` | `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'` | ~466 |
| Campo `dominio` del Movimiento, colorea la teja por sección (TX.8b) | `modules/dominio/movimientos/logic.js` | `_CATEGORIAS_COMPROMISOS`, campo `dominio` en las 3 funciones `movimientosDesde*` | |
| Historial completo sin límite (TX.8b) | `modules/dominio/movimientos/logic.js` | `movimientosCompletos()` | |
| Vista completa de Movimientos, ruta propia (TX.8b) | `modules/dominio/movimientos/view.js` | `renderMovimientosCompletos()`, `_agruparPorMes()`, `_renderMovimientoItem()` | |
| Sección y ruta `#movimientos` (sin ícono fijo en la barra) | `index.html` / `modules/infra/router.js` | `#sec-movimientos` / `SECTIONS.get('movimientos')` | |
| Link "Ver todo" del panel compacto hacia la vista completa | `modules/dominio/movimientos/view.js` | `.actividad-reciente__ver-todo`, `href="#movimientos"` | |
| Gastos deja de listar categorías internas (TX.8b) | `modules/dominio/gastos/view.js` | `_CATEGORIAS_INTERNAS`, `_sinInternas()` (usado en `renderListaGastos()` y `renderFiltrosGastos()`) | |

**Recursos**: sprite `i-saldo`/`bolt` para el hero y Gasto rápido; `CATEGORIA_ICONO` para los ítems de "Gastos por organizar"; tokens `--fk-*` del bento grid (no auditados en detalle en este pase).

**Dependencias y relaciones**: `resumen` y `movimientos` escuchan `EventBus` para re-renderizar al cambiar sus fuentes (ADN 10 respetado: ningún dominio importa a otro; `movimientos/logic.js` no lee `S` ni importa `gastos/`, `tesoreria/` o `ahorro/`, recibe los arrays ya extraídos de `view.js`). El aviso de distribución de ingreso puede nacer en `agenda` (Calendario, ADR 021) o directo desde el nudge de `tesoreria` en Inicio (CAL.1); ambos emiten el mismo `distribuir:abrir` y lo resuelve `tesoreria`, que registra su propio render del nudge vía `registrarRender()` (mismo patrón que `compromisos` y ahora `movimientos` usan para sus paneles del dashboard).

**Riesgos**:

- **Discrepancia con el brief del usuario**: el usuario describe "3 accesos rápidos fijos" que el usuario podría reordenar (base de **IN.4**); el código real solo tiene **1** (Gasto rápido). Cualquier diseño de IN.4 debe partir de este hecho verificado, no del supuesto de 3.
- ~~**Overlap confirmado entre paneles** (base de **IN.7**)~~: **resuelto**. Un compromiso con `diaPago = hoy` aparecía a la vez en "Pendientes del mes" (`renderPanelVencidos`, vía `detectarVencidosCompletos`) y en "Próximas prioridades" (`renderPanelPrioridades`, vía `compromisosProximos` con `diasRestantes = 0`). `renderPanelPrioridades()` ahora filtra `diasRestantes > 0` sobre los compromisos antes de combinarlos con personales/apartados: lo que vence hoy vive solo en Pendientes del mes. `compromisosProximos()` (logic) no se tocó: otros consumidores (nudge de mora, `nivelAlertaMora`) siguen necesitando el día 0.
- **Categorías son catálogo cerrado**: `CATEGORIAS_GASTO`/`CATEGORIA_ICONO` no soportan categorías creadas por el usuario hoy. Relevante para **TX.9** (categoría personalizada) y **TX.10** (categoría como eje de automatización): requiere diseño de dato nuevo + migración de schema (ADN 6), no solo UI.
- ~~**Sin helper cross-dominio en `infra/`**~~: **resuelto (TX.8a)**. Se creó el dominio nuevo `movimientos/` como agregador (no un helper en `infra/`, que no puede leer `S`): su `logic.js` lee los arrays ya normalizados que le pasa `view.js` (que sí lee `S` directo), sin importar `gastos/`, `tesoreria/` ni `ahorro/`. Respeta ADN 10 igual que el patrón de `resumen/`.
- **Íconos de "Actividad reciente"/Movimientos no heredan el origen exacto del compromiso** (a diferencia de la lista de Gastos, que sí usa `iconoPorOrigen()` de TX.6/TX.7): un abono a deuda o pago de fijo muestra el ícono de su categoría interna (`i-deudas`, `i-recurring`), no el ícono específico del compromiso (ej. la categoría real del fijo en Agenda). Se decidió así para no importar `gastos/logic.js` desde `movimientos/` (ADN 10); revisar si vale la pena mover `iconoPorOrigen()` a `infra/` si la diferencia visual molesta en la práctica. TX.8b sí distingue el **dominio** (color de la teja: `compromisos` vs `gastos`), pero no el ícono exacto.
- **`S.config.ocultarSaldo` se agregó sin bump de versión de schema** (lectura defensiva con `?.`): mismo patrón sería tentador para `avatar`/`accesosPrioridad` (**IN.6**/**IN.4**), pero antes de repetirlo evaluar si conviene formalizarlo con schema version nuevo, dado que ya son varios campos opcionales acumulados sin migración.
- ~~**`S.perfil.nombre` ya existe pero no se renderiza en Inicio**~~: **resuelto (IN.6a)**. `updSaludo()` lo consume directo, sin dato nuevo.

**Cambios pendientes**: fases del [ADR 028](../DECISIONS/028-inicio-centro-de-control.md) en `BOARD.md` (IN.4a, IN.6b); **IN.5** depende de **TX.9** (fuera de esta iniciativa). Metas y apartados siguen sin aparecer en el historial (sin registros fechados por aporte); la categoría interna `'Ahorro'` existe en `CATEGORIAS_GASTO` pero ningún flujo crea gastos con ella todavía (verificado de nuevo al cerrar TX.8b, sigue igual). "Movimientos" no tiene ícono propio en la barra de navegación ni en el menú "Más" (solo se llega por el link "Ver todo" o por hash directo); si la falta de descubribilidad molesta en la práctica, agregarlo es una tarjeta chica aparte.

**Cambios realizados**:

- 2026-07-05 (TX.8b): vista completa de Movimientos en ruta propia `#movimientos` (sin ícono fijo en la barra), agrupada por mes ("Julio 2026"), sin totales (el resumen financiero es de Análisis, ADR 028 D5). Cada `Movimiento` ahora lleva un campo `dominio` (`gastos`/`compromisos`/`ingresos`/`ahorro`, según tipo y categoría interna) que colorea la teja del ícono con `tejaCategoria()` (mismo patrón que Gastos/Deudas). `movimientosCompletos()` nuevo en `logic.js` (reusa `movimientosRecientes()` con límite `Infinity`, sin duplicar la combinación/orden). El panel compacto de Inicio suma un link "Ver todo" hacia la vista completa. En paralelo, `renderListaGastos()`/`renderFiltrosGastos()` excluyen las categorías internas ('Deudas', 'Gastos fijos') vía `_sinInternas()`: Gastos queda enfocada en gasto cotidiano; `S.gastos` no se toca, así que Análisis y Límites (que leen todo el historial) no se ven afectados. Se corrigió además un hueco de TX.8a: `movimientos/{logic,view,index}.js` no estaban en el precache de `service-worker.js` (`CORE_ASSETS`), ahora sí. 17 tests nuevos en `movimientos.test.js` (dominio por fuente, `movimientosCompletos()`, `renderMovimientosCompletos()`: lista completa, cuenta, agrupación por mes, teja por dominio, "Ver todo") + 7 en `gastos.test.js` (exclusión de internas en lista/chips/total) + 1 E2E de regresión hashchange (`navegacion-render.test.js`, ruta sin ícono de nav). 2168/2168 unit + E2E smoke/navegación verdes en navegador real (Playwright); verificado además con un flujo manual Dashboard → "Ver todo" → Movimientos con datos reales. SW v325 → v326.
- 2026-07-05 (TX.8a): dominio nuevo `modules/dominio/movimientos/` (`logic.js`, `view.js`, `index.js`) que deriva un historial unificado desde `S.gastos`, `S.ingresosPuntuales` y `S.ahorro.aportes` (sin log paralelo, ADR 028 D5). Panel "Actividad reciente" en Inicio con los últimos 5 movimientos, ordenados por fecha descendente. Se agregó `CATEGORIA_ICONO['Gastos fijos'] = 'i-recurring'` en `constants.js` para que los pagos de fijos (categoría interna) tengan ícono propio en vez de caer al genérico `i-gastos`; `'Deudas'` y `'Ahorro'` ya tenían íconos. Reutiliza `tiempoRelativo()`/`f()`/`icon()` ya existentes en `infra/`; CSS nuevo `.actividad-reciente*` en `domain.css` siguiendo el mismo patrón visual que `vencidos-card`/`prioridades-card`. 26 tests nuevos (`movimientos.test.js`): normalización de las 3 fuentes, orden y límite, render oculto/visible/límite de 5. E2E smoke 82/82 verde (nuevo dominio carga sin errores en navegador real).
- 2026-07-05 (CAL.1): nudge de "Distribuir mi ingreso" en Inicio, bloque "Atención hoy". Reutiliza `estadoDistribucion()` y `S.config.ultimaDistribucionPeriodo` **ya existentes** (el panel equivalente de Mis cuentas ya los usaba): no hizo falta marcador nuevo ni bump de schema, corrigiendo la previsión del ADR 028 D4 ("marcador anti-insistencia... dentro del bump v23"). El CTA emite el mismo `distribuir:abrir` que ya usaba el recordatorio de Calendario (ADR 021); `tesoreria/index.js` registra el render vía `registrarRender()`, mismo patrón que los paneles de `compromisos`. Reutiliza el componente `.nudge`/`.nudge-info` existente (sin CSS nuevo). 7 tests nuevos (oculto sin ingresos/pendiente/distribuido, visible con "hoy"/"atrasado", CTA emite el evento). E2E smoke 82/82 verde (incluye el flujo "Distribuir abre el asistente").
- 2026-07-05 (IN.6a): saludo dinámico según hora local ("Buenos días/tardes/noches, {nombre}") con `S.perfil.nombre`, sin nombre si está vacío. `updSaludo()` nuevo en `render.js`, invocado desde `renderAll()`; elemento `#saludo-inicio` bajo el título de Inicio. Sin dato nuevo, sin migración (ADR 028 D3). 6 tests nuevos (franjas horarias con reloj falso, sin nombre, `S.perfil` ausente, contenedor ausente).
- 2026-07-05 (IN.7): `renderPanelPrioridades()` excluye `diasRestantes === 0` de los compromisos antes de combinarlos con personales/apartados. Un compromiso que vence hoy vive únicamente en "Pendientes del mes"; personales y apartados que vencen hoy sí siguen apareciendo en "Próximas prioridades" (no tienen panel de vencidos propio). 2 tests migrados de `DIA_HOY` a `DIA_MANANA` (ya no aplica el caso "vence hoy" para ese escenario) + 2 tests nuevos de regresión.

Esta ficha nace del primer análisis exhaustivo de Inicio (2026-07-05), previo a cualquier propuesta de diseño o código para el resto del cluster.

**Observaciones**: la propuesta de rediseño vive en [ADR 028](../DECISIONS/028-inicio-centro-de-control.md) (un rol por bloque; movimientos derivados sin log paralelo; personalización por lista sin drag & drop en v1; foto de perfil descartada por el cupo de `localStorage`; resumen financiero fuera de Inicio porque Análisis es el dueño de la interpretación). IN.2 (ojo/máscara) e IN.3 (resumen semanal) siguen vigentes sin cambios. Con CAL.1 cerrada sin necesitar campos nuevos, el bump de schema v23 queda acotado a `config.accesosInicio` (IN.4a) y `perfil.avatar` (IN.6b), no a los tres campos que anticipaba el ADR.
