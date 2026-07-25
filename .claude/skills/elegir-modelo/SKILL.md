---
name: elegir-modelo
description: Desempata qué capacidad de modelo y qué nivel de esfuerzo corresponde a una tarea de Finko, y traduce esa capacidad al nombre del modelo vigente. Usar al escribir el bloque Próximo paso cuando la elección no sea obvia, cuando el usuario pregunte con qué modelo lanzar algo, o antes de repartir trabajo en subagentes.
---

# Elegir capacidad y nivel en Finko

## 1. Equivalencia vigente

> **Este bloque es el único lugar del proyecto donde se nombran versiones de modelo.**
> Actualizarlo cuando cambie la familia disponible es editar esta tabla y su fecha, nada más: `CLAUDE.md` habla solo de capacidades, así que no hay que tocarlo y el contexto permanente no se ensucia con nombres que caducan.
>
> **Revisado: 2026-07-24.**

| Capacidad | Modelo vigente | Niveles permitidos |
|---|---|---|
| **Ligero** | Haiku 4.5 | sin nivel |
| **Equilibrado** | Sonnet 5 | Bajo · Medio · Alto |
| **Alta capacidad** | Opus 5 | Alto · Extra |
| **Máxima capacidad** | Fable 5 (sujeto a límites de uso más estrictos) | Alto · Extra · Max |

No inventar otras combinaciones ni mezclarlas. `Max` está reservado a máxima capacidad, nunca a un escalón inferior.

Cambio registrado el 2026-07-24: la escala anterior nombraba Opus 4.8 en el escalón de alta capacidad. Se actualizó a Opus 5 al migrar la matriz desde `CLAUDE.md`, que es justamente el problema que esta tabla resuelve.

---

## 2. Orden de prioridad (regla del usuario, 2026-07-02)

La calidad del resultado manda siempre, en especial en programación. **Nunca sacrificar calidad de código, razonamiento, arquitectura o confiabilidad para ahorrar tokens.**

1. Elegir la capacidad con mayor probabilidad de entregar la mejor solución.
2. Si dos capacidades dan prácticamente la misma calidad, preferir la más eficiente en tokens.
3. Ajustar el nivel de esfuerzo solo cuando haga falta: no usar uno superior sin razón, pero tampoco recortar si compromete el resultado.
4. No usar una capacidad excesiva para una tarea simple, ni una insuficiente para ahorrar si eso puede afectar la solución.

La optimización de tokens es el criterio de **desempate**, nunca el principal.

---

## 3. Cuándo usar cada combinación

Ante la duda, subir un escalón antes que bajarlo.

| Combinación | Cuándo usarla |
|---|---|
| **Ligero** | Verificar tests verdes, lint, scripts triviales, renombres mecánicos, bumps de constantes (E.2, E.3), leer y reportar sin tomar decisiones. |
| **Equilibrado - Bajo** | CSS aislado, ajuste de copy, fix puntual con causa ya identificada, actualización de documentación. Menos de 30 min, 1 o 2 archivos. |
| **Equilibrado - Medio** | Trabajo cotidiano: feature nueva en un solo dominio siguiendo un patrón que ya existe. 30 a 90 min, 3 a 6 archivos, tests nuevos. **Punto de partida si hay duda.** |
| **Equilibrado - Alto** | Feature que toca varios dominios o introduce patrones nuevos de UI o datos; refactor acotado; debugging con pista clara; revisión de código. 90 min a media jornada. |
| **Alta capacidad - Alto** | Bug sutil en lógica financiera (regla 72, sistema francés, EA a mensual, retenciones, GMF), lógica financiera colombiana nueva no trivial, debugging sin pista clara. |
| **Alta capacidad - Extra** | Decisión arquitectural acotada: bump de schema con migración, refactor cross-dominio, dominio nuevo, tareas largas de varios pasos. |
| **Máxima capacidad - Alto** | Refactor mayor o feature multidominio con trade-offs no obvios y riesgo real de regresión. |
| **Máxima capacidad - Extra** | Auditoría o análisis de la base de código completa, investigación técnica profunda, trabajo agéntico de larga duración. |
| **Máxima capacidad - Max** | Reescritura de un subsistema crítico, debugging extremo sin pista, cambio que roza el ADN (requiere ADR). |

