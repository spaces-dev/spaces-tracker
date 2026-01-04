export interface SourcemapFile {
  path: string
  isAdded: boolean
  isChanged: boolean
  fileSize: string
  lastCommitDate?: string | null
}

export interface SourcemapResponse {
  url: string
  error: string | null
  files: SourcemapFile[]
}

export interface TrackerStats {
  startTime: number
  changed: SourcemapFile[]
  added: SourcemapFile[]
  failed: {
    url: string
    error: string
  }[]
  comparedLinks: ComparedLinks
}

export type RevisionAssets = [path: string, hash: string][]

export interface Revisions {
  js: Record<string, string>
  css: Record<string, string>
}

export interface ComparedLinks {
  added: string[]
  removed: string[]
}

export interface Sourcemap {
  version: number
  sources: string[]
  sourcesContent: string[]
  names: string[]
  mappings: string
}
