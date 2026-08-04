# ADR 016 - Banner de propósito de sección (patrón "¿para qué sirve esto?")

**Estado:** Implementada (EP.1 a EP.4, EP.7a a EP.7d). **Revisada el 2026-07-03:** el banner pasa de "siempre visible y colapsable" a **divulgación progresiva**: una única descripción por sección, visible solo mientras la sección no tiene datos (ver sección "Revisión 2026-07-03"). La dirección la fijó el usuario el 2026-07-02; esta revisión es la fase de diseño de EP.7. **Auditada el 2026-08-03 (GU.1a):** sin desviaciones, alcance de 11 secciones confirmado correcto. Detalle: [`contexto/transversal.md`](../contexto/transversal.md).
**Fecha:** 2026-06-30
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)
**Relación:** vehículo natural de la regla de contexto de [ADR 014](014-taxonomia-categorias-transversal.md) (la taxonomía se enseña sobre todo en el copy). Es la épica EP; este ADR es EP.0 y habilita EP.1 a EP.4.

---

## Contexto

Las funciones de Finko son buenas, pero alguien que entra por primera vez no entiende de inmediato **para qué sirve cada sección** ni qué beneficio obtiene. El usuario lo plantea así: cada sección debería responder en pocos segundos una pregunta simple, **¿qué problema me ayuda a resolver esta sección?**. La meta no es llenar la app de texto, sino dar un mensaje breve, cercano y fácil de entender que genere contexto, eduque y motive mejores hábitos. Finko no solo registra movimientos: también explica el propósito de cada herramienta.

Hoy cada sección tiene un `<header class="section__header">` con un `section__title` y, en algunas, un `section__subtitle` de una línea (ej. Apartados: "Reservas para gastos previsibles: SOAT, impuestos, arriendo"). Ese subtítulo es útil pero corto: no alcanza a nombrar el dolor del usuario ni a explicar el beneficio. No existe un patrón reutilizable para un mensaje más rico, ni una forma de que el usuario lo lea una vez y lo guarde.

### Copy de referencia ya aprobado (Apartados)

El usuario aprobó este texto como el tono y la estructura objetivo:

> ¿Te ha pasado que, de un momento a otro, debes pagar el SOAT, comprar el alimento de tu mascota, reponer tus productos de aseo personal o cubrir otro gasto importante que no esperabas? Aunque son gastos previsibles, muchas veces olvidamos prepararnos y terminamos usando nuestros ahorros, aplazando metas o endeudándonos. Apartados te ayuda a evitarlo: destina una pequeña parte de tus ingresos para cada gasto futuro y, cuando llegue el momento de pagarlo, ya tendrás el dinero (o gran parte de él) disponible.

De ahí se extrae la estructura de tres tiempos: (1) una **pregunta gancho** que toca un dolor real, (2) una o dos frases que **nombran el problema**, (3) una frase de **cómo Finko ayuda**.

---

## Decisión

### 1. Ubicación: banner colapsable arriba del contenido

> **Revisada el 2026-07-03:** el banner conserva la ubicación, pero deja de mostrarse "tenga o no datos": ahora solo aparece mientras la sección **no** tiene datos. Ver "Revisión 2026-07-03".

El mensaje es un **banner de propósito** que se monta como primer bloque dentro de cada sección, justo **debajo del `section__header`** y antes de los nudges y el contenido. Se muestra **tenga o no datos** la sección (no depende del empty state).

- Para un usuario nuevo aparece **expandido**: lo primero que ve al entrar es para qué sirve la sección.
- Un control lo **colapsa** a una sola línea re-abrible ("¿Para qué sirve [Sección]?").
- Es el formato que mejor educa a quien entra por primera vez (el objetivo declarado) sin estorbar a quien ya conoce la app.

Se descartaron las otras dos ubicaciones evaluadas (ver Alternativas): "solo en el empty state" (desaparece con los datos y no tiene dónde ir en Dashboard/Análisis) y "ícono de ayuda (?)" (demasiado escondido para el usuario nuevo, que es justo a quien queremos educar).

### 2. Persistencia: se colapsa, nunca se borra

