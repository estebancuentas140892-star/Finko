# Changelog - Finko Claude

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versiones en [Semantic Versioning](https://semver.org/lang/es/).

> Este archivo es la **memoria** del proyecto. Cuando una tarea/fase se cierra, se borra su tarjeta de [`BOARD.md`](BOARD.md) y se agrega aquí.
> Solo conserva el **mes corriente**; los meses anteriores viven en [`docs/changelog/`](changelog/).

---

## Mes corriente (2026-07)

### feat(tesoreria): NAV.A1, ingreso puntual en Mis cuentas · 2026-07-04

Primera tarea de implementación del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md). La auditoría detectó que registrar dinero que entra no tenía camino real: la única acción era la fuente fija (`nuevo-ingreso`), escondida y sin fecha ni cuenta. Ahora Mis cuentas tiene una sub-sección "Otros ingresos" con un botón "+ Ingreso" que abre "Registrar un ingreso": monto, cuenta destino (selector 0/1/varias de `cuenta-helper`; con 0 cuentas, guía a agregar una), descripción y categoría opcionales, y fecha (hoy por defecto).

Decisiones de datos y alcance (ver ADR 024 D3, revisado): colección nueva `S.ingresosPuntuales` (migración v21→v22 idempotente), no reutilizar `S.ingresos` (plantillas recurrentes, otro shape). El registro **acredita el saldo** de la cuenta destino y eliminarlo lo **revierte**, espejo exacto de un gasto (que descuenta y devuelve). Respeta la v8.8: el ingreso se refleja por su efecto (hero "Tu dinero disponible" y patrimonio neto), **no** como flujo en Análisis ni en el resumen semanal, que no cambian. La oferta del asistente de distribución al confirmar quedó **diferida a NAV.A2**: `_confirmarDistribucion` re-acredita la cuenta, así que abrirlo con el monto ya acreditado duplicaría el abono; unificar los flujos es propio de la hoja "Registrar".

Verificado en la app (móvil 390x844): saldo 100k → 350k al registrar $250k, hero muestra $350.000, y al eliminar vuelve a 100k con 0 registros; cero errores de consola. 2037/2037 unit (+13); 128/128 E2E; lint limpio. SW v300 → v301.

| Archivo | Cambio |
|---|---|
| `modules/core/state.js` | Slice `ingresosPuntuales` + typedef `IngresoPuntual`. |
| `modules/core/storage.js` | `SCHEMA_VERSION` 22 + migración v21→v22. |
| `modules/dominio/tesoreria/logic.js` | `validarIngresoPuntual` + `normalizarIngresoPuntual` (puras). |
| `modules/dominio/tesoreria/view.js` | `renderFormIngresoPuntual` + `renderListaIngresosPuntuales`. |
| `modules/dominio/tesoreria/index.js` | Handlers nuevo/guardar/eliminar + acredita/revierte saldo + acciones + EventBus. |
| `index.html` | Sub-sección "Otros ingresos" + modal `modal-ingreso-puntual`. |
| `styles/layout.css`, `styles/components/atoms.css` | `.section__sub-hint` + `.list-item__value--in` (verde). |
| `tests/unit/tesoreria.test.js`, `tests/unit/storage.test.js` | +13 tests (validar/normalizar + migración v22). |
| `service-worker.js` | v300 → v301. |

---

### docs(nav): auditoría de navegación móvil, ADR 024 y tarjetas NAV · 2026-07-04

Auditoría completa de la navegación móvil con ojos de usuario nuevo (viewport 390x844 con Playwright, localStorage limpio) más lectura del código de navegación. Resultado del test de orientación (8 preguntas): 3 evidentes, 3 a medias, 2 fallidas. Hallazgos principales: no existe registro de ingreso puntual y el ingreso fijo vive escondido en Mis cuentas (asimetría entró/salió); no hay acción de registro global y los CTA de alta viven en la peor zona del pulgar; 10 de 13 secciones detrás del modal "Más"; el dinero guardado repartido en 4 secciones sin jerarquía; la barra inferior no compensa el safe area de iOS (registrado como BUG-010).

Decisión aprobada en [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md): bottom nav de 5 posiciones con botón central "Registrar" (hoja con Gasto/Ingreso siempre y Abono/Aporte por divulgación progresiva), ingreso puntual como capacidad nueva de `tesoreria`, hub "Ahorros" (una entrada, cuatro pestañas, consolidado de ADR 009 como cabecera, sin fusionar dominios), modal "Más" plano de 7 tarjetas y pulidos. Revisa a nivel de navegación la decisión 2026-06 de no fusionar las 4 secciones de ahorro; los dominios no se tocan.

Solo documentación: ninguna funcionalidad afectada. Validación pendiente: ninguna (la implementación arranca con NAV.A1).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/024-reorganizacion-navegacion-movil.md` | ADR nuevo: contexto (auditoría), decisión D1 a D6, alternativas, slices. |
| `docs/BOARD.md` | Iniciativa de navegación 2026-07: tarjetas NAV.A1, NAV.A2, NAV.B y NAV.C. |
| `docs/BUGS.md` | BUG-010 registrado (safe area del bottom nav). |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente". |

---

### feat(ui): ID.6, Finko Icons v2 "trazo cálido con chispa" con piloto en la navegación · 2026-07-04

Revisión del lenguaje de iconografía ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md), sección "Revisión v2"). Al arrancar ID.3, el usuario replanteó el sistema: el lenguaje v1 (trazo 2, duotono 15 %, punto monocromo) cumplía pero se percibía neutro y frío. Tras análisis de mercado y 3 direcciones dibujadas sobre la paleta real, se adoptó la dirección A ("trazo cálido con chispa") combinada con C (insignias por dominio, para las categorías de ID.3); la B (sello sólido) se descartó por pesada en listas densas.

Reglas v2: trazo 2.35 global vía CSS `.icon` (`--sm` 2.5, `--lg` 1.8; toda la familia gana cuerpo en un solo cambio), redondez sistemática (radios ≥ 2.9, ápices con arco), duotono al 22 %, y **la chispa**: el punto de valor pasa a `fill="var(--fk-icon-dot, currentColor)"` y el contexto lo enciende en color. La navegación lo pone en acento: item inactivo gris con chispa verde viva (firma visible de la familia); sin variable declarada cae a `currentColor`, cero regresión y cero JS.

Piloto: los 14 símbolos de navegación redibujados en v2. Cambio de metáfora en Inversión: de zigzag con flecha a curva suave ascendente con la chispa en el extremo (progreso calmado). Verificado en preview (tema oscuro y claro: chispa `#1fd194` / `#13b377`, trazo computado 2.35px). 2024/2024 unit; 128/128 E2E. SW v299 → v300.

**Pendiente de validación:** revisión visual del usuario en su celular (nav inferior, modal "Más", empty states con trazo 1.8).

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados en v2; comentario del sprite actualizado. |
| `styles/components/forms.css` | `.icon` a trazo 2.35; `.icon--sm` 2.5; `.icon--lg` 1.8. |
| `styles/layout.css` | `--fk-icon-dot: var(--fk-accent)` en `.nav-item__icon.icon` (chispa encendida en nav). |
| `docs/DECISIONS/023-...md` | Sección "Revisión v2" con motivo, direcciones evaluadas y reglas nuevas. |
| `service-worker.js` | v299 → v300. |

---

### feat(ui): ID.2, familia Finko Icons en el resto de la UI estructural · 2026-07-04

Tercera fase de la identidad visual ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)). Se redibujan 8 símbolos existentes con el lenguaje (duotono + punto de valor): `i-saldo`, `i-recurring`, `i-lightbulb`, `i-alert`, `i-bolt`, `i-trophy`, `i-mountain` y `i-circle` (reinterpretado como "bola de nieve": dos círculos, uno chico creciendo a uno grande). Se agregan 5 símbolos nuevos: `i-star`, `i-percent`, `i-trending-up`, `i-info`, `i-bar-chart`; y se reutiliza `i-cuentas` para "Consolidar deudas" (misma metáfora, sin dibujo nuevo).

Se retiran los emojis de utilería concentrados en la card "Estrategia de pago" (💡, 💪, ✨, ℹ️, 🚨, ⚠️, 📊, 🤝, 🏦) y en el tip evergreen de Inversión (💡), reemplazados por `icon()`. Nuevo modificador `.icon--sm` (14px) para iconos junto a texto xs/sm.

**Fuera de alcance a propósito:** un `hint.textContent` en Apartados que interpola 💡 (asignar HTML a `textContent` lo mostraría como texto crudo); los emojis de categoría (`CATEGORIA_*_EMOJI`, dominio de ID.3); el badge "📝 Pendiente" de Gastos y los usos sueltos de ⚠ en otros 8 archivos (fuera del cúmulo visual que motivó esta fase).

2024/2024 unit; 128/128 E2E. Lint limpio. SW v298 → v299.

| Archivo | Cambio |
|---|---|
| `index.html` | 8 símbolos rediseñados + 4 nuevos (star, percent, trending-up, info, bar-chart). |
| `modules/dominio/compromisos/views/estrategia.js` | 10 emojis de utilería reemplazados por `icon()`. |
| `modules/dominio/inversiones/view.js` | Tip evergreen con `icon('lightbulb')`. |
| `styles/components/forms.css` | `.icon--sm`. |
| `styles/components/charts.css` | Tamaño de icono en `estrategia-card-pick__icono` (desktop + mobile). |
| `docs/DECISIONS/023-...md`, `docs/DESIGN_SYSTEM.md` | ID.2 documentada, `.icon--sm` referenciado. |
| `service-worker.js` | v298 → v299. |

---

### feat(ui): ID.4, espaciado y jerarquía en las tarjetas más densas · 2026-07-04

Segunda fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Cinco puntos de la auditoría visual quedan resueltos:

- **"¿Cómo distribuir?" (Mis cuentas, la tarjeta más densa en móvil):** las filas Necesidades/Estilo de vida/Ahorro pasan de párrafos corridos a un mini listado alineado (icono, etiqueta, porcentaje, monto) con filete discreto entre filas. Las alertas ("fondo aún no completo"...) ganan un callout con tinte de advertencia en vez de mezclarse con el texto. Los enlaces "Ver progreso/estrategia/seguimiento" pasan a fila propia con separación real entre ellos.
- **Bug real, no solo espaciado:** el icono de "1 pendiente del mes" en Inicio era invisible: reutilizaba `.cal-dot--*`, que pinta fondo Y color del mismo tono, así que el SVG quedaba del mismo color que su propio fondo. Ahora es un chip con fondo tenue y el icono en el color completo del dominio (`vencidos-card__icon--fijo/deuda-entidad/deuda-personal`).
- **Tarjeta del fondo (Ahorro):** la nota "este dinero sigue en tus cuentas..." se separa del dato "Objetivo: $X" con un filete y un peldaño menos de peso visual (ya no compite con la cifra).
- **Confetti de logros en móvil:** cada pieza partía siempre desde `bottom:90px` y caía 80px; en desktop no pasaba nada, pero en móvil terminaba a 10px del borde, dentro de la franja del bottom-nav. Ahora en viewports < 1024px arranca por encima de esa franja (mismo criterio que ya usa el toast).
- **Fade del sidebar (ventanas ≤ 800px de alto):** la franja que insinúa "hay más para desplazar" pasa de 20px a 36px con más paradas de color, así el borde de "HERRAMIENTAS" se ve como un desvanecido intencional y no como texto cortado a la mitad.

2024/2024 unit; 128/128 E2E. Lint limpio. SW v297 → v298.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Filas de distribución, alertas y CTAs con markup propio. |
| `modules/dominio/compromisos/views/dashboard.js` | Icono de vencidos con clase de color dedicada (fix del bug de invisibilidad). |
| `modules/dominio/ahorro/view.js` | Nota del fondo con clase propia (separada del dato). |
| `modules/dominio/logros/index.js` | Confetti con clearance de bottom-nav en móvil. |
| `styles/components/domain.css` | `.distribucion-row/-alerta/-ctas`, `.vencidos-card__icon--*`. |
| `styles/components/analysis.css` | `.fondo-hero__nota`. |
| `styles/layout.css` | Fade del sidebar más alto y suave; `.nav-item` compacto en ventanas bajas. |
| `service-worker.js` | v297 → v298. |

---

### feat(ui): ID.1, lenguaje de iconografía propio con piloto en la navegación · 2026-07-04

Primera fase de la iniciativa de identidad visual 2026-07 (revisión aprobada por el usuario). Nace la familia **"Finko Icons"** ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)): línea sobre grid 24 (trazo 2 heredado de `.icon`), **duotono** (la región "cuerpo" con `fill="currentColor" fill-opacity=".15"` como atributo del símbolo, atraviesa `<use>` sin CSS nuevo) y **punto de valor** (un círculo sólido integrado en la metáfora: la firma de la familia). Glifos utilitarios quedan monolínea a propósito.

Piloto: los 14 símbolos de navegación redibujados (`i-home`, `i-gastos` recibo, `i-agenda` día marcado, `i-deudas`, `i-mas`, `i-cuentas`, `i-personales` persona + moneda, `i-presupuesto` velocímetro, `i-metas` diana, `i-apartados`, `i-ahorro` frasco con moneda, `i-inversion` curva con área, `i-analisis` dona, `i-ajustes` deslizadores). Dos metáforas cambian a propósito: Límites pasa de torta a velocímetro y Ahorro de cerdito a frasco (legibilidad a 22px). Ids intactos: ningún consumidor (`icon()`, `emptyArt()`, HTML) cambió. Verificado con capturas Playwright a 22/48px en ambos temas, sidebar y bottom-nav. Cero costo de rendimiento (sprite estático, sin peticiones ni JS nuevos).

Fases siguientes en el tablero: ID.2 (resto del chrome), ID.3 (categorías, retira emojis estructurales), ID.4 (espaciado en tarjetas densas), ID.5 (micropulido de cifras).

2024/2024 unit; 128/128 E2E. SW v296 → v297.

| Archivo | Cambio |
|---|---|
| `index.html` | 14 símbolos de navegación redibujados + comentario del sprite actualizado. |
| `docs/DECISIONS/023-lenguaje-de-iconografia-propio.md` | ADR nuevo: lenguaje Finko Icons y plan de fases. |
| `docs/DESIGN_SYSTEM.md` | Sección Iconografía reescrita (lenguaje + estado de migración). |
| `docs/BOARD.md` | Tarjetas ID.2-ID.5 en Transversal. |
| `service-worker.js` | v296 → v297. |

---

### style(analisis): paleta unificada entre la dona y las barras por categoría · 2026-07-04

Cierra la observación registrada en el tablero de Análisis. Las barras laterales de "Gastos por categoría" dejan de ser todas verdes: cada una usa **el color que la dona le asignó a su categoría** (misma fuente: `colorearSegmentos`), y las categorías agrupadas en "Otros" heredan el slate de ese segmento, para que el color cuente la misma historia en toda la sección. Sin dona (sin segmentos), las barras conservan el color por defecto.

2022/2022 → 2024/2024 unit (2 nuevos); 128/128 E2E. Lint limpio. SW v295 → v296.

| Archivo | Cambio |
|---|---|
| `modules/dominio/analisis/view.js` | Barras con el color de su segmento de la dona. |
| `tests/unit/analisis.test.js` | 2 tests nuevos (paleta unificada en happy-dom). |
| `service-worker.js` | v295 → v296. |

---

### feat(tesoreria): MC.6c, señales más ricas para la distribución automática · 2026-07-04

Cierra MC.6c, la última tarjeta accionable del tablero. Dos señales nuevas en el motor de pisos (ADR 013):

- **Historial de gasto variable como proxy del estilo de vida real.** Nueva `calcularGastoVariablePromedio(gastos, hoy, meses)`: promedio mensual del gasto variable (sin `compromisoId` y fuera de Deudas/Ahorro/Gastos fijos) sobre los últimos 3 meses completos; los meses sin registros no diluyen y el mes corriente se excluye. El motor eleva el piso de Estilo de vida a ese promedio cuando supera el 10% mínimo: sugerir menos de lo que el usuario de verdad gasta produce planes incumplibles. Si eso aprieta el ahorro por debajo de su ideal, alerta accionable con el rubro a recortar (mismo espíritu que MC.11) y la razón lo menciona. Sin historial, la señal queda apagada (retrocompatible: reparto idéntico al anterior).
- **Inversiones como prioridad tras el fondo.** Con fondo completo y usuario que ya invierte, la razón agrega "tu fondo está completo, así que el ahorro puede ir a tus inversiones" y aparece la CTA "Aportar a tus inversiones" (antes ese caso no tenía CTA de inversión; "Explorar inversiones" sigue reservada a quien no invierte).

Límites de gasto consume el mismo `construirContextoDistribucion`: mejora automáticamente. Un test viejo fijaba el contrato anterior ("ya invierte → sin CTA"); se actualizó al nuevo.

2012/2012 → 2022/2022 unit (10 nuevos, 1 actualizado); 128/128 E2E. Lint limpio. SW v294 → v295.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `calcularGastoVariablePromedio`; piso EV informado por historial; razón/alerta/CTA nuevas. |
| `tests/unit/tesoreria.test.js` | 10 tests nuevos (proxy + señales), 1 actualizado. |
| `service-worker.js` | v294 → v295. |

---

### feat(inversiones): E.5, IPC observado como constante anual · 2026-07-04

