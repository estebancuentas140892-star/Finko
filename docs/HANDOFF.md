# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-08-13. Última tarea cerrada: AH.7a, Ahorro en la barra inferior de móvil.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 4042/4042 verdes. 27 de CFG.2a y 4 de AH.7a sobre los 4011 de ANL.1c |
| Tests E2E | 266/266 verdes, sello escrito sobre el runtime de AH.7a. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v38 (`metas[].planAportes`, MT.6c; default `[]`) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `style=""` / `window.X` en módulos | 0 / 0 / 0 |
| Errores abiertos | **4**: ver [BUGS.md](BUGS.md). BUG-025 es el único con impacto en el uso diario y necesita decisión; BUG-027 (ADR 059 inexistente) es nuevo, solo documental |

---

## 2. Últimas 5 tareas cerradas

**AH.7a - Ahorro sube a la barra inferior, Calendario baja a "Más" (Navegación móvil), 2026-08-13**
Supersede el D1 del [ADR 024](DECISIONS/024-reorganizacion-navegacion-movil.md) con el [ADR 065](DECISIONS/065-ahorro-en-la-barra-inferior.md): la barra pasa a `Inicio · Gastos · [+] · Ahorro · Más` y Calendario baja al slot de ancho completo de la hoja. Es una entrada `nav-item--mobile-only` nueva, no una mudanza: la casa sigue encabezando el grupo del sidebar. La pestaña se enciende en toda la casa, así que `MAS_SECTIONS` pierde el grupo de ahorro y gana `agenda`. **`[href="#ahorro"]` ya no es único en el DOM:** todo selector nuevo declara plataforma. SW v520 → v521.

**CFG.2a - los ingresos brutos del monitor de renta se derivan solos (Análisis / Ajustes), 2026-08-13**
Cierra el hueco de captura que el [ADR 050](DECISIONS/050-perfil-fiscal-ubicacion-y-framing.md) dejó fuera de su alcance. `estimarIngresosBrutosAnio()` suma los recurrentes proyectados al año (`FACTOR_ANUAL_INGRESO` nueva en `infra/financiero.js`) más los puntuales del año. **Proyecta el año completo a propósito:** prorratear avisaría tarde, y el `tip` arranca con "Estimación" para no leerse como medido. El valor de Ajustes pasa de captura a override. SW v519 → v521 (bump compartido con AH.7a).

**ANL.1c - lectura de la card "Vs mes anterior" (Análisis), 2026-08-12**
Cierra **ANL.1 (Análisis interpreta) completa**, [ADR 046](DECISIONS/046-analisis-interpreta-criterio-y-lenguaje.md) D3. `lecturaComparacion()` responde lo que deltas y highlights no decían: si el mes en conjunto subió o bajó, con el mismo margen de ruido del 10 % de `lecturaTendencia()`. Reusa `totalActual`/`totalAnterior` que la comparación ya devolvía: sin barridos nuevos y dentro del memo diferido de PERF.3. Patrón semanal y hormigas se revisaron contra D3 y no se tocaron. SW v518 → v519.

**LIM.1b - los fijos no esenciales cuentan contra Estilo de vida (Límites / Mis cuentas), 2026-08-12**
Ejecuta el punto 8 de LIM.1 con el catálogo del [ADR 014](DECISIONS/014-taxonomia-categorias-transversal.md): Streaming y Suscripciones dejan de pesar como el arriendo. `CATEGORIAS_AGENDA_NO_ESENCIALES` es la fuente única; el ejecutado se reclasifica por `compromisoId` (el gasto se guarda como `'Gastos fijos'`, no con la categoría del compromiso) y el asignado resta `calcularFijosNoEsencialesMensuales()` del piso de Necesidades. **Estilo de vida es el residuo, así que absorbe la diferencia sin aritmética nueva.** `calcularGastosFijosMensuales` no cambia a propósito: de ella sale el objetivo del fondo de emergencia. SW v517 → v518.

**PE.6d - los cinco estados de Me deben se distinguen de un vistazo (Me deben), 2026-08-12**
Cierra **PE.6 (Me deben v2) completa**, D6 del [ADR 047](DECISIONS/047-me-deben-v2-intereses-e-historial.md). `chip-info` (ya existía en `atoms.css`) distingue "pago parcial" de "al día", que antes compartían el mismo `chip` neutro. `labelEstado()` acorta el copy ("Vence en N días"/"Vence hoy", simétrico con "Venció"; "Abono hoy"/"Abono..."). Solo `view.js` y `logic.js`, sin schema. Commit pendiente de hash en este cierre.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) (mes corriente) y [`docs/changelog/`](changelog/) (meses cerrados).

---

## 3. Qué sigue

- **En proceso:** nada. **MT.6 (Metas v2)**, **PE.6 (Me deben v2)**, **ANL.1 (Análisis interpreta)** y **AH.7 (Ahorro)** completas, con todas sus rebanadas cerradas. De LIM.1 queda **LIM.1c** (espera el ADR 044). **LG.2d desbloqueada** por el ADR 046 D4 y ya sin ninguna rebanada de ANL.1 por delante. **CFG.2a cerrada**, así que CFG.2c (reubicar lo fiscal, ADR 050 D1) queda con menos preguntas que mover. De CFG.5 quedan CFG.5b (re-autenticacion en acciones criticas, habilitada por CFG.5a) y CFG.5c (spike de biometria). Iniciativa CAT (categorías) completa: CAT.1, CAT.2, CAT.3 y CAT.4 cerradas. Iniciativa GAS.2 (toast de confirmación) completa: GAS.2a, GAS.2b y GAS.2c cerradas. La siguiente tarjeta se elige del índice de pendientes de [`BOARD.md`](BOARD.md) (primeras ~50 líneas, no hace falta cargar el archivo completo).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: sincronización multidispositivo ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md)) y los demás ADR en estado Abierta (ver la columna Estado de cada tarjeta del tablero).
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
