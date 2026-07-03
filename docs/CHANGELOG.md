# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-07)

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js), `categoriaTopSemana`) sumaba todos los `S.gastos` de la semana, incluidos los generados automáticamente por un gasto fijo o un abono a deuda (que llevan `compromisoId`, ver [ADR 002](DECISIONS/002-abono-deudas.md)). Con un arriendo de $900.000 y un mercado de $50.000, el indicador mostraba "Vivienda" cuando el hábito de consumo real del usuario era Alimentación. Fix: `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen visible en la lista de Gastos (obligación vs. consumo variable). Las demás cifras del resumen (total de 7 días, comparación semanal, registros, días activos) no cambian: siguen contando todos los gastos, porque miden actividad total, no hábitos de categoría. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados (arriendo con `compromisoId` + mercado sin él → "🛒 Alimentación $50.000"). SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId` antes de agrupar por categoría. |
| `tests/unit/resumen.test.js` | 2 tests: excluye `compromisoId`, y devuelve `null` si toda la semana fue solo fijos/deudas. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto y último slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Tres ajustes independientes de descubribilidad y robustez:

1. **Sidebar con pliegue**: en alturas de ventana <= 800px (solo escritorio; la regla exige `min-width: 1024px` para no chocar con el bottom nav móvil, que ya aplana el nav a fila) el grupo Herramientas quedaba bajo el scroll interno del `.sidebar__nav` sin ningún indicio visual de que había más contenido. [styles/layout.css](../styles/layout.css) compacta el `margin-top` de `.nav-group` y el `padding-bottom` de `.nav-group__label`, y agrega un `::after` `position: sticky; bottom: 0` con gradiente hacia el color de fondo del sidebar, que insinúa el scroll sin robar espacio de layout (compensado con `margin-top` negativo).
2. **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV con muchas categorías nuevas) se encadenaba un toast con confetti cada 1.4s ([logros/index.js](../modules/dominio/logros/index.js)) que tapaba contenido por varios segundos. `_checkYMostrar` ahora corta a un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un segundo parámetro `label` opcional (antes fijo en "Logro desbloqueado"). Verificado con un script Playwright temporal (no comiteado, borrado tras confirmar): sembrando datos que desbloquean 6 logros de golpe, aparece exactamente 1 `.logro-toast` con el texto "Logros desbloqueados" / "6 logros nuevos".
3. **`save()` sin flush al cerrar**: el debounce de 200ms en [core/storage.js](../modules/core/storage.js) puede perder el último cambio si el usuario cierra la pestaña o el sistema mata la PWA en segundo plano en móvil antes de que el timer corra. Nueva `initFlushOnHide()` (exportada desde `storage.js`) escucha `visibilitychange` (solo cuando `document.visibilityState === 'hidden'`) y `pagehide`, y llama a `_flushNow()` únicamente si hay un guardado pendiente (`_saveTimer` activo), para no escribir a `localStorage` sin necesidad. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`, antes de cualquier interacción del usuario. El doc comment de `_flushNow` (antes "no usar en producción") se actualizó para reflejar este segundo uso legítimo.

Sin tests unitarios nuevos: los dos primeros son CSS/DOM puro sin lógica que aislar en happy-dom, y el toast de logros está explícitamente fuera del alcance de los tests unitarios por decisión ya documentada en `tests/unit/logros.test.js` ("el toast y confetti requieren DOM completo y se verifican manualmente en la app"). El flush en `visibilitychange`/`pagehide` tampoco es testeable en happy-dom (no hay pestaña real que ocultar). 1764/1764 unit + 81/81 E2E verdes (sin regresiones). SW v251 → v252.

- **`styles/layout.css`**: media query `(max-height: 800px) and (min-width: 1024px)` con espaciado compacto de `.nav-group` + fade sticky en `.sidebar__nav`.
- **`modules/dominio/logros/index.js`**: `_checkYMostrar` muestra un toast resumen si `nuevos.length > 2`; `_mostrarToast(logro, label)` acepta label opcional.
- **`modules/core/storage.js`**: nueva `initFlushOnHide()`; doc comment de `_flushNow` actualizado.
- **`modules/ui/bootstrap.js`**: registra `initFlushOnHide()` tras `loadData()`.
- **`service-worker.js`**: v251 → v252.

---

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio consolidado de [ADR 019](DECISIONS/019-limites-por-rol.md) (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de [ADR 008](DECISIONS/008-mecanicas-de-habito.md) (resumen semanal como reflexión sin castigo): gastar no es incumplir.

1. **Total de "Resumen de la semana"** en Inicio y **"Pendiente"** en Préstamos ([styles/components/domain.css](../styles/components/domain.css)), ambos usando la clase compartida `.resumen-card__stat--primary`, coloreaban el monto con `--fk-danger-text`. Cambiado a `--fk-text-primary` (neutro). Ninguno de los dos casos es un incumplimiento: uno es cuánto gastaste (información), el otro es dinero que te deben (positivo para ti).
2. **Variación al alza del gasto mensual** en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`. Se eliminó la regla de color (el default de `.chart-stat__valor` ya es neutro) y se quitó la asignación de la clase en `_renderTendencia` ([analisis/view.js](../modules/dominio/analisis/view.js)).

