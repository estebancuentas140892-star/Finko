# ADR 036 - Deudas v2 (rediseño visual de la sección Deudas)

**Estado:** Aceptado (2026-07-12). Esteban envió el handoff de Claude Design con la instrucción explícita de implementarlo; las 4 preguntas que el doc de diseño dejaba abiertas se resuelven con su opción recomendada y quedan anotadas abajo (ninguna bloquea).
**Fecha:** 2026-07-12
**Autores:** Esteban (visión de producto, envío del handoff), Claude Design (mockup `Deudas v2.dc.html` + doc `SCREENS/deudas-v2.md` del bundle "Iteración de specimen"), Claude Code (triaje e implementación).
**Relación:** materializa la cara VISUAL de la iniciativa "Deudas v2: de registro a asesor" del BOARD (D.15d motor de palanca y el copy de D.15a siguen siendo sus piezas funcionales); **consume el [ADR 033](033-direccion-visual-premium.md)** (degradado de identidad + sombra en reposo) y extiende su estreno parcial a un tercer consumidor (Inicio, Mis cuentas, ahora Deudas); hereda del [ADR 034](034-inicio-v2.md)/[ADR 035](035-mis-cuentas-v2.md) la disciplina del ojo de privacidad con posición estable y la familia visual del hero; respeta [ADR 002](002-abono-deudas.md) (abonar), [ADR 006](006-recomendacion-deudas-por-simulacion.md) (honestidad del motor de simulación), [ADR 015](015-categorias-de-deuda-dos-dimensiones.md) (categorías), [ADR 031](031-identidad-de-color-por-seccion.md) (deudas = frambuesa `--fk-dom-compromisos`, personal = `--fk-dom-personales`) y [ADR 026](026-biblioteca-de-recursos-graficos.md) (assets/svg/ como fuente de verdad de diseño).

---

## Contexto

`#sec-compromisos` ("Deudas") apila hoy: la card de estrategia (picker Avalancha/Bola de nieve texto-pesado, impacto y comparativa con emojis 💰🏆ℹ️🎯 en línea) y la lista de deudas como `.list-item` (metadatos apilados en hints, aviso de tasa desconocida como línea de texto con ⚠️, saldo sin protagonismo). No existe un total de deuda en la pantalla: el usuario no ve la magnitud del problema de un vistazo. El handoff de Claude Design (2026-07-12) propone el rediseño visual completo, alineado con la familia de Inicio v2 y Mis cuentas v2.

## Triaje (regla 2.7)

- **Se integra** a la iniciativa "Deudas v2" del BOARD como su bloque visual (misma relación que MC.18 tuvo con "Mis Cuentas v2").
- **Absorbe D.15c** (tarjeta de deuda con jerarquía visual): el mockup ES esa tarjeta, resuelta (badge de orden + chips + saldo prominente).
- **Absorbe la mitad visual de D.15a** (alerta de 2 capas: rojo solo en el encabezado, panel interior en neutros). D.15a queda re-cortada a solo copy (simulaciones + refuerzo en Abonar).
- **No pisa D.15d** (motor de recomendación de palanca): el mockup respeta la arquitectura actual (alternativas solo en plan inviable); D.15d las sacará a primer plano construyendo sobre los componentes nuevos. Sigue siendo la siguiente rebanada funcional.
- **No revierte ningún ADR**: cero cambios de lógica; `recomendarEstrategia`, `compararEstrategias`, `filtrarDeudasPagables` y las simulaciones se consumen tal cual. La regla de BUG-011 (el estado UI simulado nunca decide estructura) se conserva intacta.

## Decisión

Orden vertical nuevo (mobile): header + hero total de deuda + card de estrategia + lista de deudas.

### D1. Total de deuda como hero (nuevo)

Hero al tope: label "Lo que debes en total" + total de saldo protagonista (tabular, extrabold) + chip "$X/mes · en N deudas" + ojo de privacidad. Superficie: degradado de identidad compromisos (`color-mix` de `--fk-dom-compromisos` al 16% sobre `--fk-bg-surface`, 2 paradas), borde compromisos al 30%, sombra en reposo. La cifra protagonista es el **saldo total** (suma de `saldoTotal` de deudas activas); la cuota mensual va como chip (recomendación del doc de diseño). Sin deudas: label "No tienes deudas registradas" + "$0", sin ojo ni chip (un control que no enmascara nada confunde, disciplina ADR 034/035).

### D2. Estrategia como card protagonista, rediseñada

Header de la card pasa a "¿Cómo salir más rápido?" con teja de ícono tintada de compromisos. Picker de 2 cards con ícono grande (montaña / bola de nieve) + badge "Recomendada" con estrella. El detalle conserva las filas de métrica existentes (label + valor semántico) con la comparativa Avalancha vs Bola como **callout tintado** (verde = ahorro, azul = impulso) con ícono de sprite en vez de emoji en línea. El picker sigue reordenando la lista en vivo. Cero lógica nueva.

### D3. Acelerador de pago extra como sub-card

"¿Puedes pagar más rápido?" se re-estiliza como sub-card plegable con ícono verde y el impacto del extra como callout tintado de éxito. `renderResumenExtra` conserva su lógica.

### D4. Plan inviable: alerta de 2 capas

