# Ilustraciones

Carpeta reservada para ilustraciones spot y pictogramas (onboarding, momentos de
celebración, educación financiera). Hoy está vacía a propósito: los empty states
actuales son una composición generada en JS (`emptyArt()` en `modules/infra/icons.js`)
que orbita alrededor de los iconos de sección, y no requieren archivos.

Reglas cuando lleguen las primeras piezas:

- Mismo lenguaje visual del sistema (redondez, trazo cálido, chispa) aplicado a
  escala mayor; retícula recomendada 120×120 (la de `emptyArt`), `viewBox` propio
  documentado en este README al definirse.
- Colores solo por rol (`currentColor`, variables `--fk-*`): nunca absolutos,
  para sobrevivir a ambos temas.
- Nomenclatura y flujo de revisión idénticos al resto de la biblioteca
  (ver [README principal](../README.md)).
