import { escapeText } from '../exercise-designer/serialize.ts'
import { environmentNames, requiredPackages, type Environment, type TikzImage } from './model.ts'

const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;')

export const libraryList = (libraries: string) =>
  libraries
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)

/** The full environment: \begin{env}[options], the indented body, \end{env}. */
export function environmentSource({ environment, options, body }: TikzImage): string {
  const opts = options.trim()
  const lines = body
    .trim()
    .split('\n')
    .map((l) => (l.trim() ? `  ${l.trimEnd()}` : ''))
  return [`\\begin{${environment}}${opts ? `[${opts}]` : ''}`, ...(body.trim() ? lines : []), `\\end{${environment}}`].join('\n')
}

/** Removes the indentation every non-blank line shares. */
function dedent(text: string) {
  const lines = text.split('\n')
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)![0].length))
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n')
}

/**
 * Splits a whole \begin{env}[options] … \end{env} into its parts, so a pasted
 * environment fills the separate fields. Returns null for anything else.
 */
export function splitEnvironment(text: string): { environment: Environment; options: string; body: string } | null {
  const src = text.trim()
  const begin = src.match(/^\\begin\{(\w+)\}/)
  const environment = environmentNames.find((e) => e === begin?.[1])
  if (!begin || !environment) return null
  const end = `\\end{${environment}}`
  if (!src.endsWith(end)) return null

  let i = begin[0].length
  while (src[i] === ' ' || src[i] === '\t') i++
  let options = ''
  if (src[i] === '[') {
    // Balance [] and {}, so options like label={[red]x} are read whole.
    let depth = 0
    const start = i + 1
    for (; i < src.length; i++) {
      const c = src[i]
      if (c === '[' || c === '{') depth++
      else if (c === ']' || c === '}') depth--
      if (depth === 0) break
    }
    if (depth !== 0) return null
    options = src.slice(start, i).trim()
    i++
  }

  const body = src.slice(i, src.length - end.length)
  // A second environment inside means this was not one whole environment.
  if (body.includes(`\\begin{${environment}}`) || body.includes(end)) return null
  return { environment, options, body: dedent(body.replace(/^[ \t]*\n/, '').trimEnd()) }
}

/** The LaTeX preamble lines the image needs beyond TikZ itself. */
export function preamble(img: TikzImage): string {
  const libs = libraryList(img.libraries)
  return [
    ...requiredPackages(img).map((p) => `\\usepackage{${p}}`),
    libs.length > 0 && `\\usetikzlibrary{${libs.join(',')}}`,
    img.preamble.trim(),
  ]
    .filter(Boolean)
    .join('\n')
}

/** The image as a PreTeXt <latex-image> element. */
export function toPretext(img: TikzImage): string {
  const label = img.label.trim()
  return `<latex-image${label ? ` label="${escapeAttr(label)}"` : ''}>\n${escapeText(environmentSource(img))}\n</latex-image>`
}

/** The <docinfo> markup that provides the image's preamble, or '' if it needs none. */
export function preambleXml(img: TikzImage): string {
  const p = preamble(img)
  return p ? `<docinfo>\n  <latex-image-preamble>\n${escapeText(p)}\n  </latex-image-preamble>\n</docinfo>` : ''
}

/** The data-* attributes (as dataset keys) that tell TikZJax how to compile the image. */
export function tikzjaxData(img: TikzImage): Record<string, string> {
  const data: Record<string, string> = {}
  const packages = requiredPackages(img)
  const libs = libraryList(img.libraries)
  if (packages.length) data.texPackages = JSON.stringify(Object.fromEntries(packages.map((p) => [p, ''])))
  if (libs.length) data.tikzLibraries = libs.join(',')
  if (img.preamble.trim()) data.addToPreamble = img.preamble.trim()
  return data
}
