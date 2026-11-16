# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-16. Última tarea cerrada: OB.1, el estado de cada pago se decide una vez. En proceso: AH.1 (AH.1c y AH.1d).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5928/5928 (2026-11-16, OB.1) |
| Tests E2E | 500/500 (2026-11-16, OB.1, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v54 (`config.suscripcionesRevisadas`, SUS.1c) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**OB.1 - el estado de cada pago se decide una vez, 2026-11-16**
Dos pagos vencidos decían "2 pagos para hoy · 2 ya vencidos". `infra/estado-obligacion.js` decide vencido, hoy y próximo, sus palabras y el conjunto del lote con su monto; lo leen Atención hoy, el lote, Por pagar, el panel de Inicio y el Calendario ([ADR 151](DECISIONS/151-el-estado-de-una-obligacion-se-decide-una-vez.md)). SW v738.

**AH.1b - Esta semana con logos y el tablero tal cual, 2026-11-16**
Cada fila de la semana con su logo y "Jue 19 · en 3 días"; sin totales ni enlace, pagos sin signo; "Atención hoy" ordena pagos, ingreso y lo demás; "15 de noviembre" ([ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md) D7). SW v737.

**AH.1a - cada pago de hoy con su logo y su estado, 2026-11-16**
"Pagos para hoy" lista cada pago con su logo, su estado en pastilla (vencido, para hoy) y su monto; el débito sin saldo lleva el logo de su cuenta ([ADR 150](DECISIONS/150-estados-de-pago-y-logos-en-inicio.md)). SW v735.

**FORM.2i - en el iPhone tocar una opción avanza, 2026-11-16**
Safari reenvía el clic del rótulo a la opción con `detail` 0 y el formulario lo tomaba por teclado: Registrar gasto se quedaba en la categoría. `ui/toque.js` lo distingue; vale también para las preguntas de opciones. SW v734.

**UPD.4 - el JS y el CSS se revalidan siempre, 2026-11-16**
`vercel.json` baja `.js` y `.css` de `max-age=300` a `max-age=0`: mitiga la mezcla de HTML nuevo con JS viejo que dejó sin abrir el "+" en un iPhone instalado (causa de la mezcla sin probar). Sin bump del SW.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a a SUS.1c y SUS.2 (2a a 2d) cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); sigue SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada el 2026-11-15: Tino tiene su ronda 2 también en el niño ([095](DECISIONS/095-tino-en-el-sprite.md)). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
