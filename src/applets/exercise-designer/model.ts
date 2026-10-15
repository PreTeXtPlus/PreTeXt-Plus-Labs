export const kinds = [
  'truefalse',
  'multiplechoice',
  'parsons',
  'horizontalparsons',
  'cardsort',
  'matching',
  'clickable',
  'fillin',
  'coding',
  'shortanswer',
] as const

export type Kind = (typeof kinds)[number]

export const kindLabels: Record<Kind, string> = {
  truefalse: 'True/False',
  multiplechoice: 'Multiple Choice',
  parsons: 'Parsons',
  horizontalparsons: 'Horizontal Parsons',
  cardsort: 'Cardsort',
  matching: 'Matching',
  clickable: 'Clickable Area',
  fillin: 'Fill-in-the-Blanks',
  coding: 'Coding',
  shortanswer: 'Short Answer',
}

export const LANGUAGES = ['python', 'javascript', 'java', 'c', 'cpp', 'sql', 'html', 'octave', 'ruby']

export const newId = () => Math.random().toString(36).slice(2, 10)

export interface Hint {
  id: string
  text: string
}

/** Fields shared by every exercise type. Rich-text fields hold PreTeXt markup. */
export interface Common {
  title: string
  label: string
  /** One <idx> entry per line (markup, so <h> subentries work). */
  index: string
  statement: string
  hints: Hint[]
  answer: string
  solution: string
}

export interface TrueFalse {
  kind: 'truefalse'
  correct: boolean
  feedback: string
}

export interface Choice {
  id: string
  statement: string
  feedback: string
  correct: boolean
}

export interface MultipleChoice {
  kind: 'multiplechoice'
  randomize: boolean
  /** Use checkboxes even when only one choice is correct. */
  multipleCorrect: boolean
  cols: string
  choices: Choice[]
}

export interface Alternative {
  id: string
  content: string
}

export interface Block {
  id: string
  /** Markup for natural language, plain source lines for code. */
  content: string
  distractor: boolean
  /** Wrong versions of this block, offered alongside it as <choice>s. */
  alternatives: Alternative[]
  /** For partial orders: this block's name, and the names of blocks that must come before it. */
  name: string
  depends: string[]
}

export interface Parsons {
  kind: 'parsons'
  /** "natural" or a programming language name. */
  language: string
  numbered: 'no' | 'left' | 'right'
  indentation: 'show' | 'hide'
  adaptive: boolean
  shuffle: boolean
  partialOrder: boolean
  blocks: Block[]
}

export interface InlineBlock {
  id: string
  content: string
  distractor: boolean
}

export interface HorizontalParsons {
  kind: 'horizontalparsons'
  /** "natural", "math", or a programming language name. */
  language: string
  randomize: boolean
  reuse: boolean
  blocks: InlineBlock[]
  tests: string
  database: string
}

export interface Premise {
  id: string
  text: string
}

export interface CardsortGroup {
  id: string
  response: string
  premises: Premise[]
}

export interface Cardsort {
  kind: 'cardsort'
  groups: CardsortGroup[]
  feedback: string
}

export interface MatchingResponse {
  id: string
  text: string
}

export interface MatchingPremise {
  id: string
  text: string
  /** Ids of the responses this premise matches. */
  refs: string[]
}

export interface Matching {
  kind: 'matching'
  premises: MatchingPremise[]
  responses: MatchingResponse[]
  feedback: string
}

export interface Clickable {
  kind: 'clickable'
  /** When true, `content` is source code (one <cline> per line). */
  code: boolean
  language: string
  /** Text with <area> elements marking the clickable runs. */
  content: string
  feedback: string
}

export interface FillInTest {
  id: string
  correct: boolean
  comparison: 'strcmp' | 'numcmp'
  useAnswer: boolean
  pattern: string
  caseInsensitive: boolean
  literal: boolean
  strip: boolean
  value: string
  tolerance: string
  min: string
  max: string
  feedback: string
}

