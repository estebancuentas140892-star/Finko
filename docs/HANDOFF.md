# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-20. Última tarea cerrada: GAS.12c y 12d, "Ya lo había pagado" y la fecha del primer pago (cierra GAS.12).

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6460/6460 (2026-11-20, GAS.12d) |
| Tests E2E | 585/585 (2026-11-20, GAS.12d, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v58 (las categorías para Colombia, GAS.10b) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.12c y 12d - "Ya lo había pagado" y el primer pago, 2026-11-20**
Lo pagado por fuera de Finko se anota sin mover dinero, y la fecha del primer pago va en "Cuándo". Cierra GAS.12 ([ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D3 y D4). SW v830.

**GAS.12b - cada pago salda el vencimiento más antiguo, 2026-11-20**
Cada pago de un fijo salda el vencimiento más viejo; lo vencido dice cuántos pagos y su suma en Fijos, la hoja, el lote, el Calendario e Inicio, y el lote los paga todos ([ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D2, cambia el 183 D3 en los fijos). SW v829.

**GAS.12a - cada pestaña con su cifra, 2026-11-20**
La hoja de meses de cada pestaña con sus propios registros, Fijos en un mes con solo sus vencimientos y Límites sin pagos de fijos ni deudas ([ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md) D1). SW v828.

**GAS.11d - lo importante cabe por la altura, 2026-11-20**
Deudas la primera vez y la factura del fijo caben por la altura de la pantalla, sin achicar la letra. Cierra GAS.11 ([ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D7). SW v827.

**GAS.11c - cada semana es cada 7 días, 2026-11-20**
El gasto fijo semanal cuenta 7 días desde el primer pago, cruzando meses; la factura dice "Desde el día N" ([ADR 186](DECISIONS/186-movimientos-encuentra-y-hormiga-por-frecuencia.md) D6). SW v826.

---

## 3. Qué sigue

- **Gastos, cálculos y vencimientos** ([ADR 187](DECISIONS/187-cada-pestana-con-su-cifra-y-cada-vencimiento-con-su-pago.md)): completa (GAS.12a a 12d): cada pestaña con su cifra y cada pago de un fijo salda su vencimiento más viejo.
- **Gastos móvil** ([ADR 185](DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md)): completa (GAS.10a a 10g, cerró GAS.9).
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
