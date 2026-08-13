import { useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Library } from 'lucide-react';
import { Link } from 'react-router';
import type { CorpusList, CorpusSummary } from '@vertuo/comply-contract';
import { OPENS_AT } from './destinations.js';

/**
 * Which Corpus is being read, and every other one on the shelf, as one control.
 *
 * A Corpus is what everything else in the Studio is scoped to — every figure, every
 * queue, every Finding — so it belongs at the top of the frame as the thing a reader
 * switches, not in a list halfway down it competing with places to go. That was the
 * navigation defect: the shelf and the destinations of one Corpus were drawn as two
 * lists of the same weight in two different parts of the screen, and neither said it
 * contained the other.
 *
 * Built on a native disclosure rather than a floating menu, for two reasons that
 * happen to agree. A menu in a portal is not in the document until it opens, so
 * nothing that draws the frame once and reads it — a test, a reader without a
 * pointer — can see that a second Corpus exists at all. And the shelf is a handful of
 * entries: a control that needs a portal to hold three names is machinery bought for
 * a problem this product does not have.
 */
export function Switcher({
  shelf,
  reading,
}: {
  /** What the shelf holds, or nothing until it has been read. */
  shelf: CorpusList | null;
  /** Which Corpus the reader is in, if they are in one. */
  reading: CorpusSummary | null;
}) {
  const held = useRef<HTMLDetailsElement>(null);

  /*
   * Closing is the half a disclosure does not bring. A control that stays open after
   * a reader has looked elsewhere covers the first destination under it, and the one
   * they will reach for next is the one they cannot see.
   */
  useEffect(() => {
    const shut = (event: Event) => {
      const open = held.current;
      if (open === null || !open.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') open.open = false;
        return;
      }
      if (event.target instanceof Node && !open.contains(event.target)) open.open = false;
    };

    document.addEventListener('pointerdown', shut);
    document.addEventListener('keydown', shut);
    return () => {
      document.removeEventListener('pointerdown', shut);
      document.removeEventListener('keydown', shut);
    };
  }, []);

  const onShelf = shelf?.corpus ?? [];
  const refused = shelf?.criteriaNotFollowed ?? [];

  return (
    <details ref={held} data-switcher="" className="group/switcher relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-sidebar-border bg-panel px-2 py-1.5 text-sm outline-none hover:bg-sunken focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]/sidebar-wrapper:hidden"
        aria-haspopup="menu"
      >
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded bg-here-quiet text-here"
        >
          <Library className="size-3.5" />
        </span>
        {/*
          What is being read, or the fact that nothing is. *Every Corpus on the shelf*
          is where a reader with no Corpus chosen actually is, so the control says that
          rather than inviting them to choose something they have already got.
        */}
        <span className="min-w-0 flex-1 truncate font-medium">
          {reading?.name ?? 'Every Corpus on the shelf'}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-faint" />
      </summary>

      <div
        role="menu"
        className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-panel p-1 shadow-lg"
      >
        {shelf === null ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Reading the shelf.</p>
        ) : onShelf.length === 0 ? (
          /*
           * A shelf holding nothing and a shelf whose every set of criteria could not
           * be followed say different things to a reader, and neither is the other
           * (LAW-006, spec §8). The second has files to put right and the list below
           * names them.
           */
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {refused.length === 0
              ? 'Nothing is on the shelf yet.'
              : 'Nothing on the shelf can be read yet. The list says which file to put right.'}
          </p>
        ) : (
          onShelf.map((entry) => {
            const here = entry.id === reading?.id;

            return (
              <Link
                key={entry.id}
                role="menuitem"
                to={`/corpus/${encodeURIComponent(entry.id)}/${OPENS_AT}`}
                data-corpus={entry.id}
                data-here={here ? '' : undefined}
                className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                  here ? 'bg-here-quiet font-medium text-here' : 'hover:bg-sunken'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {here && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
              </Link>
            );
          })
        )}

        {/*
          The shelf itself is the last way out, and it is the only surface that says
          where each Corpus stands and how old that answer is. A list of names cannot:
          choosing between two Corpus is a question about their readings.
        */}
        <Link
          role="menuitem"
          to="/corpus"
          className="mt-1 flex items-center gap-2 rounded-sm border-t border-border px-2 pt-2 pb-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Every Corpus on the shelf
        </Link>
      </div>
    </details>
  );
}