Decisión sobre el punto pendiente del backlog (neutro vs ámbar para la variación al alza): **neutro**, por dos razones. Primero, consistencia: el texto de tendencia semanal en Inicio ya es neutro desde F8 ("Gastaste X% más que la semana pasada" en `--fk-text-secondary`), así que el número no debía quedar en otro tono que su propio texto. Segundo, no hay un umbral incumplido que justifique una advertencia (ámbar): es solo una comparación mes a mes, no un límite superado. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): eso sí es un logro digno de refuerzo positivo.

Sin tests nuevos: cambio de color puro sin lógica nueva; ningún test existente referenciaba las clases o colores tocados (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v250 → v251.

- **`styles/components/domain.css`**: `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`.
- **`styles/components/charts.css`**: eliminada `.chart-stat--negativo` (color danger); queda el neutro por defecto de `.chart-stat__valor`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` ya no asigna `chart-stat--negativo` cuando sube el gasto.
- **`service-worker.js`**: v250 → v251.

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Cinco correcciones puntuales de copy que violaban la regla ADN 11 (tuteo, español neutro, sin términos internos):

1. **[logros/logic.js](../modules/dominio/logros/logic.js)**: 4 descripciones de logros en voseo o sin tildes ("Tenes 3 o mas", "un prestamo que vos le diste", "configuracion", "esta lista"). Corregidas a tuteo con tildes correctas.
2. **"Ver agenda"** en el panel de "Próximas prioridades" de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)): quedó desactualizado desde que la sección se renombró a Calendario (AG.1, 2026-06-30). Ahora dice "Ver calendario".
3. **"el dashboard"** en los empty states de Gastos ([gastos/view.js](../modules/dominio/gastos/view.js)) y Mis cuentas ([tesoreria/view.js](../modules/dominio/tesoreria/view.js)): término interno que la app ya no usa desde el renombre a Inicio. Corregido a "Inicio".
4. **`APP_VERSION`** en [core/constants.js](../modules/core/constants.js): decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, desincronizado de `package.json` (`1.0.0`). Sincronizado.
5. **"Toca una estrategia"** en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)): se lee raro en desktop (no hay "toque" con mouse). Cambiado a "Elige una estrategia".

Sin tests nuevos: es copy sin lógica asociada y ningún test existente referenciaba estos textos (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v249 → v250.

- **`modules/dominio/logros/logic.js`**: 4 descripciones de logros con tuteo y tildes correctas.
- **`modules/dominio/compromisos/views/dashboard.js`**: "Ver agenda" → "Ver calendario" (+ `aria-label`).
- **`modules/dominio/gastos/view.js`**, **`modules/dominio/tesoreria/view.js`**: "el dashboard" → "Inicio" en empty states.
- **`modules/core/constants.js`**: `APP_VERSION` `'0.1.0'` → `'1.0.0'`.
- **`modules/dominio/compromisos/views/estrategia.js`**: "Toca una estrategia" → "Elige una estrategia".
- **`service-worker.js`**: v249 → v250.

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` referenciaban 15 variables `--fk-*` nunca definidas en `tokens.css` (~52 usos): al no existir, el navegador usa el valor inicial en vez del token de diseño, lo que rompía en silencio el `accent-color` de radios/checkboxes (verde de marca → azul del navegador), los bordes de tarjetas (caían a `currentColor`, invisibles) y los fondos de gráficos (transparentes).

Mapeo aplicado siguiendo el patrón ya dominante en el resto del código:

- `--fk-primary` → `--fk-accent` (color de marca).
- `--fk-border` → `--fk-border-subtle` (convención mayoritaria para bordes de tarjeta: 35 usos reales contra 15 de `border-default`).
- `--fk-bg`, `--fk-surface`, `--fk-surface-subtle` → `--fk-bg-surface` / `--fk-bg-elevated` según la jerarquía visual del elemento (dos usos como `color:` sobre círculos de acento van a `--fk-text-on-accent`, no a un fondo).
- `--fk-text` → `--fk-text-primary`.
- `--fk-weight-bold/medium/semibold/regular` y `--fk-font-normal` → `--fk-font-bold/medium/semibold/regular`.
- `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`.
- `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala tipográfica, xs es el valor real más cercano).

Se aprovechó para quitar los fallbacks inline (`var(--x, valor)`) que compensaban las variables fantasma: ya no hacen falta porque el token real siempre está definido. Cero cambios de lógica, HTML o comportamiento: es puramente resolución de tokens. Verificado en navegador (datos sembrados): Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) muestran bordes y fondos reales. 1764/1764 unit verdes (sin tests nuevos: no hay lógica que cubrir, solo CSS). SW v248 → v249.

- **`styles/components/charts.css`**: 15 usos (sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda).
- **`styles/components/domain.css`**: 11 usos (selector de cuenta radio/checkbox, tarjeta de límites, consolidado de ahorro).
- **`styles/components/analysis.css`**: 14 usos (tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa).
- **`styles/components/forms.css`**: 2 usos (badge genérico, placeholder de gasto sin completar).
- **`styles/components/config.css`**: 2 usos (título y emoji del detalle de calendario).
- **`styles/layout.css`**: 1 uso (separador de sub-header de sección).
- **`service-worker.js`**: v248 → v249.

---

### fix(dashboard/analisis): montos reales de deudas en los paneles de Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Corrige los 4 bugs funcionales visibles que detectó la auditoría:

1. **"$NaN pendiente" en el nudge "deudas llevan tiempo sin actividad"** (sección Deudas): la vista leía `d.saldoPendiente`, campo que no existe; la lógica (`detectarDeudasDurmiendo`) devuelve `saldoTotal`. Ahora muestra el saldo formateado ("$5.800.000 pendiente").
2. **Deudas vencidas con "$0" en el panel "N pendientes del mes"** (Inicio): `detectarVencidosCompletos` exponía `Number(c.monto) || 0`, pero las deudas no tienen `monto` desde la migración v6 (su cuota vive en `cuotaMensual`). Ahora expone la cuota mensual para deudas y conserva `monto` para fijos.
3. **"Próximas prioridades" (Inicio) omitía la cifra de las deudas**: el render leía `c.monto`; ahora cae a `cuotaMensual` cuando no hay `monto` (fijos, préstamos personales y apartados siguen igual).
4. **Variación "↑ 0%" en rojo en la tendencia de Análisis** cuando el mes anterior cerró en $0: sin base de comparación no hay porcentaje que mostrar; ahora dice "Sin gastos el mes anterior para comparar" en tono neutro (mismo criterio que el resumen semanal de F8).

6 tests de regresión nuevos (1 de lógica + 5 de render en happy-dom). 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real (Playwright, datos sembrados): Inicio, Deudas y Análisis muestran los montos y textos correctos. SW v247 → v248.

- **`modules/dominio/compromisos/views/alertas.js`**: `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes `d.saldoPendiente`, undefined, que formateaba NaN).
- **`modules/dominio/compromisos/logic.js`**: `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas.
- **`modules/dominio/compromisos/views/dashboard.js`**: el panel de prioridades usa `c.monto ?? c.cuotaMensual`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` maneja el caso sin base (mes anterior en $0) con aviso neutro.
- **`tests/unit/compromisos.test.js`**, **`tests/unit/analisis.test.js`**: 6 tests de regresión.
- **`service-worker.js`**: v247 → v248.

