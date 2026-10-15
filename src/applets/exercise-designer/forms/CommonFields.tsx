import type { Ref } from 'react'
import ListEditor from '../components/ListEditor.tsx'
import MarkupField from '../components/MarkupField.tsx'
import { Section, TextInput } from '../components/fields.tsx'
import { newId, type Common } from '../model.ts'

const MARKUP_HELP = (
  <>
    Plain text becomes paragraphs (separate them with a blank line). PreTeXt markup like <code>&lt;m&gt;x^2&lt;/m&gt;</code>{' '}
    or <code>&lt;c&gt;code&lt;/c&gt;</code> is allowed.
  </>
)

interface Props {
  common: Common
  onChange: (patch: Partial<Common>) => void
}

export function HeaderFields({ common, onChange, statementRef }: Props & { statementRef: Ref<HTMLTextAreaElement> }) {
  return (
    <Section title="Exercise">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label="Title (optional)" value={common.title} onChange={(title) => onChange({ title })} />
        <TextInput
          label="Label (optional)"
          value={common.label}
          mono
          placeholder="exercise-my-topic"
          onChange={(label) => onChange({ label })}
        />
      </div>
      <MarkupField
        ref={statementRef}
        label="Statement"
        rows={4}
        value={common.statement}
        onChange={(statement) => onChange({ statement })}
        help={MARKUP_HELP}
      />
    </Section>
  )
}

export function FooterFields({ common, onChange }: Props) {
  return (
    <Section title="Hints, answer and solution">
      <ListEditor
        items={common.hints}
        onChange={(hints) => onChange({ hints })}
        create={() => ({ id: newId(), text: '' })}
        addLabel="Add hint"
        itemTitle={(i) => `Hint ${i + 1}`}
        renderItem={(hint, update) => (
          <MarkupField label="Text" rows={2} value={hint.text} onChange={(text) => update({ text })} />
        )}
      />
      <MarkupField label="Answer (optional)" rows={2} value={common.answer} onChange={(answer) => onChange({ answer })} />
      <MarkupField
        label="Solution (optional)"
        rows={3}
        value={common.solution}
        onChange={(solution) => onChange({ solution })}
      />
    </Section>
  )
}
