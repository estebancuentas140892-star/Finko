# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Última actualización: 2026-07-04.

---

## En proceso

_(sin tarea activa. Máximo 1 tarjeta aquí a la vez, regla de oro de `/CLAUDE.md` sección 2.1.)_

---

## Cómo usar este tablero

1. Elegir **una** tarjeta de "Pendientes" (o del backlog del usuario si hay una nueva).
2. Moverla a "En proceso" con la fecha de inicio.
3. Trabajarla en una sola sesión cuando sea posible; verificar en la app + tests verdes.
4. Al cerrar: commit → **borrar la tarjeta de este archivo** → agregar entrada en [`CHANGELOG.md`](CHANGELOG.md) → actualizar [`HANDOFF.md`](HANDOFF.md) (últimas 5) → si cerró un error, borrarlo de [`BUGS.md`](BUGS.md).

Campos de una tarjeta:

```markdown
### <ID> - <título corto>
- Prioridad  : alta | media | baja
- Estado     : pendiente | opcional | requiere ADR
- Objetivo   : qué resuelve, en una frase
- Secciones  : secciones de la app afectadas
- Archivos   : rutas relativas involucradas
- Depende de : otra tarjeta o "nada"
- Modelo     : combinación sugerida (ver `/CLAUDE.md` sección 2.3)
```

---

## Pendientes por sección

### Inicio (dashboard)

_(Observación sin tarea formal: IN.2 cerró con el ojo solo en el hero, el monto más sensible. Si el usuario lo pide, extender la máscara a los demás montos de Inicio: totales de vencidos/prioridades y cifras del resumen semanal.)_

_(Observación sin tarea formal: retroalimentación del usuario en el celular sobre el resumen semanal puede sugerir ajustes de copy/orden de las stats, o sumar un guiño al progreso del fondo/metas. Esperar feedback antes de iterar.)_

---

### Calendario (dominio `agenda`)

_(sin pendientes activos. Posible ampliación futura sin tarea formal: con AG.4 cerrada, la categoría "Otro" podría ofrecer un ícono personalizado propio además del nombre libre; solo tiene sentido si el usuario lo pide, requeriría un campo `icono` nuevo en el compromiso fijo.)_

---

### Mis cuentas (dominio `tesoreria`)

