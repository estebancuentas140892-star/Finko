# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-08)

### docs(diseno): DV.2a, cierre documental de tokens de superficie/elevación + degradado de identidad · 2026-08-01

El código entró en su propio commit (`d8a7d53`, 2026-07-31) sin cierre documental: tarjeta seguía en BOARD.md y sin entrada de changelog. Esta entrada lo repara. Ficha: [`contexto/sistema-visual.md`](contexto/sistema-visual.md).

- **Escala de elevación de 4 niveles** ([ADR 033](DECISIONS/033-direccion-visual-premium.md) D1): `.card`, `.bento__cell` y `.list-item` ganan sombra en reposo (`--fk-shadow-sm`) en ambos temas; en tema claro sube a doble capa tintada azul-tinta (contacto + ambiental).
- **Token `--fk-grad-identity` consolida el degradado** (D2) que 6 heroes copiaban a mano (`.hero-inicio`, `.score-hero`, `.hero-gastos`, `.hero-tesoreria`, `.hero-compromisos`, `.hero-agenda`): fórmula fija, `--fk-section-color` y `--fk-grad-identity-stop` parametrizables por superficie. Paradas 14/15/16% conservadas sin unificar (ya medidas, no se re-miden). Cada hero redeclara la fórmula localmente: un `var()` dentro de una custom property resuelve contra el elemento donde esa property se declara, no donde se consume.
- `docs/DESIGN_SYSTEM.md` ya había ganado la sección "Sombras y elevación" en el commit original. Sin cambios de código en este cierre, solo documental. SW ya estaba en v461 desde el commit original.

### feat(tesoreria): MC.13e-2f-2, decisión explícita del remanente al confirmar · 2026-08-01

Punto 18 del brief; **cierra MC.13e-2f completa** (la mitad del `cuentaId` cerró el 2026-07-30). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- **Las tres decisiones de UX de Esteban del 2026-07-30, tal cual.** Radiogroup de 3 opciones dentro del paso final "Estilo de vida" que ya existía, **sin preselección** (una opción marcada de entrada sería la respuesta de Finko, no la del usuario) y con "Distribuir" bloqueado hasta elegir: ni cuarto paso ni modal. La cifra es `sinAsignar`, lo que sobra del cobro, no `evBudget` del split. Y "ahorro"/"meta" **no abre ruta de apply nueva**: `_elegirDestinoRemanente` suma a la fila que el Paso 2 ya tiene, devuelve el foco ahí y la deja editable. Sin cambios en `logic/distribucion.js`: `resumirPlanDistribucion` ya devolvía `sinAsignar`.
- **Dos cosas que el diseño no cubría.** Sin fila de ahorro ni de meta donde ponerlo, la única respuesta posible sería "dejarlo": una pregunta de una sola respuesta es fricción, no decisión, así que el bloque no se renderiza y el asistente confirma como antes. Y elegir destino marca `data-editado` en la fila del fondo **aunque no sea la receptora**: sin eso, el automático de R3 le descontaría al fondo lo que se acaba de sumar a otra fila y el remanente nunca bajaría a cero.
- Guard en `_confirmarDistribucion` además del botón deshabilitado, mismo cinturón que el del déficit (MC.13e-2e). 5 E2E nuevos ([`distribucion-remanente.test.js`](../tests/e2e/distribucion-remanente.test.js)), incluido el camino hasta `localStorage`. Sin bump de schema. SW v466 a v467.

### feat(inicio): IN.9d, Accesos rápidos en fila propia, Resumen semanal y Actividad reciente en la fila final 6+6 · 2026-08-01

