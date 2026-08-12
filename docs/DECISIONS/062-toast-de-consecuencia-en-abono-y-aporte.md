# ADR 062 - El toast con consecuencia se generaliza a Abono y Aporte

**Estado:** Aceptada el 2026-08-11. Esteban aprobo activar GAS.2c.
**Fecha:** 2026-08-11
**Autores:** Esteban (decision), Claude Sonnet 5 (verificacion contra el codigo y formalizacion).
**Origen:** tarjeta **GAS.2c** (`board/gastos.md`), diferida hasta que GAS.2b se verificara en produccion.
**Relacion:** aplica el patron de GAS.2a (toast compartido, `modules/ui/toast.js`) y GAS.2b (segunda linea con la consecuencia) a dos formularios mas. No crea infraestructura nueva.

---

## Contexto

La ficha 22 del handoff de Claude Design fue explicita: "si dos formularios mas lo necesitan, deja de ser un arreglo local y pasa a ser una regla de confirmacion con ADR propio". GAS.2c extiende el toast con segunda linea a:

- **Abono** (pago de deuda, dominio `compromisos`): hoy `_guardarAbono()` (`compromisos/index.js:387-459`) usa `announce()`, solo audible para lector de pantalla.
- **Aporte** (aporte a meta, dominio `metas`): hoy `_guardarAbonoMeta()` (`metas/index.js:171-232`) tambien usa solo `announce()`.

Dos formularios mas alcanzan el umbral que la ficha fijo: de aqui sale la regla general.

## Decision

**Regla de confirmacion tras guardar:** todo formulario que registra un movimiento de dinero (gasto, abono a deuda, aporte a meta) muestra un toast con:

1. **Linea 1, siempre:** que se guardo (monto + nombre del concepto en creacion; "X actualizado" en edicion).
2. **Linea 2, solo si hay algo que decir:** la consecuencia que Finko ya calculo. Con el ojo de privacidad activo (`S.config.ocultarSaldo`), nunca hay linea 2.

Cada dominio calcula su propia consecuencia con una funcion pura en su `logic.js` (o submodulo), sin duplicar el patron de `consecuenciaDeGasto()` mas alla de su forma (parametros de entrada `{ ...datos, ocultarSaldo }`, salida `{ texto, tono } | null`). No se sube a `infra/` una funcion generica: los tres calculos son distintos (progreso de presupuesto, saldo de deuda, avance de meta) y forzar una interfaz comun es coyuntura, no ahorro real.

**Abono** (`consecuenciaDeAbono`, `compromisos/logic/abonos.js`): prioridad deuda saldada > saldo restante.
**Aporte** (`consecuenciaDeAporte`, `metas/logic.js`): prioridad meta completada > cuanto falta.

Ninguno reutiliza la prioridad de limite/alerta de `consecuenciaDeGasto`: ni una deuda ni una meta tienen un umbral de "alerta al 75 %" en su formulario de abono/aporte hoy.

## Alternativas rechazadas

| Alternativa | Por que se rechaza |
|---|---|
| Una funcion generica `consecuenciaDeMovimiento()` en `infra/` para los tres dominios | Los tres calculos difieren en forma y prioridad (presupuesto vs. saldo de deuda vs. progreso de meta); una interfaz comun forzaria parametros que no aplican a cada caso (ej. "estado" de presupuesto no existe para una meta). Menos vocabulario nuevo gana solo cuando el calculo es el mismo; aqui no lo es. |
| Mantener `announce()` y no agregar toast visual en estos dos formularios | Deja la inconsistencia que la ficha senalo: Gastos ya tiene confirmacion visual, Abono y Aporte no, mismo tipo de accion (registrar un movimiento de dinero). |
| Conservar `announce()` ademas del toast | GAS.2a ya decidio que el toast (`role="status"`) sustituye a `announce()` en la ruta de guardado; duplicar el aviso en Abono/Aporte rompe esa misma decision sin motivo nuevo. |

## Consecuencias

- `compromisos/index.js` y `metas/index.js` importan `mostrarToast` de `../../ui/toast.js`, igual que `gastos/index.js`.
- `compromisos/logic/abonos.js` gana `consecuenciaDeAbono()`; `compromisos/logic.js` (barrel) la reexporta.
- `metas/logic.js` gana `consecuenciaDeAporte()`.
- Ningun formulario cambia. Ninguna infraestructura nueva: se reusa `modules/ui/toast.js` tal cual quedo en GAS.2a.
- Precedente escrito: la proxima vez que un formulario de movimiento necesite este mismo aviso, esta ADR fija la forma sin discutirla de nuevo.

## Implementacion

Rebanada unica **GAS.2c**, `board/gastos.md`.
