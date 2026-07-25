# MIGRACION.md - contrato de la reorganización documental

> **Archivo temporal de trabajo.** Nace con la auditoría documental del 2026-07-24 (7 agentes) y **se borra al cerrar la Fase 5**. No cuenta para los techos de tamaño: no es documentación del proyecto, es el contrato de una migración.
>
> **Estado:** dirección general aprobada por Esteban el 2026-07-24 con 8 ajustes, todos incorporados. **Fases 1, 2 y 3 cerradas el 2026-07-24** (11 commits). **Fase 4 en preparación, sin ejecutar**: este archivo tiene su plan detallado (sección 11), pendiente de autorización explícita para las fusiones y borrados.

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
| 9 | Decisiones tomadas |
| 10 | Fase 3: trazabilidad bloque por bloque y CLAUDE.md v2 aplicado |
| 11 | Fase 4: plan de ejecución detallado (sin ejecutar) |

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

### Ajuste 7 (final): `CLAUDE_DESIGNS_PROMPT.md` se archiva, no se elimina

Motivo del usuario: aunque no debe formar parte del contexto activo, conserva valor como exploración de diseño y referencia futura.

Cascada:
- Pasa a `docs/archive/CLAUDE_DESIGNS_PROMPT.md` con nota de archivado en la cabecera, misma convención que `REDESIGN_2026.md`: *"Documento archivado por no representar la dirección actual del sistema de diseño."*
- Deja de ser un borrado, así que entra en la **Fase 2** (consolidación) en vez de la Fase 4 y ya no necesita confirmación previa.
- **Ya no hace falta rescatar un párrafo en el ADR 031**: se conserva el documento completo, que es más fiel que un resumen. El ADR 031 queda intacto (principio 7).
- Se trackea en git al archivarlo: hoy son 16,7 KB de contenido fuera de control de versiones.
- Es el primer caso de uso nuevo de `archive/`, la carpeta que el ajuste 4 salvó, y valida su contrato: aquí viven documentos completos superados, no cronología.

### Ajuste 8 (final): la escala de modelos se vuelve independiente de versiones

Motivo del usuario: no dejar nombres de versiones que queden obsoletos rápido, y que la skill pueda actualizar la tabla sin modificar CLAUDE.md.

Cascada:
- **CLAUDE.md v2 no nombra ningún modelo.** Habla de tres niveles de capacidad: **máxima capacidad** (decisiones arquitectónicas complejas, lógica financiera CO, debugging sin pista), **equilibrado** (implementación normal siguiendo patrones existentes), **ligero** (tareas mecánicas, verificaciones, renombres).
- El bloque `Próximo paso` cambia una línea de formato: `Modelo sugerido : <capacidad> (<modelo vigente>) - <nivel>`. La capacidad y el formato los fija CLAUDE.md; el nombre concreto sale de la skill.
- La equivalencia capacidad → modelo vigente vive **solo** en `elegir-modelo`. Va en el `description` de su frontmatter, que ya está siempre en contexto (~60 tokens): el nombre vigente está disponible en cada respuesta sin cargar el cuerpo de la skill, y actualizarlo es editar un archivo que no es CLAUDE.md, exactamente lo pedido.
- La matriz de 11 criterios y la tabla de casos se reescriben en términos de capacidad + nivel, sin nombres de versión.
- **Consecuencia pendiente para la Fase 4:** el campo `Modelo` de las ~40 tarjetas del tablero hoy dice "Opus 4.8 - Alto", "Fable 5 - Extra" y similares. Migra a capacidad cuando cada tarjeta se toque por otra razón (mismo criterio progresivo de la sección 7.4 de CLAUDE.md), no en un barrido aparte.

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
| `elegir-modelo` | desempatar capacidad + nivel en tareas no obvias | los 3 niveles de capacidad con sus casos, matriz de 11 criterios, política de subagentes, y **la única equivalencia capacidad → modelo vigente del proyecto**, publicada en el `description` del frontmatter (ajuste 8) | el formato del bloque `Próximo paso` (queda en CLAUDE.md: aplica en cada respuesta) | CLAUDE.md §2.3 |

### CLAUDE.md v2: esqueleto

~120 líneas, ~8 KB, ~2.400 tokens.

| Sección | Contenido |
|---|---|
| 0. Identidad y estado | Finko en 4 líneas + versión. El árbol de carpetas se va a ARCHITECTURE |
| 1. Mapa de documentos | tabla única "documento / cuándo leerlo / qué NO buscar ahí" (funde las secciones 0 y 5 actuales, sin el enlace muerto a `FINANCIAL_LOGIC_CO.md`, con DESIGN_SYSTEM que hoy falta) |
| 2. Workflow núcleo | una tarea a la vez; reporte de cierre (4 puntos); formato exacto del `Próximo paso` + los 3 niveles de capacidad sin nombres de versión (ajuste 8) + "si hay duda, skill `elegir-modelo`"; cierre → skill `cerrar-tarea`; tarea nueva → 3 reglas siempre activas (continuidad, fuente única, nunca revertir un ADR en silencio) + skill `triaje-tarea`; confirmar destructivos |
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

