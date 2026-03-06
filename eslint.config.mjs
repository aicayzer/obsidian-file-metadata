import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
  // ── Ignores ────────────────────────────────────────────────────────────────
  { ignores: ['node_modules/', 'main.js', '*.mjs', '!eslint.config.mjs'] },

  // ── TypeScript recommended (type-aware) ────────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Obsidian community plugin rules ────────────────────────────────────────
  {
    plugins: { obsidianmd },
    rules: {
      ...obsidianmd.configs.recommended,
    },
  },

  // ── Project overrides ──────────────────────────────────────────────────────
  {
    rules: {
      // Allow @ts-ignore for Obsidian internals
      '@typescript-eslint/ban-ts-comment': 'off',
      // Allow 'any' with a warning (Obsidian APIs sometimes need it)
      '@typescript-eslint/no-explicit-any': 'warn',
      // No unused variables (errors are likely bugs)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Catch unhandled promises
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefer const
      'prefer-const': 'error',
      // No var
      'no-var': 'error',
    },
  },
);
