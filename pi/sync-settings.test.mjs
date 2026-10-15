import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sync, merge } from './sync-settings.mjs';
function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pi-sync-')));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  const opts = {baseline:path.join(dir,'example'), settings:path.join(dir,'settings'), state:path.join(dir,'state')};
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
  put(o.baseline,{a:1}); fs.unlinkSync(o.settings); fs.symlinkSync('missing',o.settings); assert.throws(run,/Unexpected symlink/);
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
  const journal = get(journalFile); put(journalFile,{...journal,effectiveTemp:o.baseline});
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

test('explicit MCP adoption fills nested missing defaults without replacing overrides', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline,{mcpServers:{playwright:{command:'npx',args:['default']},personal:{enabled:true,env:{A:'default',B:'new'}}}});
  put(o.settings,{mcpServers:{personal:{command:'mine',env:{A:'mine'}}}});
  run({adoption:'fill-missing'});
  assert.deepEqual(get(o.settings),{mcpServers:{playwright:{command:'npx',args:['default']},personal:{command:'mine',enabled:true,env:{A:'mine',B:'new'}}}});
  const local = get(o.settings); delete local.mcpServers.playwright; put(o.settings,local);
  run({adoption:'fill-missing'}); assert.equal(Object.hasOwn(get(o.settings).mcpServers,'playwright'),false);
  assert.equal(fs.statSync(o.state).mode & 0o777,0o700);
});
test('exclusive lock is fail closed, including stale locks', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{a:1});
  const lock = path.join(path.dirname(o.state),'.rig-sync.lock'); fs.writeFileSync(lock,'stale');
  assert.throws(run,/locked/); assert.equal(fs.readFileSync(lock,'utf8'),'stale');
  assert.equal(fs.existsSync(o.settings),false); fs.unlinkSync(lock);
  run({interrupt:phase => {if(phase==='before-effective') assert.throws(run,/locked/);}});
  assert.equal(fs.existsSync(lock),false);
});
test('concurrent edits fail before commit and are preserved on recovery', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1,b:1}); run();
  put(o.baseline,{a:2,b:2});
  assert.throws(() => run({interrupt:phase => {if(phase==='before-effective') put(o.settings,{a:9,b:1});}}),/Concurrent/);
  assert.deepEqual(get(o.settings),{a:9,b:1}); run(); assert.deepEqual(get(o.settings),{a:9,b:2});
  put(o.baseline,{a:3,b:3});
  assert.throws(() => run({interrupt:phase => {if(phase==='before-effective') put(o.baseline,{a:4,b:4});}}),/Concurrent/);
  run(); assert.deepEqual(get(o.settings),{a:9,b:4});
});
test('source, legacy, collisions, hardlinks and redirected ancestors are rejected before writes', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{a:1});
  assert.throws(() => run({sourceRoot:path.dirname(o.settings)}),/source checkout/);
  assert.throws(() => run({legacyRoot:path.dirname(o.settings)}),/source checkout/);
  assert.throws(() => run({settings:o.baseline}),/collision/);
  fs.linkSync(o.baseline,o.settings); assert.throws(run,/aliases/); fs.unlinkSync(o.settings);
  const real = path.join(path.dirname(o.state),'real'); fs.mkdirSync(real);
  fs.symlinkSync(real,o.state); assert.throws(run,/symlink/); fs.unlinkSync(o.state);
  assert.equal(fs.existsSync(o.settings),false);
});
test('parse errors never include synthetic private content', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{});
  fs.writeFileSync(o.settings,'SYNTHETIC_PRIVATE_SENTINEL');
  assert.throws(run, e => !e.message.includes('SYNTHETIC_PRIVATE_SENTINEL'));
});

