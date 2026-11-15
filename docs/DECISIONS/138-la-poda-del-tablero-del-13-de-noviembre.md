# ADR 138 - La poda del tablero del 13 de noviembre

**Estado:** Aceptada y aplicada (2026-11-13, solo documentación).
**Fecha:** 2026-11-13
**Autores:** Esteban (el pedido: mirar "cuáles de verdad aportan" y "cuáles son simples rellenos", para no cambiar la app constantemente; la aprobación: "Sí, aplícala"), Claude Opus 5.5 (revisión contra el código y redacción)
**Relación:** **Cierra** MOV.1 con 17 de sus 25 fichas y deja sin efecto la restricción de su tarjeta ("el orden no se altera"). **Acota** el plan del [ADR 091](091-un-hecho-financiero-se-informa-una-vez.md): de 24 rebanadas quedan seis tarjetas y ninguna espera a la ficha 18. **Conserva** el [ADR 106](106-un-encabezado-tres-niveles.md) D3 (un solo ojo) y el [ADR 042](042-formularios-v2-visual.md) D2 (todas las categorías a la vista). **Da por cumplidos** el [ADR 101](101-finko-del-adulto-decide-no-ensena.md) D5 en lo esencial y el [ADR 033](033-direccion-visual-premium.md) D3 por otra vía (Tino en los vacíos, [ADR 127](127-identidad-bosque-y-sol.md) D6 y [129](129-tino-ronda-2-en-el-adulto.md)). Abre BUG-039.

---

## Contexto

MV2.3 y MV2.30 ([ADR 116](116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](136-ajustes-del-adulto-en-el-telefono.md)) rehicieron cada pantalla del teléfono, y a Esteban le gusta cómo quedó. Pidió revisar lo pendiente con un criterio: se queda lo que corrige una cifra que el usuario lee o algo que le estorba al usarla; sale lo que rehace lo recién hecho, lo que ya existe, lo que no cambia nada para quien usa la app y lo que espera a algo que no va a pasar. Cada tarjeta se revisó contra el código y los ADR antes de decidir.

Antes de la poda: MOV.1 en pausa con ocho fichas y unas cuarenta preguntas abiertas para su ficha 18, las 24 rebanadas de HF y 22 tarjetas más (47 entradas).

## Decisión

### D1. MOV.1 se cierra con 17 de 25 fichas

Las fichas 18 a 25 auditaban, con el handoff de agosto, pantallas que MV2.30 volvió a dibujar; el handoff no está en el repositorio (`.gitignore`, `*-handoff/`). Lo que la tarjeta dejó abierto tiene este destino:

| Pendiente de MOV.1 | Destino |
|---|---|
| Deuda de la 05: la fila de altas del grupo visible y "Ver plan de salida" | hechas: [ADR 137](137-revision-del-13-de-noviembre-tanda-1.md) D1 y D2, y la hoja del plan de salida ([ADR 119](119-plan-de-salida-en-hoja-y-el-detalle-del-gasto.md), [132](132-gastos-del-adulto-en-el-telefono.md)) |
| Día vencido en ámbar o en rojo (08, K5) | resuelto: rojo en Calendario, Inicio y Por pagar |
| Historial fechado de metas y reservas (15) y "Ya lo usé" sin gasto (V5, 10) | HF.1c |
| Naturaleza y dirección del movimiento (R90, fichas 14 a 16) | HF.1b, que escribe su ADR sin esperar la redacción de R90 |
| El monitor de renta sin auditar (16) | no se audita; su error verificado es BUG-039 |
| Valor de mercado de una inversión (13) | no va (D2) |
| Vitrina de Logros (19) | no va: el adulto no tiene vitrina ([ADR 101](101-finko-del-adulto-decide-no-ensena.md), [127](127-identidad-bosque-y-sol.md) D9) |
| Reglas candidatas R86 a R91 (con R89a y R89b) | no se consolidan: las pantallas nuevas ya las aplican donde importaban |
| Estado terminal de las cuatro bolsas, techo del comparador, umbrales de aparición, "Tu dinero" por tema, los tres grupos en Análisis, tráfico a Mis cuentas, aviso de tasa de ahorro, "arreglado solo en escritorio", contador con denominador inalcanzable, "Tu progreso" en Inicio | no se abren: ninguna tiene un problema que el usuario vea hoy |
| Estilo muerto `.fondo-card__principal` y `resumen/logic.js` sin consumidor | limpieza de paso, sin tarjeta |

### D2. La iniciativa HF queda en seis tarjetas

**Quedan:**

- **HF.1b absorbe HF.1a**: el consumo con tarjeta y su pago, y todo abono a deuda, dejan de contar dos veces como gasto (riesgos 3, 4 y 6 del 091).
- **HF.1d absorbe HF.1g**: todo cambio de saldo deja registro, también borrar un abono de Me deben (riesgos 7 y 10).
- **HF.1c**: la fecha de cada aporte a metas y reservas, con V5.
- **HF.2a** (la cuenta habitual) y **HF.2b** (el débito automático sin saldo, antes de vencer).
- **HF.3e absorbe HF.3f y HF.3g**: lo que la app instalada muestra fuera de ella (el número en el ícono, los accesos directos, la notificación que abre su elemento y sin montos con el candado).

