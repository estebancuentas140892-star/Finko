# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-19. Última tarea cerrada: GAS.10a, cada lugar con una función.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6366/6366 (2026-11-19, GAS.10a) |
| Tests E2E | 581/581 (2026-11-19, GAS.10a, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v57 (`llaves` en los datos de transferencia de una cuenta, MC.19) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.10a - cada lugar con una función, 2026-11-19**
Las pestañas de Gastos son el primer renglón (sale la fila "Gastos"), el ojo vuelve a cada tarjeta, la lupa es el primer botón de los filtros y sale la franja de lo vencido de Día a día; la primera vez trae a Tino al lado de la frase ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D1 y D2). SW v817.

**INI.7b - "Atención hoy" en filas, 2026-11-19**
Cada compromiso es una fila con logo, nombre, estado en su color y valor, que abre su pago; "Pagar los N" al pie y lo que no es un pago aparte. Cierra INI.7 ([ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D2). SW v816.

**INI.7a - dos fichas en la banda, 2026-11-19**
Bancos y Efectivo son dos fichas en la banda; cada una abre su grupo ([ADR 184](DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md) D1). SW v815.

**GAS.9g - la tarjeta con su nombre en Mis cuentas, 2026-11-19**
La fila de la tarjeta en Mis cuentas lee el nombre guardado (`descripcion`) y lleva el logo de su banco: salía sin nombre desde MC.16c ([ADR 183](DECISIONS/183-gastos-que-cuadran.md) D4). SW v814.

**GAS.9e - Límites sugiere al registrar, una vez, 2026-11-19**
Con el tercer gasto del mes en una categoría sin límite, Finko ofrece "Poner límite", una vez por categoría y mes ([ADR 183](DECISIONS/183-gastos-que-cuadran.md) D5). SW v813.

---

## 3. Qué sigue

- **Gastos móvil, cada lugar con una función** ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)): GAS.10a cerrada; siguen GAS.10b a 10g ([`board/gastos.md`](board/gastos.md)). Es el diseño que esperaba GAS.9f ([ADR 183](DECISIONS/183-gastos-que-cuadran.md) D6).
- **Gastos en el teléfono** ([ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): GAS.8a a 8h cerradas; faltan las poses de Tino que entrega Esteban ([`board/gastos.md`](board/gastos.md)).
- **Revisión de servicios, categorías y movimientos** (ADR 169 a 175): completa (AVC.1, MC.19, PAG.1, GAS.6, MK.3, MC.20 y AH.9).
- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a a SUS.1c y SUS.2 (2a a 2d) cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); sigue SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada el 2026-11-15: Tino tiene su ronda 2 también en el niño ([095](DECISIONS/095-tino-en-el-sprite.md)). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
