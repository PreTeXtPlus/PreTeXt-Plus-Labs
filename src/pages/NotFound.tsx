import { Link } from 'react-router'

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
        Back to home
      </Link>
    </div>
  )
}
