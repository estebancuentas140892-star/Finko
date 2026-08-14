# Ficha de contexto: Logros

> Revisado: 2026-08-14.

> Gamificación ligera de hábitos: catálogo, evaluación automática, toast con confetti y las dos superficies de "Tu progreso". Partida de [`transversal.md`](transversal.md) el 2026-08-14 (DOC.3). Reglas de uso y plantilla en [`README.md`](README.md).
>
> **Qué NO buscar acá:** la celda del bento de Inicio que hospeda la tarjeta (en [`inicio.md`](inicio.md)); el apartado colapsable de Análisis y su lenguaje (en [`analisis.md`](analisis.md)).

---

## Sistema de logros (dominio `logros`)

- **Objetivo**          : gamificación ligera de hábitos: catálogo de logros con evaluación automática, toast con confetti al desbloquear y "Tu progreso" (apartado de Análisis + tarjeta compacta en Inicio).
- **Estado actual**     : estable. **Logros v2 completa** ([ADR 032](../DECISIONS/032-logros-v2-niveles-y-habitos.md) Aceptada el 2026-07-09): LG.2b (2026-07-09), LG.2c (2026-07-12), LG.2e (2026-08-13, familia comportamiento con un solo logro, `hormiga-a-raya`) y **LG.2d cerrada el 2026-08-13** (mudanza a Análisis + tarjeta en Inicio; el [ADR 022](../DECISIONS/022-vitrina-de-logros-en-ajustes.md) pasa a Superada). Catálogo: 18 logros (antes 11), familias `registro` 6, `metas` 1, `deudas` 2, `comportamiento` 1.
- **Verificado contra** : commit de LG.2d (2026-08-13).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Catálogo (18 logros; familias `registro` 6 niveles, `metas` 1, `deudas` 2, `comportamiento` 1) | `modules/dominio/logros/logic.js` | `LOGROS` | ~258 |
| Metadata de familias (nombre por familia) | `modules/dominio/logros/logic.js` | `FAMILIAS` | ~47 |
| Derivación "mes completo de registro" (D3, ≥3 semanas del mes) | `modules/dominio/logros/logic.js` | `mesCompleto()`, helper interno `_semanasPorMes()` | ~92 |
| Racha de meses completos consecutivos (memoizada por gastos) | `modules/dominio/logros/logic.js` | `rachaMesesCompletos()`, `_rachaMesesCompletosMemo` | ~106, ~129 |
| Conteo de deudas saldadas (excluye consolidadas) | `modules/dominio/logros/logic.js` | `deudasSaldadas()` | ~142 |
| Umbrales de gasto hormiga (≤20.000 por transacción; piso de relevancia 100.000) | `modules/dominio/logros/logic.js` | `UMBRAL_GASTO_HORMIGA`, `UMBRAL_HORMIGA_RELEVANTE` | ~160, ~168 |
| Gasto hormiga por mes (LG.2e) | `modules/dominio/logros/logic.js` | `gastoHormigaMes()`, helper interno `_hormigaPorMes()` | ~195 |
| Bajada de hormiga vs promedio de 3 meses (memoizada por gastos) | `modules/dominio/logros/logic.js` | `hormigaALaRaya()`, `_hormigaALaRayaMemo` | ~237, ~255 |
| Evaluación (ids cumplidos ahora, try/catch por logro) | `modules/dominio/logros/logic.js` | `evaluarLogros()` | ~447 |
| Estado render-ready de la vitrina (incluye familia/nivel) | `modules/dominio/logros/logic.js` | `estadoLogros()` | ~480 |
| Agrupación por familia (una tarjeta por familia) | `modules/dominio/logros/logic.js` | `agruparVitrina()` | ~535 |
| Nivel de usuario derivado del conteo (nombres provisionales, tramo superior min 16) | `modules/dominio/logros/logic.js` | `nivelUsuario()`, `NIVELES_USUARIO` | ~597 |
| Detección + persistencia + toast (cola de a uno) | `modules/dominio/logros/index.js` | `_checkYMostrar()`, `_encolarToast()` | ~59, ~97 |
| Confetti (24 piezas, ajuste mobile por bottom-nav) | `modules/dominio/logros/index.js` | `_lanzarConfetti()` | ~193 |
| Apartado "Tu progreso" en Análisis (agrupado + nivel en el encabezado, colapsable) | `modules/dominio/logros/view.js` | `renderProgresoAnalisis()`, `_renderFamiliaItem()` | ~28, ~99 |
| Tarjeta compacta en Inicio (nivel + último logro + próximo objetivo) | `modules/dominio/logros/view.js` | `renderTarjetaProgresoInicio()`, `_proximoObjetivo()` | ~64, ~112 |

**Recursos**: emojis por logro (se conservan por ADR 025 D6). CSS: `.logro-toast*`, `.confetti-piece` (nudges.css/base.css), `.logros-lista`, `.logro-item*` (config.css, origen histórico del ADR 022; reusadas tal cual en las dos superficies vigentes). Estado: `S.logros` (`string[]` de ids, orden de inserción = orden de desbloqueo).

