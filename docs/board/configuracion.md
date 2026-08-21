# Tablero - Configuración

> Revisado: 2026-08-20.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `config`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Configuración (dominio `config`)

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"), **completa**. Alcance y sus dos decisiones: **[ADR 050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**, su dueño. Ficha: [`contexto/configuracion.md`](../contexto/configuracion.md). CFG.2a cerró el 2026-08-13 (ingresos brutos derivados) y CFG.2c cerró el mismo día (D1: lo fiscal pasa a un asistente tras botón).

> **Iniciativa CFG.3** ("Avisos anticipatorios"), **completa** (2026-08-13, sus tres rebanadas). Alcance, el límite técnico y las alternativas rechazadas: **[ADR 066](../DECISIONS/066-motor-unico-de-avisos.md)**, su dueño. Ficha: [`contexto/inicio.md`](../contexto/inicio.md) (el panel de Inicio), [`contexto/configuracion.md`](../contexto/configuracion.md) (el interruptor de Ajustes) y [`contexto/transversal.md`](../contexto/transversal.md) (el motor).

> **Iniciativa CFG.4** ("Durabilidad de los datos"), **completa** (sus cuatro rebanadas, 2026-08-15). Alcance, las cuatro razones para descartar cuentas y sincronización, y las tres palancas elegidas: **[ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)**, su dueño (Aceptado). **CFG.4a** (`navigator.storage.persist()`, D2.1), **CFG.4b** (sello del último respaldo + aviso, D2.2), **CFG.4c** (respaldo cifrado con contraseña, D2.3) y **CFG.4d** (cláusula de cambio de modelo cerrada en cinco documentos de `docs/legal/`, cambio menor sin re-aceptación) cerraron el mismo día. El checklist de contenido de LEG.2 (responsable, correo, licencia) sigue esperando a Esteban, sin relación con esta iniciativa.

> **Iniciativa CFG.5** ("Seguridad de acceso"), **completa** (sus tres rebanadas). Alcance, framing honesto y alternativas rechazadas (cifrado real, patrón, biometría, contraseña de cuenta): **[ADR 063](../DECISIONS/063-candado-de-acceso-local.md)**, su dueño. CFG.5a (candado con PIN local) cerró el 2026-08-12. CFG.5c cerró el 2026-08-13 sin código (biometría descartada, [ADR 067](../DECISIONS/067-biometria-descartada-como-desbloqueo.md)). **CFG.5b cerró el 2026-08-13:** re-autenticación con PIN en borrar todo, exportar respaldo e importar respaldo. **No suma más call sites:** el ADR 043 D1 mató la rama de cerrar cuenta / cambiar contraseña, y CFG.4c decidió que la contraseña del archivo cifrado es otro secreto, no un cuarto uso del PIN.

---

#### CFG.6 - auditoría UX/UI móvil de Ajustes, la sección que el handoff no cubrió
- Prioridad  : media
- Estado     : no iniciar (hasta que cierren las fichas 17, 18 y 19 de MOV.1)
- Área       : ambos (primero design, porque la pantalla no tiene ficha de auditoría; después el código que decida su ADR)
- Objetivo   : Ajustes es la única de las 15 secciones de la app sin ficha en el handoff móvil, y es donde la ficha 03 metió Logros. Cinco iniciativas CFG cerraron dentro de ella (perfil fiscal, avisos, durabilidad, candado) y nadie las midió juntas en una pantalla de 390px
- Riesgo     : cuatro de sus bloques tienen ADR propio ([050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md), [063](../DECISIONS/063-candado-de-acceso-local.md)/[067](../DECISIONS/067-biometria-descartada-como-desbloqueo.md), [043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), [066](../DECISIONS/066-motor-unico-de-avisos.md)). Moverlos o replegarlos exige un ADR que acote, nunca en silencio
- Secciones  : Ajustes (`sec-config`); roza Inicio y Logros
- Archivos   : `modules/dominio/config/**`, `styles/components/config.css`, `docs/contexto/configuracion.md`
- Depende de : MOV.1 fichas 17 y 19 (contenido y vitrina de Logros, que viven dentro de Ajustes) y 18 (consolida R86 a R89, que la ficha nueva debe obedecer)
- Absorbe    : la dependencia que DSK.1 dejó abierta, "Personalizar accesos" sin entrada en escritorio y necesitando sitio en Ajustes
- Aceptación : design -> ficha de auditoría con hallazgos medidos a 390px y su ADR aceptado; code -> lo que el ADR decida, con tests y verificación en la app
- Modelo     : capacidad alta con esfuerzo alto para la ficha. No hay bloque vigente de la pantalla completa: el primer paso es el análisis profundo
