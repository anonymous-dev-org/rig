# pstack skills

- Source: https://github.com/cursor/plugins/tree/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack
- Revision: `6b0300214a09fd6029cfb7077043125758cd1fd2`
- Complete upstream `pstack/skills/` tree copied unchanged to `pi/.pi/agent/skills/`, including supporting files and executable permissions.
- Upstream MIT license: [LICENSE](LICENSE).
- Excludes plugin registration, agent definitions, automations, and other plugin directories.

This is a literal import, not a Pi port. Cursor-specific paths, commands, models, and dependencies remain unchanged. Rig sync copies the complete skill tree to `~/.pi/agent/skills/` when Pi is selected, preserving executable bits on new files. Local customizations and recorded deletions follow Rig's normal copy policy. Reload Pi after deployment; its skill discovery needs no additional package declaration.
