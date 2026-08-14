# ADR 034 - Inicio v2: revisión del ADR 028 (dashboard como pantalla de decisión)

**Estado:** Aceptada el 2026-07-12. Esteban entregó el handoff de diseño de alta fidelidad (bundle `design_handoff_inicio_v2`: mockup interactivo + decisiones D1 a D8) y dio la instrucción de implementar el diseño con sus opciones recomendadas, lo que resuelve las 4 validaciones que el handoff dejaba abiertas (ver "Validaciones resueltas" abajo). Implementación por rebanadas IN.8a a IN.8g en [BOARD.md](../BOARD.md).
**Fecha:** 2026-07-12
**Autores:** Esteban (brief del 2026-07-08 + diseño hifi del 2026-07-12, iterado en el entorno de specimen), Claude Fable 5 (verificación contra el código real y formalización).
**Relación:** **revisa** el [ADR 028](028-inicio-centro-de-control.md) (Inicio como centro de control): conserva su principio rector "un rol por bloque, ningún dato en dos bloques" y TODA su plomería de datos (movimientos derivados, accesos data-driven, nudge de distribución), pero reemplaza su orden vertical D1, fusiona dos bloques y resuelve el avatar (IN.6b) con teja de iniciales. **Consume** el [ADR 033](033-direccion-visual-premium.md) (dirección visual premium): estrena D1 (sombra en reposo) y D2 (degradado de identidad) acotados al dashboard de Inicio, como piloto autorizado; el despliegue global sigue siendo DV.2a. Respeta el [ADR 019](019-limites-por-rol.md) ("gastar no es incumplir": nada de rojo alarmista en Pendientes ni en el resumen semanal), el [ADR 031](031-identidad-de-color-por-seccion.md) (tokens de dominio, "el color nunca viaja solo") y el [ADR 030](030-persistencia-diferir-rewrite-salvaguarda-cuota.md) (sin foto de perfil mientras la persistencia sea `localStorage`). Base técnica verificada en [`docs/contexto/inicio.md`](../contexto/inicio.md).

---

## Contexto

El brief de Esteban del 2026-07-08 (iniciativa IN.8) pidió una auditoría UX/UI completa de Inicio sobre la base de color ya desplegada (IV.2 cerró el 2026-07-10). El 2026-07-12 Esteban entregó el resultado como handoff de diseño de alta fidelidad: un mockup HTML interactivo (colores, tipografía y espaciado tomados de los propios `tokens.css`/`themes.css` del repo) más un documento de decisiones D1 a D8. Este ADR formaliza esas decisiones como revisión del ADR 028, que estaba aprobado y en producción, para no modificarlo en silencio (regla 2.7 de `/CLAUDE.md`).

Hechos verificados contra el código real antes de aceptar (2026-07-12):

1. **`resumenSemanal()` NO expone serie diaria.** Devuelve solo agregados (`actual`, `previa`, `comparacion`, `top`, `registros`, `diasActivos`). El gráfico de barras de 7 días requiere un cálculo nuevo en `resumen/logic.js` (puro, testeable). Esto resuelve la duda técnica que el handoff pedía verificar.
2. **El orden actual del bento** (`index.html`, `#sec-dash`): hero → accesos rápidos → nudge distribuir → vencidos (media celda) → prioridades (media celda) → alertas de límites → actividad reciente → resumen semanal. El handoff lo reordena por completo.
3. **"Gestionar" de Pendientes del mes lleva a `#compromisos`** (`renderPanelVencidos()`, `compromisos/views/dashboard.js`). La ampliación del 3.er lote (2026-07-08) ya había decidido redirigirlo al Calendario; entra en la rebanada de ese panel.
4. **Los tokens `--fk-shadow-sm/md/lg/glow` existen** (`themes.css`, ambos temas) pero hoy solo se usan en hover, dropdowns, modales y toasts; **`--fk-grad-identity` no existe** (hallazgo 3 del ADR 033). El hero de Inicio usa el acento de marca (`--fk-accent`), no un color de dominio, así que el degradado del piloto se define sobre `--fk-accent` sin necesitar el mapeo `--fk-section-color`.
5. **El ojo de privacidad se desplaza al alternar** porque vive en flujo junto al monto (`.hero-saldo` en `domain.css`) y el ancho del monto enmascarado difiere del real: exactamente el defecto que el brief reportó.

## Decisión

