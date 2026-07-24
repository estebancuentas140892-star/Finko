# MIGRACION.md - contrato de la reorganización documental

> **Archivo temporal de trabajo.** Nace con la auditoría documental del 2026-07-24 (7 agentes) y **se borra al cerrar la Fase 5**. No cuenta para los techos de tamaño: no es documentación del proyecto, es el contrato de una migración.
>
> **Estado:** dirección general aprobada por Esteban el 2026-07-24, con 6 ajustes incorporados en este archivo. **Fase 2 no iniciada.** Ningún archivo ha sido borrado, movido ni fusionado todavía.

## Índice

| Sección | Contenido |
|---|---|
| 1 | Ajustes aprobados y su cascada sobre la propuesta |
| 2 | Decisión de nombres: inglés vs español, con impacto medido |
| 3 | Arquitectura final (árbol) |
| 4 | Contrato por documento (propósito, entra, no entra, techo) |
| 5 | Los 11 principios de organización |
| 6 | Tabla de trazabilidad completa (89 archivos) |
| 7 | Plan de fases revisado |
| 8 | Riesgos y validaciones |
| 9 | Decisiones abiertas |

---

## 1. Ajustes aprobados y su cascada

Los 6 ajustes de Esteban (2026-07-24) y qué cambia cada uno respecto de la propuesta original.

### Ajuste 1: BUGS.md se mantiene separado de ESTADO/HANDOFF

Motivo del usuario: estado actual y deuda/incidencias son conceptos distintos; el archivo de estado debe quedar pequeño y operativo; BUGS.md contiene únicamente incidencias verificadas.

Cascada:
- El archivo de estado **no** absorbe la sección de errores. Su techo baja de 8 KB a **6 KB** (queda más pequeño de lo previsto, que es justo el objetivo del ajuste).
- `BUGS.md` recibe techo propio de **6 KB** y una regla de admisión explícita: entra solo lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un bug: es una tarjeta de investigación en el tablero.
- El estado enlaza a BUGS.md con una línea de conteo (`2 bugs abiertos, ver BUGS.md`), sin copiar los IDs ni su descripción. Un conteo no se desincroniza tan fácil como un resumen, pero igual se actualiza en el mismo commit que toca BUGS.md.
- El ritual de cierre gana un paso **condicional**: tocar BUGS.md solo si la tarea abrió o cerró un bug.
- Efecto en tokens: **favorable**. BUGS.md (4,4 KB) sale de la ruta de lectura rutinaria y pasa a bajo demanda.

### Ajuste 2: CONTRIBUTING.md se mantiene separado, reducido al mínimo

Motivo del usuario: no mezclar gobernanza de trabajo con arquitectura técnica. Contenido permitido: reglas de colaboración, flujo de cambios, validaciones antes de commit.

Cascada:
- La fusión pasa de 3 documentos a 2: `ARCHITECTURE.md` absorbe solo `MAPA.md`. Su techo baja de 25 KB a **20 KB**.
- `CONTRIBUTING.md` baja de 9 KB a **5 KB**. Se queda con: cómo se propone un cambio, una tarea a la vez, ramas y commits, las 4 compuertas antes de commitear, y qué hacer ante un cambio destructivo.
- Lo que **sale** de CONTRIBUTING hacia ARCHITECTURE (porque es técnico, no de gobernanza): convenciones de naming, imports con `.js`, reglas JS/CSS/HTML, patrones a seguir, "qué NO hacer", cómo agregar un dominio. Ahí se corrige de paso el evento `ui:navigate`, que CONTRIBUTING cita y el código no tiene.
- Lo que **sale** de CONTRIBUTING hacia OPERACION: el protocolo anual de SMMLV/UVT (hoy duplicado con HANDOFF §4, enlazándose mutuamente).
- **Frontera con la skill `cerrar-tarea`** (para que no vuelva a haber dos dueños): CONTRIBUTING es dueño del **qué se exige** (las 4 compuertas, una línea cada una, legibles por un humano). La skill es dueña del **cómo se ejecuta** (comandos exactos, orden, plantillas, chequeo de techos). Es el mismo reparto que CLAUDE.md (norma) vs skills (procedimiento). La skill cita la compuerta, no la reimprime.
- Efecto en tokens: **neutro**. CONTRIBUTING no está en la ruta de lectura rutinaria; se lee al dudar de un patrón.

### Ajuste 3: revisar el renombre al español

Ver sección 2 completa. Resultado: **se abandona el renombrado masivo**. Solo los archivos nuevos nacen en español.

### Ajuste 4: CHANGELOG se mantiene como nombre estándar

Motivo del usuario: la reorganización debe resolver duplicidad y tamaño, no cambiar una convención ampliamente reconocida.

Cascada (la más profunda de las seis):
- **Desaparece la carpeta `docs/historia/`** de la propuesta. Se conserva el mecanismo actual, que ya funciona: `docs/CHANGELOG.md` es el mes corriente más el índice de meses anteriores; `docs/changelog/YYYY-MM.md` son los meses cerrados.
- Ya no hay 3 archivos que mover ni un `historia/README.md` que crear: el índice vive en la cabecera de CHANGELOG.md, donde ya está hoy.
- **`docs/archive/` se conserva** (cambio respecto de la propuesta original, que lo disolvía). Con `changelog/` reservado a la cronología mensual, meter ahí un plan maestro superado rompería su propia regla de nombrado. Contrato nuevo y explícito: `changelog/` = cronología por mes; `archive/` = documentos completos superados, con nota de archivado y motivo. Cero migración, cero riesgo, y `REDESIGN_2026.md` ya es el ejemplo bien hecho.
- Lo que **sí** se conserva del plan original: el techo (**60 KB** para el mes corriente como fusible; el formato nuevo da ~35 KB/mes), el formato de **una fila por tarea desde 2026-08**, y que los meses cerrados quedan **congelados** (nunca se reescriben).
- Riesgo que reaparece: la rotación mensual sigue siendo un paso manual (el original lo eliminaba escribiendo directo al archivo del mes). Mitigación: la skill `cerrar-tarea` verifica en cada cierre si el mes de la última entrada es distinto del mes actual y, si lo es, rota antes de escribir. Se deja de depender de recordarlo.
- Efecto en tokens: **neutro**. La historia nunca estuvo en la ruta de lectura rutinaria.