> **Revisada el 2026-07-03:** el colapso manual y su persistencia se eliminan; la visibilidad se deriva de los datos de la sección, no de una preferencia. `S.config.propositoColapsado` deja de leerse y el bloque "Mensajes de ayuda" de Ajustes se retira. Ver "Revisión 2026-07-03".

El estado colapsado/expandido se guarda **por sección** y persiste entre sesiones.

- Al colapsarlo queda una **línea re-abrible**; el usuario nunca pierde el acceso al mensaje.
- La preferencia vive en `S.config.propositoColapsado`, un mapa `{ [seccion]: true }`. Ausente o `false` = expandido; `true` = colapsado.
- **Reactivar todo** desde Ajustes: una acción que limpia el mapa y vuelve a expandir todos los banners (útil tras una actualización o para un familiar que usa el mismo dispositivo).
- No reaparece solo: una vez colapsado, se queda colapsado hasta que el usuario lo reabra o reactive. Respeta al usuario que ya entendió.

### 3. Sin cambio de schema

`propositoColapsado` se lee de forma **defensiva** (`S.config.propositoColapsado ?? {}`), igual que hoy se leen `presetDistribucion` y `distribucionPersonalizada` sin migración. No se bumpea `SCHEMA_VERSION`. Escribir la primera preferencia crea la clave; `save()` (debounced 200ms) la persiste. Esto mantiene EP.1 como un slice de bajo riesgo y reversible.

### 4. Estructura y longitud del copy

Cada mensaje sigue los **tres tiempos** del copy aprobado y se mantiene **breve** (objetivo: 3 a 4 frases, ~40 a 60 palabras):

1. **Pregunta gancho** que toca un dolor real ("¿Sientes que pagas y pagas pero la deuda no baja?").
2. **Nombrar el problema** en una o dos frases (qué pasa cuando no se gestiona).
3. **Cómo Finko ayuda**, en una frase que nombra la sección y su beneficio.

Tono obligatorio (ADN regla 11 + estilo regla 7.1): voz "tú", cercano y profesional, sin jerga, "dinero" (no "plata"), **cero guion largo**. El copy propuesto por sección está más abajo y se aprueba en cada slice.

### 5. A qué secciones aplica

Aplica a **11 secciones**: las 10 núcleo del insumo del usuario más **Personales**.

| Grupo | Secciones | Slice |
|---|---|---|
| Piloto | **Apartados** (copy ya aprobado) | EP.1 |
| Gastar bien | **Gastos, Deudas, Agenda, Límites de gasto** | EP.2 |
| Crecer | **Metas, Ahorro, Inversión** | EP.3 |
| Organizar | **Mis cuentas, Análisis, Personales** | EP.4 |

**Quedan fuera:** Dashboard (es el resumen agregado, no una herramienta de propósito único: un banner ahí sería redundante con el resto), Calculadoras (utilidad puntual y autoexplicativa) y Ajustes (obvio). Decisión del usuario.

### 6. Accesibilidad

> **Revisada el 2026-07-03:** sin control de colapso ya no aplica el patrón disclosure (`aria-expanded`, `aria-controls`); el banner queda como bloque estático de texto. Color, contraste, tokens y área táctil de lo que quede se conservan tal cual.

- **No** es `role="alert"` ni `role="status"`: no es urgente ni una novedad, es contenido informativo permanente. Se usa el **patrón disclosure** estándar.
- El control de colapsar/expandir es un `<button>` con `aria-expanded` que refleja el estado y `aria-controls` apuntando al cuerpo del mensaje. El cuerpo es un contenedor con `role="region"` y `aria-labelledby` hacia el título de la sección (o un label propio "Para qué sirve [Sección]").
- **Foco:** alternar no roba el foco de forma agresiva; al colapsar/expandir, el foco permanece en el botón que se accionó (que cambia de etiqueta pero conserva su posición).
- **Color y contraste:** superficie neutra (`--fk-bg-surface` / `--fk-bg-elevated`) con un **borde izquierdo en el color de la sección** (`--fk-dom-*`) para anclar el banner a la identidad de la sección, y cuerpo en `--fk-text-secondary` (contraste AA). Solo tokens `--fk-*`, nunca color hardcodeado.
- **Movimiento:** la animación de colapsar respeta `prefers-reduced-motion: reduce` (sin transición de altura si el usuario lo pidió).
- **Área táctil:** el control cumple el mínimo de 44px de los demás botones de la app.

