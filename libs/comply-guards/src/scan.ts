import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Resolved from this file, so a guard works from any working directory. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface Violation {
  /** Repo-relative, so the report reads the same wherever it was run from. */
  file: string;
  /** 1-indexed. */
  line: number;
  term: string;
}

/** One piece of written-down text, found at one place in the source. */
export interface Literal {
  /** Repo-relative. */
  file: string;
  /** 1-indexed, and the line the text begins on when it spans several. */
  line: number;
  /**
   * The text itself, exactly as written — interpolations included, and for text
   * written between tags, exactly the characters between them.
   */
  text: string;
  /**
   * True when this literal names a module rather than saying anything: the
   * quoted part of an import or export. A path is never text anybody reads, so
   * a guard about what a reader meets skips it, and a guard about what the code
   * hardcodes does not.
   */
  isModuleSpecifier: boolean;
}

export interface Scan {
  /**
   * Every file the literals were taken from, repo-relative and in a stable
   * order. A verdict is only as good as what it was reached over, so the set is
   * reported rather than left implicit (LAW-006).
   */
  files: string[];
  literals: Literal[];
}

/** Source a guard can read. Component files carry most of what a reader is shown. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

async function sourceFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  const entries = (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) found.push(path);
  }
  return found;
}

/** True when this string is the module an import or export names, not something said. */
function namesAModule(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return parent.moduleSpecifier === node;
  }
  if (ts.isImportTypeNode(parent) || ts.isExternalModuleReference(parent)) return true;
  // A dynamic `import('…')`.
  return ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function literalsIn(source: ts.SourceFile, file: string): Literal[] {
  const found: Literal[] = [];

  const record = (node: ts.Node, text: string): void => {
    found.push({
      file,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      text,
      isModuleSpecifier: namesAModule(node),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      record(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      // The whole template between its backticks, interpolations and all. What
      // to make of an interpolation is each guard's own decision: to one it is
      // an identifier nobody reads, to the other it is code that hardcoded
      // something.
      record(node, node.getText(source).slice(1, -1));
    } else if (ts.isJsxText(node) && !node.containsOnlyTriviaWhiteSpaces) {
      record(node, node.text);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return found;
}

/**
 * Every literal written under `roots`, which are repo-relative.
 *
 * Read with the language's own parser rather than by matching quotes, because
 * the text a reader meets is not always quoted: the words between two tags in a
 * component file are the most common label there is, and no amount of quote
 * matching finds them. The parser also settles what a comment is, what an
 * import path is, and where a template that runs over several lines begins and
 * ends — three things a guard would otherwise have to guess at, and would
 * sometimes guess wrong in the direction of saying nothing.
 *
 * A root that does not exist is an error and not an empty result. A guard that
 * reports nothing because it looked nowhere reads exactly like a guard that
 * found nothing wrong, and would go on reading that way for as long as the
 * directory stayed missing.
 */
export async function scanLiterals(roots: string[]): Promise<Scan> {
  const files: string[] = [];
  const literals: Literal[] = [];

  for (const root of roots) {
    for (const path of await sourceFiles(join(REPO_ROOT, root))) {
      const file = relative(REPO_ROOT, path);
      files.push(file);

      const text = await readFile(path, 'utf8');
      const source = ts.createSourceFile(
        path,
        text,
        ts.ScriptTarget.Latest,
        // Parents are what tell a string apart from the import that holds it.
        true,
        path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      literals.push(...literalsIn(source, file));
    }
  }
  return { files, literals };
}
