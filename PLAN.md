# Goal and scope
- Add pi-lens, billion-context, and Ponytail to Rig's shared Pi defaults, per the user's successive links and clarification: “to the rig project pi config”.

# Excluded
- Installing packages, changing private home settings, replacing agent instructions, or changing other defaults.

# Implementation details
- Add `npm:pi-lens`, `npm:billion-context`, and `git:github.com/DietrichGebert/ponytail` to `pi/.pi/agent/settings.example.json`.
- Use Ponytail's documented Pi Git source; billion-context's published manifest declares its Pi extension.
- Manually review the diff, run `git diff --check`, and obtain coding-partner review.

# Requirements list and tracking
- [x] Shared defaults include `npm:pi-lens` and `npm:billion-context` once each; prior reviews approved.
- [x] Shared defaults include the documented Ponytail source once.
- [x] Private settings, installed packages, and existing agent instructions remain unchanged.
- [x] Independent review passed with no material issues; updated `git diff --check` passed.
- Limitation: defaults only; packages are not installed or activated here. Loaded billion-context changes context management and can start a local proxy; Ponytail injects coding guidance. Runtime compatibility is not verified.
