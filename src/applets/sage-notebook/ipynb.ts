import { languages, newId, type Cell, type CellType, type Language, type Notebook } from './model.ts'

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/** ipynb stores text as a string or as an array of lines that keep their newlines. */
const text = (v: unknown): string => (Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '')

/** The SageMathCell language matching a notebook's kernel: Sage unless it names another one. */
export function languageOf(metadata: Json): Language {
  const kernelspec = isObject(metadata.kernelspec) ? metadata.kernelspec : {}
  const info = isObject(metadata.language_info) ? metadata.language_info : {}
  const names = [kernelspec.language, info.name, kernelspec.name].filter((n) => typeof n === 'string').map((n) => n.toLowerCase())
  if (names.some((n) => n.startsWith('sage'))) return 'sage'
  for (const n of names) {
    if (/^python\d*$/.test(n)) return 'python'
    if (n === 'ir') return 'r'
    if ((languages as readonly string[]).includes(n)) return n as Language
  }
  return 'sage'
}

const kernelspecs: Partial<Record<Language, Json>> = {
  sage: { display_name: 'SageMath', language: 'sage', name: 'sagemath' },
  python: { display_name: 'Python 3', language: 'python', name: 'python3' },
  r: { display_name: 'R', language: 'R', name: 'ir' },
}

const VALID_ID = /^[\w-]{1,64}$/

/**
 * Read an .ipynb file (nbformat 4, or the older nbformat 3). Outputs are
 * dropped: SageMathCell renders results itself.
 */
export function parseIpynb(source: string, filename?: string): Notebook {
  let data: unknown
  try {
    data = JSON.parse(source)
  } catch {
    throw new Error('This is not a Jupyter notebook: the file is not JSON.')
  }
  if (!isObject(data)) throw new Error('This is not a Jupyter notebook.')

  let rawCells: unknown
  if (data.nbformat === 4) rawCells = data.cells
  else if (data.nbformat === 3 && Array.isArray(data.worksheets)) rawCells = data.worksheets.flatMap((w) => (isObject(w) && Array.isArray(w.cells) ? w.cells : []))
  else throw new Error(typeof data.nbformat === 'number' ? `Notebook format ${data.nbformat} is not supported.` : 'This is not a Jupyter notebook.')
  if (!Array.isArray(rawCells)) throw new Error('This notebook has no cells.')

  const seen = new Set<string>()
  const cells: Cell[] = rawCells.filter(isObject).map((raw) => {
    let type: CellType = raw.cell_type === 'code' ? 'code' : raw.cell_type === 'markdown' ? 'markdown' : 'raw'
    // nbformat 3 keeps code in `input`, and has heading cells.
    let cellSource = text(raw.cell_type === 'code' && raw.source === undefined ? raw.input : raw.source)
    if (raw.cell_type === 'heading') {
      type = 'markdown'
      cellSource = `${'#'.repeat(typeof raw.level === 'number' ? Math.min(Math.max(raw.level, 1), 6) : 1)} ${cellSource}`
    }
    const id = typeof raw.id === 'string' && VALID_ID.test(raw.id) && !seen.has(raw.id) ? raw.id : newId()
    seen.add(id)
    return { id, type, source: cellSource, metadata: isObject(raw.metadata) ? raw.metadata : {} }
  })

  const metadata = isObject(data.metadata) ? data.metadata : {}
  const title = typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title : (filename?.replace(/\.ipynb$/i, '') ?? 'Untitled')
  return { title, language: languageOf(metadata), cells, metadata }
}

/** The notebook as an nbformat 4.5 object, with empty outputs. */
export function ipynbObject(notebook: Notebook): Json {
  const metadata: Json = { ...notebook.metadata, title: notebook.title }
  // Keep the original kernel details unless the language was changed.
  if (!isObject(metadata.kernelspec) || languageOf(metadata) !== notebook.language) {
    const l = notebook.language
    metadata.kernelspec = kernelspecs[l] ?? { display_name: l, language: l, name: l }
    delete metadata.language_info
  }
  return {
    cells: notebook.cells.map((cell) => ({
      cell_type: cell.type,
      id: cell.id,
      metadata: cell.metadata,
      source: cell.source,
      ...(cell.type === 'code' ? { execution_count: null, outputs: [] } : {}),
    })),
    metadata,
    nbformat: 4,
    nbformat_minor: 5,
  }
}

export const toIpynb = (notebook: Notebook): string => JSON.stringify(ipynbObject(notebook), null, 1) + '\n'
