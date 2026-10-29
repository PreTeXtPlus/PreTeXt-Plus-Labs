import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // TikZJax locates its worker, TeX core and fonts relative to its own script,
    // so its dist/ is served as-is at /tikzjax/.
    viteStaticCopy({
      targets: [{ src: 'node_modules/@drgrice1/tikzjax/dist/**/*', dest: 'tikzjax', rename: { stripBase: 4 } }],
    }),
  ],
  // @pretextbook/pretext-html's WASM worker uses top-level await.
  worker: { format: 'es' },
})
