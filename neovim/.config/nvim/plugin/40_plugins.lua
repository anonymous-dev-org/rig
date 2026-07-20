-- ┌─────────────────────────┐
-- │ Plugins outside of MINI │
-- └─────────────────────────┘
--
-- This file contains installation and configuration of plugins outside of MINI.
-- They significantly improve user experience in a way not yet possible with MINI.
-- These are mostly plugins that provide programming language specific behavior.
--
-- Use this file to install and configure other such plugins.

-- Make concise helpers for installing/adding plugins in two stages
local add, now, later = MiniDeps.add, MiniDeps.now, MiniDeps.later
local now_if_args = _G.Config.now_if_args

-- Color scheme =================================================================

now(function()
	add({ source = "rktjmp/lush.nvim" })
	add({ source = "zenbones-theme/zenbones.nvim" })

	vim.g.zenbones_darkness = "stark"
	vim.g.zenbones_transparent_background = true
	vim.g.zenbones_italic_comments = true
	vim.g.zenbones_solid_vert_split = true
	vim.g.zenbones_solid_float_border = true

	vim.cmd.colorscheme("zenbones")

	local lush = require("lush")
	local p = require("zenbones.palette").dark

	local gray = lush.hsluv("#808080")
	local bg_base = lush.hsluv("#121212")
	local bg_1 = lush.hsluv("#1a1a1a")
	local bg_2 = lush.hsluv("#222222")
	local bg_3 = lush.hsluv("#2a2a2a")
	local bg_4 = lush.hsluv("#333333")
	local bg_5 = lush.hsluv("#3d3d3d")
	local bg_float = lush.hsluv("#151515")
	local fg_dim = lush.hsluv("#666666")
	local fg_muted = lush.hsluv("#555555")
	local border_color = lush.hsluv("#444444")

	local subtle_leaf = p.leaf.desaturate(55)
	local subtle_sky = p.sky.desaturate(60)
	local subtle_blossom = p.blossom.desaturate(50)
	local subtle_rose = p.rose.desaturate(60)
	local subtle_water = p.water.desaturate(65)

	local specs = lush.parse(function()
		return {
			Type({ fg = gray }),
			Constant({ fg = subtle_water }),
			String({ fg = subtle_leaf }),
			Number({ fg = subtle_sky }),
			Boolean({ fg = subtle_blossom }),
			Keyword({ fg = subtle_rose }),
			Function({ fg = subtle_water }),
			Identifier({ fg = p.fg }),
			Statement({ fg = subtle_rose }),
			PreProc({ fg = subtle_blossom }),
			Special({ fg = subtle_sky }),
			Operator({ fg = p.fg }),
			Delimiter({ fg = fg_dim }),
			Comment({ fg = fg_dim, gui = "italic" }),

			CursorLine({ bg = bg_2 }),
			CursorColumn({ bg = bg_2 }),
			ColorColumn({ bg = bg_3 }),
			LineNr({ fg = fg_muted }),
			CursorLineNr({ fg = gray, gui = "bold" }),
			SignColumn({ bg = "NONE" }),
			Folded({ bg = bg_2, fg = fg_dim }),
			FoldColumn({ fg = fg_muted }),
			NonText({ fg = fg_muted }),
			SpecialKey({ fg = fg_muted }),
			VertSplit({ fg = border_color }),
			WinSeparator({ fg = border_color }),

			StatusLine({ bg = bg_2, fg = p.fg }),
			StatusLineNC({ bg = bg_1, fg = fg_dim }),
			TabLine({ bg = bg_2, fg = p.fg }),
			TabLineFill({ bg = bg_1 }),
			TabLineSel({ bg = bg_3, fg = p.fg, gui = "bold" }),
			WinBar({ bg = bg_2, fg = p.fg }),
			WinBarNC({ bg = bg_1, fg = fg_dim }),

			NormalFloat({ bg = bg_float }),
			FloatBorder({ fg = border_color, bg = bg_float }),
			FloatTitle({ fg = p.fg, bg = bg_float, gui = "bold" }),
			Pmenu({ bg = bg_float }),
			PmenuSel({ bg = bg_4 }),
			PmenuSbar({ bg = bg_3 }),
			PmenuThumb({ bg = bg_5 }),

			Visual({ bg = bg_4 }),
			VisualNOS({ bg = bg_3 }),
			Search({ bg = bg_4, fg = p.fg }),
			IncSearch({ bg = bg_5, fg = p.fg, gui = "bold" }),
			CurSearch({ bg = bg_5, fg = p.fg, gui = "bold" }),

			DiffAdd({ bg = subtle_leaf.saturation(20).lightness(15) }),
			DiffChange({ bg = subtle_water.saturation(20).lightness(15) }),
			DiffDelete({ bg = subtle_rose.saturation(20).lightness(15) }),
			DiffText({ bg = subtle_water.saturation(30).lightness(20), fg = p.fg }),

			DiagnosticWarn({ fg = gray }),
			DiagnosticVirtualTextWarn({ fg = gray.darken(20), bg = bg_1 }),
			DiagnosticUnderlineWarn({ guisp = gray }),
			DiagnosticVirtualTextError({ bg = bg_1 }),
			DiagnosticVirtualTextInfo({ bg = bg_1 }),
			DiagnosticVirtualTextHint({ bg = bg_1 }),

			LspInlayHint({ fg = fg_muted, bg = bg_1 }),
			SpellRare({ guisp = gray }),
			diffFile({ fg = gray, gui = "bold" }),
			diffIndexLine({ fg = gray }),

			Cursor({ bg = p.fg, fg = bg_base }),
			WildMenu({ bg = bg_4, fg = p.fg }),
		}
	end)

	lush.apply(lush.compile(specs))
end)

