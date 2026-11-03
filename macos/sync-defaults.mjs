#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';

const defaults = [
  ['com.apple.dock', 'autohide', 'bool', true],
  ['com.apple.dock', 'tilesize', 'int', 58],
  ['com.apple.dock', 'magnification', 'bool', true],
  ['com.apple.dock', 'largesize', 'int', 68],
  ['com.apple.dock', 'minimize-to-application', 'bool', true],
  ['com.apple.dock', 'show-recents', 'bool', false],
  ['com.apple.dock', 'mru-spaces', 'bool', false],
  ['NSGlobalDomain', 'NSAutomaticCapitalizationEnabled', 'bool', true],
  ['NSGlobalDomain', 'NSAutomaticPeriodSubstitutionEnabled', 'bool', true],
  ['com.apple.finder', 'FXPreferredViewStyle', 'string', 'clmv'],
  ['com.apple.finder', '_FXSortFoldersFirst', 'bool', false],
  ['com.apple.dock', 'wvous-br-corner', 'int', 14],
  ['com.apple.dock', 'wvous-br-modifier', 'int', 0],
  ['NSGlobalDomain', 'AppleInterfaceStyle', 'string', 'Dark'],
];
// Move removed defaults here with their domain, key, type, and last shipped value.
const retired = [];
const id = ([domain, key]) => `${domain}/${key}`;
const absent = { present: false };
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${command} interrupted by ${result.signal}`);
  return result;
}
function read(entry) {
  const [domain, key] = entry;
  const result = run('/usr/bin/defaults', ['read', domain, key]);
  if (result.status !== 0) {
    if (/The domain\/default pair of \(.+\) does not exist/.test(result.stderr)) return absent;
    throw new Error(`Cannot read ${id(entry)}: ${result.stderr.trim()}`);
  }
  const type = run('/usr/bin/defaults', ['read-type', domain, key]);
  if (type.status !== 0) throw new Error(`Cannot read type of ${id(entry)}: ${type.stderr.trim()}`);
  // Keep the native type and text: unexpected types are personal values, not coercions.
  return { present: true, type: type.stdout.trim(), value: result.stdout.replace(/\n$/, '') };
}
function status(file) {
  try { return fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function directory(dir, privateDir = false) {
  const st = status(dir);
  if (!st) {
    directory(path.dirname(dir));
    fs.mkdirSync(dir, { mode: 0o700 });
    return;
  }
  if (!st.isDirectory() || st.isSymbolicLink() || (st.mode & 0o022)) throw new Error(`Unsafe directory: ${dir}`);
  if (privateDir && (st.uid !== process.getuid() || (st.mode & 0o077))) throw new Error(`Expected owned private directory (0700): ${dir}`);
  if (dir !== path.dirname(dir)) directory(path.dirname(dir));
}
function load(file) {
  const st = status(file);
  if (!st) return null;
  if (!st.isFile() || st.nlink !== 1 || st.uid !== process.getuid() || (st.mode & 0o077)) throw new Error(`Unsafe state file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}
