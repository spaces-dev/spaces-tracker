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
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-20b:free',
  ],
  IconsPath: 'icons.json',
  LinksPath: 'links.json',
  RevisionsPath: 'revisions.json',
}