-- Tree-sitter ================================================================

-- Tree-sitter is a tool for fast incremental parsing. It converts text into
-- a hierarchical structure (called tree) that can be used to implement advanced
-- and/or more precise actions: syntax highlighting, textobjects, indent, etc.
--
-- Tree-sitter support is built into Neovim (see `:h treesitter`). However, it
-- requires two extra pieces that don't come with Neovim directly:
-- - Language parsers: programs that convert text into trees. Some are built-in
--   (like for Lua), 'nvim-treesitter' provides many others.
--   NOTE: It requires third party software to build and install parsers.
--   See the link for more info in "Requirements" section of the MiniMax README.
-- - Query files: definitions of how to extract information from trees in
--   a useful manner (see `:h treesitter-query`). 'nvim-treesitter' also provides
--   these, while 'nvim-treesitter-textobjects' provides the ones for Neovim
--   textobjects (see `:h text-objects`, `:h MiniAi.gen_spec.treesitter()`).
--
-- Add these plugins now if file (and not 'mini.starter') is shown after startup.
--
-- Troubleshooting:
-- - Run `:checkhealth vim.treesitter nvim-treesitter` to see potential issues.
-- - In case of errors related to queries for Neovim bundled parsers (like `lua`,
--   `vimdoc`, `markdown`, etc.), manually install them via 'nvim-treesitter'
--   with `:TSInstall <language>`. Be sure to have necessary system dependencies
--   (see MiniMax README section for software requirements).
now_if_args(function()
	add({
		source = "nvim-treesitter/nvim-treesitter",
		-- Update tree-sitter parser after plugin is updated
		hooks = {
			post_checkout = function()
				vim.cmd("TSUpdate")
			end,
		},
	})
	add({
		source = "nvim-treesitter/nvim-treesitter-textobjects",
		-- Use `main` branch since `master` branch is frozen, yet still default
		-- It is needed for compatibility with 'nvim-treesitter' `main` branch
		checkout = "main",
	})

	-- Define languages which will have parsers installed and auto enabled
	-- After changing this, restart Neovim once to install necessary parsers. Wait
	-- for the installation to finish before opening a file for added language(s).
	local languages = {
		-- These are already pre-installed with Neovim. Used as an example.
		"lua",
		"vimdoc",
		"markdown",
		"yaml",
		"swift",
		"hurl",
		"astro",
		-- Add here more languages with which you want to use tree-sitter
		-- To see available languages:
		-- - Execute `:=require('nvim-treesitter').get_available()`
		-- - Visit 'SUPPORTED_LANGUAGES.md' file at
		--   https://github.com/nvim-treesitter/nvim-treesitter/blob/main
	}
	local isnt_installed = function(lang)
		return #vim.api.nvim_get_runtime_file("parser/" .. lang .. ".*", false) == 0
	end
	local to_install = vim.tbl_filter(isnt_installed, languages)
	if #to_install > 0 then
		require("nvim-treesitter").install(to_install)
	end

	-- Enable tree-sitter after opening a file for a target language
	local filetypes = {}
	for _, lang in ipairs(languages) do
		for _, ft in ipairs(vim.treesitter.language.get_filetypes(lang)) do
			table.insert(filetypes, ft)
		end
	end
	local ts_start = function(ev)
		vim.treesitter.start(ev.buf)
	end
	_G.Config.new_autocmd("FileType", filetypes, ts_start, "Start tree-sitter")
end)

