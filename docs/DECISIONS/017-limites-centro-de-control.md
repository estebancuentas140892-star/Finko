# ADR 017 - Límites de gasto como centro de control de los 3 grupos financieros

**Estado:** Propuesta (diseño). Decisiones de modelo cerradas con el usuario; el detalle de cada slice se afina al implementarlo.
**Fecha:** 2026-06-30
**Autores:** Esteban (producto), Claude Opus 4.8 (diseño)
**Relación:** implementa la épica **MC.5**. Reutiliza el mapeo sección → grupo de [ADR 014](014-taxonomia-categorias-transversal.md) (TX.5) y toma el presupuesto por grupo del modelo de distribución de [ADR 013](013-distribucion-automatica-inteligente.md) (MC.6a). Se beneficia de los refinamientos [MC.10 y MC.11](../TASKS.md) del modelo de distribución.

---

## Contexto

Hoy **Límites de gasto** (dominio `presupuesto`) es un envelope budgeting simple: el usuario fija un tope mensual **por categoría de gasto** (Restaurantes, Mercado, etc.) y la sección muestra el progreso contra los gastos del mes de esa categoría (`calcularProgreso`, umbrales 75% alerta / 100% excedido). Solo mira `S.gastos`, es decir, solo el grupo **Estilo de vida**. No ve las **Necesidades** (gastos fijos, deudas, Agenda) ni el **Ahorro** (fondo, metas, apartados, inversiones).

En paralelo, **Mis cuentas** ya organiza el dinero en tres grupos con "Distribuir mi ingreso": `sugerirDistribucionIngreso` (MC.6a) reparte el ingreso mensual en **Necesidades / Estilo de vida / Ahorro** y devuelve el monto objetivo de cada grupo. Y [ADR 014](014-taxonomia-categorias-transversal.md) (TX.5) ya dejó el mapeo canónico sección → grupo en `constants.js`:

```
GRUPO_POR_SECCION = {
  agenda: 'necesidades', deudas: 'necesidades',
  gastos: 'estilo-de-vida',
  apartados: 'ahorro', metas: 'ahorro', ahorro: 'ahorro', inversion: 'ahorro',
}
```

El usuario propone cerrar el círculo: **Mis cuentas planifica** (reparte el ingreso en 3 grupos) y **Límites de gasto hace seguimiento** a esa planificación. Límites deja de ser solo un configurador de topes y se convierte en un **centro de control**: para cada grupo muestra el presupuesto asignado, lo ejecutado, lo restante y el porcentaje consumido, y acompaña con alertas inteligentes a medida que avanza el mes. Las dos secciones trabajan integradas: una decide el plan, la otra vigila su cumplimiento y ayuda a corregir el rumbo antes de perder el control.

---

## Decisión

### 1. Reorganizar Límites alrededor de los 3 grupos financieros

La sección pasa a estructurarse en los **tres grupos** de `GRUPOS_FINANCIEROS` (`necesidades`, `estilo-de-vida`, `ahorro`), reusando `clasificarSeccionEnGrupo` y `LABEL_GRUPO_FINANCIERO`. Para cada grupo se muestra, en tiempo real y para el mes en curso:

- **Presupuesto asignado** (el objetivo del grupo).
- **Ejecutado** (lo que ya se movió este mes hacia ese grupo).
- **Restante** (asignado menos ejecutado).
- **Porcentaje consumido** y **estado** (`ok` / `alerta` / `excedido`), reusando los umbrales actuales (75% / 100%).

Cada grupo puede **desglosarse en sus fuentes** (detalle por item): Necesidades por gasto fijo y por deuda; Ahorro por destino (fondo, metas, apartados, inversiones); Estilo de vida por categoría (los topes actuales, ver decisión 4).

### 2. El presupuesto asignado por grupo sale de la distribución (MC.6)

**Decisión del usuario.** El objetivo de cada grupo **no se pide de nuevo**: se toma del reparto que ya calcula "Distribuir mi ingreso". Límites consume el resultado de `sugerirDistribucionIngreso(ingresoMensual, contexto)` y usa `split.necesidades.monto`, `split.estiloVida.monto` y `split.ahorro.monto` como el asignado de cada grupo.

- **Integración total y cero fricción:** el usuario planifica una vez en Mis cuentas y el seguimiento aparece solo, sin datos nuevos que capturar.
- **Normalización mensual:** el asignado es el reparto sobre el ingreso mensual (la distribución ya opera sobre `ingresoMensual`), así que sirve como presupuesto del mes aunque el ingreso sea quincenal.
- **Dependencia sana con MC.10/MC.11:** como el asignado sale de la distribución, cualquier mejora del modelo (piso de ahorro de MC.10, detección de déficit de MC.11) mejora también Límites sin tocar esta sección. MC.5 se puede construir sobre el modelo actual y afinar cuando MC.10/MC.11 entren. Si la distribución reporta déficit (Necesidades >= ingreso), Límites lo refleja en vez de inventar un presupuesto.
- Se descartó el objetivo **manual por grupo** y el **híbrido editable** (ver Alternativas): el usuario eligió la integración pura para evitar duplicar la decisión de reparto y no sumar schema.

