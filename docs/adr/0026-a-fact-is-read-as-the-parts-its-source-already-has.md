# ADR-0026: A Fact is read as the parts its source already has

Status: Accepted. Refines ADR-0020. Corrects three figures in ADR-0025.

**A Facet may name the Parts one of its Facts is written in** — the source's own subheading mapped onto
an attribute, as `parts`, exactly as `columns` maps a table's headers. This is what ADR-0020 promised
and is the whole of the line it draws: *a Rule must say why it exists* is a judgment nobody can make
mechanically, and written in parts it becomes the question whether a Part is there.

Four things follow, and each was a decision:

- **The level a Part sits at follows from the level its Facet cuts items at**, and is not declared. A
  Facet reading headings cuts at one level, so the parts of what it cut are written one below. A Facet
  reading whole documents has cut nowhere, so the document's own sections are its parts. Nothing in a
  Lens says `###`, because nothing in a Lens should have to know how deep it is standing.
- **What is written before the first Part lands in `bodyAttribute`**, because it was written under no
  heading and so belongs to no Part.
- **Several spellings may name one Part**, because a corpus drifts. Where a source turns out to have
  written two of them, the attribute holds both, in the order the source writes them — never joined
  into one string, because two passages that are not adjacent in the source, handed to a reader as
  continuous prose, are not what the source says (LAW-009, ADR-0017).
- **A subheading no Part names contributes nothing, and is not set aside.** Set aside counts one of a
  Facet's own things, declined (ADR-0025). A subheading was never going to be one of them, so nothing
  was declined and the figure a reader is shown does not move.

A Facet that names no Parts reads the whole body into one attribute, which is what every Facet did
before this could be said. Naming Parts on a Facet that reads rows is refused at load — a row has
nothing written under it — and so is naming none at all, which is the more dangerous of the two: it
reads as *no Parts named* and is not, because it puts a Facet into reading-by-parts with no Part to
read, so every Fact under it keeps only what stands before its first subheading.

## The defect, and why it survived this long

`requiredAttributes: ["name", "statement"]` was the strongest thing the DDD Lens could ask of a
Business Rule, and it passes on any prose whatsoever. All 183 rules cleared it. Every one of them is
already written in parts:

```
## BR-001 Accès à l'Exécution de Projet
### Énoncé de la Règle
### Justification Métier
### Justification Dérivée du Source
### Conditions Dérivées de la Source
### Résultat
### Exemples
### Questions de Revue PM
### Traçabilité des Sources
```

So the corpus had written down considerably more than the reading could ask about, and the reading's
one question was the one question the corpus could not fail.

## What the corpus said when it was asked properly

| Part, and the spellings the corpus writes it under | Of 183 rules |
| --- | --- |
| `Énoncé de la Règle` → statement | 183 |
| `Résultat` → outcome | 183 |
| `Justification Métier` → rationale | 180 |
| `Conditions Dérivées des Sources` (128), `Conditions Dérivées de la Source` (52) → conditions | 180 |
| `Traçabilité des Sources` (152), `Traçabilité Source` (25) → traceability | 177 |
| `Questions de Revue PM` (164), `Questions de Révision PM` (9) → reviewQuestions | 170 |
| `Exemples` → examples | 44 |
| `Justification Dérivée du Source` (27), `Justification Dérivée des Sources` (3) → derivedFrom | 30 |
| `Réponses de Revue PM` → reviewAnswers | 13 |

Exactly two level-3 headings in the corpus are none of these — `Complétude des Lignes de Devis` and
`Familles de Statistiques Actuelles`, once each. They contribute nothing and are not set aside.

## The thing that changed the design

The plan for this change said the corpus carried *two spellings of the rationale*, that 27 rules
carried both, and that the tie had to be broken explicitly rather than left to whatever the loop did.
That premise is wrong, and it was worth checking before building on it.

`Justification Métier` and `Justification Dérivée du Source` are not one Part spelled two ways. They
are two different things, and `coeur/chantier/business-rules.md` writes both under BR-001:

