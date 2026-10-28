import { useEffect, useState } from 'react'
import { emptyImage, environmentNames, sample, type TikzImage } from './model.ts'

// Bump the version when the model changes shape, so stale drafts are ignored.
const KEY = 'latex-image:draft:v2'

function load(): TikzImage {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && typeof saved.body === 'string' && environmentNames.includes(saved.environment) && Array.isArray(saved.packages)) return { ...emptyImage(), ...saved }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return sample()
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