### Ajuste 5: principio nuevo de vigencia

Texto aprobado: *"Todo documento activo debe tener revisión de vigencia. Los documentos con más de 90 días sin modificación deben validarse antes de considerarse fuente de verdad."*

Cascada:
- Entra como **principio 11** (sección 5), con mecánica verificable por comando y sello `Revisado:` en los documentos activos.
- Se alinea deliberadamente con el principio 10 (revisión trimestral): mismo período de 90 días, así que la revisión trimestral **es** el barrido de vigencia. No son dos rituales.
- Alcance: solo documentos **activos** (raíz, `docs/` raíz, `contexto/`, skills). Quedan fuera por naturaleza inmutable o gate externo: `DECISIONS/`, `changelog/`, `archive/`, `legal/`.
- Estado hoy (medido con el comando de la sección 5): **ningún documento activo pasa de 90 días**. El más antiguo es `docs/SETUP_DOMINIO.md` (2026-05-19, 66 días), que además se absorbe en OPERACION.md. Le siguen `README.md`, `CONTRIBUTING.md` y `SECURITY.md` (2026-07-02, 22 días). El primer vencimiento real caería alrededor del **2026-08-17**.
- Hallazgo del propio comando: los archivos **sin trackear son invisibles** a la verificación de vigencia (`AGENTS.md` y `SKILL.md` no aparecen). Un argumento más para trackearlos en la Fase 2.

### Ajuste 6: tabla de trazabilidad antes de cualquier borrado o fusión

Este archivo la contiene (sección 6), con los 89 archivos y las columnas pedidas: archivo actual → nuevo destino → acción → motivo.

---

## 2. Decisión de nombres: inglés vs español

### El criterio

Un nombre de archivo cumple tres funciones: lo encuentra una herramienta, lo reconoce un humano, y lo adivina un agente que no tiene el mapa cargado. Renombrar solo se justifica si mejora alguna de las tres más de lo que cuesta.

### Comparación, con impacto medido

Las referencias se contaron con `grep` sobre los 89 `.md`. "En historia congelada" son menciones dentro de CHANGELOG.md y `changelog/`, que por el principio 7 **nunca se reescriben**: un renombre las convierte en enlaces muertos permanentes.

| Archivo hoy | Nombre español propuesto | Función externa del nombre | Refs vivas | Refs en historia congelada | Recomendación |
|---|---|---|---|---|---|
| `CLAUDE.md` | (no aplica) | Claude Code lo carga por nombre fijo | - | - | **Inmovible** |
| `AGENTS.md` | (no aplica) | Convención que buscan otras herramientas de IA | - | - | **Inmovible** |
| `README.md` | (no aplica) | GitHub lo renderiza en la portada del repo | - | - | **Inmovible** |
| `CHANGELOG.md` | `historia/` | Keep a Changelog; generadores de release notes | 48 | (es la historia) | **Conservar** (ajuste 4) |
| `docs/CONTRIBUTING.md` | (se fusionaba) | GitHub lo enlaza al abrir issue/PR: lo busca en raíz, `.github/` **o `docs/`** | 5 | 11 | **Conservar** |
| `docs/SECURITY.md` | (se mantenía) | GitHub lo publica como política de seguridad del repo (misma búsqueda en `docs/`) | 2 | 1 | **Conservar** |
| `docs/ARCHITECTURE.md` | `ARQUITECTURA.md` | Sin función automática, pero convención muy reconocida | 14 | 7 | **Conservar** |
| `docs/BOARD.md` | `TABLERO.md` | Ninguna | 56 | 113 | **Conservar** |
| `docs/HANDOFF.md` | `ESTADO.md` | Ninguna | 16 | 21 | **Conservar** (ver nota) |
| `docs/BUGS.md` | (se fusionaba) | Ninguna | 3 | 8 | **Conservar** (ajuste 1) |
| `docs/DESIGN_SYSTEM.md` | (se mantenía) | Ninguna, pero ya establecida en 6 ADRs | 9 | 14 | **Conservar** |
| `docs/DECISIONS/` | (se mantenía) | Convención ADR (`docs/adr`, `docs/decisions`) | 42 archivos + cientos de enlaces | muchas | **Conservar** |
| `docs/MAPA.md` | (ya en español) | Ninguna | 6 | 11 | Desaparece por fusión, no por renombre |
| (nuevo) | `OPERACION.md` | Ninguna | 0 | 0 | **Español**: coherente con `MAPA`, `contexto/`, `legal/` |

### Evaluación por eje

**Herramientas externas y GitHub.** El repo está en GitHub (`github.com/estebancuentas140892-star/Finko`). Cuatro nombres tienen comportamiento real, no estético: `README.md` (portada), `CONTRIBUTING.md` (GitHub lo ofrece al abrir issues y PRs), `SECURITY.md` (política de seguridad del repo) y `CHANGELOG.md` (convención que leen humanos y generadores de notas de versión). GitHub busca CONTRIBUTING y SECURITY en la raíz, en `.github/` o en `docs/`, así que la ubicación actual ya es válida: renombrarlos a español **apaga** una función que hoy existe, sin ganar nada.

**Agentes.** Un agente con `CLAUDE.md` cargado encuentra cualquier nombre porque la tabla de documentos se lo dice. El problema son los agentes **sin** ese mapa: un subagente con encargo estrecho, otra herramienta de IA, o una sesión que arranca comprimida. Ahí el prior de entrenamiento pesa: `ARCHITECTURE.md` y `CHANGELOG.md` se adivinan; `ARQUITECTURA.md` e `historia/` se buscan. El costo es pequeño pero es real y es permanente.