Cierra E.5. Nueva constante `IPC_OBSERVADO_POR_ANIO` (variación anual del IPC al cierre de diciembre, decimal) con fuente y fecha de revisión (regla ADN #12): 2024 = 5,20% y 2025 = 5,10% (DANE, boletín de 2026-01-08), más el helper `ipcObservadoVigente()`.

Primer consumidor: la **rentabilidad real del portafolio** de Inversión pasa a descontar la inflación observada (el dato real de pérdida de poder adquisitivo) en vez de la meta de BanRep (3%), que queda en el copy como referencia de largo plazo. Con tasas nominales típicas de CDT (~9-10% EA) la diferencia es material: real ~4,2% con IPC observado vs ~6,3% con la meta. Mantenimiento anual: agregar la entrada del año en enero, junto a E.2.

2008/2008 → 2012/2012 unit (4 nuevos); 128/128 E2E. Lint limpio. SW v293 → v294.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `IPC_OBSERVADO_POR_ANIO` + `ipcObservadoVigente()`. |
| `modules/dominio/inversiones/view.js` | Rentabilidad real con IPC observado; copy con ambas referencias. |
| `tests/unit/constants.test.js` | Describe E.5 (4 tests). |
| `service-worker.js` | v293 → v294. |

---

### feat(gastos): TX.3, categorías Café y Gastos hormiga · 2026-07-04

Cierra TX.3. Dos categorías nuevas en el catálogo de gastos: **Café ☕** y **Gastos hormiga 🐜** (el concepto conocido en finanzas personales para las fugas pequeñas y recurrentes). Aparecen automáticamente en el form de gasto, los envelopes de Límites y la dona de Análisis. Sin migración: los gastos existentes no cambian. Guardarraíl nuevo: toda categoría de gasto debe tener emoji propio (ninguna cae al fallback 📦).

2005/2005 → 2008/2008 unit (3 nuevos); 128/128 E2E. Lint limpio. SW v292 → v293.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `Café` y `Gastos hormiga` en `CATEGORIAS_GASTO` + emojis. |
| `tests/unit/constants.test.js` | Describe TX.3 (3 tests). |
| `service-worker.js` | v292 → v293. |

---

### feat(logros): LG.1b, vitrina de logros en Ajustes · 2026-07-04

Cierra LG.1b con el ADR que pedía ([ADR 022](DECISIONS/022-vitrina-de-logros-en-ajustes.md)):

- **Decisión de ubicación:** card "🏆 Logros" al final de **Ajustes** (no sección propia: la nav ya tiene 13 secciones y la vitrina es solo lectura; no en Inicio: IN.1-IN.3 lo curaron como estado financiero del día). El momento de descubrimiento sigue siendo el toast (LG.1a); la vitrina es el "ver todos".
- **Arquitectura:** `config` no puede importar `logros` (ADN #10), así que el shell expone `#panel-logros` junto a `#panel-config` y el dominio logros renderiza ahí su propia vista (`logros/view.js`, archivo nuevo, agregado al precache del SW).
- **Catálogo extendido:** cada logro gana `hint` (cómo desbloquearlo, en imperativo; los conseguidos muestran `desc`) y `progreso(s)` opcional solo en los de conteo observable directo de S: `diez-gastos` (n de 10) y `diversificador` (n de 3 cuentas activas), con barra de progreso accesible. El progreso del fondo ya vive en Ahorro con su anillo: no se duplica.
- Nueva `estadoLogros(s, idsPersistidos)` pura: desbloqueado = persistido en `S.logros` o cumplido en vivo (un logro ganado no se revoca aunque el estado retroceda).

1994/1994 → 2005/2005 unit (11 nuevos); 128/128 E2E. Lint limpio. SW v291 → v292.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/022-vitrina-de-logros-en-ajustes.md` | ADR nuevo. |
| `modules/dominio/logros/logic.js` | `hint` + `progreso` en el catálogo; `estadoLogros`. |
| `modules/dominio/logros/view.js` | Archivo nuevo: vitrina. |
| `modules/dominio/logros/index.js` | Render en init, state:change y hashchange. |
| `index.html`, `service-worker.js` | Contenedor `#panel-logros`; asset nuevo + v291 → v292. |
| `styles/components/config.css` | Estilos `.logro-item` (pendientes atenuados, emoji en gris). |
| `tests/unit/logros.test.js` | 11 tests nuevos (estadoLogros + vitrina en happy-dom). |

---

### feat(agenda): AP.4, MT.2 y AH.4, recordatorio de día de ingreso en Calendario · 2026-07-04

Cierra las tres épicas de recordatorios de aporte con el único ADR que pedía el tablero ([ADR 021](DECISIONS/021-recordatorio-dia-de-ingreso.md)):

- **Modelo elegido:** el día de pago de cada ingreso activo (`diaPago`, capturado desde v12) aparece en Calendario como **evento de "día de ingreso"**: dot verde (`--fk-dom-ingresos`), entrada en la leyenda, item de detalle con el monto en verde, el recordatorio "Hoy llega tu dinero: recuerda apartar para tus objetivos" y botón **"Distribuir →"**. Respeta la frecuencia (Quincenal = dos ocurrencias, misma lógica que compromisos). El aria-label y el resumen del día distinguen "día de ingreso" de los compromisos a pagar, y el ingreso no infla el "Total a pagar".
- **Sin duplicar a MC.4:** el CTA emite `distribuir:abrir` (EventBus); tesorería navega a Mis cuentas y abre el asistente "Distribuir mi ingreso" en el primer paso. Los montos por vehículo ("$X para el SOAT", "Abonar a la meta") viven SOLO en el asistente: cero réplica del motor de ADR 013 en Agenda. Se rechazó el modelo de N eventos por meta/apartado/fondo (spam + flujos paralelos inferiores).
- El gating por fecha del asistente (MC.4d) sigue mandando: si el cobro aún no llega o ya se distribuyó, el usuario ve ese estado al llegar (degradación coherente).
- El nudge de proximidad de Apartados (60 días) se mantiene; el botón "Definir →" del compromiso mensual se conserva (la parte de AH.4 que pedía quitarlo quedó superada por AH.2: ese form ahora es la casa del aporte sugerido explicado; se verificó que `compromisoMensual` no alimenta nudges ni Score).

1983/1983 → 1994/1994 unit (11 nuevos); 127/127 → **128/128 E2E** (nuevo test del flujo completo: día en calendario → CTA → asistente abierto). Lint limpio. SW v290 → v291.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/021-recordatorio-dia-de-ingreso.md` | ADR nuevo (modelo agregado, alternativas rechazadas). |
| `modules/dominio/agenda/logic.js` | `eventosIngresosDelMes`; `totalDia` excluye ingresos. |
| `modules/dominio/agenda/view.js` | Merge por día, item de ingreso, leyenda, aria/resumen. |
| `modules/dominio/agenda/index.js` | Acción `agenda-distribuir-ingreso`; re-render ante `ingresos`. |
| `modules/dominio/tesoreria/index.js` | Listener `distribuir:abrir` + `_abrirAsistenteDistribucion`. |
| `styles/components/config.css` | `cal-dot--ingreso`, franja e ícono del item (patrón AG.6/AG.7). |
| `tests/unit/agenda.test.js`, `tests/e2e/smoke.test.js` | 11 unit + 1 E2E nuevos. |
| `service-worker.js` | v290 → v291. |

---

### feat(ahorro): AH.3 y AUD.6, ADR 020 fondo como marcador de liquidez + hint del modelo · 2026-07-04

Cierra juntas AH.3 y AUD.6, que el tablero pedía resolver en la misma decisión ([ADR 020](DECISIONS/020-fondo-marcador-de-liquidez.md)):

- **Decisión (AH.3):** el fondo de emergencia **sigue siendo un marcador de liquidez**: el aporte no pide cuenta de origen ni descuenta saldo. Se rechaza la variante con patrón AP.1 porque el modelo con descuento no tiene flujo de salida (el fondo no se "gasta" como una meta o un apartado: se usa en emergencias, y el dinero quedaría atrapado fuera de Mis cuentas), la migración retroactiva es imposible (los aportes históricos no tienen cuenta) y toda la app ya asume el marcador (Distribuir mi ingreso, Score, consolidado). La asimetría con Metas/Apartados es de propósito: esos vehículos son gasto futuro comprometido; el fondo es liquidez etiquetada.
- **Implementación (AUD.6):** hint permanente en la card del fondo ("Este dinero sigue en tus cuentas: el fondo solo lo marca como reservado para emergencias") y en el form de aporte, cerrando la doble contabilidad mental que motivaba ambas tarjetas.
- AH.4 pierde su dependencia de AH.3: el ADR de recordatorios (AP.4/MT.2/AH.4) puede diseñarse sobre un modelo ya fijado.

1983/1983 unit; 127/127 E2E. Lint limpio. SW v289 → v290.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/020-fondo-marcador-de-liquidez.md` | ADR nuevo con la decisión y las alternativas rechazadas. |
| `modules/dominio/ahorro/view.js` | Hint del modelo en card y form de aporte. |
| `service-worker.js` | v289 → v290. |

---

### feat(ahorro): AH.2, aporte recomendado del fondo explicado con datos reales · 2026-07-04

Cierra AH.2. El compromiso mensual del fondo de emergencia deja de ser una pregunta sin guía: el modal muestra un **aporte sugerido construido con los datos reales del usuario** y la explicación de dónde sale, con botón "Usar este monto".

- Nueva `calcularAporteSugerido` (pura, en `ahorro/logic.js`), **alineada con el motor de distribución de Mis cuentas** (ADR 013, MC.6a/MC.10/MC.11) para no tener dos recomendaciones contradictorias: mismo horizonte de 12 meses para cerrar el fondo, mismos pisos (estilo de vida 10%, ahorro 5%), mismo reparto proporcional con margen corto y misma honestidad en déficit (si fijos + cuotas superan el ingreso: $0 y la verdad, sin inventar porcentajes).
- Señales que usa: ingresos mensuales proyectados, gastos fijos, cuotas de deuda activas y el aporte que ya piden las metas/apartados con fecha (réplica local del cálculo de tesorería, regla ADN #10). Cinco bases posibles: `meta` (alcanza el ritmo de 12 meses), `capacidad` (sugiere lo que el margen permite y estima el plazo real; con más de 36 meses no promete fechas), `piso` (margen corto: proporcional 5/15), `deficit` y `completo`.
- **Si falta el ingreso** (nada registrado), la sugerencia usa solo el faltante/12 y el form pide "¿Cuánto recibes al mes, aproximadamente?": la caja se recalcula en vivo mientras el usuario escribe, sin persistir el dato.
- La sección de hábito, cuando no hay compromiso definido, acompaña la pregunta con "Según tus números, $X es un buen punto de partida".

1974/1974 → 1983/1983 unit (9 tests nuevos); 127/127 E2E. Lint limpio. SW v288 → v289.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/logic.js` | `calcularAporteSugerido` + constantes alineadas con ADR 013. |
| `modules/dominio/ahorro/view.js` | Caja de sugerencia reutilizable; form con input de ingreso opcional; hint en hábito. |
| `modules/dominio/ahorro/index.js` | Contexto (cuotas de deuda, objetivos con fecha); recálculo en vivo; acción `ahorro-usar-sugerido`. |
| `tests/unit/ahorro.test.js` | 9 tests nuevos. |
| `service-worker.js` | v288 → v289. |

---

### feat(personales): PE.1, tasa de interés opcional y reparto capital/interés · 2026-07-04

Cierra PE.1. El préstamo dado (Me deben) acepta una **tasa de interés mensual opcional**, el modelo del préstamo informal en Colombia ("te presto al 2% mensual"): interés simple sobre el capital pendiente, prorrateado por días (mes comercial de 30), sin capitalización. Sin tasa, nada cambia (retrocompatible en lógica, vista y tests).

- **Con tasa, cada pago cubre primero el interés acumulado** y el resto baja el capital (orden estándar de imputación). `aplicarPago` mantiene los acumuladores `capitalPagado`, `interesPagado` e `interesPendiente` (snapshot del devengo al último abono, que es el ancla del devengo siguiente: no se cuenta doble).
- La card muestra el desglose ("Pendiente: $X (capital $C + interés $I)"), la tasa y el interés ya cobrado; la barra de progreso mide **recuperación de capital** (no se infla con intereses). El modal de pago muestra capital e interés acumulado y explica el orden de imputación; el anuncio del abono dice cuánto fue a capital y cuánto a interés.
- El resumen agregado incluye el interés devengado en "Pendiente" y el interés recibido en "Te han devuelto"; `pctCobrado` sigue midiendo capital.
- **Schema v20 → v21** (migración idempotente): préstamos existentes quedan con `tasa: null` y acumuladores derivados de `pagado` (todo lo cobrado fue capital). Nueva fórmula reusable `calcularInteresSimple` en `infra/financiero.js`.

1934/1934 → 1974/1974 unit (40 tests nuevos); 127/127 E2E. Lint limpio. SW v287 → v288.

| Archivo | Cambio |
|---|---|
| `modules/infra/financiero.js` | Nueva `calcularInteresSimple(capital, tasaMensualPct, dias)`. |
| `modules/dominio/personales/logic.js` | `tieneInteres`, `calcularCapitalPendiente`, `calcularInteresPendiente`, `desglosarPago`; `calcularPendiente`/`aplicarPago`/`porcentajePagado`/`calcularResumen`/validación/normalización con tasa. |
| `modules/dominio/personales/view.js` | Campo de tasa en el form; desglose en card y modal de pago. |
| `modules/dominio/personales/index.js` | Persiste acumuladores; anuncio con reparto capital/interés. |
| `modules/core/storage.js` | Migración v20 → v21. |
| `tests/unit/personales.test.js`, `tests/unit/storage.test.js`, `tests/unit/calculadoras.test.js` | 40 tests nuevos (lógica de interés, migración, fórmula). |
| `service-worker.js` | v287 → v288. |

---

### feat(tesoreria): MC.10 y MC.11, piso de ahorro y detección de déficit real · 2026-07-03

Cierra MC.10 y MC.11 juntas, como sugería el tablero ([ADR 013 revisado](DECISIONS/013-distribucion-automatica-inteligente.md), decisiones A y B). Ambas ajustan el reparto del modo Automático cuando las Necesidades son altas:

- **MC.10 (piso de ahorro):** nueva constante `_PISO_AHORRO_PCT = 5`. Cuando el residuo del ingreso no alcanza para el piso de Estilo de vida (10%) más el de ahorro, se reparte **proporcional a los pisos** (el ahorro recibe 1/3 del margen) en vez de irse entero a Estilo de vida. Antes, con obligaciones al 92%, el ahorro quedaba en $0 aunque hubiera fondo incompleto u objetivos con fecha. El ahorro solo queda en $0 sin margen real (obligaciones ≥ 100%) o con déficit real.
- **MC.11 (déficit real):** `construirContextoDistribucion` incorpora el slice `gastos` y deriva `gastosDelMes`. Si los gastos ya registrados este mes superan el ingreso (ej. un fijo que no está en Calendario y se registró suelto), el modo auto deja de mostrar una distribución "ideal" incoherente: ahorro a $0, razón honesta ("tus gastos ya van en el 113% de tu ingreso: estás gastando más de lo que entra") y alerta accionable (revisar en Análisis, recortar Estilo de vida, registrar en Calendario los fijos que falten). Los presets explícitos no se tocan.

El asignado por grupo de Límites de gasto mejora automáticamente (consume el mismo motor). 1927/1927 → 1934/1934 unit (7 tests nuevos); 127/127 E2E (una corrida con flaky de a11y-forms que pasó en retry; re-corrida limpia). Lint limpio. SW v286 → v287.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Piso de ahorro proporcional; `gastosDelMes` + rama de déficit real. |
| `tests/unit/tesoreria.test.js` | 7 tests nuevos (3 de MC.10, 3 de MC.11, 1 de contexto). |
| `docs/DECISIONS/013-...md` | Revisión con decisiones A y B. |
| `service-worker.js` | v286 → v287. |

---

### feat(compromisos): D.10 y D.13, categorías de relación para deuda personal y Fiado · 2026-07-03

Cierra D.10 y D.13 en un solo pase de diseño, como pedía el tablero ([ADR 015 revisado](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md), decisiones 5 y 6):

- **D.10:** nuevo catálogo `CATEGORIAS_DEUDA_PERSONAL` (Familiar 👪, Amigo 🤝, Vecino 🏘️, Natillera 💰, Prestamista particular 💼, Fiado 🏪, Otro 📦). El form de deuda personal pregunta "¿Con quién es la deuda?" en vez de ofrecer productos de entidad (Tarjeta, Vivienda...). Mismo campo `categoria` en el schema; validación y normalización aceptan solo el catálogo del tipo. **Sin migración:** las deudas personales viejas con valor de producto se conservan tal cual y se reclasifican al editar (no se borra un dato elegido por el usuario).
- **D.13:** "Fiado" entra como categoría de relación con **interfaz adaptada**: al elegirlo, el form oculta cuota, tasa y frecuencia (una tienda que fía no cobra interés ni pacta cuota; se abona libre) y el día de pago queda como recordatorio de la fecha acordada. Para habilitarlo, **la cuota mensual pasa a ser opcional en toda deuda personal** (los préstamos de familia sin cuota fija son la norma): si viene debe ser > 0, vacía se guarda `0`. El simulador de estrategia ya excluía cuota 0 (sin cuota no hay plan que simular); la lista muestra la frecuencia en su lugar y Agenda omite el monto cuando es 0.

El guardarraíl TX.4 incorpora el catálogo nuevo (único label compartido: 'Otro' → 📦, consistente). 1917/1917 → 1927/1927 unit (10 nuevos, 3 actualizados); 127/127 E2E. Lint limpio. SW v285 → v286.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_DEUDA_PERSONAL` + emojis. |
| `modules/dominio/compromisos/logic.js` | Validación/normalización por catálogo del tipo; cuota opcional en personal. |
| `modules/dominio/compromisos/views/formularios.js` | Catálogo y labels por tipo; cuota opcional; grupos con id para el toggle. |
| `modules/dominio/compromisos/index.js` | `_wireToggleFiado` (oculta cuota/tasa/frecuencia al elegir Fiado). |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/tesoreria/view.js` | Lookup de emoji unificado producto + relación. |
| `modules/dominio/agenda/view.js` | Deuda sin cuota no muestra "$0". |
| `modules/core/state.js`, `docs/DECISIONS/015-...md` | JSDoc del schema; revisión del ADR. |
| `tests/unit/compromisos.test.js`, `tests/unit/constants.test.js` | 10 tests nuevos; TX.4 con el catálogo nuevo. |
| `service-worker.js` | v285 → v286. |

---

### feat(presupuesto): MC.8d, pulido de Límites con iconos por categoría · 2026-07-03

Cierra MC.8d. Los envelopes y la lista de categorías huérfanas de Límites de gasto muestran el emoji de su categoría (`CATEGORIA_EMOJI`, fallback 📦), igual que ya lo hacía el panel de alertas del dashboard. Los otros frentes de la tarjeta (copy final por grupo, estados vacíos, a11y) ya habían quedado cubiertos por EP.7b (banner y copy de Límites), MC.8b (fusión de topes en la card) y A11Y.1-5: sin más cambios.

1917/1917 unit verdes; 127/127 E2E. Lint limpio. SW v284 → v285.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Emoji de categoría en envelopes y huérfanas. |
| `service-worker.js` | v284 → v285. |

---

### test(rwd): RWD.1, verificación de reflow real a 320px en E2E · 2026-07-03

Cierra RWD.1 (estaba bloqueada por el preview del entorno; se resolvió por la vía E2E que la propia tarjeta sugería). Nueva suite [tests/e2e/reflow-320.test.js](../tests/e2e/reflow-320.test.js) (4 tests, viewport 320×568, el punto de verificación de reflow de WCAG 1.4.10, que cubre el zoom 200%/400% en pantallas comunes):

- Las 13 secciones, con **datos reales sembrados** (cuentas, gastos, deudas con nombre largo, fijo, meta, préstamo personal, límite, fondo con aportes), no generan scroll horizontal.
- La barra inferior (la sidebar vuelta bottom bar en móvil) queda completa dentro del viewport.
- El modal de gasto rápido (`.input--big-amount`, el caso de riesgo señalado) y el asistente "Distribuir mi ingreso" caben completos.

Resultado: cero solapes ni overflow, ningún fix de CSS requerido. 123/123 → 127/127 E2E; unit sin cambios; solo tests, sin bump de SW. Nota menor de la tarjeta (labels del nav a 10px bajo 360px) sigue vigente y aceptable.

| Archivo | Cambio |
|---|---|
| `tests/e2e/reflow-320.test.js` | Suite nueva (4 tests de reflow). |

---

### feat(presupuesto): MC.8c, layout de dos columnas + fila completa en Límites · 2026-07-03

Cierra MC.8c (ver [ADR 019](DECISIONS/019-limites-por-rol.md)). En desktop, el grid de "Tu plan del mes por grupo" pasa de 3 columnas iguales a: **Necesidades y Ahorro en 2 columnas compactas** (fila de arriba) y **Estilo de vida en fila completa** (es la card alta: contiene la olla finita, los envelopes y las huérfanas, y en 1/3 del ancho quedaba apretada). El DOM sigue el orden visual (Necesidades → Ahorro → Estilo de vida), que coincide con el orden del asistente "Distribuir mi ingreso". En móvil no cambia nada: `responsive.css` ya apila a 1 columna.

1917/1917 unit verdes; 123/123 E2E (los tests usan selectores `data-grupo`, independientes del orden). Lint limpio. SW v283 → v284.

| Archivo | Cambio |
|---|---|
| `modules/dominio/presupuesto/view.js` | Orden de cards Necesidades → Ahorro → Estilo de vida. |
| `styles/components/analysis.css` | Grid a 2 columnas; Estilo de vida `grid-column: 1 / -1`. |
| `service-worker.js` | v283 → v284. |

---

### feat(compromisos): D.12, aviso de tasa desconocida por deuda en la lista · 2026-07-03

Cierra D.12. El aviso de tasa desconocida era un banner único al tope de la card de estrategia que listaba los nombres, pero al leer la lista de deudas no se identificaba a cuál correspondía. Ahora cada deuda con entidad sin tasa registrada muestra su propio aviso en la card ([lista.js](../modules/dominio/compromisos/views/lista.js)): "⚠️ Tasa por confirmar: la calculamos como 0% y eso subestima los intereses. Confírmala con tu banco." (`.text-warning`, `role="note"`). El contexto de la card ya no repite "tasa por confirmar" (el aviso lo reemplaza). El banner global y su CSS (`.estrategia-card__nota`) se retiran.

1917/1917 unit verdes; 123/123 E2E. Lint limpio. SW v282 → v283.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/views/lista.js` | Aviso por deuda; contexto sin duplicar la tasa. |
| `modules/dominio/compromisos/views/estrategia.js` | Banner global retirado. |
| `styles/components/charts.css` | `.estrategia-card__nota` retirada (muerta). |
| `service-worker.js` | v282 → v283. |

---

### feat(compromisos): D.11, la recomendación nombra cuándo la deuda a atacar es la única con interés · 2026-07-03

Cierra D.11 (revisó [ADR 011](DECISIONS/011-unificacion-simulador-deudas.md)). En `recomendarEstrategia` ([compromisos/logic.js](../modules/dominio/compromisos/logic.js)), cuando ambas estrategias completan el plan y **una sola deuda cobra intereses**:

- Si gana Avalancha, la razón la nombra: «"Tarjeta" es la única de tus deudas que cobra intereses. Pagarla primero no solo reduce ese costo: lo elimina...» (antes solo el copy genérico de tasa más alta).
- Si esa deuda es además la más chica (Avalancha y Bola de nieve empatan y se recomienda Bola de nieve), la razón suma el hecho: cerrar la primera también deja el plan sin intereses (antes solo "pesa la motivación").
- Con varias deudas con interés, el copy genérico no cambia.

1914/1914 → 1917/1917 unit verdes (3 tests nuevos); 123/123 E2E (suite `estrategia-pago` sin regresiones). Lint limpio. SW v281 → v282.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Razones específicas cuando hay una única deuda con tasa > 0. |
| `tests/unit/compromisos.test.js` | 3 tests nuevos de D.11. |
| `service-worker.js` | v281 → v282. |

---

### fix(ahorro): AH.1, el hint del objetivo del fondo explica de dónde sale el número · 2026-07-03

Cierra AH.1. En el formulario de activar/editar fondo ([ahorro/view.js](../modules/dominio/ahorro/view.js), `renderFormFondo`), el preview "Con esa meta tu objetivo sería $480.000 (3 meses × $160.000 de gastos fijos al mes)" no explicaba de dónde salía el $160.000. Ahora dice que es "lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...)", que es exactamente cómo lo calcula `_gastosFijosMensuales()` (compromisos fijos activos proyectados a valor mensual).

1914/1914 unit verdes; 123/123 E2E. Lint limpio. SW v280 → v281.

| Archivo | Cambio |
|---|---|
| `modules/dominio/ahorro/view.js` | Copy del preview del objetivo. |
| `service-worker.js` | v280 → v281. |

---

### feat(logros): LG.1a, toast de logros más legible · 2026-07-03

Cierra LG.1a. Tres mejoras al toast de logro desbloqueado en [logros/index.js](../modules/dominio/logros/index.js):

- **Duración:** `DURACION_MS` sube de 2.5s a 5s (2.5s no alcanzaba para leer el nombre del logro).
- **Pausa al pasar el cursor:** `mouseenter` congela el tiempo restante y `mouseleave` lo retoma (mínimo 1s para que no muera apenas salga el cursor).
- **Cierre manual:** botón ✕ con `aria-label`, también accesible por teclado (focusable, `:focus-visible` visible).

Para poder interactuar, el toast pasa de `pointer-events: none` a `auto`. Los toasts encadenados por timer fijo (1.4s) se reemplazan por una cola de uno a la vez: con la pausa por hover la vida de un toast ya no es predecible, y dos toasts fijos en el mismo punto se solaparían (guard anti doble avance de cola entre `animationend` y su fallback).

1914/1914 unit verdes; 123/123 E2E sin regresiones (el toast interactivo no intercepta ningún flujo). Lint limpio. SW v279 → v280.

| Archivo | Cambio |
|---|---|
| `modules/dominio/logros/index.js` | Duración 5s, pausa por hover, botón de cierre, cola de toasts. |
| `styles/components/nudges.css` | `pointer-events: auto`; estilos de `.logro-toast__cerrar`. |
| `service-worker.js` | v279 → v280. |

---

### feat(personales): PE.2 a PE.5, estados de seguimiento humanizados en Me deben · 2026-07-03

Cierra PE.2, PE.3, PE.4 y PE.5 en un solo pase (los cuatro reescriben el mismo chip de estado de `_renderPersonalItem` o líneas vecinas).

- **PE.2:** nuevo helper puro `tiempoRelativo(dias)` en [infra/utils.js](../modules/infra/utils.js): 0 → "hoy", 1 → "ayer", luego días/semanas/meses/años con singular correcto ("hace 1 mes", "hace 5 años"). Reusable por cualquier dominio.
- **PE.3:** nueva lógica de estado por `fechaLimite` en [personales/logic.js](../modules/dominio/personales/logic.js): `estadoPrestamo()` devuelve `proximo` (fecha pactada futura), `hoy`, `vencido`, `abonado` o `pendiente`; `labelEstado()` produce el copy de seguimiento: "Próximo pago en 5 días", "Pago programado para hoy", "La fecha de pago pasó hace 2 meses", en vez de "N días, ya toca cobrar".
- **PE.4:** tras un abono el chip ya no dice "0 días": muestra "Recibiste un abono hoy" o "Último abono hace 15 días" (reusa el humanizador de PE.2). El reparto capital/interés quedará para PE.1.
- **PE.5:** el valor "Te han devuelto" del resumen usa `.text-success` (verde, coherente con los patrones de color financieros).

El tono del chip (default/warning/danger) sigue saliendo del reloj de incomodidad (`clasificarAntiguedad` sobre `calcularDias`, que un abono reinicia); un préstamo vencido se muestra en warning si el reloj es reciente y solo pasa a danger cuando es viejo.

1892/1892 → 1914/1914 unit verdes (7 tests de `tiempoRelativo`, 15 de `estadoPrestamo`/`labelEstado`); 123/123 E2E sin regresiones. Lint limpio. SW v278 → v279.

| Archivo | Cambio |
|---|---|
| `modules/infra/utils.js` | Nuevo `tiempoRelativo(dias)`. |
| `modules/dominio/personales/logic.js` | Nuevos `estadoPrestamo` y `labelEstado`. |
| `modules/dominio/personales/view.js` | Chip por estado; "Te han devuelto" en verde. |
| `tests/unit/utils.test.js`, `tests/unit/personales.test.js` | 29 tests nuevos. |
| `service-worker.js` | v278 → v279. |

---

### style(a11y): COL.1 y COL.2, contraste de warning en claro y texto deshabilitado · 2026-07-03

Cierra COL.1 y COL.2 en un solo pase (mismo tipo de ajuste, mismos archivos de tokens).

- **COL.1:** en modo claro `--fk-warning` (y `--fk-warning-text`) pasa de `#a06800` a `#8a5a00`: el contraste sobre `--fk-bg-base` sube de 4.38:1 a 5.5:1 (AA para texto normal, antes solo cumplía para texto grande). `--fk-warning-bg` se retinta al mismo tono. El modo oscuro (10.8:1) no se toca.
- **COL.2:** `--fk-text-disabled` sube un punto de contraste en ambos temas: oscuro `#424858` → `#565d72` (2.05:1 → 2.9:1), claro `#b0b4c8` → `#8f94ac` (1.92:1 → 2.8:1). El texto deshabilitado está exento de WCAG, pero con baja visión era ilegible; sigue viéndose claramente inactivo frente a `--fk-text-muted`.

1892/1892 unit verdes; 123/123 E2E (incluye el pase axe con `color-contrast` en Chromium real, que valida COL.1 directamente). Lint limpio. SW v277 → v278.

| Archivo | Cambio |
|---|---|
| `styles/themes.css` | Warning claro oscurecido; disabled claro oscurecido. |
| `styles/tokens.css` | Disabled oscuro aclarado. |
| `service-worker.js` | v277 → v278. |

---

### test(a11y): A11Y.5, pase axe sobre formularios dinámicos en E2E · 2026-07-03

Cierra A11Y.5. `tests/unit/a11y.test.js` solo auditaba el HTML estático de `index.html`; los formularios se inyectan por JS al abrir cada modal y quedaban sin auditar. Nueva suite [tests/e2e/a11y-forms.test.js](../tests/e2e/a11y-forms.test.js): abre en Chromium real los 5 modales representativos (Nuevo gasto, Nueva deuda, Nuevo gasto fijo, Nuevo apartado, Nueva cuenta) y el asistente "Distribuir mi ingreso" (con fondo activo para que haya contenido), inyecta axe-core (la misma devDependency del unit test, cero dependencias nuevas, en línea con `docs/SECURITY.md`) y corre WCAG 2.1 A/AA scoped al contenedor abierto, exigiendo cero violaciones critical/serious. En navegador real `color-contrast` sí es computable, así que no se excluye (a diferencia del unit test en happy-dom).

Resultado: los 6 formularios dinámicos pasan sin violaciones graves (ningún fix requerido). 117/117 → 123/123 E2E; 1892/1892 unit sin cambios; lint limpio. Solo tests: sin cambios en assets de producción, sin bump de SW.

| Archivo | Cambio |
|---|---|
| `tests/e2e/a11y-forms.test.js` | Suite nueva (6 tests axe sobre modales y asistente). |

---

### feat(gastos): TX.6 y TX.7, el gasto hereda el ícono de su compromiso de origen · 2026-07-03

Cierra TX.6 y TX.7 en un solo pase (mismo hook, como sugería el tablero). Un gasto con `compromisoId` nació de un fijo de Calendario (checklist de Necesidades o "marcar pagado") o de un abono a deuda; hasta ahora mostraba el ícono genérico de su categoría: todos los abonos a deuda se veían iguales (💳 de 'Deudas') y los pagos de fijos con el 📦 de 'Otros'.

Nuevo helper puro `emojiPorOrigen(gasto, compromisos)` en [gastos/logic.js](../modules/dominio/gastos/logic.js): fijo → emoji de su categoría de Agenda (`CATEGORIA_AGENDA_EMOJI`, ej. Arriendo 🏠); deuda con entidad → 🏦; deuda personal → 🤝; `null` si no hay origen resoluble (sin `compromisoId`, compromiso eliminado, fijo sin categoría), en cuyo caso `_renderGastoItem` cae al lookup por categoría de siempre. Sin violar la regla de dominios: la vista lee `S.compromisos` (permitido) y el helper es puro (recibe la lista como parámetro).

Verificado con 7 unit tests nuevos del helper (fijo hereda, 🏦 vs 🤝, y los 4 caminos de fallback). 1885/1885 → 1892/1892 unit; 117/117 E2E sin regresiones. Lint limpio. Contenido servido verificado vía `curl`. SW v276 → v277.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/logic.js` | Nuevo `emojiPorOrigen` (importa `CATEGORIA_AGENDA_EMOJI`). |
| `modules/dominio/gastos/view.js` | `_renderGastoItem` resuelve el ícono por origen antes del lookup por categoría. |
| `tests/unit/gastos.test.js` | Suite `emojiPorOrigen` (7 tests). |
| `service-worker.js` | v276 → v277. |

---

### feat(ui): EP.7d, divulgación progresiva en Mis cuentas, Análisis y Me deben. Épica EP.7 completa · 2026-07-03

Cierra EP.7d, el último slice de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md), y con él la épica EP.7 completa (EP.7a a EP.7d):

- **Mis cuentas:** el título del empty state ("¿Dónde tienes tu dinero?", una pregunta gancho que duplicaba la del banner) se recorta a "Agrega tu primera cuenta"; `tieneDatos` = alguna cuenta o algún ingreso ya registrado.
- **Análisis:** el `section__subtitle` "Cómo está tu salud financiera..." se quita de `index.html`; los empties por sub-card (Gastos por categoría, Tendencia de gastos) se revisaron contra el criterio de "no repetir el banner" y ya eran cortos y específicos de su propio dato, se dejan igual; `tieneDatos = S.gastos.length > 0`.
- **Me deben:** empty state recortado; `tieneDatos = S.personales.length > 0`. El fix de copy "Personales" → "Me deben" en el banner ya se había hecho en EP.7a.

Se actualizaron 3 aserciones E2E que verificaban el título viejo del empty state de Mis cuentas.

1885/1885 unit verdes; 117/117 E2E (3 actualizadas, sin regresiones). Lint limpio. Verificado sirviendo el contenido real vía `curl` (mismo síntoma de caché stale del preview ya documentado). SW v275 → v276.

**Con EP.7d cerrado, la épica EP.7 (divulgación progresiva) queda completa en las 11 secciones**: cada una tiene una única descripción de propósito (el banner) que se oculta automáticamente en cuanto la sección tiene datos, sin colapso manual ni preferencia persistida.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js`, `modules/dominio/tesoreria/index.js` | Empty state recortado; nuevo helper `_tieneDatosTesoreria()`. |
| `index.html`, `modules/dominio/analisis/index.js` | Subtítulo de Análisis fuera; `tieneDatos` real. |
| `modules/dominio/personales/view.js`, `modules/dominio/personales/index.js` | Empty state recortado; `tieneDatos` real. |
| `tests/e2e/navegacion-render.test.js` | 3 aserciones actualizadas al nuevo título del empty state de Mis cuentas. |
| `service-worker.js` | v275 → v276. |
| `docs/BOARD.md` | Tarjeta EP.7 borrada (épica cerrada). |

---

### feat(ui): EP.7c, divulgación progresiva en Metas, Ahorro e Inversión · 2026-07-03

Aplica el patrón de EP.7a/EP.7b a los 3 dominios de "Crecer" del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Metas:** el `section__subtitle` "Objetivos aspiracionales: viaje, laptop, boda..." se quita de `index.html`; el empty state se recorta pero conserva en una línea la regla de contexto hacia Apartados (gastos previsibles vs objetivos libres); `tieneDatos = S.metas.length > 0`.
- **Ahorro:** el `section__subtitle` "Tu colchón para imprevistos..." se quita; el empty state se recorta (ya no repite "un imprevisto se cubre con deuda" del banner); `tieneDatos` = fondo de emergencia activo o algún aporte ya registrado.
- **Inversión:** sin subtítulo que barrer; empty state recortado; `tieneDatos = S.inversiones.length > 0`.

Verificación: mismo síntoma de caché HTTP stale del preview ya documentado; se confirmó el contenido real servido vía `curl` y la conducta vía la suite E2E real. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E sin regresiones. Lint limpio. SW v274 → v275.

| Archivo | Cambio |
|---|---|
| `index.html` | Subtítulos de Metas y Ahorro fuera. |
| `modules/dominio/metas/view.js`, `modules/dominio/metas/index.js` | Empty state recortado; `tieneDatos` real. |
| `modules/dominio/ahorro/view.js`, `modules/dominio/ahorro/index.js` | Empty state recortado; nuevo helper `_tieneDatosAhorro()`. |
| `modules/dominio/inversiones/view.js`, `modules/dominio/inversiones/index.js` | Empty state recortado; `tieneDatos` real. |
| `service-worker.js` | v274 → v275. |

---

### feat(ui): EP.7b, divulgación progresiva en Gastos, Deudas, Calendario y Límites · 2026-07-03

Aplica el patrón de EP.7a (mecanismo `tieneDatos` ya listo) a los 4 dominios siguientes del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md):

- **Gastos:** empty state recortado de un párrafo a una línea ("Anota tu primera compra o pago."); `tieneDatos = S.gastos.length > 0` (histórico completo, no solo el mes en curso).
- **Deudas:** empty state recortado; `tieneDatos` reusa el helper existente `esDeuda(tipo)` de `compromisos/logic.js` sobre `S.compromisos`.
- **Calendario:** sin subtítulo ni empty state que barrer, solo el wiring de `tieneDatos = S.compromisos.length > 0` (mismos compromisos que Deudas: un fijo o una deuda ya generan eventos del mes).
- **Límites de gasto:** el `section__subtitle` "Sigue tu plan del mes por grupo..." se quita de `index.html`; la nota al pie del resumen ("Mis cuentas planifica...; Límites de gasto vigila...") se retira por repetir el banner casi literal; el copy del banner se reescribe a la estructura de tres tiempos del ADR conservando la relación con Mis cuentas; `tieneDatos` = ingresos registrados (`S.ingresos`) o algún tope por categoría (`S.presupuestos`).

El E2E "MC.5e: la nota de la sección menciona la complementariedad con Mis cuentas" se actualiza: ahora verifica que la nota ya no existe (el mensaje lo cubre el banner, visible solo antes de tener datos).

Verificación: se intentó verificar en el preview, pero el navegador arrastró una caché HTTP obstinada del entorno (síntoma ya documentado en memoria del proyecto: `python -m http.server` no envía `Cache-Control`, así que Chrome sirve módulos stale incluso tras recargar); se confirmó el contenido real servido vía `curl` directo y la verificación conductual se apoyó en la suite E2E real (Playwright/Chromium), que sí corre en un contexto limpio. 1885/1885 unit verdes (sin cambios de lógica pura); 117/117 E2E (1 test actualizado, sin regresiones). Lint limpio. SW v273 → v274.

| Archivo | Cambio |
|---|---|
| `modules/dominio/gastos/view.js`, `modules/dominio/gastos/index.js` | Empty state recortado; `tieneDatos` real en los 3 puntos de render. |
| `modules/dominio/compromisos/views/lista.js`, `modules/dominio/compromisos/index.js` | Empty state recortado; `tieneDatos` vía `esDeuda`. |
| `modules/dominio/agenda/index.js` | `tieneDatos` real en los 3 puntos de render. |
| `index.html`, `modules/dominio/presupuesto/view.js`, `modules/dominio/presupuesto/index.js`, `modules/ui/proposito.js` | Subtítulo y nota fuera; copy del banner reescrito; `tieneDatos` real. |
| `tests/e2e/smoke.test.js` | Test "MC.5e" actualizado a la ausencia de la nota. |
| `service-worker.js` | v273 → v274. |

---

### feat(ui): EP.7a, banner de propósito con divulgación progresiva · 2026-07-03

Cierra EP.7a, el slice piloto de la revisión del [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md). El banner de propósito pasa a ser la **descripción única** de cada sección y **solo se muestra mientras la sección no tiene datos**: `htmlBannerProposito(seccion, tieneDatos)` y `renderBannerProposito(seccion, tieneDatos)` reciben ahora si la sección tiene datos, en vez de leer `S.config.propositoColapsado`. Se retira el mecanismo de colapso manual completo: la clave `S.config.propositoColapsado` deja de leerse (queda huérfana e inofensiva en `localStorage` de usuarios existentes, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` se eliminan de `actions.js`, y el bloque "Mensajes de ayuda" de Ajustes (`config/view.js` `_renderPropositos`, `config/index.js` acción `reactivar-propositos`) se retira por completo.

Piloto completo en Apartados: el `section__subtitle` "Reservas para gastos previsibles..." se quita de `index.html` (duplicaba el banner), el empty state se recorta de un párrafo largo a "Crea tu primer apartado para empezar a separar dinero." (los tips accionables y la regla de contexto hacia Límites de gasto se conservan), y `apartados/index.js` pasa `S.apartados.length > 0` como `tieneDatos` en los tres puntos de render (inicial, `hashchange`, `state:change`). Verificado en el preview: el banner desaparece al crear el primer apartado sin recargar.

Fix de copy incidental (detectado al revisar el mapa completo): el banner de Me deben decía "Personales te ayuda..." en vez de "Me deben".

Los 10 dominios restantes siguen llamando `renderBannerProposito(seccion)` con un solo argumento: `tieneDatos` queda `undefined` (falsy), así que su banner se sigue mostrando siempre (sin colapso posible) hasta que su propio slice (EP.7b a EP.7d) les aplique el patrón completo.

Tests: se reescribió `tests/unit/proposito.test.js` completo (los tests de colapso/persistencia se reemplazan por tests de visibilidad por `tieneDatos`); 1887 → 1885 unit verdes (menos aserciones repartidas, misma cobertura). 117/117 E2E sin regresiones (ningún E2E tocaba el colapso). Lint limpio. SW v272 → v273.

| Archivo | Cambio |
|---|---|
| `modules/ui/proposito.js` | `htmlBannerProposito`/`renderBannerProposito` reciben `tieneDatos`; se retira todo el mecanismo de colapso (handlers, `initBannersProposito`, `reactivarPropositos`); fix de copy "Personales" → "Me deben". |
| `modules/ui/bootstrap.js` | Se retira el import y la llamada a `initBannersProposito()`. |
| `modules/dominio/config/view.js` | Se retira `_renderPropositos()` y su slot en `renderPanelConfig`. |
| `modules/dominio/config/index.js` | Se retira el import de `reactivarPropositos` y la acción `reactivar-propositos`. |
| `index.html` | Subtítulo de Apartados eliminado. |
| `modules/dominio/apartados/view.js` | Empty state recortado. |
| `modules/dominio/apartados/index.js` | Los 3 renders del banner pasan `S.apartados.length > 0`. |
| `tests/unit/proposito.test.js` | Reescrito para el nuevo contrato. |
| `service-worker.js` | v272 → v273. |

---

### docs(adr): ADR 016 revisado, divulgación progresiva (EP.7, fase de diseño) · 2026-07-03

Cierra la fase de diseño de EP.7 (dirección fijada por el usuario el 2026-07-02, reconfirmada con su observación en Metas: "la descripción solo debe aparecer al inicio"). El [ADR 016](DECISIONS/016-banner-proposito-de-seccion.md) pasa de "banner siempre visible y colapsable" a **divulgación progresiva**:

- **D1:** el banner de propósito es la descripción única de cada sección; los `section__subtitle` descriptivos (Límites, Ahorro, Metas, Apartados, Análisis) y las notas al pie que repiten propósito se eliminan.
- **D2:** la visibilidad se deriva de los datos: el banner solo aparece mientras la sección no tiene datos. Se van el colapso manual, `S.config.propositoColapsado` (clave huérfana inofensiva, sin migración), las data-actions `colapsar-proposito`/`expandir-proposito` y el bloque "Mensajes de ayuda" de Ajustes.
- **D3:** el empty state deja de describir y pasa a accionar (título + una línea + CTA); los tips accionables y las reglas de contexto de ADR 014 quedan.
- **D4:** guards de formulario y notas contextuales de datos no se tocan.
- **D5:** contrato: `htmlBannerProposito` devuelve `''` cuando la sección tiene datos; cada dominio pasa el mismo predicado de su empty state.

La revisión incluye la tabla del criterio "tiene datos" para las 11 secciones, el inventario texto por texto (archivo y línea aproximada: qué queda, qué se recorta, qué se va, incluido el fix de copy "Personales" → "Me deben" en el banner) y los 4 slices de implementación: EP.7a (piloto: mecanismo + Apartados + Ajustes), EP.7b (Gastos, Deudas, Calendario, Límites), EP.7c (Metas, Ahorro, Inversión), EP.7d (Mis cuentas, Análisis, Me deben).

Solo docs: sin cambios de código. 1887/1887 unit verdes (sin cambios). Podría afectar (cuando se implemente): visibilidad del banner en las 11 secciones, empty states, Ajustes. Validación pendiente: ninguna para esta fase; cada slice se verifica en la app al implementarse.

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/016-banner-proposito-de-seccion.md` | Estado actualizado; notas "Revisada el 2026-07-03" en decisiones 1, 2, 6 y 7; sección "Revisión 2026-07-03" (por qué, D1 a D5, criterio por sección, inventario transversal y por sección, consecuencias, slices EP.7a a EP.7d). |
| `docs/BOARD.md` | Tarjeta EP.7 actualizada: diseño cerrado, quedan los slices. |
| `docs/HANDOFF.md` | Entrada nueva en "Qué se hizo recientemente". |

---

### chore(tesoreria): MC.12, renombrar "Ingreso" a "Ingresos fijos" · 2026-07-03

Cierra MC.12 (tarea de copy solamente). La sección de ingresos en Mis cuentas se llamaba "Ingreso" (singular, demasiado general); ahora se llama "Ingresos fijos" para dejar claro que registra recurrentes (salario, honorarios periódicos, pensión). Solo cambio en copy visible y `aria-label`; IDs internas del DOM quedan estables.

Puntos tocados: titulo ("Mis ingresos" → "Mis ingresos fijos"), botón ("+ Ingreso" → "+ Ingreso fijo"), modal ("Nuevo ingreso" → "Nuevo ingreso fijo"), diálogo de edición ("Editar ingreso" → "Editar ingreso fijo"), diálogo de eliminación ("Eliminar ingreso" → "Eliminar ingreso fijo"), y mensajes de confirmación (guardado/actualizado/eliminado). Verificado en el preview. 1887/1887 unit verdes.

| Archivo | Cambio |
|---|---|
| `index.html` | Título h2, botón, modal title. |
| `modules/dominio/tesoreria/index.js` | Mensajes + diálogos. |

---

### fix(tesoreria): MC.7f, pulido del asistente (copy, foco, transición, estados vacíos) · 2026-07-03

Cierra MC.7f (opcional), el último punto de la épica MC.7. Ninguna lógica financiera nueva: ajustes de copy, accesibilidad y una transición sutil sobre el shell paginado que ya entregaron MC.7d y MC.7e.

- **Copy por paso.** El Paso 2 ganó un título consistente con el resto ("💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:"), igual que el Paso 1 ya tenía el suyo.
- **Estado vacío corregido.** El hint "Sugerencia: $X a ahorro..." aparecía aunque no hubiera ninguna fila de Ahorro (sin fondo activo, sin metas, sin apartados) donde poner esa sugerencia, un texto confuso sin destino. Ahora solo se muestra cuando existe al menos una fila de Ahorro.
- **Indicador de paso más limpio.** "Paso X de N" solo aporta con 2 o más pasos; con un asistente de un único paso (posible con MC.7e: 2+ cuentas pero nada más que repartir) el indicador ya no aparece.
- **Foco al avanzar (a11y, WAI-ARIA APG para asistentes multi-paso).** Cada contenedor de paso ganó `tabindex="-1"`; al hacer clic en "Siguiente"/"Atrás", el foco se mueve al contenedor del paso recién mostrado. Su `aria-label` ("Paso X de N: <título>") queda anunciado por el simple hecho de recibir foco, sin depender de que el usuario esté cerca del indicador `role="status"`. Al abrir el panel por primera vez se preserva el comportamiento anterior (foco al monto a distribuir), no al contenedor del Paso 1.
- **Transición sutil.** Un fade-in corto (180ms) al mostrar un paso nuevo, con `@media (prefers-reduced-motion: no-preference)` (mismo patrón que el resto de la app); `a11y.css` ya colapsa duraciones globalmente bajo `reduce` como defensa adicional.

Verificado con 3 E2E nuevos en Chromium real (foco se mueve al paso al avanzar/retroceder y se preserva en la apertura inicial; indicador ausente con un solo paso; hint de ahorro ausente cuando no hay fila de Ahorro) y la suite completa de "Distribuir mi ingreso" (19 tests) sin regresiones. 1887/1887 unit sin cambios (nada de lo tocado tiene lógica pura nueva); 114/114 → 117/117 E2E. Lint limpio. SW v271 → v272.

**La épica MC.7 (asistente "Distribuir mi ingreso") queda completa: MC.7a a MC.7f entregados.**

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Título del Paso 2; hint de ahorro condicionado a `ahorro.length > 0`; indicador de paso omitido con un solo paso; `tabindex="-1"` en cada contenedor de paso. |
| `modules/dominio/tesoreria/index.js` | `_irAPasoDistribucion` gana `{ moverFoco }`; mueve el foco al contenedor del paso al avanzar/retroceder, salvo en la apertura inicial. |
| `styles/components/forms.css` | Transición `distribuir-paso-in` (fade + translateY corto, bajo `prefers-reduced-motion: no-preference`); `.distribuir__paso:focus { outline: none }` (el cambio de contenido ya es la señal visual). |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (foco al avanzar/retroceder, indicador ausente con un paso, hint de ahorro ausente sin fila de Ahorro). |
| `service-worker.js` | v271 → v272. |

---

### feat(tesoreria): MC.7e, Paso 3 reparte Estilo de vida entre cuentas · 2026-07-03

Cierra MC.7e (ADR 018 decisión 4), la última tarjeta de prioridad alta de la épica del asistente "Distribuir mi ingreso". Con **2 o más cuentas activas**, el paso final "Estilo de vida" gana una sección "¿Quieres mover parte a otras cuentas?": una fila editable por cuenta activa (mismo patrón toggle + monto del resto del panel), mostrando el saldo actual de cada una como contexto. Con **una sola cuenta activa** el paso sigue siendo puramente informativo, sin cambios (regla de cuenta única).

Diseño deliberadamente conservador para evitar un problema de orden: la cuenta de origen (desde dónde sale el ingreso y se pagan Necesidades/Ahorro/Deudas/Inversiones) solo se resuelve **al confirmar** (R2 del ADR, una sola pregunta al final), así que en el momento de renderizar el Paso 3 todavía no se sabe cuál cuenta es "el origen". En vez de asumir una por defecto (riesgo de mover dinero por error si el usuario elige otra cuenta en el picker final), las filas de transferencia arrancan **sin marcar y en $0**: el remanente completo sigue en la cuenta de origen salvo que el usuario opte explícitamente por mover algo a otra. Al confirmar, cualquier fila cuyo destino resulte ser la propia cuenta de origen es un no-op transparente (el dinero ya estaba ahí).

Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): una fila por cuenta activa, ordenadas de mayor a menor saldo. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerTransferenciasCuentas()` lee las filas marcadas (excluidas explícitamente de `_leerItemsDistribucion`, que ya no las cuenta como "asignado" del ingreso: son redistribuciones internas, no gasto nuevo); `_validarTransferenciasCuentas()` topa la suma contra el presupuesto de Estilo de vida ya recalculado sobre el remanente real (R3), con su propio resumen en vivo (`#distribuir-cuentas-resumen`) y su propio bloqueo de "Distribuir" si excede. `_confirmarDistribucion()` aplica las transferencias antes de fijar el saldo final de la cuenta de origen (descuenta lo transferido junto con lo demás que sale de ahí); `_SLICES_DISTRIBUCION` ya incluía `cuentas`, así que "Deshacer" revierte todo sin cambios adicionales. Al arreglar el guard de habilitación se corrigió un bug encontrado durante la verificación: "Distribuir" exigía `asignado > 0`, lo que bloqueaba una distribución que **solo** mueve dinero entre cuentas (nada marcado en Necesidades/Ahorro/Deudas/Inversiones); ahora también se habilita con `transferido > 0`. También se corrigió el guard de contenido del panel (`_renderPanelDistribuir`), que antes ocultaba el botón entero si Necesidades/Ahorro/Deudas/Inversiones estaban vacíos, sin considerar que 2+ cuentas ya son motivo suficiente para mostrar el asistente.

Sin schema nuevo (decisión 7 del ADR se mantiene): son ajustes de saldo entre cuentas ya existentes, igual que cualquier otro movimiento de tesorería.

Verificado con 4 tests unitarios nuevos de `construirFilasTransferenciaCuentas` y 5 E2E nuevos en Chromium real (una cuenta activa sin filas de transferencia; 2+ cuentas sin marcar nada por defecto; el resumen en vivo bloquea "Distribuir" si excede el presupuesto de Estilo de vida; confirmar mueve el saldo correctamente entre cuentas; Deshacer revierte la transferencia). Verificación visual adicional en el preview (móvil): las filas de cuenta, el resumen en vivo y el bloqueo del botón. 1883/1883 → 1887/1887 unit; 109/109 → 114/114 E2E. Lint limpio. SW v270 → v271.

Con esto, la épica del asistente "Distribuir mi ingreso" (MC.7) solo deja pendiente el pulido opcional MC.7f.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `construirFilasTransferenciaCuentas(cuentas)`. |
| `modules/dominio/tesoreria/view.js` | `_filaDistribuir` soporta tipo 'cuenta' (saldo actual, sin marcar por defecto); `_renderPanelDistribuir` agrega la sección de transferencias al paso final y corrige el guard de contenido vacío. |
| `modules/dominio/tesoreria/index.js` | `_leerTransferenciasCuentas`, `_validarTransferenciasCuentas`, `_aplicarTransferenciasCuentas`; `_leerItemsDistribucion` excluye tipo 'cuenta'; guards de habilitación de "Distribuir" ahora aceptan `transferido > 0` sin nada más asignado. |
| `tests/unit/tesoreria.test.js` | Suite `construirFilasTransferenciaCuentas` (4 tests). |
| `tests/e2e/smoke.test.js` | Suite nueva "reparto de Estilo de vida entre cuentas (MC.7e)" (5 tests). |
| `service-worker.js` | v270 → v271. |

---

### feat(tesoreria): MC.7d completo, asistente paginado + ahorro sobre el remanente real (R3) · 2026-07-03

Cierra la tarjeta MC.7d del tablero (las dos partes que quedaban tras el slice 1 del 2026-07-03). El panel "Distribuir mi ingreso" ahora es un **asistente paginado** de hasta 3 pasos (Necesidades → Ahorro, deudas e inversiones → Estilo de vida) con navegación Atrás/Siguiente inline, indicador "Paso X de N" (`role="status"`, anuncia el cambio a lectores de pantalla) y **confirmación única al final**: el botón "Distribuir" solo existe en el último paso. Solo se crean los pasos con contenido (sin Necesidades el asistente arranca en las asignaciones); el monto a distribuir, el indicador y el resumen en vivo quedan fuera de la paginación, visibles siempre. Al abrir, el asistente siempre arranca en el primer paso; si el botón con foco se oculta al navegar, el foco pasa al de navegación visible.

**R3 (ADR 018 revisión 2026-07-02):** el Paso 2 ya no sugiere el ahorro como % teórico del split total. Nuevo helper puro `presupuestosSobreRemanente(monto, necesidadesMarcadas, ahorroPct, estiloVidaPct)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): reparte el **remanente real** (monto menos Necesidades marcadas) entre Ahorro y Estilo de vida conservando la proporción del split, con un tope en la sugerencia teórica de cada grupo (marcar menos Necesidades no infla el ahorro: lo no marcado sigue comprometido y se paga después por los flujos de siempre). La fila del fondo de emergencia absorbe en vivo el excedente de ese presupuesto tras los aportes marcados a metas/apartados (nuevo campo `autoExcedente` en `construirDesgloseAhorroPorObjetivo`, `data-dist-auto` en la vista), hasta que el usuario la edite a mano (`data-editado`, se respeta su valor) o la excluya del plan. El hint de sugerencia y la fila informativa de Estilo de vida también se recalculan en vivo al cambiar marcas o monto.

Verificado con 8 tests unitarios nuevos de `presupuestosSobreRemanente` (anclaje al split cuando lo marcado iguala su % teórico; encogimiento proporcional con Necesidades altas; tope teórico al marcar menos; remanente 0; sin fuga por redondeo; splits con 0% en un grupo; entradas no numéricas) y 2 E2E nuevos en Chromium real (navegación completa del asistente con visibilidad de botones por paso; R3 en vivo: desmarcar una Necesidad de 2,7M sube la sugerencia del fondo de 120.000 a 600.000 y editarlo a mano lo saca del modo automático). Los 8 E2E existentes del panel se adaptaron al shell (helper `avanzarDistribuirHasta`). Verificación visual adicional en el preview (desktop y móvil): los 3 pasos, la navegación y los recálculos en vivo. 1875/1875 → 1883/1883 unit; 107/107 → 109/109 E2E. Lint limpio. SW v269 → v270.

Con MC.7d cerrada, **MC.7e (Paso 3: reparto de Estilo de vida entre cuentas) queda desbloqueada**.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `presupuestosSobreRemanente`; `construirDesgloseAhorroPorObjetivo` expone `autoExcedente` en la fila del fondo. |
| `modules/dominio/tesoreria/view.js` | `_renderPanelDistribuir` reescrito como shell paginado (pasos dinámicos, indicador, nav Atrás/Siguiente, Distribuir al final); presupuesto inicial sobre el remanente con el checklist por defecto; hint y fila de Estilo de vida con spans actualizables. |
| `modules/dominio/tesoreria/index.js` | Navegación del asistente (`_irAPasoDistribucion`, acciones `distribuir-paso-siguiente`/`atras`); `_actualizarSugerenciasRemanente` (R3) invocada desde `_recalcularDistribucion`; flag `data-editado` al editar una fila a mano. |
| `styles/components/forms.css` | Estilos del indicador de paso y la barra de navegación del asistente. |
| `tests/unit/tesoreria.test.js` | Suite nueva `presupuestosSobreRemanente` (8 tests); shapes del fondo con `autoExcedente`. |
| `tests/e2e/smoke.test.js` | Helper `avanzarDistribuirHasta`; suite nueva "asistente paginado (MC.7d)" (2 tests); 8 tests existentes adaptados al shell. |
| `service-worker.js` | v269 → v270. |

---

### fix(tesoreria): tope coordinado entre cuota del checklist y abono extra (BUG-009) · 2026-07-03

Cierra el último bug pendiente de la revisión exhaustiva de Mis cuentas, implementando el diseño decidido con el usuario el mismo día (entrada anterior). Una deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades del panel "Distribuir mi ingreso" (su cuota, marcada por defecto) y en "Abonar extra a deudas" (input libre); si el usuario marcaba ambos, la cuenta se debitaba `cuota + extra` mientras la deuda solo podía bajar hasta 0, sobrepagando.

El fix agrega un helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js): calcula `disponible = max(0, saldoTotal - cuotaMarcada)` y devuelve `min(extraSolicitado, disponible)`. En [tesoreria/index.js](../modules/dominio/tesoreria/index.js), `_leerItemsDistribucion()` gana un segundo parámetro (las Necesidades ya leídas por `_leerNecesidadesMarcadas`), suma la cuota marcada de la misma deuda por `id` y usa el helper en vez del `Math.min(monto, _saldoDeuda(id))` anterior, que topaba contra el saldo previo sin descontar lo que la cuota del checklist ya iba a pagar. `_recalcularDistribucion()` y `_confirmarDistribucion()` ahora leen las Necesidades primero y se las pasan a `_leerItemsDistribucion()`, de modo que el resumen en vivo y el `apply` comparten el mismo monto efectivo, la garantía que el docstring de esa función ya prometía mucho antes de que ambos flujos pudieran chocar en la misma deuda.

Verificado con 5 tests unitarios nuevos de `topeAbonoExtraDeuda` (sin cuota marcada replica el comportamiento previo; resta la cuota antes de topar el extra; permite el extra hasta lo que queda; nunca negativo si la cuota supera el saldo; valores no numéricos como 0) más 1 E2E en Chromium real que reproduce el escenario exacto del bug: deuda con saldo 300.000 y cuota 100.000 marcada por defecto, el usuario pide un extra de 300.000 (más de lo disponible); el resumen en vivo ya muestra "Asignado: $300.000" en vez de $400.000, y tras confirmar la deuda queda en 0 (nunca negativa), los dos gastos generados suman exactamente 300.000 y la cuenta se debita 300.000, no 400.000. 1870/1870 → 1875/1875 unit; 106/106 → 107/107 E2E. Lint limpio. SW v268 → v269.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | Nuevo helper puro `topeAbonoExtraDeuda(saldoTotal, cuotaMarcada, extraSolicitado)`. |
| `modules/dominio/tesoreria/index.js` | `_leerItemsDistribucion()` gana el parámetro `necesidades` y usa `topeAbonoExtraDeuda`; `_recalcularDistribucion()` y `_confirmarDistribucion()` le pasan las Necesidades ya leídas. |
| `tests/unit/tesoreria.test.js` | 5 tests nuevos de `topeAbonoExtraDeuda`. |
| `tests/e2e/smoke.test.js` | Suite nueva "cuota del checklist + abono extra a la misma deuda no sobrepaga (BUG-009)", 1 test. |
| `service-worker.js` | v268 → v269. |
| `docs/BUGS.md` | BUG-009 resuelto (eliminado). Sin errores pendientes por primera vez desde que se abrió el registro. |

---

### docs(bugs): diseño de BUG-009 decidido, cuota + extra con tope coordinado · 2026-07-03

Tarea de decisión de diseño, sin código. BUG-009 (una misma deuda puede sobrepagarse combinando su cuota del checklist de Necesidades y un abono extra en "Distribuir mi ingreso") quedó registrado el mismo día con la pregunta abierta: ¿se permite pagar cuota + extra a la misma deuda en un mismo movimiento?

**Decisión del usuario, con recomendación del análisis:** sí se permite, con tope coordinado. El extra efectivo pasa a ser `min(extra, saldoTotal - cuotaMarcada)`; si la cuota marcada ya cubre todo el saldo, el extra queda en 0 y se ignora. Pagar la cuota y abonar extra al capital en el mismo movimiento es un comportamiento financiero real y sano que Finko fomenta (el orden Avalancha de "Abonar extra a deudas" existe justo para eso), y el fix es la extensión natural del patrón de topes ya vigente: el docstring de `_leerItemsDistribucion` ya promete que "el resumen y el apply usan el mismo monto efectivo", solo que hoy el tope (`_saldoDeuda`) ignora la cuota marcada en el checklist. Alternativas descartadas: excluir la deuda de "Abonar extra" cuando su cuota está marcada (elimina un flujo legítimo y exige filas que aparecen/desaparecen en vivo) y bloquear la confirmación con un error (fricción, rechaza una intención válida).

El diseño completo con los puntos de implementación (en `modules/dominio/tesoreria/index.js`: `_leerItemsDistribucion` recibe las Necesidades marcadas para restar la cuota del tope; helper puro del tope en `logic.js` con unit tests; E2E del escenario exacto del bug) quedó en la entrada BUG-009 de [BUGS.md](BUGS.md). La implementación es una tarea aparte; BUG-009 sigue pendiente hasta entonces.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | BUG-009 gana la línea "Diseño" con la decisión y el plan de implementación; se retira el "fix probable" abierto. |
| `docs/HANDOFF.md` | Entrada en "Qué se hizo recientemente" (sale MC.7d slice 1 hacia el puntero de tareas anteriores). |
| `docs/CHANGELOG.md` | Esta entrada. |

---

### fix(tesoreria): copy de la cuota de manejo corregido y validaciones rechazan Infinity (BUG-007, BUG-008) · 2026-07-03

Cierra los dos bugs de baja prioridad de la revisión de Mis cuentas, dejando la sección sin bugs pendientes salvo BUG-009 (media, requiere una decisión de diseño).

**BUG-007:** el formulario de cuenta, al activar la cuota de manejo, decía "Finko crea un gasto fijo mensual con este monto y día. Lo vas a ver en Calendario y en Deudas." La sección Deudas solo lista deudas desde la reestructuración v6 (los gastos fijos, incluida la cuota de manejo, se gestionan en Calendario); el copy quedó desactualizado desde entonces. Fix de una línea en [tesoreria/view.js](../modules/dominio/tesoreria/view.js): "Lo verás en Calendario."

**BUG-008:** `validarIngreso()` y `validarCuenta()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaban `isNaN(x) || x <= 0` (o `< 0`) para validar montos. `isNaN(Infinity)` es `false`, así que un monto como `'1e999'` (que `Number()` convierte a `Infinity`) pasaba la validación: un ingreso o saldo Infinity contaminaba la distribución sugerida con montos no representables en pantalla, y al persistir `JSON.stringify` lo serializaba silenciosamente como `null`, dejando un dato corrupto en `localStorage`. Fix: los tres guards (`monto` de ingreso, `saldo` de cuenta, `cuotaManejoMonto`) cambian a `!Number.isFinite(x)`, que rechaza `NaN`, `Infinity` y `-Infinity` por igual. El guard de `cuotaManejoDia` ya usaba `Number.isInteger`, que también excluye `Infinity`; se simplificó quitando el `isNaN` redundante que llevaba delante.

El alcance de BUG-008 se mantuvo en tesorería, como quedó registrado originalmente ("el patrón probablemente se repite en otros dominios: confirmarlo al revisar cada sección"); extenderlo ahora a otros dominios habría sido un cambio de alcance no pedido.

Verificado con 4 tests unitarios nuevos (`validarIngreso` rechaza monto Infinity; `validarCuenta` rechaza saldo Infinity y -Infinity; la cuota de manejo rechaza monto Infinity). Sin E2E nuevo: el copy no tenía ninguna aserción existente que actualizar y el cambio de validación ya está cubierto a nivel de lógica pura. 1866/1866 → 1870/1870 unit; 106/106 E2E sin cambios (sin regresiones). Lint limpio. SW v267 → v268.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/view.js` | Copy de la cuota de manejo: "Lo vas a ver en Calendario y en Deudas." → "Lo verás en Calendario." |
| `modules/dominio/tesoreria/logic.js` | `validarIngreso()`, `validarCuenta()`: `isNaN` → `!Number.isFinite` en los 3 guards de monto/saldo; guard de `cuotaManejoDia` simplificado. |
| `tests/unit/tesoreria.test.js` | 4 tests nuevos (BUG-008): rechazo de Infinity en monto de ingreso, saldo de cuenta (positivo y negativo) y monto de cuota de manejo. |
| `service-worker.js` | v267 → v268. |
| `docs/BUGS.md` | BUG-007 y BUG-008 resueltos (eliminados). |

---

### fix(compromisos): el abono extra a deudas desde "Distribuir mi ingreso" registra el gasto (BUG-006); nuevo BUG-009 · 2026-07-03

Cuarto bug de la revisión de Mis cuentas, ya de prioridad media. El panel "Distribuir mi ingreso" permite abonar un extra a cada deuda pendiente (sección "Abonar extra a deudas", aparte de la cuota del checklist de Necesidades). Al confirmar, el abono extra bajaba el `saldoTotal` de la deuda y descontaba la cuenta de origen, pero no dejaba ningún registro de gasto: el handler de `distribucion:aplicar` en [compromisos/index.js](../modules/dominio/compromisos/index.js) solo hacía `editar('compromisos', ...)` con el nuevo saldo. El abono quedaba invisible para Análisis (que lee los gastos del mes), para el ejecutado por grupo de Límites (ADR 017) y para el guard "ya pagado este periodo" del propio checklist. El flujo de abono individual (`_guardarAbono`) y el pago de cuota del checklist (`_aplicarNecesidad`) sí registran ese gasto; el abono extra era el único de los tres que no lo hacía.

El fix agrega al handler la creación del gasto-abono con el mismo shape que los otros dos flujos (`descripcion: 'Abono: <deuda>'`, categoría "Deudas", `compromisoId`, `cuentaId`), leyendo `cuentaOrigenId` del payload del evento (ya viajaba, el handler no lo destructuraba). El handler sigue sin tocar la cuenta: el descuento del saldo lo centraliza tesorería en `_confirmarDistribucion` (el monto ya está en `descontable`), así que no hay doble descuento. La slice `gastos` ya estaba en `_SLICES_DISTRIBUCION` (agregada en MC.7d slice 1), de modo que "Deshacer" revierte también el nuevo gasto sin cambios extra.

**BUG-009 detectado al implementar este fix (registrado, no corregido aquí):** una misma deuda con `cuotaMensual > 0` y saldo pendiente aparece a la vez en el checklist de Necesidades (su cuota, marcada por defecto) y en "Abonar extra" (input en 0). Si el usuario marca la cuota y además escribe un extra para esa deuda, ambos se aplican y la cuenta se debita `cuota + extra` mientras la deuda solo puede bajar hasta 0; con montos cercanos al saldo se sobrepaga. Es preexistente en la matemática de la cuenta (el `descontable` ya debitaba ambos); este fix solo lo hizo visible al crear el segundo gasto. Requiere una decisión de diseño (¿se permite pagar cuota + extra en un mismo movimiento, o una deuda ya en el checklist no debe ofrecerse también como extra?), por eso se registró como BUG-009 en vez de ampliar el alcance de esta tarea.

Verificado con 2 E2E nuevos en Chromium real: una deuda con `cuotaMensual: 0` (para que aparezca solo en "Abonar extra", aislando la ruta) recibe un abono extra de $500.000, y al confirmar se crea el gasto con el shape correcto, la deuda baja a $1.500.000 y la cuenta se descuenta una sola vez; el segundo test confirma que "Deshacer" borra el gasto y restaura saldo de deuda y cuenta. El fix vive en el handler de EventBus (capa `index.js`, no cubierta por unit tests, excluida de coverage por diseño), de ahí que la verificación sea E2E. La verificación en el preview interactivo mostró el módulo `compromisos/index.js` cacheado de una sesión anterior (el servidor sí sirve el código nuevo, confirmado por fetch; `location.reload()` no invalida la caché heurística de módulos ES de `python -m http.server`), comportamiento ya documentado en la memoria del entorno; la E2E en Chromium fresco (contexto nuevo por test) es la verificación autoritativa. 1866/1866 unit; 104/104 → 106/106 E2E. Lint limpio. SW v266 → v267.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/index.js` | El handler de `distribucion:aplicar` crea el gasto-abono (mismo shape que el abono individual) y lee `cuentaOrigenId` del evento; importa `hoy` de utils. |
| `tests/e2e/smoke.test.js` | Suite nueva "abono extra a deudas (BUG-006)", 2 tests (registro del gasto + Deshacer). |
| `service-worker.js` | v266 → v267. |
| `docs/BUGS.md` | BUG-006 resuelto (eliminado); BUG-009 nuevo. |

---

### fix(tesoreria): la cuota de manejo cuenta como gasto fijo mensual (BUG-005) · 2026-07-03

Tercer bug de prioridad alta de la revisión exhaustiva de Mis cuentas. Cuando el usuario marca "esta cuenta cobra cuota de manejo mensual" en el formulario de cuenta, Finko crea un compromiso fijo vinculado (`esCuotaManejo: true`) que representa ese cobro recurrente. Ese compromiso nacía con `frecuencia: 'mensual'` en minúscula, pero todo el resto de la app compara contra `'Mensual'` capitalizado: el catálogo `FRECUENCIAS`, la tabla `_FACTOR_MENSUAL` de tesorería y la `FACTOR_MENSUAL` de compromisos. El resultado era una cuota fantasma: no sumaba en `calcularGastosFijosMensuales` (factor `undefined → 0`), así que no entraba en las Necesidades del modelo de distribución (`construirContextoDistribucion` → `sugerirDistribucionIngreso`), no inflaba el objetivo del fondo de emergencia (gastos fijos × meses de respaldo), no aparecía en el checklist de Necesidades de "Distribuir mi ingreso" (que filtra por `frecuencia === 'Mensual'`) y proyectaba $0 como equivalente mensual en la lógica de Deudas. Solo se veía en Calendario, y por casualidad: `_diasParaCompromiso` de Agenda trata cualquier frecuencia no reconocida como mensual (fallback conservador de su `default`).

El fix tiene dos partes, porque hay dos poblaciones de datos. Para las cuotas que se creen de ahora en adelante, `compromisoDesdeCuotaManejo()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) escribe `'Mensual'`. Para las cuotas ya guardadas en los dispositivos de los usuarios, una migración idempotente v19 → v20 en [storage.js](../modules/core/storage.js) capitaliza la `frecuencia` de los compromisos con `esCuotaManejo === true` que tengan exactamente `'mensual'` (los que ya están en `'Mensual'`, o cualquier otro valor, se dejan igual; sin `esCuotaManejo` no se tocan). Como todas las migraciones del proyecto, corre en memoria (`S`) en cada `loadData()` y se persiste en el siguiente `save()`, no fuerza una escritura al cargar; el efecto es visible de inmediato porque la UI lee de `S`.

Este cambio hace, por diseño, que la cuota de manejo aparezca ahora como una Necesidad marcable en "Distribuir mi ingreso": es una obligación mensual real, coherente con que el usuario pueda registrar su pago desde ahí igual que cualquier otro fijo (mismo `_pagadoEstePeriodo` compartido, sin doble registro con Calendario). Observación menor detectada al verificar en el navegador, no corregida aquí (es preexistente y ortogonal): el resumen de la tarjeta de distribución redondea a porcentaje entero, así que una necesidad de $15.000 sobre un ingreso de $3.000.000 (0,5%) se muestra como 1% · $30.000 en el resumen agregado, aunque el checklist muestra el monto exacto; afecta a cualquier necesidad pequeña, no solo a la cuota de manejo.

Verificado con 6 tests unitarios nuevos (4 de la migración v19→v20: capitaliza la cuota, no toca un fijo normal, idempotente sobre 'Mensual', no-op sin compromisos; 2 de integración: la cuota generada cuenta en `calcularGastosFijosMensuales` y aparece en `construirDesgloseNecesidades`), el shape esperado de `compromisoDesdeCuotaManejo` actualizado a `'Mensual'` (el test afirmaba el valor buggy y lo entrenaba), más 1 E2E en Chromium real que carga un estado v19 con la cuota en minúscula, comprueba que aparece en el checklist tras la migración y que confirmar la distribución persiste `'Mensual'`. Verificación adicional en el preview interactivo (cargó bien): una cuota de manejo de $15.000 aparece en el checklist con su monto exacto y contribuye al cálculo de Necesidades del modelo de distribución. 1861/1861 → 1866/1866 unit; 103/103 → 104/104 E2E. Lint limpio. SW v265 → v266.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `compromisoDesdeCuotaManejo()` escribe `frecuencia: 'Mensual'` (era `'mensual'`). |
| `modules/core/storage.js` | Migración v19 → v20: capitaliza la frecuencia de las cuotas de manejo ya guardadas; `SCHEMA_VERSION` 19 → 20. |
| `tests/unit/storage.test.js` | 4 tests nuevos de la migración v19 → v20. |
| `tests/unit/tesoreria.test.js` | Shape de `compromisoDesdeCuotaManejo` a `'Mensual'`; 1 test de integración (la cuota cuenta en cálculos mensuales y checklist). |
| `tests/e2e/smoke.test.js` | 1 test nuevo: migración + aparición en el checklist + persistencia en Chromium real. |
| `service-worker.js` | v265 → v266. |

---

### fix(tesoreria): el checklist de Necesidades no vuelve a pagar lo ya pagado ni sobrepaga deudas (BUG-003, BUG-004) · 2026-07-03

Corrige los dos bugs de prioridad alta encontrados en la revisión exhaustiva de Mis cuentas del mismo día (ver la entrada de abajo). Ambos vivían en el checklist accionable de Necesidades del panel "Distribuir mi ingreso" (MC.7d, ADR 018).

**BUG-003:** una fila del checklist ya pagada este periodo nace `checked disabled` para comunicar "esto ya está cubierto", pero un checkbox deshabilitado sigue reportando `.checked === true` en el DOM. `_leerNecesidadesMarcadas()` en [tesoreria/index.js](../modules/dominio/tesoreria/index.js) filtraba solo por `.checked`, así que confirmar la distribución con esa fila presente volvía a pagar un gasto o abono ya registrado: segundo gasto vinculado al mismo compromiso, segundo descuento de la cuenta. Fix de una línea: el filtro exige además `!chk.disabled`. Esto también corrige el resumen en vivo ("Asignado: $X"), que antes sumaba el monto de las filas ya pagadas.

**BUG-004:** `construirDesgloseNecesidades()` en [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js) usaba `cuotaMensual` de una deuda sin toparla contra su `saldoTotal` pendiente ni excluir las deudas ya saldadas (`saldoTotal <= 0`). Una deuda con cuota de $200.000 y saldo pendiente de solo $50.000 ofrecía y registraba el abono completo de $200.000: la deuda quedaba en $0 correctamente, pero $150.000 de más salían de la cuenta como gasto real, sin ningún lugar a donde ir. Una deuda ya saldada pero sin archivar seguía apareciendo como pendiente, algo que el formulario de abono individual ya rechazaba ("Esta deuda ya está saldada"). Fix: `monto = Math.min(cuotaMensual, saldoTotal)` y el filtro de entrada exige `saldoTotal > 0`, mismo criterio que ya usa `deudasPendientes` en `view.js` para las filas de "Abonar extra a deudas".

Verificado con 4 tests unitarios nuevos en `construirDesgloseNecesidades` (tope activo, tope no interfiere cuando el saldo alcanza, exclusión de deuda saldada, exclusión de saldo negativo) más 2 E2E nuevos en Chromium real que reproducen exactamente los escenarios de los bugs: confirmar con una Necesidad ya pagada presente no la duplica y el resumen en vivo la excluye; el checklist topa la cuota de una deuda a su saldo pendiente y excluye una deuda saldada, con el abono real registrado por el monto correcto. Verificación adicional en el preview interactivo (que esta vez sí cargó la app): confirmé la distribución en vivo con las tres condiciones a la vez (fijo ya pagado + deuda con cuota mayor al saldo + deuda saldada) y el saldo final de la cuenta, el conteo de gastos y el saldo de la deuda coincidieron con lo esperado. 1857/1857 → 1861/1861 unit; 101/101 → 103/103 E2E. Lint limpio. SW v264 → v265.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/index.js` | `_leerNecesidadesMarcadas()` agrega `&& !chk.disabled` al filtro. |
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` topa el monto de deuda a `saldoTotal` y excluye deudas con `saldoTotal <= 0`. |
| `tests/unit/tesoreria.test.js` | `compDeudaBase()` gana `saldoTotal` por defecto; 4 tests nuevos de BUG-004. |
| `tests/e2e/smoke.test.js` | 2 tests nuevos: BUG-003 (confirmar sin duplicar una fila ya pagada) y BUG-004 (tope de cuota + exclusión de deuda saldada). |
| `service-worker.js` | v264 → v265. |

---

### docs(revision): revisión exhaustiva de Mis cuentas, 6 bugs registrados (BUG-003 a BUG-008) · 2026-07-03

Arranque del plan de validación sección por sección acordado con el usuario (orden: seguir el flujo del dinero, empezando por Mis cuentas como base de todo y dominio con el cambio más reciente). La revisión cubrió el dominio completo (`tesoreria/logic.js`, `view.js`, `index.js`, 3.208 líneas), sus integraciones (crud, cuenta-helper, EventBus `distribucion:aplicar` en los 5 dominios consumidores, Agenda "Marcar pagado", abono individual de Deudas), los ADR que lo gobiernan (012, 013, 017, 018) y todo el copy de la sección. Cada sospecha se confirmó empíricamente antes de registrarse: 13 sondas unitarias (happy-dom) y 3 sondas E2E (Chromium real), temporales y no commiteadas; el fix de cada bug debe traer sus propios tests.

**Hallazgos registrados en [BUGS.md](BUGS.md):** BUG-003 (alta: una Necesidad "Ya pagado" se vuelve a pagar al confirmar la distribución, porque un checkbox `checked disabled` sigue estando checked), BUG-004 (alta: el checklist ofrece y registra la cuota completa de una deuda aunque el saldo pendiente sea menor, e incluye deudas ya saldadas sin archivar), BUG-005 (alta: la cuota de manejo nace con frecuencia 'mensual' en minúscula y queda fuera de gastos fijos mensuales, checklist, objetivo del fondo y equivalente mensual de Deudas; solo se ve en Calendario por un fallback), BUG-006 (media: el abono extra a deudas desde el panel baja deuda y cuenta pero no crea el gasto, invisible para Análisis y Límites), BUG-007 (baja: copy que promete ver la cuota de manejo "en Deudas") y BUG-008 (baja: las validaciones aceptan Infinity vía '1e999').

**Observaciones sin registro de bug (decisión del usuario pendiente):** el monto por defecto del panel para ingresos Quincenales es el mensual estimado (el doble del cobro real); sin día de pago no hay guard de periodo y una segunda confirmación acreditaría el ingreso dos veces; el copy del panel no avisa que el ingreso se acreditará a la cuenta (riesgo de doble conteo si el usuario ya actualizó su saldo a mano); la línea "Sugerencia: $X a ahorro" aparece aunque no haya destinos de ahorro; y la regla ADN #10 ("ningún dominio importa a otro") convive con 8+ imports cruzados de `logic.js` puro (analisis importa de 5 dominios, agenda de compromisos incluso en `index.js`, presupuesto de tesorería y gastos, config de export) mientras otros sitios duplican código citando esa misma regla: conviene un ADR que legalice el patrón "import de logic.js puro, solo lectura" o un refactor, pero no ambos criterios a la vez.

Sin cambios de código ni de service worker. Suites verificadas antes y después: 1857/1857 unit, línea base intacta.

| Archivo | Cambio |
|---|---|
| `docs/BUGS.md` | 6 entradas nuevas (BUG-003 a BUG-008) con causa, archivo, función y líneas. |
| `docs/HANDOFF.md` | Entrada de la revisión en "Qué se hizo recientemente". |

---

### feat(tesoreria): Necesidades pasa a checklist accionable en Distribuir mi ingreso (MC.7d, slice 1) · 2026-07-03

Primer slice de MC.7d: implementa las decisiones R1, R4 y R5 de la revisión 2026-07-02 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md). El desglose de Necesidades del panel "Distribuir mi ingreso" (un `<details>` de solo lectura desde MC.7c) pasa a ser una checklist accionable: el usuario marca los gastos fijos mensuales y las cuotas de deuda que cubre con este ingreso, y al confirmar, cada marca genera exactamente el mismo registro que su flujo individual existente, sin inventar un tipo de movimiento nuevo.

**Alcance decidido con el usuario antes de codear:** solo entran a la checklist los fijos con frecuencia Mensual y las deudas. Un fijo Quincenal, Semanal o Diario tiene más de una ocurrencia dentro del periodo del ingreso; como esta checklist modela una fila = un pago completo, incluirlo con su monto por ocurrencia habría dejado al usuario marcando como "cubierto todo el periodo" algo que en realidad solo cubre una fracción, ensuciando el badge "Ya pagaste este mes" de Agenda y registrando un gasto de menos. Modelar sus múltiples vencimientos (como ya hace `eventosDelMes` de Agenda) queda para una tarea futura. El shell de asistente paginado (avanzar/atrás entre pasos) y el recálculo del presupuesto de Ahorro sobre el remanente real tras las Necesidades marcadas (R3 del ADR) tampoco entran en este slice: quedan como tarjetas separadas en el BOARD para no mezclar tres decisiones de UI/producto distintas en un solo cambio.

En [tesoreria/logic.js](../modules/dominio/tesoreria/logic.js), `construirDesgloseNecesidades(compromisos, gastos, hoy)` gana dos parámetros nuevos y cambia de comportamiento: antes mensualizaba cualquier frecuencia con `_FACTOR_MENSUAL` (un Mercado Quincenal de $150.000 se mostraba como $300.000/mes); ahora filtra directamente por `frecuencia === 'Mensual'` para fijos (las deudas no tienen este problema porque `cuotaMensual` ya es, por definición, la obligación completa del mes) y cada fila trae su `diaPago` y si ya está `pagado` este periodo. Dos privadas nuevas, `_prefijoMes()` y `_pagadoEstePeriodo()`, duplican el criterio de `estadoPagoMes()` de compromisos/logic.js (el mismo guard que usa el badge "Ya pagaste este mes" de Agenda: para un fijo, cualquier gasto vinculado el mes en curso cuenta como pagado; para una deuda, la suma de abonos del periodo debe alcanzar `cuotaMensual`). Es un duplicado intencional, no una importación cruzada: tesorería no puede importar de Compromisos (ADN #10). El orden de la lista pone primero los no pagados, de mayor a menor monto, y deja los ya pagados al final.

En [tesoreria/view.js](../modules/dominio/tesoreria/view.js), `_renderDesgloseNecesidades()` (el `<details>` de solo lectura) se elimina y su lugar lo toma `_filaNecesidad()`: checkbox, nombre, categoría, día de pago y monto. El monto no es editable a propósito, a diferencia de las filas de Ahorro/Deudas/Inversiones: es la cuota real de una obligación, no una asignación libre que el usuario deba calcular. Una fila ya pagada nace marcada y deshabilitada, con "Ya pagado" en vez del monto, para que no se pueda registrar el mismo pago dos veces. `_renderPanelDistribuir()` saca a Necesidades del bloque "Esto queda en tu cuenta (no se mueve)" (ya no aplica: ahora sí se mueve dinero) y la ubica como la primera sección accionable del panel, antes de Ahorro/Deudas/Inversiones, reflejando el orden de pasos del ADR. El panel completo ahora también se muestra cuando la única fuente de contenido son las Necesidades (antes exigía al menos un destino de ahorro, deuda o inversión para aparecer).

En [tesoreria/index.js](../modules/dominio/tesoreria/index.js): `_leerNecesidadesMarcadas()` lee los checkboxes de la nueva checklist (monto fijo en `data-nec-monto`, no un input) y se combina con `_leerItemsDistribucion()` dentro de `_recalcularDistribucion()`, así el resumen en vivo ("Asignado: $X. Queda disponible: $Y") ya suma ambos grupos sin distinguir su origen. `_aplicarNecesidad()` escribe el pago directo en la colección `'gastos'` (para un fijo: mismo shape que "Marcar pagado este mes" de Agenda, categoría "Gastos fijos"; para una deuda: mismo shape que un abono, categoría "Deudas", más el descuento de `saldoTotal` topado en 0). Escribir `gastos`/`cuentas` directo desde tesorería no es una violación de ADN #10: es el mismo patrón que ya usan Agenda y Compromisos, un ledger compartido que cualquier dominio edita con `guardar`/`editar` de crud.js. `_confirmarDistribucion()` aplica cada Necesidad marcada dentro de la misma confirmación única que ya aplicaba Ahorro/Deudas/Inversiones (un solo `resolverCuenta`, ninguna pregunta adicional). **Hallazgo de R4 del ADR aplicado en este slice:** `_SLICES_DISTRIBUCION` (el snapshot para "Deshacer") no incluía la colección `'gastos'`; como este cambio hace que el Paso 1 cree gastos reales, se agregó esa slice, evitando que "Deshacer" dejara pagos huérfanos sin revertir.

**Bug de timing encontrado y corregido durante la verificación E2E (no era un bug de lógica):** los primeros intentos de los tests de confirmar/deshacer fallaban con el saldo y el gasto sin persistir, aunque el código corría sin lanzar ningún error (se confirmó agregando logging temporal directo en el código fuente, luego removido). La causa real: `save()` está debounced 200ms (ADN #5, "nunca escribir a `localStorage` directo") y los tests leían `localStorage` inmediatamente después del click de confirmar, antes de que el debounce hiciera el flush real a disco. Se corrigió agregando `page.waitForTimeout(400)` antes de leer `localStorage` en ambos tests, el mismo patrón que ya usan otros E2E del proyecto que verifican persistencia entre sesiones.

Verificado con 13 tests unitarios nuevos/reescritos en `construirDesgloseNecesidades` (fijos Mensuales con su monto tal cual; exclusión de Quincenal/Semanal/Diario; estado `pagado` según gasto/abono del periodo, incluyendo el caso de abono parcial que no cuenta como pagado; orden con los pagados al final aunque su monto sea mayor) más 4 E2E en Chromium real: la checklist lista fijos mensuales y deudas con su día de pago y excluye un fijo Quincenal; una Necesidad ya pagada aparece marcada y deshabilitada con "Ya pagado"; confirmar con una Necesidad marcada registra el mismo gasto que su flujo individual y descuenta la cuenta correctamente; "Deshacer" restaura el saldo y borra el gasto creado. El preview interactivo de este entorno no cargó la app (`chrome-error://chromewebdata/`, problema ya conocido de este entorno de trabajo); la verificación se apoyó en la suite E2E con Chromium real, que sí es una verificación de navegador genuina. 1851/1851 → 1857/1857 unit; 98/98 → 101/101 E2E. Lint limpio. SW v263 → v264.

| Archivo | Cambio |
|---|---|
| `modules/dominio/tesoreria/logic.js` | `construirDesgloseNecesidades()` gana parámetros `gastos`/`hoy`, filtra solo fijos Mensuales (ya no mensualiza), agrega `diaPago` y `pagado` por fila; nuevas privadas `_prefijoMes()`, `_pagadoEstePeriodo()`. |
| `modules/dominio/tesoreria/view.js` | `_renderDesgloseNecesidades()` eliminada; nueva `_filaNecesidad()` (checklist accionable); `_renderPanelDistribuir()` mueve Necesidades a una sección accionable propia, primero en el panel. |
| `modules/dominio/tesoreria/index.js` | Nuevas `_leerNecesidadesMarcadas()`, `_aplicarNecesidad()`; `_confirmarDistribucion()` aplica los pagos de Necesidades marcadas; `_SLICES_DISTRIBUCION` suma `'gastos'`; listener de `change` para `[data-nec-toggle]`. |
| `styles/components/forms.css` | Nuevas `.distribuir__fila--pagado`, `.distribuir__nec-monto`; clases del `<details>` retirado eliminadas. |
| `tests/unit/tesoreria.test.js` | `construirDesgloseNecesidades`: 13 tests (exclusión por frecuencia, `pagado`, `diaPago`, orden). |
| `tests/e2e/smoke.test.js` | Suite "Distribuir mi ingreso: checklist de Necesidades" reemplaza el test de solo lectura de MC.7c; 4 tests nuevos. |
| `service-worker.js` | v263 → v264. |

---

### docs(adr): revisión de ADR 018, el Paso 1 del asistente pasa a checklist accionable · 2026-07-02

Prerequisito de MC.7d, sin cambios de código. Tras validar en la app el desglose read-only de Necesidades (MC.7c), el usuario dio la dirección nueva del 2026-07-02: cada grupo del asistente "Distribuir mi ingreso" debe mostrar sus registros como **checklist seleccionable que registra pagos reales**, no como lista informativa. Eso contradice la decisión 2 de [ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md) (Paso 1 read-only, sin mover dinero), así que, siguiendo la regla del proyecto (tocar una decisión de un ADR requiere actualizarlo antes de codear), se revisó el ADR como tarea propia.

Se agregó la sección "Revisión 2026-07-02" con cinco decisiones nuevas, ancladas en el código que ya existe:

- **R1 (reemplaza la decisión 2):** la checklist de Necesidades muestra nombre, cuota del periodo actual (fijo: su `monto` por ocurrencia según su frecuencia; deuda: su `cuotaMensual`; nunca el saldo total ni el equivalente mensual normalizado) y día de pago. Los items marcados generan al confirmar exactamente los mismos registros que sus flujos individuales existentes: pago de fijo como "Marcar pagado este mes" de Agenda (gasto con `compromisoId`, categoría "Gastos fijos"), cuota de deuda como abono (baja `saldoTotal`, gasto de categoría "Deudas"). El guard "ya pagado este periodo" se comparte con el badge de Agenda (gasto del mes con `compromisoId`), lo que elimina el doble registro entre ambos flujos. Lo no marcado se comporta como hoy: queda en la cuenta y se paga al vencer.
- **R2:** una sola pregunta de cuenta al confirmar todo el asistente, con el patrón `cuenta-helper` (con una sola cuenta activa no se pregunta, regla de cuenta única). Se descartó preguntar cuenta por cada item: fricción multiplicada para el caso común.
- **R3:** los pasos se encadenan sobre el remanente real: el Paso 2 (Ahorro) sugiere sus aportes sobre el cobro menos las Necesidades marcadas, no sobre el porcentaje teórico del split; la validación total asignado ≤ monto del cobro es una sola para todo el asistente (generaliza `resumirPlanDistribucion`).
- **R4 (ajusta la decisión 6):** la confirmación única aplica también los pagos del Paso 1, con el mismo apply-plan por EventBus y snapshot de undo. Nota de implementación obligatoria: `_SLICES_DISTRIBUCION` en `tesoreria/index.js` hoy no incluye la slice `gastos`; como el Paso 1 crea gastos, hay que agregarla o el "Deshacer" dejaría pagos huérfanos.
- **R5 (confirma la decisión 7):** sin schema nuevo: los pagos son gastos normales con `compromisoId` y los abonos actualizan `saldoTotal`.

Las decisiones 2, 5 y 6 originales quedan marcadas con notas de revisión y su texto se conserva como historia. La tabla de slices refleja MC.7a/b/c entregados y amplía MC.7d (extender `construirDesgloseNecesidades` con cuota del periodo, día de pago y estado pagado; sumar `gastos` al snapshot); la nota de modelos de los slices restantes pasa a la escala Claude 5. El desglose construido en MC.7c no se tira: evoluciona a checklist en MC.7d.

En [BOARD.md](BOARD.md), la tarjeta MC.7d pasó de "requiere revisión de ADR 018 antes de codear" a "pendiente (diseño cerrado)", con el objetivo alineado a R1-R5, los archivos afectados precisados (`construirDesgloseNecesidades`, `_SLICES_DISTRIBUCION`, `_confirmarDistribucion`) y modelo de implementación `Sonnet 5 - Alto`.

Tarea solo de documentación: sin tests nuevos ni bump de service worker. Suites verificadas verdes antes del commit (1851/1851 unit).

| Archivo | Cambio |
|---|---|
| `docs/DECISIONS/018-asistente-distribuir-ingreso.md` | Sección "Revisión 2026-07-02" (R1-R5, alternativas y consecuencias de la revisión); notas en las decisiones 2, 5 y 6; estado y autores actualizados; tabla de slices y modelos al día. |
| `docs/BOARD.md` | Tarjeta MC.7d actualizada: estado, objetivo R1-R5, archivos y modelo. |
| `docs/HANDOFF.md` | Entrada nueva en "últimas 5 tareas" (sale AG.5 del listado detallado). |

---

### feat(calendario): nombre automático según la categoría en el gasto fijo (AG.4) · 2026-07-02

El form de "Nuevo gasto fijo" pedía descripción y categoría como dos campos independientes y ambos obligatorios de hecho, pero para las 13 categorías predefinidas (Mercado, Arriendo, Servicios públicos, Internet...) esa pregunta doble es redundante: si el usuario elige "Mercado" como categoría, escribir "Mercado" otra vez como nombre no aporta nada. AG.4 resuelve esto haciendo que, al elegir una categoría predefinida, el nombre del registro sea la propia categoría, y el campo de texto libere su rol original para convertirse en una nota opcional (por ejemplo, con categoría "Mercado" el usuario puede anotar "Éxito de la esquina" o "unidad 302"). Solo con la categoría "Otro" (o sin categoría elegida) el campo de texto vuelve a ser el nombre obligatorio del gasto, exactamente como funcionaba antes.

En [compromisos/logic.js](../modules/dominio/compromisos/logic.js) se agregó `_categoriaFijoConNombreAuto(datos)`, un helper privado que evalúa si el tipo es `fijo`, la categoría pertenece al catálogo `CATEGORIAS_AGENDA` y es distinta de `'Otro'`. `validarCompromiso()` usa este helper para dejar de exigir `descripcion` cuando aplica (antes el chequeo de descripción vacía era incondicional para los tres tipos de compromiso). `normalizarCompromiso()` lo usa para decidir el shape final: con nombre automático, `descripcion = categoria` y lo que el usuario escribió se guarda en un campo nuevo `nota` (cadena vacía si no escribió nada); sin nombre automático, `descripcion` es el texto del usuario y `nota` queda `''`. El campo `nota` es nuevo en el schema de compromisos tipo fijo, pero es opcional, con valor por defecto `''`, y se lee de forma defensiva (`c.nota ?? ''` en el render); siguiendo el mismo criterio que ya usó la adición de `categoria` en MC.9-Agenda, no hace falta una migración de schema para los compromisos ya guardados.

En [agenda/view.js](../modules/dominio/agenda/view.js), `renderFormGastoFijo()` reordena los campos: la categoría pasa a ir primero y el nombre/nota después, para que la relación causa-efecto sea clara en la interfaz (elegís la categoría, el campo de abajo reacciona). El label del campo de nombre ahora tiene un id propio (`gfijo-descripcion-label`) para que JS pueda alternar su texto. En `_renderDetalleItem()`, el subtítulo deja de repetir la categoría cuando coincide exactamente con el nombre del registro (el caso de nombre automático, donde mostrarla de nuevo sería ruido: el título ya dice "Mercado"), pero la sigue mostrando cuando difieren (categoría "Otro" con un nombre propio, por ejemplo "Suscripción Xbox" con categoría "Otro"); además, cuando el registro tiene una nota, se agrega al final del subtítulo.

En [agenda/index.js](../modules/dominio/agenda/index.js) se agregó `_syncCategoriaGastoFijo(form)`, calcada del patrón que ya usó `_syncCategoriaMeta` en MT.3 para Metas: alterna el label ("Descripción" ↔ "Nota (opcional)"), el placeholder y el atributo `required`/`aria-required` del campo de texto según la categoría elegida en el `<select>`, enganchada al evento `change` del selector. Se llama también al (re)inyectar el formulario, tanto al crear un gasto nuevo (estado por defecto: sin categoría, campo requerido) como al editar uno existente. El prefill de edición ahora distingue: si el compromiso tiene nombre automático (categoría predefinida), el campo de texto se rellena con `compromiso.nota`, no con `compromiso.descripcion` (que sería igual a la categoría y no aportaría nada al reabrir el form).

Verificado con 10 tests unitarios nuevos (`validarCompromiso` y `normalizarCompromiso` con categoría predefinida, con "Otro" y sin categoría; el nuevo orden de campos del formulario y su estado por defecto; la supresión de la categoría duplicada en el subtítulo y el render de la nota) más 4 E2E en Chromium real: el label y el `required` cambian al elegir una categoría predefinida y vuelven al elegir "Otro"; guardar con una categoría predefinida y sin texto usa la categoría como nombre del registro; guardar con una categoría predefinida y una nota la muestra en el subtítulo del detalle del día. 1838/1838 → 1851/1851 unit; 94/94 → 98/98 E2E. Lint limpio. SW v262 → v263.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `_categoriaFijoConNombreAuto()`; `validarCompromiso()` deja de exigir descripción con nombre automático; `normalizarCompromiso()` deriva `descripcion`/`nota` para tipo fijo según la categoría. |
| `modules/dominio/agenda/view.js` | `renderFormGastoFijo()` reordena categoría antes del nombre y agrega `#gfijo-descripcion-label`; `_renderDetalleItem()` suprime la categoría duplicada en el subtítulo y muestra la nota cuando existe. |
| `modules/dominio/agenda/index.js` | Nueva `_syncCategoriaGastoFijo(form)` (mismo patrón que `_syncCategoriaMeta` de MT.3); el prefill de edición usa `nota` en vez de `descripcion` cuando el nombre es automático. |
| `tests/unit/compromisos.test.js` | 6 tests nuevos: `validarCompromiso`/`normalizarCompromiso` con categoría predefinida, "Otro" y sin categoría. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: orden de campos y estado por defecto del formulario, supresión de la categoría duplicada, render de la nota en el subtítulo. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - nombre automático según la categoría", 4 tests. |
| `service-worker.js` | v262 → v263. |

---

### feat(calendario): emoji de categoría como ícono principal (AG.2) · 2026-07-02

En el detalle del día, un gasto fijo con categoría (Mercado, Internet, Arriendo, Servicios públicos...) mostraba el emoji de su categoría (`CATEGORIA_AGENDA_EMOJI`) únicamente dentro del subtítulo pequeño (` · 🌐 Internet`), mientras el ícono principal a la izquierda del registro seguía siendo el genérico por tipo, el mismo círculo para todos los gastos fijos sin distinción. Gastos ya había resuelto exactamente este problema (`CATEGORIA_EMOJI[catKey] ?? icon('gastos')` como ícono principal, con el emoji retirado del subtítulo para no repetirse): AG.2 porta ese mismo patrón a Agenda.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` calcula `emojiCategoria` (el emoji de la categoría cuando `tipo === 'fijo'` y el registro tiene `categoria`) y lo usa como ícono principal con `emojiCategoria ?? icon(ICONO_TIPO[tipo] ?? 'recurring')`: con emoji disponible, se muestra ese carácter directamente; sin categoría, o en deudas (`categoria` es un campo exclusivo de gastos fijos), cae al ícono SVG genérico de siempre, sin cambio de comportamiento. El subtítulo deja de repetir el emoji: pasa de ` · 🌐 Internet` a ` · Internet`, ya que el emoji ahora vive en el ícono principal y repetirlo sería ruido visual, igual que ya evita Gastos en `list-item__subtitle`.

En [config.css](../styles/components/config.css) se agregó `.cal-detail__icon--emoji`, aplicada solo cuando el ícono muestra un emoji de categoría, con un `font-size` de 1.375rem (más grande que el 1rem base del ícono con SVG) para que el emoji se lea con presencia como protagonista del registro, mismo criterio de tamaño que ya usa `.list-item__icon--cat` de Gastos (1.5rem, "emoji grande, protagonista", documentado en `atoms.css`).

**Corrección de un descuido de la tarea anterior (AG.7):** el commit de AG.7 documentaba el bump de `service-worker.js` de v261 a v262 tanto en el mensaje de commit como en HANDOFF y este mismo CHANGELOG, pero el archivo nunca se tocó: `CACHE_NAME` seguía en `finko-v261` después de ese push. Eso significa que los cambios de AG.7 (franja de color por tipo en el detalle del día) se desplegaron a producción sin invalidar el caché del service worker, así que los usuarios con una instalación PWA activa podían seguir viendo la versión sin la franja de color hasta que algún otro cambio bumpeara la caché. Este commit hace el bump real a v262, cubriendo retroactivamente AG.7 junto con AG.2.

Verificado con 5 tests unitarios (2 reescritos de una tarea anterior que asumían el emoji pegado al texto del subtítulo, un markup que este cambio reemplaza; 3 nuevos para el fallback sin categoría, el emoji sin `<svg>` con categoría, y que las deudas conservan el ícono genérico) más 2 E2E en Chromium real (con categoría, el ícono no contiene ningún `<svg>` y sí el carácter emoji; sin categoría, el ícono sí contiene un `<svg>`). 1835/1835 → 1838/1838 unit; 92/92 → 94/94 E2E. Lint limpio. SW v261 → v262 (bump real, corrige también el vacío dejado por AG.7).

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()`: el emoji de categoría pasa a ser el ícono principal (`emojiCategoria ?? icon(...)`); el subtítulo ya no repite el emoji, solo el nombre de la categoría. |
| `styles/components/config.css` | Nueva `.cal-detail__icon--emoji` (tamaño mayor para el emoji protagonista, mismo criterio que Gastos). |
| `tests/unit/agenda.test.js` | 2 tests reescritos (emoji ahora en el ícono principal, no en el subtítulo) + 3 tests nuevos (fallback sin categoría, sin `<svg>` con categoría, deuda con ícono genérico). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - emoji de categoría como ícono principal", 2 tests. |
| `service-worker.js` | v261 → v262 (bump real; corrige el vacío dejado por el commit de AG.7). |

---

### feat(calendario): identificación visual por color en los registros del día (AG.7) · 2026-07-02

En fechas cargadas (una quincena, el fin de mes) el detalle del día en Calendario mostraba todos los registros con el mismo aspecto visual: la única forma de distinguir un gasto fijo de una deuda con entidad o una deuda personal era leer su etiqueta de texto. AG.7 suma una identificación de color a cada item de la lista, reusando la misma paleta que AG.6 ya había fijado para los dots del mini calendario, así el significado de cada color es el mismo en toda la tarjeta.

En [agenda/view.js](../modules/dominio/agenda/view.js), `_renderDetalleItem()` agrega la clase `cal-detail__item--${tipo}` al `<li>` de cada registro (el ícono ya tenía su propia clase `cal-detail__icon--${tipo}`, heredada de una tarea anterior, pero sin ningún CSS de color asociado hasta ahora). En [config.css](../styles/components/config.css), `.cal-detail__item` gana una franja lateral (`border-left: 3px solid`) que cada tipo colorea con su `--fk-dom-*` correspondiente: `--fk-dom-presupuesto` (amarillo) para fijo, `--fk-dom-compromisos` (rojo) para deuda entidad, `--fk-dom-personales` (rosa) para deuda personal. El padding izquierdo del item se recalcula con `calc(var(--fk-space-N) - 3px)` para que la franja no desplace el contenido ni el ícono; el ajuste se repite en el media query mobile porque ahí el padding base es más chico (`--fk-space-2` en vez de `--fk-space-3`). El ícono circular de cada registro también toma el color de su tipo (texto + un fondo tenue con `color-mix(in srgb, var(--fk-dom-*) 14%, var(--fk-bg-surface))`), mismo criterio de intensidad que ya usan los `dom-badge--*` de `nudges.css` para no saturar la tarjeta.

No hubo que decidir nuevos colores: como el calendario solo mapea `S.compromisos` (los mismos 3 tipos que ya cubría la leyenda de AG.6), la paleta ya estaba resuelta y consistente con el resto de la app. Cuando el ADR de recordatorios de aporte (AP.4/MT.2/AH.4) sume tipos nuevos al calendario, sumarán aquí su propia clase `cal-detail__item--<tipo>` con el mismo patrón.

Verificado con 4 tests unitarios nuevos (`cal-detail__item--fijo` en un gasto fijo, `--deuda-entidad` en una deuda con entidad, `--deuda-personal` en una deuda personal, y los tres tipos combinados el mismo día cada uno con su propia clase) más 1 E2E en Chromium real que siembra un fijo y una deuda entidad el mismo día y compara el `border-left-color` computado de ambos: deben ser colores distintos entre sí y ninguno debe quedar transparente (regresión que ocurriría si un tipo no matcheara ninguna clase CSS). 1831/1831 → 1835/1835 unit; 91/91 → 92/92 E2E. Lint limpio. SW v261 → v262.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | `_renderDetalleItem()` agrega `cal-detail__item--${tipo}` al `<li>` del detalle. |
| `styles/components/config.css` | `.cal-detail__item--fijo/deuda-entidad/deuda-personal` (franja lateral + padding compensado, también en el media query mobile); `.cal-detail__icon--*` con color de texto y fondo tenue por tipo. |
| `tests/unit/agenda.test.js` | 4 tests nuevos: clase por tipo (fijo, deuda entidad, deuda personal) y los 3 tipos combinados el mismo día. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - marca de color por tipo", 1 test que compara colores computados en Chromium real. |
| `service-worker.js` | v261 → v262. |

---

### feat(calendario): leyenda completa, con colores consistentes y siempre visible (AG.6) · 2026-07-02

La leyenda del calendario (qué significa cada dot de color en los días) se renderizaba al final del panel, después del detalle del día. Con un día cargado de registros (una quincena, un fin de mes), el detalle empujaba la leyenda fuera de la pantalla justo cuando más ayudaba tenerla a mano: había que desplazarse hasta el fondo para consultarla.

AG.6 la reubica y la fija. En [agenda/view.js](../modules/dominio/agenda/view.js) la leyenda pasa a renderizarse entre el calendario y el detalle del día (justo debajo del calendario, como pedía la tarjeta), y `.cal-legend` en [config.css](../styles/components/config.css) es ahora `position: sticky` con un pequeño offset superior y fondo, borde y radio propios: al quedar pegada durante el scroll, el contenido del detalle pasa por debajo y no debe transparentarse. El obstáculo real estaba en el shell: `.main-content` tenía `overflow-x: hidden`, y un ancestro con overflow distinto de `visible` se convierte en scroll container, lo que anula el `position: sticky` de todos sus descendientes (el sticky pasa a calcularse contra un contenedor que nunca scrollea, no contra la ventana). Se cambió a `overflow-x: clip` en [layout.css](../styles/layout.css): recorta el desborde horizontal exactamente igual, pero sin crear scroll container. El comentario en el CSS deja el porqué para que nadie lo regrese a `hidden` por accidente.

Sobre la parte de colores de la tarjeta: el calendario hoy solo mapea `S.compromisos` (`eventosDelMes`), así que los 3 tipos que la leyenda ya listaba (gasto fijo, deuda entidad, deuda personal) cubren todos los eventos posibles, cada uno con su color único y consistente con el resto de la app: `--fk-dom-presupuesto` (amarillo), `--fk-dom-compromisos` (rojo) y `--fk-dom-personales` (rosa). No hubo que tocar colores. Los tipos futuros (metas, apartados, aportes al fondo) entrarán a la leyenda cuando el ADR de recordatorios de aporte (AP.4 + MT.2 + AH.4) los sume al calendario; el doc de `_renderLeyenda` deja la guía (una entrada nueva con su `cal-dot--<tipo>`). AG.7 (marca de color por registro en el detalle del día) reusa esta misma paleta.

Verificado con 2 tests unitarios nuevos (la leyenda trae los dots de los 3 tipos; con un día abierto la leyenda queda antes del detalle en el DOM) y 1 E2E en Chromium real que siembra 10 compromisos el mismo día, abre el detalle, scrollea al fondo del documento (con guard de `scrollY > 0` para que el test no pase trivialmente si el contenido no desborda) y verifica que la leyenda sigue completa dentro del viewport. El preview del entorno sigue sin cargar (servidor levantado pero sin respuesta); la verificación visual queda cubierta por el E2E. 1829/1829 → 1831/1831 unit; 90/90 → 91/91 E2E. Lint limpio. SW v260 → v261.

**Podría afectar / validación pendiente:** el cambio de `overflow-x` en `.main-content` es global (todas las secciones). `clip` recorta igual que `hidden`, así que no debería notarse; validar en el celular que la leyenda queda pegada arriba al recorrer un día cargado y que ninguna sección muestra scroll horizontal nuevo.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/view.js` | La leyenda se renderiza entre el calendario y el detalle del día; doc de `_renderLeyenda` con la guía para tipos futuros. |
| `styles/components/config.css` | `.cal-legend` sticky (top), con fondo, borde y radio propios. |
| `styles/layout.css` | `.main-content` pasa de `overflow-x: hidden` a `clip`: hidden creaba un scroll container que anulaba el sticky. |
| `tests/unit/agenda.test.js` | 2 tests nuevos: dots de los 3 tipos en la leyenda, orden leyenda → detalle. |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - leyenda sticky", 1 test con scroll real. |
| `service-worker.js` | v260 → v261. |

---

### feat(calendario): total a pagar por día (AG.5) · 2026-07-02

El panel de detalle de un día en Calendario listaba cada compromiso por separado (nombre, frecuencia, monto individual) pero nunca los sumaba: para saber cuánto dinero necesitaba tener disponible ese día, el usuario tenía que sumar a mano cada monto de la lista. La sumatoria ya existía como código, pero solo como función privada `_totalDia` dentro de [agenda/view.js](../modules/dominio/agenda/view.js), sin exportar y sin un solo test, y su resultado se mostraba pegado al subtítulo pequeño y gris ("3 compromisos · $450.000"), fácil de pasar por alto.

AG.5 extrae esa suma a `totalDia(evs)`, función pura y exportada en [agenda/logic.js](../modules/dominio/agenda/logic.js): mismo criterio que ya usa el render de cada item individual (`monto` para gastos fijos, `cuotaMensual` para deudas, nunca `saldoTotal`) y que `sumarMontos` de `compromisos/logic.js` (IN.1). Es una duplicación intencional, no una importación cruzada: Agenda no puede importar de Compromisos porque el ADN #10 prohíbe que un dominio importe a otro (aunque `agenda/view.js` ya importa varias funciones de `compromisos/logic.js` para el render de cada item, un acoplamiento existente que este cambio no extiende ni corrige, fuera del alcance de esta tarea). `_renderDetalleDia()` ahora muestra una línea propia, con más peso visual, justo bajo el título del panel: "Total a pagar: **$X**" (`.cal-detail__total`), visible de inmediato sin tener que desplazarse por la lista de items, en vez del monto perdido dentro del subtítulo. Color neutro (`--fk-text-primary`), no rojo: un compromiso programado para ese día no es un incumplimiento, mismo criterio de AUD.4/ADR 019 que ya gobierna el resto de la app. La línea solo aparece cuando la suma es mayor a 0 (compromisos sin monto capturado, como una deuda a la que aún no se le puso cuota, no generan una línea "Total a pagar: $0" vacía de sentido).

Verificado con 9 tests unitarios nuevos (`totalDia` con fijos, deudas, mezcla de ambos, montos no numéricos y entradas nulas; render real del panel con uno y con varios compromisos, con y sin monto, y sin día seleccionado) más 1 E2E en Chromium real (un gasto fijo de $900.000 y una deuda con cuota de $150.000 el mismo día 20, el panel muestra "Total a pagar: $1.050.000"). 1819/1819 → 1829/1829 unit; 89/89 → 90/90 E2E. Lint limpio. SW v259 → v260.

| Archivo | Cambio |
|---|---|
| `modules/dominio/agenda/logic.js` | Nueva `totalDia(evs)`, función pura y exportada (antes privada en `view.js`, sin tests). |
| `modules/dominio/agenda/view.js` | Eliminada `_totalDia`; `_renderDetalleDia` usa `totalDia` de `logic.js` y muestra una línea propia "Total a pagar" en vez de anexarlo al subtítulo. |
| `styles/components/config.css` | Nueva `.cal-detail__total` (color neutro, monto en negrita). |
| `tests/unit/agenda.test.js` | 9 tests nuevos: `totalDia` (5) + render del total en el panel de detalle (4). |
| `tests/e2e/smoke.test.js` | Suite nueva "Agenda - total a pagar por día", 1 test. |
| `service-worker.js` | v259 → v260. |

---

### feat(metas): ahorro sugerido según la frecuencia de ingreso, no "por día" (MT.4) · 2026-07-02

La lista de Metas siempre mostraba "$X/día" como ritmo sugerido de ahorro, sin importar cómo cobra el usuario en la realidad. Para alguien que recibe su sueldo cada quincena, pensar en "cuánto por día" no ayuda a planear: el gesto natural es "cuánto aparto en cada quincena". MT.4 reemplaza ese cálculo fijo por uno que reparte el faltante entre los periodos de la frecuencia real de ingreso del usuario, mismo espíritu que ya resolvió Apartados (AP.1) para sus propios aportes sugeridos.

Nueva `calcularAhorroPorPeriodo(meta, frecuenciaIngresos)` en [metas/logic.js](../modules/dominio/metas/logic.js) reemplaza a `calcularAhorroDiario` (eliminada): calcula cuántos periodos completos quedan hasta la fecha límite según la frecuencia (Diario = 1 día, Semanal = 7, Quincenal = 15, Mensual = 30; las frecuencias más largas como Trimestral o Anual se asimilan a Mensual, la unidad de planificación más cercana) y reparte el faltante entre esos periodos, redondeando hacia arriba (mejor pasarse un poco que llegar corto, mismo criterio que Apartados). La frecuencia no es un campo por meta (a diferencia de Apartados, que sí tiene `frecuenciaAporte` seleccionable por ítem): se deriva una sola vez de los ingresos activos del usuario con `frecuenciaPrincipalIngresos(S.ingresos)`, la frecuencia más común entre ellos.

Esta función es una copia intencional de la homónima de `apartados/logic.js`: Metas no puede importar de Apartados porque ambos son dominios y el ADN #10 prohíbe que un dominio importe a otro. La duplicación de esta idea (mapeo de frecuencia + conteo de la más común) ya es el patrón establecido en el código: tesorería tiene su propio `_FACTOR_MENSUAL`, independiente del `DIAS_POR_PERIODO` de Apartados. `renderListaMetas()` en [metas/view.js](../modules/dominio/metas/view.js) calcula la frecuencia una sola vez para toda la lista (es la misma para todas las metas, no cambia por ítem) y la pasa a `_renderMetaItem`, que ahora muestra "$X por quincena", "$X por semana", "$X al mes" o "$X por día" según corresponda, con exactamente la misma redacción que ya usa Apartados en `etiquetaPeriodo` (consistencia de vocabulario entre secciones, mismo espíritu que el guardarraíl de emojis de TX.4/ADR 014, aunque aquí no hay un test automático que lo fuerce).

Los tests con fechas relativas (`new Date(); setDate(...)`) usaban antes `toISOString().slice(0,10)`, que puede desplazar un día en zonas horarias UTC negativas como Colombia según la hora exacta en que corre el test (el mismo problema que ya resolvió `hoyLocal()` en los E2E). Se agregó un helper local `isoEnDias(dias)` en `metas.test.js` que construye la fecha con los getters locales de `Date`, evitando el off-by-one; dos aserciones de conteo exacto de periodos fallaban intermitentemente antes de este ajuste y quedaron estables después. Verificado con 22 tests unitarios nuevos (`frecuenciaPrincipalIngresos`, `etiquetaPeriodoAhorro`, `calcularAhorroPorPeriodo`, y el render real de `renderListaMetas` con distintas frecuencias) más 1 E2E en Chromium real (ingreso Quincenal sembrado, meta con fecha límite a 90 días muestra "por quincena" y nunca "/día"). 1804/1804 → 1819/1819 unit; 88/88 → 89/89 E2E. Lint limpio. SW v258 → v259.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/logic.js` | Nuevas `frecuenciaPrincipalIngresos()`, `etiquetaPeriodoAhorro()`, `calcularAhorroPorPeriodo()`; eliminada `calcularAhorroDiario()`. |
| `modules/dominio/metas/view.js` | `renderListaMetas()` calcula la frecuencia de ingreso una sola vez; `_renderMetaItem` recibe la frecuencia y muestra el monto por periodo con su etiqueta. |
| `tests/unit/metas.test.js` | 22 tests nuevos; helper `isoEnDias()` para fechas relativas sin drift de zona horaria. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - ritmo de ahorro según frecuencia (MT.4)", 1 test. |
| `service-worker.js` | v258 → v259. |

---

### feat(metas): unificar el flujo de abono con el selector de cuentas compartido (MT.5) · 2026-07-02

El abono a una meta tenía su propia implementación de selector de cuenta, separada del resto de la app: un `<select>` de texto plano, obligatorio elegir cuando había 2 o más cuentas, y una lógica de descuento que solo restaba de una cuenta sin repartir ni confirmar sobregiros. Apartados ya había resuelto exactamente este problema en AP.1 con dos piezas de [infra/cuenta-helper.js](../modules/infra/cuenta-helper.js): `renderSelectorCuenta` (tarjetas seleccionables con avatar de banco, nombre y saldo, preselecciona la de mayor saldo) y `resolverPagoConPreferida` (usa la cuenta elegida si cubre el monto; si no alcanza y hay más cuentas, abre un picker de reparto que no deja ninguna en negativo; con una sola cuenta que no alcanza, pide confirmar el sobregiro). MT.5 es el port directo de ese patrón a Metas.

En [metas/view.js](../modules/dominio/metas/view.js), `renderFormAbonoMeta()` cambia `_renderCuentaSelectorAbono` (función eliminada, 24 líneas de lógica 0/1/varias cuentas duplicada) por una llamada a `renderSelectorCuenta`. En [metas/index.js](../modules/dominio/metas/index.js), `_guardarAbonoMeta()` pasa a ser async y sigue el mismo esqueleto que `_guardarAporte` de Apartados: valida el monto, resuelve los splits con `resolverPagoConPreferida` (si hay cuentas activas), confirma el sobregiro cuando la única cuenta no alcanza (mismo texto y `peligroso: true` que Apartados, adaptado a "abono"), aplica el descuento a cada cuenta del reparto, y llama a `updSaldo()` tras guardar, algo que la implementación anterior nunca hacía (el hero de Inicio quedaba con el saldo viejo hasta el siguiente `renderAll()` completo). El chequeo manual "debes elegir cuenta si hay varias" desaparece: como el selector de tarjetas siempre trae una preselección, ya no hace falta forzar la elección a mano.

Los tests de `renderFormAbonoMeta` que verificaban el `<select>` viejo se reescribieron contra el markup de tarjetas, calcados de los que ya existían para `renderFormAporteApartado` en `apartados.test.js` (mismo patrón: sin cuentas no hay selector, una cuenta trae una tarjeta preseleccionada, varias cuentas preseleccionan la de mayor saldo, ya no queda el `<select>` viejo). Se sumaron 2 E2E en Chromium real que ejercitan el flujo completo con una cuenta real: uno de abono normal que descuenta el saldo correcto (verificado en Tesorería, mismo patrón que la suite Gastos-Cuenta), y uno de abono que no alcanza, que confirma el diálogo de sobregiro y deja el saldo en negativo tras aceptar. 1804/1804 unit; 86/86 → 88/88 E2E. Lint limpio. SW v257 → v258.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | `renderFormAbonoMeta()` usa `renderSelectorCuenta` de `cuenta-helper.js`; eliminada `_renderCuentaSelectorAbono`. |
| `modules/dominio/metas/index.js` | `_guardarAbonoMeta()` async: `resolverPagoConPreferida`, confirmación de sobregiro con una sola cuenta, reparto aplicado a cada split, `updSaldo()` tras guardar. |
| `tests/unit/metas.test.js` | Describe "selector de cuenta" reescrito contra el nuevo markup, mismo patrón que `apartados.test.js`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - abono con selector de cuenta compartido (MT.5)", 2 tests. |
| `service-worker.js` | v257 → v258. |

---

### feat(metas): simplificar la selección de emoji (MT.3) · 2026-07-02

MT.1 agregó categorías con emoji a Metas, pero dejó el campo "Emoji (opcional)" suelto: visible siempre, sin relación con la categoría elegida. Un usuario podía escribir un emoji, cambiar de categoría, y el emoji manual seguía ganando (por la prioridad de `normalizarMeta`) sin que la UI diera ninguna pista de por qué. MT.3 simplifica: el campo vive oculto por defecto (`#form-group-meta-icono` en [metas/view.js](../modules/dominio/metas/view.js)) y solo aparece cuando la categoría elegida es "Otra", la válvula de escape del catálogo (ADR 014, principio 7); el resto de las categorías ya trae su propio emoji, así que no hay nada que decidir.

La pieza no trivial es evitar un emoji manual "fantasma": `_syncCategoriaMeta(form)`, nueva en [metas/index.js](../modules/dominio/metas/index.js) y enganchada al `change` del selector de categoría, alterna el `hidden` del campo y **limpia su valor al ocultarlo**. Sin esto, un usuario que prueba "Otra", escribe un emoji, y luego elige "Vivienda" antes de guardar, terminaría con el emoji viejo en la meta: `FormData` sigue enviando campos ocultos, y `normalizarMeta` prioriza el emoji explícito sobre el de la categoría (decisión de MT.1, sigue siendo correcta como contrato de la función). También se llama tras `resetModal()` en `_nuevaMeta()`, porque `resetModal` limpia valores de input pero no el atributo `hidden` que dejó una apertura anterior del modal.

La segunda mitad de la tarjeta ("eliminar el emoji emocional de la parte inferior del form/card de meta") ya estaba resuelta: el changelog de junio 2026 registra que ese emoji se movió al título de la card en el rediseño de la lista (anillo de progreso + emoji junto al nombre), no queda ningún emoji suelto en la parte inferior del form ni de la card hoy.

Verificado con 5 tests E2E en Chromium real (el preview del entorno sigue sin cargar, nota ya conocida): el campo nace oculto, se muestra solo con "Otra", el emoji manual se guarda con "Otra", y el caso crítico, cambiar de "Otra" a otra categoría antes de guardar usa el emoji de la categoría nueva y no el manual. Se reescribió un E2E de MT.1 que ya no aplicaba (asumía el campo siempre visible). Sin tests unitarios nuevos: el comportamiento de mostrar/ocultar y limpiar el campo vive en `index.js` (DOM + eventos), fuera del alcance de happy-dom por convención del proyecto (igual que los demás toggles condicionales de formulario); se ajustó el test existente de `renderFormMeta` para reflejar el nuevo markup. 1803/1803 unit; 84/84 → 86/86 E2E. Lint limpio. SW v256 → v257.

| Archivo | Cambio |
|---|---|
| `modules/dominio/metas/view.js` | El form-group del emoji nace `hidden`; label cambiado a "Elige un emoji para tu meta". |
| `modules/dominio/metas/index.js` | Nueva `_syncCategoriaMeta(form)`: alterna `hidden` según la categoría y limpia el emoji al ocultarlo; enganchada al `change` del selector y llamada tras `resetModal` en `_nuevaMeta`. |
| `modules/dominio/metas/logic.js` | Comentario de `normalizarMeta` actualizado para reflejar la nueva UI (la función en sí no cambió). |
| `tests/unit/metas.test.js` | Test de `renderFormMeta` actualizado: el form-group del emoji nace `hidden`. |
| `tests/e2e/smoke.test.js` | 3 tests nuevos (visibilidad condicional, guardado con "Otra", limpieza al cambiar de categoría); 1 test de MT.1 reescrito. |
| `service-worker.js` | v256 → v257. |

---

### feat(metas): categorías con emoji (MT.1) · 2026-07-02

Metas de ahorro tenía nombre libre y un campo de emoji suelto (sin catálogo). Nuevo `CATEGORIAS_META` + `CATEGORIA_META_EMOJI` en [core/constants.js](../modules/core/constants.js), mismo patrón que los catálogos ya existentes (`CATEGORIA_EMOJI` de Gastos, `CATEGORIA_AGENDA_EMOJI`, `CATEGORIA_DEUDA_EMOJI`): 12 categorías con foco en objetivos de alto costo, priorizadas por el usuario el 2026-07-02 (Viajes, Cumpleaños, Boda, Vivienda, Vehículo, Computador, Celular, Educación, Hijo(s), Vacaciones, Emprendimiento, Otra).

Selector "Categoría (opcional)" nuevo en `renderFormMeta()` ([metas/view.js](../modules/dominio/metas/view.js)), con las opciones ya mostrando su emoji. `normalizarMeta()` ([metas/logic.js](../modules/dominio/metas/logic.js)) resuelve el emoji final con esta prioridad: emoji escrito a mano en el campo "Emoji (opcional)" (que se conserva, no se elimina en esta tarea) > emoji de la categoría elegida > 🎯 por defecto. Así una meta sin categoría se comporta exactamente igual que antes, y elegir una categoría predefinida trae su emoji sin que el usuario tenga que escribirlo. El emoji resuelto queda guardado en `meta.icono` como siempre; `_renderMetaItem` no cambió porque ya leía ese campo. Campo `categoria` nuevo y opcional en el shape de `Meta`, lectura defensiva, sin migración de schema.

Reconciliación de emoji contra el guardarraíl de consistencia entre catálogos (ADR 014, TX.4, "mismo concepto ⇒ misma etiqueta y mismo emoji en todas las secciones"): la lista original de la tarjeta pedía 🎓 para "Educación" y 🏖️ para "Vacaciones", pero esas etiquetas ya existían con otro emoji en otros catálogos (Educación 📚 en Gastos/Agenda; Vacaciones ✈️ en Apartados). Se usaron los emojis ya establecidos en vez de introducir un desajuste, y el catálogo de Metas se sumó a la lista de fuentes del test de guardarraíl `TX.4` (antes cubría Gastos, Agenda, Ingresos, Deudas y Apartados) para que una edición futura de cualquiera de estos catálogos no vuelva a divergir sin que un test lo marque.

El preview del entorno sigue sin cargar la app (nota ya conocida en la memoria del proyecto); verificado con 22 tests unitarios nuevos (forma del catálogo, prioridad del emoji en `normalizarMeta`, contenido del selector, emoji real en `renderListaMetas`) más 2 tests E2E nuevos en Chromium real: crear una meta con categoría "Boda" muestra 💍 en la lista, y un emoji escrito a mano gana sobre el de la categoría. 1787/1787 → 1803/1803 unit; 82/82 → 84/84 E2E. Lint limpio. SW v255 → v256.

| Archivo | Cambio |
|---|---|
| `modules/core/constants.js` | `CATEGORIAS_META` (12 categorías) + `CATEGORIA_META_EMOJI`, con la reconciliación de Educación y Vacaciones documentada en el comentario. |
| `modules/dominio/metas/logic.js` | `normalizarMeta()`: nuevo campo `categoria`; `icono` se resuelve con prioridad manual > categoría > default. |
| `modules/dominio/metas/view.js` | `renderFormMeta()` agrega el selector `#meta-categoria`; nuevo helper `_renderOpcionesCategoria()`. |
| `tests/unit/constants.test.js` | Describe nuevo con 4 tests de forma del catálogo; `CATEGORIA_META_EMOJI` sumado a las fuentes del guardarraíl TX.4. |
| `tests/unit/metas.test.js` | 15 tests nuevos: `normalizarMeta` con categoría (6), selector en `renderFormMeta` (4), emoji real en `renderListaMetas` (2), más los describe wrappers. |
| `tests/e2e/smoke.test.js` | Suite nueva "Metas - categorías con emoji (MT.1)" con 2 tests. |
| `service-worker.js` | v255 → v256. |

---

### feat(inicio): ojo para ocultar/mostrar el dinero disponible (IN.2) · 2026-07-02

Icono de ojo junto al saldo del hero de Inicio ("Tu dinero disponible hoy"), estilo app bancaria, para usar Finko en lugares públicos: alterna entre el monto visible y la máscara `$••••••` (largo fijo, para no revelar la magnitud del monto real). La preferencia persiste entre sesiones en `S.config.ocultarSaldo` con lectura defensiva (`=== true`; cualquier otro valor muestra el monto), sin migración de schema, como pedía la tarjeta.

Detalles de implementación: `updSaldo()` ([infra/render.js](../modules/infra/render.js)) es el único punto que escribe `#saldo-total`, así que la máscara vive ahí; exporta la constante `SALDO_MASCARA` y sincroniza el botón `#saldo-ojo` (icono ojo/ojo tachado vía swap del `href` del `<use>`, `aria-pressed`, oculto sin cuentas junto con el valor). Mientras el saldo está oculto el monto real nunca toca el DOM, y la nueva `stopCount(el)` ([infra/animate.js](../modules/infra/animate.js)) cancela un countUp en vuelo que de otro modo sobreescribiría la máscara frames después. La acción `saldo-visibilidad` se registra como built-in del shell en [ui/actions.js](../modules/ui/actions.js) (flip defensivo `!== true` + `save()` + `updSaldo()`). CSS en [styles/components/domain.css](../styles/components/domain.css) (capa `components`, para que el refuerzo `.hero-saldo__ojo[hidden]` gane a `display:inline-flex` de `.btn`); el botón reusa `btn btn-ghost btn-icon`. Sprite: símbolos `i-eye` / `i-eye-off` (geometría estilo Lucide, coherente con el resto).

Alcance decidido (la tarjeta lo dejaba abierto): solo el hero, el dato más sensible y el subset más pequeño con sentido; extender la máscara a los demás montos de Inicio (totales de vencidos/prioridades, resumen semanal) quedó como observación en [BOARD.md](BOARD.md). Verificación: el preview del entorno sigue sin cargar (nota en memoria del proyecto), así que la evidencia es 13 tests unit nuevos en `tests/unit/render.test.js` (máscara, defensiva, sync del botón, empty state, acción vía `dispatch`) + 1 E2E nuevo en Chromium real (click → máscara, recarga → persiste, click → monto de vuelta). 1774/1774 → 1787/1787 unit; 81/81 → 82/82 E2E. Lint limpio. SW v254 → v255.

| Archivo | Cambio |
|---|---|
| `index.html` | Símbolos `i-eye`/`i-eye-off` en el sprite; fila `.hero-saldo` con el botón `#saldo-ojo` (`data-action="saldo-visibilidad"`, `aria-pressed`). |
| `modules/infra/render.js` | `SALDO_MASCARA` exportada; `updSaldo()` enmascara cuando `S.config.ocultarSaldo === true` y sincroniza el botón del ojo. |
| `modules/infra/animate.js` | Nueva `stopCount(el)`: cancela el RAF del countUp activo de un elemento. |
| `modules/ui/actions.js` | Acción built-in `saldo-visibilidad`: flip defensivo + `save()` + `updSaldo()`. |
| `styles/components/domain.css` | Sección HERO-SALDO: fila monto + ojo, refuerzo `[hidden]`, icono a 1.375rem. |
| `tests/unit/render.test.js` | Nuevo archivo: 13 tests de `updSaldo` + acción `saldo-visibilidad`. |
| `tests/e2e/smoke.test.js` | Suite nueva "Ocultar/mostrar el dinero disponible (IN.2)" con seed condicional (el reload no pisa la preferencia guardada). |
| `service-worker.js` | v254 → v255. |

---

### feat(inicio): totales al pie de "Próximas prioridades" y "Pendientes del mes" (IN.1) · 2026-07-02

Los dos paneles del dashboard ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)) listaban items sin sumatoria: el usuario tenía que sumar a mano cuánto necesitaba para cubrir lo vencido o lo que viene en los próximos 7 días. Nueva función pura `sumarMontos(items)` en [compromisos/logic.js](../modules/dominio/compromisos/logic.js) (mismo criterio `monto ?? cuotaMensual` que ya usa el render de cada item individual, AUD.1), consumida por `renderPanelVencidos` ("Total de gastos vencidos") y `renderPanelPrioridades` ("Total de próximas prioridades", solo cuando hay algo que mostrar; el estado "Todo al día" no lleva total). Nuevas clases `.vencidos-card__total` / `.prioridades-card__total` en [styles/components/domain.css](../styles/components/domain.css), fila con borde superior sutil y monto en negrita, coherente con el resto de las cards del dashboard. Verificación en el navegador bloqueada por caché HTTP agresiva del entorno de preview (`fetch` con `cache:'no-store'` sí traía el código nuevo, pero la navegación normal servía JS viejo); verificado en su lugar con tests de render sobre happy-dom, que ejecutan el código de producción real sin ese problema. 6 tests nuevos (4 `sumarMontos` + 2 de render por panel). 1770/1770 → 1774/1774 unit. SW v253 → v254.

