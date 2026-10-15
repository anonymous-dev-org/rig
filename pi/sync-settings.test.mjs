import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sync, merge, migrateSettings } from './sync-settings.mjs';
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

function migrationFixture(t) {
  const f = fixture(t), root = path.dirname(f.opts.state);
  const legacy = path.join(root,'checkout'), sourceRoot = path.join(root,'worktree');
  const old = path.join(legacy,'pi/.pi/agent/settings.json'), oldState = path.join(legacy,'.local/pi-settings');
  fs.mkdirSync(path.dirname(old),{recursive:true}); fs.mkdirSync(oldState,{recursive:true}); fs.mkdirSync(sourceRoot);
  f.put(f.opts.baseline,{a:2,b:2}); f.put(old,{a:1,b:9}); f.put(path.join(oldState,'baseline.json'),{a:1,b:1});
  fs.symlinkSync(path.relative(path.dirname(f.opts.settings),old),f.opts.settings);
  return {...f, old, oldState, legacy, sourceRoot, migrate: extra => migrateSettings({...f.opts,migrateFrom:legacy,sourceRoot,...extra})};
}
test('relative legacy link migrates history and private snapshot with verified individual cleanup', t => {
  const f = migrationFixture(t); f.put(f.old,{a:1,b:9,private:'SYNTHETIC_PRIVATE_SENTINEL'});
  const sentinel = path.join(f.legacy,'unrelated'); fs.writeFileSync(sentinel,'keep');
  f.migrate();
  assert.equal(fs.lstatSync(f.opts.settings).isFile(),true);
  assert.deepEqual(f.get(f.opts.settings),{a:2,b:9,private:'SYNTHETIC_PRIVATE_SENTINEL'});
  assert.equal(fs.existsSync(f.old),false); assert.equal(fs.readdirSync(f.oldState).length,0);
  assert.equal(fs.readFileSync(sentinel,'utf8'),'keep');
  assert.equal(f.get(f.opts.state+'.migration/receipt.json').phase,'complete');
  assert.equal(fs.statSync(f.opts.state+'.migration').mode & 0o777,0o700);
  for (const file of [f.opts.settings,f.opts.state+'/baseline.json',f.opts.state+'.migration/receipt.json',f.opts.state+'.migration/effective.json']) assert.equal(fs.statSync(file).mode & 0o777,0o600);
  f.put(f.opts.settings,{edited:3}); f.migrate(); assert.deepEqual(f.get(f.opts.settings),{edited:3});
});
test('migration preserves deliberate historical deletions', t => {
  const f = migrationFixture(t); f.put(f.old,{b:9}); f.migrate();
  assert.deepEqual(f.get(f.opts.settings),{b:9});
  sync({...f.opts,sourceRoot:f.sourceRoot,legacyRoot:f.legacy}); assert.deepEqual(f.get(f.opts.settings),{b:9});
});
test('migration ordinary differing copies and unexpected paths fail before private writes', t => {
  const f = migrationFixture(t); fs.unlinkSync(f.opts.settings); f.put(f.opts.settings,{different:1});
  assert.throws(f.migrate,/Differing/); assert.equal(fs.existsSync(f.opts.state+'.migration'),false);
  f.put(f.opts.settings,{a:1,b:9}); fs.writeFileSync(path.join(f.oldState,'surprise'),'sentinel');
  assert.throws(f.migrate,/Unexpected legacy/); assert.equal(fs.existsSync(f.opts.state),false);
  fs.unlinkSync(path.join(f.oldState,'surprise')); fs.unlinkSync(f.opts.settings); fs.symlinkSync(f.opts.baseline,f.opts.settings);
  assert.throws(f.migrate,/Unexpected migration symlink/);
});
test('migration retries all durable boundaries and preserves post-publication edits', t => {
  for (const boundary of ['migration-snapshot','migration-staged','before-effective','after-effective','migration-before-publication','migration-after-publication','migration-before-cleanup','migration-cleanup-file']) {
    const f = migrationFixture(t); let fired = false;
    assert.throws(() => f.migrate({interrupt:phase => {if (!fired && phase === boundary) {fired=true; throw Error('injected');}}}),/injected/);
    assert.equal(fired,true,boundary);
    const published = ['migration-after-publication','migration-before-cleanup','migration-cleanup-file'].includes(boundary);
    if (published) f.put(f.opts.settings,{later:7});
    f.migrate();
    assert.deepEqual(f.get(f.opts.settings),published ? {later:7} : {a:2,b:9});
    assert.equal(fs.existsSync(f.old),false);
  }
});
test('legacy pending prepared and consumed cases reuse engine and retain all recovery bytes', t => {
  for (const prepared of [true,false]) {
    const f = migrationFixture(t);
    const journal = {before:{a:1,b:9},after:{a:3,b:9},baseline:{a:3,b:1},fresh:false,effectiveTemp:path.join(f.oldState,'effective.json')};
    f.put(path.join(f.oldState,'pending.json'),journal);
    if (prepared) f.put(journal.effectiveTemp,journal.after);
    else f.put(f.old,{a:8,b:9});
    f.migrate(); assert.deepEqual(f.get(f.opts.settings),{a:prepared ? 2 : 8,b:9});
    const receipt = f.get(f.opts.state+'.migration/receipt.json');
    assert.deepEqual(JSON.parse(Buffer.from(receipt.inputs[2].data,'base64')),journal);
    assert.equal(receipt.inputs[3] !== null,prepared);
  }
});
test('pending legacy transactions retry partial cleanup without overwriting later home edits', t => {
  for (const prepared of [true,false]) {
    const f = migrationFixture(t);
    const journal = {before:{a:1,b:9},after:{a:3,b:9},baseline:{a:3,b:1},fresh:false,effectiveTemp:path.join(f.oldState,'effective.json')};
    f.put(path.join(f.oldState,'pending.json'),journal);
    if (prepared) f.put(journal.effectiveTemp,journal.after);
    let interrupted = false;
    assert.throws(() => f.migrate({interrupt:phase => {
      if (!interrupted && phase === 'migration-cleanup-file') {interrupted = true; throw Error('cleanup interrupted');}
    }}),/cleanup interrupted/);
    assert.equal(fs.existsSync(f.old),false);
    assert.equal(fs.existsSync(path.join(f.oldState,'pending.json')),true);
    f.put(f.opts.settings,{later:7});
    f.migrate();
    assert.deepEqual(f.get(f.opts.settings),{later:7});
    assert.equal(fs.readdirSync(f.oldState).length,0);
    assert.equal(f.get(f.opts.state+'.migration/receipt.json').phase,'complete');
  }
});
test('legacy redirected recovery path, external outputs in checkouts, and permissions fail closed', t => {
  const f = migrationFixture(t);
  f.put(path.join(f.oldState,'pending.json'),{before:{},after:{},baseline:{},fresh:false,effectiveTemp:f.opts.baseline});
  assert.throws(f.migrate,/Invalid legacy recovery/); assert.equal(fs.existsSync(f.opts.state),false);
  fs.unlinkSync(path.join(f.oldState,'pending.json'));
  assert.throws(() => f.migrate({state:path.join(f.legacy,'state')}),/source checkout/);
  fs.mkdirSync(f.opts.state+'.migration'); fs.chmodSync(f.opts.state+'.migration',0o777);
  assert.throws(f.migrate,/Untrusted/);
});
test('migration rejects concurrent home/source edits without cleanup and shares the sync lock', t => {
  const f = migrationFixture(t);
  assert.throws(() => f.migrate({interrupt:phase => {if (phase === 'migration-before-publication') f.put(f.old,{changed:1});}}),/Concurrent/);
  assert.equal(fs.existsSync(f.old),true); assert.equal(fs.lstatSync(f.opts.settings).isSymbolicLink(),true);
  const g = migrationFixture(t);
  assert.throws(() => g.migrate({interrupt:phase => {if (phase === 'migration-staged') {assert.throws(() => sync({...g.opts,settings:path.join(path.dirname(g.opts.settings),'other')}),/locked/); throw Error('stop');}}}),/stop/);
  g.migrate();
});