### 7. Patrón de implementación (orientación para EP.1)

> **Revisada el 2026-07-03:** el contrato cambia: el helper recibe si la sección tiene datos y devuelve vacío cuando los hay. Las dos data-actions (`colapsar-proposito`, `expandir-proposito`) y la acción `reactivar-propositos` de Ajustes se retiran. Ver "Revisión 2026-07-03".

- **Un solo helper** renderiza el banner a partir de `{ seccion, titulo, cuerpo }`: devuelve el HTML expandido o la línea colapsada según `S.config.propositoColapsado[seccion]`. Vive en infra/ui (sin importar dominios), p. ej. `modules/ui/proposito.js`, y se registra como render para re-pintar al cambiar de estado.
- **El copy vive en un único mapa** (`PROPOSITOS_SECCION` o equivalente), keado por sección, separado del markup. Agregar una sección nueva en EP.2 a EP.4 es **agregar una entrada de copy + un slot**, sin tocar la lógica.
- **Montaje:** un `<div id="proposito-{seccion}">` como primer hijo de cada `<section>` aplicable en `index.html`; el helper inyecta ahí. Así ningún dominio importa a otro y el patrón es central.
- **Dos data-actions** delegados en `actions.js`: `colapsar-proposito` y `expandir-proposito` (ambos con `data-seccion`), que togglean `S.config.propositoColapsado[seccion]`, llaman `save()` y re-renderizan ese banner. La acción de Ajustes (`reactivar-propositos`) limpia el mapa.
- El detalle exacto (nombre del módulo, si el mapa va en `constants.js` o en el módulo del helper) se cierra en EP.1; lo que este ADR fija es el contrato: un helper, un mapa de copy, slots en el HTML, persistencia defensiva en `S.config`.

---

## Copy propuesto por sección (a aprobar en cada slice)

Borradores que siguen la estructura de tres tiempos y el tono obligatorio. Apartados usa el texto ya aprobado.

**Apartados (aprobado):**
> ¿Te ha pasado que, de un momento a otro, debes pagar el SOAT, comprar el alimento de tu mascota, reponer tus productos de aseo personal o cubrir otro gasto importante que no esperabas? Aunque son gastos previsibles, muchas veces olvidamos prepararnos y terminamos usando nuestros ahorros, aplazando metas o endeudándonos. Apartados te ayuda a evitarlo: destina una pequeña parte de tus ingresos para cada gasto futuro y, cuando llegue el momento de pagarlo, ya tendrás el dinero (o gran parte de él) disponible.

**Gastos:**
> ¿Sabes en qué se te va el dinero cada mes? Muchas veces se escapa en compras pequeñas que ni recordamos. Gastos te muestra en qué gastas de verdad, para que descubras hábitos que puedes mejorar y decidas con información.

**Deudas:**
> ¿Sientes que pagas y pagas pero la deuda no baja? Sin un plan, los intereses te cobran de más y la salida se alarga. Deudas arma la mejor estrategia para que pagues menos intereses y salgas más rápido, una cuota a la vez.

**Agenda:**
> ¿Se te ha pasado un pago y te tocó asumir intereses o recargos? Las fechas se acumulan y es fácil olvidar una. Agenda reúne tus pagos periódicos en un solo lugar para que no se te pase ninguno y evites cobros por mora.

**Límites de gasto:**
> ¿Llegas a fin de mes sin saber por qué no te alcanzó? Sin un tope claro, es fácil gastar de más sin darte cuenta. Límites de gasto te deja fijar cuánto quieres gastar por categoría y te avisa antes de pasarte, no después.

**Metas:**
> ¿Tienes un sueño pero no sabes cómo llegar a él? Sin un plan, ahorrar para algo grande se siente imposible. Metas convierte cada objetivo en un plan de ahorro con pasos claros: cuánto apartar y cuándo lo vas a lograr.

**Ahorro:**
> ¿Qué pasaría si mañana llega un gasto inesperado? Sin un respaldo, un imprevisto se cubre con deuda o desarma tus planes. Ahorro te ayuda a construir tu fondo de emergencia, el colchón para los momentos difíciles y tu base de tranquilidad.

