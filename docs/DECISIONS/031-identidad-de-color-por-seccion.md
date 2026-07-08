# ADR 031 - Identidad de color por sección (dos capas: identidad + semántica)

**Estado:** Aceptada por Esteban el 2026-07-07. P1 a P5 resueltos, los 5 con la opción recomendada: (P1+P5) Gastos en coral, egresos neutros con signo, ADR 019 se mantiene sin cambios; (P2) Deudas separada del danger en frambuesa; (P3) Límites se queda en amarillo; (P4) hub Ahorros en familia de colores (no 4 matices únicos). **Implementada en IV.1 (2026-07-07):** el hex de frambuesa se corrigió de `#ef5777` (texto original de este ADR) a `#ea5385` al calcular su matiz real en HSL y encontrarlo a solo 7° del rojo de `--fk-danger` — demasiado cerca para daltonismo protán. El valor final (`#ea5385`, separado 14-19° de matiz) es el que vive en `styles/tokens.css`; ver [BOARD.md](../BOARD.md) IV.1 para el detalle de la verificación.
**Fecha:** 2026-07-07
**Autores:** Esteban (visión de producto), Claude Fable 5 (análisis y diseño).
**Relación:** evoluciona el [ADR 023](023-lenguaje-de-iconografia-propio.md) (Finko Icons v2, tejas por dominio) sin revertirlo; usa el pipeline del [ADR 026](026-biblioteca-de-recursos-graficos.md) (Esteban diseña SVG en Illustrator, `assets/svg/` fuente de verdad) para cualquier redibujo; **mantiene** el criterio semántico del ADR 019 + AUD.4 ("gastar no es incumplir"), confirmado por Esteban en P1+P5. Restricción de rendimiento heredada de la auditoría PERF (2026-07): cero efectos nuevos costosos.

---

## Contexto

Brief de Esteban (2026-07-07): la app depende demasiado del verde y el negro; las secciones se perciben similares y obligan a leer para ubicarse. Pide un color característico por sección, desplegado en toda la experiencia (tarjetas, botones, iconos, barras, gráficos, calendario, dashboard, movimientos), números que comuniquen, un replanteo del sistema de iconos ("el minimalismo extremo no me convence"), accesibilidad WCAG AA+ y cero costo de rendimiento.

### Hallazgos del análisis del código (2026-07-07)

