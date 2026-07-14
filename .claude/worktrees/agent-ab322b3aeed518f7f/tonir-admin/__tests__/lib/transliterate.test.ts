/**
 * Unit tests for lib/transliterate.ts
 *
 * transliterate() is a pure function with no external dependencies — it is the
 * most directly testable module in the codebase.
 *
 * Risk areas:
 *   - Armenian digraph "ու" must be replaced BEFORE the char-by-char pass.
 *     If the digraph substitution runs after the char loop, "ու" would produce
 *     "ou" (ո→'o' + ու_second_char→?), not "u".
 *   - Multi-char Latin mappings (zh, sh, kh, ts, ch, dz, gh, shch, yo, ya, yu).
 *   - Soft/hard sign (ь, ъ) should produce empty string, not undefined.
 *   - Non-Armenian/Cyrillic characters should pass through lowercased.
 */

import { describe, it, expect } from 'vitest'
import { transliterate } from '@/lib/transliterate'

describe('transliterate()', () => {
  // ── Happy paths ────────────────────────────────────────────────────────────

  describe('[HAPPY PATH] Armenian lowercase single characters', () => {
    it.each([
      ['ա', 'a'], ['բ', 'b'], ['գ', 'g'], ['դ', 'd'], ['ե', 'e'],
      ['զ', 'z'], ['է', 'e'], ['ը', 'e'], ['թ', 't'], ['ի', 'i'],
      ['լ', 'l'], ['կ', 'k'], ['հ', 'h'], ['մ', 'm'], ['յ', 'y'],
      ['ն', 'n'], ['ո', 'o'], ['պ', 'p'], ['ջ', 'j'], ['ռ', 'r'],
      ['ս', 's'], ['վ', 'v'], ['տ', 't'], ['ր', 'r'], ['փ', 'p'],
      ['ք', 'k'], ['օ', 'o'], ['ֆ', 'f'],
    ])('should transliterate Armenian "%s" → "%s"', (input, expected) => {
      expect(transliterate(input)).toBe(expected)
    })
  })

  describe('[HAPPY PATH] Armenian uppercase single characters', () => {
    it.each([
      ['Ա', 'a'], ['Բ', 'b'], ['Գ', 'g'], ['Դ', 'd'], ['Ե', 'e'],
      ['Ք', 'k'], ['Օ', 'o'], ['Ֆ', 'f'],
    ])('should transliterate uppercase Armenian "%s" → "%s"', (input, expected) => {
      expect(transliterate(input)).toBe(expected)
    })
  })

  describe('[HAPPY PATH] Armenian multi-char Latin mappings', () => {
    it.each([
      ['ժ', 'zh'], ['ծ', 'ts'], ['ձ', 'dz'], ['ղ', 'gh'],
      ['ճ', 'ch'], ['շ', 'sh'], ['չ', 'ch'], ['ց', 'ts'],
      ['Ժ', 'zh'], ['Ծ', 'ts'], ['Ձ', 'dz'], ['Ղ', 'gh'],
      ['Ճ', 'ch'], ['Շ', 'sh'], ['Չ', 'ch'], ['Ց', 'ts'],
      ['խ', 'kh'], ['Խ', 'kh'],
    ])('should transliterate Armenian "%s" → "%s"', (input, expected) => {
      expect(transliterate(input)).toBe(expected)
    })
  })

  describe('[HAPPY PATH] Armenian digraph "ու" (all variants)', () => {
    it('should convert lowercase digraph "ու" to "u"', () => {
      expect(transliterate('ու')).toBe('u')
    })

    it('should convert uppercase digraph "ՈՒ" to "u"', () => {
      expect(transliterate('ՈՒ')).toBe('u')
    })

    it('should convert mixed-case digraph "Ու" to "u"', () => {
      expect(transliterate('Ու')).toBe('u')
    })

    it('should convert "ու" embedded in a word correctly — "Բուն" → "bun"', () => {
      // ու must be processed before the char loop so ո+ւ becomes "u", not "o"+"?"
      expect(transliterate('Բուն')).toBe('bun')
    })

    it('should convert consecutive digraphs "ուու" → "uu"', () => {
      expect(transliterate('ուու')).toBe('uu')
    })
  })

  describe('[HAPPY PATH] Cyrillic lowercase', () => {
    it.each([
      ['а', 'a'], ['б', 'b'], ['в', 'v'], ['г', 'g'], ['д', 'd'],
      ['е', 'e'], ['з', 'z'], ['и', 'i'], ['й', 'y'], ['к', 'k'],
      ['л', 'l'], ['м', 'm'], ['н', 'n'], ['о', 'o'], ['п', 'p'],
      ['р', 'r'], ['с', 's'], ['т', 't'], ['у', 'u'], ['ф', 'f'],
    ])('should transliterate Cyrillic "%s" → "%s"', (input, expected) => {
      expect(transliterate(input)).toBe(expected)
    })
  })

  describe('[HAPPY PATH] Cyrillic multi-char Latin mappings', () => {
    it.each([
      ['ё', 'yo'], ['ж', 'zh'], ['х', 'kh'], ['ц', 'ts'], ['ч', 'ch'],
      ['ш', 'sh'], ['щ', 'shch'], ['э', 'e'], ['ю', 'yu'], ['я', 'ya'],
      ['Ж', 'zh'], ['Х', 'kh'], ['Ц', 'ts'], ['Ч', 'ch'], ['Ш', 'sh'],
      ['Щ', 'shch'], ['Ю', 'yu'], ['Я', 'ya'], ['Ё', 'yo'],
    ])('should transliterate Cyrillic "%s" → "%s"', (input, expected) => {
      expect(transliterate(input)).toBe(expected)
    })
  })

  describe('[HAPPY PATH] Latin characters pass through lowercased', () => {
    it('should lowercase plain ASCII', () => {
      expect(transliterate('Hello')).toBe('hello')
    })

    it('should lowercase mixed-case ASCII', () => {
      expect(transliterate('TonirAdmin')).toBe('toniradmin')
    })

    it('should preserve digits as-is (digits pass through as themselves)', () => {
      expect(transliterate('ABC123')).toBe('abc123')
    })
  })

  describe('[HAPPY PATH] Real-world word transliteration', () => {
    it('should transliterate Armenian "Արամ" (Aram) correctly', () => {
      expect(transliterate('Արամ')).toBe('aram')
    })

    it('should transliterate Cyrillic "Москва" (Moskva) correctly', () => {
      expect(transliterate('Москва')).toBe('moskva')
    })

    it('should transliterate mixed Armenian+Latin "Tonir-Տոնիր" correctly', () => {
      expect(transliterate('Tonir-Տոնիր')).toBe('tonir-tonir')
    })
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('[EDGE CASE] Boundary inputs', () => {
    it('should return empty string for empty input', () => {
      expect(transliterate('')).toBe('')
    })

    it('should handle a single space character (passes through as-is)', () => {
      // ' ' lowercased is still ' '
      expect(transliterate(' ')).toBe(' ')
    })

    it('should handle numbers-only input', () => {
      expect(transliterate('2024')).toBe('2024')
    })

    it('should handle special/punctuation characters unchanged', () => {
      expect(transliterate('@#!')).toBe('@#!')
    })

    it('should handle a very long Armenian string without throwing', () => {
      const long = 'ա'.repeat(10_000)
      expect(() => transliterate(long)).not.toThrow()
      expect(transliterate(long)).toBe('a'.repeat(10_000))
    })
  })

  describe('[EDGE CASE] Cyrillic soft/hard sign maps to empty string', () => {
    it('soft sign "ь" should produce empty string (not undefined)', () => {
      expect(transliterate('ь')).toBe('')
    })

    it('hard sign "ъ" should produce empty string (not undefined)', () => {
      expect(transliterate('ъ')).toBe('')
    })

    it('soft sign embedded in word: "объект" → "obekt"', () => {
      expect(transliterate('объект')).toBe('obekt')
    })

    it('uppercase soft sign "Ь" → empty string', () => {
      expect(transliterate('Ь')).toBe('')
    })

    it('uppercase hard sign "Ъ" → empty string', () => {
      expect(transliterate('Ъ')).toBe('')
    })
  })

  describe('[EDGE CASE] Digraph priority — "ու" should not become "o" + unknown', () => {
    it('should replace "ու" BEFORE the char loop so "ո" alone stays "o"', () => {
      // ո (without ւ following) should still map to 'o'
      expect(transliterate('ո')).toBe('o')
    })

    it('result for "ոոու" should be "oou" (2×ո then ու)', () => {
      expect(transliterate('ոոու')).toBe('oou')
    })
  })
})
