/** Where the TikZJax dist/ is served (see vite.config.ts). */
export const TIKZJAX_BASE = `${import.meta.env.BASE_URL}tikzjax/`

// Loaded on first use: TikZJax then watches the page for <script type="text/tikz"> elements.
let loading: Promise<void> | undefined
export const loadTikzjax = () =>
  (loading ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${TIKZJAX_BASE}fonts.css`
    document.head.append(link)

    const script = document.createElement('script')
    script.src = `${TIKZJAX_BASE}tikzjax.js`
    script.onload = () => resolve()
    script.onerror = () => {
      loading = undefined
      reject(new Error('Could not load TikZJax.'))
    }
    document.head.append(script)
  }))

const SVG_NS = 'http://www.w3.org/2000/svg'

async function fontFace(family: string): Promise<string | null> {
  try {
    const res = await fetch(`${TIKZJAX_BASE}fonts/${family}.woff2`)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    return `@font-face { font-family: ${family}; src: url(data:font/woff2;base64,${btoa(binary)}) format('woff2'); }`
  } catch {
    return null
  }
}

/**
 * The rendered image as a standalone SVG file. TikZJax's SVGs draw text in
 * web fonts loaded by the page, so the fonts used are embedded.
 */
export async function standaloneSvg(svg: SVGSVGElement): Promise<string> {
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns', SVG_NS)
  copy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  const families = new Set<string>()
  for (const el of copy.querySelectorAll('[font-family]')) {
    const family = el.getAttribute('font-family')
    if (family && /^[\w-]+$/.test(family)) families.add(family)
  }
  const faces = (await Promise.all([...families].map(fontFace))).filter(Boolean)
  if (faces.length) {
    const defs = document.createElementNS(SVG_NS, 'defs')
    const style = document.createElementNS(SVG_NS, 'style')
    style.textContent = faces.join('\n')
    defs.append(style)
    copy.prepend(defs)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}\n`
}

/** Points (TikZJax sizes its SVGs in pt) at 300 DPI. */
const PX_PER_PT = 300 / 72

/** The rendered image as a 300 DPI PNG with a transparent background. */
export async function pngBlob(svg: SVGSVGElement): Promise<Blob> {
  const width = Math.ceil(parseFloat(svg.getAttribute('width') ?? '') * PX_PER_PT)
  const height = Math.ceil(parseFloat(svg.getAttribute('height') ?? '') * PX_PER_PT)
  if (!(width > 0 && height > 0)) throw new Error('The image has no size.')

  // Rasterize the standalone SVG, so its embedded fonts are used.
  const url = URL.createObjectURL(new Blob([await standaloneSvg(svg)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the PNG.'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
