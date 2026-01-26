import fs from 'node:fs/promises'
import path from 'node:path'
import { concurrentWorker } from './concurrency-worker.ts'
import { Config } from './config.ts'
import { fileExists, spacesRequest, writeJson } from './utils.ts'
import type { SourceConfig } from './types.ts'

const ICONS_SOURCE = '/css/custom/pc/b/main.css'
const ICONS_REGEX = /url\(['"]?(\/i\/[^'")]+)['"]?\)/g

function parseIcons(res: string) {
  const paths = res.matchAll(ICONS_REGEX)
    .map((match) => match[1].split('?')[0])

  const icons = Array.from(new Set(paths).values()).toSorted()
  return icons
}

export async function requestIcons(source: SourceConfig) {
  const req = await spacesRequest(source.url, ICONS_SOURCE)

  if (!req.ok) {
    console.log(`❌ Can't download icons from "${source.name}": ${req.status}`)
    return
  }

  const res = await req.text()
  const icons = parseIcons(res)

  const iconsPath = path.join(source.name, Config.IconsPath)

  await fs.mkdir(path.dirname(iconsPath), { recursive: true })
  await writeJson(iconsPath, icons)

  console.log(`\n[${source.name}] Starting download icons (${icons.length} icons, concurrency: ${Config.Concurrency})\n`)

  await concurrentWorker(icons, async (icon) => {
    const req = await spacesRequest(source.url, icon)

    if (!req.ok) {
      console.log(`❌ Can't download icon ${icon}: ${req.status}`)
      return
    }

    const buffer = await req.arrayBuffer()
    const content = Buffer.from(buffer)

    const iconPath = path.join(source.name, icon)

    if (!source.isPrimary) {
      const primarySource = Config.Sources.find(s => s.isPrimary)
      if (primarySource) {
        const primaryPath = path.join(primarySource.name, icon)
        if (await fileExists(primaryPath)) {
          const primaryContent = await fs.readFile(primaryPath)
          if (primaryContent.equals(content)) {
            if (await fileExists(iconPath)) {
              await fs.unlink(iconPath)
            }
            return
          }
        }
      }
    }

    await fs.mkdir(path.dirname(iconPath), { recursive: true })
    await fs.writeFile(
      iconPath,
      content,
      'binary',
    )

    console.log(`✅ Downloaded ${icon}`)
  })
}
