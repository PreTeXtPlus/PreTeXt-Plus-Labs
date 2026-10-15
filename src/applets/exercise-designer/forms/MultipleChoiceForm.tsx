import ListEditor from '../components/ListEditor.tsx'
import MarkupField from '../components/MarkupField.tsx'
import { Checkbox, Section } from '../components/fields.tsx'
import { emptyChoice, type MultipleChoice } from '../model.ts'
import { patcher, type FormProps } from './types.ts'

export default function MultipleChoiceForm(props: FormProps<MultipleChoice>) {
  const { body } = props
  const set = patcher(props)
  const correctCount = body.choices.filter((c) => c.correct).length
  return (
    <Section title="Choices">
      <Checkbox label="Shuffle choices for each reader" checked={body.randomize} onChange={(randomize) => set({ randomize })} />
      {correctCount === 0 && <p className="text-sm text-amber-700">Mark at least one choice as correct.</p>}
      <ListEditor
        items={body.choices}
        onChange={(choices) => set({ choices })}
        create={emptyChoice}
        addLabel="Add choice"
        itemTitle={(i) => `Choice ${String.fromCharCode(65 + i)}`}
        renderItem={(choice, update) => (
          <>
            <Checkbox label="Correct" checked={choice.correct} onChange={(correct) => update({ correct })} />
            <MarkupField label="Choice" rows={1} value={choice.statement} onChange={(statement) => update({ statement })} />
            <MarkupField label="Feedback (optional)" rows={1} value={choice.feedback} onChange={(feedback) => update({ feedback })} />
          </>
        )}
      />
    </Section>
  )
}
