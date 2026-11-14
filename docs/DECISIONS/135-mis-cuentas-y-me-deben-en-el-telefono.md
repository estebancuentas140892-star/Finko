# ADR 135 - Mis cuentas, Distribuir y Me deben del adulto en el teléfono

**Estado:** Aceptada (2026-11-13). Se aplica en cuatro tandas: (1) Mis cuentas: el total, las cuentas, tu ingreso y "Reparte" (SW v689, aplicada); (2) la hoja de una cuenta y Transferir (SW v690, aplicada); (3) Distribuir, paso 1 (SW v691, aplicada); (4) Me deben y sus hojas (SW v692, aplicada). El tablero queda aplicado completo y su HTML se borró.
**Fecha:** 2026-11-13
**Autores:** Esteban (diseño y decisión: "vamos a seguir aplicando los cambios de diseño propuestos en esta carpeta"), Claude Opus 5.5 (auditoría, implementación y redacción)
**Relación:** **Aplica** el tablero "Finko móvil · rediseño4" (Claude Design, `Diseño Finko/`), la quinta pieza de MV2.30, sobre la identidad del [ADR 127](127-identidad-bosque-y-sol.md). **Cambia** el encabezado de ingresos del [ADR 080](080-mis-cuentas-un-primario-y-lo-informativo-al-pie.md) D2 en los dos anchos ("Fuentes de ingreso" con su frase y el atajo "Ingreso" pasan a "Tu ingreso" con "Ingreso fijo" y "De una vez", sin la marca "Atajo", que también sale de "Transferir entre cuentas"; **acota** así la R72 para este par: los dos nombres dicen la diferencia que la marca no decía) y, solo en el teléfono, la barra de composición del total ([ADR 035](035-mis-cuentas-v2.md) D3: la pastilla con cuántas cuentas) y el rótulo oculto "Tus cuentas" ([ADR 075](075-mis-cuentas-dos-trabajos-a-la-vista.md) D4: a la vista). **Cambia** el nombre del botón del vacío de Me deben ([ADR 074](074-me-deben-adopta-la-anatomia-de-deudas.md) D5: "Nuevo préstamo" pasa a "Registrar un préstamo"; la barra de escritorio sigue diciendo "Nuevo préstamo"). **Conserva** la tarjeta de identidad de Mis cuentas ([ADR 127](127-identidad-bosque-y-sol.md) D5), las filas con hoja de Mis cuentas ([ADR 109](109-mis-cuentas-en-filas-con-hoja.md)), Distribuir sobre Inicio ([ADR 110](110-distribuir-sin-salir-de-donde-estas.md)) y a Tino en los vacíos ([ADR 129](129-tino-ronda-2-en-el-adulto.md)).

---

## Contexto

El tablero compara, para Mis cuentas, Distribuir y Me deben, la pantalla de hoy (capturas del 2026-11-04) con una propuesta: Mis cuentas con uso normal, usuario nuevo y a 360 px con nombres largos; la hoja de una cuenta y la de Transferir; el paso 1 de Distribuir; Me deben con uso normal, sin préstamos y a 360 px con seis préstamos; la hoja de un préstamo y "Me pagaron". Se auditó cada propuesta contra la app de hoy fotografiada con datos parecidos.

## Decisión

### D1. Mis cuentas arriba (tanda 1)

En el teléfono la tarjeta del total dice "Tu dinero en cuentas", el total y una pastilla con cuántas cuentas activas hay. "Tus cuentas" va a la vista. Cada cuenta es una fila con su nombre, su saldo y, debajo, qué es: "Ahorros · Bancolombia", "Billetera digital", "Lo que llevas encima" para el efectivo y "aplica 4x1000" cuando aplica. "Transferir entre cuentas" es un botón a lo ancho, sin la marca "Atajo".

### D2. Tu ingreso (tanda 1)

