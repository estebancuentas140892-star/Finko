# CLAUDE.md - Finko Claude

> **Este archivo es el punto de entrada para Claude Code (y cualquier asistente IA) al abrir esta carpeta.**
> Última revisión: 2026-07-05

---

## 0. Estado del proyecto

**Versión:** `v1.0.0` - estable, completa, lista para usar.
**Tag git:** `v1.0.0`
**Próxima fase:** post-v1.0 (deploy, mejoras opcionales, mantenimiento).

Ver:
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) → qué se hizo en cada fase/tarea ya cerrada.
- [`docs/BOARD.md`](docs/BOARD.md) → tablero Kanban: tarea en proceso + pendientes agrupados por sección de la app.
- [`docs/contexto/`](docs/contexto/README.md) → fichas técnicas por sección: dónde vive cada funcionalidad, riesgos, estado, pendientes.
- [`docs/BUGS.md`](docs/BUGS.md) → registro de errores conocidos, con archivo/función/línea exactos.

---

## 1. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia.
Sin servidor. Sin cuenta. Sin sync. Todo vive en `localStorage`.
Vanilla JS + ES6 modules. **Sin framework, sin build step, sin TypeScript.**

Estructura de carpetas (resumen):

```
index.html            → shell + estructura HTML completa
manifest.json         → PWA manifest
service-worker.js     → cache-first offline
styles/               → CSS por capa (@layer)
modules/
  core/               → state.js, storage.js, constants.js
  infra/              → utils, render, a11y, crud, router, financiero, cuenta-helper, icons...
  ui/                 → bootstrap, shell, actions, modales, onboarding, proposito...
  dominio/            → 18 carpetas (agenda, ahorro, analisis, apartados, compromisos,
                        gastos, tesoreria, metas, presupuesto, inversiones... detalle en
                        docs/ARCHITECTURE.md sección 2.4)
tests/
  unit/               → Vitest + happy-dom (lógica pura)
  e2e/                → smoke tests Playwright
scripts/              → gen-icons.py, lighthouse.js
docs/                 → ARCHITECTURE, BOARD, BUGS, CHANGELOG, etc.
```

---

## 2. Workflow obligatorio del coaching

> Estas reglas son del usuario. Aplican **siempre**. No hay que pedirlas en cada sesión.

### 2.1 Una tarea/fase a la vez

- No saltar al "siguiente paso" sin que la tarea activa esté **verificada en la app** y commiteada.
- **Dividir lo grande:** si una tarea es muy grande o toca varios dominios o capas a la vez (lógica, vista, estilos, datos, accesibilidad, tests), partirla en subtareas que se puedan desarrollar y verificar de forma independiente. Cada subtarea es una tarjeta propia en el BOARD, encadenada con "Depende de", y se empieza por el subset más pequeño que tenga sentido.
- **Unificar duplicados:** antes de crear una tarjeta en el BOARD, buscar tarjetas existentes sobre la misma funcionalidad, sección o componente. Si comparten objetivo o modifican la misma parte del sistema, consolidarlas en una sola tarjeta completa: la más completa absorbe a las demás, cero duplicados.

### 2.2 Reportar cambios para supervisar en la app

Al cerrar una tarea **siempre** decir, en este orden:

1. **Qué archivos cambiaron** (rutas relativas).
2. **Qué cambió en cada uno** (1-2 líneas por archivo).
3. **Cómo verificarlo en la app** - paso a paso: ruta visual, sección, modal, botón. Si requiere `python -m http.server 8080` o algún script, decirlo.
4. **Qué tests cubren el cambio** (si aplica).

### 2.3 Cierre obligatorio de cada conversación

**Obligatorio:** al final de **toda** respuesta (tarea cerrada, exploración, pregunta, ajuste pequeño - lo que sea) incluir el bloque `Próximo paso`. No omitirlo nunca, ni siquiera si la respuesta es corta. Si no hay tarea siguiente clara, proponer la más razonable del [`docs/BOARD.md`](docs/BOARD.md) y, si hay duda real, pedir input al usuario dentro del mismo bloque.

**Formato exacto (copiar tal cual, solo cambian los valores):**

```
─── Próximo paso ──────────────────────────────────
Tarea siguiente : <título corto>
Modelo sugerido : <Haiku 4.5 | Sonnet 5 - <nivel> | Opus 4.8 - <nivel> | Fable 5 - <nivel>>
Por qué         : <una línea justificando modelo+nivel>
───────────────────────────────────────────────────
```

**Orden de prioridad al elegir modelo + nivel (regla del usuario, 2026-07-02):** la calidad del resultado manda siempre, en especial en programación. Nunca sacrificar calidad de código, razonamiento, arquitectura o confiabilidad para ahorrar tokens.