Guiones largos, ya corregido en CLAUDE.md §7.2 (Fase 2.4). La versión anterior no podía pasar nunca porque buscaba un guion simple. Esta se probó contra un archivo de control con U+2014 y U+2013:

```bash
git ls-files -z '*.md' '*.js' '*.css' '*.html' | LC_ALL=C.UTF-8 xargs -0 grep -nP '[\x{2013}\x{2014}]'
```

Salida vacía significa cero guiones largos. Tres detalles que costaron tres intentos: `LC_ALL` va sobre el `xargs` (antes del `git` no llega al `grep`, y sin él `grep -P` falla por locale); `git ls-files` evita recorrer `node_modules/` (minutos) y los falsos positivos de `coverage/`, que es generado; y la herramienta `Grep` de Claude Code acepta el mismo patrón sin forzar locale.

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
| `CLAUDE_DESIGNS_PROMPT.md` | `docs/archive/CLAUDE_DESIGNS_PROMPT.md` | **Mover y archivar** con nota de archivado (ajuste 7) + trackear | Huérfano (0 referencias) y no representa la dirección vigente, pero es una exploración de diseño real (paleta de 12 colores de dominio, 9 tipografías comparadas) que conserva valor como referencia. Archivar preserva más que resumir |
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
| (entra `CLAUDE_DESIGNS_PROMPT.md`) | `archive/` | Recibir (ajuste 7) | Segundo documento superado de la carpeta; confirma que el contrato de `archive/` era necesario |

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
| `031-identidad-de-color-por-seccion.md` | igual | **Sin cambios** (ajuste 7) | Ya no hace falta el párrafo de "alternativa explorada": la exploración se conserva completa en `docs/archive/`. El ADR queda intacto, como manda el principio 7 |

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
| Mantener intacto | 56 (41 ADRs, 11 legales, 2 meses de changelog, `REDESIGN_2026`, `BASELINE`) |
| Mantener con edición | 28 (incluye partir `transversal` en dos) |
| Fusionar y eliminar | 4 (`MAPA`, `SETUP_DOMINIO`, 2 READMEs de `svg`) |
| Mover y archivar | 1 (`CLAUDE_DESIGNS_PROMPT` → `archive/`, ajuste 7) |
| Eliminar sin destino | **0** |
| Renombrar | **0** (decisión de la sección 2) |
| **Suma** | **89** |
| Crear | 5 base (+1 rotación, +hasta 9 ADRs) |

---

## 7. Plan de fases revisado

Cada fase es uno o varios commits verificables por separado (regla 2.1 de CLAUDE.md). Nada se ejecuta sin aprobación.

**Fase 1: inventario.** Cerrada: auditoría, este archivo, las 5 decisiones de la sección 9 y la cifra real de E2E verificada ejecutando la suite. Sin flecos.

**Fase 2: consolidación. CERRADA el 2026-07-24**, en 8 commits pequeños.
1. ✅ `AGENTS.md` y `.claude/skills/` trackeados intactos (`966fb53`), y después `AGENTS.md` reducido a stub de 5 líneas (`5e3900f`). Dos commits a propósito: el original queda en la historia, así que la reducción es reversible. El diff previo contra CLAUDE.md dio 20 líneas distintas de ~290.
2. ✅ `CLAUDE_DESIGNS_PROMPT.md` archivado en `docs/archive/` con nota de archivado y enlaces relativos corregidos (`7bdf08b`).
3. ✅ Purga de `BOARD.md`: **150.879 → 102.239 bytes (-32,2%)**, 751 → 619 líneas, en dos commits (borrado mecánico `dfa6962`, compresión de bloques mixtos `a9e407a`). Las 49 tarjetas vivas verificadas una por una por ID; los 61 IDs cerrados verificados con `grep` contra CHANGELOG y fichas antes de borrarlos.
4. ✅ Correcciones de veracidad en 3 commits: estado del proyecto (`91a18f2`), inventarios técnicos y rutas muertas (`4585395`), sección 7 de CLAUDE.md (`83b71ea`). Ver el detalle en la entrada del CHANGELOG del 2026-07-24.

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
10. Comentario de `modules/core/state.js:432`: su ejemplo de nomenclatura de eventos cita `ui:navigate`, que no existe en el código. No se tocó en la Fase 2 para no mezclar limpieza documental con cambios en archivos de código (regla de Esteban); es una línea de comentario, sin efecto funcional.

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

## 9. Decisiones tomadas

No quedan decisiones abiertas: la Fase 2 puede ejecutarse completa.

