import path from 'node:path'

interface TrackerConfig {
  Host: string
  RequestHeaders: Record<string, string>
  Concurrency: number
  ETagsPath: string
  IconsPath: string
  LinksPath: string
  RevisionsPath: string
}

export const Config: TrackerConfig = {
  Host: 'http://spac.me',
  RequestHeaders: {
    // Cookie: 'sandbox=beta',
  },
  Concurrency: 10,
  ETagsPath: path.resolve('etags.json'),
  IconsPath: path.resolve('icons.json'),
  LinksPath: path.resolve('links.json'),
  RevisionsPath: path.resolve('revisions.json'),
}
