/** The environments an image can be, and the package each needs beyond TikZ. */
export const environments = {
  tikzpicture: { package: null },
  tikzcd: { package: 'tikz-cd' },
} as const
export type Environment = keyof typeof environments
export const environmentNames = Object.keys(environments) as Environment[]

export interface TikzImage {
  environment: Environment
  /** The environment's optional argument, without the brackets. */
  options: string
  /** The TikZ commands inside the environment. */
  body: string
  /** LaTeX packages to load, from availablePackages. */
  packages: string[]
  /** Comma-separated TikZ libraries. */
  libraries: string
  /** Extra preamble: macros, \pgfplotsset, and so on. */
  preamble: string
  label: string
}

/** The packages TikZJax bundles (TikZ itself is always loaded; tikz-cd comes with the tikzcd environment). */
export const availablePackages = ['amsmath', 'amssymb', 'amsfonts', 'array', 'pgfplots', 'tikz-3dplot', 'hf-tikz', 'xparse', 'etoolbox']

/** The checked packages plus the one the environment needs. */
export function requiredPackages({ environment, packages }: TikzImage): string[] {
  const extra = environments[environment].package
  return extra && !packages.includes(extra) ? [...packages, extra] : packages
}

export const emptyImage = (): TikzImage => ({
  environment: 'tikzpicture',
  options: '',
  body: '',
  packages: [],
  libraries: '',
  preamble: '',
  label: '',
})

export const sample = (): TikzImage => ({
  ...emptyImage(),
  options: 'scale=1.2',
  body: String.raw`\draw[help lines, step=0.5] (-0.5,-0.5) grid (3.5,3);
\draw[-Stealth] (-0.5,0) -- (3.5,0) node[right] {$x$};
\draw[-Stealth] (0,-0.5) -- (0,3) node[above] {$y$};
\draw[thick, blue, domain=-0.2:3, samples=50] plot (\x, {0.3*\x*\x});
\node[blue, above left] at (3,2.7) {$y = 0.3x^2$};
\fill[red] (1,0.3) circle (2pt) node[below right] {$(1, 0.3)$};`,
  libraries: 'arrows.meta',
  label: 'parabola',
})
