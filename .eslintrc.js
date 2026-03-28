module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  root: true,
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // `any` is widely used for API error shapes and RN internal types — warn, don't block
    '@typescript-eslint/no-explicit-any': 'warn',
    // Standalone expressions are sometimes used intentionally (e.g. short-circuit renders)
    'no-unused-expressions': 'warn',
    '@typescript-eslint/no-unused-expressions': 'warn',
    // React Native's Animated API requires reading .current during render for style props
    'react-hooks/refs': 'off',
  },
};
