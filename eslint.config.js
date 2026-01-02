import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  markdown: true,
  yaml: true,
  ignores: [
    'CSS',
    'JS',
  ],
  rules: {
    'curly': 'off',
    'no-alert': 'off',
    'no-console': 'off',
    'no-unused-vars': 'warn',
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    'antfu/if-newline': 'off',
    'antfu/no-top-level-await': 'off',
    'unused-imports/no-unused-imports': 'warn',
    'eslint-comments/no-unlimited-disable': 'off',
    'perfectionist/sort-imports': ['error', {
      groups: [
        'builtin',
        'external',
        ['internal', 'internal-type'],
        ['parent', 'sibling', 'index'],

        'type',
        ['parent-type', 'sibling-type', 'index-type'],

        'side-effect',
        'object',
        'unknown',
      ],
      newlinesBetween: 'ignore',
      order: 'asc',
      type: 'natural',
    }],
  },
  stylistic: {
    overrides: {
      'style/brace-style': ['warn', '1tbs'],
      'style/arrow-parens': 'off',
    },
  },
})
