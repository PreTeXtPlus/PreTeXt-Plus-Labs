import {
  emptyBodies,
  emptyCommon,
  emptyTest,
  newId,
  type Blank,
  type Body,
  type Common,
  type Exercise,
  type FillInTest,
} from './model.ts'
import { BLOCK_START, FILLIN_RE } from './serialize.ts'

const EXERCISE_LIKE = ['exercise', 'project', 'activity', 'exploration', 'investigation']
const COMMON_TAGS = ['title', 'statement', 'hint', 'answer', 'solution']

const elements = (node: Element, tag?: string) =>
  Array.from(node.children).filter((c) => !tag || c.tagName === tag)
const child = (node: Element, tag: string) => elements(node, tag)[0] as Element | undefined

/** Remove surrounding blank lines and the indentation common to the content's lines. */
function dedent(s: string) {
  const lines = s.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n')
  // A first line that starts right after the opening tag carries no source indentation.
  const measured = /^\s/.test(lines[0] ?? '') ? lines : lines.slice(1)
  const indents = measured.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length)
  const n = indents.length ? Math.min(...indents) : 0
  return lines.map((l, i) => (i === 0 && measured !== lines ? l : l.slice(n))).join('\n')
}

const serializer = () => new XMLSerializer()

function inner(node: Element, skip: string[] = []) {
  const s = serializer()
  return dedent(
    Array.from(node.childNodes)
      .filter((n) => !(n.nodeType === 1 && skip.includes((n as Element).tagName)))
      .map((n) => s.serializeToString(n))
      .join(''),
  ).trim()
}

/** Inner markup, turning plain <p>s back into blank-line-separated text where that round-trips. */
function innerMarkup(node: Element | undefined, skip: string[] = []) {
  if (!node) return ''
  const content = inner(node, skip)
  const kids = elements(node).filter((c) => !skip.includes(c.tagName))
  const strayText = Array.from(node.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())
  if (!kids.length || strayText || kids.some((k) => k.tagName !== 'p' || k.attributes.length)) return content
  const paragraphs = kids.map((p) => inner(p))
  if (paragraphs.some((p) => !p || BLOCK_START.test(p) || /\n\s*\n/.test(p))) return content
  return paragraphs.join('\n\n')
}

const codeText = (node: Element | undefined) => (node ? dedent(node.textContent ?? '') : '')

/** Rebuild a <cline> as text, keeping its <area> tags. */
function clineWithAreas(cline: Element) {
  return Array.from(cline.childNodes)
    .map((n) => {
      if (n.nodeType === 3) return n.textContent ?? ''
      const e = n as Element
      if (e.tagName !== 'area') return e.textContent ?? ''
      const correct = e.getAttribute('correct')
      return `<area${correct ? ` correct="${correct}"` : ''}>${e.textContent ?? ''}</area>`
    })
    .join('')
}

function parseTest(test: Element): FillInTest {
  const t = { ...emptyTest(), id: newId(), correct: test.getAttribute('correct') === 'yes' }
  const num = child(test, 'numcmp')
  const str = child(test, 'strcmp')
  if (num) {
    Object.assign(t, {
      comparison: 'numcmp',
      useAnswer: num.getAttribute('use-answer') === 'yes',
      value: num.getAttribute('value') ?? '',
      tolerance: num.getAttribute('tolerance') ?? '',
      min: num.getAttribute('min') ?? '',
      max: num.getAttribute('max') ?? '',
    })
  } else if (str) {
    Object.assign(t, {
      comparison: 'strcmp',
      useAnswer: str.getAttribute('use-answer') === 'yes',
      pattern: str.textContent ?? '',
      caseInsensitive: str.getAttribute('case') === 'insensitive',
      literal: str.getAttribute('literal') === 'yes',
      strip: str.getAttribute('strip') !== 'no',
    })
  }
  t.feedback = innerMarkup(child(test, 'feedback'))
  return t
}

