import { useEffect, useRef, useState, type DragEvent } from 'react'
import { buttonClass, inputClass, primaryButtonClass } from '../exercise-designer/components/fields.tsx'
import CodeCell from './CodeCell.tsx'
import { parseIpynb, toIpynb } from './ipynb.ts'
import MarkdownCell from './MarkdownCell.tsx'
import { emptyNotebook, languageLabels, languages, newCell, sampleNotebook, type Cell, type CellType, type Language, type Notebook } from './model.ts'
import { killKernel } from './sagecell.ts'
import { decodeShare, encodeShare, fetchNotebook } from './share.ts'
import { loadDraft, saveDraft } from './draft.ts'

/** Longer links than this are often cut short by chat and email apps. */
const LONG_LINK = 8000

/** The notebook named by the page's address, if any: #nb=… holds one, ?url=… points at one. */
function linkedNotebook(): Promise<Notebook> | null {
  const inline = new URLSearchParams(location.hash.slice(1)).get('nb')
  if (inline) return decodeShare(inline)
  const url = new URLSearchParams(location.search).get('url')
  return url ? fetchNotebook(url) : null
}

function save(content: Blob, filename: string) {
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

const smallButton = 'rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent'

function Inserter({ onAdd }: { onAdd: (type: CellType) => void }) {
  return (
    <div className="flex justify-center gap-2 opacity-40 transition-opacity focus-within:opacity-100 hover:opacity-100">
      <button type="button" className={smallButton} onClick={() => onAdd('code')}>
        + Code
      </button>
      <button type="button" className={smallButton} onClick={() => onAdd('markdown')}>
        + Markdown
      </button>
    </div>
  )
}

export default function SageNotebook() {
  // A notebook opened from a link is only "viewed": it replaces the saved draft once it is edited.
  const [viewing, setViewing] = useState(() => location.hash.startsWith('#nb=') || new URLSearchParams(location.search).has('url'))
  const [notebook, setNotebook] = useState<Notebook>(loadDraft)
  const [loading, setLoading] = useState(viewing)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  // Bumped to rebuild every cell with a fresh kernel.
  const [session, setSession] = useState(0)
  const [sessionId] = useState(() => crypto.randomUUID().slice(0, 8))
  const linkKey = `labs-${sessionId}-${session}`
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!viewing) saveDraft(notebook)
  }, [notebook, viewing])

  const restart = () => {
    killKernel(linkKey)
    setSession((s) => s + 1)
  }

  /** Show a different notebook, as the user's own draft or as a linked one being viewed. */
  const open = (nb: Notebook, asLinked = false) => {
    restart()
    setNotebook(nb)
    setViewing(asLinked)
    setError('')
    if (!asLinked) history.replaceState(null, '', location.pathname)
  }

  useEffect(() => {
    const linked = linkedNotebook()
    if (!linked) return
    let cancelled = false
    linked
      .then(
        (nb) => !cancelled && open(nb, true),
        (e) => {
          if (cancelled) return
          setError(message(e))
          setViewing(false)
        },
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // Only the address the page was opened with matters.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Apply an edit; the first edit to a linked notebook makes it the draft. */
  const edit = (change: (nb: Notebook) => Notebook) => {
    if (viewing) {
      setViewing(false)
      history.replaceState(null, '', location.pathname)
    }
    setNotebook(change)
  }
  const editCells = (change: (cells: Cell[]) => Cell[]) => edit((nb) => ({ ...nb, cells: change(nb.cells) }))
  const setCell = (id: string, patch: Partial<Cell>) => editCells((cells) => cells.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const insert = (index: number, type: CellType) => editCells((cells) => cells.toSpliced(index, 0, newCell(type)))
  const move = (index: number, by: -1 | 1) =>
    editCells((cells) => {
      const next = [...cells]
      ;[next[index], next[index + by]] = [next[index + by], next[index]]
      return next
    })

  const hasContent = notebook.cells.some((c) => c.source.trim())
  const confirmReplace = () => viewing || !hasContent || confirm('Replace the current notebook? Download it first if you want to keep it.')

  const openFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const nb = parseIpynb(await file.text(), file.name)
      if (confirmReplace()) open(nb)
    } catch (e) {
      setError(message(e))
    }
  }

  const openUrl = async () => {
    const url = prompt('Address of a public .ipynb file (GitHub and gist links work):')?.trim()
    if (!url) return
    try {
      const nb = await fetchNotebook(url)
      if (!confirmReplace()) return
      open(nb, true)
      history.replaceState(null, '', `${location.pathname}?url=${encodeURIComponent(url)}`)
    } catch (e) {
      setError(message(e))
    }
  }

  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return
    e.preventDefault()
    void openFile(e.dataTransfer.files[0])
  }

  const share = async () => {
    try {
      const link = `${location.origin}${location.pathname}#nb=${await encodeShare(notebook)}`
      await navigator.clipboard.writeText(link)
      setCopied(
        link.length > LONG_LINK
          ? `Copied, but the link is ${link.length.toLocaleString()} characters long and some apps will cut it short. For a notebook this size, host the .ipynb (on GitHub, say) and use Open URL instead.`
          : 'Link copied. The notebook is stored in the link itself.',
      )
      setTimeout(() => setCopied(''), link.length > LONG_LINK ? 12000 : 4000)
    } catch (e) {
      setError(`Could not copy the link: ${message(e)}`)
    }
  }

  const filename = `${notebook.title.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'notebook'}.ipynb`

  return (
    <div className="space-y-5" onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()} onDrop={onDrop}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
          <input type="text" value={notebook.title} onChange={(e) => edit((nb) => ({ ...nb, title: e.target.value }))} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Language</span>
          <select value={notebook.language} onChange={(e) => edit((nb) => ({ ...nb, language: e.target.value as Language }))} className={inputClass}>
            {languages.map((l) => (
              <option key={l} value={l}>
                {languageLabels[l]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={primaryButtonClass} onClick={() => save(new Blob([toIpynb(notebook)], { type: 'application/x-ipynb+json' }), filename)}>
          Download .ipynb
        </button>
        <button type="button" className={primaryButtonClass} onClick={share}>
          Copy share link
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept=".ipynb,application/x-ipynb+json,application/json" className="hidden" onChange={(e) => (void openFile(e.target.files?.[0]), (e.target.value = ''))} />
        <button type="button" className={buttonClass} onClick={() => fileInput.current?.click()} title="Or drop an .ipynb file on the notebook">
          Open file…
        </button>
        <button type="button" className={buttonClass} onClick={openUrl}>
          Open URL…
        </button>
        <button type="button" className={buttonClass} onClick={() => confirmReplace() && open(emptyNotebook())}>
          New
        </button>
        <button type="button" className={buttonClass} onClick={() => confirmReplace() && open(sampleNotebook())}>
          Load sample
        </button>
        <button type="button" className={`${buttonClass} ml-auto`} onClick={restart} title="Forget every variable and clear the results">
          Restart kernel
        </button>
      </div>

      <div aria-live="polite" className="space-y-2 empty:hidden">
        {error && (
          <p className="flex items-start justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            <button type="button" className="font-medium hover:underline" onClick={() => setError('')}>
              Dismiss
            </button>
          </p>
        )}
        {copied && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{copied}</p>}
        {viewing && !loading && (
          <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
            You are viewing a shared notebook. Nothing runs until you press Run. Editing it replaces the draft saved in this browser.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-slate-500">Loading the notebook…</p>
      ) : (
        <div className="space-y-1">
          <Inserter onAdd={(type) => insert(0, type)} />
          {notebook.cells.map((cell, i) => (
            // Cells are rebuilt for each session: SageMathCell's editors are created once, from the source at that time.
            <div key={`${session}:${cell.id}`} className="space-y-1">
              <div className="group rounded-md border border-transparent p-1 focus-within:border-slate-200 hover:border-slate-200">
                <div className="flex items-center justify-end gap-0.5 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <span className="mr-auto pl-1 text-xs text-slate-400">{cell.type === 'code' ? languageLabels[notebook.language] : cell.type === 'markdown' ? 'Markdown' : 'Raw'}</span>
                  {cell.type !== 'raw' && (
                    <button type="button" className={smallButton} onClick={() => setCell(cell.id, { type: cell.type === 'code' ? 'markdown' : 'code' })}>
                      {cell.type === 'code' ? 'To Markdown' : 'To code'}
                    </button>
                  )}
                  <button type="button" className={smallButton} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move cell up" title="Move up">
                    ↑
                  </button>
                  <button type="button" className={smallButton} onClick={() => move(i, 1)} disabled={i === notebook.cells.length - 1} aria-label="Move cell down" title="Move down">
                    ↓
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => (!cell.source.trim() || confirm('Delete this cell?')) && editCells((cells) => cells.filter((c) => c.id !== cell.id))}
                    aria-label="Delete cell"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                {cell.type === 'code' ? (
                  <CodeCell source={cell.source} language={notebook.language} linkKey={linkKey} onChange={(source) => setCell(cell.id, { source })} />
                ) : cell.type === 'markdown' ? (
                  <MarkdownCell source={cell.source} onChange={(source) => setCell(cell.id, { source })} />
                ) : (
                  <pre className="overflow-auto rounded-md bg-slate-50 p-2 font-mono text-sm whitespace-pre-wrap text-slate-600">{cell.source}</pre>
                )}
              </div>
              <Inserter onAdd={(type) => insert(i + 1, type)} />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Code runs on the public <a href="https://sagecell.sagemath.org" className="underline">SageMathCell</a> server, and results are not saved in the notebook. Your work is kept as a draft in this browser.
      </p>
    </div>
  )
}