-- Language servers ===========================================================

-- Language Server Protocol (LSP) is a set of conventions that power creation of
-- language specific tools. It requires two parts:
-- - Server - program that performs language specific computations.
-- - Client - program that asks server for computations and shows results.
--
-- Here Neovim itself is a client (see `:h vim.lsp`). Language servers need to
-- be installed separately based on your OS, CLI tools, and preferences.
-- See note about 'mason.nvim' at the bottom of the file.
--
-- Neovim's team collects commonly used configurations for most language servers
-- inside 'neovim/nvim-lspconfig' plugin.
--
now_if_args(function()
	add("mason-org/mason.nvim")
	add("mason-org/mason-lspconfig.nvim")
	add("WhoIsSethDaniel/mason-tool-installer.nvim")
	add("neovim/nvim-lspconfig")

	require("mason").setup()

	local servers = {
		denols = {
			cmd = { "deno", "lsp" },
			root_markers = { "deno.json", "deno.jsonc" },
			init_options = {
				enable = true,
				lint = true,
				unstable = true,
				importMap = "./deno.json",
			},
			settings = {
				deno = {
					enable = true,
					lint = true,
					suggest = {
						imports = {
							hosts = {
								["https://deno.land"] = true,
								["https://jsr.io"] = true,
							},
						},
					},
				},
			},
		},
		ts_ls = {
			root_dir = function(bufnr, on_dir)
				local fname = vim.api.nvim_buf_get_name(bufnr)
				if vim.fs.root(fname, { "deno.json", "deno.jsonc" }) then
					return
				end
				on_dir(vim.fs.root(fname, { "package.json", "tsconfig.json", "jsconfig.json", ".git" }))
			end,
			workspace_required = true,
		},
		yamlls = {
			settings = {
				yaml = {
					keyOrdering = false,
				},
			},
		},
		sourcekit = {
			cmd = { "sourcekit-lsp" },
			filetypes = { "swift" },
			root_markers = { ".git", "compile_commands.json", ".sourcekit-lsp", "Package.swift" },
		},
		-- lua_ls settings live in 'after/lsp/lua_ls.lua' (Neovim 0.11+ convention).
		-- Keep the key here so Mason auto-installs it and enable/disable logic works.
		lua_ls = {},
		astro = {
			filetypes = { "astro" },
		},
		biome = {
			cmd = { "biome", "lsp-proxy" },
			filetypes = {
				"astro",
				"css",
				"graphql",
				"html",
				"javascript",
				"javascriptreact",
				"json",
				"jsonc",
				"svelte",
				"typescript",
				"typescriptreact",
				"vue",
			},
			root_markers = { "biome.json", "biome.jsonc" },
			workspace_required = true,
		},
	}

	local ensure_installed = vim.tbl_filter(function(server_name)
		return server_name ~= "sourcekit"
	end, vim.tbl_keys(servers))
	vim.list_extend(ensure_installed, { "stylua", "ruff", "js-debug-adapter", "biome" })
	require("mason-tool-installer").setup({ ensure_installed = ensure_installed })

	require("mason-lspconfig").setup({ ensure_installed = {} })
	for server_name, server_config in pairs(servers) do
		vim.lsp.config(server_name, server_config)
		if server_name ~= "lua_ls" then
			vim.lsp.enable(server_name)
		end
	end

	local lua_hint_shown = false
	local maybe_hint_lua_lsp = function(ev)
		if lua_hint_shown then
			return
		end

		local clients = vim.lsp.get_clients({ bufnr = ev.buf })
		for _, client in ipairs(clients) do
			if client.name == "lua_ls" then
				return
			end
		end

		lua_hint_shown = true
		vim.schedule(function()
			vim.notify(
				"Lua LSP is disabled by default. Use <Leader>lm and choose `lua_ls` when needed.",
				vim.log.levels.INFO
			)
		end)
	end
	_G.Config.new_autocmd("FileType", "lua", maybe_hint_lua_lsp, "Hint manual lua_ls enable")
end)

