# Registro de errores - Finko Claude

> Errores detectados durante el desarrollo, con toda la información necesaria para resolverlos sin tener que volver a buscar dónde están.
> Al solucionarse, el error se **elimina** de este archivo y el fix queda documentado en [`CHANGELOG.md`](CHANGELOG.md) con referencia al ID.
> Última actualización: 2026-07-03 (BUG-003 y BUG-004 solucionados).

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

> Los BUG-005 a BUG-008 salieron de la revisión exhaustiva de Mis cuentas (2026-07-03). Cada uno fue reproducido con sondas empíricas (unitarias en happy-dom y E2E en Chromium real) antes de registrarse; las sondas no se commitearon (eran temporales, el fix debe traer sus propios tests).

### BUG-005 - La cuota de manejo nace con frecuencia 'mensual' en minúscula y queda fuera de todos los cálculos mensuales
- Estado    : pendiente
- Prioridad : alta
- Problema  : el compromiso que Finko crea para la cuota de manejo de una cuenta no suma en los gastos fijos mensuales: no entra en las Necesidades del modelo de distribución (Mis cuentas y Límites), no infla el objetivo del fondo de emergencia (gastos fijos × meses de respaldo), no aparece en el checklist de Necesidades y proyecta $0 como equivalente mensual en Deudas. Solo se ve en Calendario porque `_diasParaCompromiso` de Agenda trata cualquier frecuencia desconocida como mensual (fallback conservador). Confirmado con sondas unitarias.
- Causa     : `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'mensual'`; el catálogo `FRECUENCIAS` y todas las tablas de factor mensual (`_FACTOR_MENSUAL` de tesorería, `FACTOR_MENSUAL` de compromisos) usan 'Mensual' capitalizado. Fix: escribir 'Mensual' + migración idempotente en storage.js que capitalice la frecuencia de los compromisos `esCuotaManejo` ya guardados.
- Archivo   : modules/dominio/tesoreria/logic.js
- Función   : `compromisoDesdeCuotaManejo`
- Líneas    : ~646-659 (el literal está en la 652)
- Secciones : Mis cuentas, Calendario, Deudas, Ahorro, Límites de gasto

### BUG-006 - El abono extra a deudas desde "Distribuir mi ingreso" no registra el gasto
- Estado    : pendiente
- Prioridad : media
- Problema  : al asignar un abono extra a una deuda en el panel de distribución, el dinero sale de la cuenta y la deuda baja, pero no queda ningún gasto con categoría "Deudas" y `compromisoId`. El abono es invisible para Análisis (gastos del mes) y para el ejecutado de Límites, y el guard "ya pagado este periodo" del checklist tampoco lo ve. El abono individual y el pago de cuota del checklist sí registran el gasto. Reproducido E2E: abono extra de $500.000 bajó deuda y cuenta, y `st.gastos` quedó vacío.
- Causa     : el handler de `distribucion:aplicar` en compromisos solo edita `saldoTotal`; nunca crea el gasto-abono que sí crea `_confirmarAbono` en el flujo individual. Fix: crear el mismo gasto (usa `cuentaOrigenId` que ya llega en el evento).
- Archivo   : modules/dominio/compromisos/index.js
- Función   : handler EventBus `distribucion:aplicar`
- Líneas    : ~696-707
- Secciones : Mis cuentas, Deudas, Análisis, Límites de gasto

### BUG-007 - El hint de cuota de manejo promete verla "en Deudas", donde nunca aparece
- Estado    : pendiente
- Prioridad : baja
- Problema  : el formulario de cuenta dice "Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Calendario y en Deudas.", pero la sección Deudas solo lista deudas desde v6 (los gastos fijos se gestionan en Calendario). La cuota de manejo es tipo fijo: solo se ve en Calendario.
- Causa     : copy desactualizado tras la decisión v6 de sacar los fijos de la sección Deudas. Fix: "Lo verás en Calendario."
- Archivo   : modules/dominio/tesoreria/view.js
- Función   : `renderFormCuenta`
- Líneas    : ~792-794
- Secciones : Mis cuentas

### BUG-008 - Las validaciones aceptan montos no finitos ('1e999' → Infinity)
- Estado    : pendiente
- Prioridad : baja
- Problema  : `validarIngreso` y `validarCuenta` aceptan '1e999' (que `Number()` convierte a Infinity): un ingreso Infinity contamina toda la distribución sugerida (montos Infinity en pantalla) y un saldo Infinity rompe el total de cuentas; al persistir, `JSON.stringify` lo serializa como `null`. Confirmado con sondas unitarias. El patrón `isNaN(x) || x <= 0` probablemente se repite en otros dominios: confirmarlo al revisar cada sección y corregirlo en el mismo pase.
- Causa     : los guards usan `isNaN` en vez de `Number.isFinite`.
- Archivo   : modules/dominio/tesoreria/logic.js
- Función   : `validarIngreso` / `validarCuenta`
- Líneas    : ~432-458 y ~524-556
- Secciones : Mis cuentas (transversal probable)
