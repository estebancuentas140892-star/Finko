# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-16. Última tarea cerrada: GAS.4a, encabezados sin botón de registro. Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5994/5994 (2026-11-16, GAS.4a) |
| Tests E2E | 534/534 (2026-11-16, GAS.4a, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v54 (`config.suscripcionesRevisadas`, SUS.1c) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.4a - encabezados sin botón de registro, 2026-11-16**
En el teléfono la cabecera de Gastos va en una fila (nombre, pastilla del mes, lupa y ojo) y las demás secciones llevan teja, nombre y ojo: sin frase ni "+" de crear, que es el botón central ([ADR 157](DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1 a D3, tablero "Gastos · Rediseño integral"). SW v753.

**INI.4 - Tino descansa en su hamaca, 2026-11-16**
Sin nada hoy ni esta semana, Tino descansa en una hamaca colgada del saldo, con dos anillos detrás y el texto "¡Fuera preocupaciones!"; se mece salvo con "reducir movimiento" ([ADR 155](DECISIONS/155-inicio-tino-descansa-en-la-hamaca.md), tablero "Inicio Tino descansa", opción A). SW v752.

**MOV.3b - un solo deshacer en toda la app, 2026-11-16**
El "Eliminar" de Gastos y de Mis cuentas usa el mismo deshacer de Movimientos ([ADR 154](DECISIONS/154-deshacer-un-movimiento.md) D6). SW v751.

**MOV.3 - deshacer un movimiento, 2026-11-16**
"Deshacer movimiento" en Movimientos para gasto, ingreso y transferencia: quita la operación entera (también las partes de un pago repartido) y devuelve sus efectos sin dejar reversas; no lo hace si algo posterior depende de ella ([ADR 154](DECISIONS/154-deshacer-un-movimiento.md)). SW v750.

**INI.3 - el desplegable se cierra solo y el pago queda en manos del usuario, 2026-11-16**
El desplegable de cuentas se cierra al navegar, al tocar fuera y con Escape; la entidad arriba y el tipo debajo; un solo mensaje cuando la cuenta no alcanza, sin reparto que el usuario no eligió; el lote no paga dos veces; "Esta semana" vacía ya no dice "Todo al día" con pagos hoy ([ADR 153](DECISIONS/153-inicio-control-del-pago-y-desplegable-de-cuentas.md)). SW v749.

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
