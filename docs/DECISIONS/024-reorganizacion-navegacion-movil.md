# ADR 024 - Reorganización de la navegación móvil: botón "Registrar" central y hub "Ahorros"

**Estado:** Aprobada (diseño). Implementación en NAV.A1, NAV.A2, NAV.B y NAV.C (ver [BOARD.md](../BOARD.md)).
**Fecha:** 2026-07-04
**Autores:** Esteban (producto), Claude Fable 5 (auditoría y diseño)
**Relación:** revisa **a nivel de navegación** la decisión de la revisión UX 2026-06 ("las 4 secciones de ahorro no se fusionan; la diferenciación es por copy"): los dominios siguen separados (regla ADN 10 intacta), lo que se unifica es la entrada. Se apoya en [ADR 009](009-consolidado-de-ahorro.md) (el consolidado pasa a ser la cabecera del hub), [ADR 016](016-banner-proposito-de-seccion.md) (los banners de propósito no cambian) y [ADR 018](018-asistente-distribuir-ingreso.md) (el ingreso puntual ofrece el asistente al cerrar). Registra [BUG-010](../BUGS.md) (safe area del bottom nav).

---

## Contexto

Auditoría de navegación móvil realizada el 2026-07-04: recorrido de la app como usuario de primera vez (localStorage limpio, viewport 390x844 con Playwright) más lectura del código de navegación (`index.html`, `styles/responsive.css`, `modules/ui/menu-mas.js`).

**Test de orientación (8 preguntas de usuario nuevo):** 3 evidentes (registrar gasto, ver disponible, próximos pagos), 3 a medias (pagar deuda, metas, límites: viven detrás de "Más") y 2 fallidas:

1. **"¿Dónde agrego un ingreso?" no tiene respuesta.** La única acción de ingreso es `nuevo-ingreso` (fuente fija) en Mis cuentas, detrás de "Más" y bajo el fold. Un ingreso puntual (trabajo independiente, venta, regalo) no se puede registrar: la única vía es editar el saldo de la cuenta. El modelo mental universal es "entró dinero / salió dinero" y la app expone "salió" dos veces en primer nivel (Gastos + Gasto rápido) e "entró" en ninguno.
2. **"¿Dónde están mis ahorros?" tiene cuatro respuestas.** Ahorro, Metas, Apartados e Inversión compiten sin jerarquía; los nombres solo se distinguen entrando a las cuatro secciones.

Hallazgos estructurales adicionales: 10 de 13 secciones viven detrás del modal "Más" (un menú hamburguesa inferior de 10 tarjetas); los CTA de alta ("+ Nuevo gasto") viven arriba a la derecha, la peor zona del pulgar, justo cuando la sección deja de estar vacía; la frontera Gastos/Calendario/Deudas necesita un tip dentro de la app para explicarse; y la barra inferior no compensa `env(safe-area-inset-bottom)` (BUG-010).

Referentes analizados (principios, no copia): Nequi/Daviplata/Nubank (máximo 5 destinos, la acción de dinero al centro), YNAB (la transacción es el botón central del nav), Monzo/Revolut (un solo concepto mental para el dinero apartado: Pots/Spaces), Things/Todoist (captura universal desde cualquier pantalla).

---

## Decisión

### D1. Bottom nav de 5 posiciones con botón central "Registrar"

`Inicio · Gastos · [+] · Calendario · Más`

El "+" es un **botón de acción, no una ruta**: visualmente distinto (círculo relleno en acento, patrón estándar de fintech), `aria-label="Registrar un movimiento"`, `aria-haspopup="dialog"`. Abre la hoja de D2 desde cualquier pantalla. Los cuatro destinos actuales conservan su lugar: la acción más frecuente de la app (registrar) pasa a vivir en la mejor zona del pulgar, siempre, sin depender de en qué sección estés ni de si la sección está vacía.

### D2. Hoja "Registrar" con divulgación progresiva

La hoja muestra acciones de registro, no secciones:

| Acción | Cuándo aparece | Qué abre |
|---|---|---|
| **Gasto** | siempre | el modal completo de nuevo gasto (el "Gasto rápido" de Inicio se conserva como atajo propio) |
| **Ingreso** | siempre | el flujo nuevo de D3 |
| **Abono a deuda** | solo si hay deudas activas | el flujo de abono existente de Deudas |
| **Aporte a ahorro** | solo si hay fondo activo, meta o apartado | el flujo de aporte del destino elegido |

