import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function fileExists(path: string) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

export function getFileHash(content: string) {
  return crypto.createHash('md5').update(content).digest('hex')
}

export function stringifyJson<T>(value: T) {
  return JSON.stringify(value, null, 2)
}

export async function readJson<T>(path: string) {
  const data = await fs.readFile(path, 'utf-8')
  return JSON.parse(data) as T
}

export async function writeJson<T>(path: string, data: T) {
  const json = stringifyJson(data)
  return fs.writeFile(path, json, 'utf-8')
}

export async function fileIsChanged<Left, Right>(left: Left, right: Right) {
  const leftHash = getFileHash(stringifyJson(left))
  const rightHash = getFileHash(stringifyJson(right))
  return rightHash !== leftHash
}

export async function fileLastCommitDate(path: string) {
  try {
    const { stdout } = await execFileAsync('git', [
      'log',
      '-1',
      '--format=%cr',
      '--',
      path,
    ])
    return stdout.trim()
  } catch (error) {
    console.log('Git log error:', error)
    return null
  }
}

function formatFileSize(bytes: number) {
  const units = ['B', 'kB', 'MB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  const formattedSize = unitIndex === 0
    ? size.toString()
    : size.toFixed(1)

  return `${formattedSize} ${units[unitIndex]}`
}

export function compareFileSize(beforeBytes: number, afterBytes: number): string {
  const afterFormatted = formatFileSize(afterBytes)
  const diff = afterBytes - beforeBytes
  if (diff === 0) return afterFormatted

  const diffAbs = Math.abs(diff)
  const diffFormatted = formatFileSize(diffAbs)
  const sign = diff > 0 ? '+' : '-'

  return `${afterFormatted} (${sign}${diffFormatted})`
}

const TELEGRAM_LIMIT = 3900

export function splitTelegramMessage(message: string): string[] {
  const chunks: string[] = []
  let currentChunk = ''
  let insidePre = false

  const lines = message.split('\n')

  for (const line of lines) {
    const hasPreOpen = line.includes('<pre>')
    const hasPreClose = line.includes('</pre>')

    const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

    if (potentialChunk.length > TELEGRAM_LIMIT) {
      if (insidePre) {
        currentChunk += '\n</pre>'
      }

      chunks.push(currentChunk)

      currentChunk = insidePre ? `<pre>\n${line}` : line
    } else {
      currentChunk = potentialChunk
    }

    if (hasPreOpen) insidePre = true
    if (hasPreClose) insidePre = false
  }

  if (currentChunk) {
    if (insidePre) {
      currentChunk += '\n</pre>'
    }
    chunks.push(currentChunk)
  }

  return chunks
}