### D1. Orden vertical nuevo (reemplaza el D1 del ADR 028)

Principio conservado: un rol por bloque, ningún dato en dos bloques. Lo que cambia es la prioridad de lectura: **lo accionable sube, los atajos bajan**.

| # | Bloque | Contenido | Cambio vs. ADR 028 |
|---|---|---|---|
| 1 | Perfil | teja de iniciales + saludo dinámico (IN.6a, sin cambios de lógica) + botón de ajustes | reemplaza al header "Tu resumen" |
| 2 | Hero saldo | saldo centrado protagonista + ojo estable + detalle por cuenta expandible | rediseño (D2 a D4) |
| 3 | "Atención hoy" | nudge distribuir ingreso → Pendientes del mes → próxima prioridad → alertas de límites | sube: antes estaba debajo de accesos |
| 4 | "Resumen de la semana" | el bloque más visual (D6) | sube desde el final |
| 5 | Accesos rápidos + Actividad reciente | un solo contenedor fusionado (D7) | baja al final, fusionado |
| 6 | Bottom nav | sin cambios | sin cambios |

- "Atención hoy" y "Resumen de la semana" ganan label de grupo (12px/700, uppercase, `letter-spacing: 0.07em`, `--fk-text-muted`).
- Aire: 20px (`--fk-space-5`) entre bloques en móvil; 12px entre tarjetas dentro de "Atención hoy".
- **Alertas de límites** (`#panel-limites`): el handoff no las rediseña (su copy y evolución viven en LIM.1); se conservan dentro de "Atención hoy", al final del grupo, sin cambios visuales propios.
- El mockup es móvil (390px); en escritorio se conserva el bento de columnas actual con el mismo orden de lectura (detalle por rebanada, sin decisión nueva de layout desktop).

### D2. Hero con saldo centrado, sin ícono decorativo

- Se quita `#hero-saldo-icon` (el `i-saldo` que antecede al label compite con el número).
- Label y monto centrados; tipografía del monto 42px / peso 800 / `font-variant-numeric: tabular-nums` / `letter-spacing: -0.02em`.
- Fondo del hero: degradado de identidad del ADR 033 D2 acotado a este piloto: `linear-gradient(160deg, color-mix(in srgb, var(--fk-accent) 14%, transparent), transparent 55%)` sobre `--fk-bg-surface`, borde `--fk-accent-border`, sombra `--fk-shadow-md`. Ambos temas; el porcentaje de la parada fuerte se valida con cálculo WCAG real contra el texto que la toca (método IV.1/IV.2).
- Copy sin cambios: "Tu dinero disponible hoy" / "efectivo + N cuentas bancarias".

### D3. Ojo de privacidad estable

- El botón del ojo pasa a `position: absolute` (esquina superior derecha del hero, 18px/18px): su posición NUNCA cambia; solo cambian el ícono (`i-eye` ↔ `i-eye-off`) y el contenido del monto (`$2.485.000` ↔ `••••••`).
- `S.config.ocultarSaldo` y la lógica de `updSaldo()` (render.js) no cambian de contrato; solo el layout.

### D4. Detalle por cuenta expandible (resuelve la decisión UX abierta de IN.2/brief)

- Pill secundario debajo del monto: "Ver detalle por cuenta" ↔ "Ocultar detalle". Expande in situ una fila por cuenta (teja de banco + nombre + saldo, efectivo incluido), sin navegación.
- **Colapsado por defecto** y **estado solo de UI en memoria, no persistido** (opción recomendada del handoff, aceptada): total limpio en la gran mayoría de aperturas, detalle a 1 toque.
- La máscara de privacidad se extiende al detalle: al ocultar, el total Y cada cuenta se enmascaran juntos (extensión de IN.2 pedida por el brief).
- El texto "efectivo + N cuentas bancarias" se muestra solo colapsado (el detalle expandido lo vuelve redundante).
- Animación: fade/slide corto (150 a 200 ms, `opacity` + `transform`); nunca `height` animado en keyframes (disciplina ADR 033 D4).

### D5. "Pendientes del mes" con jerarquía real, sin línea roja

