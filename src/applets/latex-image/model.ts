export interface LatexImage {
  /** LaTeX for the body of the image: usually a tikzpicture. */
  source: string
  /** LaTeX packages to load, from availablePackages. */
  packages: string[]
  /** Comma-separated TikZ libraries. */
  libraries: string
  /** Extra preamble: macros, \pgfplotsset, and so on. */
  preamble: string
  label: string
}

/** The packages TikZJax bundles (TikZ itself is always loaded). */
export const availablePackages = [
  'amsmath',
  'amssymb',
  'amsfonts',
  'array',
  'pgfplots',
  'tikz-cd',
  'tikz-3dplot',
  'hf-tikz',
  'xparse',
  'etoolbox',
]

export const emptyImage = (): LatexImage => ({ source: '', packages: [], libraries: '', preamble: '', label: '' })

export const sample = (): LatexImage => ({
  source: String.raw`\begin{tikzpicture}[scale=1.2]
  \draw[help lines, step=0.5] (-0.5,-0.5) grid (3.5,3);
  \draw[-Stealth] (-0.5,0) -- (3.5,0) node[right] {$x$};
  \draw[-Stealth] (0,-0.5) -- (0,3) node[above] {$y$};
  \draw[thick, blue, domain=-0.2:3, samples=50] plot (\x, {0.3*\x*\x});
  \node[blue, above left] at (3,2.7) {$y = 0.3x^2$};
  \fill[red] (1,0.3) circle (2pt) node[below right] {$(1, 0.3)$};
\end{tikzpicture}`,
  packages: [],
  libraries: 'arrows.meta',
  preamble: '',
  label: 'parabola',
})
