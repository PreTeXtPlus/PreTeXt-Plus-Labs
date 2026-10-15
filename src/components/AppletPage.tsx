import { Suspense } from 'react'
import { Link } from 'react-router'
import type { Applet } from '../applets/registry.ts'

export default function AppletPage({ applet }: { applet: Applet }) {
  const Component = applet.component

  return (
    <article>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        ← More experiments
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{applet.title}</h1>
      <p className="mt-1 text-slate-600">{applet.description}</p>
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <Component />
        </Suspense>
      </section>
    </article>
  )
}