- Se quita el `border-left` rojo de alarma. La jerarquía la dan: teja de ícono coloreada por dominio (`[data-dom]`, ADR 031), nombre 14px/600, badge de tipo (`.dom-badge` de IV.2c: "Deuda", "Gasto fijo"), y el estado temporal en color semántico SOLO en ese texto ("Venció hace 2 días" en tono danger suavizado, "Vence hoy" en `--fk-warning`): el color nunca tiñe el borde ni el fondo de toda la tarjeta (ADR 019 + regla "el color nunca viaja solo").
- Monto a la derecha, 15px/700, tabular-nums. Contador total en badge circular rojo suave en el header de la tarjeta.
- **"Gestionar" pasa de `#compromisos` a `#agenda`** (ampliación del 3.er lote, 2026-07-08: el Calendario es el centro de gestión de obligaciones por fecha). El mockup no dibuja el botón pero la función se conserva en el header del panel.
- "Próxima prioridad": misma estructura de fila; cuando hay pocas, una sola tarjeta destacada en vez de lista larga.

### D6. Resumen semanal como el bloque más visual

- Fila superior: "Gastaste esta semana" (13px, `--fk-text-secondary`) + monto grande (28px/800, tabular-nums) a la izquierda; chip comparativo a la derecha ("12% menos", verde `--fk-success-text` con `i-trending-up` invertido cuando el gasto bajó). **Gastar menos = chip verde; gastar más = neutro/ámbar, nunca rojo alarmante** (coherente con ADR 019 e IV.3, que ya despintó de rojo la subida de gasto en Análisis).
- Mini gráfico de barras de 7 días: barras `flex: 1`, alto proporcional al gasto del día (contenedor máx. 78px), `--fk-accent` al 100% en el día pico y al ~28% de opacidad en el resto; etiqueta de día (Lun a Dom) debajo, resaltada en el pico. Estático: sin animación en bucle.
- Fila inferior: categoría top con su teja + "N de 7 días activos" + mensaje interpretativo ("mayor gasto el sábado") + monto de la categoría.
- **Dato nuevo confirmado necesario:** `resumenSemanal()` se extiende con la serie diaria (7 totales, uno por día de la ventana), cálculo puro en `resumen/logic.js` dentro del mismo bundle memoizado (PERF.2/PERF.7b, sin memo nueva).

### D7. Fusión accesos rápidos + actividad reciente (último bloque)

- Un solo `bento__cell` con dos secciones internas separadas por `border-top`.
- Arriba: label "Accesos rápidos" + botón "Personalizar" (mismo `data-action="accesos-personalizar"`) + grilla de 4 columnas de tejas (`accesosVisibles()` sin cambios de lógica).
- Abajo: label "Actividad reciente" + link "Ver todo" (`href="#movimientos"`) + lista de movimientos (`movimientosRecientes()`, límite 5), cada fila igual que hoy (teja de dominio + nombre + cuándo + monto, verde solo el ingreso).
- Solo cambia el contenedor/posición; cero cambios en `accesos/logic.js` y `movimientos/logic.js`.

### D8. Perfil con avatar de iniciales (cierra la absorción de IN.6b)

- Teja de iniciales 46×46px, radio 14px, gradiente del acento (`linear-gradient(150deg)` hover → base), texto oscuro de contraste 18px/700: patrón visual de las tejas del ADR 025.
- El saludo dinámico existente (`updSaludo()`, IN.6a) se reubica en el header de perfil en dos líneas (franja horaria arriba en 13px secundario, nombre abajo en 19px/700); la lógica de franjas no cambia. Sin nombre configurado, el saludo genérico se conserva y el fallback del avatar se define en la rebanada (sin dato nuevo).
- Botón de ajustes 40×40px (radio 12px) a la derecha, navega a `#config`.
- **Fotografía: NO** mientras la persistencia sea `localStorage` (ratifica ADR 028 D3 y ADR 030: cupo compartido con los datos financieros). El set de avatares ilustrados propios (ADR 026) queda como extensión posterior opcional; no bloquea esta iniciativa.
- `#title-dash` ("Tu resumen") deja de ser el título visual; la rebanada resuelve el encabezado accesible de la sección sin perder el nombre de región para lectores de pantalla.

## Validaciones resueltas (las 4 pendientes del handoff)

