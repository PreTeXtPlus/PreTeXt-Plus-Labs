// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { emptyBlock, emptyBodies, emptyCommon, emptyTest, type Body, type BodyOf, type Exercise, type Kind } from './model.ts'
import { fromXml } from './parse.ts'
import { samples as exerciseSamples } from './samples.ts'
import { checkWellFormed, staticOrder, toXml } from './serialize.ts'

/** Replace generated ids so structures can be compared, keeping id references consistent. */
function normalizeIds(value: unknown): unknown {
  const ids = new Map<string, string>()
  const alias = (id: string) => {
    if (!ids.has(id)) ids.set(id, `#${ids.size}`)
    return ids.get(id)
  }
  const walk = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(walk)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v).map(([k, x]) => [
              k,
              k === 'id' ? alias(x as string) : k === 'refs' ? (x as string[]).map(alias) : walk(x),
            ]),
          )
        : v
  return walk(value)
}

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
    multipleCorrect: true,
    cols: '3',
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
    partialOrder: true,
    blocks: [
      { ...emptyBlock(), content: 'import math', name: 'math' },
      { ...emptyBlock(), content: 'b = 4', name: 'b', alternatives: [{ id: 'x', content: '4 = b' }] },
      { ...emptyBlock(), content: 'c = math.sqrt(b)\nif c < 2:', name: 'c', depends: ['math', 'b'] },
      { ...emptyBlock(), content: '    print(c)', depends: ['c'] },
      { ...emptyBlock(), content: 'import antigravity', distractor: true },
    ],
  },
  {
    ...d.parsons,
    shuffle: false,
    blocks: [
      { ...emptyBlock(), content: 'Suppose <m>n</m> is even.' },
      { ...emptyBlock(), content: 'Then <m>n = 2m</m>.', alternatives: [{ id: 'y', content: 'Then <m>n</m> is prime.' }] },
      { ...emptyBlock(), content: 'Click your heels.', distractor: true },
    ],
  },
  { ...d.horizontalparsons, language: 'math', blocks: [{ id: '1', content: '\\pi', distractor: false }, { id: '2', content: '\\sum', distractor: false }] },
  {
    ...d.horizontalparsons,
    language: 'sql',
    randomize: false,
    reuse: true,
    database: 'sql/test.db',
    tests: 'assert 1,1 == world\nassert 0,1 == hello',
    blocks: [
      { id: '1', content: 'SELECT', distractor: false },
      { id: '2', content: '* <', distractor: false },
      { id: '3', content: 'DROP', distractor: true },
    ],
  },
  {
    ...d.horizontalparsons,
    blocks: [
      { id: '1', content: 'the', distractor: false },
      { id: '2', content: '<em>quick</em>', distractor: false },
      { id: '3', content: 'foo', distractor: true },
    ],
  },
  {
    kind: 'cardsort',
    groups: [
      { id: 'g1', response: '5', premises: [{ id: 'p1', text: '2 + 3' }, { id: 'p2', text: '4 + 1' }] },
      { id: 'g2', response: '14', premises: [{ id: 'p3', text: '<m>12 + 2</m>' }] },
    ],
    feedback: 'Review the timeline.',
  },
  {
    kind: 'matching',
    responses: [
      { id: 'ace', text: 'Ace' },
      { id: 'spade', text: 'Spade' },
      { id: 'heart', text: 'Heart' },
    ],
    premises: [
      { id: 'p1', text: 'Ace of Spades', refs: ['ace', 'spade'] },
      { id: 'p2', text: 'Two of Hearts', refs: ['heart'] },
    ],
    feedback: 'Not too hard.',
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
  bodies.forEach((body, i) => {
    it(`${i}: ${body.kind}`, () => {
      const statement = body.kind === 'fillin' ? 'Two plus two is <fillin/>, spelled <fillin/>.' : common.statement
      const ex: Exercise = { common: { ...common, statement }, body }
      const xml = toXml(ex)
      expect(checkWellFormed(xml)).toBeNull()
      const { exercise, warnings } = fromXml(xml)
      expect(warnings).toEqual([])
      expect(normalizeIds(exercise)).toEqual(normalizeIds(ex))
    })
  })
})

