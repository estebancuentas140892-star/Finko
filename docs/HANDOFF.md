# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-18. Última tarea cerrada: ANA.1c, lo que Finko encontró.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6161/6161 (2026-11-18, ANA.1c) |
| Tests E2E | 540/540 (2026-11-18, ANA.1c, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v56 (`avances` en la tarjeta de crédito, AVC.1a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**ANA.1c - lo que Finko encontró, 2026-11-18**
Hasta tres hallazgos por periodo, ordenados por dinero, con Tino con lupa; a mitad de periodo solo lo que subió. Sale del teléfono "Más detalle de tus gastos" ([ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D6). SW v775.

**ANA.1b - Tus gastos por periodo, 2026-11-18**
Día, semana, mes y año con flechas; el total y su gráfica en la tarjeta de identidad, comparado a la misma altura; la barra de cada categoría mide su parte; sin gastos, Tino tranquilo ([ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D2 a D5 y D7). SW v774.

**ANA.1a - las dos lentes de Análisis y Tu situación, 2026-11-18**
Bajo 1024px, "Tus gastos" y "Tu situación"; en la segunda, la salud, lo que realmente tienes y la renta, con sus filas en hoja ([ADR 176](DECISIONS/176-analisis-en-dos-lentes.md) D1 y D9). Siguen ANA.1b a 1d. SW v773.

**AVC.1b - sacar un avance desde la tarjeta, 2026-11-18**
En la hoja de la tarjeta: monto, a dónde llegó (crea Efectivo si falta), cuotas, comisión y el costo en pesos antes de guardar; el interruptor del gasto pasa a "Lo pagué con un avance" ([ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D1 a D3 y D7). SW v772.

**AVC.1a - el avance en los datos, 2026-11-18**
El avance que llega a una cuenta vive en la tarjeta: sube la deuda, la cuota con intereses y la cuenta, deja su fila en Movimientos y se deshace ([ADR 169](DECISIONS/169-un-avance-no-es-un-gasto.md) D4 a D6). Sin pantalla: sigue AVC.1b. SW v771.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **Análisis en dos lentes** ([ADR 176](DECISIONS/176-analisis-en-dos-lentes.md)): ANA.1a a 1c cerradas; sigue ANA.1d. El escritorio, en ANA.2.
- **Revisión de servicios, categorías y movimientos** (ADR 169 a 175): todo decidido y en el tablero. En curso, **AVC.1** (el avance): AVC.1a y AVC.1b cerradas, sigue AVC.1c. El 170 (llaves) también pide bump de schema: toma la v57.
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
