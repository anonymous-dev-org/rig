#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const missing = Symbol('missing');
const table = value => value !== missing && value !== null && typeof value === 'object' && !Array.isArray(value);
function merge(previous, local, next, overlaps, keys = []) {
  if (equal(previous, local)) return next;
  if (!table(local) || (previous !== missing && !table(previous)) || (next !== missing && !table(next))) {
    if (!equal(previous, next) && !equal(local, next)) overlaps.push(keys);
    return local;
  }
  if (previous === missing) previous = Object.create(null);
  if (next === missing) next = Object.create(null);
  const result = Object.create(null);
  for (const key of new Set([...Object.keys(previous), ...Object.keys(local), ...Object.keys(next)])) {
    const get = value => Object.hasOwn(value, key) ? value[key] : missing;
    const value = merge(get(previous), get(local), get(next), overlaps, [...keys, key]);
    if (value !== missing) result[key] = value;
  }
  return result;
}
function fill(local, defaults) {
  if (!table(local) || !table(defaults)) return local;
  const result = Object.create(null);
  for (const key of new Set([...Object.keys(local), ...Object.keys(defaults)])) {
    if (!Object.hasOwn(local, key)) result[key] = defaults[key];
    else if (Object.hasOwn(defaults, key)) result[key] = fill(local[key], defaults[key]);
    else result[key] = local[key];
  }
  return result;
}
function status(file) {
  try { return fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function safe(file) {
  for (let cursor = file;; cursor = path.dirname(cursor)) {
    const st = status(cursor);
    if (st?.isSymbolicLink()) throw new Error(`Refusing symlink: ${cursor}`);
    if (cursor !== file && st && !st.isDirectory()) throw new Error(`Not a directory: ${cursor}`);
    if (cursor === path.dirname(cursor)) break;
  }
}
function capture(file, link = false) {
  const st = status(file);
  if (!st) return null;
  if (link && st.isSymbolicLink()) return { link: fs.readlinkSync(file), ino: st.ino, mtime: st.mtimeMs };
  if (!st.isFile() || st.nlink !== 1 || st.uid !== process.getuid()) throw new Error(`Expected owned ordinary file: ${file}`);
  return { data: fs.readFileSync(file).toString('base64'), ino: st.ino, mtime: st.mtimeMs, mode: st.mode };
}
function check(file, before, link = false) {
  safe(path.dirname(file));
  if (!equal(capture(file, link), before)) throw new Error(`Concurrent edit: ${file}`);
}
function durable(dir) {
  const fd = fs.openSync(dir, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function write(file, bytes) {
  const temp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try {
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, file); durable(path.dirname(file));
  } finally { if (status(temp)) fs.unlinkSync(temp); }
}
function parse(bytes) {
  const value = Bun.TOML.parse(bytes);
  function normalize(item) {
    if (typeof item === 'string' || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) return item;
    if (Array.isArray(item)) return item.map(normalize);
    if (table(item) && [Object.prototype, null].includes(Object.getPrototypeOf(item))) {
      const result = Object.create(null);
      for (const key of Object.keys(item)) result[key] = normalize(item[key]);
      return result;
    }
    throw new Error('Unsupported TOML value: dates/times and nonfinite numbers are not managed; no files changed');
  }
  return normalize(value);
}
function text(snapshot) { return Buffer.from(snapshot.data, 'base64').toString('utf8'); }
function run() {
  const [component, flag, ...rest] = process.argv.slice(2);
  if (!['aerospace', 'lazysql'].includes(component) || (flag !== undefined && flag !== '--preview') || rest.length)
    throw new Error('Usage: bun scripts/sync-toml.mjs aerospace|lazysql [--preview]');
  if (typeof globalThis.Bun?.TOML?.parse !== 'function' || typeof globalThis.Bun?.TOML?.stringify !== 'function')
    throw new Error('Bun with TOML.parse and TOML.stringify is required');
  if (!process.env.HOME) throw new Error('HOME is required');
  const home = path.resolve(process.env.HOME);
  const config = path.resolve(process.env.XDG_CONFIG_HOME || path.join(home, '.config'));
  const aerospace = component === 'aerospace';
  const destination = aerospace ? path.join(home, '.aerospace.toml') : path.join(config, 'lazysql/config.toml');
  const state = path.join(home, '.local/state/rig/toml', component);
  const baseline = path.join(root, aerospace ? 'aerospace/.aerospace.toml' : 'lazysql/Library/Application Support/lazysql/config.example.toml');
  const legacy = aerospace ? baseline : path.join(root, 'lazysql/Library/Application Support/lazysql/config.toml');
  const oldHome = aerospace ? destination : path.join(home, 'Library/Application Support/lazysql/config.toml');
  const inputPaths = aerospace ? [destination] : [...new Set([destination, oldHome, legacy])];
  const alternates = aerospace ? [...new Set([path.join(home, '.config/aerospace/aerospace.toml'), path.join(config, 'aerospace/aerospace.toml')])] : [];
  const history = path.join(state, 'baseline.toml');
  const pending = path.join(state, 'pending.json');
  const prepared = destination + '.rig-prepared';
  const lock = path.join(state, 'lock');
  const within = file => file === root || file.startsWith(root + path.sep);
  for (const file of [destination, state, prepared]) if (within(file)) throw new Error('Private output cannot be inside checkout');
  const validatePaths = () => {
    for (const file of [baseline, legacy, history, pending, prepared, lock, state]) safe(file);
    for (const file of alternates) {
      safe(path.dirname(file));
      if (status(file)) throw new Error(`Competing AeroSpace config; preserve/reconcile it manually before publication: ${file}`);
    }
    for (const file of [destination, oldHome]) {
      safe(path.dirname(file));
      if (status(file)?.isSymbolicLink() && path.resolve(path.dirname(file), fs.readlinkSync(file)) !== legacy)
        throw new Error(`Foreign config symlink: ${file}`);
    }
    for (const dir of [state, path.dirname(state)]) {
      const st = status(dir);
      if (st && (!st.isDirectory() || st.uid !== process.getuid() || (st.mode & 0o077))) throw new Error(`Untrusted private state: ${dir}`);
    }
  };
  validatePaths();
  const nextSnapshot = capture(baseline);
  if (!nextSnapshot) throw new Error('Missing default TOML');
  const next = parse(text(nextSnapshot));
  const inputs = inputPaths.map(file => [file, capture(file, true)]);
  const journal = capture(pending);
  const copies = inputs.filter(([, snapshot]) => snapshot?.data);
  for (const [, snapshot] of copies) parse(text(snapshot));
  if (!journal && copies.some(([, snapshot]) => snapshot.data !== copies[0][1].data)) throw new Error('Conflicting Lazysql copies; reconcile them outside checkout first');
  for (const [file, snapshot] of inputs) if (!journal && snapshot?.link && !status(legacy)) throw new Error(`Broken rig link: ${file}`);
  const prior = capture(history);
  if (prior) parse(text(prior));
  if (status(prepared) && !journal) throw new Error('Orphan prepared file; inspect before retrying');
  let record;
  if (journal) {
    try { record = JSON.parse(text(journal)); } catch { throw new Error('Invalid recovery JSON; preserve the journal and inspect manually'); }
    if (!table(record) || record.version !== 1 || record.destination !== destination || !Array.isArray(record.inputs) || typeof record.after !== 'string' || typeof record.baseline !== 'string' || !['preparing', 'ready'].includes(record.phase)) throw new Error('Invalid recovery record');
    parse(record.after); parse(record.baseline);
    if (!equal(record.inputs.map(([file]) => file), inputs.map(([file]) => file))) throw new Error('Recovery path mismatch');
  }
  const localSnapshot = copies[0]?.[1] || (aerospace && inputs[0][1]?.link ? nextSnapshot : undefined);
  const local = localSnapshot ? parse(text(localSnapshot)) : missing;
  let effective = next;
  const overlaps = [];
  if (local !== missing) effective = prior ? merge(parse(text(prior)), local, next, overlaps) : fill(local, next);
  const after = localSnapshot && equal(local, effective) ? text(localSnapshot) : Bun.TOML.stringify(effective);
  if (!equal(parse(after), effective)) throw new Error('TOML serialization changed values');
  console.log(`${component}: ${destination}; private history/backups: ${state}`);
  for (const keys of overlaps) console.warn(`Overlapping TOML changes; personal value/deletion retained at key path: ${JSON.stringify(keys)}`);
  if (aerospace) console.warn('Publication validates TOML syntax/round-trip only, not AeroSpace semantics. No activation/reload is performed.');
  if (flag === '--preview') { console.log(journal ? 'Pending transaction requires recovery on apply' : 'Preview: personal edits/deletions and atomic arrays retained; changed TOML loses comments/formatting after private backup'); return; }
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  validatePaths();
  const fd = fs.openSync(lock, 'wx', 0o600);
  try {
    check(pending, journal);
    if (!journal) record = { version: 1, destination, phase: 'preparing', inputs, after, baseline: text(nextSnapshot) };
    const guard = () => {
      validatePaths(); check(baseline, nextSnapshot); check(history, prior);
      for (const [file, snapshot] of record.inputs) check(file, snapshot, true);
    };
    if (!(record.phase === 'ready' && !status(prepared))) {
      guard();
      if (!journal) {
        const backup = path.join(state, `snapshot-${Date.now()}-${process.pid}.json`);
        if (status(backup)) throw new Error('Backup collision');
        write(backup, JSON.stringify({ inputs, baseline: nextSnapshot, history: prior }));
        write(pending, JSON.stringify(record));
      }
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      const existingPrepared = capture(prepared);
      if (existingPrepared && text(existingPrepared) !== record.after) throw new Error('Concurrent prepared file edit');
      write(prepared, record.after);
      record = { ...record, phase: 'ready' };
      write(pending, JSON.stringify(record));
      const preparedGuard = capture(prepared);
      const pendingGuard = capture(pending);
      guard();
      check(prepared, preparedGuard); check(pending, pendingGuard);
      console.warn('Publishing TOML: changed values may remove comments/formatting; original bytes backed up privately');
      fs.renameSync(prepared, destination); durable(path.dirname(destination));
    }
    // A consumed prepared sibling proves commit. Never overwrite subsequent app edits.
    safe(destination);
    if (!capture(destination)) throw new Error('Missing committed destination');
    for (const [file, snapshot] of record.inputs) {
      if (file === destination || !snapshot || !status(file)) continue;
      check(file, snapshot, true); fs.unlinkSync(file); durable(path.dirname(file));
    }
    write(history, record.baseline);
    fs.unlinkSync(pending); durable(state);
    console.log(`${component} publication complete (no app started or reloaded)`);
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
try { run(); } catch (error) { console.error(`TOML sync failed: ${error.message}`); process.exitCode = 1; }
