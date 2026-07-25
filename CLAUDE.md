# CLAUDE.md - Finko

> Punto de entrada para Claude Code y cualquier asistente de IA al abrir esta carpeta.
> Acá vive la **norma**. Los procedimientos viven en `.claude/skills/`; la referencia, en `docs/`.
> Revisado: 2026-07-24.

---

## 0. Qué es Finko

PWA offline-first de gestión financiera personal para Colombia. Sin servidor, sin cuenta, sin sync: todo vive en `localStorage` (clave `fk_v1`). Vanilla JS con ES6 modules, **sin framework, sin build step, sin TypeScript**. Pensada para personas con poco conocimiento financiero, con normativa colombiana (SMMLV, UVT, GMF).

Versión `v1.0.0`, estable y en producción. La fase actual es post-v1.0: mantenimiento y mejoras por sección, con un backlog que incluye dos decisiones de fondo aún abiertas (sincronización multidispositivo y tarjeta de crédito).

---

## 1. Mapa de documentos

Leer solo lo que la tarea pide. La columna de la derecha evita el error más caro: buscar algo donde no está.

| Documento | Cuándo leerlo | Qué NO buscar ahí |
|---|---|---|
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | siempre, al arrancar: dónde estamos hoy, métricas, últimas 5 tareas | historia, workflow, comandos, runbooks |
| [`docs/BOARD.md`](docs/BOARD.md) | al elegir en qué trabajar | tareas cerradas: se borran al cerrar |
| [`docs/contexto/`](docs/contexto/README.md) | **antes de tocar una sección**: qué piezas la componen, riesgos, pendientes | prioridades, cronología |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | secciones 1 a 12: capas, flujo de datos, EventBus, convenciones técnicas. **Sección 13 (mapa operativo):** sección visible → carpeta → archivos clave, índice de estilos y síntoma → dónde mirar | el inventario archivo por archivo: eso lo responde `ls` |
| [`docs/BUGS.md`](docs/BUGS.md) | errores abiertos, verificados contra el código | sospechas sin verificar: esas son tarjetas |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | qué cambió y cuándo (mes corriente; meses cerrados en `docs/changelog/`) | por qué se decidió algo |
| [`docs/DECISIONS/`](docs/DECISIONS/) | **por qué** se decidió algo, con alternativas rechazadas | estado de avance |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | tarea de UI: tokens, componentes, tipografía | los valores exactos: están en `styles/tokens.css` |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | cómo se propone un cambio y qué se exige antes de commitear | arquitectura, runbooks |
| [`docs/OPERACION.md`](docs/OPERACION.md) | deploy, dominio, constantes anuales, bump del SW, harness de perf | decisiones, estado |
| [`docs/SECURITY.md`](docs/SECURITY.md) | **obligatorio antes de tocar dependencias** | otras operaciones |
| [`README.md`](README.md) | cara pública y **la única lista de comandos** | reglas del proyecto |

---

## 2. Workflow obligatorio

Reglas del usuario. Aplican siempre, sin pedirlas en cada sesión.

**Una tarea a la vez.** No saltar al paso siguiente sin que la tarea activa esté verificada en la app y commiteada. La tarjeta "En proceso" no se abandona por ideas nuevas.

**Toda idea nueva pasa por triaje antes de implementarse:** ¿ya existe?, ¿modifica algo aprobado?, ¿se integra a una iniciativa?, ¿depende de algo?, ¿se difiere? Tres reglas siempre activas: **continuidad** (no cambiar de frente a mitad de tarea), **fuente única** (una funcionalidad, una sola entrada canónica en el tablero) y **nunca revertir un ADR en silencio** (se dice y se decide con el usuario). El procedimiento completo: skill `triaje-tarea`.

**Al cerrar, reportar para supervisar en la app**, en este orden: (1) qué archivos cambiaron, (2) qué cambió en cada uno, (3) cómo verificarlo en la app paso a paso, (4) qué tests lo cubren. Alcance honesto: lo que quedó fuera se dice.

**El cierre de documentos y las compuertas de verificación:** skill `cerrar-tarea`. Es el punto único de ejecución; no se improvisa la secuencia.

**Confirmar antes de cambios destructivos.** Eliminar archivos, force push, reescribir historial o borrar tests existentes: siempre confirmar antes.

### Área responsable: Design vs. Code

La clasificación depende de **qué cambia la tarea, no del nombre de la tarea**:

- **Design:** cambios visuales, UX/UI, estilos, assets, interacción visual.
- **Code:** lógica, datos, arquitectura, eventos, almacenamiento, cálculos, tests.
- **Ambos:** cuando cambia experiencia y lógica a la vez.

**El ADR es el único sobreviviente del handoff de diseño:** un mockup de Claude Design deja de mandar en cuanto su ADR se acepta; lo que queda como fuente de verdad es el ADR, no el archivo de diseño. Plantilla de tarjeta y detección de mala asignación: skill `triaje-tarea`.

### Estándar de comunicación

Vigente desde 2026-07-25. Aplica a **toda respuesta en chat**, con cualquier interlocutor. Sustituye por completo la versión anterior de este bloque y deroga el "Bloque de cierre bajo demanda".