1. **ADR 033 (P1 degradado, P5 sombra):** autorizado su estreno acotado al dashboard de Inicio con la instrucción de implementación del 2026-07-12. P2, P3, P4 y el despliegue global (DV.2a a DV.2d) siguen pendientes de validación formal; la sombra en reposo de este piloto se aplica con alcance limitado a los bloques de Inicio (`.bento--dash`) para no adelantar DV.2a en silencio.
2. **Default de "Ver detalle por cuenta": colapsado**, estado en memoria sin persistir (recomendación aceptada).
3. **Avatar: iniciales**, sin foto (recomendación aceptada, coherente con ADR 028 D3/ADR 030).
4. **Serie diaria del gráfico:** verificado contra el código, SÍ requiere cálculo nuevo en `resumen/logic.js` (hoy solo hay agregados).

## Plan de rebanadas (tarjetas IN.8a a IN.8g en BOARD.md)

Cada rebanada se desarrolla, verifica en la app y commitea por separado (regla 2.1), con tests verdes y bump de `CACHE_NAME` al salir a producción:

- **IN.8a - Reorden del dashboard + labels de grupo + aire** (D1): solo `index.html` + CSS de layout; ningún dominio cambia su lógica.
- **IN.8b - Hero v2** (D2 + D3): sin ícono, centrado, tipografía protagonista, ojo absoluto estable, degradado + sombra del piloto ADR 033, ambos temas con contraste medido.
- **IN.8c - Detalle por cuenta expandible** (D4): pill, filas por cuenta, máscara extendida, estado UI en memoria.
- **IN.8d - Header de perfil** (D8): avatar de iniciales + saludo en dos líneas + botón de ajustes.
- **IN.8e - Pendientes del mes con jerarquía real** (D5): sin línea roja, badges + estado temporal semántico, contador, "Gestionar" → `#agenda`, próxima prioridad destacada.
- **IN.8f - Resumen semanal visual** (D6): serie diaria en `logic.js` + rediseño del panel con barras, chip y categoría top.
- **IN.8g - Fusión accesos + actividad** (D7): contenedor único al final de la pantalla.

Orden recomendado: a → b → c → d → e → f → g (primero la estructura, luego el protagonista, después cada panel). IN.8c depende de IN.8b; IN.8g depende de IN.8a; el resto son independientes entre sí una vez reordenada la pantalla.

## Alternativas consideradas

- **Persistir el estado del detalle por cuenta (`S.config.detalleCuentasInicio`):** descartada en v1; ahorraría un toque a quien siempre lo quiere abierto, pero agrega un campo de config y un bump de schema para una preferencia aún sin evidencia de uso. Revisable si el uso real lo pide.
- **Foto de perfil:** descartada de nuevo (tercera vez: ADR 028 D3, ADR 030 y este ADR); el riesgo de `QuotaExceededError` sobre los datos financieros sigue vigente mientras la persistencia siga en `localStorage`. Aprobar la foto es, además, uno de los dos disparadores T2 del [ADR 068](068-perf5-sale-del-tablero-disparadores-verificables.md): decidirla a favor abre la migración a IndexedDB.
- **Desplegar la sombra en reposo a toda la app en esta iniciativa:** descartada; ese es exactamente el alcance de DV.2a y hacerlo aquí duplicaría la decisión pendiente del ADR 033 (regla anti-doble-trabajo del triaje).
- **Mantener los accesos rápidos bajo el hero (ADR 028 D1):** descartada por el propio Esteban en el brief: los atajos son estáticos y empujaban lo urgente fuera del primer pantallazo; la fusión con actividad reciente les da un cierre coherente sin perder el 1 tap.

## Consecuencias

### Positivas

- Inicio cumple la regla de los 5 segundos con lo accionable primero: alertas y vencimientos arriba, atajos al final.
- El saldo se vuelve protagonista real y el control de privacidad deja de saltar (defecto reportado que se corrige de raíz).
- "Pendientes del mes" informa prioridad sin alarmismo (ADR 019 respetado de punta a punta).
- El resumen semanal pasa de texto plano a interpretación visual con un solo cálculo puro nuevo.
- El piloto del ADR 033 entrega evidencia real (contraste, rendimiento, percepción) para decidir DV.2a con datos.

### Negativas / Restricciones

- 7 rebanadas sobre la pantalla más vista de la app: cada una debe salir verificada y con bump de SW o el celular de Esteban seguirá viendo la versión anterior (lección del incidente v345).
- El orden nuevo es hipótesis validada en mockup, no en uso real: se revisa en dispositivo tras completar las rebanadas.
- La sombra en reposo acotada a Inicio crea una inconsistencia temporal deliberada con el resto de la app hasta que DV.2a se apruebe y despliegue.
