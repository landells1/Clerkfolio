import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// ESLint 9 flat config. eslint-config-next 16 ships a native flat config, so we
// spread its `core-web-vitals` array directly. This is a config-format +
// version migration (from .eslintrc.json `extends: next/core-web-vitals` under
// ESLint 8 / config-next 15) — deliberately NOT a new-rules adoption.
//
// config-next 16 bundles eslint-plugin-react-hooks v6, which turns on the
// React Compiler rule set (purity / set-state-in-effect / immutability / refs).
// Those rules flag many pre-existing, valid patterns here (SSR-safe setState in
// effects, the "latest ref" idiom, etc.), so adopting them is a separate,
// larger piece of work. Disable them to keep the effective rule set equivalent
// to before. reportUnusedDisableDirectives is turned off to match the previous
// ESLint 8 CLI behaviour (it did not report unused disable directives).
//
// Pinned to ESLint 9: config-next 16's bundled eslint-plugin-react still calls
// the context.getFilename() API that ESLint 10 removed.
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
]

export default eslintConfig
