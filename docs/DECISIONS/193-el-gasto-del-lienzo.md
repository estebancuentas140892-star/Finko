# ADR 193 - El gasto del lienzo

**Estado:** Aceptada (2026-11-22).
**Fecha:** 2026-11-22
**Autores:** Esteban (pedido: seguir con la página 3 del lienzo "Gastos · Rediseño integral"), Claude Design (el lienzo), Claude Opus 5.5 (implementación)
**Relación:** Aplica la página 3 ("Registrar un gasto del día a día") del lienzo `https://claude.ai/artifact/M8EZZ5L2DrnxqzAZvZAwbJ`, tarjeta GAS.15. **Cambia** el [ADR 188](188-gastos-especificacion-integral.md) D6 en el detalle (la categoría vuelve a verse arriba) y en la factura del gasto (el título vuelve al papel, la raya entre el ícono y el texto sale, vuelve el código de barras) y la cabecera bosque de GAS.C en "Revisar" de un gasto nuevo (la ficha de un gasto registrado la conserva). Conserva el criterio de gasto hormiga del [ADR 186](186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D5.

---

## Contexto

La revisión del 2026-11-22 dejó la página 3 con huecos. Monto, Categoría y la hoja de la nota ya eran las del lienzo. Faltaban: en Detalle, "¿Qué fue?" con la teja de la categoría, el aro a la izquierda y "Necesidad" y "Deseo" con su ícono; en Revisar, la hoja con su título y la barra de pasos (la app pintaba una banda bosque con "Revisa tu gasto"), "Revisa tu gasto" en el papel, la teja de la categoría, "Pagado con … queda $X", la fecha corta, la nota con "Opcional", el aviso de gasto hormiga y el código de barras.

## Decisión

### D1. Detalle: "¿Qué fue?"

- Arriba, la teja de 36 en el tono de la categoría y "¿Qué fue?"; el nombre de la categoría queda para el lector de pantalla. Sin opciones (Otros, una propia) la pregunta "¿Fue una necesidad o un deseo?" va sola, como antes.
- Cada opción con el aro a la izquierda. "Necesidad" (un chulo en círculo) y "Deseo" (una estrella) van dentro de la opción elegida, alineados con su nombre.

### D2. Revisar: la factura del lienzo

- La hoja dice "Nuevo gasto" (o "Repetir gasto") en todos los pasos, con la barra de pasos también aquí: "$4.500", "Café", "Tinto", "Revisar". Sin la banda bosque ni las hojas junto a "Guardar gasto", que es el botón de siempre.
- En el papel: "Revisa tu gasto" sobre la cifra; la categoría en su teja de 28 y con su nombre en su tono; "Tinto" y, al lado y más chica, "· Necesidad"; "Pagado con" Nequi y "queda $415.500"; la fecha corta ("Hoy, sáb 21 nov"); la nota con su rótulo y "Opcional" hasta que se escribe; el código de barras al pie. Filas de 28 sin la raya entre el ícono y el texto; los cortes, más suaves.

### D3. "Finko lo cuenta como gasto hormiga"

Si el gasto que se va a guardar sigue una racha de lo pequeño que se repite (el criterio del ADR 186 D5, `gastosHormiga`), el papel lo dice antes de guardar: "Finko lo cuenta como gasto hormiga: 4.º tinto en 30 días", con cuántos del mismo concepto van en los 30 días que terminan en su fecha (él incluido). Lo calcula `hormigaDelGasto()` en `infra/hormiga.js`; no se guarda nada nuevo.

## Alternativas descartadas

- **Dejar la banda bosque:** el lienzo la quita y deja la hoja como en los otros pasos; la marca ya va en el sello del papel.
- **Decir lo de hormiga después de guardar:** el lienzo lo pone en el papel, donde se decide si se guarda.

## Consecuencias

- Las pruebas que leían "Hoy, 16 de noviembre", "quedan", "Cuenta de origen", "Taxi · Deseo" o "Revisa tu gasto" en la cabecera cambian de texto; los campos del formulario no cambian.
- Sin cambios de datos.
- Docs: el mensual de noviembre se parte otra vez (las entradas del 13 y el 14 pasan a `changelog/2026-11-b.md`), como en GAS.10b.

## Ajustes al aplicar

- **D2:** el efectivo sigue diciendo "Sale de" y la tarjeta "Tarjeta de crédito" (el lienzo solo dibuja una cuenta). La ficha de un gasto registrado conserva su cabecera bosque y su título; queda para la página 5.
- **D2:** en pantallas bajas (360 x 640, como la página 11) el papel entero cabe sobre "Guardar gasto": filas de 42, la cifra de 32 y menos aire.
- **D3:** solo en un gasto nuevo; la ficha ya es un gasto guardado.
