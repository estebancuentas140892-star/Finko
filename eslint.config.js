// ESLint 9 flat config — solo JS, sin TypeScript, sin build step
export default [
  {
    files: ['modules/**/*.js', 'tests/**/*.js', 'scripts/**/*.js'],
    rules: {
      // Errores reales
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Estilo — complementa Prettier
      'prefer-const': 'error',
      'no-var': 'error',

      // Regla ADN del proyecto: sin window.X global
      'no-implicit-globals': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Globals del navegador usados en módulos UI
        document: 'readonly',
        window: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/', 'coverage/'],
  },
];
