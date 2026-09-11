# Portfolio

My personal site. The home page is a 3D ring you spin with the scroll or by
dragging; each face of it opens a different section.

Astro, Three.js, GSAP and Lenis. No UI framework, no client router.

## Sections

- **Work**: projects and jobs.
- **Craft**: a vestibule with two doors — Programming, which lists what I've
  built in code, and Creativity, for everything made away from a keyboard.
- **Photos**: photos I've taken, laid out on a canvas you can drag around in
  any direction.
- **About**: games, music, and the rest of it.
- **Now**: what I'm doing at the moment, with the date I last touched it.

## A few things that took longer than they look

**The photo handoff.** The dive into the Photos face ends on a full-screen
image, and /photos opens on that same image. Both pages ask for it through the
same build step, so it's one file and it's already in the cache by the time the
page changes.

**The motion gate.** Before anything animates, the site asks whether you want
motion, and that answer is what the rest of the code checks. It asks again on a
reload or a fresh visit, and only skips the question when you're coming back
from another page on the site.

**Image cleanup.** Importing photos through Astro's asset pipeline also emits
the untouched originals, which came to roughly 22 MB of camera JPEGs that
nothing on the site ever requested. A small build plugin deletes any image in
the output whose filename doesn't appear anywhere in the build.

**Locked routes.** A few URLs have been shared outside the site, so they can't
move. They're listed in `scripts/rotas-travadas.mjs` and the build fails if one
of them doesn't show up in the output.

## Running it

```bash
npm install
npm run dev
```

Node 22.12 or newer. `npm run build` writes the static site to `dist/`.

## About the code

The comments are in Portuguese, and they're mostly about why something is the
way it is rather than what it does. If a piece of code looks strange, the
comment above it usually explains which bug or trade-off put it there.