**Inversión:**
> ¿Tu dinero está creciendo o solo guardado? El dinero quieto pierde valor con el tiempo por la inflación. Inversión te ayuda a llevar el registro de lo que inviertes y ver cómo tu patrimonio crece más allá del ahorro.

**Mis cuentas:**
> ¿Tienes claro cuánto dinero tienes y dónde está? Con varias cuentas y billeteras es fácil perder el rastro. Mis cuentas reúne todo tu dinero en un solo lugar y te ayuda a distribuir cada ingreso de forma inteligente.

**Análisis:**
> ¿Tus números te dicen algo o son solo cifras sueltas? Registrar movimientos sirve de poco si no entiendes qué significan. Análisis transforma tus datos en información clara para que tomes mejores decisiones con tu dinero.

**Personales:**
> ¿Le prestaste dinero a alguien y ya no recuerdas cuánto ni a quién? Los préstamos entre conocidos se olvidan fácil y generan incomodidad. Personales lleva la cuenta de lo que te deben: quién, cuánto y desde cuándo, sin malos ratos.

---

## Alternativas consideradas

- **Mostrar el mensaje solo dentro del empty state.** Elegante porque aparece justo cuando no hay datos (usuario probablemente nuevo) y desaparece al registrar el primer movimiento, sin dejar nada permanente. Descartada: no tiene dónde ir en secciones sin empty state clásico (Dashboard, Análisis), el usuario no puede releerlo después, y el banner también enseña la regla de contexto de la taxonomía (ADR 014), que conviene tener a mano siempre, no solo cuando la sección está vacía.
- **Ícono de ayuda "?" en el encabezado.** Lo más limpio visualmente. Descartada como opción principal: queda demasiado escondido para el usuario nuevo, que es exactamente a quien queremos educar; un "?" exige que el usuario sepa que ahí hay algo que descubrir.
- **Descartar el mensaje del todo (una "x" sin línea re-abrible).** Más minimalista una vez leído. Descartada: esconder la opción de releer va contra el propósito educativo; "se colapsa pero nunca se borra" da el mismo silencio visual conservando el acceso.
- **Reaparecer cada cierto tiempo o en cada versión.** Más insistente como recordatorio. Descartada: riesgo de sentirse repetitivo y de erosionar la confianza ("ya cerré esto, ¿por qué vuelve?"). La reactivación queda como acción explícita del usuario en Ajustes.
- **Alargar el `section__subtitle` existente.** Reusaría markup, pero el subtítulo no es colapsable ni persistente, no admite los tres tiempos sin volverse un muro de texto fijo, y no se puede silenciar. El banner es un componente propio por eso.
- **Texto distinto en mobile y desktop.** Descartada por costo de mantenimiento (doble copy por sección). El mismo texto breve funciona en ambos; el layout se adapta con CSS.

---

## Consecuencias

### Positivas

- El usuario nuevo entiende en segundos **qué problema resuelve cada sección** y qué gana usándola; baja la fricción de la primera vez.
- Es el **vehículo de la regla de contexto** de ADR 014: el copy enseña dónde registrar cada movimiento (Mercado en Agenda vs Gastos, etc.).
- Patrón **único y reutilizable**: agregar una sección es copy + slot, sin lógica nueva; bajo costo por slice.
- **Respeta al usuario experto:** se colapsa a una línea y no vuelve solo; cero ruido permanente.
- Sin migración ni schema nuevo: riesgo bajo, reversible.
- Refuerza la identidad visual: el borde del color de la sección ata el banner a su dominio.

### Negativas / Restricciones

- Sumar un bloque arriba **empuja el contenido** hacia abajo en la primera visita; se mitiga con el colapso persistente y un diseño compacto.
- El copy es **mantenimiento manual**: 11 textos que deben envejecer bien y respetar el tono (revisar en cada slice contra ADN regla 11 y estilo 7.1).
- La preferencia por sección es **por dispositivo** (vive en `localStorage`), no sincroniza entre dispositivos del mismo usuario. Aceptable: es coherente con todo el modelo offline-first de Finko.
- Hay que cuidar que el banner **no compita** con los nudges existentes de la sección (jerarquía visual: el banner es informativo y calmado, los nudges accionables y con color de urgencia).

---

## Slices de implementación (smallest-first)

