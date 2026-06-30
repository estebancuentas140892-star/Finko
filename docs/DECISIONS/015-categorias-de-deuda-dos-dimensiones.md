# ADR 015 - Categorías de deuda: dos dimensiones (quién y qué)

**Estado:** Aceptada
**Fecha:** 2026-06-29
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)

---

## Contexto

El backlog "Visión de Deudas" (D.5) propuso clasificar cada deuda en **dos dimensiones**:

- **Tipo de deuda**: qué clase de deuda es (tarjeta, libre inversión, vivienda, educativo, vehículo, compra a cuotas, otra).
- **Acreedor**: a quién le debes (familiar, amigo, vecino, particular, natillera, banco, cooperativa, entidad financiera, empresa, otro).

Y dejó dos preguntas abiertas para este ADR:

1. ¿El nuevo "Tipo de deuda" **reemplaza o complementa** el campo actual "Tipo de obligación"?
2. ¿El "Acreedor" **reemplaza la distinción Entidad/Personal**?

### Estado actual del modelo

Una deuda hoy tiene dos atributos relevantes para esta decisión:

- **`tipo`**: `'deuda-entidad'` o `'deuda-personal'`. Se elige en el primer paso del modal ("¿Con quién es la deuda?"). **No es cosmético:** define la unidad de la tasa (EA por ley en entidades, mensual en prestamistas informales), el copy del formulario, la unidad de la herramienta de renegociación y la validación. El chooser ya enumera ejemplos de acreedor como texto de ayuda ("Banco, cooperativa, fondo de empleados, tarjeta de crédito, ICETEX" / "Familiar, amigo, natillera o prestamista particular").
- **`categoria`** ("Tipo de obligación"): un valor de `CATEGORIAS_DEUDA` (12 valores), opcional. Es el eje "qué clase de deuda es". Se muestra en la lista con su emoji (`CATEGORIA_DEUDA_EMOJI`) y agrupa en Análisis.

---

## Decisión

### 1. Las dos dimensiones son **quién** (existente) por **qué** (curado)

El modelo de dos dimensiones ya existe en parte: **`tipo` (Entidad/Personal) es el eje "quién"** y **`categoria` es el eje "qué"**. D.5 no inventa dos ejes nuevos: refina el eje "qué" y deja el eje "quién" intacto.

- **Eje "quién" = Entidad/Personal. Se conserva tal cual.** El usuario lo encuentra claro ("separa uno de otro") y es funcional: define si la tasa es EA o mensual. La distinción banco-vs-persona es la frontera que importa para el cálculo financiero.
- **Eje "qué" = "Tipo de deuda" (antes "Tipo de obligación"). Se cura y se renombra.**

### 2. **No** se agrega un campo "Acreedor" aparte

El usuario reportó que el término "acreedor" le resulta confuso y que la distinción Entidad/Personal ya le sirve para separar a quién le debe. Un campo "Acreedor" granular (familiar, amigo, vecino, banco, cooperativa, ...):

- **Se solapa con Entidad/Personal**, que ya responde "a quién" al nivel que importa (formal vs informal).
- **Introduce jerga** ("acreedor"), contra la regla 11 del ADN (lenguaje humano, sin jerga).
- **Recarga el formulario** con una tercera pregunta, contra el objetivo de "sección limpia" de la jornada 2 de Deudas.

La granularidad de acreedor que el usuario quería (banco, cooperativa, familiar, natillera...) **ya vive como texto de ayuda en el chooser** de Entidad/Personal. No se pierde: se mantiene como ejemplos, sin volverse un campo obligatorio que el usuario deba clasificar.

> Esta decisión cierra la pregunta 2 del backlog: el "Acreedor" **no** reemplaza Entidad/Personal **ni** se agrega como campo nuevo. Si en el futuro el usuario quiere acreedor explícito, se reabre como un ADR aparte.

### 3. "Tipo de deuda" reemplaza "Tipo de obligación" (mismo eje, valores curados)

El campo `categoria` se renombra en la UI de "Tipo de obligación" a **"Tipo de deuda"** y sus valores se curan a un conjunto **orientado al propósito/producto**, ortogonal al eje Entidad/Personal. Como Entidad/Personal ya separa formal de informal, el eje "qué" deja de cargar valores que en realidad son "cómo/quién" (Libranza, Gota a gota, Sobregiro, Crédito rotativo, Préstamo personal): esos se absorben en el propósito que financian.