function publish(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(temp, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
  const dir = fs.openSync(path.dirname(file), 'r');
  try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
function parseHistory(text) {
  if (text === null) return {};
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Invalid history JSON; restore a trusted history.json backup before retrying.'); }
  if (!value || value.version !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)) throw new Error('Invalid history; restore a trusted history.json backup before retrying.');
  for (const [key, entry] of Object.entries(value.entries)) {
    if (![...defaults, ...retired].some(item => id(item) === key)) throw new Error(`History contains unknown key ${key}; reconcile it manually before retrying.`);
    if (!entry || typeof entry.managed !== 'boolean' || (entry.managed && (!entry.applied || entry.applied.present !== true || typeof entry.applied.type !== 'string' || typeof entry.applied.value !== 'string'))) throw new Error(`Invalid history entry: ${key}`);
  }
  return value.entries;
}
function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--preview', '--restart'].includes(arg))) throw new Error('Usage: macos/defaults.sh [--preview] [--restart]');
  if (process.platform !== 'darwin') throw new Error('macOS preferences sync requires macOS.');
  if (!process.env.HOME || !path.isAbsolute(process.env.HOME)) throw new Error('HOME must be an absolute path.');
  const preview = args.includes('--preview');
  const root = path.join(process.env.HOME, '.local/state/rig/macos');
  directory(root, true);
  const lock = path.join(root, 'lock');
  try { fs.mkdirSync(lock, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Sync locked: ${lock}. If no sync is running, inspect pending.json and remove the stale lock directory.`);
    throw error;
  }
  try {
    const historyFile = path.join(root, 'history.json');
    const pendingFile = path.join(root, 'pending.json');
    if (load(pendingFile) !== null) throw new Error(`Unfinished preference write: ${pendingFile}. Follow macos/README.md recovery before retrying.`);
    const original = load(historyFile);
    const history = parseHistory(original);
    const entries = { ...history };
    const changes = [];
    for (const entry of defaults) {
      const key = id(entry);
      const before = read(entry);
      const previous = history[key];
      const types = { int: 'integer', bool: 'boolean', string: 'string' };
      let value = String(entry[3]);
      if (entry[2] === 'bool') value = entry[3] ? '1' : '0';
      const desired = { present: true, type: `Type is ${types[entry[2]]}`, value };
      if ((!previous && !before.present) || (previous?.managed && equal(before, previous.applied))) {
        entries[key] = { managed: true, applied: desired };
        if (!equal(before, desired)) changes.push({ entry, before, desired });
      } else {
        // Persist personal ownership, including deletion, even if defaults later match it.
        entries[key] = { managed: false };
        console.log(`Preserve ${key}${before.present ? '' : ' (absent/opt-out)'}`);
      }
    }
    for (const entry of retired) {
      const key = id(entry);
      const previous = history[key];
      if (!previous) continue;
      if (previous.managed) {
        const before = read(entry);
        if (equal(before, previous.applied)) changes.push({ entry, before, desired: absent });
        else console.log(`Preserve ${key}${before.present ? '' : ' (absent/opt-out)'}`);
      } else console.log(`Preserve ${key} (personal)`);
      delete entries[key];
    }
    for (const change of changes) {
      const action = change.desired.present ? `set ${id(change.entry)} = ${change.entry[3]}` : `delete ${id(change.entry)}`;
      console.log(`${preview ? 'Would' : 'Will'} ${action}`);
    }
    if (preview) return;
    if (load(historyFile) !== original) throw new Error('History changed concurrently; retry.');
    // Journal before any preference write; never guess after an interrupted operation.
    publish(pendingFile, { version: 1, history: original, changes });
    for (const { entry, before, desired } of changes) {
      if (!equal(read(entry), before)) throw new Error(`Concurrent preference edit: ${id(entry)}. Pending journal retained.`);
      const result = run('/usr/bin/defaults', desired.present
        ? ['write', entry[0], entry[1], `-${entry[2]}`, String(entry[3])]
        : ['delete', entry[0], entry[1]]);
      if (result.status !== 0) throw new Error(`Write failed for ${id(entry)}: ${result.stderr.trim()}. Pending journal retained.`);
      if (!equal(read(entry), desired)) throw new Error(`Write verification failed: ${id(entry)}. Pending journal retained.`);
    }
    if (load(historyFile) !== original) throw new Error('History changed during sync. Pending journal retained.');
    publish(historyFile, { version: 1, entries });
    fs.unlinkSync(pendingFile);
    if (args.includes('--restart')) {
      for (const [domain, app] of [['com.apple.dock', 'Dock'], ['com.apple.finder', 'Finder']]) {
        if (!changes.some(({ entry }) => entry[0] === domain)) continue;
        const result = run('/usr/bin/killall', [app]);
        if (result.status !== 0) console.error(`${app} was not restarted: ${result.stderr.trim()}`);
      }
    }
    console.log('Preferences synced. Some changes require logout; apps are restarted only with --restart.');
  } finally { fs.rmdirSync(lock); }
}
try { main(); } catch (error) { console.error(`macOS preferences: ${error.message}`); process.exitCode = 1; }
