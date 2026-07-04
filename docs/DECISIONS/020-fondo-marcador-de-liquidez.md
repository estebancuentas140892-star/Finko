# ADR 020 - El fondo de emergencia es un marcador de liquidez, no una caja con cuenta

**Estado:** Aceptada
**Fecha:** 2026-07-04
**Autores:** Claude Fable 5 (análisis y decisión, sesión autónoma autorizada por Esteban)
**Resuelve:** AH.3 (registrar el origen del dinero en el aporte) y AUD.6 (hint del modelo del fondo), que el tablero pedía decidir juntas.

---

## Contexto

El aporte al fondo de emergencia no pide cuenta de origen ni descuenta saldo. Metas y Apartados sí lo hacen (patrón AP.1: selector de cuenta vía `infra/cuenta-helper.js`, validación de saldo y sincronización). Dos tarjetas del tablero apuntaban en direcciones opuestas:

- **AH.3** proponía alinear el fondo con el patrón AP.1: elegir cuenta(s), validar saldo y descontar, "como el resto de la app".
- **AUD.6** proponía lo contrario: mantener el modelo actual y cerrar la brecha de comprensión con un hint ("este dinero sigue en tus cuentas; el fondo solo lo aparta de tu vista").

La pregunta de fondo: ¿el fondo mueve dinero fuera de las cuentas o es un marcador sobre la liquidez que ya está en ellas?

## Decisión

**El fondo de emergencia sigue siendo un marcador de liquidez.** El aporte no pide cuenta ni descuenta saldo. Se implementa el hint de AUD.6 en la card del fondo y en el formulario de aporte para que el modelo sea explícito.

### Por qué se rechaza la variante con descuento (AH.3)

1. **El modelo con descuento no tiene flujo de salida.** Una meta se cumple y un apartado se usa: ese dinero termina gastándose y tiene sentido que salga de las cuentas al comprometerse. El fondo no se gasta de forma planificada: se usa en emergencias. Con descuento, el dinero desaparecería de Mis cuentas y solo podría volver borrando aportes históricos; habría que inventar un flujo de "retiro de emergencia" completo para que el modelo cierre.
2. **Semántica correcta para el público objetivo.** Mis cuentas modela dónde está el dinero físicamente; el fondo modela cuánta de esa liquidez ya tiene un trabajo asignado. Un fondo de emergencia ES dinero disponible (para emergencias): sacarlo de las cuentas haría que Finko subrepresente el dinero real del usuario.
3. **Migración imposible hacia atrás.** Los aportes históricos no tienen cuenta de origen. Quedaría un modelo mixto (aportes que descontaron y aportes que no) imposible de explicar en lenguaje simple.
4. **Toda la app ya asume el marcador.** "Distribuir mi ingreso" (ADR 012) acredita el ingreso y descuenta lo de metas y apartados, pero no lo del fondo (`tesoreria/index.js`, filtro `tipo !== 'fondo'`). El Score de Salud, el consolidado de ahorro (ADR 009) y el motor de distribución (ADR 013) leen el fondo tal como está. Cambiar el modelo tocaría tesorería, ahorro y análisis con riesgo real de regresión en producción.
5. **La diferencia con Metas/Apartados es de propósito, no un descuido.** Metas y apartados son gasto futuro comprometido (ese dinero "ya no es tuyo"). El fondo es liquidez etiquetada (el dinero sigue siendo tuyo, con un trabajo asignado). La confusión de doble contabilidad que motivaba AH.3 es un problema de comunicación, y se resuelve con copy (AUD.6), no con un cambio de schema.

### Implementación (AUD.6)

- **Card del fondo** (`ahorro/view.js`, `_renderHero`): línea permanente bajo el objetivo: "Este dinero sigue en tus cuentas: el fondo solo lo marca como reservado para emergencias."
- **Form de aporte** (`renderFormAporte`): el hint del monto explica que registrar un aporte no descuenta las cuentas.

## Consecuencias

### Positivas

- El modelo queda explícito donde el usuario decide (card y form): se cierra la doble contabilidad mental sin migración ni riesgo.
- AH.4 (quitar "Definir" e integrar con Calendario) pierde su dependencia de AH.3: el ADR de recordatorios (AP.4/MT.2/AH.4) puede diseñarse sabiendo que el fondo es marcador.
- Cero cambios de schema, cero regresión posible sobre Distribuir mi ingreso, Score de Salud o consolidado.

### Negativas / Restricciones

- La asimetría con Metas/Apartados persiste (intencional y ahora documentada): quien busque "elegir cuenta" en el aporte del fondo no la encontrará. El hint mitiga la sorpresa.
- Si algún día se quiere modelar el fondo en una cuenta separada real (ej. un bolsillo bancario), el camino correcto es crear esa cuenta en Mis cuentas y seguir usando el fondo como marcador; no revivir la variante con descuento sin resolver primero el flujo de salida.
