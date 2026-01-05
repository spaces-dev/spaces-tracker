import type { SourcemapFile, SourcemapResponse, Stats } from './types.ts'

class TrackerStats {
  private startTime = Date.now()

  private changed: SourcemapFile[] = []
  private added: SourcemapFile[] = []
  private removed: string[] = []
  private failed: { url: string, error: string }[] = []

  get stats(): Stats {
    const isChanged = this.changed.length !== 0
      || this.added.length !== 0
      || this.failed.length === 0

    return {
      startTime: this.startTime,
      changed: this.changed,
      added: this.added,
      failed: this.failed,
      removed: this.removed,
      isChanged,
    }
  }

  computeRemovedLinks(prevLinks: string[], currentLinks: string[]) {
    // const added = prevLinks.filter(link => !currentLinks.includes(link))
    const removed = currentLinks.filter(link => !prevLinks.includes(link))
    this.removed = removed
  }

  parseSourcemapResponses(
    sourcemapResponses: SourcemapResponse[],
  ) {
    for (const response of sourcemapResponses) {
      if (response.error) {
        this.failed.push({
          url: response.url,
          error: response.error,
        })
      } else {
        for (const file of response.files) {
          if (file.isChanged) {
            this.changed.push(file)
          } else if (file.isAdded) {
            this.added.push(file)
          }
        }
      }
    }

    return this.stats
  }
}

export const trackerStats = new TrackerStats()
