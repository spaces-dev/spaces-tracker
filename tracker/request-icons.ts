import fs from 'node:fs/promises'
import path from 'node:path'
import { concurrentWorker } from './concurrency-worker.ts'
import { Config } from './config.ts'
import { request, writeJson } from './utils.ts'

const ICONS_SOURCE = '/css/custom/pc/b/main.css'
const ICONS_REGEX = /url\(['"]?(\/i\/[^'")]+)['"]?\)/g

function parseIcons(res: string) {
  const paths = res.matchAll(ICONS_REGEX)
    .map((match) => match[1].split('?')[0])

  const icons = Array.from(new Set(paths).values()).toSorted()
  return icons
}

export async function requestIcons() {
  const req = await request(ICONS_SOURCE)

  if (!req.ok) {
    throw new Error(`Can't download icons from ${ICONS_SOURCE}: ${req.status}`)
  }

  const res = await req.text()
  const icons = parseIcons(res)
  await writeJson(Config.IconsPath, icons)

  console.log(`\nStarting download icons (${icons.length} icons, concurrency: ${Config.Concurrency})\n`)

  await concurrentWorker(icons, async (icon) => {
    const req = await request(icon)

    if (!req.ok) {
      console.log(`❌ Can't download icon ${icon}: ${req.status}`)
      return
    }

    const buffer = await req.arrayBuffer()
    const iconPath = path.join('.', icon)
    await fs.mkdir(path.dirname(iconPath), { recursive: true })
    await fs.writeFile(
      iconPath,
      Buffer.from(buffer),
      'binary',
    )

    console.log(`✅ Downloaded ${icon}`)
  })
}
