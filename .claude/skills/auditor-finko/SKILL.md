---
name: auditor-finko
description: Realiza una auditoría integral de Finko para detectar reprocesos, oportunidades de automatización, problemas de UX, rendimiento y arquitectura.
---

# Auditor Finko

Este Skill se utiliza para realizar auditorías completas sobre la aplicación Finko.

Su objetivo es encontrar oportunidades para reducir el trabajo manual del usuario, optimizar los flujos y mejorar el rendimiento de la aplicación.

## Cuándo usar este Skill

Utiliza este Skill cuando la tarea implique cualquiera de los siguientes objetivos:

- Auditar la aplicación Finko.
- Analizar la experiencia de usuario (UX).
- Buscar oportunidades de automatización.
- Detectar reprocesos o tareas repetitivas.
- Optimizar flujos de trabajo.
- Revisar el rendimiento de la aplicación.
- Evaluar la arquitectura del proyecto.
- Analizar la exportación e importación de datos.
- Simular el comportamiento de usuarios reales.
- Buscar mejoras antes de implementar nuevas funcionalidades.

No utilices este Skill para responder preguntas generales o tareas que no estén relacionadas con Finko.

## Filosofía del Skill

Este Skill no busca únicamente encontrar errores.

Su propósito principal es cuestionar todos los flujos de la aplicación para reducir al máximo el trabajo manual del usuario.

Cada análisis debe partir de los siguientes principios:

- El usuario debe realizar la menor cantidad posible de clics.
- La información solo debe registrarse una vez.
- Cada dato debe tener una única fuente de verdad.
- La aplicación debe automatizar cualquier tarea repetitiva que no requiera una decisión del usuario.
- Siempre que sea posible, una sola acción debe producir múltiples resultados.
- La simplicidad es más importante que agregar nuevas funcionalidades.
- El rendimiento y la experiencia del usuario tienen prioridad sobre la complejidad técnica.
- No asumir que la implementación actual es la mejor solución.
- Cuestionar cada flujo antes de proponer nuevas funcionalidades.

La prioridad siempre será:

1. Eliminar trabajo manual.
2. Eliminar reprocesos.
3. Reducir la cantidad de pantallas.
4. Reducir la cantidad de formularios.
5. Reducir la cantidad de clics.
6. Automatizar procesos repetitivos.
7. Mantener el control del usuario sobre sus finanzas.

## Metodología de trabajo

Antes de proponer cualquier mejora, este Skill debe comprender completamente el funcionamiento actual de la aplicación.

Siempre deberá seguir este orden:

### Fase 1. Comprender

Antes de modificar cualquier flujo debe:

- Leer el código relacionado.
- Comprender el objetivo de la funcionalidad.
- Entender cómo interactúa con el resto de la aplicación.
- Identificar la intención original del diseño.

No debe proponer cambios sin comprender primero el contexto.

---

### Fase 2. Simular

Después de comprender la funcionalidad debe utilizarla como si fuera un usuario real.

Debe intentar resolver tareas comunes exactamente igual que lo haría una persona.

---

### Fase 3. Detectar fricción

Durante la simulación debe identificar:

- Trabajo repetitivo.
- Clics innecesarios.
- Formularios largos.
- Navegación innecesaria.
- Información duplicada.
- Esperas innecesarias.
- Procesos lentos.
- Funcionalidades difíciles de descubrir.

---

### Fase 4. Buscar automatización

Cada vez que encuentre una tarea manual debe preguntarse:

- ¿Puede automatizarse?
- ¿Puede deducirse automáticamente?
- ¿Puede evitarse completamente?
- ¿Puede integrarse dentro de otro flujo existente?

---

### Fase 5. Validar la propuesta

Antes de recomendar una mejora debe evaluar:

- Beneficio para el usuario.
- Impacto técnico.
- Complejidad de implementación.
- Riesgos.
- Compatibilidad con la filosofía de Finko.

Solo después de completar estas cinco fases podrá emitir recomendaciones.

## Responsabilidades

Este Skill es responsable de analizar la aplicación desde las siguientes perspectivas.

### 1. Experiencia de Usuario (UX)

Analizar:

- Fricción.
- Cantidad de clics.
- Navegación.
- Formularios.
- Descubrimiento de funcionalidades.
- Curva de aprendizaje.

---

### 2. Automatización

Buscar todas las tareas repetitivas que puedan eliminarse.

Siempre preguntarse:

- ¿Puede hacerse automáticamente?
- ¿Puede deducirse?
- ¿Puede evitarse?

---

### 3. Procesos

Analizar el flujo completo de cada funcionalidad.

Buscar:

- reprocesos
- pasos innecesarios
- pantallas innecesarias
- confirmaciones innecesarias

---

### 4. Datos

Buscar:

- información duplicada
- múltiples fuentes de verdad
- relaciones innecesarias
- datos redundantes

---

### 5. Rendimiento

Buscar:

- operaciones lentas
- cálculos repetidos
- consumo innecesario de memoria
- almacenamiento redundante
- operaciones bloqueantes

---

### 6. Arquitectura

Evaluar únicamente utilizando evidencia técnica.

Nunca recomendar una tecnología únicamente porque sea popular.

Toda recomendación debe estar justificada mediante beneficios medibles.

---

### 7. Persistencia

Revisar:

- exportación JSON
- importación JSON
- CSV
- backups
- restauración
- cambio de dispositivo

Verificar que nunca exista pérdida de información.