Cuarta rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D4), cierra la iniciativa salvo IN.9e. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- **La fusión de Accesos rápidos + Actividad reciente (ADR 034 D7) queda acotada a móvil, igual que hizo IN.9c con el acordeón.** Mismo patrón: dos contenedores conviven en el DOM (`#accesos-actividad-movil` fusionado; `#panel-accesos-escritorio` span 4 en fila propia y `#panel-actividad-reciente-escritorio` span 6 junto a `#panel-resumen`), `_repartoAccesosActividad()` nuevo en `render.js` decide cuál se ve según el ancho (mismo umbral 1024px que `_enEscritorio()`). `accesos/view.js` y `movimientos/view.js` llenan las dos copias sin condicional; el reparto se llama después de los renders de dominio para no pisar el oculto por falta de movimientos que ya aplicó `movimientos/view.js`.
- **`#panel-resumen` no se duplica:** es la misma celda en los dos anchos, pasa de `bento__cell--full` a `bento__cell--half` (CSS responsive ya la vuelve span 1 en móvil) y recupera un título propio (`renderPanelResumen()`) porque el grupo con label externo que lo describía ahora también tendría que describir Actividad reciente, que no comparte tema. El gráfico semanal recupera la proporción con la que se diseñó (R79: 49px por barra a span 6 contra 177px que daba el span 12 anterior).
- **DOM = orden visual = orden de foco en los dos anchos, sin `order` de CSS** (mismo criterio que rechazó IN.9a D2 por WCAG 2.4.3): Accesos rápidos en fila propia se logra envolviendo su única celda en un `.bento__group` sin label (fuerza fila completa); Resumen y Actividad son celdas sueltas fuera de grupo, así el auto-flow del grid las empareja solas. En móvil, el grupo de Accesos y la celda de Actividad quedan `hidden` y el acordeón fusionado ocupa su lugar de siempre: el orden visible no cambia.
- 9 tests unitarios nuevos (`accesos.test.js`, `movimientos.test.js`, `render.test.js`, `resumen.test.js`) + 2 E2E (fusión móvil confirmada intacta a 390px, fila final 6+6 medida a 1280px). La medición de posición espera 600ms: la entrada del bento anima cada celda con delay escalonado (layout.css) y dos celdas en índices distintos miden "y" en puntos distintos de su propio slide-in si no se espera a que asiente. 3577 unit + 253 E2E + lint verdes. SW v465 a v466.

### feat(tesoreria): MC.13e-2c, logo/ícono + nota por fila en el asistente · 2026-08-01

El grueso (`_iconoDestino`/`_iconoNecesidad` con `bancoAvatar`/`resolverMarca`, render de `nota`, CSS de `.distribuir__saldo`) ya había entrado sin atribución en el commit `132b0b5` (MC.13e-2d). Ficha: [`contexto/mis-cuentas.md`](contexto/mis-cuentas.md).

- `Compromiso.nota` solo existía para `tipo='fijo'` con categoría predefinida (AG.4, doble uso del campo de texto); las deudas no tenían dónde guardarla. `renderFormDeuda()` gana el campo "Nota (opcional)" (mismo patrón que Meta/Apartado), `normalizarCompromiso()` lo guarda para `esDeuda()`.
- `.distribuir__nota` estaba usada en el HTML desde `132b0b5` sin regla propia (texto sin estilo); gana color muted + cursiva.
- Sin bump de schema (campo opcional, `undefined`-safe). SW a v465.

### docs(apartados): AP.5, cierre documental del form v2 y la recurrencia como toggle · 2026-08-01