| Archivo | Cambio |
|---|---|
| `modules/dominio/compromisos/logic.js` | Nueva `sumarMontos(items)`, función pura. |
| `modules/dominio/compromisos/views/dashboard.js` | `renderPanelVencidos` y `renderPanelPrioridades` agregan el total al pie. |
| `styles/components/domain.css` | `.vencidos-card__total`, `.prioridades-card__total` + variantes `-amount`. |
| `tests/unit/compromisos.test.js` | 4 tests de `sumarMontos` + 2 de render (total presente/ausente según estado). |
| `service-worker.js` | v253 → v254. |

---

### fix(inicio): la categoría con mayor gasto ya no cuenta fijos ni deudas (IN.3) · 2026-07-02

El indicador "Categoría con más gasto" del resumen semanal de Inicio ([resumen/logic.js](../modules/dominio/resumen/logic.js), `categoriaTopSemana`) sumaba todos los `S.gastos` de la semana, incluidos los generados automáticamente por un gasto fijo o un abono a deuda (que llevan `compromisoId`, ver [ADR 002](DECISIONS/002-abono-deudas.md)). Con un arriendo de $900.000 y un mercado de $50.000, el indicador mostraba "Vivienda" cuando el hábito de consumo real del usuario era Alimentación. Fix: `categoriaTopSemana` ahora excluye los gastos con `compromisoId`, coherente con la distinción que TX.6/TX.7 ya hacen visible en la lista de Gastos (obligación vs. consumo variable). Las demás cifras del resumen (total de 7 días, comparación semanal, registros, días activos) no cambian: siguen contando todos los gastos, porque miden actividad total, no hábitos de categoría. 2 tests de regresión. 1764/1764 → 1766/1766 unit. Verificado en el navegador con datos sembrados (arriendo con `compromisoId` + mercado sin él → "🛒 Alimentación $50.000"). SW v252 → v253.