| # | Decisión | Resultado |
|---|---|---|
| 1 | Arquitectura documental | **Aprobada** el 2026-07-24, con 8 ajustes incorporados (secciones 1 y 2) |
| 2 | Renombres al español | **Descartados** para los archivos existentes; solo los nuevos nacen en español |
| 3 | Destino de `CLAUDE_DESIGNS_PROMPT.md` | **Archivar** en `docs/archive/`, no borrar (ajuste 7) |
| 4 | Escala de modelos | **Independiente de versiones**: 3 niveles de capacidad en CLAUDE.md, equivalencia solo en la skill (ajuste 8) |
| 5 | Cifra real de E2E | **231/231 verificada** ejecutando `pnpm run test:e2e` el 2026-07-24 (231 passed, 3,4 min, exit 0). La cifra de HANDOFF era **correcta**: lo que no cuadra es su desglose por suite, que suma 227. El informe del Agente 6 la cuestionó sin ejecutar la suite completa |

Los 7 informes completos de la auditoría quedaron en el scratchpad de la sesión `37f7934c` (`agente-1-conocimiento.md` a `agente-7-mantenimiento.md`).

---

## 10. Fase 3: trazabilidad y propuesta de CLAUDE.md v2

Fase 3 ejecutada el 2026-07-24. **CLAUDE.md no se modificó**: su versión nueva es una propuesta que espera revisión (sección 10.5). Lo único que se le tocó en la Fase 2 fue la sección 7, que estaba inverificable.

### 10.1 Qué se creó y qué se modificó

| Archivo | Estado | Tamaño | Techo |
|---|---|---|---|
| `.claude/skills/cerrar-tarea/SKILL.md` | nuevo | 8 KB | 8 KB |
| `.claude/skills/triaje-tarea/SKILL.md` | nuevo | 7 KB | 8 KB |
| `.claude/skills/elegir-modelo/SKILL.md` | nuevo | 7 KB | 8 KB |
| `.claude/skills/auditor-finko/SKILL.md` | adelgazado: 453 → 112 líneas, 9.923 → 8.083 bytes | 8 KB | 8 KB |
| `docs/OPERACION.md` | nuevo | 8 KB | 10 KB |
| `docs/SETUP_DOMINIO.md` | banner de "superado", se borra en Fase 4 | 4 KB | - |

Duplicación transitoria aceptada y declarada: el runbook de dominio vive en OPERACION.md y su original en SETUP_DOMINIO.md hasta la Fase 4, que es la que borra. El banner evita que alguien lea el equivocado. La otra duplicación transitoria (el comando de guiones largos en CLAUDE.md §7.2) **se cerró al aplicar la v2** (sección 10.6): el comando ya no vive en CLAUDE.md, solo en la skill `cerrar-tarea`.

### 10.2 Trazabilidad: cada bloque de CLAUDE.md y su destino

Ningún bloque se pierde. "Textual" significa que el texto se conserva palabra por palabra.

| Bloque de CLAUDE.md hoy | Líneas | Destino |
|---|---|---|
| §0 Estado del proyecto | 8-20 | v2 §0, comprimido a 2 párrafos (su tabla de punteros se funde con §5 en el mapa de documentos) |
| §1 Qué es Finko | 22-49 | v2 §0, 4 líneas. **El árbol de carpetas sale:** ya vive en `ARCHITECTURE.md` §2 y §12, y ahí no se desactualiza |
| §2 encabezado | 51-53 | v2 §2 |
| §2.1 Una tarea a la vez | 55-59 | v2 §2 (la norma) + skill `triaje-tarea` §4 (dividir lo grande) y §3 (unificar duplicados) |
| §2.2 Reportar cambios | 61-68 | v2 §2, los 4 puntos **textuales** + skill `cerrar-tarea` §5 (reglas del reporte) |
| §2.3 formato del bloque `Próximo paso` | 70-83 | v2 §2, **textual** |
| §2.3 Orden de prioridad al elegir modelo | 84-92 | skill `elegir-modelo` §2, **textual** |
| §2.3 Escala de modelos | 93-99 | skill `elegir-modelo` §1, traducida a capacidades y con Opus 5 |
| §2.3 Combinaciones válidas | 100-108 | skill `elegir-modelo` §1 |
| §2.3 Cuándo usar cada combinación | 109-122 | skill `elegir-modelo` §3, las 9 filas completas |
| §2.3 Regla práctica de escalado | 123-124 | skill `elegir-modelo` §3 |
| §2.3 Matriz de decisión (11 criterios) | 125-136 | skill `elegir-modelo` §4, los 11 criterios y los 5 umbrales |
| §2.3 Paralelización con subagentes | 137-138 | skill `elegir-modelo` §5, con el criterio de consolidación agregado |
| §2.3 Cómo se aplica (restricción real) | 139-140 | skill `elegir-modelo` §6 |
| §2.3 Regla de oro | 141-142 | v2 §2, **textual** |
| §2.4 Mantenimiento de los docs (6 pasos) | 143-155 | skill `cerrar-tarea` §3, como 4 pasos + 2 condicionales |
| §2.5 Confirmar destructivos | 156-159 | v2 §2, **textual** |
| §2.6 Contexto por funcionalidad | 160-168 | v2 §3 (3 líneas) + skill `triaje-tarea` §7 (cuándo hace falta ficha nueva) |
| §2.7 Triaje y rol de líder técnico | 169-194 | skill `triaje-tarea` §1, §2, §3, §5, §6 y §8. Las 3 reglas siempre activas (continuidad, fuente única, no revertir un ADR en silencio) quedan en v2 §2 |
| §3 Reglas innegociables (ADN) | 195-213 | v2 §4, **las 12 textuales** más la cláusula del ADR |
| §4 Comandos esenciales | 214-238 | v2 §7 (los 4 de uso diario) + `README.md` como catálogo único |
| §5 Antes de tocar código, leer | 239-252 | v2 §1, convertido en el mapa de documentos con columna "qué NO buscar ahí" |
| §6 Convenciones rápidas | 253-262 | v2 §5, más "commit y push autónomos" |
| §7 Estilo de escritura | 263-304 | v2 §6 (la norma y la tabla de reemplazos) + skill `cerrar-tarea` compuerta 3 (el comando y sus tres trampas) |

