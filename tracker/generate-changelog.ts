import { Config } from './config.ts'
import { escapeHtml, getGitDiff } from './utils.ts'
import type { Stats } from './types.ts'

const MESSAGE_LIMIT = 4000
const TABLE_OPEN_RE = /<table>/
const TABLE_CLOSE = '</table>'
const DETAILS_OPEN = '<details open>'
const DETAILS_CLOSE = '</details>'
const REPO_URL = `https://github.com/${process.env.REPOSITORY}/blob/master/`

async function generateAiSummary(diff: string): Promise<{ summary: string, model?: string }> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('⚠️ OPENROUTER_API_KEY is not set')
    return {
      summary: 'OPENROUTER_API_KEY is not set',
    }
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
          summary: escapeHtml(summary),
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
  const lines: string[] = []

  if (stats.changed.length > 0) {
    lines.push(`<h4>Changed files: ${stats.changed.length}</h4>`)
    lines.push(
      formatTable(
        stats.changed.map((file) => ({
          path: file.path,
          size: file.fileSize,
          date: file.lastCommitDate,
        })),
      ),
    )
  }

  if (stats.added.length > 0) {
    lines.push(`<h4>Added files: ${stats.added.length}<h4>`)
    lines.push(
      formatTable(
        stats.added.map((file) => ({
          path: file.path,
          size: file.fileSize,
        })),
      ),
    )
  }

  if (stats.removed.length > 0) {
    lines.push(`<h4>Removed files: ${stats.removed.length}</h4>`)
    lines.push(
      formatTable(
        stats.removed.map((file) => ({
          path: file,
        })),
      ),
    )
  }

  if (stats.failed.length > 0) {
    lines.push(`<h4>Failed downloads: ${stats.failed.length}<h4>`)
    lines.push(
      formatTable(
        stats.failed.map((file) => ({
          path: file.path,
          size: file.error,
        })),
      ),
    )
  }

  const diff = await getGitDiff()
  const { summary, model } = await generateAiSummary(diff)
  if (summary) {
    lines.push(`${DETAILS_OPEN}<summary>${model ? `Summary (${model})` : 'Summary'}</summary>`)
    lines.push(summary.trim())
    lines.push(DETAILS_CLOSE)
  }

  const commitMessage = `chore: Changed ${stats.changed.length + stats.added.length} files

${model ? `Summary: ${model}` : 'Summary'}
${summary}
  `

  const telegramMessage = splitTelegramMessage(lines.join('\n'))

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

function formatTable(rows: TableRow[]) {
  if (rows.length === 0) return ''

  const hasSize = rows.some((row) => row.size)
  const hasDate = rows.some((row) => row.date)

  const header = [
    '<table bordered>',
    '<tr>',
    '<th>File</th>',
    hasSize ? '<th>Size</th>' : '',
    hasDate ? '<th>Last update</th>' : '',
    '</tr>',
  ].filter(Boolean).join('')

  const bodyRows = rows.map((row) => {
    const fileUrl = `${REPO_URL}${row.path}`
    const fileCell = `<td><a href="${fileUrl}">${escapeHtml(row.path)}</a></td>`
    const sizeCell = hasSize ? `<td>${row.size ? escapeHtml(row.size) : ''}</td>` : ''
    const dateCell = hasDate ? `<td>${row.date ? escapeHtml(row.date) : ''}</td>` : ''
    return `<tr>${fileCell}${sizeCell}${dateCell}</tr>`
  })

  return `${header}${bodyRows.join('')}</table>`
}

function splitTelegramMessage(message: string): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  let currentOpenTag: string | null = null

  const lines = message.split('\n')

  const getClosingTag = (openTag: string) => {
    if (openTag === DETAILS_OPEN) return DETAILS_CLOSE
    if (openTag.startsWith('<table>')) return TABLE_CLOSE
    return ''
  }

  for (const line of lines) {
    let newOpenTag: string | null = null

    if (line.includes(DETAILS_OPEN)) {
      newOpenTag = DETAILS_OPEN
    } else if (TABLE_OPEN_RE.test(line)) {
      newOpenTag = '<table>'
    }

    const isClosing = line.includes(DETAILS_CLOSE) || line.includes(TABLE_CLOSE)
    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

    if (potentialChunk.length > MESSAGE_LIMIT) {
      if (currentOpenTag) currentChunk += getClosingTag(currentOpenTag)
      chunks.push(currentChunk)
      currentChunk = currentOpenTag
        ? `${currentOpenTag}\n${line}`
        : line
    } else {
      currentChunk = potentialChunk
    }

    if (newOpenTag) currentOpenTag = newOpenTag
    if (isClosing) currentOpenTag = null
  }

  if (currentChunk) {
    if (currentOpenTag) currentChunk += getClosingTag(currentOpenTag)
    chunks.push(currentChunk)
  }

  return chunks
}
