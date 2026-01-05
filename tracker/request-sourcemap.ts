import fs from 'node:fs/promises'
import path from 'node:path'
import { concurrentWorker } from './concurrency-worker.ts'
import { Config } from './config.ts'
import {
  compareFileSize,
  fileExists,
  fileIsChanged,
  fileLastCommitDate,
  request,
} from './utils.ts'
import type { Sourcemap, SourcemapFile, SourcemapResponse } from './types.ts'

const processedPathToSize: Record<string, number> = {}

async function loadSourcemap(sourcemapUrl: string) {
  const results: SourcemapResponse = {
    url: sourcemapUrl,
    files: [],
    error: null,
  }

  try {
    const req = await request(sourcemapUrl)

    if (!req.ok) {
      results.error = `HTTP ${req.status}`
      return results
    }

    const sourcemap = await req.json() as Sourcemap
    if (!sourcemap.sourcesContent && !sourcemap.mappings) {
      console.log('Sourcemap is empty', sourcemapUrl)
      return results
    }

    for (let i = 0; i < sourcemap.sources.length; i++) {
      const sourcePath = sourcemap.sources[i]
      const sourceContent = sourcemap.sourcesContent[i]
      if (!sourceContent) continue

      if (sourcePath in processedPathToSize) {
        if (processedPathToSize[sourcePath] !== sourceContent.length) {
          console.error(`Something goes wrong... At ${sourcePath}, prev: ${processedPathToSize[sourcePath]}, next: ${sourceContent.length}`)
          process.exit(1)
        }

        continue
      } else {
        processedPathToSize[sourcePath] = sourceContent.length
      }

      let fileSize = ''
      let isChanged = false
      let isAdded = false
      let lastCommitDate: SourcemapFile['lastCommitDate'] | undefined

      const contentPath = path.join('.', sourcePath.replace(/^[a-z]+:\/\/\//, ''))
      const isFileExists = await fileExists(contentPath)

      if (isFileExists) {
        const currentFile = await fs.readFile(contentPath, 'utf-8')
        isChanged = await fileIsChanged(sourceContent, currentFile)
        if (isChanged) lastCommitDate = await fileLastCommitDate(contentPath)

        const fileStats = await fs.stat(contentPath)
        fileSize = compareFileSize(fileStats.size, sourceContent.length)
      } else {
        isAdded = true
        lastCommitDate = 'new'
        fileSize = compareFileSize(sourceContent.length, sourceContent.length)
      }

      await fs.mkdir(path.dirname(contentPath), { recursive: true })
      await fs.writeFile(contentPath, sourceContent, 'utf-8')

      results.files.push({
        path: contentPath,
        isAdded,
        isChanged,
        fileSize,
        lastCommitDate,
      })
    }
  } catch (error) {
    results.error = (error as Error).message ?? 'Unknown error'
  }

  return results
}

export async function requestSourcemaps(linksGroup: Record<string, string[]>) {
  const hashes = Object.keys(linksGroup)
  const countAssets = hashes.length

  console.log(`Starting download sourcemaps (${countAssets} assets, concurrency: ${Config.Concurrency})\n`)

  const results = await concurrentWorker(hashes, async (hash, index) => {
    const urls = linksGroup[hash]

    let result: SourcemapResponse | null = null

    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
      const sourcemapUrl = `${urls[urlIndex]}.map`
      result = await loadSourcemap(sourcemapUrl)

      if (!result.error) {
        break
      }

      if (result.error && urlIndex < urls.length - 1) {
        console.warn(`❌ ${sourcemapUrl}: ${result.error}. Trying next URL...`)
      }
    }

    if (result) {
      const status = result.error ? `❌ ${result.error}` : '✅'
      console.log(`${status} ${result.url} (${index + 1}/${countAssets})`)
    }

    return result
  })

  return results.filter((result) => result !== null)
}
