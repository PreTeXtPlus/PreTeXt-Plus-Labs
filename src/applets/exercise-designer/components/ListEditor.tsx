import type { ReactNode } from 'react'
import { buttonClass } from './fields.tsx'

const iconButton = 'rounded px-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30'

/** Editable list of items with add, remove and reorder controls. */
export default function ListEditor<T extends { id: string }>({
  items,
  onChange,
  create,
  addLabel,
  itemTitle,
  renderItem,
}: {
  items: T[]
  onChange: (items: T[]) => void
  create: () => T
  addLabel: string
  itemTitle: (index: number) => string
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
}) {
  const move = (from: number, to: number) => {
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{itemTitle(i)}</span>
            <span className="flex gap-1 text-sm">
              <button type="button" className={iconButton} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                ↑
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={i === items.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                aria-label="Remove"
              >
                ✕
              </button>
            </span>
          </div>
          <div className="space-y-3">
            {renderItem(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))), i)}
          </div>
        </div>
      ))}
      <button type="button" className={buttonClass} onClick={() => onChange([...items, create()])}>
        + {addLabel}
      </button>
    </div>
  )
}
