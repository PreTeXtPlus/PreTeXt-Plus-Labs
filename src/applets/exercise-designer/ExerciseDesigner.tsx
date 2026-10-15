import { useMemo, useRef, useState } from 'react'
import { buttonClass, primaryButtonClass } from './components/fields.tsx'
import CardsortForm from './forms/CardsortForm.tsx'
import ClickableForm from './forms/ClickableForm.tsx'
import CodingForm from './forms/CodingForm.tsx'
import { FooterFields, HeaderFields } from './forms/CommonFields.tsx'
import FillInForm from './forms/FillInForm.tsx'
import HorizontalParsonsForm from './forms/HorizontalParsonsForm.tsx'
import MatchingForm from './forms/MatchingForm.tsx'
import MultipleChoiceForm from './forms/MultipleChoiceForm.tsx'
import ParsonsForm from './forms/ParsonsForm.tsx'
import ShortAnswerForm from './forms/ShortAnswerForm.tsx'
import TrueFalseForm from './forms/TrueFalseForm.tsx'
import { kindLabels, kinds, type BodyOf, type Common, type Kind } from './model.ts'
import { fromXml } from './parse.ts'
import Preview from './Preview.tsx'
import { toXml } from './serialize.ts'
import { emptyDraft, useDraft } from './useDraft.ts'

function ImportDialog({ dialogRef, onImport }: { dialogRef: React.RefObject<HTMLDialogElement | null>; onImport: (xml: string) => string | null }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setError(null)
    dialogRef.current?.close()
  }

  return (
    <dialog ref={dialogRef} className="m-auto w-[min(42rem,calc(100vw-2rem))] rounded-lg p-0 shadow-xl backdrop:bg-slate-900/40">
      <form
        method="dialog"
        className="space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          const err = onImport(text)
          setError(err)
          if (!err) {
            setText('')
            close()
          }
        }}
      >
        <h2 className="text-lg font-semibold">Import PreTeXt XML</h2>
        <p className="text-sm text-slate-600">Paste one <code>&lt;exercise&gt;</code>. It replaces the current draft for its type.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full rounded-md border border-slate-300 p-2 font-mono text-sm"
          placeholder="<exercise>…</exercise>"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass} onClick={close}>
            Cancel
          </button>
          <button type="submit" className={primaryButtonClass} disabled={!text.trim()}>
            Import
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default function ExerciseDesigner() {
  const [draft, setDraft] = useDraft()
  const [tab, setTab] = useState<'xml' | 'preview'>('preview')
  const [copied, setCopied] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const statementRef = useRef<HTMLTextAreaElement>(null)
  const importRef = useRef<HTMLDialogElement>(null)

  const { kind, common } = draft
  const xml = useMemo(() => toXml({ common: draft.common, body: draft.bodies[draft.kind] }), [draft])

  const setCommon = (patch: Partial<Common>) => setDraft((d) => ({ ...d, common: { ...d.common, ...patch } }))
  const setBody =
    <K extends Kind>(k: K) =>
    (body: BodyOf<K>) =>
      setDraft((d) => ({ ...d, bodies: { ...d.bodies, [k]: body } }))

  const importXml = (src: string) => {
    try {
      const { exercise, warnings } = fromXml(src)
      const k = exercise.body.kind
      setDraft((d) => ({ kind: k, common: exercise.common, bodies: { ...d.bodies, [k]: exercise.body } }))
      setWarnings(warnings)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([xml + '\n'], { type: 'application/xml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${common.label.trim() || 'exercise'}.ptx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    if (confirm('Clear every field of every exercise type?')) {
      setDraft(emptyDraft())
      setWarnings([])
    }
  }

  const form = (() => {
    switch (kind) {
      case 'truefalse':
        return <TrueFalseForm body={draft.bodies.truefalse} onChange={setBody('truefalse')} />
      case 'multiplechoice':
        return <MultipleChoiceForm body={draft.bodies.multiplechoice} onChange={setBody('multiplechoice')} />
      case 'parsons':
        return <ParsonsForm body={draft.bodies.parsons} onChange={setBody('parsons')} />
      case 'horizontalparsons':
        return <HorizontalParsonsForm body={draft.bodies.horizontalparsons} onChange={setBody('horizontalparsons')} />
      case 'cardsort':
        return <CardsortForm body={draft.bodies.cardsort} onChange={setBody('cardsort')} />
      case 'matching':
        return <MatchingForm body={draft.bodies.matching} onChange={setBody('matching')} />
      case 'clickable':
        return <ClickableForm body={draft.bodies.clickable} onChange={setBody('clickable')} />
      case 'fillin':
        return (
          <FillInForm
            body={draft.bodies.fillin}
            onChange={setBody('fillin')}
            statement={common.statement}
            onStatementChange={(statement) => setCommon({ statement })}
            statementRef={statementRef}
          />
        )
      case 'coding':
        return <CodingForm body={draft.bodies.coding} onChange={setBody('coding')} />
      case 'shortanswer':
        return <ShortAnswerForm body={draft.bodies.shortanswer} onChange={setBody('shortanswer')} />
    }
  })()

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium ${active ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Exercise type" className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === kind}
              onClick={() => setDraft((d) => ({ ...d, kind: k }))}
              className={`rounded-full border px-3 py-1 text-sm ${
                k === kind ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-100'
              }`}
            >
              {kindLabels[k]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className={buttonClass} onClick={() => importRef.current?.showModal()}>
            Import XML
          </button>
          <button type="button" className={buttonClass} onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setWarnings([])} aria-label="Dismiss" className="text-amber-700 hover:text-amber-950">
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <HeaderFields common={common} onChange={setCommon} statementRef={statementRef} />
          {form}
          <FooterFields common={common} onChange={setCommon} />
        </div>

        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-2">
              <div role="tablist" className="flex">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'preview'}
                  className={tabClass(tab === 'preview')}
                  onClick={() => setTab('preview')}
                >
                  Preview
                </button>
                <button type="button" role="tab" aria-selected={tab === 'xml'} className={tabClass(tab === 'xml')} onClick={() => setTab('xml')}>
                  XML
                </button>
              </div>
              <div className="flex gap-2 py-1.5">
                <button type="button" className={buttonClass} onClick={copy}>
                  {copied ? 'Copied!' : 'Copy XML'}
                </button>
                {tab === 'xml' && (
                  <button type="button" className={buttonClass} onClick={download}>
                    Download
                  </button>
                )}
              </div>
            </div>
            <div className={tab === 'xml' ? 'max-h-[75vh] overflow-auto p-4' : 'p-3'}>
              {tab === 'xml' ? <pre className="font-mono text-xs leading-relaxed whitespace-pre">{xml}</pre> : <Preview xml={xml} />}
            </div>
          </div>
        </div>
      </div>

      <ImportDialog dialogRef={importRef} onImport={importXml} />
    </div>
  )
}
