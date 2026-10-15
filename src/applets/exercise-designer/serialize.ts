import type { Blank, Body, Common, Exercise, FillInTest } from './model.ts'

type Attrs = Record<string, string | false | undefined>
interface XElement {
  tag: string
  attrs: Attrs
  children: XNode[]
}
interface XRaw {
  raw: string
}
type XNode = XElement | XRaw

const raw = (s: string): XRaw => ({ raw: s })
const el = (tag: string, attrs: Attrs = {}, ...children: (XNode | null | false)[]): XElement => ({
  tag,
  attrs,
  children: children.filter((c): c is XNode => !!c),
})

export const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;')

/** Content that starts with one of these is already block-level and is not wrapped in <p>. */
export const BLOCK_START =
  /^<(p|md|mdn|me|men|ol|ul|dl|pre|blockquote|figure|image|tabular|table|program|console|sidebyside|sbsgroup|listing|cd|sage|video|interactive)\b/

/** A PreTeXt markup field as children: block content passes through, plain text becomes <p>s. */
function markup(s: string): XNode[] {
  const t = s.trim()
  if (!t) return []
  if (BLOCK_START.test(t)) return [raw(t)]
  return t
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .map((chunk) => (BLOCK_START.test(chunk) ? raw(chunk) : el('p', {}, raw(chunk))))
}

const optMarkup = (tag: string, s: string) => (s.trim() ? el(tag, {}, ...markup(s)) : null)
const inline = (tag: string, s: string) => el(tag, {}, raw(s.trim()))
const codeLines = (s: string) => s.replace(/\s+$/, '').split('\n')

export const FILLIN_RE = /<fillin\b[^>]*?\/>/g
const AREA_TAG_RE = /(<area\b[^>]*>|<\/area>)/

/** Escape a line of code while keeping its <area> tags. */
const escapeExceptAreas = (line: string) =>
  line
    .split(AREA_TAG_RE)
    .map((part) => (AREA_TAG_RE.test(part) ? part : escapeText(part)))
    .join('')

const nonEmpty = (s: string) => s.trim() || undefined

function fillinTag(blank: Blank | undefined) {
  if (!blank) return '<fillin/>'
  return render(
    el('fillin', {
      mode: blank.mode,
      answer: blank.answer,
      width: nonEmpty(blank.width),
      name: nonEmpty(blank.name),
    }),
    '',
  )
}

function testNode(t: FillInTest): XElement {
  let cmp: XElement
  if (t.comparison === 'numcmp') {
    cmp = t.useAnswer
      ? el('numcmp', { 'use-answer': 'yes' })
      : el('numcmp', {
          value: nonEmpty(t.value),
          tolerance: nonEmpty(t.tolerance),
          min: nonEmpty(t.min),
          max: nonEmpty(t.max),
        })
  } else {
    const attrs: Attrs = {
      'use-answer': t.useAnswer && 'yes',
      case: t.caseInsensitive && 'insensitive',
      literal: !t.useAnswer && t.literal && 'yes',
      strip: !t.strip && 'no',
    }
    cmp = t.useAnswer ? el('strcmp', attrs) : el('strcmp', attrs, raw(escapeText(t.pattern)))
  }
  return el('test', { correct: t.correct && 'yes' }, cmp, optMarkup('feedback', t.feedback))
}

