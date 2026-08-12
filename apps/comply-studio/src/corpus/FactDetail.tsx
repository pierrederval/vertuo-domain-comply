import { Link } from 'react-router';
import type { CorpusFact, Ladder, Place, SourceText, WrittenPart } from '@vertuo/comply-contract';
import { WhyThereIsNoReading } from '../components/NoReading.js';
import { Conspicuous, NothingToShow, Surface } from '../components/layout.js';
import { Where } from '../components/Where.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';

/**
 * One part of a piece of knowledge, as its source writes it.
 *
 * Every part the reading holds is drawn, including the ones an extractor made
 * rather than the source. A Facet may say any of them has to be there, and a
 * reader shown fewer parts than the criteria are stated against cannot check the
 * shortfall they were told about.
 *
 * Where a part holds more than one passage, they are drawn as the several they
 * are and it is said that they are several. Two passages the source wrote apart
 * from each other, handed to a reader as continuous prose, are not what the source
 * says — and prose that reads continuously is exactly how nobody notices
 * (ADR-0017, ADR-0026).
 */
function Part({ part }: { part: WrittenPart }) {
  return (
    <div className="flex flex-col gap-1">
      {/*
        Drawn exactly as its Corpus writes it, and never recased. A name a corpus
        writes as one word with a capital inside it says where its parts are, and
        upper-casing the whole of it takes that away — one of the fixtures names a
        part in exactly that shape.
      */}
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">{part.named}</p>
      {part.says.map((passage, at) => (
        <p key={at} data-passage="" className="text-sm whitespace-pre-wrap">
          {passage}
        </p>
      ))}
      {part.says.length > 1 && (
        <p data-apart="" className="text-sm text-muted-foreground">
          {'Written apart in the source, and shown apart.'}
        </p>
      )}
    </div>
  );
}

/**
 * How far along this piece of knowledge is, and nothing else.
 *
 * The rung is drawn as the name its Corpus gave a step, never as a quantity, and
 * in the quotation marks this product puts round any word a Corpus chose. A Corpus
 * whose steps are numbered puts a piece of knowledge at a step called “0”, and *At
 * 0 of 0 → 1 → 2* reads as a measurement of something — which is the one reading
 * LAW-006 exists to refuse.
 *
 * The whole ladder is named directly underneath, and which rung is enough with it.
 * A rung is one word until a reader is told what the steps are and which of them
 * counts as approved; told here rather than in a footnote, it is checkable where it
 * is drawn (LAW-009).
 */
