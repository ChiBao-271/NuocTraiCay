import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // This app intentionally uses browser storage and async fetch effects
      // for client-only state; keep the correctness rules but avoid v9
      // compiler-style bans on these established Next client patterns.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores(['.next/**', '.next-dev/**', 'out/**', 'build/**', 'dist/**', 'next-env.d.ts']),
]);
