# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-19. Última tarea cerrada: INI.6b, la hamaca cabe con su mensaje.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6284/6284 (2026-11-19, INI.6b) |
| Tests E2E | 567/567 (2026-11-19, INI.6b, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v57 (`llaves` en los datos de transferencia de una cuenta, MC.19) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**INI.6b - la hamaca cabe con su mensaje, 2026-11-19**
En "Todo al día", `ui/hamaca.js` mide el alto que queda y Tino con su mensaje caben sobre "Registrar" en cualquier pantalla ([ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D2). SW v798.

**INI.6a - bancos y efectivo en la ficha del saldo, 2026-11-19**
En el teléfono, la ficha del saldo parte el dinero en Bancos y Efectivo (suman el saldo) y abierta agrupa las cuentas ([ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md) D1). SW v797.

**MK.3b - dónde está una inversión, 2026-11-19**
La inversión dice dónde está (`entidad`: un banco o trii/Wenia) y la fila lleva su logo; Wenia sugiere Cripto y la explicación de Cripto suma las monedas atadas ([ADR 172](DECISIONS/172-las-marcas-que-faltaban.md) D5 y D6). SW v796.

**AH.9 - ¿Dónde lo guardas?, 2026-11-19**
La meta, la reserva y el fondo dicen en qué cuenta y bolsillo están (`guardadoEn`, solo referencia); la hoja de la cuenta tiene "Guardado aquí" y el aporte propone esa cuenta ([ADR 174](DECISIONS/174-donde-lo-guardas.md) D2 a D5). SW v795.

**MC.20c - la tarjeta como origen del retiro, 2026-11-19**
En Retirar efectivo, elegir una tarjeta abre "Sacar un avance" con el monto escrito; cierra MC.20 ([ADR 171](DECISIONS/171-transferir-y-retirar-a-donde-fue-el-dinero.md) D3). SW v794.

---

## 3. Qué sigue

- **Inicio en el teléfono** ([ADR 181](DECISIONS/181-inicio-bancos-y-efectivo-y-la-hamaca-que-cabe.md)): INI.6a y 6b cerradas; siguen 6c (la luna quieta) y 6d (la junta sin raya).
- **Análisis en dos lentes** ([ADR 176](DECISIONS/176-analisis-en-dos-lentes.md)): completa (ANA.1a a 1d) en el teléfono. El escritorio, en ANA.2.
- **Revisión de servicios, categorías y movimientos** (ADR 169 a 175): completa (AVC.1, MC.19, PAG.1, GAS.6, MK.3, MC.20 y AH.9).
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
