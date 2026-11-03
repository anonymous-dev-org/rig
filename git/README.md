# Git customization

Deployment owns only shared `git/.config/git/rig.conf` and the shared ignore pattern source. It must not Stow a `.gitconfig`: the global entrypoint belongs to the user. After explicit safe adoption, the private `~/.gitconfig` should start with:

```gitconfig
[include]
    path = /absolute/deployed/path/to/git/rig.conf
# Personal settings and conditional includes follow here.
```

Use the actual deployed path (normally `~/.config/git/rig.conf`, or `$XDG_CONFIG_HOME/git/rig.conf`); Git does not expand shell variables in config values. Keep existing private settings, identities and includes outside rig. Do not automatically execute or rewrite old configuration. Updates refresh unchanged local copies; customized copies stay intact for manual default adoption; inspect defaults with `git config --show-origin --list`.

Scalar settings generally take the later value, but multivalues compose. In particular the shared GitHub/Gist credential helpers deliberately reset earlier helpers with an empty value, then add `gh`. To replace them, add an empty helper followed by your own helper for the same URL **after** the shared include. Adding a helper without a reset appends it.

## Ignore ownership

Git does not concatenate multiple `core.excludesFile` values: one selected file supplies global patterns. The tracked `.config/git/ignore` is shared source, not a place for personal edits. If you need personal patterns, explicitly create a private combined ignore file outside rig, copy the desired shared patterns into it and append your patterns (including `!` exceptions); point `core.excludesFile` at that file after the include. That private snapshot does not automatically receive future shared pattern changes. Edit the deployed ordinary ignore copy directly if preferred; customized copies are preserved. Repository `.gitignore` and `.git/info/exclude` remain independent native layers with Git's normal precedence.

Disable shared defaults by removing the include; reset a personal override by removing that override. Neither action should delete private files or credentials. Deployment/adoption is handled by the top-level workflow, not these component files.