1. Elegir el modelo con mayor probabilidad de entregar la mejor solución para la tarea.
2. Si dos modelos ofrecen prácticamente el mismo nivel de calidad, preferir el más eficiente en tokens.
3. Ajustar el nivel de esfuerzo solo cuando haga falta: no usar uno superior sin razón, pero tampoco recortar si compromete el resultado.
4. No usar un modelo excesivo para una tarea simple, pero tampoco uno insuficiente para ahorrar tokens si eso puede afectar la solución.

La optimización de tokens es el criterio de desempate, nunca el criterio principal.

**Escala de modelos (familia Claude 5, revisada 2026-07-02):**

- **Haiku 4.5:** tareas rápidas y sencillas; prioriza velocidad.
- **Sonnet 5:** equilibrio rendimiento/costo; el caballo de batalla del día a día.
- **Opus 4.8:** trabajo complejo que requiere razonamiento profundo.
- **Fable 5:** máximo razonamiento; proyectos extensos, decisiones críticas, agentes de larga duración. Sujeto a límites de uso más estrictos.

**Combinaciones válidas modelo + nivel** (no inventar otras, no mezclar):

| Modelo      | Niveles permitidos                            |
|---          |---                                            |
| Haiku 4.5   | (sin nivel: siempre se escribe `Haiku 4.5`)   |
| Sonnet 5    | Bajo · Medio · Alto                           |
| Opus 4.8    | Alto · Extra                                  |
| Fable 5     | Alto · Extra · Max                            |

**Cuándo usar cada combinación.** Objetivo: **ahorrar tokens sin sacrificar calidad de código**. Ante la duda, subir un escalón antes que bajarlo: la calidad nunca se sacrifica.

| Combinación           | Cuándo usarla                                                                                              |
|---                    |---                                                                                                          |
| **Haiku 4.5**         | Verificación de tests verdes, lint, scripts triviales, renombres mecánicos, bumps de constantes (E.1/E.2), leer y reportar sin decisiones. |
| **Sonnet 5 - Bajo**   | CSS aislado, ajuste de copy, fix puntual con causa ya identificada, doc update; < 30 min, 1-2 archivos.    |
| **Sonnet 5 - Medio**  | Trabajo cotidiano: feature nueva en un solo dominio siguiendo patrón ya existente; 30-90 min, 3-6 archivos, tests nuevos. Punto de partida si hay duda. |
| **Sonnet 5 - Alto**   | Feature que toca varios dominios o introduce patrones de UI/datos nuevos; refactor acotado, debugging con pista clara, revisión de código; 90 min - media jornada. |
| **Opus 4.8 - Alto**   | Bug sutil en lógica financiera (regla 72, sistema francés, EA↔mensual, retenciones), nueva lógica financiera CO no trivial, debugging sin pista clara. |
| **Opus 4.8 - Extra**  | Decisión arquitectural acotada: bump de schema con migración, refactor cross-domain, nuevo dominio, tareas largas de varios pasos.  |
| **Fable 5 - Alto**    | Refactor mayor o feature multidominio con trade-offs no obvios y riesgo real de regresión.                 |
| **Fable 5 - Extra**   | Auditoría o análisis de la base de código completa, investigación técnica profunda, trabajo agéntico de larga duración. |
| **Fable 5 - Max**     | Reescritura de subsistema crítico, debugging extremo sin pista, cambio que roza el ADN (requiere ADR).     |

**Regla práctica de escalado:** empezar con el modelo más sencillo que pueda resolver la tarea. Si falta profundidad, subir primero el **nivel de esfuerzo** dentro del mismo modelo; solo cuando el alcance supere al modelo, saltar al siguiente (Haiku → Sonnet → Opus → Fable).

**Regla de oro:** una sola tarea por respuesta. El bloque `Próximo paso` define qué se hace **después de verificar y commitear lo actual**, no qué se hace **ahora**. Si el usuario pide encadenar tareas, recordar esta regla y proponer hacer la primera, verificar en la app, y recién después la segunda.

### 2.4 Mantenimiento de los docs

Cuando una tarea/fase se completa, actualizar **en este orden**:

