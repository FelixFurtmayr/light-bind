import terser from '@rollup/plugin-terser';

export default {
  input: 'lightbind.js',
  output: {
    file: 'lightbind.min.js',
    format: 'esm',
    extend: true
  },
  plugins: [
    terser() // Minification
    
  ]
};
