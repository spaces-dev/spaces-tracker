import type { ComparedLinks, SourcemapFile, SourcemapResponse } from './types'

class TrackerStats {
  private startTime = Date.now()

  private changed: SourcemapFile[] = []
  private added: SourcemapFile[] = []
  private failed: { url: string, error: string }[] = []
  private comparedLinks: ComparedLinks

  get stats() {
    return {
      startTime: this.startTime,
      changed: this.changed,
      added: this.added,
      failed: this.failed,
      comparedLinks: this.comparedLinks,
    }
  }

  setComparedLinks(comparedLinks: ComparedLinks) {
    this.comparedLinks = comparedLinks
  }

  parseSourcemapResponses(sourcemapResponses: SourcemapResponse[]) {
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
