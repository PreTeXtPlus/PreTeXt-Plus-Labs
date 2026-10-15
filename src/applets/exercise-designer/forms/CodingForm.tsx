import MarkupField from '../components/MarkupField.tsx'
import { Field, Section, inputClass } from '../components/fields.tsx'
import { LANGUAGES, type Coding } from '../model.ts'
import { patcher, type FormProps } from './types.ts'

export default function CodingForm(props: FormProps<Coding>) {
  const { body } = props
  const set = patcher(props)
  return (
    <Section title="Program">
      <div className="w-48">
        <Field label="Language">
          <input
            list="coding-languages"
            value={body.language}
            onChange={(e) => set({ language: e.target.value })}
            className={inputClass}
          />
          <datalist id="coding-languages">
            {LANGUAGES.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
      </div>
      <MarkupField
        label="Starter code"
        code
        rows={8}
        value={body.code}
        onChange={(code) => set({ code })}
        help="What the reader sees in the ActiveCode editor."
      />
      <MarkupField
        label="Unit tests (optional)"
        code
        rows={6}
        value={body.tests}
        onChange={(tests) => set({ tests })}
        help="Run automatically with the reader's code, e.g. a unittest.gui TestCaseGui class for Python."
      />
    </Section>
  )
}
