import ListEditor from '../components/ListEditor.tsx'
import MarkupField from '../components/MarkupField.tsx'
import { Section, TextInput } from '../components/fields.tsx'
import { emptyMatch, type Matching } from '../model.ts'
import { patcher, type FormProps } from './types.ts'

export default function MatchingForm(props: FormProps<Matching>) {
  const { body } = props
  const set = patcher(props)
  return (
    <Section title="Pairs">
      <p className="text-sm text-slate-600">Keep premises and responses to short phrases. Readers see the responses shuffled.</p>
      <ListEditor
        items={body.matches}
        onChange={(matches) => set({ matches })}
        create={emptyMatch}
        addLabel="Add pair"
        itemTitle={(i) => `Pair ${i + 1}`}
        renderItem={(match, update) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Premise" value={match.premise} onChange={(premise) => update({ premise })} />
            <TextInput label="Response" value={match.response} onChange={(response) => update({ response })} />
          </div>
        )}
      />
      <MarkupField label="Feedback (optional)" rows={2} value={body.feedback} onChange={(feedback) => set({ feedback })} />
    </Section>
  )
}
