module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Allow @ts-ignore for Obsidian internals
    '@typescript-eslint/ban-ts-comment': 'off',
    // Allow 'any' with a warning (Obsidian APIs sometimes need it)
    '@typescript-eslint/no-explicit-any': 'warn',
    // No unused variables (errors are likely bugs)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // Prefer const
    'prefer-const': 'error',
    // No var
    'no-var': 'error',
  },
  env: {
    browser: true,
    es2018: true,
    node: true,
  },
  ignorePatterns: ['node_modules/', 'main.js', '*.mjs'],
};