> **Nota 2026-07-03:** EP.1 a EP.4 se completaron (ver CHANGELOG). Los slices de la revisión (EP.7a a EP.7d) están al final, en "Revisión 2026-07-03".

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app (desktop + móvil) con tests de render y a11y.

| Slice | Qué | Capas |
|---|---|---|
| **EP.1 (piloto)** | Helper reutilizable + mapa de copy + persistencia (`S.config.propositoColapsado`, lectura defensiva) + 2 data-actions + acción "reactivar" en Ajustes + aplicarlo a **Apartados**. Verificar patrón, a11y y tests. | `ui/proposito.js` (o infra), `index.html` (slot), `actions.js`, `config/view.js`, tests |
| **EP.2** | Copy + slot para **Gastos, Deudas, Agenda, Límites de gasto**. Reusa el helper de EP.1. | mapa de copy + `index.html` + tests |
| **EP.3** | Copy + slot para **Metas, Ahorro, Inversión**. | mapa de copy + `index.html` + tests |
| **EP.4** | Copy + slot para **Mis cuentas, Análisis, Personales**. | mapa de copy + `index.html` + tests |

> Modelos sugeridos (ver TASKS.md): EP.1 Sonnet 4.6 - Medio (patrón nuevo de un dominio con tests); EP.2 a EP.4 Sonnet 4.6 - Bajo (copy + reuso del componente).

---

## Revisión 2026-07-03 - Divulgación progresiva (EP.7)

### Por qué se revisa

EP.1 a EP.4 dejaron el banner funcionando en las 11 secciones, pero en la app real el resultado acumula capas de texto: banner de propósito arriba, `section__subtitle` bajo el título en 5 secciones, párrafos de empty state que re-explican lo mismo y notas al pie que repiten la relación entre secciones. En móvil, el ruido esconde el contenido y las acciones. El usuario fijó la dirección el 2026-07-02 y la reconfirmó con su observación en Metas ("la descripción solo debe aparecer al inicio"):

1. Cada sección tiene **una única** descripción breve y clara de su propósito.
2. Esa descripción **se oculta automáticamente** cuando la sección ya tiene datos (deja de aportar y solo ocupa espacio).
3. Barrido completo para unificar mensajes, eliminar textos repetidos y priorizar contenido y acciones sobre explicación.

Esta revisión absorbe las antiguas tarjetas EP.5 (auto-ocultar) y EP.6 (unificar propósito + empty state), unificadas en EP.7.

### Decisión revisada

**D1. El banner de propósito es la descripción única de cada sección.** Se conservan el copy aprobado (estructura de tres tiempos), la ubicación (primer bloque bajo el header) y la identidad visual (borde con el color de la sección). Los `section__subtitle` descriptivos y las notas al pie que repiten propósito se eliminan.

**D2. Visibilidad derivada de los datos, sin preferencia manual.** El banner se muestra si y solo si la sección **no** tiene datos. Desaparecen el botón "Entendido, ocultar", la línea colapsada re-abrible, la preferencia `S.config.propositoColapsado` y la acción de reactivar en Ajustes. Racional: una sección vacía es de un usuario que aún no la usa, y ahí la descripción es el onboarding; su primera acción real la oculta sola. Una sola regla que razonar y menos código que mantener.

**D3. El empty state deja de describir y pasa a accionar.** Cuando la sección está vacía conviven banner y empty state; para que no se repitan, el banner explica el porqué (problema y beneficio) y el empty state se adelgaza a título corto, una línea accionable y el CTA. Los tips accionables (atajos, datos calculados) y las reglas de contexto de ADR 014 (ej. "el tope va en Límites de gasto") sobreviven como tips: no son descripciones de propósito.

**D4. Guards y notas de datos no se tocan.** Los guards de formulario ("Primero necesitas una cuenta...") y las notas contextuales que dependen de datos (proyección de Inversión, desgloses de Límites) no son propósito: quedan.

**D5. Contrato de implementación.** `htmlBannerProposito` recibe además si la sección tiene datos y devuelve `''` cuando los hay; cada dominio pasa el **mismo predicado que ya usa para decidir su empty state**. Se retiran las data-actions `colapsar-proposito` y `expandir-proposito`, `reactivarPropositos()` y el bloque "Mensajes de ayuda" de `config/view.js`. `S.config.propositoColapsado` deja de leerse: queda como clave huérfana inofensiva en `localStorage` de usuarios existentes (lectura defensiva desde EP.1; no amerita migración ni bump de schema).