**Mantenimiento futuro.** Aquí está el argumento decisivo, y es cuantitativo: renombrar `BOARD.md` obliga a editar **56 referencias vivas** y deja **113 enlaces muertos** dentro de historia que por principio no se reescribe. `HANDOFF.md`: 16 vivas y 21 muertas. El precedente existe y es incómodo: el CHANGELOG ya arrastra 5 enlaces muertos a `TASKS.md`, un archivo retirado. Multiplicar eso por 30 para ganar un matiz semántico es mal negocio.

**El contraargumento honesto, y por qué no alcanza.** El nombre orienta la conducta: "HANDOFF" invita a narrar el traspaso, "ESTADO" invita a declarar hechos. Es cierto. Pero ese efecto se consigue **gratis** con una línea de contrato en la cabecera del archivo, que además es más precisa que un nombre:

```markdown
> Este archivo responde una sola pregunta: dónde estamos hoy.
> NO contiene: historia (CHANGELOG), workflow (CLAUDE.md), comandos (README), runbooks (OPERACION), arquitectura (ARCHITECTURE), bugs (BUGS.md).
> Techo: 6 KB.
```

El contrato hace el trabajo pedagógico que se le pedía al nombre, cuesta 3 líneas y no rompe ni un enlace.

### Recomendación

**Renombrado masivo: descartado.** Se conservan todos los nombres actuales. Los archivos nuevos nacen en español (`OPERACION.md`), coherente con lo que el proyecto ya hace: `MAPA.md`, `contexto/`, `legal/` y los dominios en español; `infra`, `ui`, `state` y los nombres de convención en inglés (regla 6 de CLAUDE.md, que consagra la mezcla deliberada).

Esto extiende el criterio del ajuste 4 a todo el conjunto: **la reorganización arregla duplicidad y tamaño, no nombres.** El ahorro de ~70% en tokens no dependía de ningún renombre; venía del contenido.

Si más adelante se quiere `ESTADO.md`, el momento correcto es el mismo commit que reescribe su contenido, con `git mv`, las 16 referencias vivas actualizadas en el mismo diff y los 21 enlaces de historia aceptados como muertos por escrito. No antes, y nunca en lote con los demás.

---

## 3. Arquitectura final

```
Finko/
├─ CLAUDE.md                        [A] 8 KB   · norma única (techo 12)
├─ AGENTS.md                        [A] 0,3 KB · stub trackeado → CLAUDE.md
├─ README.md                        [B] 4 KB   · cara pública + LA lista de comandos
│
├─ .claude/skills/                  [B] procedimientos, se cargan al invocarse
│   ├─ auditor-finko/SKILL.md            (existe, 10,1 → ~6 KB, se trackea)
│   ├─ cerrar-tarea/SKILL.md             (nuevo)
│   ├─ triaje-tarea/SKILL.md             (nuevo)
│   └─ elegir-modelo/SKILL.md            (nuevo)
│
├─ docs/
│   ├─ HANDOFF.md                   [A] 6 KB  · dónde estamos hoy (nombre conservado)
│   ├─ BOARD.md                     [A] 40 KB · solo pendientes + índice (nombre conservado)
│   ├─ BUGS.md                      [B] 6 KB  · solo incidencias verificadas (ajuste 1)
│   ├─ CHANGELOG.md                 [C] 60 KB · mes corriente + índice (ajuste 4)
│   ├─ ARCHITECTURE.md              [B] 20 KB · capas + mapa + convenciones técnicas
│   ├─ CONTRIBUTING.md              [B] 5 KB  · colaboración, flujo, compuertas (ajuste 2)
│   ├─ DESIGN_SYSTEM.md             [B] 20 KB · tokens y componentes
│   ├─ SECURITY.md                  [B] 8 KB  · política de dependencias
│   ├─ OPERACION.md                 [B] 10 KB · runbooks (nuevo, único nombre español)
│   │
│   ├─ contexto/                    [A/B] 15 fichas, techo 40 KB (objetivo 25)
│   ├─ DECISIONS/                   [B] 42 ADRs intactos + los nuevos de iniciativa
│   ├─ changelog/                   [C] meses cerrados, congelados
│   ├─ archive/                     [C] documentos completos superados
│   └─ legal/                       [D] 11 docs intactos, gate de abogado
│
├─ assets/svg/README.md             [B] 10 KB · absorbe los 2 hijos
└─ scripts/perf/BASELINE.md         [C] 20 KB · junto al harness
```

Tiers: **[A]** contexto vivo (se lee cada sesión, 70 KB duros en total) · **[B]** referencia bajo demanda · **[C]** historia inmutable · **[D]** contenido fuente de la app.

### Conteo, sin maquillaje

| | Hoy | Tras las fusiones | Nota |
|---|---|---|---|
| Raíz | 3 | 3 | AGENTS pasa a stub |
| `.claude/skills/` | 1 | 4 | +3 skills |
| `docs/` raíz | 11 | 9 | MAPA y SETUP_DOMINIO absorbidos, CLAUDE_DESIGNS_PROMPT borrado, +OPERACION |
| `docs/changelog/` | 2 | 2 | +1 al rotar julio |
| `docs/archive/` | 1 | 1 | se conserva (ajuste 4) |
| `docs/contexto/` | 14 | 15 | +sistema-visual |
| `docs/DECISIONS/` | 42 | 42 | +hasta 9 por briefs de iniciativa |
| `docs/legal/` | 11 | 11 | intactos |
| `assets/svg/` | 3 | 1 | 2 hijos absorbidos |
| `scripts/perf/` | 1 | 1 | intacto |
| **Total** | **89** | **89** | hasta ~99 si se escriben los 9 ADRs de iniciativa |