test('fresh prepared legacy transaction recovers a dangling expected home link', t => {
  const f = migrationFixture(t); fs.unlinkSync(f.old); fs.unlinkSync(path.join(f.oldState,'baseline.json'));
  const after = {a:1,b:1};
  f.put(path.join(f.oldState,'effective.json'),after);
  f.put(path.join(f.oldState,'pending.json'),{before:after,after,baseline:after,fresh:true,effectiveTemp:path.join(f.oldState,'effective.json')});
  f.migrate(); assert.deepEqual(f.get(f.opts.settings),{a:2,b:2});
});
test('migration retains orphan legacy effective input without treating it as committed intent', t => {
  const f = migrationFixture(t); f.put(path.join(f.oldState,'effective.json'),{uncommitted:'sentinel'});
  f.migrate(); assert.deepEqual(f.get(f.opts.settings),{a:2,b:9});
  const receipt = f.get(f.opts.state+'.migration/receipt.json');
  assert.deepEqual(JSON.parse(Buffer.from(receipt.inputs[3].data,'base64')),{uncommitted:'sentinel'});
});
test('migration rejects malformed receipt, external conflicts, and home edits before publication', t => {
  const f = migrationFixture(t);
  assert.throws(() => f.migrate({interrupt:phase => {if(phase==='migration-staged') throw Error('stop');}}),/stop/);
  const receipt = f.opts.state+'.migration/receipt.json', saved = f.get(receipt);
  f.put(receipt,{...saved,inputs:[]}); assert.throws(f.migrate,/Invalid migration receipt/);
  f.put(receipt,saved); fs.unlinkSync(f.opts.settings); f.put(f.opts.settings,{edited:1});
  assert.throws(f.migrate,/Concurrent home/); assert.equal(fs.existsSync(f.old),true);
  const g = migrationFixture(t); fs.mkdirSync(g.opts.state); g.put(path.join(g.opts.state,'baseline.json'),{});
  assert.throws(g.migrate,/Conflicting external state/); assert.equal(fs.existsSync(g.old),true);
});
test('migration filesystem failures before receipt and after home rename remain retryable', t => {
  for (const boundary of ['receipt','home','history']) {
    const f = migrationFixture(t), rename = fs.renameSync; let fired = false;
    fs.renameSync = (from,to) => {
      if (!fired && ((boundary === 'receipt' && to.endsWith('/receipt.json')) ||
          (boundary === 'home' && to === f.opts.settings) ||
          (boundary === 'history' && to === path.join(f.opts.state,'baseline.json')))) {
        fired = true;
        if (boundary !== 'receipt') rename(from,to);
        throw Error('injected migration IO');
      }
      return rename(from,to);
    };
    try {assert.throws(f.migrate,/injected migration IO/);} finally {fs.renameSync = rename;}
    assert.equal(fired,true);
    if (boundary === 'home') f.put(f.opts.settings,{later:1});
    f.migrate(); assert.deepEqual(f.get(f.opts.settings),boundary === 'home' ? {later:1} : {a:2,b:9});
  }
});
test('migration same-byte source replacement fails identity checks and never cleans replacement', t => {
  const f = migrationFixture(t);
  assert.throws(() => f.migrate({interrupt:phase => {
    if (phase === 'migration-before-cleanup') {
      const bytes = fs.readFileSync(f.old), sibling = f.old+'.replacement';
      fs.writeFileSync(sibling,bytes); fs.renameSync(sibling,f.old);
    }
  }}),/Concurrent/);
  assert.equal(fs.existsSync(f.old),true);
});

