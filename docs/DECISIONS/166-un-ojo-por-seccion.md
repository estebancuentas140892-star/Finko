# ADR 166 - Un ojo por sección

**Estado:** Aceptada (2026-11-18).
**Fecha:** 2026-11-18
**Autores:** Esteban (pedido "Gastos día a día", sección General, punto 1), Claude Opus 5.5 (implementación)
**Relación:** **Cambia** IN.2 y el ADR 069 D8 en lo que dicen del flag de privacidad: ya no hay un solo ojo para toda la app ni uno que tape las tres lentes de Gastos a la vez. Conserva la máscara (`SALDO_MASCARA`, R20) y lo que tapa cada pantalla.

---

## Contexto

El ojo de arriba a la derecha tapaba los montos de toda la app: ocultar en Gastos tapaba también Inicio, Mis cuentas y el resto. Esteban pidió que funcione de manera independiente en cada sección o apartado, para elegir qué información ocultar y cuál dejar visible.

## Decisión

### D1. Cada sección guarda su ojo

`S.config.ocultarPorSeccion` guarda un valor por sección, con la clave del id de la sección en la URL (`dash`, `gast`, `compromisos`, `presupuesto`, `tesoreria`, `agenda`, `metas`...). `infra/privacidad.js` lo lee (`montosOcultos`) y lo alterna (`alternarMontosOcultos`). En el bloque Gastos cada lente (Día a día, Por pagar, Límites) tiene su propio ojo en su encabezado. Los encabezados de las demás secciones (ADR 106 D3) comparten esa acción: `claveDelOjo` dice de qué lente o sección es cada botón, para alternarlo y para pintarlo presionado.

### D2. Quién sigue a cuál

Lo que pertenece a una sección usa su clave. Las hojas y formularios que se abren desde cualquier lado (el detalle de un gasto, el registro, la ficha de un compromiso) siguen a la sección a la vista: el detalle de un gasto abierto desde Movimientos se tapa con el ojo de Movimientos. El menú Más tapa cada resumen con el ojo de su sección. Las notificaciones fuera de la app y el aviso al registrar en Inicio siguen al ojo de Inicio.

### D3. Nadie ve aparecer lo que tenía oculto

Una sección sin valor propio sigue el flag de antes (`ocultarSaldo`): quien tenía todo oculto lo sigue teniendo así en cada sección hasta tocar su ojo. Sin migración de schema.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con un solo ojo | Es lo que el pedido cambia. |
| Un ojo por lente leyendo siempre la sección a la vista | Una pieza pintada mientras se miraba otra sección quedaría con el ojo equivocado; cada pieza pide su clave. |
| Migrar el flag viejo a todas las secciones | Escribe nueve valores que nadie eligió; el respaldo dice lo mismo sin tocar los datos. |

## Consecuencias

- `ocultarSaldo` solo se lee como respaldo; ningún control lo escribe.
- Una sección nueva con montos pide `montosOcultos('<su id>')`.
