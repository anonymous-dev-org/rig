#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';

const missing = Symbol('missing');
const isJsonObject = x => x !== missing && x !== null && typeof x === 'object' && !Array.isArray(x);
export function merge(previous, local, next) {
  if (equal(previous, local)) return next;
  if (isJsonObject(previous) && isJsonObject(local) && isJsonObject(next)) {
    const result = {};
    for (const key of new Set([...Object.keys(previous), ...Object.keys(local), ...Object.keys(next)])) {
      const get = x => Object.hasOwn(x, key) ? x[key] : missing;
      const value = merge(get(previous), get(local), get(next));
      if (value !== missing) Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
    }
    return result;
  }
  return local;
}
function fileStatus(file) {
  try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
function readJsonObject(file, captured) {
  if (!captured) return missing;
  let value;
  try { value = JSON.parse(captured.data.toString('utf8')); } catch { throw new Error(`Invalid JSON: ${file}`); }
  if (!isJsonObject(value)) throw new Error(`Expected JSON object: ${file}`);
  return value;
}
// All private publications use a sibling temporary: rename never crosses filesystems.
function writeJsonAtomic(file, value, bytes) {
  const temp = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try {
    try {
      fs.writeFileSync(fd, bytes ?? (JSON.stringify(value, null, 2) + '\n')); fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file); syncDirectory(path.dirname(file));
  } finally { if (fileStatus(temp)) fs.unlinkSync(temp); }
}
function syncDirectory(dir) {
  const fd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
export function fillMissing(local, defaults) {
  if (!isJsonObject(local) || !isJsonObject(defaults)) return local;
  const result = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(defaults)])) {
    const value = !Object.hasOwn(local, key) ? defaults[key]
      : Object.hasOwn(defaults, key) ? fillMissing(local[key], defaults[key]) : local[key];
    Object.defineProperty(result, key, {value, enumerable:true, writable:true, configurable:true});
  }
  return result;
}
const within = (file, root) => file === root || file.startsWith(root + path.sep);
function safePath(file) {
  let cursor = path.resolve(file);
  while (true) {
    const st = fileStatus(cursor);
    if (st?.isSymbolicLink()) throw new Error('Unexpected symlink');
    if (cursor !== path.resolve(file) && st && !st.isDirectory()) throw new Error('Invalid path ancestor');
    const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
}
function snapshot(file) {
  const st = fileStatus(file);
  if (!st) return null;
  if (!st.isFile() || st.nlink !== 1) throw new Error('Expected ordinary file without aliases');
  return {data:fs.readFileSync(file), ino:st.ino, dev:st.dev, mtime:st.mtimeMs, mode:st.mode};
}
function unchanged(file, before) {
  const after = snapshot(file);
  if (!equal(before, after)) throw new Error('Concurrent file edit detected');
}
function secureDirectory(dir) {
  const st = fileStatus(dir);
  if (st && (!st.isDirectory() || st.uid !== process.getuid() || (st.mode & 0o022)))
    throw new Error('Untrusted state directory');
}
const heldLocks = new Set();
function validateSync({ baseline, settings, state, sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), legacyRoot, adoption = 'preserve', home }, migrationSource) {
  if (home && path.resolve(home) !== path.resolve(settings)) throw new Error('Legacy migration is not available; use an ordinary home destination');
  if (!['preserve', 'fill-missing'].includes(adoption)) throw new Error('Invalid adoption policy');
  baseline = path.resolve(baseline); settings = path.resolve(settings); state = path.resolve(state);
  const history = path.join(state, 'baseline.json');
  const pending = path.join(state, 'pending.json');
  const effectiveTemp = settings + '.rig-prepared';
  const lock = path.join(path.dirname(state), '.rig-sync.lock');
  const paths = [baseline, settings, state, history, pending, effectiveTemp, lock];
  const migrationLink = migrationSource && fileStatus(settings)?.isSymbolicLink();
  if (migrationLink) {
    safePath(path.dirname(settings));
    if (path.resolve(path.dirname(settings), fs.readlinkSync(settings)) !== path.join(path.resolve(migrationSource), 'pi/.pi/agent/settings.json'))
      throw new Error('Unexpected migration symlink');
  }
  for (const file of paths) if (!(migrationLink && file === settings)) safePath(file);
  for (const root of [sourceRoot, legacyRoot].filter(Boolean).map(x => path.resolve(x))) {
    safePath(root);
    for (const file of [settings, state, lock, effectiveTemp]) if (within(file, root)) throw new Error('Private output inside source checkout');
  }
  for (let i = 0; i < paths.length; i++) for (let j = i + 1; j < paths.length; j++) {
    if ((paths[i] === state && [history, pending].includes(paths[j]))) continue;
    if (within(paths[i], paths[j]) || within(paths[j], paths[i])) throw new Error('Path collision');
  }
  secureDirectory(path.dirname(state)); secureDirectory(state);
  // Validate JSON and recovery before creating even a lock or directory.
  const validate = () => {
    const guards = [baseline, settings, history, pending, effectiveTemp].map(file => {
      const input = migrationLink && file === settings ? path.join(path.resolve(migrationSource), 'pi/.pi/agent/settings.json') : file;
      safePath(input);
      return [file, snapshot(input)];
    });
    const read = file => readJsonObject(file, guards.find(([name]) => name === file)[1]);
    const next = read(baseline);
    if (next === missing) throw new Error('Missing baseline');
    const local = read(settings), previous = read(history), journal = read(pending);
    const prepared = read(effectiveTemp);
    if (journal !== missing && (journal.version !== 1 || !isJsonObject(journal.before) || !isJsonObject(journal.after) ||
        !isJsonObject(journal.baseline) || typeof journal.fresh !== 'boolean' || !['preparing', 'ready'].includes(journal.phase) || journal.effectiveTemp !== effectiveTemp || journal.destination !== settings))
      throw new Error('Invalid recovery record');
    if (prepared !== missing && journal === missing) throw new Error('Orphan recovery file');
    return {next, local, previous, journal, prepared, guards};
  };
  validate();
  return {baseline, settings, state, history, pending, effectiveTemp, lock, paths, validate};
}
export function sync(options) {
  const {lockToken, adoption = 'preserve', interrupt} = options;
  const {baseline, settings, state, history, pending, effectiveTemp, lock, paths, validate} = validateSync(options);
  fs.mkdirSync(path.dirname(state), {recursive:true, mode:0o700});
  let lockFd;
  const borrowed = heldLocks.has(lockToken) && lockToken.lock === lock;
  if (!borrowed) {
    try { lockFd = fs.openSync(lock, 'wx', 0o600); } catch { throw new Error('Rig sync locked; inspect and remove stale lock manually'); }
  }
  try {
    fs.mkdirSync(state, {recursive:true, mode:0o700});
    secureDirectory(path.dirname(state)); secureDirectory(state);
    fs.mkdirSync(path.dirname(settings), {recursive:true, mode:0o700});
    // One engine: recovery advances the historical baseline, then normal sync resumes.
    for (;;) {
      for (const file of paths) safePath(file);
      secureDirectory(path.dirname(state)); secureDirectory(state);
      const {next, local, previous, journal, prepared, guards} = validate();
      const check = () => { for (const file of paths) safePath(file); for (const [file, before] of guards) unchanged(file, before); };
      if (journal !== missing && journal.phase === 'ready' && prepared === missing) {
        if (local === missing) throw new Error('Missing committed recovery destination');
        check(); writeJsonAtomic(history, journal.baseline); fs.unlinkSync(pending); continue;
      }
      const effective = journal !== missing
        ? local === missing ? (journal.fresh ? journal.after : (() => {throw new Error('Missing recovery destination');})()) : merge(journal.before, local, journal.after)
        : local === missing ? next : previous === missing ? (adoption === 'fill-missing' ? fillMissing(local, next) : local) : merge(previous, local, next);
      const record = journal !== missing ? journal : {
        version:1, phase:'preparing', before:local === missing ? effective : local, after:effective, baseline:next,
        fresh:local === missing, effectiveTemp, destination:settings
      };
      check();
      // Publish immutable merge intent first. Preparing + absent sibling is retryable;
      // ready + consumed sibling is committed. Never rebase the intent on recovery.
      if (journal === missing) writeJsonAtomic(pending, record);
      writeJsonAtomic(effectiveTemp, effective, local !== missing && equal(local, effective)
        ? guards.find(([file]) => file === settings)[1].data : undefined);
      if (record.phase !== 'ready') writeJsonAtomic(pending, {...record, phase:'ready'});
      const commitGuards = guards.map(([file, before]) =>
        [file, [pending, effectiveTemp].includes(file) ? snapshot(file) : before]);
      if (interrupt) interrupt('before-effective');
      for (const file of paths) safePath(file);
      for (const [file, before] of commitGuards) unchanged(file, before);
      fs.renameSync(effectiveTemp, settings);
      syncDirectory(path.dirname(settings));
      if (interrupt) interrupt('after-effective');
      // Consumption of the prepared sibling is the commit marker. Recovery never
      // reapplies a committed result over edits made after that publication.
      // Destination may legitimately change after commit; the other inputs must not.
      for (const file of paths) safePath(file);
      for (const [file, before] of commitGuards) {
        if (file !== settings && file !== effectiveTemp) unchanged(file, before);
      }
      writeJsonAtomic(history, record.baseline); fs.unlinkSync(pending);
      syncDirectory(state);
      if (journal !== missing) continue;
      return;
    }
  } finally { if (!borrowed) { fs.closeSync(lockFd); fs.unlinkSync(lock); } }
}
// Explicit migration only. The receipt retains every input byte and identity; the
// existing sync engine owns all merging/recovery in the external workspace.
export function migrateSettings({ baseline, settings, state, migrateFrom, lockToken, sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), interrupt }) {
  if (!migrateFrom) throw new Error('Explicit migration source required');
  [baseline, settings, state, migrateFrom, sourceRoot] = [baseline, settings, state, migrateFrom, sourceRoot].map(x => path.resolve(x));
  const oldSettings = path.join(migrateFrom, 'pi/.pi/agent/settings.json');
  const oldState = path.join(migrateFrom, '.local/pi-settings');
  const sources = [oldSettings, ...['baseline.json', 'pending.json', 'effective.json'].map(x => path.join(oldState, x))];
  const migration = state + '.migration';
  const receiptFile = path.join(migration, 'receipt.json');
  const workspace = path.join(migration, 'effective.json');
  const prepared = settings + '.rig-migration-prepared';
  const lock = path.join(path.dirname(state), '.rig-sync.lock');
  const outputPaths = [settings, state, migration, prepared, lock];
  const encode = s => s && {...s, data:s.data.toString('base64')};
  const decode = s => s && {...s, data:Buffer.from(s.data, 'base64')};
  const homeSnapshot = () => {
    const st = fileStatus(settings);
    if (!st?.isSymbolicLink()) return {kind:'file', value:encode(snapshot(settings))};
    if (path.resolve(path.dirname(settings), fs.readlinkSync(settings)) !== oldSettings) throw new Error('Unexpected migration symlink');
    return {kind:'link', target:fs.readlinkSync(settings), ino:st.ino, dev:st.dev, mtime:st.mtimeMs};
  };
  const validatePaths = () => {
    for (const file of [baseline, migrateFrom, sourceRoot, ...sources, state, migration, prepared, lock]) safePath(file);
    safePath(path.dirname(settings));
    for (const file of outputPaths) for (const root of [sourceRoot, migrateFrom])
      if (within(file, root)) throw new Error('Private output inside source checkout');
    for (let i=0; i<outputPaths.length; i++) for (let j=i+1; j<outputPaths.length; j++)
      if (within(outputPaths[i], outputPaths[j]) || within(outputPaths[j], outputPaths[i])) throw new Error('Path collision');
    for (const file of outputPaths) if (within(baseline,file) || within(file,baseline)) throw new Error('Path collision');
    for (const file of sources) if (within(baseline,file) || within(file,baseline)) throw new Error('Path collision');
    secureDirectory(path.dirname(state)); secureDirectory(state); secureDirectory(migration);
    for (const file of sources) if (fileStatus(file) && fileStatus(file).uid !== process.getuid()) throw new Error('Untrusted legacy owner');
    if (fileStatus(state)) for (const name of fs.readdirSync(state))
      if (!['baseline.json','pending.json'].includes(name)) throw new Error('Unexpected external state file');
    if (fileStatus(oldState)) {
      if (!fileStatus(oldState).isDirectory()) throw new Error('Invalid legacy state');
      for (const name of fs.readdirSync(oldState)) if (!['baseline.json','pending.json','effective.json'].includes(name)) throw new Error('Unexpected legacy state file');
    }
    if (fileStatus(migration)) for (const name of fs.readdirSync(migration))
      if (!['receipt.json','effective.json','effective.json.rig-prepared'].includes(name)) throw new Error('Unexpected migration file');
    for (const file of [receiptFile, workspace, workspace+'.rig-prepared', path.join(state,'baseline.json'), path.join(state,'pending.json')]) safePath(file);
  };
  validatePaths();
  const nextGuard = snapshot(baseline); readJsonObject(baseline, nextGuard);
  if (!nextGuard) throw new Error('Missing baseline');
  let receipt = readJsonObject(receiptFile, snapshot(receiptFile));
  const sourceGuards = sources.map(file => snapshot(file));
  const values = sourceGuards.map((s,i) => readJsonObject(sources[i],s));
  const [local, previous, journal, effective] = values;
  if (journal !== missing && (!isJsonObject(journal.before) || !isJsonObject(journal.after) || !isJsonObject(journal.baseline) ||
      typeof journal.fresh !== 'boolean' || journal.effectiveTemp !== sources[3] || Object.keys(journal).some(k => !['before','after','baseline','fresh','effectiveTemp'].includes(k))))
    throw new Error('Invalid legacy recovery record');
  if ((receipt === missing || !['published','complete'].includes(receipt.phase)) &&
      journal !== missing && local === missing && (effective === missing || !journal.fresh)) throw new Error('Missing legacy recovery destination');
  const homeBefore = homeSnapshot();
  if (receipt === missing) {
    if (fileStatus(state) || (fileStatus(migration) && fs.readdirSync(migration).length) || fileStatus(prepared)) throw new Error('Conflicting external state');
    if (homeBefore.kind === 'file' && homeBefore.value && sourceGuards[0] && !decode(homeBefore.value).data.equals(sourceGuards[0].data)) throw new Error('Differing ordinary settings copies');
    if (homeBefore.kind === 'link' && !sourceGuards[0] && !(journal !== missing && journal.fresh && effective !== missing)) throw new Error('Missing legacy settings');
    receipt = {version:1, phase:'initial', source:migrateFrom, settings, state, baseline, inputs:sourceGuards.map(encode), home:homeBefore};
  } else {
    if (receipt.version !== 1 || !['initial','staged','publishing','published','complete'].includes(receipt.phase) || receipt.source !== migrateFrom || receipt.settings !== settings || receipt.state !== state || receipt.baseline !== baseline || !Array.isArray(receipt.inputs) || receipt.inputs.length !== 4 || !isJsonObject(receipt.home)) throw new Error('Invalid migration receipt');
    for (const s of receipt.inputs) if (s !== null && (!isJsonObject(s) || typeof s.data !== 'string' || !['ino','dev','mtime','mode'].every(k => typeof s[k] === 'number'))) throw new Error('Invalid migration snapshot');
  }
  const checkSources = (allowRemoved = false) => {
    validatePaths();
    sources.forEach((file,i) => { if (!(allowRemoved && !fileStatus(file))) unchanged(file,decode(receipt.inputs[i])); });
  };
  if (!['published','complete'].includes(receipt.phase)) checkSources();
  if (['initial','staged'].includes(receipt.phase) && !equal(homeSnapshot(),receipt.home)) throw new Error('Concurrent home edit detected');
  fs.mkdirSync(path.dirname(state), {recursive:true,mode:0o700});
  let fd;
  const borrowed = heldLocks.has(lockToken) && lockToken.lock === lock;
  if (!borrowed) {
    try {fd = fs.openSync(lock,'wx',0o600);} catch {throw new Error('Rig sync locked; inspect and remove stale lock manually');}
  }
  const token = borrowed ? lockToken : {lock}; heldLocks.add(token);
  try {
    validatePaths(); unchanged(baseline,nextGuard);
    fs.mkdirSync(migration,{mode:0o700,recursive:true});
    const save = phase => {receipt = {...receipt,phase}; writeJsonAtomic(receiptFile,receipt);};
    const stop = phase => {if (interrupt) interrupt(phase);};
    if (receipt.phase === 'initial') {
      checkSources();
      if (!equal(homeSnapshot(),receipt.home)) throw new Error('Concurrent home edit detected');
      save('initial'); stop('migration-snapshot');
      fs.mkdirSync(state,{mode:0o700,recursive:true});
      // Initial materialization is idempotent, but never replaces differing data.
      const seed = (file, value, bytes) => {
        const before = snapshot(file);
        const data = bytes ?? Buffer.from(JSON.stringify(value,null,2)+'\n');
        if (before && !before.data.equals(data)) throw new Error('Conflicting migration staging data');
        if (!before) writeJsonAtomic(file,value,data);
      };
      const initial = local !== missing ? sourceGuards[0].data : homeBefore.kind === 'file' && homeBefore.value ? decode(homeBefore.value).data : null;
      if (initial) seed(workspace,null,initial);
      else if (fileStatus(workspace)) throw new Error('Conflicting migration workspace');
      if ((journal === missing || effective === missing) && fileStatus(path.join(state,'pending.json'))) throw new Error('Conflicting migration journal');
      if (journal === missing && previous === missing && fileStatus(path.join(state,'baseline.json'))) throw new Error('Conflicting migration history');
      if (journal !== missing && effective === missing) seed(path.join(state,'baseline.json'),journal.baseline);
      else if (previous !== missing) seed(path.join(state,'baseline.json'),previous,sourceGuards[1].data);
      if (journal !== missing) {
        if (effective !== missing) {
          seed(workspace+'.rig-prepared',effective,sourceGuards[3].data);
          seed(path.join(state,'pending.json'),{...journal,version:1,phase:'ready',effectiveTemp:workspace+'.rig-prepared',destination:workspace});
        }
        // Without effective.json the legacy publication was committed; the
        // seeded journal baseline advances history without reapplying intent.
      }
      save('staged'); stop('migration-staged');
    }
    if (receipt.phase === 'staged') {
      checkSources();
      sync({baseline,settings:workspace,state,sourceRoot,legacyRoot:migrateFrom,lockToken:token,interrupt});
      checkSources();
      if (!equal(homeSnapshot(),receipt.home)) throw new Error('Concurrent home edit detected');
      receipt.result = snapshot(workspace).data.toString('base64');
      const bytes = Buffer.from(receipt.result,'base64');
      if (fileStatus(prepared) && !snapshot(prepared).data.equals(bytes)) throw new Error('Conflicting migration publication');
      writeJsonAtomic(prepared,null,bytes);
      save('publishing'); stop('migration-before-publication');
    }
    if (receipt.phase === 'publishing') {
      if (typeof receipt.result !== 'string' || !snapshot(workspace)?.data.equals(Buffer.from(receipt.result,'base64'))) throw new Error('Invalid migration result');
      if (fileStatus(prepared)) {
        checkSources();
        if (!equal(homeSnapshot(),receipt.home) || !snapshot(prepared).data.equals(Buffer.from(receipt.result,'base64'))) throw new Error('Concurrent migration publication edit');
        fs.mkdirSync(path.dirname(settings),{recursive:true,mode:0o700});
        fs.renameSync(prepared,settings); syncDirectory(path.dirname(settings));
        stop('migration-after-publication');
      } else if (!fileStatus(settings)?.isFile()) throw new Error('Missing migration publication');
      save('published');
    }
    if (receipt.phase === 'published') {
      // Receipt + consumed sibling is durable proof of publication. Later home
      // edits are never overwritten; external workspace remains the snapshot.
      if (typeof receipt.result !== 'string' || !fileStatus(settings)?.isFile() || !snapshot(workspace)?.data.equals(Buffer.from(receipt.result,'base64'))) throw new Error('Missing external migration publication');
      checkSources(true); stop('migration-before-cleanup'); checkSources(true);
      sources.forEach((file,i) => {
        if (fileStatus(file)) {unchanged(file,decode(receipt.inputs[i])); fs.unlinkSync(file); syncDirectory(path.dirname(file)); stop('migration-cleanup-file');}
      });
      save('complete');
    }
    if (receipt.phase === 'complete') checkSources(true);
  } finally {if (!borrowed) {heldLocks.delete(token); fs.closeSync(fd); fs.unlinkSync(lock);}}
}
// The narrow CLI owns one lock across validation, migration cleanup and both
// independent recoverable transactions. No private inputs are imported implicitly.
export function syncAll({home, sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), migrateFrom}) {
  if (!home) throw new Error('HOME is required');
  home = path.resolve(home); sourceRoot = path.resolve(sourceRoot);
  if (migrateFrom) migrateFrom = path.resolve(migrateFrom);
  const root = path.join(home,'.local/state/rig/pi');
  const lock = path.join(root,'.rig-sync.lock');
  for (const file of [root, lock]) safePath(file);
  for (const checkout of [sourceRoot,migrateFrom].filter(Boolean)) {
    safePath(checkout);
    if (within(root,checkout)) throw new Error('Private output inside source checkout');
    if (fileStatus(path.join(checkout,'pi/.pi/agent/mcp.json')))
      throw new Error('Unexpected checkout mcp.json; preserve it outside rig and reconcile manually before syncing');
    const legacyState = path.join(checkout,'.local/pi-settings');
    safePath(legacyState);
    const legacyStatus = fileStatus(legacyState);
    const emptyLegacy = legacyStatus?.isDirectory() && fs.readdirSync(legacyState).length === 0;
    if ((!migrateFrom || checkout !== migrateFrom) &&
        (fileStatus(path.join(checkout,'pi/.pi/agent/settings.json')) || (legacyStatus && !emptyLegacy)))
      throw new Error('Legacy settings found; use --migrate-from <explicit-main-checkout> (see pi/README.md)');
  }
  secureDirectory(root);
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  let fd;
  try {fd = fs.openSync(lock,'wx',0o600);} catch {throw new Error('Rig sync locked; inspect and remove stale lock manually');}
  const token = {lock}; heldLocks.add(token);
  try {
    const configs = ['settings','mcp'].map(name => ({
      baseline:path.join(sourceRoot,`pi/.pi/agent/${name}.example.json`),
      settings:path.join(home,`.pi/agent/${name}.json`), state:path.join(root,name),
      sourceRoot, legacyRoot:migrateFrom, lockToken:token,
      adoption:name === 'mcp' ? 'fill-missing' : 'preserve'
    }));
    // Reuse the engine's nonmutating validation for every input, including
    // recovery and path trust, before migration or either publication.
    configs.forEach((config, i) => {
      // A resumed migration's engine journal belongs to its external workspace,
      // not the home destination. migrateSettings validates its receipt and home
      // publication inputs before mutating; still preflight that engine state.
      const migration = config.state + '.migration';
      const receiptFile = path.join(migration,'receipt.json');
      if (i === 0 && migrateFrom && fileStatus(receiptFile)) {
        safePath(receiptFile); secureDirectory(migration);
        const receipt = readJsonObject(receiptFile,snapshot(receiptFile));
        if (receipt.version !== 1 || !['initial','staged','publishing','published','complete'].includes(receipt.phase) ||
            receipt.source !== migrateFrom || receipt.settings !== config.settings || receipt.state !== config.state || receipt.baseline !== config.baseline)
          throw new Error('Invalid migration receipt');
        if (receipt.phase === 'complete') validateSync(config);
        else {
          safePath(config.settings + '.rig-prepared');
          if (snapshot(config.settings + '.rig-prepared')) throw new Error('Orphan recovery file');
          validateSync({...config, settings:path.join(migration,'effective.json')});
        }
      } else validateSync(config, i === 0 ? migrateFrom : undefined);
    });
    if (migrateFrom) migrateSettings({...configs[0],migrateFrom});
    for (const config of configs) sync(config);
  } finally {heldLocks.delete(token); fs.closeSync(fd); fs.unlinkSync(lock);}
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2 && !(process.argv.length === 4 && process.argv[2] === '--migrate-from'))
      throw new Error('Usage: node pi/sync-settings.mjs [--migrate-from <main-checkout>]');
    syncAll({home:process.env.HOME,migrateFrom:process.argv[3]});
  } catch (e) {console.error(e.code ? `Pi sync failed (${e.code})` : e.message); process.exitCode = 1;}
}
