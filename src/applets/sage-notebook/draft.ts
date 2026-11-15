import { languages, sampleNotebook, type Notebook } from './model.ts'

// Bump the version when the model changes shape, so stale drafts are ignored.
const KEY = 'sage-notebook:draft:v1'

export function loadDraft(): Notebook {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && typeof saved.title === 'string' && languages.includes(saved.language) && Array.isArray(saved.cells)) return saved
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return sampleNotebook()
}

export function saveDraft(notebook: Notebook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(notebook))
  } catch {
    // Storage unavailable: the draft just won't persist.
  }
}