Lo que la v2 **agrega** y hoy no existe: la columna "qué NO buscar ahí" del mapa (evita el error más caro, buscar algo donde no está), `DESIGN_SYSTEM.md` y `OPERACION.md` en el mapa (el primero hoy no aparece en la lista de lectura), y la retirada del enlace muerto a `FINANCIAL_LOGIC_CO.md`.

### 10.3 Validación: ninguna regla del ADN se perdió

Las 12 reglas se verificaron una por una contra el borrador con `grep`, por su frase distintiva, más la cláusula de que tocarlas exige ADR.

| # | Regla | En la v2 |
|---|---|---|
| 1 | Vanilla JS sin build step | textual |
| 2 | Offline-first | textual |
| 3 | Sin servidor, solo `localStorage` | textual |
| 4 | Singleton `S` mutable | textual |
| 5 | `save()` debounced 200ms | textual |
| 6 | Migraciones idempotentes | textual |
| 7 | Cero `onclick=""` | textual |
| 8 | Cero `window.X` | textual |
| 9 | `logic.js` sin DOM | textual |
| 10 | Ningún dominio importa a otro | textual |
| 11 | Lenguaje humano, neutral y profesional | textual, con el enlace al ADR 003 |
| 12 | Constantes legales con fecha de revisión | textual, con el enlace al ADR 004 |
| - | "Tocar cualquiera de estas reglas requiere un ADR" | textual |

### 10.4 Tokens: antes y después

Razón usada, la misma de la auditoría: 3,2 bytes por token.

| Nivel | Hoy | Con la v2 aplicada | Delta |
|---|---|---|---|
| **Permanente** (cada llamada al API): CLAUDE.md | 23.540 B · ~7.356 tk | 9.640 B · ~3.012 tk | **-59%** |
| **Permanente**: descriptions de las 4 skills | 0 (no existían 3 de 4) | 1.409 B · ~352 tk | +352 tk |
| **Permanente total** | ~7.356 tk | ~3.364 tk | **-54% (-3.992 tk)** |
| **Bajo demanda**: cuerpos de las 4 skills | 0 | 29.101 B · ~9.090 tk | solo al invocarse |
| **Bajo demanda**: `OPERACION.md` | 0 | 8 KB | solo al operar |

Lecturas honestas de esta tabla:

- **La Fase 3 por sí sola no baja nada:** hoy suma ~352 tokens permanentes (las descriptions) y la reducción de -59% solo se materializa cuando se aplique la v2. Ese es el paso que espera aprobación.
- El objetivo original era ~8 KB y ~2.400 tk. El borrador quedó en **9,6 KB y ~3.012 tk**, un 25% por encima, y no se recortó a la fuerza por dos razones: el mapa de documentos con su columna de "qué NO buscar" es el bloque con mejor retorno por token de todo el archivo, y la tabla de reemplazos de estilo es norma, no procedimiento. Igual queda muy por debajo del techo duro de 12 KB.
- Los ~9.090 tokens de los cuerpos **no son un costo nuevo**: 3.557 de ellos ya se pagaban en cada llamada dentro de CLAUDE.md, y ahora se pagan una vez, solo cuando la tarea los usa.

### 10.5 Propuesta de contenido final de CLAUDE.md

142 líneas, 10.318 bytes, ~3.224 tokens. **Aplicada en este mismo commit** (era una propuesta; el archivo completo vive en `/CLAUDE.md`, no se duplica acá para no crear la misma redundancia que este proyecto está eliminando).

### 10.6 Validación final antes de aplicar

Hecha a pedido explícito de Esteban, en tres partes.

**Referencias cruzadas corregidas** (consecuencia directa de la renumeración, no trabajo de Fase 4). La búsqueda de `CLAUDE\.md.{0,60}(secci|§)` en todo el repo encontró 9 puntos en documentos vivos que apuntaban a secciones de CLAUDE.md por número:

