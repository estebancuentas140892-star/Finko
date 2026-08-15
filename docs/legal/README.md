# Paquete legal de Finko (modelo local-only)

> Fuente de verdad de los textos legales de la app. La UI del Centro Legal (tarjeta LEG.1, rebanada de UI)
> consumirá estos documentos; la aceptación versionada es LEG.2.
> Estado global: **borradores v0.1, pendientes de revisión por un abogado colombiano** (gate del punto 9
> del brief: esa revisión es trabajo profesional externo, no tarea de código ni de IA).

## Documentos

| Documento | Archivo | Versión |
|---|---|---|
| Términos y condiciones | [terminos-y-condiciones.md](terminos-y-condiciones.md) | 0.1 borrador |
| Política de privacidad | [politica-de-privacidad.md](politica-de-privacidad.md) | 0.1 borrador |
| Tratamiento de datos personales (Ley 1581 de 2012) | [tratamiento-de-datos-personales.md](tratamiento-de-datos-personales.md) | 0.1 borrador |
| Aviso de cookies y almacenamiento local | [aviso-de-cookies.md](aviso-de-cookies.md) | 0.1 borrador |
| Descargo de responsabilidad | [descargo-de-responsabilidad.md](descargo-de-responsabilidad.md) | 0.1 borrador |
| Propiedad intelectual | [propiedad-intelectual.md](propiedad-intelectual.md) | 0.1 borrador |
| Aviso de marcas de terceros | [marcas-de-terceros.md](marcas-de-terceros.md) | 0.1 borrador |
| Licencias de terceros | [licencias-de-terceros.md](licencias-de-terceros.md) | 0.1 borrador |
| Aviso legal e identificación | [aviso-legal.md](aviso-legal.md) | 0.1 borrador |
| Historial de cambios de las políticas | [historial-de-cambios.md](historial-de-cambios.md) | vivo |

## Reglas de redacción y versionado

1. **Doble registro (ADN 11):** cada documento abre con "En pocas palabras" (lenguaje claro, tuteo)
   y sigue con el texto formal por secciones numeradas. Sin jerga innecesaria, sin guion largo.
2. **Versionado:** `0.x` = borrador interno; `1.0` = primera versión publicable tras la revisión
   jurídica. Todo cambio publicado se registra en [historial-de-cambios.md](historial-de-cambios.md)
   con versión, fecha y resumen del cambio. La app (LEG.2) compara la versión aceptada por el usuario
   contra la vigente para pedir re-aceptación cuando el cambio sea importante.
3. **Cláusula CFG.4:** todos los documentos describen el modelo vigente **local-only**
   (sin servidor, sin cuentas, sin sync). **Decidido el 2026-08-15** ([ADR 043](../DECISIONS/043-sincronizacion-multidispositivo-y-cuentas.md),
   Aceptado): Finko no incorpora cuentas de usuario ni sincronización entre dispositivos.
   Si esa decisión se reabriera en el futuro con un ADR nuevo, el paquete se reescribiría:
   responsable del tratamiento, encargados, canales de derechos y evidencia de consentimiento
   cambiarían por completo. Cada documento incluye su propia cláusula de cambio de modelo.
4. **Hechos verificados (2026-07-09), no prometer nada distinto:**
   - Los datos del usuario viven solo en `localStorage` (clave `fk_v1`) del dispositivo. Nada viaja a
     servidores de Finko (no existen servidores de Finko).
   - La app no usa cookies, ni analytics, ni publicidad, ni SDKs de terceros en runtime.
   - Hosting de archivos estáticos: Vercel (`https://finko-brown.vercel.app`). Repositorio público en GitHub.
   - Recursos de terceros distribuidos: fuentes Inter y DM Mono (SIL OFL 1.1) y glifos de marca
     curados de Simple Icons (CC0). Las herramientas de desarrollo (Vitest, Playwright, ESLint...)
     no se distribuyen con la app.
   - Ajustes ofrece exportar/importar respaldo JSON (con cifrado opcional por contraseña, que Finko no guarda ni puede recuperar), exportar/importar gastos CSV y borrar todos los datos.

## Datos pendientes (bloquean el paso a v1.0)

- [ ] **Nombre e identificación del responsable** del producto (persona natural o figura que decida
      Esteban). Marcador en los textos: `[PENDIENTE: responsable]`.
- [ ] **Correo real de contacto** para derechos de datos y solicitudes de titulares de marcas.
      Marcador: `[PENDIENTE: correo de contacto]`. Hoy no hay ningún canal publicado.
- [ ] **Licencia del código:** el repositorio es público en GitHub y no tiene archivo LICENSE, así que
      rige "todos los derechos reservados" por defecto. Decidir si se mantiene así o se adopta una
      licencia abierta; la sección 4 de [propiedad-intelectual.md](propiedad-intelectual.md) depende de esto.
- [ ] **Revisión por abogado colombiano** de todo el paquete (gate del brief, punto 9).