export interface Blank {
  id: string
  answer: string
  mode: 'string' | 'number'
  width: string
  name: string
  tests: FillInTest[]
}

export interface FillIn {
  kind: 'fillin'
  blanks: Blank[]
}

export interface Coding {
  kind: 'coding'
  language: string
  code: string
  tests: string
}

export interface ShortAnswer {
  kind: 'shortanswer'
  attachment: boolean
}

export type Body =
  | TrueFalse
  | MultipleChoice
  | Parsons
  | HorizontalParsons
  | Cardsort
  | Matching
  | Clickable
  | FillIn
  | Coding
  | ShortAnswer

export type BodyOf<K extends Kind> = Extract<Body, { kind: K }>

export interface Exercise {
  common: Common
  body: Body
}

export const emptyCommon = (): Common => ({
  title: '',
  label: '',
  index: '',
  statement: '',
  hints: [],
  answer: '',
  solution: '',
})

export const emptyChoice = (): Choice => ({ id: newId(), statement: '', feedback: '', correct: false })
export const emptyBlock = (): Block => ({
  id: newId(),
  content: '',
  distractor: false,
  alternatives: [],
  name: '',
  depends: [],
})
export const emptyInlineBlock = (): InlineBlock => ({ id: newId(), content: '', distractor: false })
export const emptyPremise = (): Premise => ({ id: newId(), text: '' })
export const emptyGroup = (): CardsortGroup => ({ id: newId(), response: '', premises: [emptyPremise()] })
export const emptyMatchingPremise = (): MatchingPremise => ({ id: newId(), text: '', refs: [] })
export const emptyMatchingResponse = (): MatchingResponse => ({ id: newId(), text: '' })

export const emptyTest = (comparison: FillInTest['comparison'] = 'strcmp'): FillInTest => ({
  id: newId(),
  correct: false,
  comparison,
  useAnswer: false,
  pattern: '',
  caseInsensitive: false,
  literal: false,
  strip: true,
  value: '',
  tolerance: '',
  min: '',
  max: '',
  feedback: '',
})

export const emptyBlank = (mode: Blank['mode'] = 'string'): Blank => ({
  id: newId(),
  answer: '',
  mode,
  width: '',
  name: '',
  tests: [
    {
      ...emptyTest(mode === 'number' ? 'numcmp' : 'strcmp'),
      correct: true,
      useAnswer: true,
    },
  ],
})

export type Bodies = { [K in Kind]: BodyOf<K> }

export const emptyBodies = (): Bodies => ({
  truefalse: { kind: 'truefalse', correct: true, feedback: '' },
  multiplechoice: {
    kind: 'multiplechoice',
    randomize: false,
    multipleCorrect: false,
    cols: '',
    choices: [{ ...emptyChoice(), correct: true }, emptyChoice(), emptyChoice()],
  },
  parsons: {
    kind: 'parsons',
    language: 'natural',
    numbered: 'no',
    indentation: 'show',
    adaptive: false,
    shuffle: true,
    partialOrder: false,
    blocks: [emptyBlock(), emptyBlock(), emptyBlock()],
  },
  horizontalparsons: {
    kind: 'horizontalparsons',
    language: 'natural',
    randomize: true,
    reuse: false,
    blocks: [emptyInlineBlock(), emptyInlineBlock(), emptyInlineBlock()],
    tests: '',
    database: '',
  },
  cardsort: { kind: 'cardsort', groups: [emptyGroup(), emptyGroup()], feedback: '' },
  matching: {
    kind: 'matching',
    premises: [emptyMatchingPremise(), emptyMatchingPremise()],
    responses: [emptyMatchingResponse(), emptyMatchingResponse()],
    feedback: '',
  },
  clickable: { kind: 'clickable', code: false, language: '', content: '', feedback: '' },
  fillin: { kind: 'fillin', blanks: [] },
  coding: { kind: 'coding', language: 'python', code: '', tests: '' },
  shortanswer: { kind: 'shortanswer', attachment: false },
})
