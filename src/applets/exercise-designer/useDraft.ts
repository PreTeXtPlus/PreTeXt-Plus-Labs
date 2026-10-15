import { useEffect, useState } from 'react'
import { emptyBodies, emptyCommon, kinds, type Bodies, type Common, type Kind } from './model.ts'

/** The designer keeps every type's body, so switching types does not lose work. */
export interface Draft {
  kind: Kind
  common: Common
  bodies: Bodies
}

// Bump the version when the model changes shape, so stale drafts are ignored.
const KEY = 'exercise-designer:draft:v2'

export const emptyDraft = (): Draft => ({ kind: 'multiplechoice', common: emptyCommon(), bodies: emptyBodies() })

function load(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && kinds.includes(saved.kind) && saved.common && saved.bodies) {
      const empty = emptyDraft()
      return { kind: saved.kind, common: { ...empty.common, ...saved.common }, bodies: { ...empty.bodies, ...saved.bodies } }
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return emptyDraft()
}

export function useDraft() {
  const [draft, setDraft] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(draft))
    } catch {
      // Storage unavailable: the draft just won't persist.
    }
  }, [draft])

  return [draft, setDraft] as const
}
