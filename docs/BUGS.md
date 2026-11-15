# Registro de errores - Finko Claude

> Revisado: 2026-11-15 (BUG-027 cerrado: el ADR 059 se reconstruyó).

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Solo entra lo **verificado** contra el código (archivo, función, línea). Una sospecha no es un error: es una tarjeta de investigación en [`BOARD.md`](BOARD.md).
> Última actualización: 2026-10-17 (iniciativa HF, [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): entran BUG-029 a BUG-031; HF.0a cierra BUG-028, HF.0b cierra BUG-030 y abre BUG-032, HF.0h cierra BUG-032; entran BUG-033 y BUG-034 (Distribuir no identifica qué ocurrencias acredita); HF.0c cierra BUG-029; HF.0i cierra BUG-033 y BUG-034; HF.0d cierra BUG-031; HF.0e cierra BUG-025. 2026-10-18: el banco de perfiles de HF.0f encuentra BUG-035 a BUG-038, cada uno con su caso mínimo en `tests/integration/perfiles-reversas.test.js`; se cierra BUG-037. 2026-11-04: se cierran BUG-035, BUG-036 y BUG-038 (5c97b98). 2026-11-13: entra BUG-039 (poda del tablero, [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md)) y se cierra el mismo día. **1 abierto.**
>
> **Patrón recurrente que conviene vigilar (cerrado 3 veces el 2026-08-01 y 2 el 2026-10-16, BUG-028 y un test de Inversión):** tests con **fechas fijas** o con un día derivado a módulo 28 se ponen rojos según el día en que se corran, casi siempre los primeros días del mes. La regla es derivar las fechas del reloj, y **fijar el reloj** (`vi.setSystemTime`) cuando el test afirma una distancia exacta o necesita un día ya pasado dentro del mes.

---

## Cómo registrar un error

```markdown
### BUG-NNN - <título corto>
- Estado    : pendiente | en proceso | solucionado
- Prioridad : alta | media | baja
- Problema  : qué se ve mal, con pasos para reproducirlo
- Causa     : causa raíz, si ya se identificó (si no, "sin investigar")
- Archivo   : ruta completa desde la raíz del proyecto
- Función   : función, componente o módulo afectado
- Líneas    : rango aproximado
- Secciones : secciones de la app afectadas
```

Numerar `BUG-001`, `BUG-002`... de forma consecutiva y sin reutilizar números aunque un error se elimine.

---

## Pendientes

Ninguno. El último, BUG-027, se cerró el 2026-11-15 reconstruyendo el [ADR 059](DECISIONS/059-interfaz-de-escritorio.md).
