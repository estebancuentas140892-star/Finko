# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Última actualización: 2026-07-08 (BUG-011 y BUG-012 registrados).

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

### BUG-011 - El panel de estrategia de pago cierra al cambiar de pestaña y deja la simulación aplicada
- Estado    : pendiente
- Prioridad : alta (una simulación nunca debe mutar estado sin confirmación explícita)
- Problema  : reportado por Esteban (2026-07-08): en Deudas, al probar un valor en "Aumentar cuota" y luego pasar a "Renegociar la tasa", el panel se cierra automáticamente y la simulación queda aplicada, sin haber presionado "Aplicar estrategia". Pasos: abrir Deudas con una deuda con interés → panel Estrategia de pago → ingresar un valor en Aumentar cuota → cambiar a la pestaña Renegociar. Verificar primero si la mutación es real (estado persistido) o solo visual (el panel muestra el resultado simulado como si fuera aplicado): ambas variantes son bug, pero con severidad distinta.
- Causa     : sin investigar
- Archivo   : modules/dominio/compromisos/views/estrategia.js
- Función   : manejo de cambio de alternativa/pestaña del panel estratégico
- Líneas    : sin ubicar
- Secciones : Deudas
- Nota      : el comportamiento correcto (simulaciones libres, comparables, que solo se materializan con "Aplicar estrategia") quedó especificado en la iniciativa "Deudas v2" del [BOARD](BOARD.md); este bug puede corregirse antes o dentro de esa iniciativa.

### BUG-012 - Texto técnico "Empty State" visible en el Fondo de Emergencia
- Estado    : pendiente
- Prioridad : media (fix trivial, pero viola el ADN 11: lenguaje humano, jamás jerga técnica en la UI)
- Problema  : reportado por Esteban (2026-07-08): al desactivar el Fondo de Emergencia y luego editarlo, aparece un mensaje con el texto literal "Empty State" en pantalla. Pasos: sección Ahorros → pestaña Fondo → desactivar el fondo → editar.
- Causa     : sin investigar (probable placeholder o título de estado vacío que quedó con el nombre técnico en vez del copy en español)
- Archivo   : modules/dominio/ahorro/view.js
- Función   : render del estado vacío / edición del fondo desactivado
- Líneas    : sin ubicar
- Secciones : Ahorro (fondo de emergencia)
- Nota      : hacer una pasada rápida de grep por otros literales técnicos visibles ("Empty State", "placeholder", "TODO", "null", "undefined") en todos los view.js al corregirlo, para cazar hermanos del mismo error de una vez.
