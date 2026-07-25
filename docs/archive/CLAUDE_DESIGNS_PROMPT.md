# Prompt para Claude Designs: paleta y tipografía (propuesta)

> **Archivado el 2026-07-24. Documento archivado por no representar la dirección actual del sistema de diseño.**
>
> Se conserva por su valor como exploración de diseño y referencia futura: la paleta de 12 colores de dominio, la comparación de 9 tipografías y la escala de tamaños/pesos siguen siendo material útil si algún día se replantea la dirección visual.
>
> La dirección vigente es el [ADR 031](../DECISIONS/031-identidad-de-color-por-seccion.md) (identidad de color por sección) más el [ADR 033](../DECISIONS/033-direccion-visual-premium.md) (dirección visual premium); la fuente de verdad de tokens es [`docs/DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). Este documento nunca se implementó ni fue enlazado desde ningún otro, y estuvo fuera de git hasta este archivado.

---

> **Estado original: propuesta, no implementada.** Esto NO reemplaza [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) (fuente de verdad actual: tema oscuro por defecto, acento esmeralda `--fk-accent`, principio "calma con energía"). Es un texto listo para pegar en Claude Designs y que genere mockups a partir de esta dirección. Si Esteban aprueba el resultado, la adopción formal necesita un ADR nuevo en `docs/DECISIONS/` (regla 2.7 de `CLAUDE.md`: toca el ADN de la app).

---

## Prompt (copiar desde aquí)

Te propongo una dirección de diseño **sobria, moderna y muy legible**, pensada para una PWA financiera con uso prolongado: una base neutra fuerte, 12 colores de dominio claramente diferenciados y tokens funcionales separados para estados, superficies y contenido. Material Design 3 recomienda sistemas de color con roles explícitos y contraste accesible; Apple insiste en legibilidad y tamaños cómodos; Notion y Miro muestran que los sistemas consistentes, con paletas controladas y tipografía limpia, funcionan mejor para lectura sostenida. ([m3.material](https://m3.material.io/foundations/designing/color-contrast))

### Paleta principal

La lógica que usaría es esta: 1) colores de dominio con identidad propia, 2) versiones claras y oscuras derivadas de cada color, 3) texto e iconografía con contraste garantizado, y 4) una base neutral muy estable para que la información financiera no compita visualmente con la interfaz. ([m3.material](https://m3.material.io/styles/color/overview))
Para una app financiera, evitaría saturación excesiva en casi toda la UI y reservaría los colores intensos para identificación, estados y énfasis, no para fondos masivos. ([m3.material](https://m3.material.io/foundations/designing/color-contrast))

| # | Nombre | HEX base | Tema claro | Tema oscuro | Texto sobre fondo | Iconos | Bordes | Hover | Activo | Badges | Contraste recomendado | Casos de uso ideales |
|---|---|---:|---:|---:|---|---|---|---|---|---|---|---|
| 1 | Azul confianza | #1E5EFF | #EAF1FF | #1E5EFF | #0B1220 en claro, #FFFFFF en oscuro | #FFFFFF | #9BB8FF | #5B85FF | #1748C7 | #D9E4FF | AAA con texto oscuro en claro, AA con texto blanco en oscuro | Inicio, resúmenes, KPIs, acciones primarias suaves |
| 2 | Índigo analítico | #4F46E5 | #EEF2FF | #4F46E5 | #111827 / #FFFFFF | #FFFFFF | #B6B8FF | #6D67FF | #3730A3 | #E0E7FF | AAA/AA según contexto | Análisis, insights, tendencias, comparativas |
| 3 | Cian informativo | #0891B2 | #E6FAFD | #0891B2 | #06222A / #FFFFFF | #FFFFFF | #8DE4F0 | #0AA8CE | #066074 | #D7F7FB | AAA/AA | Calendario, info, ayudas, sincronizaciones |
| 4 | Teal patrimonial | #0F766E | #E7F7F5 | #0F766E | #08201D / #FFFFFF | #FFFFFF | #8CD7D1 | #149387 | #0B5C56 | #D7F1EE | AAA/AA | Mis cuentas, fondos, reservas, saldos sanos |
| 5 | Verde crecimiento | #15803D | #E8F8EE | #15803D | #061A0D / #FFFFFF | #FFFFFF | #8CCF9F | #1A9A4A | #116331 | #D6F4DE | AAA/AA | Éxito, metas cumplidas, rendimiento positivo |
| 6 | Lima progreso | #65A30D | #F2F9E7 | #65A30D | #1A2407 / #FFFFFF | #FFFFFF | #C6E39A | #7FC61A | #4D7C0F | #E7F3CB | AAA/AA | Apartados, avance por objetivos, micro-hitos |
| 7 | Ámbar alerta | #B45309 | #FFF2DF | #B45309 | #2B1705 / #FFFFFF | #FFFFFF | #F0C38B | #D97706 | #92400E | #FFE3BA | AAA/AA | Advertencias, vencimientos, recordatorios |
| 8 | Naranja acción | #C2410C | #FFF0E8 | #C2410C | #2B1205 / #FFFFFF | #FFFFFF | #F2B08F | #E15A1E | #9A3412 | #FFD8C8 | AAA/AA | Gastos, consumos, movimientos críticos pero no error |
| 9 | Rojo riesgo | #DC2626 | #FDECEC | #DC2626 | #2A0909 / #FFFFFF | #FFFFFF | #F2A4A4 | #EF4444 | #B91C1C | #FBD5D5 | AAA/AA | Deudas, errores, sobrepasos, acciones de peligro |
| 10 | Magenta meta | #C026D3 | #FCEBFF | #C026D3 | #2A082D / #FFFFFF | #FFFFFF | #E7A5F0 | #D946EF | #9D1BAE | #F6D3FB | AA/AAA según fondo | Metas, planes especiales, celebraciones moderadas |
| 11 | Violeta inversión | #7C3AED | #F3ECFF | #7C3AED | #1A0D32 / #FFFFFF | #FFFFFF | #C7B0FF | #8B5CF6 | #5B21B6 | #E7DBFF | AAA/AA | Inversiones, crecimiento a largo plazo, proyecciones |
| 12 | Slate estructural | #334155 | #E8ECF2 | #334155 | #0F172A / #FFFFFF | #FFFFFF | #94A3B8 | #475569 | #1E293B | #D6DDE6 | AAA/AA | Navegación, estados neutros, metadata, contenedores |

#### Lectura técnica

La clave aquí es que cada dominio tenga una familia visual distinta: azul para confianza, teal para patrimonio, verde para salud financiera, rojo para riesgo, violeta para inversión, etc. Eso reduce confusión cognitiva y ayuda al reconocimiento rápido en dashboards densos, algo muy alineado con sistemas de color funcionales como Material 3 y con la lógica de Miro de ampliar paletas para mejorar identificación sin perder consistencia. ([help.miro](https://help.miro.com/hc/en-us/articles/25286391619986-Miro-s-new-design-language-overview))

### Dominios de la app

Para que no se sientan parecidas entre sí, asignaría una sola identidad cromática principal por dominio, y dejaría el resto para estados o soporte visual. La regla sería: **un dominio = un color dominante + neutrales + 1 color de estado**, no un arcoíris en cada pantalla. ([m3.material](https://m3.material.io/styles/color/overview))

| Dominio | Color principal | Color secundario | Uso visual recomendado |
|---|---|---|---|
| Inicio | Azul confianza | Slate estructural | Resumen general, KPIs, navegación de alto nivel |
| Mis cuentas | Teal patrimonial | Azul confianza | Saldos, cuentas activas, consolidación |
| Gastos | Naranja acción | Ámbar alerta | Flujo de consumo, categorías, alertas de gasto |
| Presupuesto | Índigo analítico | Cian informativo | Distribución, límites, ejecución vs plan |
| Deudas | Rojo riesgo | Ámbar alerta | Vencimientos, intereses, semáforos de riesgo |
| Calendario | Cian informativo | Slate estructural | Fechas, recordatorios, eventos financieros |
| Metas | Magenta meta | Verde crecimiento | Hitos, avance, celebraciones contenidas |
| Apartados | Lima progreso | Teal patrimonial | Ahorros por objetivo, progreso incremental |
| Fondo de emergencia | Verde crecimiento | Slate estructural | Reserva, seguridad, estabilidad |
| Inversiones | Violeta inversión | Índigo analítico | Rendimiento, horizonte, diversificación |
| Análisis | Índigo analítico | Cian informativo | Gráficas, comparaciones, tendencia e insights |
| Movimientos | Slate estructural | Azul confianza | Listados, filtros, transacciones, trazabilidad |

### Estados funcionales

Aquí conviene separar colores de dominio de colores de sistema. Material Design 3 enfatiza roles de color para jerarquía, estado y accesibilidad; no conviene que el rojo sirva a la vez para "deuda", "error" y "eliminar" sin distinción contextual. ([developer.android](https://developer.android.com/design/ui/wear/guides/styles/color))
Además, Miro y Apple muestran una tendencia clara a simplificar fondos, usar negros/neutros limpios y reservar color para significado, no decoración. ([developer.apple](https://developer.apple.com/design/human-interface-guidelines/typography))

| Token funcional | Color recomendado | HEX | Uso |
|---|---|---:|---|
| Éxito | Verde crecimiento | #15803D | Confirmación, metas logradas, ahorro cumplido |
| Advertencia | Ámbar alerta | #B45309 | Límite próximo, vencimiento, precaución |
| Error | Rojo riesgo | #DC2626 | Fallos, deuda vencida, validaciones críticas |
| Información | Cian informativo | #0891B2 | Ayuda, tips, sincronización, avisos |
| Deshabilitado | Slate suave | #94A3B8 | Elementos inactivos, texto secundario |
| Fondo principal claro | | #F8FAFC | Base de lectura |
| Fondo principal oscuro | | #0B1220 | Base OLED-friendly |
| Fondo secundario claro | | #EEF2F7 | Capas, paneles |
| Fondo secundario oscuro | | #111827 | Capas, paneles |
| Superficies claras | | #FFFFFF | Cards, sheets, popovers |
| Superficies oscuras | | #162033 | Cards, sheets, popovers |
| Cards claras | | #FFFFFF | Contenido principal |
| Cards oscuras | | #121B2A | Contenido principal |
| Modales claros | | #FFFFFF | Diálogos, confirmaciones |
| Modales oscuros | | #101826 | Diálogos, confirmaciones |
| Inputs claros | | #FFFFFF | Formularios |
| Inputs oscuros | | #0F172A | Formularios |
| Bordes | | #CBD5E1 | Separación visible sin ruido |
| Separadores | | #E2E8F0 | Divisiones sutiles |
| Sombras | | rgba(15, 23, 42, 0.12) | Elevación suave |
| Links | | #1E5EFF | Interacción y navegación |
| Botón primario | | #1E5EFF | Acción principal |
| Botón secundario | | #334155 | Acción secundaria |
| Botón peligro | | #DC2626 | Borrado, eliminación, cancelación irreversible |
| Tipografía principal | | #0F172A en claro, #F8FAFC en oscuro | Texto principal |

### Tipografías evaluadas

Para una app financiera, yo priorizaría tres cosas: legibilidad sostenida, claridad numérica y buena renderización en móvil/escritorio. Apple remarca la legibilidad como criterio central; Material recomienda contraste y estructuras claras; Notion y Miro usan tipografías sans limpias y consistentes para lectura continua. ([dembrandt](https://www.dembrandt.com/explorer/notion))

| Tipografía | Ventajas | Desventajas | Móvil | Escritorio | Rendimiento web | Compatibilidad OS | Números y datos | Tablas | Fatiga visual | Accesibilidad |
|---|---|---|---|---|---|---|---|---|---|---|
| Inter | Excelente x-height, muy limpia, popular en productos digitales | Puede sentirse "genérica" si no se acompaña con buen sistema visual | Muy alta | Muy alta | Alta | Alta | Muy buena | Muy buena | Baja | Alta |
| SF Pro | Excelente integración en ecosistema Apple, gran legibilidad | No es ideal como única apuesta cross-platform en web; depende del sistema | Excelente en iPhone | Muy alta en Apple | Alta | Media/alta | Muy buena | Muy buena | Muy baja | Alta |
| Roboto | Robusta, conocida, estándar en Android | Menos elegante y menos refinada para producto premium | Alta | Alta | Muy alta | Muy alta | Buena | Buena | Media | Alta |
| Manrope | Moderna, amigable, sensación premium | Menor tradición en interfaces densas; algunos números se sienten más anchos | Alta | Alta | Alta | Alta | Buena | Buena | Media | Alta |
| Plus Jakarta Sans | Moderna, expresiva, buen balance | Puede sentirse más "marca" que "sistema" | Alta | Alta | Alta | Alta | Buena | Buena | Media | Alta |
| IBM Plex Sans | Excelente para producto serio y técnico | Más carácter; puede sentirse menos liviana en mucha densidad | Alta | Muy alta | Alta | Alta | Muy buena | Muy buena | Baja | Muy alta |
| Source Sans | Muy legible, sobria, estable | Menos contemporánea visualmente | Alta | Alta | Alta | Muy alta | Buena | Buena | Baja | Alta |
| Nunito Sans | Amable y redondeada | Demasiado blanda para una app financiera con muchas tablas | Media | Media | Alta | Alta | Regular | Regular | Baja | Media |
| Atkinson Hyperlegible | Excelente diferenciación de caracteres | Más orientada a accesibilidad extrema que a branding premium | Muy alta | Alta | Alta | Alta | Muy buena | Muy buena | Muy baja | Muy alta |

### Recomendación tipográfica

Mi recomendación principal es **Inter**. Tiene una lectura excelente en UI densas, un diseño muy equilibrado, buen comportamiento en móvil y escritorio, y se ve moderna sin distraer de los datos; además, funciona muy bien con números, tablas y jerarquías de información financiera. ([dembrandt](https://www.dembrandt.com/explorer/notion))
Si priorizaras accesibilidad extrema por encima de estética, IBM Plex Sans o Atkinson Hyperlegible serían candidatas muy fuertes, pero para una PWA financiera general Inter da el mejor balance entre profesionalismo, rendimiento visual y adopción práctica. ([developer.apple](https://developer.apple.com/design/human-interface-guidelines/typography))

> **Nota de contexto (Finko ya cumple esto):** el proyecto ya usa Inter Variable, self-hosted, como única fuente (ver [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md) sección "Fuentes"). No haría falta cambiar de tipografía si se adopta esta paleta; la recomendación tipográfica confirma la elección ya vigente.

### Tamaños y pesos

Para una app financiera, el sistema tipográfico debe favorecer lectura prolongada y escaneo rápido. Apple recomienda tamaños cómodos y Material favorece jerarquías claras con contraste suficiente; en la práctica, esto se traduce en base 16 px y escalado moderado. ([m3.material](https://m3.material.io/foundations/designing/color-contrast))

| Elemento | Tamaño | Peso | Line-height recomendado |
|---|---:|---:|---:|
| H1 / vista principal | 32 px | 700 | 1.15 |
| H2 / sección | 24 px | 650-700 | 1.2 |
| H3 / tarjeta o bloque | 20 px | 600 | 1.25 |
| Subtítulo | 18 px | 500-600 | 1.35 |
| Body principal | 16 px | 400 | 1.5 |
| Body secundario | 14 px | 400 | 1.45 |
| Botones | 14-16 px | 600 | 1.1 |
| Etiquetas / captions | 12 px | 500 | 1.25 |
| Números financieros destacados | 18-22 px | 600-700 | 1.1 |
| Números en tablas | 14-16 px | 500-600 | 1.2 |

### Reglas de consistencia

Mantendría una base clara de neutrales cálidos o fríos muy suaves, con dark mode real sobre casi negro y no sobre gris medio, porque eso mejora lectura prolongada y funciona mejor en OLED. Material 3 ya contempla temas oscuros y relaciones de color accesibles automáticamente, y Miro también muestra que ampliar la paleta no debe romper consistencia, sino reforzar identificación. ([help.miro](https://help.miro.com/hc/en-us/articles/25286391619986-Miro-s-new-design-language-overview))

En términos prácticos, usa un solo color dominante por módulo, reserva el color para significado, aplica sombras mínimas, bordes suaves y estados hover/active consistentes. Para números financieros, usa alineación tabular cuando sea posible, evita peso excesivo y mantén el mismo estilo de decimales y separadores en toda la app.

### Recomendación final

Mi propuesta definitiva es: base neutra sobria, 12 colores de dominio bien separados, estados funcionales explícitos y tipografía **Inter** como sistema principal. Esta combinación transmite confianza, minimiza fatiga visual, mejora el escaneo de datos y se adapta bien a tema claro/oscuro, móvil/escritorio y pantallas OLED/LCD. ([developer.apple](https://developer.apple.com/design/human-interface-guidelines/typography))
Para una PWA financiera, la mejor práctica es que el color identifique contexto, mientras la tipografía y la estructura hagan el trabajo pesado de lectura; esa separación produce una interfaz más profesional y más fácil de usar durante largas sesiones. ([m3.material](https://m3.material.io/foundations/designing/color-contrast))

| Decisión | Recomendación |
|---|---|
| Paleta definitiva | Azul confianza, Índigo analítico, Cian informativo, Teal patrimonial, Verde crecimiento, Lima progreso, Ámbar alerta, Naranja acción, Rojo riesgo, Magenta meta, Violeta inversión, Slate estructural |
| Asignación a dominios | Inicio = Azul; Mis cuentas = Teal; Gastos = Naranja; Presupuesto = Índigo; Deudas = Rojo; Calendario = Cian; Metas = Magenta; Apartados = Lima; Fondo de emergencia = Verde; Inversiones = Violeta; Análisis = Índigo/Cian; Movimientos = Slate |
| Tipografía principal | Inter |
| Títulos | 32/24/20 px, pesos 700/700/600 |
| Texto | 16 px, peso 400 |
| Texto secundario | 14 px, peso 400 |
| Botones | 14-16 px, peso 600 |
| Etiquetas | 12 px, peso 500 |
| Números | 16-22 px, peso 500-700 |
| Line-height | 1.15 a 1.5 según jerarquía |

Si quieres, en el siguiente paso puedo convertir esta propuesta en un **design token set** listo para Figma, CSS variables o Tailwind.

---

## Instrucciones para Claude Designs

Al implementar esta propuesta, tener en cuenta el contexto real de Finko:

1. **Finko es dark-first, no light-first**: la propuesta trae valores para ambos temas, pero el modo oscuro es el default de la app (`DESIGN_SYSTEM.md`, principio 3). Genera primero las pantallas en oscuro.
2. **12 dominios reales de la app** (no genéricos): Inicio, Mis cuentas, Gastos, Presupuesto, Deudas, Calendario, Metas, Apartados, Fondo de emergencia, Inversiones, Análisis, Movimientos. Usa nombres y iconografía de esas secciones, no ejemplos abstractos.
3. **Tokens con la nomenclatura del proyecto**: si generas CSS, sigue el patrón `--fk-dom-<seccion>` / `--fk-dom-<seccion>-bg` / `--fk-dom-<seccion>-text` que ya usa Finko (ver `DESIGN_SYSTEM.md`), para que la migración sea un mapeo directo y no una reescritura.
4. **Contraste WCAG AA como mínimo, AAA cuando se pueda**, verificado explícitamente por combinación (no solo declarado): Finko exige Lighthouse Accessibility 100.
5. **Tipografía**: no cambia nada, Inter Variable ya está self-hosted en el proyecto.
6. **Entregable esperado**: mockups de las 12 secciones (o al menos Inicio, Gastos, Deudas y Análisis como muestra representativa) en modo oscuro y claro, con la paleta de dominio aplicada a sus componentes reales (heroes, chips, cards, badges de estado).
