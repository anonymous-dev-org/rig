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
export function sync({ baseline, settings, state, sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), legacyRoot, adoption = 'preserve', interrupt, home }) {
  if (home && path.resolve(home) !== path.resolve(settings)) throw new Error('Legacy migration is not available; use an ordinary home destination');
  if (!['preserve', 'fill-missing'].includes(adoption)) throw new Error('Invalid adoption policy');
  baseline = path.resolve(baseline); settings = path.resolve(settings); state = path.resolve(state);
  const history = path.join(state, 'baseline.json');
  const pending = path.join(state, 'pending.json');
  const effectiveTemp = settings + '.rig-prepared';
  const lock = path.join(path.dirname(state), '.rig-sync.lock');
  const paths = [baseline, settings, state, history, pending, effectiveTemp, lock];
  for (const file of paths) safePath(file);
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
    const guards = [baseline, settings, history, pending, effectiveTemp].map(file => [file, snapshot(file)]);
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
  for (const file of [baseline, settings, history, pending, effectiveTemp]) snapshot(file);
  fs.mkdirSync(path.dirname(state), {recursive:true, mode:0o700});
  let lockFd;
  try { lockFd = fs.openSync(lock, 'wx', 0o600); } catch { throw new Error('Rig sync locked; inspect and remove stale lock manually'); }
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
  } finally { fs.closeSync(lockFd); fs.unlinkSync(lock); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.error('Home-file sync API only: CLI disabled until explicit legacy migration and global wiring are available.');
  process.exitCode = 1;
}