| Archivo | Referencia vieja | Corregida a |
|---|---|---|
| `docs/BOARD.md` (4 puntos) | sección 2.4, 2.6, 2.3, secciones 2.1 y 2.7 | skill `cerrar-tarea`, sección 3, skill `elegir-modelo`, skill `triaje-tarea` |
| `docs/BOARD.md` (tarjeta CFG.4) | sección 3 (ADN) | sección 4 |
| `docs/ARCHITECTURE.md` | sección 3 (ADN) | sección 4 |
| `docs/contexto/README.md` (3 puntos) | secciones 2.1, 2.4 y 2.6 | sección 2 y 3, más las 2 skills |
| `docs/DECISIONS/030-*.md` | sección 3 (ADN) | sección 4 |

No se tocó `docs/HANDOFF.md` (su "sección 2" ya apuntaba a Workflow, que sigue siendo la sección 2 en la v2: coincidencia verificada, no reescritura) ni `docs/CHANGELOG.md` ni `docs/changelog/*` (historia congelada, principio 7: describen la sección que existía en el momento de la tarea, no se actualizan).

**Tres huecos reales encontrados y corregidos**, ninguno visible en la comparación por palabras clave porque eran omisiones, no errores de texto:

1. **"Sujeto a límites de uso más estrictos"** (la advertencia operativa sobre el escalón de máxima capacidad) no había sobrevivido a la skill `elegir-modelo`. Se agregó a la tabla de la sección 1.
2. **La mención de "Ultracode"** (el CLAUDE.md original aclaraba que la política de subagentes del proyecto es lo que reemplaza a ese concepto) se había perdido al reescribir la skill. Se restauró en `elegir-modelo` sección 5.
3. **`docs/MAPA.md` no aparecía en ningún lugar del borrador**, ni en el mapa de documentos ni en "antes de explorar". Es un archivo que sigue vivo hoy (se fusiona recién en la Fase 4) y sus tablas (sección → carpeta, síntoma → dónde mirar) no tienen otro hogar todavía: dejarlo fuera habría sido un enlace roto de facto, aunque ningún grep de texto lo detectara. Se agregó como fila propia en la sección 1 del mapa, con la nota de que es temporal, y como referencia en la sección 3.

**Checklist de confirmación explícita**, contra el archivo ya aplicado:

| Ítem | Resultado |
|---|---|
| 12 reglas ADN conservadas | verificadas una por una contra `CLAUDE.md` aplicado, las 12 presentes y textuales |
| Formato del bloque `Próximo paso` conservado | presente, con la plantilla `<capacidad> - <nivel>` de la condición (b) |
| Regla de oro conservada | textual |
| Confirmación de acciones destructivas conservada | textual |
| Convenciones conservadas | presentes, con `perf`/`a11y` sumados a los tipos de commit (ya estaban en CONTRIBUTING, corrige una inconsistencia) |
| Ninguna información exclusiva perdida | los 3 huecos de arriba encontrados y corregidos; el resto trazado en la sección 10.2 |
| Enlaces del archivo aplicado | los 13 destinos existen desde la raíz |
| Guiones largos | cero, en todos los archivos trackeados |
| Las 4 skills cargan | confirmado: el listado de skills disponibles del CLI las muestra a las 4 con su `description` |


---

## 11. Fase 4: plan de ejecución detallado (sin ejecutar)

Preparado a pedido de Esteban el 2026-07-24. **Nada de esta sección se ejecutó**: es el plan que espera su autorización explícita, movimiento por movimiento o en bloque. Cada fila de la tabla 11.1 es, como mínimo, un commit propio (regla 2.1: rebanadas verificables).

### 11.1 Inventario completo de movimientos

