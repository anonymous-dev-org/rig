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
function readJsonObject(file) {
  const s = fileStatus(file);
  if (!s) return missing;
  if (!s.isFile() || s.isSymbolicLink()) throw new Error(`Expected ordinary file: ${file}`);
  let value;
  try { value = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error(`Invalid JSON: ${file}`); }
  if (!isJsonObject(value)) throw new Error(`Expected JSON object: ${file}`);
  return value;
}
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}
export function sync({ baseline, settings, home, state, interrupt } ) {
  const history = path.join(state, 'baseline.json');
  const pending = path.join(state, 'pending.json');
  const effectiveTemp = path.join(state, 'effective.json');
  // Validate all inputs before changing anything; never include parser diagnostics.
  const next = readJsonObject(baseline);
  if (next === missing) throw new Error(`Missing baseline: ${baseline}`);
  let local = readJsonObject(settings);
  const previous = readJsonObject(history);
  const journal = readJsonObject(pending);
  if (journal !== missing && (!isJsonObject(journal.before) || !isJsonObject(journal.after) || !isJsonObject(journal.baseline) ||
      typeof journal.fresh !== 'boolean' || journal.effectiveTemp !== effectiveTemp))
    throw new Error(`Invalid recovery record: ${pending}`);
  const prepared = readJsonObject(effectiveTemp);
  const hs = fileStatus(home);
  let migrated = missing;
  if (hs?.isSymbolicLink()) {
    if (path.resolve(path.dirname(home), fs.readlinkSync(home)) !== path.resolve(settings))
      throw new Error(`Unexpected symlink: ${home}`);
  } else if (hs) {
    migrated = readJsonObject(home);
    if (local !== missing && !fs.readFileSync(home).equals(fs.readFileSync(settings)))
      throw new Error(`Config conflict: ${home} differs from ${settings}`);
  }
  if (migrated !== missing) {
    if (local === missing) { writeJsonAtomic(settings, migrated); local = migrated; }
    fs.unlinkSync(home);
  }
  if (journal !== missing) {
    if (prepared !== missing) {
      if (local === missing && !journal.fresh) throw new Error(`Missing recovery settings: ${settings}`);
      const recovered = local === missing ? journal.after : merge(journal.before, local, journal.after);
      // Until rename consumes this file, retries still know settings were not committed.
      writeJsonAtomic(effectiveTemp, recovered);
      if (interrupt) interrupt('before-effective');
      fs.renameSync(effectiveTemp, settings);
      if (interrupt) interrupt('after-effective');
    } else if (local === missing) {
      throw new Error(`Missing recovery settings: ${settings}`);
    }
    // A consumed temp proves completion; current settings may contain later edits.
    writeJsonAtomic(history, journal.baseline);
    fs.unlinkSync(pending);
    return sync({ baseline, settings, home, state, interrupt });
  }
  const effective = local === missing ? next : previous === missing ? local : merge(previous, local, next);
  writeJsonAtomic(effectiveTemp, effective);
  writeJsonAtomic(pending, { before: local === missing ? effective : local, after: effective, baseline: next, fresh: local === missing, effectiveTemp });
  if (interrupt) interrupt('before-effective');
  fs.renameSync(effectiveTemp, settings);
  if (interrupt) interrupt('after-effective');
  writeJsonAtomic(history, next);
  if (fileStatus(pending)) fs.unlinkSync(pending);
  fs.chmodSync(settings, 0o600);
}
const here = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node pi/sync-settings.mjs');
    sync({ baseline: path.join(here, '.pi/agent/settings.example.json'), settings: path.join(here, '.pi/agent/settings.json'), home: path.join(process.env.HOME, '.pi/agent/settings.json'), state: path.join(here, '../.local/pi-settings') });
  } catch (e) { console.error(e.code ? `Settings sync failed (${e.code})` : e.message); process.exitCode = 1; }
}