## Simulación del usuario

Antes de comenzar la auditoría, este Skill debe construir un escenario financiero completamente realista.

No utilizar ejemplos simples.

Debe simular una persona promedio en Colombia.

La simulación debe representar un mes completo de uso continuo.

El escenario debe incluir, como mínimo:

### Situación financiera inicial

- Cuentas bancarias.
- Efectivo.
- Billeteras digitales.
- Salario.
- Ingresos adicionales.
- Gastos fijos.
- Deudas.
- Metas.
- Apartados.
- Fondo de emergencia.
- Inversiones.
- Presupuesto.

Una vez construido el escenario, debe recorrer toda la aplicación exactamente igual que lo haría un usuario real.

Durante la simulación debe registrar acciones comunes del día a día.

Por ejemplo:

- Mercado.
- Transporte.
- Gasolina.
- Parqueaderos.
- Peajes.
- Cafés.
- Almuerzos.
- Domicilios.
- Compras impulsivas.
- Gastos hormiga.
- Pago de servicios.
- Pago de tarjetas.
- Pago de créditos.
- Transferencias.
- Retiros.
- Consignaciones.
- Ingresos extraordinarios.
- Dinero prestado.
- Dinero recuperado.
- Compras por internet.
- Gastos médicos.
- Entretenimiento.

También debe simular eventos poco frecuentes como:

- SOAT.
- Impuesto vehicular.
- Vacaciones.
- Seguros.
- Matrículas.
- Reparaciones.
- Electrodomésticos.

La simulación debe ser coherente desde el inicio hasta el final del mes.

No deben existir datos aleatorios sin relación entre sí.

## Preguntas obligatorias de auditoría

Para cada funcionalidad, pantalla, formulario o flujo analizado, este Skill deberá responder obligatoriamente las siguientes preguntas antes de proponer cualquier mejora.

### Comprensión

- ¿Cuál es el objetivo de esta funcionalidad?
- ¿Qué problema intenta resolver?
- ¿Quién la utiliza?
- ¿Con qué frecuencia se utiliza?

### Flujo

- ¿Cuántos pasos necesita el usuario para completar esta tarea?
- ¿Existen pasos innecesarios?
- ¿Puede eliminarse algún paso?
- ¿Puede unificarse con otro flujo?

### Datos

- ¿Esta información ya existe en otra parte?
- ¿El usuario la está escribiendo nuevamente?
- ¿Existe una única fuente de verdad?
- ¿Hay datos duplicados?

### Automatización

- ¿Puede Finko realizar esta acción automáticamente?
- ¿Puede deducir esta información?
- ¿Puede reutilizar datos existentes?
- ¿Puede ejecutarse esta acción durante otro proceso?

### Experiencia de usuario

- ¿Cuántos clics requiere?
- ¿Hay navegación innecesaria?
- ¿El usuario entiende qué debe hacer?
- ¿Existe una alternativa más simple?

### Rendimiento

- ¿Se realizan cálculos repetidos?
- ¿Se consulta información innecesariamente?
- ¿Existe algún cuello de botella?
- ¿Puede optimizarse este proceso?

### Impacto

- ¿Cuánto tiempo le cuesta esto al usuario?
- ¿Qué tan frecuente ocurre?
- ¿Cuál sería el beneficio de optimizarlo?
- ¿La mejora justifica la complejidad de implementación?

No se debe emitir ninguna recomendación sin haber respondido estas preguntas.

## Formato del informe

Todas las auditorías deben entregarse utilizando la siguiente estructura.

# Resumen Ejecutivo

Explicar en pocas líneas el estado general de la funcionalidad o de la aplicación.

Indicar:

- Principales fortalezas.
- Principales debilidades.
- Riesgos encontrados.
- Oportunidades de mejora.

---

# Hallazgos

Cada hallazgo debe contener obligatoriamente:

## Título

Nombre corto y descriptivo.

## Categoría

Seleccionar una:

- UX
- Automatización
- Rendimiento
- Arquitectura
- Datos
- Persistencia
- Accesibilidad
- Producto

## Problema

Explicar claramente qué sucede.

## Evidencia

Indicar qué flujo, pantalla o funcionalidad demuestra el problema.

No hacer suposiciones.

## Impacto

Explicar cómo afecta al usuario.

## Frecuencia

Clasificar como:

- Muy alta
- Alta
- Media
- Baja

## Prioridad

Clasificar como:

- Crítica
- Alta
- Media
- Baja

## Propuesta

Explicar la solución.

La propuesta debe ser concreta.

## Beneficio esperado

Indicar qué mejora obtendrá el usuario y qué impacto tendrá para el proyecto.

---

# Automatizaciones detectadas

Crear una lista con todas las oportunidades de automatización encontradas.

Para cada una indicar:

- Situación actual.
- Flujo propuesto.
- Beneficio.
- Complejidad estimada.

---

# Reprocesos detectados

Crear una lista de todas las tareas repetitivas.

Para cada una indicar:

- Qué debe repetir el usuario.
- Cuántas veces ocurre.
- Cómo eliminar completamente ese reproceso.

---

# Plan de implementación

Ordenar todas las mejoras por prioridad.

Utilizar el siguiente orden:

1. Alto impacto y bajo esfuerzo.
2. Alto impacto y esfuerzo medio.
3. Alto impacto y alto esfuerzo.
4. Mejoras futuras.

Nunca mezclar prioridades.