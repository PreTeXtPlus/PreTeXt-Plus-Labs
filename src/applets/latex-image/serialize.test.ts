// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { checkWellFormed } from '../exercise-designer/serialize.ts'
import { emptyImage, sample } from './model.ts'
import { preambleXml, tikzjaxData, toPretext } from './serialize.ts'

describe('toPretext', () => {
  it('emits only a <latex-image> element, with escaped source', () => {
    const xml = toPretext({ ...emptyImage(), source: String.raw`\matrix { a & b \\ };  \draw (0,0) node {$x<y$};` })
    expect(xml).toBe(String.raw`<latex-image>
\matrix { a &amp; b \\ };  \draw (0,0) node {$x&lt;y$};
</latex-image>`)
    expect(checkWellFormed(xml)).toBeNull()
  })

  it('includes a label only when set', () => {
    expect(toPretext({ ...emptyImage(), source: 'x', label: ' fig-1 ' })).toMatch(/^<latex-image label="fig-1">/)
    expect(toPretext(sample())).toMatch(/^<latex-image label="parabola">\n\\begin\{tikzpicture\}/)
  })
})

describe('preambleXml', () => {
  it('is empty when the image needs no preamble', () => {
    expect(preambleXml(emptyImage())).toBe('')
    expect(preambleXml({ ...emptyImage(), libraries: ' , ', preamble: '  ' })).toBe('')
  })

  it('loads packages, libraries and extra preamble', () => {
    const xml = preambleXml({ ...emptyImage(), packages: ['pgfplots'], libraries: 'calc, arrows.meta', preamble: '\\newcommand{\\R}{\\mathbb{R}}' })
    expect(xml).toBe(String.raw`<docinfo>
  <latex-image-preamble>
\usepackage{pgfplots}
\usetikzlibrary{calc,arrows.meta}
\newcommand{\R}{\mathbb{R}}
  </latex-image-preamble>
</docinfo>`)
    expect(checkWellFormed(xml)).toBeNull()
  })
})

describe('tikzjaxData', () => {
  it('maps the preamble to TikZJax data attributes', () => {
    expect(tikzjaxData(emptyImage())).toEqual({})
    const data = tikzjaxData({ ...emptyImage(), packages: ['amsmath', 'pgfplots'], libraries: 'calc,', preamble: ' \\def\\a{1} ' })
    expect(JSON.parse(data.texPackages)).toEqual({ amsmath: '', pgfplots: '' })
    expect(data.tikzLibraries).toBe('calc')
    expect(data.addToPreamble).toBe('\\def\\a{1}')
  })
})
