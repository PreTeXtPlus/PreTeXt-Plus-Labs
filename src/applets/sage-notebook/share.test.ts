import { describe, expect, it } from 'vitest'
import { parseIpynb, toIpynb } from './ipynb.ts'
import { sampleNotebook } from './model.ts'
import { decodeShare, encodeShare, remoteUrl } from './share.ts'

describe('share links', () => {
  it('round-trip a notebook through URL-safe text', async () => {
    const nb = { ...sampleNotebook(), title: 'Ünïcode ∫ title' }
    const encoded = await encodeShare(nb)
    expect(encoded).toMatch(/^[\w-]+$/)
    expect(await decodeShare(encoded)).toEqual(parseIpynb(toIpynb(nb)))
  })

  it('compress', async () => {
    const nb = sampleNotebook()
    expect((await encodeShare(nb)).length).toBeLessThan(toIpynb(nb).length)
  })

  it('reject damaged links', async () => {
    await expect(decodeShare('AAAA')).rejects.toThrow(/damaged/)
    await expect(decodeShare('%%%')).rejects.toThrow(/damaged/)
  })
})

describe('remoteUrl', () => {
  it('rewrites GitHub and gist pages to raw files', () => {
    expect(remoteUrl('https://github.com/user/repo/blob/main/dir/nb.ipynb')).toBe('https://raw.githubusercontent.com/user/repo/main/dir/nb.ipynb')
    expect(remoteUrl('https://gist.github.com/user/abc123')).toBe('https://gist.githubusercontent.com/user/abc123/raw')
  })

  it('leaves other URLs alone', () => {
    expect(remoteUrl(' https://example.org/a.ipynb ')).toBe('https://example.org/a.ipynb')
  })

  it('rejects other input', () => {
    expect(() => remoteUrl('nb.ipynb')).toThrow()
    expect(() => remoteUrl('javascript:alert(1)')).toThrow()
  })
})
