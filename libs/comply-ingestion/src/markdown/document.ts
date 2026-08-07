import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';

export interface ParsedDocument {
  file: string;
  data: Record<string, unknown>;
  body: string;
  /** 1-indexed line in the original file where the body begins. */
  bodyStartLine: number;
}

export async function parseDocument(file: string): Promise<ParsedDocument | null> {
  const text = await readFile(file, 'utf8');
  if (!text.startsWith('---')) return null;

  const parsed = matter(text);
  if (Object.keys(parsed.data).length === 0) return null;

  const consumed = text.slice(0, text.length - parsed.content.length);
  const bodyStartLine = consumed.split('\n').length;

  return {
    file,
    data: parsed.data as Record<string, unknown>,
    body: parsed.content,
    bodyStartLine,
  };
}
