# ADR 033 - Dirección Visual premium (superficie, riqueza visual y movimiento)

**Estado:** Propuesta (pendiente de validación de Esteban: puntos P1 a P5 abajo). Nada se implementa sin aprobar este ADR; las rebanadas DV.2a a DV.2d viven en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-10
**Autores:** Esteban (visión de producto, brief del 8.º lote 2026-07-09 + 2 imágenes de referencia), Claude Fable 5 (análisis y diseño).
**Relación:** construye SOBRE el [ADR 031](031-identidad-de-color-por-seccion.md) (identidad de color por sección, IV.1/IV.2 ya en producción) sin revertirlo; **ratifica** los [ADR 023](023-lenguaje-de-iconografia-propio.md)/[025](025-logotipos-de-marca-y-tejas.md)/[026](026-biblioteca-de-recursos-graficos.md)/[027](027-logos-de-marca-a-color-excepcion-monocromo.md) (iconografía, tejas, biblioteca de assets, logos a color) y los extiende con dos clases nuevas de recurso; coordina con el [ADR 032](032-logros-v2-niveles-y-habitos.md)/LG.2 (las celebraciones viven allá, no acá) y con CFG.7 (transición de tema: fuera de alcance de este ADR); hereda la disciplina de rendimiento del [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md)/auditoría PERF y el criterio semántico del [ADR 019](019-limites-por-rol.md) ("gastar no es incumplir").

---

## Contexto

Brief de Esteban (2026-07-09): una identidad "no minimalista ni plana, cálida y tecnológica a la vez", con profundidad en las tarjetas, color más rico por módulo, fondos con personalidad y animaciones con propósito, **sin sacrificar rendimiento**. Las 2 imágenes de referencia son inspiración de tono (profundidad suave, calidez), no se copian: identidad propia.

El triaje del 8.º lote ya separó lo que el brief pide y **ya existe**: color con significado por sección (ADR 031, IV.2 completa el 2026-07-10, SW v344), iconografía propia protagonista (ADR 023 v2), logos oficiales intactos (025/026/027) y diseño emocional al completar acciones (LG.2/ADR 032). Este ADR decide **solo lo genuinamente nuevo**: superficie/elevación, color secundario por dominio, riqueza visual (degradados, formas, patrones, ilustraciones) y el catálogo de movimiento; más la resolución formal de la tensión de iconografía que el triaje dejó señalada.

### Hallazgos del análisis del código (2026-07-10)

