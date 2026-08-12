import { basename } from 'node:path';
import type { ZodIssue } from 'zod';

/**
 * Why one set of criteria could not be followed, in words the person holding the
 * file can act on (spec §8, LAW-010).
 *
 * Written here, beside the rules that do the refusing, and not at either surface.
 * The runner prints this and the Studio draws it, so a second copy of the wording
 * is how the two come to say different things about one file — the same reason the
 * Door's own failures are worded once (ADR-0034).
 *
 * This is the error a person setting a Corpus up is likeliest to meet, and it is
 * the one error in the product that reaches nobody the product knows about. Every
 * other message routes to a Module Owner or to whoever is holding the terminal;
 * a Lens is hand-authored, there is no Module to route to, and the Corpus it
 * describes does not exist yet as far as anything here can tell. So the sentence
 * carries its own routing: it names the file, and it says what to change in it
 * (LAW-007).
 */

/**
 * Where in the file something is wrong, as the file's own keys.
 *
 * The keys and not a description of them. Whoever reads this has the file open and
 * is going to search it, and a rendering of `facets.0.factKind` into prose is a
 * translation they then have to undo. A step that is a position in a list is drawn
 * as one, counting from one, because no file writes its first entry as zero.
 */
function whereItSays(path: ZodIssue['path']): string {
  return path
    .map((step) => (typeof step === 'number' ? `entry ${step + 1}` : step))
    .join(' → ');
}

/** The words this product knows, where an issue carries a set of them. */
function theOnesItKnows(issue: ZodIssue): string[] {
  if (issue.code === 'invalid_enum_value') return issue.options.map(String);
  if (issue.code === 'invalid_union_discriminator') return issue.options.map(String);
  if (issue.code === 'invalid_literal') return [String(issue.expected)];
  return [];
}

/**
 * One refusal as a clause, lowercase and without a full stop, so several read as
 * one sentence.
 *
 * The rules written in this library say their own reason and are passed straight
 * through: what is wrong with a Lens declaring a dictionary twice is a sentence
 * about dictionaries, and nothing here could improve on it.
 *
 * Everything else is a shape this product cannot read, reported by the validator
 * in its own vocabulary — *expected*, *received*, *invalid* — which is exactly
 * the vocabulary LAW-010 keeps off a screen. Those are said again here, in five
 * cases that between them cover a file with a key absent, a key of the wrong
 * kind, a word this product does not know, and a key nothing reads. What is kept
 * from the validator is the place and the value, because those are the two things
 * a reader needs and the two things it alone knows.
 */
function asAClause(issue: ZodIssue): string {
  const where = whereItSays(issue.path);
  const at = where === '' ? 'in it' : `under "${where}"`;

  if (issue.code === 'custom') return issue.message;

  if (issue.code === 'invalid_type') {
    if (issue.received === 'undefined') {
      return `it says nothing ${at}, and a Corpus cannot be read without it`;
    }
    return `what it says ${at} is not of a kind that can be read there`;
  }

  const known = theOnesItKnows(issue);
  if (known.length > 0) {
    const said = 'received' in issue ? `"${String(issue.received)}"` : 'what it says there';
    return `it says ${said} ${at}, which is not one this product knows; the ones it knows are ${known.join(', ')}`;
  }

  if (issue.code === 'unrecognized_keys') {
    return `it says something under ${issue.keys.map((key) => `"${key}"`).join(', ')} that nothing here reads`;
  }

  if (issue.code === 'too_small' || issue.code === 'too_big') {
    return `what it says ${at} is not enough to read a Corpus from`;
  }

  return `what it says ${at} cannot be read`;
}

/**
 * The whole sentence, for a file that was refused by the rules or that could not be
 * read as criteria at all.
 *
 * Every reason at once. A file with two mistakes in it, reported one at a time, is
 * two loads and two readings of the same sentence to find out — and the person
 * fixing it has the whole file open in front of them.
 *
 * The file is named by the name it has and never by where the machine keeps it. An
 * absolute path differs on every checkout and in CI, so a reason carrying one is a
 * reason that reads differently to two people looking at the same shelf — and it
 * names a directory the reader is already standing in.
 */
export function whyItCannotBeFollowed(path: string, reasons: string[]): string {
  const name = basename(path);
  return (
    `Nothing about the Corpus described in ${name} can be read yet, because ` +
    `${reasons.join('; and ')}. Put that right in ${name} and it will be read.`
  );
}

/** What is said of a file on the shelf that is not written as criteria at all. */
export const NOT_WRITTEN_AS_CRITERIA = 'it is not written in a form this product can read';

/**
 * What is said where the file itself is not there.
 *
 * Its own sentence, and the one place the path is said as it was given rather than
 * by the file's name alone. Nothing is wrong inside a file here, so *put that right
 * in it* would send a reader to open something that does not exist; what is wrong is
 * the name, and a name they mistyped one directory of is a name they cannot check
 * against a name with the directory taken off.
 *
 * Reached from the runner and not from a shelf, which found the file before it asked
 * for it.
 */
export function thereIsNoSuchFile(path: string): string {
  return (
    `There is no file at ${path} to read a Corpus's criteria from. ` +
    `Check the name, or put the file there.`
  );
}

/** Every reason a set of criteria was refused, each one a clause. */
export function everyReason(issues: readonly ZodIssue[]): string[] {
  return issues.map(asAClause);
}
