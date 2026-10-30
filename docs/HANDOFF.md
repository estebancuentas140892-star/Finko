# HANDOFF - Finko Claude

> Este archivo responde **una sola pregunta: dónde estamos hoy.**
> NO contiene: historia ([CHANGELOG](CHANGELOG.md)), workflow ([CLAUDE.md](../CLAUDE.md) sección 2), comandos ([README](../README.md)), runbooks ([OPERACION](OPERACION.md)), arquitectura ([ARCHITECTURE](ARCHITECTURE.md)), errores ([BUGS](BUGS.md)), identidad del producto ([CLAUDE.md](../CLAUDE.md) sección 0). Techo: 6 KB.
> Se actualiza al cerrar **cada** tarea o fase.
> Revisado: 2026-10-29. Última tarea cerrada: MV2.12, una sola barra para ir de lado (ADR 104). MOV.1 en pausa. HF.0f en curso: banco listo sin commitear, BUG-035, BUG-036 y BUG-038 abiertos.

**Producción:** https://finko-brown.vercel.app - **Repositorio:** https://github.com/estebancuentas140892-star/Finko - **Versión** `v1.0.0`, rama `main`.

---

## 1. Estado técnico

| Métrica | Valor |
|---|---|
| Tests unitarios + integración | 5150/5150 (2026-10-29, MV2.12) |
| Tests E2E | 371/371 verdes (2026-10-29, MV2.12). **Compuerta** desde el 2026-07-30 |
| Schema version (`localStorage`) | v48 (`perfiles`, APR.3a) |
| Lighthouse | 100 en Performance, Accessibility, Best Practices y SEO |
| Cobertura lógica | 99,6 % líneas |
| `onclick` / `window.X` en módulos | 0 / 0. `style=""` es 0 en HTML estático, no en el HTML que generan los módulos (29 usos) |
| Errores abiertos | **4**: BUG-027 (documental), BUG-035, BUG-036 y BUG-038 (los encontró HF.0f, sin corregir). Detalle: [`BUGS.md`](BUGS.md) |

---

## 2. Últimas 5 tareas cerradas

**MV2.12 - una sola barra para ir de lado, 2026-10-29**
Ahorro pinta la barra de lentes de Gastos (hijas y portada); ninguna barra se desliza a 320 y el estado va en la esquina, con un punto en Reservas ([ADR 104](DECISIONS/104-una-sola-barra-para-ir-de-lado.md)). Solo móvil. SW v631.

**MARCA.1 - el isotipo de Finko, 2026-10-29**
La "F" de tres piezas reemplaza a la "F" tipográfica en su teja de fondo fijo; íconos, favicon y splash salen de `assets/svg/identidad/isotipo.svg` ([ADR 103](DECISIONS/103-el-isotipo-de-finko.md)). SW v630.

**MV2.6 - las fechas dicen el año solo si no es el de hoy, 2026-10-29**
Mes en tres letras y el año solo si no es el actual, en toda la app; Movimientos no repite el del grupo. `fechaLegible` reemplaza a `fechaCorta` y tres copias ([ADR 102](DECISIONS/102-fechas-con-el-ano-solo-si-no-es-el-de-hoy.md)). SW v629.

**APR.7 - Finko del adulto ayuda a decidir; no enseña, 2026-10-29**
Inicio del adulto en una sola pantalla; Aprende, Tu progreso, los avisos de logro y los Accesos rápidos salen de la app del adulto, conservando sus datos. El niño sigue con sus lecciones ([ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)). Sigue DEC.1. SW v628.

**APR.6b - "Este teléfono es de un adulto", 2026-10-29**
Desde "Yo" del niño, con confirmación: nombre, PIN y documentos; el niño queda como perfil del adulto con todo lo suyo. No se ofrece si el teléfono está unido a la nube ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md) D5). SW v627.

Historia completa: [`CHANGELOG.md`](CHANGELOG.md) y [`docs/changelog/`](changelog/).

---

## 3. Qué sigue

- **En pausa:** **MOV.1, auditoría UX/UI móvil de Claude Design**: 17 de 25 cerradas, sigue la 18 (Cierre). Pausada el 2026-10-27 para la prueba en la nube (decisión en chat); el orden de sus fichas no cambia. Detalle en la tarjeta de [`BOARD.md`](BOARD.md).
- **Iniciativa HF** ([ADR 091](DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md), Propuesta): su Fase 0 corre en paralelo a MOV.1 porque no comparte archivos ni decisiones; HF.0a, HF.0b, HF.0h, HF.0c, HF.0i, HF.0d, HF.0e y HF.0j cerradas; P1 a P8 resueltas. Pendientes de la Fase 0: HF.0f (banco construido y sin commitear: sus ocho rojas reproducen BUG-035, BUG-036 y BUG-038, no se cierra hasta corregirlos) y HF.0g; DOC.5 en Mantenimiento.
- **Iniciativa NUBE** ([ADR 096](DECISIONS/096-finko-en-la-nube-con-supabase.md), Aceptada): Finko en la nube con Supabase, cuenta opcional. NUBE.0 a NUBE.3 cerradas: cuenta por correo para invitados, sincronización por registro, borrar la cuenta y el teléfono del niño en `finko-prueba`. Sigue NUBE.4 (bancos), que pide su propio ADR; invitar probadores pide SMTP propio en Supabase.
- **Iniciativa APR, "Aprende y aplícalo"** ([ADR 092](DECISIONS/092-aprende-y-aplicalo-la-capa-de-aprendizaje.md) y [ADR 093](DECISIONS/093-perfiles-en-el-dispositivo-y-modo-nino.md), Propuesta; **solo del niño desde el [ADR 101](DECISIONS/101-finko-del-adulto-decide-no-ensena.md)**, que deja para el adulto la ayuda para decidir, DEC.1): Fase 1 en curso sin esperar a MOV.1 (decisión del 2026-10-24); Fase 1 cerrada; Fase 2 cerrada salvo la revisión pedagógica de APR.2c; Fases 1 a 4 hechas; el niño ya puede empezar solo ([ADR 100](DECISIONS/100-el-nino-empieza-solo.md)); quedan la revisión pedagógica de las lecciones del niño (APR.3f) y la ronda 2 de Tino ([ADR 094](DECISIONS/094-tino-el-guatin.md) y [095](DECISIONS/095-tino-en-el-sprite.md), APR.5b), que espera sus dibujos. Cada rebanada se sube a `main` al cerrar. El 093 acota el ADR 003 (ADN 11) solo dentro del perfil niño.
- **MV2.2, Finko móvil 2 segunda entrega**: en proceso en [`BOARD.md`](BOARD.md). Inicio (MV2.15, [ADR 099](DECISIONS/099-inicio-movil-hoy-en-una-lista.md)), las fechas (MV2.6) y las lentes (MV2.12, [ADR 104](DECISIONS/104-una-sola-barra-para-ir-de-lado.md)) cerrados y publicados; quedan Distribuir en Mis cuentas, "Más" y los chips de Movimientos. Rama `mv2/finko-movil-2`, publicada en `main`.
- **Fase actual:** post-v1.0, mantenimiento y mejoras por sección.
- **Decisiones de fondo abiertas** que bloquean sus tarjetas: ninguna de ADN. La última era sincronización multidispositivo, cerrada el 2026-08-15 ([ADR 043](DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md), con su condición de reapertura escrita). Para el resto, ver la columna Estado de cada tarjeta del tablero.
- **Antes de tocar una sección:** su ficha en [`contexto/`](contexto/README.md). Antes de explorar el código: [`ARCHITECTURE.md`](ARCHITECTURE.md) sección 13.