-- Formatting =================================================================

-- Programs dedicated to text formatting (a.k.a. formatters) are very useful.
-- Neovim has built-in tools for text formatting (see `:h gq` and `:h 'formatprg'`).
-- They can be used to configure external programs, but it might become tedious.
--
-- The 'stevearc/conform.nvim' plugin is a good and maintained solution for easier
-- formatting setup.
later(function()
	add("stevearc/conform.nvim")

	-- See also:
	-- - `:h Conform`
	-- - `:h conform-options`
	-- - `:h conform-formatters`
	require("conform").setup({
		notify_on_error = false,
		format_on_save = function(bufnr)
			local disable_filetypes = { c = true, cpp = true }
			if disable_filetypes[vim.bo[bufnr].filetype] then
				return nil
			end

			return {
				timeout_ms = 500,
				lsp_format = "fallback",
			}
		end,
		default_format_opts = {
			-- Allow formatting from LSP server if no dedicated formatter is available
			lsp_format = "fallback",
		},
		formatters_by_ft = {
			lua = { "stylua" },
			python = { "ruff_format", "ruff_organize_imports" },
			javascript = { "biome-organize-imports", "biome" },
			typescript = { "biome-organize-imports", "biome" },
			javascriptreact = { "biome-organize-imports", "biome" },
			typescriptreact = { "biome-organize-imports", "biome" },
			json = { "biome" },
			jsonc = { "biome" },
			html = { "biome" },
			css = { "biome-organize-imports", "biome" },
			graphql = { "biome" },
			astro = { "biome-organize-imports", "biome" },
			svelte = { "biome-organize-imports", "biome" },
			vue = { "biome-organize-imports", "biome" },
		},
	})
end)

-- Git and GitHub ==============================================================

