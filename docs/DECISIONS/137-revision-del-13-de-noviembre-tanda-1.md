# ADR 137 - Revisión del 13 de noviembre, tanda 1

**Estado:** Aceptada y aplicada (2026-11-13, SW v694).
**Fecha:** 2026-11-13
**Autores:** Esteban (la revisión por secciones y el orden: "Sí, arranca"), Claude Opus 5.5 (diagnóstico, implementación y redacción)
**Relación:** primera tanda de la revisión que Esteban envió el 2026-11-13 (14 puntos en Registro, Inicio, Deudas, Movimientos y General). Las tandas 2 y 3 y el punto de los ojos son las tarjetas REV.2a a REV.4 de [`board/transversal.md`](../board/transversal.md). **Completa** la ficha 05 ([ADR 069](069-bloque-gastos-en-la-barra-movil.md): la fila de altas del grupo visible, que el tablero tenía anotada). **Acota** el [ADR 121](121-buscar-la-nube-en-el-avatar-y-las-pruebas-del-canvas.md) D1 (los atajos antes de escribir) y el [ADR 017](017-limites-centro-de-control.md) D7 solo en el banner de Límites. **Conserva** el [ADR 124](124-el-nino-en-el-telefono.md) D9 (la teja de la primera pantalla va a la izquierda) y el [ADR 106](106-un-encabezado-tres-niveles.md) D3 (un solo ojo), que queda para decidir en REV.4.

---

## Contexto

Esteban usó la app en su teléfono y anotó lo que le estorba. Se diagnosticó cada punto contra el código y el historial antes de tocar nada. Esta tanda reúne lo que no necesitaba una decisión nueva: errores, textos y un atajo que estorbaba.

## Decisión

### D1. "Agregar" de Por pagar depende de la pestaña

Con "Fijos" abre de una vez el formulario de gasto fijo; con "Deudas", el de deuda, que ya pregunta entidad o personal. Con "Todo" y "Pagado" sigue la hoja de tres opciones. El `aria-label` del botón dice qué abre. El "+ Agregar" del bloque Gastos es un espejo del original y hereda el cambio.

### D2. Los vacíos de "Fijos" y "Deudas" traen su botón

"Aún no tienes gastos fijos" con "Agregar gasto fijo" como primario, y "Aún no tienes deudas registradas" con las dos filas (entidad y personal) del vacío de la sección. Llevan `empty-state--caminos`, así que el "+" del encabezado se esconde (ADR 107 D5). Antes decían "Nada en "Deudas" este mes. Toca "Todo"", sin salida para crear y con un "este mes" falso: esos dos chips no dependen del mes. "Pagado" sí depende y conserva su mensaje.

### D3. Registro: el logo centrado y la instalación avisa

- En la primera pantalla, el isotipo se centra dentro de su teja. Una regla de la piel del niño (`justify-content: flex-start`) lo pegaba al borde izquierdo. La teja sigue a la izquierda con el texto (ADR 124 D9).
- Al aceptar la instalación, "Instalando Finko…"; al terminar, "Finko quedó instalada". Mientras el navegador pregunta, el botón no responde a un segundo toque.
- Ajustes deja de ofrecer "Instalar Finko" en la pestaña desde la que se instaló (`instaladaDesdeEsteNavegador()`). Si el navegador vuelve a ofrecer instalar, lo recordado deja de valer.
- Fuera de iPhone y sin el aviso del navegador ya no se abren las instrucciones del iPhone: un aviso dice dónde está "Instalar app" en el menú.

### D4. Los botones redondos no muestran un cuadro

- Sin el resaltado del navegador al tocar (`-webkit-tap-highlight-color: transparent`). La respuesta al toque de los botones que no son `.btn` es bajar la opacidad, que respeta su forma, con especificidad mínima para que cualquier `:active` propio mande.
- El anillo de foco ya no cambia el radio del control: `a11y.css` le ponía un radio chico a todo lo enfocado y un botón redondo se volvía cuadrado al tocarlo. Solo el enlace de texto conserva ese radio. El foco por teclado sigue visible.
- El ojo y el círculo de "Me pagó" tienen radio completo; el foco de "Registrar" se marca en su pastilla y no en la caja con su etiqueta.

### D5. Buscar en Movimientos ofrece solo lo que buscaste antes

"Por categoría" y "Por tipo y cuenta" salen del panel que se abre al tocar la búsqueda. Repetían la fila de filtros y, entrando por la lupa con el teclado abierto, dejaban la lista fuera de la pantalla. La categoría y la cuenta siguen llegando como filtro desde Límites y Mis cuentas (ADR 089 D3). Sin búsquedas recientes el panel no se abre.

### D6. El banner de Límites habla del problema, no de un plan

"¿Gastas más de lo que pensabas y no sabes en qué se fue el dinero? Es común: las compras del día a día se suman sin que lo notes. Límites de gasto te deja decidir cuánto quieres gastar en cada cosa, como restaurantes o transporte, y te avisa antes de pasarte, no después." El banner solo se ve sin ingresos ni límites: quien lo leía no tenía el plan que nombraba, y un límite se crea sin plan desde el ADR 085. La relación con Mis cuentas sigue en la franja "Tu plan de…" cuando hay plan.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Centrar también la teja en la primera pantalla | el ADR 124 D9 la pone a la izquierda con el texto; lo que estaba mal era el logo dentro de ella |
| Quitar el panel de búsqueda completo | "Buscaste antes" ahorra escribir lo que se repite y ocupa una fila |
| Esconder también la línea bajo el título de Movimientos | el ADR 134 se aceptó hoy; lo que estorbaba era el panel |
| Variante B del texto de Límites ("¿Sabes cuánto puedes gastar en cada cosa este mes?") | habla en plural ("gastamos") y pregunta por un dato; los otros diez banners abren con el problema y en tú |

## Consecuencias

- `categoriasFrecuentes()` queda sin uso en la app; sigue con sus pruebas por si Análisis o el extracto (REV.3a) la piden.
- Todo cambia en los dos anchos salvo lo que ya era del teléfono (el ojo, "Registrar", el bloque Gastos).
