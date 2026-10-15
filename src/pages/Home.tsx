import { Link } from 'react-router'
import { applets } from '../applets/registry.ts'

export default function Home() {
  return (
    <>
      <h1 className="text-3xl font-bold">Labs</h1>
      <p className="mt-1 text-slate-600">Experiemental apps for use with PreTeXt-related projects.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {applets.map((applet) => (
          <li key={applet.slug}>
            <Link
              to={`/apps/${applet.slug}`}
              className="block h-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow"
            >
              <h2 className="font-semibold">{applet.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{applet.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
