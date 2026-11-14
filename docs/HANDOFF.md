# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-13. Última tarea cerrada: REV.2b, el gasto fijo empieza por el monto (ADR 141). Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5491/5491 (2026-11-13, REV.2b) |
| Tests E2E | 453/453 (2026-11-13, REV.2b, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**REV.2b - el gasto fijo empieza por el monto, 2026-11-13**
"¿Cuánto pagas?", "¿Qué es?", "¿Cada cuánto?" en chips y "¿Qué día?"; nota y débito en "Más opciones"; con el teclado abierto, el campo enfocado de una hoja sube a la vista ([ADR 141](DECISIONS/141-el-gasto-fijo-empieza-por-el-monto.md), ajusta el 042 D5). SW v698.

**REV.2a - Por pagar dice cuánto te falta pagar este mes, 2026-11-13**
El hero suma lo vencido y lo que falta del mes, fijos y cuotas, con el reparto de la lista; "Lo que debes en total" queda debajo solo con deudas, y el pie de Inicio dice "suman" ([ADR 140](DECISIONS/140-por-pagar-dice-cuanto-te-falta-este-mes.md), ajusta el 036 D1). SW v697.

**BUG-039 - la renta ya no suma el salario dos veces, 2026-11-13**
El crédito automático de un fijo que ya se proyecta no se suma otra vez en "Ingresos brutos"; cierra el riesgo 5 del [ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md). SW v696.

**HF.1b - nada se cuenta dos veces, 2026-11-13**
Cada gasto tiene su naturaleza (`infra/naturaleza.js`): Análisis y la renta miran el consumo; Límites por grupo y la tasa de ahorro, lo que sale del ingreso; el aporte al Fondo es neutro en Movimientos ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md)). SW v695.

**La poda del tablero, 2026-11-13**
De 47 entradas a 17, en orden de valor; MOV.1 cierra con 17 de 25 fichas y HF queda en seis tarjetas ([ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md)). Solo documentación.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b), REV.2c y HF.1d. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): Fase 0 cerrada; HF.1b cerrada (ADR 139); quedan cinco tarjetas, ninguna bloqueada. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): queda APR.5b (correr el conversor del [095](DECISIONS/095-tino-en-el-sprite.md) con los dibujos de la ronda 2). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Falta medirlo en producción (MV2.28).
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
