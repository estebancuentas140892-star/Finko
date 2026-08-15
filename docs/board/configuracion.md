# Tablero - Configuración

> Revisado: 2026-08-15.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `config`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Configuración (dominio `config`)

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"), **completa**. Alcance y sus dos decisiones: **[ADR 050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**, su dueño. Ficha: [`contexto/configuracion.md`](../contexto/configuracion.md). CFG.2a cerró el 2026-08-13 (ingresos brutos derivados) y CFG.2c cerró el mismo día (D1: lo fiscal pasa a un asistente tras botón).

> **Iniciativa CFG.3** ("Avisos anticipatorios"), **completa** (2026-08-13, sus tres rebanadas). Alcance, el límite técnico y las alternativas rechazadas: **[ADR 066](../DECISIONS/066-motor-unico-de-avisos.md)**, su dueño. Ficha: [`contexto/inicio.md`](../contexto/inicio.md) (el panel de Inicio), [`contexto/configuracion.md`](../contexto/configuracion.md) (el interruptor de Ajustes) y [`contexto/transversal.md`](../contexto/transversal.md) (el motor).

> **Iniciativa CFG.4** ("Durabilidad de los datos"), **desbloqueada el 2026-08-15**. Alcance, las cuatro razones para descartar cuentas y sincronización, y las tres palancas elegidas: **[ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)**, su dueño (Aceptado). Lo que ese ADR decidió no se re-discute acá: **CFG.4a** (`navigator.storage.persist()`, D2.1) y **CFG.4b** (sello del último respaldo + aviso, D2.2) cerraron el 2026-08-15. Quedan dos rebanadas.

#### CFG.4c - Respaldo cifrado opcional con contraseña
- Prioridad  : media
- Estado     : pendiente. Ejecuta **D2.3** del [ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)
- Área       : ambos
- Objetivo   : que el archivo exportado pueda ir cifrado (hoy el JSON va en claro y trae el historial financiero completo), con importación que detecta y descifra sin que el usuario elija formato
- Secciones  : Configuración (Ajustes)
- Archivos   : `modules/dominio/config/index.js` (`_exportarDatos()`, `_importarDatos()`), módulo nuevo de cifrado en `modules/infra/`, `modules/dominio/config/view.js`
- Depende de : nada. Suma un cuarto call site al guard de CFG.5b: decide su patrón por la regla de esa tarjeta, no copiando el de al lado
- Modelo     : capacidad alta, esfuerzo medio. **Restricción del ADR:** la clave no se recupera, y la pantalla lo dice con esas palabras

#### CFG.4d - Cerrar la cláusula de cambio de modelo en el paquete legal
- Prioridad  : baja
- Estado     : pendiente. Ejecuta el efecto de **D1** del [ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md) sobre la iniciativa LEG
- Área       : code (solo documentos, sin runtime)
- Objetivo   : los 11 documentos de `docs/legal/` se redactaron con una reserva "si el modelo cambia (CFG.4)". Con el ADR cerrado esa reserva deja de ser reserva: no habrá cuentas ni custodia de terceros
- Secciones  : Centro Legal (Ajustes)
- Archivos   : `docs/legal/*.md`
- Depende de : nada. **No** resuelve el checklist de contenido de LEG.2 (responsable, correo, licencia): eso sigue esperando a Esteban
- Modelo     : capacidad media, esfuerzo bajo

> **Iniciativa CFG.5** ("Seguridad de acceso"), **completa** (sus tres rebanadas). Alcance, framing honesto y alternativas rechazadas (cifrado real, patrón, biometría, contraseña de cuenta): **[ADR 063](../DECISIONS/063-candado-de-acceso-local.md)**, su dueño. CFG.5a (candado con PIN local) cerró el 2026-08-12. CFG.5c cerró el 2026-08-13 sin código (biometría descartada, [ADR 067](../DECISIONS/067-biometria-descartada-como-desbloqueo.md)). **CFG.5b cerró el 2026-08-13:** re-autenticación con PIN en borrar todo, exportar respaldo e importar respaldo. Si CFG.4 avanza, sumará cerrar cuenta / cambiar contraseña.
