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