**Lista curada propuesta (`CATEGORIAS_DEUDA`, de 12 a 7):**

| Tipo de deuda | Emoji |
|---|---|
| Tarjeta de crédito | 💳 |
| Libre inversión | 💵 |
| Vivienda | 🏠 |
| Vehículo | 🚗 |
| Educativo | 🎓 |
| Compra a cuotas | 🛍️ |
| Otra | 📦 |

`Compra a cuotas` es nueva (financiar una compra en cuotas: electrodomésticos, muebles). El resto mapea a los valores actuales.

### 4. Migración idempotente v18 → v19 (remapea `categoria`)

Las deudas existentes guardan un `categoria` de la lista vieja. Una migración remapea cada valor viejo al nuevo. Es idempotente: solo toca valores que están en el mapa viejo; los nuevos (o `null`) se dejan igual.

| Valor viejo | Valor nuevo |
|---|---|
| Tarjeta de crédito | Tarjeta de crédito |
| Crédito de consumo | Libre inversión |
| Crédito hipotecario | Vivienda |
| Crédito vehicular | Vehículo |
| Crédito educativo | Educativo |
| Libranza | Libre inversión |
| Crédito rotativo | Libre inversión |
| Sobregiro | Libre inversión |
| Microcrédito | Libre inversión |
| Préstamo personal | Libre inversión |
| Gota a gota | Libre inversión |
| Otro | Otra |
| `null` / vacío | sin cambio |

> **Nota para revisión del usuario:** muchos valores informales (Gota a gota, Préstamo personal, Libranza, Microcrédito) colapsan en "Libre inversión" porque su naturaleza de "quién" ya la captura Entidad/Personal y su tasa. Si quieres conservar alguno como tipo propio (por ejemplo, **Gota a gota** o **Microcrédito** explícitos), se agrega a la lista curada antes de implementar. La curación final se confirma contigo en la implementación (D.5a).

---

## Slices de implementación (smallest-first)

| Slice | Qué | Schema |
|---|---|---|
| D.5a | `CATEGORIAS_DEUDA` + `CATEGORIA_DEUDA_EMOJI` curados en `constants.js`; migración v18 → v19 (remapeo de `categoria`); label del form "Tipo de obligación" → "Tipo de deuda"; tests de constantes, migración y guardarraíl de emojis (TX.4) actualizados. Modelo: **Opus 4.8 - Medio** (schema bump con migración, lógica acotada). | v18 → v19 |

Un solo slice: el cambio quedó contenido (un campo curado + migración + label). No toca el eje Entidad/Personal ni la lógica financiera. Análisis agrupa por el string de `categoria`: como la migración lo remapea, el agrupamiento sigue funcionando sin cambios.

---

## Alternativas consideradas

- **Acreedor reemplaza Entidad/Personal (derivar la unidad de tasa del acreedor):** descartada. El usuario prefiere la binaria Entidad/Personal (le resulta clara) y "acreedor" le suena a jerga. Derivar EA/mensual de una lista de 10 acreedores es más frágil y menos transparente que la pregunta directa actual.
- **Acreedor como tercer campo, además de Entidad/Personal:** descartada. Se solapa con Entidad/Personal y recarga el formulario con una clasificación que el usuario no pidió mantener.
- **Conservar los 12 valores actuales y solo renombrar el label:** descartada. El usuario pidió curar (la lista vieja mezcla propósito con mecanismo/quién: Libranza, Sobregiro, Gota a gota son "cómo/quién", no "qué"). La curación deja el eje "qué" limpio y ortogonal a Entidad/Personal.

---

## Consecuencias

- El modelo gana claridad conceptual sin agregar campos: **quién** (Entidad/Personal) por **qué** (Tipo de deuda). El formulario no crece.
- La migración v18 → v19 remapea `categoria`; al ser idempotente y best-effort, no rompe deudas existentes (los valores no mapeados o `null` se dejan igual).
- Se pierde la etiqueta explícita de algunos productos (Gota a gota, Libranza, Microcrédito) en el eje "qué", pero su naturaleza se conserva en el eje "quién" (Entidad/Personal) y en la tasa. El usuario puede pedir reincorporar alguno antes de D.5a.
- El guardarraíl TX.4 (consistencia de emojis entre catálogos) se revisa: ninguno de los nuevos valores ("Tarjeta de crédito", "Libre inversión", "Vivienda", "Vehículo", "Educativo", "Compra a cuotas", "Otra") comparte etiqueta exacta con otro catálogo, así que no introduce conflicto.
