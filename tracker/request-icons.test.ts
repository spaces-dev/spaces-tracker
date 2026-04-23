import { describe, expect, it } from 'vitest'
import { parseIcons } from './request-icons.ts'

describe('parseIcons', () => {
  it('пустой CSS → пустой массив', () => {
    expect(parseIcons('')).toEqual([])
  })

  it('css без url() → пустой массив', () => {
    expect(parseIcons('.foo { color: red; }')).toEqual([])
  })

  it('url() без /i/ пути не захватывается', () => {
    expect(parseIcons('background: url(\'/img/bg.png\')')).toEqual([])
  })

  it('захватывает одиночный url с /i/ путём', () => {
    expect(parseIcons('background: url(\'/i/star.svg\')')).toEqual(['/i/star.svg'])
  })

  it('захватывает url без кавычек', () => {
    expect(parseIcons('background: url(/i/icon.png)')).toEqual(['/i/icon.png'])
  })

  it('захватывает url с двойными кавычками', () => {
    expect(parseIcons('background: url("/i/icon.png")')).toEqual(['/i/icon.png'])
  })

  it('отрезает query string', () => {
    expect(parseIcons('url(\'/i/icon.svg?v=123\')')).toEqual(['/i/icon.svg'])
  })

  it('дубликаты удаляются', () => {
    const css = 'url(\'/i/a.svg\') url(\'/i/a.svg\') url(\'/i/b.svg\')'
    expect(parseIcons(css)).toHaveLength(2)
  })

  it('результат отсортирован', () => {
    const css = 'url(\'/i/z.svg\') url(\'/i/a.svg\') url(\'/i/m.svg\')'
    expect(parseIcons(css)).toEqual(['/i/a.svg', '/i/m.svg', '/i/z.svg'])
  })

  it('несколько иконок в реалистичном CSS', () => {
    const css = `
      .icon-star { background: url('/i/star.svg?v=1') }
      .icon-heart { background: url("/i/heart.svg") }
      .icon-star { background: url('/i/star.svg?v=1') }
    `
    expect(parseIcons(css)).toEqual(['/i/heart.svg', '/i/star.svg'])
  })
})