1. **`docs/contexto/<sección>.md`** - actualizar el bloque de la funcionalidad tocada: estado actual, cambios realizados/pendientes y `Verificado contra` con el commit nuevo. Si el bloque no existía, crearlo (ver sección 2.6).
2. **`docs/HANDOFF.md`** - sección "Qué se hizo recientemente": agregar la tarea cerrada al tope de la lista (mantener solo las últimas 5); actualizar "Qué sigue" si cambió el orden de prioridades. Este archivo es el punto de entrada para cualquier asistente o colaborador nuevo.
3. **`docs/CHANGELOG.md`** - agregar la entrada bajo "Mes corriente" con fecha, archivos tocados y, si aplica, qué funcionalidades podría afectar y qué validación queda pendiente. Al cambiar de mes calendario: mover el mes recién cerrado a `docs/changelog/YYYY-MM.md` (crear el archivo con el mismo formato que los existentes) y agregarlo al índice "Meses anteriores".
4. **`docs/BOARD.md`** - borrar la tarjeta de la tarea completada (de "En proceso" o de "Pendientes"). El tablero nunca conserva tarjetas cerradas.
5. **`docs/BUGS.md`** - si la tarea solucionó un error registrado, borrar su entrada y referenciar el ID en el CHANGELOG.
6. Si la tarea introduce convenciones nuevas → actualizar `docs/ARCHITECTURE.md` o `docs/CONTRIBUTING.md`.

**Regla:** BOARD.md siempre muestra solo lo **pendiente**, agrupado por sección de la app. CHANGELOG es la memoria histórica. HANDOFF.md es el contexto vivo para retomar trabajo rápido. BUGS.md solo contiene errores sin resolver.

### 2.5 Confirmar antes de cambios destructivos

Eliminar archivos, force push, reescribir historial, borrar tests existentes → **siempre** confirmar con el usuario antes.

### 2.6 Contexto técnico por funcionalidad (`docs/contexto/`)

Objetivo: cada funcionalidad se analiza a fondo **una sola vez**; el resultado queda escrito y las sesiones futuras lo reutilizan. Reglas completas y plantilla en [`docs/contexto/README.md`](docs/contexto/README.md).

- **Antes de analizar:** consultar [`docs/MAPA.md`](docs/MAPA.md) (ubicación gruesa por dominio) y la ficha de la sección en `docs/contexto/` (detalle por funcionalidad). Solo recorrer el proyecto desde cero si el bloque no existe o quedó desactualizado (campo `Verificado contra` + `git log` sobre los archivos listados).
- **Primera vez sobre una funcionalidad:** análisis exhaustivo (archivos, funciones, estilos, recursos gráficos, dependencias, relaciones, riesgos) y escribir el bloque en la ficha **antes** de codificar. Este análisis inicial admite un modelo de mayor capacidad si la complejidad lo justifica; las iteraciones siguientes, con ficha vigente, usan el modelo más eficiente que mantenga la calidad (sección 2.3).
- **Localización:** el ancla primaria es el nombre de función/export/clase CSS/`data-action`; la línea es referencia orientativa, nunca dependencia absoluta.
- **Al cerrar la tarea:** actualizar el bloque como paso 1 de la secuencia de la sección 2.4.

---

## 3. Reglas innegociables (ADN)

1. **Vanilla JS sin build step** - no agregar bundlers, TS, frameworks.
2. **Offline-first** - el SW garantiza operación sin red.
3. **Sin servidor** - solo `localStorage` (clave `fk_v1`).
4. **Singleton `S` mutable** - no reactivity, no proxies.
5. **`save()` debounced 200ms** - nunca escribir a `localStorage` directo.
6. **Migraciones idempotentes** - cada bump de schema sube datos sin romper.
7. **Cero `onclick=""`** - todo vía `data-action` delegado en `actions.js`.
8. **Cero `window.X`** - todo `export` + `import`.
9. **`logic.js` sin DOM** - funciones puras, testeables en happy-dom/Node.
10. **Ningún dominio importa a otro** - comunicación por EventBus.
11. **Lenguaje humano, neutral y profesional** - claro y sin jerga, pero serio y accesible para cualquier edad. Voz "tú" (tuteo, no voseo ni usted), "dinero" (no "plata"). Ej: "Tu dinero disponible hoy" antes que "Saldo disponible". Ver [`docs/DECISIONS/003-tono-neutral-profesional.md`](docs/DECISIONS/003-tono-neutral-profesional.md).
12. **Constantes legales con fecha de revisión** - SMMLV, UVT y auxilio de transporte (anuales). Los indicadores de alta frecuencia (ej. usura trimestral) quedan fuera del alcance por costo de mantenimiento (ver [`docs/DECISIONS/004-eliminar-tasa-usura.md`](docs/DECISIONS/004-eliminar-tasa-usura.md)).

Tocar cualquiera de estas reglas requiere un ADR en `docs/DECISIONS/` y discusión explícita.

---

## 4. Comandos esenciales

