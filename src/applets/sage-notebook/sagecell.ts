import type { Language } from './model.ts'

const SAGECELL_SCRIPT = 'https://sagecell.sagemath.org/static/embedded_sagecell.js'

/** The CodeMirror 5 editor SageMathCell puts in each cell. */
interface CodeMirrorEditor {
  getValue(): string
  on(event: 'change', handler: (editor: CodeMirrorEditor) => void): void
}

export interface CellInfo {
  editorData?: Partial<CodeMirrorEditor>
}

interface Sagecell {
  makeSagecell(args: {
    inputLocation: Element
    code: string
    /** Cells with the same key share a kernel. */
    linkKey: string
    languages: Language[]
    evalButtonText?: string
    hide?: string[]
    callback?: () => void
  }): CellInfo
  kernels?: ({ kill?: () => void } | null)[]
  linkKeys?: Record<string, number>
}

declare global {
  interface Window {
    sagecell?: Sagecell
  }
}

// Loaded on first use.
let loading: Promise<Sagecell> | undefined
export const loadSagecell = () =>
  (loading ??= new Promise<Sagecell>((resolve, reject) => {
    const fail = () => {
      loading = undefined
      reject(new Error('Could not load SageMathCell from sagecell.sagemath.org.'))
    }
    const script = document.createElement('script')
    script.src = SAGECELL_SCRIPT
    script.onload = () => (window.sagecell ? resolve(window.sagecell) : fail())
    script.onerror = fail
    document.head.append(script)
  }))

/** Stop the kernel shared by the cells made with this key, if it was started. */
export function killKernel(linkKey: string) {
  const sagecell = window.sagecell
  const index = sagecell?.linkKeys?.[linkKey]
  if (index === undefined || !sagecell?.kernels) return
  try {
    sagecell.kernels[index]?.kill?.()
  } catch {
    // The kernel was already gone.
  }
  sagecell.kernels[index] = null
}
