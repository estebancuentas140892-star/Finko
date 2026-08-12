# Tablero - Configuración

> Revisado: 2026-08-12.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `config`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Configuración (dominio `config`)

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"). **No iniciar ninguna sin instrucción explícita.** Alcance y sus dos decisiones, ambas tomadas: **[ADR 050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**, su dueño. Ficha: [`contexto/configuracion.md`](../contexto/configuracion.md). El hueco que queda es el de CFG.2a, abajo; CFG.2c ejecuta la reubicación.

#### CFG.2c - Reubicar lo fiscal: asistente bajo demanda en Ajustes + interpretación en Análisis
- Prioridad  : sin definir
- Estado     : pendiente. Ejecuta la decisión D1 del **[ADR 050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)** (ya tomada). Conviene DESPUÉS de CFG.2a, que reduce cuántas preguntas quedan en el asistente.
- Objetivo   : los 2 bloques fiscales dejan de renderizarse permanentes en Ajustes y pasan a un asistente tras botón; la interpretación se consolida en Análisis (coordinar con el layout de ANL.1).
- Secciones  : Configuración (Ajustes), Análisis
- Archivos   : `modules/dominio/config/view.js`/`index.js` (los 2 forms actuales), `modules/dominio/analisis/view.js`
- Depende de : CFG.2a; coordinar con ANL.1
- Modelo     : Equilibrado - Alto (reubicación de UX sin lógica fiscal nueva)

#### CFG.2a - Auto-derivar ingresos brutos del año al monitor de renta
- Prioridad  : sin definir
- Estado     : pendiente (parte 2 de la iniciativa fusionada; depende de CFG.1a, cerrada)
- Objetivo   : el criterio "Ingresos brutos" del monitor de renta (K.3) hoy exige que el usuario lo teclee a mano en Datos de renta. Anualizar `S.ingresos` (recurrentes, por `frecuencia`) + sumar `S.ingresosPuntuales` del año para estimarlo automáticamente, de modo que pase de "Sin datos" a medible sin captura manual. Mantener el override manual si el usuario prefiere. `consumosTC` y `consignaciones` siguen manuales (no derivables: no hay tipo de cuenta "tarjeta de crédito", ni movimientos bancarios crudos). _(Nota de triaje 2026-07-08: si **MC.16** (tarjeta de crédito como producto integrado) se implementa, `consumosTC` pasaría a ser derivable automáticamente; revisar esta tarjeta en ese momento.)_
- Secciones  : Configuración (Ajustes), Análisis (monitor de renta), transversal (lee ingresos)
- Archivos   : `modules/dominio/analisis/logic.js` (`calcularEstadoRenta`, nueva `estimarIngresosBrutosAnio`), `modules/dominio/tesoreria/logic/ingresos.js` (helper de anualización si aplica)
- Depende de : CFG.1a (cerrada)
- Modelo     : Alta capacidad - Alto (lógica financiera CO no trivial: anualización de ingresos + interpretación de "ingresos brutos" DIAN)

#### CFG.3 - Notificaciones inteligentes anticipatorias
- Prioridad  : sin definir
- Estado     : pendiente de análisis (no iniciar)
- Objetivo   : hoy el recordatorio existente solo avisa al abrir la app; el usuario quiere alertas que se anticipen a eventos (día de pago hoy, deuda vence mañana, pago con 2 días de atraso, cerca de superar presupuesto de una categoría, meta de ahorro alcanzada, aporte recomendado de la semana, apartado próximo a vencer). Pidió explícitamente que sean útiles y no invasivas: solo cuando realmente ayuden a decidir mejor. **Fuente añadida por triaje del 3.er lote (2026-07-08, brief Me deben punto 6):** vencimientos de préstamos personales ("mañana vence el préstamo de Juan", "han pasado 5 días desde el vencimiento"), con lenguaje amable orientado a recordar, nunca a presionar; `Personal.fechaLimite` ya existe como dato. Un solo motor de recordatorios para todas las fuentes, no uno por sección.
- Secciones  : Configuración (Ajustes, activación), transversal (agenda, presupuesto, metas, apartados, compromisos, personales como fuentes de los eventos)
- Archivos   : sin explorar; depende de si Finko ya usa alguna API de notificaciones del navegador/PWA (revisar `modules/infra/notificaciones.js` y el service worker) o si hay que incorporar Push API / Notification API, lo cual tiene restricciones de permisos y de plataforma (iOS Safari limita notificaciones push de PWA)
- Depende de : nada. Riesgo técnico a evaluar primero: viabilidad real de notificaciones push offline-first sin servidor (ADN 2 y 3); puede requerir ADR si la solución técnica choca con "sin servidor".
- Modelo     : Máxima capacidad - Alto (multidominio, con una restricción técnica de plataforma no trivial que hay que investigar antes de diseñar)

#### CFG.4 - Respaldo, cuentas de usuario y sincronización multi-dispositivo [DECISIÓN DE ADN]
- Prioridad  : sin definir (la decisión es la de mayor alcance del proyecto)
- Estado     : decisión sin tomar. Ver **[ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)** (Abierta, ninguna dirección elegida). No implementar nada de este alcance sin ese ADR resuelto.
- Objetivo   : hoy solo existe exportar a JSON/CSV manual; el usuario teme perder todo el historial si pierde el teléfono, cambia de equipo, desinstala o formatea.
- Motivo     : toca el ADN del proyecto de frente (reglas 2 y 3: offline-first, sin servidor, sin cuenta, sin sync). Por instrucción directa de CLAUDE.md sección 4, requiere ADR y discusión explícita antes de cualquier código.
- Secciones  : Configuración (Ajustes), transversal (afecta el modelo entero de datos y la identidad del producto)
- Depende de : el ADR 043 resuelto. Ese ADR trae, si avanza, sus propios avisos: activar el disparador D4 del [ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) y avisar a la iniciativa LEG antes de que redacte
- Modelo     : ver el ADR 043 antes de iniciar cualquier cosa

