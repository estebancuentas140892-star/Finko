# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-22. Última tarea cerrada: GAS.15b, los formularios de deudas del lienzo.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6536/6536 (2026-11-22, GAS.15b) |
| Tests E2E | 586/586 (2026-11-22, GAS.15b, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v60 (tasas reparadas, GAS.14a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.15b - los formularios de deudas del lienzo, 2026-11-22**
Los formularios de deudas son los del lienzo: cuatro pasos por tipo, "¿Con quién es?" solo cuando no se sabe, el nombre con entidad sale de lo elegido y la factura con la teja ([ADR 191](DECISIONS/191-las-deudas-del-lienzo.md) D1 a D7). SW v845.

**GAS.15a - el plan de deudas del lienzo, 2026-11-22**
La hoja del plan es la página 8 del lienzo: recomendación, comparar y cómo funciona, con las cifras del motor; aplicar sube las cuotas según el orden ([ADR 190](DECISIONS/190-el-plan-de-deudas-del-lienzo.md) D1 a D4). SW v844.

**GAS.14e - el motor de recomendaciones de deudas, 2026-11-22**
Un solo motor de deudas: qué falta, tres escenarios, una recomendación con su porqué y su estimado, alternativas; "Tu plan" arriba de la hoja; juntar ya no une deudas sin interés ([ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D5). SW v843.

**GAS.14d - preguntar solo lo necesario, 2026-11-22**
La deuda con una persona pregunta la relación y el nombre, no otra vez quién; sin cuota no exige día de pago ([ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D4). SW v842.

**GAS.14c - totales y Movimientos, 2026-11-21**
Movimientos filtra los pagos de un fijo o una deuda; tarjeta y hoja de meses cuentan lo mismo; Límites respeta "Solo una parte" ([ADR 189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md) D3). SW v841.

---

## 3. Qué sigue

- **Gastos, el lienzo** ([ADR 191](DECISIONS/191-las-deudas-del-lienzo.md)): GAS.15a y 15b cerradas; faltan la lista de Deudas (GAS.15c) y las páginas 3 a 6 y 9 ([`board/gastos.md`](board/gastos.md)).
- **Gastos, de GAS.10 a GAS.14** ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) a [189](DECISIONS/189-revision-tecnica-de-gastos-y-motor-de-deudas.md)): completas; pendientes de GAS.14 en el ADR 189, Consecuencias.
- **Gastos en el teléfono** ([ADR 182](DECISIONS/182-gastos-cada-cosa-con-su-forma-y-su-color.md)): GAS.8a a 8h cerradas; faltan las poses de Tino que entrega Esteban ([`board/gastos.md`](board/gastos.md)).
- **Iniciativa FORM.2** ([ADR 142](DECISIONS/142-formularios-por-tarea.md), formularios por tarea): **completa** (FORM.2a a 2h). Queda probarla en un iPhone real con REV.3b.
- **El tablero quedó en orden de valor** ([`BOARD.md`](BOARD.md), índice). Arriba: REV.3b (la app instalada con tus datos y la versión publicada, espera una prueba en un iPhone real; ahí se verifica también el campo sobre el teclado de REV.2b, y el número del ícono y los accesos directos de HF.3e); lo demás es de prioridad baja o espera algo. Lo que salió y por qué: [ADR 138](DECISIONS/138-la-poda-del-tablero-del-13-de-noviembre.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)): HF.1b, HF.1d y HF.3e cerradas ([ADR 139](DECISIONS/139-la-naturaleza-de-un-gasto.md), [143](DECISIONS/143-todo-cambio-de-saldo-deja-registro.md), [144](DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)); HF.1c, HF.2a y HF.2b cerradas: la iniciativa queda sin tarjetas. Conectar el banco vive en NUBE.4, "no iniciar".
- **Iniciativa SUS** ([ADR 146](DECISIONS/146-finko-reconoce-el-tipo-de-gasto.md), hormiga, fantasma y vampiro sin preguntarlos): SUS.1a a SUS.1c y SUS.2 (2a a 2d) cerradas ([ADR 147](DECISIONS/147-gusto-o-necesidad-hormiga-sin-adivinar.md): hormiga es lo pequeño que es un gusto); sigue SUS.1d (vampiro, espera su superficie).
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): NUBE.0 a NUBE.3 cerradas en `finko-prueba`. Invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)): APR.5b cerrada el 2026-11-15: Tino tiene su ronda 2 también en el niño ([095](DECISIONS/095-tino-en-el-sprite.md)). La revisión pedagógica de las lecciones es trabajo externo, fuera del tablero.
- **El adulto en el teléfono (MV2.3 y MV2.30)**: aplicado y publicado ([ADR 116](DECISIONS/116-lo-que-faltaba-del-canvas-primera-tanda.md) a [136](DECISIONS/136-ajustes-del-adulto-en-el-telefono.md)); `Diseño Finko/` vacía. Medido en producción con MV2.28 y PERF.16.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
