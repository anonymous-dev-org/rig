-- ┌────────────────────┐
-- │ LSP config example │
-- └────────────────────┘
--
-- This file contains configuration of 'lua_ls' language server.
-- Source: https://github.com/LuaLS/lua-language-server
--
-- It is used by `:h vim.lsp.enable()` and `:h vim.lsp.config()`.
-- See `:h vim.lsp.Config` and `:h vim.lsp.ClientConfig` for all available fields.
--
-- This config is designed for Lua's activity around Neovim. It provides only
-- basic config and can be further improved.
return {
  on_attach = function(client, buf_id)
    -- Reduce very long list of triggers for better 'mini.completion' experience
    client.server_capabilities.completionProvider.triggerCharacters =
      { '.', ':', '#', '(' }

    -- Use this function to define buffer-local mappings and behavior that depend
    -- on attached client or only makes sense if there is language server attached.
  end,
  -- LuaLS Structure of these settings comes from LuaLS, not Neovim
  settings = {
    Lua = {
      -- Define runtime properties. Use 'LuaJIT', as it is built into Neovim.
      runtime = { version = 'LuaJIT', path = vim.split(package.path, ';') },
      diagnostics = { globals = { 'vim' } },
      workspace = {
        -- Don't analyze code from submodules
        ignoreSubmodules = true,
        -- Skip third-party library confirmation prompts
        checkThirdParty = false,
        -- Add Neovim's methods and luv types for easier code writing
        library = { vim.env.VIMRUNTIME, '${3rd}/luv/library' },
      },
      -- Show snippet-style completions for functions
      completion = { callSnippet = 'Replace' },
    },
  },
}