Botón de alerta en danger SOLO en el encabezado ("Tu plan de pago no se sostiene"); el panel interior va en neutros: diagnóstico con título propio, selector de 3 alternativas como tiles verticales (ícono arriba + texto), contenido de la activa con su callout de beneficio en positivo. Materializa la capa visual que pedía D.15a punto 1 (arquitectura del ADR 031: la alarma señala, la solución calma).

### D5. Tarjeta de deuda con badge de orden + chips

Cada deuda pasa de `.list-item` a tarjeta: teja de marca/categoría 44px con **badge de orden estratégico (1°/2°/3°) superpuesto en la esquina** + nombre + chip de urgencia (rojo ≤3 días, ámbar ≤7, neutro después; color siempre con texto, SC 1.4.11) + saldo prominente (tabular, bold) + chips de categoría y tasa + botón **Abonar** con tinte compromisos (no verde: no es un ingreso) + eliminar ghost que vira a danger en hover. El aviso de tasa desconocida (D.12) pasa de línea con ⚠️ a **callout ámbar** con ícono. Absorbe D.15c.

### D6. Abonar y "Saldada" (ADR 002 sin cambios)

El flujo de abono no se toca; solo se re-estiliza el botón dentro de la tarjeta nueva. Al saldar: chip "Saldada" + botón Archivar, como hoy. Las saldadas no entran a `filtrarDeudasPagables`, así que quedan sin badge y caen al final del orden (comportamiento actual, ver pregunta abierta 3).

### D7. Privacidad coherente

El ojo del hero enmascara total + saldos de las deudas juntos, posición absoluta estable. Reutiliza `S.config.ocultarSaldo`: un solo flag en toda la app.

## Íconos (drafts, ADR 026)

Nuevos en el sprite vía `assets/svg/iconos/simbolos/` + `scripts/sync-sprite.py` (mismo precedente que `i-key` en MC.18b): `i-snowball` (bola de nieve, reemplaza el `i-circle` genérico del picker), `i-handshake` (deuda personal / renegociar), `i-trending-down` (ahorro de intereses). Son **plantillas que Esteban puede sobrescribir en Illustrator**; el mandato de IV.4 (rediseño dirigido de las metáforas Avalancha/Bola de nieve) sigue abierto y no se cierra con estos drafts.

## Preguntas abiertas (no bloquean, resueltas con la recomendación)

1. **Verbo del botón:** se mantiene "Abonar" (ya es el verbo actual de la app, recomendado por el doc de diseño; "Pagar cuota" sigue siendo la pregunta abierta 3 del ADR 002).
2. **Cifra protagonista del hero:** saldo total (recomendado); la cuota mensual como chip. Si Esteban prefiere la cuota como protagonista, es un swap de dos campos en `renderHeroCompromisos()`.
3. **Posición de "Saldada":** se conserva el comportamiento actual (sin badge, al final del orden). ADR 002 D4 pedía card visible con badge: validar con Esteban si debe salir del orden estratégico de otra forma.
4. **Metáforas de los íconos** Avalancha/Bola de nieve: viven en IV.4 (diseño de Esteban).

## Guardarraíles (criterio de aceptación de cada rebanada D.16*)

1. Ambos temas, con contraste WCAG calculado (método IV.1) contra la parada fuerte del degradado; texto muted nunca dentro del hero (lección medida de IN.8b).
2. Pintura única: sin animar `box-shadow`, sin bucles, sin JS nuevo para color/decoración; todo vía `var(--fk-*)`.
3. Cero cambios de lógica: los tests de BUG-011 (unit + E2E) siguen verdes sin modificarse su intención.
4. El color/emoji nunca viaja solo: chips, callouts y estados llevan ícono + texto.
5. Tests verdes + bump de `CACHE_NAME` en cada rebanada que llegue a producción.

## Plan de rebanadas (tarjetas D.16a a D.16d en BOARD.md)

- **D.16a** - Hero total de deuda + ojo (D1+D7 sobre el hero).
- **D.16b** - Picker de estrategia + comparativa tintada + íconos nuevos (D2).
- **D.16c** - Acelerador + panel inviable re-estilados (D3+D4).
- **D.16d** - Tarjeta de deuda con chips + máscara en saldos + empty state (D5+D6; extiende D7 a la lista; absorbe D.15c).

## Alternativas rechazadas

- **Implementar el mockup como copia literal de estilos inline:** viola el sistema (`var(--fk-*)` obligatorio); se recrea con tokens y clases.
- **Esperar a D.15d para tocar la card de estrategia:** invertiría la dependencia (el motor de palanca necesita un lienzo visual donde vivir); el orden visual→motor replica el orden MC.18→MC.13 que ya funcionó en Mis cuentas.
- **Generalizar ya un componente `.hero-dom` común a las 3 secciones:** la unificación de heroes por token (`--fk-grad-identity`) es exactamente DV.2a, bloqueada hasta validar el ADR 033 completo; duplicar el patrón acotado por sección es el costo aceptado del estreno parcial (mismo criterio que MC.18a).
- **Cerrar IV.4 con los drafts del mockup:** los drafts destraban la implementación, pero la metáfora de Avalancha/Bola de nieve sigue pendiente del diseño dirigido de Esteban.