**Estilo Carver Nicola: decisiones antes que explicaciones.** Escribir para acelerar la siguiente decisión, no para demostrar conocimiento. Una idea fuerte vale más que diez explicaciones.

- No narrar el razonamiento. No repetir contexto ya conocido. No resumir lo que el usuario acaba de pegar.
- Si una frase no cambia una decisión, se elimina.
- Párrafo que pueda ser viñeta, se convierte. Viñeta que pueda ser una línea, se convierte.
- **8 a 12 líneas por sección** como techo. Sin introducciones ni conclusiones de relleno.
- Dos soluciones válidas: recomendar **una** y justificar en una frase.
- Código citado solo si sostiene la afirmación. Tablas solo si mejoran la comprensión.
- Objetivo de longitud: **~60 % más corto** que el estándar anterior, sin perder información útil.
- Al detectar que la respuesta se está alargando: detenerse y condensar antes de responder.

**Prohibido cerrar la respuesta con:** prompt para la siguiente tarea, modelo recomendado, programa recomendado (Claude Code o Claude Design) o nivel de esfuerzo. Esas decisiones son del usuario. El bloque `Próximo paso` queda derogado como formato de cierre.

**Excepción:** documentación permanente (ADR, especificación, documentación técnica, entregable que queda en el repo). Ahí manda la plantilla del documento. El **reporte de cierre de tarea** (arriba en esta misma sección) conserva su estructura.

### Criterio ante dos soluciones válidas

Gana la que **sigue una convención ya escrita en el archivo que se está tocando**, aunque sea menos sofisticada. Concepto nuevo (estructura, patrón o cálculo) solo si resuelve algo que la convención existente no cubre. Menos líneas y menos vocabulario nuevo es mejor diseño, no atajo.

---

## 3. Antes de explorar el proyecto

Consultar la **sección 13** de [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (ubicación gruesa por dominio y tabla síntoma → dónde mirar) y la ficha de la sección en [`docs/contexto/`](docs/contexto/README.md). Solo recorrer el proyecto desde cero si el bloque no existe o quedó desactualizado (campo `Verificado contra` + `git log` sobre los archivos que lista).

Si no existe, el primer paso de la tarea es el análisis profundo y **escribir el bloque antes de codificar**. Cada funcionalidad se analiza a fondo una sola vez.

---

## 4. Reglas innegociables (ADN)

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
11. **Lenguaje humano, neutral y profesional** - claro y sin jerga, pero serio y accesible para cualquier edad. Voz "tú" (tuteo, no voseo ni usted), "dinero" (no "plata"). Ej: "Tu dinero disponible hoy" antes que "Saldo disponible". Ver [ADR 003](docs/DECISIONS/003-tono-neutral-profesional.md).
12. **Constantes legales con fecha de revisión** - SMMLV, UVT y auxilio de transporte (anuales). Los indicadores de alta frecuencia (ej. usura trimestral) quedan fuera del alcance por costo de mantenimiento (ver [ADR 004](docs/DECISIONS/004-eliminar-tasa-usura.md)).

Tocar cualquiera de estas reglas requiere un ADR en `docs/DECISIONS/` y discusión explícita.

---

## 5. Convenciones

- **Imports:** siempre con `.js`, rutas relativas (`../core/state.js`).
- **Commits:** `tipo(área): descripción`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `a11y`. Cuerpo en ASCII sin acentos.
- **Commit y push autónomos:** no se pide permiso, pero solo con las compuertas en verde.
- **Naming:** dominios en español (`ingresos`, `compromisos`); infra y ui en inglés (`state`, `actions`).
- **Tests verdes obligatorios** antes de cada commit.
- **CSS:** solo `var(--fk-*)`, nunca hardcodear colores ni tamaños.

---

## 6. Estilo de escritura

Aplica a **todo texto** del proyecto: respuestas en chat, commits, comentarios de código, documentación, microcopy de UI, mensajes de error, tests y scripts.

**Prohibidos el guion largo (U+2014) y el guion medio (U+2013).** Se nombran por codepoint a propósito: escribirlos acá para prohibirlos haría que este archivo los contenga y la regla no podría verificarse.

| Para | Usar | Ejemplo |
|---|---|---|
| Pausa o aclaración | `:` | "Resumen: 2981 tests verdes." |
| Apertura de explicación | `.` | "App estable. Modo mantenimiento." |
| Inciso corto | `(...)` | "El SMMLV (vigente 2026) es $1.750.905." |
| Conector de continuación | `-` | "Fase 2 - purga del tablero." |
| Rango numérico | `-` o "a" | "30-90 min" / "30 a 90 min" |
| Separador visual | `,` | "Calidad primero, ahorro segundo." |

**Excepción única:** los guiones largos que vengan en datos del usuario por copy/paste externo (ej. un CSV importado) se preservan tal cual. La regla aplica a lo que escribimos nosotros.

**Estado:** limpieza terminada, cero U+2014 y U+2013 en archivos trackeados. La verificación es la compuerta 3 de la skill `cerrar-tarea`.

---

## 7. Comandos

Lista completa y de uso diario: [`README.md`](README.md) y `package.json`. **No abrir `index.html` directo:** los ES6 modules necesitan servidor HTTP.
