export interface SourcemapFile {
  path: string
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
  changed: Map<string, SourcemapFile>
  failed: {
    url: string
    error: string
  }[]
  links: TrackerLinks
}

export interface TrackerLinks {
  assets: Record<string, string[]>
  added: string[]
  removed: string[]
}

export type RevisionAssets = [path: string, hash: string][]

export interface Sourcemap {
  version: number
  sources: string[]
  sourcesContent: string[]
  names: string[]
  mappings: string
}