```bash
# Servir la app (NO abrir index.html directo - ES6 modules requieren HTTP)
python -m http.server 8080

# Tests unitarios (happy-dom)
pnpm test               # cifra vigente en docs/HANDOFF.md sección 2
pnpm run test:watch
pnpm run coverage       # umbral 90% sobre capa lógica

# E2E (Playwright + Chromium)
pnpm run test:e2e       # suites vigentes en docs/HANDOFF.md sección 2
pnpm run test:e2e:ui

# Lighthouse (requiere servidor en :8080 corriendo)
pnpm run lighthouse     # → coverage/lighthouse-report.html

# Lint
pnpm run lint
pnpm run format
```

---

## 5. Antes de tocar código, leer

1. **Este archivo** (estás aquí) - 3 min.
2. [`docs/HANDOFF.md`](docs/HANDOFF.md) - qué se hizo recientemente, qué sigue, cómo trabajamos - 2 min.
3. [`docs/BOARD.md`](docs/BOARD.md) - tarea en proceso hoy + pendientes por sección.
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - capas, flujo de datos, reglas - 10 min.
5. [`docs/MAPA.md`](docs/MAPA.md) - índice sección visible → carpeta → archivos clave → estilos → test, y tabla síntoma → dónde mirar. Consultar primero ante cualquier bug o duda de "¿dónde vive esto?".
6. [`docs/contexto/`](docs/contexto/README.md) - ficha técnica de la sección a tocar (si existe): piezas exactas, riesgos, pendientes. Evita re-explorar lo ya analizado (sección 2.6).
7. [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) - patrones de código, convenciones, qué NO hacer.
8. [`docs/SECURITY.md`](docs/SECURITY.md) - **obligatorio si vas a tocar dependencias o setup de entorno** (política anti-malware npm, migración a pnpm, audits previos).
9. Si la tarea es de dominio nuevo → [`docs/FINANCIAL_LOGIC_CO.md`](docs/FINANCIAL_LOGIC_CO.md) cuando exista.

---

## 6. Convenciones rápidas

- **Imports:** siempre con `.js`, rutas relativas (`../core/state.js`).
- **Commits:** `tipo(área): descripción`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`.
- **Naming:** dominios en español (`ingresos`, `compromisos`); infra/ui en inglés (`state`, `actions`).
- **Tests verdes obligatorios** antes de cada commit.
- **CSS:** solo `var(--fk-*)`, nunca hardcodear colores ni tamaños.

---

## 7. Estilo de escritura (obligatorio)

> Estas reglas aplican a **todo texto** generado en el proyecto: respuestas en chat, commits, comentarios de código, documentación (`.md`), microcopy de UI, mensajes de error, alertas, nudges, tests, scripts.

### 7.1 Prohibido el guion largo `-` (em dash, U+2014)

**Nunca** usar el carácter `-` en ningún texto del proyecto. Tampoco usar `-` (en dash, U+2013) ni variantes Unicode similares.

**Por qué:** confunde lectores, no se escribe con teclado estándar en español/inglés, no copia/pega bien entre editores y terminales, y rompe el tono natural del proyecto.

**Qué usar en su lugar** (en orden de preferencia):

| En vez de `-` | Usar | Ejemplo |
|---|---|---|
| Pausa o aclaración | `:` (dos puntos) | "Resumen: 702 tests verdes." |
| Apertura de explicación | `.` (punto y aparte) | "App estable. Modo mantenimiento." |
| Inciso corto | `(...)` (paréntesis) | "El SMMLV (vigente 2026) es $1.750.905." |
| Conector de continuación | `-` (guion simple) | "Sonnet 4.6 - Alto." |
| Rango numérico | `-` (guion simple) o "a" | "30-90 min" / "30 a 90 min" |
| Separador visual | `,` (coma) | "Calidad primero, ahorro segundo." |

### 7.2 Cómo verificarlo

Antes de commitear cualquier texto nuevo, buscar `-` en los archivos modificados:

```bash
grep -rn "-" archivo.md       # debe devolver 0 líneas
grep -rn $'-' archivo.md # alternativa explícita
```

En VS Code: `Ctrl+F` con el carácter `-` pegado al campo de búsqueda.

### 7.3 Excepción única

Los `-` que aparezcan en datos de usuario provenientes de copy/paste externo (por ejemplo, un import CSV con notas que contienen guiones largos) **se preservan tal cual**. La regla aplica a texto que escribimos nosotros, no a contenido del usuario.

### 7.4 Limpieza progresiva

Los archivos existentes (`HANDOFF.md`, `CHANGELOG.md`, `CLAUDE.md`, etc.) tienen `-` heredados. **No es obligatorio limpiarlos de golpe**: cuando se toque un archivo `.md` por otra razón, aprovechar para reemplazar los `-` por la alternativa correcta. En texto nuevo, la regla es estricta: cero `-`.
