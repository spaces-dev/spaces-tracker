export interface SourcemapFile {
  path: string
  isAdded: boolean
  isChanged: boolean
  fileSize: string
  lastCommitDate?: string | null
}

export interface SourcemapResponse {
  path: string
  error: string | null
  files: SourcemapFile[]
}

export interface Stats {
  startTime: number
  isChanged: boolean
  changed: SourcemapFile[]
  added: SourcemapFile[]
  removed: string[]
  failed: {
    path: string
    error: string
  }[]
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

export interface SourceConfig {
  name: string
  url: string
  revisions: string
  isPrimary?: boolean
}

export interface TrackerConfig {
  Sources: SourceConfig[]
  RequestHeaders: Record<string, string>
  Concurrency: number
  IconsPath: string
  LinksPath: string
  RevisionsPath: string
  GitDiffExclude: string[]
  Models: string[]
}

export interface TrackerState {
  lastRun: Record<string, number>
}
