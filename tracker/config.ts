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
    'qwen/qwen3-coder:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'deepseek/deepseek-r1-0528:free',
    'openai/gpt-oss-120b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'z-ai/glm-4.5-air:free',
    'openai/gpt-oss-20b:free',
  ],
  IconsPath: 'icons.json',
  LinksPath: 'links.json',
  RevisionsPath: 'revisions.json',
}
