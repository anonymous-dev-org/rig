#!/usr/bin/env node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = process.env.HOME;
const names = ['brew', 'neovim', 'zsh', 'kitty', 'git', 'pi'];
const args = process.argv.slice(2);
const mode = args.shift();
const preview = args.includes('--preview');
const configHome = process.env.XDG_CONFIG_HOME || (home && path.join(home, '.config'));
function destination(relative) {
  if (relative === '.config') return configHome;
  return relative.startsWith('.config/') ? path.join(configHome, relative.slice(8)) : path.join(home, relative);
}
const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const fail = message => { throw new Error(message); };
function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, {cwd: root, stdio: 'inherit', ...options});
  if (result.error || result.status !== 0) fail(`${command} failed; correct the error and rerun (completed components remain applied).`);
}
function stat(file) { try { return fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
function safe(file) {
  for (let p = path.resolve(file); ; p = path.dirname(p)) {
    if (stat(p)?.isSymbolicLink()) fail(`Unsafe symlink: ${p}. Migrate this directory to a real private directory first.`);
    if (p === path.dirname(p)) break;
  }
}
function available(name) {
  return spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'rig', name], {encoding:'utf8'}).status === 0;
}
function executable(name) {
  if (!available(name)) fail(`Required ${name} is missing from the parent PATH. Install it, export its bin directory, then rerun; rig has made no config changes.`);
}
function parseList(text) {
  const list = text === '' ? [] : text.split(',');
  if (new Set(list).size !== list.length || list.some(name => !names.includes(name))) fail(`Components must be a comma-separated subset of ${names.join(',')}`);
  return list;
}
const manifests = {
  git: ['.config/git/rig.conf', '.config/git/ignore'],
  zsh: ['.zshrc'],
  kitty: ['.config/kitty/kitty.conf', '.config/kitty/ghosty.conf', '.config/kitty/open-actions.conf'],
  neovim: ['.config/nvim/init.lua', '.config/nvim/plugin/10_options.lua', '.config/nvim/plugin/20_keymaps.lua', '.config/nvim/plugin/30_mini.lua', '.config/nvim/plugin/40_plugins.lua', '.config/nvim/plugin/99_private.lua', '.config/nvim/snippets/global.json', '.config/nvim/after/ftplugin/markdown.lua', '.config/nvim/after/ftplugin/text.lua', '.config/nvim/after/lsp/lua_ls.lua', '.config/nvim/after/snippets/lua.json'],
  pi: ['.pi-lens/config.json', '.pi/agent/AGENTS.md', ...['coding-partner','planner','reviewer-api','reviewer-data','reviewer-quality','reviewer-requirements','reviewer-runtime','reviewer-security','reviewer-ui','reviewer','scout','worker'].map(name => `.pi/agent/agents/${name}.md`), ...['done-sound.ts','footer.ts','subagent/config.json','titlebar-spinner.ts'].map(name => `.pi/agent/extensions/${name}`), '.pi/agent/themes/rig.json']
};
let backupRoot;
let inventoryFile;
let inventory = {};
const migrated = new Set();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function record(dest, digest) {
  if (preview) return;
  inventory[dest] = digest;
  const next = inventoryFile + '.next';
  fs.writeFileSync(next, JSON.stringify(inventory, null, 2) + '\n', {flag:'wx', mode:0o600});
  fs.renameSync(next, inventoryFile);
}
function snapshot(file, bytes) {
  const backup = path.join(backupRoot, path.relative(path.parse(file).root, file));
  fs.mkdirSync(path.dirname(backup), {recursive:true, mode:0o700});
  fs.writeFileSync(backup, bytes, {flag:'wx', mode:0o600});
}
function inspectDirectory(component, prefix, dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const relative = path.join(prefix,entry.name);
    if (entry.isDirectory()) inspectDirectory(component,relative,path.join(dir,entry.name));
    else if (!entry.isFile() || !manifests[component].includes(relative)) fail(`Unmanaged content in old rig directory: ${path.join(dir,entry.name)}. Preserve/migrate personal additions outside rig before detaching this directory link; no unknown config will be published.`);
  }
}
function parents(component, relative) {
  let detached = false;
  const parts = relative.split('/').slice(0, -1);
  let prefix = '';
  for (const part of parts) {
    prefix = path.join(prefix, part);
    const dest = destination(prefix);
    if (stat(dest)?.isSymbolicLink()) {
      const target = path.resolve(path.dirname(dest), fs.readlinkSync(dest));
      if (target !== path.join(root, component, prefix) || !stat(target)?.isDirectory()) fail(`Foreign directory link ${dest}; migrate it manually or deselect ${component}.`);
      inspectDirectory(component, prefix, target);
      detached = true;
      for (const file of manifests[component].filter(file => file.startsWith(prefix + path.sep))) migrated.add(destination(file));
      console.log(`Detach known rig directory link ${dest}; source stays unchanged, private snapshot retained.`);
      if (!preview) {
        const backup = path.join(backupRoot, component, prefix);
        fs.mkdirSync(path.dirname(backup), {recursive:true,mode:0o700});
        fs.cpSync(target, backup, {recursive:true, dereference:false, errorOnExist:true, force:false});
        inspectDirectory(component, prefix, target);
        for (const file of manifests[component].filter(file => file.startsWith(prefix + path.sep))) {
          const suffix = path.relative(prefix,file);
          if (Boolean(stat(path.join(target,suffix))) !== Boolean(stat(path.join(backup,suffix))) || (stat(path.join(target,suffix)) && !fs.readFileSync(path.join(target,suffix)).equals(fs.readFileSync(path.join(backup,suffix))))) fail(`Concurrent source edit: ${path.join(target,suffix)}. Directory link left intact.`);
        }
        if (!stat(dest)?.isSymbolicLink() || path.resolve(path.dirname(dest),fs.readlinkSync(dest)) !== target) fail(`Concurrent edit: ${dest}`);
        fs.unlinkSync(dest);
        fs.mkdirSync(dest, {mode:0o700});
        for (const file of manifests[component].filter(file => file.startsWith(prefix + path.sep))) {
          const saved = path.join(backup, path.relative(prefix, file));
          const committed = spawnSync('git', ['show', `HEAD:${component}/${file}`], {cwd:root});
          if (committed.status !== 0) fail(`Cannot identify prior default: ${file}`);
          if (!stat(saved)) { record(destination(file), hash(committed.stdout)); continue; }
          const local = destination(file);
          safe(path.dirname(local));
          fs.mkdirSync(path.dirname(local), {recursive:true, mode:0o700});
          fs.copyFileSync(saved, local, fs.constants.COPYFILE_EXCL);
          record(local, hash(committed.stdout));
        }
      }
    }
  }
  return detached;
}
function adoptGit() {
  const file = path.join(home, '.gitconfig');
  safe(path.dirname(file));
  const xdg = path.join(configHome, 'git/config');
  if (stat(xdg)) fail(`Existing ${xdg}: manually place the shared Git include before private credentials/settings in the earliest global config, or deselect git. Rig will not introduce shared credential resets after existing XDG settings.`);
  const include = `[include]\n\tpath = ${JSON.stringify(destination('.config/git/rig.conf'))}\n`;
  const current = stat(file);
  let prior = Buffer.alloc(0);
  let known = false;
  if (current?.isSymbolicLink()) {
    known = path.resolve(home, fs.readlinkSync(file)) === path.join(root,'git/.gitconfig');
    if (!known) fail(`Foreign ${file} link; preserve it and manually add the shared Git include, or deselect git.`);
    const source = path.join(root, 'git/.gitconfig');
    safe(source);
    const fallback = path.join(root, 'git/.config/git/rig.conf');
    safe(fallback);
    prior = stat(source) ? fs.readFileSync(source) : fs.readFileSync(fallback);
  } else if (current) {
    if (!current.isFile()) fail(`Not a regular Git config: ${file}`);
    prior = fs.readFileSync(file);
    if (prior.toString().startsWith(include)) return;
    fail(`Existing ${file}: manually place the shared Git include before private settings, or deselect git. See git/README.md for credential helper ordering. Rig does not rewrite unknown entrypoints.`);
  }
  console.log(`Git private entrypoint ${file}: shared include first; existing personal settings preserved.`);
  if (preview) return;
  if (current) {
    fs.mkdirSync(backupRoot, {recursive:true,mode:0o700});
    fs.writeFileSync(path.join(backupRoot,'gitconfig'),prior,{flag:'wx',mode:0o600});
  }
  const next = file + '.rig-next';
  fs.writeFileSync(next, Buffer.concat([Buffer.from(include), prior]), {flag:'wx', mode:0o600});
  const latest = stat(file);
  if (Boolean(latest) !== Boolean(current) || (latest && (latest.isSymbolicLink() !== current.isSymbolicLink() || (known ? path.resolve(home, fs.readlinkSync(file)) !== path.join(root,'git/.gitconfig') || (fs.existsSync(file) && !fs.readFileSync(file).equals(prior)) : !fs.readFileSync(file).equals(prior))))) {
    fs.unlinkSync(next);
    fail(`Concurrent Git config edit: ${file}`);
  }
  fs.renameSync(next,file);
}
function deploy(component, relative) {
  const source = path.join(root, component, relative);
  const dest = destination(relative);
  if (migrated.has(dest)) return;
  safe(source);
  if (!stat(source)?.isFile()) fail(`Missing declared source ${source}`);
  const bytes = fs.readFileSync(source);
  const digest = hash(bytes);
  const detached = parents(component, relative);
  if (detached) return;
  safe(path.dirname(dest));
  const current = stat(dest);
  let prior;
  let linked = false;
  if (current?.isSymbolicLink()) {
    if (path.resolve(path.dirname(dest), fs.readlinkSync(dest)) !== source) fail(`Foreign file link: ${dest}`);
    linked = true;
    prior = fs.readFileSync(source);
  } else if (current) {
    if (!current.isFile()) fail(`Not a regular file: ${dest}`);
    prior = fs.readFileSync(dest);
  }
  if (!current && inventory[dest]) {
    console.log(`Keep local deletion ${dest}; default: ${source}`);
    return;
  }
  if (prior && !linked && hash(prior) !== digest && hash(prior) !== inventory[dest]) {
    console.log(`Keep customized ${dest}; review default: ${source}`);
    return;
  }
  if (prior && !linked && hash(prior) === digest) { record(dest, digest); return; }
  console.log(`${linked ? 'Detach known rig link' : 'Copy'} ${dest}; default: ${source}`);
  if (preview) return;
  fs.mkdirSync(path.dirname(dest), {recursive:true, mode:0o700});
  if (linked) snapshot(dest, prior);
  const next = dest + '.rig-next';
  fs.writeFileSync(next, linked ? prior : bytes, {flag:'wx', mode:current && !linked ? current.mode & 0o777 : 0o600});
  const latest = stat(dest);
  if (Boolean(latest) !== Boolean(current) || (latest && (linked
    ? !latest.isSymbolicLink() || path.resolve(path.dirname(dest), fs.readlinkSync(dest)) !== source || !fs.readFileSync(source).equals(prior)
    : !latest.isFile() || !fs.readFileSync(dest).equals(prior)))) {
    fs.unlinkSync(next);
    fail(`Concurrent edit: ${dest}`);
  }
  fs.renameSync(next, dest);
  if (linked) {
    const committed = spawnSync('git', ['show', `HEAD:${component}/${relative}`], {cwd:root});
    if (committed.status !== 0) fail(`Cannot identify prior default for ${dest}; local bytes preserved without history.`);
    record(dest, hash(committed.stdout));
  } else record(dest, digest);
}

