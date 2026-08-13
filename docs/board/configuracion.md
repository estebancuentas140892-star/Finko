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
