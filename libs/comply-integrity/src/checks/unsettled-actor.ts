import type { Corpus, Fact, Finding } from '@vertuo/comply-core';
import type { FacetSpec, Lens } from '@vertuo/comply-lens';

type Asking = NonNullable<FacetSpec['actor']>;

/**
 * Everyone one Fact says may make it, in the order it says them.
 *
 * Three shapes arrive here and all three are the source's own. A field holding one
 * name is one. A part written as a list arrives as a list, because the source already
 * said where each of them begins (ADR-0029). And a field holding several names in one
 * string is divided the way its Lens says this corpus divides them, or read whole
 * where it says nothing — a corpus that writes one role per field is read exactly as it
 * writes.
 *
 * The same name written twice is one thing to write down, so it is named once.
 */
function whoMayMakeIt(fact: Fact, asking: Asking): string[] {
  const written = fact.attributes[asking.attribute];
  const pieces = typeof written === 'string' ? [written] : (written ?? []);

  const named: string[] = [];
  for (const piece of pieces) {
    let divided = [piece];
    for (const separator of asking.separatedBy ?? []) {
      divided = divided.flatMap((part) => part.split(separator));
    }
    for (const part of divided) {
      const name = part.trim();
      if (name !== '' && !named.includes(name)) named.push(name);
    }
  }
  return named;
}

/** Every name the settling Facet has written down, across the whole Corpus. */
function settledNames(corpus: Corpus, settledBy: string): Set<string> {
  const names = new Set<string>();
  for (const fact of corpus.facts) {
    if (fact.facet !== settledBy) continue;
    const name = fact.attributes['name'];
    if (typeof name === 'string' && name.trim() !== '') names.add(name.trim());
  }
  return names;
}

/**
 * A Fact naming who may make it, where nothing the Corpus has written down says who
 * that is (ADR-0037).
 *
 * A Check and not a criterion, because it takes two Facts to see: the request and the
 * place a role would have been settled. `evaluateFact` is handed one Fact and its Facet
 * on purpose, and a shortfall means *write something down* where this means *these two
 * do not agree* — different work, reaching different people (ADR-0020).
 *
 * Silent where a Corpus's criteria say nothing about who may make a request, which is
 * every Corpus read so far. Silence is not absence: the Check is named among what was
 * looked for on every reading, so a reader knows nobody looked away (LAW-006).
 *
 * Says nothing about a request that names nobody at all. That is one Fact short of what
 * its Facet asks of it, which is a Readiness shortfall its criteria already state; said
 * here as well, one thing to do would arrive twice, in two queues, to two people.
 *
 * A role is settled where it is written down anywhere in the Corpus, not only under the
 * request's own Module: a Corpus is one language, which is the premise the dictionary is
 * read on too (ADR-0021).
 */
export function checkUnsettledActor(corpus: Corpus, lens: Lens): Finding[] {
  const findings: Finding[] = [];

  for (const facet of lens.facets) {
    const asking = facet.actor;
    if (asking === undefined) continue;

    const settles = lens.facets.find((other) => other.name === asking.settledBy);
    const settled = settledNames(corpus, asking.settledBy);
    // What a reader is told to call it, which is the Lens's business and never this
    // file's (LAW-004, LAW-010). A Facet that declares no label is called by its name,
    // which is a word somebody chose too.
    const where = settles?.label ?? asking.settledBy;

    for (const fact of corpus.facts) {
      if (fact.facet !== facet.name) continue;
      const request = fact.attributes['name'];
      if (typeof request !== 'string') continue;

      for (const named of whoMayMakeIt(fact, asking)) {
        if (settled.has(named)) continue;
        findings.push({
          code: 'unsettled-actor',
          moduleId: fact.moduleId,
          message:
            `${fact.kind} "${request}" says "${named}" may make it, ` +
            `and nothing under "${where}" says who that is`,
          origin: fact.origin,
        });
      }
    }
  }
  return findings;
}