Racional: un usuario nuevo ve exactamente dos opciones grandes (entró / salió), que es su modelo mental. Las otras dos aparecen cuando existen datos que las justifican, igual que la divulgación progresiva de ADR 016. La hoja usa el sistema de modales existente (`abrirModal`, trapFocus) y `data-action` delegado; cero dominio importa a otro.

Consecuencia clave: **"pagar una deuda" deja de exigir encontrar la sección Deudas.** La acción queda a 2 toques desde cualquier pantalla aunque la sección siga en "Más".

### D3. Ingreso puntual (capacidad nueva del dominio `tesoreria`)

Flujo "Registrar ingreso": monto + cuenta destino (patrón 0/1/varias de `cuenta-helper`; con 0 cuentas, guard como en Gastos; con 1, no se pregunta) + fuente opcional. Aumenta el saldo de la cuenta y **queda en un histórico** visible en Mis cuentas.

> **Revisado en NAV.A1 (2026-07-04).** Al implementar se cerraron tres puntos que este ADR había dejado abiertos, uno de ellos corrigiendo una premisa equivocada de la redacción original:
>
> 1. **Alcance de visibilidad (decisión del usuario).** La redacción original decía "insumo para Análisis y el resumen semanal", sin saber que la v8.8 quitó a propósito el rastreo de ingresos como flujo (`analisis/logic.js`: "la app no rastrea ingresos"). El usuario eligió el punto medio: el ingreso puntual **sube el saldo** (y con eso ya se refleja en el hero "Tu dinero disponible" y en el patrimonio neto de Análisis, que es saldos − deudas) y **queda en un historial dentro de Mis cuentas**, pero **Análisis y el resumen semanal no cambian**. Se respeta la v8.8: el ingreso se refleja por su efecto (patrimonio), no como un flujo nuevo.
> 2. **Modelo de datos.** Colección nueva `S.ingresosPuntuales` (migración v21→v22 idempotente), no reutilizar `S.ingresos`. Razón: `S.ingresos` son plantillas recurrentes (sin fecha ni cuenta) que alimentan la proyección mensual, el nudge de próximo cobro y el asistente de distribución; un evento puntual es una transacción con fecha y cuenta destino. Mezclarlos obligaría a filtrar por tipo en cada consumidor. El slice nuevo deja intactos a todos los consumidores actuales.
> 3. **Efecto sobre el saldo, espejo de Gastos.** Registrar acredita la cuenta destino; eliminar revierte. Es exactamente el patrón de un gasto (que descuenta al registrar y devuelve al borrar), así el ledger y el saldo nunca divergen.
>
> **Diferido a NAV.A2:** el ofrecimiento del asistente de distribución al confirmar. Motivo concreto: `_confirmarDistribucion` **re-acredita** la cuenta (`saldo + monto`), porque asume que el cobro recurrente aún no entró; como el ingreso puntual ya acreditó la cuenta al registrarse, abrir el asistente con ese monto causaría un **doble abono**. Unificar ambos flujos (un modo "ya acreditado" del asistente) es propio de la hoja "Registrar" de NAV.A2, no de A1.

### D4. Hub "Ahorros": una entrada, cuatro pestañas

- En el modal "Más", **una sola tarjeta "Ahorros"** reemplaza a las cuatro (Ahorro, Metas, Apartados, Inversión).
- Las cuatro secciones existentes reciben una **franja de pestañas compartida** en su cabecera: `Fondo · Metas · Apartados · Inversión`. Son enlaces entre las secciones actuales presentados como tabs: **cero cambios de router**, los hashes y deep links existentes (`#ahorro`, `#metas`, `#apartados`, `#inversion`) siguen funcionando.
- El **consolidado de ahorro** (ADR 009, hoy solo en Ahorro) pasa a ser la cabecera común del hub: la respuesta visible a "¿dónde están mis ahorros?".
- La sección "Ahorro" pasa a llamarse **"Fondo de emergencia"** (tab: "Fondo"): el nombre paraguas "Ahorros" se lo lleva el hub y desaparece la colisión Ahorro/Ahorros.

Los cuatro dominios no se tocan: es composición en la capa shell. La decisión 2026-06 (diferenciación por copy dentro de cada sección) se conserva íntegra.

