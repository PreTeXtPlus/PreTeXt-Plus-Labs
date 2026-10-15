import ListEditor from '../components/ListEditor.tsx'
import MarkupField from '../components/MarkupField.tsx'
import { Checkbox, Field, Section, Select, inputClass } from '../components/fields.tsx'
import { LANGUAGES, emptyBlock, type Parsons } from '../model.ts'
import { patcher, type FormProps } from './types.ts'


export default function ParsonsForm(props: FormProps<Parsons>) {
  const { body } = props
  const set = patcher(props)
  const isCode = body.language !== 'natural'
  return (
    <Section title="Blocks">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Language">
          <input
            list="parsons-languages"
            value={body.language}
            onChange={(e) => set({ language: e.target.value.trim() || 'natural' })}
            className={inputClass}
          />
          <datalist id="parsons-languages">
            {['natural', ...LANGUAGES].map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
        <Select
          label="Layout"
          value={body.layout}
          options={[
            ['vertical', 'Vertical'],
            ['horizontal', 'Horizontal'],
          ]}
          onChange={(layout) => set({ layout })}
        />
        <Select
          label="Numbered blocks"
          value={body.numbered}
          options={[
            ['no', 'No'],
            ['left', 'On the left'],
            ['right', 'On the right'],
          ]}
          onChange={(numbered) => set({ numbered })}
        />
        {isCode && (
          <Select
            label="Indentation"
            value={body.indentation}
            options={[
              ['show', 'Shown'],
              ['hide', 'Hidden (reader indents)'],
            ]}
            onChange={(indentation) => set({ indentation })}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        <Checkbox label="Adaptive (offer help after wrong attempts)" checked={body.adaptive} onChange={(adaptive) => set({ adaptive })} />
        {body.layout === 'horizontal' && (
          <Checkbox label="Shuffle blocks" checked={body.randomize} onChange={(randomize) => set({ randomize })} />
        )}
      </div>
      <p className="text-sm text-slate-600">
        List the blocks in the correct order. Distractors are left out of the solution and can go anywhere.
      </p>
      <ListEditor
        items={body.blocks}
        onChange={(blocks) => set({ blocks })}
        create={emptyBlock}
        addLabel="Add block"
        itemTitle={(i) => `Block ${i + 1}`}
        renderItem={(block, update) => (
          <>
            <Checkbox label="Distractor" checked={block.distractor} onChange={(distractor) => update({ distractor })} />
            <MarkupField
              label={isCode ? 'Code' : 'Text'}
              code={isCode}
              rows={isCode ? 3 : 2}
              value={block.content}
              onChange={(content) => update({ content })}
            />
          </>
        )}
      />
    </Section>
  )
}