| Archivo | Cambio |
|---|---|
| `modules/dominio/resumen/logic.js` | `categoriaTopSemana` descarta gastos con `compromisoId` antes de agrupar por categoría. |
| `tests/unit/resumen.test.js` | 2 tests: excluye `compromisoId`, y devuelve `null` si toda la semana fue solo fijos/deudas. |
| `service-worker.js` | v252 → v253. |

---

### fix(ux): descubribilidad y robustez, sidebar/toasts/flush de guardado (AUD.5) · 2026-07-02

Quinto y último slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Tres ajustes independientes de descubribilidad y robustez:

1. **Sidebar con pliegue**: en alturas de ventana <= 800px (solo escritorio; la regla exige `min-width: 1024px` para no chocar con el bottom nav móvil, que ya aplana el nav a fila) el grupo Herramientas quedaba bajo el scroll interno del `.sidebar__nav` sin ningún indicio visual de que había más contenido. [styles/layout.css](../styles/layout.css) compacta el `margin-top` de `.nav-group` y el `padding-bottom` de `.nav-group__label`, y agrega un `::after` `position: sticky; bottom: 0` con gradiente hacia el color de fondo del sidebar, que insinúa el scroll sin robar espacio de layout (compensado con `margin-top` negativo).
2. **Tormenta de toasts de logros**: al desbloquearse 3 o más logros a la vez (restaurar un respaldo JSON, importar un CSV con muchas categorías nuevas) se encadenaba un toast con confetti cada 1.4s ([logros/index.js](../modules/dominio/logros/index.js)) que tapaba contenido por varios segundos. `_checkYMostrar` ahora corta a un solo toast resumen ("N logros nuevos") cuando `nuevos.length > 2`, reusando `_mostrarToast` con un segundo parámetro `label` opcional (antes fijo en "Logro desbloqueado"). Verificado con un script Playwright temporal (no comiteado, borrado tras confirmar): sembrando datos que desbloquean 6 logros de golpe, aparece exactamente 1 `.logro-toast` con el texto "Logros desbloqueados" / "6 logros nuevos".
3. **`save()` sin flush al cerrar**: el debounce de 200ms en [core/storage.js](../modules/core/storage.js) puede perder el último cambio si el usuario cierra la pestaña o el sistema mata la PWA en segundo plano en móvil antes de que el timer corra. Nueva `initFlushOnHide()` (exportada desde `storage.js`) escucha `visibilitychange` (solo cuando `document.visibilityState === 'hidden'`) y `pagehide`, y llama a `_flushNow()` únicamente si hay un guardado pendiente (`_saveTimer` activo), para no escribir a `localStorage` sin necesidad. Registrada en [ui/bootstrap.js](../modules/ui/bootstrap.js) justo después de `loadData()`, antes de cualquier interacción del usuario. El doc comment de `_flushNow` (antes "no usar en producción") se actualizó para reflejar este segundo uso legítimo.

