-- Queue after the managed startup callbacks, not just after synchronous setup.
local path = vim.fn.stdpath('config') .. '-local/deferred.lua'
if vim.fn.filereadable(path) == 1 then
  MiniDeps.later(function() dofile(path) end)
end
