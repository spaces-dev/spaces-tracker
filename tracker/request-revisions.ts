import fs from 'node:fs/promises'
import path from 'node:path'
import { Config } from './config.ts'
import { trackerStats } from './stats.ts'
import {
  fileIsChanged,
  readJson,
  spacesRequest,
  writeJson,
} from './utils.ts'
import type {
  RevisionAssets,
  Revisions,
  SourceConfig,
} from './types.ts'

class RequestRevisions {
  private async loadJs(source: SourceConfig) {
    const req = await spacesRequest(source.url, source.revisions)

    if (!req.ok) {
      throw new Error(`Can't download js revisions from "${source.name}"`)
    }

    const json = await req.json()
    return json as Record<string, string>
  }

  private async loadCss(source: SourceConfig) {
    const req = await spacesRequest(source.url, `/css/custom/revisions.json`)

    if (!req.ok) {
      throw new Error(`Can't download css revisions from "${source.name}"`)
    }

    const json = await req.json()
    return json as Record<string, string>
  }

  async loadRevisions(source: SourceConfig) {
    const js = await this.loadJs(source)
    const css = await this.loadCss(source)

    const res = await this.parseRevisionsRequest(source, {
      js,
      css,
    })

    const revisionsPath = path.join(source.name, Config.RevisionsPath)

    let currentRevision: Revisions
    try {
      currentRevision = await readJson<Revisions>(revisionsPath)
    } catch {
      currentRevision = { js: {}, css: {} }
    }

    const isChanged = await fileIsChanged(res.revisions, currentRevision)
    if (isChanged) {
      await fs.mkdir(path.dirname(revisionsPath), { recursive: true })
      await writeJson(revisionsPath, res.revisions)

      const linksPath = path.join(source.name, Config.LinksPath)
      let currentLinks: string[]
      try {
        currentLinks = await readJson<string[]>(linksPath)
      } catch {
        currentLinks = []
      }

      if (source.isPrimary) {
        trackerStats.computeRemovedLinks(res.links, currentLinks)
      }

      await writeJson(linksPath, res.links)
    }

    return {
      isChanged,
      ...res,
    }
  }

  private async parseRevisionsRequest(source: SourceConfig, revisions: Revisions) {
    const jsBasePath = source.revisions.replace('revisions.json', '')

    const js = Object.entries(revisions.js)
      .filter(([path]) => path.endsWith('.js'))
      .map(([path, hash]) => [`${jsBasePath}${path}`, hash]) as RevisionAssets

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
