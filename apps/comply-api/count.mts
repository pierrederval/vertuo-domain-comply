import { fixturePath } from '@vertuo/comply-fixtures';
import { extractSeed } from '@vertuo/comply-ingestion';
import { loadLens } from '@vertuo/comply-lens';
import { readSeededCorpus } from '@vertuo/comply-reading';

const lens = await loadLens(fixturePath('lens-a.json'));
const r = readSeededCorpus(await extractSeed(lens), lens, '2026-01-01T00:00:00.000Z', null);
for (const f of r.findings) console.log(f.code, '| module:', JSON.stringify(f.moduleId), '| also:', (f.relatedOrigins ?? []).length);
console.log('total', r.findings.length, 'withModule', r.findings.filter(f => f.moduleId !== null).length);
