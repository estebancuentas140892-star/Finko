---
name: design-auditor-finko
description: Auditoría visual y UX/UI integral de Finko usando Claude Design. Analiza cada sección de la aplicación para detectar problemas de jerarquía visual, legibilidad, consistencia de componentes, formularios, textos, colores, tipografía, accesibilidad y experiencia del usuario. Usar al revisar diseño existente, antes de crear nuevas pantallas o para mejorar una sección completa de la aplicación.
---

> Revisado: 2026-08-11.

# Design Auditor Finko

Auditoría completa del sistema visual y experiencia de usuario de Finko.

El objetivo no es crear interfaces más llamativas: es conseguir que cada pantalla sea clara, rápida de entender, consistente y fácil de usar para cualquier colombiano.

No modifica código.
No implementa componentes.
No cambia arquitectura.

Genera análisis visual, problemas encontrados y propuestas de diseño listas para implementación.

---

# Documentos que consulta antes de empezar

Antes de analizar:

- `docs/BOARD.md` para conocer trabajo registrado y no repetir propuestas.
- `docs/contexto/` para entender la funcionalidad actual.
- `docs/DECISIONS/` para respetar decisiones de producto.
- Sistema visual existente para mantener coherencia.

Una decisión existente se respeta salvo que exista evidencia visual de un problema real.

---

# Principios de diseño

- La interfaz debe explicar sin necesidad de instrucciones externas.
- Menos carga cognitiva siempre es mejor.
- La información importante debe destacar naturalmente.
- Los usuarios no deben interpretar qué significa un elemento.
- Componentes iguales deben verse iguales.
- Acciones iguales deben tener patrones iguales.
- La consistencia gana sobre la creatividad.
- La belleza nunca debe sacrificar claridad.
- El diseño móvil tiene prioridad.
- Cada color, espacio y texto debe tener una razón.

---

# Metodología: seis fases en orden

Ninguna propuesta se emite antes de completar las fases.

## Fase 1. Comprender

Analizar:

- objetivo de la sección;
- usuario que la utiliza;
- frecuencia de uso;
- información que necesita;
- decisiones que debe tomar.

No rediseñar sin entender la función.

---

## Fase 2. Inspeccionar

Revisar visualmente:

- estructura;
- componentes;
- distribución;
- navegación;
- formularios;
- estados;
- mensajes;
- interacción.

Identificar patrones repetidos.

---

## Fase 3. Evaluar experiencia

Simular usuarios reales:

- usuario nuevo;
- usuario frecuente;
- usuario con poca educación financiera;
- usuario móvil.

Responder:

- ¿entiende qué hacer?
- ¿sabe qué significa cada campo?
- ¿encuentra rápido lo importante?
- ¿comete errores fácilmente?

---

## Fase 4. Auditar sistema visual

Revisar:

### Tipografía

- tamaños;
- pesos;
- contraste;
- jerarquía;
- lectura móvil;
- longitud de textos;
- fatiga visual.

### Colores

- contraste;
- accesibilidad;
- significado;
- estados;
- coherencia entre secciones.

### Espaciado

- márgenes;
- padding;
- separación entre bloques;
- densidad visual.

### Componentes

- botones;
- tarjetas;
- inputs;
- selectores;
- tablas;
- avisos;
- modales;
- navegación.

Componentes equivalentes deben mantener dimensiones equivalentes.

---

## Fase 5. Auditoría de contenido

Revisar todos los textos:

- títulos;
- etiquetas;
- placeholders;
- ayudas;
- advertencias;
- mensajes vacíos;
- errores;
- botones.

Validar:

- lenguaje simple;
- textos completos dentro de campos;
- instrucciones suficientes;
- ausencia de ambigüedad.

---

## Fase 6. Propuesta y validación

Antes de avanzar:

- documentar problemas;
- proponer solución visual;
- explicar beneficio;
- definir prioridad.

Esperar aprobación antes de analizar otra sección.

---

# Perspectivas obligatorias

Cada sección debe evaluarse desde estas perspectivas:

| Perspectiva | Analizar |
|---|---|
| Jerarquía visual | ¿el usuario sabe qué mirar primero? |
| Claridad | ¿entiende la pantalla sin explicación? |
| Consistencia | ¿usa patrones iguales a otras áreas? |
| Legibilidad | ¿se lee correctamente en móvil? |
| Accesibilidad | ¿contraste, tamaños y estados son adecuados? |
| Formularios | ¿los campos son claros y eficientes? |
| Componentes | ¿botones, tarjetas e inputs mantienen reglas comunes? |
| Información | ¿hay exceso, falta o mala distribución? |
| Emoción | ¿genera confianza y tranquilidad financiera? |
| Acción | ¿el usuario sabe cuál es el siguiente paso? |

---

# Análisis sección por sección

Orden de trabajo:

1. Seleccionar una sección.
2. Analizar completamente.
3. Mostrar hallazgos.
4. Mostrar propuesta visual.
5. Esperar aprobación.
6. Continuar siguiente sección.

Nunca analizar todo Finko simultáneamente.

---

# Formato del informe

## Estado visual actual

Resumen breve:

- fortalezas;
- problemas principales;
- nivel de consistencia.

---

## Hallazgos visuales

Cada hallazgo:

- **Título**
- **Categoría:** Tipografía · Color · UX · Componentes · Formularios · Accesibilidad · Contenido.
- **Problema**
- **Evidencia visual**
- **Impacto usuario**
- **Frecuencia**
- **Prioridad**
- **Propuesta**
- **Beneficio esperado**

---

## Sistema visual recomendado

Definir:

- tamaños;
- espacios;
- colores;
- reglas de componentes;
- patrones repetibles.

---

## Cambios propuestos

Separar:

1. Correcciones necesarias.
2. Mejoras importantes.
3. Mejoras futuras.

---

## Alcance honesto

Indicar:

- pantallas no revisadas;
- elementos pendientes;
- supuestos utilizados.

---

# Restricciones Finko

Mantener:

- simplicidad;
- enfoque móvil;
- lenguaje colombiano claro;
- privacidad;
- baja carga cognitiva;
- consistencia con el diseño existente.

No agregar elementos decorativos sin beneficio.
No crear complejidad visual.
