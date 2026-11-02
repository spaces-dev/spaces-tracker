import { describe, expect, it } from 'vitest'
import { filterRevisionJs } from './request-revisions.ts'

const js = {
  'ru/touch/b/smiles.js': 'aaa',
  'ua/touch/b/smiles.js': 'bbb',
  'en/touch/b/smiles.js': 'ccc',
  'es/touch/b/smiles.js': 'ddd',
  'pt/touch/b/smiles.js': 'eee',
  'touch/acl.js': 'fff',
}

describe('filterRevisionJs', () => {
  it('оставляет ru и путь без языкового префикса', () => {
    expect(filterRevisionJs(js, 'ru')).toEqual({
      'ru/touch/b/smiles.js': 'aaa',
      'touch/acl.js': 'fff',
    })
  })

  it('без locale не режет', () => {
    expect(filterRevisionJs(js)).toEqual(js)
  })
})
