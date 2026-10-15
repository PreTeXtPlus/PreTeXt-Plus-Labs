import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setCount((c) => c - 1)}
        className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
      >
        −
      </button>
      <span className="w-12 text-center text-2xl font-semibold tabular-nums">{count}</span>
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100"
      >
        +
      </button>
    </div>
  )
}
