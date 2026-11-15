import { useEffect, useRef, useState } from 'react'
import type { Language } from './model.ts'
import { loadSagecell, type CellInfo } from './sagecell.ts'

/**
 * A code cell evaluated by SageMathCell. Its script builds the editor, Run
 * button and output inside the container, so the container's children are
 * managed here rather than by React. The source is only read when the cell is
 * built; later edits are reported through onChange.
 */
export default function CodeCell({
  source,
  language,
  linkKey,
  onChange,
}: {
  source: string
  language: Language
  /** Cells with the same key share a kernel. */
  linkKey: string
  onChange: (source: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | string>('loading')
  const sourceRef = useRef(source)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    sourceRef.current = source
    onChangeRef.current = onChange
  })

  useEffect(() => {
    const container = containerRef.current!
    let cancelled = false

    loadSagecell().then(
      (sagecell) => {
        if (cancelled) return
        const cell = document.createElement('div')
        container.replaceChildren(cell)

        let info: CellInfo | undefined
        let listening = false
        // The cell may be built during makeSagecell or just after, so this is tried at both points.
        const listen = () => {
          const editor = info?.editorData
          if (listening || !editor?.on) return
          listening = true
          editor.on('change', (cm) => {
            if (!cancelled) onChangeRef.current(cm.getValue())
          })
        }
        info = sagecell.makeSagecell({
          inputLocation: cell,
          code: sourceRef.current,
          linkKey,
          languages: [language],
          evalButtonText: 'Run',
          hide: ['permalink'],
          callback: () => queueMicrotask(listen),
        })
        listen()
        setStatus('ready')
      },
      (e) => {
        if (!cancelled) setStatus(e instanceof Error ? e.message : String(e))
      },
    )

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [language, linkKey])

  return (
    <div>
      {status === 'loading' && <p className="text-sm text-slate-500">Loading SageMathCell…</p>}
      {status !== 'loading' && status !== 'ready' && (
        <div className="space-y-2">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{status}</p>
          <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-sm">{source}</pre>
        </div>
      )}
      <div ref={containerRef} className="sagecell-container" />
    </div>
  )
}
