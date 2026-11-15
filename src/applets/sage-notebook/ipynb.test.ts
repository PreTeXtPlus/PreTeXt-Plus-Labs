import { describe, expect, it } from 'vitest'
import { languageOf, parseIpynb, toIpynb } from './ipynb.ts'
import { sampleNotebook } from './model.ts'

const v4 = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: { display_name: 'SageMath 10.4', language: 'sage', name: 'sagemath' },
    language_info: { name: 'sage', version: '10.4' },
    custom: { keep: true },
  },
  cells: [
    { cell_type: 'markdown', id: 'intro', metadata: {}, source: ['# Title\n', 'Some $x^2$.'] },
    {
      cell_type: 'code',
      id: 'calc',
      metadata: { tags: ['keep'] },
      execution_count: 3,
      source: 'factor(2026)',
      outputs: [{ output_type: 'execute_result', data: { 'text/plain': '2 * 1013' }, execution_count: 3, metadata: {} }],
    },
    { cell_type: 'raw', id: 'calc', metadata: {}, source: 'raw text' },
  ],
}

describe('parseIpynb', () => {
  it('reads nbformat 4 cells, joining line arrays', () => {
    const nb = parseIpynb(JSON.stringify(v4), 'My Notes.ipynb')
    expect(nb.title).toBe('My Notes')
    expect(nb.language).toBe('sage')
    expect(nb.cells.map((c) => [c.type, c.source])).toEqual([
      ['markdown', '# Title\nSome $x^2$.'],
      ['code', 'factor(2026)'],
      ['raw', 'raw text'],
    ])
    expect(nb.cells[1].metadata).toEqual({ tags: ['keep'] })
  })

  it('replaces duplicate and missing cell ids', () => {
    const nb = parseIpynb(JSON.stringify(v4))
    expect(nb.cells[0].id).toBe('intro')
    expect(nb.cells[1].id).toBe('calc')
    expect(nb.cells[2].id).not.toBe('calc')
    expect(new Set(nb.cells.map((c) => c.id)).size).toBe(3)
  })

  it('reads nbformat 3 worksheets', () => {
    const v3 = {
      nbformat: 3,
      metadata: {},
      worksheets: [
        {
          cells: [
            { cell_type: 'heading', level: 2, source: 'Part' },
            { cell_type: 'code', input: ['a = 1\n', 'a'], language: 'python', outputs: [] },
          ],
        },
      ],
    }
    expect(parseIpynb(JSON.stringify(v3)).cells.map((c) => [c.type, c.source])).toEqual([
      ['markdown', '## Part'],
      ['code', 'a = 1\na'],
    ])
  })

  it('rejects files that are not notebooks', () => {
    expect(() => parseIpynb('not json')).toThrow(/not JSON/)
    expect(() => parseIpynb('[]')).toThrow(/not a Jupyter notebook/)
    expect(() => parseIpynb('{"nbformat": 2}')).toThrow(/format 2/)
    expect(() => parseIpynb('{"nbformat": 4}')).toThrow(/no cells/)
  })
})

describe('languageOf', () => {
  it('maps kernels to SageMathCell languages', () => {
    expect(languageOf({})).toBe('sage')
    expect(languageOf({ kernelspec: { name: 'sagemath-10.4', language: 'python' } })).toBe('sage')
    expect(languageOf({ kernelspec: { name: 'python3', language: 'python' } })).toBe('python')
    expect(languageOf({ kernelspec: { name: 'ir', language: 'R' } })).toBe('r')
    expect(languageOf({ language_info: { name: 'gap' } })).toBe('gap')
    expect(languageOf({ kernelspec: { name: 'julia-1.10', language: 'julia' } })).toBe('sage')
  })
})

describe('toIpynb', () => {
  it('writes nbformat 4.5 without outputs, keeping metadata', () => {
    const out = JSON.parse(toIpynb(parseIpynb(JSON.stringify(v4), 'notes.ipynb')))
    expect(out.nbformat).toBe(4)
    expect(out.nbformat_minor).toBe(5)
    expect(out.metadata.custom).toEqual({ keep: true })
    expect(out.metadata.kernelspec).toEqual(v4.metadata.kernelspec)
    expect(out.metadata.language_info).toEqual(v4.metadata.language_info)
    expect(out.metadata.title).toBe('notes')
    expect(out.cells[1]).toEqual({ cell_type: 'code', id: 'calc', metadata: { tags: ['keep'] }, source: 'factor(2026)', execution_count: null, outputs: [] })
    expect(out.cells[0]).not.toHaveProperty('outputs')
  })

  it('replaces the kernel when the language changes', () => {
    const nb = parseIpynb(JSON.stringify(v4))
    const out = JSON.parse(toIpynb({ ...nb, language: 'r' }))
    expect(out.metadata.kernelspec).toEqual({ display_name: 'R', language: 'R', name: 'ir' })
    expect(out.metadata).not.toHaveProperty('language_info')
  })

  it('round-trips', () => {
    const nb = sampleNotebook()
    expect(parseIpynb(toIpynb(nb))).toEqual({ ...nb, metadata: expect.objectContaining({ title: 'sample' }) })
    const again = parseIpynb(toIpynb(nb))
    expect(parseIpynb(toIpynb(again))).toEqual(again)
  })
})
