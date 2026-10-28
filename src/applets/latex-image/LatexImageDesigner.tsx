import { useMemo, useState } from 'react'
import { buttonClass, Checkbox, Field, inputClass, Section, TextInput } from '../exercise-designer/components/fields.tsx'
import { availablePackages, emptyImage, sample, type LatexImage } from './model.ts'
import { preambleXml, toPretext } from './serialize.ts'
import TikzPreview from './TikzPreview.tsx'
import { standaloneSvg } from './tikzjax.ts'
import { useDraft } from './useDraft.ts'

function save(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function LatexImageDesigner() {
  const [image, setImage] = useDraft()
  const [tab, setTab] = useState<'preview' | 'pretext'>('preview')
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)
  const [copied, setCopied] = useState(false)

  const xml = useMemo(() => toPretext(image), [image])
  const docinfo = useMemo(() => preambleXml(image), [image])
  const basename = image.label.trim() || 'latex-image'

  const set = (patch: Partial<LatexImage>) => setImage((img) => ({ ...img, ...patch }))
  const togglePackage = (p: string, on: boolean) =>
    setImage((img) => ({ ...img, packages: on ? [...img.packages, p] : img.packages.filter((q) => q !== p) }))

  const loadSample = () => {
    if (!image.source.trim() || confirm('Replace the current image with the sample?')) setImage(sample())
  }
  const reset = () => {
    if (confirm('Clear the image and its settings?')) setImage(emptyImage())
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const downloadSvg = async () => {
    if (svg) save(await standaloneSvg(svg), 'image/svg+xml', `${basename}.svg`)
  }

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium ${active ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={buttonClass} onClick={loadSample}>
          Load sample
        </button>
        <button type="button" className={buttonClass} onClick={reset}>
          Reset
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Section title="LaTeX">
            <Field label="Source" help="The body of the image, usually a tikzpicture environment. TikZ is always loaded.">
              <textarea
                value={image.source}
                rows={16}
                spellCheck={false}
                onChange={(e) => set({ source: e.target.value })}
                placeholder={'\\begin{tikzpicture}\n  \\draw (0,0) circle (1);\n\\end{tikzpicture}'}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <TextInput label="Label" value={image.label} onChange={(label) => set({ label })} mono help="Optional. Used for the label attribute and download filenames." />
          </Section>

          <Section title="Preamble">
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">Packages</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {availablePackages.map((p) => (
                  <Checkbox key={p} label={<code>{p}</code>} checked={image.packages.includes(p)} onChange={(on) => togglePackage(p, on)} />
                ))}
              </div>
            </fieldset>
            <TextInput
              label="TikZ libraries"
              value={image.libraries}
              onChange={(libraries) => set({ libraries })}
              placeholder="arrows.meta, calc, positioning"
              mono
              help="Comma-separated, as for \usetikzlibrary."
            />
            <Field label="Other preamble" help="Macros and settings, such as \pgfplotsset{compat=1.18}.">
              <textarea
                value={image.preamble}
                rows={3}
                spellCheck={false}
                onChange={(e) => set({ preamble: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </Field>
          </Section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-2">
              <div role="tablist" className="flex">
                <button type="button" role="tab" aria-selected={tab === 'preview'} className={tabClass(tab === 'preview')} onClick={() => setTab('preview')}>
                  Preview
                </button>
                <button type="button" role="tab" aria-selected={tab === 'pretext'} className={tabClass(tab === 'pretext')} onClick={() => setTab('pretext')}>
                  PreTeXt
                </button>
              </div>
              <div className="flex gap-2 py-1.5">
                {tab === 'preview' ? (
                  <button type="button" className={buttonClass} onClick={downloadSvg} disabled={!svg}>
                    Download SVG
                  </button>
                ) : (
                  <>
                    <button type="button" className={buttonClass} onClick={copy}>
                      {copied ? 'Copied!' : 'Copy XML'}
                    </button>
                    <button type="button" className={buttonClass} onClick={() => save(xml + '\n', 'application/xml', `${basename}.ptx`)}>
                      Download
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* The preview stays mounted so switching tabs does not recompile. */}
            <div className={tab === 'preview' ? 'p-3' : 'hidden'}>
              <TikzPreview image={image} onSvg={setSvg} />
            </div>
            {tab === 'pretext' && (
              <div className="max-h-[75vh] space-y-4 overflow-auto p-4">
                <pre className="font-mono text-xs leading-relaxed whitespace-pre">{xml}</pre>
                {docinfo && (
                  <div className="space-y-1 border-t border-slate-200 pt-3">
                    <p className="text-xs text-slate-500">
                      The image also needs this preamble, in your document's <code>&lt;docinfo&gt;</code>:
                    </p>
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre">{docinfo}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
