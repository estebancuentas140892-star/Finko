---
name: triaje-tarea
description: Decide qué hacer con una tarea o idea nueva de Finko antes de implementarla: si se ejecuta ahora, se integra a una tarjeta existente o se registra y se difiere. Incluye las preguntas de triaje, los criterios de priorización, la revisión de arquitectura previa y la plantilla de tarjeta. Usar cuando el usuario propone algo nuevo o cuando aparece trabajo no previsto.
---

> Revisado: 2026-08-11.

# Triaje de una tarea nueva en Finko

Solo **decisión previa**. Este archivo no ejecuta nada: no toca código, no cierra tareas y no actualiza documentos de cierre (eso es la skill `cerrar-tarea`). Su único producto es una de tres decisiones y, si corresponde, una tarjeta escrita.

El asistente actúa como líder técnico y de producto del proyecto: administra el tablero, no solo ejecuta instrucciones. Una idea nueva **nunca** pasa directo a implementación.

---

## 1. Las cinco preguntas

Antes de implementar, y antes incluso de crear la tarjeta, verificar contra `docs/BOARD.md`, los ADRs de `docs/DECISIONS/` y la ficha de la sección en `docs/contexto/`:

1. **¿Ya existe de forma parcial?** Como tarjeta, como iniciativa, o como observación registrada sin tarea formal.
2. **¿Modifica algo ya aprobado, o reemplaza una decisión anterior?** Si revierte un ADR, **decirlo explícitamente y pedir la decisión**. Nunca revertir un ADR en silencio.
3. **¿Puede integrarse en una tarea o iniciativa más grande ya registrada?**
4. **¿Depende de otra tarea aún no hecha?**
5. **¿Conviene diferirla a una etapa posterior?**

---

## 2. Los tres resultados posibles

| Resultado | Cuándo | Qué se hace |
|---|---|---|
| **Se implementa ahora** | no existe, no depende de nada bloqueado, y su impacto justifica interrumpir el orden actual | pasa a ser la tarjeta "En proceso" |
| **Se integra** | ya existe una tarjeta o iniciativa que cubre la misma funcionalidad | la tarjeta existente absorbe la idea (como ajuste si es chica, como rebanada encadenada si agranda el alcance) y la duplicada se borra |
| **Se registra y se difiere** | depende de algo, requiere una decisión del usuario, o su momento no es ahora | tarjeta nueva con `Depende de` o estado "no iniciar" |

---

## 3. Tres reglas que no se negocian

**Continuidad de la tarea activa.** La tarjeta "En proceso" no se abandona por ideas nuevas. Si la idea pertenece a la misma sección o iniciativa en curso, se integra ahí. Si pertenece a otra sección, se registra y se retoma cuando toque. Cambiar de frente a mitad de tarea genera código duplicado y documentos desactualizados: la continuidad manda.

**Fuente única por funcionalidad.** Cada funcionalidad tiene UNA sola entrada canónica: una tarjeta, o para lo grande una **iniciativa** que absorbe toda tarea pequeña relacionada. Colores, iconos, mensajes y automatizaciones de esa funcionalidad viven DENTRO de su iniciativa, no como tarjetas sueltas. Al detectar dos tarjetas que tocan la misma funcionalidad, la más completa absorbe a la otra y la duplicada se borra en el mismo movimiento.

**Nunca revertir un ADR en silencio.** Si el triaje concluye que una decisión vigente ya no sirve, eso se dice y se decide con el usuario. La decisión nueva se escribe como ADR nuevo que supersede al viejo; el ADR original no se reescribe.

---

## 4. Dividir lo grande

Si la tarea toca varios dominios o varias capas a la vez (lógica, vista, estilos, datos, accesibilidad, tests), se parte en rebanadas que se puedan desarrollar y **verificar de forma independiente**. Cada rebanada es una tarjeta propia, encadenada con `Depende de`, y se empieza por el subset más pequeño que tenga sentido por sí solo.

