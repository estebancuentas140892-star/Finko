# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-15. Última tarea cerrada: PERF.16, el arranque bajo 400 ms. Nada en proceso.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5646/5646 (2026-11-15, PERF.16) |
| Tests E2E | 476/476 (2026-11-15, PERF.16, `--workers=2`, puerto 8091); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v49 (`ajustesSaldo`, HF.1d-1) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **1**: BUG-027 (documental). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**PERF.16 - el arranque bajo 400 ms y entrar a Fondo, 2026-11-15**
Un overlay sin abrir no se maqueta por dentro y los aportes de Fondo fuera de pantalla no se estilizan: el arranque baja de 675 a 350 ms bloqueados a 4x y el tab Ahorro de 359 a 194. Cifras en [`BASELINE.md`](../scripts/perf/BASELINE.md). SW v714.

**MV2.28 - medir lo publicado, 2026-11-15**
Cambiar de sección dejó de reestilizar toda la página y abrir "Más" ya no recorre el historial en el toque; el arranque sigue sobre los 400 ms y pasa a PERF.16. Cifras en [`BASELINE.md`](../scripts/perf/BASELINE.md). SW v713.

**HF.3e - lo que Finko muestra fuera de la app, 2026-11-15**
Con candado la notificación no dice qué ni cuánto; el ícono instalado lleva el número de avisos que interrumpen; tocarla abre su sección; cuatro accesos directos ([ADR 144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)). SW v712.

**REV.3a - descargar el mes para Excel, 2026-11-15**
Cada mes de Movimientos baja su CSV (`;`, BOM, Entrada y Salida) con lo que la lista muestra; Ajustes conserva el CSV de gastos que se reimporta ([ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md) D3 y su resolución). SW v711.

**HF.1d-2 - Distribuir deja su ingreso y sus transferencias, 2026-11-15**
El cobro que acredita sale en Movimientos como `IngresoPuntual` por ocurrencia y lo que mueve entre cuentas como `transferencias`; esa fila reemplaza a `cobrosDistribuidos` como sello ([ADR 143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md) D6). SW v710.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **MOV.1 cerrada** con 17 de 25 fichas: las fichas de `contexto/` que mandan algo "a la ficha 18" se leen con la tabla del ADR 138 D1.
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); quedan HF.1c, HF.2a y HF.2b. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): queda APR.5b (correr el conversor del [095](DECISIONS/095-tino-en-el-sprite.md) con los dibujos de la ronda 2). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
