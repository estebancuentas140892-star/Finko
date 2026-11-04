// Setup global para todos los tests de Finko Claude
// Se ejecuta antes de cada archivo de test (setupFiles en vitest.config.js)

import { beforeEach } from 'vitest';

// Simular localStorage en happy-dom
// happy-dom ya lo provee, pero lo inicializamos limpio antes de cada test
beforeEach(() => {
  localStorage.clear();
});

// ADR 120: los navegadores disparan `formdata` en el formulario cada vez que
// se arma un `new FormData(form)` (Chrome 77, Firefox 72, Safari 15), y los
// campos de dinero viajan como dígitos gracias a eso (`ui/miles.js`).
// happy-dom no lo dispara: se le agrega acá para que las pruebas lean lo que
// leería el navegador.
const FormDataNativo = globalThis.FormData;
globalThis.FormData = window.FormData = class FormData extends FormDataNativo {
  constructor(form, ...resto) {
    super(form, ...resto);
    if (form && typeof form.dispatchEvent === 'function') {
      const e = new Event('formdata');
      e.formData = this;
      form.dispatchEvent(e);
    }
  }
};

// Helpers de test reutilizables (disponibles globalmente en los tests)
// Los tests los importan explícitamente si los necesitan - no se globalizan