> ### Justification Métier
>
> Les chantiers portent des relations clients, des prix, des coûts et des activités de terrain.
> Vertuoza restreint qui peut ouvrir et gérer des chantiers et isole les données de chaque Tenant.
>
> ### Justification Dérivée du Source
>
> `WorksitePolicy` sépare deux méthodes : `canAccess` refuse d'abord tout Tenant différent, puis
> n'accepte que les types Gestionnaire et Ouvrier […]

One is why the business wants the rule. The other is what the code was found to do. Mapped onto one
attribute, two things would have been fused in 27 rules and one of them lost — and worse, in the 3
rules that write only the derived one, *a rule must say why it exists* would have been satisfied by a
paragraph about two PHP methods and a legacy database column. A criterion that passes on that is not a
weaker criterion than none; it is a false one.

So they are two Parts, `rationale` and `derivedFrom`, and after that no collision between two spellings
exists anywhere in this corpus. The three genuine drifts — conditions, traceability, review questions —
never co-occur in a single rule; nor do the drifted `columns` spellings in any single table. The
several-spellings-onto-one-attribute rule is right and is exercised, and the case where a source writes
two of them is a safety net rather than a live event.

The way to tell a drifted spelling from a second Part is whether one source ever writes both. That test
is cheap, it is the only one that works, and it should be run before any spelling is folded into
another.

## The trap this walked into, and what it cost to avoid

**All 20 area `index.md` documents begin at their first section.** There is no prose between the
frontmatter and the first `##` in any of them. The overview Facet reads whole documents, its criterion
asks for `description`, and `description` was `bodyAttribute` — so Parts alone would have emptied
`description` for all 20 Modules and turned the only column in this reading that is nearly complete
into 20 failures. Not a code fault: a Lens omission, arriving silently, in the one place where the
reading currently has good news.

The Lens therefore maps `Objectif` — written in all 20 — onto `description`, and points
`bodyAttribute` at `title`, where the document's `# Heading` line lands. `description` is now one
passage in all 20 rather than the whole document it used to be.

This is a general hazard and not a quirk of this corpus: **any Facet whose criterion asks for its
`bodyAttribute` must name a Part for its sources' opening section, or stop asking.** It is stated in
`facetSpecSchema` beside `bodyAttribute` and held by a test.

## What moved

**No Fact count moved, and neither did the set-aside figure.** 1506 read, 146 set aside, 1652 found,
before and after; every Facet's count identical. Parts decide what a Fact is made of and never how many
there are (ADR-0016).

**No Finding moved.** 125 before and after, byte for byte — 33 empty-facet, 30 conflicting-definition,
27 missing-owner, 24 broken-reference, 8 split-identity, 3 unparsable-document. A missing Part is an
unmet criterion and not a Finding: it means *write something down*, which is the half of the split
ADR-0020 assigns to criteria.

A reference is still followed wherever in a Fact's source it is written, whether or not the section
holding it is mapped to a Part. Otherwise what a Lens chose to name would decide which broken links a
reader is told about.

**Seventeen cells fell from well-formed to present**, and each says which Part is absent:

| Column | Before | After |
| --- | --- | --- |
| overview | 20 well-formed, 8 absent | **4 well-formed, 16 present** (`missing: aggregates`) |
| business-rules | 14 well-formed, 14 absent | **13 well-formed, 1 present** (`missing: rationale`) |
| everything else | | unchanged |

Across the grid: 119 absent unchanged, well-formed 103 → 86, present 2 → 19, approved 0 → 0.

**Sixteen of twenty areas have not written what their Aggregates are.** Four have: `chantier`, `devis`,
`facturation` and `opportunite`. This is the first thing this tool has said about this corpus that is
neither a count nor its own defect, and it needed nobody to write a file first — the knowledge was
already there, under `## Aggregates`, unreachable by any question the Lens could previously ask.

**One module's rules do not say why they exist.** `profitability-and-analytics` is the cell reporting
`missing: rationale`, and it is the three rules named above: the ones justified only from the code. The
figure is small and the reading is exact, which is the point — the shortfall names a job, not a
shortfall (LAW-007).

