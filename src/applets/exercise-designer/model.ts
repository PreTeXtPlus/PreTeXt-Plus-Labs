export const kinds = [
  'truefalse',
  'multiplechoice',
  'parsons',
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
  choices: Choice[]
}

export interface Block {
  id: string
  /** Markup for natural language, plain source lines for code. */
  content: string
  distractor: boolean
}

export interface Parsons {
  kind: 'parsons'
  /** "natural" or a programming language name. */
  language: string
  layout: 'vertical' | 'horizontal'
  numbered: 'no' | 'left' | 'right'
  indentation: 'show' | 'hide'
  adaptive: boolean
  randomize: boolean
  blocks: Block[]
}

export interface Match {
  id: string
  premise: string
  response: string
}

export interface Matching {
  kind: 'matching'
  matches: Match[]
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
  statement: '',
  hints: [],
  answer: '',
  solution: '',
})

export const emptyChoice = (): Choice => ({ id: newId(), statement: '', feedback: '', correct: false })
export const emptyBlock = (): Block => ({ id: newId(), content: '', distractor: false })
export const emptyMatch = (): Match => ({ id: newId(), premise: '', response: '' })

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
    choices: [{ ...emptyChoice(), correct: true }, emptyChoice(), emptyChoice()],
  },
  parsons: {
    kind: 'parsons',
    language: 'natural',
    layout: 'vertical',
    numbered: 'no',
    indentation: 'show',
    adaptive: false,
    randomize: false,
    blocks: [emptyBlock(), emptyBlock(), emptyBlock()],
  },
  matching: { kind: 'matching', matches: [emptyMatch(), emptyMatch(), emptyMatch()], feedback: '' },
  clickable: { kind: 'clickable', code: false, language: '', content: '', feedback: '' },
  fillin: { kind: 'fillin', blanks: [] },
  coding: { kind: 'coding', language: 'python', code: '', tests: '' },
  shortanswer: { kind: 'shortanswer', attachment: false },
})