Sin tests unitarios nuevos: los dos primeros son CSS/DOM puro sin lógica que aislar en happy-dom, y el toast de logros está explícitamente fuera del alcance de los tests unitarios por decisión ya documentada en `tests/unit/logros.test.js` ("el toast y confetti requieren DOM completo y se verifican manualmente en la app"). El flush en `visibilitychange`/`pagehide` tampoco es testeable en happy-dom (no hay pestaña real que ocultar). 1764/1764 unit + 81/81 E2E verdes (sin regresiones). SW v251 → v252.

- **`styles/layout.css`**: media query `(max-height: 800px) and (min-width: 1024px)` con espaciado compacto de `.nav-group` + fade sticky en `.sidebar__nav`.
- **`modules/dominio/logros/index.js`**: `_checkYMostrar` muestra un toast resumen si `nuevos.length > 2`; `_mostrarToast(logro, label)` acepta label opcional.
- **`modules/core/storage.js`**: nueva `initFlushOnHide()`; doc comment de `_flushNow` actualizado.
- **`modules/ui/bootstrap.js`**: registra `initFlushOnHide()` tras `loadData()`.
- **`service-worker.js`**: v251 → v252.

---

### fix(color): semántica de color del gasto neutral, no roja (AUD.4) · 2026-07-02