### Criterio "tiene datos" por sección

La tabla fija la intención; el slice confirma el detalle reusando el predicado del empty state de cada dominio.

| Sección | Clave | La sección "tiene datos" cuando |
|---|---|---|
| Gastos | `gast` | `S.gastos.length > 0` (histórico: un mes sin gastos no re-muestra la descripción) |
| Deudas | `compromisos` | alguna deuda registrada (`tipo` `deuda-entidad` o `deuda-personal`) |
| Calendario | `agenda` | algún compromiso registrado (fijo o deuda: ambos generan eventos del mes) |
| Me deben | `personales` | `S.personales.length > 0` |
| Mis cuentas | `tesoreria` | `S.cuentas.length > 0` o `S.ingresos.length > 0` |
| Límites de gasto | `presupuesto` | hay plan del mes (ingresos registrados) o algún tope por categoría (`S.presupuestos`) |
| Ahorro | `ahorro` | `S.ahorro.fondoEmergencia.activo` o `S.ahorro.aportes.length > 0` |
| Inversión | `inversion` | `S.inversiones.length > 0` |
| Metas | `metas` | `S.metas.length > 0` |
| Apartados | `apartados` | `S.apartados.length > 0` |
| Análisis | `analisis` | `S.gastos.length > 0` (el mismo insumo que analiza) |

### Inventario de textos: transversal

| Texto | Veredicto |
|---|---|
| Banner de propósito (11 secciones, `modules/ui/proposito.js`) | **Queda** como descripción única; visible solo sin datos; pierde el toggle y la línea colapsada |
| `section__subtitle` descriptivos en `index.html` (Límites ~472, Ahorro ~492, Metas ~526, Apartados ~547, Análisis ~571) | **Se van** (duplican el banner). El `h2` "Mis ingresos fijos" (~446) queda: es título de sub-bloque, no descripción |
| Párrafos de empty state que re-explican el propósito | **Se recortan** a título + acción + CTA (detalle por sección abajo) |
| Bloque "Mensajes de ayuda" de Ajustes (`config/view.js` `_renderPropositos` ~282, acción en `config/index.js` ~211) | **Se va** completo |
| Guards de formularios y notas contextuales de datos | **Quedan** |

### Inventario por sección

**Gastos**
- Banner `gast`: queda.
- `gastos/view.js` ~227, desc del empty ("Anota cada compra o pago que haces... para que veas a dónde va tu dinero"): recortar, repite el banner; dejar la instrucción mínima.
- ~229, tip "Gasto rápido": queda (atajo accionable).
- ~237, "Nada acá este mes" (categoría filtrada): queda (estado de datos).
- ~298 y ~354, guards "Primero necesitas una cuenta": quedan.

**Deudas**
- Banner `compromisos`: queda.
- `compromisos/views/lista.js` ~187, desc del empty: recortar la frase "Finko te muestra el orden óptimo de pago..." (repite el banner); queda la instrucción de qué agregar.
- ~189, tip "los gastos fijos... se agregan desde Calendario": queda (regla de contexto).
- `views/formularios.js` ~36, guard de cuenta: queda. `views/estrategia.js` ~324, nota de estrategia: contextual, queda.

**Calendario**
- Banner `agenda`: queda. Sin subtítulo, sin empty clásico ni notas al pie: nada más que barrer.

**Me deben**
- Banner `personales`: queda, con fix de copy: el texto dice "Personales lleva la cuenta..." y la sección se llama "Me deben".
- `personales/view.js` ~164, desc del empty ("Registra los préstamos... Sin presión: solo es para ti."): recortar, repite el banner; dejar la acción.

**Mis cuentas**
- Banner `tesoreria`: queda.
- `tesoreria/view.js` ~105, empty de cuentas ("¿Dónde tienes tu dinero?"): recortar; la pregunta gancho duplica la del banner.
- ~108, tip Nequi/Daviplata: queda (accionable).
- ~134, empty de ingresos: queda (estado de sub-bloque, corto y accionable).

