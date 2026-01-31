import { Config } from './config.ts'
import { getGitDiff } from './utils.ts'
import type { Stats } from './types.ts'

const BLOCKQUOTE_OPEN = '<blockquote expandable>'
const BLOCKQUOTE_CLOSE = '</blockquote>'
const PRE_OPEN = '<pre>'
const PRE_CLOSE = '</pre>'

async function generateAiSummary(diff: string): Promise<{ summary: string, model?: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️ OPENROUTER_API_KEY is not set')
    return { summary: '' }
  }

  let lastError = ''

  for (const model of Config.Models) {
    try {
      console.log(`🤔 Generating summary with ${model}...`)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a technical assistant that help with diff analysis. Yout goal is to analyze the code changes and provide a brief summary in Russian using brief technical language for the professionals with russian slang. STRICTLY FORBIDDEN: Markdown formatting, bullet points, tables, and special characters (*, |, #, _). Output only the plain text summary.',
            },
            { role: 'user', content: diff },
          ],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`OpenRouter API error (${response.status}): ${text}`)
      }

      const data = await response.json()
      const summary = data.choices?.[0]?.message?.content || ''
      if (summary) {
        return {
          summary,
          model,
        }
      }
    } catch (error: any) {
      console.error(`Failed to generate summary with ${model}:`, error.message)
      lastError = error.message
    }
  }

  return { summary: `Failed to generate summary: ${lastError}` }
}

export async function generateChangelog(stats: Stats) {
  const lines = [`chore: Changed ${stats.changed.length + stats.added.length} file(s)`]

  if (stats.changed.length > 0) {
    lines.push(`Changed files (${stats.changed.length}):`)
    const formattedChanged = formatTable(stats.changed.map(file => ({
      path: file.path,
      size: file.fileSize,
      date: file.lastCommitDate,
    })))
    lines.push(PRE_OPEN + formattedChanged[0])
    lines.push(...formattedChanged.slice(1))
    lines.push(PRE_CLOSE)
  }

  if (stats.added.length > 0) {
    lines.push(`Added files (${stats.added.length}):`)
    const formattedAdded = formatTable(stats.added.map(file => ({
      path: file.path,
      size: file.fileSize,
    })))
    lines.push(PRE_OPEN + formattedAdded[0])
    lines.push(...formattedAdded.slice(1))
    lines.push(PRE_CLOSE)
  }

  if (stats.removed.length > 0) {
    lines.push(`Removed files (${stats.removed.length}):`)
    lines.push(PRE_OPEN + stats.removed[0])
    lines.push(...stats.removed.slice(1))
    lines.push(PRE_CLOSE)
  }

  if (stats.failed.length > 0) {
    lines.push(`Failed downloads (${stats.failed.length}):`)
    const formattedFailed = formatTable(stats.failed.map(file => ({
      path: file.path,
      size: file.error,
    })))
    lines.push(PRE_OPEN + formattedFailed[0])
    lines.push(...formattedFailed.slice(1))
    lines.push(PRE_CLOSE)
  }

  const diff = await getGitDiff()
  const { summary, model } = await generateAiSummary(diff)
  if (summary) {
    lines.push(model ? `Summary (${model}):` : 'Summary:')
    lines.push(BLOCKQUOTE_OPEN + summary.trim())
    lines.push(BLOCKQUOTE_CLOSE)
  }

  const commitMessage = lines.join('\n')
    .replaceAll(BLOCKQUOTE_OPEN, '')
    .replaceAll(BLOCKQUOTE_CLOSE, '')
    .replaceAll(PRE_OPEN, '')
    .replaceAll(PRE_CLOSE, '')

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
  let currentOpenTag: string | null = null

  const lines = message.split('\n')

  const getClosingTag = (openTag: string) => {
    if (openTag === BLOCKQUOTE_OPEN) return BLOCKQUOTE_CLOSE
    if (openTag === PRE_OPEN) return PRE_CLOSE
    return ''
  }

  for (const line of lines) {
    let newOpenTag: string | null = null
    if (line.includes(BLOCKQUOTE_OPEN)) newOpenTag = BLOCKQUOTE_OPEN
    else if (line.includes(PRE_OPEN)) newOpenTag = PRE_OPEN

    const isClosing = line.includes(BLOCKQUOTE_CLOSE) || line.includes(PRE_CLOSE)

    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

    if (potentialChunk.length > MESSAGE_LIMIT) {
      if (currentOpenTag) {
        currentChunk += getClosingTag(currentOpenTag)
      }

      chunks.push(currentChunk)

      currentChunk = currentOpenTag ? `${currentOpenTag}\n${line}` : line
    } else {
      currentChunk = potentialChunk
    }

    if (newOpenTag) currentOpenTag = newOpenTag
    if (isClosing) currentOpenTag = null
  }

  if (currentChunk) {
    if (currentOpenTag) {
      currentChunk += `\n${getClosingTag(currentOpenTag)}`
    }
    chunks.push(currentChunk)
  }

  return chunks
}