> **Iniciativa CFG.5** ("Seguridad de acceso"). Alcance, framing honesto y alternativas rechazadas (cifrado real, patrón, biometría, contraseña de cuenta): **[ADR 063](../DECISIONS/063-candado-de-acceso-local.md)**, su dueño. CFG.5a (candado con PIN local) cerró el 2026-08-12. Quedan las dos de abajo.

#### CFG.5b - Re-autenticación con PIN en acciones críticas
- Prioridad  : sin definir
- Área       : code
- Estado     : pendiente. Habilitada por CFG.5a: `verificarPin()` y el freno ya existen (`modules/dominio/config/bloqueo.js`).
- Objetivo   : las acciones que no se pueden deshacer exigen el PIN aunque la app ya esté abierta: restablecer la app, borrar toda la información y exportar el respaldo completo (hoy solo piden `confirmar()`). Con candado apagado no piden nada: el guard no puede convertirse en un muro para quien nunca activó el candado.
- Secciones  : Configuración (Ajustes), transversal (el guard envuelve acciones de varios lugares)
- Archivos   : `modules/ui/bloqueo-acceso.js` (diálogo en promesa, mismo contrato que `confirmar()` de `modules/ui/confirm.js`), `modules/dominio/config/index.js` (`_resetearApp`, `_exportarDatos`, `_importarDatos`)
- Depende de : CFG.5a (cerrada). Si CFG.4 avanza, suma cerrar cuenta / cambiar contraseña.
- Modelo     : Equilibrado - Alto (patrón ya fijado por el ADR 063; el trabajo es el guard y su cobertura)

#### CFG.5c - Biometría en PWA: verificar antes de prometer
- Prioridad  : sin definir
- Área       : code
- Estado     : pendiente. **Spike, no implementación:** el ADR 063 rechazó prometerla sin evidencia en el dispositivo real de Esteban (mismo criterio del ADR 030).
- Objetivo   : responder si huella o rostro pueden desbloquear Finko sin servidor. WebAuthn no entrega una credencial comparable contra un hash local sin un verificador, y el soporte de `navigator.credentials` varía por navegador y por sistema operativo. Salida esperada: un ADR que decida implementarla o descartarla por escrito, no una pantalla nueva.
- Secciones  : Configuración (Ajustes)
- Archivos   : sin explorar (depende del resultado del spike)
- Depende de : CFG.5a (cerrada) + prueba en el dispositivo real, no en el emulador
- Modelo     : Alta capacidad - Alto (viabilidad de plataforma con restricciones no triviales; la conclusión importa más que el código)

#### CFG.6 - Revisión general de la sección Ajustes
- Prioridad  : sin definir
- Área       : design (auditoría visual y de layout, sin lógica nueva)
- Estado     : **parcialmente ejecutada (2026-08-02).** Los pases de 2026-07-25 y 2026-08-02 ya aplicaron 12 de 13 hallazgos. El pase 2026-08-02 (escritorio/tablet + tema claro) corrigió "Instalar Finko" y "Activar recordatorios", que se estiraban a ancho completo en tablet (768px) y escritorio (1280px): mismo `align-self: flex-start` que ya tenían "Guardar perfil" y los botones de zona de peligro (ver CHANGELOG). Tema claro revisado por código (100% `var(--fk-*)`, sin color hardcodeado); sin captura visual real, el Browser pane no compuso frames en esa sesión. **Lo que sigue abierto en esta tarjeta:** (1) el inventario de qué configuraciones *faltan* en Ajustes, que es lo que la ata a CFG.1 a CFG.5; el Bento Grid a escritorio queda como mejora futura, no bloquea nada (medido: panel de 982px a 1280px, columna única, sin bug).
- Objetivo   : el usuario pidió revisar si faltan configuraciones que deberían vivir en Ajustes, con el objetivo de que la sección se convierta en el centro de configuración de Finko (seguridad, personalización, notificaciones, respaldo y cualquier otra opción relevante), con interfaz clara y organizada. **Ampliado por triaje del 4.º lote (2026-07-08, brief de Ajustes punto 2):** rediseño visual de la sección con tarjetas de tamaño uniforme, Bento Grid donde aporte, bloques compactos y alineados, sin botones que ocupen todo el ancho en desktop (hoy: "Instalar aplicación", "Recordatorios"); misma sensación de orden que el resto de la app (coordina con IV.2). **7.º lote:** el layout debe reservar el bloque del **Centro Legal** (iniciativa LEG, Transversal).
- Secciones  : Configuración (Ajustes)
- Archivos   : `modules/dominio/config/view.js`, `styles/components/config.css`
- Depende de : CFG.2a/CFG.2c, CFG.3 y CFG.4 (esta es la pasada de auditoría/orden final, tiene sentido hacerla después o junto con las demás, no antes). El frente de seguridad ya dejó su bloque en el layout con CFG.5a.
- Modelo     : Equilibrado - Alto (auditoría de una sección existente con criterio de UX, sin lógica financiera nueva)
