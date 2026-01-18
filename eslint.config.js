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
        'value-builtin',
        'value-external',
        ['value-internal', 'type-internal'],
        ['value-parent', 'value-sibling', 'value-index'],

        'type-import',
        ['type-parent', 'type-sibling', 'type-index'],

        'side-effect',
        'ts-equals-import',
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
