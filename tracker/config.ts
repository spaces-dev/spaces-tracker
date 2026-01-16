import path from 'node:path'

interface TrackerConfig {
  Host: string
  RequestHeaders: Record<string, string>
  Concurrency: number
  IconsPath: string
  LinksPath: string
  RevisionsPath: string
  GitDiffExclude: string[]
}

export const Config: TrackerConfig = {
  Host: 'http://spac.me',
  RequestHeaders: {
    Cookie: 'sandbox=beta',
  },
  Concurrency: 10,
  GitDiffExclude: [
    'revisions.json',
    'links.json',
    'icons.json',
  ],
  IconsPath: path.resolve('icons.json'),
  LinksPath: path.resolve('links.json'),
  RevisionsPath: path.resolve('revisions.json'),
}
