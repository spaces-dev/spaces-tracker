import { describe, expect, it } from 'vitest'
import { compareFileSize } from './utils.ts'

describe('compareFileSize', () => {
  describe('добавленный файл (before = 0)', () => {
    it('показывает размер без diff для байт', () => {
      expect(compareFileSize(0, 0)).toBe('0 B')
    })

    it('показывает размер в байтах', () => {
      expect(compareFileSize(500, 500)).toBe('500 B')
    })

    it('показывает размер в kB', () => {
      expect(compareFileSize(2048, 2048)).toBe('2.0 kB')
    })
  })

  describe('изменённый файл (before !== after)', () => {
    it('показывает +diff когда файл вырос', () => {
      expect(compareFileSize(1000, 1200)).toBe('1.2 kB (+200 B)')
    })

    it('показывает -diff когда файл уменьшился', () => {
      expect(compareFileSize(1200, 1000)).toBe('1000 B (-200 B)')
    })

    it('показывает diff в kB когда разница большая', () => {
      expect(compareFileSize(1024, 3072)).toBe('3.0 kB (+2.0 kB)')
    })

    it('показывает diff в kB при уменьшении на большое значение', () => {
      expect(compareFileSize(3072, 1024)).toBe('1.0 kB (-2.0 kB)')
    })

    it('корректно работает на границе 1024 байт', () => {
      expect(compareFileSize(1023, 1024)).toBe('1.0 kB (+1 B)')
    })

    it('корректно работает на границе MB', () => {
      expect(compareFileSize(1024 * 1024, 1024 * 1024 * 2)).toBe('2.0 MB (+1.0 MB)')
    })
  })

  describe('реальные кейсы с Buffer.byteLength', () => {
    it('ascii контент — length и byteLength совпадают', () => {
      const oldContent = 'hello world'
      const newContent = 'hello world!!!'
      const before = Buffer.byteLength(oldContent, 'utf-8')
      const after = Buffer.byteLength(newContent, 'utf-8')
      expect(compareFileSize(before, after)).toBe(`${after} B (+3 B)`)
    })

    it('кириллица — byteLength больше length', () => {
      const oldContent = 'привет'
      const newContent = 'привет мир'
      const before = Buffer.byteLength(oldContent, 'utf-8')
      const after = Buffer.byteLength(newContent, 'utf-8')
      expect(before).toBe(12)
      expect(after).toBe(19)
      expect(compareFileSize(before, after)).toBe('19 B (+7 B)')
    })

    it('эмодзи — 4 байта на символ', () => {
      const oldContent = '🔥'
      const newContent = '🔥🔥🔥'
      const before = Buffer.byteLength(oldContent, 'utf-8')
      const after = Buffer.byteLength(newContent, 'utf-8')
      expect(before).toBe(4)
      expect(after).toBe(12)
      expect(compareFileSize(before, after)).toBe('12 B (+8 B)')
    })

    it('новый файл (before = 0) показывает только размер', () => {
      const newContent = 'export const foo = 1'
      const after = Buffer.byteLength(newContent, 'utf-8')
      expect(compareFileSize(0, after)).toBe(`${after} B`)
    })
  })
})
