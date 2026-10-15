import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export interface Applet {
  /** URL segment: the applet is served at /apps/<slug> */
  slug: string
  title: string
  description: string
  component: LazyExoticComponent<ComponentType>
}

export const applets: Applet[] = [
  // {
  //   slug: 'hello-world',
  //   title: 'Hello World',
  //   description: 'A minimal applet to copy when starting a new one.',
  //   component: lazy(() => import('./hello-world/HelloWorld.tsx')),
  // },
  // {
  //   slug: 'counter',
  //   title: 'Counter',
  //   description: 'A small interactive demo using React state.',
  //   component: lazy(() => import('./counter/Counter.tsx')),
  // },
  {
    slug: 'exercises',
    title: 'Exercise Designer',
    description: 'Author the content of PreTeXt interactive exercises and export the XML.',
    component: lazy(() => import('./exercise-designer/ExerciseDesigner.tsx')),
  },
]