Cuarto slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Dos lugares pintaban el monto de gasto en rojo fijo, lo que contradice el criterio consolidado de [ADR 019](DECISIONS/019-limites-por-rol.md) (verde = logro, ámbar = advertencia, rojo = incumplimiento) y el tono neutral de [ADR 008](DECISIONS/008-mecanicas-de-habito.md) (resumen semanal como reflexión sin castigo): gastar no es incumplir.

1. **Total de "Resumen de la semana"** en Inicio y **"Pendiente"** en Préstamos ([styles/components/domain.css](../styles/components/domain.css)), ambos usando la clase compartida `.resumen-card__stat--primary`, coloreaban el monto con `--fk-danger-text`. Cambiado a `--fk-text-primary` (neutro). Ninguno de los dos casos es un incumplimiento: uno es cuánto gastaste (información), el otro es dinero que te deben (positivo para ti).
2. **Variación al alza del gasto mensual** en Análisis (`.chart-stat--negativo`, [styles/components/charts.css](../styles/components/charts.css)) usaba `--fk-danger`. Se eliminó la regla de color (el default de `.chart-stat__valor` ya es neutro) y se quitó la asignación de la clase en `_renderTendencia` ([analisis/view.js](../modules/dominio/analisis/view.js)).

Decisión sobre el punto pendiente del backlog (neutro vs ámbar para la variación al alza): **neutro**, por dos razones. Primero, consistencia: el texto de tendencia semanal en Inicio ya es neutro desde F8 ("Gastaste X% más que la semana pasada" en `--fk-text-secondary`), así que el número no debía quedar en otro tono que su propio texto. Segundo, no hay un umbral incumplido que justifique una advertencia (ámbar): es solo una comparación mes a mes, no un límite superado. Bajar el gasto sigue en verde (`chart-stat--positivo`, `resumen-card__trend--baja`): eso sí es un logro digno de refuerzo positivo.

