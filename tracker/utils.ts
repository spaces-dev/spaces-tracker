import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { promisify } from 'node:util'
import { Config } from './config.ts'

export const execCmd = promisify(execFile)

export async function spacesRequest(baseUrl: string, path: string) {
  const url = new URL(path, baseUrl)

  const request = await fetch(url, {
    headers: Config.RequestHeaders,
  })

  return request
}

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
    const { stdout } = await execCmd('git', [
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

export async function getGitDiff() {
  try {
    await execCmd('git', ['add', '-N', '.'])
    const { stdout } = await execCmd('git', [
      'diff',
      'HEAD',
      '--',
      '.',
      ...Config.GitDiffExclude.map((file) => `:(exclude)${file}`),
    ])
    return stdout
  } catch (e) {
    console.error('Failed to get git diff', e)
    return ''
  }
}