function detectKind(ex: Element): Body['kind'] {
  if (child(ex, 'statement')?.hasAttribute('correct')) return 'truefalse'
  if (child(ex, 'choices')) return 'multiplechoice'
  if (child(ex, 'blocks')) return 'parsons'
  if (child(ex, 'matches') || child(ex, 'cardsort')) return 'matching'
  if (child(ex, 'areas')) return 'clickable'
  if (child(ex, 'evaluation') || child(ex, 'statement')?.getElementsByTagName('fillin').length) return 'fillin'
  if (child(ex, 'program')) return 'coding'
  return 'shortanswer'
}

function parseBody(ex: Element, kind: Body['kind'], warn: (msg: string) => void): { body: Body; tags: string[] } {
  const defaults = emptyBodies()
  switch (kind) {
    case 'truefalse':
      return {
        body: {
          kind,
          correct: child(ex, 'statement')!.getAttribute('correct') === 'yes',
          feedback: innerMarkup(child(ex, 'feedback')),
        },
        tags: ['feedback'],
      }
    case 'multiplechoice': {
      const choices = child(ex, 'choices')!
      return {
        body: {
          kind,
          randomize: choices.getAttribute('randomize') === 'yes',
          choices: elements(choices, 'choice').map((c) => {
            const statement = child(c, 'statement')
            return {
              id: newId(),
              correct: c.getAttribute('correct') === 'yes',
              statement: statement ? innerMarkup(statement) : innerMarkup(c, ['feedback']),
              feedback: innerMarkup(child(c, 'feedback')),
            }
          }),
        },
        tags: ['choices'],
      }
    }
    case 'parsons': {
      const blocks = child(ex, 'blocks')!
      const language = ex.getAttribute('language') ?? 'natural'
      const numbered = ex.getAttribute('numbered')
      let warnedChoices = false
      return {
        body: {
          ...defaults.parsons,
          language,
          layout: blocks.getAttribute('layout') === 'horizontal' ? 'horizontal' : 'vertical',
          numbered: numbered === 'left' || numbered === 'right' ? numbered : 'no',
          indentation: ex.getAttribute('indentation') === 'hide' ? 'hide' : 'show',
          adaptive: ex.getAttribute('adaptive') === 'yes',
          randomize: blocks.getAttribute('randomize') === 'yes',
          blocks: elements(blocks, 'block').map((block) => {
            let source = block
            const choices = elements(block, 'choice')
            if (choices.length) {
              if (!warnedChoices) warn('Blocks with <choice> alternatives are not supported; kept the correct choice.')
              warnedChoices = true
              source = choices.find((c) => c.getAttribute('correct') === 'yes') ?? choices[0]
            }
            const clines = elements(source, 'cline')
            return {
              id: newId(),
              distractor: block.getAttribute('correct') === 'no',
              content: clines.length ? clines.map((c) => c.textContent ?? '').join('\n') : innerMarkup(source),
            }
          }),
        },
        tags: ['blocks'],
      }
    }
    case 'matching': {
      const matches = child(ex, 'matches') ?? child(ex, 'cardsort')!
      return {
        body: {
          kind,
          matches: elements(matches, 'match').map((m) => ({
            id: newId(),
            premise: innerMarkup(child(m, 'premise')),
            response: innerMarkup(child(m, 'response')),
          })),
          feedback: innerMarkup(child(ex, 'feedback') ?? child(matches, 'feedback')),
        },
        tags: ['matches', 'cardsort', 'feedback'],
      }
    }
    case 'clickable': {
      const areas = child(ex, 'areas')!
      const clines = elements(areas, 'cline')
      return {
        body: {
          kind,
          code: clines.length > 0,
          language: areas.getAttribute('language') ?? '',
          content: clines.length ? clines.map(clineWithAreas).join('\n') : innerMarkup(areas),
          feedback: innerMarkup(child(ex, 'feedback')),
        },
        tags: ['areas', 'feedback'],
      }
    }
    case 'fillin': {
      const statement = child(ex, 'statement')
      const evaluation = child(ex, 'evaluation')
      if (child(ex, 'setup')) warn('Dynamic fill-ins (<setup>) are not supported; the setup was dropped.')
      const evaluates = evaluation ? elements(evaluation, 'evaluate') : []
      const fillins = statement ? Array.from(statement.getElementsByTagName('fillin')) : []
      const blanks = fillins.map((f, i): Blank => {
        const name = f.getAttribute('name') ?? ''
        const evaluate = (name && evaluates.find((e) => e.getAttribute('name') === name)) || evaluates[i]
        const tests = evaluate ? elements(evaluate, 'test') : []
        if (tests.some((t) => !child(t, 'strcmp') && !child(t, 'numcmp'))) {
          warn('Only <strcmp> and <numcmp> tests are supported; other comparisons were reset.')
        }
        return {
          id: newId(),
          answer: f.getAttribute('answer') ?? '',
          mode: f.getAttribute('mode') === 'number' ? 'number' : 'string',
          width: f.getAttribute('width') ?? '',
          name,
          tests: tests.map(parseTest),
        }
      })
      return { body: { kind, blanks }, tags: ['evaluation', 'setup'] }
    }
    case 'coding': {
      const program = child(ex, 'program')!
      const tests = child(program, 'tests')
      if (tests && child(tests, 'iotest')) warn('Input/output tests are not supported and were dropped.')
      return {
        body: {
          kind,
          language: program.getAttribute('language') ?? '',
          code: codeText(child(program, 'code') ?? (elements(program).length ? undefined : program)),
          tests: tests && !child(tests, 'iotest') ? codeText(tests) : '',
        },
        tags: ['program'],
      }
    }
    case 'shortanswer':
      return { body: { kind, attachment: ex.getAttribute('attachment') === 'yes' }, tags: ['response'] }
  }
}