**Salen:**

- **HF.0f y HF.0g**: el banco de perfiles no está en esta copia ni en los dos stash, y los tres errores que encontró (BUG-035, BUG-036 y BUG-038) tienen sus propias pruebas desde 5c97b98. La invariante que importa ("nada se cuenta dos veces") entra con HF.1b.
- **HF.1e**: el valor de mercado solo vale si el usuario lo actualiza a mano.
- **HF.2c, HF.2d y HF.3d**: sugerir un pago fijo, medir la completitud de los datos y posponer un aviso no resuelven nada que estorbe hoy.
- **HF.3a a HF.3c**: el Calendario se rediseñó en el [ADR 134](134-consultar-del-adulto-en-el-telefono.md). "Antes de tu próximo ingreso" vuelve, si vuelve, como una línea donde ya se lee el saldo y con su propio triaje.
- **HF.4a a HF.4f y HF.5a**: pasan a NUBE.4, "no iniciar": las tres son traer movimientos del banco. Si se retoma, empieza por importar el extracto CSV (HF.4d), que no toca el ADN.

### D3. La revisión del 13 de noviembre

- **REV.2a y REV.2c** quedan como estaban.
- **REV.2b se recorta**: queda el campo enfocado que sube sobre el teclado (en todos los formularios), "¿Cuánto pagas?" primero y nota y débito en "Más opciones". Sale "6 frecuentes y N más": el ADR 042 D2 lo rechazó con razón escrita (esconder categorías recrea la fricción del desplegable) y la primera entrega del canvas (MV2.17) lo respetó. Su ADR anota también ese descarte, que era MV2.28 (c).
- **REV.3a se reduce** a "Descargar el mes para Excel" desde Movimientos, que reemplaza "Exportar gastos a Excel" de Ajustes (hoy solo gastos). La hoja del extracto y el PDF salen: Movimientos ya muestra el mes por día y Análisis por categoría.
- **REV.3b absorbe REV.5**: las dos son la app instalada sin lo que debería tener (los datos o la versión), y las resuelve la misma prueba en un teléfono real.
- **REV.4 no va**: el ojo sigue siendo uno solo (ADR 106 D3). Con uno por sección, los montos quedan a la vista al cambiar de pantalla.

### D4. Lo demás

- **DEC.1 sale**: "Por qué esta propuesta" (Distribuir) y "Por qué tu plan no se sostiene" (Por pagar) ya ponen la razón dentro de la decisión. Límites no gana tarjeta.
- **DV.2d sale**: Tino explica los vacíos de cada sección. La ilustración geométrica de `emptyArt()` se queda; los ocho dibujos de muestra de `assets/svg/ilustraciones/` (`data-placeholder="true"`) y su rama `il-` en `emptyArt()` se pueden borrar como limpieza.
- **PERF.13 entra a MV2.28** como umbral (el arranque bajo 400 ms). **PERF.14** (136 ms, bajo los 200 que cuentan como buenos) y **PERF.15** (27 ms y solo con cuenta) salen. MV2.28 queda en medir lo publicado.
- **DOC.5 sale**: el techo de 40 KB de las fichas ya lo exige la skill `cerrar-tarea` cuando se vuelva a tocar Mis cuentas.
- **APR.3f sale del tablero**: la revisión pedagógica es trabajo de una persona, como la del abogado en LEG. La prueba de voz de las lecciones sigue en la suite.
- **APR.5b, A.5, E.2-2027 y E.3** se quedan.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Retomar MOV.1 en la ficha 18 | consolidaría reglas sobre pantallas que ya no existen: ocho fichas de auditoría antes de corregir una sola cifra |
| Reconstruir el banco de HF.0f antes de HF.1b | semanas de pruebas sin un cambio visible; la invariante que importa entra con HF.1b |
| REV.2b completa | revierte el ADR 042 D2 sin un problema medido |
| El extracto con hoja propia y PDF | repite dos vistas que ya existen; lo que faltaba era descargar el mes |
| Borrar también NUBE.4 | conectar el banco sigue siendo la dirección de la nube; queda registrado y quieto |

## Consecuencias

- El tablero pasa de 47 entradas a 17: 13 de trabajo, NUBE.4 quieta y tres de mantenimiento.
- Las fichas de `contexto/` que mandan un pendiente "a la ficha 18" se leen con la tabla de D1; `contexto/README.md` lo dice.
- BUG-039 entra a [`BUGS.md`](../BUGS.md): el monitor de renta suma el salario dos veces cuando hay crédito automático.

## Resolución en implementación

- **REV.3a (2026-11-15) no reemplaza la fila de Ajustes, la renombra.** El CSV del mes (Entrada y Salida, con ingresos y transferencias) no se vuelve a importar como gastos, y "Importar gastos" lee el formato de Ajustes. Se aplica la salvedad que la tarjeta ya traía: Ajustes conserva su CSV como "Exportar gastos en CSV · Para volver a importarlos", y "Excel" queda solo en Movimientos. D3 cambia en eso y en nada más.
