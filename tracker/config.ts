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
      url: 'https://vps402.strip2.co',
      // https://vps402.strip2.co/js/ru/revisions.json
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
  IconsPath: 'icons.json',
  LinksPath: 'links.json',
  RevisionsPath: 'revisions.json',
}
