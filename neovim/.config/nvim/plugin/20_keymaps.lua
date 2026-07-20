-- ┌─────────────────┐
-- │ Custom mappings │
-- └─────────────────┘
--
-- This file contains definitions of custom general and Leader mappings.

-- General mappings ===========================================================

-- Use this section to add custom general mappings. See `:h vim.keymap.set()`.

-- An example helper to create a Normal mode mapping
local nmap = function(lhs, rhs, desc)
	-- See `:h vim.keymap.set()`
	vim.keymap.set("n", lhs, rhs, { desc = desc })
end
local tmap = function(lhs, rhs, desc)
	vim.keymap.set("t", lhs, rhs, { desc = desc })
end

-- Paste linewise before/after current line
-- Usage: `yiw` to yank a word and `]p` to put it on the next line.
nmap("[p", '<Cmd>exe "put! " . v:register<CR>', "Paste Above")
nmap("]p", '<Cmd>exe "put "  . v:register<CR>', "Paste Below")
nmap("<C-j>", "<C-d>zz", "Half page down and center")
nmap("<C-k>", "<C-u>zz", "Half page up and center")
nmap("n", "nzzzv", "Next search result centered")
nmap("N", "Nzzzv", "Previous search result centered")
tmap("<Esc><Esc>", "<C-\\><C-n>", "Terminal normal mode")
nmap("<C-w>r", "<Cmd>lua MiniMisc.resize_window()<CR>", "Resize to default width")
nmap("<C-w>z", "<Cmd>lua MiniMisc.zoom()<CR>", "Zoom toggle")

-- Many general mappings are created by 'mini.basics'. See 'plugin/30_mini.lua'

-- stylua: ignore start
-- The next part (until `-- stylua: ignore end`) is aligned manually for easier
-- reading. Consider preserving this or remove `-- stylua` lines to autoformat.

-- Leader mappings ============================================================

-- Neovim has the concept of a Leader key (see `:h <Leader>`). It is a configurable
-- key that is primarily used for "workflow" mappings (opposed to text editing).
-- Like "open file explorer", "create scratch buffer", "pick from buffers".
--
-- In 'plugin/10_options.lua' <Leader> is set to <Space>, i.e. press <Space>
-- whenever there is a suggestion to press <Leader>.
--
-- This config uses a "two key Leader mappings" approach: first key describes
-- semantic group, second key executes an action. Both keys are usually chosen
-- to create some kind of mnemonic.
-- Example: `<Leader>f` groups "find" type of actions; `<Leader>ff` - find files.
-- Use this section to add Leader mappings in a structural manner.
--
-- Usually if there are global and local kinds of actions, lowercase second key
-- denotes global and uppercase - local.
-- Example: `<Leader>fs` / `<Leader>fS` - find workspace/document LSP symbols.
--
-- Many of the mappings use 'mini.nvim' modules set up in 'plugin/30_mini.lua'.

-- Create a global table with information about Leader groups in certain modes.
-- This is used to provide 'mini.clue' with extra clues.
-- Add an entry if you create a new group.
_G.Config.leader_group_clues = {
  { mode = 'n', keys = '<Leader>a', desc = '+AI (sidekick)' },
  { mode = 'n', keys = '<Leader>b', desc = '+Buffer' },
  { mode = 'n', keys = '<Leader>d', desc = '+Debug' },
  { mode = 'n', keys = '<Leader>D', desc = '+Database' },
  { mode = 'n', keys = '<Leader>e', desc = '+Explore/Edit' },
  { mode = 'n', keys = '<Leader>f', desc = '+Find' },
  { mode = 'n', keys = '<Leader>g', desc = '+Git' },
  { mode = 'n', keys = '<Leader>l', desc = '+Code' },
  { mode = 'n', keys = '<Leader>m', desc = '+Map' },
  { mode = 'n', keys = '<Leader>r', desc = '+Request' },
  { mode = 'n', keys = '<Leader>t', desc = '+Terminal' },
  { mode = 'n', keys = '<Leader>v', desc = '+Visits' },

  { mode = 'x', keys = '<Leader>a', desc = '+AI (sidekick)' },
  { mode = 'x', keys = '<Leader>g', desc = '+Git' },
  { mode = 'x', keys = '<Leader>l', desc = '+Code' },
  { mode = 'x', keys = '<Leader>r', desc = '+Request' },
}