/** Parse PreTeXt source for one exercise. Throws if the XML is malformed or holds no exercise. */
export function fromXml(src: string): { exercise: Exercise; warnings: string[] } {
  const cleaned = src.replace(/^\s*<\?xml[^?]*\?>/, '').replace(/<!DOCTYPE[^>]*>/i, '')
  const doc = new DOMParser().parseFromString(`<import-root>${cleaned}</import-root>`, 'application/xml')
  const error = doc.getElementsByTagName('parsererror')[0]
  if (error) throw new Error(`The XML is not well-formed: ${(error.textContent ?? '').trim().split('\n')[0]}`)

  const ex = EXERCISE_LIKE.map((tag) => doc.getElementsByTagName(tag)[0]).find(Boolean)
  if (!ex) throw new Error('No <exercise> element was found.')

  const warnings: string[] = []
  const warn = (msg: string) => warnings.includes(msg) || warnings.push(msg)
  if (ex.tagName !== 'exercise') warn(`Imported a <${ex.tagName}> as an <exercise>.`)

  const answers = elements(ex, 'answer')
  const solutions = elements(ex, 'solution')
  if (answers.length > 1) warn('Only the first <answer> was kept.')
  if (solutions.length > 1) warn('Only the first <solution> was kept.')
  const statement = child(ex, 'statement')
  let statementText = innerMarkup(statement)

  const kind = detectKind(ex)
  if (kind === 'fillin') statementText = statementText.replace(FILLIN_RE, '<fillin/>')

  const common: Common = {
    ...emptyCommon(),
    title: child(ex, 'title') ? inner(child(ex, 'title')!) : '',
    label: ex.getAttribute('label') ?? '',
    statement: statementText,
    hints: elements(ex, 'hint').map((h) => ({ id: newId(), text: innerMarkup(h) })),
    answer: innerMarkup(answers[0]),
    solution: innerMarkup(solutions[0]),
  }

  const { body, tags } = parseBody(ex, kind, warn)
  const known = [...COMMON_TAGS, ...tags]
  for (const e of elements(ex)) {
    if (!known.includes(e.tagName)) warn(`Dropped unsupported <${e.tagName}> element.`)
  }
  return { exercise: { common, body }, warnings }
}
