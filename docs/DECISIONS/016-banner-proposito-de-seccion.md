# ADR 016 - Banner de propósito de sección (patrón "¿para qué sirve esto?")

**Estado:** Propuesta (diseño). Decisiones de patrón cerradas con el usuario; el copy por sección se aprueba en cada slice.
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

El mensaje es un **banner de propósito** que se monta como primer bloque dentro de cada sección, justo **debajo del `section__header`** y antes de los nudges y el contenido. Se muestra **tenga o no datos** la sección (no depende del empty state).

- Para un usuario nuevo aparece **expandido**: lo primero que ve al entrar es para qué sirve la sección.
- Un control lo **colapsa** a una sola línea re-abrible ("¿Para qué sirve [Sección]?").
- Es el formato que mejor educa a quien entra por primera vez (el objetivo declarado) sin estorbar a quien ya conoce la app.

Se descartaron las otras dos ubicaciones evaluadas (ver Alternativas): "solo en el empty state" (desaparece con los datos y no tiene dónde ir en Dashboard/Análisis) y "ícono de ayuda (?)" (demasiado escondido para el usuario nuevo, que es justo a quien queremos educar).

### 2. Persistencia: se colapsa, nunca se borra

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

- **No** es `role="alert"` ni `role="status"`: no es urgente ni una novedad, es contenido informativo permanente. Se usa el **patrón disclosure** estándar.
- El control de colapsar/expandir es un `<button>` con `aria-expanded` que refleja el estado y `aria-controls` apuntando al cuerpo del mensaje. El cuerpo es un contenedor con `role="region"` y `aria-labelledby` hacia el título de la sección (o un label propio "Para qué sirve [Sección]").
- **Foco:** alternar no roba el foco de forma agresiva; al colapsar/expandir, el foco permanece en el botón que se accionó (que cambia de etiqueta pero conserva su posición).
- **Color y contraste:** superficie neutra (`--fk-bg-surface` / `--fk-bg-elevated`) con un **borde izquierdo en el color de la sección** (`--fk-dom-*`) para anclar el banner a la identidad de la sección, y cuerpo en `--fk-text-secondary` (contraste AA). Solo tokens `--fk-*`, nunca color hardcodeado.
- **Movimiento:** la animación de colapsar respeta `prefers-reduced-motion: reduce` (sin transición de altura si el usuario lo pidió).
- **Área táctil:** el control cumple el mínimo de 44px de los demás botones de la app.

### 7. Patrón de implementación (orientación para EP.1)

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

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app (desktop + móvil) con tests de render y a11y.

| Slice | Qué | Capas |
|---|---|---|
| **EP.1 (piloto)** | Helper reutilizable + mapa de copy + persistencia (`S.config.propositoColapsado`, lectura defensiva) + 2 data-actions + acción "reactivar" en Ajustes + aplicarlo a **Apartados**. Verificar patrón, a11y y tests. | `ui/proposito.js` (o infra), `index.html` (slot), `actions.js`, `config/view.js`, tests |
| **EP.2** | Copy + slot para **Gastos, Deudas, Agenda, Límites de gasto**. Reusa el helper de EP.1. | mapa de copy + `index.html` + tests |
| **EP.3** | Copy + slot para **Metas, Ahorro, Inversión**. | mapa de copy + `index.html` + tests |
| **EP.4** | Copy + slot para **Mis cuentas, Análisis, Personales**. | mapa de copy + `index.html` + tests |

> Modelos sugeridos (ver TASKS.md): EP.1 Sonnet 4.6 - Medio (patrón nuevo de un dominio con tests); EP.2 a EP.4 Sonnet 4.6 - Bajo (copy + reuso del componente).
