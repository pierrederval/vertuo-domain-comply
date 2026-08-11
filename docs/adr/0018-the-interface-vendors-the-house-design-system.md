# ADR-0018: The interface vendors the house design system

Status: Accepted. Supersedes ADR-0013's *Interface* row. Every other row of ADR-0013 stands.

ADR-0013 committed the interface to "the shared design-system package". The design for the read-only
Studio then found that package unreachable — no registry, no such dependency in the workspace — and
recorded a thin local layer of components over CSS custom properties as a deviation *forced by
availability*, naming Tailwind and Radix as "a second deviation that also has to be undone".

The premise is false. There is no shared design-system package, and there is no registry it is waiting
behind.

- `vertuo-front` vendors shadcn components into `src/components/ui` behind a `components.json`.
- `vertuo-playground-ai`'s `libs/system-ui` describes itself as mirrored from `vertuo-front`'s
  `ui/sidebar`, and is a workspace library rather than a published package.

The house design system is a **convention that each repository vendors**, and that convention is
Tailwind plus shadcn primitives. So ADR-0013's *Interface* row does not name a dependency that will
arrive later; it names a thing that does not exist in the form the row assumes. Meanwhile the deviation
recorded against Tailwind forbids, as a thing to be undone, precisely what every neighbouring repository
does.

## The decision

**The Studio's interface layer is Tailwind v4 with shadcn primitives vendored into the app.**

| Concern | Choice |
| --- | --- |
| Styling | Tailwind v4, tokens declared in `@theme` |
| Components | shadcn primitives, vendored into `apps/comply-studio/src/components/ui` behind a `components.json` |
| Composition | `class-variance-authority`, `clsx`, `tailwind-merge` — what those components are written against |
| Icons | `lucide-react` |
| Behaviour | the Radix packages the vendored components require, and nothing beyond them |

Vendored rather than depended upon, because there is nothing to depend upon. This is not a workaround
for a missing registry; it is what the two neighbouring repositories do, and doing something else here
would be the deviation.

## Why not keep the thin local layer

It was the right call when the alternative was believed to be a temporary detour. It is the wrong call
against a house standard, for three reasons that compound:

The layer is not free. It is a component vocabulary this repository maintains alone, and the shell the
read-only phase now needs — a collapsible sidebar, a tab row, a trail, dropdowns, tooltips — is several
times what exists. Hand-rolling that is work spent producing something worse than what is already
written down next door.

It also cannot be swapped as cheaply as §3.7 hoped. That argument assumed a package would one day be
dropped in behind the same names. What actually happens is that somebody vendors shadcn, at which point
every bespoke component is rewritten anyway. Delaying that does not reduce the work; it adds a layer to
throw away first.

And the local layer's own tokens turn out to be the thing that survives. `--ink`, `--paper`, `--line`
map onto shadcn's `--foreground`, `--background`, `--border` directly. §3.7's reasoning — that tokens
could be dropped in behind these names without touching a component — was correct. This ADR is that
swap; it is only the components that go.

## What does not change

The laws. Nothing here weakens LAW-004 or LAW-010, and the vocabulary guards get stronger rather than
weaker:

- `checkSurfaceVocabulary` discovers its roots as the `src` directory of every workspace package, so
  **vendored components are scanned like ours**. A primitive shipping *index* or *null* in a string a
  reader could meet fails the build. The primitive set in `vertuo-playground-ai/libs/system-ui` was
  checked against all nine forbidden terms and carries none.
- LAW-004 still forbids a business word in the interface. A vendored component knows nothing about any
  corpus, which is the same guarantee the local layer gave.

## Consequences

- Vendored components are source this repository owns. Updates are manual, and that is the accepted
  cost in both neighbouring repositories.
- The components live in `apps/comply-studio`, not `libs/`. There is one consumer, and `libs/` is one
  package per bounded context — a design system is not a bounded context. Promote it if a second
  interface appears.
- shadcn's blocks bring idioms this product forbids: KPI tiles, progress rings, trend chips, and badges
  carrying bare counts. Each is a figure with its denominator removed, which is LAW-006. Having the
  primitives to hand makes that easier to break by accident, so the tests that assert no percentage and
  no score extend to cover them.
- Test assertions must not be attached to styling. Several were matched against exact class attributes,
  including the guard that exactly two figures are drawn and never a third fused one. Those move onto
  `data-*` attributes before any styling changes, or they are lost in the diff that changes it.
- The Studio grows a build step it did not have. Tailwind runs through `@tailwindcss/vite`, so it is one
  plugin and no separate pipeline.

**Revisit when** a Vertuoza design system is genuinely published to a registry both this repository and
`vertuo-front` consume. Then the vendored directory is deleted in favour of the dependency, and the
token layer is what makes that a contained change.
