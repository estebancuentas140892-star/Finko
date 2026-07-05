# Mapa del código - Finko Claude

> Índice de navegación rápida: sección visible → carpeta real → archivos clave → estilos → tests.
> Objetivo: que cualquiera (incluido el propio Esteban) ubique en segundos dónde vive algo o dónde mirar ante un error, sin depender de memoria.
> Documento vivo. Actualizar cuando se cree un dominio nuevo o se mueva un archivo de estilos.
> Última revisión: 2026-07-05.

---

## 1. Por qué este archivo existe

En la app, el nombre visible de una sección casi nunca coincide con el nombre de su carpeta:

| Ves en la app | Carpeta real |
|---|---|
| Inicio | `dash` (no tiene dominio propio, ver sección 3) |
| Gastos | `gastos` |
| Calendario | `agenda` |
| Deudas | `compromisos` (incluye también gastos fijos, no solo deudas) |
| Mis cuentas | `tesoreria` |
| Me deben | `personales` |

Este archivo traduce esa tabla y agrega, para cada dominio, qué archivo de lógica, de vista, de estilos y de test tocar primero.

---

## 2. Tabla principal: sección → carpeta → archivos → estilos → test

| Sección visible | Carpeta (`modules/dominio/`) | Archivos clave | Estilos (`styles/components/`) | Test unitario |
|---|---|---|---|---|
| Inicio | *(sin carpeta propia, ver sección 3)* | `ui/bootstrap.js`, `infra/render.js` | `domain.css` (hero-saldo, vencidos-card, prioridades-card, resumen-card, balance-tira, limites-card) | `resumen.test.js`, `render.test.js` |
| Gastos | `gastos/` | `logic.js`, `view.js`, `index.js` | `domain.css` (mes-nav, filtros-bar/chip, gastos-resumen) | `gastos.test.js` |
| Calendario | `agenda/` | `logic.js`, `view.js`, `index.js` | `config.css` (bloque AGENDA, línea 449) | `agenda.test.js` |
| Deudas | `compromisos/` | `logic.js`, `index.js`, `view.js` + `views/` (`alertas.js`, `dashboard.js`, `estrategia.js`, `estrategia-impacto.js`, `formularios.js`, `lista.js`) | `charts.css` (chooser entidad/personal, estrategia de pago), `domain.css` (abono-btn, cal-detail) | `compromisos.test.js`, `estrategia-pago.test.js` (e2e) |
| Mis cuentas | `tesoreria/` | dividido por subsistema: `logic/`, `views/` y `acciones/` con `cuentas.js`, `ingresos.js` y `distribucion.js` cada una; `logic.js`/`view.js` son barrels e `index.js` el coordinador | `domain.css` (ingresos-card, distribucion-rows/clasicos) | `tesoreria.test.js`, `cuenta-helper.test.js`, `distribuir-pago.test.js` |
| Apartados | `apartados/` | `logic.js`, `view.js`, `index.js` | `domain.css` (bloque APARTADOS línea 530, form rediseño línea 1305) | `apartados.test.js` |
| Ahorro | `ahorro/` | `logic.js`, `view.js`, `index.js` | `domain.css` (consolidado de ahorro línea 1348), `analysis.css` (bloque J.1/J.1b) | `ahorro.test.js`, `ahorro-inversion.test.js` (e2e) |
| Presupuesto | `presupuesto/` | `logic.js`, `view.js`, `index.js` | `analysis.css` (D.5 envelope budgeting, MC.8b) | `presupuesto.test.js` |
| Metas | `metas/` | `logic.js`, `view.js`, `index.js` | `analysis.css` | `metas.test.js` |
| Me deben | `personales/` | `logic.js`, `view.js`, `index.js` | `domain.css` (personales-resumen) | `personales.test.js` |
| Inversiones | `inversiones/` | `logic.js`, `view.js`, `index.js` | `analysis.css` (bloque J.2a/J.2b/J.2c) | `inversiones.test.js` |
| Análisis | `analisis/` | `logic.js`, `view.js`, `index.js` | `analysis.css` (panel completo: bento, métricas, salud, patrimonio, proyección) | `analisis.test.js` |
| Configuración | `config/` | `index.js`, `view.js` (sin `logic.js` propio) | `config.css` (bloque CONFIGURACION línea 7) | *(sin test unitario dedicado, ver `import.test.js`/`export.test.js`)* |
| *(sin sección propia)* | `export/` | `logic.js` (invocado desde `config`) | | `export.test.js` |
| *(sin sección propia)* | `import/` | `logic.js`, `view.js`, `index.js` | `charts.css` (bloque IMPORT CSV línea 154) | `import.test.js` |
| *(toast, sin vista propia)* | `logros/` | `logic.js`, `index.js` | `nudges.css` (bloque LOGRO TOAST línea 127) | `logros.test.js` |
| *(card en Inicio)* | `resumen/` | `logic.js`, `view.js`, `index.js` | `domain.css` (RESUMEN-CARD línea 1070) | `resumen.test.js` |

---

## 3. "Inicio" no es un dominio

El dashboard (`#dash`) no tiene carpeta propia en `modules/dominio/`: es una composición de widgets que sí pertenecen a otros dominios (`resumen/`, `logros/`, alertas de `presupuesto/`, vencidos de `compromisos/`+`agenda/`). Si algo se ve mal en Inicio, casi siempre hay que mirar el dominio dueño del dato, no un archivo "dash" que no existe.

