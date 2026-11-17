# ADR 156 - Registrar gasto en el teléfono: la hoja del tablero integral y lo que la hacía fallar

**Estado:** Aceptada (2026-11-17).
**Fecha:** 2026-11-17
**Autores:** Esteban (pedido "GASTOS, mejoras funcionales y de comportamiento" y tablero "Gastos · Rediseño integral"), Claude Opus 5.5 (implementación)
**Relación:** Mitad funcional del tablero; las cabeceras, el hero y la lista del mes van en el [ADR 157](157-gastos-encabezados-sin-registro-y-lista-del-mes.md) (GAS.4, otra sesión, archivos repartidos por mensaje). **Cambia** el [ADR 142](142-formularios-por-tarea.md) D3 (en Registrar gasto ya no hay salida al teclado del teléfono), D4 ("Guardar y registrar otro" y la frase del recibo salen) y D9 (el aviso de saldo deja de ofrecer cómo completar), y el [ADR 132](132-gastos-del-adulto-en-el-telefono.md) D6 (el vacío de Gastos sin botón propio). Reutiliza la fila del [ADR 153](153-inicio-control-del-pago-y-desplegable-de-cuentas.md) D3. Todo bajo 1024 px salvo D2 (escritorio) y D9 (todas las hojas con calendario).

---

## Contexto

El pedido trae doce puntos; el tablero, ocho páginas de la hoja "Nuevo gasto" y "Gastos · primera vez". Revisado contra el código (`origin/main` en `cde4e049`), los textos citados seguían todos en la app. Tres eran defectos reales:

- **El calendario de "Otra fecha"** ponía cada número pegado a la izquierda de su botón de 44 px: `reset.css` da `text-align: left` a todo `<button>` y `.calf__dia` no lo corregía. Los días quedaban corridos respecto de su letra y el círculo del elegido, descentrado. `semanasDelMes` (primer día, días del mes, bisiestos) estaba bien.
- **El destello de la Nota.** Al abrirse el teclado, `llevarCampoALaVista` (`ui/teclado.js`, REV.2b) veía el campo dentro de la franja de 96 px del pie de la hoja y llamaba `scrollIntoView`. Pero en la mini-hoja el pie que el campo tiene debajo es el suyo ("Listo"): el campo ya estaba a la vista. En iOS ese desplazamiento mueve el área visible; la hoja, pegada a ella, se mueve con cada `scroll`, y con `scroll-behavior: smooth` la persecución duraba lo suficiente para que la página asomara sin velo por arriba.
- **"Usar el teclado del teléfono"** quedaba guardado (`S.config.tecladoTelefono`): quien lo tocó una vez perdía el teclado de Finko en todos los montos.

## Decisión

### D1. Lo que va en cada ADR

Los puntos 1 ("+ $X en fijos y deudas", sus "Ver" y "Todo el dinero que se te va") y 2 (los botones de registro de arriba a la derecha) son del ADR 157. Los apartados de Por pagar y Límites no cambian: el botón central abre su alta (verificado: "¿Qué quieres agregar?" y "Nuevo límite de gasto") y Día a día abre "Nuevo gasto".

### D2. El vacío de la primera compra

Mes corriente sin gastos: Tino (`explica`, 136 px), "Anota tu primera compra" y "Toca el botón + de abajo y regístrala en tres pasos.", sin botón. Una flecha punteada baja hasta el botón central y un halo late en él; los dos van fijos sobre la barra, calibrados al círculo de 56 px que sube 26 px (`.sidebar .nav-item__fab`), y la flecha se estira con el alto que queda (`--gastos-guia-alto`). En el teléfono el banner de propósito de Gastos no se pinta: el vacío ya trae a Tino. En escritorio manda el primario del encabezado: con el banner (sin ningún gasto) el vacío calla; sin él, dice "Usa «Registrar gasto», arriba...". El vacío de un mes pasado no cambia (DIS.4/G7).

### D3. El recibo dice cada dato una vez

Arriba, la categoría en una pastilla con su ícono, el lápiz (vuelve al monto) y el monto. Salen el monto en letras y la categoría repetida bajo la cifra; la subcategoría vive en su fila ("¿Qué fue?"). Cada fila: rótulo a la izquierda, valor a la derecha ("Elegir" o "Agregar" si está vacía, en el color de la acción). La fecha va en una línea ("Hoy, 16 de noviembre", `fechaDelRecibo`). Se conservan todos los campos que guarda el gasto: `monto`, `categoria`, `subcategoriaId`, `caracter`, `cuentaId`, `cuotas`, `avanceTC`, `fecha`, `nota`.

### D4. Un solo teclado para el monto

`htmlTecladoFinko({ sistema: false })` y `montarTecladoFinko(..., { sistema: false })`: Registrar gasto no ofrece "Usar el teclado del teléfono" y no mira la preferencia guardada. El campo sigue aceptando un teclado físico y pegar; las 12 teclas son botones reales para un lector de pantalla. Las demás hojas con monto conservan la opción (el pedido es de Gastos).

### D5. "¿Con qué pagaste?" es la fila de Inicio