---

### feat(presupuesto): los topes por categoría se fusionan dentro de la tarjeta de Estilo de vida (MC.8b, ADR 019) · 2026-07-01

Segundo slice grande de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Elimina la **redundancia de arquitectura de la información**: Estilo de vida dejaba de aparecer en dos sitios (su tarjeta en el resumen y el bloque suelto "Estilo de vida: topes por categoría" debajo, con su hero de totales). Ahora hay **un solo relato por grupo**.

Los topes por categoría (envelope budgeting sobre `S.presupuestos`) viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida` en `presupuesto/view.js`), con tres piezas:

- **Olla finita** (`_renderOllaFinita`): una línea que dice cuánto del presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas) cubren los límites y cuánto queda sin tope, por ejemplo "Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope." Da la noción de presupuesto acotado sin forzar a asignar el 100% (usa `coberturaLimitesEstiloVida`, MC.8a). Maneja los bordes: sin presupuesto, sin límites, cobertura total y exceso (este último en ámbar).
- **Envelopes por categoría** con sus alertas ámbar/roja (Estilo de vida es el grupo que sí se controla), o un mensaje breve si aún no hay ninguno.
- **Botón "Agregar límite"** (topes bajo demanda) más las categorías con gasto pero sin tope (sugerencia de dónde poner uno).

`_renderGrupoCard` pasa a ser **consciente del rol** (ADR 019 decisión 1): **Necesidades = monitorear** (estado neutro `monitor`, sin barra ámbar ni roja; la tercera cifra informa el exceso como "Sobre lo previsto", nunca "Excedido" en rojo, porque son gastos esenciales que se pagan sí o sí); **Ahorro = celebrar** (verde, ya venía de MC.8); **Estilo de vida = controlar** (conserva su estado de gasto alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin la olla finita, que necesita el presupuesto del grupo), para no perder la capacidad de ponerle un tope al gasto antes de registrar ingresos.

Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión) y su CSS (`.presupuesto-hero*`, `.estilo-detalle*`, y la regla móvil asociada en `responsive.css`). **Pendiente MC.8c:** el layout (Necesidades + Ahorro en dos columnas compactas, Estilo de vida en fila completa); por ahora las tres tarjetas siguen en el grid de 3 columnas.

3 E2E nuevos (fusión de topes + botón "Agregar límite", olla finita con la cobertura exacta, Necesidades sin alarma aunque supere lo previsto). 1758/1758 unit; 42/42 → 45/45 smoke E2E. Lint limpio. SW v246 → v247.

- **`modules/dominio/presupuesto/view.js`**: topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol (Necesidades neutro); `_renderResumenGruposVacio` conserva los topes sin ingreso; `_renderHero`/`_renderEmptyState` eliminados.
- **`styles/components/analysis.css`**: `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`.
- **`styles/responsive.css`**: se quitó la regla móvil de `.presupuesto-hero__totales`.
- **`tests/e2e/smoke.test.js`**: 3 tests nuevos.
- **`service-worker.js`**: v246 → v247.

---

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo (MC.8, ADR 019) · 2026-07-01

Petición del usuario sobre la retroalimentación visual del Ahorro: superar la meta se pintaba de **rojo** (barra `progress-bar--danger`, borde/fondo de peligro, "Excedido" en rojo), lo que transmite error cuando en realidad es un buen hábito. Se hace `_renderGrupoCard` (`presupuesto/view.js`) consciente del rol para el grupo **Ahorro**: cumplir o superar la meta (`pct >= 100`) usa la **paleta positiva** (verde), nunca ámbar ni rojo.

- Barra `progress-bar--complete` (verde) al llegar al 100%; por debajo, el color de progreso neutro. Nunca `--warn` ni `--danger` para Ahorro.
- Estado visual nuevo `logro` (borde y fondo verdes) en vez de `excedido` (rojo).
- Tercera cifra: superar la meta es "Ahorrado de más" en verde (`is-positive`), no "Excedido" en rojo; no llegar aún es "Te falta" (neutro), en vez del "Disponible" que no aplicaba a ahorro.

Consolida la regla de color de Finko: verde = logros/ahorro/metas cumplidas, ámbar = advertencias, rojo = incumplimientos reales. Necesidades y Estilo de vida conservan su chrome actual (el reencuadre de Necesidades es MC.8b). 1 E2E nuevo (en navegador limpio, autoritativo). 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador: la tarjeta de Ahorro al 150% muestra barra verde, "Ahorrado de más $300.000" en verde y borde verde. Lint limpio. SW v245 → v246.

- **`modules/dominio/presupuesto/view.js`**: `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`).
- **`styles/components/analysis.css`**: `.grupo-card[data-estado="logro"]` (verde) + `.grupo-card__fig dd.is-positive`.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo (Ahorro superado se ve en verde, nunca en rojo).
- **`service-worker.js`**: v245 → v246.

---

### feat(presupuesto): mensajes de Límites por rol, Necesidades informativo y Ahorro más cálido (MC.8a, ADR 019) · 2026-07-01

Primer slice de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 1, 3 y 2). Reencuadra `generarMensajesLimites` (`presupuesto/logic.js`) para que cada grupo hable según su **rol**, no con una plantilla común:

- **Necesidades = monitorear.** Deja de emitir una alerta con lenguaje de "límite". Cuando el gasto en necesidades supera lo que la distribución les asignó, genera un mensaje **informativo** (`tipo: 'info'`, nuevo): "Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos." Estar cerca del presupuesto (estado 'alerta') ya no genera nada: es normal.
- **Ahorro = celebrar.** El refuerzo distingue cumplir de superar: si aportaste justo lo planeado, "Vas por buen camino. Cumpliste con el ahorro que planeaste este mes"; si aportaste de más (`ejecutado > asignado`), un mensaje más cálido: "¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana."
- **Estilo de vida = controlar.** Sin cambios: sigue siendo el único grupo con alertas preventivas por categoría y por grupo.

Nueva función pura **`coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida)`** (la "olla finita"): devuelve `{limites, presupuesto, sinTope, excede}`, cuánto del presupuesto de Estilo de vida cubren los topes y cuánto queda sin tope, para dar noción de presupuesto acotado sin forzar el 100%. Reusa `totalAsignadoMensual`. La usará MC.8b en la vista.

Como `generarMensajesLimites` ya está en uso, se ajustó el render de nudges (`presupuesto/view.js`): `_nivelNudge` resuelve el nivel visual y se agregó el nivel `info` → `nudge-info` (azul calmado), además de los existentes. **Nota:** el chrome de las tarjetas (barra roja, etiqueta "Excedido") todavía sigue el modelo simétrico de MC.5b; su reencuadre por rol es MC.8b. Este slice solo cambia los mensajes.

6 unit netos + 1 E2E nuevo. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador: la tarjeta de Necesidades excedidas muestra un nudge azul informativo (sin "límite") y la de Ahorro que supera lo planeado, el refuerzo cálido en verde. Lint limpio. SW v244 → v245.

- **`modules/dominio/presupuesto/logic.js`**: `generarMensajesLimites` reencuadrada por rol; `coberturaLimitesEstiloVida` nueva.
- **`modules/dominio/presupuesto/view.js`**: `_nivelNudge` + soporte del nivel `nudge-info`.
- **`tests/unit/presupuesto.test.js`**: tests de Necesidades/Ahorro actualizados + 6 de `coberturaLimitesEstiloVida`.
- **`tests/e2e/smoke.test.js`**: E2E de refuerzo de Ahorro actualizado (cumplir) + nuevo (superar).
- **`service-worker.js`**: v244 → v245.

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica **MC.8**, que **revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md)** sin revertir su núcleo (presupuesto por grupo desde la distribución, sin schema). Nace de una observación del usuario: tratar los tres grupos de Límites con la misma tarjeta y los mismos umbrales es sutilmente incorrecto, porque no tienen la misma naturaleza. La sección pasa a un **tratamiento asimétrico por rol**:

1. **Necesidades = monitorear.** Gastos esenciales que se pagan sí o sí; no se limitan. El copy se reencuadra: informa cuánto del ingreso consumen ("usan el X%") y, si suben, sugiere revisar el plan general, nunca "te estás pasando". Se elimina la palabra "límite" de su copy.
2. **Ahorro = celebrar.** Ahorrar más de lo planeado es una victoria, no una desviación. Refuerzo cálido y variado al cumplir o superar la meta (ya existía desde MC.5d; se enriquece), nunca alerta.
3. **Estilo de vida = controlar.** Único grupo con topes por categoría y alertas preventivas. Los topes se **fusionan dentro de su tarjeta** (desaparece el bloque suelto "Estilo de vida: topes por categoría"), con el modelo de "agregar límite bajo demanda" (ya existente) más una línea de conciencia de "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites actuales). Se rechaza la alternativa de porcentajes que sumen 100% por la misma rigidez que MC.6b ya descartó.

Layout: en desktop, Necesidades y Ahorro en dos columnas compactas y Estilo de vida en fila completa (el peso visual comunica dónde está la acción); en móvil se apilan. Decisión pragmática: todas las categorías de gasto siguen siendo limitables en v1 (reclasificarlas por grupo tocaría `ejecutadoPorGrupoDelMes` y se difiere a un ADR futuro). Sin schema nuevo. Implementación en 4 slices (MC.8a a MC.8d). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

- **`docs/DECISIONS/019-limites-por-rol.md`**: nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa.

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c, ADR 018) · 2026-07-01

Tercer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva función pura **`construirDesgloseNecesidades(compromisos)`** en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual equivalente), ordenadas de mayor a menor. Es una vista de **solo lectura**: no mueve dinero, no crea schema; cada obligación se sigue pagando al vencer, exactamente como hoy.

El monto de cada fila usa la misma normalización mensual que ya usa el modelo de distribución (fijo = `monto * factor de frecuencia`, igual que `calcularGastosFijosMensuales`; deuda = `cuotaMensual`, ya mensual), para que el desglose sea coherente con el "Necesidades" agregado que el panel ya mostraba. Los compromisos de baja periodicidad (Anual, Bimestral, etc.) se excluyen, igual que en el agregado.

En la vista, el desglose aparece como un `<details>` colapsable ("Ver detalle (N)") bajo la fila "📦 Necesidades" existente, reusando el patrón visual `.analisis-grupo` (ya usado en Análisis y Límites de gasto) con clases propias (`.distribuir__nec-*`) para no acoplar Mis cuentas al markup de Límites. Cada fila muestra un emoji por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI` de `constants.js`), con fallback genérico por tipo.