| # | Origen | Destino | Acción | Riesgo | Validación posterior |
|---|---|---|---|---|---|
| 1 | `docs/MAPA.md` (108 líneas, 6 secciones) | `docs/ARCHITECTURE.md` (secciones nuevas, antes de la tabla de dominios y antes del cierre) | Fusionar y borrar el origen | **Alto** | Los enlaces vivos a `MAPA.md` (`CLAUDE.md` §1, `docs/contexto/README.md`) se actualizan a `ARCHITECTURE.md`. `git mv` no aplica (es fusión de contenido, no reubicación intacta): usar `git rm` tras confirmar que el 100% del contenido está en el destino. Verificar que la nota de `.calc-*` código muerto (línea 76 de MAPA) sobrevive la fusión: sigue siendo cierta. |
| 2 | `docs/SETUP_DOMINIO.md` (ya con banner de "superado" desde Fase 3) | ya absorbido en `docs/OPERACION.md` runbook 1 | Borrar el origen | **Bajo** | Solo 1 referencia viva (`docs/BOARD.md`, tarjeta A.5) apunta a `SETUP_DOMINIO.md`: redirigir a `OPERACION.md`. Nada más que mover: el contenido ya vive en el destino desde Fase 3. |
| 3 | `assets/svg/identidad/README.md` (15 líneas) | sección nueva de `assets/svg/README.md` | Fusionar y borrar el origen | **Bajo** | Sin archivos hermanos en esa carpeta (verificado: solo el README); al borrarlo, la carpeta `identidad/` deja de existir en el checkout de git (git no trackea carpetas vacías). Documentar en el README padre que la carpeta "existe a propósito, vacía, para cuando llegue el isotipo", en vez de depender de que la carpeta física lo comunique. |
| 4 | `assets/svg/ilustraciones/README.md` (16 líneas) | sección nueva de `assets/svg/README.md` | Fusionar y borrar el origen | **Bajo** | Mismo caso que el punto 3: sin archivos hermanos, la carpeta desaparece del checkout. Mismo tratamiento. |
| 5 | `docs/HANDOFF.md` | igual (in place) | Reescribir a 6 KB con línea de contrato | **Medio** | Ya reescrito parcialmente en Fase 2 (veracidad); falta el recorte final de tamaño y la línea de contrato. Verificar que ninguna cifra de la tabla de métricas se pierda al comprimir. |
| 6 | `docs/BOARD.md` (629 líneas, 103,8 KB) | igual (in place), reestructurado | Índice tabular en las primeras 40 líneas + purgar 9 briefs de iniciativa a ADRs nuevos | **Alto** | Ver 11.2. Verificar que las 49 tarjetas vivas actuales sigan existiendo, una por una, después de la reestructura (mismo método que la Fase 2: `grep "^#### <ID>"`). |
| 7 | 9 bloques `> **Iniciativa ... brief completo del usuario ...**` dentro de `docs/BOARD.md` | `docs/DECISIONS/043` a `051` (numeración exacta se asigna en el momento, consecutiva, sin reutilizar) | Extraer cada brief a un ADR nuevo; la tarjeta en BOARD queda con el objetivo en 1-2 líneas + enlace al ADR | **Alto** (uno de los 9, CFG.4, es distinto: ver 11.3) | Cada ADR nuevo sigue la plantilla vigente (Contexto, Decisión, Consecuencias, Alternativas rechazadas). Verificar que el ADR no reformula ninguna decisión ya tomada, solo reubica el brief. Los 8 restantes son movimiento mecánico de texto; CFG.4 no. |
| 8 | `docs/contexto/transversal.md` (403 líneas, 75,7 KB) | se parte en dos: `transversal.md` (4 bloques, se queda) + `docs/contexto/sistema-visual.md` (5 bloques, nuevo) | Partir por eje temático real | **Alto** | Ver 11.4. Los 3 enlaces vivos actuales a `transversal.md` (BOARD.md línea 454, ADR 030 línea 6) apuntan a bloques que **se quedan** en `transversal.md`: no necesitan cambiar. Verificado con grep antes de escribir este plan. |
| 9 | `.claude/settings.local.json` | igual | **Ninguna acción todavía** | **Alto** (equivalente a permisos de ejecución) | Ver sección 12. Solo auditoría entregada; cero cambios hasta que Esteban decida. |
| 10 | `modules/core/state.js:432` (comentario) | igual | Corregir el ejemplo `ui:navigate` a `distribucion:aplicar` | **Bajo** | Es una línea de comentario sin efecto funcional. Único punto de este plan que toca un archivo de código, no documentación: por eso va en commit propio, separado de todo lo demás (regla del usuario: no mezclar limpieza documental con cambios funcionales; un comentario no es funcional, pero el archivo sí es código). |

### 11.2 BOARD.md, estructura con índice tabular

Formato propuesto para las primeras ~40 líneas (hoy la cabecera ya tiene reglas de oro y "Cómo usar"; el índice se agrega como bloque nuevo antes de "Pendientes por sección"):

```
Índice de pendientes

ID | Título | Sección | Prioridad | Depende de
CAL.5b | El lote también cubre deudas... | Calendario | media | ARQ.2
MC.13e-2b | Quitar "Abonar extra a deudas"... | Mis cuentas | media | nada
... (las 49 filas actuales)
```

Esto permite elegir la próxima tarjeta leyendo solo las primeras 40 líneas, sin cargar los 103 KB completos del archivo (el ahorro que la auditoría original estimó en 88% para este paso puntual). Las tarjetas completas siguen abajo, agrupadas por sección, sin cambios de contenido salvo la extracción de los 9 briefs (punto 7).

### 11.3 CFG.4: por qué es distinto a los otros 8 briefs

Los otros 8 (MC.13, LIM.1, ANL.1, PE.6, MT.6, AH.5, AP.5, CAT.1) son **briefs ya triados**: el trabajo de Fase 4 es moverlos a un ADR y dejar un resumen corto en el tablero, sin tocar ninguna decisión.

**CFG.4 es una decisión de fondo sin tomar todavía**, marcada en su propia tarjeta como "DECISIÓN DE ADN": sincronización multidispositivo, la más grande del proyecto (redefine "sin servidor, sin cuenta, sin sync"). Escribir su ADR **no es mover texto**: es el vehículo donde Esteban decide. Fase 4 puede crear el **esqueleto** del ADR (contexto, opciones descritas en la tarjeta, lo que el ADR debe poner sobre la mesa) para que la decisión sea más fácil de tomar, pero el ADR queda en estado "Propuesta" hasta que él elija una opción. No se cierra como parte de la reorganización documental.

