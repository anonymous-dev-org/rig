# pstack skills

- Source: https://github.com/cursor/plugins/tree/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack
- Revision: `6b0300214a09fd6029cfb7077043125758cd1fd2`
- Originally imported the complete upstream `pstack/skills/` tree, including supporting files and executable permissions. The 24 `principle-*` skills remain active in `pi/.pi/agent/skills/`; the other 33 are archived in `pi/disabled-skills/`; `bro` was removed and its stale references cleaned up.
- Upstream MIT license: [LICENSE](LICENSE).
- Excludes plugin registration, agent definitions, automations, and other plugin directories.

This is an upstream import, not a Pi port. Cursor-specific paths, commands, models, and dependencies remain unchanged. Principle skills deploy with Pi. All archived skills are disabled: the archive is outside Pi's discovery folders and Rig sync does not deploy it. Existing home copies and package-provided skills are untouched.