El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/apartados.md`](contexto/apartados.md).

- **Form v2** (`renderFormApartado()`): plantillas migradas de `.chip` a `chips-cat`/`chip-cat`, monto objetivo a `monto-hero`, campo "Nota" nuevo, footer `modal__footer--principal`. Resuelve el conflicto abierto del [ADR 042](DECISIONS/042-formularios-v2-visual.md) D9 (dropdown vs. chips): ganan los chips, la convención ya escrita del lenguaje v2.
- **Recurrencia fuera del registro inicial**: se retira el `<details>` "Este gasto se repite" (checkbox + `select` de periodo) del alta; se activa después con el botón "Hacer recurrente" que ya vivía en la tarjeta (`toggle-recurrente-apartado`).
- Sin bump de schema ni tests nuevos: `normalizarApartado()`/`validarApartado()` ya toleraban `recurrente`/`periodoMeses` ausentes, y `apartados.test.js` (167 tests) ya cubría el toggle y la ausencia de los campos retirados.

### docs(inicio): IN.9c, cierre documental de la columna propia del detalle por cuenta · 2026-08-01

Tercera rebanada de **IN.9** ([ADR 057](DECISIONS/057-inicio-en-escritorio.md) D3). El código entró como colateral del commit `ab8c9a1` (CAT.3a) sin su propio cierre; esta entrada lo repara. Ficha: [`contexto/inicio.md`](contexto/inicio.md).

- `#panel-cuentas-detalle`/`#cuentas-detalle-lista` (`index.html`) muestran el detalle por cuenta en una columna propia desde 1024px, y comparten `_filasCuentas()` (`render.js`) con el acordeón del hero, que a partir de ahora queda acotado a menos de 1024px (`_enEscritorio()`). La máscara de privacidad cubre las dos celdas juntas, extensión de IN.2 ya prevista en el ADR.
- Tests y bump de SW ya estaban en `ab8c9a1` (v463): `smoke.test.js` (E2E, columna de escritorio) y `render.test.js` (unit). Sin cambios de código en este cierre.

### fix(test): BUG-022, BUG-023 y BUG-024, suites que se ponían rojas según el día del mes · 2026-08-01

Encontrados al correr las compuertas de CAT.3a: **8 unitarios y 4 E2E rojos en HEAD**, verificados contra un stash completo del árbol. Ninguno es un defecto de la app: los tres son el **mismo patrón de fechas fijas** en los tests, que solo fallan los primeros días de cada mes.

- **BUG-022** (`renderPanelVencidos`, 6 tests): `DIA_PASADO` envuelve a módulo 28, así que el día 1 del mes devolvía 27, o sea el futuro. Sin vencidos, el panel salía vacío. Los dos describes fijan el reloj a mitad de mes, la convención que el propio archivo ya había adoptado para los tests de distancia exacta.
- **BUG-023** (chip TX.12b, 1 unitario + 2 E2E): el unitario fijaba fechas de junio contra la ventana de 60 días que `renderFormGasto` mide con el reloj real. El E2E sembraba con `isoHaceNDias`, correcto, pero la lista de gastos muestra el **mes en curso** y el día 1 toda fecha "hace N días" cae en el mes anterior: se topa en el día 1.
- **BUG-024** (gota del compromiso de ahorro): los aportes estaban fijos en julio y el medidor mide el mes en curso.
- **Colateral real de CAT.3a, no rot:** el E2E de TX.9b creaba una personalizada llamada "Gimnasio", que con el D4 nuevo ahora colisiona con `CATEGORIAS_AGENDA`. Renombrada a "Suplementos", igual que los unitarios equivalentes.

### feat(gastos): CAT.3a, modelo de categorías personalizadas globales · 2026-08-01

Primera de cuatro rebanadas del [ADR 058](DECISIONS/058-categorias-personalizadas-globales.md). Sin cambio visible en la app todavía. Ficha: [`contexto/transversal.md`](contexto/transversal.md).

- **Campo `seccion` en `S.categoriasPersonalizadas`** (D1): `'gasto' | 'fijo'`, backfill `'gasto'` en las existentes (bump de schema v30 a v31, migración idempotente).
- **Resolutora global de ícono** (D2): `iconoDeCategoriaGasto()` ahora también resuelve contra `CATEGORIA_AGENDA_ICONO`, no solo `CATEGORIA_ICONO`, antes de caer a la personalizada o al genérico `i-gastos`. Ignora la `seccion` a propósito: una superficie que pinta un movimiento no sabe, y no debe saber, de qué formulario salió el nombre.
- **`validarCategoriaPersonalizada` compara contra los dos catálogos nativos** (D4): `CATEGORIAS_GASTO` y `CATEGORIAS_AGENDA`. El nombre es único en toda la app, no por sección.
- El formulario de gasto sigue siendo la única fuente de personalizadas hasta CAT.3c: `gastos/index.js` estampa `seccion: 'gasto'` al crear.


---

## Meses anteriores

- [2026-07](changelog/2026-07.md)
- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