### 3. El ejecutado por grupo se deriva de los flujos del mes (sin schema nuevo)

Lo ejecutado de cada grupo se **agrega desde los datos que cada dominio ya guarda**, filtrando por el mes en curso. No se crea estructura nueva en `S`:

- **Necesidades:** pagos de gastos fijos marcados en Agenda + abonos/pagos de deuda del mes.
- **Estilo de vida:** `gastosMes(S.gastos)` del mes (lo que Límites ya calcula hoy).
- **Ahorro:** aportes del mes al fondo de emergencia (`S.ahorro.aportes`), a apartados, abonos a metas y aportes a inversiones.

`logic.js` se mantiene **puro**: recibe los flujos ya sumados por dominio (la orquestación en `index.js` los lee de `S` y los pasa), respetando la regla de que ningún dominio importa a otro. El detalle exacto de cada accesor por dominio se cierra en el primer slice de implementación.

> Nota de fidelidad: el ejecutado de Necesidades y Ahorro es tan bueno como el registro del usuario (que marque pagos y aportes con su fecha). Donde un dominio no distinga bien "pagado este mes", el ejecutado de ese grupo será aproximado; conviene ser honestos en el copy ("según lo que registras en Finko"), coherente con el principio orientativo del proyecto.

### 4. Los topes por categoría se conservan dentro de Estilo de vida

**Decisión del usuario.** El envelope budgeting actual (`S.presupuestos`, un tope por categoría de gasto) **no se elimina ni se migra**: se re-enmarca visualmente como el **detalle del grupo Estilo de vida**. El resumen de los 3 grupos va arriba; al desplegar Estilo de vida se ven los topes por categoría que ya existen, con su mismo `calcularProgreso`.

- En v1, **Necesidades y Ahorro** muestran su desglose **derivado** (por fijo/deuda y por destino), sin topes manuales por item. Su presupuesto es el del grupo (decisión 2).
- Nada de lo que el usuario ya configuró se pierde; `S.presupuestos` sigue igual, sin migración ni bump de `SCHEMA_VERSION`.

### 5. Alertas inteligentes por grupo y por item

Límites acompaña el mes con mensajes derivados del estado de cada grupo/item, reusando los umbrales existentes (75% alerta, 100% excedido) y el patrón de nudges de la app. Las funciones que los generan viven en `logic.js` (puras, testeables); la UI los muestra como nudges calmados o de aviso según el estado. Ejemplos aprobados por el usuario como norte del tono:

- "Ya usaste el 80% de tu presupuesto para restaurantes. Intenta moderar este tipo de gastos los próximos días." (item de Estilo de vida en alerta)
- "Vas por buen camino. Cumpliste con el ahorro programado para este período." (Ahorro en verde)
- "Tus gastos de estilo de vida están creciendo más rápido de lo previsto. Revisa si puedes reducir algunos consumos." (Estilo de vida cerca del tope)
- "Cumpliste todas tus necesidades este mes y aún tienes dinero para ahorrar. Excelente trabajo." (refuerzo positivo)

Tono obligatorio (ADN regla 11, estilo regla 7.1): voz "tú", cercano, "dinero" (no "plata"), cero guion largo, orientativo (nunca prescriptivo).

### 6. Sin schema nuevo en v1

Todo el centro de control es **derivado** (asignado desde la distribución, ejecutado desde los flujos por dominio) más el reuso de `S.presupuestos`. No se bumpea `SCHEMA_VERSION`. Un eventual objetivo por grupo editable (el híbrido que el usuario no eligió) quedaría para un ADR posterior con su propio schema; hoy no se hace.

### 7. Relación explícita con Mis cuentas

La complementariedad se hace visible en el producto: **Mis cuentas planifica, Límites vigila**. Se cuida con copy y con un CTA cruzado ("Ajusta tu distribución en Mis cuentas") para que el usuario entienda que el presupuesto que ve en Límites es el que definió al distribuir su ingreso. El banner de propósito de Límites (EP.2, ADR 016) se revisa para alinearlo con esta identidad de seguimiento.

---

## Alternativas consideradas

