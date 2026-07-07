# Ficha de contexto: Configuración (Ajustes)

> Ver reglas de uso y plantilla en [`README.md`](README.md).

---

## Panel de Ajustes (dominio `config`)

- **Objetivo**          : centro de configuración de Finko. Hoy agrupa: perfil (nombre + situación laboral), perfil fiscal (K.2), datos de renta manuales (K.4), apariencia (tema), instalar PWA, recordatorios (notificaciones), gestión de datos (export/import/reset + aviso de cuota ADR 030) y "Acerca de". Es un dominio de UI: lee `S`, muta directamente (sin EventBus para sus propios formularios) y re-renderiza el panel entero tras cada guardado.
- **Estado actual**     : estable. **CFG.1a** (2026-07-06) reemplazó el campo SMMLV muerto del encabezado por la situación laboral (schema v25). Iniciativa fusionada CFG.1+CFG.2 en curso: siguen **CFG.2a** (auto-derivar ingresos brutos al monitor de renta) y **CFG.2b** (inferir el estado de declarante). Otras tarjetas del BOARD sin iniciar: CFG.3 (notificaciones anticipatorias), CFG.4 (respaldo, roza ADN), CFG.5 (seguridad de acceso), CFG.6 (auditoría de la sección).
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

**Recursos**: estilos en `styles/components/config.css` (`.config-section`, `.config-info`, `.config-form`, `.config-toggle`, `.config-danger`, `.config-actions`). Constantes: `SITUACIONES_LABORALES`, `SMMLV`/`legalVigente`/`APP_VERSION` (Acerca de), `UVT`/`TOPES_RENTA_UVT` (usados por el monitor de renta que vive en `analisis`, no aquí). El monitor de renta (K.3) que consume `config.datosFiscales` y `config.perfilFiscal` vive en `analisis/logic.js` (`calcularEstadoRenta`), ver [`analisis.md`](analisis.md).

**Dependencias y relaciones**: `config/index.js` registra acciones (`exportar-datos`, `importar-datos`, `resetear-app`, `activar-notificaciones`, `toggle-notificaciones`, `exportar-gastos-csv`) y maneja los `submit` de `#form-perfil`, `#form-perfil-fiscal`, `#form-datos-fiscales` directamente (muta `S`, `save()`, re-render). Escucha `storage:error`/`storage:cuota` (ADR 030) y `theme:change`. `_exportarDatos` serializa `S` completo; `_importarDatos`/`_resetearApp` recargan la app. El perfil fiscal y los datos de renta que se guardan aquí los **lee** el monitor de renta de Análisis (ADN 10 respetado: Análisis lee `S`, no importa `config`).

**Riesgos**:

- **`perfil.smmlv` es dato muerto (CFG.1)**: ningún cálculo lo lee (la lógica usa la constante legal `SMMLV`). CFG.1a dejó de mostrarlo/editarlo pero lo **conserva en el estado** por compatibilidad de datos existentes y de los seeds E2E que lo setean. No re-introducir un campo de "salario" que nada consuma (fue justo lo que CFG.1 eliminó).
- **La situación laboral hoy no tiene consumidor todavía**: CFG.1a la captura como fundación; su consumidor real llega en **CFG.2a/CFG.2b** (encuadre e interpretación del monitor de renta). Es deliberado dentro de la iniciativa fusionada: es un campo controlado (solo ids de `SITUACIONES_LABORALES` o `''`), no dato libre inerte.
- **El panel se re-renderiza entero (`renderPanelConfig`) tras cualquier guardado**: barato (sin barridos de historial), pero cualquier estado local del DOM (foco, scroll) se pierde. Consistente con el resto de la sección.
- **`.config-info` aparece dos veces** (perfil y "Acerca de"): al testear/seleccionar, scopear a la sección (`section[aria-labelledby="config-perfil-title"]`) para no capturar la de "Acerca de".
- **Persistencia debounced (200 ms)**: un `reload()` inmediato tras guardar puede perder el cambio si el flush no corrió; en E2E, además, el `addInitScript` de `saltearOnboarding` resiembra `fk_v1` en cada carga (por eso la persistencia se verifica leyendo `localStorage`, no recargando).

**Cambios pendientes**: la iniciativa fusionada CFG.1+CFG.2 sigue con CFG.2a y CFG.2b (ver BOARD). El resto de CFG.* sin iniciar.

**Cambios realizados**:

- 2026-07-06 (CFG.1a, fusión CFG.1+CFG.2 slice 1): el encabezado del perfil mostraba nombre + "SMMLV configurado" con un campo editable, pero `S.perfil.smmlv` no lo leía ningún cálculo (dato muerto). Se quitó ese campo del encabezado (`_renderPerfil`) y se agregó **situación laboral** (`SITUACIONES_LABORALES`: empleado, independiente, pensionado, mixto, otro; `''` = sin especificar), persistida en `perfil.situacionLaboral` (schema v24 → v25, migración idempotente). El handler de `#form-perfil` valida contra el catálogo (nunca guarda un valor libre). Ficha nueva (primer análisis a fondo de la sección, regla 2.6). 9 tests nuevos (5 de render en `config.test.js` nuevo, 4 de migración en `storage.test.js`) + 2 E2E en `smoke.test.js`; `state.test.js` actualizado a la forma nueva de `perfil`. 2252/2252 unit + 155/155 E2E verdes. SW v335 → v336.