test('settings first adoption retains original local bytes', t => {
  const {opts:o,put,run} = fixture(t); put(o.baseline,{new:1});
  const bytes = '{ "local": 9 }\n'; fs.writeFileSync(o.settings,bytes); run();
  assert.equal(fs.readFileSync(o.settings,'utf8'),bytes);
});

function cliFixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pi-cli-')));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const repo = path.join(dir,'repo'), home = path.join(dir,'home');
  fs.mkdirSync(path.join(repo,'pi/.pi/agent'),{recursive:true}); fs.mkdirSync(home);
  for (const file of ['sync-settings.mjs','.pi/agent/settings.example.json','.pi/agent/mcp.example.json'])
    fs.copyFileSync(new URL(file,import.meta.url),path.join(repo,'pi',file));
  const run = (...args) => spawnSync(process.execPath,[path.join(repo,'pi/sync-settings.mjs'),...args],{cwd:dir,env:{...process.env,HOME:home},encoding:'utf8'});
  return {repo,home,run};
}
test('CLI bootstraps both ordinary home configs and repeats independently of cwd', t => {
  const {repo,home,run} = cliFixture(t);
  assert.equal(run().status,0); assert.equal(run().status,0);
  const mcp = JSON.parse(fs.readFileSync(path.join(home,'.pi/agent/mcp.json')));
  assert.deepEqual(mcp.mcpServers.playwright,{command:'bunx',args:['@playwright/mcp@latest','--isolated','--headless']});
  for (const name of ['settings','mcp']) {
    assert.ok(fs.lstatSync(path.join(home,`.pi/agent/${name}.json`)).isFile());
    assert.equal(fs.existsSync(path.join(repo,`pi/.pi/agent/${name}.json`)),false);
  }
  assert.equal(fs.existsSync(path.join(repo,'.local')),false);
});
test('CLI explicit migration and MCP bootstrap share one lock and retain external state', t => {
  const {repo,home,run} = cliFixture(t);
  const main = path.join(path.dirname(repo),'main');
  fs.mkdirSync(path.join(main,'pi/.pi/agent'),{recursive:true});
  fs.mkdirSync(path.join(home,'.pi/agent'),{recursive:true});
  const old = path.join(main,'pi/.pi/agent/settings.json');
  fs.writeFileSync(old,'{"personal":true}');
  fs.mkdirSync(path.join(main,'.local/pi-settings'),{recursive:true});
  fs.writeFileSync(path.join(main,'.local/pi-settings/baseline.json'),'{}');
  for (const file of ['sync-settings.mjs','.pi/agent/settings.example.json','.pi/agent/mcp.example.json'])
    fs.copyFileSync(path.join(repo,'pi',file),path.join(main,'pi',file));
  fs.symlinkSync(path.relative(path.join(home,'.pi/agent'),old),path.join(home,'.pi/agent/settings.json'));
  const result = run('--migrate-from',main); assert.equal(result.status,0,result.stderr);
  assert.equal(fs.existsSync(old),false);
  assert.ok(fs.lstatSync(path.join(home,'.pi/agent/settings.json')).isFile());
  assert.equal(JSON.parse(fs.readFileSync(path.join(home,'.pi/agent/settings.json'))).personal,true);
  assert.equal(run('--migrate-from',main).status,0);
  const mainRun = spawnSync(process.execPath,[path.join(main,'pi/sync-settings.mjs')],{env:{...process.env,HOME:home},encoding:'utf8'});
  assert.equal(mainRun.status,0,mainRun.stderr);
  assert.equal(run().status,0);
  assert.equal(fs.existsSync(path.join(repo,'.local')),false);
});
test('completed migration receipts allow ordinary home transaction recovery on explicit retry', t => {
  for (const boundary of ['before-effective','after-effective']) {
    const {repo,home,run} = cliFixture(t);
    const main = path.join(path.dirname(repo),'main');
    fs.mkdirSync(path.join(main,'pi/.pi/agent'),{recursive:true});
    fs.mkdirSync(path.join(home,'.pi/agent'),{recursive:true});
    const old = path.join(main,'pi/.pi/agent/settings.json');
    const settings = path.join(home,'.pi/agent/settings.json');
    fs.writeFileSync(old,'{"personal":true}');
    fs.symlinkSync(path.relative(path.dirname(settings),old),settings);
    assert.equal(run('--migrate-from',main).status,0);
    const baseline = path.join(repo,'pi/.pi/agent/settings.example.json');
    const defaults = JSON.parse(fs.readFileSync(baseline)); defaults.recoveryRegression = true;
    fs.writeFileSync(baseline,JSON.stringify(defaults));
    assert.throws(() => sync({baseline,settings,state:path.join(home,'.local/state/rig/pi/settings'),sourceRoot:repo,legacyRoot:main,
      interrupt:phase => {if (phase === boundary) throw Error('ordinary transaction interrupted');}}),/ordinary transaction interrupted/);
    const current = JSON.parse(fs.readFileSync(settings)); current.laterEdit = true;
    fs.writeFileSync(settings,JSON.stringify(current));
    const result = run('--migrate-from',main);
    assert.equal(result.status,0,result.stderr);
    const recovered = JSON.parse(fs.readFileSync(settings));
    assert.equal(recovered.recoveryRegression,true); assert.equal(recovered.laterEdit,true);
    assert.equal(fs.existsSync(path.join(home,'.local/state/rig/pi/settings/pending.json')),false);
  }
});
test('CLI prevalidates MCP before settings mutation and honors shared lock', t => {
  const {home,run} = cliFixture(t);
  fs.mkdirSync(path.join(home,'.pi/agent'),{recursive:true});
  const settings = path.join(home,'.pi/agent/settings.json');
  fs.writeFileSync(settings,'{"private":true}');
  fs.writeFileSync(path.join(home,'.pi/agent/mcp.json'),'invalid-private-value');
  const result = run(); assert.equal(result.status,1); assert.match(result.stderr,/Invalid JSON/);
  assert.ok(!result.stderr.includes('invalid-private-value'));
  assert.equal(fs.readFileSync(settings,'utf8'),'{"private":true}');
  fs.writeFileSync(path.join(home,'.pi/agent/mcp.json'),'{}');
  fs.writeFileSync(path.join(home,'.local/state/rig/pi/.rig-sync.lock'),'');
  assert.match(run().stderr,/locked/);
  assert.equal(fs.readFileSync(settings,'utf8'),'{"private":true}');
});
for (const invalid of ['pending','history','state-link','orphan']) {
  test(`CLI rejects MCP ${invalid} before settings or settings-state publication, including migration`, t => {
    for (const migration of [false,true]) {
      const {repo,home,run} = cliFixture(t);
      fs.mkdirSync(path.join(home,'.pi/agent'),{recursive:true});
      const settings = path.join(home,'.pi/agent/settings.json');
      const root = path.join(home,'.local/state/rig/pi');
      fs.mkdirSync(root,{recursive:true,mode:0o700});
      let main;
      if (migration) {
        main = path.join(path.dirname(repo),'main');
        fs.mkdirSync(path.join(main,'pi/.pi/agent'),{recursive:true});
        const old = path.join(main,'pi/.pi/agent/settings.json');
        fs.writeFileSync(old,'{"private":true}');
        fs.symlinkSync(old,settings);
      } else fs.writeFileSync(settings,'{"private":true}');
      const state = path.join(root,'settings');
      if (!migration) {
        fs.mkdirSync(state,{mode:0o700});
        fs.writeFileSync(path.join(state,'baseline.json'),'{}');
      }
      const before = fs.readFileSync(settings);
      const beforeHistory = !migration && fs.readFileSync(path.join(state,'baseline.json'));
      const mcpState = path.join(root,'mcp');
      if (invalid === 'state-link') fs.symlinkSync(state,mcpState);
      else {
        fs.mkdirSync(mcpState,{mode:0o700});
        if (invalid === 'orphan') fs.writeFileSync(path.join(home,'.pi/agent/mcp.json.rig-prepared'),'{}');
        else fs.writeFileSync(path.join(mcpState,invalid === 'history' ? 'baseline.json' : 'pending.json'),'invalid');
      }
      const result = migration ? run('--migrate-from',main) : run();
      assert.equal(result.status,1,result.stderr);
      assert.deepEqual(fs.readFileSync(settings),before);
      if (migration) {
        assert.ok(fs.lstatSync(settings).isSymbolicLink());
        assert.equal(fs.existsSync(state),false);
        assert.equal(fs.existsSync(state+'.migration'),false);
      } else {
        assert.deepEqual(fs.readdirSync(state),['baseline.json']);
        assert.deepEqual(fs.readFileSync(path.join(state,'baseline.json')),beforeHistory);
      }
    }
  });
}
test('CLI rejects ignored effective checkout copies with guidance', t => {
  const {repo,run} = cliFixture(t);
  const stale = path.join(repo,'pi/.pi/agent/mcp.json'); fs.writeFileSync(stale,'{}');
  assert.match(run().stderr,/Unexpected checkout mcp.json/); fs.unlinkSync(stale);
  fs.writeFileSync(path.join(repo,'pi/.pi/agent/settings.json'),'{}');
  assert.match(run().stderr,/--migrate-from/);
});
test('both script cleanup loops protect ordinary private configs and Stow excludes tooling', t => {
  for (const script of ['init.sh','update.sh']) {
    const {repo,home,run} = cliFixture(t);
    assert.equal(run().status,0);
    for (const name of ['settings','mcp']) fs.writeFileSync(path.join(repo,`pi/.pi/agent/${name}.json`),'{}');
    for (const file of ['.stow-local-ignore','README.md','sync-settings.test.mjs'])
      fs.copyFileSync(new URL(file,import.meta.url),path.join(repo,'pi',file));
    const text = fs.readFileSync(new URL(`../${script}`,import.meta.url),'utf8');
    // Execute only the exact Pi preparation function and cleanup loop, never
    // broad init/update, git, npm, brew or unrelated package operations.
    const preparation = text.match(/prepare_package_config\(\) \{[\s\S]*?\n\}/)[0];
    const loop = text.match(/    while IFS=[\s\S]*?done < <\(find[^\n]+/)[0];
    const before = ['settings','mcp'].map(n=>fs.readFileSync(path.join(home,`.pi/agent/${n}.json`),'utf8'));
    let result = spawnSync('bash',['-c',`${preparation}\nprepare_package_config pi`],{env:{...process.env,HOME:home,SCRIPT_DIR:repo},encoding:'utf8'});
    assert.equal(result.status,1); assert.match(result.stderr,/Unexpected checkout mcp.json/);
    result = spawnSync('bash',['-c',`pkg=pi\n${loop}`],{env:{...process.env,HOME:home,SCRIPT_DIR:repo},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(['settings','mcp'].map(n=>fs.readFileSync(path.join(home,`.pi/agent/${n}.json`),'utf8')),before);
    result = spawnSync('stow',['--restow','--no-folding','-d',repo,'-t',home,'pi'],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    for (const file of ['README.md','sync-settings.mjs','sync-settings.test.mjs','.pi/agent/settings.example.json','.pi/agent/mcp.example.json'])
      assert.equal(fs.existsSync(path.join(home,file)),false,file);
    assert.deepEqual(['settings','mcp'].map(n=>fs.readFileSync(path.join(home,`.pi/agent/${n}.json`),'utf8')),before);
    assert.equal(fs.existsSync(path.join(repo,'.local')),false);
    // Successful preparation, cleanup and Stow in the same extracted sequence.
    for (const name of ['settings','mcp']) fs.unlinkSync(path.join(repo,`pi/.pi/agent/${name}.json`));
    result = spawnSync('bash',['-c',`${preparation}\nprepare_package_config pi && {\npkg=pi\n${loop}\n} && stow --restow --no-folding -d "$SCRIPT_DIR" -t "$HOME" pi`],{env:{...process.env,HOME:home,SCRIPT_DIR:repo},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(['settings','mcp'].map(n=>fs.readFileSync(path.join(home,`.pi/agent/${n}.json`),'utf8')),before);
  }
});
