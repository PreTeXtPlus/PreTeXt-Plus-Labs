import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'
import { Marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { useMemo, useState } from 'react'
import { inputClass } from '../exercise-designer/components/fields.tsx'
import './notebook.css'

const marked = new Marked(markedKatex({ throwOnError: false, nonStandard: true }))

// Notebooks opened from links are untrusted, so the rendered HTML is sanitized.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof HTMLAnchorElement) {
    node.target = '_blank'
    node.rel = 'noopener noreferrer'
  }
})

const renderMarkdown = (source: string): string => DOMPurify.sanitize(marked.parse(source, { async: false }))

/** A markdown cell: rendered until clicked, then a textarea until it loses focus. */
export default function MarkdownCell({ source, onChange }: { source: string; onChange: (source: string) => void }) {
  const [editing, setEditing] = useState(!source.trim())
  const html = useMemo(() => renderMarkdown(source), [source])

  if (editing)
    return (
      <textarea
        value={source}
        rows={Math.max(3, source.split('\n').length + 1)}
        autoFocus={!!source.trim()}
        spellCheck
        placeholder="Markdown, with $math$. Click away or press Ctrl+Enter to render."
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => source.trim() && setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.shiftKey) && source.trim()) {
            e.preventDefault()
            setEditing(false)
          }
        }}
        className={`${inputClass} font-mono`}
      />
    )

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={(e) => {
        // Links work as links, and selecting text does not start editing.
        if (!(e.target instanceof Element && e.target.closest('a')) && !window.getSelection()?.toString()) setEditing(true)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) setEditing(true)
      }}
      className="nb-markdown cursor-text rounded-md px-2 py-1 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