### D5. Modal "Más" sin grupos

Con el hub, "Más" baja de 10 tarjetas en 3 grupos a **7 tarjetas en una sola cuadrícula** ordenada por frecuencia de uso esperada: Deudas, Mis cuentas, Ahorros, Límites de gasto, Me deben, Análisis, Ajustes. Desaparecen los rótulos "Gestión" (no predice su contenido) y "Herramientas" (grupo de 1), y las filas huérfanas de la cuadrícula de 3 columnas.

### D6. Sidebar desktop y pulidos

- Sidebar desktop: el grupo "Crecer" pasa a llamarse "Ahorros" (mantiene sus 4 entradas directas: en desktop hay espacio y el acceso directo es mejor); "Herramientas" se disuelve y Análisis se integra al grupo de gestión, cuyo nombre se revisa en NAV.C.
- **BUG-010:** la barra inferior compensa `env(safe-area-inset-bottom)` (se corrige dentro de NAV.A2 porque toca el mismo bloque CSS).
- El toast de logro del primer uso ("Primer paso") se retrasa para no pisar los tips y el modal "Más" en el primer minuto.
- Banners de propósito que exceden el objetivo de ADR 016 (40 a 60 palabras) se revisan manteniendo los tres tiempos.

---

## Alternativas consideradas

- **Reescritura total de la arquitectura de información** (5 tabs nuevas con fusión real de secciones tipo "Hoy / Movimientos / Plan"). Descartada: rompe dominios y ADRs previos, costo alto, y D1+D4 capturan la mayor parte del beneficio con una fracción del riesgo.
- **FAB flotante en la esquina** en vez de slot central. Descartada: tapa contenido en listas, peor alcance con el pulgar que el centro de la barra, y el patrón dominante en finanzas es el botón central integrado.
- **Meter Deudas al bottom nav** (5 destinos, sin botón central). Descartada: prioriza una sección sobre la acción; la mayoría de los viajes a Deudas son para abonar, y eso lo resuelve el "+" sin gastar el slot.
- **Hub como sección nueva con sub-router** (`#ahorros/fondo`). Descartada: la franja de pestañas entre secciones existentes logra la misma percepción de unidad sin tocar el router ni romper deep links.
- **Ingreso puntual como "editar saldo de la cuenta"** (statu quo documentado). Descartada: es contabilidad manual, no registro; no alimenta Análisis ni el resumen, y no responde la pregunta del usuario nuevo.

---

## Consecuencias

### Positivas

- Las 8 preguntas del test de orientación quedan con respuesta de primer nivel o a 2 toques universales.
- Registrar (gasto, ingreso, abono, aporte) queda siempre en la zona del pulgar: se corrige la asimetría entró/salió y el CTA en la esquina superior deja de ser el único camino.
- "¿Dónde están mis ahorros?" pasa a tener una sola respuesta sin fusionar dominios ni revertir la decisión 2026-06.
- "Más" deja de ser una segunda navegación completa: 7 tarjetas planas.
- Base lista para las iniciativas siguientes: el onboarding contextual enseña la hoja "Registrar" en el primer uso; el catálogo de categorías y los logos de entidades viven dentro de sus flujos.

### Negativas / Restricciones

- La barra pasa de 4 a 5 posiciones: menos ancho por item en pantallas < 360px (los labels ya truncan con ellipsis; verificar en E2E de reflow 320px).
- La hoja "Registrar" es un nivel intermedio nuevo para el gasto (antes: tab Gastos + botón; ahora también: + y elegir "Gasto"). Se mitiga conservando el tab Gastos y el Gasto rápido de Inicio tal cual.
- El ingreso puntual toca lógica de dinero (saldos, histórico, distribución): exige tests de unidad exhaustivos antes de exponerlo en la hoja (por eso NAV.A1 va primero y separado).
- Los 128 E2E de navegación y a11y deben actualizarse junto con NAV.A2 y NAV.B.

---

## Slices de implementación (smallest-first)

