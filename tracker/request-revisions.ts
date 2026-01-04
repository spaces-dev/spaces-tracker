import path from 'node:path'
import { api } from './api.ts'
import { Config } from './config.ts'
import { fileIsChanged, readJson, writeJson } from './utils.ts'
import type { ComparedLinks, RevisionAssets, Revisions } from './types.ts'

class RequestRevisions {
  async loadRevisions() {
    const fileName = path.basename(Config.RevisionsPath)
    const request = await api.request(`/js/${fileName}`)

    if (!request.ok) {
      throw new Error(`Can't download ${fileName}: ${request.status}`)
    }

    const response = await this.parseRevisionsRequest(request)

    const currentRevision = await readJson<Revisions>(Config.RevisionsPath)
    const isChanged = await fileIsChanged(response.revisions, currentRevision)
    await writeJson(Config.RevisionsPath, response.revisions)

    const currentLinks = await readJson<string[]>(Config.LinksPath)
    const comparedLinks = this.compareLinks(response.links, currentLinks)
    await writeJson(Config.LinksPath, response.links)

    return {
      isChanged,
      comparedLinks,
      ...response,
    }
  }

  private async parseRevisionsRequest(response: Response) {
    const revisions = await response.json() as Revisions

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

  private compareLinks(
    prevLinks: string[],
    currentLinks: string[],
  ): ComparedLinks {
    const added = prevLinks.filter(link => !currentLinks.includes(link))
    const removed = currentLinks.filter(link => !prevLinks.includes(link))

    return {
      added,
      removed,
    }
  }
}

export const requestRevisions = new RequestRevisions()
