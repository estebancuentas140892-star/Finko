---
name: auditor-finko
description: Auditoría integral de Finko simulando un usuario colombiano real, para detectar reprocesos, trabajo manual evitable, oportunidades de automatización, fricción de UX, cuellos de botella de rendimiento, duplicación de datos y problemas de arquitectura o persistencia. Usar al auditar la app o una sección, al buscar qué simplificar antes de agregar funcionalidad nueva, o al revisar flujos completos de principio a fin.
---

# Auditor Finko

Auditoría integral de la aplicación. El objetivo no es solo encontrar errores: es **cuestionar cada flujo para reducir al máximo el trabajo manual del usuario**.

Documentos que consulta antes de empezar: `docs/BOARD.md` (qué está ya registrado como pendiente, para no proponerlo como hallazgo nuevo), las fichas de `docs/contexto/` (cómo funciona hoy cada funcionalidad, sin recorrer el código de cero) y `docs/DECISIONS/` (qué ya se decidió y por qué; un hallazgo que contradice un ADR se reporta como tal, no como error).

---

## Principios

- El usuario debe hacer la menor cantidad posible de clics.
- La información solo debe registrarse una vez.
- Cada dato tiene una única fuente de verdad.
- La app automatiza cualquier tarea repetitiva que no requiera una decisión del usuario.
- Siempre que sea posible, una sola acción produce múltiples resultados.
- La simplicidad importa más que agregar funcionalidad.
- El rendimiento y la experiencia del usuario tienen prioridad sobre la complejidad técnica.
- No asumir que la implementación actual es la mejor solución.
- Cuestionar cada flujo antes de proponer algo nuevo.

Orden de prioridad de las mejoras: **1)** eliminar trabajo manual, **2)** eliminar reprocesos, **3)** reducir pantallas, **4)** reducir formularios, **5)** reducir clics, **6)** automatizar procesos repetitivos, **7)** mantener el control del usuario sobre sus finanzas.

---

## Metodología: cinco fases en orden

Ninguna recomendación se emite antes de completar las cinco.

**Fase 1. Comprender.** Leer el código relacionado, entender el objetivo de la funcionalidad, cómo interactúa con el resto de la app y cuál era la intención original del diseño. No proponer cambios sin comprender el contexto.

**Fase 2. Simular.** Usar la funcionalidad como un usuario real, resolviendo tareas comunes exactamente como lo haría una persona.

**Fase 3. Detectar fricción.** Durante la simulación, identificar trabajo repetitivo, clics innecesarios, formularios largos, navegación de más, información duplicada, esperas, procesos lentos y funcionalidades difíciles de descubrir.

**Fase 4. Buscar automatización.** Ante cada tarea manual: ¿puede automatizarse?, ¿puede deducirse?, ¿puede evitarse por completo?, ¿puede integrarse dentro de otro flujo que ya existe?

**Fase 5. Validar la propuesta.** Antes de recomendar: beneficio para el usuario, impacto técnico, complejidad de implementación, riesgos y compatibilidad con la filosofía de Finko.

---

## Las nueve perspectivas y sus preguntas obligatorias

Para cada funcionalidad, pantalla, formulario o flujo analizado hay que responder estas preguntas **antes** de proponer cualquier mejora. No se emite recomendación sin responderlas.

