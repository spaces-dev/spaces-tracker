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
    'arcee-ai/trinity-large-preview:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'qwen/qwen3-coder:free',
    'z-ai/glm-4.5-air:free',
    'openai/gpt-oss-120b:free',
    'deepseek/deepseek-r1-0528:free',
  ],
  IconsPath: 'icons.json',
  LinksPath: 'links.json',
  RevisionsPath: 'revisions.json',
}