#### MC.7g (opcional) - Fijos Quincenal/Semanal/Diario en la checklist de Necesidades
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : la checklist de Necesidades (MC.7d, slice 1) solo incluye fijos con frecuencia Mensual: un Quincenal/Semanal/Diario tiene más de una ocurrencia por periodo y una sola fila no puede representarlas sin pagar de más o de menos. Modelar sus vencimientos dentro del periodo (mismo problema que ya resolvió `eventosDelMes` de Agenda) para poder incluirlos.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js` (`construirDesgloseNecesidades`)
- Depende de : nada. Solo tiene sentido si el usuario lo pide: la mayoría de fijos recurrentes de uso diario (arriendo, servicios, suscripciones) ya son Mensuales.
- Modelo     : sin definir

---

### Gastos (dominio `gastos`)

_(sin pendientes activos.)_

---

### Deudas (dominio `compromisos`, deuda)

_(sin pendientes activos.)_

---

### Apartados (dominio `apartados`)

_(sin pendientes activos.)_

---

### Metas (dominio `metas`)

_(sin pendientes activos.)_

---

### Ahorro (dominio `ahorro`, fondo de emergencia)

_(sin pendientes activos.)_

---

### Inversión (dominio `inversiones`)

_(sin pendientes activos.)_

---

### Límites de gasto (dominio `presupuesto`)

_(sin pendientes activos. Nota: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.)_

---

### Me deben (dominio `personales`)

_(sin pendientes activos.)_

---

### Análisis (dominio `analisis`)

_(sin pendientes activos.)_

---

### Configuración (dominio `config`)

_(sin pendientes activos.)_

---

## Transversal (afecta varias secciones)

> Iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md)): auditoría móvil hecha el 2026-07-04; decisión aprobada en el ADR. Orden: NAV.A1 → NAV.A2 → NAV.B → NAV.C.

#### NAV.A2b - Abono/Aporte en la hoja "Registrar" + oferta de distribución
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : sumar a la hoja "Registrar" (ya existe, NAV.A2a) las acciones **Abono a deuda** y **Aporte a ahorro**, y la **oferta de distribución** tras registrar un ingreso. Requiere piezas nuevas: un selector de destino "¿a qué deuda?" / "¿a qué meta, apartado o fondo?" (los flujos actuales exigen `data-id`, no hay entrada global), y un modo "ya acreditado" del asistente de distribución para no duplicar el abono (`_confirmarDistribucion` re-acredita la cuenta, ver ADR 024 D3). El selector de destino de Aporte encaja mejor junto al hub de NAV.B.
- Secciones  : Deudas, Ahorros (hub NAV.B), Mis cuentas, navegación
- Archivos   : `index.html`, `modules/ui/actions.js`, `modules/dominio/{compromisos,metas,apartados,ahorro,tesoreria}/`, `tests/e2e/`
- Depende de : NAV.A2a (cerrada) y NAV.B
- Modelo     : Opus 4.8 - Alto

#### NAV.B - Hub "Ahorros": una entrada, cuatro pestañas
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : responder "¿dónde están mis ahorros?" con un solo destino: tarjeta única "Ahorros" en el modal Más (reemplaza 4), franja de pestañas `Fondo · Metas · Apartados · Inversión` sobre las 4 secciones existentes (enlaces, cero cambios de router), consolidado de ADR 009 como cabecera común, renombre de la sección "Ahorro" a "Fondo de emergencia" y grupo "Crecer" del sidebar desktop a "Ahorros". El modal Más queda en 7 tarjetas sin grupos. Ver ADR 024, D4 y D5.
- Secciones  : Ahorro, Metas, Apartados, Inversión, navegación
- Archivos   : `index.html`, `modules/ui/menu-mas.js`, `styles/layout.css`, `styles/components/`, `modules/ui/proposito.js` (copy del renombre), tests E2E de navegación
- Depende de : NAV.A2a (cerrada; el modal Más no se rehace dos veces)
- Modelo     : Sonnet 5 - Alto

#### NAV.C - Pulidos de navegación
- Prioridad  : baja
- Estado     : pendiente
- Objetivo   : retrasar el toast de logro del primer uso (hoy pisa la hoja "Registrar", los tips y el modal Más en el primer minuto), revisar el nombre del grupo de gestión en el sidebar desktop (con "Herramientas" disuelto tras NAV.B), y recortar los banners de propósito que exceden las 40 a 60 palabras de ADR 016 manteniendo los tres tiempos. Ver ADR 024, D6.
- Secciones  : navegación, Inicio, Apartados
- Archivos   : `modules/dominio/logros/index.js`, `index.html`, `modules/ui/proposito.js`
- Depende de : NAV.A2a (cerrada) y NAV.B
- Modelo     : Sonnet 5 - Medio

---

> Iniciativa de identidad visual 2026-07 ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md)). ID.1, ID.4, ID.2 e ID.6 (revisión v2 del lenguaje: "trazo cálido con chispa", piloto de navegación redibujado) cerradas, todas 2026-07-04. Quedan dos fases: ID.7 (estructurales a v2) e ID.3 (categorías).

#### ID.7 - Símbolos estructurales al lenguaje v2
- Prioridad  : media
- Estado     : pendiente (espera validación del piloto ID.6 en el celular del usuario)
- Objetivo   : recalentar la geometría de los ~20 símbolos estructurales (saldo, recurring, lightbulb, alert, bolt, trophy, mountain, circle, star, percent, trending-up, info, bar-chart) al lenguaje v2 del ADR 023 revisado: redondez sistemática, duotono al 22 % y chispa con `var(--fk-icon-dot, currentColor)`. Hoy heredan el trazo 2.35 global pero conservan geometría v1.
- Secciones  : Transversal
- Archivos   : `index.html` (sprite)
- Depende de : validación visual de ID.6
- Modelo     : Sonnet 5 - Alto

#### ID.3 - Iconos de categorías en tejas teñidas por dominio
- Prioridad  : media
- Estado     : pendiente (requiere decisión del usuario sobre emojis de celebración)
- Objetivo   : diseñar los ~40 iconos de categorías (gastos, ingresos, agenda, deudas, metas) en el lenguaje v2 del ADR 023 revisado, presentados en tejas teñidas con `--fk-dom-*` y chispa en el color del dominio (dirección C de la revisión). Retirar los catálogos `CATEGORIA_*_EMOJI` de la UI estructural (los selects quedan con texto plano; el emoji personalizado de Metas "Otra" y Apartados se conserva como dato del usuario). Actualizar el guardarraíl TX.4 para comparar ids de sprite en vez de emojis. Decidir con el usuario el destino de los emojis de celebración (logros, 🎉 de toasts, 💚 del onboarding; el confetti ya es CSS).
- Secciones  : Gastos, Calendario, Deudas, Metas, Límites, Análisis, Mis cuentas, Inicio
- Archivos   : `index.html` (sprite), `modules/core/constants.js`, 10 archivos consumidores (`gastos/view+logic`, `agenda/view`, `tesoreria/view`, `metas/view+logic`, `compromisos/views/lista+formularios`, `resumen/view`, `presupuesto/view`), `tests/unit/constants.test.js`
- Depende de : validación visual de ID.6 (puede ir antes o después de ID.7)
- Modelo     : Fable 5 - Alto

#### ID.5 - Micropulido tipográfico de cifras
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : tracking levemente negativo y eje óptico de Inter en las cifras grandes (hero, patrimonio, bento values); solo si el detalle aún se nota tras las fases ya cerradas.
- Secciones  : Inicio, Análisis, Ahorro
- Archivos   : `styles/base.css`, `styles/tokens.css`
- Depende de : nada (ID.4 ya cerró)
- Modelo     : Sonnet 5 - Bajo

---

## Mantenimiento

#### A.5 - Dominio custom en Vercel
- Prioridad  : baja
- Estado     : pendiente (espera a que el usuario registre un dominio)
- Objetivo   : cambiar de `finko-brown.vercel.app` a un dominio propio. No requiere cambios de código.
- Secciones  : Infraestructura
- Archivos   : guía completa en [`SETUP_DOMINIO.md`](SETUP_DOMINIO.md)
- Depende de : que el usuario tenga el dominio registrado
- Modelo     : sin código, solo config en Vercel

#### E.2-2027 - Actualizar SMMLV + UVT a valores 2027
- Prioridad  : alta (cuando llegue la fecha)
- Estado     : pendiente, programada para enero 2027
- Objetivo   : reemplazar `2027: null` por la entrada completa en `LEGAL_POR_ANIO` con los valores oficiales de Mintrabajo (SMMLV) y DIAN (UVT). Ver instrucciones detalladas en [`HANDOFF.md`](HANDOFF.md) sección "Recordatorio enero 2027".
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : publicación oficial de los decretos/resoluciones 2027
- Modelo     : Haiku 4.5

#### E.3 - Verificar GMF y otras tasas si hay reforma tributaria
- Prioridad  : baja
- Estado     : pendiente (ad-hoc, solo si hay reforma)
- Objetivo   : revisar si una reforma tributaria cambia el GMF (4x1000) u otras constantes.
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : que ocurra una reforma
- Modelo     : Haiku 4.5

_(Nota de mantenimiento anual: junto con E.2, cada enero agregar también la entrada del año en `IPC_OBSERVADO_POR_ANIO` con el cierre del DANE, ver E.5 en el CHANGELOG de 2026-07.)_