Corrección respecto de la propuesta original, que decía 89 → 88: con BUGS y CONTRIBUTING conservados el neto queda en **89**, y **sube** si los briefs de iniciativa se convierten en ADRs. Está bien: el conteo de archivos nunca fue la métrica.

### La métrica que sí importa

| Métrica | Hoy | Propuesto | Reducción |
|---|---|---|---|
| Contexto permanente (cada llamada al API) | 7.278 tk | ~2.641 tk | **64%** |
| Lectura rutinaria por tarea | 62.093 tk | ~18.400 tk | **70%** |
| **Arranque de tarea completo** | **~69.400 tk** | **~21.000 tk** | **70%** |
| Elegir la próxima tarjeta (índice del tablero) | ~55.000 tk | ~7.000 tk | 88% |
| Copias de la historia por tarea | 4 | 1 + 3 punteros | |
| Copias del ADN | 5 | 1 | |
| Listas de comandos | 5 | 1 + `package.json` | |
| Archivos a editar al cerrar tarea | 6 | 4 (+2 condicionales) | |

Los seis ajustes son **neutros o favorables** para estas cifras: BUGS.md separado saca 4,4 KB de la ruta rutinaria, CONTRIBUTING separado deja ARCHITECTURE más chico, y conservar CHANGELOG y los nombres no toca la ruta de lectura en absoluto. El ahorro nunca dependía de renombrar.

---

## 4. Contrato por documento

Formato: **propósito** (la única pregunta que responde) · **no entra** (lo que se va a otro dueño) · **techo**.

| Documento | Propósito: responde... | No entra | Techo |
|---|---|---|---|
| `CLAUDE.md` | ¿cuál es la norma? | procedimientos, matrices, comandos, árbol de carpetas | 12 KB |
| `AGENTS.md` | ¿dónde está la norma? | todo lo demás | 0,5 KB |
| `README.md` | ¿qué es esto y cómo lo corro? | ADN (enlaza), árbol, métricas | 4 KB |
| `docs/HANDOFF.md` | ¿dónde estamos hoy? | historia, workflow, comandos, runbooks, bugs | 6 KB |
| `docs/BOARD.md` | ¿qué está abierto y con qué prioridad? | narrativa de lo cerrado, briefs, patrones | 40 KB |
| `docs/BUGS.md` | ¿qué está roto y verificado? | sospechas, tareas, historia de bugs cerrados | 6 KB |
| `docs/CHANGELOG.md` | ¿cuándo cambió qué y en qué commit? | análisis, justificaciones, listas de archivos | 60 KB |
| `docs/ARCHITECTURE.md` | ¿cómo funciona y dónde vive? | inventarios archivo por archivo, gobernanza | 20 KB |
| `docs/CONTRIBUTING.md` | ¿cómo se trabaja y qué se exige antes de commitear? | arquitectura, convenciones técnicas, runbooks | 5 KB |
| `docs/DESIGN_SYSTEM.md` | ¿cuál es el catálogo visual y su porqué? | valores de tokens copiados de `styles/tokens.css` | 20 KB |
| `docs/SECURITY.md` | ¿qué se exige antes de tocar dependencias? | otras operaciones | 8 KB |
| `docs/OPERACION.md` | ¿cómo ejecuto una operación fuera de código? | decisiones (ADR), estado | 10 KB |
| `docs/contexto/<sección>.md` | ¿dónde vive esta funcionalidad y con qué riesgos? | la crónica de cada cambio (índice de 1 línea por hito) | 40 KB |
| `docs/DECISIONS/NNN` | ¿por qué se decidió esto? | estado de avance de la implementación | 20 KB |
| `docs/changelog/YYYY-MM.md` | historia congelada de un mes cerrado | cualquier reescritura | 200 KB |
| `docs/archive/*` | documento completo superado, con nota de archivado | contenido vigente | - |
| `docs/legal/*` | contenido fuente de la sección Legal | resúmenes ajenos (nadie parafrasea: se enlaza) | - |
| `.claude/skills/*/SKILL.md` | ¿cómo ejecuto este procedimiento? | la norma (vive en CLAUDE.md) | 8 KB |
| `assets/svg/README.md` | ¿cómo se nombra y exporta un asset? | el porqué del lenguaje visual (ADR 023, 026) | 10 KB |
| `scripts/perf/BASELINE.md` | ¿cuál es la línea base de rendimiento? | narrativa de optimizaciones | 20 KB |

### Las 4 skills

| Skill | Objetivo | Contiene | No contiene | Origen |
|---|---|---|---|---|
| `auditor-finko` | auditoría integral simulando un usuario colombiano real | metodología de 5 fases, escenario, **una** lista de 7 perspectivas, formato del informe | "cuándo usar este skill" (peso muerto: se lee después de invocarla), los 4 bloques de preguntas repetidos | existe; 452 → ~250 líneas |
| `cerrar-tarea` | verificar, commitear y actualizar docs al cerrar | las 4 compuertas ejecutables, rotación del changelog si cambió el mes, secuencia de 4 archivos + 2 condicionales, chequeo de techos, sello `Revisado:`, plantilla del reporte de supervisión | matriz de modelos, triaje | CLAUDE.md §2.4 + CONTRIBUTING + contexto/README §2.2 |
| `triaje-tarea` | decidir si una tarea nueva se ejecuta, se integra o se difiere | las 5 preguntas, los 3 resultados, criterios de priorización, "pensar como arquitecto", plantilla de tarjeta, regla de fusión de duplicadas | cierre, matriz de modelos | CLAUDE.md §2.7 + parte de §2.1 |
| `elegir-modelo` | desempatar modelo + nivel en tareas no obvias | escala de modelos, tabla de combinaciones, matriz de 11 criterios, política de subagentes | el formato del bloque `Próximo paso` (queda en CLAUDE.md: aplica en cada respuesta) | CLAUDE.md §2.3 |