**Dependencias y relaciones**: escucha `state:change` (re-evalúa y re-renderiza) y `onboarding:completado` (toast retrasado 4 s, NAV.C/ADR 024 D6). El shell expone `#panel-analisis-progreso` junto a `#panel-analisis` y `#panel-progreso-inicio` dentro del bento de Inicio, porque ni `analisis` ni `resumen` pueden importar `logros` (ADN 10, mismo mecanismo que el ADR 022 estableció para Ajustes). No emite eventos propios. Sin imports de otros dominios: los `eval` leen `S` directo; los evaluadores de la familia "registro" (LG.2c) importan `hoy()` de `infra/utils.js` (infra, no dominio, permitido) para obtener la fecha actual, y los de "deudas" comparan `c.tipo === 'deuda-entidad' || 'deuda-personal'` como literales en vez de importar `esDeuda()` de `compromisos/logic.js`.

**Riesgos**:

- **La persistencia manda sobre la evaluación**: un logro en `S.logros` no se revoca aunque el estado retroceda (borrar gastos, etc.). Cualquier lógica nueva debe respetarlo.
- **Los `eval` corren en cada `state:change`**: mantenerlos O(1) o memoizados (disciplina del ADR 022, reforzada en ADR 032 D7); un evaluador O(historial) sin memo degrada toda la app. `rachaMesesCompletos()` se memoiza (`_rachaMesesCompletosMemo`, PERF.2) porque los 4 niveles de la familia registro (mes-completo a doce-meses-seguidos) la llaman con los mismos argumentos dentro de una sola pasada de `evaluarLogros()`.
- **3+ logros simultáneos** (import de respaldo/CSV) colapsan a un solo toast resumen; no romper ese guard al agregar logros.
- **Ids del catálogo son valores persistidos**: nunca renombrarlos (mismo criterio que los ids de `MARCAS`).
- **`NIVELES_USUARIO` (D5) se calibró para ~20 logros y el catálogo cerró en 18**: LG.2e bajó el tramo superior de min 18 a **min 16** para que no exija el 100 % del catálogo (incluidos `prestamista` y el fondo completo). El test "el tramo superior es alcanzable sin el 100 % del catálogo" defiende la relación; si algún día entran más logros, revisar el umbral, no borrar el test.
- **`rachaMesesCompletos()` se ancla en "el mes anterior a hoy"**: solo detecta una racha activa si el usuario sigue usando la app (dispara `state:change`) mientras la racha está vigente. Una racha pasada y luego abandonada ya quedó persistida en `S.logros` si se evaluó en su momento (no se revoca); el riesgo real es solo si el usuario NUNCA vuelve a abrir la app durante el mes en que la racha era detectable, caso de borde aceptado (mismo patrón que otros logros de conteo simple).

**Cambios pendientes**: ninguno propio de la iniciativa "Logros v2": las 4 rebanadas (LG.2b/c/d/e) cerraron. **Dos logros del catálogo D4 quedaron diferidos por datos, sin tarjeta**: `ahorro-creciente` espera la derivación canónica de ingreso mensual (el ADR 046 no la entregó; no construir una paralela) y `pagador-puntual` espera historial de vencimientos pagados, que `S.compromisos` no guarda (solo estado actual): la verificación y sus razones quedaron en el ADR 032, sección "Resolución de LG.2e en implementación". Los nombres de `NIVELES_USUARIO` son provisionales: cuando Esteban entregue los definitivos, se cambia la constante (sin tocar datos, nada se persiste).

**Cambios realizados**:

- 2026-08-13 (LG.2d, ADR 032 D6, **cierra la iniciativa "Logros v2"**): `renderPanelLogros()` se reparte en `renderProgresoAnalisis()` (apartado colapsable de Análisis) y `renderTarjetaProgresoInicio()` (tarjeta nueva en el bento de Inicio, con `_proximoObjetivo()`); `#panel-logros` sale de Ajustes y el ADR 022 pasa a Superada. Cero cambios en `logic.js`.
- 2026-08-13 (LG.2e, ADR 032 D4): familia `comportamiento` con `hormiga-a-raya`; `gastoHormigaMes()` y `hormigaALaRaya()` nuevas, tramo superior de `NIVELES_USUARIO` recalibrado a min 16.
- 2026-07-12 (LG.2c, ADR 032 D3/D4): constancia de registro y deudas saldadas; `mesCompleto()` y `rachaMesesCompletos()` nuevas.
- 2026-07-09 (LG.2b, ADR 032 D1/D5): fundacion de progresion: `familia`/`nivel` en el catalogo, `FAMILIAS` y `agruparVitrina()` (una tarjeta por familia), sin bump de schema.
- 2026-07-09 (LG.2a): ADR 032 escrito y validado por Esteban el mismo dia (Aceptada).
- 2026-07-04 (LG.1b, ADR 022): vitrina en Ajustes con hint y progreso parcial.
- 2026-07-04 (LG.1a): toast mas legible, cola de a uno, pausa por hover.

**Observaciones**: ADRs relacionados: 022 (vitrina en Ajustes, Superada por LG.2d), 032 (v2, Aceptada), 025 D6 (emojis se conservan). La regla anti-gaming del ADR 032 D2 es principio innegociable: logros que premien la omisión de registro ("día sin gastos") no entran al catálogo bajo ninguna forma; las familias "registro" y "deudas" de LG.2c son ambas ADITIVAS (más registro = más progreso), así que no necesitan la guardia de "mes completo" que sí lleva el único logro de reducción del catálogo (`hormiga-a-raya`, LG.2e: los 4 meses de la comparación deben ser mes completo, el mes en curso no participa y el promedio previo debe superar 100.000). Riesgo residual anotado en el código: un mes completo se cumple con gastos en 3 semanas aunque sean todos grandes; no se agregó una segunda guardia por conteo de transacciones porque castigaría al usuario que sí redujo.