### 11.4 transversal.md, límites exactos del corte

Verificado con los encabezados reales del archivo (9 bloques, líneas exactas):

| Bloque | Líneas | Destino |
|---|---|---|
| Lenguaje de formularios v2 (FORM.1, ADR 042) | 7-37 | `sistema-visual.md` |
| Taxonomía global de categorías (CAT.1) | 38-69 | `transversal.md` (se queda) |
| Selector compacto de ícono (CAT.2) | 70-137 | `sistema-visual.md` |
| Persistencia y salvaguarda de cuota | 138-162 | `transversal.md` (se queda) |
| CTA "necesitas una cuenta" | 163-199 | `transversal.md` (se queda) |
| Tejas de marca y biblioteca gráfica | 200-254 | `sistema-visual.md` |
| Sistema de logros (dominio `logros`) | 255-304 | `transversal.md` (se queda) |
| Navegación v2 (NAV2.1, ADR 040) | 305-343 | `sistema-visual.md` |
| Identidad de color por sección (IV.1/IV.2a/IV.2d, ADR 031) | 344-403 | `sistema-visual.md` |

Resultado: `transversal.md` baja de 403 a ~163 líneas (4 bloques); `sistema-visual.md` nace con ~240 líneas (5 bloques). Ninguno de los dos roza el techo de 40 KB. El eje de corte es el mismo que ya proponía la auditoría original: visual/sistema de diseño vs. datos/lógica transversal.

Ambos archivos necesitan su propia entrada en `docs/contexto/README.md`, sección "Índice de fichas" (hoy solo lista `transversal.md`).

### 11.5 Movimientos seguros vs. de riesgo alto

**Ya cubiertos por la trazabilidad de la Fase 3 (bajo riesgo, ejecución mecánica):** puntos 2, 3, 4 y 10 de la tabla 11.1. Contenido ya validado, sin decisiones pendientes, sin ambigüedad de límites.

**Riesgo alto, cada uno por una razón distinta:**

| Movimiento | Por qué es de riesgo alto |
|---|---|
| BOARD, índice nuevo | Es el archivo más grande y más vivo del proyecto (629 líneas); un error de extracción podría borrar una tarjeta en vez de resumirla. Mitigación: verificación de las 49 tarjetas una por una, mismo método que ya funcionó en Fase 2. |
| MAPA a ARCHITECTURE | Es una fusión de contenido, no un `git mv`: hay que garantizar que el 100% de las 6 secciones de MAPA sobrevive dentro de ARCHITECTURE antes de borrar el origen. |
| Los 9 briefs a ADRs | Volumen (9 archivos nuevos de una sola vez) más el caso especial de CFG.4, que no es un movimiento mecánico sino el vehículo de una decisión real. |
| transversal.md, partición | Único caso de "partir un documento vivo" de todo el plan; el resto son fusiones o borrados. Mitigado: los límites de corte y las referencias cruzadas ya se verificaron en 11.4, con resultado favorable (cero enlaces que corregir). |
| settings.local.json | Ver sección 12: equivale a permisos de ejecución de comandos. Ningún cambio aquí es "solo documentación": es configuración de seguridad del propio asistente. |

### 11.6 Antes de cualquier borrado: protocolo

1. **`git mv` cuando el archivo se reubica intacto** (ninguno de los movimientos de esta fase es una reubicación pura: todos son fusión, partición o extracción de contenido). Cuando la acción es fusión, se usa `git rm` **después** de confirmar con grep o diff que el contenido ya vive en el destino, no antes.
2. **Verificación de enlaces internos**, mismo comando usado en las Fases 2 y 3: recorrer los `.md` trackeados, extraer sus enlaces relativos a otros `.md`, y confirmar que cada destino existe relativo a la carpeta del archivo que enlaza.
3. **Lista de archivos que desaparecen del checkout con este plan** (4, todos con destino ya verificado):
   - `docs/MAPA.md`, absorbido en `docs/ARCHITECTURE.md`.
   - `docs/SETUP_DOMINIO.md`, ya absorbido en `docs/OPERACION.md`.
   - `assets/svg/identidad/README.md`, absorbido en `assets/svg/README.md` (la carpeta `identidad/` deja de existir en el checkout).
   - `assets/svg/ilustraciones/README.md`, absorbido en `assets/svg/README.md` (la carpeta `ilustraciones/` deja de existir en el checkout).

   Ninguno más: `transversal.md` no desaparece, se parte en dos; `BOARD.md` no desaparece, se reestructura in place.
4. **Nada se borra en el mismo commit que lo crea.** Cada fusión es al menos 2 commits: uno que crea el destino con el contenido íntegro, otro (después de verificar) que borra el origen.

---

## 12. Auditoría de settings.local.json (sin ejecutar ninguna limpieza)

