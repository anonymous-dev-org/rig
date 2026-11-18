# pstack skills

- Source: https://github.com/cursor/plugins/tree/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack
- Revision: `6b0300214a09fd6029cfb7077043125758cd1fd2`
- Originally imported the complete upstream `pstack/skills/` tree, including supporting files and executable permissions. All 57 remaining skills, including the 24 `principle-*` skills, are archived in `pi/disabled-skills/`; `bro` was removed and its stale references cleaned up. The rig skills in `pi/.pi/agent/skills/` restate the principle rules by moment and replace them.
- Upstream MIT license: [LICENSE](LICENSE).
- Excludes plugin registration, agent definitions, automations, and other plugin directories.

This is an upstream import, not a Pi port. Cursor-specific paths, commands, models, and dependencies remain unchanged. All archived skills are disabled: the archive is outside Pi's discovery folders and Rig sync does not deploy it. Full Pi sync removes home copies of the archived files; package-provided skills are untouched.
