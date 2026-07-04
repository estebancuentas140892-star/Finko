# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Última actualización: 2026-07-03.

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

#### MC.6c (opcional) - Señales más ricas para la distribución automática
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : historial de gastos variables como proxy de estilo de vida; inversiones como prioridad tras el fondo, en el modelo de pisos de distribución.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js`
- Depende de : nada
- Modelo     : sin definir

#### MC.7g (opcional) - Fijos Quincenal/Semanal/Diario en la checklist de Necesidades
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : la checklist de Necesidades (MC.7d, slice 1) solo incluye fijos con frecuencia Mensual: un Quincenal/Semanal/Diario tiene más de una ocurrencia por periodo y una sola fila no puede representarlas sin pagar de más o de menos. Modelar sus vencimientos dentro del periodo (mismo problema que ya resolvió `eventosDelMes` de Agenda) para poder incluirlos.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js` (`construirDesgloseNecesidades`)
- Depende de : nada. Solo tiene sentido si el usuario lo pide: la mayoría de fijos recurrentes de uso diario (arriendo, servicios, suscripciones) ya son Mensuales.
- Modelo     : sin definir

#### MC.10 (diseño, revisa ADR 013) - Reservar siempre algo para ahorro cuando hay margen
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : con Necesidades altas, el modo automático reparte 0% a Ahorro porque el piso de Estilo de vida (10%) gana sobre el ahorro extra. Introducir un piso de ahorro que compita con el piso de estilo de vida al repartir el residuo; el ahorro solo debería quedar en $0 cuando de verdad no hay alternativa.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js` (`_PISO_EV_PCT` línea ~754, Paso 3 línea ~871)
- Depende de : nada. Conviene resolver junto con MC.11 (ambas ajustan el reparto cuando Necesidades son altas). Revisa [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md).
- Modelo     : diseño Opus 4.8 - Medio; implementación Sonnet 5 - Medio

#### MC.11 (diseño, revisa ADR 013) - Detectar déficit real y comunicarlo
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : cuando el ingreso no cubre las Necesidades (ej. gasto fijo registrado fuera de Agenda), el modelo no dispara el caso de déficit y muestra una distribución "ideal" incoherente. Detectar el déficit real y comunicarlo con recomendaciones accionables en vez de inventar porcentajes.
- Secciones  : Mis cuentas
- Archivos   : `modules/dominio/tesoreria/logic.js` (línea ~812, `montoNec`; línea ~850, caso de déficit)
- Depende de : nada. Conviene resolver junto con MC.10. Revisa [ADR 013](DECISIONS/013-distribucion-automatica-inteligente.md).
- Modelo     : diseño Opus 4.8 - Medio; implementación Sonnet 5 - Medio

---

### Gastos (dominio `gastos`)

#### TX.3 (opcional) - Café y Gastos hormiga explícitos
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : agregar categorías Café ☕ y Gastos hormiga 🐜 si el usuario las quiere explícitas en el catálogo.
- Secciones  : Gastos
- Archivos   : `modules/core/constants.js`
- Depende de : nada
- Modelo     : Sonnet 5 - Bajo

---

### Deudas (dominio `compromisos`, deuda)

#### D.10 (diseño, revisa ADR 015) - Categorías propias para deudas personales
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : al elegir "Personal" en el chooser, el form sigue mostrando categorías de producto (Tarjeta de crédito, Vivienda...) que no encajan. Catálogo aparte de categorías de relación (Familiar, Amigo, Vecino, Natillera, Prestamista particular, Otro) cuando el tipo es personal.
- Secciones  : Deudas
- Archivos   : `modules/dominio/compromisos/views/formularios.js` (línea ~173)
- Depende de : nada. Revisa [ADR 015](DECISIONS/015-categorias-de-deuda-dos-dimensiones.md).
- Modelo     : diseño Sonnet 5 - Alto; implementación Sonnet 5 - Medio

#### D.12 (mejora UI) - Contextualizar el aviso de tasa desconocida por deuda
- Prioridad  : baja
- Estado     : pendiente
- Objetivo   : el aviso de tasa desconocida hoy es un banner único al tope de la sección; moverlo a un aviso por deuda en el render de la lista, para que se identifique al instante.
- Secciones  : Deudas
- Archivos   : `modules/dominio/compromisos/views/estrategia.js` (`_renderAvisoTasaDesconocida`, línea ~317), `modules/dominio/compromisos/views/lista.js`
- Depende de : nada
- Modelo     : Sonnet 5 - Medio

#### D.13 - "Fiado" como modalidad de deuda personal
- Prioridad  : media
- Estado     : requiere ADR (el mismo de D.10)
- Objetivo   : el fiado (tienda de barrio, pequeño comercio, vendedor ambulante) es una deuda cotidiana muy común en Colombia; hoy toca registrarla como deuda personal genérica. Ofrecer una opción "Fiado" con interfaz adaptada: nombre de la tienda o persona, valor total, fecha en que se adquirió, fecha límite si existe, y notas opcionales.
- Secciones  : Deudas
- Archivos   : `modules/dominio/compromisos/views/formularios.js`, `modules/core/constants.js`
- Depende de : **resolver junto con D.10** (categorías propias para deuda personal): "Fiado" encaja como una de las categorías de relación de ese ADR, o como sub-tipo con campos propios. Un solo pase de diseño decide si es categoría o modalidad.
- Modelo     : diseño junto a D.10 (Sonnet 5 - Alto); implementación Sonnet 5 - Medio

---

### Apartados (dominio `apartados`)

#### AP.4 (épica, requiere ADR) - Recordatorios automáticos de aporte en Calendario
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : recordatorio en Calendario al recibir el ingreso ("Hoy recibiste tu ingreso, recuerda apartar $X para el SOAT"). Cuidar la duplicación con "Distribuir mi ingreso" (MC.4, ya acredita y reparte a los apartados) y el nudge de proximidad existente (60 días).
- Secciones  : Apartados, Calendario, Mis cuentas
- Archivos   : `modules/dominio/apartados/`, `modules/dominio/agenda/`
- Depende de : converge con MT.2 (Metas) y AH.4 (Ahorro). **Un solo ADR debe decidir el modelo de recordatorios de aporte para los tres a la vez**, sin solapar con MC.4.
- Modelo     : diseño Opus 4.8 - Alto (cross-domain, trade-offs de duplicación)

---

### Metas (dominio `metas`)

#### MT.2 (épica, requiere ADR) - Integración de Metas con Calendario
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : recordatorios de aporte a cada meta en Calendario según la frecuencia de ingreso, con color/nombre de la meta y botón "Abonar".
- Secciones  : Metas, Calendario
- Archivos   : `modules/dominio/metas/`, `modules/dominio/agenda/`
- Depende de : converge con AP.4 y AH.4 (mismo ADR). Se beneficia de MT.1 (color/ícono) y MT.5 (flujo de abono unificado).
- Modelo     : diseño Opus 4.8 - Alto

---

### Ahorro (dominio `ahorro`, fondo de emergencia)

#### AUD.6 (opcional) - Hint del modelo del fondo de emergencia
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : el fondo de emergencia no descuenta las cuentas al aportar (a diferencia de Metas/Apartados); el usuario puede hacer doble contabilidad mental. Un hint en la card ("este dinero sigue en tus cuentas; el fondo solo lo aparta de tu vista") cierra la brecha.
- Secciones  : Ahorro
- Archivos   : `modules/dominio/ahorro/view.js`, `modules/dominio/analisis/logic.js` (tracker paralelo)
- Depende de : **AH.3 propone lo contrario** (que el aporte sí descuente). Resolver ambos en la misma decisión; puede absorberse en el ADR de AH.3.
- Modelo     : Sonnet 5 - Bajo (o absorbido en AH.3)

#### AH.2 - Aporte recomendado según los ingresos, explicado
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : construir el aporte sugerido con datos reales (ingresos/promedio, frecuencia, gastos fijos, deudas, otras metas) en vez de un valor sin explicación; si falta info, pedir el promedio de ingreso mensual.
- Secciones  : Ahorro
- Archivos   : `modules/dominio/ahorro/`, `modules/dominio/tesoreria/logic.js` (MC.6a ya calcula `faltanteFondo / 12`)
- Depende de : conviene alinear con MC.10/MC.11 para no tener dos motores de recomendación de ahorro.
- Modelo     : Sonnet 5 - Medio (o Opus si toca el motor de distribución)

#### AH.3 (revisa el modelo del fondo) - Registrar el origen del dinero en el aporte
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : el form de aporte hoy no pide cuenta ni descuenta saldo (diseño intencional: "el aporte NO descuenta cuenta"). Cambiar a elegir cuenta(s), validar saldo y sincronizar, como el resto de la app (patrón AP.1). Decisión de fondo: ¿el fondo mueve dinero fuera de las cuentas o sigue siendo marcador de dinero líquido?
- Secciones  : Ahorro
- Archivos   : `modules/dominio/ahorro/view.js` (`renderFormAporte`, línea ~360), `modules/dominio/ahorro/index.js` (línea ~410)
- Depende de : converge con AUD.6 (misma decisión).
- Modelo     : diseño Sonnet 5 - Alto; implementación Sonnet 5 - Medio

#### AH.4 (épica, requiere ADR) - Quitar "Definir" e integrar el fondo con Calendario
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : el botón "Definir →" del compromiso mensual duplica "Distribuir mi ingreso" (MC.4). Quitarlo e integrar el fondo con Calendario: recordatorio "Hoy corresponde tu aporte al Fondo de emergencia" con botón de registro rápido.
- Secciones  : Ahorro, Calendario
- Archivos   : `modules/dominio/ahorro/view.js` (`renderFormCompromisoMensual` línea ~400, botón línea ~223)
- Depende de : converge con MT.2 y AP.4 (mismo ADR). Antes de quitar `compromisoMensual`, verificar si alimenta nudges o el Score de Salud. Depende de AH.3.
- Modelo     : diseño Opus 4.8 - Alto

---

### Inversión (dominio `inversiones`)

_(sin pendientes activos.)_

---

### Límites de gasto (dominio `presupuesto`)

#### MC.8c - Layout de dos columnas + fila completa
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : desktop con Necesidades + Ahorro en 2 columnas compactas y Estilo de vida en fila completa; apilado en móvil.
- Secciones  : Límites de gasto
- Archivos   : `modules/dominio/presupuesto/view.js`, CSS relacionado
- Depende de : nada. Ver [ADR 019](DECISIONS/019-limites-por-rol.md).
- Modelo     : Sonnet 5 - Bajo/Medio

#### MC.8d (opcional) - Pulido de Límites
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : copy final por grupo, iconos por categoría, estados vacíos, a11y.
- Secciones  : Límites de gasto
- Archivos   : `modules/dominio/presupuesto/view.js`
- Depende de : MC.8c
- Modelo     : Sonnet 5 - Bajo

> Nota: si más adelante se resuelven MC.10/MC.11 (piso de ahorro + detección de déficit en Mis cuentas), el asignado por grupo de Límites mejora automáticamente sin tocar este código.

---

### Me deben (dominio `personales`)

#### PE.1 (schema + lógica financiera) - Tasa de interés opcional + reparto capital/interés
- Prioridad  : media
- Estado     : pendiente
- Objetivo   : campo opcional de tasa en el préstamo dado; con él, calcular capital, interés generado, saldo pendiente y total recuperado. Requiere migración idempotente y lógica de amortización (reusable de `infra/financiero.js`). Al haber tasa, el chip de estado (PE.4, cerrada) puede indicar además cuánto del abono fue a capital vs interés.
- Secciones  : Me deben
- Archivos   : `modules/dominio/personales/logic.js` (línea ~7), `modules/infra/financiero.js`
- Depende de : nada
- Modelo     : Opus 4.8 - Medio (nueva lógica financiera CO + schema)

---

### Análisis (dominio `analisis`)

_(sin pendientes activos. Observación sin acción inmediata: la dona de "Gastos por categoría" usa colores por categoría pero las barras laterales son todas verdes; unificar la paleta si se toca Análisis en otra tarea.)_

---

### Configuración (dominio `config`)

_(sin pendientes activos.)_

---

## Transversal (afecta varias secciones)

#### LG.1b (épica, requiere ADR) - Sección de Logros
- Prioridad  : media
- Estado     : requiere ADR
- Objetivo   : una sección o apartado "Logros" que muestre conseguidos, pendientes, progreso y cómo desbloquearlos. Decidir: sección propia vs. tarjeta en Ajustes/Inicio; qué logros muestran progreso parcial (extender `LOGROS` con `progreso(s)` opcional).
- Secciones  : Transversal, posible sección nueva
- Archivos   : `modules/dominio/logros/logic.js` (`LOGROS`), `S.logros`
- Depende de : LG.1a (ya resuelto o no, es independiente)
- Modelo     : diseño Opus 4.8 - Alto; implementación Sonnet 5 - Medio

#### RWD.1 (verificación) - Probar reflow real a 320px y zoom 200%
- Prioridad  : baja
- Estado     : pendiente (bloqueada por preview del entorno, ver memoria del proyecto)
- Objetivo   : el CSS responsive está completo en código; verificar en dispositivo real o con un E2E a 320px que no haya scroll horizontal ni solapes (modales con `.input--big-amount`, barra inferior). Nota menor: labels del nav bajan a 10px bajo 360px (aceptable, vigilar).
- Secciones  : Transversal
- Archivos   : `styles/responsive.css`
- Depende de : nada
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

#### E.5 (opcional) - IPC como constante anual
- Prioridad  : baja
- Estado     : opcional
- Objetivo   : agregar el IPC observado como constante anual, si se quiere mostrar inflación real además de `INFLACION_OBJETIVO` (meta de BanRep).
- Secciones  : Transversal (constantes legales)
- Archivos   : `modules/core/constants.js`
- Depende de : nada
- Modelo     : Haiku 4.5
