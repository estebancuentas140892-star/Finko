# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-17. Última tarea cerrada: INI.5r, Inicio móvil vuelve a como estaba (se revierte INI.5).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6009/6009 (2026-11-17, GAS.C) |
| Tests E2E | 536/536 (2026-11-17, GAS.C, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v54 (`config.suscripcionesRevisadas`, SUS.1c) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**INI.5r - Inicio móvil vuelve a como estaba, 2026-11-17**
Se revierte INI.5 a pedido de Esteban: sin Tino junto al saldo, sin íconos en los títulos ni relieve extra; Inicio queda como en INI.4 ([ADR 160](DECISIONS/160-inicio-mobile-una-portada-con-tino.md) Revertida). SW v759.

**GAS.C - el recibo del teléfono es un comprobante, 2026-11-17**
"Revisar" de Registrar gasto es un comprobante hecho con las piezas de `assets/svg/comprobante/` (sprite `cmp-*`) y la banda de Finko arriba ([ADR 158](DECISIONS/158-el-recibo-de-gasto-es-un-comprobante.md)). Falta el arte de GAS.C2. SW v756.

**GAS.3 - Registrar gasto del tablero integral, 2026-11-17**
La hoja "Nuevo gasto" del tablero: calendario centrado, la Nota sin destello, un mensaje y sin guardar si la cuenta no alcanza, la fila de cuentas de Inicio, un solo botón y el vacío que señala el botón central ([ADR 156](DECISIONS/156-registrar-gasto-en-el-telefono-tablero-integral.md)). SW v755.

**GAS.4b - el total y las categorías de Día a día, 2026-11-16**
El total de Día a día lleva el "$" chico y el comparativo en pastilla blanca; sale "+ $X en fijos y deudas"; las categorías van todas en una fila que se desliza, de más a menos gasto, sin "+N"; las filas miden 62 px como el tablero ([ADR 157](DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D4 a D6). SW v754.

**GAS.4a - encabezados sin botón de registro, 2026-11-16**
En el teléfono la cabecera de Gastos va en una fila (nombre, pastilla del mes, lupa y ojo) y las demás secciones llevan teja, nombre y ojo: sin frase ni "+" de crear, que es el botón central ([ADR 157](DECISIONS/157-gastos-encabezados-sin-registro-y-lista-del-mes.md) D1 a D3, tablero "Gastos · Rediseño integral"). SW v753.

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
