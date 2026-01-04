import fs from 'node:fs/promises'
import { splitTelegramMessage } from './utils.ts'
import type { TrackerStats } from './types.ts'

export async function generateChangelog(stats: TrackerStats) {
  const lines = [`chore: Changed ${stats.changed.length} file(s)`]

  if (stats.added.length > 0) {
    lines.push(`\nAdded files (${stats.added.length}):`)
    lines.push('\n<pre language="text">')
    for (const file of stats.added) {
      lines.push(`${file.path} ${file.fileSize}`)
    }
    lines.push('</pre>')
  }

  if (stats.changed.length > 0) {
    lines.push(`\nChanged files (${stats.changed.length}):`)
    lines.push('\n<pre language="text">')
    for (const file of stats.changed) {
      lines.push(`${file.path} [${file.fileSize}] (${file.lastCommitDate})`)
    }
    lines.push('</pre>')
  }

  if (stats.comparedLinks.removed.length > 0) {
    lines.push(`\nRemoved files (${stats.comparedLinks.removed.length}):`)
    lines.push('\n<pre language="text">')
    for (const file of stats.comparedLinks.removed) {
      lines.push(file)
    }
    lines.push('</pre>')
  }

  if (stats.failed.length > 0) {
    lines.push(`\nFailed downloads (${stats.failed.length}):`)
    lines.push('\n<pre language="text">')
    for (const file of stats.failed) {
      lines.push(`${file.url} (${file.error})`)
    }
    lines.push('</pre>')
  }

  const duration = `\nDuration: ${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`
  console.log(duration)
  lines.push(duration)

  const commitMessage = lines.join('\n').replaceAll('\n<pre language="text">', '').replaceAll('\n</pre>', '')
  const telegramMessage = lines.slice(1).join('\n')

  await fs.writeFile('commit-message.txt', commitMessage, 'utf-8')

  const chunks = splitTelegramMessage(telegramMessage)
  for (let i = 0; i < chunks.length; i++) {
    await fs.writeFile(`telegram-message-${i + 1}.txt`, chunks[i], 'utf-8')
  }
}
