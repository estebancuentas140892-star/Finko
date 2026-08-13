# Tablero - Configuración

> Revisado: 2026-08-13.

> Satélite de [`BOARD.md`](../BOARD.md) (dominio `config`). Reglas de uso, plantilla de tarjeta y skill `triaje-tarea`: ver el índice.

---

### Configuración (dominio `config`)

> **Iniciativa fusionada CFG.1 + CFG.2** ("Perfil fiscal/financiero en Ajustes"), **completa**. Alcance y sus dos decisiones: **[ADR 050](../DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md)**, su dueño. Ficha: [`contexto/configuracion.md`](../contexto/configuracion.md). CFG.2a cerró el 2026-08-13 (ingresos brutos derivados) y CFG.2c cerró el mismo día (D1: lo fiscal pasa a un asistente tras botón).

> **Iniciativa CFG.3** ("Avisos anticipatorios"), **completa** (2026-08-13, sus tres rebanadas). Alcance, el límite técnico y las alternativas rechazadas: **[ADR 066](../DECISIONS/066-motor-unico-de-avisos.md)**, su dueño. Ficha: [`contexto/inicio.md`](../contexto/inicio.md) (el panel de Inicio), [`contexto/configuracion.md`](../contexto/configuracion.md) (el interruptor de Ajustes) y [`contexto/transversal.md`](../contexto/transversal.md) (el motor).

#### CFG.4 - Respaldo, cuentas de usuario y sincronización multi-dispositivo [DECISIÓN DE ADN]
- Prioridad  : sin definir (la decisión es la de mayor alcance del proyecto)
- Estado     : decisión sin tomar. Ver **[ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)** (Abierta, ninguna dirección elegida). No implementar nada de este alcance sin ese ADR resuelto.
- Objetivo   : hoy solo existe exportar a JSON/CSV manual; el usuario teme perder todo el historial si pierde el teléfono, cambia de equipo, desinstala o formatea.
- Motivo     : toca el ADN del proyecto de frente (reglas 2 y 3: offline-first, sin servidor, sin cuenta, sin sync). Por instrucción directa de CLAUDE.md sección 4, requiere ADR y discusión explícita antes de cualquier código.
- Secciones  : Configuración (Ajustes), transversal (afecta el modelo entero de datos y la identidad del producto)
- Depende de : el ADR 043 resuelto. Ese ADR trae, si avanza, sus propios avisos: activar el disparador D4 del [ADR 030](../DECISIONS/030-persistencia-diferir-rewrite-salvaguarda-cuota.md) y avisar a la iniciativa LEG antes de que redacte
- Modelo     : ver el ADR 043 antes de iniciar cualquier cosa

> **Iniciativa CFG.5** ("Seguridad de acceso"), **completa** (sus tres rebanadas). Alcance, framing honesto y alternativas rechazadas (cifrado real, patrón, biometría, contraseña de cuenta): **[ADR 063](../DECISIONS/063-candado-de-acceso-local.md)**, su dueño. CFG.5a (candado con PIN local) cerró el 2026-08-12. CFG.5c cerró el 2026-08-13 sin código (biometría descartada, [ADR 067](../DECISIONS/067-biometria-descartada-como-desbloqueo.md)). **CFG.5b cerró el 2026-08-13:** re-autenticación con PIN en borrar todo, exportar respaldo e importar respaldo. Si CFG.4 avanza, sumará cerrar cuenta / cambiar contraseña.