La iniciativa sigue siendo la fuente única de verdad; las rebanadas `X.1a` / `X.1b` son unidades de implementación, no tareas rivales.

Señal de que hace falta partir: la tarjeta necesita más de 12 líneas para justificarse. Entonces no es una tarjeta, es una iniciativa, y su brief va a un ADR.

---

## 5. Pensar como arquitecto antes de codificar

En cada tarea, antes de escribir nada:

- ¿Hay una solución más elegante que la primera que se me ocurrió?
- ¿Esto se puede reutilizar en otras secciones (helper en `infra/`, componente, patrón)?
- ¿Estamos duplicando código o cálculo que ya existe? El precedente del proyecto es `infra/vencimientos.js`: dos dominios tenían su propia tabla de frecuencias "a propósito" hasta que se unificó.
- ¿Será mantenible en dos o tres años?
- ¿Se puede simplificar o automatizar en vez de agregar?

Si la respuesta cambia el enfoque, **proponer antes de implementar**.

---

## 6. Priorización al elegir la siguiente tarjeta

Evaluar, en este orden:

1. **Impacto sobre el resto de la app** (cuántas secciones mejora).
2. **Dependencias técnicas** (qué desbloquea, qué la bloquea).
3. **Riesgo de regresión** sobre funciones que ya andan.
4. **Beneficio para el usuario** en su uso diario real.
5. **Facilidad de verificar el resultado** en la app.

Una tarjeta con alto impacto y verificación fácil gana a una con impacto medio y verificación difusa, aunque la segunda parezca más interesante.

---

## 7. ¿Hace falta ficha de contexto?

Antes de explorar el proyecto, consultar `docs/ARCHITECTURE.md` (ubicación gruesa por dominio y tabla síntoma → dónde mirar) y la ficha de la sección en `docs/contexto/`.

- **Si el bloque existe y está vigente:** trabajar desde ahí, sin recorrer el proyecto de nuevo. Vigencia se comprueba con el campo `Verificado contra`: `git log --oneline <commit>.. -- <archivos del bloque>`.
- **Si el bloque no existe:** el primer paso de la tarea es el análisis profundo (archivos, funciones, estilos, recursos gráficos, dependencias, relaciones, riesgos) y **escribir el bloque antes de codificar**. Ese análisis inicial justifica más capacidad de modelo; las iteraciones posteriores, con ficha vigente, no.
- Las fichas **nacen bajo demanda**. No se pre-generan para secciones que nadie está tocando: envejecen mal y cuestan tokens sin retorno.

---

## 8. Plantilla de tarjeta

Máximo 12 líneas. Va en `docs/BOARD.md`, en la sección de la app que corresponde.

```markdown
#### <ID> - <título corto>
- Prioridad  : alta | media | baja
- Estado     : pendiente | opcional | requiere ADR | no iniciar
- Área       : design | code | ambos (qué cambia, no el nombre de la tarea)
- Objetivo   : qué resuelve, en una frase, y el punto no obvio si lo hay
- Riesgo     : qué se rompe si sale mal, o "-"
- Secciones  : secciones de la app afectadas
- Archivos   : rutas relativas involucradas
- Depende de : otra tarjeta o "nada"
- Aceptación : design -> evidencia visual (captura/estado) | code -> test o comportamiento comprobable
- Modelo     : capacidad + nivel (skill `elegir-modelo` si no es obvio)
```

Antes de escribirla: buscar en el tablero otras tarjetas sobre la misma funcionalidad, sección o componente. Si comparten objetivo o modifican la misma parte del sistema, **no se crea la tarjeta**: se consolida en la existente.

---

## 9. Salida del triaje

Reportar al usuario, en pocas líneas:

- Qué se encontró en el tablero, los ADRs y la ficha (¿existía ya?).
- La decisión: se implementa, se integra o se difiere, con su razón.
- Si toca una decisión vigente, la pregunta explícita que el usuario debe responder.
- Si se creó o modificó una tarjeta, cuál y dónde.
