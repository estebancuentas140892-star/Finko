# Ficha de contexto: Configuración (Ajustes)

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Panel de Ajustes (dominio `config`)

- **Objetivo**          : centro de configuración de Finko. Hoy agrupa: perfil (nombre + situación laboral), perfil fiscal (K.2), datos de renta manuales (K.4), apariencia (tema), instalar PWA, recordatorios (notificaciones), gestión de datos (export/import/reset + aviso de cuota ADR 030) y "Acerca de". Es un dominio de UI: lee `S`, muta directamente (sin EventBus para sus propios formularios) y re-renderiza el panel entero tras cada guardado.
- **Estado actual**     : estable. **CFG.1a** (2026-07-06) reemplazó el campo SMMLV muerto del encabezado por la situación laboral (schema v25). Iniciativa fusionada CFG.1+CFG.2 en curso: siguen **CFG.2a** (auto-derivar ingresos brutos al monitor de renta) y **CFG.2b** (inferir el estado de declarante). Otras tarjetas del BOARD sin iniciar: CFG.3 (notificaciones anticipatorias), CFG.4 (respaldo, roza ADN), CFG.5 (seguridad de acceso), CFG.6 (auditoría de la sección), LEG.1 rebanada de UI (Centro Legal que muestre los textos de `docs/legal/`, ya redactados el 2026-07-09).
- **Verificado contra** : `88f1e95` (2026-07-06, CFG.1a).

**Dónde vive**

| Pieza | Archivo | Ancla | Línea |
|---|---|---|---|
| Orquestador del render (una sección por bloque) | `modules/dominio/config/view.js` | `renderPanelConfig()` | ~18 |
| Perfil (nombre + situación laboral) | `modules/dominio/config/view.js` | `_renderPerfil()` | ~106 |
| Perfil fiscal (K.2, 3 checkboxes) | `modules/dominio/config/view.js` | `_renderPerfilFiscal()` | ~204 |
| Datos de renta manuales (K.4) | `modules/dominio/config/view.js` | `_renderDatosRenta()` | ~242 |
| Aviso de almacenamiento (ADR 030) | `modules/dominio/config/view.js` | `_renderAvisoAlmacenamiento()` | ~288 |
| Gestión de datos (export/import/reset) | `modules/dominio/config/view.js` | `_renderDatos()` | ~317 |
| Init + handlers de formularios y acciones | `modules/dominio/config/index.js` | `initConfig()`, `_inyectarPanel()` | ~204, ~134 |
| Situaciones laborales (catálogo, CFG.1) | `modules/core/constants.js` | `SITUACIONES_LABORALES` | ~547 |
| Campo del estado | `modules/core/state.js` | `perfil.situacionLaboral` | ~283 |
| Migración v24 → v25 | `modules/core/storage.js` | bloque `< 25` en `_migrate` | ~407 |
| Centro Legal: lista + sección (LEG.1) | `modules/dominio/config/view.js` | `_renderLegal()` | ~367 |
| Centro Legal: catálogo de documentos | `modules/dominio/config/legal.js` | `DOCUMENTOS_LEGALES`, `cargarDocumentoLegal()` | ~15, ~46 |
| Centro Legal: abrir/cambiar documento | `modules/dominio/config/index.js` | `_mostrarDocumentoLegal()`, `_wireLegalLinks()` | ~135, ~163 |
| Conversor Markdown → HTML (sin dependencias) | `modules/infra/markdown.js` | `mdToHtml()` | ~68 |
| Modal genérico del visor | `index.html` | `#modal-legal` | ~1079 |

**Recursos**: estilos en `styles/components/config.css` (`.config-section`, `.config-info`, `.config-form`, `.config-toggle`, `.config-danger`, `.config-actions`, `.legal-lista`, `.legal-doc`). Constantes: `SITUACIONES_LABORALES`, `SMMLV`/`legalVigente`/`APP_VERSION` (Acerca de), `UVT`/`TOPES_RENTA_UVT` (usados por el monitor de renta que vive en `analisis`, no aquí). El monitor de renta (K.3) que consume `config.datosFiscales` y `config.perfilFiscal` vive en `analisis/logic.js` (`calcularEstadoRenta`), ver [`analisis.md`](analisis.md).

**Dependencias y relaciones**: `config/index.js` registra acciones (`exportar-datos`, `importar-datos`, `resetear-app`, `activar-notificaciones`, `toggle-notificaciones`, `exportar-gastos-csv`, `abrir-legal`) y maneja los `submit` de `#form-perfil`, `#form-perfil-fiscal`, `#form-datos-fiscales` directamente (muta `S`, `save()`, re-render). Escucha `storage:error`/`storage:cuota` (ADR 030) y `theme:change`. `_exportarDatos` serializa `S` completo; `_importarDatos`/`_resetearApp` recargan la app. El perfil fiscal y los datos de renta que se guardan aquí los **lee** el monitor de renta de Análisis (ADN 10 respetado: Análisis lee `S`, no importa `config`). El Centro Legal (LEG.1) trae los `.md` de `docs/legal/` con `fetch` (mismo origen, precacheado por el SW) y los convierte con `infra/markdown.js`; no muta `S`, no usa EventBus.

**Riesgos**:

