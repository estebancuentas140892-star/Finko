# Tablero - Finko Claude

> Tablero Kanban de trabajo pendiente. Reemplaza a `TASKS.md` y `ROADMAP.md` (retirados 2026-07-02, ver [CHANGELOG](CHANGELOG.md)).
> Regla de oro: **solo lo pendiente vive aquí.** Al cerrar una tarea, su tarjeta se borra de este archivo y su historia completa queda en [`CHANGELOG.md`](CHANGELOG.md) (ver [`/CLAUDE.md`](../CLAUDE.md) sección 2.4).
> Errores conocidos: ver [`BUGS.md`](BUGS.md).
> Última actualización: 2026-07-05.

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

#### N.4 - Partir compromisos/logic.js en submódulos
- Prioridad  : baja
- Estado     : pendiente
- Objetivo   : `compromisos/logic.js` tiene 1.517 líneas y mezcla fijos, deudas, estrategia de pago y agenda; partirlo por subsistema para depurar sin leer un archivo gigante. La vista ya está partida (`views/`); aplicar el mismo corte que tesorería en N.3 (barrel `logic.js` + `logic/<sub>.js`), sin tocar la API que consumen `views/`, `index.js` y `tests/unit/compromisos.test.js`.
- Secciones  : Deudas, Calendario (comparten lógica de compromisos), Inicio (paneles de vencidos/prioridades)
- Archivos   : `modules/dominio/compromisos/logic.js`, `service-worker.js` (precache + bump)
- Depende de : nada (el patrón quedó documentado en ARCHITECTURE 2.4 con N.3)
- Modelo     : Fable 5 - Alto (refactor grande con riesgo de regresión en lógica financiera; Opus 4.8 - Extra como alternativa)

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

> Iniciativa de navegación 2026-07 ([ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md)): auditoría móvil hecha el 2026-07-04; decisión aprobada en el ADR. NAV.A1, NAV.A2a, NAV.B, NAV.A2b (slices 1 y 2) y NAV.C cerradas. Iniciativa completa, sin pendientes.

---

> Iniciativa Biblioteca de recursos gráficos 2026-07 ([ADR 026](DECISIONS/026-biblioteca-de-recursos-graficos.md)): Esteban diseña los SVG en Illustrator; `assets/svg/` es la fuente de verdad de diseño y el sprite de `index.html` pasa a ser artefacto generado. BR.1 (estructura + estándar + extracción de los 100 símbolos + 17 plantillas) cerrada el 2026-07-05.

#### BR.2 - Script de sincronización biblioteca → sprite
- Prioridad  : alta (sin esto, reemplazar un SVG de la biblioteca no llega a la app)
- Estado     : pendiente
- Objetivo   : `scripts/sync-sprite.py` regenera el bloque del sprite de `index.html` desde `assets/svg/` : valida el estándar (viewBox, primitivas permitidas, decimales, complejidad), convierte los colores centinela de Illustrator a los roles finales (trazo desnudo / duotono .22 / chispa), excluye los `data-placeholder`, detecta colisiones de id y normaliza `b-googlegemini` → `b-gemini` (1 línea en `MARCAS`). Incluye test guardarraíl de igualdad biblioteca ↔ sprite (hermano de TX.4). Primera corrida debe producir un sprite idéntico al actual (extracción fue byte a byte).
- Secciones  : Transversal
- Archivos   : `scripts/sync-sprite.py` (nuevo), `index.html` (marcadores del bloque generado), `modules/core/constants.js` (1 línea), `tests/unit/` (guardarraíl nuevo)
- Depende de : nada
- Modelo     : Sonnet 5 - Alto

#### BR.3 - Primer lote de glifos propios (banca CO)
- Prioridad  : media (marca el arranque del flujo de diseño en pareja)
- Estado     : pendiente (espera los primeros SVG de Esteban)
- Objetivo   : recorrer el pipeline completo de punta a punta con los 10 bancos que hoy caen a iniciales: Esteban diseña y sobrescribe las plantillas de `assets/svg/logos/bancos/`, revisión en pareja según `assets/svg/README.md` sección 9 (render a 5 tamaños en ambos temas), sync, campo `simbolo: 'b-<slug>'` en cada fila de `BANCOS_CO`, bump de SW.
- Secciones  : Mis cuentas, Deudas, Calendario (toda teja de marca)
- Archivos   : `assets/svg/logos/bancos/*.svg`, `modules/core/constants.js`, `index.html` (vía sync), `service-worker.js`
- Depende de : BR.2 + SVG de Esteban
- Modelo     : Sonnet 5 - Medio (revisión visual + integración mecánica)

---

> Iniciativa de identidad visual 2026-07 ([ADR 023](DECISIONS/023-lenguaje-de-iconografia-propio.md) + [ADR 025](DECISIONS/025-logotipos-de-marca-y-tejas.md)): **COMPLETA**. ID.1, ID.4, ID.2, ID.6, MK.1, MK.2, ID.7 e ID.3 cerradas (2026-07-05). Nota de MK.1: Bancolombia, Davivienda, DaviPlata y demás bancos siguen con iniciales (regla de fidelidad ADR 025 D5, sin referencia vectorial confiable); agregar cada glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo` en `BANCOS_CO`. Nota de MK.2: ChatGPT, Prime Video, Disney+, Claro, Tigo, Rappi y Xbox están en `MARCAS` con iniciales (sin glifo en Simple Icons vigente); sumar un glifo futuro cuesta 1 `<symbol>` + 1 campo `simbolo` en `MARCAS`. Nota de ID.7: mountain, bolt y star conservan sus vértices agudos a propósito (regla 5 del ADR 023, metáfora primero); i-saldo e i-star no llevan punto de valor (la propia forma ya es la firma). Nota de ID.3: agregar una categoría nueva a cualquier catálogo cuesta 1 entrada en `CATEGORIA_*_ICONO` (y 1 `<symbol>` `c-*` si el glifo no existe); TX.4 avisa si el id no está en el sprite.

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
