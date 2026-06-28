# ADR 010 - Simplificación de Análisis: jerarquía y colapsables

**Estado:** Aceptada
**Fecha:** 2026-06-27
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

La sección Análisis había crecido por acumulación (D.3, F.3, G.2, K.2, K.3, J.1c) hasta apilar **diez** secciones en un solo scroll vertical, mezclando tres temas distintos sin jerarquía:

- **Salud general:** Score de salud, Patrimonio neto.
- **Gastos:** Resumen del mes, Tendencia, Por categoría, Vs mes anterior, Patrón semanal, Gasto hormiga.
- **Fiscal:** Recomendación fiscal, Estado de tu renta (5 criterios).

Problemas concretos:

1. **Muro de información.** Quien abre Análisis recibe diez bloques sin saber qué mirar primero.
2. **Redundancia.** "Resumen del mes" (gastos, compromisos, egresos en crudo) ya se ve en el dashboard y en Gastos, y no interpreta nada. "Vs mes anterior" se solapa con "Tendencia" (que ya da la variación mensual) y con el resumen semanal del dashboard.
3. **Mezcla de audiencias.** Lo fiscal (renta) es para quien tiene obligaciones tributarias y aparecía intercalado en medio del análisis de gastos.

---

## Decisión

**Se reorganiza la vista (solo capa de presentación) con una jerarquía de lectura clara. No se toca `logic.js`, ni el schema, ni los datos, ni los tests.**

Orden nuevo, de mayor a menor relevancia para "¿cómo estoy?":

1. **Score de salud** (titular).
2. **Patrimonio neto.**
3. **Tendencia de gastos** (sparkline + variación).
4. **Gastos por categoría** (donut + desglose).
5. `<details>` **"Más detalle de tus gastos"** (colapsado): Vs mes anterior, Patrón semanal, Gasto hormiga.
6. `<details>` **"Estado de tu renta"** (colapsado; se abre solo si hay alerta de tope o recomendación por perfil fiscal): incluye la recomendación fiscal + los 5 criterios.

Cambios puntuales:

- **Se elimina la card "Resumen del mes"** (`_renderMetricas`): tres cifras crudas, sin interpretación, ya visibles en otras secciones. Es la única card que se quita; su lógica en `generarResumen` permanece intacta (la usan Score y Patrimonio).
- **El grupo "Estado de renta" se abre por defecto solo cuando hay algo que el usuario debería ver ya:** una alerta de tope (`nudge-high`/`nudge-medium`) o una recomendación por su perfil fiscal. Así no se entierra una advertencia tributaria real, pero tampoco se obliga a ver lo fiscal a quien no lo necesita.
- **Subtítulo guía** en el encabezado de la sección: "Cómo está tu salud financiera y a dónde va tu dinero".

### Por qué reorganizar y no mover lo fiscal a Configuración

Se evaluó separar renta/fiscal a la sección Configuración (donde vive el perfil fiscal). Se descartó para esta iteración: implicaba tocar navegación/routing y partir la lógica de renta (que vive en `analisis/logic.js`) o cruzar dominios. La ganancia de UX se logra con el colapsable, que mantiene el dato a un clic sin sacarlo de su lugar lógico. Mover lo fiscal queda como una opción futura si se confirma demanda.

---

## Consecuencias

### Positivas

- La sección guía: lo importante ("cómo estoy", "a dónde va mi dinero") está arriba y visible; el detalle fino y lo fiscal quedan a un clic.
- Menos scroll y menos ruido sin perder ningún dato: todo sigue accesible.
- Cambio de bajo riesgo: solo capa de vista. 1411/1411 tests verdes sin tocar ninguno (los tests cubren `logic.js`, no el orden del HTML).

### Negativas / Restricciones

- Lo fiscal sigue viviendo en Análisis (colapsado), no en Configuración: si más adelante se quiere separar por audiencia, es otro cambio (con routing).
- Los grupos colapsables usan `<details>` nativo: el estado abierto/cerrado no se persiste entre navegaciones (aceptable para un panel de solo lectura).
