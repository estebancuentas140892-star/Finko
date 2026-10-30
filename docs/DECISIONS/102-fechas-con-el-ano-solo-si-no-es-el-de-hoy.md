# ADR 102 - Las fechas dicen el año solo si no es el de hoy

**Estado:** Aceptada (2026-10-29). Pedido en chat: "Empezar por MV2.6", sobre la fase 12 del canvas "Finko móvil: rediseño integral" (Claude Design, tablero "Fase 12: Mis cuentas y fechas", parte 2). El canvas deja de mandar con este ADR.
**Fecha:** 2026-10-29
**Autores:** Esteban (pedido y diseño de la fase 12), Claude Opus 5.5 (implementación y redacción)
**Relación:** pieza MV2.6 de la tarjeta MV2.2 (segunda entrega del plan MV2, [ADR 098](098-finko-movil-2-primera-entrega.md)). No cambia ningún ADR: el formato de una fecha escrita no tenía decisión. **Respeta** el [ADR 039](039-gastos-v2-visual.md) D3 (el encabezado de día de Gastos, que ya ponía el año solo si no era el de hoy), los títulos de mes ("Octubre de 2026") y el [ADR 093](093-perfiles-en-el-dispositivo-y-modo-nino.md) (la app del niño no cambia). No depende del ancho: vale en móvil y en escritorio.

---

## Contexto

Medido en la app real con el escenario C y con años de uso (fase 12 del canvas):

| Hallazgo | Medida |
|---|---|
| El año repetido | 50 veces "de 2026" en la primera página de Movimientos, bajo un grupo que ya dice "Octubre de 2026"; 47 más en los aportes del Fondo con años de uso |
| Dos reglas opuestas | `fechaLegible` (`infra/utils.js`) pone siempre el año; `fechaCorta` (`tesoreria/views/ingresos.js`) no lo pone nunca: una prima de 2024 dice "30 de jun", igual que una de este año |
| Cinco pantallas más | Me deben ("Pactó devolver: 30 de noviembre de 2026"), Reservas, Fondo, Inversión y Metas escriben el año en curso |
| Copias sueltas | `_fechaCorta` de `ui/atencion-hoy.js` (clon de la de ingresos), `_fechaCorta` de `agenda/view.js` (mes largo, sin año) y `_subtituloSaldada` de Por pagar (mes largo, año solo si no es el de hoy) |

## Decisión

### D1. Una sola regla: día y mes en tres letras; el año, solo si no es el de hoy

"28 de oct", "30 de abr de 2027", "30 de jun de 2024". La escribe una sola función, `fechaLegible` en `infra/utils.js`, que ya usaban 16 sitios. `fechaCorta` de ingresos y las tres copias sueltas pasan a usarla y desaparecen. "Hoy" es el año del teléfono al pintar (`hoy()`).

El mes sale de un catálogo propio de tres letras (ene a dic), el mismo de Análisis, y no de `Intl`: en es-CO `Intl` abrevia septiembre como "sept" y su forma cambia entre motores y versiones de ICU. De paso deja de construir un formateador por fila.

### D2. En una lista agrupada por mes, la fila no repite el año

El grupo ya lo dice. En Movimientos la fila usa `fechaDiaMes` ("28 de oct"), también en los grupos de años anteriores.

### D3. Lo que no cambia

- Lo relativo cuando es cerca: "hoy", "mañana", "en 4 días".
- Los encabezados con día de la semana (Gastos, ADR 039 D3), los títulos de mes y los selectores de fecha de los formularios.
- La app del niño (`nino/view.js`) y la mesada de Familia (`familia-view.js`), que nombran el día de la semana.
- Ningún dato: las fechas se guardan igual (`YYYY-MM-DD`); cambia solo el texto.

## Alternativas descartadas

- **El mes abreviado de `Intl`.** Da "sept" (cuatro letras) y depende del motor; el canvas pide tres letras en toda la app.
- **Quitar siempre el año**, como hacía `fechaCorta`. Es el defecto que se corrige: una prima de hace dos años no se distingue de una de este año.
- **Mes largo con el año condicional**, como `_subtituloSaldada`. Corrige el año pero deja filas largas ("28 de septiembre") en listas que se leen de un vistazo.
- **Una opción `conAño` en `fechaLegible`.** Para el único caso (lista agrupada por mes) es más claro un nombre propio que un booleano en cada llamada.

## Consecuencias

### Positivas

- Las filas de Movimientos, Fondo, Me deben y Mis cuentas pierden ocho a doce caracteres.
- Un solo lugar decide cómo se escribe una fecha; un test fija la regla con el año en curso, el anterior y el siguiente.
- Sin `Intl.DateTimeFormat` por fila en las listas largas.

### Negativas / Restricciones

- En prosa la abreviatura se lee más seca ("cubres tus gastos hasta el 17 de dic"). Se acepta por consistencia: es la misma fecha en todas partes.
- El año depende del reloj del teléfono, igual que el resto de "hoy" en la app.
- Un texto nuevo que escriba una fecha debe usar `fechaLegible` o `fechaDiaMes`, no `Intl` directo. Las excepciones son las de D3.
