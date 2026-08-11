# Tablero - Análisis

> Revisado: 2026-08-11.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `analisis`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Análisis (dominio `analisis`)

> Iniciativa "Análisis v2: rediseño visual" completa ([ADR 038](../DECISIONS/038-analisis-v2-visual.md)): avanzó los puntos 4, 5, 7 y 8 del brief de ANL.1 (reorganización, jerarquía, carga cognitiva, coherencia visual). **ANL.1 hereda el lienzo v2 ya montado:** cuando se inicie, escribe copy y recomendaciones sobre esas cards, no rediseña de cero.

#### ANL.1 - Análisis como centro de interpretación financiera (no solo panel de estadísticas)
- Prioridad  : sin definir
- Estado     : criterio y lenguaje sin decidir. Ver **[ADR 046](../DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md)** (Abierta). No implementar el criterio de permanencia ni el nivel de traducción sin ese ADR resuelto.
- Objetivo   : el usuario considera que Análisis hoy es una gran cantidad de gráficos e indicadores que puede resultar abrumadora para alguien sin conocimientos financieros; pide que Finko explique e interprete, no solo muestre datos.
- Motivo     : pidió analizar la sección completa antes de implementar cualquier cambio, para decidir qué simplificar, reorganizar, unificar o eliminar, sin perder profundidad de análisis.
- Decidido ya: jerarquía de lectura y colapsables → **[ADR 010](../DECISIONS/010-simplificacion-analisis.md)**. Reorganización visual v2 → **[ADR 038](../DECISIONS/038-analisis-v2-visual.md)** (ANL.1 hereda el lienzo ya montado). Motor de recomendaciones accionables (punto 6, punto 10 y el refuerzo P6 de la auditoría) → **[ADR 044](../DECISIONS/044-motor-unico-de-sugerencia-por-categoria.md)**, motor compartido con Límites e Inicio.
- Secciones  : Análisis (dominio `analisis`); transversal por el motor de recomendaciones (ADR 044) y coordinación con CFG.2c (interpretación fiscal) y LG.2 (logros)
- Depende de : ADR 046 resuelto para el criterio de permanencia y el lenguaje; ADR 044 resuelto para las recomendaciones accionables
- Modelo     : ver el ADR correspondiente a cada parte antes de iniciar

---

#### ANL.3 - Cada bloque declara su propio alcance (triaje de la ficha 16, sin implementar)
- Prioridad  : media
- Estado     : **plan, no ejecutado.** Triado 2026-08-10 contra el código real. No depende de ADR 046/044: no toca criterio, lenguaje ni recomendaciones, solo copy y un href.
- Objetivo   : el chip de mes del header ("Agosto 2026") ancla visualmente el periodo de toda la página, pero de los 5 bloques que hay debajo solo "Por categoría" mide ese mes (score mezcla mes+12 meses+fondo; patrimonio es una foto de hoy; tendencia es 12 meses; el monitor de renta es un año). Que cada bloque diga el suyo.
- Secciones  : Análisis (dominio `analisis`)
- Archivos   : `modules/dominio/analisis/view.js` (`renderAnalisis()`, `_renderPatrimonio()`, `_renderTendencia()`), `index.html` (`#analisis-chip-mes`)
- Depende de : nada
- Modelo     : Equilibrado - Bajo/Medio (Sonnet 5). Copy + un `<span>` movido + un href; cero cálculo nuevo, cero componente nuevo.

**Origen**: ficha 16 del handoff de Claude Design (proyecto `f20729a0`, "Auditoría UX/UI móvil", ficha 16 de 18). Decisión de la ficha: **Modificar** (tres cambios de copia, cero fórmula ni componente).

**Verificación contra el código (2026-08-10): las tres correcciones de la ficha son exactas, salvo una.**