function FarAlong({ maturity, ladder }: { maturity: string | null; ladder: Ladder }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How far along it is</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {maturity === null ? (
          // Not an empty space, and not the word the code has for nothing
          // (LAW-010). A Corpus that graded this at nothing said something.
          <p>
            <Conspicuous>this Corpus does not say how far along it is</Conspicuous>
          </p>
        ) : (
          <p>
            {'At '}
            <span data-rung={maturity} className="font-semibold">
              {`“${maturity}”`}
            </span>
            {'.'}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {`This Corpus grades from ${ladder.levels.join(' → ')}, and counts “${ladder.approvedAtOrAbove}” and above as approved.`}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * What backs this piece of knowledge up, as the set of places it is.
 *
 * A set and never a rung, never a count, and never in the other's place. How far
 * along a piece of knowledge is and how well backed it is are independent, and
 * fusing them is what made coverage uncomputable in the first place (LAW-005).
 * What a reader sees when several places attest something, rather than one, is the
 * set itself — which is why there is no figure here to read instead of it.
 *
 * Each place is drawn exactly as its Corpus writes it. Half of one corpus writes a
 * bare path and half writes a path with a note narrowing which part of it, so
 * anything tidying the first would leave the second alone and the set would be
 * half one thing and half another (ADR-0029, LAW-009).
 */
function BackedBy({ sources }: { sources: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What backs it up</CardTitle>
      </CardHeader>
      <CardContent data-corroboration="">
        {sources.length === 0 ? (
          // Nothing at all attests this, which is something to act on and not a
          // blank space — and never a nought, which reads as a measurement.
          <p>
            <Conspicuous>Nothing here says where this came from.</Conspicuous>{' '}
            {'Whoever answers for it has nowhere to send a reader to check it.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {'Every place this Corpus says it came from:'}
            </p>
            <ul className="list-disc pl-6 marker:text-muted-foreground">
              {sources.map((place) => (
                <li key={place} data-source="" className="font-mono text-sm">
                  {place}
                </li>
              ))}
            </ul>
            {/* Said where the places are, because it qualifies them and nowhere
                else. Nothing in the product has been to any of them. */}
            <p className="text-sm text-muted-foreground">
              {'Each one as this Corpus writes it. Nothing here has been to look at any of them, so what is above is what the Corpus says about itself.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The source text this piece of knowledge was read out of, exactly as written.
 *
 * The reason this surface exists. A place is verifiable evidence for somebody at a
 * terminal and useless to somebody in a browser who cannot open it, so the cited
 * text travels with the knowledge and is drawn here in place (LAW-009, spec §3.3).
 *
 * Drawn as it was written, line breaks and all, and never rendered as though the
 * marks in it were formatting: what a reader is owed is the text the knowledge was
 * taken from, not a tidy version of it.
 */
function Quoted({ quoted, at }: { quoted: SourceText | null; at: Place }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The source text it was read out of</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {quoted === null ? (
          // The knowledge on the shelf holds no text for this place. Said, rather
          // than drawn as an empty quotation, because a reader shown one has been
          // shown a claim they cannot check and told nothing about why.
          <p>
            <Conspicuous>The source text did not come with this.</Conspicuous>{' '}
            {'It is at '}
            <Where at={at} />
            {'.'}
          </p>
        ) : (
          <>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
              {quoted.says}
            </pre>
            {quoted.cut && (
              // A cut with a pointer is honest about being partial in a way a
              // summary is not, and a cut left unsaid reads as the whole of what
              // the source says (LAW-006).
              <p data-cut="" className="text-sm">
                {'The source text goes on past this. The rest of it is at '}
                <Where at={at} />
                {'.'}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * One piece of knowledge, with everything needed to judge it and the evidence for
 * it in place (spec §5.4).
 *
 * What the grid's figures are made of, one piece at a time. It shows what the
 * knowledge says, the two independent readings of it — how far along it is, and
 * what backs it up — and the source text it was read out of, so that no claim on
 * this surface is one a reader cannot check where it is made (LAW-009).
 *
 * Nothing here knows what any of it is called. Every part's name, every rung,
 * every place, and what the Facet it sits under is called all arrive in the
 * payload, so this draws a piece of knowledge from a Corpus it has never met
 * without being changed (LAW-004).
 */
export function FactDetail({ held }: { held: CorpusFact }) {
  const { reading } = held;

  if (reading.outcome !== 'read') {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent>
          <WhyThereIsNoReading reading={reading} />
        </CardContent>
      </Card>
    );
  }

  const { at, ladder, label, maturity, moduleId, quoted, sources, written } = reading;
  const inItsModule = `/corpus/${encodeURIComponent(held.corpus.id)}/modules/${encodeURIComponent(moduleId)}`;

  return (
    <Surface>
      <p className="text-sm text-muted-foreground">
        {'Written down at '}
        <Where at={at} />
        {', under '}
        <span className="text-foreground">{label}</span>
        {' in '}
        {/* The way back to the rest of what this Module has written down. */}
        <Link to={inItsModule} className="text-foreground underline underline-offset-4">
          {moduleId}
        </Link>
        {'.'}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>What it says</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {written.length === 0 ? (
            <NothingToShow>
              {'Nothing at all is written down here, and the source text below is all there is.'}
            </NothingToShow>
          ) : (
            written.map((part) => <Part key={part.named} part={part} />)
          )}
        </CardContent>
      </Card>

      {/*
        The two readings of one piece of knowledge, in two surfaces of their own.
        Nothing sits between them, nothing is drawn from the pair, and neither is
        ever drawn in the other's place (LAW-005).
      */}
      <FarAlong maturity={maturity} ladder={ladder} />
      <BackedBy sources={sources} />
      <Quoted quoted={quoted} at={at} />

      {/*
        Nothing is qualified from down here. What each surface above says has to
        be checkable where it is said, and a ladder repeated in a footnote three
        lines below the rung it explains is the same sentence twice — the second
        of which is always the one somebody forgets to change.
      */}
    </Surface>
  );
}
