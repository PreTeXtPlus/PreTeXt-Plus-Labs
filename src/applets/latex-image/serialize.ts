import { escapeText } from '../exercise-designer/serialize.ts'
import type { LatexImage } from './model.ts'

const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;')

export const libraryList = (libraries: string) =>
  libraries
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)

/** The LaTeX preamble lines the image needs beyond TikZ itself. */
export function preamble({ packages, libraries, preamble }: LatexImage): string {
  const libs = libraryList(libraries)
  return [
    ...packages.map((p) => `\\usepackage{${p}}`),
    libs.length > 0 && `\\usetikzlibrary{${libs.join(',')}}`,
    preamble.trim(),
  ]
    .filter(Boolean)
    .join('\n')
}

/** The image as a PreTeXt <latex-image> element. */
export function toPretext(img: LatexImage): string {
  const label = img.label.trim()
  return `<latex-image${label ? ` label="${escapeAttr(label)}"` : ''}>\n${escapeText(img.source.trim())}\n</latex-image>`
}

/** The <docinfo> markup that provides the image's preamble, or '' if it needs none. */
export function preambleXml(img: LatexImage): string {
  const p = preamble(img)
  return p ? `<docinfo>\n  <latex-image-preamble>\n${escapeText(p)}\n  </latex-image-preamble>\n</docinfo>` : ''
}

/** The data-* attributes (as dataset keys) that tell TikZJax how to compile the image. */
export function tikzjaxData({ packages, libraries, preamble }: LatexImage): Record<string, string> {
  const data: Record<string, string> = {}
  const libs = libraryList(libraries)
  if (packages.length) data.texPackages = JSON.stringify(Object.fromEntries(packages.map((p) => [p, ''])))
  if (libs.length) data.tikzLibraries = libs.join(',')
  if (preamble.trim()) data.addToPreamble = preamble.trim()
  return data
}
