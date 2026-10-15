import { useEffect, useMemo, useRef, useState } from 'react'
import { checkWellFormed } from './serialize.ts'
import SimplePreview from './SimplePreview.tsx'

type Renderer = typeof import('@pretextbook/pretext-html')

// Loaded on first use, so the WASM renderer stays out of the main bundle.
let rendererPromise: Promise<Renderer> | undefined
const loadRenderer = () => (rendererPromise ??= import('@pretextbook/pretext-html'))

const DEBOUNCE_MS = 400

const wrap = (xml: string) =>
  `<section xml:id="exercise-designer-preview"><title>Preview</title>${xml}</section>`

/**
 * The exercise as PreTeXt renders it, via the official XSLT in WebAssembly
 * (@pretextbook/pretext-html), with live Runestone components. Falls back to
 * SimplePreview in browsers without WebAssembly JSPI (Firefox, Safari).
 */
export default function Preview({ xml }: { xml: string }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const latest = useRef(0)
  const malformed = useMemo(() => checkWellFormed(xml), [xml])

  useEffect(() => {
    loadRenderer().then(
      (r) => setSupported(r.isJspiAvailable()),
      () => setSupported(false),
    )
  }, [])

  useEffect(() => {
    if (!supported || malformed) return
    const id = ++latest.current
    const timer = setTimeout(async () => {
      setRendering(true)
      try {
        const { renderHtml } = await loadRenderer()
        const result = await renderHtml({
          sourcePath: '/preview.ptx',
          sourceContent: wrap(xml),
          fragment: true,
          theme: 'light',
        })
        if (id !== latest.current) return
        setHtml(result.html)
        setError(null)
      } catch (e) {
        if (id === latest.current) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (id === latest.current) setRendering(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [xml, supported, malformed])

  if (supported === false) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
          The full PreTeXt preview needs WebAssembly JSPI, available in Chrome, Edge and other Chromium browsers. Showing a
          simplified preview instead.
        </p>
        <SimplePreview xml={xml} />
      </div>
    )
  }

  const shownError = malformed ? `Fix the markup errors in the form to update the preview. (${malformed})` : error

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between text-xs text-slate-500">
        <span>Rendered with the PreTeXt stylesheets and Runestone.</span>
        {(rendering || supported === null) && <span>Rendering…</span>}
      </div>
      {shownError && (
        <p className="whitespace-pre-wrap rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{shownError}</p>
      )}
      {html ? (
        <iframe
          title="Exercise preview"
          srcDoc={html}
          // Runestone components need localStorage, which an opaque (sandboxed-origin) frame
          // cannot use. The page is the author's own exercise run through PreTeXt's stylesheets.
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className="h-[70vh] w-full rounded-md border border-slate-200 bg-white"
        />
      ) : (
        !shownError && <div className="h-[70vh] animate-pulse rounded-md bg-slate-100" />
      )}
    </div>
  )
}
