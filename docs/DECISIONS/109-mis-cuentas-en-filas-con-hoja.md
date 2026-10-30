# ADR 109 - Mis cuentas en filas con hoja

**Estado:** Aceptada (2026-10-30). Pedido en chat: "Sí, MV2.9", sobre la fase 12 del canvas "Finko móvil: rediseño integral" (Claude Design, tablero "Fase 12: Mis cuentas y fechas", parte 1, y "Mis cuentas v2"). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-30
**Autores:** Esteban (pedido y diseño de la fase 12), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.9 de la tarjeta MV2.2 ([ADR 098](098-finko-movil-2-primera-entrega.md)). **Extiende** el [ADR 098](098-finko-movil-2-primera-entrega.md) D4 (filas de una línea con hoja, R92) a Mis cuentas. **Respeta** el [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D1 a D3 (orden de la sección, un primario, atajos) y R53 (eliminar aparte). Solo bajo 1024 px; escritorio conserva sus tarjetas con botones (ADR 072 D8).

---

## Contexto

Medido en la app real a 390 px, con cuatro cuentas, dos fuentes fijas y dos ingresos puntuales:

| Hallazgo | Medida |
|---|---|
| Mis cuentas mide 2,6 pantallas | 2.207 px de sección |
| Cada cuenta es una tarjeta | 133 a 151 px: "Ver sus movimientos", editar y eliminar a la vista, más los chips |
| Las fuentes también bajan a dos renglones | 137 px una fuente fija; 113 a 133 px un ingreso puntual |
| Ocho papeleras a la vista | borrar a un toque en cada fila, junto a editar (R53 lo quiere aparte) |

## Decisión

### D1. Cuentas, tarjetas y fuentes en filas de una línea

Bajo 1024 px cada cuenta, cada tarjeta de crédito, cada fuente fija y cada ingreso puntual es una fila de 64 px: quién, qué tipo y cuánto. La fila entera abre la hoja de detalle del ADR 098 D4, la misma de Gastos y Movimientos: copia los botones de la fila y los dispara por `registrar-abrir`, sin lógica nueva. Eliminar va aparte, en su bloque de peligro (R53): ninguna papelera queda en la lista.

### D2. Lo que la fila calla va a la hoja

Los chips de la cuenta (cuota de manejo, 4x1000, llave o número), el día de pago de la fuente fija y lo usado de la tarjeta no caben en una línea: la hoja los lista bajo el monto. El ingreso puntual gana en la hoja "Ver en Movimientos", la misma salida al historial que ya ofrece la lista cuando pasa de cinco.

### D3. Cada bloque es una lista

Las cuentas se leen como una sola superficie con separadores, igual que un día de Gastos. Las fuentes fijas y los ingresos puntuales, que ya comparten encabezado (ADR 035 D7), forman una sola lista. El orden del ADR 080 no cambia: hero, cuentas, transferir, fuentes, distribuir y "Solo informativo" al pie.

### D4. La hoja nombra la acción, no la fila

El texto de cada botón de la hoja sale del texto visible del botón de la fila y, si es solo un ícono, de su nombre accesible hasta los dos puntos ("Editar cuenta: Nequi" da "Editar cuenta"). Los nombres accesibles de Mis cuentas pasan a esa forma.

## Alternativas descartadas

- **Una hoja propia para Mis cuentas.** Duplica la de Gastos y Movimientos; la del ADR 098 ya resuelve copiar y disparar.
- **Dejar los chips en la fila, en un segundo renglón.** Es la fila de dos renglones que se quería quitar.

## Consecuencias

### Positivas

- Mis cuentas baja de 2.207 a 1.616 px con el mismo escenario (2,6 a 1,9 pantallas); ninguna papelera a la vista. A 320 cada fila sigue en 64 px y nada desborda; un nombre largo se corta con elipsis y la hoja lo muestra entero.
- Gastos, Movimientos y Mis cuentas abren la misma hoja: una sola forma de llegar a editar o eliminar en el teléfono.

### Negativas / Restricciones

- La llave de una cuenta queda a un toque, en la hoja: antes se leía en la lista.