-- Helpers for a more concise `<Leader>` mappings.
-- Most of the mappings use `<Cmd>...<CR>` string as a right hand side (RHS) in
-- an attempt to be more concise yet descriptive. See `:h <Cmd>`.
-- This approach also doesn't require the underlying commands/functions to exist
-- during mapping creation: a "lazy loading" approach to improve startup time.
local nmap_leader = function(suffix, rhs, desc)
  vim.keymap.set('n', '<Leader>' .. suffix, rhs, { desc = desc })
end
local xmap_leader = function(suffix, rhs, desc)
  vim.keymap.set('x', '<Leader>' .. suffix, rhs, { desc = desc })
end

nmap_leader('/', '<Cmd>Pick buf_lines scope="current"<CR>', 'Search in buffer')

local notify_info = function(msg)
  vim.notify(msg, vim.log.levels.INFO, { title = 'Neovim' })
end

local notify_warn = function(msg)
  vim.notify(msg, vim.log.levels.WARN, { title = 'Neovim' })
end

local run_cmd = function(cmd, context)
  local ok, err = pcall(vim.cmd, cmd)
  if not ok then
    local msg = tostring(err):gsub('\n.*', '')
    notify_warn(string.format('%s failed: %s', context or cmd, msg))
  end
end

local with_module = function(name, fn)
  local ok, mod = pcall(require, name)
  if not ok then
    notify_warn(string.format('Module `%s` is not available yet.', name))
    return
  end
  fn(mod)
end

local in_git_repo = function()
  local path = vim.api.nvim_buf_get_name(0)
  if path == '' then path = vim.uv.cwd() end
  return vim.fs.root(path, { '.git' }) ~= nil
end

local with_git_repo = function(fn)
  if not in_git_repo() then
    notify_info('Not inside a Git repository.')
    return
  end
  fn()
end

local git_cmd_cache = nil
local git_subcommands = function()
  if git_cmd_cache then return git_cmd_cache end
  local out = vim.fn.systemlist({ 'git', '--list-cmds=main,others,alias,nohelpers' })
  git_cmd_cache = vim.v.shell_error == 0 and out or {}
  return git_cmd_cache
end

