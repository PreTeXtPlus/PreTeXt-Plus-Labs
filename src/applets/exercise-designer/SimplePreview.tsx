import { useMemo, type ReactNode } from 'react'

const hash = (s: string) => Array.from(s).reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7)

/** A stable shuffle, so the preview doesn't jump around while typing elsewhere. */
const shuffled = <T,>(items: T[], keyOf: (item: T) => string) =>
  items
    .map((item, i) => ({ item, k: hash(`${i}:${keyOf(item)}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.item)

const elementChildren = (e: Element, tag?: string) => Array.from(e.children).filter((c) => !tag || c.tagName === tag)

function Aside({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border-l-4 border-amber-300 bg-amber-50 px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Reveal({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-slate-200 px-3 py-2">
      <summary className="cursor-pointer font-medium text-slate-700">{label}</summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  )
}

function children(e: Element): ReactNode[] {
  return Array.from(e.childNodes).map((n, i) => node(n, i))
}

function node(n: Node, key: number): ReactNode {
  if (n.nodeType === 3) return n.textContent
  if (n.nodeType !== 1) return null
  const e = n as Element
  switch (e.tagName) {
    case 'title':
      return (
        <h3 key={key} className="text-base font-semibold">
          {children(e)}
        </h3>
      )
    case 'statement':
      return (
        <div key={key} className="space-y-2">
          {children(e)}
          {e.hasAttribute('correct') && (
            <div className="flex gap-2">
              {['True', 'False'].map((v) => (
                <span key={v} className="rounded-md border border-slate-300 px-3 py-1">
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    case 'p':
      return <p key={key}>{children(e)}</p>
    case 'choices': {
      const choices = elementChildren(e, 'choice')
      const multi = choices.filter((c) => c.getAttribute('correct') === 'yes').length > 1
      return (
        <ul key={key} className="space-y-2">
          {choices.map((c, i) => (
            <li key={i} className="flex gap-2">
              <input type={multi ? 'checkbox' : 'radio'} name="preview-choice" className="mt-1 accent-indigo-600" />
              <div className="flex-1 space-y-1">{children(c)}</div>
            </li>
          ))}
        </ul>
      )
    }
    case 'blocks': {
      const horizontal = e.getAttribute('layout') === 'horizontal'
      // A block with <choice>s offers each choice as its own card.
      const cards = elementChildren(e, 'block').flatMap((b) => {
        const choices = elementChildren(b, 'choice')
        return choices.length ? choices : [b]
      })
      const order = e.getAttribute('randomize') === 'no' ? cards : shuffled(cards, (b) => b.textContent ?? '')
      return (
        <div key={key} className={horizontal ? 'flex flex-wrap gap-2' : 'space-y-2'}>
          {order.map((b, i) => (
            <div key={i} className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 shadow-sm">
              {children(b)}
            </div>
          ))}
        </div>
      )
    }
    case 'matches':
    case 'cardsort':
    case 'matching': {
      const premises = Array.from(e.getElementsByTagName('premise'))
      const responses = Array.from(e.getElementsByTagName('response'))
      const cell = 'rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5'
      return (
        <div key={key} className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {shuffled(premises, (p) => p.textContent ?? '').map((p, i) => (
              <div key={i} className={cell}>
                {children(p)}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {responses.map((r, i) => (
              <div key={i} className={cell}>
                {children(r)}
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'areas':
      return (
        <div key={key} className="space-y-2 rounded-md border border-slate-200 p-3">
          {children(e)}
        </div>
      )
    case 'area':
      return (
        <span key={key} className="cursor-pointer underline decoration-indigo-400 decoration-dotted underline-offset-4">
          {children(e)}
        </span>
      )
    case 'cline':
      return (
        <div key={key} className="min-h-5 font-mono whitespace-pre">
          {children(e)}
        </div>
      )
    case 'fillin': {
      const width = Number(e.getAttribute('width')) || 10
      return (
        <input
          key={key}
          type="text"
          aria-label="Blank"
          style={{ width: `${width + 2}ch` }}
          className="mx-1 rounded border border-slate-400 px-1"
        />
      )
    }
    case 'program': {
      const code = elementChildren(e, 'code')[0]
      return (
        <div key={key} className="overflow-hidden rounded-md border border-slate-300">
          <div className="bg-slate-100 px-3 py-1 text-xs text-slate-600">
            ActiveCode ({e.getAttribute('language') || 'code'})
            {elementChildren(e, 'tests').length > 0 && ' · with unit tests'}
          </div>
          <pre className="overflow-x-auto p-3 font-mono">{code?.textContent?.replace(/^\n/, '') ?? ''}</pre>
        </div>
      )
    }
    case 'response':
      return (
        <textarea key={key} rows={3} placeholder="Reader's response" className="w-full rounded-md border border-slate-300 p-2" />
      )
    case 'feedback':
      return (
        <Aside key={key} label="Feedback">
          {children(e)}
        </Aside>
      )
    case 'hint':
    case 'answer':
    case 'solution':
      return (
        <Reveal key={key} label={e.tagName[0].toUpperCase() + e.tagName.slice(1)}>
          {children(e)}
        </Reveal>
      )
    case 'evaluation':
    case 'idx':
      return null
    case 'm':
      return (
        <span key={key} className="font-serif italic text-slate-700">
          \({e.textContent}\)
        </span>
      )
    case 'md':
    case 'me':
    case 'mdn':
    case 'men':
      return (
        <div key={key} className="text-center font-serif italic text-slate-700">
          \[{e.textContent?.trim()}\]
        </div>
      )
    case 'c':
      return (
        <code key={key} className="rounded bg-slate-100 px-1 font-mono">
          {e.textContent}
        </code>
      )
    case 'pre':
      return (
        <pre key={key} className="overflow-x-auto rounded bg-slate-100 p-2 font-mono">
          {e.textContent}
        </pre>
      )
    case 'em':
      return <em key={key}>{children(e)}</em>
    case 'term':
    case 'alert':
      return <strong key={key}>{children(e)}</strong>
    case 'q':
      return <span key={key}>“{children(e)}”</span>
    case 'url':
      return (
        <a key={key} href={e.getAttribute('href') ?? undefined} className="text-indigo-600 underline" target="_blank" rel="noreferrer">
          {e.childNodes.length ? children(e) : e.getAttribute('href')}
        </a>
      )
    case 'xref':
      return (
        <span key={key} className="text-indigo-600">
          [{e.getAttribute('ref')}]
        </span>
      )
    case 'ol':
      return (
        <ol key={key} className="list-decimal space-y-1 pl-6">
          {children(e)}
        </ol>
      )
    case 'ul':
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {children(e)}
        </ul>
      )
    case 'li':
      return <li key={key}>{children(e)}</li>
    default:
      return <span key={key}>{children(e)}</span>
  }
}

/** An approximate rendering of the generated exercise, roughly as a reader would see it. */
export default function SimplePreview({ xml }: { xml: string }) {
  const root = useMemo(() => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    return doc.getElementsByTagName('parsererror').length ? null : doc.documentElement
  }, [xml])

  if (!root) return <p className="text-sm text-red-600">Fix the markup errors in the form to see a preview.</p>
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Simple preview without interactivity or math rendering. Try using
        a Chromium-based browser (Chrome, Edge) for improved previews.
      </p>
      <div className="space-y-3 text-sm leading-relaxed">{children(root)}</div>
    </div>
  )
}
