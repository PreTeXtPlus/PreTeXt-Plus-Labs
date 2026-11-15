import { ipynbObject, parseIpynb } from './ipynb.ts'
import type { Notebook } from './model.ts'

async function pipe(bytes: Uint8Array<ArrayBuffer>, transform: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** The notebook, as ipynb JSON, deflated and base64url-encoded for a URL fragment. */
export async function encodeShare(notebook: Notebook): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(ipynbObject(notebook)))
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))
}

export async function decodeShare(encoded: string): Promise<Notebook> {
  let json: string
  try {
    json = new TextDecoder().decode(await pipe(fromBase64Url(encoded), new DecompressionStream('deflate-raw')))
  } catch {
    throw new Error('This share link is damaged or incomplete.')
  }
  return parseIpynb(json)
}

/**
 * Where to fetch a notebook from: GitHub and gist page links are rewritten
 * to their raw files, which can be fetched from another site.
 */
export function remoteUrl(input: string): string {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error('That is not a URL.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('The URL must start with https://.')

  const parts = url.pathname.split('/').filter(Boolean)
  if (url.hostname === 'github.com' && parts[2] === 'blob' && parts.length > 4) {
    const [user, repo, , ...rest] = parts
    return `https://raw.githubusercontent.com/${user}/${repo}/${rest.join('/')}`
  }
  if (url.hostname === 'gist.github.com' && parts.length === 2) return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`
  return url.href
}

export async function fetchNotebook(input: string): Promise<Notebook> {
  const url = remoteUrl(input)
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('Could not fetch the notebook. Its host must allow requests from other sites (GitHub and gists do).')
  }
  if (!res.ok) throw new Error(`Could not fetch the notebook (HTTP ${res.status}).`)
  return parseIpynb(await res.text(), decodeURIComponent(new URL(url).pathname.split('/').pop() ?? ''))
}