local git_complete = function(arg_lead, cmd_line, _)
  local before = cmd_line:match('^%s*Git%s*(.*)$') or ''
  local parts = vim.split(before, '%s+', { trimempty = true })
  if #parts > 1 then return {} end

  local all = git_subcommands()
  if arg_lead == '' then return all end

  local res = {}
  for _, cmd in ipairs(all) do
    if cmd:find('^' .. vim.pesc(arg_lead)) then res[#res + 1] = cmd end
  end
  return res
end

local git_term = function(args)
  local suffix = args ~= '' and (' ' .. args) or ' status'
  run_cmd('botright 12split | terminal git' .. suffix, 'Git terminal')
end

if vim.fn.exists(':Git') == 0 then
  vim.api.nvim_create_user_command('Git', function(opts)
    with_git_repo(function() git_term(opts.args) end)
  end, { nargs = '*', complete = git_complete, desc = 'Run Git in terminal split' })
end

local run_git = function(args, context)
  local cmd = { 'git' }
  vim.list_extend(cmd, args)

  local out = vim.fn.systemlist(cmd)
  if vim.v.shell_error ~= 0 then
    local msg = #out > 0 and out[1] or 'unknown error'
    notify_warn((context or table.concat(cmd, ' ')) .. ' failed: ' .. msg)
    return
  end

  if #out == 0 then
    notify_info((context or 'Git command') .. ' done.')
    return
  end
  notify_info(table.concat(out, '\n'))
end

local git_current_file = function()
  local path = vim.api.nvim_buf_get_name(0)
  if path == '' then
    notify_warn('Current buffer has no file on disk.')
    return nil
  end
  return vim.fn.fnamemodify(path, ':.')
end

local has_lsp_client = function(bufnr)
  local clients = vim.lsp.get_clients({ bufnr = bufnr or 0 })
  return clients ~= nil and #clients > 0
end

local with_lsp = function(fn)
  if not has_lsp_client(0) then
    notify_info('No LSP attached to current buffer.')
    return
  end
  fn()
end

local organize_imports = function()
  with_lsp(function()
    vim.lsp.buf.code_action({
      context = { only = { 'source.organizeImports', 'source.organizeImports.ts' } },
      apply = true,
    })
  end)
end

local add_missing_imports = function()
  with_lsp(function()
    vim.lsp.buf.code_action({
      context = { only = { 'source.addMissingImports.ts', 'source.addMissingImports' } },
      apply = true,
    })
  end)
end

local goto_next_error = function()
  vim.diagnostic.jump({
    count = 1,
    severity = vim.diagnostic.severity.ERROR,
    wrap = true,
  })
end

local goto_prev_error = function()
  vim.diagnostic.jump({
    count = -1,
    severity = vim.diagnostic.severity.ERROR,
    wrap = true,
  })
end

local enable_lsp_server = function()
  local servers = {}
  for _, path in ipairs(vim.api.nvim_get_runtime_file('lsp/*.lua', true)) do
    local name = vim.fn.fnamemodify(path, ':t:r')
    if name ~= '_meta' then servers[#servers + 1] = name end
  end
  table.sort(servers)

  local uniq = {}
  local prev = nil
  for _, name in ipairs(servers) do
    if name ~= prev then uniq[#uniq + 1] = name end
    prev = name
  end

  if #uniq == 0 then
    notify_warn('No LSP server configs were found.')
    return
  end

  vim.ui.select(uniq, { prompt = 'Enable LSP server' }, function(choice)
    if not choice then return end

    local ok, err = pcall(vim.lsp.enable, choice)
    if ok then
      notify_info(string.format('Enabled `%s`. Reopen file if needed.', choice))
    else
      notify_warn(string.format('Could not enable `%s`: %s', choice, tostring(err):gsub('\n.*', '')))
    end
  end)
end

-- a is for 'AI' (sidekick.nvim). Hosts `claude`, `codex`, `cursor`, and `pi`
-- CLIs in a side terminal and lets us push selections + prompts into them. Mappings
-- live in 40_plugins.lua. Common usage:
-- - `<Leader>aa` - toggle CLI terminal
-- - `<Leader>as` - select / attach a CLI tool (normal); send selection (visual)
-- - `<Leader>ap` - open prompt library (normal); prompt with selection (visual)
-- - `<Leader>aw` - focus the CLI window
-- - `<Leader>ax` - close the CLI session
-- Direct context shortcuts (sent straight to the CLI, no prompt-library step):
-- - `<Leader>af` - send current file
-- - `<Leader>at` - send cursor context ("this")
-- - `<Leader>ab` - pick open buffers to send (`<C-x>` mark, `<M-CR>` send marked)
-- - `<Leader>aF` - pick repo files to send (same multi-select keys)
-- - `<Leader>av` - send visual selection

-- b is for 'Buffer'. Common usage:
-- - `<Leader>bs` - create scratch (temporary) buffer
-- - `<Leader>ba` - navigate to the alternative buffer
-- - `<Leader>bw` - wipeout (fully delete) current buffer
-- - `<Leader>bo` - wipeout all buffers except the current one
local new_scratch_buffer = function()
  vim.api.nvim_win_set_buf(0, vim.api.nvim_create_buf(true, true))
end

local wipeout_other_buffers = function()
  local cur = vim.api.nvim_get_current_buf()
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if buf ~= cur and vim.bo[buf].buflisted then
      MiniBufremove.wipeout(buf)
    end
  end
end

nmap_leader('ba', '<Cmd>b#<CR>',                                 'Alternate')
nmap_leader('bd', '<Cmd>lua MiniBufremove.delete()<CR>',         'Delete')
nmap_leader('bD', '<Cmd>lua MiniBufremove.delete(0, true)<CR>',  'Delete!')
nmap_leader('bo', wipeout_other_buffers,                         'Only (wipeout others)')
nmap_leader('br', '<Cmd>edit!<CR>',                              'Revert from disk')
nmap_leader('bs', new_scratch_buffer,                            'Scratch')
nmap_leader('bt', '<Cmd>lua MiniTrailspace.trim()<CR>',          'Trim trailspace')
nmap_leader('bw', '<Cmd>lua MiniBufremove.wipeout()<CR>',        'Wipeout')
nmap_leader('bW', '<Cmd>lua MiniBufremove.wipeout(0, true)<CR>', 'Wipeout!')

-- e is for 'Explore' and 'Edit'. Common usage:
-- - `<Leader>ed` - open explorer at current working directory
-- - `<Leader>ef` - open directory of current file (needs to be present on disk)
-- - `<Leader>ei` - edit 'init.lua'
local explore_at_file = function()
  local mini_files = require('mini.files')
  local path = vim.api.nvim_buf_get_name(0)
  if path == '' then
    mini_files.open()
    return
  end

  local ok = pcall(mini_files.open, path)
  if not ok then mini_files.open() end
end
local explore_quickfix = function()
  vim.cmd(vim.fn.getqflist({ winid = true }).winid ~= 0 and 'cclose' or 'copen')
end
local explore_locations = function()
  local loclist_info = vim.fn.getloclist(0, { winid = true, size = true })
  if loclist_info.winid ~= 0 then
    vim.cmd('lclose')
    return
  end

  if loclist_info.size == 0 then
    vim.notify('No location list for this window yet.', vim.log.levels.INFO)
    return
  end

  vim.cmd('lopen')
end

nmap_leader('ed', '<Cmd>lua require("mini.files").open()<CR>', 'Directory')
nmap_leader('ef', explore_at_file,                          'File directory')
nmap_leader('ei', '<Cmd>edit $MYVIMRC<CR>',                 'init.lua')
nmap_leader('en', '<Cmd>lua MiniNotify.show_history()<CR>', 'Notifications')
nmap_leader('eq', explore_quickfix,                         'Quickfix list')
nmap_leader('eQ', explore_locations,                        'Location list')

-- f is for 'Find'. Keep this surface focused on browsing: files, buffers,
-- text, symbols, diagnostics, and recent visits. Less common pickers are still
-- available through `:Pick`.
--
-- All these use 'mini.pick'. See `:h MiniPick-overview` for an overview.
local pick_workspace_symbols_live = '<Cmd>Pick lsp scope="workspace_symbol_live"<CR>'

nmap_leader('fb', '<Cmd>Pick buffers<CR>',                      'Buffers')
nmap_leader('fd', '<Cmd>Pick diagnostic scope="all"<CR>',       'Diagnostic workspace')
nmap_leader('ff', '<Cmd>Pick files<CR>',                        'Files')
nmap_leader('fg', '<Cmd>Pick grep_live<CR>',                    'Grep live')
nmap_leader('fG', '<Cmd>Pick grep pattern="<cword>"<CR>',       'Grep current word')
nmap_leader('fh', '<Cmd>Pick help<CR>',                         'Help tags')
nmap_leader('fl', '<Cmd>Pick buf_lines scope="all"<CR>',        'Lines (all)')
nmap_leader('fr', '<Cmd>Pick resume<CR>',                       'Resume')
nmap_leader('fs', pick_workspace_symbols_live,                  'Symbols workspace (live)')
nmap_leader('fS', '<Cmd>Pick lsp scope="document_symbol"<CR>',  'Symbols document')
nmap_leader('fv', '<Cmd>Pick visit_paths<CR>',                  'Recent files')

-- g is for 'Git'. Common usage:
-- - `<Leader>gg` - open Neogit status (main Git interface)
-- - `:Git <subcommand>` - run any git command with subcommand completion
-- - `<Leader>go` - toggle 'mini.diff' overlay to show in-buffer unstaged changes
-- - `<Leader>gm` - toggle inline blame for current line
-- - `<Leader>gv` / `:LLMDiffReview` - review generated working tree changes
-- - `]g` / `[g` - cycle hunks; `<Leader>gy` accepts, `<Leader>gx` rejects
local git_switch_branch = function()
  with_git_repo(function()
    local refs = vim.fn.systemlist({
      'git',
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads',
      'refs/remotes',
    })
    if vim.v.shell_error ~= 0 then
      notify_warn('Could not list branches.')
      return
    end

    local cur = vim.fn.systemlist({ 'git', 'branch', '--show-current' })[1] or ''
    local choices = {}
    for _, ref in ipairs(refs) do
      if ref ~= '' and ref ~= cur and ref ~= 'origin/HEAD' then choices[#choices + 1] = ref end
    end
    table.sort(choices)

    vim.ui.select(choices, { prompt = 'Git switch branch' }, function(choice)
      if not choice then return end
      run_git({ 'switch', choice }, 'Git switch ' .. choice)
    end)
  end)
end

local diff_hunk_jump = function(direction)
  if vim.wo.diff then
    local key = direction == 'prev' and '[c' or ']c'
    local before = vim.api.nvim_win_get_cursor(0)
    pcall(vim.cmd, 'normal! ' .. key)

    local after = vim.api.nvim_win_get_cursor(0)
    if after[1] ~= before[1] or after[2] ~= before[2] then return end

    pcall(vim.cmd, direction == 'prev' and 'normal! G$' or 'normal! gg0')
    pcall(vim.cmd, 'normal! ' .. key)
    return
  end

  with_git_repo(function()
    with_module('gitsigns', function(gs)
      gs.nav_hunk(direction, { wrap = true, preview = true, target = 'unstaged' })
    end)
  end)
end

local open_generated_diff_review = function()
  with_git_repo(function()
    if vim.fn.exists(':DiffviewOpen') == 0 then
      notify_warn('Diffview is not available yet.')
      return
    end

    vim.cmd('DiffviewOpen')
    notify_info('Review diffs with ]g/[g. Accept with <Leader>gy, reject with <Leader>gx.')
  end)
end

local git_hunk_action_then_next = function(action, label)
  with_git_repo(function()
    with_module('gitsigns', function(gs)
      gs[action](nil, nil, function(err)
        vim.schedule(function()
          if err then
            notify_warn(label .. ' failed: ' .. err)
            return
          end
          diff_hunk_jump('next')
        end)
      end)
    end)
  end)
end

if vim.fn.exists(':LLMDiffReview') == 0 then
  vim.api.nvim_create_user_command('LLMDiffReview', open_generated_diff_review, {
    desc = 'Review LLM-generated working tree changes',
  })
end

nmap('[g', function() diff_hunk_jump('prev') end, 'Previous Git hunk')
nmap(']g', function() diff_hunk_jump('next') end, 'Next Git hunk')

nmap_leader('ga', function()
  with_git_repo(function()
    local file = git_current_file()
    if not file then return end
    run_git({ 'add', '--', file }, 'Git add buffer')
  end)
end, 'Add buffer')
nmap_leader('gA', function() with_git_repo(function() run_git({ 'add', '--', '.' }, 'Git add all') end) end, 'Add all')
nmap_leader('gb', git_switch_branch, 'Switch branch')
nmap_leader('gB', function()
  with_git_repo(function()
    local refs = vim.fn.systemlist({
      'git', 'for-each-ref', '--sort=-committerdate',
      '--format=%(refname:short)', 'refs/heads', 'refs/remotes',
    })
    if vim.v.shell_error ~= 0 then
      notify_warn('Could not list branches.')
      return
    end

    local cur = vim.fn.systemlist({ 'git', 'branch', '--show-current' })[1] or ''
    local choices = {}
    for _, ref in ipairs(refs) do
      if ref ~= '' and ref ~= cur and ref ~= 'origin/HEAD' then choices[#choices + 1] = ref end
    end

    vim.ui.select(choices, { prompt = 'Diff against branch' }, function(choice)
      if not choice then return end
      vim.cmd('DiffviewOpen ' .. choice)
    end)
  end)
end, 'Diff against branch')
nmap_leader('gc', function() with_git_repo(function() vim.cmd('Neogit commit') end) end, 'Commit')
nmap_leader('gC', function() with_git_repo(function() vim.cmd('Neogit cherry_pick') end) end, 'Cherry-pick')
nmap_leader('gd', function()
  with_git_repo(function()
    local view = require('diffview.lib').get_current_view()
    if view then
      vim.cmd('DiffviewClose')
    else
      vim.cmd('DiffviewOpen')
    end
  end)
end, 'Diffview toggle')
nmap_leader('gD', function() with_git_repo(function() vim.cmd('DiffviewFileHistory %') end) end, 'File history')
nmap_leader('gg', function() with_git_repo(function() vim.cmd('Neogit') end) end, 'Neogit status')
nmap_leader('gH', function() with_git_repo(function() vim.cmd('DiffviewFileHistory') end) end, 'Repo history')
nmap_leader('gl', function() with_git_repo(function() vim.cmd('Neogit log') end) end, 'Log')
nmap_leader('gm', function()
  with_git_repo(function()
    with_module('gitsigns', function(gs) gs.toggle_current_line_blame() end)
  end)
end, 'Blame inline toggle')
nmap_leader('gM', function() with_git_repo(function() vim.cmd('Neogit merge') end) end, 'Merge')
nmap_leader('go', function()
  with_git_repo(function()
    local ok = pcall(function() MiniDiff.toggle_overlay() end)
    if not ok then notify_warn('MiniDiff is not available yet.') end
  end)
end, 'Toggle overlay')
nmap_leader('gp', function() with_git_repo(function() vim.cmd('Neogit push') end) end, 'Push')
nmap_leader('gP', function() with_git_repo(function() vim.cmd('Neogit pull') end) end, 'Pull')
nmap_leader('gr', function()
  with_git_repo(function()
    local file = git_current_file()
    if not file then return end
    run_git({ 'restore', '--', file }, 'Git restore buffer')
  end)
end, 'Restore buffer')
nmap_leader('gR', function() with_git_repo(function() vim.cmd('Neogit rebase') end) end, 'Rebase')
nmap_leader('gS', function() with_git_repo(function() vim.cmd('Neogit stash') end) end, 'Stash')
nmap_leader('gu', function()
  with_git_repo(function()
    local file = git_current_file()
    if not file then return end
    run_git({ 'restore', '--staged', '--', file }, 'Git unstage buffer')
  end)
end, 'Unstage buffer')
nmap_leader('gU', function() with_git_repo(function() run_git({ 'restore', '--staged', '--', '.' }, 'Git unstage all') end) end, 'Unstage all')
nmap_leader('gv', open_generated_diff_review, 'Review generated diff')
nmap_leader('gx', function() git_hunk_action_then_next('reset_hunk', 'Reject hunk') end, 'Reject hunk')
nmap_leader('gy', function() git_hunk_action_then_next('stage_hunk', 'Accept hunk') end, 'Accept hunk')

-- d is for 'Debug'.
nmap_leader('db', function() with_module('dap', function(dap) dap.toggle_breakpoint() end) end, 'Breakpoint toggle')
nmap_leader('dB', function()
  with_module('dap', function(dap)
    dap.set_breakpoint(vim.fn.input('Breakpoint condition: '))
  end)
end, 'Breakpoint conditional')
nmap_leader('dc', function() with_module('dap', function(dap) dap.continue() end) end, 'Continue')
nmap_leader('dC', '<Cmd>DapCompound<CR>', 'Compound picker')
nmap_leader('dd', function() with_module('dap', function(dap) dap.disconnect() end) end, 'Disconnect')
nmap_leader('di', function() with_module('dap', function(dap) dap.step_into() end) end, 'Step into')
nmap_leader('do', function() with_module('dap', function(dap) dap.step_over() end) end, 'Step over')
nmap_leader('dO', function() with_module('dap', function(dap) dap.step_out() end) end, 'Step out')
nmap_leader('dr', function() with_module('dap', function(dap) dap.repl.open() end) end, 'REPL')
nmap_leader('du', function() with_module('dapui', function(dapui) dapui.toggle() end) end, 'UI toggle')

-- D is for 'Database' (dadbod-grip.nvim).
nmap_leader('Dc', '<Cmd>GripConnect<CR>', 'Connect')
nmap_leader('Dx', '<Cmd>GripClose<CR>', 'Close')
nmap_leader('Dq', '<Cmd>GripQuery<CR>', 'Query pad')
nmap_leader('Ds', '<Cmd>GripSchema<CR>', 'Schema')
nmap_leader('Dt', '<Cmd>GripTables<CR>', 'Tables')

-- l is for 'Code'. Common usage:
-- - `<Leader>ld` - show more diagnostic details in a floating window
-- - `<Leader>lr` - perform rename via LSP
-- - `<Leader>ls` - navigate to definition of symbol under cursor
-- - `<Leader>lu` - list usages/references of symbol under cursor
--
-- NOTE: most LSP mappings represent a more structured way of replacing built-in
-- LSP mappings (like `:h gra` and others). This is needed because `gr` is mapped
-- by an "replace" operator in 'mini.operators' (which is more commonly used).
nmap_leader('la', function() with_lsp(function() vim.lsp.buf.code_action() end) end, 'Actions')
nmap_leader('ld', '<Cmd>lua vim.diagnostic.open_float()<CR>',   'Diagnostic popup')
nmap_leader('lj', goto_next_error,                                'Next error')
nmap_leader('lk', goto_prev_error,                                'Previous error')
nmap_leader('lf', function() with_module('conform', function(conform) conform.format() end) end, 'Format')
nmap_leader('lh', function() with_lsp(function() vim.lsp.buf.hover() end) end, 'Hover docs')
nmap_leader('li', function() with_lsp(function() vim.lsp.buf.implementation() end) end, 'Implementation')
nmap_leader('lI', add_missing_imports,                             'Add missing imports')
nmap_leader('lm', enable_lsp_server,                            'Manual enable server')
nmap_leader('lo', organize_imports,                             'Organize imports')
nmap_leader('lr', function() with_lsp(function() vim.lsp.buf.rename() end) end, 'Rename')
nmap_leader('ls', function() with_lsp(function() vim.lsp.buf.definition() end) end, 'Definition')
nmap_leader('lt', function() with_lsp(function() vim.lsp.buf.type_definition() end) end, 'Type definition')
nmap_leader('lu', function() with_lsp(function() vim.cmd('Pick lsp scope="references"') end) end, 'Usages / references')

xmap_leader('lf', function() with_module('conform', function(conform) conform.format() end) end, 'Format selection')

-- m is for 'Map'. Common usage:
-- - `<Leader>mt` - toggle map from 'mini.map' (closed by default)
-- - `<Leader>mf` - focus on the map for fast navigation
-- - `<Leader>ms` - change map's side (if it covers something underneath)
nmap_leader('mf', '<Cmd>lua MiniMap.toggle_focus()<CR>', 'Focus (toggle)')
nmap_leader('mr', '<Cmd>lua MiniMap.refresh()<CR>',      'Refresh')
nmap_leader('ms', '<Cmd>lua MiniMap.toggle_side()<CR>',  'Side (toggle)')
nmap_leader('mt', '<Cmd>lua MiniMap.toggle()<CR>',       'Toggle')

-- o opens Octo's command surface directly.
nmap_leader('o', ':Octo ', 'Octo')

-- r is for 'Request' (hurl.nvim HTTP client).
nmap_leader('ra', '<Cmd>HurlRunnerAt<CR>',          'Run at cursor')
nmap_leader('re', '<Cmd>HurlRunnerToEntry<CR>',     'Run to entry')
nmap_leader('rE', '<Cmd>HurlRunnerToEnd<CR>',       'Run to end')
nmap_leader('rl', '<Cmd>HurlShowLastResponse<CR>',  'Last response')
nmap_leader('rr', '<Cmd>HurlRunner<CR>',            'Run all')
nmap_leader('rs', '<Cmd>HurlSetVariable<CR>',       'Set variable')
nmap_leader('rv', '<Cmd>HurlManageVariable<CR>',    'Manage variables')
nmap_leader('r.', '<Cmd>HurlRerun<CR>',             'Rerun last')
xmap_leader('rr', ':HurlRunner<CR>',                'Run selection')

-- t is for 'Terminal'. Use `:split | term` / `:vsplit | term` if you need a split.
nmap_leader('tt', '<Cmd>enew | term<CR>',     'Terminal')

-- v is for 'Visits'. Common usage:
-- - `<Leader>vv` - add    "core" label to current file.
-- - `<Leader>vV` - remove "core" label to current file.
-- - `<Leader>vc` - pick among all files with "core" label.
local make_pick_core = function(cwd, desc)
  return function()
    local sort_latest = MiniVisits.gen_sort.default({ recency_weight = 1 })
    local local_opts = { cwd = cwd, filter = 'core', sort = sort_latest }
    MiniExtra.pickers.visit_paths(local_opts, { source = { name = desc } })
  end
end

nmap_leader('vc', make_pick_core('',  'Core visits (all)'),       'Core visits (all)')
nmap_leader('vC', make_pick_core(nil, 'Core visits (cwd)'),       'Core visits (cwd)')
nmap_leader('vv', '<Cmd>lua MiniVisits.add_label("core")<CR>',    'Add "core" label')
nmap_leader('vV', '<Cmd>lua MiniVisits.remove_label("core")<CR>', 'Remove "core" label')
nmap_leader('vl', '<Cmd>lua MiniVisits.add_label()<CR>',          'Add label')
nmap_leader('vL', '<Cmd>lua MiniVisits.remove_label()<CR>',       'Remove label')
-- stylua: ignore end