"Tu ingreso" sin frase debajo. Cada ingreso fijo es una fila con su monto en verde y, debajo, cuándo llega: "Cada mes, el día 1 · el próximo llega en 18 días". Debajo, "Ingreso fijo" y "De una vez" lado a lado, con la nota "Fijo: tu salario o un arriendo que recibes. De una vez: una venta, un trabajo suelto o un regalo." Sin ingresos, una tarjeta: "Aún no registras de dónde entra tu dinero", para qué sirve, "Agregar mi ingreso fijo" y "¿Te entró dinero una sola vez? Regístralo".

### D3. Reparte tu ingreso (tanda 1)

"Reparte tus $4.200.000" y "Recibiste tu salario el 1 de nov"; necesidades, estilo de vida y ahorro en filas con su monto, "Hoy 65% · lo recomendado es 50%" y una barra con una rayita en lo recomendado; al pie, qué marca la rayita y la primera razón de la propuesta, "Distribuir mi ingreso" y "Por qué esta propuesta".

### D4. La hoja de una cuenta (tanda 2)

La cuenta con su saldo; tipo, 4x1000 y cuota de manejo en filas; "Ver sus movimientos" como fila ("Se abre Movimientos solo con esta cuenta"); "Editar la cuenta" y "Eliminar la cuenta" con "Te pediremos confirmar".

### D5. Transferir (tanda 2)

"Transferir entre cuentas · Pasa dinero de una cuenta a otra"; "Sale de" y "Entra a" como filas con lo que tiene cada cuenta y "Cambiar"; "¿Cuánto vas a pasar?"; "Es un movimiento entre tus cuentas: tu total no cambia."; el botón dice el monto: "Transferir $200.000".

> **Texto ampliado el 2026-11-13 (REV.2c):** al transferir a una cuenta, la nota suma "No es un ingreso, pero tu banco puede reportarlo a la DIAN como una consignación. Finko la guarda en Movimientos por si la necesitas al declarar renta." Al pasar a efectivo queda solo la primera frase. Texto corrido, sin caja ni color de alerta ([ADR 107](107-el-peso-de-cada-cosa.md) D4).

### D6. Distribuir, paso 1 (tanda 3)

Arriba el monto y de dónde vino ("Salario · entró a Bancolombia", con "Cambiar"); "Paso 1 de 3" con tres puntos; "¿Qué necesidades pagas con este ingreso?" y "Lo recomendado es dejarles el 50%. Hoy van en 65%."; cada necesidad una fila marcable con su teja, monto y "Día 14 · educación"; al pie "Asignado" y "Queda" y "Siguiente: estilo de vida".

### D7. Me deben (tanda 4)

Bajo el título, "Dinero que prestaste y te van a devolver". "Te deben" con el total y "Te han devuelto $180.000 de $450.000"; la nota de tocar el círculo cuando te paguen. Los grupos en frase con su suma ("La fecha ya pasó", "Sin fecha pactada", "Con fecha por delante", "Ya te pagaron"); cada préstamo una fila con un círculo para "Me pagó", quién, cuánto falta y de cuánto, y debajo cuándo y para qué.

### D8. La hoja de un préstamo y "Me pagaron" (tanda 4)

La hoja dice cuánto falta, cuánto devolvió y su parte, cuándo le prestaste y de qué cuenta, cuándo pactó devolver, el motivo y los abonos, con "Me pagó", "Editar el préstamo" y "Eliminar el préstamo". "Me pagaron" dice lo prestado y lo devuelto, cuánto falta, "¿Cuánto te pagó?" (con todo lo que falta puesto), "¿A qué cuenta entró?" y "Registrar $150.000".

## Lo que se ajusta al pasar del tablero a la app

