# ADR 055 - El cuerpo de los colapsables de Análisis entra al lenguaje v2

**Estado:** Aceptada el 2026-07-27. Cierra el deferimiento declarado del [ADR 038](038-analisis-v2-visual.md) D5.
**Fecha:** 2026-07-27
**Autores:** Esteban (encargo de aplicar la auditoría de diseño de Análisis), Claude Design (auditoría de la sección, hallazgos H2 y H13 y variante V3), Claude Opus 5 (verificación contra el código e implementación).
**Origen:** hallazgos H2 y H13 de la auditoría de diseño de Análisis del 2026-07-26 (bloques C2 y C2b del delta).
**Relación:** **completa** el [ADR 038](038-analisis-v2-visual.md) D5, que rediseñó el summary de los dos colapsables y dejó su interior fuera de alcance a propósito. No revierte nada del 038: la fila del summary, el badge de renta, el empty state único y la disciplina de "cero íconos nuevos" siguen tal cual. Conserva PERF.2 y PERF.3 (bundle memoizado y cuerpo diferido al `toggle`) sin tocar su mecánica. Aplica [ADR 033](033-direccion-visual-premium.md) (superficie + sombra en reposo) y re-declara [ADR 019](019-limites-por-rol.md) / IV.3 en la fila de comparación.

---

## Contexto

ANL.2d convirtió el `<summary>` de los dos colapsables de Análisis en una fila v2 (teja pizarra, título, subtítulo, chevron) y dejó el cuerpo intacto. La decisión está escrita en el propio ADR 038: "el cuerpo interno de los colapsables NO se rediseñó, decisión D5, fase siguiente si se desea".

La auditoría midió lo que quedó pendiente. Al abrir "Más detalle de tus gastos", el cuerpo rinde **1.175,8px** (comparación 481,3 + patrón semanal 323,8 + hormigas 290,7) construidos con el vocabulario anterior a v2: tres `h2` de 18px/600 con un emoji delante, párrafos `.analisis__desc` y bloques sin superficie propia colgando del fondo del grupo. Tres bloques más arriba, en la misma pantalla, las cards v2 son superficie, radio 24px, sombra y `h2` de 16px/700. Con los dos colapsables abiertos la página llega a 3.990,1px y más de la mitad de ese contenido habla el idioma viejo.

Dentro de ese cuerpo vive además la **única tabla de datos que la app le muestra a un teléfono**: la comparación vs mes anterior, cuatro columnas de dinero a 12px. La auditoría esperaba desborde horizontal y no lo hay (322,7px de tabla en 322,7 de contenedor, `scrollWidth` 323 igual a `clientWidth` 323): las celdas se comprimen en vez de desbordar. El problema no es el scroll, es la densidad, y dos bloques más arriba la card de categorías ya resolvió la misma pregunta con filas rankeadas.

La frontera entre los dos lenguajes no es una decisión de diseño: es dónde se detuvo la iniciativa.

## Decisión

**Los tres sub-bloques del cuerpo adoptan la receta que ya usan `.tend-card` y `.catg-card`, y la comparación deja de ser una tabla.**

1. **Superficie.** `.analisis-grupo--fila .analisis-grupo__body .analisis__section` toma `--fk-bg-surface`, borde sutil, `--fk-radius-xl`, `--fk-shadow-sm` y padding 4. No es una card nueva: son selectores añadidos sobre una clase existente, acotados al modificador `--fila` para que el desglose de Límites de gasto, que reutiliza `.analisis-grupo`, no cambie.
2. **Títulos.** `.analisis__section-title` dentro de ese cuerpo baja a `--fk-text-base` / `--fk-font-bold` y lleva su símbolo del sprite al lado (`i-bar-chart`, `i-agenda`, `i-alert`), en flex con gap 2. Los `h2` pasan a `h3`: cuelgan del `h2` del summary (regla R45).
3. **La comparación es una lista.** `.comparacion__lista` con la anatomía de fila de dinero: nombre a la izquierda con truncado, monto del mes a la derecha en negrita y tabular, y la variación como chip con su ícono de tendencia. El monto del mes anterior sale de la fila: el delta total del bloque, que ya estaba, lo resume. **Verde solo al bajar**, mismo criterio que `.tend-card__chip--baja`. La dirección viaja también en texto `sr-only` ("subió", "bajó"), no solo en el ícono y el color.

Los `.comparacion__tabla*` quedan retirados: no tenían otro consumidor.

Medido a 390px sobre los dos bloques que la propuesta muestra: 704,8px pasan a 663,1px, y la lista de cuatro filas rinde 118,6px.

## Consecuencias

- La iniciativa Análisis v2 queda cerrada de verdad: era lo único que le faltaba al ADR 038.
- Una sola anatomía de fila de dinero en toda la sección. Si se generaliza, es la regla R20 aplicada fuera de las listas de dominio.
- La app deja de mostrarle una tabla de datos a un teléfono. No queda ninguna otra.
- PERF.3 no se toca: el cuerpo sigue difiriéndose al primer `toggle` y `data-cargado` sigue evitando el recálculo. El único cambio de comportamiento en ese frente es de otra corrección de la misma pasada (el `<details>` conserva su estado entre renders).
- El test de PERF.3 que usaba `comparacion__tabla` como marcador de "cuerpo pintado" pasa a usar `comparacion__lista`. La intención del test no cambia.

## Alternativas consideradas

- **Dejar el deferimiento abierto y anotarlo con su costo.** Es lo que la auditoría recomendaba en su variante V3: entrar como rebanada propia más adelante, para no meter tres sub-componentes dentro de una corrección de auditoría. Se descarta el aplazamiento pero **se conserva su razón de fondo**: por eso el cambio queda registrado en este ADR y no como un parche sin rastro. El argumento para hacerlo ahora es que la sección se estaba tocando entera en la misma pasada y volver a abrirla después costaba más que terminarla.
- **Duplicar la regla de `.tend-card` en una clase nueva `.anl-subcard`.** Descartada: agrega un nombre y una copia de la misma receta. Añadir dos selectores a la regla existente dice lo mismo con menos vocabulario nuevo.
- **Conservar la tabla y arreglarla con `font-size` mayor y menos columnas.** Descartada: sigue siendo una tabla de dinero en 322,7px y deja dos anatomías de fila distintas a dos bloques de distancia dentro de la misma sección.
- **Rediseñar también el patrón semanal y las hormigas por dentro** (sus listas, no solo su contenedor). Fuera de alcance: sus filas ya funcionan y el hallazgo medido era la superficie y el título, no la fila. Si ANL.1 reestructura el panel, ese es su terreno.
