# ADR 060 - ADN 10 permite una lectura pura cross-domain; prohíbe importar el index.js de otro dominio

**Estado:** Aceptada el 2026-08-10. Esteban aprobó escribir el ADR antes de codear GAS.2b.
**Fecha:** 2026-08-10
**Autores:** Esteban (decisión), Claude Sonnet 5 (verificación contra el código y formalización).
**Origen:** tarjeta **GAS.2b** (segunda línea del toast de Gastos, `board/gastos.md`), que necesita leer `calcularProgreso()` de `presupuesto/logic.js` desde `gastos/index.js`.
**Relación:** precisa el ADN 10 de `CLAUDE.md` ("ningún dominio importa a otro"). No lo revierte ni lo relaja: el código ya lo cumplía así en tres sitios antes de que esta regla existiera por escrito; este ADR documenta esa práctica, no inventa una nueva.

---

## Contexto

CLAUDE.md ADN 10 dice, literalmente: "Ningún dominio importa a otro. Comunicación por EventBus." Leído al pie de la letra, cualquier `import` entre carpetas de `modules/dominio/` rompe la regla.

El código no lo cumple así, y no es un descuido reciente:

- `modules/dominio/presupuesto/logic.js:13` importa `gastosMes` de `../gastos/logic.js`.
- `modules/dominio/analisis/logic.js:12,14` importa de `../gastos/logic.js` y de `../tesoreria/logic.js`.
- `modules/dominio/analisis/view.js:13` importa `gastosMes` de `../gastos/logic.js`.
- `iconoDeCategoriaGasto()` se subió deliberadamente a `core/constants.js` (fuera de cualquier dominio) "para que tanto `gastos/` como `movimientos/` lo importen sin violar ADN 10" (`contexto/gastos.md`, TX.9b), reconociendo ya en 2026-07-05 que un dominio necesitando datos de otro es un caso real, no una excepción.

Lo que estos cuatro sitios comparten: importan siempre `logic.js` (funciones puras, sin `S`, sin efectos), nunca `index.js` (wiring de acciones, EventBus, DOM). Ninguno hace que un dominio *actúe* sobre otro; todos hacen que un dominio *lea* un cálculo de otro.

GAS.2b necesita lo mismo: `_guardarGasto()` (`gastos/index.js`) quiere saber si el gasto que acaba de guardar excede o se acerca al límite de su categoría, cálculo que ya existe en `calcularProgreso()` (`presupuesto/logic.js:69`). La alternativa de no leerlo (duplicar el cálculo de umbrales dentro de `gastos/`) es exactamente el error que `docs/BOARD.md` ya nombra como patrón P6 de la auditoría de UX: "se informa pero no se acciona", y aquí sería peor, duplicar un cálculo que ya existe en dos lugares con el riesgo de que se desincronicen.

## Decisión

**ADN 10 se lee como: ningún dominio importa el `index.js` (ni `view.js`, ni `acciones/*.js`) de otro dominio. Un `logic.js` puro sí puede ser importado por otro dominio, cuando el importador solo lee un cálculo ya existente y no dispara ningún efecto en el dominio dueño.**

Tres reglas concretas:

1. **Dirección declarada, no libre.** El import va del dominio que *usa* el dato hacia el dominio que lo *calcula*, nunca al revés dentro del mismo par. Si B necesita algo de A y A ya necesita algo de B, ninguno de los dos logic.js puede importar al otro directamente sin crear un ciclo; en ese caso el import cross-domain se hace desde `index.js` del dominio consumidor, pasando el resultado como parámetro a su propio `logic.js` (que sigue sin conocer al otro dominio).
2. **Nunca se importa `index.js`, `view.js` ni `acciones/*.js` de otro dominio.** Eso sí es acoplamiento real: wiring, EventBus, efectos. Ahí el EventBus sigue siendo la única comunicación.
3. **Si tres o más dominios necesitan el mismo cálculo, sube a `core/` o `infra/`**, como ya pasó con `iconoDeCategoriaGasto()` (constants.js) y con la unificación de las cuatro copias de `calcularProgreso*` en `infra/bolsas.js`. Un import cross-domain de `logic.js` es aceptable para 1-2 consumidores; a partir del tercero, es una señal de que el cálculo no es de un dominio, es transversal.

**Aplicación en GAS.2b**: `gastos/index.js` importa `calcularProgreso` y `UMBRAL_ALERTA`/`UMBRAL_EXCEDIDO` de `presupuesto/logic.js`. No desde `gastos/logic.js`, porque `presupuesto/logic.js` ya importa `gastosMes` de `gastos/logic.js`: hacerlo también en la otra dirección cerraría un ciclo `gastos/logic.js ↔ presupuesto/logic.js`. `gastos/index.js` no participa de ese ciclo (regla 1); calcula el progreso ahí y se lo pasa como parámetro a la función pura nueva de `gastos/logic.js`, que sigue sin importar nada de `presupuesto`.

## Alternativas rechazadas

| Alternativa | Por qué se rechaza |
|---|---|
| Subir `calcularProgreso()` a `infra/` ahora mismo | Solo hay un consumidor nuevo (GAS.2b); la regla 3 fija el umbral en 3+ consumidores. Moverlo ahora es refactor sin necesidad, toca `presupuesto/view.js` y sus tests sin que esta tarjeta lo pida. |
| Duplicar el cálculo de umbrales dentro de `gastos/logic.js` | Exactamente el patrón P6 que la auditoría de UX ya señaló como problema (dato que existe y se vuelve a calcular en otro sitio, con riesgo de desincronía si el umbral cambia en un solo lugar). |
| Prohibir el import y resolver todo por EventBus (`gastos` emite, `presupuesto` escucha y devuelve el dato por otro evento) | EventBus es fire-and-forget, no un canal de petición-respuesta; forzarlo a serlo (emitir y esperar un evento de vuelta) es más código y más frágil que una función pura importada, para ganar nada: `calcularProgreso()` no tiene efectos que aislar. |
| Interpretar ADN 10 al pie de la letra y bloquear cualquier import entre dominios | Ya no describe el código: `presupuesto/logic.js`, `analisis/logic.js` y `analisis/view.js` lo violan hoy, en producción, sin que nadie lo haya cuestionado. Mantener la regla escrita así solo garantiza que se siga violando en silencio. |

## Consecuencias

- **Ningún archivo existente cambia.** Este ADR documenta una práctica que ya estaba en el código; no dispara ningún refactor sobre `presupuesto/logic.js`, `analisis/logic.js` ni `analisis/view.js`.
- **`gastos/logic.js` sigue sin importar nada de `presupuesto`**: la lectura cross-domain vive en `gastos/index.js`, que le pasa el resultado a su propia función pura como parámetro.
- **Precedente escrito para la próxima vez.** La próxima tarjeta que necesite leer un cálculo de otro dominio no repite esta discusión: aplica las tres reglas de arriba directamente.
- **CLAUDE.md ADN 10 queda igual de literal como resumen** (a propósito: es la fuente única y no debe duplicar el detalle); este ADR es la referencia cuando el resumen no basta, igual que otros ADR precisan reglas del ADN sin reescribirlas.

## Implementación

Sin rebanadas propias: este ADR habilita a **GAS.2b**, que lo cita como referencia en `gastos/index.js` y en `board/gastos.md`.