11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador: con Arriendo ($800.000), Tarjeta ($250.000) e Internet ($100.000), el detalle los lista en ese orden con sus emojis de categoría. Lint limpio. SW v243 → v244.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseNecesidades()` nueva.
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` computa el desglose; `_renderDesgloseNecesidades()` y `_emojiNecesidad()` nuevas; se inserta en `_renderPanelDistribuir`.
- **`styles/components/forms.css`**: `.distribuir__nec-desglose` + `.distribuir__nec-item*`.
- **`tests/unit/tesoreria.test.js`**: 11 tests nuevos.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo.
- **`service-worker.js`**: v243 → v244.

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b, ADR 018) · 2026-07-01

Segundo slice de la épica MC.7. El panel "Distribuir mi ingreso" ya no arranca con "todo al fondo": cada meta y apartado activo aparece con su **aporte sugerido** (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo de emergencia recibe el **excedente** que queda tras esos aportes. Los objetivos sin fecha muestran $0 y un hint bajo su fila: "Ponle una fecha en Metas/Apartados para calcular cuánto aportar", con enlace a la sección correspondiente. Todo sigue siendo editable, como antes.

`construirPlanAhorro` quedó sin llamadores tras el cambio (era solo el default "todo al fondo") y se **eliminó** junto con sus 5 tests, en vez de dejarla como código muerto. `construirDesgloseAhorroPorObjetivo` (MC.7a) suma el campo `sinFecha` por fila para que la vista sepa cuándo mostrar el hint, sin que `view.js` tenga que re-derivar esa lógica leyendo fechas directamente.

3 unit + 2 E2E nuevos (netos: se sumaron 8 y se quitaron 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit (neto); 73/73 → 75/75 E2E. Verificado en el navegador: con una meta a 6 meses y $1.200.000 de faltante, sugiere $200.000; el fondo (presupuesto $600.000) recibe $400.000 de excedente; una meta sin fecha muestra $0 con el hint. Lint limpio. SW v242 → v243.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` ahora expone `sinFecha` por fila; `construirPlanAhorro()` eliminada (sin llamadores).
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` usa `construirDesgloseAhorroPorObjetivo` directamente sobre `S.metas`/`S.apartados`; `_filaDistribuir` agrega el hint de "sin fecha" con enlace a Metas/Apartados.
- **`styles/components/forms.css`**: `.distribuir-ingreso__destinos .distribuir__hint` (sin margin-top propio, ya lo da el `gap` del contenedor).
- **`tests/unit/tesoreria.test.js`**: 3 tests nuevos de `sinFecha`; se eliminó el describe de `construirPlanAhorro` (5 tests).
- **`tests/e2e/smoke.test.js`**: 2 tests nuevos (aporte sugerido + excedente del fondo; hint de meta sin fecha).
- **`service-worker.js`**: v242 → v243.

---

### feat(tesoreria): desglose de aportes de ahorro por objetivo (MC.7a, ADR 018) · 2026-07-01

Primer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). Nueva función pura **`construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro, hoy })`** en `tesoreria/logic.js`: a diferencia de `construirPlanAhorro` (que hoy sugiere todo el presupuesto al fondo), reparte un aporte sugerido **por cada meta y apartado activo** (faltante entre meses restantes, igual fórmula que `calcularAporteMensualObjetivos`), y el **fondo de emergencia recibe el excedente** que quede tras esos aportes (nunca negativo; 0 si ya está completo). Los objetivos sin fecha sugieren 0 en vez de adivinar (decisión del usuario).

Para no duplicar la fórmula, se extrajo el helper privado `_aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy)` y `calcularAporteMensualObjetivos` se refactorizó para consumirlo (extracción sin cambio de comportamiento, verificada por sus 8 tests existentes que siguen en verde). Esta función aún **no está integrada** en el panel "Distribuir mi ingreso" (eso es MC.7b); es solo la lógica de agregación, pura y testeada en aislamiento.

15 tests nuevos. 1728/1728 → 1743/1743 unit. Lint limpio. SW v241 → v242.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` nueva; `_aporteMensualObjetivo()` helper privado extraído; `calcularAporteMensualObjetivos()` refactorizada para reusarlo.
- **`tests/unit/tesoreria.test.js`**: 15 tests nuevos.
- **`service-worker.js`**: v241 → v242.

---

### docs(adr): ADR 018, "Distribuir mi ingreso" como asistente guiado de 3 pasos (MC.7, diseño) · 2026-07-01

Diseño de la épica MC.7. El panel "Distribuir mi ingreso" ([ADR 012](DECISIONS/012-auto-distribucion-ingresos.md), MC.4a-e) evoluciona a un **asistente guiado** que hace el trabajo pesado y deja al usuario solo revisar, ajustar y confirmar. Tres pasos:

1. **Necesidades** itemizada como **preview read-only** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo, con nombre/categoría/valor). El dinero no se mueve: queda en la cuenta y se paga cada obligación al vencer, como hoy. Sin schema.
2. **Ahorro** con aportes **auto-calculados por objetivo**: para metas/apartados con fecha, `faltante / periodos restantes` (reusa la fórmula de `calcularAporteMensualObjetivos`, pero devolviendo el desglose por objetivo, no solo el total); para los que no tienen fecha, sugiere 0 + hint "ponle una fecha"; el fondo de emergencia recibe el excedente si está incompleto. Todo editable.
3. **Estilo de vida** repartido entre las cuentas activas; **omitido con cuenta única** (regla de cuenta única del proyecto).

Decisiones cerradas con el usuario: (a) Paso 1 = preview, no reservar/apartar (evita schema y no toca el ADN); (b) objetivos sin fecha en el Paso 2 = sugerir 0 con invitación a poner fecha (no adivinar); (c) la implementación arranca por el **Paso 2** (auto-cálculo de Ahorro), el valor "inteligente" más tangible. Confirmación única al final; reusa el apply-plan/undo, el gating por fecha de cobro y los abonos avalancha de MC.4. Sin schema nuevo en v1. Implementación en 6 slices (MC.7a a MC.7f). Solo docs.

- **`docs/DECISIONS/018-asistente-distribuir-ingreso.md`**: nuevo ADR (contexto, 7 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.7 diseño cerrado + slices MC.7a a MC.7f.

---

## Meses anteriores

- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