1. **Las cards reposan planas de verdad.** `.card` (buttons.css), `.bento__cell` (layout.css) y `.list-item` (atoms.css) descansan con fondo `--fk-bg-surface` + borde 1px `--fk-border-subtle`, **sin sombra**. Los tokens `--fk-shadow-sm/md/lg/glow` existen desde el rediseño 2026 pero solo se usan en hover, dropdowns, modales y toasts. La profundidad en reposo que pide el brief no existe hoy; el sistema la tiene a medio construir.
2. **En tema oscuro la elevación ya se comunica por escalones de fondo** (`--fk-bg-base` #101218 → `-surface` #181b23 → `-elevated` #20242f): una sombra oscura sobre fondo oscuro aporta poco por física del color. La sombra en reposo rinde sobre todo en **tema claro**, donde hoy el borde 1px hace todo el trabajo. El sistema debe decir esto explícitamente para no perseguir en oscuro un efecto que no se va a ver.
3. **No existe ningún token de degradado.** Toda la riqueza de color vive en tintes planos (`-bg` al 6-12% vía `color-mix`). El ADR 031 D6 prohibió "gradientes multi-stop nuevos"; un degradado suave de 2 paradas tokenizado no viola esa prohibición (es pintura única, costo cero por frame) pero nadie lo ha definido.
4. **El mecanismo para parametrizar color por dominio ya existe y está probado:** `--fk-section-accent` (IV.2b) se declara una vez en el mapeo `[data-dom]`/`[data-section]` y lo consumen franjas de modal y barras/anillos. Los degradados y la decoración pueden montarse sobre el mismo patrón sin JS nuevo.
5. **El catálogo de animaciones existe de facto pero sin doctrina.** Inventario real: `sectionIn`, `cardIn`, `toastIn/Out`, `confettiFall` (base.css), `check-pop`, `distribuir-paso-in`, `form-errors-in` (forms.css), `fadeInUp`, `distribucion-rows-in` (domain.css), `fadeInDown` (nudges.css), `cal-detail-fadein` (config.css), `progress-fill`, `ring-fill` (atoms.css) y `countUp` en `infra/animate.js`. Sin reglas escritas de duración/propósito, y con **dos bucles infinitos ambientales** en los empty states (`empty-orbit`, `empty-float` en atoms.css) que el propio brief veta ("cero animaciones permanentes"). `shimmer` y `spin` están muertos (PERF.8 ya los tiene sentenciados).
6. **Las lecciones de contraste de IV.1/IV.2 están medidas y vigentes**, y toda riqueza nueva las hereda: texto real sobre tinte → ~6%; glifo/icono → 12-14% (umbral 3:1); relleno que ES la información (barras, anillos) → `-text`; token crudo solo para acentos decorativos acompañados de icono/etiqueta. Método: cálculo WCAG real contra el fondo efectivo, nunca a ojo.

## Decisión (propuesta)

### D1. Superficie y elevación: escala de 4 niveles

Se formaliza la elevación como escala semántica. Cada superficie declara su **nivel**, no una sombra suelta:

| Nivel | Nombre | Fondo | Borde | Sombra | Ejemplos |
|---|---|---|---|---|---|
| 0 | Lienzo | `--fk-bg-base` | no | no | fondo de página, secciones |
| 1 | Reposo | `--fk-bg-surface` | `--fk-border-subtle` | **`--fk-shadow-sm` (nuevo en reposo)** | `.card`, `.bento__cell`, `.list-item` |
| 2 | Realce | `--fk-bg-elevated` | `--fk-border-default` | `--fk-shadow-md` | hover de card, dropdowns, card anidada destacada |
| 3 | Flotante | `--fk-bg-surface` | según pieza | `--fk-shadow-lg` | modales, toasts, sheets (ya es así hoy) |

- **El cambio real es el nivel 1:** las cards ganan sombra en reposo. En claro es el salto visible (profundidad suave que hoy no existe); en oscuro es un refuerzo sutil y la profundidad la siguen dando los escalones de fondo (hallazgo 2, honestidad ante todo).
- **Tema claro: sombras de doble capa.** `--fk-shadow-sm/md` suben a dos capas en `themes.css` (una nítida de contacto + una ambiental difusa, tintadas azul-tinta como ya es el patrón). Dos capas siguen siendo pintura única por elemento: costo cero por frame.
- **Radios y espaciado no cambian** (la escala vigente ya es generosa: lg 16 / xl 24). Se agrega una regla de "aire" para las iniciativas v2: separación entre bloques de una sección `--fk-space-6` en móvil y `--fk-space-8` en escritorio; el aire es parte del premium, no un desperdicio.
- **Presupuesto de costo:** `box-shadow` se pinta una vez; puede **transicionar** en cambios discretos de estado (hover/focus, ya existe) pero queda **prohibido animarlo en keyframes** o ligado a scroll.

### D2. Color secundario por dominio: rampa derivada, no un segundo matiz

El "color secundario por módulo" del brief se materializa como **tono derivado del mismo matiz**, nunca como un matiz nuevo por sección:

- **Por qué no un segundo hue:** el ADR 031 fijó el techo de ~8 identidades cromáticas discriminables; 11 matices secundarios duplicarían las colisiones (incluidas las daltónicas que IV.1 midió y resolvió) y producirían el arcoíris que el propio brief de color rechazó.
- **Materialización:** el mapeo `[data-dom]`/`[data-section]` gana una segunda variable, **`--fk-section-color`** (el token crudo `--fk-dom-X`), junto a la existente `--fk-section-accent` (`-text`). Sobre ella se define **un** token de degradado de identidad:
  `--fk-grad-identity: linear-gradient(160deg, color-mix(in srgb, var(--fk-section-color) 12%, transparent), transparent 55%)` (ángulo y porcentajes exactos se calibran en DV.2a con contraste medido).
- **Usos permitidos del degradado:** heroes de sección (saldo de Inicio, fondo-hero, inversion-hero), empty states y superficies grandes de identidad. Máximo **2 paradas** (se conserva la prohibición de multi-stop del ADR 031 D6). Los CTA primarios, los fondos de página y las filas de lista siguen planos: el degradado señala jerarquía, no inunda.
- **Regla de contraste heredada:** si hay texto encima, se mide contra la **parada más fuerte** del degradado con la fórmula WCAG real; texto coloreado (`-text`) encima exige bajar esa parada a ~6-8% (lección medida de IV.2a). Texto largo jamás sobre degradado.
- Un tono profundo por dominio (`--fk-dom-X-deep`) **no se crea todavía**: ningún consumidor lo necesita hoy; si un hero futuro pide fondo fuerte, se deriva con `color-mix` documentado en ese momento (evita 11 tokens huérfanos).

### D3. Riqueza visual: decoración con presupuesto, sobre el pipeline del ADR 026

Tres clases de recurso, dos de ellas nuevas en la biblioteca:

1. **Formas orgánicas (`assets/svg/decoracion/` → prefijo `d-*`), estáticas y compartidas.** Catálogo inicial de 3 a 5 formas neutras (curvas suaves, arcos, blobs contenidos) con `fill="currentColor"`: **el color del dominio las vuelve "de la sección"** vía el contexto, sin diseñar 13 sets (misma lógica que la chispa de los iconos). Uso: máximo **1 por pantalla**, ancladas a esquinas de heroes o empty states mediante una clase `.decor` (posición absoluta, `aria-hidden="true"`, `pointer-events: none`, opacidad 4-8%, recortadas por el `overflow: hidden` que las cards ya tienen). **Nunca debajo de un bloque de texto largo**; si tocan la zona de un texto, el contraste se re-mide contra el compuesto (D6).
2. **Patrón discreto: CSS puro, sin asset.** Un único patrón de puntos tokenizado (`--fk-pattern-dots`, `radial-gradient` repetido construido con variables: tematiza solo y cuesta una pintura). Reservado para empty states y onboarding. No se crean patrones por dominio.
3. **Ilustraciones (`assets/svg/ilustraciones/` → prefijo `il-*`): clase nueva de asset.** Spec propia (retícula 120, trazo del lenguaje v2 escalado, paleta limitada a roles de token: `currentColor`, `--fk-icon-dot`, tintes de dominio; deben funcionar en ambos temas). Primer destino: los empty states de las superficies más vistas, reemplazando el arte geométrico actual de `emptyArt()`; segundo, el onboarding. **Esteban diseña en Illustrator (ADR 026)**; los drafts de Claude entran como plantillas que él sobrescribe, mismo principio "la biblioteca nace poblada" que ya funcionó con los 100 símbolos.

**Pipeline:** `scripts/sync-sprite.py` se extiende con las dos carpetas/prefijos nuevos y validación diferenciada (una ilustración no cumple las reglas de un icono de 24px; sí cumple viewBox declarado, primitivas permitidas, cero `<image>`, IDs prefijados). El guardarraíl de sprite-sync las vigila igual.

**Presupuesto de peso:** lote inicial (formas + primeras ilustraciones) ≤ ~25 KB fuente (~6 KB gzip estimado) dentro del sprite inline: cero peticiones nuevas, SW sin cambios de estrategia. El gate real es D6 (Lighthouse 100 + `pnpm perf`).

### D4. Movimiento con propósito: catálogo cerrado

**Principios (doctrina nueva, se escribe en DESIGN_SYSTEM.md):**

- Toda animación responde una de dos preguntas: **"¿qué acaba de pasar?"** (feedback de acción) o **"¿a dónde entré?"** (orientación). Si no responde ninguna, no entra.
- Duración: **150-250 ms** para micro-interacciones; 300-350 ms es el techo, solo para entrada de sección (el `sectionIn` existente ya está ahí). Easing estándar: el `cubic-bezier(0.2, 0.8, 0.2, 1)` ya usado en `sectionIn`.
- Solo `transform` y `opacity` (compositor). Una animación se ejecuta **una vez**: cero bucles (`animation-iteration-count: infinite` queda prohibido en todo el CSS).
- `prefers-reduced-motion`: el kill global de `a11y.css` se mantiene; todo helper JS nuevo se auto-chequea (patrón de `countUp` en `infra/animate.js`).
- **El catálogo es cerrado:** agregar una animación = agregarla a la tabla de DESIGN_SYSTEM.md con su propósito justificado. Sin entrada en el catálogo, no se implementa.

**Catálogo (existente + 2 piezas nuevas):**

| Momento | Animación | Estado |
|---|---|---|
| Entrar a una sección | `sectionIn` (300 ms) | existe |
| Lista al renderizar | **cascada acotada**: `cardIn` con `animation-delay` escalonado solo en los primeros 6 items (paso 35 ms, cola total ≤ 175 ms extra) | nueva (DV.2c) |
| Registro guardado | toast (`toastIn/Out`) + `check-pop`; **resaltado de fila nueva**: pseudo-elemento con `--fk-dom-X-bg` que se desvanece vía `opacity` 1→0 en ~600 ms (compositor, sin animar `background-color`) | toast existe; resaltado nuevo (DV.2c) |
| Progreso que avanza | `progress-fill` / `ring-fill` | existe |
| Monto que cambia | `countUp` (animate.js, 500 ms, reentrante) | existe |
| Completar meta / pagar deuda / logro | toast + confetti del dominio `logros` | **vive en LG.2/ADR 032, este ADR no lo duplica** |
| Cambio de tema | `theme-transitioning` (280 ms acotado) | existe; su evolución es **CFG.7** (View Transitions), fuera de alcance |

**Retiros:** `empty-orbit` y `empty-float` (bucles infinitos ambientales de los empty states) se retiran en DV.2c: contradicen el veto de animaciones permanentes del propio brief. El empty state gana su personalidad por la ilustración estática (D3), no por movimiento perpetuo. `shimmer`/`spin` los borra PERF.8 (ya decidido).

### D5. Iconografía: un solo lenguaje, ratificado formalmente

La frase del brief "una familia de iconos propia por sección" **se resuelve ratificando el lenguaje único** del ADR 023 v2 ("trazo cálido con chispa"):

- La "familia por sección" **ya existe en la práctica** con la fórmula: metáforas propias por dominio (recibo, frasco, diana, velocímetro...) + teja y chispa teñidas con el color del dominio (IV.2 en producción). Eso es lo que hace que Gastos no se parezca a Metas sin romper la coherencia.
- 13 estilos de dibujo distintos destruirían la coherencia que costó 3 replanteos (v1 → v2 → tejas), multiplicarían por 13 el costo de mantener cada símbolo nuevo y volverían imposible la revisión contra spec.
- El vehículo para más personalidad por dominio sigue siendo **IV.4** (redibujos dirigidos post-color con spec por dominio, pipeline ADR 026), no un fork del lenguaje. Esta decisión cierra la tensión que el triaje del 8.º lote dejó señalada para resolución formal.

### D6. Guardarraíles duros (criterio de aceptación de CADA rebanada DV.2*)

1. **Ambos temas**, oscuro por defecto (las referencias del brief son claras; Finko no cambia su default). Todo token nuevo con override claro verificado.
2. **WCAG AA con cálculo real** (método IV.1: luminancia relativa + ratio contra el fondo efectivo, incluyendo mezclas `color-mix` y la parada más fuerte de un degradado). Umbral según contenido: texto 4.5:1, gráfico significativo 3:1; decoración pura exenta solo si de verdad no porta información.
3. **Lighthouse 100 en las 4 categorías** y **`pnpm perf` sin regresión** contra `scripts/perf/BASELINE.md`, medidos antes/después en cada rebanada (disciplina ADR 030).
4. **Lista prohibida** (del brief + ADN + esta decisión): `backdrop-filter`/blurs nuevos, filtros por elemento nuevos, animar `box-shadow`/`background` en keyframes (la vía es pseudo-elemento + `opacity`), bucles infinitos, animaciones ligadas a scroll, degradados de 3+ paradas, `mix-blend-mode`, `will-change` preventivo, parallax por JS.
5. **Cero JS nuevo para color y decoración**: todo vía CSS + atributos `data-dom`/`data-section` existentes. Los helpers de movimiento que requieran JS viven en `infra/animate.js` con su auto-chequeo de reduced-motion.
6. **Presupuesto por regla:**

| Recurso | Costo | Límite |
|---|---|---|
| Sombra en reposo | pintura única | transición solo en hover/focus |
| Degradado 2 paradas | pintura única | solo heroes/empty states; texto medido contra parada fuerte |
| Forma `d-*` | pintura única (SVG estático) | máx 1 por pantalla, opacidad 4-8% |
| Patrón CSS | pintura única | solo empty states/onboarding |
| Ilustración `il-*` | pintura única | presupuesto de sprite ≤ ~25 KB fuente por lote |
| Animación | compositor | 150-250 ms, una vez, catálogo cerrado |

## Preguntas abiertas para Esteban (P1 a P5, con recomendación)

- **P1. Alcance del degradado de identidad:** ¿piloto en los 3 heroes existentes (Inicio, Fondo, Inversión) y de ahí a donde las iniciativas v2 lo pidan (**recomendado**), o desplegarlo de una vez en las 13 secciones?
- **P2. Formas orgánicas:** ¿catálogo neutro compartido teñido por dominio vía `currentColor` (**recomendado**: 3-5 assets, coherencia garantizada) o diseño único por sección (cola de diseño x13)?
- **P3. Iconografía:** ¿ratificar el lenguaje único con acento por dominio (D5, **recomendado**) o abrir familias por sección (revierte ADR 023)?
- **P4. Ilustraciones, lote inicial:** ¿empty states de las 6 superficies más visitadas (**recomendado**: Inicio/Movimientos, Gastos, Cuentas, Deudas, Calendario, hub Ahorros) o el catálogo completo de una vez?
- **P5. Sombra en reposo:** ¿en ambos temas (**recomendado**: sutil en oscuro, protagonista en claro) o solo en tema claro?

## Plan de rebanadas (tarjetas DV.2*, no iniciar sin aprobar este ADR)

- **DV.2a - Tokens de superficie/elevación + degradado de identidad:** escala de 4 niveles (D1) aplicada a `.card`/`.bento__cell`/`.list-item`, sombras doble capa en claro, `--fk-section-color` + `--fk-grad-identity` (D2) con piloto en los heroes; DESIGN_SYSTEM.md actualizado (sección "Elevación" nueva).
- **DV.2b - Riqueza visual piloto:** extensión del sync a `decoracion/` (`d-*`), clase `.decor`, 3-5 formas draft (plantillas para Esteban), `--fk-pattern-dots`; piloto en 2 heroes + 2 empty states (D3).
- **DV.2c - Catálogo de movimiento:** cascada acotada de listas, resaltado de fila nueva, retiro de `empty-orbit`/`empty-float` + auditoría de `infinite`, doctrina del catálogo cerrado en DESIGN_SYSTEM.md (D4).
- **DV.2d - Ilustraciones:** carpeta `ilustraciones/` (`il-*`) + spec + extensión del sync; empty states del lote P4 reemplazan `emptyArt()` geométrico. Bloqueada por la cola de diseño de Esteban (drafts de Claude como plantillas).
- **Las iniciativas v2 por sección (IN.8, D.15, ANL.1, Mis Cuentas v2...) consumen este sistema**: la jerarquía y la "riqueza" pantalla por pantalla se ejecutan allá, nunca como sistemas paralelos (regla anti-doble-trabajo del triaje).

## Alternativas rechazadas

- **Un segundo matiz por dominio (11 hues nuevos):** rompe el techo de ~8 identidades discriminables del ADR 031, duplica el riesgo daltónico ya medido y resuelto, y produce el arcoíris que el brief de color rechazó explícitamente.
- **Glassmorphism / neumorphism:** el primero exige `backdrop-filter` (vetado por rendimiento; el único uso del CSS está muerto y PERF.8 lo borra); el segundo falla contraste AA casi por definición (sombras internas claras sobre fondos casi iguales).
- **Sombras dramáticas de 3+ capas:** en oscuro no se ven (hallazgo 2) y en claro ensucian; la contención ES el premium en una app financiera de confianza.
- **Animaciones ambientales permanentes (partículas, floats, brillos):** vetadas por el propio brief; las 2 existentes se retiran (D4).
- **Ilustraciones raster (PNG/WebP):** no heredan tokens (rompen el tema dual), pesan más y quedan fuera del pipeline SVG del ADR 026.
- **Familia de iconos por sección:** ver D5; revertiría la decisión de Esteban que fundó el lenguaje v2 tras el rechazo del lenguaje genérico.
- **Decoración vía JS (inyección condicional de shapes):** viola el espíritu de ADN 7/8 y suma JS a un problema 100% resuelto por CSS + markup estático.
