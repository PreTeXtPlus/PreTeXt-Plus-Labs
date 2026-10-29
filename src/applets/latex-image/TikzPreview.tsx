import { useEffect, useRef, useState } from 'react'
import type { TikzImage } from './model.ts'
import { environmentSource, tikzjaxData } from './serialize.ts'
import { loadTikzjax } from './tikzjax.ts'

const DEBOUNCE_MS = 600

type Status = { state: 'loading' } | { state: 'compiling' } | { state: 'done' } | { state: 'error'; message: string; log: string }

/** TeX's error lines (starting with "!") and the context after them, or the end of the log. */
function errorExcerpt(log: string) {
  const lines = log.split('\n')
  const first = lines.findIndex((l) => l.startsWith('!'))
  return (first >= 0 ? lines.slice(first, first + 12) : lines.slice(-20)).join('\n').trim()
}

/**
 * The image compiled in the browser by TikZJax. TikZJax replaces each
 * <script type="text/tikz"> it finds with an SVG, so the container's children
 * are managed here rather than by React.
 */
export default function TikzPreview({ image, onSvg }: { image: TikzImage; onSvg: (svg: SVGSVGElement | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>({ state: 'loading' })
  // TikZJax compiles one image at a time; a newer edit waits for the current compile.
  const busy = useRef(false)
  const pending = useRef<TikzImage | null>(null)
  const startRef = useRef<((img: TikzImage) => void) | null>(null)
  const onSvgRef = useRef(onSvg)
  useEffect(() => {
    onSvgRef.current = onSvg
  })

  useEffect(() => {
    const container = containerRef.current!
    let log: string[] = []
    let cancelled = false

    // TikZJax prints the TeX transcript with console.log when data-show-console is set.
    const consoleLog = console.log
    console.log = (...args: unknown[]) => {
      if (busy.current && args.length === 1 && typeof args[0] === 'string') log.push(args[0])
      else consoleLog(...args)
    }

    const finish = () => {
      busy.current = false
      const next = pending.current
      pending.current = null
      if (next && !cancelled) start(next)
    }

    const observer = new MutationObserver(() => {
      if (!busy.current) return
      if (container.querySelector('img')) {
        // TikZJax's broken-image placeholder.
        container.replaceChildren()
        setStatus({ state: 'error', message: 'TeX could not compile the image.', log: log.join('\n') })
        onSvgRef.current(null)
        finish()
      }
    })
    observer.observe(container, { childList: true, subtree: true })

    const onLoaded = (e: Event) => {
      if (!busy.current || !(e.target instanceof SVGSVGElement)) return
      setStatus({ state: 'done' })
      onSvgRef.current(e.target)
      finish()
    }
    container.addEventListener('tikzjax-load-finished', onLoaded)

    function start(img: TikzImage) {
      busy.current = true
      log = []
      setStatus({ state: 'compiling' })
      const script = document.createElement('script')
      script.type = 'text/tikz'
      Object.assign(script.dataset, tikzjaxData(img), { showConsole: 'true' })
      script.textContent = environmentSource(img)
      container.replaceChildren(script)
    }

    startRef.current = (img) => {
      if (busy.current) pending.current = img
      else start(img)
    }

    return () => {
      cancelled = true
      busy.current = false
      startRef.current = null
      observer.disconnect()
      container.removeEventListener('tikzjax-load-finished', onLoaded)
      console.log = consoleLog
    }
  }, [])

  useEffect(() => {
    if (!image.body.trim()) {
      containerRef.current?.replaceChildren()
      pending.current = null
      onSvgRef.current(null)
      if (!busy.current) setStatus({ state: 'done' })
      return
    }
    let stale = false
    const timer = setTimeout(async () => {
      try {
        await loadTikzjax()
      } catch (e) {
        setStatus({ state: 'error', message: e instanceof Error ? e.message : String(e), log: '' })
        return
      }
      if (!stale) startRef.current?.(image)
    }, DEBOUNCE_MS)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [image])

  return (
    <div className="space-y-2">
      <div className="flex min-h-5 items-center justify-between text-xs text-slate-500">
        <span>Compiled in your browser by TikZJax.</span>
        {status.state === 'loading' && <span>Loading TeX…</span>}
        {status.state === 'compiling' && <span>Compiling… (the first run downloads TeX, about 6 MB)</span>}
      </div>
      {status.state === 'error' && (
        <div className="space-y-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{status.message}</p>
          {status.log && (
            <details>
              <summary className="cursor-pointer text-xs">TeX log</summary>
              <pre className="mt-1 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap">{errorExcerpt(status.log)}</pre>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs">Full transcript</summary>
                <pre className="mt-1 max-h-64 overflow-auto font-mono text-xs whitespace-pre-wrap">{status.log}</pre>
              </details>
            </details>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className={`tikzjax-container flex min-h-48 items-center justify-center overflow-auto rounded-md border border-slate-200 bg-white p-4 [&_svg]:max-w-full [&_svg]:h-auto ${
          status.state === 'error' ? 'hidden' : ''
        }`}
      />
    </div>
  )
}
