# ADR 001 — Sin build step en runtime

**Estado:** Aceptada
**Fecha:** 2026-05-12
**Autores:** Esteban (producto), Claude Sonnet 4.6 (arquitectura)

---

## Contexto

Al iniciar Finko Claude, se evaluó si usar un bundler (Vite, Webpack, esbuild) o TypeScript como parte del stack de desarrollo.

Las alternativas consideradas:

1. **Vanilla JS + ES6 modules (sin build)** — opción elegida.
2. **Vite como bundler** — proceso de build, output en `/dist`, código diferente al fuente.
3. **TypeScript** — requiere compilación; el archivo fuente `.ts` ≠ el archivo que corre.
4. **TypeScript + Vite** — máxima complejidad de toolchain.

---

## Decisión

**El proyecto usa Vanilla JS + ES6 modules directamente, sin bundler ni transpilador en runtime.**

Vite se usa SOLO como servidor de desarrollo de tests (Vitest). Nunca genera un `/dist`.

---

## Justificación

### 1. Auditabilidad total

Con ES6 modules, lo que el desarrollador escribe es exactamente lo que el navegador ejecuta. No hay un paso de transformación que introduzca código que nadie escribió. Cualquier persona puede abrir DevTools → Sources y ver el código fuente real.

### 2. Onboarding de cero fricción

Para correr la app: `python -m http.server 8080`. No se necesita Node, npm run build, ni ninguna otra herramienta. Un desarrollador nuevo puede contribuir en minutos.

### 3. Depuración más simple

Los stack traces apuntan directamente a líneas del código fuente. No hay sourcemaps que mantener ni mapeos que puedan desfasarse.

### 4. Consistencia con el proyecto de referencia

Finko-Refactor (el proyecto del que nace este) tiene 1.311 tests verdes y funciona perfectamente sin build step. Esta decisión está validada por años de uso real.

### 5. Alineación con la propuesta de valor

La app es offline-first y privada. No necesita optimizaciones de bundle para un archivo que se cachea íntegramente en el primer load.

---

## Consecuencias

### Positivas

- Sin paso de build: despliegue = copiar archivos.
- Stack trace directo al código fuente.
- Sin vulnerabilidades de supply-chain en dependencias de build.
- Desarrolladores sin experiencia en tooling moderno pueden contribuir.

### Negativas / Restricciones

- Sin tree-shaking automático — todo el código importado se descarga.
  - *Mitigación:* lazy-loading manual de módulos pesados (ej: `calculadoras/`).
- Sin minificación del código JS en producción.
  - *Mitigación:* el Service Worker cachea todo en el primer load; el tamaño importa menos en visitas subsecuentes.
- Sin TypeScript — no hay chequeo estático de tipos en tiempo de compilación.
  - *Mitigación:* JSDoc con `// @ts-check` para tipado opcional sin compilar. Tests cubre la lógica crítica.

---

## Alternativas rechazadas

### Vite como bundler

**Por qué no:** genera un `/dist` con código diferente al fuente. Introduce una herramienta de build que el proyecto no necesita. La propuesta de valor (sin servidor, auditable, sin fricción) se debilita.

**Cuándo reconsiderar:** si la app crece a >50 archivos JS y el tiempo de carga en red lenta se convierte en un problema real medido. En ese caso, evaluar Vite + output a `/dist` con Service Worker actualizado.

### TypeScript

**Por qué no:** requiere compilación. El fuente `.ts` no es lo que corre en el navegador. Añade un paso de build que contradice la filosofía del proyecto.

**Cuándo reconsiderar:** si el proyecto supera los 20.000 LOC y los errores de tipo se convierten en la principal causa de bugs. En ese caso, migrar solo los archivos de `core/` primero.

---

## Próxima revisión

Revisar esta decisión si:
- El tiempo de carga en 3G supera los 5 segundos (medir con Lighthouse en condiciones de red lenta).
- El número de archivos JS supera los 50.
- El equipo crece a más de 3 desarrolladores activos simultáneos.
