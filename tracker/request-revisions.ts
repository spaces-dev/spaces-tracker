import path from 'node:path'
import { Config } from './config.ts'
import { trackerStats } from './stats.ts'
import { fileIsChanged, readJson, spacesRequests, writeJson } from './utils.ts'
import type { RevisionAssets, Revisions } from './types.ts'

class RequestRevisions {
  private async loadJs() {
    const req = await spacesRequests(`/js/${path.basename(Config.RevisionsPath)}`)

    if (!req.ok) {
      throw new Error(`Can't download js revisions`)
    }

    const json = await req.json()
    return json as Record<string, string>
  }

  private async loadCss() {
    const req = await spacesRequests(`/css/custom/${path.basename(Config.RevisionsPath)}`)

    if (!req.ok) {
      throw new Error(`Can't download css revisions`)
    }

    const json = await req.json()
    return json as Record<string, string>
  }

  async loadRevisions() {
    const js = await this.loadJs()
    const css = await this.loadCss()

    const res = await this.parseRevisionsRequest({
      js,
      css,
    })

    const currentRevision = await readJson<Revisions>(Config.RevisionsPath)
    const isChanged = await fileIsChanged(res.revisions, currentRevision)

    if (isChanged) {
      await writeJson(Config.RevisionsPath, res.revisions)
      const currentLinks = await readJson<string[]>(Config.LinksPath)
      trackerStats.computeRemovedLinks(res.links, currentLinks)
      await writeJson(Config.LinksPath, res.links)
    }

    return {
      isChanged,
      ...res,
    }
  }

  private async parseRevisionsRequest(revisions: Revisions) {
    const js = Object.entries(revisions.js)
      .filter(([path]) => path.endsWith('.js'))
      .map(([path, hash]) => [`/js/${path}`, hash]) as RevisionAssets

    const css = Object.entries(revisions.css)
      .filter(([path]) => path.endsWith('.css'))
      .map(([path, hash]) => [`/css/custom/${path}`, hash]) as RevisionAssets

    const linksGroup: Record<string, string[]> = {}
    for (const [link, hash] of [...js, ...css]) {
      if (!linksGroup[hash]) linksGroup[hash] = []
      linksGroup[hash].push(link)
    }

    const links = Object.values(linksGroup).flat().toSorted()

    return {
      revisions,
      links,
      linksGroup,
    }
  }
}

export const requestRevisions = new RequestRevisions()