Sin tests nuevos: cambio de color puro sin lógica nueva; ningún test existente referenciaba las clases o colores tocados (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v250 → v251.

- **`styles/components/domain.css`**: `.resumen-card__stat--primary .resumen-card__value`: `--fk-danger-text` → `--fk-text-primary`.
- **`styles/components/charts.css`**: eliminada `.chart-stat--negativo` (color danger); queda el neutro por defecto de `.chart-stat__valor`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` ya no asigna `chart-stat--negativo` cuando sube el gasto.
- **`service-worker.js`**: v250 → v251.

---

### fix(copy): voseo, tildes y términos viejos corregidos (AUD.3) · 2026-07-02

Tercer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Cinco correcciones puntuales de copy que violaban la regla ADN 11 (tuteo, español neutro, sin términos internos):

1. **[logros/logic.js](../modules/dominio/logros/logic.js)**: 4 descripciones de logros en voseo o sin tildes ("Tenes 3 o mas", "un prestamo que vos le diste", "configuracion", "esta lista"). Corregidas a tuteo con tildes correctas.
2. **"Ver agenda"** en el panel de "Próximas prioridades" de Inicio ([compromisos/views/dashboard.js](../modules/dominio/compromisos/views/dashboard.js)): quedó desactualizado desde que la sección se renombró a Calendario (AG.1, 2026-06-30). Ahora dice "Ver calendario".
3. **"el dashboard"** en los empty states de Gastos ([gastos/view.js](../modules/dominio/gastos/view.js)) y Mis cuentas ([tesoreria/view.js](../modules/dominio/tesoreria/view.js)): término interno que la app ya no usa desde el renombre a Inicio. Corregido a "Inicio".
4. **`APP_VERSION`** en [core/constants.js](../modules/core/constants.js): decía `'0.1.0'`, visible en Ajustes > Acerca de Finko, desincronizado de `package.json` (`1.0.0`). Sincronizado.
5. **"Toca una estrategia"** en el placeholder de Deudas ([compromisos/views/estrategia.js](../modules/dominio/compromisos/views/estrategia.js)): se lee raro en desktop (no hay "toque" con mouse). Cambiado a "Elige una estrategia".

Sin tests nuevos: es copy sin lógica asociada y ningún test existente referenciaba estos textos (verificado por grep antes de tocar). 1764/1764 unit + 81/81 E2E verdes (Playwright). SW v249 → v250.

- **`modules/dominio/logros/logic.js`**: 4 descripciones de logros con tuteo y tildes correctas.
- **`modules/dominio/compromisos/views/dashboard.js`**: "Ver agenda" → "Ver calendario" (+ `aria-label`).
- **`modules/dominio/gastos/view.js`**, **`modules/dominio/tesoreria/view.js`**: "el dashboard" → "Inicio" en empty states.
- **`modules/core/constants.js`**: `APP_VERSION` `'0.1.0'` → `'1.0.0'`.
- **`modules/dominio/compromisos/views/estrategia.js`**: "Toca una estrategia" → "Elige una estrategia".
- **`service-worker.js`**: v249 → v250.

---

### fix(css): 15 variables CSS fantasma mapeadas a tokens reales (AUD.2) · 2026-07-02

Segundo slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). `charts.css`, `domain.css`, `analysis.css`, `forms.css`, `config.css` y `layout.css` referenciaban 15 variables `--fk-*` nunca definidas en `tokens.css` (~52 usos): al no existir, el navegador usa el valor inicial en vez del token de diseño, lo que rompía en silencio el `accent-color` de radios/checkboxes (verde de marca → azul del navegador), los bordes de tarjetas (caían a `currentColor`, invisibles) y los fondos de gráficos (transparentes).

Mapeo aplicado siguiendo el patrón ya dominante en el resto del código:

- `--fk-primary` → `--fk-accent` (color de marca).
- `--fk-border` → `--fk-border-subtle` (convención mayoritaria para bordes de tarjeta: 35 usos reales contra 15 de `border-default`).
- `--fk-bg`, `--fk-surface`, `--fk-surface-subtle` → `--fk-bg-surface` / `--fk-bg-elevated` según la jerarquía visual del elemento (dos usos como `color:` sobre círculos de acento van a `--fk-text-on-accent`, no a un fondo).
- `--fk-text` → `--fk-text-primary`.
- `--fk-weight-bold/medium/semibold/regular` y `--fk-font-normal` → `--fk-font-bold/medium/semibold/regular`.
- `--fk-radius` → `--fk-radius-sm`; `--fk-radius-pill` → `--fk-radius-full`.
- `--fk-text-md` → `--fk-text-base`; `--fk-text-2xs` → `--fk-text-xs` (sin equivalente exacto en la escala tipográfica, xs es el valor real más cercano).

Se aprovechó para quitar los fallbacks inline (`var(--x, valor)`) que compensaban las variables fantasma: ya no hacen falta porque el token real siempre está definido. Cero cambios de lógica, HTML o comportamiento: es puramente resolución de tokens. Verificado en navegador (datos sembrados): Análisis (sparkline, dona, tarjetas de stats) y Presupuesto (estado vacío con borde punteado) muestran bordes y fondos reales. 1764/1764 unit verdes (sin tests nuevos: no hay lógica que cubrir, solo CSS). SW v248 → v249.

- **`styles/components/charts.css`**: 15 usos (sparkline, donut, stats, import CSV, tarjetas de estrategia de deuda).
- **`styles/components/domain.css`**: 11 usos (selector de cuenta radio/checkbox, tarjeta de límites, consolidado de ahorro).
- **`styles/components/analysis.css`**: 14 usos (tarjetas de grupo, envelopes, fondo de emergencia, inversión, tabla comparativa).
- **`styles/components/forms.css`**: 2 usos (badge genérico, placeholder de gasto sin completar).
- **`styles/components/config.css`**: 2 usos (título y emoji del detalle de calendario).
- **`styles/layout.css`**: 1 uso (separador de sub-header de sección).
- **`service-worker.js`**: v248 → v249.

---

### fix(dashboard/analisis): montos reales de deudas en los paneles de Inicio y variación sin base en Análisis (AUD.1) · 2026-07-02

Primer slice de la auditoría integral del 2026-07-02 (backlog AUD en [TASKS.md](TASKS.md)). Corrige los 4 bugs funcionales visibles que detectó la auditoría:

1. **"$NaN pendiente" en el nudge "deudas llevan tiempo sin actividad"** (sección Deudas): la vista leía `d.saldoPendiente`, campo que no existe; la lógica (`detectarDeudasDurmiendo`) devuelve `saldoTotal`. Ahora muestra el saldo formateado ("$5.800.000 pendiente").
2. **Deudas vencidas con "$0" en el panel "N pendientes del mes"** (Inicio): `detectarVencidosCompletos` exponía `Number(c.monto) || 0`, pero las deudas no tienen `monto` desde la migración v6 (su cuota vive en `cuotaMensual`). Ahora expone la cuota mensual para deudas y conserva `monto` para fijos.
3. **"Próximas prioridades" (Inicio) omitía la cifra de las deudas**: el render leía `c.monto`; ahora cae a `cuotaMensual` cuando no hay `monto` (fijos, préstamos personales y apartados siguen igual).
4. **Variación "↑ 0%" en rojo en la tendencia de Análisis** cuando el mes anterior cerró en $0: sin base de comparación no hay porcentaje que mostrar; ahora dice "Sin gastos el mes anterior para comparar" en tono neutro (mismo criterio que el resumen semanal de F8).

6 tests de regresión nuevos (1 de lógica + 5 de render en happy-dom). 1758/1758 → 1764/1764 unit; 81/81 E2E. Verificado en navegador real (Playwright, datos sembrados): Inicio, Deudas y Análisis muestran los montos y textos correctos. SW v247 → v248.

- **`modules/dominio/compromisos/views/alertas.js`**: `f(d.saldoTotal)` en el nudge de deudas durmiendo (antes `d.saldoPendiente`, undefined, que formateaba NaN).
- **`modules/dominio/compromisos/logic.js`**: `detectarVencidosCompletos` expone la cuota mensual como `monto` en deudas.
- **`modules/dominio/compromisos/views/dashboard.js`**: el panel de prioridades usa `c.monto ?? c.cuotaMensual`.
- **`modules/dominio/analisis/view.js`**: `_renderTendencia` maneja el caso sin base (mes anterior en $0) con aviso neutro.
- **`tests/unit/compromisos.test.js`**, **`tests/unit/analisis.test.js`**: 6 tests de regresión.
- **`service-worker.js`**: v247 → v248.

---

### feat(presupuesto): los topes por categoría se fusionan dentro de la tarjeta de Estilo de vida (MC.8b, ADR 019) · 2026-07-01

Segundo slice grande de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 2 y 4). Elimina la **redundancia de arquitectura de la información**: Estilo de vida dejaba de aparecer en dos sitios (su tarjeta en el resumen y el bloque suelto "Estilo de vida: topes por categoría" debajo, con su hero de totales). Ahora hay **un solo relato por grupo**.

Los topes por categoría (envelope budgeting sobre `S.presupuestos`) viven **dentro** de la tarjeta de Estilo de vida (`_renderDetalleEstiloVida` en `presupuesto/view.js`), con tres piezas:

- **Olla finita** (`_renderOllaFinita`): una línea que dice cuánto del presupuesto de Estilo de vida (que sale de la distribución de Mis cuentas) cubren los límites y cuánto queda sin tope, por ejemplo "Tus límites cubren $300.000 de los $900.000 de tu Estilo de vida. Te quedan $600.000 sin tope." Da la noción de presupuesto acotado sin forzar a asignar el 100% (usa `coberturaLimitesEstiloVida`, MC.8a). Maneja los bordes: sin presupuesto, sin límites, cobertura total y exceso (este último en ámbar).
- **Envelopes por categoría** con sus alertas ámbar/roja (Estilo de vida es el grupo que sí se controla), o un mensaje breve si aún no hay ninguno.
- **Botón "Agregar límite"** (topes bajo demanda) más las categorías con gasto pero sin tope (sugerencia de dónde poner uno).

`_renderGrupoCard` pasa a ser **consciente del rol** (ADR 019 decisión 1): **Necesidades = monitorear** (estado neutro `monitor`, sin barra ámbar ni roja; la tercera cifra informa el exceso como "Sobre lo previsto", nunca "Excedido" en rojo, porque son gastos esenciales que se pagan sí o sí); **Ahorro = celebrar** (verde, ya venía de MC.8); **Estilo de vida = controlar** (conserva su estado de gasto alerta/excedido). El estado sin ingreso conserva la gestión de topes (sin la olla finita, que necesita el presupuesto del grupo), para no perder la capacidad de ponerle un tope al gasto antes de registrar ingresos.

Se eliminaron `_renderHero` y `_renderEmptyState` (código muerto tras la fusión) y su CSS (`.presupuesto-hero*`, `.estilo-detalle*`, y la regla móvil asociada en `responsive.css`). **Pendiente MC.8c:** el layout (Necesidades + Ahorro en dos columnas compactas, Estilo de vida en fila completa); por ahora las tres tarjetas siguen en el grid de 3 columnas.

3 E2E nuevos (fusión de topes + botón "Agregar límite", olla finita con la cobertura exacta, Necesidades sin alarma aunque supere lo previsto). 1758/1758 unit; 42/42 → 45/45 smoke E2E. Lint limpio. SW v246 → v247.

- **`modules/dominio/presupuesto/view.js`**: topes fusionados en la tarjeta de Estilo de vida (`_renderDetalleEstiloVida`, `_renderOllaFinita`); `_renderGrupoCard` consciente del rol (Necesidades neutro); `_renderResumenGruposVacio` conserva los topes sin ingreso; `_renderHero`/`_renderEmptyState` eliminados.
- **`styles/components/analysis.css`**: `.estilo-limites*`, `.estilo-olla*`, `.estilo-limites-standalone*`; se quitó `.estilo-detalle*` y `.presupuesto-hero*`.
- **`styles/responsive.css`**: se quitó la regla móvil de `.presupuesto-hero__totales`.
- **`tests/e2e/smoke.test.js`**: 3 tests nuevos.
- **`service-worker.js`**: v246 → v247.

---

### fix(presupuesto): la tarjeta de Ahorro celebra en verde al superar la meta, nunca en rojo (MC.8, ADR 019) · 2026-07-01

Petición del usuario sobre la retroalimentación visual del Ahorro: superar la meta se pintaba de **rojo** (barra `progress-bar--danger`, borde/fondo de peligro, "Excedido" en rojo), lo que transmite error cuando en realidad es un buen hábito. Se hace `_renderGrupoCard` (`presupuesto/view.js`) consciente del rol para el grupo **Ahorro**: cumplir o superar la meta (`pct >= 100`) usa la **paleta positiva** (verde), nunca ámbar ni rojo.

- Barra `progress-bar--complete` (verde) al llegar al 100%; por debajo, el color de progreso neutro. Nunca `--warn` ni `--danger` para Ahorro.
- Estado visual nuevo `logro` (borde y fondo verdes) en vez de `excedido` (rojo).
- Tercera cifra: superar la meta es "Ahorrado de más" en verde (`is-positive`), no "Excedido" en rojo; no llegar aún es "Te falta" (neutro), en vez del "Disponible" que no aplicaba a ahorro.

Consolida la regla de color de Finko: verde = logros/ahorro/metas cumplidas, ámbar = advertencias, rojo = incumplimientos reales. Necesidades y Estilo de vida conservan su chrome actual (el reencuadre de Necesidades es MC.8b). 1 E2E nuevo (en navegador limpio, autoritativo). 1758/1758 unit; 77/77 → 78/78 E2E. Verificado en el navegador: la tarjeta de Ahorro al 150% muestra barra verde, "Ahorrado de más $300.000" en verde y borde verde. Lint limpio. SW v245 → v246.

- **`modules/dominio/presupuesto/view.js`**: `_renderGrupoCard` con paleta positiva por rol para Ahorro (estado `logro`, barra verde, cifra `is-positive`).
- **`styles/components/analysis.css`**: `.grupo-card[data-estado="logro"]` (verde) + `.grupo-card__fig dd.is-positive`.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo (Ahorro superado se ve en verde, nunca en rojo).
- **`service-worker.js`**: v245 → v246.

---

### feat(presupuesto): mensajes de Límites por rol, Necesidades informativo y Ahorro más cálido (MC.8a, ADR 019) · 2026-07-01

Primer slice de la épica MC.8 ([ADR 019](DECISIONS/019-limites-por-rol.md), decisiones 1, 3 y 2). Reencuadra `generarMensajesLimites` (`presupuesto/logic.js`) para que cada grupo hable según su **rol**, no con una plantilla común:

- **Necesidades = monitorear.** Deja de emitir una alerta con lenguaje de "límite". Cuando el gasto en necesidades supera lo que la distribución les asignó, genera un mensaje **informativo** (`tipo: 'info'`, nuevo): "Tus necesidades están consumiendo una parte importante de tu ingreso este mes. Considera revisar tu plan general o dónde puedes reducir otros gastos." Estar cerca del presupuesto (estado 'alerta') ya no genera nada: es normal.
- **Ahorro = celebrar.** El refuerzo distingue cumplir de superar: si aportaste justo lo planeado, "Vas por buen camino. Cumpliste con el ahorro que planeaste este mes"; si aportaste de más (`ejecutado > asignado`), un mensaje más cálido: "¡Excelente! Este mes estás ahorrando más de lo planeado. Cada peso que ahorras hoy es tranquilidad mañana."
- **Estilo de vida = controlar.** Sin cambios: sigue siendo el único grupo con alertas preventivas por categoría y por grupo.

Nueva función pura **`coberturaLimitesEstiloVida(presupuestos, presupuestoEstiloVida)`** (la "olla finita"): devuelve `{limites, presupuesto, sinTope, excede}`, cuánto del presupuesto de Estilo de vida cubren los topes y cuánto queda sin tope, para dar noción de presupuesto acotado sin forzar el 100%. Reusa `totalAsignadoMensual`. La usará MC.8b en la vista.

Como `generarMensajesLimites` ya está en uso, se ajustó el render de nudges (`presupuesto/view.js`): `_nivelNudge` resuelve el nivel visual y se agregó el nivel `info` → `nudge-info` (azul calmado), además de los existentes. **Nota:** el chrome de las tarjetas (barra roja, etiqueta "Excedido") todavía sigue el modelo simétrico de MC.5b; su reencuadre por rol es MC.8b. Este slice solo cambia los mensajes.

6 unit netos + 1 E2E nuevo. 1752/1752 → 1758/1758 unit; 76/76 → 77/77 E2E. Verificado en el navegador: la tarjeta de Necesidades excedidas muestra un nudge azul informativo (sin "límite") y la de Ahorro que supera lo planeado, el refuerzo cálido en verde. Lint limpio. SW v244 → v245.

- **`modules/dominio/presupuesto/logic.js`**: `generarMensajesLimites` reencuadrada por rol; `coberturaLimitesEstiloVida` nueva.
- **`modules/dominio/presupuesto/view.js`**: `_nivelNudge` + soporte del nivel `nudge-info`.
- **`tests/unit/presupuesto.test.js`**: tests de Necesidades/Ahorro actualizados + 6 de `coberturaLimitesEstiloVida`.
- **`tests/e2e/smoke.test.js`**: E2E de refuerzo de Ahorro actualizado (cumplir) + nuevo (superar).
- **`service-worker.js`**: v244 → v245.

---

### docs(adr): ADR 019, Límites de gasto con tratamiento asimétrico por rol (MC.8, diseño) · 2026-07-01

Diseño de la épica **MC.8**, que **revisa las decisiones 1, 4 y 5 del [ADR 017](DECISIONS/017-limites-centro-de-control.md)** sin revertir su núcleo (presupuesto por grupo desde la distribución, sin schema). Nace de una observación del usuario: tratar los tres grupos de Límites con la misma tarjeta y los mismos umbrales es sutilmente incorrecto, porque no tienen la misma naturaleza. La sección pasa a un **tratamiento asimétrico por rol**:

1. **Necesidades = monitorear.** Gastos esenciales que se pagan sí o sí; no se limitan. El copy se reencuadra: informa cuánto del ingreso consumen ("usan el X%") y, si suben, sugiere revisar el plan general, nunca "te estás pasando". Se elimina la palabra "límite" de su copy.
2. **Ahorro = celebrar.** Ahorrar más de lo planeado es una victoria, no una desviación. Refuerzo cálido y variado al cumplir o superar la meta (ya existía desde MC.5d; se enriquece), nunca alerta.
3. **Estilo de vida = controlar.** Único grupo con topes por categoría y alertas preventivas. Los topes se **fusionan dentro de su tarjeta** (desaparece el bloque suelto "Estilo de vida: topes por categoría"), con el modelo de "agregar límite bajo demanda" (ya existente) más una línea de conciencia de "olla finita" (cuánto del presupuesto de Estilo de vida cubren los límites actuales). Se rechaza la alternativa de porcentajes que sumen 100% por la misma rigidez que MC.6b ya descartó.

Layout: en desktop, Necesidades y Ahorro en dos columnas compactas y Estilo de vida en fila completa (el peso visual comunica dónde está la acción); en móvil se apilan. Decisión pragmática: todas las categorías de gasto siguen siendo limitables en v1 (reclasificarlas por grupo tocaría `ejecutadoPorGrupoDelMes` y se difiere a un ADR futuro). Sin schema nuevo. Implementación en 4 slices (MC.8a a MC.8d). Pausa temporalmente MC.7 (íbamos por MC.7d), que se retoma después. Solo docs.

- **`docs/DECISIONS/019-limites-por-rol.md`**: nuevo ADR (contexto, 6 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.8 diseño cerrado + slices MC.8a a MC.8d; MC.7 marcado en pausa.

---

### feat(tesoreria): desglose itemizado de Necesidades en "Distribuir mi ingreso" (MC.7c, ADR 018) · 2026-07-01

Tercer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 2), el Paso 1 del asistente. Nueva función pura **`construirDesgloseNecesidades(compromisos)`** en `tesoreria/logic.js`: una fila por gasto fijo y por deuda activos (nombre, categoría, monto mensual equivalente), ordenadas de mayor a menor. Es una vista de **solo lectura**: no mueve dinero, no crea schema; cada obligación se sigue pagando al vencer, exactamente como hoy.

El monto de cada fila usa la misma normalización mensual que ya usa el modelo de distribución (fijo = `monto * factor de frecuencia`, igual que `calcularGastosFijosMensuales`; deuda = `cuotaMensual`, ya mensual), para que el desglose sea coherente con el "Necesidades" agregado que el panel ya mostraba. Los compromisos de baja periodicidad (Anual, Bimestral, etc.) se excluyen, igual que en el agregado.

En la vista, el desglose aparece como un `<details>` colapsable ("Ver detalle (N)") bajo la fila "📦 Necesidades" existente, reusando el patrón visual `.analisis-grupo` (ya usado en Análisis y Límites de gasto) con clases propias (`.distribuir__nec-*`) para no acoplar Mis cuentas al markup de Límites. Cada fila muestra un emoji por categoría (reusa `CATEGORIA_AGENDA_EMOJI`/`CATEGORIA_DEUDA_EMOJI` de `constants.js`), con fallback genérico por tipo.

11 unit + 1 E2E nuevos. 1741/1741 → 1752/1752 unit; 75/75 → 76/76 E2E. Verificado en el navegador: con Arriendo ($800.000), Tarjeta ($250.000) e Internet ($100.000), el detalle los lista en ese orden con sus emojis de categoría. Lint limpio. SW v243 → v244.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseNecesidades()` nueva.
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` computa el desglose; `_renderDesgloseNecesidades()` y `_emojiNecesidad()` nuevas; se inserta en `_renderPanelDistribuir`.
- **`styles/components/forms.css`**: `.distribuir__nec-desglose` + `.distribuir__nec-item*`.
- **`tests/unit/tesoreria.test.js`**: 11 tests nuevos.
- **`tests/e2e/smoke.test.js`**: 1 test nuevo.
- **`service-worker.js`**: v243 → v244.

---

### feat(tesoreria): aporte de ahorro por objetivo en "Distribuir mi ingreso" (MC.7b, ADR 018) · 2026-07-01

Segundo slice de la épica MC.7. El panel "Distribuir mi ingreso" ya no arranca con "todo al fondo": cada meta y apartado activo aparece con su **aporte sugerido** (`construirDesgloseAhorroPorObjetivo`, MC.7a), y el fondo de emergencia recibe el **excedente** que queda tras esos aportes. Los objetivos sin fecha muestran $0 y un hint bajo su fila: "Ponle una fecha en Metas/Apartados para calcular cuánto aportar", con enlace a la sección correspondiente. Todo sigue siendo editable, como antes.

`construirPlanAhorro` quedó sin llamadores tras el cambio (era solo el default "todo al fondo") y se **eliminó** junto con sus 5 tests, en vez de dejarla como código muerto. `construirDesgloseAhorroPorObjetivo` (MC.7a) suma el campo `sinFecha` por fila para que la vista sepa cuándo mostrar el hint, sin que `view.js` tenga que re-derivar esa lógica leyendo fechas directamente.

3 unit + 2 E2E nuevos (netos: se sumaron 8 y se quitaron 5 de `construirPlanAhorro`). 1743/1743 → 1741/1741 unit (neto); 73/73 → 75/75 E2E. Verificado en el navegador: con una meta a 6 meses y $1.200.000 de faltante, sugiere $200.000; el fondo (presupuesto $600.000) recibe $400.000 de excedente; una meta sin fecha muestra $0 con el hint. Lint limpio. SW v242 → v243.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` ahora expone `sinFecha` por fila; `construirPlanAhorro()` eliminada (sin llamadores).
- **`modules/dominio/tesoreria/view.js`**: `renderDistribucionIngreso` usa `construirDesgloseAhorroPorObjetivo` directamente sobre `S.metas`/`S.apartados`; `_filaDistribuir` agrega el hint de "sin fecha" con enlace a Metas/Apartados.
- **`styles/components/forms.css`**: `.distribuir-ingreso__destinos .distribuir__hint` (sin margin-top propio, ya lo da el `gap` del contenedor).
- **`tests/unit/tesoreria.test.js`**: 3 tests nuevos de `sinFecha`; se eliminó el describe de `construirPlanAhorro` (5 tests).
- **`tests/e2e/smoke.test.js`**: 2 tests nuevos (aporte sugerido + excedente del fondo; hint de meta sin fecha).
- **`service-worker.js`**: v242 → v243.

---

### feat(tesoreria): desglose de aportes de ahorro por objetivo (MC.7a, ADR 018) · 2026-07-01

Primer slice de la épica MC.7 ([ADR 018](DECISIONS/018-asistente-distribuir-ingreso.md), decisión 3). Nueva función pura **`construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro, hoy })`** en `tesoreria/logic.js`: a diferencia de `construirPlanAhorro` (que hoy sugiere todo el presupuesto al fondo), reparte un aporte sugerido **por cada meta y apartado activo** (faltante entre meses restantes, igual fórmula que `calcularAporteMensualObjetivos`), y el **fondo de emergencia recibe el excedente** que quede tras esos aportes (nunca negativo; 0 si ya está completo). Los objetivos sin fecha sugieren 0 en vez de adivinar (decisión del usuario).

Para no duplicar la fórmula, se extrajo el helper privado `_aporteMensualObjetivo(montoObjetivo, montoActual, fecha, tsHoy)` y `calcularAporteMensualObjetivos` se refactorizó para consumirlo (extracción sin cambio de comportamiento, verificada por sus 8 tests existentes que siguen en verde). Esta función aún **no está integrada** en el panel "Distribuir mi ingreso" (eso es MC.7b); es solo la lógica de agregación, pura y testeada en aislamiento.

15 tests nuevos. 1728/1728 → 1743/1743 unit. Lint limpio. SW v241 → v242.

- **`modules/dominio/tesoreria/logic.js`**: `construirDesgloseAhorroPorObjetivo()` nueva; `_aporteMensualObjetivo()` helper privado extraído; `calcularAporteMensualObjetivos()` refactorizada para reusarlo.
- **`tests/unit/tesoreria.test.js`**: 15 tests nuevos.
- **`service-worker.js`**: v241 → v242.

---

### docs(adr): ADR 018, "Distribuir mi ingreso" como asistente guiado de 3 pasos (MC.7, diseño) · 2026-07-01

Diseño de la épica MC.7. El panel "Distribuir mi ingreso" ([ADR 012](DECISIONS/012-auto-distribucion-ingresos.md), MC.4a-e) evoluciona a un **asistente guiado** que hace el trabajo pesado y deja al usuario solo revisar, ajustar y confirmar. Tres pasos:

1. **Necesidades** itemizada como **preview read-only** (gastos fijos de Agenda + cuotas de deuda + compromisos del periodo, con nombre/categoría/valor). El dinero no se mueve: queda en la cuenta y se paga cada obligación al vencer, como hoy. Sin schema.
2. **Ahorro** con aportes **auto-calculados por objetivo**: para metas/apartados con fecha, `faltante / periodos restantes` (reusa la fórmula de `calcularAporteMensualObjetivos`, pero devolviendo el desglose por objetivo, no solo el total); para los que no tienen fecha, sugiere 0 + hint "ponle una fecha"; el fondo de emergencia recibe el excedente si está incompleto. Todo editable.
3. **Estilo de vida** repartido entre las cuentas activas; **omitido con cuenta única** (regla de cuenta única del proyecto).

Decisiones cerradas con el usuario: (a) Paso 1 = preview, no reservar/apartar (evita schema y no toca el ADN); (b) objetivos sin fecha en el Paso 2 = sugerir 0 con invitación a poner fecha (no adivinar); (c) la implementación arranca por el **Paso 2** (auto-cálculo de Ahorro), el valor "inteligente" más tangible. Confirmación única al final; reusa el apply-plan/undo, el gating por fecha de cobro y los abonos avalancha de MC.4. Sin schema nuevo en v1. Implementación en 6 slices (MC.7a a MC.7f). Solo docs.

- **`docs/DECISIONS/018-asistente-distribuir-ingreso.md`**: nuevo ADR (contexto, 7 decisiones, alternativas, consecuencias, slices).
- **`docs/TASKS.md`**: MC.7 diseño cerrado + slices MC.7a a MC.7f.

---

## Meses anteriores

- [2026-06](changelog/2026-06.md)
- [2026-05](changelog/2026-05.md)

---

## Convención de entradas

Cada entrada agrupa por fase/release y dentro lista commits con:
- **tipo(área)** - `commit_hash` · `archivos tocados` - descripción de qué cambió.

Tipos: `feat` (nueva funcionalidad), `fix` (bug), `refactor` (sin cambio funcional), `test`, `docs`, `chore` (config/build), `style` (formato).
