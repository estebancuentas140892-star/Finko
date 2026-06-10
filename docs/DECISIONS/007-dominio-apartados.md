# ADR 007 - Apartados: dominio nuevo para gastos previsibles

**Estado:** Aceptada
**Fecha:** 2026-06-10
**Autores:** Esteban (producto), Claude Opus 4.8 (implementación)

---

## Contexto

Uno de los problemas financieros más comunes es dejar que gastos **previsibles** lleguen como si fueran **emergencias**: el SOAT, los impuestos, el mantenimiento del carro, los útiles escolares, o la compra acumulada de productos personales (jabón, crema dental, champú). Cuando todo cae junto, la persona usa sus ahorros o pide prestado.

Finko ya registraba el pasado (gastos) y lo recurrente que ya se debe (compromisos), pero no ayudaba a **prepararse** para lo que viene. Los dominios cercanos no cubrían el caso:

- **Metas** (`S.metas`): un objetivo único (viaje, carro) con fecha y abonos. Se cumple **una vez**; calcula el ahorro **por día**.
- **Ahorro** (`S.ahorro`): **un solo** fondo de emergencia global + hábito de "apartar" mensual.

Faltaba un lugar para **múltiples sobres temáticos** de gastos previsibles, con el aporte calculado según **la frecuencia con la que el usuario cobra** (diario, semanal, quincenal, mensual).

---

## Decisión

**Se crea un dominio nuevo, "Apartados"**, en vez de extender Metas.

Razones:

1. **Claridad conceptual.** Para el usuario, una meta es un deseo (viaje) y un apartado es una obligación previsible (SOAT). Mezclarlos diluye el propósito de ambos.
2. **El cálculo es distinto.** Las metas calculan ahorro por día; los apartados, por periodo de cobro (`calcularAporteSugerido`), produciendo mensajes como *"aparta $30.000 por quincena"*.
3. **Coherencia con el ADN (#10).** Los dominios son independientes y se comunican por estado/EventBus; un dominio nuevo encaja en el patrón ya usado por Metas, Ahorro, Inversiones.

### Nombre

Se evaluaron Apartados, Bolsillos, Sobres, Fondos, Reservas y Metas programadas. Se eligió **"Apartados"**: verbo natural en Colombia ("aparté para el SOAT"), neutro y profesional ([ADR 003](003-tono-neutral-profesional.md)), sin chocar con marcas (Bolsillos) ni con conceptos existentes (Fondos, Metas).

### Modelo de datos (schema v13)

```
Apartado {
  id, nombre, icono,
  montoObjetivo, montoActual,
  fechaObjetivo: YYYY-MM-DD | null,
  frecuenciaAporte: 'Diario'|'Semanal'|'Quincenal'|'Mensual',
  completado, fechaCreacion
}
```

Migración v12 → v13 idempotente: agrega `apartados: []` a los snapshots existentes.

### Alcance de la Fase 1

CRUD de apartados, aporte manual (descuenta saldo de cuenta con el patrón 0/1/varias cuentas, igual que Metas), progreso, plantillas rápidas (SOAT, impuestos, productos personales, etc.) y el cálculo del aporte sugerido con hint en vivo en el formulario. **Fuera de alcance** (fases siguientes): recurrencia/ciclo que se reinicia al cumplirse (SOAT anual), y derivar la frecuencia de aporte automáticamente de `S.ingresos`.

---

## Justificación del cálculo

`calcularAporteSugerido(apartado, hoyISO)`:

- `faltante = montoObjetivo - montoActual`; si ≤ 0, no hay nada que sugerir.
- `dias = diasHastaFecha(fechaObjetivo, hoyISO)`; sin fecha o con fecha pasada, no hay ritmo que calcular (devuelve null).
- `numPeriodos = ceil(dias / diasPorPeriodo[frecuencia])`, mínimo 1.
- `aportePorPeriodo = ceil(faltante / numPeriodos)`.

El redondeo hacia arriba garantiza que el usuario **llegue o supere** el objetivo a tiempo, nunca por debajo. `hoyISO` se inyecta para que la lógica sea pura y testeable de forma determinista.

El fondo de emergencia se excluye de las plantillas a propósito: ya vive en el dominio Ahorro y duplicarlo confundiría.

---

## Consecuencias

### Positivas

- Finko pasa de registrar gastos a **prevenirlos**, alineado con su visión de guía financiera.
- El cálculo por frecuencia de cobro habla el idioma del usuario ("por quincena", no "por día").
- Reusa patrones probados (lista + progreso + aporte con selector de cuenta de Metas), sin importar código entre dominios.

### Negativas / Restricciones

- Un dominio más que mantener (logic + view + index + sección + 2 modales + nav).
- La Fase 1 no es recurrente: cuando un apartado se gasta, hoy se elimina y se recrea. La recurrencia llega en la Fase 2.
- La frecuencia de aporte se elige a mano; la derivación desde `S.ingresos` queda para la Fase 3.
