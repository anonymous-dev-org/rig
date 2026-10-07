import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sync, merge } from './sync-settings.mjs';
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-sync-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const opts = {baseline:path.join(dir,'example'), settings:path.join(dir,'settings'), home:path.join(dir,'home'), state:path.join(dir,'state')};
  const put = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
  const get = file => JSON.parse(fs.readFileSync(file));
  return {opts, put, get, run: extra => sync({...opts,...extra})};
}
test('fresh, recursive defaults, user changes, atomic arrays and idempotence', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline, {a:1, gone:1, nested:{a:1,b:2}, list:[1], deleted:1, nullable:null}); run();
  assert.deepEqual(get(o.settings), get(o.baseline));
  put(o.settings, {a:9,gone:1,nested:{a:1,b:8,extra:3},list:[9],nullable:null});
  put(o.baseline, {a:2,nested:{a:2,b:3},list:[2],deleted:2,nullable:{x:1},new:4}); run();
  assert.deepEqual(get(o.settings), {a:9,nested:{a:2,b:8,extra:3},list:[9],nullable:{x:1},new:4});
  const before = fs.readFileSync(o.settings,'utf8'); run(); assert.equal(fs.readFileSync(o.settings,'utf8'),before);
  assert.equal(fs.statSync(o.settings).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(o.state,'baseline.json')).mode & 0o777, 0o600);
});
test('adopts existing without history and preserves special keys and null', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline,{a:2}); put(o.settings,JSON.parse('{"__proto__":{"safe":1},"constructor":null,"a":1}')); run();
  assert.equal(get(o.settings).a,1); assert.equal(get(o.settings).constructor,null);
  put(o.baseline,JSON.parse('{"a":3,"__proto__":{"default":2}}')); run();
  assert.deepEqual(get(o.settings).__proto__,{safe:1});
});
test('invalid inputs and unexpected/dangling symlinks leave files unchanged', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{a:1}); put(o.settings,{a:9});
  for (const invalid of ['secret invalid','null','[]']) {
    fs.writeFileSync(o.baseline,invalid); assert.throws(run,/Invalid JSON|Expected JSON object/);
    assert.equal(fs.readFileSync(o.settings,'utf8'),'{"a":9}');
  }
  put(o.baseline,{a:1}); fs.symlinkSync('missing',o.home); assert.throws(run,/Unexpected symlink/);
  fs.unlinkSync(o.home); fs.unlinkSync(o.settings); fs.symlinkSync('missing',o.settings); assert.throws(run,/Expected ordinary file/);
});
test('ordinary home migration, differing-copy conflict, expected symlink', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1}); put(o.home,{a:8}); run();
  assert.deepEqual(get(o.settings),{a:8}); assert.equal(fs.existsSync(o.home),false);
  fs.symlinkSync(o.settings,o.home); run(); assert.equal(fs.lstatSync(o.home).isSymbolicLink(),true);
  fs.unlinkSync(o.home); put(o.home,{a:3}); assert.throws(run,/Config conflict/); assert.deepEqual(get(o.home),{a:3});
});
test('interrupted transaction keeps subsequent user edits and advances history', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1,b:1}); run();
  put(o.baseline,{a:2,b:2}); assert.throws(() => run({interrupt:phase=>{if (phase === 'after-effective') throw Error('stop');}}));
  put(o.settings,{a:7,b:2}); put(o.baseline,{a:3,b:3}); run();
  assert.deepEqual(get(o.settings),{a:7,b:3}); assert.equal(fs.existsSync(path.join(o.state,'pending.json')),false);
});
test('fresh interruption recovery and cwd independence', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1});
  assert.throws(() => run({interrupt:phase=>{if (phase === 'after-effective') throw Error('stop');}})); put(o.baseline,{a:2});
  const cwd = process.cwd(); try {process.chdir(os.tmpdir()); run();} finally {process.chdir(cwd);}
  assert.deepEqual(get(o.settings),{a:2});
});
test('committed recovery preserves deliberate reversions of scalars, additions and deletions', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline,{a:1,removed:1,nested:{a:1}}); run();
  put(o.baseline,{a:2,added:2,nested:{a:2}});
  assert.throws(() => run({interrupt:phase=>{if(phase==='after-effective') throw Error('stop');}}));
  put(o.settings,{a:1,removed:1,nested:{a:1}}); run();
  assert.deepEqual(get(o.settings),{a:1,removed:1,nested:{a:1}});
});
test('pre-commit recovery preserves edits and is retryable before and after rename', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline,{a:1,b:1,nested:{a:1}}); run();
  put(o.baseline,{a:2,b:2,nested:{a:2}});
  const stop = at => ({interrupt:phase=>{if(phase===at) throw Error('stop');}});
  assert.throws(() => run(stop('before-effective')));
  assert.deepEqual(get(o.settings),{a:1,b:1,nested:{a:1}});
  put(o.settings,{a:7,b:1,nested:{a:1}});
  assert.throws(() => run(stop('before-effective')));
  assert.throws(() => run(stop('after-effective')));
  put(o.settings,{a:1,b:1,nested:{a:1}}); run();
  assert.deepEqual(get(o.settings),{a:1,b:1,nested:{a:1}});
});
test('fresh pre-commit recovery and strict recovery-path validation', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1});
  assert.throws(() => run({interrupt:phase=>{if(phase==='before-effective') throw Error('stop');}}));
  assert.equal(fs.existsSync(o.settings),false);
  const journalFile = path.join(o.state,'pending.json');
  const journal = get(journalFile); put(journalFile,{...journal,effectiveTemp:o.home});
  assert.throws(run,/Invalid recovery record/); assert.equal(fs.existsSync(o.settings),false);
  put(journalFile,journal); run(); assert.deepEqual(get(o.settings),{a:1});
});

test('merge output matches parsed JSON prototypes without special-key setters', () => {
  const prior = JSON.parse('{"nested":{"__proto__":{"a":1},"a":1}}');
  const local = JSON.parse('{"nested":{"__proto__":{"a":1},"a":9}}');
  const result = merge(prior, local, {nested:{a:2}});
  const parsed = JSON.parse(JSON.stringify(result));
  assert.deepEqual(result, parsed);
  assert.deepEqual(merge(parsed, result, {}), {});
});