function bodyParts(b: Body): { attrs: Attrs; afterStatement: (XNode | null)[] } {
  switch (b.kind) {
    case 'truefalse':
      return { attrs: {}, afterStatement: [optMarkup('feedback', b.feedback)] }
    case 'multiplechoice':
      return {
        attrs: {},
        afterStatement: [
          el(
            'choices',
            { randomize: b.randomize && 'yes' },
            ...b.choices.map((c) =>
              el(
                'choice',
                { correct: c.correct && 'yes' },
                el('statement', {}, ...markup(c.statement)),
                optMarkup('feedback', c.feedback),
              ),
            ),
          ),
        ],
      }
    case 'parsons': {
      const isCode = b.language !== 'natural'
      const horizontal = b.layout === 'horizontal'
      return {
        attrs: {
          language: isCode && b.language,
          numbered: b.numbered !== 'no' && b.numbered,
          indentation: isCode && b.indentation === 'hide' && 'hide',
          adaptive: b.adaptive && 'yes',
        },
        afterStatement: [
          el(
            'blocks',
            { layout: horizontal && 'horizontal', randomize: horizontal && b.randomize && 'yes' },
            ...b.blocks.map((block) =>
              el(
                'block',
                { correct: block.distractor && 'no' },
                ...(isCode
                  ? codeLines(block.content).map((line) => el('cline', {}, raw(escapeText(line))))
                  : markup(block.content)),
              ),
            ),
          ),
        ],
      }
    }
    case 'matching':
      return {
        attrs: {},
        afterStatement: [
          el(
            'matches',
            {},
            ...b.matches.map((m) => el('match', {}, inline('premise', m.premise), inline('response', m.response))),
          ),
          optMarkup('feedback', b.feedback),
        ],
      }
    case 'clickable':
      return {
        attrs: {},
        afterStatement: [
          el(
            'areas',
            { language: b.code && nonEmpty(b.language) },
            ...(b.code
              ? codeLines(b.content).map((line) => el('cline', {}, raw(escapeExceptAreas(line))))
              : markup(b.content)),
          ),
          optMarkup('feedback', b.feedback),
        ],
      }
    case 'fillin':
      return {
        attrs: {},
        afterStatement: [
          el(
            'evaluation',
            {},
            ...b.blanks.map((blank) => el('evaluate', { name: nonEmpty(blank.name) }, ...blank.tests.map(testNode))),
          ),
        ],
      }
    case 'coding':
      return {
        attrs: {},
        afterStatement: [
          el(
            'program',
            { language: nonEmpty(b.language), interactive: 'activecode' },
            b.code.trim() ? el('code', {}, raw(escapeText(b.code.replace(/\s+$/, '')))) : null,
            b.tests.trim() ? el('tests', {}, raw(escapeText(b.tests.replace(/\s+$/, '')))) : null,
          ),
        ],
      }
    case 'shortanswer':
      return { attrs: { attachment: b.attachment && 'yes' }, afterStatement: [el('response')] }
  }
}

/** Fill in the attributes of each <fillin/> in the statement from the matching blank. */
export function applyBlanks(statement: string, blanks: Blank[]) {
  let i = 0
  return statement.replace(FILLIN_RE, () => fillinTag(blanks[i++]))
}

function statementNode(c: Common, b: Body) {
  const text = b.kind === 'fillin' ? applyBlanks(c.statement, b.blanks) : c.statement
  const attrs: Attrs = b.kind === 'truefalse' ? { correct: b.correct ? 'yes' : 'no' } : {}
  return el('statement', attrs, ...markup(text))
}

export function toXml({ common: c, body: b }: Exercise): string {
  const { attrs, afterStatement } = bodyParts(b)
  const root = el(
    'exercise',
    { label: nonEmpty(c.label), ...attrs },
    c.title.trim() ? inline('title', c.title) : null,
    statementNode(c, b),
    ...afterStatement,
    ...c.hints.map((h) => optMarkup('hint', h.text)),
    optMarkup('answer', c.answer),
    optMarkup('solution', c.solution),
  )
  return render(root, '')
}

function render(node: XNode, indent: string): string {
  if ('raw' in node) {
    return node.raw
      .split('\n')
      .map((line) => (line.trim() ? indent + line : ''))
      .join('\n')
  }
  const attrs = Object.entries(node.attrs)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('')
  const open = `${indent}<${node.tag}${attrs}`
  const [only] = node.children
  if (!only) return `${open}/>`
  if (node.children.length === 1 && 'raw' in only && !only.raw.includes('\n')) {
    return `${open}>${only.raw}</${node.tag}>`
  }
  return [`${open}>`, ...node.children.map((c) => render(c, indent + '  ')), `${indent}</${node.tag}>`].join('\n')
}

/** Returns a parser error message if the markup fragment is not well-formed XML, else null. */
export function checkWellFormed(fragment: string): string | null {
  if (!fragment.includes('<') && !fragment.includes('&')) return null
  const doc = new DOMParser().parseFromString(`<root>${fragment}</root>`, 'application/xml')
  const error = doc.getElementsByTagName('parsererror')[0]
  if (!error) return null
  const text = (error.textContent ?? '').trim()
  return text.split('\n').find((line) => line.trim() && !/^This page contains/.test(line))?.trim() ?? 'Malformed XML'
}
