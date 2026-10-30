import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const pin = await json('provenance.json');
assert.equal(pin.repository, 'https://github.com/cursor/plugins');
assert.equal(pin.commit, '4dd1d05818d19792e7cd6e818f1667f95f7e1dbe');
assert.equal(pin.subtree, 'pstack');
const paths = [];
async function walk(path) {
  for (const entry of await readdir(new URL(path, root), { withFileTypes: true })) {
    const next = `${path}${entry.name}`;
    if (entry.isDirectory()) await walk(`${next}/`);
    else {
      assert(entry.isFile(), `Non-regular snapshot entry: ${next}`);
      paths.push(next.slice('upstream/'.length));
    }
  }
}
await walk('upstream/');
assert.deepEqual(paths.sort(), Object.keys(pin.files).sort());
assert.equal(paths.length, 573);
assert.equal(pin.fileCount, paths.length);
for (const path of paths) {
  const bytes = await readFile(new URL(`upstream/${path}`, root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pin.files[path], path);
}
assert.equal(paths.filter(path => /^skills\/[^/]+\/SKILL\.md$/.test(path)).length, 58);
assert(paths.includes('LICENSE'));
const manifest = await json('package.json');
assert.deepEqual(manifest.pi, { skills: ['./skills/pstack/SKILL.md'], extensions: [], prompts: [], themes: [] });
const entry = await readFile(new URL('skills/pstack/SKILL.md', root), 'utf8');
assert(entry.includes('name: pstack\n'));
assert(entry.includes('docs/harness/pi.md'));
assert(entry.includes('upstream/skills/poteto-mode/SKILL.md'));
for (const name of ['investigation', 'verification']) {
  const journey = await json(`journeys/${name}.json`);
  assert.equal(typeof journey.prompt, 'string');
  assert(journey.expected.length > 0);
}
console.log('PASS: 573 pinned files, 58 internal skills, license, single-entry manifest and two journey fixtures. Static integrity only; no behavioral proof.');
