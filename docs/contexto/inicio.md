# Ficha de contexto: Inicio (dashboard)

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Estructura actual del Dashboard (bento grid)

- **Objetivo**          : pantalla principal e inamovible de la app; hoy muestra saldo, un acceso rápido, paneles de vencidos/próximos y un resumen semanal.
- **Estado actual**     : estable, en evolución (tarjetas **IN.4**, **IN.6**, **CAL.1**, **TX.8** en `BOARD.md`, análisis en curso). **IN.7** cerrada.
- **Verificado contra** : (commit de IN.7, 2026-07-05).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Orquestador del dominio (suscripción a EventBus, re-render) | `modules/dominio/resumen/index.js` | `initResumen()` | ~16 |
| Resumen semanal (datos) | `modules/dominio/resumen/logic.js` | `resumenSemanal(gastos, hoyISO)` | ~202 |
| Resumen semanal (render) | `modules/dominio/resumen/view.js` | `renderPanelResumen()` | ~51 |
| Hero de saldo (render + ojo/máscara) | `modules/infra/render.js` | `updSaldo()` | ~72 |
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
| Aviso de distribuir ingreso (ADR 021), hoy en Calendario | `modules/dominio/agenda/index.js` | `EventBus.emit('distribuir:abrir')` | ~61 |
| Receptor del aviso, abre el asistente en Tesorería | `modules/dominio/tesoreria/index.js` | `EventBus.on('distribuir:abrir', ...)` | ~61 |
| Perfil del usuario (nombre, no renderizado en Inicio hoy) | `modules/core/state.js` | `S.perfil = { nombre, smmlv }` | ~272 |
| Config de usuario (sin accesos personalizados ni avatar hoy) | `modules/core/state.js` | `S.config = { notificaciones, perfilFiscal, datosFiscales }` | ~278 |
| Preferencia de ocultar saldo (agregada dinámica, sin bump de schema) | `modules/infra/render.js` | lectura defensiva `S.config?.ocultarSaldo` | ~76 |
| Catálogo de categorías de gasto (fijo, 19 + 2 internas) | `modules/core/constants.js` | `CATEGORIAS_GASTO` | ~400 |
| Categorías visibles al usuario | `modules/core/constants.js` | `CATEGORIAS_GASTO_USUARIO` | ~426 |
| Mapeo categoría → símbolo del sprite | `modules/core/constants.js` | `CATEGORIA_ICONO` | ~448 |
| Eventos de compromisos por mes (patrón de referencia, no cruza dominios) | `modules/dominio/agenda/logic.js` | `eventosDelMes(compromisos, year, month)` | ~104 |
| Eventos de ingresos por mes | `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes(ingresos, year, month)` | ~144 |

**Recursos**: sprite `i-saldo`/`bolt` para el hero y Gasto rápido; `CATEGORIA_ICONO` para los ítems de "Gastos por organizar"; tokens `--fk-*` del bento grid (no auditados en detalle en este pase).

**Dependencias y relaciones**: `resumen` escucha `EventBus` para re-renderizar al cambiar gastos (ADN 10 respetado: ningún dominio importa a otro, la combinación de fuentes se hace inline en la vista consumidora, ej. `dashboard.js` combina compromisos + personales + apartados sin un helper compartido en `infra/`). El aviso de distribución de ingreso hoy nace en `agenda` y se resuelve en `tesoreria`, no toca `resumen`.

**Riesgos**:

- **Discrepancia con el brief del usuario**: el usuario describe "3 accesos rápidos fijos" que el usuario podría reordenar (base de **IN.4**); el código real solo tiene **1** (Gasto rápido). Cualquier diseño de IN.4 debe partir de este hecho verificado, no del supuesto de 3.
- ~~**Overlap confirmado entre paneles** (base de **IN.7**)~~: **resuelto**. Un compromiso con `diaPago = hoy` aparecía a la vez en "Pendientes del mes" (`renderPanelVencidos`, vía `detectarVencidosCompletos`) y en "Próximas prioridades" (`renderPanelPrioridades`, vía `compromisosProximos` con `diasRestantes = 0`). `renderPanelPrioridades()` ahora filtra `diasRestantes > 0` sobre los compromisos antes de combinarlos con personales/apartados: lo que vence hoy vive solo en Pendientes del mes. `compromisosProximos()` (logic) no se tocó: otros consumidores (nudge de mora, `nivelAlertaMora`) siguen necesitando el día 0.
- **Categorías son catálogo cerrado**: `CATEGORIAS_GASTO`/`CATEGORIA_ICONO` no soportan categorías creadas por el usuario hoy. Relevante para **TX.9** (categoría personalizada) y **TX.10** (categoría como eje de automatización): requiere diseño de dato nuevo + migración de schema (ADN 6), no solo UI.
- **Sin helper cross-dominio en `infra/`**: cualquier "Movimientos" (**TX.8**) que cruce todos los dominios debe decidir dónde vive esa agregación sin violar ADN 10 (ningún dominio importa a otro). El patrón existente (combinar arrays inline en la vista consumidora, ver `dashboard.js`) no escala bien a "todos los dominimos posibles"; probablemente conviene un dominio agregador (`resumen` ya cumple ese rol para el hero) o EventBus con un registro de "aportantes de movimientos".
- **`S.config.ocultarSaldo` se agregó sin bump de versión de schema** (lectura defensiva con `?.`): mismo patrón sería tentador para `avatar`/`accesosPrioridad` (**IN.6**/**IN.4**), pero antes de repetirlo evaluar si conviene formalizarlo con schema version nuevo, dado que ya son varios campos opcionales acumulados sin migración.
- **`S.perfil.nombre` ya existe** pero no se renderiza en Inicio: **IN.6** (saludo dinámico) puede consumirlo directo, no requiere dato nuevo para el nombre (sí para avatar/mascota).

**Cambios pendientes**: ver tarjetas **IN.4**, **IN.6**, **CAL.1**, **TX.8** en `BOARD.md` (análisis conjunto en curso); **IN.5** depende de **TX.9** (fuera de este análisis).

**Cambios realizados**:

- 2026-07-05 (IN.7): `renderPanelPrioridades()` excluye `diasRestantes === 0` de los compromisos antes de combinarlos con personales/apartados. Un compromiso que vence hoy vive únicamente en "Pendientes del mes"; personales y apartados que vencen hoy sí siguen apareciendo en "Próximas prioridades" (no tienen panel de vencidos propio). 2 tests migrados de `DIA_HOY` a `DIA_MANANA` (ya no aplica el caso "vence hoy" para ese escenario) + 2 tests nuevos de regresión.

Esta ficha nace del primer análisis exhaustivo de Inicio (2026-07-05), previo a cualquier propuesta de diseño o código para el resto del cluster.

**Observaciones**: sin ADR propio todavía; el bento grid actual convive con reglas ya vigentes (IN.2 ojo/máscara del saldo, IN.3 resumen semanal). Cualquier ADR nuevo sobre "Inicio como centro de control" debería referenciarlas en vez de redefinirlas.
