import type { TrackerConfig } from './types.ts'

export const Config: TrackerConfig = {
  Sources: [
    {
      name: 'spaces',
      url: 'http://spac.me',
      // http://spac.me/js/revisions.json
      revisions: '/js/revisions.json',
      isPrimary: true,
    },
    {
      name: 'kinotam',
      url: 'https://kinotam.pro',
      // https://kinotam.pro/js/revisions.json
      revisions: '/js/revisions.json',
    },
    {
      name: 'strip2',
      url: 'https://strip2.co',
      // https://strip2.co/js/ru/revisions.json
      revisions: '/js/ru/revisions.json',
    },
  ],
  RequestHeaders: {
    Cookie: 'sandbox=beta',
  },
  Concurrency: 10,
  GitDiffExclude: [
    '**/revisions.json',
    '**/links.json',
    '**/icons.json',
  ],
  Models: [
    'qwen/qwen3-vl-235b-a22b-thinking',
    'qwen/qwen3-vl-30b-a3b-thinking',
    'qwen/qwen3-coder:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'z-ai/glm-4.5-air:free',
    'mistralai/mistral-small-3.1-24b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1-0528:free',
    'arcee-ai/trinity-large-preview:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
  ],
  IconsPath: 'icons.json',
  LinksPath: 'links.json',
  RevisionsPath: 'revisions.json',
}