test('repeated interrupted recovery does not resurrect reverted overrides', t => {
  const {opts:o,put,get,run} = fixture(t);
  put(o.baseline,{a:1,b:1}); run(); put(o.baseline,{a:2,b:2});
  const stop = {interrupt:phase => {if (phase === 'before-effective') throw Error('stop');}};
  assert.throws(() => run(stop)); put(o.settings,{a:9,b:1});
  assert.throws(() => run(stop)); put(o.settings,{a:1,b:1}); run();
  assert.deepEqual(get(o.settings),{a:2,b:2});
});
test('filesystem publication failures leave retryable intent', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1});
  const rename = fs.renameSync, fsync = fs.fsyncSync;
  for (const boundary of ['journal', 'prepared', 'directory', 'file']) {
    let fired = false;
    fs.renameSync = (from,to) => {
      if (!fired && ((boundary === 'journal' && to.endsWith('pending.json')) ||
          (boundary === 'prepared' && to.endsWith('.rig-prepared')))) {
        fired = true;
        if (boundary === 'prepared') rename(from,to);
        throw Error('injected publication failure');
      }
      return rename(from,to);
    };
    fs.fsyncSync = fd => {
      if (!fired && ((boundary === 'directory' && fs.fstatSync(fd).isDirectory()) ||
          (boundary === 'file' && fs.fstatSync(fd).isFile()))) {
        fired = true; throw Error('injected fsync failure');
      }
      return fsync(fd);
    };
    try { assert.throws(run,/injected/); } finally {fs.renameSync = rename; fs.fsyncSync = fsync;}
    assert.equal(fired,true); run(); assert.deepEqual(get(o.settings),{a:1});
  }
});
test('captured input bytes and original guards survive reads and preparation', t => {
  const {opts:o,put,get,run} = fixture(t); put(o.baseline,{a:1,b:1}); run();
  for (const boundary of ['read','prepare']) {
    put(o.baseline,{a:1,b:1}); put(o.settings,{a:1,b:1}); run();
    put(o.baseline,{a:2,b:2});
    const read = fs.readFileSync, rename = fs.renameSync; let fired = false, reads = 0;
    fs.readFileSync = (file,...args) => {
      const bytes = read(file,...args);
      if (file === o.settings) reads++;
      if (!fired && boundary === 'read' && file === o.settings && reads === 3) {fired = true; put(o.settings,{a:9,b:1});}
      return bytes;
    };
    fs.renameSync = (from,to) => {
      const result = rename(from,to);
      if (!fired && boundary === 'prepare' && to.endsWith('.rig-prepared')) {fired = true; put(o.settings,{a:9,b:1});}
      return result;
    };
    try {assert.throws(run,/Concurrent/);} finally {fs.readFileSync = read; fs.renameSync = rename;}
    assert.equal(fired,true); assert.deepEqual(get(o.settings),{a:9,b:1}); run();
    assert.deepEqual(get(o.settings),{a:9,b:2});
  }
});
test('untrusted state directory permissions and ownership fail closed', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{});
  fs.mkdirSync(o.state); fs.chmodSync(o.state,0o777); assert.throws(run,/Untrusted/);
  fs.chmodSync(o.state,0o755);
  const lstat = fs.lstatSync;
  fs.lstatSync = (file,...args) => {
    const st = lstat(file,...args);
    if (file === o.state) Object.defineProperty(st,'uid',{value:process.getuid()+1});
    return st;
  };
  try {assert.throws(run,/Untrusted/);} finally {fs.lstatSync = lstat;}
  run();
});
test('generated paths and lock reject ancestor collisions', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{});
  for (const overrides of [
    {baseline:o.settings+'.rig-prepared/child'},
    {baseline:path.join(path.dirname(o.state),'.rig-sync.lock','child')},
    {settings:path.join(o.state,'baseline.json','child')},
    {state:o.settings+'.rig-prepared/child'},
    {settings:path.join(path.dirname(o.state),'.rig-sync.lock','child')}
  ]) assert.throws(() => run(overrides),/collision/);
  assert.equal(fs.existsSync(o.settings),false);
});

test('settings first adoption retains original local bytes', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{new:1});
  const bytes = '{ "local": 9 }\n'; fs.writeFileSync(o.settings,bytes); run();
  assert.equal(fs.readFileSync(o.settings,'utf8'),bytes);
});