---

## 4. Índice de estilos por widget (`styles/components/`)

Estos archivos **no están organizados por dominio**, sino por tipo de widget o patrón visual, y varios widgets se comparten entre secciones a propósito (evita duplicar CSS). Antes de buscar a ciegas, revisar esta tabla:

| Archivo | Qué agrupa |
|---|---|
| `atoms.css` | Chips, badges, list items, empty state, spinner, divisor, progress bar, toggle, teja de categoría (`cat-teja`, ID.3) |
| `buttons.css` | Botones y cards genéricas |
| `charts.css` | Sparkline + donut, modal de importar CSV, chooser entidad/personal, estrategia de pago de deudas |
| `config.css` | Configuración (perfil, notificaciones, datos, acerca de), install PWA, Agenda/Calendario |
| `domain.css` | Grupo grande y heterogéneo: calculadoras (posible código muerto, ver nota abajo), herramienta-inline, ingresos-card, mes-nav, filtros-bar/chip, distribución de ingreso, gastos-resumen, apartados, abono a deudas, cuenta-picker/multi/sel (compartido por Gastos/Deudas/Apartados/Metas), widgets de Inicio (hero-saldo, vencidos-card, prioridades-card, resumen-card, balance-tira, limites-card), personales-resumen, form de apartados, ahorro consolidado, banner-propósito (compartido por las 10 secciones) |
| `forms.css` | Sistema de íconos SVG de línea, inputs/formularios, quick add, quick toast |
| `nudges.css` | Sistema de nudges (5 niveles), logro toast, bank avatar/picker, badges de dominio |
| `analysis.css` | Todo el panel de Análisis: bento, métricas, salud financiera, presupuesto, ahorro, inversión, gastos, patrimonio |

Capas base (sin agrupar por widget, aplican a toda la app): `reset.css`, `base.css`, `tokens.css`, `layout.css`, `modals.css`, `themes.css`, `a11y.css`, `responsive.css`, `utils.css`. Ver el orden de cascada en [`styles/main.css`](../styles/main.css).

**Nota:** `.calc-*` (calculadoras) en `domain.css` líneas 7-190 puede ser código muerto: la sección "Calculadoras" se retiró de la app en 2026-06-07 y sus fórmulas migraron a `infra/financiero.js`. Verificar uso real antes de tocar o borrar.

---

## 5. Tabla síntoma → dónde mirar

| Síntoma | Mirar primero |
|---|---|
| Un dato no se guarda o desaparece al recargar | `core/storage.js` (persistencia + migraciones), `core/state.js` (singleton `S`) |
| Un botón no responde al clic | `ui/actions.js` (único lugar con `data-action` delegado) |
| Un modal no abre, no cierra, o el foco se pierde | `ui/modales.js`, `infra/a11y.js` (`trapFocus`/`releaseFocus`) |
| La navegación entre secciones no cambia la vista | `infra/router.js` |
| Un cálculo financiero da un número raro | `infra/financiero.js` (fórmulas puras: CDT, crédito, interés compuesto, regla 72) o `logic.js` del dominio afectado |
| El selector de cuenta no aparece o elige mal | `infra/cuenta-helper.js` (patrón 0/1/varias cuentas, usado por Gastos/Deudas/Apartados/Metas) |
| Un pago se reparte mal entre cuentas | `infra/distribuir-pago.js` |
| Falta un ícono o aparece el símbolo genérico | `infra/icons.js`, sprite SVG inline en `index.html` |
| El banco no se detecta o el logo no aparece | `infra/bancos.js`, `infra/marcas.js` |
| Un formulario no valida o no muestra el error | `infra/form-errors.js` |
| Falta una notificación de compromiso próximo | `infra/notificaciones.js` |
| El CSV de gastos no importa/exporta bien | `infra/csv.js`, `dominio/import/`, `dominio/export/` |
| Algo se ve mal visualmente | usar la tabla de la sección 4 para ubicar el archivo CSS, luego buscar la clase por nombre (`grep -n "\.clase-buscada" styles/components/*.css`) |
| El Service Worker sirve una versión vieja | `service-worker.js`, revisar el número de versión de cache |

---

## 6. Cómo agregar un dominio nuevo

1. Crear `modules/dominio/<nombre>/` con `logic.js` (puro, sin DOM), `view.js` (HTML), `index.js` (wiring de acciones + registro de render + EventBus). Ver el patrón en cualquier dominio existente, ej. `gastos/`.
2. Si la vista crece más de ~300 líneas, partirla en `views/` con barrel, como hizo `compromisos/`. Si el dominio entero crece, aplicar el corte por subsistema a las tres capas (`logic/`, `views/`, `acciones/` + barrels), como hizo `tesoreria/`; los archivos nuevos van al precache de `service-worker.js`.
3. Agregar los estilos nuevos: si son exclusivos del dominio, en un bloque nuevo dentro del archivo de `styles/components/` que mejor encaje temáticamente (ver sección 4); si son un patrón reutilizable, considerar si ya existe algo similar antes de duplicar.
4. Registrar el dominio en `ui/bootstrap.js` y la navegación en `index.html`.
5. Crear `tests/unit/<nombre>.test.js`.
6. Actualizar este archivo (secciones 2 y 4) y [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) sección 2.4.
