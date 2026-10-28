// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { checkWellFormed } from '../exercise-designer/serialize.ts'
import { emptyImage, sample } from './model.ts'
import { environmentSource, preambleXml, splitEnvironment, tikzjaxData, toPretext } from './serialize.ts'

describe('environmentSource', () => {
  it('wraps the indented body in the environment, with options only when set', () => {
    expect(environmentSource({ ...emptyImage(), body: '\\draw (0,0) -- (1,1);\n\n\\fill (0,0) circle (1pt);' })).toBe(String.raw`\begin{tikzpicture}
  \draw (0,0) -- (1,1);

  \fill (0,0) circle (1pt);
\end{tikzpicture}`)
    expect(environmentSource({ ...emptyImage(), options: ' scale=2 ', body: 'x' })).toBe('\\begin{tikzpicture}[scale=2]\n  x\n\\end{tikzpicture}')
    expect(environmentSource({ ...emptyImage(), environment: 'tikzcd', body: 'A \\arrow[r] & B' })).toBe(
      '\\begin{tikzcd}\n  A \\arrow[r] & B\n\\end{tikzcd}',
    )
  })
})

describe('toPretext', () => {
  it('emits only a <latex-image> element, with escaped source', () => {
    const xml = toPretext({ ...emptyImage(), environment: 'tikzcd', body: String.raw`A \arrow[r, "$f<g$"] & B` })
    expect(xml).toBe(String.raw`<latex-image>
\begin{tikzcd}
  A \arrow[r, "$f&lt;g$"] &amp; B
\end{tikzcd}
</latex-image>`)
    expect(checkWellFormed(xml)).toBeNull()
  })

  it('includes a label only when set', () => {
    expect(toPretext({ ...emptyImage(), body: 'x', label: ' fig-1 ' })).toMatch(/^<latex-image label="fig-1">/)
    expect(toPretext(sample())).toMatch(/^<latex-image label="parabola">\n\\begin\{tikzpicture\}\[scale=1.2\]\n {2}\\draw/)
  })
})

describe('splitEnvironment', () => {
  it('splits a whole environment into its parts', () => {
    expect(splitEnvironment('  \\begin{tikzpicture}[thick, label={[red]x}]\n    \\draw (0,0);\n      \\fill (1,1);\n  \\end{tikzpicture}\n')).toEqual({
      environment: 'tikzpicture',
      options: 'thick, label={[red]x}',
      body: '\\draw (0,0);\n  \\fill (1,1);',
    })
    expect(splitEnvironment('\\begin{tikzcd}\nA \\arrow[r] & B\n\\end{tikzcd}')).toEqual({ environment: 'tikzcd', options: '', body: 'A \\arrow[r] & B' })
  })

  it('leaves anything else alone', () => {
    expect(splitEnvironment('\\draw (0,0) -- (1,1);')).toBeNull()
    expect(splitEnvironment('\\begin{tikzpicture}\\draw (0,0);')).toBeNull()
    expect(splitEnvironment('\\begin{axis}x\\end{axis}')).toBeNull()
    expect(splitEnvironment('\\begin{tikzpicture}a\\end{tikzpicture}\\begin{tikzpicture}b\\end{tikzpicture}')).toBeNull()
    expect(splitEnvironment('\\begin{tikzpicture}[unbalanced\\end{tikzpicture}')).toBeNull()
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

  it('loads tikz-cd for the tikzcd environment, once', () => {
    expect(preambleXml({ ...emptyImage(), environment: 'tikzcd' })).toContain('\\usepackage{tikz-cd}')
    expect(preambleXml({ ...emptyImage(), environment: 'tikzcd', packages: ['tikz-cd'] }).match(/tikz-cd/g)).toHaveLength(1)
  })
})

describe('tikzjaxData', () => {
  it('maps the preamble to TikZJax data attributes', () => {
    expect(tikzjaxData(emptyImage())).toEqual({})
    const data = tikzjaxData({ ...emptyImage(), packages: ['amsmath', 'pgfplots'], libraries: 'calc,', preamble: ' \\def\\a{1} ' })
    expect(JSON.parse(data.texPackages)).toEqual({ amsmath: '', pgfplots: '' })
    expect(data.tikzLibraries).toBe('calc')
    expect(data.addToPreamble).toBe('\\def\\a{1}')
    expect(JSON.parse(tikzjaxData({ ...emptyImage(), environment: 'tikzcd' }).texPackages)).toEqual({ 'tikz-cd': '' })
  })
})