| El tablero dice | La app dice | Por qué |
|---|---|---|
| El total suelto, sin tarjeta | la tarjeta de identidad de Mis cuentas, con la pastilla adentro | ADR 127 D5, posterior al tablero |
| Una teja con la inicial del banco ("B", "N") | el logo del banco que ya tiene la cuenta | la teja con inicial era un sustituto del tablero |
| "Ahorros · Bancolombia" bajo una cuenta que se llama "Bancolombia" | "Ahorros"; con nombre propio, "Ahorros · Bancolombia" | MC.15a: el banco ya es el nombre y se leería dos veces |
| "Transferir entre cuentas" con una sola cuenta | solo con dos o más | con una no hay a dónde pasar el dinero (MC.17b) |
| "Recibiste tu salario el 1 de nov" | "Recibiste tu ingreso el 1 de nov." | el nombre del ingreso es de la persona ("Pago Ecopetrol"); en minúscula dentro de la frase se leería raro |
| Un bombillo en la tarjeta de reparto | Tino pensando | ADR 127 D6 y 129: Tino va ahí, en lugar del bombillo |
| "Por qué esta propuesta" como enlace | un plegable con las razones, al pie | la primera razón ya va en la nota; el resto se abre en su lugar, sin otra hoja |
| Sin los ingresos de una vez en la lista | siguen en la lista, debajo de los fijos | son movimientos de la persona; el tablero no los muestra, no los quita |
| La hoja de la cuenta sin el dato para recibir | "Para recibir" con la llave o el número, si la cuenta lo tiene | MC.14: es lo que se consulta para que a uno le consignen; antes iba como nota de la hoja |
| "Cambiar" en las dos cuentas de Transferir, que abre una lista | con dos cuentas, "Cambiar" invierte el par; con tres o más, las dos listas a la vista | con dos solo hay una respuesta posible (MC.17b); con más, la lista abierta ahorra un toque |
| Transferir sin fecha ni nota | "Cambiar la fecha o agregar una nota", plegado | la fecha (hoy por defecto) y la nota siguen existiendo; el tablero no las muestra |
| "Transferir entre cuentas · Pasa dinero de una cuenta a otra" en la cabeza | el título en la cabeza y la frase al empezar el formulario | la cabeza de los modales tiene un solo renglón |
| "Siguiente: estilo de vida" desde el paso 1 | "Siguiente: ahorro" | en la app el paso 2 es ahorro, deudas e inversiones, y estilo de vida va al final (MC.7d) |
| Sin "Cómo lo calculamos y otros métodos" | plegado al final del paso 1 | los métodos y "Personalizar" siguen siendo la forma de cambiar la propuesta (ADR 110 D5) |
| La comparación con los expertos fuera del paso | en el teléfono, solo la frase del paso ("Lo recomendado es dejarles el 50%. Hoy van en 65%."); en escritorio sigue el bloque | la frase dice lo mismo en un renglón |
| "Asignado $X" y "Queda $Y" en dos columnas | "Asignado $X · Queda $Y" en la línea del pie | el pie ya cambia de texto cuando falta algo para distribuir (ADR 110 D3) |
| Me deben sin el grupo de lo que vence hoy | "La fecha es hoy" aparte, con su suma, cuando hay alguno | ADR 088 D1: lo que vence hoy no cabe en "La fecha ya pasó" ni en "Con fecha por delante" |
| Me deben sin el historial por persona | "Por persona" sigue al pie | PE.6e; el tablero no lo muestra, no lo quita |
| El vacío "Lleva la cuenta de lo que prestas" con una teja | la pregunta del banner con Tino, y "Registrar un préstamo" dentro de su tarjeta | ADR 127 D6 y 129 D3; el mismo vacío de Reservas (ADR 133 D4) |
| La hoja del préstamo sin el interés | "Interés" en sus filas si el préstamo lo tiene; el abono de la migración dice "Antes de este historial" | PE.1 y ADR 089 D1: el mismo rótulo que en Movimientos |
| "Te pagó Andrés · Préstamo · arreglo del carro" en la cabeza de "Me pagaron" | "Te pagó Andrés" | la cabeza de los modales tiene un solo renglón |
| "¿A qué cuenta entró?" como una fila con "Cambiar" | el selector de cuenta de siempre, con la del préstamo puesta | el selector compartido ya resuelve cero, una y varias cuentas (PE.7) |

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Aplicar también la composición nueva en escritorio | el tablero solo mira el teléfono; en escritorio la composición de dos columnas (ADR 075) ya ordena lo mismo |

## Consecuencias

- Lo que es contenido (frases, nombres de botones) cambia en los dos anchos; la composición en filas, solo bajo 1024 px.
- Cada tanda se publica sola, con su prueba y su versión del Service Worker.
