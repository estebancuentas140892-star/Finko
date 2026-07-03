# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Última actualización: 2026-07-03 (BUG-003 a BUG-008 solucionados; BUG-009 nuevo y pendiente).

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

> BUG-009 se detectó al implementar el fix de BUG-006 (2026-07-03), como el resto de bugs de la revisión exhaustiva de Mis cuentas: reproducido con sondas empíricas (unitarias en happy-dom y E2E en Chromium real) antes de registrarse.

### BUG-009 - Una misma deuda puede sobrepagarse combinando su cuota del checklist y un abono extra
- Estado    : pendiente
- Prioridad : media
- Problema  : en "Distribuir mi ingreso" una deuda con `cuotaMensual > 0` y `saldoTotal > 0` aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra a deudas" (input que arranca en 0). Si el usuario marca la cuota Y escribe un abono extra para la misma deuda, ambos se aplican: la cuenta se debita `cuota + extra`, pero la deuda solo puede bajar hasta 0 (`Math.max(0, ...)`). Con montos cercanos al saldo, la cuenta pierde más de lo que se debía y quedan dos gastos "Abono: X" que suman más que la deuda real. Ejemplo: saldo 100.000, cuota 100.000 (topada), extra 100.000 (topado al saldo previo); la cuenta se debita 200.000, la deuda queda en 0, se registran 200.000 de abono para una deuda de 100.000.
- Causa     : el checklist (`_leerNecesidadesMarcadas`) y el abono extra (`_leerItemsDistribucion`) leen el saldo ANTES de aplicar nada, así que ambos topan al mismo saldo previo sin descontar lo que el otro va a pagar. Los dos flujos operan sobre la misma deuda sin coordinar su tope. Preexistente al fix de BUG-006 en la matemática de la cuenta (el descuento `descontable` de tesorería ya debitaba `cuota + extra`); el fix solo lo hizo visible al crear el segundo gasto. Fix probable: al construir el plan, una deuda que ya está en el checklist no debería ofrecerse también como abono extra, o el tope del extra debe restar la cuota marcada. Requiere una decisión de diseño (¿se permite pagar cuota + extra en un mismo movimiento?).
- Archivo   : modules/dominio/tesoreria/index.js (`_leerNecesidadesMarcadas`, `_leerItemsDistribucion`, `_confirmarDistribucion`), modules/dominio/tesoreria/view.js (`renderDistribucionIngreso`, arma `itemsNecesidades` y `destinosDeudas` desde las mismas deudas)
- Función   : `_confirmarDistribucion` / `renderDistribucionIngreso`
- Líneas    : ~805-843 y ~921-966 (index.js); ~330-343 (view.js)
- Secciones : Mis cuentas, Deudas
