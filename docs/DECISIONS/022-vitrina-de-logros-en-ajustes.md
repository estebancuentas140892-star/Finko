# ADR 022 - Vitrina de logros: card en Ajustes, no sección propia

**Estado:** Aceptada
**Fecha:** 2026-07-04
**Autores:** Claude Fable 5 (análisis y decisión, sesión autónoma autorizada por Esteban)
**Resuelve:** LG.1b (sección de Logros).

---

## Contexto

Los logros existen desde G.3: un catálogo `LOGROS` en `logros/logic.js`, la lista de desbloqueados en `S.logros` y un toast con confetti al desbloquear (pulido en LG.1a). Lo que falta es un lugar donde verlos todos: conseguidos, pendientes, progreso parcial y cómo desbloquearlos. LG.1b pedía decidir entre sección propia, tarjeta en Inicio o tarjeta en Ajustes, y qué logros muestran progreso parcial.

## Decisión

**Los logros se muestran en una card "🏆 Logros" dentro de Ajustes, renderizada por el propio dominio `logros` en un contenedor del shell (`#panel-logros`), al final de la sección.**

1. **No sección propia:** la navegación ya tiene 13 secciones y los logros no son un destino de uso diario ni tienen acciones: son una vitrina de solo lectura. Una sección más diluye la navegación para una vista que se consulta ocasionalmente.
2. **No en Inicio:** las decisiones IN.1-IN.3 curaron Inicio como estado financiero del día (hero, vencidos, resumen semanal). Una vitrina de trofeos ahí es ruido permanente.
3. **Ajustes es el lugar natural de la meta-información** (perfil, datos, acerca de). El momento de descubrimiento sigue siendo el toast (LG.1a); la vitrina es el "ver todos" y va al final de Ajustes, como "Acerca de": quien entra a cambiar un ajuste no paga el scroll.
4. **Arquitectura sin import cruzado:** `config` no puede importar `logros` (ADN #10), así que la card NO se renderiza dentro de `renderPanelConfig`. El shell (`index.html`) expone `#panel-logros` junto a `#panel-config` y el dominio `logros` renderiza ahí su propia vista (`logros/view.js`, nuevo), igual que cada dominio renderiza su panel.

### Progreso parcial

Se extiende el catálogo con dos campos opcionales por logro:

- **`hint`** (todos): instrucción imperativa de cómo desbloquearlo ("Registra 10 gastos."). Los desbloqueados muestran `desc` (lo que se consiguió); los pendientes muestran `hint`.
- **`progreso(s)`** (solo logros de conteo): devuelve `{ actual, meta }`. Se aplica únicamente donde el objetivo es un conteo observable directo de `S` sin lógica de dominio: `diez-gastos` (n de 10) y `diversificador` (n de 3 cuentas activas). Los logros binarios ("primer X") no tienen progreso intermedio, y el del fondo de emergencia ya vive con más detalle en su propia sección (anillo de progreso de Ahorro): duplicarlo aquí exigiría replicar el cálculo de gastos fijos en `logros`.

La función pura `estadoLogros(s, idsPersistidos)` arma la lista para la vista: desbloqueado = persistido en `S.logros` o cumplido en vivo (la persistencia manda: un logro ganado no se revoca aunque el estado retroceda).

## Consecuencias

### Positivas

- LG.1b se cierra sin tocar router, navegación ni Inicio; cero riesgo de regresión.
- El catálogo gana `hint`/`progreso` reutilizables si algún día se quiere otra superficie (ej. un logro destacado en el toast).
- El patrón "dominio renderiza su card en un contenedor del shell dentro de la sección de otro" queda documentado para casos futuros (es el mismo espíritu del banner de propósito).

### Negativas / Restricciones

- Descubribilidad menor que una sección propia: mitigada porque el toast ya anuncia cada desbloqueo y Ajustes es una sección visitada.
- La card vive al final de Ajustes: quien busque sus logros debe hacer scroll. Aceptado a cambio de no penalizar el uso frecuente de Ajustes.