**Límites de gasto**
- `index.html` ~472, subtítulo "Sigue tu plan del mes por grupo...": se va.
- Banner `presupuesto`: queda; su copy actual excede el patrón (4+ frases): re-ajustar a tres tiempos en el slice conservando la relación con Mis cuentas.
- `presupuesto/view.js` ~111, nota "Mis cuentas planifica...; Límites de gasto vigila...": se va (repite el banner casi literal).
- ~337, resumen vacío ("Aún no tienes un plan del mes por grupo" + CTA): queda como empty accionable; revisar que la desc no repita el banner.
- ~268, ~300 (desgloses vacíos) y ~371 ("Aún no le has puesto tope..."): quedan (estados de datos accionables).

**Ahorro**
- `index.html` ~492, subtítulo "Tu colchón para imprevistos...": se va.
- Banner `ahorro`: queda.
- `ahorro/view.js` ~142, desc del empty ("Es la base de cualquier plan financiero..."): recortar, repite "un imprevisto se cubre con deuda" del banner.
- ~135, tip dinámico con el objetivo calculado: queda (dato accionable).

**Inversión**
- Banner `inversion`: queda.
- `inversiones/view.js` ~57, desc del empty ("Lleva en un solo lugar tu portafolio real..."): recortar, repite el banner.
- ~59, tip "primero asegura tu fondo de emergencia": queda (regla de contexto).
- ~107 y ~116, notas de proyección: quedan (contextuales de datos).

**Metas**
- `index.html` ~526, subtítulo "Objetivos aspiracionales...": se va.
- Banner `metas`: queda.
- `metas/view.js` ~89, desc del empty: recortar; conservar en una línea la regla de contexto hacia Apartados.
- ~91, tip del fondo de emergencia hacia Ahorro: queda corto (regla de contexto).

**Apartados**
- `index.html` ~547, subtítulo "Reservas para gastos previsibles...": se va.
- Banner `apartados`: queda (copy aprobado).
- `apartados/view.js` ~119, desc del empty: recortar fuerte, repite SOAT/previsibles del banner.
- ~121, tip de fecha objetivo: queda (accionable).
- ~122, tip "el tope va en Límites de gasto": queda (regla de contexto).

**Análisis**
- `index.html` ~571, subtítulo "Cómo está tu salud financiera...": se va.
- Banner `analisis`: queda.
- `analisis/view.js` ~353 y ~408, empties por sub-card: quedan (estados de datos); revisar en el slice que ~408 no re-explique.

### Consecuencias de la revisión

**Positivas**
- Una sección con datos muestra contenido y acciones, cero texto de propósito: el ruido desaparece justo cuando deja de aportar.
- Una sección vacía educa una sola vez y sin repetirse: banner (porqué) + empty state (qué hacer).
- Menos código: se van 2 data-actions, la persistencia del colapso y el bloque de Ajustes; la visibilidad es una función pura de los datos, fácil de testear.

**Negativas / Restricciones**
- Se pierde la relectura del propósito cuando ya hay datos: decisión consciente del usuario; las reglas de contexto clave sobreviven como tips accionables.
- `propositoColapsado` queda huérfana en `localStorage` de usuarios existentes: inofensiva, nadie la lee; no amerita migración.
- Los tests de EP.1 sobre colapso y persistencia se reemplazan por tests de visibilidad por datos.

### Slices de implementación de EP.7

| Slice | Qué | Secciones |
|---|---|---|
| **EP.7a (piloto)** | Mecanismo: helper con visibilidad por datos; retirar colapso, persistencia, acciones y el bloque de Ajustes; aplicar completo a Apartados (banner + subtítulo fuera + empty recortado); tests | Apartados, Ajustes |
| **EP.7b** | Barrido: subtítulo y nota al pie de Límites fuera; empties recortados; copy del banner de Límites a tres tiempos | Gastos, Deudas, Calendario, Límites de gasto |
| **EP.7c** | Subtítulos fuera + empties recortados | Metas, Ahorro, Inversión |
| **EP.7d** | Subtítulo de Análisis fuera + empties recortados + fix "Personales" → "Me deben" en el banner | Mis cuentas, Análisis, Me deben |

Modelos sugeridos: EP.7a Sonnet 5 - Medio (cambia el mecanismo, con tests); EP.7b a EP.7d Sonnet 5 - Medio (recortes de copy que requieren juicio, varios archivos por slice).
