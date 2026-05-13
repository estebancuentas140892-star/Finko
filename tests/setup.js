// Setup global para todos los tests de Finko Claude
// Se ejecuta antes de cada archivo de test (setupFiles en vitest.config.js)

import { beforeEach } from 'vitest';

// Simular localStorage en happy-dom
// happy-dom ya lo provee, pero lo inicializamos limpio antes de cada test
beforeEach(() => {
  localStorage.clear();
});

// Helpers de test reutilizables (disponibles globalmente en los tests)
// Los tests los importan explícitamente si los necesitan — no se globalizan
