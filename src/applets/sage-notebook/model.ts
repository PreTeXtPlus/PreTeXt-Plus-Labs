/** The languages SageMathCell can evaluate. */
export const languages = ['sage', 'python', 'r', 'gap', 'gp', 'maxima', 'octave', 'singular', 'macaulay2', 'html'] as const
export type Language = (typeof languages)[number]

export const languageLabels: Record<Language, string> = {
  sage: 'Sage',
  python: 'Python',
  r: 'R',
  gap: 'GAP',
  gp: 'PARI/GP',
  maxima: 'Maxima',
  octave: 'Octave',
  singular: 'Singular',
  macaulay2: 'Macaulay2',
  html: 'HTML',
}

export type CellType = 'code' | 'markdown' | 'raw'

export interface Cell {
  id: string
  type: CellType
  source: string
  /** The cell's ipynb metadata, kept so it round-trips. */
  metadata: Record<string, unknown>
}

export interface Notebook {
  /** Also the download filename. */
  title: string
  /** Every code cell is evaluated in this language. */
  language: Language
  cells: Cell[]
  /** The notebook's ipynb metadata, kept so it round-trips. */
  metadata: Record<string, unknown>
}

/** A cell id valid in nbformat 4.5: 1 to 64 characters of [a-zA-Z0-9-_]. */
export const newId = () => crypto.randomUUID().slice(0, 8)

export const newCell = (type: CellType, source = ''): Cell => ({ id: newId(), type, source, metadata: {} })

export const emptyNotebook = (): Notebook => ({
  title: 'Untitled',
  language: 'sage',
  cells: [newCell('code')],
  metadata: {},
})

export const sampleNotebook = (): Notebook => ({
  title: 'sample',
  language: 'sage',
  metadata: {},
  cells: [
    newCell(
      'markdown',
      String.raw`# SageCell Notebooks

Code cells run on [SageMathCell](https://sagecell.sagemath.org) and share one kernel, so run them from top to bottom with **Run** or Shift+Enter.

Click this text to edit it. Markdown cells can include math, such as $f(x) = x^3 \sin x$.`,
    ),
    newCell('code', 'f(x) = x^3 * sin(x)\nshow(diff(f, x))'),
    newCell('markdown', 'Later cells can use `f`, because it is still defined in the kernel:'),
    newCell('code', 'plot(f, (x, -2*pi, 2*pi))'),
    newCell('code', '@interact\ndef _(n=slider(1, 10, 1, default=3)):\n    show(taylor(sin(x), x, 0, 2*n - 1))'),
  ],
})