- **Presupuesto por grupo manual** (el usuario fija metas de gasto por grupo en Límites). Da control fino pero duplica la decisión de reparto que ya se toma en Mis cuentas y exige schema para guardar los objetivos. Descartada por el usuario a favor de la integración con la distribución.
- **Híbrido: auto desde la distribución pero editable.** Más flexible, pero suma complejidad (guardar el objetivo editado, resolver conflictos cuando la distribución cambia) y schema. Descartada por el usuario para v1; queda como evolución posible.
- **Reemplazar los topes por categoría por seguimiento solo de grupo.** Más simple, pero se pierde el control fino por categoría (Restaurantes, Mercado) que el usuario ya usa. Descartada: los topes se conservan como detalle de Estilo de vida.
- **Crear un dominio nuevo (`control` o `centro`).** Más limpio conceptualmente, pero duplica infra y aleja el trabajo del envelope budgeting que ya vive en `presupuesto`. Se prefiere **extender el dominio `presupuesto`** reusando su `logic.js`, sus umbrales y sus progress bars.
- **Guardar un snapshot mensual del asignado/ejecutado.** Permitiría histórico, pero suma schema y complejidad. En v1 todo es en vivo sobre el mes en curso; el histórico puede ser un slice posterior si el usuario lo pide.

---

## Consecuencias

### Positivas

- **Cierra el círculo planificar → seguir:** Mis cuentas y Límites dejan de ser islas; el usuario ve si cumple el plan que definió.
- **Cero fricción y cero schema:** el asignado y el ejecutado son derivados; no se pide ningún dato nuevo ni se migra nada.
- **Máximo reuso:** `GRUPO_POR_SECCION` (ADR 014), `sugerirDistribucionIngreso` (ADR 013), los umbrales y las progress bars de `presupuesto`. Poca superficie nueva.
- **Educa con el hábito de los 3 grupos** de forma coherente con toda la app (ADR 014).
- **Escala con la distribución:** MC.10/MC.11 mejoran el asignado sin tocar Límites.

### Negativas / Restricciones

- **Acopla Límites a la distribución:** si el usuario no registra sus ingresos recurrentes, no hay asignado por grupo; hay que resolver bien ese estado vacío (guiar a Mis cuentas).
- **El ejecutado de Necesidades y Ahorro depende del registro del usuario** (marcar pagos y aportes con fecha); su fidelidad es menor que la de Estilo de vida, que ya se mide bien. El copy debe ser honesto.
- **La ventana es el mes en curso:** sin histórico en v1; comparaciones mes a mes quedan fuera del alcance inicial.
- **Más contenido en la sección:** el resumen de 3 grupos + detalle puede crecer; hay que cuidar la jerarquía visual y el rendimiento en móvil (colapsar detalles por grupo).

---

## Slices de implementación (smallest-first)

Este ADR es diseño; la implementación va en slices independientes, cada uno verificable en la app (desktop + móvil) con tests.

| Slice | Qué | Capas |
|---|---|---|
| **MC.5a** | `logic.js` puro: `resumenGrupos(asignadoPorGrupo, ejecutadoPorGrupo)` que devuelve `{asignado, ejecutado, restante, pct, estado}` por grupo, reusando los umbrales. Tests unitarios. | `presupuesto/logic.js`, tests |
| **MC.5b** | Vista read-only del resumen de los 3 grupos arriba de Límites (asignado desde la distribución, ejecutado desde los flujos del mes), reusando las progress bars. Los topes por categoría quedan como detalle de Estilo de vida. Estado vacío que guía a Mis cuentas si no hay ingreso registrado. | `presupuesto/view.js`, `index.js`, `index.html`, tests de render + E2E |
| **MC.5c** | Desglose por item dentro de cada grupo: Necesidades por fijo/deuda, Ahorro por destino, Estilo de vida por categoría (reuso del envelope actual). | `presupuesto/logic.js` + `view.js`, tests |
| **MC.5d** | Alertas y refuerzos inteligentes por grupo y por item (los ejemplos del usuario), puras en `logic.js` y mostradas como nudges. | `presupuesto/logic.js` + `view.js`, tests |
| **MC.5e (opcional)** | CTAs cruzados con Mis cuentas + copy de complementariedad + alinear el banner de propósito (EP.2) con la identidad de seguimiento. | `view.js`, `proposito.js`, `index.html` |

> Modelos sugeridos: **MC.5a** Sonnet 4.6 - Medio (lógica pura de agregación con tests); **MC.5b** Sonnet 4.6 - Alto (vista nueva que integra varios dominios por lectura); **MC.5c/MC.5d** Sonnet 4.6 - Medio; **MC.5e** Sonnet 4.6 - Bajo. La decisión de tocar el modelo de distribución (MC.10/MC.11) es Opus (finanzas), pero MC.5 en sí es de UI y agregación por lectura.
