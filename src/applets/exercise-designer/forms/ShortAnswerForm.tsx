import { Checkbox, Section } from '../components/fields.tsx'
import type { ShortAnswer } from '../model.ts'
import { patcher, type FormProps } from './types.ts'

export default function ShortAnswerForm(props: FormProps<ShortAnswer>) {
  const set = patcher(props)
  return (
    <Section title="Response">
      <p className="text-sm text-slate-600">
        Readers type a free response. It is graded by a person, so the text box appears only on a capable server such
        as Runestone.
      </p>
      <Checkbox
        label="Allow a file upload with the answer"
        checked={props.body.attachment}
        onChange={(attachment) => set({ attachment })}
      />
    </Section>
  )
}
