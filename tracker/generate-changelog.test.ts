import { describe, expect, it } from 'vitest'
import {
  buildChangelogHtml,
  formatTable,
  splitTelegramMessage,
} from './generate-changelog.ts'
import type { SourcemapFile, Stats } from './types.ts'

function emptyStats(): Stats {
  return {
    isNotChanged: false,
    changed: [],
    added: [],
    removed: [],
    failed: [],
  }
}

function sourcemapFile(path: string, extra?: Partial<SourcemapFile>): SourcemapFile {
  return {
    path,
    isAdded: false,
    isChanged: true,
    fileSize: '1.2 kB (+100 B)',
    lastCommitDate: '2 hours ago',
    ...extra,
  }
}

function manyRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    path: `spaces/JS/file-${String(index).padStart(4, '0')}.js`,
    size: '1.2 kB (+100 B)',
    date: '2 hours ago',
  }))
}

describe('buildChangelogHtml', () => {
  it('закрывает h4 у Added и Failed', () => {
    const html = buildChangelogHtml({
      ...emptyStats(),
      added: [sourcemapFile('spaces/JS/new.js', { isAdded: true, isChanged: false })],
      failed: [{ path: 'spaces/JS/broken.js', error: 'timeout' }],
    })

    expect(html).toContain('<h4>Added files: 1</h4>')
    expect(html).toContain('<h4>Failed downloads: 1</h4>')
    expect(html).not.toMatch(/<h4>Added files: 1<h4>/)
    expect(html).not.toMatch(/<h4>Failed downloads: 1<h4>/)
  })

  it('рендерит таблицу с bordered и строками на отдельных линиях', () => {
    const html = buildChangelogHtml({
      ...emptyStats(),
      changed: [sourcemapFile('spaces/JS/chat.js')],
    })

    expect(html).toContain('<table bordered>')
    expect(html).toContain('\n<tr><th>File</th>')
    expect(html).toContain('\n<tr><td><a href=')
    expect(html).toContain('</table>')
  })
})

describe('formatTable', () => {
  it('экранирует спецсимволы в href', () => {
    const html = formatTable([
      { path: 'spaces/JS/a&b".js', size: '10 B' },
    ])
    const href = html.match(/href="([^"]*)"/)?.[1]

    expect(href).toContain('&amp;')
    expect(href).toContain('%22')
    expect(href).not.toContain('&b')
    expect(href).not.toContain('"')
  })
})

describe('splitTelegramMessage', () => {
  it('не отдаёт пустой первый чанк на гигантской однострочной таблице', () => {
    const rows = manyRows(500)
      .map((row) => `<tr><td>${row.path}</td><td>${row.size}</td><td>${'updated-recently'.repeat(4)}</td></tr>`)
      .join('')
    const message = `<table bordered>${rows}</table>`

    expect(message.length).toBeGreaterThan(30_000)

    const chunks = splitTelegramMessage(message)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.every((chunk) => chunk.trim().length > 0)).toBe(true)
    expect(chunks[0]?.startsWith('<table')).toBe(true)
  })

  it('после сплита каждый кусок таблицы имеет open/close', () => {
    const html = [
      '<h4>Changed files: 250</h4>',
      formatTable(manyRows(250)),
    ].join('\n')

    expect(html.length).toBeGreaterThan(30_000)

    const chunks = splitTelegramMessage(html)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((chunk) => chunk.trim().length > 0)).toBe(true)

    for (const chunk of chunks) {
      if (chunk.includes('<table')) {
        expect(chunk).toContain('<table bordered>')
        expect(chunk).toContain('</table>')
      }
    }
  })

  it('не оставляет пустых чанков на пробельном хвосте', () => {
    expect(splitTelegramMessage('   \n\n')).toEqual([])
  })
})