describe('static order', () => {
  it('is a permutation that never shows the solution order', () => {
    for (let n = 2; n < 12; n++) {
      const order = staticOrder(n)
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
      expect(order).not.toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
  })
})

/** Snippets from the annotated sample book, §3.8–3.13. */
const samples: Record<string, string> = {
  truefalse: `<exercise label="vector-space-dimension"><title>True/False</title><idx>vector space</idx>
    <statement correct="no"><p>Every vector space has finite dimension.</p></statement>
    <feedback><p>The vector space of all polynomials is infinite.</p></feedback>
    <hint><p><m>P_n</m> has dimension <m>n+1</m>.</p></hint></exercise>`,
  multiplechoice: `<exercise><title>Multiple-Choice, Randomized, One Answer but with Checkboxes</title><idx>stop signs</idx>
    <statement><p>What color is a stop sign?</p></statement>
    <choices randomize="yes" multiple-correct="yes">
      <choice><statement><p>Green</p></statement><feedback><p>Green means go!.</p></feedback></choice>
      <choice correct="yes"><statement><p>Red</p></statement><feedback><p>Red is universal.</p></feedback></choice>
    </choices>
    <hint><p>What did you see last time you went driving?</p></hint></exercise>`,
  parsons: `<exercise xml:id="parsons-with-partial-order" label="parsons-with-partial-order" adaptive="yes" indentation="hide" language="python">
    <title>Parsons Problem, Partial Ordering</title>
    <statement><p>Try putting the blocks in a valid order.</p></statement>
    <blocks>
      <block order="5" name="math"><cline>import math</cline></block>
      <block order="7" correct="no"><cline>import antigravity</cline></block>
      <block order="6" name="a"><cline>a = 3</cline></block>
      <block order="2" name="b"><choice correct="yes"><cline>b = 4</cline></choice><choice><cline>4 = b</cline></choice></block>
      <block order="3" name="cSq" depends="a b"><cline>cSquared = a ** 2 + b ** 2</cline></block>
      <block order="1" name="c" depends="cSq math"><cline>c = math.sqrt(cSquared)</cline></block>
      <block order="4" depends="c"><cline>print(c)</cline></block>
    </blocks></exercise>`,
  fixedorder: `<exercise label="number-theory-proof-fixed-order" adaptive="yes">
    <statement><p>Create a proof.</p></statement>
    <blocks randomize="no" numbered="left">
      <block order="2"><p>Suppose <m>n</m> is even.</p></block>
      <block order="3">
        <choice><p>Then <m>n</m> is a prime number.</p></choice>
        <choice correct="yes"><p>Then there exists an <m>m</m> so that <m>n = 2m</m>.</p></choice>
      </block>
      <block order="1" correct="no"><p>Click the heels of your ruby slippers together three times.</p></block>
    </blocks></exercise>`,
  horizontalmath: `<exercise label="horizontal-parson-math-test" language="math">
    <statement><p>Correct answer is <m>\\pi\\sum\\beta\\alpha</m></p></statement>
    <blocks layout="horizontal" randomize="yes">
      <block order="2"><m>\\pi</m></block><block order="1"><m>\\sum</m></block>
      <block order="4"><m>\\beta</m></block><block order="3"><m>\\alpha</m></block>
    </blocks></exercise>`,
  horizontalnatural: `<exercise label="horizontal-parson-natural-distractor" language="natural">
    <statement><p>Form the sentence often used to show font samples.</p></statement>
    <blocks layout="horizontal">
      <block ref="font-the-two" order="7"/>
      <block order="10" correct="yes">quick</block>
      <block order="8" correct="no">foo</block>
      <block xml:id="font-the-two">the</block>
      <block order="9">lazy</block>
    </blocks></exercise>`,
  horizontalsql: `<exercise label="horizontal-parson-sql-statement-with-db" language="sql" database="sql/test.db">
    <statement><p>Form the SQL statement by rearranging the four blocks.</p></statement>
    <blocks layout="horizontal" randomize="yes">
      <block order="2"><c>SELECT</c></block><block order="1"><c>*</c></block>
    </blocks>
    <tests>
    assert 1,1 == world
    assert 0,1 == hello
    </tests></exercise>`,
  cardsort: `<exercise xml:id="cardsort-basic" label="cardsort-basic">
    <title>Cardsort Problem, Basic Arithmetic</title><idx>matching US dates</idx>
    <statement><p>This is a simple exercise to test some grading behavior.</p></statement>
    <cardsort>
      <match><premise order="1">2 + 3</premise><premise order="3">4 + 1</premise><response>5</response></match>
      <match><premise order="2"><m>12 + 2</m></premise><response>14</response></match>
    </cardsort></exercise>`,
  matching: `<exercise label="matching-playing-cards">
    <title>Matching Problem, Playing Cards</title>
    <idx><h>matching</h><h>playing cards</h></idx>
    <statement><p>Associate each playing card with every applicable property.</p></statement>
    <feedback><p>This one should not be very hard.</p></feedback>
    <matching>
      <premise ref="jack heart">Jack of Hearts</premise>
      <premise ref="ace spade">Ace of Spades</premise>
      <response xml:id="ace" order="4">Ace</response>
      <response xml:id="jack" order="3">Jack</response>
      <response xml:id="heart" order="2">Heart</response>
      <response xml:id="spade" order="1">Spade</response>
    </matching></exercise>`,
  clickable: `<exercise label="clickable-table">
    <statement><p>Identify all of the boolean values in the array.</p></statement>
    <areas>
      <tabular top="minor" bottom="minor" left="minor" right="minor">
        <row><cell><c>42</c></cell><cell><area><c>True</c></area></cell><cell><area correct="no"><c>'towel'</c></area></cell></row>
      </tabular>
    </areas></exercise>`,
}

const importBody = <K extends Kind>(name: string, kind: K) => {
  const { exercise, warnings } = fromXml(samples[name])
  expect(exercise.body.kind).toBe(kind)
  return { body: exercise.body as BodyOf<K>, common: exercise.common, warnings }
}

describe('import from the sample book', () => {
  it('true/false', () => {
    const { body, warnings } = importBody('truefalse', 'truefalse')
    expect(body.correct).toBe(false)
    expect(warnings).toEqual(['Dropped unsupported <idx> element.'])
  })

  it('multiple choice with checkboxes', () => {
    const { body } = importBody('multiplechoice', 'multiplechoice')
    expect([body.randomize, body.multipleCorrect]).toEqual([true, true])
    expect(body.choices.map((c) => [c.statement, c.correct])).toEqual([
      ['Green', false],
      ['Red', true],
    ])
  })

  it('Parsons with a partial order and alternatives', () => {
    const { body, warnings } = importBody('parsons', 'parsons')
    expect(warnings).toEqual([])
    expect(body.partialOrder).toBe(true)
    expect(body.blocks[3]).toMatchObject({ name: 'b', content: 'b = 4', alternatives: [{ content: '4 = b' }] })
    expect(body.blocks[5].depends).toEqual(['cSq', 'math'])
    expect(body.blocks[1].distractor).toBe(true)
  })

  it('Parsons in a fixed order', () => {
    const { body } = importBody('fixedorder', 'parsons')
    expect([body.shuffle, body.numbered, body.language]).toEqual([false, 'left', 'natural'])
    expect(body.blocks[1].content).toBe('Then there exists an <m>m</m> so that <m>n = 2m</m>.')
    expect(body.blocks[1].alternatives[0].content).toBe('Then <m>n</m> is a prime number.')
  })

  it('horizontal Parsons with math blocks', () => {
    const { body } = importBody('horizontalmath', 'horizontalparsons')
    expect(body.blocks.map((b) => b.content)).toEqual(['\\pi', '\\sum', '\\beta', '\\alpha'])
  })

  it('horizontal Parsons with a reused block', () => {
    const { body } = importBody('horizontalnatural', 'horizontalparsons')
    expect(body.blocks.map((b) => [b.content, b.distractor])).toEqual([
      ['the', false],
      ['quick', false],
      ['foo', true],
      ['the', false],
      ['lazy', false],
    ])
  })

  it('horizontal Parsons with SQL tests', () => {
    const { body, warnings } = importBody('horizontalsql', 'horizontalparsons')
    expect(warnings).toEqual([])
    expect([body.database, body.tests]).toEqual(['sql/test.db', 'assert 1,1 == world\nassert 0,1 == hello'])
    expect(body.blocks.map((b) => b.content)).toEqual(['SELECT', '*'])
  })

  it('cardsort', () => {
    const { body } = importBody('cardsort', 'cardsort')
    expect(body.groups.map((g) => [g.response, g.premises.map((p) => p.text)])).toEqual([
      ['5', ['2 + 3', '4 + 1']],
      ['14', ['<m>12 + 2</m>']],
    ])
  })

  it('matching', () => {
    const { body } = importBody('matching', 'matching')
    const text = new Map(body.responses.map((r) => [r.id, r.text]))
    expect(body.premises.map((p) => [p.text, p.refs.map((id) => text.get(id))])).toEqual([
      ['Jack of Hearts', ['Jack', 'Heart']],
      ['Ace of Spades', ['Ace', 'Spade']],
    ])
  })

  it('clickable areas in a table', () => {
    const { body } = importBody('clickable', 'clickable')
    expect(body.code).toBe(false)
    expect(body.content).toContain('<area correct="no"><c>\'towel\'</c></area>')
  })

  it('reads the old <matches> as a cardsort', () => {
    const { exercise } = fromXml('<exercise><statement><p>M</p></statement><matches><match><premise>A</premise><response>1</response></match></matches></exercise>')
    expect(exercise.body.kind).toBe('cardsort')
  })

  it('rejects malformed XML', () => {
    expect(() => fromXml('<exercise><statement></exercise>')).toThrow(/not well-formed/)
  })
})

describe('samples', () => {
  for (const [kind, xml] of Object.entries(exerciseSamples)) {
    it(`${kind} imports cleanly and round-trips`, () => {
      const { exercise, warnings } = fromXml(xml)
      expect(exercise.body.kind).toBe(kind)
      expect(warnings).toEqual([])
      expect(normalizeIds(fromXml(toXml(exercise)).exercise)).toEqual(normalizeIds(exercise))
    })
  }
})