later(function()
	add("lewis6991/gitsigns.nvim")
	add({
		source = "NeogitOrg/neogit",
		depends = { "nvim-lua/plenary.nvim", "sindrets/diffview.nvim" },
	})
	add({
		source = "pwntester/octo.nvim",
		depends = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" },
	})
	add("sindrets/diffview.nvim")

	require("gitsigns").setup({
		current_line_blame = false,
		current_line_blame_opts = {
			delay = 300,
			virt_text_pos = "eol",
		},
	})

	require("neogit").setup({
		integrations = {
			diffview = true,
		},
		kind = "tab",
	})

	require("octo").setup({ enable_builtin = true })

	local diffview_actions = require("diffview.actions")
	require("diffview").setup({
		enhanced_diff_hl = true,
		view = {
			default = { layout = "diff2_horizontal", winbar_info = true },
			merge_tool = { layout = "diff3_horizontal", winbar_info = true },
			file_history = { layout = "diff2_horizontal", winbar_info = true },
		},
		file_panel = {
			listing_style = "tree",
			win_config = { position = "left", width = 35 },
		},
		hooks = {
			diff_buf_read = function()
				vim.opt_local.foldenable = false
				vim.opt_local.foldlevel = 99
				-- Diff buffers are regular file buffers (empty buftype, lowercase
				-- filetype) so the global mini.clue rule in 30_mini.lua can't
				-- detect them. Only diffview knows they're special.
				vim.b.miniclue_disable = true
			end,
		},
		keymaps = {
			-- Disable all leader-prefixed defaults so they don't shadow our own
			-- leader mappings. Remap the useful ones to non-leader keys.
			-- `q` cleanly exits diffview from any panel or diff buffer.
			view = {
				{ "n", "<leader>e", false },
				{ "n", "<leader>b", false },
				{ "n", "<leader>cO", false },
				{ "n", "<leader>cT", false },
				{ "n", "<leader>cB", false },
				{ "n", "<leader>cA", false },
				{ "n", "<leader>cx", false },
				{ "n", "q", "<Cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
				{ "n", "gf", diffview_actions.goto_file_edit, { desc = "Open file" } },
				{ "n", "<C-w>f", diffview_actions.toggle_files, { desc = "Toggle file panel" } },
				{ "n", "<C-w>e", diffview_actions.focus_files, { desc = "Focus file panel" } },
			},
			diff_view = {
				{ "n", "<leader>e", false },
				{ "n", "<leader>b", false },
				{ "n", "<leader>cO", false },
				{ "n", "<leader>cT", false },
				{ "n", "<leader>cB", false },
				{ "n", "<leader>cA", false },
				{ "n", "<leader>cx", false },
				{ "n", "q", "<Cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
			},
			file_panel = {
				{ "n", "<leader>e", false },
				{ "n", "<leader>b", false },
				{ "n", "<leader>cO", false },
				{ "n", "<leader>cT", false },
				{ "n", "<leader>cB", false },
				{ "n", "<leader>cA", false },
				{ "n", "<leader>cx", false },
				{ "n", "q", "<Cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
				{ "n", "<C-w>f", diffview_actions.toggle_files, { desc = "Toggle file panel" } },
			},
			file_history_panel = {
				{ "n", "<leader>e", false },
				{ "n", "<leader>b", false },
				{ "n", "<leader>cO", false },
				{ "n", "<leader>cT", false },
				{ "n", "<leader>cB", false },
				{ "n", "<leader>cA", false },
				{ "n", "<leader>cx", false },
				{ "n", "q", "<Cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
				{ "n", "<C-w>f", diffview_actions.toggle_files, { desc = "Toggle file panel" } },
				{ "n", "<C-w>e", diffview_actions.focus_files, { desc = "Focus file panel" } },
			},
		},
	})
end)

-- HTTP client =================================================================

later(function()
	add({
		source = "jellydn/hurl.nvim",
		depends = {
			"MunifTanjim/nui.nvim",
			"nvim-lua/plenary.nvim",
			"nvim-treesitter/nvim-treesitter",
		},
	})

	require("hurl").setup({
		mode = "split",
		split_position = "bottom",
		split_size = "50%",
		show_notification = false,
		env_file = { "vars.env", ".env" },
		formatters = {
			json = { "jq" },
		},
	})
end)

-- Debugging ===================================================================

later(function()
	add("mfussenegger/nvim-dap")
	add({ source = "rcarriga/nvim-dap-ui", depends = { "nvim-neotest/nvim-nio" } })
	add("jay-babu/mason-nvim-dap.nvim")

	local has_go = vim.fn.executable("go") == 1
	if has_go then
		add("leoluz/nvim-dap-go")
	end

	local dap = require("dap")
	local dapui = require("dapui")

	local js_filetypes = { "javascript", "typescript", "javascriptreact", "typescriptreact" }
	local function first_readable(paths)
		for _, path in ipairs(paths) do
			if path and path ~= "" and vim.fn.filereadable(path) == 1 then
				return path
			end
		end
	end

	local function js_debug_executable()
		local js_debug_adapter = vim.fn.exepath("js-debug-adapter")
		if js_debug_adapter ~= "" then
			return {
				command = js_debug_adapter,
				args = { "${port}" },
			}
		end

		local dap_server = first_readable({
			os.getenv("JS_DEBUG_DAP_PATH"),
			vim.fn.stdpath("data") .. "/mason/packages/js-debug-adapter/js-debug/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/lazy/vscode-js-debug/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/lazy/vscode-js-debug/dist/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/lazy/vscode-js-debug/js-debug/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/site/pack/deps/opt/vscode-js-debug/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/site/pack/deps/opt/vscode-js-debug/dist/src/dapDebugServer.js",
			vim.fn.stdpath("data") .. "/site/pack/deps/opt/vscode-js-debug/js-debug/src/dapDebugServer.js",
		})
		if dap_server then
			return {
				command = "node",
				args = { dap_server, "${port}" },
			}
		end

		return nil
	end

	local js_exec = js_debug_executable()
	if js_exec then
		local js_adapter = {
			type = "server",
			host = "127.0.0.1",
			port = "${port}",
			executable = js_exec,
		}
		dap.adapters["pwa-node"] = js_adapter
		dap.adapters.node = js_adapter
		dap.adapters["pwa-chrome"] = js_adapter
		dap.adapters["pwa-msedge"] = js_adapter
	else
		vim.schedule(function()
			vim.notify(
				"JavaScript debugger missing. Install `js-debug-adapter` (vscode-js-debug) or set JS_DEBUG_DAP_PATH to dapDebugServer.js.",
				vim.log.levels.WARN
			)
		end)
	end

	local ok_vscode, dap_vscode = pcall(require, "dap.ext.vscode")
	if ok_vscode then
		dap_vscode.type_to_filetypes = {
			delve = { "go" },
			go = { "go" },
			lldb = { "c", "cpp", "rust" },
			debugpy = { "python" },
			node = js_filetypes,
			["pwa-node"] = js_filetypes,
			["pwa-chrome"] = js_filetypes,
			["pwa-msedge"] = js_filetypes,
		}
	end

	local function read_launch_json()
		local path = vim.fn.getcwd() .. "/.vscode/launch.json"
		if vim.fn.filereadable(path) == 0 then
			return nil
		end
		local lines = vim.fn.readfile(path)
		local ok, data = pcall(vim.json.decode, table.concat(lines, "\n"))
		if not ok then
			return nil
		end
		return data
	end

	local function all_dap_configs_by_name(configurations)
		local out = {}
		for _, cfg in ipairs(configurations or {}) do
			if cfg.name and not out[cfg.name] then
				out[cfg.name] = cfg
			end
		end
		return out
	end

	local function has_adapter(cfg)
		if type(cfg) ~= "table" or type(cfg.type) ~= "string" then
			return false
		end
		return require("dap").adapters[cfg.type] ~= nil
	end

	vim.api.nvim_create_user_command("DapCompound", function()
		local data = read_launch_json()
		if not data or type(data.compounds) ~= "table" or #data.compounds == 0 then
			vim.notify("No compounds found in .vscode/launch.json", vim.log.levels.WARN)
			return
		end

		local names = {}
		for _, compound in ipairs(data.compounds) do
			names[#names + 1] = compound.name
		end

		vim.ui.select(names, { prompt = "Run compound" }, function(choice)
			if not choice then
				return
			end

			local selected
			for _, compound in ipairs(data.compounds) do
				if compound.name == choice then
					selected = compound
					break
				end
			end
			if not selected then
				return
			end

			local by_name = all_dap_configs_by_name(data.configurations)
			for i, cfg_name in ipairs(selected.configurations or {}) do
				local cfg = by_name[cfg_name]
				if not cfg then
					vim.notify("Missing DAP config: " .. cfg_name, vim.log.levels.WARN)
				elseif not has_adapter(cfg) then
					vim.notify(
						"Skipping config without adapter: " .. cfg_name .. " (type=" .. tostring(cfg.type) .. ")",
						vim.log.levels.WARN
					)
				else
					vim.defer_fn(function()
						require("dap").run(cfg)
					end, (i - 1) * 200)
				end
			end
		end)
	end, {})

	require("mason-nvim-dap").setup({
		automatic_installation = has_go,
		handlers = {},
		ensure_installed = has_go and { "delve" } or {},
	})

	dapui.setup()
	dap.listeners.after.event_initialized.dapui_autoopen = dapui.open
	dap.listeners.before.event_terminated.dapui_autoclose = dapui.close
	dap.listeners.before.event_exited.dapui_autoclose = dapui.close

	if has_go then
		require("dap-go").setup({
			delve = { detached = vim.fn.has("win32") == 0 },
		})
	end
end)

-- AI tools ====================================================================

now(function()
	-- vim-fugitive: owns the `:Git` command. Kept because 30_mini.lua disables
	-- MiniGit on purpose, so fugitive is the only `:Git` provider.
	add("tpope/vim-fugitive")
end)

-- sidekick.nvim ==============================================================
--
-- Hosts AI CLIs in a side terminal and sends selections and prompts as context.
-- NES stays off because Copilot LSP is not configured.
later(function()
	add("folke/sidekick.nvim")

	require("sidekick").setup({
		nes = { enabled = false },
		cli = {
			watch = true,
			win = {
				split = {
					width = 0.5,
				},
			},
			tools = {
				claude = {},
				codex = {},
				pi = {
					cmd = { "caffeinate", "-i", "pi" },
					env = { PI_SKIP_VERSION_CHECK = "1" },
				},
			},
		},
	})
	require("sidekick.config").cli.tools = {
		claude = {},
		codex = {},
		pi = {
			cmd = { "caffeinate", "-i", "pi" },
			env = { PI_SKIP_VERSION_CHECK = "1" },
		},
	}

	local cli = function(fn)
		return function()
			require("sidekick.cli")[fn]()
		end
	end

	---@param item any
	---@return sidekick.context.Loc?
	local loc_from_pick_item = function(item)
		if type(item) == "table" then
			local buf = item.bufnr or item.buf or item.buf_id
			if buf then
				return {
					name = item.path or item.text,
					buf = buf,
					cwd = vim.fn.getcwd(),
					row = item.lnum,
					col = item.col,
				}
			end
			local name = item.path or item.text or item.file
			if name then
				return {
					name = name,
					cwd = vim.fn.getcwd(),
					row = item.lnum,
					col = item.col,
				}
			end
		elseif type(item) == "string" and item ~= "" then
			return { name = item, cwd = vim.fn.getcwd() }
		end
	end

	local send_pick_items = function(items)
		local locs = {}
		for _, item in ipairs(items) do
			local loc = loc_from_pick_item(item)
			if loc then
				locs[#locs + 1] = loc
			end
		end
		if #locs == 0 then
			return
		end
		require("sidekick.cli.picker")._send_cb()(locs)
	end

	local pick_send = function(picker_fn)
		picker_fn({}, {
			source = {
				choose = function(item)
					send_pick_items({ item })
				end,
				choose_marked = send_pick_items,
			},
		})
	end

	-- `<Leader>a*` group: AI CLI controls.
	vim.keymap.set("n", "<Leader>aa", cli("toggle"), { desc = "Toggle CLI" })
	vim.keymap.set("n", "<Leader>as", cli("select"), { desc = "Select CLI" })
	vim.keymap.set("n", "<Leader>aw", cli("focus"), { desc = "Focus CLI" })
	vim.keymap.set("n", "<Leader>ax", cli("close"), { desc = "Close CLI" })
	vim.keymap.set("n", "<Leader>ap", cli("prompt"), { desc = "Prompt library" })

	-- Send context straight to the CLI input (no prompt-library step).
	vim.keymap.set("n", "<Leader>af", function()
		require("sidekick.cli").send({ msg = "{file}" })
	end, { desc = "Send file" })
	vim.keymap.set("n", "<Leader>at", function()
		require("sidekick.cli").send({ msg = "{this}" })
	end, { desc = "Send this" })
	vim.keymap.set("n", "<Leader>ab", function()
		pick_send(require("mini.pick").builtin.buffers)
	end, { desc = "Send buffers" })
	vim.keymap.set("n", "<Leader>aF", function()
		pick_send(require("mini.pick").builtin.files)
	end, { desc = "Send files" })

	local send_selection = function()
		require("sidekick.cli").send({ msg = "{selection}" })
	end
	vim.keymap.set("x", "<Leader>av", send_selection, { desc = "Send selection" })
	vim.keymap.set("x", "<Leader>as", send_selection, { desc = "Send selection" })
	vim.keymap.set("x", "<Leader>ap", function()
		require("sidekick.cli").prompt()
	end, { desc = "Prompt with selection" })
end)

-- Snippets ===================================================================

-- Although 'mini.snippets' provides functionality to manage snippet files, it
-- deliberately doesn't come with those.
--
-- The 'rafamadriz/friendly-snippets' is currently the largest collection of
-- snippet files. They are organized in 'snippets/' directory (mostly) per language.
-- 'mini.snippets' is designed to work with it as seamlessly as possible.
-- See `:h MiniSnippets.gen_loader.from_lang()`.
later(function()
	add("rafamadriz/friendly-snippets")
end)

-- Honorable mentions =========================================================

-- 'mason-org/mason.nvim' (a.k.a. "Mason") is a great tool (package manager) for
-- installing external language servers, formatters, and linters. It provides
-- a unified interface for installing, updating, and deleting such programs.
--
-- The caveat is that these programs will be set up to be mostly used inside Neovim.
-- If you need them to work elsewhere, consider using other package managers.
--
-- You can use it like so:
-- now_if_args(function()
--   add('mason-org/mason.nvim')
--   require('mason').setup()
-- end)

-- Beautiful, usable, well maintained color schemes outside of 'mini.nvim' and
-- have full support of its highlight groups. Use if you don't like 'miniwinter'
-- enabled in 'plugin/30_mini.lua' or other suggested 'mini.hues' based ones.
-- MiniDeps.now(function()
--   -- Install only those that you need
--   add('sainnhe/everforest')
--   add('Shatur/neovim-ayu')
--   add('ellisonleao/gruvbox.nvim')
--
--   -- Enable only one
--   vim.cmd('color everforest')
-- end)