1. **El sistema de color por sección ya existe a nivel de tokens, pero está sub-desplegado.** `tokens.css` define 10 colores de dominio (`--fk-dom-*`) con croma armonizado desde el rediseño 2026. El propio ADR 023 v2 diagnosticó (causa 4 del "frío"): "cero color fuera del estado activo, con 10 colores de dominio ya definidos en tokens y desaprovechados". Hoy se usan solo en superficies pequeñas: tejas de categoría (`.cat-teja`), puntos del calendario (`.cal-dot--*`), badges (`.dom-badge--*`), iconos del menú "Más", tiles de "Registrar", bordes de banners y las celdas bento de Inicio. Ninguna sección tiñe su encabezado, sus barras de progreso, sus gráficos ni sus formularios. **La percepción de "todo verde y negro" no viene de falta de sistema sino de falta de despliegue.**
2. **Los tokens de dominio no tienen rampa para tema claro.** `themes.css` sobrescribe marca, semánticos, fondos y texto, pero **ningún `--fk-dom-*`**. Los valores calibrados para fondo oscuro se sirven tal cual sobre blanco: `--fk-dom-presupuesto` #f3b740 da ~1.9:1 sobre blanco, `--fk-dom-gastos` #ff8a5c ~2.5:1, `--fk-dom-analisis` #2fd2bf ~2.1:1. Como color de texto o glifo violan WCAG AA (4.5:1 texto, 3:1 UI). Es un hueco real de accesibilidad del sistema actual, invisible hasta ahora porque el color de dominio casi no se usa como texto.
3. **Faltan dominios.** No existen `--fk-dom-agenda` (Calendario) ni `--fk-dom-apartados`; Apartados hoy presta el verde menta de Ahorro y los fijos del calendario prestan el amarillo de Límites (`.cal-dot--fijo`), creando la ambigüedad "amarillo = ¿fijo o límite?".
4. **Colisión identidad/alarma:** `--fk-dom-compromisos` (#ff4757) es **idéntico** a `--fk-danger` (#ff4757). Un badge de Deudas y un estado de error son indistinguibles por color.
5. **Zona verde-turquesa saturada:** marca/ingresos #1fd194, ahorro #38c98c, análisis #2fd2bf e inversión #4db8d8 son 4 vecinos en la misma región del espectro; para visión normal ya se confunden, y con deuteranopia (el daltonismo más común) colapsan aún más.
6. **La psicología semántica ya está codificada y aprobada:** Design System principio 7 + criterio ADR 019/AUD.4: "verde = logro, ámbar = advertencia, rojo = incumplimiento. Gastar no es incumplir: los totales de gasto van en neutro, nunca en rojo". El brief propone "Gastos → Rojo" y "Egresos: rojo", lo que revertiría esa decisión (ver P1 y P5).
7. **Iconografía:** el lenguaje Finko Icons v2 ("trazo cálido con chispa") cerró hace 2 días (ID.1 a ID.7, 2026-07-05) tras tres replanteos. De las 4 causas diagnosticadas del "frío" (trazo genérico, duotono invisible, chispa apagada, cero color), las tres primeras se corrigieron; la cuarta (color) es exactamente lo que este ADR despliega. Redibujar los ~100 símbolos otra vez **antes** de desplegar el color sería atacar el síntoma equivocado.

## Decisión (propuesta)

### D1. Arquitectura de dos capas: identidad y semántica, nunca mezcladas

- **Capa de identidad** (`--fk-dom-*`): dice **de qué sección** es una pieza de información. Vive en tejas, badges, encabezados de sección, barras de progreso, segmentos de gráfico, puntos del calendario, bordes de acento.
- **Capa semántica** (`--fk-success/warning/danger/info`): dice **cómo está** esa pieza (bien, por vencer, vencida, informativa). Se superpone a cualquier sección y siempre viaja acompañada de icono y texto (nunca color solo, WCAG 1.4.1).
- **Regla de no colisión:** ningún token de identidad puede ser idéntico a uno semántico (corrige el hallazgo 4). Cuando una sección y un estado coinciden en pantalla, el estado manda en el elemento puntual (una deuda vencida muestra danger en su badge de estado) y la identidad permanece en la teja/contexto.
- **Regla "el color nunca viaja solo":** toda superficie teñida por identidad lleva además el icono de su dominio (las tejas ya lo cumplen) o su etiqueta. El color acelera el reconocimiento; nunca es el único canal.

### D2. Paleta de identidad recomendada (con los 5 puntos abiertos)

Criterios: psicología del color aplicada a finanzas personales, mínima re-curva de aprendizaje frente a lo ya desplegado (las tejas están en producción desde 2026-07-05), separación por luminosidad además de matiz (daltonismo), y máximo ~8 identidades fuertes (más allá de 8, la memoria cromática humana deja de discriminar categorías con fiabilidad; el objetivo declarado es reducir carga cognitiva, no crear un arcoíris).

| Sección | Hoy (oscuro) | Propuesta (oscuro) | Justificación |
|---|---|---|---|
| Inicio | neutro + marca | **igual** | Integra todo; el color lo aportan las piezas de cada dominio (coincide con el brief). |
| Ingresos (transversal) | esmeralda #1fd194 | **igual** | Verde = entrada de dinero, universal y ya es la marca. |
| Gastos | coral #ff8a5c | **igual** | Cálido y con energía sin ser alarma. Rojo haría punitiva la sección más usada (contradice ADR 019). |
| Deudas | rojo #ff4757 | **frambuesa #ea5385** | Conserva la seriedad del rojo pero deja de ser idéntico al danger. Separada 14° de matiz Y por luminosidad, no solo saturación (valor corregido en IV.1 tras calcular el HSL real; el borrador inicial, #ef5777, quedaba a 7° del danger). |
| Mis cuentas | azul #5b95f0 | **igual** | Azul = banca, confianza; convención de todo el sector. |
| Calendario | (sin token) | **índigo #7d8cf0** (nuevo `--fk-dom-agenda`) | Coincide con el brief. Índigo = tiempo/planificación; separado de cuentas por luminosidad y saturación. Los fijos (`.cal-dot--fijo`) pasan de amarillo a índigo: el amarillo queda solo para Límites (corrige hallazgo 3). |
| Límites | amarillo #f3b740 | **igual** | Ámbar = precaución dosificada; metáfora natural de "tope". |
| Me deben | rosa #f06fc2 | **igual** | Vínculo personal, cercano; bien separado de frambuesa por luminosidad. |
| Metas | púrpura #9d73eb | **igual** | Aspiración/logro a largo plazo; ya desplegado. |
| Ahorro (fondo) | menta #38c98c | **igual** | Familia del verde (guardar = acumular valor); hermano de la marca a propósito. |
| Inversión | cian #4db8d8 | **turquesa #2fd2bf** (hereda el actual de Análisis) | El brief pide turquesa para Inversión. Crecimiento sereno del capital. |
| Análisis | turquesa #2fd2bf | **pizarra neutra #8f9bb3** | Análisis es meta-información: interpreta a los demás dominios, y sus gráficos ya usan los colores de ellos. Volverla neutra descongestiona la zona verde-turquesa (hallazgo 5) y refuerza su rol de "lente", no de dominio con datos propios. |
| Movimientos | (sin token) | **neutro** | Es un ledger transversal: cada fila lleva la teja del dominio de origen; la sección no compite. |
| Apartados | presta menta | **comparte la familia menta del hub Ahorros** | Con 4 pestañas dentro de un mismo hub, darle un 12.º matiz único rompe el límite de discriminación. Se diferencia por icono (caja vs frasco) y por su matiz derivado (`color-mix` menta + azul ~15%), no por un hue nuevo. |
| Ajustes | neutro | **igual** | Utilitario. |

**Rampa por dominio (nuevo):** cada `--fk-dom-X` gana dos acompañantes siguiendo el patrón de los semánticos: `--fk-dom-X-bg` (fondo al 10-14% vía `color-mix`, ya es el patrón de tejas/badges) y **`--fk-dom-X-text` con override obligatorio en `body.light-theme`** (variante oscurecida que pase 4.5:1 sobre blanco, igual que `--fk-warning` pasa de #ffb82e a #8a5a00). Esto corrige el hallazgo 2 de raíz. Los valores claros exactos se calibran en IV.1 con verificación de contraste real contra `--fk-bg-base` y `--fk-bg-surface` claros.

**Decisiones de Esteban (2026-07-07), las 5 con la opción recomendada:**

- **P1+P5. Gastos y egresos: cálido y neutro.** Gastos se queda en coral (no rojo); los egresos en toda la app se muestran con signo `−` en texto normal, sin teñir de alarma. El ADR 019 ("gastar no es incumplir") se mantiene sin cambios.
- **P2. Deudas se separa del danger.** Pasa a frambuesa `#ea5385` (valor corregido en IV.1, ver nota en el Estado arriba), un rojo propio que conserva la seriedad sin ser idéntico al error del sistema.
- **P3. Límites se queda en amarillo.** Ya desplegado en barras y tejas; el rosa sigue siendo de Me deben.
- **P4. Hub Ahorros en familia de colores.** Metas púrpura, Ahorro/Apartados menta, Inversión turquesa. Metas no pasa a azul (evita el choque con Mis cuentas).

### D3. Despliegue por superficie (dónde aparece el color de sección)

Orden de despliegue de mayor a menor impacto de reconocimiento, todo vía tokens existentes o nuevos de D2:

1. **Encabezado de sección:** título con teja grande del dominio (icono + tinte 14%) y subrayado/acento inferior en `--fk-dom-X`. Es la señal "estás aquí" que hoy no existe.
2. **Navegación:** el item activo de bottom-nav/sidebar se tiñe con el color de SU sección (hoy todo activo es verde marca). El menú "Más" ya lo hace por icono.
3. **Barras de progreso y anillos** de cada sección en su color (hoy: verde genérico salvo score).
4. **Gráficos:** las series de un dominio usan su rampa (`color-mix` del dominio a 100/70/40%); los gráficos multi-dominio de Análisis ya usan el color de cada dominio y se mantienen.
5. **Inicio y Movimientos:** cada card/fila transversal ya lleva teja o borde del dominio de origen (bento, dom-badges); se completa donde falte (stats del resumen semanal, prioridades).
6. **Formularios/modales:** franja superior del modal teñida con el dominio (registrar gasto = coral, abono = frambuesa), reforzando "qué estoy registrando".
7. **Calendario:** leyenda y puntos ya son por dominio; solo cambia `.cal-dot--fijo` a índigo (D2).

**Límites del despliegue (tan importantes como el despliegue):** las superficies grandes nunca superan el ~14% de tinte (regla existente de tejas); los fondos de página siguen neutros (el color señala, no inunda); los CTA primarios siguen siendo de marca (un solo verbo principal por pantalla); y el texto largo jamás va en color de dominio.

### D4. Iconografía: desplegar color primero, redibujar después solo si hace falta

**No se redibuja el sprite completo (sería el 4.º replanteo en 4 días).** El diagnóstico del ADR 023 v2 identificó 4 causas del "frío"; 3 están corregidas y la 4.ª (color) es este ADR. La secuencia propuesta:

1. IV.1/IV.2 despliegan el color (D2/D3). Las tejas, chispas (`--fk-icon-dot`) y duotonos existentes ya están diseñados para teñirse por dominio: se encienden solos.
2. Con el color en producción, **revisión visual con capturas** (mismo método del 2026-07-04): ¿la app aún se siente fría/genérica?
3. Si sí, redibujos **dirigidos** (no globales) vía pipeline ADR 026: Esteban diseña en Illustrator sobre una **spec por dominio** que IV.4 definirá (grid 24, trazo 2.35, redondez ≥2.9, chispa en `--fk-icon-dot`, y el rasgo nuevo que se decida: p. ej. grosor variable o esquinas firmadas). Claude revisa cada SVG contra la spec (legibilidad a 16/22/48px, ambos temas, contraste, `sync-sprite.py`).

Esto respeta la regla de fidelidad (todo SVG de Esteban es versión oficial) y la inversión ya hecha en los 100 símbolos.

### D5. Números que comunican (sin revertir ADR 019)

- **Dirección:** ingresos/entradas con `+` y `--fk-success-text`; egresos con `−` y **neutro** (`--fk-text-primary`). El signo es el canal primario; el color refuerza solo lo positivo.
- **Estados sobre montos:** vencido = `--fk-danger` (+ icono), por vencer = `--fk-warning` (+ icono), completado/logro = `--fk-success`. Ya es el criterio vigente; se documenta como parte del sistema.
- **Pertenencia:** un monto nunca se tiñe con el color de su dominio; la pertenencia la dice la teja/badge de al lado (regla de no mezclar capas, D1). Excepción existente que se conserva: totales consolidados por dominio en cards de ese dominio (ej. "total invertido" en cian) donde el contexto entero ya es del dominio.
- **Daltonismo:** dirección y estado nunca dependen solo del color: signo, icono y texto siempre presentes.

### D6. Accesibilidad y rendimiento (requisitos de aceptación de cada fase)

- **Contraste:** todo uso de `--fk-dom-X-text` como texto pasa 4.5:1 en ambos temas; glifos/UI significativa 3:1 (WCAG 1.4.11). Verificación por herramienta en IV.1 y axe en E2E (suite A11Y.5 existente).
- **Daltonismo:** pares críticos identificados (coral/frambuesa/rosa; esmeralda/menta; azul/índigo) se separan por **luminosidad** además de matiz, y siempre con icono+etiqueta. Prueba con simulador deutan/protan en la revisión de IV.1.
- **Temas:** rampa clara obligatoria (D2); ningún token de dominio queda sin override claro.
- **Rendimiento:** solo variables CSS y `color-mix` (patrón ya usado; se resuelve en estilo computado, costo cero por frame). Prohibido introducir: gradientes multi-stop nuevos, sombras animadas, `backdrop-filter` nuevos, filtros por elemento adicionales (el `drop-shadow` de los iconos bento existentes se conserva pero no se extiende). Sin JS nuevo: el dominio ya viaja en `data-dom`/`data-dominio`/`data-section`.

## Fases propuestas (tarjetas IV.*, no iniciar sin aprobar este ADR)

- **IV.1 Fundación de tokens:** agregar `--fk-dom-agenda`, rampa `-text`/`-bg` por dominio, overrides de tema claro, separación deudas/danger (frambuesa); actualizar DESIGN_SYSTEM.md; verificación de contraste + daltonismo. (Sin cambios visibles grandes todavía.)
- **IV.2 Despliegue por superficie:** encabezados de sección, nav activa por sección, barras/anillos, franja de modales, `.cal-dot--fijo` a índigo, completar Inicio/Movimientos. Una sub-rebanada por grupo de superficies, verificable en la app.
- **IV.3 Números y estados:** documentar y completar D5 donde falte (stats del resumen, comparaciones de Análisis).
- **IV.4 Iconografía dirigida:** revisión visual post-color; si procede, spec por dominio + lotes de SVG de Esteban vía ADR 026.

## Alternativas rechazadas

- **Paleta literal del brief:** contiene colisiones internas (Gastos rojo vs "errores: rojo"; Apartados morado vs "egresos: morado"; Metas azul vs Cuentas azul; Límites rosa vs Me deben rosa) y revertiría ADR 019 sin discusión. Se toma su intención (identidad fuerte por sección) y sus aciertos (Calendario índigo, Inversión turquesa, Inicio neutro).
- **12+ matices únicos (uno por cada sección y subsección):** supera el límite de discriminación cromática humana y de los usuarios daltónicos; produce el "arcoíris sin criterio" que el propio brief rechaza.
- **Redibujo global inmediato del sprite (4.º replanteo):** ataca el síntoma equivocado; el diagnóstico v2 ya señaló al color como la causa restante. Se difiere a IV.4 condicionado a la revisión post-color.
- **Colores por JS/inline styles:** viola el ADN (cero `style=""`); todo por tokens y atributos `data-*` ya existentes.
