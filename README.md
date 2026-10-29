# PreTeXt.Plus Labs

Experimental tools for PreTeXt-related projects: a small site for writing and demoing applets.

Built with React, TypeScript, Vite, React Router, and Tailwind CSS.

## Development

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run lint
npm test         # run unit tests (Vitest)
```

The TikZ Image applet compiles TikZ in the browser with [TikZJax](https://github.com/drgrice1/tikzjax). Its files are served from `node_modules/@drgrice1/tikzjax/dist` at `/tikzjax/` (see `vite.config.ts`).

## Adding an applet

1. Create `src/applets/<slug>/MyApplet.tsx` with a default-exported component.
2. Add an entry to `src/applets/registry.ts`:

   ```ts
   {
     slug: 'my-applet',
     title: 'My Applet',
     description: 'What it does.',
     component: lazy(() => import('./my-applet/MyApplet.tsx')),
   },
   ```

The applet appears on the index page and is served at `/apps/<slug>`.