| Slice | Qué | Depende de | Modelo sugerido |
|---|---|---|---|
| **NAV.A1** ✅ | Ingreso puntual en `tesoreria` (logic + view + tests). Cerrado 2026-07-04: colección `S.ingresosPuntuales` (v22), sube/revierte saldo como espejo de Gastos, historial en Mis cuentas, sin tocar Análisis/resumen (v8.8). La oferta de distribución quedó diferida (ver D3, doble abono). | nada | Opus 4.8 - Alto |
| **NAV.A2a** ✅ | Bottom nav de 5 (`Inicio · Gastos · [+] · Calendario · Más`) + hoja "Registrar" con las dos acciones globales autocontenidas (Gasto, Ingreso) + fix BUG-010 (safe area) + E2E. Cerrado 2026-07-04. | NAV.A1 | Opus 4.8 - Extra |
| **NAV.A2b s1** ✅ | Tejas **Abono a deuda** y **Aporte a ahorro** en la hoja "Registrar", con selector de destino (patrón 0/1/varias) reusando `registrar-abrir` + `data-id`. Cerrado 2026-07-04. | NAV.A2a, NAV.B | Opus 4.8 - Alto |
| **NAV.A2b s2** | **Oferta de distribución** tras un ingreso (requiere el modo "ya acreditado" del asistente, ver D3). Aislada por ser la pieza de lógica de dinero. | NAV.A1, NAV.A2b s1 | Opus 4.8 - Alto |
| **NAV.B** ✅ | Hub "Ahorros": tarjeta única en Más (7 planas), franja de pestañas, consolidado como cabecera común, renombre "Ahorro" a "Fondo de emergencia", sidebar desktop. Cerrado 2026-07-04. | NAV.A2a | Sonnet 5 - Alto |
| **NAV.C** | Pulidos: toast de logro retrasado (hoy pisa la hoja y los tips en el primer minuto), nombre del grupo de gestión en desktop, banners largos revisados. | NAV.A2a y NAV.B | Sonnet 5 - Medio |

Cada slice se verifica en la app (desktop + móvil) con tests verdes antes de commit, según el workflow de [`/CLAUDE.md`](../../CLAUDE.md).

> **Nota de implementación (NAV.A2a, 2026-07-04).** La hoja "Registrar" abre a través de la acción built-in `registrar-abrir` de `actions.js` (paralela a `ir-a-seccion`): cierra la hoja e invoca por nombre la acción destino ya registrada, sin anidar modales ni acoplar dominios (no hizo falta el módulo `ui/registrar.js` que este ADR anticipaba). Al implementar se confirmó que "Abono a deuda" y "Aporte a ahorro" no son acciones globales autocontenidas (necesitan elegir el destino primero), por eso se separaron a NAV.A2b; la hoja queda con dos tejas y lista para crecer.

> **Nota de implementación (NAV.A2b slice 1, 2026-07-04).** Las tejas Abono/Aporte y su selector de destino viven en un módulo nuevo `ui/registrar.js` que lee `S` directamente (permitido para el shell, igual que el consolidado) y **no importa ningún dominio**: reusa la acción built-in `registrar-abrir` incrustando el `data-id` del destino, así cada flujo de dinero existente corre sin cambios y acredita/descuenta su cuenta como siempre (cero lógica de dinero nueva en el slice). El "+" pasó de `modal-open` a `registrar-abrir-hoja`, que reconstruye las tejas dinámicas desde `S` al abrir (0 destinos → sin teja, 1 → directo, 2+ → selector "¿a cuál?" en la misma hoja). Inversión se excluyó de Aporte (no tiene aporte incremental, solo "nueva inversión"). La oferta de distribución se separó a un slice 2 por ser la única pieza que toca la lógica de acreditación del asistente.

> **Nota de implementación (NAV.B, 2026-07-04).** La franja de pestañas es HTML estático: cada una de las 4 secciones lleva su copia con la tab actual marcada `aria-current="page"`, sin JS nuevo (no son tabs ARIA porque navegan entre páginas, no alternan paneles). El consolidado se generalizó en el dominio `ahorro` (dueño según ADR 009): `renderResumenAhorroConsolidado()` llena todos los slots `[data-hub-consolidado]` del shell y omite el enlace "Ver" del vehículo de la sección donde vive cada slot; `ahorro/index.js` lo dibuja al navegar a cualquier hash del hub. Los dominios Metas/Apartados/Inversión no se tocaron (solo copy que nombraba a la sección "Ahorro"). De paso se corrigió que `MAS_SECTIONS` no incluía `apartados` ni `inversion` (el botón "Más" no se resaltaba ahí).
