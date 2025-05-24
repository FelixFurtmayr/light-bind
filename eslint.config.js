export default {
  root: true,
  env: {
    browser: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Basis-Regeln
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    
    // Import/Export bezogene Regeln
    'import/no-unresolved': 'off', // Da wir keine vollständige Projektstruktur für ESLint haben
    
    // Stilregeln
    'quotes': ['warn', 'single', { 'allowTemplateLiterals': true }],
    'semi': ['warn', 'always']
  },
  globals: {
    // Spezifische globale Objekte für dieses Projekt
    'LightBind': 'writable',
    'renderComponent': 'writable'
  }
};
