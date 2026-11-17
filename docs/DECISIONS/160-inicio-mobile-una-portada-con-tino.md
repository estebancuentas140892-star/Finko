# ADR 160 - Inicio móvil: una portada con Tino y los bloques accionables

**Estado:** Aceptada (2026-11-17). Pedido de Esteban: aplicar fielmente la referencia a Inicio, conservando la identidad de Finko y limitado a móvil.
**Fecha:** 2026-11-17
**Autores:** Esteban (referencia y alcance), Codex (adaptación visual)
**Relación:** **Amplía** el [ADR 127](127-identidad-bosque-y-sol.md) D6: Tino también acompaña el saldo en el teléfono cuando hay cuentas. **Conserva** el resto de la identidad v3, la banda bosque de Inicio (D7) y el vacío de la hamaca del [ADR 155](155-inicio-tino-descansa-en-la-hamaca.md).

---

## Contexto

La referencia organiza Inicio como una portada móvil: saludo, dinero disponible con el personaje, una acción urgente, lo que viene durante la semana y dos listas de seguimiento. La app ya tenía el orden y los datos de esos bloques; faltaba acercar su presentación a la referencia.

## Decisión

### D1. Tino acompaña el saldo en el teléfono

`tino-reserva.svg`, el dibujo original ya incluido y precargado por el Service Worker, aparece junto al monto solo bajo 768 px. La cifra y la ficha de cuentas siguen visibles, el ojo sigue controlando la privacidad y la guía de quien aún no tiene cuentas conserva su propia puesta. En tablet y escritorio no cambia la composición.

### D2. Los bloques se reconocen por sus títulos

En móvil, "Atención hoy", "Esta semana", "Por completar" y "Novedades" llevan un ícono junto al título. Las listas mantienen sus datos y acciones actuales. Las tarjetas ganan el relieve suave del sistema visual y la fecha de la semana un tinte verde de éxito. El color bosque, el modo claro u oscuro elegido y la barra de navegación de Finko se conservan.

### D3. Alcance

No cambia la lógica financiera, el orden de prioridad, la navegación, los textos de estado ni los flujos de pago y distribución. La referencia guía la jerarquía y el peso visual; los colores, Tino y la tipografía siguen siendo los de Finko. El cambio se limita a la vista de teléfono, hasta 767 px.

## Consecuencias

- Inicio móvil incorpora una ilustración de Tino junto al saldo y más relieve en las tarjetas de atención.
- La actualización del Service Worker hace llegar los estilos y el marcado nuevos a la app instalada.
- Inicio en tablet y escritorio mantiene su composición.