| Perspectiva | Qué analizar | Preguntas obligatorias |
|---|---|---|
| **Comprensión** | propósito real de la funcionalidad | ¿Cuál es su objetivo? ¿Qué problema resuelve? ¿Quién la usa? ¿Con qué frecuencia? |
| **Flujo y procesos** | el recorrido completo: reprocesos, pasos, pantallas y confirmaciones innecesarias | ¿Cuántos pasos necesita el usuario? ¿Hay pasos innecesarios? ¿Puede eliminarse alguno? ¿Puede unificarse con otro flujo? |
| **Datos** | información duplicada, múltiples fuentes de verdad, relaciones y datos redundantes | ¿Esta información ya existe en otra parte? ¿El usuario la está escribiendo de nuevo? ¿Hay una única fuente de verdad? ¿Hay datos duplicados? |
| **Automatización** | toda tarea repetitiva que pueda eliminarse | ¿Puede Finko hacerlo automáticamente? ¿Puede deducir el dato? ¿Puede reutilizar datos existentes? ¿Puede ejecutarse dentro de otro proceso? |
| **Experiencia de usuario** | fricción, cantidad de clics, navegación, formularios, descubrimiento, curva de aprendizaje | ¿Cuántos clics requiere? ¿Hay navegación innecesaria? ¿El usuario entiende qué debe hacer? ¿Existe una alternativa más simple? |
| **Rendimiento** | operaciones lentas, cálculos repetidos, memoria, almacenamiento redundante, operaciones bloqueantes | ¿Se repiten cálculos? ¿Se consulta información sin necesidad? ¿Hay un cuello de botella? ¿Puede optimizarse? |
| **Arquitectura** | evaluar **solo** con evidencia técnica; nunca recomendar una tecnología por ser popular | ¿La recomendación tiene un beneficio medible? ¿Respeta las reglas del ADN de `CLAUDE.md`? |
| **Persistencia** | exportación e importación JSON, CSV, backups, restauración, cambio de dispositivo | ¿Existe algún camino donde se pierda información? |
| **Impacto** | si la mejora vale lo que cuesta | ¿Cuánto tiempo le cuesta esto al usuario? ¿Qué tan frecuente ocurre? ¿Cuál sería el beneficio? ¿Justifica la complejidad de implementarlo? |

---

## Simulación del usuario

Antes de auditar hay que construir un escenario financiero realista de una persona promedio en Colombia, que represente **un mes completo de uso continuo**. No usar ejemplos simples ni datos aleatorios sin relación entre sí: el escenario debe ser coherente de principio a fin del mes.

**Situación financiera inicial:** cuentas bancarias, efectivo, billeteras digitales, salario, ingresos adicionales, gastos fijos, deudas, metas, apartados, fondo de emergencia, inversiones y presupuesto.

**Acciones del día a día que hay que registrar:** mercado, transporte, gasolina, parqueaderos, peajes, cafés, almuerzos, domicilios, compras impulsivas, gastos hormiga, pago de servicios, pago de tarjetas, pago de créditos, transferencias, retiros, consignaciones, ingresos extraordinarios, dinero prestado, dinero recuperado, compras por internet, gastos médicos y entretenimiento.

**Eventos poco frecuentes que también hay que simular:** SOAT, impuesto vehicular, vacaciones, seguros, matrículas, reparaciones y electrodomésticos.

Después, recorrer toda la aplicación exactamente como lo haría el usuario de ese escenario.

---

## Formato del informe

### Resumen ejecutivo

Estado general en pocas líneas: principales fortalezas, principales debilidades, riesgos encontrados y oportunidades de mejora.

### Hallazgos

Cada hallazgo lleva obligatoriamente estos campos:

- **Título:** corto y descriptivo.
- **Categoría:** UX · Automatización · Rendimiento · Arquitectura · Datos · Persistencia · Accesibilidad · Producto (una sola).
- **Problema:** qué sucede, con claridad.
- **Evidencia:** qué flujo, pantalla o funcionalidad lo demuestra. **Sin suposiciones.**
- **Impacto:** cómo afecta al usuario.
- **Frecuencia:** muy alta · alta · media · baja.
- **Prioridad:** crítica · alta · media · baja.
- **Propuesta:** la solución, concreta.
- **Beneficio esperado:** qué mejora obtiene el usuario y qué gana el proyecto.

### Automatizaciones detectadas

Lista de todas las oportunidades encontradas. Para cada una: situación actual, flujo propuesto, beneficio y complejidad estimada.

### Reprocesos detectados

Lista de todas las tareas repetitivas. Para cada una: qué debe repetir el usuario, cuántas veces ocurre y cómo eliminar ese reproceso por completo.

### Plan de implementación

Todas las mejoras ordenadas por prioridad, sin mezclar niveles: **1)** alto impacto y bajo esfuerzo, **2)** alto impacto y esfuerzo medio, **3)** alto impacto y alto esfuerzo, **4)** mejoras futuras.

### Alcance honesto

Cerrar el informe diciendo qué **no** se auditó y por qué: secciones no recorridas, hallazgos que quedaron sin verificar contra el código, datos que no se pudieron reproducir. Un informe que no declara sus límites se lee como si hubiera cubierto todo.
