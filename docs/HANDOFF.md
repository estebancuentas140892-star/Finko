# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-11-22. Última tarea cerrada: GAS.15g, la ficha del fijo del lienzo.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 6558/6558 (2026-11-22, GAS.15g) |
| Tests E2E | 588/588 (2026-11-22, GAS.15g, `--workers=2`); "dos dispositivos abiertos" de `nube.test.js` es intermitente. **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v60 (tasas reparadas, GAS.14a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO (producción, 2026-11-15; la primera corrida en frío da 91) |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **0** (BUG-027 cerrado el 2026-11-15). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**GAS.15g - la ficha del fijo del lienzo, 2026-11-22**
La ficha de un gasto fijo es la del lienzo: el papel "Gasto fijo" con filas que abren su pregunta, los pagos de cada mes y "Registrar el pago de noviembre" ([ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D3). SW v850.

**GAS.15f - la ficha del gasto del lienzo, 2026-11-22**
La ficha de un gasto es la del lienzo: el nombre y la fecha arriba con la papelera, lo de hormiga en el papel y "¿Eliminar este gasto?" con la tarjeta del gasto ([ADR 194](DECISIONS/194-el-historial-del-lienzo.md) D1 y D2). SW v849.

**GAS.15e - el gasto del lienzo, 2026-11-22**
El gasto del día a día es el del lienzo: "¿Qué fue?" con la teja, Revisar con los pasos y sin banda bosque, el papel con "Pagado con … queda" y el aviso de gasto hormiga ([ADR 193](DECISIONS/193-el-gasto-del-lienzo.md) D1 a D3). SW v848.

**GAS.15d - los resúmenes del lienzo, 2026-11-22**
La hoja Resumen es la del lienzo: seis meses con su cifra y un cuerpo por pestaña (Día a día por categoría, Fijos por pago, Deudas al cierre, Límites en porcentaje) ([ADR 192](DECISIONS/192-los-resumenes-del-lienzo.md) D1 a D6). SW v847.

**GAS.15c - la lista de deudas del lienzo, 2026-11-22**
La lista de Deudas es la del lienzo: el tipo como título y la entidad debajo, "· pagaste" con su barra, las pestañas con cuánto, "Pagar" aparte ([ADR 191](DECISIONS/191-las-deudas-del-lienzo.md) D8). SW v846.

---

## 3. Qué sigue

- **Gastos, el lienzo** ([ADR 194](DECISIONS/194-el-historial-del-lienzo.md)): Páginas 8, 7, 6, 3 y 5 cerradas (GAS.15a a 15g); faltan las páginas 4 y 9 ([`board/gastos.md`](board/gastos.md)).
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