### CLAUDE.md v2: esqueleto

~120 líneas, ~8 KB, ~2.400 tokens.

| Sección | Contenido |
|---|---|
| 0. Identidad y estado | Finko en 4 líneas + versión. El árbol de carpetas se va a ARCHITECTURE |
| 1. Mapa de documentos | tabla única "documento / cuándo leerlo / qué NO buscar ahí" (funde las secciones 0 y 5 actuales, sin el enlace muerto a `FINANCIAL_LOGIC_CO.md`, con DESIGN_SYSTEM que hoy falta) |
| 2. Workflow núcleo | una tarea a la vez; reporte de cierre (4 puntos); formato exacto del `Próximo paso` + 1 línea de combinaciones válidas + "si hay duda, skill `elegir-modelo`"; cierre → skill `cerrar-tarea`; tarea nueva → 3 reglas siempre activas (continuidad, fuente única, nunca revertir un ADR en silencio) + skill `triaje-tarea`; confirmar destructivos |
| 3. Contexto por funcionalidad | 3 líneas + enlace a `contexto/README.md` (hoy duplica esa ficha casi frase por frase) |
| 4. Reglas ADN | las 12 íntegras, sin tocar. Máximo retorno por token del archivo |
| 5. Convenciones | las 5 actuales + commit y push autónomos con verde previo (hoy solo vive en la memoria del asistente) |
| 6. Estilo | prohibición de U+2014 y U+2013 nombrados por codepoint, 3 reemplazos, excepción de datos de usuario, comando de verificación que sí puede pasar |
| 7. Comandos | bloque único alineado con `package.json` |

Se conserva intacto: las 12 reglas ADN, el formato exacto del bloque `Próximo paso`, las convenciones, la prohibición del guion largo.

---

## 5. Los 11 principios

1. **Un dato, un dueño.** Cada hecho vive en un solo archivo oficial; los demás enlazan sin resumir. El resumen es exactamente lo que se desincroniza.
2. **No documentar lo que el código o git ya dicen.** Prohibidos los inventarios archivo por archivo, las listas de diffs y las copias de valores de tokens CSS. `ls`, `git show` y el código son la fuente.
3. **La historia se escribe una sola vez.** El commit lleva el detalle; CHANGELOG una fila; HANDOFF 1 a 3 líneas de las últimas 5; la ficha una línea por hito; el tablero borra la tarjeta.
4. **Techo por archivo, verificado al cerrar tarea.** CLAUDE 12 · HANDOFF 6 · BOARD 40 · BUGS 6 · CHANGELOG 60 · ARCHITECTURE 20 · CONTRIBUTING 5 · DESIGN_SYSTEM 20 · SECURITY 8 · OPERACION 10 · ficha 40 (objetivo 25) · ADR 20 · skill 8 · mes cerrado 200 (KB). Superarlo obliga a podar o partir por eje real, nunca a dejarlo pasar.
5. **El tablero solo contiene pendientes.** Tarjeta de 12 líneas máximo. Lo que necesita más justificación no es una tarjeta: es una iniciativa, y su brief va a un ADR.
6. **La norma va en CLAUDE.md (1 a 3 líneas, imperativo); el procedimiento en skills; la referencia en docs.** Los documentos históricos jamás se cargan como contexto permanente.
7. **La historia congelada no se reescribe.** Los ADRs son inmutables: si cambia la decisión, se escribe un ADR nuevo que supersede al viejo.
8. **Casi nunca se crea un `.md` nuevo.** Whitelist: ficha bajo demanda, ADR real, mes de changelog. Cualquier otro exige justificación explícita en el commit.
9. **Todo archivo de más de 20 KB abre con un índice tabular en sus primeras 40 líneas**, legible con `Read limit=40`.
10. **Revisión trimestral ligera.** Tamaños contra techos, tarjetas con más de 90 días sin actividad, duplicados por `grep` de IDs. Genera tarjetas de poda, no se pospone.
11. **Vigencia obligatoria en documento activo** (ajuste 5). Todo documento activo lleva sello `Revisado:`. Con más de **90 días sin modificación** pasa a "por validar": se verifica contra el código antes de citarlo como fuente de verdad. Alcance: raíz, `docs/` raíz, `contexto/`, skills. Quedan fuera `DECISIONS/`, `changelog/`, `archive/` (inmutables) y `legal/` (gate de abogado). El barrido es el mismo del principio 10: 90 días, un solo ritual.

### Cómo se verifica (comandos probados en este repo)

Vigencia, ordenada de más vieja a más nueva (Git Bash):

```bash
git ls-files -- '*.md' ':(exclude)docs/DECISIONS/*' ':(exclude)docs/changelog/*' ':(exclude)docs/archive/*' ':(exclude)docs/legal/*' | while read -r f; do echo "$(git log -1 --format=%as -- "$f")  $f"; done | sort
```

Techos de los archivos vivos:

```bash
for f in CLAUDE.md README.md docs/HANDOFF.md docs/BOARD.md docs/BUGS.md docs/CHANGELOG.md docs/ARCHITECTURE.md docs/CONTRIBUTING.md docs/DESIGN_SYSTEM.md docs/SECURITY.md docs/OPERACION.md; do printf '%6s KB  %s\n' "$(( ($(wc -c < "$f") + 1023) / 1024 ))" "$f"; done
```

Guiones largos. La versión de CLAUDE.md §7.2 no puede pasar nunca porque busca un guion simple, y `grep -P` a secas falla en este entorno (`-P supports only unibyte and UTF-8 locales`). Esta funciona, probada contra un archivo de control con U+2014 y U+2013:

```bash
LC_ALL=C.UTF-8 grep -rnP '[\x{2013}\x{2014}]' --include='*.md' --include='*.js' --include='*.css' --include='*.html' . | grep -v node_modules
```

Salida vacía significa cero guiones largos. La herramienta `Grep` de Claude Code acepta el mismo patrón `[\x{2013}\x{2014}]` sin necesidad de forzar el locale.

