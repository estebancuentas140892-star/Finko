# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-16. Última tarea cerrada: INI.2e, "Completa el pago". En proceso: INI.2 (INI.2f).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5946/5946 (2026-11-16, INI.2e) |
| Tests E2E | 511/511 (2026-11-16, INI.2e, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v54 (`config.suscripcionesRevisadas`, SUS.1c) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**INI.2e - "Completa el pago", 2026-11-16**
"Completa el pago": la cuenta que no alcanzó va marcada, el usuario marca con qué completar y el pago se reparte en ese orden ("Usa $80.000"); al pie, "Pago completo" o "Faltan $X" con su barra ([ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D7). SW v747.

**INI.2d - "¿Desde qué cuenta pagas?" y el saldo que no alcanza, 2026-11-16**
"¿Desde qué cuenta pagas?": las cuentas con su tipo y el círculo de marcado; la que no alcanza dice cuánto falta y el botón pasa a "Completar con otra cuenta"; "Volver" regresa al lote con las mismas casillas ([ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D6). SW v746.

**INI.2c - la hoja "Pagos para hoy", 2026-11-16**
Cada pago es una tarjeta con su logo, "Venció el 15" o "Vence hoy" en su color y la casilla a la derecha; al pie, "3 de 3 seleccionados", el total y "Pagar los 3" ([ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D5). SW v745.

**INI.2b - "Atención hoy" resumida y "Esta semana" con el día, 2026-11-16**
"Atención hoy" resume los pagos ("3 pagos para hoy · 1 ya vencido") con un botón "Pagar" que abre el lote; "Esta semana" vuelve al recuadro del día, "Sale" y "Calendario"; medidas del tablero ([ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md) D3 y D4). SW v744.

**INI.2a - el saldo al centro, 2026-11-16**
Primera rebanada del tablero "Inicio, rediseño" ([ADR 152](DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md)): el saldo centrado con el "$" volado y tres círculos en la banda, "En 3 cuentas", y las cuentas abiertas con su tipo y "Ver mis cuentas". SW v743.

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
