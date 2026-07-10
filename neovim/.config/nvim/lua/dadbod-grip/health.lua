local M = {}

function M.check()
	vim.health.start("dadbod-grip")

	if vim.fn.has("nvim-0.10") == 1 then
		vim.health.ok("Neovim >= 0.10")
	else
		vim.health.error("Neovim >= 0.10 required")
	end

	for _, cli in ipairs({ "psql", "sqlite3", "mysql", "duckdb" }) do
		if vim.fn.executable(cli) == 1 then
			vim.health.ok(cli .. " found")
		else
			vim.health.warn(cli .. " not found (required for that adapter)")
		end
	end

	local has_ai_key = false
	for _, provider in ipairs({
		{ env = "ANTHROPIC_API_KEY", label = "Anthropic" },
		{ env = "OPENAI_API_KEY", label = "OpenAI" },
		{ env = "GEMINI_API_KEY", label = "Gemini" },
	}) do
		if os.getenv(provider.env) then
			vim.health.ok(provider.label .. " API key set (" .. provider.env .. ")")
			has_ai_key = true
		end
	end

	if not has_ai_key then
		vim.health.warn("No AI provider key set (GripAsk SQL generation disabled)")
	end

	if vim.fn.executable("ollama") == 1 then
		vim.health.ok("ollama found (local AI available)")
	end
end

return M
