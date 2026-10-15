import MarkupField from '../components/MarkupField.tsx'
import { Section } from '../components/fields.tsx'
import type { TrueFalse } from '../model.ts'
import { patcher, type FormProps } from './types.ts'

export default function TrueFalseForm(props: FormProps<TrueFalse>) {
  const { body } = props
  const set = patcher(props)
  return (
    <Section title="True/False">
      <p className="text-sm text-slate-600">The statement is the claim the reader decides is true or false.</p>
      <div className="flex gap-4 text-sm">
        {[true, false].map((value) => (
          <label key={String(value)} className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="tf-correct"
              checked={body.correct === value}
              onChange={() => set({ correct: value })}
              className="size-4 accent-indigo-600"
            />
            The statement is {value ? 'true' : 'false'}
          </label>
        ))}
      </div>
      <MarkupField
        label="Feedback (optional)"
        rows={2}
        value={body.feedback}
        onChange={(feedback) => set({ feedback })}
        help="Explain why, beyond just right or wrong."
      />
    </Section>
  )
}