- **`perfil.smmlv` es dato muerto (CFG.1)**: ningún cálculo lo lee (la lógica usa la constante legal `SMMLV`). CFG.1a dejó de mostrarlo/editarlo pero lo **conserva en el estado** por compatibilidad de datos existentes y de los seeds E2E que lo setean. No re-introducir un campo de "salario" que nada consuma (fue justo lo que CFG.1 eliminó).
- **La situación laboral hoy no tiene consumidor todavía**: CFG.1a la captura como fundación; su consumidor real llega en **CFG.2a/CFG.2b** (encuadre e interpretación del monitor de renta). Es deliberado dentro de la iniciativa fusionada: es un campo controlado (solo ids de `SITUACIONES_LABORALES` o `''`), no dato libre inerte.
- **El panel se re-renderiza entero (`renderPanelConfig`) tras cualquier guardado**: barato (sin barridos de historial), pero cualquier estado local del DOM (foco, scroll) se pierde. Consistente con el resto de la sección.
- **`.config-info` aparece dos veces** (perfil y "Acerca de"): al testear/seleccionar, scopear a la sección (`section[aria-labelledby="config-perfil-title"]`) para no capturar la de "Acerca de".
- **Persistencia debounced (200 ms)**: un `reload()` inmediato tras guardar puede perder el cambio si el flush no corrió; en E2E, además, el `addInitScript` de `saltearOnboarding` resiembra `fk_v1` en cada carga (por eso la persistencia se verifica leyendo `localStorage`, no recargando).
- **El Centro Legal depende de `fetch` en tiempo de ejecución**: si el `.md` no está precacheado y el dispositivo está offline en el primer uso, `_mostrarDocumentoLegal()` muestra un mensaje de error corto en vez de romper el modal (catch explícito). Los 10 documentos están en `CORE_ASSETS` del service worker: en producción, tras la primera visita quedan disponibles offline igual que el resto de la app.
- **Contenido en v0.1, no v1.0**: los textos de `docs/legal/` tienen marcadores `[PENDIENTE: ...]` (responsable, correo de contacto) visibles tal cual en el modal hasta que Esteban los resuelva; no es un bug, es el estado real del paquete (ver `docs/legal/README.md`).

**Cambios pendientes**: la iniciativa fusionada CFG.1+CFG.2 sigue con CFG.2a y CFG.2b (ver BOARD). El resto de CFG.* sin iniciar. LEG.1 (Centro Legal) queda **cerrada**: falta resolver el checklist de contenido de `docs/legal/README.md` (LEG.2, bloqueada por eso, no por código).

**Cambios realizados**:

- 2026-07-09 (LEG.1, rebanada de UI): apartado "⚖️ Centro Legal" en Ajustes (`_renderLegal()`), lista de los 10 documentos con `data-action="abrir-legal"`. Un solo modal genérico (`#modal-legal` en `index.html`) trae el `.md` correspondiente con `fetch` (mismo origen; el service worker ya los precachea, `docs/legal/*.md` sumados a `CORE_ASSETS`, SW v340 → v341) y lo convierte con un conversor Markdown propio nuevo (`infra/markdown.js`, sin dependencias, cubre solo el subconjunto que usan estos documentos: encabezados, negrita, código en línea, enlaces, listas, tablas, citas, `---`). Los enlaces `[texto](otro.md)` llevan `data-doc-link` y cambian de documento sin cerrar el modal (delegación de eventos en `_wireLegalLinks()`). 13 tests unitarios de `markdown.js` + 2 de la lista en `config.test.js` + 3 E2E reales (fetch contra los `.md` servidos, navegación entre documentos, cierre del modal). 2282/2282 unit + 158/158 E2E verdes.
- 2026-07-09 (LEG.1, rebanada de borradores; solo docs, cero código): redactado el paquete legal completo en `docs/legal/` (11 archivos: README con reglas de versionado y checklist de pendientes, términos y condiciones, política de privacidad, tratamiento de datos personales Ley 1581, aviso de cookies, descargo de responsabilidad, propiedad intelectual, aviso de marcas de terceros, licencias de terceros, aviso legal e historial de cambios). Modelo local-only vigente, con cláusula de cambio de modelo (CFG.4) en cada documento y formato ADN 11 ("En pocas palabras" + texto formal). Marcadores `[PENDIENTE: ...]` para responsable, correo de contacto y decisión de licencia del código; gate: revisión por abogado colombiano antes de pasar a v1.0.

- 2026-07-06 (CFG.1a, fusión CFG.1+CFG.2 slice 1): el encabezado del perfil mostraba nombre + "SMMLV configurado" con un campo editable, pero `S.perfil.smmlv` no lo leía ningún cálculo (dato muerto). Se quitó ese campo del encabezado (`_renderPerfil`) y se agregó **situación laboral** (`SITUACIONES_LABORALES`: empleado, independiente, pensionado, mixto, otro; `''` = sin especificar), persistida en `perfil.situacionLaboral` (schema v24 → v25, migración idempotente). El handler de `#form-perfil` valida contra el catálogo (nunca guarda un valor libre). Ficha nueva (primer análisis a fondo de la sección, regla 2.6). 9 tests nuevos (5 de render en `config.test.js` nuevo, 4 de migración en `storage.test.js`) + 2 E2E en `smoke.test.js`; `state.test.js` actualizado a la forma nueva de `perfil`. 2252/2252 unit + 155/155 E2E verdes. SW v335 → v336.