Enlaces internos vivos (Fase 5): extraer los destinos `.md` de todos los enlaces y comprobar que el archivo existe.

Los tres primeros van dentro de la skill `cerrar-tarea`: se verifican en cada cierre, no por disciplina.

---

## 6. Tabla de trazabilidad (89 archivos)

Cobertura completa. Las filas agrupadas indican cuántos archivos abarcan, con las excepciones desglosadas aparte; la suma da 89. **Ningún archivo se borra sin que su contenido esté verificado en el destino.**

### Raíz (3)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | Reescribir a ~8 KB | Sacar procedimientos a skills y referencia a docs. Conserva ADN, `Próximo paso` y convenciones |
| `AGENTS.md` | `AGENTS.md` (stub 3 líneas) | Reemplazar + trackear | Duplicado al 99% y desincronizado 18 días, sin la matriz de decisión, con el artefacto "familia Codex 5" listando modelos Claude. Una sola fuente de norma |
| `README.md` | `README.md` | Adelgazar a 4 KB | Quitar la copia del ADN, el árbol de carpetas y las métricas. Conserva la única lista de comandos. Corregir "16 dominios" (son 18) y la ruta muerta `Desktop/Finko_Claude` |

### `.claude/skills/` (1)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `auditor-finko/SKILL.md` | igual | Adelgazar 452 → ~250 líneas + trackear | 30% de redundancia interna (el bloque de preguntas repetido 4 veces; "Responsabilidades" y "Preguntas obligatorias" se solapan 70%). Sin trackear queda fuera del control de versiones y del chequeo de vigencia |

### `docs/` raíz (11)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `ARCHITECTURE.md` | `ARCHITECTURE.md` | Absorber MAPA + convenciones técnicas de CONTRIBUTING; borrar inventarios archivo por archivo; corregir EventBus (9 eventos, no 5), dominios (18, hoy dice 18 y lista 16) y `ui:navigate` (no existe) | Fuente única de "cómo funciona y dónde vive". Los inventarios los responde `ls` y son justo la parte desactualizada |
| `BOARD.md` | `BOARD.md` | Purgar el 32,4% de narrativa cerrada; agregar índice tabular en las primeras 40 líneas; mover los 9 briefs de iniciativa a ADRs y los patrones P1 a P7 a ADR o ficha `transversal` | Es el 68% del costo de arranque y un tercio es historia, violando su propia regla de oro. Nombre conservado (56 refs vivas, 113 en historia congelada) |
| `BUGS.md` | `BUGS.md` | **Mantener separado** (ajuste 1); techo 6 KB; corregir la línea 5 ("queda solo BUG-013" cuando lista BUG-016 y BUG-013) | Estado y deuda son conceptos distintos; el archivo de estado debe quedar pequeño |
| `CHANGELOG.md` | `CHANGELOG.md` | **Mantener nombre** (ajuste 4). Mes corriente + índice; formato de 1 fila por tarea desde 2026-08; rotar a `changelog/2026-07.md` al cerrar julio | Convención reconocida. El problema es tamaño (618 KB en 23 días) y cuádruple escritura, no el nombre |
| `CLAUDE_DESIGNS_PROMPT.md` | (borrado) | **Eliminar** tras confirmación; si la paleta tiene valor, un párrafo de "alternativa explorada y por qué no se adoptó" al ADR 031 | Huérfano confirmado (0 referencias), sin trackear, se declara "no implementada" y contradice el ADR 031. Un prompt para otra herramienta no es documentación del proyecto |
| `CONTRIBUTING.md` | `CONTRIBUTING.md` | **Mantener separado** (ajuste 2), reducir 9 → 5 KB: colaboración, flujo de cambios, 4 compuertas pre-commit. Lo técnico va a ARCHITECTURE, el protocolo anual a OPERACION | Gobernanza de trabajo no se mezcla con arquitectura técnica. GitHub lo reconoce en `docs/` |
| `DESIGN_SYSTEM.md` | igual | Adelgazar: quitar los valores de tokens copiados de `styles/tokens.css`, dejar el criterio y el enlace | Copiar valores garantiza desincronización. Resuelve además que DESIGN_SYSTEM y `svg/README` se declaren ambos "fuente de verdad" |
| `HANDOFF.md` | `HANDOFF.md` | Reescribir a 6 KB con línea de contrato: métricas + últimas 5 tareas en 1 a 3 líneas + qué sigue. Quitar identidad, comandos, runbooks y estructura de carpetas. Corregir "cero deuda técnica" (hay 2 bugs), el dominio fantasma `calculadoras`, la ausencia de `accesos` y la cifra E2E | Duplica 4 documentos. Nombre conservado (16 refs vivas, 21 en historia); el contrato en cabecera logra el efecto del renombre sin romper enlaces |
| `MAPA.md` | `ARCHITECTURE.md` (secciones 3 y 4) | **Fusionar y eliminar** | Sus 2 tablas (sección → carpeta, síntoma → dónde mirar) son las únicas correctas del proyecto y deben vivir donde está el resto de la arquitectura. 6 refs vivas a actualizar |
| `SECURITY.md` | igual | Mantener nombre y ubicación; corregir la ruta muerta `Desktop/Finko_Claude` | Convención GitHub (política de seguridad del repo) + gate real antes de tocar dependencias |
| `SETUP_DOMINIO.md` | `OPERACION.md` (runbook 1) | **Fusionar y eliminar** | Runbook aislado; se agrupa con los demás. Solo 1 referencia viva. Es además el doc más antiguo del repo (2026-05-19, 66 días) |

