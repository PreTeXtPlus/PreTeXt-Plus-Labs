import { Link, Outlet } from 'react-router'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            PreTeXt.Plus <span className="text-indigo-600">Labs</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        Experimental tools for PreTeXt-related projects
      </footer>
    </div>
  )
}