try {
  if (!home || !path.isAbsolute(home)) fail('HOME must be an absolute path');
  if (!path.isAbsolute(configHome)) fail('XDG_CONFIG_HOME must be absolute');
  safe(home);
  safe(configHome);
  for (const dir of [home, configHome]) if (dir === root || dir.startsWith(root + path.sep)) fail('Private destinations must be outside rig');
  if (!['setup','update'].includes(mode)) fail('Usage: node scripts/rig.mjs setup|update [--preview] [--components brew,zsh,...] [--brew-no-upgrade|--brew-upgrade] [--brewfile /private/Brewfile] [--install-hooks] [--pi-migrate-from /checkout]');
  const valued = ['--components','--brewfile','--pi-migrate-from'];
  for (let i = 0; i < args.length; i++) {
    if (valued.includes(args[i])) { if (args[++i] === undefined || args[i].startsWith('--')) fail('Missing option value'); }
    else if (!['--preview','--yes','--brew-no-upgrade','--brew-upgrade','--install-hooks'].includes(args[i])) fail(`Unknown option ${args[i]}`);
  }
  const stateRoot = path.join(home, '.local/state/rig/orchestration');
  if (stateRoot === root || stateRoot.startsWith(root + path.sep)) fail('Private state cannot be inside rig');
  safe(stateRoot);
  const stateFile = path.join(stateRoot, 'settings.json');
  safe(stateFile);
  inventoryFile = path.join(stateRoot, 'copies.json');
  safe(inventoryFile);
  if (stat(inventoryFile)) {
    inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
    if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory) || Object.entries(inventory).some(([file, digest]) => !path.isAbsolute(file) || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest))) fail(`Invalid ${inventoryFile}`);
  }
  let state = {components:names, brew:{skip:{}, noUpgrade:false}};
  if (stat(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (!state || !Array.isArray(state.components) || state.components.some(name => typeof name !== 'string') || !state.brew || typeof state.brew.noUpgrade !== 'boolean' || !state.brew.skip || typeof state.brew.skip !== 'object' || Array.isArray(state.brew.skip)) fail(`Invalid ${stateFile}`);
    parseList(state.components.join(','));
  } else if (mode === 'update') fail('No persisted selections. Run ./init.sh --preview, then ./init.sh first.');
  if (value('--components') !== undefined) state.components = parseList(value('--components'));
  if (args.includes('--brew-no-upgrade')) state.brew.noUpgrade = true;
  if (args.includes('--brew-upgrade')) state.brew.noUpgrade = false;
  if (value('--brewfile')) state.brew.file = path.resolve(value('--brewfile'));
  for (const [key, val] of Object.entries(process.env)) if (/^HOMEBREW_BUNDLE_[A-Z_]+_SKIP$/.test(key)) state.brew.skip[key] = val;
  for (const [key, val] of Object.entries(state.brew.skip)) if (!/^HOMEBREW_BUNDLE_[A-Z_]+_SKIP$/.test(key) || typeof val !== 'string') fail('Invalid Brew skip controls');
  if (state.brew.file !== undefined && (typeof state.brew.file !== 'string' || !path.isAbsolute(state.brew.file) || !stat(state.brew.file)?.isFile() || state.brew.file.startsWith(root + path.sep))) fail('Private Brewfile must be an existing absolute path outside rig');
  if (state.components.includes('brew')) executable('brew');
  if (state.components.includes('pi')) executable('bun');
  console.log(`${preview ? 'Preview' : 'Apply'} ${mode}: ${state.components.join(', ') || '(none)'}.`);
  console.log('AeroSpace, Lazysql and macOS config are untouched: adopt/update them manually. No standalone skills installer is declared.');
  if (mode === 'update') {
    const dirty = spawnSync('git', ['status','--porcelain','--untracked-files=normal'], {cwd:root, encoding:'utf8'});
    if (dirty.status !== 0 || dirty.stdout.trim()) fail('Checkout is dirty. Commit or move changes yourself before updating; rig will not stash/reset them.');
    console.log('git pull --ff-only (preview does not fetch or pull)');
    if (!preview && !process.env.RIG_AFTER_PULL) {
      run('git', ['pull','--ff-only']);
      run(process.execPath, [fileURLToPath(import.meta.url), mode, ...args], {env:{...process.env,RIG_AFTER_PULL:'1'}});
      process.exit(0);
    }
  }
  let lock;
  if (!preview) {
    fs.mkdirSync(stateRoot, {recursive:true,mode:0o700});
    fs.chmodSync(stateRoot, 0o700);
    backupRoot = path.join(stateRoot, 'backups', `${Date.now()}-${process.pid}`);
    try { lock = fs.openSync(path.join(stateRoot,'lock'), 'wx', 0o600); } catch { fail(`Rig locked. Inspect ${stateRoot}/lock; remove only after confirming no rig process is running.`); }
  }
  try {
    if (!preview) {
      const temp = path.join(stateRoot, 'settings.json.next');
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, JSON.stringify(state,null,2) + '\n'); } finally { fs.closeSync(fd); }
      fs.renameSync(temp,stateFile);
    }
    const failures = [];
    for (const component of state.components) {
      try {
        console.log(`\n${component}:`);
        if (component === 'brew') {
          const env = {...process.env, ...state.brew.skip};
          for (const file of [path.join(root,'brew/Brewfile'), state.brew.file].filter(Boolean)) {
            const argv = ['bundle', `--file=${file}`, ...(state.brew.noUpgrade ? ['--no-upgrade'] : [])];
            console.log(`brew ${argv.join(' ')}; skips: ${JSON.stringify(state.brew.skip)}`);
            if (!preview) run('brew', argv, {env});
          }
        } else {
          for (const relative of manifests[component]) deploy(component, relative);
          if (component === 'git') adoptGit();
          if (component === 'pi') {
            if (!available('pi') || !state.brew.noUpgrade) {
              console.log('bun add --global --ignore-scripts @earendil-works/pi-coding-agent (selected Pi; shared upgrade control applies)');
              if (!preview) run('bun', ['add','--global','--ignore-scripts','@earendil-works/pi-coding-agent']);
            } else console.log('Existing Pi CLI retained by no-upgrade choice.');
            if (!preview) run(process.execPath, ['pi/sync-settings.mjs', ...(value('--pi-migrate-from') ? ['--migrate-from', value('--pi-migrate-from')] : [])]);
            else console.log('Pi JSON sync deferred: its CLI has no preview; no settings changed.');
            console.log('Start/reload Pi to reconcile configured packages through its supported startup behavior.');
          }
        }
      } catch (error) { failures.push(component); console.error(`${component}: ${error.message}`); }
    }
    if (args.includes('--install-hooks')) {
      const hooks = spawnSync('git', ['config','--get','core.hooksPath'], {cwd:root,encoding:'utf8'});
      if ((hooks.status !== 0 && hooks.status !== 1) || (hooks.status === 0 && hooks.stdout.trim() !== '.githooks')) fail('Existing core.hooksPath preserved. Choose your hook composition manually; --install-hooks will not replace a different path.');
      console.log('Explicit opt-in: set local core.hooksPath=.githooks');
      if (!preview) run('git', ['config','--local','core.hooksPath','.githooks']);
    }
    if (failures.length) fail(`${preview ? 'Preview conflicts' : 'Partial success'}; failed components: ${failures.join(', ')}. ${preview ? 'No selections saved.' : 'Selections saved;'} Resolve reported conflicts and rerun.`);
    console.log(preview ? 'Preview complete; no rig state written.' : 'Selected components complete. Deselected components were not removed.');
  } finally { if (lock !== undefined) { fs.closeSync(lock); fs.unlinkSync(path.join(stateRoot,'lock')); } }
} catch (error) { console.error(error.message); process.exitCode = 1; }
