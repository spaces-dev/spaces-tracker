import { getGitDiff } from './utils.ts'
import type { Stats } from './types.ts'

const TAG_OPEN = '<blockquote expandable>'
const TAG_CLOSE = '</blockquote>'

async function generateAiSummary(diff: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️ OPENROUTER_API_KEY is not set')
    return ''
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // https://openrouter.ai/mistralai/devstral-2512:free
        model: 'mistralai/devstral-2512:free',
        messages: [
          {
            role: 'system',
            content: 'You are a technical assistant. Analyze the code changes and provide a brief summary in Russian. Describe the changes as a changelog for users, use very brief technical language for the professionals. Use russian slang. STRICTLY FORBIDDEN: Markdown formatting, bullet points, tables, and special characters (*, |, #, _). Output only the plain text summary.',
          },
          { role: 'user', content: diff },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return `OpenRouter API error (${response.status}): ${text}`
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (error) {
    return `Failed to generate summary: ${error}`
  }
}

export async function generateChangelog(stats: Stats) {
  const isChangedRevisionsOnly = stats.changed.length === 0
    && stats.added.length === 0
    && stats.removed.length === 0

  const lines = [
    isChangedRevisionsOnly
      ? `chore: Changed revisions.json`
      : `chore: Changed ${stats.changed.length} file(s)`,
  ]

  if (isChangedRevisionsOnly) {
    const message = `\nNo files changed in revisions 🤷‍♂️`
    lines.push(message)
    console.log(message)
  }

  if (stats.added.length > 0) {
    lines.push(`\nAdded files (${stats.added.length}):`)
    lines.push(TAG_OPEN)
    const formattedAdded = formatTable(stats.added.map(file => ({
      path: file.path,
      size: file.fileSize,
    })))
    lines.push(...formattedAdded)
    lines.push(TAG_CLOSE)
  }

  if (stats.changed.length > 0) {
    lines.push(`\nChanged files (${stats.changed.length}):`)
    lines.push(TAG_OPEN)
    const formattedChanged = formatTable(stats.changed.map(file => ({
      path: file.path,
      size: file.fileSize,
      date: file.lastCommitDate,
    })))
    lines.push(...formattedChanged)
    lines.push(TAG_CLOSE)
  }

  if (stats.removed.length > 0) {
    lines.push(`\nRemoved files (${stats.removed.length}):`)
    lines.push(TAG_OPEN)
    for (const file of stats.removed) {
      lines.push(file)
    }
    lines.push(TAG_CLOSE)
  }

  if (stats.failed.length > 0) {
    lines.push(`\nFailed downloads (${stats.failed.length}):`)
    lines.push(TAG_OPEN)
    const formattedFailed = formatTable(stats.failed.map(file => ({
      path: file.url,
      size: file.error,
    })))
    lines.push(...formattedFailed)
    lines.push(TAG_CLOSE)
  }

  if (!isChangedRevisionsOnly) {
    const diff = await getGitDiff()
    const summary = await generateAiSummary(diff)
    if (summary) {
      lines.push('\nSummary:')
      lines.push(TAG_OPEN)
      lines.push(summary.trim())
      lines.push(TAG_CLOSE)
    }
  }

  const duration = `\nDuration: ${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`
  console.log(duration)
  lines.push(duration)

  const commitMessage = lines.join('\n')
    .replaceAll(`${TAG_OPEN}\n`, '')
    .replaceAll(TAG_CLOSE, '')

  const telegramMessage = splitTelegramMessage(lines.slice(1).join('\n'))

  return {
    commitMessage,
    telegramMessage,
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
    const hasPreOpen = line.includes(TAG_OPEN)
    const hasPreClose = line.includes(TAG_CLOSE)

    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

    if (potentialChunk.length > MESSAGE_LIMIT) {
      if (insidePre) {
        currentChunk += TAG_CLOSE
      }

      chunks.push(currentChunk)

      currentChunk = insidePre ? `${TAG_OPEN}\n${line}` : line
    } else {
      currentChunk = potentialChunk
    }

    if (hasPreOpen) insidePre = true
    if (hasPreClose) insidePre = false
  }

  if (currentChunk) {
    if (insidePre) {
      currentChunk += `\n${TAG_CLOSE}`
    }
    chunks.push(currentChunk)
  }

  return chunks
}
