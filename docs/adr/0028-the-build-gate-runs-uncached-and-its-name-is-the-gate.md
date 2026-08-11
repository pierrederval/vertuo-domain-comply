# ADR-0028: The build gate runs the whole suite uncached, and the job's name is what blocks a merge

Status: Accepted. Bears on ADR-0013 (the toolchain the gate installs) and on how LAW-004 and LAW-010 are
enforced at all.

Both vocabulary guards have been Vitest tests since they were written, so until now a law was enforced
exactly as often as somebody remembered to type `pnpm test`. `.github/workflows` did not exist through
twenty merged pull requests. This records four decisions taken while giving them somebody to answer to,
each of which a future reader would otherwise undo by accident.

**The gate is one job that installs what the workspace declares and runs `pnpm typecheck` and `pnpm test`.
Nothing else runs, and nothing of the previous run is carried into it.**

## Why no cache of task results is carried into the run

The obvious speed-up is `actions/cache` over `.turbo`, and it is the one thing that would quietly disable
the guards.

Both guards read every package in the workspace, and `libs/comply-guards` can declare a dependency on none
of them — declaring the real inputs would mean naming every source file in the repository, which is the
same as not caching. So Turborepo hashes only the guard package's own files, and a violation planted
anywhere else leaves that hash untouched. PR #31 reproduced exactly that: a genuine LAW-010 violation
appended to `apps/comply-cli/src/render.ts` and the task reporting `cache hit, replaying logs`. The fix was
`"@vertuo/comply-guards#test": { "cache": false }` in `turbo.json`, and it holds wherever the cache lives.

So the structural protection is already in place, and this workflow's job is not to defeat it: it restores
no task cache at all, which means the point is tested on every run rather than trusted. The pnpm
*dependency store* is cached, because a downloaded package is not a verdict.

The whole suite from a clean runner is 44 seconds. There is nothing here worth trading a law for.

## Why the workflow names no version

`packageManager` says `pnpm@10.33.0` and `engines.node` says `>=24`. The workflow reads both from
`package.json` — `pnpm/action-setup` takes the first on its own, `actions/setup-node` takes the second via
`node-version-file`. Nothing about the toolchain is written twice, so the workflow cannot drift from what a
person gets on their own machine.

The honest consequence: `>=24` is a floor and not a pin, so CI takes the newest Node that satisfies it —
`v24.18.0` on the first green run. That is a version the repository declares the shape of, not a floating
`latest` written into a build file, and it is the right way round: **if this workspace ever needs an exact
Node, `engines` is where it says so**, and CI follows without being edited. A version pinned in the
workflow would be a second declaration, and the two would disagree within a month.

## What "prevents the merge" actually needs, and the trap in it

A workflow reports; it does not block. Blocking is a branch protection rule on `main` requiring the check,
which is repository configuration and lives nowhere in this tree:

```
gh api -X PUT repos/pierrederval/vertuo-domain-comply/branches/main/protection --input - <<'JSON'
{ "required_status_checks": { "strict": false,
    "checks": [{ "context": "the whole suite", "app_id": 15368 }] },
  "enforce_admins": true, "required_pull_request_reviews": null, "restrictions": null,
  "allow_force_pushes": false, "allow_deletions": false }
JSON
```

**The context is the job's `name`, and that string is the whole contract.** Rename `the whole suite` in the
workflow and the rule goes on waiting for a check nobody reports — which does not fail a pull request, it
leaves it pending, and a pending check on a repository with one maintainer is indistinguishable from a slow
one. So the job's name is not decoration and is not free to reword. It is named in plain words for the
person reading a red tick, and it may only change alongside the protection rule.

`enforce_admins` is deliberately on. The sole maintainer of this repository is an admin, and a gate that
its only user walks around is a decoration. Turning it off for an emergency is one call away and visible in
the settings; a gate that never applied to anybody is not.

The call above is made by hand, once, by somebody with admin. This ADR is where its shape is written down,
because the setting itself is invisible from inside the tree and there is nowhere else a reader would find
out that the gate is half configuration.

## Why the denominator is printed by the guard's own test

LAW-006 applies to the guard as much as to the product: *no engineering vocabulary found* means nothing
until it says where it looked. `checkSurfaceVocabulary` already knew — it returns `scanned` — and told
nobody, so a clean run and a run that read nothing printed the same thing.

It is printed from the test that asserts it, not from a step of the workflow, for two reasons. A figure
computed twice drifts, and the assertion and the printed line are now one call's answer. And a report that
exists only in CI is a report nobody sees while making the change that shrinks it — this one prints on a
laptop too. It is stated per place rather than as a total, because that is the resolution the shrinkage
has: a package whose source moves out from under the guard keeps its `src` directory, raises nothing, and
simply falls to none. Visible as a zero; invisible inside a total.

The figure is 76 files in 13 places. PR #30 landed this guard over 40 files in 9 — which is the point: the
denominator grew by 36 files without anybody saying so, and four of the packages it now covers did not
exist when it was written.

## What was measured

Verified by opening pull requests, not by reading the workflow.

- **Green.** PR #54: `13 successful, 13 total` for typecheck, `22 successful, 22 total` for the suite,
  Node `v24.18.0`, 44 seconds.
- **LAW-004** (PR #55, closed): a Facet name from one corpus written into
  `libs/comply-readiness/src/wellformed.ts`. The run says
  `{ "file": "libs/comply-readiness/src/wellformed.ts", "line": 125, "term": "terms" }`,
  then `Failed: @vertuo/comply-guards#test`, `18 successful, 22 total`.
- **LAW-010** (PR #56, closed): `Nothing has been committed under this heading yet.` in
  `apps/comply-studio/src/words.ts`. The run says
  `{ "file": "apps/comply-studio/src/words.ts", "line": 14, "term": "commit" }`.

Both violations were planted outside `libs/comply-guards`, which is criterion five of #32 measured rather
than argued: the file that broke the law is in a package the guard task declares no dependency on, and the
task still ran and still failed.

The failing runs print the denominator too. A red run that stops saying how much it read would be a gate
that goes quiet exactly when somebody is reading it.

## Consequences

- `SurfaceReport` gains `roots`, so a place with nothing in it can be told apart from a place that was
  never named. `sayWhatWasScanned` renders the figure.
- Every pull request runs the full suite on a clean runner. Adding a task cache to this job is a change to
  this decision and needs this ADR revisited, not merely a green run.
- The check's name is coupled to a repository setting that is not in the tree. Renaming the job without
  updating the protection rule removes the gate silently.
- Nothing in the job touches a shelf, a Seed, or the sibling `vertuo-domain-fr` checkout. The suite builds
  the fixtures it needs, which is why it passes on a machine that has never seen the real corpus — and a
  test that needed that checkout would fail here first.

**Revisit when** the suite is slow enough that the run is a cost rather than a wait, in which case the
question is which tasks may be cached and not whether the guards may be — or when a second person can merge
here, at which point required reviews become part of the same rule.