Requiring `statement` and `outcome` added nothing, because all 183 rules carry both. That is the
result, and it is a good one: the bar became real and the corpus already clears it.

## Erratum to ADR-0025

ADR-0025 states that the Readiness Matrix stood at "189 cells absent, 2 present but not well-formed, 88
well-formed, and none approved, before and after". **The three figures are wrong.** Measured against
the same corpus at the same commit, by removing `itemPattern` and reading again, the grid is **119
absent, 2 present, 103 well-formed, 0 approved** — 224 cells, which is 28 modules by 8 Facets. The
recorded figures sum to 279, which no reading of eight Facets can produce.

Its claim is correct and reproduces exactly: the two readings are identical mark for mark, and the 39
headings were not what held any cell back. Every other figure in ADR-0025 reproduces too — business
rules 222 → 183, total 1545 → 1506, set aside 107 → 146, Findings 126 → 125, broken references 25 → 24.
Only the absolute cell counts were mis-transcribed. Corrected here rather than in place, and noted at
the foot of ADR-0025 so nobody reads the wrong three numbers without meeting this.

## What this does not repair, deliberately

- **`columns` still resolves a collision by letting the last one win.** Two headers in one table
  mapping to one attribute would silently lose the first, where two Parts keep both. No table in either
  corpus does it — the drifted spellings in `workflows` and `state-machines` never co-occur — so this is
  latent, and fixing it is a behaviour change verifiable against no corpus. It is recorded here as the
  next reader's business, the way ADR-0024 recorded its unbuilt channel.
- **A shortfall names the Part and never which Fact lacks it.** One cell reports `missing: rationale`
  for a Facet holding six rules, three of which are short. That is deliberate — a reason names the work
  and not each instance of it (`distinct` in `matrix.ts`) — but *write the rationale for three of these
  six* is a materially different job from *for all six*, and nothing says which. The Occurrence list
  the Studio needs anyway is the shape that answers it.
- **`experience` names no Parts**, for the reason ADR-0025 gives for its declaring no `itemPattern`:
  its headings have no shape that separates without becoming a list of them.
- **`Statut de Revue PM` is now outside every overview Fact's attributes**, where before it sat inside
  `description` along with the rest of the document. Deliberate — a review status is not what a Module
  is for — and #45 (ADR-0022) is the change that reads it. The excerpt is untouched, so it has not left
  the evidence, only the attributes.

## Consequences

- `facetSpecSchema` gains `parts`. `lensSchema` refuses it on a Facet reading rows, and refuses an empty
  declaration.
- `readInParts` in `extractors.ts` serves both the `document` and `heading` extractors, so a Fact read
  whole and a Fact read from a heading are divided into Parts by one piece of code and cannot drift.
- One behaviour changed for Facets that name no Parts at all: an attribute that would hold nothing is now
  absent rather than present and empty. No verdict moves — `attributeIsPresent` already counted an empty
  passage as absent — and nothing in either corpus exercises it: all 110 Seed documents under the six
  Facets that gained no Parts are byte-identical before and after, and no attribute in either reading held
  an empty passage. Recorded because a surface reading an attribute now meets nothing where it once met
  the empty string.
- The DDD Lens names 9 Parts for its Business Rules under 13 spellings, and 13 for its overview under
  22, asks a Rule for its outcome and its rationale, and asks a Module for its Aggregates.
- `lens-a.json` names Parts for two Facets and `corpus-a` writes its rules in them; `invariants` names
  none and `corpus-b` names none anywhere, so both directions hold against a corpus that is not the DDD
  one (ADR-0001). `corpus-a.txt` moved by exactly two lines and `corpus-b.txt` did not move by a byte.
- Nothing a reader meets gained an engineering word. Which Parts a Fact has is a sentence the Lens says,
  and the core says nothing about it (LAW-004, LAW-010).

**Revisit when** a corpus writes one Fact's Parts at two different depths, or when a Part needs to be
asked for by something other than its presence. The second is ADR-0020's line and moving it needs that
ADR amended, not this one.