**Regla de escalado:** empezar con la capacidad más sencilla que pueda resolver la tarea. Si falta profundidad, subir primero el **nivel de esfuerzo** dentro de la misma capacidad; solo cuando el alcance supere a la capacidad, saltar al escalón siguiente (ligero → equilibrado → alta → máxima).

---

## 4. Matriz de desempate

Solo para tareas no triviales o ambiguas, cuando la tabla de arriba no deja clara la combinación. Puntuar de 0 (no aplica) a 5 (muy alto) cada criterio y sumar. Once criterios, máximo 55:

tamaño del trabajo · archivos involucrados · complejidad técnica · complejidad del razonamiento · riesgo de introducir errores · necesidad de planificación · dependencias entre módulos · decisiones críticas · contexto prolongado · paralelización conveniente · agentes especializados.

| Total | Combinación |
|---|---|
| 0-10 | Ligero |
| 11-22 | Equilibrado - Bajo/Medio |
| 23-34 | Equilibrado - Alto (Alta capacidad - Alto si toca lógica financiera colombiana o una decisión crítica) |
| 35-45 | Alta capacidad - Extra |
| 46-55 | Máxima capacidad - Alto/Extra/Max (Max solo si el razonamiento es crítico y equivocarse cuesta caro) |

El puntaje es guía, no veredicto: si el orden de prioridad de la sección 2 pide subir por calidad, se sube.

---

## 5. Paralelización con subagentes

Esto es lo que reemplaza a "Ultracode" en este proyecto: este CLI no tiene modo multiagente nativo. Solo si **paralelización ≥ 4** y **agentes ≥ 4** en la matriz, **y el usuario lo pide de forma explícita**, se reparte el trabajo en subagentes (tool `Agent`, la capacidad de cada uno elegida con esta misma matriz) y se consolida con revisión cruzada. Sin pedido explícito no se lanzan subagentes.

Al consolidar varios informes: buscar coincidencias entre agentes que llegaron por caminos independientes (eso da confianza) y resolver las contradicciones de forma explícita, diciendo con qué criterio se resolvió cada una. Un informe de subagente no es verdad por venir de un agente: se verifica lo que afirma antes de actuar sobre él.

---

## 6. El bloque `Próximo paso`

No va por defecto en cada respuesta: solo si el usuario lo pide explícitamente, o el propio asistente juzga que aporta (cierre de tarea grande, ambigüedad real sobre qué sigue). Si no hay tarea siguiente clara y se incluye, proponer la más razonable del tablero y, si hay duda real, pedir input dentro del mismo bloque. Es la recomendación para el **turno siguiente**; el modelo del turno en curso lo fija el usuario al lanzar y no cambia a mitad de respuesta.

```
─── Próximo paso ──────────────────────────────────
Tarea siguiente : <título corto>
Modelo sugerido : <capacidad> - <nivel>
Por qué         : <una línea justificando capacidad + nivel>
───────────────────────────────────────────────────
```

`Modelo sugerido` lleva la **capacidad** y el nivel (tabla de la sección 3). Si conviene mostrar además el nombre concreto para que el usuario lance el turno sin consultar esta skill, se toma de la tabla de la sección 1 y se agrega entre paréntesis **siempre anotado como resuelto por esta skill**, nunca fijado como si fuera una regla permanente:

```
Modelo sugerido : Máxima capacidad - Extra (modelo vigente resuelto por elegir-modelo)
```

Esa tabla de la sección 1 nunca se copia a `CLAUDE.md` ni a otro documento: se actualiza en un solo lugar cuando cambie la familia de modelos disponible. No imprimir la matriz de la sección 4 en tareas obvias: el `Próximo paso` liviano es el default.

Esta skill también alimenta el esfuerzo dentro del turno actual y la capacidad de cada subagente cuando el usuario pide paralelizar (sección 5).