Pedido explícito de Esteban: entregar hallazgos y propuesta mínima, **no tocar el archivo todavía**. 146 entradas de permisos en total, en `.claude/settings.local.json`. Ninguna de las siguientes acciones se ejecutó.

### 12.1 Rutas muertas detectadas (14)

El proyecto vivía en `C:\Users\USUARIO\Desktop\Finko_Claude` y hoy vive en `G:\Finko`. 14 entradas todavía apuntan a la ruta vieja o a una variante que nunca fue la definitiva:

| Ruta muerta | Entradas afectadas |
|---|---|
| Ruta vieja del proyecto (Desktop, con sus variantes `/cygdrive/c/...` y `/mnt/c/...`) | 11 entradas: listado de Desktop, grep contra estilos viejos, `cd` al directorio viejo, grep de un import específico, `pnpm test` desde esa ruta, y 4 llamadas a `git -C` apuntando ahí |
| Nombre de carpeta distinto que tampoco es la ruta actual (`Finko-Refactor`) | 1 entrada |
| Carpeta de sesión de un Claude Code viejo, atada a la ruta anterior | 1 entrada: lectura de un archivo de resultados de sesión que casi seguro ya no existe |
| Dominio de código retirado (`modules/dominio/calculadoras/logic.js`, retirado 2026-06-07) | 2 entradas: una consulta a producción y un intento de borrado, esta última doblemente muerta porque además usa la ruta de Desktop |

**Riesgo concreto de dejarlas:** ninguno de ejecución (son literales exactos, no comodines: solo disparan si alguien vuelve a escribir esa línea exacta), pero sí de confusión para un asistente futuro que podría creer que el proyecto sigue en Desktop.

**Propuesta mínima:** borrar las 14. Cero riesgo de perder un permiso útil, porque ninguna puede volver a dispararse en `G:\Finko`.

### 12.2 Comodines amplios (permisos de ejecución de superficie ancha)

| Permiso | Riesgo concreto |
|---|---|
| Ejecutar Python con `-c` y argumento libre | El más serio del archivo: ejecución de código arbitrario, equivalente a `eval`. Cualquier texto después del flag pasa. |
| `git push` con argumentos libres | Incluye force push, incluye push a cualquier rama o remoto, no solo el que se usa hoy. |
| `git rm` con argumentos libres | Borra cualquier archivo trackeado, incluidos los que este mismo plan de Fase 4 reorganiza. |
| `git config` con argumentos libres | Puede cambiar identidad de commit, URL del remoto, hooks path. |
| `git branch` con argumentos libres | Incluye borrado forzado de rama. |
| `git stash` con argumentos libres | Incluye descartar o limpiar el stash: pérdida de cambios sin commitear. |
| `pnpm exec` con argumento libre | Ejecuta cualquier binario instalado en node_modules, superficie más ancha que correr un script de npm. |
| `pnpm run` con argumento libre | Ejecuta cualquier script que package.json defina hoy o en el futuro. |
| Dos entradas de `git commit` | Una es literalmente subconjunto de la otra: entrada redundante, no agrega ni quita alcance real. |
| `npx playwright` / `npx eslint` con argumentos libres | Acotados a su propio binario, pero con banderas sin restricción. |
| Fetch de dominio completo a producción | Alcance de dominio entero, no de URL puntual; riesgo bajo porque es la propia producción del proyecto. |
| Lectura de un árbol completo bajo una carpeta temporal | Sintaxis con doble barra inicial poco común, vale la pena revisar si es la forma correcta para el motor de permisos. |

Los permisos de solo lectura o ya acotados por el propio verbo (fetch, remote, ls-tree, add, npm test, npm audit, pnpm test) no entran en esta tabla: su comodín no habilita una acción destructiva distinta de lo que su nombre promete.

**Propuesta mínima:** eliminar solo la entrada redundante de `git commit` (subconjunto exacto de la otra). El resto exige una decisión consciente de Esteban, uno por uno: estrechar un permiso sin su decisión puede romper un flujo de trabajo real que hoy funciona.

### 12.3 Comandos históricos, precisos (no son comodines, pero ya no se van a reutilizar)

Alrededor de 100 de las 146 entradas son comandos literales, no comodín, congelados de sesiones de depuración pasadas: URLs de verificación con parámetros de invalidación de caché de un momento específico, filtros de texto con patrones exactos de una auditoría de CSS ya cerrada, extracciones de rangos de línea de un archivo en un estado que ya cambió, y el análisis de un log de pruebas que ya no existe. No son un riesgo de seguridad (no son comodines), son ruido: ninguno va a volver a coincidir tal cual.

**Propuesta mínima:** no borrar en este turno. Si Esteban quiere reducir el archivo, el criterio más seguro es por antigüedad de uso real (que hoy no es visible en el propio archivo) antes que por juicio de "esto ya no sirve", que puede equivocarse.

### 12.4 Lo que no se tocó

Cero ediciones a `.claude/settings.local.json` en este turno. Todo lo anterior es hallazgo y propuesta, a la espera de que Esteban decida qué ejecutar y en qué orden.