### `docs/changelog/` (2) y `docs/archive/` (1)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `changelog/2026-05.md` | igual | Congelar | La historia no se reescribe (principio 7). Reescribir 1,1 MB que nadie lee es trabajo sin retorno |
| `changelog/2026-06.md` | igual | Congelar | Idem |
| `archive/REDESIGN_2026.md` | igual | **Mantener la carpeta** (cambio por ajuste 4) | Con CHANGELOG conservado, `changelog/` queda reservado a la cronología mensual: un plan maestro superado rompería su nombrado. Contrato: `changelog/` = meses, `archive/` = documentos superados. Cero migración |

### `docs/contexto/` (14)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `README.md` | igual | Actualizar con los 11 principios, los techos y el formato nuevo de "Cambios realizados" | Es el manual del sistema de fichas: si no lo dice, la regla no existe |
| 11 fichas sin excepción: `ahorro`, `analisis`, `apartados`, `calendario`, `configuracion`, `deudas`, `gastos`, `inicio`, `me-deben`, `metas`, `movimientos` | igual | Mantener. "Cambios realizados" pasa a índice de 1 línea por hito cuando se toque cada una por otra razón | Es el activo más valioso del proyecto y está verificado fresco. Ahí nació la tercera copia de la historia, y se corrige sin barrido masivo |
| `mis-cuentas.md` (56,8 KB) | igual | Adelgazar **sin partir** | Es una sección real y compleja (tesorería). Su exceso son párrafos en "Cambios realizados", no falta de cohesión |
| `transversal.md` (75,7 KB) | `transversal.md` + `contexto/sistema-visual.md` | **Partir por eje real** | 9 bloques heterogéneos. Visual (formularios v2, iconografía, color por sección, tejas, navegación) a `sistema-visual`; el resto (persistencia y cuota, taxonomía, logros, CTA de cuenta) se queda |

### `docs/DECISIONS/` (42)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| 40 ADRs sin excepción | igual | Mantener intactos | Un ADR aceptado no se reescribe ni se fusiona: si cambia la decisión, se escribe uno nuevo que lo supersede |
| `002-abono-deudas.md` | igual | Corregir **solo** el campo `Estado`: "Propuesta (pendiente de aprobación)" → aceptada e implementada | La feature está implementada hace meses y se cita como decisión asentada en 7 documentos. Es un campo que nunca se actualizó |
| `031-identidad-de-color-por-seccion.md` | igual | Agregar un párrafo de "alternativa explorada" **solo si** se decide rescatar la paleta de `CLAUDE_DESIGNS_PROMPT.md` | Es donde alguien buscaría esa exploración. Condicionado a la decisión 2 de la sección 9 |

### `docs/legal/` (11)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| Los 11 documentos legales | igual | Mantener intactos | Es producto, no documentación: contenido fuente de la sección Legal, con gate de abogado colombiano. Regla propia: ningún otro documento lo parafrasea, solo enlaza |

### `assets/svg/` (3) y `scripts/perf/` (1)

| Archivo actual | Nuevo destino | Acción | Motivo |
|---|---|---|---|
| `assets/svg/README.md` | igual | Adelgazar 16,8 → ~10 KB y absorber los 2 hijos. Sale la reexplicación del lenguaje de iconografía (ADR 023) y de la biblioteca (ADR 026), y el "flujo del equipo de diseño" (describe un equipo que no existe) | Documentación de formato que se consulta con el archivo abierto al lado: alejarla de `assets/` la condena a desincronizarse |
| `assets/svg/identidad/README.md` | sección de `assets/svg/README.md` | **Fusionar y eliminar** | 0,7 KB de metadatos sobre una carpeta reservada no justifican archivo propio |
| `assets/svg/ilustraciones/README.md` | sección de `assets/svg/README.md` | **Fusionar y eliminar** | 0,8 KB, mismo criterio |
| `scripts/perf/BASELINE.md` | igual | Mantener, techo 20 KB | Vive junto al harness que la produce y está activamente referenciada (BOARD, CHANGELOG, 2 fichas, 2 ADRs) |

### Archivos nuevos (5 base)

| Archivo nuevo | Motivo |
|---|---|
| `docs/OPERACION.md` | Recoge `SETUP_DOMINIO.md`, el protocolo anual de SMMLV/UVT (hoy duplicado entre HANDOFF §4 y CONTRIBUTING), el bump de `CACHE_NAME` del Service Worker y cómo correr el harness de perf |
| `docs/contexto/sistema-visual.md` | Mitad de `transversal.md` partida por eje real |
| `.claude/skills/cerrar-tarea/SKILL.md` | Saca el procedimiento de cierre del contexto permanente |
| `.claude/skills/triaje-tarea/SKILL.md` | Saca el triaje §2.7 y la plantilla de tarjeta |
| `.claude/skills/elegir-modelo/SKILL.md` | Saca la matriz de 11 criterios y las tablas de modelo/nivel |

Cuatro de los cinco existen para **sacar peso del contexto vivo**, no para agregar documentación.

Adicionales por migración de contenido: `docs/changelog/2026-07.md` (rotación normal al cerrar julio) y hasta **9 ADRs** con los briefs de iniciativa que hoy inflan el BOARD (MC.13, LIM.1, ANL.1, CFG.4, PE.6, MT.6, AH.5, AP.5, CAT.1), solo para las que sean decisión de fondo.

### Resumen de acciones

| Acción | Archivos |
|---|---|
| Mantener intacto | 54 (40 ADRs, 11 legal, changelog x2, archive, BASELINE) |
| Mantener con edición | 25 |
| Fusionar y eliminar | 4 (`MAPA`, `SETUP_DOMINIO`, 2 READMEs de `svg`) |
| Eliminar | 1 (`CLAUDE_DESIGNS_PROMPT`, previa confirmación) |
| Partir | 1 (`transversal`) |
| Renombrar o mover | **0** (decisión de la sección 2) |
| Crear | 5 base (+1 rotación, +hasta 9 ADRs) |

---

## 7. Plan de fases revisado

Cada fase es uno o varios commits verificables por separado (regla 2.1 de CLAUDE.md). Nada se ejecuta sin aprobación.

