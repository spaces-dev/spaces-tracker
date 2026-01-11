import fs from 'node:fs/promises'
import type { Stats } from './types.ts'

const PRE_OPEN = '\n<pre language="text">'
const PRE_CLOSE = '</pre>'

export async function generateChangelog(stats: Stats) {
  const lines = [`chore: Changed ${stats.changed.length} file(s)`]

  if (stats.added.length > 0) {
    lines.push(`\nAdded files (${stats.added.length}):`)
    lines.push(PRE_OPEN)
    const formattedAdded = formatTable(stats.added.map(file => ({
      path: file.path,
      size: file.fileSize,
    })))
    lines.push(...formattedAdded)
    lines.push(PRE_CLOSE)
  }

  if (stats.changed.length > 0) {
    lines.push(`\nChanged files (${stats.changed.length}):`)
    lines.push(PRE_OPEN)
    const formattedChanged = formatTable(stats.changed.map(file => ({
      path: file.path,
      size: file.fileSize,
      date: file.lastCommitDate,
    })))
    lines.push(...formattedChanged)
    lines.push(PRE_CLOSE)
  }

  if (stats.removed.length > 0) {
    lines.push(`\nRemoved files (${stats.removed.length}):`)
    lines.push(PRE_OPEN)
    for (const file of stats.removed) {
      lines.push(file)
    }
    lines.push(PRE_CLOSE)
  }

  if (stats.failed.length > 0) {
    lines.push(`\nFailed downloads (${stats.failed.length}):`)
    lines.push(PRE_OPEN)
    const formattedFailed = formatTable(stats.failed.map(file => ({
      path: file.url,
      size: file.error,
    })))
    lines.push(...formattedFailed)
    lines.push(PRE_CLOSE)
  }

  const duration = `\nDuration: ${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`
  console.log(duration)
  lines.push(duration)

  const commitMessage = lines.join('\n')
    .replaceAll(`${PRE_OPEN}\n`, '')
    .replaceAll(PRE_CLOSE, '')
  await fs.writeFile('commit-message.txt', commitMessage, 'utf-8')

  const telegramMessage = lines.slice(1).join('\n')
  const chunks = splitTelegramMessage(telegramMessage)
  for (let i = 0; i < chunks.length; i++) {
    await fs.writeFile(`telegram-message-${i + 1}.txt`, chunks[i], 'utf-8')
  }
}

interface TableRow {
  path: string
  size?: string
  date?: string | null
}

function formatTable(rows: TableRow[]): string[] {
  if (rows.length === 0) return []

  const maxPath = Math.max(...rows.map(row => row.path.length))
  const hasSize = rows.some(row => row.size)
  const hasDate = rows.some(row => row.date)
  const maxSize = hasSize
    ? Math.max(...rows.filter(row => row.size).map(row => row.size!.length))
    : 0
  const maxDate = hasDate
    ? Math.max(...rows.filter(row => row.date).map(row => row.date!.length))
    : 0

  return rows.map(row => {
    const path = row.path.padEnd(maxPath, ' ')

    let line = path

    if (hasSize && row.size) {
      line += ` | ${row.size.padEnd(maxSize, ' ')}`
    } else if (hasSize) {
      line += ` | ${' '.repeat(maxSize)}`
    }

    if (hasDate && row.date) {
      line += ` | ${row.date.padEnd(maxDate, ' ')}`
    } else if (hasDate) {
      line += ` | ${' '.repeat(maxDate)}`
    }

    return line
  })
}

const MESSAGE_LIMIT = 3900

function splitTelegramMessage(message: string): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  let insidePre = false

  const lines = message.split('\n')

  for (const line of lines) {
    const hasPreOpen = line.includes(PRE_OPEN)
    const hasPreClose = line.includes(PRE_CLOSE)

    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

    if (potentialChunk.length > MESSAGE_LIMIT) {
      if (insidePre) {
        currentChunk += PRE_CLOSE
      }

      chunks.push(currentChunk)

      currentChunk = insidePre ? `${PRE_CLOSE}\n${line}` : line
    } else {
      currentChunk = potentialChunk
    }

    if (hasPreOpen) insidePre = true
    if (hasPreClose) insidePre = false
  }

  if (currentChunk) {
    if (insidePre) {
      currentChunk += `\n${PRE_CLOSE}`
    }
    chunks.push(currentChunk)
  }

  return chunks
}