| Hallazgo | Severidad (ficha) | Verificado | Nota |
|---|---|---|---|
| Z1 - el chip declara un mes, solo 1 de 5 bloques mide un mes | Crítico | **Confirmado.** `renderAnalisis()` deriva `anio`/`mes` de `hoy()` sin selector ([view.js:148-150](../../modules/dominio/analisis/view.js)); `calcularActivos(cuentas, metas, apartados, inversiones, personales)` no recibe fecha ([logic.js:91](../../modules/dominio/analisis/logic.js)) | sin cambios al plan |
| Z2 - "Por cobrar" e "Inversión" tienen salvedades que la pantalla no dice | Alto | **Confirmado.** `activosDesc` es `buckets.map(b => `${b.label} ${b.pct}%`).join(' · ')`, sin nota ([view.js:719-721](../../modules/dominio/analisis/view.js)); `calcularTotalPorCobrar` filtra `.filter(p => p && p.cuentaId)` ([personales/logic.js:318-321](../../modules/dominio/personales/logic.js)); `calcularTotalInvertido` suma `inv.monto` sin campo de valor de mercado ([infra/portafolio.js:39-45](../../modules/infra/portafolio.js)) | sin cambios al plan |
| Z3 - el aviso de deudas enlaza a "Compromisos", que dejó de ser destino móvil | Medio | **Parcialmente falso.** `#compromisos` **no fue disuelto**: sigue siendo su propia sección, con nav propio (`nav-item--no-mobile` la saca de la barra inferior, pero vive en el menú "Más" en móvil y en el sidebar en escritorio, [index.html:265,1630](../../index.html)). "Por pagar" **no existe** en el código: la ficha asume una fusión de las fichas 05/06/08/15 que no está implementada. Lo que sí es real: la etiqueta visible del link dice **"Compromisos"** (nombre interno) mientras el nav ya usa **"Deudas"** (nombre de producto, [index.html:268](../../index.html)): inconsistencia menor, real, independiente de las otras fichas | **plan corregido**, ver Cambio 3 |

**Plan (una sola rebanada, los tres cambios son copy/link):**

1. **Cambio 1 (Z1):** mover el chip "Agosto 2026" del header (`#analisis-chip-mes`, `index.html`) al rótulo del grupo "A dónde va tu dinero" (`_renderTendencia()`, el único bloque mensual). Agregar una media línea de alcance a los otros tres: "hoy" bajo patrimonio, "últimos 12 meses" en tendencia (el monitor de renta ya dice "año gravable 2026" en su título, sin cambio ahí).
2. **Cambio 2 (Z2):** aviso condicional nuevo en `_renderPatrimonio()`, mismo patrón que `ctaDeudas` (aparece solo si aplica): cuando haya préstamos personales sin `cuentaId`, "Tienes N préstamo(s) que no salió de ninguna cuenta, así que no suma a tu patrimonio", enlace a Me deben. Necesita que `generarResumen()`/`calcularActivos()` expongan el conteo de préstamos excluidos (hoy no lo hacen, solo la suma ya filtrada): pequeño cálculo nuevo, no solo copy.
3. **Cambio 3 (corregido, no Z3 tal cual):** cambiar el texto visible del link de `ctaDeudas` de "Compromisos" a "Deudas" (mismo `href="#compromisos"`, que sigue siendo el destino correcto). Un `_esc`/literal, sin tocar la condición ni el conteo.

**Qué NO se hace (y por qué):** no se reapunta el link a "Por pagar" (no existe); no se toca el monitor de renta K.3 (la propia ficha lo saca de alcance, "merece su propio examen"); no se agrega selector de mes a Análisis (la ficha 16 confirma que la sección está clavada a `hoy()` a propósito, y Z1 pide lo contrario: menos periodos mezclados, no más).

**Decisión abierta:** el Cambio 2 necesita un dato que `calcularActivos()` hoy no devuelve (cuántos préstamos quedaron fuera por falta de `cuentaId`). Antes de implementar, decidir si ese conteo se agrega a `calcularActivos()` (cambia su forma de retorno, con test de regresión) o se deriva aparte en `_renderPatrimonio()` a partir de `S.personales` (rompe el patrón "logic.js hace el cálculo, view.js solo pinta" que el resto del archivo respeta). Recomendado: agregarlo a `calcularActivos()`, mismo criterio que ya sostiene el resto del bucket "Por cobrar" (PE.7).
