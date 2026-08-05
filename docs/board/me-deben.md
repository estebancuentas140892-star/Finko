# Tablero - Me deben

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `personales`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Me deben (dominio `personales`)

#### PE.6d - Me deben: los cinco estados de un vistazo
- Prioridad  : media-alta
- Estado     : bloqueada. Última rebanada viva de PE.6; las demás cerraron el 2026-08-05. Decisión dueña: **[ADR 047](../DECISIONS/047-me-deben-v2-intereses-e-historial.md)** D6.
- Objetivo   : que al día, próximo a vencer, pago parcial, vencido y finalizado se distingan de un vistazo, con los semánticos que ya existen.
- Secciones  : Me deben (`personales`)
- Archivos   : `modules/dominio/personales/view.js`, `styles/components/domain.css`
- Depende de : **IV.2 en producción** (ADR 047, punto 2 de "Qué falta para cerrarlo"): pintar antes es pintar dos veces
- Riesgo     : sin colores nuevos (ADR 031); el chip ya existe y esto es evolución visual, no un estado nuevo
- Modelo     : Media capacidad - Medio
- Nota       : arrastra **V3** de la auditoría de diseño (acortar el copy de `labelEstado()`)
