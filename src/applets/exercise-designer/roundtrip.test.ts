// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { emptyBodies, emptyCommon, emptyTest, type Body, type Exercise } from './model.ts'
import { fromXml } from './parse.ts'
import { checkWellFormed, toXml } from './serialize.ts'

/** Replace generated ids so structures can be compared. */
const stripIds = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(stripIds)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'id').map(([k, v]) => [k, stripIds(v)]))
      : value

const common = {
  ...emptyCommon(),
  title: 'A <m>2 \\times 2</m> example',
  label: 'ex-sample',
  statement: 'First paragraph with <c>code</c>.\n\nSecond paragraph.',
  hints: [{ id: 'h1', text: 'Think about <em>it</em>.' }],
  answer: '<md>\n  <mrow>x = 1</mrow>\n</md>',
  solution: 'Because.',
}

const d = emptyBodies()
const bodies: Body[] = [
  { kind: 'truefalse', correct: false, feedback: 'Counterexample: <m>x=0</m>.' },
  {
    kind: 'multiplechoice',
    randomize: true,
    choices: [
      { id: 'a', statement: 'Red', feedback: 'Yes!', correct: true },
      { id: 'b', statement: 'Blue', feedback: '', correct: false },
    ],
  },
  {
    ...d.parsons,
    language: 'python',
    indentation: 'hide',
    adaptive: true,
    numbered: 'left',
    blocks: [
      { id: '1', content: 'def f(x):\n    if x < 2:', distractor: false },
      { id: '2', content: '        return x', distractor: false },
      { id: '3', content: '    return 0', distractor: true },
    ],
  },
  { ...d.parsons, layout: 'horizontal', randomize: true, blocks: [{ id: '1', content: 'one', distractor: false }] },
  {
    kind: 'matching',
    matches: [
      { id: '1', premise: 'Monroe Doctrine', response: '1823' },
      { id: '2', premise: '<m>\\pi</m>', response: 'pi' },
    ],
    feedback: 'Review the timeline.',
  },
  {
    kind: 'clickable',
    code: false,
    language: '',
    content: 'A thing of <area>beauty</area> is <area correct="no">a</area> joy.',
    feedback: '',
  },
  {
    kind: 'clickable',
    code: true,
    language: 'python',
    content: 'x = <area>1</area>\nif x < 2:\n    <area correct="no">pass</area>',
    feedback: 'Look again.',
  },
  {
    kind: 'fillin',
    blanks: [
      {
        id: 'b1',
        answer: '4',
        mode: 'number',
        width: '5',
        name: 'sum',
        tests: [
          { ...emptyTest('numcmp'), correct: true, useAnswer: true, feedback: 'Right.' },
          { ...emptyTest('numcmp'), value: '5', tolerance: '0.5', feedback: 'Off by one.' },
        ],
      },
      {
        id: 'b2',
        answer: 'four',
        mode: 'string',
        width: '',
        name: '',
        tests: [{ ...emptyTest(), pattern: 'f[o0]ur', caseInsensitive: true, strip: false }],
      },
    ],
  },
  { kind: 'coding', language: 'python', code: 'def add(a, b):\n    return 4', tests: 'assert add(1, 2) < 4' },
  { kind: 'shortanswer', attachment: true },
]

describe('round trip', () => {
  for (const body of bodies) {
    it(`${body.kind}${'code' in body ? ` (code: ${body.code})` : ''}${'layout' in body ? ` (${body.layout})` : ''}`, () => {
      const statement = body.kind === 'fillin' ? 'Two plus two is <fillin/>, spelled <fillin/>.' : common.statement
      const ex: Exercise = { common: { ...common, statement }, body }
      const xml = toXml(ex)
      expect(checkWellFormed(xml)).toBeNull()
      const { exercise, warnings } = fromXml(xml)
      expect(warnings).toEqual([])
      expect(stripIds(exercise)).toEqual(stripIds(ex))
    })
  }
})

describe('import from the sample article', () => {
  const samples: [string, Body['kind']][] = [
    ['<exercise><statement correct="no"><p>All functions are continuous.</p></statement><feedback><p>No.</p></feedback></exercise>', 'truefalse'],
    ['<exercise><statement><p>Color?</p></statement><choices><choice correct="yes"><statement><p>Red</p></statement><feedback><p>Yes</p></feedback></choice><choice><statement><p>Blue</p></statement></choice></choices><hint><p>Think.</p></hint></exercise>', 'multiplechoice'],
    ['<exercise adaptive="yes"><statement><p>Prove.</p></statement><blocks><block order="2"><choice correct="yes"><p>A</p></choice><choice><p>B</p></choice></block><block order="1" correct="no"><p>C</p></block></blocks></exercise>', 'parsons'],
    ['<exercise><statement><p>Match.</p></statement><cardsort><match><premise order="4">Monroe Doctrine</premise><response>1823</response></match></cardsort><feedback><p>See <url href="https://example.org">here</url>.</p></feedback></exercise>', 'matching'],
    ['<exercise><statement><p>Click nouns.</p></statement><areas><p>A thing of <area correct="yes">beauty</area> is <area correct="no">those</area> <area>future</area>.</p></areas><feedback><p>Nouns.</p></feedback></exercise>', 'clickable'],
    ['<exercise><statement><p>2+2 = <fillin mode="number" answer="4"/></p></statement><evaluation><evaluate><test correct="yes"><numcmp use-answer="yes"/></test></evaluate></evaluation></exercise>', 'fillin'],
    ['<exercise><statement><p>Fix it.</p></statement><program language="python" interactive="activecode"><code>def add(a,b):\n    return 4</code></program></exercise>', 'coding'],
    ['<reading-questions><exercise label="short-answer-question"><statement><p>Why?</p></statement><response/></exercise></reading-questions>', 'shortanswer'],
  ]
  for (const [xml, kind] of samples) {
    it(`detects ${kind}`, () => {
      expect(fromXml(xml).exercise.body.kind).toBe(kind)
    })
  }

  it('keeps the correct choice of a Parsons block and warns', () => {
    const { exercise, warnings } = fromXml(samples[2][0])
    expect(exercise.body.kind === 'parsons' && exercise.body.blocks.map((b) => [b.content, b.distractor])).toEqual([
      ['A', false],
      ['C', true],
    ])
    expect(warnings).toHaveLength(1)
  })

  it('rejects malformed XML', () => {
    expect(() => fromXml('<exercise><statement></exercise>')).toThrow(/not well-formed/)
  })
})