**Fase 1: inventario.** Cerrada con la auditoría y con este archivo. Flecos: correr `pnpm run test:e2e` para la cifra real (HANDOFF dice 231, su propio desglose suma 227, el conteo de archivos da menos) y las 3 decisiones abiertas de la sección 9.

**Fase 2: consolidación** (correcciones sin mover nada; el mayor retorno por esfuerzo de todo el plan).
1. `AGENTS.md` a stub trackeado + trackear `.claude/skills/`.
2. Purga del 32,4% cerrado de `BOARD.md`: 148 → ~100 KB, ~15.300 tokens menos por lectura, media hora mecánica. Commit dedicado solo a borrar, para que el diff sea legible y reversible.
3. Correcciones de veracidad: dominios (18), `calculadoras`/`accesos`, "cero deuda técnica", cifra E2E, estado del ADR 002, rutas muertas de SECURITY y README, "16 dominios" del README, `ui:navigate`, y la sección 7.4 de CLAUDE.md (la limpieza de guiones largos ya está terminada: cero U+2014 en el repo).

**Fase 3: nueva estructura** (crear sin borrar). Las 3 skills nuevas + adelgazar `auditor-finko`; `OPERACION.md`; `CLAUDE.md` v2 (con la tabla de trazabilidad regla por regla hecha **antes** de recortar).

**Fase 4: migración** (mover, fusionar, borrar; confirmación explícita en cada borrado).
1. `MAPA` + convenciones técnicas de CONTRIBUTING → `ARCHITECTURE.md`; CONTRIBUTING reducido a 5 KB.
2. `SETUP_DOMINIO` + runbooks → `OPERACION.md`.
3. `HANDOFF.md` reescrito a 6 KB con línea de contrato; `BUGS.md` con techo y regla de admisión.
4. `BOARD.md`: índice tabular + briefs a ADRs.
5. `CHANGELOG.md`: cabecera con el formato nuevo, listo para aplicar desde 2026-08.
6. Partir `transversal.md`, adelgazar `mis-cuentas.md`.
7. `assets/svg/README.md` con los 2 hijos absorbidos.
8. Borrar `CLAUDE_DESIGNS_PROMPT.md` (si se confirmó).
9. Purga de `settings.local.json`: 14 rutas muertas, 29 fragmentos de pipe, puerto 8080 vs 8081, y decisión consciente sobre los comodines amplios.

**Fase 5: validación.** Enlaces `.md` existentes; tamaños contra techos; `pnpm test` + `pnpm run lint` verdes; cero U+2014 por codepoint; sellos `Revisado:` puestos; `contexto/README.md` actualizado con los 11 principios; medición real de la ruta de arranque en una sesión de prueba; **borrar este archivo**.

Si se quiere empezar por lo de mayor impacto: purga del BOARD (Fase 2.2) → CLAUDE.md v2 + skills (Fase 3) → índice del tablero y formato del changelog (Fase 4.4 y 4.5). Esos tres movimientos capturan más del 85% del ahorro.

---

## 8. Riesgos y validaciones

| Riesgo | Mitigación |
|---|---|
| Perder información al purgar el BOARD | Antes de borrar cada bloque, verificar que existe en CHANGELOG, ficha o ADR. Commit dedicado solo al borrado (diff limpio, reversible). Git conserva todo |
| CLAUDE.md v2 pierde una regla en la compresión | Tabla de trazabilidad regla por regla (origen → destino) revisada antes del recorte. Las 12 ADN y el bloque `Próximo paso` no se tocan |
| Dos dueños para las validaciones pre-commit (CONTRIBUTING vs skill) | Frontera escrita en el ajuste 2: CONTRIBUTING el qué, la skill el cómo. La skill cita la compuerta, no la reimprime |
| La rotación manual del changelog se olvida (riesgo que reaparece con el ajuste 4) | La skill `cerrar-tarea` compara el mes de la última entrada con el mes actual y rota antes de escribir |
| El stub de AGENTS.md deja a otras herramientas con menos guía | Aceptado y deliberado: apunta a CLAUDE.md. Mejor una fuente que dos desincronizadas (hoy otra herramienta trabajaría sin la matriz de decisión) |
| Sobre-partición de fichas | Solo `transversal.md` se parte, por eje temático real. El techo de 40 KB evita particiones cosméticas |
| Recaída en el caos | Los 11 principios + el chequeo de techos y vigencia dentro de la skill `cerrar-tarea` (se verifica en cada cierre, no por disciplina) + revisión trimestral |
| Cifra E2E incorrecta se propaga al HANDOFF nuevo | Correr la suite completa antes de reescribir el archivo |
| Comodines amplios en `settings.local.json` (`python -c *`, `git push *`) | No se tocan sin decisión de Esteban: son equivalentes a ejecución arbitraria y deben ser una elección consciente |
| Este archivo sobrevive a la migración y se vuelve documentación fantasma | Su borrado es el último paso de la Fase 5, listado explícitamente |

---

## 9. Decisiones abiertas

| # | Decisión | Recomendación |
|---|---|---|
| 1 | Arquitectura final de este documento: aprobada o con ajustes | - |
| 2 | Destino de `CLAUDE_DESIGNS_PROMPT.md`: borrar, o rescatar la paleta como alternativa en el ADR 031 antes de borrar | Borrar tras rescatar un párrafo en el ADR 031, si la exploración tiene valor |
| 3 | La escala de modelos de CLAUDE.md §2.3 (revisada 2026-07-02) nombra Opus 4.8; ya existe Opus 5. ¿Se actualiza al migrarla a la skill `elegir-modelo`? | Actualizar en la migración: es el momento natural, y la matriz es regla del usuario |

Los 7 informes completos de la auditoría quedaron en el scratchpad de la sesión `37f7934c` (`agente-1-conocimiento.md` a `agente-7-mantenimiento.md`).