`htmlOpcionCuenta` (`infra/cuenta-helper.js`) sale de `htmlHojaCuentaPago` y la usan las dos hojas: logo, entidad (`nombreCortoCuenta`), tipo (`tipoDeCuenta`), saldo y el círculo. Las tarjetas van en su grupo con "Cupo disponible". El saldo respeta el ojo. Sale "Al tocar una, vuelves al recibo." y el desplegable propio del gasto.

### D6. Si la cuenta no alcanza, un mensaje y no se guarda

Bajo "Sale de" ("Tienes $0" en ámbar): "**No tienes saldo suficiente en esta cuenta: faltan $X.** Elige otro método de pago para completar el gasto." y "Guardar gasto" apagado. Cambiar de cuenta repinta el recibo, así que el mensaje sigue a la elegida. `_guardarGasto` lo vuelve a comprobar (un Enter, un saldo que cambió en otra pestaña) y no registra nada. Salen "Completar con...", "Pagar todo con..." y "A ... le quedarían...": Finko no reparte ni deja la cuenta en negativo por su cuenta, como en Inicio (ADR 153 D5). `planSiNoAlcanza` queda en la cuenta y lo que falta. La cifra que falta se agrega al texto del tablero: el pedido pide identificarla e Inicio la dice. Escritorio conserva su reparto y su confirmación de sobregiro.

### D7. Una sola acción al pie

"Guardar gasto", al pie de la hoja como "Continuar". Salen "Guardar y registrar otro" y "Toca cualquier dato para cambiarlo.". La ficha de un gasto guardado conserva "Cada cambio se guarda solo y lo puedes deshacer.": no es una instrucción de uso, dice qué pasa al cambiar.

### D8. El campo de una mini-hoja no se desplaza

`llevarCampoALaVista` no mueve un campo que vive en una `.mini-hoja`: la mini-hoja ya está pegada al borde de abajo de la hoja, que está pegada al área visible. Vale para toda hoja por etapas con una mini-hoja de texto. No se tapó el destello con un fondo.

### D9. Cada día bajo su letra

`.calf__dia` centra su número (`inline-grid`, `place-items: center`, `text-align: center`, sin relleno) y es un círculo que ocupa su columna hasta 44 px (`aspect-ratio: 1`): no se vuelve óvalo a 320. Arreglo de CSS, sin posiciones fijas; la lógica tiene pruebas nuevas (el 1 de cada mes de 2026 en su columna, febrero de 2028 con 29 días, de diciembre a enero).

### D10. Las categorías, enteras y a la vista

"Elige la categoría en la que gastaste tu dinero", sin la frase de debajo. Dos columnas con el ícono a la izquierda, sin guiones ni cortes: a 390 todas en una línea; desde 375 el texto baja medio punto y una categoría larga pasa a dos líneas entre palabras; a menos de 340 de ancho, una columna. Hasta 760 de alto las tejas se compactan. No se tocan los nombres ni el catálogo.

### D11. "¿Qué fue?" como lista

La subcategoría y "¿Es un gusto o una necesidad?" se eligen en una lista con su círculo; debajo del título, la categoría y "Opcional". Mismos campos, mismo `fieldset` deshabilitado fuera de su categoría y mismas reglas: nada obligatorio.

### D12. Sin desplazar

Medido el cuerpo de la hoja: monto, categoría y recibo caben sin desplazar a 390 x 844, 375 x 667 y 360 x 740; el vacío no desplaza la página. A 320 x 568 la hoja desplaza por dentro. No se tocó el desplazamiento de la app: el resto de pantallas, listas e historiales siguen igual.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Dejar "Completar con otra cuenta" en el recibo | El pedido pide un solo mensaje; repartir sin que el usuario elija lo descartó el ADR 153 D5. |
| Dejar registrar en negativo cuando ninguna cuenta alcanza | Registraría un saldo que no existe (ADR 153). Con todas en cero y sin tarjeta, el gasto espera a que se registre el dinero. |
| Quitar "Usar el teclado del teléfono" en todas las hojas | Fuera del alcance del pedido; queda como decisión aparte. |
| Cortar "Cuidado perso..." como el tablero | El pedido lo prohíbe; se ajustaron márgenes y tamaño. |
| Halo con `body:has(...)` sobre el botón real | Reestiliza la página en cada cambio de sección (MV2.28). Va como pieza fija del vacío. |
| La nota en un `textarea` | Enter dejaría de cerrar la mini-hoja; se agrandó el campo. |

## Consecuencias

- El destello se reprodujo y se verificó con un `visualViewport` emulado en Chromium, no en un iPhone: queda para la prueba real de REV.3b.
- La flecha del vacío se calibró con el encabezado de GAS.4a; si la barra o el botón central cambian de medida, se recalibran `--gastos-guia-boton` y `--gastos-guia-alto` (`domain.css`).
- `.recibo`, `.mini-hoja` y `.calf` son compartidas: lo de este ADR va acotado a `#form-gasto` y `#gasto-mini-*`, salvo D8 y D9, que mejoran también las otras hojas.
