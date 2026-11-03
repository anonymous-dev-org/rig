# Goal and scope
- Hide pi-lens's remaining below-editor widget, preserving its tools.

# Excluded
- Package removal, footer extension changes, new tests/probes.

# Implementation details
- Keep ui.hideLspStatus=true; add widget.visible=false to the managed global config.
- Deploy only this config to the current home; reload needed for running sessions.

# Requirements list and tracking
- [x] Default and home config hide both pi-lens UI surfaces; deployed config matches (cmp), diff check passes.
- [x] Manually verified documented setting; coding-partner confirmed fix is aligned and preserves tools.
- Limitation: current terminal display cannot be visually verified here; /reload required.
