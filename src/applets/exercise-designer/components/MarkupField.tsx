import { useMemo, type ReactNode, type Ref } from 'react'
import { checkWellFormed } from '../serialize.ts'
import { Field, inputClass } from './fields.tsx'

/** A textarea for PreTeXt markup (or code, with `code`), flagging markup that is not well-formed. */
export default function MarkupField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  help,
  code,
  ref,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  help?: ReactNode
  code?: boolean
  ref?: Ref<HTMLTextAreaElement>
}) {
  const error = useMemo(() => (code ? null : checkWellFormed(value)), [code, value])

  return (
    <Field label={label} help={help}>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        spellCheck={!code}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-mono ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </Field>
  )
}
